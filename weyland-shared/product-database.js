// weyland-shared/product-database.js
//
// THE matcher (2026-10-08): one module, imported by weyland-cutsheetx-worker
// (the homepage paste, POST /api/cut-sheets/match and /match-batch, the
// Finder) and by weyland-subx-worker (the submittal packet) through
// ../../weyland-shared/product-database.js, the way security-headers.js is
// shared. Before this each worker carried its own copy: the cutsheetx copy
// labelled another maker's product "high, exact" ("Ives 8200" came back as a
// Sargent lock, "Ives 8302" as a Zero seal) and the SubX copy was the older
// matcher with a category guess, so a fix landed twice or not at all.
//
// What a line gets, in order (matchProductFromDb):
//   maker named and in the catalogue (makers.js resolves codes, names, slugs,
//   aliases):
//     exact        the catalogue number as written (the rest of the line, then
//                  without a finish tail, then the model token) under that maker
//     base_model   the model with its option suffix dropped: ALX53R-RHO-626 ->
//                  ALX53, 4041XP -> 4041, 896ADJ -> 896
//     variant      the catalogue lists the model with a suffix after a
//                  separator: 8302 -> 8302-0
//     series       a digit run the maker lists as a series: RX-QEL98L -> 98,
//                  9927 -> 99
//     partial      a prefix of the model, under that maker (medium)
//     and never another maker's product. A maker the catalogue lacks (Select
//     Hinges, dormakaba, RCI ...) is a miss that says so.
//   maker given but not one we can name ("Royal 111", "Hardware Pack SLSS2"):
//     the word may be part of the model: exact, any maker; else exact on the
//     rest at medium, labelled exact_model_unknown_manufacturer; no prefix.
//   no maker: exact, any maker; then a prefix of four characters or more
//     (never a bare number of four digits or fewer), low.
// A finish code (626, US26D, 630 ...) is never a product. A product from
// another trade comes back with matchType + "_other_trade", medium at most.
// When a product has no row but the maker's own catalogue pages name the
// model, matchComponentToCutSheets answers with those pages (matchType
// catalogue_page, medium) instead of nothing.
//
// Citations: a filed price book (product_documents) with the page the model
// is on when that book's text was indexed from the file in R2 (pinnedPage),
// else the catalogue pages that name the model, the product's own page before
// a contents page (bm25 ranking, contents-page penalty). Nothing here invents
// a page.

import { resolveCatalogueKey } from "./catalogue-storage.js";
import { getMakerIndex, resolveMaker, isFinishOnly, normalizeMaker } from "./makers.js";
import { PRODUCT_DATABASE, validateProductDatabase, findProductMatch, enrichComponent } from "./product-reference.js";

export { PRODUCT_DATABASE, validateProductDatabase, findProductMatch, enrichComponent };

/** Names, slugs, aliases and maker codes a pasted line may start with (for the spec parser). */
export async function getManufacturerNames(env2) {
  const index = await getMakerIndex(env2);
  return index.names;
}

// Does the token look like a catalogue model number rather than a word? Digits, or a
// letters-separator-alphanumerics shape ("SL-SQ24", "PVPART.1365" both have digits anyway).
function looksLikeModel(modelSearch) {
  return /\d/.test(modelSearch) || /^[A-Z]{2,}[-\/.][A-Z0-9]+$/.test(modelSearch);
}

// A finish or qualifier token at the end of a line ("... 626", "... US26D", "... LH").
const FINISH_TAIL_RE = /\s+(?:US\d{1,2}[A-Z]?|\d{3}[A-Z]?|[A-Z]{2,3}\d{0,2})$/;

// s, then s without its trailing finish/qualifier token when it has one.
function withFinishTrimmed(s) {
  const trimmed = s.replace(FINISH_TAIL_RE, "");
  return trimmed && trimmed !== s ? [s, trimmed] : [s];
}

// Typed text inside a LIKE pattern matches literally: %, _ and the escape character itself
// are escaped, and every LIKE here declares ESCAPE '\'.
function likeLiteral(s) {
  return String(s).replace(/[\\%_]/g, (c) => "\\" + c);
}

