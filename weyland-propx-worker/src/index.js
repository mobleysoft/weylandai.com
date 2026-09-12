// src/index.js
//
// weyland-propx-worker: standalone Cloudflare Worker owning PropX's real
// route surface, extracted out of weylandai.com's monolith
// (src/routes/document-generators.js) per the 2026-09-12 microservices
// push (MICROSERVICES_PUSH.md) and the same strangler-fig, Service-
// Binding pattern already proven live by weyland-ocr-worker,
// weyland-market-intelligence-worker, weyland-huntx-worker, and
// weyland-subx-worker.
//
// No build step, no esbuild - plain ESM, `wrangler deploy` directly from
// source. Wrangler's own module resolution handles the one real npm
// dependency (@cloudflare/puppeteer) and the *.html text import (see
// wrangler.toml's [[rules]] block).
//
// Route inventory (real, ported byte-for-byte from the monolith's
// src/routes/document-generators.js - see src/routes/proposals.js's own
// header for exact provenance and the two real gaps this pass found and
// is honestly surfacing rather than hiding):
//   POST /api/proposals/generate     -> routes/proposals.js
//   GET  /api/proposals/:id/download -> routes/proposals.js
//   GET  /propx-app                  -> the real proposal-builder UI
//                                        this pass built (src/pages/
//                                        propx-app.html) - PropX had NO
//                                        UI anywhere before this; the
//                                        marketing page's CTA dead-ended
//                                        at /login?redirect=/.
//
// The monolith's own copy of these two routes is deliberately left in
// place and still live (src/routes/document-generators.js) - this
// extraction does not touch or remove it. Real parity + cutover happens
// entirely via the Cloudflare Worker Routes in this Worker's own
// wrangler.toml (weylandai.com/api/proposals/*, weylandai.com/propx-app),
// added AFTER this Worker was deployed standalone to its own
// *.workers.dev subdomain and curl-verified - see PROPX_EXTRACTION.md
// for the verification record.

import { NativeRouter } from "./lib/router.js";
import { authenticate, requireProductAccess } from "./lib/auth.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { generateQuoteHtml } from "./lib/quote-html.js";
import puppeteer from "@cloudflare/puppeteer";

import { registerProposalsRoutes } from "./routes/proposals.js";

import propxAppHtml from "./pages/propx-app.html";

const router = new NativeRouter();

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-propx-worker",
}));

// The real proposal-builder app page - see file header. Not gated by
// authenticate() at the route level (same convention as subx-app.html):
// the page loads for anyone, but every real API call it makes carries
// the AuthFor Bearer token and gets the exact same 401/402 the backend
// would return to any other caller - the page just renders those
// honestly instead of hiding behind a server-side redirect.
router.get("/propx-app", () => new Response(propxAppHtml, {
  headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
}));

registerProposalsRoutes(router, {
  authenticate,
  requireProductAccess,
  generateQuoteHtml,
  puppeteer,
});

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
};
