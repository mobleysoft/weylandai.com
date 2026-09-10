// src/routes/vendor-profile.js
//
// GET/PUT /api/vendor-profile, POST /api/vendor-profile/affirm - the
// per-tenant vendor company profile (used on generated documents:
// company name/address/logo/etc.) and its affirm-to-lock-in-gated-fields
// workflow (changing a gated field resets affirmed status; re-affirming
// requires company_name to be set).
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// 151713-151859). Fully self-contained - only authenticate/jsonResponse3/
// env.DB, confirmed by inspection, no private helper chain to trace.

import { jsonResponse3 } from "../lib/json-response.js";

export function registerVendorProfileRoutes(router, { authenticate }) {
  router.get("/api/vendor-profile", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId;
      if (!tenantId) {
        return jsonResponse3({ error: "No tenant associated with user" }, 400);
      }
      let profile3 = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(tenantId).first();
      if (!profile3) {
        const vpId = "vp_" + tenantId;
        const now = new Date().toISOString();
        await env2.DB.prepare(`
          INSERT OR IGNORE INTO vendor_profile (id, tenant_id, created_at)
          VALUES (?, ?, ?)
        `).bind(vpId, tenantId, now).run();
        profile3 = await env2.DB.prepare(
          "SELECT * FROM vendor_profile WHERE tenant_id = ?"
        ).bind(tenantId).first();
      }
      return jsonResponse3({ success: true, vendorProfile: profile3 });
    } catch (err) {
      console.error("[VendorProfile] GET error:", err);
      return jsonResponse3({ error: "Failed to get vendor profile: " + err.message }, 500);
    }
  });

  router.put("/api/vendor-profile", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId;
      if (!tenantId) {
        return jsonResponse3({ error: "No tenant associated with user" }, 400);
      }
      const body = await request2.json();
      const now = new Date().toISOString();
      const vpId = "vp_" + tenantId;
      const existing = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(tenantId).first();
      if (existing) {
        const gatedFields = ["company_name", "company_address", "company_phone", "company_email"];
        const changed = gatedFields.some((f) => body[f] !== undefined && body[f] !== existing[f]);
        const resetAffirm = changed && existing.affirmed === 1;
        await env2.DB.prepare(`
          UPDATE vendor_profile SET
            company_name = ?,
            company_address = ?,
            company_phone = ?,
            company_email = ?,
            logo_url = ?,
            shipping_address = ?,
            resale_number = ?,
            ap_contact = ?,
            affirmed = ?,
            affirmed_at = ?,
            affirmed_by = ?,
            updated_at = ?
          WHERE tenant_id = ?
        `).bind(
          body.company_name ?? existing.company_name ?? null,
          body.company_address ?? existing.company_address ?? null,
          body.company_phone ?? existing.company_phone ?? null,
          body.company_email ?? existing.company_email ?? null,
          body.logo_url ?? existing.logo_url ?? null,
          body.shipping_address ?? existing.shipping_address ?? null,
          body.resale_number ?? existing.resale_number ?? null,
          body.ap_contact ?? existing.ap_contact ?? null,
          resetAffirm ? 0 : existing.affirmed || 0,
          resetAffirm ? null : existing.affirmed_at || null,
          resetAffirm ? null : existing.affirmed_by || null,
          now,
          tenantId
        ).run();
        if (resetAffirm) {
          console.log(`[VendorProfile] Affirm reset — gated field changed by ${user.userId}`);
        }
      } else {
        await env2.DB.prepare(`
          INSERT INTO vendor_profile
            (id, tenant_id, company_name, company_address, company_phone, company_email,
             logo_url, shipping_address, resale_number, ap_contact, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          vpId,
          tenantId,
          body.company_name || null,
          body.company_address || null,
          body.company_phone || null,
          body.company_email || null,
          body.logo_url || null,
          body.shipping_address || null,
          body.resale_number || null,
          body.ap_contact || null,
          now,
          now
        ).run();
      }
      const profile3 = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(tenantId).first();
      return jsonResponse3({ success: true, vendorProfile: profile3 });
    } catch (err) {
      console.error("[VendorProfile] PUT error:", err);
      return jsonResponse3({ error: "Failed to update vendor profile: " + err.message }, 500);
    }
  });

  router.post("/api/vendor-profile/affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const tenantId = user.tenantId;
      if (!tenantId) {
        return jsonResponse3({ error: "No tenant associated with user" }, 400);
      }
      const profile3 = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(tenantId).first();
      if (!profile3) {
        return jsonResponse3({ error: "No vendor profile found. Create one first." }, 404);
      }
      if (!profile3.company_name) {
        return jsonResponse3({ error: "Cannot affirm: company_name is required." }, 400);
      }
      const now = new Date().toISOString();
      await env2.DB.prepare(`
        UPDATE vendor_profile SET affirmed = 1, affirmed_at = ?, affirmed_by = ?, updated_at = ?
        WHERE tenant_id = ?
      `).bind(now, user.userId, now, tenantId).run();
      try {
        await env2.DB.prepare(`
          INSERT INTO affirm_audit_log (id, entity_type, entity_id, action, user_id, created_at)
          VALUES (?, 'vendor_profile', ?, 'affirm', ?, ?)
        `).bind(crypto.randomUUID(), profile3.id, user.userId, now).run();
      } catch (e) {
      }
      return jsonResponse3({ success: true, affirmed: true, affirmedAt: now, affirmedBy: user.userId });
    } catch (err) {
      console.error("[VendorProfile] Affirm error:", err);
      return jsonResponse3({ error: "Failed to affirm vendor profile: " + err.message }, 500);
    }
  });
}
