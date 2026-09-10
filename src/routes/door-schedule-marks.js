import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerDoorScheduleMarksRoutes(router, { authenticate }) {
  router.get("/api/door-schedule/session/:sessionId/marks", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { sessionId } = request2.params;
      const url = new URL(request2.url);
      const statusFilter = url.searchParams.get("status");
      const confidenceBelow = parseFloat(url.searchParams.get("confidence_below")) || null;
      const candidateId = url.searchParams.get("candidate_id");
      console.log(`[Mark List] Session ${sessionId}, filters: status=${statusFilter}, confidence_below=${confidenceBelow}, candidate_id=${candidateId}`);
      let query = `
        SELECT
          id,
          mark,
          hardware_group,
          fire_rating,
          width,
          height,
          door_type,
          door_material,
          frame_type,
          frame_material,
          panic,
          thickness,
          door_finish,
          frame_finish,
          stc_rating,
          head_detail,
          jamb_detail,
          sill_detail,
          notes,
          extraction_confidence,
          field_confidence_json,
          low_confidence_fields,
          validation_status,
          validated_by,
          validated_at,
          rejection_reason,
          corrections_json,
          original_values_json,
          validation_notes,
          hardware_set_id,
          hardware_group_match_score,
          hardware_group_match_method,
          (SELECT hs.set_number FROM hardware_sets hs WHERE hs.id = door_schedule_entries.hardware_set_id) AS matched_set_number,
          (SELECT hs.set_name FROM hardware_sets hs WHERE hs.id = door_schedule_entries.hardware_set_id) AS matched_set_name,
          page_number,
          created_at
        FROM door_schedule_entries
        WHERE session_id = ?
      `;
      const params = [sessionId];
      if (statusFilter) {
        query += " AND validation_status = ?";
        params.push(statusFilter);
      }
      if (confidenceBelow) {
        query += " AND extraction_confidence < ?";
        params.push(confidenceBelow);
      }
      if (candidateId) {
        query += " AND id LIKE ?";
        params.push(`%${candidateId}%`);
      }
      query += " ORDER BY page_number, mark";
      const stmt = env2.DB.prepare(query);
      const result = await stmt.bind(...params).all();
      const marks = result.results || [];
      const formattedMarks = marks.map((m) => ({
        id: m.id,
        mark: m.mark,
        hardware_group: m.hardware_group,
        fire_rating: m.fire_rating,
        width: m.width,
        height: m.height,
        door_type: m.door_type,
        door_material: m.door_material,
        frame_type: m.frame_type,
        frame_material: m.frame_material,
        // Dumb pipe (CAPT 2026-07-31): the schedule's own nomen passes through
        panic: m.panic,
        thickness: m.thickness,
        notes: m.notes,
        // QF-2026-0730-DETAILS/AFFIRM class: this formatter is an explicit
        // allowlist — every column the SELECT carries and a card renders MUST
        // appear here or it silently arrives undefined on load.
        door_finish: m.door_finish,
        frame_finish: m.frame_finish,
        stc_rating: m.stc_rating,
        head_detail: m.head_detail,
        jamb_detail: m.jamb_detail,
        sill_detail: m.sill_detail,
        extraction_confidence: m.extraction_confidence,
        field_confidences: m.field_confidence_json ? JSON.parse(m.field_confidence_json) : null,
        low_confidence_fields: m.low_confidence_fields ? m.low_confidence_fields.split(",") : [],
        status: m.validation_status || "pending",
        // QF-2026-0730-AFFIRM: the SPA reads validation_status (cards, affirm/flag
        // toggles, stats) — emitting only the renamed 'status' made every reload
        // render affirmed marks as pending while the summary counter stayed right.
        validation_status: m.validation_status || "pending",
        validated_by: m.validated_by,
        validated_at: m.validated_at,
        rejection_reason: m.rejection_reason,
        corrections: m.corrections_json ? JSON.parse(m.corrections_json) : null,
        original_values: m.original_values_json ? JSON.parse(m.original_values_json) : null,
        validation_notes: m.validation_notes,
        hardware_set_id: m.hardware_set_id,
        hardware_group_match_score: m.hardware_group_match_score,
        hardware_group_match_method: m.hardware_group_match_method,
        matched_set_number: m.matched_set_number,
        matched_set_name: m.matched_set_name,
        page_number: m.page_number,
        created_at: m.created_at
      }));
      const total = marks.length;
      const pending = marks.filter((m) => !m.validation_status || m.validation_status === "pending").length;
      const affirmed = marks.filter((m) => m.validation_status === "affirmed").length;
      const rejected = marks.filter((m) => m.validation_status === "rejected").length;
      const corrected = marks.filter((m) => m.validation_status === "corrected").length;
      const lowConfidenceCount = marks.filter((m) => m.extraction_confidence && m.extraction_confidence < 0.8).length;
      console.log(`[Mark List] Found ${total} marks: ${pending} pending, ${affirmed} affirmed, ${rejected} rejected, ${corrected} corrected`);
      return jsonResponse3({
        success: true,
        session_id: sessionId,
        marks: formattedMarks,
        summary: {
          total,
          pending,
          affirmed,
          rejected,
          corrected,
          low_confidence_count: lowConfidenceCount
        }
      });
    } catch (err) {
      console.error("[Mark List] Error:", err);
      return jsonResponse3({ error: "Failed to list marks: " + err.message }, 500);
    }
  });
  router.patch("/api/door-schedule/mark/:markId/affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { markId } = request2.params;
      const body = await request2.json().catch(() => ({}));
      const notes = body.notes ?? null;
      console.log(`[Mark Affirm] Affirming mark ${markId} by user ${user.userId}`);
      const mark = await env2.DB.prepare(`
        SELECT id, mark, validation_status FROM door_schedule_entries WHERE id = ?
      `).bind(markId).first();
      if (!mark) {
        return jsonResponse3({ error: "Mark not found", mark_id: markId }, 404);
      }
      if (mark.mark) {
        const dupeCheck = await env2.DB.prepare(`
          SELECT COUNT(*) as cnt FROM door_schedule_entries
          WHERE session_id = (SELECT session_id FROM door_schedule_entries WHERE id = ?)
            AND mark = (SELECT mark FROM door_schedule_entries WHERE id = ?)
            AND id != ?
        `).bind(markId, markId, markId).first();
        if (dupeCheck && dupeCheck.cnt > 0) {
          return jsonResponse3({
            error: "Cannot affirm: duplicate MARK exists in session. Delete the unwanted entry first.",
            mark_id: markId,
            mark_value: mark.mark,
            duplicate_count: dupeCheck.cnt
          }, 409);
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        UPDATE door_schedule_entries
        SET validation_status = 'affirmed',
            validated = 1,
            validated_by = ?,
            validated_at = ?,
            validation_notes = COALESCE(?, validation_notes),
            updated_at = ?
        WHERE id = ?
      `).bind(user.userId, now, notes, now, markId).run();
      console.log(`[Mark Affirm] Mark ${markId} affirmed successfully`);
      return jsonResponse3({
        success: true,
        mark_id: markId,
        status: "affirmed",
        affirmed_at: now,
        affirmed_by: user.userId
      });
    } catch (err) {
      console.error("[Mark Affirm] Error:", err.message, err.stack);
      return jsonResponse3({ error: "Failed to affirm mark", message: err.message, details: err.stack }, 500);
    }
  });
  router.patch("/api/door-schedule/mark/:markId/reject", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { markId } = request2.params;
      const body = await request2.json().catch(() => ({}));
      const { reason, notes } = body;
      if (!reason) {
        return jsonResponse3({ error: "Rejection reason is required" }, 400);
      }
      const validReasons = ["false_positive", "duplicate", "wrong_table", "unreadable", "other"];
      if (!validReasons.includes(reason)) {
        return jsonResponse3({
          error: "Invalid rejection reason",
          valid_reasons: validReasons
        }, 400);
      }
      console.log(`[Mark Reject] Rejecting mark ${markId} by user ${user.userId}, reason: ${reason}`);
      const mark = await env2.DB.prepare(`
        SELECT id, mark, validation_status FROM door_schedule_entries WHERE id = ?
      `).bind(markId).first();
      if (!mark) {
        return jsonResponse3({ error: "Mark not found", mark_id: markId }, 404);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        UPDATE door_schedule_entries
        SET validation_status = 'rejected',
            validated = 0,
            validated_by = ?,
            validated_at = ?,
            rejection_reason = ?,
            validation_notes = COALESCE(?, validation_notes),
            updated_at = ?
        WHERE id = ?
      `).bind(user.userId, now, reason, notes, now, markId).run();
      console.log(`[Mark Reject] Mark ${markId} rejected successfully`);
      return jsonResponse3({
        success: true,
        mark_id: markId,
        status: "rejected",
        rejected_at: now,
        reason
      });
    } catch (err) {
      console.error("[Mark Reject] Error:", err);
      return jsonResponse3({ error: "Failed to reject mark: " + err.message }, 500);
    }
  });
  router.delete("/api/door-schedule/mark/:markId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { markId } = request2.params;
      const mark = await env2.DB.prepare(`
        SELECT id, mark, session_id FROM door_schedule_entries WHERE id = ?
      `).bind(markId).first();
      if (!mark) {
        return jsonResponse3({ error: "Mark not found", mark_id: markId }, 404);
      }
      const session = await env2.DB.prepare(`
        SELECT id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?
      `).bind(mark.session_id, user.userId).first();
      if (!session) {
        return jsonResponse3({ error: "Unauthorized \u2014 session ownership mismatch" }, 403);
      }
      await env2.DB.prepare("DELETE FROM door_schedule_entries WHERE id = ?").bind(markId).run();
      console.log(`[Mark Delete] Mark ${markId} (MARK: ${mark.mark}) deleted by ${user.userId}`);
      return jsonResponse3({
        success: true,
        mark_id: markId,
        mark_value: mark.mark,
        deleted_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("[Mark Delete] Error:", err);
      return jsonResponse3({ error: "Failed to delete mark: " + err.message }, 500);
    }
  });
  router.patch("/api/door-schedule/mark/:markId/correct", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { markId } = request2.params;
      const body = await request2.json().catch(() => ({}));
      const { corrections, notes } = body;
      if (!corrections || typeof corrections !== "object" || Object.keys(corrections).length === 0) {
        return jsonResponse3({ error: "Corrections object is required with at least one field" }, 400);
      }
      console.log(`[Mark Correct] Correcting mark ${markId} by user ${user.userId}, fields: ${Object.keys(corrections).join(", ")}`);
      const mark = await env2.DB.prepare(`
        SELECT id, mark, hardware_group, fire_rating, width, height, door_type, door_material,
               frame_type, frame_material, panic, thickness, notes as mark_notes,
               validation_status, original_values_json
        FROM door_schedule_entries WHERE id = ?
      `).bind(markId).first();
      if (!mark) {
        return jsonResponse3({ error: "Mark not found", mark_id: markId }, 404);
      }
      const allowedFields = [
        "mark",
        "hardware_group",
        "fire_rating",
        "width",
        "height",
        "door_type",
        "door_material",
        "frame_type",
        "frame_material",
        "panic",
        "thickness",
        "notes",
        "door_finish",
        "frame_finish",
        "stc_rating",
        "head_detail",
        "jamb_detail",
        "sill_detail"
      ];
      const validCorrections = {};
      const invalidFields = [];
      for (const [key, value] of Object.entries(corrections)) {
        if (allowedFields.includes(key)) {
          validCorrections[key] = value;
        } else {
          invalidFields.push(key);
        }
      }
      if (Object.keys(validCorrections).length === 0) {
        return jsonResponse3({
          error: "No valid correction fields provided",
          allowed_fields: allowedFields,
          invalid_fields: invalidFields
        }, 400);
      }
      const originalValues = mark.original_values_json ? JSON.parse(mark.original_values_json) : {};
      const correctionsApplied = [];
      for (const field of Object.keys(validCorrections)) {
        if (!(field in originalValues)) {
          originalValues[field] = mark[field === "notes" ? "mark_notes" : field];
        }
        correctionsApplied.push(field);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let updateFields = [];
      let updateParams = [];
      for (const [field, value] of Object.entries(validCorrections)) {
        updateFields.push(`${field} = ?`);
        updateParams.push(value);
      }
      updateFields.push("validation_status = ?");
      updateParams.push("corrected");
      updateFields.push("validated = ?");
      updateParams.push(1);
      updateFields.push("validated_by = ?");
      updateParams.push(user.userId);
      updateFields.push("validated_at = ?");
      updateParams.push(now);
      updateFields.push("corrections_json = ?");
      updateParams.push(JSON.stringify(validCorrections));
      updateFields.push("original_values_json = ?");
      updateParams.push(JSON.stringify(originalValues));
      if (notes) {
        updateFields.push("validation_notes = ?");
        updateParams.push(notes);
      }
      updateFields.push("updated_at = ?");
      updateParams.push(now);
      updateParams.push(markId);
      const updateQuery = `UPDATE door_schedule_entries SET ${updateFields.join(", ")} WHERE id = ?`;
      await env2.DB.prepare(updateQuery).bind(...updateParams).run();
      console.log(`[Mark Correct] Mark ${markId} corrected successfully, fields: ${correctionsApplied.join(", ")}`);
      return jsonResponse3({
        success: true,
        mark_id: markId,
        status: "corrected",
        corrected_at: now,
        corrected_by: user.userId,
        corrections_applied: correctionsApplied,
        original_values: originalValues,
        invalid_fields: invalidFields.length > 0 ? invalidFields : void 0
      });
    } catch (err) {
      console.error("[Mark Correct] Error:", err);
      return jsonResponse3({ error: "Failed to correct mark: " + err.message }, 500);
    }
  });
  router.post("/api/door-schedule/session/:sessionId/marks/batch-affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { sessionId } = request2.params;
      const body = await request2.json().catch(() => ({}));
      const { mark_ids, confidence_threshold } = body;
      console.log(`[Batch Affirm] Session ${sessionId}, mark_ids=${mark_ids?.length || 0}, threshold=${confidence_threshold}`);
      if (!mark_ids && confidence_threshold === void 0) {
        return jsonResponse3({
          error: "Either mark_ids array or confidence_threshold is required"
        }, 400);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let affirmedCount = 0;
      let skippedCount = 0;
      const skippedIds = [];
      if (mark_ids && Array.isArray(mark_ids) && mark_ids.length > 0) {
        for (const markId of mark_ids) {
          const mark = await env2.DB.prepare(`
            SELECT id, validation_status FROM door_schedule_entries
            WHERE id = ? AND session_id = ?
          `).bind(markId, sessionId).first();
          if (!mark) {
            skippedCount++;
            skippedIds.push(markId);
            continue;
          }
          if (mark.validation_status === "affirmed" || mark.validation_status === "corrected") {
            skippedCount++;
            skippedIds.push(markId);
            continue;
          }
          await env2.DB.prepare(`
            UPDATE door_schedule_entries
            SET validation_status = 'affirmed',
                validated = 1,
                validated_by = ?,
                validated_at = ?,
                updated_at = ?
            WHERE id = ?
          `).bind(user.userId, now, now, markId).run();
          affirmedCount++;
        }
      } else if (confidence_threshold !== void 0) {
        const threshold = parseFloat(confidence_threshold);
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
          return jsonResponse3({
            error: "confidence_threshold must be a number between 0 and 1"
          }, 400);
        }
        const marksToAffirm = await env2.DB.prepare(`
          SELECT id FROM door_schedule_entries
          WHERE session_id = ?
            AND (validation_status IS NULL OR validation_status = 'pending')
            AND extraction_confidence >= ?
        `).bind(sessionId, threshold).all();
        for (const mark of marksToAffirm.results || []) {
          await env2.DB.prepare(`
            UPDATE door_schedule_entries
            SET validation_status = 'affirmed',
                validated = 1,
                validated_by = ?,
                validated_at = ?,
                updated_at = ?
            WHERE id = ?
          `).bind(user.userId, now, now, mark.id).run();
          affirmedCount++;
        }
        const skippedResult = await env2.DB.prepare(`
          SELECT COUNT(*) as count FROM door_schedule_entries
          WHERE session_id = ?
            AND (
              extraction_confidence < ?
              OR validation_status IN ('affirmed', 'corrected', 'rejected')
            )
        `).bind(sessionId, threshold).first();
        skippedCount = skippedResult?.count || 0;
      }
      console.log(`[Batch Affirm] Affirmed ${affirmedCount} marks, skipped ${skippedCount}`);
      return jsonResponse3({
        success: true,
        affirmed_count: affirmedCount,
        skipped_count: skippedCount,
        skipped_ids: skippedIds.length > 0 ? skippedIds : void 0
      });
    } catch (err) {
      console.error("[Batch Affirm] Error:", err);
      return jsonResponse3({ error: "Failed to batch affirm marks: " + err.message }, 500);
    }
  });
  router.patch("/api/door-schedule/mark/:markId/resolve-hardware", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { markId } = request2.params;
      const body = await request2.json().catch(() => ({}));
      const { hardware_set_id, resolution_method } = body;
      if (!hardware_set_id) {
        return jsonResponse3({ error: "hardware_set_id is required" }, 400);
      }
      const validMethods = ["exact_match", "pattern_match", "user_override"];
      const method = resolution_method || "user_override";
      if (!validMethods.includes(method)) {
        return jsonResponse3({
          error: "Invalid resolution_method",
          valid_methods: validMethods
        }, 400);
      }
      console.log(`[Resolve Hardware] Mark ${markId} -> hardware_set ${hardware_set_id} via ${method}`);
      const mark = await env2.DB.prepare(`
        SELECT id, mark, hardware_group, session_id FROM door_schedule_entries WHERE id = ?
      `).bind(markId).first();
      if (!mark) {
        return jsonResponse3({ error: "Mark not found", mark_id: markId }, 404);
      }
      const hardwareSet = await env2.DB.prepare(`
        SELECT id, set_number, description FROM hardware_sets WHERE id = ?
      `).bind(hardware_set_id).first().catch(() => null);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.prepare(`
        UPDATE door_schedule_entries
        SET hardware_set_id = ?,
            hardware_group_match_score = 1.0,
            hardware_group_match_method = ?,
            validated_by = COALESCE(validated_by, ?),
            validated_at = COALESCE(validated_at, ?),
            updated_at = ?
        WHERE id = ?
      `).bind(hardware_set_id, method, user.userId, now, now, markId).run();
      console.log(`[Resolve Hardware] Mark ${markId} linked to hardware_set ${hardware_set_id} successfully`);
      return jsonResponse3({
        success: true,
        mark_id: markId,
        hardware_set_id,
        hardware_group: hardwareSet?.set_number || mark.hardware_group,
        resolved_at: now,
        resolution_method: method
      });
    } catch (err) {
      console.error("[Resolve Hardware] Error:", err);
      return jsonResponse3({ error: "Failed to resolve hardware: " + err.message }, 500);
    }
  });
}
