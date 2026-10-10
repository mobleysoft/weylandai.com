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

import { hardwareScheduleNeed, reviewDoorRows, unsureDoorFields } from "../../assets/client-ocr-src/schedule-workspace.mjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { jsonResponse3 } from "../lib/json-response.js";
import { assembleSubmittalPackage } from "../lib/submittal-assembler.js";
import { matchComponentToCutSheets, citedPagesFor, PACKET_MATCH_TYPES } from "../lib/product-database.js";
import { newReadBudget, filedPageFor, variantPageFor } from "../../../weyland-shared/page-citations.js";
import { incrementSubmittalsUsed } from "../lib/edge-telemetry.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { readDimension, readSizeCell, looksLikeMark, boundedFieldEvidence } from "../../assets/client-ocr-src/schedule-text-layer.mjs";

// Which fields of a door row the reviewer should look at (2026-10-08): a
// value read by OCR, a value that does not look like what the column holds,
// a size that did not read into inches, or an empty cell in a column the
// other rows fill.
const num = (v) => (v == null || v === "" ? null : Number(v));

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

// The catalogue page each of the session's hardware components is cited on
// (2026-10-08), for the packet: the shared matcher's answer for the named
// maker's own product (exact, base model, variant, series, or the maker's
// catalogue page naming the model) and citedPagesFor's first page that is on
// file. One page per product; a page several components cite goes in once,
// listing the sets that use it. Nothing is guessed: no match, no page.
// The packet needs a page on file, so the matcher is asked for the maker's catalogue pages
// even when a filed price book's page is not pinned (its index is another edition).
const matchForPacket = (c, env2) => matchComponentToCutSheets(c, env2, { pagesWhenUnpinned: true });

// Why an item has no page in the packet, and what would put one there.
function missFor(c, m) {
  const who = (m && m.maker && m.maker.typed && m.maker.name) || c.manufacturer || "";
  const model = c.model || "";
  if (!m || !m.matched) {
    return { reason: (m && m.reason) || "not_catalogued", why: (m && m.reasonText) || ("nothing catalogued is named " + [who, model].filter(Boolean).join(" ")), need: (m && m.need) || "the maker's name and catalogue number" };
  }
  const p = m.product || {};
  if (!PACKET_MATCH_TYPES.has(String(m.matchType)) || !(m.maker && m.maker.known)) {
    return { reason: "match_not_firm", why: (p.manufacturer || who) + " " + (p.model || "") + " begins with " + model + "; not firm enough for a submittal", need: "the full catalogue number" };
  }
  const sheet = (m.cutSheets && m.cutSheets[0]) || null;
  const cp = (m.cataloguePages && m.cataloguePages[0]) || null;
  if (sheet) return { reason: "page_not_found", why: String(sheet.title || "the price book").split(" (")[0] + " is on file, but no page of it names " + (p.model || model), need: "the page of " + (p.manufacturer || who) + "'s current book or sheet that names " + (p.model || model) };
  if (cp) return { reason: "pdf_not_on_file", why: cp.title + " p. " + cp.pageNum + " names " + (p.model || model) + "; the PDF is not on file (its text is indexed)", need: "the PDF of " + cp.title };
  return { reason: "no_document", why: (p.manufacturer || who) + " " + (p.model || model) + " is catalogued; no document is on file", need: (p.manufacturer || who) + "'s catalogue page for " + (p.model || model) };
}

// A filed price book whose index is another edition: read that very PDF for the page naming
// the model (weyland-shared/filed-page.js), so the packet carries the page instead of a miss;
// else the page a price row for the item was imported from, confirmed in that PDF (a book that
// prints 188SBK as "188S-BK", or 99-L-F as "[98/99] . L . F"). Both live in
// weyland-shared/page-citations.js (2026-10-09) so CutsheetX and CloseX cite the same page.
// The book's text is cached in R2 after the first read; a build spends at most FILED_BUDGET_MS
// reading filed books. Only that reading counts against it (2026-10-09): the clock used to start
// with the build, so on Rockford (39 items) the matching of the first sets used it up and every
// item in sets 40-47 was listed as "not pinned" without its book being searched.
const FILED_BUDGET_MS = 25000;
const newBudget = () => newReadBudget(FILED_BUDGET_MS);

