import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { registerJobToolRoutes, milesBetween, installRisk, summarizeObservations, cashFlow, geocode, logYesterday, resetForTests } from "../src/routes/job-tools.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; } }; return st; }, async batch(s) { return Promise.all(s.map((x) => x.run())); } }; }

test("distance, install risk and observed-day summaries", () => {
  assert.equal(milesBetween({ lat: 37.3196, lon: -121.8471 }, { lat: 37.7749, lon: -122.4194 }), 44.4);
  assert.deepEqual(installRisk({ shortForecast: "Mostly Sunny", probabilityOfPrecipitation: { value: 5 }, windSpeed: "5 to 10 mph", temperature: 70, temperatureUnit: "F" }), { risk: "low", reasons: [] });
  const gusty = installRisk({ shortForecast: "Breezy", probabilityOfPrecipitation: { value: 10 }, windSpeed: "20 to 30 mph", temperature: 60, temperatureUnit: "F" });
  assert.equal(gusty.risk, "high");
  assert.match(gusty.reasons[0], /wind to 30 mph/);
  assert.equal(installRisk({ shortForecast: "Chance Snow Showers", windSpeed: "5 mph", temperature: 28, temperatureUnit: "F" }).reasons.length, 2);
  const s = summarizeObservations([
    { properties: { temperature: { value: 10 }, windSpeed: { value: 20 }, windGust: { value: 40 }, precipitationLastHour: { value: 2.54 }, textDescription: "Rain" } },
    { properties: { temperature: { value: 20 }, windSpeed: { value: 10 }, windGust: { value: null }, precipitationLastHour: { value: 2.54 }, textDescription: "Cloudy" } },
  ]);
  assert.deepEqual(s, { observations: 2, min_temp_f: 50, max_temp_f: 68, max_wind_mph: 12, max_gust_mph: 25, precip_in: 0.2, conditions: "Rain; Cloudy" });
});

test("cash flow: billing monthly, payment after terms, retainage released after the last bill, material paid up front", () => {
  const m = cashFlow([{ contract: 90000, start: "2026-11-01", months: 3, retainagePct: 10, termsDays: 30, materialPct: 40, supplierTermsDays: 30, retainageExtraDays: 30 }]);
  const by = Object.fromEntries(m.map((x) => [x.month, x]));
  assert.equal(by["2026-11"].billed, 30000);
  assert.equal(by["2026-12"].material_paid, 36000);
  assert.equal(by["2026-12"].received, 27000);
  assert.equal(by["2027-01"].received, 27000);
  assert.equal(by["2027-04"].retainage_released, 9000, "last bill Jan 31 + 30 days terms + 30 days to release");
  assert.equal(m.at(-1).cumulative, 90000 - 36000);
});

test("geocode: jurisdiction from the incorporated place, stored", async () => {
  const db = d1(new DatabaseSync(":memory:"));
  let calls = 0;
  const fake = async () => { calls++; return new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: "1855 LUCRETIA AVE, SAN JOSE, CA, 95122", coordinates: { x: -121.85, y: 37.32 }, geographies: { States: [{ NAME: "California" }], Counties: [{ NAME: "Santa Clara County" }], "Incorporated Places": [{ NAME: "San Jose city" }], "Census Tracts": [{ NAME: "Census Tract 5031.22" }] } }] } }), { status: 200 }); };
  const g = await geocode({ DB: db }, "1855 Lucretia Ave San Jose", fake);
  assert.equal(g.permit_authority, "San Jose city (incorporated: usually the city's building department)");
  await geocode({ DB: db }, "1855 Lucretia Ave  San Jose", fake);
  assert.equal(calls, 1, "the second lookup is served from our store");
});

test("routes: portfolio counts approved change orders; exports need payment; logs are per owner", async () => {
  resetForTests();
  const raw = new DatabaseSync(":memory:");
  raw.exec(`CREATE TABLE proposals (id TEXT, user_id TEXT, quote_number INTEGER, client_name TEXT, project_address TEXT, grand_total REAL, created_at TEXT);
    CREATE TABLE forms_change_orders (proposal_id TEXT, user_id TEXT, status TEXT, amount REAL);
    CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);`);
  raw.prepare("INSERT INTO proposals VALUES ('p1','u1',7,'GC','1855 Lucretia Ave',100000,'2026-09-01')").run();
  raw.prepare("INSERT INTO forms_change_orders VALUES ('p1','u1','approved',5000)").run();
  raw.prepare("INSERT INTO forms_change_orders VALUES ('p1','u1','rejected',9999)").run();
  raw.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  const db = d1(raw);
  const env = { DB: db, WEYLAND_DB: db };
  const guest = new NativeRouter();
  registerJobToolRoutes(guest);
  assert.equal((await guest.handle(new Request("https://weylandai.com/api/forecastx/portfolio", { method: "POST", body: "{}" }), env, {})).status, 401);
  const r = new NativeRouter();
  registerJobToolRoutes(r, { auth: async (req) => ({ user: { userId: req.headers.get("x-user") || "u1" } }) });
  const call = (m, path, body, user) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: user ? { "x-user": user } : {}, body: body ? JSON.stringify(body) : undefined }), env, {});
  const pf = await (await call("POST", "/api/forecastx/portfolio", { jobs: [{ proposalId: "p1", start: "2026-11-01", months: 2 }, { proposalId: "not-mine" }] })).json();
  assert.deepEqual(pf.jobs, [{ label: "Quote 7 · GC", base: 100000, changes: 5000, contract: 105000 }]);
  assert.equal(pf.months.reduce((s, m) => s + m.billed, 0), 105000);
  assert.equal((await call("POST", "/api/forecastx/portfolio?format=csv", { jobs: [{ proposalId: "p1" }] })).status, 402);
  assert.equal((await call("GET", "/api/weatherx/log/p1", null, "someone-else")).status, 404);
  const log = await (await call("GET", "/api/weatherx/log/p1")).json();
  assert.deepEqual(log.days, []);
  assert.equal((await call("GET", "/api/weatherx/log/p1?format=csv")).status, 402);
  raw.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const c = await call("POST", "/api/forecastx/portfolio?format=csv", { jobs: [{ proposalId: "p1", start: "2026-11-01", months: 2 }] });
  assert.equal(c.status, 200);
  assert.match(await c.text(), /^month,billed,retainage_held,received/);
});
