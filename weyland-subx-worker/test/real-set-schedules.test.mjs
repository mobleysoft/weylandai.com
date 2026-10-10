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
