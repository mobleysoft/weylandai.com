import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerAppJsRoutes } from "./app-js.js";

function setup() {
  const router = new NativeRouter();
  registerAppJsRoutes(router);
  return { router, env: {} };
}

test("GET /app.js: real happy path serves the application JavaScript with the right content type", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/app.js"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/javascript");
  assert.equal(res.headers.get("Cache-Control"), "no-cache, no-store, must-revalidate");
});

test("GET /app.js: real happy path returns syntactically valid JavaScript", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/app.js"), env, {});
  const text = await res.text();
  assert.match(text, /=== APP\.JS LOADED ===/);
  assert.match(text, /=== APP\.JS FULLY LOADED ===/);
  // Real syntax check, not just substring matching - this is the actual
  // client-side script served to browsers.
  assert.doesNotThrow(() => new Function(text));
});
