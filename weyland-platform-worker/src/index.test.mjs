// node --test src/index.test.mjs
// Every spelling the wildcard routes (/pricing*, /subscribe*, /wire*, /news*)
// can deliver must be answered by the page, not the router's 404.
import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

const env = {};
const ctx = { waitUntil() {} };
const get = (path) => worker.fetch(new Request("https://weylandai.com" + path), env, ctx);

async function body(path) {
  const r = await get(path);
  return { status: r.status, type: r.headers.get("Content-Type") || "", text: await r.text() };
}

test("/pricing answers every query-string and trailing-slash spelling with the same page", async () => {
  const base = await body("/pricing");
  assert.equal(base.status, 200);
  assert.match(base.type, /text\/html/);
  for (const p of ["/pricing/", "/pricing?ref=ph", "/pricing/?ref=ph&x=1", "/PRICING"]) {
    const b = await body(p);
    assert.equal(b.status, 200, p);
    assert.equal(b.text, base.text, p);
  }
});

test("/pricing?embed=1 hides the site nav and brand link inside the overlay", async () => {
  const b = await body("/pricing?embed=1");
  assert.equal(b.status, 200);
  assert.match(b.text, /header \.brand, header \.nav \{ display: none !important; \}/);
  assert.match(b.text, /window\.triggerCheckout = function/);
});

test("/subscribe answers its variants", async () => {
  const base = await body("/subscribe");
  assert.equal(base.status, 200);
  for (const p of ["/subscribe/", "/subscribe?checkout=cancelled", "/subscribe/?checkout=success&session_id=cs_live_x"]) {
    const b = await body(p);
    assert.equal(b.status, 200, p);
    assert.equal(b.text, base.text, p);
  }
});

test("/news and /wire answer with the WireX page in every spelling (no redirect, no 404)", async () => {
  const base = await body("/news");
  assert.equal(base.status, 200);
  assert.match(base.text, /<title>WeylandAI WireX<\/title>/);
  for (const p of ["/news/", "/news?embed=1", "/wire", "/wire/", "/wire?embed=1", "/wire/?embed=1"]) {
    const b = await body(p);
    assert.equal(b.status, 200, p);
    assert.equal(b.text, base.text, p);
  }
});

test("anything else under the wildcard prefixes keeps the router's 404", async () => {
  for (const p of ["/pricing/foo", "/pricingx", "/subscribe/foo", "/wirex", "/wire/foo", "/news/foo"]) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    assert.match(r.headers.get("Content-Type"), /json/);
  }
});

test("a checkout coming back to the homepage gets the checkout helper; a plain visit does not", async () => {
  const edgeEnv = { MASCOM_EDGE: { fetch: async () => new Response("<html><body><p>home</p></body></html>", { status: 200, headers: { "Content-Type": "text/html" } }) } };
  const plain = await worker.fetch(new Request("https://weylandai.com/"), edgeEnv, ctx);
  assert.ok(!(await plain.text()).includes("embedded-checkout.js"));
  for (const q of ["?checkout=success&session_id=cs_live_abc123", "?checkout=return&session_id=cs_live_abc123"]) {
    const back = await worker.fetch(new Request("https://weylandai.com/" + q), edgeEnv, ctx);
    assert.match(await back.text(), /<script src="\/api\/billing\/embedded-checkout\.js" defer><\/script><\/body>/, q);
  }
  for (const q of ["?checkout=success&session_id=%3Cscript%3E", "?checkout=cancelled&session_id=cs_live_abc123"]) {
    const other = await worker.fetch(new Request("https://weylandai.com/" + q), edgeEnv, ctx);
    assert.ok(!(await other.text()).includes("embedded-checkout.js"), q);
  }
});
