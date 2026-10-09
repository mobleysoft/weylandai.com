import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { boundedFieldEvidence, fieldDecision, SCHEDULE_EVIDENCE_VERSION, OCR_MODEL_SHA256, clusterLines, readDoorScheduleFromLines } from "../assets/client-ocr-src/schedule-text-layer.mjs";
import { doorFromGridRow, rereadDimensionCell, recognitionBudget } from "../assets/client-ocr-src/schedule-grid-extraction-client.mjs";
import { unsureDoorFields } from "../assets/client-ocr-src/schedule-workspace.mjs";
import { evaluateCascadeEvidence, receiptExtraction } from "../../tools/accuracy/cascade_evidence.mjs";

const fields = ["mark", "width", "height", "hardware_group"];
function gridRow(overrides = {}) {
  return { _band: 7, mark: "101", width: "3'-0\"", height: "7'-0\"", hardware_group: "01",
    _confidence: { mark: .95, width: .64, height: .39, hardware_group: .93 }, ...overrides };
}
const envelope = entries => ({ version: SCHEDULE_EVIDENCE_VERSION, stage: "ocr_grid", fields: entries });

test("a rejected dimension keeps its actual original score, without changing review confidence", () => {
  const row = gridRow({ width: "711\"", _confidence: { mark: .95, width: .97, height: .9, hardware_group: .93 } });
  const door = doorFromGridRow(row, fields);
  assert.equal(door.width_inches, null);
  assert.equal(door.field_confidence.width, 0);
  assert.equal(door.field_evidence.fields.width.original.confidence, .97);
  assert.equal(door.field_evidence.fields.width.chosen.confidence, .97);
  assert.equal(door.field_evidence.fields.width.disposition, "abstained");
  assert.equal(door.field_evidence.fields.width.reason, "parse_rejected");
});

test("a chosen reread keeps the original text/score and actual view; no acceptance score is raised", () => {
  const row = gridRow({ width: "3'-6\"", _confidence: { mark: .95, width: .31, height: .39, hardware_group: .93 },
    _original: { width: { text: "bad", confidence: .97 } },
    _decisions: { width: { attempts: 2, candidate_values: 1, reason: "consensus", selected_view: { name: "cell_psm_7", scale: 2, whitelist: true } } } });
  const door = doorFromGridRow(row, fields, { partial: true, recognition: { reason: "cell_limit" } });
  const e = door.field_evidence.fields.width;
  assert.equal(e.original.text, "bad"); assert.equal(e.original.confidence, .97); assert.equal(e.original.value, null);
  assert.equal(e.chosen.value, 42); assert.equal(e.chosen.confidence, .31); assert.equal(e.chosen.view.scale, 2);
  assert.equal(door.field_confidence.width, .31);
  assert.equal(door.field_evidence.partial_reason, "cell_limit");
  assert.ok(unsureDoorFields(door).includes("size"));
});

test("real dimension rereads report conflicting values and stopped budgets without changing their null result", () => {
  const image = { width: 40, height: 20, data: new Uint8ClampedArray(3200).fill(255) };
  let i = 0;
  const engine = { clearImage() {}, loadImage() {}, setVariable() {}, getTextBoxes() {
    return [{ text: ["2'-9\"", "2'-9\"", "2'-0\"", "2'-0\""][i++] || "", confidence: .59 }];
  } };
  const accept = t => doorFromGridRow(gridRow({ width: t }), fields).width_inches != null;
  const conflict = rereadDimensionCell(engine, image, 0, 40, 0, 20, { inset: 3 }, "bad", accept);
  assert.equal(conflict.text, null); assert.equal(conflict.evidence.conflict, true); assert.equal(conflict.evidence.reason, "conflicting_values");
  i = 0;
  const stopped = rereadDimensionCell(engine, image, 0, 40, 0, 20, { inset: 3, recognitionBudget: recognitionBudget({ maxCells: 1 }) }, "bad", accept);
  assert.equal(stopped.text, null); assert.equal(stopped.evidence.reason, "cell_limit"); assert.equal(stopped.evidence.attempts, 1);
});