export async function citedPagesForSession(sessionId, env2, match = matchForPacket) {
  const budget = newBudget();
  const comps = await env2.DB.prepare(`
    SELECT hs.set_number, hc.quantity, hc.manufacturer, hc.model, hc.catalog_number, hc.component_type
    FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id
    WHERE hs.session_id = ? ORDER BY hs.set_number, hc.sequence_order
  `).bind(sessionId).all();
  const byKey = new Map();
  for (const c of comps.results || []) {
    const model = c.model || c.catalog_number || "";
    const key = (c.manufacturer || "").toUpperCase() + "|" + model.toUpperCase();
    if (!model) continue;
    if (!byKey.has(key)) byKey.set(key, { c: { ...c, model }, sets: new Set(), qty: 0 });
    const e = byKey.get(key);
    if (c.set_number) e.sets.add(String(c.set_number));
    e.qty += Number(c.quantity) > 0 ? Number(c.quantity) : 1;
  }
  const pages = new Map();
  let matched = 0, unmatched = 0;
  const missing = [], notes = [], byOthers = [];
  for (const { c, sets, qty } of byKey.values()) {
    // Furnished by another trade ("BY DIVISION 28", "BY DOOR AND FRAME MANUFACTURER", maker
    // "By others"): no hardware page belongs in this packet, so it is listed apart, not missed.
    if (/^by\s+others$/i.test(String(c.manufacturer || "").trim()) || /^\s*(BY|FURNISHED BY|PROVIDED BY)\s+(OTHERS|OWNER|DIV(ISION)?\.?\s*\d+|DOOR\b|FRAME\b|[A-Z ]*(MANUFACTURER|CONTRACTOR|SUPPLIER))/i.test(c.model)) {
      byOthers.push({ qty, sets: [...sets], text: c.model, component_type: c.component_type || null });
      continue;
    }
    // A schedule note in the item column ("VERIFY PERMANENT CORE WITH DISTRICT"): no maker,
    // no catalogue number, only words. Listed as a note, not as an item missing a page.
    if (!c.manufacturer && !/\d/.test(c.model) && c.model.trim().split(/\s+/).length >= 3) {
      notes.push({ sets: [...sets], text: c.model, component_type: c.component_type || null });
      continue;
    }
    let m = null, filed = null;
    budget.skipped = false;
    try { m = await match(c, env2); } catch (_) { m = null; }
    const cited = m && m.matched && PACKET_MATCH_TYPES.has(String(m.matchType)) ? citedPagesFor(m, 1) : [];
    if (cited.length) {
      matched++;
      const p = cited[0];
      const k = p.catalogueId + "#" + p.pageNum;
      if (!pages.has(k)) pages.set(k, { catalogueId: p.catalogueId, pageNum: p.pageNum, title: p.title, kind: p.kind, manufacturer: (m.product && m.product.manufacturer) || c.manufacturer || null, model: (m.product && m.product.model) || c.model, sets: [] });
      const entry = pages.get(k);
      for (const s of sets) if (!entry.sets.includes(s)) entry.sets.push(s);
    } else if ((filed = (await filedPageFor(env2, m, budget, c.model)) || (await variantPageFor(env2, m, c.model, budget)))) {
      matched++;
      const k = "doc:" + filed.r2Key + "#" + filed.pageNum;
      if (!pages.has(k)) pages.set(k, { r2Key: filed.r2Key, catalogueId: null, pageNum: filed.pageNum, title: filed.title, kind: "price_book_filed", manufacturer: (m.product && m.product.manufacturer) || (m.maker && m.maker.name) || c.manufacturer || null, model: filed.number || (m.product && m.product.model) || c.model, sets: [] });
      const entry = pages.get(k);
      for (const s of sets) if (!entry.sets.includes(s)) entry.sets.push(s);
    } else {
      unmatched++;
      // Every miss, as the schedule names it, with why and what is needed (the packet lists them all).
      if (missing.length < 200) {
        const miss = budget.skipped
          ? { reason: "search_out_of_time", why: "the filed price book was not searched for " + (c.model || "this item") + ": this build's " + FILED_BUDGET_MS / 1000 + " s for reading books ran out", need: "build the packet again (the books read so far are cached)" }
          : missFor(c, m);
        missing.push({ qty, sets: [...sets], manufacturer: (m && m.maker && m.maker.typed && m.maker.name) || c.manufacturer || null, model: c.model || null, component_type: c.component_type || null, reason: miss.why, code: miss.reason, need: miss.need });
      }
    }
  }
  return { components: byKey.size - notes.length - byOthers.length, matched, unmatched, missing, notes, by_others: byOthers, pages: [...pages.values()] };
}

