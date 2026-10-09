// Real, runnable verification for src/lib/authfor-invite.js - run with:
//   node --test src/lib/authfor-invite.test.mjs
//
// The identity-provider invite seam the access-queue approve route calls,
// wired to AuthFor's real POST /api/v1/register (the same call and payload
// shape legacy-monolith.js's Stripe-webhook path already makes). fetch is
// injected so the test exercises the real request construction and the real
// response mapping without touching the network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteViaAuthFor } from "./authfor-invite.js";

function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
  };
  fn.calls = calls;
  return fn;
}

test("a new account: posts register with the invitee's identity and a random password, reports the AuthFor id, no email", async () => {
  const f = fakeFetch(200, { ok: true, user: { id: "af_u_123" }, session_id: "s1", token: "t1" });
  const r = await inviteViaAuthFor({}, { email: "ann@example.com", name: "Ann", role: "member", operatorToken: "op" }, { fetchImpl: f });
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { ok: true, mhs_id: "af_u_123", email_sent: false, already_member: false });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, "https://authfor.com/api/v1/register");
  const sent = f.calls[0].body;
  assert.equal(sent.email, "ann@example.com");
  assert.equal(sent.name, "Ann");
  assert.equal(sent.client_id, "af_weyland_subscribe");
  assert.equal(sent.venture_id, "weylandai.com");
  assert.ok(typeof sent.password === "string" && sent.password.length >= 64, "random password, never reused");
});

test("an existing account (USER_EXISTS) is a successful no-op: already_member true", async () => {
  const f = fakeFetch(409, { ok: false, error: "USER_EXISTS" });
  const r = await inviteViaAuthFor({}, { email: "ann@example.com", name: null, role: "member" }, { fetchImpl: f });
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, { ok: true, mhs_id: null, email_sent: false, already_member: true });
});

test("any other failure is reported, not swallowed", async () => {
  const f = fakeFetch(500, { error: "boom" });
  const r = await inviteViaAuthFor({}, { email: "ann@example.com" }, { fetchImpl: f });
  assert.equal(r.ok, false);
  assert.equal(r.status, 500);
  assert.equal(r.data.error, "AUTHFOR_REJECTED");
  const thrower = async () => { throw new Error("network down"); };
  const r2 = await inviteViaAuthFor({}, { email: "ann@example.com" }, { fetchImpl: thrower });
  assert.equal(r2.ok, false);
  assert.equal(r2.status, 0);
  assert.equal(r2.data.error, "AUTHFOR_UNAVAILABLE");
});

test("a 202 email-proof request or a successful response without an identity is not a created invite", async () => {
  for (const [status, body, error] of [
    [202, { code: "EMAIL_CODE_REQUIRED", verification_required: true }, "EMAIL_CODE_REQUIRED"],
    [200, { ok: true }, "AUTHFOR_IDENTITY_MISSING"],
  ]) {
    const r = await inviteViaAuthFor({}, { email: "ann@example.com" }, { fetchImpl: fakeFetch(status, body) });
    assert.equal(r.ok, false);
    assert.equal(r.data.error, error);
  }
});

test("current AuthFor USER_EXISTS code is accepted as an existing-account no-op", async () => {
  const r = await inviteViaAuthFor({}, { email: "ann@example.com" }, { fetchImpl: fakeFetch(400, { code: "USER_EXISTS", error: "Email already registered" }) });
  assert.equal(r.ok, true);
  assert.equal(r.data.already_member, true);
});


test("confidential provisioning credentials stay in the server request, including after AuthFor's deadline", async () => {
  const f = fakeFetch(200, { user: { id: "af_u_secret" }, session_id: "s", token: "t" });
  const r = await inviteViaAuthFor({ AUTHFOR_PROVISION_CLIENT_ID: "fixture-client", AUTHFOR_PROVISION_CLIENT_SECRET: "fixture-secret" }, { email: "ann@example.com" }, { fetchImpl: f });
  assert.equal(f.calls[0].body.client_id, "fixture-client");
  assert.equal(f.calls[0].body.client_secret, "fixture-secret");
  assert.equal(r.ok, true);
  assert.equal(JSON.stringify(r).includes("fixture-secret"), false);
  const partial = await inviteViaAuthFor({ AUTHFOR_PROVISION_CLIENT_ID: "fixture-client" }, { email: "ann@example.com" }, { fetchImpl: f });
  assert.equal(partial.ok, false);
  assert.equal(partial.data.error, "AUTHFOR_PROVISION_CONFIG_INCOMPLETE");
  assert.equal(f.calls.length, 1, "no anonymous fallback from partial configuration");
});
