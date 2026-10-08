// ocr-worker/extract.js
//
// Shared page-extraction base for weyland-ocr-worker (2026-10-08). Pure
// functions over an injected PDFium library and tesseract engine, so the same
// code runs inside the Worker (index.js) and in node (test/extract.test.mjs)
// against the audit documents in tools/corpus.
//
// Why it exists. The 7 October first-time-user audits sent real files through
// /extract-text and /diff-pages and every one ended in HTTP 503, error 1102:
//   - a 36x24 drawing sheet rendered at 150 dpi is 5400x3600 px, 77.8 MB as
//     BGRA; bgraToRgba() then copied it (155 MB) before tesseract made its own
//     copy: "Worker exceeded memory limit" (DrawX, AsBuiltX);
//   - every page was rendered and OCR'd even when the PDF carried its own text
//     layer; 50 pages of a spec book took 38 s of CPU and died (SpecX), as did
//     a 9-page inspection report and a 289-page survey (InspecX, SurvX);
//   - renderAndExtractText turned a page whenever getOrientation() reported a
//     rotation with confidence over 0.5, which flipped two upright letter
//     pages ("SONIMVAUC AO LSIT" for "LIST OF DRAWINGS"; DrawX found 0 of 34
//     sheet numbers and invented 3).
// Measured against the live worker at 06:52 EDT 2026-10-08, before this
// module: Fayette plans page 1, 503/1102 in 3.3 s; the same sheet against
// itself on /diff-pages, 503/1102 in 5.9 s; FCMAT inspection, 9 pages,
// 503/1102 after 37.6 s; Christina spec book, 50 pages, 503/1102 after 38.6 s;
// NSW condition survey, 50 pages, 503/1102 after 56.4 s.
//
// What changes:
//   1. Text layer first. A page whose own text layer has at least
//      TEXT_LAYER_MIN_CHARS non-blank characters is returned from PDFium's
//      FPDFText (no render, no OCR). Only pages without one are OCR'd.
//   2. Pixel budget. A render never exceeds maxPixels (default 5 MP, 20 MB
//      BGRA): letter pages at 150 dpi (2.1 MP) render exactly as before; a
//      36x24 sheet is scaled down to about 76 dpi instead of crashing.
//   3. BGRA to RGBA in place. No second page-sized buffer.
//   4. Orientation guard. A suggested turn is committed only when the OCR word
//      confidence of a middle band is clearly better turned (the same check
//      renderAndExtractTableRegion got on 2026-09-17, commit 768e928).
//   5. Page windows. At most maxOcrPages pages are OCR'd per request
//      (default 4, about 3 to 6 CPU-seconds each on a letter scan); the reply
//      says where it stopped (endPage, hasMore, nextPage) so the caller runs
//      the rest as further requests, on its own D1 job lease.
//   6. Sequential diff. /diff-pages renders the original, reduces it to a
//      small thumbnail, frees it, then renders the revision; the two pages
//      are never in memory together and are rendered under a 2 MP budget.

export const DEFAULT_DPI = 150;
export const DEFAULT_MAX_RENDER_PIXELS = 5000000;
export const MAX_RENDER_PIXELS_CEILING = 8000000;
export const MIN_RENDER_PIXELS = 250000;
export const DIFF_MAX_RENDER_PIXELS = 2000000;
export const TEXT_LAYER_MIN_CHARS = 40;
export const DEFAULT_MAX_OCR_PAGES = 4;
export const MAX_OCR_PAGES_CEILING = 8;
export const DIFF_GRID_COLS = 24;
export const DIFF_GRID_ROWS = 32;
export const DIFF_SUBSAMPLES = 8;

/** Render scale (pixels per point) for a page of the given size in points. */
export function renderScale(widthPt, heightPt, { dpi = DEFAULT_DPI, maxPixels = DEFAULT_MAX_RENDER_PIXELS } = {}) {
  const base = dpi / 72;
  const w = Math.max(1, Number(widthPt) || 1);
  const h = Math.max(1, Number(heightPt) || 1);
  const pixels = w * base * h * base;
  if (pixels <= maxPixels) return base;
  return base * Math.sqrt(maxPixels / pixels);
}

/** Swap B and R in place: same 4-bytes-per-pixel layout, no new buffer. */
export function bgraToRgbaInPlace(bgra) {
  for (let i = 0; i < bgra.length; i += 4) {
    const b = bgra[i];
    bgra[i] = bgra[i + 2];
    bgra[i + 2] = b;
  }
  return bgra;
}

