// weyland-platform-worker/src/lib/pricing-checkout.js
//
// /pricing's checkout buttons, embedded (2026-10-07). The page's own
// triggerCheckout() set location.href to checkout.stripe.com (a page hop on
// its own, and inside the homepage overlay Stripe refused to load at all:
// "Stripe Checkout is not able to run in an iFrame"). This script, placed
// after it inside the page's outlet, replaces triggerCheckout with one that
// opens Stripe's embedded form in the page through WeylandCheckout
// (GET /api/billing/embedded-checkout.js). Every inline onclick on the page
// calls the global by name, so all ACTIVATE buttons and the suite button
// switch at once. Products that are not self-checkout-ready keep the email
// route they had.

import { CHECKOUT_READY_PRODUCTS, WEYLAND_SUBCONP_PRODUCT_ID } from "./stripe-billing.js";

export function checkoutLoaderSnippet() {
  return [
    "function weylandCheckoutHelper() {",
    "  if (window.WeylandCheckout) return Promise.resolve(window.WeylandCheckout);",
    "  if (window.__weylandCheckoutLoading) return window.__weylandCheckoutLoading;",
    "  window.__weylandCheckoutLoading = new Promise(function (resolve, reject) {",
    "    var s = document.createElement('script');",
    "    s.src = '/api/billing/embedded-checkout.js';",
    "    s.onload = function () { if (window.WeylandCheckout) resolve(window.WeylandCheckout); else reject(new Error('checkout did not load')); };",
    "    s.onerror = function () { window.__weylandCheckoutLoading = null; reject(new Error('checkout did not load')); };",
    "    document.head.appendChild(s);",
    "  });",
    "  return window.__weylandCheckoutLoading;",
    "}"
  ].join("\n");
}

export function pricingEmbeddedCheckoutScript() {
  const ready = JSON.stringify(Array.from(CHECKOUT_READY_PRODUCTS));
  return "<script>\n(function () {\n" + checkoutLoaderSnippet() + "\n" + [
    "  var READY = " + ready + ";",
    "  var ALIASES = { 'weyland-subconp-suite-seat': '" + WEYLAND_SUBCONP_PRODUCT_ID + "' };",
    "  window.triggerCheckout = function (sku, quantity, name) {",
    "    var productId = ALIASES[sku] || sku;",
    "    var btn = (window.event && window.event.target && window.event.target.closest) ? window.event.target.closest('button') : null;",
    "    if (READY.indexOf(productId) === -1) {",
    "      window.location.href = 'mailto:hello@weylandai.com?subject=' + encodeURIComponent(name + ' standalone seat') + '&body=' + encodeURIComponent('I would like to activate ' + name + ' as a standalone seat. Instant self-checkout for this tier is not live yet - please set up billing for my account.');",
    "      return;",
    "    }",
    "    var label = btn ? btn.textContent : null;",
    "    if (btn) { btn.disabled = true; btn.textContent = 'OPENING CHECKOUT...'; }",
    "    weylandCheckoutHelper()",
    "      .then(function (W) { return W.open({ product_id: productId, quantity: Math.max(1, parseInt(quantity, 10) || 1), name: name }); })",
    "      .catch(function (e) { if (btn) { btn.textContent = 'CHECKOUT UNAVAILABLE - EMAIL HELLO@WEYLANDAI.COM'; } })",
    "      .then(function () { if (btn && label && btn.textContent === 'OPENING CHECKOUT...') { btn.textContent = label; } if (btn) btn.disabled = false; });",
    "  };",
    "  if (/[?&]checkout=(return|success)/.test(location.search)) weylandCheckoutHelper();",
    "})();",
    "</script>"
  ].join("\n");
}

// /subscribe (the SubConP page): CONTINUE TO SECURE CHECKOUT opens the same
// embedded form for the chosen seat count. Its own script (assets/
// subscribe.js) sent a signed-out visitor to an off-site sign-in gateway
// first and then the whole page to checkout.stripe.com; Stripe's form
// collects the email, a signed-in account's email is used automatically, and
// the provisioning webhook creates or updates the account either way. This
// runs before that module script, so its capture listener answers first.
export function subscribeEmbeddedCheckoutScript() {
  return "<script>\n(function () {\n" + checkoutLoaderSnippet() + "\n" + [
    "  var btn = document.querySelector('[data-checkout]');",
    "  if (!btn) return;",
    "  function relabel() { if (/SIGN IN/i.test(btn.textContent)) btn.textContent = 'CONTINUE TO SECURE CHECKOUT'; }",
    "  try { new MutationObserver(relabel).observe(btn, { childList: true, characterData: true, subtree: true }); } catch (e) {}",
    "  btn.addEventListener('click', function (e) {",
    "    e.preventDefault();",
    "    e.stopImmediatePropagation();",
    "    var input = document.getElementById('seat-count');",
    "    var seats = Math.max(1, Math.min(250, parseInt(input && input.value, 10) || 1));",
    "    weylandCheckoutHelper().then(function (W) { return W.open({ product_id: '" + WEYLAND_SUBCONP_PRODUCT_ID + "', quantity: seats, name: 'WeylandAI SubConP' }); });",
    "  }, true);",
    "  if (/[?&]checkout=return/.test(location.search)) weylandCheckoutHelper();",
    "})();",
    "</script>"
  ].join("\n");
}

