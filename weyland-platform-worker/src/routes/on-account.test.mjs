// node --test src/routes/on-account.test.mjs
//
// g052 / g056: the first submittal bought on account (no card, an invoice sent, the purchase held for
// the email) through this Worker's whole fetch handler against SQLite holding production's tables.
// Stripe and AuthFor are answered locally (Stripe as a small stateful stand-in that can be made to
// fail); any other network call fails the test. g056 adds the findings of
// docs/review-2026-10-10-on-account.md: claims by any sign-in method and exact address, Paid after
// invoice.paid, livemode, the D1 row before the invoice is finalized, idempotent POSTs, failure paths.
import test from "node:test";
import assert from "node:assert/strict";

import worker from "../index.js";
import { WEYLAND_OFFER_PRODUCT_ID, WEYLAND_OFFER_PRICE_ID } from "../lib/stripe-billing.js";
import { _resetCatalogMemory } from "../lib/catalog.js";
import { makeEnv, ctx, throwawayEmail, userByEmail, products, insertFreeAccount, gate, send, forwardEventBody, nowSec } from "./webhooks-subscription.fixtures.mjs";
import { TRIAL_MARK } from "../lib/entitlements.js";
import { ensurePurchasesTable } from "../lib/purchases-store.js";

const SECRET = "operator-secret-for-tests-0123456789abcdef";
const LIVE_KEY = "sk_live_local_stand_in_not_a_key";

// ── Stripe stand-in: customers, invoices (draft -> open), items; failures on demand ──
const net = { stripe: [], verify: new Map(), unexpected: [] };
const stripe = { invoices: new Map(), seq: 0, fail: {}, livemode: true, onFinalize: null };
function resetStripe() { net.stripe.length = 0; stripe.invoices.clear(); stripe.seq = 0; stripe.fail = {}; stripe.livemode = true; stripe.onFinalize = null; }
let realFetch = null;
test.before(() => {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.stripe.com/v1/")) {
      const path = url.slice("https://api.stripe.com/v1".length);
      const method = init.method || "GET";
      const form = new URLSearchParams(init.body || "");
      const idem = (init.headers && init.headers["Idempotency-Key"]) || null;
      net.stripe.push({ method, path, form, idem });
      const fail = stripe.fail[method + " " + path.replace(/in_[A-Za-z0-9_]+/, "{id}")];
      if (fail) return Response.json({ error: { message: "stand-in failure: " + fail } }, { status: 500 });
      const pm = path.match(/^\/prices\/([^?]+)/);
      if (pm) {
        const offer = pm[1] === WEYLAND_OFFER_PRICE_ID;
        return Response.json({ id: pm[1], active: true, unit_amount: offer ? 10000 : 4900, currency: "usd", livemode: true, recurring: offer ? null : { interval: "month" }, product: { name: offer ? "WeylandAI First Submittal" : "Plan" } });
      }
      if (path === "/customers") return Response.json({ id: "cus_onacct_1", email: form.get("email"), name: form.get("name"), livemode: stripe.livemode });
      if (method === "POST" && path === "/invoices") {
        const id = "in_onacct_" + (++stripe.seq);
        const inv = { id, status: "draft", customer: form.get("customer"), currency: "usd", amount_due: 0, livemode: stripe.livemode };
        stripe.invoices.set(id, inv);
        return Response.json(inv);
      }
      if (path === "/invoiceitems") { const inv = stripe.invoices.get(form.get("invoice")); if (inv) inv.amount_due = 10000; return Response.json({ id: "ii_" + form.get("invoice"), invoice: form.get("invoice") }); }
      const m = path.match(/^\/invoices\/(in_[A-Za-z0-9_]+)(\/(finalize|send))?$/);
      if (m) {
        const inv = stripe.invoices.get(m[1]);
        if (!inv) return Response.json({ error: { message: "no such invoice" } }, { status: 404 });
        if (method === "DELETE") { stripe.invoices.delete(m[1]); return Response.json({ id: m[1], deleted: true }); }
        if (m[3] === "finalize") { if (stripe.onFinalize) await stripe.onFinalize(inv); inv.status = "open"; inv.number = "WA-000" + stripe.seq; }
        if (m[3] === "send") { inv.sent = true; inv.hosted_invoice_url = "https://invoice.stripe.com/i/test"; inv.due_date = 1760000000; }
        return Response.json(inv);
      }
      return Response.json({ error: { message: "unexpected stripe path " + method + " " + path } }, { status: 400 });
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

let ipSeq = 0;
const post = (env, path, body, headers = {}) => worker.fetch(new Request("https://weylandai.com" + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body || {}) }), env, ctx);
const ask = (env, body, secret = SECRET, ip = "203.0.113." + (++ipSeq % 250)) => post(env, "/api/billing/on-account", body, { "CF-Connecting-IP": ip, ...(secret == null ? {} : { "X-WeylandAI-Operator-Secret": secret }) });
const envWith = (extra = {}) => {
  _resetCatalogMemory();
  resetStripe();
  const env = makeEnv();
  env.DB.raw.exec("CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, email TEXT, name TEXT, mhs_id TEXT, created_at TEXT, updated_at TEXT)");
  return Object.assign(env, { WEYLAND_OPERATOR_SECRET: SECRET, STRIPE_SECRET_KEY: LIVE_KEY }, extra);
};
const order = (email) => ({ email, product_id: WEYLAND_OFFER_PRODUCT_ID, customer_name: "Mobley Contracting", terms_accepted_at: "2026-10-09T23:03:00-04:00" });
const rows = (env, email) => env.DB.prepare("SELECT checkout_session_id AS id, status, user_id, claim_method, paid_at FROM weyland_purchases WHERE email = ? ORDER BY purchased_at").bind(email.toLowerCase()).all().then((r) => r.results.map((x) => ({ ...x })));
const calls = (method, re) => net.stripe.filter((c) => c.method === method && re.test(c.path));
async function signIn(env, token, claims) {
  net.verify.set(token, claims);
  return (await post(env, "/api/auth/session", { token })).json();
}
const me = async (env, sessionId) => (await worker.fetch(new Request("https://weylandai.com/api/auth/me", { headers: { Cookie: "weyland_session=" + sessionId } }), env, ctx)).json();

