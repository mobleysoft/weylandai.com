// node --test src/routes/plan.test.mjs
//
// Plan management in the page (2026-10-07): the account's plan, cancel at
// period end and resume, a new card through a SetupIntent made the default,
// invoices and their PDFs proxied by this worker - and only ever for the
// account's own Stripe customers. Stripe is a local stand-in; nothing leaves
// the process.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import worker from "../index.js";
import { WEYLAND_PRODUCTS } from "../lib/stripe-billing.js";
import { _resetCatalogMemory } from "../lib/catalog.js";
import { makeEnv, ctx, throwawayEmail } from "./webhooks-subscription.fixtures.mjs";

const PRICE = (id) => WEYLAND_PRODUCTS[id].priceId;
const MEETINGX_PRICE = PRICE("weyland-meetingx-seat");
const sec = (ms) => Math.floor(ms / 1000);

function stripeWorld() {
  const w = {
    calls: [],
    subscriptions: new Map(), // id -> object
    customers: new Map(),     // id -> { invoice_settings: { default_payment_method } }
    setupIntents: new Map(),
    invoices: new Map(),
    pdfs: new Map()           // url -> bytes
  };
  const sub = (id, customer, { status = "active", price = MEETINGX_PRICE, metadata = { venture_id: "weylandai" } } = {}) => {
    w.subscriptions.set(id, {
      id, object: "subscription", customer, status, currency: "usd", cancel_at_period_end: false, cancel_at: null, canceled_at: null, metadata,
      default_payment_method: null,
      items: { data: [{ id: "si_" + id, quantity: 1, current_period_end: sec(Date.now() + 20 * 86400e3), price: { id: price, unit_amount: 29900, currency: "usd", recurring: { interval: "month" } } }] }
    });
  };
  w.sub = sub;
  const real = globalThis.fetch;
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init.method || "GET").toUpperCase();
    const form = init.body ? new URLSearchParams(init.body) : null;
    w.calls.push({ method, url, form });
    if (w.pdfs.has(url)) return new Response(w.pdfs.get(url), { status: 200, headers: { "Content-Type": "application/pdf" } });
    const u = new URL(url);
    if (u.host !== "api.stripe.com") throw new Error("unexpected network call: " + url);
    const path = u.pathname.replace(/^\/v1/, "");
    let m;
    if ((m = path.match(/^\/prices\/(.+)$/))) {
      const pid = Object.entries(WEYLAND_PRODUCTS).find(([, c]) => c.priceId === m[1])?.[0];
      return json({ id: m[1], active: true, unit_amount: pid === "weyland-subconp-seat" ? 200000 : 29900, currency: "usd", livemode: true, recurring: pid === "weyland-first-submittal" ? null : { interval: "month" }, product: { name: "WeylandAI " + pid } });
    }
    if (path === "/subscriptions" && method === "GET") {
      const c = u.searchParams.get("customer");
      return json({ object: "list", data: [...w.subscriptions.values()].filter((s) => s.customer === c) });
    }
    if ((m = path.match(/^\/subscriptions\/([^/]+)$/)) && method === "POST") {
      const s = w.subscriptions.get(m[1]);
      if (!s) return json({ error: { message: "No such subscription" } }, 404);
      if (form.has("cancel_at_period_end")) {
        s.cancel_at_period_end = form.get("cancel_at_period_end") === "true";
        s.cancel_at = s.cancel_at_period_end ? s.items.data[0].current_period_end : null;
      }
      if (form.has("default_payment_method")) s.default_payment_method = form.get("default_payment_method");
      return json(s);
    }
    if ((m = path.match(/^\/customers\/([^/]+)$/))) {
      const c = w.customers.get(m[1]) || { id: m[1], invoice_settings: { default_payment_method: null } };
      if (method === "POST") { c.invoice_settings.default_payment_method = form.get("invoice_settings[default_payment_method]"); w.customers.set(m[1], c); }
      const pm = c.invoice_settings.default_payment_method;
      return json({ ...c, invoice_settings: { default_payment_method: pm ? { id: pm, card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 } } : null } });
    }
    if (path === "/setup_intents" && method === "POST") {
      const id = "seti_" + randomUUID().replace(/-/g, "").slice(0, 16);
      const si = { id, client_secret: id + "_secret_x", customer: form.get("customer"), status: "requires_payment_method", metadata: { user_id: form.get("metadata[user_id]") }, payment_method: null };
      w.setupIntents.set(id, si);
      return json(si);
    }
    if ((m = path.match(/^\/setup_intents\/([^/]+)$/))) {
      const si = w.setupIntents.get(m[1]);
      if (!si) return json({ error: { message: "No such setupintent" } }, 404);
      return json({ ...si, payment_method: si.payment_method ? { id: si.payment_method, card: { brand: "mastercard", last4: "4444", exp_month: 1, exp_year: 2031 } } : null });
    }
    if (path === "/invoices" && method === "GET") {
      const c = u.searchParams.get("customer");
      return json({ object: "list", data: [...w.invoices.values()].filter((i) => i.customer === c) });
    }
    if ((m = path.match(/^\/invoices\/([^/]+)$/))) {
      const inv = w.invoices.get(m[1]);
      return inv ? json(inv) : json({ error: { message: "No such invoice" } }, 404);
    }
    throw new Error("unexpected Stripe call: " + method + " " + path);
  };
  w.restore = () => { globalThis.fetch = real; };
  return w;
}

