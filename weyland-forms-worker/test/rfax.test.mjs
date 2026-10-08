import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerRfaxRoutes, findIssues, resetForTests } from "../src/routes/rfax.js";
import { loadJob, closeoutModel } from "../src/routes/closex.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, project_name TEXT, filename TEXT, file_buffer_key TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_material TEXT, notes TEXT, page_number INTEGER);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT, set_name TEXT);
    CREATE TABLE hardware_components (set_id TEXT, component_type TEXT, quantity INTEGER, uom TEXT, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, specifications TEXT, sequence_order INTEGER);
    CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);`);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Majestic Way ES','a92.pdf','hardware-sessions/u1/a92.pdf')").run();
  const d = db.prepare("INSERT INTO door_schedule_entries VALUES ('s1',?,?,?,?,?,NULL,NULL,NULL,?,?)");
  d.run("001", "2", "20 MIN", 42, 94, "ADMIN LOBBY HALL", 2);
  d.run("002", "1", "NR", 42, 94, "CLASSROOM", 2);
  d.run("003", "7", null, null, null, "STORAGE", 3);
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1','Classroom')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','2','Pair')").run();
  const c = db.prepare("INSERT INTO hardware_components VALUES (?,?,?,?,?,?,?,?,?,?)");
  c.run("h1", "lockset", 1, "EA", "Schlage", "ND70PD", "ND70PD RHO", "626", null, 1);
  c.run("h2", "exit_device", 2, "EA", "Von Duprin", "98-EO", "98-EO", "626", null, 1);
  c.run("h2", "kick_plate", 2, "EA", "", "K1050", "K1050 10x34", "630", null, 2);
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  return db;
}
async function upload(n) { const doc = await PDFDocument.create(); const f = await doc.embedFont(StandardFonts.Helvetica); for (let i = 1; i <= n; i++) doc.addPage([612, 792]).drawText("schedule page " + i, { x: 50, y: 700, size: 12, font: f }); return doc.save(); }

test("issues a door hardware sub asks about are found in the schedule", async () => {
  const env = { DB: d1(makeDb()) };
  const issues = findIssues(closeoutModel(await loadJob(env, "s1", "u1"), {}));
  const by = Object.fromEntries(issues.map((i) => [i.kind, i]));
  assert.deepEqual(by.missing_set.openings, ["003"]);
  assert.deepEqual(by.rated_no_closer.openings, ["001"]);
  assert.equal(by.rated_no_latch, undefined, "001's exit device latches");
  assert.deepEqual(by.no_size.openings, ["003"]);
  assert.match(by.no_manufacturer.question, /K1050/);
  assert.match(by.rated_no_closer.question, /self-closing/);
});

test("routes: numbered RFIs, answers, ownership, and the PDF carries the cited schedule page", async () => {
  resetForTests();
  const db = makeDb();
  const objects = new Map([["hardware-sessions/u1/a92.pdf", await upload(4)]]);
  const env = { DB: d1(db), UPLOADS: { async get(k) { const b = objects.get(k); return b ? { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } : null; } } };
  const r = new NativeRouter();
  registerRfaxRoutes(r, { authenticate: async (req) => ({ user: { userId: req.headers.get("x-user") || "u1" } }), PDFDocument });
  const call = (m, path, body, user) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: user ? { "x-user": user } : {}, body: body ? JSON.stringify(body) : undefined }), env, {});
  const s = await (await call("GET", "/api/forms/rfax/session/s1")).json();
  const issue = s.issues.find((i) => i.kind === "rated_no_closer");
  const saved = await (await call("POST", "/api/forms/rfax/save", { sessionId: "s1", subject: issue.subject, question: issue.question, openings: [...issue.openings, "NOT-A-DOOR"], to: "HMC Architects", responseBy: "2026-10-15" })).json();
  assert.equal(saved.rfi.number, 1);
  assert.equal((await (await call("POST", "/api/forms/rfax/save", { sessionId: "s1", subject: "x", question: "y" })).json()).rfi.number, 2);
  assert.equal((await call("GET", "/api/forms/rfax/session/s1", null, "intruder")).status, 403);
  await call("POST", `/api/forms/rfax/${saved.rfi.id}/answer`, { response: "Provide LCN 4040XP per set 3.", status: "answered" });
  const after = await (await call("GET", "/api/forms/rfax/session/s1")).json();
  assert.equal(after.rfis[0].status, "answered");
  assert.equal(after.rfis[1].days_outstanding, 0);
  assert.equal((await call("GET", `/api/forms/rfax/${saved.rfi.id}/pdf`)).status, 402);
  db.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const res = await call("GET", `/api/forms/rfax/${saved.rfi.id}/pdf`);
  assert.equal(res.status, 200);
  const pdf = await PDFDocument.load(await res.arrayBuffer());
  assert.ok(pdf.getPageCount() >= 2, "the RFI plus schedule page 2");
});
