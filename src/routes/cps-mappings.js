import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsMappingsRoutes(router, { authenticate }) {
  router.get("/api/cps/mappings", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const catalogueId = url.searchParams.get("catalogue_id");
      const status = url.searchParams.get("status");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      let query = `
        SELECT pm.*, c.manufacturer, c.title as catalogue_name
        FROM product_mappings pm
        JOIN catalogues c ON pm.catalogue_id = c.catalogue_id
        WHERE 1=1
      `;
      const params = [];
      if (catalogueId) {
        query += " AND pm.catalogue_id = ?";
        params.push(catalogueId);
      }
      if (status) {
        query += " AND pm.status = ?";
        params.push(status);
      }
      query += " ORDER BY pm.created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = await env2.DB.prepare(query).bind(...params).all();
      let countQuery = "SELECT COUNT(*) as total FROM product_mappings WHERE 1=1";
      const countParams = [];
      if (catalogueId) {
        countQuery += " AND catalogue_id = ?";
        countParams.push(catalogueId);
      }
      if (status) {
        countQuery += " AND status = ?";
        countParams.push(status);
      }
      const countResult = await env2.DB.prepare(countQuery).bind(...countParams).first();
      return jsonResponse3({
        mappings: result.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to list mappings: " + err.message }, 500);
    }
  });
  router.post("/api/cps/mappings", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const {
        catalogue_id,
        model,
        model_normalized,
        series,
        manufacturer,
        page_start,
        page_end,
        match_method,
        match_pattern,
        confidence
      } = body;
      if (!catalogue_id || !model) {
        return jsonResponse3({ error: "catalogue_id and model are required" }, 400);
      }
      const mappingId = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        INSERT INTO product_mappings (mapping_id, catalogue_id, model, model_normalized, series,
                                      manufacturer, page_start, page_end, match_method, match_pattern,
                                      confidence, affirmed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        mappingId,
        catalogue_id,
        model,
        model_normalized || model.toLowerCase().replace(/[^a-z0-9]/g, ""),
        series || null,
        manufacturer || null,
        page_start || null,
        page_end || null,
        match_method || "manual",
        match_pattern || null,
        confidence || null,
        now
      ).run();
      const AFFIRMATION_THRESHOLD = 0.85;
      if (!confidence || confidence < AFFIRMATION_THRESHOLD) {
        await env2.DB.prepare(`
          INSERT INTO affirmation_queue (queue_id, mapping_id, status, created_at)
          VALUES (?, ?, 'pending', ?)
        `).bind(crypto.randomUUID(), mappingId, now).run();
      }
      return jsonResponse3({ mapping_id: mappingId, message: "Mapping created successfully" }, 201);
    } catch (err) {
      return jsonResponse3({ error: "Failed to create mapping: " + err.message }, 500);
    }
  });
  router.put("/api/cps/mappings/:id/affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const mappingId = request2.params.id;
      const body = await request2.json().catch(() => ({}));
      const { catalogue_id, page_num, model, manufacturer, notes } = body;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const userId = user.userId || user.id;
      const existing = await env2.DB.prepare("SELECT * FROM product_mappings WHERE mapping_id = ?").bind(mappingId).first();
      if (existing) {
        await env2.DB.prepare(`
          UPDATE product_mappings
          SET affirmed = 1, affirmed_by = ?, affirmed_at = ?
          WHERE mapping_id = ?
        `).bind(userId, now, mappingId).run();
      } else {
        if (!catalogue_id || !model) {
          return jsonResponse3({ error: "catalogue_id and model required for new affirmation" }, 400);
        }
        await env2.DB.prepare(`
          INSERT INTO product_mappings (mapping_id, catalogue_id, model, model_normalized, manufacturer,
                                        page_start, page_end, affirmed, affirmed_by, affirmed_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).bind(
          mappingId,
          catalogue_id,
          model,
          model.toLowerCase().replace(/[^a-z0-9]/g, ""),
          manufacturer || null,
          page_num || null,
          page_num || null,
          userId,
          now,
          now
        ).run();
      }
      await env2.DB.prepare(`
        INSERT INTO affirmation_log (log_id, mapping_id, action, actor_id, actor_type, timestamp, notes)
        VALUES (?, ?, 'affirm', ?, 'user', ?, ?)
      `).bind(crypto.randomUUID(), mappingId, userId, now, notes || null).run();
      return jsonResponse3({ message: "Mapping affirmed successfully", mapping_id: mappingId, created: !existing });
    } catch (err) {
      return jsonResponse3({ error: "Failed to affirm mapping: " + err.message }, 500);
    }
  });
  router.put("/api/cps/mappings/:id/reject", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const mappingId = request2.params.id;
      const body = await request2.json().catch(() => ({}));
      const { notes, reason, component_id } = body;
      const userId = user.userId || user.id;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      console.log(`[CPS Reject] Rejecting mapping: ${mappingId} by ${userId}`);
      const existingMapping = await env2.DB.prepare(`
        SELECT mapping_id, affirmed FROM product_mappings WHERE mapping_id = ?
      `).bind(mappingId).first();
      if (existingMapping) {
        await env2.DB.prepare(`
          UPDATE product_mappings
          SET affirmed = 0, affirmed_by = ?, affirmed_at = ?
          WHERE mapping_id = ?
        `).bind(userId, now, mappingId).run();
      }
      const logId = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT INTO affirmation_log (log_id, mapping_id, action, actor_id, actor_type, timestamp, notes)
        VALUES (?, ?, 'rejected', ?, 'user', ?, ?)
      `).bind(
        logId,
        mappingId,
        userId,
        now,
        notes || reason || `Rejected by user${component_id ? " for component " + component_id : ""}`
      ).run();
      console.log(`[CPS Reject] Logged rejection: log_id=${logId}`);
      if (component_id) {
        await env2.DB.prepare(`
          DELETE FROM cps_draft_selections WHERE user_id = ? AND component_id = ?
        `).bind(userId, component_id).run();
      }
      return jsonResponse3({
        message: "Match rejected and logged",
        mapping_id: mappingId,
        log_id: logId,
        persisted: true,
        timestamp: now
      });
    } catch (err) {
      console.error("[CPS Reject] Error:", err);
      return jsonResponse3({ error: "Failed to process rejection: " + err.message }, 500);
    }
  });
  router.post("/api/cps/mappings/affirm-batch", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { component_id, component_index, group_number, session_id, pages, manufacturer, model, component_context } = body;
      const userId = user.userId || user.id;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      console.log(`[CPS Batch Affirm] Received fields: session_id=${session_id || "MISSING"}, group=${group_number}, comp_idx=${component_index}, context=${component_context ? "YES" : "NO"}, body_keys=${Object.keys(body).join(",")}`);
      if (!component_id) {
        return jsonResponse3({ error: "component_id is required" }, 400);
      }
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return jsonResponse3({ error: "pages array is required and must not be empty" }, 400);
      }
      if (pages.length > 30) {
        return jsonResponse3({ error: "Maximum 30 pages can be affirmed at once" }, 400);
      }
      console.log(`[CPS Batch Affirm] Processing ${pages.length} pages for component ${component_id}` + (session_id ? ` (session ${session_id}, group ${group_number}, idx ${component_index})` : ""));
      const results = [];
      const errors = [];
      for (const page of pages) {
        const catalogueId = page.catalogueId || page.catalogue_id;
        const pageNum = page.pageNum || page.page_num;
        if (!catalogueId || pageNum === void 0) {
          errors.push({ page, error: "Missing catalogueId or pageNum" });
          continue;
        }
        try {
          const mappingId = `map_${catalogueId}_p${pageNum}`;
          const existingMapping = await env2.DB.prepare(`
            SELECT mapping_id FROM product_mappings WHERE mapping_id = ?
          `).bind(mappingId).first();
          if (existingMapping) {
            await env2.DB.prepare(`
              UPDATE product_mappings
              SET affirmed = 1, affirmed_by = ?, affirmed_at = ?, match_method = 'user_batch_selection'
              WHERE mapping_id = ?
            `).bind(userId, now, mappingId).run();
          } else {
            const pageModel = page.model || page.title || model || `Page ${pageNum}`;
            const pageManufacturer = manufacturer || page.manufacturer || "";
            const normalizedModel = pageModel.toLowerCase().replace(/[^a-z0-9]/g, "");
            await env2.DB.prepare(`
              INSERT INTO product_mappings
                (mapping_id, catalogue_id, model, model_normalized, manufacturer, page_start, page_end,
                 match_method, confidence, affirmed, affirmed_by, affirmed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'user_batch_selection', 'high', 1, ?, ?, ?)
            `).bind(
              mappingId,
              catalogueId,
              pageModel,
              normalizedModel,
              pageManufacturer,
              pageNum,
              pageNum,
              userId,
              now,
              now
            ).run();
          }
          const logNewState = JSON.stringify({
            session_id: session_id || null,
            group_number: group_number !== void 0 ? group_number : null,
            component_index: component_index !== void 0 ? component_index : null,
            component_id,
            component_context: component_context || null,
            _body_keys: Object.keys(body)
          });
          await env2.DB.prepare(`
            INSERT INTO affirmation_log (log_id, mapping_id, action, actor_id, actor_type, timestamp, new_state, notes)
            VALUES (?, ?, 'affirmed', ?, 'user', ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            mappingId,
            userId,
            now,
            logNewState,
            `Batch affirm for component ${component_id}` + (session_id ? ` in session ${session_id}` : "")
          ).run();
          results.push({
            mapping_id: mappingId,
            catalogue_id: catalogueId,
            page_num: pageNum,
            affirmed: true
          });
        } catch (pageErr) {
          console.error(`[CPS Batch Affirm] Error on page ${pageNum}:`, pageErr);
          errors.push({ catalogueId, pageNum, error: pageErr.message });
        }
      }
      if (results.length > 0) {
        await env2.DB.prepare(`
          DELETE FROM cps_draft_selections WHERE user_id = ? AND component_id = ?
        `).bind(userId, component_id).run();
        console.log(`[CPS Batch Affirm] Cleared draft for component ${component_id}`);
      }
      console.log(`[CPS Batch Affirm] Complete: ${results.length} affirmed, ${errors.length} errors`);
      return jsonResponse3({
        success: true,
        component_id,
        affirmed: results.length,
        results,
        errors: errors.length > 0 ? errors : void 0,
        timestamp: now
      });
    } catch (err) {
      console.error("[CPS Batch Affirm] Error:", err);
      return jsonResponse3({ error: "Batch affirm failed: " + err.message }, 500);
    }
  });
}
