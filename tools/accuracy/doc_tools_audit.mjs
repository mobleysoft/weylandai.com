// The six tools that were taken off sale on 2026-10-08 (fix 7) and listed again, each run live on
// its audit documents (2026-10-09). A tool stays on sale only while this passes; a failure here
// is the reason a card says NOT SOLD YET.
//
//   DrawX     POST /api/drawing-index/analyze   Fayette GA 2419 Addendum 1, 21 sheets at 36 x 24: every sheet numbered and titled
//   AsBuiltX  POST /api/asbuilt-diffs/analyze   two Fayette sheets: the same sheet against itself ~0%, two different sheets > 0%
//   SpecX     POST /api/spec-sections/analyze   Berryessa bid manual, 288 pages: CSI sections found, 08 71 00 among them
//   InspecX   POST /api/inspections/analyze     FCMAT Mayacamas FIT inspection letter, 9 pages (scanned pages OCR'd): deficiencies found
//   SurvX     POST /api/survey-reports/analyze  NSW Newcastle pre-construction dilapidation report, 289 pages: finishes, no error
//   PriceX    POST /api/forms/pricex/session/:id  Berryessa and Rockford hardware read by SubX, priced from the makers' books
//
// The field reports are public documents fetched from their sources at run time (they are large and
// not ours to redistribute); the plan set and the bid sets are in tools/corpus.
//
// Usage: node tools/accuracy/doc_tools_audit.mjs --token-file <path> [--only drawx,specx] [--base https://weylandai.com]
// The token is a paying test account's AuthFor bearer token (never printed). Writes
// doc_tools_audit_<stamp>.json and .md next to this file.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const ONLY = args.only ? String(args.only).split(",") : null;
const H = { Authorization: "Bearer " + TOKEN };
const { PDFDocument } = createRequire(join(REPO, "weyland-forms-worker/"))("pdf-lib");

const FAYETTE = join(REPO, "tools/corpus/plan-sets/fayette_ga_2419_addendum1_plans.pdf");
const BERRYESSA = join(REPO, "tools/corpus/door-schedules/dd339f57b51538ed.pdf");
const ROCKFORD = join(REPO, "tools/corpus/door-schedules/f0e863d88ea688ff.pdf");
const FCMAT = "https://www.fcmat.org/PublicationsReports/Mayacamas%20Countywide%20Middle%20School%20FIT%20Inspection%20Letter.pdf";
const NSW = "https://www.schoolinfrastructure.nsw.gov.au/content/dam/infrastructure/projects/n/newcastle-education-campus/2024/april/B5__Newcastle_HSR_Pre-Construction_Dilapidation_Report_-_Council_Infrastructure_210224.pdf";

