// node --test src/routes/webhooks-subscription.activation.test.mjs
//
// Payment activation, proved without a payment (2026-10-07). Each scenario
// builds the exact request POST /api/webhooks/subscription receives in
// production (vendyai's re-signed forward of a paid Checkout Session, embedded
// or hosted; or a Stripe-signed event), signs it with a secret generated for
// this run, runs this Worker's whole fetch handler against SQLite holding
// production's table definitions, and reads back the users row, the
// subscription row, the session hand-off and the product gates.
//
// No network: AuthFor's register call and Stripe's subscription list are
// answered locally; any other call fails the test.
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import worker from "../index.js";
import { syncUserEntitlements, GUEST_PRODUCTS, TRIAL_MARK } from "../lib/entitlements.js";
import {
  makeEnv, ctx, handle, send, paidSession, forwardCompletionBody, forwardRequest, stripeRequest, nowSec, newId,
  throwawayEmail, installNetwork, restoreNetwork, network, userByEmail, userById, products, paidProducts, count,
  insertTrialAccount, insertFreeAccount, gate, summary
} from "./webhooks-subscription.fixtures.mjs";

test.before(installNetwork);
test.after(restoreNetwork);

const poll = (env, sessionId) => worker.fetch(new Request("https://weylandai.com/api/billing/checkout/status/" + sessionId), env, ctx);

test("new buyer, embedded MeetingX seat, forwarded by vendyai -> account created with MeetingX, the paying browser signed in", async () => {
  const env = makeEnv();
  const email = throwawayEmail("new");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.status, 200);
  assert.equal(r.body.received, true);
  assert.equal(r.body.account, "created");
  assert.equal(r.body.signed_in, true);

  const row = await userByEmail(env, email);
  assert.ok(row, "users row created");
  assert.equal(row.email, email);
  assert.deepEqual(summary(row), { tier: "standalone", status: "active", paid_products: ["meetingx"], guest_floor: true, trial_mark: false, submittals_limit: 999, submittals_used: 0 });
  assert.equal(row.stripe_customer_id, session.customer);
  const sub = await env.DB.prepare("SELECT * FROM weyland_subscriptions WHERE subscription_id = ?").bind(session.subscription).first();
  assert.deepEqual({ user: sub.user_id === row.id, status: sub.status, tiers: sub.tiers, suite: sub.suite }, { user: true, status: "active", tiers: "meetingx", suite: 0 });

  // The page polls the checkout status: the session cookie comes back with it.
  const p = await poll(env, session.id);
  assert.deepEqual(await p.json(), { status: "active", quantity: 1, signed_in: true });
  const cookie = (p.headers.get("Set-Cookie") || "").match(/weyland_session=([^;]+)/)?.[1];
  const sess = await env.DB.prepare("SELECT * FROM weyland_sessions WHERE user_id = ?").bind(row.id).first();
  assert.equal(cookie, sess.id);
  assert.equal(JSON.parse(sess.player_json).authfor_backed, true, "backed by the new AuthFor identity");

  // Signed in with it: /api/auth/me reports the plan.
  const me = await worker.fetch(new Request("https://weylandai.com/api/auth/me", { headers: { Cookie: "weyland_session=" + cookie } }), env, ctx);
  assert.equal(me.status, 200);
  const meBody = await me.json();
  assert.equal(meBody.user.email, email);
  assert.equal(meBody.entitlements.plan, "standalone");
  assert.ok(meBody.entitlements.products.includes("meetingx"));

  // The product gates read the row: MeetingX opens, an unpaid product does not, a guest product does.
  assert.equal(await gate(env, row.id, "meetingx"), "allowed");
  assert.equal(await gate(env, row.id, "lienx"), 402);
  assert.equal(await gate(env, row.id, "cutsheetx"), "allowed");
  console.log("[activation] new buyer, embedded MeetingX:", JSON.stringify(summary(row)));
});

