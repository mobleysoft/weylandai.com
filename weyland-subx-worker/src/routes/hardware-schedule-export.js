// src/routes/hardware-schedule-export.js
//
// Real, narrow job: export a session's hardware schedule (CSV download +
// R2-stored export) and the door-index read view (door<->hardware-set
// cross-reference with conflict detection). Extracted 2026-09-09 from
// legacy-monolith.js (verified lines 151467-151800 at HEAD 8b874aa) -
// this is the `hardware-schedule-export.js` module
// WORKER_MODULARIZATION_MAP.md already scoped, and the first real piece of
// the larger hardware-schedule cluster to come out. That cluster is
// genuinely large (~10,000 lines, ~33 routes) and the map itself flags real
// internal coupling between its extract/candidates/page-review/export/
// affirm/submittal stages - this pass deliberately extracts only the
// export+door-index piece (the one this session already has the deepest,
// freshest context on, from fixing the ArrayBuffer-detachment bug and
// adding the `verified` field to door-index earlier today), not the whole
// cluster at once. The rest remains real, tracked, follow-up work - see
// WORKER_MODULARIZATION_MAP.md section 6 for the proposed order.
//
// Real, confirmed boundary: this range's only external dependencies are
// authenticate/jsonResponse3 (both already have clean lib/ homes) - grep
// confirmed zero references to PRODUCT_DATABASE/MFR_CODE_MAP or any other
// CPS/cut-sheet-cluster state, despite sitting textually adjacent to
// PRODUCT_DATABASE's ~9,000-line definition in the original file. The two
// route-adjacent helpers (generateHardwareScheduleCSV, escapeCSV) travel
// with this extraction since the export route is their only real caller.
//
// This file does not touch the ambient `cors` var the map flags as a real
// modularization blocker (§2/§5/§6) - verified: no reference to `cors`
// anywhere in the extracted range.

import { authenticate } from "../lib/auth.js";
import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Registers the hardware-schedule export + door-index routes on the
 * shared router.
 *
 * @param {object} router - the app's NativeRouter instance (still
 *   constructed in legacy-monolith.js for this phase).
 */
