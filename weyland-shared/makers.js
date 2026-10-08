// weyland-shared/makers.js
//
// Who made it: the one place the WeylandAI matchers turn a maker as a spec
// prints it (a DHI code at the end of a line, "IVE"; a name, "Ives"; a
// catalogue slug, "glynn-johnson") into the manufacturer rows of weyland_db.
// Shared by weyland-cutsheetx-worker (the paste matcher, the Finder) and
// weyland-subx-worker (the submittal packet) through
// ../../weyland-shared/makers.js, like security-headers.js.
//
// Three sources, in this order:
//   1. MAKER_CODES: the two-to-four-letter codes hardware schedules print in
//      their MFR column, with the maker's name. The list covers makers the
//      catalogue does not hold (Select Hinges, dormakaba, RCI ...) on purpose:
//      a line that names one of them is a plain miss, never another maker's
//      product.
//   2. manufacturer_aliases (live D1 table): alias -> manufacturer id.
//   3. manufacturers (live D1 table): name and slug, compared after
//      normalisation (letters and digits only, lower case), so "Glynn Johnson",
//      "GLYNN-JOHNSON" and "glynn-johnson" are one maker.
//
// resolveMaker never guesses: a word it cannot place is reported as not a
// maker it knows (known: false, realMaker: false), and the matcher decides
// what that means for the line.

/** Industry (DHI-style) maker codes as hardware schedules print them. */
export const MAKER_CODES = Object.freeze({
  ABH: "ABH Manufacturing",
  ADA: "Adams Rite",
  ALT: "Altronix",
  ARR: "Arrow Lock",
  BEA: "BEA",
  BES: "Best Access",
  BOM: "Bommer",
  BUR: "Burns Manufacturing",
  CAL: "Cal-Royal",
  CAM: "Camden Door Controls",
  CEC: "Ceco Door",
  COR: "Corbin Russwin",
  CUR: "Curries",
  DET: "Detex",
  DJO: "Don-Jo",
  DOR: "dormakaba",
  DYK: "Dyke Industries",
  FAL: "Falcon",
  GJ: "Glynn-Johnson",
  GLY: "Glynn-Johnson",
  GRI: "GRI (George Risk Industries)",
  HAG: "Hager",
  HES: "HES",
  HIA: "Hiawatha",
  HOR: "Horton Automatics",
  IVE: "Ives",
  IVES: "Ives",
  KAB: "Kaba",
  LCN: "LCN",
  LOC: "Locknetics",
  MAR: "Markar",
  MCK: "McKinney",
  MED: "Medeco",
  NAT: "National Guard Products",
  NGP: "National Guard Products",
  NOR: "Norton",
  PDQ: "PDQ",
  PEM: "Pemko",
  PRE: "Precision Hardware",
  RCI: "RCI (Rutherford Controls)",
  REE: "Reese",
  RIX: "Rixson",
  ROC: "Rockwood",
  SAR: "Sargent",
  SGT: "Sargent",
  SC: "Steelcraft",
  SCE: "Schlage Electronics",
  SCH: "Schlage",
  SDC: "Security Door Controls",
  SEC: "Securitron",
  SEL: "Select Hinges",
  STA: "Stanley",
  STE: "Steelcraft",
  TRI: "Trimco",
  TRM: "Trimco",
  VD: "Von Duprin",
  VDP: "Von Duprin",
  VON: "Von Duprin",
  YAL: "Yale",
  ZER: "Zero International",
  ZERO: "Zero International",
});

