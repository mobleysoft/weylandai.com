// weyland-platform-worker/src/routes/webhooks-subscription.js
//
// POST /api/webhooks/subscription - every WeylandAI payment event.
//
// Forked verbatim from ../../../src/routes/webhooks-subscription.js (the
// monolith's handler) and, since 2026-10-07, the only handler that answers it:
// the zone route weylandai.com/api/webhooks/subscription* sends it to this
// Worker (see wrangler.toml).
//
// Delivery: Stripe -> vendyai.com/api/stripe/webhook (checks Stripe's
// signature) -> for events of venture "weylandai" vendyai re-signs a v1 body
//   { id, type, created, data: <the Stripe object's fields> }
// with X-Webhook-Signature / X-Webhook-Timestamp (base64url HMAC-SHA256 of
// "<ts>.<body>", env.SUBSCRIPTION_WEBHOOK_SECRET = vendyai_ledger's
// venture_webhook_endpoints.hmac_secret for weylandai) and POSTs it here.
// A Stripe-Signature request (env.STRIPE_WEBHOOK_SECRET) is still verified and
// handled the same way. Bodies vendyai sent before 2026-10-07 carry no id /
// created and are handled too.
//
// Events acted on:
//   checkout.session.completed (metadata.venture_id "weylandai", a catalog
//     product_id; subscription mode for a plan, payment mode for the $100
//     first-submittal offer) - the account is found (the signed-in buyer by
//     client_reference_id, else the email, case-insensitively) or created, the
//     purchase is recorded (lib/purchases-store.js, with the Terms the buyer
//     accepted) and granted: a plan through its subscription row
//     (lib/subscriptions-store.js, lib/entitlements.js), the offer as 30 days of
//     every product and the first-submittal credit (lib/grants.js). The browser
//     that paid is signed in (session cookie handed over by GET
//     /api/billing/checkout/status/:id) only when this checkout created the
//     account or was made by that signed-in account.
//     Purchase-claim protection (2026-10-07): a checkout made signed out with an
//     existing account's email is HELD, not granted - granted when the email is
//     proven (a code sign-in) or that account signs in on the browser that paid
//     (lib/grants.js). It used to be granted to whoever owned the email.
//   customer.subscription.updated / customer.subscription.deleted /
//   invoice.payment_failed / invoice.paid - the subscription's state is
//   recorded if newer than what is known, then the users row is recomputed:
//   cancelled or failing subscriptions stop granting their products (the guest
//   floor and anything granted otherwise stay), a renewal (invoice.paid,
//   billing_reason subscription_cycle) starts a new usage period.
// Anything else is acknowledged and ignored.
//
// Idempotent: processed_webhook_events holds the Stripe event id and, for a
// checkout completion, "checkout:<session id>" (vendyai's old forwards had no
// event id), so a redelivery or replay changes nothing. If processing fails
// the keys are removed again and the answer is 500, so a retry can succeed.

import { jsonResponse3 } from "../lib/json-response.js";
import { GUEST_PRODUCTS, SIGNED_IN_SUBMITTALS_LIMIT, parseProducts, applySubscriptionState, paidSubmittalsLimit } from "../lib/entitlements.js";
import {
  ensureSubscriptionsTable, factsFromSubscription, factsFromInvoice,
  isWeylandSubscription, getSubscription, upsertSubscription
} from "../lib/subscriptions-store.js";
import { recordPurchase, markGranted, maskEmail, HELD_USER_PREFIX, PURCHASE_KINDS } from "../lib/purchases-store.js";
import { grantPurchase } from "../lib/grants.js";

export const VENTURE_ID = "weylandai";
export const LIFECYCLE_EVENTS = new Set([
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid"
]);
const COMPLETED = "checkout.session.completed";

const USER_COLUMNS = "id, email, subscription_tier, subscription_status, products_enabled, submittals_limit";

/**
 * @param {object} router
 * @param {{ WEYLAND_PRODUCTS: object, WEYLAND_SUBCONP_PRODUCT_ID: string, verifyVendyaiForwardSignature: Function, verifyStripeWebhookSignature: Function }} deps
 */
