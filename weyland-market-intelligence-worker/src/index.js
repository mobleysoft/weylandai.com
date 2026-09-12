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
// 2026-09-12: PriceX/MarketX no longer require FRED_API_KEY or any live
// external call at request time. Root cause of their production 502s was
// a dead/unregistered FRED_API_KEY secret calling the keyed
// api.stlouisfed.org JSON API live, per-request. Per John's directive
// that the product not depend on a live external key for slow-changing
// public data (PPI/construction/housing figures are only published
// monthly by BLS/FRED anyway), both routes now read from the fred_series_cache
// D1 table (binding: DB - see wrangler.toml), kept current by the
// scheduled() cron handler below using FRED's free, keyless fredgraph.csv
// export. CompX/WeatherX/ForecastX/GeoX are unchanged and still stateless.

import { NativeRouter } from "./lib/router.js";
import { registerMarketIntelligenceRoutes, refreshFredCache } from "./routes/market-intelligence.js";

const router = new NativeRouter();
registerMarketIntelligenceRoutes(router);

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

  // Cron Trigger (see wrangler.toml [triggers]) - weekly re-pull of all 5
  // FRED series from the keyless fredgraph.csv export into D1. Runs
  // independent of any customer request, so PriceX/MarketX never block on
  // or fail from a live external call. Errors are logged, not thrown -
  // a failed refresh leaves last week's real cached data serving, which is
  // strictly better than a 502 (this was the whole point of the cache).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      refreshFredCache(env)
        .then((result) => console.log("[fred-cache-refresh] ok:", JSON.stringify(result)))
        .catch((err) => console.error("[fred-cache-refresh] failed:", err.message))
    );
  },
};
