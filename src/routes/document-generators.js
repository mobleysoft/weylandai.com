// src/routes/document-generators.js
//
// The 15 "form -> templated PDF" verticals that share renderHtmlToPdf() /
// storeDocumentPdf() / makeDocumentDownloadRoute(): proposals, lien-waivers,
// bid-packages, coa-packages, rfas, change-orders, permit-packages,
// closeout-packages, meeting-notes, inspections, safety-reports,
// survey-reports, spec-sections, drawing-index, asbuilt-diffs (30 routes:
// 15 generate/analyze + 15 download).
//
// Extracted from weyland.worker.js lines 156323-157764 (verified via grep
// at HEAD 4095d9e, per WORKER_MODULARIZATION_MAP.md's own line numbers -
// unchanged since the map was written). Per the map's §4/§6, this is the
// cleanest, most isolated extraction candidate in the file: nothing outside
// this line range calls into it, and it calls nothing product-specific from
// other verticals - with two real exceptions this extraction pass found
// that the map didn't call out:
//
//   1. POST /api/proposals/generate builds its PDF from generateQuoteHtml()
//      (still defined elsewhere in weyland.worker.js/legacy-monolith.js, in
//      the not-yet-extracted "takeoff-quote-generator.js" territory per the
//      map's §0 table) instead of one of this file's own generateXHtml()
//      functions - it's the one generate route that doesn't go through
//      renderHtmlToPdf() either, calling the puppeteer client directly.
//   2. renderHtmlToPdf() (used by the other 14 generate routes) and the
//      proposals route both need the @cloudflare/puppeteer client, which
//      for this phase is still resolved from the vendored/bundled code in
//      legacy-monolith.js rather than imported as the real npm package
//      (package.json already lists "@cloudflare/puppeteer": "1.0.4" as a
//      dependency, but switching this file over to import it directly
//      would mean two independently-resolved copies of the same package
//      existing in the bundle during this partial-extraction phase - one
//      from the real npm import here, one from the still-vendored code
//      everything else uses. Deferred rather than risked in this pass).
//
// Both generateQuoteHtml and the puppeteer client are passed in explicitly
// by the caller (see registerDocumentGeneratorRoutes below) rather than
// imported back from legacy-monolith.js - that would create a real
// circular import (legacy-monolith.js -> this file -> legacy-monolith.js).
// ESM circular imports can work via hoisting/live bindings, but explicit
// parameters make the dependency visible at the call site instead of
// relying on import-order correctness silently. This is the deliberate
// "explicit imports/params over ambient state" choice the task brief asks
// for, applied to the one real place this extraction touches code that
// hasn't been extracted yet.
//
// makeDocumentDownloadRoute is also returned from registerDocumentGenerator
// Routes so the caller can reuse it: one route outside this vertical
// (GET /api/leads/reports/:id/download, part of the not-yet-extracted
// hunt/leads vertical) reuses the same factory, exactly as the map
// documented (§2: "already a shared factory").
//
// This file does not touch the ambient `cors` var flagged in the map's
// §2/§5/§6 as the one real modularization blocker - verified: no reference
// to `cors` anywhere in the extracted line range. Nothing to resolve here;
// noted so the absence is a checked fact, not an assumption.

import { authenticate, requireProductAccess } from "../lib/auth.js";
import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Registers all 30 document-generator routes (15 generate/analyze +
 * download pairs) on the shared router. Route bodies below are unmodified
 * from the original bundle except: esbuild's cosmetic `__name(...)` calls
 * stripped (function .name is already correct from the `function` keyword
 * - see src/README.md for why the other extracted modules do the same),
 * and `puppeteer_cloudflare_default` renamed to the `puppeteer` parameter
 * received here.
 *
 * @param {object} router - the app's NativeRouter instance (still
 *   constructed in legacy-monolith.js for this phase; see
 *   WORKER_MODULARIZATION_MAP.md §2 for why it isn't extracted yet).
 * @param {object} deps
 * @param {Function} deps.generateQuoteHtml - only used by
 *   /api/proposals/generate. Still defined in legacy-monolith.js.
 * @param {object} deps.puppeteer - the @cloudflare/puppeteer client (the
 *   bundle's `puppeteer_cloudflare_default`). Still resolved in
 *   legacy-monolith.js for this phase.
 * @returns {{ makeDocumentDownloadRoute: Function }} so the caller can
 *   register the one external route (leads/reports/download) that reuses
 *   this file's download-route factory.
 */
export function registerDocumentGeneratorRoutes(router, { generateQuoteHtml, puppeteer }) {
router.post("/api/proposals/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "propx");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    const {
      submittalId, rfpReference, rfpSummary,
      clientName, clientAddress, projectAddress, bidDueDate,
      validityDays, taxRate, exclusionsText, lineItems
    } = body;
    if (!submittalId) {
      return jsonResponse3({ error: "submittalId is required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const submittal = await env2.DB.prepare(
      "SELECT * FROM submittals WHERE id = ? AND user_id = ?"
    ).bind(submittalId, user.userId).first();
    if (!submittal) {
      return jsonResponse3({ error: "Submittal not found" }, 404);
    }
    const doorsResult = await env2.DB.prepare(
      "SELECT * FROM door_entries WHERE submittal_id = ? ORDER BY door_number"
    ).bind(submittalId).all();
    const rawDoors = doorsResult.results || [];
    const vendorRaw = await env2.DB.prepare(
      `SELECT company_name, company_address, company_phone, company_email, logo_url, affirmed FROM vendor_profile WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const vendorProfile = vendorRaw?.affirmed ? vendorRaw : { company_name: vendorRaw?.company_name || null };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    // Priced line items: use what the customer supplied (they may have
    // filled in real unit prices from their own supplier quotes) if given,
    // otherwise auto-derive one row per distinct door group from the real
    // extracted schedule with unit_price left at 0 for them to fill in -
    // never invent a price.
    let doorLines;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      doorLines = lineItems.map((li) => ({
        door_type: li.description || li.door_type || "Item",
        material: li.material || null,
        size: li.size || null,
        fire_rating: li.fireRating || li.fire_rating || null,
        quantity: Number(li.quantity) || 0,
        unit_price: Number(li.unitPrice ?? li.unit_price) || 0,
        notes: li.notes || null
      }));
    } else {
      const groups = {};
      for (const d of rawDoors) {
        const key = `${d.door_type || "Door"}|${d.material_code || ""}|${d.fire_rating || ""}`;
        if (!groups[key]) {
          groups[key] = { door_type: d.door_type || "Door", material: d.material_code || null, fire_rating: d.fire_rating || null, size: null, quantity: 0, unit_price: 0, notes: null };
        }
        groups[key].quantity++;
      }
      doorLines = Object.values(groups);
    }
    const subtotal = doorLines.reduce((sum2, d) => sum2 + d.quantity * d.unit_price, 0);
    const effectiveTaxRate = Number(taxRate) || 0;
    const taxAmount = subtotal * effectiveTaxRate;
    const grandTotal = subtotal + taxAmount;
    const effectiveValidityDays = Number(validityDays) || 30;
    const maxQuoteResult = await env2.DB.prepare(
      `SELECT COALESCE(MAX(quote_number), 0) + 1 as next_number FROM proposals WHERE tenant_id = ?`
    ).bind(tenantId).first();
    const quoteNumber = maxQuoteResult?.next_number || 1;
    const proposalId = crypto.randomUUID();
    const quoteData = {
      vendor: vendorProfile,
      recipient: {
        client_name: clientName || null,
        client_address: clientAddress || null,
        project_name: submittal.project_name || null,
        project_address: projectAddress || null,
        rfp_reference: rfpReference || null,
        bid_due_date: bidDueDate || null
      },
      quoteNumber,
      quoteDate: now,
      validityDays: effectiveValidityDays,
      doors: doorLines,
      frames: [],
      services: [],
      hardwareSets: [],
      totals: { subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal },
      settings: {
        show_unit_prices: true,
        show_extended_prices: true,
        exclusions_text: exclusionsText || "This proposal is based on the door schedule extracted from the referenced submittal. Final scope, pricing, and material sourcing are subject to verification against full project specifications and current supplier availability.",
        tax_jurisdiction: null
      },
      coverNote: rfpSummary || null,
      templateDna: { header: { title_text: "PROPOSAL" } }
    };
    const quoteHtml = generateQuoteHtml(quoteData, null);
    let pdfBytes;
    const browser = await puppeteer.launch(env2.BROWSER);
    try {
      const page = await browser.newPage();
      await page.setContent(quoteHtml, { waitUntil: "load" });
      pdfBytes = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
    } finally {
      await browser.close();
    }
    const r2Key = `proposals/${submittalId}/${proposalId}.pdf`;
    await env2.UPLOADS.put(r2Key, pdfBytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { submittalId, tenantId, generatedAt: now }
    });
    await env2.DB.prepare(`
      INSERT INTO proposals (
        id, submittal_id, user_id, tenant_id, rfp_reference, rfp_summary, door_count,
        client_name, client_address, project_address, bid_due_date, validity_days, tax_rate,
        exclusions_text, subtotal, tax_amount, grand_total, line_item_snapshot, quote_number,
        r2_key, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      proposalId, submittalId, user.userId, tenantId, rfpReference || null, rfpSummary || null, rawDoors.length,
      clientName || null, clientAddress || null, projectAddress || null, bidDueDate || null, effectiveValidityDays, effectiveTaxRate,
      quoteData.settings.exclusions_text, subtotal, taxAmount, grandTotal, JSON.stringify(doorLines), quoteNumber,
      r2Key, now, now
    ).run();
    return jsonResponse3({
      success: true,
      proposalId,
      quoteNumber,
      doorCount: rawDoors.length,
      lineItemCount: doorLines.length,
      subtotal, taxAmount, grandTotal,
      downloadUrl: `/api/proposals/${proposalId}/download`
    });
  } catch (error5) {
    console.error("[PropX Generate Proposal] Error:", error5);
    return jsonResponse3({ error: "Failed to generate proposal", details: error5.message }, 500);
  }
});
router.get("/api/proposals/:id/download", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "propx");
    if (_prodErr) return _prodErr;
  }
  try {
    const proposalId = request2.params.id;
    const proposal = await env2.DB.prepare(
      "SELECT r2_key, submittal_id FROM proposals WHERE id = ? AND user_id = ?"
    ).bind(proposalId, user.userId).first();
    if (!proposal) {
      return jsonResponse3({ error: "Proposal not found" }, 404);
    }
    const object = await env2.UPLOADS.get(proposal.r2_key);
    if (!object) {
      return jsonResponse3({ error: "Proposal PDF not found in storage" }, 404);
    }
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Proposal-${proposalId.slice(0, 8)}.pdf"`
      }
    });
  } catch (error5) {
    console.error("[PropX Download Proposal] Error:", error5);
    return jsonResponse3({ error: "Failed to download proposal", details: error5.message }, 500);
  }
});

