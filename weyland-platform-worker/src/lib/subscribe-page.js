// weyland-platform-worker/src/lib/subscribe-page.js
//
// /subscribe, the SubConP page (rewritten 2026-10-07). Before: "$0 for the
// first 30 days, then" over a checkout whose 30-day Stripe trial turned into a
// $2,000 charge on day 30 unless cancelled, and a script (/assets/subscribe.js)
// that sent a signed-out visitor to an off-site sign-in gateway and then the
// whole page to checkout.stripe.com through the hosted checkout endpoint.
// Now: the plan is billed from the day it is chosen (the free month exists only
// through the $100 first-submittal offer, offered here too), the payment form
// opens in the page (WeylandCheckout, Terms accepted in it), prices come from
// the catalog (data-sku-price, written by lib/pricing-checkout.js
// renderCatalogPrices), and the footer names Argo LLC with the Terms and the
// Privacy Policy. No mail-app link.

import { checkoutLoaderSnippet } from "./pricing-checkout.js";
import { WEYLAND_SUBCONP_PRODUCT_ID, WEYLAND_OFFER_PRODUCT_ID } from "./stripe-billing.js";
import { DEFAULT_TERMS_URL, DEFAULT_PRIVACY_URL } from "./legal.js";

const PAGE_SCRIPT = `
  var SUITE = '${WEYLAND_SUBCONP_PRODUCT_ID}';
  var OFFER = '${WEYLAND_OFFER_PRODUCT_ID}';
  var seatInput = document.getElementById('seat-count');
  var totalEl = document.querySelector('[data-total]');
  var checkoutBtn = document.querySelector('[data-checkout]');
  var offerBtn = document.querySelector('[data-offer]');
  var result = document.querySelector('[data-result]');
  var railStatus = document.querySelector('[data-service-status]');
  var authStatus = document.querySelector('[data-auth-status]');
  var box = document.querySelector('.checkout');
  function unitDollars() {
    var cents = box ? parseInt(box.getAttribute('data-unit-amount'), 10) : NaN;
    return isFinite(cents) && cents > 0 ? cents / 100 : 2000;
  }
  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function seats() {
    var v = Math.max(1, Math.min(250, parseInt(seatInput.value, 10) || 1));
    seatInput.value = v;
    totalEl.textContent = fmt.format(v * unitDollars());
    return v;
  }
  function show(text, kind) {
    result.hidden = !text;
    result.className = 'result' + (kind ? ' ' + kind : '');
    result.textContent = text || '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-seat-step]'), function (b) {
    b.addEventListener('click', function () { seatInput.value = seats() + Number(b.getAttribute('data-seat-step')); seats(); });
  });
  seatInput.addEventListener('input', seats);
  seats();
  function open(productId, quantity, name) {
    show('', '');
    return weylandCheckoutHelper()
      .then(function (W) { return W.open({ product_id: productId, quantity: quantity, name: name }); })
      .catch(function () { show('The payment form did not load. Check the connection and try again.', 'bad'); });
  }
  checkoutBtn.addEventListener('click', function () { open(SUITE, seats(), 'WeylandAI SubConP'); });
  if (offerBtn) offerBtn.addEventListener('click', function () { open(OFFER, 1, 'First submittal'); });
  window.addEventListener('weyland-checkout', function (e) {
    var d = (e && e.detail) || {};
    if (d.status === 'active') show('Done: it is on your account.', 'good');
  });
  fetch('/api/billing/catalog', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    var p = (d.products || []).filter(function (x) { return x.id === SUITE; })[0];
    if (p && p.checkout_ready) { railStatus.textContent = 'PAYMENT RAIL READY'; checkoutBtn.disabled = false; }
    else { railStatus.textContent = 'PAYMENT RAIL NOT READY'; railStatus.classList.add('offline'); checkoutBtn.disabled = true; show('Checkout is not available right now.', 'bad'); }
  }).catch(function () { railStatus.textContent = 'PAYMENT RAIL NOT READY'; railStatus.classList.add('offline'); });
  fetch('/api/auth/session/check', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.valid) { authStatus.textContent = 'NOT SIGNED IN: THE FORM ASKS FOR YOUR EMAIL'; return; }
    return fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
      authStatus.textContent = m && m.user && m.user.email ? 'SIGNED IN AS ' + String(m.user.email).toUpperCase() : 'SIGNED IN';
    });
  }).catch(function () { authStatus.textContent = 'NOT SIGNED IN: THE FORM ASKS FOR YOUR EMAIL'; });
  if (/[?&]checkout=(return|success)/.test(location.search)) weylandCheckoutHelper();
`;

