// Real, runnable verification for src/lib/operator-gate.js - run with:
//   node --test src/lib/operator-gate.test.mjs
//
// The operator gate used by the access-queue routes: X-Operator-Key
// compared constant-time against env.ACCESS_QUEUE_OPERATOR_KEY, a
// dedicated secret - not a reuse of FLEET_API_KEY. Returns a 401
// Response when the caller is not an operator, null when it is.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeOperatorGate, constantTimeEqual } from "./operator-gate.js";

function req(headers = {}) {
  const h = new Map(Object.entries(headers));
  return { headers: { get: (k) => h.get(k) ?? null } };
}

test("constantTimeEqual: equal strings match, different lengths or bytes do not, empty never matches", () => {
  assert.equal(constantTimeEqual("abc123", "abc123"), true);
  assert.equal(constantTimeEqual("abc123", "abc124"), false);
  assert.equal(constantTimeEqual("abc123", "abc1234"), false);
  assert.equal(constantTimeEqual("", ""), false);
  assert.equal(constantTimeEqual(undefined, "x"), false);
});

test("gate: matching X-Operator-Key passes (null), no header is 401, wrong key is 401", async () => {
  const gate = makeOperatorGate();
  const env = { ACCESS_QUEUE_OPERATOR_KEY: "operator-secret" };
  assert.equal(await gate(req({ "X-Operator-Key": "operator-secret" }), env), null);
  const missing = await gate(req(), env);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, "AUTH_REQUIRED");
  const wrong = await gate(req({ "X-Operator-Key": "nope" }), env);
  assert.equal(wrong.status, 401);
});

test("gate: an edition with no ACCESS_QUEUE_OPERATOR_KEY configured admits nobody, even with a header", async () => {
  const gate = makeOperatorGate();
  const res = await gate(req({ "X-Operator-Key": "anything" }), {});
  assert.equal(res.status, 401);
});

test("gate: FLEET_API_KEY being set does NOT grant operator access - the two secrets are independent", async () => {
  const gate = makeOperatorGate();
  const env = { FLEET_API_KEY: "outbound-secret", ACCESS_QUEUE_OPERATOR_KEY: "operator-secret" };
  const res = await gate(req({ "X-Operator-Key": "outbound-secret" }), env);
  assert.equal(res.status, 401);
});
