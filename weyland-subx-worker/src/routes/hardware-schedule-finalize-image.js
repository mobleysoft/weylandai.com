// src/routes/hardware-schedule-finalize-image.js
//
// Finalizes an async page extraction job queued through the local
// Claude Code bridge (see hardware-schedule-generate.js's extract-affirmed
// and hardware-schedule-page-extract.js's extract-image, both of which
// queue jobs and return a finalize_url pointing here): polls the edge
// job status, then either persists a door-schedule response (door_mark
// candidates) or a regular hardware-groups extraction result, advancing
// the kdp_packets ledger and schedule_region_candidates status either
// way. Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// lines 145870-146047 - isolated from the rest of the hardware-schedule
// cluster by a ~1,756-line gap of unrelated Stripe/HuntX/econ-data code,
// per WORKER_MODULARIZATION_MAP.md's note on this route).
//
// Six shared cluster-wide helpers stay injected dependencies, continuing
// the pattern: callEdge, materializeDseToLineItems,
// transformDoorEntriesToHardwareSets, savePageExtraction2 (all already
// established from prior pieces), plus two new to this file -
// buildExtractionResultFromVision and persistDoorScheduleResponse - each
// with real call sites elsewhere (persistDoorScheduleResponse is also
// called from inside the still-inline detect-schedules flow;
// buildExtractionResultFromVision itself calls
// parseHardwareExtractionResult, an unscoped internal dependency not
// worth chasing down just to inline a single-call-site wrapper).

import { jsonResponse3 } from "../lib/json-response.js";

