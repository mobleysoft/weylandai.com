// Real, runnable verification for src/routes/cross-reference.js - run with:
//   node --test src/routes/cross-reference.test.mjs
//
// authenticate is injected (same pattern as other route modules), so the
// fake here stands in for exactly that seam - matching/normalization/D1
// write logic under test is the real code, not mocked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCrossReferenceRoutes } from "./cross-reference.js";

function makeFakeDb({ project, sessions = [], hardwareSets = [], doorMarks = [] } = {}) {
  const batched = [];
  return {
    batched,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM projects WHERE id")) return project || null;
          return null;
        },
        async all() {
          if (sql.includes("FROM hardware_extraction_sessions")) return { results: sessions };
          if (sql.includes("FROM hardware_sets")) return { results: hardwareSets };
          if (sql.includes("FROM door_schedule_entries")) return { results: doorMarks };
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch(writes) {
      batched.push(...writes);
      return writes.map(() => ({ success: true }));
    },
  };
}

function makeRequest(projectId) {
  const req = new Request(`https://example.com/api/projects/${projectId}/cross-reference`, { method: "POST" });
  return req;
}

const authOk = async (r, env) => ({ user: { tenantId: "ven_weyland" } });
const authFail = async () => ({ error: new Response(JSON.stringify({ error: "auth" }), { status: 401 }) });

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCrossReferenceRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("auth failure short-circuits before touching the database", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(makeRequest("p1"), env, {});
  assert.equal(res.status, 401);
});

test("unknown project (wrong tenant or missing) is a real 404", async () => {
  const { router, env } = setup({ db: makeFakeDb({ project: null }) });
  const res = await router.handle(makeRequest("p1"), env, {});
  assert.equal(res.status, 404);
});

test("no door-schedule sessions returns an empty real report, no writes", async () => {
  const db = makeFakeDb({ project: { id: "p1", name: "Test Project" }, sessions: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("p1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.total_marks, 0);
  assert.equal(db.batched.length, 0);
});

test("real exact-match: a door mark's normalized group matches exactly one hardware set", async () => {
  const db = makeFakeDb({
    project: { id: "p1", name: "Test Project" },
    sessions: [{ id: "door-sess", document_type: "door_schedule" }, { id: "hw-sess", document_type: "hardware_schedule" }],
    hardwareSets: [{ id: "set-1", set_number: "HW-01" }],
    doorMarks: [{ id: "mark-1", hardware_group: "Hardware Set 01", hardware_set_id: null, hardware_group_match_method: null, validated_by: null }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("p1"), env, {});
  const body = await res.json();
  assert.equal(body.matched_exact, 1);
  assert.equal(body.matched_pattern, 0);
  assert.equal(db.batched.length, 1);
});

test("a mark already user-resolved is skipped, not re-matched or cleared", async () => {
  const db = makeFakeDb({
    project: { id: "p1", name: "Test Project" },
    sessions: [{ id: "door-sess", document_type: "door_schedule" }],
    doorMarks: [{ id: "mark-1", hardware_group: "HW-99", hardware_set_id: "set-x", hardware_group_match_method: "user_override", validated_by: "ron" }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("p1"), env, {});
  const body = await res.json();
  assert.equal(body.skipped_user_resolved, 1);
  assert.equal(body.cleared_stale, 0);
  assert.equal(db.batched.length, 0);
});

test("an ambiguous match (2+ exact candidates sharing a normalized token) is reported, not silently picked", async () => {
  const db = makeFakeDb({
    project: { id: "p1", name: "Test Project" },
    sessions: [{ id: "door-sess", document_type: "door_schedule" }, { id: "hw-sess", document_type: "hardware_schedule" }],
    hardwareSets: [{ id: "set-1", set_number: "01" }, { id: "set-2", set_number: "HW-01" }],
    doorMarks: [{ id: "mark-1", hardware_group: "1", hardware_set_id: null, hardware_group_match_method: null, validated_by: null }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("p1"), env, {});
  const body = await res.json();
  assert.equal(body.unmatched_ambiguous, 1);
});
