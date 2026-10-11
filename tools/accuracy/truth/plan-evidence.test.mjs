// Synthetic geometry only: no harvested PDF text/items belong in this fixture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlan, titleBlocks } from '../../../weyland-shared/plan-read.js';
import { buildPlacement } from '../placement.mjs';

const item = (str, x, y, h = 12, rot = 0) => ({ str, x, y, h, w: str.length * h * 0.5, rot });
const page = (n, title, items = [], sheet = 'A-220.C') => ({ page: n, width: 2600, height: 1800, items: [
  item('SHEET TITLE:', 2350, 1450),
  ...title.map((s, i) => item(s, 2350, 1480 + i * 28, 24)),
  item('SHEET NUMBER', 2350, 1610), item(sheet, 2350, 1650, 32), ...items,
] });
const rows = (...marks) => marks.map(mark => ({ mark, page: 90 }));
const caption = (title, x, y, scale = '1/4" = 1\'-0"') => [item(title, x, y, 16), item(scale, x + 20, y + 18)];
const room = (mark, x, y) => [item('UTILITY', x - 12, y - 20, 14), item(mark, x, y, 14)];
const placed = (p, ds) => buildPlacement({ sha16: 'synthetic-plan-evidence' }, [p], ds);

test('labelled titles follow two or more aligned lines beyond the label window', () => {
  for (const title of [['UPPER FLOOR', 'PLAN - EAST'], ['LOWER', 'FLOOR', 'PLAN - WEST']]) {
    const p = page(1, title, [item('501', 300, 500)]);
    const tb = titleBlocks([p])[0];
    assert.equal(tb.title, title.join(' '));
    assert.equal(tb.plan_rule, 'multiline-title');
    assert.equal(tb.plan, true);
    const r = placed(p, rows('501'));
    assert.equal(r.summary.marks_placed, 1);
    assert.equal(r.sheets[0].plan_rule, 'multiline-title');
  }
});

test('stacked title qualifiers exclude RCP, code, phasing, key, site details and schedules', () => {
  for (const title of [
    ['UPPER FLOOR', 'REFLECTED CEILING', 'PLAN'], ['UPPER FLOOR RCP', 'PLAN - EAST'],
    ['CODE', 'PLAN'], ['PHASING', 'PLAN'], ['KEY', 'PLAN'], ['SITE', 'PLAN', 'DETAILS'],
    ['DOOR', 'SCHEDULE'], ['FLOOR', 'PLAN', 'SCHEDULE'], ['ROOF', 'PLAN'], ['DEMO FLOOR', 'PLAN'],
  ]) {
    const p = page(1, title, [item('501', 300, 500)]);
    const tb = titleBlocks([p])[0];
    assert.equal(tb.title, title.join(' '));
    assert.equal(tb.plan, false, title.join(' '));
    assert.equal(placed(p, rows('501')).summary.marks_placed, 0);
  }
});

test('title stacks stop at gaps, size changes, labels and neighboring columns', () => {
  for (const extra of [item('PLAN', 2350, 1560, 24), item('PLAN', 2350, 1508, 12),
    item('PLAN', 2100, 1508, 24), item('SHEET TITLE', 2350, 1508, 24)]) {
    const tb = titleBlocks([page(1, ['UPPER FLOOR'], [extra])])[0];
    assert.equal(tb.title, 'UPPER FLOOR');
    assert.equal(tb.plan, false);
  }
});

test('a scaled floor or enlarged view on a details sheet admits only its drawing', () => {
  for (const name of ['UPPER FLOOR PLAN', 'ENLARGED PLAN - SERVICE ANNEX']) {
    const p = page(1, ['SITE DETAILS'], [
      ...caption('NORTH ELEVATION', 150, 1450, '1/2" = 1\'-0"'), item('501', 400, 650),
      ...caption('ROOF PLAN', 1300, 600, '1/8" = 1\'-0"'), item('502', 1550, 300),
      ...caption(name, 1300, 1450), ...room('R5', 1560, 900), item('503', 1700, 1050),
      item('504', 1800, 1100, 12, 90), item('505', 2400, 1400),
      item('506', 1750, 1120), item('A', 1756, 1136), // stacked suffix inside plan
      item('507', 400, 750), item('A', 406, 766),   // stacked suffix in elevation
      item('999', 500, 700), item('998', 1900, 1100),
    ]);
    assert.equal(titleBlocks([p])[0].plan, false);
    const ds = rows('501', '502', '503', '504', '505', '506A', '507A');
    const r = placed(p, ds);
    assert.equal(r.sheets[0].plan_rule, 'drawing-title');
    assert.deepEqual(r.tags.map(t => t.mark), ['503', '506A']);
    assert.equal(r.rooms.length, 1);
    assert.deepEqual(r.sheets[0].points_per_foot, [18]);
    assert.ok([...r.tags, ...r.rooms].every(t => t.points_per_foot === 18), 'only the admitted drawing supplies its scale');
    const plan = readPlan([p], ds);
    assert.deepEqual(plan.unmatched_tags.map(t => t.tag), ['998']);
    assert.equal(plan.sheets[0].plan_rule, 'drawing-title');
  }
});

