import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMarketIntelligenceRoutes, computePriceIndexSnapshot } from "./market-intelligence.js";

// Minimal fake D1 for this worker's own price_index_snapshots table
// (env.DB) - matches migrations/0002_retire_fred_cache_add_price_index_snapshots.sql.
function makeFakeSnapshotsD1() {
  const rows = []; // { category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at }
  return {
    rows,
    prepare(sql) {
      const isInsert = /^INSERT INTO price_index_snapshots/i.test(sql);
      const isDistinctDates = /^SELECT DISTINCT snapshot_date/i.test(sql);
      const isLatestByDate = /^SELECT category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at/i.test(sql);
      const isPriorAvg = /^SELECT category, avg_unit_price FROM price_index_snapshots/i.test(sql);
      const makeExecutor = (args) => ({
        async run() {
          if (isInsert) {
            const [category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at] = args;
            const existing = rows.find((r) => r.category === category && r.snapshot_date === snapshot_date);
            if (existing) Object.assign(existing, { sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at });
            else rows.push({ category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at });
          }
          return { success: true };
        },
        async all() {
          if (isDistinctDates) {
            const dates = [...new Set(rows.map((r) => r.snapshot_date))].sort().reverse().slice(0, 2);
            return { results: dates.map((snapshot_date) => ({ snapshot_date })) };
          }
          if (isLatestByDate) {
            const [snapshot_date] = args;
            return { results: rows.filter((r) => r.snapshot_date === snapshot_date).sort((a, b) => a.category.localeCompare(b.category)) };
          }
          if (isPriorAvg) {
            const [snapshot_date] = args;
            return { results: rows.filter((r) => r.snapshot_date === snapshot_date).map(({ category, avg_unit_price }) => ({ category, avg_unit_price })) };
          }
          return { results: [] };
        },
      });
      return {
        // Real D1 prepared statements support .all()/.run() directly
        // (no params) as well as after .bind(...args) - the real
        // latestPriceIndexSnapshots() calls the no-bind form for its
        // parameterless DISTINCT query, so the fake must too.
        ...makeExecutor([]),
        bind(...args) {
          return makeExecutor(args);
        },
      };
    },
    async batch(statements) {
      for (const stmt of statements) await stmt.run();
      return statements.map(() => ({ success: true }));
    },
  };
}

// Minimal fake D1 for the read-only weyland_db binding (env.WEYLAND_DB) -
// only needs to answer computePriceIndexSnapshot's one GROUP BY query.
function makeFakeWeylandDb(categoryRows) {
  return {
    prepare(sql) {
      const isCategoryQuery = /FROM products p\s+JOIN product_variants pv/i.test(sql);
      return {
        bind() {
          return { async all() { return { results: isCategoryQuery ? categoryRows : [] }; } };
        },
      };
    },
  };
}

function setup(weylandDbRows = []) {
  const router = new NativeRouter();
  registerMarketIntelligenceRoutes(router);
  return { router, env: { DB: makeFakeSnapshotsD1(), WEYLAND_DB: makeFakeWeylandDb(weylandDbRows) } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("GET /api/pricex/materials: real happy path returns a pricing index computed from our own catalog (no external call at all)", async () => {
  globalThis.fetch = async () => { throw new Error("must not call any external service from a customer request path"); };
  const { router, env } = setup();
  env.DB.rows.push(
    { category: "Exit Devices", snapshot_date: "2026-09-12", sample_count: 5377, avg_unit_price: 4587.6, min_unit_price: 65, max_unit_price: 7464, computed_at: "2026-09-12T00:00:00.000Z" },
    { category: "Locks", snapshot_date: "2026-09-12", sample_count: 852, avg_unit_price: 2383.17, min_unit_price: 2.47, max_unit_price: 3814, computed_at: "2026-09-12T00:00:00.000Z" }
  );
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.materials.length, 2);
  assert.match(body.source, /first-party/);
  assert.equal(body.materials[0].label, "Exit Devices");
  assert.equal(body.materials[0].avg_unit_price_usd, 4587.6);
  assert.equal(body.materials[0].wow_pct_change, null);
  assert.match(body.materials[0].trend_note, /no prior weekly snapshot/);
});

test("GET /api/pricex/materials: a second week's snapshot produces a real wow_pct_change from our own data", async () => {
  const { router, env } = setup();
  env.DB.rows.push(
    { category: "Locks", snapshot_date: "2026-09-05", sample_count: 850, avg_unit_price: 2300, min_unit_price: 2.47, max_unit_price: 3800, computed_at: "2026-09-05T00:00:00.000Z" },
    { category: "Locks", snapshot_date: "2026-09-12", sample_count: 852, avg_unit_price: 2383.17, min_unit_price: 2.47, max_unit_price: 3814, computed_at: "2026-09-12T00:00:00.000Z" }
  );
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.materials[0].wow_pct_change, 3.6);
});

test("GET /api/pricex/materials: no snapshot yet surfaces a real 503, not fabricated data", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/pricex/materials"), env, {});
  assert.equal(res.status, 503);
});

test("computePriceIndexSnapshot: queries only this account's own weyland_db (env.WEYLAND_DB), zero external fetch, and upserts into price_index_snapshots (env.DB)", async () => {
  globalThis.fetch = async () => { throw new Error("must not call any external service - this is first-party data only"); };
  const categoryRows = [
    { category: "Closers", sample_count: 606, avg_unit_price: 750.1, min_unit_price: 10, max_unit_price: 1933 },
  ];
  const env = { DB: makeFakeSnapshotsD1(), WEYLAND_DB: makeFakeWeylandDb(categoryRows) };
  const result = await computePriceIndexSnapshot(env);
  assert.equal(result.categories_snapshotted, 1);
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].category, "Closers");
  assert.equal(env.DB.rows[0].avg_unit_price, 750.1);
});

test("GET /api/compx/vendors: 400 when q param missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/compx/vendors"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/compx/vendors: bids are counted per project, not per bid item (Austin Bridge: 76 projects, not 7)", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /data\.texas\.gov/);
    const q = new URL(url).searchParams;
    if (/count\(\*\)/.test(q.get("$select"))) {
      assert.match(q.get("$where"), /not like '%ESTIMATE%'/);
      return new Response(JSON.stringify([{ vendor_name: "ACME CONSTRUCTION", n: "900" }]), { status: 200 });
    }
    // grouped by project and low-bidder flag: one row per (project, flag), whatever its item count
    return new Response(JSON.stringify([
      { control_section_job_csj: "csj1", low_bidder_flag: true, amount: "100000", project_name: "P1", county: "Travis", let_date: "2026-02-01" },
      { control_section_job_csj: "csj2", low_bidder_flag: false, amount: "90000", project_name: "P2", county: "Travis", let_date: "2026-01-01" },
      { control_section_job_csj: "csj3", low_bidder_flag: false, amount: "50000", project_name: "P3", county: "Hays", let_date: "2025-12-01" },
    ]), { status: 200 });
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/compx/vendors?q=Acme"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.vendors.length, 1);
  assert.equal(body.vendors[0].total_bids, 3);
  assert.equal(body.vendors[0].wins, 1);
  assert.equal(body.vendors[0].total_win_value, 100000);
  assert.equal(body.vendors[0].win_rate_pct, 33.3);
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
