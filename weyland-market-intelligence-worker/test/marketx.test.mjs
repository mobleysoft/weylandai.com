// MarketX: six cities' commercial building permits in our own index, the market read from them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { permitRow, doorScope, useOf, ingestCityPage, metroSummary, metroList, resetPermitsForTests, openBids } from "../src/lib/permits.js";
import { NativeRouter } from "../src/lib/router.js";
import { registerMarketxRoutes } from "../src/routes/marketx.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x.map((v) => (v === undefined ? null : v)); return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; } }; return st; }, async batch(stmts) { return Promise.all(stmts.map((s) => s.run())); } }; }
const NOW = "2026-10-09T00:00:00Z";

test("each city's record becomes a row: use, door scope, who builds it; small residential work is left out", () => {
  const chi = permitRow("chicago", { permit_: "101074704", permit_type: "PERMIT - NEW CONSTRUCTION", issue_date: "2026-06-02T00:00:00.000", street_number: "1904", street_direction: "W", street_name: "ADAMS ST", reported_cost: "45000000",
    work_description: "NEW 2 STORY BUILDING. OCCUPANCY GROUPS A-1, A-3, B, M. 6,000 SEAT MUSIC VENUE", contact_1_type: "CONTRACTOR-GENERAL CONTRACTOR", contact_1_name: "POWER CONSTRUCTION", contact_2_type: "OWNER", contact_2_name: "OAK VIEW GROUP" }, NOW);
  assert.deepEqual([chi.id, chi.kind, chi.use, chi.scope, chi.contractor, chi.owner, chi.valuation], ["chicago:101074704", "new", "civic", "likely", "POWER CONSTRUCTION", "OAK VIEW GROUP", 45000000]);
  const nyc = permitRow("nyc", { job_filing_number: "B00509455-P8", job_type: "Alteration", approved_date: "2026-07-14T00:00:00.000", house_no: "375", street_name: "MADISON AVENUE", borough: "Manhattan", initial_cost: "217880000", job_description: "Installation of new facade curtain wall", owner_s_business_name: "JPMorgan Chase Bank" }, NOW);
  assert.deepEqual([nyc.id, nyc.scope, nyc.owner], ["nyc:B00509455", "unlikely", "JPMorgan Chase Bank"], "one job keyed once; a curtain wall is not door work");
  assert.equal(permitRow("nyc", { job_filing_number: "B1-I1", job_type: "New Building", approved_date: "2026-07-14", initial_cost: "900000", job_description: "New 4 story building", owner_s_business_name: "PR" }, NOW).owner, null, "a placeholder is not an owner");
  const aus = permitRow("austin", { permit_number: "2026-094822 BP", masterpermitnum: "13532840", work_class: "New", issue_date: "2026-07-23", permit_class: "C- 330 Schools", total_job_valuation: "380000000", description: "Phase 1a main building", permit_location: "3935 BRIGHT LIGHT BLVD", contractor_company_name: "Bartlett Cocke" }, NOW);
  assert.equal(aus.id, "austin:master-13532840", "a project's phase permits are one project");
  assert.equal(aus.use, "education");
  assert.equal(permitRow("la", { permit_nbr: "1", permit_type: "Bldg-Alter/Repair", permit_sub_type: "Commercial", issue_date: "2026-07-01", valuation: "300000", work_desc: "new swimming pool and spa", primary_address: "1 A ST" }, NOW), null);
  assert.equal(permitRow("seattle", { permitnum: "2", permittypedesc: "New", issueddate: "2026-07-01", estprojectcost: "100000", description: "office" }, NOW), null, "under $250,000");
  assert.equal(useOf("INTERIOR ALTERATIONS. OCCUPANCY GROUP E"), "education");
  assert.equal(useOf("interior alteration, occupancy: R-2"), "multifamily");
  assert.equal(doorScope("alteration", "Replace rooftop HVAC units"), "unlikely");
  assert.equal(doorScope("alteration", "Interior renovation of floors 3-5, new partitions and restrooms"), "likely");
  assert.equal(doorScope("new", "CAISSONS ONLY for proposed building"), "unlikely");
  assert.equal(doorScope("new", "New Construction of Shade Structure (Courtyard Cabana Trellis)"), "unlikely");
  assert.equal(doorScope("new", "New Construction of Parking Garage", "parking"), "unlikely");
  assert.equal(doorScope("new", "New 5 story office building with parking garage"), "likely");
  const dock = permitRow("austin", { permit_number: "9 BP", work_class: "New", issue_date: "2026-06-08", permit_class: "C- 329 Com Structures Other Than Bldg", total_job_valuation: "830000000", description: "New Construction of Boat Dock an Amenity Lounge", permit_location: "6915 BRIDGE POINT PKWY" }, NOW);
  assert.equal(dock.scope, "unlikely", "Austin class 329: a structure, not a building");
  const apt = permitRow("austin", { permit_number: "8 BP", work_class: "New", issue_date: "2026-06-08", permit_class: "C- 105 Five or More Family Bldgs", total_job_valuation: "30000000", description: "Building 3", permit_location: "1 A ST" }, NOW);
  assert.deepEqual([apt.use, apt.scope], ["multifamily", "likely"]);
});

const rec = (i, date, cost, extra = {}) => ({ permitnum: "P" + i, permittypedesc: "New", issueddate: date + "T00:00:00.000", estprojectcost: String(cost), description: "Construct new apartment building", originaladdress1: i + " PINE ST", contractorcompanyname: i % 2 ? "Sellen" : "Lease Crutcher", ...extra });

