import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromTextLayer } from '../src/lib/text-layer-read.js';
import { hardwareSpecSections, hardwareScheduleNeed, guestDetail, doorListCsv } from '../assets/client-ocr-src/schedule-workspace.mjs';
import { writeDoorScheduleEntries } from '../src/lib/hardware-extraction-vision-dispatch.js';

const pdf = readFileSync(new URL('../../tools/corpus/door-schedules/f0e863d88ea688ff.pdf', import.meta.url));
const truth = JSON.parse(readFileSync(new URL('../../tools/corpus/expected/rockford-a2.2-door-schedule.json', import.meta.url)));

test('Rockford pricing fields survive the reader, persistence and CSV (including No and empty)', async () => {
  const r = await readPageFromTextLayer(pdf, 29, 'door_schedule');
  const doors = r.result.doors;
  assert.equal(doors.length, 65);
  for (const expected of truth.doors) {
    const d = doors.find(d => d.door_number === expected.mark);
    assert.equal(d.pair, expected.pair, expected.mark + ' pair');
    assert.equal(d.glazing, expected.glazing, expected.mark + ' glazing');
  }
  const alt = doors.filter(d => /^YES$/i.test(d.alternate_pricing || ''));
  // Independently checked in A2.2's final column (pdftotext -layout).
  assert.equal(doors.find(d => d.door_number === '109.1').alternate_pricing, 'Yes');
  assert.equal(doors.find(d => d.door_number === '119.2').alternate_pricing, 'Yes');
  assert.equal(doors.find(d => d.door_number === '126.1.2').alternate_pricing, null);
  assert.equal(doors.find(d => d.door_number === '1J.1').alternate_pricing, 'No');
  assert.deepEqual(doors[0].hardware_spec_sections, ['08 71 00']);
  const writes = [];
  const env = { DB: { prepare(sql) { return { bind(...args) { this.args = args; return this; }, async all() { return { results: [] }; }, async run() { if (/INSERT INTO door_schedule_entries/.test(sql)) writes.push(this.args); return { success: true }; } }; } } };
  await writeDoorScheduleEntries('proof', 'proof', 29, doors, .98, env);
  assert.equal(writes.length, 65);
  for (let i = 0; i < writes.length; i++) {
    const meta = writes[i].find(v => typeof v === 'string' && v.startsWith('{"source":'));
    const stored = JSON.parse(meta);
    assert.equal(stored.alternate_pricing, doors[i].alternate_pricing);
    assert.equal(stored.pair, doors[i].pair);
    assert.equal(stored.glazing, doors[i].glazing);
    assert.deepEqual(stored.hardware_spec_sections, ['08 71 00']);
  }
  const detail = guestDetail({ name: 'Rockford.pdf' }, 'Rockford', 30, [{ page: 29, extraction: r.result }]);
  const csv = doorListCsv(detail.doors);
  assert.match(csv.split('\r\n')[0], /DOOR PAIR,GLAZING,ALTERNATE PRICING/);
  assert.match(csv, /Yes,G2,No/);
  assert.match(doorListCsv([{ mark: 'empty', pair: null, glazing: null, alternate_pricing: null }]), /empty/);
  console.log(JSON.stringify({ doors: doors.length, pairs: doors.filter(d => d.pair).length, alternate_yes: alt.map(d => d.door_number), alternate_no: doors.filter(d => /^NO$/i.test(d.alternate_pricing || "")).length, spec: doors[0].hardware_spec_sections }));
});

test('A2.2 alone names the missing spec; reading 08 71 00 resolves all hardware groups', async () => {
  const r = await readPageFromTextLayer(pdf, 29, 'door_schedule');
  const missing = hardwareScheduleNeed(r.result.doors, []);
  assert.match(missing.message, /Section 08 71 00 — Door Hardware/);
  assert.equal(missing.missing_groups.length, 14);
  const groups = [];
  for (let p = 17; p <= 23; p++) {
    const h = await readPageFromTextLayer(pdf, p, 'hardware_schedule');
    groups.push(...h.result.hardware_groups.map(g => ({ set_number: g.group_number, components: g.components.length })));
  }
  assert.equal(groups.length, 14);
  assert.equal(groups.reduce((n, g) => n + g.components, 0), 110);
  assert.equal(hardwareScheduleNeed(r.result.doors, groups), null);
  assert.ok(hardwareScheduleNeed(r.result.doors, groups.slice(1)), 'partial read still asks for missing groups');
  assert.ok(hardwareScheduleNeed(r.result.doors, groups.map(g => ({ ...g, components: 0 }))), 'door-derived empty groups are not hardware');
});

test('spec-section spellings normalize; unrelated specifications are not hardware references', () => {
  for (const spelling of ['08 7100', '08 71 00', '087100', '08-71-00']) assert.deepEqual(hardwareSpecSections('SEE SPECIFICATION ' + spelling + ' FOR DOOR HARDWARE SETS'), ['08 71 00']);
  assert.deepEqual(hardwareSpecSections('SEE SPECIFICATION 08 1113 FOR HOLLOW METAL DOORS'), []);
});

test('packet door table and hardware pages print the same full hardware-group label', async () => {
  const { generateDoorSchedulePages, generateHardwareSetPage } = await import('../src/lib/submittal-assembler.js');
  const { openTextLayerDoc } = await import('../src/lib/text-layer-read.js');
  const table = await generateDoorSchedulePages([{ mark: '101', hardware_group: '51 UTY-CUS', width_inches: 36, height_inches: 84, page_number: 1 }]);
  const group = await generateHardwareSetPage({ set: { set_number: '51 UTY-CUS', set_name: 'Utility' }, doors: [], components: [] }, {}, {});
  for (const bytes of [table.bytes, group]) {
    const pdf = await openTextLayerDoc(bytes);
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) text += (await (await pdf.getPage(p)).getTextContent()).items.map(i => i.str).join(' ');
    assert.match(text, /Hardware group|Hardware Group/);
    assert.doesNotMatch(text, /HW group|\bSet #|\bSet Name|Using Set|\bHardware Set/i);
    await pdf.destroy?.();
  }
});
