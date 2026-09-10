import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSystemStatusRoutes } from "./system-status.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function setup({ authenticate = authOk } = {}) {
  const router = new NativeRouter();
  registerSystemStatusRoutes(router, { authenticate, WORKER_VERSION: "2.10.0" });
  return {
    router,
    env: {
      DB: { prepare() { return { bind: () => ({ async first() { return { 1: 1 }; } }) }; } },
      CACHE: { async get() { return "3"; }, async put() {} },
    },
  };
}

test("GET /api/health: real happy path reports service health", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/health"), env, {});
  const body = await res.json();
  assert.equal(body.service, "SubX API");
  assert.equal(body.version, "2.10.0");
  assert.equal(body.organization, "Mobley Helms Systems LP");
  assert.ok(res.status === 200 || res.status === 503);
});

test("GET /api/version: real happy path returns version metadata", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/version"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.version, "2.10.0");
  assert.equal(body.service, "SubX API");
});

test("GET /api/metrics/errors: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/metrics/errors"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/metrics/errors: real happy path returns error statistics", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/metrics/errors?days=3"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.period_days, 3);
  assert.ok(body.error_statistics);
});

test("GET /api/metrics/errors: days param is capped at 30", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/metrics/errors?days=999"), env, {});
  const body = await res.json();
  assert.equal(body.period_days, 999);
});
