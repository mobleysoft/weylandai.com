// Schedule-reading accuracy of the reader itself, run in Node (2026-10-08).
//
// schedule_read_accuracy.mjs measures production through its HTTP API and
// needs the Cloudflare login. This runs the SAME reader module the SubX
// workspace and the server's Browser Rendering runner run
// (weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs,
// its exported extractDoorScheduleFromPdf / extractHardwareScheduleFromPdf)
// on the same corpus pages, with pdf.js from npm instead of the vendored copy,
// and scores it with the same rules (schedule-scoring.mjs) against the same
// ground truth (tools/corpus/expected, read by eye). No network, no account.
//
// Pages with a text layer are read from it. A page that needs OCR (a scan)
// cannot be read here: tesseract-wasm and the canvas renderer run only in a
// browser, so such a page is reported as "needs OCR", not scored as zero.
//
// Usage (from the repo root, after `npm ci` in weyland-subx-worker):
//   node tools/accuracy/schedule_text_layer_accuracy.mjs [--only rockford,berryessa,christina] [--label after]
// Writes text_layer_report_<stamp>[_<label>].json and .md next to this file,
// and exits non-zero when a document is under the targets (95% of rows found,
// 95% field accuracy) so it can gate a change.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scoreDoors, scoreGroups } from "./schedule-scoring.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const ONLY = args.only ? String(args.only).split(",").map((s) => s.trim()) : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const TARGET = { rows: 95, fields: 95 };

const WORKER = join(REPO, "weyland-subx-worker");
const pdfjs = await import(pathToFileURL(join(WORKER, "node_modules/pdfjs-dist/legacy/build/pdf.mjs")).href);
const reader = await import(pathToFileURL(join(WORKER, "assets/client-ocr-src/schedule-grid-extraction-client.mjs")).href);

const EXPECTED = join(REPO, "tools/corpus/expected");
const CORPUS = join(REPO, "tools/corpus/door-schedules");
const DOCS = [
  { id: "rockford", file: join(CORPUS, "f0e863d88ea688ff.pdf"), doors: "rockford-a2.2-door-schedule.json", groups: "rockford-087100-hardware-groups.json" },
  { id: "berryessa", file: join(CORPUS, "dd339f57b51538ed.pdf"), doors: "berryessa-a9.2-door-schedules.json", groups: "berryessa-087100-hardware-groups.json" },
  { id: "occ", file: "/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf", doors: "occ-a-801-door-schedule.json" },
  { id: "christina", file: join(CORPUS, "525dc0b72011077a.pdf"), groups: "christina-chs-hardware-set-01.json" },
];

// The shapes the workspace's /doors route returns, so schedule-scoring.mjs
// reads them exactly as it reads production.
function asFoundDoor(d, page) {
  return { mark: d.door_number, page_number: page, hardware_group: d.hardware_group, width_inches: d.width_inches, height_inches: d.height_inches, fire_rating: d.fire_rating, door_type: d.door_type };
}
function asSetsAndComps(groups) {
  const sets = [], comps = [];
  for (const g of groups) {
    sets.push({ set_number: g.group_number, door_count: g.assigned_doors.length });
    for (const c of g.components) comps.push({ set_number: g.group_number, quantity: c.quantity, component_type: c.component_type, model: c.model_number, finish: c.finish, manufacturer: c.manufacturer });
  }
  return { sets, comps };
}

const started = new Date();
const report = { started_at: started.toISOString(), reader: "schedule-grid-extraction-client.mjs (text layer first)", pdfjs: pdfjs.version, documents: [] };
for (const doc of DOCS.filter((d) => !ONLY || ONLY.includes(d.id))) {
  const entry = { id: doc.id, file: doc.file.replace(REPO + "/", ""), reads: [] };
  report.documents.push(entry);
  if (!existsSync(doc.file)) { entry.skipped = "file not in this checkout"; continue; }
  const bytes = new Uint8Array(readFileSync(doc.file));
  const expDoors = doc.doors ? JSON.parse(readFileSync(join(EXPECTED, doc.doors), "utf8")) : null;
  const expGroups = doc.groups ? JSON.parse(readFileSync(join(EXPECTED, doc.groups), "utf8")) : null;
  const foundDoors = [], groups = [];
  const read = async (page, type) => {
    const t0 = Date.now();
    const fn = type === "door_schedule" ? reader.extractDoorScheduleFromPdf : reader.extractHardwareScheduleFromPdf;
    try {
      const r = await fn(bytes.buffer, page, null, { pdfjs });
      const md = r.metadata || {};
      const n = type === "door_schedule" ? r.doors.length : r.hardware_groups.length;
      entry.reads.push({ page, type, ms: Date.now() - t0, route: md.extraction_route || md.extraction_mode, found: n + (type === "door_schedule" ? " doors" : " groups") });
      if (type === "door_schedule") foundDoors.push(...r.doors.map((d) => asFoundDoor(d, page)));
      else groups.push(...r.hardware_groups);
    } catch (e) {
      entry.reads.push({ page, type, ms: Date.now() - t0, route: "needs OCR", error: String((e && e.message) || e).slice(0, 160) });
    }
  };
  if (expDoors) for (const p of expDoors.source.pages) await read(p, "door_schedule");
  if (expGroups) for (const p of expGroups.source.pages) await read(p, "hardware_schedule");
  // A page the expected file says has a text layer must be read from it; only
  // a scan (text_layer: false) may be left to the OCR harness.
  const hasText = (expDoors && expDoors.source.text_layer) || (expGroups && expGroups.source.text_layer);
  if (!hasText && entry.reads.every((r) => r.route === "needs OCR")) { entry.skipped = "no text layer: OCR only, measured by schedule_read_accuracy.mjs"; continue; }
  if (expDoors) entry.doors = scoreDoors(expDoors, foundDoors);
  if (expGroups) { const { sets, comps } = asSetsAndComps(groups); entry.hardware = scoreGroups(expGroups, sets, comps, foundDoors); }
  process.stdout.write(doc.id + ": " + entry.reads.map((r) => "p" + r.page + " " + (r.found || r.route)).join(", ") + "\n");
}
report.finished_at = new Date().toISOString();

