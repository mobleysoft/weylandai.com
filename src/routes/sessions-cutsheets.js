import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, matchComponentToCutSheets: Function, queueForDiscovery: Function }} deps
 */
export function registerSessionsCutSheetsRoutes(router, { authenticate, matchComponentToCutSheets, queueForDiscovery }) {
  router.post("/api/sessions/:sessionId/discover-cut-sheets", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      console.log(`[Cut Sheet Discovery] Initiating discovery for session ${sessionId}`);
      const session = await env2.DB.prepare(`
        SELECT id, user_id, project_name, status
        FROM hardware_extraction_sessions
        WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const components = await env2.DB.prepare(`
        SELECT
          hc.id,
          hc.component_type,
          hc.manufacturer,
          hc.model,
          hc.catalog_number,
          hc.dhi_category,
          hs.set_number
        FROM hardware_components hc
        JOIN hardware_sets hs ON hc.set_id = hs.id
        WHERE hs.session_id = ?
        ORDER BY hs.set_number, hc.sequence_order
      `).bind(sessionId).all();
      if (!components.results || components.results.length === 0) {
        return jsonResponse3({
          success: true,
          message: "No components found in session",
          summary: { total: 0, withCutSheets: 0, queued: 0 }
        });
      }
      const results = {
        total: components.results.length,
        withCutSheets: 0,
        alreadyQueued: 0,
        newlyQueued: 0,
        skipped: 0,
        errors: [],
        queuedComponents: []
      };
      for (const comp of components.results) {
        try {
          const match = await matchComponentToCutSheets({
            manufacturer: comp.manufacturer,
            model: comp.model,
            catalog_number: comp.catalog_number,
            component_type: comp.component_type
          }, env2);
          if (match.matched && match.cutSheets.length > 0) {
            results.withCutSheets++;
            continue;
          }
          if (!comp.manufacturer || !comp.model && !comp.catalog_number) {
            results.skipped++;
            continue;
          }
          const queueResult = await queueForDiscovery({
            id: comp.id,
            manufacturer: comp.manufacturer,
            model: comp.model,
            catalog_number: comp.catalog_number,
            dhi_category: comp.dhi_category || comp.component_type
          }, user.userId, env2);
          if (queueResult.status === "already_queued") {
            results.alreadyQueued++;
          } else if (queueResult.status === "has_verified_sheet") {
            results.withCutSheets++;
          } else {
            results.newlyQueued++;
            results.queuedComponents.push({
              componentId: comp.id,
              queueId: queueResult.id,
              manufacturer: comp.manufacturer,
              model: comp.model || comp.catalog_number,
              setNumber: comp.set_number
            });
            if (env2.DISCOVERY_QUEUE) {
              try {
                await env2.DISCOVERY_QUEUE.send({
                  type: "discover",
                  queueItemId: queueResult.id,
                  componentId: comp.id,
                  manufacturer: comp.manufacturer,
                  model: comp.model,
                  catalogNumber: comp.catalog_number,
                  category: comp.dhi_category
                });
              } catch (queueError) {
                console.warn(`[Discovery Queue] Failed to send message: ${queueError.message}`);
              }
            }
          }
        } catch (compError) {
          results.errors.push({
            componentId: comp.id,
            error: compError.message
          });
        }
      }
      const coverageRate = results.total > 0 ? Math.round(results.withCutSheets / results.total * 100) : 0;
      console.log(`[Cut Sheet Discovery] Session ${sessionId}: ${results.withCutSheets}/${results.total} have cut sheets (${coverageRate}%), ${results.newlyQueued} newly queued`);
      return jsonResponse3({
        success: true,
        sessionId,
        project: session.project_name,
        summary: {
          total: results.total,
          withCutSheets: results.withCutSheets,
          alreadyQueued: results.alreadyQueued,
          newlyQueued: results.newlyQueued,
          skipped: results.skipped,
          coverageRate,
          needsDiscovery: results.total - results.withCutSheets
        },
        queuedComponents: results.queuedComponents.slice(0, 50),
        // Limit response size
        errors: results.errors.length > 0 ? results.errors.slice(0, 10) : void 0
      });
    } catch (error5) {
      console.error("[Cut Sheet Discovery] Error:", error5);
      return jsonResponse3({
        error: "Failed to initiate cut sheet discovery",
        details: error5.message
      }, 500);
    }
  });
  router.get("/api/sessions/:sessionId/cut-sheet-coverage", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const sessionId = request2.params.sessionId;
      const session = await env2.DB.prepare(`
        SELECT id, user_id, project_name
        FROM hardware_extraction_sessions
        WHERE id = ?
      `).bind(sessionId).first();
      if (!session) {
        return jsonResponse3({ error: "Session not found" }, 404);
      }
      if (session.user_id !== user.userId) {
        return jsonResponse3({ error: "Unauthorized" }, 403);
      }
      const components = await env2.DB.prepare(`
        SELECT
          hc.id,
          hc.component_type,
          hc.manufacturer,
          hc.model,
          hc.catalog_number,
          hs.set_number
        FROM hardware_components hc
        JOIN hardware_sets hs ON hc.set_id = hs.id
        WHERE hs.session_id = ?
      `).bind(sessionId).all();
      if (!components.results || components.results.length === 0) {
        return jsonResponse3({
          sessionId,
          project: session.project_name,
          coverage: { total: 0, withCutSheets: 0, rate: 0 },
          ready: true
        });
      }
      let withCutSheets = 0;
      let inQueue = 0;
      let pendingReview = 0;
      const missingByManufacturer = {};
      for (const comp of components.results) {
        const match = await matchComponentToCutSheets({
          manufacturer: comp.manufacturer,
          model: comp.model,
          catalog_number: comp.catalog_number,
          component_type: comp.component_type
        }, env2);
        if (match.matched && match.cutSheets.length > 0) {
          withCutSheets++;
        } else {
          const queueItem = await env2.DB.prepare(`
            SELECT id, status FROM cut_sheet_discovery_queue
            WHERE component_id = ? AND status IN ('pending', 'processing')
          `).bind(comp.id).first();
          if (queueItem) {
            inQueue++;
          } else {
            const discovery = await env2.DB.prepare(`
              SELECT id FROM cut_sheet_discoveries
              WHERE component_id = ? AND status = 'pending_review'
            `).bind(comp.id).first();
            if (discovery) {
              pendingReview++;
            }
          }
          const mfr = comp.manufacturer || "Unknown";
          missingByManufacturer[mfr] = (missingByManufacturer[mfr] || 0) + 1;
        }
      }
      const total = components.results.length;
      const coverageRate = Math.round(withCutSheets / total * 100);
      const ready = withCutSheets === total;
      return jsonResponse3({
        sessionId,
        project: session.project_name,
        coverage: {
          total,
          withCutSheets,
          inQueue,
          pendingReview,
          missing: total - withCutSheets - inQueue - pendingReview,
          rate: coverageRate
        },
        ready,
        missingByManufacturer: Object.entries(missingByManufacturer).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([mfr, count3]) => ({ manufacturer: mfr, count: count3 })),
        message: ready ? "All components have cut sheets" : `${total - withCutSheets} component(s) need cut sheets`
      });
    } catch (error5) {
      console.error("[Cut Sheet Coverage] Error:", error5);
      return jsonResponse3({
        error: "Failed to get cut sheet coverage",
        details: error5.message
      }, 500);
    }
  });
}