/** Horizontal band [topPct, botPct] of an image's height, full width. */
export function cropBand(img, topPct, botPct) {
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

/** Mean per-word OCR confidence (0 to 1) of an image, pageseg mode 6. */
export function meanWordConfidence(ocrEngine, image) {
  ocrEngine.clearImage();
  ocrEngine.loadImage(image);
  ocrEngine.setVariable('tessedit_pageseg_mode', '6');
  const words = ocrEngine.getTextBoxes('word');
  if (!words.length) return 0;
  return words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
}

function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Render one PDFium page to RGBA under a pixel budget. */
export async function renderPageRgba(page, { dpi = DEFAULT_DPI, maxPixels = DEFAULT_MAX_RENDER_PIXELS } = {}) {
  const size = page.getOriginalSize();
  const scale = renderScale(size.originalWidth, size.originalHeight, { dpi, maxPixels });
  const rendered = await page.render({ scale, colorSpace: 'BGRA' });
  return {
    data: bgraToRgbaInPlace(rendered.data),
    width: rendered.width,
    height: rendered.height,
    dpi: Math.round(scale * 72),
  };
}

/** PDFium text with NULs removed, CRLF folded and trailing blanks trimmed. */
export function normaliseTextLayer(raw) {
  return String(raw || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+\n/g, '\n')
    .trim();
}

export function hasTextLayer(text, minChars = TEXT_LAYER_MIN_CHARS) {
  return text.replace(/\s+/g, '').length >= minChars;
}

/**
 * Loads the page into the engine in the orientation that OCRs best. A turn
 * suggested by getOrientation() is applied only when the middle band of the
 * turned page reads with clearly higher word confidence than the upright one.
 * The upright page is already loaded in the engine when this returns.
 */
export function orientedForOcr(ocrEngine, pageImage, rotate90CW) {
  ocrEngine.clearImage();
  ocrEngine.loadImage(pageImage);
  const orientation = ocrEngine.getOrientation() || { rotation: 0, confidence: 0 };
  const suggested = Number(orientation.rotation) || 0;
  if (suggested === 0 || !(orientation.confidence > 0.5)) {
    return { image: pageImage, rotation: 0, checked: false, suggested, confidence: orientation.confidence };
  }
  const turns = ((Math.round(suggested / 90) % 4) + 4) % 4;
  const upright = meanWordConfidence(ocrEngine, cropBand(pageImage, 0.3, 0.7));
  // Candidates: the suggested turn and, for a quarter turn, its opposite.
  const candidates = turns === 2 ? [2] : [turns, (4 - turns) % 4];
  let best = { turns: 0, confidence: upright, image: pageImage };
  for (const t of candidates) {
    if (t === 0) continue;
    let rotated = pageImage;
    for (let k = 0; k < t; k++) rotated = rotate90CW(rotated);
    const conf = meanWordConfidence(ocrEngine, cropBand(rotated, 0.3, 0.7));
    if (conf > best.confidence + 0.1) best = { turns: t, confidence: conf, image: rotated };
  }
  ocrEngine.clearImage();
  ocrEngine.loadImage(best.image);
  return {
    image: best.image,
    rotation: best.turns * 90,
    checked: true,
    suggested,
    confidence: orientation.confidence,
    uprightWordConfidence: Math.round(upright * 1000) / 1000,
    bestWordConfidence: Math.round(best.confidence * 1000) / 1000,
  };
}

/**
 * Text of a window of pages: text layer where present, OCR otherwise, at most
 * maxOcrPages OCR'd pages per call. The reply tells the caller where to resume.
 *
 * Headers read: X-Start-Page, X-Total-Pages, X-Max-Document-Pages (pageRange),
 * X-Text-Layer ("off" forces OCR), X-Max-Ocr-Pages, X-Max-Render-Pixels.
 */
export async function extractPages({ library, ocrEngine, rotate90CW, pdfBuffer, headers, pageRange }) {
  const doc = await library.loadDocument(new Uint8Array(pdfBuffer));
  const pages = [];
  let range;
  let lastProcessed;
  let ocrPages = 0;
  let textLayerPages = 0;
  try {
    range = pageRange(headers, doc.getPageCount());
    const useTextLayer = String(headers.get('X-Text-Layer') || 'on').toLowerCase() !== 'off';
    const maxOcrPages = clampInt(headers.get('X-Max-Ocr-Pages'), DEFAULT_MAX_OCR_PAGES, 1, MAX_OCR_PAGES_CEILING);
    const maxPixels = clampInt(headers.get('X-Max-Render-Pixels'), DEFAULT_MAX_RENDER_PIXELS, MIN_RENDER_PIXELS, MAX_RENDER_PIXELS_CEILING);
    lastProcessed = range.start - 1;
    for (let i = range.start - 1; i < range.end; i++) {
      const page = doc.getPage(i);
      if (useTextLayer) {
        const text = normaliseTextLayer(page.getText());
        if (hasTextLayer(text)) {
          pages.push({ page: i + 1, text, source: 'text_layer', rotation_applied: 0 });
          textLayerPages++;
          lastProcessed = i + 1;
          continue;
        }
      }
      if (ocrPages >= maxOcrPages) break;
      ocrPages++;
      const image = await renderPageRgba(page, { maxPixels });
      const oriented = orientedForOcr(ocrEngine, image, rotate90CW);
      ocrEngine.setVariable('tessedit_pageseg_mode', '3');
      const text = ocrEngine.getText();
      ocrEngine.clearImage();
      const entry = {
        page: i + 1,
        text: (text || '').trim(),
        source: 'ocr',
        rotation_applied: oriented.rotation,
        render: { width: image.width, height: image.height, dpi: image.dpi },
      };
      if (oriented.checked) {
        entry.orientation = {
          suggested: oriented.suggested,
          confidence: oriented.confidence,
          upright_word_confidence: oriented.uprightWordConfidence,
          best_word_confidence: oriented.bestWordConfidence,
        };
      }
      pages.push(entry);
      lastProcessed = i + 1;
    }
  } finally {
    doc.destroy();
  }
  const hasMore = lastProcessed < range.documentPages;
  return {
    pages,
    pageCount: pages.length,
    documentPageCount: range.documentPages,
    startPage: range.start,
    endPage: lastProcessed,
    requestedEndPage: range.end,
    hasMore,
    nextPage: hasMore ? lastProcessed + 1 : null,
    ocrPages,
    textLayerPages,
  };
}

/** Box-averaged grey thumbnail (Float32Array cols*rows, 0 to 255). */
export function thumbnailOf(img, cols, rows) {
  const out = new Float32Array(cols * rows);
  const counts = new Uint32Array(cols * rows);
  const { width, height, data } = img;
  for (let y = 0; y < height; y++) {
    const ty = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x++) {
      const tx = Math.min(cols - 1, Math.floor((x * cols) / width));
      const i = (y * width + x) * 4;
      const k = ty * cols + tx;
      out[k] += (data[i] + data[i + 1] + data[i + 2]) / 3;
      counts[k]++;
    }
  }
  for (let k = 0; k < out.length; k++) if (counts[k]) out[k] /= counts[k];
  return { data: out, cols, rows };
}

