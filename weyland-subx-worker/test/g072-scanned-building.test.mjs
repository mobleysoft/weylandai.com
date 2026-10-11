import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAFromLines } from '../../tools/accuracy/truth/reader_a.mjs';
import { readDoorsB } from '../../tools/accuracy/truth/reader_b.mjs';
import { alignDoors, scoreDoorsVs } from '../../tools/accuracy/truth/agree.mjs';

const expected = JSON.parse(readFileSync(new URL('../../tools/bidset/out/truth-doors.json', import.meta.url)));
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/g072/scanned-building-page-3-${name}.json`, import.meta.url)));
async function read(name) {
  const o = fixture(name);
  const a = (await readAFromLines(o.lines, o, 'door_schedule', o.word_count)).doors.map(d => ({ page: 3, ...d }));
  const b = readDoorsB(o.items, o.rules, o).doors.map(d => ({ page: 3, ...d }));
  assert.equal(a.length, 48);
  assert.equal(b.length, 48);
  const rows = alignDoors(a, b);
  const agreed = rows.filter(r => r.status === 'agreed').map(r => r.a);
  return { o, a, b, rows, agreed, score: scoreDoorsVs(expected, agreed) };
}

test('g072: the old nine agreed doors include two dimensions missing on both readers', async () => {
  const { a, b, agreed, score } = await read('before');
  for (const reader of [a, b]) {
    assert.equal(reader.find(d => d.mark === '212').height_inches, null);
    assert.equal(reader.find(d => d.mark === '312').width_inches, null);
  }
  assert.equal(agreed.length, 9);
  assert.equal(score.rows_fully_right, 7);
  assert.equal(score.fields_right, 61);
  assert.equal(score.fields_total, 63);
  assert.deepEqual(score.wrong.filter(r => r.field !== '(row)'), [
    { key: '212', page: 3, field: 'height_inches', expected: 84, read: null },
    { key: '312', page: 3, field: 'width_inches', expected: 36, read: null },
  ]);
});

test('g072: recovered OCR dimensions match A-601; seven agreements are all correct', async () => {
  const before = await read('before');
  const after = await read('after');
  // A-601 prints both STAIR 2 openings as 3\'-0" x 7\'-0".
  for (const mark of ['212', '312']) {
    const d = after.a.find(d => d.mark === mark);
    assert.equal(d.location, 'STAIR 2');
    assert.equal(d.width_inches, 36);
    assert.equal(d.height_inches, 84);
    assert.equal(d.hardware_group, '02');
    const line = after.o.lines.find(l => l.words[0].str === mark);
    const word = line.words.find(w => w.str === (mark === '212' ? '7-0"' : '3-0"'));
    assert.ok(word, 'preserve the recovered OCR spelling, including its missing apostrophe');
    assert.equal(word.cell_evidence.text, '', 'the initial cell recognition was empty');
    assert.equal(word.cell_evidence.reread.reason, 'consensus');
    assert.equal(word.cell_evidence.reread.candidate_values, 1);
  }
  const scoreA = scoreDoorsVs(expected, after.a);
  assert.equal(scoreA.rows_fully_right, 48);
  assert.equal(scoreA.fields_right, 336);
  assert.equal(scoreA.extra_rows, 0);
  // B currently requires an apostrophe or an unquoted 3-0 / 7-0 spelling.
  // Retain the dispute until B independently reads the printed dimensions.
  assert.equal(after.b.find(d => d.mark === '212').height_inches, null);
  assert.equal(after.b.find(d => d.mark === '312').width_inches, null);
  const remaining = new Set(after.agreed.map(d => d.mark));
  assert.deepEqual(before.agreed.filter(d => !remaining.has(d.mark)).map(d => d.mark), ['212', '312']);
  assert.equal(after.agreed.length, 7);
  assert.equal(after.score.rows_fully_right, 7);
  assert.equal(after.score.fields_right, 49);
  assert.equal(after.score.fields_total, 49);
});
