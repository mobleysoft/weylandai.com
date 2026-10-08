// PriceX: list prices from the price books on file, a schedule priced at the sub's multipliers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { pickVariant, priceLine, finishCode } from "../src/lib/pricing.js";
import { registerPricexRoutes, resetForTests, priceItem } from "../src/routes/pricex.js";

const LCN = [
  { full_model_number: "4040XP-3049EDA", finish_code: "626", list_price: 292 },
  { full_model_number: "4040XP-3049EDA", finish_code: "689", list_price: 270 },
  { full_model_number: "4040XP-REG", finish_code: "689", list_price: 240 },
  { full_model_number: "4040XP", finish_code: "689", list_price: 231 },
  { full_model_number: "4040XP-CUSH", finish_code: "689", list_price: 0 },
];

test("a variant is chosen by the schedule's own number and finish, and says how", () => {
  assert.equal(finishCode("US26D"), "626");
  assert.equal(finishCode("26D"), "626");
  assert.equal(finishCode("626"), "626");
  let p = pickVariant(LCN, "4040XP-3049 EDA", "US26D");
  assert.deepEqual([p.variant.list_price, p.basis, p.finishMatched], [292, "exact", true]);
  p = pickVariant(LCN, "4040XP REG x 62A", "689");
  assert.deepEqual([p.variant.full_model_number, p.basis], ["4040XP-REG", "options"]);
  assert.match(p.note, /not priced/);
  p = pickVariant(LCN, "4040XP REG", "693");
  assert.equal(p.finishMatched, false, "no black price: shown in another finish, and said so");
  assert.equal(pickVariant([{ full_model_number: "X1", finish_code: "626", list_price: 0 }], "X1", "626"), null, "a zero price is not a price");
});

test("net and extended at the multiplier, in cents", () => {
  assert.deepEqual(priceLine({ qty: 2, list: 292, multiplier: 0.42 }), { list: 292, multiplier: 0.42, net: 122.64, extended: 245.28 });
  assert.equal(priceLine({ qty: 1, list: 100, multiplier: 9 }).multiplier, 1, "a multiplier out of range is not applied");
});

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, project_name TEXT, filename TEXT, file_buffer_key TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_material TEXT, notes TEXT, page_number INTEGER);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT, set_name TEXT);
    CREATE TABLE hardware_components (set_id TEXT, component_type TEXT, quantity INTEGER, uom TEXT, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, specifications TEXT, sequence_order INTEGER);
    CREATE TABLE product_variants (product_id TEXT, full_model_number TEXT, finish_code TEXT, list_price REAL, price_effective_date TEXT, source_catalogue_id TEXT, active INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT, title TEXT, version TEXT);
    CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);`);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Berryessa Elementary','b.pdf',NULL)").run();
  const d = db.prepare("INSERT INTO door_schedule_entries VALUES ('s1',?,?,NULL,36,84,NULL,NULL,NULL,NULL,1)");
  d.run("101", "02"); d.run("102", "HW-2"); d.run("103", "1");
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1','Office')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','2','Corridor')").run();
  const c = db.prepare("INSERT INTO hardware_components VALUES (?,?,?,'EA',?,?,?,?,NULL,?)");
  c.run("h2", "closer", 1, "LCN", "4040XP EDA", "4040XP-3049 EDA", "626", 1);
  c.run("h2", "stop", 1, "Nobody", "XYZ-1", "XYZ-1", "626", 2);
  c.run("h1", "closer", 1, "LCN", "4040XP REG", "4040XP REG", "689", 1);
  const v = db.prepare("INSERT INTO product_variants VALUES ('p40',?,?,?,'2026-01-05','cat1',1)");
  for (const x of LCN) v.run(x.full_model_number, x.finish_code, x.list_price);
  db.prepare("INSERT INTO catalogues VALUES ('cat1','LCN Price Book','2026')").run();
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  return db;
}
const match = async (c) => c.manufacturer === "LCN"
  ? { matched: true, matchType: "base_model", product: { id: "p40", manufacturer: "LCN", model: "4040XP" }, maker: { typed: true, known: true } }
  : { matched: false, maker: { typed: true, known: false } };

test("one item: its price and the book it is from; an unknown maker is not priced", async () => {
  const env = { DB: d1(makeDb()) };
  const p = await priceItem(env, { maker: "LCN", model: "4040XP-3049EDA", finish: "26D" }, match);
  assert.deepEqual([p.priced, p.variant.list, p.book.name, p.basis], [true, 292, "LCN Price Book 2026", "exact"]);
  const n = await priceItem(env, { maker: "Nobody", model: "XYZ-1" }, match);
  assert.equal(n.priced, false);
  assert.match(n.reason, /Nobody is not a maker/);
});

test("routes: the schedule priced at the account's multipliers, openings per set counted, CSV paid", async () => {
  resetForTests();
  const db = makeDb();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerPricexRoutes(r, { authenticate: async (req) => ({ user: req.headers.get("x-guest") ? { ephemeral: true } : { userId: req.headers.get("x-user") || "u1" } }), match });
  const call = (m, path, body, h = {}) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }), env, {});

  const look = await (await call("GET", "/api/forms/pricex/lookup?maker=LCN&model=4040XP-3049EDA&finish=626", null, { "x-guest": "1" })).json();
  assert.equal(look.variant.list, 292, "the lookup is free, signed in or not");
  assert.equal((await call("POST", "/api/forms/pricex/session/s1", {}, { "x-guest": "1" })).status, 401);
  assert.equal((await call("POST", "/api/forms/pricex/session/s1", {}, { "x-user": "u2" })).status, 403);

  await call("POST", "/api/forms/pricex/multipliers", { default: 0.5, byMaker: { LCN: 0.42, Bad: 7 } });
  const saved = await (await call("GET", "/api/forms/pricex/multipliers")).json();
  assert.deepEqual([saved.default, saved.byMaker], [0.5, { lcn: 0.42 }]);

  const res = await (await call("POST", "/api/forms/pricex/session/s1", {})).json();
  const closer2 = res.lines.find((l) => l.set === "2" && l.maker === "LCN");
  assert.deepEqual([closer2.openings, closer2.qty, closer2.list, closer2.net, closer2.extended], [2, 2, 292, 122.64, 245.28], "set 2 is on doors 101 and 102 (02 and HW-2)");
  const closer1 = res.lines.find((l) => l.set === "1");
  assert.equal(closer1.extended, 100.8); // 4040XP-REG 689 $240 x 0.42
  const stop = res.lines.find((l) => l.maker === "Nobody");
  assert.equal(stop.priced, false);
  assert.deepEqual([res.totals.net, res.totals.list, res.totals.unpricedLines], [346.08, 824, 1]);

  const once = await (await call("POST", "/api/forms/pricex/session/s1", { default: 1 })).json();
  assert.equal(once.totals.net, 824, "multipliers sent with the request price this run only");

  assert.equal((await call("POST", "/api/forms/pricex/session/s1/csv", {})).status, 402);
  db.prepare("UPDATE users SET subscription_tier = 'subconp', subscription_status = 'active'").run();
  const csv = await call("POST", "/api/forms/pricex/session/s1/csv", {});
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /4040XP-3049EDA,626,exact,LCN Price Book 2026,292\.00,0\.42,122\.64,245\.28/);
  assert.match(text, /Total of priced lines \(list\),824\.00,,,346\.08/);
  assert.match(text, /not priced/);
});
