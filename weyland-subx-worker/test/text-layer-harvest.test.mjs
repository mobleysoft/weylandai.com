// G004: regression text captured from the ten largest one-sided-row PDFs.
// Assertions are transcribed from the page, independent of reader B.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clusterLines, readHardwareGroupsFromLines, readDoorScheduleFromLines } from '../assets/client-ocr-src/schedule-text-layer.mjs';

function fixture(name) {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/text-layer-harvest/${name}.json`, import.meta.url)));
  const words = f.words.map((v) => Object.fromEntries(f.word_fields.map((k, i) => [k, v[i]])));
  return { ...f, lines: clusterLines(words) };
}
async function hardware(name) {
  const f = fixture(name);
  return (await readHardwareGroupsFromLines(f.lines, f)).hardware_groups;
}
const fields = (c) => [c.quantity, c.description, c.catalog_number, c.finish, c.manufacturer_code];

test('Set #1 with a long name and Type/Description columns: both sets, door-list wraps, EA. units', async () => {
  const gs = await hardware('ef4f9bfd055baa96-2');
  assert.deepEqual(gs.map(g => [g.group_number, g.components.length]), [['1', 6], ['1A', 6]]);
  assert.equal(gs[0].assigned_doors.length, 50);
  assert.equal(gs[0].assigned_doors[0], 'E101');
  assert.equal(gs[0].assigned_doors.at(-1), 'F208');
  assert.deepEqual(gs[1].assigned_doors, ['E103', 'E105']);
  assert.deepEqual(fields(gs[0].components[0]), [3, 'Hinges', 'BB1279 4.5” x 4.5” NRP', 'US26D', 'HAG']);
  assert.ok(gs.every(g => !g.components.some(c => /HARDWARE SCHEDULE/.test(c.description || ''))));
});

test('Hardware Sets is a title; Set: headings and vertically centered multiline cells retain their own rows', async () => {
  const gs = await hardware('8c77fa69fc375a81-35');
  assert.deepEqual(gs.map(g => [g.group_number, g.components.length]), [['1.0', 7], ['2.0', 10]]);
  assert.deepEqual(fields(gs[0].components[0]), [3, 'Hinges by Door/Frame Manufacturer', 'Prehung Door/Frame - Hinges by Manufacturer', null, 'OT']);
  assert.deepEqual(fields(gs[0].components[1]), [1, 'Rim Exit Device (STRM, CD)', '16 70 PE8804 WEL (SFIC, Cyl. Dogging)', 'US10BE', 'SA']);
  assert.equal(gs[0].components[5].description, 'Kick Plate');
  assert.equal(gs[0].components[6].description, 'Gaskets, sweeps Threshold by Door/Frame Manufacturer');
  assert.equal(gs[0].components[6].catalog_number, 'Prehung Door/Frame - Gaskets and Threshold by Manufacturer');
});

test('a centered quantity separates a wrapped card-reader lock from the preceding strike', async () => {
  const gs = await hardware('1af9e638165d85fb-52');
  assert.deepEqual(gs.map(g => g.components.length), [14, 9]);
  assert.deepEqual(fields(gs[0].components[3]), [1, 'Dust Proof Strike', '570', 'US26D', 'RO']);
  assert.deepEqual(fields(gs[0].components[4]), [1, 'Card Reader Lock (fail- secure)', 'ML20605 x TCRNE1 NSA SS078 M812 24AD', '626', 'RU']);
});

test('catalog columns learned from wrapped lines preserve catalog qualifiers and specification references do not become makers', async () => {
  const gs = await hardware('4e7e992b311a3f39-24');
  assert.deepEqual(gs.map(g => g.components.length), [5, 4]);
  assert.deepEqual(fields(gs[0].components[0]), [1, 'Continuous Hinge', 'CFM_SLF-HD1 x Length Required', null, 'PE']);
  assert.deepEqual(fields(gs[0].components[2]), [1, 'Surface Closer', '7500 (Reg or P/A)', '689', 'NO']);
});

test('continuation items before the first heading are retained, including rows reader B misses', async () => {
  const gs = await hardware('a248cf8b5dee4d92-24');
  assert.deepEqual(gs.map(g => [g.group_number, g.components.length]), [['(continued)', 2], ['3.0', 4], ['4.0', 6], ['5.0', 9]]);
  assert.equal(gs[0].continued, true);
  assert.equal(gs[0].components[0].catalog_number, '2746x6A ( field verify width req)');
  assert.ok(gs[1].components.some(c => c.catalog_number === 'by door / frame mfg'));
});

test('HEADING n and explicit FINISH header keep dark bronze DKB as finish, not dormakaba', async () => {
  const gs = await hardware('595613e060c69652-273');
  assert.deepEqual(gs.map(g => [g.group_number, g.components.length]), [['3', 6], ['4', 9], ['5', 7]]);
  assert.deepEqual(fields(gs[1].components[0]), [2, 'Continuous Hinge', '780-224HD', 'DKB', null]);
});

test('two schedules sharing baselines retain all 131 doors, left-overhanging marks and sparse fire-rating columns', async () => {
  const f = fixture('7478006f7fd5b43c-45');
  const r = await readDoorScheduleFromLines(f.lines, f);
  assert.deepEqual(r.tables.map(t => t.rows), [54, 77]);
  assert.equal(r.doors.length, 131);
  assert.equal(r.doors[0].door_number, '101A');
  assert.equal(r.doors.at(-1).door_number, '239D');
  assert.ok(r.doors.every(d => !/^\d+\.$/.test(d.door_number)));
  const d = r.doors.find(d => d.door_number === '205A');
  assert.deepEqual([d.width_inches, d.height_inches, d.door_type, d.fire_rating, d.hardware_group], [36, 80, 'WD-1', '3/4 HR', '07.03']);
});

test('two-row schedule next to a finish legend excludes legend text and numbered notes', async () => {
  const f = fixture('7478006f7fd5b43c-28');
  const r = await readDoorScheduleFromLines(f.lines, f);
  assert.deepEqual(r.doors.map(d => [d.door_number, d.width_inches, d.height_inches, d.door_type, d.fire_rating, d.hardware_group, d.remarks]), [
    ['AD101', 36, 84, 'WD-1', null, '06.02', 'Room: MENS RESTROOM'],
    ['AD102', 36, 84, 'WD-1', null, '06.02', 'Room: WOMENS RESTROOM'],
  ]);
});
