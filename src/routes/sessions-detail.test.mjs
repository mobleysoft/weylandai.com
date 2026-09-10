import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsDetailRoutes } from "./sessions-detail.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = null, matrix = [], nomenclature = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM session_nomenclature")) return nomenclature;
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            return null;
          },
          async all() {
            return { results: matrix };
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
  registerSessionsDetailRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb(), JWT_SECRET: "test-secret" } };
}

test("POST /api/sessions/:sessionId/signed-urls: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/signed-urls", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/sessions/:sessionId/signed-urls: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/signed-urls", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/signed-urls: 403 when not owned", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "other", total_pages: 3 } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/signed-urls", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 403);
});

test("POST /api/sessions/:sessionId/signed-urls: missing all/pages is a real 400", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", total_pages: 3 } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/signed-urls", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/:sessionId/signed-urls: real happy path generates signed urls for explicit pages", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", total_pages: 5 } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/signed-urls", { method: "POST", body: JSON.stringify({ pages: [1, 2] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(Object.keys(body.urls).length, 2);
});

test("GET /api/sessions/:sessionId/door-matrix: real happy path returns matrix with defaults nomenclature", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", project_name: "Proj" }, matrix: [{ id: "m1", verified: 1 }, { id: "m2", verified: 0 }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/door-matrix"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 2);
  assert.equal(body.verified, 1);
  assert.equal(body.nomenclature.hardware_unit_term, "set");
});

test("PUT /api/sessions/:sessionId/nomenclature: invalid hardware_unit_term is a real 400", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/nomenclature", { method: "PUT", body: JSON.stringify({ hardware_unit_term: "bogus" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/sessions/:sessionId/nomenclature: real happy path updates and defaults unset terms", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/nomenclature", { method: "PUT", body: JSON.stringify({ hardware_unit_term: "group" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.hardware_unit_term, "group");
  assert.equal(body.door_identifier_term, "door");
});

test("PUT /api/sessions/:sessionId/position: invalid current_page is a real 400", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", total_pages: 5 } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/position", { method: "PUT", body: JSON.stringify({ current_page: 99 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/sessions/:sessionId/position: real happy path saves position and can extend total_pages", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", total_pages: 5 } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/sessions/s1/position", { method: "PUT", body: JSON.stringify({ current_page: 8, total_pages: 8 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.current_page, 8);
});

test("POST /api/sessions/:sessionId/door-matrix/:mappingId/verify: 403 when not owned", async () => {
  const db = makeFakeDb({ session: null });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/door-matrix/m1/verify", { method: "POST" }), env, {});
  assert.equal(res.status, 403);
});

test("POST /api/sessions/:sessionId/door-matrix/:mappingId/verify: real happy path", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/door-matrix/m1/verify", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mappingId, "m1");
});
