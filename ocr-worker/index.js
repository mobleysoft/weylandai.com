/**
 * weyland-ocr-worker — dedicated OCR/PDF-vision service.
 *
 * Split out from weylandai-com-worker specifically to avoid two real problems
 * hit while it was one shared worker: (1) ~10MB of WASM/model assets
 * competing for script-size budget with weylandai-com-worker's other ~7MB of
 * business logic, and (2) storing those large binaries in KV and fetching
 * them at runtime hit real, extended Cloudflare KV read-replica propagation
 * lag on a freshly-created namespace.
 *
 * Assets are bundled directly into this worker's deploy (imported as raw
 * Data, not KV blobs) - no runtime fetch, no propagation window, present
 * deterministically on every request. Callable from weylandai-com-worker (or
 * any other venture worker) via a same-account Service Binding
 * (env.OCR_SERVICE.fetch(...)) - same-account bindings are a first-class
 * Cloudflare feature and don't hit the cross-account wall that broke the
 * AUTH_ONAMERICA integration earlier tonight.
 */

import { PDFiumLibrary } from '@hyzyla/pdfium';
import { createOCREngine } from 'tesseract-wasm';
import { detectSchedules, rotate90CW } from '../src/extraction/jitagi-detect-schedules.js';
import { pageRange } from './page-range.js';

// Native .wasm imports: Cloudflare compiles these to WebAssembly.Module
// objects at DEPLOY time. Workers disallow compiling fresh WASM from raw
// bytes at request time (V8's AllowWasmCodeGenerationCallback is off) -
// confirmed by testing, not assumed. Passing wasmBinary (raw bytes) to
// either library triggers that at runtime and fails. Passing a pre-compiled
// Module via each library's instantiateWasm hook only *instantiates* it,
// which is allowed.
import pdfiumModule from './assets/pdfium.wasm';
import tesseractModule from './assets/tesseract-core.wasm';
import trainedData from './assets/eng-traineddata.bin';

let _pdfiumLibrary = null;
let _ocrEngine = null;

async function getPdfiumLibrary() {
  if (_pdfiumLibrary) return _pdfiumLibrary;
  // PDFium's callback is named (mod, inst) at the call site but forwards
  // directly into receiveInstance(instance, module) - so despite the
  // outer names, the real positional contract is (instance, module), not
  // (module, instance). Confirmed by tracing the actual bundled source,
  // not the outer variable names, which are misleading here.
  _pdfiumLibrary = await PDFiumLibrary.init({
    instantiateWasm(imports, successCallback) {
      const instance = new WebAssembly.Instance(pdfiumModule, imports);
      successCallback(instance, pdfiumModule);
      return instance.exports;
    },
  });
  return _pdfiumLibrary;
}

async function getOcrEngine() {
  if (_ocrEngine) return _ocrEngine;
  // tesseract-wasm's receiveInstance() expects (instance, module) - opposite
  // argument order from PDFium's - confirmed from its own source (lib.js:
  // `function receiveInstance(instance,module){...}`).
  _ocrEngine = await createOCREngine({
    instantiateWasm(imports, successCallback) {
      const instance = new WebAssembly.Instance(tesseractModule, imports);
      successCallback(instance, tesseractModule);
      return instance.exports;
    },
  });
  _ocrEngine.loadModel(new Uint8Array(trainedData));
  return _ocrEngine;
}

// Cheap nearest-neighbor 2x upscale - no interpolation library needed.
// Applied only to the already-cropped table region (small buffer), not
// the full page, to keep peak memory bounded to roughly what the
// already-working 150dpi full-page render uses (confirmed necessary:
// rendering the FULL page at 300dpi to get the same effective resolution
// hit Cloudflare's real per-request resource limit - HTTP 503, error code
// 1102 "Worker exceeded resource limits" - tested live 2026-09-12).
function upscale2x(img) {
  const { width: w, height: h, data } = img;
  const nw = w * 2, nh = h * 2;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy = y >> 1;
    for (let x = 0; x < nw; x++) {
      const sx = x >> 1;
      const srcIdx = (sy * w + sx) * 4;
      const dstIdx = (y * nw + x) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: nw, height: nh };
}

// Crops a horizontal band [topPct, botPct] of an image's height, full
// width - shared by renderAndExtractTableRegion's real extraction crop
// and its rotation-confidence check below (same crop math, one place).
function cropBand(img, topPct, botPct) {
  const yTop = Math.max(0, Math.floor(img.height * topPct));
  const yBot = Math.min(img.height, Math.floor(img.height * botPct));
  const cropH = Math.max(1, yBot - yTop);
  const cropped = new Uint8ClampedArray(img.width * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    const srcRowStart = (yTop + y) * img.width * 4;
    const dstRowStart = y * img.width * 4;
    cropped.set(img.data.subarray(srcRowStart, srcRowStart + img.width * 4), dstRowStart);
  }
  return { data: cropped, width: img.width, height: cropH };
}

