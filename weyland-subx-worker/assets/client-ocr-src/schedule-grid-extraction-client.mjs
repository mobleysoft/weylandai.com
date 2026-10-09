// schedule-grid-extraction-client.mjs
//
// Runs hardware_schedule AND door_schedule grid extraction ENTIRELY in the
// customer's own browser tab - zero Cloudflare CPU spent on rendering or
// OCR, with bounded rendering and recognition work, works in a field/disconnected environment
// once this script and its two model assets (tesseract-core.wasm,
// eng-traineddata.bin) are cached. Direct instruction 2026-10-02: no
// shipped extraction path should depend on server-side compute when it can
// run client-side instead - the server's only remaining job is serving
// these static assets once and receiving the finished result via the
// existing POST .../page/:n/extract-result endpoint (which now accepts
// EITHER {hardware_groups:[...]} or {doors:[...]} - see that route's own
// comment for why these are genuinely different real shapes, not one
// schema with optional fields).
//
// Uses pdf.js (real, vendored, handles the full PDF spec) for rendering -
// NOT the custom Sovereign PDF Rasterizer already inline in subx-app.html,
// which is missing Form XObject support (a real, confirmed gap: the first
// 2026-10-02 client-side attempt hit a blank table region on a real test
// PDF because of it). This repo's own MONOLITH_HELPER_MAP.md plan already
// called for keeping pdf.js as the fallback for exactly this case.
//
// Grid-detection functions below (toLuminance/clusterIndices/
// findAllTableBounds/detectGridLinesHardware/classifyHardwareRow/etc.) are
// ported verbatim from weyland-ocr-worker/index.js's server-side
// extractGridTable, which that file's own header comment documents the
// full real validation history for (pixel-darkness gridline detection,
// PSM-6 multi-line row OCR, positional header fallback - all confirmed live
// against 525dc0b72011077a.pdf). No server-side CPU ceiling here means the
// pagination/continuation-state machinery that file needed can be dropped
// entirely: a whole page (even one with multiple hardware-set tables, like
// p223 of that same real document) is detected and OCR'd in one pass.
//
// 2026-10-07: the same module is also what "RUN EXTRACTION" runs on the
// server. weyland-ocr-worker's /extract-schedule-grid renders the page with
// PDFium inside a 128 MB Worker isolate; a Letter page at 400 dpi is a 60 MB
// bitmap, copied once more out of WASM memory, and the isolate died with
// "Worker exceeded memory limit" before the first row was read
// (OCCDoorSchedulePg4.pdf, confirmed with wrangler tail). weyland-subx-worker
// now opens grid-runner.html in a Cloudflare Browser Rendering tab (the
// env.BROWSER binding renderRegionAt600DPI2 already uses) and calls these
// exports there - one implementation for the visitor's tab and the server.
// The door_schedule path also learned orientation, ruling-only column
// detection and a text-sized render (see extractDoorScheduleFromPdf).

const ASSET_BASE = "/api/hardware-schedule/client-ocr-assets";

// 2026-10-08: the text layer comes first. A CAD sheet or a spec section
// carries its schedule as positioned text; reading it beats OCR on every
// count (no rendering, no misread digits) and is the only way to read an
// unruled Section 08 71 00. OCR below is now the path for pages with no text
// (a scan, a Print-to-PDF of a bitmap such as OCCDoorSchedulePg4.pdf).
import * as TL from "./schedule-text-layer.mjs?v=20261009g034";

