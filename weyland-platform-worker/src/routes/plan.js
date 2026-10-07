// weyland-platform-worker/src/routes/plan.js
//
// Plan management inside the page (2026-10-07; John: no page hop, so never
// Stripe's hosted billing portal). Contract: plan/evidence/
// weylandai_contracts.md, section fc:payments.
//
//   GET  /api/billing/plan                      - access (offer / subscription / trial /
//                                                 none, end date, days left, day-23 prompt,
//                                                 first-submittal credit), the live
//                                                 subscriptions, the card on file, the
//                                                 plans that can be chosen.
//   POST /api/billing/subscription/cancel       - cancel at the end of the paid period.
//   POST /api/billing/subscription/resume       - undo that.
//   POST /api/billing/payment-method/setup      - a SetupIntent for Stripe's Payment Element
//                                                 (cards only, so it never redirects).
//   POST /api/billing/payment-method/default    - the confirmed card becomes the default
//                                                 for the customer and its live subscriptions.
//   GET  /api/billing/invoices                  - the account's invoices, newest first.
//   GET  /api/billing/invoices/:id/pdf          - the invoice PDF, fetched by this worker
//                                                 from Stripe (the browser never visits
//                                                 stripe.com).
//
// Every route needs a signed-in account (weyland_session cookie or AuthFor
// bearer) and acts only on Stripe customers that belong to it: the account's
// stripe_customer_id, the customers of its subscription rows and of the
// purchases granted to it.

import { jsonResponse3 } from "../lib/json-response.js";
import { stripeApi, STRIPE_EMBEDDED_API_VERSION, STRIPE_JS_URL } from "../lib/stripe-api.js";
import { signedInBuyer } from "./billing.js";
import { getCatalog, byId } from "../lib/catalog.js";
import { WEYLAND_SUBCONP_PRODUCT_ID, CHECKOUT_READY_PRODUCTS, subscriptionProducts } from "../lib/stripe-billing.js";
import { catalogForPrice, ensureSubscriptionsTable } from "../lib/subscriptions-store.js";
import { ensurePurchasesTable } from "../lib/purchases-store.js";
import { loadAccess, syncUserEntitlements } from "../lib/entitlements.js";
import { claimFromCookie } from "../lib/grants.js";
import { checkRateLimit } from "../lib/rate-limit.js";

const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);
const iso = (sec) => (Number.isFinite(Number(sec)) && Number(sec) > 0 ? new Date(Number(sec) * 1000).toISOString() : null);
const idOf = (v) => (typeof v === "string" ? v : v?.id || null);

const ACCOUNT_COLUMNS = "id, email, subscription_tier, subscription_status, products_enabled, trial_ends_at, submittals_used, submittals_limit, stripe_customer_id";

async function signedInAccount(request, env) {
  const buyer = await signedInBuyer(request, env);
  if (!buyer) return null;
  return env.DB.prepare(`SELECT ${ACCOUNT_COLUMNS} FROM users WHERE id = ?`).bind(buyer.userId).first();
}

function unauthorized() {
  return jsonResponse3({ error: "Sign in to manage your plan." }, 401);
}

/** Every Stripe customer that belongs to the account (primary first). */
export async function accountCustomers(env, row) {
  const ids = [];
  const add = (c) => { if (typeof c === "string" && /^cus_[A-Za-z0-9]+$/.test(c) && !ids.includes(c)) ids.push(c); };
  add(row.stripe_customer_id);
  await ensureSubscriptionsTable(env.DB);
  await ensurePurchasesTable(env.DB);
  const subs = await env.DB.prepare("SELECT DISTINCT customer_id FROM weyland_subscriptions WHERE user_id = ? AND customer_id IS NOT NULL").bind(row.id).all();
  (subs?.results || []).forEach((r) => add(r.customer_id));
  const buys = await env.DB.prepare("SELECT DISTINCT customer_id FROM weyland_purchases WHERE user_id = ? AND status = 'granted' AND customer_id IS NOT NULL").bind(row.id).all();
  (buys?.results || []).forEach((r) => add(r.customer_id));
  return ids;
}

