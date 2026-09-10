// src/routes/hardware-schedule-page-extract.js
//
// Single-page Claude Vision extraction workflow: fetch/extract a page
// (cache-first, with KV->R2 fallback for the source PDF), approve a
// page's corrected data into real hardware_sets/hardware_components
// rows, run just the extract-image step in isolation, inspect the
// resolved extraction contract for a page (which prompt/schema version
// would be used), and submit an already-rendered image straight to
// extract-result. Extracted 2026-09-10 from legacy-monolith.js
// (previously inline, lines 148844-149269).
//
// authenticate/jsonResponse3/classifyError/jsonErrorResponse/ErrorMetrics
// are real top-level imports (error-utilities.js was just wired into
// the build this session, same as rate-limit.js earlier).
//
// Five shared cluster-wide helpers stay injected dependencies,
// continuing the pattern from every prior piece: getSessionStatus,
// isPageInRange (both already established), extractFromPageImage,
// queuePageExtractionJob (both already established from the prior
// piece), plus four new to this file - approvePageExtraction,
// extractSinglePage, resolveExtractionContract, savePageExtraction2 -
// each with real call sites in routes still inline elsewhere in the
// cluster.

import { jsonResponse3 } from "../lib/json-response.js";
import { classifyError, jsonErrorResponse, ErrorMetrics } from "../error-utilities.js";

