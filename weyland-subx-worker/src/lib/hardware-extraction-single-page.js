// src/lib/hardware-extraction-single-page.js
//
// Ported from weylandai.com's src/legacy-monolith.js (extractSinglePage,
// extractWithIsolatedPdfMode, extractIsolatedPage: lines 132765-132895;
// savePageExtraction/savePageExtraction2/autoEnrichSessionOnSave:
// 132895-133789; detectTextLayer2/extractPdfBookmarks2/getPdfPageCount:
// 132885-132894) for the standalone weyland-subx-worker extraction
// (2026-09-12 microservices push, MICROSERVICES_PUSH.md).
//
// *** REAL, DOCUMENTED GAP - read before assuming full parity ***
// The monolith's extractSinglePage() has THREE fallback tiers:
//   1. Isolated-PDF mode (pdf-lib: slice out just the target page, send
//      that 1-page PDF to Claude) - real, self-contained, ported below
//      unchanged.
//   2. Image-render mode (loadRenderer() -> a ~2,500-line vendored
//      pdfjs-dist + OffscreenCanvas rendering engine still fully INLINE
//      in legacy-monolith.js, never extracted into its own lib/ module -
//      confirmed via this same codebase's own MONOLITH_HELPER_MAP.md,
//      which independently found and deliberately excluded this exact
//      cluster from an earlier extraction pass for the same reason:
//      "genuinely entangled" with vendored-bundle-internal names that
//      don't have real standalone exports to import. Porting it here
//      would mean copy-pasting that whole vendored engine wholesale, not
//      porting a real, already-modular piece of code - out of scope for
//      this pass, tracked as a known gap (see MICROSERVICES_PUSH.md).
//   3. Direct-PDF mode (send the whole PDF to Claude, page-numbered
//      prompt only, no real isolation) - already modular
//      (hardware-extraction-pipeline.js's extractWithDirectPdfMode),
//      real, ported by being imported below.
// loadRenderer() here always returns null (tier 2 disabled, not faked),
// so this function's real behavior is: try tier 1, and if that throws,
// fall straight to tier 3 - both real, both unchanged from production.
// Tier 2 only ever ran as a fallback for tier-1 failures in the first
// place, so this is a narrowing of a fallback path, not a removal of the
// primary one.

import { PDFDocument } from "pdf-lib";
import { arrayBufferToBase643, buildIsolatedPageExtractionPrompt, parseHardwareExtractionResult } from "./hardware-extraction-prompts.js";
import { callClaudeWithPdf } from "./hardware-extraction-vision-adapters.js";
import { extractWithDirectPdfMode } from "./hardware-extraction-pipeline.js";
import { detectTextLayer, extractPdfBookmarks } from "./pdf-metadata.js";
import { materializeAffirmedGroup } from "./hardware-extraction-materialize.js";
import { enrichComponentsWithPricing } from "./pricing.js";
import { extractHardwareGroupsViaEmbeddedGofaineat } from "./hardware-extraction-vision-dispatch.js";

// Tier 2 disabled - see file header. Kept as a function (not inlined
// `null`) so extractSinglePage's real call-and-check shape below is
// unchanged from the monolith's own control flow.
async function loadRenderer() {
  return null;
}

async function extractIsolatedPage(pdfBuffer, pageNumber) {
  const startTime = Date.now();
  const sourcePdf = await PDFDocument.load(pdfBuffer);
  const totalPages = sourcePdf.getPageCount();
  if (pageNumber < 1 || pageNumber > totalPages) {
    throw new Error(`Page ${pageNumber} out of range (PDF has ${totalPages} pages)`);
  }
  const isolatedPdf = await PDFDocument.create();
  const [copiedPage] = await isolatedPdf.copyPages(sourcePdf, [pageNumber - 1]);
  isolatedPdf.addPage(copiedPage);
  const isolatedBytes = await isolatedPdf.save();
  const isolatedBuffer = isolatedBytes.buffer.slice(
    isolatedBytes.byteOffset,
    isolatedBytes.byteOffset + isolatedBytes.byteLength
  );
  const extractTime = Date.now() - startTime;
  const originalSizeKB = (pdfBuffer.byteLength / 1024).toFixed(1);
  const isolatedSizeKB = (isolatedBuffer.byteLength / 1024).toFixed(1);
  console.log(`[Hardware Extractor] Page ${pageNumber} isolated: ${originalSizeKB}KB → ${isolatedSizeKB}KB (${extractTime}ms)`);
  return {
    pageBuffer: isolatedBuffer,
    totalPages,
    extractionTimeMs: extractTime
  };
}

