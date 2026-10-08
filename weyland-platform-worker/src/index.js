// weyland-platform-worker/src/index.js
//
// weyland-platform-worker: the shared platform layer left in the monolith
// after the 6 product extractions (HuntX/SubX+TakeoffX/CutSheetX/PropX/
// MeetingX/SightX) - root marketing page, /pricing, /subscribe, /login,
// account creation ("signup" is implicit first-AuthFor-login provisioning,
// not a separate route - see routes/auth-session.js's header), session
// management, billing/checkout, and the Stripe/vendyai subscription
// webhook. Per MICROSERVICES_PUSH.md's strangler-fig pattern, same as the
// 6 prior extractions: no bundler, plain ESM, `wrangler deploy` directly
// from source.
//
// *** HIGHEST-RISK extraction of the push. *** Every other extracted
// Worker's auth depends on a user having signed up/logged in through this
// layer, and the billing routes touch real Stripe money via the real
// env.VENDYAI service binding. Cutover of this Worker is staged narrowly
// (see wrangler.toml's [[routes]] comments and this repo's
// PLATFORM_EXTRACTION.md-equivalent commit messages for the real,
// per-stage verification record) - do not add a broader Cloudflare Route
// than what has actually been verified.
//
// Route inventory (real, ported byte-for-byte from the monolith):
//   GET/HEAD "/"          -> env.MASCOM_EDGE first (real GitHub-Pages
//                            pull-through cache, matches
//                            weyland-entry.js's createWeylandWorker
//                            exactly), falling back to the bundled
//                            serve_whyweyland() marketing page.
//   GET/HEAD "/pricing"   -> serve_pricing() (a la carte + SubConP
//                            checkout grid; its own client JS calls
//                            POST /api/billing/checkout/create below).
//   GET/HEAD "/subscribe" -> serve_subscribe() (post-checkout landing/
//                            status page; polls
//                            GET /api/billing/checkout/status/:id below).
//   GET       /login                          -> routes/login-page.js
//   POST      /api/auth/session                -> routes/auth-session.js
//   GET       /api/auth/session/check          -> routes/auth-session.js
//   POST      /api/auth/logout                 -> routes/auth-session.js
//   POST      /api/auth/authfor-exchange        -> routes/auth-session.js
//                                                  (real "signup": auto-
//                                                  provisions a new local
//                                                  users row on first
//                                                  AuthFor login)
//   GET       /api/auth/me                      -> routes/auth-session.js
//   GET       /api/billing/catalog              -> routes/billing.js (lib/catalog.js, cached)
//   POST      /api/billing/checkout/embedded    -> routes/billing.js (Stripe embedded
//                                                  Checkout in the page; the $100
//                                                  first-submittal offer and every plan)
//   GET       /api/billing/checkout/status/:id  -> routes/billing.js (pending / active / held)
//   POST      /api/billing/claims               -> routes/billing.js (held purchases)
//   POST      /api/billing/checkout/create      -> 410 since 2026-10-07 (hosted Checkout removed)
//   GET       /api/billing/plan, POST /api/billing/subscription/cancel|resume,
//   POST      /api/billing/payment-method/setup|default,
//   GET       /api/billing/invoices[/:id/pdf]   -> routes/plan.js (plan management in the page)
//   GET       /api/subscription/status          -> routes/subscription.js
//   POST      /api/subscription/portal          -> 410 since 2026-10-07 (Stripe's hosted portal)
//   POST      /api/webhooks/subscription        -> routes/webhooks-
//                                                  subscription.js (real
//                                                  Stripe/vendyai webhook)
//   POST      /api/demo                         -> routes/demo.js
//
// Deliberately NOT ported in this pass (left exactly where they are in
// the monolith - see this Worker's own extraction report for why):
//   - The other ~35 not-yet-built "X-tool" teaser marketing pages
//     (WeatherX, GeoX, CompX, MarketX, PriceX, LienX, BidX, CoA, RFAx,
//     ChangeOrdX, PermitX, CloseX, NotesX, InspecX, SafetyX, SurvX,
//     SpecX, DrawX, AsBuiltX, LeadX, Careers, Investors, VentureDeck,
//     QTEXT, Financials, Onboarding, Progress) - not part of this task's
//     "root/login/signup/pricing/billing/account-management" scope.
//   - routes/me-bridge.js, routes/install-device-auth.js - real, but a
//     distinct concern (the MHS/Claude-Code CLI compute-bridge pairing
//     flow), not account/billing.
//   - The legacy `/api/subscription/checkout` endpoint the task asked us
//     to check for and deliberately leave alone: it no longer exists.
//     Confirmed removed 2026-09-03 (see ../../../src/lib/stripe-billing.js
//     lines 151-163) - dead code, broken VENDYAI_API_URL fetch, and a
//     hardcoded duplicate $2,000/mo price. Nothing to port or preserve.

