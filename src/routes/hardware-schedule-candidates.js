// src/routes/hardware-schedule-candidates.js
//
// Region-candidate review workflow for door/hardware/finish-schedule
// extraction: list/create/update/delete drawn regions, validate for
// conflicts (overlaps, near-duplicates, dangling cross-references, via
// lib/region-conflicts.js), preview a candidate or a whole page with
// its bounding-box overlays drawn in, and affirm/reject/undo individual
// candidates. Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 149172-149872 minus the two functions below/imported).
//
// getSessionStatus and getOrRenderPage are real shared helpers used
// across the WHOLE hardware-schedule cluster (getSessionStatus alone
// has 14+ call sites spanning routes not yet extracted) - injected as
// deps rather than extracted themselves, since extracting them properly
// would mean touching the entire ~6,400-line cluster in one pass. They
// stay defined in legacy-monolith.js until a future extraction reaches
// them.
//
// drawBoundingBoxOverlay (below) has exactly one call site, entirely
// within this file's own routes, so it stays local/private here rather
// than going into a lib/ module.

import { jsonResponse3 } from "../lib/json-response.js";
import { detectAndPersistRegionConflicts } from "../lib/region-conflicts.js";

async function drawBoundingBoxOverlay(imageBuffer, boundingBox, scheduleType) {
  const blob = new Blob([imageBuffer], { type: "image/png" });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  const scale2 = 600 / 72;
  const x = boundingBox.x * scale2;
  const y = boundingBox.y * scale2;
  const width = boundingBox.width * scale2;
  const height = boundingBox.height * scale2;
  const colors = {
    "door_schedule": "#3B82F6",
    // Blue
    "hardware_schedule": "#10B981",
    // Green
    "finish_schedule": "#F59E0B",
    // Amber
    "ada_compliance": "#8B5CF6",
    // Purple
    "municipal_requirements": "#EF4444",
    // Red
    "user_identified": "#6366F1",
    // Indigo
    "unknown_schedule": "#6B7280"
    // Gray
  };
  const color = colors[scheduleType] || "#6B7280";
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([15, 10]);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = color + "1A";
  ctx.fillRect(x, y, width, height);
  const resultBlob = await canvas.convertToBlob({ type: "image/png" });
  return await resultBlob.arrayBuffer();
}

