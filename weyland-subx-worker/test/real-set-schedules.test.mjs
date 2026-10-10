// g046: door schedules of real harvested bid sets that reader A read as 0 rows, frozen as the
// text-layer lines the production reader sees (tools/accuracy/g046/extract-lines.mjs). Hand counts
// are from the rendered sheets (tools/accuracy/g046/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorScheduleFromLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL("./fixtures/" + name, import.meta.url), "utf8"));
const read = async (name) => { const f = fixture(name); return readDoorScheduleFromLines(f.lines, { width: f.width, height: f.height }, {}); };

test("T2502 A-700: a hardware-set list printed beside DOOR SCHEDULE does not rename the table (9 of 9)", async () => {
  const r = await read("g046-t2502-a700-lines.json");
  assert.ok(r, "the door schedule is found");
  assert.equal(r.tables[0].title, "DOOR SCHEDULE");
  assert.deepEqual(r.doors.map((d) => d.door_number), ["001", "002", "003", "004", "OH01", "OH02", "OH03", "OH04", "SE01"]);
  const by = Object.fromEntries(r.doors.map((d) => [d.door_number, d]));
  assert.equal(by["002"].width_inches, 36); assert.equal(by["002"].height_inches, 84);
  assert.equal(by["OH01"].width_inches, 192); assert.equal(by["OH01"].height_inches, 144);
  assert.equal(by["001"].width_inches ?? null, null, "an unequal pair (3'-0\"/2'-6\") keeps no guessed width");
});

test("T2423 A-601: a Door Number header over two sub-columns (112 | A) reads as one mark (3 of 3)", async () => {
  const r = await read("g046-t2423-a601-lines.json");
  assert.ok(r);
  assert.deepEqual(r.doors.map((d) => d.door_number), ["112A", "114B", "114C"]);
  assert.deepEqual(r.doors.map((d) => [d.width_inches, d.height_inches]), [[168, 168], [72, 84], [36, 84]]);
});

