// Real, runnable verification for src/lib/operator-gate.js - run with:
//   node --test src/lib/operator-gate.test.mjs
//
// The operator gate used by the access-queue routes: X-Fleet-Key compared
// constant-time against env.FLEET_API_KEY. Returns a 401 Response when the
// caller is not an operator, null when it is.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFleetKeyOperatorGate, fleetKeyEqual } from "./operator-gate.js";

function req(headers = {}) {
  const h = new Map(Object.entries(headers));
  return { headers: { get: (k) => h.get(k) ?? null } };
}

test("fleetKeyEqual: equal strings match, different lengths or bytes do not, empty never matches", () => {
  assert.equal(fleetKeyEqual("abc123", "abc123"), true);
  assert.equal(fleetKeyEqual("abc123", "abc124"), false);
  assert.equal(fleetKeyEqual("abc123", "abc1234"), false);
  assert.equal(fleetKeyEqual("", ""), false);
  assert.equal(fleetKeyEqual(undefined, "x"), false);
});

test("gate: matching X-Fleet-Key passes (null), no header is 401, wrong key is 401", async () => {
  const gate = makeFleetKeyOperatorGate();
  const env = { FLEET_API_KEY: "fleet-secret" };
  assert.equal(await gate(req({ "X-Fleet-Key": "fleet-secret" }), env), null);
  const missing = await gate(req(), env);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, "AUTH_REQUIRED");
  const wrong = await gate(req({ "X-Fleet-Key": "nope" }), env);
  assert.equal(wrong.status, 401);
});

test("gate: an edition with no FLEET_API_KEY configured admits nobody, even with a header", async () => {
  const gate = makeFleetKeyOperatorGate();
  const res = await gate(req({ "X-Fleet-Key": "anything" }), {});
  assert.equal(res.status, 401);
});
