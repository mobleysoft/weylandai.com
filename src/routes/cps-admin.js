import { jsonResponse3 } from "../lib/json-response.js";

function normalizeSearchText(text) {
  if (!text)
    return "";
  let normalized = text.toLowerCase();
  normalized = normalized.replace(
    /\b(l)\/(lv)(\d{4})\b/gi,
    (match, l, lv, num) => `${l} ${lv} ${l}${num} ${lv}${num} ${num}`
  );
  normalized = normalized.replace(/(\w+)\/(\w+)/g, "$1 $2");
  normalized = normalized.replace(
    /\b(\d+)([a-z]+)\b/gi,
    (match, nums, letters) => `${match} ${nums} ${letters}`
  );
  normalized = normalized.replace(
    /\b([a-z]+)(\d+)\b/gi,
    (match, letters, nums) => `${match} ${letters} ${nums}`
  );
  normalized = normalized.replace(/[^\w\s]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsAdminRoutes(router, { authenticate }) {
  router.post("/api/cps/admin/normalize-search-text", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json().catch(() => ({}));
      const batchSize = Math.min(parseInt(body.batch_size) || 100, 500);
      const dryRun = body.dry_run === true;
      const pagesResult = await env2.DB.prepare(`
        SELECT catalogue_id, page_num, text_content
        FROM catalogue_pages
        WHERE search_text IS NULL AND text_content IS NOT NULL
        LIMIT ?
      `).bind(batchSize).all();
      const pages = pagesResult.results || [];
      const total = pages.length;
      if (total === 0) {
        return jsonResponse3({
          message: "All pages already normalized",
          updated: 0,
          total: 0
        });
      }
      const normalizedSamples = [];
      let updated = 0;
      for (const page of pages) {
        const searchText = normalizeSearchText(page.text_content);
        if (normalizedSamples.length < 3) {
          normalizedSamples.push({
            catalogue_id: page.catalogue_id,
            page_num: page.page_num,
            original_snippet: page.text_content?.substring(0, 200) || "",
            normalized_snippet: searchText.substring(0, 200)
          });
        }
        if (!dryRun) {
          await env2.DB.prepare(`
            UPDATE catalogue_pages
            SET search_text = ?
            WHERE catalogue_id = ? AND page_num = ?
          `).bind(searchText, page.catalogue_id, page.page_num).run();
          updated++;
        }
      }
      const remainingResult = await env2.DB.prepare(`
        SELECT COUNT(*) as remaining
        FROM catalogue_pages
        WHERE search_text IS NULL AND text_content IS NOT NULL
      `).first();
      return jsonResponse3({
        message: dryRun ? "Dry run complete (no changes made)" : "Normalization batch complete",
        updated: dryRun ? 0 : updated,
        total,
        remaining: remainingResult?.remaining || 0,
        batch_size: batchSize,
        samples: normalizedSamples
      });
    } catch (err) {
      return jsonResponse3({ error: "Normalization failed: " + err.message }, 500);
    }
  });
  router.get("/api/cps/admin/normalization-status", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const statsResult = await env2.DB.prepare(`
        SELECT
          COUNT(*) as total_pages,
          COUNT(search_text) as normalized_pages,
          COUNT(*) - COUNT(search_text) as pending_pages
        FROM catalogue_pages
        WHERE text_content IS NOT NULL
      `).first();
      const ftsResult = await env2.DB.prepare(`
        SELECT COUNT(*) as fts_rows FROM catalogue_trigram_fts
      `).first().catch(() => ({ fts_rows: 0 }));
      const sampleResult = await env2.DB.prepare(`
        SELECT catalogue_id, page_num, substr(text_content, 1, 100) as original, substr(search_text, 1, 100) as normalized
        FROM catalogue_pages
        WHERE text_content LIKE '%L/LV%' AND search_text IS NOT NULL
        LIMIT 3
      `).all();
      return jsonResponse3({
        status: statsResult?.pending_pages === 0 ? "complete" : "in_progress",
        total_pages: statsResult?.total_pages || 0,
        normalized_pages: statsResult?.normalized_pages || 0,
        pending_pages: statsResult?.pending_pages || 0,
        fts_rows: ftsResult?.fts_rows || 0,
        completion_pct: statsResult?.total_pages ? Math.round(statsResult.normalized_pages / statsResult.total_pages * 100) : 0,
        samples: sampleResult?.results || []
      });
    } catch (err) {
      return jsonResponse3({ error: "Status check failed: " + err.message }, 500);
    }
  });
}
