import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerDemoRoutes } from "./demo.js";

function setup({ demoRequests } = {}) {
  const router = new NativeRouter();
  registerDemoRoutes(router);
  return { router, env: { DEMO_REQUESTS: demoRequests || { async put() {} } } };
}

test("POST /api/demo: real happy path stores the request and returns a requestId", async () => {
  let stored = null;
  const demoRequests = { async put(key, value) { stored = { key, value: JSON.parse(value) }; } };
  const { router, env } = setup({ demoRequests });
  const req = new Request("https://example.com/api/demo", {
    method: "POST",
    headers: { "CF-Connecting-IP": "1.2.3.4" },
    body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.requestId);
  assert.equal(body.message, "Demo request received. We will contact you within 24 hours.");
  assert.equal(stored.key, body.requestId);
  assert.equal(stored.value.name, "Jane Doe");
  assert.equal(stored.value.ip, "1.2.3.4");
});

test("POST /api/demo: invalid JSON body surfaces as a real 500", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/demo", { method: "POST", body: "not json" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 500);
});
