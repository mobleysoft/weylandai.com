// weyland-platform-worker/src/routes/billing.js
//
// Self-contained fork of ../../../src/routes/billing.js, copied verbatim.
// THE real checkout path: GET /api/billing/catalog (direct Stripe read,
// needs env.STRIPE_SECRET_KEY), POST /api/billing/checkout/create (routes
// through the real env.VENDYAI service binding - 'all ventures sell
// through vendyai' per John's 2026-09-03 directive - not a direct Stripe
// call), GET /api/billing/checkout/status/:session_id (polls env.CACHE,
// sets the weyland_session cookie on success). WEYLAND_PRODUCTS /
// CHECKOUT_READY_PRODUCTS / stripeRequest now come from this Worker's own
// ../lib/stripe-billing.js fork instead of being injected from
// legacy-monolith.js's top level.
//
// 2026-10-07 (payment embedded in the page, no page hop):
//   POST /api/billing/checkout/embedded     - Stripe embedded Checkout session
//                                             for any checkout-ready SKU;
//                                             returns the client secret.
//   GET  /api/billing/checkout/session/:id  - Stripe's view of a session
//                                             (open / complete / expired).
//   GET  /api/billing/embedded-checkout.js  - the browser helper
//                                             (lib/embedded-checkout-client.js).
//   POST /api/billing/checkout/create (hosted, unchanged response) now sends
//   success and cancel back to the page the visitor started from instead of
//   /subscribe (the $2,000 SubConP page) whatever was being bought.
//
// Embedded sessions are created here against Stripe directly (the same live
// account vendyai uses, this worker's own STRIPE_SECRET_KEY) because
// vendyai's POST /api/checkout/sessions only builds hosted sessions (it
// requires success_url + cancel_url and has no ui_mode / return_url /
// client_secret). metadata.venture_id = "weylandai" is set exactly as vendyai
// sets it, so vendyai's Stripe webhook still forwards checkout.session.completed
// to weylandai's /api/webhooks/subscription and provisioning is unchanged.
//
// Original header follows, preserved for provenance:
//
import { jsonResponse3 } from "../lib/json-response.js";
import { authenticate } from "../lib/auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { stripeApi, STRIPE_EMBEDDED_API_VERSION, STRIPE_JS_URL } from "../lib/stripe-api.js";
import { hostedReturnUrls, embeddedReturnUrl } from "../lib/checkout-return.js";
import { EMBEDDED_CHECKOUT_JS } from "../lib/embedded-checkout-client.js";

// The account behind the request, if any: its email goes to Stripe so the
// purchase lands on the same users row (the provisioning webhook matches
// users by checkout email). Anonymous visitors simply type theirs.
async function signedInBuyer(request2, env2) {
  try {
    const hasCookie = /weyland_session=/.test(request2.headers.get("Cookie") || "");
    const hasBearer = /^Bearer\s+\S/i.test(request2.headers.get("Authorization") || "");
    if (!hasCookie && !hasBearer) return null;
    const { user } = await authenticate(request2, env2);
    if (!user?.userId || user.ephemeral) return null;
    const row = await env2.DB.prepare("SELECT id, email, stripe_customer_id FROM users WHERE id = ?").bind(user.userId).first();
    return row?.email ? { userId: row.id, email: row.email, customerId: row.stripe_customer_id || null } : null;
  } catch {
    return null;
  }
}

// Price facts for the form header and the trial (cached per isolate).
const priceCache = new Map();
async function priceFacts(env2, stripeRequest, priceId) {
  const hit = priceCache.get(priceId);
  if (hit && hit.until > Date.now()) return hit.value;
  const price = await stripeRequest(env2, "GET", `/prices/${priceId}?expand[]=product`);
  const value = {
    unit_amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval || null,
    trial_period_days: price.recurring?.trial_period_days || null,
    name: typeof price.product === "object" && price.product ? price.product.name : null,
    active: price.active === true
  };
  priceCache.set(priceId, { value, until: Date.now() + 10 * 60 * 1000 });
  return value;
}

