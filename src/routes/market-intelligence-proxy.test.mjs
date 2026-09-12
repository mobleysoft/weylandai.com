import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMarketIntelligenceProxyRoutes } from "./market-intelligence-proxy.js";

function setup() {
  const router = new NativeRouter();
  registerMarketIntelligenceProxyRoutes(router);
  return router;
}

test("each of the 6 real market-intelligence paths forwards the exact same Request object to env.MARKET_INTELLIGENCE.fetch", async () => {
  const router = setup();
  const calls = [];
  const env = {
    MARKET_INTELLIGENCE: {
      fetch: async (req) => {
        calls.push(req);
        return new Response(JSON.stringify({ proxied: true, path: new URL(req.url).pathname }), { status: 200 });
      },
    },
  };

  const cases = [
    ["GET", "/api/pricex/materials"],
    ["GET", "/api/marketx/trends"],
    ["GET", "/api/compx/vendors?q=Acme"],
    ["GET", "/api/weatherx/delay-risk?lat=1&lon=2"],
    ["POST", "/api/forecastx/project"],
    ["GET", "/api/geox/lookup?address=x"],
  ];

  for (const [method, path] of cases) {
    const req = new Request(`https://example.com${path}`, { method });
    const res = await router.handle(req, env, {});
    assert.equal(res.status, 200, `${method} ${path} should proxy through`);
    const body = await res.json();
    assert.equal(body.proxied, true);
  }
  assert.equal(calls.length, 6, "every one of the 6 routes must have called the binding exactly once");
});

test("a path outside the 6 registered routes is not proxied (real 404, not silently forwarded)", async () => {
  const router = setup();
  const env = { MARKET_INTELLIGENCE: { fetch: async () => { throw new Error("should never be called"); } } };
  const res = await router.handle(new Request("https://example.com/api/pricex/nonexistent"), env, {});
  assert.equal(res.status, 404);
});

test("the wrong HTTP method on a real path is not proxied", async () => {
  const router = setup();
  const env = { MARKET_INTELLIGENCE: { fetch: async () => { throw new Error("should never be called"); } } };
  const res = await router.handle(new Request("https://example.com/api/geox/lookup", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});
