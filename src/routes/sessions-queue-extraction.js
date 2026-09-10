import { jsonResponse3 } from "../lib/json-response.js";
import { arrayBufferToBase64 } from "../auth-module.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, resolveExtractionContract: Function, resolveInferenceContract: Function, callEdge: Function }} deps
 */
export function registerSessionsQueueExtractionRoutes(router, { authenticate, resolveExtractionContract, resolveInferenceContract, callEdge }) {
  router.post("/api/sessions/:sessionId/queue-extraction", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId || user.userId;
    if (!ownerId)
      return jsonResponse3({ error: "No identity for current user" }, 400);
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ error: "Invalid JSON body" }, 400);
    }
    let messages = body.messages;
    if (body.use_session_pdf) {
      const sess = await env2.DB.prepare(
        `SELECT file_buffer_key, user_id FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(request2.params.sessionId).first();
      if (!sess || sess.user_id !== user.userId)
        return jsonResponse3({ error: "session_not_found" }, 404);
      let pdfBuffer = null;
      if (env2.UPLOADS && sess.file_buffer_key) {
        const r2Obj = await env2.UPLOADS.get(sess.file_buffer_key);
        if (r2Obj)
          pdfBuffer = await r2Obj.arrayBuffer();
      }
      if (!pdfBuffer && env2.CACHE && sess.file_buffer_key) {
        pdfBuffer = await env2.CACHE.get(sess.file_buffer_key, { type: "arrayBuffer" });
      }
      if (!pdfBuffer)
        return jsonResponse3({ error: "pdf_not_found_in_storage", hint: "PDF may have expired; re-upload" }, 404);
      const _qSess = await env2.DB.prepare(
        `SELECT document_type, tenant_id, total_pages FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(request2.params.sessionId).first();
      const _qContract = await resolveExtractionContract(env2, {
        sessionId: request2.params.sessionId,
        pageNumber: 1,
        totalPages: _qSess?.total_pages || 1,
        tenantId: _qSess?.tenant_id || null,
        scheduleType: _qSess?.document_type === "door_schedule" ? "door_schedule" : null
      });
      messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: arrayBufferToBase64(pdfBuffer)
            }
          },
          { type: "text", text: _qContract.prompt }
        ]
      }];
    }
    if (!Array.isArray(messages)) {
      return jsonResponse3({ error: "messages array required (Anthropic Messages format), or pass use_session_pdf:true" }, 400);
    }
    const _qInf = resolveInferenceContract(env2);
    const res = await callEdge("POST", "/ai/v1/jobs/queue", env2, {
      owner_id: ownerId,
      venture_code: "weyland",
      model_hint: body.model_hint || _qInf.model,
      max_tokens: body.max_tokens || _qInf.max_tokens,
      temperature: _qInf.temperature,
      messages,
      metadata: {
        session_id: request2.params.sessionId,
        user_email: user.email,
        mhs_id: user.mhsId,
        ...body.metadata || {}
      }
    });
    if (res.status === 200 && res.body?.job_id) {
      try {
        await env2.DB.prepare(
          `UPDATE hardware_extraction_sessions
           SET pending_job_id = ?, pending_job_queued_at = ?
           WHERE id = ?`
        ).bind(res.body.job_id, (/* @__PURE__ */ new Date()).toISOString(), request2.params.sessionId).run();
      } catch (stampErr) {
        console.warn("[queue-extraction] Failed to stamp pending_job_id:", stampErr.message);
      }
    }
    return jsonResponse3(res.body, res.status);
  });
}
