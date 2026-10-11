import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFixture } from '../fixtures/g078b/read.mjs';
import { resolveScheduleOpenings } from './openings.mjs';
import { alignDoors, summarize } from './agree.mjs';
import { readSchedules } from './load_set.mjs';
import { buildPlacement } from '../placement.mjs';
import { buildingScope, compareBuildingScopes, comparePlacementScopes } from '../../../weyland-shared/building-scope.js';
import { lines, titleBlocks, readPlan } from '../../../weyland-shared/plan-read.js';
import { singleBuilding } from '../fixtures/g080/single-building.mjs';

const item = (str, x = 2350, y = 1000, h = 16) => ({ str, x, y, h, w: str.length * h * 0.5, rot: 0 });
const page = (n, labels = [], sheet = `A-${100 + n}`) => ({ page: n, width: 2592, height: 1728, items: [
  item(sheet, 2350, 1630, 30), item('DOOR SCHEDULE', 2350, 1500), ...labels.map((s, i) => item(s, 2350, 950 + i * 30)),
] });
const doors = ps => ps.flatMap(p => ['101', '102'].map(mark => ({ page: p.page, mark, width_inches: 36, height_inches: 84 })));
const resolve = ps => resolveScheduleOpenings(doors(ps), doors(ps), ps);
const scope = p => buildingScope(p, titleBlocks([p])[0], lines(p.items));
const count = r => [r.doorsA.length, r.doorsB.length, summarize(alignDoors(r.doorsA, r.doorsB)).agreed];

test('X2530 original text: two buildings retain 36 openings, agreements and plan identities', async () => {
  const { pdf, pages, A, B } = await readFixture(['x2530-01-p18', 'x2530-01-p53']);
  assert.deepEqual([A.length, B.length, summarize(alignDoors(A, B)).agreed], [36, 36, 36]);
  const r = resolveScheduleOpenings(A, B, pages);
  assert.deepEqual(count(r), [36, 36, 36]);
  const [a, b] = r.doorResolution.pages;
  assert.deepEqual([a.scope.building, b.scope.building], ['LOOP 4', 'LOOP 1']);
  assert.equal(a.scope.asset_number, '7815307019; 7815307024');
  assert.equal(b.scope.asset_number, '7815307024');
  assert.equal(a.scope.site_number, '5302; 5307');
  assert.equal(b.scope.site_number, '5307');
  assert.deepEqual([a.sheet, b.sheet, a.sheet_family, b.sheet_family], ['A-101', 'A-101.A', 'A', 'A.A']);
  assert.ok(a.scope_evidence.some(e => e.field === 'building' && e.text === 'LOOP 4' && e.x > 0));
  for (const audit of [r.doorResolution.a, r.doorResolution.b]) {
    assert.equal(audit.collapsed_rows, 0);
    assert.equal(audit.pairs[0].shared_marks, 16);
    assert.equal(audit.pairs[0].repeated_inventory, false);
    assert.deepEqual(audit.pairs[0].scope_comparison.differences.map(d => d.field), ['asset_number', 'building', 'site_number', 'sheet_family']);
  }
  assert.equal(new Set(r.doorsA.map(d => d.opening_id)).size, 36);
  assert.equal(new Set(r.doorsA.filter(d => d.mark === '101-1').map(d => d.opening_scope_id)).size, 2);
  const loaded = await readSchedules(pdf, pages, { readerB: false, hardware: false });
  assert.deepEqual(loaded.doorsA, r.doorsA);
  assert.deepEqual(resolveScheduleOpenings(r.doorsA, r.doorsB, pages), r, 'same identities and audit after re-resolution');
  for (const rows of [A, B, r.doorsA, loaded.doorsA]) {
    const p = buildPlacement({ sha16: 'fixture' }, pages, rows);
    assert.deepEqual([p.summary.marks_total, p.summary.marks_placed, p.tags.length], [36, 36, 36]);
    assert.equal(new Set(p.tags.map(t => t.opening_id)).size, 36);
    assert.ok(p.tags.every(t => t.schedule_rows.length === 1 && t.schedule_rows[0].page === t.page));
    assert.equal(p.tags.filter(t => t.page === 18 && t.opening_scope.building === 'LOOP 4').length, 18);
    assert.equal(p.tags.filter(t => t.page === 53 && t.opening_scope.building === 'LOOP 1').length, 18);
    assert.ok(p.tags.every(t => t.y > 1000), 'table cells are not plan tags');
  }
});

