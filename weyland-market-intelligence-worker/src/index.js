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
// Owns exactly 6 routes, all public (no auth), all stateless (no D1/KV/R2):
//   GET  /api/pricex/materials
//   GET  /api/marketx/trends
//   GET  /api/compx/vendors
//   GET  /api/weatherx/delay-risk
//   POST /api/forecastx/project
//   GET  /api/geox/lookup
// Requires one secret: FRED_API_KEY (set independently on this Worker -
// see wrangler.toml's header comment for why it isn't inherited).

import { NativeRouter } from "./lib/router.js";
import { registerMarketIntelligenceRoutes } from "./routes/market-intelligence.js";

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
};
