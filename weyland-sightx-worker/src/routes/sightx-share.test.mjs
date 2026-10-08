import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../lib/router.js";
import { registerSightXShareRoutes, cleanModel, resetForTests } from "./sightx-share.js";
import { sampleModel } from "../lib/schedule-model.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }

test("only the fields the page draws are stored", () => {
  const m = cleanModel({ project: "X", doors: [{ mark: "1", width_in: 9999, evil: "<script>" }], sets: { A: [{ type: "closer", label: "LCN", extra: 1 }] }, junk: true });
  assert.deepEqual(Object.keys(m), ["project", "source", "doors", "sets", "notes"]);
  assert.equal(m.doors[0].width_in, 144);
  assert.equal(m.doors[0].evil, undefined);
  assert.equal(m.sets.A[0].extra, undefined);
});

test("save needs an account and payment; anyone with the link can open it; only the owner removes it", async () => {
  resetForTests();
  const raw = new DatabaseSync(":memory:");
  raw.exec("CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT); INSERT INTO users VALUES ('u1','free','trialing',NULL);");
  const env = { DB: d1(raw) };
  const r = new NativeRouter();
  registerSightXShareRoutes(r, { authenticate: async (req) => { const u = req.headers.get("x-user"); return u === "guest" ? { user: { ephemeral: true } } : u ? { user: { userId: u } } : { error: new Response("", { status: 401 }) }; } });
  const call = (m, path, body, user) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: user ? { "x-user": user } : {}, body: body ? JSON.stringify(body) : undefined }), env, {});
  const model = sampleModel();
  assert.equal((await call("POST", "/api/sightx/models", { model }, "guest")).status, 401);
  assert.equal((await call("POST", "/api/sightx/models", { model }, "u1")).status, 402);
  raw.prepare("UPDATE users SET subscription_tier='subconp', subscription_status='active'").run();
  const saved = await (await call("POST", "/api/sightx/models", { name: "Majestic Way", model }, "u1")).json();
  assert.match(saved.url, /^\/sightx\/\?m=[A-Za-z0-9]{12}$/);
  const opened = await (await call("GET", "/api/sightx/models/" + saved.id)).json();
  assert.equal(opened.model.doors.length, 10);
  assert.equal(opened.name, "Majestic Way");
  await call("DELETE", "/api/sightx/models/" + saved.id, null, "someone-else");
  assert.equal((await call("GET", "/api/sightx/models/" + saved.id)).status, 200, "another account cannot remove it");
  await call("DELETE", "/api/sightx/models/" + saved.id, null, "u1");
  assert.equal((await call("GET", "/api/sightx/models/" + saved.id)).status, 404);
  assert.equal((await call("GET", "/api/sightx/models/../../etc")).status, 404);
});
