// node --test src/routes/billing.test.mjs
//
// Buying in the page (2026-10-07): the embedded session for a plan and for the
// $100 first-submittal offer, Terms acceptance, no redirects, no trial, the
// hosted checkout removed, the catalog read in parallel and kept, the helper
// served with the Terms URLs. Stripe is answered locally; nothing leaves the process.
import test from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerBillingRoutes } from "./billing.js";
import { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS, WEYLAND_OFFER_PRICE_ID } from "../lib/stripe-billing.js";
import { safeSitePath, startPathFor } from "../lib/checkout-return.js";
import { embeddedCheckoutJs } from "../lib/embedded-checkout-client.js";
import { _resetCatalogMemory } from "../lib/catalog.js";
import { DEFAULT_TERMS_URL } from "../lib/legal.js";

function kv() {
  const m = new Map();
  return { async get(k, type) { const v = m.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, map: m };
}

// Stripe stand-in: prices by id (from the catalog), sessions created on POST.
function stubStripe({ priceOverrides = {} } = {}) {
  const calls = [];
  const real = globalThis.fetch;
  const byPrice = Object.fromEntries(Object.entries(WEYLAND_PRODUCTS).map(([id, cfg]) => [cfg.priceId, id]));
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    const pm = u.match(/^https:\/\/api\.stripe\.com\/v1\/prices\/([^?]+)/);
    if (pm) {
      const pid = byPrice[pm[1]];
      const offer = pm[1] === WEYLAND_OFFER_PRICE_ID;
      const base = { id: pm[1], active: true, unit_amount: offer ? 10000 : pid === "weyland-subconp-seat" ? 200000 : 4900, currency: "usd", livemode: true,
        recurring: offer ? null : { interval: "month", trial_period_days: pid === "weyland-subconp-seat" ? 30 : null },
        product: { name: offer ? "WeylandAI First Submittal (includes 30 days of every product)" : pid === "weyland-wire-seat" ? "WeylandAI WireX Pro" : "WeylandAI " + pid } };
      return new Response(JSON.stringify({ ...base, ...(priceOverrides[pid] || {}) }), { status: 200 });
    }
    if (u === "https://api.stripe.com/v1/checkout/sessions") {
      return new Response(JSON.stringify({ id: "cs_live_emb123456789", client_secret: "cs_live_emb123456789_secret_abc", amount_total: 4900, currency: "usd" }), { status: 200 });
    }
    throw new Error("unexpected fetch " + u);
  };
  return { calls, restore: () => { globalThis.fetch = real; }, sessionForm: () => new URLSearchParams(calls.find((c) => c.url === "https://api.stripe.com/v1/checkout/sessions")?.init.body || "") };
}

function setup({ env = {} } = {}) {
  _resetCatalogMemory();
  const router = new NativeRouter();
  registerBillingRoutes(router, { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS });
  const calls = { vendyai: [] };
  const VENDYAI = { async fetch(url, init) { calls.vendyai.push({ url, init }); return new Response("{}", { status: 500 }); } };
  const fullEnv = { VENDYAI, CACHE: kv(), STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_PUBLISHABLE_KEY: "pk_test_dummy", ...env };
  const call = (path, { method = "GET", body, headers = {} } = {}) => router.handle(new Request("https://weylandai.com" + path, {
    method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body)
  }), fullEnv, { waitUntil() {} });
  return { call, calls, env: fullEnv };
}

test("safeSitePath keeps same-site paths and refuses everything else; startPathFor prefers return_to", () => {
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
  const req = new Request("https://weylandai.com/api/billing/checkout/embedded", { headers: { Referer: "https://weylandai.com/pricing?ref=ph" } });
  assert.equal(startPathFor(req, { return_to: "/news" }), "/news");
  assert.equal(startPathFor(req, {}), "/pricing?ref=ph");
});

test("hosted checkout is gone: POST /api/billing/checkout/create answers 410 and calls nobody", async () => {
  const { call, calls } = setup();
  const r = await call("/api/billing/checkout/create", { method: "POST", body: { product_id: "weyland-huntx-seat", quantity: 1 } });
  assert.equal(r.status, 410);
  const d = await r.json();
  assert.equal(d.error, "hosted_checkout_removed");
  assert.match(d.use, /WeylandCheckout\.open/);
  assert.equal(calls.vendyai.length, 0, "vendyai's hosted checkout is not called");
});

