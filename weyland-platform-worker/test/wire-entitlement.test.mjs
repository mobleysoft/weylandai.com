// WireX Pro follows the subscription, not a once-completed checkout link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyWireSession, wireIsPro } from "../src/routes/wire.js";

function stripeFake(sessions, subs) {
  return async (url) => {
    const u = String(url);
    const s = u.match(/checkout\/sessions\/([^?]+)/), sub = u.match(/subscriptions\/([^?]+)/);
    if (s && sessions[s[1]]) return new Response(JSON.stringify(sessions[s[1]]), { status: 200 });
    if (sub && subs[sub[1]]) return new Response(JSON.stringify(subs[sub[1]]), { status: 200 });
    return new Response(JSON.stringify({ error: { message: "no such" } }), { status: 404 });
  };
}
const SESSION = { status: "complete", metadata: { venture_id: "weylandai", product_id: "weyland-wire-seat" }, subscription: "sub_1" };

test("a completed checkout is Pro only while its subscription is live", async (t) => {
  const real = globalThis.fetch;
  t.after(() => { globalThis.fetch = real; });
  const env = { STRIPE_SECRET_KEY: "sk_test_x" };
  globalThis.fetch = stripeFake({ cs_test_aaaaaaaaaaaa: SESSION }, { sub_1: { status: "active" } });
  assert.equal(await verifyWireSession(env, "cs_test_aaaaaaaaaaaa"), true);
  globalThis.fetch = stripeFake({ cs_test_aaaaaaaaaaaa: SESSION }, { sub_1: { status: "canceled" } });
  assert.equal(await verifyWireSession(env, "cs_test_aaaaaaaaaaaa"), false, "cancelled: no longer Pro");
  globalThis.fetch = stripeFake({ cs_test_aaaaaaaaaaaa: { ...SESSION, metadata: { venture_id: "weylandai", product_id: "weyland-subx-seat" } } }, { sub_1: { status: "active" } });
  assert.equal(await verifyWireSession(env, "cs_test_aaaaaaaaaaaa"), false, "another product's checkout is not WireX");
  assert.equal(await verifyWireSession(env, "not-a-session"), false);
});

test("a signed-in account is Pro through its plan; no plan and no link is not Pro", async () => {
  const req = (q = "") => new Request("https://weylandai.com/api/wire/news" + q);
  const yes = { authenticate: async () => ({ user: { userId: "u1" } }), outputAccess: async (_e, _u, p) => ({ paid: p === "wire" }) };
  assert.equal(await wireIsPro(req(), {}, yes), true);
  const no = { authenticate: async () => ({ user: { userId: "u1" } }), outputAccess: async () => ({ paid: false }), verifyWireSession: async () => false };
  assert.equal(await wireIsPro(req(), {}, no), false);
  const guestWithLink = { authenticate: async () => ({ error: new Response("", { status: 401 }) }), verifyWireSession: async (_e, sid) => sid === "cs_live_good" };
  assert.equal(await wireIsPro(req("?session_id=cs_live_good"), {}, guestWithLink), true);
  assert.equal(await wireIsPro(req("?session_id=cs_live_bad"), {}, guestWithLink), false);
});
