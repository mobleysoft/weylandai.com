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
//   GET       /api/billing/catalog              -> routes/billing.js
//   POST      /api/billing/checkout/create      -> routes/billing.js
//                                                  (real env.VENDYAI call)
//   GET       /api/billing/checkout/status/:id  -> routes/billing.js
//   GET       /api/subscription/status          -> routes/subscription.js
//   POST      /api/subscription/portal          -> routes/subscription.js
//                                                  (real env.VENDYAI call)
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
import { registerRootRoutes } from "./routes/root.js";
import { registerWireRoutes } from "./routes/wire.js";
import { ingestWireNews } from "./lib/wire-tenant.js";

const router = new NativeRouter();

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-platform-worker",
  version: WORKER_VERSION
}));

registerLoginPageRoutes(router);
registerAuthSessionRoutes(router, { authenticate, errorResponse });
registerBillingRoutes(router, { WEYLAND_PRODUCTS, CHECKOUT_READY_PRODUCTS, stripeRequest });
registerSubscriptionRoutes(router, { authenticate, errorResponse });
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
  async fetch(request, env, ctx) {
    // Traffic-driven freshness (2026-10-05): Cron Triggers on this account
    // are registered but have never fired (cron_ticks stays empty), so any
    // request may claim the D1 lease for this worker's background job and
    // run it via waitUntil. The visitor never waits; no request calls out.
    trafficDrivenJob(env, ctx, { db: env.DB, job: "wirex-ingest", cadenceSeconds: 1200, worker: "weyland-platform-worker", run: () => ingestWireNews(env).then((r) => console.log("[WireX] traffic-driven ingest", r.items.length, "headlines")) });
    const url = new URL(request.url);

    if (request.method === "GET" || request.method === "HEAD") {
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
      const isHome = url.pathname === "/" || url.pathname === "/index.html";
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
      const clean = url.pathname.toLowerCase().replace(/^\/|\/$/g, "");
      if (clean === "" || clean === "pricing" || clean === "subscribe") {
        const marketingResponse = SovereignPlatformRoutes.dispatch(url.pathname, isFragmentRequest);
        if (marketingResponse) return marketingResponse;
      }
    }

    return router.handle(request, env, ctx);
  },

};
