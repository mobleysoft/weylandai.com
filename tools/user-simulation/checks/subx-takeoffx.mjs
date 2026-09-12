// checks/subx-takeoffx.mjs
//
// Real user flow: visitor -> /subx or /takeoffx marketing page -> (via
// AuthFor ephemeral trial, no signup) -> upload a real door-schedule PDF
// -> extraction -> real structured door data (or a real, honest failure).
//
// Two real upload paths exist in this codebase and are BOTH exercised
// here, because they are genuinely different pipelines with different
// current health (see EXTRACTION_PIPELINE_CUSTOMER_PATH.md Parts 3-4):
//   1. POST /api/submittals/upload -> dispatchVisionExtraction ->
//      embedded_gofaineat adapter (OCR + local Qwen3-8B, no Anthropic
//      key). This is the one currently reachable without a real API key.
//   2. POST /api/hardware-schedule/start -> GET .../page/1 -> callClaudeWithPdf,
//      which needs ANTHROPIC_API_KEY (confirmed missing as of 2026-09-12).
// Both are real, both are wired into /subx-app's actual UI in some form
// per that doc - reporting both honestly rather than picking the one that
// looks better.

import { httpFetch, step, trim, REAL_TEST_PDF, BASE_URL } from "../lib/http.mjs";
import { bearerHeaders } from "../lib/ephemeral-auth.mjs";
import { readFile } from "node:fs/promises";

export const product = "SubX / TakeoffX";
export const slug = "subx";

