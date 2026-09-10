import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerAuthSessionRoutes } from "./auth-session.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const errorResponseOk = (code, message) => new Response(JSON.stringify({ error: { code, message } }), { status: code === "NOT_FOUND" ? 404 : 500 });

function makeFakeDb({ existingUser = { id: "u1" }, node = null, userRow = null, insertedRows = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM users WHERE email")) return existingUser;
            if (sql.includes("FROM nodes WHERE email")) return node;
            if (sql.includes("FROM weyland_sessions WHERE id")) return userRow;
            if (sql.includes("FROM users WHERE id")) return userRow;
            return null;
          },
          async run() {
            insertedRows.push({ sql, args });
            return { success: true };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db, errorResponse = errorResponseOk } = {}) {
  const router = new NativeRouter();
  registerAuthSessionRoutes(router, { authenticate, errorResponse });
  return { router, env: { DB: db || makeFakeDb(), JWT_SECRET: "test-secret" } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("POST /api/auth/session: 401 when no AuthFor token provided", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/auth/session", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "authfor_token_required");
});

test("POST /api/auth/session: 401 when AuthFor rejects the token", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 401 });
  const { router, env } = setup();
  const req = new Request("https://example.com/api/auth/session", { method: "POST", body: JSON.stringify({ token: "bad" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 401);
});

test("POST /api/auth/session: 404 when no existing weyland account for the identity", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ email: "new@example.com" }), { status: 200 });
  const { router, env } = setup({ db: makeFakeDb({ existingUser: null }) });
  const req = new Request("https://example.com/api/auth/session", { method: "POST", body: JSON.stringify({ token: "good" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/auth/session: real happy path creates a session and sets a cookie", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ email: "u1@example.com", mhs: "m1", name: "User One" }), { status: 200 });
  const { router, env } = setup({ db: makeFakeDb({ existingUser: { id: "u1" }, node: { id: "u1", mhs_id: "m1" } }) });
  const req = new Request("https://example.com/api/auth/session", { method: "POST", body: JSON.stringify({ token: "good" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.node.email, "u1@example.com");
  assert.match(res.headers.get("Set-Cookie") || "", /weyland_session=/);
});

test("GET /api/auth/session/check: valid:false when no cookie present", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/auth/session/check"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.valid, false);
});

test("GET /api/auth/session/check: real happy path returns valid:true for a live session", async () => {
  const { router, env } = setup({ db: makeFakeDb({ userRow: { id: "s1" } }) });
  const req = new Request("https://example.com/api/auth/session/check", { headers: { Cookie: "weyland_session=s1" } });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.valid, true);
});

test("POST /api/auth/logout: clears the session cookie", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/auth/logout", { method: "POST", headers: { Cookie: "weyland_session=s1" } });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Set-Cookie") || "", /Max-Age=0/);
});

test("POST /api/auth/authfor-exchange: 400 when authfor_token missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/auth/authfor-exchange", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/auth/authfor-exchange: 401 when AuthFor rejects the token", async () => {
  globalThis.fetch = async () => new Response("no", { status: 401 });
  const { router, env } = setup();
  const req = new Request("https://example.com/api/auth/authfor-exchange", { method: "POST", body: JSON.stringify({ authfor_token: "bad" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 401);
});

test("POST /api/auth/authfor-exchange: real happy path provisions a new user and mints a JWT", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ user: { email: "New.User@Example.com", name: "New User" } }), { status: 200 });
  const { router, env } = setup({ db: makeFakeDb({ existingUser: null, userRow: null }) });
  const req = new Request("https://example.com/api/auth/authfor-exchange", { method: "POST", body: JSON.stringify({ authfor_token: "good" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token);
  assert.equal(body.user.email, "new.user@example.com");
});

test("GET /api/auth/me: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/auth/me"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/auth/me: 404 via errorResponse when user record missing", async () => {
  const { router, env } = setup({ db: makeFakeDb({ userRow: null }) });
  const res = await router.handle(new Request("https://example.com/api/auth/me"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/auth/me: real happy path returns the user record", async () => {
  const { router, env } = setup({ db: makeFakeDb({ userRow: { id: "u1", email: "u1@example.com" } }) });
  const res = await router.handle(new Request("https://example.com/api/auth/me"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user.email, "u1@example.com");
});
