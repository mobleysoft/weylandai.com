import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, persistSessionMatches: Function, assembleSubmittalPackage: Function, getAssemblyStatus: Function, PDFDocument: Function, StandardFonts: object, rgb: Function }} deps
 */
export function registerSessionsAssembleRoutes(router, { authenticate, persistSessionMatches, assembleSubmittalPackage, getAssemblyStatus, PDFDocument, StandardFonts, rgb }) {
  router.post("/api/sessions/:sessionId/assemble", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID is required" }, 400);
      }
      const session = await env2.DB.prepare(`
        SELECT hes.id, hes.project_name, hes.status, hes.user_id, hes.project_id,
               p.name AS proj_name, p.client_name, p.project_address, p.dsa_number,
               p.architect AS proj_architect, p.contractor AS proj_contractor,
               p.metadata_affirmed
        FROM hardware_extraction_sessions hes
        LEFT JOIN projects p ON hes.project_id = p.id
        WHERE hes.id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized: session belongs to another user" }, 403);
      }
      const body = await request2.json().catch(() => ({}));
      const affirmed = session.project_id && session.metadata_affirmed;
      let vendorName = null;
      if (user && user.tenantId) {
        const vp = await env2.DB.prepare(
          "SELECT company_name FROM vendor_profile WHERE tenant_id = ?"
        ).bind(user.tenantId).first();
        vendorName = vp?.company_name || null;
      }
      const options = {
        projectName: body.projectName || (affirmed ? session.proj_name : null) || session.project_name,
        date: body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        preparedBy: body.preparedBy || vendorName || "Weyland by Weyland",
        preparedFor: body.preparedFor || (affirmed ? session.client_name : null),
        contractor: body.contractor || (affirmed ? session.proj_contractor : null),
        architect: body.architect || (affirmed ? session.proj_architect : null),
        dsaNumber: body.dsaNumber || (affirmed ? session.dsa_number : null),
        includeAllCutSheets: body.includeAllCutSheets !== false,
        coverPage: body.coverPage !== false,
        tableOfContents: body.tableOfContents !== false,
        saveToR2: true
      };
      await persistSessionMatches(sessionId, env2);
      console.log(`[Assembly] Starting assembly for session ${sessionId}`);
      const PDFLib = { PDFDocument: PDFDocument, StandardFonts, rgb };
      const result = await assembleSubmittalPackage(sessionId, options, env2, PDFLib);
      if (!result.success) {
        return jsonResponse3({
          error: "Assembly failed",
          details: result.errors
        }, 500);
      }
      const pdfUrl = result.r2Key ? `/api/sessions/${sessionId}/submittal/download` : null;
      return jsonResponse3({
        submittalId: `${sessionId}-submittal`,
        sessionId,
        pdfUrl,
        r2Key: result.r2Key,
        totalPages: result.totalPages,
        sections: result.sections,
        errors: result.errors.length > 0 ? result.errors : void 0
      });
    } catch (err) {
      console.error(`[Assembly] Error: ${err.message}`);
      return jsonResponse3({ error: "Assembly failed: " + err.message }, 500);
    }
  });
  router.get("/api/sessions/:sessionId/assemble/status", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      const session = await env2.DB.prepare(`
        SELECT user_id FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const status = await getAssemblyStatus(sessionId, env2);
      return jsonResponse3(status);
    } catch (err) {
      return jsonResponse3({ error: "Status check failed: " + err.message }, 500);
    }
  });
  router.get("/api/sessions/:sessionId/submittal/download", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      const session = await env2.DB.prepare(`
        SELECT user_id, project_name FROM hardware_extraction_sessions WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const outputKey = `submittals/${sessionId}/final_submittal.pdf`;
      const pdfObject = await env2.UPLOADS.get(outputKey);
      if (!pdfObject) {
        return jsonResponse3({
          error: "Submittal not found. Please run assembly first.",
          assembleUrl: `/api/sessions/${sessionId}/assemble`
        }, 404);
      }
      const pdfBytes = await pdfObject.arrayBuffer();
      const filename = `${(session.project_name || "submittal").replace(/[^a-zA-Z0-9]/g, "_")}_submittal.pdf`;
      return new Response(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBytes.byteLength.toString()
        }
      });
    } catch (err) {
      console.error(`[Download] Error: ${err.message}`);
      return jsonResponse3({ error: "Download failed: " + err.message }, 500);
    }
  });
}
