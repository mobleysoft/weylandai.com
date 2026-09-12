import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMarketIntelligenceRoutes, refreshFredCache, FRED_SERIES } from "./market-intelligence.js";

// Minimal fake D1 binding: fred_series_cache only, matching the real
// migrations/0001_fred_series_cache.sql schema (series_id, date, value,
// fetched_at) closely enough to exercise the real cachedObservations()/
// refreshFredCache() query shapes without needing an actual D1 instance.
function makeFakeD1() {
  const rows = []; // { series_id, date, value, fetched_at }
  return {
    rows,
    prepare(sql) {
      const isInsert = /^INSERT INTO fred_series_cache/i.test(sql);
      const isSelect = /^SELECT date, value, fetched_at FROM fred_series_cache/i.test(sql);
      return {
        bind(...args) {
          return {
            async run() {
              if (isInsert) {
                const [series_id, date, value, fetched_at] = args;
                const existing = rows.find((r) => r.series_id === series_id && r.date === date);
                if (existing) { existing.value = value; existing.fetched_at = fetched_at; }
                else rows.push({ series_id, date, value, fetched_at });
              }
              return { success: true };
            },
            async all() {
              if (isSelect) {
                const [series_id, limit] = args;
                const results = rows
                  .filter((r) => r.series_id === series_id)
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .slice(0, limit)
                  .map(({ date, value, fetched_at }) => ({ date, value, fetched_at }));
                return { results };
              }
              return { results: [] };
            },
          };
        },
      };
    },
    async batch(statements) {
      for (const stmt of statements) await stmt.run();
      return statements.map(() => ({ success: true }));
    },
  };
}

function setup() {
  const router = new NativeRouter();
  registerMarketIntelligenceRoutes(router);
  return { router, env: { DB: makeFakeD1() } };
}

/** Seed the fake D1 cache directly with 13 months of one series' data. */
function seedSeries(env, seriesId, values, fetchedAt = "2026-09-12T00:00:00.000Z") {
  values.forEach((v, i) => {
    const monthsAgo = values.length - 1 - i;
    const d = new Date(Date.UTC(2026, 8 - monthsAgo, 1)); // count back from Sept 2026
    env.DB.rows.push({ series_id: seriesId, date: d.toISOString().slice(0, 10), value: v, fetched_at: fetchedAt });
  });
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("GET /api/pricex/materials: real happy path returns cached FRED material pricing (no live external call)", async () => {
  globalThis.fetch = async () => { throw new Error("must not call external fetch from a customer request path"); };
  const { router, env } = setup();
  for (const key of ["construction_materials", "lumber", "metals"]) {
    seedSeries(env, FRED_SERIES[key].id, Array.from({ length: 13 }, (_, i) => 100 + i).reverse());
  }
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.materials.length, 3);
  assert.match(body.source, /D1 cache/);
  assert.equal(body.materials[0].latest_value, 100);
  assert.equal(body.materials[0].cache_fetched_at, "2026-09-12T00:00:00.000Z");
});

test("GET /api/pricex/materials: an empty cache (refresh never ran) surfaces as a real 503, not fabricated data", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 503);
});

test("GET /api/marketx/trends: real happy path classifies trend direction from cached data", async () => {
  const { router, env } = setup();
  for (const key of ["construction_spending", "housing_starts", "construction_materials"]) {
    seedSeries(env, FRED_SERIES[key].id, [110, 105, ...Array(10).fill(90), 100].reverse());
  }
  const res = await router.handle(new Request("https://example.com/api/marketx/trends"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.indicators.length, 3);
  assert.ok(["rising", "falling", "flat", "unknown"].includes(body.indicators[0].trend));
});

test("refreshFredCache: pulls all 5 series from the keyless fredgraph.csv endpoint and upserts into D1", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /fred\.stlouisfed\.org\/graph\/fredgraph\.csv/);
    assert.doesNotMatch(url, /api_key/);
    const csv = "observation_date,X\n2026-07-01,100.5\n2026-08-01,101.2\n";
    return new Response(csv, { status: 200 });
  };
  const env = { DB: makeFakeD1() };
  const result = await refreshFredCache(env);
  assert.equal(result.series_refreshed.length, Object.keys(FRED_SERIES).length);
  assert.equal(env.DB.rows.length, Object.keys(FRED_SERIES).length * 2);
  assert.equal(env.DB.rows[0].value, 100.5);
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
