// src/lib/stripe-billing.js
//
// MONOLITH_HELPER_MAP.md's Cluster G: Stripe billing config + webhook
// signature verification (FINANCIAL/SECURITY - extracted with the same
// extra care as the earlier billing.js/webhooks-subscription.js route
// extractions, since this is the shared primitive half those two left
// behind). Extracted verbatim from legacy-monolith.js - these are the
// same WEYLAND_PRODUCTS/CHECKOUT_READY_PRODUCTS/stripeRequest/
// verifyStripeWebhookSignature/verifyVendyaiForwardSignature values
// routes/billing.js and routes/webhooks-subscription.js already
// receive as injected deps; this just gives their real definitions a
// home instead of legacy-monolith.js's own top level.
//
// encoder2 (a plain `new TextEncoder()`) is declared between the two
// signature-verification functions in the original bundle, not before
// either of them - preserved in that exact position. This is safe
// because JS function declarations are hoisted but their bodies don't
// run until called, and by the time any real HTTP request reaches
// verifyStripeWebhookSignature, this module's top-level code (including
// the encoder2 declaration) has already finished executing - same
// ES-module semantics as the original bundle's top-level execution
// order.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort.

// Real billing routes matching what subscribe.js actually calls. Built
// 2026-08-31 after discovering /api/subscription/checkout (below) proxies
// through VendyAI's checkout API, which has no working implementation
// anywhere in the portfolio, and requires an AuthFor-gated user session
// that also doesn't work (authfor.com is an unconfigured GitHub Pages
// 404). These call Stripe directly with a real secret key and skip the
// login gate entirely - Stripe Checkout collects the customer's email on
// its own hosted page, so no account needs to exist before payment.
export const WEYLAND_SUBCONP_PRICE_ID = "price_1UAh7DLWTxUJi5AVaNKljKc7";
export const WEYLAND_SUBCONP_PRODUCT_ID = "weyland-subconp-seat";

