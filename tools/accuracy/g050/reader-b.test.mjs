// node --test tools/accuracy/g050/reader-b.test.mjs
// g050: reader B reads a range or stacked-mark row (one band, one QUANTITY) as one row, its marks
// listed. Fixtures: the five schedules of each sheet, items and ruled lines cropped to them
// (tools/accuracy/g050/extract-page.mjs). Eye truth: 16 rows standing for 520 doors on each.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB } from "../truth/reader_b.mjs";

const read = (name) => { const f = JSON.parse(readFileSync(new URL("./fixtures/" + name + ".json", import.meta.url), "utf8")); return readDoorsB(f.items, f.rules, { width: f.width, height: f.height }); };

for (const [name, ranges] of [
  ["3506f831094dd516-p12", ["1A101", "1D102", "1A103", "1D116", "1A201", "1D216"]],
  ["194733de48af8797-p45", ["1A101", "1D116", "1A105", "1A116", "1B109", "1B116", "1A201", "1D216"]],
]) {
  test(name + ": 16 rows standing for 520 doors, ranges and stacks kept whole", () => {
    const b = read(name);
    assert.equal(b.doors.length, 16);
    assert.equal(b.doors.reduce((n, d) => n + d.quantity, 0), 520);
    assert.deepEqual(b.doors.slice(0, 3).flatMap((d) => d.marks), ranges);
    const alt = b.doors.slice(-4);
    assert.deepEqual(alt.map((d) => [d.mark, d.marks || null, d.quantity]), [["151A", ["151A", "151B", "151C"], 3], ["256", null, 1], ["258A", ["258A", "258B"], 2], ["259A", ["259A", "259B"], 2]]);
    for (const t of b.tables) assert.ok(t.fields.includes("quantity"), JSON.stringify(t.fields));
  });
}