test("embedded checkout for a plan: embedded_page, never redirects, no trial, Terms stored", async () => {
  const stripe = stubStripe();
  try {
    const { call } = setup();
    const r = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-wire-seat", return_to: "/news?embed=1", terms_accepted: true } });
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.client_secret, "cs_live_emb123456789_secret_abc");
    assert.equal(d.session_id, "cs_live_emb123456789");
    assert.equal(d.publishable_key, "pk_test_dummy");
    assert.match(d.stripe_js, /^https:\/\/js\.stripe\.com\/endive\/stripe\.js$/);
    assert.equal(d.mount, "createEmbeddedCheckoutPage");
    assert.equal(d.mode, "subscription");
    assert.equal(d.product.name, "WeylandAI WireX Pro");
    assert.equal(d.product.trial_period_days, null);
    assert.equal(d.terms.url, DEFAULT_TERMS_URL);
    assert.equal(d.status_url, "/api/billing/checkout/status/cs_live_emb123456789");
    const stripeCall = stripe.calls.find((c) => c.url === "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(stripeCall.init.headers["Stripe-Version"], "2026-09-30.endive");
    const form = stripe.sessionForm();
    assert.equal(form.get("ui_mode"), "embedded_page");
    assert.equal(form.get("mode"), "subscription");
    assert.equal(form.get("redirect_on_completion"), "never");
    assert.equal(form.get("return_url"), null, "no return_url: nothing ever redirects");
    assert.equal(form.get("success_url"), null);
    assert.equal(form.get("cancel_url"), null);
    assert.equal(form.get("line_items[0][price]"), WEYLAND_PRODUCTS["weyland-wire-seat"].priceId);
    assert.equal(form.get("line_items[0][quantity]"), "1");
    assert.equal(form.get("metadata[venture_id]"), "weylandai");
    assert.equal(form.get("metadata[product_id]"), "weyland-wire-seat");
    assert.equal(form.get("metadata[start_path]"), "/news?embed=1");
    assert.equal(form.get("metadata[terms_url]"), DEFAULT_TERMS_URL);
    assert.match(form.get("metadata[terms_accepted_at]"), /^\d{4}-\d\d-\d\dT/);
    assert.equal(form.get("subscription_data[trial_period_days]"), null);
    assert.equal(form.get("subscription_data[metadata][venture_id]"), "weylandai");
    assert.match(form.get("custom_text[submit][message]"), /monthly until you cancel/);
  } finally {
    stripe.restore();
  }
});

test("SubConP has no trial any more: charged from the day it is chosen (its Stripe price still says 30 days)", async () => {
  const stripe = stubStripe();
  try {
    const { call } = setup();
    const r = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-subconp-seat", quantity: 3, terms_accepted: true } });
    assert.equal(r.status, 201);
    const form = stripe.sessionForm();
    assert.equal(form.get("subscription_data[trial_period_days]"), null);
    assert.equal(form.get("subscription_data[trial_end]"), null);
    assert.equal(form.get("line_items[0][quantity]"), "3");
    const d = await r.json();
    assert.equal(d.product.trial_period_days, null);
  } finally {
    stripe.restore();
  }
});

test("the $100 offer: a one-time card payment with a customer, an invoice and the no-automatic-charge words; quantity always 1", async () => {
  const stripe = stubStripe();
  try {
    const { call } = setup();
    const r = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-first-submittal", quantity: 7, terms_accepted: true } });
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.mode, "payment");
    assert.equal(d.product.one_time, true);
    assert.equal(d.product.interval, null);
    assert.equal(d.product.unit_amount, 10000);
    assert.equal(d.quantity, 1);
    const form = stripe.sessionForm();
    assert.equal(form.get("mode"), "payment");
    assert.equal(form.get("redirect_on_completion"), "never");
    assert.equal(form.get("return_url"), null);
    assert.equal(form.get("line_items[0][price]"), WEYLAND_OFFER_PRICE_ID);
    assert.equal(form.get("line_items[0][quantity]"), "1");
    assert.equal(form.get("allowed_payment_method_types[0]"), "card");
    assert.equal(form.get("allowed_payment_method_types[1]"), null);
    assert.equal(form.get("customer_creation"), "always");
    assert.equal(form.get("invoice_creation[enabled]"), "true");
    assert.equal(form.get("invoice_creation[invoice_data][metadata][product_id]"), "weyland-first-submittal");
    assert.match(form.get("invoice_creation[invoice_data][footer]"), /Argo LLC/);
    assert.equal(form.get("payment_intent_data[metadata][venture_id]"), "weylandai");
    assert.match(form.get("custom_text[submit][message]"), /No automatic charge/);
    assert.equal(form.get("subscription_data[metadata][venture_id]"), null, "not a subscription");
    assert.equal(form.get("metadata[product_id]"), "weyland-first-submittal");
  } finally {
    stripe.restore();
  }
});