function words(withOcr) {
  const rows = [["MARK", "WIDTH", "HEIGHT", "TYPE", "HW GROUP"], ["101", "711\"", "7'-0\"", "A", "01"], ["102", "3'-0\"", "7'-0\"", "A", "01"]];
  return rows.flatMap((row, r) => row.map((str, c) => ({ str, x0: 20 + c * 100, x1: 20 + c * 100 + str.length * 5, yb: 30 + r * 20, h: 10, item: r + "-" + c, ...(withOcr ? { conf: 97 } : {}) })));
}
test("actual line-reader consumer preserves rejected OCR scores and distinguishes positioned PDF text", async () => {
  for (const ocr of [true, false]) {
    const result = await readDoorScheduleFromLines(clusterLines(words(ocr)), { width: 600, height: 500 });
    const door = result.doors.find(d => d.door_number === "101");
    assert.equal(door.width_inches, null);
    assert.equal(door.field_evidence.stage, ocr ? "ocr_lines" : "pdf_text");
    assert.equal(door.field_evidence.fields.width.original.confidence, ocr ? .97 : null);
    assert.equal(door.field_confidence.width, ocr ? 0 : 1);
    assert.equal(door.field_evidence.recognizer?.model_sha256 ?? null, ocr ? OCR_MODEL_SHA256 : null);
  }
});

test("line structuring retains original cell provenance when a pixel reread replaced the words", async () => {
  const input = words(true);
  const w = input.find(w => w.item === "1-1");
  w.str = "3'-6\""; w.conf = 61;
  w.cell_evidence = { text: "711\"", confidence: .97, selected_view: { name: "cell_psm_7", scale: 3 }, reread: { attempts: 18, candidate_values: 1, reason: "consensus" } };
  const result = await readDoorScheduleFromLines(clusterLines(input), { width: 600, height: 500 });
  const e = result.doors[0].field_evidence.fields.width;
  assert.equal(e.original.text, "711\""); assert.equal(e.original.confidence, .97); assert.equal(e.original.value, null);
  assert.equal(e.chosen.value, 42); assert.equal(e.chosen.confidence, .61); assert.equal(e.chosen.view.scale, 3);
});

test("client evidence is finite, typed, bounded in UTF-8 bytes, and cannot inject images or unknown metadata", () => {
  const input = envelope(Object.fromEntries(["mark", "width", "height", "thickness", "size", "hardware_group", "fire_rating", "door_type", "door_material", "door_finish", "stc_rating", "frame_type", "frame_material", "frame_finish", "head_detail", "jamb_detail", "sill_detail", "panic_hardware", "notes", "location", "glazing", "pair", "alternate", "details", "secret"].map(key => [key,
    { ...fieldDecision("界".repeat(10000), Infinity, "界".repeat(10000), NaN, "界".repeat(10000), { name: "shell", scale: 1e9 }),
      reason: "execute", features: { characters: Infinity }, reread: { attempts: Infinity, candidate_values: NaN, reason: "shell", readings: new Array(100).fill({ text: "界".repeat(10000), confidence: Infinity, image: "base64", view: { name: "shell" } }) }, image: "base64" }])));
  const result = boundedFieldEvidence(input);
  assert.ok(new TextEncoder().encode(JSON.stringify(result)).length <= 16000);
  assert.equal(result.truncated, true); assert.equal(result.fields.secret, undefined);
  assert.equal(result.fields.width.original.text.length, 128); assert.equal(result.fields.width.original.confidence, null);
  assert.equal(result.fields.width.chosen.view.name, "initial"); assert.equal(result.fields.width.chosen.view.scale, undefined);
  assert.equal(result.fields.width.reason, "parse_rejected"); assert.equal(result.fields.width.reread.reason, "insufficient_support");
  assert.ok(result.fields.width.reread.readings.length <= 6); assert.equal(JSON.stringify(result).includes("base64"), false);
  assert.equal(boundedFieldEvidence({ ...input, version: "invented-v2" }), null);
  assert.equal(boundedFieldEvidence({ ...input, stage: "external_llm" }), null);
});

