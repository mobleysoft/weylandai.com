import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { getDocument, Util } from "../src/vendor/pdfjs-text.mjs";
import { scanRenderPlan, renderPageToImageData, renderRegionToImageData, recognizePageWords, recognitionBudget, SCAN_MAX_CELLS, SCAN_MAX_RECOGNITION_MS } from "../assets/client-ocr-src/schedule-grid-extraction-client.mjs";

const sourceUrl = new URL("../assets/client-ocr-src/schedule-grid-extraction-client.mjs", import.meta.url);
let imports = 0;
async function clientWith(page, engine, onDestroy = () => {}) {
  globalThis.reviewPdfjs = { Util, getDocument: () => ({ promise: Promise.resolve({ getPage: async () => page, destroy: async () => onDestroy() }) }) };
  globalThis.reviewEngine = engine;
  const source = readFileSync(sourceUrl, "utf8")
    .replace(/from "\.\/schedule-text-layer.mjs[^\"]*"/, "from " + JSON.stringify(new URL("schedule-text-layer.mjs", sourceUrl).href))
    .replace("let pdfjsLibPromise = null;", "let pdfjsLibPromise = Promise.resolve(globalThis.reviewPdfjs);")
    .replace("let ocrEnginePromise = null;", "let ocrEnginePromise = Promise.resolve(globalThis.reviewEngine);");
  return import("data:text/javascript;base64," + Buffer.from(source).toString("base64") + "#" + imports++);
}
const emptyEngine = { clearImage() {}, loadImage() {}, setVariable() {}, getTextBoxes() { return []; } };
function fakePage(width, height, items = []) {
  return { getTextContent: async () => ({ items }), getViewport: ({ scale }) => ({ width: width * scale, height: height * scale }), render: () => ({ promise: Promise.resolve() }) };
}
function allocationSpy(t, limit) {
  const pixels = [];
  const previous = globalThis.document;
  globalThis.document = { createElement() {
    let width = 300, height = 150;
    const canvas = {
      get width() { return width; }, set width(value) { width = value; assert.ok(width * height <= limit, "width assignment exceeds pixel budget"); },
      get height() { return height; }, set height(value) { height = value; assert.ok(width * height <= limit, "height assignment exceeds pixel budget"); },
      getContext() {
      // Assert at canvas setup, before render or image-data copies.
      pixels.push(canvas.width * canvas.height);
      assert.ok(canvas.width * canvas.height <= limit, "canvas exceeds pixel budget");
      return { fillRect() {}, getImageData: () => ({ width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) }) };
    } };
    return canvas;
  } };
  t.after(() => { globalThis.document = previous; delete globalThis.reviewPdfjs; delete globalThis.reviewEngine; });
  return pixels;
}

test("F1: review's 14400 pt scan bounds every canvas, including the fallback detection pass", async t => {
  const pixels = allocationSpy(t, 36e6);
  const client = await clientWith(fakePage(14400, 14400), emptyEngine);
  const result = await client.extractDoorScheduleFromPdf(new ArrayBuffer(1), 1);
  assert.equal(result.doors.length, 0);
  assert.equal(pixels.length, 9, "four orientations, full scan, four fallback detections");
  assert.ok(pixels.every(n => n <= 36e6));
});

test("F1: canvas resizing cannot allocate against the default 150-pixel height", async t => {
  const pixels = allocationSpy(t, 36e6);
  await renderPageToImageData({ getPage: async () => fakePage(720000, 7.2) }, 1, 150);
  assert.equal(pixels.length, 1);
  assert.ok(pixels[0] <= 36e6);
});

test("F1: whole-page and table renders reduce below 300 DPI using the same custom budget", async t => {
  const pixels = allocationSpy(t, 1e6);
  const doc = { getPage: async () => fakePage(1440, 1440) };
  const full = await renderPageToImageData(doc, 3, 150, 0, { maxPixels: 1e6 });
  const table = await renderRegionToImageData(doc, 3, 1200, 0, { x0: 0, y0: 0, x1: 24000, y1: 24000 }, { maxPixels: 1e6 });
  assert.equal(full.dpi, 50);
  assert.equal(table.dpi, 50);
  assert.deepEqual(pixels, [1e6, 1e6]);
});

