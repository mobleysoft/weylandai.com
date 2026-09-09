// src/routes/projects.js
//
// Real project CRUD: list/create/get/update/delete, plus the affirm,
// link-sessions (bulk), and backfill-bridge routes that operate on a
// specific project. Extracted 2026-09-09 from legacy-monolith.js
// (verified lines 153207-153633 at HEAD 0277690) while wiring the
// landing-page redesign into GET /api/projects/:id - this is the
// cluster WORKER_MODULARIZATION_MAP.md already scoped as
// `routes/projects.js` (projects CRUD + link-sessions/backfill-bridge).
//
// Two real external dependencies, following the same explicit-
// dependency-injection pattern src/routes/document-generators.js
// already established (see that file's own header for the full
// rationale): transformDoorEntriesToHardwareSets and
// materializeDseToLineItems are still defined in legacy-monolith.js
// (not yet extracted - they belong to the hardware-schedule cluster,
// a bigger, more coupled extraction the map flags as a later phase,
// not done here). Passed in explicitly by the caller rather than
// imported back, to avoid a real circular import.
//
// This file does not touch the ambient `cors` var the map flags as a
// real modularization blocker (§2/§5/§6) - verified: no reference to
// `cors` anywhere in the extracted range.

import { authenticate } from "../lib/auth.js";
import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Registers the real project CRUD + affirm/link-sessions/backfill-bridge
 * routes on the shared router.
 *
 * @param {object} router - the app's NativeRouter instance (still
 *   constructed in legacy-monolith.js for this phase).
 * @param {object} deps
 * @param {Function} deps.transformDoorEntriesToHardwareSets - still
 *   defined in legacy-monolith.js, used only by the affirm route.
 * @param {Function} deps.materializeDseToLineItems - still defined in
 *   legacy-monolith.js, used only by the affirm route.
 */
