// Cell readers of the door-schedule grid reader (assets/client-ocr-src/
// schedule-grid-extraction-client.mjs), checked against the values OCR
// actually returned for OCCDoorSchedulePg4.pdf on production (2026-10-07).
// A value that cannot be read unambiguously must come back null (left for
// the reviewer), never as an invented number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDoorMark, doorSize, parseThickness, cleanFireRating } from "../assets/client-ocr-src/schedule-grid-extraction-client.mjs";

test("door sizes in feet-inches are read, with or without the foot mark", () => {
  assert.deepEqual(doorSize("3'-0\"", "7'-0\""), { width_inches: 36, height_inches: 84 });
  assert.deepEqual(doorSize("3-0\"", "7-11\""), { width_inches: 36, height_inches: 95 });
  assert.deepEqual(doorSize("3'-8\"", "6'-10\""), { width_inches: 44, height_inches: 82 });
  assert.deepEqual(doorSize("10'-0\"", "7'-0\""), { width_inches: 120, height_inches: 84 });
  assert.deepEqual(doorSize("3' - 0\"", "7 - 0\""), { width_inches: 36, height_inches: 84 });
  assert.deepEqual(doorSize("3’-0”", "7’-0”"), { width_inches: 36, height_inches: 84 });
  assert.deepEqual(doorSize("3'-0\"", "7'-10 1/2\""), { width_inches: 36, height_inches: 94.5 });
});

test("OCR misreads stay unread instead of becoming sizes no door has", () => {
  // 7'-11" read as 711" was 71'-1"; 7211" was 721'-1"; 11" was 1'-1".
  assert.equal(doorSize("6-0\"", "711\"").height_inches, null);
  assert.equal(doorSize("3'-0\"", "7211\"").height_inches, null);
  assert.equal(doorSize("3'-0\"", "11\"").height_inches, null);
  assert.equal(doorSize("3-0\"", "v=11\"").height_inches, null);
  // 7'-0" read as 70" next to a feet-inches width: not 5'-10".
  assert.deepEqual(doorSize("4'-8\"", "70\""), { width_inches: 56, height_inches: null });
  assert.deepEqual(doorSize("2'\"", "614\""), { width_inches: null, height_inches: null });
  assert.equal(doorSize("3's\"", "7'-0\"").width_inches, null);
  assert.equal(doorSize("3'-0\"", "6'-14\"").height_inches, null);
});

test("plain inches count only when the row writes both dimensions that way", () => {
  assert.deepEqual(doorSize("36\"", "84\""), { width_inches: 36, height_inches: 84 });
  assert.deepEqual(doorSize("", "84\""), { width_inches: null, height_inches: null });
});

test("door thickness: the space lost in 1 3/4\" is restored, impossible values are dropped", () => {
  assert.equal(parseThickness("1 3/4\""), 1.75);
  assert.equal(parseThickness("13/4\""), 1.75);
  assert.equal(parseThickness("13/4"), 1.75);
  assert.equal(parseThickness("1 3/8\""), 1.375);
  assert.equal(parseThickness("2 1/4\""), 2.25);
  assert.equal(parseThickness("4 34\""), null); // was 82 inches
  assert.equal(parseThickness("4 214\""), null);
  assert.equal(parseThickness("1-3/4\""), 1.75);
  assert.equal(parseThickness("11/2\""), 1.5);
  assert.equal(parseThickness("2\""), 2);
  // a fraction is written reduced: 1 2/4" is a misread 1 3/4" (row cut by a revision cloud), not 1 1/2"
  assert.equal(parseThickness("1 2/4\""), null);
  assert.equal(parseThickness("1 3/5\""), null);
  assert.equal(parseThickness(null), null);
});

test("a dimension with an unreduced or odd fraction is not a dimension", () => {
  assert.equal(doorSize("3'-0\"", "7'-10 2/4\"").height_inches, null);
  assert.equal(doorSize("3'-0 1/2\"", "7'-0\"").width_inches, 36.5);
});

test("fire ratings: case, punctuation and the unit word normalised, the number kept as read", () => {
  assert.equal(cleanFireRating("20 MIN."), "20 MIN.");
  assert.equal(cleanFireRating("20 MIN,"), "20 MIN.");
  assert.equal(cleanFireRating("45 Min."), "45 MIN.");
  assert.equal(cleanFireRating("20 MIM."), "20 MIN.");
  assert.equal(cleanFireRating("20MIN"), "20 MIN.");
  assert.equal(cleanFireRating("60 M1N."), "60 MIN.");
  assert.equal(cleanFireRating("2U MIN."), "2U MIN.");
  assert.equal(cleanFireRating("NR"), "NR");
  assert.equal(cleanFireRating("1 HR"), "1 HR");
  assert.equal(cleanFireRating("45 MINUTES"), "45 MINUTES");
  assert.equal(cleanFireRating(""), null);
});

test("door marks: a short code with a digit; section rows and noise are not doors", () => {
  assert.equal(cleanDoorMark("053"), "053");
  assert.equal(cleanDoorMark("144a"), "144A");
  assert.equal(cleanDoorMark("| 228B"), "228B");
  assert.equal(cleanDoorMark("EXISTING"), null);
  assert.equal(cleanDoorMark("FIRST FLOOR"), null);
  assert.equal(cleanDoorMark(""), null);
});