test('R2405 original text: matching scope collapses 14 rows to 7, with one canonical card per mark on A-101', async () => {
  const { pdf, pages, A, B } = await readFixture(['r2405-01-p15', 'r2405-01-p16']);
  assert.deepEqual([A.length, B.length, summarize(alignDoors(A, B)).agreed], [14, 14, 14]);
  const r = resolveScheduleOpenings(A, B, pages);
  assert.deepEqual(count(r), [7, 7, 7]);
  const [a, b] = r.doorResolution.pages;
  assert.deepEqual(a.scope, b.scope);
  assert.equal(a.scope.address, '1301 NAGOGAMI ROAD');
  assert.equal(a.scope.site_number, '6010');
  assert.equal(a.scope.facility_number, '8136010004; 8136010005');
  assert.equal(a.scope.facility_name, 'TROOP I HEADQUARTERS');
  assert.deepEqual([a.sheet, b.sheet, a.sheet_family, b.sheet_family], ['A-101', 'A-102', 'A', 'A']);
  assert.equal(r.doorResolution.a.pairs[0].scope_comparison.agrees, true);
  assert.ok(r.doorsA.every(d => d.schedule_rows.length === 2));
  const loaded = await readSchedules(pdf, pages, { readerB: false, hardware: false });
  assert.deepEqual(loaded.doorsA, r.doorsA);
  assert.deepEqual(resolveScheduleOpenings(r.doorsA, r.doorsB, pages), r);
  for (const rows of [A, B, r.doorsA, loaded.doorsA]) {
    const p = buildPlacement({ sha16: 'fixture' }, pages, rows);
    assert.deepEqual([p.summary.marks_total, p.summary.marks_placed, p.tags.length], [7, 7, 7]);
    assert.ok(p.tags.every(t => t.page === 15 && t.schedule_rows.length === 2));
    assert.ok(p.tags.every(t => t.y > 300), 'schedule cells on either sheet are not plan tags');
  }
});

test('each scope signal separates identical inventories independently; missing scope never agrees', () => {
  for (const [left, right, field] of [
    ['LOOP 8', 'LOOP 9', 'building'],
    ['BUILDING NORTH WING', 'BUILDING SOUTH WING', 'building'],
    ['FACILITY: EAST PUMP HOUSE', 'FACILITY: WEST PUMP HOUSE', 'facility_name'],
    ['ASSET # 9001', 'ASSET # 9002', 'asset_number'],
    ['SITE NO. 123', 'SITE NO. 456', 'site_number'],
    ['FACILITY NUMBER: 123', 'FACILITY NUMBER: 456', 'facility_number'],
    ['100 MAIN ROAD', '200 MAIN ROAD', 'address'],
  ]) {
    const r = resolve([page(1, [left]), page(2, [right])]);
    assert.deepEqual(count(r), [4, 4, 4], field);
    assert.ok(r.doorResolution.a.pairs[0].scope_comparison.differences.some(d => d.field === field));
    assert.deepEqual(count(resolve([page(1, [left]), page(2, [left])])), [2, 2, 2], field);
    assert.deepEqual(count(resolve([page(1, [left]), page(2)])), [4, 4, 4], field);
  }
  assert.deepEqual(count(resolve([page(1), page(2)])), [4, 4, 4], 'two missing scopes are not positive building evidence');
  assert.deepEqual(count(resolve([page(1, ['LEVEL 1']), page(2, ['LEVEL 1'])])), [4, 4, 4], 'matching levels do not identify a building');
  assert.deepEqual(count(resolve([page(1, [], 'A-101'), page(2, [], 'A-101.A')])), [4, 4, 4]);
  const ps = [page(1, ['ASSET # 9001']), page(2, ['ASSET # 9002'])];
  assert.equal(resolveScheduleOpenings(doors(ps).filter(d => d.mark === '101'), [], ps).doorsA.length, 2, 'scope also vetoes a lone identical row');
});

