import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsExtractionRouteRoutes } from "./sessions-extraction-route.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ row = null } = {}) {
  return {
    prepare() {
      return {
        bind: (...args) => ({
          async first() { return row; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerSessionsExtractionRouteRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/sessions/:sessionId/extraction-route: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/extraction-route"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/sessions/:sessionId/extraction-route: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/extraction-route"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/extraction-route: real happy path returns the stored route", async () => {
  const db = makeFakeDb({ row: { extraction_route: "claude_code_local", extraction_route_affirmed_at: "t1", extraction_route_affirmed_by: "u1" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/extraction-route"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.route, "claude_code_local");
});

test("POST /api/sessions/:sessionId/extraction-route: invalid JSON is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/extraction-route", { method: "POST", body: "not json" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/:sessionId/extraction-route: invalid route value is a real 400 listing valid routes", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/sessions/s1/extraction-route", { method: "POST", body: JSON.stringify({ route: "bogus" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.deepEqual(body.valid_routes.sort(), ["api_direct", "claude_code_local"]);
});

test("POST /api/sessions/:sessionId/extraction-route: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const req = new Request("https://example.com/api/sessions/s1/extraction-route", { method: "POST", body: JSON.stringify({ route: "api_direct" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/extraction-route: real happy path affirms the route", async () => {
  const db = makeFakeDb({ row: { id: "s1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/extraction-route", { method: "POST", body: JSON.stringify({ route: "api_direct", remember: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.route, "api_direct");
  assert.equal(body.remember_requested, true);
});
