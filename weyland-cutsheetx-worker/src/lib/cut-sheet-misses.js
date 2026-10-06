// src/lib/cut-sheet-misses.js
//
// Added 2026-10-04 alongside POST /api/cut-sheets/match-batch. Three
// small, dependency-free helpers shared by routes/cut-sheet-match.js and
// routes/cut-sheet-coverage.js:
//
//   parseSpecText(text)   - turns pasted schedule text into match lines
//   recordMisses(env, []) - anonymized upsert into cut_sheet_misses
//   kvRateLimit(env, ...) - best-effort fixed-window limiter on the
//                           worker's existing CACHE KV namespace
//
// PRIVACY CONTRACT for recordMisses (do not loosen): the only two values
// that ever reach D1 are the lowercased, trimmed manufacturer and model
// strings of a line that did NOT match. No user id, no ephemeral id, no
// IP, no raw pasted text, no timestamps finer than datetime('now') on the
// aggregate row. The table exists so coverage gaps can be seen in
// aggregate (GET /api/cut-sheets/coverage top_missed), nothing else.
//
// Schema (applied with wrangler d1 execute, CREATE TABLE IF NOT EXISTS
// only - see ../../migrations/cut-sheet-misses.sql). This module does NOT
// run DDL at request time.

const SEPARATOR_RE = /[\t|,;]/;

// Lines whose tokens are all (or whose first token is, with no digits
// anywhere in the line) one of these are treated as column headers from a
// pasted spreadsheet / hardware schedule and skipped.
const HEADER_WORDS = new Set([
  "mfr", "mfg", "mfgr", "manufacturer", "manuf", "brand", "make",
  "model", "model#", "modelno", "modelnumber", "part", "part#", "partno",
  "partnumber", "catalog", "catalog#", "catalogno", "catalognumber", "cat", "cat#",
  "qty", "quantity", "ea", "each", "count",
  "description", "desc", "item", "items", "mark", "no", "no.", "#", "line",
  "type", "category", "finish", "notes", "note", "spec", "specification",
  "product", "products", "hardware", "set", "set#", "heading",
]);

// Two-word manufacturer names that would otherwise be split as
// "Manufacturer Model" by the whitespace rule.
// Words that follow a quantity ("2 ea", "4 pcs") and are not a manufacturer.
const UNIT_WORDS = new Set(["ea", "each", "x", "pc", "pcs", "piece", "pieces", "set", "sets", "unit", "units", "pr", "pair", "pairs"]);

// Three-word manufacturer names (static fallback; the live manufacturers table, passed in by
// the route, is the real source and covers names added later).
const THREE_WORD_MANUFACTURERS = new Set([
  "national guard products", "camden door controls", "best access systems", "bea inc.", "bea inc",
  "dorma kaba usa", "assa abloy group", "allegion schlage lock", "stanley security solutions",
]);

const TWO_WORD_MANUFACTURERS = new Set([
  "von duprin", "glynn johnson", "glynn-johnson", "best access", "dorma kaba",
  "stanley security", "rockwood manufacturing", "national guard", "zero international",
  "allegion schlage", "assa abloy", "hes assa", "securitron assa", "adams rite",
  "lcn closers", "ives hardware", "trimco hardware", "pemko manufacturing",
]);

function normToken(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9#.]/g, "");
}

function isHeaderLine(tokens, line) {
  const norm = tokens.map(normToken).filter(Boolean);
  if (norm.length === 0) return true;
  if (norm.every((t) => HEADER_WORDS.has(t))) return true;
  if (HEADER_WORDS.has(norm[0]) && !/\d/.test(line)) return true;
  return false;
}

function isQtyToken(t) {
  return /^\d{1,4}(?:\s*(?:ea|x|pcs?))?$/i.test(String(t).trim());
}

/**
 * Parse pasted text into [{raw, manufacturer, model}] - one spec per line.
 * Separators: comma / tab / pipe / semicolon, or plain whitespace for
 * "Manufacturer Model" two-token lines. Blank and header-like lines are
 * skipped. `raw` is the original line (trimmed) so the caller can echo
 * it back; it is never persisted by this module.
 */
