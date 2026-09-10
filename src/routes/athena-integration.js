// src/routes/athena-integration.js
//
// Extracted from legacy-monolith.js's `// athena-integration-routes.js`
// esbuild module-boundary comment (~line 142456) and its companion
// `// session-readiness.js` boundary (~line 139553) - this is
// MONOLITH_HELPER_MAP.md's Cluster H (registerAthenaRoutes +
// jsonResponse2/generateId2/extractUrlPattern/extractSeries) extracted
// together with Cluster D (READINESS_STAGES/READINESS_WEIGHTS/
// calculateReadiness/cacheReadiness/listSessionsWithReadiness), since
// Cluster D's only real caller anywhere in the monolith was Cluster H
// (verified: calculateReadiness/listSessionsWithReadiness/
// cacheReadiness have zero call sites outside this function).
//
// This is the one real exception to WORKER_MODULARIZATION_MAP.md's
// "route extraction is 100% done" claim: `registerAthenaRoutes(router2,
// authenticate2)` is a genuine, live route-registration *function* that
// itself calls `router2.get/.post(...)` internally, which is why it
// evaded the flat `router.get(...)`-style grep the original extraction
// pass was built around.
//
// Three deliberate, non-mechanical adaptations made during this
// extraction (not silent - documented here since this phase's
// discipline is byte-exact extraction and these three points depart
// from that):
//
// 1. jsonResponse2 (a third duplicate of the same response-wrapper
//    pattern already extracted once as jsonResponse3 in
//    lib/json-response.js) is retired in favor of importing
//    jsonResponse3. The only behavioral difference between them is
//    jsonResponse2 sets `Access-Control-Allow-Origin: *` directly;
//    jsonResponse3 doesn't. This is a no-op in production because
//    every response from `router.handle()` is rebuilt by
//    `createCorsHandler(env).corsify()` before being returned to the
//    client (confirmed at legacy-monolith.js ~144868) - the same
//    reasoning already applied when jsonResponse3 itself was extracted.
//
// 2. generateId2 (only used once, for a "lup" learned-url-pattern id
//    prefix) is kept as a small local function, renamed to
//    generateId - it's genuinely self-contained and not worth
//    threading through the deps object for one call site.
//
// 3. The POST /api/sessions/:sessionId/assemble handler's PDFLib
//    resolution originally did `await
//    Promise.resolve().then(() => (init_es2(), es_exports))` - a
//    dynamic import of the vendored pdf-lib bundle via esbuild-internal
//    lazy-init symbols that don't exist as real exports outside
//    legacy-monolith.js. Real finding made during this extraction:
//    that whole handler is dead code in production today.
//    routes/sessions-assemble.js (extracted earlier in this effort)
//    registers the exact same "POST /api/sessions/:sessionId/assemble"
//    path, and NativeRouter's route table is a plain `Map` keyed by
//    "METHOD:path" (src/lib/router.js addRoute) - last registration
//    for a given key wins. registerAthenaRoutes used to run BEFORE
//    registerExtractedModules() in legacy-monolith.js's top-level
//    execution order, so sessions-assemble.js's handler was always the
//    one actually serving that route; this one was silently
//    unreachable. module-registry.js preserves that exact effective
//    behavior by registering this module's routes before
//    registerSessionsAssembleRoutes() - see the ordering comment there.
//    Since the handler is unreachable either way, its PDFLib
//    construction was simplified to reuse the same PDFDocument/
//    StandardFonts/rgb deps sessions-assemble.js already receives
//    (`const PDFLib = { PDFDocument, StandardFonts, rgb }`) rather than
//    inventing a new dep to carry the dead dynamic-import closure
//    across the module boundary. Left in place rather than deleted -
//    per this session's "ask before deleting, don't silently drop
//    dead code found mid-extraction" precedent (see the D1KVShim
//    finding in MONOLITH_HELPER_MAP.md Cluster I).
//
// esbuild's cosmetic __name(...) calls dropped throughout, same as
// every other extraction in this effort - see src/README.md.

import { jsonResponse3 } from "../lib/json-response.js";

