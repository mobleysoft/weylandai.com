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
// 2026-10-04: "propx" IS now in auth.js's EPHEMERAL_TRIAL_PRODUCTS set
// (the earlier header note about it being missing is obsolete), so an
// ephemeral guest passes requireProductAccess here. But /generate still
// needs a submittalId the guest owns - and an ephemeral session owns no
// submittals (userId is null) - so a guest could never actually run the
// engine. POST /api/proposals/demo (below) closes that gap honestly: it
// prices a FIXED, clearly-labeled sample bill of materials through the
// exact same normalizeLineItems() / computeTotals() / buildQuoteData() /
// generateQuoteHtml() / renderQuotePdf() code path the paid route runs
// (those helpers were extracted out of the generate handler for exactly
// this reason - one pricing implementation, not two), and does NOT write
// to the real proposals table or R2 (a demo must not mint real quote
// numbers or pollute tenant data). It is rate-limited per session via
// the DEMO_RATE_LIMITER binding in wrangler.toml.

import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { jsonResponse3 } from "../lib/json-response.js";
import { listSources, loadSource } from "../lib/proposal-sources.js";
// PriceX's own pricer: components the schedule gives no price are priced from the makers' books.
import { priceItem } from "../../../weyland-forms-worker/src/routes/pricex.js";

// 2026-10-07: PropX prices data the caller really has. GET
// /api/proposals/sources lists it (the caller's SubX extraction sessions,
// their legacy submittals, and SubX's demo door schedule, The WeylandAI
// Building, for anyone with no schedule yet); GET
// /api/proposals/sources/:kind/:id returns one schedule with line items
// derived from it (lib/proposal-sources.js); POST /api/proposals/generate
// takes { source: {kind, id} } as well as the legacy { submittalId }. An
// account's proposal is stored as before (proposals row + R2 PDF, quote
// number); a guest session's is rendered and returned inline (pdfBase64),
// not stored and rate-limited, the same posture as /demo. GET
// /api/proposals/mine lists the account's stored proposals.

// ---------------------------------------------------------------------
// Shared pricing / document helpers. Extracted 2026-10-04 from the inline
// body of POST /api/proposals/generate so the demo route can reuse them
// byte-for-byte. Behavior of /generate is unchanged.
// ---------------------------------------------------------------------

// Customer-supplied line items -> priced door lines. Never invents a price:
// a missing unit price is 0, exactly as the original inline code did.
export function normalizeLineItems(lineItems) {
  return lineItems.map((li) => ({
    door_type: li.description || li.door_type || "Item",
    material: li.material || null,
    size: li.size || null,
    fire_rating: li.fireRating || li.fire_rating || null,
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unitPrice ?? li.unit_price) || 0,
    notes: li.notes || null
  }));
}

// Real extracted door_entries rows -> one row per distinct door group with
// unit_price left at 0 for the estimator to fill in (never a fabricated
// price), exactly as the original inline code did.
export function groupDoorLines(rawDoors) {
  const groups = {};
  for (const d of rawDoors) {
    const key = `${d.door_type || "Door"}|${d.material_code || ""}|${d.fire_rating || ""}`;
    if (!groups[key]) {
      groups[key] = { door_type: d.door_type || "Door", material: d.material_code || null, fire_rating: d.fire_rating || null, size: null, quantity: 0, unit_price: 0, notes: null };
    }
    groups[key].quantity++;
  }
  return Object.values(groups);
}

// Money is carried in whole cents so a proposal never shows 897.5980000000001.
const cents = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function computeTotals(doorLines, taxRate) {
  const subtotal = cents(doorLines.reduce((sum2, d) => sum2 + cents(d.quantity * d.unit_price), 0));
  const effectiveTaxRate = Number(taxRate) || 0;
  const taxAmount = cents(subtotal * effectiveTaxRate);
  const grandTotal = cents(subtotal + taxAmount);
  return { subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal };
}

export const DEFAULT_EXCLUSIONS_TEXT = "This proposal is based on the door schedule extracted from the referenced submittal. Final scope, pricing, and material sourcing are subject to verification against full project specifications and current supplier availability.";

