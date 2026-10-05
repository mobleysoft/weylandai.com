// weyland-subx-worker/src/lib/demo-clone-sweep.js
//
// Expiry sweep for the per-visitor demo clones that POST /api/demo/
// weyland-building/session (main worker, src/routes/demo-trial.js) creates:
// a fresh projects row, a hardware_extraction_sessions row whose
// file_buffer_key is "demo-clone/<sessionId>", and the cloned door /
// hardware rows under that session. The clone's KV pointer expires after
// 24 h (CLONE_TTL_SECONDS) but nothing ever removed the D1 rows - 233
// clone sessions had accumulated by 2026-10-05, 164 of them past their
// life. This runs from scheduled() (wrangler.toml [triggers]) and removes
// everything a clone owns, by session_id, then by project_id, then the
// project row itself - only when no other session still points at it.

const CLONE_KEY_PREFIX = "demo-clone/";

// Every table with a session_id column (sqlite_master, 2026-10-05).
const SESSION_TABLES = [
  "affirm_audit_log", "claude_api_logs", "client_telemetry", "constraint_executions", "cps_gaps",
  "cut_sheet_discovery_queue", "door_hardware_matrix", "door_schedule_entries", "hardware_door_matrix",
  "hardware_page_extractions", "hardware_sets", "ocr_validation_queue", "post_transformation_review_queue",
  "quotes", "schedule_entries", "schedule_region_candidates", "session_affirm_status",
  "session_cut_sheet_matches", "session_nomenclature", "session_readiness", "takeoff_line_items",
  "takeoff_quotes", "takeoff_settings", "undo_stack"
];
// Children of hardware_sets (by hardware_set_id).
const HARDWARE_SET_CHILD_TABLES = ["hardware_components", "submittal_cut_sheets"];
// Every table with a project_id column other than hardware_extraction_sessions.
const PROJECT_TABLES = ["kdp_packets", "locations", "quotes", "submittals", "takeoff_quotes", "verification_runs"];

async function ensureLog(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS demo_clone_sweeps (id TEXT PRIMARY KEY, ran_at TEXT NOT NULL, older_than_hours INTEGER, sessions_deleted INTEGER, projects_deleted INTEGER, rows_deleted INTEGER, remaining_expired INTEGER, errors TEXT)"
  ).run();
}

/**
 * Delete up to `limit` expired demo clones. Returns a summary that is also
 * written to demo_clone_sweeps.
 */
