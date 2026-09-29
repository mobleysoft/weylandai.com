// Real, runnable verification for src/cors-handler.js - run with:
//   node --test src/cors-handler.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { CorsHandler } from "./cors-handler.js";

test("wildcard origin: isOriginAllowed always true", () => {
  const cors = new CorsHandler();
  assert.equal(cors.isOriginAllowed("https://anything.example"), true);
  assert.equal(cors.isOriginAllowed(null), true);
});

test("restricted origins: exact string match only", () => {
  const cors = new CorsHandler({ origins: ["https://weylandai.com"] });
  assert.equal(cors.isOriginAllowed("https://weylandai.com"), true);
  assert.equal(cors.isOriginAllowed("https://evil.example"), false);
});

test("restricted origins: regex match supported", () => {
  const cors = new CorsHandler({ origins: [/^https:\/\/.*\.weylandai\.com$/] });
  assert.equal(cors.isOriginAllowed("https://staging.weylandai.com"), true);
  assert.equal(cors.isOriginAllowed("https://weylandai.com.evil.example"), false);
});

test("getAllowedOrigin: wildcard + credentials echoes real origin", () => {
  const cors = new CorsHandler({ origins: ["*"], credentials: true });
  assert.equal(cors.getAllowedOrigin("https://real-caller.example"), "https://real-caller.example");
});

test("getAllowedOrigin: wildcard without credentials returns literal *", () => {
  const cors = new CorsHandler({ origins: ["*"], credentials: false });
  assert.equal(cors.getAllowedOrigin("https://real-caller.example"), "*");
});

test("getAllowedOrigin: disallowed origin falls back to first configured string origin", () => {
  const cors = new CorsHandler({ origins: ["https://weylandai.com"] });
  assert.equal(cors.getAllowedOrigin("https://evil.example"), "https://weylandai.com");
});

test("preflight: non-OPTIONS request returns null (pass-through)", () => {
  const cors = new CorsHandler();
  const req = new Request("https://weylandai.com/api/x", { method: "GET" });
  assert.equal(cors.preflight(req), null);
});

test("preflight: OPTIONS from disallowed origin returns 403", async () => {
  const cors = new CorsHandler({ origins: ["https://weylandai.com"] });
  const req = new Request("https://weylandai.com/api/x", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example" },
  });
  const res = cors.preflight(req);
  assert.equal(res.status, 403);
});

test("preflight: OPTIONS from allowed origin returns 204 with CORS headers", async () => {
  const cors = new CorsHandler({ origins: ["https://weylandai.com"] });
  const req = new Request("https://weylandai.com/api/x", {
    method: "OPTIONS",
    headers: { Origin: "https://weylandai.com" },
  });
  const res = cors.preflight(req);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://weylandai.com");
  assert.equal(res.headers.get("Access-Control-Allow-Credentials"), "true");
});

test("corsify: wraps a plain object into a JSON Response with CORS headers", async () => {
  const cors = new CorsHandler({ origins: ["*"] });
  const req = new Request("https://weylandai.com/api/x", {
    headers: { Origin: "https://weylandai.com" },
  });
  const res = cors.corsify({ ok: true }, req);
  assert.ok(res instanceof Response);
  assert.equal(res.headers.get("Content-Type"), "application/json");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://weylandai.com");
  const body = await res.json();
  assert.deepEqual(body, { ok: true });
});

test("corsify: preserves an existing Response's status/body, adds CORS headers", async () => {
  const cors = new CorsHandler({ origins: ["*"] });
  const req = new Request("https://weylandai.com/api/x", {
    headers: { Origin: "https://weylandai.com" },
  });
  const original = new Response("not found", { status: 404, statusText: "Not Found" });
  const res = cors.corsify(original, req);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "not found");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://weylandai.com");
});

test("corsify: null response passes through unchanged", () => {
  const cors = new CorsHandler();
  const req = new Request("https://weylandai.com/api/x");
  assert.equal(cors.corsify(null, req), null);
});

test("getCorsHeaders: exposed headers only present when configured", () => {
  const withExposed = new CorsHandler({ origins: ["*"], exposedHeaders: ["X-Custom"] });
  const withoutExposed = new CorsHandler({ origins: ["*"] });
  const req = new Request("https://weylandai.com/api/x");
  assert.equal(withExposed.getCorsHeaders(req)["Access-Control-Expose-Headers"], "X-Custom");
  assert.equal(withoutExposed.getCorsHeaders(req)["Access-Control-Expose-Headers"], undefined);
});
