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
//   checkout.session.completed (metadata.venture_id "weylandai", subscription
//     mode, a catalog product_id) - the account is found (the signed-in buyer
//     by client_reference_id, else the email, case-insensitively) or created,
//     the subscription is recorded (lib/subscriptions-store.js) and the users
//     row granted what it pays for (lib/entitlements.js). The browser that paid
//     is signed in (session cookie handed over by GET
//     /api/billing/checkout/status/:id) only when this checkout created the
//     account or was made by that signed-in account; a checkout that merely
//     typed an existing account's email grants the purchase but signs nobody in
//     (it used to: paying with someone else's email opened their account).
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
        if (obj.mode !== "subscription") return ignored("not_a_subscription");
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

async function provisionCheckout(env2, event, obj, WEYLAND_PRODUCTS) {
  const productId = obj.metadata?.product_id;
  const purchased = productId ? WEYLAND_PRODUCTS[productId] : null;
  if (!purchased) {
    // Never fall back to the suite: an unknown product grants nothing (the
    // monolith granted the $2,000 suite for a $49 WireX seat this way).
    console.error(`[Webhook] checkout ${obj.id} has no catalog product_id (${productId || "none"}) - nothing granted`);
    return { ignored: "unknown_product" };
  }
  const email = String(obj.customer_details?.email || obj.customer_email || "").trim().toLowerCase();
  const quantity = Math.max(1, Number.parseInt(obj.metadata?.seats, 10) || 1);
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
    if (obj.customer) {
      await env2.DB.prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?").bind(obj.customer, now, account.id).run();
    }
    if (matchedBy === "signed_in_buyer" && !sessionId) {
      sessionId = crypto.randomUUID();
      await sessionRow(account.id, null).run();
    }
  }

  // The grant: recorded against the subscription when its id is known (every
  // event since 2026-10-07), so later cancellations and failures can take it back.
  const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id || null;
  let grant;
  if (subscriptionId) {
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
  }

  // Signing the paying browser in (the session made above): only for an account
  // this checkout created or the signed-in account that started it.
  const handOff = (matchedBy === "created" || matchedBy === "signed_in_buyer") && !!sessionId;
  if (env2.CACHE) {
    await env2.CACHE.put(`checkout_status:${obj.id}`, JSON.stringify(
      handOff ? { status: "active", quantity, session_id: sessionId } : { status: "active", quantity, session_id: null, sign_in: "required" }
    ), { expirationTtl: 3600 });
  }
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
