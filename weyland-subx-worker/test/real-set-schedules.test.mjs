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
