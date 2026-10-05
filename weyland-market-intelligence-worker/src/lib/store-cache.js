// weyland-market-intelligence-worker/src/lib/store-cache.js
//
// Store-backed cache for the facets whose source is inherently per-request
// and outside the conglomerate (CompX: TxDOT bid tabulations by vendor
// name; GeoX: Census geocoder by address; WeatherX: NWS by lat/lon). Per
// direct instruction (2026-10-05) Weyland must not depend on calls outside
// the ecosystem to operate: once a key has been seen its answer is served
// from D1 (our store) for the TTL, and while a source is down the last
// stored answer is served with `stale: true` instead of a 502. The first
// lookup of a never-seen key is the one remaining external call; the
// response says so (`cached: false`). Table is created on first use.

const TABLE = "external_cache";

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, body TEXT NOT NULL, fetched_at TEXT NOT NULL)`).run();
}

export async function readStore(env, key) {
  try {
    await ensure(env);
    const row = await env.DB.prepare(`SELECT body, fetched_at FROM ${TABLE} WHERE key = ?`).bind(key).first();
    return row ? { body: JSON.parse(row.body), fetchedAt: row.fetched_at } : null;
  } catch (e) {
    console.warn("[store-cache] read failed:", e.message);
    return null;
  }
}

export async function writeStore(env, key, body) {
  try {
    await ensure(env);
    await env.DB.prepare(`INSERT INTO ${TABLE} (key, body, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET body = excluded.body, fetched_at = excluded.fetched_at`)
      .bind(key, JSON.stringify(body), new Date().toISOString()).run();
  } catch (e) {
    console.warn("[store-cache] write failed:", e.message);
  }
}

/**
 * Wrap a route handler. keyFn(url) -> cache key or null (null = bypass).
 * Only 200 JSON responses are stored. Served-from-store responses carry
 * `cached: true` and `stored_at`; a stale fallback carries `stale: true`.
 */
export function withStoreCache(keyFn, ttlSeconds, handler) {
  return async (request, env, ctx) => {
    let key = null;
    try { key = keyFn(new URL(request.url)); } catch (e) { key = null; }
    if (!key) return handler(request, env, ctx);
    const hit = await readStore(env, key);
    const ageOk = hit && (Date.now() - Date.parse(hit.fetchedAt)) < ttlSeconds * 1000;
    if (ageOk) {
      return new Response(JSON.stringify({ ...hit.body, cached: true, stored_at: hit.fetchedAt }), { headers: { "Content-Type": "application/json" } });
    }
    let resp;
    try { resp = await handler(request, env, ctx); } catch (e) { resp = null; }
    if (resp && resp.status === 200) {
      let body = null;
      try { body = await resp.clone().json(); } catch (e) { body = null; }
      if (body && typeof body === "object") {
        await writeStore(env, key, body);
        return new Response(JSON.stringify({ ...body, cached: false }), { headers: { "Content-Type": "application/json" } });
      }
      return resp;
    }
    if (hit) {
      return new Response(JSON.stringify({ ...hit.body, cached: true, stale: true, stored_at: hit.fetchedAt }), { headers: { "Content-Type": "application/json" } });
    }
    return resp || new Response(JSON.stringify({ detail: { message: "source unavailable and nothing stored yet for this lookup" } }), { status: 502, headers: { "Content-Type": "application/json" } });
  };
}
