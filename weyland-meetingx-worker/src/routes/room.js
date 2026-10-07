// weyland-meetingx-worker/src/routes/room.js
//
// Room helpers and the room access check (no imports that need Wrangler's
// text-module rule, so node --test can load this file).
//
// GET /api/sight/room/:id without an Upgrade header answers "may this
// browser join?" with the same status the WebSocket handshake would get
// (200, 401, 402, 404) and JSON the page can show. It runs exactly the
// handshake's auth gate (authenticate + requireProductAccess "meetingx"),
// so access: true means the socket will be accepted. meetingx.html calls
// it before opening the socket because a failed handshake cannot tell
// "sign in" from "plan needed".

import { jsonResponse3 } from "../lib/json-response.js";

// Room ids: what meetingx.html generates (10 hex chars) and any project id
// (UUID) SightX-style callers use. Anything else is refused before it can
// name a Durable Object.
export const ROOM_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function roomIdFrom(url) {
  const raw = url.pathname.slice("/api/sight/room/".length).split("/")[0] || "";
  try { return decodeURIComponent(raw); } catch (_) { return raw; }
}

async function errorBody(res) {
  try {
    const d = await res.clone().json();
    const e = d && d.error;
    if (e && typeof e === "object") return { code: e.code || null, message: e.message || null };
    return { code: null, message: (typeof e === "string" ? e : null) || (d && d.message) || null };
  } catch (_) {
    return { code: null, message: null };
  }
}

export function registerRoomRoutes(router, { authenticate, requireProductAccess }) {
  router.get("/api/sight/room/:id", async (request, env) => {
    const url = new URL(request.url);
    const room = roomIdFrom(url);
    if (!ROOM_ID.test(room)) return jsonResponse3({ room, access: false, code: "BAD_ROOM", message: "Room ids are 1-64 letters, digits, - or _." }, 400);
    const { error, user } = await authenticate(request, env);
    if (error) {
      const b = await errorBody(error);
      return jsonResponse3({ room, signedIn: false, access: false, code: b.code || (error.status === 401 ? "AUTH_REQUIRED" : "NO_ACCOUNT"), message: b.message || "Sign in to join this room." }, error.status);
    }
    const prodErr = await requireProductAccess(user, env, "meetingx");
    if (prodErr) {
      // An anonymous guest session is not an account: tell the page to sign in, not to buy.
      if (user && user.ephemeral) {
        return jsonResponse3({ room, signedIn: false, access: false, code: "AUTH_REQUIRED", message: "Sign in to join this room." }, 401);
      }
      const b = await errorBody(prodErr);
      return jsonResponse3({ room, signedIn: true, access: false, code: b.code, message: b.message || "Your plan does not include MeetingX rooms." }, prodErr.status);
    }
    return jsonResponse3({ room, signedIn: true, access: true, name: (user && (user.name || user.email)) || "Guest" });
  });
}
