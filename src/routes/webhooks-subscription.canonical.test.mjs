import test from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerWebhooksSubscriptionRoutes } from "./webhooks-subscription.js";
import * as monolithBilling from "../lib/stripe-billing.js";
import * as platformBilling from "../../weyland-platform-worker/src/lib/stripe-billing.js";
import { makeEnv, forwardRequest, stripeRequest, paidSession, forwardCompletionBody,
  throwawayEmail, installNetwork, restoreNetwork, network, count, userByEmail, insertFreeAccount } from "../../weyland-platform-worker/src/routes/webhooks-subscription.fixtures.mjs";

test.before(installNetwork); test.after(restoreNetwork);
test.afterEach(() => { network.authforReply = null; });
function router() {
  const r = new NativeRouter();
  const registrations = [];
  const post = r.post.bind(r);
  r.post = (path, handler) => { registrations.push(path); return post(path, handler); };
  registerWebhooksSubscriptionRoutes(r, monolithBilling);
  assert.deepEqual(registrations, ["/api/webhooks/subscription"]);
  return r;
}

test("monolith wrapper keeps the existing route/signature contracts and catalogue grant mappings", async () => {
  for (const [id, product] of Object.entries(monolithBilling.WEYLAND_PRODUCTS)) {
    assert.equal(platformBilling.WEYLAND_PRODUCTS[id].priceId, product.priceId, id);
    assert.equal(platformBilling.WEYLAND_PRODUCTS[id].tier, product.tier, id);
  }
  for (const shape of ["forward", "old-forward", "stripe"]) {
    const env = makeEnv(), session = paidSession({ productId: "weyland-wire-seat", email: throwawayEmail(shape) });
    const req = shape === "stripe"
      ? stripeRequest({ id: "evt-wrapper-" + shape, type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), data: { object: session } })
      : forwardRequest(forwardCompletionBody(session, { withEventFields: shape !== "old-forward" }));
    const response = await router().handle(req, env, {});
    assert.equal(response.status, 200);
    const user = await userByEmail(env, session.customer_details.email);
    assert.equal(user.subscription_tier, "standalone");
    assert.ok(user.products_enabled.split(",").includes("wire"));
    assert.ok(!user.products_enabled.split(",").includes("meetingx"));
    assert.equal((await env.DB.prepare("SELECT status FROM weyland_purchases").first()).status, "granted");
  }
  const env = makeEnv(), session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("tamper") });
  const good = forwardRequest(forwardCompletionBody(session));
  const tampered = new Request(good.url, { method: "POST", headers: good.headers, body: (await good.text()).replace(session.id, "cs_test_tampered") });
  assert.equal((await router().handle(tampered, env, {})).status, 401);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM users"), 0);
});

test("monolith wrapper holds an existing email and cannot approve 202 as an identity; redelivery retries pending receipts", async () => {
  const env = makeEnv(), email = throwawayEmail("existing");
  await insertFreeAccount(env, email);
  const held = paidSession({ productId: "weyland-meetingx-seat", email });
  const r = router();
  const heldResponse = await r.handle(forwardRequest(forwardCompletionBody(held)), env, {});
  assert.equal((await heldResponse.json()).held, true);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 0);
  const session = paidSession({ productId: "weyland-meetingx-seat", email: throwawayEmail("pending") });
  const body = forwardCompletionBody(session);
  network.authforReply = () => new Response(JSON.stringify({ code: "EMAIL_CODE_REQUIRED" }), { status: 202 });
  assert.equal((await r.handle(forwardRequest(body), env, {})).status, 503);
  assert.equal(await userByEmail(env, session.customer_details.email), null);
  assert.equal((await env.DB.prepare("SELECT status FROM weyland_purchases WHERE checkout_session_id = ?").bind(session.id).first()).status, "pending");
  network.authforReply = null;
  assert.equal((await r.handle(forwardRequest(body), env, {})).status, 200);
  assert.equal(await count(env, "SELECT COUNT(*) AS n FROM weyland_sessions"), 1);
});
