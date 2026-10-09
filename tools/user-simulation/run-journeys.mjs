// tools/user-simulation/run-journeys.mjs
//
// Runs every journey test (signin-journey.mjs plus journeys/*.mjs) against production, one at a
// time, N passes round-robin (pass 1 runs all of them, then pass 2, ...), and prints which journeys
// passed every check in every pass. Repeating is the point: a journey "works" when it is green on
// every repeat, not once.
//
// Usage (from the repo root):
//   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node tools/user-simulation/run-journeys.mjs [--passes 3] [--only id1,id2]
//
// Each run's output goes to reports/matrix-<stamp>/p<pass>-<id>.log, one JSON line per run to
// reports/matrix-<stamp>/results.jsonl (written as it goes, so an interrupted matrix keeps what
// it ran), and the journeys' own reports to reports/ as usual (reports/ is not committed).
// Each journey deletes what it creates; checkout steps stop at Stripe's loaded form (each press
// leaves one live Checkout Session to expire) and nothing sends email except code-sign-in and
// reset-in-page (one email each, to a new jmobleyworks+<tag>@gmail.com alias of John's).
// Exit code 0 only if every run of every journey passed.
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const REPO = path.resolve(HERE, "../..");
const REPORTS = path.join(HERE, "reports");

const arg = (name, dflt) => { const i = process.argv.indexOf("--" + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const PASSES = Math.max(1, parseInt(arg("passes", "3"), 10) || 3);
const ONLY = String(arg("only", "")).split(",").map((s) => s.trim()).filter(Boolean);
const PER_RUN_MS = 25 * 60 * 1000;

// The journey map's order (plan/evidence/weylandai_journey_map_20261007.json); journeys added
// later run after these.
const ORDER = ["first-result-no-account", "signin", "create-free-account", "free-trial-first-use", "subx-upload-to-submittal",
  "takeoffx-takeoff", "cutsheetx-finder-search", "sightx-corridor", "propx-proposal", "meetingx-room", "huntx-opportunities",
  "pricing-to-checkout", "account-view-signout", "overlay-products", "phone-key-journeys", "deep-link-login", "wirex-news", "forgot-password"];
const found = readdirSync(path.join(HERE, "journeys")).filter((f) => f.endsWith(".mjs")).map((f) => f.replace(/\.mjs$/, ""));
const all = ["signin", ...found];
let ids = [...ORDER.filter((id) => all.includes(id)), ...all.filter((id) => !ORDER.includes(id)).sort()];
if (ONLY.length) ids = ids.filter((id) => ONLY.includes(id));
if (!ids.length) { console.error("no journey matches --only " + ONLY.join(",")); process.exit(2); }

const scriptOf = (id) => id === "signin" ? path.join(HERE, "signin-journey.mjs") : path.join(HERE, "journeys", id + ".mjs");
const latestOf = (id) => path.join(REPORTS, id === "signin" ? "signin-journey-latest.json" : "journey-" + id + "-latest.json");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = path.join(REPORTS, "matrix-" + stamp);
mkdirSync(OUT, { recursive: true });
const RESULTS = path.join(OUT, "results.jsonl");

function runOne(id, pass) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.CF_API_KEY; // the journeys' cleanup runs wrangler; same environment as the repo's deploy steps
    const t0 = Date.now();
    const log = createWriteStream(path.join(OUT, "p" + pass + "-" + id + ".log"));
    const child = spawn(process.execPath, [scriptOf(id)], { cwd: REPO, env });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, PER_RUN_MS);
    child.on("close", (code) => { clearTimeout(timer); log.end(); resolve({ code, timedOut, t0, t1: Date.now() }); });
  });
}

function readReport(id, t0) {
  const f = latestOf(id);
  if (!existsSync(f)) return { error: "no report written" };
  let r;
  try { r = JSON.parse(readFileSync(f, "utf8")); } catch (e) { return { error: "report unreadable" }; }
  if (!(Date.parse(r.started_at || "") >= t0 - 5000)) return { error: "no report from this run (latest is from " + r.started_at + ")" };
  const checks = r.checks || [];
  return {
    started_at: r.started_at,
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    failed: checks.filter((c) => !c.ok).map((c) => ({ name: c.name, detail: String(c.detail || "").slice(0, 400) }))
  };
}

const rows = [];
for (let pass = 1; pass <= PASSES; pass++) {
  for (const id of ids) {
    const res = await runOne(id, pass);
    const rep = readReport(id, res.t0);
    const green = res.code === 0 && !rep.error && rep.failed.length === 0;
    const row = { pass, id, green, exit: res.code, timedOut: res.timedOut, at: new Date(res.t0).toISOString(), seconds: Math.round((res.t1 - res.t0) / 1000), ...rep };
    rows.push(row);
    appendFileSync(RESULTS, JSON.stringify(row) + "\n");
    console.log("pass " + pass + "  " + id.padEnd(26) + (green ? "PASS " : "FAIL ") + (rep.error ? rep.error : rep.passed + "/" + rep.total) + "  " + row.seconds + " s" +
      (rep.failed && rep.failed.length ? "  - " + rep.failed.map((f) => f.name).join(" | ") : ""));
  }
}

console.log("\nJourney".padEnd(28) + "runs passed  failing checks");
const summary = ids.map((id) => {
  const mine = rows.filter((r) => r.id === id);
  const green = mine.filter((r) => r.green).length;
  const failing = [...new Set(mine.flatMap((r) => r.error ? [r.error] : r.failed.map((f) => f.name)))];
  console.log(id.padEnd(27) + (green + "/" + mine.length).padEnd(13) + failing.join(" | "));
  return { id, runs: mine.length, green, failing };
});
// Truth at scale (tools/accuracy/truth_report.mjs): the reading's accuracy per truth tier, never pooled
// (exact = synthetic, audited = read by a person, agreed = two readers agree, oracle-checked, unread).
let truth = null;
try {
  const acc = path.join(REPO, "tools/accuracy");
  const last = readdirSync(acc).filter((f) => /^truth_report_.*\.json$/.test(f)).sort().pop();
  if (last) {
    const t = JSON.parse(readFileSync(path.join(acc, last), "utf8"));
    truth = { report: "tools/accuracy/" + last, records: t.records, queue: t.queue, tiers: {}, calibration: t.calibration || null };
    console.log("\nTruth tiers (" + last + "): " + t.records + " PDFs, disagreement queue " + t.queue);
    for (const [tier, v] of Object.entries(t.tiers || {})) {
      truth.tiers[tier] = { pdfs: v.pdfs, rows_agreed: v.rows_agreed, rows_total: v.rows_total, agreement: v.rows_total ? +(v.rows_agreed / v.rows_total).toFixed(3) : null, queue: v.queue, families: v.families };
      console.log("  " + tier.padEnd(15) + String(v.pdfs).padStart(3) + " PDFs  rows agreed " + v.rows_agreed + "/" + v.rows_total + "  queue " + v.queue);
      for (const [fam, f] of Object.entries(v.families || {})) {
        const orc = Object.entries(f.orc || {}).map(([k, o]) => k + " " + o.pass + "/" + o.total).join(", ");
        console.log("    " + fam.padEnd(28) + " agreed " + f.agreed + "/" + f.total + (orc ? "  oracles " + orc : ""));
      }
    }
  }
} catch (e) { console.log("truth report unreadable: " + e.message); }
writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ started: stamp, passes: PASSES, summary, truth, rows }, null, 2));
console.log("\nresults: " + path.relative(REPO, OUT));
process.exit(rows.every((r) => r.green) ? 0 : 1);
