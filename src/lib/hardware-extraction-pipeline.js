// src/lib/hardware-extraction-pipeline.js
//
// MONOLITH_HELPER_MAP.md's Cluster A, sub-step (c): the stateful
// save/approve/resolve-contract pipeline - the D1/R2-touching half of
// the Claude-vision hardware/door-schedule extraction engine, built
// on top of sub-step (a) (prompt builders/parsers,
// lib/hardware-extraction-prompts.js) and sub-step (b) (Claude-call
// adapters, lib/hardware-extraction-vision-adapters.js).
//
// This is NOT all of Cluster A's remaining code. A systematic
// call-graph analysis (every remaining function checked for direct or
// *transitive* calls into vendored-bundle-internal names -
// PDFDocument_default, the lazy puppeteer/pdf-renderer __esm loaders -
// or into materializeAffirmedGroup, a real still-inline function from
// a different, not-yet-extracted region) found 8 functions genuinely
// entangled with dependencies outside this phase's scope:
// loadRenderer, extractIsolatedPage, extractSinglePage (calls
// loadRenderer), extractWithIsolatedPdfMode (calls
// extractIsolatedPage), savePageExtraction (calls
// materializeAffirmedGroup), renderRegionAt600DPI2 (puppeteer),
// getOrRenderRegionAt600DPI (calls renderRegionAt600DPI2), and
// extractCore (calls both renderRegionAt600DPI2 and
// savePageExtraction, discovered only via the transitive-closure
// pass, not directly).
//
// A second, separate gap found the same way: detectTextLayer2,
// getPdfPageCount, and extractPdfBookmarks2 all thinly wrap real
// functions (detectTextLayer, extractPdfBookmarks) that live in a
// substantial, self-contained "pdf-metadata.js" real-app-code region
// (still fully inline, ~lines 23502-24752, its own xref/page-tree
// parser - buildXrefMap/getPageCount/resolve/buildPageList/
// getBookmarks) that was never catalogued as one of this map's
// clusters at all. Extracting 3 thin wrappers without their real
// implementation isn't a real extraction - left these 3 inline too.
//
// All 11 excluded functions stay in legacy-monolith.js, tracked as
// real follow-ups (informally "sub-step (d)" for the vendored-bundle
// group, and a new, separate "pdf-metadata.js extraction" for the
// second group - neither anticipated by the original 3-sub-step plan)
// rather than force-extracted with awkward dependency injection for
// names that don't have real exports to import.
//
// This split exists because of a real near-miss in sub-step (b): a
// manually-estimated function boundary there accidentally swallowed
// an unrelated neighboring function. This time, every boundary here
// was computed from a verified sorted list of ALL remaining function
// start lines (not manual reading), cross-checked with a call-graph
// transitive-closure script, AND cross-checked against every real
// top-level name still in legacy-monolith.js (not just an assumed
// "known available" list) before extracting anything - the second
// check is what caught the pdf-metadata.js gap, which the transitive-
// closure pass alone would have missed. See MONOLITH_HELPER_MAP.md
// for the process note this generated.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort - none of these 21 functions had the
// inline-closure variant found in sub-steps (a)/(b).

import {
  arrayBufferToBase643, buildHardwareExtractionPrompt, parseHardwareExtractionResult,
  normalizeComponentType, mapToDhiCategory, extractGrade, buildDirectPdfExtractionPrompt,
  buildPageSpecificExtractionPrompt, applyConstraintOverride, rowToConstraintField,
  buildPromptFromConstraints, buildGenericExtractionPrompt, parseGenericExtractionResult,
  buildDoorScheduleExtractionPrompt, parseDoorScheduleEntry, calculateEntryConfidence,
  parseDoorScheduleExtractionResult, _buildPriorContextSection, buildContextAwareExtractionPrompt,
  SCHEDULE_TYPE_REGISTRY, DOOR_SCHEDULE_ALLOWED_FIELDS,
} from "./hardware-extraction-prompts.js";
import {
  callClaudeVision, callClaudeVisionWithImage, _imageSourceForQueue, callClaudeWithPdf,
  resolveInferenceContract,
} from "./hardware-extraction-vision-adapters.js";
import { callEdge } from "./edge-telemetry.js";

export async function extractHardwareSchedule(pdfBuffer, env2) {
  console.log("[Hardware Extractor] Starting hardware schedule extraction");
  const base64Pdf = arrayBufferToBase643(pdfBuffer);
  const prompt = buildHardwareExtractionPrompt();
  const result = await callClaudeVision(base64Pdf, prompt, env2);
  const parsedResult = parseHardwareExtractionResult(result);
  console.log(`[Hardware Extractor] Extracted ${parsedResult.hardware_groups.length} hardware groups`);
  return parsedResult;
}

