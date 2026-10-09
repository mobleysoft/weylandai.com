#!/usr/bin/env node
// tools/accuracy/truth_report.mjs - the per-tier truth report (2026-10-09).
//
// Reads every truth record in tools/corpus/harvest/truth/*.json (written by truth_run.mjs) and the
// queue, and writes tools/accuracy/truth_report_<stamp>[_<label>].md and .json: agreement rates and
// oracle pass rates per set and per family, split by truth tier and never pooled across tiers:
//   exact           synthetic sets from tools/bidset (truth in building.mjs)
//   audited         a person read the expected rows (tools/corpus/expected)
//   agreed          the two readers agreed on at least one row (the agreement rate is quoted)
//   oracle-checked  no agreed rows, but at least one oracle applies
//   unread          neither reader read a schedule or a hardware set
// Usage: node tools/accuracy/truth_report.mjs [--label <name>]
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const DIR = join(REPO, "tools/corpus/harvest/truth");
const argv = process.argv.slice(2);
const li = argv.indexOf("--label");
const LABEL = li >= 0 && argv[li + 1] ? "_" + argv[li + 1].replace(/[^A-Za-z0-9_-]/g, "") : "";
const recs = readdirSync(DIR).filter((f) => /^[0-9a-f]{16}\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));
const queue = existsSync(join(DIR, "queue.jsonl")) ? readFileSync(join(DIR, "queue.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
let head = "unknown";
try { head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); } catch (_) { /* not a checkout */ }

const TIERS = ["exact", "audited", "agreed", "oracle-checked", "unread"];
const ORC = [["marks_on_plan", "a"], ["sets_exist", "b"], ["set_door_lists", "c"], ["types_in_legend", "d"], ["sizes_and_marks", "e"]];
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + "%" : "n/a");
const frac = (n, d) => (d ? n + "/" + d + " (" + pct(n, d) + ")" : "n/a");
const short = (r) => r.file.replace(/^tools\/corpus\//, "").replace(/^tools\/bidset\/out\//, "bidset/");
const fieldAgree = (r) => { let a = 0, t = 0; for (const k of ["doors", "items"]) for (const v of Object.values((r.agreement && r.agreement[k] && r.agreement[k].fields) || {})) { a += v.agree; t += v.total; } return [a, t]; };
const orcCell = (r) => ORC.map(([k, s]) => { const o = (r.oracles || {})[k]; return o && o.applicable ? s + " " + o.pass + "/" + o.total : s + " -"; }).join(", ");
const qOf = (r) => queue.filter((q) => q.sha16 === r.sha16).length;

const md = [];
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
md.push("# Truth report, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "");
md.push("Harness: tools/accuracy/truth_run.mjs at " + head + ". Records: tools/corpus/harvest/truth/<sha16>.json (" + recs.length + "), queue: tools/corpus/harvest/truth/queue.jsonl (" + queue.length + " lines).", "");
md.push("Reader A is the production text-layer reader (weyland-subx-worker/src/lib/text-layer-read.js, called as SubX's server calls it). Reader B is the second reader, geometry first (tools/accuracy/truth/reader_b.mjs: door schedules from the page's ruled lines, hardware groups from column fences). A row is AGREED when both readers read it and every compared field agrees after normalisation (doors: width, height, door type, material, fire rating, hardware set, location; items: qty, description, catalog, finish, maker); every other row is DISPUTED and goes to the queue. Oracles run over reader A's rows (the product's read): a marks on a floor plan, b schedule sets exist in 08 71 00, c each set's door list equals the schedule's doors with that set, d door/frame types in a legend, e sizes parse and marks follow the sheet's shape. Numbers per tier, never pooled.", "");
const harvest = recs.filter((r) => r.source === "harvest");
if (!harvest.length) md.push("**The harvest set has not been run yet.** Its PDFs are in the private R2 bucket weyland-fixtures under harvest/<sha16>.pdf, which this session cannot reach (no Cloudflare credentials, by design). To run it: pull the objects into a folder and run `node tools/accuracy/truth_run.mjs --dir <folder>`, then this report. Every number below is from tools/corpus and tools/bidset/out only.", "");
else md.push("Harvest PDFs in this report: " + harvest.length + ".", "");

const summary = { stamp, head, records: recs.length, queue: queue.length, tiers: {} };
for (const tier of TIERS) {
  const rs = recs.filter((r) => r.tier === tier).sort((a, b) => (a.family || "").localeCompare(b.family || "") || short(a).localeCompare(short(b)));
  md.push("## Tier: " + tier + " (" + rs.length + " PDF" + (rs.length === 1 ? "" : "s") + ")", "");
  if (!rs.length) { md.push("None.", ""); continue; }
  md.push("| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |", "|---|---|---|---|---|---|---|---|---|---|");
  const fam = new Map();
  for (const r of rs) {
    const [fa, ft] = fieldAgree(r);
    const p = r.pages || {};
    md.push("| " + short(r) + " (" + r.sha16 + ") | " + (r.family || "") + " | " + r.triage_class + " | " + ((p.door_schedule_pages || []).join(",") || "-") + " / " + ((p.hardware_pages || []).join(",") || "-") + " | " + (r.readers ? r.readers.a.doors + " / " + r.readers.a.items : "-") + " | " + (r.readers ? r.readers.b.doors + " / " + r.readers.b.items : "-") + " | " + frac(r.rows_agreed || 0, r.rows_total || 0) + " | " + frac(fa, ft) + " | " + orcCell(r) + " | " + qOf(r) + " |");
    const f = fam.get(r.family) || { pdfs: 0, agreed: 0, total: 0, fa: 0, ft: 0, orc: {}, queue: 0 };
    f.pdfs++; f.agreed += r.rows_agreed || 0; f.total += r.rows_total || 0; f.fa += fa; f.ft += ft; f.queue += qOf(r);
    for (const [k] of ORC) { const o = (r.oracles || {})[k]; if (o && o.applicable) { const x = (f.orc[k] ||= { pass: 0, total: 0 }); x.pass += o.pass; x.total += o.total; } }
    fam.set(r.family, f);
  }
  md.push("", "Per family (" + tier + "):", "", "| family | PDFs | rows agreed | field agreement | " + ORC.map(([k, s]) => s + " " + k).join(" | ") + " | queue |", "|---|---|---|---|" + ORC.map(() => "---|").join("") + "---|");
  for (const [name, f] of fam) md.push("| " + name + " | " + f.pdfs + " | " + frac(f.agreed, f.total) + " | " + frac(f.fa, f.ft) + " | " + ORC.map(([k]) => (f.orc[k] ? frac(f.orc[k].pass, f.orc[k].total) : "-")).join(" | ") + " | " + f.queue + " |");
  const tAgreed = rs.reduce((n, r) => n + (r.rows_agreed || 0), 0), tTotal = rs.reduce((n, r) => n + (r.rows_total || 0), 0);
  summary.tiers[tier] = { pdfs: rs.length, rows_agreed: tAgreed, rows_total: tTotal, queue: rs.reduce((n, r) => n + qOf(r), 0), families: Object.fromEntries(fam) };
  md.push("", "Tier total: rows agreed " + frac(tAgreed, tTotal) + "; queue " + summary.tiers[tier].queue + ".", "");
  for (const r of rs) {
    const notes = [];
    for (const [k] of ORC) { const o = (r.oracles || {})[k]; if (o && o.applicable && o.fail) notes.push(k + ": " + o.examples.slice(0, 3).join("; ")); }
    if (r.unread_reason) notes.push(r.unread_reason);
    if (r.note) notes.push(r.note);
    if (notes.length) md.push("- " + short(r) + ": " + notes.join(" | ").replace(/\|/g, "/"));
  }
  md.push("");
}

// Calibration.
md.push("## Calibration: the agreement method against expected rows", "");
md.push("For the exact (synthetic) and audited PDFs each reader, and the agreed rows, are scored against the expected rows (rows found, rows with every field right, fields right). 'Agreed fields' is the question the method stands on: of the fields both readers read the same, how many are right; 'disputed fields' says which reader was right where they differ. An addendum's struck value (expected 'superseded') counts as right, as in schedule_read_accuracy.mjs.", "");
md.push("Caveat: reader B was written and tuned on these same audited files (Rockford, Berryessa, Christina) and the synthetic set during this build, so its numbers here are in-sample. The harvest is its out-of-sample test.", "");
md.push("| tier | PDF | expected | reader A rows found / fully right / fields | reader B rows found / fully right / fields | agreed rows found / fully right | agreed fields right | disputed fields: A right / B right / neither |", "|---|---|---|---|---|---|---|---|");
const calTot = {};
for (const tier of ["exact", "audited"]) for (const r of recs.filter((x) => x.tier === tier)) {
  if (!r.calibration || !r.calibration.length) { md.push("| " + tier + " | " + short(r) + " | (truth exists, nothing read: " + (r.note || r.unread_reason || "no rows") + ") | | | | | |"); continue; }
  for (const c of r.calibration) {
    const s = (x) => x.rows_found + "/" + x.expected_rows + " / " + x.rows_fully_right + " / " + frac(x.fields_right, x.fields_total);
    const f = c.fields || { agreed: { right: 0, total: 0 }, disputed: { total: 0, a_right: 0, b_right: 0, neither: 0 } };
    md.push("| " + tier + " | " + short(r) + " | " + c.expected + " | " + s(c.reader_a) + " | " + s(c.reader_b) + " | " + c.agreed.rows_found + "/" + c.agreed.expected_rows + " / " + c.agreed.rows_fully_right + " | " + frac(f.agreed.right, f.agreed.total) + " | " + f.disputed.a_right + " / " + f.disputed.b_right + " / " + f.disputed.neither + " of " + f.disputed.total + " |");
    const t = (calTot[tier] ||= { ar: 0, at: 0, rowsAgreedFound: 0, rowsAgreedRight: 0, dis: 0, disA: 0, disB: 0, disN: 0 });
    t.ar += f.agreed.right; t.at += f.agreed.total; t.rowsAgreedFound += c.agreed.rows_found; t.rowsAgreedRight += c.agreed.rows_fully_right; t.dis += f.disputed.total; t.disA += f.disputed.a_right; t.disB += f.disputed.b_right; t.disN += f.disputed.neither;
  }
}
md.push("");
for (const [tier, t] of Object.entries(calTot)) md.push("- " + tier + ": agreed rows fully right " + frac(t.rowsAgreedRight, t.rowsAgreedFound) + "; agreed fields right " + frac(t.ar, t.at) + "; disputed fields " + t.dis + " (A right " + t.disA + ", B right " + t.disB + ", neither " + t.disN + ").");
for (const r of recs.filter((x) => x.calibration)) for (const c of r.calibration) for (const w of ((c.fields && c.fields.agreed_wrong) || []).slice(0, 5)) md.push("  - agreed but wrong, " + short(r) + " " + c.expected + ": " + w.key + " " + w.field + " expected " + JSON.stringify(w.expected) + ", both read " + JSON.stringify(w.agreed));
summary.calibration = calTot;
md.push("");

// Queue.
md.push("## Queue", "");
md.push("tools/corpus/harvest/truth/queue.jsonl: " + queue.length + " disagreements (one line per field a reader pair read differently, per row only one reader read, or per set whose door lists differ).", "");
const byTier = {}, byField = {};
for (const q of queue) { byTier[q.tier] = (byTier[q.tier] || 0) + 1; const k = q.kind + " " + q.field; byField[k] = (byField[k] || 0) + 1; }
md.push("- by tier: " + Object.entries(byTier).map(([k, v]) => k + " " + v).join(", "));
md.push("- by kind and field: " + Object.entries(byField).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", "));
md.push("");
md.push("## Not done here", "");
md.push("- The harvest (R2 weyland-fixtures harvest/<sha16>.pdf) " + (harvest.length ? "is partly included (" + harvest.length + " PDFs)." : "has not been run: not reachable from this session."));
md.push("- OCC A-801 (audited) " + (recs.some((r) => /occ/i.test(r.family || "")) ? "is included." : "is not included: OCC_PDF was not set and the file is not in the repo (private fixture)."));
md.push("- Scanned pages (no text layer) are not read by either reader here; production sends them to the browser OCR path, which this harness does not run (no OCR engine in this environment). The scanned rendering of the synthetic set is listed with no rows for that reason.");
md.push("- The 2% human spot check of agreed rows (to catch both readers wrong the same way) is not part of this run.");
md.push("- tools/corpus/harvest/triage.json " + (existsSync(join(REPO, "tools/corpus/harvest/triage.json")) ? "was used for triage classes." : "does not exist yet: classes are inferred (complete = schedule + hardware sets + plan sheet, pair = schedule + sets, schedule-only, spec-only, plan-only, none)."));
md.push("");
const out = join(here, "truth_report_" + stamp + LABEL);
writeFileSync(out + ".md", md.join("\n"));
writeFileSync(out + ".json", JSON.stringify(summary, null, 1) + "\n");
console.log(md.join("\n"));
console.log("\nwritten " + out + ".md");
