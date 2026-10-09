// A customer deletes a session: every row that points at it, the PDF and its cached copy (2026-10-09).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { deleteSessionEverywhere } from "../src/routes/subx-workspace.js";

test("every table with the session's id, the sets' items, the R2 object and the KV copy go; another session stays", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, file_buffer_key TEXT);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT); CREATE TABLE hardware_components (id TEXT, set_id TEXT);
    CREATE TABLE door_schedule_entries (id TEXT, session_id TEXT); CREATE TABLE hardware_page_extractions (id TEXT, session_id TEXT);
    CREATE TABLE set_notes (id TEXT, hardware_set_id TEXT);`);
  for (const s of ["s1", "s2"]) {
    db.prepare("INSERT INTO hardware_extraction_sessions VALUES (?, 'u1', ?)").run(s, "hardware-sessions/u1/" + s + ".pdf");
    db.prepare("INSERT INTO hardware_sets VALUES (?, ?)").run("h" + s, s);
    db.prepare("INSERT INTO hardware_components VALUES (?, ?)").run("c" + s, "h" + s);
    db.prepare("INSERT INTO door_schedule_entries VALUES (?, ?)").run("d" + s, s);
    db.prepare("INSERT INTO hardware_page_extractions VALUES (?, ?)").run("p" + s, s);
    db.prepare("INSERT INTO set_notes VALUES (?, ?)").run("n" + s, "h" + s);
  }
  const d1 = { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { return db.prepare(sql).get(...a) || null; }, async all() { return { results: db.prepare(sql).all(...a) }; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; } }; return st; } };
  const gone = [];
  const env = { DB: d1, UPLOADS: { async delete(k) { gone.push("r2:" + k); } }, CACHE: { async delete(k) { gone.push("kv:" + k); } } };
  const r = await deleteSessionEverywhere(env, { id: "s1", file_buffer_key: "hardware-sessions/u1/s1.pdf" });
  assert.equal(r.rows, 6);
  for (const t of ["hardware_extraction_sessions", "hardware_sets", "hardware_components", "door_schedule_entries", "hardware_page_extractions", "set_notes"]) {
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM " + t).get().n, 1, t + " keeps only the other session's row");
  }
  assert.deepEqual(gone, ["r2:hardware-sessions/u1/s1.pdf", "kv:hardware-sessions/u1/s1.pdf"]);
});
