// src/lib/cut-sheet-misses.js
//
// Added 2026-10-04 alongside POST /api/cut-sheets/match-batch. Helpers shared
// by routes/cut-sheet-match.js and routes/cut-sheet-coverage.js:
//
//   parseSpecText(text)   - turns pasted schedule text into match lines
//                           (2026-10-08: the parser is ../../../weyland-shared/
//                           spec-lines.js, shared with the submittal packet;
//                           parseSpecLines also returns the lines it skipped)
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

export { parseSpecText, parseSpecLines, lineFromComponent } from "../../../weyland-shared/spec-lines.js";

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
