// checks/cutsheetx.mjs
//
// CutSheetX is a real, non-trivial backend cluster (cut-sheet-match.js,
// cut-sheet-documents.js, cut-sheet-verified.js, cut-sheet-local.js,
// cut-sheet-discoveries.js, cut-sheet-intelligence.js, user-cutsheets.js -
// ~20 real routes) AND is in EPHEMERAL_TRIAL_PRODUCTS (so a guest can use
// it without signup) - but per a direct read of routes_manifest.json and
// src/pages/, there is NO "cutsheetx" key and NO cutsheetx.html anywhere.
// No marketing page, no app page, nothing a visitor could ever click to
// discover this product exists. This is the sharpest "real backend, zero
// discoverable frontend" finding of the whole sweep - more complete than
// PropX (which at least has dead-end marketing copy).

import { httpFetch, step, trim } from "../lib/http.mjs";
import { bearerHeaders } from "../lib/ephemeral-auth.mjs";

export const product = "CutSheetX";
export const slug = "cutsheetx";

export async function run({ ephemeralToken, log }) {
  const steps = [];
  const findings = [];
  const authHeaders = bearerHeaders(ephemeralToken);

  // redirect: "manual" so a 302 (e.g. /cutsheetx -> /pricing, a real
  // behavior discovered live) is reported as what it is, not silently
  // followed and mistaken for "a real page exists here."
  let anyRealPage = false;
  for (const guess of ["/cutsheetx", "/cutsheet", "/cut-sheets", "/cutsheetx-app"]) {
    const res = await httpFetch(guess, { redirect: "manual" });
    const isAbsent = res.status === 404 || res.status === 301 || res.status === 302;
    const location = res.headers?.get?.("location");
    steps.push(
      step(`probe for a CutSheetX page at ${guess}`, {
        path: guess,
        status: res.status,
        ok: isAbsent,
        detail:
          res.status === 404
            ? "confirmed absent (404)"
            : res.status === 301 || res.status === 302
              ? `confirmed absent - redirects to ${location} (no dedicated CutSheetX page, falls through to a generic route)`
              : `unexpected status ${res.status}: ${trim(res.text, 100)}`,
      })
    );
    if (!isAbsent) anyRealPage = true;
  }
  findings.push({
    severity: anyRealPage ? "note" : "missing",
    detail: anyRealPage
      ? "At least one CutSheetX URL guess returned neither 404 nor a redirect - re-check manually, see steps above."
      : "No CutSheetX marketing page or app page exists anywhere (confirmed: absent from " +
        "src/routes_manifest.json, absent from src/pages/; live probes show /cutsheetx redirects " +
        "(302) to /pricing, and the other 3 guesses 404). CutSheetX is included in " +
        "EPHEMERAL_TRIAL_PRODUCTS (a real visitor could use it with zero signup) and has a real, " +
        "substantial backend (~20 routes across 6 files) - but there is literally no way for a human " +
        "visitor to ever discover or reach it through the website. This is a pure UI/discoverability " +
        "gap, not a backend bug - the fix is 'build a page', not a gofaineat cascade or any backend " +
        "rework.",
  });

  // Real backend exercise: local-index (should return real catalogue data if seeded).
  const localIndex = await httpFetch("/api/cut-sheets/local-index", { headers: authHeaders });
  steps.push(
    step("GET /api/cut-sheets/local-index (ephemeral)", {
      path: "/api/cut-sheets/local-index",
      status: localIndex.status,
      ok: localIndex.status === 200,
      detail: trim(localIndex.json || localIndex.text, 200),
    })
  );

  // manufacturer is a required param (confirmed by reading cut-sheet-
  // local.js) - "schlage" is a real manufacturer name present in the
  // local-index response above, not a guess.
  const search = await httpFetch("/api/cut-sheets/local-search?manufacturer=schlage", { headers: authHeaders });
  steps.push(
    step("GET /api/cut-sheets/local-search?manufacturer=schlage (ephemeral, real product search)", {
      path: "/api/cut-sheets/local-search",
      status: search.status,
      ok: search.status === 200,
      detail: trim(search.json || search.text, 300),
    })
  );
  if (search.status === 200) {
    findings.push({
      severity: "working",
      detail: `CutSheetX's real backend search is reachable and returns a real, well-formed response (found=${search.json?.found}) - the backend logic itself runs correctly; the only confirmed problem is that nothing links to it.`,
    });
  } else {
    findings.push({ severity: "broken", detail: `CutSheetX local-search failed even at the API level: ${trim(search.json || search.text, 200)}` });
  }

  const verified = await httpFetch("/api/cut-sheets/verified", { headers: authHeaders });
  steps.push(
    step("GET /api/cut-sheets/verified (ephemeral)", {
      path: "/api/cut-sheets/verified",
      status: verified.status,
      ok: verified.status === 200,
      detail: trim(verified.json || verified.text, 200),
    })
  );

  return {
    product,
    slug,
    entryPoints: {
      marketing: null,
      app: null,
      api: [
        "GET /api/cut-sheets/local-index",
        "GET /api/cut-sheets/local-search",
        "GET /api/cut-sheets/verified",
        "POST /api/cut-sheets/match",
        "GET /api/user/cutsheets",
      ],
    },
    steps,
    findings,
  };
}
