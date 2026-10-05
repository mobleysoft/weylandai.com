// src/index.js
//
// weyland-subx-worker: standalone Cloudflare Worker owning SubX +
// TakeoffX's real route surface, extracted out of weylandai.com's
// monolith (src/legacy-monolith.js / weyland.worker.js) per the
// 2026-09-12 microservices push (MICROSERVICES_PUSH.md) and the same
// strangler-fig, Service-Binding pattern already proven live by
// weyland-ocr-worker and weyland-market-intelligence-worker.
//
// No build step, no esbuild - plain ESM, `wrangler deploy` directly from
// source (per direct 2026-09-12 instruction: no bundler for new work
// going forward). Wrangler's own module resolution handles the two real
// npm dependencies (pdf-lib, @cloudflare/puppeteer) and the *.html text
// imports (see wrangler.toml's [[rules]] block) without any manual
// bundling step of ours.
//
// Route inventory (all real, ported from the monolith's own
// src/routes/*.js - see each file's own header comment for its exact
// origin lines):
//   /api/submittals/*            -> routes/submittals.js
//   /api/hardware-schedule/*     -> routes/hardware-schedule-*.js (8 files)
//   /api/takeoff/*                -> routes/takeoff-data.js, takeoff-line-items.js
//   /subx-app, /subx, /takeoffx   -> real static pages (src/pages/*.html)
//
// KNOWN, DOCUMENTED GAPS (do not silently paper over these - see each
// file's own header for detail):
//   1. [FIXED 2026-10-02] hardware-schedule-candidates.js's two /preview
//      endpoints used to be a hard stub ("not yet ported"). Real fix:
//      getOrRenderPage (hardware-schedule-page-preview.js) reuses
//      renderRegionAt600DPI2's existing real Browser Rendering pipeline
//      (env.BROWSER + @cloudflare/puppeteer, already proven live for
//      region-extraction/submittal-generation) instead of the excluded
//      vendored engine - no new rendering infrastructure needed. Also
//      fixed a second, independent bug found while wiring this up: the
//      old drawBoundingBoxOverlay helper called `new OffscreenCanvas(...)`
//      directly in this Worker's bare isolate, which doesn't exist here at
//      all (confirmed live) - overlay drawing now happens inside the real
//      headless-browser render pass instead.
//   2. extractSinglePage (hardware-extraction-single-page.js) only ports
//      2 of the monolith's 3 fallback tiers (isolated-PDF via pdf-lib,
//      and direct-PDF) - tier 2 (image-render via the same excluded
//      rendering engine) is disabled, not faked. Real fallback behavior
//      (tier 1 -> tier 3) preserved.
//   3. ANTHROPIC_API_KEY is NOT configured on this worker, matching the
//      main weylandai-com-worker's own real gap (confirmed via `wrangler
//      secret list` on both - this is a genuine missing-credential gap
//      in production today, not something this extraction introduced or
//      is expected to fix).
//   4. QWEN_BRIDGE_CLIENT_ID/SECRET (needed by submittals.js's
//      /api/submittals/extract-from-text -> structureDoorScheduleFromText
//      -> callLocalQwen) are also not yet copied to this worker - real
//      secret values, not retrievable via the Cloudflare API from the
//      main worker's config. That one endpoint will 500 until those two
//      secrets are set here too.