export async function sweepExpiredDemoClones(env, { olderThanHours = 24, limit = 40 } = {}) {
  await ensureLog(env);
  const summary = { ranAt: new Date().toISOString(), olderThanHours, sessionsDeleted: 0, projectsDeleted: 0, orphanProjectsDeleted: 0, rowsDeleted: 0, remainingExpired: 0, errors: [] };
  const expired = await env.DB.prepare(
    "SELECT id, project_id FROM hardware_extraction_sessions WHERE file_buffer_key LIKE ? AND created_at < datetime('now', ?) ORDER BY created_at ASC LIMIT ?"
  ).bind(CLONE_KEY_PREFIX + "%", "-" + olderThanHours + " hours", limit).all();

  for (const row of expired.results || []) {
    try {
      const stmts = [];
      for (const t of HARDWARE_SET_CHILD_TABLES) {
        stmts.push(env.DB.prepare("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE session_id = ?)").bind(row.id));
      }
      for (const t of SESSION_TABLES) stmts.push(env.DB.prepare("DELETE FROM " + t + " WHERE session_id = ?").bind(row.id));
      stmts.push(env.DB.prepare("DELETE FROM hardware_extraction_sessions WHERE id = ?").bind(row.id));
      const results = await env.DB.batch(stmts);
      for (const r of results) summary.rowsDeleted += r.meta?.changes || 0;
      summary.sessionsDeleted++;

      if (row.project_id) {
        const still = await env.DB.prepare("SELECT COUNT(*) AS n FROM hardware_extraction_sessions WHERE project_id = ?").bind(row.project_id).first();
        if (!still || still.n === 0) {
          const pst = PROJECT_TABLES.map((t) => env.DB.prepare("DELETE FROM " + t + " WHERE project_id = ?").bind(row.project_id));
          pst.push(env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(row.project_id));
          const pr = await env.DB.batch(pst);
          for (const r of pr) summary.rowsDeleted += r.meta?.changes || 0;
          summary.projectsDeleted++;
        }
      }
    } catch (e) {
      summary.errors.push(row.id + ": " + String(e.message).slice(0, 160));
    }
  }

  // Clones created before 2026-09-12 never had their session linked to the
  // project row (project_id was not set), so the pass above cannot reach
  // their projects. Those rows are recognisable: same name and client as
  // the demo seed, no session pointing at them, older than the clone life.
  try {
    summary.orphanProjectsDeleted = await sweepOrphanCloneProjects(env, olderThanHours, 100);
  } catch (e) {
    summary.errors.push("orphan projects: " + String(e.message).slice(0, 160));
  }

  const left = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM hardware_extraction_sessions WHERE file_buffer_key LIKE ? AND created_at < datetime('now', ?)"
  ).bind(CLONE_KEY_PREFIX + "%", "-" + olderThanHours + " hours").first();
  summary.remainingExpired = left?.n || 0;

  await env.DB.prepare(
    "INSERT INTO demo_clone_sweeps (id, ran_at, older_than_hours, sessions_deleted, projects_deleted, rows_deleted, remaining_expired, errors) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), summary.ranAt, olderThanHours, summary.sessionsDeleted, summary.projectsDeleted, summary.rowsDeleted, summary.remainingExpired, summary.errors.length ? JSON.stringify(summary.errors) : null).run();
  return summary;
}

const SEED_PROJECT_ID = "eabd5ff6-e19f-4e6b-acfc-9a250445dfa8"; // src/routes/demo-trial.js

async function sweepOrphanCloneProjects(env, olderThanHours, limit) {
  const rows = await env.DB.prepare(
    "SELECT p.id FROM projects p, projects s WHERE s.id = ? AND p.id != s.id AND p.name = s.name AND p.client_name IS s.client_name " +
    "AND p.id NOT IN (SELECT project_id FROM hardware_extraction_sessions WHERE project_id IS NOT NULL) AND p.created_at < datetime('now', ?) LIMIT ?"
  ).bind(SEED_PROJECT_ID, "-" + olderThanHours + " hours", limit).all();
  let deleted = 0;
  for (const r of rows.results || []) {
    const stmts = PROJECT_TABLES.map((t) => env.DB.prepare("DELETE FROM " + t + " WHERE project_id = ?").bind(r.id));
    stmts.push(env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(r.id));
    await env.DB.batch(stmts);
    deleted++;
  }
  return deleted;
}

/** Public, read-only: live clone counts and the last sweep. */
export async function demoCloneSweepStatus(env) {
  await ensureLog(env);
  const counts = await env.DB.prepare(
    "SELECT COUNT(*) AS clones, SUM(CASE WHEN created_at < datetime('now', '-24 hours') THEN 1 ELSE 0 END) AS expired FROM hardware_extraction_sessions WHERE file_buffer_key LIKE ?"
  ).bind(CLONE_KEY_PREFIX + "%").first();
  const last = await env.DB.prepare("SELECT ran_at, sessions_deleted, projects_deleted, rows_deleted, remaining_expired, errors FROM demo_clone_sweeps ORDER BY ran_at DESC LIMIT 1").first();
  const orphans = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM projects p, projects s WHERE s.id = ? AND p.id != s.id AND p.name = s.name AND p.client_name IS s.client_name AND p.id NOT IN (SELECT project_id FROM hardware_extraction_sessions WHERE project_id IS NOT NULL)"
  ).bind(SEED_PROJECT_ID).first();
  return { clones: counts?.clones || 0, expired: counts?.expired || 0, orphanProjects: orphans?.n || 0, ttlHours: 24, lastSweep: last || null };
}
