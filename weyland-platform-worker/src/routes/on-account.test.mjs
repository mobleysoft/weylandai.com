// node --test src/routes/on-account.test.mjs
//
// g052: the first submittal bought on account (no card, an invoice sent, the purchase held for the
// email) through this Worker's whole fetch handler against SQLite holding production's tables.
// Stripe and AuthFor are answered locally; any other network call fails the test.
import test from "node:test";
import assert from "node:assert/strict";

import worker from "../index.js";
import { WEYLAND_OFFER_PRODUCT_ID, WEYLAND_OFFER_PRICE_ID } from "../lib/stripe-billing.js";
import { _resetCatalogMemory } from "../lib/catalog.js";
import { makeEnv, ctx, throwawayEmail, userByEmail, products, insertFreeAccount, gate } from "./webhooks-subscription.fixtures.mjs";
import { TRIAL_MARK } from "../lib/entitlements.js";

const SECRET = "operator-secret-for-tests-0123456789abcdef";
const net = { stripe: [], verify: new Map(), unexpected: [] };
let realFetch = null;
test.before(() => {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.stripe.com/v1/")) {
      const path = url.slice("https://api.stripe.com/v1".length);
      const form = new URLSearchParams(init.body || "");
      net.stripe.push({ method: init.method || "GET", path, form });
      const pm = path.match(/^\/prices\/([^?]+)/);
      if (pm) {
        const offer = pm[1] === WEYLAND_OFFER_PRICE_ID;
        return Response.json({ id: pm[1], active: true, unit_amount: offer ? 10000 : 4900, currency: "usd", livemode: true, recurring: offer ? null : { interval: "month" }, product: { name: offer ? "WeylandAI First Submittal" : "Plan" } });
      }
      if (path === "/customers") return Response.json({ id: "cus_onacct_1", email: form.get("email"), name: form.get("name") });
      if (path === "/invoices") return Response.json({ id: "in_onacct_1", status: "draft", customer: form.get("customer"), currency: "usd" });
      if (path === "/invoiceitems") return Response.json({ id: "ii_onacct_1", invoice: form.get("invoice") });
      if (path === "/invoices/in_onacct_1/finalize") return Response.json({ id: "in_onacct_1", status: "open", number: "WA-0001", amount_due: 10000, currency: "usd" });
      if (path === "/invoices/in_onacct_1/send") return Response.json({ id: "in_onacct_1", status: "open", number: "WA-0001", amount_due: 10000, currency: "usd", due_date: 1760000000, hosted_invoice_url: "https://invoice.stripe.com/i/test" });
      return Response.json({ error: { message: "unexpected stripe path " + path } }, { status: 400 });
    }
    if (url === "https://authfor.com/api/v1/verify") {
      const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
      const claims = net.verify.get(auth.replace(/^Bearer\s+/i, ""));
      return claims ? Response.json(claims) : Response.json({ error: "invalid" }, { status: 401 });
    }
    if (url === "https://authfor.com/api/v1/register") return Response.json({ user: { id: "afu_local" }, token: "aft_local", session_id: "afs_local" }, { status: 201 });
    net.unexpected.push(url);
    throw new Error("unexpected network call: " + url);
  };
});
test.after(() => { globalThis.fetch = realFetch; });

const post = (env, path, body, headers = {}) => worker.fetch(new Request("https://weylandai.com" + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body || {}) }), env, ctx);
const ask = (env, body, secret = SECRET) => post(env, "/api/billing/on-account", body, secret == null ? {} : { "X-WeylandAI-Operator-Secret": secret });
const envWith = (extra = {}) => {
  _resetCatalogMemory();
  const env = makeEnv();
  env.DB.raw.exec("CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, email TEXT, name TEXT, mhs_id TEXT, created_at TEXT, updated_at TEXT)");
  return Object.assign(env, { WEYLAND_OPERATOR_SECRET: SECRET }, extra);
};
const order = (email) => ({ email, product_id: WEYLAND_OFFER_PRODUCT_ID, customer_name: "Mobley Contracting", terms_accepted_at: "2026-10-09T23:03:00-04:00" });

test("no operator secret configured: the route does not exist; a wrong secret is refused; nothing reaches Stripe", async () => {
  net.stripe.length = 0;
  const env = envWith({ WEYLAND_OPERATOR_SECRET: undefined });
  assert.equal((await ask(env, order(throwawayEmail("oa-none")))).status, 404);
  const short = envWith({ WEYLAND_OPERATOR_SECRET: "short" });
  assert.equal((await ask(short, order(throwawayEmail("oa-short")), "short")).status, 404, "a secret under 32 characters is no secret");
  const env2 = envWith();
  assert.equal((await ask(env2, order(throwawayEmail("oa-wrong")), "nope")).status, 401);
  assert.equal((await ask(env2, order(throwawayEmail("oa-missing")), null)).status, 401);
  assert.equal(net.stripe.length, 0);
});

test("bad orders are refused before Stripe: email, product, name, terms, days", async () => {
  net.stripe.length = 0;
  const env = envWith();
  const e = throwawayEmail("oa-bad");
  for (const [patch, code] of [[{ email: "not-an-email" }, "bad_email"], [{ product_id: "weyland-subx-seat" }, "offer_only"], [{ customer_name: "" }, "customer_name_required"], [{ terms_accepted_at: null }, "terms_required"], [{ days_until_due: 0 }, "bad_days_until_due"], [{ days_until_due: 90 }, "bad_days_until_due"]]) {
    const r = await ask(env, { ...order(e), ...patch });
    assert.equal(r.status, 400, code);
    assert.equal((await r.json()).detail.code, code);
  }
  assert.equal(net.stripe.length, 0);
});

