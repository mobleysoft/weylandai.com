// node --test src/lib/pricing-page.test.mjs
//
// /pricing and /subscribe as served (2026-10-07): every price on the page is
// the catalog's (GeoX's card said $149 while the form charged $249), MarketX's
// button opens nothing (it opened the mail app), no hosted checkout, the $100
// offer leads, the SubConP page promises no free month, the footer names Argo
// LLC and links the Terms. The catalog is put in KV the way lib/catalog.js keeps
// it, so no Stripe call is made.
import test from "node:test";
import assert from "node:assert/strict";

import worker from "../index.js";
import { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS } from "./stripe-billing.js";
import { _resetCatalogMemory } from "./catalog.js";
import { renderCatalogPrices, SUITE_PARTS } from "./pricing-checkout.js";
import { makeEnv, ctx } from "../routes/webhooks-subscription.fixtures.mjs";

// Today's live catalog (GET /api/billing/catalog, 2026-10-07), cents.
const LIVE = {
  "weyland-first-submittal": 10000, "weyland-subconp-seat": 200000, "weyland-cutsheetx-seat": 19900, "weyland-takeoffx-seat": 49900,
  "weyland-propx-seat": 29900, "weyland-huntx-seat": 79900, "weyland-subx-seat": 59900, "weyland-meetingx-seat": 29900,
  "weyland-sightx-seat": 99900, "weyland-lienx-seat": 9900, "weyland-bidx-seat": 24900, "weyland-coa-seat": 9900,
  "weyland-drawx-seat": 39900, "weyland-asbuiltx-seat": 19900, "weyland-specx-seat": 14900, "weyland-rfax-seat": 19900,
  "weyland-changeordx-seat": 19900, "weyland-permitx-seat": 14900, "weyland-safetyx-seat": 14900, "weyland-closex-seat": 19900,
  "weyland-notesx-seat": 4900, "weyland-leadx-seat": 24900, "weyland-marketx-seat": 19900, "weyland-compx-seat": 19900,
  "weyland-pricex-seat": 14900, "weyland-zoningx-seat": 19900, "weyland-riskx-seat": 19900, "weyland-forecastx-seat": 24900,
  "weyland-geox-seat": 24900, "weyland-sitex-seat": 14900, "weyland-dronex-seat": 39900, "weyland-photox-seat": 19900,
  "weyland-inspecx-seat": 19900, "weyland-survx-seat": 19900, "weyland-mobilex-seat": 9900, "weyland-weatherx-seat": 14900,
  "weyland-wire-seat": 4900
};

function catalogOf(amounts) {
  return {
    fetched_at: new Date().toISOString(),
    products: Object.keys(WEYLAND_PRODUCTS).map((id) => ({
      id, checkout_ready: CHECKOUT_READY_PRODUCTS.has(id), price_id: WEYLAND_PRODUCTS[id].priceId, unit_amount: amounts[id], currency: "usd",
      interval: id === "weyland-first-submittal" ? null : "month", one_time: id === "weyland-first-submittal", trial_period_days: null, livemode: true, name: id
    }))
  };
}

async function envWithCatalog(amounts = LIVE, extra = {}) {
  _resetCatalogMemory();
  const env = { ...makeEnv(), ...extra };
  await env.CACHE.put("billing_catalog_v2", JSON.stringify(catalogOf(amounts)));
  return env;
}

