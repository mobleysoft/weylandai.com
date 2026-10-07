// node --test src/routes/offer.test.mjs
//
// The $100 first-submittal offer (John, 2026-10-07): bought in Checkout's
// payment mode, granted by the payment webhook for 30 days of every product,
// the first-submittal credit recorded, applied once, prompted from day 23,
// ended on day 30 to the free tools with the account kept - and purchase-claim
// protection: a signed-out purchase whose email belongs to an existing account
// waits until that email is proven or that account signs in on the paying
// browser. Every request goes through this Worker's whole fetch handler against
// SQLite holding production's table definitions; AuthFor and Stripe are answered
// locally and any other network call fails the test.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import worker from "../index.js";
import { TRIAL_MARK, GUEST_PRODUCTS, describeAccess } from "../lib/entitlements.js";
import { WEYLAND_OFFER_PRODUCT_ID } from "../lib/stripe-billing.js";
import { DEFAULT_TERMS_URL } from "../lib/legal.js";
import {
  makeEnv, ctx, send, paidSession, forwardCompletionBody, forwardEventBody, stripeRequest, nowSec, newId,
  throwawayEmail, userByEmail, userById, products, count, insertTrialAccount, insertFreeAccount, gate
} from "./webhooks-subscription.fixtures.mjs";

const DAY = 24 * 60 * 60 * 1e3;

// ── network: AuthFor (register, verify) and nothing else ──
const net = { verify: new Map(), unexpected: [], register: [] };
let realFetch = null;
test.before(() => {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://authfor.com/api/v1/register") {
      net.register.push(JSON.parse(init.body).email);
      return new Response(JSON.stringify({ token: "aft_local", session_id: "afs_local_" + net.register.length }), { status: 201 });
    }
    if (url === "https://authfor.com/api/v1/verify") {
      const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
      const claims = net.verify.get(auth.replace(/^Bearer\s+/i, ""));
      return claims ? new Response(JSON.stringify(claims), { status: 200 }) : new Response(JSON.stringify({ error: "invalid" }), { status: 401 });
    }
    net.unexpected.push(url);
    throw new Error("unexpected network call in an offer test: " + url);
  };
});
test.after(() => { globalThis.fetch = realFetch; });

function withNodes(env) {
  env.DB.raw.exec("CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, email TEXT, name TEXT, mhs_id TEXT, created_at TEXT, updated_at TEXT)");
  return env;
}

function offerSession({ email, signedInUserId = null, customer = newId("cus_local"), paymentStatus = "paid" }) {
  return {
    id: newId("cs_test_local"), object: "checkout.session", mode: "payment", status: "complete", payment_status: paymentStatus,
    client_reference_id: signedInUserId, customer, subscription: null, payment_intent: newId("pi_local"),
    customer_email: signedInUserId ? email : null, customer_details: { email, name: "User Sim Buyer" },
    amount_total: 10000, currency: "usd",
    metadata: { venture_id: "weylandai", product_id: WEYLAND_OFFER_PRODUCT_ID, seats: "1", ui: "embedded", start_path: "/", terms_url: DEFAULT_TERMS_URL, terms_accepted_at: new Date().toISOString() }
  };
}

const get = (env, path, headers = {}) => worker.fetch(new Request("https://weylandai.com" + path, { headers }), env, ctx);
const post = (env, path, body, headers = {}) => worker.fetch(new Request("https://weylandai.com" + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body || {}) }), env, ctx);
const poll = (env, id, headers = {}) => get(env, "/api/billing/checkout/status/" + id, headers);
const purchase = (env, id) => env.DB.prepare("SELECT * FROM weyland_purchases WHERE checkout_session_id = ?").bind(id).first();
const cookieValue = (res, name) => {
  const all = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("Set-Cookie") || ""];
  for (const c of all) { const m = c.match(new RegExp("(?:^|,\\s*)" + name + "=([^;]*)")); if (m) return m[1]; }
  return null;
};

