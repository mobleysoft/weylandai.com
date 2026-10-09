// weyland-platform-worker/src/routes/auth-session.js
//
// Self-contained fork of ../../../src/routes/auth-session.js, copied
// verbatim. This is the real login/session/account-creation surface:
//   POST /api/auth/session          - exchange a verified AuthFor token
//                                      for a local weyland_session cookie
//                                      (requires an EXISTING local users
//                                      row keyed by email - this is the
//                                      'login', not signup)
//   GET  /api/auth/session/check    - is the current weyland_session
//                                      cookie valid
//   POST /api/auth/logout           - delete the session row, clear the
//                                      cookie
//   POST /api/auth/authfor-exchange - the real 'signup' path: verifies an
//                                      AuthFor token and AUTO-PROVISIONS a
//                                      new local users row (14-day trial)
//                                      if none exists yet for that email,
//                                      then mints a local JWT. There is no
//                                      separate /signup route anywhere in
//                                      the monolith - first-time account
//                                      creation happens here, implicitly,
//                                      on first AuthFor sign-in.
//   GET  /api/auth/me               - the real account-info endpoint
//
// Added (previously missing - index.html's ephemeralToken() called this
// path and got a bare 404 in production; confirmed live with a direct
// curl before writing this, not assumed from the client code alone):
//   POST /api/auth/ephemeral         - proxies AuthFor's real
//                                      POST /api/v1/ephemeral/create.
//                                      Every product worker's
//                                      authenticateViaAuthFor() already
//                                      falls back to verifying this kind
//                                      of token (see each worker's
//                                      authfor-client.js) - this route was
//                                      the only missing link between a
//                                      visitor landing on weylandai.com
//                                      and getting a real, immediately
//                                      usable (if guest-scoped) identity,
//                                      Suno.ai-style, with no signup wall.
//   POST /api/auth/ephemeral/upgrade - proxies AuthFor's real
//                                      POST /api/v1/ephemeral/upgrade,
//                                      converting a guest session into a
//                                      permanent emailed+paymented account
//                                      without losing its history.
//
// Original header follows, preserved for provenance:
//
import { jsonResponse3 } from "../lib/json-response.js";
import { generateJWT, hashPassword } from "../auth-module.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { newTrialAccount, syncUserEntitlements, describeEntitlements, loadAccess } from "../lib/entitlements.js";
import { claimHeldPurchases, claimIdsFromRequest, claimCookie, claimFromCookie } from "../lib/grants.js";

// 2026-10-07 purchase-claim protection: purchases made signed out with the email
// of an existing account are held (routes/webhooks-subscription.js). A sign-in
// grants them when AuthFor says the email is proven (a code sign-in or a reset:
// email_verified, fc:identity) or when this browser is the one that paid (the
// weyland_claim cookie). Returns { claimed, cookie } (cookie: Set-Cookie or null).
async function claimOnSignIn(env2, request2, account, emailVerified) {
  const ids = claimIdsFromRequest(request2);
  if (!ids.length && !emailVerified) return { claimed: [], cookie: null };
  const r = await claimHeldPurchases(env2, account, { sessionIds: ids, emailVerified: emailVerified === true });
  return { claimed: r.claimed, cookie: ids.length ? claimCookie(r.keepIds) : null };
}

/**
 * @param {object} router
 * @param {{ authenticate: Function, errorResponse: Function }} deps
 */
