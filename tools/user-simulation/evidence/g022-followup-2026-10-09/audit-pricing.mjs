// Independent Poppler text, not production reader output. Recheck all 65
// final-column cells, retaining the blank at 126.1.2, then extend the oracle.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path = 'tools/corpus/expected/rockford-a2.2-door-schedule.json';
const truth = JSON.parse(readFileSync(path, 'utf8'));
const lines = readFileSync(new URL('./sheet-layout.txt', import.meta.url), 'utf8').split('\n');
const yes = new Set(['109.1', '109.2', '111.1', '111.1.1', '113.1', '113.1.1', '114.1', '118.1', '119.1', '119.2', '126.1', '126.1.1', '128.1.1', '138.1', '138.2', '147.1.1', '167.1.1', '179.1.1']);
const cells = [];
// Poppler emits these adjacent pairs column-by-column instead of row-by-row.
// Read their final cells in the rendered top-rows/middle-rows crops instead.
const rendered = { '127.1': 'No', '128.1.1': 'Yes', '152.1': 'No', '152.1.1': 'No' };
for (const d of truth.doors) {
  // The schedule sits in columns 580-830 in pdftotext -layout. Other details
  // on the sheet repeat marks; require the mark in the schedule's mark column.
  const re = new RegExp('(?:^|\\s)' + d.mark.replaceAll('.', '\\.') + '(?=\\s|$)');
  const matches = lines.filter(l => re.test(l.slice(580, 600)));
  assert.equal(matches.length, 1, d.mark + ' source line');
  const line = matches[0].slice(580, 830).trimEnd();
  const actual = rendered[d.mark] ?? line.match(/\b(Yes|No)$/)?.[1] ?? null;
  const expected = d.mark === '126.1.2' ? null : yes.has(d.mark) ? 'Yes' : 'No';
  assert.equal(actual, expected, d.mark + ' final column: ' + line);
  cells.push({ mark: d.mark, alternate_pricing: actual, source: rendered[d.mark] ? 'Rendered A2.2 final column (Poppler separated the two rows)' : line });
  d.alternate_pricing = actual;
}
truth.notes = truth.notes.map(n => n === 'COMMENTS and ALTERNATE PRICING are not part of the expected fields.'
  ? 'COMMENTS are not part of the expected fields. ALTERNATE PRICING was audited against A2.2 with pdftotext -layout and rendered schedule crops on 2026-10-09: 18 Yes, 46 No, one blank (126.1.2).'
  : n);
writeFileSync(path, JSON.stringify(truth, null, 1));
writeFileSync(new URL('./pricing-audit.json', import.meta.url), JSON.stringify(cells, null, 2) + '\n');
console.log('65 independently checked alternate-pricing cells: 18 Yes, 46 No, 1 blank');