async function sessionFor(env, userId, email) {
  const id = randomUUID();
  await env.DB.prepare("INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at) VALUES (?, ?, ?, '{}', ?)")
    .bind(id, userId, email, new Date(Date.now() + DAY).toISOString()).run();
  return "weyland_session=" + id;
}

test("new buyer, signed out: the offer makes the account, opens every product for 30 days, records the credit, signs the paying browser in", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-new");
  const session = offerSession({ email });
  const t0 = Date.now();
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.status, 200);
  assert.equal(r.body.account, "created");
  assert.equal(r.body.signed_in, true);
  assert.equal(r.body.entitlements, "offer-window");

  const row = await userByEmail(env, email);
  const end = Date.parse(row.trial_ends_at);
  assert.ok(Math.abs(end - (t0 + 30 * DAY)) < 60e3, "access until now + 30 days");
  assert.equal(row.subscription_status, "trial");
  assert.equal(row.subscription_tier, "starter");
  assert.ok(products(row).includes(TRIAL_MARK));
  assert.equal(row.stripe_customer_id, session.customer);
  for (const slug of ["meetingx", "lienx", "wire", "subx", "cutsheetx"]) assert.equal(await gate(env, row.id, slug), "allowed", slug);

  const p = await purchase(env, session.id);
  assert.deepEqual({ kind: p.kind, status: p.status, user: p.user_id === row.id, amount: p.amount_total, credits: p.credits_total, used: p.credits_used, terms: p.terms_url, method: p.claim_method },
    { kind: "offer", status: "granted", user: true, amount: 10000, credits: 1, used: 0, terms: DEFAULT_TERMS_URL, method: "created" });
  assert.ok(p.terms_accepted_at, "the Terms acceptance is stored with the purchase");

  const s = await poll(env, session.id);
  const sb = await s.json();
  assert.equal(sb.status, "active");
  assert.equal(sb.signed_in, true);
  assert.equal(sb.product_id, WEYLAND_OFFER_PRODUCT_ID);
  assert.equal(sb.access_ends_at, row.trial_ends_at);
  const cookie = cookieValue(s, "weyland_session");
  assert.ok(cookie, "session cookie handed to the paying browser");

  const me = await (await get(env, "/api/auth/me", { Cookie: "weyland_session=" + cookie })).json();
  const a = me.entitlements.access;
  assert.equal(a.kind, "offer");
  assert.equal(a.days_left, 30);
  assert.equal(a.prompt_for_plan, false);
  assert.equal(a.ends_at, new Date(end).toISOString());
  assert.equal(Date.parse(a.prompt_from), end - 7 * DAY);
  assert.deepEqual(a.first_submittal.credit, { total: 1, used: 0, remaining: 1 });
  assert.equal(a.first_submittal.amount_total, 10000);
  assert.equal(a.held_purchases, 0);
  assert.equal(me.entitlements.suite, true);
  const st = await (await get(env, "/api/subscription/status", { Cookie: "weyland_session=" + cookie })).json();
  assert.deepEqual(st.access, a, "/api/subscription/status reports the same access");
});

test("applied once: the same event again, vendyai's and Stripe's copies, change nothing", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-replay");
  const session = offerSession({ email });
  const evt = newId("evt_local");
  const body = forwardCompletionBody(session, { eventId: evt });
  await send(env, body);
  const first = await userByEmail(env, email);
  const again = await send(env, body);
  assert.equal(again.body.duplicate, true);
  const stripeCopy = await worker.fetch(stripeRequest({ id: evt, type: "checkout.session.completed", created: nowSec(), data: { object: session } }), env, ctx);
  assert.equal((await stripeCopy.json()).duplicate, true);
  const after = await userByEmail(env, email);
  assert.equal(after.trial_ends_at, first.trial_ends_at, "the 30 days are not moved by a replay");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_purchases"), 1);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 1);
});