/** Grid-cell diff of two equal-size thumbnails (fractions 0 to 1 per cell). */
export function diffThumbnails(a, b, gridCols = DIFF_GRID_COLS, gridRows = DIFF_GRID_ROWS) {
  const sx = a.cols / gridCols;
  const sy = a.rows / gridRows;
  const cellDiffs = [];
  let totalDiff = 0;
  for (let gy = 0; gy < gridRows; gy++) {
    const row = [];
    for (let gx = 0; gx < gridCols; gx++) {
      let sum = 0;
      let count = 0;
      for (let y = Math.floor(gy * sy); y < Math.floor((gy + 1) * sy); y++) {
        for (let x = Math.floor(gx * sx); x < Math.floor((gx + 1) * sx); x++) {
          const k = y * a.cols + x;
          sum += Math.abs(a.data[k] - b.data[k]);
          count++;
        }
      }
      const avg = count ? sum / count / 255 : 0;
      row.push(Math.round(avg * 1000) / 1000);
      totalDiff += avg;
    }
    cellDiffs.push(row);
  }
  return { gridCols, gridRows, cellDiffs, overallDiffPercent: Math.round((totalDiff / (gridCols * gridRows)) * 1000) / 10 };
}

/**
 * AsBuiltX's page diff with the two renders done one after the other. Each
 * page is rendered under the diff pixel budget, reduced to a
 * (DIFF_GRID_COLS x DIFF_SUBSAMPLES) by (DIFF_GRID_ROWS x DIFF_SUBSAMPLES)
 * thumbnail and released before the next render.
 */
export async function diffPagesSequential({ library, originalBuffer, revisedBuffer, page = 1, maxPixels = DIFF_MAX_RENDER_PIXELS }) {
  const cols = DIFF_GRID_COLS * DIFF_SUBSAMPLES;
  const rows = DIFF_GRID_ROWS * DIFF_SUBSAMPLES;
  const thumbs = [];
  const rendered = [];
  for (const buffer of [originalBuffer, revisedBuffer]) {
    const doc = await library.loadDocument(new Uint8Array(buffer));
    try {
      const index = Math.max(0, Math.min(page - 1, doc.getPageCount() - 1));
      const image = await renderPageRgba(doc.getPage(index), { maxPixels });
      rendered.push({ page: index + 1, width: image.width, height: image.height, dpi: image.dpi, documentPageCount: doc.getPageCount() });
      thumbs.push(thumbnailOf(image, cols, rows));
    } finally {
      doc.destroy();
    }
  }
  const diff = diffThumbnails(thumbs[0], thumbs[1]);
  return {
    width: Math.min(rendered[0].width, rendered[1].width),
    height: Math.min(rendered[0].height, rendered[1].height),
    ...diff,
    rendered,
    method: 'sequential renders under a ' + maxPixels + '-pixel budget, box-averaged ' + cols + 'x' + rows + ' thumbnails, per-cell mean absolute grey difference',
  };
}
