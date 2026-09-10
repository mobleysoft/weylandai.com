import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerTelemetryRoutes } from "./telemetry.js";

const authOk = async () => ({ user: { userId: "u1", id: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ rows = [] } = {}) {
  return {
    prepare() {
      return {
        bind: (...args) => ({
          async run() { return { success: true }; },
          async all() { return { results: rows }; },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerTelemetryRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/telemetry: real happy path stores events without requiring auth", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const req = new Request("https://example.com/api/telemetry", {
    method: "POST",
    body: JSON.stringify({ event_type: "info", event_name: "page_view" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.count, 1);
});

test("POST /api/telemetry: real happy path stores a batch of events", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/telemetry", {
    method: "POST",
    body: JSON.stringify({ events: [{ event_name: "a" }, { event_name: "b" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 2);
  assert.equal(body.ids.length, 2);
});

test("POST /api/telemetry: invalid JSON body returns a real 500", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/telemetry", { method: "POST", body: "not json" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 500);
});

test("GET /api/telemetry/recent: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/telemetry/recent"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/telemetry/recent: real happy path lists events", async () => {
  const { router, env } = setup({ db: makeFakeDb({ rows: [{ id: "e1" }] }) });
  const res = await router.handle(new Request("https://example.com/api/telemetry/recent?type=error&severity=high&session_id=s1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 1);
});

test("GET /api/telemetry/errors: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/telemetry/errors"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/telemetry/errors: real happy path lists error events", async () => {
  const { router, env } = setup({ db: makeFakeDb({ rows: [{ id: "e1", severity: "error" }] }) });
  const res = await router.handle(new Request("https://example.com/api/telemetry/errors"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.errors.length, 1);
});

test("POST /api/telemetry/claude-api: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/telemetry/claude-api", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/telemetry/claude-api: real happy path logs the call", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/telemetry/claude-api", {
    method: "POST",
    body: JSON.stringify({ api_type: "vision", model: "claude-opus-4-8" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.id);
});

test("GET /api/telemetry/claude-api/recent: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/telemetry/claude-api/recent"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/telemetry/claude-api/recent: real happy path aggregates tokens and cost", async () => {
  const { router, env } = setup({ db: makeFakeDb({ rows: [
    { total_tokens: 100, estimated_cost_usd: 0.01 },
    { total_tokens: 200, estimated_cost_usd: 0.02 },
  ] }) });
  const res = await router.handle(new Request("https://example.com/api/telemetry/claude-api/recent?session_id=s1&api_type=vision"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 2);
  assert.equal(body.summary.total_tokens, 300);
  assert.equal(body.summary.estimated_cost_usd, "0.0300");
});
