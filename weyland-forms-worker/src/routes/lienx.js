// weyland-forms-worker/src/routes/lienx.js
//
// LienX (2026-10-08): lien waivers on the state's own statutory form.
//   GET  /api/forms/lienx/states          which states LienX fills, which it refuses
//   POST /api/forms/lienx/preview         {state, kind, values} -> the filled form as blocks (free, no sign-in)
//   POST /api/forms/lienx/pdf             same body -> the PDF (an account with LienX, the suite or
//                                         the $100 first submittal; weyland-shared/output-access.js)
// A state that prints its own forms LienX does not carry yet is refused
// (422) rather than given a generic waiver that may not be enforceable there.

import { jsonResponse3 } from "../lib/json-response.js";
import { STATES, STATUTORY_NOT_CARRIED, FORM_KINDS, KIND_LABEL, formFor, fill, moneyText } from "../lib/lien-forms.js";
import { newDoc, title, field, para, notice, signature, small, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const KEYS = ["amount", "checkMaker", "payee", "owner", "jobDescription", "customer", "throughDate", "date", "company", "signerTitle", "project", "jobNo", "propertyName", "propertyLocation", "invoiceNumber", "paymentPeriod", "disputedAmount", "propertyDescription", "year", "coversAll", "claimantAddress", "claimantPhone", "retainage", "unpaidAmount", "priorWaiverDates", "priorUnpaid", "county", "city", "signer"];

export function cleanValues(raw) {
  const v = {};
  for (const k of KEYS) v[k] = String((raw && raw[k]) ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  v.amount = moneyText(v.amount);
  v.disputedAmount = v.disputedAmount ? moneyText(v.disputedAmount) : "0.00";
  v.retainage = v.retainage ? moneyText(v.retainage) : "0.00";
  v.unpaidAmount = v.unpaidAmount ? moneyText(v.unpaidAmount) : "0.00";
  if (!v.date) {
    const d = new Date();
    v.date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  if (!v.year) v.year = (v.date.match(/\b(19|20)\d{2}\b/) || [String(new Date().getUTCFullYear())])[0];
  // Georgia's "THIS ___ DAY OF ______, ____" takes the date apart.
  const parsed = Date.parse(v.date + " 00:00:00 UTC");
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed), n = d.getUTCDate();
    const sfx = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th";
    v.dateDay = n + sfx;
    v.dateMonth = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  } else { v.dateDay = ""; v.dateMonth = ""; }
  return v;
}

/** The filled form: { title, blocks: [{t, text|label/value|lines}], statutory, cite, note } or { refused }. */
export function filledWaiver(state, kind, raw) {
  const st = String(state || "").toUpperCase();
  const k = FORM_KINDS.includes(kind) ? kind : "conditional_progress";
  const f = formFor(st, k);
  if (f.refused) return { refused: f.refused };
  const v = cleanValues(raw);
  // Florida's DATED line takes the day apart from the year.
  const fv = st === "FL" ? { ...v, date: v.date.replace(/,?\s*(19|20)\d{2}\s*$/, "") } : v;
  const blocks = f.blocks.map((b) => {
    if (b.t === "field") return { t: "field", label: b.label, value: ["amount", "disputedAmount", "retainage", "unpaidAmount", "priorUnpaid"].includes(b.key) ? (fv[b.key] ? "$" + fv[b.key] : "") : fv[b.key] };
    if (b.t === "sign") return { t: "sign", lines: b.lines.map((l) => ({ label: l.label || null, caption: l.caption || null, value: l.key ? fv[l.key] : "" })) };
    return { t: b.t, text: fill(b.text, fv) };
  });
  return {
    state: st,
    kind: k,
    kindLabel: KIND_LABEL[k],
    statutory: !!f.statutory,
    stateName: f.state ? f.state.name : null,
    cite: f.state ? f.state.cite : null,
    source: f.state ? f.state.source : null,
    minFont: f.state && f.state.minFont ? f.state.minFont : 0,
    onePage: !!(f.state && f.state.onePage),
    note: f.state ? f.state.note : "This state does not print a statutory waiver form that LienX knows of; this is a general-form waiver. Check your state's requirements or have counsel review it before relying on it.",
    title: (blocks.find((b) => b.t === "title") || {}).text || "Lien waiver",
    blocks,
  };
}

export async function waiverPdf(w, shrink = 0) {
  const doc = await newDoc({ title: w.title, footer: w.statutory ? `${w.cite} · filled by WeylandAI LienX` : "General-form waiver · WeylandAI LienX" });
  // A state that sets a minimum type size (Georgia: 12 point) gets it on every line of the form.
  // A form that must carry its notice on its face (Mississippi) is set smaller, and
  // smaller again if long entries still push it past one page.
  const min = w.minFont || 0, cut = w.onePage ? 2 + shrink : 0, at = (n) => Math.max(n - cut, min);
  let titled = false;
  for (const b of w.blocks) {
    // The form's own title first; later titles are the statute's section headings.
    if (b.t === "title") { if (titled) { doc.y -= 10; title(doc, b.text, { size: at(12), gapAfter: 12 }); } else title(doc, b.text, w.onePage ? { size: at(15) } : {}); titled = true; }
    else if (b.t === "field") field(doc, b.label, b.value, { size: at(11.5) });
    else if (b.t === "para") para(doc, b.text, { size: at(11.5), gapAfter: w.onePage ? 8 - Math.min(shrink, 4) : 10 });
    else if (b.t === "notice") notice(doc, b.text, w.onePage ? { size: at(12) } : {});
    else if (b.t === "sign") signature(doc, b.lines, { size: at(11), captionSize: Math.max(at(8), 6) });
  }
  if (!w.statutory) { doc.y -= 10; small(doc, w.note); }
  if (w.onePage && doc.pages.length > 1 && shrink < 4) return waiverPdf(w, shrink + 1);
  return finish(doc);
}

export function registerLienxRoutes(router, { authenticate }) {
  router.get("/api/forms/lienx/states", () => jsonResponse3({
    success: true,
    kinds: FORM_KINDS.map((k) => ({ kind: k, label: KIND_LABEL[k] })),
    statutory: Object.entries(STATES).map(([code, s]) => ({ code, name: s.name, cite: s.cite, source: s.source, note: s.note })),
    refused: Object.entries(STATUTORY_NOT_CARRIED).map(([code, cite]) => ({ code, cite })),
  }));

  router.post("/api/forms/lienx/preview", async (request) => {
    const body = await request.json().catch(() => ({}));
    const w = filledWaiver(body.state, body.kind, body.values);
    if (w.refused) return jsonResponse3({ success: false, code: "STATUTORY_FORM_NOT_CARRIED", message: w.refused }, 422);
    return jsonResponse3({ success: true, waiver: w });
  });

  router.post("/api/forms/lienx/pdf", async (request, env) => {
    const { error, user } = await authenticate(request, env);
    if (error) return error;
    if (!user || user.ephemeral || !user.userId) return jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to download the waiver PDF." }, 401);
    const body = await request.json().catch(() => ({}));
    const w = filledWaiver(body.state, body.kind, body.values);
    if (w.refused) return jsonResponse3({ success: false, code: "STATUTORY_FORM_NOT_CARRIED", message: w.refused }, 422);
    if (!(await outputAccess(env, user.userId, "lienx")).paid) return jsonResponse3(paymentRequired("The waiver PDF"), 402);
    const bytes = await waiverPdf(w);
    const name = `LienWaiver-${w.state}-${w.kind}.pdf`;
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  });
}
