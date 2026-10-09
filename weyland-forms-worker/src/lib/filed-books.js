// weyland-forms-worker/src/lib/filed-books.js
//
// Prices read from a maker's own filed price book where the catalogue's imported
// rows fall short (2026-10-09). The Ives 2026 import holds one primed (600) price
// per hinge model; the book itself prices every size and finish, and prices 8400
// protection plates by a stated rule. weyland-shared/price-books/ives-2026.js is
// extracted from the filed PDF by extract-ives-2026.py, every row citing its page.
//   hinges   model + size + finish -> list (Ives Price Book 17, pp.9-28)
//   plates   8400/8401/8402: the stocked table (p.92) when the size and finish are
//            stocked, otherwise the book's rule (p.93): the hundred-square-inch size
//            from its chart, rounded up to the next size shown, times the rate for
//            the plate's height band and finish; options from p.94 added.
//            "10 x 2 LDW" (less door width) is sized from the opening's door width.

import IVES from "../../../weyland-shared/price-books/ives-2026.js";
import { compact, finishCode, pickVariant } from "./pricing.js";

const BOOK_ID = "b14117b49c7deb52";
const EFFECTIVE = IVES.book.effective;
const book = (page) => ({ id: BOOK_ID, name: `${IVES.book.title} p.${page}` });

export const isIves = (maker) => /\bives\b/i.test(String(maker || ""));

/** "4 1/2" and "4-1/2" -> "4.5"; "1/2" alone -> ".5". */
export function decimalSizes(s) {
  return String(s || "")
    .replace(/(\d+)[\s-]+(\d)\/(\d)/g, (_, w, n, d) => String(Number(w) + Number(n) / Number(d)))
    .replace(/(^|[^\d.])(\d)\/(\d)/g, (_, pre, n, d) => pre + String(Number(n) / Number(d)));
}

const HINGE_MODELS = [...new Set(IVES.hinges.map((h) => h.model))].sort((a, b) => compact(b).length - compact(a).length);

/** An Ives butt hinge from the book's grid, or null when the number is not one of its models. */
export function ivesHinge(model, finish) {
  const text = decimalSizes(model);
  const want = compact(text);
  const name = HINGE_MODELS.find((m) => want.startsWith(compact(m)));
  if (!name) return null;
  const rows = IVES.hinges.filter((h) => h.model === name).map((h) => ({ full_model_number: `${h.model} ${h.size}`, finish_code: h.finish, list_price: h.list, page: h.page, substrate: h.substrate, label: h.label }));
  const pick = pickVariant(rows, text, finish);
  if (!pick || !pick.variant) {
    return { priced: false, product: { manufacturer: "Ives", model: name }, reason: `Ives ${name}: ${pick ? pick.note : "not priced"} (${IVES.book.title}).` };
  }
  const v = pick.variant;
  const notes = [];
  if (pick.note) notes.push(pick.note);
  if (!pick.finishMatched) notes.push(`no price in finish ${finish}; priced in ${v.finish_code}`);
  const other = rows.find((r) => r !== v && r.full_model_number === v.full_model_number && r.finish_code === v.finish_code && r.substrate !== v.substrate);
  if (other) notes.push(`${v.substrate === "steel" ? "steel-based" : "brass/stainless"}; the ${other.substrate === "steel" ? "steel-based" : "brass/stainless"} hinge in ${other.label} lists $${other.list_price.toFixed(2)}`);
  return {
    priced: true,
    product: { manufacturer: "Ives", model: name },
    variant: { number: v.full_model_number, finish: v.finish_code, list: v.list_price, effective: EFFECTIVE },
    basis: pick.basis, finishMatched: pick.finishMatched,
    book: book(v.page),
    note: notes.join("; ") || null,
  };
}

const P = IVES.plates8400;
const BAND = { under8: 'under 8"', "8to16": '8" to 16"', "16to36": 'over 16" to 36"', "36to48": 'over 36" to 48"' };
const r2 = (n) => Math.round(n * 100) / 100;

