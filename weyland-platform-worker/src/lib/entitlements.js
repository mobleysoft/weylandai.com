// weyland-platform-worker/src/lib/entitlements.js
//
// The platform keeps users.products_enabled / subscription_tier /
// subscription_status / submittals_limit right, because that row is the one
// place every product worker reads entitlements from: each worker's forked
// requireProductAccess() (src/lib/auth.js in weyland-cutsheetx, -subx, -propx,
// -huntx, -meetingx) lets a signed-in user through only when
// requireActiveSubscription() passes (status 'active', or 'trial' before
// trial_ends_at, and submittals_used < submittals_limit) AND either
// subscription_tier = 'subconp' or the product slug is listed in
// products_enabled.
//
// Found 2026-10-07 (journey free-trial-first-use): authfor-exchange created
// every free trial with products_enabled = '', so a visitor who could paste
// and match as a guest got 402 "Your plan doesn't include cutsheetx" the
// moment they started the trial. The rules this module enforces:
//
//   1. Every signed-in user can use what a guest can (GUEST_PRODUCTS, the
//      same set requireProductAccess opens to AuthFor ephemeral sessions),
//      whatever the plan.
//   2. A trial includes the whole suite (SUITE_PRODUCTS) until trial_ends_at.
//      The grant is marked with TRIAL_MARK in products_enabled so it can be
//      told apart from purchases and taken back when the trial ends.
//   3. When the trial ends without a purchase, the account drops to the free
//      plan: tier 'free', status 'active', products_enabled = GUEST_PRODUCTS.
//      With a purchase during the trial, the trial grant is replaced by what
//      the customer's live Stripe subscriptions actually pay for.
//
// Writes are compare-and-set on the values read, so a concurrent purchase
// webhook (which does its own read-merge-write of products_enabled) is never
// overwritten; a lost race is simply retried on the next sync.

import { WEYLAND_PRODUCTS, stripeRequest } from "./stripe-billing.js";
import { EPHEMERAL_TRIAL_PRODUCTS } from "./auth.js";

export const GUEST_PRODUCTS = Object.freeze([...EPHEMERAL_TRIAL_PRODUCTS]);

// Everything the SubConP suite unlocks, as product slugs: every tier in the
// catalog (SubConP itself has tier null - it is checked by subscription_tier).
export const SUITE_PRODUCTS = Object.freeze(Array.from(new Set([
  ...GUEST_PRODUCTS,
  ...Object.values(WEYLAND_PRODUCTS).map((p) => p.tier).filter(Boolean)
])));

// Marks "this products_enabled list carries the trial grant". Never a product
// slug, so requireProductAccess (exact slug match) ignores it.
export const TRIAL_MARK = "trial-suite";
export const TRIAL_DAYS = 14;

// requireActiveSubscription() blocks every product once submittals_used
// reaches submittals_limit; a guest has no such cap, so a trial or free
// account must not run into one either. Same value the column defaults to.
export const SIGNED_IN_SUBMITTALS_LIMIT = 999;

const LIVE_STRIPE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

