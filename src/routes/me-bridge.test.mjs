import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMeBridgeRoutes } from "./me-bridge.js";

const authOk = async () => ({ user: { userId: "u1", mhsId: "m1", email: "u1@example.com", name: "User One" } });
const authNoMhs = async () => ({ user: { userId: "u1", mhsId: null, email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function setup({ authenticate = authOk, callEdge } = {}) {
  const router = new NativeRouter();
  registerMeBridgeRoutes(router, {
    authenticate,
    callEdge: callEdge || (async () => ({ status: 200, body: { ok: true } })),
    HASCOM_EDGE: "https://hascom-edge.ron-helms.workers.dev",
  });
  return { router, env: {} };
}

test("GET /api/me/bridge/status: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/status"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/me/bridge/status: 400 when neither MHS ID nor userId is on session", async () => {
  const { router, env } = setup({ authenticate: async () => ({ user: { userId: null, mhsId: null } }) });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/status"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/me/bridge/status: falls back to userId when mhsId is absent", async () => {
  const { router, env } = setup({
    authenticate: authNoMhs,
    callEdge: async (method, path) => {
      assert.match(path, /owner_id=u1/);
      return { status: 200, body: { connected: false } };
    },
  });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/status"), env, {});
  assert.equal(res.status, 200);
});

test("GET /api/me/bridge/status: real happy path proxies callEdge's response", async () => {
  const { router, env } = setup({ callEdge: async (method, path) => {
    assert.equal(method, "GET");
    assert.match(path, /\/ai\/v1\/bridge\/status\?owner_id=m1/);
    return { status: 200, body: { connected: true } };
  } });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.connected, true);
});

test("POST /api/me/bridge/token: 400 when no MHS ID on session", async () => {
  const { router, env } = setup({ authenticate: authNoMhs });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/token", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/me/bridge/token: real happy path mints a token via callEdge", async () => {
  const { router, env } = setup({ callEdge: async (method, path, e, body) => {
    assert.equal(method, "POST");
    assert.equal(path, "/ai/v1/bridge/token");
    assert.equal(body.owner_id, "m1");
    return { status: 200, body: { token: "tok1" } };
  } });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/token", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.token, "tok1");
});

test("GET /api/me/jobs: 400 when no MHS ID on session", async () => {
  const { router, env } = setup({ authenticate: authNoMhs });
  const res = await router.handle(new Request("https://example.com/api/me/jobs"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/me/jobs: real happy path proxies bridge jobs list", async () => {
  const { router, env } = setup({ callEdge: async (method, path) => {
    assert.match(path, /owner_id=m1&limit=100/);
    return { status: 200, body: { jobs: [] } };
  } });
  const res = await router.handle(new Request("https://example.com/api/me/jobs"), env, {});
  assert.equal(res.status, 200);
});

test("GET /api/me/jobs: forwards job_id query param when present", async () => {
  const { router, env } = setup({ callEdge: async (method, path) => {
    assert.match(path, /job_id=j1/);
    return { status: 200, body: { jobs: [] } };
  } });
  const res = await router.handle(new Request("https://example.com/api/me/jobs?job_id=j1"), env, {});
  assert.equal(res.status, 200);
});

test("GET /api/me/bridge/launcher.ps1: 400 when no MHS ID on session", async () => {
  const { router, env } = setup({ authenticate: authNoMhs });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/launcher.ps1"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/me/bridge/launcher.ps1: 500 when token issuance fails", async () => {
  const { router, env } = setup({ callEdge: async () => ({ status: 500, body: { error: "boom" } }) });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/launcher.ps1"), env, {});
  assert.equal(res.status, 500);
});

test("GET /api/me/bridge/launcher.ps1: real happy path returns a PowerShell script with the minted token embedded", async () => {
  const { router, env } = setup({ callEdge: async () => ({ status: 200, body: { token: "ps-token-1", expires_at: "2026-01-01" } }) });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/launcher.ps1"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
  const text = await res.text();
  assert.match(text, /WEYLAND_BRIDGE_TOKEN = 'ps-token-1'/);
  assert.match(text, /WEYLAND_EDGE_URL = 'https:\/\/hascom-edge\.ron-helms\.workers\.dev'/);
});

test("GET /api/me/bridge/launcher.sh: real happy path returns a bash script with the minted token embedded", async () => {
  const { router, env } = setup({ callEdge: async () => ({ status: 200, body: { token: "sh-token-1", expires_at: "2026-01-01" } }) });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/launcher.sh"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/x-shellscript; charset=utf-8");
  const text = await res.text();
  assert.match(text, /WEYLAND_BRIDGE_TOKEN='sh-token-1'/);
  assert.match(text, /WEYLAND_EDGE_URL='https:\/\/hascom-edge\.ron-helms\.workers\.dev'/);
});

test("GET /api/me/bridge/launcher.sh: 500 when token issuance fails", async () => {
  const { router, env } = setup({ callEdge: async () => ({ status: 500, body: { error: "boom" } }) });
  const res = await router.handle(new Request("https://example.com/api/me/bridge/launcher.sh"), env, {});
  assert.equal(res.status, 500);
});
