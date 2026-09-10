import { jsonResponse3 } from "../lib/json-response.js";

var EXTRACTION_ROUTE_VALID = /* @__PURE__ */ new Set([
  "api_direct",
  // Weyland Managed API (MHS Anthropic account, metered)
  "claude_code_local"
  // Your Claude Code via SABP bridge (subscription-funded)
  // Future: 'openai_codex', 'gemini', 'openconfig'
]);

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerSessionsExtractionRouteRoutes(router, { authenticate }) {
  router.get("/api/sessions/:sessionId/extraction-route", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    const row = await env2.DB.prepare(
      `SELECT extraction_route, extraction_route_affirmed_at, extraction_route_affirmed_by
       FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?`
    ).bind(sessionId, user.userId).first();
    if (!row)
      return jsonResponse3({ error: "session_not_found" }, 404);
    return jsonResponse3({
      session_id: sessionId,
      route: row.extraction_route || null,
      affirmed_at: row.extraction_route_affirmed_at || null,
      affirmed_by: row.extraction_route_affirmed_by || null
    });
  });
  router.post("/api/sessions/:sessionId/extraction-route", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ error: "invalid_json" }, 400);
    }
    const route = typeof body?.route === "string" ? body.route.trim() : "";
    if (!EXTRACTION_ROUTE_VALID.has(route)) {
      return jsonResponse3({
        error: "invalid_route",
        valid_routes: Array.from(EXTRACTION_ROUTE_VALID)
      }, 400);
    }
    const sess = await env2.DB.prepare(
      `SELECT id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?`
    ).bind(sessionId, user.userId).first();
    if (!sess)
      return jsonResponse3({ error: "session_not_found" }, 404);
    const affirmedAt = (/* @__PURE__ */ new Date()).toISOString();
    const affirmedBy = user.email || user.mhsId || user.userId || "unknown";
    await env2.DB.prepare(
      `UPDATE hardware_extraction_sessions
       SET extraction_route = ?, extraction_route_affirmed_at = ?, extraction_route_affirmed_by = ?
       WHERE id = ?`
    ).bind(route, affirmedAt, affirmedBy, sessionId).run();
    return jsonResponse3({
      ok: true,
      session_id: sessionId,
      route,
      affirmed_at: affirmedAt,
      affirmed_by: affirmedBy,
      remember_requested: !!body?.remember
    });
  });
}
