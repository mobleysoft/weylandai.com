// node --test weyland-shared/plan-read.test.mjs
//
// The floor-plan reader (plan-read.js) on a drawn sheet shaped like Rockford's A1.1 and
// Berryessa's A2.1: the title block names the sheet, room names sit over room numbers, door
// tags equal schedule marks. The real sets are checked by tools/plan-extract/plan_read.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPlan, titleBlocks, lines } from "./plan-read.js";

const W = 3024, H = 2160;
const it = (str, x, y, h = 10.5, rot = 0) => ({ str, x, y, h, w: str.length * h * 0.6, rot });
const titleBlock = (sheet, title) => [
  it("ROCKFORD PUBLIC SCHOOLS DISTRICT #205", 2927, 1648, 41.5, -90),
  it("CARLSON ELEMENTARY SCHOOL", 2875, 1648, 21, -90),
  it(sheet, 2973, 2092, 28, -90),
  it("SHEET NUMBER", 2940, 2106, 14, -90),
  it(title, 2635, 2118, 21),
];
const page = (n, items) => ({ page: n, width: W, height: H, items });
const plan = page(26, [
  ...titleBlock("A1.1", "1ST FLOOR PLAN"),
  it("FLEX RM", 1237, 973), it("131", 1247, 992),
  it("BULL PEN", 1271, 1210), it("127", 1283, 1230),
  it('CORR "I"', 1754, 897), it("126", 1762, 917),
  it("131.1", 1316, 1128), it("127.1", 1263, 1305),
  it("999.9", 1500, 1500),            // a tag drawn like the others that no mark names
  it("SCALE:", 1330, 1934, 9.5), it('3/32"', 1373, 1933.4), it("1'-0\"", 1411, 1933.4),
]);
const demo = page(25, [...titleBlock("A0.1", "1ST FLOOR PLAN - DEMOLITION"), it("131.1", 900, 900)]);
const sched = page(29, [...titleBlock("A2.2", "OPENING SCHEDULES, TYPES AND DETAILS"), it("131.1", 100, 300), it("127.1", 100, 320)]);
const spec = { page: 3, width: 612, height: 792, items: [it("DOOR HARDWARE", 72, 72)] };
const finish = page(28, [...titleBlock("A2.1", "FINISH SCHEDULE & DETAILS")]);
const pages = [spec, demo, plan, finish, sched];
const doors = [{ mark: "131.1", location: null, page: 29 }, { mark: "127.1", location: null, page: 29 }, { mark: "126.1.2", location: null, page: 29 }];

test("title blocks: sheet number and title, owner and project lines are not titles", () => {
  const tb = titleBlocks(pages);
  const p26 = tb.find((t) => t.page === 26);
  assert.equal(p26.sheet, "A1.1");
  assert.equal(p26.title, "1ST FLOOR PLAN");
  assert.equal(p26.plan, true);
  assert.equal(tb.find((t) => t.page === 25).plan, false, "a demolition plan is not the floor plan");
  assert.equal(tb.find((t) => t.page === 28).plan, false);
  assert.equal(tb.find((t) => t.page === 3).sheet, null, "a spec page has no title block");
});

test("rooms from labels, tags tied to marks, the room each door opens into", () => {
  const r = readPlan(pages, doors);
  assert.deepEqual(r.plan_sheets.map((s) => s.sheet), ["A1.1"]);
  assert.deepEqual(r.plan_sheets[0].points_per_foot, [6.75], "3/32\" = 1'-0\" is 6.75 points a foot");
  const rooms = Object.fromEntries(r.rooms.map((x) => [x.number, x]));
  assert.equal(rooms["131"].name, "FLEX RM");
  assert.equal(rooms["126"].corridor, true);
  const t = r.tags.find((g) => g.mark === "131.1");
  assert.equal(t.sheet, "A1.1");
  assert.equal(t.room, "131", "131.1 is in room 131, though the label of room 127 is nearer");
  assert.equal(t.room_by, "tag_number");
  assert.equal(r.tags.find((g) => g.mark === "127.1").room, "127");
  assert.deepEqual(r.unmatched_tags.map((u) => u.tag), ["999.9"]);
  assert.deepEqual(r.marks_not_on_plan.map((m) => m.mark), ["126.1.2"]);
});

test("a location naming an area on the plan: A-POD / CORRIDOR", () => {
  const p = page(283, [
    ...titleBlock("A2.1", "FLOOR PLAN - MAIN BUILDING"),
    it("CLASSROOM", 1383, 1680), it("A1", 1412, 1692, 7.9),
    it("LOBBY", 1296, 1412), it("112", 1307, 1424, 7.9),
    it("B-POD", 827, 1658),
    it("002", 1365, 1508, 9.4), it("003", 850, 1600, 9.4),
  ]);
  const r = readPlan([p], [{ mark: "002", location: "A-POD CLASSROOM A1", page: 284 }, { mark: "003", location: "B-POD / CORRIDOR", page: 284 }]);
  assert.equal(r.tags.find((g) => g.mark === "002").room, "A1");
  const t3 = r.tags.find((g) => g.mark === "003");
  assert.equal(t3.room_name, "B-POD");
  assert.equal(t3.room_by, "schedule_location");
});

