// weyland-shared/page-citations.js
//
// The page a matched item is cited on, found the way SubX's submittal packet
// finds it (2026-10-09), shared so CutsheetX's MATCH form and paste, SubX's
// packet and CloseX's product data give one item one page:
//
//   1. the matcher's own pages (citedPagesFor): a filed price book's pinned
//      page, else the maker's catalogue page whose PDF is on file;
//   2. filedPageFor: the page of the filed price book (or spec/sell sheet)
//      that names the model, read from that very PDF (weyland-shared/filed-page.js);
//   3. variantPageFor: the page a price row for the item was imported from,
//      confirmed in the filed PDF (a book that prints 188SBK as "188S-BK", or
//      99-L-F as "[98/99] . L . F").
//
// Before this the packet carried steps 2 and 3 and CutsheetX cited the
// price-book row's title, so the same LCN 4040XP was p.41 of the LCN 4000
// catalogue in the packet and "pp.6-48 ... search this PDF" in CutsheetX.
//
// citationsFor ranks every page an item may be cited on for a reader:
// one specific page whose PDF is on file first; a run of more than three pages
// is never a citation; a page whose PDF is not on file comes after every page
// that opens; nothing is invented.

import { PACKET_MATCH_TYPES, parsePageHint, specificPageHint, unconfirmedPageHint } from "./product-database.js";
import { pageNamingInFiledPdf, scheduleTokens, makerFiledBooks, variantPagesFor, confirmedVariantPage, modelPattern } from "./filed-page.js";

/** A reading budget for filed books, one per request: { ms, spentMs, skipped, inflight }. Only
 *  time spent reading counts; `inflight` shares one read of a book between concurrent lookups. */
export function newReadBudget(ms) {
  return { ms, spentMs: 0, skipped: false, inflight: new Map() };
}
const leftOf = (budget) => budget.ms - budget.spentMs;
async function timed(budget, fn) {
  const t0 = Date.now();
  try { return await fn(); } finally { budget.spentMs += Date.now() - t0; }
}
const shortTitle = (t, fallback = "Price book") => String(t || fallback).split(" (")[0];
const compact = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** The spellings a filed book is searched for, in order: the schedule's own number when it
 *  extends the catalogue's model ("100S" for 100, "188SBK" for 188S-B: the more specific one),
 *  then the catalogue's model, then the schedule's search tokens (scheduleTokens, for a model too
 *  short to search, "99" -> "99L" from "PA-AX-99-L-F"). */
export function filedSearchModels(product, scheduleModel) {
  const p = product || {};
  const base = compact(p.model || p.base_model);
  const own = (String(scheduleModel || "").toUpperCase().match(/[A-Z0-9]+/g) || [])
    .filter((run) => base && run.length > base.length && run.startsWith(base) && modelPattern(run));
  return [...new Set([...own, p.model, p.base_model, ...scheduleTokens(scheduleModel)].filter(Boolean))];
}

/**
 * The page of a filed book naming the item: { r2Key, pageNum, title, sheetId? } or null.
 * For a model the catalogue does not list (m.reason model_not_in_catalogue), the schedule's
 * own number in the maker's filed price books. Sets budget.skipped when time ran out.
 */
export async function filedPageFor(env, m, budget, scheduleModel = "") {
  if (m && !m.matched && m.reason === "model_not_in_catalogue" && m.maker && m.maker.known) {
    for (const book of await makerFiledBooks(env, m.maker.name)) {
      for (const model of scheduleTokens(scheduleModel)) {
        const left = leftOf(budget);
        if (left < 3000) { budget.skipped = true; return null; }
        let hit = null;
        try { hit = await timed(budget, () => pageNamingInFiledPdf(env, book.r2Key, model, { budgetMs: left, inflight: budget.inflight || null })); } catch (_) { hit = null; }
        if (hit) return { r2Key: book.r2Key, pageNum: hit.pageNum, title: shortTitle(book.title), searched: model };
      }
    }
    return null;
  }
  if (!m || !m.matched || !PACKET_MATCH_TYPES.has(String(m.matchType)) || !(m.maker && m.maker.known)) return null;
  const sheet = (m.cutSheets || []).find((s) => s.r2Key && !s.pinnedPage);
  if (!sheet) return null;
  for (const model of filedSearchModels(m.product, scheduleModel)) {
    const left = leftOf(budget);
    if (left < 3000) { budget.skipped = true; return null; }
    let hit = null;
    try { hit = await timed(budget, () => pageNamingInFiledPdf(env, sheet.r2Key, model, { budgetMs: left, inflight: budget.inflight || null })); } catch (_) { hit = null; }
    if (hit) return { r2Key: sheet.r2Key, pageNum: hit.pageNum, title: shortTitle(sheet.title), sheetId: sheet.id || null, searched: model };
  }
  // A maker's spec, sell or data sheet filed for this product (Select's SL57 sheet; Schlage's ALX
  // sell sheet, which prints "53 Entrance", not ALX53): the page its catalogue title names, else
  // page 1, when the number is printed only in a drawing or as a function code.
  if (/\b(spec|sell|data) sheet\b/i.test(String(sheet.title || ""))) {
    const hint = parsePageHint(sheet.title);
    return { r2Key: sheet.r2Key, pageNum: (hint && hint.firstPage) || 1, title: shortTitle(sheet.title), sheetId: sheet.id || null };
  }
  return null;
}

/**
 * The page a price row for this item was imported from, confirmed in the filed PDF:
 * { r2Key, pageNum, title, number } or null.
 */