import { trafficDrivenJob } from "./lib/job-lease.js";
import { sweepExpiredDemoClones, demoCloneSweepStatus } from "./lib/demo-clone-sweep.js";
import { NativeRouter } from "./lib/router.js";
import { createCorsHandler } from "./lib/cors.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { authenticate, authenticateCps, requireActiveSubscription, requireProductAccess } from "./lib/auth.js";
import { checkRateLimit } from "./rate-limit.js";
import { enrichComponent, matchComponentToCutSheets } from "./lib/product-database.js";
import {
  detectFileType, logTelemetryEvent, incrementSubmittalsUsed, callEdge, WORKER_VERSION,
} from "./lib/edge-telemetry.js";
import { transformDoorEntriesToHardwareSets, materializeDseToLineItems, generateSubmittalHTML } from "./lib/submittal-transforms.js";
import { detectSchedulePages, isPageInRange } from "./lib/hardware-extraction-prompts.js";
import {
  extractHardwareSchedule, storeHardwareExtraction, getHardwareGroupForReview, updateHardwareGroup,
  queuePageExtractionJob, buildExtractionResultFromVision, extractFromPageImage, createExtractionSession,
  getSessionStatus, approvePageExtraction, resolveExtractionContract, routeExtraction,
  persistDoorScheduleResponse, runEmbeddedGofaineatExtraction,
} from "./lib/hardware-extraction-pipeline.js";
import { resolveInferenceContract } from "./lib/hardware-extraction-vision-adapters.js";
import {
  pdfBufferOrNull, generateR2StreamUrl, getUnaffirmReason, dispatchVisionExtraction,
  structureDoorScheduleFromText, writeDoorScheduleEntries,
} from "./lib/hardware-extraction-vision-dispatch.js";
import { materializeAffirmedGroup, unaffirmMaterializedGroup } from "./lib/hardware-extraction-materialize.js";
import {
  extractSinglePage, savePageExtraction2, detectTextLayer2, extractPdfBookmarks2,
} from "./lib/hardware-extraction-single-page.js";
import { renderRegionAt600DPI2 } from "./lib/hardware-extraction-region-render.js";
import { getOrRenderPage } from "./lib/hardware-schedule-page-preview.js";

import { registerSubmittalsRoutes } from "./routes/submittals.js";
import { registerHardwareScheduleExportRoutes } from "./routes/hardware-schedule-export.js";
import { registerHardwareScheduleCandidatesRoutes } from "./routes/hardware-schedule-candidates.js";
import { registerHardwareScheduleEnrichmentRoutes } from "./routes/hardware-schedule-enrichment.js";
import { registerHardwareSchedulePageAffirmRoutes } from "./routes/hardware-schedule-page-affirm.js";
import { registerHardwareScheduleGenerateRoutes } from "./routes/hardware-schedule-generate.js";
import { registerHardwareSchedulePageExtractRoutes } from "./routes/hardware-schedule-page-extract.js";
import { registerHardwareScheduleFinalizeImageRoutes } from "./routes/hardware-schedule-finalize-image.js";
import { registerHardwareScheduleExtractRoutes } from "./routes/hardware-schedule-extract.js";
import { registerHardwareScheduleClientOcrAssetRoutes } from "./routes/hardware-schedule-client-ocr-assets.js";
import { registerTakeoffDataRoutes } from "./routes/takeoff-data.js";
import { registerTakeoffLineItemsRoutes } from "./routes/takeoff-line-items.js";

import subxAppHtml from "./pages/subx-app.html";
import subxHtml from "./pages/subx.html";
import takeoffxHtml from "./pages/takeoffx.html";

const router = new NativeRouter();

router.all("*", (request2, env2) => createCorsHandler(env2).preflight(request2));

router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-subx-worker",
  version: WORKER_VERSION,
}));

// --- Real static pages (subx-app is the actual app; subx/takeoffx are
// the product marketing pages that link into it) ---
router.get("/subx-app", () => new Response(subxAppHtml, {
  headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
}));
router.get("/subx", () => new Response(subxHtml, {
  headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
}));
router.get("/takeoffx", () => new Response(takeoffxHtml, {
  headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
}));

registerSubmittalsRoutes(router, {
  authenticate,
  logTelemetryEvent,
  dispatchVisionExtraction,
  structureDoorScheduleFromText,
});

registerHardwareScheduleExportRoutes(router);

registerHardwareScheduleCandidatesRoutes(router, {
  authenticate,
  getSessionStatus,
  getOrRenderPage,
});

registerHardwareScheduleEnrichmentRoutes(router, {
  authenticate,
  checkRateLimit,
  enrichComponent,
  getUnaffirmReason,
  storeHardwareExtraction,
});

registerHardwareSchedulePageAffirmRoutes(router, {
  authenticate,
  getSessionStatus,
  extractFromPageImage,
  materializeAffirmedGroup,
  unaffirmMaterializedGroup,
  pdfBufferOrNull,
  generateR2StreamUrl,
  isPageInRange,
  renderRegionAt600DPI2,
});

