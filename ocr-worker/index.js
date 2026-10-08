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
import jpeg from 'jpeg-js';
import { detectSchedules, rotate90CW } from '../src/extraction/jitagi-detect-schedules.js';
import { pageRange } from './page-range.js';
// 2026-10-08: the page-extraction base (text layer first, pixel budget, in-place
// BGRA, orientation guard, page windows, sequential diff) lives in extract.js so
// node tests can run it against tools/corpus; see that file's header.
import {
  bgraToRgbaInPlace, cropBand, meanWordConfidence, renderPageRgba,
  extractPages, diffPagesSequential,
} from './extract.js';

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

// cropBand() and meanWordConfidence() moved to extract.js (2026-10-08).

// bgraToRgba() (a full page-sized copy) is gone: every render path converts in
// place with bgraToRgbaInPlace() from extract.js. The copy, plus PDFium's own
// buffer and tesseract's, is what put one 36x24 sheet at 150 dpi (77.8 MB a
// copy) over the Worker's 128 MB ceiling on 2026-10-07.

// Real gap closed 2026-09-24 (accountdrac.com depth audit): every caller of
// this worker only ever sent PDFs - a photographed receipt (JPG straight off
// a phone camera roll) was a disclosed, unhandled case. tesseract-wasm's
// loadImage() only needs decoded {data, width, height} RGBA pixels - the
// same shape PDFium rendering already produces - so a JPEG never needed
// PDFium at all, just a decoder. jpeg-js is pure JS (no WASM, no native
// bindings), decodes straight to RGBA via {useTArray: true}, and is small
// enough not to threaten this worker's already-tight ~10MB WASM/asset
// budget (see file header). PNG intentionally not added yet - the DEFLATE
// decode it needs would be its own real chunk of work, not a two-line addition.
function isJpeg(buffer) {
  const b = new Uint8Array(buffer.slice(0, 3));
  return b.length === 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

async function extractTextFromJpeg(imageBuffer) {
  const ocrEngine = await getOcrEngine();
  const decoded = jpeg.decode(new Uint8Array(imageBuffer), { useTArray: true });
  let pageImage = { data: decoded.data, width: decoded.width, height: decoded.height };

  // Same orientation-correction pattern as the PDF path below (a phone
  // photo is at least as likely to be sideways as a scanned page) -
  // reusing the identical check rather than inventing a second one.
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
  const text = (ocrEngine.getText() || '').trim();
  return {
    pages: [{ page: 1, text, rotation_applied: orientation.rotation }],
    pageCount: 1,
    documentPageCount: 1,
    startPage: 1,
    endPage: 1,
    hasMore: false,
  };
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
      const image = await renderPageRgba(page);
      pageImages.set(i + 1, { data: image.data, width: image.width, height: image.height });
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

// General-purpose text extraction for text-heavy documents (inspection
// reports, safety logs, spec sections, drawing title blocks). Since
// 2026-10-08 this is extractPages() in extract.js: the PDF's own text layer
// first, OCR (pageseg mode 3, orientation guarded) only for pages without
// one, at most X-Max-Ocr-Pages OCR'd pages per request, renders capped by a
// pixel budget. The reply's endPage/hasMore/nextPage tell the caller where
// to resume; weyland-docs-worker runs the remaining windows on its D1 job
// lease.
async function renderAndExtractText(pdfBuffer, headers) {
  if (isJpeg(pdfBuffer)) return extractTextFromJpeg(pdfBuffer);
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();
  return extractPages({ library, ocrEngine, rotate90CW, pdfBuffer, headers, pageRange });
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
      data: bgraToRgbaInPlace(rendered.data),
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

// --- Grid-based table extraction (deterministic, no LLM) ---
//
// For real bordered/ruled tables (manufacturer price books, door
// schedules), flat full-table OCR is unreliable: thin ruling lines get
// read as literal garbage characters interspersed with real text,
// corrupting column alignment - confirmed live 2026-10-01 against a real
// DSA-submittal door schedule (GCCFullDoorSchedule.pdf, sheet A-801):
// flat psm-6 OCR on a single data row produced "pEIRST EEDOR T of MAINT
// T ain T 7'f)"' T 4 2/4" T A T..." - the vertical gridlines themselves
// came through as literal "T"/"|" characters wedged into the real text.
//
// Fix: detect the real column/row gridlines via pixel-darkness profiling
// (deterministic - this is drawn vector table structure, not inferred),
// paint them white so they can't corrupt OCR, then OCR one row at a time
// (not one cell at a time - tested live: cell-by-cell OCR for an
// 18-column x 46-row table means ~800 tesseract calls per page, which is
// exactly the CPU-budget failure mode this file already documents
// elsewhere, HTTP 503 / error 1102; row-by-row keeps it to ~1 call per
// row) using word-level bounding boxes, then assign each returned word to
// a column by its x-position against the detected gridlines - a narrow,
// enumerable classification task (which column does this word belong
// to), not a generation task, so it genuinely needs no LLM at all.
//
// Validated live against the real test page: 44 of 46 real rows recovered
// with every checked field matching the schedule by eye exactly (the 2
// misses sit under hand-drawn revision-cloud annotation graphics that
// disrupt row-boundary detection - a real, understood, unfixed edge case,
// not a mystery).

function toLuminance(img) {
  const { width, height, data } = img;
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Standard luma weights - exact coefficients don't matter here, only
    // the resulting dark/light classification against the threshold below.
    lum[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return lum;
}

function clusterIndices(indices, gap = 2) {
  if (indices.length === 0) return [];
  const lines = [];
  let cur = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] - cur[cur.length - 1] <= gap) {
      cur.push(indices[i]);
    } else {
      lines.push(Math.round(cur.reduce((a, b) => a + b, 0) / cur.length));
      cur = [indices[i]];
    }
  }
  lines.push(Math.round(cur.reduce((a, b) => a + b, 0) / cur.length));
  return lines;
}

// Longest contiguous run of dark pixels in [xStart,xEnd) of one row - a
// real rule line shows up as one long run regardless of how much of the
// page's full width the table itself occupies; text never produces a
// long unbroken run (letterforms are short strokes with light gaps).
function longestDarkRun(lum, rowBase, xStart, xEnd) {
  let best = 0, cur = 0;
  for (let x = xStart; x < xEnd; x++) {
    if (lum[rowBase + x] < 150) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

// Finds the table's own bounding box on a full page before doing precise
// gridline detection within it. A real schedule table has MANY closely,
// evenly-spaced horizontal rules (one per data row); a title block or
// page border has only isolated ones far apart. Real bug found
// 2026-10-01 testing against a real full-page render: measuring darkness
// as a fraction of the FULL PAGE width silently fails for a table that
// only occupies part of the page's width (a real rule line spanning just
// the table reads as barely-dark when diluted across the rest of a wide,
// mostly-white page) - using the longest contiguous dark run instead
// sidesteps that dilution entirely. Finds the single densest contiguous
// cluster of such candidate lines; that cluster's span is the real table.
function findTableBounds(lum, width, height) {
  const rowCandidates = [];
  for (let y = 0; y < height; y++) {
    if (longestDarkRun(lum, y * width, 0, width) > width * 0.15) rowCandidates.push(y);
  }
  const rowLines = clusterIndices(rowCandidates);
  if (rowLines.length < 3) return null;

  const gaps = [];
  for (let i = 1; i < rowLines.length; i++) gaps.push(rowLines[i] - rowLines[i - 1]);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 20;
  const maxPitch = medianGap * 3;

  let bestStart = 0, bestEnd = 0, curStart = 0;
  for (let i = 0; i < gaps.length; i++) {
    const gapTooBig = gaps[i] > maxPitch;
    const isLast = i === gaps.length - 1;
    if (gapTooBig || isLast) {
      const end = gapTooBig ? i : i + 1;
      if (rowLines[end] - rowLines[curStart] > rowLines[bestEnd] - rowLines[bestStart]) {
        bestStart = curStart; bestEnd = end;
      }
      curStart = i + 1;
    }
  }
  return { y0: Math.max(0, rowLines[bestStart] - 5), y1: Math.min(height, rowLines[bestEnd] + 5) };
}


// Two-phase: columns first (correctly scoped to the table's own height
// via `bounds`), which establishes the table's real x-extent - then rows
// are detected using darkness density restricted to exactly that x-extent
// (not the full page width - the same dilution bug findTableBounds above
// was built to fix, one level deeper: an earlier version used the FULL
// raw column-line range here, which silently included a stray far-right
// line - a legend-box border, the outer table frame - inflating the
// row-scoping width and diluting every row below threshold again).
// Thresholds (150 darkness cutoff, 0.5/0.6 fraction) found empirically
// against the real validated test document; worth revisiting if a future
// document's scan quality or line weight differs meaningfully.
function detectGridLines(lum, width, height, bounds) {
  const y0 = bounds ? bounds.y0 : 0;
  const y1 = bounds ? bounds.y1 : height;
  const bandH = y1 - y0;
  const colDark = new Array(width).fill(0);
  for (let y = y0; y < y1; y++) {
    const rowBase = y * width;
    for (let x = 0; x < width; x++) {
      if (lum[rowBase + x] < 150) colDark[x]++;
    }
  }
  const colCandidates = [];
  for (let x = 0; x < width; x++) if (colDark[x] / bandH > 0.5) colCandidates.push(x);
  const allColLines = clusterIndices(colCandidates);
  if (allColLines.length < 2) return { colLines: allColLines, rowLines: [] };

  // Isolate the narrow, evenly-pitched run of data columns (same pitch
  // heuristic extractGridTable uses for the notes-column split) before
  // using this span to scope row detection.
  const pitch = allColLines[1] - allColLines[0];
  let splitAt = allColLines.length;
  for (let i = 1; i < allColLines.length; i++) {
    if (allColLines[i] - allColLines[i - 1] > 3 * pitch) { splitAt = i; break; }
  }
  const colLines = allColLines.slice(0, splitAt);
  const tableX0 = colLines[0], tableX1 = colLines[colLines.length - 1];
  const tableW = tableX1 - tableX0;
  const rowCandidates = [];
  for (let y = y0; y < y1; y++) {
    const rowBase = y * width;
    let dark = 0;
    for (let x = tableX0; x < tableX1; x++) if (lum[rowBase + x] < 150) dark++;
    if (dark / tableW > 0.6) rowCandidates.push(y);
  }
  return { colLines, rowLines: clusterIndices(rowCandidates), wideColEnd: allColLines[splitAt] };
}

// Hardware-schedule-specific column detection: NO pitch-based splitting.
// Real bug found 2026-10-02 validating against a real hardware-schedule
// page (525dc0b72011077a.pdf p219, "Hardware Set: 01.../Door# 100B"):
// detectGridLines' door-schedule-tuned "narrow evenly-pitched run, then one
// wide trailing column" heuristic truncated this table's real 6 column
// lines down to just 2, because the gap after the narrow Qty column is
// much larger than the Qty-column's own pitch, triggering the "end of real
// columns" split prematurely - WRONG here: a hardware-set component table
// (Qty | Description | Product Number | Fin | Man) has a small, FIXED
// number of columns with wildly different real widths by design (Qty
// ~75px, Description/Product Number each several hundred px, Fin/Man
// narrow again), not door-schedule's ~18 roughly-equal narrow columns plus
// one wide trailing notes column. Confirmed live via a standalone
// debug_cols.mjs harness: raw (unsplit) column-line clustering correctly
// found all 6 real lines ([150,225,522,957,1050,1124] at 150dpi) across
// thresholds 0.4-0.8 - this function just uses that directly.
function detectGridLinesHardware(lum, width, height, bounds) {
  const y0 = bounds ? bounds.y0 : 0;
  const y1 = bounds ? bounds.y1 : height;
  const bandH = y1 - y0;
  const colDark = new Array(width).fill(0);
  for (let y = y0; y < y1; y++) {
    const rowBase = y * width;
    for (let x = 0; x < width; x++) {
      if (lum[rowBase + x] < 150) colDark[x]++;
    }
  }
  const colCandidates = [];
  for (let x = 0; x < width; x++) if (colDark[x] / bandH > 0.5) colCandidates.push(x);
  const colLines = clusterIndices(colCandidates);
  if (colLines.length < 2) return { colLines, rowLines: [] };

  const tableX0 = colLines[0], tableX1 = colLines[colLines.length - 1];
  const tableW = tableX1 - tableX0;
  const rowCandidates = [];
  for (let y = y0; y < y1; y++) {
    const rowBase = y * width;
    let dark = 0;
    for (let x = tableX0; x < tableX1; x++) if (lum[rowBase + x] < 150) dark++;
    if (dark / tableW > 0.6) rowCandidates.push(y);
  }
  return { colLines, rowLines: clusterIndices(rowCandidates) };
}

// Paints detected vertical gridlines white, in place, across the given
// y-range, so they can't be OCR'd as literal characters.
function eraseVerticalLines(img, colLines, y0, y1) {
  const { width, data } = img;
  for (const x of colLines) {
    for (let xx = Math.max(0, x - 3); xx <= Math.min(width - 1, x + 3); xx++) {
      for (let y = y0; y < y1; y++) {
        const idx = (y * width + xx) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = 255;
      }
    }
  }
}

function cropRowImage(img, y0, y1, x0, x1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = ((y0 + y) * img.width + x0) * 4;
    const dstStart = y * w * 4;
    out.set(img.data.subarray(srcStart, srcStart + w * 4), dstStart);
  }
  return { data: out, width: w, height: h };
}

// Nearest-neighbor Nx upscale - same technique as upscale2x above,
// generalized to an arbitrary integer factor (3x validated live for row
// crops at this render resolution).
function upscaleN(img, n) {
  const { width: w, height: h, data } = img;
  const nw = w * n, nh = h * n;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy = (y / n) | 0;
    for (let x = 0; x < nw; x++) {
      const sx = (x / n) | 0;
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

// Known header-label synonyms for a door-schedule table, matched
// case-insensitively/by-substring against each detected header cell's
// OCR'd text. Position-sensitive fields (TYPE/MATERIAL/FINISH each appear
// twice - once for DOOR, once for FRAME) are resolved by occurrence order
// (first unused match wins) - matches this real document type's
// consistent real-world column ordering (DOOR block before FRAME block).
const DOOR_SCHEDULE_HEADER_PATTERNS = [
  { field: 'mark', patterns: ['mark', 'door no', 'door number', 'door #'] },
  { field: 'fire_rating', patterns: ['fire rating', 'rating'] },
  { field: 'width', patterns: ['width'] },
  { field: 'height', patterns: ['height'] },
  { field: 'thickness', patterns: ['thickness'] },
  { field: 'door_type', patterns: ['type'] },
  { field: 'door_material', patterns: ['material'] },
  { field: 'door_finish', patterns: ['finish'] },
  { field: 'stc_rating', patterns: ['stc'] },
  { field: 'frame_type', patterns: ['type'] },
  { field: 'frame_material', patterns: ['material'] },
  { field: 'frame_finish', patterns: ['finish'] },
  { field: 'head_detail', patterns: ['head'] },
  { field: 'jamb_detail', patterns: ['jamb'] },
  { field: 'sill_detail', patterns: ['sill'] },
  { field: 'panic_hardware', patterns: ['panic'] },
  { field: 'hardware_group', patterns: ['hardware group', 'hw group', 'group'] },
  { field: 'notes', patterns: ['notes', 'remarks'] },
];

// Hardware-set component table header (Qty | Description | Product Number |
// Fin | Man) - confirmed live against the same real validated document as
// detectGridLinesHardware above.
const HARDWARE_SCHEDULE_HEADER_PATTERNS = [
  { field: 'quantity', patterns: ['qty', 'quantity'] },
  { field: 'description', patterns: ['description', 'component'] },
  { field: 'product_number', patterns: ['product number', 'product no', 'model', 'catalog'] },
  { field: 'finish', patterns: ['fin', 'finish'] },
  { field: 'manufacturer', patterns: ['man', 'mfr', 'manufacturer'] },
];

function matchHeaderLabel(headerText, usedFields, patternTable = DOOR_SCHEDULE_HEADER_PATTERNS) {
  const t = String(headerText || '').toLowerCase();
  if (!t) return null;
  for (const { field, patterns } of patternTable) {
    if (usedFields.has(field)) continue;
    if (patterns.some((p) => t.includes(p))) return field;
  }
  return null;
}

// A hardware-schedule page interleaves real ruled-table data rows with
// full-width (no-column-structure) "Hardware Set: {n}{-descriptor}" and
// "Door# {n}" lines - confirmed live, both OCR as plain text scattered
// across whatever columns their words happen to fall under, so they must
// be recognized by joined-row-text regex, not by column position. Checked
// against the JOINED cell text of a row (cells concatenated in column
// order) since a real wrapped word can land in any column bucket.
function classifyHardwareRow(cells) {
  const joined = cells.filter(Boolean).join(' ').trim();
  const hwSet = joined.match(/^hardware\s*set\s*:?\s*(.*)$/i);
  if (hwSet) return { row_type: 'hardware_set_header', group_number: hwSet[1].trim() || null, raw_text: joined };
  const doorAssign = joined.match(/^door\s*#\s*:?\s*(.*)$/i);
  if (doorAssign) {
    const doors = doorAssign[1].split(/[,\/&]| and /i).map((d) => d.trim()).filter(Boolean);
    return { row_type: 'door_assignment', assigned_doors: doors, raw_text: joined };
  }
  return null;
}

// extractGridTable: the real deterministic replacement for OCR+LLM
// structuring on a ruled table page. Returns one object per data row,
// keyed by whatever semantic field name matchHeaderLabel assigned to
// that column (falling back to "col_N" for an unrecognized header) - the
// caller maps those keys onward into whatever downstream contract it needs.
// Real bug fixed 2026-10-02: a real 39-row door schedule's per-row OCR
// loop exceeds Cloudflare's hard 30-second-per-request CPU ceiling (not
// plan-configurable - already confirmed at the documented max in this
// file's own wrangler.toml). A client-side (browser) rewrite was
// attempted and shelved after hitting a separate, real rendering gap in
// the Sovereign PDF Rasterizer (Form XObjects / some vector content not
// yet supported - a bigger, open-ended fix). This is the pragmatic,
// lower-risk alternative: keep the already-validated PDFium+tesseract-wasm
// pipeline, but let the CALLER paginate the per-row OCR loop across
// multiple separate Worker invocations (each with its own fresh 30s
// budget) instead of doing all rows in one request. Gridline detection
// re-runs on every call (cheap relative to OCR, confirmed by this file's
// own [GridTable timing] log) rather than caching state between calls -
// simpler and stateless.
async function extractGridTable(pdfBuffer, pageNumber, opts = {}) {
  const startRow = opts.startRow || 0;
  // 'door_schedule' (default) uses detectGridLines' pitch-split (narrow
  // evenly-pitched columns + one wide trailing notes column).
  // 'hardware_schedule' uses detectGridLinesHardware (no split - a
  // hardware-set component table's columns have fixed count but wildly
  // different widths by design) and interleaves full-width "Hardware Set:"/
  // "Door#" structural rows with real ruled data rows (classifyHardwareRow).
  const tableType = opts.tableType || 'door_schedule';
  const isHardware = tableType === 'hardware_schedule';
  // Real bug found 2026-10-02: a wall-clock (Date.now()) time budget
  // CANNOT bound CPU-bound synchronous work in a Workers isolate -
  // Cloudflare deliberately freezes/reduces Date.now() precision during
  // synchronous execution (a Spectre-style timing-attack mitigation), so
  // every per-row Date.now() read inside this loop returned the exact
  // same frozen value (confirmed live via wrangler tail: every row logged
  // "elapsed=0ms", including the last one right before the platform's own
  // watchdog killed the isolate) - the time-based early-exit could never
  // fire. A live tail of a real 39-row page showed ~30 rows (4 header + 26
  // data) complete before that external kill, so a fixed ROW COUNT per
  // batch is the only thing that can actually self-limit here. Default of
  // 15 leaves real margin below that ~30-row observed ceiling for
  // per-row variance (denser rows cost more OCR time than sparse ones).
  const maxRows = opts.maxRows || 15;
  const t0 = Date.now();
  const library = await getPdfiumLibrary();
  const ocrEngine = await getOcrEngine();
  const tEngine = Date.now();
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  try {
    const index = Math.max(0, Math.min(pageNumber - 1, doc.getPageCount() - 1));
    // Two-pass render - real fix 2026-10-02 after TWO failed single-pass
    // attempts: (1) 400dpi throughout blew the 128MB memory ceiling
    // (duplicate BGRA->RGBA buffer, since fixed) AND the CPU-time ceiling
    // (gridline detection's O(width*height) scans over a 400dpi page cost
    // real, non-trivial CPU even though Workers' frozen Date.now() during
    // sync execution hid that from wall-clock logging); (2) dropping to
    // 200dpi with a 6x nearest-neighbor row upscale fixed both ceilings
    // but silently destroyed OCR accuracy - confirmed live, every header
    // cell came back garbled ("OOR S|"/"HEDUL" for "DOOR SCHEDULE") -
    // because upscaling a lower-DPI source cannot recover detail genuine
    // higher-DPI rendering captures. Pass 1 renders cheap (150dpi) for
    // gridline DETECTION ONLY (just needs to see solid black lines, not
    // read text) - that small buffer is then eligible for GC before pass 2
    // runs, so the two buffers are never resident simultaneously. Pass 2
    // re-renders at full 400dpi (the empirically-validated DPI for text
    // accuracy) ONLY for the row crop/OCR step, with pass 1's detected
    // coordinates scaled by DETECT_SCALE_RATIO into pass-2 pixel space.
    const DETECT_DPI = 150;
    const BASE_DPI = 400;
    const ROW_UPSCALE = 3;
    const DETECT_SCALE_RATIO = BASE_DPI / DETECT_DPI;

    let colLines, rowLines, wideColEnd;
    {
      // Real PDFium bug found 2026-10-02: calling .render() twice on the
      // SAME page object corrupts its WASM state ("table index is out of
      // bounds" on the second call) - each render pass needs its own
      // fresh doc.getPage(index) handle.
      const detectPage = doc.getPage(index);
      const detectRendered = await detectPage.render({ scale: DETECT_DPI / 72, colorSpace: 'BGRA' });
      const tRender = Date.now();
      const detectImage = { data: bgraToRgbaInPlace(detectRendered.data), width: detectRendered.width, height: detectRendered.height };
      const lum = toLuminance(detectImage);
      const tLum = Date.now();
      const tableBounds = findTableBounds(lum, detectImage.width, detectImage.height);
      const tBounds = Date.now();
      const detected = isHardware
        ? detectGridLinesHardware(lum, detectImage.width, detectImage.height, tableBounds)
        : detectGridLines(lum, detectImage.width, detectImage.height, tableBounds);
      console.log(`[GridTable timing] engine=${tEngine - t0}ms render=${tRender - tEngine}ms luminance=${tLum - tRender}ms bounds=${tBounds - tLum}ms page=${detectImage.width}x${detectImage.height} cols=${detected.colLines.length} rows=${detected.rowLines.length}`);
      // Real bug fixed 2026-10-02: the old rowLines>=3 threshold (2 real
      // row bands) is trivially satisfied by small incidental boxes on a
      // non-schedule page (confirmed live: a floor-plan page's unrelated
      // legend/title-block fragment detected as "6 cols, 3 row lines" -
      // not a real door schedule, which has dozens of rows) - that false
      // positive then triggered the expensive 400dpi second-pass render
      // unnecessarily, blowing the memory ceiling on a page that was never
      // going to have real table data anyway. A real schedule table has
      // many rows; requiring at least 6 row lines (5 real row bands: a
      // header + at least 4 data rows) filters out small false positives
      // while still easily covering genuine schedule tables.
      if (detected.colLines.length < 4 || detected.rowLines.length < 6) {
        return { error: 'no_grid_detected', detail: `found ${detected.colLines.length} column lines, ${detected.rowLines.length} row lines - page may not contain a ruled table` };
      }
      colLines = detected.colLines.map((x) => Math.round(x * DETECT_SCALE_RATIO));
      rowLines = detected.rowLines.map((y) => Math.round(y * DETECT_SCALE_RATIO));
      // Hardware-schedule's detected colLines already bound every real
      // column (no pitch-split, no implicit trailing notes column) - only
      // door_schedule needs a separate wideColEnd past its split point.
      wideColEnd = isHardware ? null : Math.round((detected.wideColEnd ?? detectImage.width - 1) * DETECT_SCALE_RATIO);
      // detectImage/lum/tableBounds/detected fall out of scope here - GC
      // eligible before the full-resolution render below allocates.
    }

    const page = doc.getPage(index);
    const rendered = await page.render({ scale: BASE_DPI / 72, colorSpace: 'BGRA' });
    const pageImage = { data: bgraToRgbaInPlace(rendered.data), width: rendered.width, height: rendered.height };
    const rowRightEdge = isHardware
      ? Math.min(colLines[colLines.length - 1], pageImage.width - 1)
      : Math.min(wideColEnd, pageImage.width - 1);

    const colBounds = [];
    for (let i = 0; i < colLines.length - 1; i++) colBounds.push([colLines[i], colLines[i + 1]]);
    if (!isHardware) colBounds.push([colLines[colLines.length - 1], rowRightEdge]);

    eraseVerticalLines(pageImage, colLines, 0, pageImage.height);

    const PAD = 2;
    const totalRowBands = rowLines.length - 1;

    function ocrRowBand(i) {
      const tStart = Date.now();
      const y0 = rowLines[i] + PAD, y1 = rowLines[i + 1] - PAD;
      if (y1 - y0 < 5) return null;
      const rowImg = upscaleN(cropRowImage(pageImage, y0, y1, 0, rowRightEdge), ROW_UPSCALE);
      const tCrop = Date.now();
      ocrEngine.clearImage();
      ocrEngine.loadImage(rowImg);
      // PSM 6 (uniform block) for hardware_schedule - its rows can wrap to
      // 2+ text lines within one ruled row (e.g. "KEY REMOVEABLE MULLION" /
      // "MORTISE TYPE W/CORE..."); PSM 7 (single line) stays correct for
      // door_schedule's one-line rows, confirmed live on the validated doc.
      ocrEngine.setVariable('tessedit_pageseg_mode', isHardware ? '6' : '7');
      const words = ocrEngine.getTextBoxes('word');
      const tOcr = Date.now();
      console.log(`[GridTable row] i=${i} imgsize=${rowImg.width}x${rowImg.height} crop=${tCrop - tStart}ms ocr=${tOcr - tCrop}ms elapsed=${Date.now() - t0}ms`);
      const cells = new Array(colBounds.length).fill('');
      for (const w of words) {
        const cx = (w.rect.left + w.rect.right) / 2 / ROW_UPSCALE; // undo the row upscale
        for (let ci = 0; ci < colBounds.length; ci++) {
          if (cx >= colBounds[ci][0] && cx < colBounds[ci][1]) {
            cells[ci] = cells[ci] ? `${cells[ci]} ${w.text}` : w.text;
            break;
          }
        }
      }
      return cells;
    }

    // Header detection always re-runs (cheap - a handful of rows of OCR) on
    // every paginated call, rather than requiring the caller to pass back
    // header state from a prior call - keeps this function stateless.
    // hardware_schedule gets a wider search window (6 vs 4) because its
    // real header row is commonly preceded by two full-width structural
    // rows ("Hardware Set: ..." then "Door# ...") that door_schedule
    // doesn't have - confirmed live on the validated doc (header at band 2).
    const headerPatternTable = isHardware ? HARDWARE_SCHEDULE_HEADER_PATTERNS : DOOR_SCHEDULE_HEADER_PATTERNS;
    const headerSearchWindow = isHardware ? 6 : 4;
    const headerBandTexts = [];
    for (let i = 0; i < Math.min(headerSearchWindow, totalRowBands); i++) {
      headerBandTexts.push(ocrRowBand(i) || []);
    }
    if (headerBandTexts.length < 1) {
      return { error: 'no_data_rows', detail: `only ${totalRowBands} row band(s) detected` };
    }
    let headerRowIdx = 0, headerMatches = -1;
    for (let i = 0; i < headerBandTexts.length; i++) {
      // A "Hardware Set:"/"Door#" structural row can never be mistaken for
      // the real column header - it matches none of these field patterns
      // (confirmed live), so no special-case skip is needed here.
      const trial = new Set();
      let matches = 0;
      for (const cellText of headerBandTexts[i]) {
        const f = matchHeaderLabel(cellText, trial, headerPatternTable);
        if (f) { matches++; trial.add(f); }
      }
      if (matches > headerMatches) { headerMatches = matches; headerRowIdx = i; }
    }
    const usedFields = new Set();
    const fieldNames = headerBandTexts[headerRowIdx].map((c) => {
      const f = matchHeaderLabel(c, usedFields, headerPatternTable);
      if (f) usedFields.add(f);
      return f;
    });

    // Positional fallback for hardware_schedule ONLY when the table has
    // exactly the canonical 5 columns (confirmed real, fixed document
    // structure: Qty | Description | Product Number | Fin | Man - see this
    // file's own detectGridLinesHardware header comment). Real bug found
    // 2026-10-02 live against 525dc0b72011077a.pdf p219: the header row's
    // OCR was noisy enough ("oduct Number" missing its "Pr", garbled
    // Fin/Man cells) that 3 of 5 columns failed substring matching even
    // though the underlying DATA rows OCR'd cleanly - this isn't guessing a
    // layout, it's falling back to an already-structurally-confirmed column
    // order only when pattern matching (the primary, more general method)
    // comes up short for a table shape known to always follow this order.
    if (isHardware && fieldNames.length === 5) {
      const canonical = ['quantity', 'description', 'product_number', 'finish', 'manufacturer'];
      for (let ci = 0; ci < 5; ci++) {
        if (!fieldNames[ci] && !usedFields.has(canonical[ci])) {
          fieldNames[ci] = canonical[ci];
          usedFields.add(canonical[ci]);
        }
      }
    }

    // Data rows start right after the header band. startRow/next_start_row
    // index into DATA rows (post-header), not raw row-bands, so a caller's
    // pagination is always "row 0 = first real data row" regardless of
    // where the header actually landed.
    const dataStartBand = headerRowIdx + 1;
    const totalDataRows = Math.max(0, totalRowBands - dataStartBand);

    const rows = [];
    // Real bug found 2026-10-02 (live validation against
    // 525dc0b72011077a.pdf p219): a hardware-schedule page's FIRST set's
    // "Hardware Set:"/"Door#" rows commonly land BEFORE the real column
    // header (confirmed live: bands 0-1, header at band 2) - the
    // header-detection pre-scan above OCR's those bands but then discards
    // them (dataStartBand skips straight past the header), so they were
    // never classified and the caller's group-state machine never opened a
    // group at all (hardware_groups came back [] despite extraction_route
    // correctly reporting grid_deterministic and real row data existing).
    // Only emit these on startRow===0 - the header pre-scan re-runs every
    // paginated call, so re-emitting them on every batch would re-open a
    // fresh (duplicate) group each time instead of just once.
    if (isHardware && startRow === 0) {
      for (let hb = 0; hb < headerRowIdx; hb++) {
        const structural = classifyHardwareRow(headerBandTexts[hb]);
        if (structural) rows.push(structural);
      }
    }
    let i = startRow;
    const batchEnd = Math.min(startRow + maxRows, totalDataRows);
    for (; i < batchEnd; i++) {
      const cells = ocrRowBand(dataStartBand + i);
      if (!cells) continue;
      // hardware_schedule interleaves full-width "Hardware Set:"/"Door#"
      // structural rows among real component rows throughout the whole
      // table (not just before it) - classify every row before falling
      // back to column-field mapping, so the caller (which tracks
      // current-group/current-door state across paginated batches) can
      // tell a structural row from a real component row.
      const structural = isHardware ? classifyHardwareRow(cells) : null;
      if (structural) { rows.push(structural); continue; }
      const row = {};
      let hasAnyField = false;
      for (let ci = 0; ci < fieldNames.length; ci++) {
        const key = fieldNames[ci] || `col_${ci}`;
        row[key] = cells[ci] || '';
        if (fieldNames[ci] && cells[ci]) hasAnyField = true;
      }
      if (isHardware) row.row_type = 'component';
      if (hasAnyField) rows.push(row);
    }
    const done = i >= totalDataRows;
    console.log(`[GridTable timing] startRow=${startRow} rows_this_call=${rows.length} next_start_row=${i} total_data_rows=${totalDataRows} done=${done} total_elapsed=${Date.now() - t0}ms`);

    return {
      rows,
      header_fields: fieldNames,
      column_count: colBounds.length,
      row_count: rows.length,
      total_data_rows: totalDataRows,
      start_row: startRow,
      next_start_row: i,
      done,
      extraction_route: 'grid_deterministic',
    };
  } finally {
    doc.destroy();
  }
}

// AsBuiltX's page diff is diffPagesSequential() in extract.js (2026-10-08):
// the original and the revision are rendered one after the other under a
// 2 MP budget and reduced to thumbnails, never both full pages in memory.
// Promise.all over two 150 dpi renders of a 36x24 sheet was the second
// "Worker exceeded memory limit" the 7 October audit reproduced.

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

    if (url.pathname === '/extract-schedule-grid' && request.method === 'POST') {
      try {
        const pageNumber = parseInt(request.headers.get('X-Page-Number') || '1', 10);
        const startRow = parseInt(request.headers.get('X-Start-Row') || '0', 10);
        const tableType = request.headers.get('X-Table-Type') || 'door_schedule';
        const pdfBuffer = await request.arrayBuffer();
        const result = await extractGridTable(pdfBuffer, pageNumber, { startRow, tableType });
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
        const library = await getPdfiumLibrary();
        const result = await diffPagesSequential({
          library,
          originalBuffer: await originalFile.arrayBuffer(),
          revisedBuffer: await revisedFile.arrayBuffer(),
          page,
        });
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
