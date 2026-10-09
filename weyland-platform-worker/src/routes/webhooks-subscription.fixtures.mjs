// Test kit for the payment webhook tests (test-only; not imported by the Worker).
//
// A real SQLite database (node:sqlite) holding production weyland_db's own
// table definitions behind D1's prepare/bind/first/all/run, a KV stand-in,
// secrets generated per run (never a deployed one), and request builders that
// produce exactly what reaches POST /api/webhooks/subscription in production:
// vendyai's re-signed forward (vendyai.com/src/worker.js) or a Stripe-signed
// event. No network: installNetwork() answers AuthFor's register call and
// Stripe's subscription list locally and fails on anything else.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHmac, randomUUID } from "node:crypto";

import worker from "../index.js";
import * as billing from "../lib/stripe-billing.js";
import { newTrialAccount, GUEST_PRODUCTS, TRIAL_MARK } from "../lib/entitlements.js";
// The gate production runs in a product worker (MeetingX's fork; the others are the same rule).
import { requireProductAccess } from "../../../weyland-meetingx-worker/src/lib/auth.js";

// production weyland_db sqlite_master, read 2026-10-07 (users, weyland_sessions, processed_webhook_events)
export const SCHEMA = [
  "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, name TEXT NOT NULL DEFAULT '', company TEXT, tenant_id TEXT, subscription_tier TEXT DEFAULT 'enterprise', subscription_status TEXT DEFAULT 'active', submittals_used INTEGER DEFAULT 0, submittals_limit INTEGER DEFAULT 999, trial_ends_at TEXT, stripe_customer_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), products_enabled TEXT DEFAULT '')",
  "CREATE TABLE weyland_sessions (id TEXT PRIMARY KEY, user_id TEXT, email TEXT, mhs_id TEXT, player_json TEXT, expires_at TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE processed_webhook_events (event_id TEXT PRIMARY KEY, event_type TEXT, processed_at TEXT NOT NULL DEFAULT (datetime('now')))"
];

export function d1({ failOn = null } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const sql of SCHEMA) db.exec(sql);
  const plain = (r) => (r ? { ...r } : null);
  const shim = {
    raw: db,
    failOn, // { pattern: RegExp, times: n } - throw on matching statements (error-path tests)
    prepare(sql) {
      let args = [];
      const maybeFail = () => {
        if (shim.failOn && shim.failOn.times > 0 && shim.failOn.pattern.test(sql)) {
          shim.failOn.times -= 1;
          throw new Error("D1_ERROR: injected failure for test");
        }
      };
      const stmt = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
        async first(col) { maybeFail(); const r = plain(db.prepare(sql).get(...args)); return r && col ? r[col] : r; },
        async all() { maybeFail(); return { success: true, results: db.prepare(sql).all(...args).map(plain) }; },
        async run() { maybeFail(); const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
        _runSync() { maybeFail(); const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; }
      };
      return stmt;
    },
    // D1 batch: the statements run in one transaction; any failure rolls all of them back.
    async batch(stmts) {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => s._runSync());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
  };
  return shim;
}

export function kv() {
  const m = new Map();
  return {
    map: m,
    async get(k, type) { if (!m.has(k)) return null; const v = m.get(k); return type === "json" ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); }
  };
}

// ── secrets generated here, for this run only ──
export const FORWARD_SECRET = randomBytes(32).toString("hex");
export const STRIPE_SECRET = "whsec_local_" + randomBytes(24).toString("hex");

export const signForward = (body, ts, secret = FORWARD_SECRET) => createHmac("sha256", secret).update(ts + "." + body).digest("base64url");
export const signStripe = (body, ts, secret = STRIPE_SECRET) => "t=" + ts + ",v1=" + createHmac("sha256", secret).update(ts + "." + body).digest("hex");
export const nowSec = () => Math.floor(Date.now() / 1000);