test("embedded checkout refusals: no Terms, unknown product, not sold, not configured", async () => {
  const stripe = stubStripe();
  try {
    const { call } = setup();
    const noTerms = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-wire-seat" } });
    assert.equal(noTerms.status, 400);
    const nt = await noTerms.json();
    assert.equal(nt.detail.code, "terms_required");
    assert.equal(nt.detail.terms_url, DEFAULT_TERMS_URL);
    assert.equal((await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "nope", terms_accepted: true } })).status, 400);
    const marketx = await call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-marketx-seat", terms_accepted: true } });
    assert.equal(marketx.status, 409);
    assert.equal((await marketx.json()).detail.code, "not_sold");
    const noKey = setup({ env: { STRIPE_PUBLISHABLE_KEY: undefined } });
    assert.equal((await noKey.call("/api/billing/checkout/embedded", { method: "POST", body: { product_id: "weyland-wire-seat", terms_accepted: true } })).status, 503);
    assert.equal(stripe.calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").length, 0, "no session was created by a refused request");
  } finally {
    stripe.restore();
  }
});

test("catalog: read from Stripe in parallel, kept in KV, the offer one-time, no trial reported", async () => {
  const stripe = stubStripe();
  try {
    const { call, env } = setup();
    const r = await call("/api/billing/catalog");
    assert.equal(r.status, 200);
    const d = await r.json();
    const byId = Object.fromEntries(d.products.map((p) => [p.id, p]));
    assert.equal(d.products.length, Object.keys(WEYLAND_PRODUCTS).length);
    assert.deepEqual({ ...byId["weyland-first-submittal"], name: undefined, price_id: undefined },
      { id: "weyland-first-submittal", checkout_ready: true, price_active: true, unit_amount: 10000, currency: "usd", interval: null, one_time: true, kind: "offer", trial_period_days: null, livemode: true, name: undefined, price_id: undefined });
    assert.equal(byId["weyland-subconp-seat"].trial_period_days, null, "the price's own 30 days are never applied");
    assert.equal(byId["weyland-marketx-seat"].checkout_ready, false);
    const priceCalls = stripe.calls.filter((c) => c.url.includes("/v1/prices/")).length;
    assert.equal(priceCalls, Object.keys(WEYLAND_PRODUCTS).length);
    assert.ok(env.CACHE.map.has("billing_catalog_v2"), "kept in KV");
    _resetCatalogMemory();
    await call("/api/billing/catalog");
    assert.equal(stripe.calls.filter((c) => c.url.includes("/v1/prices/")).length, priceCalls, "the second read comes from KV, not Stripe");
  } finally {
    stripe.restore();
  }
});

test("checkout session status: only weylandai sessions, no customer data", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const id = String(url).split("/").pop();
    if (id === "cs_live_other0000000") return new Response(JSON.stringify({ id, status: "open", metadata: { venture_id: "someone-else" } }), { status: 200 });
    return new Response(JSON.stringify({ id, status: "complete", payment_status: "paid", ui_mode: "embedded_page", mode: "payment", amount_total: 10000, currency: "usd", metadata: { venture_id: "weylandai", product_id: "weyland-first-submittal", seats: "1" }, customer_details: { email: "x@example.com" } }), { status: 200 });
  };
  try {
    const { call } = setup();
    assert.equal((await call("/api/billing/checkout/session/not-an-id")).status, 400);
    assert.equal((await call("/api/billing/checkout/session/cs_live_other0000000")).status, 404);
    const r = await call("/api/billing/checkout/session/cs_live_mine00000000");
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.status, "complete");
    assert.equal(d.mode, "payment");
    assert.equal(d.product_id, "weyland-first-submittal");
    assert.equal(JSON.stringify(d).includes("x@example.com"), false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the browser helper is served with the Terms URLs, parses, and has the Terms step and the held state", async () => {
  const { call } = setup({ env: { TERMS_URL: "https://weylandai.com/terms", PRIVACY_URL: "https://evil.example/privacy" } });
  const r = await call("/api/billing/embedded-checkout.js");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Content-Type"), /javascript/);
  const src = await r.text();
  assert.equal(src, embeddedCheckoutJs({ TERMS_URL: "https://weylandai.com/terms", PRIVACY_URL: "https://evil.example/privacy" }));
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /var TERMS_URL = "https:\/\/weylandai\.com\/terms"/);
  assert.match(src, /var PRIVACY_URL = "https:\/\/consenta\.cc\/policy\/weylandai\.com\/privacy"/, "an off-site URL from the vars is not used");
  assert.match(src, /createEmbeddedCheckoutPage/);
  assert.match(src, /terms_accepted: true/);
  assert.match(src, /wco-agree/);
  assert.match(src, /status === "held"/);
  assert.equal(/checkout\.stripe\.com|mailto:/.test(src), false, "never a hosted page or the mail app");
});
