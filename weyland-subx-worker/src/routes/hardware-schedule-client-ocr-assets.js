// src/routes/hardware-schedule-client-ocr-assets.js
//
// Serves the real, vendored assets the BROWSER needs to run hardware_schedule
// (and eventually door_schedule) grid extraction entirely client-side: pdf.js
// (rendering - handles the full PDF spec, including the Form XObjects the
// custom Sovereign PDF Rasterizer doesn't support, so the earlier 2026-10-01
// client-side attempt's real blocker doesn't recur here) and tesseract-wasm
// (OCR, the same real engine already validated server-side in
// weyland-ocr-worker - see that file's extractGridTable for the full real
// validation history this client port reuses verbatim).
//
// Per direct instruction: no shipped extraction path should spend Cloudflare
// CPU on rendering/OCR when it can run in the customer's own tab instead -
// this is the reverse of weyland-ocr-worker's /extract-schedule-grid route
// (which still exists for other callers, not deleted), not a duplicate of it.
//
// All source files renamed to .bin at copy time (see wrangler.toml's own
// comment) - Wrangler's built-in module handling silently claims
// .wasm/.mjs-shaped extensions even with an explicit custom Data rule
// targeting them, producing a 0-byte response with no error (confirmed live
// 2026-10-01). Imported here as raw ArrayBuffers and served with the real
// Content-Type the browser actually needs for each asset.
import pdfLibBin from "../../assets/client-ocr/pdf.mjs.bin";
import pdfWorkerBin from "../../assets/client-ocr/pdf-worker.mjs.bin";
import tesseractLibBin from "../../assets/client-ocr/tesseract-wasm-lib.mjs.bin";
import tesseractCoreBin from "../../assets/client-ocr/tesseract-core.bin";
import tesseractCoreFallbackBin from "../../assets/client-ocr/tesseract-core-fallback.bin";
import engTrainedDataBin from "../../assets/client-ocr/eng-traineddata.bin";
import scheduleGridClientBin from "../../assets/client-ocr/schedule-grid-extraction-client.mjs.bin";

const ASSETS = {
  "pdf.mjs": { data: pdfLibBin, contentType: "text/javascript; charset=utf-8" },
  "pdf-worker.mjs": { data: pdfWorkerBin, contentType: "text/javascript; charset=utf-8" },
  "tesseract-wasm-lib.mjs": { data: tesseractLibBin, contentType: "text/javascript; charset=utf-8" },
  "tesseract-core.wasm": { data: tesseractCoreBin, contentType: "application/wasm" },
  "tesseract-core-fallback.wasm": { data: tesseractCoreFallbackBin, contentType: "application/wasm" },
  "eng-traineddata.bin": { data: engTrainedDataBin, contentType: "application/octet-stream" },
  "schedule-grid-extraction-client.mjs": { data: scheduleGridClientBin, contentType: "text/javascript; charset=utf-8" },
};

export function registerHardwareScheduleClientOcrAssetRoutes(router) {
  router.get("/api/hardware-schedule/client-ocr-assets/:name", (request2) => {
    const name = request2.params.name;
    const asset = ASSETS[name];
    if (!asset) {
      return new Response(JSON.stringify({ error: "unknown_asset", name }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(asset.data, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  });
}
