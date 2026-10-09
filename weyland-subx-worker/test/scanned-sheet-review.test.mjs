import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { guestDetail, doorListCsv } from "../assets/client-ocr-src/schedule-workspace.mjs";
import { pageTextLines, readDoorScheduleFromLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";
import { getDocument, Util } from "../src/vendor/pdfjs-text.mjs";

const evidence = JSON.parse(readFileSync(new URL("./fixtures/g019-qualified-scan.json", import.meta.url)));
const scanned = evidence.variants.find(v => v.variant === "scanned");
const expected = evidence.variants.find(v => v.variant === "vector").result.doors.map(d => ({ page: 3, mark: d.door_number }));
const replay = (options = {}) => guestDetail({ name: "scan.pdf" }, "scan", 6, [{ page: 3, extraction: structuredClone(scanned.result) }], options);

test("F3: committed browser scan is qualified, duplicated 214 is flagged, and unread sizes are excluded", () => {
  const detail = replay();
  assert.equal(detail.takeoff.doors, 47);
  assert.equal(detail.takeoff.unique_marks, 46);
  assert.equal(detail.takeoff.ocr_rows, 47);
  assert.equal(detail.takeoff.ocr_fields, scanned.result.doors.reduce((n, d) => n + Object.keys(d.field_confidence).length, 0));
  assert.match(detail.takeoff.qualifier, /Machine-read OCR: 47 rows/);
  assert.match(detail.takeoff.qualifier, /below the 80% review threshold/);
  assert.match(detail.takeoff.qualifier, /completeness is unverified/);
  assert.equal(detail.takeoff.confidence_unknown_rows, 47, "legacy 0.85 stamps are not real measurements");
  assert.deepEqual(detail.takeoff.duplicate_marks, [{ page: 3, mark: "214", count: 2 }]);
  for (const d of detail.doors.filter(d => d.mark === "214")) {
    assert.ok(d.unsure.includes("mark"));
    assert.match(d.review_issues.join(" "), /Duplicate mark 214/);
  }
  assert.equal(detail.takeoff.by_size.reduce((n, s) => n + s.count, 0), detail.takeoff.doors_with_size);
  const csv = doorListCsv(detail.doors, detail.takeoff);
  assert.match(csv, /OCR rows,OCR fields,Rows below 80%/);
  assert.match(csv, /Machine-read OCR: 47 rows/);
  assert.match(csv, /Duplicate mark 214/);
});

test("F3: an explicit expected-mark checklist reports missing 111 and 211", () => {
  const detail = replay({ expectedMarks: expected });
  assert.deepEqual(detail.takeoff.missing_expected_marks.map(d => d.mark).sort(), ["111", "211"]);
  assert.match(detail.takeoff.qualifier, /Missing expected marks: 111 \(page 3\), 211 \(page 3\)/);
  assert.match(doorListCsv(detail.doors, detail.takeoff), /Missing expected marks/);
});

test("F3: guest warnings and counts use per-field confidence, including fire, hardware and dimensions", () => {
  const door = { ...scanned.result.doors[0], confidence_source: "ocr_words", field_confidence: { mark: .99, hardware_group: .42, fire_rating: .72, width: .65, height: .97 } };
  const d = guestDetail({ name: "measured.pdf" }, "measured", 1, [{ page: 1, extraction: { doors: [door] } }]);
  assert.deepEqual(d.doors[0].field_confidence, door.field_confidence);
  for (const field of ["hardware_group", "fire_rating", "size"]) assert.ok(d.doors[0].unsure.includes(field));
  assert.equal(d.takeoff.below_threshold_fields, 3);
  assert.equal(d.takeoff.below_threshold_rows, 1);
  assert.equal(d.takeoff.doors_with_size, 0);
  assert.deepEqual(d.takeoff.by_size, []);
});

test("F3: shared row parser preserves actual word confidences and leaves vector confidence at one", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../tools/bidset/out/weylandai-building-bidset.pdf", import.meta.url)));
  const pdf = await getDocument({ data: bytes, verbosity: 0 }).promise;
  try {
    const layer = await pageTextLines({ Util }, await pdf.getPage(3));
    const vector = await readDoorScheduleFromLines(layer.lines, layer);
    assert.equal(vector.doors.length, 48);
    assert.equal(vector.doors[0].field_confidence.hardware_group, 1);
    for (const line of layer.lines) for (const word of line.words) word.conf = word.str === "01" ? 42 : 94;
    const scan = await readDoorScheduleFromLines(layer.lines, layer);
    assert.equal(scan.doors[0].read_from, "ocr_lines");
    assert.equal(scan.doors[0].field_confidence.hardware_group, .42);
    assert.equal(scan.doors[0].field_confidence.mark, .94);
    assert.notEqual(scan.doors[0].field_confidence.fire_rating, .85);
  } finally { await (pdf.destroy?.() ?? pdf.loadingTask?.destroy()); }
});

test("F2/F3: the actual app tiles and partial summary display qualifications", () => {
  const html = readFileSync(new URL("../src/pages/subx-app.html", import.meta.url), "utf8");
  const detail = replay({ expectedMarks: expected });
  const box = {};
  const context = vm.createContext({ state: { detail }, $: () => box, esc: String });
  const start = html.indexOf("      function countList(");
  const end = html.indexOf("      function srcText(", start);
  vm.runInContext(html.slice(start, end) + "\nrenderTakeoff();", context);
  assert.match(box.innerHTML, /Door rows \(machine-read\)/);
  assert.match(box.innerHTML, /OCR rows \/ fields/);
  assert.match(box.innerHTML, /Rows \/ fields below 80%/);
  assert.match(box.innerHTML, /Duplicate marks: 214/);
  assert.match(box.innerHTML, /Missing expected marks: 111/);
  const partial = html.slice(html.indexOf("      function partialRead("), html.indexOf("      function setBusy("));
  vm.runInContext(partial + "\nresult = partialNote({ metadata: { partial: true } });", context);
  assert.match(context.result, /Partial machine read: page incomplete/);
});

test("F2: app STOP READING dispatches the AbortSignal passed to browser extraction", () => {
  const html = readFileSync(new URL("../src/pages/subx-app.html", import.meta.url), "utf8");
  let onStop, visible = false;
  const button = { addEventListener(event, fn) { assert.equal(event, "click"); onStop = fn; }, classList: { remove() { visible = true; } } };
  const state = {};
  const context = vm.createContext({ state, AbortController, $: id => { assert.equal(id, "stop-read-btn"); return button; } });
  const start = html.indexOf("      function beginBrowserRead(");
  const end = html.indexOf("      function partialRead(", start);
  vm.runInContext(html.slice(start, end) + "\nbeginBrowserRead();", context);
  assert.equal(visible, true);
  assert.equal(state.readAbort.signal.aborted, false);
  onStop();
  assert.equal(state.readAbort.signal.aborted, true);
  assert.match(html, /maxPixels: small \? 14e6 : 36e6, signal: state.readAbort.signal/);
  assert.match(html, /maxPixels: 14e6, signal: state.readAbort.signal/);
});
