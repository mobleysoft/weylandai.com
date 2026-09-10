import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareScheduleCandidatesRoutes } from "./hardware-schedule-candidates.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ candidates = [], candidate = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM schedule_region_candidates WHERE id")) return candidate;
          return null;
        },
        async all() {
          if (sql.includes("FROM schedule_region_candidates")) return { results: candidates };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true, changes: 1 }; },
      };
      return stmt;
    },
    async batch(stmts) { return stmts.map(() => ({ success: true })); },
  };
}

function setup({ db, session = { id: "s1", page_count: 10 }, getOrRenderPage } = {}) {
  const router = new NativeRouter();
  registerHardwareScheduleCandidatesRoutes(router, {
    authenticate: authOk,
    getSessionStatus: async () => session,
    getOrRenderPage: getOrRenderPage || (async () => new Uint8Array([1, 2, 3])),
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET .../candidates: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareScheduleCandidatesRoutes(router, { authenticate: authFail, getSessionStatus: async () => null, getOrRenderPage: async () => null });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/candidates"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET .../candidates: 404 when session not found", async () => {
  const { router, env } = setup({ session: null });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/candidates"), env, {});
  assert.equal(res.status, 404);
});

test("GET .../candidates: real summary computed from candidate statuses", async () => {
  const db = makeFakeDb({
    candidates: [
      { id: "c1", page_number: 1, schedule_type: "door", status: "pending", detection_hints_found: null, bounding_box: null, bounding_box_percent: null },
      { id: "c2", page_number: 1, schedule_type: "door", status: "affirmed", detection_hints_found: null, bounding_box: null, bounding_box_percent: null },
    ],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/candidates"), env, {});
  const body = await res.json();
  assert.equal(body.summary.total, 2);
  assert.equal(body.summary.pending, 1);
  assert.equal(body.summary.affirmed, 1);
});

test("POST .../candidates: missing page_number is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/candidates", { method: "POST", body: JSON.stringify({ schedule_type: "door", bounding_box: { x: 0, y: 0, width: 1, height: 1 } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST .../candidates: real happy path inserts a pending candidate", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/candidates", {
    method: "POST",
    body: JSON.stringify({ page_number: 1, schedule_type: "door", bounding_box: { x: 0, y: 0, width: 100, height: 50 } }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.candidate.status, "pending");
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO schedule_region_candidates")));
});

test("PATCH .../candidates/:id: 404 when candidate not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ candidate: null }) });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/candidates/c1", { method: "PATCH", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST .../candidates/validate: real delegated conflict-detection pass with no candidates", async () => {
  const { router, env } = setup({ db: makeFakeDb({ candidates: [] }) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/candidates/validate", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.has_conflicts, false);
});

test("DELETE .../candidates: real bulk delete, optionally scoped to a detection_method query param", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/candidates?detection_method=vision", { method: "DELETE" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const deleteRun = db.runs.find((r) => r.sql.includes("DELETE FROM schedule_region_candidates"));
  assert.ok(deleteRun.sql.includes("AND detection_method = ?"));
  assert.equal(deleteRun.binds[1], "vision");
});
