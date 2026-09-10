// src/routes/quotes-generate.js
//
// Quote lifecycle: share-link creation (HMAC access token), the
// customer's e-signature acceptance (re-renders the PDF with an
// ACCEPTED stamp), generating a new quote PDF from session or project
// takeoff data (with a live pricing re-resolve pass), and listing/
// downloading generated quotes. Extracted 2026-09-10 from
// legacy-monolith.js (previously inline, lines 152704-153561).
//
// Real PDF rendering here is inline puppeteer (env2.BROWSER), not the
// shared renderHtmlToPdf from document-generators.js - this predates
// that module and generates from generateQuoteHtml's HTML directly with
// its own margin/format settings, so it's kept as-is rather than forced
// through an unrelated shared helper.

import { jsonResponse3 } from "../lib/json-response.js";
import { generateQuoteHtml } from "../lib/quote-html.js";
import { resolveCataloguePrices } from "../lib/pricing.js";
import { createHmacSignature } from "../auth-module.js";

export function registerQuotesGenerateRoutes(router, { authenticate, requireProductAccess, puppeteer }) {
router.post("/api/quotes/:quoteId/share", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const quoteId = request2.params.quoteId;
    const tenantId = user.tenantId || user.tenant_id;
    const quote = await env2.DB.prepare(
      `SELECT id, tenant_id, created_at, access_token FROM takeoff_quotes WHERE id = ? AND tenant_id = ?`
    ).bind(quoteId, tenantId).first();
    if (!quote) {
      return jsonResponse3({ error: "Quote not found" }, 404);
    }
    if (quote.access_token) {
      return jsonResponse3({
        url: `https://subx.weylandai.com/q/${quoteId}/${quote.access_token}`,
        accessToken: quote.access_token,
        sharedAt: quote.shared_at || (/* @__PURE__ */ new Date()).toISOString(),
        alreadyShared: true
      });
    }
    const payload = `${quoteId}:${tenantId}:${quote.created_at}`;
    const accessToken = await createHmacSignature(payload, env2.JWT_SECRET);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env2.DB.prepare(
      `UPDATE takeoff_quotes SET access_token = ?, shared_at = ?, status = 'sent' WHERE id = ? AND tenant_id = ?`
    ).bind(accessToken, now, quoteId, tenantId).run();
    return jsonResponse3({
      url: `https://subx.weylandai.com/q/${quoteId}/${accessToken}`,
      accessToken,
      sharedAt: now
    });
  } catch (error5) {
    console.error("[Quote Share] Error:", error5);
    return jsonResponse3({ error: "Failed to generate share link" }, 500);
  }
});
router.post("/q/:quoteId/:accessToken/accept", async (request2, env2) => {
  try {
    const { quoteId, accessToken } = request2.params;
    const quote = await env2.DB.prepare(
      `SELECT * FROM takeoff_quotes WHERE id = ? AND access_token = ?`
    ).bind(quoteId, accessToken).first();
    if (!quote) {
      return jsonResponse3({ error: "Quote not found or invalid link" }, 403);
    }
    if (quote.status === "accepted") {
      return jsonResponse3({ error: "Quote has already been accepted", acceptedAt: quote.accepted_at, acceptedBy: quote.accepted_by }, 409);
    }
    const settingsSnapshot = quote.settings_snapshot ? JSON.parse(quote.settings_snapshot) : {};
    const validityDays = settingsSnapshot.validity_days || 30;
    const createdAt = new Date(quote.created_at);
    const expiresAt = new Date(createdAt.getTime() + validityDays * 864e5);
    if (/* @__PURE__ */ new Date() > expiresAt) {
      return jsonResponse3({ error: "Quote has expired" }, 410);
    }
    let body;
    try {
      body = await request2.json();
    } catch (e) {
      return jsonResponse3({ error: "Invalid request body" }, 400);
    }
    const { name, signature_png_base64 } = body;
    if (!name || !name.trim()) {
      return jsonResponse3({ error: "Name is required" }, 400);
    }
    if (!signature_png_base64) {
      return jsonResponse3({ error: "Signature is required" }, 400);
    }
    const sigR2Key = `signatures/${quoteId}.png`;
    const sigBytes = Uint8Array.from(atob(signature_png_base64), (c) => c.charCodeAt(0));
    await env2.UPLOADS.put(sigR2Key, sigBytes, {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { quoteId, acceptedBy: name.trim() }
    });
    const acceptedAt = (/* @__PURE__ */ new Date()).toISOString();
    const acceptanceIp = request2.headers.get("CF-Connecting-IP") || "unknown";
    const acceptanceUa = request2.headers.get("User-Agent") || "unknown";
    await env2.DB.prepare(`
      UPDATE takeoff_quotes
      SET status = 'accepted', accepted_at = ?, accepted_by = ?, signature_r2_key = ?,
          acceptance_ip = ?, acceptance_user_agent = ?
      WHERE id = ?
    `).bind(acceptedAt, name.trim(), sigR2Key, acceptanceIp, acceptanceUa, quoteId).run();
    try {
      const tenantId = quote.tenant_id;
      const lineItemSnapshot = quote.line_item_snapshot ? JSON.parse(quote.line_item_snapshot) : {};
      const vendorProfile = await env2.DB.prepare(
        `SELECT company_name, company_address, company_phone, company_email, logo_url FROM vendor_profile WHERE tenant_id = ?`
      ).bind(tenantId).first() || {};
      let logoDataUri = null;
      if (vendorProfile.logo_url) {
        try {
          const logoObj = await env2.UPLOADS.get(vendorProfile.logo_url);
          if (logoObj) {
            const logoBytes = new Uint8Array(await logoObj.arrayBuffer());
            const isPng = logoBytes[0] === 137 && logoBytes[1] === 80;
            const mimeType = isPng ? "image/png" : "image/jpeg";
            const base64 = btoa(String.fromCharCode(...logoBytes));
            logoDataUri = `data:${mimeType};base64,${base64}`;
          }
        } catch (e) {
        }
      }
      let projectData = {};
      if (quote.project_id) {
        projectData = await env2.DB.prepare(
          `SELECT * FROM projects WHERE id = ?`
        ).bind(quote.project_id).first() || {};
      }
      let templateDna = null;
      try {
        const templateRow = await env2.DB.prepare(
          `SELECT layout_dna FROM quote_templates WHERE tenant_id = ? AND is_default = 1`
        ).bind(tenantId).first();
        if (templateRow?.layout_dna) {
          templateDna = JSON.parse(templateRow.layout_dna);
        }
      } catch (e) {
      }
      const quoteData = {
        vendor: vendorProfile,
        recipient: {
          client_name: projectData.client_name || null,
          client_address: projectData.client_address || null,
          billing_name: projectData.billing_name || null,
          billing_address: projectData.billing_address || null,
          project_name: projectData.name || null,
          dsa_number: projectData.dsa_number || null
        },
        quoteNumber: quote.quote_number,
        quoteDate: quote.created_at,
        validityDays,
        hardwareSets: lineItemSnapshot.hardwareSets || [],
        doors: lineItemSnapshot.doors || [],
        frames: lineItemSnapshot.frames || [],
        services: lineItemSnapshot.services || [],
        totals: {
          subtotal: quote.subtotal,
          taxableAmount: quote.taxable_amount,
          taxRate: quote.tax_rate,
          taxAmount: quote.tax_amount,
          grandTotal: quote.grand_total
        },
        settings: {
          show_unit_prices: settingsSnapshot.show_unit_prices !== 0,
          show_extended_prices: settingsSnapshot.show_extended_prices !== 0,
          exclusions_text: settingsSnapshot.exclusions_text || "",
          tax_jurisdiction: settingsSnapshot.tax_jurisdiction || ""
        },
        templateDna
      };
      let pdfHtml = generateQuoteHtml(quoteData, logoDataUri);
      const sigDataUri = `data:image/png;base64,${signature_png_base64}`;
      const acceptStamp = `<div style="margin: 2rem auto; max-width: 700px; padding: 1.5rem; border: 2px solid #10b981; border-radius: 12px; background: #f0fdf4; text-align: center; page-break-inside: avoid;">
  <div style="display: inline-block; background: #10b981; color: white; padding: 0.5rem 2rem; border-radius: 8px; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 1rem;">ACCEPTED</div>
  <div style="margin: 1rem 0;"><img src="${sigDataUri}" style="max-width: 300px; border-bottom: 2px solid #334155;"></div>
  <div style="color: #334155; font-size: 1rem;">Accepted by <strong>${name.trim()}</strong></div>
  <div style="color: #64748b; font-size: 0.85rem;">${new Date(acceptedAt).toLocaleString()}</div>
</div>`;
      pdfHtml = pdfHtml.replace("</body>", acceptStamp + "\n</body>");
      const browser = await puppeteer.launch(env2.BROWSER);
      try {
        const page = await browser.newPage();
        await page.setContent(pdfHtml, { waitUntil: "load" });
        const pdfBytes = await page.pdf({
          format: "Letter",
          printBackground: true,
          margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" }
        });
        const acceptedR2Key = quote.r2_key ? quote.r2_key.replace(".pdf", "_accepted.pdf") : `quotes/${quoteId}/accepted.pdf`;
        await env2.UPLOADS.put(acceptedR2Key, pdfBytes, {
          httpMetadata: { contentType: "application/pdf" },
          customMetadata: { quoteId, acceptedBy: name.trim(), acceptedAt }
        });
        await env2.DB.prepare(
          `UPDATE takeoff_quotes SET r2_key = ? WHERE id = ?`
        ).bind(acceptedR2Key, quoteId).run();
      } finally {
        await browser.close();
      }
    } catch (pdfError) {
      console.error("[Quote Accept] PDF re-generation failed:", pdfError);
    }
    return jsonResponse3({ success: true, status: "accepted", acceptedAt });
  } catch (error4) {
    console.error("[Quote Accept] Error:", error4);
    return jsonResponse3({ error: "Failed to process acceptance" }, 500);
  }
});
router.post("/api/takeoff/session/:sessionId/generate-quote", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const sessionId = request2.params.sessionId;
    const tenantId = user.tenantId || user.tenant_id;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const _ownQ = await env2.DB.prepare("SELECT id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?").bind(sessionId, user.userId).first();
    if (!_ownQ)
      return jsonResponse3({ error: "Session not found" }, 404);
    const [settingsRow, hardwareSetsRows, unaffirmedCountRow, lineItemsRows] = await Promise.all([
      env2.DB.prepare(`SELECT * FROM takeoff_settings WHERE session_id = ?`).bind(sessionId).first(),
      env2.DB.prepare(`
        SELECT hs.id, hs.set_number, hs.set_name, hs.door_count, hs.notes,
               hs.session_id, hs.unit_price_override
        FROM hardware_sets hs
        WHERE hs.session_id = ? AND hs.affirmed = 1
        ORDER BY hs.set_number
      `).bind(sessionId).all(),
      env2.DB.prepare(`
        SELECT COUNT(*) as cnt FROM hardware_sets WHERE session_id = ? AND (affirmed IS NULL OR affirmed = 0)
      `).bind(sessionId).first(),
      env2.DB.prepare(`
        SELECT * FROM takeoff_line_items WHERE session_id = ? ORDER BY category, sort_order
      `).bind(sessionId).all()
    ]);
    const settings = settingsRow || {};
    const hardwareSets = hardwareSetsRows?.results || [];
    const lineItems = lineItemsRows?.results || [];
    const unaffirmedSetCount = unaffirmedCountRow?.cnt || 0;
    for (const set of hardwareSets) {
      const compsResult = await env2.DB.prepare(`
        SELECT component_type, quantity, manufacturer, model, finish, uom, unit_price
        FROM hardware_components WHERE set_id = ?
      `).bind(set.id).all();
      set.components = compsResult?.results || [];
      if (set.unit_price_override != null) {
        set.set_unit_price = set.unit_price_override;
      } else {
        let setUnitPrice = 0;
        for (const comp of set.components) {
          const qty = comp.quantity || 0;
          const price = comp.unit_price || 0;
          const uom = (comp.uom || "EA").toUpperCase();
          let factor = 1;
          if (uom === "PR" || uom === "PAIR")
            factor = 2;
          else if (uom === "SET/3" || uom === "SET3")
            factor = 3;
          setUnitPrice += qty * price * factor;
        }
        set.set_unit_price = setUnitPrice;
      }
      set.line_total = set.set_unit_price * (set.door_count || 1);
    }
    const doors = lineItems.filter((i) => i.category === "door");
    const frames = lineItems.filter((i) => i.category === "frame");
    const services = lineItems.filter((i) => i.category === "service");
    const hardwareSubtotal = hardwareSets.reduce((sum2, s) => sum2 + (s.line_total || 0), 0);
    const doorsSubtotal = doors.reduce((sum2, d) => sum2 + (d.quantity || 0) * (d.unit_price || 0), 0);
    const framesSubtotal = frames.reduce((sum2, f) => sum2 + (f.quantity || 0) * (f.unit_price || 0), 0);
    const servicesSubtotal = services.reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const subtotal = hardwareSubtotal + doorsSubtotal + framesSubtotal + servicesSubtotal;
    const taxRate = settings.tax_rate || 0;
    const taxableAmount = hardwareSubtotal + doorsSubtotal + framesSubtotal + services.filter((s) => s.taxable).reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const taxAmount = taxableAmount * taxRate;
    const grandTotal = subtotal + taxAmount;
    const vendorRaw = await env2.DB.prepare(
      `SELECT company_name, company_address, company_phone, company_email, logo_url, affirmed FROM vendor_profile WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const vendorProfile = vendorRaw?.affirmed ? vendorRaw : { company_name: vendorRaw?.company_name || null };
    let logoDataUri = null;
    if (vendorProfile.logo_url) {
      try {
        const logoObj = await env2.UPLOADS.get(vendorProfile.logo_url);
        if (logoObj) {
          const logoBytes = new Uint8Array(await logoObj.arrayBuffer());
          const isPng = logoBytes[0] === 137 && logoBytes[1] === 80;
          const mimeType = isPng ? "image/png" : "image/jpeg";
          const base64 = btoa(String.fromCharCode(...logoBytes));
          logoDataUri = `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {
      }
    }
    let projectData = {};
    const linkedProject = await env2.DB.prepare(
      `SELECT p.* FROM projects p JOIN hardware_extraction_sessions s ON s.project_id = p.id WHERE s.id = ?`
    ).bind(sessionId).first();
    if (linkedProject) {
      projectData = linkedProject.metadata_affirmed ? linkedProject : { id: linkedProject.id, name: linkedProject.name };
    }
    let templateDna = null;
    try {
      const templateRow = await env2.DB.prepare(
        `SELECT layout_dna FROM quote_templates WHERE tenant_id = ? AND is_default = 1`
      ).bind(tenantId).first();
      if (templateRow?.layout_dna) {
        templateDna = JSON.parse(templateRow.layout_dna);
      }
    } catch (e) {
    }
    const maxQuoteResult = await env2.DB.prepare(
      `SELECT COALESCE(MAX(quote_number), 0) + 1 as next_number FROM takeoff_quotes WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const quoteNumber = maxQuoteResult?.next_number || 1;
    const quoteData = {
      vendor: vendorProfile,
      recipient: {
        client_name: projectData.client_name || null,
        client_address: projectData.client_address || null,
        billing_name: projectData.billing_name || null,
        billing_address: projectData.billing_address || null,
        project_name: projectData.name || null,
        dsa_number: projectData.dsa_number || null
      },
      quoteNumber,
      quoteDate: now,
      validityDays: settings.validity_days || 30,
      hardwareSets,
      doors,
      frames,
      services,
      totals: { subtotal, taxableAmount, taxRate, taxAmount, grandTotal },
      settings: {
        show_unit_prices: settings.show_unit_prices !== 0,
        show_extended_prices: settings.show_extended_prices !== 0,
        include_addendum: settings.include_addendum === 1,
        exclusions_text: settings.exclusions_text || "",
        tax_jurisdiction: settings.tax_jurisdiction || ""
      },
      templateDna
    };
    const quoteHtml = generateQuoteHtml(quoteData, logoDataUri);
    let pdfBytes;
    const browser = await puppeteer.launch(env2.BROWSER);
    try {
      const page = await browser.newPage();
      await page.setContent(quoteHtml, { waitUntil: "load" });
      pdfBytes = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" }
      });
    } finally {
      await browser.close();
    }
    const r2Key = `quotes/${sessionId}/${quoteNumber}.pdf`;
    await env2.UPLOADS.put(r2Key, pdfBytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: {
        sessionId,
        quoteNumber: String(quoteNumber),
        tenantId,
        generatedAt: now
      }
    });
    const quoteId = crypto.randomUUID();
    await env2.DB.prepare(`
      INSERT INTO takeoff_quotes
      (id, session_id, tenant_id, quote_number, project_id, subtotal, tax_rate,
       taxable_amount, tax_amount, grand_total, line_item_snapshot, settings_snapshot,
       r2_key, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).bind(
      quoteId,
      sessionId,
      tenantId,
      quoteNumber,
      projectData.id || null,
      subtotal,
      taxRate,
      taxableAmount,
      taxAmount,
      grandTotal,
      JSON.stringify({ hardwareSets, doors, frames, services }),
      JSON.stringify(settings),
      r2Key,
      now
    ).run();
    const response = {
      success: true,
      quoteId,
      quoteNumber,
      grandTotal,
      downloadUrl: `/api/takeoff/quotes/${quoteId}/download`,
      viewUrl: `/quote/${quoteId}/view`,
      r2Key,
      affirmedSets: hardwareSets.length
    };
    if (unaffirmedSetCount > 0) {
      response.unaffirmedSetsExcluded = unaffirmedSetCount;
      response.notice = `${unaffirmedSetCount} hardware set(s) excluded from quote \u2014 pending affirmation.`;
    }
    return jsonResponse3(response);
  } catch (error5) {
    console.error("[Takeoff Generate Quote] Error:", error5);
    return jsonResponse3({ error: "Failed to generate quote", details: error5.message }, 500);
  }
});
router.post("/api/takeoff/project/:projectId/generate-quote", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const projectId = request2.params.projectId;
    const tenantId = user.tenantId || user.tenant_id;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const project = await env2.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const sessionsResult = await env2.DB.prepare(`
      SELECT id, filename, document_type, created_at
      FROM hardware_extraction_sessions WHERE project_id = ? ORDER BY created_at ASC
    `).bind(projectId).all();
    const sessions2 = sessionsResult.results || [];
    const sessionIds = sessions2.map((s) => s.id);
    if (sessionIds.length === 0) {
      return jsonResponse3({ error: "No sessions linked to this project. Link sessions before generating a quote." }, 400);
    }
    const placeholders = sessionIds.map(() => "?").join(",");
    const hwScheduleSessionIds = sessions2.filter((s) => s.document_type === "hardware_schedule").map((s) => s.id);
    const doorScheduleSessionIds = sessions2.filter((s) => s.document_type === "door_schedule").map((s) => s.id);
    const canonicalSetSessionIds = hwScheduleSessionIds.length ? hwScheduleSessionIds : sessionIds;
    const setPlaceholders = canonicalSetSessionIds.map(() => "?").join(",");
    const hardwareSetsResult = await env2.DB.prepare(`
      SELECT hs.id, hs.set_number, hs.set_name, hs.door_count, hs.notes,
             hs.session_id, hs.unit_price_override, hs.affirmed
      FROM hardware_sets hs
      WHERE hs.session_id IN (${setPlaceholders})
      ORDER BY hs.set_number
    `).bind(...canonicalSetSessionIds).all();
    const hardwareSets = hardwareSetsResult?.results || [];
    const affirmedSetCount = hardwareSets.filter((s) => s.affirmed === 1).length;
    const unaffirmedSetCount = hardwareSets.length - affirmedSetCount;
    const extractedCompsBySetNumber = {};
    try {
      const hpeRows = await env2.DB.prepare(`
        SELECT extracted_data FROM hardware_page_extractions
        WHERE session_id IN (${setPlaceholders})
      `).bind(...canonicalSetSessionIds).all();
      for (const row of hpeRows?.results || []) {
        let data = null;
        try {
          data = JSON.parse(row.extracted_data);
        } catch (e) {
          continue;
        }
        for (const g of data?.hardware_groups || []) {
          const key = String(g.set_number ?? g.group_number ?? "").trim();
          if (!key)
            continue;
          const comps = (g.components || []).map((c) => ({
            component_type: c.component_type || c.type || "",
            quantity: c.quantity || 0,
            manufacturer: c.manufacturer_code || c.manufacturer || "",
            model: c.model_number || c.model || "",
            finish: c.finish_code || c.finish || "",
            uom: c.uom || "EA",
            unit_price: null,
            source: "extracted_pending_review"
          }));
          if (!extractedCompsBySetNumber[key])
            extractedCompsBySetNumber[key] = comps;
        }
      }
    } catch (e) {
    }
    let skeletonSetsExcluded = 0;
    if (hwScheduleSessionIds.length && hwScheduleSessionIds.length < sessionIds.length) {
      const nonCanonical = sessionIds.filter((id) => !hwScheduleSessionIds.includes(id));
      const ncPh = nonCanonical.map(() => "?").join(",");
      const sk = await env2.DB.prepare(
        `SELECT COUNT(*) AS n FROM hardware_sets WHERE session_id IN (${ncPh})`
      ).bind(...nonCanonical).first();
      skeletonSetsExcluded = sk?.n || 0;
    }
    let markCountsBySet = null;
    let markJoin = null;
    if (doorScheduleSessionIds.length) {
      const dsPh = doorScheduleSessionIds.map(() => "?").join(",");
      const mc = await env2.DB.prepare(`
        SELECT hardware_set_id, COUNT(*) AS cnt
        FROM door_schedule_entries
        WHERE session_id IN (${dsPh}) AND hardware_set_id IS NOT NULL
        GROUP BY hardware_set_id
      `).bind(...doorScheduleSessionIds).all();
      markCountsBySet = {};
      for (const r of mc?.results || [])
        markCountsBySet[r.hardware_set_id] = r.cnt;
      const honesty = await env2.DB.prepare(`
        SELECT COUNT(*) AS total,
               SUM(validation_status = 'affirmed') AS affirmed,
               SUM(hardware_set_id IS NOT NULL) AS linked
        FROM door_schedule_entries WHERE session_id IN (${dsPh})
      `).bind(...doorScheduleSessionIds).first();
      markJoin = {
        door_count_source: "linked_marks",
        total_marks: honesty?.total || 0,
        affirmed_marks: honesty?.affirmed || 0,
        linked_marks: honesty?.linked || 0,
        affirmation_percent: honesty?.total ? Math.round(honesty.affirmed / honesty.total * 100) : 0
      };
    }
    let compsFromTables = 0;
    let compsFromExtraction = 0;
    for (const set of hardwareSets) {
      const compsResult = await env2.DB.prepare(`
        SELECT component_type, quantity, manufacturer, model, finish, uom, unit_price
        FROM hardware_components WHERE set_id = ?
      `).bind(set.id).all();
      set.components = compsResult?.results || [];
      if (set.components.length) {
        compsFromTables += set.components.length;
      } else {
        const extracted = extractedCompsBySetNumber[String(set.set_number ?? "").trim()];
        if (extracted && extracted.length) {
          set.components = extracted;
          set.components_source = "extracted_pending_review";
          compsFromExtraction += extracted.length;
        }
      }
    }
    const unpriced = [];
    for (const set of hardwareSets) {
      for (const comp of set.components) {
        if (comp.unit_price == null)
          unpriced.push(comp);
      }
    }
    let pricingCoverage = null;
    if (unpriced.length) {
      const resolved = await resolveCataloguePrices(env2, unpriced);
      let pricedCount = 0;
      for (let i = 0; i < unpriced.length; i++) {
        const r = resolved[i];
        if (r && r.price != null) {
          unpriced[i].unit_price = r.price;
          unpriced[i].price_source = "cps_catalogue";
          unpriced[i].price_method = r.method;
          unpriced[i].price_confidence = r.confidence;
          unpriced[i].price_provenance = r.provenance;
          pricedCount++;
        }
      }
      pricingCoverage = {
        components_needing_price: unpriced.length,
        priced_from_catalogue: pricedCount,
        coverage_percent: Math.round(pricedCount / unpriced.length * 100)
      };
    }
    for (const set of hardwareSets) {
      if (set.unit_price_override != null) {
        set.set_unit_price = set.unit_price_override;
      } else {
        let setUnitPrice = 0;
        for (const comp of set.components) {
          const qty = comp.quantity || 0;
          const price = comp.unit_price || 0;
          const uom = (comp.uom || "EA").toUpperCase();
          let factor = 1;
          if (uom === "PR" || uom === "PAIR")
            factor = 2;
          else if (uom === "SET/3" || uom === "SET3")
            factor = 3;
          setUnitPrice += qty * price * factor;
        }
        set.set_unit_price = setUnitPrice;
      }
      const effectiveDoorCount = markCountsBySet ? markCountsBySet[set.id] || 0 : set.door_count || 1;
      set.door_count = effectiveDoorCount;
      set.line_total = set.set_unit_price * effectiveDoorCount;
    }
    const lineItemsResult = await env2.DB.prepare(`
      SELECT * FROM takeoff_line_items WHERE session_id IN (${placeholders})
      ORDER BY category, sort_order
    `).bind(...sessionIds).all();
    const lineItems = lineItemsResult?.results || [];
    const doors = lineItems.filter((i) => i.category === "door");
    const frames = lineItems.filter((i) => i.category === "frame");
    const services = lineItems.filter((i) => i.category === "service");
    const hardwareSubtotal = hardwareSets.reduce((sum2, s) => sum2 + (s.line_total || 0), 0);
    const doorsSubtotal = doors.reduce((sum2, d) => sum2 + (d.quantity || 0) * (d.unit_price || 0), 0);
    const framesSubtotal = frames.reduce((sum2, f) => sum2 + (f.quantity || 0) * (f.unit_price || 0), 0);
    const servicesSubtotal = services.reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const subtotal = hardwareSubtotal + doorsSubtotal + framesSubtotal + servicesSubtotal;
    const settings = await env2.DB.prepare(`
      SELECT * FROM takeoff_settings WHERE session_id IN (${placeholders}) LIMIT 1
    `).bind(...sessionIds).first() || {};
    const taxRate = settings.tax_rate || 0;
    const taxableAmount = hardwareSubtotal + doorsSubtotal + framesSubtotal + services.filter((s) => s.taxable).reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const taxAmount = taxableAmount * taxRate;
    const grandTotal = subtotal + taxAmount;
    const vendorRaw = await env2.DB.prepare(
      `SELECT company_name, company_address, company_phone, company_email, logo_url, affirmed FROM vendor_profile WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const vendorProfile = vendorRaw?.affirmed ? vendorRaw : { company_name: vendorRaw?.company_name || null };
    let logoDataUri = null;
    if (vendorProfile.logo_url) {
      try {
        const logoObj = await env2.UPLOADS.get(vendorProfile.logo_url);
        if (logoObj) {
          const logoBytes = new Uint8Array(await logoObj.arrayBuffer());
          const isPng = logoBytes[0] === 137 && logoBytes[1] === 80;
          const mimeType = isPng ? "image/png" : "image/jpeg";
          const base64 = btoa(String.fromCharCode(...logoBytes));
          logoDataUri = `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {
      }
    }
    const projectData = project.metadata_affirmed ? project : { name: project.name };
    let templateDna = null;
    try {
      const templateRow = await env2.DB.prepare(
        `SELECT layout_dna FROM quote_templates WHERE tenant_id = ? AND is_default = 1`
      ).bind(tenantId).first();
      if (templateRow?.layout_dna) {
        templateDna = JSON.parse(templateRow.layout_dna);
      }
    } catch (e) {
    }
    const maxQuoteResult = await env2.DB.prepare(
      `SELECT COALESCE(MAX(quote_number), 0) + 1 as next_number FROM takeoff_quotes WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const quoteNumber = maxQuoteResult?.next_number || 1;
    const quoteData = {
      vendor: vendorProfile,
      recipient: {
        client_name: projectData.client_name || null,
        client_address: projectData.client_address || null,
        billing_name: projectData.billing_name || null,
        billing_address: projectData.billing_address || null,
        project_name: projectData.name || null,
        dsa_number: projectData.dsa_number || null
      },
      quoteNumber,
      quoteDate: now,
      validityDays: settings.validity_days || 30,
      hardwareSets,
      doors,
      frames,
      services,
      totals: { subtotal, taxableAmount, taxRate, taxAmount, grandTotal },
      settings: {
        show_unit_prices: settings.show_unit_prices !== 0,
        show_extended_prices: settings.show_extended_prices !== 0,
        include_addendum: settings.include_addendum === 1,
        exclusions_text: settings.exclusions_text || "",
        tax_jurisdiction: settings.tax_jurisdiction || ""
      },
      templateDna
    };
    const quoteHtml = generateQuoteHtml(quoteData, logoDataUri);
    let pdfBytes;
    const browser = await puppeteer.launch(env2.BROWSER);
    try {
      const page = await browser.newPage();
      await page.setContent(quoteHtml, { waitUntil: "load" });
      pdfBytes = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" }
      });
    } finally {
      await browser.close();
    }
    const r2Key = `quotes/project/${projectId}/${quoteNumber}.pdf`;
    await env2.UPLOADS.put(r2Key, pdfBytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { projectId, quoteNumber: String(quoteNumber), tenantId, generatedAt: now }
    });
    const quoteId = crypto.randomUUID();
    await env2.DB.prepare(`
      INSERT INTO takeoff_quotes
      (id, session_id, tenant_id, quote_number, project_id, subtotal, tax_rate,
       taxable_amount, tax_amount, grand_total, line_item_snapshot, settings_snapshot,
       r2_key, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).bind(
      quoteId,
      sessionIds[0],
      tenantId,
      quoteNumber,
      projectId,
      subtotal,
      taxRate,
      taxableAmount,
      taxAmount,
      grandTotal,
      JSON.stringify({ hardwareSets, doors, frames, services }),
      JSON.stringify(settings),
      r2Key,
      now
    ).run();
    const response = {
      success: true,
      quoteId,
      quoteNumber,
      grandTotal,
      scope: "project",
      projectId,
      sessionCount: sessions2.length,
      downloadUrl: `/api/takeoff/quotes/${quoteId}/download`,
      viewUrl: `/quote/${quoteId}/view`,
      r2Key,
      totalSets: hardwareSets.length
    };
    response.affirmation = {
      sets: {
        total: hardwareSets.length,
        affirmed: affirmedSetCount,
        percent: hardwareSets.length ? Math.round(affirmedSetCount / hardwareSets.length * 100) : 0
      },
      components: {
        from_affirmed_tables: compsFromTables,
        from_extraction_pending_review: compsFromExtraction
      }
    };
    if (markJoin) {
      response.markJoin = markJoin;
      response.affirmation.marks = {
        total: markJoin.total_marks,
        affirmed: markJoin.affirmed_marks,
        percent: markJoin.affirmation_percent
      };
    }
    if (pricingCoverage)
      response.pricing = pricingCoverage;
    if (unaffirmedSetCount > 0 || compsFromExtraction > 0) {
      response.notice = `Draft quote \u2014 includes data pending affirmation (sets ${response.affirmation.sets.percent}% affirmed${markJoin ? `, marks ${markJoin.affirmation_percent}% affirmed` : ""}).`;
    }
    if (skeletonSetsExcluded > 0)
      response.skeletonSetsExcluded = skeletonSetsExcluded;
    return jsonResponse3(response);
  } catch (error5) {
    console.error("[Takeoff Project Generate Quote] Error:", error5);
    return jsonResponse3({ error: "Failed to generate project quote", details: error5.message }, 500);
  }
});
router.get("/api/takeoff/project/:projectId/quotes", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.projectId;
    const tenantId = user.tenantId || user.tenant_id;
    const sessionsResult = await env2.DB.prepare(
      `SELECT id FROM hardware_extraction_sessions WHERE project_id = ?`
    ).bind(projectId).all();
    const sessionIds = (sessionsResult.results || []).map((s) => s.id);
    let quotes = [];
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => "?").join(",");
      const result = await env2.DB.prepare(`
        SELECT id, quote_number, grand_total, status, project_id, session_id, created_at,
               access_token, view_count, last_viewed_at, accepted_by, accepted_at, signature_r2_key
        FROM takeoff_quotes
        WHERE tenant_id = ? AND (project_id = ? OR session_id IN (${placeholders}))
        ORDER BY quote_number DESC
      `).bind(tenantId, projectId, ...sessionIds).all();
      quotes = result?.results || [];
    } else {
      const result = await env2.DB.prepare(`
        SELECT id, quote_number, grand_total, status, project_id, session_id, created_at,
               access_token, view_count, last_viewed_at, accepted_by, accepted_at, signature_r2_key
        FROM takeoff_quotes
        WHERE tenant_id = ? AND project_id = ?
        ORDER BY quote_number DESC
      `).bind(tenantId, projectId).all();
      quotes = result?.results || [];
    }
    return jsonResponse3({
      quotes: quotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        grandTotal: q.grand_total,
        status: q.status,
        scope: q.project_id ? "project" : "session",
        createdAt: q.created_at,
        accessToken: q.access_token || null,
        viewCount: q.view_count || 0,
        lastViewedAt: q.last_viewed_at || null,
        acceptedBy: q.accepted_by || null,
        acceptedAt: q.accepted_at || null,
        hasSignature: !!q.signature_r2_key
      }))
    });
  } catch (error5) {
    console.error("[Takeoff Project List Quotes] Error:", error5);
    return jsonResponse3({ error: "Failed to list project quotes", details: error5.message }, 500);
  }
});
router.get("/api/takeoff/session/:sessionId/quotes", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const tenantId = user.tenantId || user.tenant_id;
    const result = await env2.DB.prepare(`
      SELECT id, quote_number, grand_total, status, created_at,
             access_token, view_count, last_viewed_at, accepted_by, accepted_at, signature_r2_key
      FROM takeoff_quotes
      WHERE session_id = ? AND tenant_id = ?
      ORDER BY quote_number DESC
    `).bind(sessionId, tenantId).all();
    return jsonResponse3({
      quotes: (result?.results || []).map((q) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        grandTotal: q.grand_total,
        status: q.status,
        createdAt: q.created_at,
        accessToken: q.access_token || null,
        viewCount: q.view_count || 0,
        lastViewedAt: q.last_viewed_at || null,
        acceptedBy: q.accepted_by || null,
        acceptedAt: q.accepted_at || null,
        hasSignature: !!q.signature_r2_key
      }))
    });
  } catch (error5) {
    console.error("[Takeoff List Quotes] Error:", error5);
    return jsonResponse3({ error: "Failed to list quotes", details: error5.message }, 500);
  }
});
router.get("/api/takeoff/quotes/:quoteId/download", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const quoteId = request2.params.quoteId;
    const tenantId = user.tenantId || user.tenant_id;
    const quote = await env2.DB.prepare(
      `SELECT r2_key, quote_number FROM takeoff_quotes WHERE id = ? AND tenant_id = ?`
    ).bind(quoteId, tenantId).first();
    if (!quote) {
      return jsonResponse3({ error: "Quote not found" }, 404);
    }
    const object = await env2.UPLOADS.get(quote.r2_key);
    if (!object) {
      return jsonResponse3({ error: "Quote PDF not found in storage" }, 404);
    }
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quote-${quote.quote_number}.pdf"`,
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error5) {
    console.error("[Takeoff Download Quote] Error:", error5);
    return jsonResponse3({ error: "Failed to download quote", details: error5.message }, 500);
  }
});
}
