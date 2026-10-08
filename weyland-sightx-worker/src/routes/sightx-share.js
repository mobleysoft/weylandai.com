// weyland-sightx-worker/src/routes/sightx-share.js
//
// SightX's paid output (2026-10-08): save a corridor and share it. Building
// and walking a corridor from a schedule is free; keeping it and sending the
// GC, the architect or the owner a link they can walk without an account
// comes with SightX, the suite or the $100 first submittal.
//   POST   /api/sightx/models {name, model}   save (signed in, paid) -> {id, url}
//   GET    /api/sightx/models                 your saved corridors
//   GET    /api/sightx/models/:id             a shared corridor (public, read-only)
//   DELETE /api/sightx/models/:id             remove yours (the link stops working)

import { jsonResponse3 } from "../lib/json-response.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const ID = /^[A-Za-z0-9]{12}$/;
const MAX_BYTES = 400000;
let ready = false;
export function resetForTests() { ready = false; }
async function ensure(db) {
  if (ready) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS sightx_models (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, project TEXT, doors INTEGER, model_json TEXT NOT NULL, created_at TEXT NOT NULL)").run();
  ready = true;
}
function newId() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => a[x % a.length]).join("");
}
/** Only the fields the page draws; nothing else is stored or served. */
export function cleanModel(m) {
  const s = (v, n) => (v == null ? null : String(v).slice(0, n));
  const doors = (Array.isArray(m?.doors) ? m.doors : []).slice(0, 120).map((d) => ({
    mark: s(d.mark, 24), location: s(d.location, 80), type: s(d.type, 60), material: s(d.material, 20),
    width_in: Math.max(12, Math.min(144, Number(d.width_in) || 36)), height_in: Math.max(60, Math.min(168, Number(d.height_in) || 84)),
    size_known: !!d.size_known, leaves: d.leaves === 2 ? 2 : 1, rating: s(d.rating, 30), frame: s(d.frame, 40), panic: !!d.panic, set: s(d.set, 20),
    source_page: d.source_page == null ? null : Number(d.source_page) || null,
  }));
  const sets = {};
  for (const [k, items] of Object.entries(m?.sets || {}).slice(0, 200)) {
    sets[String(k).slice(0, 20)] = (Array.isArray(items) ? items : []).slice(0, 40).map((it) => ({ type: s(it.type, 20), qty: Number(it.qty) || 1, label: s(it.label, 160), manufacturer: s(it.manufacturer, 60), catalog: s(it.catalog, 80), finish: s(it.finish, 20) }));
  }
  return { project: s(m?.project, 160) || "Corridor", source: s(m?.source, 20), doors, sets, notes: (Array.isArray(m?.notes) ? m.notes : []).slice(0, 10).map((n) => String(n).slice(0, 300)) };
}

export function registerSightXShareRoutes(router, { authenticate }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error || !user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to save and share a corridor." }, 401) };
    await ensure(env.DB);
    return { userId: String(user.userId) };
  }
  router.post("/api/sightx/models", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const text = await request.text();
    if (text.length > MAX_BYTES) return jsonResponse3({ success: false, message: "That corridor is too large to save." }, 413);
    let body; try { body = JSON.parse(text); } catch (_) { return jsonResponse3({ success: false, message: "invalid JSON" }, 400); }
    const model = cleanModel(body.model);
    if (!model.doors.length) return jsonResponse3({ success: false, message: "Build a corridor first." }, 400);
    if (!(await outputAccess(env, a.userId, "sightx")).paid) return jsonResponse3(paymentRequired("Saving and sharing a corridor"), 402);
    const id = newId();
    const name = String(body.name || model.project).slice(0, 120);
    await env.DB.prepare("INSERT INTO sightx_models (id, user_id, name, project, doors, model_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, a.userId, name, model.project, model.doors.length, JSON.stringify(model), new Date().toISOString()).run();
    return jsonResponse3({ success: true, id, name, url: `/sightx/?m=${id}` });
  });
  router.get("/api/sightx/models", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const rows = (await env.DB.prepare("SELECT id, name, project, doors, created_at FROM sightx_models WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(a.userId).all()).results || [];
    return jsonResponse3({ success: true, models: rows.map((r) => ({ ...r, url: `/sightx/?m=${r.id}` })) });
  });
  router.get("/api/sightx/models/:id", async (request, env) => {
    const id = request.params.id;
    if (!ID.test(id)) return jsonResponse3({ success: false, message: "Not a SightX link." }, 404);
    await ensure(env.DB);
    const row = await env.DB.prepare("SELECT name, model_json, created_at FROM sightx_models WHERE id = ?").bind(id).first();
    if (!row) return jsonResponse3({ success: false, message: "This shared corridor was removed or never existed." }, 404);
    return jsonResponse3({ success: true, name: row.name, shared_at: row.created_at, model: JSON.parse(row.model_json) });
  });
  router.delete("/api/sightx/models/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await env.DB.prepare("DELETE FROM sightx_models WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).run();
    return jsonResponse3({ success: true });
  });
}
