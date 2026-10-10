// node --test tools/accuracy/g057/reader-b.test.mjs
// g057 (class C6): reader B reads the door schedules with stacked and rotated headers on mixed
// Missouri OA sheets. Fixtures: each schedule's items and rules cropped to it
// (tools/accuracy/g047/extract-page.mjs). Eye counts from the renders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB, wordsOf } from "../truth/reader_b.mjs";

const read = (name) => { const f = JSON.parse(readFileSync(new URL("./fixtures/" + name + ".json", import.meta.url), "utf8")); return readDoorsB(f.items, f.rules, { width: f.width, height: f.height }); };

test("T2421-01 A-300 p.3: the header's top rule is the sheet's; 33 rows, NO. the mark column, 101 to 128A without 120 or 125", () => {
  const b = read("t2421-a300-p3");
  const marks = b.doors.map((d) => d.mark);
  assert.equal(marks.length, 33);
  assert.equal(marks[0], "101");
  assert.equal(marks[marks.length - 1], "128A");
  assert.ok(!marks.includes("120") && !marks.includes("125"));
  const t = b.tables[0];
  assert.deepEqual([t.header[0], t.fields[0]], ["NO", "mark"]);
  assert.ok(t.fields.includes("size") && t.fields.includes("hardware_group"), JSON.stringify(t.fields));
});

test("C2419-01 A601 p.7: rotated column headers name the columns; 104A, 104B, 116B, 123A", () => {
  const b = read("c2419-a601-p7");
  assert.deepEqual(b.doors.map((d) => d.mark), ["104A", "104B", "116B", "123A"]);
  assert.deepEqual(b.doors.map((d) => [d.width_inches, d.height_inches]), [[36, 84], [36, 84], [36, 84], [42, 84]]);
  assert.ok(b.tables[0].header[0].includes("Number"));
});

test("W2501-01 p.8: rotated headers, 11 rows (the render's count), hardware sets read", () => {
  const b = read("w2501-p8");
  assert.deepEqual(b.doors.map((d) => d.mark), ["100A", "100B", "101", "102", "105", "106", "107", "109", "201", "202", "203"]);
  assert.deepEqual(b.doors.map((d) => d.hardware_group), ["1", "2", "3", "7", "4", "4", "4", "5", "6", "6", "6"]);
});

test("a rotated word names a column but never fills a body cell", () => {
  const ws = wordsOf([{ str: "Number", x: 100, y: 200, w: 30, h: 9, rot: -90 }, { str: "104A", x: 95, y: 260, w: 18, h: 9 }]);
  const r = ws.find((w) => w.str === "Number");
  assert.equal(r.rot, true);
  assert.ok(r.cy > 170 && r.cy < 200 && r.cx > 90 && r.cx <= 100, JSON.stringify(r));
});