// A la carte products - real Stripe Products/Prices, matching the prices
// already published on /pricing. tier: the products_enabled slug granted
// by requireProductAccess() on a successful purchase.
export const WEYLAND_PRODUCTS = {
  [WEYLAND_SUBCONP_PRODUCT_ID]: { priceId: WEYLAND_SUBCONP_PRICE_ID, tier: null },
  "weyland-cutsheetx-seat": { priceId: "price_1UAqxkLWTxUJi5AVk2l5N4Cg", tier: "cutsheetx" },
  "weyland-takeoffx-seat": { priceId: "price_1UAqxsLWTxUJi5AV6aJjh5Nc", tier: "takeoffx" },
  "weyland-propx-seat": { priceId: "price_1UAwDiLWTxUJi5AV42EqaRXi", tier: "propx" },
  "weyland-huntx-seat": { priceId: "price_1UAtsgLWTxUJi5AVmc9hxKTG", tier: "huntx" },
  "weyland-subx-seat": { priceId: "price_1UAuLJLWTxUJi5AVeQGMZegU", tier: "subx" },
  "weyland-meetingx-seat": { priceId: "price_1UAwDiLWTxUJi5AV3zx4ZMgp", tier: "meetingx" },
  "weyland-sightx-seat": { priceId: "price_1UAwEmLWTxUJi5AVnfVmPSPq", tier: "sightx" },
  // PropX Pro family - real live-mode Stripe objects (same account as everything
  // above). NOT wired to any real backend route yet - do not surface these on
  // /pricing or any checkout UI until #26/#27/#28 (real LienX/BidX/CoA routes)
  // are built. A live, chargeable price with no product behind it is worse than
  // not having the SKU at all.
  "weyland-lienx-seat": { priceId: "price_1UAxoNLWTxUJi5AV7ysXAvxm", tier: "lienx" },
  "weyland-bidx-seat": { priceId: "price_1UAxoOLWTxUJi5AVrw6I89f6", tier: "bidx" },
  "weyland-coa-seat": { priceId: "price_1UAxoOLWTxUJi5AVtRLsCXPq", tier: "coa" },
  // TakeoffX Pro, SubX Pro, HuntX Pro, SightX Pro - real live-mode Stripe
  // objects, but NONE of these 24 have a real backend route or page yet
  // (unlike lienx/bidx/coa above, which do). Registered here only so the
  // catalog endpoint and future checkout wiring have something real to
  // point at - do not surface any of these on /pricing or any nav until
  // each has actual working functionality behind it.
  "weyland-drawx-seat": { priceId: "price_1UAzFFLWTxUJi5AVqu5Mo8oi", tier: "drawx" },
  "weyland-asbuiltx-seat": { priceId: "price_1UAzEuLWTxUJi5AVYYpFhmov", tier: "asbuiltx" },
  "weyland-specx-seat": { priceId: "price_1UAzEvLWTxUJi5AV7GooVFVv", tier: "specx" },
  "weyland-rfax-seat": { priceId: "price_1UAzEwLWTxUJi5AVbt7di7am", tier: "rfax" },
  "weyland-changeordx-seat": { priceId: "price_1UAzEwLWTxUJi5AVEGEBbCzB", tier: "changeordx" },
  "weyland-permitx-seat": { priceId: "price_1UAzExLWTxUJi5AVNnusMWUs", tier: "permitx" },
  "weyland-safetyx-seat": { priceId: "price_1UAzExLWTxUJi5AVbuYnJgWq", tier: "safetyx" },
  "weyland-closex-seat": { priceId: "price_1UAzEyLWTxUJi5AVe8R5mxaa", tier: "closex" },
  "weyland-notesx-seat": { priceId: "price_1UAzEyLWTxUJi5AVA2LBoSfw", tier: "notesx" },
  "weyland-leadx-seat": { priceId: "price_1UAzEzLWTxUJi5AVgEKlta57", tier: "leadx" },
  "weyland-marketx-seat": { priceId: "price_1UAzF0LWTxUJi5AVmpyVEvLb", tier: "marketx" },
  "weyland-compx-seat": { priceId: "price_1UAzF0LWTxUJi5AV6GptNE42", tier: "compx" },
  "weyland-pricex-seat": { priceId: "price_1UAzF1LWTxUJi5AVuRxlbnaL", tier: "pricex" },
  "weyland-zoningx-seat": { priceId: "price_1UAzF1LWTxUJi5AVBIA2woi4", tier: "zoningx" },
  "weyland-riskx-seat": { priceId: "price_1UAzF2LWTxUJi5AV73PrQvi7", tier: "riskx" },
  "weyland-forecastx-seat": { priceId: "price_1UAzF3LWTxUJi5AVxp0lAbAH", tier: "forecastx" },
  "weyland-geox-seat": { priceId: "price_1UAzF3LWTxUJi5AVNz5ZtV4j", tier: "geox" },
  "weyland-sitex-seat": { priceId: "price_1UAzF4LWTxUJi5AVhLWKTCI3", tier: "sitex" },
  "weyland-dronex-seat": { priceId: "price_1UAzF4LWTxUJi5AV4VnC6MVh", tier: "dronex" },
  "weyland-photox-seat": { priceId: "price_1UAzF5LWTxUJi5AVRa52dt1u", tier: "photox" },
  "weyland-inspecx-seat": { priceId: "price_1UAzF6LWTxUJi5AVeycqwHkE", tier: "inspecx" },
  "weyland-survx-seat": { priceId: "price_1UAzF6LWTxUJi5AVURjQkscV", tier: "survx" },
  "weyland-mobilex-seat": { priceId: "price_1UAzF7LWTxUJi5AVbjF6Yzqg", tier: "mobilex" },
  "weyland-weatherx-seat": { priceId: "price_1UAzF7LWTxUJi5AVV0rfO1Rl", tier: "weatherx" }
};

// The 7 products with a real route/page/functionality behind them, plus the
// suite bundle - the only ones a real customer should be able to complete
// checkout for. Everything else in WEYLAND_PRODUCTS above is a real,
// live-mode Stripe price (so /api/billing/catalog can report on it) but has
// NO working product behind it yet. /pricing's own UI already only wires
// checkout buttons to this same set (see triggerCheckout() in the /pricing
// handler) - this is the server-side half of that gate, so a customer can't
// pay for something that doesn't exist via a different entry point (an old
// link, a future page reusing this catalog, a direct API call).
export const CHECKOUT_READY_PRODUCTS = new Set([
  WEYLAND_SUBCONP_PRODUCT_ID,
  "weyland-cutsheetx-seat",
  "weyland-takeoffx-seat",
  "weyland-propx-seat",
  "weyland-huntx-seat",
  "weyland-subx-seat",
  "weyland-meetingx-seat",
  "weyland-sightx-seat",
  "weyland-marketx-seat",
  "weyland-pricex-seat",
  "weyland-compx-seat",
  "weyland-weatherx-seat",
  "weyland-forecastx-seat",
  "weyland-geox-seat"
]);