async function extractWithIsolatedPdfMode(pdfBuffer, pageNumber, env2) {
  console.log(`[Hardware Extractor] Using ISOLATED PDF mode for page ${pageNumber}...`);
  const overallStartTime = Date.now();
  const { pageBuffer, totalPages, extractionTimeMs: isolationTime } = await extractIsolatedPage(pdfBuffer, pageNumber);
  const base64Pdf = arrayBufferToBase643(pageBuffer);
  const isolatedSizeKB = (pageBuffer.byteLength / 1024).toFixed(1);
  console.log(`[Hardware Extractor] Isolated PDF size: ${isolatedSizeKB}KB`);
  const prompt = buildIsolatedPageExtractionPrompt(pageNumber, totalPages);
  const extractionStartTime = Date.now();
  const result = await callClaudeWithPdf(base64Pdf, prompt, env2, pageNumber);
  const extractionTime = Date.now() - extractionStartTime;
  console.log(`[Hardware Extractor] Claude response received (${extractionTime}ms)`);
  const parsedResult = parseHardwareExtractionResult(result);
  const totalTime = Date.now() - overallStartTime;
  console.log(`[Hardware Extractor] PAGE ${pageNumber} EXTRACTION COMPLETE (ISOLATED PDF)`);
  return {
    page_number: pageNumber,
    total_pages: totalPages,
    hardware_groups: parsedResult.hardware_groups || [],
    metadata: {
      ...parsedResult.metadata || parsedResult.page_metadata || {},
      extraction_mode: "isolated_pdf",
      page_isolated: true,
      isolated_pdf_size_kb: parseFloat(isolatedSizeKB)
    },
    usage: parsedResult.usage,
    extraction_time_ms: extractionTime,
    isolation_time_ms: isolationTime,
    total_time_ms: totalTime
  };
}

// extractWithEmbeddedGofaineatMode: the real, no-Anthropic-key path (OCR
// via weyland-ocr-worker + structuring via the local Qwen3-8B bridge -
// see hardware-extraction-vision-dispatch.js's
// extractHardwareGroupsViaEmbeddedGofaineat for the full pipeline and its
// header comment for why this is a separate prompt/contract from the
// door-schedule embedded_gofaineat adapter). Added 2026-09-13
// (EXTRACTION_PIPELINE_CUSTOMER_PATH.md Part 5) to fix the real, live
// "ANTHROPIC_API_KEY not configured" 500 that every real click of
// /subx-app's "RUN EXTRACTION" button was hitting - confirmed live before
// this fix, both of the tiers below (isolated-PDF, direct-PDF) depend on
// callClaudeWithPdf, which throws that exact error since
// ANTHROPIC_API_KEY is not, and per direct instruction will not be,
// provisioned on this account ("we do not need an anthropic api key for
// weylandai.com! We do extractions via embedded gofaineats").
//
// No page isolation needed here (unlike the Claude tiers below): the OCR
// step renders the target page directly off the full pdfBuffer via
// weyland-ocr-worker's PDFium rasterizer, given just the page number.
async function extractWithEmbeddedGofaineatMode(pdfBuffer, pageNumber, env2) {
  const totalPages = (await PDFDocument.load(pdfBuffer)).getPageCount();
  if (pageNumber < 1 || pageNumber > totalPages) {
    throw new Error(`Page ${pageNumber} out of range (PDF has ${totalPages} pages)`);
  }
  console.log(`[Hardware Extractor] Using EMBEDDED_GOFAINEAT mode (OCR + local Qwen, no Anthropic key) for page ${pageNumber}/${totalPages}...`);
  return await extractHardwareGroupsViaEmbeddedGofaineat(pdfBuffer, pageNumber, totalPages, env2);
}

