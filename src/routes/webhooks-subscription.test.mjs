import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerWebhooksSubscriptionRoutes } from "./webhooks-subscription.js";

const PRODUCTS = {
  "weyland-subconp-seat": { priceId: "price_subconp", tier: null },
  "weyland-cutsheetx-seat": { priceId: "price_cutsheetx", tier: "cutsheetx" },
};

function makeFakeDb({ existingUser = null, changes = 1 } = {}) {
  return {
    prepare(sql) {
      const stmt = {
        async first() {
          if (sql.includes("FROM users WHERE email")) return existingUser;
          return null;
        },
        async run() {
          if (sql.includes("processed_webhook_events")) return { meta: { changes } };
          return { success: true };
        },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
}

function setup({
  db,
  cache,
  verifyVendyaiForwardSignature = async () => ({ valid: true }),
  verifyStripeWebhookSignature = async () => ({ valid: true }),
} = {}) {
  const router = new NativeRouter();
  registerWebhooksSubscriptionRoutes(router, {
    WEYLAND_PRODUCTS: PRODUCTS,
    WEYLAND_SUBCONP_PRODUCT_ID: "weyland-subconp-seat",
    verifyVendyaiForwardSignature,
    verifyStripeWebhookSignature,
  });
  return { router, env: { DB: db || makeFakeDb(), CACHE: cache, SUBSCRIPTION_WEBHOOK_SECRET: "s1", STRIPE_WEBHOOK_SECRET: "s2" } };
}

function webhookRequest(body, headers = {}) {
  return new Request("https://example.com/api/webhooks/subscription", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("POST /api/webhooks/subscription: 401 when neither signature header is present", async () => {
  const { router, env } = setup();
  const res = await router.handle(webhookRequest({ type: "x" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/webhooks/subscription: rejects an invalid vendyai forward signature", async () => {
  const { router, env } = setup({ verifyVendyaiForwardSignature: async () => ({ valid: false, reason: "signature_mismatch" }) });
  const res = await router.handle(webhookRequest({ type: "x" }, { "X-Webhook-Signature": "bad", "X-Webhook-Timestamp": "123" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/webhooks/subscription: 500 when SUBSCRIPTION_WEBHOOK_SECRET isn't configured for a vendyai forward", async () => {
  const { router, env } = setup();
  delete env.SUBSCRIPTION_WEBHOOK_SECRET;
  const res = await router.handle(webhookRequest({ type: "x" }, { "X-Webhook-Signature": "sig", "X-Webhook-Timestamp": "123" }), env, {});
  assert.equal(res.status, 500);
});

test("POST /api/webhooks/subscription: rejects an invalid direct Stripe signature", async () => {
  const { router, env } = setup({ verifyStripeWebhookSignature: async () => ({ valid: false, reason: "expired" }) });
  const res = await router.handle(webhookRequest({ type: "x" }, { "Stripe-Signature": "bad" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/webhooks/subscription: real happy path skips a duplicate event id", async () => {
  const db = makeFakeDb({ changes: 0 });
  const { router, env } = setup({ db });
  const res = await router.handle(webhookRequest({ id: "evt_1", type: "customer.subscription.updated", data: { object: {} } }, { "Stripe-Signature": "ok" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.duplicate, true);
});

test("POST /api/webhooks/subscription: real happy path provisions a brand-new user on checkout.session.completed", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /authfor\.com\/api\/v1\/register/);
    return new Response(JSON.stringify({ session_id: "afs_1", token: "tok_1" }), { status: 200 });
  };
  const runCalls = [];
  const db = {
    prepare(sql) {
      const stmt = {
        async first() { return sql.includes("FROM users WHERE email") ? null : null; },
        async run() {
          runCalls.push(sql.trim().split("\n")[0]);
          if (sql.includes("processed_webhook_events")) return { meta: { changes: 1 } };
          return { success: true };
        },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
  const cache = { async put() {} };
  const { router, env } = setup({ db, cache });
  const req = webhookRequest({
    id: "evt_2",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", mode: "subscription", customer: "cus_1", customer_details: { email: "new@example.com", name: "New Customer" }, metadata: { seats: "2", product_id: "weyland-subconp-seat" } } },
  }, { "Stripe-Signature": "ok" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.received, true);
  assert.ok(runCalls.some((s) => s.includes("INSERT INTO users")));
  assert.ok(runCalls.some((s) => s.includes("INSERT INTO weyland_sessions")));
});

test("POST /api/webhooks/subscription: real happy path updates an existing user's subscription status", async () => {
  const runCalls = [];
  const db = {
    prepare(sql) {
      const stmt = {
        async first() { return null; },
        async run() {
          runCalls.push(sql.trim());
          if (sql.includes("processed_webhook_events")) return { meta: { changes: 1 } };
          return { success: true };
        },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
  const { router, env } = setup({ db });
  const req = webhookRequest({
    id: "evt_3",
    type: "customer.subscription.updated",
    data: { object: { customer: "cus_1", status: "past_due" } },
  }, { "Stripe-Signature": "ok" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(runCalls.some((s) => s.includes("subscription_status=?") && s.includes("WHERE stripe_customer_id=?")));
});

test("POST /api/webhooks/subscription: real happy path cancels on customer.subscription.deleted", async () => {
  const runCalls = [];
  const db = {
    prepare(sql) {
      const stmt = {
        async first() { return null; },
        async run() {
          runCalls.push(sql.trim());
          if (sql.includes("processed_webhook_events")) return { meta: { changes: 1 } };
          return { success: true };
        },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
  const { router, env } = setup({ db });
  const req = webhookRequest({
    id: "evt_4",
    type: "customer.subscription.deleted",
    data: { object: { customer: "cus_1" } },
  }, { "Stripe-Signature": "ok" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(runCalls.some((s) => s.includes("subscription_status='cancelled'")));
});

test("POST /api/webhooks/subscription: an unhandled event type still returns received:true", async () => {
  const { router, env } = setup();
  const req = webhookRequest({ id: "evt_5", type: "some.unhandled.event", data: { object: {} } }, { "Stripe-Signature": "ok" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.received, true);
});

test("POST /api/webhooks/subscription: invalid JSON body surfaces as a real 500, not a crash", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/webhooks/subscription", { method: "POST", headers: { "Stripe-Signature": "ok" }, body: "not json" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 500);
});