test('a plan reference, unscaled heading or non-floor caption is not a drawing plan', () => {
  for (const name of ['SEE ENLARGED FLOOR PLAN', 'FLOOR PLAN NOTES', 'REFLECTED CEILING PLAN',
    'ENLARGED ROOF PLAN', 'CODE PLAN', 'PHASING PLAN', 'KEY PLAN', 'MECHANICAL FLOOR PLAN', 'FLOOR PLAN SECTION']) {
    const p = page(1, ['DETAILS'], [...caption(name, 150, 1450), item('501', 400, 650)]);
    assert.equal(placed(p, rows('501')).summary.marks_placed, 0, name);
  }
  const p = page(1, ['DETAILS'], [item('ENLARGED FLOOR PLAN', 150, 1450, 16), item('501', 400, 650)]);
  assert.equal(readPlan([p], rows('501')).counts.plan_sheets, 0);
  for (const title of [['ENLARGED FLOOR PLAN', 'RCP'], ['PHASING', 'FLOOR PLAN'], ['FLOOR PLAN', 'NOTES']]) {
    const p = page(1, ['DETAILS'], [item(title[0], 150, 1400, 16),
      ...caption(title[1], 150, 1420), item('501', 400, 650)]);
    assert.equal(readPlan([p], rows('501')).counts.plan_sheets, 0, title.join(' '));
  }
});

test('a site construction drawing needs independent schedule tags, with demo views excluded', () => {
  const p = page(1, ['OVERALL SITE', 'DEMO AND CONSTRUCTION', 'PLANS'], [
    ...caption('KEY SITE CONSTRUCTION PLAN', 200, 1450, '1" = 60\'-0"'),
    ...caption('KEY SITE DEMO PLAN', 1500, 1450, '1" = 60\'-0"'),
    item('OH51', 500, 900), item('OH52', 750, 1000), item('OH53', 1750, 900),
  ]);
  assert.equal(titleBlocks([p])[0].plan, false);
  const r = placed(p, rows('OH51', 'OH52', 'OH53'));
  assert.equal(r.sheets[0].plan_rule, 'site-plan-tags');
  assert.deepEqual(r.tags.map(t => t.mark), ['OH51', 'OH52']);
  assert.equal(readPlan([p], []).counts.plan_sheets, 0);
  const roomOnly = page(1, ['SITE PLAN'], [...caption('SITE CONSTRUCTION PLAN', 200, 1450), ...room('501', 500, 900)]);
  assert.equal(readPlan([roomOnly], rows('501')).counts.plan_sheets, 0);
  const table = page(1, ['SITE PLAN'], [...caption('SITE CONSTRUCTION PLAN', 200, 1450),
    item('501', 500, 900), item('502', 500, 930)]);
  assert.equal(readPlan([table], [{ mark: '501', page: 1, y: 900 }, { mark: '502', page: 1, y: 930 }]).counts.plan_sheets, 0);
});

test('an unnamed building view requires separate schedule tags near at least two numbered rooms', () => {
  const labels = [...room('501', 1550, 950), ...room('502', 1850, 1000)];
  const tags = [item('501', 1500, 800), item('502', 1900, 850)];
  const drawings = [...caption('BUILDING ELEVATION', 150, 1450), item('501', 400, 650), item('502', 600, 650),
    ...caption('REFLECTED CEILING PLAN', 1300, 550),
    ...caption('SERVICE BUILDING', 1300, 1450)];
  const p = page(1, ['SERVICE BUILDING', 'DRAWINGS'], [...drawings, ...labels, ...tags]);
  const r = placed(p, rows('501', '502'));
  assert.equal(r.sheets[0].plan_rule, 'room-backed-tags');
  assert.equal(r.summary.marks_placed, 2);
  assert.ok(r.tags.every(t => t.x > 1300 && t.room));
  for (const [extra, ds] of [[labels, rows('501', '502')], [tags, rows('501', '502')],
    [[...labels, ...tags], rows('599')], [[...labels, tags[0]], rows('501', '502')],
    [[...labels, item('501', 1500, 600), item('502', 1900, 600)], rows('501', '502')]]) {
    assert.equal(readPlan([page(1, ['BUILDING DRAWINGS'], [...drawings, ...extra])], ds).counts.plan_sheets, 0);
  }
});

test('phasing/key readings and mechanical sheet numbers veto even otherwise affirmative drawing evidence', () => {
  const body = [...caption('UPPER FLOOR PLAN', 200, 1450), ...room('501', 500, 900),
    ...room('502', 800, 900), item('501', 450, 800), item('502', 850, 800)];
  for (const [sheet, title] of [['A-220.C', 'PHASING PLAN'], ['A-221.C', 'KEY PLAN'],
    ['A-222.C', 'DEMO FLOOR PLAN'], ['M-221', 'DUCTWORK PLAN'], ['M-222', 'HVAC PIPING PLAN'], ['G-221', 'CODE PLAN']]) {
    const r = readPlan([page(1, [title], body, sheet)], rows('501', '502'));
    assert.equal(r.counts.plan_sheets, 0, sheet + ' ' + title);
    assert.equal(r.tags.length, 0);
  }
});

test('new title readings retain every previously accepted legacy and extended plan', () => {
  const legacy = page(1, ['UPPER FLOOR PLAN'], [item('501', 300, 500)], 'A-220');
  const extended = page(2, ['DEMO PLAN & FLOOR PLAN'], [item('502', 500, 500)]);
  const before = titleBlocks([legacy, extended]);
  assert.deepEqual(before.map(t => t.plan_rule), ['legacy', 'extended-title']);
  const after = readPlan([legacy, extended, page(3, ['LOWER FLOOR', 'PLAN'])], rows('501', '502'));
  assert.deepEqual(after.sheets.slice(0, 2), before.map(({ block, ...tb }) => tb));
  assert.equal(after.tags.length, 2);
});