// ---- Shared document-PDF helpers ------------------------------------------
// Every "form -> templated PDF" product (proposals, lien waivers, bid
// packages, CoA packages, and now RFaX/ChangeOrdX/PermitX/CloseX/NotesX)
// does the exact same three mechanical steps: render HTML to a PDF via the
// Browser Rendering binding, put the bytes in R2, and stream them back on
// download. Pulled out once here instead of copy-pasted per product - the
// part that stays per-product is the HTML template and the D1 columns,
// which genuinely differ document to document.
async function renderHtmlToPdf(env2, html) {
  const browser = await puppeteer.launch(env2.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
  } finally {
    await browser.close();
  }
}
async function storeDocumentPdf(env2, r2Key, pdfBytes, metadata) {
  await env2.UPLOADS.put(r2Key, pdfBytes, { httpMetadata: { contentType: "application/pdf" }, customMetadata: metadata });
}
function makeDocumentDownloadRoute(table, tier, filenamePrefix) {
  return async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    const _prodErr = await requireProductAccess(user, env2, tier);
    if (_prodErr) return _prodErr;
    try {
      const row = await env2.DB.prepare(`SELECT r2_key FROM ${table} WHERE id = ? AND user_id = ?`).bind(request2.params.id, user.userId).first();
      if (!row) return jsonResponse3({ error: `${filenamePrefix} not found` }, 404);
      const object = await env2.UPLOADS.get(row.r2_key);
      if (!object) return jsonResponse3({ error: `${filenamePrefix} PDF not found in storage` }, 404);
      return new Response(object.body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filenamePrefix}-${request2.params.id.slice(0, 8)}.pdf"` } });
    } catch (error5) {
      console.error(`[${filenamePrefix} Download] Error:`, error5);
      return jsonResponse3({ error: `Failed to download ${filenamePrefix.toLowerCase()}`, details: error5.message }, 500);
    }
  };
}

// ---- LienX: lien waiver generator (PropX Pro family) ----------------------
// Generic-form language only, not any state's exact statutory text (several
// states - CA, TX, FL, GA among them - require the precise statutory wording
// to be legally effective). The generated PDF says so explicitly rather than
// implying compliance we haven't verified.
const LIEN_WAIVER_TYPES = {
  conditional_progress: {
    label: "Conditional Waiver and Release on Progress Payment",
    body: (d) => `Upon receipt by the undersigned of a check from ${d.ownerName || "[Owner]"} in the sum of $${Number(d.amount || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, payable to ${d.claimantName || "[Claimant]"}, and when the check has been properly endorsed and has cleared the bank, this document becomes effective to release any mechanic's lien, stop payment notice, or bond right the undersigned has on the job of ${d.ownerName || "[Owner]"} located at ${d.projectAddress || "[Project Address]"} to the extent of the payment described above, for labor, services, equipment, or material furnished through ${d.throughDate || "[Through Date]"} only. This release does not cover retention, extras, or items furnished after the date stated above.`
  },
  unconditional_progress: {
    label: "Unconditional Waiver and Release on Progress Payment",
    body: (d) => `The undersigned has been paid and has received a progress payment in the sum of $${Number(d.amount || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for labor, services, equipment, or material furnished to ${d.ownerName || "[Owner]"} on the job located at ${d.projectAddress || "[Project Address]"} through ${d.throughDate || "[Through Date]"}, and does hereby release any mechanic's lien, stop payment notice, or bond right to the extent of that payment. This release covers a progress payment only and does not cover retention, extras, or items furnished after the date stated above.`
  },
  conditional_final: {
    label: "Conditional Waiver and Release on Final Payment",
    body: (d) => `Upon receipt by the undersigned of a check from ${d.ownerName || "[Owner]"} in the sum of $${Number(d.amount || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, payable to ${d.claimantName || "[Claimant]"}, and when the check has been properly endorsed and has cleared the bank, this document becomes effective to release any mechanic's lien, stop payment notice, or bond right the undersigned has on the job of ${d.ownerName || "[Owner]"} located at ${d.projectAddress || "[Project Address]"}. This is the entire amount owed and due for labor, services, equipment, or material furnished to the job.`
  },
  unconditional_final: {
    label: "Unconditional Waiver and Release on Final Payment",
    body: (d) => `The undersigned has been paid in full for labor, services, equipment, or material furnished to ${d.ownerName || "[Owner]"} on the job located at ${d.projectAddress || "[Project Address]"}, and does hereby waive and release any right to a mechanic's lien, stop payment notice, or bond right against the property for all labor, services, equipment, or material furnished to the job, except for disputed claims, if any, noted below.`
  }
};
function generateLienWaiverHtml(d) {
  const type = LIEN_WAIVER_TYPES[d.waiverType] || LIEN_WAIVER_TYPES.conditional_progress;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:18px;text-transform:uppercase;letter-spacing:.04em;text-align:center;margin:0 0 6px}
    .sub{text-align:center;color:#555;font-size:11px;margin-bottom:34px}
    .row{display:flex;justify-content:space-between;gap:24px;margin-bottom:18px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px}
    .body-text{margin:28px 0;text-align:justify}
    .exceptions{margin-top:24px}
    .exceptions label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    .sig{margin-top:60px;display:flex;justify-content:space-between;gap:40px}
    .sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>${type.label}</h1>
    <div class="sub">Generated by WeylandAI / LienX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Claimant</label><div>${d.claimantName || ""}</div></div>
      <div class="field"><label>Claimant Address</label><div>${d.claimantAddress || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Owner</label><div>${d.ownerName || ""}</div></div>
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
      <div class="field"><label>Through Date</label><div>${d.throughDate || ""}</div></div>
    </div>
    <div class="body-text">${type.body(d)}</div>
    ${d.exceptionsText ? `<div class="exceptions"><label>Exceptions</label><div>${d.exceptionsText}</div></div>` : ""}
    <div class="sig">
      <div>Signature</div>
      <div>Date</div>
    </div>
    <div class="disclaimer">This is a general-form waiver, not any state's exact statutory language. Several states (including California, Texas, Florida, and Georgia) require the precise statutory wording for a waiver to be legally effective - verify against your state's requirements, or have counsel review, before using this on a real project.</div>
  </body></html>`;
}
router.post("/api/lien-waivers/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "lienx");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    if (!LIEN_WAIVER_TYPES[body.waiverType]) {
      return jsonResponse3({ error: "waiverType must be one of: " + Object.keys(LIEN_WAIVER_TYPES).join(", ") }, 400);
    }
    if (!body.claimantName || !body.projectAddress) {
      return jsonResponse3({ error: "claimantName and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const waiverId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const html = generateLienWaiverHtml(body);
    const pdfBytes = await renderHtmlToPdf(env2, html);
    const r2Key = `lien-waivers/${user.userId}/${waiverId}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO lien_waivers (
        id, user_id, tenant_id, waiver_type, claimant_name, claimant_address, owner_name,
        project_name, project_address, through_date, amount, exceptions_text, r2_key,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      waiverId, user.userId, tenantId, body.waiverType, body.claimantName, body.claimantAddress || null,
      body.ownerName || null, body.projectName || null, body.projectAddress, body.throughDate || null,
      Number(body.amount) || 0, body.exceptionsText || null, r2Key, now, now
    ).run();
    return jsonResponse3({ success: true, waiverId, downloadUrl: `/api/lien-waivers/${waiverId}/download` });
  } catch (error5) {
    console.error("[LienX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate lien waiver", details: error5.message }, 500);
  }
});
router.get("/api/lien-waivers/:id/download", makeDocumentDownloadRoute("lien_waivers", "lienx", "LienWaiver"));

