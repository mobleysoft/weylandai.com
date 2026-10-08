// weyland-huntx-worker/src/routes/hunt.js
//
// HuntX's API: POST /api/hunt/refresh and GET /api/hunt/opportunities.
// Originally ported verbatim from ../../../src/routes/hunt.js (the
// monolith's copy, still registered there but unreachable: the zone route
// weylandai.com/api/hunt/* sends every request here).
//
// 2026-10-07 contract (what the HuntX page and the homepage chapter read):
//
//   GET /api/hunt/opportunities?q=&source=&limit=&offset=
//     Searches the WHOLE index server side (title, agency, location,
//     category; LIKE, case-insensitive for ASCII). Upcoming key dates first
//     (soonest first), then past ones (most recent first).
//     -> { opportunities: [...up to limit rows], total: <rows matching q/source>,
//          indexed: <rows in the index>, sources: [{source, n}], limit, offset,
//          lastFetchedAt, lastIngest: {started_at, finished_at, upserted, errors} }
//     limit defaults to 100, max 300; offset defaults to 0.
//
//   2026-10-08 additions (a door sub had to read past 671 TxDOT road jobs):
//     fit=doors|building|signal|civil|all (default all for the API; the page
//     asks for building), state=TX, due_within=<days>, min_value=<dollars>.
//     Each row carries trade_fit, trade_fit_why, state and created_at; the
//     reply carries fits: {doors, building, signal, civil} and states: [{state, n}]
//     for the whole index.
//
//   Saved searches (signed-in accounts only; a guest has nowhere to keep one).
//   Searching is free; saving a search needs payment (shared output-access.js):
//     GET    /api/hunt/saved            -> { saved: [{id, name, params, new_count, last_seen_at}] }
//     POST   /api/hunt/saved {name, params} (max 20 per account)
//     POST   /api/hunt/saved/:id/seen   marks every match as seen
//     DELETE /api/hunt/saved/:id
//     new_count is the number of matching notices that entered the index
//     after the search was last opened.
//
//   POST /api/hunt/refresh
//     Never waits on the public sources (per the 2026-10-05 instruction that
//     nothing a visitor triggers may depend on a call outside the
//     conglomerate). It starts one background pull when the last pull is at
//     least REFRESH_COOLDOWN_SECONDS old (a D1 lease, shared with the hourly
//     request-driven job, so a click and the hourly job never both run),
//     and reports the index as it stands.
//     -> { success, indexed, sources, lastIngest, pull: { started, retryAfterSeconds }, note }
//     There is no top-level "upserted": the count from the last finished
//     pull is lastIngest.upserted (the page used to read data.upserted and
//     printed "undefined opportunities updated").

import { jsonResponse3 } from "../lib/json-response.js";
import { requireProductAccess } from "../lib/auth.js";
import { ingestSources, lastIngest, ensureFitColumns } from "../lib/ingest.js";
import { tradeFit, stateOf, FIT_FILTERS } from "../lib/trade-fit.js";
import { claimJobLease } from "../lib/job-lease.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

export const REFRESH_COOLDOWN_SECONDS = 600;
export const INGEST_JOB = "huntx-ingest";

async function sourceCounts(env2) {
  const r = await env2.DB.prepare("SELECT source, COUNT(*) AS n FROM opportunities GROUP BY source ORDER BY n DESC").all();
  return (r.results || []).map((x) => ({ source: x.source, n: x.n }));
}

const SEARCH_KEYS = ["q", "source", "fit", "state", "due_within", "min_value"];
export const MAX_SAVED_SEARCHES = 20;

/** The search a URL or a saved search names, cleaned. */
export function pickSearch(get) {
  const out = {};
  for (const k of SEARCH_KEYS) {
    const v = String(get(k) ?? "").trim().slice(0, 120);
    if (v) out[k] = v;
  }
  if (out.fit && !(out.fit in FIT_FILTERS)) delete out.fit;
  if (out.state) out.state = out.state.toUpperCase().slice(0, 2);
  return out;
}

/** WHERE clause and binds for a search. source stays first in the binds. */
export function searchWhere(p, today) {
  let where = "WHERE 1=1";
  const params = [];
  if (p.source) { where += " AND source = ?"; params.push(p.source); }
  if (p.q) {
    where += " AND (title LIKE ? OR agency LIKE ? OR location LIKE ? OR category LIKE ?)";
    params.push(`%${p.q}%`, `%${p.q}%`, `%${p.q}%`, `%${p.q}%`);
  }
  const fits = p.fit ? FIT_FILTERS[p.fit] : null;
  if (fits) { where += ` AND trade_fit IN (${fits.map(() => "?").join(",")})`; params.push(...fits); }
  if (p.state) { where += " AND state = ?"; params.push(p.state); }
  const days = parseInt(p.due_within, 10);
  if (Number.isFinite(days) && days > 0) {
    const until = new Date(Date.parse(today) + Math.min(days, 3650) * 86400000).toISOString().slice(0, 10);
    where += " AND key_date >= ? AND key_date <= ?";
    params.push(today, until);
  }
  const min = Number(p.min_value);
  if (Number.isFinite(min) && min > 0) { where += " AND estimated_value >= ?"; params.push(min); }
  return { where, params };
}

