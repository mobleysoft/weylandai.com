// weyland-platform-worker/src/lib/pricing-checkout.js
//
// /pricing's checkout buttons, embedded (2026-10-07). This script, placed in
// the page's outlet, defines triggerCheckout, which every inline onclick on
// the page calls by name: it opens Stripe's embedded form in the page through
// WeylandCheckout (GET /api/billing/embedded-checkout.js). A product that is
// not sold has no working button at all (it used to open the visitor's mail
// app; the MarketX card's button is disabled in the page itself).
//
// renderCatalogPrices() writes the catalog's live prices (lib/catalog.js) into
// a page before it is served: every element marked data-sku-price="<sku>"
// gets that SKU's price, data-sku-sum the sum of several, data-sku-save and
// data-sku-save-pct the SubConP saving against them, data-sku-number the
// price without the dollar sign, data-unit-amount (beside data-sku-unit) the
// price in cents for the page's own seat calculator. So a card can never show
// one price while the payment form charges another. Without a catalog the
// page keeps the prices it was written with.

import { CHECKOUT_READY_PRODUCTS, WEYLAND_SUBCONP_PRODUCT_ID } from "./stripe-billing.js";
import { byId, dollars } from "./catalog.js";
import { termsUrls, DEFAULT_TERMS_URL, DEFAULT_PRIVACY_URL } from "./legal.js";

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
    "      if (btn) { btn.disabled = true; btn.textContent = 'NOT SOLD YET'; }",
    "      return;",
    "    }",
    "    var label = btn ? btn.innerHTML : null;",
    "    if (btn) { btn.disabled = true; btn.textContent = 'OPENING CHECKOUT...'; }",
    "    weylandCheckoutHelper()",
    "      .then(function (W) { return W.open({ product_id: productId, quantity: Math.max(1, parseInt(quantity, 10) || 1), name: name }); })",
    "      .catch(function (e) { if (btn) { btn.textContent = 'CHECKOUT DID NOT LOAD - TRY AGAIN'; } })",
    "      .then(function () { if (btn && label && btn.textContent === 'OPENING CHECKOUT...') { btn.innerHTML = label; } if (btn) btn.disabled = false; });",
    "  };",
    "  if (/[?&]checkout=(return|success)/.test(location.search)) weylandCheckoutHelper();",
    "})();",
    "</script>"
  ].join("\n");
}

// The seven engines SubConP bundles (the "sum of parts" on /pricing).
export const SUITE_PARTS = Object.freeze([
  "weyland-huntx-seat", "weyland-subx-seat", "weyland-takeoffx-seat", "weyland-cutsheetx-seat",
  "weyland-propx-seat", "weyland-sightx-seat", "weyland-meetingx-seat"
]);

function amounts(cat, ids) {
  const list = ids.map((id) => cat[id]?.unit_amount);
  return list.every((n) => Number.isFinite(Number(n))) ? list.map(Number) : null;
}

function saving(cat, spec) {
  const [suite, partsList] = String(spec).split(";");
  const parts = amounts(cat, String(partsList || "").split(",").filter(Boolean));
  const suiteAmount = amounts(cat, [suite]);
  if (!parts || !suiteAmount) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  return { sum, save: sum - suiteAmount[0] };
}

/** Write the catalog's prices (and the Terms URLs) into a page's HTML. */
export function renderCatalogPrices(html, catalog, env = {}) {
  let out = String(html);
  const cat = byId(catalog);
  if (Object.keys(cat).length) {
    out = out.replace(/(data-sku-price="([a-z0-9-]+)"[^>]*>)\$[0-9][0-9,]*(?:\.[0-9]{2})?/g, (m, head, id) => {
      const e = cat[id];
      return e && Number.isFinite(Number(e.unit_amount)) ? head + dollars(e.unit_amount, e.currency) : m;
    });
    out = out.replace(/(data-sku-number="([a-z0-9-]+)"[^>]*>)[0-9][0-9,]*(?:\.[0-9]{2})?/g, (m, head, id) => {
      const e = cat[id];
      return e && Number.isFinite(Number(e.unit_amount)) ? head + dollars(e.unit_amount, e.currency).replace(/^\$/, "") : m;
    });
    out = out.replace(/(data-sku-sum="([a-z0-9,-]+)"[^>]*>)\$[0-9][0-9,]*/g, (m, head, ids) => {
      const list = amounts(cat, ids.split(","));
      return list ? head + dollars(list.reduce((a, b) => a + b, 0)) : m;
    });
    out = out.replace(/(data-sku-save="([a-z0-9,;-]+)"[^>]*>)\$[0-9][0-9,]*/g, (m, head, spec) => {
      const s = saving(cat, spec);
      return s && s.save > 0 ? head + dollars(s.save) : m;
    });
    out = out.replace(/(data-sku-save-pct="([a-z0-9,;-]+)"[^>]*>)[0-9]+%/g, (m, head, spec) => {
      const s = saving(cat, spec);
      return s && s.sum > 0 && s.save > 0 ? head + Math.round((s.save / s.sum) * 100) + "%" : m;
    });
    out = out.replace(/(data-sku-unit="([a-z0-9-]+)" data-unit-amount=")[0-9]+(")/g, (m, head, id, tail) => {
      const e = cat[id];
      return e && Number.isFinite(Number(e.unit_amount)) ? head + Number(e.unit_amount) + tail : m;
    });
  }
  const legal = termsUrls(env);
  out = out.split('href="' + DEFAULT_TERMS_URL + '" data-legal="terms"').join('href="' + legal.terms_url + '" data-legal="terms"');
  out = out.split('href="' + DEFAULT_PRIVACY_URL + '" data-legal="privacy"').join('href="' + legal.privacy_url + '" data-legal="privacy"');
  return out;
}

/**
 * The same for a served page Response: a full HTML page, or the SPA router's
 * fragment JSON ({html, ...}). Headers and status are kept.
 */
export async function withCatalogPrices(response, catalog, env = {}) {
  const type = response.headers.get("Content-Type") || "";
  const text = await response.text();
  let body = text;
  if (/application\/json/i.test(type)) {
    try {
      const frag = JSON.parse(text);
      if (frag && typeof frag.html === "string") frag.html = renderCatalogPrices(frag.html, catalog, env);
      if (frag && typeof frag.script === "string") frag.script = renderCatalogPrices(frag.script, catalog, env);
      body = JSON.stringify(frag);
    } catch {
      body = text;
    }
  } else {
    body = renderCatalogPrices(text, catalog, env);
  }
  return new Response(body, { status: response.status, headers: new Headers(response.headers) });
}
