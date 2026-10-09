// weyland-forms-worker/src/routes/coa-permitx.js
//
// CoA and PermitX (2026-10-08), rebuilt on the job SubX read.
//
// CoA: the certificate of occupancy application package. The old one was a
// cover letter and a generic 8-line checklist. For a door hardware sub what
// the inspector looks at before the CO is the fire door assemblies: CoA now
// carries, for every fire-rated opening in the schedule, an acceptance
// inspection record with the checks NFPA 80 calls for on swinging fire
// doors (paraphrased here; the AHJ's adopted edition governs), the
// opening's rating and the hardware that makes it self-closing and
// positive-latching, plus the cover letter and supporting-document list.
//
// PermitX: the permit application package. For door hardware the plan
// reviewer looks at electrified locking and egress hardware. PermitX writes
// the scope of work from the schedule (openings, rated openings, items) and
// lists every opening whose set carries electrified or access-control
// hardware with its items, the coordination a reviewer asks about (power,
// fire alarm release, free egress), and the cited product pages.
//   POST /api/forms/coa/preview | /api/forms/coa/pdf
//   POST /api/forms/permitx/preview | /api/forms/permitx/pdf
// Previews free; PDFs need the product (coa / permitx tier), the suite or the $100 offer.

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, signature, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { loadJob, closeoutModel, citedProductPages } from "./closex.js";

const rated = (r) => r && !/^(nr|n\/a|none|-|0|non[- ]?rated)$/i.test(String(r).trim());
const has = (o, re) => o.items.some((it) => re.test(`${it.type} ${it.description} ${it.model} ${it.catalog}`));

export const NFPA80_CHECKS = [
  "Labels on the door and frame present and legible",
  "No open holes or breaks in the door or frame surfaces",
  "Glazing, vision light frames and glazing beads intact and fastened",
  "Door, frame, hinges, hardware and noncombustible threshold secured, aligned, working, undamaged",
  "No parts missing or broken",
  "Door clearances within the limits the standard sets",
  "Self-closing device operates: the door closes completely from full open",
  "Pairs with a coordinator: the inactive leaf closes before the active leaf",
  "Latching hardware operates and secures the door when closed",
  "Auxiliary hardware does not interfere with closing or latching",
  "No field modifications that void the label",
  "Gasketing and edge seals, where required, present and intact",
  "Signage on the door within the standard's limits",
];

export const CO_SUPPORT = ["Final building inspection sign-off", "Fire marshal / fire alarm acceptance", "Fire door assembly acceptance records (attached)", "Accessibility sign-off", "As-built drawings (if required by the permit)", "Door hardware closeout package (CloseX)"];

export function coaModel(job, b = {}) {
  const m = closeoutModel(job, b);
  const ratedOpenings = m.openings.filter((o) => rated(o.rating)).map((o) => ({
    ...o,
    closer: has(o, /closer|operator/i),
    latch: has(o, /lock|latch|lever|exit|panic|mortise|cylindrical|flush ?bolt/i),
    pair: o.pair || has(o, /coordinator|flush ?bolt/i),
  }));
  return {
    project: { ...m.project, ahj: String(b.ahj || "").slice(0, 160), permit: String(b.permit || "").slice(0, 80), contact: String(b.contact || "").slice(0, 160) },
    ratedOpenings, total: m.openings.length,
    support: CO_SUPPORT.map((c) => ({ item: c, done: !!(b.support || {})[c] })),
  };
}

