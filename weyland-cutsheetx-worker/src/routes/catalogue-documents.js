import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCatalogueDocumentsRoutes(router, { authenticate }) {
  router.get("/api/catalogue/documents", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const product_id = url.searchParams.get("product_id");
      const document_type = url.searchParams.get("document_type");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      let query = `
        SELECT pd.*, p.base_model, p.display_name as product_name, m.name as manufacturer_name
        FROM product_documents pd
        LEFT JOIN products p ON pd.product_id = p.id
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE 1=1
      `;
      const params = [];
      if (product_id) {
        query += " AND pd.product_id = ?";
        params.push(product_id);
      }
      if (document_type) {
        query += " AND pd.document_type = ?";
        params.push(document_type);
      }
      query += " ORDER BY pd.updated_at DESC LIMIT ?";
      params.push(limit);
      const result = await env2.DB.prepare(query).bind(...params).all();
      return jsonResponse3({ documents: result.results || [] });
    } catch (err) {
      return jsonResponse3({ error: "Failed to list documents: " + err.message }, 500);
    }
  });
  router.post("/api/catalogue/documents", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const {
        product_id,
        document_type,
        document_title,
        document_url,
        r2_object_key,
        source_url,
        file_size_bytes,
        page_count,
        verified
      } = body;
      if (!product_id) {
        return jsonResponse3({ error: "product_id is required" }, 400);
      }
      if (!document_url && !r2_object_key) {
        return jsonResponse3({ error: "Either document_url or r2_object_key is required" }, 400);
      }
      const product = await env2.DB.prepare("SELECT id FROM products WHERE id = ?").bind(product_id).first();
      if (!product) {
        return jsonResponse3({ error: "Product not found" }, 404);
      }
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        INSERT INTO product_documents (id, product_id, document_type, document_title,
                                       document_url, r2_object_key, source_url,
                                       file_size_bytes, page_count, verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        product_id,
        document_type || "cut_sheet",
        document_title || null,
        document_url || null,
        r2_object_key || null,
        source_url || null,
        file_size_bytes || null,
        page_count || null,
        verified ? 1 : 0,
        now,
        now
      ).run();
      return jsonResponse3({ id, message: "Document created successfully" }, 201);
    } catch (err) {
      return jsonResponse3({ error: "Failed to create document: " + err.message }, 500);
    }
  });
  router.put("/api/catalogue/documents/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const documentId = request2.params.id;
      const body = await request2.json();
      const existing = await env2.DB.prepare("SELECT id FROM product_documents WHERE id = ?").bind(documentId).first();
      if (!existing) {
        return jsonResponse3({ error: "Document not found" }, 404);
      }
      const updateFields = [];
      const params = [];
      const allowedFields = [
        "document_type",
        "document_title",
        "document_url",
        "r2_object_key",
        "source_url",
        "file_size_bytes",
        "page_count",
        "verified"
      ];
      for (const field of allowedFields) {
        if (body[field] !== void 0) {
          updateFields.push(`${field} = ?`);
          params.push(field === "verified" ? body[field] ? 1 : 0 : body[field]);
        }
      }
      if (updateFields.length === 0) {
        return jsonResponse3({ error: "No valid fields to update" }, 400);
      }
      updateFields.push("updated_at = ?");
      params.push((/* @__PURE__ */ new Date()).toISOString());
      params.push(documentId);
      await env2.DB.prepare(`
        UPDATE product_documents SET ${updateFields.join(", ")} WHERE id = ?
      `).bind(...params).run();
      return jsonResponse3({ message: "Document updated successfully" });
    } catch (err) {
      return jsonResponse3({ error: "Failed to update document: " + err.message }, 500);
    }
  });
  router.delete("/api/catalogue/documents/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const documentId = request2.params.id;
      const existing = await env2.DB.prepare("SELECT id, r2_object_key FROM product_documents WHERE id = ?").bind(documentId).first();
      if (!existing) {
        return jsonResponse3({ error: "Document not found" }, 404);
      }
      if (existing.r2_object_key && env2.UPLOADS) {
        try {
          await env2.UPLOADS.delete(existing.r2_object_key);
        } catch (r2Err) {
          console.error("Failed to delete R2 object:", r2Err);
        }
      }
      await env2.DB.prepare("DELETE FROM product_documents WHERE id = ?").bind(documentId).run();
      return jsonResponse3({ message: "Document deleted successfully" });
    } catch (err) {
      return jsonResponse3({ error: "Failed to delete document: " + err.message }, 500);
    }
  });
  router.post("/api/catalogue/bulk-import", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { entries } = body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return jsonResponse3({ error: "entries array is required" }, 400);
      }
      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };
      const maxBatch = 100;
      const batch = entries.slice(0, maxBatch);
      for (const entry of batch) {
        try {
          let manufacturer_id = null;
          if (entry.parent_company || entry.manufacturer) {
            const mfrSlug = (entry.parent_company || entry.manufacturer).toLowerCase().replace(/[^a-z0-9]/g, "-");
            const mfr = await env2.DB.prepare(
              "SELECT id FROM manufacturers WHERE slug = ? OR name LIKE ?"
            ).bind(mfrSlug, `%${entry.manufacturer}%`).first();
            manufacturer_id = mfr?.id;
          }
          if (!manufacturer_id) {
            results.errors.push({ entry: entry.filename, error: "Manufacturer not found" });
            results.skipped++;
            continue;
          }
          const existingProduct = await env2.DB.prepare(
            "SELECT id FROM products WHERE manufacturer_id = ? AND base_model = ?"
          ).bind(manufacturer_id, entry.base_model || entry.models_covered?.[0]).first();
          let productId;
          if (existingProduct) {
            productId = existingProduct.id;
            results.updated++;
          } else {
            productId = crypto.randomUUID();
            const now = (/* @__PURE__ */ new Date()).toISOString();
            await env2.DB.prepare(`
              INSERT INTO products (id, manufacturer_id, base_model, product_series, product_family, display_name, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              productId,
              manufacturer_id,
              entry.base_model || entry.models_covered?.[0] || "unknown",
              entry.series || null,
              entry.category || null,
              entry.display_name || `${entry.manufacturer} ${entry.series || ""} ${entry.base_model || ""}`.trim(),
              now,
              now
            ).run();
            results.created++;
          }
          if (entry.filename || entry.file_path) {
            const existingDoc = await env2.DB.prepare(
              "SELECT id FROM product_documents WHERE product_id = ? AND (document_url = ? OR r2_object_key = ?)"
            ).bind(productId, entry.filename || entry.file_path, entry.filename || entry.file_path).first();
            if (!existingDoc) {
              const docId = crypto.randomUUID();
              const now = (/* @__PURE__ */ new Date()).toISOString();
              await env2.DB.prepare(`
                INSERT INTO product_documents (id, product_id, document_type, document_title, document_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(
                docId,
                productId,
                "cut_sheet",
                `${entry.manufacturer} ${entry.series || ""} Cut Sheet`.trim(),
                entry.filename || entry.file_path,
                now,
                now
              ).run();
            }
          }
        } catch (entryErr) {
          results.errors.push({ entry: entry.filename || "unknown", error: entryErr.message });
          results.skipped++;
        }
      }
      return jsonResponse3({
        ...results,
        processed: batch.length,
        truncated: entries.length > maxBatch
      });
    } catch (err) {
      return jsonResponse3({ error: "Bulk import failed: " + err.message }, 500);
    }
  });
}