function cardOf(pm) {
  if (!pm || typeof pm !== "object" || !pm.card) return null;
  return { brand: pm.card.brand || null, last4: pm.card.last4 || null, exp_month: pm.card.exp_month || null, exp_year: pm.card.exp_year || null };
}

function priceIdOf(item) {
  return idOf(item?.price) || idOf(item?.plan) || null;
}

function isWeylandStripeSubscription(sub) {
  if (sub?.metadata?.venture_id === "weylandai") return true;
  return (sub?.items?.data || []).some((it) => catalogForPrice(priceIdOf(it)));
}

export function mapSubscription(sub, catalogById = {}) {
  const items = sub?.items?.data || [];
  const first = items[0] || {};
  const hit = catalogForPrice(priceIdOf(first));
  const productIds = Array.from(new Set(items.map((it) => catalogForPrice(priceIdOf(it))?.productId).filter(Boolean)));
  // Since API 2025-03-31 the period lives on the items; older shapes keep it on the subscription.
  const ends = items.map((it) => Number(it.current_period_end)).filter((n) => Number.isFinite(n) && n > 0);
  const periodEnd = ends.length ? Math.max(...ends) : sub?.current_period_end;
  const entry = hit ? catalogById[hit.productId] : null;
  const price = typeof first.price === "object" ? first.price : null;
  return {
    id: sub.id,
    product_id: hit?.productId || null,
    product_ids: productIds,
    name: entry?.name || price?.nickname || null,
    quantity: Number(first.quantity) || 1,
    unit_amount: price?.unit_amount ?? entry?.unit_amount ?? null,
    currency: sub.currency || price?.currency || entry?.currency || null,
    interval: price?.recurring?.interval || entry?.interval || "month",
    status: sub.status,
    current_period_end: iso(periodEnd),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    cancel_at: iso(sub.cancel_at),
    canceled_at: iso(sub.canceled_at),
    card: cardOf(sub.default_payment_method)
  };
}

/** The account's WeylandAI subscriptions in Stripe (live ones unless all=true). */
async function stripeSubscriptions(env, customers, { all = false } = {}) {
  const lists = await Promise.all(customers.map((c) =>
    stripeApi(env, "GET", `/subscriptions?customer=${encodeURIComponent(c)}&status=all&limit=20&expand[]=data.default_payment_method`)
  ));
  const out = [];
  for (const list of lists) {
    for (const sub of list?.data || []) {
      if (!isWeylandStripeSubscription(sub)) continue;
      if (!all && !LIVE_STATUSES.has(sub.status)) continue;
      out.push(sub);
    }
  }
  return out;
}

async function defaultCard(env, customerId) {
  if (!customerId) return null;
  const c = await stripeApi(env, "GET", `/customers/${encodeURIComponent(customerId)}?expand[]=invoice_settings.default_payment_method`);
  return cardOf(c?.invoice_settings?.default_payment_method);
}

function planName(access, subs, row) {
  if (subs.some((s) => s.product_id === WEYLAND_SUBCONP_PRODUCT_ID)) return "SubConP suite";
  if (subs.length === 1) return subs[0].name || "Monthly plan";
  if (subs.length > 1) return subs.length + " monthly plans";
  if (row.subscription_tier === "subconp") return "SubConP suite";
  if (access?.kind === "offer") return "First submittal: 30 days of every product";
  if (access?.kind === "trial") return "Free trial";
  return "Free tools";
}

