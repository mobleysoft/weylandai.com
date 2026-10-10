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

import { WEYLAND_PRODUCTS, stripeRequest, subscriptionProducts } from "./stripe-billing.js";
import { EPHEMERAL_TRIAL_PRODUCTS } from "./auth.js";
import { ensureSubscriptionsTable, listUserSubscriptions, paidFromRows } from "./subscriptions-store.js";
import { purchasesForUser, latestOffer, heldPurchasesForEmail } from "./purchases-store.js";

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
  const byPrice = new Map(subscriptionProducts().map(([, p]) => [p.priceId, p.tier]));
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
// allowStripe: only the background sweep may ask Stripe (accounts that bought
// before weyland_subscriptions existed); a route a visitor waits on never does
// (2026-10-07: the end of a trial or of the $100 offer is decided from D1 alone).
export async function syncUserEntitlements(env, userId, { nowMs = Date.now(), row = null, allowStripe = false } = {}) {
  try {
    if (!env?.DB || !userId) return { userId, changed: false, reason: "no-db-or-user", row };
    const current = row || await env.DB.prepare(`SELECT ${ROW_COLUMNS} FROM users WHERE id = ?`).bind(userId).first();
    if (!current) return { userId, changed: false, reason: "no-row", row: null };
    let plan = desiredEntitlements(current, nowMs);
    if (plan.needsStripe) {
      // 2026-10-07: the account's own subscription rows (kept by the payment
      // webhooks, lib/subscriptions-store.js) answer this without asking Stripe
      // while the visitor waits; Stripe is asked only for accounts that bought
      // before those rows existed.
      const rows = await subscriptionRowsFor(env, userId);
      if (rows.length) {
        const paid = paidFromRows(rows);
        plan = desiredEntitlements(current, nowMs, { tiers: paid.tiers, suite: paid.suite });
        if (!plan.changes) return { userId, changed: false, reason: plan.reason, row: current };
        return writePlan(env, userId, current, plan, nowMs);
      }
      if (!allowStripe || !current.stripe_customer_id || !env.STRIPE_SECRET_KEY) {
        if (allowStripe) console.warn("[entitlements] trial ended after a purchase but no Stripe customer to check:", userId);
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
    return writePlan(env, userId, current, plan, nowMs);
  } catch (e) {
    console.error("[entitlements] sync failed:", userId, e.message);
    return { userId, changed: false, reason: "error", row };
  }
}

// Compare-and-set write of a plan computed from `current`.
async function writePlan(env, userId, current, plan, nowMs, { resetUsage = false } = {}) {
  const n = plan.changes || {
    subscription_tier: current.subscription_tier ?? null,
    subscription_status: current.subscription_status ?? null,
    products_enabled: current.products_enabled ?? "",
    submittals_limit: current.submittals_limit ?? null
  };
  // resetUsage (a renewal was paid) also zeroes submittals_used: a new period.
  const res = await env.DB.prepare(
    `UPDATE users SET subscription_tier = ?, subscription_status = ?, products_enabled = ?, submittals_limit = ?,${resetUsage ? " submittals_used = 0," : ""} updated_at = ?
       WHERE id = ? AND COALESCE(subscription_tier, '') = ? AND COALESCE(subscription_status, '') = ? AND COALESCE(products_enabled, '') = ?`
  ).bind(
    n.subscription_tier, n.subscription_status, n.products_enabled, n.submittals_limit, new Date(nowMs).toISOString(),
    userId, current.subscription_tier ?? "", current.subscription_status ?? "", current.products_enabled ?? ""
  ).run();
  const changed = !!(res?.meta?.changes);
  return { userId, changed, reason: changed ? plan.reason : "lost-race-retry-next-sync", row: changed ? { ...current, ...n } : current };
}

async function subscriptionRowsFor(env, userId) {
  try {
    await ensureSubscriptionsTable(env.DB);
    return await listUserSubscriptions(env.DB, userId);
  } catch (e) {
    console.error("[entitlements] subscription rows unavailable:", userId, e.message);
    return [];
  }
}

// What a paid seat allows per billing period; never below what a free account
// gets (a purchase used to drop the cap from 999 to 50 x seats).
export const SUBMITTALS_PER_SEAT = 50;
export function paidSubmittalsLimit(current, seats) {
  return Math.max(Number(current) || 0, SIGNED_IN_SUBMITTALS_LIMIT, SUBMITTALS_PER_SEAT * Math.max(0, Number(seats) || 0));
}

/**
 * What the users row should hold given the account's subscription rows
 * (2026-10-07, payment lifecycle). Rules:
 *   - products a subscription paid for and no longer pays for (cancelled,
 *     payment failing) are removed, unless another paying subscription pays
 *     for them; products granted any other way (by hand, the trial) stay;
 *   - every paying subscription's products are added; the guest floor stays;
 *   - while the 14-day trial is open it keeps the whole suite;
 *   - tier: 'subconp' while a suite subscription pays (or the suite was
 *     granted by hand, never by a subscription), 'standalone' while any
 *     subscription pays, 'starter' in the trial, else 'free';
 *   - status: 'active' while anything pays (and for the free plan), 'trial'
 *     in the trial, 'past_due' when the only subscriptions left are failing.
 */
export function desiredFromSubscriptions(row, subs, nowMs = Date.now()) {
  const paid = paidFromRows(subs);
  const current = {
    subscription_tier: row.subscription_tier ?? null,
    subscription_status: row.subscription_status ?? null,
    products_enabled: row.products_enabled ?? "",
    submittals_limit: row.submittals_limit ?? null
  };
  const enabled = parseProducts(current.products_enabled);
  const end = trialEndMs(row);
  const trialOpen = (enabled.includes(TRIAL_MARK) || TRIAL_STATUSES.has(current.subscription_status)) && Number.isFinite(end) && end > nowMs;
  const lapsed = new Set([...paid.everTiers].filter((t) => !paid.tiers.has(t)));
  let products = [...enabled.filter((p) => !lapsed.has(p)), ...paid.tiers, ...GUEST_PRODUCTS];
  if (trialOpen) products = [TRIAL_MARK, ...SUITE_PRODUCTS, ...products];
  const manualSuite = current.subscription_tier === "subconp" && !paid.everSuite;
  let tier;
  if (paid.suite || manualSuite) tier = "subconp";
  else if (paid.tiers.size) tier = "standalone";
  else if (trialOpen) tier = "starter";
  else tier = "free";
  let status;
  if (paid.paying || manualSuite) status = "active";
  else if (trialOpen) status = "trial";
  else if (paid.failing) status = "past_due";
  else status = "active";
  const next = {
    subscription_tier: tier,
    subscription_status: status,
    products_enabled: joinProducts(products),
    submittals_limit: paidSubmittalsLimit(current.submittals_limit, paid.seats)
  };
  const changed = ["subscription_tier", "subscription_status", "products_enabled", "submittals_limit"]
    .some((k) => String(next[k] ?? "") !== String(current[k] ?? ""));
  const reason = paid.paying ? "paying" : paid.failing ? "payment-failing" : trialOpen ? "trial-only" : "nothing-paid";
  return { changes: changed ? next : null, reason, current, paid };
}

/**
 * Bring the users row in line with its subscription rows (called by the
 * payment webhook after each applied event). resetUsage starts a new usage
 * period (a renewal was paid). Returns { userId, changed, reason, row }.
 */
export async function applySubscriptionState(env, userId, { nowMs = Date.now(), resetUsage = false } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await env.DB.prepare(`SELECT ${ROW_COLUMNS} FROM users WHERE id = ?`).bind(userId).first();
    if (!current) return { userId, changed: false, reason: "no-row", row: null };
    const rows = await subscriptionRowsFor(env, userId);
    const plan = desiredFromSubscriptions(current, rows, nowMs);
    if (!plan.changes && !resetUsage) return { userId, changed: false, reason: plan.reason, row: current };
    const res = await writePlan(env, userId, current, plan, nowMs, { resetUsage });
    if (res.changed) return { ...res, reason: plan.reason };
    // Lost a compare-and-set race (another write to the row in between): read again.
  }
  return { userId, changed: false, reason: "lost-race", row: null };
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
    results.push(await syncUserEntitlements(env, row.id, { nowMs, row, allowStripe: true }));
  }
  return { scanned: results.length, changed: results.filter((r) => r.changed).length, results };
}