let pdfjsLibPromise = null;
export async function loadPdfJs() {
  if (!pdfjsLibPromise) {
    // ?v=2: since 2026-10-07 both files are served with compatibility shims
    // prepended (assets/client-ocr-src/pdfjs-compat.js); a new URL so no
    // browser keeps an immutable-cached copy from before.
    pdfjsLibPromise = import(/* webpackIgnore: true */ `${ASSET_BASE}/pdf.mjs?v=2`).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}/pdf-worker.mjs?v=2`;
      return mod;
    });
  }
  return pdfjsLibPromise;
}

let ocrEnginePromise = null;
async function getOcrEngine(onProgress) {
  if (!ocrEnginePromise) {
    ocrEnginePromise = (async () => {
      const { createOCREngine, supportsFastBuild } = await import(/* webpackIgnore: true */ `${ASSET_BASE}/tesseract-wasm-lib.mjs`);
      if (onProgress) onProgress("Loading OCR engine...");
      // Real bug avoided 2026-10-02: tesseract-wasm ships two WASM builds
      // for a real reason - the fast build needs WASM SIMD, which not every
      // browser/device supports. Always fetching tesseract-core.wasm (the
      // fast build) regardless of support would silently fail to
      // instantiate on a non-SIMD browser. supportsFastBuild() is the same
      // real feature-detection tesseract-wasm's own createOCREngine() would
      // use internally if it were fetching by URL itself - reused here
      // since we fetch wasmBinary explicitly instead (needed for Workers
      // asset serving, not a relative URL fetch from import.meta.url).
      const fastOk = supportsFastBuild();
      const wasmAssetName = fastOk ? "tesseract-core.wasm" : "tesseract-core-fallback.wasm";
      const wasmBinary = await (await fetch(`${ASSET_BASE}/${wasmAssetName}`)).arrayBuffer();
      const engine = await createOCREngine({ wasmBinary });
      if (onProgress) onProgress("Loading OCR language model...");
      const trainedData = new Uint8Array(await (await fetch(`${ASSET_BASE}/eng-traineddata.bin`)).arrayBuffer());
      engine.loadModel(trainedData);
      return engine;
    })();
  }
  return ocrEnginePromise;
}

// ===== ported verbatim from ocr-worker/index.js =====

function toLuminance(imageData) {
  const { width, height, data } = imageData;
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
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

// Returns EVERY gap-separated cluster of row-candidate lines (not just the
// densest one) - a real hardware-schedule page commonly has MULTIPLE
// separate hardware-set tables stacked with a free-form "DESCRIPTION OF
// OPERATION" paragraph between them (confirmed live 2026-10-02 against
// 525dc0b72011077a.pdf p223: two distinct tables, "Hardware Set: 08" then
// "Hardware Set: 04"). Real-table-vs-false-positive filtering happens
// downstream (colLines>=4/rowLines>=6), applied per-candidate.
function findAllTableBounds(lum, width, height) {
  const rowCandidates = [];
  for (let y = 0; y < height; y++) {
    if (longestDarkRun(lum, y * width, 0, width) > width * 0.15) rowCandidates.push(y);
  }
  const rowLines = clusterIndices(rowCandidates);
  if (rowLines.length < 3) return [];

  const gaps = [];
  for (let i = 1; i < rowLines.length; i++) gaps.push(rowLines[i] - rowLines[i - 1]);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 20;
  const maxPitch = medianGap * 3;

  const regions = [];
  let curStart = 0;
  for (let i = 0; i < gaps.length; i++) {
    const gapTooBig = gaps[i] > maxPitch;
    const isLast = i === gaps.length - 1;
    if (gapTooBig || isLast) {
      const end = gapTooBig ? i : i + 1;
      if (end - curStart >= 2) {
        regions.push({ y0: Math.max(0, rowLines[curStart] - 5), y1: Math.min(height, rowLines[end] + 5) });
      }
      curStart = i + 1;
    }
  }
  return regions;
}

// No pitch-split (unlike door_schedule's detectGridLines) - a hardware-set
// component table has a small FIXED column count (Qty/Description/Product
// Number/Fin/Man) with wildly different real widths by design.
function detectGridLinesHardware(lum, width, bounds) {
  const y0 = bounds.y0, y1 = bounds.y1;
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

const HARDWARE_SCHEDULE_HEADER_PATTERNS = [
  { field: "quantity", patterns: ["qty", "quantity"] },
  { field: "description", patterns: ["description", "component"] },
  { field: "product_number", patterns: ["product number", "product no", "model", "catalog"] },
  { field: "finish", patterns: ["fin", "finish"] },
  { field: "manufacturer", patterns: ["man", "mfr", "manufacturer"] },
];

// Same real header-label synonyms as ocr-worker/index.js's server-side
// DOOR_SCHEDULE_HEADER_PATTERNS - position-sensitive fields (TYPE/MATERIAL/
// FINISH each appear twice, once for DOOR once for FRAME) resolved by
// occurrence order (first unused match wins), matching this document
// family's consistent real-world DOOR-block-before-FRAME-block ordering.
const DOOR_SCHEDULE_HEADER_PATTERNS = [
  { field: "mark", patterns: ["mark", "door no", "door number", "door #"] },
  { field: "fire_rating", patterns: ["fire rating", "rating"] },
  { field: "width", patterns: ["width"] },
  { field: "height", patterns: ["height"] },
  { field: "thickness", patterns: ["thickness"] },
  { field: "door_type", patterns: ["type"] },
  { field: "door_material", patterns: ["material"] },
  { field: "door_finish", patterns: ["finish"] },
  { field: "stc_rating", patterns: ["stc"] },
  { field: "frame_type", patterns: ["type"] },
  { field: "frame_material", patterns: ["material"] },
  { field: "frame_finish", patterns: ["finish"] },
  { field: "head_detail", patterns: ["head"] },
  { field: "jamb_detail", patterns: ["jamb"] },
  { field: "sill_detail", patterns: ["sill"] },
  { field: "panic_hardware", patterns: ["panic"] },
  { field: "hardware_group", patterns: ["hardware group", "hw group", "group"] },
  { field: "notes", patterns: ["notes", "remarks"] },
];

function matchHeaderLabel(headerText, usedFields, patternTable = HARDWARE_SCHEDULE_HEADER_PATTERNS) {
  const t = String(headerText || "").toLowerCase();
  if (!t) return null;
  for (const { field, patterns } of patternTable) {
    if (usedFields.has(field)) continue;
    if (patterns.some((p) => t.includes(p))) return field;
  }
  return null;
}

// Door-schedule-specific gridline detection: WITH pitch-based splitting
// (narrow evenly-pitched run of data columns, then one wide trailing notes
// column) - correct for door_schedule's ~18 roughly-equal narrow columns
// plus one wide trailing notes column, unlike hardware_schedule's fixed
// small column count with wildly different widths (detectGridLinesHardware
// above deliberately has NO split, for that reason). Ported verbatim from
// ocr-worker/index.js's server-side detectGridLines.
//
// 2026-10-07: a column line now has to be RULING, not just dark. The old test
// (any x that is dark in more than half of the band) also fires on a column
// of text that repeats in every row of a dense table - measured on
// OCCDoorSchedulePg4.pdf, the "20 MIN." / "NR" strokes in FIRE RATING and the
// "(E)" / "STAL (SF)" strokes in FRAME MATERIAL reached 0.46-0.52 of the band
// height, split both columns in two and cost the MARK/FIRE RATING header
// match. Text is made of short vertical runs (shorter than a row); a ruled
// line runs continuously across rows. When the caller knows the row pitch
// (bounds.pitch, from findTableBoundsDoor) only dark runs of at least two
// row pitches count.
function detectGridLinesDoor(lum, width, bounds) {
  const y0 = bounds.y0, y1 = bounds.y1;
  const bandH = y1 - y0;
  const colDark = new Array(width).fill(0);
  const minRun = bounds.pitch ? Math.max(3, Math.round(bounds.pitch * 2)) : 1;
  if (minRun > 1) {
    for (let x = 0; x < width; x++) {
      let run = 0, covered = 0;
      for (let y = y0; y < y1; y++) {
        if (lum[y * width + x] < 150) run++;
        else { if (run >= minRun) covered += run; run = 0; }
      }
      if (run >= minRun) covered += run;
      colDark[x] = covered;
    }
  } else {
    for (let y = y0; y < y1; y++) {
      const rowBase = y * width;
      for (let x = 0; x < width; x++) {
        if (lum[rowBase + x] < 150) colDark[x]++;
      }
    }
  }
  const colCandidates = [];
  for (let x = 0; x < width; x++) if (colDark[x] / bandH > 0.5) colCandidates.push(x);
  const allColLines = clusterIndices(colCandidates);
  if (allColLines.length < 2) return { colLines: allColLines, rowLines: [] };

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

// Door-schedule's own single-densest-cluster table-bounds (door_schedule
// pages only ever have one table per page, unlike hardware_schedule's
// multi-table pages) - ported verbatim from ocr-worker/index.js's
// server-side findTableBounds.
function findTableBoundsDoor(lum, width, height) {
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
  // Row pitch of the chosen table (median gap between its own row lines),
  // used by detectGridLinesDoor to tell ruling from text.
  const ownGaps = gaps.slice(bestStart, bestEnd).sort((a, b) => a - b);
  const pitch = ownGaps.length ? ownGaps[Math.floor(ownGaps.length / 2)] : medianGap;
  return { y0: Math.max(0, rowLines[bestStart] - 5), y1: Math.min(height, rowLines[bestEnd] + 5), pitch };
}

// Best-effort architectural feet-inches (3'-0", 7'-11") or fractional-inches
// (1 3/4") string to decimal inches - ported verbatim from
// hardware-extraction-vision-dispatch.js's server-side parseArchDimension.
// Returns null (never a fabricated number) for anything that doesn't
// cleanly match one of these two real, observed shapes.
function parseArchDimension(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const feetInches = t.match(/^(\d+)'?-?\s*(\d{1,2})"?$/);
  if (feetInches) return parseInt(feetInches[1], 10) * 12 + parseInt(feetInches[2], 10);
  const fractional = t.match(/^(\d+)\s+(\d)\/(\d)"?$/);
  if (fractional) return parseInt(fractional[1], 10) + parseInt(fractional[2], 10) / parseInt(fractional[3], 10);
  const wholeInches = t.match(/^(\d+)"$/);
  if (wholeInches) return parseInt(wholeInches[1], 10);
  return null;
}

function classifyHardwareRow(cells) {
  const joined = cells.filter(Boolean).join(" ").trim();
  const hwSet = joined.match(/^hardware\s*set\s*:?\s*(.*)$/i);
  if (hwSet) return { row_type: "hardware_set_header", group_number: hwSet[1].trim() || null, raw_text: joined };
  const doorAssign = joined.match(/^door\s*#\s*:?\s*(.*)$/i);
  if (doorAssign) {
    const doors = doorAssign[1].split(/[,\/&]| and /i).map((d) => d.trim()).filter(Boolean);
    return { row_type: "door_assignment", assigned_doors: doors, raw_text: joined };
  }
  return null;
}

function eraseVerticalLines(imageData, colLines) {
  const { width, height, data } = imageData;
  for (const x of colLines) {
    for (let xx = Math.max(0, x - 3); xx <= Math.min(width - 1, x + 3); xx++) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + xx) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = 255;
      }
    }
  }
}

function cropRowImage(imageData, y0, y1, x0, x1) {
  const w = x1 - x0, h = y1 - y0;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = ((y0 + y) * imageData.width + x0) * 4;
    out.set(imageData.data.subarray(srcStart, srcStart + w * 4), y * w * 4);
  }
  return { data: out, width: w, height: h };
}

function upscaleN(img, n) {
  const { width: w, height: h, data } = img;
  const nw = w * n, nh = h * n;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy = (y / n) | 0;
    for (let x = 0; x < nw; x++) {
      const sx = (x / n) | 0;
      const srcIdx = (sy * w + sx) * 4, dstIdx = (y * nw + x) * 4;
      out[dstIdx] = data[srcIdx]; out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2]; out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: nw, height: nh };
}

// Renders a pdf.js page to an ImageData at the given target DPI (assumes a
// standard 72-DPI PDF user-space unit, matching PDFium's own scale
// convention used server-side).
// ---- A scanned page read as text lines (2026-10-09) ----
// A page with no text layer and no ruled table the grid finds (a spec page's unruled hardware
// groups; a schedule sheet scanned a little crooked) read nothing at all: the WeylandAI Building's
// scanned bid set (tools/bidset) came back empty on every page. Here the whole page is OCR'd into
// words with their boxes, the scanner's tilt is measured from the words themselves and taken out,
// and the words become the same lines the text-layer readers take, so a scan is read by the very
// code that reads a PDF's own text.
export function skewDegrees(words) {
  if (words.length < 20) return 0;
  const hs = words.map((w) => w.h).sort((a, b) => a - b);
  const bin = Math.max(0.5, hs[Math.floor(hs.length / 2)] / 3);
  const cx = words.reduce((n, w) => n + (w.x0 + w.x1) / 2, 0) / words.length;
  let best = { score: -1, deg: 0 };
  for (let deg = -2; deg <= 2.0001; deg += 0.1) {
    const t = (deg * Math.PI) / 180, sn = Math.sin(t), cs = Math.cos(t);
    const hist = new Map();
    for (const w of words) { const k = Math.round((-((w.x0 + w.x1) / 2 - cx) * sn + w.yb * cs) / bin); hist.set(k, (hist.get(k) || 0) + 1); }
    let score = 0;
    for (const c of hist.values()) score += c * c;
    if (score > best.score) best = { score, deg };
  }
  return Math.round(best.deg * 10) / 10;
}
export function unskew(words, deg) {
  if (!deg) return words;
  const t = (deg * Math.PI) / 180, sn = Math.sin(t), cs = Math.cos(t);
  const cx = words.reduce((n, w) => n + (w.x0 + w.x1) / 2, 0) / words.length;
  return words.map((w) => {
    const mx = (w.x0 + w.x1) / 2 - cx, half = (w.x1 - w.x0) / 2;
    const nx = mx * cs + w.yb * sn + cx, ny = -mx * sn + w.yb * cs;
    return { ...w, x0: nx - half, x1: nx + half, yb: ny };
  });
}
// Table rulings (long dark runs across or down the page) read as "[", "|" and noise; a letter's
// stroke is never that long. Runs longer than `minRun` pixels are painted white before OCR. A
// ruling tilted a little by the scanner still breaks into long runs.
export function eraseLongRuns(img, minRun) {
  const { width: w, height: h, data: d } = img;
  const dark = (i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 < 140;
  const white = (i) => { d[i] = d[i + 1] = d[i + 2] = 255; };
  // Collect both axes before erasing: removing row rules first cuts a column rule into
  // cell-height fragments, too short to remove in the vertical pass.
  const horizontal = [], vertical = [];
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && dark((y * w + x) * 4)) { run++; continue; }
      if (run >= minRun) horizontal.push([y, x - run, x]);
      run = 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let run = 0;
    for (let y = 0; y <= h; y++) {
      if (y < h && dark((y * w + x) * 4)) { run++; continue; }
      if (run >= minRun) vertical.push([x, y - run, y]);
      run = 0;
    }
  }
  // Include the antialiased edges; leaving a faint parallel edge makes Tesseract see pipes.
  const pad = Math.max(1, Math.round(minRun / 40));
  for (const [y, x0, x1] of horizontal) for (let yy = Math.max(0, y - pad); yy <= Math.min(h - 1, y + pad); yy++) for (let x = x0; x < x1; x++) white((yy * w + x) * 4);
  for (const [x, y0, y1] of vertical) for (let xx = Math.max(0, x - pad); xx <= Math.min(w - 1, x + pad); xx++) for (let y = y0; y < y1; y++) white((y * w + xx) * 4);
  return img;
}

// Straighten the pixels BEFORE removing rulings/recognizing cells. Correcting only the word
// boxes cannot recover a mark or header that OCR lost against a tilted table border.
export function deskewImage(img, deg) {
  if (Math.abs(deg) < 0.05) return img;
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  out.fill(255);
  const t = deg * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
  const cx = (width - 1) / 2, cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    let sx = -cx * cs - (y - cy) * sn + cx;
    let sy = -cx * sn + (y - cy) * cs + cy;
    for (let x = 0; x < width; x++, sx += cs, sy += sn) {
      const ix = Math.round(sx), iy = Math.round(sy);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;
      const a = (iy * width + ix) * 4, b = (y * width + x) * 4;
      out[b] = data[a]; out[b + 1] = data[a + 1]; out[b + 2] = data[a + 2];
    }
  }
  return { width, height, data: out };
}

// Project sampled ink onto row baselines. The image supplies a finer angle than word boxes
// (0.1 degree is several pixels across an ARCH D sheet), including pages whose rules hide text.
export function imageSkewDegrees(img) {
  const { width, height, data } = img;
  const points = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x += 8) {
    const i = (y * width + x) * 4;
    if (data[i] + data[i + 1] + data[i + 2] < 300) points.push(x - width / 2, y);
  }
  if (points.length < 400) return 0;
  const pad = Math.ceil(width * 0.04) + 2, hist = new Uint32Array(height + 2 * pad);
  const score = (deg) => {
    hist.fill(0);
    const t = Math.tan(deg * Math.PI / 180);
    let s = 0;
    for (let i = 0; i < points.length; i += 2) { const k = Math.round(points[i + 1] - points[i] * t) + pad; s += 2 * hist[k]++ + 1; }
    return s;
  };
  let best = { deg: 0, score: score(0) };
  for (let n = -40; n <= 40; n++) { const deg = n / 20, s = score(deg); if (s > best.score) best = { deg, score: s }; }
  const center = best.deg;
  for (let n = -5; n <= 5; n++) { const deg = center + n / 100, s = score(deg); if (s > best.score) best = { deg, score: s }; }
  return Math.round(best.deg * 100) / 100;
}

export function detectDoorGrid(img) {
  const lum = toLuminance(img);
  // The sheet border and title block also span the table's height. Find repeated row-rule
  // extents first; otherwise those outside verticals become false schedule columns.
  const groups = [];
  for (let y = 0; y < img.height; y++) {
    let start = -1, last = -1;
    const flush = () => {
      if (last - start < img.width * 0.15) return;
      let g = groups.find((g) => Math.abs(g.x0 - start) < 8 && Math.abs(g.x1 - last) < 8);
      if (!g) { g = { x0: start, x1: last, ys: [] }; groups.push(g); }
      g.ys.push(y);
    };
    for (let x = 0; x <= img.width; x++) {
      if (x < img.width && lum[y * img.width + x] < 190) { if (start < 0) start = x; last = x; }
      else if (start >= 0 && x - last > 2) { flush(); start = -1; }
    }
    if (start >= 0) flush();
  }
  for (const g of groups) g.rows = clusterIndices(g.ys, 3);
  const g = groups.filter((g) => g.rows.length >= 6).sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!g) return null;
  const y0 = g.rows[0], y1 = g.rows[g.rows.length - 1];
  const candidates = [];
  for (let x = g.x0; x <= g.x1; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (lum[y * img.width + x] < 190) n++;
    if (n > (y1 - y0) * 0.5) candidates.push(x);
  }
  return { colLines: clusterIndices(candidates, 3), rowLines: g.rows };
}

export const SCAN_MAX_CELLS = 2000;
export const SCAN_MAX_RECOGNITION_MS = 60000;
const yieldRow = () => new Promise(resolve => setTimeout(resolve, 0));
export function recognitionBudget(opts = {}) {
  const now = opts.now || (() => performance.now());
  const start = now();
  const limit = (value, ceiling) => Number.isFinite(value) && value >= 0 ? Math.min(ceiling, value) : ceiling;
  const maxCells = Math.floor(limit(opts.maxCells, SCAN_MAX_CELLS));
  const maxMs = limit(opts.maxRecognitionMs, SCAN_MAX_RECOGNITION_MS);
  let cells = 0, reason = null;
  const check = () => {
    if (!reason && opts.signal?.aborted) reason = "aborted";
    if (!reason && now() - start >= maxMs) reason = "time_limit";
    if (!reason && cells >= maxCells) reason = "cell_limit";
    return !reason;
  };
  return { check, take() { if (!check()) return false; cells++; return true; },
    status() { return { partial: !!reason, reason, cells, max_cells: maxCells, elapsed_ms: Math.round(now() - start), max_ms: maxMs }; } };
}
const partialMetadata = budget => {
  budget.check();
  const recognition = budget.status();
  return { partial: recognition.partial, recognition,
    ...(recognition.partial ? { message: "Partial machine read: " + ({ aborted: "reading stopped", cell_limit: "cell recognition limit reached", time_limit: "recognition time limit reached" }[recognition.reason]) + ". Review the rows read; the page is incomplete." } : {}) };
};

export function recognizeWords(img, engine, dpi, psm = "6", budget) {
  if (budget && !budget.take()) return [];
  engine.clearImage();
  engine.loadImage(img);
  engine.setVariable("tessedit_pageseg_mode", psm);
  const boxes = engine.getTextBoxes("word") || [];
  const k = 72 / dpi;
  const pct = (b) => (b.confidence == null ? 0 : b.confidence <= 1 ? b.confidence * 100 : b.confidence);
  return boxes.filter((b) => b && b.text && b.text.trim() && pct(b) >= 30)
    .map((b) => ({ str: b.text.trim(), x0: b.rect.left * k, x1: b.rect.right * k, yb: b.rect.bottom * k, h: Math.max(1, (b.rect.bottom - b.rect.top) * k), conf: pct(b) }));
}

// A whole architectural sheet is not one text block. Read a detected table one row at a
// time so side legends/title blocks cannot make the OCR engine merge or drop schedule rows.
// Return positioned words, not guessed fields; the normal schedule reader still interprets them.
export async function recognizePageWords(img, engine, dpi, psm = "6", opts = {}) {
  const budget = opts.recognitionBudget || recognitionBudget(opts);
  const result = words => ({ words, ...partialMetadata(budget) });
  if (!budget.check()) return result([]);
  const grid = detectDoorGrid(img);
  const hasGrid = grid && grid.colLines.length >= 4 && grid.rowLines.length >= 6;
  if (!hasGrid) return result(recognizeWords(eraseLongRuns(img, Math.round(dpi * 0.4)), engine, dpi, psm, budget));
  const xs = grid.colLines, ys = grid.rowLines;
  const x0 = xs[0], x1 = grid.wideColEnd ?? xs[xs.length - 1];
  const k = 72 / dpi;
  const inset = Math.max(3, Math.ceil(dpi / 72));
  const words = [];
  let fields = [];
  // Crop INSIDE each rule. This preserves the original glyphs even when JPEG noise leaves
  // a faint rule edge; full-page line erasure must not cut a cell's characters.
  for (let i = 0; i < ys.length - 1; i++) {
    await yieldRow();
    if (!budget.check()) break;
    const top = Math.ceil(ys[i] + inset), bottom = Math.floor(ys[i + 1] - inset);
    if (bottom <= top) continue;
    const rowWords = [];
    const cellTexts = [];
    for (let c = 0; c < xs.length - 1; c++) {
      if (!budget.check()) break;
      const left = Math.ceil(xs[c] + inset), right = Math.floor(xs[c + 1] - inset);
      if (right <= left) continue;
      const cell = cropRowImage(img, top, bottom, left, right);
      let ws = recognizeWords(cell, engine, dpi, "6", budget);
      const text = ws.map((w) => w.str).join(" ");
      cellTexts[c] = text;
      const field = fields[c];
      if (field === "width" || field === "height") {
        const accept = (s) => { const d = readDoorDimension(s); return d && d.format === "ft-in" && d.inches >= DOOR_LIMITS[field][0] && d.inches <= DOOR_LIMITS[field][1]; };
        if (!accept(text)) {
          const reread = rereadDimensionCell(engine, img, xs[c], xs[c + 1], ys[i], ys[i + 1], { recognitionBudget: budget }, text, accept);
          if (reread.text) ws = [{ str: reread.text, x0: 0, x1: cell.width * k, yb: cell.height * k * 0.75, h: cell.height * k / 3, conf: reread.confidence * 100 }];
        }
      }
      const itemX0 = Math.min(...ws.map((w) => w.x0)) + left * k, itemX1 = Math.max(...ws.map((w) => w.x1)) + left * k;
      for (const w of ws) rowWords.push({ ...w, x0: w.x0 + left * k, x1: w.x1 + left * k, yb: w.yb + top * k, item: "cell-" + i + "-" + c, itemX0, itemX1 });
    }
    // OCR's box bottoms vary with punctuation. Cells in one ruled band share a baseline.
    const baselines = rowWords.map((w) => w.yb).sort((a, b) => a - b);
    const baseline = baselines[Math.floor(baselines.length / 2)];
    words.push(...rowWords.map((w) => ({ ...w, yb: baseline })));
    if (!fields.length) {
      const used = new Set();
      const candidate = cellTexts.map((text) => { const f = matchHeaderLabel(text, used, DOOR_SCHEDULE_HEADER_PATTERNS); if (f) used.add(f); return f; });
      if (used.has("mark") && used.size >= 3) fields = candidate;
    }
  }
  if (budget.check()) words.push(...recognizeWords(eraseLongRuns(img, Math.round(dpi * 0.4)), engine, dpi, psm, budget)
    .filter((w) => w.x1 < x0 * k || w.x0 > x1 * k || w.yb < ys[0] * k || w.yb - w.h > ys[ys.length - 1] * k));
  return result(words);
}

// Rendering is the only environment-specific step: the browser uses pdf.js; the accuracy
// runner supplies Poppler pixels. Orientation, deskew, cell OCR and line formation are shared.
export const SCAN_MAX_PIXELS = 36e6;
export const SCAN_MIN_DPI = 18;
// Use integer, rounded-up pixel dimensions, including at the limit. Every renderer calls
// this before creating a canvas (and the Poppler adapter calls it before spawning a render).
export function scanRenderPlan(width, height, requestedDpi, opts = {}) {
  const maxPixels = Math.min(SCAN_MAX_PIXELS, opts.maxPixels ?? SCAN_MAX_PIXELS);
  const minDpi = Math.max(SCAN_MIN_DPI, opts.minDpi ?? SCAN_MIN_DPI);
  const pixelsAt = dpi => Math.ceil(width * dpi / 72) * Math.ceil(height * dpi / 72);
  if (!(width > 0 && height > 0 && Number.isFinite(width * height)) ||
      !(maxPixels > 0) || !Number.isFinite(minDpi) || pixelsAt(minDpi) > maxPixels) {
    throw new Error("Page " + (opts.pageNumber ?? "unknown") + " (" + width + " x " + height +
      " pt) cannot be read within the " + maxPixels + " pixel limit at the minimum " + minDpi + " DPI.");
  }
  let dpi = Math.max(minDpi, Math.min(Number.isFinite(requestedDpi) ? requestedDpi : 300,
    Math.floor(72 * Math.sqrt(maxPixels / (width * height)))));
  while (pixelsAt(dpi) > maxPixels) dpi = Math.max(minDpi, dpi - 1);
  return { dpi, width: Math.ceil(width * dpi / 72), height: Math.ceil(height * dpi / 72), maxPixels };
}

export async function ocrRasterPageLines(source, engine, progress = () => {}, opts = {}) {
  const budget = opts.recognitionBudget || recognitionBudget(opts);
  const rotations = opts.rotations || [0, 90, 270, 180];
  const read = async (rotation, requestedDpi, full = false) => {
    const { dpi } = scanRenderPlan(source.width, source.height, requestedDpi, opts);
    const raw = await source.render(dpi, rotation);
    const skew = full ? imageSkewDegrees(raw) : 0;
    const img = deskewImage(raw, skew);
    const words = full ? (await recognizePageWords(img, engine, dpi, opts.psm || "6", { ...opts, recognitionBudget: budget })).words
      : recognizeWords(eraseLongRuns(img, Math.round(dpi * 0.4)), engine, dpi, "6", budget);
    return { words, width: img.width * 72 / dpi, height: img.height * 72 / dpi, dpi, skew };
  };
  let pick = { rotation: rotations[0] || 0, score: -1 };
  for (const rotation of rotations) {
    await yieldRow();
    if (!budget.check()) break;
    progress("Checking scan orientation" + (rotation ? " (turned " + rotation + " degrees)" : "") + "...");
    const q = await read(rotation, 150);
    const score = q.words.filter((w) => w.conf >= 70 && w.str.length >= 3).length;
    if (score > pick.score) pick = { rotation, score };
  }
  progress("Reading the scan's cells at full resolution...");
  const full = budget.check() ? await read(pick.rotation, opts.dpi || 300, true)
    : { words: [], width: source.width, height: source.height, dpi: null, skew: 0 };
  const deg = skewDegrees(full.words);
  // Tesseract boxes enclose the ink; PDF text items use the font's em height. Convert cap
  // height to em for the shared reader's row-spacing thresholds, keeping ink height for audits.
  const words = unskew(full.words, deg).map((w, i) => ({ ...w, glyph_h: w.h, h: w.h / 0.75,
    item: w.item ?? i, itemX0: w.itemX0 ?? w.x0, itemX1: w.itemX1 ?? w.x1 }));
  return { words, lines: TL.clusterLines(words), width: full.width, height: full.height,
    rotation: pick.rotation, word_count: words.length, skew_deg: full.skew + deg,
    image_skew_deg: full.skew, dpi: full.dpi, ...partialMetadata(budget) };
}

export async function ocrPageLines(pdfDoc, pageNumber, engine, progress, opts = {}) {
  const page = await pdfDoc.getPage(pageNumber);
  const vp = page.getViewport({ scale: 1 });
  return ocrRasterPageLines({ width: vp.width, height: vp.height,
    render: (dpi, rotation) => renderPageToImageData(pdfDoc, pageNumber, dpi, rotation, opts),
  }, engine, progress, { ...opts, pageNumber });
}

export async function renderPageToImageData(pdfDoc, pageNumber, dpi, rotation = 0, opts = {}) {
  const page = await pdfDoc.getPage(pageNumber);
  // rotation is applied on top of the page's own /Rotate, so 0 always means
  // "as the PDF viewer shows it" and 90/270 turn a sideways sheet upright.
  const turn = ((page.rotate || 0) + rotation) % 360;
  const size = page.getViewport({ scale: 1, rotation: turn });
  let plan = scanRenderPlan(size.width, size.height, dpi, { ...opts, pageNumber });
  let viewport = page.getViewport({ scale: plan.dpi / 72, rotation: turn });
  // Guard against renderer-specific rounding before allocating either canvas dimension.
  while (Math.ceil(viewport.width) * Math.ceil(viewport.height) > plan.maxPixels) {
    if (plan.dpi <= Math.max(SCAN_MIN_DPI, opts.minDpi ?? SCAN_MIN_DPI)) {
      throw new Error("Page " + pageNumber + " (" + size.width + " x " + size.height + " pt) cannot be read within the " + plan.maxPixels + " pixel limit at the minimum DPI.");
    }
    plan = scanRenderPlan(size.width, size.height, plan.dpi - 1, { ...opts, pageNumber });
    viewport = page.getViewport({ scale: plan.dpi / 72, rotation: turn });
  }
  const canvas = document.createElement("canvas");
  canvas.height = 0;
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: ctx, viewport }).promise;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0;
  return { width: img.width, height: img.height, data: img.data, dpi: plan.dpi };
}

function ocrRowBand(engine, pageImage, colBounds, rowRightEdge, y0, y1, psm = "6", opts = {}) {
  if (opts.recognitionBudget && !opts.recognitionBudget.take()) return null;
  // opts.pad / opts.upscale: the door-schedule path renders the table itself
  // at a DPI chosen for its text size (thicker rulings, no upscale needed);
  // the defaults keep the hardware-schedule path exactly as validated.
  const PAD = opts.pad || 2, ROW_UPSCALE = opts.upscale || 3;
  const ry0 = y0 + PAD, ry1 = y1 - PAD;
  if (ry1 - ry0 < 5) return null;
  const cropped = cropRowImage(pageImage, ry0, ry1, 0, rowRightEdge);
  const rowImg = ROW_UPSCALE > 1 ? upscaleN(cropped, ROW_UPSCALE) : cropped;
  engine.clearImage();
  engine.loadImage(rowImg);
  // PSM 6 (uniform block) for hardware_schedule - rows can wrap to 2+ text
  // lines within one ruled row. PSM 7 (single line) for door_schedule -
  // confirmed live server-side as the correct mode for its one-line rows.
  engine.setVariable("tessedit_pageseg_mode", psm);
  const words = engine.getTextBoxes("word");
  const cells = new Array(colBounds.length).fill("");
  cells.confidence = new Array(colBounds.length).fill(null);
  for (const w of words) {
    const cx = (w.rect.left + w.rect.right) / 2 / ROW_UPSCALE;
    for (let ci = 0; ci < colBounds.length; ci++) {
      if (cx >= colBounds[ci][0] && cx < colBounds[ci][1]) {
        cells[ci] = cells[ci] ? `${cells[ci]} ${w.text}` : w.text;
        const confidence = w.confidence == null ? 0 : w.confidence <= 1 ? w.confidence : w.confidence / 100;
        cells.confidence[ci] = Math.min(cells.confidence[ci] ?? 1, confidence);
        break;
      }
    }
  }
  return cells;
}

// Second read of one size cell (2026-10-07). The row read misses the small
// marks in dimensions at schedule text sizes: on OCCDoorSchedulePg4.pdf,
// 7'-11" (printed with a heavy short dash) came back as 711", 7211", v=11"
// or 11". When a width, height or thickness does not parse, that cell alone
// is read again - cropped inside its rulings, with a white margin - in a few
// fixed ways (enlarged 2x and 3x, thresholded to black on white, restricted
// to the characters a dimension is written with, and not). No single way reads
// every cell of that sheet; a reading is taken only when
//   - it parses as a value a door can have (the caller's accept()), and
//   - its digits are the digits most of the readings of that cell agree on
//     (the row's own reading counts as one), so a reading that dropped or
//     invented a digit is never the one taken.
// Otherwise the value stays unread for the reviewer.
const DIMENSION_CHARS = "0123456789'\"-/ ";
const REREAD_WAYS = [
  { up: 1, whitelist: true },
  { up: 2, whitelist: true },
  { up: 2, thr: 150, whitelist: true },
  { up: 3, thr: 150, whitelist: true },
  { up: 2, thr: 150, whitelist: false },
];
function padWhite(img, m) {
  const w = img.width + 2 * m, h = img.height + 2 * m;
  const out = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < img.height; y++) out.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), ((y + m) * w + m) * 4);
  return { data: out, width: w, height: h };
}
function thresholdImage(img, thr) {
  const d = new Uint8ClampedArray(img.data);
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 < thr ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return { data: d, width: img.width, height: img.height };
}
function readCellOnce(engine, cell, way, budget) {
  if (budget && !budget.take()) return { text: "", confidence: 0 };
  let img = way.up > 1 ? upscaleN(cell, way.up) : cell;
  if (way.thr) img = thresholdImage(img, way.thr);
  img = padWhite(img, Math.max(8, Math.round(img.height / 2)));
  engine.clearImage();
  engine.loadImage(img);
  engine.setVariable("tessedit_pageseg_mode", "7");
  engine.setVariable("tessedit_char_whitelist", way.whitelist ? DIMENSION_CHARS : "");
  try {
    const words = engine.getTextBoxes("word") || [];
    return { text: words.map(w => w.text).join(" ").replace(/\s+/g, " ").trim(),
      confidence: words.length ? Math.min(...words.map(w => w.confidence == null ? 0 : w.confidence <= 1 ? w.confidence : w.confidence / 100)) : 0 };
  } catch (e) {
    return { text: "", confidence: 0 };
  } finally {
    engine.setVariable("tessedit_char_whitelist", "");
  }
}
const digitsOf = (t) => String(t || "").replace(/\D/g, "");
function rereadDimensionCell(engine, pageImage, x0, x1, y0, y1, opts, firstReading, accept) {
  const pad = (opts.pad || 2) + 2;
  const cx0 = Math.max(0, Math.round(x0) + pad), cx1 = Math.min(pageImage.width, Math.round(x1) - pad);
  const cy0 = Math.max(0, Math.round(y0) + pad), cy1 = Math.min(pageImage.height, Math.round(y1) - pad);
  if (cx1 - cx0 < 6 || cy1 - cy0 < 6) return { text: null, readings: [] };
  const cell = cropRowImage(pageImage, cy0, cy1, cx0, cx1);
  const trials = [];
  for (const way of REREAD_WAYS) {
    if (opts.recognitionBudget && !opts.recognitionBudget.check()) break;
    const trial = readCellOnce(engine, cell, way, opts.recognitionBudget);
    trials.push({ ...trial, text: cleanDimension(trial.text) || "" });
  }
  const readings = trials.map(r => r.text);
  const votes = new Map();
  for (const r of readings.concat([cleanDimension(firstReading) || ""])) {
    const d = digitsOf(r);
    if (d) votes.set(d, (votes.get(d) || 0) + 1);
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const agreed = ranked.length && ranked[0][1] >= 2 && !(ranked[1] && ranked[1][1] === ranked[0][1]) ? ranked[0][0] : null;
  const text = agreed ? readings.find((r) => r && digitsOf(r) === agreed && accept(r)) || null : null;
  return { text, readings, confidence: trials.find(r => r.text === text)?.confidence ?? 0 };
}

// Closes the currently-open hardware group into groups/matrix - mirrors
// extractHardwareGroupsViaGrid's server-side closeOpenGroup exactly, minus
// the cross-request KV continuation state (not needed - this whole page
// processes in one synchronous pass client-side).
function closeOpenGroup(state) {
  if (!state.openGroup) return;
  state.groups.push(state.openGroup);
  for (const doorNumber of state.openGroup.assigned_doors) {
    if (doorNumber) state.matrix.push({ door_number: doorNumber, hardware_set_number: state.openGroup.group_number, confidence: 0.85 });
  }
  state.openGroup = null;
}

// Horizontal and vertical rules inside one region of the page, found from a
// render of just that region (the text-layer reader asks for them to snap its
// column boundaries and to tell ruled rows apart). Coordinates in and out are
// device points at scale 1 with the given rotation, as pageTextLines reports.
async function rulesInRegion(pdfDoc, pageNumber, rotation, region, opts = {}) {
  const w = region.x1 - region.x0, hgt = region.y1 - region.y0;
  if (!(w > 10) || !(hgt > 10)) return null;
  // Start at 150 DPI; apply the same pixel budget as every other render.
  const { dpi } = scanRenderPlan(w, hgt, 150, { ...opts, pageNumber });
  const s = dpi / 72;
  const img = await renderRegionToImageData(pdfDoc, pageNumber, dpi, rotation, { x0: region.x0 * s, y0: region.y0 * s, x1: region.x1 * s, y1: region.y1 * s }, opts);
  const { width, height, data } = img;
  const dark = (i) => data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 215;
  // A vertical rule: a pixel column dark over most of the region's height (a
  // hairline renders grey, so the threshold is mild; text never reaches it).
  const colDark = new Uint32Array(width);
  const rowDark = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    const base = y * width;
    for (let x = 0; x < width; x++) { if (dark((base + x) * 4)) { colDark[x]++; rowDark[y]++; } }
  }
  const verticals = [], horizontals = [];
  const cluster = (arr, limit, out, axis) => {
    let run = [];
    const flush = () => { if (run.length) { out.push(region[axis] + (run.reduce((a, b) => a + b, 0) / run.length) / s); run = []; } };
    for (let i = 0; i < arr.length; i++) { if (arr[i] >= limit) run.push(i); else flush(); }
    flush();
  };
  cluster(colDark, 0.6 * height, verticals, "x0");
  cluster(rowDark, 0.55 * width, horizontals, "y0");
  return { verticals, horizontals, dpi };
}

// Where the schedules are in a whole bid set: every page's text layer is
// read (no rendering, so a 288-page manual takes about a second) and each
// page is classed as a door schedule, hardware groups, both or neither.
export async function findSchedulePages(pdfBytes, onProgress, options = {}) {
  const t0 = performance.now();
  const progress = (msg) => { if (onProgress) onProgress(msg); };
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const n = pdfDoc.numPages;
  const out = { pages: n, door_schedule_pages: [], hardware_pages: [], pages_without_text: [], details: [], ms: 0 };
  const limit = Math.min(n, options.maxPages || 1500);
  for (let p = 1; p <= limit; p++) {
    if (p % 25 === 0) progress("Looking for the schedules: page " + p + " of " + n + "...");
    let tl;
    try { tl = await TL.pageTextLines(pdfjsLib, await pdfDoc.getPage(p)); } catch (e) { out.details.push({ page: p, error: String((e && e.message) || e).slice(0, 120) }); continue; }
    if (tl.word_count < 15) { out.pages_without_text.push(p); continue; }
    const c = await TL.classifyLines(tl.lines, { width: tl.width, height: tl.height });
    if (c.door_schedule) { out.door_schedule_pages.push(p); out.details.push({ page: p, door_schedule: c.door_schedule }); }
    if (c.hardware) { out.hardware_pages.push(p); out.details.push({ page: p, hardware: c.hardware }); }
  }
  out.ms = Math.round(performance.now() - t0);
  return out;
}

// extractHardwareScheduleFromPdf: the real client-side entry point. Takes a
// File/Blob/ArrayBuffer of the full PDF and a 1-indexed page number, returns
// {hardware_groups, door_hardware_matrix, detected_nomenclature, metadata} -
// the exact shape the existing POST .../extract-result endpoint expects.
export async function extractHardwareScheduleFromPdf(pdfBytes, pageNumber, onProgress, options = {}) {
  const budget = options.recognitionBudget || recognitionBudget(options);
  options = { ...options, recognitionBudget: budget };
  const t0 = performance.now();
  const progress = (msg) => { if (onProgress) onProgress(msg); };
  progress("Loading PDF renderer...");
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;

  // The text layer first (see the note at the top of this file).
  {
    progress("Reading the text of page " + pageNumber + "...");
    const page = await pdfDoc.getPage(pageNumber);
    const tl = await TL.pageTextLines(pdfjsLib, page);
    if (tl.has_text_layer) {
      const rules = (region) => rulesInRegion(pdfDoc, pageNumber, tl.rotation, region, options);
      const hg = await TL.readHardwareGroupsFromLines(tl.lines, { width: tl.width, height: tl.height }, { rules });
      const groups = hg ? hg.hardware_groups.filter((g) => g.components.length || g.assigned_doors.length) : [];
      if (groups.length) {
        progress("Extraction complete.");
        return {
          hardware_groups: groups.map((g) => ({
            group_number: g.group_number, group_name: g.group_name, assigned_doors: g.assigned_doors, notes: g.notes || null, continued: g.continued,
            components: g.components.map((c) => ({ component_type: c.component_type, description: c.description, quantity: c.quantity == null ? 1 : c.quantity, quantity_printed: c.quantity, uom: c.uom, manufacturer: c.manufacturer, manufacturer_code: c.manufacturer_code, model_number: c.model_number, catalog_number: c.catalog_number, finish: c.finish, notes: c.notes, field_confidence: c.field_confidence, read_from: "text_layer" })),
          })),
          door_hardware_matrix: hg?.door_hardware_matrix || [],
          detected_nomenclature: null,
          metadata: { extraction_mode: "text_layer", extraction_route: "text_layer", page_isolated: false, rotation_applied: tl.rotation, table_count: groups.length, text_words: tl.text_word_count ?? tl.word_count, total_time_ms: Math.round(performance.now() - t0) },
        };
      }
      // Text on the page but no hardware groups in it. When the text reads as
      // a door schedule instead, say so and skip the OCR pass (the caller then
      // reads the page as a door schedule, from the text, at once).
      const c = await TL.classifyLines(tl.lines, { width: tl.width, height: tl.height });
      return { hardware_groups: [], door_hardware_matrix: [], detected_nomenclature: null, metadata: { extraction_mode: "text_layer", page_isolated: false, table_count: 0, no_table_detected: true, text_layer_reads_as: c.door_schedule ? "door_schedule" : null, text_words: tl.text_word_count ?? tl.word_count, message: "No hardware schedule was found in the text on page " + pageNumber + "." } };
    }
  }

  const DETECT_DPI = 150, BASE_DPI = 400;

  progress(`Detecting table regions on page ${pageNumber}...`);
  const detectImage = await renderPageToImageData(pdfDoc, pageNumber, DETECT_DPI, 0, options);
  const pageSize = (await pdfDoc.getPage(pageNumber)).getViewport({ scale: 1 });
  const renderDpi = scanRenderPlan(pageSize.width, pageSize.height, BASE_DPI, { ...options, pageNumber }).dpi;
  const RATIO = renderDpi / detectImage.dpi;
  const lum = toLuminance(detectImage);
  const candidateRegions = findAllTableBounds(lum, detectImage.width, detectImage.height);

  const tables = [];
  for (const region of candidateRegions) {
    const detected = detectGridLinesHardware(lum, detectImage.width, region);
    if (detected.colLines.length < 4 || detected.rowLines.length < 6) continue;
    tables.push({
      colLines: detected.colLines.map((x) => Math.round(x * RATIO)),
      rowLines: detected.rowLines.map((y) => Math.round(y * RATIO)),
    });
  }
  if (tables.length === 0) {
    // No ruled table: a scanned spec page prints its groups unruled. Read it as a scan.
    if (!options.noOcrLines) {
      const engine0 = await getOcrEngine(progress);
      const ol = await ocrPageLines(pdfDoc, pageNumber, engine0, progress, options);
      const hg = ol.word_count >= 15 ? await TL.readHardwareGroupsFromLines(ol.lines, { width: ol.width, height: ol.height }, {}) : null;
      const groups = hg ? hg.hardware_groups.filter((g) => g.components.length || g.assigned_doors.length) : [];
      if (groups.length || ol.partial) {
        progress(ol.partial ? ol.message : "Extraction complete.");
        return {
          partial: ol.partial,
          hardware_groups: groups.map((g) => ({
            group_number: g.group_number, group_name: g.group_name, assigned_doors: g.assigned_doors, notes: g.notes || null, continued: g.continued,
            components: g.components.map((c) => ({ component_type: c.component_type, description: c.description, quantity: c.quantity == null ? 1 : c.quantity, quantity_printed: c.quantity, uom: c.uom, manufacturer: c.manufacturer, manufacturer_code: c.manufacturer_code, model_number: c.model_number, catalog_number: c.catalog_number, finish: c.finish, notes: c.notes, field_confidence: c.field_confidence, read_from: "ocr_lines" })),
          })),
          door_hardware_matrix: hg?.door_hardware_matrix || [],
          detected_nomenclature: null,
          metadata: { ...partialMetadata(budget), extraction_mode: "ocr_text_lines", extraction_route: "ocr_text_lines", page_isolated: false, rotation_applied: ol.rotation, skew_corrected_deg: ol.skew_deg, ocr_dpi: ol.dpi, table_count: groups.length, ocr_words: ol.word_count, total_time_ms: Math.round(performance.now() - t0) },
        };
      }
    }
    return { hardware_groups: [], partial: budget.status().partial, door_hardware_matrix: [], detected_nomenclature: null, metadata: { ...partialMetadata(budget), extraction_mode: "client_grid_deterministic", page_isolated: false, table_count: 0, no_table_detected: true } };
  }

  progress(`Rendering page ${pageNumber} at full resolution...`);
  const pageImage = await renderPageToImageData(pdfDoc, pageNumber, renderDpi, 0, options);

  progress("Loading OCR engine...");
  const engine = await getOcrEngine(progress);

  for (const t of tables) {
    t.rowRightEdge = Math.min(t.colLines[t.colLines.length - 1], pageImage.width - 1);
    t.colBounds = [];
    for (let i = 0; i < t.colLines.length - 1; i++) t.colBounds.push([t.colLines[i], t.colLines[i + 1]]);
    eraseVerticalLines(pageImage, t.colLines);
    t.totalRowBands = t.rowLines.length - 1;
  }

  const state = { groups: [], matrix: [], openGroup: null };
  let tableIndex = 0;
  for (const t of tables) {
    tableIndex++;
    progress(`OCR'ing table ${tableIndex}/${tables.length} (${t.totalRowBands} rows)...`);
    const headerSearchWindow = Math.min(6, t.totalRowBands);
    const headerBandTexts = [];
    for (let i = 0; i < headerSearchWindow; i++) {
      await yieldRow();
      if (!budget.check()) break;
      headerBandTexts.push(ocrRowBand(engine, pageImage, t.colBounds, t.rowRightEdge, t.rowLines[i], t.rowLines[i + 1], "6", { recognitionBudget: budget }) || []);
    }
    let headerRowIdx = 0, headerMatches = -1;
    for (let i = 0; i < headerBandTexts.length; i++) {
      const trial = new Set();
      let matches = 0;
      for (const cellText of headerBandTexts[i]) {
        const f = matchHeaderLabel(cellText, trial);
        if (f) { matches++; trial.add(f); }
      }
      if (matches > headerMatches) { headerMatches = matches; headerRowIdx = i; }
    }
    const usedFields = new Set();
    const fieldNames = (headerBandTexts[headerRowIdx] || []).map((c) => {
      const f = matchHeaderLabel(c, usedFields);
      if (f) usedFields.add(f);
      return f;
    });
    // Positional fallback for the canonical 5-column shape - same real,
    // structurally-confirmed reasoning as the server-side version (noisy
    // header OCR shouldn't lose otherwise-clean data-row columns).
    if (fieldNames.length === 5) {
      const canonical = ["quantity", "description", "product_number", "finish", "manufacturer"];
      for (let ci = 0; ci < 5; ci++) {
        if (!fieldNames[ci] && !usedFields.has(canonical[ci])) { fieldNames[ci] = canonical[ci]; usedFields.add(canonical[ci]); }
      }
    }

    // Pre-header structural rows ("Hardware Set:"/"Door#" commonly land
    // before this table's own column header).
    for (let hb = 0; hb < headerRowIdx; hb++) {
      const structural = classifyHardwareRow(headerBandTexts[hb]);
      if (structural) {
        if (structural.row_type === "hardware_set_header") {
          closeOpenGroup(state);
          state.openGroup = { group_number: structural.group_number, group_name: null, assigned_doors: [], components: [] };
        } else if (structural.row_type === "door_assignment") {
          if (!state.openGroup) state.openGroup = { group_number: null, group_name: null, assigned_doors: [], components: [] };
          state.openGroup.assigned_doors.push(...structural.assigned_doors);
        }
      }
    }

    const dataStartBand = headerRowIdx + 1;
    for (let i = dataStartBand; i < t.totalRowBands; i++) {
      await yieldRow();
      if (!budget.check()) break;
      const cells = ocrRowBand(engine, pageImage, t.colBounds, t.rowRightEdge, t.rowLines[i], t.rowLines[i + 1], "6", { recognitionBudget: budget });
      if (!cells) continue;
      const structural = classifyHardwareRow(cells);
      if (structural) {
        if (structural.row_type === "hardware_set_header") {
          closeOpenGroup(state);
          state.openGroup = { group_number: structural.group_number, group_name: null, assigned_doors: [], components: [] };
        } else if (structural.row_type === "door_assignment") {
          if (!state.openGroup) state.openGroup = { group_number: null, group_name: null, assigned_doors: [], components: [] };
          state.openGroup.assigned_doors.push(...structural.assigned_doors);
        }
        continue;
      }
      if (!state.openGroup) continue;
      const qty = parseInt(cells[fieldNames.indexOf("quantity")], 10);
      state.openGroup.components.push({
        component_type: fieldNames.includes("description") ? cells[fieldNames.indexOf("description")] || null : null,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        uom: "EA",
        manufacturer: fieldNames.includes("manufacturer") ? cells[fieldNames.indexOf("manufacturer")] || null : null,
        model_number: fieldNames.includes("product_number") ? cells[fieldNames.indexOf("product_number")] || null : null,
        finish: fieldNames.includes("finish") ? cells[fieldNames.indexOf("finish")] || null : null,
        notes: null,
      });
    }
  }
  closeOpenGroup(state);

  const work = partialMetadata(budget);
  progress(work.partial ? work.message : "Extraction complete.");
  return {
    partial: work.partial,
    hardware_groups: state.groups,
    door_hardware_matrix: state.matrix,
    detected_nomenclature: null,
    metadata: {
      ...work,
      extraction_mode: "client_grid_deterministic",
      extraction_route: "client_grid_deterministic",
      page_isolated: false,
      table_count: tables.length,
      total_time_ms: Math.round(performance.now() - t0),
    },
  };
}

