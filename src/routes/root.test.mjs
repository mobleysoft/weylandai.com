import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerRootRoutes } from "./root.js";

function setup() {
  const router = new NativeRouter();
  registerRootRoutes(router, { WORKER_VERSION: "2.10.0" });
  return { router, env: {} };
}

test("GET /: real happy path returns the API discovery document", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.name, "SubX API");
  assert.equal(body.version, "2.10.0");
  assert.equal(body.website, "https://weylandai.com");
});

test("GET /: real happy path lists real endpoint groups", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/"), env, {});
  const body = await res.json();
  assert.ok(body.endpoints.hardware);
  assert.ok(body.endpoints.cutSheetIntelligence);
  assert.ok(body.endpoints.cps);
  assert.equal(body.endpoints.hardware.extractSession, "POST /api/hardware/sessions/extract");
});
