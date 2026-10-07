// The demo-clone sweep (src/lib/demo-clone-sweep.js) removes an expired
// clone's rows, its project, and the submittal package the workspace may have
// built for it in R2; a fresh clone and an uploaded schedule are left alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { sweepExpiredDemoClones } from "../src/lib/demo-clone-sweep.js";

function d1(db) {
  const wrap = (sql) => {
    let args = [];
    const stmt = {
      bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
      async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : { ...r }; },
      async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    };
    return stmt;
  };
  return { prepare: wrap, async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; } };
}

test("an expired clone goes with its rows, its project and its package PDF", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, file_buffer_key TEXT, created_at TEXT)");
  db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT, client_name TEXT, created_at TEXT)");
  db.exec("CREATE TABLE hardware_sets (id TEXT, session_id TEXT)");
  for (const t of ["affirm_audit_log", "claude_api_logs", "client_telemetry", "constraint_executions", "cps_gaps", "cut_sheet_discovery_queue", "door_hardware_matrix", "door_schedule_entries", "hardware_door_matrix", "hardware_page_extractions", "ocr_validation_queue", "post_transformation_review_queue", "quotes", "schedule_entries", "schedule_region_candidates", "session_affirm_status", "session_cut_sheet_matches", "session_nomenclature", "session_readiness", "takeoff_line_items", "takeoff_quotes", "takeoff_settings", "undo_stack"]) {
    db.exec("CREATE TABLE IF NOT EXISTS " + t + " (session_id TEXT, project_id TEXT)");
  }
  db.exec("CREATE TABLE hardware_components (set_id TEXT, hardware_set_id TEXT)");
  db.exec("CREATE TABLE submittal_cut_sheets (hardware_set_id TEXT)");
  for (const t of ["kdp_packets", "locations", "submittals", "verification_runs"]) db.exec("CREATE TABLE " + t + " (project_id TEXT)");
  const ins = db.prepare("INSERT INTO hardware_extraction_sessions VALUES (?,?,?,?,datetime('now', ?))");
  ins.run("old-clone", "u1", "p-old", "demo-clone/old-clone", "-30 hours");
  ins.run("new-clone", "u1", "p-new", "demo-clone/new-clone", "-1 hours");
  ins.run("upload", "u1", null, "hardware-sessions/u1/x", "-30 hours");
  db.prepare("INSERT INTO projects VALUES ('p-old','The WeylandAI Building','Demo',datetime('now','-30 hours'))").run();
  db.prepare("INSERT INTO projects VALUES ('p-new','The WeylandAI Building','Demo',datetime('now','-1 hours'))").run();
  db.prepare("INSERT INTO door_schedule_entries (session_id) VALUES ('old-clone'), ('old-clone'), ('new-clone')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('s1','old-clone')").run();
  // One part keyed the way every reader writes it (set_id only), one with both ids (a demo copy).
  db.prepare("INSERT INTO hardware_components VALUES ('s1', NULL), ('s1', 's1')").run();
  const deleted = [];
  const env = { DB: d1(db), UPLOADS: { async delete(k) { deleted.push(k); } } };
  const summary = await sweepExpiredDemoClones(env);
  assert.equal(summary.sessionsDeleted, 1);
  assert.equal(summary.projectsDeleted, 1);
  assert.deepEqual(summary.errors, []);
  assert.deepEqual(deleted, ["submittals/old-clone/final_submittal.pdf"]);
  assert.deepEqual(db.prepare("SELECT id FROM hardware_extraction_sessions ORDER BY id").all().map((r) => r.id), ["new-clone", "upload"]);
  assert.deepEqual(db.prepare("SELECT id FROM projects").all().map((r) => r.id), ["p-new"]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM door_schedule_entries").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hardware_components").get().n, 0);
});