// ---- BidX: bid package assembler (PropX Pro family) ------------------------
// Same priced-line-item engine as PropX, but submittalId is optional (a bid
// package doesn't require a SubX submittal to exist) and adds bid-specific
// fields PropX doesn't have: bid bond, addenda acknowledgment.
function generateBidPackageHtml(d) {
  const rows = (d.lineItems || []).map((li) => `<tr><td>${li.description || ""}</td><td>${li.quantity || 0}</td><td>$${Number(li.unitPrice || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>$${(Number(li.quantity || 0) * Number(li.unitPrice || 0)).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.55}
    h1{font-size:22px;letter-spacing:-.01em;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-top:26px;font-size:12px}
    th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:2px solid #333;padding:6px 4px}
    td{padding:7px 4px;border-bottom:1px solid #ddd}
    .totals{display:flex;justify-content:flex-end;margin-top:14px}
    .totals table{width:280px}
    .totals td{border:none;padding:3px 4px}
    .totals .grand td{font-weight:700;font-size:15px;border-top:1px solid #333;padding-top:8px}
    .bond{margin-top:26px;padding:14px;background:#f6f6f2;border:1px solid #ddd;font-size:12px}
    .exclusions{margin-top:22px;font-size:11px;color:#555}
    .sig{margin-top:50px;display:flex;justify-content:space-between;gap:40px}
    .sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555}
  </style></head><body>
    <h1>Bid Package</h1>
    <div class="sub">Prepared via WeylandAI / BidX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Owner / Awarding Authority</label><div>${d.ownerName || ""}</div></div>
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
      <div class="field"><label>Bid Due</label><div>${d.bidDueDate || ""}</div></div>
    </div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><table>
      <tr><td>Subtotal</td><td>$${Number(d.subtotal || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr><td>Tax (${((d.taxRate || 0) * 100).toFixed(2)}%)</td><td>$${Number(d.taxAmount || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      <tr class="grand"><td>Total Bid</td><td>$${Number(d.grandTotal || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
    </table></div>
    ${d.bidBondRequired ? `<div class="bond"><b>Bid Bond:</b> ${d.bidBondPercent || 0}% of bid amount, as required by the solicitation.</div>` : ""}
    ${d.addendaAcknowledged ? `<div class="bond"><b>Addenda Acknowledged:</b> ${d.addendaAcknowledged}</div>` : ""}
    ${d.exclusionsText ? `<div class="exclusions"><b>Exclusions / Terms:</b> ${d.exclusionsText}</div>` : ""}
    <div class="sig"><div>Authorized Signature</div><div>Date</div></div>
  </body></html>`;
}
router.post("/api/bid-packages/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "bidx");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    if (!body.projectName || !body.projectAddress) {
      return jsonResponse3({ error: "projectName and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const subtotal = lineItems.reduce((sum2, li) => sum2 + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);
    const taxRate = Number(body.taxRate) || 0;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;
    const packageData = { ...body, subtotal, taxAmount, grandTotal };
    const bidId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const html = generateBidPackageHtml(packageData);
    const pdfBytes = await renderHtmlToPdf(env2, html);
    const r2Key = `bid-packages/${user.userId}/${bidId}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO bid_packages (
        id, user_id, tenant_id, submittal_id, project_name, project_address, owner_name,
        bid_due_date, bid_bond_required, bid_bond_percent, addenda_acknowledged,
        line_item_snapshot, subtotal, tax_rate, tax_amount, grand_total, exclusions_text,
        r2_key, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      bidId, user.userId, tenantId, body.submittalId || null, body.projectName, body.projectAddress,
      body.ownerName || null, body.bidDueDate || null, body.bidBondRequired ? 1 : 0, Number(body.bidBondPercent) || null,
      body.addendaAcknowledged || null, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, grandTotal,
      body.exclusionsText || null, r2Key, now, now
    ).run();
    return jsonResponse3({ success: true, bidId, subtotal, taxAmount, grandTotal, downloadUrl: `/api/bid-packages/${bidId}/download` });
  } catch (error5) {
    console.error("[BidX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate bid package", details: error5.message }, 500);
  }
});
router.get("/api/bid-packages/:id/download", makeDocumentDownloadRoute("bid_packages", "bidx", "BidPackage"));

// ---- CoA: Certificate of Occupancy *application* package assembler --------
// Deliberately not named/framed as generating an actual Certificate of
// Occupancy - a CO is issued by the local building authority (AHJ), not by
// software. This assembles the submission-ready cover package (cover letter
// + supporting-document checklist) a contractor sends to request one.
const COA_CHECKLIST_ITEMS = [
  "Final building inspection sign-off",
  "Final electrical inspection sign-off",
  "Final plumbing inspection sign-off",
  "Final mechanical/HVAC inspection sign-off",
  "Fire marshal / fire alarm system approval",
  "ADA / accessibility compliance sign-off",
  "As-built drawings (if required by permit)",
  "Utility connection confirmations (water, sewer, gas, electric)"
];
function generateCoaPackageHtml(d) {
  const checked = new Set(d.checklist || []);
  const items = COA_CHECKLIST_ITEMS.map((item) => `<li>${checked.has(item) ? "☑" : "☐"} ${item}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px}
    p.cover{margin:26px 0;text-align:justify}
    ul{margin-top:10px;padding-left:0;list-style:none}
    li{padding:6px 0;border-bottom:1px solid #eee;font-size:12.5px}
    .notes{margin-top:22px;font-size:12px;color:#333}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Certificate of Occupancy &mdash; Application Package</h1>
    <div class="sub">Prepared via WeylandAI / CoA &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Authority Having Jurisdiction</label><div>${d.ahjName || ""}</div></div>
      <div class="field"><label>Permit Number</label><div>${d.permitNumber || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Contact</label><div>${d.contactName || ""}</div></div>
      <div class="field"><label>Phone / Email</label><div>${[d.contactPhone, d.contactEmail].filter(Boolean).join(" / ")}</div></div>
    </div>
    <p class="cover">To ${d.ahjName || "the Authority Having Jurisdiction"}: the undersigned respectfully requests issuance of a Certificate of Occupancy for the above-referenced project. The following supporting documentation is enclosed or has been completed as indicated below.</p>
    <ul>${items}</ul>
    ${d.notes ? `<div class="notes"><b>Notes:</b> ${d.notes}</div>` : ""}
    <div class="disclaimer">This document is a submission cover package prepared by the contractor - it is not a Certificate of Occupancy and has no legal effect on its own. The actual Certificate of Occupancy can only be issued by the Authority Having Jurisdiction after its own inspection and review.</div>
  </body></html>`;
}
router.post("/api/coa-packages/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "coa");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    if (!body.projectName || !body.projectAddress) {
      return jsonResponse3({ error: "projectName and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const coaId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const html = generateCoaPackageHtml(body);
    const pdfBytes = await renderHtmlToPdf(env2, html);
    const r2Key = `coa-packages/${user.userId}/${coaId}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO coa_packages (
        id, user_id, tenant_id, project_name, project_address, ahj_name, permit_number,
        contact_name, contact_phone, contact_email, checklist_snapshot, notes, r2_key,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      coaId, user.userId, tenantId, body.projectName, body.projectAddress, body.ahjName || null,
      body.permitNumber || null, body.contactName || null, body.contactPhone || null, body.contactEmail || null,
      JSON.stringify(body.checklist || []), body.notes || null, r2Key, now, now
    ).run();
    return jsonResponse3({ success: true, coaId, downloadUrl: `/api/coa-packages/${coaId}/download` });
  } catch (error5) {
    console.error("[CoA Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate CoA application package", details: error5.message }, 500);
  }
});
router.get("/api/coa-packages/:id/download", makeDocumentDownloadRoute("coa_packages", "coa", "CoA-Package"));

// ---- RFaX: RFI/RFA generator (SubX Pro family) -----------------------------
function generateRfaHtml(d) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .question{margin:28px 0;padding:16px;background:#f6f6f2;border:1px solid #ddd}
    .question label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;display:block;margin-bottom:6px}
    .sig{margin-top:60px;display:flex;justify-content:space-between;gap:40px}
    .sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555}
  </style></head><body>
    <h1>Request for Information / Action</h1>
    <div class="sub">Prepared via WeylandAI / RFaX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>RFA Number</label><div>${d.rfaNumber || ""}</div></div>
      <div class="field"><label>Date Submitted</label><div>${d.dateSubmitted || ""}</div></div>
      <div class="field"><label>Response Needed By</label><div>${d.responseNeededBy || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Owner / Recipient</label><div>${d.ownerName || ""}</div></div>
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
    </div>
    <div class="row"><div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div></div>
    <div class="row"><div class="field"><label>Subject</label><div>${d.subject || ""}</div></div></div>
    <div class="question"><label>Question / Information Requested</label>${d.question || ""}</div>
    ${d.distributionList ? `<div class="row"><div class="field"><label>Distribution</label><div>${d.distributionList}</div></div></div>` : ""}
    <div class="sig"><div>Response (Owner/Architect)</div><div>Date</div></div>
  </body></html>`;
}
router.post("/api/rfas/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "rfax");
  if (_prodErr) return _prodErr;
  try {
    const body = await request2.json();
    if (!body.subject || !body.question || !body.projectAddress) {
      return jsonResponse3({ error: "subject, question, and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pdfBytes = await renderHtmlToPdf(env2, generateRfaHtml(body));
    const r2Key = `rfas/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO rfas (id, user_id, tenant_id, rfa_number, subject, question, owner_name, project_name, project_address, date_submitted, response_needed_by, distribution_list, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, body.rfaNumber || null, body.subject, body.question, body.ownerName || null, body.projectName || null, body.projectAddress, body.dateSubmitted || null, body.responseNeededBy || null, body.distributionList || null, r2Key, now, now).run();
    return jsonResponse3({ success: true, rfaId: id, downloadUrl: `/api/rfas/${id}/download` });
  } catch (error5) {
    console.error("[RFaX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate RFA", details: error5.message }, 500);
  }
});
router.get("/api/rfas/:id/download", makeDocumentDownloadRoute("rfas", "rfax", "RFA"));