// knownManufacturers: optional array of manufacturer names/slugs from the catalogue; the
// longest prefix of a line that equals one of them (up to four words) is the manufacturer.
export function parseSpecText(text, knownManufacturers = null) {
  if (typeof text !== "string") return [];
  const known = new Set();
  if (Array.isArray(knownManufacturers)) {
    for (const n of knownManufacturers) {
      const k = String(n || "").toLowerCase().replace(/[.,]+$/, "").replace(/\s+/g, " ").trim();
      if (k) known.add(k);
    }
  }
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    let cols;
    if (SEPARATOR_RE.test(line)) {
      cols = line.split(SEPARATOR_RE).map((c) => c.trim().replace(/^"|"$/g, "").trim()).filter(Boolean);
    } else {
      cols = line.split(/\s+/).filter(Boolean);
    }
    if (cols.length === 0) continue;
    if (isHeaderLine(cols, line)) continue;
    // Drop a leading quantity column ("2", "2 ea", "12x") and the unit word after it.
    while (cols.length > 1 && isQtyToken(cols[0])) {
      cols.shift();
      if (cols.length > 1 && UNIT_WORDS.has(String(cols[0]).toLowerCase())) cols.shift();
    }
    // Drop a leading mark/line-number column like "1." or "A3" only when
    // there are still at least two meaningful columns after it.
    if (cols.length >= 3 && /^(?:\d{1,3}\.?|[a-z]\d{0,2}\.?)$/i.test(cols[0])) cols.shift();

    let manufacturer = null;
    let model = null;
    let modelFull = null;
    if (cols.length === 1) {
      model = cols[0];
    } else {
      // Longest known manufacturer prefix first (live table, then the static sets), so
      // "National Guard Products SL-SQ24-96" is not read as National Guard / Products.
      let used = 0;
      for (let n = Math.min(4, cols.length - 1); n >= 2 && !used; n--) {
        const cand = cols.slice(0, n).join(" ").toLowerCase().replace(/[.,]+$/, "");
        if (known.has(cand) || (n === 3 && THREE_WORD_MANUFACTURERS.has(cand)) || (n === 2 && TWO_WORD_MANUFACTURERS.has(cand))) used = n;
      }
      if (!used) {
        // First token is not a manufacturer we know. If it looks like a model number the whole
        // line is a model-only line ("DW16/MU16 10'0\" thru 10'6\"", "US-1B MATT BLACK").
        const first = String(cols[0]);
        const firstLooksLikeModel = /\d/.test(first) || /^[A-Z]{2,}[-\/.][A-Z0-9]+$/i.test(first);
        if (known.size && firstLooksLikeModel && !known.has(first.toLowerCase())) {
          manufacturer = null;
          model = cols[0];
          modelFull = cols.join(" ");
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
    model = String(model || "").trim();
    if (!model) continue;
    modelFull = String(modelFull || model).trim();
    out.push({ raw: line, manufacturer: manufacturer ? String(manufacturer).trim() : null, model, modelFull: modelFull !== model ? modelFull : undefined });
  }
  return out;
}

export function normalizeMissKey(s) {
  return String(s == null ? "" : s).toLowerCase().trim().replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Upsert one aggregate row per (manufacturer, model) pair. Both values are
 * lowercased+trimmed; nothing else is stored. Errors are swallowed (a
 * missing table must never break a match response) but logged.
 */
export async function recordMisses(env2, misses) {
  if (!env2?.DB || !Array.isArray(misses) || misses.length === 0) return;
  const seen = new Map();
  for (const m of misses) {
    const manufacturer = normalizeMissKey(m?.manufacturer);
    const model = normalizeMissKey(m?.model);
    if (!model) continue;
    const key = `${manufacturer}\u0000${model}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  if (seen.size === 0) return;
  const stmt = env2.DB.prepare(`
    INSERT INTO cut_sheet_misses (id, manufacturer, model, count, first_seen, last_seen)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(manufacturer, model) DO UPDATE SET
      count = count + excluded.count,
      last_seen = datetime('now')
  `);
  const batch = [];
  for (const [key, n] of seen) {
    const [manufacturer, model] = key.split("\u0000");
    batch.push(stmt.bind(crypto.randomUUID(), manufacturer, model, n));
  }
  try {
    await env2.DB.batch(batch);
  } catch (err) {
    console.error("[cut_sheet_misses] upsert failed:", err?.message || err);
  }
}

/**
 * Best-effort fixed-window rate limiter on the worker's CACHE KV binding.
 * KV is eventually consistent, so this is abuse-dampening, not a hard
 * guarantee - good enough for a low-value write endpoint. Returns
 * { limited: boolean, remaining: number }. Fails OPEN if KV is missing or
 * errors (never blocks a real user because of infrastructure).
 *
 * The subject (user id / ephemeral id) lives only in KV with a TTL equal
 * to the window; it is never written to D1.
 */
export async function kvRateLimit(env2, scope, subject, { limit = 10, windowSeconds = 3600 } = {}) {
  if (!env2?.CACHE || !subject) return { limited: false, remaining: limit };
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const key = `rl:${scope}:${windowStart}:${subject}`;
  try {
    const current = parseInt((await env2.CACHE.get(key)) || "0", 10) || 0;
    if (current >= limit) return { limited: true, remaining: 0 };
    await env2.CACHE.put(key, String(current + 1), { expirationTtl: windowSeconds + 60 });
    return { limited: false, remaining: Math.max(0, limit - current - 1) };
  } catch (err) {
    console.error("[kvRateLimit] failing open:", err?.message || err);
    return { limited: false, remaining: limit };
  }
}
