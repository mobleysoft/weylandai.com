// node --test src/lib/site-policy.test.mjs
// Security headers on every answer, the www -> apex redirect, robots.txt and
// the sitemap index - through the worker's own fetch handler.
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../index.js";
import { SECURITY_HEADERS, withSecurityHeaders, ROBOTS_TXT, PUBLIC_PAGES, DISALLOWED_PATHS } from "./site-policy.js";

const HOME_HTML = "<!doctype html><html><head><title>WeylandAI</title></head><body>home</body></html>";
const env = {
  MASCOM_EDGE: { async fetch() { return new Response(HOME_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "X-Cache": "HIT" } }); } }
};
const ctx = { waitUntil() {} };
const call = (url, init) => worker.fetch(new Request(url, init), env, ctx);

function assertSecurityHeaders(r, label) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(r.headers.get(name), value, label + " " + name);
  }
}

test("every kind of answer leaves with the security headers", async () => {
  const cases = [
    ["https://weylandai.com/", 200, /text\/html/],
    ["https://weylandai.com/login?redirect=/subx-app", 200, /text\/html/],
    ["https://weylandai.com/pricing", 200, /text\/html/],
    ["https://weylandai.com/pricing?embed=1", 200, /text\/html/],
    ["https://weylandai.com/subscribe?checkout=cancelled", 200, /text\/html/],
    ["https://weylandai.com/news?embed=1", 200, /text\/html/],
    ["https://weylandai.com/api/billing/embedded-checkout.js", 200, /javascript/],
    ["https://weylandai.com/api/billing/checkout/session/not-a-session", 400, /json/],
    ["https://weylandai.com/pricing/nothing-here", 404, /json/],
    ["https://weylandai.com/health", 200, /json/],
    ["https://weylandai.com/robots.txt", 200, /text\/plain/],
    ["https://weylandai.com/sitemap.xml", 200, /xml/],
    ["https://weylandai.com/sitemap-pages.xml", 200, /xml/]
  ];
  for (const [url, status, type] of cases) {
    const r = await call(url);
    assert.equal(r.status, status, url);
    assert.match(r.headers.get("Content-Type") || "", type, url);
    assertSecurityHeaders(r, url);
  }
});

test("the proxied homepage keeps its own body and headers", async () => {
  const r = await call("https://weylandai.com/");
  assert.equal(await r.text(), HOME_HTML);
  assert.equal(r.headers.get("X-Served-By"), "mascom-edge-via-weyland-platform-worker");
  assert.equal(r.headers.get("X-Cache"), "HIT");
});

test("a header a route set itself is kept", async () => {
  const own = new Response("x", { headers: { "Content-Type": "text/plain", "X-Frame-Options": "DENY" } });
  const r = withSecurityHeaders(own);
  assert.equal(r.headers.get("X-Frame-Options"), "DENY");
  assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
});

test("redirects and immutable responses get the headers too", async () => {
  const r = withSecurityHeaders(Response.redirect("https://weylandai.com/x", 302));
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("Location"), "https://weylandai.com/x");
  assertSecurityHeaders(r, "redirect");
});

test("www.weylandai.com: every path and query goes to the apex, permanently", async () => {
  for (const [path, method, status] of [
    ["/", "GET", 301], ["/pricing", "GET", 301], ["/find?q=door%20closer", "GET", 301],
    ["/find/schlage/L9080", "HEAD", 301], ["/api/auth/session", "POST", 308], ["/sitemap.xml", "GET", 301], ["/robots.txt", "GET", 301]
  ]) {
    const r = await call("https://www.weylandai.com" + path, { method, body: method === "POST" ? "{}" : undefined });
    assert.equal(r.status, status, path);
    assert.equal(r.headers.get("Location"), "https://weylandai.com" + path, path);
    assertSecurityHeaders(r, "www " + path);
  }
});

test("robots.txt: public site allowed, APIs and private workspaces kept out, sitemaps listed", async () => {
  const text = await (await call("https://weylandai.com/robots.txt")).text();
  assert.equal(text, ROBOTS_TXT);
  assert.match(text, /^User-agent: \*$/m);
  assert.match(text, /^Allow: \/$/m);
  for (const p of ["/api/", "/subx", "/takeoffx", "/propx-app", "/meetingx", "/meetx", "/login", "/subscribe"]) {
    assert.ok(text.split("\n").includes("Disallow: " + p), p);
  }
  assert.match(text, /^Sitemap: https:\/\/weylandai\.com\/sitemap\.xml$/m);
  assert.match(text, /^Sitemap: https:\/\/weylandai\.com\/find\/sitemap\.xml$/m);
  // No public page is caught by a Disallow prefix.
  for (const page of PUBLIC_PAGES) {
    assert.ok(!DISALLOWED_PATHS.some((d) => page.startsWith(d)), page);
  }
  const other = await (await call("https://weyland-platform-worker.example.workers.dev/robots.txt")).text();
  assert.equal(other, "User-agent: *\nDisallow: /\n");
});

test("/sitemap.xml is a sitemap index that includes the finder's sitemap", async () => {
  const xml = await (await call("https://weylandai.com/sitemap.xml")).text();
  assert.match(xml, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<sitemap><loc>https:\/\/weylandai\.com\/find\/sitemap\.xml<\/loc><\/sitemap>/);
  assert.match(xml, /<sitemap><loc>https:\/\/weylandai\.com\/sitemap-pages\.xml<\/loc><\/sitemap>/);
  const pages = await (await call("https://weylandai.com/sitemap-pages.xml")).text();
  const locs = [...pages.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, PUBLIC_PAGES.map((p) => "https://weylandai.com" + p));
  // Query-string spellings answer the same; other paths under /sitemap* are 404.
  assert.equal(await (await call("https://weylandai.com/sitemap.xml?x=1")).text(), xml);
  assert.equal((await call("https://weylandai.com/sitemap-other.xml")).status, 404);
});
