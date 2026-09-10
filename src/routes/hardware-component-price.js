import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerHardwareComponentPriceRoutes(router, { authenticate }) {
  router.put("/api/hardware-components/:componentId/select-price", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { componentId } = request2.params;
      const body = await request2.json();
      const { variantId, unitPrice } = body;
      const rawEmpty = unitPrice == null || typeof unitPrice === "string" && unitPrice.trim() === "";
      const priceNum = Number(unitPrice);
      if (rawEmpty || !Number.isFinite(priceNum) || priceNum < 0) {
        return jsonResponse3({ error: "unitPrice (a non-negative number) is required" }, 400);
      }
      const isManual = !variantId;
      const comp = await env2.DB.prepare(`
        SELECT hc.id, hc.set_id, hs.session_id
        FROM hardware_components hc
        JOIN hardware_sets hs ON hc.set_id = hs.id
        JOIN hardware_extraction_sessions hes ON hs.session_id = hes.id
        WHERE hc.id = ? AND hes.user_id = ?
      `).bind(componentId, user.userId).first();
      if (!comp) {
        return jsonResponse3({ error: "Component not found" }, 404);
      }
      await env2.DB.prepare(`
        UPDATE hardware_components
        SET unit_price = ?,
            price_source = ?,
            product_variant_id = ?,
            product_match_confidence = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(priceNum, isManual ? "manual" : "user_selected", isManual ? null : variantId, isManual ? null : 1, componentId).run();
      return jsonResponse3({
        success: true,
        componentId,
        variantId: variantId || null,
        unitPrice: priceNum,
        priceSource: isManual ? "manual" : "user_selected"
      });
    } catch (err) {
      console.error("[CPS Select Price] Error:", err);
      return jsonResponse3({ error: "Failed to select price", details: err.message }, 500);
    }
  });
}
