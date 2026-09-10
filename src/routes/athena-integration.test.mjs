import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerAthenaIntegrationRoutes } from "./athena-integration.js";

const authOk = async () => ({ user: { userId: "u1" } });

function makeFakeDb({ session = null, runCalls = [] } = {}) {
  async function first(sql, args) {
    if (sql.includes("FROM hardware_extraction_sessions")) return session;
    if (sql.includes("session_cut_sheet_matches")) return { matched: 0 };
    if (sql.includes("FROM cut_sheet_discovery_queue")) {
      if (args[0] === "missing") return null;
      return { id: "d1", manufacturer: "Acme", model: "M100", discovered_url: "https://acme.com/products/M100" };
    }
    return null;
  }
  async function all() { return { results: [] }; }
  async function run(sql, args) { runCalls.push({ sql, args }); return {}; }
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          first: () => first(sql, args),
          all: () => all(sql, args),
          run: () => run(sql, args),
        }),
        first: () => first(sql, []),
        all: () => all(sql, []),
        run: () => run(sql, []),
      };
    },
  };
}

function makeEnv({ session, runCalls } = {}) {
  return {
    DB: makeFakeDb({ session, runCalls }),
    UPLOADS: { async head() { return null; } },
  };
}

function setup(overrides = {}) {
  const router = new NativeRouter();
  registerAthenaIntegrationRoutes(router, {
    authenticate: authOk,
    persistSessionMatches: async () => ({ matched: 1 }),
    matchComponentToCutSheet: async () => null,
    batchMatchSessionComponents: async () => ({ matched: 2, total: 3, missingCutSheets: [] }),
    queueForDiscovery: async () => {},
    retryFailedDiscoveries: async () => ({ retried: 0 }),
    discoverWithRetry: async () => ({ found: false }),
    RETRY_CONFIG: { maxAttempts: 3 },
    assembleSubmittalPackage: async () => ({ success: true, r2Key: "k1", totalPages: 2, sections: [] }),
    getAssemblyStatus: async () => ({ status: "pending" }),
    PDFDocument: {},
    StandardFonts: {},
    rgb: () => {},
    ...overrides,
  });
  return router;
}

test("GET /api/sessions/:sessionId/readiness: 404 when session not found", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/readiness"), makeEnv({ session: null }), {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/readiness: real readiness scoring for a fresh session", async () => {
  const router = setup();
  const session = {
    id: "s1", project_name: "Proj", total_pages: 10, pages_processed: 0, pages_approved: 0,
    total_components_extracted: 0, created_at: "2026-01-01", updated_at: "2026-01-01",
  };
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/readiness"), makeEnv({ session }), {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.readinessStatus, "not_started");
  assert.equal(body.readyForAssembly, false);
  assert.ok(body.blockers.some((b) => b.type === "extraction_incomplete"));
});

test("GET /api/sessions/:sessionId/readiness: fully extracted+approved+covered session reaches ready_for_assembly", async () => {
  const router = setup();
  const session = {
    id: "s1", project_name: "Proj", total_pages: 5, pages_processed: 5, pages_approved: 5,
    total_components_extracted: 10, created_at: "2026-01-01", updated_at: "2026-01-01",
  };
  const runCalls = [];
  const res = await router.handle(
    new Request("https://example.com/api/sessions/s1/readiness"),
    { DB: makeFakeDb({ session, runCalls }), UPLOADS: { async head() { return null; } } },
    {}
  );
  const body = await res.json();
  // extraction (0.2) + extractionApproved (0.15) = 0.35; no cut-sheet coverage since matched=0 -> stays below 0.85
  assert.equal(body.readinessScore, 0.35);
  assert.equal(body.readinessStatus, "not_started");
  // cacheReadiness ran a real INSERT against the fake DB
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT INTO session_readiness")));
});

test("GET /api/sessions/readiness/list: real query against the fake DB", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/readiness/list?limit=5"), makeEnv(), {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.sessions, []);
});

test("POST /api/sessions/:sessionId/match-cut-sheets: delegates to persistSessionMatches", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/match-cut-sheets", { method: "POST" }), makeEnv(), {});
  const body = await res.json();
  assert.equal(body.matched, 1);
});

test("POST /api/match-component: 400 when neither manufacturer nor model given", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/match-component", { method: "POST", body: "{}" }), makeEnv(), {});
  assert.equal(res.status, 400);
});