const usd = (cents) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 });
const page = async (env, path, headers = {}) => {
  const r = await worker.fetch(new Request("https://weylandai.com" + path, { headers }), env, ctx);
  return { status: r.status, type: r.headers.get("Content-Type"), text: await r.text() };
};
const priced = (html) => [...html.matchAll(/data-sku-price="([a-z0-9-]+)"[^>]*>(\$[0-9,.]+)/g)].map((m) => ({ id: m[1], shown: m[2] }));
const inlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test("/pricing: every price on the page is the catalog's; GeoX shows $249", async () => {
  const env = await envWithCatalog();
  const { status, text } = await page(env, "/pricing");
  assert.equal(status, 200);
  const shown = priced(text);
  assert.ok(shown.length >= 30, "prices are marked: " + shown.length);
  for (const p of shown) assert.equal(p.shown, usd(LIVE[p.id]), p.id);
  assert.equal((text.match(/<div class="card" id="card\w+">/g) || []).length, 27, "the 27 a la carte cards");
  assert.equal((text.match(/<div class="sku-price" data-sku-price="weyland-[a-z]+-seat">/g) || []).length, 27, "each with its SKU's price");
  const geo = text.match(/<div class="card" id="cardGeo">[\s\S]*?<\/button>/)[0];
  assert.match(geo, /data-sku-price="weyland-geox-seat">\$249 </);
  assert.doesNotMatch(geo, /\$149/);
  // Every card's price element carries a SKU, so none can drift from the catalog again.
  assert.equal((text.match(/<div class="sku-price">/g) || []).length, 0, "no card price without a SKU");
  assert.match(text, /data-sku-sum="[^"]+">\$3,693</);
  assert.match(text, /data-sku-save="[^"]+">\$1,693</);
  assert.match(text, /data-sku-save-pct="[^"]+">46%</);
  assert.match(text, /data-sku-unit="weyland-subconp-seat" data-unit-amount="200000"/);
  assert.match(text, /id="suiteMonthlyTotal" data-sku-number="weyland-subconp-seat">2,000</);
});

test("/pricing follows the catalog when a price changes (SubConP at $2,500: sums, savings and the seat calculator)", async () => {
  const env = await envWithCatalog({ ...LIVE, "weyland-subconp-seat": 250000, "weyland-geox-seat": 29900 });
  const { text } = await page(env, "/pricing");
  assert.match(text, /DEPLOY SUITE \(<span data-sku-price="weyland-subconp-seat">\$2,500<\/span>\/MO\)/);
  assert.match(text, /data-sku-price="weyland-geox-seat">\$299 /);
  const parts = SUITE_PARTS.reduce((a, id) => a + LIVE[id], 0);
  assert.equal(parts, 369300);
  assert.match(text, /data-sku-save="[^"]+">\$1,193</);
  assert.match(text, /data-sku-save-pct="[^"]+">32%</);
  assert.match(text, /data-unit-amount="250000"/);
  assert.match(text, /id="btnSuiteTotal" data-sku-number="weyland-subconp-seat">2,500</);
});

test("/pricing: no mail app, no hosted checkout; MarketX not sold; the offer leads; Argo LLC and the Terms in the footer", async () => {
  const env = await envWithCatalog(LIVE, { TERMS_URL: "https://weylandai.com/terms", PRIVACY_URL: "https://weylandai.com/privacy" });
  const { text } = await page(env, "/pricing");
  assert.doesNotMatch(text, /mailto:/i);
  assert.doesNotMatch(text, /\/api\/billing\/checkout\/create/);
  assert.doesNotMatch(text, /checkout\.stripe\.com/);
  const market = text.match(/<div class="card" id="cardMarket">[\s\S]*?<\/button>/)[0];
  assert.match(market, /<button type="button" class="button" id="btnBuyMarket" disabled aria-disabled="true"[^>]*>NOT SOLD YET<\/button>/);
  assert.doesNotMatch(market, /triggerCheckout|FRED data, refreshed on every load/);
  const offer = text.match(/<div class="offer-box" id="offerCard">[\s\S]*?<\/button>/)[0];
  assert.match(offer, /\$100/);
  assert.match(offer, /No automatic charge/);
  assert.match(offer, /triggerCheckout\('weyland-first-submittal', 1, 'First submittal'\)/);
  assert.ok(text.indexOf('id="offerCard"') < text.indexOf('id="alacarteSection"'), "the offer comes before the a la carte grid");
  assert.match(text, /WeylandAI is operated by Argo LLC\. <a href="https:\/\/weylandai\.com\/terms" data-legal="terms"/);
  assert.match(text, /<a href="https:\/\/weylandai\.com\/privacy" data-legal="privacy"/);
  // 2026-10-08 (fix 11): the sentence "No free trial on this plan: the free month comes with the $100 first
  // submittal" is gone (every new account gets a 14-day trial, and the month costs $100).
  assert.doesNotMatch(text, /No free trial|free month/);
  for (const src of inlineScripts(text)) assert.doesNotThrow(() => new Function(src));
  // The page's own checkout script: a product that is not sold opens nothing.
  assert.match(text, /btn\.textContent = 'NOT SOLD YET'/);
  assert.match(text, /weyland-first-submittal/);
});

