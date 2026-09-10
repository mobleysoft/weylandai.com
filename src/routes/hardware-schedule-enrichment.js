// src/routes/hardware-schedule-enrichment.js
//
// Product-database enrichment for extracted hardware components
// (rate-limited), a one-time backfill of any pending_review pages into
// real hardware_sets/hardware_components rows, and the affirm-status
// summary (how many groups/components across a session are still
// awaiting human review, and whether a submittal can be generated).
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// lines 150319-150562).
//
// enrichComponent stays an injected dependency rather than being
// extracted here: it calls findProductMatch(), which is core CPS/
// cut-sheet cluster logic (PRODUCT_DATABASE matching, step 8) still
// entangled and unextracted - same reasoning as pricing.js not
// absorbing the CPS routes it's shared with.
//
// storeHardwareExtraction is also injected: in the original inline
// code this resolved via an esbuild lazy-`__esm` module reference
// (`init_hardware_schedule_extractor()` + `hardware_schedule_extractor_exports`)
// that only exists inside legacy-monolith.js's bundled scope. The
// caller wraps that same lazy resolution in a plain async function so
// the real behavior (including its per-call re-resolution inside the
// backfill loop) is unchanged.
//
// getUnaffirmReason is injected too: still used by the not-yet-extracted
// component/group affirm routes elsewhere in legacy-monolith.js.

import { jsonResponse3 } from "../lib/json-response.js";

