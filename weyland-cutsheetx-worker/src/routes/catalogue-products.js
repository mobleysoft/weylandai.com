import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCatalogueProductsRoutes(router, { authenticate }) {
  router.get("/api/catalogue/products", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const manufacturer_id = url.searchParams.get("manufacturer_id");
      const product_family = url.searchParams.get("product_family");
      const product_series = url.searchParams.get("product_series");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      let query = `
        SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE 1=1
      `;
      const params = [];
      if (manufacturer_id) {
        query += " AND p.manufacturer_id = ?";
        params.push(manufacturer_id);
      }
      if (product_family) {
        query += " AND p.product_family = ?";
        params.push(product_family);
      }
      if (product_series) {
        query += " AND p.product_series LIKE ?";
        params.push(`%${product_series}%`);
      }
      query += " ORDER BY m.name, p.product_series, p.base_model LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = await env2.DB.prepare(query).bind(...params).all();
      const countResult = await env2.DB.prepare("SELECT COUNT(*) as total FROM products").first();
      return jsonResponse3({
        products: result.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to list products: " + err.message }, 500);
    }
  });
  router.get("/api/catalogue/products/search", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const q = url.searchParams.get("q");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      if (!q || q.trim().length < 2) {
        return jsonResponse3({ error: "Search query must be at least 2 characters" }, 400);
      }
      const searchQuery = q.replace(/[-]/g, " ").replace(/[^\w\s*]/g, "").trim() + "*";
      const result = await env2.DB.prepare(`
        SELECT p.*, m.name as manufacturer_name
        FROM products p
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE p.rowid IN (
          SELECT rowid FROM products_fts WHERE products_fts MATCH ?
        )
        LIMIT ?
      `).bind(searchQuery, limit).all();
      return jsonResponse3({
        query: q,
        results: result.results || [],
        count: result.results?.length || 0
      });
    } catch (err) {
      return jsonResponse3({ error: "Search failed: " + err.message }, 500);
    }
  });
  router.get("/api/catalogue/products/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const productId = request2.params.id;
      const product = await env2.DB.prepare(`
        SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE p.id = ?
      `).bind(productId).first();
      if (!product) {
        return jsonResponse3({ error: "Product not found" }, 404);
      }
      const documents = await env2.DB.prepare(`
        SELECT * FROM product_documents WHERE product_id = ?
      `).bind(productId).all();
      const variants = await env2.DB.prepare(`
        SELECT * FROM product_variants WHERE product_id = ?
      `).bind(productId).all();
      return jsonResponse3({
        ...product,
        documents: documents.results || [],
        variants: variants.results || []
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get product: " + err.message }, 500);
    }
  });
  router.post("/api/catalogue/products", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const {
        manufacturer_id,
        base_model,
        product_series,
        product_family,
        display_name,
        description,
        dhi_category,
        standard_finishes,
        fire_rating
      } = body;
      if (!manufacturer_id || !base_model) {
        return jsonResponse3({ error: "manufacturer_id and base_model are required" }, 400);
      }
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        INSERT INTO products (id, manufacturer_id, base_model, product_series, product_family,
                              display_name, description, dhi_category, standard_finishes,
                              fire_rating, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        manufacturer_id,
        base_model,
        product_series || null,
        product_family || null,
        display_name || null,
        description || null,
        dhi_category || null,
        standard_finishes || null,
        fire_rating || null,
        now,
        now
      ).run();
      return jsonResponse3({ id, message: "Product created successfully" }, 201);
    } catch (err) {
      if (err.message?.includes("UNIQUE constraint")) {
        return jsonResponse3({ error: "Product with this base_model already exists for this manufacturer" }, 409);
      }
      return jsonResponse3({ error: "Failed to create product: " + err.message }, 500);
    }
  });
  router.put("/api/catalogue/products/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const productId = request2.params.id;
      const body = await request2.json();
      const existing = await env2.DB.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
      if (!existing) {
        return jsonResponse3({ error: "Product not found" }, 404);
      }
      const updateFields = [];
      const params = [];
      const allowedFields = [
        "base_model",
        "product_series",
        "product_family",
        "display_name",
        "description",
        "dhi_category",
        "standard_finishes",
        "fire_rating"
      ];
      for (const field of allowedFields) {
        if (body[field] !== void 0) {
          updateFields.push(`${field} = ?`);
          params.push(body[field]);
        }
      }
      if (updateFields.length === 0) {
        return jsonResponse3({ error: "No valid fields to update" }, 400);
      }
      updateFields.push("updated_at = ?");
      params.push((/* @__PURE__ */ new Date()).toISOString());
      params.push(productId);
      await env2.DB.prepare(`
        UPDATE products SET ${updateFields.join(", ")} WHERE id = ?
      `).bind(...params).run();
      return jsonResponse3({ message: "Product updated successfully" });
    } catch (err) {
      return jsonResponse3({ error: "Failed to update product: " + err.message }, 500);
    }
  });
  router.delete("/api/catalogue/products/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const productId = request2.params.id;
      const existing = await env2.DB.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
      if (!existing) {
        return jsonResponse3({ error: "Product not found" }, 404);
      }
      await env2.DB.prepare("DELETE FROM product_documents WHERE product_id = ?").bind(productId).run();
      await env2.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(productId).run();
      await env2.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
      return jsonResponse3({ message: "Product deleted successfully" });
    } catch (err) {
      return jsonResponse3({ error: "Failed to delete product: " + err.message }, 500);
    }
  });
}
