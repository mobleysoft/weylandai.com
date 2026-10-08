// weyland-shared/spec-lines.js
//
// Reading hardware lines the way specs print them (2026-10-08), for every
// WeylandAI matcher: the homepage paste and POST /api/cut-sheets/match-batch
// (weyland-cutsheetx-worker), the CutsheetX MATCH form, and the submittal
// packet's hardware components (weyland-subx-worker).
//
// A Division 08 hardware group prints
//
//   Hardware Group No. 06 CL
//    109.1   109.2   111.1 ...                      <- the doors it serves
//   QTY  DESCRIPTION      CATALOG NUMBER  FINISH MFR  <- the column header
//   1 EA CLOSER, HOLD OPEN 4040XP H / HEDA - AS 689 LCN
//                                   REQUIRED         <- a wrapped tail
//
// so each item line is QTY, unit, DESCRIPTION, CATALOG NUMBER, FINISH, MFR.
// The catalogue number starts at the first token that carries a digit (a
// dimension like 4-1/2 X 4-1/2 is not one), the maker is the code at the
// end (SEL, SCH, LCN, IVE, VON, ZER, GLY ...), the finish is the code before
// it. The heading, the door list, the column header and wrapped tails are
// skipped, with the reason, instead of being scored as misses. A comma
// inside a description ("CLOSER, HOLD OPEN") never splits the line.
//
// Lines typed as "Maker Model" (the homepage placeholder), "Model" alone,
// "Maker, Model", "Maker<TAB>Model<TAB>note" and "2 ea Maker Model" keep
// working exactly as before (tools/accuracy/match_accuracy.mjs measures
// them against the live API).
//
// The parser never touches a database: knownManufacturers is the list of
// names, slugs, aliases and codes the caller got from makers.js.

import { MAKER_CODES, isFinishCode, normalizeMaker } from "./makers.js";

const SEPARATOR_RE = /[\t|;]/;

// Column headers of a pasted spreadsheet or hardware schedule.
const HEADER_WORDS = new Set([
  "mfr", "mfg", "mfgr", "manufacturer", "manuf", "brand", "make", "man", "mfr.", "mfg.",
  "model", "model#", "modelno", "modelnumber", "part", "part#", "partno", "partnumber",
  "catalog", "catalog#", "catalogno", "catalognumber", "catalogue", "cat", "cat#", "number", "no", "no.", "#",
  "qty", "qty.", "quantity", "ea", "each", "count", "unit", "uom", "u/m",
  "description", "desc", "item", "items", "mark", "line", "type", "category", "finish", "fin", "fin.",
  "notes", "note", "spec", "specification", "product", "products", "hardware", "set", "set#", "heading",
  "list", "price", "net", "ext", "extension", "total",
]);

// Units after a quantity.
const UNIT_RE = /^(?:ea|each|pr|prs|pair|pairs|set|sets|pc|pcs|piece|pieces|lf|ft|unit|units)\.?$/i;