/** Normalised names of real door-hardware makers (so a line naming one is never read as a model). */
export const REAL_MAKERS = new Set([
  ...Object.values(MAKER_CODES).map((n) => normalizeMaker(n)),
  "allegion", "assaabloy", "dorma", "dormakabausa", "kabailco", "select", "selecthinges", "trimco", "rockwoodmanufacturing",
  "mckinneyhinges", "pemkomanufacturing", "nationalguard", "zero", "zerointernational", "glynnjohnson", "ives", "iveshardware",
  "lcnclosers", "vonduprin", "schlagelockcompany", "schlagelock", "sargentmanufacturing", "corbin", "russwin", "corbinrusswin",
  "yalesecurity", "yalelocks", "securitron", "hesinnovations", "adamsrite", "detex", "norton", "nortondoorcontrols", "rixson",
  "hager", "hagercompanies", "bommerindustries", "markar", "stanleyhardware", "bestaccess", "bestaccesssystems", "rci",
  "rutherfordcontrols", "altronix", "georgerisk", "gri", "camden", "camdendoorcontrols", "beainc", "hortonautomatics", "stanleyaccess",
  "lcn", "schlage", "sargent", "falcon", "steelcraft", "ceco", "curries", "dyke", "dykeindustries", "pemko", "trimcohardware",
]);

