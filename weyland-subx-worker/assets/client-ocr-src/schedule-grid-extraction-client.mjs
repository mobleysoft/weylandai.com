// schedule-grid-extraction-client.mjs
//
// Runs hardware_schedule AND door_schedule grid extraction ENTIRELY in the
// customer's own browser tab - zero Cloudflare CPU spent on rendering or
// OCR, no per-page CPU ceiling, works in a field/disconnected environment
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

const ASSET_BASE = "/api/hardware-schedule/client-ocr-assets";

let pdfjsLibPromise = null;
export async function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(/* webpackIgnore: true */ `${ASSET_BASE}/pdf.mjs`).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}/pdf-worker.mjs`;
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
function detectGridLinesDoor(lum, width, bounds) {
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
  return { y0: Math.max(0, rowLines[bestStart] - 5), y1: Math.min(height, rowLines[bestEnd] + 5) };
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
async function renderPageToImageData(pdfDoc, pageNumber, dpi) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: ctx, viewport }).promise;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function ocrRowBand(engine, pageImage, colBounds, rowRightEdge, y0, y1, psm = "6") {
  const PAD = 2, ROW_UPSCALE = 3;
  const ry0 = y0 + PAD, ry1 = y1 - PAD;
  if (ry1 - ry0 < 5) return null;
  const rowImg = upscaleN(cropRowImage(pageImage, ry0, ry1, 0, rowRightEdge), ROW_UPSCALE);
  engine.clearImage();
  engine.loadImage(rowImg);
  // PSM 6 (uniform block) for hardware_schedule - rows can wrap to 2+ text
  // lines within one ruled row. PSM 7 (single line) for door_schedule -
  // confirmed live server-side as the correct mode for its one-line rows.
  engine.setVariable("tessedit_pageseg_mode", psm);
  const words = engine.getTextBoxes("word");
  const cells = new Array(colBounds.length).fill("");
  for (const w of words) {
    const cx = (w.rect.left + w.rect.right) / 2 / ROW_UPSCALE;
    for (let ci = 0; ci < colBounds.length; ci++) {
      if (cx >= colBounds[ci][0] && cx < colBounds[ci][1]) {
        cells[ci] = cells[ci] ? `${cells[ci]} ${w.text}` : w.text;
        break;
      }
    }
  }
  return cells;
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

// extractHardwareScheduleFromPdf: the real client-side entry point. Takes a
// File/Blob/ArrayBuffer of the full PDF and a 1-indexed page number, returns
// {hardware_groups, door_hardware_matrix, detected_nomenclature, metadata} -
// the exact shape the existing POST .../extract-result endpoint expects.
export async function extractHardwareScheduleFromPdf(pdfBytes, pageNumber, onProgress) {
  const t0 = performance.now();
  const progress = (msg) => { if (onProgress) onProgress(msg); };
  progress("Loading PDF renderer...");
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;

  const DETECT_DPI = 150, BASE_DPI = 400;
  const RATIO = BASE_DPI / DETECT_DPI;

  progress(`Detecting table regions on page ${pageNumber}...`);
  const detectImage = await renderPageToImageData(pdfDoc, pageNumber, DETECT_DPI);
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
    return { hardware_groups: [], door_hardware_matrix: [], detected_nomenclature: null, metadata: { extraction_mode: "client_grid_deterministic", page_isolated: false, table_count: 0, no_table_detected: true } };
  }

  progress(`Rendering page ${pageNumber} at full resolution...`);
  const pageImage = await renderPageToImageData(pdfDoc, pageNumber, BASE_DPI);

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
      headerBandTexts.push(ocrRowBand(engine, pageImage, t.colBounds, t.rowRightEdge, t.rowLines[i], t.rowLines[i + 1]) || []);
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
      const cells = ocrRowBand(engine, pageImage, t.colBounds, t.rowRightEdge, t.rowLines[i], t.rowLines[i + 1]);
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

  progress("Extraction complete.");
  return {
    hardware_groups: state.groups,
    door_hardware_matrix: state.matrix,
    detected_nomenclature: null,
    metadata: {
      extraction_mode: "client_grid_deterministic",
      extraction_route: "client_grid_deterministic",
      page_isolated: false,
      table_count: tables.length,
      total_time_ms: Math.round(performance.now() - t0),
    },
  };
}

// extractDoorScheduleFromPdf: the door_schedule sibling of
// extractHardwareScheduleFromPdf above - same real client-side pipeline
// (pdf.js render + tesseract-wasm OCR, zero server CPU), but door_schedule
// is a single large ruled table per page with one-line rows (unlike
// hardware_schedule's multiple small multi-line-row tables), so it uses the
// pitch-split column detection, PSM 7 (single-line) OCR, and the
// {doors:[...]} contract the existing POST .../extract-result route now
// also accepts (writeDoorScheduleEntries - see that route's own comment).
export async function extractDoorScheduleFromPdf(pdfBytes, pageNumber, onProgress) {
  const t0 = performance.now();
  const progress = (msg) => { if (onProgress) onProgress(msg); };
  progress("Loading PDF renderer...");
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;

  const DETECT_DPI = 150, BASE_DPI = 400;
  const RATIO = BASE_DPI / DETECT_DPI;

  progress(`Detecting the table on page ${pageNumber}...`);
  const detectImage = await renderPageToImageData(pdfDoc, pageNumber, DETECT_DPI);
  const lum = toLuminance(detectImage);
  const bounds = findTableBoundsDoor(lum, detectImage.width, detectImage.height);
  const detected = bounds ? detectGridLinesDoor(lum, detectImage.width, bounds) : { colLines: [], rowLines: [] };
  if (detected.colLines.length < 4 || detected.rowLines.length < 6) {
    return { doors: [], extraction_confidence: 0, metadata: { extraction_mode: "client_grid_deterministic", page_isolated: false, no_table_detected: true } };
  }
  const colLines = detected.colLines.map((x) => Math.round(x * RATIO));
  const rowLines = detected.rowLines.map((y) => Math.round(y * RATIO));

  progress(`Rendering page ${pageNumber} at full resolution...`);
  const pageImage = await renderPageToImageData(pdfDoc, pageNumber, BASE_DPI);
  const wideColEnd = Math.min(Math.round((detected.wideColEnd ?? detectImage.width - 1) * RATIO), pageImage.width - 1);

  const colBounds = [];
  for (let i = 0; i < colLines.length - 1; i++) colBounds.push([colLines[i], colLines[i + 1]]);
  colBounds.push([colLines[colLines.length - 1], wideColEnd]);
  eraseVerticalLines(pageImage, colLines);

  progress("Loading OCR engine...");
  const engine = await getOcrEngine(progress);

  const totalRowBands = rowLines.length - 1;
  const headerSearchWindow = Math.min(4, totalRowBands);
  progress(`OCR'ing table (${totalRowBands} rows)...`);
  const headerBandTexts = [];
  for (let i = 0; i < headerSearchWindow; i++) {
    headerBandTexts.push(ocrRowBand(engine, pageImage, colBounds, wideColEnd, rowLines[i], rowLines[i + 1], "7") || []);
  }
  let headerRowIdx = 0, headerMatches = -1;
  for (let i = 0; i < headerBandTexts.length; i++) {
    const trial = new Set();
    let matches = 0;
    for (const cellText of headerBandTexts[i]) {
      const f = matchHeaderLabel(cellText, trial, DOOR_SCHEDULE_HEADER_PATTERNS);
      if (f) { matches++; trial.add(f); }
    }
    if (matches > headerMatches) { headerMatches = matches; headerRowIdx = i; }
  }
  const usedFields = new Set();
  const fieldNames = (headerBandTexts[headerRowIdx] || []).map((c) => {
    const f = matchHeaderLabel(c, usedFields, DOOR_SCHEDULE_HEADER_PATTERNS);
    if (f) usedFields.add(f);
    return f;
  });

  const dataStartBand = headerRowIdx + 1;
  const rowsByField = [];
  for (let i = dataStartBand; i < totalRowBands; i++) {
    const cells = ocrRowBand(engine, pageImage, colBounds, wideColEnd, rowLines[i], rowLines[i + 1], "7");
    if (!cells) continue;
    const row = {};
    let hasAnyField = false;
    for (let ci = 0; ci < fieldNames.length; ci++) {
      const key = fieldNames[ci] || `col_${ci}`;
      row[key] = cells[ci] || "";
      if (fieldNames[ci] && cells[ci]) hasAnyField = true;
    }
    if (hasAnyField) rowsByField.push(row);
  }

  // Same real {mark/hardware_group/fire_rating/size/...} mapping
  // extractGridDoors already uses server-side - one real transform, not a
  // second parallel one that could silently drift.
  const doors = rowsByField.map((row) => ({
    door_number: row.mark || null,
    hardware_group: row.hardware_group || null,
    fire_rating: row.fire_rating || null,
    size: [row.width, row.height].filter(Boolean).join(" x ") || null,
    width_inches: parseArchDimension(row.width),
    height_inches: parseArchDimension(row.height),
    thickness_inches: parseArchDimension(row.thickness),
    door_type: row.door_type || null,
    material_code: row.door_material || null,
    frame_material: row.frame_material || null,
    remarks: row.notes || null,
  })).filter((d) => d.door_number);

  progress("Extraction complete.");
  return {
    doors,
    extraction_confidence: 0.85,
    metadata: {
      extraction_mode: "client_grid_deterministic",
      extraction_route: "client_grid_deterministic",
      page_isolated: false,
      row_count: doors.length,
      total_time_ms: Math.round(performance.now() - t0),
    },
  };
}
