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

// The room record (2026-10-08): chat, decisions, actions and transcript lines
// kept in D1 per room, so a room has the same record for everyone in it and
// after everyone leaves. Before this, decisions, actions and transcript lived
// only in the browser that typed them and chat vanished when the socket closed.
//   GET  /api/sight/room/:id/record          -> { items: [{id, kind, text, by, at, done}] } (oldest first, last 500)
//   POST /api/sight/room/:id/record {kind, text}   kind: chat | decision | action | transcript
//   POST /api/sight/room/:id/record/:item/done {done}  ticks an action off
// Same gate as joining the room (an account with MeetingX).
export const RECORD_KINDS = new Set(["chat", "decision", "action", "transcript"]);
export const MAX_ROOM_ITEMS = 5000;

let recordTableReady = false;
export function resetRecordTableForTests() { recordTableReady = false; }
async function ensureRecordTable(env) {
  if (recordTableReady) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS meetingx_room_items (
    id TEXT PRIMARY KEY, room TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
    user_id TEXT, user_name TEXT, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_meetingx_room_items_room ON meetingx_room_items(room, created_at)").run();
  recordTableReady = true;
}

export function registerRoomRoutes(router, { authenticate, requireProductAccess }) {
  // The same gate as the probe and the WebSocket: an account with MeetingX.
  async function member(request, env) {
    const room = roomIdFrom(new URL(request.url));
    if (!ROOM_ID.test(room)) return { error: jsonResponse3({ success: false, code: "BAD_ROOM" }, 400) };
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "AUTH_REQUIRED", message: "Sign in to use this room." }, 401) };
    const prodErr = await requireProductAccess(user, env, "meetingx");
    if (prodErr) return { error: prodErr };
    await ensureRecordTable(env);
    return { room, user };
  }

  // ICE servers for the room's browser-to-browser calls. STUN alone connects
  // most home and office networks; strict NATs need a relay (TURN). With
  // Cloudflare Realtime TURN configured (worker secrets TURN_KEY_ID and
  // TURN_KEY_API_TOKEN) each member gets short-lived relay credentials.
  router.get("/api/sight/room/:id/ice", async (request, env) => {
    const m = await member(request, env);
    if (m.error) return m.error;
    const iceServers = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
    let relay = false;
    if (env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) {
      try {
        const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: 4 * 3600 }),
        });
        if (r.ok) {
          const d = await r.json();
          const list = Array.isArray(d.iceServers) ? d.iceServers : (d.iceServers ? [d.iceServers] : []);
          if (list.length) { iceServers.push(...list); relay = true; }
        }
      } catch (_) { /* STUN only */ }
    }
    return jsonResponse3({ success: true, iceServers, relay });
  });

  router.get("/api/sight/room/:id/record", async (request, env) => {
    const m = await member(request, env);
    if (m.error) return m.error;
    const r = await env.DB.prepare(
      `SELECT id, kind, text, user_name, done, created_at FROM (
         SELECT * FROM meetingx_room_items WHERE room = ? ORDER BY created_at DESC LIMIT 500
       ) ORDER BY created_at ASC`
    ).bind(m.room).all();
    const items = (r?.results || []).map((x) => ({ id: x.id, kind: x.kind, text: x.text, by: x.user_name, at: x.created_at, done: !!x.done }));
    return jsonResponse3({ success: true, room: m.room, items });
  });

  router.post("/api/sight/room/:id/record", async (request, env) => {
    const m = await member(request, env);
    if (m.error) return m.error;
    let body = {};
    try { body = await request.json(); } catch (_) { body = {}; }
    const kind = String(body.kind || "");
    const text = String(body.text || "").trim().slice(0, 2000);
    if (!RECORD_KINDS.has(kind) || !text) return jsonResponse3({ success: false, code: "BAD_ITEM", message: "kind is chat, decision, action or transcript; text is required." }, 400);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM meetingx_room_items WHERE room = ?").bind(m.room).first();
    if ((n?.n || 0) >= MAX_ROOM_ITEMS) return jsonResponse3({ success: false, code: "ROOM_FULL", message: "This room's record is full; start a new room." }, 409);
    const item = { id: crypto.randomUUID(), kind, text, by: String(m.user.name || m.user.email || "Member").slice(0, 60), at: new Date().toISOString(), done: false };
    await env.DB.prepare("INSERT INTO meetingx_room_items (id, room, kind, text, user_id, user_name, done, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
      .bind(item.id, m.room, kind, text, String(m.user.userId), item.by, item.at).run();
    return jsonResponse3({ success: true, item });
  });

  router.post("/api/sight/room/:id/record/:item/done", async (request, env) => {
    const m = await member(request, env);
    if (m.error) return m.error;
    let body = {};
    try { body = await request.json(); } catch (_) { body = {}; }
    const item = request.params?.item || new URL(request.url).pathname.split("/")[6];
    await env.DB.prepare("UPDATE meetingx_room_items SET done = ? WHERE id = ? AND room = ? AND kind = 'action'").bind(body.done === false ? 0 : 1, item, m.room).run();
    return jsonResponse3({ success: true });
  });

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