export async function storeHardwareExtraction(extractionResult, env2, userId, context3 = {}) {
  const db = env2.DB;
  const insertedGroups = [];
  const insertedComponents = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { sessionId, pageNumber, pageExtractionId } = context3;
  console.log(`[Hardware Extractor] Storing ${extractionResult.hardware_groups.length} hardware groups to database`);
  console.log(`[Hardware Extractor] Context: session=${sessionId}, page=${pageNumber}, extraction=${pageExtractionId}`);
  for (const group3 of extractionResult.hardware_groups) {
    const groupId = sessionId ? `${sessionId}_hwset_${group3.group_number}` : crypto.randomUUID();
    try {
      const existingSet = await db.prepare(
        "SELECT approved_from_page FROM hardware_sets WHERE id = ?"
      ).bind(groupId).first();
      const isMultiPageMerge = existingSet && existingSet.approved_from_page !== (pageNumber || 1);
      if (isMultiPageMerge) {
        console.log(`[Hardware Extractor] Multi-page group ${group3.group_number}: merging page ${pageNumber} with existing page ${existingSet.approved_from_page}`);
        await db.prepare(`
          UPDATE hardware_sets SET
            set_name = COALESCE(set_name, ?),
            notes = CASE
              WHEN ? IS NOT NULL AND notes IS NOT NULL THEN notes || ' | ' || ?
              WHEN ? IS NOT NULL THEN ?
              ELSE notes END,
            updated_at = ?
          WHERE id = ?
        `).bind(
          group3.group_name || group3.description || null,
          group3.notes || null,
          group3.notes || null,
          group3.notes || null,
          group3.notes || null,
          now,
          groupId
        ).run();
      } else {
        await db.prepare(`
          INSERT OR REPLACE INTO hardware_sets
          (id, session_id, user_id, submittal_id, set_number, set_name, door_location, door_count,
           approved_from_page, approved_at, approved_by, source_page_extraction_id, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          groupId,
          sessionId || "legacy",
          // session_id NOT NULL
          userId,
          // user_id NOT NULL
          null,
          // submittal_id (optional)
          group3.group_number,
          // set_number NOT NULL
          group3.group_name || group3.description || null,
          // set_name
          null,
          // door_location (optional)
          null,
          // door_count (optional)
          pageNumber || 1,
          // approved_from_page NOT NULL
          now,
          // approved_at NOT NULL
          userId,
          // approved_by NOT NULL
          pageExtractionId || "legacy",
          // source_page_extraction_id NOT NULL
          group3.notes || null,
          // notes
          now,
          // created_at NOT NULL
          now
          // updated_at
        ).run();
      }
      insertedGroups.push({ group_number: group3.group_number, id: groupId, merged: !!isMultiPageMerge });
      for (let i = 0; i < group3.components.length; i++) {
        const component = group3.components[i];
        const componentId = crypto.randomUUID();
        const dhiCategory = mapToDhiCategory(component.component_type);
        try {
          await db.prepare(`
            INSERT OR REPLACE INTO hardware_components
            (id, set_id, component_type, dhi_category, sequence_order, manufacturer, model, catalog_number,
             finish, quantity, uom, unit_price, price_source, function_code, specifications, ansi_bhma_grade, fire_rating_minutes,
             ul_listing_number, ada_compliant, approved_at, approved_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            componentId,
            groupId,
            // set_id (FK to hardware_sets)
            normalizeComponentType(component.component_type),
            // component_type (CHECK constraint)
            dhiCategory,
            // dhi_category
            component.sort_order || i + 1,
            // sequence_order
            component.manufacturer || component.manufacturer_code || null,
            // manufacturer (FX-002: accept both naming conventions)
            component.model || component.model_number || null,
            // model (FX-002: accept both naming conventions)
            component.catalog_number || component.model || component.model_number || null,
            // catalog_number
            component.finish || component.finish_code || null,
            // finish (FX-002: accept both naming conventions)
            component.quantity || 1,
            // quantity
            component.uom || component.unit_of_measure || "EA",
            // uom (QF-001: unit of measure for Takeoff pricing)
            component.unit_price || null,
            // unit_price (WO-001: Takeoff Express pricing)
            component.price_source || "manual",
            // price_source (WO-001: 'manual' | 'catalog' | 'imported')
            null,
            // function_code (optional)
            JSON.stringify({
              // specifications (JSON blob)
              description: component.description,
              finish_description: component.finish_description,
              notes: component.notes,
              compliance: component.compliance,
              // Mounting position data for 3D visualization
              mounting: {
                mounting_height_inches: component.mounting_height_inches,
                mounting_height_source: component.mounting_height_source,
                hinge_positions: component.hinge_positions,
                hinge_positions_source: component.hinge_positions_source,
                projection_inches: component.projection_inches,
                projection_source: component.projection_source,
                mounting_side: component.mounting_side,
                mounting_side_source: component.mounting_side_source
              }
            }),
            extractGrade(component.compliance),
            // ansi_bhma_grade
            null,
            // fire_rating_minutes
            null,
            // ul_listing_number
            null,
            // ada_compliant
            now,
            // approved_at NOT NULL
            userId,
            // approved_by NOT NULL
            now,
            // created_at NOT NULL
            now
            // updated_at
          ).run();
          insertedComponents.push({
            group_number: group3.group_number,
            component_id: componentId,
            type: component.component_type,
            dhi_category: dhiCategory
          });
        } catch (compErr) {
          console.error(`[Hardware Extractor] Failed to insert component: ${compErr.message}`);
        }
      }
    } catch (groupErr) {
      console.error(`[Hardware Extractor] Failed to insert group ${group3.group_number}: ${groupErr.message}`);
    }
  }
  console.log(`[Hardware Extractor] Database storage complete: ${insertedGroups.length} groups, ${insertedComponents.length} components`);
  return {
    groups_inserted: insertedGroups.length,
    components_inserted: insertedComponents.length,
    groups: insertedGroups,
    components: insertedComponents
  };
}

export async function getHardwareGroupForReview(groupNumber, env2) {
  const db = env2.DB;
  const group3 = await db.prepare(`
    SELECT * FROM hardware_sets WHERE set_number = ?
  `).bind(groupNumber).first();
  if (!group3) {
    return null;
  }
  const components = await db.prepare(`
    SELECT
      hc.*
    FROM hardware_components hc
    WHERE hc.set_id = ?
    ORDER BY hc.sequence_order
  `).bind(group3.id).all();
  return {
    ...group3,
    components: components.results || []
  };
}

export async function updateHardwareGroup(groupNumber, groupData, env2) {
  const db = env2.DB;
  const groupId = `hwgroup_${groupNumber}`;
  await db.prepare(`
    UPDATE hardware_sets
    SET set_name = ?, description = ?, keying_system = ?, function_type = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    groupData.group_name || null,
    groupData.description || null,
    groupData.keying_system || null,
    groupData.function_type || null,
    groupData.notes || null,
    groupId
  ).run();
  if (groupData.components && Array.isArray(groupData.components)) {
    for (const component of groupData.components) {
      if (component.id) {
        await db.prepare(`
          UPDATE hardware_components
          SET component_type = ?, quantity = ?, uom = ?, manufacturer = ?, model = ?,
              catalog_number = ?, finish = ?, specifications = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          component.component_type || component.type,
          component.quantity || 1,
          component.uom || component.unit_of_measure || "EA",
          component.manufacturer || component.manufacturer_code || null,
          component.model || component.model_number || null,
          component.catalog_number || component.model_number || null,
          component.finish || component.finish_code || null,
          component.specifications ? JSON.stringify(component.specifications) : null,
          component.id
        ).run();
      }
    }
  }
  return { success: true, group_number: groupNumber };
}