export async function variantPageFor(env, m, scheduleModel, budget) {
  if (!m || !m.maker || !m.maker.known) return null;
  const firm = m.matched && PACKET_MATCH_TYPES.has(String(m.matchType)) && m.product && m.product.id;
  if (m.matched && !firm) return null;
  const left = leftOf(budget);
  if (left < 3000) { budget.skipped = true; return null; }
  let variants = [];
  try {
    variants = await variantPagesFor(env, firm ? { productId: m.product.id, productModel: m.product.model, scheduleModel } : { makerName: m.maker.name, scheduleModel });
  } catch (_) { variants = []; }
  if (!variants.length) return null;
  try { return await timed(budget, () => confirmedVariantPage(env, variants, { budgetMs: left, inflight: budget.inflight || null })); } catch (_) { return null; }
}

// A sheet's page range as the reader gets it: "16", "42-44"; null when the title names no page,
// "p.None", or a run of more than three pages (that is a book, not a citation). A price-book
// row's page from the edition originally catalogued is unconfirmed; a catalogue or sheet title
// naming its page is not.
const specificHint = (sheet) => specificPageHint(sheet && sheet.title);
const unconfirmedHint = unconfirmedPageHint;

function sheetPdfUrl(sheetId, pageNum) {
  return "/api/cut-sheets/sheet/" + encodeURIComponent(sheetId) + "/pdf" + (pageNum ? "#page=" + pageNum : "");
}

// The id of a product_documents row serving this R2 object, for the citation link.
async function documentIdForKey(env, m, r2Key) {
  const own = (m && m.cutSheets || []).find((s) => s.r2Key === r2Key && s.id);
  if (own) return own.id;
  try {
    const row = await env.DB.prepare("SELECT id FROM product_documents WHERE r2_object_key = ? AND active = 1 ORDER BY id LIMIT 1").bind(r2Key).first();
    return row && row.id ? row.id : null;
  } catch (_) {
    return null;
  }
}

/**
 * Every page a match may be cited on, best first:
 *   [{ kind, title, page, url, pdfAvailable, how }]
 *   kind: price_book (a filed book's page) | cut_sheet (a filed sheet's page) | catalogue_page
 *   how:  pinned | catalogue | sheet | filed_pdf | price_row | price_book_hint | text_only
 * opts: { budget (newReadBudget), scheduleModel (the number as the line wrote it), limit }.
 * Filed books are read only when no page that opens has been found.
 */
export async function citationsFor(env, m, opts = {}) {
  const out = [];
  if (!m) return out;
  const limit = opts.limit || 4;
  const budget = opts.budget || newReadBudget(15000);
  const scheduleModel = opts.scheduleModel || (m.component && (m.component.modelFull || m.component.model)) || "";
  const seen = new Set();
  const push = (c) => {
    const k = c.title + "#" + c.page + "#" + (c.url || "").split("?")[0].split("#")[0];
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  const sheets = (m.matched && m.cutSheets) || [];
  const pages = (m.matched && m.cataloguePages) || [];
  // 1. A filed book's pinned page (its index is that very file).
  for (const s of sheets) {
    if (s.pinnedPage && s.pageUrl) push({ kind: "price_book", title: shortTitle(s.title), page: String(s.pinnedPage), url: s.pageUrl, pdfAvailable: true, how: "pinned" });
  }
  // 2. A sheet whose own title names its page (a catalogue or spec sheet filed at that page).
  for (const s of sheets) {
    const h = specificHint(s);
    if (h && s.pageUrl && !s.pinnedPage && !unconfirmedHint(s.title)) push({ kind: "cut_sheet", title: shortTitle(s.title, "Cut sheet"), page: h.hint, url: s.pageUrl, pdfAvailable: true, how: "sheet" });
  }
  // 3. The maker's catalogue pages whose PDF is on file (never a contents page).
  for (const cp of pages) {
    if (cp.pdfAvailable && cp.pageUrl && !cp.contentsPage) push({ kind: "catalogue_page", title: cp.title, page: String(cp.pageNum), url: cp.pageUrl, pdfAvailable: true, how: "catalogue" });
  }
  // 4. Nothing that opens yet: the filed book's own page naming the item, else its price row's page.
  if (!out.length && env) {
    let filed = null;
    try { filed = (await filedPageFor(env, m, budget, scheduleModel)) || (await variantPageFor(env, m, scheduleModel, budget)); } catch (_) { filed = null; }
    if (filed) {
      const id = filed.sheetId || (await documentIdForKey(env, m, filed.r2Key));
      push({
        kind: "price_book",
        title: filed.title,
        page: String(filed.pageNum),
        url: id ? sheetPdfUrl(id, filed.pageNum) : null,
        pdfAvailable: !!id,
        how: filed.number ? "price_row" : "filed_pdf",
        ...(filed.number ? { number: filed.number } : {}),
      });
    }
  }
  // 5. A price-book row's page from the edition originally catalogued: one page or a run of three.
  for (const s of sheets) {
    const h = specificHint(s);
    if (h && s.pageUrl && !s.pinnedPage && unconfirmedHint(s.title)) push({ kind: "price_book", title: shortTitle(s.title), page: h.hint, url: s.pageUrl, pdfAvailable: true, how: "price_book_hint" });
  }
  // 6. Pages whose text is indexed but whose PDF is not on file: listed, after every page that opens.
  for (const cp of pages) {
    if (!cp.pdfAvailable && !cp.contentsPage) push({ kind: "catalogue_page", title: cp.title, page: String(cp.pageNum), url: null, pdfAvailable: false, how: "text_only" });
  }
  const openable = out.filter((c) => c.url);
  return openable.concat(out.filter((c) => !c.url)).slice(0, limit);
}
