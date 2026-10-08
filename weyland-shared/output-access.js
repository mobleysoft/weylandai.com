// weyland-shared/output-access.js
//
// "Free to try, pay for the output" (John, 2026-10-08). Anyone - a guest, a
// free account, a 14-day trial - can upload a bid set, read its schedules,
// see the matched products and cited pages, and lay out a proposal. What a
// customer takes away to send to a GC costs money: the submittal package PDF
// (SubX / TakeoffX) and the proposal PDF (PropX). Before this, every product
// but MeetingX was open to an anonymous token with no limit and building the
// packet never asked for payment, so the $100 offer and the subscriptions
// unlocked nothing (product inventory of 2026-10-08).
//
// Paid means, read from the shared weyland_db (the platform worker writes
// these tables; lib/purchases-store.js, lib/subscriptions-store.js):
//   - a granted first-submittal offer (weyland_purchases kind 'offer') whose
//     access window is still open (users.trial_ends_at; the offer extends it
//     to 30 days from purchase), or
//   - a paying Stripe subscription (weyland_subscriptions status active or
//     trialing) for the whole suite or for one of the product's tiers, or
//   - a suite set on the account by hand (subscription_tier 'subconp',
//     status 'active': a comped account with no Stripe row).
// The free trial uses the same trial_ends_at window but has no offer row, so
// it is a trial, not a purchase.

const PAYING = new Set(["active", "trialing"]);
const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

// Which purchased tiers carry a product's output.
export const OUTPUT_TIERS = Object.freeze({
  subx: ["subx", "takeoffx"],
  takeoffx: ["takeoffx", "subx"],
  propx: ["propx"],
  cutsheetx: ["cutsheetx"],
  huntx: ["huntx"], // saved searches and their new-notice counts
});

async function rows(db, sql, ...binds) {
  try {
    const r = await db.prepare(sql).bind(...binds).all();
    return r?.results || [];
  } catch (_) {
    return []; // a database without the table has no purchases
  }
}

/**
 * @returns {Promise<{paid: boolean, via: string|null, accessEndsAt: string|null}>}
 *   via: "offer" | "suite" | "<tier>" | "comped" | null
 */
export async function outputAccess(env, userId, product, nowMs = Date.now()) {
  if (!env || !env.DB || !userId) return { paid: false, via: null, accessEndsAt: null };
  const db = env.DB;
  let user = null;
  try {
    user = await db.prepare("SELECT subscription_tier, subscription_status, trial_ends_at FROM users WHERE id = ?").bind(userId).first();
  } catch (_) { user = null; }
  if (!user) return { paid: false, via: null, accessEndsAt: null };

  const tiers = OUTPUT_TIERS[product] || [product];
  for (const s of await rows(db, "SELECT status, tiers, suite FROM weyland_subscriptions WHERE user_id = ?", userId)) {
    if (!PAYING.has(s.status)) continue;
    if (Number(s.suite)) return { paid: true, via: "suite", accessEndsAt: null };
    const t = list(s.tiers).find((x) => tiers.includes(x));
    if (t) return { paid: true, via: t, accessEndsAt: null };
  }
  if (user.subscription_tier === "subconp" && user.subscription_status === "active") {
    return { paid: true, via: "comped", accessEndsAt: null };
  }
  const end = Date.parse(user.trial_ends_at || "");
  if (Number.isFinite(end) && end > nowMs) {
    const offers = await rows(db, "SELECT checkout_session_id FROM weyland_purchases WHERE user_id = ? AND kind = 'offer' AND status = 'granted' LIMIT 1", userId);
    if (offers.length) return { paid: true, via: "offer", accessEndsAt: new Date(end).toISOString() };
  }
  return { paid: false, via: null, accessEndsAt: null };
}

/** The 402 body a product worker returns for output that needs payment. */
export function paymentRequired(what) {
  return {
    success: false,
    error: "PAYMENT_REQUIRED",
    code: "PAYMENT_REQUIRED",
    message: `Reading, matching and reviewing are free. ${what} comes with the $100 first submittal (30 days of every product, no automatic charge) or a plan.`,
    upgradeUrl: "/pricing",
  };
}
