// weyland-huntx-worker/src/routes/hunt.js
//
// Ported verbatim (not rewritten from memory) from
// ../../../src/routes/hunt.js as part of the 2026-09-12 microservices
// push's HuntX extraction - the first "requires real auth + D1" service
// boundary, following weyland-market-intelligence-worker (public routes,
// no D1) as the first, simpler extraction. registerHuntRoutes/
// fetchTxdotOpportunities/fetchCaOpscOpportunities and both routes
// (POST /api/hunt/refresh, GET /api/hunt/opportunities) are byte-for-byte
// identical to the monolith's copy - only this file's own header comment
// and the two import paths below changed (same relative shape, now
// pointing at this Worker's own forked ../lib/auth.js and
// ../lib/json-response.js instead of the monolith's). The monolith's
// copy of this file is intentionally left in place and still registered
// in src/module-registry.js - this extraction does not remove it (see
// this Worker's wrangler.toml for why: the Cloudflare zone route added
// for HuntX takes precedence over whatever the monolith still serves,
// so both copies existing is safe, not a live conflict).
//
// Original header follows, preserved for provenance:

import { jsonResponse3 } from "../lib/json-response.js";
import { requireProductAccess } from "../lib/auth.js";
import { ingestSources, lastIngest } from "../lib/ingest.js";

/**
 * Route bodies below are unmodified from the original bundle except:
 * esbuild's cosmetic `__name(...)` calls stripped (function .name is
 * already correct - see src/README.md for why other extracted modules
 * do the same). fetchTxdotOpportunities/fetchCaOpscOpportunities had
 * their only call site inside /api/hunt/refresh below, so they're
 * inlined here as local private helpers.
 *
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerHuntRoutes(router, { authenticate }) {
  // POST /api/hunt/refresh no longer waits on TxDOT / CA OPSC. Per direct
  // instruction (2026-10-05) nothing a visitor triggers may depend on a call
  // outside the conglomerate: the sources are pulled by scheduled() (see
  // ../lib/ingest.js); this route only reports the index and, for an
  // authenticated caller, kicks one background ingest without waiting on it.
  router.post("/api/hunt/refresh", async (request2, env2, ctx) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(ingestSources(env2).catch((e) => console.error("[HuntX Ingest] background run failed:", e)));
      const count = await env2.DB.prepare("SELECT COUNT(*) as n FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({ success: true, indexed: count?.n || 0, lastIngest: last || null, note: "sources are pulled on a schedule; the index is what you are reading" });
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
      const q = url.searchParams.get("q");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 300);
      let where = "WHERE 1=1";
      const params = [];
      if (source) { where += " AND source = ?"; params.push(source); }
      if (q) { where += " AND (title LIKE ? OR agency LIKE ? OR location LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      const result = await env2.DB.prepare(
        `SELECT id, source, title, agency, location, category, status, key_date, estimated_value, detail_url, fetched_at
         FROM opportunities ${where} ORDER BY key_date ASC LIMIT ?`
      ).bind(...params, limit).all();
      const lastFetch = await env2.DB.prepare("SELECT MAX(fetched_at) as t FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({ opportunities: result.results || [], lastFetchedAt: lastFetch?.t || null, lastIngest: last || null });
    } catch (error5) {
      console.error("[HuntX List] Error:", error5);
      return jsonResponse3({ error: "Failed to list opportunities", details: error5.message }, 500);
    }
  });
}