/** What /api/auth/me reports: the plan in words plus the product list (and, given, the access block). */
export function describeEntitlements(row, nowMs = Date.now(), access = undefined) {
  if (!row) return null;
  const enabled = parseProducts(row.products_enabled);
  const end = trialEndMs(row);
  const trialActive = enabled.includes(TRIAL_MARK) && Number.isFinite(end) && end > nowMs;
  // The same test requireActiveSubscription() makes in every product worker:
  // a past_due / cancelled account can use only what a guest can (2026-10-07).
  const status = row.subscription_status || "trial";
  const usable = status === "active" || (status === "trial" && !(Number.isFinite(end) && end <= nowMs));
  const suite = usable && (row.subscription_tier === "subconp" || trialActive);
  const products = !usable ? [] : suite ? [...SUITE_PRODUCTS] : enabled.filter((p) => p !== TRIAL_MARK);
  for (const g of GUEST_PRODUCTS) if (!products.includes(g)) products.push(g);
  let plan = row.subscription_tier || "free";
  if (trialActive) plan = "trial";
  return {
    plan,
    status: row.subscription_status || null,
    trial: trialActive ? { active: true, ends_at: row.trial_ends_at } : { active: false, ended_at: Number.isFinite(end) && end <= nowMs ? row.trial_ends_at : null },
    suite,
    products,
    guest_products: [...GUEST_PRODUCTS],
    // A renewal payment failed: paid products are withheld until it is paid
    // (the card is updated in the page: POST /api/billing/payment-method/setup).
    payment_failing: status === "past_due" || status === "unpaid",
    ...(access === undefined ? {} : { access })
  };
}