export function registerWebhooksSubscriptionRoutes(router, { WEYLAND_PRODUCTS, verifyVendyaiForwardSignature, verifyStripeWebhookSignature }) {
  router.post("/api/webhooks/subscription", async (request2, env2) => {
    const dedupeKeys = [];
    const inserted = [];
    try {
      const rawBody = await request2.text();
      const vendyaiSig = request2.headers.get("X-Webhook-Signature") || "";
      const vendyaiTs = request2.headers.get("X-Webhook-Timestamp") || "";
      const stripeSig = request2.headers.get("Stripe-Signature") || "";
      if (vendyaiSig) {
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

      const parsed = JSON.parse(rawBody);
      // vendyai forwards the Stripe object's fields flat under `data`.
      const event = vendyaiSig
        ? { id: parsed.id || null, type: parsed.type, created: parsed.created ?? null, data: { object: parsed.data || {} } }
        : parsed;
      const eventType = event.type;
      const obj = event.data?.object || {};
      console.log(`[Webhook] Received: ${eventType} (${obj.id || "no-id"}) ${event.id || "no-event-id"}`);

      if (eventType === COMPLETED) {
        if (obj.metadata?.venture_id !== VENTURE_ID) return ignored("other_venture");
        // subscription: a monthly plan; payment: the one-time $100 first-submittal offer.
        if (obj.mode !== "subscription" && obj.mode !== "payment") return ignored("not_a_purchase");
      } else if (!LIFECYCLE_EVENTS.has(eventType)) {
        return ignored("unhandled_type");
      }

      if (event.id) dedupeKeys.push(String(event.id));
      if (eventType === COMPLETED && obj.id) dedupeKeys.push("checkout:" + obj.id);
      for (const key of dedupeKeys) {
        const r = await env2.DB.prepare("INSERT OR IGNORE INTO processed_webhook_events (event_id, event_type) VALUES (?, ?)").bind(key, eventType).run();
        if (!r?.meta?.changes) {
          console.log(`[Webhook] Duplicate ${key} (${eventType}) - already processed, skipping.`);
          return jsonResponse3({ received: true, duplicate: true });
        }
        inserted.push(key);
      }
      if (!dedupeKeys.length) console.warn("[Webhook] Event has no id - cannot dedupe:", eventType);

      const result = eventType === COMPLETED
        ? await provisionCheckout(env2, event, obj, WEYLAND_PRODUCTS)
        : await applyLifecycle(env2, event, obj);
      if (result.ignored) {
        // Nothing was applied: forget the keys so a corrected redelivery is not a "duplicate".
        await forgetKeys(env2, inserted.splice(0));
      }
      return jsonResponse3({ received: true, ...result });
    } catch (err) {
      console.error("[Webhook] Processing error:", err && err.stack ? err.stack : err);
      await forgetKeys(env2, inserted.splice(0));
      return jsonResponse3({ error: "Webhook processing failed" }, 500);
    }
  });
}

function ignored(reason) {
  console.log("[Webhook] Ignored:", reason);
  return jsonResponse3({ received: true, ignored: reason });
}

async function forgetKeys(env2, keys) {
  for (const key of keys || []) {
    try { await env2.DB.prepare("DELETE FROM processed_webhook_events WHERE event_id = ?").bind(key).run(); } catch (e) { console.error("[Webhook] could not forget", key, e.message); }
  }
}

function eventTime(event) {
  const t = Number(event.created);
  return Number.isFinite(t) && t > 0 ? Math.floor(t) : Math.floor(Date.now() / 1000);
}

async function findAccount(env2, obj, email) {
  if (obj.client_reference_id) {
    const row = await env2.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(String(obj.client_reference_id)).first();
    if (row) return { row, matchedBy: "signed_in_buyer" };
  }
  if (email) {
    // Accounts are stored lower-case (authfor-exchange); an exact spelling wins if both exist.
    const row = await env2.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = ? ORDER BY (email = ?) DESC LIMIT 1`).bind(email, email).first();
    if (row) return { row, matchedBy: "email" };
  }
  return { row: null, matchedBy: null };
}

async function registerAuthFor(email, name) {
  try {
    const registerResp = await fetch("https://authfor.com/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        name: name || email,
        client_id: "af_weyland_subscribe",
        venture_id: "weylandai.com"
      })
    });
    if (registerResp.ok) {
      const registerData = await registerResp.json();
      if (registerData && registerData.session_id) return { session_id: registerData.session_id, token: registerData.token };
    }
  } catch (e) {
    console.error("[Webhook] AuthFor register call failed:", e.message);
  }
  return null;
}

// Stripe's checkout session payment states that mean the money is in.
const SETTLED = new Set(["paid", "no_payment_required"]);
// Checkout status kept for the paying browser's poll (GET /api/billing/checkout/status/:id).
const STATUS_TTL_SECONDS = 86400;

async function putCheckoutStatus(env2, sessionId, value) {
  if (!env2.CACHE) return;
  await env2.CACHE.put(`checkout_status:${sessionId}`, JSON.stringify(value), { expirationTtl: STATUS_TTL_SECONDS });
}

async function provisionCheckout(env2, event, obj, WEYLAND_PRODUCTS) {
  const productId = obj.metadata?.product_id;
  const purchased = productId ? WEYLAND_PRODUCTS[productId] : null;
  if (!purchased) {
    // Never fall back to the suite: an unknown product grants nothing (the
    // monolith granted the $2,000 suite for a $49 WireX seat this way).
    console.error(`[Webhook] checkout ${obj.id} has no catalog product_id (${productId || "none"}) - nothing granted`);
    return { ignored: "unknown_product" };
  }
  // The offer is sold only as a one-time payment, every plan only as a subscription.
  const isOffer = purchased.kind === "offer";
  if (isOffer !== (obj.mode === "payment")) {
    console.error(`[Webhook] checkout ${obj.id}: ${productId} in ${obj.mode} mode - nothing granted`);
    return { ignored: "mode_mismatch" };
  }
  // vendyai's forward carries no payment_status; a Stripe-signed event does. The
  // offer's sessions take cards only, so a finished session means the money is in;
  // any other state waits.
  if (isOffer && obj.payment_status && !SETTLED.has(obj.payment_status)) {
    console.warn(`[Webhook] offer checkout ${obj.id} finished with payment_status ${obj.payment_status} - not granted`);
    return { ignored: "payment_not_settled" };
  }
  const email = String(obj.customer_details?.email || obj.customer_email || "").trim().toLowerCase();
  const quantity = isOffer ? 1 : Math.max(1, Number.parseInt(obj.metadata?.seats, 10) || 1);
  const name = obj.customer_details?.name || email;
  const now = new Date().toISOString();
  let { row: account, matchedBy } = await findAccount(env2, obj, email);
  if (!account && !email) {
    console.error("[Webhook] checkout with no email and no known buyer:", obj.id);
    return { ignored: "no_email" };
  }

  // The session this checkout already handed over, if an earlier attempt got
  // that far (a retry after a failure must not turn the new buyer into an
  // "existing email" and leave them signed out).
  let sessionId = null;
  if (account) {
    const prior = await env2.DB.prepare("SELECT id FROM weyland_sessions WHERE user_id = ? AND instr(player_json, ?) > 0 LIMIT 1")
      .bind(account.id, `"checkout_session_id":${JSON.stringify(String(obj.id))}`).first();
    if (prior) {
      sessionId = prior.id;
      if (matchedBy === "email") matchedBy = "created";
    }
  }

  const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id || null;
  const purchaseRow = {
    checkout_session_id: String(obj.id),
    kind: isOffer ? PURCHASE_KINDS.OFFER : PURCHASE_KINDS.SUBSCRIPTION,
    product_id: productId,
    email: email || (account?.email ? String(account.email).toLowerCase() : null),
    customer_id: obj.customer || null,
    subscription_id: subscriptionId,
    payment_intent_id: typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id || null,
    amount_total: Number.isFinite(Number(obj.amount_total)) && obj.amount_total !== null ? Number(obj.amount_total) : null,
    currency: obj.currency || null,
    quantity,
    terms_url: obj.metadata?.terms_url || null,
    terms_accepted_at: obj.metadata?.terms_accepted_at || null,
    purchased_at: new Date(eventTime(event) * 1000).toISOString()
  };

  // Purchase-claim protection (2026-10-07): a purchase made signed out with an
  // email that belongs to an existing account is held, not granted to it. It is
  // granted when that email is proven (a code sign-in) or that account signs in
  // on the browser that paid (lib/grants.js claimHeldPurchases).
  if (account && matchedBy === "email") {
    const { row: held } = await recordPurchase(env2.DB, { ...purchaseRow, status: "held", user_id: null });
    if (held?.status === "held" && !isOffer && subscriptionId) {
      // Its cancellations and failed payments are still recorded while it waits.
      const facts = {
        subscription_id: subscriptionId, customer_id: obj.customer || null, status: "active", venture_id: VENTURE_ID,
        product_ids: [productId], tiers: purchased.tier ? [purchased.tier] : [], suite: purchased.tier === null, seats: quantity, matched: true
      };
      await upsertSubscription(env2.DB, facts, { userId: HELD_USER_PREFIX + obj.id, eventAt: eventTime(event), eventType: COMPLETED });
    }
    const isHeld = held?.status !== "granted";
    await putCheckoutStatus(env2, obj.id, isHeld
      ? { status: "held", quantity, product_id: productId, email_hint: maskEmail(email), session_id: null }
      : { status: "active", quantity, product_id: productId, session_id: null, access_ends_at: held?.access_ends_at || null });
    console.log(`[Webhook] Checkout ${obj.id}: ${productId} x${quantity} held for an existing account's email (granted on a code sign-in or that account signing in on the paying browser)`);
    return { provisioned: false, held: isHeld, account: "email_match_held", signed_in: false };
  }

  const sessionRow = (userId, authforSession) => env2.DB.prepare(
    "INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(sessionId, userId, account?.email || email, JSON.stringify({
    name,
    role: "member",
    authfor_session_id: authforSession?.session_id || null,
    authfor_backed: !!authforSession,
    checkout_session_id: String(obj.id)
  }), new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString());

  if (!account) {
    // A new account: AuthFor identity, then the users row (free plan; the
    // purchase is granted below) and its session in one transaction.
    const authforSession = await registerAuthFor(email, name);
    const userId = crypto.randomUUID();
    sessionId = crypto.randomUUID();
    await env2.DB.batch([
      env2.DB.prepare(
        `INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit, stripe_customer_id, created_at, updated_at)
         VALUES (?, ?, ?, 'free', 'active', ?, ?, ?, ?, ?)`
      ).bind(userId, email, name, GUEST_PRODUCTS.join(","), SIGNED_IN_SUBMITTALS_LIMIT, obj.customer || null, now, now),
      sessionRow(userId, authforSession)
    ]);
    account = { id: userId, email };
    matchedBy = "created";
  } else {
    // A plan bought by this account makes its customer the account's customer
    // (the offer only fills it in when there is none: lib/grants.js).
    if (obj.customer && !isOffer) {
      await env2.DB.prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?").bind(obj.customer, now, account.id).run();
    }
    if (matchedBy === "signed_in_buyer" && !sessionId) {
      sessionId = crypto.randomUUID();
      await sessionRow(account.id, null).run();
    }
  }

  let grant;
  let accessEndsAt = null;
  if (isOffer) {
    // The $100 first-submittal offer: the whole suite for 30 days from now and
    // the first-submittal credit (lib/grants.js). Recorded 'pending' first, so a
    // retry after a failure in between grants it instead of finding it done.
    const { row: rec } = await recordPurchase(env2.DB, { ...purchaseRow, status: "pending", user_id: account.id });
    if (rec.status === "granted") {
      accessEndsAt = rec.access_ends_at;
      grant = { subscription: "none", entitlements: "already-granted", access_ends_at: accessEndsAt };
    } else {
      const g = await grantPurchase(env2, rec, account.id, { claimMethod: matchedBy });
      accessEndsAt = g.accessEndsAt;
      grant = { subscription: "none", entitlements: "offer-window", access_ends_at: accessEndsAt };
    }
  } else if (subscriptionId) {
    // The grant: recorded against the subscription, so later cancellations and
    // failures can take it back.
    const facts = {
      subscription_id: subscriptionId,
      customer_id: obj.customer || null,
      status: "active",
      venture_id: VENTURE_ID,
      product_ids: [productId],
      tiers: purchased.tier ? [purchased.tier] : [],
      suite: purchased.tier === null,
      seats: quantity,
      matched: true
    };
    const up = await upsertSubscription(env2.DB, facts, { userId: account.id, eventAt: eventTime(event), eventType: COMPLETED });
    const applied = await applySubscriptionState(env2, account.id);
    grant = { subscription: up.reason, entitlements: applied.reason };
    const { row: rec } = await recordPurchase(env2.DB, { ...purchaseRow, status: "pending", user_id: account.id });
    if (rec.status !== "granted") await markGranted(env2.DB, obj.id, { userId: account.id, grantedAt: now, claimMethod: matchedBy, from: rec.status });
  } else {
    // A forward without the subscription id (vendyai before 2026-10-07): grant directly, as before.
    const cur = await env2.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(account.id).first();
    const isSuite = purchased.tier === null;
    const tier = isSuite || cur.subscription_tier === "subconp" ? "subconp" : "standalone";
    const products = Array.from(new Set([...parseProducts(cur.products_enabled), ...(isSuite ? [] : [purchased.tier]), ...GUEST_PRODUCTS])).join(",");
    await env2.DB.prepare(
      "UPDATE users SET subscription_status = 'active', subscription_tier = ?, products_enabled = ?, submittals_limit = ?, updated_at = ? WHERE id = ?"
    ).bind(tier, products, paidSubmittalsLimit(cur.submittals_limit, quantity), now, account.id).run();
    grant = { subscription: "unknown-id", entitlements: "granted" };
    const { row: rec } = await recordPurchase(env2.DB, { ...purchaseRow, status: "pending", user_id: account.id });
    if (rec.status !== "granted") await markGranted(env2.DB, obj.id, { userId: account.id, grantedAt: now, claimMethod: matchedBy, from: rec.status });
  }

  // Signing the paying browser in (the session made above): only for an account
  // this checkout created or the signed-in account that started it.
  const handOff = (matchedBy === "created" || matchedBy === "signed_in_buyer") && !!sessionId;
  await putCheckoutStatus(env2, obj.id, {
    status: "active", quantity, product_id: productId, access_ends_at: accessEndsAt,
    ...(handOff ? { session_id: sessionId } : { session_id: null, sign_in: "required" })
  });
  console.log(`[Webhook] Checkout ${obj.id}: ${productId} x${quantity} for user ${account.id} (${matchedBy}); ${grant.subscription}/${grant.entitlements}`);
  return { provisioned: true, account: matchedBy, signed_in: handOff, ...grant };
}

