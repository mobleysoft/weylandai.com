import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareScheduleGenerateRoutes } from "./hardware-schedule-generate.js";

const authOk = async () => ({ user: { userId: "u1", mhsId: null } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const subOk = async () => null;

function makeFakeDb({ session = null, pages = [], sets = [], components = [], candidates = [] } = {}) {
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
        async all() {
          if (sql.includes("FROM hardware_page_extractions")) return { results: pages };
          if (sql.includes("FROM hardware_sets") && !sql.includes("LEFT JOIN")) return { results: sets };
          if (sql.includes("FROM hardware_sets hs") || sql.includes("FROM hardware_components")) return { results: components };
          if (sql.includes("FROM schedule_region_candidates")) return { results: candidates };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
    async batch(stmts) { return stmts.map(() => ({ success: true })); },
  };
}

function setup({ db, overrides = {} } = {}) {
  const router = new NativeRouter();
  registerHardwareScheduleGenerateRoutes(router, {
    authenticate: authOk,
    requireActiveSubscription: subOk,
    getSessionStatus: async () => ({ id: "s1", tenant_id: "t1" }),
    generateR2StreamUrl: async () => "https://example.com/stream",
    isPageInRange: () => true,
    pdfBufferOrNull: () => new Uint8Array([1, 2, 3]),
    renderRegionAt600DPI2: async () => ({ imageBuffer: new Uint8Array([1]) }),
    callEdge: async () => ({ status: 200, body: { online: true } }),
    generateSubmittalHTML: () => "<html></html>",
    incrementSubmittalsUsed: async () => 1,
    matchComponentToCutSheets: async () => ({ matched: false, cutSheets: [], confidence: 0, matchType: null }),
    queuePageExtractionJob: async () => ({ job_id: "job1", owner_id: "o1" }),
    routeExtraction: async () => ({}),
    transformDoorEntriesToHardwareSets: async () => ({}),
    materializeDseToLineItems: async () => ({}),
    ...overrides,
  });
  return { router, env: { DB: db || makeFakeDb(), CACHE: { async get() { return new ArrayBuffer(8); } } } };
}

test("POST .../generate-submittal: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareScheduleGenerateRoutes(router, { authenticate: authFail, requireActiveSubscription: subOk, getSessionStatus: async () => null, generateR2StreamUrl: async () => null, isPageInRange: () => true, pdfBufferOrNull: () => null, renderRegionAt600DPI2: async () => ({}), callEdge: async () => ({}), generateSubmittalHTML: () => "", incrementSubmittalsUsed: async () => 0, matchComponentToCutSheets: async () => ({}), queuePageExtractionJob: async () => ({}), routeExtraction: async () => ({}), transformDoorEntriesToHardwareSets: async () => ({}), materializeDseToLineItems: async () => ({}) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/generate-submittal", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("POST .../generate-submittal: real affirm-gate blocks when items are unaffirmed", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1" },
    pages: [{
      id: "p1", page_number: 1,
      extracted_data: JSON.stringify({ hardware_groups: [{ group_number: "1", components: [] }] }),
      affirm_state: JSON.stringify({ groups: [] }),
    }],
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/generate-submittal", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, "AFFIRM_GATE_BLOCKED");
});

test("POST .../generate-submittal: real happy path with bypassAffirmGate builds a real submittal + calls incrementSubmittalsUsed", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1", project_name: "Proj", total_pages: 3 },
    components: [{ set_number: "1", description: "Set 1", component_id: "c1", component_type: "hinge", quantity: 3 }],
  });
  let incrementCalled = false;
  const { router, env } = setup({ db, overrides: { incrementSubmittalsUsed: async () => { incrementCalled = true; return 5; } } });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/generate-submittal", { method: "POST", body: JSON.stringify({ bypassAffirmGate: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.submittal.summary.total_sets, 1);
  assert.equal(incrementCalled, true);
  assert.equal(body.usage.submittalsUsed, 5);
});

test("POST .../generate-package: 404 when no hardware sets exist", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" }, sets: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/generate-package", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST .../generate-package: 403 when session belongs to a different user", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "someone-else" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/generate-package", { method: "POST" }), env, {});
  assert.equal(res.status, 403);
});

test("POST .../extract-affirmed: real conflicts_unresolved 409 blocks extraction when a candidate is flagged", async () => {
  const db = makeFakeDb({
    candidates: [{ id: "c1", review_status: "conflict", page_number: 1, conflict_reason: "overlap" }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/extract-affirmed", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "conflicts_unresolved");
});

test("POST .../extract-affirmed: real no-affirmed-candidates short-circuit", async () => {
  const db = makeFakeDb({ candidates: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/extract-affirmed", { method: "POST", body: "{}" }), env, {});
  const body = await res.json();
  assert.equal(body.extractions_started, 0);
});

test("POST .../extract-affirmed: 404 when the PDF isn't in storage (no KV buffer, no R2 stream)", async () => {
  const db = makeFakeDb({ candidates: [{ id: "c1", review_status: "ok" }] });
  const { router, env } = setup({ db, overrides: { pdfBufferOrNull: () => null, generateR2StreamUrl: async () => null } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/extract-affirmed", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 404);
});
