// weyland-shared/cut-sheet-matcher.js
//
// THE matcher: one spec line (manufacturer + model as printed) -> the
// catalogue product it names, and the cut sheet or catalogue page that shows
// it. Imported by weyland-cutsheetx-worker (CutsheetX MATCH, the homepage
// paste, /api/find) and weyland-subx-worker (the cut sheets a SubX submittal
// packet carries), so a line gets one answer everywhere (2026-10-08; until
// then subx-worker ran an older copy that LIKE-matched '%SCH%' and was handed
// whole catalog cells as the model, so packets carried no cut sheets).
//
// Rules, from the value audit (plan/weylandai_value_report.md) and a run of
// the 143 real 08 71 00 lines in tools/corpus/expected against production:
//   1. A line that names a maker is answered with that maker's product or not
//      at all. "Ives 8200" came back as a Sargent 8200 mortise lock, "Ives
//      8302" as a Zero International 8302 and "RCI 960" as an NGP 960, each
//      "high, exact". A different maker's product is never a match; it is
//      reported as otherMaker so the reviewer sees why nothing matched.
//   2. A maker is resolved to manufacturer ids (alias table, catalogue names,
//      then the industry abbreviations specs print: IVE, SCH, VON, GLY, ZER,
//      SEL, NGP, ...), never by substring LIKE.
//   3. Within the named maker: exact model first, then the model's family
//      ("ALX53R-RHO-626" -> ALX53, "39D" -> 39, "PA-AX-9927-EO-F" -> 9927 ->
//      99, "SL11 / SL24" -> SL11), reported as matchType "series" at medium
//      confidence, then a model prefix (medium, "partial"). A family match
//      cites the family's cut sheet, which is what a submittal shows.
//   4. "BY OTHERS", "BY DIVISION 28", "B/O" lines are not products and are
//      never matched or counted as misses.

import { resolveCatalogueKey } from "./catalogue-key.js";

// ---------------------------------------------------------------- makers

// Industry maker abbreviations as hardware schedules print them, to the
// start of the catalogue's maker name (letters and digits only, lower case).
export const MAKER_CODES = {
  IVE: ["ives"], IVES: ["ives"], IV: ["ives"],
  SCH: ["schlage"], SCE: ["schlage"], SCHL: ["schlage"],
  LCN: ["lcn"],
  VON: ["vonduprin"], VD: ["vonduprin"], VDP: ["vonduprin"], VDU: ["vonduprin"],
  GLY: ["glynnjohnson"], GJ: ["glynnjohnson"], GLJ: ["glynnjohnson"],
  FAL: ["falcon"], SAR: ["sargent"], SGT: ["sargent"],
  ZER: ["zero"], ZRO: ["zero"],
  NGP: ["nationalguard", "ngp"], NAT: ["nationalguard"],
  PEM: ["pemko"], TRM: ["trimco"], TRI: ["trimco"], HAG: ["hager"], MCK: ["mckinney"],
  ROC: ["rockwood"], RO: ["rockwood"], RCK: ["rockwood"],
  BES: ["best"], BST: ["best"], COR: ["corbin"], CR: ["corbin"], YAL: ["yale"], YA: ["yale"],
  STA: ["stanley"], HES: ["hes"], SEC: ["securitron"], SCN: ["securitron"], ABH: ["abh"],
  BOM: ["bommer"], ADA: ["adamsrite"], ARI: ["adamsrite"], PRE: ["precision"], DET: ["detex"],
  SDC: ["sdc", "securitydoorcontrols"], NOR: ["norton"], RIX: ["rixson"], RF: ["rixson"],
  MAR: ["markar"], BEA: ["bea"], HOR: ["horton"], CAM: ["camden"], SEL: ["select"],
  DOR: ["dormakaba", "dorma"], DKB: ["dormakaba"], RCI: ["rutherford", "rci"],
  ACC: ["accurate"], ALA: ["alarmlock"], ARR: ["arrow"], MED: ["medeco"], KAB: ["kaba"],
  STK: ["stanley"], CAL: ["calroyal"], BUR: ["burns"], DON: ["donjo"], HEW: ["hewi"],
  AB: ["abloy"], ABL: ["abloy"], ASR: ["assaabloy"], LOC: ["locknetics"], GAL: ["galaxy"],
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Manufacturers and aliases, cached per isolate for ten minutes.
let _mfr = { at: 0, data: null, promise: null };
export async function getManufacturers(env) {
  const now = Date.now();
  if (_mfr.data && now - _mfr.at < 600000) return _mfr.data;
  if (!_mfr.promise) {
    _mfr.promise = (async () => {
      const rows = (await env.DB.prepare("SELECT id, name, slug FROM manufacturers").all()).results || [];
      let aliases = [];
      try {
        aliases = (await env.DB.prepare("SELECT alias, manufacturer_id FROM manufacturer_aliases").all()).results || [];
      } catch (_) { /* table absent in some databases: names and codes still resolve */ }
      const data = { rows: rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, n: norm(r.name), s: norm(r.slug) })), aliases };
      _mfr = { at: Date.now(), data, promise: null };
      return data;
    })().catch((err) => { _mfr.promise = null; console.error("manufacturer list:", err); return _mfr.data || { rows: [], aliases: [] }; });
  }
  return _mfr.promise;
}
/** For tests: forget the cached manufacturer list. */
export function resetManufacturerCache() { _mfr = { at: 0, data: null, promise: null }; }

