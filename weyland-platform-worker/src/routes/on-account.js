// weyland-platform-worker/src/routes/on-account.js
//
// The first submittal bought on account (g052, John 2026-10-09 23:03 EDT: "the firm becomes the
// first customer on credit; the offer's held-buy path (no auto-charge, invoice on account) is the
// mechanism"). An operator records a $100 first-submittal purchase for a customer's email without a
// card:
//   POST /api/billing/on-account  (header X-WeylandAI-Operator-Secret = env.WEYLAND_OPERATOR_SECRET)
//     { email, product_id: "weyland-first-submittal", customer_name, terms_accepted_at, days_until_due?=30 }
//   -> Stripe: the customer (the account's own, else a new one named customer_name), and a one-time
//      invoice for the offer's live price with collection_method "send_invoice" (no card on file, no
//      automatic charge; Stripe emails it with its pay link, due in days_until_due days), finalized
//      and sent;
//   -> D1: a weyland_purchases row keyed by the invoice id, kind "offer", status "held" for the
//      email. It is the same held purchase a card checkout leaves for an existing account's email:
//      the account takes it when it signs in with that email proven (an emailed code; lib/grants.js
//      claimHeldPurchases), which opens the 30 days and the first-submittal credit as a paid offer
//      does. Paying the invoice later changes nothing here (the payment webhook ignores invoices
//      without a subscription); the account view lists it with its PDF (GET /api/billing/invoices).
//   201 { purchase, invoice: { id, number, status, amount_due, currency, due_date, hosted_invoice_url } }
//   200 { purchase, existing: true } when the email already has an on-account offer waiting
//   409 offer_used (the email's account already has its first submittal), 400 bad input,
//   401 wrong secret; 404 when WEYLAND_OPERATOR_SECRET is not set (at least 32 characters): the
//   route does not exist then.
// Operator-only on purpose: nothing a visitor can reach buys without paying.

import { jsonResponse3 } from "../lib/json-response.js";
import { stripeApi } from "../lib/stripe-api.js";
import { getCatalog, byId } from "../lib/catalog.js";
import { isOfferProduct, OFFER_ACCESS_DAYS } from "../lib/stripe-billing.js";
import { recordPurchase, purchasesForUser, heldPurchasesForEmail, PURCHASE_KINDS } from "../lib/purchases-store.js";
import { termsUrls } from "../lib/legal.js";

const EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;
const encoder = new TextEncoder();