async function account(env, { customer = null } = {}) {
  const userId = randomUUID();
  const email = throwawayEmail("plan");
  await env.DB.prepare("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, stripe_customer_id) VALUES (?, ?, 'User Sim', 'standalone', 'active', 'meetingx,subx,takeoffx,cutsheetx,sightx,huntx,propx', ?)")
    .bind(userId, email, customer).run();
  const sid = randomUUID();
  await env.DB.prepare("INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at) VALUES (?, ?, ?, '{}', ?)")
    .bind(sid, userId, email, new Date(Date.now() + 86400e3).toISOString()).run();
  return { userId, email, cookie: "weyland_session=" + sid };
}

const call = (env, cookie, path, { method = "GET", body } = {}) => worker.fetch(new Request("https://weylandai.com" + path, {
  method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body)
}), { ...env, STRIPE_PUBLISHABLE_KEY: "pk_test_dummy" }, ctx);

test.beforeEach(() => _resetCatalogMemory());

test("signed out: every plan route answers 401 and calls nobody", async () => {
  const env = makeEnv();
  const w = stripeWorld();
  try {
    for (const [method, path] of [["GET", "/api/billing/plan"], ["POST", "/api/billing/subscription/cancel"], ["POST", "/api/billing/subscription/resume"], ["POST", "/api/billing/payment-method/setup"], ["POST", "/api/billing/payment-method/default"], ["GET", "/api/billing/invoices"], ["GET", "/api/billing/invoices/in_123/pdf"]]) {
      const r = await call(env, null, path, { method, body: method === "POST" ? {} : undefined });
      assert.equal(r.status, 401, path);
    }
    assert.equal(w.calls.length, 0);
  } finally { w.restore(); }
});

test("GET /api/billing/plan: the account's WeylandAI subscriptions, its card, the plans to choose (SubConP first)", async () => {
  const env = makeEnv();
  const w = stripeWorld();
  try {
    const a = await account(env, { customer: "cus_mine" });
    w.sub("sub_mine", "cus_mine");
    w.sub("sub_other_venture", "cus_mine", { price: "price_not_ours", metadata: { venture_id: "lawyik" } });
    w.sub("sub_old", "cus_mine", { status: "canceled" });
    w.sub("sub_someone_else", "cus_theirs");
    w.customers.set("cus_mine", { id: "cus_mine", invoice_settings: { default_payment_method: "pm_1" } });
    const r = await call(env, a.cookie, "/api/billing/plan");
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.deepEqual(d.subscriptions.map((s) => s.id), ["sub_mine"]);
    assert.equal(d.subscription.product_id, "weyland-meetingx-seat");
    assert.equal(d.subscription.cancel_at_period_end, false);
    assert.match(d.subscription.current_period_end, /^\d{4}-/);
    assert.deepEqual(d.card, { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 });
    assert.equal(d.has_customer, true);
    assert.equal(d.choices[0].product_id, "weyland-subconp-seat");
    assert.ok(!d.choices.some((c) => c.product_id === "weyland-first-submittal"), "the offer is not a plan");
    assert.ok(!d.choices.some((c) => c.product_id === "weyland-marketx-seat"), "not sold");
    assert.equal(d.access.kind, "none", "no subscription rows in D1 for this fixture account");
    assert.equal(d.plan.name, "WeylandAI weyland-meetingx-seat");
  } finally { w.restore(); }
});

