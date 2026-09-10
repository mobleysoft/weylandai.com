import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerBillingRoutes } from "./billing.js";

const PRODUCTS = {
  "weyland-subconp-seat": { priceId: "price_subconp", tier: null },
  "weyland-cutsheetx-seat": { priceId: "price_cutsheetx", tier: "cutsheetx" },
};
const READY = new Set(["weyland-subconp-seat", "weyland-cutsheetx-seat"]);

function setup({ stripeRequest, vendyai, cache } = {}) {
  const router = new NativeRouter();
  registerBillingRoutes(router, {
    WEYLAND_PRODUCTS: PRODUCTS,
    CHECKOUT_READY_PRODUCTS: READY,
    stripeRequest: stripeRequest || (async (env2, method, path) => ({
      active: true, id: "price_1", unit_amount: 2000, currency: "usd", recurring: { trial_period_days: 14 }, livemode: true,
    })),
  });
  return { router, env: { VENDYAI: vendyai, CACHE: cache } };
}

test("GET /api/billing/catalog: real happy path reports checkout_ready pricing for every product", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/billing/catalog"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.products.length, 2);
  assert.equal(body.products[0].checkout_ready, true);
  assert.equal(body.products[0].unit_amount, 2000);
});

test("GET /api/billing/catalog: a per-product Stripe error is captured, not fatal to the whole request", async () => {
  const { router, env } = setup({
    stripeRequest: async (env2, method, path) => {
      if (path.includes("price_subconp")) throw new Error("stripe down");
      return { active: true, id: "price_2", unit_amount: 500, currency: "usd" };
    },
  });
  const res = await router.handle(new Request("https://example.com/api/billing/catalog"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  const subconp = body.products.find((p) => p.id === "weyland-subconp-seat");
  assert.equal(subconp.checkout_ready, false);
  assert.deepEqual(subconp.blockers, ["stripe down"]);
});

test("POST /api/billing/checkout/create: 400 for an unknown product_id", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/billing/checkout/create", { method: "POST", body: JSON.stringify({ product_id: "bogus" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/billing/checkout/create: 409 for a product not yet self-checkout ready", async () => {
  const PRODUCTS2 = { ...PRODUCTS, "weyland-notready-seat": { priceId: "price_x", tier: "notready" } };
  const router = new NativeRouter();
  registerBillingRoutes(router, { WEYLAND_PRODUCTS: PRODUCTS2, CHECKOUT_READY_PRODUCTS: READY, stripeRequest: async () => ({}) });
  const req = new Request("https://example.com/api/billing/checkout/create", { method: "POST", body: JSON.stringify({ product_id: "weyland-notready-seat" }) });
  const res = await router.handle(req, { VENDYAI: undefined }, {});
  assert.equal(res.status, 409);
});

test("POST /api/billing/checkout/create: real happy path creates a checkout session via the vendyai service binding", async () => {
  let capturedBody = null;
  const vendyai = {
    async fetch(url, init) {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ session: { url: "https://checkout.stripe.com/s1", id: "cs_1" } }), { status: 200 });
    },
  };
  const { router, env } = setup({ vendyai });
  const req = new Request("https://example.com/api/billing/checkout/create", { method: "POST", body: JSON.stringify({ product_id: "weyland-subconp-seat", quantity: 3 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.checkout_url, "https://checkout.stripe.com/s1");
  assert.equal(body.session_id, "cs_1");
  assert.equal(capturedBody.line_items[0].price, "price_subconp");
  assert.equal(capturedBody.line_items[0].quantity, 3);
  assert.equal(capturedBody.metadata.product_id, "weyland-subconp-seat");
});

test("POST /api/billing/checkout/create: quantity is clamped to [1, 250]", async () => {
  let capturedBody = null;
  const vendyai = {
    async fetch(url, init) {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ session: { url: "u", id: "s" } }), { status: 200 });
    },
  };
  const { router, env } = setup({ vendyai });
  const req = new Request("https://example.com/api/billing/checkout/create", { method: "POST", body: JSON.stringify({ product_id: "weyland-subconp-seat", quantity: 99999 }) });
  await router.handle(req, env, {});
  assert.equal(capturedBody.line_items[0].quantity, 250);
});

test("POST /api/billing/checkout/create: 502 when vendyai returns an error", async () => {
  const vendyai = { async fetch() { return new Response(JSON.stringify({ error: { message: "vendyai down" } }), { status: 500 }); } };
  const { router, env } = setup({ vendyai });
  const req = new Request("https://example.com/api/billing/checkout/create", { method: "POST", body: JSON.stringify({ product_id: "weyland-subconp-seat" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 502);
});

test("GET /api/billing/checkout/status/:session_id: pending when nothing cached", async () => {
  const { router, env } = setup({ cache: { async get() { return null; } } });
  const res = await router.handle(new Request("https://example.com/api/billing/checkout/status/cs_1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "pending");
});

test("GET /api/billing/checkout/status/:session_id: real happy path returns active status and sets a session cookie", async () => {
  const cache = { async get() { return JSON.stringify({ status: "active", quantity: 2, session_id: "wses_1" }); } };
  const { router, env } = setup({ cache });
  const res = await router.handle(new Request("https://example.com/api/billing/checkout/status/cs_1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "active");
  assert.equal(body.quantity, 2);
  assert.match(res.headers.get("Set-Cookie") || "", /weyland_session=wses_1/);
});

test("GET /api/billing/checkout/status/:session_id: no cookie set when status isn't active", async () => {
  const cache = { async get() { return JSON.stringify({ status: "expired", session_id: "wses_1" }); } };
  const { router, env } = setup({ cache });
  const res = await router.handle(new Request("https://example.com/api/billing/checkout/status/cs_1"), env, {});
  assert.equal(res.headers.get("Set-Cookie"), null);
});
