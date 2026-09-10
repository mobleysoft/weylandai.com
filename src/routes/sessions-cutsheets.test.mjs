import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsCutSheetsRoutes } from "./sessions-cutsheets.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = null, components = [], queueItem = null, discovery = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM cut_sheet_discovery_queue")) return queueItem;
            if (sql.includes("FROM cut_sheet_discoveries")) return discovery;
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            return null;
          },
          async all() {
            return { results: components };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db, matchComponentToCutSheets, queueForDiscovery } = {}) {
  const router = new NativeRouter();
  registerSessionsCutSheetsRoutes(router, {
    authenticate,
    matchComponentToCutSheets: matchComponentToCutSheets || (async () => ({ matched: false, cutSheets: [] })),
    queueForDiscovery: queueForDiscovery || (async () => ({ id: "q1", status: "queued" })),
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/sessions/:sessionId/discover-cut-sheets: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/sessions/:sessionId/discover-cut-sheets: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/discover-cut-sheets: 403 when not owned", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "other" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 403);
});

test("POST /api/sessions/:sessionId/discover-cut-sheets: real happy path reports zero components", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" }, components: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.total, 0);
});

test("POST /api/sessions/:sessionId/discover-cut-sheets: real happy path queues unmatched components", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1", project_name: "Proj" },
    components: [{ id: "c1", manufacturer: "Schlage", model: "L9000", set_number: "1" }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.newlyQueued, 1);
  assert.equal(body.queuedComponents.length, 1);
});

test("POST /api/sessions/:sessionId/discover-cut-sheets: real happy path counts already-matched components", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1" },
    components: [{ id: "c1", manufacturer: "Schlage", model: "L9000" }],
  });
  const { router, env } = setup({
    db,
    matchComponentToCutSheets: async () => ({ matched: true, cutSheets: [{ id: "cs1" }] }),
  });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/discover-cut-sheets", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.withCutSheets, 1);
  assert.equal(body.summary.coverageRate, 100);
});

test("GET /api/sessions/:sessionId/cut-sheet-coverage: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/cut-sheet-coverage"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/cut-sheet-coverage: real happy path reports zero components as ready", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", project_name: "Proj" }, components: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/cut-sheet-coverage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  assert.equal(body.coverage.total, 0);
});

test("GET /api/sessions/:sessionId/cut-sheet-coverage: real happy path computes coverage and missingByManufacturer", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1", project_name: "Proj" },
    components: [
      { id: "c1", manufacturer: "Schlage", model: "L9000" },
      { id: "c2", manufacturer: "LCN", model: "4040" },
    ],
    queueItem: null,
    discovery: null,
  });
  const { router, env } = setup({ db, matchComponentToCutSheets: async () => ({ matched: false, cutSheets: [] }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/cut-sheet-coverage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.coverage.total, 2);
  assert.equal(body.coverage.withCutSheets, 0);
  assert.equal(body.ready, false);
  assert.equal(body.missingByManufacturer.length, 2);
});
