// src/index.js
//
// weyland-cutsheetx-worker: standalone Cloudflare Worker owning
// CutSheetX's real route surface, extracted out of weylandai.com's
// monolith (src/legacy-monolith.js / weyland.worker.js) per the
// 2026-09-12 microservices push (MICROSERVICES_PUSH.md) and the same
// strangler-fig, Service-Binding-free (this product needs no
// cross-worker service binding) pattern already proven live by
// weyland-huntx-worker and weyland-subx-worker.
//
// No build step, no esbuild - plain ESM, `wrangler deploy` directly from
// source. Wrangler's own module resolution handles the one real npm
// dependency (pdf-lib, for cps-page-render.js's single-page PDF
// extraction) and the *.html text import (see wrangler.toml's [[rules]]
// block) without any manual bundling step of ours.
//
// THE REAL GAP THIS EXTRACTION CLOSES (not just a lift-and-shift):
// a completeness audit found CutSheetX had a real, working backend
// (local-index/local-search confirmed live, plus catalogue ingestion,
// FTS search, product matching, drafts, affirmation queue, discovery
// engine, verified-document registry - all ported below, verbatim) but
// ZERO discoverable customer-facing page. GET /cutsheetx 302'd straight
// to /pricing in production - confirmed by reading
// src/lib/marketing-pages.js's serve_cutsheetx(), a deliberate, honestly
// -commented redirect ("CutsheetX no longer has its own page"), not a
// bug. No other page fragment referencing CutSheetX's real search/match
// flow existed anywhere in src/pages/ or marketing-pages.js (grepped,
// not assumed) - only a pricing-grid checkout button and two passing nav
// mentions. This Worker adds a real one at GET /cutsheetx (src/pages/
// cutsheetx.html): a genuine local-catalogue + full-text search UI and a
// manufacturer/model cut-sheet matcher, calling the exact same backend
// routes ported below - no mock data, no fabricated results.
//
// Auth model for the new page: CutSheetX is one of the four products in
// lib/auth.js's EPHEMERAL_TRIAL_PRODUCTS allowlist (subx, takeoffx,
// cutsheetx, sightx) - a real, already-implemented AuthFor ephemeral-
// session mechanism (authfor-client.js's authenticateViaEphemeral,
// added 2026-09-09) that lets a visitor use the real product with no
// signup, "not yet wired into any product page" per that function's own
// header comment. This page is that wiring: it calls AuthFor's real
// POST /api/v1/ephemeral/create directly (same call index.html's
// landing-page trial already makes) to mint a token, then sends it as a
// normal Authorization Bearer header to every real API call below - no
// mocked auth, no bypass.
//
// Route inventory (all real, ported from the monolith's own
// src/routes/*.js - see each file's own header comment for its exact
// origin lines where one exists):
//   /api/cps/catalogues*           -> routes/cps-catalogues.js
//   /api/cps/search*               -> routes/cps-search.js
//   /api/cps/drafts*               -> routes/cps-drafts.js
//   /api/cps/mappings*             -> routes/cps-mappings.js
//   /api/cps/queue, /api/cps/extractions/*  -> routes/cps-queue.js
//   /api/cps/admin/*               -> routes/cps-admin.js
//   /api/cps/import-prices         -> routes/cps-import-prices.js
//   /api/cps/catalogues/:id/pages/:n/render -> routes/cps-page-render.js
//   /api/cut-sheets/match, /match-batch, /batch-match, /for-set/:id -> routes/cut-sheet-match.js
//   /api/cut-sheets/coverage (public), /request-manufacturer, /sheet/:id/pdf -> routes/cut-sheet-coverage.js
//   /api/cut-sheets/documents/:id, /download/:id -> routes/cut-sheet-documents.js
//   /api/cut-sheets/intelligence/*, /domains* -> routes/cut-sheet-intelligence.js
//   /api/cut-sheets/discover*, /discoveries* -> routes/cut-sheet-discoveries.js
//   /api/cut-sheets/verified       -> routes/cut-sheet-verified.js
//   /api/cut-sheets/local-search, /local-index -> routes/cut-sheet-local.js
//   /api/user/cutsheets*           -> routes/user-cutsheets.js
//   /api/catalogue/products        -> routes/catalogue-products.js
//   /api/catalogue/documents       -> routes/catalogue-documents.js
//   /cutsheetx                     -> real static page (src/pages/cutsheetx.html)
//
// DELIBERATELY EXCLUDED (documented, not silently dropped):
//   - src/routes/sessions-cutsheets.js: POST /api/sessions/:id/discover-
//     cut-sheets. Reads hardware_extraction_sessions/hardware_sets/
//     hardware_components - SubX's own extraction-session domain, not
//     CutSheetX's. Duplicating a route keyed to another product's session
//     lifecycle into this Worker would recreate the exact cross-product
//     coupling this migration is trying to strangle away from the
//     monolith, not extract cleanly. It stays in the monolith (and could
//     later move into weyland-subx-worker, which already owns the
//     hardware-schedule/session routes it depends on) rather than being
//     copied here.
//   - src/routes/door-schedule-marks.js: confirmed by reading its file -
//     operates on door-schedule review sessions, SubX's domain, not
//     CutSheetX's. Not part of this product's real route surface despite
//     living in the same directory.

