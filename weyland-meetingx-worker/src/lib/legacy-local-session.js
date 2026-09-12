// src/lib/legacy-local-session.js
//
// *** NOT the real auth system. Read this before importing from here. ***
//
// authenticate() in the original bundle (weyland.worker.js lines
// 145344-145430 at HEAD 4095d9e) tries four mechanisms in sequence. This
// file holds the first two - both of which are LOCAL, and both of which
// BYPASS AuthFor (authfor.com), the conglomerate-wide identity provider.
// The real, intended identity check is in ../lib/authfor-client.js. This
// split was made 2026-09-09 on direct project-owner instruction after a
// first pass of this extraction risked relocating these two mechanisms
// into a generically-named "auth.js" that would have quietly formalized
// them as if they were just "the auth module."
//
// 1. authenticateLocalSession() - reads a `weyland_session` cookie and
//    looks it up directly against the D1 `weyland_sessions` table. This is
//    genuine independent local auth: no AuthFor call happens on this path
//    at all. It is checked FIRST, before AuthFor is ever consulted - if a
//    request carries a valid weyland_session cookie, AuthFor is never
//    asked whether the identity is real.
//
//    What populates `weyland_sessions`: not established by this pass -
//    the login/session-creation route(s) that write to this table weren't
//    traced as part of this extraction (that would require reading the
//    "auth: login, session, logout, AuthFor exchange" route cluster at
//    ~146563-146945 per WORKER_MODULARIZATION_MAP.md's route table, which
//    is out of scope for this phase). Flagging this explicitly rather than
//    guessing: it is NOT safe to assume this table is dead. It may be the
//    live session store for the cookie-based /login flow referenced
//    elsewhere in the codebase (e.g. the weylandai.com /login page uses
//    "real AuthFor+Stripe backend" per a recent commit message, which is
//    consistent with AuthFor issuing the session that lands in this
//    table - but that's an inference, not something this pass verified by
//    reading the login route). Recommendation: before any future pass
//    considers removing this path, trace every INSERT INTO weyland_sessions
//    in the codebase and confirm whether it's still written today.
//
// 2. authenticateLocalJwt() - verifies a Bearer token as a locally-signed
//    JWT using env.JWT_SECRET. This one IS confirmed dead: the original
//    code has its own comment stating "nothing in this worker signs a
//    local JWT_SECRET token, so the block above is effectively dead for
//    real traffic" (preserved verbatim in ../lib/auth.js's composing
//    comment). Kept here, unremoved, because deleting it is a real
//    behavior decision for the project owner, not something to do
//    silently during a mechanical extraction.
//
// Neither function was changed behaviorally in this extraction - only
// relocated out of the inline authenticate() body and given honest names.

import { authenticateRequest } from "../auth-module.js";

// Mechanism #1: local session-cookie lookup. Bypasses AuthFor entirely.
// Returns { user } on a valid, unexpired session; null on any miss
// (no cookie, no matching row, expired row, or a DB error) so the caller
// can fall through to the next mechanism - matching the original code's
// fall-through-on-no-match behavior exactly.
export async function authenticateLocalSession(request2, env2) {
  const cookies = request2.headers.get("Cookie") || "";
  const sessionMatch = cookies.match(/weyland_session=([^;]+)/);
  if (!sessionMatch) return null;
  try {
    const session = await env2.DB.prepare(
      "SELECT * FROM weyland_sessions WHERE id = ? AND expires_at > datetime('now')"
    ).bind(sessionMatch[1]).first();
    if (session) {
      const nodeData = session.player_json ? JSON.parse(session.player_json) : {};
      const tenantId = nodeData.tenants && nodeData.tenants[0] ? nodeData.tenants[0].id : "ven_weyland";
      return {
        user: {
          sub: session.user_id,
          userId: session.user_id,
          // Rosetta: monolith reads request.user.userId
          id: session.user_id,
          email: session.email,
          name: nodeData.name || session.email,
          mhsId: session.mhs_id || nodeData.mhsId,
          role: nodeData.role || "member",
          tenants: nodeData.tenants || [],
          tenant_id: tenantId,
          // snake_case for fleet convention
          tenantId
          // camelCase for monolith convention
        }
      };
    }
  } catch (e) {
    console.log("[AUTH] Session lookup error:", e.message);
  }
  return null;
}

// Mechanism #2: local JWT verification via env.JWT_SECRET. Self-documented
// as dead for real traffic in the original inline code - see file header.
// Returns { user: payload } on a valid local JWT; null otherwise (missing
// Bearer token, the sentinel "fleet_authenticated" value, or verification
// failure) so the caller can fall through to the real AuthFor check.
export async function authenticateLocalJwt(request2, env2) {
  const auth = request2.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "fleet_authenticated") return null;
  try {
    const payload = await authenticateRequest(request2, env2.JWT_SECRET);
    return { user: payload };
  } catch (e) {
    return null;
  }
}
