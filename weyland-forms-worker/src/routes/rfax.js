// weyland-forms-worker/src/routes/rfax.js
//
// RFaX (2026-10-08): RFIs from the job's own schedule. The old RFaX
// formatted one typed question. This one reads the customer's SubX session:
//   - it finds what a door hardware sub has to ask about: door groups whose
//     hardware set is not in the hardware schedule, fire-rated openings whose
//     set lists no closer or no latching device (a fire door must be
//     self-closing and positive-latching), openings with no size read, and
//     items with no manufacturer;
//   - each becomes an RFI with the affected openings listed (mark, size,
//     rating, set and its items) and the schedule pages they were read from
//     attached to the PDF;
//   - RFIs are numbered per session and tracked: open, answered (with the
//     answer and date), closed; days outstanding.
//   GET  /api/forms/rfax/session/:id             issues found + openings + this session's RFIs
//   POST /api/forms/rfax/save                    {sessionId, subject, question, suggestion, openings[], to, responseBy, impact}
//   POST /api/forms/rfax/:id/answer              {response, status}
//   GET  /api/forms/rfax/:id/pdf                 the RFI PDF (RFaX, the suite or the $100 offer)

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, signature, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { loadJob, closeoutModel } from "./closex.js";

const STATUSES = new Set(["open", "answered", "closed"]);
const CLOSER = /closer|operator/i;
const LATCH = /lock|latch|lever|exit|panic|deadbolt|mortise|cylindrical|storeroom|classroom|passage|privacy|flush ?bolt/i;
const rated = (r) => r && !/^(nr|n\/a|none|-|0|non[- ]?rated)$/i.test(String(r).trim());

/** What the schedule leaves for the sub to ask. */
export function findIssues(model) {
  const issues = [];
  const bySet = new Map();
  for (const o of model.openings) { if (!o.items.length && o.set) { if (!bySet.has(o.set)) bySet.set(o.set, []); bySet.get(o.set).push(o.mark); } }
  for (const [set, marks] of bySet) issues.push({ kind: "missing_set", subject: `Hardware set ${set} not in the hardware schedule`, question: `The door schedule assigns hardware set ${set} to opening${marks.length > 1 ? "s" : ""} ${marks.join(", ")}, but the hardware schedule we received has no set ${set}. Please provide the hardware set ${set} contents.`, openings: marks });
  const noCloser = [], noLatch = [];
  for (const o of model.openings) {
    if (!rated(o.rating) || !o.items.length) continue;
    const text = o.items.map((it) => `${it.type} ${it.description} ${it.model}`).join(" ");
    if (!CLOSER.test(text)) noCloser.push(o);
    if (!LATCH.test(text)) noLatch.push(o);
  }
  if (noCloser.length) issues.push({ kind: "rated_no_closer", subject: "Fire-rated openings with no closer in their hardware set", question: `The following fire-rated openings are assigned hardware sets that list no closer: ${noCloser.map((o) => `${o.mark} (${o.rating}, set ${o.set})`).join("; ")}. A fire door assembly must be self-closing. Please confirm the closer to be provided, or revise the hardware set.`, openings: noCloser.map((o) => o.mark) });
  if (noLatch.length) issues.push({ kind: "rated_no_latch", subject: "Fire-rated openings with no latching hardware in their set", question: `The following fire-rated openings are assigned hardware sets that list no lock, latch or exit device: ${noLatch.map((o) => `${o.mark} (${o.rating}, set ${o.set})`).join("; ")}. A fire door assembly must be positive-latching. Please confirm the latching device to be provided, or revise the hardware set.`, openings: noLatch.map((o) => o.mark) });
  const noSize = model.openings.filter((o) => !o.size).map((o) => o.mark);
  if (noSize.length) issues.push({ kind: "no_size", subject: "Openings with no door size in the schedule", question: `No door size could be read for opening${noSize.length > 1 ? "s" : ""} ${noSize.join(", ")}. Please confirm the door width, height and thickness.`, openings: noSize });
  // One line per item, naming every set it appears in.
  const noMaker = new Map();
  for (const o of model.openings) for (const it of o.items) {
    if (it.manufacturer || !it.model) continue;
    const k = `${it.description || it.type} ${it.model}`;
    if (!noMaker.has(k)) noMaker.set(k, new Set());
    if (o.set) noMaker.get(k).add(String(o.set));
  }
  const uniq = [...noMaker].map(([k, sets]) => {
    const list = [...sets].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list.length ? `${k} (set${list.length > 1 ? "s" : ""} ${list.join(", ")})` : k;
  });
  if (uniq.length) issues.push({ kind: "no_manufacturer", subject: "Hardware items with no manufacturer named", question: `The hardware schedule names no manufacturer for: ${uniq.slice(0, 20).join("; ")}${uniq.length > 20 ? " ..." : ""}. Please confirm the manufacturer, or whether an equal is acceptable.`, openings: [] });
  return issues;
}

