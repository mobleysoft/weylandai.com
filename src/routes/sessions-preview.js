import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerSessionsPreviewRoutes(router, { authenticate }) {
  router.get("/api/sessions/:sessionId/preview", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      const url = new URL(request2.url);
      const groupFilter = url.searchParams.get("group");
      const session = await env2.DB.prepare(
        "SELECT id, project_name, filename, source_type, created_at, user_id, total_pages FROM hardware_extraction_sessions WHERE id = ?"
      ).bind(sessionId).first();
      if (!session)
        return jsonResponse3({ error: "Session not found" }, 404);
      if (session.user_id !== user.userId)
        return jsonResponse3({ error: "Unauthorized" }, 403);
      const pages = await env2.DB.prepare(
        "SELECT page_number, extracted_data, affirm_state FROM hardware_page_extractions WHERE session_id = ? ORDER BY page_number"
      ).bind(sessionId).all();
      const auditEntries = await env2.DB.prepare(
        "SELECT entity_type, entity_id, action, entity_snapshot, created_at FROM affirm_audit_log WHERE session_id = ? AND action = 'affirm' ORDER BY created_at DESC"
      ).bind(sessionId).all();
      const affirmSnapshots = {};
      for (const entry of auditEntries.results || []) {
        if (!affirmSnapshots[entry.entity_id]) {
          try {
            affirmSnapshots[entry.entity_id] = {
              entity_type: entry.entity_type,
              snapshot: entry.entity_snapshot ? JSON.parse(entry.entity_snapshot) : null,
              affirmed_at: entry.created_at
            };
          } catch (e) {
            console.warn("[Preview] Failed to parse entity_snapshot for", entry.entity_id);
          }
        }
      }
      const cpsSessionAffirms = await env2.DB.prepare(
        `SELECT al.mapping_id, al.new_state, al.timestamp,
                pm.catalogue_id, pm.model, pm.manufacturer, pm.page_start, pm.page_end, pm.confidence, pm.affirmed_at,
                c.title as catalogue_title, c.manufacturer as catalogue_manufacturer
         FROM affirmation_log al
         JOIN product_mappings pm ON al.mapping_id = pm.mapping_id
         JOIN catalogues c ON pm.catalogue_id = c.catalogue_id
         WHERE al.action = 'affirmed' AND al.notes LIKE ?`
      ).bind("%in session " + sessionId + "%").all();
      const directCutSheetMap = {};
      const seenMappings = {};
      for (const row of cpsSessionAffirms.results || []) {
        try {
          const state = row.new_state ? JSON.parse(row.new_state) : null;
          if (state && state.group_number !== void 0 && state.component_index !== void 0) {
            const directKey2 = "group" + state.group_number + "_comp" + state.component_index;
            const dedupeKey = directKey2 + "_" + row.mapping_id;
            if (seenMappings[dedupeKey])
              continue;
            seenMappings[dedupeKey] = true;
            if (!directCutSheetMap[directKey2])
              directCutSheetMap[directKey2] = [];
            directCutSheetMap[directKey2].push({
              mapping_id: row.mapping_id,
              catalogue_id: row.catalogue_id,
              catalogue_title: row.catalogue_title || row.catalogue_manufacturer || "Cut Sheet",
              manufacturer: row.manufacturer || row.catalogue_manufacturer || "",
              model: row.model,
              page_start: row.page_start,
              page_end: row.page_end,
              confidence: row.confidence,
              affirmed_at: row.affirmed_at || row.timestamp,
              render_url: "/api/cps/catalogues/" + row.catalogue_id + "/pages/" + row.page_start + "/render"
            });
          }
        } catch (e) {
          console.warn("[Preview] Failed to parse CPS affirmation_log new_state for mapping", row.mapping_id);
        }
      }
      console.log("[Preview] CPS cut sheets: " + (cpsSessionAffirms.results || []).length + " affirm log entries, " + Object.keys(directCutSheetMap).length + " component associations (direct only, no fuzzy)");
      const cutSheetMatches = await env2.DB.prepare(
        "SELECT scm.cut_sheet_id, scm.matched_manufacturer, scm.matched_model, scm.match_type, scm.confidence, scm.status, pd.document_title, pd.r2_object_key, pd.r2_bucket, pd.document_url FROM session_cut_sheet_matches scm LEFT JOIN product_documents pd ON scm.cut_sheet_id = pd.id WHERE scm.session_id = ?"
      ).bind(sessionId).all();
      const cutSheets = cutSheetMatches.results || [];
      let totalGroups = 0;
      let affirmedGroups = 0;
      let totalComponents = 0;
      let affirmedComponents = 0;
      const groups = [];
      for (const page of pages.results || []) {
        const extractedData = JSON.parse(page.extracted_data || "{}");
        const affirmState = JSON.parse(page.affirm_state || '{"groups":[]}');
        const hwGroups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
        for (let gIdx = 0; gIdx < hwGroups.length; gIdx++) {
          const group3 = hwGroups[gIdx];
          const groupNumber = group3.group_number || group3.groupNumber || String(gIdx + 1);
          if (groupFilter && String(groupNumber) !== String(groupFilter))
            continue;
          const groupAffirm = affirmState.groups?.[gIdx] || {};
          const groupEntityId = "page" + page.page_number + "_group" + gIdx;
          const isGroupAffirmed = groupAffirm.affirmed === true;
          totalGroups++;
          const rawComponents = group3.components || [];
          const compiledComponents = [];
          for (let cIdx = 0; cIdx < rawComponents.length; cIdx++) {
            const compEntityId = "page" + page.page_number + "_group" + gIdx + "_comp" + cIdx;
            const compAffirm = groupAffirm.components?.[cIdx] || {};
            const isCompAffirmed = compAffirm.affirmed === true;
            totalComponents++;
            if (isCompAffirmed)
              affirmedComponents++;
            const src = isCompAffirmed && affirmSnapshots[compEntityId]?.snapshot ? affirmSnapshots[compEntityId].snapshot : rawComponents[cIdx];
            var directKey = "group" + groupNumber + "_comp" + cIdx;
            var compCutSheets = directCutSheetMap[directKey] || [];
            compiledComponents.push({
              index: cIdx,
              entity_id: compEntityId,
              affirmed: isCompAffirmed,
              affirmed_at: isCompAffirmed ? compAffirm.affirmed_at || affirmSnapshots[compEntityId]?.affirmed_at || null : null,
              type: src.type || src.component_type || "Unknown",
              manufacturer: src.manufacturer || src.manufacturer_code || "",
              model: src.model || src.model_number || "",
              finish: src.finish || "",
              quantity: src.quantity || 1,
              uom: src.uom || "EA",
              notes: src.notes || "",
              compliance: src.compliance || "",
              cut_sheets: compCutSheets
            });
          }
          const allCompsAffirmed = compiledComponents.length > 0 && compiledComponents.every(function(c) {
            return c.affirmed;
          });
          if (isGroupAffirmed || allCompsAffirmed)
            affirmedGroups++;
          const gSrc = isGroupAffirmed && affirmSnapshots[groupEntityId]?.snapshot ? affirmSnapshots[groupEntityId].snapshot : group3;
          groups.push({
            page_number: page.page_number,
            group_index: gIdx,
            group_number: groupNumber,
            group_name: gSrc.group_name || gSrc.groupName || "Hardware Group " + groupNumber,
            door_marks: gSrc.door_marks || gSrc.doors || gSrc.door_list || gSrc.doorMarks || [],
            keying_system: gSrc.keying_system || gSrc.keyingSystem || null,
            affirmed: isGroupAffirmed,
            affirmed_at: isGroupAffirmed ? groupAffirm.affirmed_at || affirmSnapshots[groupEntityId]?.affirmed_at || null : null,
            components: compiledComponents,
            component_count: compiledComponents.length,
            affirmed_component_count: compiledComponents.filter((c) => c.affirmed).length
          });
        }
      }
      console.log("[Preview] Session " + sessionId + ": " + groups.length + " groups, " + affirmedComponents + "/" + totalComponents + " components affirmed" + (groupFilter ? " (filtered: group " + groupFilter + ")" : ""));
      return jsonResponse3({
        session_meta: {
          session_id: sessionId,
          project_name: session.project_name || "Hardware Submittal Package",
          filename: session.filename,
          source_type: session.source_type,
          total_pages: session.total_pages,
          created_at: session.created_at
        },
        groups,
        cut_sheet_matches: cutSheets.map(function(cs) {
          return {
            cut_sheet_id: cs.cut_sheet_id,
            manufacturer: cs.matched_manufacturer,
            model: cs.matched_model,
            match_type: cs.match_type,
            confidence: cs.confidence,
            status: cs.status,
            document_title: cs.document_title,
            download_url: cs.cut_sheet_id ? "/api/cut-sheets/download/" + cs.cut_sheet_id : null
          };
        }),
        affirm_summary: {
          total_groups: totalGroups,
          affirmed_groups: affirmedGroups,
          total_components: totalComponents,
          affirmed_components: affirmedComponents,
          all_affirmed: totalGroups > 0 && affirmedGroups === totalGroups
        },
        scope: groupFilter ? "group" : "full",
        group_filter: groupFilter || null
      });
    } catch (err) {
      console.error("[Preview] Error:", err);
      return jsonResponse3({ error: "Failed to compile preview", details: err.message }, 500);
    }
  });
}
