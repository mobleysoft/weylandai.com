import test from 'node:test';
import assert from 'node:assert/strict';
import { takeoffCounts } from './lib/takeoff-assertions.mjs';
const rows = [{ mark: '01', group: 'Q3' }, { mark: '02', group: '03' }, { mark: '03', group: 'Q3' }];
const tiles = [{ label: 'DOOR ROWS (MACHINE-READ)', value: '3' }, { label: 'HARDWARE GROUPS (MACHINE-READ)', value: '2' }];
test('current qualified labels agree with actual schedule rows and groups', () => assert.equal(takeoffCounts(tiles, rows).ok, true));
test('legacy labels use the same count bar', () => assert.equal(takeoffCounts([{ label: 'Doors', value: '3' }, { label: 'Hardware groups', value: '2' }], rows).ok, true));
test('the workspace empty-cell marker is excluded, while actual distinct groups must still match', () => {
  const displayed = [...rows, { mark: '04', group: '(empty)' }, { mark: '05', group: '-' }];
  const shown = [{ label: 'Door rows', value: '5' }, tiles[1]];
  assert.equal(takeoffCounts(shown, displayed).ok, true);
  assert.equal(takeoffCounts(shown, displayed.map(row => row.mark === '04' ? { ...row, group: 'A07' } : row)).ok, false);
});
test('a visible positive count cannot conceal missing rows or hardware groups', () => {
  assert.equal(takeoffCounts(tiles, rows.slice(1)).ok, false);
  assert.equal(takeoffCounts(tiles, rows.map(row => ({ ...row, group: '03' }))).ok, false);
});
test('missing, malformed or negative tile values and empty results fail', () => {
  for (const value of ['', '3 doors', '-3', undefined]) assert.equal(takeoffCounts([{ label: 'Door rows', value }, tiles[1]], rows).ok, false);
  assert.equal(takeoffCounts(tiles.slice(0, 1), rows).ok, false);
  assert.equal(takeoffCounts([], []).ok, false);
});
