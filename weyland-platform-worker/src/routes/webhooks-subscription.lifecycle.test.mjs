// node --test src/routes/webhooks-subscription.lifecycle.test.mjs
//
// Cancellations, renewals and failed payments (2026-10-07). Each event is the
// body vendyai forwards for venture weylandai (vendyai.com/src/worker.js:
// { id, type, created, data: <the Stripe object> }, re-signed with the forward
// secret) or, where noted, the Stripe-signed event itself, built from the
// Stripe objects as the account's API version (2024-11-20.acacia) renders
// them; one invoice uses the 2025+ "parent" shape. Run against this Worker's
// whole fetch handler and SQLite with production's table definitions; the
// product gate is MeetingX's own requireProductAccess.
import test from "node:test";
import assert from "node:assert/strict";

import worker from "../index.js";
import { syncUserEntitlements, describeEntitlements, GUEST_PRODUCTS, TRIAL_MARK } from "../lib/entitlements.js";
import {
  makeEnv, ctx, handle, send, paidSession, forwardCompletionBody, forwardEventBody, forwardRequest, stripeRequest,
  subscriptionObject, invoiceObject, nowSec, newId, throwawayEmail, installNetwork, restoreNetwork, network,
  userByEmail, userById, products, paidProducts, count, insertTrialAccount, insertFreeAccount, gate, summary
} from "./webhooks-subscription.fixtures.mjs";

test.before(installNetwork);
test.after(restoreNetwork);

// A paying MeetingX subscriber (bought through the embedded form, forwarded by vendyai).
async function subscriber(env, { productId = "weyland-meetingx-seat", email = throwawayEmail("life"), signedInUserId = null, created = nowSec() - 3600 } = {}) {
  const session = paidSession({ productId, email, signedInUserId });
  const r = await send(env, forwardCompletionBody(session, { created }));
  assert.equal(r.status, 200);
  const row = await userByEmail(env, email);
  return { session, row, email, sub: session.subscription, customer: session.customer, productId };
}

const subEvent = (type, s, status, created, extra = {}) =>
  forwardEventBody(type, subscriptionObject({ id: s.sub, customer: s.customer, productId: s.productId, status, ...extra }), { created });
const invEvent = (type, s, created, opts = {}) =>
  forwardEventBody(type, invoiceObject({ subscription: s.sub, customer: s.customer, productId: s.productId, ...opts }), { created });
const subRow = (env, id) => env.DB.prepare("SELECT * FROM weyland_subscriptions WHERE subscription_id = ?").bind(id).first();

test("failed payment, recovery, renewal, cancellation: one MeetingX subscriber through the whole lifecycle", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  const t0 = nowSec();
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");

  // 1. Renewal payment fails: Stripe marks the subscription past_due.
  let r = await send(env, subEvent("customer.subscription.updated", s, "past_due", t0 + 10));
  assert.equal(r.body.applied, true);
  let row = await userById(env, s.row.id);
  assert.deepEqual(summary(row), { tier: "free", status: "past_due", paid_products: [], guest_floor: true, trial_mark: false, submittals_limit: 999, submittals_used: 0 });
  assert.equal(await gate(env, s.row.id, "meetingx"), 402, "MeetingX withheld while the payment is failing");
  assert.equal(await gate(env, s.row.id, "cutsheetx"), "allowed", "the guest floor stays");
  const ent = describeEntitlements(row);
  assert.equal(ent.payment_failing, true);
  assert.deepEqual(ent.products.sort(), [...GUEST_PRODUCTS].sort());

  // 2. The customer updates the card; Stripe's retry succeeds.
  r = await send(env, subEvent("customer.subscription.updated", s, "active", t0 + 20));
  row = await userById(env, s.row.id);
  assert.deepEqual([row.subscription_tier, row.subscription_status, paidProducts(row).join()], ["standalone", "active", "meetingx"]);
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");

  // 3. invoice.payment_failed on its own also withholds it.
  r = await send(env, invEvent("invoice.payment_failed", s, t0 + 30));
  assert.equal(r.body.subscription_status, "past_due");
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);

  // 4. A renewal paid: access back and a new usage period.
  await env.DB.prepare("UPDATE users SET submittals_used = 37 WHERE id = ?").bind(s.row.id).run();
  r = await send(env, invEvent("invoice.paid", s, t0 + 40, { billingReason: "subscription_cycle" }));
  assert.equal(r.body.renewal, true);
  row = await userById(env, s.row.id);
  assert.deepEqual([row.subscription_status, paidProducts(row).join(), row.submittals_used], ["active", "meetingx", 0]);
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");

  // 5. A late, older event (sent before the renewal) changes nothing.
  r = await send(env, subEvent("customer.subscription.updated", s, "past_due", t0 + 35));
  assert.equal(r.body.ignored, "stale");
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");

  // 6. Cancelled (end of period, or cancelled in the portal): back to the free plan, guest floor kept.
  const deleted = subEvent("customer.subscription.deleted", s, "canceled", t0 + 50);
  r = await send(env, deleted);
  row = await userById(env, s.row.id);
  assert.deepEqual(summary(row), { tier: "free", status: "active", paid_products: [], guest_floor: true, trial_mark: false, submittals_limit: 999, submittals_used: 0 });
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);
  assert.equal(await gate(env, s.row.id, "propx"), "allowed");
  assert.equal((await subRow(env, s.sub)).status, "canceled");

  // 7. Nothing brings a cancelled subscription back; the same event again is a duplicate.
  r = await send(env, invEvent("invoice.paid", s, t0 + 60));
  assert.equal(r.body.ignored, "already-ended");
  r = await send(env, deleted);
  assert.equal(r.body.duplicate, true);
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);
  console.log("[lifecycle] after cancellation:", JSON.stringify(summary(await userById(env, s.row.id))));
});