test("no operator secret, a short one, a wrong one or none sent: 404 alike (the route's existence is not told); nothing reaches Stripe", async () => {
  const env = envWith({ WEYLAND_OPERATOR_SECRET: undefined });
  assert.equal((await ask(env, order(throwawayEmail("oa-none")))).status, 404);
  const short = envWith({ WEYLAND_OPERATOR_SECRET: "short" });
  assert.equal((await ask(short, order(throwawayEmail("oa-short")), "short")).status, 404, "a secret under 32 characters is no secret");
  const env2 = envWith();
  assert.equal((await ask(env2, order(throwawayEmail("oa-wrong")), "nope")).status, 404);
  assert.equal((await ask(env2, order(throwawayEmail("oa-missing")), null)).status, 404);
  assert.equal(net.stripe.length, 0);
});

test("ten tries a minute from one address: the eleventh is 404 even with the right secret", async () => {
  const env = envWith();
  for (let i = 0; i < 10; i++) await ask(env, order("not-an-email"), "wrong-secret", "198.51.100.7");
  const r = await ask(env, order(throwawayEmail("oa-rl")), SECRET, "198.51.100.7");
  assert.equal(r.status, 404);
  assert.equal(net.stripe.length, 0);
});

test("bad orders are refused before Stripe: email, product, name, terms, days", async () => {
  const env = envWith();
  const e = throwawayEmail("oa-bad");
  for (const [patch, code] of [[{ email: "not-an-email" }, "bad_email"], [{ product_id: "weyland-subx-seat" }, "offer_only"], [{ customer_name: "" }, "customer_name_required"], [{ terms_accepted_at: null }, "terms_required"], [{ days_until_due: 0 }, "bad_days_until_due"], [{ days_until_due: 90 }, "bad_days_until_due"]]) {
    const r = await ask(env, { ...order(e), ...patch });
    assert.equal(r.status, 400, code);
    assert.equal((await r.json()).detail.code, code);
  }
  assert.equal(net.stripe.length, 0);
});

test("only live Stripe: a test key is refused before Stripe; a test-mode invoice is deleted unsent and leaves no row", async () => {
  const env = envWith({ STRIPE_SECRET_KEY: "sk_test_local" });
  const email = throwawayEmail("oa-test-key");
  const r = await ask(env, order(email));
  assert.equal(r.status, 503);
  assert.equal((await r.json()).detail.code, "not_live");
  assert.equal(net.stripe.length, 0);
  const env2 = envWith();
  stripe.livemode = false;
  const r2 = await ask(env2, order(email));
  assert.equal(r2.status, 503);
  assert.equal((await r2.json()).detail.code, "not_live");
  assert.equal(calls("DELETE", /^\/invoices\/in_/).length, 1, "the test-mode draft is deleted");
  assert.equal(calls("POST", /\/(finalize|send)$/).length, 0, "nothing finalized or sent");
  assert.deepEqual(await rows(env2, email), []);
});

