// PriceX: list prices from the price books on file, a schedule priced at the sub's multipliers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { pickVariant, priceLine, finishCode, variantNumber, variantFinish } from "../src/lib/pricing.js";
import { registerPricexRoutes, resetForTests, priceItem } from "../src/routes/pricex.js";

// The LCN 2026 book's shape: finish class in the number, no finish code except 652.
const LCN = [
  { full_model_number: "4040XP-3049EDA [Powder Coat]", finish_code: "", list_price: 320 },
  { full_model_number: "4040XP-3049EDA [652 Plated]", finish_code: "652", list_price: 673 },
  { full_model_number: "4040XP-3049EDA [Other Plated]", finish_code: "", list_price: 719 },
  { full_model_number: "4040XP-3077EDA [Powder Coat]", finish_code: "", list_price: 330 },
  { full_model_number: "4040XP-3077 [Powder Coat]", finish_code: "", list_price: 192 },
  { full_model_number: "4040XP-31 [Powder Coat]", finish_code: "", list_price: 11 },
  { full_model_number: "4040XP-CUSH", finish_code: "689", list_price: 0 },
];

test("a variant is chosen by the schedule's own number and finish class, and says how", () => {
  assert.equal(finishCode("US26D"), "626");
  assert.equal(finishCode("26D"), "626");
  assert.equal(finishCode("626"), "626");
  const pick = (m, f) => { const p = pickVariant(LCN, m, f); return p.variant ? [p.variant.list_price, p.basis, p.finishMatched] : [null, p.candidates.length]; };
  assert.deepEqual(pick("4040XP-3049 EDA", "US26D"), [719, "exact", true], "626 is an other-plated finish");
  assert.deepEqual(pick("4040XP-3049EDA", "652"), [673, "exact", true], "652 has its own price");
  assert.deepEqual(pick("4040XP-3049EDA", "689"), [320, "exact", true], "689 is powder coat");
  assert.deepEqual(pick("4040XP-3049EDA/62A", "689"), [320, "options", true]);
  assert.deepEqual(pick("EDA 4040XP-3049", "689"), [320, "closest", true]);
  assert.deepEqual(pick("4040XP EDA", "689"), [null, 2], "two arms match: the schedule does not say which, so nothing is priced");
  assert.deepEqual(pick("4040XP-3077", "626"), [192, "exact", false], "no plated price for 3077: shown in powder coat, and said so");
  assert.equal(pickVariant(LCN, "4040XP-CUSH", "689").variant, null, "a zero price is not a price");
  assert.match(pickVariant(LCN, "4040XP-3049EDA", "").note, /no finish on the schedule/);
  assert.equal(pickVariant([{ full_model_number: "20-057-ICX", finish_code: "", list_price: 227 }], "20-057 ICX", "626").finishMatched, true, "a row with no finish prices every finish");
  assert.equal(variantNumber(LCN[0]), "4040XP-3049EDA");
  assert.equal(variantFinish(LCN[0]), "Powder Coat");
  const vd = [{ full_model_number: "9927-EO-F", finish_code: "626", list_price: 3807 }, { full_model_number: "9927-EO-F [605/619/625/643e]", finish_code: "", list_price: 4318 }, { full_model_number: "9927-EO-F [628]", finish_code: "628", list_price: 3445 }];
  assert.deepEqual([pickVariant(vd, "9927-EO-F", "619").variant.list_price, pickVariant(vd, "9927-EO-F", "643e").variant.list_price, pickVariant(vd, "9927-EO-F", "626").variant.list_price], [4318, 4318, 3807], "one price for several finishes");
});