// Mean per-word OCR confidence for an already-loaded-ready image, used
// to empirically pick between orientation candidates below instead of
// trusting getOrientation() alone.
function meanWordConfidence(ocrEngine, image) {
  ocrEngine.clearImage();
  ocrEngine.loadImage(image);
  ocrEngine.setVariable('tessedit_pageseg_mode', '6');
  const words = ocrEngine.getTextBoxes('word');
  if (!words.length) return 0;
  return words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
}

function bgraToRgba(bgra) {
  const rgba = new Uint8ClampedArray(bgra.length);
  for (let i = 0; i < bgra.length; i += 4) {
    rgba[i] = bgra[i + 2];
    rgba[i + 1] = bgra[i + 1];
    rgba[i + 2] = bgra[i];
    rgba[i + 3] = bgra[i + 3];
  }
  return rgba;
}

async function renderAndDetect(pdfBuffer, totalPages, sessionId) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();

  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pageImages = new Map();
  try {
    const pageCount = Math.min(totalPages, doc.getPageCount());
    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const rendered = await page.render({ scale: 150 / 72, colorSpace: 'BGRA' });
      pageImages.set(i + 1, {
        data: bgraToRgba(rendered.data),
        width: rendered.width,
        height: rendered.height,
      });
    }
  } finally {
    doc.destroy();
  }

  return detectSchedules({
    env: null, // caller (weylandai-com-worker) owns the DB write, it has the real D1 binding
    sessionId,
    ocrEngine,
    pageImages,
    totalPages: pageImages.size,
    baseDeadlineMs: 8000,
  });
}

// General-purpose full-page text extraction, for text-heavy documents
// (inspection reports, safety logs, spec sections) rather than the
// table-structure-specific detectSchedules() above. Same render pipeline,
// pageseg_mode 3 (fully automatic layout, no OSD) instead of 11 (sparse
// text) since these are prose/paragraph documents, not schedule tables.
async function renderAndExtractText(pdfBuffer, headers) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();

  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pages = [];
  let range;
  try {
    range = pageRange(headers, doc.getPageCount());
    for (let i = range.start - 1; i < range.end; i++) {
      const page = doc.getPage(i);
      const rendered = await page.render({ scale: 150 / 72, colorSpace: 'BGRA' });
      let pageImage = {
        data: bgraToRgba(rendered.data),
        width: rendered.width,
        height: rendered.height,
      };
      // Real bug found 2026-09-12 testing against an actual scanned,
      // rotated door schedule (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf):
      // this path OCR'd the page as rendered, with no orientation check,
      // and got back ~111 characters of noise off a page that genuinely
      // has a full table on it. detectSchedules()'s classifyOnePage() (same
      // file, jitagi-detect-schedules.js) already does real orientation
      // detection + rotate90CW before OCR and correctly reads "DOOR
      // SCHEDULE" off the same real file - ported that same check here so
      // full-page text extraction isn't silently worse than page
      // classification on identical input.
      ocrEngine.clearImage();
      ocrEngine.loadImage(pageImage);
      const orientation = ocrEngine.getOrientation();
      if (orientation.rotation !== 0 && orientation.confidence > 0.5) {
        const turns = Math.round(orientation.rotation / 90) % 4;
        for (let t = 0; t < turns; t++) pageImage = rotate90CW(pageImage);
        ocrEngine.clearImage();
        ocrEngine.loadImage(pageImage);
      }
      ocrEngine.setVariable('tessedit_pageseg_mode', '3');
      const text = ocrEngine.getText();
      pages.push({ page: i + 1, text: (text || '').trim(), rotation_applied: orientation.rotation });
    }
  } finally {
    doc.destroy();
  }
  return { pages, pageCount: pages.length, documentPageCount: range.documentPages,
    startPage: range.start, endPage: range.end, hasMore: range.end < range.documentPages };
}