test("a signed-in account in its 14-day trial buys the offer: 30 days from now, not 14; once per account after that (409)", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-trial");
  const userId = await insertTrialAccount(env, email);
  const session = offerSession({ email, signedInUserId: userId });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.body.account, "signed_in_buyer");
  const row = await userById(env, userId);
  assert.ok(Date.parse(row.trial_ends_at) > Date.now() + 29 * DAY);
  const cookie = await sessionFor(env, userId, email);
  env.STRIPE_PUBLISHABLE_KEY = "pk_test_dummy";
  const again = await post(env, "/api/billing/checkout/embedded", { product_id: WEYLAND_OFFER_PRODUCT_ID, terms_accepted: true }, { Cookie: cookie });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).detail.code, "offer_used");
});

test("day 23 prompts for a plan, day 22 does not; the access block counts days up", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const row = (endMs) => ({ id: "u", subscription_tier: "starter", subscription_status: "trial", products_enabled: TRIAL_MARK, trial_ends_at: new Date(endMs).toISOString() });
  const purchases = (endMs) => [{ kind: "offer", status: "granted", granted_at: new Date(endMs - 30 * DAY).toISOString(), access_ends_at: new Date(endMs).toISOString(), credits_total: 1, credits_used: 0 }];
  const at = (daysLeft) => { const end = now + daysLeft * DAY; return describeAccess(row(end), { purchases: purchases(end), nowMs: now }); };
  assert.equal(at(8).prompt_for_plan, false, "day 22 (8 days left)");
  assert.equal(at(7).prompt_for_plan, true, "day 23 (7 days left)");
  assert.equal(at(7).days_left, 7);
  assert.equal(at(0.5).days_left, 1, "the last day counts as one");
  assert.equal(at(0.5).kind, "offer");
  // A paying plan: no prompt, kind subscription.
  const paying = describeAccess(row(now + 3 * DAY), { purchases: purchases(now + 3 * DAY), subscriptions: [{ status: "active", tiers: "huntx", suite: 0, seats: 1 }], nowMs: now });
  assert.equal(paying.kind, "subscription");
  assert.equal(paying.prompt_for_plan, false);
  // The 14-day trial is "trial", prompted in its last 7 days too.
  const trial = describeAccess(row(now + 6 * DAY), { purchases: [], nowMs: now });
  assert.deepEqual([trial.kind, trial.prompt_for_plan, trial.first_submittal], ["trial", true, null]);
});

test("day 30 without a plan: the products stop, the free tools stay, the account and its email stay; no Stripe call", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-end");
  const session = offerSession({ email });
  await send(env, forwardCompletionBody(session));
  const row = await userByEmail(env, email);
  // 30 days later.
  const ended = new Date(Date.now() - 60e3).toISOString();
  await env.DB.prepare("UPDATE users SET trial_ends_at = ? WHERE id = ?").bind(ended, row.id).run();
  await env.DB.prepare("UPDATE weyland_purchases SET access_ends_at = ? WHERE checkout_session_id = ?").bind(ended, session.id).run();
  // The product workers stop it by themselves (status trial, end passed)...
  assert.equal(await gate(env, row.id, "meetingx"), 402);
  assert.equal(await gate(env, row.id, "lienx"), 402);
  for (const g of GUEST_PRODUCTS) assert.equal(await gate(env, row.id, g), "allowed", "guest floor " + g);
  // ...and the platform moves the row to the free plan on the next visit.
  const before = net.unexpected.length;
  const cookie = await sessionFor(env, row.id, email);
  const me = await (await get(env, "/api/auth/me", { Cookie: cookie })).json();
  assert.equal(net.unexpected.length, before, "no network call while the visitor waits");
  const after = await userById(env, row.id);
  assert.deepEqual([after.subscription_tier, after.subscription_status, after.email], ["free", "active", email]);
  assert.ok(!products(after).includes(TRIAL_MARK));
  assert.deepEqual(me.entitlements.access.ended, { kind: "offer", at: ended });
  assert.equal(me.entitlements.access.kind, "none");
  assert.equal(me.entitlements.access.first_submittal.credit.remaining, 1, "the credit stays on record");
  assert.equal(await gate(env, row.id, "meetingx"), 402);
  assert.equal(await gate(env, row.id, "cutsheetx"), "allowed");
});