test("net and extended at the multiplier, in cents", () => {
  assert.deepEqual(priceLine({ qty: 2, list: 292, multiplier: 0.42 }), { list: 292, multiplier: 0.42, net: 122.64, extended: 245.28 });
  assert.equal(priceLine({ qty: 1, list: 100, multiplier: 9 }).multiplier, 1, "a multiplier out of range is not applied");
});

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, project_name TEXT, filename TEXT, file_buffer_key TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_material TEXT, notes TEXT, page_number INTEGER, width TEXT, field_confidence_json TEXT);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT, set_name TEXT);
    CREATE TABLE hardware_components (set_id TEXT, component_type TEXT, quantity INTEGER, uom TEXT, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, specifications TEXT, sequence_order INTEGER);
    CREATE TABLE product_variants (product_id TEXT, full_model_number TEXT, finish_code TEXT, list_price REAL, price_effective_date TEXT, source_catalogue_id TEXT, active INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT, title TEXT, version TEXT);
    CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);`);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Berryessa Elementary','b.pdf',NULL)").run();
  const d = db.prepare("INSERT INTO door_schedule_entries (session_id, mark, hardware_group, fire_rating, width_inches, height_inches, door_type, door_material, frame_material, notes, page_number) VALUES ('s1',?,?,NULL,36,84,NULL,NULL,NULL,NULL,1)");
  d.run("101", "02"); d.run("102", "HW-2"); d.run("103", "1");
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1','Office')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','2','Corridor')").run();
  const c = db.prepare("INSERT INTO hardware_components VALUES (?,?,?,'EA',?,?,?,?,NULL,?)");
  c.run("h2", "closer", 1, "LCN", "4040XP EDA", "4040XP-3049 EDA", "626", 1);
  c.run("h2", "stop", 1, "Nobody", "XYZ-1", "XYZ-1", "626", 2);
  c.run("h1", "closer", 1, "LCN", "4040XP-3077", "4040XP-3077", "689", 1);
  const v = db.prepare("INSERT INTO product_variants VALUES ('p40',?,?,?,'2026-05-29','cat1',1)");
  for (const x of LCN) v.run(x.full_model_number, x.finish_code, x.list_price);
  db.prepare("INSERT INTO product_variants VALUES ('p40','4040XP-3049EDA','626',292,'2025-02-28','cat1',0)").run(); // a superseded edition
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
  assert.deepEqual([p.priced, p.variant.list, p.variant.finish, p.book.name, p.basis], [true, 719, "Other Plated", "LCN Price Book 2026", "exact"], "the superseded edition's price is not used");
  const amb = await priceItem(env, { maker: "LCN", model: "4040XP EDA", finish: "689" }, match);
  assert.equal(amb.priced, false);
  assert.match(amb.reason, /2 configurations matching 4040XP EDA \(4040XP-3049EDA, 4040XP-3077EDA\)/);
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
  assert.equal(look.variant.list, 719, "the lookup is free, signed in or not");
  assert.equal((await call("POST", "/api/forms/pricex/session/s1", {}, { "x-guest": "1" })).status, 401);
  assert.equal((await call("POST", "/api/forms/pricex/session/s1", {}, { "x-user": "u2" })).status, 403);

  await call("POST", "/api/forms/pricex/multipliers", { default: 0.5, byMaker: { LCN: 0.42, Bad: 7 } });
  const saved = await (await call("GET", "/api/forms/pricex/multipliers")).json();
  assert.deepEqual([saved.default, saved.byMaker], [0.5, { lcn: 0.42 }]);

  const res = await (await call("POST", "/api/forms/pricex/session/s1", {})).json();
  const closer2 = res.lines.find((l) => l.set === "2" && l.maker === "LCN");
  assert.deepEqual([closer2.openings, closer2.qty, closer2.list, closer2.net, closer2.extended], [2, 2, 719, 301.98, 603.96], "set 2 is on doors 101 and 102 (02 and HW-2)");
  const closer1 = res.lines.find((l) => l.set === "1");
  assert.equal(closer1.extended, 80.64); // 4040XP-3077 powder coat $192 x 0.42
  const stop = res.lines.find((l) => l.maker === "Nobody");
  assert.equal(stop.priced, false);
  assert.deepEqual([res.totals.net, res.totals.list, res.totals.unpricedLines], [684.6, 1630, 1]);

  const once = await (await call("POST", "/api/forms/pricex/session/s1", { default: 1 })).json();
  assert.equal(once.totals.net, 1630, "multipliers sent with the request price this run only");

  assert.equal((await call("POST", "/api/forms/pricex/session/s1/csv", {})).status, 402);
  db.prepare("UPDATE users SET subscription_tier = 'subconp', subscription_status = 'active'").run();
  const csv = await call("POST", "/api/forms/pricex/session/s1/csv", {});
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /4040XP-3049EDA,Other Plated,exact,LCN Price Book 2026,2026-05-29,719\.00,0\.42,301\.98,603\.96/);
  assert.match(text, /Total of priced lines \(list\),1630\.00,,,684\.60/);
  assert.match(text, /not priced/);
});

test("a seal sold by length: found under the maker's own numbering, one length per door size; a schedule note is not an item", async () => {
  const { priceSchedule } = await import("../src/routes/pricex.js");
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE manufacturers (id TEXT, name TEXT); CREATE TABLE products (id TEXT, manufacturer_id TEXT);
    CREATE TABLE product_variants (product_id TEXT, full_model_number TEXT, finish_code TEXT, list_price REAL, price_effective_date TEXT, source_catalogue_id TEXT, active INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT, title TEXT, version TEXT);`);
  db.prepare("INSERT INTO manufacturers VALUES ('mfr-zero','Zero International')").run();
  db.prepare("INSERT INTO products VALUES ('prod-zer-188s-b','mfr-zero')").run();
  db.prepare("INSERT INTO catalogues VALUES ('z25','Zero International Price Book 2025','1.0')").run();
  const v = db.prepare("INSERT INTO product_variants VALUES ('prod-zer-188s-b',?,'',?,'2026-02-27','z25',1)");
  for (const [n, p] of [["188S-BK [8' (2.4 m)]", 22.88], ["188S-BK [17' (5.1 m)]", 48.62], ["188S-BK [20' (6.1 m)]", 57.2], ["188S-BK [21' (6.4 m)]", 60.06], ["188S-BR [20' (6.1 m)]", 57.2]]) v.run(n, p);
  db.prepare("INSERT INTO product_variants VALUES ('prod-zer-188s-b','188S-BK','626',19.68,'2025-02-28','z25',0)").run(); // superseded
  const env = { DB: d1(db) };
  const zeroMiss = async () => ({ matched: false, reason: "model_not_in_catalogue", maker: { typed: true, known: true, name: "Zero International" } });
  const job = {
    doors: [{ hardware_group: "1", width_inches: 42, height_inches: 94 }, { hardware_group: "1", width_inches: 36, height_inches: 84 }, { hardware_group: "1", width_inches: 42, height_inches: 94 }],
    sets: new Map([["1", { number: "01", items: [
      { qty: 1, manufacturer: "Zero International", model: "188SBK PSA", catalog: "", finish: "BK", description: "GASKETING" },
      { qty: 2, manufacturer: "", model: "VERIFY PERMANENT CORE WITH DISTRICT", catalog: "", finish: "626", description: "CORE" },
    ] }]]),
  };
  const r = await priceSchedule(env, job, { default: 1, byMaker: {} }, zeroMiss);
  const seals = r.lines.filter((l) => l.item === "GASKETING").map((l) => [l.doorWidth, l.doorHeight, l.openings, l.pricedAs, l.list, l.basis]);
  assert.deepEqual(seals, [[42, 94, 2, "188S-BK 20'", 57.2, "options"], [36, 84, 1, "188S-BK 17'", 48.62, "options"]], "2 x 94 + 42 = 230 in = 19.2 ft -> 20'; 2 x 84 + 36 = 17 ft -> 17'");
  assert.match(r.lines[0].note, /one 20' length for the head and jambs of a 42" x 94" opening \(19\.2 ft\)/);
  assert.equal(r.lines[0].book, "Zero International Price Book 2025 1.0");
  const note = r.lines.find((l) => l.item === "CORE");
  assert.deepEqual([note.scheduleNote, note.qty], [true, 0]);
  assert.deepEqual([r.totals.pricedLines, r.totals.unpricedLines, r.totals.noteLines, r.totals.list], [2, 0, 1, 163.02]);
});
