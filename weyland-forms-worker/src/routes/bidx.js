// weyland-forms-worker/src/routes/bidx.js
//
// BidX (2026-10-08): the bid submission package for a public bid. The old
// BidX was user-typed line items on a template. This one joins two things
// the customer already has in WeylandAI:
//   - the bid: a HuntX notice (agency, solicitation, location, due date,
//     the public notice link), or typed in;
//   - the price: the customer's PropX proposal for the job (its lines are
//     the schedule of values, its total is the base bid).
// The package: bid form with the base bid in words and figures, alternates,
// unit prices, addenda acknowledged, bid security, qualifications and
// exclusions, signature, a schedule of values and the bidder's checklist of
// what the solicitation asks to be attached.
//   POST /api/forms/bidx/preview {opportunityId?, proposalId?, ...} -> the package as data (free)
//   POST /api/forms/bidx/pdf     same body -> PDF (BidX, the suite or the $100 offer)

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, signature, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => "$" + r2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under1000(n) {
  const h = Math.floor(n / 100), rest = n % 100;
  const parts = [];
  if (h) parts.push(ONES[h] + " hundred");
  if (rest) parts.push(rest < 20 ? ONES[rest] : TENS[Math.floor(rest / 10)] + (rest % 10 ? "-" + ONES[rest % 10] : ""));
  return parts.join(" ");
}
/** 48250.5 -> "Forty-eight thousand two hundred fifty and 50/100 dollars" */
export function dollarsInWords(amount) {
  const cents = Math.round(r2(amount) * 100) % 100;
  let n = Math.floor(r2(amount));
  if (n === 0) return `Zero and ${String(cents).padStart(2, "0")}/100 dollars`;
  const scales = ["", " thousand", " million", " billion"];
  const parts = [];
  for (let i = 0; n > 0 && i < scales.length; i++, n = Math.floor(n / 1000)) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(under1000(chunk) + scales[i]);
  }
  const s = parts.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ` and ${String(cents).padStart(2, "0")}/100 dollars`;
}

// Bids due (2026-10-09): the product audit found the bid form printing
// HuntX's key_date raw ("2026-12-15T00:00:00.000"). An ISO date prints as a
// date ("December 15, 2026"), with the time only when the notice gives one
// (as written: the notice carries no zone); anything else as entered.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function dueDate(v) {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m || !(+m[2] >= 1 && +m[2] <= 12) || !(+m[3] >= 1 && +m[3] <= 31)) return s;
  const date = `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  if (!m[4] || (m[4] === "00" && m[5] === "00")) return date;
  const h = +m[4];
  return `${date}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}

export const CHECKLIST = ["Bid form signed", "Bid security (bond or check)", "Addenda acknowledged", "Schedule of values", "Non-collusion affidavit", "Contractor license number shown", "Insurance certificate", "References / experience", "DBE / small business forms (if required)", "Product data for named substitutions"];

function proposalLines(p) {
  let lines = [];
  try { lines = JSON.parse(p.line_item_snapshot || "[]"); } catch (_) { lines = []; }
  return (Array.isArray(lines) ? lines : []).map((l) => {
    const qty = Number(l.quantity) || 0, unit = r2(l.unit_price ?? l.unitPrice);
    return { description: [l.door_type || l.description, l.material, l.size, l.fire_rating].filter(Boolean).join(" · ") || "Item", qty, unit, ext: r2(qty * unit) };
  });
}