import { NativeRouter } from "./lib/router.js";
import { createCorsHandler } from "./lib/cors.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { authenticate, authenticateCps, requireProductAccess } from "./lib/auth.js";
import { matchComponentToCutSheets } from "./lib/product-database.js";
import {
  LOCAL_CATALOGUE_INDEX, searchLocalCatalogue, getManufacturerDomains,
  getDiscoveryConfig, queueForDiscovery,
} from "./lib/cutsheet-discovery.js";
import { PDFDocument } from "pdf-lib";

import { registerCpsCataloguesRoutes } from "./routes/cps-catalogues.js";
import { registerCpsSearchRoutes } from "./routes/cps-search.js";
import { registerCpsDraftsRoutes } from "./routes/cps-drafts.js";
import { registerCpsMappingsRoutes } from "./routes/cps-mappings.js";
import { registerCpsQueueRoutes } from "./routes/cps-queue.js";
import { registerCpsAdminRoutes } from "./routes/cps-admin.js";
import { registerCpsImportPricesRoutes } from "./routes/cps-import-prices.js";
import { registerCpsPriceCandidatesRoutes } from "./routes/cps-price-candidates.js";
import { registerCpsPageRenderRoutes } from "./routes/cps-page-render.js";
import { registerCutSheetMatchRoutes } from "./routes/cut-sheet-match.js";
import { registerCutSheetDocumentsRoutes } from "./routes/cut-sheet-documents.js";
import { registerCutSheetCoverageRoutes } from "./routes/cut-sheet-coverage.js";
import { registerCutSheetIntelligenceRoutes } from "./routes/cut-sheet-intelligence.js";
import { registerCutSheetDiscoveriesRoutes } from "./routes/cut-sheet-discoveries.js";
import { registerCutSheetVerifiedRoutes } from "./routes/cut-sheet-verified.js";
import { registerCutSheetLocalRoutes } from "./routes/cut-sheet-local.js";
import { registerUserCutsheetsRoutes } from "./routes/user-cutsheets.js";
import { registerCatalogueProductsRoutes } from "./routes/catalogue-products.js";
import { registerCatalogueDocumentsRoutes } from "./routes/catalogue-documents.js";

import cutsheetxHtml from "./pages/cutsheetx.html";

const WORKER_VERSION = "2026-10-04.1";

const router = new NativeRouter();

router.all("*", (request2, env2) => createCorsHandler(env2).preflight(request2));

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-cutsheetx-worker",
  version: WORKER_VERSION,
}));

// --- Real static page: the new /cutsheetx product page (see header
// comment above for exactly what was missing and why this exists). ---
router.get("/cutsheetx", () => new Response(cutsheetxHtml, {
  headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
}));

registerCpsCataloguesRoutes(router, { authenticate });
registerCpsSearchRoutes(router, { authenticate });
registerCpsDraftsRoutes(router, { authenticate });
registerCpsMappingsRoutes(router, { authenticate });
registerCpsQueueRoutes(router, { authenticate });
registerCpsAdminRoutes(router, { authenticate });
registerCpsImportPricesRoutes(router, { authenticateCps });
registerCpsPriceCandidatesRoutes(router, { authenticate });
registerCpsPageRenderRoutes(router, { authenticate, PDFDocument });

registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess });
registerCutSheetDocumentsRoutes(router, { authenticate, requireProductAccess });
// 2026-10-04: match-batch lives in cut-sheet-match.js (same matcher);
// coverage (public), request-manufacturer, and sheet/:id/pdf live here.
registerCutSheetCoverageRoutes(router, { authenticate, requireProductAccess });
registerCutSheetIntelligenceRoutes(router, { authenticate, getDiscoveryConfig, getManufacturerDomains });
registerCutSheetDiscoveriesRoutes(router, { authenticate, queueForDiscovery, getManufacturerDomains });
registerCutSheetVerifiedRoutes(router, { authenticate, requireProductAccess });
registerCutSheetLocalRoutes(router, { authenticate, requireProductAccess, searchLocalCatalogue, LOCAL_CATALOGUE_INDEX });

registerUserCutsheetsRoutes(router, { authenticate });
registerCatalogueProductsRoutes(router, { authenticate });
registerCatalogueDocumentsRoutes(router, { authenticate });

// matchComponentToCutSheets: real, currently-unused-by-any-route-in-this-
// Worker export kept imported (not registered) only because
// product-database.js is ported as a whole file (its other export,
// enrichComponent, belongs to SubX and isn't imported here) - referencing
// it keeps linters/tree-shaking from flagging the unused import as dead
// code without a comment explaining why. cut-sheet-match.js imports its
// own copy of matchComponentToCutSheets directly from the same module, so
// this binding is genuinely redundant, not a missing wire-up.
void matchComponentToCutSheets;

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
};