// Rows written before trade fit existed get classified on read, 500 at a time.
export async function backfillFit(env2) {
  await ensureFitColumns(env2);
  let r;
  try {
    r = await env2.DB.prepare("SELECT id, source, title, category, location, raw_data FROM opportunities WHERE trade_fit IS NULL LIMIT 500").all();
  } catch (_) { return 0; }
  const rows = r?.results || [];
  if (!rows.length) return 0;
  const stmt = env2.DB.prepare("UPDATE opportunities SET trade_fit = ?, trade_fit_why = ?, state = ? WHERE id = ?");
  const updates = rows.map((o) => { const f = tradeFit(o); return stmt.bind(f.fit, f.why, stateOf(o.location), o.id); });
  for (let i = 0; i < updates.length; i += 50) await env2.DB.batch(updates.slice(i, i + 50));
  return rows.length;
}

async function fitCounts(env2) {
  const out = { doors: 0, building: 0, signal: 0, civil: 0 };
  try {
    const r = await env2.DB.prepare("SELECT trade_fit AS fit, COUNT(*) AS n FROM opportunities GROUP BY trade_fit").all();
    for (const x of r?.results || []) if (x.fit in out) out[x.fit] = x.n;
  } catch (_) { /* older table */ }
  return out;
}

async function stateCounts(env2) {
  try {
    const r = await env2.DB.prepare("SELECT state, COUNT(*) AS n FROM opportunities WHERE state IS NOT NULL GROUP BY state ORDER BY n DESC").all();
    return (r?.results || []).map((x) => ({ state: x.state, n: x.n }));
  } catch (_) { return []; }
}

