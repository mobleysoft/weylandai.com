// src/module-registry.js
//
// The ONLY file that should need editing to register a new extracted
// module's routes going forward. legacy-monolith.js imports exactly one
// name from here (registerExtractedModules) and calls it exactly once -
// that import + call site, established once, is not meant to be touched
// again. Adding a new module means: write the module under ./lib or
// ./routes with its own tests, add its import below, add its
// registration call inside registerExtractedModules(). Nothing in
// legacy-monolith.js itself changes.
//
// Deliberately excludes registerDocumentGeneratorRoutes: its deps
// (generateQuoteHtml, puppeteer_cloudflare_default) come from a lazy
// esbuild-vendored init block inside legacy-monolith.js that only
// resolves by the time that call site already runs today - moving it
// here risked a real execution-order break for a refactor that's about
// future extensibility, not touching working code. It stays exactly
// where it is.
//
// registerExtractedModules() itself is now called AFTER
// registerDocumentGeneratorRoutes() in legacy-monolith.js (moved
// 2026-09-10) so that renderHtmlToPdf/storeDocumentPdf/
// makeDocumentDownloadRoute - real nested closures only returned by that
// call - exist in time to be passed down into registerHuntLeadsRoutes().

import { registerProjectRoutes } from "./routes/projects.js";
import { registerDemoTrialRoutes } from "./routes/demo-trial.js";
import { registerHardwareScheduleExportRoutes } from "./routes/hardware-schedule-export.js";
import { registerAccessRequestRoutes } from "./routes/access-requests.js";
import { makeOperatorGate } from "./lib/operator-gate.js";
import { inviteViaAuthFor } from "./lib/authfor-invite.js";
import { registerSightXWalkthroughRoutes } from "./routes/sightx-walkthrough.js";
import { registerCrossReferenceRoutes } from "./routes/cross-reference.js";
import { registerVendorProfileRoutes } from "./routes/vendor-profile.js";
import { registerHuntLeadsRoutes } from "./routes/hunt-leads.js";
import { registerQuoteTemplatesRoutes } from "./routes/quote-templates.js";
import { registerPricingRoutes } from "./routes/pricing.js";
import { registerTakeoffDataRoutes } from "./routes/takeoff-data.js";
import { registerTakeoffLineItemsRoutes } from "./routes/takeoff-line-items.js";
import { registerQuotesViewRoutes } from "./routes/quotes-view.js";
import { registerQuotesGenerateRoutes } from "./routes/quotes-generate.js";
import { registerHardwareScheduleCandidatesRoutes } from "./routes/hardware-schedule-candidates.js";
import { registerHardwareScheduleEnrichmentRoutes } from "./routes/hardware-schedule-enrichment.js";
import { registerHardwareSchedulePageAffirmRoutes } from "./routes/hardware-schedule-page-affirm.js";
import { registerHardwareScheduleGenerateRoutes } from "./routes/hardware-schedule-generate.js";
import { registerHardwareSchedulePageExtractRoutes } from "./routes/hardware-schedule-page-extract.js";
import { registerHardwareScheduleFinalizeImageRoutes } from "./routes/hardware-schedule-finalize-image.js";
import { registerHardwareScheduleExtractRoutes } from "./routes/hardware-schedule-extract.js";
import { registerCutSheetMatchRoutes } from "./routes/cut-sheet-match.js";
import { registerCpsImportPricesRoutes } from "./routes/cps-import-prices.js";
import { registerCutSheetDocumentsRoutes } from "./routes/cut-sheet-documents.js";
import { registerCpsCataloguesRoutes } from "./routes/cps-catalogues.js";
import { registerCpsSearchRoutes } from "./routes/cps-search.js";
import { registerCpsDraftsRoutes } from "./routes/cps-drafts.js";
import { registerCpsMappingsRoutes } from "./routes/cps-mappings.js";
import { registerUserCutsheetsRoutes } from "./routes/user-cutsheets.js";
import { registerCpsQueueRoutes } from "./routes/cps-queue.js";
import { registerCpsAdminRoutes } from "./routes/cps-admin.js";
import { registerDoorScheduleMarksRoutes } from "./routes/door-schedule-marks.js";
import { registerCutSheetIntelligenceRoutes } from "./routes/cut-sheet-intelligence.js";
import { registerCutSheetDiscoveriesRoutes } from "./routes/cut-sheet-discoveries.js";
import { registerCutSheetVerifiedRoutes } from "./routes/cut-sheet-verified.js";
import { registerCutSheetLocalRoutes } from "./routes/cut-sheet-local.js";
import { registerCatalogueProductsRoutes } from "./routes/catalogue-products.js";
import { registerCatalogueDocumentsRoutes } from "./routes/catalogue-documents.js";
import { registerCpsPageRenderRoutes } from "./routes/cps-page-render.js";
import { registerSessionsListRoutes } from "./routes/sessions-list.js";
import { registerSessionsDetailRoutes } from "./routes/sessions-detail.js";
import { registerSessionsCutSheetsRoutes } from "./routes/sessions-cutsheets.js";
import { registerSessionsAssembleRoutes } from "./routes/sessions-assemble.js";
import { registerSessionsRecentRoutes } from "./routes/sessions-recent.js";
import { registerSessionsExtractionRouteRoutes } from "./routes/sessions-extraction-route.js";
import { registerSessionsQueueExtractionRoutes } from "./routes/sessions-queue-extraction.js";
import { registerSessionsFinalizeFromJobRoutes } from "./routes/sessions-finalize-from-job.js";
import { registerSessionsAutoGenerateRoutes } from "./routes/sessions-auto-generate.js";
import { registerSessionsPreviewRoutes } from "./routes/sessions-preview.js";
import { registerAuthSessionRoutes } from "./routes/auth-session.js";
import { registerInstallDeviceAuthRoutes } from "./routes/install-device-auth.js";
import { registerMeBridgeRoutes } from "./routes/me-bridge.js";
import { registerTelemetryRoutes } from "./routes/telemetry.js";
import { registerSubmittalsRoutes } from "./routes/submittals.js";
import { registerUploadRoutes } from "./routes/upload.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerInternalRoutes } from "./routes/internal.js";
import { registerHuntRoutes } from "./routes/hunt.js";
import { registerSubscriptionRoutes } from "./routes/subscription.js";
import { registerMarketIntelligenceRoutes } from "./routes/market-intelligence.js";
import { registerSystemStatusRoutes } from "./routes/system-status.js";
import { registerMiscUtilityRoutes } from "./routes/misc-utility.js";
import { registerWebhooksSubscriptionRoutes } from "./routes/webhooks-subscription.js";
import { authenticate, authenticateCps, requireActiveSubscription, requireProductAccess } from "./lib/auth.js";