test("signed out with an existing account's email: held; the paying browser signing in to that account gets it", async () => {
  const env = withNodes(makeEnv());
  const email = throwawayEmail("offer-held");
  const userId = await insertFreeAccount(env, email);
  const session = offerSession({ email });
  const r = await send(env, forwardCompletionBody(session));
  assert.equal(r.body.held, true);
  assert.equal(await gate(env, userId, "meetingx"), 402, "nothing granted on the email alone");
  assert.equal((await purchase(env, session.id)).status, "held");
  // The paying browser polls: held, with the claim cookie.
  const s = await poll(env, session.id);
  const sb = await s.json();
  assert.deepEqual([sb.status, sb.signed_in], ["held", false]);
  const claim = cookieValue(s, "weyland_claim");
  assert.equal(claim, session.id);
  // Another person's sign-in in that browser does not take it.
  const other = throwawayEmail("other");
  await insertFreeAccount(env, other);
  net.verify.set("tok_other", { id: "af_other", email: other, name: "Other", email_verified: false });
  const wrong = await post(env, "/api/auth/session", { token: "tok_other" }, { Cookie: "weyland_claim=" + claim });
  assert.equal(wrong.status, 200);
  assert.equal((await wrong.json()).claimed, undefined);
  assert.equal((await purchase(env, session.id)).status, "held");
  // The owner signs in on the paying browser (password, email not proven): the browser's claim is enough.
  net.verify.set("tok_owner", { id: "af_owner", email, name: "Owner", email_verified: false });
  const right = await post(env, "/api/auth/session", { token: "tok_owner" }, { Cookie: "weyland_claim=" + claim });
  const rb = await right.json();
  assert.deepEqual(rb.claimed.map((c) => c.session_id), [session.id]);
  assert.match(String(cookieValue(right, "weyland_claim")), /^$/, "the claim cookie is cleared");
  const p = await purchase(env, session.id);
  assert.deepEqual([p.status, p.user_id, p.claim_method], ["granted", userId, "same_browser"]);
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
  const st = await (await poll(env, session.id)).json();
  assert.equal(st.status, "active");
});

test("held, then the owner signs in with a code in another browser (email proven): granted there; a password sign-in elsewhere is not enough", async () => {
  const env = withNodes(makeEnv());
  const email = throwawayEmail("offer-code");
  const userId = await insertFreeAccount(env, email);
  const session = offerSession({ email });
  await send(env, forwardCompletionBody(session));
  net.verify.set("tok_pw", { id: "af_1", email, name: "Owner", email_verified: false });
  const pw = await post(env, "/api/auth/session", { token: "tok_pw" });
  assert.equal((await pw.json()).claimed, undefined, "a password sign-in without the paying browser's claim does not take it");
  assert.equal((await purchase(env, session.id)).status, "held");
  const pwSession = (await (await post(env, "/api/auth/session", { token: "tok_pw" })).json()).session_id;
  const me1 = await (await get(env, "/api/auth/me", { Cookie: "weyland_session=" + pwSession })).json();
  assert.equal(me1.entitlements.access.held_purchases, 1, "the account view can say a purchase is waiting");
  net.verify.set("tok_code", { id: "af_1", email, name: "Owner", email_verified: true, email_verified_at: Date.now() });
  const code = await post(env, "/api/auth/session", { token: "tok_code" });
  const cb = await code.json();
  assert.deepEqual(cb.claimed.map((c) => c.session_id), [session.id]);
  assert.equal((await purchase(env, session.id)).claim_method, "email_verified");
  assert.equal(await gate(env, userId, "lienx"), "allowed");
});