test("F1: page too large at minimum DPI is refused before any canvas allocation", async t => {
  const pixels = allocationSpy(t, 36e6);
  const client = await clientWith(fakePage(144000, 144000), emptyEngine);
  await assert.rejects(client.extractDoorScheduleFromPdf(new ArrayBuffer(1), 7), /Page 7 \(144000 x 144000 pt\).*36000000 pixel limit.*18 DPI/);
  assert.deepEqual(pixels, []);
  const plan = scanRenderPlan(14400.01, 14400.01, 150);
  assert.ok(plan.width * plan.height <= 36e6, "rounded dimensions stay bounded");
});

function fineGrid() {
  const width = 1200, height = 1200, data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (x % 12 === 0 || y % 12 === 0) {
    const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0;
  }
  return { width, height, data };
}
test("F2: invalid caller limits cannot disable the recognition budget", () => {
  for (const value of [NaN, Infinity, -Infinity, -1, "NaN", "2000", {}]) {
    let elapsed = 0;
    const budget = recognitionBudget({ maxCells: value, maxRecognitionMs: value, now: () => elapsed });
    let accepted = 0;
    while (accepted <= SCAN_MAX_CELLS && budget.take()) accepted++;
    assert.equal(accepted, SCAN_MAX_CELLS);
    assert.equal(budget.status().reason, "cell_limit");
    const timed = recognitionBudget({ maxCells: value, maxRecognitionMs: value, now: () => elapsed });
    assert.equal(timed.take(), true);
    elapsed = SCAN_MAX_RECOGNITION_MS;
    assert.equal(timed.take(), false);
    assert.equal(timed.status().reason, "time_limit");
  }
});
test("F2: NaN time limit still stops the real cell reader at the default timeout", async () => {
  let elapsed = 0, calls = 0;
  const result = await recognizePageWords(fineGrid(), { ...emptyEngine, getTextBoxes() {
    calls++; elapsed += 30001; return [];
  } }, 150, "6", { now: () => elapsed, maxRecognitionMs: NaN });
  assert.equal(calls, 2);
  assert.equal(result.partial, true);
  assert.equal(result.recognition.reason, "time_limit");
  assert.equal(result.recognition.max_ms, SCAN_MAX_RECOGNITION_MS);
});
test("F2: review's 1200 square fine grid stops at the default cell budget as partial", async () => {
  let calls = 0;
  const result = await recognizePageWords(fineGrid(), { ...emptyEngine, getTextBoxes() { calls++; return []; } }, 150);
  assert.equal(calls, SCAN_MAX_CELLS);
  assert.equal(result.partial, true);
  assert.equal(result.recognition.reason, "cell_limit");
  assert.match(result.message, /Partial machine read/);
});
test("F2: elapsed recognition time stops before another cell", async () => {
  let elapsed = 0, calls = 0;
  const result = await recognizePageWords(fineGrid(), { ...emptyEngine, getTextBoxes() { calls++; elapsed += 6; return []; } }, 150, "6", { now: () => elapsed, maxRecognitionMs: 10 });
  assert.equal(calls, 2);
  assert.equal(result.partial, true);
  assert.equal(result.recognition.reason, "time_limit");
});
test("F2: dimension rereads consume the same recognition-call budget", async () => {
  const width = 240, height = 240, data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (x % 40 === 0 || y % 40 === 0) {
    const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0;
  }
  let calls = 0, mode = "6", rereads = 0;
  const engine = { ...emptyEngine, setVariable(name, value) { if (name === "tessedit_pageseg_mode") mode = value; }, getTextBoxes() {
    const text = ["MARK", "WIDTH", "HEIGHT", "FIRE", "TYPE", "101", "bad"][calls] || "bad";
    calls++; if (mode === "7") rereads++;
    return [{ text, confidence: 91, rect: { left: 1, right: 20, top: 1, bottom: 15 } }];
  } };
  const result = await recognizePageWords({ width, height, data }, engine, 150, "6", { maxCells: 8 });
  assert.ok(rereads > 0, "probe must enter dimension rerecognition");
  assert.equal(calls, 8);
  assert.equal(result.partial, true);
  assert.equal(result.recognition.reason, "cell_limit");
});
test("F2: event-loop cancellation is observed within one 99-cell row", async () => {
  const controller = new AbortController();
  let calls = 0;
  const result = await recognizePageWords(fineGrid(), { ...emptyEngine, getTextBoxes() {
    if (++calls === 1) setTimeout(() => controller.abort(), 0);
    return [];
  } }, 150, "6", { signal: controller.signal });
  assert.ok(calls > 0 && calls <= 99, "cancellation must run between rows");
  assert.equal(result.partial, true);
  assert.equal(result.recognition.reason, "aborted");
});
test("F2: synchronous abort is checked between cells and partial reaches the PDF caller", async t => {
  const controller = new AbortController();
  let calls = 0;
  const result = await recognizePageWords(fineGrid(), { ...emptyEngine, getTextBoxes() {
    calls++; controller.abort(); return [];
  } }, 150, "6", { signal: controller.signal });
  assert.equal(calls, 1);
  assert.equal(result.partial, true);
  const pixels = allocationSpy(t, 36e6);
  const client = await clientWith(fakePage(14400, 14400), emptyEngine);
  const extraction = await client.extractDoorScheduleFromPdf(new ArrayBuffer(1), 3, null, { maxCells: 1 });
  assert.equal(extraction.partial, true);
  assert.equal(extraction.metadata.partial, true);
  assert.equal(extraction.metadata.recognition.reason, "cell_limit");
  assert.equal(pixels.length, 1, "a partial scan must not restart via fallback");
});

