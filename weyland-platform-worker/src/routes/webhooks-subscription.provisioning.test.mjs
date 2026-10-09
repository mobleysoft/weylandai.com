import test from "node:test";
import assert from "node:assert/strict";
import worker from "../index.js";
import { reconcileCheckout, sweepRecentCheckouts } from "./webhooks-subscription.js";
import { WEYLAND_PRODUCTS } from "../lib/stripe-billing.js";
import { claimHeldPurchases } from "../lib/grants.js";
import { makeEnv, ctx, send, paidSession, forwardCompletionBody, throwawayEmail,
  installNetwork, restoreNetwork, network, count, userByEmail, insertFreeAccount } from "./webhooks-subscription.fixtures.mjs";

const DEADLINE = Date.parse("2026-10-23T00:00:00Z");
const response = (status, body) => new Response(JSON.stringify(body), { status });
const created = () => response(200, { user: { id: "fixture-authfor-user" }, token: "fixture-access", session_id: "fixture-authfor-session" });
const credentials = { AUTHFOR_PROVISION_CLIENT_ID: "fixture-provisioner", AUTHFOR_PROVISION_CLIENT_SECRET: "fixture-secret" };
test.before(installNetwork);
test.after(restoreNetwork);
test.afterEach(() => { network.authforReply = null; });

async function assertPending(env, session) {
  assert.equal(await userByEmail(env, session.customer_details.email), null);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM processed_webhook_events"), 0, "retry remains eligible");
  const purchase = await env.DB.prepare("SELECT status, user_id FROM weyland_purchases WHERE checkout_session_id = ?").bind(session.id).first();
  assert.equal(purchase.status, "pending"); assert.equal(purchase.user_id, null);
  assert.equal(JSON.parse(await env.CACHE.get("checkout_status:" + session.id)).status, "paid_pending");
}

test("current anonymous grace registration creates an AuthFor-backed account", async () => {
  const env = makeEnv(), session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("grace") });
  network.authforReply = body => { assert.equal(Object.hasOwn(body, "client_secret"), false); return created(); };
  const result = await send(env, forwardCompletionBody(session));
  assert.equal(result.status, 200); assert.equal(result.body.provisioned, true);
  const row = await env.DB.prepare("SELECT player_json FROM weyland_sessions").first();
  assert.equal(JSON.parse(row.player_json).authfor_backed, true);
});

test("future deadline 202 retains paid receipt without identity/session/grant, then exact redelivery succeeds once credentials are configured", async () => {
  const realNow = Date.now; Date.now = () => DEADLINE;
  try {
    const env = makeEnv(), session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("cutoff") });
    const body = forwardCompletionBody(session);
    network.authforReply = request => {
      assert.ok(Date.now() >= DEADLINE);
      return request.client_secret === credentials.AUTHFOR_PROVISION_CLIENT_SECRET ? created()
        : response(202, { code: "EMAIL_CODE_REQUIRED", verification_required: true });
    };
    const rejected = await send(env, body);
    assert.equal(rejected.status, 503); assert.equal(rejected.body.reason, "EMAIL_CODE_REQUIRED");
    await assertPending(env, session);
    Object.assign(env, credentials);
    const retried = await send(env, body);
    assert.equal(retried.status, 200); assert.equal(retried.body.provisioned, true);
    const sent = network.authforBodies.at(-1);
    assert.equal(sent.client_id, credentials.AUTHFOR_PROVISION_CLIENT_ID);
    assert.equal(sent.client_secret, credentials.AUTHFOR_PROVISION_CLIENT_SECRET);
    assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 1);
    assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1);
    assert.equal((await send(env, body)).body.duplicate, true);
  } finally { Date.now = realNow; }
});

test("401, upstream 500, missing identity/session and network failure all retain paid receipt for retry", async () => {
  for (const reply of [
    () => response(401, { code: "INVALID_CLIENT" }),
    () => response(500, { error: "upstream" }),
    () => response(200, { token: "t", session_id: "s" }),
    () => response(200, { user: { id: "u" } }),
    () => { throw new Error("fixture network failure"); },
  ]) {
    const env = Object.assign(makeEnv(), credentials), session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("failure") });
    network.authforReply = reply;
    const result = await send(env, forwardCompletionBody(session));
    assert.equal(result.status, 503);
    assert.equal(JSON.stringify(result.body).includes(credentials.AUTHFOR_PROVISION_CLIENT_SECRET), false);
    await assertPending(env, session);
  }
});

test("reconciliation and sweep leave rejected checkouts eligible; a later poll retries despite cached paid_pending", async () => {
  const env = makeEnv(), session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("pollretry") });
  session.status = "complete";
  const stripe = async () => session;
  network.authforReply = () => response(202, { code: "EMAIL_CODE_REQUIRED" });
  const pending = await reconcileCheckout(env, session.id, WEYLAND_PRODUCTS, stripe);
  assert.equal(pending.pending, true); await assertPending(env, session);
  const sweep = await sweepRecentCheckouts(env, WEYLAND_PRODUCTS, { stripe: async () => ({ data: [session], has_more: false }) });
  assert.equal(sweep.granted, 0); await assertPending(env, session);
  network.authforReply = created;
  const fixtureFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => String(input).startsWith("https://api.stripe.com/v1/checkout/sessions/")
    ? response(200, session) : fixtureFetch(input, init);
  try {
    const poll = await worker.fetch(new Request("https://weylandai.com/api/billing/checkout/status/" + session.id), env, ctx);
    const body = await poll.json();
    assert.equal(body.status, "active"); assert.equal(body.signed_in, true);
    assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 1);
  } finally { globalThis.fetch = fixtureFetch; }
});

test("pending buyer who later signs in enters the existing inbox-proof claim path without a local-only session", async () => {
  const env = makeEnv(), email = throwawayEmail("owner-recovery");
  const session = paidSession({ productId: "weyland-meetingx-seat", email });
  const body = forwardCompletionBody(session);
  network.authforReply = () => response(202, { code: "EMAIL_CODE_REQUIRED" });
  await send(env, body); await assertPending(env, session);
  // AuthFor code sign-in/exchange has now made the local account.
  const id = await insertFreeAccount(env, email);
  const replay = await send(env, body);
  assert.equal(replay.body.held, true);
  assert.equal((await env.DB.prepare("SELECT status FROM weyland_purchases WHERE checkout_session_id = ?").bind(session.id).first()).status, "held");
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0);
  const claims = await claimHeldPurchases(env, { id, email }, { emailVerified: true });
  assert.equal(claims.claimed.length, 1);
  assert.equal((await env.DB.prepare("SELECT status FROM weyland_purchases WHERE checkout_session_id = ?").bind(session.id).first()).status, "granted");
});