/**
 * @param {object} router - the shared NativeRouter instance legacy-monolith.js owns.
 * @param {{
 *   transformDoorEntriesToHardwareSets: Function,
 *   materializeDseToLineItems: Function,
 *   renderHtmlToPdf: Function,
 *   storeDocumentPdf: Function,
 *   makeDocumentDownloadRoute: Function,
 *   puppeteer: object,
 *   getSessionStatus: Function,
 *   getOrRenderPage: Function,
 *   checkRateLimit: Function,
 *   enrichComponent: Function,
 *   getUnaffirmReason: Function,
 *   storeHardwareExtraction: Function,
 *   extractFromPageImage: Function,
 *   materializeAffirmedGroup: Function,
 *   unaffirmMaterializedGroup: Function,
 *   pdfBufferOrNull: Function,
 *   generateR2StreamUrl: Function,
 *   isPageInRange: Function,
 *   renderRegionAt600DPI2: Function,
 *   callEdge: Function,
 *   generateSubmittalHTML: Function,
 *   incrementSubmittalsUsed: Function,
 *   matchComponentToCutSheets: Function,
 *   queuePageExtractionJob: Function,
 *   routeExtraction: Function,
 *   approvePageExtraction: Function,
 *   extractSinglePage: Function,
 *   resolveExtractionContract: Function,
 *   resolveInferenceContract: Function,
 *   savePageExtraction2: Function,
 *   parseAndValidateExtraction: Function,
 *   generateId3: Function,
 *   errorResponse: Function,
 *   HASCOM_EDGE: string,
 *   dispatchVisionExtraction: Function,
 *   WEYLAND_PRODUCTS: object,
 *   CHECKOUT_READY_PRODUCTS: Set,
 *   stripeRequest: Function,
 *   WORKER_VERSION: string,
 *   WEYLAND_SUBCONP_PRODUCT_ID: string,
 *   verifyVendyaiForwardSignature: Function,
 *   verifyStripeWebhookSignature: Function,
 *   buildExtractionResultFromVision: Function,
 *   persistDoorScheduleResponse: Function,
 *   extractHardwareSchedule: Function,
 *   getHardwareGroupForReview: Function,
 *   updateHardwareGroup: Function,
 *   detectFileType: Function,
 *   extractPdfBookmarks2: Function,
 *   detectSchedulePages: Function,
 *   createExtractionSession: Function,
 *   logTelemetryEvent: Function,
 *   detectTextLayer2: Function,
 *   getDiscoveryConfig: Function,
 *   getManufacturerDomains: Function,
 *   queueForDiscovery: Function,
 *   searchLocalCatalogue: Function,
 *   LOCAL_CATALOGUE_INDEX: object,
 *   PDFDocument: Function,
 *   persistSessionMatches: Function,
 *   assembleSubmittalPackage: Function,
 *   getAssemblyStatus: Function,
 *   StandardFonts: object,
 *   rgb: Function,
 * }} deps
 *   Real dependencies still owned by legacy-monolith.js (not yet their
 *   own modules) that some of these routes need injected. renderHtmlToPdf/
 *   storeDocumentPdf/makeDocumentDownloadRoute come from
 *   registerDocumentGeneratorRoutes()'s return value, which is why this
 *   function is now called after that one (see header comment). puppeteer
 *   is the same @cloudflare/puppeteer client (legacy-monolith.js's
 *   puppeteer_cloudflare_default) that quotes-generate.js uses for its
 *   own inline PDF rendering, independent of document-generators.js.
 */