// Tables holding a column, read from the schema (the session's rows live in many tables).
async function tablesWith(env2, column, except = []) {
  const rows = (await env2.DB.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table'").all()).results || [];
  return rows.filter((t) => !except.includes(t.name) && String(t.sql || "").replace(/^[^(]*\(/s, "").replace(/\)\s*$/, "").split(/,(?![^()]*\))/).map((c) => c.trim().split(/\s+/)[0].replace(/["`\[\]]/g, "").toLowerCase()).includes(column)).map((t) => t.name);
}

/** Every row of a session, its uploaded PDF and its cached copy (2026-10-09). -> { rows } */
export async function deleteSessionEverywhere(env2, session) {
  const id = session.id;
  const stmts = [];
  for (const t of await tablesWith(env2, "hardware_set_id", ["door_schedule_entries", "hardware_door_matrix"])) stmts.push(env2.DB.prepare("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE session_id = ?)").bind(id));
  stmts.push(env2.DB.prepare("DELETE FROM hardware_components WHERE set_id IN (SELECT id FROM hardware_sets WHERE session_id = ?)").bind(id));
  for (const t of await tablesWith(env2, "session_id", ["hardware_sets", "hardware_extraction_sessions"])) stmts.push(env2.DB.prepare("DELETE FROM " + t + " WHERE session_id = ?").bind(id));
  stmts.push(env2.DB.prepare("DELETE FROM hardware_sets WHERE session_id = ?").bind(id));
  stmts.push(env2.DB.prepare("DELETE FROM hardware_extraction_sessions WHERE id = ?").bind(id));
  let rows = 0;
  for (const st of stmts) { try { const r = await st.run(); rows += (r && r.meta && r.meta.changes) || 0; } catch (e) { console.warn("[delete-session] " + e.message); } }
  if (session.file_buffer_key) {
    try { if (env2.UPLOADS) await env2.UPLOADS.delete(session.file_buffer_key); } catch (_) { /* gone */ }
    try { if (env2.CACHE) await env2.CACHE.delete(session.file_buffer_key); } catch (_) { /* gone */ }
  }
  return { rows };
}

export function registerSubxWorkspaceRoutes(router, { authenticate, requireActiveSubscription }) {
  // A customer deletes a session they uploaded: its rows, the PDF and the cached copy.
  router.delete("/api/hardware-schedule/session/:sessionId", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    if (isDemoClone(o.session)) return jsonResponse3({ success: false, error: "The demo session cannot be deleted." }, 400);
    const r = await deleteSessionEverywhere(env2, o.session);
    return jsonResponse3({ success: true, deleted: o.session.id, rows: r.rows });
  });

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
      SELECT id, mark, hardware_group, fire_rating, width, width_inches, height_inches, thickness, thickness_inches,
             door_type, door_material, door_finish, stc_rating, frame_type, frame_material, frame_finish,
             head_detail, jamb_detail, sill_detail, panic, notes, page_number, extraction_confidence,
             field_confidence_json, validation_status, corrections_json
      FROM door_schedule_entries WHERE session_id = ?
      ORDER BY page_number ASC, rowid ASC
    `).bind(sessionId).all();
    const all = rows.results || [];
    const n = all.length || 1;
    const filled = {
      hardware_group: all.filter((d) => d.hardware_group).length / n >= 0.7,
      door_type: all.filter((d) => d.door_type).length / n >= 0.7,
      size: all.filter((d) => d.width_inches != null).length / n >= 0.7,
    };
    const doors = all.map((d) => {
      let source = { page: d.page_number, table_row: null };
      let fc = null;
      try {
        fc = d.field_confidence_json ? JSON.parse(d.field_confidence_json) : null;
        if (fc && fc.source) source = { page: fc.source.page ?? d.page_number, table_row: fc.source.table_row ?? null, rotation: fc.source.rotation ?? null };
      } catch (_) { fc = null; }
      const corrected = !!d.corrections_json;
      const out = { ...d, original_mark: fc?.original_mark || null, field_confidence: fc?.fields || {}, confidence_source: fc?.confidence_source || null, field_evidence: boundedFieldEvidence(fc?.field_evidence), read_audit: fc?.read_audit || null, alternate_pricing: fc?.alternate_pricing ?? null, hardware_spec_sections: fc?.hardware_spec_sections || [], source, read_from: fc ? fc.read_from || null : null, pair: fc ? fc.pair ?? null : null, glazing: fc ? fc.glazing ?? null : null, section: fc ? fc.section ?? null : null, corrected, unsure: [] };
      out.unsure = corrected ? [] : unsureDoorFields(out, filled);
      delete out.field_confidence_json;
      delete out.corrections_json;
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
    const review = reviewDoorRows(doors);
    const takeoff = {
      ...review,
      doors: doors.length,
      doors_with_size: doors.filter((d) => d.width_inches != null && d.height_inches != null && !d.unsure.includes("size")).length,
      by_door_type: countBy(doors, (d) => d.door_type),
      by_size: countBy(doors.filter(d => !d.unsure.includes("size")), sizeLabel),
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
      hardware_schedule_needed: hardwareScheduleNeed(doors, hardwareSets),
      package: await packageStatus(env2, sessionId),
    });
  });

  // A reviewer's correction to one door row (2026-10-08). Sizes are read into
  // inches with the same reader the schedule read used; the row is marked
  // corrected and keeps what it read before.
  router.patch("/api/hardware-schedule/session/:sessionId/doors/:doorId", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    const row = await env2.DB.prepare("SELECT * FROM door_schedule_entries WHERE id = ? AND session_id = ?").bind(request2.params.doorId, o.session.id).first();
    if (!row) return jsonResponse3({ success: false, error: "That door row is not in this schedule." }, 404);
    const body = await request2.json().catch(() => ({}));
    const clean = (v, max) => (v == null ? null : String(v).replace(/\s+/g, " ").trim().slice(0, max) || null);
    const upd = {};
    let pairFix = null;
    if ("mark" in body) { const m = clean(body.mark, 24); if (!m) return jsonResponse3({ success: false, error: "A door needs a mark." }, 400); upd.mark = m; }
    if ("hardware_group" in body) upd.hardware_group = clean(body.hardware_group, 24);
    if ("fire_rating" in body) upd.fire_rating = clean(body.fire_rating, 24);
    if ("door_type" in body) upd.door_type = clean(body.door_type, 12);
    if ("door_material" in body) upd.door_material = clean(body.door_material, 40);
    if ("frame_type" in body) upd.frame_type = clean(body.frame_type, 24);
    if ("notes" in body) upd.notes = clean(body.notes, 400);
    if ("size" in body || "width" in body || "height" in body) {
      const sizeText = clean(body.size, 60);
      const s = sizeText ? readSizeCell(sizeText) : { width: clean(body.width, 24), height: clean(body.height, 24) };
      if (!sizeText) {
        const w = readDimension(s.width), h = readDimension(s.height);
        s.width_inches = w && w.inches >= 12 && w.inches <= 192 ? w.inches : null;
        s.height_inches = h && h.inches >= 60 && h.inches <= 240 ? h.inches : null;
      }
      upd.width = [s.width, s.height].filter(Boolean).join(" x ") || null;
      upd.width_inches = s.width_inches ?? null;
      upd.height_inches = s.height_inches ?? null;
      if ((sizeText || s.width || s.height) && (upd.width_inches == null || upd.height_inches == null)) return jsonResponse3({ success: false, error: "The size did not read as a door size. Write it as 3'-0\" x 7'-0\" (or PR 6'-0\" x 7'-0\" for a pair)." }, 400);
      // A pair written in the size ("PR 3'-4\" x 6'-8\"", the way the form shows one) is a pair; a size
      // without it is a single door (g052: the pair the reader missed on a "WD-2 (PR)" row stays corrected).
      if (sizeText) pairFix = !!s.pair;
    }
    if ("thickness" in body) {
      upd.thickness = clean(body.thickness, 16);
      const t = upd.thickness ? readDimension(upd.thickness) : null;
      upd.thickness_inches = t && t.inches >= 0.75 && t.inches <= 3 ? t.inches : null;
    }
    let fcPair = null;
    if (pairFix !== null) {
      let fc = {};
      try { fc = row.field_confidence_json ? JSON.parse(row.field_confidence_json) || {} : {}; } catch (_) { fc = {}; }
      fcPair = fc.pair ?? null;
      if (fcPair !== pairFix) upd.field_confidence_json = JSON.stringify({ ...fc, pair: pairFix });
    }
    const keys = Object.keys(upd);
    if (!keys.length) return jsonResponse3({ success: false, error: "Nothing to change." }, 400);
    let before = {};
    try { before = row.corrections_json ? JSON.parse(row.corrections_json).before || {} : {}; } catch (_) { before = {}; }
    for (const k of keys) if (k !== "field_confidence_json" && !(k in before)) before[k] = row[k] ?? null;
    if ("field_confidence_json" in upd && !("pair" in before)) before.pair = fcPair;
    const corrections = JSON.stringify({ before, by: o.user.email || o.user.userId, at: new Date().toISOString() });
    try {
      await env2.DB.prepare("UPDATE door_schedule_entries SET " + keys.map((k) => k + " = ?").join(", ") + ", corrections_json = ?, validation_status = 'corrected', validated = 1, validated_by = ?, validated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
        .bind(...keys.map((k) => upd[k]), corrections, o.user.email || o.user.userId, row.id).run();
    } catch (e) {
      if (/UNIQUE/i.test(e.message)) return jsonResponse3({ success: false, error: "Another row of this schedule already has that mark." }, 409);
      return jsonResponse3({ success: false, error: "The row could not be saved: " + e.message }, 500);
    }
    const changed = { ...upd };
    if ("field_confidence_json" in changed) { delete changed.field_confidence_json; changed.pair = pairFix; }
    return jsonResponse3({ success: true, id: row.id, changed });
  });

  // A reviewer's correction to one hardware item.
  router.patch("/api/hardware-schedule/session/:sessionId/components/:componentId", async (request2, env2) => {
    const o = await ownedSession(request2, env2, authenticate, request2.params.sessionId);
    if (o.error) return o.error;
    const row = await env2.DB.prepare("SELECT hc.* FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id WHERE hc.id = ? AND hs.session_id = ?").bind(request2.params.componentId, o.session.id).first();
    if (!row) return jsonResponse3({ success: false, error: "That item is not in this schedule." }, 404);
    const body = await request2.json().catch(() => ({}));
    const clean = (v, max) => (v == null ? null : String(v).replace(/\s+/g, " ").trim().slice(0, max) || null);
    const upd = {};
    if ("quantity" in body) { const q = parseInt(body.quantity, 10); if (!(q >= 0 && q < 1000)) return jsonResponse3({ success: false, error: "The quantity must be a whole number." }, 400); upd.quantity = q; }
    if ("manufacturer" in body) upd.manufacturer = clean(body.manufacturer, 60);
    if ("model" in body) { upd.model = clean(body.model, 120); upd.catalog_number = upd.model; }
    if ("finish" in body) upd.finish = clean(body.finish, 16);
    let spec = {};
    try { spec = row.specifications ? JSON.parse(row.specifications) : {}; } catch (_) { spec = {}; }
    if ("description" in body) { spec.description = clean(body.description, 120); upd.specifications = JSON.stringify(spec); }
    if ("component_type" in body) upd.component_type = clean(body.component_type, 40) || row.component_type;
    const keys = Object.keys(upd);
    if (!keys.length) return jsonResponse3({ success: false, error: "Nothing to change." }, 400);
    try {
      await env2.DB.prepare("UPDATE hardware_components SET " + keys.map((k) => k + " = ?").join(", ") + ", affirmed = 1, affirmed_at = datetime('now'), affirmed_by = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(...keys.map((k) => upd[k]), o.user.email || o.user.userId, row.id).run();
    } catch (e) {
      return jsonResponse3({ success: false, error: "The item could not be saved: " + e.message }, 500);
    }
    return jsonResponse3({ success: true, id: row.id, changed: upd });
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
        return jsonResponse3({ success: false, error: "NOTHING_EXTRACTED", details: "Nothing has been read from this schedule yet. Read a page first (READ THIS PAGE), then build the package: it is made from the door rows and hardware groups that were read." }, 409);
      }
      const doorRefs = await env2.DB.prepare("SELECT hardware_group, field_confidence_json FROM door_schedule_entries WHERE session_id = ?").bind(sessionId).all();
      const groupsRead = await env2.DB.prepare("SELECT s.set_number, (SELECT COUNT(*) FROM hardware_components c WHERE c.set_id = s.id) AS components FROM hardware_sets s WHERE s.session_id = ?").bind(sessionId).all();
      const needed = hardwareScheduleNeed((doorRefs.results || []).map(d => {
        let meta = {}; try { meta = JSON.parse(d.field_confidence_json || "{}") || {}; } catch (_) {}
        return { hardware_group: d.hardware_group, hardware_spec_sections: meta.hardware_spec_sections || [] };
      }), groupsRead.results || []);
      if (needed) return jsonResponse3({ success: false, error: "HARDWARE_SPEC_REQUIRED", details: needed.message, hardware_schedule_needed: needed }, 409);
      const hadPackage = await packageStatus(env2, sessionId);
      const cutSheets = await citedPagesForSession(sessionId, env2);
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
        citedPages: cutSheets.pages,
        cutSheetMisses: cutSheets.missing,
        cutSheetByOthers: cutSheets.by_others,
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
        cut_sheet_matching: { components: cutSheets.components, matched: cutSheets.matched, unmatched: cutSheets.unmatched, missing: cutSheets.missing, by_others: cutSheets.by_others, pages: cutSheets.pages.length },
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