test("ingest reads each city from a cursor: issue date plus the records already read on that date", async () => {
  resetPermitsForTests();
  const db = d1(new DatabaseSync(":memory:"));
  const pages = [
    Array.from({ length: 1000 }, (_, i) => rec(i, i < 600 ? "2025-01-02" : "2025-01-03", 1000000)),
    [rec(1000, "2025-01-03", 2000000), rec(1001, "2025-02-01", 3000000)],
  ];
  const urls = [];
  const fetchImpl = async (u) => { urls.push(decodeURIComponent(String(u)).replace(/\+/g, " ")); return new Response(JSON.stringify(pages[urls.length - 1] || []), { status: 200 }); };
  const a = await ingestCityPage(db, "seattle", { fetchImpl, now: new Date(NOW) });
  assert.deepEqual([a.fetched, a.done], [1000, false]);
  assert.match(urls[0], /issueddate >= '2024-10-09T00:00:00'/, "24 months back on the first run");
  const b = await ingestCityPage(db, "seattle", { fetchImpl, now: new Date(NOW) });
  assert.match(urls[1], /issueddate >= '2025-01-03T00:00:00'.*\$offset=400|offset=400/s, "resumes after the 400 already read on 2025-01-03");
  assert.equal(b.done, true);
  const st = await db.prepare("SELECT cursor, skip, rows FROM marketx_ingest WHERE metro = 'seattle'").first();
  assert.deepEqual([st.cursor, st.skip, st.rows], ["2025-02-01", 1, 1002]);
});

async function seeded() {
  resetPermitsForTests();
  const raw = new DatabaseSync(":memory:");
  const db = d1(raw);
  const rows = [
    rec(1, "2026-09-15", 40000000, { description: "Construct new 200 unit apartment building" }),
    rec(2, "2026-08-01", 12000000, { description: "Construct new elementary school", contractorcompanyname: "Sellen" }),
    rec(3, "2026-03-01", 5000000, { permittypedesc: "Addition/Alteration", description: "Interior tenant improvement, office floors 4-6", contractorcompanyname: "Lease Crutcher" }),
    rec(4, "2026-02-01", 8000000, { permittypedesc: "Addition/Alteration", description: "Replace curtain wall facade" }),
    rec(5, "2025-06-01", 10000000, { description: "Construct new hospital wing" }),
  ];
  await ingestCityPage(db, "seattle", { fetchImpl: async () => new Response(JSON.stringify(rows)), now: new Date(NOW) });
  return { db, raw };
}

test("the market: value against the prior period, by use, door-likely by default, who builds it", async () => {
  const { db } = await seeded();
  const s = await metroSummary(db, "seattle", { months: 12, limit: 10 }, "2026-10-09");
  assert.deepEqual([s.totals.projects, s.totals.value, s.totals.priorValue, s.totals.valueChange], [3, 57000000, 10000000, 470], "the curtain wall is left out; last year had the $10M hospital");
  assert.deepEqual(s.byUse.map((u) => [u.use, u.value, u.doorHeavy]), [["multifamily", 40000000, true], ["education", 12000000, true], ["office", 5000000, true]]);
  assert.deepEqual(s.contractors.map((c) => [c.name, c.projects, c.value]), [["Sellen", 2, 52000000], ["Lease Crutcher", 1, 5000000]], JSON.stringify(s.contractors));
  assert.equal(s.largest[0].valuation, 40000000);
  const all = await metroSummary(db, "seattle", { months: 12, scope: "all" }, "2026-10-09");
  assert.equal(all.totals.value, 65000000);
  const list = await metroList(db, "2026-10-09");
  assert.deepEqual(list.find((m) => m.metro === "seattle").projects, 3);
});

test("routes: the summary is free with the top 5; the full lists and CSVs are paid", async () => {
  const { db } = await seeded();
  const shared = new DatabaseSync(":memory:");
  shared.exec(`CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);
    CREATE TABLE opportunities (title TEXT, agency TEXT, location TEXT, key_date TEXT, estimated_value REAL, detail_url TEXT, trade_fit TEXT, state TEXT);`);
  shared.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  shared.prepare("INSERT INTO opportunities VALUES ('Door hardware, Garfield HS','Seattle Public Schools','Seattle, WA','2099-11-01',250000,'https://x/1','doors','WA')").run();
  shared.prepare("INSERT INTO opportunities VALUES ('Highway overlay','WSDOT','Spokane, WA','2099-11-01',9000000,'https://x/2','civil','WA')").run();
  const env = { DB: db, WEYLAND_DB: d1(shared) };
  const bids = await openBids(env.WEYLAND_DB, "WA", "2026-10-09");
  assert.deepEqual([bids.open, bids.doors, bids.rows[0].title], [1, 1, "Door hardware, Garfield HS"]);
  const router = new NativeRouter();
  registerMarketxRoutes(router);
  const r = await router.handle(new Request("https://weylandai.com/api/marketx/metro/seattle?months=24"), env, {});
  const d = await r.json();
  assert.equal(d.limited, true);
  assert.ok(d.largest.length <= 5);
  assert.equal(d.bids.rows.length, 1);
  assert.equal((await router.handle(new Request("https://weylandai.com/api/marketx/metro/seattle/projects.csv"), env, {})).status, 402);
  assert.equal((await router.handle(new Request("https://weylandai.com/api/marketx/metro/boston"), env, {})).status, 404);
  const m = await (await router.handle(new Request("https://weylandai.com/api/marketx/trends"), env, {})).json();
  assert.equal(m.metros.length, 6, "the old trends route answers with the metros");
});
