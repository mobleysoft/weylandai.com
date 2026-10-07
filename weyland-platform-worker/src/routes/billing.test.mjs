// node --test src/routes/billing.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerBillingRoutes } from "./billing.js";
import { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS } from "../lib/stripe-billing.js";
import { safeSitePath, hostedReturnUrls, embeddedReturnUrl, siteUrlWith } from "../lib/checkout-return.js";
import { EMBEDDED_CHECKOUT_JS } from "../lib/embedded-checkout-client.js";

function kv() {
  const m = new Map();
  return { async get(k, type) { const v = m.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, map: m };
}

function setup({ vendyai, stripeRequest, env = {} } = {}) {
  const router = new NativeRouter();
  const calls = { vendyai: [], stripeRequest: [] };
  registerBillingRoutes(router, {
    WEYLAND_PRODUCTS,
    CHECKOUT_READY_PRODUCTS,
    stripeRequest: stripeRequest || (async (_env, method, path) => {
      calls.stripeRequest.push({ method, path });
      return { id: "price_x", active: true, unit_amount: 4900, currency: "usd", recurring: { interval: "month", trial_period_days: null }, product: { name: "WeylandAI WireX Pro" } };
    })
  });
  const VENDYAI = {
    async fetch(url, init) {
      const body = JSON.parse(init.body);
      calls.vendyai.push({ url, body });
      return vendyai ? vendyai(body) : new Response(JSON.stringify({ session: { id: "cs_live_hosted123", url: "https://checkout.stripe.com/c/pay/cs_live_hosted123" } }), { status: 201 });
    }
  };
  const fullEnv = { VENDYAI, CACHE: kv(), STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_PUBLISHABLE_KEY: "pk_test_dummy", ...env };
  const call = (path, { method = "GET", body, headers = {} } = {}) => router.handle(new Request("https://weylandai.com" + path, {
    method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body)
  }), fullEnv, { waitUntil() {} });
  return { call, calls, env: fullEnv };
}

test("safeSitePath keeps same-site paths and refuses everything else", () => {
  assert.equal(safeSitePath("/#pricing"), "/#pricing");
  assert.equal(safeSitePath("https://weylandai.com/news?x=1"), "/news?x=1");
  assert.equal(safeSitePath("https://www.weylandai.com/pricing"), "/pricing");
  assert.equal(safeSitePath("/pricing?checkout=cancelled&session_id=cs_1&a=b"), "/pricing?a=b");
  assert.equal(safeSitePath("https://evil.example/"), null);
  assert.equal(safeSitePath("//evil.example/x"), null);
  assert.equal(safeSitePath("/\\evil.example"), null);
  assert.equal(safeSitePath("javascript:alert(1)"), null);
  assert.equal(safeSitePath("http://weylandai.com/"), null);
  assert.equal(safeSitePath(""), null);
});

test("siteUrlWith keeps the literal session placeholder and the hash", () => {
  assert.equal(siteUrlWith("/?a=1#pricing", { checkout: "success", session_id: "{CHECKOUT_SESSION_ID}" }), "https://weylandai.com/?a=1&checkout=success&session_id={CHECKOUT_SESSION_ID}#pricing");
});