test("on account: a send_invoice invoice for the offer's price, no card; the D1 row exists before the invoice is finalized; held for the email", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-mobley");
  const userId = await insertFreeAccount(env, email);
  let atFinalize = null;
  stripe.onFinalize = async (inv) => { atFinalize = { ...(await env.DB.prepare("SELECT status, amount_total FROM weyland_purchases WHERE checkout_session_id = ?").bind(inv.id).first()) }; };
  const r = await ask(env, order(email));
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.deepEqual([b.purchase.id, b.purchase.kind, b.purchase.status, b.purchase.amount_total, b.purchase.email], ["in_onacct_1", "offer", "held", 10000, email.toLowerCase()]);
  assert.deepEqual([b.invoice.status, b.invoice.amount_due, b.invoice.hosted_invoice_url], ["open", 10000, "https://invoice.stripe.com/i/test"]);
  assert.deepEqual(atFinalize, { status: "pending", amount_total: 10000 }, "the purchase is recorded before Stripe finalizes the invoice");

  const inv = calls("POST", /^\/invoices$/)[0];
  assert.equal(inv.form.get("collection_method"), "send_invoice", "invoiced, never charged to a card");
  assert.equal(inv.form.get("days_until_due"), "30");
  assert.equal(inv.form.get("auto_advance"), "false");
  assert.equal(inv.form.get("metadata[on_account]"), "true");
  assert.ok(inv.idem && /^weyland-onacct-[0-9a-f]{32}:invoice$/.test(inv.idem), "the create carries an idempotency key");
  assert.equal(calls("POST", /^\/invoiceitems$/)[0].form.get("pricing[price]"), WEYLAND_OFFER_PRICE_ID);
  assert.equal(calls("POST", /^\/customers$/)[0].form.get("name"), "Mobley Contracting");
  assert.ok(!net.stripe.some((c) => /checkout|payment_intents|charges/.test(c.path)), "no checkout, payment intent or charge");
  assert.equal(await gate(env, userId, "meetingx"), 402, "held: nothing granted before the account signs in");
  const named = await env.DB.prepare("SELECT name, company FROM users WHERE id = ?").bind(userId).first();
  assert.deepEqual({ ...named }, { name: "User Sim", company: "Mobley Contracting" }, "a name of its own is kept; the company is set");

  const signin = await signIn(env, "tok_code_oa", { id: "af_oa", email, name: "Mobley Contracting", email_verified: true, email_verified_at: Date.now() });
  assert.deepEqual(signin.claimed.map((c) => c.session_id), ["in_onacct_1"]);
  const row = await userByEmail(env, email);
  assert.ok(products(row).includes(TRIAL_MARK), "the 30-day window is open");
  assert.equal(row.stripe_customer_id, "cus_onacct_1", "the account view lists the invoice under its customer");
  for (const slug of ["subx", "meetingx", "cutsheetx"]) assert.equal(await gate(env, userId, slug), "allowed", slug);
  const fs = (await me(env, signin.session_id)).entitlements.access.first_submittal;
  assert.deepEqual([fs.on_account, fs.paid_at, fs.amount_total], [true, null, 10000], "the card can say: on account, invoiced");
  const third = await ask(env, order(email));
  assert.equal(third.status, 409);
  assert.equal((await third.json()).detail.code, "offer_used");
  assert.deepEqual(net.unexpected, []);
});

test("a password sign-in by an identity whose inbox was proven earlier claims a held on-account purchase, whatever the address's case or spaces", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-pw");
  const userId = await insertFreeAccount(env, email);
  assert.equal((await ask(env, order("  " + email.toUpperCase() + " "))).status, 201, "the order's address is taken trimmed and in lower case");
  // AuthFor's GET /api/v1/verify answers the identity's persisted email_verified (a code at
  // registration, a reset link, an earlier code sign-in), for a password sign-in as for any other.
  const signin = await signIn(env, "tok_pw_oa", { id: "af_pw", email: email.replace(/^u/, "U"), name: "Owner", email_verified: true, email_verified_at: Date.now() - 86400e3 });
  assert.deepEqual(signin.claimed.map((c) => c.session_id), ["in_onacct_1"]);
  assert.deepEqual((await rows(env, email)).map((r) => [r.status, r.user_id, r.claim_method]), [["granted", userId, "email_verified"]]);
  assert.equal(await gate(env, userId, "meetingx"), "allowed");
});

