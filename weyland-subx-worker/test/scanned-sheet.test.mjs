// Full-size scan regression. Poppler supplies only pixels; production owns all OCR and parsing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openPdf, pageItems } from "../../tools/accuracy/truth/pdf.mjs";
import { readA, readAFromLines } from "../../tools/accuracy/truth/reader_a.mjs";
import { ocrPage } from "../../tools/accuracy/truth/ocr.mjs";
import { scoreDoorsVs } from "../../tools/accuracy/truth/agree.mjs";
import { eraseLongRuns } from "../assets/client-ocr-src/schedule-grid-extraction-client.mjs";
import { readDimension } from "../assets/client-ocr-src/schedule-text-layer.mjs";
const root = new URL("../../", import.meta.url);

test("crossing row rules do not leave vertical fragments or erase nearby glyphs", () => {
  const width = 160, height = 120, data = new Uint8ClampedArray(width * height * 4).fill(255);
  const ink = (x, y) => { const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0; };
  for (let y = 5; y < 115; y++) ink(20, y);
  for (const y of [10, 30, 50, 70, 90, 110]) for (let x = 5; x < 155; x++) ink(x, y);
  for (let y = 35; y < 44; y++) ink(60, y);
  eraseLongRuns({width,height,data}, 40);
  for (let y = 5; y < 115; y++) assert.equal(data[(y * width + 20) * 4], 255);
  for (let y = 35; y < 44; y++) assert.equal(data[(y * width + 60) * 4], 0);
});

test("the shared dimension reader accepts a dropped foot apostrophe without inventing digits", () => {
  assert.deepEqual(readDimension('7-0"'), {inches:84,format:"ft-in"});
  assert.deepEqual(readDimension('3-6"'), {inches:42,format:"ft-in"});
  assert.equal(readDimension('7-Q"'), null);
  assert.equal(readDimension('7-14"'), null);
});

test("the shipped OCR modules and versioned entry points match source", () => {
  for (const name of ["schedule-grid-extraction-client.mjs", "schedule-text-layer.mjs"]) {
    assert.deepEqual(readFileSync(new URL("../assets/client-ocr/" + name + ".bin", import.meta.url)), readFileSync(new URL("../assets/client-ocr-src/" + name, import.meta.url)));
  }
  for (const path of ["../assets/client-ocr/grid-runner.html", "../src/pages/subx-app.html"]) {
    assert.match(readFileSync(new URL(path, import.meta.url), "utf8"), /schedule-grid-extraction-client\.mjs\?v=20261009g019r2/);
  }
});

test("sideways ARCH D image-only sheet reads the same 48 doors as vector through production OCR", {timeout:120000}, async () => {
  const file = fileURLToPath(new URL("tools/bidset/out/weylandai-building-bidset-scanned.pdf", root));
  const expected = JSON.parse(readFileSync(new URL("tools/bidset/out/truth-doors.json", root)));
  const page = expected.source.pages[0];
  const scan = await openPdf(readFileSync(file));
  const layer = await pageItems(scan, page); await (scan.destroy?.() ?? scan.loadingTask?.destroy());
  assert.equal(layer.items.length, 0); assert.equal(Math.max(layer.width, layer.height), 2592);
  const pdf = await openPdf(readFileSync(new URL(expected.source.file, root)));
  const vector = await readA(pdf, page, "door_schedule"); await (pdf.destroy?.() ?? pdf.loadingTask?.destroy());
  const o = await ocrPage(file, page, {dpi:300});
  const a = await readAFromLines(o.lines, o, "door_schedule", o.word_count);
  const marks = doors => doors.map(d => d.mark).sort();
  assert.deepEqual(marks(a.doors), marks(vector.doors));
  assert.deepEqual(marks(a.doors), expected.doors.map(d => d.mark).sort());
  assert.equal(a.doors.length, 48); assert.equal(o.rotation, 270);
  assert.ok(o.width * o.height * (o.dpi / 72) ** 2 <= 36e6);
  const score = scoreDoorsVs(expected, a.doors.map(d => ({page,...d})));
  assert.equal(score.extra_rows, 0);
  assert.ok(score.fields_right / score.fields_total >= 0.95, JSON.stringify(score));
  console.log("g019 scan evidence", JSON.stringify({dpi:o.dpi,rotation:o.rotation,skew:o.skew_deg,rows:score.rows_found,fields_right:score.fields_right,fields_total:score.fields_total,ms:o.ms}));
});
