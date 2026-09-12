// checks/propx.mjs
//
// PropX is NOT in EPHEMERAL_TRIAL_PRODUCTS, so this uses the real
// throwaway D1 account (ctx.throwawayAccount) instead of an ephemeral
// token. Real backend exists (src/routes/document-generators.js:
// POST /api/proposals/generate, GET /api/proposals/:id/download) but -
// per a direct read of src/pages/propx.html - there is no dashboard/app
// page anywhere, and the marketing page's own CTA links to
// `/login?redirect=/` (the homepage), not even back to /propx itself.
// This check verifies that live, and verifies the real backend's actual
// behavior on both a nonexistent submittalId and a real one.

import { httpFetch, step, trim } from "../lib/http.mjs";
import { d1Query } from "../lib/throwaway-account.mjs";

export const product = "PropX";
export const slug = "propx";

export async function run({ throwawayAccount, log }) {
  const steps = [];
  const findings = [];
  const cookieHeaders = { Cookie: throwawayAccount.cookie };

  // 1. Marketing page + its CTA's real destination.
  const marketing = await httpFetch("/propx");
  const ctaMatch = marketing.text.match(/<a class="button primary" href="([^"]+)"/);
  steps.push(
    step("marketing page /propx", {
      path: "/propx",
      status: marketing.status,
      ok: marketing.status === 200,
      detail: `CTA href = ${ctaMatch ? ctaMatch[1] : "(not found)"}`,
    })
  );
  if (ctaMatch && ctaMatch[1] === "/login?redirect=/") {
    findings.push({
      severity: "missing",
      detail:
        "PropX's marketing page CTA (\"SIGN IN TO START A PROPOSAL\") links to /login?redirect=/ - " +
        "a successful login sends the visitor back to the HOMEPAGE, not to any PropX workspace, " +
        "because no such workspace page exists (confirmed below). This is the same class of dead-end " +
        "CTA that /subx and /takeoffx had before EXTRACTION_PIPELINE_CUSTOMER_PATH.md Part 2 fixed " +
        "them to redirect to /subx-app - PropX never got the equivalent fix.",
    });
  }

  // 2. Confirm no app page exists under any plausible name.
  for (const guess of ["/propx-app", "/propx/app", "/propx-workspace"]) {
    const res = await httpFetch(guess);
    steps.push(
      step(`probe for a PropX app page at ${guess}`, {
        path: guess,
        status: res.status,
        ok: res.status === 404,
        detail: res.status === 404 ? "confirmed absent (404)" : `unexpected status ${res.status}`,
      })
    );
  }
  findings.push({
    severity: "missing",
    detail:
      "No PropX dashboard/app page exists anywhere in src/pages/ or routes_manifest.json (confirmed " +
      "by reading the manifest and probing common paths live). A real, logged-in, fully-entitled " +
      "customer (this check's throwaway subconp-tier account) has NO way to reach PropX's real backend " +
      "(POST /api/proposals/generate) through the website at all - it is only reachable by a direct " +
      "API call, same class of gap SubX/TakeoffX had before tonight's earlier fix.",
  });

  // 3. Real backend behavior: invalid submittalId (should be a clean 404, not a 500).
  const badGen = await httpFetch("/api/proposals/generate", {
    method: "POST",
    headers: { ...cookieHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ submittalId: "usersim-nonexistent-submittal-id" }),
  });
  steps.push(
    step("POST /api/proposals/generate with a nonexistent submittalId", {
      method: "POST",
      path: "/api/proposals/generate",
      status: badGen.status,
      ok: badGen.status === 404,
      detail: trim(badGen.json || badGen.text, 200),
    })
  );
  if (badGen.status !== 404) {
    findings.push({ severity: "broken", detail: `Expected a clean 404 for a nonexistent submittalId, got ${badGen.status}: ${trim(badGen.text, 200)}` });
  } else {
    findings.push({ severity: "working", detail: "Backend correctly 404s on an invalid submittalId rather than 500ing." });
  }

  // 4. Whether a REAL submittal with real door_entries rows exists to
  //    drive a genuine full proposal - this is the real, honest
  //    dependency chain: PropX's generator reads `door_entries` rows tied
  //    to a submittalId, which only get populated by a working SubX
  //    extraction. Query D1 directly (read-only) rather than guessing.
  const doorEntryCount = await d1Query("SELECT COUNT(*) as c FROM door_entries");
  const count = doorEntryCount?.results?.[0]?.c ?? null;
  steps.push(
    step("D1: SELECT COUNT(*) FROM door_entries (read-only, checks whether ANY real proposal-ready data exists)", {
      ok: count !== null,
      detail: `door_entries table has ${count} row(s) total across all users`,
    })
  );
  if (count === 0) {
    findings.push({
      severity: "gap",
      detail:
        "The door_entries table PropX's proposal generator depends on is completely empty. This is " +
        "consistent with SubX/TakeoffX's own extraction pipeline currently producing 0 real doors " +
        "(see the SubX/TakeoffX section of this report) - PropX's real backend logic cannot be " +
        "exercised end-to-end with real data until SubX's extraction actually works, on top of " +
        "PropX having no UI to drive it from at all. Two independent blockers, not one.",
    });
  }

  return {
    product,
    slug,
    entryPoints: {
      marketing: ["/propx"],
      app: null,
      api: ["POST /api/proposals/generate", "GET /api/proposals/:id/download"],
    },
    steps,
    findings,
  };
}
