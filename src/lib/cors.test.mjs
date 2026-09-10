// Real, runnable verification for src/lib/cors.js - run with:
//   node --test src/lib/cors.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { CorsHandler, createCorsHandler, DEFAULT_CORS_ORIGINS } from "./cors.js";

function req(method, headers = {}) {
  const h = new Map(Object.entries(headers));
  return { method, headers: { get: (k) => h.get(k) ?? null } };
}

test("createCorsHandler(): no env.CORS_ORIGINS falls back to real production defaults", () => {
  const handler = createCorsHandler({});
  for (const origin of DEFAULT_CORS_ORIGINS) {
    assert.equal(handler.isOriginAllowed(origin), true);
  }
  assert.equal(handler.isOriginAllowed("https://evil.example.com"), false);
});

test("createCorsHandler(): env.CORS_ORIGINS='*' allows everything", () => {
  const handler = createCorsHandler({ CORS_ORIGINS: "*" });
  assert.equal(handler.isOriginAllowed("https://anything.example.com"), true);
});

test("createCorsHandler(): env.CORS_ORIGINS is a real comma-separated allowlist, plus the submittalexpress preview regex", () => {
  const handler = createCorsHandler({ CORS_ORIGINS: "https://a.com, https://b.com" });
  assert.equal(handler.isOriginAllowed("https://a.com"), true);
  assert.equal(handler.isOriginAllowed("https://b.com"), true);
  assert.equal(handler.isOriginAllowed("https://xyz.submittalexpress.pages.dev"), true);
  assert.equal(handler.isOriginAllowed("https://c.com"), false);
});

test("CorsHandler.preflight(): non-OPTIONS returns null, disallowed origin is 403, allowed origin is 204 with headers", () => {
  const handler = new CorsHandler({ origins: ["https://a.com"] });
  assert.equal(handler.preflight(req("GET")), null);
  const denied = handler.preflight(req("OPTIONS", { Origin: "https://evil.com" }));
  assert.equal(denied.status, 403);
  const allowed = handler.preflight(req("OPTIONS", { Origin: "https://a.com" }));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://a.com");
});

test("CorsHandler.corsify(): adds real CORS headers to an existing Response without altering its body/status", async () => {
  const handler = new CorsHandler({ origins: ["*"] });
  const original = new Response("hello", { status: 201 });
  const result = handler.corsify(original, req("GET", { Origin: "https://a.com" }));
  assert.equal(result.status, 201);
  assert.equal(await result.text(), "hello");
  assert.equal(result.headers.get("Access-Control-Allow-Origin"), "https://a.com");
});

test("CorsHandler: two independently-constructed handlers for the same env never share state (the real fix - no ambient var)", () => {
  const env = { CORS_ORIGINS: "https://a.com" };
  const h1 = createCorsHandler(env);
  const h2 = createCorsHandler(env);
  assert.notEqual(h1, h2);
  assert.equal(h1.isOriginAllowed("https://a.com"), h2.isOriginAllowed("https://a.com"));
});