test('split labels, stacked values, and prose references retain their proper evidence', () => {
  const p = page(1);
  p.items.push(item('SITE #', 2350, 1100), item('44', 2450, 1100),
    item('ASSET #', 2350, 1122), item('9001', 2450, 1122),
    item('FACILITY #', 2350, 1160), item('6001', 2450, 1160), item('6002', 2450, 1178),
    item('SEE BUILDING B AND LOOP 99', 100, 400), item('BUILDING IS TO BE STAKED OUT ON SITE', 100, 500));
  const s = scope(p);
  assert.deepEqual(s.scope, { asset_number: '9001', facility_number: '6001; 6002', site_number: '44' });
  assert.equal(compareBuildingScopes(s, scope(page(2))).agrees, false);
});

test('placement falls back to similarity when no compatible schedule candidate remains', () => {
  const sch = page(1, ['LOOP 8']);
  const plan = page(2, ['LOOP 9']);
  plan.items.find(i => i.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
  plan.items.push(item('101', 300, 500), item('102', 600, 700));
  const r = buildPlacement({ sha16: 'fixture' }, [sch, plan], doors([sch]));
  assert.deepEqual([r.summary.marks_total, r.summary.marks_placed], [2, 2]);
  assert.equal(r.sheets[0].schedule_selection.rule, 'similarity-fallback-no-compatible-schedule');
  assert.deepEqual(r.sheets[0].schedule_selection.kept_pages, [1]);
  assert.deepEqual(r.sheets[0].schedule_selection.candidates[0].conflicts, [{ field: 'building', a: 'LOOP 9', b: 'LOOP 8' }]);
});

test('a plan tag sharing a schedule baseline stays eligible outside the mark column', () => {
  const p = page(1);
  p.items.find(i => i.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
  p.items.push(item('101', 100, 500), item('102', 100, 520), item('101', 600, 500), item('102', 800, 800));
  const rows = doors([p]).map((d, i) => ({ ...d, y: 500 + i * 20 }));
  const r = buildPlacement({ sha16: 'fixture' }, [p], rows);
  assert.equal(r.summary.marks_placed, 2);
  assert.ok(r.tags.every(t => t.x > 500));
});

test('T2421-class fixture: separate schedule and plan place all 33 marks, with raw or merged inputs', () => {
  for (const [planLabels, scheduleLabels, rule] of [
    [[], [], 'similarity'],
    [['LEVEL 1'], ['LEVEL 2'], 'similarity'],
    [['FACILITY: SINGLE SCHOOL'], [], 'similarity'],
    [['FACILITY: SINGLE SCHOOL'], ['FACILITY: SCHOOL'], 'similarity'],
    [['FACILITY: SINGLE SCHOOL'], ['FACILITY: SINGLE SCHOOL'], 'building-scope-then-similarity'],
    [['ASSET # 1001'], ['ASSET # 9001'], 'similarity-fallback-no-compatible-schedule'],
  ]) {
    const { pages, rows } = singleBuilding(planLabels, scheduleLabels);
    for (const doors of [rows, resolveScheduleOpenings(rows, [], pages).doorsA,
      rows.map((row, i) => ({ opening_id: `opening-${i}`, schedule_rows: [row] }))]) {
      const result = readPlan(pages, doors);
      assert.equal(result.tags.length, 33);
      assert.deepEqual(result.marks_not_on_plan, []);
      assert.equal(new Set(result.tags.flatMap(t => t._rows)).size, 33);
      assert.ok(result.tags.every(t => t.page === 12 && t.door_pages.join() === '15'));
      assert.equal(result.plan_sheets[0].schedule_selection.rule, rule);
    }
    const placed = buildPlacement({ sha16: 'synthetic-single-building' }, pages, rows);
    assert.deepEqual([placed.summary.marks_total, placed.summary.marks_placed], [33, 33]);
  }
});

test('placement conflicts need two definite identities; missing, partial and ambiguous readings do not veto', () => {
  const compare = (a, b) => comparePlacementScopes({ scope: a, sheet_family: 'A' }, { scope: b, sheet_family: 'A.A' });
  for (const [a, b] of [
    [{ facility_name: 'NORTH SCHOOL' }, {}],
    [{ facility_name: 'NORTH SCHOOL' }, { facility_name: 'SCHOOL' }],
    [{ asset_number: '100; 200' }, { asset_number: '200' }],
    [{ level: '1' }, { level: '2' }],
  ]) assert.deepEqual(compare(a, b).conflicts, []);
  for (const field of ['building', 'facility_name', 'asset_number', 'site_number', 'facility_number']) {
    const a = { [field]: 'NORTH 100' }, b = { [field]: 'SOUTH 200' };
    assert.equal(compare(a, b).conflicts.length, 1, field);
  }
});

test('an unknown schedule stays eligible when another schedule has a positive conflict', () => {
  const wrong = page(1, ['FACILITY: SOUTH SCHOOL']), unknown = page(2);
  const plan = page(3, ['FACILITY: NORTH SCHOOL']);
  plan.items.find(it => it.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
  plan.items.push(item('101', 300, 500), item('102', 600, 700));
  const result = readPlan([wrong, unknown, plan], doors([wrong, unknown]));
  assert.equal(result.tags.length, 2);
  assert.ok(result.tags.every(t => t.door_pages.join() === '2'));
  assert.equal(result.plan_sheets[0].schedule_selection.rule, 'scope-compatible-then-similarity');
  assert.deepEqual(result.marks_not_on_plan.map(d => d.page), [1, 1]);
});

test('affirmative facility or number evidence separates plans even when generic blocks are more similar', () => {
  for (const labels of [['FACILITY: NORTH SCHOOL', 'FACILITY: SOUTH SCHOOL'], ['ASSET # 100', 'ASSET # 200'], ['SITE # 100', 'SITE # 200']]) {
    const schedules = labels.map((label, i) => page(i + 1, [label]));
    const plans = labels.map((label, i) => {
      const p = page(i + 3, [label]);
      p.items.find(it => it.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
      p.items.push(item('101', 300, 500), item('102', 600, 700));
      return p;
    });
    // The first schedule has almost no common block text, but its identity is explicit.
    schedules[0].items.find(it => it.str === 'DOOR SCHEDULE').str = 'OPENING DETAILS';
    const r = buildPlacement({ sha16: 'fixture' }, [...schedules, ...plans], doors(schedules));
    assert.equal(r.summary.marks_placed, 4);
    assert.ok(r.tags.every(t => t.schedule_rows[0].page === t.page - 2));
    assert.ok(r.sheets.every(s => s.schedule_selection.rule === 'building-scope-then-similarity'));
  }
});

test('g082: the strongest building evidence wins before similarity (R2502-01 rebid class)', () => {
  // The restroom schedule shares only the facility name, but its block reads like the plan's (project and architect
  // lines); the dorm door schedule shares the facility name and the site and facility numbers under a generic block.
  const shared = ['PROJECT DORM RENOVATION PHASE TWO', 'ARCHITECT SMITH AND JONES'];
  const restroom = page(1, ['FACILITY: NORTH SCHOOL', ...shared]);
  const dorm = page(2, ['FACILITY: NORTH SCHOOL', 'SITE # 100', 'FACILITY # 7']);
  dorm.items.find(it => it.str === 'DOOR SCHEDULE').str = 'OPENING DETAILS';
  const plan = page(3, ['FACILITY: NORTH SCHOOL', 'SITE # 100', 'FACILITY # 7', ...shared]);
  plan.items.find(it => it.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
  plan.items.push(item('101', 300, 500), item('102', 600, 700));
  const row = (page, mark) => ({ page, mark, width_inches: 36, height_inches: 84 });
  const rows = [row(1, '201'), row(1, '202'), row(2, '101'), row(2, '102')];
  const r = buildPlacement({ sha16: 'fixture' }, [restroom, dorm, plan], rows);
  const selection = r.sheets.find(s => s.page === 3).schedule_selection;
  assert.deepEqual(selection.candidates.map(c => [c.page, c.matched.length]), [[1, 1], [2, 3]]);
  assert.equal(selection.rule, 'strongest-building-scope-then-similarity');
  assert.deepEqual(selection.kept_pages, [2]);
  assert.deepEqual(r.tags.map(t => [t.mark, t.page]), [['101', 3], ['102', 3]]);
  // Equal evidence keeps the previous rule and its similarity tie-break.
  const equal = page(4, ['FACILITY: NORTH SCHOOL', ...shared]);
  equal.items.find(it => it.str === 'DOOR SCHEDULE').str = 'FLOOR PLAN';
  const e = buildPlacement({ sha16: 'fixture' }, [restroom, dorm, equal], rows);
  assert.equal(e.sheets.find(s => s.page === 4).schedule_selection.rule, 'building-scope-then-similarity');
});
