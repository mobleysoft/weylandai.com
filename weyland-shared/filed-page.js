// weyland-shared/filed-page.js
//
// The page of a FILED price book that names a model, read from that very PDF
// (2026-10-08). The matcher pins a price-book page only when the book's text
// index was built from the file in R2 (product-database.js pinPriceBookPage);
// when the index is another edition the page number could be wrong, so the
// packet listed the item as "page not pinned". Live on Berryessa that was 5 of
// 11 items (Von Duprin, LCN, Zero International price books are on file).
//
// Here the filed PDF's own text is read (weyland-ocr-worker /extract-text:
// text layer first, OCR only for a page without one), cached in R2 next to
// the book, and searched for the model as a whole token. The page found is in
// the file that will be cut, so it cannot be another edition's page.

const WINDOW_PAGES = 150;
const MAX_PAGES = 1500;

export function filedTextKey(r2Key) {
  return "cut-sheet-text/" + String(r2Key).replace(/[^A-Za-z0-9/._-]/g, "_") + ".pages.json";
}

/** A regex for the model as a token: its letter/digit runs in order, with an optional
 *  space, hyphen or slash between runs; not preceded by a letter or digit, not followed
 *  by a digit (4040XP finds "4040XP" and "4040XP-EDA", 9927 does not find "1,992.70"). */
export function modelPattern(model) {
  const runs = String(model || "").toUpperCase().match(/[A-Z0-9]+/g) || [];
  const joined = runs.join("");
  if (joined.length < 3 || !/\d/.test(joined)) return null;
  return new RegExp("(?<![A-Z0-9])" + runs.join("[\\s\\-/.]?") + "(?![0-9])", "g");
}

// A contents or index page names every model once, with dot leaders; it is never the cited page.
const isContents = (t) => /TABLE OF CONTENTS|^\s*CONTENTS\b|\bINDEX\b/im.test(t) || (t.match(/\.{5,}/g) || []).length >= 6;

/** The best page for the model in a list of { page, text }: most mentions, earliest on a tie. */
export function bestPageFor(pages, model) {
  const re = modelPattern(model);
  if (!re) return null;
  let best = null;
  for (const p of pages || []) {
    const text = String(p.text || "").toUpperCase();
    const n = (text.match(re) || []).length;
    if (!n || isContents(text)) continue;
    if (!best || n > best.mentions) best = { pageNum: p.page, mentions: n };
  }
  return best;
}

/** The filed PDF's pages as text, from the R2 cache or the OCR worker; null if unreadable. */
export async function filedPdfPages(env, r2Key, { budgetMs = 15000 } = {}) {
  if (!env || !env.UPLOADS || !r2Key) return null;
  const cacheKey = filedTextKey(r2Key);
  try {
    const cached = await env.UPLOADS.get(cacheKey);
    if (cached) return await cached.json();
  } catch (_) { /* read it again */ }
  if (!env.OCR_SERVICE) return null;
  const obj = await env.UPLOADS.get(r2Key);
  if (!obj) return null;
  const bytes = await obj.arrayBuffer();
  const started = Date.now();
  const pages = [];
  let next = 1;
  for (;;) {
    if (Date.now() - started > budgetMs) return null; // not cached: the next build carries on
    const res = await env.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Start-Page": String(next), "X-Total-Pages": String(WINDOW_PAGES), "X-Max-Ocr-Pages": "1", "X-Max-Document-Pages": String(MAX_PAGES) },
      body: bytes,
    });
    if (!res.ok) return null;
    const data = await res.json();
    for (const p of data.pages || []) pages.push({ page: p.page, text: p.text || "" });
    if (!data.hasMore || !data.nextPage) break;
    next = data.nextPage;
  }
  try {
    await env.UPLOADS.put(cacheKey, JSON.stringify(pages), { httpMetadata: { contentType: "application/json" }, customMetadata: { source: r2Key, readAt: new Date().toISOString() } });
  } catch (_) { /* the answer still stands */ }
  return pages;
}

/** { pageNum, mentions } of the filed PDF's page naming the model, or null. */
export async function pageNamingInFiledPdf(env, r2Key, model, opts = {}) {
  if (!modelPattern(model)) return null;
  const pages = await filedPdfPages(env, r2Key, opts);
  return pages ? bestPageFor(pages, model) : null;
}

/** Search tokens from the schedule's own catalogue number, most specific first, for a
 *  product whose catalogue model is too short to search ("99"): a numeric run joined to
 *  the option letters after it ("9927-EO" -> 9927EO, "99-L" -> 99L), then numeric runs of
 *  three or more characters (9927). Prefixes such as PA-AX and runs with one digit are skipped. */
export function scheduleTokens(model) {
  const runs = String(model || "").toUpperCase().match(/[A-Z0-9]+/g) || [];
  const joined = [], single = [];
  runs.forEach((r, i) => {
    if (!/^\d{2,}[A-Z]*$/.test(r)) return;
    const next = runs[i + 1];
    if (next && /^[A-Z]{1,3}$/.test(next)) joined.push(r + next);
    if (r.length >= 3) single.push(r);
  });
  return [...new Set([...joined, ...single])].filter((t) => modelPattern(t));
}

