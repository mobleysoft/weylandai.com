// weyland-market-intelligence-worker/src/routes/job-tools.js
//
// GeoX, WeatherX and ForecastX on the customer's own jobs (2026-10-08).
// Each used to be a free, unauthenticated wrapper around one public API or
// one formula, with nothing of the customer's in it. A job here is a PropX
// proposal (address, contract sum) plus the change orders ChangeOrdX marked
// approved on it.
//
//   GeoX     GET /api/geox/jobs?shop=<address>   every job's county, city (the
//            incorporated place: usually the building permit authority; an
//            unincorporated address usually answers to the county), census
//            tract, coordinates and miles from the shop. &format=csv is paid.
//   WeatherX GET /api/weatherx/jobs              each job's next 7 days with the
//            install risk per period (wind, rain, snow/ice, cold).
//            GET /api/weatherx/log/:proposalId   the job's daily weather log:
//            what the nearest NWS station observed each day (min/max temp, max
//            wind and gust, precipitation, conditions), kept by a daily job, for
//            delay claims. &format=csv is paid.
//   ForecastX POST /api/forecastx/portfolio     monthly cash flow across the
//            chosen jobs: billing, retainage held and released, payments
//            received after the job's terms, material paid, net and cumulative.
//            &format=csv is paid.
// Exports come with the product (geox / weatherx / forecastx), the suite or
// the $100 first submittal.

import { jsonResponse3 } from "../lib/json-response.js";
import { authenticate } from "../lib/auth.js";
import { readStore, writeStore } from "../lib/store-cache.js";
import { outputAccess } from "../../../weyland-shared/output-access.js";

const NWS_UA = "weylandai.com WeatherX (hello@weylandai.com)";
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (head, rows, name) => new Response([head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
const needPay = (what, tier) => jsonResponse3({ success: false, code: "PAYMENT_REQUIRED", message: `${what} comes with ${tier}, the suite or the $100 first submittal.`, upgradeUrl: "/pricing" }, 402);

export function milesBetween(a, b) {
  const R = 3958.8, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Census geocode with jurisdiction, stored for 30 days. fetchImpl injectable. */
export async function geocode(env, address, fetchImpl = fetch) {
  const key = "geox2:" + String(address).trim().toLowerCase().replace(/\s+/g, " ");
  const hit = await readStore(env, key);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < 30 * 86400000) return hit.body;
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${new URLSearchParams({ address, benchmark: "Public_AR_Current", vintage: "Current_Current", format: "json" })}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error("Census geocoder " + res.status);
    const m = (await res.json()).result?.addressMatches?.[0];
    if (!m) return { matched: false, address };
    const g = m.geographies || {};
    const place = g["Incorporated Places"]?.[0]?.NAME || null;
    const county = g["Counties"]?.[0]?.NAME || null;
    const out = {
      matched: true, address, matched_address: m.matchedAddress, lat: m.coordinates?.y ?? null, lon: m.coordinates?.x ?? null,
      state: g["States"]?.[0]?.NAME || null, county, place, tract: g["Census Tracts"]?.[0]?.NAME || null,
      permit_authority: place ? `${place} (incorporated: usually the city's building department)` : county ? `${county} (unincorporated: usually the county's building department)` : null,
    };
    await writeStore(env, key, out);
    return out;
  } catch (e) {
    if (hit) return { ...hit.body, stale: true };
    return { matched: false, address, error: e.message };
  }
}

/** A period's install risk for door and frame work. */
export function installRisk(p) {
  const f = String(p.shortForecast || p.short_forecast || "").toLowerCase();
  const precip = p.probabilityOfPrecipitation?.value ?? p.precipitation_probability_pct ?? 0;
  const wind = Math.max(...String(p.windSpeed || p.wind_speed || "0").split(/\D+/).filter(Boolean).map(Number), 0);
  const temp = p.temperature;
  const reasons = [];
  if (/thunder|snow|ice|sleet|hail|blizzard|hurricane|tornado|freezing/.test(f)) reasons.push(f.match(/thunder\w*|snow|ice|sleet|hail|blizzard|hurricane|tornado|freezing \w+/)[0]);
  if (precip >= 60) reasons.push(`${precip}% rain`);
  if (wind >= 25) reasons.push(`wind to ${wind} mph (glass and storefront leaves)`);
  if (temp != null && (p.temperatureUnit || p.temperature_unit || "F") === "F" && temp <= 32) reasons.push(`${temp}F (sealants, thresholds)`);
  const risk = reasons.length ? "high" : precip >= 30 || wind >= 15 ? "moderate" : "low";
  return { risk, reasons };
}

async function forecast(env, lat, lon, fetchImpl = fetch) {
  const key = `wx2:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  const hit = await readStore(env, key);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < 3 * 3600000) return hit.body;
  try {
    const point = await (await fetchImpl(`https://api.weather.gov/points/${lat},${lon}`, { headers: { "User-Agent": NWS_UA } })).json();
    const fc = await (await fetchImpl(point.properties.forecast, { headers: { "User-Agent": NWS_UA } })).json();
    const body = {
      office: point.properties.cwa, stations: point.properties.observationStations,
      periods: (fc.properties?.periods || []).slice(0, 14).map((p) => ({ name: p.name, start: p.startTime, temperature: p.temperature, unit: p.temperatureUnit, wind: p.windSpeed, precip: p.probabilityOfPrecipitation?.value ?? null, forecast: p.shortForecast, ...installRisk(p) })),
    };
    await writeStore(env, key, body);
    return body;
  } catch (e) {
    return hit ? { ...hit.body, stale: true } : { periods: [], error: e.message };
  }
}

