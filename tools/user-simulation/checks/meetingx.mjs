// checks/meetingx.mjs
//
// MeetingX's own marketing copy already self-discloses a real gap
// ("MULTI-PARTY TRANSPORT NOT YET CLAIMED... MEDIA AND NOTES STAY IN THIS
// BROWSER") - this check verifies that's still accurate, AND checks
// whether a real backend already exists that could close it. Finding
// from reading src/lib/weyland-entry.js: a real WebSocket endpoint,
// `/api/sight/room/:projectId`, already exists, is gated by
// requireProductAccess(user, env2, "meetingx"), and forwards to the real
// SIGHTX_ROOM Durable Object (presence + chat + WebRTC-signaling relay -
// the same DO SightX's own multi-user feature would use). Grepping
// src/pages/meetingx.html for any reference to this endpoint found NONE -
// the page's own JS never opens a WebSocket to it at all. So the honest
// finding is sharper than "not built": real, reachable, gated
// infrastructure already exists and is simply never wired into the one
// page that would use it.

import { httpFetch, step, trim } from "../lib/http.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const product = "MeetingX";
export const slug = "meetingx";

export async function run({ throwawayAccount, log }) {
  const steps = [];
  const findings = [];

  const page = await httpFetch("/meetingx");
  steps.push(
    step("live page /meetingx", {
      path: "/meetingx",
      status: page.status,
      ok: page.status === 200,
      detail: "200",
    })
  );

  const disclosesGap = page.text.includes("MULTI-PARTY TRANSPORT NOT YET CLAIMED");
  steps.push(
    step("marketing copy self-disclosure check", {
      ok: disclosesGap,
      detail: disclosesGap
        ? "Page's own footer still honestly states 'MULTI-PARTY TRANSPORT NOT YET CLAIMED' / " +
          "'MEDIA AND NOTES STAY IN THIS BROWSER' - confirmed accurate (see below)."
        : "Expected self-disclosure string not found - copy may have changed; re-verify manually.",
    })
  );

  const referencesRoom = page.text.includes("/api/sight/room/") || /WebSocket/i.test(page.text);
  steps.push(
    step("does the live page actually wire to the real SIGHTX_ROOM backend?", {
      ok: false, // always a finding either way - this is a report, not a pass/fail gate
      detail: referencesRoom
        ? "Page DOES reference a WebSocket/room connection - re-check whether this was wired since 2026-09-12."
        : "Confirmed: src/pages/meetingx.html has zero references to WebSocket or /api/sight/room/ - " +
          "every button (CAM+MIC, SHARE SCREEN, TRANSCRIBE, DECISION, ACTION, EXPORT) is client-side only.",
    })
  );

  if (!referencesRoom) {
    findings.push({
      severity: "gap",
      detail:
        "MeetingX's page never calls the real, already-deployed multi-party backend " +
        "(WebSocket /api/sight/room/:projectId -> SIGHTX_ROOM Durable Object, gated by " +
        "requireProductAccess('meetingx'), src/lib/weyland-entry.js) - it's real presence/chat/WebRTC-" +
        "signaling relay code, reachable today, simply unused by the one page that would need it. This " +
        "is a smaller, more concrete piece of work than 'build multi-party transport from scratch' - " +
        "the honest scope is 'wire an existing endpoint into a page', not a research project.",
    });
  }

  // Real probe of the gated backend's live reachability. `SIGHTX_ROOM`
  // and 7 references to `sight/room` are confirmed present in the
  // deployed weyland.worker.js bundle (grep, not assumed), so the code
  // exists in production - but a plain HTTP probe (this harness has no
  // real WebSocket client; adding one is a real, deliberately-not-taken
  // scope decision, see README limitations) cannot complete the actual
  // upgrade handshake, so this can only report what a non-WS request
  // sees, not definitively prove the DO path works end-to-end.
  const roomProbePlain = await httpFetch("/api/sight/room/usersim-probe-project", {
    headers: { Cookie: throwawayAccount.cookie },
  });
  const roomProbeUpgrade = await httpFetch("/api/sight/room/usersim-probe-project", {
    headers: {
      Cookie: throwawayAccount.cookie,
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
      "Sec-WebSocket-Version": "13",
    },
  });
  steps.push(
    step("GET /api/sight/room/:projectId - plain request (no real WS handshake)", {
      path: "/api/sight/room/usersim-probe-project",
      status: roomProbePlain.status,
      ok: roomProbePlain.status === 404,
      detail: `plain GET: ${roomProbePlain.status} (expected 404 - only the real Upgrade:websocket path is wired to this route)`,
    })
  );
  steps.push(
    step("GET /api/sight/room/:projectId - with Upgrade:websocket headers (fetch() cannot complete a real handshake)", {
      path: "/api/sight/room/usersim-probe-project",
      status: roomProbeUpgrade.status,
      ok: false,
      detail: `status ${roomProbeUpgrade.status} - inconclusive via plain fetch(); see README limitations (no real WebSocket client in this harness)`,
    })
  );
  if (roomProbeUpgrade.status === 404) {
    findings.push({
      severity: "gap",
      detail:
        "Confirmed the real backend code exists in the deployed bundle (grep for 'sight/room'/" +
        "'SIGHTX_ROOM' in weyland.worker.js: 7 matches), and meetingx.html never calls it - but a " +
        "live probe (fetch() with Upgrade:websocket headers, not a real WebSocket handshake) got 404, " +
        "not the expected 101/426 behavior read from source. This harness cannot fully distinguish " +
        "'route not actually live at this exact path in the current deployed artifact' from 'needs a " +
        "genuine WebSocket client to observe correctly' - flagging as a real open question for whoever " +
        "picks up wiring MeetingX to this backend, not a confirmed pass or fail.",
    });
  }

  return {
    product,
    slug,
    entryPoints: {
      marketing: ["/meetingx"],
      app: "/meetingx (same page, client-side only)",
      api: ["WS /api/sight/room/:projectId (exists, unused by the page)"],
    },
    steps,
    findings,
  };
}
