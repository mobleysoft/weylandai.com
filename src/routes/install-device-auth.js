import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Route bodies below are unmodified from the original bundle except:
 * esbuild's cosmetic `__name(...)` call stripped (function .name is
 * already correct - see src/README.md for why other extracted modules
 * do the same).
 *
 * @param {object} router
 * @param {{ authenticate: Function, callEdge: Function }} deps
 */
export function registerInstallDeviceAuthRoutes(router, { authenticate, callEdge }) {
  function arrayBufferToHex(buf) {
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  router.post("/api/install/device-auth/init", async (request2, env2) => {
    let body = {};
    try {
      body = await request2.json();
    } catch {
    }
    const deviceCode = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(32)));
    const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const pickChar = () => ALPHA[crypto.getRandomValues(new Uint8Array(1))[0] % ALPHA.length];
    const userCode = `${pickChar()}${pickChar()}${pickChar()}${pickChar()}-${pickChar()}${pickChar()}${pickChar()}${pickChar()}`;
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 600 * 1e3);
    const ip = request2.headers.get("CF-Connecting-IP") || "";
    const ua = request2.headers.get("User-Agent") || "";
    await env2.DB.prepare(
      `INSERT INTO install_device_auth
       (device_code, user_code, mhs_id, hostname, agent_label, status,
        ip_at_init, ua_at_init, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    ).bind(
      deviceCode,
      userCode,
      body.mhs_id || null,
      body.hostname || null,
      body.agent_label || null,
      ip,
      ua,
      expiresAt.toISOString(),
      now.toISOString()
    ).run();
    const origin = new URL(request2.url).origin;
    return jsonResponse3({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${origin}/padinstall/confirm?code=${userCode}`,
      interval_seconds: 5,
      expires_in: 600
    }, 200);
  });
  router.get("/api/install/device-auth/poll", async (request2, env2) => {
    const url = new URL(request2.url);
    const deviceCode = url.searchParams.get("device_code");
    if (!deviceCode)
      return jsonResponse3({ error: "device_code required" }, 400);
    const row = await env2.DB.prepare(
      `SELECT status, bridge_token, expires_at, consumed_at FROM install_device_auth WHERE device_code = ?`
    ).bind(deviceCode).first();
    if (!row)
      return jsonResponse3({ status: "not_found" }, 404);
    if (row.status === "pending" && new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
      await env2.DB.prepare(
        `UPDATE install_device_auth SET status = 'expired' WHERE device_code = ? AND status = 'pending'`
      ).bind(deviceCode).run();
      return jsonResponse3({ status: "expired" });
    }
    if (row.status === "approved" && !row.consumed_at) {
      await env2.DB.prepare(
        `UPDATE install_device_auth SET consumed_at = ? WHERE device_code = ?`
      ).bind((/* @__PURE__ */ new Date()).toISOString(), deviceCode).run();
      return jsonResponse3({ status: "approved", bridge_token: row.bridge_token });
    }
    if (row.status === "approved" && row.consumed_at) {
      return jsonResponse3({ status: "consumed" });
    }
    return jsonResponse3({ status: row.status });
  });
  router.post("/api/install/device-auth/approve", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    if (!user.mhsId)
      return jsonResponse3({ error: "mhs_id required on session" }, 400);
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ error: "invalid_json" }, 400);
    }
    const userCode = (body.user_code || "").trim().toUpperCase();
    if (!userCode)
      return jsonResponse3({ error: "user_code required" }, 400);
    const row = await env2.DB.prepare(
      `SELECT device_code, status, expires_at FROM install_device_auth WHERE user_code = ?`
    ).bind(userCode).first();
    if (!row)
      return jsonResponse3({ error: "unknown_user_code" }, 404);
    if (row.status !== "pending")
      return jsonResponse3({ error: "not_pending", current_status: row.status }, 409);
    if (new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
      await env2.DB.prepare(`UPDATE install_device_auth SET status = 'expired' WHERE device_code = ?`).bind(row.device_code).run();
      return jsonResponse3({ error: "expired" }, 410);
    }
    const tokenRes = await callEdge("POST", "/ai/v1/bridge/token", env2, {
      owner_id: user.mhsId,
      owner_email: user.email,
      label: `Bridge for ${user.name || user.email} (${body.hostname || "unknown host"})`,
      reuse_existing: false
    });
    if (tokenRes.status !== 200 || !tokenRes.body.token) {
      return jsonResponse3({ error: "token_mint_failed", detail: tokenRes.body }, 502);
    }
    const ip = request2.headers.get("CF-Connecting-IP") || "";
    await env2.DB.prepare(
      `UPDATE install_device_auth
       SET status = 'approved', bridge_token = ?, mhs_id = ?, approved_by = ?, approved_at = ?, ip_at_approve = ?
       WHERE device_code = ?`
    ).bind(
      tokenRes.body.token,
      user.mhsId,
      user.email || user.mhsId,
      (/* @__PURE__ */ new Date()).toISOString(),
      ip,
      row.device_code
    ).run();
    return jsonResponse3({ ok: true, status: "approved", user_code: userCode });
  });
  router.post("/api/install/device-auth/deny", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ error: "invalid_json" }, 400);
    }
    const userCode = (body.user_code || "").trim().toUpperCase();
    if (!userCode)
      return jsonResponse3({ error: "user_code required" }, 400);
    const row = await env2.DB.prepare(
      `SELECT device_code, status FROM install_device_auth WHERE user_code = ?`
    ).bind(userCode).first();
    if (!row)
      return jsonResponse3({ error: "unknown_user_code" }, 404);
    if (row.status !== "pending")
      return jsonResponse3({ error: "not_pending", current_status: row.status }, 409);
    await env2.DB.prepare(
      `UPDATE install_device_auth SET status = 'denied' WHERE device_code = ?`
    ).bind(row.device_code).run();
    return jsonResponse3({ ok: true, status: "denied" });
  });
  router.get("/api/install/bundle.zip", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const baseKey = "install/padinstall-v1.0.0.zip";
    const baseZip = env2.UPLOADS ? await env2.UPLOADS.get(baseKey) : null;
    if (!baseZip) {
      return jsonResponse3({
        error: "bundle_pending",
        message: "Install bundle is not yet built. Phase 6 of CH-2026-0507-WEYLAND-001 will populate it.",
        bundle_version: "padinstall-v1.0.0"
      }, 503);
    }
    const installCtx = JSON.stringify({
      mhs_id: user.mhsId,
      email: user.email,
      edge_url: "https://hascom-edge.ron-helms.workers.dev",
      weyland_origin: "https://weyland.onamerica.org",
      bundle_version: "padinstall-v1.0.0",
      issued_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    return new Response(baseZip.body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="weyland-install-${user.mhsId}.zip"`,
        "Cache-Control": "no-store",
        "X-Surface": "external-jwt",
        "X-Install-Context-Hint": encodeURIComponent(installCtx)
      }
    });
  });
}
