// Complete original page text, including neighbouring schedules and drawings.
// Counts and representative fields checked on Poppler renders of these pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';

async function read(name, { hardwareOnly = false, type = 'door_schedule' } = {}) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/g058/${name}.json`, import.meta.url)));
  // The inventory's own block, from the render, not a pre-cleaned door table.
  const items = hardwareOnly ? f.items.filter(it => {
    const [a, b, c, d, e, g] = f.viewport;
    const x = a * it.transform[4] + c * it.transform[5] + e;
    const y = b * it.transform[4] + d * it.transform[5] + g;
    return x >= 1560 && x < 1930 && y < 950;
  }) : f.items;
  const page = {
    rotate: f.rotate,
    getTextContent: async () => ({ items }),
    getAnnotations: async () => [],
    getViewport: ({ rotation = 0 }) => {
      assert.equal(rotation, 0);
      return { width: f.width, height: f.height, transform: f.viewport };
    },
    cleanup() {},
  };
  return (await readPageFromDoc({ numPages: f.source.page, getPage: async () => page }, f.source.page, type)).result;
}

test('T2612 A-601: sparse MARK header reads 14 doors beside the hardware inventory', async () => {
  const r = await read('e75d52a7a714c978-23');
  assert.equal(r.metadata.row_count, 14);
  assert.equal(r.metadata.tables.length, 1);
  assert.equal(r.metadata.tables[0].title, 'DOOR SCHEDULE');
  assert.deepEqual(r.doors.map(d => d.door_number), [
    '101', '102', '103A', '103B', '103C', '104', '105A', '105B', '105C', '106A', '106B', '107A', '107B', '107C',
  ]);
  assert.ok(r.doors.every(d => d.width_inches === 36 && d.height_inches === 84 && d.thickness_inches === 1.75));
  assert.deepEqual(r.doors.map(d => d.hardware_group), ['1', '4', '5', '2', '5', '3', '5', '2', '5', '6', '5', '5', '2', '5']);
  const by = Object.fromEntries(r.doors.map(d => [d.door_number, d]));
  assert.deepEqual([by['101'].pair, by['101'].door_type, by['101'].frame_type, by['101'].material_code, by['101'].glazing], [true, 'CC', '4', 'ALUMINUM', '1']);
  assert.equal(by['101'].field_evidence.fields.mark.original.text, '101');
  assert.match(by['101'].field_evidence.fields.size.original.text, /^\(PAIR\)/);
  assert.deepEqual([by['102'].fire_rating, by['102'].head_detail, by['102'].jamb_detail], ['20 MIN.', '1/A-601', '2/A-601']);
  assert.deepEqual([by['103B'].door_type, by['103B'].frame_type, by['103B'].material_code], ['A', '1', 'HOL. METAL']);
  assert.equal(by['107A'].remarks, '1, 2, 3');
});

test('T2612 hardware schedule remains hardware, with no door rows in its isolated block', async () => {
  const r = await read('e75d52a7a714c978-23', { hardwareOnly: true });
  assert.deepEqual(r.doors, []);
  const hardware = await read('e75d52a7a714c978-23', { type: 'hardware_schedule' });
  assert.equal(hardware.hardware_groups.reduce((n, g) => n + g.components.length, 0), 21);
});

test('X2404 A601: nested dimensions and repeated DOOR NUMBER read eight rows once', async () => {
  const r = await read('6e7e2d2bf65c383b-81');
  assert.equal(r.metadata.row_count, 8);
  assert.equal(r.metadata.tables.length, 1);
  assert.equal(r.metadata.tables[0].title, 'DOOR AND FRAME SCHEDULE');
  assert.deepEqual(r.doors.map(d => d.door_number), ['100A', '101A', '102A', '103A', '104A', '105A', '106A', '107A']);
  assert.ok(r.doors.every(d => d.width_inches === 36 && d.height_inches === 80 && d.fire_rating === 'NONE'));
  assert.ok(r.doors.every(d => d.remarks === null && d.frame_type === d.door_type));
  assert.deepEqual(r.doors.map(d => d.thickness_inches), [1.75, 1.375, 1.375, 1.75, 1.75, 1.375, 1.375, 1.75]);
  const [entry, interior, , storage] = r.doors;
  assert.deepEqual([entry.door_type, entry.material_code, entry.frame_material, entry.door_finish, entry.hardware_group], ['FGE', 'FIBERGLASS', 'FIBERGLASS', 'PREFINISHED', 'SECURE ENTRY FUNCTION']);
  assert.deepEqual([interior.door_type, interior.material_code, interior.hardware_group, interior.head_detail], ['FPI', 'WOOD', 'PRIVACY LOCK FUNCTION', '4/A601']);
  assert.deepEqual([storage.door_type, storage.hardware_group, storage.sill_detail], ['FPE', 'SECURE STOREROOM FUNCTION', '3/A601']);
});

test('g055 W2501 A501 remains 11 doors after mixed-header recovery', async () => {
  const r = await read('6742faed77cfde33-8');
  assert.equal(r.metadata.row_count, 11);
  assert.equal(r.metadata.tables.length, 1);
  assert.deepEqual(r.doors.map(d => d.door_number), ['100A', '100B', '101', '102', '105', '106', '107', '109', '201', '202', '203']);
  assert.deepEqual([r.doors[1].width_inches, r.doors[1].height_inches, r.doors[1].hardware_group], [36, 96, '2']);
});

test('X2404 bid set M501: grille/register marks on page 97 are not doors', async () => {
  const r = await read('6e7e2d2bf65c383b-97');
  assert.deepEqual(r.doors, []);
});