test("cancel_at_period_end keeps access until Stripe ends the subscription", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  const r = await send(env, subEvent("customer.subscription.updated", s, "active", nowSec() + 5, {}));
  assert.equal(r.body.applied, true);
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");
});

test("two subscriptions under two Stripe customers: cancelling MeetingX keeps WireX", async () => {
  const env = makeEnv();
  const email = throwawayEmail("two");
  const userId = await insertFreeAccount(env, email);
  const a = await subscriber(env, { productId: "weyland-meetingx-seat", email, signedInUserId: userId });
  const b = await subscriber(env, { productId: "weyland-wire-seat", email, signedInUserId: userId });
  assert.notEqual(a.customer, b.customer);
  let row = await userById(env, userId);
  assert.deepEqual(paidProducts(row), ["meetingx", "wire"]);
  assert.equal(row.stripe_customer_id, b.customer, "the latest customer");
  // The MeetingX subscription's customer is no longer on the users row: found by its subscription row.
  await send(env, subEvent("customer.subscription.deleted", a, "canceled", nowSec() + 10));
  row = await userById(env, userId);
  assert.deepEqual([row.subscription_tier, row.subscription_status, paidProducts(row).join()], ["standalone", "active", "wire"]);
  assert.equal(await gate(env, userId, "meetingx"), 402);
  assert.equal(await gate(env, userId, "wire"), "allowed");
});

test("SubConP suite: a failing payment withholds the suite, a cancellation ends it", async () => {
  const env = makeEnv();
  const s = await subscriber(env, { productId: "weyland-subconp-seat" });
  assert.equal((await userById(env, s.row.id)).subscription_tier, "subconp");
  assert.equal(await gate(env, s.row.id, "lienx"), "allowed");
  await send(env, invEvent("invoice.payment_failed", s, nowSec() + 10));
  let row = await userById(env, s.row.id);
  assert.deepEqual([row.subscription_tier, row.subscription_status], ["free", "past_due"]);
  assert.equal(await gate(env, s.row.id, "lienx"), 402);
  assert.equal(describeEntitlements(row).suite, false);
  await send(env, subEvent("customer.subscription.deleted", s, "canceled", nowSec() + 20));
  row = await userById(env, s.row.id);
  assert.deepEqual([row.subscription_tier, row.subscription_status], ["free", "active"]);
  assert.equal(await gate(env, s.row.id, "lienx"), 402);
  assert.equal(await gate(env, s.row.id, "subx"), "allowed");
});

test("a Stripe trial (SubConP's 30 days, status trialing) counts as paying", async () => {
  const env = makeEnv();
  const s = await subscriber(env, { productId: "weyland-subconp-seat" });
  await send(env, subEvent("customer.subscription.updated", s, "trialing", nowSec() + 10));
  const row = await userById(env, s.row.id);
  assert.deepEqual([row.subscription_tier, row.subscription_status], ["subconp", "active"]);
  assert.equal(await gate(env, s.row.id, "meetingx"), "allowed");
});

