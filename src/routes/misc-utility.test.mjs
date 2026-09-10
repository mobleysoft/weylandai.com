import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerMiscUtilityRoutes } from "./misc-utility.js";

const authOk = (user) => async () => ({ user });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const errorResponseOk = (code, message) => new Response(JSON.stringify({ error: { code, message } }), { status: 500 });

function setup({ authenticate = authOk({ userId: "u1" }), callEdge, errorResponse = errorResponseOk } = {}) {
  const router = new NativeRouter();
  registerMiscUtilityRoutes(router, {
    authenticate,
    callEdge: callEdge || (async () => ({ status: 200, body: { ok: true } })),
    errorResponse,
  });
  return { router, env: {} };
}

test("GET /api/test/sabp-marker-xyz: real happy path returns a live marker", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/test/sabp-marker-xyz"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.marker, "sabp-route-active");
  assert.ok(body.timestamp);
});

test("GET /api/jobs/:jobId: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/jobs/j1"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/jobs/:jobId: real happy path proxies callEdge's response", async () => {
  const { router, env } = setup({ callEdge: async (method, path) => {
    assert.equal(method, "GET");
    assert.equal(path, "/ai/v1/jobs/j1");
    return { status: 200, body: { status: "completed" } };
  } });
  const res = await router.handle(new Request("https://example.com/api/jobs/j1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "completed");
});

test("GET /api/user/tenants: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/user/tenants"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/user/tenants: real happy path with no tenant assignments returns a warning", async () => {
  const { router, env } = setup({ authenticate: authOk({ userId: "u1", tenants: [] }) });
  const res = await router.handle(new Request("https://example.com/api/user/tenants"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.tenants.length, 0);
  assert.equal(body.warning, "NO_TENANT_ACCESS");
});

test("GET /api/user/tenants: real happy path picks the default tenant", async () => {
  const tenants = [
    { id: "t1", code: "T1", name: "Tenant One", role: "member", is_default: false },
    { id: "t2", code: "T2", name: "Tenant Two", role: "admin", is_default: true },
  ];
  const { router, env } = setup({ authenticate: authOk({ userId: "u1", tenants }) });
  const res = await router.handle(new Request("https://example.com/api/user/tenants"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.current_tenant_id, "t2");
  assert.equal(body.tenants.find((t) => t.id === "t2").is_default, true);
});

test("GET /api/user/tenants: real happy path falls back to the first tenant when none is marked default", async () => {
  const tenants = [{ id: "t1", code: "T1", name: "Tenant One", role: "member", is_default: false }];
  const { router, env } = setup({ authenticate: authOk({ userId: "u1", tenants }) });
  const res = await router.handle(new Request("https://example.com/api/user/tenants"), env, {});
  const body = await res.json();
  assert.equal(body.current_tenant_id, "t1");
});

test("GET /api/user/tenants: a thrown error surfaces via errorResponse", async () => {
  const { router, env } = setup({ authenticate: authOk({ userId: "u1", get tenants() { throw new Error("boom"); } }) });
  const res = await router.handle(new Request("https://example.com/api/user/tenants"), env, {});
  assert.equal(res.status, 500);
});
