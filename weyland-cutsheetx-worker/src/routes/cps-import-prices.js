// src/routes/cps-import-prices.js
//
// Bulk product-variant price import for the CPS catalogue: upserts up
// to 500 variants per call, auto-creating the parent product row when
// it doesn't exist yet (resolving the manufacturer by slug, or by a
// "prod-<slug>-..." id-prefix convention as a fallback). Real
// defensive handling for a rolling `price_uom` column migration: every
// UPDATE/SELECT/INSERT that touches `price_uom` has a fallback path for
// "no such column" that retries without it, preserved exactly as
// written. Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 147716-147900).
//
// scrubModelTokens (single real call site, fully self-contained - no
// deps beyond its own string argument) is inlined as a local helper
// rather than injected.

import { jsonResponse3 } from "../lib/json-response.js";

function scrubModelTokens(text) {
  if (typeof text !== "string")
    return text;
  return text.split(/\s+/).filter((t) => t && !/^(None|null|NULL|undefined)$/.test(t)).join(" ");
}

export function registerCpsImportPricesRoutes(router, { authenticateCps }) {
router.post("/api/cps/import-prices", async (request2, env2) => {
  const { error: error4, user } = await authenticateCps(request2, env2);
  if (error4)
    return error4;
  try {
    const body = await request2.json();
    const { variants } = body;
    if (!Array.isArray(variants) || variants.length === 0) {
      return jsonResponse3({ error: "variants array required" }, 400);
    }
    let imported = 0;
    let updated = 0;
    let productsCreated = 0;
    let errors = [];
    for (const v of variants.slice(0, 500)) {
      if (typeof v.full_model_number === "string") {
        v.full_model_number = scrubModelTokens(v.full_model_number);
      }
      if (!v.product_id || !v.full_model_number) {
        errors.push({ model: v.full_model_number, error: "missing product_id or full_model_number" });
        continue;
      }
      try {
        const productExists = await env2.DB.prepare(
          "SELECT id FROM products WHERE id = ?"
        ).bind(v.product_id).first();
        if (!productExists) {
          const mfgSlug = (v.manufacturer_slug || "").toLowerCase();
          const mfr = mfgSlug ? await env2.DB.prepare(
            "SELECT id FROM manufacturers WHERE slug = ?"
          ).bind(mfgSlug).first() : null;
          const baseModel = v.base_model || v.manufacturer_part_number || v.full_model_number;
          let mfrIdResolved = mfr?.id || null;
          if (!mfrIdResolved) {
            const idSlug = (String(v.product_id).match(/^prod-([a-z0-9]+)-/) || [])[1];
            if (idSlug) {
              const bySlug = await env2.DB.prepare(
                "SELECT id FROM manufacturers WHERE slug = ? OR id = ?"
              ).bind(idSlug, "mfr-" + idSlug).first();
              mfrIdResolved = bySlug?.id || null;
            }
          }
          if (!mfrIdResolved) {
            errors.push({ model: v.full_model_number, error: "manufacturer unresolved for " + v.product_id });
            continue;
          }
          await env2.DB.prepare(`
            INSERT OR IGNORE INTO products
            (id, manufacturer_id, base_model, product_series, product_family, display_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            v.product_id,
            mfrIdResolved,
            baseModel,
            v.product_series || "General",
            v.product_family || baseModel,
            v.display_name || v.manufacturer_part_number || v.full_model_number
          ).run();
          productsCreated++;
        }
      } catch (prodErr) {
        console.warn("[CPS Import] Product auto-create failed for", v.product_id, prodErr.message);
      }
      const id = v.id || `var-${v.full_model_number.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
      let existing;
      try {
        existing = await env2.DB.prepare(
          "SELECT id FROM product_variants WHERE full_model_number = ? AND product_id = ? AND COALESCE(price_uom, 'EA') = ?"
        ).bind(v.full_model_number, v.product_id, (v.price_uom || "EA").toUpperCase()).first();
      } catch (uomErr) {
        if (!/no such column/i.test(uomErr.message || ""))
          throw uomErr;
        existing = await env2.DB.prepare(
          "SELECT id FROM product_variants WHERE full_model_number = ? AND product_id = ?"
        ).bind(v.full_model_number, v.product_id).first();
      }
      const priceUom = (v.price_uom || "EA").toUpperCase();
      if (existing) {
        try {
          await env2.DB.prepare(`
            UPDATE product_variants
            SET list_price = COALESCE(?, list_price),
                unit_price = COALESCE(?, unit_price),
                finish_code = COALESCE(?, finish_code),
                finish_description = COALESCE(?, finish_description),
                stock_status = COALESCE(?, stock_status),
                lead_time_weeks = COALESCE(?, lead_time_weeks),
                price_uom = ?,
                active = 1,
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            v.list_price ?? null,
            v.unit_price ?? null,
            v.finish_code ?? null,
            v.finish_description ?? null,
            v.stock_status ?? null,
            v.lead_time_weeks ?? null,
            priceUom,
            existing.id
          ).run();
        } catch (uomErr) {
          if (!/no such column/i.test(uomErr.message || ""))
            throw uomErr;
          await env2.DB.prepare(`
            UPDATE product_variants
            SET list_price = COALESCE(?, list_price),
                unit_price = COALESCE(?, unit_price),
                finish_code = COALESCE(?, finish_code),
                finish_description = COALESCE(?, finish_description),
                stock_status = COALESCE(?, stock_status),
                lead_time_weeks = COALESCE(?, lead_time_weeks),
                active = 1,
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            v.list_price ?? null,
            v.unit_price ?? null,
            v.finish_code ?? null,
            v.finish_description ?? null,
            v.stock_status ?? null,
            v.lead_time_weeks ?? null,
            existing.id
          ).run();
        }
        updated++;
      } else {
        try {
          await env2.DB.prepare(`
            INSERT INTO product_variants
            (id, product_id, full_model_number, manufacturer_part_number,
             finish_code, finish_description, list_price, unit_price,
             stock_status, lead_time_weeks, price_uom, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          `).bind(
            id,
            v.product_id,
            v.full_model_number,
            v.manufacturer_part_number || v.full_model_number,
            v.finish_code ?? null,
            v.finish_description ?? null,
            v.list_price ?? null,
            v.unit_price ?? null,
            v.stock_status || "in_stock",
            v.lead_time_weeks ?? null,
            priceUom
          ).run();
        } catch (uomErr) {
          if (!/no such column/i.test(uomErr.message || ""))
            throw uomErr;
          await env2.DB.prepare(`
            INSERT INTO product_variants
            (id, product_id, full_model_number, manufacturer_part_number,
             finish_code, finish_description, list_price, unit_price,
             stock_status, lead_time_weeks, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          `).bind(
            id,
            v.product_id,
            v.full_model_number,
            v.manufacturer_part_number || v.full_model_number,
            v.finish_code ?? null,
            v.finish_description ?? null,
            v.list_price ?? null,
            v.unit_price ?? null,
            v.stock_status || "in_stock",
            v.lead_time_weeks ?? null
          ).run();
        }
        imported++;
      }
    }
    return jsonResponse3({
      success: true,
      imported,
      updated,
      productsCreated,
      errors: errors.length > 0 ? errors : void 0,
      total: variants.length
    });
  } catch (err) {
    console.error("[CPS Import Prices] Error:", err);
    return jsonResponse3({ error: "Failed to import prices", details: err.message }, 500);
  }
});
}
