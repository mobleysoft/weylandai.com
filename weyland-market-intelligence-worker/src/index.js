// weyland-market-intelligence-worker/src/index.js
//
// Real, independently-deployed Cloudflare Worker. First extraction of the
// microservices push described in MICROSERVICES_PUSH.md - converts the
// "X-tool" market-intelligence route cluster (previously
// src/routes/market-intelligence.js inside the weylandai.com monolith,
// registered directly into weyland.worker.js's route table) into its own
// service, wired back into the main worker via a Service Binding
// (env.MARKET_INTELLIGENCE), the same pattern already proven live by
// weyland-ocr-worker.
//
// Owns exactly 6 routes, all public (no auth):
//   GET  /api/pricex/materials
//   GET  /api/marketx/trends
//   GET  /api/compx/vendors
//   GET  /api/weatherx/delay-risk
//   POST /api/forecastx/project
//   GET  /api/geox/lookup
//
// 2026-09-12, two corrections same day (full history in
// src/routes/market-intelligence.js's top comment and wrangler.toml):
// PriceX/MarketX's production 502s traced to a dead FRED_API_KEY secret
// calling FRED's keyed JSON API live, per-request. First fix cached
// FRED's free, keyless CSV export in D1 instead - reverted the same day
// on John's broader, direct correction that the product must not depend
// on ANY external party's service, keyed or not. PriceX now computes its
// pricing index from ONLY this account's own first-party door-hardware
// catalog data (env.WEYLAND_DB, a read-only second D1 binding to
// weyland_db - see wrangler.toml), refreshed weekly by the scheduled()
// handler below into this worker's own price_index_snapshots table
// (env.DB). MarketX has no first-party substitute yet and is honestly
// retired (501) rather than faked or left externally dependent.
// CompX/WeatherX/ForecastX/GeoX are unchanged and still stateless.

import { NativeRouter } from "./lib/router.js";
import { registerMarketIntelligenceRoutes, computePriceIndexSnapshot } from "./routes/market-intelligence.js";

const router = new NativeRouter();
registerMarketIntelligenceRoutes(router);

// Daily pre-warm (wrangler.toml [triggers], second cron) - per direct
// instruction (2026-10-05) no visitor request should be the first to hit
// Census or NWS for a location we already hold. Every distinct
// projects.project_address in the real weyland_db (read-only WEYLAND_DB
// binding) is resolved through this Worker's own GeoX route and then its
// WeatherX route, which store their answers in the D1 store cache
// (src/lib/store-cache.js). Bounded per run; errors are logged, never thrown.
const PREWARM_CRON = "30 5 * * *";
async function prewarmProjectLocations(env, ctx) {
  const summary = { addresses: 0, geocoded: 0, forecasts: 0, failed: 0 };
  const rows = await env.WEYLAND_DB.prepare(
    "SELECT DISTINCT project_address FROM projects WHERE project_address IS NOT NULL AND TRIM(project_address) != '' LIMIT 60"
  ).all();
  for (const row of rows.results || []) {
    summary.addresses++;
    try {
      const geo = await router.handle(new Request("https://weylandai.com/api/geox/lookup?address=" + encodeURIComponent(row.project_address)), env, ctx);
      if (!geo || geo.status !== 200) { summary.failed++; continue; }
      const g = await geo.json();
      summary.geocoded++;
      if (g.latitude != null && g.longitude != null) {
        const wx = await router.handle(new Request("https://weylandai.com/api/weatherx/delay-risk?lat=" + g.latitude + "&lon=" + g.longitude), env, ctx);
        if (wx && wx.status === 200) summary.forecasts++; else summary.failed++;
      }
    } catch (e) {
      summary.failed++;
      console.warn("[prewarm-locations]", row.project_address, e.message);
    }
  }
  return summary;
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Own health check, answered directly - not part of the extracted
    // route table, so it can't collide with any real market-intelligence
    // path (all of which live under /api/*).
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "weyland-market-intelligence-worker" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return router.handle(request, env, ctx);
  },

  // Cron Trigger (see wrangler.toml [triggers]) - weekly recompute of
  // PriceX's pricing index straight from this account's own weyland_db
  // catalog tables (env.WEYLAND_DB) into this worker's own
  // price_index_snapshots table (env.DB). Zero external network calls -
  // both are this same Cloudflare account's own D1 databases. Runs
  // independent of any customer request, so PriceX never blocks on this
  // computation. Errors are logged, not thrown - a failed run leaves last
  // week's real snapshot serving rather than breaking the route.
  async scheduled(event, env, ctx) {
    if (event.cron === PREWARM_CRON) {
      ctx.waitUntil(
        prewarmProjectLocations(env, ctx)
          .then((result) => console.log("[prewarm-locations] ok:", JSON.stringify(result)))
          .catch((err) => console.error("[prewarm-locations] failed:", err.message))
      );
      return;
    }
    ctx.waitUntil(
      computePriceIndexSnapshot(env)
        .then((result) => console.log("[price-index-snapshot] ok:", JSON.stringify(result)))
        .catch((err) => console.error("[price-index-snapshot] failed:", err.message))
    );
  },
};
