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
//      email. The account whose address is exactly that email (case and spaces aside; a plus address
//      only as itself) takes it at its next sign-in, by any method (lib/grants.js claimHeldPurchases:
//      the operator named the customer, so no emailed proof is needed), which opens the 30 days and
//      the first-submittal credit as a paid offer does. An existing account without a name of its
//      own is named customer_name (and its company set) - the heading of its account card. When the
//      invoice is paid, the payment webhook stamps the purchase paid (routes/webhooks-subscription.js)
//      and the card says Paid; the account view lists the invoice with its PDF.
// g056 (docs/review-2026-10-10-on-account.md):
//   - the D1 row exists before the invoice is finalized: a reservation row (onacct:<email>:<product>,
//     status "reserving") is inserted first - the one writer for that email, so concurrent or
//     repeated POSTs make one invoice - then, once the draft invoice exists, it becomes the invoice's
//     row (status "pending"), and only then is the invoice finalized and sent (status "held"). A D1
//     failure before sending deletes the draft; a failure after leaves the pending row, which the
//     next POST for the email finishes. Stripe creates carry idempotency keys.
//   - only a live Stripe key (sk_live_ / rk_live_) and a livemode invoice are accepted.
//   - a missing or wrong secret is 404 (the route's existence is not told), rate-limited per IP.
//   201 { purchase, invoice: { id, number, status, amount_due, currency, due_date, hosted_invoice_url } }
//   200 { purchase, existing: true } when the email already has an on-account offer waiting
//   200 { purchase, existing: true } also when it finishes an order left pending
//   409 offer_used (the email's account already has its first submittal) or in_progress (another
//   POST for the email is creating it), 400 bad input, 503 not_live, 404 without the secret
//   (WEYLAND_OPERATOR_SECRET, at least 32 characters, configured and matching).
// Operator-only on purpose: nothing a visitor can reach buys without paying.

import { jsonResponse3 } from "../lib/json-response.js";
import { stripeApi } from "../lib/stripe-api.js";
import { getCatalog, byId } from "../lib/catalog.js";
import { isOfferProduct, OFFER_ACCESS_DAYS } from "../lib/stripe-billing.js";
import { purchasesForUser, ensurePurchasesTable, getPurchase, PURCHASE_KINDS } from "../lib/purchases-store.js";
import { checkRateLimit } from "../lib/rate-limit.js";
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

/** 404 without a configured secret, 401 for a missing or wrong one, 200 when it matches (the route answers 404 for both). */
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

// The account carries the customer's name (its card's heading) when it has none of its own yet - an
// account made from a sign-in code is named after its address - and the company when unset.
async function labelAccount(env, account, email, name) {
  if (!account) return;
  await env.DB.prepare("UPDATE users SET name = CASE WHEN COALESCE(name, '') IN ('', ?) THEN ? ELSE name END, company = COALESCE(NULLIF(company, ''), ?), updated_at = ? WHERE id = ?")
    .bind(email.split("@")[0], name, name, new Date().toISOString(), account.id).run();
}

const LIVE_KEY = /^(sk|rk)_live_/;
const RESERVATION_STALE_MS = 5 * 60 * 1000;
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

/** The email's on-account offer rows that are in flight or waiting (a reservation, a pending or held invoice). */
async function onAccountRows(db, email, productId) {
  const res = await db.prepare("SELECT * FROM weyland_purchases WHERE email = ? AND kind = 'offer' AND product_id = ? AND status IN ('reserving', 'pending', 'held') AND (checkout_session_id LIKE 'in\\_%' ESCAPE '\\' OR checkout_session_id LIKE 'onacct:%') ORDER BY purchased_at")
    .bind(email, productId).all();
  return res?.results || [];
}

const invoiceOut = (inv) => inv && { id: inv.id, number: inv.number || null, status: inv.status, amount_due: inv.amount_due, currency: inv.currency, due_date: inv.due_date || null, hosted_invoice_url: inv.hosted_invoice_url || null };

