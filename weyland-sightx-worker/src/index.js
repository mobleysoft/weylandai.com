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
//                                             SightX's one dynamic feature:
//                                             since 2026-10-07 a
//                                             deterministic walkthrough
//                                             built here from the
//                                             description (no model;
//                                             lib/walkthrough-builder.js),
//                                             drawn by filmline-video-
//                                             worker's /api/render. Two
//                                             descriptions give two
//                                             different walks. Public, no
//                                             auth.
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
import { registerSightXModelRoutes } from "./routes/sightx-model.js";
import { registerSightXShareRoutes } from "./routes/sightx-share.js";
import { authenticate } from "./lib/auth.js";

import sightxHtml from "./pages/sightx.html";
import sightxAppHtml from "./pages/sightx-app.html";
// Security headers on every answer (2026-10-07): the platform's set, one shared module.
import { secured } from "../../weyland-shared/security-headers.js";

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
// 2026-10-08: /sightx is the schedule-driven app (pages/sightx-app.html): a
// corridor built from the customer's own door schedule. The hand-built
// raymarch world (pages/sightx.html) is now only the homepage's backdrop,
// which loads /sightx/?embed=bg and talks to it by postMessage.
function serveSightX(request) {
  const bg = new URL(request.url).searchParams.get("embed") === "bg";
  return new Response(bg ? sightxHtml : sightxAppHtml, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
  });
}

router.get("/sightx", serveSightX);
router.get("/sightx/", serveSightX);
router.addRoute("HEAD", "/sightx", serveSightX);
router.addRoute("HEAD", "/sightx/", serveSightX);

registerSightXWalkthroughRoutes(router);
registerSightXModelRoutes(router);
registerSightXShareRoutes(router, { authenticate });

export default secured({
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
});
