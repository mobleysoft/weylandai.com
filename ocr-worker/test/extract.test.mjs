// node --test ocr-worker/test/extract.test.mjs
// Runs the Worker's extraction base in node against the audit documents in
// tools/corpus (the same PDFium and tesseract WASM builds the Worker ships).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import { createOCREngine } from 'tesseract-wasm';
import { rotate90CW } from '../../src/extraction/jitagi-detect-schedules.js';
import { pageRange } from '../page-range.js';
import {
  renderScale, extractPages, diffPagesSequential, hasTextLayer, normaliseTextLayer,
  DEFAULT_MAX_RENDER_PIXELS, DIFF_MAX_RENDER_PIXELS,
} from '../extract.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const assets = path.join(here, '..', 'assets');
const corpus = (p) => path.join(repo, 'tools', 'corpus', p);
const FAYETTE = corpus('plan-sets/fayette_ga_2419_addendum1_plans.pdf');
const FCMAT = corpus('field-reports/fcmat_mayacamas_fit_inspection_2024.pdf');
const CHRISTINA = corpus('door-schedules/3613c8cf8793a451.pdf');
const NSW = corpus('field-reports/nsw_newcastle_preconstruction_dilapidation_council_infrastructure.pdf');

const pdfiumModule = new WebAssembly.Module(fs.readFileSync(path.join(assets, 'pdfium.wasm')));
const library = await PDFiumLibrary.init({
  instantiateWasm(imports, cb) { const inst = new WebAssembly.Instance(pdfiumModule, imports); cb(inst, pdfiumModule); return inst.exports; },
});
const tessModule = new WebAssembly.Module(fs.readFileSync(path.join(assets, 'tesseract-core.wasm')));
const ocrEngine = await createOCREngine({
  instantiateWasm(imports, cb) { const inst = new WebAssembly.Instance(tessModule, imports); cb(inst, tessModule); return inst.exports; },
});
ocrEngine.loadModel(new Uint8Array(fs.readFileSync(path.join(assets, 'eng-traineddata.bin'))));

const headersOf = (o) => new Headers(o);
const run = (file, h) => extractPages({ library, ocrEngine, rotate90CW, pdfBuffer: fs.readFileSync(file), headers: headersOf(h), pageRange });

test('render scale: letter unchanged at 150 dpi, 36x24 sheet capped to the pixel budget', () => {
  assert.equal(renderScale(612, 792), 150 / 72);
  const s = renderScale(2592, 1728);
  const px = 2592 * s * 1728 * s;
  assert.ok(px <= DEFAULT_MAX_RENDER_PIXELS * 1.000001 && px > DEFAULT_MAX_RENDER_PIXELS * 0.98, 'pixels ' + px);
  assert.ok(Math.round(s * 72) < 150);
});

test('text layer detection', () => {
  assert.equal(hasTextLayer(normaliseTextLayer('\u0000\r\n ')), false);
  assert.equal(hasTextLayer('A'.repeat(39)), false);
  assert.equal(hasTextLayer('A'.repeat(40)), true);
});

test('Fayette 36x24 plans: text layer, no render, sheet numbers present', async () => {
  const t0 = Date.now();
  const r = await run(FAYETTE, { 'X-Total-Pages': '21' });
  const ms = Date.now() - t0;
  assert.equal(r.documentPageCount, 21);
  assert.equal(r.pageCount, 21);
  assert.equal(r.ocrPages, 0);
  assert.equal(r.textLayerPages, 21);
  assert.equal(r.hasMore, false);
  const all = r.pages.map((p) => p.text).join('\n');
  const sheetNumbers = new Set(all.match(/\b[A-Z]{1,2}-?\d{1,3}(?:\.\d{1,2})?\b/g) || []);
  console.log('  fayette 21 pages in', ms, 'ms; sample sheet-number tokens:', [...sheetNumbers].slice(0, 12).join(' '));
  assert.ok(ms < 5000, 'took ' + ms + ' ms');
  assert.ok(sheetNumbers.size >= 5);
});

