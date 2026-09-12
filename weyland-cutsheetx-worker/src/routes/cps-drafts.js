import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsDraftsRoutes(router, { authenticate }) {
  router.put("/api/cps/drafts", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { component_id, selected_pages, preview_state } = await request2.json();
      const userId = user.userId || user.id;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
      if (!component_id) {
        return jsonResponse3({ error: "component_id is required" }, 400);
      }
      if (!selected_pages || !Array.isArray(selected_pages)) {
        return jsonResponse3({ error: "selected_pages must be an array" }, 400);
      }
      console.log(`[CPS Draft] Upserting draft: user=${userId}, component=${component_id}, pages=${selected_pages.length}`);
      await env2.DB.prepare(`
        INSERT INTO cps_draft_selections (id, user_id, component_id, selected_pages, preview_state, created_at, updated_at, expires_at)
        VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, component_id) DO UPDATE SET
          selected_pages = excluded.selected_pages,
          preview_state = excluded.preview_state,
          updated_at = excluded.updated_at,
          expires_at = excluded.expires_at
      `).bind(
        userId,
        component_id,
        JSON.stringify(selected_pages),
        preview_state ? JSON.stringify(preview_state) : null,
        now,
        now,
        expires
      ).run();
      return jsonResponse3({
        success: true,
        component_id,
        updated_at: now,
        expires_at: expires,
        page_count: selected_pages.length
      });
    } catch (err) {
      console.error("[CPS Draft] Upsert error:", err);
      return jsonResponse3({ error: "Failed to save draft: " + err.message }, 500);
    }
  });
  router.get("/api/cps/drafts/:componentId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const componentId = request2.params.componentId;
      const userId = user.userId || user.id;
      console.log(`[CPS Draft] Fetching draft: user=${userId}, component=${componentId}`);
      const draft = await env2.DB.prepare(`
        SELECT id, component_id, selected_pages, preview_state, updated_at, expires_at
        FROM cps_draft_selections
        WHERE user_id = ? AND component_id = ?
      `).bind(userId, componentId).first();
      if (!draft) {
        return jsonResponse3({ found: false, component_id: componentId });
      }
      if (draft.expires_at && new Date(draft.expires_at) < /* @__PURE__ */ new Date()) {
        await env2.DB.prepare(`
          DELETE FROM cps_draft_selections WHERE id = ?
        `).bind(draft.id).run();
        console.log(`[CPS Draft] Deleted expired draft: ${draft.id}`);
        return jsonResponse3({ found: false, component_id: componentId, reason: "expired" });
      }
      console.log(`[CPS Draft] Found draft with ${JSON.parse(draft.selected_pages || "[]").length} pages`);
      return jsonResponse3({
        found: true,
        id: draft.id,
        component_id: draft.component_id,
        selected_pages: draft.selected_pages,
        preview_state: draft.preview_state,
        updated_at: draft.updated_at,
        expires_at: draft.expires_at
      });
    } catch (err) {
      console.error("[CPS Draft] Fetch error:", err);
      return jsonResponse3({ error: "Failed to fetch draft: " + err.message }, 500);
    }
  });
  router.delete("/api/cps/drafts/:componentId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const componentId = request2.params.componentId;
      const userId = user.userId || user.id;
      console.log(`[CPS Draft] Deleting draft: user=${userId}, component=${componentId}`);
      const result = await env2.DB.prepare(`
        DELETE FROM cps_draft_selections
        WHERE user_id = ? AND component_id = ?
      `).bind(userId, componentId).run();
      return jsonResponse3({
        success: true,
        component_id: componentId,
        deleted: result.meta?.changes > 0
      });
    } catch (err) {
      console.error("[CPS Draft] Delete error:", err);
      return jsonResponse3({ error: "Failed to delete draft: " + err.message }, 500);
    }
  });
  router.get("/api/cps/drafts", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const userId = user.userId || user.id;
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const drafts = await env2.DB.prepare(`
        SELECT id, component_id, selected_pages, updated_at, expires_at
        FROM cps_draft_selections
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY updated_at DESC
        LIMIT ?
      `).bind(userId, limit).all();
      return jsonResponse3({
        drafts: (drafts.results || []).map((d) => ({
          id: d.id,
          component_id: d.component_id,
          page_count: JSON.parse(d.selected_pages || "[]").length,
          updated_at: d.updated_at,
          expires_at: d.expires_at
        })),
        total: drafts.results?.length || 0
      });
    } catch (err) {
      console.error("[CPS Draft] List error:", err);
      return jsonResponse3({ error: "Failed to list drafts: " + err.message }, 500);
    }
  });
}
