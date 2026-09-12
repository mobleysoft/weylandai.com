#!/usr/bin/env node
// tools/user-simulation/run.mjs
//
// Real user-simulation harness for weylandai.com. Runs every product
// check against REAL production (https://weylandai.com by default -
// override with WEYLAND_BASE_URL) using real requests: a real AuthFor
// ephemeral trial token, a real throwaway logged-in D1 account (created
// and deleted for real, same technique already proven in
// EXTRACTION_PIPELINE_CUSTOMER_PATH.md), real sample PDFs from
// /Users/johnmobley/pdf/, and real calls to live government open-data
// APIs (HuntX) and the real weyland-market-intelligence-worker.
//
// Usage:
//   node tools/user-simulation/run.mjs
//   WEYLAND_BASE_URL=http://localhost:8787 node tools/user-simulation/run.mjs   (if ever run against a local dev worker)
//
// Output: writes a timestamped JSON report + Markdown summary to
// tools/user-simulation/reports/, and updates reports/latest.json /
// reports/latest.md to point at the most recent run. Nothing here is
// fabricated - every "working"/"broken"/"missing"/"gap" finding traces
// back to a real HTTP response captured in the same report's `steps`.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { mintEphemeralToken } from "./lib/ephemeral-auth.mjs";
import { createThrowawayAccount, deleteThrowawayAccount } from "./lib/throwaway-account.mjs";
import { BASE_URL } from "./lib/http.mjs";

import * as subxTakeoffx from "./checks/subx-takeoffx.mjs";
import * as propx from "./checks/propx.mjs";
import * as huntx from "./checks/huntx.mjs";
import * as meetingx from "./checks/meetingx.mjs";
import * as cutsheetx from "./checks/cutsheetx.mjs";
import * as sightx from "./checks/sightx.mjs";
import * as marketIntelligence from "./checks/market-intelligence.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPORTS_DIR = path.join(HERE, "reports");

function log(...args) {
  console.log(...args);
}

async function runCheck(mod, ctx, results) {
  const label = mod.product || mod.slug;
  log(`\n=== ${label} ===`);
  const startedAt = new Date().toISOString();
  try {
    const result = await mod.run(ctx);
    result.startedAt = startedAt;
    result.finishedAt = new Date().toISOString();
    result.error = null;
    for (const s of result.steps) {
      log(`  [${s.ok ? "OK  " : "FAIL"}] ${s.step} -> ${s.status ?? "-"} ${s.detail || ""}`);
    }
    results.push(result);
  } catch (err) {
    log(`  [CRASH] ${label}: ${err.stack || err.message}`);
    results.push({
      product: label,
      slug: mod.slug,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: err.message,
      steps: [],
      findings: [{ severity: "broken", detail: `Check crashed before completing: ${err.message}` }],
    });
  }
}

function summarize(results) {
  const bySeverity = { working: 0, gap: 0, missing: 0, broken: 0, note: 0 };
  for (const r of results) {
    for (const f of r.findings || []) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }
  }
  return bySeverity;
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# weylandai.com user-simulation report`);
  lines.push("");
  lines.push(`Run at: ${report.runAt}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  const s = report.summary;
  lines.push(`- Working: ${s.working || 0}`);
  lines.push(`- Gaps (partially working / real issue but not a hard break): ${s.gap || 0}`);
  lines.push(`- Missing (no real UI/backend at all): ${s.missing || 0}`);
  lines.push(`- Broken (a real, exercised flow that fails): ${s.broken || 0}`);
  lines.push(`- Notes: ${s.note || 0}`);
  lines.push("");
  for (const r of report.results) {
    lines.push(`## ${r.product}`);
    lines.push("");
    if (r.error) {
      lines.push(`**CRASHED**: ${r.error}`);
      lines.push("");
      continue;
    }
    lines.push(`Entry points: marketing=${JSON.stringify(r.entryPoints?.marketing)}, app=${JSON.stringify(r.entryPoints?.app)}`);
    lines.push("");
    lines.push(`API surface exercised: ${(r.entryPoints?.api || []).join(", ")}`);
    lines.push("");
    lines.push(`### Steps`);
    lines.push("");
    for (const step of r.steps) {
      lines.push(`- [${step.ok ? "PASS" : "FAIL"}] **${step.step}** (${step.method || "GET"} ${step.path || ""}) -> status ${step.status ?? "-"}: ${step.detail || ""}`);
    }
    lines.push("");
    lines.push(`### Findings`);
    lines.push("");
    for (const f of r.findings || []) {
      lines.push(`- **[${f.severity.toUpperCase()}]** ${f.detail}`);
      if (f.gofaineatCascade) {
        lines.push(`  - *Gofaineat cascade assessment*: ${f.gofaineatCascade}`);
      }
    }
    lines.push("");
  }
  lines.push(`## Harness limitations (read before trusting a "pass")`);
  lines.push("");
  for (const l of report.limitations) {
    lines.push(`- ${l}`);
  }
  return lines.join("\n");
}