export function bidPackage(opp, prop, b) {
  const lines = prop ? proposalLines(prop) : [];
  const base = prop ? r2(prop.grand_total) : r2(String(b.baseBid || "").replace(/[$,\s]/g, ""));
  const alternates = (Array.isArray(b.alternates) ? b.alternates : []).slice(0, 20).map((a, i) => ({ no: a.no || String(i + 1), description: String(a.description || "").slice(0, 200), add: !/deduct/i.test(a.kind || ""), amount: r2(a.amount) })).filter((a) => a.description);
  const addenda = (Array.isArray(b.addenda) ? b.addenda : []).slice(0, 30).map((a) => ({ no: String(a.no || "").slice(0, 10), date: String(a.date || "").slice(0, 20) })).filter((a) => a.no);
  const bondPct = Math.max(0, Math.min(100, Number(b.bondPercent) || 0));
  return {
    bid: {
      agency: String((opp && opp.agency) || b.agency || "").slice(0, 160),
      solicitation: String((opp && opp.title) || b.solicitation || "").slice(0, 300),
      reference: String((opp && opp.source_ref) || b.reference || "").slice(0, 80),
      location: String((opp && opp.location) || b.location || "").slice(0, 160),
      due: dueDate(String((opp && opp.key_date) || b.due || "").slice(0, 40)),
      noticeUrl: String((opp && opp.detail_url) || "").slice(0, 400),
      source: opp ? opp.source : null,
    },
    bidder: { company: String(b.company || "").slice(0, 160), address: String(b.address || "").slice(0, 200), license: String(b.license || "").slice(0, 80), signer: String(b.signer || "").slice(0, 120), signerTitle: String(b.signerTitle || "").slice(0, 80), phone: String(b.phone || "").slice(0, 40), email: String(b.email || "").slice(0, 120) },
    baseBid: base, baseBidWords: dollarsInWords(base),
    priceSource: prop ? `PropX quote ${prop.quote_number}` : "entered",
    lines,
    unitPrices: (Array.isArray(b.unitPrices) ? b.unitPrices : []).slice(0, 30).map((u) => ({ description: String(u.description || "").slice(0, 160), unit: String(u.unit || "EA").slice(0, 10), price: r2(u.price) })).filter((u) => u.description),
    alternates, addenda,
    bond: { percent: bondPct, amount: r2(base * bondPct / 100), surety: String(b.surety || "").slice(0, 160) },
    exclusions: String(b.exclusions || "").slice(0, 3000),
    days: String(b.days || "").slice(0, 40),
    validity: String(b.validity || "").slice(0, 40),
    checklist: CHECKLIST.map((c) => ({ item: c, done: !!(b.checklist || {})[c] })),
  };
}