// ---- ChangeOrdX: change order generator (SubX Pro family) ------------------
function generateChangeOrderHtml(d) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .impact{display:flex;gap:24px;margin:26px 0}
    .impact .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .impact .box strong{display:block;font-size:20px}
    .impact .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    .desc{margin:20px 0}
    .desc label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;display:block;margin-bottom:6px}
    .sig{margin-top:50px;display:flex;justify-content:space-between;gap:40px}
    .sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555}
  </style></head><body>
    <h1>Change Order</h1>
    <div class="sub">Prepared via WeylandAI / ChangeOrdX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Change Order #</label><div>${d.changeOrderNumber || ""}</div></div>
      <div class="field"><label>Owner</label><div>${d.ownerName || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
    </div>
    <div class="desc"><label>Description of Change</label>${d.description || ""}</div>
    <div class="desc"><label>Reason</label>${d.reason || ""}</div>
    <div class="impact">
      <div class="box"><strong>$${Number(d.costImpact || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><span>Cost Impact</span></div>
      <div class="box"><strong>${d.scheduleImpactDays || 0}</strong><span>Schedule Impact (days)</span></div>
    </div>
    <div class="sig"><div>Contractor Signature</div><div>Owner/Architect Approval</div></div>
  </body></html>`;
}
router.post("/api/change-orders/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "changeordx");
  if (_prodErr) return _prodErr;
  try {
    const body = await request2.json();
    if (!body.description || !body.projectAddress) {
      return jsonResponse3({ error: "description and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pdfBytes = await renderHtmlToPdf(env2, generateChangeOrderHtml(body));
    const r2Key = `change-orders/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO change_orders (id, user_id, tenant_id, co_number, owner_name, project_name, project_address, description, cost_impact, schedule_impact_days, reason, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, body.changeOrderNumber || null, body.ownerName || null, body.projectName || null, body.projectAddress, body.description, Number(body.costImpact) || 0, Number(body.scheduleImpactDays) || 0, body.reason || null, r2Key, now, now).run();
    return jsonResponse3({ success: true, changeOrderId: id, downloadUrl: `/api/change-orders/${id}/download` });
  } catch (error5) {
    console.error("[ChangeOrdX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate change order", details: error5.message }, 500);
  }
});
router.get("/api/change-orders/:id/download", makeDocumentDownloadRoute("change_orders", "changeordx", "ChangeOrder"));

// ---- PermitX: permit application package assembler (SubX Pro family) ------
// Same framing discipline as CoA: assembles the application package sent to
// the AHJ, not the permit itself - only the AHJ issues a permit.
function generatePermitPackageHtml(d) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .desc{margin:24px 0}
    .desc label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;display:block;margin-bottom:6px}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Permit Application Package</h1>
    <div class="sub">Prepared via WeylandAI / PermitX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Permit Type</label><div>${d.permitType || ""}</div></div>
      <div class="field"><label>Authority Having Jurisdiction</label><div>${d.ahjName || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Applicant</label><div>${d.applicantName || ""}</div></div>
      <div class="field"><label>Applicant Contact</label><div>${d.applicantContact || ""}</div></div>
    </div>
    <div class="desc"><label>Scope of Work</label>${d.scopeDescription || ""}</div>
    <div class="disclaimer">This document is a submission cover package prepared by the applicant - it is not a permit and has no legal effect on its own. The actual permit can only be issued by the Authority Having Jurisdiction after its own review.</div>
  </body></html>`;
}
router.post("/api/permit-packages/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "permitx");
  if (_prodErr) return _prodErr;
  try {
    const body = await request2.json();
    if (!body.projectAddress || !body.scopeDescription) {
      return jsonResponse3({ error: "projectAddress and scopeDescription are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pdfBytes = await renderHtmlToPdf(env2, generatePermitPackageHtml(body));
    const r2Key = `permit-packages/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO permit_packages (id, user_id, tenant_id, permit_type, ahj_name, project_name, project_address, applicant_name, applicant_contact, scope_description, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, body.permitType || null, body.ahjName || null, body.projectName || null, body.projectAddress, body.applicantName || null, body.applicantContact || null, body.scopeDescription, r2Key, now, now).run();
    return jsonResponse3({ success: true, permitId: id, downloadUrl: `/api/permit-packages/${id}/download` });
  } catch (error5) {
    console.error("[PermitX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate permit package", details: error5.message }, 500);
  }
});
router.get("/api/permit-packages/:id/download", makeDocumentDownloadRoute("permit_packages", "permitx", "PermitPackage"));