test("POST /api/match-component: matched:false when matchComponentToCutSheet returns null", async () => {
  const router = setup();
  const res = await router.handle(
    new Request("https://example.com/api/match-component", { method: "POST", body: JSON.stringify({ manufacturer: "Acme", model: "M1" }) }),
    makeEnv(), {}
  );
  const body = await res.json();
  assert.equal(body.matched, false);
});

test("POST /api/sessions/:sessionId/trigger-discovery: queues each missing cut sheet", async () => {
  const queued = [];
  const router = setup({
    batchMatchSessionComponents: async () => ({
      matched: 1, total: 2,
      missingCutSheets: [{ manufacturer: "Acme", model: "M1", catalogNumber: "C1", componentType: "hinge" }],
    }),
    queueForDiscovery: async (item) => { queued.push(item); },
  });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/trigger-discovery", { method: "POST" }), makeEnv(), {});
  const body = await res.json();
  assert.equal(body.queuedForDiscovery, 1);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].sessionId, "s1");
});

test("POST /api/sessions/:sessionId/retry-discoveries: delegates to retryFailedDiscoveries", async () => {
  const router = setup({ retryFailedDiscoveries: async (sessionId) => ({ retried: 3, sessionId }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/retry-discoveries", { method: "POST" }), makeEnv(), {});
  const body = await res.json();
  assert.equal(body.retried, 3);
});

test("POST /api/discover-with-retry: 400 when manufacturer or model missing", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/discover-with-retry", { method: "POST", body: "{}" }), makeEnv(), {});
  assert.equal(res.status, 400);
});

test("POST /api/discover-with-retry: falls back to RETRY_CONFIG.maxAttempts when not provided", async () => {
  let seenOptions;
  const router = setup({
    discoverWithRetry: async (component, env2, options) => { seenOptions = options; return { found: true }; },
  });
  await router.handle(
    new Request("https://example.com/api/discover-with-retry", { method: "POST", body: JSON.stringify({ manufacturer: "Acme", model: "M1" }) }),
    makeEnv(), {}
  );
  assert.equal(seenOptions.maxAttempts, 3);
});

test("POST /api/sessions/:sessionId/assemble: dead-code handler still works standalone (shadowed by sessions-assemble.js in production)", async () => {
  const router = setup();
  const session = {
    id: "s1", total_pages: 5, pages_processed: 5, pages_approved: 5,
    total_components_extracted: 10, created_at: "2026-01-01", updated_at: "2026-01-01",
  };
  const res = await router.handle(
    new Request("https://example.com/api/sessions/s1/assemble", { method: "POST", body: "{}" }),
    makeEnv({ session }), {}
  );
  assert.equal(res.status, 400); // readinessScore 0.35 < 0.7 -> not ready
});

test("GET /api/sessions/:sessionId/assembly-status: delegates to getAssemblyStatus", async () => {
  const router = setup({ getAssemblyStatus: async () => ({ status: "complete" }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assembly-status"), makeEnv(), {});
  const body = await res.json();
  assert.equal(body.status, "complete");
});

test("POST /api/cut-sheets/:discoveryId/approve-with-learning: learns a url pattern and approves", async () => {
  const runCalls = [];
  const router = setup();
  const res = await router.handle(
    new Request("https://example.com/api/cut-sheets/d1/approve-with-learning", { method: "POST" }),
    { DB: makeFakeDb({ runCalls }), UPLOADS: { async head() { return null; } } }, {}
  );
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.patternLearned, true);
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT INTO learned_url_patterns")));
  assert.ok(runCalls.some((c) => c.sql.includes("UPDATE cut_sheet_discovery_queue")));
});

test("POST /api/cut-sheets/:discoveryId/approve-with-learning: 404 when discovery not found", async () => {
  const router = setup();
  const res = await router.handle(
    new Request("https://example.com/api/cut-sheets/missing/approve-with-learning", { method: "POST" }),
    makeEnv(), {}
  );
  assert.equal(res.status, 404);
});

test("GET /api/learned-patterns: real query against the fake DB", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/learned-patterns"), makeEnv(), {});
  const body = await res.json();
  assert.deepEqual(body.patterns, []);
  assert.equal(body.total, 0);
});

test("POST /api/sessions/auto-generate-v2: returns the workflow hint document", async () => {
  const router = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/auto-generate-v2", { method: "POST" }), makeEnv(), {});
  const body = await res.json();
  assert.ok(Array.isArray(body.workflow));
  assert.equal(body.workflow.length, 5);
});
