// Complete original pdf.js page items, with neighbouring schedules/details.
// Expected values checked on pdftoppm -r 60 renders and the text layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';
import { Util } from '../src/vendor/pdfjs-text.mjs';
import { pageTextLines, classifyLines } from '../assets/client-ocr-src/schedule-text-layer.mjs';
import { doorPageCandidate } from '../../tools/accuracy/truth/page_candidates.mjs';

async function read(name, crop = null) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/g061/${name}.json`, import.meta.url)));
  const items = f.items.filter(it => {
    if (!crop) return true;
    const m = Util.transform(f.viewport, it.transform);
    return m[4] >= crop[0] && m[4] <= crop[2] && m[5] >= crop[1] && m[5] <= crop[3];
  });
  const page = {
    rotate: f.rotate, getTextContent: async () => ({ items }), getAnnotations: async () => [], cleanup() {},
    getViewport: ({ rotation = 0 }) => {
      assert.equal(rotation, f.rotate);
      return { width: f.width, height: f.height, transform: f.viewport };
    },
  };
  const r = await readPageFromDoc({ numPages: f.source.page, getPage: async () => page }, f.source.page, 'door_schedule');
  const tl = await pageTextLines({ Util }, page);
  const classification = await classifyLines(tl.lines, tl);
  const candidate = doorPageCandidate(items.map(it => it.str).join('\n'));
  return { ...r.result, classification, candidate };
}
function expectRows(r, marks, rows = marks.length) {
  assert.deepEqual(r.doors.map(d => d.door_number), marks);
  assert.equal(r.metadata.row_count, marks.length);
  assert.equal(r.metadata.tables.length, 1);
  assert.equal(r.metadata.tables[0].rows, rows);
  assert.equal(r.classification.door_schedule.rows, marks.length);
  assert.equal(r.candidate, true);
}

test('F2402 A-501: eight marks including OH, no hardware column, separate finish schedule', async () => {
  const r = await read('8900a915fe932a31-16');
  expectRows(r, ['100', '101', '102', '103', '104', '105', '106', 'OH']);
  assert.ok(r.doors.every(d => d.hardware_group === null));
  assert.deepEqual([r.doors[0].material_code, r.doors[0].width_inches, r.doors[0].height_inches], ['ALU CLAD WOOD', 36, 80]);
  assert.deepEqual([r.doors[7].door_type, r.doors[7].width_inches, r.doors[7].height_inches, r.doors[7].door_finish], ['D', 120, 96, 'MFR PAINT']);
});
test('O2604 A601: seven door/frame rows without hardware', async () => {
  const r = await read('43a1f0db3f7ff345-14');
  expectRows(r, ['201', '202', '203', '204', '205', '301', '302']);
  assert.ok(r.doors.every(d => d.hardware_group === null && d.material_code === 'WD.' && d.thickness_inches === 2));
  assert.deepEqual([r.doors[0].width_inches, r.doors[0].height_inches, r.doors[0].glazing, r.doors[0].remarks], [42, 90, 'ETR', '1,2,3']);
  assert.deepEqual([r.doors[3].door_type, r.doors[3].frame_type, r.doors[3].width_inches], ['B', '3', 36]);
});
for (const sha of ['3b0cb226a793d955', 'e8a888bdd7523b77']) test(`E2332 ${sha}: seven tiny IDENTIFICATION NUMBER rows`, async () => {
  const r = await read(`${sha}-33`);
  expectRows(r, ['200', '201', '300', '301', '302', '302A', '400']);
  assert.deepEqual(r.doors.map(d => d.hardware_group), ['03', '04', '03', '02', '04', '01', '04']);
  assert.deepEqual([r.doors[0].door_type, r.doors[0].frame_type, r.doors[0].door_finish, r.doors[0].width_inches], ['A1', 'AL-3', 'CLR ANODIZED/GL-1', 36]);
  assert.equal(r.doors[3].fire_rating, '1 HR');
  assert.equal(r.doors[1].height_inches, 80);
  assert.match(r.doors[5].remarks, /CASED OPENING, NO DOOR/);
  assert.equal(r.doors[5].width_inches, null);
});
test('R2508 A-303: two mixed rotated-header rows, floor groups and no room-finish rows', async () => {
  const r = await read('ff9c494916a7d8b5-19');
  expectRows(r, ['B103', '101']);
  assert.deepEqual(r.doors.map(d => d.section), ['BASEMENT FLOOR', 'GROUND LEVEL']);
  assert.deepEqual(r.doors.map(d => d.hardware_group), ['1', '2']);
  assert.ok(r.doors.every(d => d.width_inches === 36 && d.height_inches === 84 && d.door_type === '1' && d.frame_type === '1'));
  assert.equal(r.doors[0].head_detail, '2/A-303');
});
for (const [name, counts] of [['32b631d235082c7c-31', [4, 4]], ['400e8c6b5df592d0-45', [5, 7]]]) test(`X2319 ${name}: two type rows expand printed COUNT ${counts.join('+')}`, async () => {
  const r = await read(name);
  expectRows(r, [...Array(counts[0]).fill('A'), ...Array(counts[1]).fill('B')], 2);
  assert.equal(new Set(r.doors.map(d => d.source_row)).size, 2);
  for (const [i, mark] of ['A', 'B'].entries()) {
    const doors = r.doors.filter(d => d.door_number === mark);
    assert.deepEqual(doors.map(d => d.opening_index), Array.from({ length: counts[i] }, (_, j) => j + 1));
    assert.ok(doors.every(d => d.shared_row && d.quantity === 1 && d.source_quantity === counts[i] && d.mark_text === mark));
    assert.ok(doors.every(d => d.door_type === 'WD-1' && d.frame_type === 'WD-1' && d.door_finish === 'PNT'));
    assert.ok(doors.every(d => d.width_inches === (i ? 32 : 36) && d.height_inches === 80 && d.thickness_inches === 1.75 && d.hardware_group === null));
  }
});
test('T2332 A-301: three wrapped SYM lists emit 14 openings with shared-row fields', async () => {
  const r = await read('08222a6152c7525b-8');
  expectRows(r, ['01', '03', '04', '06', '02', '05', '07', '08', '09', '10', '11', '12', '13', '14'], 3);
  assert.equal(new Set(r.doors.map(d => d.source_row)).size, 3);
  assert.ok(r.doors.every(d => d.shared_row && d.quantity === 1 && d.source_quantity === d.marks.length));
  assert.ok(r.doors.slice(0, 4).every(d => d.hardware_group === '1' && d.width_inches === 36 && d.height_inches === 84));
  assert.ok(r.doors.slice(4, 6).every(d => d.hardware_group === '2' && d.width_inches === 288 && d.height_inches === 264 && d.material_code === 'RUBBER/ FABRIC'));
  assert.ok(r.doors.slice(6).every(d => d.hardware_group === '3' && d.door_type === 'A'));
  assert.match(r.doors[0].remarks, /REMOVE "ENTER HERE" SIGNS FROM DOORS/);
  assert.equal(r.doors[0].field_evidence.fields.mark.original.text, '01, 03, 04, 06');
});
test('R2402 A-601: two rotated rows; vector checkbox material stays explicitly unread', async () => {
  const r = await read('8c336c43fa7f9668-10');
  expectRows(r, ['101', '102']);
  assert.deepEqual(r.doors.map(d => [d.door_type, d.frame_type, d.hardware_group, d.width_inches, d.height_inches]), [['D1', 'F1', '1', 36, 84], ['D2', 'F2', null, 36, 80]]);
  assert.equal(r.doors[0].head_detail, 'A12 / A-601');
  assert.equal(r.doors[0].jamb_detail, 'A12 / A-601');
  assert.ok(r.doors.every(d => d.material_code === null && d.frame_material === null && d.unread_fields.includes('door_material')));
});
for (const [name, box] of [
  ['8900a915fe932a31-16', [1000, 1240, 1630, 1410]],
  ['ff9c494916a7d8b5-19', [90, 50, 1040, 390]],
  ['32b631d235082c7c-31', [950, 490, 2250, 750]],
  ['400e8c6b5df592d0-45', [950, 490, 2250, 1000]],
]) test(`${name}: neighbouring FINISH / ROOM FINISH block is not doors`, async () => {
  const r = await read(name, box);
  assert.deepEqual(r.doors, []);
  assert.equal(r.classification.door_schedule, null);
  assert.equal(r.candidate, false);
});
test('truth finder requires door title with mark/size evidence for hardware-free recovery', () => {
  assert.equal(doorPageCandidate('DOOR & FRAME SCHEDULE\nDOOR NUMBER\nWIDTH\nHEIGHT'), true);
  assert.equal(doorPageCandidate('DOOR SCHEDULE\nSYM.\nSIZE'), true);
  for (const text of ['ROOM FINISH SCHEDULE ROOM NUMBER HEIGHT', 'FINISH SCHEDULE MARK TYPE', 'DOOR SCHEDULE GENERAL NOTES', 'MOTOR SCHEDULE NO SIZE OH DOOR OPERATOR']) assert.equal(doorPageCandidate(text), false);
});

import { readDoorsB } from '../../tools/accuracy/truth/reader_b.mjs';
test('reader B: equal-row nested fragment cannot discard the complete header fire/hardware fields', () => {
  const f = JSON.parse(readFileSync(new URL('./fixtures/g061/berryessa-284-geometry.json', import.meta.url)));
  const r = readDoorsB(f.items, f.rules, f.size);
  assert.equal(r.tables.length, 1);
  assert.equal(r.doors.length, 9);
  assert.ok(r.doors.every(d => d.fire_rating === '120' && d.hardware_group));
  assert.deepEqual(r.doors.map(d => d.hardware_group), ['2', '1', '1', '2', '2', '2', '2', '2', '2']);
});
