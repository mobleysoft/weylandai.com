#!/usr/bin/env node
// Offline evaluation of actual browser receipts or saved SubX door responses.
// node tools/accuracy/cascade_evidence.mjs --receipt receipt.json --expected labels.json
//   --project occ --split development --page 1 [--variant scanned]
// Prints JSON only; reads local files, makes no network call, changes no policy.
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { boundedFieldEvidence } from "../../weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs";

const markOf = d => String(d.original_mark ?? d.door_number ?? d.mark ?? "").trim().toUpperCase();
const numeric = v => typeof v === "number" && Number.isFinite(v) ? v : null;
const rawDimension = (e, kind) => {
  if (e?.fields[kind]) return e.fields[kind].original;
  const size = e?.fields.size?.original;
  const parts = typeof size?.value === "string" ? size.value.split(" x ").map(Number) : [];
  return size ? { ...size, value: numeric(parts[kind === "width" ? 0 : 1]) } : null;
};

export function receiptExtraction(receipt, variant) {
  const variants = receipt.variants || receipt.results;
  if (Array.isArray(variants)) {
    const selected = variants.filter(v => !variant || v.variant === variant);
    if (selected.length !== 1) throw new Error("Choose exactly one receipt variant with --variant.");
    return receiptExtraction(selected[0]);
  }
  const extraction = receipt.result || receipt.extraction || receipt;
  if (!Array.isArray(extraction.doors)) throw new Error("Receipt has no door rows.");
  return extraction;
}