function productCheck(body, WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS) {
  const productCfg = WEYLAND_PRODUCTS[body.product_id];
  if (!productCfg) {
    return { error: jsonResponse3({ detail: { message: `unknown product_id: ${body.product_id}` } }, 400) };
  }
  if (!CHECKOUT_READY_PRODUCTS.has(body.product_id)) {
    return { error: jsonResponse3({ detail: { message: `${body.product_id} isn't available for self-checkout yet - email hello@weylandai.com` } }, 409) };
  }
  return { productCfg };
}

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
          checkout_ready: price.active === true && CHECKOUT_READY_PRODUCTS.has(productId),
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
      const { productCfg, error } = productCheck(body, WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS);
      if (error) return error;
      const quantity = Math.max(1, Math.min(250, Number.parseInt(body.quantity, 10) || 1));
      // Success and cancel go back to the page the visitor started from (the
      // page's own success_url / cancel_url / return_to, else the Referer),
      // validated to https://weylandai.com - never derived from the Host
      // header (this worker is also reachable at its *.workers.dev URL with
      // an arbitrary Host, which would otherwise let an attacker steer a real
      // paying customer's post-checkout redirect off-site).
      const urls = hostedReturnUrls(request2, body);
      const buyer = await signedInBuyer(request2, env2);

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
          customer_email: buyer?.email,
          // The signed-in account (vendyai passes it to Stripe since 2026-10-07):
          // the payment webhook grants the purchase to it and signs that browser in.
          client_reference_id: buyer?.userId,
          success_url: urls.success_url,
          cancel_url: urls.cancel_url,
          line_items: [{ price: productCfg.priceId, quantity }],
          metadata: { product_id: body.product_id, seats: String(quantity), start_path: urls.start.slice(0, 450) }
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

  // Embedded checkout: the payment form renders inside the page (Stripe's
  // embedded Checkout), so paying never leaves weylandai.com. Contract:
  //   POST { product_id, quantity?=1 (1..250), return_to?="/path?q#h" }
  //   201  { client_secret, session_id, publishable_key, stripe_js, mount,
  //          product:{id,name,unit_amount,currency,interval,trial_period_days},
  //          amount_total, currency, return_url, status_url, session_url }
  router.post("/api/billing/checkout/embedded", async (request2, env2) => {
    try {
      const body = await request2.json().catch(() => ({}));
      const { productCfg, error } = productCheck(body, WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS);
      if (error) return error;
      if (!env2.STRIPE_SECRET_KEY || !env2.STRIPE_PUBLISHABLE_KEY) {
        return jsonResponse3({ detail: { message: "embedded checkout is not configured - email hello@weylandai.com" } }, 503);
      }
      const ip = request2.headers.get("CF-Connecting-IP") || "unknown";
      const rl = await checkRateLimit(ip, "embedded-checkout", env2, { requests: 20, windowSeconds: 60 });
      if (rl.limited) {
        return new Response(JSON.stringify({ detail: { message: "Too many checkout attempts - wait a minute and try again." } }), {
          status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter || 60) }
        });
      }
      const quantity = Math.max(1, Math.min(250, Number.parseInt(body.quantity, 10) || 1));
      const { start, return_url } = embeddedReturnUrl(request2, body);
      const [buyer, price] = await Promise.all([
        signedInBuyer(request2, env2),
        priceFacts(env2, stripeRequest, productCfg.priceId).catch((e) => { console.error("[Billing] price lookup failed:", e.message); return null; })
      ]);
      const metadata = { venture_id: "weylandai", product_id: body.product_id, seats: String(quantity), ui: "embedded", start_path: start.slice(0, 450) };
      // user_id: the account a later cancellation or failed payment belongs to
      // (routes/webhooks-subscription.js finds it by the subscription first).
      const subscriptionData = { metadata: { venture_id: "weylandai", product_id: body.product_id, seats: String(quantity), user_id: buyer?.userId } };
      // Same trial the hosted page shows (SubConP: 30 days), stated explicitly.
      if (price?.trial_period_days) subscriptionData.trial_period_days = price.trial_period_days;
      const params = {
        ui_mode: "embedded_page",
        mode: "subscription",
        line_items: [{ price: productCfg.priceId, quantity }],
        return_url,
        // Completion is handled in the page (onComplete); only payment methods
        // that must leave for a bank or wallet page come back via return_url.
        redirect_on_completion: "if_required",
        customer_email: buyer?.email,
        client_reference_id: buyer?.userId,
        metadata,
        subscription_data: subscriptionData
      };
      // A signed-in account that already pays for something buys under the same
      // Stripe customer, so the billing portal (POST /api/subscription/portal)
      // shows all of its subscriptions, not just the newest one. If Stripe
      // refuses that customer, the checkout goes ahead by email as before.
      let session;
      if (buyer?.customerId) {
        const { customer_email, ...withCustomer } = params;
        try {
          session = await stripeApi(env2, "POST", "/checkout/sessions", { ...withCustomer, customer: buyer.customerId });
        } catch (err) {
          if (!(err.status >= 400 && err.status < 500)) throw err;
          console.warn("[Billing] existing customer refused, checking out by email:", err.stripeError?.code || err.status);
        }
      }
      if (!session) session = await stripeApi(env2, "POST", "/checkout/sessions", params);
      return jsonResponse3({
        client_secret: session.client_secret,
        session_id: session.id,
        publishable_key: env2.STRIPE_PUBLISHABLE_KEY,
        stripe_js: STRIPE_JS_URL,
        stripe_api_version: STRIPE_EMBEDDED_API_VERSION,
        mount: "createEmbeddedCheckoutPage",
        product: {
          id: body.product_id,
          name: price?.name || null,
          unit_amount: price?.unit_amount ?? null,
          currency: price?.currency || session.currency || null,
          interval: price?.interval || null,
          trial_period_days: price?.trial_period_days || null
        },
        quantity,
        amount_total: session.amount_total ?? null,
        currency: session.currency ?? null,
        signed_in_email: buyer ? true : false,
        return_url,
        status_url: `/api/billing/checkout/status/${session.id}`,
        session_url: `/api/billing/checkout/session/${session.id}`
      }, 201);
    } catch (err) {
      console.error("[Billing] embedded checkout error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  // Stripe's own state of a weylandai checkout session, for the return page
  // and for the in-page completion check. No customer data is returned.
  router.get("/api/billing/checkout/session/:session_id", async (request2, env2) => {
    const sessionId = request2.params?.session_id || "";
    if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
      return jsonResponse3({ detail: { message: "not a checkout session id" } }, 400);
    }
    try {
      const s = await stripeApi(env2, "GET", `/checkout/sessions/${sessionId}`);
      if (s.metadata?.venture_id !== "weylandai") return jsonResponse3({ detail: { message: "no such checkout session" } }, 404);
      let provisioned = null;
      if (env2.CACHE) {
        const cached = await env2.CACHE.get(`checkout_status:${sessionId}`);
        if (cached) {
          try { const p = JSON.parse(cached); provisioned = { status: p.status, quantity: p.quantity }; } catch {}
        }
      }
      return jsonResponse3({
        session_id: s.id,
        status: s.status,
        payment_status: s.payment_status,
        ui_mode: s.ui_mode,
        product_id: s.metadata?.product_id || null,
        seats: Number.parseInt(s.metadata?.seats, 10) || null,
        amount_total: s.amount_total ?? null,
        currency: s.currency ?? null,
        provisioned
      });
    } catch (err) {
      if (err.status === 404) return jsonResponse3({ detail: { message: "no such checkout session" } }, 404);
      console.error("[Billing] session lookup error:", err.message);
      return jsonResponse3({ detail: { message: err.message } }, 502);
    }
  });

  router.get("/api/billing/embedded-checkout.js", () => new Response(EMBEDDED_CHECKOUT_JS, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  }));

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
          // 2026-10-07: the webhook only creates that row for an account the
          // checkout created or the signed-in buyer's own account; a purchase
          // that typed an existing account's email answers signed_in:false and
          // the buyer signs in with that email (routes/webhooks-subscription.js).
          const signedIn = parsed.status === "active" && !!parsed.session_id;
          if (signedIn) {
            headers["Set-Cookie"] = `weyland_session=${parsed.session_id}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`;
          }
          return new Response(JSON.stringify({ status: parsed.status, quantity: parsed.quantity, signed_in: signedIn }), { status: 200, headers });
        }
      }
      return jsonResponse3({ status: "pending" });
    } catch (err) {
      console.error("[Billing] status lookup error:", err.message);
      return jsonResponse3({ status: "pending" });
    }
  });
}
