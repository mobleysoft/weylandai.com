// src/routes/hardware-schedule-extract.js
//
// The last piece of the hardware-schedule cluster
// (WORKER_MODULARIZATION_MAP.md step 7): the original job-based
// extraction pair (extract/review/approve - the pre-session-based
// workflow, kept for backward compat alongside the newer session
// flow), starting a new extraction session (file-type detection, PDF
// bookmark/page-count resolution, schedule-page auto-detection),
// detect-schedules (text-layer vs. vision routing, creates schedule
// region candidates), session status, page-range/table-pages config,
// and batch-extract (the main multi-page extraction kickoff, either
// from affirmed region candidates or from an explicit page list).
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// non-contiguous across lines 147448-148665 - three unrelated
// /api/upload/* routes and the countPdfPagesRaw helper sit interleaved
// between approve/:groupNumber and start; the upload routes are a
// distinct concern and were deliberately left in place rather than
// dragged into this file's scope).
//
// countPdfPagesRaw: CORRECTED 2026-09-10 (routes/submittals.js's sibling
// extraction, routes/upload.js) - this comment previously claimed both
// its real call sites were inside this file's own routes (start,
// batch-extract), so it stayed local/private. That was wrong: a third
// call site remained in legacy-monolith.js's /api/upload/complete
// (now routes/upload.js), which had been silently broken (a
// ReferenceError, caught only by that route's own outer try/catch and
// surfaced as a generic 500) since this file's own extraction made
// this function module-private. Now exported so upload.js can import
// the real implementation instead of duplicating it.
//
// This file has by far the largest injected-dependency list of any
// piece extracted this session (matches WORKER_MODULARIZATION_MAP.md's
// own estimate of "~20 unscoped PDF-pipeline dependencies" for this
// group) - none of them were extracted themselves, since each has real
// fan-out into code that's either genuinely core PDF-processing
// internals (out of scope for a route-modularization pass) or CPS
// cluster territory (step 8, still unextracted). Reused from prior
// pieces: authenticate, jsonResponse3, requireActiveSubscription,
// arrayBufferToBase64 (real imports), getSessionStatus,
// detectAndPersistRegionConflicts (real import). New to this file:
// extractHardwareSchedule, storeHardwareExtraction, getHardwareGroupForReview,
// updateHardwareGroup, detectFileType, extractPdfBookmarks2,
// detectSchedulePages, createExtractionSession, logTelemetryEvent,
// detectTextLayer2.

import { jsonResponse3 } from "../lib/json-response.js";
import { detectAndPersistRegionConflicts } from "../lib/region-conflicts.js";
import { arrayBufferToBase64 } from "../auth-module.js";

export function countPdfPagesRaw(buffer) {
  try {
    const txt = new TextDecoder("latin1").decode(buffer);
    const pageObjs = (txt.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    if (pageObjs > 0)
      return pageObjs;
    let maxCount = 0;
    const re = /\/Count\s+(\d+)/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      const n = parseInt(m[1], 10);
      if (n > maxCount)
        maxCount = n;
    }
    return maxCount;
  } catch (e) {
    return 0;
  }
}

