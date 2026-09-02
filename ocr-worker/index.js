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
import { detectSchedules } from '../src/extraction/jitagi-detect-schedules.js';

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
async function renderAndExtractText(pdfBuffer, totalPages) {
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();

  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pages = [];
  try {
    const pageCount = Math.min(totalPages, doc.getPageCount());
    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const rendered = await page.render({ scale: 150 / 72, colorSpace: 'BGRA' });
      const pageImage = {
        data: bgraToRgba(rendered.data),
        width: rendered.width,
        height: rendered.height,
      };
      ocrEngine.clearImage();
      ocrEngine.loadImage(pageImage);
      ocrEngine.setVariable('tessedit_pageseg_mode', '3');
      const text = ocrEngine.getText();
      pages.push({ page: i + 1, text: (text || '').trim() });
    }
  } finally {
    doc.destroy();
  }
  return { pages, pageCount: pages.length };
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

    if (url.pathname === '/extract-text' && request.method === 'POST') {
      try {
        const totalPages = parseInt(request.headers.get('X-Total-Pages') || '1', 10);
        const pdfBuffer = await request.arrayBuffer();
        const result = await renderAndExtractText(pdfBuffer, totalPages);
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
