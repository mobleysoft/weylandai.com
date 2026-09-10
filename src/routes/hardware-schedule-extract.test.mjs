import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareScheduleExtractRoutes } from "./hardware-schedule-extract.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const subOk = async () => null;

function makeFakeDb({ hardwareGroup = null, session = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM hardware_extraction_sessions")) return session;
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
  registerHardwareScheduleExtractRoutes(router, {
    authenticate: authOk,
    requireActiveSubscription: subOk,
    getSessionStatus: async () => ({ id: "s1" }),
    extractHardwareSchedule: async () => ({ hardware_groups: [] }),
    storeHardwareExtraction: async () => ({ sets_inserted: 0, components_inserted: 0 }),
    getHardwareGroupForReview: async () => ({ components: [] }),
    updateHardwareGroup: async () => ({}),
    detectFileType: () => ({ type: "pdf", mimeType: "application/pdf" }),
    extractPdfBookmarks2: async () => ({ numPages: 3, bookmarks: null }),
    detectSchedulePages: () => null,
    createExtractionSession: async () => "sess-1",
    logTelemetryEvent: async () => {},
    detectTextLayer2: async () => ({ hasTextLayer: true, route: "text-extractable", textItemCount: 10 }),
    ...overrides,
  });
  return { router, env: { DB: db || makeFakeDb(), CACHE: { async put() {} }, UPLOADS: { async put() {}, async get() { return null; } } } };
}

test("POST /api/hardware-schedule/extract: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareScheduleExtractRoutes(router, { authenticate: authFail, requireActiveSubscription: subOk, getSessionStatus: async () => null, extractHardwareSchedule: async () => ({}), storeHardwareExtraction: async () => ({}), getHardwareGroupForReview: async () => ({}), updateHardwareGroup: async () => ({}), detectFileType: () => ({}), extractPdfBookmarks2: async () => ({}), detectSchedulePages: () => null, createExtractionSession: async () => "", logTelemetryEvent: async () => {}, detectTextLayer2: async () => ({}) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/extract", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/hardware-schedule/review/:groupNumber: 404 when group not found", async () => {
  const { router, env } = setup({ overrides: { getHardwareGroupForReview: async () => null } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/review/g1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/hardware-schedule/review/:groupNumber: real happy path delegates to getHardwareGroupForReview", async () => {
  const { router, env } = setup({ overrides: { getHardwareGroupForReview: async () => ({ components: [{}, {}] }) } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/review/g1"), env, {});
  const body = await res.json();
  assert.equal(body.hardware_group.components.length, 2);
});

test("POST /api/hardware-schedule/approve/:groupNumber: real delegated approval, updates job record when jobId provided", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/approve/g1", { method: "POST", body: JSON.stringify({ jobId: "job1" }) });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(db.runs.some((r) => r.sql.includes("SET sets_approved = sets_approved + 1")));
});

test("POST /api/hardware-schedule/start: auth+subscription gated", async () => {
  const router = new NativeRouter();
  registerHardwareScheduleExtractRoutes(router, { authenticate: authOk, requireActiveSubscription: async () => new Response("no sub", { status: 402 }), getSessionStatus: async () => null, extractHardwareSchedule: async () => ({}), storeHardwareExtraction: async () => ({}), getHardwareGroupForReview: async () => ({}), updateHardwareGroup: async () => ({}), detectFileType: () => ({}), extractPdfBookmarks2: async () => ({}), detectSchedulePages: () => null, createExtractionSession: async () => "", logTelemetryEvent: async () => {}, detectTextLayer2: async () => ({}) });
  const form = new FormData();
  const req = new Request("https://example.com/api/hardware-schedule/start", { method: "POST", body: form });
  const res = await router.handle(req, { DB: makeFakeDb() }, {});
  assert.equal(res.status, 402);
});

test("GET /api/hardware-schedule/session/:sessionId/status: 404 when session not found", async () => {
  const { router, env } = setup({ overrides: { getSessionStatus: async () => null } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/status"), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/hardware-schedule/session/:sessionId/set-page-range: real validation rejects an invalid range", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/set-page-range", { method: "POST", body: JSON.stringify({ extraction_page_range: { start: 5, end: 2 } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/hardware-schedule/session/:sessionId/set-page-range: real happy path clears the range with null", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/set-page-range", { method: "POST", body: JSON.stringify({ extraction_page_range: null }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("SET extraction_page_range")));
});

test("POST /api/hardware-schedule/session/:sessionId/set-table-pages: real validation rejects non-integer entries", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/set-table-pages", { method: "POST", body: JSON.stringify({ schedule_table_pages: [1, "two"] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/hardware-schedule/session/:sessionId/batch-extract: pages array required when not using affirmed candidates", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/batch-extract", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/hardware-schedule/session/:sessionId/batch-extract: real conflicts_unresolved 409 with use_affirmed", async () => {
  const db = makeFakeDb({ session: { id: "s1" } });
  db.prepare = (sql) => ({
    bind(...args) { this.binds = args; return this; },
    async first() { return null; },
    async all() {
      if (sql.includes("FROM schedule_region_candidates")) return { results: [{ id: "c1", page_number: 1, review_status: "conflict", conflict_reason: "overlap" }] };
      return { results: [] };
    },
    async run() { return { success: true }; },
  });
  db.batch = async (stmts) => stmts.map(() => ({ success: true }));
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/batch-extract", { method: "POST", body: JSON.stringify({ use_affirmed: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "conflicts_unresolved");
});