export function registerHardwareScheduleExtractRoutes(router, {
  authenticate,
  requireActiveSubscription,
  getSessionStatus,
  extractHardwareSchedule,
  storeHardwareExtraction,
  getHardwareGroupForReview,
  updateHardwareGroup,
  detectFileType,
  extractPdfBookmarks2,
  detectSchedulePages,
  createExtractionSession,
  logTelemetryEvent,
  detectTextLayer2,
}) {
router.post("/api/hardware-schedule/extract", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "Hardware Schedule";
    const submittalId = formData.get("submittalId") || null;
    if (!file) {
      return jsonResponse3({ error: "No file provided" }, 400);
    }
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return jsonResponse3({ error: "Only PDF files are supported" }, 400);
    }
    const jobId = crypto.randomUUID();
    const userId = user.userId;
    console.log(`[Hardware Extract] Starting extraction job ${jobId} for user ${userId}`);
    const fileBuffer = await file.arrayBuffer();
    const fileBufferKey = `hardware-schedules/${userId}/${jobId}`;
    await env2.CACHE.put(fileBufferKey, fileBuffer, {
      expirationTtl: 86400 * 7
      // 7 days
    });
    if (env2.UPLOADS) {
      await env2.UPLOADS.put(fileBufferKey, fileBuffer);
      console.log(`[Hardware Extract] PDF stored in R2: ${fileBufferKey}`);
    }
    const extractionResult = await extractHardwareSchedule(fileBuffer, env2);
    console.log(`[Hardware Extract] Extraction complete: ${extractionResult.hardware_groups.length} sets found`);
    const dbResult = await storeHardwareExtraction(extractionResult, env2, userId);
    await env2.DB.prepare(`
      INSERT INTO hardware_extraction_jobs
      (id, user_id, submittal_id, project_name, filename, file_buffer_key,
       total_sets, sets_approved, sets_rejected, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobId,
      userId,
      submittalId,
      projectName,
      file.name,
      fileBufferKey,
      extractionResult.hardware_groups.length,
      0,
      // sets_approved
      0,
      // sets_rejected
      "pending_review",
      (/* @__PURE__ */ new Date()).toISOString()
    ).run().catch((err) => {
      console.warn("[Hardware Extract] Could not create job record (table may not exist):", err.message);
    });
    return jsonResponse3({
      jobId,
      projectName,
      filename: file.name,
      extraction: {
        total_sets: extractionResult.hardware_groups.length,
        sets: extractionResult.hardware_groups.map((s) => ({
          set_number: s.group_number || s.set_number,
          set_name: s.group_name || s.set_name || s.description,
          component_count: s.components.length
        }))
      },
      database: {
        sets_inserted: dbResult.sets_inserted,
        components_inserted: dbResult.components_inserted
      },
      usage: extractionResult.usage,
      next_step: "Review each hardware group at /api/hardware-schedule/review/:groupNumber"
    }, 201);
  } catch (error5) {
    console.error("[Hardware Extract] Error:", error5);
    return jsonResponse3({
      error: "Failed to extract hardware schedule",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/review/:groupNumber", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const groupNumber = request2.params.groupNumber;
    if (!groupNumber) {
      return jsonResponse3({ error: "Set number is required" }, 400);
    }
    const hardwareGroup = await getHardwareGroupForReview(groupNumber, env2);
    if (!hardwareGroup) {
      return jsonResponse3({ error: `Hardware group ${groupNumber} not found` }, 404);
    }
    console.log(`[Hardware Review] Retrieved set ${groupNumber} with ${hardwareGroup.components.length} components`);
    return jsonResponse3({
      hardware_group: hardwareGroup
    });
  } catch (error5) {
    console.error("[Hardware Review] Error:", error5);
    return jsonResponse3({
      error: "Failed to retrieve hardware group",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/approve/:groupNumber", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const groupNumber = request2.params.groupNumber;
    const data = await request2.json();
    if (!groupNumber) {
      return jsonResponse3({ error: "Set number is required" }, 400);
    }
    console.log(`[Hardware Approve] Processing approval for set ${groupNumber}`);
    const result = await updateHardwareGroup(groupNumber, data, env2);
    if (data.jobId) {
      await env2.DB.prepare(`
        UPDATE hardware_extraction_jobs
        SET sets_approved = sets_approved + 1,
            updated_at = ?
        WHERE id = ?
      `).bind((/* @__PURE__ */ new Date()).toISOString(), data.jobId).run().catch((err) => {
        console.warn("[Hardware Approve] Could not update job record:", err.message);
      });
    }
    console.log(`[Hardware Approve] Set ${groupNumber} approved and updated`);
    return jsonResponse3({
      success: true,
      set_number: groupNumber,
      message: `Hardware group ${groupNumber} has been approved and saved`
    });
  } catch (error5) {
    console.error("[Hardware Approve] Error:", error5);
    return jsonResponse3({
      error: "Failed to approve hardware group",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/start", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const subError = await requireActiveSubscription(user, env2);
  if (subError)
    return subError;
  try {
    const formData = await request2.formData();
    const file = formData.get("file");
    const projectName = formData.get("projectName") || "Hardware Schedule";
    const submittalId = formData.get("submittalId") || null;
    const totalPages = parseInt(formData.get("totalPages") || "0", 10);
    const documentType = formData.get("document_type") || "hardware_schedule";
    const tenantId = formData.get("tenant_id") || (request2?.user?.tenant_id || "ven_weyland");
    if (!file) {
      return jsonResponse3({ error: "No file provided" }, 400);
    }
    const validDocumentTypes = ["door_schedule", "hardware_schedule", "finish_schedule", "frame_schedule"];
    if (!validDocumentTypes.includes(documentType)) {
      return jsonResponse3({
        error: "Invalid document_type",
        valid_types: validDocumentTypes
      }, 400);
    }
    const fileBuffer = await file.arrayBuffer();
    const fileInfo = detectFileType(fileBuffer);
    if (fileInfo.type === "unknown") {
      return jsonResponse3({
        success: false,
        error: "UNSUPPORTED_FILE_TYPE",
        message: "Please upload a PDF or image file (PNG, JPEG, WebP, GIF)"
      }, 400);
    }
    const userId = user.userId;
    let pageCount;
    let sourceType;
    let documentOutline = null;
    if (fileInfo.type === "image") {
      pageCount = 1;
      sourceType = "image";
      console.log(`[Hardware Session] Image upload detected (${fileInfo.mimeType}) for user ${userId}`);
    } else {
      sourceType = "pdf";
      const pdfInfo = await extractPdfBookmarks2(fileBuffer);
      pageCount = totalPages > 0 ? totalPages : pdfInfo.numPages;
      documentOutline = pdfInfo.bookmarks;
      if (!(pageCount > 1)) {
        const rawCount = countPdfPagesRaw(fileBuffer);
        if (rawCount > (pageCount || 0))
          pageCount = rawCount;
      }
      console.log(`[Hardware Session] PDF upload detected (${pageCount} pages) for user ${userId}`);
    }
    const fileBufferKey = `hardware-sessions/${userId}/${crypto.randomUUID()}`;
    if (fileBuffer.byteLength <= 25 * 1024 * 1024) {
      await env2.CACHE.put(fileBufferKey, fileBuffer, {
        expirationTtl: 86400 * 7
        // 7 days
      });
    } else {
      console.log(`[Hardware Session] Skipping KV cache \u2014 file ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds 25MB KV limit. R2-only storage.`);
    }
    if (env2.UPLOADS) {
      await env2.UPLOADS.put(fileBufferKey, fileBuffer);
      console.log(`[Hardware Session] File stored in R2: ${fileBufferKey} (${sourceType})`);
    }
    let detectedSchedulePages = null;
    if (documentOutline) {
      detectedSchedulePages = detectSchedulePages(documentOutline, documentType);
    }
    const sessionId = await createExtractionSession({
      userId,
      submittalId,
      projectName,
      filename: file.name,
      fileBufferKey,
      totalPages: pageCount,
      sourceType,
      // 'pdf' or 'image' - file format routing
      documentType,
      // 'door_schedule' or 'hardware_schedule' - schedule type routing
      tenantId,
      // CH-2026-0120-UI-001: tenant context for constraints
      documentOutline,
      // 27A: PDF bookmark tree
      detectedSchedulePages
      // 27A: auto-detected schedule pages
    }, env2);
    console.log(`[Hardware Session] Created session ${sessionId} with ${pageCount} pages (${sourceType}, ${documentType})`);
    await logTelemetryEvent(env2, {
      eventType: "session",
      eventName: "hardware_session_created",
      severity: "info",
      message: `Hardware extraction session created: ${projectName}`,
      context: {
        session_id: sessionId,
        project_name: projectName,
        filename: file.name,
        total_pages: pageCount,
        file_size_bytes: fileBuffer.byteLength,
        submittal_id: submittalId,
        source_type: sourceType,
        // 'pdf' or 'image'
        document_type: documentType
        // 'door_schedule' or 'hardware_schedule'
      },
      userId: user.userId,
      sessionId
    });
    return jsonResponse3({
      sessionId,
      projectName,
      filename: file.name,
      totalPages: pageCount,
      sourceType,
      // Include in response for client awareness
      documentType,
      // FX-2026-0121-UI-003: Include document type for client routing
      documentOutline,
      // 27A: PDF bookmark tree
      detectedSchedulePages,
      // 27A: auto-detected schedule pages
      status: "active",
      message: sourceType === "image" ? `Image session created (${documentType}). Ready for extraction.` : `Session created (${documentType}). Start extracting pages 1-${pageCount}`,
      next_step: `GET /api/hardware-schedule/session/${sessionId}/page/1`
    }, 201);
  } catch (error5) {
    console.error("[Hardware Session] Error:", error5);
    await logTelemetryEvent(env2, {
      eventType: "session",
      eventName: "hardware_session_failed",
      severity: "error",
      message: `Hardware extraction session creation failed`,
      context: {
        error_message: error5.message
      },
      userId: user.userId
    });
    return jsonResponse3({
      error: "Failed to start extraction session",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/detect-schedules", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json().catch(() => ({}));
    const pages = body.pages || "all";
    const forceVision = body.force_vision === true;
    console.log(`[Detect Schedules] Starting detection for session ${sessionId}, force_vision=${forceVision}`);
    const session = await env2.DB.prepare(`
      SELECT id, user_id, project_name, file_buffer_key, total_pages, status, detection_status
      FROM hardware_extraction_sessions
      WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Access denied" }, 403);
    }
    if (session.detection_status === "complete") {
      console.log(`[Detect Schedules] Detection already complete for session ${sessionId}`);
      const existingCandidates = await env2.DB.prepare(`
        SELECT id, page_number, schedule_type, detection_confidence, bounding_box,
               detection_hints_found, row_count_estimate, detection_method, status
        FROM schedule_region_candidates
        WHERE session_id = ?
        ORDER BY page_number, detection_confidence DESC
      `).bind(sessionId).all();
      const candidates2 = (existingCandidates.results || []).map((c) => ({
        id: c.id,
        page_number: c.page_number,
        schedule_type: c.schedule_type,
        confidence: c.detection_confidence,
        detection_method: c.detection_method,
        detected_headers: c.detection_hints_found ? JSON.parse(c.detection_hints_found) : [],
        bounding_box: c.bounding_box ? JSON.parse(c.bounding_box) : null,
        status: c.status
      }));
      return jsonResponse3({
        success: true,
        session_id: sessionId,
        detection_summary: {
          pages_scanned: session.total_pages,
          routing_decision: session.detection_method || "unknown",
          text_items_found: 0,
          // Not stored from previous run
          candidates_created: candidates2.length
        },
        candidates: candidates2,
        next_step: candidates2.length > 0 ? { action: "affirm_candidates", endpoint: `/api/hardware-schedule/session/${sessionId}/candidates` } : { action: "user_region_selection", reason: "No candidates detected", endpoint: `/api/hardware-schedule/session/${sessionId}/candidates` },
        cached: true
      });
    }
    const uploadKey = session.file_buffer_key;
    let pdfBuffer = null;
    if (env2.UPLOADS) {
      const pdfObject = await env2.UPLOADS.get(uploadKey);
      if (pdfObject) {
        pdfBuffer = await pdfObject.arrayBuffer();
        console.log(`[Detect Schedules] PDF retrieved from R2: ${uploadKey} (${pdfBuffer.byteLength} bytes)`);
      }
    }
    if (!pdfBuffer && env2.CACHE) {
      pdfBuffer = await env2.CACHE.get(uploadKey, { type: "arrayBuffer" });
      if (pdfBuffer) {
        console.log(`[Detect Schedules] PDF retrieved from KV cache: ${uploadKey}`);
      }
    }
    if (!pdfBuffer) {
      return jsonResponse3({
        error: "PDF not found",
        details: "The PDF file has expired or was not uploaded. Please re-upload the document."
      }, 404);
    }
    let textLayerResult;
    let routingDecision;
    if (forceVision) {
      routingDecision = "vision-primary";
      textLayerResult = {
        hasTextLayer: false,
        textItemCount: 0,
        route: "vision-primary",
        sampledPages: 0,
        avgItemsPerPage: 0,
        totalPages: session.total_pages,
        forced: true
      };
      console.log(`[Detect Schedules] Vision-primary forced by user request`);
    } else {
      textLayerResult = await detectTextLayer2(pdfBuffer);
      routingDecision = textLayerResult.route;
      console.log(`[Detect Schedules] Text layer detection result: ${routingDecision}, ${textLayerResult.textItemCount} items`);
    }
    let candidates = [];
    if (routingDecision === "text-extractable") {
      console.log(`[Detect Schedules] Text-extractable route - creating candidates from text analysis`);
    } else {
      console.log(`[Detect Schedules] Vision-primary route - calling weyland-ocr-worker`);
      try {
        if (!env2.OCR_SERVICE) throw new Error("OCR_SERVICE binding not configured");
        const ocrResp = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/detect-schedules", {
          method: "POST",
          headers: { "X-Session-Id": sessionId, "X-Total-Pages": String(session.total_pages) },
          body: pdfBuffer,
        });
        if (!ocrResp.ok) {
          const errBody = await ocrResp.text().catch(() => "");
          throw new Error(`OCR service returned ${ocrResp.status}: ${errBody.slice(0, 300)}`);
        }
        const visionResult = await ocrResp.json();
        candidates = (visionResult.candidates || []).map((c) => ({
          id: `cand_${sessionId}_${c.pageNumber}_${crypto.randomUUID().slice(0, 8)}`,
          session_id: sessionId,
          page_number: c.pageNumber,
          schedule_type: c.scheduleType,
          detection_confidence: null,
          // Full-page candidate - this pipeline detects candidate PAGES, not
          // sub-regions within a page. Real dimensions aren't known here
          // (the ocr-worker doesn't return them); recorded as null rather
          // than fabricated.
          bounding_box: JSON.stringify({ x: 0, y: 0, width: null, height: null }),
          detection_hints_found: null,
          row_count_estimate: null,
          detection_method: "ocr_title_scan_pdfium",
          status: "pending",
        }));
        if (candidates.length > 0) {
          const stmt = env2.DB.prepare(`
            INSERT INTO schedule_region_candidates
              (id, session_id, page_number, schedule_type, detection_confidence, bounding_box,
               detection_hints_found, row_count_estimate, detection_method, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          await env2.DB.batch(candidates.map((c) => stmt.bind(
            c.id, c.session_id, c.page_number, c.schedule_type, c.detection_confidence,
            c.bounding_box, c.detection_hints_found, c.row_count_estimate, c.detection_method, c.status,
          )));
        }
        console.log(`[Detect Schedules] OCR detection found ${candidates.length} candidates (${visionResult.pagesWithNoOcrText} pages with no OCR text, ${(visionResult.unresolved || []).length} unresolved)`);
      } catch (visionError) {
        console.error(`[Detect Schedules] OCR detection failed, falling back to manual selection:`, visionError.message);
      }
    }
    await env2.DB.prepare(`
      UPDATE hardware_extraction_sessions
      SET detection_status = 'complete',
          detection_method = ?,
          text_extraction_viable = ?,
          candidates_count = ?,
          detection_completed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      routingDecision,
      routingDecision === "text-extractable" ? 1 : 0,
      candidates.length,
      sessionId
    ).run();
    const elapsedMs = Date.now() - startTime;
    console.log(`[Detect Schedules] Detection complete in ${elapsedMs}ms: ${routingDecision}, ${candidates.length} candidates`);
    await logTelemetryEvent(env2, {
      eventType: "detection",
      eventName: "schedule_detection_complete",
      severity: "info",
      message: `Schedule detection complete: ${routingDecision}`,
      context: {
        session_id: sessionId,
        routing_decision: routingDecision,
        text_items_found: textLayerResult.textItemCount,
        candidates_created: candidates.length,
        pages_scanned: textLayerResult.sampledPages || textLayerResult.totalPages,
        detection_time_ms: elapsedMs,
        force_vision: forceVision
      },
      userId: user.userId,
      sessionId
    });
    const response = {
      success: true,
      session_id: sessionId,
      detection_summary: {
        pages_scanned: textLayerResult.totalPages || session.total_pages,
        routing_decision: routingDecision,
        text_items_found: textLayerResult.textItemCount,
        candidates_created: candidates.length,
        detection_time_ms: elapsedMs
      },
      next_step: routingDecision === "vision-primary" ? {
        action: "user_region_selection",
        reason: "No text layer detected - document requires human-guided region selection",
        endpoint: `/api/hardware-schedule/session/${sessionId}/candidates`
      } : candidates.length > 0 ? {
        action: "affirm_candidates",
        endpoint: `/api/hardware-schedule/session/${sessionId}/candidates`
      } : {
        action: "user_region_selection",
        reason: "Text layer detected but no schedule tables found - please identify regions manually",
        endpoint: `/api/hardware-schedule/session/${sessionId}/candidates`
      }
    };
    if (candidates.length > 0) {
      response.candidates = candidates;
    }
    return jsonResponse3(response);
  } catch (error5) {
    console.error("[Detect Schedules] Error:", error5);
    await logTelemetryEvent(env2, {
      eventType: "detection",
      eventName: "schedule_detection_failed",
      severity: "error",
      message: `Schedule detection failed: ${error5.message}`,
      context: {
        session_id: request2.params?.sessionId,
        error_message: error5.message,
        error_stack: error5.stack?.substring(0, 500)
      },
      userId: user.userId
    });
    return jsonResponse3({
      error: "Detection failed",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/status", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const status = await getSessionStatus(sessionId, env2);
    if (!status) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    return jsonResponse3({
      session: status
    });
  } catch (error5) {
    console.error("[Hardware Session] Error:", error5);
    return jsonResponse3({
      error: "Failed to get session status",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/set-page-range", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    const { extraction_page_range } = body;
    const session = await env2.DB.prepare(`
      SELECT id, user_id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?
    `).bind(sessionId, user.userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found", message: "Session not found" }, 404);
    }
    if (extraction_page_range !== null) {
      const ranges = Array.isArray(extraction_page_range) ? extraction_page_range : [extraction_page_range];
      for (const r of ranges) {
        if (!r || !r.start || !r.end || r.start < 1 || r.end < r.start) {
          return jsonResponse3({
            error: "Invalid page range",
            message: "Each range requires {start, end} where start >= 1 and end >= start"
          }, 400);
        }
      }
    }
    await env2.DB.prepare(`
      UPDATE hardware_extraction_sessions SET extraction_page_range = ? WHERE id = ?
    `).bind(
      extraction_page_range ? JSON.stringify(extraction_page_range) : null,
      sessionId
    ).run();
    console.log(`[27A Page Range] Session ${sessionId}: ${extraction_page_range ? JSON.stringify(extraction_page_range) : "cleared"}`);
    return jsonResponse3({
      success: true,
      extraction_page_range
    });
  } catch (error5) {
    console.error("[27A Page Range] Error:", error5);
    return jsonResponse3({
      error: "Failed to set page range",
      message: "Failed to set page range: " + error5.message,
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/set-table-pages", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    const { schedule_table_pages } = body;
    const session = await env2.DB.prepare(`
      SELECT id, user_id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?
    `).bind(sessionId, user.userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found", message: "Session not found" }, 404);
    }
    if (schedule_table_pages !== null) {
      if (!Array.isArray(schedule_table_pages) || schedule_table_pages.some((p) => typeof p !== "number" || p < 1 || !Number.isInteger(p))) {
        return jsonResponse3({
          error: "Invalid table pages",
          message: "schedule_table_pages must be an array of positive integers"
        }, 400);
      }
    }
    await env2.DB.prepare(`
      UPDATE hardware_extraction_sessions SET schedule_table_pages = ? WHERE id = ?
    `).bind(
      schedule_table_pages ? JSON.stringify(schedule_table_pages) : null,
      sessionId
    ).run();
    console.log(`[27A Table Pages] Session ${sessionId}: ${schedule_table_pages ? schedule_table_pages.join(", ") : "cleared"}`);
    return jsonResponse3({
      success: true,
      schedule_table_pages
    });
  } catch (error5) {
    console.error("[27A Table Pages] Error:", error5);
    return jsonResponse3({
      error: "Failed to set table pages",
      message: "Failed to set table pages: " + error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/batch-extract", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId } = request2.params;
    const body = await request2.json();
    const { pages, dpi = 600, auto_affirm_tables = false } = body;
    const userId = user?.email || user?.id || "anonymous";
    const useAffirmed = body.use_affirmed === true || Array.isArray(body.candidate_ids) && body.candidate_ids.length > 0;
    if (!useAffirmed && (!pages || !Array.isArray(pages) || pages.length === 0)) {
      return jsonResponse3({ error: "pages array required" }, 400);
    }
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    let routeForSession = env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local";
    try {
      const _rr = await env2.DB.prepare(
        `SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (_rr?.extraction_route)
        routeForSession = _rr.extraction_route;
    } catch (e) {
    }
    const scheduleType = session.document_type || "hardware_schedule";
    let tablePages = [];
    const autoAffirmPages = [];
    let candidateIds = [];
    let extractingPageNums = [];
    const fullPageBox = JSON.stringify({ x: 0, y: 0, width: 9999, height: 9999 });
    if (useAffirmed) {
      await detectAndPersistRegionConflicts(sessionId, env2);
      let q = `SELECT id, page_number, review_status, conflict_reason FROM schedule_region_candidates WHERE session_id = ? AND status = 'affirmed'`;
      const qp = [sessionId];
      if (Array.isArray(body.candidate_ids) && body.candidate_ids.length > 0) {
        q += ` AND id IN (${body.candidate_ids.map(() => "?").join(",")})`;
        qp.push(...body.candidate_ids);
      }
      q += ` ORDER BY COALESCE(parse_order, 999999), page_number`;
      const { results: affirmed } = await env2.DB.prepare(q).bind(...qp).all();
      const blocked = (affirmed || []).filter((c) => c.review_status === "conflict");
      if (blocked.length > 0) {
        return jsonResponse3({
          error: "conflicts_unresolved",
          message: "Resolve flagged region conflicts before extracting.",
          conflicts: blocked.map((c) => ({ candidate_id: c.id, page: c.page_number, reason: c.conflict_reason }))
        }, 409);
      }
      candidateIds = (affirmed || []).map((c) => c.id);
      extractingPageNums = (affirmed || []).map((c) => c.page_number);
      if (candidateIds.length === 0) {
        return jsonResponse3({ error: "no_affirmed_candidates", message: "No affirmed regions to extract. Draw and affirm at least one region." }, 400);
      }
      console.log(`[Batch Extract] Session ${sessionId}: multi-region use_affirmed -> ${candidateIds.length} affirmed candidates (parse_order)`);
    } else {
      let detectedLookup = {};
      if (session.detected_schedule_pages) {
        try {
          const detected = typeof session.detected_schedule_pages === "string" ? JSON.parse(session.detected_schedule_pages) : session.detected_schedule_pages;
          for (const d of detected) {
            detectedLookup[d.page] = d;
          }
        } catch (e) {
        }
      }
      for (const pageNum of pages) {
        const detected = detectedLookup[pageNum];
        if (!auto_affirm_tables && detected && detected.page_type === "schedule_table") {
          tablePages.push({ page: pageNum, title: detected.title || "", confidence: detected.confidence });
        } else {
          autoAffirmPages.push(pageNum);
        }
      }
      if (autoAffirmPages.length === 0 && tablePages.length > 0) {
        for (const tp of tablePages)
          autoAffirmPages.push(tp.page);
        tablePages = [];
      }
      for (const pageNum of autoAffirmPages) {
        const candidateId = crypto.randomUUID();
        await env2.DB.prepare(`
          INSERT INTO schedule_region_candidates
            (id, session_id, page_number, schedule_type, bounding_box, detection_method, status, affirmed_by, affirmed_at, extraction_dpi, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'batch-extract', 'affirmed', ?, datetime('now'), ?, datetime('now'), datetime('now'))
        `).bind(candidateId, sessionId, pageNum, scheduleType, fullPageBox, userId, dpi).run();
        candidateIds.push(candidateId);
      }
      extractingPageNums = autoAffirmPages;
      console.log(`[Batch Extract] Session ${sessionId}: ${autoAffirmPages.length} auto-affirmed, ${tablePages.length} table pages awaiting region selection`);
    }
    let extractionResult = null;
    if (candidateIds.length > 0) {
      const bufferKey = session.file_buffer_key || "uploads/" + sessionId + ".pdf";
      let fileBuffer = pdfBufferOrNull(await env2.CACHE.get(bufferKey, { type: "arrayBuffer" }), bufferKey);
      let pdfStreamUrl = null;
      if (fileBuffer && fileBuffer.byteLength > 20 * 1024 * 1024 && env2.UPLOADS) {
        console.log(`[Batch Extract] KV returned ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB \u2014 switching to R2 streaming to avoid OOM`);
        fileBuffer = null;
        pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
      } else if (!fileBuffer && env2.UPLOADS) {
        pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
        console.log("[Batch Extract] Using R2 stream URL (avoiding OOM for large PDFs)");
      }
      if ((fileBuffer || pdfStreamUrl) && routeForSession === "claude_code_local") {
        const packets = [];
        const _projRow = await env2.DB.prepare("SELECT project_id FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
        const projectId = _projRow?.project_id || null;
        const ownerForCheck = user.mhsId || user.mhs_id || null;
        try {
          const bs = await callEdge("GET", `/ai/v1/bridge/status?owner_id=${encodeURIComponent(ownerForCheck || "")}`, env2);
          if (bs.status === 200 && bs.body && bs.body.online === false) {
            return jsonResponse3({
              error: "bridge_offline",
              message: "Your Claude Code bridge is not running. Start it (Download launcher) and retry.",
              owner_id: ownerForCheck,
              has_token: !!bs.body.has_token
            }, 409);
          }
        } catch (e) {
        }
        for (const cId of candidateIds) {
          const candidate = await env2.DB.prepare("SELECT * FROM schedule_region_candidates WHERE id = ?").bind(cId).first();
          if (!candidate)
            continue;
          try {
            const _pctBox = (() => {
              try {
                const p = JSON.parse(candidate.bounding_box_percent || "null");
                return p && typeof p.x_percent === "number" ? p : null;
              } catch (e) {
                return null;
              }
            })();
            let boundingBox = _pctBox || JSON.parse(candidate.user_adjusted_bounding_box || candidate.bounding_box);
            if (candidate.schedule_type === "door_schedule") {
              boundingBox = { ...boundingBox, pad_w_percent: 0.05, pad_h_percent: 0.04 };
            }
            const candidateDpi = candidate.extraction_dpi || 600;
            const rendered = await renderRegionAt600DPI2(fileBuffer, candidate.page_number, boundingBox, env2, candidateDpi, pdfStreamUrl);
            const imageBase64 = arrayBufferToBase64(rendered.imageBuffer);
            const q = await queuePageExtractionJob(imageBase64, env2, {
              pageNumber: candidate.page_number,
              totalPages: session.page_count || 1,
              sessionId,
              tenantId: session.tenant_id || "ven_weyland",
              ownerMhsId: user.mhsId || user.mhs_id || null,
              // WO-2026-0623-WEYLAND-003 (decision A): carry operator guidance + cross-ref ties
              operatorNotes: candidate.user_notes || null,
              crossRefGuidance: candidate.cross_ref || null,
              // CH-2026-0706 STEP 2: door regions queue with the PROVEN door prompt
              scheduleType: candidate.schedule_type || null
            });
            const kuId = crypto.randomUUID();
            await env2.DB.prepare(`
              INSERT OR REPLACE INTO kdp_packets
                (id, connection_id, project_id, candidate_id, page_number, sequence, unit_type, job_id, route, owner_id, state, attempts, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude_code_local', ?, 'in_flight', 1, datetime('now'), datetime('now'))
            `).bind(
              kuId,
              sessionId,
              projectId,
              cId,
              candidate.page_number,
              candidate.page_number,
              candidate.schedule_type === "door_schedule" ? "door_mark" : "hardware_set",
              q.job_id,
              q.owner_id
            ).run();
            await env2.DB.prepare(`UPDATE schedule_region_candidates SET status = 'extracting', extraction_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(cId).run();
            packets.push({
              ku_id: kuId,
              candidate_id: cId,
              page: candidate.page_number,
              job_id: q.job_id,
              poll_url: `/api/jobs/${q.job_id}`,
              finalize_url: `/api/hardware-schedule/session/${sessionId}/page/${candidate.page_number}/finalize-image/${q.job_id}`
            });
          } catch (qErr) {
            console.error(`[Batch Extract][async] queue failed page ${candidate.page_number}:`, qErr.message);
            await env2.DB.prepare(`UPDATE schedule_region_candidates SET status = 'failed', extraction_error = ?, updated_at = datetime('now') WHERE id = ?`).bind(String(qErr.message).slice(0, 500), cId).run();
            packets.push({ candidate_id: cId, page: candidate.page_number, error: qErr.message });
          }
        }
        return jsonResponse3({
          success: true,
          async: true,
          session_id: sessionId,
          auto_affirmed_count: autoAffirmPages.length,
          table_pages: tablePages,
          table_pages_count: tablePages.length,
          packets,
          message: "Queued to your bridge. Poll each job, then finalize per page."
        });
      }
      if (fileBuffer || pdfStreamUrl) {
        const results = [];
        const context3 = {
          sessionId,
          tenantId: session.tenant_id || "ven_weyland",
          industryId: session.industry_id || "ind_doors"
        };
        const priorExtractions = {
          groups: [],
          matrixEntries: [],
          nomenclature: null,
          pagesExtracted: [],
          pageTypes: {}
        };
        try {
          const existingHpe = await env2.DB.prepare(
            "SELECT page_number, extracted_data FROM hardware_page_extractions WHERE session_id = ?"
          ).bind(sessionId).all();
          const extractingPages = new Set(extractingPageNums);
          for (const row of existingHpe.results || []) {
            if (extractingPages.has(row.page_number))
              continue;
            try {
              const data = JSON.parse(row.extracted_data);
              const groups = data.hardware_groups || [];
              for (const g of groups) {
                priorExtractions.groups.push({ groupNumber: g.group_number, groupName: g.group_name || "", page: row.page_number, componentCount: (g.components || []).length, assignedDoors: g.assigned_doors || [] });
              }
              for (const m of data.door_hardware_matrix || []) {
                priorExtractions.matrixEntries.push({ doorNumber: m.door_number, hardwareSetNumber: m.hardware_set_number, page: row.page_number });
              }
              if (!priorExtractions.nomenclature && data.detected_nomenclature) {
                priorExtractions.nomenclature = { hardwareUnitTerm: data.detected_nomenclature.hardware_unit_term || "group", doorIdentifierTerm: data.detected_nomenclature.door_identifier_term || "door" };
              }
              priorExtractions.pagesExtracted.push(row.page_number);
              priorExtractions.pageTypes[row.page_number] = groups.length > 0 ? "schedule" : (data.door_hardware_matrix || []).length > 0 ? "door_matrix" : "other";
            } catch (e) {
            }
          }
          if (priorExtractions.pagesExtracted.length > 0) {
            console.log(`[Batch Extract] Seeded context: ${priorExtractions.groups.length} groups from ${priorExtractions.pagesExtracted.length} prior pages`);
          }
        } catch (e) {
        }
        const pagesWrittenThisRun = /* @__PURE__ */ new Set();
        for (const cId of candidateIds) {
          const candidate = await env2.DB.prepare(
            "SELECT * FROM schedule_region_candidates WHERE id = ?"
          ).bind(cId).first();
          if (!candidate)
            continue;
          try {
            await env2.DB.prepare(`
              UPDATE schedule_region_candidates SET status = 'extracting', extraction_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
            `).bind(cId).run();
            const _pctBox = (() => {
              try {
                const p = JSON.parse(candidate.bounding_box_percent || "null");
                return p && typeof p.x_percent === "number" ? p : null;
              } catch (e) {
                return null;
              }
            })();
            const boundingBox = _pctBox || JSON.parse(candidate.user_adjusted_bounding_box || candidate.bounding_box);
            const candidateDpi = candidate.extraction_dpi || 600;
            const rendered = await renderRegionAt600DPI2(fileBuffer, candidate.page_number, boundingBox, env2, candidateDpi, pdfStreamUrl);
            const extractionRes = await routeExtraction(
              candidate.schedule_type,
              rendered.imageBuffer,
              {
                ...context3,
                candidateId: cId,
                pageNumber: candidate.page_number,
                totalPages: session.page_count || 1,
                priorExtractions,
                operatorNotes: candidate.user_notes || null,
                crossRefGuidance: candidate.cross_ref || null
              },
              env2
            );
            if (extractionRes && extractionRes.success !== false) {
              const hpeData = extractionRes.hardware_groups ? extractionRes : { hardware_groups: extractionRes.entries || [], ...extractionRes };
              const mergeThisPage = pagesWrittenThisRun.has(candidate.page_number);
              await savePageExtraction2(sessionId, candidate.page_number, hpeData, env2, { merge: mergeThisPage });
              pagesWrittenThisRun.add(candidate.page_number);
              const hwGroups = hpeData.hardware_groups || [];
              for (const g of hwGroups) {
                priorExtractions.groups.push({ groupNumber: g.group_number, groupName: g.group_name || "", page: candidate.page_number, componentCount: (g.components || []).length, assignedDoors: g.assigned_doors || [] });
              }
              for (const m of hpeData.door_hardware_matrix || []) {
                priorExtractions.matrixEntries.push({ doorNumber: m.door_number, hardwareSetNumber: m.hardware_set_number, page: candidate.page_number });
              }
              if (!priorExtractions.nomenclature && hpeData.detected_nomenclature) {
                priorExtractions.nomenclature = { hardwareUnitTerm: hpeData.detected_nomenclature.hardware_unit_term || "group", doorIdentifierTerm: hpeData.detected_nomenclature.door_identifier_term || "door" };
              }
              priorExtractions.pagesExtracted.push(candidate.page_number);
              priorExtractions.pageTypes[candidate.page_number] = hwGroups.length > 0 ? "schedule" : (hpeData.door_hardware_matrix || []).length > 0 ? "door_matrix" : "other";
            }
            await env2.DB.prepare(`
              UPDATE schedule_region_candidates SET status = 'extracted', extraction_completed_at = datetime('now'), extraction_entry_count = ?, updated_at = datetime('now') WHERE id = ?
            `).bind(extractionRes.entry_count || 0, cId).run();
            results.push({
              candidate_id: cId,
              page: candidate.page_number,
              status: "extracted",
              entry_count: extractionRes.entry_count || 0,
              _debug: {
                schedule_type: candidate.schedule_type,
                has_hw_groups: !!extractionRes.hardware_groups,
                hw_group_count: (extractionRes.hardware_groups || []).length,
                has_entries: !!extractionRes.entries,
                entry_arr_count: (extractionRes.entries || []).length,
                config_used: extractionRes.config_used || null,
                fallback_reason: extractionRes.fallback_reason || null,
                raw_preview: extractionRes._raw_preview || null,
                prior_context_pages: priorExtractions.pagesExtracted.length
              }
            });
          } catch (exErr) {
            console.error(`[Batch Extract] Failed page ${candidate.page_number}:`, exErr);
            await env2.DB.prepare(`
              UPDATE schedule_region_candidates SET status = 'failed', updated_at = datetime('now') WHERE id = ?
            `).bind(cId).run();
            results.push({ candidate_id: cId, page: candidate.page_number, status: "failed", error: exErr.message });
          }
        }
        extractionResult = results;
      }
    }
    if (extractionResult && extractionResult.length > 0) {
      const extractedCount = extractionResult.filter((r) => r.status === "extracted").length;
      if (extractedCount > 0) {
        try {
          const transformResult = await transformDoorEntriesToHardwareSets(sessionId, userId, env2);
          console.log(`[Batch Extract] Bridge: ${transformResult.setsCreated} hardware_sets from ${transformResult.totalMarks} entries`);
        } catch (transformError) {
          console.error("[Batch Extract] Bridge failed (non-blocking):", transformError.message);
        }
        try {
          const matResult = await materializeDseToLineItems(sessionId, env2);
          console.log(`[Batch Extract] Materialize: ${matResult.doorsCreated} door groups, ${matResult.framesCreated} frame groups`);
        } catch (matError) {
          console.error("[Batch Extract] Materialize failed (non-blocking):", matError.message);
        }
      }
    }
    const pageDataMap = {};
    if (extractionResult && extractionResult.length > 0) {
      const extractedPageNums = extractionResult.filter((r) => r.status === "extracted").map((r) => r.page);
      if (extractedPageNums.length > 0) {
        const placeholders = extractedPageNums.map(() => "?").join(",");
        const hpeRows = await env2.DB.prepare(`
          SELECT page_number, extracted_data, affirm_state
          FROM hardware_page_extractions
          WHERE session_id = ? AND page_number IN (${placeholders})
          ORDER BY page_number
        `).bind(sessionId, ...extractedPageNums).all();
        for (const row of hpeRows.results || []) {
          try {
            const data = JSON.parse(row.extracted_data);
            pageDataMap[row.page_number] = {
              groups: data.hardware_groups || data.hardwareGroups || [],
              affirm_state: row.affirm_state || "pending_review"
            };
          } catch (e) {
          }
        }
      }
    }
    const _extractedOk = (extractionResult || []).filter((r) => r.status === "extracted").length;
    return jsonResponse3({
      success: true,
      session_id: sessionId,
      use_affirmed: useAffirmed,
      candidate_count: candidateIds.length,
      auto_affirmed_count: autoAffirmPages.length,
      table_pages: tablePages,
      table_pages_count: tablePages.length,
      extraction_results: extractionResult,
      page_data: pageDataMap,
      message: useAffirmed ? `${_extractedOk} of ${candidateIds.length} affirmed region(s) extracted.` : tablePages.length > 0 ? `${autoAffirmPages.length} pages extracted. ${tablePages.length} table pages ready for targeted region selection.` : `${autoAffirmPages.length} pages extracted via Path C.`
    });
  } catch (error5) {
    console.error("[Batch Extract] Error:", error5);
    return jsonResponse3({ error: "Batch extraction failed", details: error5.message }, 500);
  }
});
}
