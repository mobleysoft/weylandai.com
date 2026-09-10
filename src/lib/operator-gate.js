// src/lib/operator-gate.js
//
// Operator authentication for the access-request queue: X-Operator-Key
// compared constant-time against env.ACCESS_QUEUE_OPERATOR_KEY. Returns a
// 401 Response for a non-operator, null for an operator - the shape the
// access-queue routes (src/routes/access-requests.js) inject as
// `requireOperator`.
//
// Deliberately its OWN secret, not a reuse of FLEET_API_KEY (the value
// this worker already sends outbound to hascom-edge). Reusing that key
// would conflate two different trust relationships - "this worker is
// authorized to call hascom-edge" and "this caller is authorized to
// approve/deny access requests" - under one shared value, so leaking or
// rotating one silently affects the other. Corrected 2026-09-10, direct
// instruction after review flagged the reuse as a real coupling, not
// just style.
//
// An edition with no ACCESS_QUEUE_OPERATOR_KEY configured admits nobody -
// the routes still exist but every operator call is 401 until the secret
// is set with `wrangler secret put ACCESS_QUEUE_OPERATOR_KEY`.
//
// Verified by src/lib/operator-gate.test.mjs (node --test).

import { jsonResponse3 } from "./json-response.js";

/** Constant-time string compare; empty or missing never matches. */
export function constantTimeEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (!provided.length || !expected.length) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** @returns {(request: Request, env: object) => Promise<Response|null>} */
export function makeOperatorGate() {
  return async function requireOperator(request2, env2) {
    const provided = request2.headers.get("X-Operator-Key");
    if (provided && env2 && constantTimeEqual(provided, env2.ACCESS_QUEUE_OPERATOR_KEY)) return null;
    return jsonResponse3({ success: false, error: { code: "AUTH_REQUIRED", message: "X-Operator-Key required" } }, 401);
  };
}
