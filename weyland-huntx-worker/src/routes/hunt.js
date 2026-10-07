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
import { ingestSources, lastIngest } from "../lib/ingest.js";
import { claimJobLease } from "../lib/job-lease.js";

export const REFRESH_COOLDOWN_SECONDS = 600;
export const INGEST_JOB = "huntx-ingest";

async function sourceCounts(env2) {
  const r = await env2.DB.prepare("SELECT source, COUNT(*) AS n FROM opportunities GROUP BY source ORDER BY n DESC").all();
  return (r.results || []).map((x) => ({ source: x.source, n: x.n }));
}

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
      const source = url.searchParams.get("source");
      const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
      const limitIn = parseInt(url.searchParams.get("limit") || "100", 10);
      const limit = Math.min(Math.max(Number.isFinite(limitIn) ? limitIn : 100, 1), 300);
      const offsetIn = parseInt(url.searchParams.get("offset") || "0", 10);
      const offset = Math.min(Math.max(Number.isFinite(offsetIn) ? offsetIn : 0, 0), 100000);
      let where = "WHERE 1=1";
      const params = [];
      if (source) { where += " AND source = ?"; params.push(source); }
      if (q) {
        where += " AND (title LIKE ? OR agency LIKE ? OR location LIKE ? OR category LIKE ?)";
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      const today = new Date().toISOString().slice(0, 10);
      const result = await env2.DB.prepare(
        `SELECT id, source, title, agency, location, category, status, key_date, estimated_value, detail_url, fetched_at
         FROM opportunities ${where}
         ORDER BY CASE WHEN key_date >= ? THEN 0 ELSE 1 END,
                  CASE WHEN key_date >= ? THEN key_date END ASC,
                  key_date DESC
         LIMIT ? OFFSET ?`
      ).bind(...params, today, today, limit, offset).all();
      const totalRow = await env2.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where}`).bind(...params).first();
      const indexedRow = (source || q) ? await env2.DB.prepare("SELECT COUNT(*) AS n FROM opportunities").first() : totalRow;
      const lastFetch = await env2.DB.prepare("SELECT MAX(fetched_at) as t FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({
        opportunities: result.results || [],
        total: totalRow?.n || 0,
        indexed: indexedRow?.n || 0,
        sources: await sourceCounts(env2),
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
}