/** One day's observations at the nearest station, summarized. */
export function summarizeObservations(features) {
  const vals = (k) => features.map((f) => f.properties?.[k]?.value).filter((v) => v != null && Number.isFinite(v));
  const temps = vals("temperature"), winds = vals("windSpeed"), gusts = vals("windGust"), precip = vals("precipitationLastHour");
  const c2f = (c) => Math.round((c * 9) / 5 + 32);
  const kmh2mph = (k) => Math.round(k * 0.621371);
  const conds = [...new Set(features.map((f) => f.properties?.textDescription).filter(Boolean))];
  return {
    observations: features.length,
    min_temp_f: temps.length ? c2f(Math.min(...temps)) : null, max_temp_f: temps.length ? c2f(Math.max(...temps)) : null,
    max_wind_mph: winds.length ? kmh2mph(Math.max(...winds)) : null, max_gust_mph: gusts.length ? kmh2mph(Math.max(...gusts)) : null,
    precip_in: precip.length ? Math.round((precip.reduce((a, b) => a + b, 0) / 25.4) * 100) / 100 : null,
    conditions: conds.slice(0, 6).join("; "),
  };
}

let logReady = false;
export function resetForTests() { logReady = false; }
async function ensureLog(db) {
  if (logReady) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS weather_log (proposal_id TEXT NOT NULL, day TEXT NOT NULL, station TEXT, observations INTEGER,
    min_temp_f REAL, max_temp_f REAL, max_wind_mph REAL, max_gust_mph REAL, precip_in REAL, conditions TEXT, fetched_at TEXT NOT NULL,
    PRIMARY KEY (proposal_id, day))`).run();
  logReady = true;
}

/** The daily job: yesterday's observed weather at every job with an address. */
export async function logYesterday(env, fetchImpl = fetch, now = new Date()) {
  await ensureLog(env.DB);
  const day = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const jobs = (await env.WEYLAND_DB.prepare("SELECT id, project_address FROM proposals WHERE project_address IS NOT NULL AND TRIM(project_address) != '' ORDER BY created_at DESC LIMIT 200").all()).results || [];
  let logged = 0;
  for (const j of jobs) {
    try {
      const g = await geocode(env, j.project_address, fetchImpl);
      if (!g.matched) continue;
      const fc = await forecast(env, g.lat, g.lon, fetchImpl);
      if (!fc.stations) continue;
      const st = await (await fetchImpl(fc.stations, { headers: { "User-Agent": NWS_UA } })).json();
      const station = st.features?.[0]?.properties?.stationIdentifier;
      if (!station) continue;
      const obs = await (await fetchImpl(`https://api.weather.gov/stations/${station}/observations?start=${day}T00:00:00Z&end=${day}T23:59:59Z`, { headers: { "User-Agent": NWS_UA } })).json();
      const s = summarizeObservations(obs.features || []);
      if (!s.observations) continue;
      await env.DB.prepare(`INSERT INTO weather_log (proposal_id, day, station, observations, min_temp_f, max_temp_f, max_wind_mph, max_gust_mph, precip_in, conditions, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(proposal_id, day) DO NOTHING`)
        .bind(j.id, day, station, s.observations, s.min_temp_f, s.max_temp_f, s.max_wind_mph, s.max_gust_mph, s.precip_in, s.conditions, new Date().toISOString()).run();
      logged++;
    } catch (e) { console.warn("[weather-log]", j.id, e.message); }
  }
  return { day, jobs: jobs.length, logged };
}

