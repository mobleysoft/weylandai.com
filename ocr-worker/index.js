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

    return new Response('Not Found', { status: 404 });
  },
};
