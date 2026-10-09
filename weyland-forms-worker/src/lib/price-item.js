// weyland-forms-worker/src/lib/price-item.js
//
// One hardware item priced from the makers' books (PriceX), split out of routes/pricex.js on
// 2026-10-09 so PropX can price a set's unpriced items with the same code: the route file imports
// CloseX (and with it pdf-lib), which the PropX worker's build cannot resolve.
import { matchComponentToCutSheets, PACKET_MATCH_TYPES } from "../../../weyland-shared/product-database.js";
import { pickVariant, finishCode, variantNumber, variantFinish, lengthFeet, compact } from "./pricing.js";
import { filedBookPrice, sizedByDoor } from "./filed-books.js";

export const makerKey = (s) => String(s || "").trim().toLowerCase();

/** The price-book variants of a catalogued product, with the book each came from. */
export async function variantsOf(env, productId) {
  try {
    return (await env.DB.prepare(
      `SELECT v.full_model_number, v.finish_code, v.list_price, v.price_effective_date, v.source_catalogue_id,
              c.title AS book_title, c.version AS book_version
       FROM product_variants v LEFT JOIN catalogues c ON c.catalogue_id = v.source_catalogue_id
       WHERE v.product_id = ? AND v.list_price > 0 AND COALESCE(v.active, 1) = 1 LIMIT 5000`
    ).bind(String(productId)).all()).results || [];
  } catch (_) {
    return [];
  }
}

/** A known maker's priced variants whose number begins the schedule's number, for a model
 *  the catalogue files under another product name (Zero "188SBK" is a variant of "188S-B"). */
export async function makerVariants(env, makerName, model) {
  const want = compact(model);
  const run = (String(model || "").toUpperCase().match(/[A-Z0-9]+/) || [""])[0];
  if (!makerName || run.length < 3 || want.length < 4) return [];
  try {
    const rows = (await env.DB.prepare(
      `SELECT v.full_model_number, v.finish_code, v.list_price, v.price_effective_date, v.source_catalogue_id,
              c.title AS book_title, c.version AS book_version
       FROM product_variants v JOIN products p ON p.id = v.product_id JOIN manufacturers mf ON mf.id = p.manufacturer_id
       LEFT JOIN catalogues c ON c.catalogue_id = v.source_catalogue_id
       WHERE lower(mf.name) = lower(?) AND v.full_model_number LIKE ? AND v.list_price > 0 AND COALESCE(v.active, 1) = 1 LIMIT 2000`
    ).bind(String(makerName), run.slice(0, 4) + "%").all()).results || [];
    return rows.filter((v) => { const k = compact(variantNumber(v)); return k.length >= 4 && want.startsWith(k); });
  } catch (_) {
    return [];
  }
}

/** A seal or gasket the book sells by length: the shortest length covering the opening's
 *  head and both jambs (2 x height + width). */
export function pickLength(vs, model, door) {
  const want = compact(model);
  const numbers = [...new Set(vs.filter((v) => lengthFeet(v) != null).map((v) => compact(variantNumber(v))))].filter((k) => want.startsWith(k)).sort((a, b) => b.length - a.length);
  if (!numbers.length) return null;
  const rows = vs.filter((v) => lengthFeet(v) != null && compact(variantNumber(v)) === numbers[0]).sort((a, b) => lengthFeet(a) - lengthFeet(b));
  const basis = numbers[0] === want ? "exact" : "options";
  if (!door || !(door.width > 0) || !(door.height > 0)) return { needsDoor: true, rows, basis };
  const need = (2 * door.height + door.width) / 12;
  const v = rows.find((r) => lengthFeet(r) >= need);
  if (!v) return { error: `the head and jambs need ${need.toFixed(1)} ft; the longest length in the book is ${lengthFeet(rows[rows.length - 1])}'` };
  return { variant: v, basis, note: `one ${lengthFeet(v)}' length for the head and jambs of a ${door.width}" x ${door.height}" opening (${need.toFixed(1)} ft)` };
}

export const bookName = (v) => [v.book_title, v.book_version].filter(Boolean).join(" ") || (v.source_catalogue_id ? "price book " + v.source_catalogue_id : "price book on file");