const LIMITATIONS = [
  "No headless-browser layer (no Playwright/Puppeteer client-side check): this harness verifies real HTTP status/JSON/HTML content, not whether client-side JS actually runs without throwing, whether a button's onclick handler is wired, or whether CSS renders visibly. A page that returns 200 with a syntax error in its <script> block would still show as PASS here.",
  "MeetingX's real-time WebSocket backend (/api/sight/room/:projectId -> SIGHTX_ROOM Durable Object) could not be fully exercised - this harness's HTTP client cannot complete a genuine WebSocket upgrade handshake, so that check reports what a non-WS request sees, not a definitive proof the live chat/presence relay works end-to-end.",
  "PropX and HuntX marketing-page rendering was checked via raw HTML string matching (does the CTA href literally say X), not via a real browser - a CTA that's visually hidden or JS-relocated wouldn't be caught differently from one that's genuinely absent.",
  "Only the 6 products explicitly named in this task plus the 6 market-intelligence routes were covered. requireProductAccess() call sites reveal a much larger real product-slug surface (asbuiltx, bidx, changeordx, closex, coa, drawx, inspecx, leadx, lienx, notesx, permitx, rfax, safetyx, specx, survx and more) that this harness does not test at all - a real, larger unverified surface this pass did not have budget to cover.",
  "Throwaway D1 accounts are created and deleted directly against PRODUCTION (weyland_db --remote) for real, for products outside the AuthFor ephemeral-trial allowlist (PropX, HuntX, MeetingX). Cleanup runs in a `finally` block and is verified, but a hard process kill mid-run could leave a `usersim_*`-prefixed row behind - safe to delete by hand if ever found (`DELETE FROM users WHERE id LIKE 'usersim_%'` / same for weyland_sessions).",
  "Extraction-quality findings (SubX/TakeoffX doorCount) are a snapshot of one real test PDF (OCCDoorSchedulePg4.pdf) - they do not sample across a variety of real door-schedule layouts, so 'still 0 doors on this document' should not be read as '0 doors on every document'.",
];

async function main() {
  await mkdir(REPORTS_DIR, { recursive: true });

  log(`weylandai.com user-simulation harness - target: ${BASE_URL}`);
  log(`Started: ${new Date().toISOString()}`);

  const results = [];
  let ephemeralToken = null;
  let throwawayAccount = null;

  try {
    log("\nMinting real AuthFor ephemeral trial token...");
    ephemeralToken = await mintEphemeralToken();
    log(`  got token (len ${ephemeralToken.length})`);
  } catch (err) {
    log(`  FAILED to mint ephemeral token: ${err.message} - subx/takeoffx, cutsheetx, and sightx checks that need it will be skipped or will fail honestly.`);
  }

  try {
    log("\nCreating real throwaway D1 account (users + weyland_sessions, production)...");
    throwawayAccount = await createThrowawayAccount("weylandai-user-simulation-run");
    log(`  created ${throwawayAccount.userId} / session ${throwawayAccount.sessionId}`);
  } catch (err) {
    log(`  FAILED to create throwaway account: ${err.message} - propx/huntx/meetingx checks that need it will fail honestly.`);
  }

  const ctx = { ephemeralToken, throwawayAccount, log };

  try {
    if (ephemeralToken) {
      await runCheck(subxTakeoffx, ctx, results);
      await runCheck(cutsheetx, ctx, results);
      await runCheck(sightx, ctx, results);
    } else {
      log("Skipping subx-takeoffx/cutsheetx/sightx: no ephemeral token available.");
    }

    if (throwawayAccount) {
      await runCheck(propx, ctx, results);
      await runCheck(huntx, ctx, results);
      await runCheck(meetingx, ctx, results);
    } else {
      log("Skipping propx/huntx/meetingx: no throwaway account available.");
    }

    await runCheck(marketIntelligence, ctx, results);
  } finally {
    if (throwawayAccount) {
      log("\nDeleting real throwaway D1 account...");
      const del = await deleteThrowawayAccount(throwawayAccount);
      log(del.deleted ? "  cleaned up successfully." : `  CLEANUP HAD ERRORS: ${JSON.stringify(del.errors)} - manual check recommended.`);
    }
  }

  const report = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: summarize(results),
    results,
    limitations: LIMITATIONS,
  };

  const stamp = report.runAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(REPORTS_DIR, `report-${stamp}.json`);
  const mdPath = path.join(REPORTS_DIR, `report-${stamp}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, toMarkdown(report));
  await writeFile(path.join(REPORTS_DIR, "latest.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(REPORTS_DIR, "latest.md"), toMarkdown(report));

  log(`\n\nDone. Summary: ${JSON.stringify(report.summary)}`);
  log(`Full report: ${jsonPath}`);
  log(`Markdown:    ${mdPath}`);
  log(`Latest copy: ${path.join(REPORTS_DIR, "latest.md")}`);
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(1);
});
