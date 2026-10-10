// Complete page text items from the original PDFs, including the neighbouring
// finish schedules, legends and notes. Expected rows/fields checked on renders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';

async function read(name) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/g055/${name}.json`, import.meta.url)));
  const page = {
    rotate: f.rotate,
    getTextContent: async () => ({ items: f.items }),
    getAnnotations: async () => [],
    getViewport: ({ rotation = 0 }) => {
      assert.equal(rotation, 0, 'these complete sheets have dominant horizontal text');
      return { width: f.width, height: f.height, transform: f.viewport };
    },
    cleanup() {},
  };
  return (await readPageFromDoc({ numPages: f.source.page, getPage: async () => page }, f.source.page, 'door_schedule')).result;
}

test('T2421-01 A-300: multiline NO header beside a finish legend reads all 33 populated doors', async () => {
  const r = await read('66a4b9f32d9fc75b-3');
  assert.equal(r.metadata.row_count, 33);
  assert.equal(r.metadata.tables.length, 1);
  assert.deepEqual(r.doors.map(d => d.door_number), [
    '101', '101A', '102', '102A', '103', '103A', '104', '105', '106', '107', '107A', '108', '109',
    '110', '111', '112', '113', '114', '114A', '115', '116', '117', '118', '119', '121', '122',
    '122A', '123', '124', '126', '127', '128', '128A',
  ]);
  const by = Object.fromEntries(r.doors.map(d => [d.door_number, d]));
  assert.deepEqual([by['102'].width_inches, by['102'].height_inches, by['102'].thickness_inches, by['102'].hardware_group], [36, 84, 1.75, 'GROUP 1']);
  assert.equal(by['101A'].pair, true);
  assert.deepEqual([by['122'].hardware_group, by['122'].head_detail, by['122'].jamb_detail], ['GROUP 2', '6/A-600', '3/A-600']);
  assert.equal(by['122A'].hardware_group, 'GROUP 3');
  assert.equal(by['123'].hardware_group, 'GROUP 4');
  assert.equal(by['107'].width_inches, null, 'an existing door with dashes has no inferred size');
  assert.match(by['107'].remarks, /^PAINT EXISTING HM DOOR & FRAME PER FINISH SCHEDULE$/);
  assert.equal(by['101'].field_evidence.fields.size.original.text, 'EXISTING ALUM STOREFRONT DOOR SYSTEM TO REMAIN');
});

test('C2419-01 A601: rotated column labels read four doors, excluding room finishes and finish key', async () => {
  const r = await read('4af80165bc367de8-7');
  assert.equal(r.metadata.tables.length, 1);
  assert.deepEqual(r.doors.map(d => [d.door_number, d.width_inches, d.height_inches, d.door_type]), [
    ['104A', 36, 84, 'P20HM'], ['104B', 36, 84, 'P20HM'],
    ['116B', 36, 84, 'P00HM'], ['123A', 42, 84, 'P00HM'],
  ]);
  assert.equal(r.doors[0].frame_type, 'FCW00AL');
  assert.equal(r.doors[2].frame_type, 'F00HM');
  assert.equal(r.doors[0].remarks, 'SEE HM ELEVATION "A"');
  assert.ok(r.doors.every(d => d.hardware_group === null));
});
