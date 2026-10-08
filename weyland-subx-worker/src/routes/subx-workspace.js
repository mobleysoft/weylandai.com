// src/routes/subx-workspace.js
//
// The SubX / TakeOffX workspace's own API (2026-10-07), so the workspace page
// (src/pages/subx-app.html) runs entirely on this worker:
//
//   GET  /api/hardware-schedule/sessions                     your sessions
//   GET  /api/hardware-schedule/session/:id/doors            door rows + takeoff counts
//   GET  /api/hardware-schedule/session/:id/source.pdf       the uploaded PDF
//   POST /api/hardware-schedule/session/:id/submittal-pdf    build the submittal package PDF
//   GET  /api/hardware-schedule/session/:id/submittal-pdf    the built PDF (inline; ?download=1)
//
// Before this the page listed sessions and assembled the PDF through
// /api/sessions/* on the repo-root monolith (weylandai-com-worker, which this
// worker's owners do not deploy), and nothing in the workspace called the
// assemble route at all: "EXPORT THE REAL PDF PACKAGE" only opened the
// workspace. The PDF is built by lib/submittal-assembler.js (the same
// assembler the monolith's POST /api/sessions/:id/assemble used) and stored
// at the same R2 key, submittals/<sessionId>/final_submittal.pdf.
//
// Every session route checks that the session belongs to the caller.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { jsonResponse3 } from "../lib/json-response.js";
import { assembleSubmittalPackage } from "../lib/submittal-assembler.js";
import { matchComponentToCutSheets } from "../lib/product-database.js";
import { incrementSubmittalsUsed } from "../lib/edge-telemetry.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

function isDemoClone(session) {
  return String(session.file_buffer_key || "").startsWith("demo-clone/");
}

async function ownedSession(request2, env2, authenticate, sessionId) {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return { error: error4 };
  if (!user || !user.userId) {
    return { error: jsonResponse3({ success: false, error: "Sign in to open your sessions.", code: "SIGN_IN_REQUIRED" }, 401) };
  }
  const session = await env2.DB.prepare("SELECT * FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return { error: jsonResponse3({ success: false, error: "Session not found" }, 404) };
  if (session.user_id !== user.userId) return { error: jsonResponse3({ success: false, error: "This session belongs to another account" }, 403) };
  return { user, session };
}

function countBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null || k === "") continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })).map(([value, count]) => ({ value, count }));
}

function sizeLabel(d) {
  if (d.width_inches != null && d.height_inches != null) {
    const ft = (inches) => Math.floor(inches / 12) + "'-" + Math.round(inches % 12) + '"';
    return ft(d.width_inches) + " x " + ft(d.height_inches);
  }
  return null;
}

async function packageStatus(env2, sessionId) {
  try {
    const head = await env2.UPLOADS.head("submittals/" + sessionId + "/final_submittal.pdf");
    if (!head) return null;
    const md = head.customMetadata || {};
    return {
      built_at: md.assembledAt || (head.uploaded ? new Date(head.uploaded).toISOString() : null),
      pages: parseInt(md.totalPages, 10) || null,
      doors: md.doors != null ? parseInt(md.doors, 10) : null,
      size_bytes: head.size,
      url: "/api/hardware-schedule/session/" + sessionId + "/submittal-pdf",
    };
  } catch (e) {
    return null;
  }
}