/** Names and slugs, for the paste parser's longest-prefix maker detection. */
export async function getManufacturerNames(env) {
  const { rows, aliases } = await getManufacturers(env);
  const names = [];
  for (const r of rows) { if (r.name) names.push(String(r.name)); if (r.slug) names.push(String(r.slug)); }
  for (const a of aliases) if (a.alias && !/^prod-/.test(a.alias)) names.push(String(a.alias));
  return names;
}

/**
 * The manufacturer ids a typed maker names: an alias, a catalogue name or
 * slug (either one starting with the other: "LCN" / "LCN Closers"), or an
 * industry code. Empty when the catalogue has no such maker.
 */
export function resolveMakerIds(typed, data) {
  const t = String(typed || "").trim();
  const n = norm(t);
  const words = t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const ids = new Set();
  if (!n) return ids;
  for (const a of data.aliases || []) if (norm(a.alias) === n) ids.add(a.manufacturer_id);
  for (const r of data.rows || []) {
    for (const name of [r.name, r.slug]) {
      const k = norm(name);
      if (!k) continue;
      const kw = String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      // Same name; the typed name is the start of the catalogue's ("Select"
      // for "Select Products", four letters or more); or the catalogue's is
      // the typed name's first words ("Ives" in "Ives Hardware") - whole
      // words, so "BEA" never resolves "BEARING".
      if (k === n || (n.length >= 4 && k.startsWith(n)) || words.startsWith(kw + " ")) ids.add(r.id);
    }
  }
  const code = MAKER_CODES[t.toUpperCase().replace(/[^A-Z]/g, "")];
  if (code && !ids.size) {
    for (const r of data.rows || []) if (code.some((p) => (r.n && r.n.startsWith(p)) || (r.s && r.s.startsWith(p)))) ids.add(r.id);
  }
  return ids;
}

// ---------------------------------------------------------------- lines

const BY_OTHERS_RE = /^(?:B\/?O|BY\s+OTHERS|BY\s+DIV(?:ISION)?\.?\s*\d+|BY\s+(?:DOOR|FRAME|SECURITY|ELECTRICAL|OWNER|GC|G\.C\.|ACCESS|ALARM|CARD|OTHER|SUPPLIER|DOOR\s+AND\s+FRAME)\b|N\.?I\.?C\.?\b|NOT\s+IN\s+CONTRACT|EXISTING\s+TO\s+REMAIN)/i;
/** A line that is furnished by someone else: not a product to match. */
export function isByOthers(manufacturer, model) {
  return BY_OTHERS_RE.test(String(manufacturer || "").trim()) || BY_OTHERS_RE.test(String(model || "").trim());
}

