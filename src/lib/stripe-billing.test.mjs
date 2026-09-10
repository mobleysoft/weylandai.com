import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WEYLAND_SUBCONP_PRICE_ID,
  WEYLAND_SUBCONP_PRODUCT_ID,
  WEYLAND_PRODUCTS,
  CHECKOUT_READY_PRODUCTS,
  stripeRequest,
  verifyStripeWebhookSignature,
  verifyVendyaiForwardSignature,
} from "./stripe-billing.js";

test("WEYLAND_PRODUCTS: the subconp product's priceId matches the real exported price id constant", () => {
  assert.equal(WEYLAND_PRODUCTS[WEYLAND_SUBCONP_PRODUCT_ID].priceId, WEYLAND_SUBCONP_PRICE_ID);
});

test("WEYLAND_PRODUCTS: every entry has a real Stripe-shaped price id", () => {
  for (const [slug, entry] of Object.entries(WEYLAND_PRODUCTS)) {
    assert.match(entry.priceId, /^price_/, `${slug} should have a real Stripe price id`);
  }
});

test("CHECKOUT_READY_PRODUCTS: only contains slugs that are real keys in WEYLAND_PRODUCTS", () => {
  for (const slug of CHECKOUT_READY_PRODUCTS) {
    assert.ok(slug in WEYLAND_PRODUCTS, `${slug} is checkout-ready but missing from WEYLAND_PRODUCTS`);
  }
});

test("CHECKOUT_READY_PRODUCTS: does not include known not-yet-built products (real gate, not just a catalog)", () => {
  assert.ok(!CHECKOUT_READY_PRODUCTS.has("weyland-lienx-seat"));
  assert.ok(!CHECKOUT_READY_PRODUCTS.has("weyland-drawx-seat"));
});

test("stripeRequest: real happy path sends Basic auth built from STRIPE_SECRET_KEY and form-encodes params", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl, seenInit;
  globalThis.fetch = async (url, init) => {
    seenUrl = url;
    seenInit = init;
    return { ok: true, async json() { return { id: "cs_test_1" }; } };
  };
  try {
    const result = await stripeRequest({ STRIPE_SECRET_KEY: "sk_test_abc" }, "POST", "/checkout/sessions", { mode: "subscription", "line_items[0][price]": "price_1" });
    assert.equal(seenUrl, "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(seenInit.method, "POST");
    assert.equal(seenInit.headers["Authorization"], "Basic " + btoa("sk_test_abc:"));
    assert.equal(seenInit.headers["Content-Type"], "application/x-www-form-urlencoded");
    assert.ok(seenInit.body.includes("mode=subscription"));
    assert.equal(result.id, "cs_test_1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stripeRequest: real error path surfaces Stripe's error message and attaches stripeError", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false, status: 402,
    async json() { return { error: { message: "Your card was declined.", code: "card_declined" } }; },
  });
  try {
    await assert.rejects(
      () => stripeRequest({ STRIPE_SECRET_KEY: "sk_test_abc" }, "POST", "/charges", {}),
      (err) => {
        assert.equal(err.message, "Your card was declined.");
        assert.equal(err.stripeError.code, "card_declined");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stripeRequest: falls back to a generic status-based message when Stripe gives no error body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 500, async json() { return {}; } });
  try {
    await assert.rejects(
      () => stripeRequest({ STRIPE_SECRET_KEY: "sk_test_abc" }, "GET", "/x", null),
      /Stripe 500/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Real HMAC-SHA256 signature helpers, computed independently here (not
// imported from the module under test) so a broken verify function
// can't accidentally validate itself.
async function computeStripeV1(rawBody, timestamp, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  return Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeVendyaiSig(rawBody, timestamp, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const binary = String.fromCharCode(...new Uint8Array(sigBuf));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

test("verifyStripeWebhookSignature: real valid signature computed independently passes", async () => {
  const secret = "whsec_test_secret";
  const rawBody = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const v1 = await computeStripeV1(rawBody, timestamp, secret);
  const result = await verifyStripeWebhookSignature(rawBody, `t=${timestamp},v1=${v1}`, secret);
  assert.equal(result.valid, true);
});

test("verifyStripeWebhookSignature: rejects a tampered body with the correct signature for a different body", async () => {
  const secret = "whsec_test_secret";
  const timestamp = Math.floor(Date.now() / 1000);
  const v1 = await computeStripeV1(JSON.stringify({ id: "evt_1" }), timestamp, secret);
  const result = await verifyStripeWebhookSignature(JSON.stringify({ id: "evt_2" }), `t=${timestamp},v1=${v1}`, secret);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "signature_mismatch");
});

test("verifyStripeWebhookSignature: rejects the wrong secret", async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const v1 = await computeStripeV1("body", timestamp, "correct_secret");
  const result = await verifyStripeWebhookSignature("body", `t=${timestamp},v1=${v1}`, "wrong_secret");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "signature_mismatch");
});

test("verifyStripeWebhookSignature: rejects an expired timestamp (>300s old)", async () => {
  const secret = "whsec_test_secret";
  const rawBody = "body";
  const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
  const v1 = await computeStripeV1(rawBody, oldTimestamp, secret);
  const result = await verifyStripeWebhookSignature(rawBody, `t=${oldTimestamp},v1=${v1}`, secret);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "expired");
});

test("verifyStripeWebhookSignature: rejects a malformed or missing signature header", async () => {
  assert.equal((await verifyStripeWebhookSignature("body", "", "secret")).reason, "malformed_signature_header");
  assert.equal((await verifyStripeWebhookSignature("body", "garbage", "secret")).reason, "malformed_signature_header");
  assert.equal((await verifyStripeWebhookSignature("body", "t=123", "secret")).reason, "malformed_signature_header");
});

test("verifyVendyaiForwardSignature: real valid signature computed independently passes", async () => {
  const secret = "vendyai_forward_secret";
  const rawBody = JSON.stringify({ event: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = await computeVendyaiSig(rawBody, timestamp, secret);
  const result = await verifyVendyaiForwardSignature(rawBody, timestamp, sig, secret);
  assert.equal(result.valid, true);
});

test("verifyVendyaiForwardSignature: rejects a mismatched signature", async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const result = await verifyVendyaiForwardSignature("body", timestamp, "not-a-real-signature", "secret");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "signature_mismatch");
});

test("verifyVendyaiForwardSignature: rejects an expired timestamp", async () => {
  const secret = "vendyai_forward_secret";
  const rawBody = "body";
  const oldTimestamp = Math.floor(Date.now() / 1000) - 301;
  const sig = await computeVendyaiSig(rawBody, oldTimestamp, secret);
  const result = await verifyVendyaiForwardSignature(rawBody, oldTimestamp, sig, secret);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "expired");
});

test("verifyVendyaiForwardSignature: rejects missing timestamp or signature", async () => {
  assert.equal((await verifyVendyaiForwardSignature("body", null, "sig", "secret")).reason, "malformed_signature_header");
  assert.equal((await verifyVendyaiForwardSignature("body", 123, null, "secret")).reason, "malformed_signature_header");
});

test("verifyVendyaiForwardSignature: output is real base64url (no +, /, or = padding)", async () => {
  const secret = "s";
  const rawBody = "x".repeat(50); // long enough body to likely produce +/= in plain base64
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = await computeVendyaiSig(rawBody, timestamp, secret);
  assert.ok(!sig.includes("+"));
  assert.ok(!sig.includes("/"));
  assert.ok(!sig.includes("="));
  const result = await verifyVendyaiForwardSignature(rawBody, timestamp, sig, secret);
  assert.equal(result.valid, true);
});
