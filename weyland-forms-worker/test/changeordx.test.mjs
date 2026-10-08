import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { priceChange, registerChangeOrdxRoutes, resetForTests } from "../src/routes/changeordx.js";

const CONTRACT = { id: "p1", quote_number: 7, client_name: "Austin Bridge & Road", project_address: "Majestic Way ES", grand_total: 100000, tax_rate: 0.0825, created_at: "2026-09-01T00:00:00Z",
  line_item_snapshot: JSON.stringify([{ door_type: "Group 2 pair", material: "WD", fire_rating: "20 MIN", quantity: 8, unit_price: 4200 }, { door_type: "Group 1 single", material: "WD", quantity: 6, unit_price: 1850 }]) };

test("a change is priced at the contract's unit prices, marked up, taxed on materials, and carried into the contract sum", () => {
  const p = priceChange(CONTRACT, {
    items: [{ action: "add", ref: "0", qty: 2, unit_price: 1 }, { action: "delete", ref: "1", qty: 1 }, { action: "add", description: "Kick plate 10x34", qty: 4, unit_price: 65 }],
    labor: [{ description: "Install added pairs", hours: 12, rate: 95 }],
    markup: { overhead: 10, profit: 5, bond: 1 }, days: 3,
  }, [{ status: "approved", amount: 2500, days: 2 }, { status: "rejected", amount: 9999, days: 9 }]);
  assert.deepEqual(p.items.map((x) => [x.ext, x.priced_from]), [[8400, "contract"], [-1850, "contract"], [260, "entered"]]);
  assert.equal(p.totals.materials, 6810);
  assert.equal(p.totals.labor, 1140);
  assert.equal(p.totals.subtotal, 7950);
  assert.equal(p.totals.overhead, 795);
  assert.equal(p.totals.profit, 437.25);
  assert.equal(p.totals.tax, 561.83);
  assert.equal(p.totals.bond, 97.44);
  assert.equal(p.totals.total, 9841.52);
  assert.deepEqual(p.contract, { original: 100000, approvedBefore: 2500, before: 102500, after: 112341.52, daysBefore: 2, days: 3, daysAfter: 5 });
});

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }

test("routes: change orders are numbered per contract, approved ones carry forward, the PDF needs payment", async () => {
  resetForTests();
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE proposals (id TEXT, user_id TEXT, quote_number INTEGER, client_name TEXT, project_address TEXT, grand_total REAL, tax_rate REAL, line_item_snapshot TEXT, created_at TEXT); CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);");
  db.prepare("INSERT INTO proposals VALUES (?,?,?,?,?,?,?,?,?)").run("p1", "u1", 7, CONTRACT.client_name, CONTRACT.project_address, 100000, 0, CONTRACT.line_item_snapshot, CONTRACT.created_at);
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerChangeOrdxRoutes(r, { authenticate: async (req) => ({ user: { userId: req.headers.get("x-user") || "u1" } }) });
  const call = (m, path, body, user) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: user ? { "x-user": user } : {}, body: body ? JSON.stringify(body) : undefined }), env, {});
  const one = await (await call("POST", "/api/forms/changeordx/save", { proposalId: "p1", items: [{ ref: "1", qty: 2 }], days: 1, title: "Add two singles" })).json();
  assert.equal(one.changeOrder.number, 1);
  assert.equal(one.changeOrder.amount, 3700);
  await call("POST", `/api/forms/changeordx/${one.changeOrder.id}/status`, { status: "approved" });
  const pv = await (await call("POST", "/api/forms/changeordx/preview", { proposalId: "p1", items: [{ ref: "0", qty: 1 }] })).json();
  assert.equal(pv.number, 2);
  assert.equal(pv.priced.contract.before, 103700);
  assert.equal((await call("POST", "/api/forms/changeordx/preview", { proposalId: "p1" }, "someone-else")).status, 404);
  assert.equal((await call("GET", `/api/forms/changeordx/${one.changeOrder.id}/pdf`)).status, 402);
  db.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const pdf = await call("GET", `/api/forms/changeordx/${one.changeOrder.id}/pdf`);
  assert.equal(pdf.status, 200);
  assert.ok((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount() >= 1);
  const list = await (await call("GET", "/api/forms/changeordx/contracts")).json();
  assert.equal(list.contracts[0].change_orders[0].status, "approved");
  assert.equal(list.contracts[0].lines[1].unit_price, 1850);
});