export function registerExtractedModules(router, deps) {
  registerHardwareScheduleExportRoutes(router);
  registerProjectRoutes(router, {
    transformDoorEntriesToHardwareSets: deps.transformDoorEntriesToHardwareSets,
    materializeDseToLineItems: deps.materializeDseToLineItems,
  });
  registerDemoTrialRoutes(router);
  registerAccessRequestRoutes(router, {
    requireOperator: makeOperatorGate(),
    invite: inviteViaAuthFor,
    ventureCode: "weyland",
  });
  registerSightXWalkthroughRoutes(router);
  registerCrossReferenceRoutes(router, { authenticate });
  registerVendorProfileRoutes(router, { authenticate });
  registerHuntLeadsRoutes(router, {
    authenticate,
    requireProductAccess,
    renderHtmlToPdf: deps.renderHtmlToPdf,
    storeDocumentPdf: deps.storeDocumentPdf,
    makeDocumentDownloadRoute: deps.makeDocumentDownloadRoute,
  });
  registerQuoteTemplatesRoutes(router, { authenticate });
  registerPricingRoutes(router, { authenticate, authenticateCps });
  registerTakeoffDataRoutes(router, { authenticate, requireProductAccess });
  registerTakeoffLineItemsRoutes(router, { authenticate, requireProductAccess });
  registerQuotesViewRoutes(router, { authenticate });
  registerQuotesGenerateRoutes(router, {
    authenticate,
    requireProductAccess,
    puppeteer: deps.puppeteer,
  });
  registerHardwareScheduleCandidatesRoutes(router, {
    authenticate,
    getSessionStatus: deps.getSessionStatus,
    getOrRenderPage: deps.getOrRenderPage,
  });
  registerHardwareScheduleEnrichmentRoutes(router, {
    authenticate,
    checkRateLimit: deps.checkRateLimit,
    enrichComponent: deps.enrichComponent,
    getUnaffirmReason: deps.getUnaffirmReason,
    storeHardwareExtraction: deps.storeHardwareExtraction,
  });
  registerHardwareSchedulePageAffirmRoutes(router, {
    authenticate,
    getSessionStatus: deps.getSessionStatus,
    extractFromPageImage: deps.extractFromPageImage,
    materializeAffirmedGroup: deps.materializeAffirmedGroup,
    unaffirmMaterializedGroup: deps.unaffirmMaterializedGroup,
    pdfBufferOrNull: deps.pdfBufferOrNull,
    generateR2StreamUrl: deps.generateR2StreamUrl,
    isPageInRange: deps.isPageInRange,
    renderRegionAt600DPI2: deps.renderRegionAt600DPI2,
  });
  registerHardwareScheduleGenerateRoutes(router, {
    authenticate,
    requireActiveSubscription,
    getSessionStatus: deps.getSessionStatus,
    generateR2StreamUrl: deps.generateR2StreamUrl,
    isPageInRange: deps.isPageInRange,
    pdfBufferOrNull: deps.pdfBufferOrNull,
    renderRegionAt600DPI2: deps.renderRegionAt600DPI2,
    callEdge: deps.callEdge,
    generateSubmittalHTML: deps.generateSubmittalHTML,
    incrementSubmittalsUsed: deps.incrementSubmittalsUsed,
    matchComponentToCutSheets: deps.matchComponentToCutSheets,
    queuePageExtractionJob: deps.queuePageExtractionJob,
    routeExtraction: deps.routeExtraction,
    transformDoorEntriesToHardwareSets: deps.transformDoorEntriesToHardwareSets,
    materializeDseToLineItems: deps.materializeDseToLineItems,
  });
  registerHardwareSchedulePageExtractRoutes(router, {
    authenticate,
    getSessionStatus: deps.getSessionStatus,
    isPageInRange: deps.isPageInRange,
    extractFromPageImage: deps.extractFromPageImage,
    queuePageExtractionJob: deps.queuePageExtractionJob,
    approvePageExtraction: deps.approvePageExtraction,
    extractSinglePage: deps.extractSinglePage,
    resolveExtractionContract: deps.resolveExtractionContract,
    savePageExtraction2: deps.savePageExtraction2,
  });
  registerHardwareScheduleFinalizeImageRoutes(router, {
    authenticate,
    callEdge: deps.callEdge,
    materializeDseToLineItems: deps.materializeDseToLineItems,
    transformDoorEntriesToHardwareSets: deps.transformDoorEntriesToHardwareSets,
    savePageExtraction2: deps.savePageExtraction2,
    buildExtractionResultFromVision: deps.buildExtractionResultFromVision,
    persistDoorScheduleResponse: deps.persistDoorScheduleResponse,
  });
  registerHardwareScheduleExtractRoutes(router, {
    authenticate,
    requireActiveSubscription,
    getSessionStatus: deps.getSessionStatus,
    extractHardwareSchedule: deps.extractHardwareSchedule,
    storeHardwareExtraction: deps.storeHardwareExtraction,
    getHardwareGroupForReview: deps.getHardwareGroupForReview,
    updateHardwareGroup: deps.updateHardwareGroup,
    detectFileType: deps.detectFileType,
    extractPdfBookmarks2: deps.extractPdfBookmarks2,
    detectSchedulePages: deps.detectSchedulePages,
    createExtractionSession: deps.createExtractionSession,
    logTelemetryEvent: deps.logTelemetryEvent,
    detectTextLayer2: deps.detectTextLayer2,
  });
  registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess });
  registerCpsImportPricesRoutes(router, { authenticateCps });
  registerCutSheetDocumentsRoutes(router, { authenticate, requireProductAccess });
  registerCpsCataloguesRoutes(router, { authenticate });
  registerCpsSearchRoutes(router, { authenticate });
  registerCpsDraftsRoutes(router, { authenticate });
  registerCpsMappingsRoutes(router, { authenticate });
  registerUserCutsheetsRoutes(router, { authenticate });
  registerCpsQueueRoutes(router, { authenticate });
  registerCpsAdminRoutes(router, { authenticate });
  registerDoorScheduleMarksRoutes(router, { authenticate });
  registerCutSheetIntelligenceRoutes(router, {
    authenticate,
    getDiscoveryConfig: deps.getDiscoveryConfig,
    getManufacturerDomains: deps.getManufacturerDomains,
  });
  registerCutSheetDiscoveriesRoutes(router, {
    authenticate,
    queueForDiscovery: deps.queueForDiscovery,
    getManufacturerDomains: deps.getManufacturerDomains,
  });
  registerCutSheetVerifiedRoutes(router, { authenticate, requireProductAccess });
  registerCutSheetLocalRoutes(router, {
    authenticate,
    requireProductAccess,
    searchLocalCatalogue: deps.searchLocalCatalogue,
    LOCAL_CATALOGUE_INDEX: deps.LOCAL_CATALOGUE_INDEX,
  });
  registerCatalogueProductsRoutes(router, { authenticate });
  registerCatalogueDocumentsRoutes(router, { authenticate });
  registerCpsPageRenderRoutes(router, { authenticate, PDFDocument: deps.PDFDocument });
  registerSessionsListRoutes(router, { authenticate });
  registerSessionsDetailRoutes(router, { authenticate });
  registerSessionsCutSheetsRoutes(router, {
    authenticate,
    matchComponentToCutSheets: deps.matchComponentToCutSheets,
    queueForDiscovery: deps.queueForDiscovery,
  });
  registerSessionsAssembleRoutes(router, {
    authenticate,
    persistSessionMatches: deps.persistSessionMatches,
    assembleSubmittalPackage: deps.assembleSubmittalPackage,
    getAssemblyStatus: deps.getAssemblyStatus,
    PDFDocument: deps.PDFDocument,
    StandardFonts: deps.StandardFonts,
    rgb: deps.rgb,
  });
  registerSessionsRecentRoutes(router, { authenticate });
  registerSessionsExtractionRouteRoutes(router, { authenticate });
  registerSessionsQueueExtractionRoutes(router, {
    authenticate,
    resolveExtractionContract: deps.resolveExtractionContract,
    resolveInferenceContract: deps.resolveInferenceContract,
    callEdge: deps.callEdge,
  });
  registerSessionsFinalizeFromJobRoutes(router, {
    authenticate,
    callEdge: deps.callEdge,
    persistDoorScheduleResponse: deps.persistDoorScheduleResponse,
    transformDoorEntriesToHardwareSets: deps.transformDoorEntriesToHardwareSets,
    materializeDseToLineItems: deps.materializeDseToLineItems,
    parseAndValidateExtraction: deps.parseAndValidateExtraction,
  });
  registerSessionsAutoGenerateRoutes(router, {
    authenticate,
    generateId3: deps.generateId3,
    extractPdfBookmarks2: deps.extractPdfBookmarks2,
    extractSinglePage: deps.extractSinglePage,
  });
  registerSessionsPreviewRoutes(router, { authenticate });
  registerAuthSessionRoutes(router, { authenticate, errorResponse: deps.errorResponse });
  registerInstallDeviceAuthRoutes(router, { authenticate, callEdge: deps.callEdge });
  registerMeBridgeRoutes(router, { authenticate, callEdge: deps.callEdge, HASCOM_EDGE: deps.HASCOM_EDGE });
  registerTelemetryRoutes(router, { authenticate });
  registerSubmittalsRoutes(router, {
    authenticate,
    logTelemetryEvent: deps.logTelemetryEvent,
    dispatchVisionExtraction: deps.dispatchVisionExtraction,
  });
  registerUploadRoutes(router, {
    authenticate,
    detectFileType: deps.detectFileType,
    extractPdfBookmarks2: deps.extractPdfBookmarks2,
    detectSchedulePages: deps.detectSchedulePages,
    createExtractionSession: deps.createExtractionSession,
    logTelemetryEvent: deps.logTelemetryEvent,
  });
  registerBillingRoutes(router, {
    WEYLAND_PRODUCTS: deps.WEYLAND_PRODUCTS,
    CHECKOUT_READY_PRODUCTS: deps.CHECKOUT_READY_PRODUCTS,
    stripeRequest: deps.stripeRequest,
  });
  registerInternalRoutes(router);
  registerHuntRoutes(router, { authenticate });
  registerSubscriptionRoutes(router, { authenticate, errorResponse: deps.errorResponse });
  registerMarketIntelligenceRoutes(router);
  registerSystemStatusRoutes(router, { authenticate, WORKER_VERSION: deps.WORKER_VERSION });
  registerMiscUtilityRoutes(router, {
    authenticate,
    callEdge: deps.callEdge,
    errorResponse: deps.errorResponse,
  });
  registerWebhooksSubscriptionRoutes(router, {
    WEYLAND_PRODUCTS: deps.WEYLAND_PRODUCTS,
    WEYLAND_SUBCONP_PRODUCT_ID: deps.WEYLAND_SUBCONP_PRODUCT_ID,
    verifyVendyaiForwardSignature: deps.verifyVendyaiForwardSignature,
    verifyStripeWebhookSignature: deps.verifyStripeWebhookSignature,
  });
}
