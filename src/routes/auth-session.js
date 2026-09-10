import { jsonResponse3 } from "../lib/json-response.js";
import { generateJWT, hashPassword } from "../auth-module.js";

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
      return new Response(JSON.stringify({ ok: true, node, session_id: sessionId, expires_at: expiresAt }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
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
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString();
        await env2.DB.prepare(
          `INSERT INTO users (id, email, password_hash, name, company, tenant_id,
            subscription_tier, subscription_status, submittals_used, submittals_limit,
            trial_ends_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          userId,
          email,
          "AUTHFOR_SSO",
          name,
          sanitizedCompany,
          tenantId,
          "starter",
          "trial",
          0,
          10,
          trialEndsAt,
          (/* @__PURE__ */ new Date()).toISOString()
        ).run();
        user = {
          id: userId,
          email,
          name,
          company: sanitizedCompany,
          tenant_id: tenantId,
          subscription_tier: "starter",
          subscription_status: "trial",
          trial_ends_at: trialEndsAt
        };
      }
      const token = await generateJWT({
        userId: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        name: user.name,
        company: user.company
      }, env2.JWT_SECRET);
      return jsonResponse3({
        token,
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
      });
    } catch (error4) {
      return jsonResponse3({ error: "Token exchange failed: " + error4.message }, 500);
    }
  });
  router.get("/api/auth/me", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const userData = await env2.DB.prepare(
        `SELECT id, email, name, company, tenant_id,
                subscription_tier, subscription_status, submittals_used, submittals_limit,
                trial_ends_at, created_at
         FROM users WHERE id = ?`
      ).bind(user.userId).first();
      if (!userData) {
        return errorResponse("NOT_FOUND", "User not found");
      }
      return jsonResponse3({ user: userData });
    } catch (error5) {
      return errorResponse("DATABASE_ERROR", "Failed to fetch user: " + error5.message);
    }
  });
}
