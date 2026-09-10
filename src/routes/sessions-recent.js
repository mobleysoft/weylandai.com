import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerSessionsRecentRoutes(router, { authenticate }) {
  router.get("/api/sessions/recent", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 50);
      const userId = user.userId || user.id;
      console.log("[Sessions] Fetching recent sessions for user:", userId);
      const result = await env2.DB.prepare(`
        SELECT
          s.id,
          s.project_name,
          s.filename,
          s.total_pages,
          s.pages_processed,
          s.pages_approved,
          s.status,
          s.total_sets_extracted,
          s.total_components_extracted,
          s.project_id,
          s.created_at,
          s.updated_at,
          (SELECT COUNT(*) FROM hardware_page_extractions WHERE session_id = s.id) as extracted_count
        FROM hardware_extraction_sessions s
        WHERE s.user_id = ?
        ORDER BY s.updated_at DESC
        LIMIT ?
      `).bind(userId, limit).all();
      return jsonResponse3({
        success: true,
        count: result.results.length,
        sessions: result.results.map((s) => ({
          ...s,
          progress_percent: s.total_pages > 0 ? Math.round(s.pages_processed / s.total_pages * 100) : 0
        }))
      }, 200);
    } catch (error5) {
      console.error("[Sessions] Recent query failed:", error5);
      return jsonResponse3({ error: "Failed to retrieve recent sessions", details: error5.message }, 500);
    }
  });
}