export async function run({ ephemeralToken, throwawayAccount, log }) {
  const steps = [];
  const findings = [];
  const authHeaders = bearerHeaders(ephemeralToken);

  // 1. Real marketing pages.
  for (const path of ["/subx", "/takeoffx"]) {
    const res = await httpFetch(path);
    const hasAppCta = res.text.includes("/login?redirect=/subx-app");
    steps.push(
      step(`marketing page ${path}`, {
        path,
        status: res.status,
        ok: res.status === 200,
        detail: hasAppCta
          ? "200, CTA correctly links to /login?redirect=/subx-app"
          : `200 but no /login?redirect=/subx-app CTA found (checked literal string)`,
      })
    );
    if (res.status !== 200) findings.push({ severity: "broken", detail: `${path} did not return 200` });
  }

  // 2. Real app page exists.
  const appPage = await httpFetch("/subx-app");
  steps.push(
    step("app page /subx-app", {
      path: "/subx-app",
      status: appPage.status,
      ok: appPage.status === 200,
      detail: appPage.status === 200 ? "real functional app page returns 200" : "app page missing/broken",
    })
  );
  if (appPage.status !== 200) findings.push({ severity: "broken", detail: "/subx-app does not return 200" });

  // 3. Ephemeral demo-trial clone (the real anonymous-trial path index.html itself uses).
  const cloneRes = await httpFetch("/api/demo/weyland-building/session", {
    method: "POST",
    headers: authHeaders,
  });
  steps.push(
    step("POST /api/demo/weyland-building/session (ephemeral)", {
      method: "POST",
      path: "/api/demo/weyland-building/session",
      status: cloneRes.status,
      ok: cloneRes.status === 200 || cloneRes.status === 201,
      detail: `door_count=${cloneRes.json?.door_count}, hardware_sets_created=${cloneRes.json?.hardware_sets_created}, reused=${cloneRes.json?.reused}`,
      evidence: trim(cloneRes.json || cloneRes.text),
    })
  );
  if (!(cloneRes.status === 200 || cloneRes.status === 201)) {
    findings.push({ severity: "broken", detail: `demo-trial clone failed: ${trim(cloneRes.json || cloneRes.text, 300)}` });
  } else if (!cloneRes.json?.door_count) {
    findings.push({ severity: "broken", detail: "demo-trial clone succeeded but door_count is 0/missing" });
  }

  // 4. Does the ephemeral guest's own cloned session show up in their own
  //    session list? (demo-trial.js attributes an ephemeral clone's
  //    hardware_extraction_sessions row to the SEED project's owner, not
  //    to the guest, since ephemeral users have no real userId - worth
  //    checking honestly whether that makes the clone invisible to the
  //    guest's own GET /api/sessions.)
  const sessionsRes = await httpFetch("/api/sessions", { headers: authHeaders });
  const sessionCount = sessionsRes.json?.sessions?.length ?? null;
  steps.push(
    step("GET /api/sessions (ephemeral, after clone)", {
      path: "/api/sessions",
      status: sessionsRes.status,
      ok: sessionsRes.status === 200,
      detail: `returned ${sessionCount} session(s) for this ephemeral caller`,
      evidence: trim(sessionsRes.json),
    })
  );
  if (sessionsRes.status === 200 && sessionCount === 0) {
    findings.push({
      severity: "gap",
      detail:
        "An ephemeral guest's own demo-trial clone does not appear in their own GET /api/sessions " +
        "(hardware_extraction_sessions.user_id is set to the seed project's owner for ephemeral " +
        "callers, not the guest - see demo-trial.js). The guest can still reach their clone via the " +
        "project_id/session_id returned by the clone call itself, but /subx-app's own session-list " +
        "view would show them nothing.",
    });
  }

  // 5. Real extraction attempt via the embedded_gofaineat path (no
  //    Anthropic key needed) - the one currently-reachable extraction
  //    pipeline. Reuses the same real test PDF as tonight's own
  //    investigation for a directly comparable result.
  let pdfBuffer;
  try {
    pdfBuffer = await readFile(REAL_TEST_PDF);
  } catch (e) {
    steps.push(step("read real test PDF fixture", { ok: false, detail: `${REAL_TEST_PDF} not readable: ${e.message}` }));
    pdfBuffer = null;
  }

  if (pdfBuffer) {
    const form = new FormData();
    form.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "OCCDoorSchedulePg4.pdf");
    form.append("projectName", "User-Simulation Harness Upload");
    const uploadRes = await httpFetch("/api/submittals/upload", {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
    const result = uploadRes.json?.results?.[0];
    steps.push(
      step("POST /api/submittals/upload (ephemeral, real PDF, embedded_gofaineat path)", {
        method: "POST",
        path: "/api/submittals/upload",
        status: uploadRes.status,
        ok: uploadRes.status === 200 || uploadRes.status === 201,
        detail: result
          ? `doorCount=${result.doorCount}, status=${result.status}, extractionConfidence=${result.extractionConfidence}`
          : `no results[] in response`,
        evidence: trim(uploadRes.json || uploadRes.text),
      })
    );
    if (!(uploadRes.status === 200 || uploadRes.status === 201)) {
      const isEphemeralUserIdBug = /NOT NULL constraint failed: submittals\.user_id/.test(uploadRes.text);
      findings.push({
        severity: "broken",
        detail: isEphemeralUserIdBug
          ? "A real anonymous AuthFor ephemeral-trial guest (subx IS in EPHEMERAL_TRIAL_PRODUCTS, so " +
            "this is a supported, advertised path) cannot upload their OWN document at all: " +
            "POST /api/submittals/upload 500s with 'D1_ERROR: NOT NULL constraint failed: " +
            "submittals.user_id'. Root cause: an ephemeral user's user.userId is null by design " +
            "(src/lib/authfor-client.js's authenticateViaEphemeral), but submittals.js's INSERT INTO " +
            "submittals binds user.userId directly into a NOT NULL column with no ephemeral fallback " +
            "(unlike demo-trial.js, which already has a real, working pattern for this exact problem - " +
            "attributing an ephemeral clone to the seed project's owner). This is a MORE FUNDAMENTAL " +
            "break than the doorCount=0 result documented in EXTRACTION_PIPELINE_CUSTOMER_PATH.md: an " +
            "anonymous trial visitor cannot even attempt a real upload of their own PDF today - the " +
            "only ephemeral-reachable flow that works is cloning the one fixed demo document."
          : `submittals/upload failed: ${trim(uploadRes.json || uploadRes.text, 300)}`,
      });
    } else if (result && (result.doorCount ?? 0) === 0) {
      findings.push({
        severity: "broken",
        detail:
          `Real extraction on a real dense architectural door-schedule PDF (${REAL_TEST_PDF}) produced ` +
          `doorCount=0 (extraction_route: embedded_gofaineat). This matches the exact result already ` +
          `documented in EXTRACTION_PIPELINE_CUSTOMER_PATH.md Part 4 on 2026-09-12 - re-verified here, ` +
          `still broken. This is SubX/TakeoffX's actual core paid promise (door-hardware extraction) ` +
          `producing zero usable data on a real customer-shaped document.`,
        gofaineatCascade:
          "Already-documented applicable pattern, not a new one: GOFAINEAT_CASCADE_DESIGN_PATTERN.md's " +
          "own worked example names this exact task ('door-schedule extraction') and stops at step 3 " +
          "('table-row structuring... not yet decomposed into anything classifier-shaped; a real design " +
          "pass is still needed here'). The real blocker per that doc and this run is OCR TEXT QUALITY " +
          "achievable inside Cloudflare's CPU ceiling, not the classifier/cascade shape itself - so the " +
          "right next step is closing that gap (faster OCR, or moving OCR off the request-CPU-limited " +
          "path via a Durable Object/Queue) before a cascade's later stages would even have decent input " +
          "to work with. Building more classifier stages now would not fix a bad-OCR-text problem.",
      });
    } else if (result) {
      findings.push({ severity: "working", detail: `Real extraction produced ${result.doorCount} real door(s) - improved since 2026-09-12.` });
    }
  }

  // 6. The other real pipeline: /api/hardware-schedule/start -> page/1
  //    (needs ANTHROPIC_API_KEY). Uses the real throwaway account (not
  //    ephemeral) when available: ephemeral hits the same NOT NULL
  //    user_id bug found above (hardware_extraction_sessions.user_id is
  //    also NOT NULL with no ephemeral fallback) and would just report
  //    the same root cause twice under a different endpoint name - the
  //    throwaway account gets past that so this step can actually test
  //    the SEPARATE, further-downstream ANTHROPIC_API_KEY gap.
  const secondPipelineAuth = throwawayAccount ? { Cookie: throwawayAccount.cookie } : authHeaders;
  const secondPipelineLabel = throwawayAccount ? "real account" : "ephemeral (will hit the same NOT NULL bug as step 5 above)";
  if (pdfBuffer) {
    const form2 = new FormData();
    form2.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "OCCDoorSchedulePg4.pdf");
    form2.append("projectName", "User-Simulation Harness Upload 2");
    form2.append("document_type", "hardware_schedule");
    const startRes = await httpFetch("/api/hardware-schedule/start", {
      method: "POST",
      headers: secondPipelineAuth,
      body: form2,
    });
    steps.push(
      step(`POST /api/hardware-schedule/start (${secondPipelineLabel}, real PDF)`, {
        method: "POST",
        path: "/api/hardware-schedule/start",
        status: startRes.status,
        ok: startRes.status === 200 || startRes.status === 201,
        detail: `sessionId=${startRes.json?.sessionId}`,
        evidence: trim(startRes.json || startRes.text),
      })
    );
    const sessionId = startRes.json?.sessionId;
    if (sessionId) {
      const pageRes = await httpFetch(`/api/hardware-schedule/session/${sessionId}/page/1`, { headers: secondPipelineAuth });
      steps.push(
        step("GET /api/hardware-schedule/session/:id/page/1 (the /subx-app 'RUN EXTRACTION' button)", {
          path: `/api/hardware-schedule/session/${sessionId}/page/1`,
          status: pageRes.status,
          ok: pageRes.status === 200,
          detail: trim(pageRes.json?.error?.details || pageRes.json?.error || pageRes.text, 200),
          evidence: trim(pageRes.json || pageRes.text),
        })
      );
      if (pageRes.status !== 200) {
        const isKeyMissing = /ANTHROPIC_API_KEY/i.test(pageRes.text);
        findings.push({
          severity: isKeyMissing ? "missing" : "broken",
          detail: isKeyMissing
            ? "The /subx-app 'RUN EXTRACTION' button's real call chain still 500s with " +
              "\"ANTHROPIC_API_KEY not configured\" - confirmed still true, matches Part 3 of " +
              "EXTRACTION_PIPELINE_CUSTOMER_PATH.md. Fixing this needs John to provision a real " +
              "Anthropic key via `wrangler secret put ANTHROPIC_API_KEY` (or route this call chain " +
              "onto the embedded_gofaineat adapter the way dispatchVisionExtraction already was) - a " +
              "real credential/architecture decision, not something this harness can or should do."
            : `page/1 extraction failed with a different error than the known ANTHROPIC_API_KEY gap: ${trim(pageRes.text, 200)}`,
        });
      }
    } else if (!(startRes.status === 200 || startRes.status === 201)) {
      findings.push({
        severity: "broken",
        detail: `POST /api/hardware-schedule/start (${secondPipelineLabel}) failed, so the ANTHROPIC_API_KEY-dependent extraction step could not even be reached: ${trim(startRes.json || startRes.text, 250)}`,
      });
    }
  }

  return {
    product,
    slug,
    entryPoints: {
      marketing: ["/subx", "/takeoffx"],
      app: "/subx-app",
      api: [
        "POST /api/demo/weyland-building/session",
        "GET /api/sessions",
        "POST /api/submittals/upload",
        "POST /api/hardware-schedule/start",
        "GET /api/hardware-schedule/session/:id/page/:n",
      ],
    },
    steps,
    findings,
  };
}
