#!/usr/bin/env node
// Actual pdf.js pixels and shipped WASM/model. No private PDFs or expected OCR hints.
// PLAYWRIGHT_CORE=<existing install> node tools/accuracy/color_ink_browser.mjs [report.json]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { serveOcrAssets } from './truth/browser-ocr.mjs';
const require = createRequire(new URL('../../weyland-subx-worker/package.json', import.meta.url));
const { PDFDocument, rgb } = require('pdf-lib');
const directory = mkdtempSync(join(tmpdir(), 'weyland-color-ink-'));
let browser, server, timer;
try {
  const pdf = await PDFDocument.create(), sheet = pdf.addPage([100, 100]);
  sheet.drawRectangle({ x: 10, y: 60, width: 20, height: 20, color: rgb(0, 0, 0) });
  sheet.drawRectangle({ x: 10, y: 60, width: 20, height: 20, color: rgb(0, 0, 1) });
  sheet.drawRectangle({ x: 50, y: 60, width: 20, height: 20, color: rgb(.5, .5, .5) });
  sheet.drawRectangle({ x: 80, y: 60, width: 10, height: 20, color: rgb(1, 0, 0) });
  const source = join(directory, 'control.pdf'); writeFileSync(source, await pdf.save());
  server = await serveOcrAssets({ files: { 'control.pdf': source }, html: '<!doctype html><title>OCR render regression</title>' });
  const pw = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const { chromium } = pw.chromium ? pw : pw.default;
  browser = await chromium.launch({ args: ['--disable-gpu'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const page = await browser.newPage(); await page.goto(server.base);
  const report = await Promise.race([page.evaluate(async () => {
    const base = '/api/hardware-schedule/client-ocr-assets/';
    const grid = await import(base + 'schedule-grid-extraction-client.mjs');
    const pdfjs = await grid.loadPdfJs(), task = pdfjs.getDocument({ data: new Uint8Array(await (await fetch('/control.pdf')).arrayBuffer()) });
    const document = await task.promise;
    let engine;
    try {
      const region = { x0: 0, y0: 0, x1: 100 * 150 / 72, y1: 100 * 150 / 72 };
      const original = await grid.renderRegionToImageData(document, 1, 150, 0, region);
      const filtered = await grid.renderRegionToImageData(document, 1, 150, 0, region, { removeColoredVectorInk: true });
      const pixel = (image, x, y) => [...image.data.slice((Math.floor(y * image.dpi / 72) * image.width + Math.floor(x * image.dpi / 72)) * 4, (Math.floor(y * image.dpi / 72) * image.width + Math.floor(x * image.dpi / 72)) * 4 + 3)];
      const pixels = { originalUnderlay: pixel(original, 20, 30), retainedUnderlay: pixel(filtered, 20, 30), originalGray: pixel(original, 60, 30), retainedGray: pixel(filtered, 60, 30), removedColor: pixel(filtered, 85, 30), omitted: filtered.color_paints_omitted };
      const { createOCREngine, supportsFastBuild } = await import(base + 'tesseract-wasm-lib.mjs');
      const fast = supportsFastBuild();
      engine = await createOCREngine({ wasmBinary: await (await fetch(base + (fast ? 'tesseract-core.wasm' : 'tesseract-core-fallback.wasm'))).arrayBuffer() });
      engine.loadModel(new Uint8Array(await (await fetch(base + 'eng-traineddata.bin')).arrayBuffer()));
      const identifiers = [];
      for (const code of ['C', 'CC', 'R', 'B', 'AL2', 'A12', 'Q3', 'Q03', '03', '06 CL']) {
        const canvas = globalThis.document.createElement('canvas'); canvas.width = 240; canvas.height = 80;
        const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 240, 80); context.fillStyle = 'black'; context.font = '32px Arial'; context.fillText(code, 25, 52);
        const image = context.getImageData(0, 0, 240, 80);
        engine.clearImage(); engine.loadImage(image); engine.setVariable('tessedit_pageseg_mode', '7'); engine.setVariable('tessedit_char_whitelist', '');
        const words = engine.getTextBoxes('word');
        const first = words.map(word => word.text).join(' '), confidence = words.length ? Math.min(...words.map(word => word.confidence)) : 0;
        const result = grid.rereadMarkCell(engine, image, grid.recognitionBudget(), first, confidence, text => /^[A-Z0-9][A-Z0-9 ._\-/#]{0,15}$/.test(text));
        identifiers.push({ expected: code, first, firstConfidence: confidence, actual: result.text || first, confidence: result.text ? result.confidence : confidence });
        canvas.width = canvas.height = 0;
      }
      const hocr = engine.getHOCR();
      return { pixels, identifiers, runtime: fast ? 'WASM SIMD' : 'WASM fallback', engineVersion: hocr.match(/name=['"]ocr-system['"] content=['"]([^'"]+)/)?.[1] || null };
    } finally { engine?.destroy(); await task.destroy(); }
  }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('pixel regression timed out')), 90000); })]);
  assert.deepEqual(report.pixels.originalUnderlay, [0, 0, 255]);
  assert.deepEqual(report.pixels.retainedUnderlay, [0, 0, 0]);
  assert.deepEqual(report.pixels.originalGray, report.pixels.retainedGray);
  assert.deepEqual(report.pixels.removedColor, [255, 255, 255]);
  assert.equal(report.pixels.omitted, 2);
  for (const row of report.identifiers) assert.equal(row.actual, row.expected, JSON.stringify(row));
  const asset = new URL('../../weyland-subx-worker/assets/client-ocr/schedule-grid-extraction-client.mjs.bin', import.meta.url);
  report.gridSha256 = createHash('sha256').update(readFileSync(asset)).digest('hex'); report.pass = true;
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { clearTimeout(timer); await browser?.close(); await server?.close(); rmSync(directory, { recursive: true, force: true }); }
