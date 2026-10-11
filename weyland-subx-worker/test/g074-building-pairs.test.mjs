// g074: the WeylandAI Building's door schedule (tools/bidset/out, A-601 on page 3) prints PAIR in its REMARKS
// column; the server's text-layer read takes a REMARKS cell that begins with the word PAIR (or PR) as a pair,
// so SightX's openings CSV says pair where the drawn schedule does. Expected values: tools/bidset/out/truth-doors.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';
import { openPdf } from '../../tools/accuracy/truth/pdf.mjs';

const TRUTH = JSON.parse(readFileSync(new URL('../../tools/bidset/out/truth-doors.json', import.meta.url)));
const PDF = readFileSync(new URL('../../tools/bidset/out/weylandai-building-bidset.pdf', import.meta.url));

test('the Building: 48 rows, the four PAIR openings read as pairs, and nothing else', async () => {
  const doc = await openPdf(PDF);
  const r = await readPageFromDoc(doc, 3, 'door_schedule');
  const doors = r.result.doors;
  assert.deepEqual(doors.map(d => d.door_number), TRUTH.doors.map(t => t.mark));
  assert.deepEqual(doors.filter(d => d.pair).map(d => d.door_number), TRUTH.doors.filter(t => t.pair).map(t => t.mark));
  for (const t of TRUTH.doors) {
    const d = doors.find(x => x.door_number === t.mark);
    assert.deepEqual([d.width_inches, d.height_inches, d.hardware_group], [t.width_inches, t.height_inches, t.hardware_group], t.mark);
  }
});