export async function bidPdf(pkg) {
  const w = await newDoc({ title: `Bid: ${pkg.bid.solicitation}`, footer: `Bid of ${pkg.bidder.company || "bidder"} · ${pkg.bid.agency} · WeylandAI BidX` });
  title(w, "BID FORM", { size: 18 });
  for (const [l, v] of [["To:", pkg.bid.agency], ["Solicitation:", pkg.bid.solicitation], ["Reference:", pkg.bid.reference], ["Project location:", pkg.bid.location], ["Bids due:", pkg.bid.due], ["Bidder:", pkg.bidder.company], ["Address:", pkg.bidder.address], ["Contractor license:", pkg.bidder.license], ["Contact:", [pkg.bidder.phone, pkg.bidder.email].filter(Boolean).join(" · ")]]) field(w, l, v);
  para(w, `The undersigned, having examined the bid documents${pkg.addenda.length ? " and the addenda listed below" : ""}, proposes to furnish all labor, materials, equipment and services for the door, frame and hardware work described therein for the base bid sum of:`, { size: 11 });
  para(w, `${pkg.baseBidWords} (${money(pkg.baseBid)})`, { size: 12.5, font: w.fonts.serifBold, justify: false });
  if (pkg.days) para(w, `Completion: ${pkg.days}.`, { size: 11 });
  if (pkg.validity) para(w, `This bid remains open for acceptance for ${pkg.validity}.`, { size: 11 });
  if (pkg.alternates.length) { para(w, "Alternates", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 }); table(w, [{ head: "NO.", width: 0.1 }, { head: "ALTERNATE", width: 0.6 }, { head: "ADD / DEDUCT", width: 0.3, align: "right" }], pkg.alternates.map((a) => [a.no, a.description, (a.add ? "ADD " : "DEDUCT ") + money(a.amount)]), { size: 9.5 }); }
  if (pkg.unitPrices.length) { para(w, "Unit prices", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 }); table(w, [{ head: "ITEM", width: 0.6 }, { head: "UNIT", width: 0.15 }, { head: "PRICE", width: 0.25, align: "right" }], pkg.unitPrices.map((u) => [u.description, u.unit, money(u.price)]), { size: 9.5 }); }
  para(w, "Addenda acknowledged", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 });
  if (pkg.addenda.length) table(w, [{ head: "ADDENDUM", width: 0.5 }, { head: "DATED", width: 0.5 }], pkg.addenda.map((a) => [a.no, a.date]), { size: 9.5 });
  else small(w, "None issued / none listed.");
  if (pkg.bond.percent) para(w, `Bid security: bid bond of ${pkg.bond.percent}% of the base bid (${money(pkg.bond.amount)})${pkg.bond.surety ? `, surety ${pkg.bond.surety}` : ""}.`, { size: 11 });
  if (pkg.exclusions) { para(w, "Qualifications and exclusions", { font: w.fonts.serifBold, size: 11.5, gapAfter: 2 }); para(w, pkg.exclusions, { size: 10.5 }); }
  signature(w, [{ label: "Bidder:", value: pkg.bidder.company, caption: "(Company)" }, { label: "By:", caption: "(Signature)" }, { label: "Name / title:", value: [pkg.bidder.signer, pkg.bidder.signerTitle].filter(Boolean).join(", "), caption: "(Printed)" }, { label: "Date:", caption: "" }]);
  if (pkg.lines.length) {
    title(w, "SCHEDULE OF VALUES", { size: 14 });
    small(w, `From ${pkg.priceSource}.`);
    table(w, [{ head: "ITEM", width: 0.52 }, { head: "QTY", width: 0.1, align: "right" }, { head: "UNIT PRICE", width: 0.18, align: "right" }, { head: "AMOUNT", width: 0.2, align: "right" }], [...pkg.lines.map((l) => [l.description, String(l.qty), money(l.unit), money(l.ext)]), ["Base bid (including tax as quoted)", "", "", money(pkg.baseBid)]], { size: 9 });
  }
  title(w, "BIDDER'S CHECKLIST", { size: 14 });
  small(w, "Check against the solicitation's own instructions to bidders; agencies differ.");
  table(w, [{ head: "", width: 0.08 }, { head: "ITEM", width: 0.92 }], pkg.checklist.map((c) => [c.done ? "[x]" : "[ ]", c.item]), { size: 10 });
  if (pkg.bid.noticeUrl) small(w, `Public notice: ${pkg.bid.noticeUrl}`);
  return finish(w);
}

export function registerBidxRoutes(router, { authenticate }) {
  async function prepare(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to build a bid from your PropX proposals." }, 401) };
    const b = await request.json().catch(() => ({}));
    let opp = null, prop = null;
    if (b.opportunityId) {
      try { opp = await env.DB.prepare("SELECT id, source, source_ref, title, agency, location, key_date, detail_url FROM opportunities WHERE id = ?").bind(String(b.opportunityId)).first(); } catch (_) { opp = null; }
      if (!opp) return { error: jsonResponse3({ success: false, message: "That HuntX notice was not found." }, 404) };
    }
    if (b.proposalId) {
      prop = await env.DB.prepare("SELECT id, quote_number, client_name, project_address, grand_total, line_item_snapshot FROM proposals WHERE id = ? AND user_id = ?").bind(String(b.proposalId), String(user.userId)).first();
      if (!prop) return { error: jsonResponse3({ success: false, message: "Choose one of your own PropX proposals." }, 404) };
    }
    return { user, pkg: bidPackage(opp, prop, b) };
  }
  router.post("/api/forms/bidx/preview", async (request, env) => {
    const p = await prepare(request, env); if (p.error) return p.error;
    return jsonResponse3({ success: true, package: p.pkg });
  });
  router.post("/api/forms/bidx/pdf", async (request, env) => {
    const p = await prepare(request, env); if (p.error) return p.error;
    if (!p.pkg.baseBid) return jsonResponse3({ success: false, message: "The bid has no amount: choose a PropX proposal or enter the base bid." }, 400);
    if (!(await outputAccess(env, p.user.userId, "bidx")).paid) return jsonResponse3(paymentRequired("The bid package PDF"), 402);
    const bytes = await bidPdf(p.pkg);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Bid-${(p.pkg.bid.reference || "package").replace(/[^A-Za-z0-9-]+/g, "-")}.pdf"`, "Cache-Control": "no-store" } });
  });
}