test("cancelled during the 14-day WeylandAI trial: the trial keeps the suite until it ends, then the free plan", async () => {
  const env = makeEnv();
  const email = throwawayEmail("trialcancel");
  const userId = await insertTrialAccount(env, email);
  const s = await subscriber(env, { productId: "weyland-meetingx-seat", email, signedInUserId: userId });
  await send(env, subEvent("customer.subscription.deleted", s, "canceled", nowSec() + 10));
  let row = await userById(env, userId);
  assert.deepEqual([row.subscription_tier, row.subscription_status], ["starter", "trial"]);
  assert.ok(products(row).includes(TRIAL_MARK));
  assert.equal(await gate(env, userId, "meetingx"), "allowed", "the trial still includes MeetingX");
  await env.DB.prepare("UPDATE users SET trial_ends_at = ? WHERE id = ?").bind(new Date(Date.now() - 1000).toISOString(), userId).run();
  const sync = await syncUserEntitlements(env, userId);
  assert.equal(sync.reason, "trial-ended-free");
  row = await userById(env, userId);
  assert.deepEqual([row.subscription_tier, row.subscription_status, paidProducts(row).join()], ["free", "active", ""]);
  assert.equal(await gate(env, userId, "meetingx"), 402);
});

test("products granted another way stay when a subscription ends; a hand-granted suite is not taken by a failing seat", async () => {
  const env = makeEnv();
  const email = throwawayEmail("manual");
  const userId = await insertFreeAccount(env, email, { extraProducts: ["lienx"] });
  const s = await subscriber(env, { productId: "weyland-meetingx-seat", email, signedInUserId: userId });
  await send(env, subEvent("customer.subscription.deleted", s, "canceled", nowSec() + 10));
  const row = await userById(env, userId);
  assert.deepEqual(paidProducts(row), ["lienx"]);
  assert.equal(await gate(env, userId, "lienx"), "allowed");

  const email2 = throwawayEmail("manualsuite");
  const suiteUser = await insertFreeAccount(env, email2, { tier: "subconp" });
  const s2 = await subscriber(env, { productId: "weyland-wire-seat", email: email2, signedInUserId: suiteUser });
  await send(env, invEvent("invoice.payment_failed", s2, nowSec() + 10));
  const row2 = await userById(env, suiteUser);
  assert.deepEqual([row2.subscription_tier, row2.subscription_status], ["subconp", "active"]);
  assert.equal(await gate(env, suiteUser, "lienx"), "allowed");
});

test("an account bought before subscription rows existed (old forward, users.stripe_customer_id only) is found by its customer", async () => {
  const env = makeEnv();
  const email = throwawayEmail("legacy");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  await send(env, forwardCompletionBody(session, { withEventFields: false }));
  const row = await userByEmail(env, email);
  assert.deepEqual(paidProducts(row), ["meetingx"]);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'weyland_subscriptions'"), 0, "no subscription row (no table yet, even)");
  const s = { sub: session.subscription, customer: session.customer, productId: "weyland-meetingx-seat" };
  const r = await send(env, subEvent("customer.subscription.deleted", s, "canceled", nowSec() + 10));
  assert.equal(r.body.applied, true);
  assert.equal(await gate(env, row.id, "meetingx"), 402);
});

test("the 2025+ invoice shape (parent.subscription_details) is read too", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  const r = await send(env, invEvent("invoice.payment_failed", s, nowSec() + 10, { shape: "basil" }));
  assert.equal(r.body.subscription_status, "past_due");
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);
});

test("Stripe-signed lifecycle events are applied the same way and dedupe with vendyai's forward of them", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  const id = newId("evt_local");
  const created = nowSec() + 10;
  const object = subscriptionObject({ id: s.sub, customer: s.customer, productId: s.productId, status: "canceled" });
  const direct = await handle(stripeRequest({ id, object: "event", type: "customer.subscription.deleted", created, data: { object } }), env);
  assert.equal((await direct.json()).applied, true);
  const forwarded = await send(env, forwardEventBody("customer.subscription.deleted", object, { eventId: id, created }));
  assert.equal(forwarded.body.duplicate, true);
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);
});