export const PRICE = Object.fromEntries(Object.entries(billing.WEYLAND_PRODUCTS).map(([id, p]) => [id, p.priceId]));
export const throwawayEmail = (tag) => "user-sim-pay-" + tag + "-" + randomUUID().slice(0, 8) + "@example.com";
export const newId = (prefix) => prefix + randomUUID().replace(/-/g, "").slice(0, 20);

export function makeEnv(opts = {}) {
  return {
    DB: d1(opts),
    CACHE: kv(),
    SUBSCRIPTION_WEBHOOK_SECRET: FORWARD_SECRET,
    STRIPE_WEBHOOK_SECRET: STRIPE_SECRET,
    STRIPE_SECRET_KEY: "local-test-key-not-a-stripe-key"
  };
}
// No waitUntil: the Worker's traffic-driven background jobs (WireX ingest,
// entitlements sweep - lib/job-lease.js) stay off in these tests; they would fetch feeds.
export const ctx = {};
export const handle = (req, env) => worker.fetch(req, env, ctx);

// ── Stripe objects as Stripe reports them (API 2024-11-20.acacia, the account default) ──

// A Checkout Session once paid: embedded (POST /api/billing/checkout/embedded) or
// hosted (vendyai POST /api/checkout/sessions via /api/billing/checkout/create).
export function paidSession({ productId, seats = 1, email, customer = newId("cus_local"), subscription = newId("sub_local"), signedInUserId = null, amount = 0, ui = "embedded" }) {
  const metadata = ui === "embedded"
    ? { venture_id: "weylandai", product_id: productId, seats: String(seats), ui: "embedded", start_path: "/" }
    : { product_id: productId, seats: String(seats), start_path: "/pricing", venture_id: "weylandai" };
  return {
    id: newId("cs_test_local"),
    object: "checkout.session",
    mode: "subscription",
    status: "complete",
    payment_status: amount ? "paid" : "no_payment_required",
    client_reference_id: signedInUserId,
    customer,
    subscription,
    customer_email: signedInUserId ? email : null,
    customer_details: { email, name: "User Sim Buyer" },
    amount_total: amount,
    currency: "usd",
    metadata
  };
}

export function subscriptionObject({ id, customer, productId, status = "active", quantity = 1, metadata = { venture_id: "weylandai" } }) {
  return {
    id, object: "subscription", customer, status,
    cancel_at_period_end: false,
    metadata,
    items: { object: "list", data: [{ id: newId("si_local"), object: "subscription_item", quantity, price: { id: PRICE[productId], object: "price" } }] }
  };
}

export function invoiceObject({ subscription, customer, productId, billingReason = "subscription_cycle", shape = "acacia", metadata = { venture_id: "weylandai" } }) {
  const line = { id: newId("il_local"), object: "line_item", type: "subscription", subscription, quantity: 1, price: { id: PRICE[productId] } };
  const inv = { id: newId("in_local"), object: "invoice", customer, billing_reason: billingReason, lines: { object: "list", data: [line] } };
  if (shape === "basil") {
    inv.parent = { type: "subscription_details", subscription_details: { subscription, metadata } };
    delete line.price; delete line.subscription; delete line.type;
    line.pricing = { type: "price_details", price_details: { price: PRICE[productId], product: "prod_x" } };
    line.parent = { type: "subscription_item_details", subscription_item_details: { subscription } };
  } else {
    inv.subscription = subscription;
    inv.subscription_details = { metadata };
  }
  return inv;
}

// ── what vendyai forwards (vendyai.com/src/worker.js) ──

// Checkout completion, v1 body. withEventFields=false is the shape vendyai sent before 2026-10-07.
export function forwardCompletionBody(session, { eventId = newId("evt_local"), created = nowSec(), withEventFields = true } = {}) {
  const data = {
    id: session.id, mode: session.mode, metadata: session.metadata, customer: session.customer,
    customer_details: session.customer_details || null, amount_total: session.amount_total, currency: session.currency,
    stripe_fee_cents: null, net_to_venture_cents: null
  };
  if (!withEventFields) return JSON.stringify({ type: "checkout.session.completed", data });
  data.subscription = session.subscription || null;
  data.client_reference_id = session.client_reference_id || null;
  data.customer_email = session.customer_email || null;
  return JSON.stringify({ id: eventId, type: "checkout.session.completed", created, data });
}

