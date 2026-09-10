import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareScheduleFinalizeImageRoutes } from "./hardware-schedule-finalize-image.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = { user_id: "u1", total_pages: 5 }, packet = null, candidate = null, sessionDoc = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM hardware_extraction_sessions WHERE id") && sql.includes("total_pages")) return session;
          if (sql.includes("FROM kdp_packets WHERE job_id")) return packet;
          if (sql.includes("FROM schedule_region_candidates WHERE id")) return candidate;
          if (sql.includes("document_type") || sql.includes("tenant_id")) return sessionDoc;
          return null;
        },
        async all() { return { results: [] }; },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

function setup({ db, overrides = {} } = {}) {
  const router = new NativeRouter();
  registerHardwareScheduleFinalizeImageRoutes(router, {
    authenticate: authOk,
    callEdge: async () => ({ status: 200, body: { status: "completed", result: {}, provider_path: "bridge" } }),
    materializeDseToLineItems: async () => ({}),
    transformDoorEntriesToHardwareSets: async () => ({}),
    savePageExtraction2: async () => ({}),
    buildExtractionResultFromVision: () => ({ hardware_groups: [], door_hardware_matrix: [], detected_nomenclature: null, metadata: {} }),
    persistDoorScheduleResponse: async () => ({ success: true, entries_count: 3, low_confidence_count: 0 }),
    ...overrides,
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST .../finalize-image/:jobId: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareScheduleFinalizeImageRoutes(router, { authenticate: authFail, callEdge: async () => ({}), materializeDseToLineItems: async () => ({}), transformDoorEntriesToHardwareSets: async () => ({}), savePageExtraction2: async () => ({}), buildExtractionResultFromVision: () => ({}), persistDoorScheduleResponse: async () => ({}) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("POST .../finalize-image/:jobId: 404 when the session isn't owned by this user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: { user_id: "someone-else", total_pages: 5 } }) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST .../finalize-image/:jobId: 409 when the job's packet belongs to a different session", async () => {
  const db = makeFakeDb({ packet: { id: "p1", candidate_id: "c1", connection_id: "other-session" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  assert.equal(res.status, 409);
});

test("POST .../finalize-image/:jobId: 425 when the edge job isn't completed yet", async () => {
  const { router, env } = setup({ overrides: { callEdge: async () => ({ status: 200, body: { status: "running" } }) } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  assert.equal(res.status, 425);
});

test("POST .../finalize-image/:jobId: real door-schedule path delegates to persistDoorScheduleResponse", async () => {
  const db = makeFakeDb({ packet: { id: "p1", candidate_id: "c1", connection_id: "s1" }, candidate: { schedule_type: "door_schedule" } });
  let persistCalled = false;
  const { router, env } = setup({ db, overrides: { persistDoorScheduleResponse: async () => { persistCalled = true; return { success: true, entries_count: 7, low_confidence_count: 1 }; } } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(persistCalled, true);
  assert.equal(body.schedule_type, "door_schedule");
  assert.equal(body.entries_count, 7);
});

test("POST .../finalize-image/:jobId: real door-schedule failure returns 422 with parse_failed error", async () => {
  const db = makeFakeDb({ packet: { id: "p1", candidate_id: "c1", connection_id: "s1" }, candidate: { schedule_type: "door_schedule" } });
  const { router, env } = setup({ db, overrides: { persistDoorScheduleResponse: async () => ({ success: false, error: "bad parse" }) } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, "parse_failed");
});

test("POST .../finalize-image/:jobId: real non-door happy path delegates to savePageExtraction2 and reports groups/components", async () => {
  let saveCalled = false;
  const { router, env } = setup({
    overrides: {
      savePageExtraction2: async () => { saveCalled = true; },
      buildExtractionResultFromVision: () => ({ hardware_groups: [{ components: [{}, {}] }], door_hardware_matrix: [], detected_nomenclature: null, metadata: {} }),
    },
  });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(saveCalled, true);
  assert.equal(body.groups_count, 1);
  assert.equal(body.components, 2);
});

test("POST .../finalize-image/:jobId: a parse failure in buildExtractionResultFromVision is a real 422", async () => {
  const { router, env } = setup({ overrides: { buildExtractionResultFromVision: () => { throw new Error("bad vision result"); } } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/finalize-image/job1", { method: "POST" }), env, {});
  assert.equal(res.status, 422);
});