// The trade scope of a product query, written once: {where, binds} for one trade, or for any
// trade when trade is empty. matchProductFromDb ranks by it rather than filtering on it
// (ORDER BY CASE WHEN <where> THEN 0 ELSE 1 END, then the attempt's own order), so the first
// row of every attempt is its best match in the line's trade when one exists and its best
// match in any trade otherwise.
function tradeScope(trade) {
  return trade ? { where: "p.trade = ?", binds: [trade] } : { where: "1 = 1", binds: [] };
}

// Shorter forms of a catalogue number as a spec writes it, longest first:
// "ALX53R-RHO-626" -> ALX53R, ALX53; "4041XP" -> 4041X, 4041; "896ADJ" -> 896; "90S" -> 90.
export function baseModelCandidates(modelSearch) {
  const out = [];
  const seen = new Set([modelSearch]);
  const push = (s) => { if (s && s.length >= 2 && /\d/.test(s) && !seen.has(s)) { seen.add(s); out.push(s); } };
  const seg = modelSearch.split(/[-\/ ,()]/)[0];
  push(seg);
  for (const base of [seg, modelSearch]) {
    let t = base;
    while (/[A-Z]$/.test(t) && t.length > 2) {
      t = t.slice(0, -1);
      push(t);
    }
  }
  return out;
}

// Digit runs a maker may list as a series: "RX-QEL98L-NL-03" -> 98; "9927" -> 992, 99.
export function seriesCandidates(modelSearch) {
  const out = [];
  const seen = new Set([modelSearch]);
  for (const run of modelSearch.match(/\d{2,}/g) || []) {
    if (/^0/.test(run)) continue;
    let t = run;
    while (t.length >= 2) {
      if (!seen.has(t)) { seen.add(t); out.push(t); }
      if (t.length === 2) break;
      t = t.slice(0, -1);
    }
  }
  return out;
}

// Of several rows with the same base model, the one with cut sheets filed (so a citation
// and the packet get the documented row); ties keep the query's order.
async function preferDocumented(rows, env2) {
  if (!rows || rows.length === 0) return null;
  if (rows.length === 1) return rows[0];
  let best = rows[0], bestDocs = -1;
  for (const row of rows) {
    const docs = (await getCutSheetsForProduct(row.id, env2)).length;
    if (docs > bestDocs) { best = row; bestDocs = docs; }
  }
  return best;
}

/**
 * The catalogue's answer for one line: { product, confidence, matchType } or null.
 * component: { manufacturer?, model, catalog_number?, modelFull? }.
 */
