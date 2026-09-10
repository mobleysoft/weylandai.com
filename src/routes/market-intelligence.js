import { jsonResponse3 } from "../lib/json-response.js";

/**
 * The "X-tool" public-data-driven market-intelligence routes:
 * pricex/marketx (FRED economic data), compx (TXDOT open-data vendor
 * bid history), weatherx (National Weather Service), forecastx (pure
 * deterministic cash-flow math, no external API), geox (US Census
 * Bureau geocoder). All 4 helper functions this cluster depends on
 * (compxVendorSearch, FRED_SERIES, fredObservations, pctChange) had
 * every one of their real call sites inside this extraction - fully
 * orphaned, so inlined here as local private helpers.
 *
 * @param {object} router
 */
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

  // MarketX/PriceX both run on real public economic data from the St. Louis
  // Fed's FRED API (api.stlouisfed.org) - a free, keyed, no-scraping public
  // data source, same trust tier as HuntX's TXDOT/CA-OPSC open data. FRED_API_KEY
  // is a Worker secret (`wrangler secret put`), not inlined - verified working
  // live against all 5 series below before writing this, 2026-09-02.
  const FRED_SERIES = {
    construction_materials: { id: "WPUSI012011", label: "Construction Materials (PPI aggregate)" },
    lumber: { id: "WPU081", label: "Lumber and Wood Products" },
    metals: { id: "WPU10", label: "Metals and Metal Products" },
    construction_spending: { id: "TTLCONS", label: "Total Construction Spending (US, $M)" },
    housing_starts: { id: "HOUST", label: "New Housing Starts (US, thousands of units)" }
  };

  async function fredObservations(env2, seriesId, limit = 13) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${env2.FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || data.error_code) {
      throw new Error(data.error_message || `FRED ${resp.status} for ${seriesId}`);
    }
    // FRED returns missing/withheld points as the literal string "." - filter
    // those rather than let them corrupt a % change calculation downstream.
    return data.observations.filter((o) => o.value !== ".").map((o) => ({ date: o.date, value: Number.parseFloat(o.value) }));
  }

  function pctChange(latest, prior) {
    if (!prior) return null;
    return Math.round(((latest - prior) / prior) * 1000) / 10;
  }

  router.get("/api/pricex/materials", async (request2, env2) => {
    try {
      const keys = ["construction_materials", "lumber", "metals"];
      const results = await Promise.all(
        keys.map(async (key) => {
          const { id, label } = FRED_SERIES[key];
          const obs = await fredObservations(env2, id, 13); // 13 months: latest + 1mo-ago + 12mo-ago
          const latest = obs[0];
          const monthAgo = obs[1];
          const yearAgo = obs[12];
          return {
            key,
            label,
            series_id: id,
            latest_value: latest?.value ?? null,
            latest_date: latest?.date ?? null,
            mom_pct_change: monthAgo ? pctChange(latest.value, monthAgo.value) : null,
            yoy_pct_change: yearAgo ? pctChange(latest.value, yearAgo.value) : null,
            history: obs.slice(0, 13).reverse()
          };
        })
      );
      return jsonResponse3({ source: "FRED (Federal Reserve Bank of St. Louis)", fetched_at: new Date().toISOString(), materials: results });
    } catch (err) {
      console.error("[PriceX] materials error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  router.get("/api/marketx/trends", async (request2, env2) => {
    try {
      const keys = ["construction_spending", "housing_starts", "construction_materials"];
      const results = await Promise.all(
        keys.map(async (key) => {
          const { id, label } = FRED_SERIES[key];
          const obs = await fredObservations(env2, id, 13);
          const latest = obs[0];
          const monthAgo = obs[1];
          const yearAgo = obs[12];
          const yoy = yearAgo ? pctChange(latest.value, yearAgo.value) : null;
          return {
            key,
            label,
            series_id: id,
            latest_value: latest?.value ?? null,
            latest_date: latest?.date ?? null,
            mom_pct_change: monthAgo ? pctChange(latest.value, monthAgo.value) : null,
            yoy_pct_change: yoy,
            trend: yoy === null ? "unknown" : yoy > 1 ? "rising" : yoy < -1 ? "falling" : "flat",
            history: obs.slice(0, 13).reverse()
          };
        })
      );
      return jsonResponse3({ source: "FRED (Federal Reserve Bank of St. Louis)", fetched_at: new Date().toISOString(), indicators: results });
    } catch (err) {
      console.error("[MarketX] trends error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  router.get("/api/compx/vendors", async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) {
        return jsonResponse3({ detail: { message: "q (vendor or company name search) is required" } }, 400);
      }
      const vendors = await compxVendorSearch(q);
      return jsonResponse3({ source: "TXDOT open-data bid tabulations (data.texas.gov)", query: q, fetched_at: new Date().toISOString(), vendors });
    } catch (err) {
      console.error("[CompX] vendor search error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

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

  router.get("/api/weatherx/delay-risk", async (request2, env2) => {
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
  });

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
  router.get("/api/geox/lookup", async (request2, env2) => {
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
  });
}