test("new buyer, hosted checkout (vendyai session) for HuntX -> account created with HuntX", async () => {
  const env = makeEnv();
  const email = throwawayEmail("hosted");
  const session = paidSession({ productId: "weyland-huntx-seat", email, ui: "hosted", amount: 79900 });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.status, 200);
  const row = await userByEmail(env, email);
  // huntx is also one of the guest products, so it is in the guest floor either way;
  // the subscription row is what records the purchase.
  assert.ok(products(row).includes("huntx"));
  assert.equal(row.subscription_tier, "standalone");
  const sub = await env.DB.prepare("SELECT tiers, status FROM weyland_subscriptions WHERE subscription_id = ?").bind(session.subscription).first();
  assert.deepEqual({ ...sub }, { tiers: "huntx", status: "active" });
  assert.equal(await gate(env, row.id, "meetingx"), 402);
  console.log("[activation] new buyer, hosted HuntX:", JSON.stringify(summary(row)));
});

test("trial account buys the SubConP suite (2 seats) while signed in -> subconp, every product open, the trial grant dropped when it ends", async () => {
  const env = makeEnv();
  const email = throwawayEmail("suite");
  const userId = await insertTrialAccount(env, email);
  const session = paidSession({ productId: "weyland-subconp-seat", seats: 2, email, signedInUserId: userId });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.body.account, "signed_in_buyer");
  const row = await userById(env, userId);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 1, "the same account, not a new row");
  assert.equal(row.subscription_tier, "subconp");
  assert.equal(row.subscription_status, "active");
  assert.equal(row.submittals_limit, 999);
  for (const slug of ["meetingx", "lienx", "wire", "cutsheetx"]) assert.equal(await gate(env, userId, slug), "allowed", slug);
  await env.DB.prepare("UPDATE users SET trial_ends_at = ? WHERE id = ?").bind(new Date(Date.now() - 1000).toISOString(), userId).run();
  const sync = await syncUserEntitlements(env, userId);
  assert.equal(sync.reason, "trial-ended-suite");
  const after = await userById(env, userId);
  assert.equal(after.subscription_tier, "subconp");
  assert.ok(!products(after).includes(TRIAL_MARK));
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
  console.log("[activation] trial -> suite, trial ended:", JSON.stringify(summary(after)));
});

test("trial account buys MeetingX while signed in -> keeps the trial until it ends, then exactly what its subscriptions pay for (no Stripe call)", async () => {
  const env = makeEnv();
  const email = throwawayEmail("trialbuy");
  const userId = await insertTrialAccount(env, email);
  const session = paidSession({ productId: "weyland-meetingx-seat", email, signedInUserId: userId });
  await send(env, forwardCompletionBody(session));
  let row = await userById(env, userId);
  assert.equal(row.subscription_tier, "standalone");
  assert.equal(row.subscription_status, "active");
  assert.ok(products(row).includes("meetingx") && products(row).includes(TRIAL_MARK) && products(row).includes("lienx"), "trial suite kept while the trial is open");
  const stripeCallsBefore = network.stripe.length;
  await env.DB.prepare("UPDATE users SET trial_ends_at = ? WHERE id = ?").bind(new Date(Date.now() - 1000).toISOString(), userId).run();
  const sync = await syncUserEntitlements(env, userId);
  assert.equal(sync.reason, "trial-ended-purchase");
  assert.equal(network.stripe.length, stripeCallsBefore, "answered from the subscription rows, not Stripe");
  row = await userById(env, userId);
  assert.deepEqual(paidProducts(row), ["meetingx"]);
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
  assert.equal(await gate(env, userId, "lienx"), 402);
  console.log("[activation] trial -> MeetingX, trial ended:", JSON.stringify(summary(row)));
});

test("free account buys WireX ($49) while signed in -> standalone with 'wire' only (the monolith's handler granted the whole suite)", async () => {
  const env = makeEnv();
  const email = throwawayEmail("wire");
  const userId = await insertFreeAccount(env, email);
  const session = paidSession({ productId: "weyland-wire-seat", email, signedInUserId: userId, amount: 4900 });
  await send(env, forwardCompletionBody(session));
  const row = await userById(env, userId);
  assert.equal(row.subscription_tier, "standalone");
  assert.deepEqual(paidProducts(row), ["wire"]);
  assert.equal(await gate(env, userId, "meetingx"), 402, "WireX does not open MeetingX");
  console.log("[activation] free -> WireX:", JSON.stringify(summary(row)));
});

