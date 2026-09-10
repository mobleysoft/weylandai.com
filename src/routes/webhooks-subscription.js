import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Real financial webhook handler - extracted verbatim, no logic
 * changes. Provisions/updates real user subscriptions from real Stripe
 * events (forwarded via vendyai or, as a legacy fallback, direct).
 *
 * verifyVendyaiForwardSignature and verifyStripeWebhookSignature (HMAC
 * signature verification, security-critical) each had their only real
 * call site inside this extraction - fully orphaned, same as
 * arrayBufferToHex/sanitizeDisplayName in earlier extractions - but
 * deliberately kept as injected deps (defined in legacy-monolith.js)
 * rather than inlined/copied: this is security-critical HMAC
 * verification code, and re-transcribing it is exactly the kind of
 * place a subtle error would silently defeat webhook signature
 * checking. Same conservative reasoning as billing.js's
 * stripeRequest/CHECKOUT_READY_PRODUCTS. WEYLAND_SUBCONP_PRODUCT_ID
 * has 2 other real call sites remaining in legacy-monolith.js (inside
 * WEYLAND_PRODUCTS/CHECKOUT_READY_PRODUCTS, which stay there), so it
 * must stay injected regardless. WEYLAND_PRODUCTS reuses the dep
 * already established by billing.js.
 *
 * @param {object} router
 * @param {{ WEYLAND_PRODUCTS: object, WEYLAND_SUBCONP_PRODUCT_ID: string, verifyVendyaiForwardSignature: Function, verifyStripeWebhookSignature: Function }} deps
 */
