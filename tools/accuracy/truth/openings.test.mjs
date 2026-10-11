import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveScheduleOpenings } from './openings.mjs';
import { readA } from './reader_a.mjs';
import { readDoorsB } from './reader_b.mjs';
import { pageItems } from './pdf.mjs';
import { readSchedules } from './load_set.mjs';
import { alignDoors, summarize } from './agree.mjs';
import { buildPlacement } from '../placement.mjs';
import { pages as planFixture, truth } from '../fixtures/placement.mjs';

const item = (str, x, y, h = 18) => ({ str, x, y, h, w: str.length * h * 0.5 });
const page = (n, title, site = 'FACILITY: TEST CENTER') => ({ page: n, width: 3024, height: 2160, items: [
  item(`A-${600 + n}`, 2800, 2070, 28), item(title, 2650, 2000, 20), ...(site ? [item(site, 2700, 1800, 18)] : []),
] });
const door = (page, mark = '101A', extra = {}) => ({ page, mark, width_inches: 36, height_inches: 84, ...extra });
const resolve = (rows, pages) => resolveScheduleOpenings(rows, [], pages).doorsA;

async function fayette() {
  const fs = new Map([5, 14].map(n => [n, JSON.parse(readFileSync(new URL(`../../../weyland-subx-worker/test/fixtures/g070/9dffef61b825368d-${n}.json`, import.meta.url)))]));
  const pdf = { numPages: 14, getPage: async n => {
    const f = fs.get(n);
    return { rotate: f.rotate, getTextContent: async () => ({ items: f.items }),
      getAnnotations: async () => f.annotations, cleanup() {},
      getViewport: () => ({ width: f.width, height: f.height, transform: f.viewport }) };
  } };
  const pages = Array.from({ length: 14 }, (_, i) => ({ page: i + 1, width: 2592, height: 1728, items: [] }));
  const A = [], B = [];
  for (const n of [5, 14]) {
    const p = pages[n - 1] = await pageItems(pdf, n);
    A.push(...(await readA(pdf, n, 'door_schedule')).doors.map(d => ({ page: n, ...d })));
    // Original pdf.js rules intersecting the schedule bbox. Verified to return
    // byte-identical rows to the complete original page geometry for both pages.
    const rules = JSON.parse(readFileSync(new URL(`../fixtures/g078/fayette-${n}-rules.json`, import.meta.url)));
    B.push(...readDoorsB(p.items, rules, p).doors.map(d => ({ page: n, ...d })));
  }
  return { pdf, pages, A, B };
}

test('Fayette original text items: 53 rows are 27 openings; dedicated schedule wins', async () => {
  const { pdf, pages, A, B } = await fayette();
  assert.deepEqual([A.length, B.length], [53, 53]);
  assert.equal(summarize(alignDoors(A, B)).agreed, 47);
  const r = resolveScheduleOpenings(A, B, pages);
  assert.deepEqual([r.doorsA.length, r.doorsB.length], [27, 27]);
  assert.equal(summarize(alignDoors(r.doorsA, r.doorsB)).agreed, 25);
  for (const rows of [r.doorsA, r.doorsB]) {
    assert.equal(rows.filter(d => d.mark === '116A').length, 1);
    assert.equal(rows.find(d => d.mark === '119D').page, 5);
    const d = rows.find(d => d.mark === '120A');
    assert.equal(d.page, 14);
    assert.equal(d.width_inches, 36);
    assert.deepEqual(d.schedule_rows.map(s => [s.page, s.width_inches]), [[14, 36], [5, 54]]);
    assert.equal(d.door_type, null, 'do not fill blank authoritative fields with older fields');
  }
  const aOnly = await readSchedules(pdf, pages, { readerB: false, hardware: false });
  assert.deepEqual(aOnly.doorsA, r.doorsA);
  assert.equal(aOnly.doorRowsA.length, 53);
  assert.equal(r.doorResolution.a.collapsed_rows, 26);
  assert.ok(r.doorResolution.pages.every(p => p.scope.facility_name === 'FAYETTE COUNTY ANIMAL SHELTER'
    && p.scope.address === '1155 SR 74 S'));
  assert.ok(r.doorResolution.a.repeated.find(d => d.mark === '120A').conflicts.some(c => c.fields.includes('width_inches')));
  assert.deepEqual(resolve(r.doorsA, pages), r.doorsA, 'placement can accept resolved rows');
});

test('g044: k same-page rows stay k openings, even when repeated on a second page', () => {
  const pages = [page(2, 'GENERAL NOTES'), page(3, 'DOOR SCHEDULE')];
  const rows = [door(2), door(2, '101A', { width_inches: 42 }), door(2, '102A'),
    door(3, '101A', { width_inches: 42 }), door(3), door(3, '102A')];
  const r = resolve(rows, pages);
  assert.equal(r.length, 3);
  assert.deepEqual(r.filter(d => d.mark === '101A').map(d => d.width_inches).sort(), [36, 42]);
  assert.ok(r.every(d => d.schedule_rows.length === 2));
  assert.ok(r.every(d => new Set(d.schedule_rows.map(s => s.page)).size === 2));
  assert.deepEqual(resolve(r, pages), r, 'reordered same-page occurrence aliases stay stable');
  assert.equal(resolve(rows.slice(0, 3), pages).length, 3);
  assert.equal(resolve(rows.slice(0, 4), pages).filter(d => d.mark === '101A').length, 2);
});