// CompX reuses HuntX's own real data source directly - the TXDOT bid
// tabulation open-data set (de7b-7dna), not a new API. This is a *different*
// TXDOT dataset than the "upcoming lettings" one HuntX's opportunities table
// stores (qh8x-rm8r) - this one is per-bid-item, with vendor_name and a real
// low_bidder_flag, i.e. actual win/loss history, which the other dataset
// doesn't carry. Verified live 2026-09-02: one project's bid tabulation is
// many line-item rows sharing the same control_section_job_csj and the same
// bid_total_amount - dedup on (vendor, csj) before counting bids/wins, or
// "200 bids" is actually "1 project, 200 line items."

export async function stripeRequest(env2, method, path, params) {
  const body = params
    ? Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    : undefined;
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      "Authorization": "Basic " + btoa(env2.STRIPE_SECRET_KEY + ":"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.error?.message || `Stripe ${resp.status}`);
    err.stripeError = data.error;
    throw err;
  }
  return data;
}



// /api/subscription/checkout removed 2026-09-03 (Loop J - resolving the
// dual-checkout question the 2026-09-02 plan flagged and never closed).
// It was dead code: not referenced by any currently-served page (only
// worker.js itself and two archived versions/ snapshots), and genuinely
// broken - env2.VENDYAI_API_URL was never a configured secret and the
// VENDYAI_API constant it fell back to was a literal empty string, so
// the fetch() call would throw on every real invocation. It also
// hardcoded a duplicate $2,000/mo price (matching the real SubConP price
// today by coincidence, with a "Weyland Weyland" name typo) instead of
// reading WEYLAND_PRODUCTS like /api/billing/checkout/create correctly
// does - a real drift risk the moment the catalog price ever changes.
// /api/billing/checkout/create (above) is the one real, working,
// catalog-driven checkout path - see mascom/.reward_hack_audit/README.md.
// Real Stripe webhook signature verification (Stripe-Signature header:
// "t=<ts>,v1=<hex hmac>"). Hex output, unlike createHmacSignature above
// which is base64url - Stripe's own format, not invented here.
export async function verifyStripeWebhookSignature(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(
    (sigHeader || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2)
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return { valid: false, reason: "malformed_signature_header" };
  const age = Math.floor(Date.now() / 1e3) - parseInt(timestamp, 10);
  if (isNaN(age) || age > 300) return { valid: false, reason: "expired" };
  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder2.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder2.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expectedHex !== v1) return { valid: false, reason: "signature_mismatch" };
  return { valid: true };
}
const encoder2 = new TextEncoder();

// Verifies vendyai.com's forwarding signature scheme - matches its real
// hmacSha256Base64Url exactly (base64url, X-Webhook-Signature +
// X-Webhook-Timestamp headers, not Stripe's own Stripe-Signature format).
// Fixed 2026-09-09: checkout session CREATION was migrated to route through
// vendyai on 2026-09-03 ("all ventures sell through vendyai"), but this
// handler was never updated to match - it still only checked
// Stripe-Signature, which vendyai's forward never sends. Every real
// completed purchase since that migration would have been rejected with
// 401 here (hadn't happened yet only because no real purchase had gone
// through the new path in that window - caught before it could matter).
export async function verifyVendyaiForwardSignature(rawBody, timestamp, signature, secret) {
  if (!timestamp || !signature) return { valid: false, reason: "malformed_signature_header" };
  const age = Math.floor(Date.now() / 1e3) - parseInt(timestamp, 10);
  if (isNaN(age) || age > 300) return { valid: false, reason: "expired" };
  const key = await crypto.subtle.importKey(
    "raw", encoder2.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder2.encode(`${timestamp}.${rawBody}`));
  const binary = String.fromCharCode(...new Uint8Array(sigBuf));
  const expected = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  if (expected !== signature) return { valid: false, reason: "signature_mismatch" };
  return { valid: true };
}