// ---- CloseX: project closeout package assembler (SubX Pro family) ---------
const CLOSEOUT_CHECKLIST_ITEMS = [
  "Final punch list completed and signed off",
  "As-built drawings delivered",
  "O&M manuals delivered",
  "Warranty documentation delivered",
  "Lien waivers collected from all subs",
  "Final payment application submitted",
  "Keys / access credentials transferred",
  "Training / owner walkthrough completed"
];
function generateCloseoutHtml(d) {
  const checked = new Set(d.checklist || []);
  const items = CLOSEOUT_CHECKLIST_ITEMS.map((item) => `<li>${checked.has(item) ? "☑" : "☐"} ${item}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    ul{margin-top:16px;padding-left:0;list-style:none}
    li{padding:6px 0;border-bottom:1px solid #eee;font-size:12.5px}
    .notes{margin-top:22px;font-size:12px;color:#333}
  </style></head><body>
    <h1>Project Closeout Package</h1>
    <div class="sub">Prepared via WeylandAI / CloseX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Owner</label><div>${d.ownerName || ""}</div></div>
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Project Address</label><div>${d.projectAddress || ""}</div></div>
      <div class="field"><label>Completion Date</label><div>${d.completionDate || ""}</div></div>
    </div>
    <div class="row"><div class="field"><label>Warranty Period</label><div>${d.warrantyPeriod || ""}</div></div></div>
    <ul>${items}</ul>
    ${d.notes ? `<div class="notes"><b>Notes:</b> ${d.notes}</div>` : ""}
  </body></html>`;
}
router.post("/api/closeout-packages/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "closex");
  if (_prodErr) return _prodErr;
  try {
    const body = await request2.json();
    if (!body.projectName || !body.projectAddress) {
      return jsonResponse3({ error: "projectName and projectAddress are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pdfBytes = await renderHtmlToPdf(env2, generateCloseoutHtml(body));
    const r2Key = `closeout-packages/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO closeout_packages (id, user_id, tenant_id, project_name, project_address, owner_name, completion_date, warranty_period, checklist_snapshot, notes, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, body.projectName, body.projectAddress, body.ownerName || null, body.completionDate || null, body.warrantyPeriod || null, JSON.stringify(body.checklist || []), body.notes || null, r2Key, now, now).run();
    return jsonResponse3({ success: true, closeoutId: id, downloadUrl: `/api/closeout-packages/${id}/download` });
  } catch (error5) {
    console.error("[CloseX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate closeout package", details: error5.message }, 500);
  }
});
router.get("/api/closeout-packages/:id/download", makeDocumentDownloadRoute("closeout_packages", "closex", "CloseoutPackage"));

// ---- NotesX: meeting minutes generator (SubX Pro family) -------------------
function generateMeetingNotesHtml(d) {
  const attendees = (d.attendees || "").split(",").map((s) => s.trim()).filter(Boolean).map((a) => `<li>${a}</li>`).join("");
  const agenda = (d.agendaItems || "").split("\n").map((s) => s.trim()).filter(Boolean).map((a) => `<li>${a}</li>`).join("");
  const actions = (d.actionItems || "").split("\n").map((s) => s.trim()).filter(Boolean).map((a) => `<li>${a}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    section{margin-top:24px}
    section h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin:0 0 8px}
    ul{margin:0;padding-left:20px}
    li{padding:3px 0;font-size:12.5px}
  </style></head><body>
    <h1>Meeting Minutes</h1>
    <div class="sub">Prepared via WeylandAI / NotesX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Meeting Date</label><div>${d.meetingDate || ""}</div></div>
      <div class="field"><label>Next Meeting</label><div>${d.nextMeetingDate || ""}</div></div>
    </div>
    <section><h2>Attendees</h2><ul>${attendees || "<li>None recorded</li>"}</ul></section>
    <section><h2>Agenda</h2><ul>${agenda || "<li>None recorded</li>"}</ul></section>
    <section><h2>Action Items</h2><ul>${actions || "<li>None recorded</li>"}</ul></section>
  </body></html>`;
}
router.post("/api/meeting-notes/generate", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "notesx");
  if (_prodErr) return _prodErr;
  try {
    const body = await request2.json();
    if (!body.projectName || !body.meetingDate) {
      return jsonResponse3({ error: "projectName and meetingDate are required" }, 400);
    }
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const pdfBytes = await renderHtmlToPdf(env2, generateMeetingNotesHtml(body));
    const r2Key = `meeting-notes/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO meeting_notes (id, user_id, tenant_id, meeting_date, project_name, attendees, agenda_items, action_items, next_meeting_date, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, body.meetingDate, body.projectName, body.attendees || null, body.agendaItems || null, body.actionItems || null, body.nextMeetingDate || null, r2Key, now, now).run();
    return jsonResponse3({ success: true, notesId: id, downloadUrl: `/api/meeting-notes/${id}/download` });
  } catch (error5) {
    console.error("[NotesX Generate] Error:", error5);
    return jsonResponse3({ error: "Failed to generate meeting notes", details: error5.message }, 500);
  }
});
router.get("/api/meeting-notes/:id/download", makeDocumentDownloadRoute("meeting_notes", "notesx", "MeetingNotes"));

// ---- InspecX: inspection report processor (SightX Pro family) -------------
// First "extraction pattern" product (group 2), built on env.OCR_SERVICE's
// real /extract-text endpoint (PDFium render + Tesseract WASM OCR, no
// external API, no per-call cost) rather than the customer-side "bridge"
// TakeoffX/SubX depend on - that bridge agent doesn't actually exist yet
// (confirmed: the R2 object it downloads returns "key does not exist"), so
// this deliberately doesn't build on it. Findings are a plain keyword
// classifier over the real OCR'd text - same honest style as the existing
// jitagi-detect-schedules.js classifier already deployed in ocr-worker - not
// an LLM call, and the generated summary says so.
const INSPECTION_FAIL_TERMS = ["fail", "deficien", "not compliant", "noncompliant", "corrective action", "reject", "violation", "does not meet"];
const INSPECTION_PASS_TERMS = ["pass", "satisfactory", "compliant", "approved", "meets code", "no deficiencies"];
function classifyInspectionLines(fullText) {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const flagged = [];
  let passCount = 0, failCount = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isFail = INSPECTION_FAIL_TERMS.some((t) => lower.includes(t));
    const isPass = !isFail && INSPECTION_PASS_TERMS.some((t) => lower.includes(t));
    if (isFail) { failCount++; flagged.push({ type: "fail", line }); }
    else if (isPass) { passCount++; }
  }
  return { passCount, failCount, flagged };
}
function generateInspectionSummaryHtml(d) {
  const flaggedHtml = d.flagged.length
    ? d.flagged.map((f) => `<li class="flag-${f.type}">${f.line}</li>`).join("")
    : `<li class="none">No lines matched the fail/deficiency keyword list.</li>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    ul{margin-top:10px;padding-left:20px}
    li{padding:4px 0;font-size:12px}
    li.flag-fail{color:#a8331f}
    li.none{color:#777}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Inspection Report Summary</h1>
    <div class="sub">Prepared via WeylandAI / InspecX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Inspection Type</label><div>${d.inspectionType || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Inspector</label><div>${d.inspectorName || ""}</div></div>
      <div class="field"><label>Inspection Date</label><div>${d.inspectionDate || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.pageCount}</strong><span>Pages Scanned</span></div>
      <div class="box"><strong>${d.passCount}</strong><span>Pass/Satisfactory Lines</span></div>
      <div class="box"><strong>${d.failCount}</strong><span>Flagged Lines</span></div>
    </div>
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#777">Flagged Items</h2>
    <ul>${flaggedHtml}</ul>
    <div class="disclaimer">Flagged items are keyword-matched from OCR'd text (terms like "fail," "deficiency," "corrective action"), not an AI reading for meaning - review the source document for anything this list might miss or mis-flag.</div>
  </body></html>`;
}
router.post("/api/inspections/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "inspecx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "";
    const inspectionType = formData.get("inspectionType") || "";
    const inspectorName = formData.get("inspectorName") || "";
    const inspectionDate = formData.get("inspectionDate") || "";
    if (!file) return jsonResponse3({ error: "No file provided" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const fileBuffer = await file.arrayBuffer();
    const ocrRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Total-Pages": "50" },
      body: fileBuffer
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      return jsonResponse3({ error: "OCR extraction failed", details: errText }, 502);
    }
    const ocrData = await ocrRes.json();
    const fullText = (ocrData.pages || []).map((p) => p.text).join("\n");
    const { passCount, failCount, flagged } = classifyInspectionLines(fullText);
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, inspectionType, inspectorName, inspectionDate, pageCount: ocrData.pageCount || 0, passCount, failCount, flagged };
    const pdfBytes = await renderHtmlToPdf(env2, generateInspectionSummaryHtml(summaryData));
    const r2Key = `inspection-reports/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO inspection_reports (id, user_id, tenant_id, project_name, project_address, inspector_name, inspection_date, inspection_type, raw_text, pass_count, fail_count, flagged_items, page_count, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, inspectorName || null, inspectionDate || null, inspectionType || null, fullText, passCount, failCount, JSON.stringify(flagged), ocrData.pageCount || 0, r2Key, now, now).run();
    return jsonResponse3({ success: true, inspectionId: id, pageCount: ocrData.pageCount || 0, passCount, failCount, downloadUrl: `/api/inspections/${id}/download` });
  } catch (error5) {
    console.error("[InspecX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze inspection report", details: error5.message }, 500);
  }
});
router.get("/api/inspections/:id/download", makeDocumentDownloadRoute("inspection_reports", "inspecx", "InspectionSummary"));

// ---- SafetyX: safety report / incident log processor (SubX Pro family) ----
// Same OCR + keyword-classifier shape as InspecX, different keyword lists
// and framing (incident/hazard language vs. resolved/compliant language).
const SAFETY_FLAG_TERMS = ["incident", "injury", "near miss", "hazard", "unsafe condition", "violation", "not wearing", "lockout", "citation", "fatality", "lost time", "reportable"];
const SAFETY_CLEAR_TERMS = ["resolved", "corrected", "no incidents", "compliant", "ppe worn", "safe condition", "no hazards"];
function classifySafetyLines(fullText) {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const flagged = [];
  let incidentCount = 0, clearCount = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isFlag = SAFETY_FLAG_TERMS.some((t) => lower.includes(t));
    const isClear = !isFlag && SAFETY_CLEAR_TERMS.some((t) => lower.includes(t));
    if (isFlag) { incidentCount++; flagged.push({ type: "flag", line }); }
    else if (isClear) { clearCount++; }
  }
  return { incidentCount, clearCount, flagged };
}
function generateSafetySummaryHtml(d) {
  const flaggedHtml = d.flagged.length
    ? d.flagged.map((f) => `<li class="flag-${f.type}">${f.line}</li>`).join("")
    : `<li class="none">No lines matched the incident/hazard keyword list.</li>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    ul{margin-top:10px;padding-left:20px}
    li{padding:4px 0;font-size:12px}
    li.flag-flag{color:#a8331f}
    li.none{color:#777}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Safety Report Summary</h1>
    <div class="sub">Prepared via WeylandAI / SafetyX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Report Type</label><div>${d.reportType || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Reported By</label><div>${d.reportedBy || ""}</div></div>
      <div class="field"><label>Report Date</label><div>${d.reportDate || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.pageCount}</strong><span>Pages Scanned</span></div>
      <div class="box"><strong>${d.clearCount}</strong><span>Resolved/Compliant Lines</span></div>
      <div class="box"><strong>${d.incidentCount}</strong><span>Flagged Lines</span></div>
    </div>
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#777">Flagged Items</h2>
    <ul>${flaggedHtml}</ul>
    <div class="disclaimer">Flagged items are keyword-matched from OCR'd text (terms like "incident," "hazard," "near miss," "citation"), not an AI reading for meaning - review the source document for anything this list might miss or mis-flag. This summary does not constitute an official OSHA recordability determination.</div>
  </body></html>`;
}
router.post("/api/safety-reports/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "safetyx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "";
    const reportType = formData.get("reportType") || "";
    const reportedBy = formData.get("reportedBy") || "";
    const reportDate = formData.get("reportDate") || "";
    if (!file) return jsonResponse3({ error: "No file provided" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const fileBuffer = await file.arrayBuffer();
    const ocrRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Total-Pages": "50" },
      body: fileBuffer
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      return jsonResponse3({ error: "OCR extraction failed", details: errText }, 502);
    }
    const ocrData = await ocrRes.json();
    const fullText = (ocrData.pages || []).map((p) => p.text).join("\n");
    const { incidentCount, clearCount, flagged } = classifySafetyLines(fullText);
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, reportType, reportedBy, reportDate, pageCount: ocrData.pageCount || 0, incidentCount, clearCount, flagged };
    const pdfBytes = await renderHtmlToPdf(env2, generateSafetySummaryHtml(summaryData));
    const r2Key = `safety-reports/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO safety_reports (id, user_id, tenant_id, project_name, report_type, report_date, reported_by, raw_text, incident_count, clear_count, flagged_items, page_count, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, reportType || null, reportDate || null, reportedBy || null, fullText, incidentCount, clearCount, JSON.stringify(flagged), ocrData.pageCount || 0, r2Key, now, now).run();
    return jsonResponse3({ success: true, safetyReportId: id, pageCount: ocrData.pageCount || 0, incidentCount, clearCount, downloadUrl: `/api/safety-reports/${id}/download` });
  } catch (error5) {
    console.error("[SafetyX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze safety report", details: error5.message }, 500);
  }
});
router.get("/api/safety-reports/:id/download", makeDocumentDownloadRoute("safety_reports", "safetyx", "SafetySummary"));

// ---- SurvX: site survey data processor (SightX Pro family) ----------------
// Same OCR + keyword-classifier shape as InspecX/SafetyX, tuned to the
// language surveys use for unresolved conditions vs. verified ones.
const SURVEY_FLAG_TERMS = ["discrepancy", "conflict", "encroachment", "easement", "unknown utility", "field verify", "not to scale", "unverified", "inconsistent", "overlap", "unresolved"];
const SURVEY_CLEAR_TERMS = ["verified", "confirmed", "as shown", "no conflicts", "no discrepancies", "consistent with"];
function classifySurveyLines(fullText) {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const flagged = [];
  let flaggedCount = 0, clearCount = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isFlag = SURVEY_FLAG_TERMS.some((t) => lower.includes(t));
    const isClear = !isFlag && SURVEY_CLEAR_TERMS.some((t) => lower.includes(t));
    if (isFlag) { flaggedCount++; flagged.push({ type: "flag", line }); }
    else if (isClear) { clearCount++; }
  }
  return { flaggedCount, clearCount, flagged };
}
function generateSurveySummaryHtml(d) {
  const flaggedHtml = d.flagged.length
    ? d.flagged.map((f) => `<li class="flag-${f.type}">${f.line}</li>`).join("")
    : `<li class="none">No lines matched the discrepancy/conflict keyword list.</li>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    ul{margin-top:10px;padding-left:20px}
    li{padding:4px 0;font-size:12px}
    li.flag-flag{color:#a8331f}
    li.none{color:#777}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Site Survey Summary</h1>
    <div class="sub">Prepared via WeylandAI / SurvX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Survey Type</label><div>${d.surveyType || ""}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>Surveyor</label><div>${d.surveyorName || ""}</div></div>
      <div class="field"><label>Survey Date</label><div>${d.surveyDate || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.pageCount}</strong><span>Pages Scanned</span></div>
      <div class="box"><strong>${d.clearCount}</strong><span>Verified/Confirmed Lines</span></div>
      <div class="box"><strong>${d.flaggedCount}</strong><span>Flagged Lines</span></div>
    </div>
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#777">Flagged Items</h2>
    <ul>${flaggedHtml}</ul>
    <div class="disclaimer">Flagged items are keyword-matched from OCR'd text (terms like "discrepancy," "encroachment," "unverified," "field verify"), not an AI reading for meaning - review the source document, and have a licensed surveyor confirm anything this list might miss or mis-flag.</div>
  </body></html>`;
}
router.post("/api/survey-reports/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "survx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "";
    const surveyType = formData.get("surveyType") || "";
    const surveyorName = formData.get("surveyorName") || "";
    const surveyDate = formData.get("surveyDate") || "";
    if (!file) return jsonResponse3({ error: "No file provided" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const fileBuffer = await file.arrayBuffer();
    const ocrRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Total-Pages": "50" },
      body: fileBuffer
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      return jsonResponse3({ error: "OCR extraction failed", details: errText }, 502);
    }
    const ocrData = await ocrRes.json();
    const fullText = (ocrData.pages || []).map((p) => p.text).join("\n");
    const { flaggedCount, clearCount, flagged } = classifySurveyLines(fullText);
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, surveyType, surveyorName, surveyDate, pageCount: ocrData.pageCount || 0, flaggedCount, clearCount, flagged };
    const pdfBytes = await renderHtmlToPdf(env2, generateSurveySummaryHtml(summaryData));
    const r2Key = `survey-reports/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO survey_reports (id, user_id, tenant_id, project_name, survey_type, survey_date, surveyor_name, raw_text, flagged_count, clear_count, flagged_items, page_count, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, surveyType || null, surveyDate || null, surveyorName || null, fullText, flaggedCount, clearCount, JSON.stringify(flagged), ocrData.pageCount || 0, r2Key, now, now).run();
    return jsonResponse3({ success: true, surveyReportId: id, pageCount: ocrData.pageCount || 0, flaggedCount, clearCount, downloadUrl: `/api/survey-reports/${id}/download` });
  } catch (error5) {
    console.error("[SurvX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze survey report", details: error5.message }, 500);
  }
});
router.get("/api/survey-reports/:id/download", makeDocumentDownloadRoute("survey_reports", "survx", "SurveySummary"));

// ---- SpecX: spec section parser (SubX Pro family) --------------------------
// Different shape from InspecX/SafetyX/SurvX on purpose: specs aren't
// pass/fail text, they're organized by CSI MasterFormat section numbers
// (a real public numbering standard - 6 digits, DD SS SS). This detects
// those headers via regex on the real OCR'd text and builds a section
// index, flagging short sections (a real, computable word-count heuristic)
// as worth a closer look - it does not claim to check code compliance,
// since nothing here actually knows the applicable code.
const CSI_SECTION_PATTERN = /\b(\d{2})\s?(\d{2})\s?(\d{2})\b[\s\-–—]*([A-Z][A-Z0-9 ,&/'\-]{3,70})/g;
const CSI_SHORT_SECTION_WORD_THRESHOLD = 30;
function parseSpecSections(fullText) {
  const matches = [...fullText.matchAll(CSI_SECTION_PATTERN)];
  if (!matches.length) return [];
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const number = `${m[1]} ${m[2]} ${m[3]}`;
    const title = m[4].trim().replace(/\s+/g, " ").slice(0, 60);
    const bodyStart = m.index + m[0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : fullText.length;
    const body = fullText.slice(bodyStart, bodyEnd);
    const wordCount = (body.match(/\S+/g) || []).length;
    sections.push({ number, title, wordCount, short: wordCount < CSI_SHORT_SECTION_WORD_THRESHOLD });
  }
  return sections;
}
function generateSpecIndexHtml(d) {
  const rows = d.sections.length
    ? d.sections.map((s) => `<tr class="${s.short ? "short" : ""}"><td>${s.number}</td><td>${s.title}</td><td>${s.wordCount}</td><td>${s.short ? "SHORT - REVIEW" : ""}</td></tr>`).join("")
    : `<tr><td colspan="4" class="none">No CSI-numbered section headers (DD SS SS format) were detected in this document.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
    th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:2px solid #333;padding:6px 4px}
    td{padding:6px 4px;border-bottom:1px solid #eee}
    tr.short td{color:#a8331f}
    td.none{color:#777}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Spec Section Index</h1>
    <div class="sub">Prepared via WeylandAI / SpecX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Spec Date</label><div>${d.specDate || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.pageCount}</strong><span>Pages Scanned</span></div>
      <div class="box"><strong>${d.sections.length}</strong><span>Sections Detected</span></div>
      <div class="box"><strong>${d.shortCount}</strong><span>Short Sections</span></div>
    </div>
    <table><thead><tr><th>Section #</th><th>Title</th><th>Words</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="disclaimer">Sections are detected by CSI MasterFormat-style numbering (DD SS SS) found in the OCR'd text, and "short" sections are flagged by word count only - this is a section index and completeness heuristic, not a code-compliance check. Nothing here evaluates the spec against any applicable building code.</div>
  </body></html>`;
}
router.post("/api/spec-sections/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "specx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "";
    const specDate = formData.get("specDate") || "";
    if (!file) return jsonResponse3({ error: "No file provided" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const fileBuffer = await file.arrayBuffer();
    const ocrRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Total-Pages": "50" },
      body: fileBuffer
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      return jsonResponse3({ error: "OCR extraction failed", details: errText }, 502);
    }
    const ocrData = await ocrRes.json();
    const fullText = (ocrData.pages || []).map((p) => p.text).join("\n");
    const sections = parseSpecSections(fullText);
    const shortCount = sections.filter((s) => s.short).length;
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, specDate, pageCount: ocrData.pageCount || 0, sections, shortCount };
    const pdfBytes = await renderHtmlToPdf(env2, generateSpecIndexHtml(summaryData));
    const r2Key = `spec-sections/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO spec_sections (id, user_id, tenant_id, project_name, spec_date, raw_text, section_count, short_section_count, sections_json, page_count, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, specDate || null, fullText, sections.length, shortCount, JSON.stringify(sections), ocrData.pageCount || 0, r2Key, now, now).run();
    return jsonResponse3({ success: true, specId: id, pageCount: ocrData.pageCount || 0, sectionCount: sections.length, shortCount, downloadUrl: `/api/spec-sections/${id}/download` });
  } catch (error5) {
    console.error("[SpecX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze spec document", details: error5.message }, 500);
  }
});
router.get("/api/spec-sections/:id/download", makeDocumentDownloadRoute("spec_sections", "specx", "SpecIndex"));

