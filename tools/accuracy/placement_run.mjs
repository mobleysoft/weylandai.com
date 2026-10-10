#!/usr/bin/env node
// node tools/accuracy/placement_run.mjs [--dir downloads] [--only sha16,...]
//   [--tiers agreed,exact,audited,oracle-checked] [--check] [--out directory]
// --check reads baselines from Git HEAD, never from regenerated working-tree files,
// and does not write records. New sets are measured but explicitly have no baseline.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, basename, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { openPdf } from "./truth/pdf.mjs";
import { loadPages, readSchedules } from "./truth/load_set.mjs";
import { buildPlacement, DEFAULT_TIERS, stableJSON, sightXReady, placementTotals, placementRegressions } from "./placement.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RECORDS = "tools/corpus/harvest/placement";

export function committedPlacements(repo) {
  const names = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", RECORDS], { cwd: repo, encoding: "utf8" });
  return names.trim().split("\n").filter((f) => /\/[0-9a-f]{16}\.json$/.test(f)).map((f) =>
    JSON.parse(execFileSync("git", ["show", "HEAD:" + f], { cwd: repo, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })));
}

function pdfFile(truth, dir, repo) {
  const candidates = [join(dir, truth.sha16 + ".pdf")];
  if (truth.file) {
    candidates.push(join(dir, basename(truth.file)));
    // Audited and synthetic truth records can live in the checked-in corpus.
    const local = resolve(repo, truth.file), rel = relative(repo, local);
    if (!rel.startsWith("..") && !isAbsolute(rel)) candidates.push(local);
  }
  const file = candidates.find(existsSync);
  if (!file) throw new Error("PDF missing: " + candidates.join(" or "));
  return file;
}

export async function runPlacement({ repo = REPO, dir = join(repo, "tools/corpus/harvest/downloads"),
  out = join(repo, RECORDS), tiers = DEFAULT_TIERS, only = null, check = false, log = console.log } = {}) {
  const started = new Date().toISOString(), t0 = performance.now();
  const selected = (r) => tiers.includes(r.tier) && (!only || only.includes(r.sha16));
  const truthDir = join(repo, "tools/corpus/harvest/truth");
  const truths = readdirSync(truthDir).filter((f) => /^[0-9a-f]{16}\.json$/.test(f)).sort()
    .map((f) => JSON.parse(readFileSync(join(truthDir, f), "utf8")));
  const eligible = truths.filter((r) => selected(r) && r.oracles?.marks_on_plan?.applicable);
  const committed = check ? committedPlacements(repo).filter((r) => selected(r.set)) : [];
  const records = [], timings = [], errors = [];
  for (const sha of only || []) {
    if (!truths.some((r) => r.sha16 === sha)) errors.push(sha + ": no truth record");
    else if (!eligible.some((r) => r.sha16 === sha)) log(sha + ": skipped (tier or marks_on_plan not applicable)");
  }
  if (!check) mkdirSync(out, { recursive: true });
  log(`Started ${started}; eligible sets: ${eligible.length}`);
  for (const truth of eligible) {
    const start = performance.now();
    let pdf, record;
    try {
      const file = pdfFile(truth, dir, repo), bytes = readFileSync(file);
      const sha = createHash("sha256").update(bytes).digest("hex");
      if (sha.slice(0, 16) !== truth.sha16 || (truth.sha256 && sha !== truth.sha256)) throw new Error("PDF content hash differs from truth record");
      pdf = await openPdf(bytes);
      if (pdf.numPages > 1200) throw new Error("more than 1200 pages (truth loader default limit)");
      const pages = await loadPages(pdf);
      const { doorsA, readerNotes } = await readSchedules(pdf, pages, { file, readerB: false, hardware: false });
      if (readerNotes.length) throw new Error(readerNotes.join("; "));
      record = buildPlacement(truth, pages, doorsA);
      if (!check) writeFileSync(join(out, truth.sha16 + ".json"), stableJSON(record));
      records.push(record);
    } catch (e) {
      errors.push(truth.sha16 + ": " + e.message);
    } finally {
      try { if (pdf) await (pdf.destroy ? pdf.destroy() : pdf.loadingTask?.destroy()); } catch (_) { /* gone */ }
    }
    const ms = +(performance.now() - start).toFixed(3);
    timings.push({ sha16: truth.sha16, ms });
    log(`${truth.sha16}: ${record ? `${record.summary.marks_placed}/${record.summary.marks_total}; SightX-ready=${sightXReady(record)}` : "FAILED"}; ${ms} ms`);
  }
  if (check) {
    errors.push(...placementRegressions(records, committed));
    const baseline = new Set(committed.map((r) => r.set.sha16));
    log(`Check: ${committed.length} committed baselines; ${records.filter((r) => !baseline.has(r.set.sha16)).length} new sets without a committed baseline`);
  }
  for (const error of errors) log("ERROR: " + error);
  const result = { started, finished: new Date().toISOString(), ms: +(performance.now() - t0).toFixed(3),
    eligible: eligible.length, ...placementTotals(records), timings, errors };
  log("Run totals: " + JSON.stringify(result));
  return result;
}

async function main() {
  const argv = process.argv.slice(2), options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") { options.check = true; continue; }
    if (!["--dir", "--out", "--only", "--tiers"].includes(arg) || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("Unknown option or missing value: " + arg);
    const value = argv[++i];
    options[arg.slice(2)] = ["--only", "--tiers"].includes(arg) ? value.split(",").map((s) => s.trim()).filter(Boolean) : resolve(value);
  }
  if (options.only?.some((s) => !/^[0-9a-f]{16}$/.test(s)) || options.only?.length === 0) throw new Error("--only requires comma-separated sha16 values");
  if (options.tiers?.some((s) => ![...DEFAULT_TIERS, "unread"].includes(s)) || options.tiers?.length === 0) throw new Error("Unknown or empty --tiers");
  const result = await runPlacement(options);
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack); process.exitCode = 1; });
}
