// Only synthetic content and our own Building. No harvested pages or text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument, PDFName, drawObject } from 'pdf-lib';
import * as pdfjsLib from '../src/vendor/pdfjs-text.mjs';
import { findSchedulePages, extractHardwareScheduleFromPdf } from '../assets/client-ocr-src/schedule-grid-extraction-client.mjs';
import { selectBidSetPages, makePageMap, cutBidSet } from '../assets/client-ocr-src/bidset-cut.mjs';
import { UPLOAD_LIMIT, pageSource, pageLabel, sourcePdf, sourceNotes, validateSourcePdf } from '../assets/client-ocr-src/source-pages.mjs';
import { titleBlocks, readPlan } from '../../weyland-shared/plan-read.js';
import { pageTextItems, readPageFromDoc } from '../src/lib/text-layer-read.js';
import { generateDoorSchedulePages } from '../src/lib/submittal-assembler.js';
import { doorListCsv } from '../assets/client-ocr-src/schedule-workspace.mjs';
import { NativeRouter } from '../src/lib/router.js';
import { registerHardwareScheduleExtractRoutes } from '../src/routes/hardware-schedule-extract.js';
import { registerHardwareSchedulePageExtractRoutes } from '../src/routes/hardware-schedule-page-extract.js';
import { createExtractionSession } from '../src/lib/hardware-extraction-pipeline.js';
import { detectFileType } from '../src/lib/edge-telemetry.js';
import { modelFromSubx, attachPlan } from '../../weyland-sightx-worker/src/lib/schedule-model.js';

const writer = await import('data:text/javascript;base64,' + readFileSync(new URL('../assets/client-ocr/pdf-lib.mjs.bin', import.meta.url)).toString('base64'));
const sheet = (page, number, title) => ({ page, width: 2400, height: 1600, items: [
  { str: number, x: 2200, y: 1500, h: 24, w: 100 },
  { str: title, x: 2120, y: 1450, h: 16, w: 200 },
] });
const found = { pages: 148, complete: true, door_schedule_pages: [120, 120], hardware_pages: [120, 144],
  sheets: titleBlocks([sheet(120, 'A601', 'DOOR SCHEDULE'), sheet(144, 'A602', 'HARDWARE'), sheet(6, 'A101', 'FLOOR PLAN'), sheet(7, 'A102', 'ROOF PLAN'), sheet(9, 'A103', 'SECOND FLOOR PLAN')]) };
const readingPlan = [{ page: 120, type: 'door_schedule' }, { page: 144, type: 'hardware_schedule' }];

test('union of finder schedules and shared-reader plans, deduplicated in original order', () => {
  const s = selectBidSetPages(found, readingPlan);
  assert.deepEqual(s.schedules, [120, 144]);
  assert.deepEqual(s.plans.map(p => p.page), [6, 9]);
  const map = makePageMap([144, 120, 9, 6], s, found, 92000000);
  assert.deepEqual(map.pages, [
    { pdf_page: 1, original_page: 6, sheet: 'A101' }, { pdf_page: 2, original_page: 9, sheet: 'A103' },
    { pdf_page: 3, original_page: 120, sheet: 'A601' }, { pdf_page: 4, original_page: 144, sheet: 'A602' },
  ]);
  const session = { document_outline: JSON.stringify({ bookmarks: [], source_pdf: map }) };
  assert.deepEqual(sourcePdf(session), map);
  assert.deepEqual(pageSource(session, 3), { page: 120, sheet: 'A601', pdf_page: 3 });
  assert.equal(pageLabel(session, 4), '144 (A602)');
  assert.equal(sourceNotes(session, 'See page 3 of specifications; Duplicate mark 101 on page 3; verify each occurrence'),
    'See page 3 of specifications; Duplicate mark 101 on page 120 (A601); verify each occurrence');
  assert.equal(pageLabel({ document_outline: '[]' }, 4), '4');
  assert.deepEqual(validateSourcePdf(map, 4), map);
  for (const bad of [{ ...map, pages: map.pages.slice(1) }, { ...map, original_pages: 2 },
    { ...map, pages: map.pages.map(p => ({ ...p, original_page: 6 })) }]) {
    assert.throws(() => validateSourcePdf(bad, 4), /map/);
  }
  assert.throws(() => selectBidSetPages({ ...found, complete: false }, readingPlan), /Nothing was uploaded/);
  assert.throws(() => selectBidSetPages({ ...found, door_schedule_pages: [], hardware_pages: [] }, []), /No schedule pages/);
});

function noisePage(doc, width = 2048, height = 2048) {
  const p = doc.addPage([612, 792]);
  const ref = doc.context.register(doc.context.stream(randomBytes(width * height * 3), {
    Type: 'XObject', Subtype: 'Image', Width: width, Height: height, ColorSpace: 'DeviceRGB', BitsPerComponent: 8,
  }));
  const name = PDFName.of('GeneratedNoise');
  p.node.setXObject(name, ref);
  p.pushOperators(drawObject(name));
}
const open = bytes => pdfjsLib.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise;

