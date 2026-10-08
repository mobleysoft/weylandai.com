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
import { componentLine, getCataloguePagesForModel } from "../../../weyland-shared/cut-sheet-matcher.js";
import { incrementSubmittalsUsed } from "../lib/edge-telemetry.js";

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

// Cut sheets for the session's hardware components (2026-10-08).
//
// Each component is matched as its line was printed: the stored catalog cell
// ("8400 10\" HIGH B-CS TKTX SCREWS AT HM DOORS") gives the model (8400) and
// the full text, the maker is resolved by the shared matcher (IVE -> Ives).
// Before this the whole cell was the model, so nothing matched exactly and a
// packet carried 0 of its cut sheets (value audit). Only the named maker's
// own product counts: an exact model, its family ("39D" -> Zero 39) or a
// model that starts with the printed one, never another maker's model. "BY DIVISION 28" lines are not
// products.
//
// What gets cited, in order: a catalogue page that names the model in a
// product catalogue (the page a submittal reviewer expects), then the page a
// price-book cut-sheet row points to, then a price-book page. Catalogue pages
// are stored as cut_sheet_id "catpage:<catalogue_id>:<page>"; the assembler
// embeds only the cited pages, never a whole price book.
export function pickCitation(match) {
  const pages = match.cataloguePages || [];
  const isBook = (t) => /price\s*book|price\s*list/i.test(String(t || ""));
  const page = pages.find((p) => p.pdfAvailable && !isBook(p.title));
  if (page) return { kind: "catalogue_page", id: "catpage:" + page.catalogueId + ":" + page.pageNum, title: page.title + " p." + page.pageNum };
  const sheet = (match.cutSheets || []).find((c) => c.r2Key && c.pageHint);
  if (sheet) return { kind: "cut_sheet", id: sheet.id, title: sheet.title };
  const bookPage = pages.find((p) => p.pdfAvailable);
  if (bookPage) return { kind: "catalogue_page", id: "catpage:" + bookPage.catalogueId + ":" + bookPage.pageNum, title: bookPage.title + " p." + bookPage.pageNum };
  return null;
}

export async function persistExactCutSheetMatches(sessionId, env2) {
  const comps = await env2.DB.prepare(`
    SELECT hc.manufacturer, hc.model, hc.catalog_number, hc.component_type
    FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id
    WHERE hs.session_id = ?
  `).bind(sessionId).all();
  const seen = new Set();
  let matched = 0, unmatched = 0, byOthers = 0;
  const missing = [];
  for (const c of comps.results || []) {
    const line = componentLine(c);
    const key = (c.manufacturer || "") + "|" + (line.modelFull || line.model || "");
    if (seen.has(key) || key === "|") continue;
    seen.add(key);
    let match = null;
    try { match = await matchComponentToCutSheets(line, env2); } catch (e) { match = null; }
    if (match && match.byOthers) { byOthers++; continue; }
    // Exact, the model's family, or a catalogue model that starts with the
    // printed one (FB51P -> FB51P-12-MD) - always within the maker the line
    // names; another trade's product is not attached.
    if (match && match.matched && ["exact", "series", "partial"].includes(match.matchType)) {
      const cite = match.cutSheets.length ? pickCitation({ ...match, cataloguePages: await getCataloguePagesForModel(match.product.manufacturer, match.product.model, env2) }) : pickCitation(match);
      if (cite) {
        matched++;
        try {
          // session_cut_sheet_matches has no UNIQUE(session_id, cut_sheet_id)
          // (only its id primary key), so an upsert cannot target that pair:
          // look first, insert once.
          const existing = await env2.DB.prepare("SELECT id FROM session_cut_sheet_matches WHERE session_id = ? AND cut_sheet_id = ?").bind(sessionId, cite.id).first();
          if (!existing) {
            await env2.DB.prepare(`
              INSERT INTO session_cut_sheet_matches (id, session_id, cut_sheet_id, matched_manufacturer, matched_model, match_type, confidence, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'matched', CURRENT_TIMESTAMP)
            `).bind("scm_" + crypto.randomUUID(), sessionId, cite.id, match.product.manufacturer || c.manufacturer || null, match.product.model || line.model || null, match.matchType + ":" + cite.kind, match.matchType === "exact" ? 1.0 : match.matchType === "series" ? 0.8 : 0.6).run();
          }
        } catch (e) {
          console.warn("[SubX package] could not record cut sheet match: " + e.message);
        }
        continue;
      }
    }
    unmatched++;
    if (missing.length < 25) {
      missing.push({
        manufacturer: c.manufacturer || null,
        model: line.modelFull || line.model || null,
        component_type: c.component_type || null,
        // Why: matched but nothing on file to show, the model exists only
        // under another maker, or not in the catalogue.
        reason: match && match.matched ? "no_cut_sheet_on_file" : match && match.otherMaker ? "other_maker_only" : "not_in_catalogue",
        ...(match && match.otherMaker ? { other_maker: match.otherMaker.manufacturer + " " + match.otherMaker.model } : {}),
      });
    }
  }
  return { components: seen.size, matched, unmatched, by_others: byOthers, missing };
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
    return jsonResponse3({ success: true, signed_in: true, email: user.email || null, sessions });
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
    const comps = hardwareSets.length ? await env2.DB.prepare(`
      SELECT hs.set_number, hc.component_type, hc.quantity, hc.manufacturer, hc.model, hc.finish
      FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id = ? ORDER BY hs.set_number, hc.sequence_order
    `).bind(sessionId).all() : { results: [] };
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
        return jsonResponse3({ success: false, error: "NOTHING_EXTRACTED", details: "Read the schedule first (RUN EXTRACTION): the package is built from the extracted door rows and hardware sets." }, 409);
      }
      const hadPackage = await packageStatus(env2, sessionId);
      const cutSheets = await persistExactCutSheetMatches(sessionId, env2);
      let preparedBy = null;
      if (o.user.tenantId) {
        try {
          const vp = await env2.DB.prepare("SELECT company_name FROM vendor_profile WHERE tenant_id = ?").bind(o.user.tenantId).first();
          preparedBy = vp && vp.company_name ? vp.company_name : null;
        } catch (_) { /* no vendor profile table/row */ }
      }
      const result = await assembleSubmittalPackage(sessionId, {
        projectName: (body.projectName || "").trim() || null,
        preparedBy: preparedBy || o.user.email || null,
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
      return jsonResponse3({
        success: true,
        sessionId,
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