test("on account: a send_invoice invoice for the offer's price, no card; the purchase held for the email; the account takes it on a proven-email sign-in", async () => {
  net.stripe.length = 0;
  const env = envWith();
  const email = throwawayEmail("oa-mobley");
  const userId = await insertFreeAccount(env, email);
  const r = await ask(env, order(email));
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.deepEqual([b.purchase.id, b.purchase.kind, b.purchase.status, b.purchase.amount_total, b.purchase.email], ["in_onacct_1", "offer", "held", 10000, email.toLowerCase()]);
  assert.deepEqual([b.invoice.status, b.invoice.amount_due, b.invoice.hosted_invoice_url], ["open", 10000, "https://invoice.stripe.com/i/test"]);

  const inv = net.stripe.find((c) => c.path === "/invoices").form;
  assert.equal(inv.get("collection_method"), "send_invoice", "invoiced, never charged to a card");
  assert.equal(inv.get("days_until_due"), "30");
  assert.equal(inv.get("auto_advance"), "false");
  assert.equal(inv.get("metadata[on_account]"), "true");
  assert.equal(net.stripe.find((c) => c.path === "/invoiceitems").form.get("pricing[price]"), WEYLAND_OFFER_PRICE_ID);
  assert.ok(net.stripe.some((c) => c.path === "/invoices/in_onacct_1/finalize") && net.stripe.some((c) => c.path === "/invoices/in_onacct_1/send"));
  assert.equal(net.stripe.find((c) => c.path === "/customers").form.get("name"), "Mobley Contracting");
  assert.ok(!net.stripe.some((c) => /checkout|payment_intents|charges/.test(c.path)), "no checkout, payment intent or charge");

  assert.equal(await gate(env, userId, "meetingx"), 402, "held: nothing granted before the email is proven");
  const named = await env.DB.prepare("SELECT name, company FROM users WHERE id = ?").bind(userId).first();
  assert.deepEqual({ ...named }, { name: "User Sim", company: "Mobley Contracting" }, "a name of its own is kept; the company is set");
  // A second order for the same email answers with the one waiting (no second invoice).
  const again = await ask(env, order(email));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).existing, true);
  assert.equal(net.stripe.filter((c) => c.path === "/invoices").length, 1);

  // The owner signs in with an emailed code: the held purchase becomes the account's offer.
  net.verify.set("tok_code_oa", { id: "af_oa", email, name: "Mobley Contracting", email_verified: true, email_verified_at: Date.now() });
  const signin = await (await post(env, "/api/auth/session", { token: "tok_code_oa" })).json();
  assert.deepEqual(signin.claimed.map((c) => c.session_id), ["in_onacct_1"]);
  const p = await env.DB.prepare("SELECT * FROM weyland_purchases WHERE checkout_session_id = 'in_onacct_1'").first();
  assert.deepEqual([p.status, p.user_id, p.claim_method, p.credits_total, p.customer_id], ["granted", userId, "email_verified", 1, "cus_onacct_1"]);
  const row = await userByEmail(env, email);
  assert.ok(products(row).includes(TRIAL_MARK), "the 30-day window is open");
  assert.equal(row.stripe_customer_id, "cus_onacct_1", "the account view lists the invoice under its customer");
  for (const slug of ["subx", "meetingx", "cutsheetx"]) assert.equal(await gate(env, userId, slug), "allowed", slug);
  const me = await (await worker.fetch(new Request("https://weylandai.com/api/auth/me", { headers: { Cookie: "weyland_session=" + signin.session_id } }), env, ctx)).json();
  assert.equal(me.entitlements.access.first_submittal.on_account, true, "the account card can say: on account, invoiced");
  assert.equal(me.entitlements.access.first_submittal.amount_total, 10000);

  // Bought once: another on-account order for the account is refused.
  const third = await ask(env, order(email));
  assert.equal(third.status, 409);
  assert.equal((await third.json()).detail.code, "offer_used");
  assert.deepEqual(net.unexpected, []);
});

test("ordered before the account exists: the held offer waits; the account's first proven-email sign-in takes it", async () => {
  net.stripe.length = 0;
  const env = envWith();
  const email = throwawayEmail("oa-new");
  const r = await ask(env, order(email));
  assert.equal(r.status, 201);
  assert.equal(await userByEmail(env, email), null);
  assert.equal(net.stripe.find((c) => c.path === "/invoices").form.get("metadata[user_id]"), "");
  const userId = await insertFreeAccount(env, email);
  await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(email.split("@")[0], userId).run();
  assert.equal((await ask(env, order(email))).status, 200, "the waiting order is answered again");
  assert.deepEqual({ ...(await env.DB.prepare("SELECT name, company FROM users WHERE id = ?").bind(userId).first()) }, { name: "Mobley Contracting", company: "Mobley Contracting" }, "an account named after its address takes the customer's name");
  net.verify.set("tok_new_oa", { id: "af_new_oa", email, name: "Mobley Contracting", email_verified: true, email_verified_at: Date.now() });
  const signin = await (await post(env, "/api/auth/session", { token: "tok_new_oa" })).json();
  assert.deepEqual(signin.claimed.map((c) => c.session_id), ["in_onacct_1"]);
  assert.equal(await gate(env, userId, "subx"), "allowed");
});