async function applyLifecycle(env2, event, obj) {
  const eventType = event.type;
  const facts = eventType.startsWith("invoice.") ? factsFromInvoice(obj, eventType) : factsFromSubscription(obj, eventType);
  if (!facts.subscription_id) return { ignored: "no_subscription" };
  await ensureSubscriptionsTable(env2.DB);
  const known = await getSubscription(env2.DB, facts.subscription_id);
  if (!known && !isWeylandSubscription(facts)) return { ignored: "other_venture" };

  let userId = known?.user_id || null;
  if (!userId && facts.customer_id) {
    userId = (await env2.DB.prepare("SELECT id FROM users WHERE stripe_customer_id = ? ORDER BY updated_at DESC LIMIT 1").bind(facts.customer_id).first())?.id || null;
  }
  if (!userId && facts.user_id_hint) {
    userId = (await env2.DB.prepare("SELECT id FROM users WHERE id = ?").bind(String(facts.user_id_hint)).first())?.id || null;
  }
  if (!userId) {
    console.warn(`[Webhook] ${eventType} for ${facts.subscription_id}: no account with customer ${facts.customer_id}`);
    return { ignored: "no_account" };
  }

  const up = await upsertSubscription(env2.DB, facts, { userId, eventAt: eventTime(event), eventType });
  const renewal = up.applied && eventType === "invoice.paid" && facts.billing_reason === "subscription_cycle";
  // The account is recomputed from its subscription rows even when this event
  // changed none of them (stale, already ended): a retry after a failure that
  // came between the two writes still brings the users row in line.
  const res = await applySubscriptionState(env2, userId, { resetUsage: renewal });
  if (!up.applied) return { ignored: up.reason, entitlements: res.reason };
  console.log(`[Webhook] ${eventType}: subscription ${facts.subscription_id} -> ${up.row.status}; account ${userId} ${res.reason}${renewal ? ", new usage period" : ""}`);
  return { applied: true, subscription_status: up.row.status, entitlements: res.reason, renewal };
}
