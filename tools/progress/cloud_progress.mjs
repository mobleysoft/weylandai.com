#!/usr/bin/env node
// Cloud-session progress tracker (2026-10-09). John routed the WeylandAI build work through a
// cloud Claude Code session; this Mac session directs and verifies. This command shows, in one
// place and without any model usage, what the cloud session has landed since the last check and
// what the measurements say, so direction is based on evidence rather than on what a session says.
//
// It reads: git (origin/main of this repo), the GitHub CLI (merged PRs, Actions runs), each
// Worker's latest deployment (wrangler), the latest accuracy and journey reports in this repo, and
// the cloud session's own request page (handoff.mobleysoft.com/claudecloud). It writes nothing to
// the product and never prints a credential. Run on demand; John's rule is no crons.
//
// Usage: node tools/progress/cloud_progress.mjs [--since <sha>] [--no-deploys] [--out <dir>]
//   The cursor (last seen commit) lives in ~/.local/state/weyland-cloud-progress/last_sha;
//   --since overrides it for one run. Reports go to <out>/<timestamp>.md
//   (default /Users/johnmobley/plan/evidence/cloud_progress) and are also printed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const REPO = resolve(new URL("../..", import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(name);
const OUT = opt("--out", "/Users/johnmobley/plan/evidence/cloud_progress");
const STATE = join(homedir(), ".local/state/weyland-cloud-progress");
mkdirSync(STATE, { recursive: true });
mkdirSync(OUT, { recursive: true });
const cursorFile = join(STATE, "last_sha");
const since = opt("--since", existsSync(cursorFile) ? readFileSync(cursorFile, "utf8").trim() : "");