export function registerHardwareScheduleCandidatesRoutes(router, { authenticate, getSessionStatus, getOrRenderPage }) {
router.get("/api/hardware-schedule/session/:sessionId/candidates", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const url = new URL(request2.url);
    const statusFilter = url.searchParams.get("status");
    const pageFilter = url.searchParams.get("page_number");
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    let query = "SELECT * FROM schedule_region_candidates WHERE session_id = ?";
    const params = [sessionId];
    if (statusFilter) {
      query += " AND status = ?";
      params.push(statusFilter);
    }
    if (pageFilter) {
      query += " AND page_number = ?";
      params.push(parseInt(pageFilter, 10));
    }
    query += " ORDER BY page_number, created_at";
    const { results } = await env2.DB.prepare(query).bind(...params).all();
    const summary = {
      total: results.length,
      pending: results.filter((c) => c.status === "pending").length,
      affirmed: results.filter((c) => c.status === "affirmed").length,
      rejected: results.filter((c) => c.status === "rejected").length,
      extracted: results.filter((c) => c.status === "extracted").length,
      by_type: {},
      by_page: {}
    };
    results.forEach((c) => {
      summary.by_type[c.schedule_type] = (summary.by_type[c.schedule_type] || 0) + 1;
      summary.by_page[c.page_number] = (summary.by_page[c.page_number] || 0) + 1;
    });
    const candidates = results.map((c) => ({
      id: c.id,
      page_number: c.page_number,
      schedule_type: c.schedule_type,
      detection_confidence: c.detection_confidence,
      detection_method: c.detection_method,
      detected_headers: JSON.parse(c.detection_hints_found || "[]"),
      row_count_estimate: c.row_count_estimate,
      bounding_box: JSON.parse(c.bounding_box || "{}"),
      bounding_box_percent: JSON.parse(c.bounding_box_percent || "{}"),
      status: c.status,
      preview_url: `/api/hardware-schedule/session/${sessionId}/candidates/${c.id}/preview`,
      created_at: c.created_at,
      affirmed_by: c.affirmed_by,
      affirmed_at: c.affirmed_at,
      rejection_reason: c.rejection_reason,
      user_adjusted_bounding_box: c.user_adjusted_bounding_box ? JSON.parse(c.user_adjusted_bounding_box) : null,
      extraction_entry_count: c.extraction_entry_count,
      detection_notes: c.detection_notes
    }));
    return jsonResponse3({
      success: true,
      session_id: sessionId,
      detection_method: session.detection_method || "vision-primary",
      candidates,
      summary,
      allows_user_regions: true
    });
  } catch (err) {
    console.error("[Hardware Candidates] Error:", err);
    return jsonResponse3({
      error: "Failed to get candidates",
      details: err.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/candidates", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId } = request2.params;
    const body = await request2.json();
    const userId = user?.email || user?.id || "anonymous";
    if (!body.page_number || typeof body.page_number !== "number") {
      return jsonResponse3({ error: "page_number is required and must be a number" }, 400);
    }
    if (!body.schedule_type) {
      return jsonResponse3({ error: "schedule_type is required" }, 400);
    }
    if (!body.bounding_box || typeof body.bounding_box !== "object") {
      return jsonResponse3({ error: "bounding_box is required and must be an object with x, y, width, height" }, 400);
    }
    const { x, y, width, height } = body.bounding_box;
    if (x === void 0 || y === void 0 || width === void 0 || height === void 0) {
      return jsonResponse3({ error: "bounding_box must have x, y, width, and height properties" }, 400);
    }
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (body.page_number < 1 || body.page_number > (session.page_count || session.totalPages || 999)) {
      return jsonResponse3({ error: "page_number is out of range" }, 400);
    }
    const candidateId = `src_${crypto.randomUUID()}`;
    const detectionMethod = body.detection_method || "user_identified";
    const boundingBoxJson = JSON.stringify(body.bounding_box);
    const parseOrder = typeof body.parse_order === "number" ? body.parse_order : null;
    const userNotes = body.user_notes ? String(body.user_notes).slice(0, 2e3) : null;
    const crossRef = body.cross_ref ? typeof body.cross_ref === "string" ? body.cross_ref : JSON.stringify(body.cross_ref) : null;
    const boundingBoxPercentJson = body.bounding_box_percent ? JSON.stringify(body.bounding_box_percent) : null;
    await env2.DB.prepare(`
      INSERT INTO schedule_region_candidates (
        id, session_id, page_number, schedule_type, detection_confidence,
        bounding_box, bounding_box_percent, detection_method, status,
        parse_order, user_notes, cross_ref, review_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'ok', datetime('now'), datetime('now'))
    `).bind(
      candidateId,
      sessionId,
      body.page_number,
      body.schedule_type,
      1,
      // User-identified regions have 100% confidence (they explicitly drew it)
      boundingBoxJson,
      boundingBoxPercentJson,
      detectionMethod,
      parseOrder,
      userNotes,
      crossRef
    ).run();
    console.log(`[Create Candidate] User ${userId} created candidate ${candidateId} on page ${body.page_number} (${body.schedule_type})${parseOrder != null ? " order=" + parseOrder : ""}${crossRef ? " xref" : ""}`);
    return jsonResponse3({
      success: true,
      candidate: {
        id: candidateId,
        session_id: sessionId,
        page_number: body.page_number,
        schedule_type: body.schedule_type,
        detection_confidence: 1,
        bounding_box: body.bounding_box,
        bounding_box_percent: body.bounding_box_percent || null,
        detection_method: detectionMethod,
        status: "pending",
        parse_order: parseOrder,
        user_notes: userNotes,
        cross_ref: (() => {
          try {
            return crossRef ? JSON.parse(crossRef) : null;
          } catch (e) {
            return crossRef;
          }
        })(),
        review_status: "ok",
        preview_url: `/api/hardware-schedule/session/${sessionId}/candidates/${candidateId}/preview`,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      message: "Region saved successfully. Affirm to proceed with extraction."
    }, 201);
  } catch (err) {
    console.error("[Create Candidate] Error:", err);
    return jsonResponse3({
      error: "Failed to create candidate",
      details: err.message
    }, 500);
  }
});
router.patch("/api/hardware-schedule/session/:sessionId/candidates/:candidateId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, candidateId } = request2.params;
    const body = await request2.json().catch(() => ({}));
    const candidate = await env2.DB.prepare(
      "SELECT * FROM schedule_region_candidates WHERE id = ? AND session_id = ?"
    ).bind(candidateId, sessionId).first();
    if (!candidate)
      return jsonResponse3({ error: "Candidate not found" }, 404);
    if (candidate.status === "extracted" || candidate.status === "extracting") {
      return jsonResponse3({ error: `Cannot modify ${candidate.status} candidate` }, 400);
    }
    const sets = [];
    const binds = [];
    if (typeof body.parse_order === "number") {
      sets.push("parse_order = ?");
      binds.push(body.parse_order);
    }
    if (body.user_notes !== void 0) {
      sets.push("user_notes = ?");
      binds.push(body.user_notes ? String(body.user_notes).slice(0, 2e3) : null);
    }
    if (body.cross_ref !== void 0) {
      const cr = body.cross_ref == null ? null : typeof body.cross_ref === "string" ? body.cross_ref : JSON.stringify(body.cross_ref);
      sets.push("cross_ref = ?");
      binds.push(cr);
    }
    if (body.schedule_type) {
      sets.push("schedule_type = ?");
      binds.push(body.schedule_type);
    }
    if (body.bounding_box) {
      sets.push("bounding_box = ?");
      binds.push(JSON.stringify(body.bounding_box));
    }
    if (body.bounding_box_percent) {
      sets.push("bounding_box_percent = ?");
      binds.push(JSON.stringify(body.bounding_box_percent));
    }
    if (body.user_adjusted_bounding_box) {
      sets.push("user_adjusted_bounding_box = ?");
      binds.push(JSON.stringify(body.user_adjusted_bounding_box));
    }
    if (sets.length === 0)
      return jsonResponse3({ error: "No updatable fields provided" }, 400);
    sets.push("updated_at = datetime('now')");
    binds.push(candidateId);
    await env2.DB.prepare(
      `UPDATE schedule_region_candidates SET ${sets.join(", ")} WHERE id = ?`
    ).bind(...binds).run();
    const review = await detectAndPersistRegionConflicts(sessionId, env2);
    const updated = await env2.DB.prepare("SELECT * FROM schedule_region_candidates WHERE id = ?").bind(candidateId).first();
    return jsonResponse3({ success: true, candidate: updated, review });
  } catch (err) {
    console.error("[Patch Candidate] Error:", err);
    return jsonResponse3({ error: "Failed to update candidate", details: err.message }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/candidates/validate", async (request2, env2) => {
  const { error: error4 } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId } = request2.params;
    const review = await detectAndPersistRegionConflicts(sessionId, env2);
    return jsonResponse3({ success: true, ...review, has_conflicts: review.conflict_count > 0 });
  } catch (err) {
    console.error("[Validate Candidates] Error:", err);
    return jsonResponse3({ error: "Failed to validate candidates", details: err.message }, 500);
  }
});
router.delete("/api/hardware-schedule/session/:sessionId/candidates", async (request2, env2) => {
  const { error: error4 } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId } = request2.params;
    const url = new URL(request2.url);
    const method = url.searchParams.get("detection_method");
    let sql = `DELETE FROM schedule_region_candidates WHERE session_id = ? AND status != 'extracted'`;
    const binds = [sessionId];
    if (method) {
      sql += ` AND detection_method = ?`;
      binds.push(method);
    }
    const res = await env2.DB.prepare(sql).bind(...binds).run();
    const deleted = res && res.meta && typeof res.meta.changes === "number" ? res.meta.changes : null;
    return jsonResponse3({ success: true, deleted });
  } catch (err) {
    console.error("[Delete Candidates] Error:", err);
    return jsonResponse3({ error: "Failed to delete candidates", details: err.message }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/candidates/:candidateId/preview", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, candidateId } = request2.params;
    const url = new URL(request2.url);
    const withOverlay = url.searchParams.get("with_overlay") !== "false";
    const format = url.searchParams.get("format") || "png";
    console.log(`[Preview] Candidate ${candidateId} for session ${sessionId}, overlay=${withOverlay}, format=${format}`);
    const candidate = await env2.DB.prepare(
      "SELECT * FROM schedule_region_candidates WHERE id = ? AND session_id = ?"
    ).bind(candidateId, sessionId).first();
    if (!candidate) {
      return jsonResponse3({ error: "Candidate not found" }, 404);
    }
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    const pdfKey = session.file_buffer_key;
    if (!pdfKey) {
      return jsonResponse3({ error: "Session has no associated PDF file" }, 404);
    }
    let pdfBuffer = null;
    if (env2.UPLOADS) {
      const r2Object = await env2.UPLOADS.get(pdfKey);
      if (r2Object) {
        pdfBuffer = await r2Object.arrayBuffer();
        console.log(`[Preview] PDF retrieved from R2 UPLOADS (${pdfBuffer.byteLength} bytes)`);
      }
    }
    if (!pdfBuffer && env2.CACHE) {
      pdfBuffer = await env2.CACHE.get(pdfKey, { type: "arrayBuffer" });
      if (pdfBuffer) {
        console.log(`[Preview] PDF retrieved from KV CACHE (${pdfBuffer.byteLength} bytes)`);
      }
    }
    if (!pdfBuffer) {
      return jsonResponse3({ error: "PDF file not found. Please re-upload the document." }, 404);
    }
    const rendered = await getOrRenderPage(sessionId, candidate.page_number, pdfBuffer, env2);
    let imageBuffer = rendered.imageBuffer;
    if (withOverlay && candidate.bounding_box) {
      const boundingBox = JSON.parse(candidate.bounding_box);
      imageBuffer = await drawBoundingBoxOverlay(
        imageBuffer,
        boundingBox,
        candidate.schedule_type
      );
    }
    const contentType = format === "jpeg" ? "image/jpeg" : "image/png";
    console.log(`[Preview] Serving ${contentType} image (${imageBuffer.byteLength} bytes), page ${candidate.page_number}`);
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "X-Page-Number": String(candidate.page_number),
        "X-Image-Width": String(rendered.width || 5100),
        "X-Image-Height": String(rendered.height || 6600),
        "X-DPI": "600",
        "X-Bounding-Box": candidate.bounding_box || "{}",
        "X-Schedule-Type": candidate.schedule_type || "unknown",
        "X-Detection-Confidence": String(candidate.detection_confidence || 0),
        "X-Cache-Hit": String(rendered.cacheHit || false),
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (err) {
    console.error("[Preview] Error:", err);
    return jsonResponse3({
      error: "Failed to generate preview",
      details: err.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/page/:pageNumber/preview", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNumber } = request2.params;
    const pageNum = parseInt(pageNumber, 10);
    const url = new URL(request2.url);
    const format = url.searchParams.get("format") || "png";
    console.log(`[Preview] Page ${pageNum} for session ${sessionId}, format=${format}`);
    if (!pageNum || pageNum < 1) {
      return jsonResponse3({ error: "Invalid page number" }, 400);
    }
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (pageNum > session.total_pages) {
      return jsonResponse3({ error: `Page ${pageNum} exceeds total pages (${session.total_pages})` }, 400);
    }
    const pdfKey = session.file_buffer_key;
    if (!pdfKey) {
      return jsonResponse3({ error: "Session has no associated PDF file" }, 404);
    }
    let pdfBuffer = null;
    if (env2.UPLOADS) {
      const r2Object = await env2.UPLOADS.get(pdfKey);
      if (r2Object) {
        pdfBuffer = await r2Object.arrayBuffer();
        console.log(`[Preview] PDF retrieved from R2 UPLOADS (${pdfBuffer.byteLength} bytes)`);
      }
    }
    if (!pdfBuffer && env2.CACHE) {
      pdfBuffer = await env2.CACHE.get(pdfKey, { type: "arrayBuffer" });
      if (pdfBuffer) {
        console.log(`[Preview] PDF retrieved from KV CACHE (${pdfBuffer.byteLength} bytes)`);
      }
    }
    if (!pdfBuffer) {
      return jsonResponse3({ error: "PDF file not found. Please re-upload the document." }, 404);
    }
    const rendered = await getOrRenderPage(sessionId, pageNum, pdfBuffer, env2);
    const contentType = format === "jpeg" ? "image/jpeg" : "image/png";
    console.log(`[Preview] Serving ${contentType} page image (${rendered.imageBuffer.byteLength} bytes), page ${pageNum}`);
    return new Response(rendered.imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "X-Page-Number": String(pageNum),
        "X-Image-Width": String(rendered.width || 5100),
        "X-Image-Height": String(rendered.height || 6600),
        "X-DPI": "600",
        "X-Total-Pages": String(session.total_pages),
        "X-Cache-Hit": String(rendered.cacheHit || false),
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (err) {
    console.error("[Preview] Page preview error:", err);
    return jsonResponse3({
      error: "Failed to generate page preview",
      details: err.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/candidates/:candidateId/affirm", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, candidateId } = request2.params;
    const body = await request2.json().catch(() => ({}));
    const userId = user?.email || user?.id || "anonymous";
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    const candidate = await env2.DB.prepare(
      "SELECT * FROM schedule_region_candidates WHERE id = ? AND session_id = ?"
    ).bind(candidateId, sessionId).first();
    if (!candidate) {
      return jsonResponse3({ error: "Candidate not found" }, 404);
    }
    if (candidate.status === "extracted") {
      return jsonResponse3({ error: "Cannot modify extracted candidate" }, 400);
    }
    if (candidate.status === "failed") {
      return jsonResponse3({ error: "Cannot modify failed candidate" }, 400);
    }
    const adjustedBox = body.adjusted_bounding_box ? JSON.stringify(body.adjusted_bounding_box) : null;
    const extractionDpi = body.dpi || 600;
    await env2.DB.prepare(`
      UPDATE schedule_region_candidates
      SET status = 'affirmed',
          affirmed_by = ?,
          affirmed_at = datetime('now'),
          user_adjusted_bounding_box = ?,
          extraction_dpi = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(userId, adjustedBox, extractionDpi, candidateId).run();
    console.log(`[Candidate Affirm] Candidate ${candidateId} affirmed by ${userId}`);
    let review = null;
    try {
      review = await detectAndPersistRegionConflicts(sessionId, env2);
    } catch (e) {
      console.warn("[Candidate Affirm] conflict scan failed:", e.message);
    }
    const effectiveBoundingBox = adjustedBox ? JSON.parse(adjustedBox) : JSON.parse(candidate.bounding_box || "{}");
    return jsonResponse3({
      success: true,
      candidate_id: candidateId,
      status: "affirmed",
      affirmed_at: (/* @__PURE__ */ new Date()).toISOString(),
      affirmed_by: userId,
      bounding_box: effectiveBoundingBox,
      was_adjusted: !!adjustedBox,
      review
    });
  } catch (err) {
    console.error("[Candidate Affirm] Error:", err);
    return jsonResponse3({
      error: "Failed to affirm candidate",
      details: err.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/candidates/:candidateId/reject", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, candidateId } = request2.params;
    const body = await request2.json().catch(() => ({}));
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    const candidate = await env2.DB.prepare(
      "SELECT * FROM schedule_region_candidates WHERE id = ? AND session_id = ?"
    ).bind(candidateId, sessionId).first();
    if (!candidate) {
      return jsonResponse3({ error: "Candidate not found" }, 404);
    }
    if (candidate.status === "extracted") {
      return jsonResponse3({ error: "Cannot modify extracted candidate" }, 400);
    }
    if (candidate.status === "failed") {
      return jsonResponse3({ error: "Cannot modify failed candidate" }, 400);
    }
    const validReasons = ["not_a_schedule", "wrong_type", "partial_content", "other"];
    const reason = body.reason && validReasons.includes(body.reason) ? body.reason : body.reason || null;
    await env2.DB.prepare(`
      UPDATE schedule_region_candidates
      SET status = 'rejected',
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason, candidateId).run();
    console.log(`[Candidate Reject] Candidate ${candidateId} rejected with reason: ${reason || "none"}`);
    return jsonResponse3({
      success: true,
      candidate_id: candidateId,
      status: "rejected",
      rejected_at: (/* @__PURE__ */ new Date()).toISOString(),
      reason
    });
  } catch (err) {
    console.error("[Candidate Reject] Error:", err);
    return jsonResponse3({
      error: "Failed to reject candidate",
      details: err.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/candidates/:candidateId/undo", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, candidateId } = request2.params;
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    const candidate = await env2.DB.prepare(
      "SELECT * FROM schedule_region_candidates WHERE id = ? AND session_id = ?"
    ).bind(candidateId, sessionId).first();
    if (!candidate) {
      return jsonResponse3({ error: "Candidate not found" }, 404);
    }
    const undoableStates = ["affirmed", "rejected"];
    if (!undoableStates.includes(candidate.status)) {
      return jsonResponse3({
        error: `Cannot undo candidate in '${candidate.status}' state. Only 'affirmed' or 'rejected' candidates can be undone.`
      }, 400);
    }
    await env2.DB.prepare(`
      UPDATE schedule_region_candidates
      SET status = 'pending',
          affirmed_by = NULL,
          affirmed_at = NULL,
          rejection_reason = NULL,
          user_adjusted_bounding_box = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(candidateId).run();
    console.log(`[Candidate Undo] Candidate ${candidateId} reset to pending from ${candidate.status}`);
    return jsonResponse3({
      success: true,
      candidate_id: candidateId,
      status: "pending",
      previous_status: candidate.status
    });
  } catch (err) {
    console.error("[Candidate Undo] Error:", err);
    return jsonResponse3({
      error: "Failed to undo candidate status",
      details: err.message
    }, 500);
  }
});
}