// ---- DrawX: drawing set sheet index (TakeoffX Pro family) -----------------
// Same OCR pattern as the SubX Pro extraction products, applied to drawing
// sheets: title blocks and general notes are usually real printed text even
// on a vector/line drawing, so OCR + a sheet-number regex builds a real
// sheet index (number, title) without claiming any symbol/line recognition
// this pipeline doesn't have. Regex verified locally against realistic
// sheet numbering (A-101, M-1.1, S201) before deploying.
const SHEET_NUMBER_PATTERN = /\b([A-Z]{1,2}[\-.]?\d{1,4}(?:\.\d{1,2})?)\b[\s\-–—:]*([A-Z][A-Z0-9 ,&/'\-]{3,60})?/g;
function parseDrawingSheets(fullText) {
  const matches = [...fullText.matchAll(SHEET_NUMBER_PATTERN)];
  const seen = new Set();
  const sheets = [];
  for (const m of matches) {
    const number = m[1];
    if (seen.has(number)) continue;
    seen.add(number);
    sheets.push({ number, title: (m[2] || "").trim().replace(/\s+/g, " ").slice(0, 60) });
  }
  return sheets;
}
function generateDrawingIndexHtml(d) {
  const rows = d.sheets.length
    ? d.sheets.map((s) => `<tr><td>${s.number}</td><td>${s.title || "&mdash;"}</td></tr>`).join("")
    : `<tr><td colspan="2" class="none">No sheet-number patterns (e.g. A-101, M-1.1) were detected in this document.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
    th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:2px solid #333;padding:6px 4px}
    td{padding:6px 4px;border-bottom:1px solid #eee}
    td.none{color:#777}
    .disclaimer{margin-top:50px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Drawing Set Sheet Index</h1>
    <div class="sub">Prepared via WeylandAI / DrawX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Drawing Set Date</label><div>${d.drawingSetDate || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.pageCount}</strong><span>Pages Scanned</span></div>
      <div class="box"><strong>${d.sheets.length}</strong><span>Sheets Indexed</span></div>
    </div>
    <table><thead><tr><th>Sheet #</th><th>Title</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="disclaimer">Sheets are detected from OCR'd title-block text matching common sheet-numbering patterns (e.g. A-101, M-1.1) - this is a sheet index, not drawing content analysis. It doesn't read lines, symbols, or dimensions, and may miss sheets with non-standard numbering or misread similar-looking numbers/letters.</div>
  </body></html>`;
}
router.post("/api/drawing-index/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "drawx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "";
    const drawingSetDate = formData.get("drawingSetDate") || "";
    if (!file) return jsonResponse3({ error: "No file provided" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const fileBuffer = await file.arrayBuffer();
    const ocrRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
      method: "POST",
      headers: { "X-Total-Pages": "50" },
      body: fileBuffer
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      return jsonResponse3({ error: "OCR extraction failed", details: errText }, 502);
    }
    const ocrData = await ocrRes.json();
    const fullText = (ocrData.pages || []).map((p) => p.text).join("\n");
    const sheets = parseDrawingSheets(fullText);
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, drawingSetDate, pageCount: ocrData.pageCount || 0, sheets };
    const pdfBytes = await renderHtmlToPdf(env2, generateDrawingIndexHtml(summaryData));
    const r2Key = `drawing-indexes/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO drawing_indexes (id, user_id, tenant_id, project_name, drawing_set_date, raw_text, sheet_count, sheets_json, page_count, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, drawingSetDate || null, fullText, sheets.length, JSON.stringify(sheets), ocrData.pageCount || 0, r2Key, now, now).run();
    return jsonResponse3({ success: true, drawIndexId: id, pageCount: ocrData.pageCount || 0, sheetCount: sheets.length, downloadUrl: `/api/drawing-index/${id}/download` });
  } catch (error5) {
    console.error("[DrawX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze drawing set", details: error5.message }, 500);
  }
});
router.get("/api/drawing-index/:id/download", makeDocumentDownloadRoute("drawing_indexes", "drawx", "DrawingIndex"));

// ---- AsBuiltX: as-built vs. original pixel-diff (TakeoffX Pro family) -----
// Genuinely different capability from the rest of group 2 - not OCR text,
// a real grid-cell pixel comparison between two page renders via the new
// ocr-worker /diff-pages endpoint (verified end-to-end against two real
// test PDFs before this route was written: correctly returned zero diff on
// identical regions and non-zero exactly where text differed). This is
// literal pixel-value comparison, not markup/redline recognition - it will
// flag scan misalignment and print noise the same as a real field change.
function generateAsBuiltDiffHtml(d) {
  const cellW = 100 / d.gridCols;
  const cellH = 100 / d.gridRows;
  const cells = d.cellDiffs.map((row, gy) =>
    row.map((v, gx) => {
      const alpha = Math.min(1, v * 3);
      return `<div style="position:absolute;left:${(gx * cellW).toFixed(3)}%;top:${(gy * cellH).toFixed(3)}%;width:${cellW.toFixed(3)}%;height:${cellH.toFixed(3)}%;background:rgba(168,51,31,${alpha.toFixed(3)})"></div>`;
    }).join("")
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .row{display:flex;gap:24px;margin-bottom:16px}
    .field{flex:1}
    .field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}
    .field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    .heatmap{position:relative;width:100%;aspect-ratio:${d.width}/${d.height};border:1px solid #999;background:#fafaf8;margin-top:16px}
    .disclaimer{margin-top:30px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>As-Built vs. Original Diff</h1>
    <div class="sub">Prepared via WeylandAI / AsBuiltX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="row">
      <div class="field"><label>Project</label><div>${d.projectName || ""}</div></div>
      <div class="field"><label>Sheet</label><div>${d.sheetLabel || ""}</div></div>
    </div>
    <div class="stats">
      <div class="box"><strong>${d.overallDiffPercent}%</strong><span>Overall Pixel Difference</span></div>
      <div class="box"><strong>${d.gridCols}&times;${d.gridRows}</strong><span>Grid Resolution</span></div>
    </div>
    <div class="heatmap">${cells}</div>
    <div class="disclaimer">This heatmap shows raw pixel-level differences between the two uploaded page renders, in a ${d.gridCols}&times;${d.gridRows} grid - darker cells differ more. It is not markup or redline recognition and does not understand what changed, only that pixels in that region differ. Scan misalignment, scale differences, and print-quality noise will also show up here.</div>
  </body></html>`;
}
router.post("/api/asbuilt-diffs/analyze", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const _prodErr = await requireProductAccess(user, env2, "asbuiltx");
  if (_prodErr) return _prodErr;
  try {
    const formData = await request2.formData();
    const originalFile = formData.get("original");
    const revisedFile = formData.get("revised");
    const projectName = formData.get("projectName") || "";
    const sheetLabel = formData.get("sheetLabel") || "";
    const page = formData.get("page") || "1";
    if (!originalFile || !revisedFile) return jsonResponse3({ error: "Both original and revised files are required" }, 400);
    if (!env2.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
    const diffForm = new FormData();
    diffForm.append("original", originalFile);
    diffForm.append("revised", revisedFile);
    diffForm.append("page", page);
    const diffRes = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/diff-pages", { method: "POST", body: diffForm });
    if (!diffRes.ok) {
      const errText = await diffRes.text();
      return jsonResponse3({ error: "Diff computation failed", details: errText }, 502);
    }
    const diffData = await diffRes.json();
    const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const summaryData = { projectName, sheetLabel, ...diffData };
    const pdfBytes = await renderHtmlToPdf(env2, generateAsBuiltDiffHtml(summaryData));
    const r2Key = `asbuilt-diffs/${user.userId}/${id}.pdf`;
    await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
    await env2.DB.prepare(`
      INSERT INTO asbuilt_diffs (id, user_id, tenant_id, project_name, sheet_label, page_number, overall_diff_percent, grid_json, r2_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(id, user.userId, tenantId, projectName || null, sheetLabel || null, Number(page) || 1, diffData.overallDiffPercent, JSON.stringify(diffData.cellDiffs), r2Key, now, now).run();
    return jsonResponse3({ success: true, diffId: id, overallDiffPercent: diffData.overallDiffPercent, downloadUrl: `/api/asbuilt-diffs/${id}/download` });
  } catch (error5) {
    console.error("[AsBuiltX Analyze] Error:", error5);
    return jsonResponse3({ error: "Failed to analyze as-built diff", details: error5.message }, 500);
  }
});
router.get("/api/asbuilt-diffs/:id/download", makeDocumentDownloadRoute("asbuilt_diffs", "asbuiltx", "AsBuiltDiff"));

  return { makeDocumentDownloadRoute, renderHtmlToPdf, storeDocumentPdf };
}
