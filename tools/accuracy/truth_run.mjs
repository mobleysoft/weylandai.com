#!/usr/bin/env node
// tools/accuracy/truth_run.mjs - truth at scale for the corpus and the harvest (2026-10-09).
//
// docs/direction-2026-10-08.md, "Truth at scale for the harvested corpus": a downloaded set tests
// the product the moment it is read, from truth we own. For every PDF this runs
//   reader A  the production text-layer reader (tools/accuracy/truth/reader_a.mjs)
//   reader B  the second reader, geometry first (tools/accuracy/truth/reader_b.mjs)
//   the agreement scorer (truth/agree.mjs): rows both readers agree on are accepted truth, the rest
//             go to the queue
//   the five oracles (truth/oracles.mjs), chosen by the set's triage class
//   calibration: for the audited files (tools/corpus/expected) and the synthetic set
//             (tools/bidset/out truth-*.json), reader A, reader B and the agreed rows are each
//             scored against the expected rows, so the agreement method itself is measured
// and writes tools/corpus/harvest/truth/<sha16>.json per PDF plus the queue
// tools/corpus/harvest/truth/queue.jsonl (one line per disagreement; a run replaces the lines of the
// PDFs it read and keeps the others).
//
// Usage:
//   node tools/accuracy/truth_run.mjs                 everything in tools/corpus (door-schedules,
//                                                     plan-sets, specs) + tools/bidset/out + $OCC_PDF
//   node tools/accuracy/truth_run.mjs --dir <dir>     every *.pdf in <dir> (the harvest: the Mac pulls
//                                                     R2 weyland-fixtures harvest/<sha16>.pdf into a
//                                                     folder and points --dir at it); family and source
//                                                     come from <dir>/manifest.json when present
//   --files a.pdf,b.pdf     just these files
//   --only <sha16,...>      just these (from whatever set was chosen)
//   --out <dir>             write the records and queue to <dir> (default tools/corpus/harvest/truth)
//   --max-pages <n>         skip PDFs with more pages (default 1200)
//   --ocr-max-pages <n>     OCR a PDF with no text layer when it has at most n pages (default 6); --ocr-dpi (600)
// Then: node tools/accuracy/truth_report.mjs  (the per-tier report).
// Vector reads use vendored pdf.js; scans also require Poppler (pdfinfo / pdftoppm). No network or credentials.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { openPdf } from "./truth/pdf.mjs";
import { loadPages, readSchedules } from "./truth/load_set.mjs";
import { alignDoors, alignGroups, mergeGroups, summarize, disagreements, scoreDoorsVs, scoreGroupsVs, calibrateFields, N } from "./truth/agree.mjs";
import { oracleMarksOnPlan, oracleSetsExist, oracleSetDoorLists, oracleTypesInLegend, oracleSizesAndMarks, ORACLES_FOR } from "./truth/oracles.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
// --out <dir>: write the records and the queue there instead (a run to compare with compare_runs.mjs).
const OUT = opt("out") ? resolve(opt("out")) : join(REPO, "tools/corpus/harvest/truth");
const MAX_PAGES = +opt("max-pages", 1200);
// A PDF with no text layer is OCR'd (truth/ocr.mjs) when it has at most this many pages (a page takes about a minute).
const OCR_MAX = +opt("ocr-max-pages", 6), OCR_DPI = +opt("ocr-dpi", 600);
const ONLY = opt("only") ? opt("only").split(",") : null;
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- which PDFs, and what we know of each
const rel = (f) => relative(REPO, resolve(f));
function manifestMeta(dir) {
  const m = new Map();
  const f = join(dir, "manifest.json");
  if (!existsSync(f)) return m;
  try {
    const j = JSON.parse(readFileSync(f, "utf8"));
    for (const d of j.documents || j.files || (Array.isArray(j) ? j : [])) if (d.filename) m.set(d.filename, d);
  } catch (_) { /* no manifest */ }
  return m;
}
const familyOf = (label) => {
  if (!label) return null;
  const s = String(label).split(/\s+[—-]\s+/)[0];
  return s.replace(/\s*\((?:[A-Z]{2})\)\s*$/, "").replace(/^(Rockford) (Board of Education|Public Schools).*$/, "$1").replace(/^(Christina) School District.*$/, "$1").replace(/^(Berryessa) Union School District.*$/, "$1").trim();
};
let files = [];
const meta = new Map(); // abs path -> { family, source, label }
if (opt("dir")) {
  const dir = resolve(opt("dir"));
  const mm = manifestMeta(dir);
  for (const f of readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".pdf")).sort()) {
    const p = join(dir, f); files.push(p);
    const d = mm.get(f) || {};
    meta.set(p, { family: d.family || familyOf(d.source_label) || "harvest", label: d.source_label || null, url: d.source_url || null, source: "harvest" });
  }
} else if (opt("files")) {
  files = opt("files").split(",").map((f) => resolve(f));
} else {
  for (const sub of ["door-schedules", "plan-sets", "specs"]) {
    const dir = join(REPO, "tools/corpus", sub);
    const mm = manifestMeta(dir);
    for (const f of readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".pdf")).sort()) {
      const p = join(dir, f); files.push(p);
      const d = mm.get(f) || {};
      meta.set(p, { family: familyOf(d.source_label) || (f.startsWith("fayette") ? "Fayette County (GA)" : "corpus"), label: d.source_label || null, url: d.source_url || null, source: "corpus/" + sub });
    }
  }
  const bid = join(REPO, "tools/bidset/out");
  if (existsSync(bid)) for (const f of readdirSync(bid).filter((x) => x.endsWith(".pdf")).sort()) { const p = join(bid, f); files.push(p); meta.set(p, { family: "bidset (synthetic)", label: "The WeylandAI Building, generated by tools/bidset/make.mjs" + (/scanned/.test(f) ? " (scanned rendering)" : ""), source: "bidset" }); }
  if (process.env.OCC_PDF && existsSync(process.env.OCC_PDF)) { files.push(resolve(process.env.OCC_PDF)); meta.set(resolve(process.env.OCC_PDF), { family: "Glendale CCD (OCC)", label: "OCC A-801 door schedule (private fixture)", source: "fixture" }); }
}