import { honestPage } from "./lib/honest-pages.js";
import { trafficDrivenJob } from "./lib/job-lease.js";
import { NativeRouter } from "./lib/router.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { WORKER_VERSION, errorResponse } from "./lib/errors.js";
import { authenticate } from "./lib/auth.js";
import { WEYLAND_PRODUCTS, WEYLAND_SUBCONP_PRODUCT_ID, CHECKOUT_READY_PRODUCTS, stripeRequest, verifyVendyaiForwardSignature, verifyStripeWebhookSignature } from "./lib/stripe-billing.js";
import { SovereignPlatformRoutes } from "./lib/marketing-pages.js";

import { registerLoginPageRoutes } from "./routes/login-page.js";
import { registerAuthSessionRoutes } from "./routes/auth-session.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerSubscriptionRoutes } from "./routes/subscription.js";
import { registerWebhooksSubscriptionRoutes } from "./routes/webhooks-subscription.js";
import { registerDemoRoutes } from "./routes/demo.js";
import { registerPlanRoutes } from "./routes/plan.js";
import { getCatalog } from "./lib/catalog.js";
import { withCatalogPrices } from "./lib/pricing-checkout.js";
import { registerRootRoutes } from "./routes/root.js";
import { registerWireRoutes } from "./routes/wire.js";
import { ingestWireNews } from "./lib/wire-tenant.js";
import { sweepEntitlements } from "./lib/entitlements.js";
import { withSecurityHeaders, wwwRedirect, crawlResponse } from "./lib/site-policy.js";

const router = new NativeRouter();

// /pricing inside the homepage overlay (?embed=1): the overlay has its own
// title bar and close, so the page's brand link and site nav are hidden -
// following them loaded a second homepage inside the frame.
async function embedPricing(response) {
  const html = await response.text();
  const style = "<style>header .brand, header .nav { display: none !important; } header { justify-content: flex-end; }</style>";
  const headers = new Headers(response.headers);
  return new Response(html.replace("</head>", style + "</head>"), { status: response.status, headers });
}

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-platform-worker",
  version: WORKER_VERSION
}));

registerLoginPageRoutes(router);
registerAuthSessionRoutes(router, { authenticate, errorResponse });
registerBillingRoutes(router, { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS, stripeRequest });
registerSubscriptionRoutes(router, { authenticate, errorResponse });
registerPlanRoutes(router);
registerWebhooksSubscriptionRoutes(router, {
  WEYLAND_PRODUCTS,
  WEYLAND_SUBCONP_PRODUCT_ID,
  verifyVendyaiForwardSignature,
  verifyStripeWebhookSignature
});
registerDemoRoutes(router);
// WeylandAI Wire - the first real pilot tenant of mobleyreport.com's
// "provenance-first wire" template (see routes/wire.js's own header).
// Reuses this Worker's existing WEYLAND_PRODUCTS/CHECKOUT_READY_PRODUCTS
// catalog and env.VENDYAI binding for checkout - no new Stripe/vendyai
// wiring needed beyond the "weyland-wire-seat" catalog entry above.
registerWireRoutes(router);
// Real production behavior: this only ever fires as a last-resort
// fallback under the dispatch below (both env.MASCOM_EDGE and
// SovereignPlatformRoutes.dispatch("") have to miss first) - see
// routes/root.js's own header for the full explanation. Registered on
// the router exactly like the monolith does, not specially favored.
registerRootRoutes(router, { WORKER_VERSION });

export default {
  // Every answer this worker gives - the homepage it proxies, the pages, the
  // APIs, the 404s - leaves with the security headers (lib/site-policy.js).
  // www.weylandai.com/* is routed here only to be sent to the apex.
  async fetch(request, env, ctx) {
    const toApex = wwwRedirect(request);
    if (toApex) return withSecurityHeaders(toApex);
    return withSecurityHeaders(await handle(request, env, ctx));
  },
};