test('over-30-MB generated bid set: actual finder and vendored writer preserve every kept page and its text', async t => {
  const doc = await PDFDocument.create();
  const building = await PDFDocument.load(readFileSync(new URL('../../tools/bidset/out/weylandai-building-bidset.pdf', import.meta.url)));
  // Filler before and after the Building makes cut-page numbers differ from sources.
  for (let i = 0; i < 3; i++) noisePage(doc);
  for (const p of await doc.copyPages(building, building.getPageIndices())) doc.addPage(p);
  while (doc.getPageCount() < 148) doc.addPage();
  const bytes = await doc.save();
  assert.ok(bytes.length > UPLOAD_LIMIT);
  const f = await findSchedulePages(bytes, null, { pdfjsLib });
  assert.equal(f.complete, true);
  assert.ok(f.door_schedule_pages.length > 0);
  assert.ok(f.hardware_pages.length > 0);
  assert.ok(f.sheets.some(s => s.plan));
  let closed = 0;
  const ownedReader = { ...pdfjsLib, getDocument(options) {
    const task = pdfjsLib.getDocument(options);
    return { promise: task.promise, async destroy() { closed++; await task.destroy?.(); } };
  } };
  // Exercise a guest's actual hardware text read against the >30 MB original,
  // not just the cut or the upload branch mocks.
  const hardware = await extractHardwareScheduleFromPdf(bytes, f.hardware_pages[0], null, { pdfjsLib: ownedReader });
  assert.ok(hardware.hardware_groups.length > 0);
  assert.equal(closed, 1, 'hardware PDF loading task is released before the next guest page');
  const plan = [...f.door_schedule_pages.map(page => ({ page, type: 'door_schedule' })), ...f.hardware_pages.map(page => ({ page, type: 'hardware_schedule' }))];
  const result = await cutBidSet(bytes, f, plan, { pdfLib: writer });
  assert.ok(result.bytes.length <= UPLOAD_LIMIT);
  assert.deepEqual(result.source_pdf.omitted_plans, []);
  const expected = [...new Set([...plan.map(p => p.page), ...f.sheets.filter(s => s.plan).map(s => s.page)])].sort((a, b) => a - b);
  assert.deepEqual(result.source_pdf.pages.map(p => p.original_page), expected);
  const original = await open(bytes), cut = await open(result.bytes);
  try {
    assert.equal(cut.numPages, expected.length);
    const planPages = [];
    for (const entry of result.source_pdf.pages) {
      const a = await (await original.getPage(entry.original_page)).getTextContent();
      const b = await (await cut.getPage(entry.pdf_page)).getTextContent();
      assert.deepEqual(b.items.map(i => [i.str, i.transform, i.width, i.height]), a.items.map(i => [i.str, i.transform, i.width, i.height]));
      planPages.push({ ...await pageTextItems(cut, entry.pdf_page), page: entry.original_page });
    }
    assert.deepEqual(readPlan(planPages).plan_sheets.map(s => s.page), f.sheets.filter(s => s.plan).map(s => s.page));
    for (let i = 0; i < plan.length; i++) assert.equal(result.source_pdf.pages[result.readingPlan[i].page - 1].original_page, plan[i].page);
    await savedPlanJourney(result, cut);
    t.diagnostic(JSON.stringify({ original_bytes: bytes.length, cut_bytes: result.bytes.length, original_pages: f.pages, kept: result.source_pdf.pages }));
  } finally { await original.destroy?.(); await cut.destroy?.(); }
});

