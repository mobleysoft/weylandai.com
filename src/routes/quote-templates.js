// src/routes/quote-templates.js
//
// Quote template CRUD: list/get/update/affirm/delete/set-default for
// saved quote layout templates (layout_dna JSON + optional source PDF
// in R2). Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 154326-154484).

import { jsonResponse3 } from "../lib/json-response.js";

export function registerQuoteTemplatesRoutes(router, { authenticate }) {
  router.get("/api/quote-templates", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const result = await env2.DB.prepare(`
        SELECT id, template_name, is_default, affirmed, created_at, updated_at
        FROM quote_templates WHERE tenant_id = ?
        ORDER BY is_default DESC, created_at DESC
      `).bind(tenantId).all();
      return jsonResponse3({ templates: result.results || [] });
    } catch (error5) {
      console.error("[Template List] Error:", error5);
      return jsonResponse3({ error: "Failed to list templates", details: error5.message }, 500);
    }
  });

  router.get("/api/quote-templates/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const template = await env2.DB.prepare(`
        SELECT * FROM quote_templates WHERE id = ? AND tenant_id = ?
      `).bind(request2.params.id, tenantId).first();
      if (!template) {
        return jsonResponse3({ error: "Template not found" }, 404);
      }
      let layoutDna = null;
      try {
        layoutDna = JSON.parse(template.layout_dna);
      } catch (e) {
      }
      return jsonResponse3({
        ...template,
        layout_dna: layoutDna || template.layout_dna
      });
    } catch (error5) {
      console.error("[Template Get] Error:", error5);
      return jsonResponse3({ error: "Failed to get template", details: error5.message }, 500);
    }
  });

  router.put("/api/quote-templates/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const templateId = request2.params.id;
      const body = await request2.json();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const existing = await env2.DB.prepare(
        "SELECT id FROM quote_templates WHERE id = ? AND tenant_id = ?"
      ).bind(templateId, tenantId).first();
      if (!existing) {
        return jsonResponse3({ error: "Template not found" }, 404);
      }
      const updates = [];
      const values2 = [];
      if (body.template_name !== void 0) {
        updates.push("template_name = ?");
        values2.push(body.template_name);
      }
      if (body.layout_dna !== void 0) {
        updates.push("layout_dna = ?");
        values2.push(typeof body.layout_dna === "string" ? body.layout_dna : JSON.stringify(body.layout_dna));
      }
      if (updates.length === 0) {
        return jsonResponse3({ error: "No fields to update" }, 400);
      }
      updates.push("updated_at = ?");
      values2.push(now);
      values2.push(templateId);
      values2.push(tenantId);
      await env2.DB.prepare(
        `UPDATE quote_templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
      ).bind(...values2).run();
      return jsonResponse3({ success: true, templateId });
    } catch (error5) {
      console.error("[Template Update] Error:", error5);
      return jsonResponse3({ error: "Failed to update template", details: error5.message }, 500);
    }
  });

  router.put("/api/quote-templates/:id/affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const templateId = request2.params.id;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const result = await env2.DB.prepare(`
        UPDATE quote_templates SET affirmed = 1, affirmed_by = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).bind(user.userId || user.email, now, templateId, tenantId).run();
      if (result.changes === 0) {
        return jsonResponse3({ error: "Template not found" }, 404);
      }
      return jsonResponse3({ success: true, templateId, affirmed: true });
    } catch (error5) {
      console.error("[Template Affirm] Error:", error5);
      return jsonResponse3({ error: "Failed to affirm template", details: error5.message }, 500);
    }
  });

  router.delete("/api/quote-templates/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const templateId = request2.params.id;
      const template = await env2.DB.prepare(
        "SELECT source_pdf_r2_key FROM quote_templates WHERE id = ? AND tenant_id = ?"
      ).bind(templateId, tenantId).first();
      if (!template) {
        return jsonResponse3({ error: "Template not found" }, 404);
      }
      await env2.DB.prepare(
        "DELETE FROM quote_templates WHERE id = ? AND tenant_id = ?"
      ).bind(templateId, tenantId).run();
      if (template.source_pdf_r2_key) {
        try {
          await env2.UPLOADS.delete(template.source_pdf_r2_key);
        } catch (e) {
        }
      }
      return jsonResponse3({ success: true, deleted: templateId });
    } catch (error5) {
      console.error("[Template Delete] Error:", error5);
      return jsonResponse3({ error: "Failed to delete template", details: error5.message }, 500);
    }
  });

  router.post("/api/quote-templates/:id/set-default", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId || user.tenant_id;
      const templateId = request2.params.id;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const template = await env2.DB.prepare(
        "SELECT id FROM quote_templates WHERE id = ? AND tenant_id = ?"
      ).bind(templateId, tenantId).first();
      if (!template) {
        return jsonResponse3({ error: "Template not found" }, 404);
      }
      await env2.DB.prepare(
        "UPDATE quote_templates SET is_default = 0, updated_at = ? WHERE tenant_id = ?"
      ).bind(now, tenantId).run();
      await env2.DB.prepare(
        "UPDATE quote_templates SET is_default = 1, updated_at = ? WHERE id = ? AND tenant_id = ?"
      ).bind(now, templateId, tenantId).run();
      return jsonResponse3({ success: true, templateId, is_default: true });
    } catch (error5) {
      console.error("[Template Set Default] Error:", error5);
      return jsonResponse3({ error: "Failed to set default template", details: error5.message }, 500);
    }
  });
}