// A finish or qualifier token at the end of a line ("... 626", "... US26D", "... LH").
const FINISH_TAIL_RE = /\s+(?:US\d{1,2}[A-Z]?|\d{3}[A-Z]?|[A-Z]{2,3}\d{0,2})$/;
function withFinishTrimmed(s) {
  const trimmed = s.replace(FINISH_TAIL_RE, "");
  return trimmed && trimmed !== s ? [s, trimmed] : [s];
}

function looksLikeModel(s) {
  return /\d/.test(s) || /^[A-Z]{2,}[-\/.][A-Z0-9]+$/.test(s);
}

/**
 * What to look up for a model as printed, in order.
 *   exact:  the whole cell, the cell without its finish tail, the cell's
 *           tokens joined by hyphens ("20-057 ICX" -> 20-057-ICX), each
 *           alternative of "A / B", the first token.
 *   series: the model's family within the same maker - option segments cut
 *           from the end ("ALX53R-RHO-626" -> ALX53R), leading option
 *           letters dropped ("PA-AX-9927-EO" -> 9927, "QEL-99-EO" -> 99),
 *           trailing letters cut ("39D" -> 39, "188SBK" -> 188S, 188),
 *           and a four-digit number's two-digit series ("9927" -> 99).
 */
export function modelCandidates(model, modelFull) {
  const up = (s) => String(s || "").toUpperCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const first = up(model).split(" ")[0] || "";
  const full = up(modelFull || model);
  const exact = [];
  const add = (list, s) => { s = String(s || "").trim().replace(/^[-\/.\s]+|[-\/.\s]+$/g, ""); if (s && !list.includes(s)) list.push(s); };
  for (const s of withFinishTrimmed(full)) add(exact, s);
  const toks = full.split(" ");
  if (toks.length >= 2 && toks.length <= 3 && toks.every((t) => /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(t))) add(exact, toks.join("-"));
  const alts = full.split(/\s*\/\s+|\s+\/\s*/).map((a) => a.split(" ")[0]).filter((a) => a && looksLikeModel(a));
  if (alts.length > 1) for (const a of alts) add(exact, a);
  add(exact, first);
  // "EPT-10" is filed as EPT10.
  if (/^[A-Z]+-\d+$/.test(first)) add(exact, first.replace("-", ""));
  // "DP1/ DP2" and "WS406/407CCV" are one token with a slash: try the left side too.
  if (/\//.test(first)) add(exact, first.split("/")[0]);

  const series = [];
  const stemsOf = (tok) => {
    const out = [];
    const parts = tok.split("-").filter(Boolean);
    // Drop leading option groups of letters ("PA-AX-", "RX-", "QEL-").
    let k = 0;
    while (k < parts.length - 1 && /^[A-Z]{1,3}$/.test(parts[k])) k++;
    for (let end = parts.length; end > k; end--) {
      const stem = parts.slice(k, end).join("-");
      if (stem.length >= 3) out.push(stem);
    }
    // A device number behind option letters in the same token ("KR4954" ->
    // 4954, "QEL98L" -> 98L, 98).
    const lead = (parts[k] || "").match(/^([A-Z]{1,3})(\d{2,}[A-Z]{0,3})$/);
    if (lead) {
      out.push(lead[2]);
      let u = lead[2];
      while (/[A-Z]$/.test(u)) { u = u.slice(0, -1); out.push(u); }
    }
    // The device number itself after option letters ("QEL-99-EO" -> 99).
    if (k > 0 && parts[k] && parts[k].length < 3 && /\d/.test(parts[k])) out.push(parts[k]);
    const core = parts[k] || tok;
    // Trailing letters, one at a time ("188SBK" -> 188SB, 188S, 188).
    let t = core;
    while (/[A-Z]$/.test(t) && /\d/.test(t.slice(0, -1))) { t = t.slice(0, -1); out.push(t); }
    // A four-digit device printed with option suffixes is its two-digit
    // series ("9927-EO-F" -> 99, "3547-L" -> 35); a bare four-digit number
    // ("8200") is not cut down.
    if (/^\d{4}$/.test(core) && parts.length > k + 1) out.push(core.slice(0, 2));
    return out;
  };
  const roots = [first, ...alts];
  if (/\//.test(first)) roots.push(first.split("/")[0]);
  for (const r of roots) for (const s of stemsOf(r)) if (!exact.includes(s.replace(/^[-\/.]+|[-\/.]+$/g, ""))) add(series, s);
  return { exact, series: series.filter((s) => s.length >= 2 && /\d/.test(s)) };
}

// Typed text inside a LIKE pattern matches literally.
function likeLiteral(s) {
  return String(s).replace(/[\\%_]/g, (c) => "\\" + c);
}

function tradeScope(trade) {
  return trade ? { where: "p.trade = ?", binds: [trade] } : { where: "1 = 1", binds: [] };
}

/**
 * The catalogue product a line names, or null.
 * @returns {Promise<null | {product, confidence, matchType, otherMaker?}>}
 *   otherMaker (with product null) when the model exists only under a
 *   different maker than the line names.
 */
export async function matchProductFromDb(component, env, trade = "doors") {
  const db = env.DB;
  const { manufacturer, model, catalog_number, modelFull } = component;
  const modelSearch = String(model || catalog_number || "").toUpperCase().trim();
  const mfgSearch = String(manufacturer || "").toUpperCase().trim();
  if (!modelSearch) return null;
  if (isByOthers(manufacturer, modelFull || model || catalog_number)) return null;
  try {
    const data = await getManufacturers(env);
    const makerIds = mfgSearch ? [...resolveMakerIds(mfgSearch, data)] : [];
    const namedMaker = !!mfgSearch;
    const knownMaker = makerIds.length > 0;
    const scope = tradeScope(trade);
    const bestRow = (where, binds, orderBy) => db.prepare(`SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE ${where}
        ORDER BY CASE WHEN ${scope.where} THEN 0 ELSE 1 END, ${orderBy}
        LIMIT 1`).bind(...binds, ...scope.binds).first();
    const found = (row, confidence, matchType) => {
      if (!row) return null;
      if (!trade || row.trade === trade) return { product: row, confidence, matchType };
      return { product: row, confidence: confidence === "high" ? "medium" : confidence, matchType: `${matchType}_other_trade` };
    };
    const EXACT_ORDER = "p.display_name, p.id";
    const PREFIX_ORDER = "LENGTH(p.base_model), p.base_model, p.id";
    const IN_MAKER = `p.manufacturer_id IN (${makerIds.map(() => "?").join(",")})`;
    const exactInMaker = (s) => bestRow(`UPPER(p.base_model) = ? AND ${IN_MAKER}`, [s, ...makerIds], EXACT_ORDER);
    const exactAnyMaker = (s) => bestRow("UPPER(p.base_model) = ?", [s], EXACT_ORDER);
    const { exact, series } = modelCandidates(modelSearch, modelFull);

    // A typed first word that is not a maker is often part of the model:
    // "Royal 111", "Hardware Pack SLSS2" are catalogue models with spaces.
    if (namedMaker && !knownMaker) {
      for (const s of withFinishTrimmed(`${mfgSearch} ${String(modelFull || modelSearch).toUpperCase()}`.replace(/\s+/g, " ").trim())) {
        const hit = found(await exactAnyMaker(s), "high", "exact");
        if (hit) return hit;
      }
    }

    if (knownMaker) {
      for (const s of exact) {
        const hit = found(await exactInMaker(s), "high", "exact");
        if (hit) return hit;
      }
      for (const s of series) {
        const hit = found(await exactInMaker(s), "medium", "series");
        if (hit) return hit;
      }
      if (looksLikeModel(modelSearch) && modelSearch.length >= 3) {
        const hit = found(await bestRow(`UPPER(p.base_model) LIKE ? ESCAPE '\\' AND ${IN_MAKER}`, [`${likeLiteral(exact[exact.length - 1] || modelSearch)}%`, ...makerIds], PREFIX_ORDER), "medium", "partial");
        if (hit) return hit;
      }
    }

    if (namedMaker) {
      // Rule 1: a line that names a maker never gets another maker's product.
      for (const s of exact) {
        const other = await exactAnyMaker(s);
        if (other) return { product: null, confidence: null, matchType: null, otherMaker: { id: other.id, manufacturer: other.manufacturer_name, model: other.base_model, name: other.display_name || null } };
      }
      return null;
    }

    // No maker on the line: the model alone, exact, then a cautious prefix.
    for (const s of exact) {
      const hit = found(await exactAnyMaker(s), "high", "exact");
      if (hit) return hit;
    }
    if (!looksLikeModel(modelSearch) || modelSearch.length < 4 || /^\d{1,4}$/.test(modelSearch)) return null;
    return found(await bestRow("UPPER(p.base_model) LIKE ? ESCAPE '\\'", [`${likeLiteral(modelSearch)}%`], PREFIX_ORDER), "low", "partial");
  } catch (err) {
    console.error("Product match error:", err);
    return null;
  }
}

// ---------------------------------------------------------------- citations

export async function getCutSheetsForProduct(productId, env) {
  try {
    const docs = await env.DB.prepare(`
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

// Every cut_sheet row's r2_object_key is one of a few full manufacturer price
// books; the only per-product page information is in document_title ("...
// around pp.6-48 ...", "... p.33 ..."; Ives and Glynn-Johnson rows say
// "p.None"). Never invents a page.
export function parsePageHint(title) {
  if (!title || typeof title !== "string") return null;
  const m = title.match(/\bpp?\.\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?/i);
  if (!m) return null;
  const first = parseInt(m[1], 10);
  if (!Number.isFinite(first) || first < 1) return null;
  const last = m[2] ? parseInt(m[2], 10) : null;
  return { hint: last && last !== first ? `${first}-${last}` : String(first), firstPage: first, lastPage: last && last > first ? last : first };
}

export function cutSheetCitation(cs) {
  const parsed = parsePageHint(cs.document_title);
  const hasPdf = !!(cs.r2_object_key && String(cs.r2_object_key).trim());
  let pageUrl = null;
  if (hasPdf) {
    pageUrl = `/api/cut-sheets/sheet/${encodeURIComponent(cs.id)}/pdf`;
    if (parsed) pageUrl += `#page=${parsed.firstPage}`;
  }
  return { pageHint: parsed ? parsed.hint : null, pageUrl };
}

// When no cut sheet is filed: the catalogue pages that mention the model,
// non-price-book titles first. A citation without a stored PDF stays a
// citation (title + page), never a dead link.
export async function getCataloguePagesForModel(manufacturerName, model, env, limit = 3) {
  const token = String(model || "").replace(/["'*^]/g, "").trim();
  if (!token || token.length < 2) return [];
  try {
    const rows = await env.DB.prepare(
      "SELECT c.catalogue_id, c.title, c.manufacturer, p.page_num FROM catalogue_pages_fts f " +
      "JOIN catalogue_pages p ON p.rowid = f.rowid JOIN catalogues c ON c.catalogue_id = p.catalogue_id " +
      "WHERE catalogue_pages_fts MATCH ? AND (? = '' OR lower(c.manufacturer) = lower(?)) " +
      "ORDER BY (c.title LIKE '%Price Book%') ASC, p.page_num ASC LIMIT ?"
    ).bind('"' + token + '"', manufacturerName || "", manufacturerName || "", limit).all();
    const out = [];
    for (const r of rows.results || []) {
      let pageUrl = null, storageKey = null;
      try {
        const cat = await env.DB.prepare("SELECT catalogue_id, storage_path, source_filename FROM catalogues WHERE catalogue_id = ?").bind(r.catalogue_id).first();
        const cachedKey = "catalogues/" + r.catalogue_id + "/pages/page_" + r.page_num + ".pdf";
        if (env.UPLOADS && (await env.UPLOADS.head(cachedKey))) storageKey = cachedKey;
        else if (cat) storageKey = await resolveCatalogueKey(env, cat);
        if (storageKey) pageUrl = "/api/cps/catalogues/" + encodeURIComponent(r.catalogue_id) + "/pages/" + r.page_num + "/render";
      } catch (e) { /* no link rather than a guessed one */ }
      out.push({ catalogueId: r.catalogue_id, title: r.title, manufacturer: r.manufacturer, pageNum: r.page_num, pageUrl, pdfAvailable: !!pageUrl, storageKey, singlePage: !!(storageKey && /\/pages\/page_\d+\.pdf$/.test(storageKey)) });
    }
    return out;
  } catch (e) {
    console.warn("[matcher] catalogue page fallback failed:", e.message);
    return [];
  }
}

/** One line -> {matched, product, cutSheets[], cataloguePages[], confidence, matchType, byOthers?, otherMaker?}. */
export async function matchComponentToCutSheets(component, env) {
  const byOthers = isByOthers(component.manufacturer, component.modelFull || component.model || component.catalog_number);
  const match = byOthers ? null : await matchProductFromDb(component, env);
  if (!match || !match.product) {
    return {
      matched: false,
      component,
      product: null,
      cutSheets: [],
      confidence: null,
      matchType: null,
      ...(byOthers ? { byOthers: true } : {}),
      ...(match && match.otherMaker ? { otherMaker: match.otherMaker } : {}),
    };
  }
  const cutSheets = await getCutSheetsForProduct(match.product.id, env);
  const cataloguePages = cutSheets.length ? [] : await getCataloguePagesForModel(match.product.manufacturer_name, match.product.base_model, env);
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
      adaCompliant: match.product.ada_compliant,
    },
    // Every pre-existing key is kept (the homepage reads matched/confidence/
    // matchType/product/cutSheets[].title/.pages); pageHint/pageUrl added.
    cutSheets: cutSheets.map((cs) => ({
      id: cs.id,
      title: cs.document_title,
      type: cs.document_type,
      url: cs.document_url,
      r2Key: cs.r2_object_key,
      bucket: cs.r2_bucket,
      pages: cs.page_count,
      ...cutSheetCitation(cs),
    })),
    confidence: match.confidence,
    matchType: match.matchType,
  };
}

// ---------------------------------------------------------------- printed spec lines

const UOM_CELL = /^(?:EA\.?|EACH|SET|SETS|PR|PAIR|PAIRS|PC|PCS|LF|LOT)$/i;
// Finishes as specs print them: BHMA numbers (626, 630, 643e), US codes
// (US26D), powder-coat codes (SP28) and the short finish words schedules use.
// A letters-only cell counts only when it is one of those words, so the end
// of a catalog number ("4040XP EDA", "20-057 ICX") is never taken for one.
const FINISH_CODE = /^(?:US\d{1,2}[A-Z]?|\d{3}[A-Z]?|SP\d{1,3})$/i;
const FINISH_WORDS = new Set(["DBZ", "GRY", "GREY", "GRAY", "BK", "BLK", "BLACK", "AL", "ALUM", "AA", "A", "D", "CLR", "CLEAR", "PRIME", "PRIMED", "PC", "WHT", "WHITE", "BRZ", "BRONZE", "SS", "STL", "BRS", "BRASS", "DURO", "DKB", "MILL", "ANOD", "SAT", "SN", "PN", "ORB", "MB"]);
const isFinishCell = (t) => FINISH_CODE.test(t) || FINISH_WORDS.has(String(t).toUpperCase());
// The catalog number starts at the first token shaped like one: letters and
// digits together (SL11, 8190HD, 5BB1HW, EPT10), three or more digits (8200,
// 4040XP), or digits joined by - or / (20-057, 1191-4, QEL-99-EO).
const MODEL_START = /^(?=.*\d)(?:[A-Z0-9]*[A-Z][A-Z0-9]*\d|\d[A-Z0-9]*[A-Z]|\d{3,}|[A-Z0-9]+[-\/][A-Z0-9-\/]+)/i;

/** The maker a printed cell names: an industry code or a catalogue name. */
export function isMakerCell(cell, knownNames) {
  const c = String(cell || "").trim();
  if (!c) return false;
  if (/^B\/?O$/i.test(c)) return true;
  if (MAKER_CODES[c.toUpperCase()]) return true;
  return !!(knownNames && knownNames.has(c.toLowerCase()));
}

/**
 * A line as 08 71 00 sections and hardware schedules print it:
 *   [QTY] [EA] DESCRIPTION CATALOG-NUMBER [FINISH] MAKER
 * e.g. "1 EA PUSH PLATE 8200 4" X 16" 630 IVE". cells: the line split on its
 * separators (tabs, pipes) or on spaces. Returns null when the last cell is
 * not a maker, so "Manufacturer Model" lines are left to the caller.
 */
export function parsePrintedSpecLine(cells, knownNames = null) {
  const c = cells.map((x) => String(x).trim()).filter(Boolean);
  if (c.length < 3) return null;
  let makerWords = 0;
  if (isMakerCell(c[c.length - 1], knownNames)) makerWords = 1;
  else if (c.length >= 4 && knownNames && knownNames.has((c[c.length - 2] + " " + c[c.length - 1]).toLowerCase())) makerWords = 2;
  if (!makerWords) return null;
  const manufacturer = c.slice(c.length - makerWords).join(" ");
  let rest = c.slice(0, c.length - makerWords);
  let qty = null, uom = null;
  if (/^\d{1,4}$/.test(rest[0]) && rest.length > 1) { qty = parseInt(rest.shift(), 10); }
  if (rest.length > 1 && UOM_CELL.test(rest[0])) uom = rest.shift().toUpperCase().replace(/\.$/, "");
  // A cell (not a space-split token) may hold the whole catalog number.
  const start = rest.findIndex((t, i) => i > 0 && MODEL_START.test(t));
  const s = start >= 0 ? start : rest.findIndex((t) => MODEL_START.test(t));
  if (s < 0) {
    // Nothing shaped like a model: a "BY OTHERS" or "BY DIVISION 28" line.
    const text = rest.join(" ");
    return { manufacturer, model: rest[0] || "", modelFull: text, description: null, finish: null, qty, uom, printed: true };
  }
  let catalog = rest.slice(s);
  let finish = null;
  if (catalog.length >= 2 && isFinishCell(catalog[catalog.length - 1])) finish = catalog.pop();
  const description = rest.slice(0, s).join(" ") || null;
  const modelFull = catalog.join(" ");
  const model = modelFull.split(/\s+/)[0];
  return { manufacturer, model, modelFull, description, finish, qty, uom, printed: true };
}

/**
 * A stored component (SubX hardware_components: manufacturer as printed,
 * model / catalog_number holding the whole catalog cell) as a matcher line.
 */
export function componentLine(c) {
  const full = String(c.model || c.catalog_number || "").replace(/\s+/g, " ").trim();
  return { manufacturer: c.manufacturer || undefined, model: full.split(" ")[0] || "", modelFull: full || undefined };
}