test("the evidence model fingerprint equals the real shipped language model", () => {
  const bytes = readFileSync(new URL("../assets/client-ocr/eng-traineddata.bin", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), OCR_MODEL_SHA256);
});

test("offline evaluation counts every expected field, missing and duplicate rows, wrong accepted fields, and original score errors", () => {
  const first = doorFromGridRow(gridRow({ width: "711\"", _confidence: { mark: .95, width: .97, height: .9, hardware_group: .93 } }), fields);
  const second = doorFromGridRow(gridRow({ mark: "102", width: "3'-6\"", _confidence: { mark: .95, width: .9, height: .9, hardware_group: .93 } }), fields);
  const expected = { source: { pages: [1] }, doors: ["101", "102", "103"].map(mark => ({ mark, width_inches: 36, height_inches: 84 })) };
  const report = evaluateCascadeEvidence({ doors: [first, second] }, expected, { project: "fixture" });
  assert.equal(report.expected_dimension_fields, 6); assert.equal(report.correct_dimension_fields, 2);
  assert.equal(report.missing_or_duplicate_rows, 1); assert.equal(report.raw_score_fields, 4);
  const high = report.raw_score_reliability[9]; assert.equal(high.n, 4); assert.equal(high.correct, 2);
  const policy = report.thresholds.find(r => r.threshold === .8);
  assert.equal(policy.accepted_fields, 3); assert.equal(policy.wrong_accepted_fields, 1); assert.equal(policy.accepted_pairs, 1);
  assert.equal(policy.wrong_accepted_pairs, 1);
  const duplicate = evaluateCascadeEvidence({ doors: [second, second] }, expected, { project: "fixture" });
  assert.equal(duplicate.exact_rows, 0); assert.equal(duplicate.duplicate_marks[0].count, 2);
});

test("text reads are excluded from raw OCR calibration; partial/legacy/corrected rows cannot count as threshold accepts", () => {
  const expected = { doors: [{ mark: "101", width_inches: 36, height_inches: 84 }] };
  const door = doorFromGridRow(gridRow({ _confidence: { width: .9, height: .9 } }), fields);
  for (const override of [{ partial: true }, { doors: [{ ...door, corrected: true }] }, { doors: [{ ...door, confidence_source: null, field_confidence: { width: .85, height: .85 } }] }]) {
    const r = evaluateCascadeEvidence({ doors: [door], ...override }, expected, { project: "fixture" });
    assert.ok(r.thresholds.every(t => t.accepted_fields === 0 && t.precision === null));
  }
  const text = { ...door, field_evidence: boundedFieldEvidence({ ...door.field_evidence, stage: "pdf_text" }) };
  const r = evaluateCascadeEvidence({ doors: [text] }, expected, { project: "fixture" });
  assert.equal(r.raw_score_fields, 0); assert.equal(r.raw_evidence_status, "unavailable"); assert.equal(r.text_rows_excluded_from_raw_calibration, 1);
  assert.throws(() => receiptExtraction({ variants: [{ variant: "a", result: { doors: [] } }, { variant: "b", result: { doors: [] } }] }), /exactly one/);
});

test("cropped receipt page mapping must be explicit and preserves the full labeled denominator", () => {
  const door = { ...doorFromGridRow(gridRow(), fields), source: { page: 1 } };
  const expected = { source: { pages: [4] }, doors: [{ mark: "101", width_inches: 36, height_inches: 84 }] };
  assert.throws(() => evaluateCascadeEvidence({ doors: [door] }, expected, { project: "crop", page: 4 }), /--receipt-page/);
  const result = evaluateCascadeEvidence({ doors: [door] }, expected, { project: "crop", page: 4, receiptPage: 1 });
  assert.equal(result.page, 4); assert.equal(result.receipt_page, 1);
  assert.equal(result.expected_dimension_fields, 2); assert.equal(result.correct_dimension_fields, 2);
});