/** Letters and digits only, lower case: "Glynn-Johnson" -> "glynnjohnson". */
export function normalizeMaker(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// BHMA/US finish codes as hardware schedules print them in the FINISH column.
// A finish is never a product.
const FINISH_WORDS = new Set([
  "blk", "black", "gry", "grey", "gray", "al", "alum", "aluminum", "clr", "clear", "mill", "ss", "sst", "pc", "prime", "primed",
  "dkb", "dkbrz", "brz", "bronze", "brn", "brown", "wht", "white", "gold", "brass", "chrome", "nickel", "oil", "orb",
  "sp28", "spblk", "sp313", "313an", "sp4", "sp10b", "mtblk", "stat", "dkbz", "satin", "bright", "anodized",
]);
// The BHMA 600 series (605 bright brass ... 626 satin chrome, 630 satin stainless, 689 aluminum
// paint ...). The 700 series is left out: it is rare on schedules and NGP numbers thresholds 713BR.
const BHMA_FINISH_RE = /^6\d\d[A-Z]{0,2}$/;
const US_FINISH_RE = /^US\d{1,2}[A-Z]{0,2}$/;

/** True when the token is a finish code (626, 630, US26D, 689, BLK ...), not a model. */
export function isFinishCode(token) {
  const t = String(token == null ? "" : token).trim().toUpperCase();
  if (!t) return false;
  if (BHMA_FINISH_RE.test(t) || US_FINISH_RE.test(t)) return true;
  return FINISH_WORDS.has(t.toLowerCase());
}

/** True when the whole string is a finish, possibly two of them ("626 630", "689/630"). */
export function isFinishOnly(s) {
  const parts = String(s == null ? "" : s).trim().split(/[\s\/,]+/).filter(Boolean);
  return parts.length > 0 && parts.every(isFinishCode);
}

// ---------------------------------------------------------------- live index

let _index = { at: 0, value: null, promise: null };
const INDEX_TTL_MS = 600000;

/**
 * The manufacturers and aliases of weyland_db, cached per isolate for ten
 * minutes. Shape: { rows: [{id, name, slug, norm, normSlug}], aliases: Map(UPPER alias -> id),
 * names: [every name, slug, alias and code a line might start with] }.
 * A missing aliases table (older databases, test fixtures) leaves aliases empty.
 */
export async function getMakerIndex(env) {
  const now = Date.now();
  if (_index.value && now - _index.at < INDEX_TTL_MS) return _index.value;
  if (!_index.promise) {
    _index.promise = buildIndex(env)
      .then((value) => { _index = { at: Date.now(), value, promise: null }; return value; })
      .catch((err) => { _index.promise = null; console.error("[makers] index:", err && err.message || err); return _index.value || emptyIndex(); });
  }
  return _index.promise;
}

/** Drops the cached index (tests). */
export function resetMakerIndex() { _index = { at: 0, value: null, promise: null }; }

function emptyIndex() {
  return finishIndex([], new Map());
}

async function buildIndex(env) {
  const rows = [];
  const r = await env.DB.prepare("SELECT id, name, slug FROM manufacturers").all();
  for (const m of r.results || []) {
    if (!m || !m.id) continue;
    rows.push({ id: String(m.id), name: String(m.name || ""), slug: String(m.slug || ""), norm: normalizeMaker(m.name), normSlug: normalizeMaker(m.slug) });
  }
  const aliases = new Map();
  try {
    const a = await env.DB.prepare("SELECT alias, manufacturer_id FROM manufacturer_aliases").all();
    for (const row of a.results || []) {
      if (row && row.alias && row.manufacturer_id) aliases.set(String(row.alias).toUpperCase().trim(), String(row.manufacturer_id));
    }
  } catch (e) { /* no alias table: codes come from MAKER_CODES */ }
  return finishIndex(rows, aliases);
}

function finishIndex(rows, aliases) {
  const names = new Set();
  for (const m of rows) { if (m.name) names.add(m.name); if (m.slug) names.add(m.slug); }
  for (const alias of aliases.keys()) names.add(alias);
  for (const [code, name] of Object.entries(MAKER_CODES)) { names.add(code); names.add(name); }
  return { rows, aliases, names: [...names] };
}

/** An index built from plain rows (tests and callers that already hold the tables). */
export function makerIndexFrom(rows, aliasPairs = []) {
  const aliases = new Map();
  for (const [alias, id] of aliasPairs) aliases.set(String(alias).toUpperCase().trim(), String(id));
  return finishIndex((rows || []).map((m) => ({ id: String(m.id), name: String(m.name || ""), slug: String(m.slug || ""), norm: normalizeMaker(m.name), normSlug: normalizeMaker(m.slug) })), aliases);
}

/**
 * Place a maker as a line names it.
 * Returns { typed, name, code, ids, known, realMaker }:
 *   typed     the text as given (null when nothing was given)
 *   name      the maker's name (the catalogue's when known, the code's otherwise, else the text)
 *   code      the DHI code when the text was one
 *   ids       the manufacturer ids this maker has in the catalogue (several when the
 *             catalogue holds the maker under more than one row)
 *   known     ids.length > 0: the catalogue holds this maker
 *   realMaker true when the text is a maker we can name (a code, a catalogue row, or a
 *             known door-hardware maker the catalogue lacks); false for a word we cannot place
 */
export function resolveMaker(index, typed) {
  const raw = String(typed == null ? "" : typed).replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  if (!raw) return { typed: null, name: null, code: null, ids: [], known: false, realMaker: false };
  const upper = raw.toUpperCase();
  const code = Object.prototype.hasOwnProperty.call(MAKER_CODES, upper) ? upper : null;
  const canonical = code ? MAKER_CODES[code] : null;
  const target = normalizeMaker(canonical || raw);
  const ids = new Set();
  const idx = index || emptyIndex();
  const aliasId = idx.aliases.get(upper);
  if (aliasId) ids.add(aliasId);
  for (const [alias, id] of idx.aliases) if (normalizeMaker(alias) === target) ids.add(id);
  if (target) {
    for (const m of idx.rows) {
      if (m.norm === target || m.normSlug === target) { ids.add(m.id); continue; }
      if (target.length >= 4 && (m.norm.startsWith(target) || m.normSlug.startsWith(target))) { ids.add(m.id); continue; }
      // "LCN Closers" typed for the row named "LCN"; "Zero International" for "Zero".
      if (m.norm.length >= 3 && target.startsWith(m.norm) && target.length - m.norm.length <= 14) ids.add(m.id);
    }
  }
  // The catalogue's own spelling when it holds the maker, else the code's name, else the text.
  let name = null;
  if (ids.size) {
    const first = idx.rows.find((m) => ids.has(m.id) && m.name);
    name = first ? first.name : null;
  }
  if (!name) name = canonical || raw;
  const realMaker = !!code || ids.size > 0 || REAL_MAKERS.has(target);
  return { typed: raw, name, code, ids: [...ids], known: ids.size > 0, realMaker };
}
