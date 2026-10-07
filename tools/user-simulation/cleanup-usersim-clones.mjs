// tools/user-simulation/cleanup-usersim-clones.mjs
//
// Deletes "The WeylandAI Building" demo clones left behind by harness runs: the clones owned by
// usersim_* test ids (a signed-in homepage visit clones the demo project for the visitor; until
// 2026-10-07 signin-journey.mjs did not delete them). Only rows tied to those clones are touched:
// the clone's hardware_extraction_sessions row (file_buffer_key = demo-clone/<id>, user_id LIKE
// usersim_%), every row keyed by that session_id, and the clone's project row. Nothing else that
// a usersim_* id may own is deleted here (for example the September upload sessions).
//
// Usage: node tools/user-simulation/cleanup-usersim-clones.mjs            (dry run: lists them)
//        node tools/user-simulation/cleanup-usersim-clones.mjs --delete   (deletes, then reads back)
import { d1, purgeTestData } from "./lib/journey-kit.mjs";

const doDelete = process.argv.includes("--delete");
const OWNED_CLONES = "FROM hardware_extraction_sessions WHERE user_id LIKE 'usersim\\_%' ESCAPE '\\' AND file_buffer_key = 'demo-clone/' || id";
const [found] = await d1("SELECT id, user_id, project_id, created_at " + OWNED_CLONES + " ORDER BY created_at;");
const rows = found.results || [];
console.log(rows.length + " demo clone(s) owned by usersim_* ids" + (rows.length ? " (" + rows[0].created_at + " .. " + rows[rows.length - 1].created_at + ")" : ""));
for (const r of rows) console.log("  " + r.created_at + "  " + r.user_id + "  session " + r.id + "  project " + r.project_id);
if (!doDelete || !rows.length) {
  if (!doDelete && rows.length) console.log("dry run: pass --delete to delete them");
  process.exit(0);
}
const res = await purgeTestData({ cloneSessions: rows.map((r) => ({ session_id: r.id, project_id: r.project_id })) });
console.log("deleted rows by table: " + JSON.stringify(res.deleted));
console.log("sessions " + res.sessions + ", projects " + res.projects + ", skipped " + JSON.stringify(res.skipped));
const [left] = await d1("SELECT COUNT(*) AS n " + OWNED_CLONES + ";");
const [leftProjects] = await d1("SELECT COUNT(*) AS n FROM projects WHERE id IN (" + rows.map((r) => "'" + r.project_id + "'").join(",") + ");");
const n = ((left.results || [])[0] || {}).n, np = ((leftProjects.results || [])[0] || {}).n;
console.log("read back: " + n + " usersim-owned clone session(s), " + np + " of their project row(s) left");
process.exit(res.ok && n === 0 && np === 0 ? 0 : 1);
