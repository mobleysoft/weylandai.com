// weyland-platform-worker/src/routes/billing.js
//
// Buying, in the page (no page hop; John, 2026-10-06 and 2026-10-07):
//   GET  /api/billing/catalog               - every SKU's live price (lib/catalog.js, cached).
//   POST /api/billing/checkout/embedded     - Stripe embedded Checkout session for a
//                                             checkout-ready SKU; returns the client secret.
//                                             The $100 first-submittal offer is a one-time
//                                             payment, everything else a monthly plan.
//                                             Terms acceptance is required and stored.
//   GET  /api/billing/checkout/session/:id  - Stripe's view of a session (open / complete / expired).
//   GET  /api/billing/checkout/status/:id   - what the payment webhook made of it: pending,
//                                             active (granted; signs the paying browser in when
//                                             the purchase created its account), or held.
//   POST /api/billing/claims                - grant purchases held for the signed-in account's email.
//   GET  /api/billing/embedded-checkout.js  - the browser helper (lib/embedded-checkout-client.js).
//   POST /api/billing/checkout/create       - 410: hosted Checkout (checkout.stripe.com) removed
//                                             2026-10-07, its last callers were /pricing's old
//                                             inline script and /subscribe's /assets/subscribe.js.
//
// Every embedded session is created with redirect_on_completion "never": Stripe
// never sends the buyer anywhere (no return_url; redirect-based payment methods
// are not offered), completion is handled in the page.
//
// Sessions are created against Stripe directly (the same live account vendyai
// uses, this worker's own STRIPE_SECRET_KEY) with metadata.venture_id =
// "weylandai", so vendyai's Stripe webhook forwards the completion to
// /api/webhooks/subscription (routes/webhooks-subscription.js).
//
// Provenance: forked 2026-09 from the monolith's src/routes/billing.js; the
// hosted path through vendyai (2026-09-03) is gone.

import { jsonResponse3 } from "../lib/json-response.js";
import { authenticate } from "../lib/auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { stripeApi, STRIPE_EMBEDDED_API_VERSION, STRIPE_JS_URL } from "../lib/stripe-api.js";
import { startPathFor } from "../lib/checkout-return.js";
import { embeddedCheckoutJs } from "../lib/embedded-checkout-client.js";
import { getCatalog, byId, dollars } from "../lib/catalog.js";
import { isOfferProduct, OFFER_ACCESS_DAYS } from "../lib/stripe-billing.js";
import { getPurchase, purchasesForUser, maskEmail, PURCHASE_KINDS } from "../lib/purchases-store.js";
import { claimHeldPurchases, claimIdsFromRequest, claimCookie } from "../lib/grants.js";
import { termsUrls } from "../lib/legal.js";

