import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NativeRouter } from "../lib/router.js";
import { registerRoomRoutes, roomIdFrom, ROOM_ID } from "./room.js";

const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup({ auth, access }) {
  const router = new NativeRouter();
  registerRoomRoutes(router, {
    authenticate: async () => auth,
    requireProductAccess: async () => access,
  });
  return router;
}

async function probe(router, room) {
  const res = await router.handle(new Request("https://weylandai.com/api/sight/room/" + room), {}, {});
  return { status: res.status, body: await res.json() };
}

test("room access: signed out -> 401 with sign-in wording", async () => {
  const r = setup({ auth: { error: json({ error: "Authentication required — sign in at /" }, 401) } });
  const { status, body } = await probe(r, "abc123def0");
  assert.equal(status, 401);
  assert.equal(body.signedIn, false);
  assert.equal(body.access, false);
  assert.equal(body.room, "abc123def0");
});

test("room access: an anonymous guest session is told to sign in (401), not to buy", async () => {
  const r = setup({ auth: { user: { ephemeral: true, userId: null } }, access: json({ success: false, error: { code: "EPHEMERAL_PRODUCT_NOT_AVAILABLE", message: "x" } }, 402) });
  const { status, body } = await probe(r, "abc123def0");
  assert.equal(status, 401);
  assert.equal(body.code, "AUTH_REQUIRED");
});

test("room access: signed in without MeetingX -> 402 with the plan message", async () => {
  const r = setup({ auth: { user: { userId: "u1", name: "Pat" } }, access: json({ success: false, error: { code: "PRODUCT_NOT_ENABLED", message: "Your plan doesn't include meetingx. See /pricing to add it." } }, 402) });
  const { status, body } = await probe(r, "abc123def0");
  assert.equal(status, 402);
  assert.equal(body.signedIn, true);
  assert.equal(body.code, "PRODUCT_NOT_ENABLED");
  assert.match(body.message, /meetingx/);
});

test("room access: entitled -> 200 access true with the display name", async () => {
  const r = setup({ auth: { user: { userId: "u1", name: "Pat Example", email: "p@example.com" } }, access: null });
  const { status, body } = await probe(r, "0f3c9a7b21");
  assert.equal(status, 200);
  assert.deepEqual(body, { room: "0f3c9a7b21", signedIn: true, access: true, name: "Pat Example" });
});

test("room ids: page-generated and UUID ids pass; anything else is refused", async () => {
  assert.ok(ROOM_ID.test("0f3c9a7b21") && ROOM_ID.test("eabd5ff6-e19f-4e6b-acfc-9a250445dfa8"));
  assert.ok(!ROOM_ID.test("") && !ROOM_ID.test("a".repeat(65)) && !ROOM_ID.test("a b") && !ROOM_ID.test("<x>"));
  assert.equal(roomIdFrom(new URL("https://weylandai.com/api/sight/room/%E0%A4%A")), "%E0%A4%A");
  const r = setup({ auth: { user: { userId: "u1" } }, access: null });
  const { status } = await probe(r, "bad%20room");
  assert.equal(status, 400);
});

test("page: a shared link shows JOIN ROOM, signs in in place, and never sends the visitor to /login by hand", () => {
  const html = readFileSync(new URL("../pages/meetingx.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="room-btn"') && html.includes('id="room-join-bar"'));
  assert.ok(html.includes("WeylandPage.signIn('/meetingx?room='"));
  assert.ok(!/Sign in at \/login, then reopen/.test(html));
  assert.ok(html.includes("/api/sight/room/'+encodeURIComponent(roomId),{credentials:'same-origin'"));
});
