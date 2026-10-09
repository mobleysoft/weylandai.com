import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromTextLayer } from '../src/lib/text-layer-read.js';
import { hardwareSpecSections, hardwareScheduleNeed, guestDetail, doorListCsv } from '../assets/client-ocr-src/schedule-workspace.mjs';
import { writeDoorScheduleEntries } from '../src/lib/hardware-extraction-vision-dispatch.js';
import { getDocument, Util } from '../src/vendor/pdfjs-text.mjs';
import { csvEvidence, doorEvidence } from '../../tools/user-simulation/lib/estimator-assertions.mjs';

const pdf = readFileSync(new URL('../../tools/corpus/door-schedules/f0e863d88ea688ff.pdf', import.meta.url));
const truth = JSON.parse(readFileSync(new URL('../../tools/corpus/expected/rockford-a2.2-door-schedule.json', import.meta.url)));

test('served browser bytes read the single-page guest A2.2 with its spec reference and every CSV pricing cell', async () => {
  // Import the actual .bin payloads the asset route sends, not their source
  // twins. Node needs data URLs for the .bin extension and its relative import.
  const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const workspaceUrl = moduleUrl(readFileSync(new URL('../assets/client-ocr/schedule-workspace.mjs.bin', import.meta.url)));
  const readerCode = readFileSync(new URL('../assets/client-ocr/schedule-text-layer.mjs.bin', import.meta.url), 'utf8')
    .replace(/(["'])\.\/schedule-workspace\.mjs(?:\?[^"']*)?\1/g, JSON.stringify(workspaceUrl));
  const reader = await import(moduleUrl(readerCode)), workspace = await import(workspaceUrl);
  const sheet = readFileSync(new URL('../../tools/user-simulation/roles/rockford-A2.2-p29.pdf', import.meta.url));
  const doc = await getDocument({ data: new Uint8Array(sheet), disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
  try {
    assert.equal(doc.numPages, 1);
    const layer = await reader.pageTextLines({ Util }, await doc.getPage(1));
    const extraction = await reader.readDoorScheduleFromLines(layer.lines, layer);
    const detail = workspace.guestDetail({ name: 'rockford-A2.2-p29.pdf' }, 'Guest Rockford', 1, [{ page: 1, extraction }]);
    assert.equal(detail.session.guest, true);
    assert.equal(detail.hardware_sets.length, 0);
    assert.match(detail.hardware_schedule_needed.message, /Section 08 71 00.*Door Hardware/);
    assert.match(detail.hardware_schedule_needed.message, /hardware group pages.*door sheet/);
    assert.equal(detail.hardware_schedule_needed.missing_groups.length, 14);
    const citations = doorEvidence(detail.doors.map(d => ({ mark: d.mark, group: d.hardware_group, source: 'p.' + d.source.page + ' row ' + d.source.table_row })), 1);
    assert.equal(citations.ok, true, JSON.stringify(citations));
    const csv = csvEvidence(workspace.doorListCsv(detail.doors));
    assert.equal(csv.ok, true, JSON.stringify(csv));
    for (const expected of truth.doors) {
      assert.equal(detail.doors.find(d => d.mark === expected.mark).alternate_pricing, expected.alternate_pricing, expected.mark);
    }
  } finally { await (doc.destroy?.() ?? doc.loadingTask?.destroy()); }
});

test('Rockford pricing fields survive the reader, persistence and CSV (including No and empty)', async () => {
  const r = await readPageFromTextLayer(pdf, 29, 'door_schedule');
  const doors = r.result.doors;
  assert.equal(doors.length, 65);
  for (const expected of truth.doors) {
    const d = doors.find(d => d.door_number === expected.mark);
    assert.equal(d.pair, expected.pair, expected.mark + ' pair');
    assert.equal(d.glazing, expected.glazing, expected.mark + ' glazing');
    assert.equal(d.alternate_pricing, expected.alternate_pricing, expected.mark + ' alternate pricing');
    assert.equal(d.hardware_group, expected.hardware_group, expected.mark + ' hardware group');
    assert.equal(d.source_row, expected.row - 1, expected.mark + ' zero-based source index');
  }
  const alt = doors.filter(d => /^YES$/i.test(d.alternate_pricing || ''));
  // Independently checked in A2.2's final column (pdftotext -layout).
  assert.equal(doors.find(d => d.door_number === '109.1').alternate_pricing, 'Yes');
  assert.equal(doors.find(d => d.door_number === '119.2').alternate_pricing, 'Yes');
  assert.equal(doors.find(d => d.door_number === '126.1.2').alternate_pricing, null);
  assert.equal(doors.find(d => d.door_number === '1J.1').alternate_pricing, 'No');
  assert.deepEqual(doors[0].hardware_spec_sections, ['08 71 00']);
  const writes = [];
  const env = { DB: { prepare(sql) { return { bind(...args) { this.args = args; return this; }, async all() { return { results: [] }; }, async run() { if (/INSERT INTO door_schedule_entries/.test(sql)) writes.push(this.args); return { success: true }; } }; }, async batch(stmts) { return Promise.all(stmts.map(s => s.run())); } } };
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
