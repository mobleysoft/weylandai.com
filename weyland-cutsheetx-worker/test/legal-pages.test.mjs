// node --test weyland-cutsheetx-worker/test/legal-pages.test.mjs
// /terms and /privacy on weylandai.com answer with consenta.cc's pages for weylandai.com
// (service binding CONSENTA); when the source cannot answer, a page that says so and links it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { registerLegalRoutes, legalSourceUrl } from "../src/routes/legal-pages.js";

const router = new NativeRouter();
registerLegalRoutes(router);
const PAGE = (t) => "<!doctype html><html><head><title>" + t + " — WeylandAI</title></head><body>Argo LLC</body></html>";

function binding(answer) {
  const seen = [];
  return {
    seen,
    async fetch(request) {
      seen.push(request.url);
      return answer(request);
    }
  };
}
const call = (path, env, method = "GET") => router.handle(new Request("https://weylandai.com" + path, { method }), env, { waitUntil() {} });

test("the source address is consenta.cc's page for weylandai.com", () => {
  assert.equal(legalSourceUrl("terms"), "https://consenta.cc/policy/weylandai.com/terms");
  assert.equal(legalSourceUrl("privacy"), "https://consenta.cc/policy/weylandai.com/privacy");
});

test("/terms and /privacy (slash and ?embed=1 too) answer the source's page through the binding", async () => {
  const CONSENTA = binding((req) => new Response(PAGE(req.url.endsWith("/terms") ? "Terms of Service" : "Privacy Policy"), { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  for (const [path, title] of [["/terms", "Terms of Service"], ["/terms/", "Terms of Service"], ["/terms?embed=1", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/privacy/?embed=1", "Privacy Policy"]]) {
    const r = await call(path, { CONSENTA });
    assert.equal(r.status, 200, path);
    assert.equal(r.headers.get("Content-Type"), "text/html; charset=utf-8");
    assert.equal(r.headers.get("Cache-Control"), "public, max-age=300");
    assert.equal(await r.text(), PAGE(title), path);
  }
  assert.deepEqual([...new Set(CONSENTA.seen)].sort(), [legalSourceUrl("privacy"), legalSourceUrl("terms")]);
});

test("HEAD answers without a body", async () => {
  const CONSENTA = binding(() => new Response(PAGE("Terms of Service"), { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  const r = await call("/terms", { CONSENTA }, "HEAD");
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "");
});

test("the source failing: 503 with a page that links the same text and the support address", async () => {
  for (const CONSENTA of [
    binding(() => new Response(JSON.stringify({ error: "nope" }), { status: 404, headers: { "Content-Type": "application/json" } })),
    binding(() => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })),
    binding(() => { throw new Error("down"); })
  ]) {
    const r = await call("/privacy", { CONSENTA });
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    const html = await r.text();
    assert.match(html, /<h1>WeylandAI Privacy Policy<\/h1>/);
    assert.match(html, /href="https:\/\/consenta\.cc\/policy\/weylandai\.com\/privacy"/);
    assert.match(html, /mailto:support@weylandai\.com/);
    assert.match(html, /operated by Argo LLC/);
  }
});

test("other paths under the routes are not answered as legal pages", async () => {
  const CONSENTA = binding(() => new Response(PAGE("x"), { headers: { "Content-Type": "text/html" } }));
  const r = await call("/terms-of-service", { CONSENTA });
  assert.equal(r.status, 404);
  assert.equal(CONSENTA.seen.length, 0);
});
