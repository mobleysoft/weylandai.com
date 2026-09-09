// src/lib/authfor-client.js
//
// The REAL identity system: delegates verification to AuthFor
// (authfor.com), the conglomerate-wide identity provider, then bridges the
// verified identity to this app's local `users` row by email (users.id is
// a locally-generated UUID, not AuthFor's own id, so email is the join
// key). This is the module that should be read as "the auth system" going
// forward - as opposed to ../lib/legacy-local-session.js, which holds two
// local mechanisms that bypass AuthFor and are checked before this one
// (see that file's header for why, and what's still unverified about
// whether they're truly dead).
//
// Also holds signed-URL resource access (checkSignedUrlAccess) - a
// distinct concern from identity (it grants access to a specific resource
// URL, not "who is this user"), kept in this file per project-owner
// direction because it's the other real, non-legacy access path
// authenticate() supports, and call sites expect to find both here.
//
// Extracted verbatim in logic from weyland.worker.js's original inline
// authenticate() body (HEAD 4095d9e, lines ~145391-145428) - only
// relocated and split into two named functions, not changed behaviorally.

import { verifySignedResourceUrl } from "../auth-module.js";
import { jsonResponse3 } from "./json-response.js";

// Mechanism #3 (the real one): verify a Bearer token against AuthFor, then
// bridge to the local users table by email. Returns:
//   - { user } on a successful verify + existing local account
//   - { error } (a 404 Response) on a successful verify with NO matching
//     local account yet - this is a real, user-facing error, not a
//     fall-through
//   - null if there's no usable token, AuthFor didn't verify it, or the
//     verify call itself failed - so the caller can fall through to the
//     next mechanism (signed-URL access), matching the original code's
//     behavior exactly.
export async function authenticateViaAuthFor(request2, env2) {
  const auth = request2.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "fleet_authenticated") return null;
  try {
    const verifyResp = await fetch("https://authfor.com/api/v1/verify", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (verifyResp.ok) {
      const identity = await verifyResp.json();
      if (identity && identity.email) {
        const localUser = await env2.DB.prepare(
          "SELECT id, email, name FROM users WHERE email = ?"
        ).bind(identity.email).first();
        if (localUser) {
          return {
            user: {
              sub: localUser.id,
              userId: localUser.id,
              id: localUser.id,
              email: localUser.email,
              name: localUser.name || identity.name
            }
          };
        }
        return { error: jsonResponse3({ error: "No WeylandAI account for this identity yet — subscribe at /pricing" }, 404) };
      }
    }
  } catch (e) {
    console.log("[Auth] AuthFor verify error:", e.message);
  }
  return null;
}

// Mechanism #4: signed resource-URL access (?expires=&sig=). Not an
// identity check - grants access to one specific resource, with no
// associated user. Returns null when the URL has no signature params at
// all (so the caller falls through to the final "authentication required"
// response); otherwise always returns either a granted-access result or an
// { error } Response (expired/invalid), matching the original inline
// behavior.
export async function checkSignedUrlAccess(url, env2) {
  const hasSigParams = url.searchParams.has("expires") && url.searchParams.has("sig");
  if (!hasSigParams) return null;
  const result = await verifySignedResourceUrl(url, env2.JWT_SECRET);
  if (result.valid) {
    console.log("[Auth] Signed URL access granted for:", url.pathname);
    return { user: null, signedUrlAccess: true };
  }
  const status = result.expired ? 410 : 401;
  return { error: jsonResponse3({ error: result.expired ? "Signed URL expired" : result.error }, status) };
}
