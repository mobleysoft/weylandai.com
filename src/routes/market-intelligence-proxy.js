// src/routes/market-intelligence-proxy.js
//
// Replaces the in-process registerMarketIntelligenceRoutes(router) call
// (formerly ./market-intelligence.js, now moved to
// ../../weyland-market-intelligence-worker/src/routes/market-intelligence.js
// as a real, independently-deployed Cloudflare Worker - see
// MICROSERVICES_PUSH.md). This is the gateway-side half of that
// extraction: the exact same 6 paths/methods, each forwarded verbatim to
// the new service via a Service Binding instead of running the route
// logic inline. Same pattern already proven live by OCR_SERVICE.
//
// Deliberately registers each path/method explicitly (not a wildcard
// prefix match) so that if a 7th market-intelligence-shaped route is ever
// added to legacy-monolith.js by mistake instead of to the standalone
// worker, it does NOT silently get proxied somewhere unexpected - it 404s
// here exactly as it would if this file didn't exist, forcing a real
// decision about which side it belongs on.

const ROUTES = [
  ["get", "/api/pricex/materials"],
  ["get", "/api/marketx/trends"],
  ["get", "/api/compx/vendors"],
  ["get", "/api/weatherx/delay-risk"],
  ["post", "/api/forecastx/project"],
  ["get", "/api/geox/lookup"],
];

export function registerMarketIntelligenceProxyRoutes(router) {
  for (const [method, path] of ROUTES) {
    router[method](path, async (request2, env2) => {
      return env2.MARKET_INTELLIGENCE.fetch(request2);
    });
  }
}
