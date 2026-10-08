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
//   base      no option match: the product's least expensive variant in that
//             finish, labelled "base price, options not priced"
// The finish must match when the schedule names one (626 = US26D handled by
// the BHMA/US table below); otherwise the variant's finish is shown.
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

/**
 * Pick the variant for a schedule line from a product's variants.
 * variants: [{ full_model_number, finish_code, list_price, source_catalogue_id }]
 * -> { variant, basis: "exact"|"options"|"base", finishMatched, note } or null
 */
export function pickVariant(variants, scheduleModel, scheduleFinish) {
  const priced = (variants || []).filter((v) => Number(v.list_price) > 0);
  if (!priced.length) return null;
  const want = compact(scheduleModel);
  const fin = finishCode(scheduleFinish);
  const inFinish = (v) => !fin || finishCode(v.finish_code) === fin;
  const byFinish = priced.filter(inFinish);
  const pool = byFinish.length ? byFinish : priced;
  const finishMatched = !fin || byFinish.length > 0;
  const exact = pool.filter((v) => compact(v.full_model_number) === want);
  if (exact.length) return { variant: cheapest(exact), basis: "exact", finishMatched, note: null };
  // The longest variant number the schedule's number contains (most options matched).
  const contained = pool.filter((v) => { const c = compact(v.full_model_number); return c.length >= 3 && want.includes(c); });
  if (contained.length) {
    const longest = Math.max(...contained.map((v) => compact(v.full_model_number).length));
    const best = contained.filter((v) => compact(v.full_model_number).length === longest);
    return { variant: cheapest(best), basis: "options", finishMatched, note: "options on the schedule beyond " + cheapest(best).full_model_number + " are not priced" };
  }
  const base = cheapest(pool);
  return { variant: base, basis: "base", finishMatched, note: "base price (" + base.full_model_number + "); options not priced" };
}
const cheapest = (list) => list.reduce((a, b) => (Number(b.list_price) < Number(a.list_price) ? b : a));

const r2 = (n) => Math.round(Number(n) * 100) / 100;

/** A priced line: list, net at the multiplier, extended for the quantity. */
export function priceLine({ qty = 1, list, multiplier = 1 }) {
  const m = Number(multiplier) > 0 && Number(multiplier) <= 2 ? Number(multiplier) : 1;
  const net = r2(Number(list) * m);
  return { list: r2(list), multiplier: m, net, extended: r2(net * (Number(qty) > 0 ? Number(qty) : 1)) };
}