async function savedPlanJourney(result, cutDoc) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, submittal_id TEXT, project_name TEXT, filename TEXT,
    file_buffer_key TEXT, total_pages INTEGER, status TEXT, created_at TEXT, source_type TEXT, document_type TEXT,
    tenant_id TEXT, industry_id TEXT, document_outline TEXT, detected_schedule_pages TEXT);
    CREATE TABLE tenants (id TEXT, active INTEGER, industry_id TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, notes TEXT, page_number INTEGER);`);
  const objects = new Map(), writes = [];
  const env = {
    DB: { prepare(sql) { let args; return { bind(...a) { args = a; return this; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return db.prepare(sql).run(...args); } }; } },
    CACHE: { async get(key, type) { const v = objects.get(key); return type === 'json' && typeof v === 'string' ? JSON.parse(v) : v || null; },
      async put(key, value) { objects.set(key, value); writes.push(key); } },
    UPLOADS: { async put(key, value) { objects.set(key, value); writes.push(key); } },
  };
  const router = new NativeRouter();
  const authenticate = async () => ({ user: { userId: 'firm', tenantId: 'test-tenant', tenant_id: 'test-tenant' } });
  registerHardwareScheduleExtractRoutes(router, { authenticate, requireActiveSubscription: async () => null,
    detectFileType, extractPdfBookmarks2: async () => ({ numPages: result.source_pdf.pages.length, bookmarks: [] }),
    detectSchedulePages: () => null, createExtractionSession, logTelemetryEvent: async () => {} });
  registerHardwareSchedulePageExtractRoutes(router, { authenticate });
  const upload = async (map, total = result.source_pdf.pages.length, bytes = result.bytes) => {
    const form = new FormData(); form.set('file', new File([bytes], 'original-bid-set.pdf', { type: 'application/pdf' }));
    form.set('totalPages', String(total)); form.set('document_type', 'door_schedule');
    if (map) form.set('source_pdf', JSON.stringify(map));
    return router.handle(new Request('https://local.test/api/hardware-schedule/start', { method: 'POST', body: form }), env, {});
  };
  try {
    // Invalid maps are rejected before any file or session write, including a
    // structurally valid map whose length disagrees with the physical PDF.
    const short = { ...result.source_pdf, pages: result.source_pdf.pages.slice(0, -1) };
    assert.equal((await upload(short)).status, 400);
    assert.equal((await upload(short, short.pages.length)).status, 400);
    assert.equal((await upload(null, 1, new Uint8Array(UPLOAD_LIMIT + 1))).status, 413);
    assert.equal(writes.length, 0);
    const response = await upload(result.source_pdf);
    assert.equal(response.status, 201);
    const started = await response.json();
    const session = db.prepare('SELECT * FROM hardware_extraction_sessions').get();
    assert.equal(session.filename, 'original-bid-set.pdf');
    assert.deepEqual(sourcePdf(session), result.source_pdf);
    const doors = [];
    for (const p of result.readingPlan.filter(p => p.type === 'door_schedule')) {
      const read = await readPageFromDoc(cutDoc, p.page, p.type);
      for (const d of read.result.doors) {
        db.prepare('INSERT INTO door_schedule_entries VALUES (?,?,?,?)').run(started.sessionId, d.door_number, null, p.page);
        doors.push({ mark: d.door_number, source: pageSource(session, p.page) });
      }
    }
    assert.ok(doors.length > 0);
    const res = await router.handle(new Request('https://local.test/api/hardware-schedule/session/' + started.sessionId + '/plan'), env, {});
    assert.equal(res.status, 200);
    const plan = await res.json();
    assert.equal(plan.found, true);
    assert.ok(plan.tags.length > 0);
    assert.deepEqual(plan.plan_sheets.map(p => p.page), [5]);
    assert.ok(plan.tags.every(t => t.page === 5 && t.door_pages.every(p => p === 6)));
    const model = attachPlan(modelFromSubx({ session, doors, hardware_sets: [], components: [] }), plan);
    assert.ok(model.doors.some(d => d.plan?.page === 5 && d.source_page === 6 && d.source_sheet === 'A-601'), 'SightX matches original schedule sources to original plan-page tags');
  } finally { db.close(); }
}

test('oversized scan plans are dropped in confidence order; schedules are never dropped', async () => {
  const doc = await PDFDocument.create();
  doc.addPage().drawText('Synthetic schedule');
  noisePage(doc); noisePage(doc); noisePage(doc);
  const bytes = await doc.save();
  const f = { pages: 4, complete: true, door_schedule_pages: [1], hardware_pages: [], sheets: [
    { page: 1, sheet: 'A601' }, { page: 2, sheet: 'A101', plan: true, confidence: .3 },
    { page: 3, sheet: 'A102', plan: true, confidence: .9 }, { page: 4, sheet: 'A103', plan: true, confidence: .8 },
  ] };
  const result = await cutBidSet(bytes, f, [{ page: 1, type: 'door_schedule' }], { pdfLib: writer });
  assert.ok(result.bytes.length <= UPLOAD_LIMIT);
  assert.deepEqual(result.source_pdf.pages.map(p => p.original_page), [1, 3, 4]);
  assert.deepEqual(result.source_pdf.omitted_plans, [{ original_page: 2, sheet: 'A101' }]);
  await assert.rejects(cutBidSet(bytes, { ...f, door_schedule_pages: [1, 2, 3, 4] }, [], { pdfLib: writer }), /schedule pages alone are over 30 MB/);
});

test('packet and CSV cite original pages, sheets and rows', async () => {
  const source_pdf = makePageMap([120], selectBidSetPages(found, readingPlan), found, 92000000);
  const row = { mark: '101', page_number: 1, source: { page: 120, sheet: 'A601', table_row: 7 }, field_confidence_json: JSON.stringify({ source: { page: 1, table_row: 7 } }) };
  const packet = await generateDoorSchedulePages([row], { session: { source_pdf } });
  const pdf = await open(packet.bytes || packet);
  try {
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map(i => i.str).join(' ');
    assert.match(text, /p\.120/); assert.match(text, /A601/); assert.match(text, /row 7/);
  } finally { await pdf.destroy?.(); }
  assert.match(doorListCsv([row]), /120,7,A601/);
});
