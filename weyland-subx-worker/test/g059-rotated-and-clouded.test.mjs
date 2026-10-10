// Full original pdf.js page items. Counts checked on pdftoppm -r 60 renders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';
import { looksLikeMark, readMarkList } from '../assets/client-ocr-src/schedule-text-layer.mjs';

async function read(name, replaceMark = false) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/g059/${name}.json`, import.meta.url)));
  if (replaceMark) for (const it of f.items) if (it.str === 'E-01') it.str = 'A-501';
  const page = {
    rotate: f.rotate,
    getTextContent: async () => ({ items: f.items }),
    getAnnotations: async () => [],
    getViewport: ({ rotation = 0 }) => {
      assert.equal(rotation, 0);
      return { width: f.width, height: f.height, transform: f.viewport };
    },
    cleanup() {},
  };
  return (await readPageFromDoc({ numPages: f.source.page, getPage: async () => page }, f.source.page, 'door_schedule')).result;
}

const exterior = Array.from({ length: 16 }, (_, i) => `E-${String(i + 1).padStart(2, '0')}`);
// The printed interior schedule skips I-05: 13 rows, not the requested 14.
const interior = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => `I-${String(i).padStart(2, '0')}`);

test('Scruggs A-501: two mixed rotated headers read the 29 printed doors, including existing rows', async () => {
  const r = await read('72bedaaba4d51d4f-7');
  assert.equal(r.metadata.row_count, 29);
  assert.deepEqual(r.metadata.tables.map(t => [t.title, t.rows]), [
    ['SCRUGGS DOOR SCHEDULE EXTERIOR', 16], ['SCRUGGS DOOR SCHEDULE INTERIOR', 13],
  ]);
  assert.deepEqual(r.doors.map(d => d.door_number), [...exterior, ...interior]);
  const by = Object.fromEntries(r.doors.map(d => [d.door_number, d]));
  assert.ok(exterior.every(mark => by[mark].width_inches === 36 && by[mark].height_inches === 84));
  assert.deepEqual([by['E-01'].door_type, by['E-01'].frame_type, by['E-01'].hardware_group], ['P30AL', 'F00AL', 'A']);
  assert.deepEqual([by['E-14'].door_type, by['E-14'].remarks, by['I-01'].remarks], ['--', 'EXISTING', 'EXISTING']);
  assert.deepEqual([by['I-01'].width_inches, by['I-01'].height_inches], [null, null]);
  assert.deepEqual([by['I-13'].door_type, by['I-13'].width_inches, by['I-13'].height_inches, by['I-13'].frame_type], ['P66STL', 120, 96, 'STL']);
  assert.equal(by['I-13'].remarks, 'SEE DETAIL K17/A-303 FOR OPENING DETAILS');
  assert.deepEqual([by['E-16'].door_type, by['E-16'].hardware_group, by['E-16'].remarks], ['P00HM', 'F', null]);
  // The security column is distinct, not appended to hardware or remarks.
  assert.ok(r.metadata.tables.every(t => t.header.includes('SECURITY CLASS')));
  assert.equal(by['E-01'].remarks, null);
});

test('Thurston sheet 94: four clouded tables read all 22 doors with W/H/T dimensions', async () => {
  const r = await read('0da96f79112b83dc-32');
  assert.equal(r.metadata.row_count, 22);
  assert.deepEqual(r.metadata.tables.map(t => [t.title, t.rows]), [
    ['SHOWERHOUSE DOOR SCHEDULE', 8], ['CABIN A DOOR SCHEDULE', 3],
    ['CABIN B DOOR SCHEDULE', 6], ['CABIN C DOOR SCHEDULE', 5],
  ]);
  assert.deepEqual(r.doors.map(d => d.door_number), [
    'S100X', 'S102X', 'S103X', 'S200X', 'S201X', 'S202X', 'S203X', 'S204',
    'A100X', 'A101X', 'A102', 'B100', 'B100XA', 'B100XB', 'B101X', 'B102', 'B103',
    'C100X', 'C101X', 'C102', 'C102B', 'C103',
  ]);
  const by = Object.fromEntries(r.doors.map(d => [d.door_number, d]));
  assert.ok(r.doors.every(d => d.height_inches === (d.door_number.startsWith('S') ? 84 : 82)));
  assert.ok(r.doors.every(d => d.thickness_inches === (d.door_number === 'B101X' ? 1.125 : 1.75)));
  assert.deepEqual([by.S103X.width_inches, by.B100.width_inches, by.A100X.width_inches], [100, 24, 36]);
  assert.deepEqual([by.S204.door_type, by.S204.hardware_group, by.S204.frame_type], ['FL', '13', '1']);
  assert.deepEqual([by.A100X.material_code, by.A100X.frame_material, by.A100X.glazing], ['FLG', 'FG', 'GL-3T']);
  assert.deepEqual([by.C100X.head_detail, by.C100X.jamb_detail, by.C100X.sill_detail], ['1', '15', '4']);
  assert.deepEqual([by.B101X.door_type, by.B101X.fire_rating, by.B101X.remarks], ['SC', '-', '1']);
});

test('Averill A101 page 118: six real door rows, excluding the floor plans and repeated marks', async () => {
  const r = await read('5ca1073ee12bc860-118');
  assert.equal(r.metadata.row_count, 6);
  assert.deepEqual(r.metadata.tables.map(t => [t.title, t.rows]), [['DOOR SCHEDULE1', 6]]);
  assert.deepEqual(r.doors.map(d => d.door_number), ['001A', '001B', '206', '207', '208', '209']);
  assert.ok(r.doors.every(d => d.width_inches === 36 && d.height_inches === 84 && d.thickness_inches === 1.75));
  assert.deepEqual(r.doors.map(d => d.hardware_group), ['#02', '#01', '#03', '#03', '#03', '#03']);
  assert.deepEqual(r.doors.map(d => d.frame_type), ['2', '2', '1', '1', '1', '1']);
  const [entry, , room, , , last] = r.doors;
  assert.deepEqual([entry.door_type, entry.material_code, entry.head_detail, entry.jamb_detail], ['FG', 'ALUM - FF', '4/A301', '8/A301, 9/A301']);
  assert.equal(entry.remarks, null);
  assert.deepEqual([room.material_code, room.frame_material, room.fire_rating], ['WD - ST', 'HM - PT', '20 MIN.']);
  assert.equal(last.remarks, '45 MIN SIDELIGHT ASSEMBLY; OH-45 OR W-60 RATED GLAZING');
});

test('letter-dash marks work in shared row/list validation, while sheet and detail references do not', async () => {
  for (const mark of ['E-01', 'I-07', 'S204', 'B100XA', '001A', '1J.1']) assert.equal(looksLikeMark(mark), true, mark);
  for (const ref of ['A-501', 'A-303', 'K17/A-303', '4/A301']) assert.equal(looksLikeMark(ref), false, ref);
  assert.deepEqual(readMarkList('E-01 TO E-16'), { marks: ['E-01', 'E-16'], ranges: [{ from: 'E-01', to: 'E-16' }] });
  assert.equal(readMarkList('I-07 A-501'), null);
  const r = await read('72bedaaba4d51d4f-7', true);
  assert.deepEqual(r.doors.map(d => d.door_number), [...exterior.slice(1), ...interior]);
});
