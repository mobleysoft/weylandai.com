// src/routes/access-requests.js
//
// The request-access queue: the courteous deny path for closed registration
// plus the trade demand signal.
//
//   POST /api/access/request                  public, rate-limited, upsert by (email, venture)
//   GET  /api/access/requests?status=&email=  operator
//   GET  /api/access/rollup                   operator - demand by trade, one call
//   POST /api/access/requests/:id/approve     operator + X-Operator-Token -> identity-provider
//                                             invite (provisions the account AND sends the email)
//   POST /api/access/requests/:id/deny        operator
//
// Ported 2026-09-09 from the weyland.onamerica.org prototype (WS6 S4,
// WO-2026-0831-WEYLAND-WS6-COMMERCE-001 F2/F2b, CAPT D1 2026-08-31: "request-
// access queue (human approves, system sends the email) + capture TRADE").
// Storage: access_requests on this venture's D1 (migrations/20260909_access_
// requests.sql) - pre-identity and venture-scoped. Table absent -> 503,
// never 500.
//
// Two seams are injected rather than imported, following the explicit-
// dependency-injection pattern src/routes/document-generators.js and
// src/routes/projects.js established - and, more importantly, because both
// seams are exactly where the prototype and this codebase legitimately
// differ:
//   requireOperator(request, env) -> Response | null
//       Who may read/approve/deny the queue. The prototype gates on
//       X-Fleet-Key against env.FLEET_API_KEY; the caller decides what an
//       operator is here.
//   invite(env, { email, name, role, operatorToken }) -> { ok, status, data }
//       The identity provider's invite. The prototype calls its fleet auth
//       worker; in this codebase identity is AuthFor's job (see
//       WEYLAND_SUCCESSOR_ARCHITECTURE.md), so the caller wires the AuthFor
//       call. This module never names a provider - that is the point.
//   rateLimiter(key) -> boolean and hashIp(ip) -> string are injectable for
//       tests; production wiring passes the defaults.
//
// Verified by src/routes/access-requests.test.mjs (node --test).

import { jsonResponse3 } from "../lib/json-response.js";
import { validateAccessRequest, makeRateLimiter } from "../lib/access-request.js";

const NO_SUCH_TABLE = /no such table/i;
const ACCESS_REQUEST_COLUMNS =
  "id, email, name, company, role, trade, trade_other, message, source, venture_code, status, " +
  "approved_by, approved_at, invited_mhs_id, created_at, updated_at";

function tableMissing(e) { return NO_SUCH_TABLE.test((e && e.message) || ""); }
function notProvisioned() {
  return jsonResponse3({ success: false, error: { code: "ACCESS_QUEUE_NOT_PROVISIONED",
    message: "Request-access queue is not provisioned on this edition (migration 20260909_access_requests)." } }, 503);
}

