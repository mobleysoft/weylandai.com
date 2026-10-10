// node --test tools/accuracy/g064/reader-b.test.mjs
// g064: reader B over-counted X2404-01 (6e7e2d2bf65c383b, 70ab5446590e40cc) at 12 rows: the 8 doors of
// A601 (p.81, 100A to 107A) plus 4 diffusers (C3, I1, R1, R2) from p.97's air-device schedule, whose
// TAG maps to a mark and FACE SIZE WIDTH / HEIGHT to a door size. A mechanical equipment header
// (CFM, AIRFLOW, THROW, DAMPER ...) is not a door table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB, panelHeader } from "../truth/reader_b.mjs";

const read = (name) => { const f = JSON.parse(readFileSync(new URL("./fixtures/" + name + ".json", import.meta.url), "utf8")); return readDoorsB(f.items, f.rules, { width: f.width, height: f.height }); };

test("X2404-01 A601 p.81: the 8 doors of the sheet, 100A to 107A", () => {
  assert.deepEqual(read("x2404-a601-p81").doors.map((d) => d.mark), ["100A", "101A", "102A", "103A", "104A", "105A", "106A", "107A"]);
});

test("X2404-01 p.97: the air-device schedule gives no door rows", () => {
  const b = read("x2404-p97-air-devices");
  assert.equal(b.doors.length, 0);
  assert.equal(b.tables.length, 0);
});

test("equipment headers and door headers", () => {
  assert.equal(panelHeader(["TAG", "TYPE", "FACE SIZE WIDTH", "FACE SIZE HEIGHT", "MAX. AIRFLOW", "THROW 150 FPM", "DAMPER", "REMARKS"]), true);
  assert.equal(panelHeader(["MARK", "MODEL", "CFM", "ESP", "HP", "VOLTS"]), true);
  for (const h of [
    ["DOOR NUMBER", "DOOR SIZE WIDTH", "DOOR SIZE HEIGHT", "DOOR TYPE", "FRAME TYPE", "FIRE RATING", "HARDWARE HARDWARE GROUP", "REMARKS"],
    ["ROOM", "NAME", "MARK", "DOOR SIZE WD", "DOOR SIZE HGT", "DOOR MATL", "SET NO.", "NOTES"],
    ["NO", "DOOR SIZE", "DOOR ELEV", "RATING", "HARDWARE SET", "CARD READER", "CLEARANCE X", "REMARKS"],
  ]) assert.equal(panelHeader(h), false, h.join(" | "));
});
