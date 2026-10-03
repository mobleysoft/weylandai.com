// src/index.js
//
// weyland-sightx-worker: standalone Cloudflare Worker owning SightX's real
// route surface, extracted out of weylandai.com's monolith
// (src/routes/sightx-walkthrough.js + the "/sightx" marketing page) per the
// 2026-09-12 microservices push (MICROSERVICES_PUSH.md) and the same
// strangler-fig, Service-Binding pattern already proven live by
// weyland-ocr-worker, weyland-huntx-worker, weyland-subx-worker,
// weyland-cutsheetx-worker, and weyland-propx-worker.
//
// No build step, no esbuild - plain ESM, `wrangler deploy` directly from
// source. Wrangler's own module resolution handles the *.html text import
// (see wrangler.toml's [[rules]] block).
//
// Route inventory (real, ported byte-for-byte from the monolith):
//   GET  /sightx                          -> the real live marketing/demo
//                                             page (src/pages/sightx.html),
//                                             confirmed to match the real
//                                             deployed production content
//                                             (see SIGHTX_EXTRACTION.md for
//                                             the byte-diff record) - not
//                                             the drifted copy that used to
//                                             live at ../src/pages/
//                                             sightx.html on disk, which
//                                             was missing the embedded
//                                             MeetingX "COLLABORATE" widget
//                                             the real live page still
//                                             serves.
//   POST /api/sightx/walkthrough-preview  -> routes/sightx-walkthrough.js,
//                                             SightX's one genuinely
//                                             dynamic feature (confirmed:
//                                             two different project
//                                             descriptions produce two
//                                             genuinely different generated
//                                             titles/storyboards, not a
//                                             canned response). Public, no
//                                             auth - ported verbatim,
//                                             including that fact.
//
// SIGHTX_ROOM Durable Object - deliberately NOT bound here. Checked (not
// assumed) during this extraction: SightX's own routes never reference it;
// it's a MeetingX concern (real-time presence/chat/WebRTC relay) that only
// happens to share the "sightx" name. Its one real call site
// (weyland-entry.js's WebSocket-upgrade handler at
// /api/sight/room/:projectId) gates on requireProductAccess(user, env,
// "meetingx"), not "sightx", and stays on the monolith. The ported
// sightx.html page's embedded MeetingX widget still talks to that same
// monolith path by same-origin relative URL - it works unchanged after
// this extraction because this Worker's Cloudflare Routes only claim
// /sightx and /api/sightx/*, never /api/sight/room/*, so that traffic
// keeps flowing to the monolith's existing `weylandai.com/*` catch-all.
// This is what makes this a genuinely stateless extraction with no DO
// complexity, same shape as HuntX/CutSheetX.
//
// The monolith's own copies of these routes are deliberately left in
// place and still live (src/routes/sightx-walkthrough.js,
// src/lib/marketing-pages.js's serve_sightx()) - this extraction does not
// touch or remove them. Real parity + cutover happens entirely via the
// Cloudflare Worker Routes in this Worker's own wrangler.toml, added AFTER
// this Worker was deployed standalone to its own *.workers.dev subdomain
// and curl-verified - see SIGHTX_EXTRACTION.md for the verification
// record.

import { NativeRouter } from "./lib/router.js";
import { jsonResponse3 } from "./lib/json-response.js";

import { registerSightXWalkthroughRoutes } from "./routes/sightx-walkthrough.js";

import sightxHtml from "./pages/sightx.html";

const router = new NativeRouter();

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-sightx-worker",
}));

// The real SightX marketing/demo page - see file header for provenance
// and why this is the real-deployed content, not the drifted disk copy.
// Not gated by any auth: the page loads for anyone (same convention as
// subx-app.html/propx-app.html), and the one dynamic panel on it
// (walkthrough-preview) calls a route that is itself public.
function serveSightX() {
  return new Response(sightxHtml, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
  });
}

router.get("/sightx", serveSightX);
router.get("/sightx/", serveSightX);
router.addRoute("HEAD", "/sightx", serveSightX);
router.addRoute("HEAD", "/sightx/", serveSightX);

registerSightXWalkthroughRoutes(router);

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
};
