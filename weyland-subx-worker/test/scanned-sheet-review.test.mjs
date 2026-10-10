import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { guestDetail, doorListCsv } from "../assets/client-ocr-src/schedule-workspace.mjs";
import { pageTextLines, readDoorScheduleFromLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";
import { getDocument, Util } from "../src/vendor/pdfjs-text.mjs";

// Frozen verbatim from tools/accuracy/g019-browser.json at 2a96ef4f7be5b9abcd5a8d9ff8e4f66c323cf8d3.
// Keep the 47 rows (duplicate 214, missing 111/211, legacy confidence) as the reader improves.
const evidence = JSON.parse(readFileSync(new URL("./fixtures/g019-browser-47-rows.json", import.meta.url)));
const scanned = evidence.variants.find(v => v.variant === "scanned");
const expected = evidence.variants.find(v => v.variant === "vector").result.doors.map(d => ({ page: 3, mark: d.door_number }));
const replay = (options = {}) => guestDetail({ name: "scan.pdf" }, "scan", 6, [{ page: 3, extraction: structuredClone(scanned.result) }], options);

test("F3: frozen 47-row browser scan is qualified, duplicated 214 is flagged, and unread sizes are excluded", () => {
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

test("F3: current 48-row browser scan has no duplicate or missing marks and qualifies its counts", () => {
  const currentEvidence = JSON.parse(readFileSync(new URL("../../tools/accuracy/g019-browser.json", import.meta.url)));
  const currentScan = currentEvidence.variants.find(v => v.variant === "scanned").result;
  const expectedMarks = currentEvidence.variants.find(v => v.variant === "vector").result.doors.map(d => ({ page: 3, mark: d.door_number }));
  const detail = guestDetail({ name: "scan.pdf" }, "scan", 6, [{ page: 3, extraction: structuredClone(currentScan) }], { expectedMarks });
  const fields = currentScan.doors.reduce((n, d) => n + Object.keys(d.field_confidence).length, 0);
  assert.equal(expectedMarks.length, 48);
  assert.equal(detail.takeoff.doors, 48);
  assert.equal(detail.takeoff.unique_marks, 48);
  assert.equal(detail.takeoff.ocr_rows, 48);
  assert.equal(detail.takeoff.ocr_fields, fields);
  assert.equal(detail.takeoff.expected_marks_checked, true);
  assert.deepEqual(detail.takeoff.duplicate_marks, []);
  assert.deepEqual(detail.takeoff.missing_expected_marks, []);
  assert.ok(detail.takeoff.qualifier.startsWith("Machine-read OCR: 48 rows / " + fields + " fields;"));
  assert.match(detail.takeoff.qualifier, /below the 80% review threshold/);
  assert.doesNotMatch(detail.takeoff.qualifier, /Duplicate marks|Missing expected marks|completeness is unverified/);
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
  vm.runInContext(html.slice(start, end) + "\nctl = beginBrowserRead();", context);
  assert.equal(visible, true);
  // Each read keeps the controller beginBrowserRead returns (8ce822a): a read still in flight never
  // reaches for state.readAbort, which a later read replaces or clears.
  assert.equal(context.ctl, state.readAbort);
  assert.equal(context.ctl.signal.aborted, false);
  onStop();
  assert.equal(context.ctl.signal.aborted, true);
  assert.equal((html.match(/var ctl = beginBrowserRead\(\);/g) || []).length, 3, "every browser read takes its own controller");
  assert.match(html, /maxPixels: small \? 14e6 : 36e6, signal: ctl.signal/);
  assert.match(html, /maxPixels: 14e6, signal: ctl.signal/);
  assert.doesNotMatch(html, /state\.readAbort\.signal/, "no read looks the signal up through state");
});

// g063: the duplicate-mark note names both readings (T2507-01 A-103's 132A: two openings, one tag).
test("a mark on two rows reads as two openings sharing one tag, or a misprint", async () => {
  const { reviewDoorRows } = await import("../assets/client-ocr-src/schedule-workspace.mjs");
  const doors = [{ mark: "132A", page_number: 10 }, { mark: "132A", page_number: 10 }, { mark: "133A", page_number: 10 }];
  const summary = reviewDoorRows(doors);
  assert.deepEqual(summary.duplicate_marks, [{ page: 10, mark: "132A", count: 2 }]);
  assert.equal(doors[0].review_issues[0], "Duplicate mark 132A on page 10 (2 rows): two openings sharing one tag, or a misprint; verify each occurrence.");
  assert.deepEqual(doors[2].review_issues, []);
});
