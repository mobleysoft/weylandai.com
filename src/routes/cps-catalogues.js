import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsCataloguesRoutes(router, { authenticate }) {
  router.get("/api/cps/catalogues", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const manufacturer = url.searchParams.get("manufacturer");
      let query = `
        SELECT c.*,
               (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = c.catalogue_id) as page_count,
               (SELECT COUNT(*) FROM product_mappings WHERE catalogue_id = c.catalogue_id) as mapping_count
        FROM catalogues c
        WHERE 1=1
      `;
      const params = [];
      if (manufacturer) {
        query += " AND c.manufacturer LIKE ?";
        params.push(`%${manufacturer}%`);
      }
      query += " ORDER BY c.ingested_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = await env2.DB.prepare(query).bind(...params).all();
      const countResult = await env2.DB.prepare("SELECT COUNT(*) as total FROM catalogues").first();
      return jsonResponse3({
        catalogues: result.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to list catalogues: " + err.message }, 500);
    }
  });
  router.get("/api/cps/catalogues/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const catalogueId = request2.params.id;
      const catalogue = await env2.DB.prepare(`
        SELECT * FROM catalogues WHERE catalogue_id = ?
      `).bind(catalogueId).first();
      if (!catalogue) {
        return jsonResponse3({ error: "Catalogue not found" }, 404);
      }
      const pages = await env2.DB.prepare(`
        SELECT catalogue_id, page_num, text_content IS NOT NULL as has_text, char_count
        FROM catalogue_pages
        WHERE catalogue_id = ?
        ORDER BY page_num
      `).bind(catalogueId).all();
      const mappingStats = await env2.DB.prepare(`
        SELECT CASE WHEN affirmed = 1 THEN 'affirmed' ELSE 'pending' END as status, COUNT(*) as count
        FROM product_mappings
        WHERE catalogue_id = ?
        GROUP BY affirmed
      `).bind(catalogueId).all();
      return jsonResponse3({
        ...catalogue,
        pages: pages.results || [],
        mapping_stats: mappingStats.results || []
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get catalogue: " + err.message }, 500);
    }
  });
  router.post("/api/cps/catalogues", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { manufacturer, title: title2, source_filename, version: version3, storage_path, page_count, file_size_bytes, source_hash } = body;
      if (!manufacturer || !title2) {
        return jsonResponse3({ error: "manufacturer and title are required" }, 400);
      }
      const catalogueId = source_hash ? source_hash.substring(0, 16) : crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes,
                                page_count, manufacturer, title, version, ingested_at, ingested_by, storage_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        catalogueId,
        source_filename || null,
        source_hash || null,
        file_size_bytes || 0,
        page_count || 0,
        manufacturer,
        title2,
        version3 || null,
        now,
        user.userId || user.id,
        storage_path || null
      ).run();
      return jsonResponse3({ catalogue_id: catalogueId, message: "Catalogue created successfully" }, 201);
    } catch (err) {
      if (err.message?.includes("UNIQUE constraint")) {
        return jsonResponse3({ error: "Catalogue with this ID already exists" }, 409);
      }
      return jsonResponse3({ error: "Failed to create catalogue: " + err.message }, 500);
    }
  });
  router.post("/api/cps/catalogues/:id/pages", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const catalogueId = request2.params.id;
      const body = await request2.json();
      const { pages } = body;
      if (!Array.isArray(pages) || pages.length === 0) {
        return jsonResponse3({ error: "pages array is required" }, 400);
      }
      const catalogue = await env2.DB.prepare("SELECT catalogue_id FROM catalogues WHERE catalogue_id = ?").bind(catalogueId).first();
      if (!catalogue) {
        return jsonResponse3({ error: "Catalogue not found" }, 404);
      }
      let inserted = 0;
      let skipped = 0;
      const batchSize = 50;
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        const stmt = env2.DB.prepare(`
          INSERT OR IGNORE INTO catalogue_pages
          (catalogue_id, page_num, text_content, char_count, has_extractable_text, header_text, footer_text)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const results = await env2.DB.batch(
          batch.map((p) => stmt.bind(
            catalogueId,
            p.page_num,
            p.text_content || "",
            p.char_count || (p.text_content?.length || 0),
            p.has_extractable_text ?? 1,
            p.header_text || null,
            p.footer_text || null
          ))
        );
        results.forEach((r) => {
          if (r.meta?.changes > 0)
            inserted++;
          else
            skipped++;
        });
      }
      return jsonResponse3({
        message: "Pages uploaded successfully",
        catalogue_id: catalogueId,
        inserted,
        skipped,
        total: pages.length
      }, 201);
    } catch (err) {
      return jsonResponse3({ error: "Failed to upload pages: " + err.message }, 500);
    }
  });
}