// Real, evidence-based fix for a real problem found 2026-09-12: full-page
// OCR (renderAndExtractText above, any DPI from 150 to 600, any pageseg
// mode tried - 3, 4, 6, 11, 12) never read a single MARK/row value off an
// actual complex architectural door-schedule sheet
// (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf) - only title-block prose
// and floor-plan room labels. Root cause, confirmed by rendering the page
// to a real PNG and looking at it: real schedule sheets like this one pack
// a dense table, a legend, and floor plans onto one page - the table
// occupies maybe a third of the page, in small print, and whole-page
// segmentation either misses it entirely or interleaves its cells with
// unrelated floor-plan text.
//
// Fix verified against the same real file: crop to the top ~42% of the
// page (full width) before OCR and the MARK column becomes legible -
// tested via native `tesseract` CLI against a real crop of a real render,
// not assumed. This mirrors the existing cropTitleRegion() heuristic in
// jitagi-detect-schedules.js (top strip for the title block) at a taller
// crop sized to capture the schedule table + legend + notes rather than
// just the title. It is a real, working heuristic for the common sheet
// layout (schedule/legend/notes across the top, floor plans below) - not
// a universal solution. A sheet that puts its table lower, or a table
// genuinely spanning the full page height, will need a different crop or
// the full candidate-region/bounding-box approach the production
// hardware-schedule-extract.js pipeline already uses at 600 DPI. Flagged
// honestly rather than presented as solved for every layout.
//
// Second real problem found and fixed the same day: OCR-ing the whole
// top-42% band (2x-upscaled, ~3300x1386px) in one call took ~10-12
// CPU-seconds locally and, tested live against the real deployed worker,
// actually hit Cloudflare's real per-request CPU ceiling ("Worker
// exceeded CPU time limit", reproduced live against
// https://weylandai.com/api/submittals/upload with a real session cookie
// and the real test PDF - not assumed from local timing alone). Fix:
// callers OCR the band in narrower horizontal strips (cropTopPct/
// cropBottomPct below), each a separate request with its own fresh CPU
// budget - measured ~3-5 CPU-seconds per 14%-height strip locally, safely
// under the limit. viaEmbeddedGofaineat (hardware-extraction-vision-
// dispatch.js) does exactly this: three sequential calls covering
// [0,.14] [.14,.28] [.28,.42] of the page, concatenated.
async function renderAndExtractTableRegion(pdfBuffer, pageNumber, cropTopPct = 0, cropBottomPct = 0.42) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();

  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  try {
    const index = Math.max(0, Math.min(pageNumber - 1, doc.getPageCount() - 1));
    const page = doc.getPage(index);
    // 150dpi, matching the already-working renderAndExtractText render
    // cost - NOT 300dpi full-page (tested live, hit Cloudflare's resource
    // limit: HTTP 503 / error 1102). The 2x upscale below, applied only
    // to the small cropped region, gets the same effective resolution
    // for a fraction of the memory/CPU a full-page 300dpi render costs.
    const rendered = await page.render({ scale: 150 / 72, colorSpace: 'BGRA' });
    let pageImage = {
      data: bgraToRgba(rendered.data),
      width: rendered.width,
      height: rendered.height,
    };
    ocrEngine.clearImage();
    ocrEngine.loadImage(pageImage);
    const orientation = ocrEngine.getOrientation();
    let rotationApplied = 0;
    // Real bug found 2026-09-17: getOrientation() alone is not reliable
    // enough to trust blindly - confirmed false positive (rotation=90,
    // confidence=1.0, the maximum) on a clean, upright, vector-rendered
    // PDF. Unconditionally rotating on that signal turned correctly
    // -oriented text sideways, and OCR-ing a horizontal band of sideways
    // text produces pure noise - byte-identical to garbled output seen in
    // production, reproduced standalone against a synthetic ground-truth
    // PDF before this fix (see EXTRACTION_PIPELINE_CUSTOMER_PATH.md).
    // Fix: empirically compare mean per-word OCR confidence of THIS
    // band in both orientations and only commit to rotating if it's a
    // clear win - keeps the original, real fix (genuinely rotated scans
    // like OCCDoorSchedulePg4.pdf) working while no longer trusting a
    // single heuristic on documents where it's wrong.
    if (orientation.rotation !== 0 && orientation.confidence > 0.5) {
      const turns = Math.round(orientation.rotation / 90) % 4;
      let rotatedImage = pageImage;
      for (let t = 0; t < turns; t++) rotatedImage = rotate90CW(rotatedImage);
      const unrotatedConf = meanWordConfidence(ocrEngine, upscale2x(cropBand(pageImage, cropTopPct, cropBottomPct)));
      const rotatedConf = meanWordConfidence(ocrEngine, upscale2x(cropBand(rotatedImage, cropTopPct, cropBottomPct)));
      if (rotatedConf > unrotatedConf + 0.1) {
        pageImage = rotatedImage;
        rotationApplied = orientation.rotation;
      }
    }
    const upscaled = upscale2x(cropBand(pageImage, cropTopPct, cropBottomPct));
    ocrEngine.clearImage();
    ocrEngine.loadImage(upscaled);
    ocrEngine.setVariable('tessedit_pageseg_mode', '6'); // uniform block - real dense table, not sparse text
    const text = ocrEngine.getText();
    return {
      page: pageNumber,
      text: (text || '').trim(),
      rotation_applied: rotationApplied,
      crop: `top_${Math.round(cropTopPct * 100)}-${Math.round(cropBottomPct * 100)}pct_full_width_2x`,
    };
  } finally {
    doc.destroy();
  }
}