async function matchProductFromDb(component, env2, trade = "doors") {
  const db = env2.DB;
  const { manufacturer, model, catalog_number, modelFull } = component;
  const modelSearch = (model || catalog_number || "").toUpperCase().replace(/\s+/g, " ").trim();
  const mfgSearch = (manufacturer || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!modelSearch) return null;
  try {
    const index = await getMakerIndex(env2);
    const maker = resolveMaker(index, manufacturer);
    const scope = tradeScope(trade);
    const rows = async (where, binds, orderBy, limit = 1) => {
      const r = await db.prepare(`SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE ${where}
        ORDER BY CASE WHEN ${scope.where} THEN 0 ELSE 1 END, ${orderBy}
        LIMIT ${limit}`).bind(...binds, ...scope.binds).all();
      return r.results || [];
    };
    const found = (row, confidence, matchType) => {
      if (!row) return null;
      if (!trade || row.trade === trade) return { product: row, confidence, matchType };
      return { product: row, confidence: confidence === "high" ? "medium" : confidence, matchType: `${matchType}_other_trade` };
    };
    const EXACT_ORDER = "p.display_name, p.id";
    const PREFIX_ORDER = "LENGTH(p.base_model), p.base_model, p.id";
    const fullSearch = (modelFull || "").toUpperCase().replace(/\s+/g, " ").trim();
    // The rest of the line as typed: catalogue models with spaces in them ("DW16/MU16 10'0\"
    // thru 10'6\"", "Hardware Pack SLSS2", "Royal 111"), then the same without a finish tail.
    const restSet = new Set();
    if (fullSearch && fullSearch !== modelSearch) {
      // As typed, and with a comma that ended a token dropped ("L9080, 626" -> "L9080 626").
      for (const f of [fullSearch, fullSearch.replace(/,(\s|$)/g, "$1").replace(/\s+/g, " ").trim()]) {
        for (const s of withFinishTrimmed(f)) if (s && s !== modelSearch) restSet.add(s);
      }
    }
    const rest = [...restSet];
    const finishOnly = isFinishOnly(modelSearch) && (!fullSearch || isFinishOnly(fullSearch));
    const exactAny = async (s) => preferDocumented(await rows("UPPER(p.base_model) = ?", [s], EXACT_ORDER, 5), env2);
    // The same catalogue number written without its separators ("EPT-10" is the catalogue's
    // EPT10, "4040-XP" its 4040XP): letters and digits only, both sides.
    const COMPACT = "REPLACE(REPLACE(REPLACE(REPLACE(UPPER(p.base_model), '-', ''), ' ', ''), '/', ''), '.', '')";
    const compact = (s) => s.replace(/[^A-Z0-9]/g, "");
    const compactAny = async (s) => (compact(s) && compact(s) !== s && /\d/.test(s)) ? preferDocumented(await rows(`${COMPACT} = ?`, [compact(s)], EXACT_ORDER, 5), env2) : null;

    if (maker.typed && maker.known) {
      const ids = maker.ids;
      const inMaker = `p.manufacturer_id IN (${ids.map(() => "?").join(",")})`;
      const exactIn = async (s) => preferDocumented(await rows(`UPPER(p.base_model) = ? AND ${inMaker}`, [s, ...ids], EXACT_ORDER, 5), env2);
      const compactIn = async (s) => (compact(s) && compact(s) !== s && /\d/.test(s)) ? preferDocumented(await rows(`${COMPACT} = ? AND ${inMaker}`, [compact(s), ...ids], EXACT_ORDER, 5), env2) : null;
      // exact, under the named maker
      for (const s of [...rest, modelSearch]) {
        const hit = found(await exactIn(s), "high", "exact");
        if (hit) return hit;
      }
      if (finishOnly) return null;
      for (const s of [...rest, modelSearch]) {
        const hit = found(await compactIn(s), "high", "exact");
        if (hit) return hit;
      }
      // the base model (option suffix dropped)
      for (const s of baseModelCandidates(modelSearch)) {
        const hit = found(await exactIn(s), "medium", "base_model");
        if (hit) return hit;
      }
      if (!looksLikeModel(modelSearch) || modelSearch.length < 3) return null;
      // a variant the catalogue lists with a suffix after a separator
      const lit = likeLiteral(modelSearch);
      const variants = await rows(`(UPPER(p.base_model) LIKE ? ESCAPE '\\' OR UPPER(p.base_model) LIKE ? ESCAPE '\\' OR UPPER(p.base_model) LIKE ? ESCAPE '\\') AND ${inMaker}`,
        [lit + "-%", lit + "/%", lit + " %", ...ids], PREFIX_ORDER);
      const variant = found(variants[0], "medium", "variant");
      if (variant) return variant;
      // a series the maker lists under the digit run
      for (const s of seriesCandidates(modelSearch)) {
        let r = [];
        try {
          r = await rows(`UPPER(p.base_model) = ? AND ${inMaker} AND (p.product_series = p.base_model OR UPPER(p.display_name) LIKE '%SERIES%')`, [s, ...ids], EXACT_ORDER);
        } catch (e) { r = []; /* a products table without product_series (older fixtures) */ }
        const hit = found(r[0], "medium", "series");
        if (hit) return hit;
      }
      // a prefix of the model, under the named maker
      return found((await rows(`UPPER(p.base_model) LIKE ? ESCAPE '\\' AND ${inMaker}`, [lit + "%", ...ids], PREFIX_ORDER))[0], "medium", "partial");
    }

    // A maker we can name but the catalogue lacks: a miss, never another maker's product.
    if (maker.typed && maker.realMaker) return null;
    if (finishOnly) return null;

    if (maker.typed) {
      // A word we cannot place as a maker is often part of the model ("Royal 111",
      // "Hardware Pack SLSS2"): the whole line first, then the rest at medium.
      for (const s of withFinishTrimmed(fullSearch || modelSearch)) {
        const hit = found(await exactAny(`${mfgSearch} ${s}`.replace(/\s+/g, " ")), "high", "exact");
        if (hit) return hit;
      }
      // Only something shaped like a catalogue number ("111", "SLSS2"), never a plain word:
      // "Frame: welded, 16 ga, primed" must not become a product named WELDED.
      for (const s of [...rest, modelSearch]) {
        if (!looksLikeModel(s)) continue;
        const hit = found(await exactAny(s), "medium", "exact_model_unknown_manufacturer");
        if (hit) return hit;
      }
      return null;
    }

    // No maker: exact, any maker; then a prefix of four characters or more, never a bare
    // number of four digits or fewer (the same number exists under several makers).
    for (const s of [...rest, modelSearch]) {
      const hit = found(await exactAny(s), "high", "exact");
      if (hit) return hit;
    }
    for (const s of [...rest, modelSearch]) {
      const hit = found(await compactAny(s), "high", "exact");
      if (hit) return hit;
    }
    if (!looksLikeModel(modelSearch) || modelSearch.length < 4 || /^\d{1,4}$/.test(modelSearch)) return null;
    return found((await rows("UPPER(p.base_model) LIKE ? ESCAPE '\\'", [likeLiteral(modelSearch) + "%"], PREFIX_ORDER))[0], "low", "partial");
  } catch (err) {
    console.error("Product match error:", err);
    return null;
  }
}