export function parseProducts(value) {
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function joinProducts(list) {
  return Array.from(new Set(list)).join(",");
}

export function trialGrantProducts() {
  return joinProducts([TRIAL_MARK, ...SUITE_PRODUCTS]);
}

/** Values for the INSERT that creates a new free-trial account. */
export function newTrialAccount(nowMs = Date.now()) {
  return {
    subscription_tier: "starter",
    subscription_status: "trial",
    products_enabled: trialGrantProducts(),
    submittals_limit: SIGNED_IN_SUBMITTALS_LIMIT,
    trial_ends_at: new Date(nowMs + TRIAL_DAYS * 24 * 60 * 60 * 1e3).toISOString()
  };
}

function trialEndMs(row) {
  if (!row || !row.trial_ends_at) return NaN;
  const ms = Date.parse(row.trial_ends_at);
  return Number.isFinite(ms) ? ms : NaN;
}

const TRIAL_STATUSES = new Set(["trial", "trial_expired"]);

/**
 * What the row should hold now. Returns { changes, needsStripe, reason }:
 * changes is null when the row is already right; needsStripe is true when the
 * answer depends on what the customer pays for (a purchase during the trial),
 * in which case the caller passes `purchased` from purchasedFromStripe().
 */
export function desiredEntitlements(row, nowMs = Date.now(), purchased = null) {
  const current = {
    subscription_tier: row.subscription_tier ?? null,
    subscription_status: row.subscription_status ?? null,
    products_enabled: row.products_enabled ?? "",
    submittals_limit: row.submittals_limit ?? null
  };
  const enabled = parseProducts(current.products_enabled);
  const hasMark = enabled.includes(TRIAL_MARK);
  const end = trialEndMs(row);
  const hasEnd = Number.isFinite(end);
  const inTrialStatus = TRIAL_STATUSES.has(current.subscription_status);
  const next = { ...current };
  let reason = "guest-floor";

  // A trial is in play when the row carries the trial grant, or is in a trial
  // status with a known end date (a 'trial' row with no end date never expires
  // in requireActiveSubscription either, so it only gets the guest floor).
  const trialOpen = (hasMark || inTrialStatus) && hasEnd && end > nowMs;
  const trialOver = (hasMark && !(hasEnd && end > nowMs)) || (inTrialStatus && hasEnd && end <= nowMs);

  if (trialOpen) {
    // Trial window open: the whole suite, guest floor included.
    reason = "trial-open";
    next.products_enabled = joinProducts([TRIAL_MARK, ...SUITE_PRODUCTS, ...enabled]);
    if (current.subscription_status === "trial_expired") next.subscription_status = "trial";
    if (!(Number(current.submittals_limit) >= SIGNED_IN_SUBMITTALS_LIMIT)) next.submittals_limit = SIGNED_IN_SUBMITTALS_LIMIT;
  } else if (trialOver) {
    if (inTrialStatus) {
      // Trial over, nothing bought: the free plan (what a guest can do).
      reason = "trial-ended-free";
      next.subscription_tier = "free";
      next.subscription_status = "active";
      next.products_enabled = joinProducts(GUEST_PRODUCTS);
      if (!(Number(current.submittals_limit) >= SIGNED_IN_SUBMITTALS_LIMIT)) next.submittals_limit = SIGNED_IN_SUBMITTALS_LIMIT;
    } else if (current.subscription_tier === "subconp") {
      // Bought the suite during the trial: subscription_tier already opens everything.
      reason = "trial-ended-suite";
      next.products_enabled = joinProducts(GUEST_PRODUCTS);
    } else {
      // Bought something during the trial: keep exactly what Stripe says they pay for.
      reason = "trial-ended-purchase";
      if (!purchased) return { changes: null, needsStripe: true, reason };
      const paid = [...purchased.tiers];
      if (purchased.suite) next.subscription_tier = "subconp";
      next.products_enabled = joinProducts([...GUEST_PRODUCTS, ...paid]);
    }
  } else {
    // No trial involved: make sure the guest floor is there, keep everything else.
    next.products_enabled = joinProducts([...enabled, ...GUEST_PRODUCTS]);
  }

  const changed = ["subscription_tier", "subscription_status", "products_enabled", "submittals_limit"]
    .some((k) => String(next[k] ?? "") !== String(current[k] ?? ""));
  return { changes: changed ? next : null, needsStripe: false, reason, current };
}

/** Tiers the customer's live Stripe subscriptions pay for. */
export async function purchasedFromStripe(env, customerId) {
  const byPrice = new Map(Object.values(WEYLAND_PRODUCTS).map((p) => [p.priceId, p.tier]));
  const subs = await stripeRequest(env, "GET", `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`);
  const tiers = new Set();
  let suite = false;
  for (const sub of subs.data || []) {
    if (!LIVE_STRIPE_SUB_STATUSES.has(sub.status)) continue;
    for (const item of sub.items?.data || []) {
      const priceId = item.price?.id || item.plan?.id;
      if (!byPrice.has(priceId)) continue;
      const tier = byPrice.get(priceId);
      if (tier === null) suite = true; else tiers.add(tier);
    }
  }
  return { tiers, suite };
}

const ROW_COLUMNS = "id, subscription_tier, subscription_status, products_enabled, submittals_limit, trial_ends_at, stripe_customer_id";

/**
 * Bring one user's row in line with the rules above. Never throws; returns
 * { userId, changed, reason, row } (row = the row as it now stands).
 */
export async function syncUserEntitlements(env, userId, { nowMs = Date.now(), row = null } = {}) {
  try {
    if (!env?.DB || !userId) return { userId, changed: false, reason: "no-db-or-user", row };
    const current = row || await env.DB.prepare(`SELECT ${ROW_COLUMNS} FROM users WHERE id = ?`).bind(userId).first();
    if (!current) return { userId, changed: false, reason: "no-row", row: null };
    let plan = desiredEntitlements(current, nowMs);
    if (plan.needsStripe) {
      if (!current.stripe_customer_id || !env.STRIPE_SECRET_KEY) {
        console.warn("[entitlements] trial ended after a purchase but no Stripe customer to check:", userId);
        return { userId, changed: false, reason: "trial-ended-purchase-unverified", row: current };
      }
      try {
        const purchased = await purchasedFromStripe(env, current.stripe_customer_id);
        plan = desiredEntitlements(current, nowMs, purchased);
      } catch (e) {
        console.error("[entitlements] Stripe subscription lookup failed:", userId, e.message);
        return { userId, changed: false, reason: "stripe-lookup-failed", row: current };
      }
    }
    if (!plan.changes) return { userId, changed: false, reason: plan.reason, row: current };
    const n = plan.changes;
    const res = await env.DB.prepare(
      `UPDATE users SET subscription_tier = ?, subscription_status = ?, products_enabled = ?, submittals_limit = ?, updated_at = ?
       WHERE id = ? AND COALESCE(subscription_tier, '') = ? AND COALESCE(subscription_status, '') = ? AND COALESCE(products_enabled, '') = ?`
    ).bind(
      n.subscription_tier, n.subscription_status, n.products_enabled, n.submittals_limit, new Date(nowMs).toISOString(),
      userId, current.subscription_tier ?? "", current.subscription_status ?? "", current.products_enabled ?? ""
    ).run();
    const changed = !!(res?.meta?.changes);
    return { userId, changed, reason: changed ? plan.reason : "lost-race-retry-next-sync", row: changed ? { ...current, ...n } : current };
  } catch (e) {
    console.error("[entitlements] sync failed:", userId, e.message);
    return { userId, changed: false, reason: "error", row };
  }
}

/**
 * Background pass (traffic-driven job lease, no cron): every row that holds a
 * trial or lacks part of the guest floor. Bounded per run.
 */
export async function sweepEntitlements(env, { nowMs = Date.now(), limit = 200 } = {}) {
  const missingGuest = GUEST_PRODUCTS.map(() => "(',' || COALESCE(products_enabled, '') || ',') NOT LIKE ?").join(" OR ");
  const binds = GUEST_PRODUCTS.map((slug) => `%,${slug},%`);
  const rows = await env.DB.prepare(
    `SELECT ${ROW_COLUMNS} FROM users
     WHERE subscription_status IN ('trial', 'trial_expired')
        OR (',' || COALESCE(products_enabled, '') || ',') LIKE ?
        OR ${missingGuest}
     LIMIT ?`
  ).bind(`%,${TRIAL_MARK},%`, ...binds, limit).all();
  const results = [];
  for (const row of rows.results || []) {
    results.push(await syncUserEntitlements(env, row.id, { nowMs, row }));
  }
  return { scanned: results.length, changed: results.filter((r) => r.changed).length, results };
}

/** What /api/auth/me reports: the plan in words plus the product list. */
export function describeEntitlements(row, nowMs = Date.now()) {
  if (!row) return null;
  const enabled = parseProducts(row.products_enabled);
  const end = trialEndMs(row);
  const trialActive = enabled.includes(TRIAL_MARK) && Number.isFinite(end) && end > nowMs;
  const suite = row.subscription_tier === "subconp" || trialActive;
  const products = suite ? [...SUITE_PRODUCTS] : enabled.filter((p) => p !== TRIAL_MARK);
  for (const g of GUEST_PRODUCTS) if (!products.includes(g)) products.push(g);
  let plan = row.subscription_tier || "free";
  if (trialActive) plan = "trial";
  return {
    plan,
    status: row.subscription_status || null,
    trial: trialActive ? { active: true, ends_at: row.trial_ends_at } : { active: false, ended_at: Number.isFinite(end) && end <= nowMs ? row.trial_ends_at : null },
    suite,
    products,
    guest_products: [...GUEST_PRODUCTS]
  };
}
