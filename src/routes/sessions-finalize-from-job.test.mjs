import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsFinalizeFromJobRoutes } from "./sessions-finalize-from-job.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = null } = {}) {
  return {
    prepare() {
      return {
        bind: (...args) => ({
          async first() { return session; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

const persistDoorScheduleResponseOk = async () => ({ success: true, entries_count: 3, low_confidence_count: 1 });
const transformDoorEntriesToHardwareSetsOk = async () => {};
const materializeDseToLineItemsOk = async () => {};
const parseAndValidateExtractionOk = () => ({ doors: [], extraction_confidence: 0.9 });

function setup({
  authenticate = authOk,
  db,
  callEdge,
  persistDoorScheduleResponse = persistDoorScheduleResponseOk,
  transformDoorEntriesToHardwareSets = transformDoorEntriesToHardwareSetsOk,
  materializeDseToLineItems = materializeDseToLineItemsOk,
  parseAndValidateExtraction = parseAndValidateExtractionOk,
} = {}) {
  const router = new NativeRouter();
  registerSessionsFinalizeFromJobRoutes(router, {
    authenticate,
    callEdge: callEdge || (async () => ({ status: 200, body: { status: "completed", result: { content: [{ text: "{}" }] } } })),
    persistDoorScheduleResponse,
    transformDoorEntriesToHardwareSets,
    materializeDseToLineItems,
    parseAndValidateExtraction,
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST finalize-from-job: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 401);
});

test("POST finalize-from-job: 404 when session not found or not owned", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST finalize-from-job: 409 when job isn't the session's pending job", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: { pending_job_id: "other", user_id: "u1" } }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 409);
});

test("POST finalize-from-job: 502 when edge fetch fails", async () => {
  const db = makeFakeDb({ session: { pending_job_id: "j1", user_id: "u1" } });
  const { router, env } = setup({ db, callEdge: async () => ({ status: 500, body: { error: "boom" } }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 502);
});

test("POST finalize-from-job: 425 when job isn't completed yet", async () => {
  const db = makeFakeDb({ session: { pending_job_id: "j1", user_id: "u1" } });
  const { router, env } = setup({ db, callEdge: async () => ({ status: 200, body: { status: "running" } }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 425);
});

test("POST finalize-from-job: real happy path for a door_schedule session persists via persistDoorScheduleResponse", async () => {
  let sessionQueryCount = 0;
  const db = {
    prepare() {
      return {
        bind: () => ({
          async first() {
            sessionQueryCount++;
            if (sessionQueryCount === 1) return { pending_job_id: "j1", user_id: "u1" };
            return { document_type: "door_schedule", tenant_id: "ven_weyland", total_pages: 2 };
          },
          async run() { return { success: true }; },
        }),
      };
    },
  };
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.schedule_type, "door_schedule");
  assert.equal(body.rows_inserted, 3);
  assert.equal(body.low_confidence_count, 1);
});

test("POST finalize-from-job: door_schedule 422 when persistDoorScheduleResponse fails", async () => {
  let sessionQueryCount = 0;
  const db = {
    prepare() {
      return {
        bind: () => ({
          async first() {
            sessionQueryCount++;
            if (sessionQueryCount === 1) return { pending_job_id: "j1", user_id: "u1" };
            return { document_type: "door_schedule", tenant_id: "ven_weyland", total_pages: 2 };
          },
          async run() { return { success: true }; },
        }),
      };
    },
  };
  const { router, env } = setup({ db, persistDoorScheduleResponse: async () => ({ success: false, error: "parse failed" }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 422);
});

test("POST finalize-from-job: real happy path for a non-door-schedule session inserts parsed door rows", async () => {
  let sessionQueryCount = 0;
  const db = {
    prepare() {
      return {
        bind: () => ({
          async first() {
            sessionQueryCount++;
            if (sessionQueryCount === 1) return { pending_job_id: "j1", user_id: "u1" };
            if (sessionQueryCount === 2) return { document_type: "hardware_schedule", tenant_id: "ven_weyland", total_pages: 1 };
            return { tenant_id: "ven_weyland" };
          },
          async run() { return { success: true }; },
        }),
      };
    },
  };
  const { router, env } = setup({
    db,
    parseAndValidateExtraction: () => ({ doors: [{ door_number: "101", hardware_group: "HG1" }], extraction_confidence: 0.95 }),
  });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/finalize-from-job/j1", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.rows_inserted, 1);
});
