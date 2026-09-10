import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerInstallDeviceAuthRoutes } from "./install-device-auth.js";

const authOk = async () => ({ user: { userId: "u1", mhsId: "m1", email: "u1@example.com", name: "User One" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ row = null, uploads } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() { return row; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

const callEdgeOk = async () => ({ status: 200, body: { token: "bridge-token-xyz" } });

function setup({ authenticate = authOk, db, uploads, callEdge = callEdgeOk } = {}) {
  const router = new NativeRouter();
  registerInstallDeviceAuthRoutes(router, { authenticate, callEdge });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads } };
}

test("POST /api/install/device-auth/init: real happy path issues a device_code and user_code", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/install/device-auth/init", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.device_code);
  assert.match(body.user_code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(body.expires_in, 600);
});

test("GET /api/install/device-auth/poll: 400 when device_code missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/install/device-auth/poll"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/install/device-auth/poll: 404 when device_code not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const res = await router.handle(new Request("https://example.com/api/install/device-auth/poll?device_code=abc"), env, {});
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.status, "not_found");
});

test("GET /api/install/device-auth/poll: real happy path returns approved with bridge_token and marks consumed", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: { status: "approved", bridge_token: "tok1", expires_at: new Date(Date.now() + 10000).toISOString(), consumed_at: null } }) });
  const res = await router.handle(new Request("https://example.com/api/install/device-auth/poll?device_code=abc"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "approved");
  assert.equal(body.bridge_token, "tok1");
});

test("GET /api/install/device-auth/poll: consumed status when already consumed", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: { status: "approved", bridge_token: "tok1", expires_at: new Date(Date.now() + 10000).toISOString(), consumed_at: "2026-01-01" } }) });
  const res = await router.handle(new Request("https://example.com/api/install/device-auth/poll?device_code=abc"), env, {});
  const body = await res.json();
  assert.equal(body.status, "consumed");
});

test("POST /api/install/device-auth/approve: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/install/device-auth/approve", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/install/device-auth/approve: 404 when user_code unknown", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const req = new Request("https://example.com/api/install/device-auth/approve", { method: "POST", body: JSON.stringify({ user_code: "ABCD-1234" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/install/device-auth/approve: real happy path mints a bridge token and approves", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: { device_code: "dc1", status: "pending", expires_at: new Date(Date.now() + 10000).toISOString() } }) });
  const req = new Request("https://example.com/api/install/device-auth/approve", { method: "POST", body: JSON.stringify({ user_code: "abcd-1234" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.status, "approved");
});

test("POST /api/install/device-auth/deny: real happy path denies a pending code", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: { device_code: "dc1", status: "pending" } }) });
  const req = new Request("https://example.com/api/install/device-auth/deny", { method: "POST", body: JSON.stringify({ user_code: "abcd-1234" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "denied");
});

test("GET /api/install/bundle.zip: 503 when bundle not yet built", async () => {
  const { router, env } = setup({ uploads: { async get() { return null; } } });
  const res = await router.handle(new Request("https://example.com/api/install/bundle.zip"), env, {});
  assert.equal(res.status, 503);
});

test("GET /api/install/bundle.zip: real happy path streams the zip with install context headers", async () => {
  const { router, env } = setup({ uploads: { async get() { return { body: new ReadableStream() }; } } });
  const res = await router.handle(new Request("https://example.com/api/install/bundle.zip"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/zip");
  assert.ok(res.headers.get("X-Install-Context-Hint"));
});
