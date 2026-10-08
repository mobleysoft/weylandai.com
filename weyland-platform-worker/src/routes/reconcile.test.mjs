// node --test src/routes/reconcile.test.mjs
//
// A completed checkout is granted from Stripe's own record when no webhook
// delivery has arrived (2026-10-08: a live owner-approved $0 QA purchase
// completed in Stripe and was never granted). The buyer's status poll and a
// sweep of recent completed checkouts run the same provisioning as the
// webhook; "checkout:<id>" makes the first of them the only one.
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../index.js";
import { WEYLAND_PRODUCTS, WEYLAND_OFFER_PRODUCT_ID } from "../lib/stripe-billing.js";
import { reconcileCheckout, sweepRecentCheckouts } from "./webhooks-subscription.js";
import { makeEnv, ctx, send, forwardCompletionBody, newId, throwawayEmail, userById, count, insertTrialAccount, nowSec } from "./webhooks-subscription.fixtures.mjs";

const DAY = 24 * 60 * 60 * 1e3;

function offer(userId, email) {
  return {
    id: newId("cs_test_rec"), object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid",
    client_reference_id: userId, customer: null, subscription: null, payment_intent: null, created: nowSec(),
    customer_email: email, customer_details: { email, name: "QA" }, amount_total: 0, currency: "usd",
    metadata: { venture_id: "weylandai", product_id: WEYLAND_OFFER_PRODUCT_ID, seats: "1", ui: "qa-hosted" },
  };
}

test("a completed checkout no webhook delivered is granted from Stripe's record; a late webhook is a duplicate", async () => {
  const env = makeEnv();
  const email = throwawayEmail("reconcile");
  const userId = await insertTrialAccount(env, email);
  const s = offer(userId, email);
  const stripe = async (_env, method, path) => { assert.equal(method, "GET"); assert.equal(path, "/checkout/sessions/" + s.id); return s; };
  const r = await reconcileCheckout(env, s.id, WEYLAND_PRODUCTS, stripe);
  assert.equal(r.account, "signed_in_buyer");
  const row = await userById(env, userId);
  assert.ok(Date.parse(row.trial_ends_at) > Date.now() + 29 * DAY, "30 days of every product");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases WHERE status = 'granted'"), 1);
  assert.equal((await reconcileCheckout(env, s.id, WEYLAND_PRODUCTS, stripe)).duplicate, true);
  const late = await send(env, forwardCompletionBody(s));
  assert.equal(late.body.duplicate, true, "the webhook arriving afterwards changes nothing");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases"), 1);
});

test("an open or other venture's checkout grants nothing", async () => {
  const env = makeEnv();
  const email = throwawayEmail("reconcile-open");
  const userId = await insertTrialAccount(env, email);
  const open = { ...offer(userId, email), status: "open", payment_status: "unpaid" };
  assert.equal((await reconcileCheckout(env, open.id, WEYLAND_PRODUCTS, async () => open)).ignored, "not_complete");
  const other = { ...offer(userId, email), metadata: { venture_id: "lawyik" } };
  assert.equal((await reconcileCheckout(env, other.id, WEYLAND_PRODUCTS, async () => other)).ignored, "other_venture");
  // Nothing recorded: the purchases table is created on the first purchase, so it may not exist.
  const n = await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases").catch(() => 0);
  assert.equal(n, 0);
});

test("the sweep grants only the recent weylandai checkouts nobody has processed", async () => {
  const env = makeEnv();
  const a = throwawayEmail("sweep-a"), b = throwawayEmail("sweep-b");
  const ua = await insertTrialAccount(env, a), ub = await insertTrialAccount(env, b);
  const sa = offer(ua, a), sb = offer(ub, b), elsewhere = { ...offer(ua, a), metadata: { venture_id: "accountdrac" } };
  await send(env, forwardCompletionBody(sa)); // delivered by a webhook already
  const calls = [];
  const stripe = async (_env, _m, path) => { calls.push(path); return { data: [sa, sb, elsewhere], has_more: false }; };
  const r = await sweepRecentCheckouts(env, WEYLAND_PRODUCTS, { stripe });
  assert.deepEqual([r.scanned, r.granted, r.errors.length], [2, 1, 0]);
  assert.match(calls[0], /^\/checkout\/sessions\?limit=100&status=complete&created\[gte\]=\d+$/);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases WHERE status = 'granted'"), 2);
});

test("the buyer's status poll grants it when the webhook never came", async () => {
  const env = makeEnv();
  env.STRIPE_SECRET_KEY = "sk_test_local";
  const email = throwawayEmail("reconcile-poll");
  const userId = await insertTrialAccount(env, email);
  const s = offer(userId, email);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://api.stripe.com/v1/checkout/sessions/" + s.id) return new Response(JSON.stringify(s), { status: 200 });
    throw new Error("unexpected network call: " + url);
  };
  try {
    const res = await worker.fetch(new Request("https://weylandai.com/api/billing/checkout/status/" + s.id), env, ctx);
    const body = await res.json();
    assert.equal(body.status, "active");
    assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases WHERE status = 'granted'"), 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});
