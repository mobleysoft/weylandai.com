// weyland-platform-worker/src/lib/stripe-billing.js
//
// Self-contained fork of ../../../src/lib/stripe-billing.js, copied
// verbatim - real financial/security code (WEYLAND_PRODUCTS catalog,
// CHECKOUT_READY_PRODUCTS gate, stripeRequest, and both webhook
// signature-verification functions). Previously these were 'injected
// deps' that routes/billing.js and routes/webhooks-subscription.js
// received from legacy-monolith.js's own top level rather than
// importing directly - as of the 2026-09-10 stripe-billing.js
// extraction (Cluster G) they have a real module home, so this Worker
// imports them directly from this fork instead of re-injecting.
// Needs env.STRIPE_SECRET_KEY (GET /api/billing/catalog only - checkout
// creation itself routes through the VENDYAI service binding, not this
// key), env.STRIPE_WEBHOOK_SECRET and env.SUBSCRIPTION_WEBHOOK_SECRET
// (webhook signature verification) bound as real Worker secrets - see
// this Worker's wrangler.toml / deployment notes for provisioning status.
//
// Original header follows, preserved for provenance:
//
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

// The first-submittal offer (John, 2026-10-07): $100 one-time buys the first
// submittal and 30 days of every product. No automatic charge, ever: when the
// 30 days end the account keeps the free tools until its owner chooses a plan.
// Stripe product prod_VOlLa2fvWDim0E "WeylandAI First Submittal (includes 30
// days of every product)", price below ($100.00 USD one-time, lookup_key
// weyland-first-submittal-100), created 2026-10-07 in the live catalog.
// kind "offer": sold in Checkout's payment mode, granted by the payment webhook
// (routes/webhooks-subscription.js) for OFFER_ACCESS_DAYS from the grant.
export const WEYLAND_OFFER_PRODUCT_ID = "weyland-first-submittal";
export const WEYLAND_OFFER_PRICE_ID = "price_1UNxocLWTxUJi5AVylLigOvr";
export const OFFER_ACCESS_DAYS = 30;
export const OFFER_SUBMITTAL_CREDITS = 1;
export const OFFER_UNIT_AMOUNT = 10000;

