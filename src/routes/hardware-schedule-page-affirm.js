// src/routes/hardware-schedule-page-affirm.js
//
// Page-level component/group affirm workflow: affirm or unaffirm an
// individual component or group on a page (materializing/un-materializing
// it into real hardware_sets/hardware_components rows as it's affirmed),
// delete a stale primary/secondary extraction, manually draw+extract a
// region on a page, replace a group's data outright, and affirm every
// group/component on a page in one call. Extracted 2026-09-10 from
// legacy-monolith.js (previously inline, lines 150490-151190).
//
// validateComponentForAffirm has both its call sites inside this file's
// own routes, so it stays local/private here.
//
// Six real shared cluster-wide helpers stay injected dependencies
// rather than being extracted themselves, same reasoning as every prior
// piece of this cluster - each has real call sites outside this file's
// scope (in routes not yet extracted): extractFromPageImage,
// materializeAffirmedGroup, unaffirmMaterializedGroup, pdfBufferOrNull,
// generateR2StreamUrl, isPageInRange, renderRegionAt600DPI2.
// enrichComponentsWithPricing is a real top-level import from
// lib/pricing.js (already extracted this session); getSessionStatus
// continues the pattern established in hardware-schedule-candidates.js.

import { jsonResponse3 } from "../lib/json-response.js";
import { enrichComponentsWithPricing } from "../lib/pricing.js";

function validateComponentForAffirm(comp) {
  const errors = [];
  if (!comp.type && !comp.component_type)
    errors.push("Component type is required");
  if (!comp.manufacturer && !comp.manufacturer_code)
    errors.push("Manufacturer is required");
  return errors;
}