/**
 * One item priced: { priced: true, product, variant, basis, finishMatched, note, book } or
 * { priced: false, reason }. caches: { match: Map, variants: Map } shared across a schedule.
 */
export async function priceItem(env, { maker, model, finish, door }, match = matchComponentToCutSheets, caches = { match: new Map(), variants: new Map() }) {
  if (!model) return { priced: false, reason: "No catalogue number on the schedule." };
  // A maker's filed book read directly (lib/filed-books.js) where it covers the item.
  const filed = filedBookPrice({ maker, model, finish, doorWidth: door && door.width });
  if (filed) return filed;
  const mk = makerKey(maker) + "|" + String(model).toUpperCase();
  let m = caches.match.get(mk);
  if (m === undefined) {
    try { m = await match({ manufacturer: maker || "", model }, env); } catch (_) { m = null; }
    caches.match.set(mk, m);
  }
  let product = m && m.matched && PACKET_MATCH_TYPES.has(String(m.matchType)) && m.product && m.product.id ? m.product : null;
  let vs = null;
  if (product) {
    vs = caches.variants.get(product.id);
    if (!vs) { vs = await variantsOf(env, product.id); caches.variants.set(product.id, vs); }
  } else if (m && m.maker && m.maker.known && m.maker.name) {
    const key = "maker:" + makerKey(m.maker.name) + "|" + compact(model);
    vs = caches.variants.get(key);
    if (!vs) { vs = await makerVariants(env, m.maker.name, model); caches.variants.set(key, vs); }
    if (vs.length) product = { manufacturer: m.maker.name, model: variantNumber(vs[0]) };
  }
  if (product && vs && vs.length) {
    const len = pickLength(vs, model, door);
    if (len && len.needsDoor) return { priced: false, needsDoor: true, product, reason: `${product.manufacturer} ${variantNumber(len.rows[0])} is priced by length; no door size was read for this opening.` };
    if (len && len.error) return { priced: false, product, reason: `${product.manufacturer} ${variantNumber(len.rows ? len.rows[0] : vs[0])}: ${len.error}.` };
    if (len && len.variant) {
      const v = len.variant;
      return {
        priced: true, product: { manufacturer: product.manufacturer, model: product.model },
        variant: { number: `${variantNumber(v)} ${lengthFeet(v)}'`, finish: variantFinish(v), list: Number(v.list_price), effective: v.price_effective_date || null },
        basis: len.basis, finishMatched: true, book: { id: v.source_catalogue_id || null, name: bookName(v) },
        note: [len.basis === "options" ? "options on the schedule beyond " + variantNumber(v) + " are not priced" : null, len.note].filter(Boolean).join("; "),
      };
    }
  }
  if (!product) {
    const why = m && m.maker && m.maker.typed && !m.maker.known ? `${maker} is not a maker in the catalogue.`
      : m && m.reasonText ? m.reasonText
      : maker ? `${maker} ${model} is not in the catalogue.` : `No manufacturer named for ${model}.`;
    return { priced: false, reason: why };
  }
  m = { ...m, product };
  const pick = pickVariant(vs, model, finish);
  if (!pick) return { priced: false, product: m.product, reason: `No price book on file prices ${m.product.manufacturer} ${m.product.model}.` };
  if (!pick.variant) return { priced: false, product: m.product, candidates: pick.candidates, reason: `${m.product.manufacturer} ${m.product.model}: ${pick.note}.`, book: vs[0] ? { id: vs[0].source_catalogue_id || null, name: bookName(vs[0]) } : null };
  const v = pick.variant;
  const notes = [];
  if (pick.note) notes.push(pick.note);
  if (!pick.finishMatched) notes.push(`no price in finish ${finish}; priced in ${variantFinish(v) || "the book's only finish"}`);
  return {
    priced: true,
    product: { manufacturer: m.product.manufacturer, model: m.product.model },
    variant: { number: variantNumber(v), finish: variantFinish(v), list: Number(v.list_price), effective: v.price_effective_date || null },
    basis: pick.basis, finishMatched: pick.finishMatched,
    book: { id: v.source_catalogue_id || null, name: bookName(v) },
    note: notes.join("; ") || null,
  };
}

