// node --test tools/accuracy/g060/reader-b.test.mjs
// g060: reader B on T2507-01 A-103 (192a16af8f31ae0c p.10). The sheet prints the room number in
// ROOM and only the letter in MARK (ROOM 100 | NAME CAN WASH | MARK A); the opening's mark is the two
// together, 100A, as reader A and the plans read it. Render count 2026-10-09: 49 rows, two of them
// 132A (two openings sharing a tag).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB } from "../truth/reader_b.mjs";

const f = JSON.parse(readFileSync(new URL("./fixtures/t2507-a103-p10.json", import.meta.url), "utf8"));

test("T2507-01 A-103: 49 rows, the mark is ROOM + MARK, both 132A rows kept", () => {
  const b = readDoorsB(f.items, f.rules, { width: f.width, height: f.height });
  const marks = b.doors.map((d) => d.mark);
  assert.equal(marks.length, 49);
  assert.deepEqual(marks.slice(0, 4), ["100A", "101A", "102A", "103A"]);
  assert.equal(marks.filter((m) => m === "132A").length, 2);
  assert.ok(marks.includes("113B") && marks.includes("141B"));
  assert.equal(marks[marks.length - 1], "143A");
  assert.deepEqual([b.doors[0].width_inches, b.doors[0].height_inches], [36, 84]);
});
