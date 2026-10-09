import { jsonResponse3 } from "../lib/json-response.js";
import { withStoreCache } from "../lib/store-cache.js";

/**
 * The "X-tool" public-data-driven market-intelligence routes: pricex
 * (first-party door-hardware catalog pricing), marketx (honestly retired,
 * see below), compx (TXDOT open-data vendor bid history), weatherx
 * (National Weather Service), forecastx (pure deterministic cash-flow
 * math, no external API), geox (US Census Bureau geocoder).
 * compxVendorSearch and pctChange are local private helpers, inlined here
 * since every real call site landed inside this extraction.
 * computePriceIndexSnapshot/latestPriceIndexSnapshots are module-level
 * exports (not inlined) so src/index.js's scheduled() cron handler can
 * call computePriceIndexSnapshot directly without going through the router.
 *
 * @param {object} router
 */

// PriceX/MarketX history, 2026-09-12 (two corrections the same day - see
// wrangler.toml's top comment for the full account):
// (1) Both routes originally called FRED's keyed api.stlouisfed.org API
//     live, per-request; a dead FRED_API_KEY secret 502'd both in
//     production.
// (2) First fix attempt cached FRED's free, keyless fredgraph.csv export
//     in D1 instead - itself reverted the same day on John's direct,
//     broader correction: no dependency on ANY external party's service,
//     not even a free keyless government one.
// PriceX now computes a real pricing index from ONLY this account's own
// first-party door-hardware catalog data - weyland_db's products/
// product_variants tables (bound here as env.WEYLAND_DB, read-only),
// real manufacturer catalog data weylandai.com's own catalog-extraction
// pipeline already ingested (59,998 product_variants rows, each with a
// real unit_price, verified live 2026-09-12 - NOT empty, correcting an
// older comment elsewhere in this repo that assumed hardware_sets/
// hardware_components were still globally empty). Categories with fewer
// than MIN_SAMPLE_SIZE priced variants are excluded as statistically too
// thin to report honestly.
//
// MarketX (originally construction spending / housing starts, both
// FRED-only concepts) has NO first-party equivalent anywhere in
// weylandai.com's real schema - takeoff_quotes and quotes are still 0
// rows in production, so there is no real customer transaction history
// to build a genuine market-trend signal from. Rather than fabricate one
// or quietly keep an external dependency, MarketX is honestly retired
// (real 501, not a silent 404 or invented numbers) until real first-party
// data exists to build it from.
const MIN_SAMPLE_SIZE = 5;

/**
 * Compute this week's real pricing snapshot straight from weyland_db's own
 * catalog tables and upsert one row per sufficiently-sampled category into
 * price_index_snapshots. Runs on a schedule (or a manual one-off call),
 * independent of any customer request. Exported so both scheduled()
 * (src/index.js) and a manual seed script can call the exact same logic.
 * Zero external network calls anywhere in this function - env.WEYLAND_DB
 * is this same Cloudflare account's own production database.
 */
export async function computePriceIndexSnapshot(env2) {
  const computedAt = new Date().toISOString();
  const snapshotDate = computedAt.slice(0, 10);

  const { results: categories } = await env2.WEYLAND_DB.prepare(
    `SELECT p.category_level_1 AS category,
            COUNT(*) AS sample_count,
            AVG(pv.unit_price) AS avg_unit_price,
            MIN(pv.unit_price) AS min_unit_price,
            MAX(pv.unit_price) AS max_unit_price
     FROM products p
     JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.category_level_1 IS NOT NULL AND pv.unit_price IS NOT NULL
     GROUP BY p.category_level_1
     HAVING COUNT(*) >= ?`
  ).bind(MIN_SAMPLE_SIZE).all();

  const statements = (categories || []).map((c) =>
    env2.DB.prepare(
      `INSERT INTO price_index_snapshots (category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(category, snapshot_date) DO UPDATE SET
         sample_count = excluded.sample_count, avg_unit_price = excluded.avg_unit_price,
         min_unit_price = excluded.min_unit_price, max_unit_price = excluded.max_unit_price,
         computed_at = excluded.computed_at`
    ).bind(c.category, snapshotDate, c.sample_count, c.avg_unit_price, c.min_unit_price, c.max_unit_price, computedAt)
  );
  if (statements.length) await env2.DB.batch(statements);

  return { computed_at: computedAt, snapshot_date: snapshotDate, categories_snapshotted: (categories || []).length };
}

/**
 * Read the latest and (if it exists) prior weekly snapshot for every
 * category currently in price_index_snapshots, straight from this
 * worker's own D1 (env.DB) - no external call, no cross-worker call.
 */