var READINESS_STAGES = {
  NOT_STARTED: "not_started",
  EXTRACTING: "extracting",
  AWAITING_REVIEW: "awaiting_review",
  DISCOVERY_IN_PROGRESS: "discovery_in_progress",
  READY_FOR_ASSEMBLY: "ready_for_assembly",
  ASSEMBLED: "assembled",
  SUBMITTED: "submitted"
};
var READINESS_WEIGHTS = {
  extraction: 0.2,
  // 20% weight for extraction complete
  extractionApproved: 0.15,
  // 15% for human approval
  cutSheetCoverage: 0.35,
  // 35% for cut sheet coverage
  discoveryComplete: 0.15,
  // 15% for all discoveries done
  verified: 0.15
  // 15% for all cut sheets verified
};

async function calculateReadiness(sessionId, env2) {
  if (!env2?.DB) {
    return { error: "No database connection", readinessScore: 0 };
  }
  try {
    const session = await env2.DB.prepare(`
      SELECT
        id, project_name, filename, status,
        total_pages, pages_processed, pages_approved,
        total_components_extracted,
        created_at, updated_at
      FROM hardware_extraction_sessions
      WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return { error: "Session not found", readinessScore: 0 };
    }
    let componentCount = { unique_components: session.total_components_extracted || 0 };
    let discoveryStatus = { total: 0, pending: 0, discovered: 0, approved: 0, failed: 0 };
    let matchedCount = { matched: 0 };
    try {
      matchedCount = await env2.DB.prepare(`
        SELECT COUNT(*) as matched
        FROM session_cut_sheet_matches
        WHERE session_id = ? AND status IN ('matched', 'confirmed')
      `).bind(sessionId).first() || { matched: 0 };
    } catch (e) {
      console.log(`[Readiness] session_cut_sheet_matches query failed: ${e.message}`);
    }
    let assembled = false;
    try {
      const outputKey = `submittals/${sessionId}/final_submittal.pdf`;
      const exists = await env2.UPLOADS.head(outputKey);
      assembled = !!exists;
    } catch (e) {
    }
    const totalComponents = session.total_components_extracted || componentCount?.unique_components || 0;
    const discoveredCount = (discoveryStatus?.discovered || 0) + (discoveryStatus?.approved || 0);
    const matchedCutSheets = matchedCount?.matched || 0;
    const componentsWithCutSheets = Math.max(matchedCutSheets, discoveredCount);
    const cutSheetCoveragePct = totalComponents > 0 ? componentsWithCutSheets / totalComponents * 100 : 0;
    let score = 0;
    const extractionComplete = session.pages_processed >= session.total_pages;
    if (extractionComplete) {
      score += READINESS_WEIGHTS.extraction;
    } else if (session.total_pages > 0) {
      score += READINESS_WEIGHTS.extraction * (session.pages_processed / session.total_pages);
    }
    const extractionApproved = session.pages_approved >= session.total_pages;
    if (extractionApproved) {
      score += READINESS_WEIGHTS.extractionApproved;
    } else if (session.total_pages > 0) {
      score += READINESS_WEIGHTS.extractionApproved * (session.pages_approved / session.total_pages);
    }
    score += READINESS_WEIGHTS.cutSheetCoverage * (cutSheetCoveragePct / 100);
    const discoveryComplete = (discoveryStatus?.pending || 0) === 0 && discoveryStatus?.total > 0;
    if (discoveryComplete) {
      score += READINESS_WEIGHTS.discoveryComplete;
    }
    const allVerified = discoveryStatus?.approved === discoveryStatus?.total && discoveryStatus?.total > 0;
    if (allVerified) {
      score += READINESS_WEIGHTS.verified;
    } else if (discoveryStatus?.total > 0) {
      score += READINESS_WEIGHTS.verified * (discoveryStatus.approved / discoveryStatus.total);
    }
    let status = READINESS_STAGES.NOT_STARTED;
    if (assembled) {
      status = READINESS_STAGES.ASSEMBLED;
    } else if (score >= 0.85 && cutSheetCoveragePct >= 80) {
      status = READINESS_STAGES.READY_FOR_ASSEMBLY;
    } else if ((discoveryStatus?.pending || 0) > 0) {
      status = READINESS_STAGES.DISCOVERY_IN_PROGRESS;
    } else if (!extractionApproved && extractionComplete) {
      status = READINESS_STAGES.AWAITING_REVIEW;
    } else if (!extractionComplete && session.pages_processed > 0) {
      status = READINESS_STAGES.EXTRACTING;
    } else if (session.pages_processed === 0) {
      status = READINESS_STAGES.NOT_STARTED;
    }
    const result = {
      sessionId,
      projectName: session.project_name,
      // Overall readiness
      readinessScore: Math.round(score * 100) / 100,
      // Round to 2 decimals
      readinessStatus: status,
      readyForAssembly: status === READINESS_STAGES.READY_FOR_ASSEMBLY || status === READINESS_STAGES.ASSEMBLED,
      // Stage completion
      stages: {
        extraction: {
          complete: extractionComplete,
          approved: extractionApproved,
          pagesProcessed: session.pages_processed,
          totalPages: session.total_pages,
          pagesApproved: session.pages_approved
        },
        discovery: {
          triggered: discoveryStatus?.total > 0,
          complete: discoveryComplete,
          pending: discoveryStatus?.pending || 0,
          discovered: discoveryStatus?.discovered || 0,
          approved: discoveryStatus?.approved || 0,
          failed: discoveryStatus?.failed || 0
        },
        cutSheets: {
          totalComponents,
          componentsWithCutSheets,
          coveragePct: Math.round(cutSheetCoveragePct * 10) / 10,
          matchedCount: matchedCutSheets
        },
        assembly: {
          complete: assembled
        }
      },
      // Blockers (things preventing assembly)
      blockers: [],
      // Timestamps
      createdAt: session.created_at,
      lastActivityAt: session.updated_at,
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!extractionComplete) {
      result.blockers.push({
        type: "extraction_incomplete",
        message: `${session.total_pages - session.pages_processed} pages still need extraction`
      });
    }
    if (!extractionApproved && extractionComplete) {
      result.blockers.push({
        type: "awaiting_approval",
        message: `${session.total_pages - session.pages_approved} pages awaiting review`
      });
    }
    if ((discoveryStatus?.pending || 0) > 0) {
      result.blockers.push({
        type: "discovery_pending",
        message: `${discoveryStatus.pending} cut sheet discoveries in progress`
      });
    }
    if ((discoveryStatus?.failed || 0) > 0) {
      result.blockers.push({
        type: "discovery_failed",
        message: `${discoveryStatus.failed} cut sheet discoveries failed - may need manual resolution`
      });
    }
    if (cutSheetCoveragePct < 80) {
      result.blockers.push({
        type: "low_coverage",
        message: `Only ${Math.round(cutSheetCoveragePct)}% of components have cut sheets`
      });
    }
    await cacheReadiness(sessionId, result, env2);
    return result;
  } catch (error4) {
    console.error(`[Readiness] Calculation failed: ${error4.message}`);
    return {
      error: error4.message,
      readinessScore: 0,
      readinessStatus: READINESS_STAGES.NOT_STARTED
    };
  }
}

async function cacheReadiness(sessionId, result, env2) {
  if (!env2?.DB)
    return;
  try {
    await env2.DB.prepare(`
      INSERT INTO session_readiness (
        session_id, readiness_score, readiness_status,
        total_components, components_with_cut_sheets, cut_sheet_coverage_pct,
        extraction_complete, extraction_approved, discovery_triggered,
        discovery_complete, all_cut_sheets_verified, pdf_assembled,
        pending_discoveries, failed_discoveries, pending_approvals,
        calculated_at, last_action_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        readiness_score = excluded.readiness_score,
        readiness_status = excluded.readiness_status,
        total_components = excluded.total_components,
        components_with_cut_sheets = excluded.components_with_cut_sheets,
        cut_sheet_coverage_pct = excluded.cut_sheet_coverage_pct,
        extraction_complete = excluded.extraction_complete,
        extraction_approved = excluded.extraction_approved,
        discovery_triggered = excluded.discovery_triggered,
        discovery_complete = excluded.discovery_complete,
        all_cut_sheets_verified = excluded.all_cut_sheets_verified,
        pdf_assembled = excluded.pdf_assembled,
        pending_discoveries = excluded.pending_discoveries,
        failed_discoveries = excluded.failed_discoveries,
        pending_approvals = excluded.pending_approvals,
        calculated_at = CURRENT_TIMESTAMP
    `).bind(
      sessionId,
      result.readinessScore,
      result.readinessStatus,
      result.stages?.cutSheets?.totalComponents || 0,
      result.stages?.cutSheets?.componentsWithCutSheets || 0,
      result.stages?.cutSheets?.coveragePct || 0,
      result.stages?.extraction?.complete ? 1 : 0,
      result.stages?.extraction?.approved ? 1 : 0,
      result.stages?.discovery?.triggered ? 1 : 0,
      result.stages?.discovery?.complete ? 1 : 0,
      result.stages?.discovery?.approved === result.stages?.discovery?.discovered + result.stages?.discovery?.approved ? 1 : 0,
      result.stages?.assembly?.complete ? 1 : 0,
      result.stages?.discovery?.pending || 0,
      result.stages?.discovery?.failed || 0,
      (result.stages?.extraction?.totalPages || 0) - (result.stages?.extraction?.pagesApproved || 0),
      result.lastActivityAt
    ).run();
  } catch (e) {
    console.log(`[Readiness] Cache update failed: ${e.message}`);
  }
}

async function listSessionsWithReadiness(env2, options = {}) {
  if (!env2?.DB)
    return { sessions: [], total: 0 };
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const statusFilter = options.status;
  try {
    let query = `
      SELECT
        hes.id, hes.project_name, hes.status as extraction_status,
        hes.total_components_extracted, hes.created_at, hes.updated_at,
        COALESCE(sr.readiness_score, 0) as readiness_score,
        COALESCE(sr.readiness_status, 'not_started') as readiness_status
      FROM hardware_extraction_sessions hes
      LEFT JOIN session_readiness sr ON sr.session_id = hes.id
    `;
    if (statusFilter) {
      query += ` WHERE sr.readiness_status = ?`;
    }
    query += ` ORDER BY hes.updated_at DESC LIMIT ? OFFSET ?`;
    const params = statusFilter ? [statusFilter, limit, offset] : [limit, offset];
    const sessions2 = await env2.DB.prepare(query).bind(...params).all();
    let countQuery = `SELECT COUNT(*) as count FROM hardware_extraction_sessions hes`;
    if (statusFilter) {
      countQuery += ` LEFT JOIN session_readiness sr ON sr.session_id = hes.id WHERE sr.readiness_status = ?`;
    }
    const countResult = await env2.DB.prepare(countQuery).bind(...statusFilter ? [statusFilter] : []).first();
    return {
      sessions: sessions2.results || [],
      total: countResult?.count || 0,
      limit,
      offset
    };
  } catch (e) {
    console.log(`[Readiness] List query failed: ${e.message}`);
    return { sessions: [], total: 0 };
  }
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractUrlPattern(url, model) {
  if (!url || !model)
    return null;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.includes(model)) {
      const template = path.replace(model, "{model}");
      return {
        type: "url_template",
        value: `${parsed.origin}${template}`,
        series: extractSeries(model)
      };
    }
    const series = extractSeries(model);
    if (series && path.includes(series)) {
      const template = path.replace(new RegExp(series, "gi"), "{series}");
      return {
        type: "url_template",
        value: `${parsed.origin}${template}`,
        series
      };
    }
    return {
      type: "direct_url",
      value: url,
      series: null
    };
  } catch (e) {
    return null;
  }
}

function extractSeries(model) {
  if (!model)
    return null;
  const match = model.match(/^([A-Z]{1,3}\d{1,2})/i);
  if (match) {
    const prefix = match[1];
    if (/\d{4}/.test(prefix)) {
      return prefix.slice(0, -2) + "00";
    }
    return prefix;
  }
  return null;
}

/**
 * @param {object} router
 * @param {{
 *   authenticate: Function,
 *   persistSessionMatches: Function,
 *   matchComponentToCutSheet: Function,
 *   batchMatchSessionComponents: Function,
 *   queueForDiscovery: Function,
 *   retryFailedDiscoveries: Function,
 *   discoverWithRetry: Function,
 *   RETRY_CONFIG: object,
 *   assembleSubmittalPackage: Function,
 *   getAssemblyStatus: Function,
 *   PDFDocument: Function,
 *   StandardFonts: object,
 *   rgb: Function,
 * }} deps
 */
export function registerAthenaIntegrationRoutes(router, {
  authenticate,
  persistSessionMatches,
  matchComponentToCutSheet,
  batchMatchSessionComponents,
  queueForDiscovery,
  retryFailedDiscoveries,
  discoverWithRetry,
  RETRY_CONFIG,
  assembleSubmittalPackage,
  getAssemblyStatus,
  PDFDocument,
  StandardFonts,
  rgb,
}) {
  router.get("/api/sessions/:sessionId/readiness", async (request2, env2) => {
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      const readiness = await calculateReadiness(sessionId, env2);
      if (readiness.error === "Session not found") {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      return jsonResponse3(readiness);
    } catch (error4) {
      console.error("[Readiness] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.get("/api/sessions/readiness/list", async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const limit = parseInt(url.searchParams.get("limit")) || 20;
      const offset = parseInt(url.searchParams.get("offset")) || 0;
      const status = url.searchParams.get("status");
      const result = await listSessionsWithReadiness(env2, { limit, offset, status });
      return jsonResponse3(result);
    } catch (error4) {
      console.error("[Readiness] List error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/sessions/:sessionId/match-cut-sheets", async (request2, env2) => {
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      console.log(`[Match] Starting batch match for session ${sessionId}`);
      const matchResults = await persistSessionMatches(sessionId, env2);
      return jsonResponse3(matchResults);
    } catch (error4) {
      console.error("[Match] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/match-component", async (request2, env2) => {
    try {
      const body = await request2.json();
      const { manufacturer, model, catalogNumber } = body;
      if (!manufacturer && !model) {
        return jsonResponse3({ error: "Manufacturer or model required" }, 400);
      }
      const component = {
        manufacturer,
        model,
        catalog_number: catalogNumber
      };
      const match = await matchComponentToCutSheet(component, env2);
      return jsonResponse3({
        matched: !!match,
        component,
        cutSheet: match
      });
    } catch (error4) {
      console.error("[Match] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/sessions/:sessionId/trigger-discovery", async (request2, env2) => {
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      console.log(`[Discovery] Triggering discovery for session ${sessionId}`);
      const matchResults = await batchMatchSessionComponents(sessionId, env2);
      let queuedCount = 0;
      for (const missing of matchResults.missingCutSheets || []) {
        try {
          await queueForDiscovery({
            sessionId,
            manufacturer: missing.manufacturer,
            model: missing.model,
            catalogNumber: missing.catalogNumber,
            componentType: missing.componentType
          }, env2);
          queuedCount++;
        } catch (e) {
          console.log(`[Discovery] Failed to queue: ${e.message}`);
        }
      }
      return jsonResponse3({
        success: true,
        sessionId,
        alreadyMatched: matchResults.matched,
        queuedForDiscovery: queuedCount,
        matchCoverage: matchResults.total > 0 ? `${Math.round(matchResults.matched / matchResults.total * 100)}%` : "N/A"
      });
    } catch (error4) {
      console.error("[Discovery] Trigger error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/sessions/:sessionId/retry-discoveries", async (request2, env2) => {
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      console.log(`[Discovery] Retrying failed discoveries for session ${sessionId}`);
      const retryResults = await retryFailedDiscoveries(sessionId, env2);
      return jsonResponse3(retryResults);
    } catch (error4) {
      console.error("[Discovery] Retry error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/discover-with-retry", async (request2, env2) => {
    try {
      const body = await request2.json();
      const { manufacturer, model, catalogNumber, maxAttempts } = body;
      if (!manufacturer || !model) {
        return jsonResponse3({ error: "Manufacturer and model required" }, 400);
      }
      const component = {
        manufacturer,
        model,
        catalog_number: catalogNumber
      };
      const result = await discoverWithRetry(component, env2, {
        maxAttempts: maxAttempts || RETRY_CONFIG.maxAttempts
      });
      return jsonResponse3(result);
    } catch (error4) {
      console.error("[Discovery] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  // Dead code in production: routes/sessions-assemble.js registers the
  // same "POST /api/sessions/:sessionId/assemble" path and always wins
  // (see header comment). Preserved rather than deleted.
  router.post("/api/sessions/:sessionId/assemble", async (request2, env2) => {
    if (authenticate) {
      const { error: error4 } = await authenticate(request2, env2);
      if (error4)
        return error4;
    }
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      const readiness = await calculateReadiness(sessionId, env2);
      if (!readiness.readyForAssembly && readiness.readinessScore < 0.7) {
        return jsonResponse3({
          error: "Session not ready for assembly",
          readinessScore: readiness.readinessScore,
          blockers: readiness.blockers
        }, 400);
      }
      const body = await request2.json().catch(() => ({}));
      const PDFLib = { PDFDocument, StandardFonts, rgb };
      await persistSessionMatches(sessionId, env2);
      console.log(`[Assembly] Starting assembly for session ${sessionId}`);
      const result = await assembleSubmittalPackage(sessionId, {
        projectName: body.projectName,
        date: body.date,
        preparedBy: body.preparedBy,
        contractor: body.contractor,
        architect: body.architect,
        saveToR2: body.saveToR2 !== false
      }, env2, PDFLib);
      if (!result.success) {
        return jsonResponse3({
          error: "Assembly failed",
          errors: result.errors
        }, 500);
      }
      return jsonResponse3({
        success: true,
        sessionId,
        r2Key: result.r2Key,
        totalPages: result.totalPages,
        sections: result.sections,
        downloadUrl: result.r2Key ? `/api/sessions/${sessionId}/submittal/download` : null
      });
    } catch (error4) {
      console.error("[Assembly] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.get("/api/sessions/:sessionId/assembly-status", async (request2, env2) => {
    try {
      const sessionId = request2.params?.sessionId;
      if (!sessionId) {
        return jsonResponse3({ error: "Session ID required" }, 400);
      }
      const status = await getAssemblyStatus(sessionId, env2);
      return jsonResponse3(status);
    } catch (error4) {
      console.error("[Assembly] Status error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/cut-sheets/:discoveryId/approve-with-learning", async (request2, env2) => {
    try {
      const discoveryId = request2.params?.discoveryId;
      if (!discoveryId) {
        return jsonResponse3({ error: "Discovery ID required" }, 400);
      }
      const discovery = await env2.DB.prepare(`
        SELECT * FROM cut_sheet_discovery_queue WHERE id = ?
      `).bind(discoveryId).first();
      if (!discovery) {
        return jsonResponse3({ error: "Discovery not found" }, 404);
      }
      const url = discovery.discovered_url;
      if (url) {
        const urlPattern = extractUrlPattern(url, discovery.model);
        if (urlPattern) {
          try {
            const patternId = generateId("lup");
            await env2.DB.prepare(`
              INSERT INTO learned_url_patterns (
                id, manufacturer_slug, pattern_type, pattern_value,
                source_discovery_id, learned_from_model, applicable_to_series,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
              patternId,
              discovery.manufacturer?.toLowerCase().replace(/[^a-z0-9]/g, ""),
              urlPattern.type,
              urlPattern.value,
              discoveryId,
              discovery.model,
              urlPattern.series || null
            ).run();
            console.log(`[Learning] Saved pattern for ${discovery.manufacturer}: ${urlPattern.value}`);
          } catch (e) {
            console.log(`[Learning] Failed to save pattern: ${e.message}`);
          }
        }
      }
      await env2.DB.prepare(`
        UPDATE cut_sheet_discovery_queue
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(discoveryId).run();
      return jsonResponse3({
        success: true,
        discoveryId,
        patternLearned: !!url,
        message: "Cut sheet approved and pattern saved for future discoveries"
      });
    } catch (error4) {
      console.error("[Learning] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.get("/api/learned-patterns", async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const manufacturer = url.searchParams.get("manufacturer");
      let query = `
        SELECT * FROM learned_url_patterns
        WHERE times_used > 0
      `;
      if (manufacturer) {
        query += ` AND manufacturer_slug = ?`;
      }
      query += ` ORDER BY success_rate DESC, times_used DESC LIMIT 100`;
      const patterns = manufacturer ? await env2.DB.prepare(query).bind(manufacturer.toLowerCase()).all() : await env2.DB.prepare(query).all();
      return jsonResponse3({
        patterns: patterns.results || [],
        total: patterns.results?.length || 0
      });
    } catch (error4) {
      console.error("[Learning] Error:", error4);
      return jsonResponse3({ error: error4.message }, 500);
    }
  });
  router.post("/api/sessions/auto-generate-v2", async (request2, env2) => {
    return jsonResponse3({
      message: "Use /api/sessions/auto-generate then call /api/sessions/:id/trigger-discovery",
      workflow: [
        "POST /api/sessions/auto-generate (upload PDF, extract hardware)",
        "POST /api/sessions/:id/match-cut-sheets (match to existing)",
        "POST /api/sessions/:id/trigger-discovery (queue unmatched)",
        "GET /api/sessions/:id/readiness (check progress)",
        "POST /api/sessions/:id/assemble (when ready)"
      ]
    });
  });
  console.log("[Athena] Registered integration routes");
}