export async function coaPdf(c) {
  const w = await newDoc({ title: `CO application: ${c.project.name}`, footer: `${c.project.name} · certificate of occupancy application · WeylandAI CoA` });
  title(w, "CERTIFICATE OF OCCUPANCY: APPLICATION PACKAGE", { size: 15 });
  for (const [l, v] of [["Authority having jurisdiction:", c.project.ahj], ["Permit number:", c.project.permit], ["Project:", c.project.name], ["Owner:", c.project.owner], ["Contact:", c.project.contact]]) field(w, l, v);
  para(w, `To ${c.project.ahj || "the authority having jurisdiction"}: the undersigned requests the final inspection and the issuance of a certificate of occupancy for the project above. The supporting documents are listed below; the acceptance records for the ${c.ratedOpenings.length} fire-rated door assemblies in the door schedule are attached.`, { size: 11 });
  table(w, [{ head: "", width: 0.08 }, { head: "SUPPORTING DOCUMENT", width: 0.92 }], c.support.map((s) => [s.done ? "[x]" : "[ ]", s.item]), { size: 10 });
  small(w, "This package requests a certificate of occupancy; it is not one. Only the authority having jurisdiction issues it, after its own inspection.");
  signature(w, [{ label: "Submitted by:", caption: "(Name, company, signature, date)" }]);
  title(w, "FIRE DOOR ASSEMBLY ACCEPTANCE RECORDS", { size: 14 });
  small(w, "One record per fire-rated opening in the door schedule. Checks paraphrase the acceptance inspection NFPA 80 (Standard for Fire Doors and Other Opening Protectives) calls for on swinging doors with builders hardware; the edition adopted by the authority having jurisdiction governs. Inspected by a person with knowledge of the assemblies; results recorded per opening.");
  if (!c.ratedOpenings.length) small(w, "No fire-rated openings were read from the door schedule.");
  for (const o of c.ratedOpenings) {
    para(w, `Opening ${o.mark}${o.location ? " · " + o.location : ""} · rating ${o.rating}${o.size ? " · " + o.size : ""} · set ${o.set || "-"}`, { size: 10.5, font: w.fonts.serifBold, justify: false, gapAfter: 1 });
    small(w, `Self-closing in the set: ${o.closer ? "yes" : "NOT LISTED"} · positive latching in the set: ${o.latch ? "yes" : "NOT LISTED"}. Hardware: ${o.items.map((i) => `${i.qty} ${i.description || i.type} ${i.manufacturer} ${i.catalog || i.model}`.trim()).join("; ") || "(no items read)"}`);
    table(w, [{ head: "CHECK", width: 0.7 }, { head: "PASS / FAIL / NA", width: 0.3 }], NFPA80_CHECKS.filter((k) => o.pair || !/^Pairs/.test(k)).map((k) => [k, ""]), { size: 8.5 });
    small(w, "Inspected by: ______________________   Date: __________   Deficiencies corrected: __________");
    w.y -= 6;
  }
  return finish(w);
}

// 2026-10-09 product audit (Rockford): the bare word "strike" listed Ives
// DP1/DP2 dust proof strikes as electrified, and "ELEC PANIC HARDWARE" (Von
// Duprin QEL-99-EO-CON) was missed. A strike counts only when it is electric
// ("electric strike" via electri, "elec strike", "e-strike"); ELEC/ELECT,
// the QEL/EL device prefixes and power transfers (EPT) count.
const ELECTRIFIED = /mag(netic)? ?lock|maglock|electri|\bELECT?\b|\bE-?STRIKE|\bEL\b|\bQ?EL-?\d|\bQEL\b|\bEU\b|\bRX\b|power ?transfer|\bEPT\b|card ?reader|access control|keypad|operator|actuator|delayed ?egress|\bM\d{2}\b|securitron|request.to.exit|rex|position switch|\bDPS\b/i;

export function permitModel(job, b = {}) {
  const m = closeoutModel(job, b);
  const electrified = m.openings.filter((o) => has(o, ELECTRIFIED));
  const ratedN = m.openings.filter((o) => rated(o.rating)).length;
  const items = m.openings.reduce((n, o) => n + o.items.reduce((s, i) => s + (Number(i.qty) || 1), 0), 0);
  return {
    project: { ...m.project, ahj: String(b.ahj || "").slice(0, 160), permitType: String(b.permitType || "Building (door hardware / low voltage)").slice(0, 120), applicant: String(b.applicant || "").slice(0, 160), license: String(b.license || "").slice(0, 80), valuation: String(b.valuation || "").slice(0, 40) },
    scope: `Furnish and install door hardware at ${m.openings.length} openings (${ratedN} fire-rated), ${items} hardware items in ${new Set(m.openings.map((o) => o.set).filter(Boolean)).size} hardware sets per the door and hardware schedules${electrified.length ? `, including electrified or access-controlled hardware at ${electrified.length} opening${electrified.length === 1 ? "" : "s"}` : ""}.`,
    electrified,
    coordination: ["Power supply and wiring for each electrified opening", "Fire alarm interface: electrified locks on egress doors release on alarm and on power loss where required", "Egress side: doors open from the egress side without a key, tool or special knowledge", "Fire-rated openings remain self-closing and positive-latching with the electrified hardware", "Access control panel, credentials and request-to-exit devices coordinated with the security contractor"],
    products: m.products.filter((p) => ELECTRIFIED.test(`${p.description} ${p.model}`)),
  };
}

