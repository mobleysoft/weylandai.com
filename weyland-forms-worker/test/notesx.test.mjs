import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerNotesxRoutes, minutesFrom } from "../src/routes/notesx.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE meetingx_room_items (id TEXT, room TEXT, kind TEXT, text TEXT, user_id TEXT, user_name TEXT, done INTEGER, created_at TEXT); CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);");
  const i = db.prepare("INSERT INTO meetingx_room_items VALUES (?,?,?,?,?,?,?,?)");
  i.run("1", "r1", "chat", "Pairs at B-pod need coordinators?", "u1", "Pat", 0, "2026-10-08T15:00:00Z");
  i.run("2", "r1", "decision", "Use LCN 4040XP on all corridor pairs", "u2", "Sam (GC)", 0, "2026-10-08T15:05:00Z");
  i.run("3", "r1", "action", "Pat: resubmit set 2 with coordinators by Friday", "u2", "Sam (GC)", 1, "2026-10-08T15:07:00Z");
  i.run("4", "r1", "transcript", "we will add the coordinator", "u1", "Pat", 0, "2026-10-08T15:06:00Z");
  i.run("5", "r2", "chat", "someone else's room", "u9", "Lee", 0, "2026-10-08T15:00:00Z");
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  return db;
}

test("minutes from the room record: attendees, decisions, actions with state, discussion", () => {
  const db = makeDb();
  const items = db.prepare("SELECT * FROM meetingx_room_items WHERE room='r1' ORDER BY created_at").all();
  const m = minutesFrom(items, { title: "Weekly OAC", room: "r1" });
  assert.deepEqual(m.attendees, ["Pat", "Sam (GC)"]);
  assert.deepEqual(m.decisions.map((d) => d.text), ["Use LCN 4040XP on all corridor pairs"]);
  assert.deepEqual(m.actions.map((a) => [a.text, a.done]), [["Pat: resubmit set 2 with coordinators by Friday", true]]);
  assert.equal(m.discussion.length, 1);
  assert.equal(m.started, "2026-10-08T15:00:00.000Z");
});

test("routes: only a participant gets the minutes; the PDF needs payment", async () => {
  const db = makeDb();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerNotesxRoutes(r, { authenticate: async () => ({ user: { userId: "u1" } }) });
  const call = (m, path, body) => r.handle(new Request("https://weylandai.com" + path, { method: m, body: body ? JSON.stringify(body) : undefined }), env, {});
  const rooms = await (await call("GET", "/api/forms/notesx/rooms")).json();
  assert.deepEqual(rooms.rooms.map((x) => [x.room, x.decisions, x.actions]), [["r1", 1, 1]]);
  assert.equal((await call("POST", "/api/forms/notesx/preview", { room: "r2" })).status, 403);
  assert.equal((await call("POST", "/api/forms/notesx/pdf", { room: "r1" })).status, 402);
  db.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const res = await call("POST", "/api/forms/notesx/pdf", { room: "r1", includeTranscript: true });
  assert.equal(res.status, 200);
  assert.ok((await PDFDocument.load(await res.arrayBuffer())).getPageCount() >= 1);
});