test("lines: a scale split over two text sizes and a point of baseline jitter joins", () => {
  const ls = lines([it("SCALE:", 1330, 1934, 9.5), it('3/32"', 1373, 1933.4), it("1'-0\"", 1411, 1933.4), it("1", 1301, 1930.7, 21)], 4, 1.6);
  assert.ok(ls.some((l) => /SCALE: 3\/32" 1'-0"/.test(l.str)), ls.map((l) => l.str).join(" | "));
});

test("a mark SubX keeps apart by page (\"001 [p.286]\") matches the plan's \"001\" on that school's sheet", () => {
  const school = (n, name) => page(n, [it(name + " ELEMENTARY SCHOOL", 2929, 1771, 18.9, -90), it("A2.1", 2854, 2097, 34.6), it("FLOOR PLAN - MAIN BUILDING", 2815, 1770, 22, -90), it("001", 1449, 1506, 9.4)]);
  const sch = (n, name) => page(n, [it(name + " ELEMENTARY SCHOOL", 2929, 1771, 18.9, -90), it("A9.2", 2854, 2097, 34.6), it("DOOR SCHEDULE AND DETAILS", 2815, 1770, 22, -90)]);
  const r = readPlan([school(283, "MAJESTIC WAY"), sch(284, "MAJESTIC WAY"), school(285, "BROOKTREE"), sch(286, "BROOKTREE")],
    [{ mark: "001", location: null, page: 284 }, { mark: "001 [p.286]", location: null, page: 286 }]);
  assert.deepEqual(r.tags.map((t) => [t.mark, t.page]).sort((a, b) => a[1] - b[1]), [["001", 283], ["001 [p.286]", 285]]);
  assert.equal(r.marks_not_on_plan.length, 0);
});

// g041: T2507-style sets number doors by room and letter (schedule 113A, 113B) and draw each tag
// as the room number with its letter stacked under it: two items on two baselines.
test("g041: a suffixed mark is placed on a stacked number-and-letter tag, nowhere else", () => {
  const sheet = page(7, [
    ...titleBlock("A-100", "FIRST FLOOR PLAN"),
    it("CLASSROOM", 1200, 950), it("113", 1210, 968),          // the room label
    it("113", 1400, 1000, 7.8), it("A", 1404, 1012, 7.8),      // door 113A: number over letter
    it("113", 1600, 1000, 7.8), it("B", 1604, 989, 7.8),       // door 113B: letter above
    it("120", 1800, 1000, 7.8), it("A", 1900, 1012, 7.8),      // a letter far off: not 120A's tag
    it("130A", 2000, 1000, 7.8), it("130", 2100, 1000, 7.8), it("A", 2104, 1012, 7.8), // exact tag wins
    it("C", 1404, 1030, 7.8),                                   // 113C: no stacked C close enough
  ]);
  const sch = page(10, [...titleBlock("A-103", "DOOR SCHEDULE")]);
  const ds = ["113A", "113B", "120A", "130A", "113C"].map((mark) => ({ mark, location: null, page: 10 }));
  const r = readPlan([sheet, sch], ds);
  const by = Object.fromEntries(r.tags.map((g) => [g.mark, g]));
  assert.ok(by["113A"] && by["113B"], "113A and 113B placed");
  assert.equal(by["113A"].matched_by, "stacked: 113 with A");
  assert.ok(Math.abs(by["113A"].x - 1404) < 12, "113A at its own symbol, not the room label");
  assert.ok(by["113B"].x > 1590 && by["113B"].x < 1620, "113B at the symbol with B above");
  assert.equal(by["130A"].matched_by, undefined, "an exact 130A tag wins over a stacked pair");
  assert.equal(by["130A"].x, Math.round(2000 + (4 * 7.8 * 0.6) / 2));
  assert.equal(by["120A"], undefined, "a letter 100 points away is not a stacked tag");
  assert.equal(by["113C"], undefined, "a C 30 points under 113 is too far");
  assert.deepEqual(r.marks_not_on_plan.map((m) => m.mark).sort(), ["113C", "120A"]);
});

test("g041: one letter item serves one tag, and plain marks are unaffected", () => {
  const sheet = page(7, [
    ...titleBlock("A-100", "FIRST FLOOR PLAN"),
    it("140", 1400, 1000, 7.8), it("140", 1402, 1024, 7.8), it("A", 1404, 1012, 7.8), // one A between two 140s
    it("150", 1600, 1000, 7.8),
  ]);
  const sch = page(10, [...titleBlock("A-103", "DOOR SCHEDULE")]);
  const ds = [{ mark: "140A", page: 10 }, { mark: "150", page: 10 }, { mark: "1A", page: 10 }];
  const r = readPlan([sheet, sch], ds);
  assert.equal(r.tags.filter((g) => g.mark === "140A").length, 1);
  assert.equal(r.tags.find((g) => g.mark === "150").matched_by, undefined);
  assert.equal(r.tags.find((g) => g.mark === "1A"), undefined, "no item reads 1");
});