test('separate sites, buildings and floors can reuse identical marks and fields', () => {
  for (const ps of [
    [page(2, 'DOOR SCHEDULE', 'NORTH ELEMENTARY SCHOOL'), page(3, 'DOOR SCHEDULE', 'SOUTH ELEMENTARY SCHOOL')],
    [page(2, 'BUILDING A DOOR SCHEDULE'), page(3, 'BUILDING B DOOR SCHEDULE')],
    [page(2, 'FIRST FLOOR DOOR SCHEDULE'), page(3, 'SECOND FLOOR DOOR SCHEDULE')],
    [page(2, 'LEVEL 1 DOOR SCHEDULE'), page(3, 'LEVEL 2 DOOR SCHEDULE')],
    [page(2, 'FIRST FLOOR DOOR SCHEDULE'), page(3, 'LEVEL 2 DOOR SCHEDULE')],
  ]) assert.equal(resolve([door(2), door(2, '102A'), door(3), door(3, '102A')], ps).length, 4);
});

test('a shared mark alone is insufficient; size/field evidence or a repeated inventory is required', () => {
  const ps = [page(2, 'DOOR SCHEDULE'), page(3, 'DOOR SCHEDULE')];
  assert.equal(resolve([{ page: 2, mark: '1' }, { page: 3, mark: '1' }], ps).length, 2);
  assert.equal(resolve([door(2), door(3, '101A', { width_inches: 42 })], ps).length, 2);
  assert.equal(resolve([door(2), door(3)], ps).length, 1);
  assert.equal(resolve([door(2, '101 A'), door(3, '101A [p.3]')], ps).length, 1);
  assert.equal(resolve([door(2, '101A', { location: 'OFFICE' }), door(3, '101A', { location: 'STORE' })], ps).length, 2);
});

test('source aliases align a fallback reading once, preserving its disagreement', () => {
  const ps = [page(2, 'SPECIFICATIONS'), page(3, 'DOOR SCHEDULE')];
  const A = [door(2, '101A', { width_inches: 54 }), door(2, '102A'), door(3), door(3, '102A')];
  const B = A.filter(d => !(d.page === 3 && d.mark === '101A'));
  const r = resolveScheduleOpenings(A, B, ps), s = summarize(alignDoors(r.doorsA, r.doorsB));
  assert.deepEqual([r.doorsA.length, r.doorsB.length, s.rows, s.agreed, s.disputed], [2, 2, 2, 1, 1]);
  assert.deepEqual(resolveScheduleOpenings(A, [], ps).doorsA, r.doorsA, 'B never changes A identity decisions');
});

test('a repeated inventory can revise the room as well as size; the dedicated sheet wins', () => {
  const ps = [page(2, 'SPECIFICATIONS'), page(3, 'DOOR SCHEDULE')];
  const rows = [door(2, '101A', { location: 'OFFICE' }), door(2, '102A'),
    door(3, '101A', { location: 'STORE' }), door(3, '102A')];
  const r = resolve(rows, ps);
  assert.equal(r.length, 2);
  assert.equal(r.find(d => d.mark === '101A').location, 'STORE');
});

test('a missing page scope cannot bridge two known different sites', () => {
  const ps = [page(2, 'DOOR SCHEDULE', 'NORTH SCHOOL'), page(3, 'DOOR SCHEDULE', ''), page(4, 'DOOR SCHEDULE', 'SOUTH SCHOOL')];
  const rows = ps.flatMap(p => [door(p.page), door(p.page, '102A')]);
  assert.equal(resolve(rows, ps).length, 6, 'a known scope cannot collapse with missing scope');
});

test('placement counts one opening, retains both sources, and uses authoritative fields', () => {
  const ps = [structuredClone(planFixture[0]), page(2, 'GENERAL NOTES'), page(3, 'DOOR SCHEDULE')];
  const rows = [door(2, '101A', { width_inches: 54 }), door(2, '101B'), door(2, '102A'),
    door(3), door(3, '101B'), door(3, '102A')];
  const r = buildPlacement(truth, ps, rows);
  assert.equal(r.summary.marks_total, 3);
  assert.equal(r.summary.marks_placed, 3);
  assert.equal(r.tags.length, 3);
  assert.equal(r.tags.find(t => t.mark === '101A').width_inches, 36);
  assert.ok(r.tags.every(t => t.schedule_rows.length === 2));
});

test('g044 placement still requires k distinct positions after cross-page resolution', () => {
  const ps = [structuredClone(planFixture[0]), page(2, 'DOOR SCHEDULE'), page(3, 'DOOR SCHEDULE')];
  ps[0].items.find(i => i.str === '101B').str = '101A';
  const rows = [door(2), door(2, '101A', { width_inches: 42 }), door(3), door(3, '101A', { width_inches: 42 })];
  const r = buildPlacement(truth, ps, rows);
  assert.equal(r.summary.marks_total, 2);
  assert.equal(r.summary.marks_placed, 2);
  assert.ok(r.tags.every(t => t.shared_mark.rows === 2 && t.schedule_rows.length === 2));
  ps[0].items = ps[0].items.filter(i => !(i.str === '101A' && i.x === 800));
  assert.equal(buildPlacement(truth, ps, rows).summary.marks_placed, 0);
});
