// weyland-sightx-worker/src/routes/sightx-walkthrough.js
//
// Ported verbatim (byte-for-byte route logic, only the import path
// changed) from ../../../src/routes/sightx-walkthrough.js as part of the
// 2026-09-12 microservices push extracting SightX into its own standalone
// Cloudflare Worker - same strangler-fig, Service-Binding pattern already
// proven live by weyland-ocr-worker, weyland-huntx-worker, weyland-subx-
// worker, weyland-cutsheetx-worker, and weyland-propx-worker.
//
// Original header follows, preserved for provenance:
//
// SightX "Guided Walkthrough Preview" — real second consumer of
// filmline-video-worker, wired 2026-09-06. SightX's own spec
// (ventures.json products_v2) promises "guided site walkthroughs"; its
// existing WebGL scene is one real hardcoded demo (Glendale Camino Real),
// not a generator. This route is a genuinely smaller, real slice of that
// same promise: a plain-text project description goes to
// filmline-video-worker over a same-account Service Binding
// (env.FILMLINE_VIDEO), which itself calls mobley-venture-fleet-a's live
// JITAGI story-treatment endpoint for a real script, then returns a
// deterministic animated-SVG storyboard reel. No new LLM key needed or
// duplicated here — this route is a thin pass-through plus response
// reshaping for the sightx.html panel.
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// 147024-147078 including escapeHtmlText, a private helper used only
// here - confirmed via grep, not assumed). WORKER_MODULARIZATION_MAP.md
// §6 flagged this as one of the trivially small, single-route "practice
// reps" for the extraction process, alongside cross-reference.js and
// demo.js.
//
// Real relationship to the SIGHTX_ROOM Durable Object (checked, not
// assumed, during the 2026-09-12 standalone-Worker extraction): this
// route never references SIGHTX_ROOM, and neither does anything else in
// SightX's own route surface. SIGHTX_ROOM is a real DO, but it's a
// MeetingX concern that happens to share the "sightx" name (the
// monolith's own wrangler.toml comments it as "real-time presence/chat/
// WebRTC-signaling relay for MeetingX", and the one place it's actually
// used - weyland-entry.js's WebSocket-upgrade handler at
// /api/sight/room/:projectId - gates access with
// requireProductAccess(user, env, "meetingx"), not "sightx"). This
// Worker deliberately does not bind SIGHTX_ROOM and does not claim
// /api/sight/room/* - that stays on the monolith, which the ported
// sightx.html page's embedded MeetingX "COLLABORATE" widget still talks
// to directly by same-origin relative path.

import { jsonResponse3 } from "../lib/json-response.js";

function escapeHtmlText(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

export function registerSightXWalkthroughRoutes(router) {
  router.post("/api/sightx/walkthrough-preview", async (request2, env2) => {
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ detail: { message: "invalid JSON body" } }, 400);
    }
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : "";
    if (!description) return jsonResponse3({ detail: { message: "description is required" } }, 400);

    if (!env2.FILMLINE_VIDEO) {
      return jsonResponse3({ detail: { message: "FILMLINE_VIDEO binding not configured on this Worker" } }, 500);
    }

    try {
      const upstream = await env2.FILMLINE_VIDEO.fetch("https://filmline-video-worker/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premise: description, accent: "#f0b800" }),
      });
      const data = await upstream.json();
      if (!upstream.ok || !data?.video?.svg) {
        return jsonResponse3({ detail: { message: "walkthrough generation failed upstream", upstream: data } }, 502);
      }
      return jsonResponse3({
        title: data.title,
        logline_escaped: escapeHtmlText(data.logline),
        scene_count: (data.scenes || []).length,
        total_seconds: data.video.total_seconds,
        svg: data.video.svg,
        narration_lines: [data.logline, ...(data.scenes || []).map((s) => s.description)].filter(Boolean),
        source: "Service Binding -> filmline-video-worker /api/generate -> mobley-venture-fleet-a /api/story-treatment",
      });
    } catch (err) {
      console.error("[SightX walkthrough-preview] error:", err.message);
      return jsonResponse3({ detail: { message: `FILMLINE_VIDEO call failed: ${err.message}` } }, 502);
    }
  });
}