export function registerHardwareScheduleEnrichmentRoutes(router, { authenticate, checkRateLimit, enrichComponent, getUnaffirmReason, storeHardwareExtraction }) {
router.post("/api/hardware-schedule/session/:sessionId/enrich", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const rateLimit = await checkRateLimit(user.userId, "enrichment", env2, { requests: 10, windowSeconds: 60 });
  if (rateLimit.limited) {
    return jsonResponse3({
      error: "Rate limit exceeded",
      message: "Too many enrichment requests. Please wait before trying again.",
      retryAfter: rateLimit.retryAfter
    }, 429, {
      "Retry-After": rateLimit.retryAfter.toString(),
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": (Date.now() + rateLimit.retryAfter * 1e3).toString()
    });
  }
  try {
    const sessionId = request2.params.sessionId;
    console.log(`[Product Enrichment] Enriching session ${sessionId} (Rate Limit: ${rateLimit.remaining} remaining)`);
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    const components = await env2.DB.prepare(`
      SELECT hc.*, hs.set_number
      FROM hardware_components hc
      JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id = ?
    `).bind(sessionId).all();
    if (!components.results || components.results.length === 0) {
      return jsonResponse3({
        enriched: 0,
        message: "No components found to enrich"
      }, 200);
    }
    let enrichedCount = 0;
    const enrichmentResults = [];
    for (const component of components.results) {
      const enriched = enrichComponent(component);
      if (enriched._enriched) {
        await env2.DB.prepare(`
          UPDATE hardware_components
          SET
            component_description = COALESCE(component_description, ?),
            compliance = COALESCE(compliance, ?),
            notes = COALESCE(notes, '')
          WHERE id = ?
        `).bind(
          enriched.component_description,
          enriched.compliance,
          component.id
        ).run();
        enrichedCount++;
        enrichmentResults.push({
          set_number: component.set_number,
          component_type: component.component_type,
          matched_product: enriched._matched_product,
          confidence: enriched._enrichment_confidence
        });
      }
    }
    console.log(`[Product Enrichment] Enriched ${enrichedCount}/${components.results.length} components`);
    return jsonResponse3({
      enriched: enrichedCount,
      total: components.results.length,
      enrichment_rate: Math.round(enrichedCount / components.results.length * 100),
      results: enrichmentResults
    }, 200);
  } catch (error5) {
    console.error("[Product Enrichment] Error:", error5);
    return jsonResponse3({
      error: "Failed to enrich hardware schedule",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/backfill", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    console.log("[Backfill] Starting hardware data backfill...");
    const pendingPages = await env2.DB.prepare(`
      SELECT
        hpe.id,
        hpe.session_id,
        hpe.page_number,
        hpe.extracted_data,
        hes.user_id
      FROM hardware_page_extractions hpe
      JOIN hardware_extraction_sessions hes ON hpe.session_id = hes.id
      WHERE hpe.status = 'pending_review'
      ORDER BY hpe.session_id, hpe.page_number
    `).all();
    console.log(`[Backfill] Found ${pendingPages.results.length} pages to process`);
    let totalSets = 0;
    let totalComponents = 0;
    const results = [];
    for (const page of pendingPages.results) {
      try {
        const extractedData = JSON.parse(page.extracted_data);
        const hardwareGroups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
        if (hardwareGroups.length === 0) {
          results.push({
            session_id: page.session_id,
            page_number: page.page_number,
            status: "skipped",
            reason: "No hardware groups"
          });
          continue;
        }
        const result = await storeHardwareExtraction(extractedData, env2, page.user_id, {
          sessionId: page.session_id,
          pageNumber: page.page_number,
          pageExtractionId: page.id
        });
        totalSets += result.groups_inserted;
        totalComponents += result.components_inserted;
        await env2.DB.prepare(`
          UPDATE hardware_page_extractions
          SET status = 'approved',
              reviewed_at = ?,
              reviewed_by = ?
          WHERE id = ?
        `).bind((/* @__PURE__ */ new Date()).toISOString(), user.userId, page.id).run();
        results.push({
          session_id: page.session_id,
          page_number: page.page_number,
          status: "processed",
          sets: result.groups_inserted,
          components: result.components_inserted
        });
      } catch (pageError) {
        console.error(`[Backfill] Error processing page ${page.page_number}:`, pageError.message);
        results.push({
          session_id: page.session_id,
          page_number: page.page_number,
          status: "error",
          error: pageError.message
        });
      }
    }
    console.log(`[Backfill] Complete: ${totalSets} sets, ${totalComponents} components`);
    return jsonResponse3({
      success: true,
      pages_processed: pendingPages.results.length,
      total_sets_inserted: totalSets,
      total_components_inserted: totalComponents,
      results
    });
  } catch (error5) {
    console.error("[Backfill] Error:", error5);
    return jsonResponse3({
      error: "Backfill failed",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/affirm-status", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const pages = await env2.DB.prepare(`
      SELECT id, page_number, extracted_data, affirm_state
      FROM hardware_page_extractions
      WHERE session_id = ? AND status != 'rejected'
      ORDER BY page_number
    `).bind(sessionId).all();
    let totalGroups = 0;
    let affirmedGroups = 0;
    let totalComponents = 0;
    let affirmedComponents = 0;
    const unaffirmedItems = [];
    for (const page of pages.results) {
      const extractedData = JSON.parse(page.extracted_data || "{}");
      const affirmState = JSON.parse(page.affirm_state || "{}");
      const groups = extractedData.hardware_groups || extractedData.hardwareGroups || [];
      for (const group3 of groups) {
        totalGroups++;
        const groupAffirmData = affirmState.groups?.find((g) => g.id === group3.id || g.group_number === group3.group_number);
        const groupAffirmed = groupAffirmData?.affirmed || false;
        if (groupAffirmed) {
          affirmedGroups++;
        } else {
          unaffirmedItems.push({
            type: "group",
            pageNumber: page.page_number,
            groupNumber: group3.group_number,
            groupName: group3.group_name || group3.description,
            reason: getUnaffirmReason(group3, "group")
          });
        }
        const components = group3.components || [];
        for (let i = 0; i < components.length; i++) {
          const comp = components[i];
          totalComponents++;
          const compAffirmData = groupAffirmData?.components?.find((c) => c.index === i);
          const compAffirmed = compAffirmData?.affirmed || false;
          if (compAffirmed) {
            affirmedComponents++;
          } else {
            unaffirmedItems.push({
              type: "component",
              pageNumber: page.page_number,
              groupNumber: group3.group_number,
              componentIndex: i,
              componentType: comp.type || comp.component_type,
              reason: getUnaffirmReason(comp, "component")
            });
          }
        }
      }
    }
    const allAffirmed = affirmedGroups === totalGroups && affirmedComponents === totalComponents && totalGroups > 0;
    return jsonResponse3({
      success: true,
      sessionId,
      summary: {
        totalGroups,
        affirmedGroups,
        totalComponents,
        affirmedComponents,
        totalItems: totalGroups + totalComponents,
        affirmedItems: affirmedGroups + affirmedComponents,
        allAffirmed,
        canGenerateSubmittal: allAffirmed
      },
      unaffirmedItems: unaffirmedItems.slice(0, 50)
      // Limit for performance
    });
  } catch (error5) {
    console.error("[Affirm Status] Error:", error5);
    return jsonResponse3({ error: "Failed to get affirm status", details: error5.message }, 500);
  }
});
}
