import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerBidxRoutes, dollarsInWords, bidPackage } from "../src/routes/bidx.js";

test("amounts in words, as a bid form writes them", () => {
  assert.equal(dollarsInWords(48250.5), "Forty-eight thousand two hundred fifty and 50/100 dollars");
  assert.equal(dollarsInWords(1000000), "One million and 00/100 dollars");
  assert.equal(dollarsInWords(112341.52), "One hundred twelve thousand three hundred forty-one and 52/100 dollars");
  assert.equal(dollarsInWords(19.99), "Nineteen and 99/100 dollars");
  assert.equal(dollarsInWords(0), "Zero and 00/100 dollars");
});

test("the package joins the HuntX notice and the PropX price", () => {
  const pkg = bidPackage(
    { source: "il_cdb", source_ref: "B-09-2023-24", title: "Replace Windows & Doors — Galesburg", agency: "Capital Development Board", location: "Galesburg, IL", key_date: "2026-12-15", detail_url: "https://example.gov/notice" },
    { quote_number: 7, grand_total: 112341.52, line_item_snapshot: JSON.stringify([{ door_type: "Pair", quantity: 8, unit_price: 4200 }]) },
    { company: "Precision Auto Doors LLC", bondPercent: 5, alternates: [{ description: "Electrified hardware at 4 openings", amount: 9800 }, { description: "Delete kick plates", kind: "deduct", amount: 640 }], addenda: [{ no: "1", date: "2026-11-02" }] });
  assert.equal(pkg.bid.agency, "Capital Development Board");
  assert.equal(pkg.baseBid, 112341.52);
  assert.equal(pkg.bond.amount, 5617.08);
  assert.deepEqual(pkg.alternates.map((a) => a.add), [true, false]);
  assert.deepEqual(pkg.lines[0], { description: "Pair", qty: 8, unit: 4200, ext: 33600 });
  assert.equal(pkg.priceSource, "PropX quote 7");
});

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
test("routes: your own proposal only; the PDF needs an amount and payment", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE proposals (id TEXT, user_id TEXT, quote_number INTEGER, client_name TEXT, project_address TEXT, grand_total REAL, line_item_snapshot TEXT); CREATE TABLE opportunities (id TEXT, source TEXT, source_ref TEXT, title TEXT, agency TEXT, location TEXT, key_date TEXT, detail_url TEXT); CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);");
  db.prepare("INSERT INTO proposals VALUES ('p1','u1',7,'GC','Galesburg',50000,'[]')").run();
  db.prepare("INSERT INTO opportunities VALUES ('o1','il_cdb','B-1','Replace doors','CDB','Galesburg, IL','2026-12-15','https://x')").run();
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerBidxRoutes(r, { authenticate: async (req) => ({ user: { userId: req.headers.get("x-user") || "u1" } }) });
  const call = (path, body, user) => r.handle(new Request("https://weylandai.com" + path, { method: "POST", headers: user ? { "x-user": user } : {}, body: JSON.stringify(body) }), env, {});
  assert.equal((await (await call("/api/forms/bidx/preview", { opportunityId: "o1", proposalId: "p1" })).json()).package.baseBidWords, "Fifty thousand and 00/100 dollars");
  assert.equal((await call("/api/forms/bidx/preview", { proposalId: "p1" }, "u2")).status, 404);
  assert.equal((await call("/api/forms/bidx/pdf", { opportunityId: "o1" })).status, 400);
  assert.equal((await call("/api/forms/bidx/pdf", { proposalId: "p1" })).status, 402);
  db.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const res = await call("/api/forms/bidx/pdf", { opportunityId: "o1", proposalId: "p1", company: "PAD" });
  assert.equal(res.status, 200);
  assert.ok((await PDFDocument.load(await res.arrayBuffer())).getPageCount() >= 1);
});
