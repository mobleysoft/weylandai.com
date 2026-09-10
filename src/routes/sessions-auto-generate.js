import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, generateId3: Function, extractPdfBookmarks2: Function, extractSinglePage: Function }} deps
 */
export function registerSessionsAutoGenerateRoutes(router, { authenticate, generateId3, extractPdfBookmarks2, extractSinglePage }) {
  router.post("/api/sessions/auto-generate", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const startTime = Date.now();
    console.log(`[ZERO-TOUCH] Starting auto-generate for user ${user.userId}`);
    try {
      const formData = await request2.formData();
      const file = formData.get("file");
      const projectName = formData.get("projectName") || "Auto-Generated Submittal";
      const tenantId = formData.get("tenant_id") || (request2?.user?.tenant_id || "ven_weyland");
      if (!file) {
        return jsonResponse3({ error: "No file uploaded" }, 400);
      }
      if (file.type !== "application/pdf") {
        return jsonResponse3({ error: "File must be a PDF" }, 400);
      }
      const filename = file.name;
      const pdfBuffer = await file.arrayBuffer();
      const pdfSizeMB = (pdfBuffer.byteLength / 1024 / 1024).toFixed(2);
      console.log(`[ZERO-TOUCH] Received PDF: ${filename} (${pdfSizeMB}MB)`);
      const sessionId = generateId3("auto");
      const r2Key = `submittals/${sessionId}/${filename}`;
      await env2.UPLOADS.put(r2Key, pdfBuffer, {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: {
          sessionId,
          userId: user.userId,
          projectName,
          autoGenerate: "true",
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      console.log(`[ZERO-TOUCH] Stored PDF in R2: ${r2Key}`);
      let totalPages = 1;
      let documentOutline = null;
      try {
        const pdfInfo = await extractPdfBookmarks2(pdfBuffer);
        totalPages = pdfInfo.numPages;
        documentOutline = pdfInfo.bookmarks;
        console.log(`[ZERO-TOUCH] PDF has ${totalPages} pages`);
      } catch (e) {
        console.warn(`[ZERO-TOUCH] Could not get page count: ${e.message}`);
      }
      let industryId = "ind_doors";
      try {
        const tenantResult = await env2.DB.prepare(`
          SELECT industry_id FROM tenants WHERE id = ? AND active = 1
        `).bind(tenantId).first();
        if (tenantResult?.industry_id) {
          industryId = tenantResult.industry_id;
        }
      } catch (err) {
        console.warn(`[ZERO-TOUCH] Could not lookup tenant industry: ${err.message}`);
      }
      await env2.DB.prepare(`
        INSERT INTO hardware_extraction_sessions (
          id, user_id, project_name, filename, file_buffer_key,
          total_pages, pages_processed, pages_approved,
          status, current_page, total_sets_extracted, total_components_extracted,
          created_at, updated_at, version, tenant_id, industry_id
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'processing', 1, 0, 0, datetime('now'), datetime('now'), 1, ?, ?)
      `).bind(
        sessionId,
        user.userId,
        projectName,
        filename,
        r2Key,
        totalPages,
        tenantId,
        industryId
      ).run();
      try {
        if (tenantId && projectName) {
          const matchedProject = await env2.DB.prepare(
            "SELECT id FROM projects WHERE tenant_id = ? AND name = ? AND status = 'active' LIMIT 1"
          ).bind(tenantId, projectName).first();
          if (matchedProject) {
            await env2.DB.prepare(
              "UPDATE hardware_extraction_sessions SET project_id = ? WHERE id = ?"
            ).bind(matchedProject.id, sessionId).run();
            console.log(`[Auto-Link] Session ${sessionId} linked to project ${matchedProject.id} (exact name match: "${projectName}")`);
          }
        }
      } catch (autoLinkErr) {
        console.warn(`[Auto-Link] Non-fatal error: ${autoLinkErr.message}`);
      }
      console.log(`[ZERO-TOUCH] Starting extraction of ${totalPages} pages...`);
      const allExtractions = [];
      let totalGroups = 0;
      let totalComponents = 0;
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log(`[ZERO-TOUCH] Extracting page ${pageNum}/${totalPages}...`);
        try {
          const extraction = await extractSinglePage(pdfBuffer, pageNum, env2);
          allExtractions.push({
            page: pageNum,
            ...extraction
          });
          const pageGroups = extraction.hardware_groups?.length || 0;
          const pageComponents = extraction.hardware_groups?.reduce(
            (sum2, g) => sum2 + (g.components?.length || 0),
            0
          ) || 0;
          totalGroups += pageGroups;
          totalComponents += pageComponents;
          console.log(`[ZERO-TOUCH] Page ${pageNum}: ${pageGroups} groups, ${pageComponents} components`);
          const pageExtractionId = generateId3("pex");
          await env2.DB.prepare(`
            INSERT INTO hardware_page_extractions (
              id, session_id, page_number, extracted_data, overall_confidence,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'auto_extracted', datetime('now'), datetime('now'))
          `).bind(
            pageExtractionId,
            sessionId,
            pageNum,
            JSON.stringify(extraction),
            85
            // Default confidence for auto-extraction
          ).run();
        } catch (pageError) {
          console.error(`[ZERO-TOUCH] Page ${pageNum} extraction failed:`, pageError.message);
          allExtractions.push({
            page: pageNum,
            error: pageError.message,
            hardware_groups: []
          });
        }
      }
      await env2.DB.prepare(`
        UPDATE hardware_extraction_sessions
        SET pages_processed = ?, total_sets_extracted = ?, total_components_extracted = ?,
            status = 'extracted', updated_at = datetime('now')
        WHERE id = ?
      `).bind(totalPages, totalGroups, totalComponents, sessionId).run();
      console.log(`[ZERO-TOUCH] Extraction complete: ${totalGroups} groups, ${totalComponents} components`);
      const cutSheetMatches = [];
      const sampleCutSheets = {
        "PEMKO": { name: "Pemko Cut Sheet", file: "sample_pemko.pdf" },
        "ADAMS RITE": { name: "Adams Rite Cut Sheet", file: "sample_adams_rite.pdf" },
        "RIXSON": { name: "Rixson Cut Sheet", file: "sample_rixson.pdf" },
        "SECURITRON": { name: "Securitron Cut Sheet", file: "sample_securitron.pdf" },
        "ROCKWOOD": { name: "Rockwood Cut Sheet", file: "sample_rockwood.pdf" },
        "LCN": { name: "LCN Cut Sheet", file: "sample_lcn.pdf" },
        "SCHLAGE": { name: "Schlage Cut Sheet", file: "sample_schlage.pdf" },
        "VON DUPRIN": { name: "Von Duprin Cut Sheet", file: "sample_von_duprin.pdf" },
        "DORMA": { name: "Dorma Cut Sheet", file: "sample_dorma.pdf" },
        "STANLEY": { name: "Stanley Cut Sheet", file: "sample_stanley.pdf" }
      };
      const matchedManufacturers = /* @__PURE__ */ new Set();
      for (const extraction of allExtractions) {
        for (const group3 of extraction.hardware_groups || []) {
          for (const comp of group3.components || []) {
            const mfr = (comp.manufacturer || comp.manufacturer_code || "").toUpperCase();
            for (const [key, sheet] of Object.entries(sampleCutSheets)) {
              if (mfr.includes(key)) {
                matchedManufacturers.add(key);
              }
            }
          }
        }
      }
      for (const mfr of matchedManufacturers) {
        cutSheetMatches.push({
          manufacturer: mfr,
          ...sampleCutSheets[mfr],
          matchType: "manufacturer_name",
          status: "placeholder"
          // Real cut sheets not yet attached
        });
      }
      console.log(`[ZERO-TOUCH] Matched ${cutSheetMatches.length} manufacturers to cut sheets`);
      const duration = Date.now() - startTime;
      let autoVendorName = "Weyland by Weyland (Auto-Generated)";
      if (user && user.tenantId) {
        const vp = await env2.DB.prepare(
          "SELECT company_name FROM vendor_profile WHERE tenant_id = ?"
        ).bind(user.tenantId).first();
        if (vp?.company_name)
          autoVendorName = vp.company_name + " (Auto-Generated)";
      }
      const submittalPackage = {
        success: true,
        sessionId,
        projectName,
        filename,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        processingTime: {
          totalMs: duration,
          totalSeconds: (duration / 1e3).toFixed(2)
        },
        summary: {
          totalPages,
          pagesWithData: allExtractions.filter((e) => (e.hardware_groups?.length || 0) > 0).length,
          totalHardwareGroups: totalGroups,
          totalComponents,
          cutSheetsMatched: cutSheetMatches.length,
          status: totalGroups > 0 ? "complete" : "no_hardware_found"
        },
        hardwareSchedule: allExtractions.map((e) => ({
          page: e.page,
          groups: e.hardware_groups || [],
          extractionMode: e.metadata?.extraction_mode || "direct_pdf",
          error: e.error || null
        })),
        cutSheets: cutSheetMatches,
        pdfManifest: {
          coverPage: {
            title: "HARDWARE SCHEDULE SUBMITTAL",
            project: projectName,
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            preparedBy: autoVendorName
          },
          sections: [
            { type: "toc", title: "Table of Contents" },
            { type: "schedule", title: "Hardware Schedule", pages: totalPages },
            ...cutSheetMatches.map((sheet, idx) => ({
              type: "cut_sheet",
              title: sheet.name,
              manufacturer: sheet.manufacturer,
              order: idx + 1,
              status: sheet.status
            }))
          ]
        },
        nextSteps: {
          reviewUrl: `https://weylandai.com/subx.html?session=${sessionId}`,
          message: totalGroups > 0 ? `Extracted ${totalGroups} hardware groups with ${totalComponents} components. Review and affirm in the UI.` : "No hardware groups found. The document may not be a hardware schedule."
        }
      };
      console.log(`[ZERO-TOUCH] Complete! Generated submittal in ${(duration / 1e3).toFixed(2)}s`);
      return jsonResponse3(submittalPackage, 201);
    } catch (error5) {
      console.error("[ZERO-TOUCH] Error:", error5);
      return jsonResponse3({
        error: "Failed to auto-generate submittal",
        details: error5.message
      }, 500);
    }
  });
}