async function sha256Hex16(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function idFromRequest(request, params) {
  return (params && params.id) || new URL(request.url).pathname.split("/")[4];
}

/**
 * Registers the five access-queue routes on the shared router.
 *
 * @param {object} router - the app's NativeRouter instance.
 * @param {object} deps
 * @param {Function} deps.requireOperator - (request, env) -> Response|null
 * @param {Function} deps.invite - (env, {email,name,role,operatorToken}) -> {ok,status,data}
 * @param {string} [deps.ventureCode="weyland"] - venture scope for every row.
 * @param {Function} [deps.rateLimiter] - (key) -> boolean; default 5/min per key.
 * @param {Function} [deps.hashIp] - (ip) -> string; default sha256 prefix.
 */
export function registerAccessRequestRoutes(router, {
  requireOperator,
  invite,
  ventureCode = "weyland",
  rateLimiter = makeRateLimiter({ limit: 5, windowMs: 60000 }),
  hashIp = sha256Hex16,
}) {
  if (typeof requireOperator !== "function" || typeof invite !== "function") {
    throw new TypeError("registerAccessRequestRoutes: requireOperator and invite must be injected");
  }

  /** POST /api/access/request - public. */
  router.post("/api/access/request", async (request2, env2) => {
    const body = await request2.json().catch(() => null);
    const v = validateAccessRequest(body);
    if (!v.ok) {
      return jsonResponse3({ success: false, error: { code: "VALIDATION_ERROR",
        message: "Please check the highlighted fields.", fields: v.errors } }, 400);
    }
    const ip = request2.headers.get("CF-Connecting-IP") || request2.headers.get("X-Forwarded-For") || "";
    const ipHash = await hashIp(ip);
    if (!rateLimiter(`${v.value.email}|${ipHash}`)) {
      return jsonResponse3({ success: false, error: { code: "RATE_LIMITED",
        message: "Too many requests — please try again in a minute." } }, 429);
    }
    const id = "areq_" + crypto.randomUUID();
    const source = (body && typeof body.source === "string" ? body.source : "portal").slice(0, 40);
    try {
      await env2.DB.prepare(
        `INSERT INTO access_requests (id, email, name, company, role, trade, trade_other, message, source, venture_code, request_ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email, venture_code) DO UPDATE SET
           name = COALESCE(excluded.name, access_requests.name),
           company = COALESCE(excluded.company, access_requests.company),
           role = COALESCE(excluded.role, access_requests.role),
           trade = excluded.trade,
           trade_other = excluded.trade_other,
           message = COALESCE(excluded.message, access_requests.message),
           source = excluded.source,
           request_ip_hash = excluded.request_ip_hash,
           updated_at = datetime('now')`
      ).bind(id, v.value.email, v.value.name, v.value.company, v.value.role, v.value.trade,
             v.value.trade_other, v.value.message, source, ventureCode, ipHash).run();
      const row = await env2.DB.prepare("SELECT id, status FROM access_requests WHERE email = ? AND venture_code = ?")
        .bind(v.value.email, ventureCode).first();
      return jsonResponse3({ ok: true, id: row.id, status: row.status,
        message: row.status === "approved"
          ? "You already have access — sign in with your email."
          : "Request received — we'll be in touch." });
    } catch (e) {
      if (tableMissing(e)) return notProvisioned();
      console.error("[Access] request failed:", e.message);
      return jsonResponse3({ success: false, error: { code: "INTERNAL_ERROR", message: "Could not record the request." } }, 500);
    }
  });

  /** GET /api/access/requests?status=requested&email= - operator list, newest first. */
  router.get("/api/access/requests", async (request2, env2) => {
    const denied = await requireOperator(request2, env2);
    if (denied) return denied;
    const url = new URL(request2.url);
    const status = url.searchParams.get("status");
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const where = ["venture_code = ?"]; const binds = [ventureCode];
    if (status) { where.push("status = ?"); binds.push(status); }
    if (email) { where.push("email = ?"); binds.push(email); }
    try {
      const rs = await env2.DB.prepare(
        `SELECT ${ACCESS_REQUEST_COLUMNS} FROM access_requests WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 200`
      ).bind(...binds).all();
      return jsonResponse3({ requests: rs.results || [] });
    } catch (e) {
      if (tableMissing(e)) return notProvisioned();
      return jsonResponse3({ success: false, error: { code: "DATABASE_ERROR", message: e.message } }, 500);
    }
  });

  /** GET /api/access/rollup - demand by trade. */
  router.get("/api/access/rollup", async (request2, env2) => {
    const denied = await requireOperator(request2, env2);
    if (denied) return denied;
    try {
      const rs = await env2.DB.prepare(
        `SELECT trade, COUNT(*) AS count,
                SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) AS requested,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied
         FROM access_requests WHERE venture_code = ? GROUP BY trade ORDER BY count DESC`
      ).bind(ventureCode).all();
      const byTrade = rs.results || [];
      const others = await env2.DB.prepare(
        `SELECT trade_other, COUNT(*) AS count FROM access_requests
         WHERE venture_code = ? AND trade = 'other' AND trade_other IS NOT NULL
         GROUP BY trade_other ORDER BY count DESC LIMIT 50`
      ).bind(ventureCode).all();
      return jsonResponse3({ venture: ventureCode, total: byTrade.reduce((n, r) => n + (r.count || 0), 0),
        by_trade: byTrade, other_trades: others.results || [] });
    } catch (e) {
      if (tableMissing(e)) return notProvisioned();
      return jsonResponse3({ success: false, error: { code: "DATABASE_ERROR", message: e.message } }, 500);
    }
  });

  /**
   * POST /api/access/requests/:id/approve  { approved_by, role? }
   * Headers: X-Operator-Token (the approving human's own identity token - the
   * identity provider authorizes the invite against THAT identity, so a human
   * is in the loop by construction). Idempotent: already approved -> already:true.
   */
  router.post("/api/access/requests/:id/approve", async (request2, env2, ctx, params) => {
    const denied = await requireOperator(request2, env2);
    if (denied) return denied;
    const id = idFromRequest(request2, params);
    const body = await request2.json().catch(() => ({}));
    const approvedBy = typeof body.approved_by === "string" ? body.approved_by.trim().slice(0, 254) : "";
    const operatorToken = request2.headers.get("X-Operator-Token") || "";
    if (!approvedBy) return jsonResponse3({ success: false, error: { code: "VALIDATION_ERROR", message: "approved_by required" } }, 400);
    try {
      const row = await env2.DB.prepare(`SELECT ${ACCESS_REQUEST_COLUMNS} FROM access_requests WHERE id = ? AND venture_code = ?`)
        .bind(id, ventureCode).first();
      if (!row) return jsonResponse3({ success: false, error: { code: "NOT_FOUND", message: "No such request" } }, 404);
      if (row.status === "approved") {
        return jsonResponse3({ ok: true, already: true, status: "approved", id: row.id, invited_mhs_id: row.invited_mhs_id });
      }
      if (!operatorToken) {
        return jsonResponse3({ success: false, error: { code: "VALIDATION_ERROR",
          message: "X-Operator-Token (the approving operator's identity token) required" } }, 400);
      }
      const result = await invite(env2, { email: row.email, name: row.name, role: body.role || "member", operatorToken });
      if (!result || !result.ok) {
        const data = (result && result.data) || {};
        console.warn("[Access] invite failed:", result && result.status, JSON.stringify(data).slice(0, 200));
        return jsonResponse3({ success: false, error: { code: "INVITE_FAILED",
          message: data.error || `identity invite failed (${result && result.status})`, auth_status: result && result.status } }, 502);
      }
      await env2.DB.prepare(
        "UPDATE access_requests SET status = 'approved', approved_by = ?, approved_at = datetime('now'), invited_mhs_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(approvedBy, result.data.mhs_id || null, id).run();
      return jsonResponse3({ ok: true, status: "approved", id,
        invite: { ok: true, mhs_id: result.data.mhs_id, email_sent: !!result.data.email_sent, already_member: !!result.data.already_member } });
    } catch (e) {
      if (tableMissing(e)) return notProvisioned();
      console.error("[Access] approve failed:", e.message);
      return jsonResponse3({ success: false, error: { code: "INTERNAL_ERROR", message: "Approve failed: " + e.message } }, 500);
    }
  });

  /** POST /api/access/requests/:id/deny  { approved_by } */
  router.post("/api/access/requests/:id/deny", async (request2, env2, ctx, params) => {
    const denied = await requireOperator(request2, env2);
    if (denied) return denied;
    const id = idFromRequest(request2, params);
    const body = await request2.json().catch(() => ({}));
    const approvedBy = typeof body.approved_by === "string" ? body.approved_by.trim().slice(0, 254) : "";
    if (!approvedBy) return jsonResponse3({ success: false, error: { code: "VALIDATION_ERROR", message: "approved_by required" } }, 400);
    try {
      const r = await env2.DB.prepare(
        "UPDATE access_requests SET status = 'denied', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND venture_code = ?"
      ).bind(approvedBy, id, ventureCode).run();
      if (!r.meta || !r.meta.changes) return jsonResponse3({ success: false, error: { code: "NOT_FOUND", message: "No such request" } }, 404);
      return jsonResponse3({ ok: true, status: "denied", id });
    } catch (e) {
      if (tableMissing(e)) return notProvisioned();
      return jsonResponse3({ success: false, error: { code: "DATABASE_ERROR", message: e.message } }, 500);
    }
  });
}