// Expected rows: the audited files and the synthetic set's truth, by the PDF they describe.
const expectedFor = new Map(); // abs path -> [{ name, kind, doc, tier }]
const addExpected = (file, name, doc, tier) => { const p = resolve(REPO, file); if (!expectedFor.has(p)) expectedFor.set(p, []); expectedFor.get(p).push({ name, kind: doc.schedule_type, doc, tier }); };
for (const f of readdirSync(join(REPO, "tools/corpus/expected")).filter((x) => x.endsWith(".json"))) {
  const doc = JSON.parse(readFileSync(join(REPO, "tools/corpus/expected", f), "utf8"));
  let file = doc.source.file;
  if (/occ/i.test(f)) { if (!process.env.OCC_PDF) continue; file = process.env.OCC_PDF; }
  addExpected(file, f, doc, "audited");
}
for (const f of ["truth-doors.json", "truth-groups.json"]) {
  const p = join(REPO, "tools/bidset/out", f);
  if (existsSync(p)) { const doc = JSON.parse(readFileSync(p, "utf8")); addExpected(doc.source.file, "tools/bidset/out/" + f, doc, "exact"); }
}
// The scanned rendering is the same building: its truth is the same rows, on its own page numbers if they differ.
const scanned = join(REPO, "tools/bidset/out/weylandai-building-bidset-scanned.pdf");
if (existsSync(scanned) && expectedFor.has(join(REPO, "tools/bidset/out/weylandai-building-bidset.pdf"))) expectedFor.set(scanned, expectedFor.get(join(REPO, "tools/bidset/out/weylandai-building-bidset.pdf")));

