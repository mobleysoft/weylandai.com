// weyland-subx-worker/src/lib/text-layer-read.js
//
// The page read from the PDF's own text, in this Worker (2026-10-09). A CAD
// sheet or a Section 08 71 00 spec page carries its schedule as positioned
// text; the shared reader (assets/client-ocr-src/schedule-text-layer.mjs, the
// same code the visitor's tab and the browser runner use) turns it into door
// rows or hardware groups in well under a second. Until today every server read
// started a Browser Rendering tab first, and on Rockford's 08 71 00 pages
// (17-23, 29) the request died after 73 s with Cloudflare's 503 page while the
// same pages read in about a second from their text in the Node tests.
// Now the text comes first and the browser (and its OCR) only for a page
// without text: a scan, or a Print-to-PDF of a bitmap.
//
// pdf.js runs here as unpdf's serverless build, pre-lowered (src/vendor/pdfjs-text.mjs) (no web worker, no DOM; the
// pdfjs-dist package itself does not start in a Worker: it needs DOMMatrix at
// load and its class static blocks are miscompiled by wrangler 3's esbuild).
// Only text content is read. The table rulings the browser path
// renders to find columns are not available, so the reader works from text
// positions alone, as the Node tests do (Rockford 110 of 110 items that way).

import { getDocument, Util, OPS } from "../vendor/pdfjs-text.mjs";
import * as TL from "../../assets/client-ocr-src/schedule-text-layer.mjs";

const MIN_WORDS = 15;

