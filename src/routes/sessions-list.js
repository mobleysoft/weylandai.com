import { jsonResponse3 } from "../lib/json-response.js";

function calculateClaudeCost(inputTokens, outputTokens) {
  if (!inputTokens || !outputTokens)
    return null;
  const INPUT_PRICE_PER_MILLION = 3;
  const OUTPUT_PRICE_PER_MILLION = 15;
  const inputCost = inputTokens / 1e6 * INPUT_PRICE_PER_MILLION;
  const outputCost = outputTokens / 1e6 * OUTPUT_PRICE_PER_MILLION;
  const totalCost = inputCost + outputCost;
  return {
    inputCost: `$${inputCost.toFixed(4)}`,
    outputCost: `$${outputCost.toFixed(4)}`,
    totalCost: `$${totalCost.toFixed(4)}`,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  };
}


async function listSessions(request2, env2) {
  try {
    const url = new URL(request2.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    const userId = request2.user.userId;
    let query = `
      SELECT
        id, project_name, filename, status,
        total_pages, pages_processed, pages_approved,
        current_page, total_sets_extracted, total_components_extracted,
        detected_schedule_pages,
        created_at, updated_at, completed_at
      FROM hardware_extraction_sessions
      WHERE user_id = ?
    `;
    const bindings = [userId];
    if (status) {
      query += " AND status = ?";
      bindings.push(status);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const results = await env2.DB.prepare(query).bind(...bindings).all();
    let countQuery = "SELECT COUNT(*) as total FROM hardware_extraction_sessions WHERE user_id = ?";
    const countBindings = [userId];
    if (status) {
      countQuery += " AND status = ?";
      countBindings.push(status);
    }
    const countResult = await env2.DB.prepare(countQuery).bind(...countBindings).first();
    return jsonResponse3({
      sessions: results.results.map((s) => ({
        sessionId: s.id,
        projectName: s.project_name,
        filename: s.filename,
        status: s.status,
        totalPages: s.total_pages,
        pagesProcessed: s.pages_processed,
        pagesApproved: s.pages_approved,
        currentPage: s.current_page,
        hardwareSets: s.total_sets_extracted,
        totalComponents: s.total_components_extracted,
        detectedSchedulePages: s.detected_schedule_pages ? JSON.parse(s.detected_schedule_pages) : null,
        progress: s.total_pages > 0 ? Math.round(s.pages_processed / s.total_pages * 100) : 0,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        completedAt: s.completed_at
      })),
      total: countResult.total,
      limit,
      offset,
      hasMore: offset + limit < countResult.total
    }, 200);
  } catch (error4) {
    console.error("[Retrieval] List sessions error:", error4);
    return jsonResponse3({
      error: "Failed to list sessions",
      details: error4.message
    }, 500);
  }
}


async function getSessionWithPages(request2, env2) {
  try {
    const { sessionId } = request2.params;
    const userId = request2.user.userId;
    const session = await env2.DB.prepare(`
      SELECT
        id, user_id, project_name, filename, file_buffer_key,
        total_pages, pages_processed, pages_approved,
        status, current_page, total_sets_extracted, total_components_extracted,
        source_type, document_type, project_id,
        document_outline, detected_schedule_pages, extraction_page_range, schedule_table_pages,
        created_at, updated_at, completed_at
      FROM hardware_extraction_sessions
      WHERE id = ? AND user_id = ?
    `).bind(sessionId, userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    let validCurrentPage = session.current_page || 1;
    if (validCurrentPage > session.total_pages) {
      validCurrentPage = session.total_pages;
      console.log(`[Retrieval] Corrected current_page from ${session.current_page} to ${validCurrentPage} (max: ${session.total_pages})`);
    }
    if (validCurrentPage < 1) {
      validCurrentPage = 1;
    }
    const pages = await env2.DB.prepare(`
      SELECT
        id, page_number, status, reviewed_at, reviewed_by,
        input_tokens, output_tokens, extraction_time_ms,
        overall_confidence, auto_approved, extracted_data, affirm_state,
        previous_extracted_data, previous_affirm_state, extraction_count, re_extracted_at,
        LENGTH(extracted_data) as data_size,
        created_at, updated_at
      FROM hardware_page_extractions
      WHERE session_id = ?
      ORDER BY page_number ASC
    `).bind(sessionId).all();
    const pagesWithDetails = pages.results.map((page) => {
      let setsCount = 0;
      let componentsCount = 0;
      if (page.extracted_data) {
        try {
          const data = JSON.parse(page.extracted_data);
          setsCount = data.hardware_sets?.length || data.hardware_groups?.length || 0;
          const sets = data.hardware_sets || data.hardware_groups || [];
          componentsCount = sets.reduce((sum2, set) => sum2 + (set.components?.length || 0), 0) || 0;
        } catch (e) {
          console.error(`Failed to parse extraction data for page ${page.page_number}:`, e);
        }
      }
      return {
        extractionId: page.id,
        page_number: page.page_number,
        pageNumber: page.page_number,
        status: page.status,
        reviewedAt: page.reviewed_at,
        reviewedBy: page.reviewed_by,
        hardwareSets: setsCount,
        components: componentsCount,
        overallConfidence: page.overall_confidence,
        autoApproved: Boolean(page.auto_approved),
        dataSize: page.data_size,
        extracted_data: page.extracted_data,
        // Include raw JSON for session restore
        affirm_state: page.affirm_state,
        // Include affirm state for persistence restore
        previous_extracted_data: page.previous_extracted_data || null,
        // 26L: dual extraction support
        previous_affirm_state: page.previous_affirm_state || null,
        extraction_count: page.extraction_count || 1,
        re_extracted_at: page.re_extracted_at || null,
        performance: {
          inputTokens: page.input_tokens,
          outputTokens: page.output_tokens,
          extractionTimeMs: page.extraction_time_ms
        },
        createdAt: page.created_at,
        updatedAt: page.updated_at
      };
    });
    let pdfUrl = null;
    if (session.file_buffer_key) {
      try {
        pdfUrl = `/api/sessions/${sessionId}/pdf`;
      } catch (error4) {
        console.error("[Retrieval] Failed to generate PDF URL:", error4);
      }
    }
    return jsonResponse3({
      success: true,
      session: {
        id: session.id,
        sessionId: session.id,
        project_name: session.project_name,
        projectName: session.project_name,
        project_id: session.project_id,
        // FX-2026-0629-WEYLAND-FE-003: expose the linked project so loadSession can re-bind it on every load (the SELECT already fetched it; it was simply dropped from the response)
        filename: session.filename,
        status: session.status,
        total_pages: session.total_pages,
        totalPages: session.total_pages,
        pagesProcessed: session.pages_processed,
        pagesApproved: session.pages_approved,
        current_page: validCurrentPage,
        currentPage: validCurrentPage,
        progress: session.total_pages > 0 ? Math.round(session.pages_processed / session.total_pages * 100) : 0,
        hardwareSetsTotal: session.total_sets_extracted,
        totalComponents: session.total_components_extracted,
        source_type: session.source_type,
        // 'pdf' or 'image' — file format routing
        document_type: session.document_type,
        // 'door_schedule' or 'hardware_schedule' — UI routing
        document_outline: session.document_outline ? JSON.parse(session.document_outline) : null,
        detected_schedule_pages: session.detected_schedule_pages ? JSON.parse(session.detected_schedule_pages) : null,
        extraction_page_range: session.extraction_page_range ? JSON.parse(session.extraction_page_range) : null,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        completedAt: session.completed_at,
        pdfUrl
      },
      extractedPages: pagesWithDetails,
      extractions: pagesWithDetails,
      // Alias for frontend compatibility
      summary: {
        totalPages: session.total_pages,
        pagesExtracted: pages.results.length,
        pagesApproved: pages.results.filter((p) => p.status === "approved").length,
        pagesPending: pages.results.filter((p) => p.status === "pending_review").length,
        totalHardwareSets: pagesWithDetails.reduce((sum2, p) => sum2 + p.hardwareSets, 0),
        totalComponents: pagesWithDetails.reduce((sum2, p) => sum2 + p.components, 0)
      }
    }, 200);
  } catch (error4) {
    console.error("[Retrieval] Get session error:", error4);
    return jsonResponse3({
      error: "Failed to retrieve session",
      details: error4.message
    }, 500);
  }
}


async function getExtractedPage(request2, env2) {
  try {
    const { sessionId, pageNumber } = request2.params;
    const userId = request2.user.userId;
    const pageNum = parseInt(pageNumber, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return jsonResponse3({ error: "Invalid page number" }, 400);
    }
    const session = await env2.DB.prepare(`
      SELECT id, user_id, total_pages
      FROM hardware_extraction_sessions
      WHERE id = ? AND user_id = ?
    `).bind(sessionId, userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (pageNum > session.total_pages) {
      return jsonResponse3({
        error: `Page ${pageNum} exceeds total pages (${session.total_pages})`
      }, 400);
    }
    const extraction = await env2.DB.prepare(`
      SELECT
        id, page_number, extracted_data, corrections,
        field_confidence, overall_confidence,
        status, reviewed_at, reviewed_by,
        auto_approved, input_tokens, output_tokens, extraction_time_ms,
        created_at, updated_at
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNum).first();
    if (!extraction) {
      return jsonResponse3({
        error: `Page ${pageNum} has not been extracted yet`,
        suggestion: `POST /api/sessions/${sessionId}/extract/${pageNum} to extract this page`
      }, 404);
    }
    let extractedData = null;
    let fieldConfidence = null;
    let corrections = null;
    try {
      extractedData = extraction.extracted_data ? JSON.parse(extraction.extracted_data) : null;
      fieldConfidence = extraction.field_confidence ? JSON.parse(extraction.field_confidence) : null;
      corrections = extraction.corrections ? JSON.parse(extraction.corrections) : null;
    } catch (error4) {
      console.error("[Retrieval] Failed to parse extraction JSON:", error4);
      return jsonResponse3({
        error: "Extraction data is corrupted",
        details: error4.message
      }, 500);
    }
    return jsonResponse3({
      extractionId: extraction.id,
      pageNumber: extraction.page_number,
      status: extraction.status,
      extractedData,
      fieldConfidence,
      overallConfidence: extraction.overall_confidence,
      corrections,
      autoApproved: Boolean(extraction.auto_approved),
      reviewedAt: extraction.reviewed_at,
      reviewedBy: extraction.reviewed_by,
      performance: {
        inputTokens: extraction.input_tokens,
        outputTokens: extraction.output_tokens,
        extractionTimeMs: extraction.extraction_time_ms,
        costEstimate: calculateClaudeCost(extraction.input_tokens, extraction.output_tokens)
      },
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at
    }, 200);
  } catch (error4) {
    console.error("[Retrieval] Get extracted page error:", error4);
    return jsonResponse3({
      error: "Failed to retrieve extracted page",
      details: error4.message
    }, 500);
  }
}


async function getSessionPdf(request2, env2) {
  try {
    const { sessionId } = request2.params;
    const userId = request2.user.userId;
    const session = await env2.DB.prepare(`
      SELECT file_buffer_key, filename, user_id
      FROM hardware_extraction_sessions
      WHERE id = ? AND user_id = ?
    `).bind(sessionId, userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (!session.file_buffer_key) {
      return jsonResponse3({ error: "PDF file not available" }, 404);
    }
    let pdfObject = await env2.UPLOADS.get(session.file_buffer_key);
    if (!pdfObject && session.filename) {
      const userId2 = request2.user.userId;
      const legacyKey = `hardware-sessions/${userId2}/${session.filename}`;
      console.log(`[Retrieval] UUID key not found, trying legacy key: ${legacyKey}`);
      pdfObject = await env2.UPLOADS.get(legacyKey);
    }
    if (!pdfObject) {
      return jsonResponse3({
        error: "PDF file not found in storage. The file may have expired (KV has 7-day TTL) and was not properly stored in R2.",
        r2Key: session.file_buffer_key,
        suggestion: "Re-upload the PDF to create a new session"
      }, 404);
    }
    const pdfBuffer = await pdfObject.arrayBuffer();
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${session.filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
        // Cache for 1 hour
        "X-Session-Id": sessionId
      }
    });
  } catch (error4) {
    console.error("[Retrieval] Get PDF error:", error4);
    return jsonResponse3({
      error: "Failed to retrieve PDF",
      details: error4.message
    }, 500);
  }
}


/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerSessionsListRoutes(router, { authenticate }) {
  router.get("/api/sessions", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    request2.user = user;
    return listSessions(request2, env2);
  });
  router.get("/api/sessions/:sessionId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    request2.user = user;
    return getSessionWithPages(request2, env2);
  });
  router.get("/api/sessions/:sessionId/pages/:pageNumber", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    request2.user = user;
    return getExtractedPage(request2, env2);
  });
  router.get("/api/sessions/:sessionId/pdf", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    request2.user = user;
    return getSessionPdf(request2, env2);
  });
}