export async function queuePageExtractionJob(imageBase64, env2, opts = {}) {
  const { pageNumber, totalPages, sessionId, tenantId, ownerMhsId, operatorNotes, crossRefGuidance, scheduleType = null } = opts;
  let ownerId = ownerMhsId || null;
  if (!ownerId && sessionId && env2.DB) {
    const owner = await env2.DB.prepare(
      `SELECT n.mhs_id FROM hardware_extraction_sessions s JOIN nodes n ON n.id = s.user_id WHERE s.id = ?`
    ).bind(sessionId).first();
    ownerId = owner?.mhs_id || null;
  }
  if (!ownerId)
    throw new Error(`queuePageExtractionJob: no owner mhs_id for session ${sessionId}`);
  const contract = await resolveExtractionContract(env2, {
    sessionId,
    pageNumber,
    totalPages,
    tenantId,
    operatorNotes,
    crossRefGuidance,
    scheduleType
  });
  const prompt = contract.prompt;
  const _imgSource = await _imageSourceForQueue(imageBase64, env2);
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: _imgSource },
      { type: "text", text: prompt }
    ]
  }];
  const _inf = resolveInferenceContract(env2);
  const queueRes = await callEdge("POST", "/ai/v1/jobs/queue", env2, {
    owner_id: ownerId,
    venture_code: "weyland",
    model_hint: _inf.model,
    max_tokens: _inf.max_tokens,
    temperature: _inf.temperature,
    messages,
    metadata: {
      session_id: sessionId,
      page_number: pageNumber,
      total_pages: totalPages,
      kind: scheduleType === "door_schedule" ? "door_schedule_page_extract" : "hardware_schedule_page_extract",
      // CH-2026-0702-WEYLAND-004: provenance stamp — any executor (or auditor) can
      // prove this job's prompt is byte-identical to the edge contract.
      prompt_sha256: contract.provenance.prompt_sha256,
      spec_version: contract.provenance.spec_version,
      industry_id: contract.provenance.industry_id
    }
  });
  if (queueRes.status !== 200 || !queueRes.body?.job_id) {
    throw new Error(`SABP queue failed for page ${pageNumber}: ${JSON.stringify(queueRes.body || queueRes.status)}`);
  }
  try {
    await env2.DB.prepare(
      `UPDATE hardware_extraction_sessions SET pending_job_id = ?, pending_job_queued_at = ? WHERE id = ?`
    ).bind(queueRes.body.job_id, (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
  } catch (e) {
  }
  return { job_id: queueRes.body.job_id, owner_id: ownerId };
}

export function buildExtractionResultFromVision(visionResult, pageNumber, totalPages) {
  const parsedResult = parseHardwareExtractionResult(visionResult, { requireContent: true });
  return {
    page_number: pageNumber,
    total_pages: totalPages,
    hardware_groups: parsedResult.hardware_groups || [],
    door_hardware_matrix: parsedResult.door_hardware_matrix || [],
    detected_nomenclature: parsedResult.detected_nomenclature || null,
    metadata: {
      ...parsedResult.metadata || parsedResult.page_metadata || {},
      page_isolated: true,
      isolation_method: "sabp_bridge_async"
    },
    usage: parsedResult.usage
  };
}

export async function extractWithImageMode(pdfBuffer, pageNumber, env2, renderer) {
  const renderStartTime = Date.now();
  const renderResult = await renderer(pdfBuffer, pageNumber, {
    dpi: 300,
    format: "png"
  });
  const renderTime = Date.now() - renderStartTime;
  console.log(`[Hardware Extractor] Page ${pageNumber} rendered (${renderTime}ms)`);
  const prompt = buildPageSpecificExtractionPrompt(pageNumber, renderResult.totalPages);
  const extractionStartTime = Date.now();
  const result = await callClaudeVisionWithImage(renderResult.imageBuffer, prompt, env2, pageNumber, null);
  const extractionTime = Date.now() - extractionStartTime;
  const parsedResult = parseHardwareExtractionResult(result);
  return {
    page_number: pageNumber,
    total_pages: renderResult.totalPages,
    hardware_groups: parsedResult.hardware_groups || [],
    metadata: {
      ...parsedResult.metadata || parsedResult.page_metadata || {},
      extraction_mode: "image_render",
      page_isolated: true
    },
    usage: parsedResult.usage,
    extraction_time_ms: extractionTime,
    render_time_ms: renderTime,
    total_time_ms: Date.now() - (extractionStartTime - extractionTime)
  };
}

export async function extractWithDirectPdfMode(pdfBuffer, pageNumber, env2) {
  console.log(`[Hardware Extractor] WARNING: Sending FULL PDF to Claude for page ${pageNumber}...`);
  const extractionStartTime = Date.now();
  const base64Pdf = arrayBufferToBase643(pdfBuffer);
  const pdfSizeMB = (pdfBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`[Hardware Extractor] PDF size: ${pdfSizeMB}MB`);
  const prompt = buildDirectPdfExtractionPrompt(pageNumber);
  const result = await callClaudeWithPdf(base64Pdf, prompt, env2, pageNumber);
  const extractionTime = Date.now() - extractionStartTime;
  console.log(`[Hardware Extractor] Claude response received (${extractionTime}ms)`);
  const parsedResult = parseHardwareExtractionResult(result);
  console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log(`[Hardware Extractor] PAGE ${pageNumber} EXTRACTION COMPLETE (direct PDF)`);
  console.log(`[Hardware Extractor]   - Hardware groups found: ${parsedResult.hardware_groups.length}`);
  console.log(`[Hardware Extractor]   - Total components: ${parsedResult.hardware_groups.reduce((sum2, g) => sum2 + (g.components?.length || 0), 0)}`);
  console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  return {
    page_number: pageNumber,
    total_pages: parsedResult.metadata?.total_pages || 1,
    hardware_groups: parsedResult.hardware_groups || [],
    metadata: {
      ...parsedResult.metadata || parsedResult.page_metadata || {},
      extraction_mode: "direct_pdf",
      page_isolated: false
      // Claude sees full PDF, uses instruction for page focus
    },
    usage: parsedResult.usage,
    extraction_time_ms: extractionTime,
    total_time_ms: extractionTime
  };
}

export async function extractFromPageImage(imageBase64, pageNumber, totalPages, env2, options = {}) {
  const { tenantId, sessionId, ownerMhsId } = options;
  console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log(`[Hardware Extractor] EXTRACTING PAGE ${pageNumber} FROM FRONTEND IMAGE`);
  if (tenantId) {
    console.log(`[Hardware Extractor] USING CONSTRAINT SYSTEM (tenant: ${tenantId})`);
  }
  console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  const startTime = Date.now();
  let resolvedConstraints = null;
  let prompt = null;
  console.log(`[Hardware Extractor] Step 1: Resolving extraction contract...`);
  const contract = await resolveExtractionContract(env2, { sessionId, pageNumber, totalPages, tenantId });
  resolvedConstraints = contract.constraints;
  prompt = contract.prompt;
  console.log(`[Hardware Extractor] Contract resolved (${prompt.length} chars, v${contract.provenance.spec_version}, scope: ${contract.provenance.scope_chain.join(" \u2192 ")}, sha256: ${(contract.provenance.prompt_sha256 || "").slice(0, 12)}\u2026)`);
  try {
    console.log(`[Hardware Extractor] Step 2: Decoding base64 image...`);
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBuffer = bytes.buffer;
    const imageSizeKB = (imageBuffer.byteLength / 1024).toFixed(1);
    console.log(`[Hardware Extractor] Image decoded: ${imageSizeKB}KB`);
    console.log(`[Hardware Extractor] Step 3: Sending image to Claude Vision...`);
    const extractionStartTime = Date.now();
    const result = await callClaudeVisionWithImage(imageBuffer, prompt, env2, pageNumber, sessionId, ownerMhsId);
    const extractionTime = Date.now() - extractionStartTime;
    console.log(`[Hardware Extractor] Claude Vision response received (${extractionTime}ms)`);
    console.log(`[Hardware Extractor] Step 4: Parsing extraction result...`);
    const parsedResult = parseHardwareExtractionResult(result);
    const totalTime = Date.now() - startTime;
    const matrixEntries = parsedResult.door_hardware_matrix || [];
    console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Hardware Extractor] PAGE ${pageNumber} EXTRACTION COMPLETE`);
    console.log(`[Hardware Extractor]   - Hardware groups found: ${parsedResult.hardware_groups.length}`);
    console.log(`[Hardware Extractor]   - Total components: ${parsedResult.hardware_groups.reduce((sum2, g) => sum2 + (g.components?.length || 0), 0)}`);
    console.log(`[Hardware Extractor]   - Door-hardware matrix entries: ${matrixEntries.length}`);
    console.log(`[Hardware Extractor]   - Total time: ${totalTime}ms`);
    console.log(`[Hardware Extractor]   - Source: Frontend canvas capture (true page isolation)`);
    if (resolvedConstraints) {
      console.log(`[Hardware Extractor]   - Constraints: v${resolvedConstraints.spec_version} (${resolvedConstraints.scope_chain.join(" \u2192 ")})`);
    }
    console.log(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    if (sessionId && resolvedConstraints && env2.DB) {
      try {
        const inputHash = imageBuffer.byteLength.toString(16).padStart(8, "0");
        const outputHash = (parsedResult.hardware_groups?.length || 0).toString(16).padStart(4, "0") + (matrixEntries.length || 0).toString(16).padStart(4, "0");
        await logConstraintExecution(
          sessionId,
          pageNumber,
          resolvedConstraints,
          inputHash,
          outputHash,
          true,
          // success
          null,
          // no error
          totalTime,
          env2
        );
        console.log(`[Hardware Extractor] Execution logged for audit trail`);
      } catch (logError) {
        console.warn(`[Hardware Extractor] Failed to log execution: ${logError.message}`);
      }
    }
    return {
      page_number: pageNumber,
      total_pages: totalPages,
      hardware_groups: parsedResult.hardware_groups || [],
      door_hardware_matrix: parsedResult.door_hardware_matrix || [],
      detected_nomenclature: parsedResult.detected_nomenclature || null,
      metadata: {
        ...parsedResult.metadata || parsedResult.page_metadata || {},
        image_size_bytes: imageBuffer.byteLength,
        page_isolated: true,
        isolation_method: "frontend_canvas_capture"
      },
      // Constraint system metadata (if used)
      constraints: resolvedConstraints ? {
        spec_version: resolvedConstraints.spec_version,
        tenant_id: resolvedConstraints.tenant_id,
        industry_id: resolvedConstraints.industry_id,
        scope_chain: resolvedConstraints.scope_chain,
        field_count: resolvedConstraints.fields.length
      } : null,
      usage: parsedResult.usage,
      extraction_time_ms: extractionTime,
      total_time_ms: totalTime
    };
  } catch (error4) {
    console.error(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.error(`[Hardware Extractor] ERROR extracting page ${pageNumber} from image`);
    console.error(`[Hardware Extractor] Error: ${error4.message}`);
    console.error(`[Hardware Extractor] Stack: ${error4.stack}`);
    console.error(`[Hardware Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    if (sessionId && resolvedConstraints && env2.DB) {
      try {
        console.log(`[Hardware Extractor] Logging failed extraction to audit trail...`);
        await logConstraintExecution(
          sessionId,
          pageNumber,
          resolvedConstraints,
          null,
          // no input hash
          null,
          // no output hash
          false,
          // failed
          error4.message,
          Date.now() - startTime,
          env2
        );
        console.log(`[Hardware Extractor] Execution logged for audit trail`);
      } catch (logError) {
        console.error(`[Hardware Extractor] Failed to log execution: ${logError.message}`);
      }
    } else {
      console.log(`[Hardware Extractor] Skipping audit log - sessionId: ${!!sessionId}, constraints: ${!!resolvedConstraints}, DB: ${!!env2.DB}`);
    }
    throw error4;
  }
}

export async function createExtractionSession(params, env2) {
  const { userId, submittalId, projectName, filename, fileBufferKey, totalPages, sourceType, documentType, tenantId, documentOutline, detectedSchedulePages } = params;
  const sessionId = crypto.randomUUID();
  const effectiveSourceType = sourceType || "pdf";
  const effectiveDocumentType = documentType || "door_schedule";
  const effectiveTenantId = tenantId || (request?.user?.tenant_id || "ven_weyland");
  let effectiveIndustryId = "ind_doors";
  if (effectiveTenantId) {
    try {
      const tenantResult = await env2.DB.prepare(`
        SELECT industry_id FROM tenants WHERE id = ? AND active = 1
      `).bind(effectiveTenantId).first();
      if (tenantResult?.industry_id) {
        effectiveIndustryId = tenantResult.industry_id;
      }
    } catch (err) {
      console.warn(`[Hardware Extractor] Could not lookup tenant industry: ${err.message}`);
    }
  }
  await env2.DB.prepare(`
    INSERT INTO hardware_extraction_sessions
    (id, user_id, submittal_id, project_name, filename, file_buffer_key,
     total_pages, status, created_at, source_type, document_type, tenant_id, industry_id,
     document_outline, detected_schedule_pages)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    sessionId,
    userId,
    submittalId || null,
    projectName,
    filename,
    fileBufferKey,
    totalPages,
    "active",
    (/* @__PURE__ */ new Date()).toISOString(),
    effectiveSourceType,
    effectiveDocumentType,
    effectiveTenantId,
    effectiveIndustryId,
    documentOutline ? JSON.stringify(documentOutline) : null,
    detectedSchedulePages ? JSON.stringify(detectedSchedulePages) : null
  ).run();
  console.log(`[Hardware Extractor] Created session ${sessionId} with ${totalPages} pages (source: ${effectiveSourceType}, document: ${effectiveDocumentType}, tenant: ${effectiveTenantId}, industry: ${effectiveIndustryId})`);
  return sessionId;
}

export async function getSessionStatus(sessionId, env2) {
  const session = await env2.DB.prepare(`
    SELECT * FROM hardware_extraction_sessions WHERE id = ?
  `).bind(sessionId).first();
  if (!session) {
    return null;
  }
  const pages = await env2.DB.prepare(`
    SELECT page_number, status, reviewed_at
    FROM hardware_page_extractions
    WHERE session_id = ?
    ORDER BY page_number
  `).bind(sessionId).all();
  return {
    ...session,
    pages: pages.results || [],
    progress_percent: Math.round(session.pages_approved / session.total_pages * 100)
  };
}

export async function approvePageExtraction(sessionId, pageNumber, corrections, userId, env2) {
  const cached = await env2.DB.prepare(`
    SELECT id, extracted_data, corrections
    FROM hardware_page_extractions
    WHERE session_id = ? AND page_number = ?
  `).bind(sessionId, pageNumber).first();
  if (!cached) {
    throw new Error(`No cached extraction found for session ${sessionId} page ${pageNumber}`);
  }
  const extractedData = JSON.parse(cached.extracted_data);
  const finalData = corrections ? { ...extractedData, ...corrections } : extractedData;
  const result = await storeHardwareExtraction(finalData, env2, userId, {
    sessionId,
    pageNumber,
    pageExtractionId: cached.id
  });
  await env2.DB.prepare(`
    UPDATE hardware_page_extractions
    SET status = ?,
        reviewed_at = ?,
        reviewed_by = ?,
        corrections = ?
    WHERE session_id = ? AND page_number = ?
  `).bind(
    "approved",
    (/* @__PURE__ */ new Date()).toISOString(),
    userId,
    corrections ? JSON.stringify(corrections) : null,
    sessionId,
    pageNumber
  ).run();
  await env2.DB.prepare(`
    UPDATE hardware_extraction_sessions
    SET pages_approved = pages_approved + 1,
        total_sets_extracted = total_sets_extracted + ?,
        total_components_extracted = total_components_extracted + ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    result.groups_inserted,
    result.components_inserted,
    (/* @__PURE__ */ new Date()).toISOString(),
    sessionId
  ).run();
  console.log(`[Hardware Extractor] Approved page ${pageNumber}: ${result.groups_inserted} groups, ${result.components_inserted} components`);
  try {
    const matrixUpdateResult = await env2.DB.prepare(`
      UPDATE door_hardware_matrix
      SET verified = 1,
          verified_at = ?,
          verified_by = ?
      WHERE session_id = ? AND source_page = ?
    `).bind(
      (/* @__PURE__ */ new Date()).toISOString(),
      userId,
      sessionId,
      pageNumber
    ).run();
    if (matrixUpdateResult.meta?.changes > 0) {
      console.log(`[Hardware Extractor] Verified ${matrixUpdateResult.meta.changes} door-hardware matrix entries from page ${pageNumber}`);
    }
  } catch (matrixError) {
    console.log(`[Hardware Extractor] Matrix verification skipped: ${matrixError.message}`);
  }
  return result;
}

export async function resolveConstraints(ctx, env2) {
  const spec_version = "1.0.0";
  const resolved_at = (/* @__PURE__ */ new Date()).toISOString();
  const scope_chain = ["global"];
  const globalResult = await env2.DB.prepare(`
    SELECT * FROM prompt_specifications
    WHERE scope_level = 'global' AND active = 1
    ORDER BY field_group, sort_order
  `).all();
  const fieldMap = /* @__PURE__ */ new Map();
  for (const row of globalResult.results || []) {
    fieldMap.set(row.field_name, rowToConstraintField(row));
  }
  let industry_id = ctx.industry_id || null;
  let tenant_id = ctx.tenant_id || null;
  if (tenant_id && !industry_id) {
    try {
      const tenantResult = await env2.DB.prepare(`
        SELECT industry_id FROM tenants WHERE id = ? AND active = 1
      `).bind(tenant_id).first();
      if (tenantResult && tenantResult.industry_id) {
        industry_id = tenantResult.industry_id;
      }
    } catch (err) {
      console.warn("[Constraint Resolver] tenant->industry lookup unavailable (tenants not in venture D1): " + err.message);
    }
  }
  if (!industry_id)
    industry_id = "ind_doors";
  if (industry_id) {
    scope_chain.push("industry");
    const industryResult = await env2.DB.prepare(`
      SELECT * FROM prompt_specifications
      WHERE scope_level = 'industry' AND industry_id = ? AND active = 1
      ORDER BY field_group, sort_order
    `).bind(industry_id).all();
    for (const row of industryResult.results || []) {
      const existing = fieldMap.get(row.field_name);
      if (existing) {
        const merged = applyConstraintOverride(existing, row);
        if (merged === null) {
          fieldMap.delete(row.field_name);
        } else {
          fieldMap.set(row.field_name, merged);
        }
      } else {
        fieldMap.set(row.field_name, rowToConstraintField(row));
      }
    }
  }
  if (tenant_id) {
    scope_chain.push("tenant");
    const tenantResult = await env2.DB.prepare(`
      SELECT * FROM prompt_specifications
      WHERE scope_level = 'tenant' AND tenant_id = ? AND active = 1
      ORDER BY field_group, sort_order
    `).bind(tenant_id).all();
    for (const row of tenantResult.results || []) {
      const existing = fieldMap.get(row.field_name);
      if (existing) {
        const merged = applyConstraintOverride(existing, row);
        if (merged === null) {
          fieldMap.delete(row.field_name);
        } else {
          fieldMap.set(row.field_name, merged);
        }
      } else {
        fieldMap.set(row.field_name, rowToConstraintField(row));
      }
    }
  }
  const fields = Array.from(fieldMap.values()).sort((a, b) => {
    const groupOrder = { component: 0, group: 1, set: 1, page: 2, keying: 3, project: 4 };
    const groupDiff = (groupOrder[a.field_group] || 0) - (groupOrder[b.field_group] || 0);
    if (groupDiff !== 0)
      return groupDiff;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  return {
    spec_version,
    tenant_id,
    industry_id,
    scope_chain,
    fields,
    resolved_at
  };
}

export async function resolveExtractionContract(env2, opts = {}) {
  const { sessionId, pageNumber, totalPages, tenantId = null, operatorNotes = null, crossRefGuidance = null, scheduleType = null } = opts;
  let effTenant = tenantId;
  let effTotal = totalPages;
  if (env2.DB && sessionId && (!effTenant || !effTotal)) {
    try {
      const s = await env2.DB.prepare(
        "SELECT tenant_id, total_pages FROM hardware_extraction_sessions WHERE id = ?"
      ).bind(sessionId).first();
      if (s) {
        effTenant = effTenant || s.tenant_id || null;
        effTotal = effTotal || s.total_pages || 1;
      }
    } catch (e) {
      console.warn(`[Extraction Contract] session lookup best-effort failed: ${e.message}`);
    }
  }
  effTenant = effTenant || "ven_weyland";
  effTotal = effTotal || 1;
  let prompt;
  let constraints = null;
  if (scheduleType === "door_schedule" && env2.DB) {
    constraints = await resolveDoorScheduleConstraints(
      { session_id: sessionId, page_number: pageNumber, tenant_id: effTenant },
      env2
    );
    prompt = buildDoorScheduleExtractionPrompt(constraints, pageNumber, effTotal);
  } else if (env2.DB) {
    constraints = await resolveConstraints(
      { session_id: sessionId, page_number: pageNumber, tenant_id: effTenant },
      env2
    );
    prompt = buildPromptFromConstraints(constraints, pageNumber, effTotal);
  } else {
    prompt = buildPageSpecificExtractionPrompt(pageNumber, effTotal);
  }
  if (operatorNotes || crossRefGuidance) {
    const crossRef = crossRefGuidance ? typeof crossRefGuidance === "string" ? crossRefGuidance : JSON.stringify(crossRefGuidance) : null;
    prompt += "\n\nOPERATOR GUIDANCE (from the human who reviewed this document \u2014 honor it):\n" + (operatorNotes ? `- Notes: ${operatorNotes}
` : "") + (crossRef ? `- Cross-reference ties: ${crossRef}
` : "");
  }
  let prompt_sha256 = null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(prompt));
    prompt_sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    console.warn(`[Extraction Contract] sha256 unavailable: ${e.message}`);
  }
  return {
    prompt,
    constraints,
    totalPages: effTotal,
    provenance: {
      spec_version: constraints ? constraints.spec_version : null,
      scope_chain: constraints ? constraints.scope_chain : ["legacy"],
      industry_id: constraints ? constraints.industry_id : null,
      tenant_id: constraints ? constraints.tenant_id || effTenant : null,
      prompt_sha256
    }
  };
}

export async function extractDoorScheduleHGSE(imageBuffer, prompt, context3, env2) {
  const { sessionId, tenantId, candidateId } = context3;
  console.log(`[Door Schedule HGSE Adapter] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log(`[Door Schedule HGSE Adapter] Adapting HGSE call to extractDoorSchedule`);
  console.log(`[Door Schedule HGSE Adapter] Session: ${sessionId}, Candidate: ${candidateId}`);
  console.log(`[Door Schedule HGSE Adapter] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  let pageNumber = 1;
  try {
    const candidate = await env2.DB.prepare(
      "SELECT page_number FROM schedule_region_candidates WHERE id = ?"
    ).bind(candidateId).first();
    pageNumber = candidate?.page_number || 1;
    console.log(`[Door Schedule HGSE Adapter] Resolved page number: ${pageNumber}`);
  } catch (err) {
    console.warn(`[Door Schedule HGSE Adapter] Could not resolve page number, defaulting to 1: ${err.message}`);
  }
  const result = await extractDoorSchedule(
    sessionId,
    imageBuffer,
    tenantId,
    pageNumber,
    1,
    // totalPages not relevant for single region extraction
    env2
  );
  if (result.success && (result.entries_count > 0 || result.entry_count > 0)) {
    try {
      await env2.DB.prepare(`
        UPDATE door_schedule_entries
        SET candidate_id = ?
        WHERE session_id = ? AND candidate_id IS NULL
      `).bind(candidateId, sessionId).run();
      console.log(`[Door Schedule HGSE Adapter] Updated entries with candidate_id: ${candidateId}`);
    } catch (err) {
      console.warn(`[Door Schedule HGSE Adapter] Could not update candidate_id: ${err.message}`);
    }
  }
  return result;
}

export async function routeExtraction(scheduleType, imageBuffer, context3, env2) {
  const startTime = Date.now();
  console.log(`[Schedule Router] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log(`[Schedule Router] ROUTING EXTRACTION - Type: ${scheduleType}`);
  console.log(`[Schedule Router] Session: ${context3.sessionId}, Page: ${context3.pageNumber}`);
  console.log(`[Schedule Router] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  const config3 = SCHEDULE_TYPE_REGISTRY[scheduleType];
  if (!config3) {
    console.error(`[Schedule Router] Unknown schedule type: ${scheduleType}`);
    return {
      success: false,
      error: `Unknown schedule type: ${scheduleType}`,
      entries: [],
      entry_count: 0,
      schedule_type: scheduleType,
      target_table: null,
      duration_ms: Date.now() - startTime
    };
  }
  console.log(`[Schedule Router] Config found:`);
  console.log(`[Schedule Router]   - extraction_function: ${config3.extraction_function}`);
  console.log(`[Schedule Router]   - target_table: ${config3.target_table}`);
  console.log(`[Schedule Router]   - field_group: ${config3.field_group || "none"}`);
  console.log(`[Schedule Router]   - status: ${config3.status || "active"}`);
  if (config3.status === "not_implemented") {
    console.log(`[Schedule Router] Schedule type ${scheduleType} not yet implemented, using generic extraction`);
    const result = await extractGenericSchedule(imageBuffer, context3, env2);
    return {
      ...result,
      schedule_type: scheduleType,
      target_table: config3.target_table,
      fallback_reason: "not_implemented",
      duration_ms: Date.now() - startTime
    };
  }
  try {
    let constraints = null;
    if (config3.field_group) {
      console.log(`[Schedule Router] Resolving constraints for field_group: ${config3.field_group}`);
      constraints = await resolveConstraints({
        tenantId: context3.tenantId,
        industryId: context3.industryId,
        field_group: config3.field_group
      }, env2);
      console.log(`[Schedule Router] Resolved ${constraints.fields?.length || 0} constraint fields`);
    }
    let prompt = null;
    if (constraints && constraints.fields?.length > 0) {
      prompt = buildPromptFromConstraints(constraints, context3.pageNumber, context3.totalPages);
    }
    if (context3.priorExtractions && prompt) {
      const ctxSection = _buildPriorContextSection(context3.priorExtractions);
      if (ctxSection) {
        const insertAt = prompt.indexOf("\n\nCRITICAL:");
        prompt = insertAt > 0 ? prompt.slice(0, insertAt) + "\n" + ctxSection + prompt.slice(insertAt) : ctxSection + "\n" + prompt;
        console.log(`[Schedule Router] Injected cross-page context (${context3.priorExtractions.pagesExtracted.length} prior pages)`);
      }
    } else if (context3.priorExtractions && !prompt) {
      prompt = buildContextAwareExtractionPrompt(context3.pageNumber, context3.totalPages, context3.priorExtractions);
      console.log(`[Schedule Router] Using context-aware hardcoded prompt (${context3.priorExtractions.pagesExtracted.length} prior pages)`);
    }
    let result;
    switch (config3.extraction_function) {
      case "extractDoorScheduleHGSE":
        console.log(`[Schedule Router] Dispatching to extractDoorScheduleHGSE (adapter)`);
        result = await extractDoorScheduleHGSE(imageBuffer, prompt, context3, env2);
        break;
      case "extractDoorSchedule":
        console.log(`[Schedule Router] Dispatching to extractDoorSchedule (legacy)`);
        result = await extractDoorSchedule(
          context3.sessionId,
          imageBuffer,
          context3.tenantId,
          context3.pageNumber,
          context3.totalPages,
          env2
        );
        break;
      case "extractHardwareSchedule":
        console.log(`[Schedule Router] Dispatching to extractHardwareSchedule (image-based)`);
        if (prompt) {
          console.log(`[Schedule Router] Using constraint-built prompt for hardware extraction`);
          const hwApiResponse = await callClaudeVisionWithImage(imageBuffer, prompt, env2, context3.pageNumber, context3.sessionId);
          try {
            const hwParsed = parseHardwareExtractionResult(hwApiResponse);
            const rawText = hwApiResponse?.content?.[0]?.text || "";
            result = {
              success: true,
              hardware_groups: hwParsed.hardware_groups,
              hardwareGroups: hwParsed.hardware_groups,
              door_hardware_matrix: hwParsed.door_hardware_matrix || [],
              entry_count: hwParsed.hardware_groups.length,
              entries: hwParsed.hardware_groups,
              usage: hwParsed.usage,
              metadata: hwParsed.metadata,
              _raw_preview: rawText.slice(0, 800)
            };
          } catch (parseErr) {
            const rawText = hwApiResponse?.content?.[0]?.text || "";
            result = await extractGenericSchedule(imageBuffer, context3, env2);
            result._raw_preview = `PARSE_FAILED: ${parseErr.message} | RAW: ${rawText.slice(0, 600)}`;
          }
        } else {
          console.log(`[Schedule Router] No constraints \u2014 falling back to generic extraction`);
          result = await extractGenericSchedule(imageBuffer, context3, env2);
        }
        break;
      case "extractGenericSchedule":
      default:
        console.log(`[Schedule Router] Dispatching to extractGenericSchedule`);
        result = await extractGenericSchedule(imageBuffer, context3, env2);
        break;
    }
    const duration = Date.now() - startTime;
    console.log(`[Schedule Router] Extraction complete in ${duration}ms`);
    console.log(`[Schedule Router] Success: ${result.success}, Entries: ${result.entries?.length || result.entries_count || 0}`);
    return {
      ...result,
      schedule_type: scheduleType,
      target_table: config3.target_table,
      config_used: {
        field_group: config3.field_group,
        extraction_function: config3.extraction_function,
        constraint_scope: config3.constraint_scope
      },
      duration_ms: duration
    };
  } catch (error4) {
    const duration = Date.now() - startTime;
    console.error(`[Schedule Router] Extraction failed: ${error4.message}`);
    return {
      success: false,
      error: error4.message,
      entries: [],
      entry_count: 0,
      schedule_type: scheduleType,
      target_table: config3.target_table,
      duration_ms: duration
    };
  }
}

export async function extractGenericSchedule(imageBuffer, context3, env2) {
  const startTime = Date.now();
  console.log(`[Generic Extractor] Starting generic schedule extraction`);
  console.log(`[Generic Extractor] Session: ${context3.sessionId}, Page: ${context3.pageNumber}`);
  try {
    const prompt = buildGenericExtractionPrompt(context3.pageNumber, context3.totalPages);
    const apiResponse = await callClaudeVisionWithImage(imageBuffer, prompt, env2, context3.pageNumber, context3.sessionId);
    const parsedResponse = parseGenericExtractionResult(apiResponse);
    const duration = Date.now() - startTime;
    console.log(`[Generic Extractor] Extracted ${parsedResponse.entries?.length || 0} generic entries in ${duration}ms`);
    return {
      success: true,
      entries: parsedResponse.entries || [],
      entry_count: parsedResponse.entries?.length || 0,
      raw_text: parsedResponse.raw_text || null,
      table_structure: parsedResponse.table_structure || null,
      duration_ms: duration
    };
  } catch (error4) {
    const duration = Date.now() - startTime;
    console.error(`[Generic Extractor] Failed: ${error4.message}`);
    return {
      success: false,
      entries: [],
      entry_count: 0,
      error: error4.message,
      duration_ms: duration
    };
  }
}

export async function logConstraintExecution(sessionId, pageNumber, constraints, inputHash, outputHash, success, errorMessage, durationMs, env2) {
  const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const constraintsJson = JSON.stringify(constraints);
  const promptHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(constraintsJson)
  ).then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16));
  await env2.DB.prepare(`
    INSERT INTO constraint_executions (
      id, session_id, page_number, tenant_id, industry_id,
      spec_version, resolved_constraints, prompt_hash,
      input_hash, output_hash, extraction_success, error_message,
      duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    sessionId,
    pageNumber,
    constraints.tenant_id,
    constraints.industry_id,
    constraints.spec_version,
    constraintsJson,
    promptHash,
    inputHash,
    outputHash,
    success ? 1 : 0,
    errorMessage,
    durationMs
  ).run();
  return id;
}

export async function resolveDoorScheduleConstraints(ctx, env2) {
  const spec_version = "1.0.0";
  const resolved_at = (/* @__PURE__ */ new Date()).toISOString();
  const scope_chain = ["global"];
  const globalResult = await env2.DB.prepare(`
    SELECT * FROM prompt_specifications
    WHERE scope_level = 'global' AND field_group = 'door_schedule' AND active = 1
    ORDER BY sort_order
  `).all();
  const fieldMap = /* @__PURE__ */ new Map();
  for (const row of globalResult.results || []) {
    fieldMap.set(row.field_name, rowToConstraintField(row));
  }
  let industry_id = ctx.industry_id || null;
  let tenant_id = ctx.tenant_id || null;
  if (tenant_id && !industry_id) {
    try {
      const tenantResult = await env2.DB.prepare(`
        SELECT industry_id FROM tenants WHERE id = ? AND active = 1
      `).bind(tenant_id).first();
      if (tenantResult && tenantResult.industry_id) {
        industry_id = tenantResult.industry_id;
      }
    } catch (err) {
      console.warn("[Constraint Resolver] tenant->industry lookup unavailable (tenants not in venture D1): " + err.message);
    }
  }
  if (!industry_id) {
    industry_id = "ind_doors";
  }
  if (industry_id) {
    scope_chain.push("industry");
    const industryResult = await env2.DB.prepare(`
      SELECT * FROM prompt_specifications
      WHERE scope_level = 'industry' AND industry_id = ? AND field_group = 'door_schedule' AND active = 1
      ORDER BY sort_order
    `).bind(industry_id).all();
    for (const row of industryResult.results || []) {
      const existing = fieldMap.get(row.field_name);
      if (existing) {
        const merged = applyConstraintOverride(existing, row);
        if (merged === null) {
          fieldMap.delete(row.field_name);
        } else {
          fieldMap.set(row.field_name, merged);
        }
      } else {
        fieldMap.set(row.field_name, rowToConstraintField(row));
      }
    }
  }
  if (tenant_id) {
    scope_chain.push("tenant");
    const tenantResult = await env2.DB.prepare(`
      SELECT * FROM prompt_specifications
      WHERE scope_level = 'tenant' AND tenant_id = ? AND field_group = 'door_schedule' AND active = 1
      ORDER BY sort_order
    `).bind(tenant_id).all();
    for (const row of tenantResult.results || []) {
      const existing = fieldMap.get(row.field_name);
      if (existing) {
        const merged = applyConstraintOverride(existing, row);
        if (merged === null) {
          fieldMap.delete(row.field_name);
        } else {
          fieldMap.set(row.field_name, merged);
        }
      } else {
        fieldMap.set(row.field_name, rowToConstraintField(row));
      }
    }
  }
  const DOOR_FIELD_FLOOR_INSTR = {
    thickness: 'Door thickness as shown (e.g., 1-3/4", 1.75, 1-3/8"). Preserve original format; null if not shown.',
    door_finish: "Door finish/coating (e.g., PT = paint, ST = stain, PL = plastic laminate, FACTORY, PRIMED). null if not shown.",
    stc_rating: "Sound Transmission Class (STC) rating as an integer (e.g., 45, 50). null if not shown.",
    frame_finish: "Frame finish/coating (e.g., PT = paint, PRIMED, FACTORY). null if not shown.",
    head_detail: "Head detail reference/callout for this opening (e.g., 1/A8.1, HD-3). null if not shown.",
    jamb_detail: "Jamb detail reference/callout (e.g., 2/A8.1, JD-3). null if not shown.",
    sill_detail: "Sill or threshold detail reference/callout (e.g., 3/A8.1, SD-1). null if not shown.",
    notes: "Any remarks, notes, or special conditions for this door. null if none."
  };
  const _FLOOR_TYPE = { boolean: "boolean", number: "number", string: "string" };
  let _floorOrder = 40;
  for (const [fname, spec] of Object.entries(DOOR_SCHEDULE_ALLOWED_FIELDS)) {
    if (fname === "extraction_confidence" || fieldMap.has(fname))
      continue;
    fieldMap.set(fname, {
      field_name: fname,
      field_type: _FLOOR_TYPE[spec.type] || "string",
      extraction_instruction: DOOR_FIELD_FLOOR_INSTR[fname] || `Extract the ${fname.replace(/_/g, " ")} for this door if shown, else null.`,
      // 'mark' is THE door identifier (MARK->hardware_group spine) — keep it required even
      // in the floor-only case (empty seed); the enrichment fields are legitimately optional.
      required: fname === "mark",
      sort_order: _floorOrder++
    });
  }
  const fields = Array.from(fieldMap.values()).sort((a, b) => {
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  return {
    spec_version,
    tenant_id,
    industry_id,
    scope_chain,
    fields,
    resolved_at,
    extraction_type: "door_schedule"
  };
}

export async function extractDoorSchedule(sessionId, pageImageBuffer, tenantId, pageNumber, totalPages, env2) {
  const startTime = Date.now();
  console.log(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  console.log(`[Door Schedule Extractor] EXTRACTING DOOR SCHEDULE - Page ${pageNumber}/${totalPages}`);
  console.log(`[Door Schedule Extractor] Session: ${sessionId}`);
  console.log(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
  let resolvedConstraints = null;
  try {
    console.log("[Door Schedule Extractor] Step 1: Resolving constraints...");
    resolvedConstraints = await resolveDoorScheduleConstraints({
      session_id: sessionId,
      page_number: pageNumber,
      tenant_id: tenantId
    }, env2);
    console.log(`[Door Schedule Extractor] Resolved ${resolvedConstraints.fields.length} constraint fields`);
    console.log(`[Door Schedule Extractor] Scope chain: ${resolvedConstraints.scope_chain.join(" \u2192 ")}`);
    console.log("[Door Schedule Extractor] Step 2: Building extraction prompt...");
    const prompt = buildDoorScheduleExtractionPrompt(resolvedConstraints, pageNumber, totalPages);
    console.log(`[Door Schedule Extractor] Prompt length: ${prompt.length} chars`);
    console.log("[Door Schedule Extractor] Step 3: Calling Claude Vision API...");
    const apiResponse = await callClaudeVisionWithImage(pageImageBuffer, prompt, env2, pageNumber, sessionId);
    console.log(`[Door Schedule Extractor] API response received (${apiResponse.usage?.output_tokens || 0} output tokens)`);
    return await persistDoorScheduleResponse(sessionId, apiResponse, tenantId, pageNumber, totalPages, env2, { resolvedConstraints, prompt, startTime });
  } catch (error4) {
    const totalTime = Date.now() - startTime;
    console.error(`[Door Schedule Extractor] EXTRACTION FAILED (pre-parse) - ${totalTime}ms: ${error4.message}`);
    if (resolvedConstraints) {
      try {
        await logConstraintExecution(sessionId, pageNumber, resolvedConstraints, null, null, false, error4.message, totalTime, env2);
      } catch (logError) {
        console.error(`[Door Schedule Extractor] Failed to log error: ${logError.message}`);
      }
    }
    return {
      success: false,
      entries_count: 0,
      entries: [],
      low_confidence_count: 0,
      constraint_execution_id: null,
      error: error4.message,
      duration_ms: totalTime
    };
  }
}

export async function persistDoorScheduleResponse(sessionId, apiResponse, tenantId, pageNumber, totalPages, env2, pre = {}) {
  const startTime = pre.startTime || Date.now();
  const prompt = pre.prompt || "";
  let resolvedConstraints = pre.resolvedConstraints || null;
  try {
    if (!resolvedConstraints) {
      resolvedConstraints = await resolveDoorScheduleConstraints({
        session_id: sessionId,
        page_number: pageNumber,
        tenant_id: tenantId
      }, env2);
    }
    console.log("[Door Schedule Extractor] Step 4: Parsing extraction response...");
    const parsedResponse = parseDoorScheduleExtractionResult(apiResponse);
    console.log(`[Door Schedule Extractor] Found ${parsedResponse.door_entries.length} door entries`);
    try {
      const _respText = apiResponse && apiResponse.content && apiResponse.content[0] && apiResponse.content[0].text || "";
      const _usage = apiResponse && apiResponse.usage || {};
      await env2.DB.prepare(`INSERT INTO claude_api_logs
        (id, session_id, api_type, endpoint, model, request_timestamp, response_timestamp,
         system_prompt, response_text, response_status,
         input_tokens, output_tokens, total_tokens, page_number, created_at)
        VALUES (?, ?, 'vision', 'door_schedule_extraction', ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).bind(
        crypto.randomUUID(),
        sessionId,
        apiResponse && apiResponse.model || "unknown",
        new Date(startTime).toISOString(),
        (prompt || "").slice(0, 400),
        _respText.slice(0, 4e3),
        `parsed_de=${(parsedResponse.door_entries || []).length} keys=${JSON.stringify(Object.keys(parsedResponse || {})).slice(0, 120)}`,
        _usage.input_tokens || 0,
        _usage.output_tokens || 0,
        (_usage.input_tokens || 0) + (_usage.output_tokens || 0),
        pageNumber
      ).run();
    } catch (_logErr) {
      console.warn("[INSTR] claude_api_logs door telemetry failed:", _logErr.message);
    }
    console.log("[Door Schedule Extractor] Step 5: Processing entries...");
    const processedEntries = [];
    let lowConfidenceCount = 0;
    for (const [index, rawEntry] of parsedResponse.door_entries.entries()) {
      const entry = parseDoorScheduleEntry(rawEntry, pageNumber);
      if (!entry.mark) {
        console.warn("[Door Schedule Extractor] Skipping entry without mark");
        continue;
      }
      const confidence = calculateEntryConfidence(entry, parsedResponse.page_metadata);
      const entryId = `dse_${sessionId}_${entry.mark}_${Date.now()}_${index}`;
      const fullEntry = {
        id: entryId,
        session_id: sessionId,
        tenant_id: tenantId,
        ...entry,
        ...confidence
      };
      processedEntries.push(fullEntry);
      if (confidence.low_confidence_fields) {
        lowConfidenceCount++;
      }
    }
    console.log(`[Door Schedule Extractor] Processed ${processedEntries.length} valid entries`);
    console.log(`[Door Schedule Extractor] Low confidence entries: ${lowConfidenceCount}`);
    console.log("[Door Schedule Extractor] Step 6: Inserting to database...");
    let insertedCount = 0;
    for (const entry of processedEntries) {
      try {
        await env2.DB.prepare(`
          INSERT INTO door_schedule_entries (
            id, session_id, tenant_id, page_number,
            mark, hardware_group,
            fire_rating, width, height, width_inches, height_inches,
            door_type, door_material, frame_type, frame_material, panic,
            thickness, thickness_inches, door_finish, stc_rating,
            frame_finish, head_detail, jamb_detail, sill_detail, notes,
            extraction_confidence, field_confidence_json, low_confidence_fields,
            created_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            datetime('now')
          )
          ON CONFLICT(session_id, mark) DO UPDATE SET
            hardware_group = excluded.hardware_group,
            fire_rating = excluded.fire_rating,
            width = excluded.width, height = excluded.height,
            width_inches = excluded.width_inches, height_inches = excluded.height_inches,
            door_type = excluded.door_type, door_material = excluded.door_material,
            frame_type = excluded.frame_type, frame_material = excluded.frame_material,
            panic = excluded.panic,
            extraction_confidence = excluded.extraction_confidence,
            field_confidence_json = excluded.field_confidence_json,
            low_confidence_fields = excluded.low_confidence_fields,
            updated_at = datetime('now')
        `).bind(
          entry.id,
          entry.session_id,
          entry.tenant_id,
          entry.page_number,
          entry.mark,
          entry.hardware_group,
          entry.fire_rating,
          entry.width,
          entry.height,
          entry.width_inches,
          entry.height_inches,
          entry.door_type,
          entry.door_material,
          entry.frame_type,
          entry.frame_material,
          entry.panic,
          entry.thickness,
          entry.thickness_inches,
          entry.door_finish,
          entry.stc_rating,
          entry.frame_finish,
          entry.head_detail,
          entry.jamb_detail,
          entry.sill_detail,
          entry.notes,
          entry.extraction_confidence,
          entry.field_confidence_json,
          entry.low_confidence_fields
        ).run();
        insertedCount++;
      } catch (insertError) {
        console.error(`[Door Schedule Extractor] Failed to insert entry ${entry.mark}:`, insertError.message);
      }
    }
    console.log(`[Door Schedule Extractor] Inserted/updated ${insertedCount} entries`);
    if (processedEntries.length > 0 && insertedCount === 0) {
      throw new Error(`door write failure: parsed ${processedEntries.length} entries, inserted 0 \u2014 check door_schedule_entries constraints/schema (see 051)`);
    }
    console.log("[Door Schedule Extractor] Step 7: Updating session flags...");
    await env2.DB.prepare(`
      UPDATE hardware_extraction_sessions
      SET door_schedule_extracted = 1,
          door_entries_count = door_entries_count + ?,
          pages_processed = pages_processed + 1,
          door_schedule_extracted_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(insertedCount, sessionId).run();
    const totalTime = Date.now() - startTime;
    let constraintExecutionId = null;
    try {
      const inputData = JSON.stringify({ pageNumber, totalPages, entriesFound: processedEntries.length });
      const inputHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputData));
      const inputHashHex = Array.from(new Uint8Array(inputHash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const outputData = JSON.stringify(processedEntries.map((e) => ({ mark: e.mark, hardware_group: e.hardware_group })));
      const outputHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(outputData));
      const outputHashHex = Array.from(new Uint8Array(outputHash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      await logConstraintExecution(
        sessionId,
        pageNumber,
        resolvedConstraints,
        inputHashHex,
        outputHashHex,
        true,
        // success
        null,
        // no error
        totalTime,
        env2
      );
      constraintExecutionId = `exec_${sessionId}_${pageNumber}`;
      console.log(`[Door Schedule Extractor] Execution logged for audit trail`);
    } catch (logError) {
      console.warn(`[Door Schedule Extractor] Failed to log execution: ${logError.message}`);
    }
    console.log(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Door Schedule Extractor] EXTRACTION COMPLETE - ${totalTime}ms`);
    console.log(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    return {
      success: true,
      entries_count: insertedCount,
      entries: processedEntries,
      low_confidence_count: lowConfidenceCount,
      constraint_execution_id: constraintExecutionId,
      page_metadata: parsedResponse.page_metadata,
      page_notes: parsedResponse.page_notes,
      duration_ms: totalTime
    };
  } catch (error4) {
    const totalTime = Date.now() - startTime;
    console.error(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.error(`[Door Schedule Extractor] EXTRACTION FAILED - ${totalTime}ms`);
    console.error(`[Door Schedule Extractor] Error: ${error4.message}`);
    console.error(`[Door Schedule Extractor] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    if (resolvedConstraints) {
      try {
        await logConstraintExecution(
          sessionId,
          pageNumber,
          resolvedConstraints,
          null,
          // no input hash
          null,
          // no output hash
          false,
          // failed
          error4.message,
          totalTime,
          env2
        );
      } catch (logError) {
        console.error(`[Door Schedule Extractor] Failed to log error: ${logError.message}`);
      }
    }
    return {
      success: false,
      entries_count: 0,
      entries: [],
      low_confidence_count: 0,
      constraint_execution_id: null,
      error: error4.message,
      duration_ms: totalTime
    };
  }
}