// Triage classes from the harvest triage file when present.
const triageFile = join(REPO, "tools/corpus/harvest/triage.json");
const triage = new Map();
if (existsSync(triageFile)) {
  try {
    const t = JSON.parse(readFileSync(triageFile, "utf8"));
    const list = Array.isArray(t) ? t : Array.isArray(t.files) ? t.files : Object.entries(t).map(([k, v]) => ({ sha16: k, ...(typeof v === "string" ? { class: v } : v) }));
    for (const x of list) if (x && (x.sha16 || x.sha256)) triage.set(String(x.sha16 || x.sha256).slice(0, 16), x.class || x.triage_class || x.triage);
  } catch (e) { console.error("triage.json not readable:", e.message); }
}
async function analyze(file) {
  const bytes = readFileSync(file);
  const sha = createHash("sha256").update(bytes).digest("hex");
  const sha16 = sha.slice(0, 16);
  if (ONLY && !ONLY.includes(sha16)) return null;
  const t0 = Date.now();
  const m = meta.get(file) || { family: "unknown", source: "files" };
  const rec = { sha16, sha256: sha, file: file.startsWith(REPO) ? rel(file) : basename(file), bytes: bytes.length, family: m.family, source: m.source, label: m.label || null, source_url: m.url || null };
  let pdf;
  try { pdf = await openPdf(bytes); } catch (e) { return { ...rec, tier: "unread", error: "pdf.js could not open it: " + String(e.message).slice(0, 160) }; }
  rec.page_count = pdf.numPages;
  if (pdf.numPages > MAX_PAGES) { return { ...rec, tier: "unread", error: "more than " + MAX_PAGES + " pages; rerun with --max-pages" }; }
  const pages = await loadPages(pdf);
  const { textPages, doorPages, hwPages, doorsA, doorsB, tableBoxes, hwA, hwB, readerNotes, ocr } =
    await readSchedules(pdf, pages, { file, ocrMax: OCR_MAX, ocrDpi: OCR_DPI });
  rec.text_layer = { pages_with_text: textPages, pages: pdf.numPages };
  if (ocr) rec.ocr = ocr;
  const groupsA = mergeGroups(hwA.filter((x) => x.groups.length)), groupsB = mergeGroups(hwB.filter((x) => x.groups.length));
  // A schedule page or a hardware page is one where either reader read rows.
  const schedPages = [...new Set([...doorsA, ...doorsB].map((d) => d.page))].sort((a, b) => a - b);
  const hwRead = [...new Set([...hwA, ...hwB].filter((x) => x.groups.some((g) => g.items.length)).map((x) => x.page))].sort((a, b) => a - b);
  rec.pages = { door_candidates: doorPages.length, hardware_candidates: hwPages.length, door_schedule_pages: schedPages, hardware_pages: hwRead };
  rec.readers = {
    a: { doors: doorsA.length, sets: groupsA.length, items: groupsA.reduce((n, g) => n + g.items.length, 0), name: rec.ocr ? "production OCR + schedule line reader (Poppler renderer)" : "production text layer (weyland-subx-worker/src/lib/text-layer-read.js)" },
    b: { doors: doorsB.length, sets: groupsB.length, items: groupsB.reduce((n, g) => n + g.items.length, 0), name: "geometry first (tools/accuracy/truth/reader_b.mjs)", tables: Object.values(tableBoxes).flat().length },
  };
  if (readerNotes.length) rec.reader_notes = readerNotes.slice(0, 20);

  // Agreement.
  const doorRows = alignDoors(doorsA, doorsB);
  const { rows: itemRows, groupRows } = alignGroups(groupsA, groupsB);
  const sd = summarize(doorRows), si = summarize(itemRows);
  const sg = { sets: groupRows.length, agreed: groupRows.filter((g) => g.status === "agreed").length };
  rec.rows_agreed = sd.agreed + si.agreed;
  rec.rows_disputed = sd.rows + si.rows - rec.rows_agreed;
  rec.rows_total = sd.rows + si.rows;
  rec.agreement_rate = rec.rows_total ? +(rec.rows_agreed / rec.rows_total).toFixed(4) : null;
  rec.agreement = { doors: sd, items: si, sets: sg };
  const dis = disagreements([...doorRows, ...itemRows], groupRows);

  // Triage class.
  const S = doorsA.length + doorsB.length > 0, H = groupsA.concat(groupsB).some((g) => g.items.length);
  const { readPlan } = await import("../../weyland-shared/plan-read.js");
  const planProbe = readPlan(pages, []);
  const P = planProbe.counts.plan_sheets > 0;
  const inferred = S && H && P ? "complete" : S && H ? "pair" : S ? "schedule-only" : H ? "spec-only" : P ? "plan-only" : "none";
  rec.triage_class = triage.get(sha16) || inferred;
  rec.triage_from = triage.has(sha16) ? "tools/corpus/harvest/triage.json" : "inferred (S=" + S + " H=" + H + " plan sheets=" + planProbe.counts.plan_sheets + ")";

  // Oracles over reader A's rows (the product's read), as the class says.
  const apply = ORACLES_FOR[rec.triage_class] || [];
  const run = {
    a: () => oracleMarksOnPlan(doorsA, pages),
    b: () => oracleSetsExist(doorsA, groupsA),
    c: () => oracleSetDoorLists(doorsA, groupsA),
    d: () => oracleTypesInLegend(doorsA, pages, tableBoxes),
    e: () => oracleSizesAndMarks(doorsA),
  };
  const names = { a: "marks_on_plan", b: "sets_exist", c: "set_door_lists", d: "types_in_legend", e: "sizes_and_marks" };
  rec.oracles = {};
  for (const k of Object.keys(run)) rec.oracles[names[k]] = apply.includes(k) ? run[k]() : { applicable: false, reason: "not for class " + rec.triage_class };

  // Calibration against expected rows.
  const exp = expectedFor.get(file) || [];
  if (exp.length) {
    const agreedDoors = doorRows.filter((r) => r.status === "agreed").map((r) => ({ page: r.page, ...r.a }));
    const agreedGroups = [];
    for (const g of groupsA) {
      const k = N.set(g.set);
      const items = itemRows.filter((r) => r.status === "agreed" && r.key.startsWith(k + " / ")).map((r) => r.a);
      if (items.length) agreedGroups.push({ ...g, items });
    }
    rec.calibration = [];
    for (const e of exp) {
      if (e.kind === "door_schedule") rec.calibration.push({ expected: e.name, kind: "doors", reader_a: scoreDoorsVs(e.doc, doorsA), reader_b: scoreDoorsVs(e.doc, doorsB), agreed: scoreDoorsVs(e.doc, agreedDoors) });
      else rec.calibration.push({ expected: e.name, kind: "items", reader_a: scoreGroupsVs(e.doc, groupsA.filter((g) => e.doc.source.pages.some((p) => g.pages.includes(p)))), reader_b: scoreGroupsVs(e.doc, groupsB.filter((g) => e.doc.source.pages.some((p) => g.pages.includes(p)))), agreed: scoreGroupsVs(e.doc, agreedGroups.filter((g) => e.doc.source.pages.some((p) => g.pages.includes(p)))) });
    }
    for (const c of rec.calibration) for (const k of ["reader_a", "reader_b", "agreed"]) c[k].wrong = c[k].wrong.slice(0, 25);
    rec.calibration.forEach((c, i) => { c.fields = calibrateFields(exp[i].doc, c.kind === "doors" ? doorRows : itemRows); });
  }

  // Tier.
  const applicable = Object.values(rec.oracles).filter((o) => o.applicable);
  rec.tier = exp.some((e) => e.tier === "exact") ? "exact" : exp.length ? "audited" : rec.rows_agreed > 0 ? "agreed" : applicable.length ? "oracle-checked" : "unread";
  if (rec.tier === "unread") rec.unread_reason = textPages === 0 ? (rec.ocr ? "no text layer; OCR read " + rec.ocr.pages.reduce((n, x) => n + x.words, 0) + " words but neither reader found a table in them" : "no text layer and more than " + OCR_MAX + " pages (raise --ocr-max-pages to OCR it)") : !S && !H ? "no door schedule or hardware set read by either reader" : "no rows agreed and no oracle applies";
  if (textPages === 0) rec.note = rec.ocr ? "no text layer: production OCR preprocessing, cell recognition and line reader; Poppler rendering (browser rendering is a separate check). Actual DPI is recorded per page; the same words are given to both readers" : "no text layer on any page and too many pages to OCR here";
  rec.disagreement_count = dis.length;
  rec.disagreements = dis.slice(0, 40);
  rec.ms = Date.now() - t0;
  rec.generated_at = new Date().toISOString();
  try { await (pdf.destroy ? pdf.destroy() : pdf.loadingTask && pdf.loadingTask.destroy()); } catch (_) { /* gone */ }
  return { rec, dis };
}

