// weyland-forms-worker/src/routes/closex.js
//
// CloseX (2026-10-08): the door hardware closeout package, built from the
// job SubX read. The old CloseX printed a fixed 8-line checklist with a
// project name on it. A Division 08 71 00 closeout is the record of what was
// installed: this one carries, from the customer's own SubX session,
//   1. the hardware schedule as installed, opening by opening (door, size,
//      rating, set, each item with maker, model and finish);
//   2. a keying schedule of every opening whose set has a lock, with the
//      key set and bitting columns left for the installer;
//   3. a warranty table per manufacturer (the terms the customer enters;
//      nothing is assumed about a maker's warranty);
//   4. attic stock, as entered;
//   5. the closeout checklist with sign-off lines;
//   6. product data: the cited catalogue page of each product (the shared
//      matcher's citation, the same page the submittal packet carries).
//   POST /api/forms/closex/preview {sessionId, ...}  -> what the package holds (free)
//   POST /api/forms/closex/pdf                       -> the package PDF (CloseX, the suite or the $100 offer)

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, signature, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { matchComponentToCutSheets, citedPagesFor, PACKET_MATCH_TYPES } from "../../../weyland-shared/product-database.js";
import { getCataloguePagePdf } from "../../../weyland-shared/cut-sheet-pages.js";

export const CHECKLIST = [
  "Hardware installed and adjusted per the hardware schedule",
  "Closers adjusted (closing and latching speed, backcheck)",
  "Fire-rated openings close and latch from full open",
  "Exit devices and electrified hardware tested",
  "Keys and cores turned over against the keying schedule",
  "Attic stock delivered",
  "Owner's staff shown operation and adjustment",
  "Product data and warranties delivered",
];