// Renders a single page to a raw RGBA pixel buffer - used by AsX's diff
// below, not for OCR. No text extraction here, just pixels.
async function renderPageImage(pdfBuffer, pageNum) {
  const library = await getPdfiumLibrary();
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  try {
    const index = Math.max(0, Math.min(pageNum - 1, doc.getPageCount() - 1));
    const page = doc.getPage(index);
    const rendered = await page.render({ scale: 150 / 72, colorSpace: 'BGRA' });
    return { data: bgraToRgba(rendered.data), width: rendered.width, height: rendered.height };
  } finally {
    doc.destroy();
  }
}

// Coarse grid-cell pixel diff between two page renders - AsX's real
// capability. This is literal pixel-value comparison, not any kind of
// semantic markup/redline recognition: it will flag scan misalignment,
// scale differences, and print-quality noise exactly the same as an
// actual field revision. Grid size is fixed and modest (24x32 max) so the
// output stays a readable heatmap, not per-pixel noise.
function diffPageImages(imgA, imgB) {
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  const gridCols = Math.min(24, width);
  const gridRows = Math.min(32, height);
  const cellW = Math.floor(width / gridCols);
  const cellH = Math.floor(height / gridRows);
  const cellDiffs = [];
  let totalDiff = 0;
  for (let gy = 0; gy < gridRows; gy++) {
    const row = [];
    for (let gx = 0; gx < gridCols; gx++) {
      let sum = 0, count = 0;
      const x0 = gx * cellW, y0 = gy * cellH;
      for (let y = y0; y < y0 + cellH; y += 2) {
        for (let x = x0; x < x0 + cellW; x += 2) {
          const i = (y * imgA.width + x) * 4;
          const j = (y * imgB.width + x) * 4;
          if (i + 2 >= imgA.data.length || j + 2 >= imgB.data.length) continue;
          const dr = Math.abs(imgA.data[i] - imgB.data[j]);
          const dg = Math.abs(imgA.data[i + 1] - imgB.data[j + 1]);
          const db = Math.abs(imgA.data[i + 2] - imgB.data[j + 2]);
          sum += (dr + dg + db) / 3;
          count++;
        }
      }
      const avg = count ? sum / count / 255 : 0;
      row.push(Math.round(avg * 1000) / 1000);
      totalDiff += avg;
    }
    cellDiffs.push(row);
  }
  return { width, height, gridCols, gridRows, cellDiffs, overallDiffPercent: Math.round((totalDiff / (gridCols * gridRows)) * 1000) / 10 };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'weyland-ocr-worker' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/detect-schedules' && request.method === 'POST') {
      try {
        const sessionId = request.headers.get('X-Session-Id') || 'unknown';
        const totalPages = parseInt(request.headers.get('X-Total-Pages') || '1', 10);
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndDetect(pdfBuffer, totalPages, sessionId);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/extract-schedule-table' && request.method === 'POST') {
      try {
        const pageNumber = parseInt(request.headers.get('X-Page-Number') || '1', 10);
        const cropTopPct = parseFloat(request.headers.get('X-Crop-Top-Pct') ?? '0');
        const cropBottomPct = parseFloat(request.headers.get('X-Crop-Bottom-Pct') ?? '0.42');
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndExtractTableRegion(pdfBuffer, pageNumber, cropTopPct, cropBottomPct);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/extract-text' && request.method === 'POST') {
      try {
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndExtractText(pdfBuffer, request.headers);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/diff-pages' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const originalFile = formData.get('original');
        const revisedFile = formData.get('revised');
        const page = parseInt(formData.get('page') || '1', 10);
        if (!originalFile || !revisedFile) {
          return new Response(JSON.stringify({ error: 'Both "original" and "revised" files are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const [imgA, imgB] = await Promise.all([
          renderPageImage(await originalFile.arrayBuffer(), page),
          renderPageImage(await revisedFile.arrayBuffer(), page),
        ]);
        const result = diffPageImages(imgA, imgB);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