const env = { ...process.env };
delete env.CF_API_KEY; // wrangler must not see the global key under this name
const sh = (cmd, cmdArgs, cwd = REPO, timeout = 120000) => {
  try { return execFileSync(cmd, cmdArgs, { cwd, env, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (e) { return `(failed: ${String(e.message).split("\n")[0].slice(0, 120)})`; }
};
const lines = [];
const say = (s = "") => lines.push(s);
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
say(`# Cloud session progress, ${now.toISOString()} (${sh("date", ["+%Y-%m-%d %H:%M %Z"])})`);
say();

// 1. Commits on origin/main since the cursor.
sh("git", ["fetch", "-q", "origin"]);
const head = sh("git", ["rev-parse", "--short", "origin/main"]);
const range = since ? `${since}..origin/main` : "origin/main";
const log = since
  ? sh("git", ["log", range, "--format=%h%x09%ad%x09%an%x09%s", "--date=format:%m-%d %H:%M"])
  : sh("git", ["log", "origin/main", "-15", "--format=%h%x09%ad%x09%an%x09%s", "--date=format:%m-%d %H:%M"]);
const commits = log && !log.startsWith("(failed") ? log.split("\n").filter(Boolean) : [];
say(`## 1. Commits on origin/main ${since ? `since ${since}` : "(last 15)"}: ${commits.length}; head ${head}`);
let cloud = 0, local = 0;
for (const c of commits) {
  const [h, when, author, subject] = c.split("\t");
  const who = /^Claude$/.test(author) ? "cloud" : "mac";
  if (who === "cloud") cloud++; else local++;
  say(`- ${h} ${when} [${who}] ${subject.slice(0, 120)}`);
}
say(`- cloud: ${cloud}, mac: ${local}`);
say();

// 2. Merged PRs and Actions runs.
say("## 2. GitHub");
const prs = sh("gh", ["pr", "list", "-R", "mobleysoft/weylandai.com", "--state", "merged", "--limit", "12", "--json", "number,title,mergedAt", "--jq", '.[] | "- #\\(.number) \\(.mergedAt[0:16]) \\(.title)"']);
say("Merged PRs, newest first (weylandai.com):"); say(prs || "- none");
const openPrs = sh("gh", ["pr", "list", "-R", "mobleysoft/weylandai.com", "--state", "open", "--json", "number,title,createdAt", "--jq", '.[] | "- #\\(.number) \\(.createdAt[0:16]) \\(.title)"']);
say("Open PRs:"); say(openPrs || "- none");
for (const repo of ["mobleysoft/weylandai.com", "mhslp/mhslp-production"]) {
  const runs = sh("gh", ["run", "list", "-R", repo, "-L", "4", "--json", "name,status,conclusion,createdAt,headSha", "--jq", '.[] | "- \\(.createdAt[0:16]) \\(.name) \\(.status) \\(.conclusion // "-") \\(.headSha[0:8])"']);
  say(`Actions runs, ${repo}:`); say(runs || "- none");
}
say();

// 3. Worker deployments (latest per worker directory with a wrangler.toml; slow, skip with --no-deploys).
say("## 3. Worker deployments (latest)");
if (flag("--no-deploys")) say("- skipped (--no-deploys)");
else {
  const dirs = readdirSync(REPO).filter((d) => /^weyland-.*-worker$/.test(d) && existsSync(join(REPO, d, "wrangler.toml")));
  dirs.push("ocr-worker");
  for (const d of dirs) {
    if (!existsSync(join(REPO, d, "wrangler.toml"))) continue;
    const out = sh("npx", ["wrangler", "deployments", "list"], join(REPO, d), 60000);
    const created = [...out.matchAll(/Created:\s+(\S+)/g)].map((m) => m[1]);
    const versions = [...out.matchAll(/\(100%\)\s+([0-9a-f-]{8})/g)].map((m) => m[1]);
    say(`- ${d}: ${created.length ? created[created.length - 1] : "?"} ${versions.length ? versions[versions.length - 1] : ""}`);
  }
}
say();

// 4. Latest measurements in this repo (history, not recomputed here).
say("## 4. Latest measurements (from committed or local reports)");
const acc = join(REPO, "tools/accuracy");
const newest = (re) => {
  const files = readdirSync(acc).filter((f) => re.test(f)).map((f) => ({ f, t: statSync(join(acc, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  return files[0] ? files[0].f : null;
};
const sched = newest(/^schedule_report_.*\.md$/);
if (sched) {
  say(`Reading (${sched}):`);
  for (const l of readFileSync(join(acc, sched), "utf8").split("\n")) if (/^\| (rockford|berryessa|occ|christina) /.test(l)) say(`  ${l.slice(0, 150)}`);
}
const match = newest(/^report_\d{4}-\d{2}-\d{2}.*\.md$/);
if (match) {
  const t = readFileSync(join(acc, match), "utf8");
  const rec = t.match(/recall[^|]*\|\s*([0-9.]+%)/i), prec = t.match(/precision[^|]*\|\s*([0-9.]+%)/i), fp = t.match(/false positives[^|]*\|\s*([0-9/]+)/i);
  say(`Matching (${match}): recall ${rec ? rec[1] : "?"}, precision ${prec ? prec[1] : "?"}, false positives ${fp ? fp[1] : "?"}`);
}
// Truth at scale (tools/accuracy/truth_report.mjs): agreement and oracle pass rates per truth tier, never pooled.
const truth = newest(/^truth_report_.*\.json$/);
if (truth) {
  const t = JSON.parse(readFileSync(join(acc, truth), "utf8"));
  say(`Truth tiers (${truth}): ${t.records} PDFs, queue ${t.queue}`);
  for (const [tier, v] of Object.entries(t.tiers || {})) say(`  - ${tier}: ${v.pdfs} PDFs, rows agreed ${v.rows_agreed}/${v.rows_total}, queue ${v.queue}`);
  for (const [tier, c] of Object.entries(t.calibration || {})) say(`  - calibration ${tier}: agreed fields right ${c.ar}/${c.at}, disputed fields ${c.dis} (A right ${c.disA}, B right ${c.disB})`);
}
const reports = join(REPO, "tools/user-simulation/reports");
if (existsSync(reports)) {
  const mats = readdirSync(reports).filter((d) => d.startsWith("matrix-")).sort();
  const last = mats[mats.length - 1];
  if (last && existsSync(join(reports, last, "results.jsonl"))) {
    const rows = readFileSync(join(reports, last, "results.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const by = new Map();
    for (const r of rows) by.set(r.id, [...(by.get(r.id) || []), r]);
    const allGreen = [...by.values()].filter((v) => v.every((r) => r.green)).length;
    say(`Journeys (${last}): ${by.size} journeys, ${allGreen} green in every pass, ${rows.filter((r) => r.green).length}/${rows.length} runs green`);
    for (const [id, v] of by) if (!v.every((r) => r.green)) say(`  - not green: ${id} (${v.map((r) => `${r.passed}/${r.total}`).join(", ")})`);
  }
}
say();

// 5. The cloud session's own request page.
say("## 5. Handoff page (handoff.mobleysoft.com/claudecloud)");
const page = sh("curl", ["-s", "-A", "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15", "https://handoff.mobleysoft.com/claudecloud/"]);
const text = page.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "\n").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const reqLines = text.split("\n").map((s) => s.trim()).filter((s) => /^Request \d/.test(s) || /^Updated/.test(s));
say(reqLines.length ? reqLines.map((s) => `- ${s.slice(0, 140)}`).join("\n") : "- page not readable");
say();

// 6. Where the brief's priorities stand (the brief is the ledger; this only points at it).
say("## 6. Brief of record");
say("- docs/direction-2026-10-08.md on origin/main: priorities 1 to 6 with finish lines; verified-state and journeys sections carry the last numbers.");
say("- To re-measure: node tools/accuracy/schedule_read_accuracy.mjs; node tools/accuracy/match_accuracy.mjs; node tools/user-simulation/run-journeys.mjs --passes 3 (GPU).");

const report = lines.join("\n") + "\n";
const outFile = join(OUT, `${stamp}.md`);
writeFileSync(outFile, report);
if (!head.startsWith("(failed")) writeFileSync(cursorFile, head + "\n");
process.stdout.write(report);
process.stdout.write(`\nwritten ${outFile}; cursor now ${head}\n`);