const under = [];
for (const e of report.documents) {
  if (!e.skipped && !e.doors && !e.hardware) under.push(e.id + " (nothing scored)");
  if (e.doors && (e.doors.rows_found_pct < TARGET.rows || (e.doors.field_accuracy_pct ?? 0) < TARGET.fields)) under.push(e.id + " doors");
  if (e.hardware && (e.hardware.items_found_pct < TARGET.rows || (e.hardware.field_accuracy_pct ?? 0) < TARGET.fields)) under.push(e.id + " hardware");
}
report.under_target = under;

const stamp = started.toISOString().slice(0, 16).replace(/[:T]/g, "-");
writeFileSync(join(here, "text_layer_report_" + stamp + LABEL + ".json"), JSON.stringify(report, null, 1));
const pct = (x) => (x == null ? "n/a" : x + "%");
const md = ["# Schedule reading from the text layer, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "",
  "The SubX reader module run in Node (pdf.js " + report.pdfjs + ") on the corpus pages, scored by schedule-scoring.mjs against tools/corpus/expected (read by eye). Targets: " + TARGET.rows + "% of rows found, " + TARGET.fields + "% field accuracy.", "",
  "| document | what | expected | found | rows found | field accuracy | extra | reads |", "|---|---|---|---|---|---|---|---|"];
for (const e of report.documents) {
  const reads = e.reads.map((r) => "p" + r.page + " " + (r.found || r.route) + " " + r.ms + "ms").join("; ");
  if (e.skipped) { md.push("| " + e.id + " | - | | | | | | " + e.skipped + " |"); continue; }
  if (e.doors) md.push("| " + e.id + " | doors | " + e.doors.expected_rows + " | " + e.doors.rows_found + " | " + pct(e.doors.rows_found_pct) + " | " + pct(e.doors.field_accuracy_pct) + " | " + e.doors.extra_rows + " | " + reads + " |");
  if (e.hardware) md.push("| " + e.id + " | hardware items | " + e.hardware.expected_items + " (" + e.hardware.expected_groups + " groups) | " + e.hardware.items_found + " (" + e.hardware.groups_found + " groups) | " + pct(e.hardware.items_found_pct) + " | " + pct(e.hardware.field_accuracy_pct) + " | " + e.hardware.extra_groups.length + " groups | " + (e.hardware.doors_linked ? "doors linked " + e.hardware.doors_linked.linked + "/" + e.hardware.doors_linked.expected : "") + " |");
}
md.push("", "## Per field", "");
for (const e of report.documents) {
  if (e.doors) md.push("- " + e.id + " doors: " + Object.entries(e.doors.per_field).map(([k, v]) => k + " " + v.right + "/" + (v.right + v.wrong)).join(", "));
  if (e.hardware) md.push("- " + e.id + " items: " + Object.entries(e.hardware.per_field).map(([k, v]) => k + " " + v.right + "/" + (v.right + v.wrong)).join(", "));
}
md.push("", "## Everything still wrong", "");
for (const e of report.documents) {
  const wrong = [];
  if (e.doors) for (const r of e.doors.rows) { if (!r.found) wrong.push(r.mark + " (p" + r.page + "): not found"); else for (const w of r.wrong) wrong.push(r.mark + ": " + w); }
  if (e.doors && e.doors.extra_rows) wrong.push("extra rows: " + e.doors.extra_sample.map((x) => x.mark).join(", "));
  if (e.hardware) for (const g of e.hardware.groups) { if (!g.found) wrong.push("group " + g.group + ": not found"); else for (const it of g.items) { if (!it.found) wrong.push(g.group + " / " + it.item + ": not found"); else for (const w of it.wrong) wrong.push(g.group + " / " + it.item + ": " + w); } }
  if (e.hardware && e.hardware.extra_groups.length) wrong.push("extra groups: " + e.hardware.extra_groups.join(", "));
  if (wrong.length) md.push("- " + e.id + ": " + wrong.length, ...wrong.map((w) => "  - " + w.replace(/\|/g, "/")));
}
md.push("", under.length ? "Under target: " + under.join(", ") : "All read documents meet the targets.", "");
writeFileSync(join(here, "text_layer_report_" + stamp + LABEL + ".md"), md.join("\n"));
console.log(md.join("\n"));
process.exitCode = under.length ? 1 : 0;
