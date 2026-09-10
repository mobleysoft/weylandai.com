// src/lib/operator-gate.js
//
// Operator authentication for service-to-service and back-office routes:
// X-Fleet-Key compared constant-time against env.FLEET_API_KEY. Returns a
// 401 Response for a non-operator, null for an operator - the shape the
// access-queue routes (src/routes/access-requests.js) inject as
// `requireOperator`.
//
// This worker already carries FLEET_API_KEY as an OUTBOUND credential (the
// hascom-edge headers in legacy-monolith.js); this is the same secret used
// INBOUND, exactly as the weyland.onamerica.org prototype does. An edition
// with no FLEET_API_KEY configured admits nobody - the routes still exist
// but every operator call is 401 until the secret is set with
// `wrangler secret put FLEET_API_KEY`. Documented in docs/credentials.md.
//
// Verified by src/lib/operator-gate.test.mjs (node --test).

import { jsonResponse3 } from "./json-response.js";

/** Constant-time string compare; empty or missing never matches. */
export function fleetKeyEqual(provided, expected) {
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
export function makeFleetKeyOperatorGate() {
  return async function requireOperator(request2, env2) {
    const provided = request2.headers.get("X-Fleet-Key");
    if (provided && env2 && fleetKeyEqual(provided, env2.FLEET_API_KEY)) return null;
    return jsonResponse3({ success: false, error: { code: "AUTH_REQUIRED", message: "X-Fleet-Key required" } }, 401);
  };
}