let ready = false;
export function resetForTests() { ready = false; }
async function ensureTable(env) {
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS forms_rfis (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT NOT NULL, number INTEGER NOT NULL,
    subject TEXT, question TEXT, suggestion TEXT, openings_json TEXT, addressed_to TEXT, response_by TEXT, impact TEXT,
    status TEXT NOT NULL, response TEXT, answered_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  ready = true;
}

export async function rfiPdf(env, rfi, model, session, PDFDocument) {
  const w = await newDoc({ title: `RFI ${rfi.number}: ${rfi.subject}`, footer: `RFI ${rfi.number} · ${model.project.name} · WeylandAI RFaX` });
  title(w, `REQUEST FOR INFORMATION No. ${rfi.number}`, { size: 16 });
  for (const [l, v] of [["Project:", model.project.name], ["To:", rfi.addressed_to], ["From:", rfi.from || ""], ["Date sent:", String(rfi.created_at).slice(0, 10)], ["Response needed by:", rfi.response_by], ["Subject:", rfi.subject], ["Spec section:", "08 71 00 Door Hardware"]]) field(w, l, v || "");
  para(w, "Question", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  para(w, rfi.question || "", { size: 11 });
  if (rfi.suggestion) { para(w, "Suggested resolution", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 }); para(w, rfi.suggestion, { size: 11 }); }
  para(w, `Cost or schedule impact: ${rfi.impact || "unknown at this time"}`, { size: 10.5 });
  const marks = new Set(JSON.parse(rfi.openings_json || "[]"));
  const affected = model.openings.filter((o) => marks.has(o.mark));
  if (affected.length) {
    para(w, "Affected openings (as read from the schedule)", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
    table(w, [{ head: "OPENING", width: 0.12 }, { head: "LOCATION", width: 0.2 }, { head: "SIZE", width: 0.14 }, { head: "RATING", width: 0.1 }, { head: "SET", width: 0.08 }, { head: "SET ITEMS", width: 0.28 }, { head: "PAGE", width: 0.08, align: "right" }],
      affected.map((o) => [o.mark, o.location, o.size, o.rating, o.set, o.items.map((i) => `${i.qty} ${i.description || i.type} ${i.manufacturer} ${i.catalog || i.model}`.trim()).join("; ") || "(none)", o.page != null ? String(o.page) : ""]), { size: 8.5 });
  }
  para(w, "Response", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  if (rfi.response) para(w, `${rfi.response}${rfi.answered_at ? ` (answered ${String(rfi.answered_at).slice(0, 10)})` : ""}`, { size: 11 });
  else { for (let i = 0; i < 5; i++) { w.page.drawLine({ start: { x: 64, y: w.y }, end: { x: 548, y: w.y }, thickness: 0.4 }); w.y -= 20; } }
  signature(w, [{ label: "Responded by:", caption: "(Architect / engineer, signature, date)" }]);
  const pages = [...new Set(affected.map((o) => o.page).filter((p) => p != null))].sort((a, b) => a - b);
  if (pages.length) small(w, `Attached: schedule page${pages.length > 1 ? "s" : ""} ${pages.join(", ")} of ${session.filename || "the uploaded schedule"}.`);
  const bytes = await finish(w);
  if (!pages.length || !env.UPLOADS || !session.file_buffer_key || String(session.file_buffer_key).startsWith("demo-clone/")) return bytes;
  try {
    const obj = await env.UPLOADS.get(session.file_buffer_key);
    if (!obj) return bytes;
    const src = await PDFDocument.load(await obj.arrayBuffer(), { ignoreEncryption: true });
    const out = await PDFDocument.load(bytes);
    const idx = pages.filter((p) => p >= 1 && p <= src.getPageCount()).map((p) => p - 1).slice(0, 10);
    for (const pg of await out.copyPages(src, idx)) out.addPage(pg);
    return out.save();
  } catch (_) {
    return bytes;
  }
}

export function registerRfaxRoutes(router, { authenticate, PDFDocument }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to write RFIs from your SubX sessions." }, 401) };
    await ensureTable(env);
    return { userId: String(user.userId) };
  }
  async function job(env, sessionId, userId) {
    const j = await loadJob(env, sessionId, userId);
    if (j.error) return { error: jsonResponse3({ success: false, message: j.error[1] }, j.error[0]) };
    return { j, model: closeoutModel(j, {}) };
  }

  router.get("/api/forms/rfax/session/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const r = await job(env, request.params.id, a.userId); if (r.error) return r.error;
    const rfis = (await env.DB.prepare("SELECT id, number, subject, status, addressed_to, response_by, response, answered_at, created_at FROM forms_rfis WHERE session_id = ? AND user_id = ? ORDER BY number").bind(request.params.id, a.userId).all()).results || [];
    const now = Date.now();
    return jsonResponse3({
      success: true, project: r.model.project.name,
      issues: findIssues(r.model),
      openings: r.model.openings.map((o) => ({ mark: o.mark, location: o.location, size: o.size, rating: o.rating, set: o.set, items: o.items.length, page: o.page })),
      rfis: rfis.map((x) => ({ ...x, days_outstanding: x.status === "open" ? Math.floor((now - Date.parse(x.created_at)) / 86400000) : null })),
    });
  });

  router.post("/api/forms/rfax/save", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const b = await request.json().catch(() => ({}));
    const r = await job(env, String(b.sessionId || ""), a.userId); if (r.error) return r.error;
    if (!String(b.subject || "").trim() || !String(b.question || "").trim()) return jsonResponse3({ success: false, message: "An RFI needs a subject and a question." }, 400);
    const last = await env.DB.prepare("SELECT MAX(number) AS n FROM forms_rfis WHERE session_id = ? AND user_id = ?").bind(b.sessionId, a.userId).first();
    const now = new Date().toISOString();
    const marks = new Set(r.model.openings.map((o) => o.mark));
    const row = { id: crypto.randomUUID(), number: (last?.n || 0) + 1 };
    await env.DB.prepare("INSERT INTO forms_rfis (id, user_id, session_id, number, subject, question, suggestion, openings_json, addressed_to, response_by, impact, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)")
      .bind(row.id, a.userId, b.sessionId, row.number, String(b.subject).slice(0, 200), String(b.question).slice(0, 5000), String(b.suggestion || "").slice(0, 3000),
        JSON.stringify((Array.isArray(b.openings) ? b.openings : []).map(String).filter((m) => marks.has(m)).slice(0, 200)), String(b.to || "").slice(0, 160), String(b.responseBy || "").slice(0, 40), String(b.impact || "").slice(0, 200), now, now).run();
    return jsonResponse3({ success: true, rfi: { ...row, status: "open" }, pdfUrl: `/api/forms/rfax/${row.id}/pdf` });
  });

  router.post("/api/forms/rfax/:id/answer", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const b = await request.json().catch(() => ({}));
    const status = STATUSES.has(b.status) ? b.status : "answered";
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE forms_rfis SET response = ?, status = ?, answered_at = CASE WHEN ? = 'open' THEN NULL ELSE COALESCE(answered_at, ?) END, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(String(b.response || "").slice(0, 5000), status, status, now, now, request.params.id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.get("/api/forms/rfax/:id/pdf", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const rfi = await env.DB.prepare("SELECT * FROM forms_rfis WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).first();
    if (!rfi) return jsonResponse3({ success: false, message: "RFI not found." }, 404);
    if (!(await outputAccess(env, a.userId, "rfax")).paid) return jsonResponse3(paymentRequired("The RFI PDF"), 402);
    const r = await job(env, rfi.session_id, a.userId); if (r.error) return r.error;
    const session = await env.DB.prepare("SELECT filename, file_buffer_key FROM hardware_extraction_sessions WHERE id = ?").bind(rfi.session_id).first();
    const bytes = await rfiPdf(env, rfi, r.model, session || {}, PDFDocument);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="RFI-${rfi.number}.pdf"`, "Cache-Control": "no-store" } });
  });
}