async function handle(request, env, ctx) {
  // Traffic-driven freshness (2026-10-05): Cron Triggers on this account
  // are registered but have never fired (cron_ticks stays empty), so any
  // request may claim the D1 lease for this worker's background job and
  // run it via waitUntil. The visitor never waits; no request calls out.
  trafficDrivenJob(env, ctx, { db: env.DB, job: "wirex-ingest", cadenceSeconds: 1200, worker: "weyland-platform-worker", run: () => ingestWireNews(env).then((r) => console.log("[WireX] traffic-driven ingest", r.items.length, "headlines")) });
  // Entitlements (2026-10-07): ended trials drop to the free plan, every
  // account keeps the guest floor - for accounts that do not visit a
  // platform route themselves in the meantime (lib/entitlements.js).
  trafficDrivenJob(env, ctx, { db: env.DB, job: "entitlements-sync", cadenceSeconds: 600, worker: "weyland-platform-worker", run: () => sweepEntitlements(env).then((r) => console.log("[entitlements] sweep", r.scanned, "scanned", r.changed, "changed")) });
  const url = new URL(request.url);

  if (request.method === "GET" || request.method === "HEAD") {
    // robots.txt and the sitemap index (routes weylandai.com/robots.txt* and
    // weylandai.com/sitemap*); every other path under those routes falls
    // through to the router's 404.
    const crawl = crawlResponse(url);
    if (crawl) return crawl;
    // Matches weyland-entry.js's createWeylandWorker dispatch order
    // exactly for the 3 marketing paths this Worker owns: MASCOM_EDGE
    // (real GitHub-Pages pull-through cache) is tried first, but ONLY
    // for the home page "/" - the monolith never routes /pricing or
    // /subscribe through MASCOM_EDGE (those "still live as bundled HTML
    // in this worker" per the monolith's own wrangler.toml comment), so
    // this Worker doesn't either.
    // Real SPA-router fragment requests (X-Skeletonking-Route: fragment -
    // see src/lib/sk-router.js, the real client router ported from
    // skeletonking-v2.js) must always reach SovereignPlatformRoutes.dispatch
    // directly. MASCOM_EDGE only ever serves the full cached HTML document
    // for "/" and knows nothing about the fragment JSON contract - see
    // ../../src/lib/weyland-entry.js's identical fix for the same reason.
    const isFragmentRequest = request.headers.get("X-Skeletonking-Route") === "fragment";
    // /login is a view of the homepage (single page: the shell opens its sign-in overlay there);
    // the old standalone page in routes/login-page.js only answers if the edge fetch fails.
    const isHome = url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/login";
    if (isHome && env.MASCOM_EDGE && !isFragmentRequest) {
      try {
        const edgeResp = await env.MASCOM_EDGE.fetch("https://weylandai.com/");
        if (edgeResp && edgeResp.status === 200) {
          const body = await edgeResp.arrayBuffer();
          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": edgeResp.headers.get("Content-Type") || "text/html; charset=utf-8",
              "X-Cache": edgeResp.headers.get("X-Cache") || "",
              "X-Served-By": "mascom-edge-via-weyland-platform-worker"
            }
          });
        }
      } catch (e) {
        console.log("[MASCOM_EDGE delegation failed, falling back to bundled page]", e.message);
      }
    }
    // Pages taken over from the monolith because they said what the code does
    // not do (src/lib/honest-pages.js).
    const honest = honestPage(url.pathname);
    if (honest) return honest;
    // The routes for /pricing* and /subscribe* are wildcards (2026-10-07), so
    // every query-string and trailing-slash spelling arrives here; anything
    // else under those prefixes falls through to the router's 404, as before.
    const clean = url.pathname.toLowerCase().replace(/^\/|\/$/g, "");
    if (clean === "" || clean === "pricing" || clean === "subscribe") {
      let marketingResponse = SovereignPlatformRoutes.dispatch(url.pathname, isFragmentRequest);
      // /pricing and /subscribe show the catalog's live prices (lib/catalog.js),
      // so a card never says one price while the payment form charges another.
      if (marketingResponse && (clean === "pricing" || clean === "subscribe")) {
        const catalog = await getCatalog(env, ctx).catch((e) => { console.error("[pricing] catalog unavailable:", e.message); return null; });
        marketingResponse = await withCatalogPrices(marketingResponse, catalog, env);
      }
      if (marketingResponse && clean === "pricing" && !isFragmentRequest && url.searchParams.get("embed") === "1") {
        return embedPricing(marketingResponse);
      }
      if (marketingResponse) return marketingResponse;
    }
  }

  return router.handle(request, env, ctx);
}