/** The maker's filed price books in R2 ({ r2Key, title }), for a model the catalogue does
 *  not list: the schedule's number may still be printed in the maker's own book. */
export async function makerFiledBooks(env, makerName, limit = 3) {
  if (!env || !env.DB || !makerName) return [];
  try {
    const rows = (await env.DB.prepare(
      `SELECT d.r2_object_key AS r2Key, MIN(d.document_title) AS title FROM product_documents d
       JOIN products p ON p.id = d.product_id JOIN manufacturers m ON p.manufacturer_id = m.id
       WHERE lower(m.name) = lower(?) AND d.document_type = 'cut_sheet' AND d.active = 1 AND d.r2_object_key IS NOT NULL
       GROUP BY d.r2_object_key LIMIT ?`
    ).bind(String(makerName), limit).all()).results || [];
    return rows.filter((r) => r.r2Key);
  } catch (_) {
    return [];
  }
}

// The page a price-book row was imported from (product_variants.catalog_page), checked in the
// filed PDF (2026-10-09). A schedule number the book prints in its own spelling ("188SBK" is
// "188S-BK") or as a grid ("[98/99] . L . F" for 99-L-F) is never found by searching the
// schedule's spelling; the variant whose number the schedule's contains carries its page. The
// page counts only if that very page shows the variant's number as the book spells it, or its
// list price, so an index from another edition cannot put a wrong page in the packet.
const compactNo = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const bookNumber = (n) => String(n || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
const priceStrings = (p) => {
  const n = Number(p);
  if (!(n > 0)) return [];
  const whole = Number.isInteger(n) ? n.toLocaleString("en-US") : null;
  return [n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), whole && "$" + whole].filter(Boolean);
};

/** The variants (book number, list price, catalog page, filed PDF) whose number the schedule's
 *  number contains: of the matched product, else of the maker by the number's first characters. */
export async function variantPagesFor(env, { productId = null, makerName = null, scheduleModel }) {
  if (!env || !env.DB || !scheduleModel) return [];
  const want = compactNo(scheduleModel);
  const base = `SELECT v.full_model_number, v.list_price, v.catalog_page, d.r2_object_key AS r2Key, d.document_title AS title
    FROM product_variants v JOIN product_documents d ON d.product_id = v.product_id AND d.document_type = 'cut_sheet' AND d.active = 1 AND d.r2_object_key IS NOT NULL`;
  let rows = [];
  try {
    if (productId) {
      rows = (await env.DB.prepare(base + " WHERE v.product_id = ? AND v.catalog_page IS NOT NULL AND v.list_price > 0 LIMIT 3000").bind(String(productId)).all()).results || [];
    } else if (makerName) {
      const run = (String(scheduleModel).toUpperCase().match(/[A-Z0-9]+/) || [""])[0];
      if (run.length < 3) return [];
      rows = (await env.DB.prepare(base + ` JOIN products p ON p.id = v.product_id JOIN manufacturers mf ON mf.id = p.manufacturer_id
        WHERE lower(mf.name) = lower(?) AND v.full_model_number LIKE ? AND v.catalog_page IS NOT NULL AND v.list_price > 0 LIMIT 3000`).bind(String(makerName), run.slice(0, 4) + "%").all()).results || [];
    }
  } catch (_) {
    return [];
  }
  const hits = rows.map((r) => ({ ...r, number: bookNumber(r.full_model_number), pageNum: parseInt(r.catalog_page, 10) }))
    .filter((r) => { const k = compactNo(r.number); return r.pageNum > 0 && k.length >= 3 && (productId ? want.includes(k) : want.startsWith(k)); });
  const longest = Math.max(0, ...hits.map((r) => compactNo(r.number).length));
  return hits.filter((r) => compactNo(r.number).length === longest);
}

/** { r2Key, pageNum, title, number } of a variant's page that the filed PDF itself confirms, or null. */
export async function confirmedVariantPage(env, variants, { budgetMs = 15000 } = {}) {
  const started = Date.now();
  const seen = new Set();
  for (const v of variants) {
    const k = v.r2Key + "#" + v.pageNum;
    if (seen.has(k)) continue;
    seen.add(k);
    const left = budgetMs - (Date.now() - started);
    if (left < 2000) return null;
    const pages = await filedPdfPages(env, v.r2Key, { budgetMs: left });
    if (!pages) continue;
    const page = pages.find((p) => p.page === v.pageNum);
    if (!page) continue;
    const text = String(page.text || "");
    const re = modelPattern(v.number);
    const named = re ? re.test(text.toUpperCase()) : false;
    const priced = priceStrings(v.list_price).some((s) => text.includes(s));
    if (named || priced) return { r2Key: v.r2Key, pageNum: v.pageNum, title: String(v.title || "Price book").split(" (")[0], number: v.number };
  }
  return null;
}