test("hosted return URLs: back to the starting page, not /subscribe", () => {
  const req = (ref) => new Request("https://weylandai.com/api/billing/checkout/create", { headers: ref ? { Referer: ref } : {} });
  const home = hostedReturnUrls(req(), { success_url: "https://weylandai.com/?checkout=success#pricing", cancel_url: "https://weylandai.com/#pricing" });
  // The homepage cannot finish an activation yet, so success keeps /subscribe's view; Back returns home.
  assert.equal(home.success_url, "https://weylandai.com/subscribe?checkout=success&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(home.cancel_url, "https://weylandai.com/?checkout=cancelled#pricing");
  const pricing = hostedReturnUrls(req("https://weylandai.com/pricing?ref=ph"), {});
  assert.equal(pricing.success_url, "https://weylandai.com/pricing?ref=ph&checkout=success&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(pricing.cancel_url, "https://weylandai.com/pricing?ref=ph&checkout=cancelled");
  const news = hostedReturnUrls(req("https://weylandai.com/news"), {});
  assert.equal(news.cancel_url, "https://weylandai.com/news?checkout=cancelled");
  assert.equal(news.success_url, "https://weylandai.com/news?checkout=success&session_id={CHECKOUT_SESSION_ID}");
  const evil = hostedReturnUrls(req("https://evil.example/x"), { cancel_url: "https://evil.example/", success_url: "https://evil.example/" });
  assert.equal(evil.cancel_url, "https://weylandai.com/?checkout=cancelled");
  const subscribe = hostedReturnUrls(req("https://weylandai.com/subscribe/"), {});
  assert.equal(subscribe.cancel_url, "https://weylandai.com/subscribe/?checkout=cancelled");
  const embedded = embeddedReturnUrl(req(), { return_to: "/pricing?embed=1" });
  assert.equal(embedded.return_url, "https://weylandai.com/pricing?embed=1&checkout=return&session_id={CHECKOUT_SESSION_ID}");
});

test("hosted checkout/create: same response, vendyai gets the start page's URLs", async () => {
  const { call, calls } = setup();
  const r = await call("/api/billing/checkout/create", { method: "POST", body: { product_id: "weyland-huntx-seat", quantity: 1, success_url: "https://weylandai.com/?checkout=success#pricing", cancel_url: "https://weylandai.com/#pricing" } });
  assert.equal(r.status, 201);
  const d = await r.json();
  assert.equal(d.checkout_url, "https://checkout.stripe.com/c/pay/cs_live_hosted123");
  assert.equal(d.session_id, "cs_live_hosted123");
  const sent = calls.vendyai[0].body;
  assert.equal(sent.venture_id, "weylandai");
  assert.equal(sent.mode, "subscription");
  assert.equal(sent.cancel_url, "https://weylandai.com/?checkout=cancelled#pricing");
  assert.equal(sent.success_url, "https://weylandai.com/subscribe?checkout=success&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(sent.metadata.product_id, "weyland-huntx-seat");
  assert.equal(sent.line_items[0].price, WEYLAND_PRODUCTS["weyland-huntx-seat"].priceId);
  assert.equal(sent.customer_email, undefined);
});

test("hosted checkout/create: unknown and not-ready products refused as before", async () => {
  const { call } = setup();
  assert.equal((await call("/api/billing/checkout/create", { method: "POST", body: { product_id: "nope" } })).status, 400);
  assert.equal((await call("/api/billing/checkout/create", { method: "POST", body: { product_id: "weyland-marketx-seat" } })).status, 409);
});

test("embedded checkout: creates an embedded_page session and returns the client secret", async () => {
  const realFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: "cs_live_emb123", client_secret: "cs_live_emb123_secret_abc", amount_total: 4900, currency: "usd" }), { status: 200 });
  };
  try {
    const { call } = setup();
    const r = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-wire-seat", return_to: "/news?embed=1" } });
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.client_secret, "cs_live_emb123_secret_abc");
    assert.equal(d.session_id, "cs_live_emb123");
    assert.equal(d.publishable_key, "pk_test_dummy");
    assert.match(d.stripe_js, /^https:\/\/js\.stripe\.com\/endive\/stripe\.js$/);
    assert.equal(d.mount, "createEmbeddedCheckoutPage");
    assert.equal(d.product.name, "WeylandAI WireX Pro");
    assert.equal(d.status_url, "/api/billing/checkout/status/cs_live_emb123");
    const stripeCall = seen.find((c) => c.url === "https://api.stripe.com/v1/checkout/sessions");
    assert.ok(stripeCall, "Stripe was called");
    assert.equal(stripeCall.init.headers["Stripe-Version"], "2026-09-30.endive");
    const form = new URLSearchParams(stripeCall.init.body);
    assert.equal(form.get("ui_mode"), "embedded_page");
    assert.equal(form.get("mode"), "subscription");
    assert.equal(form.get("redirect_on_completion"), "if_required");
    assert.equal(form.get("return_url"), "https://weylandai.com/news?embed=1&checkout=return&session_id={CHECKOUT_SESSION_ID}");
    assert.equal(form.get("line_items[0][price]"), WEYLAND_PRODUCTS["weyland-wire-seat"].priceId);
    assert.equal(form.get("line_items[0][quantity]"), "1");
    assert.equal(form.get("metadata[venture_id]"), "weylandai");
    assert.equal(form.get("metadata[product_id]"), "weyland-wire-seat");
    assert.equal(form.get("metadata[seats]"), "1");
    assert.equal(form.get("success_url"), null);
    assert.equal(form.get("cancel_url"), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("embedded checkout: SubConP carries its price's trial explicitly", async () => {
  const realFetch = globalThis.fetch;
  let form = null;
  globalThis.fetch = async (url, init) => { form = new URLSearchParams(init.body); return new Response(JSON.stringify({ id: "cs_live_s", client_secret: "cs_live_s_secret" }), { status: 200 }); };
  try {
    const { call } = setup({ stripeRequest: async () => ({ id: "price_s", active: true, unit_amount: 200000, currency: "usd", recurring: { interval: "month", trial_period_days: 30 }, product: { name: "WeylandAI SubConP" } }) });
    const r = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-subconp-seat", quantity: 3 } });
    assert.equal(r.status, 201);
    assert.equal(form.get("subscription_data[trial_period_days]"), "30");
    assert.equal(form.get("line_items[0][quantity]"), "3");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("embedded checkout: refusals", async () => {
  const { call } = setup();
  assert.equal((await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "nope" } })).status, 400);
  assert.equal((await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-marketx-seat" } })).status, 409);
  const noKey = setup({ env: { STRIPE_PUBLISHABLE_KEY: undefined } });
  assert.equal((await noKey.call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-wire-seat" } })).status, 503);
});

test("checkout session status: only weylandai sessions, no customer data", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const id = String(url).split("/").pop();
    if (id === "cs_live_other0000000") return new Response(JSON.stringify({ id, status: "open", metadata: { venture_id: "someone-else" } }), { status: 200 });
    return new Response(JSON.stringify({ id, status: "complete", payment_status: "paid", ui_mode: "embedded_page", amount_total: 4900, currency: "usd", metadata: { venture_id: "weylandai", product_id: "weyland-wire-seat", seats: "1" }, customer_details: { email: "x@example.com" } }), { status: 200 });
  };
  try {
    const { call } = setup();
    assert.equal((await call("/api/billing/checkout/session/not-an-id")).status, 400);
    assert.equal((await call("/api/billing/checkout/session/cs_live_other0000000")).status, 404);
    const r = await call("/api/billing/checkout/session/cs_live_mine00000000");
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.status, "complete");
    assert.equal(d.product_id, "weyland-wire-seat");
    assert.equal(JSON.stringify(d).includes("x@example.com"), false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the browser helper is served and parses", async () => {
  const { call } = setup();
  const r = await call("/api/billing/embedded-checkout.js");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Content-Type"), /javascript/);
  const src = await r.text();
  assert.equal(src, EMBEDDED_CHECKOUT_JS);
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /createEmbeddedCheckoutPage/);
  assert.match(src, /\/api\/billing\/checkout\/embedded/);
});
