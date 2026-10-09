// src/lib/authfor-invite.js
//
// The identity-provider invite seam for the access-queue approve route
// (src/routes/access-requests.js). In this codebase identity is AuthFor's
// job (WEYLAND_SUCCESSOR_ARCHITECTURE.md), so "invite" means: provision the
// account through AuthFor's real POST /api/v1/register, using the shared
// server-only confidential provisioning client used by paid checkout.
//
// This seam provisions an account; it does not call AuthFor's separate
// signed-in-user ephemeral invite flow, so
//   - email_sent is always false (register does not notify the invitee);
//   - operatorToken is accepted for interface parity with the prototype's
//     fleet-auth invite (which authorized against the approving admin) but
//     is not forwarded, because register has no operator concept.
// An AuthFor service invite endpoint (provision + notify, authorized against the
// approving operator's own identity) is the correct platform feature to ask
// for - per WORKER_LESSONS_LEARNED.md's rule, that request goes UP into
// AuthFor rather than being worked around here. Until then the approve
// route reports exactly what happened.
//
// Verified by src/lib/authfor-invite.test.mjs (node --test).

import { provisionAuthFor } from "../../weyland-shared/authfor-provisioning.js";

/**
 * @param {object} env2 - worker env, including the confidential provisioning client.
 * @param {{email: string, name?: string|null, role?: string, operatorToken?: string}} args
 * @param {{fetchImpl?: typeof fetch}} [opts] - fetch injection for tests.
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
export async function inviteViaAuthFor(env2, { email, name, role, operatorToken } = {}, { fetchImpl = fetch } = {}) {
  void role; void operatorToken; // interface parity - see header
  const result = await provisionAuthFor(env2, { email, name }, { fetchImpl });
  if (result.alreadyMember) return { ok: true, status: result.status, data: { ok: true, mhs_id: null, email_sent: false, already_member: true } };
  if (result.ok) return { ok: true, status: result.status, data: { ok: true, mhs_id: result.userId, email_sent: false, already_member: false } };
  return { ok: false, status: result.status, data: { error: result.code } };
}
