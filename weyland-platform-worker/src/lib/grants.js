// weyland-platform-worker/src/lib/grants.js
//
// Granting a purchase to an account, and claiming purchases that were held
// (2026-10-07). Used by the payment webhook (routes/webhooks-subscription.js)
// and by the sign-in and billing routes that claim held purchases.
//
// The first-submittal offer opens an access window: users.trial_ends_at
// becomes the later of its current value and grant time + OFFER_ACCESS_DAYS,
// and TRIAL_MARK goes into products_enabled; applySubscriptionState then gives
// the row the whole suite while the window is open (lib/entitlements.js). This
// is the same window the 14-day trial uses, so the offer ends exactly the way a
// trial does: every product worker's requireActiveSubscription stops it at
// trial_ends_at by itself (status 'trial'), the platform's entitlement sync
// moves the row to the free plan (the guest floor), and the account, its email
// and its work stay. No Stripe call anywhere in here.
//
// Held purchases (lib/purchases-store.js) are granted only to the account
// whose email they were bought with, and only when the email is proven
// (emailVerified: the AuthFor sign-in said email_verified) or the browser that
// paid holds the claim (the weyland_claim cookie set by GET
// /api/billing/checkout/status/:id, or the session id in POST /api/billing/claims).

import { OFFER_ACCESS_DAYS, OFFER_SUBMITTAL_CREDITS, WEYLAND_PRODUCTS } from "./stripe-billing.js";
import { TRIAL_MARK, parseProducts, applySubscriptionState } from "./entitlements.js";
import { getSubscription, upsertSubscription, ensureSubscriptionsTable } from "./subscriptions-store.js";
import { HELD_USER_PREFIX, PURCHASE_KINDS, heldPurchasesForEmail, markGranted, getPurchase } from "./purchases-store.js";

const DAY_MS = 24 * 60 * 60 * 1e3;

/**
 * Open (or extend) the account's access window for the offer. Returns
 * { ok, accessEndsAt, row } where row is the users row after the entitlement
 * pass. Compare-and-set; retried on a lost race.
 */
export async function openOfferWindow(env, userId, { nowMs = Date.now(), customerId = null } = {}) {
  const offerEnd = nowMs + OFFER_ACCESS_DAYS * DAY_MS;
  let endIso = null;
  for (let attempt = 0; attempt < 4 && !endIso; attempt++) {
    const cur = await env.DB.prepare("SELECT id, products_enabled, trial_ends_at FROM users WHERE id = ?").bind(userId).first();
    if (!cur) return { ok: false, reason: "no-row", accessEndsAt: null, row: null };
    const curEnd = Date.parse(cur.trial_ends_at || "");
    const end = Number.isFinite(curEnd) && curEnd > offerEnd ? curEnd : offerEnd;
    const iso = new Date(end).toISOString();
    const products = Array.from(new Set([TRIAL_MARK, ...parseProducts(cur.products_enabled)])).join(",");
    const res = await env.DB.prepare(
      `UPDATE users SET trial_ends_at = ?, products_enabled = ?, stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = ?
       WHERE id = ? AND COALESCE(products_enabled, '') = ? AND COALESCE(trial_ends_at, '') = ?`
    ).bind(iso, products, customerId, new Date(nowMs).toISOString(), userId, cur.products_enabled ?? "", cur.trial_ends_at ?? "").run();
    if (res?.meta?.changes) endIso = iso;
  }
  if (!endIso) return { ok: false, reason: "lost-race", accessEndsAt: null, row: null };
  const applied = await applySubscriptionState(env, userId, { nowMs });
  return { ok: true, accessEndsAt: endIso, row: applied.row };
}

// Facts for a subscription purchase whose subscription row is missing (an old
// forward without the subscription id has none): from the catalog entry.
function factsFromPurchase(purchase) {
  const cfg = WEYLAND_PRODUCTS[purchase.product_id] || {};
  return {
    subscription_id: purchase.subscription_id,
    customer_id: purchase.customer_id || null,
    status: "active",
    venture_id: "weylandai",
    product_ids: [purchase.product_id],
    tiers: cfg.tier ? [cfg.tier] : [],
    suite: cfg.tier === null,
    seats: Math.max(1, Number(purchase.quantity) || 1),
    matched: true
  };
}

/**
 * Give a recorded purchase (status 'pending' or 'held') to the account.
 * Returns { granted, accessEndsAt }. Safe to repeat: the purchase row moves to
 * 'granted' once, by compare-and-set.
 */