// Lifecycle events: vendyai forwards the Stripe object as data, with the event id and time.
export function forwardEventBody(type, object, { eventId = newId("evt_local"), created = nowSec() } = {}) {
  return JSON.stringify({ id: eventId, type, created, data: object });
}

export function forwardRequest(body, { ts = nowSec(), secret = FORWARD_SECRET, tamper = false } = {}) {
  return new Request("https://weylandai.com/api/webhooks/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": signForward(body, ts, secret), "X-Webhook-Timestamp": String(ts) },
    body: tamper ? body.replace("user-sim-pay", "user-sim-pwn") : body
  });
}

export function stripeRequest(event, { ts = nowSec() } = {}) {
  const body = JSON.stringify(event);
  return new Request("https://weylandai.com/api/webhooks/subscription", {
    method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signStripe(body, ts) }, body
  });
}

export const send = async (env, body, opts) => {
  const res = await handle(forwardRequest(body, opts), env);
  return { status: res.status, body: await res.json() };
};

// ── network: AuthFor register and Stripe's subscription list answered here, nothing else ──
export const network = { authforRegister: [], authforBodies: [], authforReply: null, stripe: [], stripeSubscriptions: new Map(), unexpected: [] };
let realFetch = null;
export function installNetwork() {
  realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://authfor.com/api/v1/register") {
      const body = JSON.parse(init.body);
      network.authforRegister.push(body.email);
      network.authforBodies.push(body);
      if (network.authforReply) return network.authforReply(body);
      return new Response(JSON.stringify({ user: { id: "afu_local" }, token: "aft_local", session_id: "afs_local_" + network.authforRegister.length, refresh_token: "afr_local" }), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    const m = url.match(/^https:\/\/api\.stripe\.com\/v1\/subscriptions\?customer=([^&]+)/);
    if (m) {
      network.stripe.push(url);
      const items = network.stripeSubscriptions.get(decodeURIComponent(m[1])) || [];
      return new Response(JSON.stringify({ object: "list", data: items }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    network.unexpected.push(url);
    throw new Error("unexpected network call in a webhook test: " + url);
  };
}
export function restoreNetwork() { if (realFetch) globalThis.fetch = realFetch; }

// ── database helpers ──
export const userByEmail = (env, email) => env.DB.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").bind(email).first();
export const userById = (env, id) => env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
export const products = (row) => String(row?.products_enabled || "").split(",").filter(Boolean).sort();
export const paidProducts = (row) => products(row).filter((p) => !GUEST_PRODUCTS.includes(p) && p !== TRIAL_MARK);
export const count = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).first("n"));

export async function insertTrialAccount(env, email) {
  const t = newTrialAccount();
  const id = randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, email, "User Sim", t.subscription_tier, t.subscription_status, t.products_enabled, t.submittals_limit, t.trial_ends_at).run();
  return id;
}

export async function insertFreeAccount(env, email, { extraProducts = [], tier = "free" } = {}) {
  const id = randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit, trial_ends_at) VALUES (?, ?, ?, ?, 'active', ?, 999, ?)")
    .bind(id, email, "User Sim", tier, [...GUEST_PRODUCTS, ...extraProducts].join(","), new Date(Date.now() - 86400e3).toISOString()).run();
  return id;
}

// What every product worker's requireProductAccess answers for a signed-in account.
export async function gate(env, userId, slug) {
  const r = await requireProductAccess({ userId }, env, slug);
  return r === null ? "allowed" : r.status;
}

export const summary = (row) => ({
  tier: row.subscription_tier,
  status: row.subscription_status,
  paid_products: paidProducts(row),
  guest_floor: GUEST_PRODUCTS.every((g) => products(row).includes(g)),
  trial_mark: products(row).includes(TRIAL_MARK),
  submittals_limit: row.submittals_limit,
  submittals_used: row.submittals_used
});