export async function loadVendorProfile(env2, tenantId) {
  const vendorRaw = await env2.DB.prepare(
    `SELECT company_name, company_address, company_phone, company_email, logo_url, affirmed FROM vendor_profile WHERE tenant_id = ?`
  ).bind(tenantId).first();
  return vendorRaw?.affirmed ? vendorRaw : { company_name: vendorRaw?.company_name || null };
}

export function buildQuoteData({ vendorProfile, recipient, quoteNumber, now, validityDays, doorLines, totals, exclusionsText, coverNote }) {
  return {
    vendor: vendorProfile,
    recipient,
    quoteNumber,
    quoteDate: now,
    validityDays,
    doors: doorLines,
    frames: [],
    services: [],
    hardwareSets: [],
    totals,
    settings: {
      show_unit_prices: true,
      show_extended_prices: true,
      exclusions_text: exclusionsText || DEFAULT_EXCLUSIONS_TEXT,
      tax_jurisdiction: null
    },
    coverNote: coverNote || null,
    templateDna: { header: { title_text: "PROPOSAL" } }
  };
}

// Cloudflare Browser Rendering -> Letter PDF bytes. Same launch/newPage/
// setContent/pdf/close sequence the original inline code ran.
export async function renderQuotePdf(puppeteer, env2, quoteHtml) {
  const browser = await puppeteer.launch(env2.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setContent(quoteHtml, { waitUntil: "load" });
    return await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------
// The fixed sample bill of materials the public demo prices. These unit
// prices are INPUTS to the engine, labeled as such in every response -
// illustrative list prices for a 6-opening commercial package, not a live
// supplier quote. Nothing below this table is hand-written: subtotal,
// tax, total, and the rendered document all come out of the same code
// /generate runs.
// ---------------------------------------------------------------------
export const DEMO_SAMPLE_BOM = {
  label: "Sample 6-opening commercial package (fixed demo input)",
  note: "Unit prices are illustrative sample list prices supplied as inputs to the engine - not a live supplier quote. Subtotal, tax, total, and the rendered proposal are computed server-side by the same code POST /api/proposals/generate runs for paying customers.",
  lineItems: [
    { description: "Hollow Metal Door", material: "HM 18ga", size: "3'0\" x 7'0\" x 1-3/4\"", fireRating: "90 min", quantity: 4, unitPrice: 485.00, notes: "Sample list price" },
    { description: "Flush Wood Door", material: "WD 5-ply", size: "3'0\" x 7'0\" x 1-3/4\"", fireRating: "20 min", quantity: 2, unitPrice: 362.00, notes: "Sample list price" },
    { description: "Welded HM Frame", material: "HM 16ga", size: "3'0\" x 7'0\" x 5-3/4\"", fireRating: "90 min", quantity: 6, unitPrice: 198.00, notes: "Sample list price" },
    { description: "HW Set 01 - Exit Device Package", material: null, size: null, fireRating: null, quantity: 4, unitPrice: 1145.00, notes: "Rim exit device, surface closer, hinges, stop - sample list price" },
    { description: "HW Set 02 - Office Lockset Package", material: null, size: null, fireRating: null, quantity: 2, unitPrice: 612.00, notes: "Cylindrical lockset, surface closer, hinges, stop - sample list price" },
    { description: "Field Installation Labor", material: null, size: null, fireRating: null, quantity: 6, unitPrice: 212.50, notes: "2.5 crew-hours per opening at $85.00/hr - sample rate" }
  ]
};

// PDF bytes -> base64 without Buffer (chunked, so large PDFs never blow the
// argument limit of String.fromCharCode).
export function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function limitGuest(env2, user, request2, label) {
  if (!env2.DEMO_RATE_LIMITER || typeof env2.DEMO_RATE_LIMITER.limit !== "function") return null;
  const key = user?.ephemeralToken || user?.userId || user?.id || request2.headers.get("CF-Connecting-IP") || "anon";
  try {
    const { success } = await env2.DEMO_RATE_LIMITER.limit({ key: label + ":" + key });
    if (!success) return jsonResponse3({ success: false, error: { code: "RATE_LIMITED", message: "Proposal rate limit reached for this session - try again in a minute." } }, 429);
  } catch (e) {
    console.log("[PropX] rate limiter error:", e.message);
  }
  return null;
}

export function registerProposalsRoutes(router, { authenticate, requireProductAccess, generateQuoteHtml, puppeteer }) {
  async function gate(request2, env2) {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return { error: error4 };
    const _prodErr = await requireProductAccess(user, env2, "propx");
    if (_prodErr) return { error: _prodErr };
    return { user };
  }

  // What this caller can price - see lib/proposal-sources.js.
  router.get("/api/proposals/sources", async (request2, env2) => {
    const { error, user } = await gate(request2, env2);
    if (error) return error;
    try {
      const { sources, hasOwn } = await listSources(env2.DB, user);
      return jsonResponse3({ success: true, session: user?.ephemeral ? "guest" : "account", hasOwn, sources });
    } catch (e) {
      console.error("[PropX Sources] Error:", e);
      return jsonResponse3({ error: "Failed to list your schedules", details: e.message }, 500);
    }
  });

  router.get("/api/proposals/sources/:kind/:id", async (request2, env2) => {
    const { error, user } = await gate(request2, env2);
    if (error) return error;
    try {
      const loaded = await loadSource(env2.DB, user, request2.params.kind, decodeURIComponent(request2.params.id || ""), { priceItem });
      if (!loaded) return jsonResponse3({ error: "Schedule not found" }, 404);
      return jsonResponse3({ success: true, ...loaded });
    } catch (e) {
      console.error("[PropX Source] Error:", e);
      return jsonResponse3({ error: "Failed to read the schedule", details: e.message }, 500);
    }
  });

  router.get("/api/proposals/mine", async (request2, env2) => {
    const { error, user } = await gate(request2, env2);
    if (error) return error;
    if (!user?.userId || user.ephemeral) return jsonResponse3({ success: true, proposals: [] });
    const r = await env2.DB.prepare(
      "SELECT id, quote_number, client_name, project_address, door_count, subtotal, tax_amount, grand_total, submittal_id, created_at FROM proposals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
    ).bind(user.userId).all();
    return jsonResponse3({ success: true, proposals: (r.results || []).map((x) => ({ ...x, downloadUrl: `/api/proposals/${x.id}/download` })) });
  });

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
        submittalId, source, rfpReference, rfpSummary,
        clientName, clientAddress, projectAddress, bidDueDate,
        validityDays, taxRate, exclusionsText, lineItems
      } = body;
      // What to price: { source: {kind, id} } (session | submittal | demo),
      // or the original { submittalId }.
      const src = source && source.kind ? { kind: String(source.kind), id: String(source.id || "") } : (submittalId ? { kind: "submittal", id: String(submittalId) } : null);
      if (!src) {
        return jsonResponse3({ error: "Choose what to price: source {kind, id} or submittalId is required" }, 400);
      }
      const guest = !!user?.ephemeral || !user?.userId;
      if (guest) {
        const limited = await limitGuest(env2, user, request2, "propx-generate");
        if (limited) return limited;
      }
      const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
      const loaded = await loadSource(env2.DB, user, src.kind, src.id, { priceItem });
      if (!loaded) {
        return jsonResponse3({ error: src.kind === "submittal" ? "Submittal not found" : "Schedule not found" }, 404);
      }
      const rawDoors = loaded.doors;
      const sourceKey = src.kind === "demo" ? "demo-" + src.id : src.id;
      const vendorProfile = await loadVendorProfile(env2, tenantId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      // Priced line items: use what the customer supplied (they may have
      // filled in real unit prices from their own supplier quotes) if given,
      // otherwise the lines derived from the schedule (lib/proposal-sources.js),
      // whose prices come only from the schedule's own data or start at 0 -
      // never an invented price.
      const doorLines = normalizeLineItems((Array.isArray(lineItems) && lineItems.length > 0) ? lineItems : loaded.lines);
      const totals = computeTotals(doorLines, taxRate);
      const { subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal } = totals;
      const effectiveValidityDays = Number(validityDays) || 30;
      const recipient = {
        client_name: clientName || (loaded.project && loaded.project.client_name) || null,
        client_address: clientAddress || (loaded.project && loaded.project.client_address) || null,
        project_name: (loaded.project && loaded.project.name) || loaded.source.name || null,
        project_address: projectAddress || (loaded.project && loaded.project.project_address) || null,
        rfp_reference: rfpReference || null,
        bid_due_date: bidDueDate || null
      };
      const exclusions = exclusionsText || (loaded.source.demo
        ? "Priced from SubX's demo door schedule (The WeylandAI Building, a sample project). " + DEFAULT_EXCLUSIONS_TEXT
        : null);
      // Free to try, pay for the output (weyland-shared/output-access.js):
      // the lines and totals are shown to anyone; the proposal PDF is rendered
      // for the $100 first submittal or a PropX / suite plan. The demo
      // schedule's proposal stays open to everyone.
      const isDemo = src.kind === "demo" || !!(loaded.source && loaded.source.demo);
      const paidOutput = isDemo || (!guest && (await outputAccess(env2, user.userId, "propx")).paid);
      if (!paidOutput) {
        return jsonResponse3({
          success: true,
          stored: false,
          paid: false,
          payment: paymentRequired("The proposal PDF"),
          source: loaded.source,
          doorCount: rawDoors.length,
          lineItemCount: doorLines.length,
          lineItems: doorLines,
          subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal
        });
      }
      if (guest) {
        // A guest session owns no account to store under: render and return
        // the proposal inline, not stored, no quote number minted.
        const quoteData = buildQuoteData({ vendorProfile, recipient, quoteNumber: "PREVIEW", now, validityDays: effectiveValidityDays, doorLines, totals, exclusionsText: exclusions, coverNote: rfpSummary });
        const pdfBytes = await renderQuotePdf(puppeteer, env2, generateQuoteHtml(quoteData, null));
        return jsonResponse3({
          success: true,
          stored: false,
          source: loaded.source,
          quoteNumber: "PREVIEW",
          doorCount: rawDoors.length,
          lineItemCount: doorLines.length,
          lineItems: doorLines,
          subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal,
          pdfBase64: bytesToBase64(pdfBytes)
        });
      }
      const maxQuoteResult = await env2.DB.prepare(
        `SELECT COALESCE(MAX(quote_number), 0) + 1 as next_number FROM proposals WHERE tenant_id = ?`
      ).bind(tenantId).first();
      const quoteNumber = maxQuoteResult?.next_number || 1;
      const proposalId = crypto.randomUUID();
      const quoteData = buildQuoteData({
        vendorProfile,
        recipient,
        quoteNumber,
        now,
        validityDays: effectiveValidityDays,
        doorLines,
        totals,
        exclusionsText: exclusions,
        coverNote: rfpSummary
      });
      const quoteHtml = generateQuoteHtml(quoteData, null);
      const pdfBytes = await renderQuotePdf(puppeteer, env2, quoteHtml);
      const r2Key = `proposals/${sourceKey}/${proposalId}.pdf`;
      await env2.UPLOADS.put(r2Key, pdfBytes, {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: { submittalId: sourceKey, sourceKind: src.kind, tenantId, generatedAt: now }
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
        proposalId, sourceKey, user.userId, tenantId, rfpReference || null, rfpSummary || null, rawDoors.length,
        recipient.client_name, recipient.client_address, recipient.project_address, bidDueDate || null, effectiveValidityDays, effectiveTaxRate,
        quoteData.settings.exclusions_text, subtotal, taxAmount, grandTotal, JSON.stringify(doorLines), quoteNumber,
        r2Key, now, now
      ).run();
      return jsonResponse3({
        success: true,
        stored: true,
        source: loaded.source,
        proposalId,
        quoteNumber,
        doorCount: rawDoors.length,
        lineItemCount: doorLines.length,
        subtotal, taxRate: effectiveTaxRate, taxAmount, grandTotal,
        downloadUrl: `/api/proposals/${proposalId}/download`
      });
    } catch (error5) {
      console.error("[PropX Generate Proposal] Error:", error5);
      return jsonResponse3({ error: "Failed to generate proposal", details: error5.message }, 500);
    }
  });

  // POST /api/proposals/demo - see file header. Accepts ephemeral guest
  // sessions (propx is in EPHEMERAL_TRIAL_PRODUCTS). Body (all optional):
  //   taxRate       0..0.25  (fraction, e.g. 0.0825)
  //   validityDays  1..180
  //   clientName    string, <= 80 chars
  //   format        "json" (default) | "pdf"
  // "json" returns the priced lines, totals, and the rendered proposal
  // HTML (the same generateQuoteHtml output /generate feeds to the PDF
  // renderer). "pdf" runs the real Cloudflare Browser Rendering step and
  // streams the PDF bytes back directly - nothing is stored.
  router.post("/api/proposals/demo", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "propx");
      if (_prodErr) return _prodErr;
    }
    // Per-session rate limit via Cloudflare's Workers Rate Limiting
    // binding (wrangler.toml [[unsafe.bindings]] DEMO_RATE_LIMITER). If
    // the binding is absent we say so in the response rather than
    // pretending a limit was applied.
    let rateLimited = null;
    const rlKey = user?.ephemeralToken || user?.userId || user?.id || request2.headers.get("CF-Connecting-IP") || "anon";
    if (env2.DEMO_RATE_LIMITER && typeof env2.DEMO_RATE_LIMITER.limit === "function") {
      try {
        const { success } = await env2.DEMO_RATE_LIMITER.limit({ key: `propx-demo:${rlKey}` });
        rateLimited = "DEMO_RATE_LIMITER";
        if (!success) {
          return jsonResponse3({
            success: false,
            error: { code: "RATE_LIMITED", message: "Demo rate limit reached for this session - try again in a minute." }
          }, 429);
        }
      } catch (rlErr) {
        console.log("[PropX Demo] rate limiter error:", rlErr.message);
      }
    }
    try {
      let body = {};
      try { body = await request2.json(); } catch (_) { body = {}; }
      const taxRateIn = Number(body.taxRate);
      const taxRate = Number.isFinite(taxRateIn) ? Math.min(Math.max(taxRateIn, 0), 0.25) : 0;
      const validityIn = Number(body.validityDays);
      const validityDays = Number.isFinite(validityIn) && validityIn > 0 ? Math.min(Math.floor(validityIn), 180) : 30;
      const clientName = typeof body.clientName === "string" && body.clientName.trim() ? body.clientName.trim().slice(0, 80) : "Sample Client";
      const format = body.format === "pdf" ? "pdf" : "json";

      const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
      const vendorProfile = await loadVendorProfile(env2, tenantId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const doorLines = normalizeLineItems(DEMO_SAMPLE_BOM.lineItems);
      const totals = computeTotals(doorLines, taxRate);
      const quoteData = buildQuoteData({
        vendorProfile,
        recipient: {
          client_name: clientName,
          client_address: null,
          project_name: "PropX Live Demo - Sample 6-Opening Package",
          project_address: null,
          rfp_reference: "DEMO",
          bid_due_date: null
        },
        quoteNumber: "DEMO",
        now,
        validityDays,
        doorLines,
        totals,
        exclusionsText: "DEMO PROPOSAL - priced from a fixed sample bill of materials with illustrative sample list prices, not a live supplier quote. Generated live by the PropX proposal engine; not a binding offer.",
        coverNote: null
      });
      const quoteHtml = generateQuoteHtml(quoteData, null);

      if (format === "pdf") {
        const pdfBytes = await renderQuotePdf(puppeteer, env2, quoteHtml);
        return new Response(pdfBytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=\"PropX-Demo-Proposal.pdf\"",
            "Cache-Control": "no-store"
          }
        });
      }

      return jsonResponse3({
        success: true,
        demo: true,
        stored: false,
        rateLimiter: rateLimited,
        sampleBom: { label: DEMO_SAMPLE_BOM.label, note: DEMO_SAMPLE_BOM.note },
        engine: {
          pricing: "normalizeLineItems + computeTotals (shared with POST /api/proposals/generate)",
          document: "generateQuoteHtml (shared with POST /api/proposals/generate)",
          pdf: "POST /api/proposals/demo with {format:\"pdf\"} runs renderQuotePdf via Cloudflare Browser Rendering"
        },
        generatedAt: now,
        session: user?.ephemeral ? "ephemeral" : "account",
        recipient: quoteData.recipient,
        validityDays,
        lineItemCount: doorLines.length,
        lineItems: doorLines,
        totals,
        quoteHtml
      });
    } catch (error5) {
      console.error("[PropX Demo Proposal] Error:", error5);
      return jsonResponse3({ error: "Failed to generate demo proposal", details: error5.message }, 500);
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
      if (!String(proposal.submittal_id || "").startsWith("demo-") && !(await outputAccess(env2, user.userId, "propx")).paid) {
        return jsonResponse3(paymentRequired("The proposal PDF"), 402);
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
