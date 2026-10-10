// weyland-platform-worker/src/lib/stripe-api.js
//
// Stripe calls for embedded checkout (2026-10-07). stripeRequest() in
// stripe-billing.js encodes flat params only and uses the account's default
// API version; embedded Checkout needs nested params (line_items[0][price],
// metadata[...], subscription_data[...]) and a known API version, because the
// ui_mode value and the Stripe.js mount call were renamed in
// 2026-03-25.dahlia (embedded -> embedded_page, initEmbeddedCheckout ->
// createEmbeddedCheckoutPage). Every call made here pins the version below,
// and the client loads the Stripe.js release of the same name.

export const STRIPE_EMBEDDED_API_VERSION = "2026-09-30.endive";
export const STRIPE_JS_URL = "https://js.stripe.com/endive/stripe.js";

// Stripe's form encoding: nested objects and arrays in bracket notation.
export function toStripeForm(obj, prefix = "") {
  const parts = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") parts.push(toStripeForm(item, `${k}[${i}]`));
        else parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(item)}`);
      });
    } else if (typeof value === "object") {
      const nested = toStripeForm(value, k);
      if (nested) parts.push(nested);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

export async function stripeApi(env, method, path, params, { version = STRIPE_EMBEDDED_API_VERSION, idempotencyKey = null } = {}) {
  if (!env.STRIPE_SECRET_KEY) {
    const err = new Error("payments are not configured on this worker");
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  const headers = {
    "Authorization": "Basic " + btoa(env.STRIPE_SECRET_KEY + ":"),
    "Content-Type": "application/x-www-form-urlencoded"
  };
  if (version) headers["Stripe-Version"] = version;
  // A retried create with the same key returns the first answer instead of a second object (g056).
  if (idempotencyKey && method === "POST") headers["Idempotency-Key"] = String(idempotencyKey).slice(0, 255);
  const body = method === "GET" || !params ? undefined : toStripeForm(params);
  const resp = await fetch(`https://api.stripe.com/v1${path}`, { method, headers, body });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data.error?.message || `Stripe ${resp.status}`);
    err.status = resp.status;
    err.stripeError = data.error;
    throw err;
  }
  return data;
}