export async function grantPurchase(env, purchase, userId, { nowMs = Date.now(), claimMethod = "webhook" } = {}) {
  const grantedAt = new Date(nowMs).toISOString();
  if (purchase.kind === PURCHASE_KINDS.OFFER) {
    const w = await openOfferWindow(env, userId, { nowMs, customerId: purchase.customer_id });
    if (!w.ok) throw new Error("offer window not opened: " + w.reason);
    const changed = await markGranted(env.DB, purchase.checkout_session_id, {
      userId, grantedAt, accessEndsAt: w.accessEndsAt, claimMethod, creditsTotal: OFFER_SUBMITTAL_CREDITS, from: purchase.status
    });
    return { granted: changed, accessEndsAt: w.accessEndsAt };
  }
  // A subscription bought by checkout.
  await ensureSubscriptionsTable(env.DB);
  if (purchase.subscription_id) {
    const sub = await getSubscription(env.DB, purchase.subscription_id);
    if (sub && sub.user_id === HELD_USER_PREFIX + purchase.checkout_session_id) {
      await env.DB.prepare("UPDATE weyland_subscriptions SET user_id = ?, updated_at = ? WHERE subscription_id = ? AND user_id = ?")
        .bind(userId, grantedAt, purchase.subscription_id, sub.user_id).run();
    } else if (!sub) {
      const at = Math.floor(Date.parse(purchase.purchased_at || grantedAt) / 1000) || Math.floor(nowMs / 1000);
      await upsertSubscription(env.DB, factsFromPurchase(purchase), { userId, eventAt: at, eventType: "checkout.session.completed" });
    }
  }
  if (purchase.customer_id) {
    await env.DB.prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?").bind(purchase.customer_id, grantedAt, userId).run();
  }
  await applySubscriptionState(env, userId, { nowMs });
  const changed = await markGranted(env.DB, purchase.checkout_session_id, { userId, grantedAt, claimMethod, from: purchase.status });
  return { granted: changed, accessEndsAt: null };
}

// ── claims ──

export const CLAIM_COOKIE = "weyland_claim";
const CLAIM_ID = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;
const MAX_CLAIM_IDS = 4;

/** Checkout session ids this browser holds a claim for (the weyland_claim cookie). */
export function claimIdsFromRequest(request) {
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)weyland_claim=([^;]*)/);
  if (!m) return [];
  return Array.from(new Set(decodeURIComponent(m[1]).split(".").filter((id) => CLAIM_ID.test(id)))).slice(0, MAX_CLAIM_IDS);
}

/** Set-Cookie value holding these claims (an empty list clears it). Path /api: only our APIs read it. */
export function claimCookie(ids) {
  const list = Array.from(new Set((ids || []).filter((id) => CLAIM_ID.test(id)))).slice(-MAX_CLAIM_IDS);
  if (!list.length) return `${CLAIM_COOKIE}=; Path=/api; Max-Age=0; Secure; HttpOnly; SameSite=Lax`;
  return `${CLAIM_COOKIE}=${list.join(".")}; Path=/api; Max-Age=604800; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * Grant the purchases held for this account's email that it may claim:
 * all of them when the sign-in proved the email, else only those whose
 * checkout session id the caller holds (sessionIds). Never throws.
 * Returns { claimed:[{session_id, product_id, kind}], held:int, keepIds:[...] }
 * keepIds: the caller's claim ids still unclaimed (for the cookie).
 */
export async function claimHeldPurchases(env, account, { sessionIds = [], emailVerified = false, nowMs = Date.now() } = {}) {
  const out = { claimed: [], held: 0, keepIds: [] };
  try {
    if (!env?.DB || !account?.id || !account?.email) return out;
    const held = await heldPurchasesForEmail(env.DB, account.email);
    const ids = new Set(sessionIds || []);
    for (const p of held) {
      if (!(emailVerified || ids.has(p.checkout_session_id))) continue;
      try {
        const g = await grantPurchase(env, p, account.id, { nowMs, claimMethod: emailVerified ? "email_verified" : "same_browser" });
        out.claimed.push({ session_id: p.checkout_session_id, product_id: p.product_id, kind: p.kind, access_ends_at: g.accessEndsAt || null });
        if (env.CACHE) {
          await env.CACHE.put(`checkout_status:${p.checkout_session_id}`, JSON.stringify({
            status: "active", quantity: p.quantity, session_id: null, product_id: p.product_id, access_ends_at: g.accessEndsAt || null, claimed: true
          }), { expirationTtl: 86400 });
        }
        console.log(`[claims] ${p.checkout_session_id} (${p.product_id}) granted to ${account.id} by ${emailVerified ? "proven email" : "the paying browser"}`);
      } catch (e) {
        console.error("[claims] grant failed:", p.checkout_session_id, e.message);
      }
    }
    const claimedIds = new Set(out.claimed.map((c) => c.session_id));
    out.held = held.filter((p) => !claimedIds.has(p.checkout_session_id)).length;
    // The caller's other claims stay while their purchase is still held (it may be
    // for another email this browser signs in with later); granted ones are dropped.
    for (const id of ids) {
      if (claimedIds.has(id)) continue;
      const row = await getPurchase(env.DB, id);
      if (row && row.status === "held") out.keepIds.push(id);
    }
    return out;
  } catch (e) {
    console.error("[claims] failed:", e.message);
    return out;
  }
}

/**
 * For signed-in routes: if the request carries a claim cookie, claim what it
 * names for this account. Returns { claimed, cookie }: cookie is the Set-Cookie
 * value to send when the claims changed, else null.
 */
export async function claimFromCookie(env, request, account) {
  const ids = claimIdsFromRequest(request);
  if (!ids.length || !account?.id) return { claimed: [], cookie: null };
  const r = await claimHeldPurchases(env, account, { sessionIds: ids });
  const unchanged = !r.claimed.length && r.keepIds.length === ids.length;
  return { claimed: r.claimed, cookie: unchanged ? null : claimCookie(r.keepIds) };
}