async function getCutSheetsForProduct(productId, env2) {
  const db = env2.DB;
  try {
    const docs = await db.prepare(`
      SELECT id, document_type, document_title, document_url, r2_object_key,
             r2_bucket, page_count, version, published_date
      FROM product_documents
      WHERE product_id = ? AND document_type = 'cut_sheet' AND active = 1
      ORDER BY published_date DESC
    `).bind(productId).all();
    return docs.results || [];
  } catch (err) {
    console.error("Cut sheet lookup error:", err);
    return [];
  }
}

// Page-hint parsing for cut-sheet citations (added 2026-10-04).
//
// What the product_documents rows actually hold (verified live against
// weyland_db, not assumed): every one of the 7,792 cut_sheet rows has a
// NULL document_url and a non-null r2_object_key pointing at one of just
// 8 distinct full manufacturer price-book PDFs in the subx-uploads bucket
// (manufacturer-catalogs/<hash>.pdf, e.g. the 152-page LCN price book).
// The ONLY per-product page information is encoded in document_title
// free text, e.g. "... product listed around pp.6-48 in the edition
// originally catalogued ..." or "... around p.33 ..." - and ~3,000 rows
// (Ives, Glynn-Johnson) literally say "p.None", meaning no page is known.
// parsePageHint pulls the "6-48" / "33" range out of that text, or
// returns null when none is there. It never invents a page.
function parsePageHint(title) {
  if (!title || typeof title !== "string") return null;
  const m = title.match(/\bpp?\.\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?/i);
  if (!m) return null;
  const first = parseInt(m[1], 10);
  if (!Number.isFinite(first) || first < 1) return null;
  const last = m[2] ? parseInt(m[2], 10) : null;
  return { hint: last && last !== first ? `${first}-${last}` : String(first), firstPage: first, lastPage: last || first };
}

