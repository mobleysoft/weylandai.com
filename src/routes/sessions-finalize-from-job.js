import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, callEdge: Function, persistDoorScheduleResponse: Function, transformDoorEntriesToHardwareSets: Function, materializeDseToLineItems: Function, parseAndValidateExtraction: Function }} deps
 */
export function registerSessionsFinalizeFromJobRoutes(router, { authenticate, callEdge, persistDoorScheduleResponse, transformDoorEntriesToHardwareSets, materializeDseToLineItems, parseAndValidateExtraction }) {
  router.post("/api/sessions/:sessionId/finalize-from-job/:jobId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sess = await env2.DB.prepare(
      `SELECT pending_job_id, user_id FROM hardware_extraction_sessions WHERE id = ?`
    ).bind(request2.params.sessionId).first();
    if (!sess || sess.user_id !== user.userId)
      return jsonResponse3({ error: "session_not_found" }, 404);
    if (sess.pending_job_id !== request2.params.jobId)
      return jsonResponse3({ error: "job_not_associated_with_session" }, 409);
    const r = await callEdge("GET", `/ai/v1/jobs/${request2.params.jobId}`, env2);
    if (r.status !== 200)
      return jsonResponse3({ error: "edge_fetch_failed", detail: r.body }, 502);
    if (r.body.status !== "completed")
      return jsonResponse3({ error: "job_not_completed", status: r.body.status }, 425);
    const _sessType = await env2.DB.prepare(
      `SELECT document_type, tenant_id, total_pages FROM hardware_extraction_sessions WHERE id = ?`
    ).bind(request2.params.sessionId).first();
    if (_sessType?.document_type === "door_schedule") {
      const doorResult = await persistDoorScheduleResponse(
        request2.params.sessionId,
        r.body.result,
        _sessType.tenant_id || "ven_weyland",
        0,
        _sessType.total_pages || 1,
        env2
      );
      if (!doorResult || doorResult.success === false) {
        return jsonResponse3({ ok: false, schedule_type: "door_schedule", error: "door_finalize_failed", detail: doorResult?.error || "parse/persist failed" }, 422);
      }
      await env2.DB.prepare(
        `UPDATE hardware_extraction_sessions SET pending_job_id = NULL, extraction_completed_at = ? WHERE id = ? AND pending_job_id = ?`
      ).bind((/* @__PURE__ */ new Date()).toISOString(), request2.params.sessionId, request2.params.jobId).run();
      try {
        await transformDoorEntriesToHardwareSets(request2.params.sessionId, user.email || user.userId, env2);
      } catch (e) {
      }
      try {
        await materializeDseToLineItems(request2.params.sessionId, env2);
      } catch (e) {
      }
      return jsonResponse3({
        ok: true,
        schedule_type: "door_schedule",
        rows_inserted: doorResult.entries_count || 0,
        low_confidence_count: doorResult.low_confidence_count || 0,
        target_table: "door_schedule_entries"
      });
    }
    const extractionText = r.body.result?.content?.[0]?.text || "";
    const parsed = parseAndValidateExtraction(extractionText);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sessionId = request2.params.sessionId;
    let rowsInserted = 0;
    const rowErrors = [];
    const sessMeta = await env2.DB.prepare(
      `SELECT tenant_id FROM hardware_extraction_sessions WHERE id = ?`
    ).bind(sessionId).first();
    const tenantId = sessMeta?.tenant_id || null;
    if (Array.isArray(parsed.doors) && parsed.doors.length > 0) {
      for (const door of parsed.doors) {
        try {
          const entryId = crypto.randomUUID();
          await env2.DB.prepare(`
            INSERT INTO door_schedule_entries (
              id, session_id, tenant_id, page_number,
              mark, hardware_group,
              fire_rating, width_inches, height_inches,
              door_type, door_material, frame_material,
              thickness_inches, notes,
              extraction_confidence,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id, mark) DO UPDATE SET
              hardware_group = excluded.hardware_group,
              fire_rating = excluded.fire_rating,
              width_inches = excluded.width_inches,
              height_inches = excluded.height_inches,
              door_type = excluded.door_type,
              door_material = excluded.door_material,
              frame_material = excluded.frame_material,
              thickness_inches = excluded.thickness_inches,
              notes = excluded.notes,
              extraction_confidence = excluded.extraction_confidence,
              updated_at = datetime('now')
          `).bind(
            entryId,
            sessionId,
            tenantId,
            0,
            // SABP processes whole PDF — no per-page attribution; use 0 as sentinel
            door.door_number,
            door.hardware_group || null,
            door.fire_rating || null,
            door.width_inches || null,
            door.height_inches || null,
            door.door_type || null,
            door.material_code || null,
            door.frame_material || null,
            door.thickness_inches || null,
            door.remarks || null,
            parsed.extraction_confidence || null,
            now
          ).run();
          rowsInserted++;
        } catch (rowErr) {
          try {
            const fallbackId = crypto.randomUUID();
            await env2.DB.prepare(`
              INSERT OR IGNORE INTO door_schedule_entries (
                id, session_id, tenant_id, page_number,
                mark, hardware_group,
                fire_rating, width_inches, height_inches,
                door_type, door_material, frame_material,
                thickness_inches, notes,
                extraction_confidence, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              fallbackId,
              sessionId,
              tenantId,
              0,
              door.door_number,
              door.hardware_group || null,
              door.fire_rating || null,
              door.width_inches || null,
              door.height_inches || null,
              door.door_type || null,
              door.material_code || null,
              door.frame_material || null,
              door.thickness_inches || null,
              door.remarks || null,
              parsed.extraction_confidence || null,
              now
            ).run();
            rowsInserted++;
          } catch (fallbackErr) {
            rowErrors.push({ mark: door.door_number, error: fallbackErr.message });
          }
        }
      }
      try {
        await env2.DB.prepare(`
          UPDATE hardware_extraction_sessions
          SET door_schedule_extracted = 1,
              door_entries_count = ?,
              pages_processed = 1,
              door_schedule_extracted_at = ?,
              updated_at = ?
          WHERE id = ?
        `).bind(rowsInserted, now, now, sessionId).run();
      } catch (sessUpdateErr) {
        console.warn("[finalize-from-job] session flag update failed:", sessUpdateErr.message);
      }
    }
    console.log(`[finalize-from-job] ${sessionId}: inserted ${rowsInserted} door rows, ${rowErrors.length} errors`);
    if (rowErrors.length > 0) {
      console.warn("[finalize-from-job] row insert errors:", JSON.stringify(rowErrors));
    }
    await env2.DB.prepare(
      `UPDATE hardware_extraction_sessions
       SET pending_job_id = NULL, extraction_completed_at = ?
       WHERE id = ?`
    ).bind(now, sessionId).run();
    return jsonResponse3({
      ok: true,
      extraction: parsed,
      rows_inserted: rowsInserted,
      row_errors: rowErrors.length > 0 ? rowErrors : void 0
    });
  });
}
