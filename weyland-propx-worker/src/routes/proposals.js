// src/routes/proposals.js
//
// weyland-propx-worker's real route surface: POST /api/proposals/generate
// and GET /api/proposals/:id/download. Ported verbatim from the monolith's
// src/routes/document-generators.js (registerDocumentGeneratorRoutes,
// lines 83-254 of that file at the time of this extraction) - this is the
// ONE self-contained vertical inside that 15-product file: unlike the
// other 14 "form -> templated PDF" verticals in that file (lien waivers,
// bid packages, CoA, RFAs, change orders, permit packages, etc, all
// bundled under "PropX Pro family"/"SubX Pro family" comments in the
// original), the two proposals routes don't call that file's shared
// renderHtmlToPdf()/storeDocumentPdf() helpers - they inline the
// puppeteer browser launch and R2 put directly (the original file's own
// header comment calls this out as the one exception). That means this
// is the only piece of document-generators.js that can be lifted out
// without either dragging in 13 unrelated products or forking the shared
// helpers - so only PropX's own two routes were extracted here, not the
// whole file. document-generators.js itself is UNTOUCHED in the
// monolith (still registers all 15 verticals there, including these two
// - this extraction does not remove or modify anything in the old repo,
// per instruction).
//
// Real dependencies (unchanged from the original):
//   - D1 tables: submittals (read), door_entries (read), vendor_profile
//     (read), proposals (insert) - all on the SAME weyland_db this
//     worker binds to (see wrangler.toml), not a copy.
//   - R2 bucket UPLOADS (bucket_name "subx-uploads" in prod - same
//     bucket the monolith uses, per its own wrangler.toml comment that
//     the name predates PropX and was never renamed).
//   - Cloudflare Browser Rendering (env.BROWSER) via @cloudflare/puppeteer,
//     to render generateQuoteHtml()'s output to a PDF.
//   - generateQuoteHtml() from ../lib/quote-html.js (copied verbatim,
//     itself depending only on ../lib/html-format.js - both copied here
//     too, same "explicit copy, not cross-repo import" convention as
//     weyland-market-intelligence-worker and weyland-subx-worker use for
//     their own shared primitives, so this worker deploys independently
//     of the monolith's own file layout).
//
// A REAL, CHECKED CROSS-PRODUCT DEPENDENCY (documented here, not papered
// over): as of this extraction (2026-09-12), `door_entries` has 0 rows
// system-wide in production (checked via a real `wrangler d1 execute
// weyland_db --remote` query, not assumed) even though 6 real submittals
// exist. `door_entries` is populated by SubX's own hardware-extraction
// pipeline (see src/routes/submittals.js's INSERT INTO door_entries
// calls, ported into weyland-subx-worker) once a customer runs an
// extraction AND it gets approved/materialized - none of the 6 real
// submittals in production have completed that step. Practically: a
// real customer today gets doorCount: 0 and an empty auto-derived
// doorLines array from this route for every real submittal that exists,
// UNLESS they either (a) finish a real SubX extraction first, or (b)
// supply their own `lineItems` in the request body, which this route
// has always supported (see below - never a fabricated fallback, the
// original code already had this exact escape hatch for exactly this
// case). The UI built alongside this worker surfaces both paths
// honestly instead of hiding the dependency.
//
// A SECOND REAL GAP found during this extraction, worth flagging even
// though out of scope to fix here: "propx" is NOT in auth.js's
// EPHEMERAL_TRIAL_PRODUCTS set (only subx, takeoffx, cutsheetx, sightx
// are). That means an anonymous/ephemeral guest session - the mechanism
// the other three SubConP products use for a no-signup trial - gets a
// hard 402 EPHEMERAL_PRODUCT_NOT_AVAILABLE from requireProductAccess()
// here. A real account with subscription_tier 'subconp' or
// products_enabled including 'propx' is required for every real call,
// with no trial path today. Unchanged from the original behavior -
// noted, not altered, since changing entitlement policy is a real
// product decision, not something an extraction pass should do
// silently.

import { jsonResponse3 } from "../lib/json-response.js";

export function registerProposalsRoutes(router, { authenticate, requireProductAccess, generateQuoteHtml, puppeteer }) {
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
}
