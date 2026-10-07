// node --test src/routes/billing.customer.test.mjs
//
// Embedded checkout for a signed-in account that already has a Stripe
// customer (2026-10-07): the new subscription goes under that customer, so the
// billing portal shows every subscription the account pays for; if Stripe
// refuses the customer, the checkout goes ahead by email as before. The
// subscription carries the account id (user_id) for the lifecycle webhooks.
// (2026-10-07: every request carries terms_accepted:true, which checkout now requires.)
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import worker from "../index.js";
import { WEYLAND_PRODUCTS } from "../lib/stripe-billing.js";
import { makeEnv, ctx, throwawayEmail } from "./webhooks-subscription.fixtures.mjs";

async function signedInAccount(env, { customer = null } = {}) {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const email = throwawayEmail("buyer");
  await env.DB.prepare("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, stripe_customer_id) VALUES (?, ?, 'User Sim', 'standalone', 'active', 'wire', ?)")
    .bind(userId, email, customer).run();
  await env.DB.prepare("INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at) VALUES (?, ?, ?, '{}', ?)")
    .bind(sessionId, userId, email, new Date(Date.now() + 86400e3).toISOString()).run();
  return { userId, email, cookie: "weyland_session=" + sessionId };
}

function stubStripe({ refuseCustomer = false } = {}) {
  const posts = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith("https://api.stripe.com/v1/prices/")) {
      return new Response(JSON.stringify({ id: "price_x", active: true, unit_amount: 69900, currency: "usd", recurring: { interval: "month" }, product: { name: "WeylandAI MeetingX" } }), { status: 200 });
    }
    if (u === "https://api.stripe.com/v1/checkout/sessions") {
      const form = new URLSearchParams(init.body);
      posts.push(form);
      if (refuseCustomer && form.get("customer")) {
        return new Response(JSON.stringify({ error: { type: "invalid_request_error", code: "resource_missing", message: "No such customer" } }), { status: 400 });
      }
      return new Response(JSON.stringify({ id: "cs_live_cust" + posts.length, client_secret: "cs_secret_" + posts.length, amount_total: 69900, currency: "usd" }), { status: 200 });
    }
    throw new Error("unexpected fetch " + u);
  };
  return { posts, restore: () => { globalThis.fetch = real; } };
}

const embedded = (env, cookie) => worker.fetch(new Request("https://weylandai.com/api/billing/checkout/embedded", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ product_id: "weyland-meetingx-seat", terms_accepted: true })
}), { ...env, STRIPE_PUBLISHABLE_KEY: "pk_test_dummy" }, ctx);

test("an account with a Stripe customer buys under that customer, and the subscription names the account", async () => {
  const env = makeEnv();
  const acct = await signedInAccount(env, { customer: "cus_existing123" });
  const stripe = stubStripe();
  try {
    const r = await embedded(env, acct.cookie);
    assert.equal(r.status, 201);
    assert.equal(stripe.posts.length, 1);
    const form = stripe.posts[0];
    assert.equal(form.get("customer"), "cus_existing123");
    assert.equal(form.get("customer_email"), null, "Stripe takes customer or customer_email, not both");
    assert.equal(form.get("client_reference_id"), acct.userId);
    assert.equal(form.get("subscription_data[metadata][user_id]"), acct.userId);
    assert.equal(form.get("subscription_data[metadata][venture_id]"), "weylandai");
    assert.equal(form.get("line_items[0][price]"), WEYLAND_PRODUCTS["weyland-meetingx-seat"].priceId);
  } finally {
    stripe.restore();
  }
});

test("Stripe refuses the stored customer -> the same checkout by email", async () => {
  const env = makeEnv();
  const acct = await signedInAccount(env, { customer: "cus_gone" });
  const stripe = stubStripe({ refuseCustomer: true });
  try {
    const r = await embedded(env, acct.cookie);
    assert.equal(r.status, 201);
    assert.equal(stripe.posts.length, 2);
    assert.equal(stripe.posts[1].get("customer"), null);
    assert.equal(stripe.posts[1].get("customer_email"), acct.email);
    assert.equal((await r.json()).session_id, "cs_live_cust2");
  } finally {
    stripe.restore();
  }
});

test("an account without a Stripe customer checks out by email (unchanged)", async () => {
  const env = makeEnv();
  const acct = await signedInAccount(env);
  const stripe = stubStripe();
  try {
    const r = await embedded(env, acct.cookie);
    assert.equal(r.status, 201);
    assert.equal(stripe.posts.length, 1);
    assert.equal(stripe.posts[0].get("customer"), null);
    assert.equal(stripe.posts[0].get("customer_email"), acct.email);
  } finally {
    stripe.restore();
  }
});
