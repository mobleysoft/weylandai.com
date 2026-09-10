import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerDoorScheduleMarksRoutes } from "./door-schedule-marks.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({
  marks = [],
  mark = null,
  dupeCount = 0,
  session = null,
  hardwareSet = null,
  marksToAffirm = [],
  skippedCount = 0,
} = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("as cnt FROM door_schedule_entries")) return { cnt: dupeCount };
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            if (sql.includes("FROM hardware_sets WHERE id")) return hardwareSet;
            if (sql.includes("as count FROM door_schedule_entries")) return { count: skippedCount };
            if (sql.includes("FROM door_schedule_entries")) return mark;
            return null;
          },
          async all() {
            if (sql.includes("SELECT id FROM door_schedule_entries")) return { results: marksToAffirm };
            return { results: marks };
          },
          async run() {
            return { success: true };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerDoorScheduleMarksRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/door-schedule/session/:sessionId/marks: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/session/s1/marks"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/door-schedule/session/:sessionId/marks: real happy path returns marks and summary counts", async () => {
  const marks = [
    { id: "m1", mark: "101", validation_status: "affirmed", extraction_confidence: 0.9 },
    { id: "m2", mark: "102", validation_status: null, extraction_confidence: 0.5 },
  ];
  const { router, env } = setup({ db: makeFakeDb({ marks }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/session/s1/marks"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.total, 2);
  assert.equal(body.summary.affirmed, 1);
  assert.equal(body.summary.pending, 1);
  assert.equal(body.summary.low_confidence_count, 1);
});

test("PATCH /api/door-schedule/mark/:markId/affirm: 404 when mark not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: null }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/affirm", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 404);
});

test("PATCH /api/door-schedule/mark/:markId/affirm: 409 on duplicate MARK in session", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1", mark: "101" }, dupeCount: 1 }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/affirm", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 409);
});

test("PATCH /api/door-schedule/mark/:markId/affirm: real happy path affirms", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1", mark: "101" }, dupeCount: 0 }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/affirm", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "affirmed");
});

test("PATCH /api/door-schedule/mark/:markId/reject: missing reason is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/reject", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("PATCH /api/door-schedule/mark/:markId/reject: invalid reason is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/door-schedule/mark/m1/reject", { method: "PATCH", body: JSON.stringify({ reason: "nonsense" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PATCH /api/door-schedule/mark/:markId/reject: real happy path rejects with a valid reason", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1" } }) });
  const req = new Request("https://example.com/api/door-schedule/mark/m1/reject", { method: "PATCH", body: JSON.stringify({ reason: "duplicate" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "rejected");
});

test("DELETE /api/door-schedule/mark/:markId: 404 when mark not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: null }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 404);
});

test("DELETE /api/door-schedule/mark/:markId: 403 when session isn't owned by the user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1", session_id: "s1" }, session: null }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 403);
});

test("DELETE /api/door-schedule/mark/:markId: real happy path deletes when owned", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1", session_id: "s1", mark: "101" }, session: { id: "s1" } }) });
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mark_value, "101");
});

test("PATCH /api/door-schedule/mark/:markId/correct: missing corrections is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/correct", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("PATCH /api/door-schedule/mark/:markId/correct: 404 when mark not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: null }) });
  const req = new Request("https://example.com/api/door-schedule/mark/m1/correct", { method: "PATCH", body: JSON.stringify({ corrections: { mark: "102" } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PATCH /api/door-schedule/mark/:markId/correct: real happy path applies valid fields and flags invalid ones", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: { id: "m1", mark: "101" } }) });
  const req = new Request("https://example.com/api/door-schedule/mark/m1/correct", {
    method: "PATCH",
    body: JSON.stringify({ corrections: { mark: "102", not_a_real_field: "x" } }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "corrected");
  assert.deepEqual(body.corrections_applied, ["mark"]);
  assert.deepEqual(body.invalid_fields, ["not_a_real_field"]);
});

test("POST /api/door-schedule/session/:sessionId/marks/batch-affirm: missing both mark_ids and threshold is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/door-schedule/session/s1/marks/batch-affirm", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/door-schedule/session/:sessionId/marks/batch-affirm: real happy path affirms by mark_ids and skips missing/already-affirmed", async () => {
  const db = makeFakeDb({ mark: { id: "m1", validation_status: "pending" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/door-schedule/session/s1/marks/batch-affirm", {
    method: "POST",
    body: JSON.stringify({ mark_ids: ["m1"] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.affirmed_count, 1);
});

test("POST /api/door-schedule/session/:sessionId/marks/batch-affirm: invalid confidence_threshold is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/door-schedule/session/s1/marks/batch-affirm", {
    method: "POST",
    body: JSON.stringify({ confidence_threshold: 2 }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/door-schedule/session/:sessionId/marks/batch-affirm: real happy path affirms by confidence_threshold", async () => {
  const db = makeFakeDb({ marksToAffirm: [{ id: "m1" }, { id: "m2" }], skippedCount: 3 });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/door-schedule/session/s1/marks/batch-affirm", {
    method: "POST",
    body: JSON.stringify({ confidence_threshold: 0.8 }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.affirmed_count, 2);
  assert.equal(body.skipped_count, 3);
});

test("PATCH /api/door-schedule/mark/:markId/resolve-hardware: missing hardware_set_id is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/door-schedule/mark/m1/resolve-hardware", { method: "PATCH", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("PATCH /api/door-schedule/mark/:markId/resolve-hardware: 404 when mark not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ mark: null }) });
  const req = new Request("https://example.com/api/door-schedule/mark/m1/resolve-hardware", { method: "PATCH", body: JSON.stringify({ hardware_set_id: "hs1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PATCH /api/door-schedule/mark/:markId/resolve-hardware: real happy path resolves and reports the matched set_number", async () => {
  const db = makeFakeDb({ mark: { id: "m1", hardware_group: "HG1" }, hardwareSet: { id: "hs1", set_number: "SET-1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/door-schedule/mark/m1/resolve-hardware", { method: "PATCH", body: JSON.stringify({ hardware_set_id: "hs1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.hardware_group, "SET-1");
});
