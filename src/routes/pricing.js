// src/routes/pricing.js
//
// CPS catalogue pricing routes: single-lookup price-check, session/project
// batch enrichment, manual pricing-options search, and the generic
// pricing/resolve endpoint used by the (still-unextracted) takeoff/quotes
// cluster. Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 150955-151159 and 153495-153514). All real pricing logic
// lives in ../lib/pricing.js; this file is routing + auth only.

import { jsonResponse3 } from "../lib/json-response.js";
import { MFR_CODE_MAP, cpsPriceLookup, enrichComponentsWithPricing, resolveCataloguePrices } from "../lib/pricing.js";

export function registerPricingRoutes(router, { authenticate, authenticateCps }) {
  router.get("/api/cps/price-check", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const url = new URL(request2.url);
    const manufacturer = url.searchParams.get("manufacturer");
    const model = url.searchParams.get("model");
    const finish = url.searchParams.get("finish");
    if (!model) {
      return jsonResponse3({ error: "model parameter required" }, 400);
    }
    const result = await cpsPriceLookup({ manufacturer, model, finish }, env2);
    return jsonResponse3({
      found: !!result,
      query: { manufacturer, model, finish },
      pricing: result
    });
  });

  router.post("/api/cps/enrich-session/:sessionId", async (request2, env2) => {
    const { error: error4, user } = await authenticateCps(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      const compsResult = await env2.DB.prepare(`
        SELECT hc.id, hc.manufacturer, hc.model, hc.finish, hc.catalog_number,
               hc.unit_price, hc.price_source, hs.set_number
        FROM hardware_components hc
        JOIN hardware_sets hs ON hc.set_id = hs.id
        WHERE hs.session_id = ?
          AND (hc.unit_price IS NULL OR hc.price_source = 'catalog')
      `).bind(sessionId).all();
      const components = compsResult?.results || [];
      if (components.length === 0) {
        return jsonResponse3({ success: true, message: "No un-priced components to enrich", enriched: 0, skipped: 0 });
      }
      const results = await enrichComponentsWithPricing(components, env2);
      return jsonResponse3({
        success: true,
        sessionId,
        totalComponents: components.length,
        ...results
      });
    } catch (err) {
      console.error("[CPS Enrich Session] Error:", err);
      return jsonResponse3({ error: "Failed to enrich components", details: err.message }, 500);
    }
  });

  router.post("/api/cps/enrich-project/:projectId", async (request2, env2) => {
    const { error: error4, user } = await authenticateCps(request2, env2);
    if (error4)
      return error4;
    try {
      const projectId = request2.params.projectId;
      const tenantId = user.tenantId || user.tenant_id;
      const project = await env2.DB.prepare(
        "SELECT id, name FROM projects WHERE id = ? AND tenant_id = ?"
      ).bind(projectId, tenantId).first();
      if (!project) {
        return jsonResponse3({ error: "Project not found" }, 404);
      }
      const sessionsResult = await env2.DB.prepare(
        "SELECT id FROM hardware_extraction_sessions WHERE project_id = ?"
      ).bind(projectId).all();
      const sessionIds = (sessionsResult.results || []).map((s) => s.id);
      if (sessionIds.length === 0) {
        return jsonResponse3({ success: true, message: "No linked sessions", enriched: 0, skipped: 0 });
      }
      const placeholders = sessionIds.map(() => "?").join(",");
      const compsResult = await env2.DB.prepare(`
        SELECT hc.id, hc.manufacturer, hc.model, hc.finish, hc.catalog_number,
               hc.unit_price, hc.price_source
        FROM hardware_components hc
        JOIN hardware_sets hs ON hc.set_id = hs.id
        WHERE hs.session_id IN (${placeholders})
          AND (hc.unit_price IS NULL OR hc.price_source = 'catalog')
      `).bind(...sessionIds).all();
      const components = compsResult?.results || [];
      if (components.length === 0) {
        return jsonResponse3({ success: true, message: "No un-priced components", enriched: 0, skipped: 0 });
      }
      const results = await enrichComponentsWithPricing(components, env2);
      return jsonResponse3({
        success: true,
        projectId,
        projectName: project.name,
        sessionCount: sessionIds.length,
        totalComponents: components.length,
        ...results
      });
    } catch (err) {
      console.error("[CPS Enrich Project] Error:", err);
      return jsonResponse3({ error: "Failed to enrich project components", details: err.message }, 500);
    }
  });

  router.get("/api/cps/pricing-options", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const manufacturer = url.searchParams.get("manufacturer") || "";
      const model = url.searchParams.get("model") || "";
      const finish = url.searchParams.get("finish") || "";
      const componentId = url.searchParams.get("componentId") || null;
      if (!model) {
        return jsonResponse3({ error: "model parameter required" }, 400);
      }
      const mfgCode = manufacturer.toUpperCase().trim();
      const modelRaw = model.toUpperCase().trim();
      const finishRaw = finish.toUpperCase().trim();
      const mfgSlugs = MFR_CODE_MAP[mfgCode] || [mfgCode.toLowerCase()];
      const modelParts = modelRaw.split(/[\s-]+/);
      const baseModel = modelParts[0] || modelRaw;
      const seriesBase = baseModel.replace(/[A-Z]$/i, "");
      let options = [];
      for (const mfgSlug of mfgSlugs) {
        const tier1 = await env2.DB.prepare(`
          SELECT pv.id as variant_id, pv.product_id, pv.full_model_number,
                 pv.manufacturer_part_number, pv.finish_code, pv.finish_description,
                 pv.list_price, pv.unit_price, p.base_model, p.display_name,
                 m.slug as manufacturer_slug
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          JOIN manufacturers m ON p.manufacturer_id = m.id
          WHERE m.slug = ?
            AND pv.active = 1
            AND (UPPER(pv.manufacturer_part_number) LIKE ? OR UPPER(pv.full_model_number) LIKE ?)
            AND pv.list_price IS NOT NULL
          ORDER BY
            CASE WHEN UPPER(pv.finish_code) = ? THEN 0 ELSE 1 END,
            pv.list_price DESC
          LIMIT 20
        `).bind(mfgSlug, `%${baseModel}%`, `%${baseModel}%`, finishRaw).all();
        if (tier1.results?.length) {
          options.push(...tier1.results.map((v) => ({
            variantId: v.variant_id,
            productId: v.product_id,
            fullModelNumber: v.full_model_number,
            finishCode: v.finish_code,
            finishDescription: v.finish_description,
            listPrice: v.list_price,
            unitPrice: v.unit_price || v.list_price,
            confidence: v.finish_code?.toUpperCase() === finishRaw ? 0.95 : 0.8,
            matchType: "variant_model"
          })));
        }
        if (options.length === 0 && seriesBase.length >= 3) {
          const tier2 = await env2.DB.prepare(`
            SELECT pv.id as variant_id, pv.product_id, pv.full_model_number,
                   pv.manufacturer_part_number, pv.finish_code, pv.finish_description,
                   pv.list_price, pv.unit_price, p.base_model, p.display_name
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            JOIN manufacturers m ON p.manufacturer_id = m.id
            WHERE m.slug = ?
              AND pv.active = 1
              AND (UPPER(p.base_model) LIKE ? OR UPPER(p.product_series) LIKE ?)
              AND pv.list_price IS NOT NULL
            ORDER BY
              CASE WHEN UPPER(pv.finish_code) = ? THEN 0 ELSE 1 END,
              pv.list_price DESC
            LIMIT 20
          `).bind(mfgSlug, `${seriesBase}%`, `%${seriesBase}%`, finishRaw).all();
          if (tier2.results?.length) {
            options.push(...tier2.results.map((v) => ({
              variantId: v.variant_id,
              productId: v.product_id,
              fullModelNumber: v.full_model_number,
              finishCode: v.finish_code,
              finishDescription: v.finish_description,
              listPrice: v.list_price,
              unitPrice: v.unit_price || v.list_price,
              confidence: v.finish_code?.toUpperCase() === finishRaw ? 0.85 : 0.65,
              matchType: "series_match"
            })));
          }
        }
        if (options.length > 0)
          break;
      }
      let currentPrice = null;
      if (componentId) {
        const comp = await env2.DB.prepare(
          "SELECT unit_price, price_source, product_variant_id FROM hardware_components WHERE id = ?"
        ).bind(componentId).first();
        if (comp) {
          currentPrice = {
            unitPrice: comp.unit_price,
            source: comp.price_source,
            variantId: comp.product_variant_id
          };
        }
      }
      return jsonResponse3({
        component: { manufacturer, model, finish },
        options,
        currentPrice,
        totalOptions: options.length
      });
    } catch (err) {
      console.error("[CPS Pricing Options] Error:", err);
      return jsonResponse3({ error: "Failed to get pricing options", details: err.message }, 500);
    }
  });

  router.post("/api/pricing/resolve", async (request2, env2) => {
    const { error: error4 } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json().catch(() => ({}));
      const components = Array.isArray(body.components) ? body.components.slice(0, 500) : [];
      const resolved = await resolveCataloguePrices(env2, components);
      const priced = resolved.filter(Boolean).length;
      return jsonResponse3({
        success: true,
        total: components.length,
        priced,
        coverage_percent: components.length ? Math.round(priced / components.length * 100) : 0,
        results: resolved
      });
    } catch (err) {
      return jsonResponse3({ error: "Pricing resolution failed: " + err.message }, 500);
    }
  });
}
