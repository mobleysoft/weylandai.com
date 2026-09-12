// checks/huntx.mjs
//
// HuntX is not in EPHEMERAL_TRIAL_PRODUCTS, so uses the real throwaway D1
// account. Unlike PropX, HuntX's marketing page (src/pages/huntx.html AS
// ACTUALLY DEPLOYED - see note below) is a real, wired app: it calls
// /api/hunt/opportunities itself and shows a sign-in prompt on 401/402.
// This check drives the real refresh -> list flow end to end against the
// real live TxDOT/CA-OPSC government open-data feeds hunt.js scrapes.
//
// Real, separate finding surfaced while researching this check (not
// fixed here - out of scope for a testing harness): the SOURCE file
// src/pages/huntx.html on disk is truncated mid-tag (54 lines, cuts off
// at `<nav class="nav">{{NAV}}) + ` with no closing tags) - genuinely
// broken if anyone rebuilds from it. The LIVE deployed page is fine (170
// lines, complete) because weyland.worker.js's bundled copy has drifted
// from src/ (the same drift EXTRACTION_PIPELINE_CUSTOMER_PATH.md already
// flagged for its own changes). This check tests the live behavior
// (what a real user actually experiences today) and records the source
// drift as a finding, not a live-traffic bug.

import { httpFetch, step, trim } from "../lib/http.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const product = "HuntX";
export const slug = "huntx";

export async function run({ throwawayAccount, log }) {
  const steps = [];
  const findings = [];
  const cookieHeaders = { Cookie: throwawayAccount.cookie };

  // 1. Live marketing/app page.
  const page = await httpFetch("/huntx");
  const callsApi = page.text.includes("/api/hunt/opportunities");
  steps.push(
    step("live page /huntx", {
      path: "/huntx",
      status: page.status,
      ok: page.status === 200,
      detail: callsApi
        ? "200, page's own inline script really calls /api/hunt/opportunities (not a static mockup)"
        : "200 but no reference to /api/hunt/opportunities found in the page - may be a stale/static copy",
    })
  );

  // 2. Source-file integrity check (disk vs. live) - cheap, catches build-drift class bugs.
  try {
    const srcPath = fileURLToPath(new URL("../../../src/pages/huntx.html", import.meta.url));
    const srcText = await readFile(srcPath, "utf8");
    const srcLines = srcText.split("\n").length;
    const liveLines = page.text.split("\n").length;
    steps.push(
      step("source-file integrity: src/pages/huntx.html vs. live /huntx", {
        ok: srcLines > 100,
        detail: `src/pages/huntx.html on disk is ${srcLines} line(s); live page is ${liveLines} line(s).`,
      })
    );
    if (srcLines < 100) {
      findings.push({
        severity: "gap",
        detail:
          `src/pages/huntx.html on disk is truncated (${srcLines} lines, ends mid-tag with no closing ` +
          `HTML) while the live deployed page is healthy (${liveLines} lines) - the deployed worker's ` +
          "bundled copy has drifted from this source file. Anyone who runs `npm run build` or hand-" +
          "edits this file expecting it to reflect production would ship a broken HuntX page. This is " +
          "the same class of build-pipeline drift EXTRACTION_PIPELINE_CUSTOMER_PATH.md already flagged " +
          "as an open, unfixed problem for its own changes - this is a second, independent instance.",
      });
    }
  } catch (e) {
    steps.push(step("source-file integrity check", { ok: false, detail: `could not read src/pages/huntx.html: ${e.message}` }));
  }

  // 3. Real API, unauthenticated (should be a clean 401, matching the page's own probe behavior).
  const unauth = await httpFetch("/api/hunt/opportunities");
  steps.push(
    step("GET /api/hunt/opportunities (no auth)", {
      path: "/api/hunt/opportunities",
      status: unauth.status,
      ok: unauth.status === 401,
      detail: trim(unauth.json || unauth.text, 150),
    })
  );

  // 4. Real refresh against live government open-data feeds.
  const refresh = await httpFetch("/api/hunt/refresh", { method: "POST", headers: cookieHeaders });
  steps.push(
    step("POST /api/hunt/refresh (real account, hits real TxDOT + CA OPSC open-data APIs)", {
      method: "POST",
      path: "/api/hunt/refresh",
      status: refresh.status,
      ok: refresh.status === 200 && refresh.json?.success,
      detail: `upserted=${refresh.json?.upserted}, sources=${refresh.json?.sources}, errors=${JSON.stringify(refresh.json?.errors)}`,
      evidence: trim(refresh.json || refresh.text),
    })
  );
  if (refresh.status !== 200 || !refresh.json?.success) {
    findings.push({ severity: "broken", detail: `HuntX refresh failed: ${trim(refresh.json || refresh.text, 300)}` });
  } else if (refresh.json.errors?.length) {
    findings.push({
      severity: "gap",
      detail: `HuntX refresh partially failed - ${refresh.json.errors.length} of ${refresh.json.sources} source(s) errored: ${trim(refresh.json.errors, 300)}`,
    });
  } else if (refresh.json.upserted === 0) {
    findings.push({ severity: "gap", detail: "HuntX refresh reported success but upserted 0 real opportunities from either government feed." });
  } else {
    findings.push({ severity: "working", detail: `HuntX refresh is real and working: ${refresh.json.upserted} real opportunities upserted from ${refresh.json.sources} live government data source(s).` });
  }

  // 5. Real list, after refresh, as the same account.
  const list = await httpFetch("/api/hunt/opportunities?limit=5", { headers: cookieHeaders });
  steps.push(
    step("GET /api/hunt/opportunities (real account, after refresh)", {
      path: "/api/hunt/opportunities",
      status: list.status,
      ok: list.status === 200,
      detail: `returned ${list.json?.opportunities?.length ?? "?"} row(s), lastFetchedAt=${list.json?.lastFetchedAt}`,
      evidence: trim(list.json),
    })
  );

  return {
    product,
    slug,
    entryPoints: {
      marketing: ["/huntx"],
      app: "/huntx (same page, gated inline)",
      api: ["POST /api/hunt/refresh", "GET /api/hunt/opportunities"],
    },
    steps,
    findings,
  };
}
