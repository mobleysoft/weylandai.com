// src/routes/hardware-schedule-generate.js
//
// Final-output generation for a hardware-extraction session:
// generate-submittal (DSA-2 formatted submittal JSON + HTML preview,
// gated on all groups/components being affirmed unless explicitly
// bypassed), generate-package (matches every component against real
// cut-sheet products for a combined package), and extract-affirmed
// (kicks off real per-region extraction for every affirmed schedule
// region candidate - either queued to a local Claude Code bridge, or
// run inline through the extraction pipeline, depending on the
// session's extraction_route). Extracted 2026-09-10 from
// legacy-monolith.js (previously inline, lines 150497-151234).
//
// arrayBufferToBase64 is a real top-level import from auth-module.js
// (legacy-monolith.js's local binding was the esbuild collision-renamed
// arrayBufferToBase644 - same real function, different local name; same
// situation as createHmacSignature in quotes-generate.js).
//
// Ten shared cluster-wide helpers stay injected dependencies, continuing
// the pattern from every prior piece of this cluster - each has real
// call sites in routes still inline elsewhere: getSessionStatus,
// generateR2StreamUrl, isPageInRange, pdfBufferOrNull,
// renderRegionAt600DPI2, callEdge, generateSubmittalHTML,
// incrementSubmittalsUsed, matchComponentToCutSheets (CPS cluster,
// step 8), queuePageExtractionJob, routeExtraction,
// transformDoorEntriesToHardwareSets, materializeDseToLineItems (the
// last two already an established injected-dep pair from
// registerProjectRoutes). detectAndPersistRegionConflicts is a real
// top-level import from lib/region-conflicts.js (extracted earlier
// this session).

import { jsonResponse3 } from "../lib/json-response.js";
import { detectAndPersistRegionConflicts } from "../lib/region-conflicts.js";
import { arrayBufferToBase64 } from "../auth-module.js";