const setKey = (s) => String(s ?? "").trim().toUpperCase().replace(/^(HW|SET|GROUP)[-\s#]*/i, "").replace(/^0+(?=\w)/, "");
const LOCKS = /lock|lever|latch|cylinder|core|deadbolt|exit|panic|mortise|cylindrical|storeroom|classroom|passage|privacy/i;

/** The job: doors with their set's items, from SubX's own tables. */
export async function loadJob(env, sessionId, userId) {
  const session = await env.DB.prepare("SELECT id, user_id, project_name, filename FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return { error: [404, "That SubX session was not found."] };
  if (session.user_id !== userId) return { error: [403, "That SubX session belongs to another account."] };
  const doors = (await env.DB.prepare(
    "SELECT mark, hardware_group, fire_rating, width_inches, height_inches, door_type, door_material, frame_material, notes, page_number FROM door_schedule_entries WHERE session_id = ? ORDER BY page_number, rowid"
  ).bind(sessionId).all()).results || [];
  const comps = (await env.DB.prepare(
    `SELECT hs.set_number, hs.set_name, hc.component_type, hc.quantity, hc.uom, hc.manufacturer, hc.model, hc.catalog_number, hc.finish, hc.specifications
     FROM hardware_components hc JOIN hardware_sets hs ON hc.set_id = hs.id WHERE hs.session_id = ? ORDER BY hs.set_number, hc.sequence_order`
  ).bind(sessionId).all()).results || [];
  const sets = new Map();
  for (const c of comps) {
    let desc = null;
    try { const s = c.specifications ? JSON.parse(c.specifications) : null; desc = s && s.description ? s.description : null; } catch (_) { desc = null; }
    const k = setKey(c.set_number);
    if (!sets.has(k)) sets.set(k, { number: c.set_number, name: c.set_name, items: [] });
    sets.get(k).items.push({ type: c.component_type, qty: c.quantity || 1, uom: c.uom || "EA", manufacturer: c.manufacturer || "", model: c.model || c.catalog_number || "", catalog: c.catalog_number || "", finish: c.finish || "", description: desc || c.component_type || "" });
  }
  return { session, doors, sets };
}

const ftin = (i) => (i == null ? "" : Math.floor(i / 12) + "'-" + Math.round(i % 12) + '"');

export function closeoutModel(job, input = {}) {
  const openings = job.doors.map((d) => {
    const set = job.sets.get(setKey(d.hardware_group)) || null;
    return {
      mark: d.mark, location: d.notes || "", size: d.width_inches && d.height_inches ? `${ftin(d.width_inches)} x ${ftin(d.height_inches)}` : "",
      rating: d.fire_rating || "", set: d.hardware_group || "", items: set ? set.items : [], page: d.page_number,
    };
  });
  const keyed = openings.filter((o) => o.items.some((it) => LOCKS.test(`${it.type} ${it.description} ${it.model}`)));
  const makers = [...new Set([...job.sets.values()].flatMap((s) => s.items.map((it) => it.manufacturer)).filter(Boolean))].sort();
  const warranties = makers.map((m) => ({ manufacturer: m, terms: String((input.warranties || {})[m] || "").slice(0, 200) }));
  const products = new Map();
  for (const s of job.sets.values()) for (const it of s.items) {
    const key = `${it.manufacturer}|${it.model}`.toUpperCase();
    if (!it.model) continue;
    if (!products.has(key)) products.set(key, { manufacturer: it.manufacturer, model: it.model, description: it.description, sets: [] });
    if (!products.get(key).sets.includes(String(s.number))) products.get(key).sets.push(String(s.number));
  }
  return {
    project: {
      name: String(input.projectName || job.session.project_name || job.session.filename || "Project").slice(0, 160),
      owner: String(input.owner || "").slice(0, 160), contractor: String(input.contractor || "").slice(0, 160),
      architect: String(input.architect || "").slice(0, 160), installer: String(input.installer || "").slice(0, 160),
      completion: String(input.completion || "").slice(0, 60),
    },
    openings, keyed, warranties,
    atticStock: (Array.isArray(input.atticStock) ? input.atticStock : []).slice(0, 60).map((a) => ({ item: String(a.item || "").slice(0, 160), qty: String(a.qty || "").slice(0, 20) })).filter((a) => a.item),
    checklist: CHECKLIST.map((c) => ({ item: c, done: !!(input.checklist || {})[c] })),
    products: [...products.values()],
    unassigned: openings.filter((o) => !o.items.length).map((o) => o.mark),
  };
}

/** The cited page of each product; misses come back with a reason. */
export async function citedProductPages(env, products, match = matchComponentToCutSheets) {
  const pages = [], missing = [];
  const seen = new Set();
  for (const p of products) {
    let m = null;
    try { m = await match({ manufacturer: p.manufacturer, model: p.model }, env); } catch (_) { m = null; }
    const cp = m && m.matched && PACKET_MATCH_TYPES.has(String(m.matchType)) ? citedPagesFor(m, 1)[0] : null;
    if (!cp) { missing.push(`${p.manufacturer} ${p.model}`.trim()); continue; }
    const k = cp.catalogueId + "#" + cp.pageNum;
    if (seen.has(k)) continue;
    seen.add(k);
    pages.push({ ...cp, manufacturer: p.manufacturer, model: p.model });
  }
  return { pages, missing };
}

export async function closeoutPdf(env, model, cited, PDFDocument) {
  const w = await newDoc({ title: `Door hardware closeout: ${model.project.name}`, footer: `${model.project.name} · door hardware closeout · WeylandAI CloseX` });
  title(w, "DOOR HARDWARE CLOSEOUT PACKAGE", { size: 17 });
  small(w, "Section 08 71 00 (door hardware): record of what was installed", { center: true });
  w.y -= 14;
  for (const [l, v] of [["Project:", model.project.name], ["Owner:", model.project.owner], ["General contractor:", model.project.contractor], ["Architect:", model.project.architect], ["Hardware installer:", model.project.installer], ["Substantial completion:", model.project.completion]]) field(w, l, v);
  w.y -= 6;
  para(w, `Contents: 1. Hardware schedule as installed (${model.openings.length} openings) · 2. Keying schedule (${model.keyed.length} keyed openings) · 3. Warranties (${model.warranties.length} manufacturers) · 4. Attic stock · 5. Closeout checklist · 6. Product data (${cited.pages.length} catalogue pages)`, { size: 10.5, justify: false });

  title(w, "1. Hardware schedule as installed", { size: 13 });
  if (model.unassigned.length) small(w, `No hardware set items read for: ${model.unassigned.slice(0, 30).join(", ")}${model.unassigned.length > 30 ? " ..." : ""}`);
  for (const o of model.openings) {
    para(w, `Opening ${o.mark}${o.location ? " · " + o.location : ""}${o.size ? " · " + o.size : ""}${o.rating ? " · " + o.rating + " rated" : ""}${o.set ? " · set " + o.set : ""}`, { size: 10.5, font: w.fonts.serifBold, justify: false, gapAfter: 2 });
    if (o.items.length) table(w, [{ head: "QTY", width: 0.08 }, { head: "ITEM", width: 0.36 }, { head: "MANUFACTURER", width: 0.2 }, { head: "MODEL / CATALOG", width: 0.24 }, { head: "FINISH", width: 0.12 }],
      o.items.map((it) => [String(it.qty) + (it.uom && it.uom !== "EA" ? " " + it.uom : ""), it.description, it.manufacturer, it.catalog || it.model, it.finish]), { size: 8.5 });
    else small(w, "No items read for this opening's set.");
  }

  title(w, "2. Keying schedule", { size: 13 });
  small(w, "Openings whose hardware set includes a lock, latch, cylinder or exit device. Key set, bitting and cores are filled in by the installer at turnover.");
  table(w, [{ head: "OPENING", width: 0.14 }, { head: "LOCATION", width: 0.3 }, { head: "SET", width: 0.1 }, { head: "KEY SET", width: 0.16 }, { head: "BITTING / CORE", width: 0.18 }, { head: "KEYS", width: 0.12 }],
    model.keyed.map((o) => [o.mark, o.location, o.set, "", "", ""]), { size: 9 });

  title(w, "3. Warranties", { size: 13 });
  small(w, "Terms as entered for this job. Attach each manufacturer's warranty certificate.");
  table(w, [{ head: "MANUFACTURER", width: 0.35 }, { head: "WARRANTY TERMS", width: 0.65 }], model.warranties.map((x) => [x.manufacturer, x.terms || "(enter the manufacturer's terms)"]), { size: 9.5 });

  title(w, "4. Attic stock", { size: 13 });
  if (model.atticStock.length) table(w, [{ head: "ITEM", width: 0.8 }, { head: "QTY", width: 0.2, align: "right" }], model.atticStock.map((a) => [a.item, a.qty]), { size: 9.5 });
  else small(w, "None listed.");

  title(w, "5. Closeout checklist", { size: 13 });
  table(w, [{ head: "", width: 0.08 }, { head: "ITEM", width: 0.92 }], model.checklist.map((c) => [c.done ? "[x]" : "[ ]", c.item]), { size: 10 });
  signature(w, [{ label: "Installer:", caption: "(Name, signature, date)" }, { label: "Accepted by:", caption: "(Owner or owner's representative, date)" }]);

  title(w, "6. Product data", { size: 13 });
  small(w, `The catalogue page each installed product is cited on follows (${cited.pages.length}).${cited.missing.length ? " No catalogue page on file for: " + cited.missing.slice(0, 20).join(", ") + (cited.missing.length > 20 ? " ..." : "") + "." : ""}`);
  table(w, [{ head: "PRODUCT", width: 0.45 }, { head: "CATALOGUE", width: 0.4 }, { head: "PAGE", width: 0.15, align: "right" }], cited.pages.map((p) => [`${p.manufacturer} ${p.model}`, p.title, String(p.pageNum)]), { size: 9 });

  const bytes = await finish(w);
  if (!cited.pages.length) return bytes;
  const out = await PDFDocument.load(bytes);
  const loaded = new Map();
  for (const p of cited.pages) {
    const got = await getCataloguePagePdf(env, PDFDocument, { catalogueId: p.catalogueId, pageNum: p.pageNum }, loaded);
    if (!got.bytes) continue;
    const src = await PDFDocument.load(got.bytes, { ignoreEncryption: true });
    const [pg] = await out.copyPages(src, [0]);
    out.addPage(pg);
  }
  return out.save();
}

export function registerClosexRoutes(router, { authenticate, PDFDocument }) {
  async function prepare(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to build a closeout from your SubX sessions." }, 401) };
    const body = await request.json().catch(() => ({}));
    if (!body.sessionId) return { error: jsonResponse3({ success: false, message: "Choose a SubX session." }, 400) };
    const job = await loadJob(env, String(body.sessionId), String(user.userId));
    if (job.error) return { error: jsonResponse3({ success: false, message: job.error[1] }, job.error[0]) };
    if (!job.doors.length) return { error: jsonResponse3({ success: false, message: "SubX has no door rows for this session yet: read its door schedule in SubX first." }, 409) };
    return { user, model: closeoutModel(job, body) };
  }

  router.post("/api/forms/closex/preview", async (request, env) => {
    const p = await prepare(request, env);
    if (p.error) return p.error;
    const m = p.model;
    return jsonResponse3({
      success: true,
      project: m.project,
      openings: m.openings.length, keyed: m.keyed.length, manufacturers: m.warranties.map((x) => x.manufacturer),
      products: m.products.length, unassigned: m.unassigned, checklist: m.checklist.map((c) => c.item),
      sample: m.openings.slice(0, 5),
    });
  });

  router.post("/api/forms/closex/pdf", async (request, env) => {
    const p = await prepare(request, env);
    if (p.error) return p.error;
    if (!(await outputAccess(env, p.user.userId, "closex")).paid) return jsonResponse3(paymentRequired("The closeout package PDF"), 402);
    const cited = await citedProductPages(env, p.model.products);
    const bytes = await closeoutPdf(env, p.model, cited, PDFDocument);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Closeout-${p.model.project.name.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 60)}.pdf"`, "Cache-Control": "no-store" } });
  });
}