// Builds the deep-link for a cut-sheet row. A link is only produced when
// the row has a real stored PDF (r2_object_key) that GET
// /api/cut-sheets/sheet/:id/pdf (routes/cut-sheet-coverage.js) can
// stream; the #page= fragment is added only when the title carries a
// parsed page hint, or a page was pinned from the book's own indexed text.
// No R2 key -> pageUrl null, never a made-up link.
function cutSheetCitation(cs, pinnedPage = null) {
  const parsed = parsePageHint(cs.document_title);
  const hasPdf = !!(cs.r2_object_key && String(cs.r2_object_key).trim());
  let pageUrl = null;
  if (hasPdf) {
    pageUrl = `/api/cut-sheets/sheet/${encodeURIComponent(cs.id)}/pdf`;
    if (pinnedPage) pageUrl += `#page=${pinnedPage}`;
    else if (parsed) pageUrl += `#page=${parsed.firstPage}`;
  }
  return { pageHint: pinnedPage ? String(pinnedPage) : (parsed ? parsed.hint : null), pageUrl, pinnedPage: pinnedPage || null };
}

/** The catalogue id a price-book document's R2 key encodes (manufacturer-catalogs/<id>.pdf), or null. */
export function catalogueIdOfDocument(cs) {
  const m = /^manufacturer-catalogs\/([a-f0-9]{8,64})\.pdf$/i.exec(String(cs && cs.r2_object_key || ""));
  return m ? m[1] : null;
}