export function registerHardwareScheduleGenerateRoutes(router, {
  authenticate,
  requireActiveSubscription,
  getSessionStatus,
  generateR2StreamUrl,
  isPageInRange,
  pdfBufferOrNull,
  renderRegionAt600DPI2,
  callEdge,
  generateSubmittalHTML,
  incrementSubmittalsUsed,
  matchComponentToCutSheets,
  queuePageExtractionJob,
  routeExtraction,
  transformDoorEntriesToHardwareSets,
  materializeDseToLineItems,
}) {
router.post("/api/hardware-schedule/session/:sessionId/generate-submittal", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const subError = await requireActiveSubscription(user, env2);
  if (subError)
    return subError;
  try {
    const sessionId = request2.params.sessionId;
    console.log(`[Submittal Generation] Generating submittal for session ${sessionId}`);
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    const body = await request2.json().catch(() => ({}));
    const bypassAffirmGate = body.bypassAffirmGate === true;
    if (!bypassAffirmGate) {
      const pages = await env2.DB.prepare(`
        SELECT id, page_number, extracted_data, affirm_state
        FROM hardware_page_extractions
        WHERE session_id = ? AND status != 'rejected'
      `).bind(sessionId).all();
      let totalItems = 0;
      let affirmedItems = 0;
      const unaffirmedSummary = [];
      for (const page of pages.results) {
        const extractedData = JSON.parse(page.extracted_data || "{}");
        const affirmState = JSON.parse(page.affirm_state || "{}");
        const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
        for (const group3 of groups) {
          totalItems++;
          const groupAffirm = affirmState.groups?.find((g) => g.group_number === group3.group_number);
          if (groupAffirm?.affirmed) {
            affirmedItems++;
          } else {
            unaffirmedSummary.push(`Group #${group3.group_number} on page ${page.page_number}`);
          }
          const components = group3.components || [];
          for (let i = 0; i < components.length; i++) {
            totalItems++;
            const compAffirm = groupAffirm?.components?.find((c) => c.index === i);
            if (compAffirm?.affirmed) {
              affirmedItems++;
            }
          }
        }
      }
      if (affirmedItems < totalItems) {
        const unaffirmedCount = totalItems - affirmedItems;
        console.log(`[Submittal Gate] Blocked: ${unaffirmedCount} of ${totalItems} items not affirmed`);
        return jsonResponse3({
          error: "Cannot generate submittal",
          code: "AFFIRM_GATE_BLOCKED",
          message: `${unaffirmedCount} item(s) must be affirmed before generating submittal`,
          details: {
            totalItems,
            affirmedItems,
            unaffirmedCount,
            unaffirmedSummary: unaffirmedSummary.slice(0, 10)
          }
        }, 400);
      }
      console.log(`[Submittal Gate] Passed: ${affirmedItems}/${totalItems} items affirmed`);
    } else {
      console.warn(`[Submittal Gate] BYPASSED by user ${user.userId}`);
    }
    const setsData = await env2.DB.prepare(`
      SELECT
        hs.id as set_id,
        hs.set_number,
        hs.description,
        hs.keying_system,
        hs.function_type,
        hs.notes as set_notes,
        hs.page_number,
        hc.id as component_id,
        hc.component_type,
        hc.quantity,
        hc.manufacturer_code,
        hc.model_number,
        hc.description as component_description,
        hc.finish_code,
        hc.finish_description,
        hc.unit_price,
        hc.notes as component_notes,
        hc.compliance,
        hc.sort_order
      FROM hardware_sets hs
      LEFT JOIN hardware_components hc ON hc.set_id = hs.id
      WHERE hs.session_id = ?
      ORDER BY hs.set_number, hc.sort_order, hc.component_type
    `).bind(sessionId).all();
    if (!setsData.results || setsData.results.length === 0) {
      return jsonResponse3({ error: "No hardware data found for this session" }, 404);
    }
    const hardwareSets = {};
    for (const row of setsData.results) {
      const setKey = row.set_number;
      if (!hardwareSets[setKey]) {
        hardwareSets[setKey] = {
          set_number: row.set_number,
          description: row.description,
          keying_system: row.keying_system,
          function_type: row.function_type,
          notes: row.set_notes,
          page_number: row.page_number,
          components: []
        };
      }
      if (row.component_id) {
        hardwareSets[setKey].components.push({
          type: row.component_type,
          quantity: row.quantity,
          manufacturer: row.manufacturer_code,
          model: row.model_number,
          description: row.component_description,
          finish_code: row.finish_code,
          finish_description: row.finish_description,
          unit_price: row.unit_price,
          notes: row.component_notes,
          compliance: row.compliance
        });
      }
    }
    const submittal = {
      header: {
        title: "HARDWARE SCHEDULE SUBMITTAL",
        project_name: session.project_name,
        document_type: "DSA-2 STANDARD FORMAT",
        generated_at: (/* @__PURE__ */ new Date()).toISOString(),
        session_id: sessionId
      },
      summary: {
        total_sets: Object.keys(hardwareSets).length,
        total_components: Object.values(hardwareSets).reduce((sum2, set) => sum2 + set.components.length, 0),
        pages_extracted: session.total_pages
      },
      hardware_sets: Object.values(hardwareSets).sort((a, b) => {
        const numA = parseInt(a.set_number.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.set_number.replace(/\D/g, "")) || 0;
        return numA - numB;
      }),
      certifications: {
        architect_approval: {
          label: "Architect Approval",
          status: "pending",
          signature_line: true
        },
        contractor_certification: {
          label: "Contractor Certification",
          status: "pending",
          signature_line: true
        },
        compliance_statement: "All hardware items comply with applicable building codes, accessibility requirements (ADA/CBC), and fire/life safety standards."
      },
      metadata: {
        format_version: "2.0",
        generated_by: "SubX API",
        api_version: "2.1"
      }
    };
    const htmlPreview = generateSubmittalHTML(submittal);
    console.log(`[Submittal Generation] Generated submittal with ${submittal.summary.total_sets} sets, ${submittal.summary.total_components} components`);
    const newUsage = await incrementSubmittalsUsed(user.userId, env2);
    console.log(`[Submittal Generation] User ${user.userId} usage: ${newUsage}`);
    return jsonResponse3({
      success: true,
      submittal,
      html_preview: htmlPreview,
      usage: { submittalsUsed: newUsage }
    }, 200);
  } catch (error5) {
    console.error("[Submittal Generation] Error:", error5);
    return jsonResponse3({
      error: "Failed to generate submittal",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/generate-package", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const subError = await requireActiveSubscription(user, env2);
  if (subError)
    return subError;
  try {
    const sessionId = request2.params.sessionId;
    console.log(`[PDF Package] Generating package for session ${sessionId}`);
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    const sets = await env2.DB.prepare(`
      SELECT id, set_number, set_name, door_location, door_count, notes
      FROM hardware_sets
      WHERE session_id = ?
      ORDER BY set_number
    `).bind(sessionId).all();
    if (!sets.results || sets.results.length === 0) {
      return jsonResponse3({ error: "No hardware sets found for this session" }, 404);
    }
    const components = await env2.DB.prepare(`
      SELECT
        hc.id, hc.set_id, hc.component_type, hc.dhi_category, hc.sequence_order,
        hc.manufacturer, hc.model, hc.catalog_number, hc.finish, hc.quantity,
        hc.function_code, hc.specifications, hc.ansi_bhma_grade,
        hc.fire_rating_minutes, hc.ada_compliant,
        hs.set_number, hs.set_name
      FROM hardware_components hc
      JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id = ?
      ORDER BY hs.set_number, hc.sequence_order
    `).bind(sessionId).all();
    const componentMatches = await Promise.all(
      (components.results || []).map((comp) => matchComponentToCutSheets({
        manufacturer: comp.manufacturer,
        model: comp.model,
        catalog_number: comp.catalog_number,
        component_type: comp.component_type
      }, env2).then((match) => ({
        ...comp,
        productMatch: match.matched ? match.product : null,
        cutSheets: match.cutSheets,
        matchConfidence: match.confidence,
        matchType: match.matchType
      })))
    );
    const cutSheetMap = /* @__PURE__ */ new Map();
    for (const comp of componentMatches) {
      for (const sheet of comp.cutSheets) {
        if (!cutSheetMap.has(sheet.id)) {
          cutSheetMap.set(sheet.id, {
            ...sheet,
            forComponents: [comp.id],
            forSets: [comp.set_number]
          });
        } else {
          const existing = cutSheetMap.get(sheet.id);
          if (!existing.forComponents.includes(comp.id)) {
            existing.forComponents.push(comp.id);
          }
          if (!existing.forSets.includes(comp.set_number)) {
            existing.forSets.push(comp.set_number);
          }
        }
      }
    }
    const hardwareSets = sets.results.map((set) => ({
      ...set,
      components: componentMatches.filter((c) => c.set_id === set.id).map((c) => ({
        id: c.id,
        type: c.component_type,
        dhi_category: c.dhi_category,
        manufacturer: c.manufacturer,
        model: c.model,
        catalog_number: c.catalog_number,
        finish: c.finish,
        quantity: c.quantity,
        specifications: c.specifications,
        ansi_grade: c.ansi_bhma_grade,
        fire_rating: c.fire_rating_minutes,
        ada_compliant: c.ada_compliant,
        productMatch: c.productMatch,
        matchConfidence: c.matchConfidence,
        hasCutSheet: c.cutSheets.length > 0
      }))
    }));
    let manifestVendorName = "Weyland by Weyland";
    if (user && user.tenantId) {
      const vp = await env2.DB.prepare(
        "SELECT company_name FROM vendor_profile WHERE tenant_id = ?"
      ).bind(user.tenantId).first();
      if (vp?.company_name)
        manifestVendorName = vp.company_name;
    }
    const cutSheets = Array.from(cutSheetMap.values());
    const pdfManifest = {
      coverPage: {
        title: "HARDWARE SCHEDULE SUBMITTAL",
        project: session.project_name || "Untitled Project",
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        preparedBy: manifestVendorName
      },
      sections: [
        {
          type: "toc",
          title: "Table of Contents"
        },
        {
          type: "schedule",
          title: "Hardware Schedule",
          sets: hardwareSets.length
        },
        ...cutSheets.map((sheet, idx) => ({
          type: "cut_sheet",
          title: sheet.title,
          r2Key: sheet.r2Key,
          bucket: sheet.bucket,
          order: idx + 1,
          forSets: sheet.forSets
        }))
      ],
      estimatedPages: 2 + hardwareSets.length + cutSheets.reduce((sum2, s) => sum2 + (s.pages || 1), 0)
    };
    const matchedComponents = componentMatches.filter((c) => c.productMatch);
    const withCutSheets = componentMatches.filter((c) => c.cutSheets.length > 0);
    const packageData = {
      success: true,
      sessionId,
      project: session.project_name,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      summary: {
        totalSets: hardwareSets.length,
        totalComponents: componentMatches.length,
        matchedToProducts: matchedComponents.length,
        withCutSheets: withCutSheets.length,
        uniqueCutSheets: cutSheets.length,
        matchRate: Math.round(matchedComponents.length / componentMatches.length * 100) || 0
      },
      hardwareSets,
      cutSheets,
      pdfManifest
    };
    console.log(`[PDF Package] Generated package: ${packageData.summary.totalSets} sets, ${packageData.summary.uniqueCutSheets} cut sheets, ${packageData.summary.matchRate}% match rate`);
    const newUsage = await incrementSubmittalsUsed(user.userId, env2);
    console.log(`[PDF Package] User ${user.userId} usage: ${newUsage}`);
    packageData.usage = { submittalsUsed: newUsage };
    return jsonResponse3(packageData, 200);
  } catch (error5) {
    console.error("[PDF Package] Error:", error5);
    return jsonResponse3({
      error: "Failed to generate submittal package",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/extract-affirmed", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId } = request2.params;
    const body = await request2.json().catch(() => ({}));
    const candidateIds = body.candidate_ids || null;
    const parallel = body.parallel || false;
    console.log(`[Extract Affirmed] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Extract Affirmed] Session: ${sessionId}`);
    console.log(`[Extract Affirmed] Candidate filter: ${candidateIds ? candidateIds.join(", ") : "all affirmed"}`);
    console.log(`[Extract Affirmed] Parallel mode: ${parallel}`);
    console.log(`[Extract Affirmed] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    let extractionRange = null;
    if (session.extraction_page_range) {
      try {
        extractionRange = typeof session.extraction_page_range === "string" ? JSON.parse(session.extraction_page_range) : session.extraction_page_range;
      } catch (rangeErr) {
        console.warn(`[27A Page Range] Could not parse range: ${rangeErr.message}`);
      }
    }
    const bufferKey = session.file_buffer_key || "uploads/" + sessionId + ".pdf";
    let fileBuffer = pdfBufferOrNull(await env2.CACHE.get(bufferKey, { type: "arrayBuffer" }), bufferKey);
    let pdfStreamUrl = null;
    if (fileBuffer && fileBuffer.byteLength > 20 * 1024 * 1024 && env2.UPLOADS) {
      console.log(`[Extract Affirmed] KV returned ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB \u2014 switching to R2 streaming to avoid OOM`);
      fileBuffer = null;
      pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
    } else if (!fileBuffer && env2.UPLOADS) {
      console.log("[Extract Affirmed] KV miss, generating R2 stream URL: " + bufferKey);
      pdfStreamUrl = await generateR2StreamUrl(bufferKey, env2);
    }
    if (!fileBuffer && !pdfStreamUrl) {
      return jsonResponse3({ error: "PDF not found in storage" }, 404);
    }
    const pdfBuffer = fileBuffer;
    const review = await detectAndPersistRegionConflicts(sessionId, env2);
    let query = `SELECT * FROM schedule_region_candidates WHERE session_id = ? AND status = 'affirmed'`;
    const params = [sessionId];
    if (candidateIds && candidateIds.length > 0) {
      const placeholders = candidateIds.map(() => "?").join(",");
      query += ` AND id IN (${placeholders})`;
      params.push(...candidateIds);
    }
    query += ` ORDER BY COALESCE(parse_order, 999999), page_number`;
    const { results: candidates } = await env2.DB.prepare(query).bind(...params).all();
    const blocked = (candidates || []).filter((c) => c.review_status === "conflict");
    if (blocked.length > 0) {
      return jsonResponse3({
        error: "conflicts_unresolved",
        message: "Resolve flagged region conflicts before extracting.",
        conflicts: blocked.map((c) => ({ candidate_id: c.id, page: c.page_number, reason: c.conflict_reason })),
        review
      }, 409);
    }
    if (!candidates || candidates.length === 0) {
      return jsonResponse3({
        success: true,
        session_id: sessionId,
        extractions_started: 0,
        message: "No affirmed candidates to extract"
      });
    }
    console.log(`[Extract Affirmed] Found ${candidates.length} affirmed candidates`);
    await Promise.all(candidates.map(
      (c) => env2.DB.prepare(`
        UPDATE schedule_region_candidates
        SET status = 'extracting', extraction_started_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(c.id).run()
    ));
    const _doorPages = [...new Set(candidates.filter((c) => c.schedule_type === "door_schedule").map((c) => c.page_number))];
    if (_doorPages.length > 0) {
      try {
        const _ph = _doorPages.map(() => "?").join(",");
        const _del = await env2.DB.prepare(
          `DELETE FROM door_schedule_entries WHERE session_id = ? AND page_number IN (${_ph})`
        ).bind(sessionId, ..._doorPages).run();
        console.log(`[Extract Affirmed] page-truth reset: cleared ${_del.meta?.changes || 0} prior door rows on page(s) ${_doorPages.join(",")}`);
      } catch (e) {
        console.warn("[Extract Affirmed] page-truth reset failed (continuing):", e.message);
      }
    }
    const _sessRouteRow = await env2.DB.prepare("SELECT extraction_route, project_id FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
    const _sessRoute = _sessRouteRow?.extraction_route || (env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local");
    if (_sessRoute === "claude_code_local") {
      const _ownerForCheck = user.mhsId || user.mhs_id || null;
      try {
        const bs = await callEdge("GET", `/ai/v1/bridge/status?owner_id=${encodeURIComponent(_ownerForCheck || "")}`, env2);
        if (bs.status === 200 && bs.body && bs.body.online === false) {
          await Promise.all(candidates.map((c) => env2.DB.prepare(
            `UPDATE schedule_region_candidates SET status='affirmed', updated_at=datetime('now') WHERE id=?`
          ).bind(c.id).run()));
          return jsonResponse3({
            error: "bridge_offline",
            message: "Your Claude Code bridge is not running. Start it (Download launcher) and retry.",
            owner_id: _ownerForCheck,
            has_token: !!bs.body.has_token
          }, 409);
        }
      } catch (e) {
      }
      const packets = [];
      for (const candidate of candidates) {
        try {
          const _pctBox = (() => {
            try {
              const p = JSON.parse(candidate.bounding_box_percent || "null");
              return p && typeof p.x_percent === "number" ? p : null;
            } catch (e) {
              return null;
            }
          })();
          let boundingBox = _pctBox || JSON.parse(candidate.user_adjusted_bounding_box || candidate.bounding_box);
          if (candidate.schedule_type === "door_schedule") {
            boundingBox = { ...boundingBox, pad_w_percent: 0.05, pad_h_percent: 0.04 };
          }
          const rendered = await renderRegionAt600DPI2(pdfBuffer, candidate.page_number, boundingBox, env2, candidate.extraction_dpi || 600, pdfStreamUrl);
          const q = await queuePageExtractionJob(arrayBufferToBase64(rendered.imageBuffer), env2, {
            pageNumber: candidate.page_number,
            totalPages: session.page_count || session.total_pages || 1,
            sessionId,
            tenantId: session.tenant_id || "ven_weyland",
            ownerMhsId: _ownerForCheck,
            operatorNotes: candidate.user_notes || null,
            crossRefGuidance: candidate.cross_ref || null,
            scheduleType: candidate.schedule_type || null
          });
          const kuId = crypto.randomUUID();
          await env2.DB.prepare(`
            INSERT OR REPLACE INTO kdp_packets
              (id, connection_id, project_id, candidate_id, page_number, sequence, unit_type, job_id, route, owner_id, state, attempts, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude_code_local', ?, 'in_flight', 1, datetime('now'), datetime('now'))
          `).bind(
            kuId,
            sessionId,
            _sessRouteRow?.project_id || null,
            candidate.id,
            candidate.page_number,
            candidate.page_number,
            candidate.schedule_type === "door_schedule" ? "door_mark" : "hardware_set",
            q.job_id,
            q.owner_id
          ).run();
          packets.push({
            ku_id: kuId,
            candidate_id: candidate.id,
            page: candidate.page_number,
            schedule_type: candidate.schedule_type,
            job_id: q.job_id,
            poll_url: `/api/jobs/${q.job_id}`,
            finalize_url: `/api/hardware-schedule/session/${sessionId}/page/${candidate.page_number}/finalize-image/${q.job_id}`
          });
        } catch (qErr) {
          console.error(`[Extract Affirmed][deferred] queue failed candidate ${candidate.id}:`, qErr.message);
          await env2.DB.prepare(`UPDATE schedule_region_candidates SET status='failed', extraction_error=?, updated_at=datetime('now') WHERE id=?`).bind(String(qErr.message).slice(0, 500), candidate.id).run();
          packets.push({ candidate_id: candidate.id, page: candidate.page_number, error: qErr.message });
        }
      }
      return jsonResponse3({
        success: true,
        async: true,
        session_id: sessionId,
        packets,
        message: "Queued to your bridge. Poll each job, then finalize per candidate."
      });
    }
    const context3 = {
      sessionId,
      tenantId: session.tenant_id || "ven_weyland",
      industryId: session.industry_id || "ind_doors"
    };
    const results = [];
    let _projectId = null;
    try {
      const _projRow = await env2.DB.prepare("SELECT project_id FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
      _projectId = _projRow?.project_id || null;
    } catch (e) {
    }
    for (const candidate of candidates) {
      let _kuId = null;
      try {
        if (extractionRange && candidate.page_number) {
          if (!isPageInRange(candidate.page_number, extractionRange)) {
            console.log(`[27A Page Range] Skipping affirmed candidate ${candidate.id} on page ${candidate.page_number} (outside extraction ranges)`);
            results.push({
              candidate_id: candidate.id,
              status: "skipped",
              message: `Page ${candidate.page_number} outside extraction range`
            });
            continue;
          }
        }
        console.log(`[Extract Affirmed] Processing candidate ${candidate.id} (${candidate.schedule_type})`);
        const _pctBox = (() => {
          try {
            const p = JSON.parse(candidate.bounding_box_percent || "null");
            return p && typeof p.x_percent === "number" ? p : null;
          } catch (e) {
            return null;
          }
        })();
        let boundingBox = _pctBox || JSON.parse(candidate.user_adjusted_bounding_box || candidate.bounding_box);
        if (candidate.schedule_type === "door_schedule") {
          boundingBox = { ...boundingBox, pad_w_percent: 0.05, pad_h_percent: 0.04 };
        }
        const candidateDpi = candidate.extraction_dpi || 600;
        const rendered = await renderRegionAt600DPI2(
          pdfBuffer,
          candidate.page_number,
          boundingBox,
          env2,
          candidateDpi,
          pdfStreamUrl
        );
        console.log(`[Extract Affirmed] Rendered region: ${rendered.width}x${rendered.height}px`);
        _kuId = crypto.randomUUID();
        try {
          await env2.DB.prepare(`
            INSERT OR REPLACE INTO kdp_packets
              (id, connection_id, project_id, candidate_id, page_number, sequence, unit_type, job_id, route, owner_id, state, attempts, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'sync_inline', ?, 'in_flight', 1, datetime('now'), datetime('now'))
          `).bind(
            _kuId,
            sessionId,
            _projectId,
            candidate.id,
            candidate.page_number,
            candidate.page_number,
            candidate.schedule_type === "door_schedule" ? "door_mark" : "hardware_set",
            user.mhsId || user.mhs_id || null
          ).run();
        } catch (_ledgerErr) {
          console.warn("[Extract Affirmed] ledger packet create failed:", _ledgerErr.message);
        }
        const extractionResult = await routeExtraction(
          candidate.schedule_type,
          rendered.imageBuffer,
          {
            ...context3,
            candidateId: candidate.id,
            pageNumber: candidate.page_number,
            totalPages: session.page_count || 1,
            operatorNotes: candidate.user_notes || null,
            crossRefGuidance: candidate.cross_ref || null
          },
          env2
        );
        const _extrOk = extractionResult && extractionResult.success !== false;
        const _extrCnt = extractionResult && (extractionResult.entry_count ?? extractionResult.entries_count) || 0;
        await env2.DB.prepare(`
          UPDATE schedule_region_candidates
          SET status = ?,
              extraction_completed_at = datetime('now'),
              extraction_entry_count = ?,
              extraction_error = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          _extrOk ? "extracted" : "failed",
          _extrCnt,
          _extrOk ? null : String(extractionResult?.error || "extraction returned success:false").slice(0, 500),
          candidate.id
        ).run();
        if (_kuId) {
          try {
            await env2.DB.prepare(`
              UPDATE kdp_packets
              SET state = ?, groups_count = ?, components_count = ?, error = ?,
                  delivered_at = CASE WHEN ? = 1 THEN datetime('now') ELSE delivered_at END,
                  updated_at = datetime('now')
              WHERE id = ?
            `).bind(
              _extrOk ? "delivered" : "flagged",
              _extrCnt,
              _extrCnt,
              _extrOk ? null : String(extractionResult?.error || "extraction returned success:false").slice(0, 300),
              _extrOk ? 1 : 0,
              _kuId
            ).run();
          } catch (_ledgerErr) {
            console.warn("[Extract Affirmed] ledger packet advance failed:", _ledgerErr.message);
          }
        }
        const targetTable = SCHEDULE_TYPE_REGISTRY[candidate.schedule_type]?.target_table || "unknown";
        results.push({
          candidate_id: candidate.id,
          schedule_type: candidate.schedule_type,
          status: _extrOk ? "extracted" : "failed",
          entry_count: _extrCnt,
          ..._extrOk ? {} : { error: String(extractionResult?.error || "extraction returned success:false").slice(0, 500) },
          target_table: targetTable
        });
        console.log(`[Extract Affirmed] Candidate ${candidate.id}: ${_extrOk ? "extracted" : "FAILED"} ${_extrCnt} entries -> ${targetTable}`);
      } catch (extractError) {
        console.error(`[Extract Affirmed] Extraction failed for candidate ${candidate.id}:`, extractError);
        await env2.DB.prepare(`
          UPDATE schedule_region_candidates
          SET status = 'failed',
              extraction_error = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(extractError.message, candidate.id).run();
        if (_kuId) {
          try {
            await env2.DB.prepare(`
              UPDATE kdp_packets SET state='flagged', error=?, updated_at=datetime('now') WHERE id=?
            `).bind(String(extractError.message).slice(0, 300), _kuId).run();
          } catch (_ledgerErr) {
          }
        }
        results.push({
          candidate_id: candidate.id,
          schedule_type: candidate.schedule_type,
          status: "failed",
          error: extractError.message
        });
      }
    }
    const totalEntries = results.filter((r) => r.status === "extracted").reduce((sum2, r) => sum2 + (r.entry_count || 0), 0);
    const extractedCount = results.filter((r) => r.status === "extracted").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    console.log(`[Extract Affirmed] Complete: ${extractedCount} extracted, ${failedCount} failed, ${totalEntries} total entries`);
    let transformResult = null;
    if (extractedCount > 0) {
      try {
        transformResult = await transformDoorEntriesToHardwareSets(
          sessionId,
          user?.id || user?.email || "anonymous",
          env2
        );
        console.log(`[Extract Affirmed] Transform: ${transformResult.setsCreated} hardware_sets created from ${transformResult.totalMarks} door entries`);
      } catch (transformError) {
        console.error("[Extract Affirmed] Transform failed (non-blocking):", transformError.message);
        transformResult = { error: transformError.message, setsCreated: 0 };
      }
      try {
        const matResult = await materializeDseToLineItems(sessionId, env2);
        console.log(`[Extract Affirmed] Auto-materialize: ${matResult.doorsCreated} door groups, ${matResult.framesCreated} frame groups`);
      } catch (matError) {
        console.error("[Extract Affirmed] Auto-materialize failed (non-blocking):", matError.message);
      }
    }
    const pageDataMap = {};
    const extractedPageNums = results.filter((r) => r.status === "extracted").map((r) => r.page || r.page_number);
    if (extractedPageNums.length > 0) {
      try {
        const placeholders = extractedPageNums.map(() => "?").join(",");
        const hpeRows = await env2.DB.prepare(`
          SELECT page_number, extracted_data, affirm_state
          FROM hardware_page_extractions
          WHERE session_id = ? AND page_number IN (${placeholders})
          ORDER BY page_number
        `).bind(sessionId, ...extractedPageNums).all();
        for (const row of hpeRows.results || []) {
          try {
            const data = JSON.parse(row.extracted_data);
            pageDataMap[row.page_number] = {
              groups: data.hardware_groups || data.hardwareGroups || [],
              affirm_state: row.affirm_state || "pending_review"
            };
          } catch (e) {
          }
        }
      } catch (e) {
        console.error("[Extract Affirmed] page_data fetch failed (non-blocking):", e.message);
      }
    }
    return jsonResponse3({
      success: true,
      session_id: sessionId,
      extractions_completed: extractedCount,
      extractions_failed: failedCount,
      results,
      total_entries: totalEntries,
      hardware_sets_created: transformResult?.setsCreated || 0,
      page_data: pageDataMap
    });
  } catch (error5) {
    console.error("[Extract Affirmed] Error:", error5);
    return jsonResponse3({
      error: "Failed to extract affirmed candidates",
      details: error5.message
    }, 500);
  }
});
}
