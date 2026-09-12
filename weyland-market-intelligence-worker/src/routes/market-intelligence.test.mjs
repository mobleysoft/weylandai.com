import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMarketIntelligenceRoutes } from "./market-intelligence.js";

function setup() {
  const router = new NativeRouter();
  registerMarketIntelligenceRoutes(router);
  return { router, env: { FRED_API_KEY: "test-key" } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

function fredObsResponse(values) {
  return new Response(JSON.stringify({
    observations: values.map((v, i) => ({ date: `2026-0${(i % 9) + 1}-01`, value: String(v) })),
  }), { status: 200 });
}

test("GET /api/pricex/materials: real happy path returns FRED-derived material pricing", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /api\.stlouisfed\.org/);
    return fredObsResponse(Array.from({ length: 13 }, (_, i) => 100 + i));
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.materials.length, 3);
  assert.equal(body.source, "FRED (Federal Reserve Bank of St. Louis)");
  assert.equal(body.materials[0].latest_value, 100);
});

test("GET /api/pricex/materials: a FRED fetch failure surfaces as a real 502", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error_code: 400, error_message: "bad series" }), { status: 400 });
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 502);
});

test("GET /api/marketx/trends: real happy path classifies trend direction", async () => {
  globalThis.fetch = async () => fredObsResponse([110, 105, ...Array(10).fill(90), 100]);
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/marketx/trends"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.indicators.length, 3);
  assert.ok(["rising", "falling", "flat", "unknown"].includes(body.indicators[0].trend));
});

test("GET /api/compx/vendors: 400 when q param missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/compx/vendors"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/compx/vendors: real happy path aggregates vendor win rate", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /data\.texas\.gov/);
    return new Response(JSON.stringify([
      { vendor_name: "Acme Construction", low_bidder_flag: true, bid_total_amount: "100000", project_name: "P1", county: "Travis", project_actual_let_date: "2026-01-01", control_section_job_csj: "csj1" },
      { vendor_name: "Acme Construction", low_bidder_flag: false, bid_total_amount: "90000", project_name: "P2", county: "Travis", project_actual_let_date: "2026-02-01", control_section_job_csj: "csj2" },
    ]), { status: 200 });
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/compx/vendors?q=Acme"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.vendors.length, 1);
  assert.equal(body.vendors[0].total_bids, 2);
  assert.equal(body.vendors[0].wins, 1);
  assert.equal(body.vendors[0].win_rate_pct, 50);
});

test("GET /api/weatherx/delay-risk: 400 when lat/lon missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/weatherx/delay-risk"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/weatherx/delay-risk: real happy path classifies delay risk from NWS forecast", async () => {
  globalThis.fetch = async (url) => {
    if (url.includes("/points/")) {
      return new Response(JSON.stringify({ properties: { forecast: "https://api.weather.gov/gridpoints/X/1,1/forecast", cwa: "AUS" } }), { status: 200 });
    }
    return new Response(JSON.stringify({
      properties: {
        periods: [
          { name: "Tonight", temperature: 70, temperatureUnit: "F", shortForecast: "Thunderstorms", probabilityOfPrecipitation: { value: 80 }, windSpeed: "20 mph" },
          { name: "Tomorrow", temperature: 75, temperatureUnit: "F", shortForecast: "Sunny", probabilityOfPrecipitation: { value: 5 }, windSpeed: "5 mph" },
        ],
      },
    }), { status: 200 });
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/weatherx/delay-risk?lat=30.27&lon=-97.74"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.high_risk_periods, 1);
  assert.equal(body.periods[0].delay_risk, "high");
  assert.equal(body.periods[1].delay_risk, "low");
});

test("POST /api/forecastx/project: 400 for invalid contract_value", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/forecastx/project", { method: "POST", body: JSON.stringify({ contract_value: -1, duration_months: 6 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/forecastx/project: real happy path computes a deterministic cash-flow projection", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/forecastx/project", {
    method: "POST",
    body: JSON.stringify({ contract_value: 120000, duration_months: 12, retainage_pct: 10, payment_terms_days: 30, start_date: "2026-01-01" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.projection.months.length, 12);
  assert.equal(body.projection.monthly_billing, 10000);
  assert.equal(body.projection.months[0].retainage_held, 1000);
});

test("GET /api/geox/lookup: 400 when address missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/geox/lookup"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/geox/lookup: 404 when Census geocoder has no match", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ result: { addressMatches: [] } }), { status: 200 });
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/geox/lookup?address=nowhere"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/geox/lookup: real happy path returns matched geography", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /geocoding\.geo\.census\.gov/);
    return new Response(JSON.stringify({
      result: {
        addressMatches: [{
          matchedAddress: "123 Main St, Austin, TX",
          coordinates: { x: -97.74, y: 30.27 },
          geographies: {
            Counties: [{ NAME: "Travis County", GEOID: "48453" }],
            States: [{ NAME: "Texas" }],
            "Census Tracts": [{ GEOID: "48453001100" }],
          },
        }],
      },
    }), { status: 200 });
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/geox/lookup?address=123+Main+St"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.county_name, "Travis County");
  assert.equal(body.census_tract_geoid, "48453001100");
});