test("replay: the same forwarded event twice, the old forward shape of it, and the Stripe-signed original -> applied once", async () => {
  const env = makeEnv();
  const email = throwawayEmail("replay");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const eventId = newId("evt_local");
  const created = nowSec();
  const first = await send(env, forwardCompletionBody(session, { eventId, created }));
  assert.equal(first.body.provisioned, true);
  const before = await userByEmail(env, email);
  const registers = network.authforRegister.length;

  const again = await send(env, forwardCompletionBody(session, { eventId, created }));
  assert.deepEqual(again.body, { received: true, duplicate: true });
  const oldShape = await send(env, forwardCompletionBody(session, { withEventFields: false }));
  assert.deepEqual(oldShape.body, { received: true, duplicate: true }, "vendyai's pre-2026-10-07 body (no event id) is caught by the session id");
  const direct = await handle(stripeRequest({ id: eventId, object: "event", type: "checkout.session.completed", created, data: { object: session } }), env);
  assert.deepEqual(await direct.json(), { received: true, duplicate: true });

  const after = await userByEmail(env, email);
  assert.deepEqual(after, before, "users row unchanged");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1, "one session, not four");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_subscriptions"), 1);
  assert.equal(network.authforRegister.length, registers, "AuthFor not called again");
});

test("a replay after a cancellation does not re-activate", async () => {
  const env = makeEnv();
  const email = throwawayEmail("replaycancel");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const body = forwardCompletionBody(session);
  await send(env, body);
  const { subscriptionObject, forwardEventBody } = await import("./webhooks-subscription.fixtures.mjs");
  await send(env, forwardEventBody("customer.subscription.deleted", subscriptionObject({ id: session.subscription, customer: session.customer, productId: "weyland-meetingx-seat", status: "canceled" }), { created: nowSec() + 5 }));
  const cancelled = await userByEmail(env, email);
  assert.deepEqual(paidProducts(cancelled), []);
  const replay = await send(env, body);
  assert.equal(replay.body.duplicate, true);
  const after = await userByEmail(env, email);
  assert.deepEqual(summary(after), summary(cancelled));
  assert.equal(await gate(env, after.id, "meetingx"), 402);
});

test("letter case: an account stored lower-case and a Stripe email with capitals -> that account gets the purchase, no second account", async () => {
  const env = makeEnv();
  const email = throwawayEmail("case");
  const userId = await insertFreeAccount(env, email);
  const shouted = email.replace("user-sim", "User-Sim").replace("example.com", "Example.COM");
  const session = paidSession({ productId: "weyland-meetingx-seat", email: shouted });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.body.account, "email");
  const rows = (await env.DB.prepare("SELECT id FROM users").all()).results;
  assert.deepEqual(rows.map((x) => x.id), [userId]);
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
});

test("someone else's email: an anonymous checkout that types an existing account's email grants the purchase but signs nobody in", async () => {
  const env = makeEnv();
  const victim = throwawayEmail("owner");
  const userId = await insertFreeAccount(env, victim);
  const session = paidSession({ productId: "weyland-wire-seat", email: victim, amount: 4900 });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.body.signed_in, false);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0, "no session row for the account");
  const p = await poll(env, session.id);
  assert.deepEqual(await p.json(), { status: "active", quantity: 1, signed_in: false });
  assert.equal(p.headers.get("Set-Cookie"), null, "no session cookie handed to the paying browser");
  assert.ok(paidProducts(await userById(env, userId)).includes("wire"), "the purchase is on the account");
});