export function registerProjectRoutes(router, { transformDoorEntriesToHardwareSets, materializeDseToLineItems }) {
router.get("/api/projects", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const url = new URL(request2.url);
    const status = url.searchParams.get("status");
    let query = `SELECT * FROM projects WHERE tenant_id = ?`;
    const params = [user.tenantId];
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    } else {
      query += ` AND status != 'archived'`;
    }
    query += ` ORDER BY updated_at DESC, created_at DESC`;
    const result = await env2.DB.prepare(query).bind(...params).all();
    return jsonResponse3({ projects: result.results || [] });
  } catch (err) {
    console.error("[Projects] List error:", err);
    return jsonResponse3({ error: "Failed to list projects: " + err.message }, 500);
  }
});
router.post("/api/projects", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const body = await request2.json();
    if (!body.name || !body.name.trim()) {
      return jsonResponse3({ error: "Project name is required" }, 400);
    }
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env2.DB.prepare(`
      INSERT INTO projects (
        id, tenant_id, name, project_type, status,
        client_name, client_address, client_contact_name, client_contact_email, client_contact_phone,
        billing_name, billing_address, shipping_address, ap_contact, resale_number,
        project_address, dsa_number, architect, contractor,
        external_project_ref, metadata, notes,
        metadata_affirmed, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      id,
      user.tenantId,
      body.name.trim(),
      body.project_type || "DOORS",
      body.client_name || null,
      body.client_address || null,
      body.client_contact_name || null,
      body.client_contact_email || null,
      body.client_contact_phone || null,
      body.billing_name || null,
      body.billing_address || null,
      body.shipping_address || null,
      body.ap_contact || null,
      body.resale_number || null,
      body.project_address || null,
      body.dsa_number || null,
      body.architect || null,
      body.contractor || null,
      body.external_project_ref || null,
      body.metadata ? JSON.stringify(body.metadata) : null,
      body.notes || null,
      now,
      now,
      user.userId
    ).run();
    const project = await env2.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
    return jsonResponse3({ project }, 201);
  } catch (err) {
    console.error("[Projects] Create error:", err);
    return jsonResponse3({ error: "Failed to create project: " + err.message }, 500);
  }
});
router.get("/api/projects/:id", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.id;
    const project = await env2.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    return jsonResponse3({ project });
  } catch (err) {
    console.error("[Projects] Get error:", err);
    return jsonResponse3({ error: "Failed to get project: " + err.message }, 500);
  }
});
router.put("/api/projects/:id", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.id;
    const body = await request2.json();
    const existing = await env2.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!existing) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const affirmGatedFields = [
      "client_name",
      "client_address",
      "billing_name",
      "billing_address",
      "shipping_address",
      "dsa_number",
      "architect",
      "contractor",
      "project_address"
    ];
    const allowedFields = [
      "name",
      "project_type",
      "status",
      "client_name",
      "client_address",
      "client_contact_name",
      "client_contact_email",
      "client_contact_phone",
      "billing_name",
      "billing_address",
      "shipping_address",
      "ap_contact",
      "resale_number",
      "project_address",
      "dsa_number",
      "architect",
      "contractor",
      "external_project_ref",
      "metadata",
      "notes"
    ];
    const updateFields = [];
    const params = [];
    let affirmGatedChanged = false;
    for (const field of allowedFields) {
      if (body[field] !== void 0) {
        const newValue = field === "metadata" && typeof body[field] === "object" ? JSON.stringify(body[field]) : body[field];
        updateFields.push(`${field} = ?`);
        params.push(newValue);
        if (affirmGatedFields.includes(field) && String(newValue || "") !== String(existing[field] || "")) {
          affirmGatedChanged = true;
        }
      }
    }
    if (updateFields.length === 0) {
      return jsonResponse3({ error: "No valid fields to update" }, 400);
    }
    if (affirmGatedChanged && existing.metadata_affirmed === 1) {
      updateFields.push("metadata_affirmed = 0", "metadata_affirmed_at = NULL", "metadata_affirmed_by = NULL");
      const auditId = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT INTO affirm_audit_log (id, session_id, entity_type, entity_id, action, user_id, user_email, reason, entity_snapshot, created_at)
        VALUES (?, NULL, 'project_metadata', ?, 'unaffirm', ?, ?, 'Affirm-gated field changed via project update', ?, datetime('now'))
      `).bind(
        auditId,
        projectId,
        user.userId,
        user.email || null,
        JSON.stringify(existing)
      ).run();
    }
    updateFields.push("updated_at = ?");
    params.push((/* @__PURE__ */ new Date()).toISOString());
    params.push(projectId);
    await env2.DB.prepare(
      `UPDATE projects SET ${updateFields.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    const updated = await env2.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
    return jsonResponse3({ project: updated, affirm_reset: affirmGatedChanged && existing.metadata_affirmed === 1 });
  } catch (err) {
    console.error("[Projects] Update error:", err);
    return jsonResponse3({ error: "Failed to update project: " + err.message }, 500);
  }
});
router.delete("/api/projects/:id", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.id;
    const existing = await env2.DB.prepare(
      "SELECT id FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!existing) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    await env2.DB.prepare(
      `UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?`
    ).bind((/* @__PURE__ */ new Date()).toISOString(), projectId).run();
    return jsonResponse3({ message: "Project archived" });
  } catch (err) {
    console.error("[Projects] Archive error:", err);
    return jsonResponse3({ error: "Failed to archive project: " + err.message }, 500);
  }
});
router.post("/api/projects/:id/affirm", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.id;
    const body = await request2.json().catch(() => ({}));
    const { action, reason } = body;
    if (!action || !["affirm", "unaffirm"].includes(action)) {
      return jsonResponse3({ error: 'action must be "affirm" or "unaffirm"' }, 400);
    }
    const project = await env2.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (action === "affirm") {
      if (!project.name || !project.name.trim()) {
        return jsonResponse3({ error: "Cannot affirm project with empty name" }, 400);
      }
      await env2.DB.prepare(
        `UPDATE projects SET metadata_affirmed = 1, metadata_affirmed_at = ?, metadata_affirmed_by = ?, updated_at = ? WHERE id = ?`
      ).bind(now, user.userId, now, projectId).run();
    } else {
      await env2.DB.prepare(
        `UPDATE projects SET metadata_affirmed = 0, metadata_affirmed_at = NULL, metadata_affirmed_by = NULL, updated_at = ? WHERE id = ?`
      ).bind(now, projectId).run();
    }
    const auditId = crypto.randomUUID();
    await env2.DB.prepare(`
      INSERT INTO affirm_audit_log (id, session_id, entity_type, entity_id, action, user_id, user_email, reason, entity_snapshot, created_at)
      VALUES (?, NULL, 'project_metadata', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId,
      projectId,
      action,
      user.userId,
      user.email || null,
      reason || null,
      JSON.stringify(project),
      now
    ).run();
    const updated = await env2.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
    return jsonResponse3({ project: updated, action });
  } catch (err) {
    console.error("[Projects] Affirm error:", err);
    return jsonResponse3({ error: "Project affirm failed: " + err.message }, 500);
  }
});
router.put("/api/hardware-schedule/session/:sessionId/link-project", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    const projectId = body.project_id || null;
    const session = await env2.DB.prepare(
      "SELECT id, user_id FROM hardware_extraction_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    if (projectId) {
      const project = await env2.DB.prepare(
        "SELECT id FROM projects WHERE id = ? AND tenant_id = ?"
      ).bind(projectId, user.tenantId).first();
      if (!project) {
        return jsonResponse3({ error: "Project not found" }, 404);
      }
    }
    await env2.DB.prepare(
      "UPDATE hardware_extraction_sessions SET project_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(projectId, sessionId).run();
    return jsonResponse3({ success: true, project_id: projectId });
  } catch (err) {
    console.error("[Projects] Link error:", err);
    return jsonResponse3({ error: "Failed to link project: " + err.message }, 500);
  }
});
router.post("/api/projects/:projectId/link-sessions", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.projectId;
    const body = await request2.json();
    const sessionIds = body.session_ids;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return jsonResponse3({ error: "session_ids must be a non-empty array" }, 400);
    }
    const project = await env2.DB.prepare(
      "SELECT id, name FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    let linked = 0;
    let skipped = 0;
    const results = [];
    for (const sid of sessionIds) {
      const session = await env2.DB.prepare(
        "SELECT id, project_id, project_name FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?"
      ).bind(sid, user.userId).first();
      if (!session) {
        results.push({ session_id: sid, status: "not_found" });
        skipped++;
        continue;
      }
      if (session.project_id === projectId) {
        results.push({ session_id: sid, status: "already_linked" });
        skipped++;
        continue;
      }
      await env2.DB.prepare(
        "UPDATE hardware_extraction_sessions SET project_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(projectId, sid).run();
      results.push({ session_id: sid, status: "linked", previous_project_id: session.project_id || null });
      linked++;
    }
    console.log(`[Bulk Link] Project ${project.name}: ${linked} linked, ${skipped} skipped out of ${sessionIds.length}`);
    return jsonResponse3({
      success: true,
      project_id: projectId,
      project_name: project.name,
      linked,
      skipped,
      total: sessionIds.length,
      results
    });
  } catch (err) {
    console.error("[Bulk Link] Error:", err);
    return jsonResponse3({ error: "Failed to link sessions: " + err.message }, 500);
  }
});
router.post("/api/projects/:projectId/backfill-bridge", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const projectId = request2.params.projectId;
    const project = await env2.DB.prepare(
      "SELECT id, name FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const candidates = await env2.DB.prepare(`
      SELECT hes.id, hes.project_name, hes.filename,
             (SELECT COUNT(*) FROM door_schedule_entries WHERE session_id = hes.id) as dse_count,
             (SELECT COUNT(*) FROM hardware_sets WHERE session_id = hes.id) as set_count
      FROM hardware_extraction_sessions hes
      WHERE hes.project_id = ?
    `).bind(projectId).all();
    const sessionsToBackfill = (candidates.results || []).filter((s) => s.dse_count > 0 && s.set_count === 0);
    const sessionsAlreadyBridged = (candidates.results || []).filter((s) => s.dse_count > 0 && s.set_count > 0);
    const sessionsNoDse = (candidates.results || []).filter((s) => s.dse_count === 0);
    if (sessionsToBackfill.length === 0) {
      return jsonResponse3({
        success: true,
        message: "No sessions need backfill",
        already_bridged: sessionsAlreadyBridged.length,
        no_dse: sessionsNoDse.length,
        total_linked: (candidates.results || []).length
      });
    }
    console.log(`[Backfill Bridge] Project ${project.name}: ${sessionsToBackfill.length} sessions to backfill`);
    const bridgeResults = [];
    let totalSetsCreated = 0;
    let totalMarks = 0;
    for (const session of sessionsToBackfill) {
      try {
        const result = await transformDoorEntriesToHardwareSets(session.id, user.userId, env2);
        let matResult = { doorsCreated: 0, framesCreated: 0 };
        try {
          matResult = await materializeDseToLineItems(session.id, env2);
        } catch (matErr) {
          console.warn(`[Backfill Bridge] Auto-materialize failed for ${session.id}: ${matErr.message}`);
        }
        bridgeResults.push({
          session_id: session.id,
          filename: session.filename,
          status: "bridged",
          sets_created: result.setsCreated,
          total_marks: result.totalMarks,
          groups: Object.keys(result.groups).length,
          doors_materialized: matResult.doorsCreated,
          frames_materialized: matResult.framesCreated
        });
        totalSetsCreated += result.setsCreated;
        totalMarks += result.totalMarks;
      } catch (bridgeErr) {
        console.error(`[Backfill Bridge] Error on session ${session.id}:`, bridgeErr);
        bridgeResults.push({
          session_id: session.id,
          filename: session.filename,
          status: "error",
          error: bridgeErr.message
        });
      }
    }
    console.log(`[Backfill Bridge] Complete: ${totalSetsCreated} sets from ${totalMarks} marks across ${sessionsToBackfill.length} sessions`);
    return jsonResponse3({
      success: true,
      project_id: projectId,
      project_name: project.name,
      sessions_backfilled: sessionsToBackfill.length,
      already_bridged: sessionsAlreadyBridged.length,
      no_dse: sessionsNoDse.length,
      total_sets_created: totalSetsCreated,
      total_marks: totalMarks,
      results: bridgeResults
    });
  } catch (err) {
    console.error("[Backfill Bridge] Error:", err);
    return jsonResponse3({ error: "Failed to run backfill bridge: " + err.message }, 500);
  }
});
}
