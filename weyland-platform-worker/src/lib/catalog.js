// weyland-platform-worker/src/lib/catalog.js
//
// The live price of every SKU, as Stripe has it (2026-10-07). One place for
// GET /api/billing/catalog, /pricing's server-rendered prices and the plan
// choices in the account view, so a card can never show one price while the
// payment form charges another (GeoX's card said $149 a month, Stripe charged
// $249).
//
// Read from Stripe in parallel and kept: per isolate for a minute, in KV
// (env.CACHE) for STALE_AFTER_MS, then served stale while a refresh runs in the
// background (ctx.waitUntil). Only a cold cache makes a visitor wait for Stripe.
//
// trial_period_days is always null: no checkout applies a price-level trial
// (John, 2026-10-07: the free month comes only with the $100 offer; the SubConP
// price still carries trial_period_days 30 in Stripe, which is immutable on a
// price, and is ignored).

import { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS, stripeRequest } from "./stripe-billing.js";

const KV_KEY = "billing_catalog_v2";
const MEMORY_MS = 60 * 1000;
export const STALE_AFTER_MS = 5 * 60 * 1000;
const KV_TTL_SECONDS = 24 * 60 * 60;

let memory = null; // { at, value }
let refreshing = null;

async function priceEntry(env, productId, cfg) {
  try {
    const price = await stripeRequest(env, "GET", `/prices/${cfg.priceId}?expand[]=product`);
    const oneTime = !price.recurring;
    return {
      id: productId,
      checkout_ready: price.active === true && CHECKOUT_READY_PRODUCTS.has(productId),
      price_active: price.active === true,
      price_id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || null,
      one_time: oneTime,
      kind: cfg.kind || "subscription",
      trial_period_days: null,
      livemode: price.livemode,
      name: typeof price.product === "object" && price.product ? price.product.name : null
    };
  } catch (err) {
    console.error("[Billing] catalog error:", productId, err.message);
    return { id: productId, checkout_ready: false, blockers: [err.message] };
  }
}

/** Read every SKU's price from Stripe now (in parallel). */
export async function fetchCatalog(env) {
  const products = await Promise.all(Object.entries(WEYLAND_PRODUCTS).map(([id, cfg]) => priceEntry(env, id, cfg)));
  return { fetched_at: new Date().toISOString(), products };
}

async function refresh(env) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const value = await fetchCatalog(env);
      // Only a complete read replaces what is kept.
      if (value.products.every((p) => !p.blockers)) {
        memory = { at: Date.now(), value };
        if (env.CACHE) await env.CACHE.put(KV_KEY, JSON.stringify(value), { expirationTtl: KV_TTL_SECONDS });
      }
      return value;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * checkout_ready follows the gate (CHECKOUT_READY_PRODUCTS) as it is now, not as
 * it was when the copy was kept: a product taken off sale by a deploy is off
 * sale in the catalog at once, not after the kept copy's next refresh
 * (2026-10-08: the six tools of fix 7 read checkout_ready true for minutes after
 * the deploy that removed them). A copy kept before price_active existed uses
 * its own checkout_ready as the price's active flag, so this only narrows.
 */
function gated(value) {
  if (!value || !Array.isArray(value.products)) return value;
  return {
    ...value,
    products: value.products.map((p) => {
      if (!p || p.blockers) return p;
      const active = typeof p.price_active === "boolean" ? p.price_active : p.checkout_ready === true;
      return { ...p, checkout_ready: active && CHECKOUT_READY_PRODUCTS.has(p.id) };
    })
  };
}

/**
 * The catalog: { fetched_at, products:[...] }. Fresh enough for a page; never
 * older than STALE_AFTER_MS plus one background refresh.
 */
export async function getCatalog(env, ctx) {
  return gated(await getCatalogKept(env, ctx));
}

async function getCatalogKept(env, ctx) {
  const now = Date.now();
  if (memory && now - memory.at < MEMORY_MS) return memory.value;
  let kept = null;
  if (env.CACHE) {
    try { kept = JSON.parse((await env.CACHE.get(KV_KEY)) || "null"); } catch { kept = null; }
  }
  if (kept && Array.isArray(kept.products)) {
    const age = now - Date.parse(kept.fetched_at || 0);
    memory = { at: now, value: kept };
    if (!(age < STALE_AFTER_MS)) {
      const job = refresh(env).catch((e) => console.error("[Billing] catalog refresh failed:", e.message));
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(job);
    }
    return kept;
  }
  return refresh(env);
}

/** { [productId]: entry } for quick lookups. */
export function byId(catalog) {
  return Object.fromEntries((catalog?.products || []).map((p) => [p.id, p]));
}

/** "$2,000" for 200000 cents. */
export function dollars(cents, currency = "usd") {
  const n = Number(cents);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: String(currency || "usd").toUpperCase(), minimumFractionDigits: n % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(n / 100);
  } catch {
    return "$" + (n / 100).toLocaleString("en-US");
  }
}

/** Test hook: forget the per-isolate copy. */
export function _resetCatalogMemory() {
  memory = null;
  refreshing = null;
}
