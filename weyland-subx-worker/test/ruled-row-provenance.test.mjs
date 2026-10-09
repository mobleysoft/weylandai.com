import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterLines, readDoorScheduleFromLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";

const xs = [20, 90, 220, 300, 380, 460];
const header = { y: 30, band: "table-a/header", values: ["MARK", "LOCATION", "WIDTH", "HEIGHT", "TYPE", "HW GROUP"] };
const first = { y: 50, band: "table-a/1", values: ["A07", "OFFICE", "3'-0\"", "7'-0\"", "A", "09"] };
const last = [
  { y: 90, band: "table-a/3", values: ["B12", "STAIR", "3'-0\"", "7'-0\"", "C", "01"] },
  { y: 110, band: "table-a/4", values: ["B14", "HALL", "3'-0\"", "7'-0\"", "A", "09"] },
];
function wordsOf(records, ruled = true) {
  return records.flatMap((r, index) => r.values.flatMap((str, c) => str ? [{
    str, x0: xs[c], x1: xs[c] + Math.min(str.length * 5, 90), yb: r.y, h: 10,
    item: `${index}-${c}`, itemX0: xs[c], itemX1: xs[c] + Math.min(str.length * 5, 90), conf: 95,
    ...(ruled ? { grid_row: r.band } : {}),
  }] : []));
}
async function parse(records, ruled = true) {
  return readDoorScheduleFromLines(clusterLines(wordsOf(records, ruled)), { width: 600, height: 500 });
}

test("ruled bands stay separate even with nearby baselines and interleaved side text", () => {
  const word = (str, x0, yb, band) => ({ str, x0, x1: x0 + 10, yb, h: 20, ...(band != null ? { grid_row: band } : {}) });
  const lines = clusterLines([
    word("A07", 10, 10, "table-a/1"), word("LEGEND", 50, 10),
    word("OFFICE", 100, 10, "table-a/1"), word("B12", 10, 11, "table-a/2"),
  ]);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.find(l => l.grid_row === "table-a/1").words.map(w => w.str), ["A07", "OFFICE"]);
  assert.equal(lines.find(l => l.grid_row === "table-a/2").text, "B12");
  assert.equal(lines.find(l => l.grid_row == null).text, "LEGEND");
});

for (const unread of ["", "|||"]) test(`a ruled row with ${unread ? "an invalid" : "a missing"} mark cannot overwrite the preceding door`, async () => {
  const result = await parse([header, first,
    { y: 70, band: "table-a/2", values: [unread, "SERVER", "4'-0\"", "8'-0\"", "B", "04"] },
    { y: 76, band: "table-a/2", values: ["", "NORTH", "", "", "", ""] },
    ...last,
  ]);
  assert.deepEqual(result.doors.map(d => d.door_number), ["A07", "B12", "B14"]);
  const door = result.doors[0];
  assert.equal(door.remarks, "Room: OFFICE");
  assert.equal(door.width_inches, 36);
  assert.equal(door.height_inches, 84);
  assert.equal(door.door_type, "A");
  assert.equal(door.hardware_group, "09");
  assert.equal(result.tables[0].rows, 4, "the unread physical row is retained for review");
  assert.deepEqual(result.unresolved_rows, [{ grid_row: "table-a/2", source_row: 1, source_y: 70, mark_text: unread, reason: "unread_mark" }]);
  assert.equal(result.doors[1].source_row, 2, "citations retain the physical row ordinal");
});

test("wrapped text within the same ruled row continues that door", async () => {
  const result = await parse([header, first,
    { y: 60, band: "table-a/1", values: ["", "NORTH", "", "", "", ""] },
    ...last,
  ]);
  assert.deepEqual(result.doors.map(d => d.door_number), ["A07", "B12", "B14"]);
  assert.equal(result.doors[0].remarks, "Room: OFFICE NORTH");
  assert.deepEqual(result.unresolved_rows, []);
});

test("a mark recognized on a later line in the same ruled row resolves that row", async () => {
  const result = await parse([header,
    { ...first, values: ["|||", ...first.values.slice(1)] },
    { y: 60, band: "table-a/1", values: ["A07", "", "", "", "", ""] },
    ...last,
  ]);
  assert.deepEqual(result.doors.map(d => d.door_number), ["A07", "B12", "B14"]);
  assert.equal(result.doors[0].remarks, "Room: OFFICE");
  assert.deepEqual(result.unresolved_rows, []);
});

test("unruled vector text retains its existing wrapped-cell behavior", async () => {
  const result = await parse([header, first,
    { y: 60, band: "unused", values: ["", "NORTH", "", "", "", ""] },
    ...last,
  ], false);
  assert.deepEqual(result.doors.map(d => d.door_number), ["A07", "B12", "B14"]);
  assert.equal(result.doors[0].remarks, "Room: OFFICE NORTH");
  assert.equal(result.tables[0].rows, 3);
  assert.deepEqual(result.unresolved_rows, []);
});

test("actual duplicate marks in different physical rows remain separate", async () => {
  const result = await parse([header, first,
    { y: 70, band: "table-a/2", values: ["A07", "SERVER", "4'-0\"", "8'-0\"", "B", "04"] },
    ...last,
  ]);
  assert.deepEqual(result.doors.map(d => d.door_number), ["A07", "A07", "B12", "B14"]);
  assert.equal(result.doors[0].remarks, "Room: OFFICE");
  assert.equal(result.doors[1].remarks, "Room: SERVER");
  assert.equal(result.doors[1].width_inches, 48);
  assert.deepEqual(result.unresolved_rows, []);
});