function choicesFrom(catalog) {
  const list = (catalog?.products || []).filter((p) => p.kind !== "offer" && p.checkout_ready && CHECKOUT_READY_PRODUCTS.has(p.id) && Number.isFinite(Number(p.unit_amount)));
  const subsIds = new Set(subscriptionProducts().map(([id]) => id));
  return list
    .filter((p) => subsIds.has(p.id))
    .sort((a, b) => (a.id === WEYLAND_SUBCONP_PRODUCT_ID ? -1 : b.id === WEYLAND_SUBCONP_PRODUCT_ID ? 1 : Number(b.unit_amount) - Number(a.unit_amount)))
    .map((p) => ({ product_id: p.id, name: p.name, unit_amount: p.unit_amount, currency: p.currency, interval: p.interval || "month" }));
}

function pickSubscription(subs, wanted) {
  if (wanted) return { sub: subs.find((s) => s.id === wanted) || null, error: subs.some((s) => s.id === wanted) ? null : "no_such_subscription" };
  if (subs.length === 1) return { sub: subs[0], error: null };
  return { sub: null, error: subs.length ? "which_subscription" : "no_subscription" };
}

function pickError(code, subs) {
  if (code === "which_subscription") {
    return jsonResponse3({ detail: { code, message: "This account has more than one plan: say which.", subscriptions: subs.map((s) => s.id) } }, 400);
  }
  return jsonResponse3({ detail: { code, message: code === "no_subscription" ? "This account has no plan to change." : "No such plan on this account." } }, 404);
}

function stripeFailure(err, what) {
  console.error(`[Plan] ${what} failed:`, err?.status || "", err?.message);
  return jsonResponse3({ detail: { code: "stripe_error", message: `Could not ${what} right now. Try again in a minute, or write to support@weylandai.com.` } }, 502);
}

