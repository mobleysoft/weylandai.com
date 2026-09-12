import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

test("GET /health answers directly without touching the route table", async () => {
  const res = await worker.fetch(new Request("https://example.com/health"), {}, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "weyland-market-intelligence-worker");
});

test("unknown path falls through to the router's real 404, not a silent 200", async () => {
  const res = await worker.fetch(new Request("https://example.com/api/nope"), { FRED_API_KEY: "x" }, {});
  assert.equal(res.status, 404);
});

test("a real market-intelligence route (ForecastX, no external fetch needed) works end-to-end through the top-level fetch handler", async () => {
  const req = new Request("https://example.com/api/forecastx/project", {
    method: "POST",
    body: JSON.stringify({ contract_value: 12000, duration_months: 12 }),
  });
  const res = await worker.fetch(req, { FRED_API_KEY: "x" }, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.projection.months.length, 12);
});
