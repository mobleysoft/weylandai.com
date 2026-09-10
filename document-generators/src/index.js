// weyland-document-generators-worker: the first real peeled-off module
// per WEYLAND_SUCCESSOR_ARCHITECTURE.md / WORKER_MODULARIZATION_MAP.md.
// Binding-only (no public route) - only reachable from weyland-gateway.
//
// registerDocumentGeneratorRoutes() and its own renderHtmlToPdf()/
// storeDocumentPdf()/makeDocumentDownloadRoute() (src/routes/document-
// generators.js) were already fully self-contained except for two
// injected deps: generateQuoteHtml (now a real import from
// src/lib/quote-html.js) and the @cloudflare/puppeteer client. In the
// monolith, puppeteer had to be injected from its own vendored/bundled
// copy to avoid two independently-resolved copies of the package
// existing in one bundle (see document-generators.js's own header
// comment). That constraint doesn't apply here - this is its own
// separate bundle, so puppeteer is a real, direct npm import.

import puppeteer from "@cloudflare/puppeteer";
import { NativeRouter } from "../../src/lib/router.js";
import { createCorsHandler } from "../../src/lib/cors.js";
import { generateQuoteHtml } from "../../src/lib/quote-html.js";
import { registerDocumentGeneratorRoutes } from "../../src/routes/document-generators.js";

const router = new NativeRouter();
registerDocumentGeneratorRoutes(router, { generateQuoteHtml, puppeteer });

export default {
  async fetch(request, env, ctx) {
    const cors = createCorsHandler(env);
    const preflight = cors.preflight(request);
    if (preflight) return preflight;
    const response = await router.handle(request, env, ctx);
    return cors.corsify(response, request);
  },
};