const cacheDir = join(tmpdir(), "weyland-doc-audit");
async function fetched(url) {
  mkdirSync(cacheDir, { recursive: true });
  const f = join(cacheDir, Buffer.from(url).toString("base64url").slice(-60) + ".pdf");
  if (!existsSync(f)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("source HTTP " + r.status + " for " + url);
    writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return readFileSync(f);
}
const pdfPages = async (bytes) => (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
async function onePage(bytes, i) {
  const src = await PDFDocument.load(bytes);
  const d = await PDFDocument.create();
  const [p] = await d.copyPages(src, [i]);
  d.addPage(p);
  return Buffer.from(await d.save());
}

// The docs worker's page jobs: POST analyze, then poll the job until it is done.
async function analyze(api, bytes, name, fields = {}) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const t0 = Date.now();
  let r = await fetch(BASE + "/api/" + api + "/analyze", { method: "POST", headers: H, body: fd });
  let d = await r.json().catch(() => ({}));
  while ((r.status === 202 || d.status === "running") && Date.now() - t0 < 15 * 60000) {
    await new Promise((s) => setTimeout(s, 5000));
    r = await fetch(BASE + d.statusUrl, { headers: H });
    d = await r.json().catch(() => ({}));
  }
  return { status: r.status, seconds: Math.round((Date.now() - t0) / 1000), d };
}

const results = [];
const want = (id) => !ONLY || ONLY.includes(id);
async function audit(id, label, doc, fn) {
  if (!want(id)) return;
  const e = { id, label, doc, pass: false };
  try { Object.assign(e, await fn()); } catch (err) { e.error = String(err.message || err).slice(0, 300); }
  results.push(e);
  console.log((e.pass ? "PASS " : "FAIL ") + label + ": " + (e.summary || e.error || ""));
}

await audit("drawx", "DrawX", "Fayette GA 2419 Addendum 1 plans (36 x 24)", async () => {
  const bytes = readFileSync(FAYETTE);
  const pages = await pdfPages(bytes);
  const r = await analyze("drawing-index", bytes, "fayette.pdf", { projectName: "Fayette audit" });
  const sheets = r.d.sheets || [];
  const named = sheets.filter((s) => s.number && s.title);
  return { http: r.status, seconds: r.seconds, pages, sheets: sheets.length, numbered_and_titled: named.length, sample: sheets.slice(0, 5).map((s) => (s.number || "-") + " " + (s.title || "")),
    pass: r.status === 200 && named.length === pages, summary: named.length + " of " + pages + " sheets numbered and titled, " + r.seconds + " s" };
});

await audit("asbuiltx", "AsBuiltX", "Fayette sheets 14 and 15 (A3.2, A4.1)", async () => {
  const bytes = readFileSync(FAYETTE);
  const pair = async (a, b) => {
    const fd = new FormData();
    fd.append("original", new Blob([await onePage(bytes, a)], { type: "application/pdf" }), "o.pdf");
    fd.append("revised", new Blob([await onePage(bytes, b)], { type: "application/pdf" }), "r.pdf");
    fd.append("projectName", "Fayette audit"); fd.append("sheetLabel", "A3.2"); fd.append("page", "1");
    const t0 = Date.now();
    const r = await fetch(BASE + "/api/asbuilt-diffs/analyze", { method: "POST", headers: H, body: fd });
    const d = await r.json().catch(() => ({}));
    return { http: r.status, seconds: Math.round((Date.now() - t0) / 1000), diff_pct: d.overallDiffPercent, error: d.error };
  };
  const same = await pair(13, 13), diff = await pair(13, 14);
  return { same_sheet: same, different_sheets: diff,
    pass: same.http === 200 && diff.http === 200 && Number(same.diff_pct) < 0.5 && Number(diff.diff_pct) > Number(same.diff_pct),
    summary: "same sheet " + same.diff_pct + "%, different sheets " + diff.diff_pct + "% (" + same.seconds + " s, " + diff.seconds + " s)" };
});

await audit("specx", "SpecX", "Berryessa Bid B-09-2023-24 manual (288 pages)", async () => {
  const bytes = readFileSync(BERRYESSA);
  const r = await analyze("spec-sections", bytes, "berryessa.pdf", { projectName: "Berryessa audit" });
  const secs = r.d.sections || [];
  const hw = secs.find((s) => /^08\s*71\s*00/.test(String(s.number || "")));
  return { http: r.status, seconds: r.seconds, sections: secs.length, door_hardware: hw ? { number: hw.number, title: hw.title, page: hw.page } : null, list: secs.map((s) => s.number + " " + (s.title || "") + " p" + s.page),
    pass: r.status === 200 && secs.length >= 10 && !!hw, summary: secs.length + " CSI sections" + (hw ? ", 08 71 00 on p." + hw.page : ", no 08 71 00") + ", " + r.seconds + " s" };
});

await audit("inspecx", "InspecX", "FCMAT Mayacamas FIT inspection letter (9 pages)", async () => {
  const bytes = await fetched(FCMAT);
  const r = await analyze("inspections", bytes, "fcmat.pdf", { projectName: "Mayacamas audit" });
  const flagged = r.d.flagged || r.d.deficiencies || [];
  return { http: r.status, seconds: r.seconds, pages: r.d.documentPages, ocr_pages: r.d.ocrPages, deficiencies: flagged.length, sample: flagged.slice(0, 5).map((f) => "p" + f.page + " " + String(f.line || f.text || "").slice(0, 90)),
    pass: r.status === 200 && flagged.length > 0, summary: flagged.length + " deficiencies over " + (r.d.documentPages || "?") + " pages (" + (r.d.ocrPages || 0) + " OCR'd), " + r.seconds + " s" };
});

await audit("survx", "SurvX", "NSW Newcastle pre-construction dilapidation report (289 pages)", async () => {
  const bytes = await fetched(NSW);
  const r = await analyze("survey-reports", bytes, "nsw.pdf", { projectName: "Newcastle audit" });
  const flagged = r.d.flagged || [];
  const legend = flagged.filter((f) => /ranges from \d+\s*mm/i.test(String(f.line || "")));
  return { http: r.status, seconds: r.seconds, pages: r.d.documentPages, findings: flagged.length, legend_lines_flagged: legend.length, sample: flagged.slice(0, 5).map((f) => "p" + f.page + " " + String(f.line || "").slice(0, 90)),
    pass: r.status === 200 && (r.d.documentPages || 0) >= 289 && legend.length === 0, summary: (r.d.documentPages || "?") + " pages read, " + flagged.length + " findings, grading legend not flagged: " + (legend.length === 0) + ", " + r.seconds + " s" };
});

// PriceX: the bid set's hardware read by SubX's own requests, then priced.
async function pricexOn(file, expectedGroups, label) {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(file)], { type: "application/pdf" }), label + ".pdf");
  fd.append("projectName", "pricex audit " + label);
  fd.append("document_type", "door_schedule");
  const up = await (await fetch(BASE + "/api/hardware-schedule/start", { method: "POST", headers: H, body: fd })).json();
  const sid = up.sessionId;
  try {
    const pages = JSON.parse(readFileSync(join(REPO, "tools/corpus/expected", expectedGroups), "utf8")).source.pages.map((page) => ({ page, type: "hardware_schedule" }));
    await fetch(BASE + "/api/hardware-schedule/session/" + sid + "/read-pages", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ pages }) });
    const t0 = Date.now();
    const r = await fetch(BASE + "/api/forms/pricex/session/" + sid, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json().catch(() => ({}));
    // Each line says priced (with its basis and book) or not, with its reason; schedule notes are listed, not priced.
    const lines = (d.lines || []).filter((l) => !l.scheduleNote);
    const priced = lines.filter((l) => l.priced);
    const exact = priced.filter((l) => l.basis === "exact");
    const csv = await fetch(BASE + "/api/forms/pricex/session/" + sid + "/csv", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "{}" });
    return { http: r.status, seconds: Math.round((Date.now() - t0) / 1000), lines: lines.length, priced: priced.length, exact: exact.length, unpriced_with_reason: lines.filter((l) => !l.priced && l.reason).length, csv_http: csv.status, totals: d.totals || null, books: [...new Set(priced.map((l) => l.book))] };
  } finally {
    await fetch(BASE + "/api/hardware-schedule/session/" + sid, { method: "DELETE", headers: H });
  }
}
await audit("pricex", "PriceX", "Berryessa and Rockford hardware groups (read by SubX)", async () => {
  const berry = await pricexOn(BERRYESSA, "berryessa-087100-hardware-groups.json", "berryessa");
  const rock = await pricexOn(ROCKFORD, "rockford-087100-hardware-groups.json", "rockford");
  const honest = (x) => x.http === 200 && x.lines > 0 && x.priced > 0 && x.priced + x.unpriced_with_reason === x.lines && x.csv_http === 200;
  return { berryessa: berry, rockford: rock, pass: honest(berry) && honest(rock),
    summary: "Berryessa " + berry.priced + " of " + berry.lines + " lines priced (" + berry.exact + " exact); Rockford " + rock.priced + " of " + rock.lines + " (" + rock.exact + " exact); every unpriced line says why: " + (honest(berry) && honest(rock)) };
});

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const md = ["# The six relisted tools on their audit documents, " + stamp, "", "Live API " + BASE + ", as a paying test account. Pass = the bar in tools/accuracy/doc_tools_audit.mjs.", "",
  "| tool | document | result | numbers |", "|---|---|---|---|",
  ...results.map((e) => "| " + e.label + " | " + e.doc + " | " + (e.pass ? "PASS" : "FAIL") + " | " + (e.summary || e.error || "") + " |"), ""];
writeFileSync(join(here, "doc_tools_audit_" + stamp + ".json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
writeFileSync(join(here, "doc_tools_audit_" + stamp + ".md"), md.join("\n"));
console.log(md.join("\n"));