test("F4: 1–59 vector words without a schedule never allocate an OCR canvas in either client reader", async t => {
  const pixels = allocationSpy(t, 36e6);
  for (const count of [1, 14, 15, 30, 59]) {
    const pdf = await PDFDocument.create(), sheet = pdf.addPage([2592, 1728]);
    for (let i = 0; i < count; i++) sheet.drawText("GENERAL", { x: 100, y: 1600 - i * 20, size: 12 });
    const bytes = await pdf.save();
    const doc = await getDocument({ data: bytes, verbosity: 0 }).promise;
    try {
      const client = await clientWith(await doc.getPage(1), { ...emptyEngine, getTextBoxes() { assert.fail("vector page entered OCR"); } });
      for (const run of [client.extractDoorScheduleFromPdf, client.extractHardwareScheduleFromPdf]) {
        const result = await run(new ArrayBuffer(1), 1, null, { skipTextLayer: true });
        assert.equal(result.metadata.extraction_mode, "text_layer");
        assert.equal(result.metadata.text_words, count);
        assert.equal(result.metadata.no_table_detected, true);
        assert.match(result.metadata.message, /No .* schedule was found in the text on page 1/);
      }
    } finally { await (doc.destroy?.() ?? doc.loadingTask?.destroy()); }
  }
  assert.deepEqual(pixels, []);
});

test("door PDF resources close after no-table, partial and thrown rendering outcomes", async t => {
  allocationSpy(t, 36e6);
  for (const outcome of ["empty", "partial", "failure"]) {
    let destroyed = 0;
    const page = fakePage(612, 792);
    if (outcome === "failure") page.render = () => ({ promise: Promise.reject(new Error("render failed")) });
    const client = await clientWith(page, emptyEngine, () => destroyed++);
    const run = client.extractDoorScheduleFromPdf(new ArrayBuffer(1), 1, null, outcome === "partial" ? { maxCells: 0 } : {});
    if (outcome === "failure") await assert.rejects(run, /render failed/);
    else await run;
    assert.equal(destroyed, 1, "each reader-owned document is destroyed once");
  }
});