const pdfjsLib = { Util };
async function openPdf(bytes) {
  return getDocument({ data: new Uint8Array(bytes.slice(0)), disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
}

// Struck-through lines (2026-10-09). An addendum strikes a replaced item and
// prints the new one under it; the text layer holds both. The strikes are thin
// filled or stroked horizontal paths through the middle of the letters (an
// underline, marking a new line, sits at the baseline instead). They are read
// from the page's operator list with the transform stack tracked, so no
// rendering is needed; a line mostly covered by them is left out.
const PAINT = new Set([OPS.fill, OPS.eoFill, OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
export async function horizontalBars(page, viewport) {
  const ol = await page.getOperatorList();
  const bars = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const f = ol.fnArray[i], a = ol.argsArray[i];
    if (f === OPS.save) stack.push(ctm);
    else if (f === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (f === OPS.transform) ctm = Util.transform(ctm, a);
    else if (f === OPS.constructPath && a && PAINT.has(a[0]) && a[2] && a[2].length >= 4) {
      const m = Util.transform(viewport.transform, ctm);
      const [x0, y0, x1, y1] = a[2];
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      if (w > 4 && h < 2.5 && w > 4 * h) bars.push({ x0: Math.min(...xs), x1: Math.max(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2 });
    }
  }
  return bars;
}

/** The share of a line's characters that a bar crosses through the middle of the letters. */
export function struckShare(line, bars) {
  let total = 0, struck = 0;
  for (const w of line.words) {
    const n = w.str.length;
    total += n;
    const top = w.yb - 0.75 * w.h, bottom = w.yb - 0.2 * w.h;
    const cover = bars.filter((b) => b.y >= top && b.y <= bottom).reduce((c, b) => c + Math.max(0, Math.min(w.x1, b.x1) - Math.max(w.x0, b.x0)), 0);
    if (cover >= 0.6 * (w.x1 - w.x0)) struck += n;
  }
  return total ? struck / total : 0;
}

const hardwareResult = (hg, tl, t0) => {
  const groups = hg.hardware_groups.filter((g) => g.components.length || g.assigned_doors.length);
  return {
    hardware_groups: groups.map((g) => ({
      group_number: g.group_number, group_name: g.group_name, assigned_doors: g.assigned_doors, notes: g.notes || null, continued: g.continued,
      components: g.components.map((c) => ({ component_type: c.component_type, description: c.description, quantity: c.quantity == null ? 1 : c.quantity, quantity_printed: c.quantity, uom: c.uom, manufacturer: c.manufacturer, manufacturer_code: c.manufacturer_code, model_number: c.model_number, catalog_number: c.catalog_number, finish: c.finish, notes: c.notes, field_confidence: c.field_confidence, read_from: "text_layer" })),
    })),
    door_hardware_matrix: hg.door_hardware_matrix,
    detected_nomenclature: null,
    metadata: { extraction_mode: "text_layer", extraction_route: "text_layer_server", page_isolated: false, rotation_applied: tl.rotation, table_count: groups.length, text_words: tl.word_count, struck_lines_left_out: tl.struck || 0, total_time_ms: Date.now() - t0 },
  };
};
const doorResult = (ds, tl, t0) => ({
  doors: ds.doors,
  extraction_confidence: 0.98,
  metadata: {
    extraction_mode: "text_layer", extraction_route: "text_layer_server", page_isolated: false,
    row_count: ds.doors.length, rotation_applied: tl.rotation, text_words: tl.word_count,
    tables: ds.tables.map((t) => ({ title: t.title, rows: t.rows, fields: t.fields, header: t.header, rules_used: false })),
    total_time_ms: Date.now() - t0,
  },
});

/** Open a PDF once for several page reads (close it with doc.destroy()). */
export async function openTextLayerDoc(pdfBytes) {
  return openPdf(pdfBytes);
}

/**
 * Read one page from its text layer, trying scheduleType first and then the other kind.
 * -> null when the page has no text layer (the caller goes on to the browser/OCR path), else
 *    the runner's own shape: { ok: true, schedule_type, result, empty?, tried, ms, source: "text_layer" }.
 */
export async function readPageFromTextLayer(pdfBytes, pageNumber, scheduleType, opts = {}) {
  const pdf = await openPdf(pdfBytes);
  try { return await readPageFromDoc(pdf, pageNumber, scheduleType, opts); }
  finally { try { await pdf.destroy(); } catch (_) { /* gone */ } }
}

// Strikes are looked for on spec-size pages only (Letter and Legal, where an addendum strikes
// items): a drawing sheet's operator list is every line of the drawing, and reading it ran the
// Worker out of its limits on Rockford A2.2 (ARCH D).
const STRIKE_MAX_PT = 1100;

export async function readPageFromDoc(pdf, pageNumber, scheduleType, { alsoTry = null } = {}) {
  const t0 = Date.now();
  {
    if (pageNumber < 1 || pageNumber > pdf.numPages) return null;
    const page = await pdf.getPage(pageNumber);
    const tl = await TL.pageTextLines(pdfjsLib, page);
    if (!tl || tl.word_count < MIN_WORDS) return null;
    const size = { width: tl.width, height: tl.height };
    let struckLines = 0;
    if (Math.max(tl.width, tl.height) <= STRIKE_MAX_PT) {
      try {
        const viewport = page.getViewport({ scale: 1, rotation: ((page.rotate || 0) + (tl.rotation || 0)) % 360 });
        const bars = await horizontalBars(page, viewport);
        if (bars.length) {
          const kept = tl.lines.filter((L) => struckShare(L, bars) < 0.6);
          struckLines = tl.lines.length - kept.length;
          tl.lines = kept;
          tl.struck = struckLines;
        }
      } catch (_) { /* no operator list: read every line */ }
    }
    try { page.cleanup(); } catch (_) { /* fine */ }
    const types = [scheduleType].concat(alsoTry && alsoTry !== scheduleType ? [alsoTry] : []);
    let first = null;
    for (const type of types) {
      if (type === "hardware_schedule") {
        const hg = await TL.readHardwareGroupsFromLines(tl.lines, size, {});
        const r = hg ? hardwareResult(hg, tl, t0) : { hardware_groups: [], door_hardware_matrix: [], metadata: { extraction_mode: "text_layer", text_words: tl.word_count, no_table_detected: true } };
        if (!first) first = { schedule_type: type, result: r };
        if (r.hardware_groups.length) return { ok: true, schedule_type: type, result: r, tried: types, ms: Date.now() - t0, source: "text_layer" };
      } else if (type === "door_schedule") {
        const ds = await TL.readDoorScheduleFromLines(tl.lines, size, {});
        const r = ds && ds.doors.length ? doorResult(ds, tl, t0) : { doors: [], extraction_confidence: 0, metadata: { extraction_mode: "text_layer", text_words: tl.word_count, no_table_detected: true } };
        if (!first) first = { schedule_type: type, result: r };
        if (r.doors.length) return { ok: true, schedule_type: type, result: r, tried: types, ms: Date.now() - t0, source: "text_layer" };
      }
    }
    // Text, but neither kind of schedule in it: said plainly, without a browser launch.
    return { ok: true, schedule_type: first ? first.schedule_type : scheduleType, result: first ? first.result : {}, empty: true, tried: types, ms: Date.now() - t0, source: "text_layer" };
  }
}