test("cancel at period end, then resume; someone else's subscription is never touched", async () => {
  const env = makeEnv();
  const w = stripeWorld();
  try {
    const a = await account(env, { customer: "cus_mine" });
    w.sub("sub_mine", "cus_mine");
    w.sub("sub_theirs", "cus_theirs");
    const c = await call(env, a.cookie, "/api/billing/subscription/cancel", { method: "POST", body: { reason: "too expensive" } });
    assert.equal(c.status, 200);
    const cd = await c.json();
    assert.equal(cd.subscription.id, "sub_mine");
    assert.equal(cd.subscription.cancel_at_period_end, true);
    const post = w.calls.find((x) => x.method === "POST" && /\/subscriptions\/sub_mine/.test(x.url));
    assert.equal(post.form.get("cancel_at_period_end"), "true");
    assert.equal(post.form.get("cancellation_details[comment]"), "too expensive");
    const res = await call(env, a.cookie, "/api/billing/subscription/resume", { method: "POST", body: {} });
    assert.equal((await res.json()).subscription.cancel_at_period_end, false);
    const theirs = await call(env, a.cookie, "/api/billing/subscription/cancel", { method: "POST", body: { subscription_id: "sub_theirs" } });
    assert.equal(theirs.status, 404);
    assert.equal(w.subscriptions.get("sub_theirs").cancel_at_period_end, false);
    w.sub("sub_mine_2", "cus_mine");
    const which = await call(env, a.cookie, "/api/billing/subscription/cancel", { method: "POST", body: {} });
    assert.equal(which.status, 400);
    assert.equal((await which.json()).detail.code, "which_subscription");
  } finally { w.restore(); }
});

test("a new card: SetupIntent for the account's customer (cards only), then default for the customer and its subscriptions", async () => {
  const env = makeEnv();
  const w = stripeWorld();
  try {
    const a = await account(env, { customer: "cus_mine" });
    w.sub("sub_mine", "cus_mine");
    const s = await call(env, a.cookie, "/api/billing/payment-method/setup", { method: "POST", body: {} });
    assert.equal(s.status, 201);
    const sd = await s.json();
    assert.match(sd.client_secret, /^seti_.*_secret_/);
    assert.equal(sd.publishable_key, "pk_test_dummy");
    assert.match(sd.stripe_js, /js\.stripe\.com/);
    const create = w.calls.find((x) => x.method === "POST" && x.url.endsWith("/v1/setup_intents"));
    assert.equal(create.form.get("customer"), "cus_mine");
    assert.equal(create.form.get("usage"), "off_session");
    assert.equal(create.form.get("allowed_payment_method_types[0]"), "card");
    assert.equal(create.form.get("metadata[user_id]"), a.userId);
    // Not confirmed yet.
    const early = await call(env, a.cookie, "/api/billing/payment-method/default", { method: "POST", body: { setup_intent_id: sd.setup_intent_id } });
    assert.equal(early.status, 409);
    // Confirmed in the page (Stripe.js): succeeded with a card.
    Object.assign(w.setupIntents.get(sd.setup_intent_id), { status: "succeeded", payment_method: "pm_new" });
    const d = await call(env, a.cookie, "/api/billing/payment-method/default", { method: "POST", body: { setup_intent_id: sd.setup_intent_id } });
    assert.equal(d.status, 200);
    const dd = await d.json();
    assert.deepEqual(dd.card, { brand: "mastercard", last4: "4444", exp_month: 1, exp_year: 2031 });
    assert.equal(dd.subscriptions_updated, 1);
    assert.equal(w.customers.get("cus_mine").invoice_settings.default_payment_method, "pm_new");
    assert.equal(w.subscriptions.get("sub_mine").default_payment_method, "pm_new");
    // Another account cannot use that SetupIntent.
    const b = await account(env, { customer: "cus_b" });
    const steal = await call(env, b.cookie, "/api/billing/payment-method/default", { method: "POST", body: { setup_intent_id: sd.setup_intent_id } });
    assert.equal(steal.status, 404);
    // An account that never paid has no customer.
    const c = await account(env);
    const none = await call(env, c.cookie, "/api/billing/payment-method/setup", { method: "POST", body: {} });
    assert.equal(none.status, 409);
    assert.equal((await none.json()).detail.code, "no_customer");
  } finally { w.restore(); }
});