let savedTableReady = false;
async function ensureSavedTable(env2) {
  if (savedTableReady) return;
  await env2.DB.prepare(`CREATE TABLE IF NOT EXISTS huntx_saved_searches (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, params TEXT NOT NULL,
    last_seen_at TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  savedTableReady = true;
}
export function resetSavedTableForTests() { savedTableReady = false; }

async function lastLeaseAt(env2) {
  try {
    const row = await env2.DB.prepare("SELECT ran_at FROM job_runs WHERE job = ?").bind(INGEST_JOB).first();
    return row && row.ran_at ? row.ran_at : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerHuntRoutes(router, { authenticate }) {
  router.post("/api/hunt/refresh", async (request2, env2, ctx) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      let started = false;
      let retryAfterSeconds = 0;
      const canRunInBackground = ctx && typeof ctx.waitUntil === "function";
      if (canRunInBackground && await claimJobLease(env2.DB, INGEST_JOB, REFRESH_COOLDOWN_SECONDS, "weyland-huntx-worker")) {
        ctx.waitUntil(ingestSources(env2, "refresh").catch((e) => console.error("[HuntX Ingest] refresh run failed:", e)));
        started = true;
      } else {
        const at = await lastLeaseAt(env2);
        if (at) retryAfterSeconds = Math.max(0, Math.ceil((Date.parse(at) + REFRESH_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
      }
      const count = await env2.DB.prepare("SELECT COUNT(*) as n FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({
        success: true,
        indexed: count?.n || 0,
        sources: await sourceCounts(env2),
        lastIngest: last || null,
        pull: { started, retryAfterSeconds },
        note: started
          ? "a pull from the public sources started in the background; lastIngest changes when it finishes"
          : "a pull ran recently; the index is what you are reading"
      });
    } catch (error5) {
      console.error("[HuntX Refresh] Error:", error5);
      return jsonResponse3({ error: "Failed to read the opportunity index", details: error5.message }, 500);
    }
  });

  router.get("/api/hunt/opportunities", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      const url = new URL(request2.url);
      const search = pickSearch((k) => url.searchParams.get(k));
      const limitIn = parseInt(url.searchParams.get("limit") || "100", 10);
      const limit = Math.min(Math.max(Number.isFinite(limitIn) ? limitIn : 100, 1), 300);
      const offsetIn = parseInt(url.searchParams.get("offset") || "0", 10);
      const offset = Math.min(Math.max(Number.isFinite(offsetIn) ? offsetIn : 0, 0), 100000);
      await backfillFit(env2);
      const today = new Date().toISOString().slice(0, 10);
      const { where, params } = searchWhere(search, today);
      const result = await env2.DB.prepare(
        `SELECT id, source, title, agency, location, category, status, key_date, estimated_value, detail_url, fetched_at,
                trade_fit, trade_fit_why, state, created_at
         FROM opportunities ${where}
         ORDER BY CASE WHEN key_date >= ? THEN 0 ELSE 1 END,
                  CASE WHEN key_date >= ? THEN key_date END ASC,
                  key_date DESC
         LIMIT ? OFFSET ?`
      ).bind(...params, today, today, limit, offset).all();
      const totalRow = await env2.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where}`).bind(...params).first();
      const indexedRow = Object.keys(search).length ? await env2.DB.prepare("SELECT COUNT(*) AS n FROM opportunities").first() : totalRow;
      const lastFetch = await env2.DB.prepare("SELECT MAX(fetched_at) as t FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({
        opportunities: result.results || [],
        total: totalRow?.n || 0,
        indexed: indexedRow?.n || 0,
        sources: await sourceCounts(env2),
        fits: await fitCounts(env2),
        states: await stateCounts(env2),
        limit,
        offset,
        lastFetchedAt: lastFetch?.t || null,
        lastIngest: last || null
      });
    } catch (error5) {
      console.error("[HuntX List] Error:", error5);
      return jsonResponse3({ error: "Failed to list opportunities", details: error5.message }, 500);
    }
  });

  // Saved searches. A guest session has no account to keep them on.
  async function signedIn(request2, env2) {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return { error: error4 };
    if (!user?.userId || user.ephemeral) {
      return { error: jsonResponse3({ success: false, error: "SIGN_IN_REQUIRED", message: "Sign in to save a search and see what's new in it." }, 401) };
    }
    await ensureSavedTable(env2);
    return { userId: String(user.userId) };
  }

  router.get("/api/hunt/saved", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const r = await env2.DB.prepare("SELECT id, name, params, last_seen_at, created_at FROM huntx_saved_searches WHERE user_id = ? ORDER BY created_at").bind(a.userId).all();
    const today = new Date().toISOString().slice(0, 10);
    const saved = [];
    for (const s of r?.results || []) {
      let params = {};
      try { params = JSON.parse(s.params) || {}; } catch (_) { params = {}; }
      const { where, params: binds } = searchWhere(params, today);
      const row = await env2.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where} AND created_at > ?`).bind(...binds, s.last_seen_at).first();
      saved.push({ id: s.id, name: s.name, params, last_seen_at: s.last_seen_at, new_count: row?.n || 0 });
    }
    return jsonResponse3({ success: true, saved });
  });

  router.post("/api/hunt/saved", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    let body = {};
    try { body = await request2.json(); } catch (_) { body = {}; }
    // Searching is free; keeping a search and counting what's new in it is
    // what HuntX's plan (or the $100 first submittal) pays for.
    if (!(await outputAccess(env2, a.userId, "huntx")).paid) {
      return jsonResponse3(paymentRequired("Saving searches and counting new notices in them"), 402);
    }
    const params = pickSearch((k) => body?.params?.[k]);
    const name = String(body?.name || "").trim().slice(0, 80) || "Saved search";
    const n = await env2.DB.prepare("SELECT COUNT(*) AS n FROM huntx_saved_searches WHERE user_id = ?").bind(a.userId).first();
    if ((n?.n || 0) >= MAX_SAVED_SEARCHES) {
      return jsonResponse3({ success: false, error: "TOO_MANY", message: `Up to ${MAX_SAVED_SEARCHES} saved searches; delete one first.` }, 400);
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env2.DB.prepare("INSERT INTO huntx_saved_searches (id, user_id, name, params, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, a.userId, name, JSON.stringify(params), now, now).run();
    return jsonResponse3({ success: true, saved: { id, name, params, last_seen_at: now, new_count: 0 } });
  });

  router.post("/api/hunt/saved/:id/seen", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const id = request2.params?.id || new URL(request2.url).pathname.split("/")[4];
    await env2.DB.prepare("UPDATE huntx_saved_searches SET last_seen_at = ? WHERE id = ? AND user_id = ?").bind(new Date().toISOString(), id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.delete("/api/hunt/saved/:id", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const id = request2.params?.id || new URL(request2.url).pathname.split("/")[4];
    await env2.DB.prepare("DELETE FROM huntx_saved_searches WHERE id = ? AND user_id = ?").bind(id, a.userId).run();
    return jsonResponse3({ success: true });
  });
}