export async function extractSinglePage(pdfBuffer, pageNumber, env2) {
  console.log(`[Hardware Extractor] EXTRACTING PAGE ${pageNumber}`);
  // Real account state today (and, per direct instruction, permanently
  // going forward): ANTHROPIC_API_KEY is not configured on this worker,
  // so both Claude-vision tiers below (isolated-PDF, direct-PDF) would
  // just throw "ANTHROPIC_API_KEY not configured" immediately - that WAS
  // this function's real live behavior until this fix. Route straight to
  // the working local pipeline instead of paying for a guaranteed-failing
  // attempt first. If a real ANTHROPIC_API_KEY is ever configured on this
  // worker in the future (a real credential decision this session isn't
  // making), the original higher-fidelity Claude-vision tiers stay intact
  // below and are used automatically - this only changes routing, it
  // doesn't delete the Claude-vision code path.
  if (!env2.ANTHROPIC_API_KEY) {
    return await extractWithEmbeddedGofaineatMode(pdfBuffer.slice(0), pageNumber, env2);
  }
  console.log(`[Hardware Extractor] ANTHROPIC_API_KEY configured - using Claude vision (ISOLATED MODE)`);
  // Fixed 2026-09-09 upstream (see header): each fallback gets its own
  // ArrayBuffer.slice() copy since the isolated-PDF-mode WASM library
  // detaches the buffer it's given as a side effect.
  try {
    console.log(`[Hardware Extractor] Using ISOLATED PDF mode (true page isolation)...`);
    return await extractWithIsolatedPdfMode(pdfBuffer.slice(0), pageNumber, env2);
  } catch (isolationError) {
    console.error(`[Hardware Extractor] Isolated PDF mode failed:`, {
      message: isolationError.message,
      stack: isolationError.stack,
      name: isolationError.name,
      pageNumber,
      pdfSize: pdfBuffer.byteLength
    });
    console.log(`[Hardware Extractor] Falling back to image render mode...`);
  }
  const renderer = await loadRenderer();
  if (renderer) {
    // Unreachable in this worker (loadRenderer() always returns null -
    // see file header) - branch kept so this function's real shape
    // matches production's, not silently rewritten.
    console.log(`[Hardware Extractor] Using image render mode...`);
  }
  console.log(`[Hardware Extractor] WARNING: Using LEGACY full PDF mode (not recommended)...`);
  return await extractWithDirectPdfMode(pdfBuffer.slice(0), pageNumber, env2);
}

export async function detectTextLayer2(pdfBuffer) {
  return detectTextLayer(pdfBuffer);
}

export async function extractPdfBookmarks2(pdfBuffer) {
  return extractPdfBookmarks(pdfBuffer);
}

export async function getPdfPageCount(pdfBuffer) {
  const result = await extractPdfBookmarks(pdfBuffer);
  return result.numPages;
}

// --- savePageExtraction / savePageExtraction2 ---
// Ported verbatim from legacy-monolith.js lines 132895-133789. Pure D1
// read/write plus a call into hardware-extraction-materialize.js's
// materializeAffirmedGroup (provisional draft materialize on every save)
// - no dependency on the excluded rendering engine.