test("invoices: the account's, newest first, no drafts; the PDF comes through this worker; another customer's is 404", async () => {
  const env = makeEnv();
  const w = stripeWorld();
  try {
    const a = await account(env, { customer: "cus_mine" });
    const pdfUrl = "https://pay.stripe.com/invoice/acct_x/test_pdf_1/pdf?s=ap";
    w.invoices.set("in_1", { id: "in_1", customer: "cus_mine", number: "ABC-0001", created: sec(Date.now() - 86400e3), total: 10000, amount_paid: 10000, amount_due: 0, currency: "usd", status: "paid", description: "WeylandAI first submittal", invoice_pdf: pdfUrl, lines: { data: [] } });
    w.invoices.set("in_2", { id: "in_2", customer: "cus_mine", number: "ABC-0002", created: sec(Date.now()), total: 29900, amount_paid: 29900, currency: "usd", status: "paid", invoice_pdf: null, lines: { data: [{ description: "MeetingX" }] } });
    w.invoices.set("in_draft", { id: "in_draft", customer: "cus_mine", created: sec(Date.now()), status: "draft", lines: { data: [] } });
    w.invoices.set("in_theirs", { id: "in_theirs", customer: "cus_theirs", status: "paid", invoice_pdf: "https://pay.stripe.com/invoice/other/pdf" });
    w.pdfs.set(pdfUrl, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]));
    const r = await call(env, a.cookie, "/api/billing/invoices");
    const d = await r.json();
    assert.deepEqual(d.invoices.map((i) => i.id), ["in_2", "in_1"]);
    assert.equal(d.invoices[1].pdf_url, "/api/billing/invoices/in_1/pdf");
    assert.equal(d.invoices[0].pdf_url, null);
    assert.equal(d.invoices[0].description, "MeetingX");
    const pdf = await call(env, a.cookie, "/api/billing/invoices/in_1/pdf");
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
    assert.match(pdf.headers.get("Content-Disposition"), /inline; filename="WeylandAI-invoice-ABC-0001\.pdf"/);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).toString("latin1"), "%PDF-");
    assert.equal((await call(env, a.cookie, "/api/billing/invoices/in_theirs/pdf")).status, 404);
    assert.equal((await call(env, a.cookie, "/api/billing/invoices/in_2/pdf")).status, 404, "no PDF yet");
    assert.equal((await call(env, a.cookie, "/api/billing/invoices/not-an-id/pdf")).status, 404);
  } finally { w.restore(); }
});

test("the old Stripe billing portal answers 410 (a stripe.com page is never used)", async () => {
  const env = makeEnv();
  const a = await account(env, { customer: "cus_mine" });
  const r = await call(env, a.cookie, "/api/subscription/portal", { method: "POST", body: {} });
  assert.equal(r.status, 410);
  assert.equal((await r.json()).error, "billing_portal_removed");
});