export function registerHardwareScheduleFinalizeImageRoutes(router, {
  authenticate,
  callEdge,
  materializeDseToLineItems,
  transformDoorEntriesToHardwareSets,
  savePageExtraction2,
  buildExtractionResultFromVision,
  persistDoorScheduleResponse,
}) {
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/finalize-image/:jobId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const { sessionId, pageNum, jobId } = request2.params;
  const pageNumber = parseInt(pageNum, 10);
  const sess = await env2.DB.prepare(
    `SELECT user_id, total_pages FROM hardware_extraction_sessions WHERE id = ?`
  ).bind(sessionId).first();
  if (!sess || sess.user_id !== user.userId)
    return jsonResponse3({ error: "session_not_found" }, 404);
  const packet = await env2.DB.prepare(
    `SELECT id, candidate_id, connection_id FROM kdp_packets WHERE job_id = ?`
  ).bind(jobId).first();
  if (packet && packet.connection_id !== sessionId) {
    return jsonResponse3({ error: "job_session_mismatch" }, 409);
  }
  const r = await callEdge("GET", `/ai/v1/jobs/${encodeURIComponent(jobId)}`, env2);
  if (r.status !== 200)
    return jsonResponse3({ error: "edge_fetch_failed", detail: r.body }, 502);
  if (r.body.status !== "completed")
    return jsonResponse3({ error: "job_not_completed", status: r.body.status }, 425);
  const totalPages = r.body.metadata?.total_pages || sess.total_pages || 1;
  let candSchedType = null;
  if (packet?.candidate_id) {
    try {
      const cRow = await env2.DB.prepare(
        `SELECT schedule_type FROM schedule_region_candidates WHERE id = ?`
      ).bind(packet.candidate_id).first();
      candSchedType = cRow?.schedule_type || null;
    } catch (e) {
      return jsonResponse3({ error: "schedule_type_lookup_failed", detail: e.message, retryable: true }, 503);
    }
  }
  if (!candSchedType) {
    try {
      const sRow = await env2.DB.prepare(
        `SELECT document_type FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (sRow?.document_type === "door_schedule")
        candSchedType = "door_schedule";
    } catch (e) {
    }
  }
  if (candSchedType === "door_schedule") {
    const sessTenantRow = await env2.DB.prepare(
      `SELECT tenant_id FROM hardware_extraction_sessions WHERE id = ?`
    ).bind(sessionId).first();
    const doorResult = await persistDoorScheduleResponse(
      sessionId,
      r.body.result,
      sessTenantRow?.tenant_id || "ven_weyland",
      pageNumber,
      totalPages,
      env2
    );
    if (!doorResult || doorResult.success === false) {
      try {
        await env2.DB.prepare(
          `UPDATE kdp_packets SET state='flagged', error=?, attempts=attempts+1, updated_at=datetime('now') WHERE id=?`
        ).bind(String(doorResult?.error || "door parse/persist failed").slice(0, 300), packet.id).run();
      } catch (_) {
      }
      try {
        await env2.DB.prepare(
          `UPDATE schedule_region_candidates SET status='failed', extraction_error=?, updated_at=datetime('now') WHERE id=?`
        ).bind(String(doorResult?.error || "door parse/persist failed").slice(0, 500), packet.candidate_id).run();
      } catch (_) {
      }
      return jsonResponse3({ error: "parse_failed", schedule_type: "door_schedule", detail: doorResult?.error || "door parse/persist failed" }, 422);
    }
    const doorCount = doorResult.entries_count || 0;
    try {
      await env2.DB.prepare(
        `UPDATE kdp_packets SET state='delivered', provider_path=?, groups_count=?, components_count=?, delivered_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
      ).bind(r.body.provider_path || "bridge", doorCount, doorCount, packet.id).run();
      await env2.DB.prepare(
        `UPDATE schedule_region_candidates SET status='extracted', extraction_completed_at=datetime('now'), extraction_entry_count=?, extraction_error=NULL, updated_at=datetime('now') WHERE id=?`
      ).bind(doorCount, packet.candidate_id).run();
    } catch (e) {
      console.warn("[finalize-image][door] ledger advance failed:", e.message);
    }
    try {
      await transformDoorEntriesToHardwareSets(sessionId, user.email || user.userId, env2);
    } catch (e) {
    }
    try {
      await materializeDseToLineItems(sessionId, env2);
    } catch (e) {
    }
    try {
      await env2.DB.prepare(
        `UPDATE hardware_extraction_sessions SET pending_job_id = NULL WHERE id = ? AND pending_job_id = ?`
      ).bind(sessionId, jobId).run();
    } catch (e) {
    }
    console.log(`[finalize-image][door] ${sessionId} p${pageNumber}: ${doorCount} door entries via ${r.body.provider_path || "bridge"}`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber,
      schedule_type: "door_schedule",
      provider: r.body.provider_path || "bridge",
      entries_count: doorCount,
      low_confidence_count: doorResult.low_confidence_count || 0,
      target_table: "door_schedule_entries"
    });
  }
  let extractionResult;
  try {
    extractionResult = buildExtractionResultFromVision(r.body.result, pageNumber, totalPages);
  } catch (e) {
    if (packet) {
      try {
        await env2.DB.prepare(
          `UPDATE kdp_packets SET state='flagged', error=?, attempts=attempts+1, updated_at=datetime('now') WHERE id=?`
        ).bind(String(e.message).slice(0, 300), packet.id).run();
      } catch (_) {
      }
    }
    return jsonResponse3({ error: "parse_failed", detail: e.message, retryable: e.retryable === true }, 422);
  }
  let mergeThisPage = false;
  try {
    const siblingDelivered = await env2.DB.prepare(
      `SELECT COUNT(*) AS n FROM kdp_packets
       WHERE connection_id = ? AND page_number = ? AND state = 'delivered' AND job_id != ?`
    ).bind(sessionId, pageNumber, jobId).first();
    mergeThisPage = (siblingDelivered?.n || 0) > 0;
  } catch (e) {
  }
  await savePageExtraction2(sessionId, pageNumber, extractionResult, env2, { merge: mergeThisPage });
  const groups = extractionResult.hardware_groups || [];
  const compCount = groups.reduce((s, g) => s + (g.components?.length || 0), 0);
  if (packet) {
    try {
      await env2.DB.prepare(
        `UPDATE kdp_packets SET state='delivered', provider_path=?, groups_count=?, components_count=?, delivered_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
      ).bind(r.body.provider_path || "bridge", groups.length, compCount, packet.id).run();
      if (packet.candidate_id) {
        await env2.DB.prepare(
          `UPDATE schedule_region_candidates SET status='extracted', extraction_completed_at=datetime('now'), extraction_entry_count=?, updated_at=datetime('now') WHERE id=?`
        ).bind(groups.length, packet.candidate_id).run();
      }
    } catch (e) {
      console.warn("[finalize-image] ledger advance failed:", e.message);
    }
  }
  try {
    await transformDoorEntriesToHardwareSets(sessionId, user.email || user.userId, env2);
  } catch (e) {
  }
  try {
    await materializeDseToLineItems(sessionId, env2);
  } catch (e) {
  }
  try {
    await env2.DB.prepare(
      `UPDATE hardware_extraction_sessions SET pending_job_id = NULL WHERE id = ? AND pending_job_id = ?`
    ).bind(sessionId, jobId).run();
  } catch (e) {
  }
  console.log(`[finalize-image] ${sessionId} p${pageNumber}: ${groups.length} groups via ${r.body.provider_path || "bridge"}`);
  return jsonResponse3({
    success: true,
    sessionId,
    pageNumber,
    provider: r.body.provider_path || "bridge",
    // Full arrays so the async UI path renders exactly like the synchronous one.
    hardware_groups: groups,
    door_hardware_matrix: extractionResult.door_hardware_matrix || [],
    detected_nomenclature: extractionResult.detected_nomenclature || null,
    metadata: extractionResult.metadata || {},
    groups_count: groups.length,
    components: groups.reduce((s, g) => s + (g.components?.length || 0), 0),
    next_step: `Review and approve: POST /api/hardware-schedule/session/${sessionId}/page/${pageNumber}/approve`
  });
});
}
