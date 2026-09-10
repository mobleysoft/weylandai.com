import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Real financial/billing code - extracted verbatim, no logic changes.
 * WEYLAND_PRODUCTS and stripeRequest have one real call site remaining
 * in legacy-monolith.js each (inside /api/webhooks/subscription, not
 * part of this extraction), so they stay injected rather than copied.
 * CHECKOUT_READY_PRODUCTS has zero other call sites but was kept
 * injected too rather than inlined - it's a ~24-entry Set of live
 * Stripe product IDs, and re-deriving/copying it here would risk a
 * transcription error in exactly the kind of data where that matters.
 *
 * @param {object} router
 * @param {{ WEYLAND_PRODUCTS: object, CHECKOUT_READY_PRODUCTS: Set, stripeRequest: Function }} deps
 */
export function registerBillingRoutes(router, { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS, stripeRequest }) {
  router.get("/api/billing/catalog", async (request2, env2) => {
    const products = [];
    for (const [productId, cfg] of Object.entries(WEYLAND_PRODUCTS)) {
      try {
        const price = await stripeRequest(env2, "GET", `/prices/${cfg.priceId}`);
        products.push({
          id: productId,
          checkout_ready: price.active === true,
          price_id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          trial_period_days: price.recurring?.trial_period_days ?? null,
          livemode: price.livemode
        });
      } catch (err) {
        console.error("[Billing] catalog error:", productId, err.message);
        products.push({ id: productId, checkout_ready: false, blockers: [err.message] });
      }
    }
    return jsonResponse3({ products });
  });
  router.post("/api/billing/checkout/create", async (request2, env2) => {
    try {
      const body = await request2.json().catch(() => ({}));
      const productCfg = WEYLAND_PRODUCTS[body.product_id];
      if (!productCfg) {
        return jsonResponse3({ detail: { message: `unknown product_id: ${body.product_id}` } }, 400);
      }
      if (!CHECKOUT_READY_PRODUCTS.has(body.product_id)) {
        return jsonResponse3({ detail: { message: `${body.product_id} isn't available for self-checkout yet - email hello@weylandai.com` } }, 409);
      }
      const quantity = Math.max(1, Math.min(250, Number.parseInt(body.quantity, 10) || 1));
      // Fixed, not derived from the request's Host header - this worker is
      // also reachable at its own *.workers.dev URL with an arbitrary Host
      // header, which would otherwise let an attacker steer a real paying
      // customer's post-Stripe-checkout redirect to an external domain.
      const baseUrl = "https://weylandai.com";

      // Routes through vendyai-com-worker (real service binding, added
      // 2026-09-03 per John's directive: all ventures sell through vendyai)
      // instead of calling Stripe directly. This used to bypass vendyai
      // deliberately (see the 2026-08-31 comment above WEYLAND_SUBCONP_PRICE_ID)
      // because vendyai had no working implementation and AuthFor looked
      // dead at the time - both are since confirmed real and live, so the
      // reason for the bypass no longer holds. Contract unchanged for the
      // caller (/pricing's JS): same request/response shape as before.
      const vendyaiResp = await env2.VENDYAI.fetch("https://vendyai-com-worker.internal/api/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venture_id: "weylandai",
          mode: "subscription",
          success_url: `${baseUrl}/subscribe?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/subscribe?checkout=cancelled`,
          line_items: [{ price: productCfg.priceId, quantity }],
          metadata: { product_id: body.product_id, seats: String(quantity) }
        })
      });
      const vendyaiData = await vendyaiResp.json();
      if (!vendyaiResp.ok) {
        console.error("[Billing] vendyai checkout create error:", JSON.stringify(vendyaiData));
        return jsonResponse3({ detail: { message: vendyaiData?.error?.message || "checkout session creation failed" } }, 502);
      }

      return jsonResponse3({ checkout_url: vendyaiData.session.url, session_id: vendyaiData.session.id }, 201);
    } catch (err) {
      console.error("[Billing] checkout create error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });
  router.get("/api/billing/checkout/status/:session_id", async (request2, env2) => {
    const sessionId = request2.params?.session_id;
    if (!sessionId) return jsonResponse3({ status: "unknown" }, 400);
    try {
      if (env2.CACHE) {
        const cached = await env2.CACHE.get(`checkout_status:${sessionId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const headers = { "Content-Type": "application/json" };
          // Self-serve sign-in: the webhook already created a real weyland_sessions
          // row (parsed.session_id) - hand it to the browser as a cookie here so
          // payment -> signed-in happens automatically, no manual founder onboarding.
          if (parsed.status === "active" && parsed.session_id) {
            headers["Set-Cookie"] = `weyland_session=${parsed.session_id}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`;
          }
          return new Response(JSON.stringify({ status: parsed.status, quantity: parsed.quantity }), { status: 200, headers });
        }
      }
      return jsonResponse3({ status: "pending" });
    } catch (err) {
      console.error("[Billing] status lookup error:", err.message);
      return jsonResponse3({ status: "pending" });
    }
  });
}