export function registerHardwareSchedulePageExtractRoutes(router, {
  authenticate,
  getSessionStatus,
  isPageInRange,
  extractFromPageImage,
  queuePageExtractionJob,
  approvePageExtraction,
  extractSinglePage,
  resolveExtractionContract,
  savePageExtraction2,
}) {
router.get("/api/hardware-schedule/session/:sessionId/page/:pageNum", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  const metrics = new ErrorMetrics(env2);
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    if (!pageNum || pageNum < 1) {
      const validationError = new Error("Invalid page number");
      validationError.retryable = false;
      throw validationError;
    }
    console.log(`[Hardware Page] Extracting page ${pageNum} for session ${sessionId}`);
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      const notFoundError = new Error("Session not found");
      notFoundError.retryable = false;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    if (pageNum > session.total_pages) {
      const validationError = new Error(`Page ${pageNum} exceeds total pages (${session.total_pages})`);
      validationError.retryable = false;
      throw validationError;
    }
    const cached = await env2.DB.prepare(`
      SELECT extracted_data, status
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNum).first();
    if (cached) {
      console.log(`[Hardware Page] Returning cached extraction for page ${pageNum}`);
      const latency = Date.now() - startTime;
      await metrics.recordLatency("page_extraction_cached", latency, true);
      return jsonResponse3({
        success: true,
        sessionId,
        pageNumber: pageNum,
        status: cached.status,
        data: JSON.parse(cached.extracted_data),
        cached: true
      });
    }
    console.log(`[Hardware Page] Retrieving PDF from KV: ${session.file_buffer_key}`);
    let fileBuffer = await env2.CACHE.get(session.file_buffer_key, { type: "arrayBuffer" });
    if (!fileBuffer && env2.UPLOADS) {
      console.log(`[Hardware Page] KV expired, trying R2 fallback: ${session.file_buffer_key}`);
      const r2Object = await env2.UPLOADS.get(session.file_buffer_key);
      if (r2Object) {
        fileBuffer = await r2Object.arrayBuffer();
        console.log(`[Hardware Page] PDF retrieved from R2 (${fileBuffer.byteLength} bytes)`);
        await env2.CACHE.put(session.file_buffer_key, fileBuffer, {
          expirationTtl: 86400 * 7
          // 7 days
        });
        console.log(`[Hardware Page] PDF re-cached in KV`);
      }
    }
    if (!fileBuffer) {
      console.error(`[Hardware Page] PDF not found in KV or R2: ${session.file_buffer_key}`);
      const notFoundError = new Error("PDF file not found. Please re-upload the document.");
      notFoundError.retryable = false;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    console.log(`[Hardware Page] PDF retrieved successfully (${fileBuffer.byteLength} bytes)`);
    console.log(`[Hardware Page] Starting Claude Vision extraction for page ${pageNum}`);
    const extractionStartTime = Date.now();
    const extractionResult = await extractSinglePage(fileBuffer, pageNum, env2);
    const extractionLatency = Date.now() - extractionStartTime;
    await metrics.recordLatency("claude_extraction", extractionLatency, true);
    console.log(`[Hardware Page] Claude Vision extraction completed in ${extractionLatency}ms`);
    await savePageExtraction2(sessionId, pageNum, extractionResult, env2);
    console.log(`[Hardware Page] Extracted page ${pageNum}: ${extractionResult.hardware_groups.length} sets found`);
    const totalLatency = Date.now() - startTime;
    await metrics.recordLatency("page_extraction_full", totalLatency, true);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      status: "pending_review",
      data: extractionResult,
      cached: false,
      performance: {
        total_ms: totalLatency,
        extraction_ms: extractionLatency
      }
    });
  } catch (error5) {
    const latency = Date.now() - startTime;
    console.error(`[Hardware Page] Error after ${latency}ms:`, error5);
    const classification = classifyError(error5);
    await metrics.recordError(classification.code, {
      sessionId: request2.params.sessionId,
      pageNumber: request2.params.pageNum,
      userId: user.userId,
      latency
    });
    return jsonErrorResponse(error5, {
      sessionId: request2.params.sessionId,
      pageNumber: request2.params.pageNum,
      userId: user.userId
    });
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/approve", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    const data = await request2.json();
    console.log(`[Hardware Approve Page] Approving page ${pageNum} for session ${sessionId}`);
    console.log(`[Hardware Approve Page] Received ${data.hardwareGroups?.length || 0} groups from frontend`);
    const corrections = data.hardwareGroups ? { hardware_groups: data.hardwareGroups } : data.corrections || null;
    const result = await approvePageExtraction(
      sessionId,
      pageNum,
      corrections,
      user.userId,
      env2
    );
    const status = await getSessionStatus(sessionId, env2);
    if (status.pages_approved === status.total_pages) {
      await env2.DB.prepare(`
        UPDATE hardware_extraction_sessions
        SET status = ?, completed_at = ?
        WHERE id = ?
      `).bind("completed", (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
      status.status = "completed";
    }
    console.log(`[Hardware Approve Page] Page ${pageNum} approved: ${result.sets_inserted} sets, ${result.components_inserted} components`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      result,
      session_status: {
        pages_approved: status.pages_approved,
        total_pages: status.total_pages,
        progress_percent: status.progress_percent,
        completed: status.status === "completed"
      },
      next_step: status.status === "completed" ? "All pages complete! Hardware schedule imported." : `Review page ${pageNum + 1}`
    });
  } catch (error5) {
    console.error("[Hardware Approve Page] Error:", error5);
    return jsonResponse3({
      error: "Failed to approve page",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-image", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    const data = await request2.json();
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Hardware Extract Image] Session: ${sessionId}, Page: ${pageNum}`);
    console.log(`[Hardware Extract Image] Image size: ${(data.imageBase64?.length / 1024).toFixed(1)}KB base64`);
    console.log(`[Hardware Extract Image] Dimensions: ${data.width}x${data.height}`);
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    if (!data.imageBase64) {
      return jsonResponse3({ error: "Missing imageBase64 in request body" }, 400);
    }
    if (!data.totalPages || data.totalPages < 1) {
      return jsonResponse3({ error: "Missing or invalid totalPages in request body" }, 400);
    }
    if (isNaN(pageNum) || pageNum < 1) {
      return jsonResponse3({ error: "Invalid page number" }, 400);
    }
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);
    }
    if (session.extraction_page_range) {
      try {
        const rangeData = typeof session.extraction_page_range === "string" ? JSON.parse(session.extraction_page_range) : session.extraction_page_range;
        if (rangeData && !isPageInRange(pageNum, rangeData)) {
          console.log(`[27A Page Range] Skipping page ${pageNum} (outside extraction ranges)`);
          return jsonResponse3({
            status: "skipped",
            message: `Page ${pageNum} outside extraction range`,
            page_number: pageNum,
            extraction_page_range: rangeData
          });
        }
      } catch (rangeErr) {
        console.warn(`[27A Page Range] Could not parse range: ${rangeErr.message}`);
      }
    }
    let _route = env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local";
    try {
      const _rr = await env2.DB.prepare(
        `SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (_rr?.extraction_route)
        _route = _rr.extraction_route;
    } catch (e) {
    }
    if (_route === "claude_code_local") {
      const _schedType = session.document_type === "door_schedule" ? "door_schedule" : null;
      const q = await queuePageExtractionJob(data.imageBase64, env2, {
        pageNumber: pageNum,
        totalPages: data.totalPages,
        sessionId,
        tenantId: data.tenantId || session.tenant_id || null,
        ownerMhsId: user.mhsId || user.mhs_id || null,
        scheduleType: _schedType
      });
      const kuId = crypto.randomUUID();
      try {
        await env2.DB.prepare(`
          INSERT OR REPLACE INTO kdp_packets
            (id, connection_id, project_id, candidate_id, page_number, sequence, unit_type, job_id, route, owner_id, state, attempts, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude_code_local', ?, 'in_flight', 1, datetime('now'), datetime('now'))
        `).bind(
          kuId,
          sessionId,
          session.project_id || null,
          `page:${sessionId}:${pageNum}`,
          pageNum,
          pageNum,
          _schedType === "door_schedule" ? "door_mark" : "hardware_set",
          q.job_id,
          q.owner_id
        ).run();
      } catch (e) {
      }
      return jsonResponse3({
        success: true,
        async: true,
        ku_id: kuId,
        job_id: q.job_id,
        page_number: pageNum,
        provider: "claude_code_local",
        poll_url: `/api/jobs/${q.job_id}`,
        finalize_url: `/api/hardware-schedule/session/${sessionId}/page/${pageNum}/finalize-image/${q.job_id}`,
        message: "Extraction queued to your bridge. Poll job, then finalize to persist."
      });
    }
    const extractionOptions = {
      tenantId: data.tenantId || null,
      sessionId,
      // WO-2026-0616: SABP bridge jobs must route to the owner's bridge token,
      // which is minted from the authenticated identity (user.mhsId). Thread it
      // so the adapter never re-derives from a stale node row.
      ownerMhsId: user.mhsId || user.mhs_id || null
    };
    console.log(`[Hardware Extract Image] Calling extractFromPageImage...`);
    if (extractionOptions.tenantId) {
      console.log(`[Hardware Extract Image] CONSTRAINT MODE: tenantId=${extractionOptions.tenantId}`);
    }
    const extractionResult = await extractFromPageImage(
      data.imageBase64,
      pageNum,
      data.totalPages,
      env2,
      extractionOptions
    );
    console.log(`[Hardware Extract Image] Saving extraction to database...`);
    await savePageExtraction2(sessionId, pageNum, extractionResult, env2);
    const totalTime = Date.now() - startTime;
    const matrixCount = extractionResult.door_hardware_matrix?.length || 0;
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Hardware Extract Image] EXTRACTION COMPLETE`);
    console.log(`[Hardware Extract Image] Groups: ${extractionResult.hardware_groups.length}`);
    console.log(`[Hardware Extract Image] Door-Matrix Entries: ${matrixCount}`);
    console.log(`[Hardware Extract Image] Total time: ${totalTime}ms`);
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      hardware_groups: extractionResult.hardware_groups,
      metadata: {
        ...extractionResult.metadata,
        extraction_method: "frontend_canvas_capture",
        page_isolated: true
      },
      timing: {
        extraction_time_ms: extractionResult.extraction_time_ms,
        total_time_ms: totalTime
      },
      usage: extractionResult.usage,
      next_step: `Review and approve: POST /api/hardware-schedule/session/${sessionId}/page/${pageNum}/approve`
    });
  } catch (error5) {
    console.error("[Hardware Extract Image] Error:", error5);
    return jsonResponse3({
      error: "Failed to extract hardware data from image",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/page/:pageNum/extraction-contract", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum } = request2.params;
    const pageNumber = parseInt(pageNum, 10);
    const url = new URL(request2.url);
    const tenantId = url.searchParams.get("tenant_id") || null;
    const session = await env2.DB.prepare(
      "SELECT * FROM hardware_extraction_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session)
      return jsonResponse3({ error: "Session not found" }, 404);
    if (session.user_id !== user.userId)
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);
    const contract = await resolveExtractionContract(env2, {
      sessionId,
      pageNumber,
      totalPages: session.page_count || session.total_pages || 1,
      tenantId
    });
    const constraintsMeta = contract.constraints ? {
      spec_version: contract.constraints.spec_version,
      scope_chain: contract.constraints.scope_chain,
      field_count: contract.constraints.fields.length
    } : null;
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber,
      totalPages: contract.totalPages,
      document_type: session.document_type || "hardware_schedule",
      prompt: contract.prompt,
      constraints: constraintsMeta,
      provenance: contract.provenance,
      result_contract: {
        required: {
          hardware_groups: "array \u2014 as specified in the prompt JSON schema",
          door_hardware_matrix: "array \u2014 REQUIRED when door/MARK-to-set relationships are visible (bylines or matrix); [] otherwise"
        },
        optional: ["detected_nomenclature", "metadata"],
        submit_to: `POST /api/hardware-schedule/session/${sessionId}/page/${pageNumber}/extract-result`,
        recommended_dpi: 300
      }
    });
  } catch (err) {
    return jsonResponse3({ error: "Failed to build extraction contract", details: err.message }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-result", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum } = request2.params;
    const pageNumber = parseInt(pageNum, 10);
    const body = await request2.json();
    const { extraction, provider } = body;
    if (!extraction || typeof extraction !== "object") {
      return jsonResponse3({ error: "extraction object required" }, 400);
    }
    if (!Array.isArray(extraction.hardware_groups)) {
      return jsonResponse3({ error: "extraction.hardware_groups must be an array (see extraction-contract)" }, 400);
    }
    for (const g of extraction.hardware_groups) {
      if (!g || typeof g !== "object") {
        return jsonResponse3({ error: "each hardware_group must be an object" }, 400);
      }
      if (g.components !== void 0 && !Array.isArray(g.components)) {
        return jsonResponse3({ error: "hardware_group.components must be an array when present" }, 400);
      }
    }
    if (!provider || !provider.name) {
      return jsonResponse3({ error: "provider.name required (e.g. operator-local-claude-code) \u2014 engine attribution is part of the trust substrate" }, 400);
    }
    const session = await env2.DB.prepare(
      "SELECT * FROM hardware_extraction_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session)
      return jsonResponse3({ error: "Session not found" }, 404);
    if (session.user_id !== user.userId)
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);
    const totalPages = session.page_count || session.total_pages || 1;
    const extractionResult = {
      page_number: pageNumber,
      total_pages: totalPages,
      hardware_groups: extraction.hardware_groups,
      door_hardware_matrix: extraction.door_hardware_matrix || [],
      detected_nomenclature: extraction.detected_nomenclature || null,
      metadata: {
        ...extraction.metadata || {},
        extraction_provider: provider.name,
        extraction_model: provider.model || null,
        extraction_client: provider.client || null,
        submitted_by: user.email || user.userId,
        page_isolated: true,
        isolation_method: "operator_local_render"
      }
    };
    await savePageExtraction2(sessionId, pageNumber, extractionResult, env2);
    const componentCount = extraction.hardware_groups.reduce((s, g) => s + (g.components?.length || 0), 0);
    console.log(`[Vision Bridge] Stored operator-local extraction: session ${sessionId} p${pageNumber}, provider ${provider.name}, ${extraction.hardware_groups.length} groups / ${componentCount} components`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber,
      provider: provider.name,
      hardware_groups: extraction.hardware_groups.length,
      components: componentCount,
      matrix_entries: (extraction.door_hardware_matrix || []).length,
      next_step: `Review and approve: POST /api/hardware-schedule/session/${sessionId}/page/${pageNumber}/approve`
    });
  } catch (err) {
    console.error("[Vision Bridge] Error:", err);
    return jsonResponse3({ error: "Failed to store extraction result", details: err.message }, 500);
  }
});
}