test("an identity that never proved the inbox (a password without a code, an ephemeral upgrade) claims nothing at the same address", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-unproven");
  const userId = await insertFreeAccount(env, email);
  assert.equal((await ask(env, order(email))).status, 201);
  const pw = await signIn(env, "tok_unproven", { id: "af_unproven", email, name: "Someone", email_verified: false });
  assert.equal((pw.claimed || []).length, 0, "no claim without a proven inbox");
  assert.deepEqual((await rows(env, email)).map((r) => [r.status, r.user_id]), [["held", null]]);
  assert.equal(await gate(env, userId, "meetingx"), 402);
  const proven = await signIn(env, "tok_proven", { id: "af_unproven", email, name: "Owner", email_verified: true, email_verified_at: Date.now() });
  assert.deepEqual(proven.claimed.map((c) => c.session_id), ["in_onacct_1"], "the same identity takes it once it proves the inbox");
});

test("a plus-addressed order is claimed only by the exact plus address: not by the base address, even with a code", async () => {
  const env = envWith();
  const base = throwawayEmail("oa-plus");
  const plus = base.replace("@", "+firm@");
  const baseId = await insertFreeAccount(env, base);
  assert.equal((await ask(env, order(plus))).status, 201);
  const other = await signIn(env, "tok_base", { id: "af_base", email: base, name: "Base", email_verified: true });
  assert.equal((other.claimed || []).length, 0, "the base address does not take the plus address's purchase");
  assert.equal(await gate(env, baseId, "meetingx"), 402);
  const plusId = await insertFreeAccount(env, plus);
  const mine = await signIn(env, "tok_plus", { id: "af_plus", email: plus.toUpperCase(), name: "Firm", email_verified: true });
  assert.deepEqual(mine.claimed.map((c) => c.session_id), ["in_onacct_1"]);
  assert.equal(await gate(env, plusId, "meetingx"), "allowed");
});

test("a card purchase held for an address still needs the emailed code or the paying browser (unchanged)", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-card");
  await insertFreeAccount(env, email);
  await ensurePurchasesTable(env.DB);
  await env.DB.prepare("INSERT INTO weyland_purchases (checkout_session_id, kind, product_id, status, email, purchased_at) VALUES ('cs_test_cardheld0001', 'offer', ?, 'held', ?, ?)").bind(WEYLAND_OFFER_PRODUCT_ID, email, new Date().toISOString()).run();
  const pw = await signIn(env, "tok_card_pw", { id: "af_card", email, name: "Owner", email_verified: false });
  assert.equal((pw.claimed || []).length, 0);
  assert.deepEqual((await rows(env, email)).map((r) => r.status), ["held"]);
});

test("when the invoice is paid, one invoice.paid webhook turns the card from On account to Paid; a redelivery changes nothing", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-paid");
  await insertFreeAccount(env, email);
  await ask(env, order(email));
  const signin = await signIn(env, "tok_paid", { id: "af_paid", email, name: "Owner", email_verified: true });
  assert.equal((await me(env, signin.session_id)).entitlements.access.first_submittal.paid_at, null);
  const paidAt = nowSec() - 60;
  const invoice = { id: "in_onacct_1", object: "invoice", status: "paid", customer: "cus_onacct_1", subscription: null, billing_reason: "manual", amount_paid: 10000, status_transitions: { paid_at: paidAt }, metadata: { venture_id: "weylandai", on_account: "true" }, lines: { data: [] } };
  const first = await send(env, forwardEventBody("invoice.paid", invoice));
  assert.equal(first.status, 200);
  assert.equal(first.body.on_account_paid, "in_onacct_1");
  const fs = (await me(env, signin.session_id)).entitlements.access.first_submittal;
  assert.equal(fs.on_account, true);
  assert.equal(fs.paid_at, new Date(paidAt * 1000).toISOString(), "the card now says Paid, on the day it was paid");
  const again = await send(env, forwardEventBody("invoice.paid", invoice));
  assert.equal(again.status, 200);
  assert.notEqual(again.body.on_account_paid, "in_onacct_1");
  assert.deepEqual((await rows(env, email)).map((r) => r.paid_at), [new Date(paidAt * 1000).toISOString()]);
  // An invoice that is no purchase of ours is left to the subscription path (ignored here).
  const stranger = await send(env, forwardEventBody("invoice.paid", { ...invoice, id: "in_someone_else" }));
  assert.equal(stranger.body.ignored, "no_subscription");
});