export async function permitPdf(p, cited) {
  const w = await newDoc({ title: `Permit application: ${p.project.name}`, footer: `${p.project.name} · permit application · WeylandAI PermitX` });
  title(w, "PERMIT APPLICATION PACKAGE: DOOR HARDWARE", { size: 15 });
  for (const [l, v] of [["Permit type:", p.project.permitType], ["Authority having jurisdiction:", p.project.ahj], ["Project:", p.project.name], ["Owner:", p.project.owner], ["Applicant:", p.project.applicant], ["Contractor license:", p.project.license], ["Valuation:", p.project.valuation]]) field(w, l, v);
  para(w, "Scope of work", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  para(w, p.scope, { size: 11 });
  para(w, `Electrified and access-controlled openings (${p.electrified.length})`, { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  if (p.electrified.length) table(w, [{ head: "OPENING", width: 0.12 }, { head: "LOCATION", width: 0.2 }, { head: "RATING", width: 0.1 }, { head: "SET", width: 0.08 }, { head: "HARDWARE", width: 0.5 }],
    p.electrified.map((o) => [o.mark, o.location, o.rating || "", o.set, o.items.map((i) => `${i.qty} ${i.description || i.type} ${i.manufacturer} ${i.catalog || i.model}`.trim()).join("; ")]), { size: 8.5 });
  else small(w, "None in the hardware schedule.");
  para(w, "Coordination for plan review", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  table(w, [{ head: "", width: 0.08 }, { head: "ITEM", width: 0.92 }], p.coordination.map((c) => ["[ ]", c]), { size: 9.5 });
  if (cited) {
    para(w, "Product data for electrified hardware", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
    if (cited.pages.length) table(w, [{ head: "PRODUCT", width: 0.45 }, { head: "CATALOGUE", width: 0.4 }, { head: "PAGE", width: 0.15, align: "right" }], cited.pages.map((c) => [`${c.manufacturer} ${c.model}`, c.title, String(c.pageNum)]), { size: 9 });
    if (cited.missing.length) small(w, `No catalogue page on file for: ${cited.missing.join(", ")}.`);
  }
  small(w, "This package applies for a permit; it is not one. Only the authority having jurisdiction issues it, after its own review. Check its application forms and the code edition it has adopted.");
  signature(w, [{ label: "Applicant:", caption: "(Name, signature, date)" }]);
  return finish(w);
}

export function registerCoaPermitxRoutes(router, { authenticate }) {
  async function prepare(request, env, build) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to build this from your SubX sessions." }, 401) };
    const b = await request.json().catch(() => ({}));
    if (!b.sessionId) return { error: jsonResponse3({ success: false, message: "Choose a SubX session." }, 400) };
    const job = await loadJob(env, String(b.sessionId), String(user.userId));
    if (job.error) return { error: jsonResponse3({ success: false, message: job.error[1] }, job.error[0]) };
    if (!job.doors.length) return { error: jsonResponse3({ success: false, message: "SubX has no door rows for this session yet." }, 409) };
    return { user, model: build(job, b) };
  }
  const pdfResponse = (bytes, name) => new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "no-store" } });

  router.post("/api/forms/coa/preview", async (request, env) => {
    const p = await prepare(request, env, coaModel); if (p.error) return p.error;
    return jsonResponse3({ success: true, project: p.model.project, rated: p.model.ratedOpenings.map((o) => ({ mark: o.mark, location: o.location, rating: o.rating, set: o.set, closer: o.closer, latch: o.latch })), total: p.model.total, support: p.model.support.map((s) => s.item), checks: NFPA80_CHECKS });
  });
  router.post("/api/forms/coa/pdf", async (request, env) => {
    const p = await prepare(request, env, coaModel); if (p.error) return p.error;
    if (!(await outputAccess(env, p.user.userId, "coa")).paid) return jsonResponse3(paymentRequired("The CO application package PDF"), 402);
    return pdfResponse(await coaPdf(p.model), "CO-Application");
  });
  router.post("/api/forms/permitx/preview", async (request, env) => {
    const p = await prepare(request, env, permitModel); if (p.error) return p.error;
    return jsonResponse3({ success: true, project: p.model.project, scope: p.model.scope, electrified: p.model.electrified.map((o) => ({ mark: o.mark, location: o.location, set: o.set, items: o.items.map((i) => `${i.description || i.type} ${i.manufacturer} ${i.catalog || i.model}`.trim()) })), coordination: p.model.coordination });
  });
  router.post("/api/forms/permitx/pdf", async (request, env) => {
    const p = await prepare(request, env, permitModel); if (p.error) return p.error;
    if (!(await outputAccess(env, p.user.userId, "permitx")).paid) return jsonResponse3(paymentRequired("The permit package PDF"), 402);
    const cited = await citedProductPages(env, p.model.products);
    return pdfResponse(await permitPdf(p.model, cited), "Permit-Application");
  });
}
