import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "./router.js";

function req(method, path) {
  return new Request(`https://example.com${path}`, { method });
}

test("NativeRouter: exact-match GET route resolves and sets empty params", async () => {
  const router = new NativeRouter();
  router.get("/health", async (r) => new Response(JSON.stringify({ params: r.params }), { status: 200 }));
  const res = await router.handle(req("GET", "/health"), {}, {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { params: {} });
});

test("NativeRouter: :param routes extract named params", async () => {
  const router = new NativeRouter();
  router.get("/api/projects/:id", async (r) => new Response(JSON.stringify(r.params)));
  const res = await router.handle(req("GET", "/api/projects/abc123"), {}, {});
  assert.deepEqual(await res.json(), { id: "abc123" });
});

test("NativeRouter: unmatched route is a real 404 with path/method in the body", async () => {
  const router = new NativeRouter();
  const res = await router.handle(req("GET", "/nope"), {}, {});
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.path, "/nope");
  assert.equal(body.method, "GET");
});

test("NativeRouter: middleware (all('*', ...)) runs before route matching and can short-circuit", async () => {
  const router = new NativeRouter();
  router.all("*", async () => new Response("blocked", { status: 403 }));
  router.get("/health", async () => new Response("ok"));
  const res = await router.handle(req("GET", "/health"), {}, {});
  assert.equal(res.status, 403);
  assert.equal(await res.text(), "blocked");
});

test("NativeRouter: a handler that throws is caught and returns a real 500, not an unhandled rejection", async () => {
  const router = new NativeRouter();
  router.get("/boom", async () => { throw new Error("real failure"); });
  const res = await router.handle(req("GET", "/boom"), {}, {});
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.message, "real failure");
});

test("NativeRouter: a custom .catch() error handler overrides the default 500", async () => {
  const router = new NativeRouter();
  router.get("/boom", async () => { throw new Error("x"); });
  router.catch(async (err) => new Response("custom: " + err.message, { status: 502 }));
  const res = await router.handle(req("GET", "/boom"), {}, {});
  assert.equal(res.status, 502);
  assert.equal(await res.text(), "custom: x");
});

test("NativeRouter: method matters - a POST-only route 404s on GET", async () => {
  const router = new NativeRouter();
  router.post("/api/thing", async () => new Response("posted"));
  const res = await router.handle(req("GET", "/api/thing"), {}, {});
  assert.equal(res.status, 404);
});