export function evaluateCascadeEvidence(extraction, expected, { project, split = "development", page, receiptPage, thresholds = [.5, .6, .7, .8, .9] } = {}) {
  if (!project || !["development", "calibration", "held_out"].includes(split)) throw new Error("Supply a project ID and development/calibration/held_out split.");
  if (!Array.isArray(expected.doors)) throw new Error("Expected file has no labeled doors.");
  if (thresholds.some(t => !Number.isFinite(t) || t < 0 || t > 1)) throw new Error("Invalid diagnostic threshold.");
  const labeledPages = [...new Set(expected.doors.map(d => d.page ?? expected.source?.pages?.[0] ?? 1))];
  if (page == null && labeledPages.length !== 1) throw new Error("Choose --page for a multi-page label file.");
  const selectedPage = page ?? labeledPages[0];
  const selectedReceiptPage = receiptPage ?? selectedPage;
  if (![selectedPage, selectedReceiptPage].every(p => Number.isInteger(p) && p > 0)) throw new Error("Page numbers must be positive integers.");
  // A crop may use page 1 while labels name p.4. Mapping is explicit; absent
  // --receipt-page, known receipt page metadata must match the labeled page.
  const labels = expected.doors.filter(d => (d.page ?? expected.source?.pages?.[0] ?? 1) === selectedPage);
  if (!labels.length) throw new Error("No labels on the selected page.");
  const observedPages = new Set(extraction.doors.map(d => d.page_number ?? d.source?.page).filter(p => p != null));
  if (observedPages.size && !observedPages.has(selectedReceiptPage)) throw new Error("Receipt page does not match; select the actual page with --receipt-page.");
  const observed = new Map();
  for (const door of extraction.doors) {
    const observedPage = door.page_number ?? door.source?.page;
    if (observedPage != null && observedPage !== selectedReceiptPage) continue;
    const mark = markOf(door);
    if (!observed.has(mark)) observed.set(mark, []);
    observed.get(mark).push(door);
  }
  const expectedMarks = new Set(labels.map(markOf));
  const extra = [...observed].filter(([mark]) => !expectedMarks.has(mark)).flatMap(([mark, rows]) => rows.map(() => mark));
  const duplicates = [...observed].filter(([, rows]) => rows.length > 1).map(([mark, rows]) => ({ mark, count: rows.length }));
  const fields = [], pairs = [], stages = {}, artifacts = new Set(), models = new Set();
  let missing = 0, evidenceRows = 0, partialRows = 0, textRows = 0, correctedRows = 0;
  for (const label of labels) {
    const rows = observed.get(markOf(label)) || [];
    // A duplicate is not an exact identity match; never choose the convenient row.
    const door = rows.length === 1 ? rows[0] : null;
    if (!door) missing++;
    const evidence = boundedFieldEvidence(door?.field_evidence);
    if (evidence) {
      evidenceRows++; artifacts.add(evidence.version);
      stages[evidence.stage] = (stages[evidence.stage] || 0) + 1;
      if (evidence.stage === "pdf_text") textRows++;
      if (evidence.recognizer) models.add(evidence.recognizer.model_sha256);
    }
    if (door?.corrected) correctedRows++;
    const confidenceFields = Object.values(door?.field_confidence || {});
    const legacy = /ocr|grid/.test(door?.read_from || "") && !door?.confidence_source && confidenceFields.length && confidenceFields.every(v => v === .85);
    const partial = !!(extraction.partial || extraction.metadata?.partial || door?.read_audit?.partial || evidence?.partial);
    if (door && partial) partialRows++;
    const pair = [];
    for (const kind of ["width", "height"]) {
      if (numeric(label[kind + "_inches"]) == null) continue;
      const value = numeric(door?.[kind + "_inches"]);
      const score = door?.field_confidence?.[kind] ?? door?.field_confidence?.size;
      const raw = evidence && evidence.stage !== "pdf_text" ? rawDimension(evidence, kind) : null;
      const field = { mark: markOf(label), kind, expected: label[kind + "_inches"], value,
        correct: value != null && value === label[kind + "_inches"],
        score: !door?.corrected && !legacy && Number.isFinite(score) && score >= 0 && score <= 1 ? score : null,
        raw_score: raw?.confidence ?? null, raw_correct: numeric(raw?.value) === label[kind + "_inches"], partial };
      fields.push(field); pair.push(field);
    }
    if (pair.length === 2) pairs.push(pair);
  }
  const bins = Array.from({ length: 10 }, (_, i) => ({ lower: i / 10, upper: (i + 1) / 10, n: 0, correct: 0, score_sum: 0 }));
  for (const field of fields) if (field.raw_score != null) {
    const bin = bins[Math.min(9, Math.floor(field.raw_score * 10))];
    bin.n++; bin.correct += Number(field.raw_correct); bin.score_sum += field.raw_score;
  }
  const rawCount = bins.reduce((sum, bin) => sum + bin.n, 0);
  const reliability = bins.map(({ score_sum, ...bin }) => ({ ...bin, mean_score: bin.n ? score_sum / bin.n : null, accuracy: bin.n ? bin.correct / bin.n : null }));
  const wrong = accepted => accepted.filter(f => !f.correct).length;
  const diagnostics = thresholds.map(threshold => {
    const accepted = fields.filter(f => !f.partial && f.value != null && f.score != null && f.score >= threshold);
    const acceptedPairs = pairs.filter(pair => pair.every(f => !f.partial && f.value != null && f.score != null && f.score >= threshold));
    return { threshold, accepted_fields: accepted.length, wrong_accepted_fields: wrong(accepted),
      precision: accepted.length ? (accepted.length - wrong(accepted)) / accepted.length : null,
      coverage: fields.length ? accepted.length / fields.length : 0,
      accepted_pairs: acceptedPairs.length, wrong_accepted_pairs: acceptedPairs.filter(p => p.some(f => !f.correct)).length };
  });
  return { project, split, page: selectedPage, receipt_page: selectedReceiptPage,
    scope: "Diagnostic evidence on labeled construction dimensions; no probability calibration, threshold promotion or held-out certification is implied.",
    expected_rows: labels.length, exact_rows: labels.length - missing, missing_or_duplicate_rows: missing,
    extra_marks: extra, duplicate_marks: duplicates, evidence_rows: evidenceRows, text_rows_excluded_from_raw_calibration: textRows,
    partial_rows: partialRows, corrected_rows_excluded_from_thresholds: correctedRows, stages, artifacts: [...artifacts], recognizer_model_sha256: [...models],
    expected_dimension_fields: fields.length, correct_dimension_fields: fields.filter(f => f.correct).length,
    raw_score_fields: rawCount, raw_evidence_status: rawCount ? "observed" : "unavailable",
    raw_score_reliability: reliability, thresholds: diagnostics };
}

function loadJson(path) {
  if (!path || statSync(path).size > 32 * 1024 * 1024) throw new Error("Input missing or exceeds 32 MiB.");
  return JSON.parse(readFileSync(path, "utf8"));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = {};
    const allowed = new Set(["receipt", "expected", "project", "split", "page", "receipt-page", "variant"]);
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = process.argv[i].replace(/^--/, "");
      if (!allowed.has(key) || process.argv[i + 1] == null || args[key] != null) throw new Error("Invalid or repeated CLI option.");
      args[key] = process.argv[i + 1];
    }
    const page = args.page == null ? undefined : Number(args.page);
    const receiptPage = args["receipt-page"] == null ? undefined : Number(args["receipt-page"]);
    if (page != null && (!Number.isInteger(page) || page < 1)) throw new Error("--page must be a positive integer.");
    if (receiptPage != null && (!Number.isInteger(receiptPage) || receiptPage < 1)) throw new Error("--receipt-page must be a positive integer.");
    const result = evaluateCascadeEvidence(receiptExtraction(loadJson(args.receipt), args.variant), loadJson(args.expected), { project: args.project, split: args.split || "development", page, receiptPage });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
