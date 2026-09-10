import { ErrorMetrics, classifyError, createErrorResponse } from "../error-utilities.js";
import { createCorsHandler } from "./cors.js";
import { SovereignWeylandRoutes } from "./marketing-pages.js";
import { serveR2 } from "./edge-dispatch.js";
import { authenticate, requireProductAccess } from "./auth.js";
import { getDiscoveryConfig } from "./cutsheet-discovery.js";

export function createMonolith({ router, discoveryEngine }) {
  return {
  async fetch(request2, env2, ctx) {
    // Fixed 2026-09-09: this unconditionally overwrote env2.CACHE and
    // env2.DEMO_REQUESTS - both real, working Cloudflare KV namespace
    // bindings (confirmed in wrangler.toml: CACHE id 80a77dcf...,
    // DEMO_REQUESTS id 090d0771...) - with a D1KVShim on EVERY single
    // request. Found while a newly-added rate limiter silently never
    // triggered: D1KVShim falls through to a generic `kv_compat` D1 table
    // for any unmapped key (this call site passed no `mappings`, so that's
    // every key), and that table does not exist in the real database -
    // confirmed via a direct query. checkRateLimit's own "fail open on any
    // CACHE error" design (a deliberate, documented choice for real users)
    // meant this broke completely silently: no error surfaced anywhere,
    // rate limiting (and by extension all 23 other real env2.CACHE call
    // sites in this file - hardware-session file buffering, checkout-
    // status caching, discovery-queue dedup, and more) simply never
    // worked, with nothing indicating why. D1KVShim itself is left
    // defined, not deleted - it may represent real, intentional
    // in-progress migration work (its own logging/"PENDING"/"CONVERTED"
    // states suggest that) - but its automatic, blanket activation here is
    // removed since a broken shim silently replacing a real, working
    // binding is strictly worse than just using the real binding.
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const url = new URL(request2.url);
    if (url.pathname === "/api/debug/r2") {
      try {
        const list = await env2.ASSETS.list({ limit: 5 });
        return new Response(JSON.stringify({ ok: true, objects: list.objects.map((o) => ({ key: o.key, size: o.size })) }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message, type: typeof env2.ASSETS }), { headers: { "Content-Type": "application/json" } });
      }
    }
    if (!url.pathname.startsWith("/api/") && request2.method === "GET") {
      const publicPaths = ["/", "/index.html", "/lib/", "/favicon.ico", "/robots.txt", "/.well-known/"];
      const isPublic = publicPaths.some((p) => url.pathname === p || url.pathname.startsWith(p));
      if (!isPublic) {
        const cookies = request2.headers.get("Cookie") || "";
        const sessionMatch = cookies.match(/weyland_session=([^;]+)/);
        if (!sessionMatch) {
          return new Response(null, { status: 302, headers: { "Location": "/", "Cache-Control": "no-cache" } });
        }
        try {
          const row = await env2.DB.prepare("SELECT id FROM weyland_sessions WHERE id = ? AND expires_at > datetime('now')").bind(sessionMatch[1]).first();
          if (!row)
            return new Response(null, { status: 302, headers: { "Location": "/", "Cache-Control": "no-cache" } });
        } catch {
          return new Response(null, { status: 302, headers: { "Location": "/" } });
        }
      }
      const keys = [
        url.pathname === "/" ? "index.html" : url.pathname.slice(1),
        url.pathname.endsWith("/") ? url.pathname.slice(1) + "index.html" : null,
        !url.pathname.match(/\.[^/]+$/) ? url.pathname.slice(1) + "/index.html" : null
      ].filter(Boolean);
      for (const key of keys) {
        try {
          const obj = await env2.ASSETS.get(key);
          if (obj) {
            const ext = (key.match(/\.[^.]+$/) || [".html"])[0].toLowerCase();
            const mimeTypes = { ".html": "text/html;charset=utf-8", ".js": "application/javascript;charset=utf-8", ".css": "text/css;charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".pdf": "application/pdf", ".py": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
            const isHtml = ext === ".html";
            const headers = {
              "Content-Type": mimeTypes[ext] || "application/octet-stream",
              "X-Served-By": "weyland-onamerica-r2",
              "X-R2-Object-Etag": obj.httpEtag || ""
            };
            if (isHtml) {
              headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
              headers["Pragma"] = "no-cache";
              headers["Expires"] = "0";
              headers["CDN-Cache-Control"] = "no-store";
              headers["Cloudflare-CDN-Cache-Control"] = "no-store";
              if (obj.httpEtag)
                headers["ETag"] = obj.httpEtag;
              if (obj.uploaded)
                headers["Last-Modified"] = new Date(obj.uploaded).toUTCString();
            } else {
              headers["Cache-Control"] = "public, max-age=86400, must-revalidate";
              if (obj.httpEtag)
                headers["ETag"] = obj.httpEtag;
            }
            return new Response(obj.body, { headers });
          }
        } catch (e) {
          console.log(`[R2] Error getting ${key}: ${e.message}`);
        }
      }
    }
    try {
      console.log(`[Request ${requestId}] ${request2.method} ${url.pathname}`);
      const response = await router.handle(request2, env2, ctx);
      const latency = Date.now() - startTime;
      console.log(`[Request ${requestId}] Completed in ${latency}ms - Status: ${response.status}`);
      const metrics = new ErrorMetrics(env2);
      await metrics.recordLatency("api_request", latency, response.status < 400);
      return createCorsHandler(env2).corsify(response, request2);
    } catch (error4) {
      const latency = Date.now() - startTime;
      console.error(`[Request ${requestId}] Failed after ${latency}ms:`, error4);
      const metrics = new ErrorMetrics(env2);
      const classification = classifyError(error4);
      await metrics.recordError(classification.code, { requestId, latency });
      const errorResponse2 = createErrorResponse(error4, { requestId });
      return createCorsHandler(env2).corsify(
        new Response(JSON.stringify(errorResponse2), {
          status: classification.statusCode,
          headers: { "Content-Type": "application/json" }
        }),
        request2
      );
    }
  },
  // Cron trigger handler (runs at 2 AM UTC daily)
  async scheduled(event, env2, ctx) {
    console.log("Cron trigger fired:", new Date(event.scheduledTime).toISOString());
    // Removed 2026-09-09: called cleanupExpiredTokens(env2), a function that
    // was never defined anywhere in this file - threw a ReferenceError every
    // day, silently swallowed by this try/catch. Root cause: the real
    // password-reset flow already delegates to AuthFor (see the
    // fetch("https://authfor.com/api/v1/password/reset-request") call
    // elsewhere in this file), so the local `password_reset_tokens` D1 table
    // this was meant to clean up is never actually written to by anything in
    // this worker. Deleting the dead call rather than implementing a working
    // cleanup query for a table nothing populates - that table and its
    // cron entry are leftover local-auth surface area from before/parallel
    // to the AuthFor migration and should be resolved (dropped, or wired to
    // AuthFor for real) during the auth module extraction, not patched here.
    try {
      const metrics = new ErrorMetrics(env2);
      console.log("[Cron] Metrics cleanup not required (auto-expiration enabled)");
    } catch (error4) {
      console.error("[Cron] Metrics cleanup failed:", error4);
    }
    try {
      const config3 = await getDiscoveryConfig(env2);
      const expiryDays = parseInt(config3.pending_review_expiry_days || "30");
      const result = await env2.DB.prepare(`
        UPDATE cut_sheet_discoveries
        SET status = 'expired', updated_at = datetime('now')
        WHERE status = 'pending_review'
          AND julianday('now') - julianday(discovered_at) > ?
      `).bind(expiryDays).run();
      if (result.changes > 0) {
        console.log(`[Cron] Expired ${result.changes} pending cut sheet discoveries`);
      }
    } catch (error4) {
      console.error("[Cron] Cut sheet discovery expiry failed:", error4);
    }
    try {
      const result = await env2.DB.prepare(`
        DELETE FROM cut_sheet_discovery_queue
        WHERE status = 'failed'
          AND julianday('now') - julianday(last_attempt_at) > 7
      `).run();
      if (result.changes > 0) {
        console.log(`[Cron] Cleaned up ${result.changes} failed discovery queue items`);
      }
    } catch (error4) {
      console.error("[Cron] Discovery queue cleanup failed:", error4);
    }
  },
  // Queue consumer handler (for cut-sheet-discovery queue)
  async queue(batch, env2) {
    return discoveryEngine.queue(batch, env2);
  }
  };
}

