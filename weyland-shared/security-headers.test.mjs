// node --test weyland-shared/security-headers.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { SECURITY_HEADERS, withSecurityHeaders, secured } from "./security-headers.js";
import { SECURITY_HEADERS as PLATFORM_HEADERS } from "../weyland-platform-worker/src/lib/site-policy.js";

test("the product workers send exactly the platform's header set", () => {
  assert.deepEqual({ ...SECURITY_HEADERS }, { ...PLATFORM_HEADERS });
});

test("the five headers, with the values the site uses", () => {
  assert.equal(SECURITY_HEADERS["Strict-Transport-Security"], "max-age=86400");
  assert.equal(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
  assert.equal(SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(SECURITY_HEADERS["X-Frame-Options"], "SAMEORIGIN");
  assert.equal(SECURITY_HEADERS["Permissions-Policy"], "camera=(self), microphone=(self), geolocation=()");
});

test("added to a page; status, body and the route's own headers kept", async () => {
  const r = withSecurityHeaders(new Response("<p>hi</p>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }));
  assert.equal(r.status, 404);
  assert.equal(await r.text(), "<p>hi</p>");
  assert.equal(r.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(r.headers.get(k), v, k);
});

test("a header the route set itself wins", () => {
  const r = withSecurityHeaders(new Response("x", { headers: { "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" } }));
  assert.equal(r.headers.get("X-Frame-Options"), "DENY");
  assert.equal(r.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
});

test("immutable headers (a redirect) are copied, not thrown on", () => {
  const r = withSecurityHeaders(Response.redirect("https://weylandai.com/sightx/", 308));
  assert.equal(r.status, 308);
  assert.equal(r.headers.get("Location"), "https://weylandai.com/sightx/");
  assert.equal(r.headers.get("Strict-Transport-Security"), "max-age=86400");
});

test("WebSocket upgrades and empty answers pass through untouched", () => {
  const ws = { status: 101, webSocket: {}, headers: new Headers() };
  assert.equal(withSecurityHeaders(ws), ws);
  const carried = { status: 200, webSocket: {}, headers: new Headers() };
  assert.equal(withSecurityHeaders(carried), carried);
  assert.equal(withSecurityHeaders(null), null);
  assert.equal(withSecurityHeaders(undefined), undefined);
});

test("secured(): every fetch answer carries the headers; other handlers and errors unchanged", async () => {
  const scheduled = async () => "ran";
  const worker = secured({
    marker: 7,
    async fetch(request) {
      if (new URL(request.url).pathname === "/boom") throw new Error("boom");
      return new Response(JSON.stringify({ ok: true, self: this.marker }), { headers: { "Content-Type": "application/json" } });
    },
    scheduled
  });
  const r = await worker.fetch(new Request("https://weylandai.com/api/x"), {}, {});
  assert.deepEqual(await r.json(), { ok: true, self: 7 });
  assert.equal(r.headers.get("X-Frame-Options"), "SAMEORIGIN");
  assert.equal(worker.scheduled, scheduled);
  await assert.rejects(() => worker.fetch(new Request("https://weylandai.com/boom"), {}, {}), /boom/);
});