// ===== door_schedule (2026-10-07: orientation, ruling-only columns, text-sized render) =====

// A door mark is a short code with at least one digit (053, 131, 144A, 228A,
// B12, 1-101). Section rows inside a schedule ("EXISTING", "FIRST FLOOR",
// "NEW CONSTRUCTION") and stray OCR noise are not doors and are dropped here,
// never written as door rows.
function cleanDoorMark(text) {
  const t = String(text || "").replace(/[|!\[\]{}()_'"`~,;:]/g, " ").trim().split(/\s+/).filter(Boolean).join("");
  const core = t.replace(/^[.\-\/]+|[.\-\/]+$/g, "");
  if (!core || core.length > 10) return null;
  if (!/\d/.test(core)) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9.\-\/]*$/.test(core)) return null;
  return core.toUpperCase();
}

// Residue of a ruling that survived erasing reads as a lone "|", "}", "j"...
// next to the real value; a lone token from that set is dropped when the cell
// has anything else in it.
const RULE_RESIDUE = /^[|{}\[\]()jlI!\\\/:;,.\u2014\u2013]$/;
function cleanCell(text) {
  const parts = String(text || "").replace(/[|]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  while (parts.length > 1 && RULE_RESIDUE.test(parts[0])) parts.shift();
  while (parts.length > 1 && RULE_RESIDUE.test(parts[parts.length - 1])) parts.pop();
  const t = parts.join(" ");
  return t || null;
}

// Architectural dimensions are always feet'-inches" with a hyphen; OCR of
// that hyphen at schedule sizes comes back as "=", "~" or a dash variant, and
// curly quotes come back for the foot/inch marks. Only those characters are
// normalised - digits are never guessed.
function cleanDimension(text) {
  const t = cleanCell(text);
  if (!t) return null;
  return t.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201c\u201d\u2033]/g, '"').replace(/(\d'?)\s*[=~\u2013\u2014]\s*(\d)/g, "$1-$2");
}

// Door thickness: "13/4\"" is "1 3/4\"" with the space lost (a proper
// fraction after one whole digit), also written 1-3/4", 3/4" or 2".
// A fraction in a dimension is written reduced, over 2, 4, 8 or 16 (1/2,
// 3/4, 3/8...): "2/4" or "3/5" is a misread digit, not a fraction.
function fractionValue(n, d) {
  const num = parseInt(n, 10), den = parseInt(d, 10);
  if (![2, 4, 8, 16].includes(den) || !(num > 0) || num >= den || num % 2 === 0) return null;
  return num / den;
}

function parseThickness(text) {
  const t = cleanDimension(text);
  if (!t) return null;
  let v = null, m;
  if ((m = t.match(/^(\d)[\s-]*(\d{1,2})\/(\d{1,2})\s*"?$/))) {
    const f = fractionValue(m[2], m[3]);
    v = f == null ? null : parseInt(m[1], 10) + f;
  } else if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\s*"?$/))) {
    v = fractionValue(m[1], m[2]);
  } else if ((m = t.match(/^(\d)\s*"$/))) {
    v = parseInt(m[1], 10);
  }
  // A door leaf is 1 3/8" to 2 1/2" thick. A value outside 3/4"-3" is a
  // misread (OCCDoorSchedulePg4.pdf: "4 34\"" became 82 inches) and stays
  // unread rather than counted.
  return v != null && v >= 0.75 && v <= 3 ? v : null;
}

// Door sizes (2026-10-07, second pass). A schedule writes them as feet-inches
// with a separator (3'-0", 7'-11", 3-0") or, on some sheets, as plain inches
// for both (36" x 84"). The shared parseArchDimension also takes digits with
// no separator, which turned OCR misreads on the sample sheet into sizes no
// door has: 7'-11" read as 711" became 71'-1", 7211" became 721'-1", 11"
// became 1'-1", and 7'-0" read as 70" became 5'-10". Here a dimension counts
// only when its format is unambiguous and the value is one a door can have;
// anything else stays unread (null). The size text as read is kept for the
// reviewer, and the takeoff counts the door under "size not read" instead of
// under an invented size.
const DOOR_LIMITS = { width: [12, 144], height: [60, 240] };
function readDoorDimension(text) {
  const t = cleanDimension(text);
  if (!t) return null;
  let m = t.match(/^(\d{1,2})\s*(?:'\s*-?|-)\s*(\d{1,2})(?:\s+(\d)\/(\d{1,2}))?\s*"?$/);
  if (m) {
    const inch = parseInt(m[2], 10);
    const frac = m[3] ? fractionValue(m[3], m[4]) : 0;
    if (inch > 11 || frac == null) return null;
    return { inches: parseInt(m[1], 10) * 12 + inch + frac, format: "ft-in" };
  }
  m = t.match(/^(\d{1,2})'$/);
  if (m) return { inches: parseInt(m[1], 10) * 12, format: "ft-in" };
  m = t.match(/^(\d{2,3})(?:\s+(\d)\/(\d{1,2}))?\s*"$/);
  if (m) {
    const frac = m[2] ? fractionValue(m[2], m[3]) : 0;
    return frac == null ? null : { inches: parseInt(m[1], 10) + frac, format: "in" };
  }
  return null;
}
function doorSize(widthText, heightText) {
  const w = readDoorDimension(widthText), h = readDoorDimension(heightText);
  // Plain inches only when the row writes both dimensions that way: an
  // inches-only value next to a feet-inches one is a feet-inches value whose
  // marks were lost.
  const plainInches = !!(w && h && w.format === "in" && h.format === "in");
  const accept = (d, kind) => (d && (d.format === "ft-in" || plainInches) && d.inches >= DOOR_LIMITS[kind][0] && d.inches <= DOOR_LIMITS[kind][1] ? d.inches : null);
  return { width_inches: accept(w, "width"), height_inches: accept(h, "height") };
}

// Fire ratings: one rating must count as one value. OCR varies the case
// ("45 Min."), the closing punctuation ("20 MIN,") and the unit word
// ("20 MIM."); only those are normalised. The number is kept as read
// ("2U MIN." stays, for the reviewer).
function cleanFireRating(text) {
  const t = cleanCell(text);
  if (!t) return null;
  let u = t.toUpperCase().replace(/\s+/g, " ");
  u = u.replace(/(^|[^A-Z])M[I1L][NM](?![A-Z])[.,;:]?/g, "$1MIN.");
  u = u.replace(/(\S)\s*MIN\./g, "$1 MIN.");
  return u.replace(/[,;:]+$/, "");
}

// Short schedule codes (frame type S1, S12...): a leading "$" before a digit
// is the letter S.
function cleanCode(text) {
  const t = cleanCell(text);
  return t ? t.replace(/^\$(?=\d)/, "S") : null;
}

function bestHeaderBand(bandTexts, patternTable) {
  let idx = 0, matches = -1;
  for (let i = 0; i < bandTexts.length; i++) {
    const trial = new Set();
    let m = 0;
    for (const cellText of bandTexts[i]) {
      const f = matchHeaderLabel(cellText, trial, patternTable);
      if (f) { m++; trial.add(f); }
    }
    if (m > matches) { matches = m; idx = i; }
  }
  return { idx, matches: Math.max(0, matches) };
}

// Field name per column from the header band. A two-line header (group row
// "SIZE / DOOR / FRAME / DETAILS" over "WIDTH / HEIGHT / TYPE ...") lands in
// two bands; a column the best band left unnamed takes its name from the
// band just above it when that band names it.
function headerFieldNames(bandTexts, idx, patternTable) {
  const used = new Set();
  const names = (bandTexts[idx] || []).map((c) => {
    const f = matchHeaderLabel(c, used, patternTable);
    if (f) used.add(f);
    return f;
  });
  const above = bandTexts[idx - 1];
  if (above) {
    for (let ci = 0; ci < names.length; ci++) {
      if (names[ci]) continue;
      const f = matchHeaderLabel(above[ci], used, patternTable);
      if (f) { names[ci] = f; used.add(f); }
    }
  }
  return names;
}

function medianGap(lines) {
  const gaps = [];
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i] - lines[i - 1]);
  gaps.sort((a, b) => a - b);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
}

// Renders one rectangle of a page (device pixels at this DPI/rotation) - the
// door table is rendered on its own at the DPI its text needs, instead of the
// whole sheet at a fixed DPI.
export async function renderRegionToImageData(pdfDoc, pageNumber, dpi, rotation, region, opts = {}) {
  const page = await pdfDoc.getPage(pageNumber);
  const plan = scanRenderPlan((region.x1 - region.x0) * 72 / dpi, (region.y1 - region.y0) * 72 / dpi, dpi, { ...opts, pageNumber });
  const scale = plan.dpi / dpi;
  region = Object.fromEntries(Object.entries(region).map(([key, value]) => [key, value * scale]));
  dpi = plan.dpi;
  const viewport = page.getViewport({ scale: dpi / 72, rotation: ((page.rotate || 0) + rotation) % 360 });
  const w = plan.width, h = plan.height;
  const canvas = document.createElement("canvas");
  canvas.height = 0;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  await page.render({ canvasContext: ctx, viewport, transform: [1, 0, 0, 1, -region.x0, -region.y0] }).promise;
  const img = ctx.getImageData(0, 0, w, h);
  canvas.width = 0;
  canvas.height = 0;
  return { width: img.width, height: img.height, data: img.data, dpi, region };
}

// Revision clouds, deltas and markups are drawn in colour (blue/red/green)
// over the black schedule text; OCR reads them as noise. Strongly coloured
// pixels become paper before OCR (gridlines were already found).
function whitenColouredInk(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 90) { d[i] = d[i + 1] = d[i + 2] = 255; }
  }
}

// Erases each detected ruling over its real width: from the detected centre
// outwards while the pixel column is still covered by long dark runs (a
// heavy table border is several pixels wide at a high DPI; text never has
// runs that long, so neighbouring text survives).
function eraseRulings(imageData, xs, y0, y1, minRun, maxHalfWidth) {
  const { width, data } = imageData;
  const lumAt = (x, y) => { const i = (y * width + x) * 4; return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114; };
  const coverage = (x) => {
    let run = 0, covered = 0;
    for (let y = y0; y < y1; y++) {
      if (lumAt(x, y) < 150) run++;
      else { if (run >= minRun) covered += run; run = 0; }
    }
    if (run >= minRun) covered += run;
    return covered / Math.max(1, y1 - y0);
  };
  for (const xc of xs) {
    // Every pixel column in the window is tested on its own (a double rule
    // has white between its two strokes; stopping at the first white column
    // left the second stroke to be read as "|", "}" or "j").
    const cols = [];
    for (let dx = -maxHalfWidth; dx <= maxHalfWidth; dx++) {
      const x = xc + dx;
      if (x < 0 || x >= width) continue;
      if (Math.abs(dx) <= 1 || coverage(x) > 0.2) cols.push(x);
    }
    for (const x of cols) {
      for (let y = 0; y < imageData.height; y++) {
        const i = (y * width + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
      }
    }
  }
}

// The horizontal twin of eraseRulings: a heavy row rule is many pixels tall at
// a text-sized DPI, and cropping inside it with a fixed pad clipped the text
// (row bands came out 32 px tall with the bottom of every glyph cut off). Each
// pixel row near a detected rule that is mostly dark across the table width
// is a rule pixel row and becomes paper; text rows never are.
function eraseRowRulings(imageData, ys, x0, x1, maxHalfHeight) {
  const { width, height, data } = imageData;
  const darkFrac = (y) => {
    let dark = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 150) dark++;
    }
    return dark / Math.max(1, x1 - x0);
  };
  for (const yc of ys) {
    for (let dy = -maxHalfHeight; dy <= maxHalfHeight; dy++) {
      const y = yc + dy;
      if (y < 0 || y >= height) continue;
      if (darkFrac(y) > 0.5) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 255;
        }
      }
    }
  }
}

// extractDoorScheduleFromPdf: the door_schedule sibling of
// extractHardwareScheduleFromPdf above - same real client-side pipeline
// (pdf.js render + tesseract-wasm OCR), returning the {doors:[...]} contract
// the POST .../extract-result route and the server-side Browser Rendering
// runner both write through writeDoorScheduleEntries.
//
// 2026-10-07 (OCCDoorSchedulePg4.pdf, an A-801 sheet printed sideways onto
// portrait Letter, 2-pt text):
//   * Orientation. A sideways sheet still has a perfectly regular grid, just
//     turned 90 degrees, so gridlines alone cannot tell it from an upright
//     table (it read as "51 columns, 22 rows"). The page is tried as shown,
//     then turned 90, 270 and 180 degrees; the header band decides - the
//     orientation whose header reads as door-schedule labels (MARK, FIRE
//     RATING, WIDTH...) wins, and the first one with a clear header (4+
//     labels) stops the search, so an upright sheet costs what it did before.
//   * Ruling-only columns (detectGridLinesDoor) and ruling-width erasing.
//   * Text-sized render. Only the table is rendered, at the DPI that makes a
//     row about TARGET_ROW_PX tall (300-1200 dpi, capped by maxPixels),
//     instead of the whole sheet at 400 dpi with a 3x pixel upscale (which
//     cannot add detail that was never rendered: 3'-0" read as "a").
export async function extractDoorScheduleFromPdf(pdfBytes, pageNumber, onProgress, options = {}) {
  const budget = options.recognitionBudget || recognitionBudget(options);
  options = { ...options, recognitionBudget: budget };
  const t0 = performance.now();
  const progress = (msg) => { if (onProgress) onProgress(msg); };
  progress("Loading PDF renderer...");
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;

  let hasTextLayer = false;
  // The text layer first (see the note at the top of this file).
  {
    progress("Reading the text of page " + pageNumber + "...");
    const page = await pdfDoc.getPage(pageNumber);
    const tl = await TL.pageTextLines(pdfjsLib, page);
    if (tl.has_text_layer) {
      hasTextLayer = true;
      const rules = (region) => rulesInRegion(pdfDoc, pageNumber, tl.rotation, region, options);
      const ds = await TL.readDoorScheduleFromLines(tl.lines, { width: tl.width, height: tl.height }, { rules });
      if (!(ds && ds.doors.length)) {
        const c = await TL.classifyLines(tl.lines, { width: tl.width, height: tl.height });
        if (c.hardware) {
          return { doors: [], extraction_confidence: 0, metadata: { extraction_mode: "text_layer", page_isolated: false, no_table_detected: true, text_layer_reads_as: "hardware_schedule", text_words: tl.text_word_count ?? tl.word_count } };
        }
      }
      if (ds && ds.doors.length) {
        progress("Extraction complete.");
        return {
          doors: ds.doors,
          extraction_confidence: 0.98,
          metadata: {
            extraction_mode: "text_layer", extraction_route: "text_layer", page_isolated: false,
            row_count: ds.doors.length, rotation_applied: tl.rotation, text_words: tl.text_word_count ?? tl.word_count,
            tables: ds.tables.map((t) => ({ title: t.title, rows: t.rows, fields: t.fields, header: t.header, rules_used: t.rules_used })),
            total_time_ms: Math.round(performance.now() - t0),
          },
        };
      }
      return { doors: [], extraction_confidence: 0, metadata: { extraction_mode: "text_layer", no_table_detected: true, text_words: tl.text_word_count ?? tl.word_count, message: "No door schedule was found in the text on page " + pageNumber + "." } };
    }
  }

  const DETECT_DPI = 150;
  const TARGET_ROW_PX = options.targetRowPx || 64;
  const MIN_DPI = 300, MAX_DPI = options.maxDpi || 1200;
  const rotations = Array.isArray(options.rotations) && options.rotations.length ? options.rotations : [0, 90, 270, 180];
  const headerPsm = options.headerPsm || "6";
  const rowPsm = options.rowPsm || "7";

  progress("Loading OCR engine...");
  const engine = await getOcrEngine(progress);

  const attempts = [];
  let scanned;
  const readScan = async () => {
    if (scanned !== undefined) return scanned;
    const ol = await ocrPageLines(pdfDoc, pageNumber, engine, progress, options);
    const ds = ol.word_count >= 15 ? await TL.readDoorScheduleFromLines(ol.lines, { width: ol.width, height: ol.height }, {}) : null;
    scanned = (ds && ds.doors.length) || ol.partial ? {
      partial: ol.partial,
      doors: (ds?.doors || []).map((d) => ({ ...d, read_from: "ocr_lines", confidence_source: "ocr_words" })),
      extraction_confidence: 0.85,
      metadata: { ...partialMetadata(budget), extraction_mode: "ocr_text_lines", extraction_route: "ocr_text_lines", page_isolated: false, expected_marks: options.expectedMarks || [], row_count: ds?.doors.length || 0, rotation_applied: ol.rotation, skew_corrected_deg: ol.skew_deg, ocr_dpi: ol.dpi, ocr_words: ol.word_count, orientation_attempts: attempts, total_time_ms: Math.round(performance.now() - t0) },
    } : null;
    if (scanned) progress(scanned.partial ? scanned.metadata.message : "Extraction complete.");
    return scanned;
  };
  // Full-size scans go through the bounded whole-sheet orientation/deskew pass first. The
  // older grid detector assumes straight rulings and can mistake a sheet border for the table.
  const viewport = (await pdfDoc.getPage(pageNumber)).getViewport({ scale: 1 });
  if (!hasTextLayer && Math.max(viewport.width, viewport.height) > 1100 && !options.noOcrLines) {
    const result = await readScan();
    if (result) return result;
  }
  let best = null;
  for (const rotation of rotations) {
    await yieldRow();
    if (!budget.check()) break;
    const turned = rotation ? " (turned " + rotation + " degrees)" : "";
    progress("Detecting the table on page " + pageNumber + turned + "...");
    const detectImage = await renderPageToImageData(pdfDoc, pageNumber, DETECT_DPI, rotation, options);
    const detectDpi = detectImage.dpi;
    const lum = toLuminance(detectImage);
    const bounds = findTableBoundsDoor(lum, detectImage.width, detectImage.height);
    const detected = bounds ? detectGridLinesDoor(lum, detectImage.width, bounds) : { colLines: [], rowLines: [] };
    const attempt = { rotation, columns: detected.colLines.length, row_lines: detected.rowLines.length, header_matches: 0 };
    attempts.push(attempt);
    if (detected.colLines.length < 4 || detected.rowLines.length < 6) continue;

    // DPI from the measured row pitch, then capped so the table bitmap stays
    // within maxPixels.
    const pitch150 = Math.max(2, medianGap(detected.rowLines));
    let dpi = Math.max(MIN_DPI, Math.min(MAX_DPI, Math.round(detectDpi * TARGET_ROW_PX / pitch150)));
    const wideEnd150 = detected.wideColEnd ?? detectImage.width - 1;
    const r150 = {
      x0: Math.max(0, detected.colLines[0] - 6),
      x1: Math.min(detectImage.width, wideEnd150 + 6),
      y0: Math.max(0, detected.rowLines[0] - 6),
      y1: Math.min(detectImage.height, detected.rowLines[detected.rowLines.length - 1] + 6),
    };
    dpi = scanRenderPlan((r150.x1 - r150.x0) * 72 / detectDpi, (r150.y1 - r150.y0) * 72 / detectDpi, dpi, { ...options, pageNumber }).dpi;
    let s = dpi / detectDpi;
    let region = { x0: r150.x0 * s, y0: r150.y0 * s, x1: r150.x1 * s, y1: r150.y1 * s };
    progress("Rendering the table at " + dpi + " dpi" + turned + "...");
    const pageImage = await renderRegionToImageData(pdfDoc, pageNumber, dpi, rotation, region, options);
    dpi = pageImage.dpi;
    region = pageImage.region;
    s = dpi / detectDpi;
    const colLines = detected.colLines.map((x) => Math.round(x * s) - region.x0);
    const rowLines = detected.rowLines.map((y) => Math.round(y * s) - region.y0);
    const wideColEnd = Math.min(Math.round(wideEnd150 * s) - region.x0, pageImage.width - 1);
    const colBounds = [];
    for (let i = 0; i < colLines.length - 1; i++) colBounds.push([colLines[i], colLines[i + 1]]);
    colBounds.push([colLines[colLines.length - 1], wideColEnd]);
    const pitchPx = pitch150 * s;
    eraseRulings(pageImage, colLines.concat([wideColEnd]), Math.max(0, rowLines[0]), Math.min(pageImage.height, rowLines[rowLines.length - 1]), Math.max(3, Math.round(pitchPx * 2)), Math.max(4, Math.round(s * 4)));
    eraseRowRulings(pageImage, rowLines, Math.max(0, colLines[0]), Math.min(pageImage.width, wideColEnd), Math.max(3, Math.round(s * 3)));
    whitenColouredInk(pageImage);
    const ocrOpts = { recognitionBudget: budget, pad: 2, upscale: Math.max(1, Math.min(3, Math.round(TARGET_ROW_PX / pitchPx))) };
    const totalRowBands = rowLines.length - 1;

    const headerSearchWindow = Math.min(options.headerWindow || 5, totalRowBands);
    progress("Reading the header row" + turned + "...");
    const headerBandTexts = [];
    for (let i = 0; i < headerSearchWindow; i++) {
      await yieldRow();
      if (!budget.check()) break;
      headerBandTexts.push(ocrRowBand(engine, pageImage, colBounds, wideColEnd, rowLines[i], rowLines[i + 1], headerPsm, ocrOpts) || []);
    }
    const header = bestHeaderBand(headerBandTexts, DOOR_SCHEDULE_HEADER_PATTERNS);
    attempt.header_matches = header.matches;
    attempt.dpi = dpi;
    if (options.debug) attempt.header_bands = headerBandTexts.map((cells) => cells.join(" | "));
    if (!best || header.matches > best.header.matches) {
      best = { rotation, dpi, region, pageImage, colBounds, wideColEnd, rowLines, totalRowBands, headerBandTexts, header, ocrOpts };
    }
    if (header.matches >= 4) break;
  }

  if (!best || best.header.matches < 3) {
    // Smaller tilted scans can fail the straight-grid pass too. Use the same OCR line path.
    if (!hasTextLayer && !options.noOcrLines) {
      const result = await readScan();
      if (result) return result;
    }
    return { doors: [], partial: budget.status().partial, extraction_confidence: 0, metadata: { ...partialMetadata(budget), extraction_mode: "client_grid_deterministic", page_isolated: false, no_table_detected: !best, no_door_header: !!best, header_matches: best?.header.matches || 0, orientation_attempts: attempts, total_time_ms: Math.round(performance.now() - t0) } };
  }

  const { pageImage, colBounds, wideColEnd, rowLines, totalRowBands, headerBandTexts, header, ocrOpts } = best;
  const fieldNames = headerFieldNames(headerBandTexts, header.idx, DOOR_SCHEDULE_HEADER_PATTERNS);
  // The mark is the row key. If header OCR missed the MARK label, the first
  // column is the mark column on the schedules this was built against (and
  // cleanDoorMark still rejects anything that is not a mark).
  if (!fieldNames.includes("mark") && fieldNames.length > 0 && !fieldNames[0]) fieldNames[0] = "mark";

  const dataStartBand = header.idx + 1;
  progress("Reading " + Math.max(0, totalRowBands - dataStartBand) + " table rows...");
  const rows = [];
  const rawRows = [];
  for (let i = dataStartBand; i < totalRowBands; i++) {
    await yieldRow();
    if (!budget.check()) break;
    const cells = ocrRowBand(engine, pageImage, colBounds, wideColEnd, rowLines[i], rowLines[i + 1], rowPsm, ocrOpts);
    if (!cells) continue;
    if (options.debug) rawRows.push(cells.join(" | "));
    const row = { _band: i, _confidence: {} };
    let hasAnyField = false;
    for (let ci = 0; ci < fieldNames.length; ci++) {
      const key = fieldNames[ci] || "col_" + ci;
      row[key] = cells[ci] || "";
      row._confidence[key] = cells.confidence[ci] ?? 0;
      if (fieldNames[ci] && cells[ci]) hasAnyField = true;
    }
    if (hasAnyField) rows.push(row);
  }

  // Second read of the size cells that did not parse (see rereadDimensionCell).
  const sizeCols = { width: fieldNames.indexOf("width"), height: fieldNames.indexOf("height"), thickness: fieldNames.indexOf("thickness") };
  let reread = 0, rereadUsed = 0;
  for (const row of rows) {
    await yieldRow();
    if (!budget.check()) break;
    if (!cleanDoorMark(row.mark)) continue;
    const y0 = rowLines[row._band], y1 = rowLines[row._band + 1];
    const size = doorSize(row.width, row.height);
    const tryCell = (field, parses) => {
      const ci = sizeCols[field];
      if (ci < 0 || !colBounds[ci]) return;
      reread++;
      const got = rereadDimensionCell(engine, pageImage, colBounds[ci][0], colBounds[ci][1], y0, y1, ocrOpts, row[field], parses);
      if (options.debug) (row._reread = row._reread || {})[field] = got;
      if (got.text) { row[field] = got.text; row._confidence[field] = got.confidence; rereadUsed++; }
    };
    const fits = (kind) => (t) => { const d = readDoorDimension(t); return !!(d && d.format === "ft-in" && d.inches >= DOOR_LIMITS[kind][0] && d.inches <= DOOR_LIMITS[kind][1]); };
    if (size.width_inches == null) tryCell("width", fits("width"));
    if (size.height_inches == null) tryCell("height", fits("height"));
    if (parseThickness(row.thickness) == null) tryCell("thickness", (t) => parseThickness(t) != null);
  }

  // Same {mark/hardware_group/fire_rating/size/...} mapping extractGridDoors
  // uses server-side, plus the frame/finish/detail columns the schedule
  // actually carries (written by writeDoorScheduleEntries when present).
  // source_row is the table row band the values were read from (row 0 is the
  // table's top band), so every door traces back to its line on the sheet.
  const doors = rows.map((row) => ({
    door_number: cleanDoorMark(row.mark),
    hardware_group: cleanCell(row.hardware_group),
    fire_rating: cleanFireRating(row.fire_rating),
    size: [cleanDimension(row.width), cleanDimension(row.height)].filter(Boolean).join(" x ") || null,
    ...doorSize(row.width, row.height),
    thickness: cleanDimension(row.thickness),
    thickness_inches: parseThickness(row.thickness),
    door_type: cleanCell(row.door_type),
    material_code: cleanCell(row.door_material),
    door_finish: cleanCell(row.door_finish),
    stc_rating: cleanCell(row.stc_rating),
    frame_type: cleanCode(row.frame_type),
    frame_material: cleanCell(row.frame_material),
    frame_finish: cleanCell(row.frame_finish),
    head_detail: cleanCell(row.head_detail),
    jamb_detail: cleanCell(row.jamb_detail),
    sill_detail: cleanCell(row.sill_detail),
    panic_hardware: cleanCell(row.panic_hardware),
    remarks: cleanCell(row.notes),
    source_row: row._band,
    read_from: "ocr",
    confidence_source: "ocr_words",
    field_confidence: Object.fromEntries(fieldNames.filter(Boolean).map((f) => [f,
      (f === "width" || f === "height") && doorSize(row.width, row.height)[f + "_inches"] == null ? 0 : row._confidence[f]])),
    ...(options.debug && row._reread ? { size_reread: row._reread } : {}),
  })).filter((d) => d.door_number);

  const metadata = {
    ...partialMetadata(budget),
    expected_marks: options.expectedMarks || [],
    extraction_mode: "client_grid_deterministic",
    extraction_route: "client_grid_deterministic",
    page_isolated: false,
    row_count: doors.length,
    rotation_applied: best.rotation,
    render_dpi: best.dpi,
    header_fields: fieldNames,
    header_matches: header.matches,
    size_cells_reread: reread,
    size_cells_reread_used: rereadUsed,
    orientation_attempts: attempts,
    total_time_ms: Math.round(performance.now() - t0),
  };
  if (options.debug) {
    metadata.raw_rows = rawRows;
    metadata.col_bounds = colBounds;
    metadata.row_lines = rowLines;
    metadata.header_bands = headerBandTexts.map((cells) => cells.join(" | "));
    metadata.header_idx = header.idx;
  }
  progress(metadata.partial ? metadata.message : "Extraction complete.");
  return { doors, partial: metadata.partial, extraction_confidence: 0.85, metadata };
}

// The pure cell readers, exported for the worker's unit tests
// (test/door-cells.test.mjs); nothing in the page or the runner calls them
// directly.
export { cleanDoorMark, doorSize, parseThickness, cleanFireRating };