// 2026-10-08 (fix 7 of plan/weylandai_value_report.md): the six tools that error on the audit
// documents are not sold. Their cards say NOT SOLD YET with the reason, their buttons open
// nothing, the catalog says checkout_ready false, and the plan choices leave them out.
test("/pricing: DrawX, SpecX, AsBuiltX, InspecX, SurvX and PriceX are NOT SOLD YET, with the reason", async () => {
  const env = await envWithCatalog();
  const { text } = await page(env, "/pricing");
  const notSold = { cardDrawX: "weyland-drawx-seat", cardSpecX: "weyland-specx-seat", cardAsBuiltX: "weyland-asbuiltx-seat", cardInspecX: "weyland-inspecx-seat", cardSurvX: "weyland-survx-seat", cardPrice: "weyland-pricex-seat" };
  for (const [cardId, sku] of Object.entries(notSold)) {
    assert.equal(CHECKOUT_READY_PRODUCTS.has(sku), false, sku + " is not checkout-ready");
    const card = text.match(new RegExp('<div class="card" id="' + cardId + '">[\\s\\S]*?<\\/button>'))[0];
    assert.match(card, /<div class="sku-edge">Not sold yet: [^<]+not sold until it[^<]*<\/div>/, cardId + " says why");
    assert.match(card, /<button type="button" class="button" id="btnBuy\w+" disabled aria-disabled="true"[^>]*>NOT SOLD YET<\/button>/, cardId + " has no working button");
    assert.doesNotMatch(card, /triggerCheckout/, cardId);
  }
  assert.doesNotMatch(text, /real FRED data|Live Producer Price Index/);
  // The page's READY list (lib/pricing-checkout.js) follows the same set.
  const ready = text.match(/var READY = (\[[^\]]*\]);/)[1];
  for (const sku of Object.values(notSold)) assert.ok(!ready.includes(sku), sku + " not in READY");
  // Still sold: the suite, the offer and the tools that work.
  for (const sku of ["weyland-subconp-seat", "weyland-first-submittal", "weyland-huntx-seat", "weyland-subx-seat", "weyland-cutsheetx-seat", "weyland-lienx-seat", "weyland-safetyx-seat"]) assert.ok(ready.includes(sku), sku + " in READY");
});

// 2026-10-08 (fix 11 of plan/weylandai_value_report.md): the claims section 5 lists for /pricing are gone.
test("/pricing: no cryptographic provenance, Togal, Lumion or Dodge comparisons, machine vision, avatars, FRED, local inference or pay-for-itself claims", async () => {
  const env = await envWithCatalog();
  const { text } = await page(env, "/pricing");
  for (const re of [/cryptographic/i, /Togal/i, /Lumion/i, /Dodge/i, /ConstructConnect/i, /Sub-second/i, /machine-vision/i, /live avatars/i, /voice chat/i,
    /permit ledger/i, /Transforms standard 2D/i, /real FRED/i, /sourced live/i, /Local Apple Silicon/i, /Sovereign Compute/i, /pay for itself/i, /strictly enforced/i]) {
    assert.doesNotMatch(text, re);
  }
  assert.match(text, /A project room: who is here, and chat/);
  assert.match(text, /It reads schedules, not drawings\./);
  assert.match(text, /Includes all 7 engines on one project spine\./);
});

