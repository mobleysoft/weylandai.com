// weyland-platform-worker/src/routes/subscription.js
//
//   GET  /api/subscription/status - the account's plan as stored (users row),
//        what it can use (entitlements) and, since 2026-10-07, its access
//        (entitlements.js describeAccess: offer / subscription / trial / none,
//        the end date, days left, the day-23 prompt, the first-submittal
//        credit). Reads D1 only: no Stripe call while the visitor waits.
//   POST /api/subscription/portal - 410 (2026-10-07). It opened Stripe's hosted
//        billing portal, a page on stripe.com; plan management is in the page
//        now (routes/plan.js).
//
// Provenance: forked 2026-09 from the monolith's src/routes/subscription.js.
import { jsonResponse3 } from "../lib/json-response.js";
import { syncUserEntitlements, describeEntitlements, loadAccess } from "../lib/entitlements.js";
import { claimFromCookie } from "../lib/grants.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, errorResponse: Function }} deps
 */
export function registerSubscriptionRoutes(router, { authenticate, errorResponse }) {
  router.get("/api/subscription/status", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      // 2026-10-07: an ended trial no longer becomes status 'trial_expired'
      // (every product worker's requireActiveSubscription answered 402 to that,
      // locking the account below what a guest can do); the entitlement sync
      // moves it to the free plan instead - see lib/entitlements.js.
      const pre = await env2.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(user.userId).first();
      const claim = pre ? await claimFromCookie(env2, request2, pre) : { claimed: [], cookie: null };
      await syncUserEntitlements(env2, user.userId);
      const row = await env2.DB.prepare(`
        SELECT id, email, subscription_tier, subscription_status, submittals_used, submittals_limit,
               trial_ends_at, products_enabled
        FROM users WHERE id = ?
      `).bind(user.userId).first();
      if (!row) {
        return errorResponse("NOT_FOUND", "User not found");
      }
      const access = await loadAccess(env2, row);
      const headers = { "Content-Type": "application/json" };
      if (claim.cookie) headers["Set-Cookie"] = claim.cookie;
      return new Response(JSON.stringify({
        subscription: {
          tier: row.subscription_tier || "starter",
          status: row.subscription_status,
          submittalsUsed: row.submittals_used || 0,
          submittalsLimit: row.submittals_limit || 10,
          trialEndsAt: row.trial_ends_at
        },
        entitlements: describeEntitlements(row, Date.now(), access),
        access,
        ...(claim.claimed.length ? { claimed: claim.claimed } : {})
      }), { status: 200, headers });
    } catch (err) {
      return errorResponse("DATABASE_ERROR", "Failed to fetch subscription: " + err.message);
    }
  });
  // Stripe's hosted billing portal is a page on stripe.com: never used (no page hop).
  router.post("/api/subscription/portal", () => jsonResponse3({
    error: "billing_portal_removed",
    message: "Plans are managed inside the page now.",
    use: "GET /api/billing/plan, POST /api/billing/subscription/cancel|resume, POST /api/billing/payment-method/setup, GET /api/billing/invoices"
  }, 410));
}