/** Finalize (when still a draft) and send the invoice of a pending row, then hold the purchase. */
async function finishInvoice(env, row, idem) {
  let inv = await stripeApi(env, "GET", `/invoices/${encodeURIComponent(row.checkout_session_id)}`);
  if (inv.livemode !== true) throw Object.assign(new Error("the invoice is not a live-mode invoice"), { code: "not_live" });
  if (inv.status === "draft") inv = await stripeApi(env, "POST", `/invoices/${encodeURIComponent(inv.id)}/finalize`, { auto_advance: false }, { idempotencyKey: idem + ":finalize" });
  const sent = await stripeApi(env, "POST", `/invoices/${encodeURIComponent(inv.id)}/send`, {}, { idempotencyKey: idem + ":send" });
  await env.DB.prepare("UPDATE weyland_purchases SET status = 'held', amount_total = COALESCE(?, amount_total), currency = COALESCE(?, currency), updated_at = ? WHERE checkout_session_id = ? AND status = 'pending'")
    .bind(sent.amount_due ?? inv.amount_due ?? null, sent.currency || inv.currency || null, new Date().toISOString(), row.checkout_session_id).run();
  return sent;
}

export function registerOnAccountRoutes(router, { WEYLAND_PRODUCTS }) {
  router.post("/api/billing/on-account", async (request, env, ctx) => {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rl = await checkRateLimit(ip, "on-account", env, { requests: 10, windowSeconds: 60 });
    if (rl.limited) return jsonResponse3({ error: "Not found" }, 404);
    if ((await operatorAuthorized(env, request)) !== 200) return jsonResponse3({ error: "Not found" }, 404);
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
    if (!LIVE_KEY.test(env.STRIPE_SECRET_KEY)) return jsonResponse3({ detail: { code: "not_live", message: "On-account invoices are sent only with the live Stripe key." } }, 503);
    await ensurePurchasesTable(env.DB);

    const account = await env.DB.prepare("SELECT id, email, name, company, stripe_customer_id FROM users WHERE lower(trim(email)) = ? ORDER BY updated_at DESC LIMIT 1").bind(email).first();
    if (account) {
      const bought = (await purchasesForUser(env.DB, account.id)).some((p) => p.kind === PURCHASE_KINDS.OFFER && p.status === "granted");
      if (bought) return jsonResponse3({ detail: { code: "offer_used", message: "This account already has its first submittal." } }, 409);
    }
    const idem = "weyland-onacct-" + (await sha(email + "|" + body.product_id));
    const now = Date.now();
    try {
      // One order per email: a held one is answered as it is, a pending one is finished, a fresh
      // reservation means another POST is creating it, a stale one (its writer died) is cleared.
      for (const row of await onAccountRows(env.DB, email, body.product_id)) {
        if (row.status === "held") { await labelAccount(env, account, email, name); return jsonResponse3({ purchase: publicPurchase(row), existing: true }, 200); }
        if (row.status === "pending") {
          const sent = await finishInvoice(env, row, idem);
          await labelAccount(env, account, email, name);
          return jsonResponse3({ purchase: publicPurchase(await getPurchase(env.DB, row.checkout_session_id)), invoice: invoiceOut(sent), existing: true, finished: true }, 200);
        }
        if (now - Date.parse(row.updated_at || row.created_at || row.purchased_at || 0) < RESERVATION_STALE_MS) return jsonResponse3({ detail: { code: "in_progress", message: "Another order for this email is being created." } }, 409);
        await env.DB.prepare("DELETE FROM weyland_purchases WHERE checkout_session_id = ? AND status = 'reserving'").bind(row.checkout_session_id).run();
      }
      const legal = termsUrls(env);
      const reservation = "onacct:" + email + ":" + body.product_id;
      const nowIso = new Date(now).toISOString();
      const ins = await env.DB.prepare(`INSERT OR IGNORE INTO weyland_purchases (checkout_session_id, kind, product_id, status, email, quantity, terms_url, terms_accepted_at, purchased_at, credits_total, credits_used, created_at, updated_at)
        VALUES (?, 'offer', ?, 'reserving', ?, 1, ?, ?, ?, 0, 0, ?, ?)`).bind(reservation, body.product_id, email, legal.terms_url, new Date(acceptedAt).toISOString(), nowIso, nowIso, nowIso).run();
      if (!ins?.meta?.changes) return jsonResponse3({ detail: { code: "in_progress", message: "Another order for this email is being created." } }, 409);

      let draft = null;
      try {
        const catalog = await getCatalog(env, ctx);
        const price = byId(catalog)[body.product_id];
        if (!price || !Number.isInteger(price.unit_amount)) throw Object.assign(new Error("price unavailable"), { code: "price_unavailable" });
        const metadata = { venture_id: "weylandai", product_id: body.product_id, on_account: "true", user_id: account?.id || "" };
        let customer = account?.stripe_customer_id || null;
        if (!customer) customer = (await stripeApi(env, "POST", "/customers", { email, name, description: name + " (WeylandAI, on account)", metadata }, { idempotencyKey: idem + ":customer" })).id;
        draft = await stripeApi(env, "POST", "/invoices", {
          customer, collection_method: "send_invoice", days_until_due: days, auto_advance: false, pending_invoice_items_behavior: "exclude",
          description: `WeylandAI first submittal, including ${OFFER_ACCESS_DAYS} days of every WeylandAI product. One-time; no automatic charge. On account for ${name}.`,
          footer: "WeylandAI is operated by Argo LLC.", metadata
        }, { idempotencyKey: idem + ":invoice" });
        if (draft.livemode !== true) throw Object.assign(new Error("Stripe answered with a test-mode invoice"), { code: "not_live" });
        await stripeApi(env, "POST", "/invoiceitems", { customer, invoice: draft.id, pricing: { price: WEYLAND_PRODUCTS[body.product_id].priceId }, metadata }, { idempotencyKey: idem + ":item" });
        // The record, before anything is sent: the reservation becomes the invoice's row.
        const moved = await env.DB.prepare("UPDATE weyland_purchases SET checkout_session_id = ?, status = 'pending', customer_id = ?, amount_total = ?, currency = ?, updated_at = ? WHERE checkout_session_id = ? AND status = 'reserving'")
          .bind(draft.id, customer, price.unit_amount, price.currency || "usd", new Date().toISOString(), reservation).run();
        if (!moved?.meta?.changes) throw new Error("the reservation was lost before the invoice was recorded");
      } catch (err) {
        // Nothing was sent: drop the draft (when there is one) and the reservation.
        if (draft?.id && draft.status === "draft") await stripeApi(env, "DELETE", `/invoices/${encodeURIComponent(draft.id)}`).catch((e) => console.error("[on-account] draft not deleted:", draft.id, e.message));
        await env.DB.prepare("DELETE FROM weyland_purchases WHERE checkout_session_id = ? AND status = 'reserving'").bind(reservation).run().catch(() => {});
        const code = err.code === "not_live" || err.code === "price_unavailable" ? err.code : "stripe_error";
        console.error("[on-account] not created:", err.message);
        return jsonResponse3({ detail: { code, message: err.message, sent: false } }, code === "stripe_error" ? 502 : 503);
      }

      const row = await getPurchase(env.DB, draft.id);
      let sent;
      try {
        sent = await finishInvoice(env, row, idem);
      } catch (err) {
        console.error("[on-account] recorded but not sent:", draft.id, err.message);
        return jsonResponse3({ detail: { code: "stripe_error", message: err.message, sent: false, recorded: draft.id, retry: "POST again for this email to finish it" } }, 502);
      }
      await labelAccount(env, account, email, name);
      console.log(`[on-account] ${draft.id} ${body.product_id} held for ${email} (${name}), due in ${days} days`);
      return jsonResponse3({ purchase: publicPurchase(await getPurchase(env.DB, draft.id)), invoice: invoiceOut(sent) }, 201);
    } catch (err) {
      console.error("[on-account] failed:", err.message);
      return jsonResponse3({ detail: { code: "stripe_error", message: err.message } }, 502);
    }
  });
}