test("a checkout of another venture, or for a product not in the catalog, or not a subscription -> nothing written", async () => {
  const env = makeEnv();
  const email = throwawayEmail("other");
  const other = paidSession({ productId: "weyland-meetingx-seat", email });
  other.metadata = { venture_id: "lawyik", product_id: "lawyik-pro" };
  const direct = await handle(stripeRequest({ id: newId("evt_local"), type: "checkout.session.completed", created: nowSec(), data: { object: other } }), env);
  assert.deepEqual(await direct.json(), { received: true, ignored: "other_venture" });
  const unknown = paidSession({ productId: "weyland-not-a-product", email });
  assert.equal((await send(env, forwardCompletionBody(unknown))).body.ignored, "unknown_product");
  const oneTime = paidSession({ productId: "weyland-meetingx-seat", email });
  oneTime.mode = "payment";
  assert.equal((await send(env, forwardCompletionBody(oneTime))).body.ignored, "not_a_subscription");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 0);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM processed_webhook_events"), 0, "ignored events leave no dedupe row");
});

test("vendyai's pre-2026-10-07 forward (no event id, no subscription id) still activates", async () => {
  const env = makeEnv();
  const email = throwawayEmail("oldshape");
  const session = paidSession({ productId: "weyland-lienx-seat", email });
  const r = await send(env, forwardCompletionBody(session, { withEventFields: false }));
  assert.equal(r.body.subscription, "unknown-id");
  const row = await userByEmail(env, email);
  assert.deepEqual(paidProducts(row), ["lienx"]);
  assert.equal(row.subscription_tier, "standalone");
  assert.equal(row.submittals_limit, 999);
  assert.ok(GUEST_PRODUCTS.every((g) => products(row).includes(g)));
});

test("signature checks: wrong secret, stale timestamp, tampered body, no header -> 401 and nothing written", async () => {
  const env = makeEnv();
  const session = paidSession({ productId: "weyland-subconp-seat", email: throwawayEmail("sig") });
  const body = forwardCompletionBody(session);
  const cases = [
    ["wrong secret", forwardRequest(body, { secret: randomBytes(32).toString("hex") }), "signature_mismatch"],
    ["stale timestamp", forwardRequest(body, { ts: nowSec() - 301 }), "expired"],
    ["tampered body", forwardRequest(body, { tamper: true }), "signature_mismatch"],
    ["no header", new Request("https://weylandai.com/api/webhooks/subscription", { method: "POST", body }), null]
  ];
  for (const [label, req, reason] of cases) {
    const res = await handle(req, env);
    assert.equal(res.status, 401, label);
    if (reason) assert.equal((await res.json()).reason, reason, label);
  }
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 0);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0);
});

test("a database failure mid-way answers 500 and leaves no dedupe row, so the retry activates", async () => {
  const env = makeEnv({ failOn: { pattern: /INSERT INTO weyland_sessions/, times: 1 } });
  const email = throwawayEmail("retry");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const body = forwardCompletionBody(session);
  const failed = await handle(forwardRequest(body), env);
  assert.equal(failed.status, 500);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM processed_webhook_events"), 0);
  const retry = await send(env, body);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.provisioned, true);
  const row = await userByEmail(env, email);
  assert.deepEqual(paidProducts(row), ["meetingx"]);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1);
});

test("a failure after the account was made: the retry recognises the account this checkout created and still signs the buyer in", async () => {
  const env = makeEnv({ failOn: { pattern: /INSERT OR IGNORE INTO weyland_subscriptions/, times: 1 } });
  const email = throwawayEmail("retry2");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const body = forwardCompletionBody(session);
  assert.equal((await handle(forwardRequest(body), env)).status, 500);
  const registers = network.authforRegister.length;
  const retry = await send(env, body);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.account, "created");
  assert.equal(retry.body.signed_in, true);
  assert.equal(network.authforRegister.length, registers, "AuthFor not called twice");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 1);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1, "the first attempt's session is reused");
  const p = await poll(env, session.id);
  assert.equal((await p.json()).signed_in, true);
  assert.deepEqual(paidProducts(await userByEmail(env, email)), ["meetingx"]);
});

test("no network call left the process except the stubbed AuthFor register", () => {
  assert.deepEqual(network.unexpected, []);
  assert.ok(network.authforRegister.length >= 1);
  assert.ok(network.authforRegister.every((e) => /^user-sim-pay-/.test(e)), "only throwaway emails, lower-cased");
});
