import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerInternalRoutes } from "./internal.js";
import { generateJWT } from "../auth-module.js";

const JWT_SECRET = "test-secret";

function makeFakeUploads({ headResult, getResult } = {}) {
  return {
    async head() { return headResult !== undefined ? headResult : { size: 1000, httpMetadata: { contentType: "application/pdf" } }; },
    async get() { return getResult !== undefined ? getResult : { body: new ReadableStream(), size: 1000 }; },
  };
}

function setup({ uploads } = {}) {
  const router = new NativeRouter();
  registerInternalRoutes(router);
  return { router, env: { JWT_SECRET, UPLOADS: uploads || makeFakeUploads() } };
}

test("HEAD /api/internal/r2-stream: 401 when token missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/internal/r2-stream", { method: "HEAD" }), env, {});
  assert.equal(res.status, 401);
});

test("HEAD /api/internal/r2-stream: 404 when object not found", async () => {
  const { router, env } = setup({ uploads: makeFakeUploads({ headResult: null }) });
  const token = await generateJWT({ key: "k1" }, JWT_SECRET);
  const res = await router.handle(new Request(`https://example.com/api/internal/r2-stream?token=${token}`, { method: "HEAD" }), env, {});
  assert.equal(res.status, 404);
});

test("HEAD /api/internal/r2-stream: real happy path returns content headers", async () => {
  const { router, env } = setup();
  const token = await generateJWT({ key: "file.pdf" }, JWT_SECRET);
  const res = await router.handle(new Request(`https://example.com/api/internal/r2-stream?token=${token}`, { method: "HEAD" }), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
  assert.equal(res.headers.get("Content-Length"), "1000");
});

test("HEAD /api/internal/r2-stream: 403 on an invalid/unverifiable token", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/internal/r2-stream?token=garbage", { method: "HEAD" }), env, {});
  assert.equal(res.status, 403);
});

test("OPTIONS /api/internal/r2-stream: real happy path returns CORS preflight headers", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/internal/r2-stream", { method: "OPTIONS" }), env, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
});

test("GET /api/internal/r2-stream: 401 when token missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/internal/r2-stream"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/internal/r2-stream: 404 when object not found", async () => {
  const { router, env } = setup({ uploads: makeFakeUploads({ getResult: null }) });
  const token = await generateJWT({ key: "k1" }, JWT_SECRET);
  const res = await router.handle(new Request(`https://example.com/api/internal/r2-stream?token=${token}`), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/internal/r2-stream: real happy path streams the full file", async () => {
  const { router, env } = setup();
  const token = await generateJWT({ key: "file.pdf" }, JWT_SECRET);
  const res = await router.handle(new Request(`https://example.com/api/internal/r2-stream?token=${token}`), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});

test("GET /api/internal/r2-stream: real happy path falls back to extension-based content type when R2 metadata has none", async () => {
  const uploads = makeFakeUploads({ headResult: { size: 500, httpMetadata: {} }, getResult: { body: new ReadableStream(), size: 500 } });
  const { router, env } = setup({ uploads });
  const token = await generateJWT({ key: "file.jpg" }, JWT_SECRET);
  const res = await router.handle(new Request(`https://example.com/api/internal/r2-stream?token=${token}`), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/jpeg");
});

test("GET /api/internal/r2-stream: real happy path serves a byte-range request with 206", async () => {
  const uploads = makeFakeUploads({
    headResult: { size: 1000, httpMetadata: {} },
    getResult: { body: new ReadableStream() },
  });
  const { router, env } = setup({ uploads });
  const token = await generateJWT({ key: "file.png" }, JWT_SECRET);
  const req = new Request(`https://example.com/api/internal/r2-stream?token=${token}`, { headers: { Range: "bytes=0-99" } });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("Content-Range"), "bytes 0-99/1000");
  assert.equal(res.headers.get("Content-Length"), "100");
});

test("GET /api/internal/pdf-render-shell: real happy path returns the pdf.js bootstrap HTML", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/internal/pdf-render-shell"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/html");
  const text = await res.text();
  assert.match(text, /pdfjsLib/);
});

// GET /api/internal/cdp-selftest - the real live-verification harness for
// src/lib/sovereign-cdp.js (MONOLITH_HELPER_MAP.md section 3 step 4).
// Only its auth-gating is locally testable without a real env.BROWSER
// session; the actual CDP round trip was verified live against
// production (see the plan doc for that record, not fabricated here).

test("GET /api/internal/cdp-selftest: 401 when the secret is missing or wrong", async () => {
  const { router } = setup();
  const env = { JWT_SECRET, UPLOADS: makeFakeUploads(), CDP_SELFTEST_SECRET: "real-secret", BROWSER: {} };
  const res1 = await router.handle(new Request("https://example.com/api/internal/cdp-selftest"), env, {});
  assert.equal(res1.status, 401);
  const res2 = await router.handle(new Request("https://example.com/api/internal/cdp-selftest?key=wrong"), env, {});
  assert.equal(res2.status, 401);
});

test("GET /api/internal/cdp-selftest: 401 when CDP_SELFTEST_SECRET isn't configured, even with a key supplied", async () => {
  const { router } = setup();
  const env = { JWT_SECRET, UPLOADS: makeFakeUploads(), BROWSER: {} };
  const res = await router.handle(new Request("https://example.com/api/internal/cdp-selftest?key=anything"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/internal/cdp-selftest: 500 when env.BROWSER isn't bound, even with a correct secret", async () => {
  const { router } = setup();
  const env = { JWT_SECRET, UPLOADS: makeFakeUploads(), CDP_SELFTEST_SECRET: "real-secret" };
  const res = await router.handle(new Request("https://example.com/api/internal/cdp-selftest?key=real-secret"), env, {});
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.match(body.error, /BROWSER/);
});