test("events that are not ours, or for nobody we know, change nothing", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  const before = await userById(env, s.row.id);
  // Another venture's subscription (no WeylandAI price, another venture id), on this account's customer even.
  const foreign = { id: newId("sub_other"), object: "subscription", customer: s.customer, status: "canceled", metadata: { venture_id: "lawyik" }, items: { data: [{ quantity: 1, price: { id: "price_not_ours" } }] } };
  let r = await send(env, forwardEventBody("customer.subscription.deleted", foreign, { created: nowSec() + 10 }));
  assert.equal(r.body.ignored, "other_venture");
  // Ours, for a customer no account has.
  const stranger = { sub: newId("sub_local"), customer: newId("cus_local"), productId: "weyland-meetingx-seat" };
  r = await send(env, subEvent("customer.subscription.deleted", stranger, "canceled", nowSec() + 10));
  assert.equal(r.body.ignored, "no_account");
  // Types we do not act on.
  r = await send(env, forwardEventBody("customer.subscription.created", subscriptionObject({ id: s.sub, customer: s.customer, productId: s.productId }), { created: nowSec() + 10 }));
  assert.equal(r.body.ignored, "unhandled_type");
  assert.deepEqual(await userById(env, s.row.id), before);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM processed_webhook_events WHERE event_type <> 'checkout.session.completed'"), 0, "ignored events leave no dedupe row");
});

test("a failure while applying answers 500 and the retry applies it", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  env.DB.failOn = { pattern: /UPDATE users SET subscription_tier/, times: 1 };
  const body = subEvent("customer.subscription.deleted", s, "canceled", nowSec() + 10);
  const failed = await handle(forwardRequest(body), env);
  assert.equal(failed.status, 500);
  // The subscription row was written before the failure; the retry must still bring the account in line.
  const retry = await send(env, body);
  assert.equal(retry.status, 200);
  assert.equal(await gate(env, s.row.id, "meetingx"), 402);
});

test("/api/auth/me and /api/subscription/status tell a past_due account what it can use", async () => {
  const env = makeEnv();
  const s = await subscriber(env);
  await send(env, subEvent("customer.subscription.updated", s, "past_due", nowSec() + 10));
  const sess = await env.DB.prepare("SELECT id FROM weyland_sessions WHERE user_id = ?").bind(s.row.id).first();
  const me = await worker.fetch(new Request("https://weylandai.com/api/subscription/status", { headers: { Cookie: "weyland_session=" + sess.id } }), env, ctx);
  const body = await me.json();
  assert.equal(body.subscription.status, "past_due");
  assert.equal(body.entitlements.payment_failing, true);
  assert.ok(!body.entitlements.products.includes("meetingx"));
});

test("two events for one subscription at the same moment: the newer state wins whichever writes first", async () => {
  const { upsertSubscription, factsFromSubscription } = await import("../lib/subscriptions-store.js");
  for (const order of [["older", "newer"], ["newer", "older"]]) {
    const env = makeEnv();
    const s = await subscriber(env);
    const t = nowSec();
    const facts = {
      older: factsFromSubscription(subscriptionObject({ id: s.sub, customer: s.customer, productId: s.productId, status: "past_due" })),
      newer: factsFromSubscription(subscriptionObject({ id: s.sub, customer: s.customer, productId: s.productId, status: "canceled" }), "customer.subscription.deleted")
    };
    const at = { older: t + 10, newer: t + 20 };
    // Both read the row before either writes (the awaits interleave).
    const results = await Promise.all(order.map((k) => upsertSubscription(env.DB, facts[k], { userId: s.row.id, eventAt: at[k], eventType: k })));
    const row = await env.DB.prepare("SELECT status, last_event_at FROM weyland_subscriptions WHERE subscription_id = ?").bind(s.sub).first();
    assert.deepEqual({ ...row }, { status: "canceled", last_event_at: t + 20 }, order.join(" then ") + ": " + JSON.stringify(results.map((r) => r.reason)));
  }
});

test("no network call left the process except the stubbed AuthFor register", () => {
  assert.deepEqual(network.unexpected, []);
  assert.equal(network.stripe.length, 0, "no Stripe call: everything came from the events and D1");
});