async function latestPriceIndexSnapshots(env2) {
  const { results: dates } = await env2.DB.prepare(
    `SELECT DISTINCT snapshot_date FROM price_index_snapshots ORDER BY snapshot_date DESC LIMIT 2`
  ).all();
  if (!dates || dates.length === 0) return { latest: [], priorByCategory: new Map() };

  const { results: latest } = await env2.DB.prepare(
    `SELECT category, snapshot_date, sample_count, avg_unit_price, min_unit_price, max_unit_price, computed_at
     FROM price_index_snapshots WHERE snapshot_date = ? ORDER BY category`
  ).bind(dates[0].snapshot_date).all();

  const priorByCategory = new Map();
  if (dates[1]) {
    const { results: prior } = await env2.DB.prepare(
      `SELECT category, avg_unit_price FROM price_index_snapshots WHERE snapshot_date = ?`
    ).bind(dates[1].snapshot_date).all();
    for (const row of prior || []) priorByCategory.set(row.category, row.avg_unit_price);
  }
  return { latest: latest || [], priorByCategory };
}

function pctChange(latest, prior) {
  if (!prior) return null;
  return Math.round(((latest - prior) / prior) * 1000) / 10;
}

export function registerMarketIntelligenceRoutes(router) {
  async function compxVendorSearch(vendorQuery) {
    const url = `https://data.texas.gov/resource/de7b-7dna.json?${new URLSearchParams({
      "$q": vendorQuery,
      "$select": "vendor_name,low_bidder_flag,bid_total_amount,project_name,county,project_actual_let_date,control_section_job_csj",
      "$limit": "1000"
    })}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TXDOT open-data ${resp.status}`);
    const rows = await resp.json();
    const seen = new Map();
    for (const r of rows) {
      const key = r.vendor_name + "|" + r.control_section_job_csj;
      if (!seen.has(key)) seen.set(key, r);
    }
    const bids = [...seen.values()];
    const byVendor = new Map();
    for (const b of bids) {
      if (!byVendor.has(b.vendor_name)) byVendor.set(b.vendor_name, { vendor_name: b.vendor_name, total_bids: 0, wins: 0, total_win_value: 0, recent_projects: [] });
      const v = byVendor.get(b.vendor_name);
      v.total_bids++;
      if (b.low_bidder_flag) {
        v.wins++;
        v.total_win_value += Number.parseFloat(b.bid_total_amount || 0);
      }
      if (v.recent_projects.length < 8) {
        v.recent_projects.push({ project_name: b.project_name, county: b.county, let_date: b.project_actual_let_date, bid_amount: Number.parseFloat(b.bid_total_amount || 0), won: !!b.low_bidder_flag });
      }
    }
    return [...byVendor.values()].map((v) => ({ ...v, win_rate_pct: v.total_bids ? Math.round((v.wins / v.total_bids) * 1000) / 10 : 0 }));
  }

  router.get("/api/pricex/materials", async (request2, env2) => {
    try {
      const { latest, priorByCategory } = await latestPriceIndexSnapshots(env2);
      if (latest.length === 0) {
        return jsonResponse3({ detail: { message: "price_index_snapshots is empty - the scheduled snapshot job hasn't run yet or the manual seed hasn't been applied" } }, 503);
      }
      const materials = latest.map((row) => {
        const prior = priorByCategory.get(row.category);
        return {
          key: row.category.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          label: row.category,
          sample_count: row.sample_count,
          avg_unit_price_usd: Math.round(row.avg_unit_price * 100) / 100,
          min_unit_price_usd: row.min_unit_price,
          max_unit_price_usd: row.max_unit_price,
          wow_pct_change: prior !== undefined ? pctChange(row.avg_unit_price, prior) : null,
          trend_note: prior === undefined ? "no prior weekly snapshot yet - trend will appear once at least 2 weeks of real snapshots exist" : null,
          snapshot_date: row.snapshot_date,
          computed_at: row.computed_at,
        };
      });
      return jsonResponse3({
        source: "weylandai.com's own real door-hardware catalog (weyland_db products/product_variants) - first-party data, zero external API calls, zero external dependency of any kind",
        min_sample_size: MIN_SAMPLE_SIZE,
        fetched_at: new Date().toISOString(),
        materials,
      });
    } catch (err) {
      console.error("[PriceX] materials error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  // /api/marketx/trends: MarketX was rebuilt 2026-10-09 on the cities' building permits (routes/marketx.js).

  // Retired 2026-10-09 (product audit): it counted "bids" from at most 1,000 TxDOT bid-item rows
  // (Austin Bridge alone has 8,418), so 76 projects read as 7; nothing on the CompX page or card
  // uses it. CompX is the NYC City Record awards (/compx).
  router.get("/api/compx/vendors", async () => jsonResponse3({ detail: { code: "gone", message: "This TxDOT vendor search was retired: it undercounted bids. CompX now reads awards from the NYC City Record at /compx." } }, 410));

  // WeatherX runs on the National Weather Service's public API
  // (api.weather.gov) - free, keyless, no signup. Verified live 2026-09-02.
  // NWS requires a real User-Agent identifying the app (not a browser UA) -
  // confirmed by testing; a generic UA gets throttled/blocked.
  const NWS_USER_AGENT = "weylandai.com WeatherX (hello@weylandai.com)";

  function classifyDelayRisk(period) {
    const precip = period.probabilityOfPrecipitation?.value ?? 0;
    const forecast = (period.shortForecast || "").toLowerCase();
    const windMax = Number.parseInt((period.windSpeed || "0").split(/\D+/).filter(Boolean).pop() || "0", 10);
    const severe = /thunderstorm|snow|ice|hail|blizzard|hurricane|tornado/.test(forecast);
    if (severe || precip >= 60 || windMax >= 25) return "high";
    if (precip >= 30 || windMax >= 15) return "moderate";
    return "low";
  }

  router.get("/api/weatherx/delay-risk", withStoreCache((u) => u.searchParams.get("lat") && u.searchParams.get("lon") ? "weatherx:" + Number(u.searchParams.get("lat")).toFixed(2) + "," + Number(u.searchParams.get("lon")).toFixed(2) : null, 10800, async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const lat = url.searchParams.get("lat");
      const lon = url.searchParams.get("lon");
      if (!lat || !lon) {
        return jsonResponse3({ detail: { message: "lat and lon query params are required" } }, 400);
      }
      const pointResp = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { "User-Agent": NWS_USER_AGENT } });
      if (!pointResp.ok) throw new Error(`NWS points lookup ${pointResp.status} - check lat/lon is within the US`);
      const point = await pointResp.json();
      const forecastUrl = point.properties?.forecast;
      if (!forecastUrl) throw new Error("NWS did not return a forecast URL for this location");

      const forecastResp = await fetch(forecastUrl, { headers: { "User-Agent": NWS_USER_AGENT } });
      if (!forecastResp.ok) throw new Error(`NWS forecast fetch ${forecastResp.status}`);
      const forecast = await forecastResp.json();

      const periods = (forecast.properties?.periods || []).slice(0, 14).map((p) => ({
        name: p.name,
        temperature: p.temperature,
        temperature_unit: p.temperatureUnit,
        short_forecast: p.shortForecast,
        precipitation_probability_pct: p.probabilityOfPrecipitation?.value ?? null,
        wind_speed: p.windSpeed,
        delay_risk: classifyDelayRisk(p),
      }));
      const highRiskCount = periods.filter((p) => p.delay_risk === "high").length;
      const moderateRiskCount = periods.filter((p) => p.delay_risk === "moderate").length;

      return jsonResponse3({
        source: "National Weather Service (api.weather.gov)",
        office: point.properties?.cwa,
        fetched_at: new Date().toISOString(),
        summary: { high_risk_periods: highRiskCount, moderate_risk_periods: moderateRiskCount, total_periods: periods.length },
        periods,
      });
    } catch (err) {
      console.error("[WeatherX] delay-risk error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  }));

  // ForecastX needs no external data source - it's a deterministic cash-flow
  // projection from a project's own real contract terms (value, duration,
  // retainage, billing/payment cadence). "Real" here means the math is
  // correct and every input is either user-supplied or a clearly labeled
  // default, not that it calls an external API - there's nothing to verify
  // live because there's no external dependency to be wrong about.
  function projectCashFlow({ contractValue, startDate, durationMonths, retainagePct, paymentTermsDays }) {
    const start = new Date(startDate);
    const months = [];
    const monthlyBilling = contractValue / durationMonths;
    let cumulativeBilled = 0;
    let cumulativeRetainageHeld = 0;
    let cumulativeCashReceived = 0;

    for (let i = 0; i < durationMonths; i++) {
      const billDate = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      const retainageThisMonth = monthlyBilling * (retainagePct / 100);
      const netPayment = monthlyBilling - retainageThisMonth;
      const expectedPaymentDate = new Date(billDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

      cumulativeBilled += monthlyBilling;
      cumulativeRetainageHeld += retainageThisMonth;
      cumulativeCashReceived += netPayment;

      months.push({
        month_index: i + 1,
        bill_date: billDate.toISOString().slice(0, 10),
        billed_amount: Math.round(monthlyBilling * 100) / 100,
        retainage_held: Math.round(retainageThisMonth * 100) / 100,
        net_payment: Math.round(netPayment * 100) / 100,
        expected_payment_date: expectedPaymentDate.toISOString().slice(0, 10),
        cumulative_billed: Math.round(cumulativeBilled * 100) / 100,
        cumulative_retainage_held: Math.round(cumulativeRetainageHeld * 100) / 100,
        cumulative_cash_received: Math.round(cumulativeCashReceived * 100) / 100,
      });
    }

    // Retainage release: the standard practice this models is 100% of
    // accumulated retainage released on final payment/closeout, one
    // payment-terms period after the last billing date - not spread across
    // the project. If your contract releases retainage differently
    // (e.g. 50% at substantial completion), treat this as the simple case.
    const lastMonth = months[months.length - 1];
    const retainageReleaseDate = new Date(new Date(lastMonth.bill_date).getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    return {
      monthly_billing: Math.round(monthlyBilling * 100) / 100,
      total_retainage_held_at_peak: Math.round(cumulativeRetainageHeld * 100) / 100,
      retainage_release_date: retainageReleaseDate.toISOString().slice(0, 10),
      months,
    };
  }

  router.post("/api/forecastx/project", async (request2, env2) => {
    try {
      const body = await request2.json().catch(() => ({}));
      const contractValue = Number.parseFloat(body.contract_value);
      const durationMonths = Number.parseInt(body.duration_months, 10);
      const retainagePct = body.retainage_pct !== undefined ? Number.parseFloat(body.retainage_pct) : 10;
      const paymentTermsDays = body.payment_terms_days !== undefined ? Number.parseInt(body.payment_terms_days, 10) : 30;
      const startDate = body.start_date || new Date().toISOString().slice(0, 10);

      if (!contractValue || contractValue <= 0) return jsonResponse3({ detail: { message: "contract_value must be a positive number" } }, 400);
      if (!durationMonths || durationMonths <= 0 || durationMonths > 120) return jsonResponse3({ detail: { message: "duration_months must be between 1 and 120" } }, 400);

      const projection = projectCashFlow({ contractValue, startDate, durationMonths, retainagePct, paymentTermsDays });
      return jsonResponse3({ inputs: { contract_value: contractValue, start_date: startDate, duration_months: durationMonths, retainage_pct: retainagePct, payment_terms_days: paymentTermsDays }, projection });
    } catch (err) {
      console.error("[ForecastX] project error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  // GeoX runs on the US Census Bureau's public geocoder (geocoding.geo.census.gov)
  // - free, no key required for this endpoint (CENSUS_API_KEY exists for other
  // Census statistical APIs, not needed here). Verified live 2026-09-02: real
  // coordinates plus real county/state/tract FIPS geography, not just a
  // lat/lon pin - useful for a GC that needs to report project location by
  // jurisdiction, not just show it on a map.
  router.get("/api/geox/lookup", withStoreCache((u) => (u.searchParams.get("address") || "").trim() ? "geox:" + (u.searchParams.get("address") || "").trim().toLowerCase().replace(/\s+/g, " ") : null, 2592000, async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const address = url.searchParams.get("address");
      if (!address) return jsonResponse3({ detail: { message: "address query param is required" } }, 400);

      const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${new URLSearchParams({
        address,
        benchmark: "Public_AR_Current",
        vintage: "Current_Current",
        format: "json",
      })}`;
      const resp = await fetch(censusUrl);
      if (!resp.ok) throw new Error(`Census geocoder ${resp.status}`);
      const data = await resp.json();
      const match = data.result?.addressMatches?.[0];
      if (!match) return jsonResponse3({ detail: { message: "No match found for that address - Census geocoder covers US addresses only" } }, 404);

      const county = match.geographies?.["Counties"]?.[0];
      const state = match.geographies?.["States"]?.[0];
      const tract = match.geographies?.["Census Tracts"]?.[0];

      return jsonResponse3({
        source: "US Census Bureau Geocoder",
        matched_address: match.matchedAddress,
        latitude: match.coordinates?.y ?? null,
        longitude: match.coordinates?.x ?? null,
        county_name: county?.NAME ?? null,
        county_geoid: county?.GEOID ?? null,
        state_name: state?.NAME ?? null,
        census_tract_geoid: tract?.GEOID ?? null,
      });
    } catch (err) {
      console.error("[GeoX] lookup error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  }));
}
