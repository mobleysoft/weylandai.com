import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ingestAwards, searchAwards, resetAwardsForTests } from "../src/lib/awards.js";
import { NativeRouter } from "../src/lib/router.js";
import { registerCompxRoutes } from "../src/routes/compx.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; } }; return st; }, async batch(stmts) { return Promise.all(stmts.map((s) => s.run())); } }; }
const AWARDS = [
  { request_id: "1", start_date: "2026-08-31T00:00:00.000", agency_name: "Fire Department", short_title: "Hollow Metal Doors and Frames", vendor_name: "Simbio USA Inc", contract_amount: "300000", category_description: "Goods", selection_method_description: "M/WBE Noncompetitive Small Purchase", pin: "05727W0009001" },
  { request_id: "2", start_date: "2026-08-24T00:00:00.000", agency_name: "Parks and Recreation", short_title: "Ocean Breeze Athletic Complex Storefront Doors Reconstruction", vendor_name: "Approved General Contracting Inc.", contract_amount: "1198600", category_description: "Construction/Construction Services" },
  { request_id: "3", start_date: "2025-05-01T00:00:00.000", agency_name: "Transportation", short_title: "Reconstruction of Bridge BIN 2240", vendor_name: "Big Civil LLC", contract_amount: "9000000", category_description: "Construction/Construction Services" },
  { request_id: "5", start_date: "2024-08-16T00:00:00.000", agency_name: "Environmental Protection", short_title: "HVR-210: Hillview Reservoir Chemical Addition Facilities", vendor_name: "Skanska ECCO III HVR JV", contract_amount: "847720000", category_description: "Construction/Construction Services", additional_description_1: "... including doors, access control and security upgrades ..." },
  { request_id: "4", start_date: "2024-03-01T00:00:00.000", agency_name: "School Construction Authority", short_title: "Door hardware replacement at P.S. 15", vendor_name: "Simbio USA Inc", contract_amount: "450000", category_description: "Construction/Construction Services" },
];

test("awards are pulled into our own index and searched there, with the vendors ranked", async () => {
  resetAwardsForTests();
  const db = d1(new DatabaseSync(":memory:"));
  const urls = [];
  const r = await ingestAwards(db, async (u) => { urls.push(u); return new Response(JSON.stringify(urls.length === 1 ? AWARDS : []), { status: 200 }); });
  assert.equal(r.upserted, 5);
  assert.match(decodeURIComponent(urls[0]), /type_of_notice_description='Award'/);
  await ingestAwards(db, async () => new Response(JSON.stringify(AWARDS), { status: 200 }));
  const doors = await searchAwards(db, { fit: "doors" });
  assert.deepEqual(doors.rows.map((x) => x.pin || x.title).length, 3);
  assert.equal(doors.vendors[0].vendor, "Approved General Contracting Inc.");
  assert.deepEqual(doors.vendors.find((v) => v.vendor === "Simbio USA Inc").awards, 2);
  const all = await searchAwards(db, { fit: "all", q: "bridge" });
  assert.equal(all.count, 1);
  assert.equal((await searchAwards(db, { fit: "building" })).rows.some((x) => /Bridge/.test(x.title)), false);
  assert.equal(doors.rows.some((x) => /Hillview/.test(x.title)), false, "a description that mentions doors is not door scope");
});

test("route: a free search shows 10 rows and 5 vendors; the CSV needs payment", async () => {
  resetAwardsForTests();
  const raw = new DatabaseSync(":memory:");
  const db = d1(raw);
  const many = Array.from({ length: 30 }, (_, i) => ({ ...AWARDS[0], request_id: "x" + i, vendor_name: "Vendor " + i, contract_amount: String(1000 * (i + 1)) }));
  await ingestAwards(db, async () => new Response(JSON.stringify(many), { status: 200 }));
  raw.exec("CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT)");
  const r = new NativeRouter();
  registerCompxRoutes(r);
  const env = { DB: db, WEYLAND_DB: db };
  const d = await (await r.handle(new Request("https://weylandai.com/api/compx/awards?fit=doors"), env, {})).json();
  assert.equal(d.count, 30);
  assert.equal(d.awards.length, 10);
  assert.equal(d.vendors.length, 5);
  assert.equal(d.limited, true);
  assert.equal((await r.handle(new Request("https://weylandai.com/api/compx/awards?format=csv"), env, {})).status, 402);
});
