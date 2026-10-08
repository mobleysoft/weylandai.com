// node --test test/classify.test.mjs
// Regression set: the 7 October audit documents, as text the OCR worker
// returns (test/fixtures, made by ocr-worker/extract.js in node), with the
// flags the auditors and I read off the pages by eye.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyInspection, classifySafety, classifySurvey, parseSpecSections, parseSheetIndex } from "../src/lib/classify.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(here, "fixtures", name), "utf8")).pages;
const expectEach = (flagged, patterns) => {
  const missing = patterns.filter((re) => !flagged.some((f) => re.test(f.line)));
  assert.deepEqual(missing.map(String), [], "missed: " + missing.map(String).join(", "));
};
const show = (label, r, key) => console.log("  " + label + ": " + r[key] + " flagged, " + r.clearCount + " clear; pages " + [...new Set(r.flagged.map((f) => f.page))].join(","));

test("InspecX on the FCMAT FIT inspection (9 pages, 2 text-layer, 7 OCR)", () => {
  const r = classifyInspection(fixture("fcmat.json"));
  show("fcmat", r, "failCount");
  for (const f of r.flagged) console.log("    p" + f.page + " [" + f.terms.join("|") + "] " + f.line.slice(0, 110));
  // The letter (pages 1-2) and the FIT comments (page 7), read by eye by the auditor.
  expectEach(r.flagged, [/light.?sensor .*cover|sensor cover/i, /desk .*broken shelf|broken shelf/i, /leaking/i, /out of service/i, /fountain .*not working/i]);
  assert.ok(r.flagged.every((f) => !/Marks: OK = Good Repair/i.test(f.line)), "legend flagged");
  assert.ok(r.flagged.every((f) => !/Deficiencies Noted in Prior Year/i.test(f.line)), "form heading flagged");
  assert.ok(r.failCount >= 5 && r.failCount <= 40, "flag count " + r.failCount);
});

test("SafetyX on the WA FACE fatality narrative (1 page)", () => {
  const r = classifySafety(fixture("wa-face.json"));
  show("wa-face", r, "incidentCount");
  expectEach(r.flagged, [/died/i, /Fall protection was not|not used/i, /trigger height/i, /lost (his )?balance|headfirst|head first/i, /provide fall protection|fall protection/i, /fell/i]);
  assert.ok(r.incidentCount <= 30, "flag count " + r.incidentCount);
});

test("SurvX on the NSW condition survey, pages 1-20", () => {
  const r = classifySurvey(fixture("nsw-1-20.json"));
  show("nsw 1-20", r, "flaggedCount");
  expectEach(r.flagged, [/significant cracks in asphalt/i, /lifted by tree roots/i, /severe cracks on concrete ramp/i, /graffiti/i, /damaged from tree roots|tree roots/i]);
  const defects = r.flagged.filter((f) => /crack|lifted|damage|graffiti|poor|sever/i.test(f.line));
  assert.ok(defects.length >= 10, "defect lines " + defects.length);
  assert.ok(r.flaggedCount <= 60, "flag count " + r.flaggedCount);
});

test("SpecX on the Christina book 3613 (438 pages): sections present, references apart", () => {
  const { sections, referencedAbsent } = parseSpecSections(fixture("christina-3613.json"));
  const numbers = new Set(sections.map((s) => s.number));
  console.log("  christina 3613: " + sections.length + " sections present, " + referencedAbsent.length + " referenced only; e.g. " + sections.slice(0, 3).map((s) => s.number + " " + s.title + " p" + s.page).join("; "));
  for (const n of ["01 60 00", "03 30 00", "00 81 13", "23 09 50"]) assert.ok(numbers.has(n), n + " should be present");
  for (const n of ["01 03 00", "08 31 00", "22 05 48", "26 28 13"]) assert.ok(!numbers.has(n), n + " is only referenced");
  assert.ok(referencedAbsent.some((r) => r.number === "08 31 00"));
  assert.ok(sections.length >= 60 && sections.length <= 130, "count " + sections.length);
  assert.ok(sections.every((s) => s.page >= 1));
});

test("DrawX on the Fayette 36x24 set (21 sheets): sheet numbers from title blocks", () => {
  const r = parseSheetIndex(fixture("fayette.json"));
  console.log("  fayette: " + r.sheets.filter((s) => s.number).length + "/" + r.sheets.length + " pages numbered; " + r.sheets.map((s) => "p" + s.page + "=" + (s.number || "?") + (s.title ? " " + s.title : "")).join("; ").slice(0, 600));
  const numbers = r.sheets.map((s) => s.number);
  for (const n of ["A2.1", "A3.1", "A5.1", "A8.1", "A9.1", "1LS.1", "A0.1"]) assert.ok(numbers.includes(n), n + " expected");
  assert.equal(r.sheets.filter((s) => s.number).length, 21, "numbered pages");
  assert.deepEqual(r.sheets.map((s) => s.number), ["1G0.1", "1G1.0", "1G1.1", "1G1.2", "1G1.3", "1LS.1", "1LS.2", "A0.1", "A1.A", "A1.B", "A1.1", "A2.1", "A3.1", "A3.2", "A4.1", "A5.1", "A5.2", "A6.1", "A7.1", "A8.1", "A9.1"]);
  console.log("  fayette how: " + r.sheets.map((s) => s.how).join(" "));
  const titled = Object.fromEntries(r.sheets.filter((s) => s.number).map((s) => [s.number, s.title]));
  assert.match(titled["A8.1"] || "", /ROOF PLAN/);
  assert.match(titled["1LS.1"] || "", /LIFE SAFETY/);
  assert.ok(!numbers.some((n) => n && /^(G48|O45|TZ0)$/.test(n)), "invented numbers from the audit");
});

test("DrawX on the Grandview Chief Architect sample (19 sheets)", () => {
  const r = parseSheetIndex(fixture("grandview.json"));
  console.log("  grandview: " + r.sheets.filter((s) => s.number).length + "/" + r.sheets.length + " pages numbered; " + r.sheets.map((s) => "p" + s.page + "=" + (s.number || "?")).join(" "));
  assert.ok(r.sheets.filter((s) => s.number).length >= 2, "numbered pages");
  assert.ok(r.sheets.every((s) => !s.number || !/^\d+$/.test(s.number) || Number(s.number) <= 19), "a plain number beyond the page count");
});
