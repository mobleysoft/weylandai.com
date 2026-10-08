// weyland-forms-worker/src/lib/pricing.js
//
// PriceX (2026-10-08): the list price of a hardware line from the price books
// WeylandAI holds (product_variants, imported from each maker's price book;
// source_catalogue_id names the book), and a whole SubX schedule priced at the
// sub's own multiplier. The old PriceX averaged list prices across a category
// ("exit devices, average $4,587"), which prices nothing a sub can bid.
//
// A line is priced only from a variant of the product the shared matcher found
// for it, chosen by the schedule's own catalogue number and finish:
//   exact     the variant's full model number is the schedule's (letters and
//             digits compared, so 4040XP-3049EDA = 4040XP 3049 EDA)
//   options   the variant's number is contained in the schedule's (the
//             schedule adds options the book prices separately)
//   closest   every letter/digit run of the schedule's number is in exactly one
//             of the book's numbers (4040XP EDA -> 4040XP-3049EDA when it is the only one)
// Otherwise the line is not priced, and the configurations the book does price are named.
// The finish must match when the schedule names one (626 = US26D handled by
// the BHMA/US table below, finish classes by finishScore); otherwise the variant's finish is shown.
// Nothing is priced from a different product, and every price says its book.

export const BHMA_US = { 605: "US3", 606: "US4", 611: "US9", 612: "US10", 613: "US10B", 618: "US14", 619: "US15", 622: "US19", 625: "US26", 626: "US26D", 629: "US32", 630: "US32D", 689: "ALUM", 690: "BRONZE", 693: "BLACK" };
const US_BHMA = Object.fromEntries(Object.entries(BHMA_US).map(([b, u]) => [u, b]));

export const compact = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** The BHMA code for a finish as a schedule writes it ("626", "US26D", "26D"), or the text. */
export function finishCode(f) {
  const t = String(f || "").toUpperCase().trim();
  if (!t) return null;
  if (/^\d{3}[A-Z]?$/.test(t)) return t.replace(/[A-Z]$/, "");
  const us = t.startsWith("US") ? t : "US" + t;
  return US_BHMA[us] || t;
}

// A price book may price a model by finish class written into the number
// ("4040XP-3049EDA [Powder Coat]", "[652 Plated]", "[Other Plated]", the LCN
// 2026 book) with no finish code on the row. BHMA 600 and 689-697 are primed,
// painted and powder-coated finishes; the rest are plated or natural metal.
const PAINTED = new Set(["600", "689", "690", "691", "692", "693", "694", "695", "696", "697"]);
const bracket = (v) => ((String(v.full_model_number || "").match(/\[([^\]]*)\]\s*$/) || [])[1] || "").trim();
/** The catalogue number of a variant, without its finish-class bracket. */
export const variantNumber = (v) => String(v.full_model_number || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
/** The finish a variant is priced in, as the book states it. */
export const variantFinish = (v) => String(v.finish_code || "").trim() || bracket(v) || null;

/** 2: the variant is priced in exactly this finish; 1: in this finish's class; 0: not this finish. */
export function finishScore(v, fin) {
  if (!fin) return 1;
  const own = finishCode(v.finish_code);
  if (own) return own === fin ? 2 : 0;
  const b = bracket(v);
  const code = b.match(/^(\d{3})\b/);
  if (code) return code[1] === fin ? 2 : 0;
  if (/powder|paint|prime|coat/i.test(b)) return PAINTED.has(fin) ? 1 : 0;
  if (/plated|metal/i.test(b)) return PAINTED.has(fin) ? 0 : 1;
  return 0;
}

/**
 * Pick the variant for a schedule line from a product's variants.
 * variants: [{ full_model_number, finish_code, list_price, source_catalogue_id }]
 * -> { variant, basis: "exact"|"options"|"closest", finishMatched, note }, or
 *    { variant: null, note, candidates } when the book has no price for that number, or null if nothing is priced.
 */
export function pickVariant(variants, scheduleModel, scheduleFinish) {
  const priced = (variants || []).filter((v) => Number(v.list_price) > 0);
  if (!priced.length) return null;
  const want = compact(scheduleModel);
  const fin = finishCode(scheduleFinish);
  const byNumber = new Map();
  for (const v of priced) { const k = compact(variantNumber(v)); if (k) { if (!byNumber.has(k)) byNumber.set(k, []); byNumber.get(k).push(v); } }
  let basis = null, number = null;
  if (byNumber.has(want)) { basis = "exact"; number = want; }
  if (!number) {
    // The longest book number the schedule's number contains (the schedule adds options).
    const inside = [...byNumber.keys()].filter((k) => k.length >= 4 && want.includes(k)).sort((a, b) => b.length - a.length);
    if (inside.length) { basis = "options"; number = inside[0]; }
  }
  if (!number) {
    // Every letter/digit run on the schedule appears in exactly one book number.
    const runs = (String(scheduleModel || "").toUpperCase().match(/[A-Z0-9]+/g) || []).filter((r) => r.length >= 2);
    const all = runs.length ? [...byNumber.keys()].filter((k) => runs.every((r) => k.includes(r))) : [];
    if (all.length === 1) { basis = "closest"; number = all[0]; }
    else {
      const names = (all.length ? all : []).slice(0, 6).map((k) => variantNumber(byNumber.get(k)[0]));
      return { variant: null, note: all.length ? `the book prices ${all.length} configurations matching ${scheduleModel} (${names.join(", ")}${all.length > 6 ? ", ..." : ""}); the schedule does not say which` : `the book lists no configuration matching ${scheduleModel}`, candidates: names };
    }
  }
  const rows = byNumber.get(number);
  const best = Math.max(...rows.map((v) => finishScore(v, fin)));
  const pool = best > 0 ? rows.filter((v) => finishScore(v, fin) === best) : rows;
  const v = cheapest(pool);
  const notes = [];
  if (basis === "options") notes.push("options on the schedule beyond " + variantNumber(v) + " are not priced");
  if (basis === "closest") notes.push("priced as " + variantNumber(v) + ", the only configuration in the book matching the schedule");
  if (!fin && new Set(rows.map(variantFinish)).size > 1) notes.push("no finish on the schedule; the lowest finish price is shown");
  return { variant: v, basis, finishMatched: best > 0, note: notes.join("; ") || null };
}
const cheapest = (list) => list.reduce((a, b) => (Number(b.list_price) < Number(a.list_price) ? b : a));

const r2 = (n) => Math.round(Number(n) * 100) / 100;

/** A priced line: list, net at the multiplier, extended for the quantity. */
export function priceLine({ qty = 1, list, multiplier = 1 }) {
  const m = Number(multiplier) > 0 && Number(multiplier) <= 2 ? Number(multiplier) : 1;
  const net = r2(Number(list) * m);
  return { list: r2(list), multiplier: m, net, extended: r2(net * (Number(qty) > 0 ? Number(qty) : 1)) };
}
