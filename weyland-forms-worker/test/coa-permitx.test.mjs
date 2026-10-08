import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerCoaPermitxRoutes, coaModel, permitModel, NFPA80_CHECKS } from "../src/routes/coa-permitx.js";
import { loadJob } from "../src/routes/closex.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, project_name TEXT, filename TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_material TEXT, notes TEXT, page_number INTEGER);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT, set_name TEXT);
    CREATE TABLE hardware_components (set_id TEXT, component_type TEXT, quantity INTEGER, uom TEXT, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, specifications TEXT, sequence_order INTEGER);
    CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);`);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Majestic Way ES','a.pdf')").run();
  const d = db.prepare("INSERT INTO door_schedule_entries VALUES ('s1',?,?,?,?,?,NULL,NULL,NULL,?,2)");
  d.run("001", "2", "90 MIN", 72, 84, "STAIR 1");
  d.run("002", "1", "20 MIN", 36, 84, "CORRIDOR");
  d.run("003", "3", "NR", 36, 84, "IT ROOM");
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1','Office')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','2','Stair pair')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h3','s1','3','Server')").run();
  const c = db.prepare("INSERT INTO hardware_components VALUES (?,?,?,?,?,?,?,?,?,?)");
  c.run("h1", "lockset", 1, "EA", "Schlage", "ND50PD", "ND50PD", "626", null, 1);
  c.run("h2", "exit_device", 2, "EA", "Von Duprin", "98-EO-F", "98-EO-F", "626", null, 1);
  c.run("h2", "closer", 2, "EA", "LCN", "4040XP", "4040XP", "689", null, 2);
  c.run("h2", "coordinator", 1, "EA", "Ives", "COR", "COR72", "628", null, 3);
  c.run("h3", "lockset", 1, "EA", "Schlage", "ND96PD EL", "ND96PD EL RHO", "626", null, 1);
  c.run("h3", "maglock", 1, "EA", "Securitron", "M62", "M62", "628", null, 2);
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  return db;
}

test("CoA: every rated opening gets an acceptance record, flagged when its set lacks a closer", async () => {
  const c = coaModel(await loadJob({ DB: d1(makeDb()) }, "s1", "u1"), { ahj: "City of San Jose" });
  assert.deepEqual(c.ratedOpenings.map((o) => [o.mark, o.closer, o.latch, o.pair]), [["001", true, true, true], ["002", false, true, false]]);
  assert.equal(NFPA80_CHECKS.length, 13);
});

test("PermitX: the scope from the schedule and the electrified openings", async () => {
  const p = permitModel(await loadJob({ DB: d1(makeDb()) }, "s1", "u1"), {});
  assert.equal(p.scope, "Furnish and install door hardware at 3 openings (2 fire-rated), 8 hardware items in 3 hardware sets per the door and hardware schedules, including electrified or access-controlled hardware at 1 opening.");
  assert.deepEqual(p.electrified.map((o) => o.mark), ["003"]);
  assert.deepEqual(p.products.map((x) => x.model).sort(), ["M62", "ND96PD EL"]);
});

test("routes: previews free, PDFs gated, both build", async () => {
  const db = makeDb();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerCoaPermitxRoutes(r, { authenticate: async () => ({ user: { userId: "u1" } }) });
  const call = (path, body) => r.handle(new Request("https://weylandai.com" + path, { method: "POST", body: JSON.stringify(body) }), env, {});
  assert.equal((await (await call("/api/forms/coa/preview", { sessionId: "s1" })).json()).rated.length, 2);
  assert.equal((await call("/api/forms/coa/pdf", { sessionId: "s1" })).status, 402);
  assert.equal((await call("/api/forms/permitx/pdf", { sessionId: "s1" })).status, 402);
  db.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  for (const t of ["coa", "permitx"]) {
    const res = await call(`/api/forms/${t}/pdf`, { sessionId: "s1" });
    assert.equal(res.status, 200, t);
    assert.ok((await PDFDocument.load(await res.arrayBuffer())).getPageCount() >= 1);
  }
});