// ── access: what the account card, the day-23 prompt and the ended message read ──

// When the product starts asking for a plan: the offer from day 23 of its 30
// (day 1 is the day of purchase, so 8 days or fewer left; John 2026-10-07, the
// Terms say "from day 23"), a 14-day trial in its last 3 days (fc:shell).
export const PROMPT_DAYS = Object.freeze({ offer: 8, trial: 3 });
const DAY_MS = 24 * 60 * 60 * 1e3;
const iso = (ms) => new Date(ms).toISOString();

/**
 * The account's access in the words the shell uses (contract: fc:payments,
 * plan/evidence/weylandai_contracts.md). Pure: the caller passes the
 * account's purchases (lib/purchases-store.js), its subscription rows and the
 * number of purchases held for its email.
 *   kind: "subscription" (something pays, or the suite was granted by hand),
 *         "offer" (the $100 first-submittal window is open), "trial" (the
 *         14-day trial is open), "none".
 *   prompt_for_plan: an offer or trial window is open, nothing pays, and
 *         PROMPT_DAYS[kind] or fewer days are left (the offer: from day 23 of
 *         30, 8 days left; the trial: its last 3 days).
 */
export function describeAccess(row, { purchases = [], subscriptions = [], heldCount = 0, nowMs = Date.now() } = {}) {
  if (!row) return null;
  const paid = paidFromRows(subscriptions);
  const manualSuite = row.subscription_tier === "subconp" && !paid.everSuite;
  const paying = paid.paying || manualSuite;
  const enabled = parseProducts(row.products_enabled);
  const end = trialEndMs(row);
  const windowOpen = (enabled.includes(TRIAL_MARK) || TRIAL_STATUSES.has(row.subscription_status)) && Number.isFinite(end) && end > nowMs;
  const offer = latestOffer(purchases);
  const offerEnd = offer ? Date.parse(offer.access_ends_at || "") : NaN;
  const offerOpen = windowOpen && Number.isFinite(offerEnd) && offerEnd > nowMs;
  let kind = "none";
  if (paying) kind = "subscription";
  else if (offerOpen) kind = "offer";
  else if (windowOpen) kind = "trial";
  const inWindow = kind === "offer" || kind === "trial";
  const left = inWindow ? end - nowMs : null;
  let ended = null;
  if (kind === "none" && Number.isFinite(end) && end <= nowMs) {
    const offerEnded = Number.isFinite(offerEnd) && offerEnd <= nowMs && Math.abs(offerEnd - end) < DAY_MS;
    ended = { kind: offerEnded ? "offer" : "trial", at: iso(end) };
  }
  return {
    kind,
    ends_at: inWindow ? iso(end) : null,
    days_left: inWindow ? Math.max(0, Math.ceil(left / DAY_MS)) : null,
    prompt_for_plan: inWindow && left <= PROMPT_DAYS[kind] * DAY_MS,
    prompt_from: inWindow ? iso(end - PROMPT_DAYS[kind] * DAY_MS) : null,
    ended,
    first_submittal: offer ? {
      purchased_at: offer.purchased_at || null,
      granted_at: offer.granted_at || null,
      access_ends_at: offer.access_ends_at || null,
      amount_total: offer.amount_total ?? null,
      currency: offer.currency || null,
      // g052: bought on account (an invoice, POST /api/billing/on-account) rather than paid by card.
      on_account: /^in_/.test(String(offer.checkout_session_id || "")),
      credit: {
        total: Number(offer.credits_total) || 0,
        used: Number(offer.credits_used) || 0,
        remaining: Math.max(0, (Number(offer.credits_total) || 0) - (Number(offer.credits_used) || 0))
      }
    } : null,
    held_purchases: Number(heldCount) || 0
  };
}

/** describeAccess for an account, reading what it needs from D1 (no Stripe). Never throws. */
export async function loadAccess(env, row, { nowMs = Date.now() } = {}) {
  if (!row?.id) return null;
  try {
    const [purchases, subscriptions, held] = await Promise.all([
      purchasesForUser(env.DB, row.id),
      subscriptionRowsFor(env, row.id),
      row.email ? heldPurchasesForEmail(env.DB, row.email) : Promise.resolve([])
    ]);
    return describeAccess(row, { purchases, subscriptions, heldCount: held.length, nowMs });
  } catch (e) {
    console.error("[entitlements] access unavailable:", row.id, e.message);
    return null;
  }
}