// FTS5 queries for a model, tried in order: its alphanumeric runs as a phrase ("WS406/407CCV"
// -> "WS406 407CCV"), the phrase as a prefix of its last run ("ALX53" also finds ALX53P), then
// the leading run alone as a prefix ("WS406" finds WS406CCV when the slash form is not printed).
function ftsQueries(model) {
  const tokens = String(model || "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!tokens.length) return [];
  const out = ['"' + tokens.join(" ") + '"', '"' + tokens.join(" ") + '" *'];
  const lead = countToken(model);
  if (tokens.length > 1 && lead && lead.length >= 3) out.push('"' + lead + '" *');
  return out;
}

// The normalised spellings a catalogue row's `manufacturer` column may use for a maker
// ("von-duprin", "vonduprin", "ngp", "lcn", "zero").
function catalogueMakerKeys(index, maker) {
  const keys = new Set();
  if (!maker) return [];
  if (maker.name) keys.add(normalizeMaker(maker.name));
  if (maker.typed) keys.add(normalizeMaker(maker.typed));
  for (const row of (index && index.rows) || []) {
    if (maker.ids && maker.ids.includes(row.id)) { if (row.norm) keys.add(row.norm); if (row.normSlug) keys.add(row.normSlug); }
  }
  return [...keys].filter(Boolean);
}

// The run of letters and digits a page's text is counted for: the model's leading run when it
// is three characters or more with a digit ("WS406/407CCV" -> WS406), else its longest run.
function countToken(model) {
  const runs = String(model || "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!runs.length) return null;
  const lead = runs.find((r) => r.length >= 3 && /\d/.test(r));
  return lead || runs.reduce((a, b) => (b.length > a.length ? b : a));
}

// How the pages that name a model are ordered: the page that names it most often first (a
// product page repeats its model; a contents page lists it once), a page in the first eight
// that says "contents" after the rest, a catalogue before a price book, then page order.
// `tok` binds the counted token twice.
const PAGE_ORDER = "ORDER BY toc ASC, mentions DESC, (c.title LIKE '%Price Book%' OR c.title LIKE '%pricebook%' OR c.title LIKE '%Price List%') ASC, p.page_num ASC";
const MENTIONS = "(LENGTH(UPPER(p.text_content)) - LENGTH(REPLACE(UPPER(p.text_content), ?, ''))) / LENGTH(?) AS mentions";
const TOC = "CASE WHEN p.page_num <= 8 AND (lower(p.text_content) LIKE '%contents%' OR lower(p.text_content) LIKE '%index%') THEN 1 ELSE 0 END AS toc";

// Catalogue pages that name a model, the product's own page before a contents page. Exact
// phrase first, then the model as a prefix ("ALX53" also finds ALX53P). Only the maker's
// catalogues when a maker is given; `keys` are the normalised spellings its catalogues may be
// filed under.
async function cataloguePagesNaming(env2, model, keys, limit) {
  const db = env2.DB;
  const tok = countToken(model);
  if (!tok) return [];
  const mfrWhere = keys && keys.length ? `REPLACE(REPLACE(REPLACE(LOWER(c.manufacturer), '-', ''), ' ', ''), '_', '') IN (${keys.map(() => "?").join(",")})` : "1 = 1";
  const mfrBinds = keys && keys.length ? keys : [];
  for (const q of ftsQueries(model)) {
    const rows = await db.prepare(
      "SELECT c.catalogue_id, c.title, c.manufacturer, c.storage_path, c.source_filename, p.page_num, " + TOC + ", " + MENTIONS + " " +
      "FROM catalogue_pages_fts f JOIN catalogue_pages p ON p.rowid = f.rowid JOIN catalogues c ON c.catalogue_id = p.catalogue_id " +
      "WHERE catalogue_pages_fts MATCH ? AND " + mfrWhere + " " + PAGE_ORDER + " LIMIT ?"
    ).bind(tok, tok, q, ...mfrBinds, limit).all();
    if (rows.results && rows.results.length) return rows.results;
  }
  return [];
}

// Catalogue-page fallback (2026-10-05, ranked 2026-10-08). 7,792 standalone cut sheets cover
// far from every catalogued model, but the ingested catalogues (full text in
// catalogue_pages_fts) usually do. When a product matches and no cut sheet is filed, cite the
// catalogue pages that name the model. Links go to the real page render route
// (/api/cps/catalogues/:id/pages/:n/render) only when the PDF is really in R2. Never invents a
// page. `manufacturerName` may be a maker name, a code or a resolveMaker() result.
async function getCataloguePagesForModel(manufacturerName, model, env2, limit = 3) {
  const token = String(model || "").replace(/["'*^]/g, "").trim();
  if (!token || token.length < 3) return [];
  try {
    const index = await getMakerIndex(env2);
    const maker = manufacturerName && typeof manufacturerName === "object" ? manufacturerName : resolveMaker(index, manufacturerName);
    const keys = maker.typed ? catalogueMakerKeys(index, maker) : [];
    const rows = await cataloguePagesNaming(env2, token, keys, limit);
    // Only link to the page render when the source PDF (or an already rendered page) is
    // really in R2: many catalogues were ingested text-only. A citation without a PDF stays a
    // citation (title + page), never a dead link.
    const out = [];
    for (const r of rows) {
      let pageUrl = null;
      try {
        const cachedKey = "catalogues/" + r.catalogue_id + "/pages/page_" + r.page_num + ".pdf";
        const present = env2.UPLOADS && ((await env2.UPLOADS.head(cachedKey)) || (await resolveCatalogueKey(env2, r)));
        if (present) pageUrl = "/api/cps/catalogues/" + encodeURIComponent(r.catalogue_id) + "/pages/" + r.page_num + "/render";
      } catch (e) { /* no link rather than a guessed one */ }
      out.push({ catalogueId: r.catalogue_id, title: r.title, manufacturer: r.manufacturer, pageNum: r.page_num, pageUrl, pdfAvailable: !!pageUrl, mentions: r.mentions == null ? null : Number(r.mentions), contentsPage: !!r.toc });
    }
    return out;
  } catch (e) {
    console.warn("[matcher] catalogue page fallback failed:", e.message);
    return [];
  }
}

// The page of a filed price book that names the product, when that book's text was indexed
// from the very file in R2 (catalogues.storage_path = the document's R2 key); null otherwise,
// because the index of another edition would point at the wrong page.
async function pinPriceBookPage(env2, cs, product) {
  const catalogueId = catalogueIdOfDocument(cs);
  if (!catalogueId || !product || !product.base_model) return null;
  try {
    const cat = await env2.DB.prepare("SELECT catalogue_id, storage_path, page_count FROM catalogues WHERE catalogue_id = ?").bind(catalogueId).first();
    if (!cat || String(cat.storage_path || "") !== String(cs.r2_object_key)) return null;
    const tok = countToken(product.base_model);
    if (!tok) return null;
    for (const q of ftsQueries(product.base_model)) {
      const row = await env2.DB.prepare(
        "SELECT p.page_num, " + TOC + ", " + MENTIONS + " " +
        "FROM catalogue_pages_fts f JOIN catalogue_pages p ON p.rowid = f.rowid JOIN catalogues c ON c.catalogue_id = p.catalogue_id " +
        "WHERE catalogue_pages_fts MATCH ? AND p.catalogue_id = ? " + PAGE_ORDER + " LIMIT 1"
      ).bind(tok, tok, q, catalogueId).first();
      if (row && row.page_num) return row.page_num;
    }
  } catch (e) { /* no pin rather than a guessed page */ }
  return null;
}

/** Why a line matched nothing, in words: { reason, text, need }. */
export function missReason(line, maker) {
  const model = line && (line.modelFull || line.model) || "";
  const who = maker && maker.name ? maker.name : (line && line.manufacturer) || "";
  if (line && line.noModel) return { reason: "no_model", text: "no catalogue number on the line", need: "the catalogue number" };
  if (model && isFinishOnly(model)) return { reason: "finish_code", text: `${model} is a finish code, not a product`, need: "the catalogue number" };
  if (maker && maker.typed && !maker.known && maker.realMaker) return { reason: "maker_not_in_catalogue", text: `${who} is not in the catalogue`, need: `${who}'s catalogue` };
  if (maker && maker.typed && maker.known) return { reason: "model_not_in_catalogue", text: `${who} is in the catalogue; ${model} is not`, need: `${who} ${model} in the catalogue` };
  if (maker && maker.typed) return { reason: "maker_unknown", text: `no maker named ${line.manufacturer} is known, and no product is named ${line.manufacturer} ${model}`.trim(), need: "the maker's name" };
  return { reason: "not_catalogued", text: `nothing catalogued is named ${model}`, need: "the maker's name" };
}

// A model token specific enough to stand for a product in a catalogue's text: three
// characters or more with a digit, and not a finish code.
function specificToken(model) {
  const t = String(model || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!t || t.length < 3 || !/\d/.test(t) || isFinishOnly(t)) return null;
  return t;
}

/** One citation for a result: a filed sheet first, else the catalogue page that names the model. */
export function citationFor(r) {
  const sheet = (r && r.cutSheets && r.cutSheets[0]) || null;
  if (sheet) return { kind: "cut_sheet", title: sheet.title, page: sheet.pageHint || null, url: sheet.pageUrl || null, pinned: !!sheet.pinnedPage };
  const cp = (r && r.cataloguePages && r.cataloguePages[0]) || null;
  if (cp) return { kind: "catalogue_page", title: cp.title, page: String(cp.pageNum), url: cp.pageUrl || null, pdfAvailable: !!cp.pdfAvailable };
  return null;
}

/**
 * The catalogue's answer for a component, with its documents.
 * component: { manufacturer?, model, catalog_number?, modelFull?, description?, noModel? }.
 * Every pre-existing key is preserved (the homepage reads matched/confidence/matchType/
 * product/cutSheets[].title/.pages); maker, reason, matchNote, pinnedPage are additive.
 */
async function matchComponentToCutSheets(component, env2) {
  const index = await getMakerIndex(env2);
  const maker = resolveMaker(index, component && component.manufacturer);
  const makerOut = { typed: maker.typed, name: maker.name, code: maker.code, known: maker.known, realMaker: maker.realMaker };
  const match = component && !component.noModel ? await matchProductFromDb(component, env2) : null;
  if (!match) {
    // The maker's own catalogue pages naming the exact model, when no product row exists.
    const token = component && !component.noModel ? specificToken(component.model) : null;
    if (maker.known && token) {
      const pages = await getCataloguePagesForModel(maker, token, env2, 3);
      if (pages.length) {
        return {
          matched: true,
          component,
          product: { id: null, name: `${maker.name} ${token}`, manufacturer: maker.name, model: token, series: null, category: null, ansiGrade: null, fireRated: null, adaCompliant: null },
          cutSheets: [],
          cataloguePages: pages,
          confidence: "medium",
          matchType: "catalogue_page",
          matchNote: `no product record; ${maker.name}'s catalogue names ${token}`,
          maker: makerOut,
        };
      }
    }
    const miss = missReason(component || {}, maker);
    return { matched: false, component, product: null, cutSheets: [], cataloguePages: [], confidence: null, matchType: null, maker: makerOut, reason: miss.reason, reasonText: miss.text, need: miss.need };
  }
  const cutSheets = await getCutSheetsForProduct(match.product.id, env2);
  const sheets = [];
  for (const cs of cutSheets) {
    const pinned = await pinPriceBookPage(env2, cs, match.product);
    sheets.push({
      id: cs.id,
      title: cs.document_title,
      type: cs.document_type,
      url: cs.document_url,
      r2Key: cs.r2_object_key,
      bucket: cs.r2_bucket,
      pages: cs.page_count,
      catalogueId: catalogueIdOfDocument(cs),
      ...cutSheetCitation(cs, pinned),
    });
  }
  // Catalogue pages: always when no sheet is filed; also when the filed book's page is not
  // pinned, so the citation can land on a page that really names the model.
  const needPages = sheets.length === 0 || !sheets.some((s) => s.pinnedPage);
  const cataloguePages = needPages ? await getCataloguePagesForModel(maker.typed ? maker : match.product.manufacturer_name, match.product.base_model, env2) : [];
  const typed = (component.model || "").toUpperCase().trim();
  const notes = {
    base_model: `base model of ${component.modelFull || typed}`,
    variant: `${match.product.base_model} is the catalogued form of ${typed}`,
    series: `${typed} is in the ${match.product.base_model} series`,
    partial: `${match.product.base_model} begins with ${typed}`,
    exact_model_unknown_manufacturer: `${match.product.manufacturer_name} lists ${match.product.base_model}; the maker as written was not recognised`,
  };
  const baseType = String(match.matchType).replace(/_other_trade$/, "");
  return {
    matched: true,
    cataloguePages,
    component,
    product: {
      id: match.product.id,
      name: match.product.display_name || `${match.product.manufacturer_name} ${match.product.base_model}`,
      manufacturer: match.product.manufacturer_name,
      model: match.product.base_model,
      series: match.product.product_series,
      category: match.product.category_level_1,
      ansiGrade: match.product.ansi_grade,
      fireRated: match.product.fire_rated,
      adaCompliant: match.product.ada_compliant
    },
    cutSheets: sheets,
    confidence: match.confidence,
    matchType: match.matchType,
    matchNote: notes[baseType] || null,
    maker: makerOut,
  };
}

/**
 * The pages a packet may embed for a result, in order: a filed price book's pinned page,
 * then catalogue pages whose PDF is on file. [{ kind, catalogueId, pageNum, title }].
 */
export function citedPagesFor(result, limit = 2) {
  const out = [];
  if (!result || !result.matched) return out;
  const seenBooks = new Set();
  for (const cs of result.cutSheets || []) {
    if (cs.pinnedPage && cs.catalogueId && !seenBooks.has(cs.catalogueId)) {
      seenBooks.add(cs.catalogueId);
      out.push({ kind: "price_book", catalogueId: cs.catalogueId, pageNum: cs.pinnedPage, title: String(cs.title || "Price book").split(" (")[0] });
    }
  }
  // One page per catalogue, never a contents page.
  for (const cp of result.cataloguePages || []) {
    if (!cp.pdfAvailable || cp.contentsPage || seenBooks.has(cp.catalogueId)) continue;
    seenBooks.add(cp.catalogueId);
    out.push({ kind: "catalogue", catalogueId: cp.catalogueId, pageNum: cp.pageNum, title: cp.title });
  }
  return out.slice(0, limit);
}

/** Match types a packet may attach a page for: the named maker's own product or page. */
export const PACKET_MATCH_TYPES = new Set(["exact", "base_model", "variant", "series", "catalogue_page"]);

export {
  matchProductFromDb,
  getCutSheetsForProduct,
  matchComponentToCutSheets,
  parsePageHint,
  cutSheetCitation,
  getCataloguePagesForModel,
};
