// src/index.js
//
// weyland-meetingx-worker: standalone Cloudflare Worker owning MeetingX's
// real route surface, extracted out of weylandai.com's monolith per the
// 2026-09-12 microservices push (MICROSERVICES_PUSH.md) and the same
// strangler-fig, Service-Binding pattern already proven live by
// weyland-ocr-worker, weyland-market-intelligence-worker,
// weyland-huntx-worker, weyland-subx-worker, weyland-cutsheetx-worker, and
// weyland-propx-worker.
//
// No build step, no esbuild - plain ESM, `wrangler deploy` directly from
// source. Wrangler's own module resolution handles the *.html text import
// (see wrangler.toml's [[rules]] block).
//
// Real gap this closes: a completeness audit found MeetingX's page
// self-discloses "multi-party transport not yet claimed" while a real,
// already-deployed WebSocket backend (the SIGHTX_ROOM Durable Object,
// `SightXRoom` - see src/lib/weyland-entry.js in the main repo for its
// full class body) sat completely unused - the page never opened a
// WebSocket to it. This extraction wires the page to the real backend
// for a real multi-party room (join/roster/broadcast chat + a WebRTC
// `signal` relay) - it does NOT add a TURN server or real audio/video
// transport, so the page's honest "multi-party transport not yet
// claimed" line about live audio/video conferencing is left exactly as
// written; only the room/chat/presence layer, which the DO genuinely
// implements today, is turned on.
//
// Durable Object binding: see wrangler.toml's own comment for the full
// reasoning, short version - SightXRoom holds only in-memory state (no
// `state.storage` calls in the class at all), so there is no persisted
// data a migration could lose either way. What IS real and worth
// protecting is the class's live migration record and any currently-open
// in-memory sessions in the monolith - so this Worker binds to that same
// DO namespace via a cross-script `script_name` binding rather than
// re-declaring/forking the class here. The class stays defined and
// migrated exactly once, in weylandai-com-worker.
//
// Route inventory (real):
//   GET  /meetingx, /meetx        -> the real MeetingX page (this pass
//        (and /meetingx/, /meetx/,   added the WebSocket join/broadcast
//        any query string)           wiring to it - see meetingx.html).
//                                     2026-10-07: zone routes are the
//                                     wildcards weylandai.com/meetingx* and
//                                     /meetx*, so a shared ?room= link and
//                                     the overlay's ?embed=1 reach this page
//                                     (they used to fall through to the
//                                     monolith's stale copy, no JOIN ROOM).
//   *    /api/sight/room/:id      -> WebSocket upgrade, forwarded to the
//                                     SIGHTX_ROOM Durable Object, same
//                                     auth gate as the monolith's own
//                                     copy of this route (authenticate()
//                                     + requireProductAccess(..., "meetingx"))
//   GET  /api/sight/room/:id      -> (no Upgrade header) access check the
//                                     page runs before opening the socket:
//                                     same auth gate, JSON answer, so the
//                                     page can tell "sign in" (401) from
//                                     "plan needed" (402) - a failed
//                                     WebSocket handshake cannot.
//
// The monolith's own copy of the /api/sight/room/:id route (in
// src/lib/weyland-entry.js's createWeylandWorker) is deliberately left in
// place and untouched by this extraction - both routes reach the exact
// same DO namespace, so leaving it live is not a stale duplicate, it is
// the same backend reachable two ways during cutover.

import { NativeRouter } from "./lib/router.js";
import { authenticate, requireProductAccess } from "./lib/auth.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { registerRoomRoutes, roomIdFrom, ROOM_ID } from "./routes/room.js";

import meetingxHtml from "./pages/meetingx.html";
// Security headers on every answer (2026-10-07): the platform's set, one shared module.
import { secured } from "../../weyland-shared/security-headers.js";

const router = new NativeRouter();

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-meetingx-worker",
}));

// The real MeetingX page. Not gated by authenticate() at the route level
// (same convention as propx-app.html/subx-app.html): the page loads for
// anyone, but the real WebSocket join it now performs gets the exact same
// 401/402 the backend would return to any other caller if the visitor
// isn't signed in with meetingx access - the page renders that honestly
// (see meetingx.html's onclose/onerror handling) rather than hiding
// behind a server-side redirect.
function servePage() {
  return new Response(meetingxHtml, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" },
  });
}
router.get("/meetingx", servePage);
router.get("/meetx", servePage);
router.get("/meetingx/", servePage);
router.get("/meetx/", servePage);

registerRoomRoutes(router, { authenticate, requireProductAccess });

export default secured({
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // WebSocket upgrade must bypass the router entirely and go straight to
    // the Durable Object - identical logic and identical auth gate to the
    // monolith's own copy in src/lib/weyland-entry.js's createWeylandWorker,
    // ported verbatim (not reinvented) so behavior is provably unchanged
    // for anyone hitting either endpoint.
    if (request.headers.get("Upgrade") === "websocket" && url.pathname.startsWith("/api/sight/room/")) {
      const projectId = roomIdFrom(url);
      if (!projectId) return new Response("Missing project id", { status: 400 });
      if (!ROOM_ID.test(projectId)) return new Response("Bad room id", { status: 400 });
      const { error: wsAuthError, user: wsUser } = await authenticate(request, env);
      if (wsAuthError) return wsAuthError;
      const wsProdErr = await requireProductAccess(wsUser, env, "meetingx");
      if (wsProdErr) return wsProdErr;
      const roomId = env.SIGHTX_ROOM.idFromName(projectId);
      const stub = env.SIGHTX_ROOM.get(roomId);
      const forwardUrl = new URL(request.url);
      forwardUrl.searchParams.set("userId", wsUser.userId);
      forwardUrl.searchParams.set("userName", wsUser.name || wsUser.email || "Guest");
      return stub.fetch(new Request(forwardUrl.toString(), request));
    }

    return router.handle(request, env, ctx);
  },
});
