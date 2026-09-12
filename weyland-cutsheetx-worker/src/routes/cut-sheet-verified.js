import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, requireProductAccess: Function }} deps
 */
export function registerCutSheetVerifiedRoutes(router, { authenticate, requireProductAccess }) {
  router.get("/api/cut-sheets/verified", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
      if (_prodErr) return _prodErr;
    }
    const url = new URL(request2.url);
    const productId = url.searchParams.get("productId");
    const manufacturer = url.searchParams.get("manufacturer");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    try {
      let query = `
        SELECT pd.id, pd.product_id, pd.document_type, pd.document_title,
               pd.document_url as source_url, pd.r2_object_key, pd.verified,
               pd.created_at, pd.updated_at,
               p.product_series as model_number,
               p.display_name as product_name,
               p.base_model,
               m.name as manufacturer,
               m.slug as manufacturer_slug
        FROM product_documents pd
        LEFT JOIN products p ON pd.product_id = p.id
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE pd.verified = 1 AND pd.document_type = 'cut_sheet'
      `;
      const params = [];
      if (productId) {
        query += " AND pd.product_id = ?";
        params.push(productId);
      }
      if (manufacturer) {
        query += " AND (m.name LIKE ? OR m.slug LIKE ?)";
        params.push(`%${manufacturer}%`);
        params.push(`%${manufacturer}%`);
      }
      query += " ORDER BY pd.updated_at DESC LIMIT ?";
      params.push(limit);
      const stmt = env2.DB.prepare(query);
      const result = await stmt.bind(...params).all();
      return jsonResponse3({ documents: result.results || [] });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get verified documents: " + err.message }, 500);
    }
  });
}