// The catalog's checkout_ready follows the gate as it is now, not the kept copy (lib/catalog.js gated()).
test("/api/billing/catalog: a kept copy that still says a not-sold product is ready is served as not ready", async () => {
  const env = await envWithCatalog();
  const kept = JSON.parse(await env.CACHE.get("billing_catalog_v2"));
  for (const p of kept.products) if (p.id === "weyland-drawx-seat" || p.id === "weyland-pricex-seat") { p.checkout_ready = true; delete p.price_active; }
  await env.CACHE.put("billing_catalog_v2", JSON.stringify(kept));
  _resetCatalogMemory();
  const r = await worker.fetch(new Request("https://weylandai.com/api/billing/catalog"), env, ctx);
  const d = await r.json();
  const byId = Object.fromEntries(d.products.map((p) => [p.id, p]));
  assert.equal(byId["weyland-drawx-seat"].checkout_ready, false);
  assert.equal(byId["weyland-pricex-seat"].checkout_ready, false);
  assert.equal(byId["weyland-marketx-seat"].checkout_ready, false);
  assert.equal(byId["weyland-huntx-seat"].checkout_ready, true);
  assert.equal(byId["weyland-first-submittal"].checkout_ready, true);
});

test("/pricing in the overlay (?embed=1) and as an SPA fragment carry the same catalog prices", async () => {
  const env = await envWithCatalog({ ...LIVE, "weyland-geox-seat": 26600 });
  const emb = await page(env, "/pricing?embed=1");
  assert.match(emb.text, /data-sku-price="weyland-geox-seat">\$266 /);
  assert.match(emb.text, /header \.brand, header \.nav \{ display: none/);
  const frag = await page(env, "/pricing", { "X-Skeletonking-Route": "fragment" });
  assert.match(frag.type, /application\/json/);
  const f = JSON.parse(frag.text);
  assert.match(f.html, /data-sku-price="weyland-geox-seat">\$266 /);
});

test("/subscribe: no free month promised, no off-site sign-in or hosted checkout, the offer offered, catalog prices, Argo LLC", async () => {
  const env = await envWithCatalog({ ...LIVE, "weyland-subconp-seat": 210000 });
  const { status, text } = await page(env, "/subscribe");
  assert.equal(status, 200);
  assert.doesNotMatch(text, /\$0 for the first 30 days/);
  assert.doesNotMatch(text, /\/assets\/subscribe\.js/);
  assert.doesNotMatch(text, /authfor-gateway|checkout\/create|mailto:/);
  assert.match(text, /Billed today, then monthly/);
  assert.match(text, /<strong data-sku-price="weyland-subconp-seat">\$2,100<\/strong>/);
  assert.match(text, /data-unit-amount="210000"/);
  assert.match(text, /data-offer>Start with your first submittal for <span data-sku-price="weyland-first-submittal">\$100<\/span>/);
  assert.match(text, /WeylandAI is operated by Argo LLC/);
  assert.match(text, /data-legal="terms"/);
  for (const src of inlineScripts(text)) assert.doesNotThrow(() => new Function(src));
  const sub = await page(env, "/subscribe/");
  assert.equal(sub.status, 200);
});

test("renderCatalogPrices leaves the written price when the catalog lacks the SKU, and never touches other dollar text", () => {
  const html = '<b data-sku-price="weyland-nothing">$5</b> <i>$7 a cup</i> <b data-sku-price="weyland-wire-seat">$1</b>';
  const out = renderCatalogPrices(html, catalogOf(LIVE));
  assert.equal(out, '<b data-sku-price="weyland-nothing">$5</b> <i>$7 a cup</i> <b data-sku-price="weyland-wire-seat">$49</b>');
  assert.equal(renderCatalogPrices(html, null), html);
});