export function subscribePageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Subscribe to WeylandAI SubConP, the Subcontractor Operating Package.">
  <title>SubConP / WeylandAI</title>
  <link rel="stylesheet" href="/assets/subscribe.css?v=20260729-1">
  <style>
    .linkish { border: 0; padding: 0; background: none; color: var(--gold, #e7b92d); font: inherit; text-decoration: underline; cursor: pointer; }
    .offer-note { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line, rgba(238,233,221,.14)); }
    footer .legal a { justify-self: auto; }
    footer .contact { justify-self: end; user-select: all; }
    @media (max-width: 900px) { footer .contact { justify-self: start; } }
  </style>
</head>
<body>
  <div class="field" aria-hidden="true"></div>
  <header>
    <a class="brand" href="/"><b>W</b><span>WEYLAND<br>ARTIFICIAL INTELLIGENCE</span></a>
    <nav><a href="/sightx/">SightX</a></nav>
    <span class="status" data-auth-status style="margin-right: 1rem;">CHECKING ACCOUNT</span>
    <span class="status" data-service-status>CHECKING PAYMENT RAIL</span>
  </header>

  <main>
    <section class="copy">
      <p class="eyebrow">SUBCONTRACTOR OPERATING PACKAGE / 01</p>
      <h1>Run the back office.<br><em>Keep the field moving.</em></h1>
      <p class="lede"><b>SubConP is the Subcontractor Operating Package:</b> project discovery, submittals, takeoffs, cut sheets, proposals, and spatial review operating on one shared project record.</p>
      <ol class="products" aria-label="Products included in SubConP">
        <li><b>HuntX</b><span>Opportunity discovery.</span></li>
        <li><b>SubX</b><span>Submittal Express.</span></li>
        <li><b>TakeoffX</b><span>Takeoff Express.</span></li>
        <li><b>CutsheetX</b><span>Cut Sheet Express.</span></li>
        <li><b>PropX</b><span>Proposal Express.</span></li>
        <li><b>SightX</b><span>Spatial project intelligence.</span></li>
      </ol>
      <p class="boundary"><b>Commercial boundary:</b> <span data-sku-price="${WEYLAND_SUBCONP_PRODUCT_ID}">$2,000</span> per active operator seat, billed monthly from the day you subscribe, until you cancel. Implementation scope, data migration, custom integrations, and usage above the included policy are quoted separately.</p>
    </section>

    <aside class="checkout" aria-labelledby="checkout-title" data-sku-unit="${WEYLAND_SUBCONP_PRODUCT_ID}" data-unit-amount="200000">
      <span class="card-index">SUBCONP / MONTHLY</span>
      <h2 id="checkout-title">Activate operator seats</h2>
      <div class="trial-note" style="color:#e7b92d;font:700 11px/1.4 var(--mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;margin-top:24px">Billed today, then monthly. Cancel any time in your account.</div>
      <div class="price"><strong data-sku-price="${WEYLAND_SUBCONP_PRODUCT_ID}">$2,000</strong><span>USD<br>PER SEAT / MONTH</span></div>
      <label for="seat-count">Active seats</label>
      <div class="seat-control">
        <button type="button" data-seat-step="-1" aria-label="Remove one seat">&minus;</button>
        <input id="seat-count" type="number" min="1" max="250" value="1" inputmode="numeric">
        <button type="button" data-seat-step="1" aria-label="Add one seat">+</button>
      </div>
      <div class="total"><span>Monthly subscription</span><b data-total>$2,000</b></div>
      <button class="primary" type="button" data-checkout>CONTINUE TO SECURE CHECKOUT</button>
      <p class="checkout-note" data-checkout-note>The payment form opens in this page (Stripe). No card data touches WeylandAI servers.</p>
      <div class="result" data-result hidden></div>
      <p class="checkout-note offer-note">Not ready for a plan? <button type="button" class="linkish" data-offer>Start with your first submittal for <span data-sku-price="${WEYLAND_OFFER_PRODUCT_ID}">$100</span></button>: it includes 30 days of every product and never charges you again on its own.</p>
    </aside>
  </main>

  <footer><span>WEYLANDAI / SUBCONP</span><p class="legal">WeylandAI is operated by Argo LLC. <a href="${DEFAULT_TERMS_URL}" data-legal="terms" target="_blank" rel="noopener">Terms of Service</a> &middot; <a href="${DEFAULT_PRIVACY_URL}" data-legal="privacy" target="_blank" rel="noopener">Privacy Policy</a></p><span class="contact">hello@weylandai.com</span></footer>
<script>
(function () {
${checkoutLoaderSnippet()}
${PAGE_SCRIPT}
})();
</script>
</body>
</html>
`;
}