export function registerWebhooksSubscriptionRoutes(router, { WEYLAND_PRODUCTS, WEYLAND_SUBCONP_PRODUCT_ID, verifyVendyaiForwardSignature, verifyStripeWebhookSignature }) {
  router.post("/api/webhooks/subscription", async (request2, env2) => {
    try {
      const rawBody = await request2.text();
      const vendyaiSig = request2.headers.get("X-Webhook-Signature") || "";
      const vendyaiTs = request2.headers.get("X-Webhook-Timestamp") || "";
      const stripeSig = request2.headers.get("Stripe-Signature") || "";
      if (vendyaiSig) {
        // Real traffic path since the 2026-09-03 vendyai migration: Stripe
        // calls vendyai.com, vendyai forwards here with its own signature.
        if (!env2.SUBSCRIPTION_WEBHOOK_SECRET) {
          console.warn("[Webhook] SUBSCRIPTION_WEBHOOK_SECRET not configured - rejecting unverifiable vendyai forward");
          return jsonResponse3({ error: "Webhook verification not configured" }, 500);
        }
        const check = await verifyVendyaiForwardSignature(rawBody, vendyaiTs, vendyaiSig, env2.SUBSCRIPTION_WEBHOOK_SECRET);
        if (!check.valid) {
          console.warn("[Webhook] Invalid vendyai forward signature:", check.reason);
          return jsonResponse3({ error: "Invalid signature", reason: check.reason }, 401);
        }
      } else if (stripeSig) {
        // Legacy/fallback path - Stripe calling this endpoint directly, in
        // case that's ever reconfigured. Kept working, not removed.
        if (!env2.STRIPE_WEBHOOK_SECRET) {
          console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured - rejecting unverifiable webhook");
          return jsonResponse3({ error: "Webhook verification not configured" }, 500);
        }
        const check = await verifyStripeWebhookSignature(rawBody, stripeSig, env2.STRIPE_WEBHOOK_SECRET);
        if (!check.valid) {
          console.warn("[Webhook] Invalid Stripe signature:", check.reason);
          return jsonResponse3({ error: "Invalid signature", reason: check.reason }, 401);
        }
      } else {
        console.warn("[Webhook] No recognized signature header present - rejecting");
        return jsonResponse3({ error: "Missing signature" }, 401);
      }
      // vendyai's forward body is { type, data }, mirroring Stripe's own
      // { type, data: { object } } shape closely enough that the rest of
      // this handler (which reads event.type and event.data.object) works
      // for both without further branching - data.object below covers the
      // vendyai-forward's `data` itself since vendyai already forwards the
      // session fields flat under `data`.
      const parsedBody = JSON.parse(rawBody);
      const event = vendyaiSig ? { type: parsedBody.type, data: { object: parsedBody.data } } : parsedBody;
      const eventType = event.type;
      const obj = event.data?.object || {};
      console.log(`[Webhook] Received: ${eventType} (${obj.id || "no-id"})`);

      // Idempotency: Stripe does not guarantee exactly-once delivery, and can
      // redeliver events out of order. Without this, a stale redelivered event
      // arriving after a newer one silently overwrites subscription_tier /
      // submittals_limit with older values. INSERT OR IGNORE keyed on the
      // Stripe event id itself (not obj.id, which repeats across event types)
      // makes "already processed this exact event" a single atomic check.
      if (event.id) {
        const dedupe = await env2.DB.prepare(
          "INSERT OR IGNORE INTO processed_webhook_events (event_id, event_type) VALUES (?, ?)"
        ).bind(event.id, eventType).run();
        if (dedupe.meta.changes === 0) {
          console.log(`[Webhook] Duplicate event ${event.id} (${eventType}) - already processed, skipping.`);
          return jsonResponse3({ received: true, duplicate: true });
        }
      } else {
        console.warn("[Webhook] Event has no id - cannot dedupe, processing anyway:", eventType);
      }

      switch (eventType) {
        case "checkout.session.completed": {
          if (obj.mode !== "subscription") break;
          const email = obj.customer_details?.email || obj.customer_email;
          if (!email) {
            console.error("[Webhook] checkout.session.completed with no email:", obj.id);
            break;
          }
          // Fixed 2026-09-09: this used to make its own direct Stripe API
          // call (stripeRequest, this worker's own STRIPE_SECRET_KEY) just to
          // learn the seat quantity - redundant and a real direct-Stripe
          // dependency this worker shouldn't have at all now that checkout
          // creation routes through vendyai. checkout/create already stamps
          // metadata.seats at session-creation time (see
          // router.post("/api/billing/checkout/create")) - it was sitting
          // right there in the same event unused.
          const quantity = Number.parseInt(obj.metadata?.seats, 10) || 1;

          // Real AuthFor identity. /api/v1/register returns a real
          // {token, session_id, refresh_token} in the same response for a
          // brand-new account - capture it and use it below instead of
          // discarding it and self-minting an unrelated local session, which
          // is what this code did until 2026-09-09.
          //
          // Known real limitation, not silently papered over: for a
          // RETURNING customer, register fails with USER_EXISTS (their real
          // AuthFor password isn't this freshly-generated random one, and
          // AuthFor has no passwordless service-to-service session-issuance
          // endpoint today - /api/v1/sso/issue requires the caller to already
          // hold a valid AuthFor token, which this webhook doesn't have, and
          // /api/v1/auth/magic-link requires an email round-trip, not a
          // synchronous webhook response). Returning customers still fall
          // back to a local-only session below. The real fix is a genuine
          // AuthFor platform capability - a trusted-service session-issuance
          // endpoint for a venture backend that has already verified the
          // customer by other means (here, a completed Stripe payment) - not
          // a weylandai-local workaround. Tracked as a real open item, not
          // fixed in this pass.
          let authforSession = null;
          try {
            const registerResp = await fetch("https://authfor.com/api/v1/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                password: crypto.randomUUID() + crypto.randomUUID(),
                name: obj.customer_details?.name || email,
                client_id: "af_weyland_subscribe",
                venture_id: "weylandai.com"
              })
            });
            if (registerResp.ok) {
              const registerData = await registerResp.json();
              if (registerData && registerData.session_id) {
                authforSession = { session_id: registerData.session_id, token: registerData.token };
              }
            }
          } catch (e) {
            console.error("[Webhook] AuthFor register call failed:", e.message);
          }

          // Which product was actually purchased - checkout/create stamps this
          // in metadata; fall back to the suite for older sessions created
          // before this field existed.
          const purchasedProductId = obj.metadata?.product_id || WEYLAND_SUBCONP_PRODUCT_ID;
          const purchasedCfg = WEYLAND_PRODUCTS[purchasedProductId] || WEYLAND_PRODUCTS[WEYLAND_SUBCONP_PRODUCT_ID];
          const isSuite = purchasedCfg.tier === null;

          const now = (/* @__PURE__ */ new Date()).toISOString();
          const existing = await env2.DB.prepare("SELECT id, subscription_tier, products_enabled FROM users WHERE email = ?").bind(email).first();
          const userId = existing?.id || crypto.randomUUID();
          // Suite purchase grants everything (subscription_tier='subconp',
          // checked directly in requireProductAccess) - standalone purchases
          // add just their own tier slug to products_enabled, merged with
          // whatever the customer already had so buying a second standalone
          // product doesn't clobber the first.
          const newTier = isSuite ? "subconp" : existing?.subscription_tier === "subconp" ? "subconp" : "standalone";
          let newProductsEnabled = existing?.products_enabled || "";
          if (!isSuite) {
            const set = new Set(newProductsEnabled.split(",").map((s) => s.trim()).filter(Boolean));
            set.add(purchasedCfg.tier);
            newProductsEnabled = Array.from(set).join(",");
          }
          if (existing) {
            await env2.DB.prepare(`
              UPDATE users SET subscription_status='active', subscription_tier=?, products_enabled=?,
                submittals_limit=?, stripe_customer_id=?, updated_at=? WHERE id=?
            `).bind(newTier, newProductsEnabled, quantity * 50, obj.customer || null, now, userId).run();
          } else {
            await env2.DB.prepare(`
              INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit, stripe_customer_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
            `).bind(userId, email, obj.customer_details?.name || email, newTier, newProductsEnabled, quantity * 50, obj.customer || null, now, now).run();
          }

          // Local session cache so the existing cookie-based authenticate()
          // path works unmodified - separate random id, never the exposed
          // cs_ value. When authforSession is set (new account this purchase),
          // this row is a real cache OF a genuine AuthFor session, not a
          // disconnected local identity - the AuthFor session_id/token are
          // embedded in player_json so this is traceable/revocable against
          // AuthFor, not just locally. When authforSession is null (returning
          // customer, see the comment above), this remains local-only - a
          // known, stated limitation, not fixed by this change.
          const sessionId = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString();
          await env2.DB.prepare(`
            INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(sessionId, userId, email, JSON.stringify({
            name: obj.customer_details?.name || email,
            role: "member",
            authfor_session_id: authforSession?.session_id || null,
            authfor_backed: !!authforSession
          }), expiresAt).run();

          if (env2.CACHE) {
            await env2.CACHE.put(`checkout_status:${obj.id}`, JSON.stringify({
              status: "active", quantity, session_id: sessionId
            }), { expirationTtl: 3600 });
          }
          console.log(`[Webhook] Provisioned user ${userId} (${email}) for checkout ${obj.id}, ${quantity} seat(s)`);
          break;
        }
        case "customer.subscription.updated": {
          const stripeCustomerId = obj.customer;
          if (!stripeCustomerId) break;
          const statusMap = { active: "active", past_due: "past_due", canceled: "cancelled", unpaid: "past_due", trialing: "trial" };
          const newStatus = statusMap[obj.status] || obj.status;
          await env2.DB.prepare(`UPDATE users SET subscription_status=?, updated_at=? WHERE stripe_customer_id=?`)
            .bind(newStatus, (/* @__PURE__ */ new Date()).toISOString(), stripeCustomerId).run();
          console.log(`[Webhook] Updated subscription status to ${newStatus} for customer ${stripeCustomerId}`);
          break;
        }
        case "customer.subscription.deleted": {
          const stripeCustomerId = obj.customer;
          if (!stripeCustomerId) break;
          await env2.DB.prepare(`UPDATE users SET subscription_status='cancelled', updated_at=? WHERE stripe_customer_id=?`)
            .bind((/* @__PURE__ */ new Date()).toISOString(), stripeCustomerId).run();
          console.log(`[Webhook] Cancelled subscription for customer ${stripeCustomerId}`);
          break;
        }
        case "invoice.payment_failed": {
          const stripeCustomerId = obj.customer;
          if (!stripeCustomerId) break;
          await env2.DB.prepare(`UPDATE users SET subscription_status='past_due', updated_at=? WHERE stripe_customer_id=?`)
            .bind((/* @__PURE__ */ new Date()).toISOString(), stripeCustomerId).run();
          console.log(`[Webhook] Payment failed for customer ${stripeCustomerId}`);
          break;
        }
        default:
          console.log(`[Webhook] Unhandled event type: ${eventType}`);
      }
      return jsonResponse3({ received: true });
    } catch (err) {
      console.error("[Webhook] Processing error:", err);
      return jsonResponse3({ error: "Webhook processing failed" }, 500);
    }
  });
}