export function registerHardwareScheduleExportRoutes(router) {
router.post("/api/hardware-schedule/session/:sessionId/extract-door-schedule", async (request2, env2) => {
  return jsonResponse3({
    error: "ENDPOINT_DEPRECATED",
    message: "extract-door-schedule (Path B) is deprecated. Use extract-affirmed or batch-extract (Path C) instead.",
    migration: "POST /api/hardware-schedule/session/:sessionId/extract-affirmed",
    deprecated_at: "2026-02-12",
    archive: "ARCHIVE_2026-02-12_PathA_PathB_LegacyExtraction.txt"
  }, 410);
});
router.get("/api/hardware-schedule/session/:sessionId/export", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    console.log(`[Hardware Export] Exporting session ${sessionId}`);
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    let hardwareData = [];
    try {
      const affirmedSets = await env2.DB.prepare(`
        SELECT
          hs.set_number,
          hs.set_name,
          hs.door_location,
          hs.notes as set_notes,
          hc.component_type,
          hc.quantity,
          hc.manufacturer,
          hc.model,
          hc.catalog_number,
          hc.finish,
          hc.function_code,
          hc.ansi_bhma_grade,
          hc.fire_rating_minutes
        FROM hardware_sets hs
        LEFT JOIN hardware_components hc ON hc.set_id = hs.id
        WHERE hs.session_id = ?
        ORDER BY hs.set_number, hc.sequence_order, hc.component_type
      `).bind(sessionId).all();
      if (affirmedSets.results && affirmedSets.results.length > 0) {
        console.log(`[Hardware Export] Using ${affirmedSets.results.length} rows from affirmed relational tables`);
        hardwareData = affirmedSets.results;
      }
    } catch (relationalError) {
      console.log(`[Hardware Export] Relational query failed, falling back to JSON: ${relationalError.message}`);
    }
    if (hardwareData.length === 0) {
      console.log(`[Hardware Export] No affirmed data found, using extraction JSON`);
      const extractions = await env2.DB.prepare(`
        SELECT page_number, extracted_data
        FROM hardware_page_extractions
        WHERE session_id = ?
        ORDER BY page_number ASC
      `).bind(sessionId).all();
      if (!extractions.results || extractions.results.length === 0) {
        return jsonResponse3({ error: "No hardware data found for this session. Please extract pages first." }, 404);
      }
      for (const extraction of extractions.results) {
        if (!extraction.extracted_data)
          continue;
        try {
          const data = JSON.parse(extraction.extracted_data);
          const groups = data.hardware_groups || data.hardwareGroups || data.hardware_sets || [];
          for (const group3 of groups) {
            const components = group3.components || [];
            if (components.length === 0) {
              hardwareData.push({
                set_number: group3.group_number || group3.set_number || "",
                description: group3.group_name || group3.description || "",
                keying_system: group3.keying_system || group3.keying || "",
                function_type: group3.function_type || group3.door_function || "",
                component_type: "",
                quantity: "",
                manufacturer_code: "",
                model_number: "",
                component_description: "",
                finish_code: "",
                finish_description: "",
                unit_price: null,
                compliance: "",
                set_notes: group3.notes || "",
                _source_page: extraction.page_number
              });
            } else {
              for (const comp of components) {
                hardwareData.push({
                  set_number: group3.group_number || group3.set_number || "",
                  description: group3.group_name || group3.description || "",
                  keying_system: group3.keying_system || group3.keying || "",
                  function_type: group3.function_type || group3.door_function || "",
                  component_type: comp.component_type || comp.type || "",
                  quantity: comp.quantity || 1,
                  manufacturer_code: comp.manufacturer || comp.manufacturer_code || "",
                  model_number: comp.model || comp.model_number || "TBD",
                  component_description: comp.description || "",
                  finish_code: comp.finish || comp.finish_code || "",
                  finish_description: comp.finish_description || "",
                  unit_price: comp.unit_price || null,
                  compliance: comp.compliance || "",
                  component_notes: comp.notes || "",
                  _source_page: extraction.page_number
                });
              }
            }
          }
        } catch (parseError) {
          console.warn(`[Hardware Export] Failed to parse extraction for page ${extraction.page_number}:`, parseError);
        }
      }
      console.log(`[Hardware Export] Extracted ${hardwareData.length} rows from JSON`);
    }
    if (hardwareData.length === 0) {
      return jsonResponse3({ error: "No hardware data found for this session" }, 404);
    }
    const acceptHeader = request2.headers.get("Accept") || "";
    if (acceptHeader.includes("application/json")) {
      const setsMap = /* @__PURE__ */ new Map();
      for (const row of hardwareData) {
        const setNum = String(row.set_number || "");
        if (!setsMap.has(setNum)) {
          setsMap.set(setNum, { set_number: setNum, components: [] });
        }
        setsMap.get(setNum).components.push({
          component_type: row.component_type || "",
          quantity: row.quantity,
          manufacturer_code: row.manufacturer_code || row.manufacturer || "",
          model_number: row.model_number || row.model || row.catalog_number || "",
          component_description: row.component_description || "",
          finish_description: row.finish_description || row.finish || "",
          compliance: row.compliance || row.ansi_bhma_grade || "",
          fire_rating: row.fire_rating_minutes ? `${row.fire_rating_minutes}min` : "",
          ada_compliant: false,
          unit_price: row.unit_price || null,
          notes: row.component_notes || row.set_notes || ""
        });
      }
      return jsonResponse3({
        session: {
          project_name: session.project_name,
          file_name: session.project_name,
          created_at: session.created_at
        },
        hardwareSets: Array.from(setsMap.values())
      });
    }
    const csv = generateHardwareScheduleCSV(hardwareData, session);
    const filename = `${session.project_name.replace(/[^a-z0-9]/gi, "_")}_hardware_schedule_${Date.now()}.csv`;
    const outputKey = `exports/${user.userId}/${sessionId}/${filename}`;
    await env2.OUTPUTS.put(outputKey, csv, {
      httpMetadata: {
        contentType: "text/csv",
        contentDisposition: `attachment; filename="${filename}"`
      },
      customMetadata: {
        userId: user.userId,
        sessionId,
        projectName: session.project_name,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    console.log(`[Hardware Export] Exported to R2: ${outputKey}`);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Key": outputKey
      }
    });
  } catch (error5) {
    console.error("[Hardware Export] Error:", error5);
    return jsonResponse3({
      error: "Failed to export hardware schedule",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/door-index", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    console.log(`[Door Index] Getting door index for session ${sessionId}`);
    // verified added 2026-09-09: this column already existed on
    // door_hardware_matrix (real match-confirmed vs. pending-review state)
    // but was never selected here, so no consumer of this endpoint - real
    // or the new landing-page redesign - could distinguish MATCHED from
    // PENDING without a second request. Real data the schema already had,
    // just not exposed.
    const doorMappings = await env2.DB.prepare(`
      SELECT
        door_number,
        door_location,
        door_type,
        hardware_set_number,
        source_page,
        source_type,
        extraction_confidence,
        verified,
        created_at
      FROM door_hardware_matrix
      WHERE session_id = ?
      ORDER BY hardware_set_number, door_number
    `).bind(sessionId).all();
    const byHardwareSet = {};
    const byDoor = {};
    for (const mapping of doorMappings.results) {
      const setNum = mapping.hardware_set_number;
      const doorNum = mapping.door_number;
      if (!byHardwareSet[setNum]) {
        byHardwareSet[setNum] = [];
      }
      byHardwareSet[setNum].push({
        door_number: doorNum,
        door_location: mapping.door_location,
        door_type: mapping.door_type,
        source_page: mapping.source_page,
        source_type: mapping.source_type,
        confidence: mapping.extraction_confidence,
        verified: !!mapping.verified
      });
      if (!byDoor[doorNum]) {
        byDoor[doorNum] = [];
      }
      byDoor[doorNum].push({
        hardware_set: setNum,
        verified: !!mapping.verified,
        source_page: mapping.source_page,
        source_type: mapping.source_type,
        confidence: mapping.extraction_confidence
      });
    }
    const totalMappings = doorMappings.results.length;
    const uniqueDoors = Object.keys(byDoor).length;
    const uniqueSets = Object.keys(byHardwareSet).length;
    const bylineCount = doorMappings.results.filter((m) => m.source_type === "byline").length;
    const matrixCount = doorMappings.results.filter((m) => m.source_type === "extracted").length;
    const conflicts = [];
    for (const [doorNum, sets] of Object.entries(byDoor)) {
      const uniqueSetsForDoor = [...new Set(sets.map((s) => s.hardware_set))];
      if (uniqueSetsForDoor.length > 1) {
        conflicts.push({
          door_number: doorNum,
          hardware_sets: uniqueSetsForDoor,
          sources: sets
        });
      }
    }
    console.log(`[Door Index] Found ${totalMappings} mappings: ${bylineCount} byline, ${matrixCount} matrix, ${conflicts.length} conflicts`);
    return jsonResponse3({
      success: true,
      sessionId,
      statistics: {
        total_mappings: totalMappings,
        unique_doors: uniqueDoors,
        unique_hardware_sets: uniqueSets,
        byline_mappings: bylineCount,
        matrix_mappings: matrixCount,
        conflicts: conflicts.length
      },
      by_hardware_set: byHardwareSet,
      by_door: byDoor,
      conflicts
    });
  } catch (error5) {
    console.error("[Door Index] Error:", error5);
    return jsonResponse3({
      error: "Failed to get door index",
      details: error5.message
    }, 500);
  }
});
function generateHardwareScheduleCSV(hardwareData, session) {
  const headers = [
    "Set Number",
    "Set Description",
    "Keying System",
    "Function Type",
    "Component Type",
    "Quantity",
    "Manufacturer",
    "Model Number",
    "Component Description",
    "Finish Code",
    "Finish Description",
    "Unit Price",
    "Compliance",
    "Notes"
  ];
  const rows = [headers];
  for (const item of hardwareData) {
    rows.push([
      escapeCSV(item.set_number || ""),
      escapeCSV(item.description || ""),
      escapeCSV(item.keying_system || ""),
      escapeCSV(item.function_type || ""),
      escapeCSV(item.component_type || ""),
      item.quantity || "",
      escapeCSV(item.manufacturer_code || ""),
      escapeCSV(item.model_number || "TBD"),
      escapeCSV(item.component_description || ""),
      escapeCSV(item.finish_code || ""),
      escapeCSV(item.finish_description || ""),
      item.unit_price ? `$${item.unit_price.toFixed(2)}` : "",
      escapeCSV(item.compliance || ""),
      escapeCSV(item.component_notes || item.set_notes || "")
    ]);
  }
  rows.push([]);
  rows.push(["Project:", escapeCSV(session.project_name)]);
  rows.push(["Exported:", (/* @__PURE__ */ new Date()).toISOString()]);
  rows.push(["Total Sets:", new Set(hardwareData.map((d) => d.set_number)).size]);
  rows.push(["Total Components:", hardwareData.filter((d) => d.component_type).length]);
  return rows.map((row) => row.join(",")).join("\n");
}
function escapeCSV(field) {
  if (field === null || field === void 0)
    return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
}