// The account behind the request, if any: its email goes to Stripe and its id
// to client_reference_id, so the purchase lands on the same users row.
// Anonymous visitors simply type their email.
export async function signedInBuyer(request2, env2) {
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

function productCheck(body, WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS) {
  const productCfg = WEYLAND_PRODUCTS[body.product_id];
  if (!productCfg) {
    return { error: jsonResponse3({ detail: { code: "unknown_product", message: `unknown product_id: ${body.product_id}` } }, 400) };
  }
  if (!CHECKOUT_READY_PRODUCTS.has(body.product_id)) {
    return { error: jsonResponse3({ detail: { code: "not_sold", message: `${body.product_id} is not sold yet.` } }, 409) };
  }
  return { productCfg };
}

// Text Stripe shows beside the pay button (custom_text.submit, max 1200 characters).
const OFFER_SUBMIT_TEXT = "One-time payment of $100 for your first submittal and 30 days of every WeylandAI product. No automatic charge: before the 30 days end we ask you to choose a plan; without one, the paid tools stop and your account and work stay.";
const PLAN_SUBMIT_TEXT = "Billed today and then monthly until you cancel. Cancel any time in your WeylandAI account; you keep access until the end of the paid month.";

/** Has this account already bought the first-submittal offer? */
async function offerAlreadyBought(env2, userId) {
  if (!userId) return false;
  const purchases = await purchasesForUser(env2.DB, userId);
  return purchases.some((p) => p.kind === PURCHASE_KINDS.OFFER && p.status !== "held");
}

/**
 * @param {object} router
 * @param {{ WEYLAND_PRODUCTS: object, CHECKOUT_READY_PRODUCTS: Set }} deps
 */
export function registerBillingRoutes(router, { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS }) {
  router.get("/api/billing/catalog", async (request2, env2, ctx) => {
    const catalog = await getCatalog(env2, ctx);
    return new Response(JSON.stringify({ products: catalog.products, fetched_at: catalog.fetched_at }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
    });
  });

  // Hosted Checkout (a page on checkout.stripe.com) is gone: payment happens in the page.
  router.post("/api/billing/checkout/create", () => jsonResponse3({
    error: "hosted_checkout_removed",
    message: "Checkout happens inside the page now.",
    use: "WeylandCheckout.open({product_id}) from /api/billing/embedded-checkout.js (POST /api/billing/checkout/embedded)"
  }, 410));

  // Embedded checkout: the payment form renders inside the page (Stripe's
  // embedded Checkout), so paying never leaves weylandai.com. Contract:
  //   POST { product_id, quantity?=1 (1..250; the offer is always 1), return_to?, terms_accepted:true }
  //   201  { client_secret, session_id, publishable_key, stripe_js, stripe_api_version, mount, mode,
  //          product:{id,name,unit_amount,currency,interval,one_time,trial_period_days:null},
  //          quantity, amount_total, currency, signed_in_email, status_url, session_url,
  //          terms:{url, privacy_url, accepted_at} }
  //   400  {detail:{code:"terms_required"|"unknown_product"}}  409 {detail:{code:"offer_used"|"not_sold"}}
  router.post("/api/billing/checkout/embedded", async (request2, env2, ctx) => {
    try {
      const body = await request2.json().catch(() => ({}));
      const { productCfg, error } = productCheck(body, WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS);
      if (error) return error;
      if (!env2.STRIPE_SECRET_KEY || !env2.STRIPE_PUBLISHABLE_KEY) {
        return jsonResponse3({ detail: { code: "not_configured", message: "Checkout is not configured right now." } }, 503);
      }
      const legal = termsUrls(env2);
      if (body.terms_accepted !== true) {
        return jsonResponse3({ detail: { code: "terms_required", message: "Accept the Terms of Service and the Privacy Policy to continue.", terms_url: legal.terms_url, privacy_url: legal.privacy_url } }, 400);
      }
      const ip = request2.headers.get("CF-Connecting-IP") || "unknown";
      const rl = await checkRateLimit(ip, "embedded-checkout", env2, { requests: 20, windowSeconds: 60 });
      if (rl.limited) {
        return new Response(JSON.stringify({ detail: { code: "rate_limited", message: "Too many checkout attempts - wait a minute and try again." } }), {
          status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter || 60) }
        });
      }
      const offer = isOfferProduct(body.product_id);
      const quantity = offer ? 1 : Math.max(1, Math.min(250, Number.parseInt(body.quantity, 10) || 1));
      const start = startPathFor(request2, body);
      const buyer = await signedInBuyer(request2, env2);
      if (offer && buyer && await offerAlreadyBought(env2, buyer.userId)) {
        return jsonResponse3({ detail: { code: "offer_used", message: "This account already has its first submittal. Choose a plan to keep every product." } }, 409);
      }
      const catalog = await getCatalog(env2, ctx).catch((e) => { console.error("[Billing] catalog unavailable:", e.message); return null; });
      const price = catalog ? byId(catalog)[body.product_id] || null : null;
      const acceptedAt = new Date().toISOString();
      const metadata = {
        venture_id: "weylandai", product_id: body.product_id, seats: String(quantity), ui: "embedded", start_path: start.slice(0, 450),
        terms_url: legal.terms_url, privacy_url: legal.privacy_url, terms_accepted_at: acceptedAt
      };
      const params = {
        ui_mode: "embedded_page",
        // Never redirect: completion is handled in the page (onComplete), and
        // Stripe does not offer payment methods that would leave for a bank page.
        redirect_on_completion: "never",
        line_items: [{ price: productCfg.priceId, quantity }],
        customer_email: buyer?.email,
        client_reference_id: buyer?.userId,
        metadata
      };
      if (offer) {
        Object.assign(params, {
          mode: "payment",
          submit_type: "pay",
          // Cards (and card wallets) only: a finished session is a paid one, so the
          // webhook can grant on completion.
          allowed_payment_method_types: ["card"],
          customer_creation: "always",
          payment_intent_data: {
            description: "WeylandAI first submittal + 30 days of every product",
            metadata: { venture_id: "weylandai", product_id: body.product_id, user_id: buyer?.userId }
          },
          // An invoice (with its PDF) for the account view, like every plan payment has.
          invoice_creation: {
            enabled: true,
            invoice_data: {
              description: `WeylandAI first submittal, including ${OFFER_ACCESS_DAYS} days of every WeylandAI product. One-time payment; no automatic charge.`,
              metadata: { venture_id: "weylandai", product_id: body.product_id },
              footer: "WeylandAI is operated by Argo LLC."
            }
          },
          custom_text: { submit: { message: OFFER_SUBMIT_TEXT } }
        });
      } else {
        Object.assign(params, {
          mode: "subscription",
          // user_id: the account a later cancellation or failed payment belongs to
          // (routes/webhooks-subscription.js finds it by the subscription first).
          // No trial (2026-10-07): a plan is paid from the day it is chosen; the
          // free month exists only through the $100 offer.
          subscription_data: { metadata: { venture_id: "weylandai", product_id: body.product_id, seats: String(quantity), user_id: buyer?.userId } },
          custom_text: { submit: { message: PLAN_SUBMIT_TEXT } }
        });
      }
      // A signed-in account that already pays for something buys under the same
      // Stripe customer, so the account view lists everything it pays for under
      // one card. If Stripe refuses that customer, the checkout goes ahead by email.
      let session;
      if (buyer?.customerId) {
        const { customer_email, customer_creation, ...withCustomer } = params;
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
        mode: offer ? "payment" : "subscription",
        product: {
          id: body.product_id,
          name: price?.name || null,
          unit_amount: price?.unit_amount ?? null,
          currency: price?.currency || session.currency || null,
          interval: offer ? null : (price?.interval || "month"),
          one_time: offer,
          trial_period_days: null
        },
        quantity,
        amount_total: session.amount_total ?? null,
        currency: session.currency ?? null,
        signed_in_email: buyer ? true : false,
        status_url: `/api/billing/checkout/status/${session.id}`,
        session_url: `/api/billing/checkout/session/${session.id}`,
        terms: { url: legal.terms_url, privacy_url: legal.privacy_url, accepted_at: acceptedAt }
      }, 201);
    } catch (err) {
      console.error("[Billing] embedded checkout error:", err.message);
      return jsonResponse3({ detail: { code: "stripe_error", message: err.message } }, 502);
    }
  });

  // Stripe's own state of a weylandai checkout session, for the in-page
  // completion check. No customer data is returned.
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
        mode: s.mode,
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

  router.get("/api/billing/embedded-checkout.js", (request2, env2) => new Response(embeddedCheckoutJs(env2), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  }));

  // What the payment webhook made of a checkout, for the browser that paid:
  //   {status:"pending"}
  //   {status:"active", quantity, product_id, signed_in, access_ends_at}
  //     signed_in: this browser now holds the account's session (the purchase
  //     created the account, or the signed-in buyer's own account).
  //   {status:"held", quantity, product_id, signed_in:false, email_hint}
  //     the email belongs to an existing account: granted once the email is
  //     proven or that account signs in here (the claim cookie set below).
  router.get("/api/billing/checkout/status/:session_id", async (request2, env2) => {
    const sessionId = request2.params?.session_id;
    if (!sessionId || !/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return jsonResponse3({ status: "unknown" }, 400);
    try {
      let parsed = null;
      if (env2.CACHE) {
        const cached = await env2.CACHE.get(`checkout_status:${sessionId}`);
        if (cached) { try { parsed = JSON.parse(cached); } catch { parsed = null; } }
      }
      let purchase = null;
      if (!parsed || parsed.status === "held") {
        purchase = await getPurchase(env2.DB, sessionId).catch(() => null);
        if (!parsed && purchase) {
          parsed = purchase.status === "held"
            ? { status: "held", quantity: purchase.quantity, product_id: purchase.product_id, email_hint: maskEmail(purchase.email) }
            : purchase.status === "granted"
              ? { status: "active", quantity: purchase.quantity, product_id: purchase.product_id, session_id: null, access_ends_at: purchase.access_ends_at }
              : null;
        }
      }
      if (!parsed) return jsonResponse3({ status: "pending" });

      if (parsed.status === "held") {
        // Already signed in here as the account with that email: this is the
        // browser that paid and it has proven the account, so the purchase is its.
        const buyer = await signedInBuyer(request2, env2);
        if (buyer && purchase && purchase.status === "held" && String(buyer.email).toLowerCase() === purchase.email) {
          const r = await claimHeldPurchases(env2, { id: buyer.userId, email: buyer.email }, { sessionIds: [sessionId] });
          if (r.claimed.length) {
            const after = await getPurchase(env2.DB, sessionId);
            return jsonResponse3({ status: "active", quantity: after.quantity, product_id: after.product_id, signed_in: true, access_ends_at: after.access_ends_at || null, claimed: true });
          }
        }
        const ids = claimIdsFromRequest(request2);
        const headers = { "Content-Type": "application/json", "Set-Cookie": claimCookie([...ids, sessionId]) };
        return new Response(JSON.stringify({ status: "held", quantity: parsed.quantity, product_id: parsed.product_id || null, signed_in: false, email_hint: parsed.email_hint || null }), { status: 200, headers });
      }

      const headers = { "Content-Type": "application/json" };
      // Self-serve sign-in: the webhook created a weyland_sessions row
      // (parsed.session_id) only for an account the checkout created or the
      // signed-in buyer's own account - hand it to this browser as its cookie.
      const signedIn = parsed.status === "active" && !!parsed.session_id;
      if (signedIn) {
        headers["Set-Cookie"] = `weyland_session=${parsed.session_id}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`;
      }
      return new Response(JSON.stringify({
        status: parsed.status, quantity: parsed.quantity, signed_in: signedIn,
        product_id: parsed.product_id || null, access_ends_at: parsed.access_ends_at || null
      }), { status: 200, headers });
    } catch (err) {
      console.error("[Billing] status lookup error:", err.message);
      return jsonResponse3({ status: "pending" });
    }
  });

  // Grant the purchases held for the signed-in account's email that this
  // browser made (the claim cookie, or session_id in the body).
  //   POST {session_id?} -> {claimed:[{session_id, product_id, kind}], held:int}
  router.post("/api/billing/claims", async (request2, env2) => {
    const buyer = await signedInBuyer(request2, env2);
    if (!buyer) return jsonResponse3({ error: "Sign in to add a purchase to your account." }, 401);
    const body = await request2.json().catch(() => ({}));
    const ids = claimIdsFromRequest(request2);
    if (typeof body.session_id === "string" && /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(body.session_id)) ids.push(body.session_id);
    const r = await claimHeldPurchases(env2, { id: buyer.userId, email: buyer.email }, { sessionIds: ids });
    const headers = { "Content-Type": "application/json" };
    if (ids.length) headers["Set-Cookie"] = claimCookie(r.keepIds);
    return new Response(JSON.stringify({ claimed: r.claimed, held: r.held }), { status: 200, headers });
  });
}

export { dollars };
