// node --test tools/accuracy/truth/reader_b.test.mjs
// g047: reader B reads ruled door schedules whose header dividers are short rules of their own
// (or thin filled bars a point off the body's stroked lines). Fixtures: one schedule each, its text
// items and ruled lines cropped to its box (tools/accuracy/g047/extract-page.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB } from "./reader_b.mjs";

const fx = (name) => JSON.parse(readFileSync(new URL("../g047/fixtures/" + name + ".json", import.meta.url), "utf8"));
const read = (name) => { const f = fx(name); return readDoorsB(f.items, f.rules, { width: f.width, height: f.height }); };

// Eye counts on the rendered pages (the goal's bar: B within two rows of each).
for (const [name, eye, first, fields] of [
  ["eefa018e007e581f-p59", 84, "100-1", ["mark", "width", "height", "hardware_group"]],
  ["7239a04e6cc8b502-p63", 75, null, ["mark", "location", "width", "height", "hardware_group"]],
  ["21d60f1b54e0e3df-p78", 19, "101.1A", ["mark", "fire_rating", "width", "height", "door_type", "hardware_group"]],
  ["44111d93bd635936-p17", 44, "C105.1", ["mark", "width", "height", "door_type", "hardware_group"]],
]) {
  test(name + ": the header band is read as a header, " + eye + " rows", () => {
    const b = read(name);
    assert.ok(Math.abs(b.doors.length - eye) <= 2, "rows " + b.doors.length + " vs eye " + eye);
    for (const t of b.tables) for (const f of fields) assert.ok(t.fields.includes(f), name + " lacks " + f + ": " + JSON.stringify(t.fields));
    if (first) assert.equal(b.doors[0].mark, first);
  });
}

test("a title band (no fence crossing it) still never names a column", () => {
  const b = read("eefa018e007e581f-p59");
  for (const t of b.tables) assert.ok(!t.header.some((h) => /SCHEDULE/.test(h)), JSON.stringify(t.header));
});