// ---------------------------------------------------------------- run
const queueFile = join(OUT, "queue.jsonl");
const done = new Set();
const queueNew = [];
for (const f of files) {
  if (!existsSync(f)) { console.log("missing", f); continue; }
  process.stdout.write(rel(f) + " ... ");
  let r;
  try { r = await analyze(f); } catch (e) { console.log("error", e.stack); continue; }
  if (!r) { console.log("skipped"); continue; }
  const rec = r.rec || r;
  writeFileSync(join(OUT, rec.sha16 + ".json"), JSON.stringify(rec, null, 1) + "\n");
  done.add(rec.sha16);
  for (const d of r.dis || []) queueNew.push({ sha16: rec.sha16, file: rec.file, family: rec.family, tier: rec.tier, ...d });
  const or = Object.entries(rec.oracles || {}).filter(([, o]) => o.applicable).map(([k, o]) => k + " " + o.pass + "/" + o.total).join(", ");
  console.log(rec.tier, "| class", rec.triage_class, "| A", JSON.stringify(rec.readers && rec.readers.a && { d: rec.readers.a.doors, i: rec.readers.a.items }), "B", JSON.stringify(rec.readers && rec.readers.b && { d: rec.readers.b.doors, i: rec.readers.b.items }), "| agree", rec.agreement_rate, "(" + rec.rows_agreed + "/" + rec.rows_total + ") | oracles", or || "none", "|", Math.round((rec.ms || 0) / 1000) + "s", rec.error || "");
}
const kept = existsSync(queueFile) ? readFileSync(queueFile, "utf8").split("\n").filter(Boolean).filter((l) => { try { return !done.has(JSON.parse(l).sha16); } catch (_) { return false; } }) : [];
writeFileSync(queueFile, kept.concat(queueNew.map((q) => JSON.stringify(q))).join("\n") + "\n");
console.log("truth records:", done.size, "queue lines:", kept.length + queueNew.length, "(" + queueNew.length + " from this run)");