export async function savePageExtraction(sessionId, pageNumber, extractionData, env2, opts = {}) {
  const mergeMode = opts && opts.merge === true;
  const hardwareGroups = extractionData.hardware_groups || extractionData.hardwareGroups || [];
  const setsCount = hardwareGroups.length;
  let componentsCount = 0;
  hardwareGroups.forEach((group3) => {
    componentsCount += (group3.components || []).length;
  });
  console.log(`[Hardware Extractor] Page ${pageNumber}: ${setsCount} sets, ${componentsCount} components`);
  try {
    await env2.DB.prepare(
      "UPDATE hardware_extraction_sessions SET total_pages = ? WHERE id = ? AND total_pages < ?"
    ).bind(pageNumber, sessionId, pageNumber).run();
  } catch (e) {
  }
  const existing = await env2.DB.prepare(`
    SELECT id, extracted_data, affirm_state, extraction_count
    FROM hardware_page_extractions
    WHERE session_id = ? AND page_number = ?
  `).bind(sessionId, pageNumber).first();
  let previousExtractedData = null;
  let previousAffirmState = null;
  let extractionCount = 1;
  let dataToWrite = extractionData;
  if (existing && existing.extracted_data && mergeMode) {
    extractionCount = existing.extraction_count || 1;
    previousExtractedData = existing.previous_extracted_data || null;
    previousAffirmState = existing.affirm_state || null;
    let prior = {};
    try {
      prior = JSON.parse(existing.extracted_data) || {};
    } catch (e) {
      prior = {};
    }
    const priorGroups = prior.hardware_groups || prior.hardwareGroups || [];
    const incomingGroups = hardwareGroups;
    const sig = (g) => `${g && g.group_number != null ? g.group_number : ""}::${g && g.group_name || ""}::${g && g.components ? g.components.length : 0}`;
    const seen = new Set(priorGroups.map(sig));
    const mergedGroups = priorGroups.slice();
    for (const g of incomingGroups) {
      if (!seen.has(sig(g))) {
        mergedGroups.push(g);
        seen.add(sig(g));
      }
    }
    const priorMatrix = prior.door_hardware_matrix || [];
    const incomingMatrix = extractionData.door_hardware_matrix || [];
    const mSig = (m) => `${m && m.door_number || ""}::${m && m.hardware_set_number || ""}`;
    const mSeen = new Set(priorMatrix.map(mSig));
    const mergedMatrix = priorMatrix.slice();
    for (const m of incomingMatrix) {
      if (!mSeen.has(mSig(m))) {
        mergedMatrix.push(m);
        mSeen.add(mSig(m));
      }
    }
    dataToWrite = {
      ...prior,
      ...extractionData,
      hardware_groups: mergedGroups,
      door_hardware_matrix: mergedMatrix,
      usage: {
        input_tokens: (prior.usage?.input_tokens || 0) + (extractionData.usage?.input_tokens || 0),
        output_tokens: (prior.usage?.output_tokens || 0) + (extractionData.usage?.output_tokens || 0)
      },
      extraction_time_ms: (prior.extraction_time_ms || 0) + (extractionData.extraction_time_ms || 0)
    };
    console.log(`[Hardware Extractor] MERGE page ${pageNumber}: ${priorGroups.length} prior + ${incomingGroups.length} incoming -> ${mergedGroups.length} groups (multi-region accumulate)`);
  } else if (existing && existing.extracted_data) {
    previousExtractedData = existing.extracted_data;
    previousAffirmState = existing.affirm_state || null;
    extractionCount = (existing.extraction_count || 1) + 1;
    console.log(`[Hardware Extractor] Re-extraction detected for page ${pageNumber} (count: ${extractionCount}). Preserving previous extraction.`);
    try {
      await env2.DB.prepare(`
        UPDATE hardware_sets SET affirmed = 0, updated_at = datetime('now')
        WHERE session_id = ? AND approved_from_page = ?
      `).bind(sessionId, pageNumber).run();
      console.log(`[Hardware Extractor] Unaffirmed materialized groups for page ${pageNumber}`);
    } catch (unaffirmErr) {
      console.log(`[Hardware Extractor] Unaffirm materialized groups skipped: ${unaffirmErr.message}`);
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const extractionId = existing?.id || crypto.randomUUID();
  await env2.DB.prepare(`
    INSERT OR REPLACE INTO hardware_page_extractions
    (id, session_id, page_number, extracted_data, status, input_tokens, output_tokens, extraction_time_ms, created_at,
     previous_extracted_data, previous_affirm_state, extraction_count, re_extracted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    extractionId,
    sessionId,
    pageNumber,
    JSON.stringify(dataToWrite),
    "pending_review",
    dataToWrite.usage?.input_tokens || 0,
    dataToWrite.usage?.output_tokens || 0,
    dataToWrite.extraction_time_ms || 0,
    now,
    previousExtractedData,
    previousAffirmState,
    extractionCount,
    existing ? now : null
  ).run();
  const allExtractions = await env2.DB.prepare(`
    SELECT extracted_data FROM hardware_page_extractions WHERE session_id = ?
  `).bind(sessionId).all();
  let totalSets = 0;
  let totalComponents = 0;
  for (const row of allExtractions.results) {
    try {
      const data = JSON.parse(row.extracted_data);
      const groups = data.hardware_groups || data.hardwareGroups || [];
      totalSets += groups.length;
      groups.forEach((g) => {
        totalComponents += (g.components || []).length;
      });
    } catch (e) {
    }
  }
  await env2.DB.prepare(`
    UPDATE hardware_extraction_sessions
    SET pages_processed = (SELECT COUNT(*) FROM hardware_page_extractions WHERE session_id = ?),
        total_sets_extracted = ?,
        total_components_extracted = ?,
        current_page = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(sessionId, totalSets, totalComponents, pageNumber + 1, (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
  console.log(`[Hardware Extractor] Session ${sessionId}: ${totalSets} total sets, ${totalComponents} total components`);
  try {
    const ownerRow = await env2.DB.prepare("SELECT user_id FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
    const ownerId = ownerRow?.user_id || null;
    const provisionalGroups = dataToWrite.hardware_groups || dataToWrite.hardwareGroups || [];
    let provCount = 0;
    for (const group3 of provisionalGroups) {
      try {
        await materializeAffirmedGroup(sessionId, extractionId, pageNumber, group3, ownerId, env2, { provisional: true });
        provCount++;
      } catch (mErr) {
        console.warn(`[Hardware Extractor] Provisional materialize failed for group ${group3.group_number || group3.groupNumber || "?"}: ${mErr.message}`);
      }
    }
    if (provCount > 0)
      console.log(`[Hardware Extractor] Provisional materialize: ${provCount} draft set(s) for page ${pageNumber} (affirmed=0)`);
  } catch (provErr) {
    console.warn(`[Hardware Extractor] Provisional materialization skipped: ${provErr.message}`);
  }
  let bylineDoorsCount = 0;
  for (const group3 of hardwareGroups) {
    const assignedDoors = group3.assigned_doors || [];
    if (assignedDoors.length > 0) {
      for (const doorNumber of assignedDoors) {
        if (doorNumber && typeof doorNumber === "string" && doorNumber.trim()) {
          const bylineMatrixId = crypto.randomUUID();
          try {
            await env2.DB.prepare(`
              INSERT OR REPLACE INTO door_hardware_matrix
              (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, created_at)
              VALUES (?, ?, ?, NULL, NULL, ?, ?, 'byline', 0.95, ?)
            `).bind(
              bylineMatrixId,
              sessionId,
              doorNumber.trim(),
              group3.group_number,
              pageNumber,
              (/* @__PURE__ */ new Date()).toISOString()
            ).run();
            bylineDoorsCount++;
          } catch (bylineError) {
            console.log(`[Hardware Extractor] Byline entry skipped (possibly duplicate): door ${doorNumber} -> set ${group3.group_number}`);
          }
        }
      }
    }
  }
  if (bylineDoorsCount > 0) {
    console.log(`[Hardware Extractor] Page ${pageNumber}: Saved ${bylineDoorsCount} door-to-set mappings from bylines`);
  }
  const doorHardwareMatrix = extractionData.door_hardware_matrix || [];
  if (doorHardwareMatrix.length > 0) {
    for (const mapping of doorHardwareMatrix) {
      const matrixId = crypto.randomUUID();
      try {
        await env2.DB.prepare(`
          INSERT OR REPLACE INTO door_hardware_matrix
          (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'extracted', ?, ?)
        `).bind(
          matrixId,
          sessionId,
          mapping.door_number,
          mapping.door_location || null,
          mapping.door_type || null,
          mapping.hardware_set_number,
          pageNumber,
          mapping.confidence || 0.9,
          (/* @__PURE__ */ new Date()).toISOString()
        ).run();
      } catch (matrixError) {
        console.log(`[Hardware Extractor] Matrix entry skipped (possibly duplicate): door ${mapping.door_number} -> set ${mapping.hardware_set_number}`);
      }
    }
  }
  const detectedNomenclature = extractionData.detected_nomenclature;
  if (detectedNomenclature && (detectedNomenclature.hardware_unit_term || detectedNomenclature.door_identifier_term)) {
    const nomenclatureId = crypto.randomUUID();
    try {
      await env2.DB.prepare(`
        INSERT OR REPLACE INTO session_nomenclature
        (id, session_id, hardware_unit_term, door_identifier_term, detected_from_page, user_override, created_at)
        VALUES (
          COALESCE((SELECT id FROM session_nomenclature WHERE session_id = ?), ?),
          ?,
          COALESCE(?, (SELECT hardware_unit_term FROM session_nomenclature WHERE session_id = ?)),
          COALESCE(?, (SELECT door_identifier_term FROM session_nomenclature WHERE session_id = ?)),
          ?,
          0,
          ?
        )
      `).bind(
        sessionId,
        nomenclatureId,
        sessionId,
        detectedNomenclature.hardware_unit_term || null,
        sessionId,
        detectedNomenclature.door_identifier_term || null,
        sessionId,
        pageNumber,
        (/* @__PURE__ */ new Date()).toISOString()
      ).run();
      console.log(`[Hardware Extractor] Detected nomenclature: ${detectedNomenclature.hardware_unit_term || "set"} / ${detectedNomenclature.door_identifier_term || "door"}`);
    } catch (nomError) {
      console.log(`[Hardware Extractor] Nomenclature storage skipped: ${nomError.message}`);
    }
  }
  console.log(`[Hardware Extractor] Saved page ${pageNumber} extraction to cache`);
}

async function autoEnrichSessionOnSave(sessionId, env2) {
  const compsResult = await env2.DB.prepare(`
    SELECT hc.id, hc.manufacturer, hc.model, hc.finish, hc.catalog_number,
           hc.unit_price, hc.price_source
    FROM hardware_components hc
    JOIN hardware_sets hs ON hc.set_id = hs.id
    WHERE hs.session_id = ?
      AND hc.unit_price IS NULL
  `).bind(sessionId).all();
  const components = compsResult?.results || [];
  if (components.length === 0)
    return { enriched: 0, skipped: 0, total: 0 };
  const results = await enrichComponentsWithPricing(components, env2);
  console.log(`[CPS AutoEnrich] ${sessionId}: ${results.enriched}/${components.length} priced on finalize (${results.skipped} skipped)`);
  return { enriched: results.enriched, skipped: results.skipped, total: components.length };
}

export async function savePageExtraction2(sessionId, pageNumber, extractionResult, env2, options) {
  const saved = await savePageExtraction(sessionId, pageNumber, extractionResult, env2, options);
  try {
    await autoEnrichSessionOnSave(sessionId, env2);
  } catch (e) {
    console.warn(`[CPS AutoEnrich] ${sessionId} p${pageNumber}: non-blocking failure:`, e.message);
  }
  return saved;
}
