// weyland-platform-worker/src/routes/subscription.js
//
// Self-contained fork of ../../../src/routes/subscription.js, copied
// verbatim. GET /api/subscription/status (reads the real users row),
// POST /api/subscription/portal (real Stripe customer-portal session via
// the env.VENDYAI service binding, same pattern as billing.js's checkout
// creation).
//
// Original header follows, preserved for provenance:
//
import { jsonResponse3 } from "../lib/json-response.js";
import { syncUserEntitlements, describeEntitlements } from "../lib/entitlements.js";

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
      await syncUserEntitlements(env2, user.userId);
      const row = await env2.DB.prepare(`
        SELECT subscription_tier, subscription_status, submittals_used, submittals_limit,
               trial_ends_at, products_enabled
        FROM users WHERE id = ?
      `).bind(user.userId).first();
      if (!row) {
        return errorResponse("NOT_FOUND", "User not found");
      }
      return jsonResponse3({
        subscription: {
          tier: row.subscription_tier || "starter",
          status: row.subscription_status,
          submittalsUsed: row.submittals_used || 0,
          submittalsLimit: row.submittals_limit || 10,
          trialEndsAt: row.trial_ends_at
        },
        entitlements: describeEntitlements(row)
      });
    } catch (err) {
      return errorResponse("DATABASE_ERROR", "Failed to fetch subscription: " + err.message);
    }
  });
  router.post("/api/subscription/portal", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const userData = await env2.DB.prepare(
        "SELECT stripe_customer_id FROM users WHERE id = ?"
      ).bind(user.userId).first();
      if (!userData?.stripe_customer_id) {
        return errorResponse("VALIDATION_ERROR", "No active subscription found. Subscribe first.");
      }
      const baseUrl = "https://weylandai.com";
      // Fixed 2026-09-03 alongside the checkout cleanup above: this used
      // the same broken env2.VENDYAI_API_URL-or-empty-string pattern as the
      // deleted checkout handler, so it always threw. Routed through the
      // real vendyai service binding instead, matching
      // /api/billing/checkout/create's real, working integration.
      const portalResp = await env2.VENDYAI.fetch("https://vendyai-com-worker.internal/api/portal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: userData.stripe_customer_id,
          return_url: baseUrl
        })
      });
      if (!portalResp.ok) {
        const errText = await portalResp.text();
        console.error("[Subscription] VendyAI portal error:", errText);
        return errorResponse("EXTERNAL_API_ERROR", "Failed to create portal session");
      }
      const result = await portalResp.json();
      return jsonResponse3({ portalUrl: result.portal?.url });
    } catch (err) {
      console.error("[Subscription] Portal error:", err);
      return errorResponse("INTERNAL_ERROR", "Portal session failed: " + err.message);
    }
  });
}