export function createWeylandWorker({ monolith }) {
  return {
  async fetch(request2, env2, ctx) {
    const url = new URL(request2.url);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    // WebSocket upgrades must bypass the router/cors.corsify() pipeline -
    // corsify() rebuilds the Response via `new Response(response.body, {...})`
    // without carrying the `webSocket` property forward, which silently
    // breaks the upgrade handshake. Handle these directly, before anything
    // else touches the request.
    if (request2.headers.get("Upgrade") === "websocket" && url.pathname.startsWith("/api/sight/room/")) {
      const projectId = url.pathname.slice("/api/sight/room/".length).split("/")[0];
      if (!projectId) return new Response("Missing project id", { status: 400 });
      const { error: wsAuthError, user: wsUser } = await authenticate(request2, env2);
      if (wsAuthError) return wsAuthError;
      const wsProdErr = await requireProductAccess(wsUser, env2, "meetingx");
      if (wsProdErr) return wsProdErr;
      const roomId = env2.SIGHTX_ROOM.idFromName(projectId);
      const stub = env2.SIGHTX_ROOM.get(roomId);
      const forwardUrl = new URL(request2.url);
      forwardUrl.searchParams.set("userId", wsUser.userId);
      forwardUrl.searchParams.set("userName", wsUser.name || wsUser.email || "Guest");
      return stub.fetch(new Request(forwardUrl.toString(), request2));
    }
    const LEGACY_PRODUCT_SUBDOMAINS = ["subx", "takeoffx", "propx", "cutsheetx", "huntx", "sightx"];
    const subdomainMatch = url.hostname.match(/^([a-z]+)\.weylandai\.com$/);
    if (subdomainMatch && LEGACY_PRODUCT_SUBDOMAINS.includes(subdomainMatch[1])) {
      const target = `https://weylandai.com/${subdomainMatch[1]}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
      return Response.redirect(target, 301);
    }
    if (request2.method === "GET" || request2.method === "HEAD") {
      const isHome = url.pathname === "/" || url.pathname === "/index.html";
      const isStaticAsset = url.pathname.startsWith("/assets/");
      if ((isHome || isStaticAsset) && env2.MASCOM_EDGE) {
        try {
          const edgeUrl = isHome ? "https://weylandai.com/" : "https://weylandai.com" + url.pathname;
          const edgeResp = await env2.MASCOM_EDGE.fetch(edgeUrl);
          if (edgeResp && edgeResp.status === 200) {
            const body = await edgeResp.arrayBuffer();
            return new Response(body, {
              status: 200,
              headers: {
                "Content-Type": edgeResp.headers.get("Content-Type") || "text/html; charset=utf-8",
                "X-Cache": edgeResp.headers.get("X-Cache") || "",
                "X-Served-By": "mascom-edge-via-weylandai-com-worker"
              }
            });
          }
        } catch (e) {
          console.log("[MASCOM_EDGE delegation failed, falling back to bundled page]", e.message);
        }
      }
      var sovereignResponse = SovereignWeylandRoutes.dispatch(url.pathname);
      if (sovereignResponse) return sovereignResponse;
    }
    if (url.hostname === "deck.weyland.onamerica.org" && (request2.method === "GET" || request2.method === "HEAD")) {
      const deckPath = url.pathname === "/" ? "/deck/" : "/deck" + url.pathname;
      try {
        const r2 = await serveR2(env2, deckPath);
        if (r2)
          return r2;
      } catch (e) {
        console.log("[R2 deck]", e.message);
      }
    }
    if ((request2.method === "GET" || request2.method === "HEAD") && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/lib/") || url.pathname === "/deck" || url.pathname.startsWith("/deck/"))) {
      try {
        const r2 = await serveR2(env2, url.pathname);
        if (r2)
          return r2;
      } catch (e) {
        console.log("[R2 public]", e.message);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      return monolith.fetch(request2, env2, ctx);
    }
    // R2 is not bound on this account (never enabled - sovereignty doctrine)
    // so serveR2() can never succeed here. This used to unconditionally 302
    // any unauthenticated GET/HEAD to "/" before falling through, which
    // silently locked out real public monolith page routes - /login itself,
    // plus customer-facing /quote/:id/view and /q/:id/:token links sent by
    // email. Fall through directly to monolith instead of gating on a
    // session for content that was never actually reachable.
    return monolith.fetch(request2, env2, ctx);
  }
  };
}
const SIGHTX_ROOM_COLORS = ["#f0b800", "#61dfa0", "#66d4ff", "#a78bfa", "#ff756e", "#ff9ecf", "#7ee787"];
export class SightXRoom {
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
    this.sessions = /* @__PURE__ */ new Map();
  }
  broadcast(msg, exclude) {
    const data = JSON.stringify(msg);
    for (const ws of this.sessions.keys()) {
      if (ws === exclude) continue;
      try {
        ws.send(data);
      } catch (e) {
      }
    }
  }
  async fetch(request2) {
    if (request2.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const url = new URL(request2.url);
    const userId = url.searchParams.get("userId") || crypto.randomUUID();
    const userName = (url.searchParams.get("userName") || "Guest").slice(0, 60);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const meta = { userId, name: userName, color: SIGHTX_ROOM_COLORS[this.sessions.size % SIGHTX_ROOM_COLORS.length] };
    this.sessions.set(server, meta);
    server.send(JSON.stringify({ type: "roster", users: Array.from(this.sessions.values()), you: userId }));
    this.broadcast({ type: "join", user: meta }, server);
    server.addEventListener("message", (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      if (msg.type === "chat") {
        this.broadcast({ type: "chat", user: meta, text: String(msg.text || "").slice(0, 2e3), ts: Date.now() }, null);
      } else if (msg.type === "signal" && msg.to) {
        for (const [ws, m] of this.sessions) {
          if (m.userId === msg.to) {
            ws.send(JSON.stringify({ type: "signal", from: meta.userId, fromName: meta.name, payload: msg.payload }));
            break;
          }
        }
      }
    });
    const onClose = () => {
      this.sessions.delete(server);
      this.broadcast({ type: "leave", userId: meta.userId }, null);
    };
    server.addEventListener("close", onClose);
    server.addEventListener("error", onClose);
    return new Response(null, { status: 101, webSocket: client });
  }
}