async function approvedChanges(db, proposalId, userId) {
  try {
    const r = await db.prepare("SELECT SUM(amount) AS a FROM forms_change_orders WHERE proposal_id = ? AND user_id = ? AND status = 'approved'").bind(proposalId, userId).first();
    return r2(r?.a || 0);
  } catch (_) { return 0; }
}

/** Monthly cash flow across jobs. */
export function cashFlow(jobs) {
  const months = new Map();
  const bucket = (ym) => { if (!months.has(ym)) months.set(ym, { month: ym, billed: 0, retainage_held: 0, received: 0, retainage_released: 0, material_paid: 0 }); return months.get(ym); };
  const ymOf = (d) => d.toISOString().slice(0, 7);
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  for (const j of jobs) {
    const start = new Date((j.start || new Date().toISOString().slice(0, 10)) + "T00:00:00Z");
    const n = Math.max(1, Math.min(60, Math.round(Number(j.months) || 1)));
    const contract = r2(j.contract), ret = Math.max(0, Math.min(50, Number(j.retainagePct ?? 10))) / 100, terms = Math.max(0, Math.min(180, Number(j.termsDays ?? 30)));
    const matPct = Math.max(0, Math.min(100, Number(j.materialPct ?? 0))) / 100;
    const per = contract / n;
    let held = 0;
    for (let i = 0; i < n; i++) {
      const bill = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 0));
      const b = bucket(ymOf(bill));
      b.billed += per; b.retainage_held += per * ret; held += per * ret;
      bucket(ymOf(addDays(bill, terms))).received += per * (1 - ret);
    }
    const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + n, 0));
    bucket(ymOf(addDays(last, terms + Math.max(0, Number(j.retainageExtraDays ?? 30))))).retainage_released += held;
    if (matPct) bucket(ymOf(addDays(start, Math.max(0, Number(j.supplierTermsDays ?? 30))))).material_paid += contract * matPct;
  }
  let cum = 0;
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map((m) => {
    const net = m.received + m.retainage_released - m.material_paid;
    cum += net;
    return { month: m.month, billed: r2(m.billed), retainage_held: r2(m.retainage_held), received: r2(m.received), retainage_released: r2(m.retainage_released), material_paid: r2(m.material_paid), net: r2(net), cumulative: r2(cum) };
  });
}

