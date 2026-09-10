import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareSchedulePageExtractRoutes } from "./hardware-schedule-page-extract.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ cached = null, session = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("SELECT extracted_data, status")) return cached;
          if (sql.includes("FROM hardware_extraction_sessions")) return session;
          if (sql.includes("extraction_route")) return null;
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
  registerHardwareSchedulePageExtractRoutes(router, {
    authenticate: authOk,
    getSessionStatus: async () => ({ id: "s1", total_pages: 5, file_buffer_key: "uploads/s1.pdf" }),
    isPageInRange: () => true,
    extractFromPageImage: async () => ({}),
    queuePageExtractionJob: async () => ({ job_id: "job1", owner_id: "o1" }),
    approvePageExtraction: async () => ({ sets_inserted: 1, components_inserted: 2 }),
    extractSinglePage: async () => ({ hardware_groups: [] }),
    resolveExtractionContract: async () => ({ totalPages: 5, prompt: "p", constraints: null, provenance: {} }),
    savePageExtraction2: async () => ({}),
    ...overrides,
  });
  return { router, env: { DB: db || makeFakeDb(), CACHE: { async get() { return new ArrayBuffer(8); }, async put() {} } } };
}

test("GET .../page/:pageNum: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareSchedulePageExtractRoutes(router, { authenticate: authFail, getSessionStatus: async () => null, isPageInRange: () => true, extractFromPageImage: async () => ({}), queuePageExtractionJob: async () => ({}), approvePageExtraction: async () => ({}), extractSinglePage: async () => ({}), resolveExtractionContract: async () => ({}), savePageExtraction2: async () => ({}) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET .../page/:pageNum: real cache hit returns immediately without calling extractSinglePage", async () => {
  const db = makeFakeDb({ cached: { extracted_data: JSON.stringify({ hardware_groups: [] }), status: "pending_review" } });
  let extractCalled = false;
  const { router, env } = setup({ db, overrides: { extractSinglePage: async () => { extractCalled = true; return {}; } } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1"), env, {});
  const body = await res.json();
  assert.equal(body.cached, true);
  assert.equal(extractCalled, false);
});

test("GET .../page/:pageNum: real error path uses classifyError/jsonErrorResponse on a bad page number", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/0"), env, {});
  assert.equal(res.status, 400);
});

test("POST .../approve: real happy path delegates to approvePageExtraction and reports completion", async () => {
  const { router, env } = setup({ overrides: { getSessionStatus: async () => ({ pages_approved: 5, total_pages: 5, progress_percent: 100, status: "in_progress" }) } });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/approve", { method: "POST", body: JSON.stringify({ hardwareGroups: [] }) });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.session_status.completed, true);
  assert.ok(body.result.sets_inserted);
});

test("POST .../extract-image: missing imageBase64 is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-image", { method: "POST", body: JSON.stringify({ totalPages: 5 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST .../extract-image: 403 when session belongs to a different user", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "someone-else" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-image", { method: "POST", body: JSON.stringify({ imageBase64: "abc", totalPages: 5, width: 100, height: 100 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 403);
});

test("GET .../extraction-contract: real delegated contract resolution with resolved constraints meta", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", page_count: 5 } });
  const { router, env } = setup({
    db,
    overrides: { resolveExtractionContract: async () => ({ totalPages: 5, prompt: "p", constraints: { spec_version: "1.0", scope_chain: ["a"], fields: [1, 2] }, provenance: { source: "x" } }) },
  });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extraction-contract"), env, {});
  const body = await res.json();
  assert.equal(body.constraints.field_count, 2);
  assert.equal(body.result_contract.recommended_dpi, 300);
});

test("POST .../extract-result: missing extraction.hardware_groups array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-result", { method: "POST", body: JSON.stringify({ extraction: {}, provider: { name: "x" } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST .../extract-result: missing provider.name is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-result", { method: "POST", body: JSON.stringify({ extraction: { hardware_groups: [] } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});