test("the paying browser already signed in as that email's account (no account id in the checkout): the status poll grants it", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-poll");
  const userId = await insertFreeAccount(env, email);
  const session = offerSession({ email });
  await send(env, forwardCompletionBody(session));
  const cookie = await sessionFor(env, userId, email);
  const s = await (await poll(env, session.id, { Cookie: cookie })).json();
  assert.deepEqual([s.status, s.signed_in, s.claimed], ["active", true, true]);
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
});

test("a held plan purchase cancelled before anyone claims it is recorded; the claim then grants nothing paid", async () => {
  const env = withNodes(makeEnv());
  const email = throwawayEmail("held-sub");
  const userId = await insertFreeAccount(env, email);
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  await send(env, forwardCompletionBody(session));
  const cancel = await send(env, forwardEventBody("customer.subscription.deleted", { id: session.subscription, object: "subscription", customer: session.customer, status: "canceled", metadata: { venture_id: "weylandai" }, items: { data: [{ quantity: 1, price: { id: "price_1UAwDiLWTxUJi5AV3zx4ZMgp" } }] } }));
  assert.equal(cancel.status, 200);
  const sub = await env.DB.prepare("SELECT user_id, status FROM weyland_subscriptions WHERE subscription_id = ?").bind(session.subscription).first();
  assert.deepEqual({ ...sub }, { user_id: "held:" + session.id, status: "canceled" });
  net.verify.set("tok_held", { id: "af_h", email, name: "Owner", email_verified: true });
  const r = await (await post(env, "/api/auth/session", { token: "tok_held" })).json();
  assert.deepEqual(r.claimed.map((c) => c.session_id), [session.id]);
  assert.equal(await gate(env, userId, "meetingx"), 402, "a cancelled subscription grants nothing");
  const moved = await env.DB.prepare("SELECT user_id FROM weyland_subscriptions WHERE subscription_id = ?").bind(session.subscription).first();
  assert.equal(moved.user_id, userId);
});

test("an offer whose payment has not settled, or an offer sold as a subscription, grants nothing", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-unpaid");
  const unpaid = offerSession({ email, paymentStatus: "unpaid" });
  const r1 = await worker.fetch(stripeRequest({ id: newId("evt_local"), type: "checkout.session.completed", created: nowSec(), data: { object: unpaid } }), env, ctx);
  assert.equal((await r1.json()).ignored, "payment_not_settled");
  const wrongMode = offerSession({ email });
  wrongMode.mode = "subscription";
  assert.equal((await send(env, forwardCompletionBody(wrongMode))).body.ignored, "mode_mismatch");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 0);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM processed_webhook_events"), 0);
});

test("an account that pays for a plan and buys the offer: the plan stays, the suite for 30 days on top, no prompt", async () => {
  const env = makeEnv();
  const email = throwawayEmail("offer-plus-plan");
  const userId = await insertFreeAccount(env, email);
  await send(env, forwardCompletionBody(paidSession({ productId: "weyland-huntx-seat", email, signedInUserId: userId })));
  await send(env, forwardCompletionBody(offerSession({ email, signedInUserId: userId })));
  const row = await userById(env, userId);
  assert.equal(row.subscription_status, "active");
  assert.equal(row.subscription_tier, "standalone");
  assert.equal(await gate(env, userId, "meetingx"), "allowed", "the offer's suite");
  const cookie = await sessionFor(env, userId, email);
  const me = await (await get(env, "/api/auth/me", { Cookie: cookie })).json();
  assert.equal(me.entitlements.access.kind, "subscription");
  assert.equal(me.entitlements.access.prompt_for_plan, false);
  assert.ok(me.entitlements.access.first_submittal);
});

test("no network call left the process except the stubbed AuthFor", () => {
  assert.deepEqual(net.unexpected, []);
});