/** Constant-time comparison (both sides hashed with one random key first). */
async function secretEqual(expected, given) {
  const key = await crypto.subtle.importKey("raw", crypto.getRandomValues(new Uint8Array(32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [a, b] = await Promise.all([expected, given].map((s) => crypto.subtle.sign("HMAC", key, encoder.encode(String(s)))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** 404 (no route) without a configured secret, 401 for a wrong one, 200 when it matches. */
export async function operatorAuthorized(env, request) {
  const secret = env.WEYLAND_OPERATOR_SECRET;
  if (typeof secret !== "string" || secret.length < 32) return 404;
  return (await secretEqual(secret, request.headers.get("X-WeylandAI-Operator-Secret") || "")) ? 200 : 401;
}

const publicPurchase = (p) => p && {
  id: p.checkout_session_id, kind: p.kind, product_id: p.product_id, status: p.status, email: p.email,
  customer_id: p.customer_id, amount_total: p.amount_total, currency: p.currency, purchased_at: p.purchased_at,
  terms_accepted_at: p.terms_accepted_at, claim_method: p.claim_method
};

export function registerOnAccountRoutes(router, { WEYLAND_PRODUCTS }) {
  router.post("/api/billing/on-account", async (request, env, ctx) => {
    const auth = await operatorAuthorized(env, request);
    if (auth === 404) return jsonResponse3({ error: "Not found" }, 404);
    if (auth === 401) return jsonResponse3({ detail: { code: "unauthorized" } }, 401);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.customer_name || "").trim().slice(0, 120);
    const days = body.days_until_due === undefined ? 30 : Number.parseInt(body.days_until_due, 10);
    const acceptedAt = Date.parse(body.terms_accepted_at || "");
    if (!EMAIL.test(email)) return jsonResponse3({ detail: { code: "bad_email" } }, 400);
    if (!isOfferProduct(body.product_id)) return jsonResponse3({ detail: { code: "offer_only", message: "Only the first-submittal offer is sold on account." } }, 400);
    if (!name) return jsonResponse3({ detail: { code: "customer_name_required" } }, 400);
    if (!Number.isFinite(acceptedAt)) return jsonResponse3({ detail: { code: "terms_required", message: "terms_accepted_at: when the customer accepted the Terms of Service and the Privacy Policy." } }, 400);
    if (!(days >= 1 && days <= 60)) return jsonResponse3({ detail: { code: "bad_days_until_due" } }, 400);
    if (!env.STRIPE_SECRET_KEY) return jsonResponse3({ detail: { code: "not_configured" } }, 503);

    const account = await env.DB.prepare("SELECT id, email, stripe_customer_id FROM users WHERE lower(email) = ? ORDER BY updated_at DESC LIMIT 1").bind(email).first();
    if (account) {
      const bought = (await purchasesForUser(env.DB, account.id)).some((p) => p.kind === PURCHASE_KINDS.OFFER && p.status === "granted");
      if (bought) return jsonResponse3({ detail: { code: "offer_used", message: "This account already has its first submittal." } }, 409);
    }
    const waiting = (await heldPurchasesForEmail(env.DB, email)).find((p) => p.kind === PURCHASE_KINDS.OFFER && /^in_/.test(p.checkout_session_id));
    if (waiting) return jsonResponse3({ purchase: publicPurchase(waiting), existing: true }, 200);

    try {
      const catalog = await getCatalog(env, ctx);
      const price = byId(catalog)[body.product_id];
      if (!price || !Number.isInteger(price.unit_amount)) return jsonResponse3({ detail: { code: "price_unavailable" } }, 503);
      const metadata = { venture_id: "weylandai", product_id: body.product_id, on_account: "true", user_id: account?.id || "" };
      let customer = account?.stripe_customer_id || null;
      if (!customer) customer = (await stripeApi(env, "POST", "/customers", { email, name, description: name + " (WeylandAI, on account)", metadata })).id;
      const draft = await stripeApi(env, "POST", "/invoices", {
        customer, collection_method: "send_invoice", days_until_due: days, auto_advance: false, pending_invoice_items_behavior: "exclude",
        description: `WeylandAI first submittal, including ${OFFER_ACCESS_DAYS} days of every WeylandAI product. One-time; no automatic charge. On account for ${name}.`,
        footer: "WeylandAI is operated by Argo LLC.", metadata
      });
      await stripeApi(env, "POST", "/invoiceitems", { customer, invoice: draft.id, pricing: { price: WEYLAND_PRODUCTS[body.product_id].priceId }, metadata });
      const final = await stripeApi(env, "POST", `/invoices/${encodeURIComponent(draft.id)}/finalize`, { auto_advance: false });
      const sent = await stripeApi(env, "POST", `/invoices/${encodeURIComponent(draft.id)}/send`, {});
      const legal = termsUrls(env);
      const { row } = await recordPurchase(env.DB, {
        checkout_session_id: draft.id, kind: PURCHASE_KINDS.OFFER, product_id: body.product_id, status: "held",
        user_id: null, email, customer_id: customer, amount_total: final.amount_due ?? price.unit_amount, currency: final.currency || price.currency,
        quantity: 1, terms_url: legal.terms_url, terms_accepted_at: new Date(acceptedAt).toISOString(), purchased_at: new Date().toISOString()
      });
      console.log(`[on-account] ${draft.id} ${body.product_id} held for ${email} (${name}), due in ${days} days`);
      return jsonResponse3({
        purchase: publicPurchase(row),
        invoice: { id: sent.id, number: sent.number || null, status: sent.status, amount_due: sent.amount_due, currency: sent.currency, due_date: sent.due_date || null, hosted_invoice_url: sent.hosted_invoice_url || null }
      }, 201);
    } catch (err) {
      console.error("[on-account] failed:", err.message);
      return jsonResponse3({ detail: { code: "stripe_error", message: err.message } }, 502);
    }
  });
}