/** The book's price for a plate size and finish (p.92 stocked, else the p.93 rule); null if the finish is not in the book. */
export function platePrice(h, w, fin) {
  const rate = P.ratesPerHundredSqIn[fin];
  if (!rate) return null;
  if (h > rate.maxHeight || w > rate.maxWidth) return { error: `larger than the book's largest ${fin} plate (${rate.maxHeight}" x ${rate.maxWidth}")` };
  const stocked = P.stocked.find((s) => s.finish === fin && s.height === h && s.width === w);
  if (stocked) return { list: stocked.list, basis: "exact", number: stocked.number, page: 92, note: null };
  const H = P.chartHeights.find((x) => x >= h), W = P.chartWidths.find((x) => x >= w);
  const band = h < 8 ? "under8" : h <= 16 ? "8to16" : h <= 36 ? "16to36" : "36to48";
  if (H == null || W == null || rate[band] == null) return { error: `the book has no ${fin} price for a ${h}" x ${w}" plate` };
  const sq = r2((H * W) / 100);
  return { list: r2(sq * rate[band]), basis: "book rule", number: null, page: P.ratesPage, note: `p.${P.ratesPage} rule: ${H}" x ${W}" = ${sq} hundred sq in x $${rate[band].toFixed(2)} (${BAND[band]}, ${fin})` };
}

// p.94 options (list add per plate). B-CS is standard.
const OPTIONS = { "TK-TX": () => 27, "B-NH": () => 53, "B-NHA": (h) => (h <= 12 ? 53 : 108) };

/**
 * An Ives 8400/8401/8402 protection plate, or null when the number is not one.
 * doorWidth (inches) sizes a "LDW" (less door width) plate.
 */
export function ivesPlate(model, finish, doorWidth) {
  const text = decimalSizes(model).toUpperCase();
  const m = text.match(/\b(840[02])\b/);
  if (!m) return null;
  const product = { manufacturer: "Ives", model: m[1] };
  const size = text.match(/(\d+(?:\.\d+)?)\s*"?\s*X\s*(\d+(?:\.\d+)?)\s*"?\s*(LDW)?/);
  if (!size) return { priced: false, product, reason: `Ives ${m[1]}: the schedule gives no plate size.` };
  const h = Number(size[1]);
  let w = Number(size[2]);
  if (size[3]) {
    if (!(Number(doorWidth) > 0)) return { priced: false, product, reason: `Ives ${m[1]} ${h}" x door width less ${w}": no door width was read for this opening.` };
    w = Number(doorWidth) - w;
  }
  w = Math.ceil(w * 2) / 2; // plates are ordered in 1/2" increments (p.93)
  const fin = finishCode(finish);
  const p = platePrice(h, w, fin);
  if (!p) return { priced: false, product, reason: `Ives ${m[1]} is not priced in finish ${finish || "(none given)"}.` };
  if (p.error) return { priced: false, product, reason: `Ives ${m[1]} ${h}" x ${w}" ${fin}: ${p.error}.` };
  let list = p.list;
  const notes = p.note ? [p.note] : [];
  if (m[1] === "8402") { list += 39; notes.push("8402 UL label kick plate +$39.00 (p.94)"); }
  const tokens = text.slice(size.index + size[0].length).split(/[\s,]+/).filter(Boolean);
  const unpriced = [];
  for (const t of tokens) {
    if (t === "B-CS") continue;
    if (OPTIONS[t]) { const add = OPTIONS[t](h); list += add; notes.push(`${t} +$${add.toFixed(2)} (p.94)`); } else unpriced.push(t);
  }
  if (unpriced.length) notes.push(`options ${unpriced.join(" ")} not priced`);
  if (size[3]) notes.push(`${h}" x ${w}" from a ${doorWidth}" door less ${size[2]}"`);
  return {
    priced: true, product,
    variant: { number: `${m[1]} ${h}x${w}${p.number ? " (" + p.number + ")" : ""}`, finish: fin, list: r2(list), effective: EFFECTIVE },
    basis: p.basis, finishMatched: true,
    book: book(p.page),
    note: notes.join("; ") || null,
  };
}

/** The filed book's price for an item, or null when the book does not cover it. */
export function filedBookPrice({ maker, model, finish, doorWidth }) {
  if (!isIves(maker) || !model) return null;
  return ivesPlate(model, finish, doorWidth) || ivesHinge(model, finish);
}

/** True when the item is sized from the opening's door width. */
export const sizedByDoor = ({ maker, model }) => isIves(maker) && /\bLDW\b/i.test(String(model || "")) && /\b840[02]\b/.test(String(model || ""));