// Cut sheets for the session's hardware components: only an exact
// manufacturer + model match from the product database attaches a document
// (a category or partial guess would put the wrong product in a submittal).
async function persistExactCutSheetMatches(sessionId, env2) {
  const comps = await env2.DB.prepare(`
    SELECT hc.manufacturer, hc.model, hc.catalog_number, hc.component_type
    FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id
    WHERE hs.session_id = ?
  `).bind(sessionId).all();
  const seen = new Set();
  let matched = 0, unmatched = 0;
  const missing = [];
  for (const c of comps.results || []) {
    const key = (c.manufacturer || "") + "|" + (c.model || c.catalog_number || "");
    if (seen.has(key) || key === "|") continue;
    seen.add(key);
    let match = null;
    try { match = await matchComponentToCutSheets(c, env2); } catch (e) { match = null; }
    if (match && match.matched && match.matchType === "exact" && match.cutSheets.length > 0) {
      matched++;
      for (const cs of match.cutSheets.slice(0, 2)) {
        try {
          // session_cut_sheet_matches has no UNIQUE(session_id, cut_sheet_id)
          // (only its id primary key), so an upsert cannot target that pair:
          // look first, insert once.
          const existing = await env2.DB.prepare("SELECT id FROM session_cut_sheet_matches WHERE session_id = ? AND cut_sheet_id = ?").bind(sessionId, cs.id).first();
          if (!existing) {
            await env2.DB.prepare(`
              INSERT INTO session_cut_sheet_matches (id, session_id, cut_sheet_id, matched_manufacturer, matched_model, match_type, confidence, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'exact', 1.0, 'matched', CURRENT_TIMESTAMP)
            `).bind("scm_" + crypto.randomUUID(), sessionId, cs.id, c.manufacturer || null, c.model || c.catalog_number || null).run();
          }
        } catch (e) {
          console.warn("[SubX package] could not record cut sheet match: " + e.message);
        }
      }
    } else {
      unmatched++;
      if (missing.length < 25) missing.push({ manufacturer: c.manufacturer || null, model: c.model || c.catalog_number || null, component_type: c.component_type || null });
    }
  }
  return { components: seen.size, matched, unmatched, missing };
}