export function registerJobToolRoutes(router, { auth = authenticate } = {}) {
  async function who(request, env) {
    const shared = { ...env, DB: env.WEYLAND_DB };
    const { error, user } = await auth(request, shared).catch(() => ({ error: true }));
    if (error || !user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to see your jobs. Your PropX proposals are your jobs here." }, 401) };
    return { userId: String(user.userId), shared };
  }
  async function jobs(env, userId) {
    return (await env.WEYLAND_DB.prepare("SELECT id, quote_number, client_name, project_address, grand_total, created_at FROM proposals WHERE user_id = ? ORDER BY created_at DESC LIMIT 40").bind(userId).all()).results || [];
  }

  router.get("/api/geox/jobs", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const u = new URL(request.url);
    const shopAddr = (u.searchParams.get("shop") || "").trim().slice(0, 200);
    const shop = shopAddr ? await geocode(env, shopAddr) : null;
    const out = [];
    for (const j of await jobs(env, a.userId)) {
      const g = j.project_address ? await geocode(env, j.project_address) : { matched: false };
      out.push({ id: j.id, quote_number: j.quote_number, client: j.client_name, address: j.project_address, ...g, miles_from_shop: shop && shop.matched && g.matched ? milesBetween({ lat: shop.lat, lon: shop.lon }, { lat: g.lat, lon: g.lon }) : null });
    }
    if (u.searchParams.get("format") === "csv") {
      if (!(await outputAccess(a.shared, a.userId, "geox")).paid) return needPay("The GeoX export", "GeoX");
      return csv(["quote", "client", "address", "matched_address", "city", "county", "state", "tract", "permit_authority", "lat", "lon", "miles_from_shop"], out.map((x) => [x.quote_number, x.client, x.address, x.matched_address, x.place, x.county, x.state, x.tract, x.permit_authority, x.lat, x.lon, x.miles_from_shop]), "geox-jobs");
    }
    return jsonResponse3({ success: true, shop, jobs: out });
  });

  router.get("/api/weatherx/jobs", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const out = [];
    for (const j of (await jobs(env, a.userId)).slice(0, 12)) {
      const g = j.project_address ? await geocode(env, j.project_address) : { matched: false };
      const fc = g.matched ? await forecast(env, g.lat, g.lon) : { periods: [] };
      out.push({ id: j.id, quote_number: j.quote_number, client: j.client_name, address: j.project_address, place: g.place || null, periods: fc.periods || [], stale: !!fc.stale });
    }
    return jsonResponse3({ success: true, jobs: out });
  });

  router.get("/api/weatherx/log/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const own = await env.WEYLAND_DB.prepare("SELECT id, project_address FROM proposals WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).first();
    if (!own) return jsonResponse3({ success: false, message: "Not one of your jobs." }, 404);
    await ensureLog(env.DB);
    const u = new URL(request.url);
    const from = u.searchParams.get("from") || "2000-01-01", to = u.searchParams.get("to") || "2999-12-31";
    const rows = (await env.DB.prepare("SELECT day, station, observations, min_temp_f, max_temp_f, max_wind_mph, max_gust_mph, precip_in, conditions FROM weather_log WHERE proposal_id = ? AND day BETWEEN ? AND ? ORDER BY day").bind(own.id, from, to).all()).results || [];
    if (u.searchParams.get("format") === "csv") {
      if (!(await outputAccess(a.shared, a.userId, "weatherx")).paid) return needPay("The weather log export", "WeatherX");
      return csv(["day", "station", "observations", "min_temp_f", "max_temp_f", "max_wind_mph", "max_gust_mph", "precip_in", "conditions"], rows.map((r) => [r.day, r.station, r.observations, r.min_temp_f, r.max_temp_f, r.max_wind_mph, r.max_gust_mph, r.precip_in, r.conditions]), "weather-log");
    }
    return jsonResponse3({ success: true, address: own.project_address, days: rows });
  });

  router.post("/api/forecastx/portfolio", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const b = await request.json().catch(() => ({}));
    const mine = new Map((await jobs(env, a.userId)).map((j) => [j.id, j]));
    const chosen = [];
    for (const j of (Array.isArray(b.jobs) ? b.jobs : []).slice(0, 30)) {
      const p = mine.get(String(j.proposalId));
      if (!p) continue;
      const changes = await approvedChanges(env.WEYLAND_DB, p.id, a.userId);
      chosen.push({ ...j, contract: r2(p.grand_total) + changes, base: r2(p.grand_total), changes, label: `Quote ${p.quote_number} · ${p.client_name || ""}` });
    }
    if (!chosen.length) return jsonResponse3({ success: false, message: "Choose at least one of your PropX proposals." }, 400);
    const months = cashFlow(chosen);
    if (new URL(request.url).searchParams.get("format") === "csv") {
      if (!(await outputAccess(a.shared, a.userId, "forecastx")).paid) return needPay("The cash flow export", "ForecastX");
      return csv(["month", "billed", "retainage_held", "received", "retainage_released", "material_paid", "net", "cumulative"], months.map((m) => [m.month, m.billed, m.retainage_held, m.received, m.retainage_released, m.material_paid, m.net, m.cumulative]), "cash-flow");
    }
    const low = months.reduce((x, m) => (m.cumulative < x.cumulative ? m : x), months[0]);
    return jsonResponse3({ success: true, jobs: chosen.map((c) => ({ label: c.label, base: c.base, changes: c.changes, contract: c.contract })), months, lowest: low });
  });
}
