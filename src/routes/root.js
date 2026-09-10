import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ WORKER_VERSION: string }} deps
 */
export function registerRootRoutes(router, { WORKER_VERSION }) {
  router.get("/", async (request2, env2) => {
    return jsonResponse3({
      name: "SubX API",
      version: WORKER_VERSION,
      description: "Construction documentation intelligence by HelmCorp",
      endpoints: {
        // auth block REMOVED (WO-2026-0611-HASCOM-001 Phase A): those four password
        // routes no longer exist — login is fleet magic-link at / (auth-onamerica).
        hardware: {
          extractSession: "POST /api/hardware/sessions/extract",
          listSessions: "GET /api/hardware/sessions",
          getSession: "GET /api/hardware/sessions/:sessionId",
          updateSession: "PUT /api/hardware/sessions/:sessionId",
          deleteSession: "DELETE /api/hardware/sessions/:sessionId",
          enrichProducts: "POST /api/hardware/sessions/:sessionId/enrich"
        },
        validation: {
          processQueue: "POST /api/validation-queue/process",
          getQueueStatus: "GET /api/validation-queue/:queueId"
        },
        cutSheetIntelligence: {
          metrics: "GET /api/cut-sheets/intelligence/metrics",
          config: "GET /api/cut-sheets/intelligence/config",
          domains: "GET /api/cut-sheets/domains",
          addDomain: "POST /api/cut-sheets/domains",
          verifyDomain: "POST /api/cut-sheets/domains/:domainId/verify",
          queueDiscovery: "POST /api/cut-sheets/queue",
          batchQueue: "POST /api/cut-sheets/queue/batch",
          pendingReview: "GET /api/cut-sheets/discoveries/pending",
          getDiscovery: "GET /api/cut-sheets/discoveries/:discoveryId",
          manualSubmit: "POST /api/cut-sheets/discoveries/manual",
          approve: "POST /api/cut-sheets/discoveries/:discoveryId/approve",
          reject: "POST /api/cut-sheets/discoveries/:discoveryId/reject",
          verified: "GET /api/cut-sheets/verified"
        },
        sessionCutSheets: {
          discoverCutSheets: "POST /api/sessions/:sessionId/discover-cut-sheets",
          getCoverage: "GET /api/sessions/:sessionId/cut-sheet-coverage"
        },
        catalogue: {
          listProducts: "GET /api/catalogue/products",
          searchProducts: "GET /api/catalogue/products/search?q=:query",
          getProduct: "GET /api/catalogue/products/:id",
          createProduct: "POST /api/catalogue/products",
          updateProduct: "PUT /api/catalogue/products/:id",
          deleteProduct: "DELETE /api/catalogue/products/:id",
          listDocuments: "GET /api/catalogue/documents",
          createDocument: "POST /api/catalogue/documents",
          updateDocument: "PUT /api/catalogue/documents/:id",
          deleteDocument: "DELETE /api/catalogue/documents/:id",
          bulkImport: "POST /api/catalogue/bulk-import"
        },
        submittalAssembly: {
          assemble: "POST /api/sessions/:sessionId/assemble",
          status: "GET /api/sessions/:sessionId/assemble/status",
          download: "GET /api/sessions/:sessionId/submittal/download"
        },
        cps: {
          listCatalogues: "GET /api/cps/catalogues",
          getCatalogue: "GET /api/cps/catalogues/:id",
          createCatalogue: "POST /api/cps/catalogues",
          searchCatalogues: "GET /api/cps/search?q=:query",
          listMappings: "GET /api/cps/mappings",
          createMapping: "POST /api/cps/mappings",
          affirmMapping: "PUT /api/cps/mappings/:id/affirm",
          affirmBatch: "POST /api/cps/mappings/affirm-batch",
          rejectMapping: "PUT /api/cps/mappings/:id/reject",
          getQueue: "GET /api/cps/queue",
          getExtraction: "GET /api/cps/extractions/:catalogueId/:cacheKey",
          renderPage: "GET /api/cps/catalogues/:catalogueId/pages/:pageNum/render",
          drafts: {
            list: "GET /api/cps/drafts",
            get: "GET /api/cps/drafts/:componentId",
            upsert: "PUT /api/cps/drafts",
            delete: "DELETE /api/cps/drafts/:componentId"
          },
          adminNormalizeSearchText: "POST /api/cps/admin/normalize-search-text",
          adminNormalizationStatus: "GET /api/cps/admin/normalization-status"
        },
        doorScheduleMarks: {
          listMarks: "GET /api/door-schedule/session/:sessionId/marks",
          affirmMark: "PATCH /api/door-schedule/mark/:markId/affirm",
          rejectMark: "PATCH /api/door-schedule/mark/:markId/reject",
          correctMark: "PATCH /api/door-schedule/mark/:markId/correct",
          batchAffirm: "POST /api/door-schedule/session/:sessionId/marks/batch-affirm",
          resolveHardware: "PATCH /api/door-schedule/mark/:markId/resolve-hardware",
          crossReference: "POST /api/projects/:projectId/cross-reference"
        }
      },
      documentation: "https://subx.weylandai.com",
      website: "https://weylandai.com",
      support: "support@weyland.onamerica.org"
    });
  });
}