export function registerPlanRoutes(router) {
  router.get("/api/billing/plan", async (request, env, ctx) => {
    let row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    const claim = await claimFromCookie(env, request, row);
    await syncUserEntitlements(env, row.id);
    row = await env.DB.prepare(`SELECT ${ACCOUNT_COLUMNS} FROM users WHERE id = ?`).bind(row.id).first();
    const [access, catalog, customers] = await Promise.all([
      loadAccess(env, row),
      getCatalog(env, ctx).catch(() => null),
      accountCustomers(env, row)
    ]);
    const cat = byId(catalog);
    let subscriptions = [];
    let card = null;
    let stripeUnavailable = false;
    if (customers.length) {
      try {
        const [subs, primaryCard] = await Promise.all([stripeSubscriptions(env, customers), defaultCard(env, customers[0])]);
        subscriptions = subs.map((s) => mapSubscription(s, cat));
        card = primaryCard || subscriptions.find((s) => s.card)?.card || null;
      } catch (e) {
        console.error("[Plan] Stripe read failed:", e.message);
        stripeUnavailable = true;
      }
    }
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
    if (claim.cookie) headers["Set-Cookie"] = claim.cookie;
    return new Response(JSON.stringify({
      access,
      plan: { name: planName(access, subscriptions, row), tier: row.subscription_tier || null, status: row.subscription_status || null },
      subscription: subscriptions[0] || null,
      subscriptions,
      card,
      has_customer: customers.length > 0,
      choices: choicesFrom(catalog),
      first_submittal: access?.first_submittal || null,
      ...(stripeUnavailable ? { stripe_unavailable: true } : {}),
      ...(claim.claimed.length ? { claimed: claim.claimed } : {})
    }), { status: 200, headers });
  });

  async function setCancel(request, env, ctx, cancel) {
    const row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const customers = await accountCustomers(env, row);
    if (!customers.length) return pickError("no_subscription", []);
    let subs;
    try { subs = await stripeSubscriptions(env, customers); } catch (e) { return stripeFailure(e, "read your plan"); }
    const { sub, error } = pickSubscription(subs, typeof body.subscription_id === "string" ? body.subscription_id : null);
    if (!sub) return pickError(error, subs);
    try {
      const params = { cancel_at_period_end: cancel ? true : false, metadata: { cancel_requested_by: cancel ? "account_view" : "" } };
      if (cancel && typeof body.reason === "string" && body.reason.trim()) params.cancellation_details = { comment: body.reason.trim().slice(0, 500) };
      let updated = await stripeApi(env, "POST", `/subscriptions/${encodeURIComponent(sub.id)}?expand[]=default_payment_method`, params);
      // A cancel date set some other way is cleared too when resuming.
      if (!cancel && updated.cancel_at) {
        updated = await stripeApi(env, "POST", `/subscriptions/${encodeURIComponent(sub.id)}?expand[]=default_payment_method`, { cancel_at: "" });
      }
      const catalog = await getCatalog(env, ctx).catch(() => null);
      console.log(`[Plan] ${row.id} ${cancel ? "cancelled at period end" : "resumed"} ${sub.id}`);
      return jsonResponse3({ subscription: mapSubscription(updated, byId(catalog)) });
    } catch (e) {
      return stripeFailure(e, cancel ? "cancel the plan" : "resume the plan");
    }
  }

  router.post("/api/billing/subscription/cancel", (request, env, ctx) => setCancel(request, env, ctx, true));
  router.post("/api/billing/subscription/resume", (request, env, ctx) => setCancel(request, env, ctx, false));

  router.post("/api/billing/payment-method/setup", async (request, env) => {
    const row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    if (!env.STRIPE_PUBLISHABLE_KEY) return jsonResponse3({ detail: { code: "not_configured", message: "Card updates are not configured right now." } }, 503);
    const rl = await checkRateLimit(row.id, "card-setup", env, { requests: 10, windowSeconds: 60 });
    if (rl.limited) return jsonResponse3({ detail: { code: "rate_limited", message: "Too many attempts - wait a minute and try again." } }, 429);
    const body = await request.json().catch(() => ({}));
    const customers = await accountCustomers(env, row);
    if (!customers.length) return jsonResponse3({ detail: { code: "no_customer", message: "There is no card on this account yet: it is added when you first pay." } }, 409);
    let customer = customers[0];
    if (typeof body.subscription_id === "string" && body.subscription_id) {
      try {
        const subs = await stripeSubscriptions(env, customers);
        const sub = subs.find((s) => s.id === body.subscription_id);
        if (!sub) return pickError("no_such_subscription", subs);
        customer = idOf(sub.customer) || customer;
      } catch (e) {
        return stripeFailure(e, "read your plan");
      }
    }
    try {
      const si = await stripeApi(env, "POST", "/setup_intents", {
        customer,
        usage: "off_session",
        allowed_payment_method_types: ["card"],
        metadata: { venture_id: "weylandai", user_id: row.id, purpose: "update_card", subscription_id: body.subscription_id || undefined }
      });
      return jsonResponse3({
        client_secret: si.client_secret,
        setup_intent_id: si.id,
        publishable_key: env.STRIPE_PUBLISHABLE_KEY,
        stripe_js: STRIPE_JS_URL,
        stripe_api_version: STRIPE_EMBEDDED_API_VERSION
      }, 201);
    } catch (e) {
      return stripeFailure(e, "start a card update");
    }
  });

  router.post("/api/billing/payment-method/default", async (request, env) => {
    const row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const siId = typeof body.setup_intent_id === "string" ? body.setup_intent_id : "";
    if (!/^seti_[A-Za-z0-9]+$/.test(siId)) return jsonResponse3({ detail: { code: "invalid", message: "setup_intent_id required" } }, 400);
    const customers = await accountCustomers(env, row);
    let si;
    try {
      si = await stripeApi(env, "GET", `/setup_intents/${encodeURIComponent(siId)}?expand[]=payment_method`);
    } catch (e) {
      if (e.status === 404) return jsonResponse3({ detail: { code: "not_found", message: "No such card update." } }, 404);
      return stripeFailure(e, "read the card update");
    }
    const customer = idOf(si.customer);
    if (!customer || !customers.includes(customer) || si.metadata?.user_id !== row.id) {
      return jsonResponse3({ detail: { code: "not_found", message: "No such card update." } }, 404);
    }
    if (si.status !== "succeeded") {
      return jsonResponse3({ detail: { code: "not_confirmed", status: si.status, message: "The card has not been confirmed yet." } }, 409);
    }
    const pmId = idOf(si.payment_method);
    try {
      await stripeApi(env, "POST", `/customers/${encodeURIComponent(customer)}`, { invoice_settings: { default_payment_method: pmId } });
      const subs = await stripeSubscriptions(env, [customer]);
      for (const sub of subs) {
        await stripeApi(env, "POST", `/subscriptions/${encodeURIComponent(sub.id)}`, { default_payment_method: pmId });
      }
      console.log(`[Plan] ${row.id}: new default card on ${customer}, ${subs.length} subscription(s)`);
      return jsonResponse3({ card: cardOf(typeof si.payment_method === "object" ? si.payment_method : null), subscriptions_updated: subs.length });
    } catch (e) {
      return stripeFailure(e, "save the card");
    }
  });

  router.get("/api/billing/invoices", async (request, env) => {
    const row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    const customers = await accountCustomers(env, row);
    if (!customers.length) return jsonResponse3({ invoices: [] });
    try {
      const lists = await Promise.all(customers.map((c) => stripeApi(env, "GET", `/invoices?customer=${encodeURIComponent(c)}&limit=24`)));
      const invoices = [];
      for (const list of lists) {
        for (const inv of list?.data || []) {
          if (inv.status === "draft") continue;
          const line = inv.lines?.data?.[0] || {};
          invoices.push({
            id: inv.id,
            number: inv.number || null,
            created: iso(inv.created),
            total: inv.total ?? null,
            amount_paid: inv.amount_paid ?? null,
            amount_due: inv.amount_due ?? null,
            currency: inv.currency || null,
            status: inv.status || null,
            description: inv.description || line.description || null,
            period_start: iso(inv.period_start),
            period_end: iso(inv.period_end),
            pdf_url: inv.invoice_pdf ? `/api/billing/invoices/${inv.id}/pdf` : null
          });
        }
      }
      invoices.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
      return new Response(JSON.stringify({ invoices }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    } catch (e) {
      return stripeFailure(e, "read your invoices");
    }
  });

  router.get("/api/billing/invoices/:invoice_id/pdf", async (request, env) => {
    const row = await signedInAccount(request, env);
    if (!row) return unauthorized();
    const id = request.params?.invoice_id || "";
    if (!/^in_[A-Za-z0-9]+$/.test(id)) return jsonResponse3({ detail: { code: "not_found", message: "No such invoice." } }, 404);
    const customers = await accountCustomers(env, row);
    let inv;
    try {
      inv = await stripeApi(env, "GET", `/invoices/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e.status === 404) return jsonResponse3({ detail: { code: "not_found", message: "No such invoice." } }, 404);
      return stripeFailure(e, "read the invoice");
    }
    if (!customers.includes(idOf(inv.customer))) return jsonResponse3({ detail: { code: "not_found", message: "No such invoice." } }, 404);
    if (!inv.invoice_pdf) return jsonResponse3({ detail: { code: "not_ready", message: "This invoice has no PDF yet." } }, 404);
    let pdf;
    try {
      pdf = await fetch(inv.invoice_pdf, { redirect: "follow" });
    } catch (e) {
      return stripeFailure(e, "fetch the invoice PDF");
    }
    if (!pdf.ok) return stripeFailure({ status: pdf.status, message: "invoice PDF answered " + pdf.status }, "fetch the invoice PDF");
    const name = "WeylandAI-invoice-" + String(inv.number || inv.id).replace(/[^A-Za-z0-9-]/g, "") + ".pdf";
    return new Response(pdf.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  });
}