// g048: rows lost at a table's end or after a two-line remark (g042 class C4). Eye counts from the
// rendered pages, tools/accuracy/g042/spot-checks.md.
import { clusterLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";

test("T2147 A601: rows after two-line remarks are kept (16 of 16, not 2)", async () => {
  const r = await read("g048-t2147-a601-lines.json");
  assert.deepEqual(r.doors.map((d) => d.door_number), ["129C", "160", "161", "162", "163", "164", "165A", "165B", "166", "167A", "167B", "168A", "168B", "169A", "169B", "169C"]);
});

test("C2512 A-501: a tall sheet number beside the last row does not merge rows 173.3 and 176 (75 of 75)", async () => {
  const f = fixture("g048-c2512-a501-words.json");
  const lines = clusterLines(f.words);
  assert.ok(!lines.some((L) => /173\.3 176\b/.test(L.text)), "173.3 and 176 stay on their own lines");
  const r = await readDoorScheduleFromLines(lines, { width: f.width, height: f.height }, {});
  assert.equal(r.doors.length, 75);
  assert.deepEqual(r.doors.slice(-3).map((d) => d.door_number), ["173.2", "173.3", "176"]);
});

test("T2504 A-601: a note sharing the title's band does not rename DOOR AND FRAME SCHEDULE (22 of 22)", async () => {
  const r = await read("g048-t2504-a601-lines.json");
  assert.equal(r.tables[0].title, "DOOR AND FRAME SCHEDULE");
  assert.equal(r.doors.length, 22);
});

// g049: column shifts (g042 class C2). Values as printed on the rendered pages.
const doorOf = (r, mark, i = 0) => r.doors.filter((d) => d.door_number === mark)[i];

test("T2504 A-601: JAMB, RATING and HARDWARE SETS each read in their own column; PR widths read", async () => {
  const r = await read("g048-t2504-a601-lines.json");
  const d100 = doorOf(r, "100"), d101 = doorOf(r, "101");
  assert.deepEqual([d100.jamb_detail, d100.fire_rating ?? null, d100.hardware_group, d100.width_inches, d100.pair], ["J4", null, "09", 36, true]);
  assert.deepEqual([d101.jamb_detail, d101.fire_rating, d101.hardware_group], ["J1", "90 MIN.", "04"]);
  assert.equal(r.doors.filter((d) => d.width_inches && d.height_inches).length, 22);
  assert.equal(r.doors.filter((d) => d.hardware_group).length, 22);
});

test("T2147 A601/A602: sizes under a nested SIZE header, and offset lines with their own row", async () => {
  const p42 = await read("g048-t2147-a601-lines.json"), p43 = await read("g049-t2147-a602-lines.json");
  const c = doorOf(p42, "129C"), d = doorOf(p42, "160");
  assert.deepEqual([c.width_inches, c.height_inches, c.head_detail, c.jamb_detail, c.hardware_group], [36, 84, "10/A601", "1/A501", "5"]);
  assert.deepEqual([d.head_detail, d.jamb_detail, d.hardware_group], ["1/A601", "5/A601", "2"]);
  assert.deepEqual([doorOf(p43, "102A").width_inches, doorOf(p43, "102A").height_inches], [144, 168]);
  assert.equal(p42.doors.filter((x) => x.width_inches && x.height_inches).length + p43.doors.filter((x) => x.width_inches && x.height_inches).length, 29);
});

test("R2502 A-122: PT101, a one-row table, reads each field in its own column", async () => {
  const d = doorOf(await read("g049-r2502-a122-lines.json"), "PT101");
  assert.deepEqual([d.door_type, d.width_inches, d.height_inches, d.frame_type, d.head_detail, d.jamb_detail, d.sill_detail, d.fire_rating ?? null, d.hardware_group],
    ["HM-1(PR)", 96, 88, "TYP-1", "3/A-602", "6/A-602", "8/A-602", null, "09.08"]);
});

test("X2530 A-101: comments stay out of the hardware set and keep their last word", async () => {
  const d = doorOf(await read("g049-x2530-a101-lines.json"), "100-1");
  assert.equal(d.hardware_group, "1");
  assert.match(d.remarks, /^REQUIRED: FIRE RATED LOUVER/);
});

test("T2507 A-103: WD | HGT under SIZE read as width and height; the empty SET NO. stays empty", async () => {
  const r = await read("g049-t2507-a103-lines.json");
  assert.equal(r.doors.length, 49);
  assert.equal(r.doors.filter((d) => d.width_inches && d.height_inches).length, 49);
  assert.deepEqual(r.doors.filter((d) => d.door_number === "132A").map((d) => [d.width_inches, d.height_inches]), [[66, 84], [75, 84]]);
  const d = doorOf(r, "100A");
  assert.deepEqual([d.door_type, d.frame_type, d.hardware_group ?? null], ["EXIST", "EXIST", null]);
});

// g050: rows that stand for several openings (g042 class C3): a range or a stack of marks over two
// to four lines around the row's one data line, with a QUANTITY column. Eye truth from the rendered
// sheets (tools/accuracy/g050/README.md): 16 rows standing for 520 doors on each sheet.
import { readMarkList } from "../assets/client-ocr-src/schedule-text-layer.mjs";

for (const [name, fx, expect] of [
  ["C2410 A-601", "g050-c2410-a601-lines.json", [
    ...[1, 2, 3, 4].flatMap((u) => [[u + "A101", [u + "A101", u + "D102"], 8], [u + "A103", [u + "A103", u + "D116"], 56], [u + "A201", [u + "A201", u + "D216"], 64]]),
    ["151A", ["151A", "151B", "151C"], 3], ["256", null, 1], ["258A", ["258A", "258B"], 2], ["259A", ["259A", "259B"], 2]]],
  ["C2410 addendum A-601", "g050-c2410add-a601-lines.json", [
    ["1A101", ["1A101", "1D116"], 48], ["1A105", ["1A105", "1A116", "1B109", "1B116"], 16], ["1A201", ["1A201", "1D216"], 64],
    ["2A101", ["2A101", "2D116"], 56], ["2A109", ["2A109", "2A112", "2B109", "2B112"], 8], ["2A201", ["2A201", "2D216"], 64],
    ["3A101", ["3A101", "3D116"], 60], ["3A109", ["3A109", "3A112"], 4], ["3A201", ["3A201", "3D216"], 64],
    ["4A101", ["4A101", "4D116"], 60], ["4B109", ["4B109", "4B112"], 4], ["4A201", ["4A201", "4D216"], 64],
    ["151A", ["151A", "151B", "151C"], 3], ["256", null, 1], ["258A", ["258A", "258B"], 2], ["259A", ["259A", "259B"], 2]]],
]) {
  test(name + ": range and stacked-mark rows are one row each, with QUANTITY (16 rows, 520 doors)", async () => {
    const r = await read(fx);
    assert.deepEqual(r.doors.map((d) => [d.door_number, d.marks || null, d.quantity]), expect);
    assert.equal(r.doors.reduce((n, d) => n + d.quantity, 0), 520);
    for (const d of r.doors) assert.ok(d.width_inches && d.height_inches && d.door_type && d.hardware_group, d.door_number + " keeps its data");
  });
}

test("readMarkList: ranges, stacks, & lists and a split end mark", () => {
  assert.deepEqual(readMarkList("1A101 TO 1D102"), { marks: ["1A101", "1D102"], ranges: [{ from: "1A101", to: "1D102" }] });
  assert.deepEqual(readMarkList("151A 151B 151C"), { marks: ["151A", "151B", "151C"], ranges: [] });
  assert.deepEqual(readMarkList("2A109 TO 2A112 & 2B109 TO 2B112").ranges, [{ from: "2A109", to: "2A112" }, { from: "2B109", to: "2B112" }]);
  assert.deepEqual(readMarkList("3A109 TO 3A 112").marks, ["3A109", "3A112"]);
  assert.equal(readMarkList("101"), null);
  assert.equal(readMarkList("101 SEE NOTE"), null);
});

// g051 (class C5): electrical and mechanical equipment schedules are not door schedules. On main these
// read as door rows: X2410 E-sheet FEEDER SCHEDULE (feeders F1-F4, "PVC" as a door type, 7 rows) and
// T2232 KITCHEN HOOD SCHEDULE (KEH1, 2 rows); both readers agreed on the feeders.
import { classifyLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";
for (const [name, fx] of [["X2410 FEEDER SCHEDULE", "g051-x2410-feeder-lines.json"], ["T2232 KITCHEN HOOD SCHEDULE", "g051-t2232-hood-lines.json"]]) {
  test(name + " is not a door schedule: no door rows, and the page finder passes it by", async () => {
    const f = fixture(fx);
    const r = await readDoorScheduleFromLines(f.lines, { width: f.width, height: f.height }, {});
    assert.equal(r ? r.doors.length : 0, 0);
    const c = await classifyLines(f.lines, { width: f.width, height: f.height });
    assert.equal(c.door_schedule, null);
  });
}