// A la carte products - real Stripe Products/Prices, matching the prices
// already published on /pricing. tier: the products_enabled slug granted
// by requireProductAccess() on a successful purchase (null: the SubConP
// suite, checked by subscription_tier). kind "offer": a one-time purchase
// that is not a subscription (isOfferProduct below); every other entry is a
// monthly subscription price.
export const WEYLAND_PRODUCTS = {
  [WEYLAND_OFFER_PRODUCT_ID]: { priceId: WEYLAND_OFFER_PRICE_ID, tier: null, kind: "offer", mode: "payment" },
  [WEYLAND_SUBCONP_PRODUCT_ID]: { priceId: WEYLAND_SUBCONP_PRICE_ID, tier: null },
  "weyland-cutsheetx-seat": { priceId: "price_1UAqxkLWTxUJi5AVk2l5N4Cg", tier: "cutsheetx" },
  "weyland-takeoffx-seat": { priceId: "price_1UAqxsLWTxUJi5AV6aJjh5Nc", tier: "takeoffx" },
  "weyland-propx-seat": { priceId: "price_1UAwDiLWTxUJi5AV42EqaRXi", tier: "propx" },
  "weyland-huntx-seat": { priceId: "price_1UAtsgLWTxUJi5AVmc9hxKTG", tier: "huntx" },
  "weyland-subx-seat": { priceId: "price_1UAuLJLWTxUJi5AVeQGMZegU", tier: "subx" },
  "weyland-meetingx-seat": { priceId: "price_1UAwDiLWTxUJi5AV3zx4ZMgp", tier: "meetingx" },
  "weyland-sightx-seat": { priceId: "price_1UAwEmLWTxUJi5AVnfVmPSPq", tier: "sightx" },
  // PropX Pro family - real live-mode Stripe objects (same account as everything
  // above). Backend routes were built 2026-09-17/21 (src/routes/document-generators.js:
  // POST/GET lien-waivers, bid-packages, coa-packages, all requireProductAccess-gated,
  // real end-to-end test passing) - moved to CHECKOUT_READY_PRODUCTS below, see that
  // comment for the 2026-09-23 depth-audit correction.
  "weyland-lienx-seat": { priceId: "price_1UAxoNLWTxUJi5AV7ysXAvxm", tier: "lienx" },
  "weyland-bidx-seat": { priceId: "price_1UAxoOLWTxUJi5AVrw6I89f6", tier: "bidx" },
  "weyland-coa-seat": { priceId: "price_1UAxoOLWTxUJi5AVtRLsCXPq", tier: "coa" },
  // TakeoffX Pro, SubX Pro, HuntX Pro, SightX Pro family - real live-mode Stripe
  // objects. 14 of these (drawx/asbuiltx/specx/rfax/changeordx/permitx/safetyx/
  // closex/notesx/inspecx/survx above the marketx line, and coa/lienx/bidx above)
  // got real requireProductAccess-gated backend routes + a real marketing page
  // in src/routes/document-generators.js and src/lib/marketing-pages.js since this
  // comment was written - moved to CHECKOUT_READY_PRODUCTS 2026-09-23. The
  // remaining ones here (leadx, marketx [deliberately retired, see below],
  // zoningx, riskx, sitex, dronex, photox, mobilex) still have no real backend
  // route or page - do not surface those on /pricing or any nav until they do.
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
  "weyland-weatherx-seat": { priceId: "price_1UAzF7LWTxUJi5AVV0rfO1Rl", tier: "weatherx" },
  // weyland-wire-seat: added 2026-10-02, the first real pilot tenant of
  // mobleyreport.com's "provenance-first wire" template
  // (routes/wire.js/lib/wire-tenant.js) - WeylandAI selling access to its
  // own construction-trade-press wire + its own real audited
  // price-extraction reports as a trust signal. $49.00/mo real recurring
  // Stripe price (sk_live_... Product+Price created directly against the
  // same Stripe account every other entry above lives in, not fabricated
  // - see lib/wire-tenant.js's own header for the creation record).
  "weyland-wire-seat": { priceId: "price_1UMD5fLWTxUJi5AVF6xGy8mK", tier: "wire" }
};

