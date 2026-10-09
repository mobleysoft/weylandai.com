import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerWebhooksSubscriptionRoutes } from "./webhooks-subscription.js";
import { makeEnv, paidSession, subscriptionObject, insertFreeAccount, userByEmail } from "../../weyland-platform-worker/src/routes/webhooks-subscription.fixtures.mjs";

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

test("POST /api/webhooks/subscription: provisions a brand-new buyer with an AuthFor identity and a durable receipt", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ user: { id: "af-user" }, session_id: "afs_1", token: "tok_1" }), { status: 200 });
  const env = makeEnv();
  const { router } = setup();
  const obj = paidSession({ productId: "weyland-subconp-seat", seats: 2, email: "new@example.com" });
  const req = webhookRequest({ id: "evt_2", type: "checkout.session.completed", data: { object: obj } }, { "Stripe-Signature": "ok" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.equal((await res.json()).provisioned, true);
  const user = await userByEmail(env, "new@example.com");
  assert.equal(user.subscription_tier, "subconp");
  const session = await env.DB.prepare("SELECT player_json FROM weyland_sessions WHERE user_id = ?").bind(user.id).first();
  assert.equal(JSON.parse(session.player_json).authfor_backed, true);
  assert.equal((await env.DB.prepare("SELECT status FROM weyland_purchases").first()).status, "granted");
});

for (const [type, status] of [["customer.subscription.updated", "past_due"], ["customer.subscription.deleted", "canceled"]]) {
  test("POST /api/webhooks/subscription: recorded " + type + " removes the paid grant", async () => {
    const env = makeEnv();
    const { router } = setup();
    const userId = await insertFreeAccount(env, "existing@example.com");
    const obj = paidSession({ productId: "weyland-meetingx-seat", email: "existing@example.com", signedInUserId: userId });
    await router.handle(webhookRequest({ id: "evt-paid", type: "checkout.session.completed", created: 100, data: { object: obj } }, { "Stripe-Signature": "ok" }), env, {});
    const subscription = subscriptionObject({ id: obj.subscription, customer: obj.customer, productId: "weyland-meetingx-seat", status });
    const res = await router.handle(webhookRequest({ id: "evt-stop", type, created: 101, data: { object: subscription } }, { "Stripe-Signature": "ok" }), env, {});
    assert.equal(res.status, 200);
    assert.equal((await res.json()).applied, true);
    const row = await userByEmail(env, "existing@example.com");
    assert.ok(!row.products_enabled.split(",").includes("meetingx"));
    assert.equal((await env.DB.prepare("SELECT status FROM weyland_subscriptions WHERE subscription_id = ?").bind(obj.subscription).first()).status, status);
  });
}

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
