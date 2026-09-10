// src/lib/authfor-invite.js
//
// The identity-provider invite seam for the access-queue approve route
// (src/routes/access-requests.js). In this codebase identity is AuthFor's
// job (WEYLAND_SUCCESSOR_ARCHITECTURE.md), so "invite" means: provision the
// account through AuthFor's real POST /api/v1/register - the same call, with
// the same client_id / venture_id payload, that legacy-monolith.js's Stripe
// webhook path already makes for a brand-new customer.
//
// Honest scope, not papered over: AuthFor has no invite endpoint today, so
//   - email_sent is always false (register does not notify the invitee);
//   - operatorToken is accepted for interface parity with the prototype's
//     fleet-auth invite (which authorized against the approving admin) but
//     is not forwarded, because register has no operator concept.
// A real AuthFor invite endpoint (provision + notify, authorized against the
// approving operator's own identity) is the correct platform feature to ask
// for - per WORKER_LESSONS_LEARNED.md's rule, that request goes UP into
// AuthFor rather than being worked around here. Until then the approve
// route reports exactly what happened.
//
// Verified by src/lib/authfor-invite.test.mjs (node --test).

const AUTHFOR_REGISTER = "https://authfor.com/api/v1/register";

/**
 * @param {object} env2 - worker env (unused today; kept so a Service Binding
 *   to AuthFor can replace the public fetch without changing callers).
 * @param {{email: string, name?: string|null, role?: string, operatorToken?: string}} args
 * @param {{fetchImpl?: typeof fetch}} [opts] - fetch injection for tests.
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
export async function inviteViaAuthFor(env2, { email, name, role, operatorToken } = {}, { fetchImpl = fetch } = {}) {
  void role; void operatorToken; // interface parity - see header
  let resp;
  try {
    resp = await fetchImpl(AUTHFOR_REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        name: name || email,
        client_id: "af_weyland_subscribe",
        venture_id: "weylandai.com",
      }),
    });
  } catch (e) {
    return { ok: false, status: 0, data: { error: `AuthFor register call failed: ${e.message}` } };
  }
  let data = {};
  try { data = await resp.json(); } catch (e) { /* non-JSON body */ }
  if (resp.ok) {
    const mhsId = (data && (data.user?.id || data.user_id || data.id)) || null;
    return { ok: true, status: resp.status, data: { ok: true, mhs_id: mhsId, email_sent: false, already_member: false } };
  }
  if (data && data.error === "USER_EXISTS") {
    return { ok: true, status: resp.status, data: { ok: true, mhs_id: null, email_sent: false, already_member: true } };
  }
  return { ok: false, status: resp.status, data: { error: (data && data.error) || `AuthFor register failed (${resp.status})` } };
}
