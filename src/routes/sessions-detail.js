import { jsonResponse3 } from "../lib/json-response.js";
import { generateSignedResourceUrl } from "../auth-module.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerSessionsDetailRoutes(router, { authenticate }) {
  router.post("/api/sessions/:sessionId/signed-urls", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    try {
      const session = await env2.DB.prepare(`
        SELECT id, total_pages, user_id FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const body = await request2.json().catch(() => ({}));
      let pageNumbers = [];
      if (body.all) {
        for (let i = 1; i <= session.total_pages; i++) {
          pageNumbers.push(i);
        }
      } else if (Array.isArray(body.pages)) {
        pageNumbers = body.pages.filter((p) => p >= 1 && p <= session.total_pages);
      } else {
        return jsonResponse3({ error: "Request must include { all: true } or { pages: [1, 2, ...] }" }, 400);
      }
      const urls = {};
      const baseUrl = new URL(request2.url).origin;
      for (const pageNum of pageNumbers) {
        const resourcePath = `/api/hardware-schedule/session/${sessionId}/page/${pageNum}/preview`;
        const signedPath = await generateSignedResourceUrl(resourcePath, env2.JWT_SECRET, 15);
        urls[pageNum] = `${baseUrl}${signedPath}`;
      }
      console.log(`[Signed URLs] Generated ${Object.keys(urls).length} signed URLs for session ${sessionId}`);
      return jsonResponse3({
        success: true,
        session_id: sessionId,
        urls,
        expires_in_minutes: 15
      });
    } catch (err) {
      console.error("[Signed URLs] Error:", err);
      return jsonResponse3({ error: "Failed to generate signed URLs", details: err.message }, 500);
    }
  });
  router.get("/api/sessions/:sessionId/door-matrix", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    console.log(`[Door Matrix] Fetching matrix for session ${sessionId}`);
    try {
      const session = await env2.DB.prepare(`
        SELECT id, project_name, user_id FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const matrix = await env2.DB.prepare(`
        SELECT
          dhm.id,
          dhm.door_number,
          dhm.door_location,
          dhm.door_type,
          dhm.hardware_set_number,
          dhm.source_page,
          dhm.source_type,
          dhm.extraction_confidence,
          dhm.verified,
          dhm.verified_at,
          dhm.verified_by
        FROM door_hardware_matrix dhm
        WHERE dhm.session_id = ?
        ORDER BY dhm.door_number
      `).bind(sessionId).all();
      const nomenclature = await env2.DB.prepare(`
        SELECT hardware_unit_term, door_identifier_term, user_override
        FROM session_nomenclature
        WHERE session_id = ?
      `).bind(sessionId).first();
      return jsonResponse3({
        sessionId,
        projectName: session.project_name,
        nomenclature: nomenclature || { hardware_unit_term: "set", door_identifier_term: "door" },
        matrix: matrix.results,
        total: matrix.results.length,
        verified: matrix.results.filter((m) => m.verified).length
      });
    } catch (err) {
      console.error("[Door Matrix] Error:", err);
      return jsonResponse3({ error: "Failed to retrieve door matrix: " + err.message }, 500);
    }
  });
  router.put("/api/sessions/:sessionId/nomenclature", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    try {
      const session = await env2.DB.prepare(`
        SELECT id, user_id FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const validHwTerms = ["set", "group"];
      const validDoorTerms = ["door", "mark", "opening"];
      const hwTerm = body.hardware_unit_term?.toLowerCase();
      const doorTerm = body.door_identifier_term?.toLowerCase();
      if (hwTerm && !validHwTerms.includes(hwTerm)) {
        return jsonResponse3({ error: `Invalid hardware_unit_term. Must be one of: ${validHwTerms.join(", ")}` }, 400);
      }
      if (doorTerm && !validDoorTerms.includes(doorTerm)) {
        return jsonResponse3({ error: `Invalid door_identifier_term. Must be one of: ${validDoorTerms.join(", ")}` }, 400);
      }
      const nomenclatureId = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT OR REPLACE INTO session_nomenclature
        (id, session_id, hardware_unit_term, door_identifier_term, user_override, created_at, updated_at)
        VALUES (
          COALESCE((SELECT id FROM session_nomenclature WHERE session_id = ?), ?),
          ?,
          ?,
          ?,
          1,
          COALESCE((SELECT created_at FROM session_nomenclature WHERE session_id = ?), ?),
          ?
        )
      `).bind(
        sessionId,
        nomenclatureId,
        sessionId,
        hwTerm || "set",
        doorTerm || "door",
        sessionId,
        (/* @__PURE__ */ new Date()).toISOString(),
        (/* @__PURE__ */ new Date()).toISOString()
      ).run();
      console.log(`[Nomenclature] Updated for session ${sessionId}: ${hwTerm || "set"} / ${doorTerm || "door"}`);
      return jsonResponse3({
        message: "Nomenclature updated",
        hardware_unit_term: hwTerm || "set",
        door_identifier_term: doorTerm || "door"
      });
    } catch (err) {
      console.error("[Nomenclature] Error:", err);
      return jsonResponse3({ error: "Failed to update nomenclature: " + err.message }, 500);
    }
  });
  router.put("/api/sessions/:sessionId/position", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    try {
      const session = await env2.DB.prepare(`
        SELECT id, user_id, total_pages FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const clientTotalPages = body.total_pages ? parseInt(body.total_pages) : null;
      const effectiveTotalPages = clientTotalPages && clientTotalPages > session.total_pages ? clientTotalPages : session.total_pages;
      if (clientTotalPages && clientTotalPages > session.total_pages) {
        console.log(`[Session] Updating total_pages from ${session.total_pages} to ${clientTotalPages}`);
      }
      const currentPage = parseInt(body.current_page);
      if (isNaN(currentPage) || currentPage < 1 || currentPage > effectiveTotalPages) {
        return jsonResponse3({
          error: `Invalid page number. Must be between 1 and ${effectiveTotalPages}`
        }, 400);
      }
      await env2.DB.prepare(`
        UPDATE hardware_extraction_sessions
        SET current_page = ?, total_pages = ?, updated_at = ?
        WHERE id = ?
      `).bind(currentPage, effectiveTotalPages, (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
      console.log(`[Session] Position updated for ${sessionId}: page ${currentPage}/${effectiveTotalPages}`);
      return jsonResponse3({
        success: true,
        message: "Position saved",
        current_page: currentPage
      });
    } catch (err) {
      console.error("[Session Position] Error:", err);
      return jsonResponse3({ error: "Failed to save position: " + err.message }, 500);
    }
  });
  router.post("/api/sessions/:sessionId/door-matrix/:mappingId/verify", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { sessionId, mappingId } = request2.params;
    try {
      const session = await env2.DB.prepare(`
        SELECT id, user_id FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session || session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      await env2.DB.prepare(`
        UPDATE door_hardware_matrix
        SET verified = 1, verified_at = ?, verified_by = ?
        WHERE id = ? AND session_id = ?
      `).bind(
        (/* @__PURE__ */ new Date()).toISOString(),
        user.userId,
        mappingId,
        sessionId
      ).run();
      return jsonResponse3({ message: "Mapping verified", mappingId });
    } catch (err) {
      return jsonResponse3({ error: "Failed to verify mapping: " + err.message }, 500);
    }
  });
}