export function registerSubxWorkspaceRoutes(router, { authenticate, requireActiveSubscription }) {
  router.get("/api/hardware-schedule/sessions", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    if (!user || !user.userId) {
      return jsonResponse3({ success: true, signed_in: false, sessions: [] });
    }
    const url = new URL(request2.url);
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "30", 10) || 30));
    const rows = await env2.DB.prepare(`
      SELECT hes.id, hes.project_name, hes.filename, hes.document_type, hes.total_pages, hes.status,
             hes.created_at, hes.updated_at, hes.file_buffer_key,
             (SELECT COUNT(*) FROM door_schedule_entries d WHERE d.session_id = hes.id) AS door_count,
             (SELECT COUNT(*) FROM hardware_sets s WHERE s.session_id = hes.id) AS set_count,
             (SELECT COUNT(*) FROM hardware_page_extractions p WHERE p.session_id = hes.id) AS pages_read
      FROM hardware_extraction_sessions hes
      WHERE hes.user_id = ?
      ORDER BY hes.created_at DESC
      LIMIT ?
    `).bind(user.userId, limit).all();
    const sessions = (rows.results || []).map((s) => ({
      id: s.id,
      project_name: s.project_name,
      filename: s.filename,
      document_type: s.document_type,
      total_pages: s.total_pages,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
      door_count: s.door_count,
      set_count: s.set_count,
      pages_read: s.pages_read,
      is_demo: isDemoClone(s),
    }));
    let company = null;
    try { const u = await env2.DB.prepare("SELECT company FROM users WHERE id = ?").bind(user.userId).first(); company = u && u.company ? u.company : null; } catch (_) { company = null; }
    return jsonResponse3({ success: true, signed_in: true, email: user.email || null, company, sessions });
  });

  // The company that signs the packet's cover (2026-10-08).
  router.put("/api/hardware-schedule/company", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    if (!user || !user.userId) return jsonResponse3({ success: false, error: "Sign in first.", code: "SIGN_IN_REQUIRED" }, 401);
    const body = await request2.json().catch(() => ({}));
    const company = String(body.company || "").replace(/\s+/g, " ").trim().slice(0, 120);
    try {
      await env2.DB.prepare("UPDATE users SET company = ?, updated_at = datetime('now') WHERE id = ?").bind(company || null, user.userId).run();
    } catch (e) {
      return jsonResponse3({ success: false, error: "The company could not be saved: " + e.message }, 500);
    }
    return jsonResponse3({ success: true, company: company || null });
  });

  router.get("/api/hardware-schedule/session/:sessionId/doors", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    const sessionId = o.session.id;
    const rows = await env2.DB.prepare(`
      SELECT mark, hardware_group, fire_rating, width, width_inches, height_inches, thickness, thickness_inches,
             door_type, door_material, door_finish, stc_rating, frame_type, frame_material, frame_finish,
             head_detail, jamb_detail, sill_detail, panic, notes, page_number, extraction_confidence,
             field_confidence_json, validation_status
      FROM door_schedule_entries WHERE session_id = ?
      ORDER BY page_number ASC, rowid ASC
    `).bind(sessionId).all();
    const doors = (rows.results || []).map((d) => {
      let source = { page: d.page_number, table_row: null };
      try {
        const fc = d.field_confidence_json ? JSON.parse(d.field_confidence_json) : null;
        if (fc && fc.source) source = { page: fc.source.page ?? d.page_number, table_row: fc.source.table_row ?? null, rotation: fc.source.rotation ?? null };
      } catch (_) { /* older rows */ }
      const out = { ...d, source };
      delete out.field_confidence_json;
      return out;
    });
    const sets = await env2.DB.prepare(`
      SELECT s.id, s.set_number, s.set_name, s.affirmed, s.door_count,
             (SELECT COUNT(*) FROM hardware_components c WHERE c.set_id = s.id) AS components
      FROM hardware_sets s WHERE s.session_id = ? ORDER BY s.set_number
    `).bind(sessionId).all();
    const hardwareSets = sets.results || [];
    const compRows = hardwareSets.length ? await env2.DB.prepare(`
      SELECT hc.id, hs.set_number, hc.component_type, hc.quantity, hc.uom, hc.manufacturer, hc.model, hc.catalog_number, hc.finish, hc.specifications
      FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id = ? ORDER BY hs.set_number, hc.sequence_order
    `).bind(sessionId).all() : { results: [] };
    // The description as the schedule prints it lives in the component's
    // specifications; the type code is the reader's own class of the item.
    const comps = { results: (compRows.results || []).map((c) => {
      let spec = null;
      try { spec = c.specifications ? JSON.parse(c.specifications) : null; } catch (_) { spec = null; }
      const out = { ...c, description: spec && spec.description ? spec.description : null, notes: spec && spec.notes ? spec.notes : null };
      delete out.specifications;
      return out;
    }) };
    const takeoff = {
      doors: doors.length,
      doors_with_size: doors.filter((d) => d.width_inches != null && d.height_inches != null).length,
      by_door_type: countBy(doors, (d) => d.door_type),
      by_size: countBy(doors, sizeLabel),
      by_fire_rating: countBy(doors, (d) => d.fire_rating),
      by_hardware_group: countBy(doors, (d) => d.hardware_group),
      by_frame_material: countBy(doors, (d) => d.frame_material),
      hardware_sets: hardwareSets.length,
      hardware_components: (comps.results || []).reduce((n, c) => n + (c.quantity || 1), 0),
    };
    return jsonResponse3({
      success: true,
      session: {
        id: sessionId,
        project_name: o.session.project_name,
        filename: o.session.filename,
        document_type: o.session.document_type,
        total_pages: o.session.total_pages,
        created_at: o.session.created_at,
        is_demo: isDemoClone(o.session),
      },
      doors,
      hardware_sets: hardwareSets,
      components: comps.results || [],
      takeoff,
      package: await packageStatus(env2, sessionId),
    });
  });

  router.get("/api/hardware-schedule/session/:sessionId/source.pdf", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    if (isDemoClone(o.session)) return jsonResponse3({ success: false, error: "The demo building has no uploaded PDF" }, 404);
    const obj = await env2.UPLOADS.get(o.session.file_buffer_key);
    if (!obj) return jsonResponse3({ success: false, error: "The uploaded PDF is no longer stored; upload it again" }, 404);
    return new Response(obj.body, {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "private, max-age=300", "Content-Disposition": "inline; filename=\"" + String(o.session.filename || "schedule.pdf").replace(/[^A-Za-z0-9._ -]/g, "_") + "\"" },
    });
  });

  router.post("/api/hardware-schedule/session/:sessionId/submittal-pdf", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    const subError = await requireActiveSubscription(o.user, env2);
    if (subError) return subError;
    const sessionId = o.session.id;
    try {
      const body = await request2.json().catch(() => ({}));
      const doorCount = await env2.DB.prepare("SELECT COUNT(*) AS n FROM door_schedule_entries WHERE session_id = ?").bind(sessionId).first();
      const setCount = await env2.DB.prepare("SELECT COUNT(*) AS n FROM hardware_sets WHERE session_id = ?").bind(sessionId).first();
      if (!(doorCount && doorCount.n) && !(setCount && setCount.n)) {
        return jsonResponse3({ success: false, error: "NOTHING_EXTRACTED", details: "Nothing has been read from this schedule yet. Read a page first (READ THIS PAGE), then build the package: it is made from the door rows and hardware sets that were read." }, 409);
      }
      const hadPackage = await packageStatus(env2, sessionId);
      const cutSheets = await persistExactCutSheetMatches(sessionId, env2);
      // The cover names the company (2026-10-08): what the workspace sent,
      // else the account's company, else the vendor profile. Never the email.
      let preparedBy = String(body.preparedBy || "").trim().slice(0, 120) || null;
      if (preparedBy) {
        try { await env2.DB.prepare("UPDATE users SET company = ?, updated_at = datetime('now') WHERE id = ?").bind(preparedBy, o.user.userId).run(); } catch (_) { /* kept for this build only */ }
      }
      if (!preparedBy) {
        try {
          const u = await env2.DB.prepare("SELECT company FROM users WHERE id = ?").bind(o.user.userId).first();
          preparedBy = u && u.company ? String(u.company).trim() || null : null;
        } catch (_) { /* no users row (a guest) */ }
      }
      if (!preparedBy && o.user.tenantId) {
        try {
          const vp = await env2.DB.prepare("SELECT company_name FROM vendor_profile WHERE tenant_id = ?").bind(o.user.tenantId).first();
          preparedBy = vp && vp.company_name ? vp.company_name : null;
        } catch (_) { /* no vendor profile table/row */ }
      }
      const result = await assembleSubmittalPackage(sessionId, {
        projectName: (body.projectName || "").trim() || null,
        preparedBy: preparedBy || null,
        preparedFor: body.preparedFor || null,
        contractor: body.contractor || null,
        architect: body.architect || null,
        dsaNumber: body.dsaNumber || null,
        includeDraftSets: true,
        saveToR2: true,
      }, env2, { PDFDocument, StandardFonts, rgb });
      if (!result.success) {
        return jsonResponse3({ success: false, error: "Assembly failed", details: result.errors.join("; ") }, 500);
      }
      // A first package for one of your own schedules counts as a submittal
      // on your plan; the demo building's package does not.
      let usage = null;
      if (!hadPackage && !isDemoClone(o.session)) {
        try { usage = await incrementSubmittalsUsed(o.user.userId, env2); } catch (_) { usage = null; }
      }
      // Free to try, pay for the output (weyland-shared/output-access.js):
      // anyone sees what the package holds; opening the PDF of your own
      // schedule needs the $100 first submittal or a plan. The demo
      // building's package stays open to everyone.
      const access = isDemoClone(o.session) ? { paid: true, via: "demo" } : await outputAccess(env2, o.user.userId, "subx");
      return jsonResponse3({
        success: true,
        sessionId,
        paid: !!access.paid,
        ...(access.paid ? {} : { payment: paymentRequired("The submittal package PDF") }),
        pdfUrl: "/api/hardware-schedule/session/" + sessionId + "/submittal-pdf",
        totalPages: result.totalPages,
        sections: result.sections,
        doors: result.doorCount,
        hardware_sets: result.hardwareSetCount,
        cut_sheets: result.cutSheetCount,
        cut_sheet_matching: cutSheets,
        warnings: result.errors.length ? result.errors : undefined,
        submittals_used: usage,
      });
    } catch (e) {
      console.error("[SubX package] " + e.message);
      return jsonResponse3({ success: false, error: "Assembly failed", details: e.message }, 500);
    }
  });

  router.get("/api/hardware-schedule/session/:sessionId/submittal-pdf", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    const obj = await env2.UPLOADS.get("submittals/" + o.session.id + "/final_submittal.pdf");
    if (!obj) return jsonResponse3({ success: false, error: "No package has been built for this session yet" }, 404);
    if (!isDemoClone(o.session)) {
      const access = await outputAccess(env2, o.user.userId, "subx");
      if (!access.paid) return jsonResponse3(paymentRequired("The submittal package PDF"), 402);
    }
    const url = new URL(request2.url);
    const name = String(o.session.project_name || "submittal").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "submittal";
    return new Response(obj.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "Content-Disposition": (url.searchParams.get("download") ? "attachment" : "inline") + "; filename=\"" + name + "_submittal.pdf\"",
      },
    });
  });
}
