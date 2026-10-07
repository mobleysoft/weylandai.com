// weyland-platform-worker/src/lib/subscriptions-store.js
//
// One row per Stripe subscription that pays for WeylandAI products
// (2026-10-07). The users row (subscription_tier / products_enabled /
// subscription_status) is what every product worker's requireProductAccess
// reads; this table is where it comes from: what each of the account's
// subscriptions pays for and whether it is still being paid.
//
// Why a table, not just users.stripe_customer_id: every checkout that is not
// given an existing customer makes a new Stripe customer, so an account that
// buys MeetingX and later WireX has two subscriptions under two customers, and
// a cancellation of one must remove only what that one paid for. Rows are
// keyed by the subscription id and carry the time of the last Stripe event
// applied, so a late or replayed event never overwrites a newer state.
//
// No outbound call: everything here is D1 and the catalog in stripe-billing.js.

import { WEYLAND_PRODUCTS } from "./stripe-billing.js";

export const SUBSCRIPTIONS_DDL = [
  `CREATE TABLE IF NOT EXISTS weyland_subscriptions (
    subscription_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    customer_id TEXT,
    status TEXT NOT NULL,
    product_ids TEXT NOT NULL DEFAULT '',
    tiers TEXT NOT NULL DEFAULT '',
    suite INTEGER NOT NULL DEFAULT 0,
    seats INTEGER NOT NULL DEFAULT 1,
    last_event_at INTEGER NOT NULL DEFAULT 0,
    last_event_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  "CREATE INDEX IF NOT EXISTS idx_weyland_subscriptions_user ON weyland_subscriptions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_weyland_subscriptions_customer ON weyland_subscriptions(customer_id)"
];

// Stripe subscription statuses, as WeylandAI treats them.
export const PAYING_STATUSES = new Set(["active", "trialing"]);
// Payment failed and Stripe is still retrying (or gave up without cancelling):
// the products are withheld until it is paid, the account shows past_due.
export const FAILING_STATUSES = new Set(["past_due", "unpaid"]);
// A subscription in one of these never comes back (a renewal is a new id).
export const FINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

const ensured = new WeakSet();
export async function ensureSubscriptionsTable(db) {
  if (!db || ensured.has(db)) return;
  for (const sql of SUBSCRIPTIONS_DDL) await db.prepare(sql).run();
  ensured.add(db);
}

const BY_PRICE = new Map(Object.entries(WEYLAND_PRODUCTS).map(([productId, cfg]) => [cfg.priceId, { productId, tier: cfg.tier }]));

/** { productId, tier } for a WeylandAI price id (tier null = the SubConP suite), else null. */
export function catalogForPrice(priceId) {
  return (priceId && BY_PRICE.get(priceId)) || null;
}

function summarizeItems(items) {
  const productIds = new Set();
  const tiers = new Set();
  let suite = false;
  let seats = 0;
  for (const it of items) {
    const hit = catalogForPrice(it.priceId);
    if (!hit) continue;
    productIds.add(hit.productId);
    if (hit.tier === null) suite = true; else tiers.add(hit.tier);
    seats += Math.max(1, Number.parseInt(it.quantity, 10) || 1);
  }
  return { product_ids: [...productIds], tiers: [...tiers], suite, seats: seats || 1, matched: productIds.size > 0 };
}

const priceOf = (p) => (typeof p === "string" ? p : p?.id || null);

/** Facts from a Stripe subscription object (customer.subscription.* events). */
export function factsFromSubscription(sub, eventType = "") {
  const items = (sub?.items?.data || []).map((it) => ({ priceId: priceOf(it.price) || priceOf(it.plan), quantity: it.quantity }));
  const summary = summarizeItems(items);
  let status = String(sub?.status || "");
  if (eventType === "customer.subscription.deleted") status = "canceled";
  return {
    subscription_id: sub?.id || null,
    customer_id: typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id || null,
    status,
    venture_id: sub?.metadata?.venture_id || null,
    user_id_hint: sub?.metadata?.user_id || null,
    ...summary
  };
}

/** Facts from a Stripe invoice (invoice.paid / invoice.payment_failed), 2024 and 2025+ shapes. */
export function factsFromInvoice(inv, eventType = "") {
  const parentSub = inv?.parent?.subscription_details || null;
  const subscriptionId = priceOf(inv?.subscription) || priceOf(parentSub?.subscription) || null;
  const lines = (inv?.lines?.data || []).filter((ln) => !ln.type || ln.type === "subscription" || ln.subscription || ln.parent?.subscription_item_details);
  const items = lines.map((ln) => ({
    priceId: priceOf(ln.price) || priceOf(ln.pricing?.price_details?.price) || priceOf(ln.plan),
    quantity: ln.quantity
  }));
  const summary = summarizeItems(items);
  const metadata = inv?.subscription_details?.metadata || parentSub?.metadata || {};
  return {
    subscription_id: subscriptionId,
    customer_id: typeof inv?.customer === "string" ? inv.customer : inv?.customer?.id || null,
    status: eventType === "invoice.payment_failed" ? "past_due" : "active",
    venture_id: metadata.venture_id || null,
    user_id_hint: metadata.user_id || null,
    billing_reason: inv?.billing_reason || null,
    ...summary
  };
}

/** A subscription of ours: it carries our venture id or pays for a WeylandAI price. */
export function isWeylandSubscription(facts) {
  return !!facts && (facts.venture_id === "weylandai" || facts.matched === true);
}

export async function getSubscription(db, subscriptionId) {
  if (!subscriptionId) return null;
  return db.prepare("SELECT * FROM weyland_subscriptions WHERE subscription_id = ?").bind(subscriptionId).first();
}

export async function listUserSubscriptions(db, userId) {
  if (!userId) return [];
  const res = await db.prepare("SELECT * FROM weyland_subscriptions WHERE user_id = ?").bind(userId).all();
  return res?.results || [];
}

/**
 * Write one subscription's state if this event is not older than the last one
 * applied to it and the subscription has not already ended.
 * Returns { applied, reason, row }.
 */
export async function upsertSubscription(db, facts, { userId, eventAt, eventType }) {
  await ensureSubscriptionsTable(db);
  const now = new Date().toISOString();
  const at = Number.isFinite(Number(eventAt)) ? Math.floor(Number(eventAt)) : Math.floor(Date.now() / 1000);
  const existing = await getSubscription(db, facts.subscription_id);
  if (existing) {
    if (FINAL_STATUSES.has(existing.status)) return { applied: false, reason: "already-ended", row: existing };
    if (at < Number(existing.last_event_at || 0)) return { applied: false, reason: "stale", row: existing };
    // An invoice may not list items we recognise; keep what the row already knows then.
    const keepItems = !facts.matched;
    const row = {
      ...existing,
      user_id: existing.user_id || userId,
      customer_id: facts.customer_id || existing.customer_id,
      status: facts.status || existing.status,
      product_ids: keepItems ? existing.product_ids : facts.product_ids.join(","),
      tiers: keepItems ? existing.tiers : facts.tiers.join(","),
      suite: keepItems ? Number(existing.suite) : (facts.suite ? 1 : 0),
      seats: keepItems ? Number(existing.seats) : facts.seats,
      last_event_at: at,
      last_event_type: eventType || null
    };
    // Compare-and-set on the event time read above: of two concurrent events
    // for the same subscription, the older one cannot land after the newer.
    const res = await db.prepare(
      `UPDATE weyland_subscriptions SET customer_id = ?, status = ?, product_ids = ?, tiers = ?, suite = ?, seats = ?,
         last_event_at = ?, last_event_type = ?, updated_at = ?
       WHERE subscription_id = ? AND last_event_at = ?`
    ).bind(row.customer_id, row.status, row.product_ids, row.tiers, row.suite, row.seats, row.last_event_at, row.last_event_type, now,
      row.subscription_id, Number(existing.last_event_at || 0)).run();
    if (!res?.meta?.changes) return { applied: false, reason: "lost-race", row: existing };
    return { applied: true, reason: "updated", row };
  }
  if (!userId) return { applied: false, reason: "no-account", row: null };
  const row = {
    subscription_id: facts.subscription_id,
    user_id: userId,
    customer_id: facts.customer_id,
    status: facts.status || "active",
    product_ids: facts.product_ids.join(","),
    tiers: facts.tiers.join(","),
    suite: facts.suite ? 1 : 0,
    seats: facts.seats,
    last_event_at: at,
    last_event_type: eventType || null
  };
  const res = await db.prepare(
    `INSERT OR IGNORE INTO weyland_subscriptions (subscription_id, user_id, customer_id, status, product_ids, tiers, suite, seats, last_event_at, last_event_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(row.subscription_id, row.user_id, row.customer_id, row.status, row.product_ids, row.tiers, row.suite, row.seats, row.last_event_at, row.last_event_type, now, now).run();
  if (!res?.meta?.changes) {
    // Someone inserted it between our read and our write: apply this event on top, once.
    return upsertSubscription(db, facts, { userId, eventAt: at, eventType });
  }
  return { applied: true, reason: "inserted", row };
}

const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

/** What an account's subscriptions pay for now, and what they ever paid for. */
export function paidFromRows(rows) {
  const tiers = new Set();
  const everTiers = new Set();
  let suite = false;
  let everSuite = false;
  let paying = false;
  let failing = false;
  let seats = 0;
  for (const r of rows || []) {
    const rowTiers = list(r.tiers);
    rowTiers.forEach((t) => everTiers.add(t));
    if (Number(r.suite)) everSuite = true;
    if (PAYING_STATUSES.has(r.status)) {
      paying = true;
      rowTiers.forEach((t) => tiers.add(t));
      if (Number(r.suite)) suite = true;
      seats += Math.max(1, Number(r.seats) || 1);
    } else if (FAILING_STATUSES.has(r.status)) {
      failing = true;
    }
  }
  return { tiers, suite, paying, failing, seats, everTiers, everSuite };
}