export function registerHardwareSchedulePageAffirmRoutes(router, {
  authenticate,
  getSessionStatus,
  extractFromPageImage,
  materializeAffirmedGroup,
  unaffirmMaterializedGroup,
  pdfBufferOrNull,
  generateR2StreamUrl,
  isPageInRange,
  renderRegionAt600DPI2,
}) {
router.patch("/api/hardware-schedule/session/:sessionId/page/:pageNum/component/:componentIndex/affirm", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum, componentIndex } = request2.params;
    const _ownC = await env2.DB.prepare("SELECT id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?").bind(sessionId, user.userId).first();
    if (!_ownC)
      return jsonResponse3({ error: "Session not found" }, 404);
    const body = await request2.json().catch(() => ({}));
    const { groupIndex, affirmed, componentData, groupData } = body;
    const pageNumber = parseInt(pageNum);
    let page = await env2.DB.prepare(`
      SELECT id, extracted_data, affirm_state, previous_extracted_data
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNumber).first();
    if (page && page.previous_extracted_data) {
      return jsonResponse3({
        error: "Dual extractions exist. Delete one before affirming.",
        dual_extraction: true
      }, 409);
    }
    if (!page) {
      console.log(`[Component Affirm] Page ${pageNumber} not found, creating row for session ${sessionId}`);
      const initialExtractedData = {
        hardware_groups: [],
        page_number: pageNumber,
        created_via: "affirm_bootstrap"
      };
      if (groupData) {
        const bootstrapGroup = {
          group_number: groupData.group_number || String(groupIndex),
          group_name: groupData.group_name || "",
          components: []
        };
        if (componentData) {
          bootstrapGroup.components.push({
            ...componentData,
            sequence_order: parseInt(componentIndex)
          });
        }
        initialExtractedData.hardware_groups.push(bootstrapGroup);
      }
      const newPageId = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT INTO hardware_page_extractions (
          id, session_id, page_number, extracted_data, affirm_state,
          overall_confidence, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '{"groups":[]}', 0.0, 'affirm_bootstrap', datetime('now'), datetime('now'))
      `).bind(newPageId, sessionId, pageNumber, JSON.stringify(initialExtractedData)).run();
      console.log(`[Component Affirm] Created page row ${newPageId} for page ${pageNumber}`);
      page = await env2.DB.prepare(`
        SELECT id, extracted_data, affirm_state
        FROM hardware_page_extractions
        WHERE id = ?
      `).bind(newPageId).first();
    }
    const extractedData = JSON.parse(page.extracted_data || "{}");
    let affirmState = JSON.parse(page.affirm_state || '{"groups":[]}');
    const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
    const cIdx = parseInt(componentIndex);
    let group3 = null;
    let gIdx = -1;
    const groupNumStr = String(groupIndex);
    for (let i = 0; i < groups.length; i++) {
      if (String(groups[i].group_number) === groupNumStr) {
        group3 = groups[i];
        gIdx = i;
        break;
      }
    }
    if (!group3) {
      gIdx = parseInt(groupIndex) || 0;
      if (gIdx < groups.length) {
        group3 = groups[gIdx];
      }
    }
    if (!group3 && groupData) {
      console.log(`[Component Affirm] Group not in extracted_data, using provided groupData`);
      group3 = {
        group_number: groupData.group_number || groupNumStr,
        group_name: groupData.group_name || "",
        components: componentData ? [componentData] : []
      };
      gIdx = 0;
    }
    if (!group3) {
      return jsonResponse3({ error: "Group not found", groupIndex, availableGroups: groups.map((g) => g.group_number) }, 404);
    }
    const components = group3.components || [];
    let component = components[cIdx];
    if (!component && componentData) {
      console.log(`[Component Affirm] Component not in extracted_data, using provided componentData`);
      component = componentData;
    }
    if (!component) {
      return jsonResponse3({ error: "Component not found" }, 404);
    }
    if (affirmed === true) {
      const validationErrors = validateComponentForAffirm(component);
      if (validationErrors.length > 0) {
        return jsonResponse3({
          error: "Cannot affirm component",
          validationErrors,
          message: "Component has empty or invalid required fields"
        }, 400);
      }
      if (component.flagged) {
        return jsonResponse3({
          error: "Cannot affirm flagged component",
          message: "Remove the flag before affirming"
        }, 400);
      }
    }
    if (!affirmState.groups)
      affirmState.groups = [];
    const groupNumber = group3.group_number || groupNumStr;
    let groupAffirm = affirmState.groups.find((g) => g.group_number === groupNumber);
    if (!groupAffirm) {
      groupAffirm = { group_number: groupNumber, affirmed: false, components: [] };
      affirmState.groups.push(groupAffirm);
    }
    if (!groupAffirm.components)
      groupAffirm.components = [];
    let compAffirm = groupAffirm.components.find((c) => c.index === cIdx);
    if (!compAffirm) {
      compAffirm = { index: cIdx, affirmed: false };
      groupAffirm.components.push(compAffirm);
    }
    const previousState = compAffirm.affirmed;
    compAffirm.affirmed = affirmed === true;
    compAffirm.affirmed_at = affirmed ? (/* @__PURE__ */ new Date()).toISOString() : null;
    compAffirm.affirmed_by = affirmed ? user.userId : null;
    if (!affirmed && groupAffirm.affirmed) {
      groupAffirm.affirmed = false;
      groupAffirm.affirmed_at = null;
      groupAffirm.affirmed_by = null;
    }
    await env2.DB.prepare(`
      UPDATE hardware_page_extractions
      SET affirm_state = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(affirmState), (/* @__PURE__ */ new Date()).toISOString(), page.id).run();
    await env2.DB.prepare(`
      INSERT INTO affirm_audit_log (id, session_id, entity_type, entity_id, action, user_id, user_email, entity_snapshot, created_at)
      VALUES (?, ?, 'component', ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sessionId,
      `page${pageNum}_group${gIdx}_comp${cIdx}`,
      affirmed ? "affirm" : "unaffirm",
      user.userId,
      user.email,
      JSON.stringify(component),
      (/* @__PURE__ */ new Date()).toISOString()
    ).run().catch((e) => console.warn("[Affirm Audit] Log failed:", e.message));
    return jsonResponse3({
      success: true,
      component: {
        pageNumber: parseInt(pageNum),
        groupIndex: gIdx,
        componentIndex: cIdx,
        type: component.type || component.component_type,
        affirmed: compAffirm.affirmed,
        previousState
      }
    });
  } catch (error5) {
    console.error("[Component Affirm] Error:", error5);
    return jsonResponse3({ error: "Failed to update affirm state", details: error5.message }, 500);
  }
});
router.patch("/api/hardware-schedule/session/:sessionId/page/:pageNum/group/:groupIndex/affirm", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum, groupIndex } = request2.params;
    const _ownG = await env2.DB.prepare("SELECT id FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?").bind(sessionId, user.userId).first();
    if (!_ownG)
      return jsonResponse3({ error: "Session not found" }, 404);
    const body = await request2.json().catch(() => ({}));
    const { affirmed } = body;
    const page = await env2.DB.prepare(`
      SELECT id, extracted_data, affirm_state, previous_extracted_data
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, parseInt(pageNum)).first();
    if (!page) {
      return jsonResponse3({ error: "Page not found" }, 404);
    }
    if (page.previous_extracted_data) {
      return jsonResponse3({
        error: "Dual extractions exist. Delete one before affirming.",
        dual_extraction: true
      }, 409);
    }
    const extractedData = JSON.parse(page.extracted_data || "{}");
    let affirmState = JSON.parse(page.affirm_state || '{"groups":[]}');
    const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
    let group3 = null;
    let gIdx = -1;
    const groupNumStr = String(groupIndex);
    for (let i = 0; i < groups.length; i++) {
      if (String(groups[i].group_number) === groupNumStr) {
        group3 = groups[i];
        gIdx = i;
        break;
      }
    }
    if (!group3) {
      gIdx = parseInt(groupIndex) || 0;
      if (gIdx < groups.length) {
        group3 = groups[gIdx];
      }
    }
    if (!group3) {
      return jsonResponse3({ error: "Group not found", groupIndex, availableGroups: groups.map((g) => g.group_number) }, 404);
    }
    const components = group3.components || [];
    if (!affirmState.groups)
      affirmState.groups = [];
    let groupAffirm = affirmState.groups.find((g) => g.group_number === group3.group_number);
    if (!groupAffirm) {
      groupAffirm = { group_number: group3.group_number, affirmed: false, components: [] };
      affirmState.groups.push(groupAffirm);
    }
    if (affirmed === true) {
      if (!group3.group_number && !group3.groupNumber) {
        return jsonResponse3({
          error: "Cannot affirm group",
          message: "Group number is required"
        }, 400);
      }
      const unaffirmedComponents = [];
      for (let i = 0; i < components.length; i++) {
        const compAffirm = groupAffirm.components?.find((c) => c.index === i);
        if (!compAffirm?.affirmed) {
          unaffirmedComponents.push({
            index: i,
            type: components[i].type || components[i].component_type
          });
        }
      }
      if (unaffirmedComponents.length > 0) {
        return jsonResponse3({
          error: "Cannot affirm group",
          message: `${unaffirmedComponents.length} component(s) must be affirmed first`,
          unaffirmedComponents
        }, 400);
      }
      const flaggedComponents = components.filter((c, i) => c.flagged);
      if (flaggedComponents.length > 0) {
        return jsonResponse3({
          error: "Cannot affirm group",
          message: `${flaggedComponents.length} component(s) are flagged for review`
        }, 400);
      }
    }
    const previousState = groupAffirm.affirmed;
    groupAffirm.affirmed = affirmed === true;
    groupAffirm.affirmed_at = affirmed ? (/* @__PURE__ */ new Date()).toISOString() : null;
    groupAffirm.affirmed_by = affirmed ? user.userId : null;
    await env2.DB.prepare(`
      UPDATE hardware_page_extractions
      SET affirm_state = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(affirmState), (/* @__PURE__ */ new Date()).toISOString(), page.id).run();
    let materializationResult = null;
    if (affirmed === true) {
      try {
        materializationResult = await materializeAffirmedGroup(
          sessionId,
          page.id,
          parseInt(pageNum),
          group3,
          user.userId,
          env2
        );
        console.log(
          `[Group Affirm] Materialized group ${group3.group_number || gIdx}: ${materializationResult.componentsCreated} components, set ${materializationResult.setId}` + (materializationResult.isUpdate ? " (updated existing)" : " (new)")
        );
        if (materializationResult.setId) {
          try {
            const newComps = await env2.DB.prepare(
              `SELECT id, manufacturer, model, finish, catalog_number
               FROM hardware_components WHERE set_id = ? AND unit_price IS NULL`
            ).bind(materializationResult.setId).all();
            if (newComps.results?.length) {
              const priceResult = await enrichComponentsWithPricing(newComps.results, env2);
              console.log(`[Group Affirm] Auto-priced: ${priceResult.enriched} of ${newComps.results.length} components`);
            }
          } catch (priceErr) {
            console.log("[Group Affirm] Auto-price non-fatal:", priceErr.message);
          }
        }
      } catch (matError) {
        console.error("[Group Affirm] Materialization failed (non-blocking):", matError.message);
      }
    } else {
      try {
        const groupNumber = group3.group_number || group3.groupNumber;
        const unaffirmResult = await unaffirmMaterializedGroup(sessionId, groupNumber, env2);
        if (unaffirmResult.found) {
          console.log(`[Group Affirm] Unaffirmed materialized set ${unaffirmResult.setId}`);
        }
      } catch (uError) {
        console.error("[Group Affirm] Unaffirm materialization failed (non-blocking):", uError.message);
      }
    }
    await env2.DB.prepare(`
      INSERT INTO affirm_audit_log (id, session_id, entity_type, entity_id, action, user_id, user_email, entity_snapshot, created_at)
      VALUES (?, ?, 'group', ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sessionId,
      `page${pageNum}_group${gIdx}`,
      affirmed ? "affirm" : "unaffirm",
      user.userId,
      user.email,
      JSON.stringify({ ...group3, components: void 0 }),
      // Don't log full components
      (/* @__PURE__ */ new Date()).toISOString()
    ).run().catch((e) => console.warn("[Affirm Audit] Log failed:", e.message));
    return jsonResponse3({
      success: true,
      group: {
        pageNumber: parseInt(pageNum),
        groupIndex: gIdx,
        groupNumber: group3.group_number || group3.groupNumber,
        affirmed: groupAffirm.affirmed,
        previousState,
        componentCount: components.length,
        materialization: materializationResult ? {
          setId: materializationResult.setId,
          componentsCreated: materializationResult.componentsCreated,
          isUpdate: materializationResult.isUpdate
        } : null
      }
    });
  } catch (error5) {
    console.error("[Group Affirm] Error:", error5);
    return jsonResponse3({ error: "Failed to update affirm state", details: error5.message }, 500);
  }
});
router.delete("/api/hardware-schedule/session/:sessionId/page/:pageNum/extraction/:which", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum, which } = request2.params;
    const pageNumber = parseInt(pageNum);
    if (which !== "current" && which !== "previous") {
      return jsonResponse3({ error: 'Invalid extraction target. Use "current" or "previous".' }, 400);
    }
    const page = await env2.DB.prepare(`
      SELECT id, extracted_data, affirm_state, previous_extracted_data, previous_affirm_state, extraction_count
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNumber).first();
    if (!page) {
      return jsonResponse3({ error: "Page not found" }, 404);
    }
    if (!page.previous_extracted_data) {
      return jsonResponse3({ error: "No dual extraction exists on this page" }, 400);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (which === "previous") {
      await env2.DB.prepare(`
        UPDATE hardware_page_extractions
        SET previous_extracted_data = NULL,
            previous_affirm_state = NULL,
            updated_at = ?
        WHERE session_id = ? AND page_number = ?
      `).bind(now, sessionId, pageNumber).run();
      console.log(`[26L Delete-the-Loser] Deleted previous extraction for page ${pageNumber}, keeping current`);
      return jsonResponse3({
        success: true,
        deleted: "previous",
        surviving_extraction: page.extracted_data,
        surviving_affirm_state: page.affirm_state
      });
    } else {
      await env2.DB.prepare(`
        UPDATE hardware_page_extractions
        SET extracted_data = previous_extracted_data,
            affirm_state = previous_affirm_state,
            previous_extracted_data = NULL,
            previous_affirm_state = NULL,
            updated_at = ?
        WHERE session_id = ? AND page_number = ?
      `).bind(now, sessionId, pageNumber).run();
      console.log(`[26L Delete-the-Loser] Deleted current extraction for page ${pageNumber}, promoted previous`);
      return jsonResponse3({
        success: true,
        deleted: "current",
        surviving_extraction: page.previous_extracted_data,
        surviving_affirm_state: page.previous_affirm_state
      });
    }
  } catch (error5) {
    console.error("[26L Delete-the-Loser] Error:", error5);
    return jsonResponse3({ error: "Failed to delete extraction", details: error5.message }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-region", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  try {
    const { sessionId, pageNum } = request2.params;
    const pageNumber = parseInt(pageNum);
    const body = await request2.json();
    const { bounding_box } = body;
    if (!bounding_box || typeof bounding_box.x_percent !== "number") {
      return jsonResponse3({ error: "Missing or invalid bounding_box (requires x_percent, y_percent, width_percent, height_percent)" }, 400);
    }
    console.log(`[26M Extract Region] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[26M Extract Region] Session: ${sessionId}, Page: ${pageNumber}`);
    console.log(`[26M Extract Region] Region: ${JSON.stringify(bounding_box)}`);
    console.log(`[26M Extract Region] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.extraction_page_range) {
      try {
        const rangeData = typeof session.extraction_page_range === "string" ? JSON.parse(session.extraction_page_range) : session.extraction_page_range;
        if (rangeData && !isPageInRange(pageNumber, rangeData)) {
          console.log(`[27A Page Range] Skipping region extraction page ${pageNumber} (outside extraction ranges)`);
          return jsonResponse3({
            status: "skipped",
            message: `Page ${pageNumber} outside extraction range`,
            page_number: pageNumber,
            extraction_page_range: rangeData
          });
        }
      } catch (rangeErr) {
        console.warn(`[27A Page Range] Could not parse range: ${rangeErr.message}`);
      }
    }
    const bufferKey = session.file_buffer_key || "uploads/" + sessionId + ".pdf";
    let fileBuffer = pdfBufferOrNull(await env2.CACHE.get(bufferKey, { type: "arrayBuffer" }), bufferKey);
    let pdfStreamUrl = null;
    if (fileBuffer && fileBuffer.byteLength > 20 * 1024 * 1024 && env2.UPLOADS) {
      console.log(`[26M Extract Region] KV returned ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB \u2014 switching to R2 streaming to avoid OOM`);
      fileBuffer = null;
      pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
    } else if (!fileBuffer && env2.UPLOADS) {
      console.log("[26M Extract Region] KV miss, generating R2 stream URL: " + bufferKey);
      pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
    }
    if (!fileBuffer && !pdfStreamUrl) {
      return jsonResponse3({ error: "PDF not found in storage" }, 404);
    }
    let renderBoundingBox;
    if (body.bounding_box_percent && typeof body.bounding_box_percent.x_percent === "number") {
      renderBoundingBox = body.bounding_box_percent;
    } else if (body.bounding_box_pixels) {
      renderBoundingBox = body.bounding_box_pixels;
    } else {
      return jsonResponse3({ error: "bounding_box_percent or bounding_box_pixels required" }, 400);
    }
    console.log(`[26M Extract Region] Rendering region at 600 DPI...`);
    const rendered = await renderRegionAt600DPI2(
      fileBuffer,
      pageNumber,
      renderBoundingBox,
      env2,
      600,
      pdfStreamUrl
    );
    console.log(`[26M Extract Region] Rendered: ${rendered.width}x${rendered.height}px, ${(rendered.fileSizeBytes / 1024).toFixed(1)}KB`);
    const imgBytes = new Uint8Array(rendered.imageBuffer);
    let imgBinary = "";
    for (let i = 0; i < imgBytes.length; i += 8192) {
      imgBinary += String.fromCharCode.apply(null, imgBytes.subarray(i, Math.min(i + 8192, imgBytes.length)));
    }
    const imageBase64 = btoa(imgBinary);
    console.log(`[26M Extract Region] Sending to extractFromPageImage (${(imageBase64.length / 1024).toFixed(1)}KB base64)...`);
    const extractionResult = await extractFromPageImage(
      imageBase64,
      pageNumber,
      session.page_count || 1,
      env2,
      {
        tenantId: session.tenant_id || null,
        sessionId
      }
    );
    const totalTime = Date.now() - startTime;
    const groups = extractionResult.hardware_groups || [];
    console.log(`[26M Extract Region] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[26M Extract Region] COMPLETE: ${groups.length} groups extracted in ${totalTime}ms`);
    console.log(`[26M Extract Region] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    return jsonResponse3({
      success: true,
      session_id: sessionId,
      page_number: pageNumber,
      hardware_groups: groups,
      metadata: extractionResult.metadata || {},
      timing: {
        render_ms: rendered.renderTimeMs,
        total_ms: totalTime
      }
    });
  } catch (error5) {
    console.error("[26M Extract Region] Error:", error5);
    return jsonResponse3({
      error: "Failed to extract region",
      details: error5.message
    }, 500);
  }
});
router.patch("/api/hardware-schedule/session/:sessionId/page/:pageNum/group/:groupIndex/replace", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum, groupIndex } = request2.params;
    const pageNumber = parseInt(pageNum);
    const targetIndex = parseInt(groupIndex);
    const body = await request2.json();
    const { new_group_data } = body;
    if (!new_group_data) {
      return jsonResponse3({ error: "Missing new_group_data in request body" }, 400);
    }
    console.log(`[26M Group Replace] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[26M Group Replace] Session: ${sessionId}, Page: ${pageNumber}, Group Index: ${targetIndex}`);
    console.log(`[26M Group Replace] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    const page = await env2.DB.prepare(`
      SELECT id, extracted_data, affirm_state
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNumber).first();
    if (!page) {
      return jsonResponse3({ error: "Page extraction not found" }, 404);
    }
    const extractedData = JSON.parse(page.extracted_data || "{}");
    const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
    if (targetIndex < 0 || targetIndex >= groups.length) {
      return jsonResponse3({
        error: `Group index ${targetIndex} out of range (page has ${groups.length} groups)`
      }, 400);
    }
    const oldGroup = groups[targetIndex];
    console.log(`[26M Group Replace] Replacing group #${oldGroup.group_number || oldGroup.groupNumber || targetIndex} at index ${targetIndex}`);
    groups[targetIndex] = new_group_data;
    if (extractedData.hardware_groups) {
      extractedData.hardware_groups = groups;
    } else if (extractedData.hardwareGroups) {
      extractedData.hardwareGroups = groups;
    } else {
      extractedData.hardware_groups = groups;
    }
    let affirmState = { groups: [] };
    try {
      affirmState = JSON.parse(page.affirm_state || '{"groups":[]}');
    } catch (e) {
      affirmState = { groups: [] };
    }
    while (affirmState.groups.length < groups.length) {
      affirmState.groups.push({ affirmed: false, components: [] });
    }
    affirmState.groups[targetIndex] = {
      affirmed: false,
      components: (new_group_data.components || []).map(() => ({ affirmed: false }))
    };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env2.DB.prepare(`
      UPDATE hardware_page_extractions
      SET extracted_data = ?,
          affirm_state = ?,
          updated_at = ?
      WHERE session_id = ? AND page_number = ?
    `).bind(
      JSON.stringify(extractedData),
      JSON.stringify(affirmState),
      now,
      sessionId,
      pageNumber
    ).run();
    console.log(`[26M Group Replace] Group ${targetIndex} replaced. Affirm reset for that group only.`);
    console.log(`[26M Group Replace] Other ${groups.length - 1} groups untouched.`);
    return jsonResponse3({
      success: true,
      page_number: pageNumber,
      group_index: targetIndex,
      total_groups: groups.length,
      updated_extracted_data: extractedData,
      updated_affirm_state: affirmState
    });
  } catch (error5) {
    console.error("[26M Group Replace] Error:", error5);
    return jsonResponse3({ error: "Failed to replace group", details: error5.message }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/affirm-all", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum } = request2.params;
    const page = await env2.DB.prepare(`
      SELECT id, extracted_data, affirm_state
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, parseInt(pageNum)).first();
    if (!page) {
      return jsonResponse3({ error: "Page not found" }, 404);
    }
    const extractedData = JSON.parse(page.extracted_data || "{}");
    let affirmState = { groups: [] };
    const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
    let affirmedComponents = 0;
    let affirmedGroups = 0;
    let skippedComponents = 0;
    let skippedGroups = 0;
    const skippedReasons = [];
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const group3 = groups[gIdx];
      const components = group3.components || [];
      const groupAffirm = {
        group_number: group3.group_number || group3.groupNumber,
        affirmed: false,
        components: []
      };
      let allComponentsAffirmed = true;
      for (let cIdx = 0; cIdx < components.length; cIdx++) {
        const comp = components[cIdx];
        const validationErrors = validateComponentForAffirm(comp);
        if (validationErrors.length === 0 && !comp.flagged) {
          groupAffirm.components.push({
            index: cIdx,
            affirmed: true,
            affirmed_at: (/* @__PURE__ */ new Date()).toISOString(),
            affirmed_by: user.userId
          });
          affirmedComponents++;
        } else {
          groupAffirm.components.push({
            index: cIdx,
            affirmed: false
          });
          allComponentsAffirmed = false;
          skippedComponents++;
          skippedReasons.push({
            type: "component",
            groupIndex: gIdx,
            componentIndex: cIdx,
            reason: comp.flagged ? "Flagged for review" : validationErrors.join(", ")
          });
        }
      }
      if (allComponentsAffirmed && components.length > 0 && (group3.group_number || group3.groupNumber)) {
        groupAffirm.affirmed = true;
        groupAffirm.affirmed_at = (/* @__PURE__ */ new Date()).toISOString();
        groupAffirm.affirmed_by = user.userId;
        affirmedGroups++;
      } else {
        skippedGroups++;
        if (!allComponentsAffirmed) {
          skippedReasons.push({
            type: "group",
            groupIndex: gIdx,
            reason: "Not all components affirmed"
          });
        }
      }
      affirmState.groups.push(groupAffirm);
    }
    await env2.DB.prepare(`
      UPDATE hardware_page_extractions
      SET affirm_state = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(affirmState), (/* @__PURE__ */ new Date()).toISOString(), page.id).run();
    return jsonResponse3({
      success: true,
      pageNumber: parseInt(pageNum),
      affirmedComponents,
      affirmedGroups,
      skippedComponents,
      skippedGroups,
      skippedReasons: skippedReasons.slice(0, 20)
    });
  } catch (error5) {
    console.error("[Affirm All] Error:", error5);
    return jsonResponse3({ error: "Failed to affirm all", details: error5.message }, 500);
  }
});
}
