import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsQueueRoutes(router, { authenticate }) {
  router.get("/api/cps/queue", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const result = await env2.DB.prepare(`
        SELECT aq.*,
               pm.model, pm.confidence, pm.page_start, pm.page_end,
               c.manufacturer, c.title as catalogue_name
        FROM affirmation_queue aq
        JOIN product_mappings pm ON aq.mapping_id = pm.mapping_id
        JOIN catalogues c ON pm.catalogue_id = c.catalogue_id
        WHERE aq.status = 'pending'
        ORDER BY aq.created_at ASC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();
      const countResult = await env2.DB.prepare("SELECT COUNT(*) as total FROM affirmation_queue").first();
      return jsonResponse3({
        queue: result.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get affirmation queue: " + err.message }, 500);
    }
  });
  router.get("/api/cps/extractions/:catalogueId/:cacheKey", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { catalogueId, cacheKey } = request2.params;
      const cacheKeyFull = `cps:extraction:${catalogueId}:${cacheKey}`;
      const cached = await env2.CACHE?.get(cacheKeyFull, "json");
      if (cached) {
        return jsonResponse3({
          source: "cache",
          catalogue_id: catalogueId,
          cache_key: cacheKey,
          data: cached
        });
      }
      const extraction = await env2.DB.prepare(`
        SELECT * FROM extraction_cache
        WHERE catalogue_id = ? AND cache_key = ?
      `).bind(catalogueId, cacheKey).first();
      if (!extraction) {
        return jsonResponse3({ error: "Extraction not found" }, 404);
      }
      return jsonResponse3({
        source: "database",
        catalogue_id: catalogueId,
        cache_key: cacheKey,
        output_path: extraction.output_path,
        pages: extraction.pages,
        format: extraction.format,
        dpi: extraction.dpi,
        created_at: extraction.created_at
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get extraction: " + err.message }, 500);
    }
  });
}