// Headings a hardware section prints above its items.
const HEADING_RES = [
  /^(?:hardware|hw|hdw|finish hardware)\s*(?:group|set|heading|schedule)\b/i,
  /^(?:group|set|heading)\s*(?:no\.?|#|number)?\s*[:\-]?\s*[A-Z0-9]/i,
  /^door\s*#/i,
  /^doors?\b\s*[:#-]/i,
  /^(?:for|each to have|provide|opening|openings|location|locations|mark|marks)\b\s*[:\-]?\s/i,
];

// A spec section footer: "FINISH HARDWARE 087100-7", "DOOR HARDWARE 08 71 00 - 3".
const FOOTER_RE = /^[A-Z][A-Z /&-]{2,40}\b0\s?8\s?\d{2}\s?\d{2}(?:\s?-\s?\d{1,2})?$/i;

// A door mark: 109.1, 128.1.1, 100B, A101, 101A, 1423, P1-1.
const DOOR_MARK_RE = /^[A-Z]{0,2}\d{1,4}[A-Z]?(?:[.-]\d{1,3}){0,3}[A-Z]?$/i;
const DOTTED_MARK_RE = /^\d{1,4}(?:\.\d{1,3}){1,3}$/;

// A dimension token: 10", 4-1/2, 1-3/4", 36", 4.5, 7'2"
const DIM_RE = /^\d{1,3}(?:[-.\/]\d{1,3})*(?:["”″'’′]|IN\.?|MM)?$/i;
const DIM_UNIT_RE = /(?:["”″'’′]|IN\.?|MM)$/i;

const THREE_WORD_MANUFACTURERS = new Set([
  "national guard products", "camden door controls", "best access systems", "bea inc.", "bea inc",
  "dorma kaba usa", "assa abloy group", "allegion schlage lock", "stanley security solutions",
]);
const TWO_WORD_MANUFACTURERS = new Set([
  "von duprin", "glynn johnson", "glynn-johnson", "best access", "dorma kaba",
  "stanley security", "rockwood manufacturing", "national guard", "zero international",
  "allegion schlage", "assa abloy", "hes assa", "securitron assa", "adams rite",
  "lcn closers", "ives hardware", "trimco hardware", "pemko manufacturing", "select hinges",
]);

function normToken(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9#.\/]/g, "");
}

function isHeaderLine(tokens, line) {
  const norm = tokens.map(normToken).filter(Boolean);
  if (norm.length === 0) return true;
  if (norm.every((t) => HEADER_WORDS.has(t))) return true;
  if (HEADER_WORDS.has(norm[0]) && !/\d/.test(line) && norm.length <= 8) return true;
  return false;
}

// A quantity: up to 999 ("1705 5-LITE SSB" is a model, not 1,705 of something).
function isQtyToken(t) {
  return /^\d{1,3}(?:\s*(?:ea|x|pcs?))?$/i.test(String(t).trim());
}

// What may follow a quantity for it to be one: a unit, a maker we know, or a model-like token.
function qtyFollowedByProduct(cols, sets) {
  const next = cols[1];
  if (!next) return false;
  if (UNIT_RE.test(next)) return true;
  if (/^X$/i.test(next)) return false;
  for (let n = Math.min(4, cols.length - 2); n >= 1; n--) if (isKnownMakerPhrase(cols.slice(1, 1 + n).join(" "), sets)) return true;
  return /\d/.test(next) || /^[A-Z]{2,}[-\/.][A-Z0-9]+$/i.test(next);
}

function isMakerCode(t) {
  const u = String(t || "").toUpperCase().replace(/[.,;:]+$/, "");
  return /^[A-Z]{2,5}$/.test(u) && Object.prototype.hasOwnProperty.call(MAKER_CODES, u);
}

function knownSetFrom(knownManufacturers) {
  const known = new Set();
  const normed = new Set();
  if (Array.isArray(knownManufacturers)) {
    for (const n of knownManufacturers) {
      const k = String(n || "").toLowerCase().replace(/[.,]+$/, "").replace(/\s+/g, " ").trim();
      if (k) { known.add(k); normed.add(normalizeMaker(k)); }
    }
  }
  for (const name of Object.values(MAKER_CODES)) { known.add(name.toLowerCase()); normed.add(normalizeMaker(name)); }
  for (const code of Object.keys(MAKER_CODES)) { known.add(code.toLowerCase()); normed.add(normalizeMaker(code)); }
  return { known, normed };
}

function isKnownMakerPhrase(phrase, sets) {
  const k = String(phrase || "").toLowerCase().replace(/[.,]+$/, "").replace(/\s+/g, " ").trim();
  if (!k) return false;
  if (sets.known.has(k) || sets.normed.has(normalizeMaker(k))) return true;
  const n = k.split(" ").length;
  return (n === 3 && THREE_WORD_MANUFACTURERS.has(k)) || (n === 2 && TWO_WORD_MANUFACTURERS.has(k));
}

function isDimension(tokens, k) {
  const t = tokens[k];
  if (!DIM_RE.test(t)) return false;
  if (DIM_UNIT_RE.test(t)) return true;
  const prev = tokens[k - 1], next = tokens[k + 1];
  if (next && /^X$/i.test(next)) return true;
  if (prev && /^X$/i.test(prev)) return true;
  if (next && /^(?:HIGH|WIDE|LONG|THICK|HIGH\.|GA|GA\.|GAUGE|DEG|DEGREE|DEGREES)$/i.test(next)) return true;
  return false;
}

// The first token of the catalogue number: it carries a digit and is not a size.
function looksLikeCatalogToken(tokens, k) {
  const t = tokens[k];
  if (!/\d/.test(t)) return false;
  if (isDimension(tokens, k)) return false;
  return true;
}

function isDoorList(tokens, sets) {
  if (tokens.length === 1) return DOTTED_MARK_RE.test(tokens[0]);
  if (tokens.length < 2 || tokens.length > 40) return false;
  if (tokens.some((t) => isKnownMakerPhrase(t, sets) || isMakerCode(t))) return false;
  return tokens.every((t) => DOOR_MARK_RE.test(t));
}

/**
 * A spec-style item line: "1 EA CLOSER, HOLD OPEN 4040XP H / HEDA - AS 689 LCN".
 * Returns null when the line is not shaped like one.
 */
function parseSpecStyle(line, sets) {
  let s = line;
  let qty = null, hadQty = false;
  const q = /^(\d{1,3})\s*(?:(ea|each|pr|prs|pair|pairs|set|sets|pc|pcs|lf|ft)\b\.?)?\s+(.+)$/i.exec(s);
  if (q) { qty = parseInt(q[1], 10); hadQty = true; s = q[3]; }
  let tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  let maker = null, makerCode = null, finish = null;
  // The maker: a code at the end, or a known name (one to three words) at the end.
  const last = tokens[tokens.length - 1];
  if (isMakerCode(last)) {
    makerCode = last.toUpperCase().replace(/[.,;:]+$/, "");
    maker = MAKER_CODES[makerCode];
    tokens.pop();
  } else {
    for (let n = Math.min(3, tokens.length - 1); n >= 1 && !maker; n--) {
      const cand = tokens.slice(-n).join(" ");
      if (!/\d/.test(cand) && isKnownMakerPhrase(cand, sets)) { maker = cand.replace(/[.,;:]+$/, ""); tokens.splice(-n); }
    }
  }
  if (!maker && !hadQty) return null;
  // "2 ea Schlage L9080 626", "2 ea National Guard Products Hardware Pack SLSS2": a maker we know
  // right after the quantity and no maker at the end; the rest of the line is its catalogue number.
  if (!maker && hadQty) {
    for (let n = Math.min(4, tokens.length - 1); n >= 1; n--) {
      const cand = tokens.slice(0, n).join(" ");
      if (/\d/.test(cand) || !(isKnownMakerPhrase(cand, sets) || (n === 1 && isMakerCode(cand)))) continue;
      const code = n === 1 && isMakerCode(cand) ? cand.toUpperCase() : null;
      const catalog = tokens.slice(n);
      // A finish word at the end is noted but stays in the catalogue number: some models end in
      // one ("10-LITE PRIMED"), and the matcher tries the line with and without its tail.
      const fin = catalog.length > 1 && isFinishCode(catalog[catalog.length - 1]) ? catalog[catalog.length - 1] : null;
      return {
        raw: line,
        manufacturer: code ? MAKER_CODES[code] : cand.replace(/[.,;:]+$/, ""),
        makerCode: code || undefined,
        model: catalog[0].replace(/[,;:]+$/, ""),
        modelFull: catalog.length > 1 ? catalog.join(" ") : undefined,
        qty: qty == null ? undefined : qty,
        finish: fin || undefined,
        kind: "spec",
      };
    }
  }

  // The finish: the code before the maker (or at the end of a qty line with no maker).
  // A one- or two-letter token there is a finish too when a maker follows it (Zero's A, D, BK).
  if (tokens.length > 1) {
    const f = tokens[tokens.length - 1];
    if (isFinishCode(f) || (maker && /^[A-Z]{1,2}$/.test(f) && tokens.length > 2 && /\d/.test(tokens.slice(0, -1).join(" ")))) {
      finish = f;
      tokens.pop();
    }
  }
  if (tokens.length === 0) return null;

  // Where the catalogue number starts.
  let i = tokens.findIndex((t, k) => looksLikeCatalogToken(tokens, k));
  let description, catalog;
  if (i < 0) {
    if (!maker && !hadQty) return null;
    description = tokens.join(" ");
    catalog = [];
  } else {
    description = tokens.slice(0, i).join(" ");
    catalog = tokens.slice(i);
  }
  // A maker named right before the catalogue number ("... Ives 5BB1HW 4.5 x 4.5 652",
  // "DOOR POSITION SWITCHES GRI 180-12-W").
  if (!maker && i > 0) {
    for (let n = Math.min(3, i); n >= 1 && !maker; n--) {
      const cand = tokens.slice(i - n, i).join(" ");
      if (isMakerCode(cand) && n === 1) { makerCode = cand.toUpperCase(); maker = MAKER_CODES[makerCode]; description = tokens.slice(0, i - n).join(" "); }
      else if (isKnownMakerPhrase(cand, sets)) { maker = cand.replace(/[.,;:]+$/, ""); description = tokens.slice(0, i - n).join(" "); }
    }
  }
  if (catalog.length === 0 && !hadQty) return null;
  // The catalogue number stays as typed (some models contain commas or colour words); only the
  // model token loses punctuation that ends it.
  const model = catalog.length ? catalog[0].replace(/[,;:]+$/, "") : "";
  const modelFull = catalog.join(" ");
  return {
    raw: line,
    manufacturer: maker || null,
    makerCode: makerCode || undefined,
    model,
    modelFull: modelFull && modelFull !== model ? modelFull : undefined,
    description: description || undefined,
    qty: qty == null ? undefined : qty,
    finish: finish || undefined,
    kind: "spec",
    noModel: model ? undefined : true,
  };
}

/**
 * Parse pasted text into { lines, skipped }.
 *   lines:   [{ raw, manufacturer|null, model, modelFull?, description?, qty?, finish?, makerCode?, kind, tentative? }]
 *   skipped: [{ raw, reason }]  reason: heading | doors | header | wrapped
 * A `tentative` line (words without a digit and without a maker we know) is tried as a
 * model, and the caller lists it as wrapped text when nothing matches.
 */
export function parseSpecLines(text, knownManufacturers = null) {
  const out = { lines: [], skipped: [] };
  if (typeof text !== "string") return out;
  const sets = knownSetFrom(knownManufacturers);
  for (const rawLine of text.split(/\r?\n/)) {
    // `raw` is the line as pasted (trimmed), so a caller can match answers back to its text;
    // the parse works on the line with its runs of spaces collapsed.
    const raw = rawLine.trim();
    const tabbed = SEPARATOR_RE.test(raw);
    const line = tabbed ? raw : raw.replace(/\s+/g, " ");
    if (!line) continue;
    if (HEADING_RES.some((re) => re.test(line))) { out.skipped.push({ raw, reason: "heading" }); continue; }
    // A spec section footer: "FINISH HARDWARE 087100-7".
    if (!tabbed && FOOTER_RE.test(line)) { out.skipped.push({ raw, reason: "footer" }); continue; }

    let cols;
    if (tabbed) {
      cols = line.split(SEPARATOR_RE).map((c) => c.trim().replace(/^"|"$/g, "").trim()).filter(Boolean);
    } else {
      cols = line.split(/\s+/).filter(Boolean);
    }
    if (cols.length === 0) continue;
    if (isHeaderLine(cols, line)) { out.skipped.push({ raw, reason: "header" }); continue; }
    if (!tabbed && isDoorList(cols, sets)) { out.skipped.push({ raw, reason: "doors" }); continue; }

    // A spec-style item line: quantity first, or a maker code at the end.
    if (!tabbed) {
      const spec = parseSpecStyle(line, sets);
      if (spec && (spec.manufacturer || spec.qty != null) && (spec.model || spec.noModel)) {
        // A quantity line with a known maker first ("2 ea Schlage L9080") is a Maker Model line.
        if (!spec.noModel || spec.manufacturer) { spec.raw = raw; out.lines.push(spec); continue; }
      }
    }

    // A comma separates maker and model only when a maker we know stands before it
    // ("Schlage, L9080"); any other comma is part of the model or description.
    let manufacturer = null, model = null, modelFull = null, tentative = false;
    if (!tabbed && line.includes(",")) {
      const at = line.indexOf(",");
      const head = line.slice(0, at).trim(), rest = line.slice(at + 1).trim();
      if (head && rest && isKnownMakerPhrase(head, sets)) {
        const restCols = rest.split(/\s+/).filter(Boolean);
        out.lines.push({ raw, manufacturer: head, model: restCols[0].replace(/[,;:]+$/, ""), modelFull: restCols.length > 1 ? restCols.join(" ") : undefined, kind: "maker_model" });
        continue;
      }
    }

    // Drop a leading quantity column ("2", "2 ea", "12x") and the unit word after it, when a
    // product follows it ("6 PNL TEXT FG" and "10 X 1 1/2" are models, not quantities).
    while (cols.length > 1 && isQtyToken(cols[0]) && qtyFollowedByProduct(cols, sets)) {
      cols.shift();
      if (cols.length > 1 && UNIT_RE.test(String(cols[0]))) cols.shift();
    }
    // Drop a leading mark/line-number column like "1." or "A3" only when a maker we know
    // follows it ("1. Schlage L9080"); "F16 Over 8" thru 12" face" is a model.
    if (cols.length >= 3 && /^(?:\d{1,3}\.?|[a-z]\d{0,2}\.?)$/i.test(cols[0])) {
      for (let n = Math.min(4, cols.length - 2); n >= 1; n--) {
        if (isKnownMakerPhrase(cols.slice(1, 1 + n).join(" "), sets)) { cols.shift(); break; }
      }
    }

    if (cols.length === 1) {
      model = cols[0];
      if (!/\d/.test(model) && !isKnownMakerPhrase(model, sets)) tentative = true;
    } else {
      // Longest known manufacturer prefix first (live table, then the static sets), so
      // "National Guard Products SL-SQ24-96" is not read as National Guard / Products.
      let used = 0;
      for (let n = Math.min(4, cols.length - 1); n >= 1 && !used; n--) {
        const cand = cols.slice(0, n).join(" ");
        if (isKnownMakerPhrase(cand, sets)) used = n;
      }
      if (!used) {
        const first = String(cols[0]);
        const firstLooksLikeModel = /\d/.test(first) || /^[A-Z]{2,}[-\/.][A-Z0-9]+$/i.test(first);
        if (firstLooksLikeModel) {
          // "DW16/MU16 10'0\" thru 10'6\"", "US-1B MATT BLACK": the whole line is a model.
          manufacturer = null;
          model = cols[0];
          modelFull = cols.join(" ");
        } else if (!/\d/.test(line)) {
          // Words only, no maker we know: wrapped text, or a catalogue model made of words
          // ("CLEAR IG", "POCKET FRAME"). Tried as a model; listed as wrapped when nothing matches.
          manufacturer = null;
          model = cols[0];
          modelFull = cols.join(" ");
          tentative = true;
        } else {
          used = 1;
        }
      }
      if (used) {
        manufacturer = cols.slice(0, used).join(" ");
        model = cols[used];
        modelFull = cols.slice(used).join(" ");
      }
    }
    // Punctuation that ends the model token is not part of it ("L9080, 626" -> L9080); the rest
    // of the line keeps its commas, which some catalogue models contain ("9500 X 2525 B, C, W").
    model = String(model || "").trim().replace(/[,;:]+$/, "");
    if (!model) continue;
    modelFull = String(modelFull || model).trim();
    const entry = { raw, manufacturer: manufacturer ? String(manufacturer).trim().replace(/[.,;:]+$/, "") : null, model, modelFull: modelFull !== model ? modelFull : undefined, kind: manufacturer ? "maker_model" : "model_only" };
    if (tentative) entry.tentative = true;
    out.lines.push(entry);
  }
  return out;
}

/** The lines only (the contract the match routes used before skipped lines were reported). */
export function parseSpecText(text, knownManufacturers = null) {
  return parseSpecLines(text, knownManufacturers).lines;
}

/**
 * A stored hardware component (hardware_components: quantity, component_type,
 * manufacturer, model, catalog_number, finish) read with the same rules as a
 * printed line, so maker codes, finishes and sizes in the stored text are
 * handled once. The stored manufacturer wins when the text names none.
 */
export function lineFromComponent(component, knownManufacturers = null) {
  if (!component) return null;
  const str = (v) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
  const catalog = str(component.catalog_number) || str(component.model) || str(component.model_number);
  const description = str(component.description) || str(component.component_type).replace(/_/g, " ");
  const mfr = str(component.manufacturer) || str(component.manufacturer_code);
  if (!catalog && !description) return null;
  const qty = Number.isFinite(Number(component.quantity)) && Number(component.quantity) > 0 ? Math.round(Number(component.quantity)) : 1;
  const text = [qty, "EA", description, catalog, str(component.finish), mfr].filter(Boolean).join(" ");
  const parsed = parseSpecLines(text, knownManufacturers).lines[0] || null;
  if (!parsed) return null;
  if (!parsed.manufacturer && mfr) parsed.manufacturer = mfr;
  if (!parsed.model && catalog && /\d/.test(catalog)) {
    // The parser read the whole catalogue number as a size; keep the stored text as the model.
    const toks = catalog.split(/\s+/);
    parsed.model = toks[0];
    parsed.modelFull = toks.length > 1 ? catalog : undefined;
    parsed.noModel = undefined;
  }
  parsed.raw = [qty + " EA", description, catalog, str(component.finish), mfr].filter(Boolean).join(" ");
  parsed.component = component;
  return parsed;
}