test("concurrent on-account POSTs for the same email do not create duplicate invoices or held purchases", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-race");
  const answers = await Promise.all([1, 2, 3, 4].map(() => ask(env, order(email))));
  const statuses = answers.map((r) => r.status).sort();
  assert.equal(statuses.filter((s) => s === 201).length, 1, "one order is created: " + statuses.join(","));
  assert.ok(statuses.every((s) => s === 201 || s === 200 || s === 409), statuses.join(","));
  assert.equal(calls("POST", /^\/invoices$/).length, 1, "one invoice");
  assert.deepEqual((await rows(env, email)).map((r) => [r.id, r.status]), [["in_onacct_1", "held"]]);
  const later = await ask(env, order(email));
  assert.equal(later.status, 200);
  assert.equal((await later.json()).existing, true);
  assert.equal(calls("POST", /^\/invoices$/).length, 1, "still one invoice");
});

test("a D1 failure after the invoice is drafted returns 502 and leaves no stranded invoice in Stripe: nothing is sent", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-d1");
  const prepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = (sql) => (/SET checkout_session_id = \?, status = 'pending'/.test(sql) ? { bind: () => ({ run: async () => { throw new Error("D1 is down"); } }) } : prepare(sql));
  const r = await ask(env, order(email));
  assert.equal(r.status, 502);
  const d = (await r.json()).detail;
  assert.equal(d.sent, false);
  assert.equal(calls("POST", /\/(finalize|send)$/).length, 0, "nothing finalized or sent");
  assert.equal(calls("DELETE", /^\/invoices\/in_onacct_1$/).length, 1, "the draft is deleted");
  assert.equal(stripe.invoices.size, 0);
  env.DB.prepare = prepare;
  assert.deepEqual(await rows(env, email), [], "the reservation is cleared");
  assert.equal((await ask(env, order(email))).status, 201, "the next order goes through");
});

test("sending fails after the record: 502 names the recorded invoice; the next POST for the email finishes it (no second invoice)", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-send");
  stripe.fail["POST /invoices/{id}/send"] = "send refused";
  const r = await ask(env, order(email));
  assert.equal(r.status, 502);
  const d = (await r.json()).detail;
  assert.deepEqual([d.sent, d.recorded], [false, "in_onacct_1"]);
  assert.deepEqual((await rows(env, email)).map((x) => [x.id, x.status]), [["in_onacct_1", "pending"]], "recorded, not yet held (no one can claim an unsent invoice)");
  delete stripe.fail["POST /invoices/{id}/send"];
  const again = await ask(env, order(email));
  assert.equal(again.status, 200);
  const b = await again.json();
  assert.deepEqual([b.finished, b.purchase.status, b.invoice.hosted_invoice_url], [true, "held", "https://invoice.stripe.com/i/test"]);
  assert.equal(calls("POST", /^\/invoices$/).length, 1, "one invoice");
  assert.equal(calls("POST", /\/finalize$/).length, 1, "finalized once (the retry sees it open)");
});

test("a reservation left by a writer that died is cleared after five minutes; a fresh one answers in_progress", async () => {
  const env = envWith();
  const email = throwawayEmail("oa-stale");
  await ensurePurchasesTable(env.DB);
  await env.DB.prepare("INSERT INTO weyland_purchases (checkout_session_id, kind, product_id, status, email, purchased_at, created_at, updated_at) VALUES (?, 'offer', ?, 'reserving', ?, ?, ?, ?)")
    .bind("onacct:" + email + ":" + WEYLAND_OFFER_PRODUCT_ID, WEYLAND_OFFER_PRODUCT_ID, email, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();
  const busy = await ask(env, order(email));
  assert.equal(busy.status, 409);
  assert.equal((await busy.json()).detail.code, "in_progress");
  assert.equal(net.stripe.length, 0);
  const old = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  await env.DB.prepare("UPDATE weyland_purchases SET updated_at = ?, created_at = ?, purchased_at = ? WHERE email = ?").bind(old, old, old, email).run();
  assert.equal((await ask(env, order(email))).status, 201);
  assert.deepEqual((await rows(env, email)).map((x) => [x.id, x.status]), [["in_onacct_1", "held"]]);
});

test("claimHeldPurchases itself: an on-account purchase needs the proven inbox, not just the address", async () => {
  const { claimHeldPurchases } = await import("../lib/grants.js");
  const env = envWith();
  const email = throwawayEmail("oa-grants");
  const userId = await insertFreeAccount(env, email);
  await ask(env, order(email));
  const none = await claimHeldPurchases(env, { id: userId, email }, { emailVerified: false });
  assert.deepEqual([none.claimed.length, none.held], [0, 1]);
  const got = await claimHeldPurchases(env, { id: userId, email }, { emailVerified: true });
  assert.deepEqual(got.claimed.map((c) => c.session_id), ["in_onacct_1"]);
});