// The products with a real route/page/functionality behind them, plus the
// suite bundle - the only ones a real customer should be able to complete
// checkout for. Everything else in WEYLAND_PRODUCTS above is a real,
// live-mode Stripe price (so /api/billing/catalog can report on it) but has
// NO working product behind it yet. /pricing's own UI already only wires
// checkout buttons to this same set (see triggerCheckout() in the /pricing
// handler) - this is the server-side half of that gate, so a customer can't
// pay for something that doesn't exist via a different entry point (an old
// link, a future page reusing this catalog, a direct API call).
export const CHECKOUT_READY_PRODUCTS = new Set([
  WEYLAND_OFFER_PRODUCT_ID,
  WEYLAND_SUBCONP_PRODUCT_ID,
  "weyland-cutsheetx-seat",
  "weyland-takeoffx-seat",
  "weyland-propx-seat",
  "weyland-huntx-seat",
  "weyland-subx-seat",
  "weyland-meetingx-seat",
  "weyland-sightx-seat",
  // weyland-marketx-seat deliberately excluded (fixed 2026-09-20): its own
  // backend route (GET /api/marketx/trends) intentionally returns a real
  // HTTP 501 "retired pending real first-party data" - no working feature
  // exists behind this price yet, so it must not be self-checkout-able
  // even though it's still a valid, active, checkout_ready:false-flagged
  // Stripe price (kept in WEYLAND_PRODUCTS above so /api/billing/catalog
  // can still report on it honestly).
  // weyland-pricex-seat removed 2026-10-08 (fix 7 of plan/weylandai_value_report.md):
  // its page prints "undefined" in every card; the FRED index behind it is gone.
  "weyland-compx-seat",
  "weyland-weatherx-seat",
  "weyland-forecastx-seat",
  "weyland-geox-seat",
  // Added 2026-09-23 (single-venture depth audit, real underclaiming gap
  // fixed): these 14 all have real requireProductAccess-gated generate+
  // download routes in src/routes/document-generators.js (confirmed via
  // node --test src/routes/document-generators.test.mjs, a real passing
  // end-to-end test through authenticate -> requireProductAccess ->
  // renderHtmlToPdf -> storeDocumentPdf -> D1 insert for the lien-waivers
  // route) and a real dedicated marketing page each (verified live,
  // e.g. GET https://weylandai.com/lienx -> 200, real title/form/JS) -
  // the CHECKOUT_READY_PRODUCTS gate here was just never updated after
  // that backend work landed, so real customers were hitting a 409
  // ("isn't available for self-checkout yet - email hello@weylandai.com")
  // for a product that actually works. /pricing's own card grid and
  // triggerCheckout() allowlist were updated in the same pass so a real
  // checkout button now exists for each, not just this server-side flag.
  "weyland-lienx-seat",
  "weyland-bidx-seat",
  "weyland-coa-seat",
  // Re-listed 2026-10-08 evening (owner's decision) after passing live on the
  // weyland-docs-worker (page jobs, one OCR'd page per call): DrawX on the 21-sheet
  // 36 x 24 Fayette set (11 s), AsBuiltX on two of its sheets, SpecX on the 288-page
  // Berryessa manual (9 s), InspecX on the FCMAT FIT inspection (9 pages, 7 OCR'd,
  // 87 s) and SurvX on the 289-page NSW dilapidation report (11 s).
  "weyland-drawx-seat",
  "weyland-asbuiltx-seat",
  "weyland-specx-seat",
  "weyland-inspecx-seat",
  "weyland-survx-seat",
  // PriceX listed 2026-10-09 (owner's decision), rebuilt on the makers' price
  // books (weyland-forms-worker /pricex): on the live Berryessa schedule 8 of 16
  // lines priced from the LCN, Von Duprin, Schlage and Zero books, 4 exactly; the
  // rest are listed as not priced, never estimated. The paid output is the CSV.
  "weyland-pricex-seat",
  // History: they were removed earlier 2026-10-08 (fix 7 of
  // plan/weylandai_value_report.md): on the audit documents each one errors
  // (HTTP 500 "Worker exceeded memory limit" on a 36 x 24 drawing sheet for
  // DrawX and AsBuiltX; "Worker exceeded CPU time limit" on a 33-page spec
  // extract for SpecX, a 9-page inspection report for InspecX and a condition
  // survey for SurvX). They are not sold until each passes on
  // tools/corpus/plan-sets, door-schedules and field-reports; /pricing shows
  // NOT SOLD YET with the reason, and GET /api/billing/plan lists no seat for them.
  "weyland-rfax-seat",
  "weyland-changeordx-seat",
  "weyland-permitx-seat",
  "weyland-safetyx-seat",
  "weyland-closex-seat",
  "weyland-notesx-seat",
  // Added 2026-10-02 alongside the WEYLAND_PRODUCTS entry above - the
  // real backend (routes/wire.js: GET /wire, GET /api/wire/news,
  // /api/wire/synthesis, /api/wire/reports) is live, so this is
  // self-checkout-ready like every other real product here, not a
  // teaser price with no feature behind it.
  "weyland-wire-seat"
]);

/** The one-time first-submittal offer (not a subscription). */
export function isOfferProduct(productId) {
  return WEYLAND_PRODUCTS[productId]?.kind === "offer";
}

/** Catalog entries that are monthly subscriptions (everything but the offer). */
export function subscriptionProducts() {
  return Object.entries(WEYLAND_PRODUCTS).filter(([, cfg]) => cfg.kind !== "offer");
}

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