export function registerAuthSessionRoutes(router, { authenticate, errorResponse }) {
  function sanitizeDisplayName(input) {
    if (typeof input !== "string")
      return "";
    let cleaned = input.replace(/<[^>]*>/g, "");
    cleaned = cleaned.replace(/on\w+\s*=/gi, "");
    return cleaned.substring(0, 200).trim();
  }

  router.post("/api/auth/session", async (request2, env2) => {
    try {
      const body = await request2.json();
      const authforToken = body.token || body.fleet_token || (request2.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (!authforToken) {
        return jsonResponse3({ error: "authfor_token_required", message: "A verified AuthFor token is required to establish a session. Please sign in again." }, 401);
      }
      let _claims;
      try {
        // Fixed 2026-09-09: this called auth-onamerica.ron-helms.workers.dev
        // (Ron's rejected fleet-auth mesh, a one-off for weylandai.com's
        // first customer, never the real architecture) despite the route
        // name and every local variable implying AuthFor. AuthFor is the
        // conglomerate's real identity provider - this now actually calls it.
        const _ir = await fetch("https://authfor.com/api/v1/verify", {
          method: "GET",
          headers: { "Authorization": `Bearer ${authforToken}` }
        });
        _claims = await _ir.json().catch(() => ({}));
        if (!_ir.ok || !_claims || !_claims.email) {
          return jsonResponse3({ error: "invalid_authfor_token", message: "Your sign-in token is invalid or expired \u2014 please sign in again." }, 401);
        }
      } catch (e) {
        return jsonResponse3({ error: "verification_unavailable", message: "Sign-in verification is temporarily unavailable. Please retry." }, 503);
      }
      const node = {
        email: _claims.email,
        mhsId: _claims.mhs || "",
        name: body.node && body.node.name || _claims.name || "",
        role: "member",
        tenants: []
      };
      if (!node || !node.email) {
        return jsonResponse3({ error: "Node identity required" }, 400);
      }
      // AuthFor verify only confirms the token is a *valid AuthFor identity*
      // - it doesn't establish this identity was ever granted weyland access
      // specifically. Rather than guess, require the email to already be a
      // real weylandai.com account - same rule the AuthFor bridge in
      // authenticate() already applies - instead of auto-provisioning a free
      // trial for any conglomerate-wide AuthFor identity.
      const existingUser = await env2.DB.prepare("SELECT id FROM users WHERE email = ?").bind(node.email).first();
      if (!existingUser) {
        return jsonResponse3({ error: "no_weyland_account", message: "No WeylandAI account for this identity yet — subscribe at /pricing" }, 404);
      }
      // Entitlements first (trial suite / trial end / guest floor - lib/entitlements.js),
      // so the product workers see the right row from this session's first request on.
      await syncUserEntitlements(env2, existingUser.id);
      const sessionId = "wses_" + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
      let user = await env2.DB.prepare("SELECT id, mhs_id FROM nodes WHERE email = ?").bind(node.email).first();
      if (!user) {
        const userId = existingUser.id;
        await env2.DB.prepare(
          "INSERT INTO nodes (id, email, name, mhs_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
        ).bind(userId, node.email, node.name || "", node.mhsId || "").run();
        user = { id: userId };
      } else if (node.mhsId && user.mhs_id !== node.mhsId) {
        await env2.DB.prepare(
          "UPDATE nodes SET mhs_id = ?, name = COALESCE(NULLIF(?, ''), name), updated_at = datetime('now') WHERE id = ?"
        ).bind(node.mhsId, node.name || "", user.id).run();
      }
      await env2.DB.prepare(
        "INSERT INTO weyland_sessions (id, user_id, email, mhs_id, player_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
      ).bind(sessionId, user.id, node.email, node.mhsId || "", JSON.stringify(node), expiresAt).run();
      const cookie = `weyland_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
      const claim = await claimOnSignIn(env2, request2, { id: existingUser.id, email: node.email }, _claims.email_verified === true || _claims.user?.email_verified === true);
      const headers = new Headers({ "Content-Type": "application/json" });
      headers.append("Set-Cookie", cookie);
      if (claim.cookie) headers.append("Set-Cookie", claim.cookie);
      return new Response(JSON.stringify({ ok: true, node, session_id: sessionId, expires_at: expiresAt, ...(claim.claimed.length ? { claimed: claim.claimed } : {}) }), {
        status: 200,
        headers
      });
    } catch (err) {
      return jsonResponse3({ error: "Session creation failed: " + err.message }, 500);
    }
  });
  router.get("/api/auth/session/check", async (request2, env2) => {
    const cookies = request2.headers.get("Cookie") || "";
    const match = cookies.match(/weyland_session=([^;]+)/);
    if (!match)
      return jsonResponse3({ ok: true, valid: false });
    try {
      const row = await env2.DB.prepare(
        "SELECT id FROM weyland_sessions WHERE id = ? AND expires_at > datetime('now')"
      ).bind(match[1]).first();
      return jsonResponse3({ ok: true, valid: !!row });
    } catch {
      return jsonResponse3({ ok: true, valid: false });
    }
  });
  router.post("/api/auth/logout", async (request2, env2) => {
    const cookies = request2.headers.get("Cookie") || "";
    const match = cookies.match(/weyland_session=([^;]+)/);
    if (match) {
      try {
        await env2.DB.prepare("DELETE FROM weyland_sessions WHERE id = ?").bind(match[1]).run();
      } catch {
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Set-Cookie": "weyland_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" }
    });
  });
  router.post("/api/auth/authfor-exchange", async (request2, env2) => {
    try {
      const { authfor_token } = await request2.json();
      if (!authfor_token) {
        return jsonResponse3({ error: "authfor_token required" }, 400);
      }
      // Fixed 2026-09-09: this called auth-onamerica.ron-helms.workers.dev's
      // /api/auth/role/ despite being named authfor-exchange and marking
      // provisioned accounts with password_hash "AUTHFOR_SSO" below - it was
      // never actually calling authfor.com. Now it genuinely does.
      const userInfoResp = await fetch("https://authfor.com/api/v1/verify", {
        headers: { "Authorization": `Bearer ${authfor_token}` }
      });
      if (!userInfoResp.ok) {
        return jsonResponse3({ error: "Invalid AuthFor token" }, 401);
      }
      const authforUser = await userInfoResp.json();
      const email = (authforUser.user?.email || authforUser.email || "").toLowerCase().trim();
      if (!email) {
        return jsonResponse3({ error: "AuthFor token has no email" }, 401);
      }
      let user = await env2.DB.prepare(
        `SELECT id, email, name, company, tenant_id, subscription_tier, subscription_status, trial_ends_at
         FROM users WHERE email = ?`
      ).bind(email).first();
      if (!user) {
        const userId = crypto.randomUUID();
        const name = sanitizeDisplayName(authforUser.user?.name || authforUser.name || email.split("@")[0]);
        const company = authforUser.user?.company || null;
        const sanitizedCompany = company ? sanitizeDisplayName(company) : null;
        const tenantId = sanitizedCompany ? "tenant-" + (await hashPassword(sanitizedCompany)).substring(0, 8) : userId;
        // 2026-10-07: the trial includes the whole suite until trial_ends_at
        // (products_enabled carries the trial grant; it used to be '' and every
        // product answered 402 to a brand-new trial) - see lib/entitlements.js.
        const trial = newTrialAccount();
        await env2.DB.prepare(
          `INSERT INTO users (id, email, password_hash, name, company, tenant_id,
            subscription_tier, subscription_status, submittals_used, submittals_limit,
            trial_ends_at, products_enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          userId,
          email,
          "AUTHFOR_SSO",
          name,
          sanitizedCompany,
          tenantId,
          trial.subscription_tier,
          trial.subscription_status,
          0,
          trial.submittals_limit,
          trial.trial_ends_at,
          trial.products_enabled,
          (/* @__PURE__ */ new Date()).toISOString()
        ).run();
        user = {
          id: userId,
          email,
          name,
          company: sanitizedCompany,
          tenant_id: tenantId,
          subscription_tier: trial.subscription_tier,
          subscription_status: trial.subscription_status,
          trial_ends_at: trial.trial_ends_at
        };
      } else {
        const synced = await syncUserEntitlements(env2, user.id);
        if (synced.row) {
          user.subscription_tier = synced.row.subscription_tier;
          user.subscription_status = synced.row.subscription_status;
        }
      }
      // Found live 2026-10-04 (MeetingX e2e run): this route 500'd on
      // every first-time sign-up with "Imported HMAC key length (0)" -
      // no worker has a JWT_SECRET configured, so generateJWT() threw
      // AFTER the users row was inserted (account silently created, caller
      // saw a 500). The local JWT is also verified by nothing: product
      // workers trust AuthFor tokens and the weyland_session cookie. So:
      // mint the JWT only if a secret exists, and ALWAYS establish the
      // real weyland_session cookie here (same row + cookie shape as
      // POST /api/auth/session above), which is what actually signs the
      // caller in.
      let token = null;
      if (env2.JWT_SECRET) {
        token = await generateJWT({
          userId: user.id,
          email: user.email,
          tenantId: user.tenant_id,
          name: user.name,
          company: user.company
        }, env2.JWT_SECRET);
      }
      const sessionId = "wses_" + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
      const sessionNode = { email: user.email, name: user.name || "", mhsId: "" };
      await env2.DB.prepare(
        "INSERT INTO weyland_sessions (id, user_id, email, mhs_id, player_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
      ).bind(sessionId, user.id, user.email, "", JSON.stringify(sessionNode), expiresAt).run();
      const cookie = `weyland_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
      const emailVerified = authforUser.email_verified === true || authforUser.user?.email_verified === true;
      const claim = await claimOnSignIn(env2, request2, { id: user.id, email: user.email }, emailVerified);
      const headers = new Headers({ "Content-Type": "application/json" });
      headers.append("Set-Cookie", cookie);
      if (claim.cookie) headers.append("Set-Cookie", claim.cookie);
      return new Response(JSON.stringify({
        token,
        session_id: sessionId,
        expires_at: expiresAt,
        ...(claim.claimed.length ? { claimed: claim.claimed } : {}),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          tenantId: user.tenant_id,
          subscriptionTier: user.subscription_tier,
          subscriptionStatus: user.subscription_status,
          trialEndsAt: user.trial_ends_at
        }
      }), { status: 200, headers });
    } catch (error4) {
      return jsonResponse3({ error: "Token exchange failed: " + error4.message }, 500);
    }
  });
  router.get("/api/auth/me", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const pre = await env2.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(user.userId).first();
      const claim = pre ? await claimFromCookie(env2, request2, pre) : { claimed: [], cookie: null };
      await syncUserEntitlements(env2, user.userId);
      const userData = await env2.DB.prepare(
        `SELECT id, email, name, company, tenant_id,
                subscription_tier, subscription_status, submittals_used, submittals_limit,
                trial_ends_at, created_at, products_enabled
         FROM users WHERE id = ?`
      ).bind(user.userId).first();
      if (!userData) {
        return errorResponse("NOT_FOUND", "User not found");
      }
      // entitlements: what this account can use right now, as the platform
      // reports it (plan, trial window, product slugs incl. the guest floor),
      // and entitlements.access: offer / subscription / trial / none with the
      // end date, days left and the day-23 prompt (contract fc:payments).
      const access = await loadAccess(env2, userData);
      const entitlements = describeEntitlements(userData, Date.now(), access);
      const { products_enabled: _productsEnabled, ...publicUser } = userData;
      const headers = { "Content-Type": "application/json" };
      if (claim.cookie) headers["Set-Cookie"] = claim.cookie;
      return new Response(JSON.stringify({ user: publicUser, entitlements, ...(claim.claimed.length ? { claimed: claim.claimed } : {}) }), { status: 200, headers });
    } catch (error5) {
      return errorResponse("DATABASE_ERROR", "Failed to fetch user: " + error5.message);
    }
  });

  router.post("/api/auth/ephemeral", async (request2, env2) => {
    try {
      const ip = request2.headers.get("CF-Connecting-IP") || "unknown";
      const rl = await checkRateLimit(ip, "ephemeral-create", env2, { requests: 10, windowSeconds: 60 });
      if (rl.limited) {
        return new Response(JSON.stringify({ error: "Too many requests - please slow down." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) }
        });
      }
      const body = await request2.json().catch(() => ({}));
      const resp = await fetch("https://authfor.com/api/v1/ephemeral/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureName: "weylandai.com",
          displayName: typeof body.displayName === "string" ? body.displayName : undefined
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return jsonResponse3({ error: data.error || "ephemeral_create_failed" }, resp.status);
      }
      return jsonResponse3({ token: data.token, session: data.session });
    } catch (err) {
      return jsonResponse3({ error: "Ephemeral session creation failed: " + err.message }, 500);
    }
  });

  router.post("/api/auth/ephemeral/upgrade", async (request2, env2) => {
    try {
      const ip = request2.headers.get("CF-Connecting-IP") || "unknown";
      const rl = await checkRateLimit(ip, "ephemeral-upgrade", env2, { requests: 10, windowSeconds: 60 });
      if (rl.limited) {
        return new Response(JSON.stringify({ error: "Too many requests - please slow down." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) }
        });
      }
      const body = await request2.json().catch(() => ({}));
      const { token, email, password, name, email_code } = body;
      if (!token || !email || !password) {
        return jsonResponse3({ error: "token, email, and password are required" }, 400);
      }
      const resp = await fetch("https://authfor.com/api/v1/ephemeral/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, name, ...(email_code ? { email_code } : {}) })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return jsonResponse3({ error: data.error || "ephemeral_upgrade_failed" }, resp.status);
      }
      return jsonResponse3(data, resp.status);
    } catch (err) {
      return jsonResponse3({ error: "Ephemeral upgrade failed: " + err.message }, 500);
    }
  });
}