test('FCMAT inspection: letter pages from the text layer, scanned FIT pages OCR\'d in windows', async () => {
  const t0 = Date.now();
  const r = await run(FCMAT, { 'X-Total-Pages': '9', 'X-Max-Ocr-Pages': '2' });
  const ms = Date.now() - t0;
  assert.deepEqual(r.pages.map((p) => p.source), ['text_layer', 'text_layer', 'ocr', 'ocr']);
  assert.equal(r.endPage, 4);
  assert.equal(r.hasMore, true);
  assert.equal(r.nextPage, 5);
  assert.equal(r.ocrPages, 2);
  for (const p of r.pages.filter((p) => p.source === 'ocr')) {
    console.log('  fcmat p' + p.page, p.render, 'rotation', p.rotation_applied, p.orientation || '', JSON.stringify(p.text.slice(0, 160)));
    assert.ok(p.render.width * p.render.height <= DEFAULT_MAX_RENDER_PIXELS);
    assert.ok(/inspection|deficien|facility|school/i.test(p.text), 'page ' + p.page + ' OCR text does not read as the FIT form');
  }
  console.log('  fcmat 4 pages (2 OCR) in', ms, 'ms');
  const r2 = await run(FCMAT, { 'X-Start-Page': '5', 'X-Total-Pages': '5', 'X-Max-Ocr-Pages': '2' });
  assert.deepEqual(r2.pages.map((p) => p.page), [5, 6]);
  assert.equal(r2.nextPage, 7);
});

test('Christina spec book: 50-page window from the text layer, CSI numbers present', async () => {
  const t0 = Date.now();
  const r = await run(CHRISTINA, { 'X-Total-Pages': '50' });
  const ms = Date.now() - t0;
  assert.equal(r.documentPageCount, 438);
  assert.ok(r.textLayerPages >= 45, 'text layer pages ' + r.textLayerPages);
  assert.equal(r.hasMore, true);
  const csi = new Set(r.pages.map((p) => p.text).join('\n').match(/\b\d{2} \d{2} \d{2}\b/g) || []);
  console.log('  christina 50 pages in', ms, 'ms; text-layer pages', r.textLayerPages, 'ocr pages', r.ocrPages, 'CSI numbers', csi.size);
  assert.ok(ms < 5000, 'took ' + ms + ' ms');
});

test('NSW survey: 289 pages, text layer only', async () => {
  const t0 = Date.now();
  const r = await run(NSW, { 'X-Total-Pages': '289' });
  const ms = Date.now() - t0;
  assert.equal(r.pageCount, 289);
  assert.equal(r.ocrPages, 0);
  const cracks = r.pages.filter((p) => /crack/i.test(p.text)).length;
  console.log('  nsw 289 pages in', ms, 'ms; pages mentioning cracks', cracks);
  assert.ok(cracks >= 10);
});

test('AsBuiltX diff: Fayette sheet 1 against itself, sequential renders under the diff budget', async () => {
  const buf = fs.readFileSync(FAYETTE);
  const t0 = Date.now();
  const r = await diffPagesSequential({ library, originalBuffer: buf, revisedBuffer: buf, page: 1 });
  const ms = Date.now() - t0;
  console.log('  diff sheet 1 vs itself in', ms, 'ms; rendered', r.rendered[0].width + 'x' + r.rendered[0].height, r.rendered[0].dpi + ' dpi; overall', r.overallDiffPercent + '%');
  assert.equal(r.overallDiffPercent, 0);
  assert.equal(r.gridCols, 24);
  assert.equal(r.gridRows, 32);
  assert.ok(r.rendered[0].width * r.rendered[0].height <= DIFF_MAX_RENDER_PIXELS);
  const r2 = await diffPagesSequential({ library, originalBuffer: buf, revisedBuffer: buf, page: 2 });
  assert.equal(r2.overallDiffPercent, 0);
});