registerHardwareScheduleGenerateRoutes(router, {
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
  runEmbeddedGofaineatExtraction,
  transformDoorEntriesToHardwareSets,
  materializeDseToLineItems,
});


registerHardwareSchedulePageExtractRoutes(router, {
  authenticate,
  getSessionStatus,
  isPageInRange,
  extractFromPageImage,
  queuePageExtractionJob,
  approvePageExtraction,
  extractSinglePage,
  resolveExtractionContract,
  savePageExtraction2,
  writeDoorScheduleEntries,
});

registerHardwareScheduleFinalizeImageRoutes(router, {
  authenticate,
  callEdge,
  materializeDseToLineItems,
  transformDoorEntriesToHardwareSets,
  savePageExtraction2,
  buildExtractionResultFromVision,
  persistDoorScheduleResponse,
});

registerHardwareScheduleExtractRoutes(router, {
  authenticate,
  requireActiveSubscription,
  getSessionStatus,
  extractHardwareSchedule,
  storeHardwareExtraction,
  getHardwareGroupForReview,
  updateHardwareGroup,
  detectFileType,
  extractPdfBookmarks2,
  detectSchedulePages,
  createExtractionSession,
  logTelemetryEvent,
  detectTextLayer2,
});

registerHardwareScheduleClientOcrAssetRoutes(router);

registerTakeoffDataRoutes(router, { authenticate, requireProductAccess });
registerTakeoffLineItemsRoutes(router, { authenticate, requireProductAccess });

// resolveInferenceContract/authenticateCps are real, currently-unused-by-
// any-route-here exports kept imported (not registered) only to make an
// eventual future wiring gap visible at review time rather than a silent
// missing-import; harmless no-ops otherwise. Referencing them keeps
// linters/tree-shaking from flagging genuinely-intentional forward slack
// as dead code without a comment explaining why.
void resolveInferenceContract;
void authenticateCps;

// Demo-clone housekeeping (2026-10-05): public read-only status; the sweep
// itself only runs from scheduled() below.
router.get("/api/hardware-schedule/demo-clones/status", async (_request, env) => jsonResponse3(await demoCloneSweepStatus(env)));

// Cron observability (2026-10-05): every scheduled() invocation writes one
// row to weyland_db.cron_ticks before doing any work, so "the cron never
// fired" and "the cron fired and failed" can be told apart from D1 alone.
async function recordCronTick(env, worker, cron) {
  try {
    const db = env.DB;
    await db.prepare("CREATE TABLE IF NOT EXISTS cron_ticks (id TEXT PRIMARY KEY, worker TEXT NOT NULL, cron TEXT, fired_at TEXT NOT NULL)").run();
    await db.prepare("INSERT INTO cron_ticks (id, worker, cron, fired_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), worker, cron || null, new Date().toISOString()).run();
  } catch (e) {
    console.error("[cron-tick] " + worker + ": " + e.message);
  }
}

export default {
  async fetch(request, env, ctx) {
    // Traffic-driven freshness (2026-10-05): Cron Triggers on this account
    // are registered but have never fired (cron_ticks stays empty), so any
    // request may claim the D1 lease for this worker's background job and
    // run it via waitUntil. The visitor never waits; no request calls out.
    trafficDrivenJob(env, ctx, { db: env.DB, job: "demo-clone-sweep", cadenceSeconds: 3600, worker: "weyland-subx-worker", run: () => sweepExpiredDemoClones(env).then((s) => console.log("[demo-clone-sweep] traffic-driven", JSON.stringify(s))) });
    return router.handle(request, env, ctx);
  },

  // Hourly (wrangler.toml [triggers]): remove demo clones older than 24 h,
  // up to 40 per run, so the per-visitor demo never accumulates in D1.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(recordCronTick(env, "weyland-subx-worker", event && event.cron));
    ctx.waitUntil(
      sweepExpiredDemoClones(env)
        .then((s) => console.log("[demo-clone-sweep]", JSON.stringify(s)))
        .catch((e) => console.error("[demo-clone-sweep] failed:", e.message))
    );
  },
};
