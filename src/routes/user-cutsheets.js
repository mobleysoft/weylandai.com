import { jsonResponse3 } from "../lib/json-response.js";

function componentHash(manufacturer, model) {
  const mfr = (manufacturer || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const mdl = (model || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${mfr}_${mdl}`;
}

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerUserCutsheetsRoutes(router, { authenticate }) {
  router.get("/api/user/cutsheets/check", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const manufacturer = url.searchParams.get("manufacturer") || "";
      const model = url.searchParams.get("model") || "";
      if (!manufacturer && !model) {
        return jsonResponse3({ error: "manufacturer or model required" }, 400);
      }
      const userId = user.userId || user.id;
      const hash = componentHash(manufacturer, model);
      console.log(`[User Cache] Checking cache for user=${userId}, hash=${hash}`);
      const cached = await env2.DB.prepare(`
        SELECT id, r2_key, catalogue_id, page_start, page_end,
               manufacturer, model, affirmed_at, affirmed_by
        FROM user_affirmed_cutsheets
        WHERE user_id = ? AND component_hash = ?
      `).bind(userId, hash).first();
      if (cached) {
        console.log(`[User Cache] HIT: ${cached.r2_key}`);
        const imageUrl = `/api/user/cutsheets/${cached.id}/image`;
        return jsonResponse3({
          found: true,
          source: "user_cache",
          imageUrl,
          r2Key: cached.r2_key,
          catalogueId: cached.catalogue_id,
          pageStart: cached.page_start,
          pageEnd: cached.page_end,
          manufacturer: cached.manufacturer,
          model: cached.model,
          affirmedAt: cached.affirmed_at,
          affirmedBy: cached.affirmed_by
        });
      }
      console.log(`[User Cache] MISS: hash=${hash}`);
      return jsonResponse3({
        found: false,
        source: "user_cache",
        searchedHash: hash
      });
    } catch (err) {
      console.error("[User Cache] Check error:", err);
      return jsonResponse3({ error: "Cache check failed: " + err.message }, 500);
    }
  });
  router.get("/api/user/cutsheets/:id/image", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const userId = user.userId || user.id;
      const cutsheetId = request2.params.id;
      const record = await env2.DB.prepare(`
        SELECT r2_key, mime_type FROM user_affirmed_cutsheets
        WHERE id = ? AND user_id = ?
      `).bind(cutsheetId, userId).first();
      if (!record) {
        return jsonResponse3({ error: "Cutsheet not found or access denied" }, 404);
      }
      const r2Object = await env2.UPLOADS.get(record.r2_key);
      if (!r2Object) {
        console.error(`[User Cache] R2 object not found: ${record.r2_key}`);
        return jsonResponse3({ error: "Cached image not found in storage" }, 404);
      }
      const imageBytes = await r2Object.arrayBuffer();
      return new Response(imageBytes, {
        headers: {
          "Content-Type": record.mime_type || "image/png",
          "Cache-Control": "private, max-age=3600",
          "X-User-Cache": "hit"
        }
      });
    } catch (err) {
      console.error("[User Cache] Image serve error:", err);
      return jsonResponse3({ error: "Failed to serve image: " + err.message }, 500);
    }
  });
  router.post("/api/user/cutsheets", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const {
        manufacturer,
        model,
        catalogueId,
        pageStart,
        pageEnd,
        pngData,
        // Base64-encoded PNG (optional - if not provided, we'll render it)
        notes,
        trade
      } = body;
      if (!manufacturer && !model) {
        return jsonResponse3({ error: "manufacturer or model required" }, 400);
      }
      const userId = user.userId || user.id;
      const userEmail = user.email || "unknown";
      const hash = componentHash(manufacturer, model);
      const r2Key = `users/${userId}/affirmed/${hash}.png`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      console.log(`[User Cache] Storing cutsheet: user=${userId}, hash=${hash}`);
      let fileSize = 0;
      if (pngData) {
        const pngBuffer = Uint8Array.from(atob(pngData), (c) => c.charCodeAt(0));
        fileSize = pngBuffer.length;
        await env2.UPLOADS.put(r2Key, pngBuffer, {
          httpMetadata: { contentType: "image/png" },
          customMetadata: {
            userId,
            manufacturer,
            model,
            catalogueId: catalogueId || "",
            pageStart: String(pageStart || ""),
            affirmedAt: now
          }
        });
      } else if (catalogueId && pageStart) {
        const cacheKey = `catalogues/${catalogueId}/pages/page_${pageStart}.pdf`;
        const cachedPdf = await env2.UPLOADS.get(cacheKey);
        if (cachedPdf) {
          const pdfBytes = await cachedPdf.arrayBuffer();
          fileSize = pdfBytes.byteLength;
          const userR2Key = `users/${userId}/affirmed/${hash}.pdf`;
          await env2.UPLOADS.put(userR2Key, pdfBytes, {
            httpMetadata: { contentType: "application/pdf" },
            customMetadata: { userId, manufacturer, model, catalogueId, affirmedAt: now }
          });
        } else {
          console.log(`[User Cache] No cached page found, storing metadata only`);
        }
      }
      await env2.DB.prepare(`
        INSERT INTO user_affirmed_cutsheets
          (user_id, component_hash, manufacturer, model, catalogue_id, page_start, page_end,
           r2_key, file_size_bytes, trade, affirmed_at, affirmed_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, component_hash) DO UPDATE SET
          catalogue_id = excluded.catalogue_id,
          page_start = excluded.page_start,
          page_end = excluded.page_end,
          r2_key = excluded.r2_key,
          file_size_bytes = excluded.file_size_bytes,
          affirmed_at = excluded.affirmed_at,
          affirmed_by = excluded.affirmed_by,
          notes = excluded.notes
      `).bind(
        userId,
        hash,
        manufacturer,
        model,
        catalogueId || null,
        pageStart || null,
        pageEnd || null,
        r2Key,
        fileSize || null,
        trade || "doors",
        now,
        userEmail,
        notes || null
      ).run();
      console.log(`[User Cache] Stored successfully: ${r2Key}`);
      return jsonResponse3({
        success: true,
        message: "Cutsheet cached for user",
        id: hash,
        r2Key,
        componentHash: hash
      });
    } catch (err) {
      console.error("[User Cache] Store error:", err);
      return jsonResponse3({ error: "Failed to cache cutsheet: " + err.message }, 500);
    }
  });
  router.get("/api/user/cutsheets", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const trade = url.searchParams.get("trade");
      const userId = user.userId || user.id;
      let query = `
        SELECT id, component_hash, manufacturer, model, catalogue_id,
               page_start, page_end, r2_key, trade, affirmed_at, affirmed_by
        FROM user_affirmed_cutsheets
        WHERE user_id = ?
      `;
      const params = [userId];
      if (trade) {
        query += " AND trade = ?";
        params.push(trade);
      }
      query += " ORDER BY affirmed_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = await env2.DB.prepare(query).bind(...params).all();
      let countQuery = "SELECT COUNT(*) as total FROM user_affirmed_cutsheets WHERE user_id = ?";
      const countParams = [userId];
      if (trade) {
        countQuery += " AND trade = ?";
        countParams.push(trade);
      }
      const countResult = await env2.DB.prepare(countQuery).bind(...countParams).first();
      return jsonResponse3({
        cutsheets: result.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      console.error("[User Cache] List error:", err);
      return jsonResponse3({ error: "Failed to list cutsheets: " + err.message }, 500);
    }
  });
}
