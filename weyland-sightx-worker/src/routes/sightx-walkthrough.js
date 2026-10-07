// weyland-sightx-worker/src/routes/sightx-walkthrough.js
//
// SightX "Guided Walkthrough Preview": POST /api/sightx/walkthrough-preview
// {description} -> an ordered walkthrough of the described space and an
// animated-SVG storyboard of it.
//
// 2026-10-07: no model in the loop any more. Until today this route sent
// the description to filmline-video-worker's /api/generate, which asked
// mobley-venture-fleet-a's story-treatment endpoint for a script, which in
// turn called the Qwen bridge on John's Mac (llama.mobleysoft.com). Under
// any load that chain crossed fleet-a's 20 s abort and the visitor saw
// "walkthrough generation failed upstream"; when it did answer it wrote
// fiction ("the nature of the waiting room itself"), not a walk past the
// doors. Standing rule: no product depends on the local Qwen bridge.
//
// Now: lib/walkthrough-builder.js reads the description deterministically
// (spaces, openings, hardware, ratings, door-schedule rows) and builds the
// title, logline and ordered scenes in this Worker; filmline-video-worker's
// model-free POST /api/render (same-account Service Binding, validated
// caller-supplied scenes, no inference) draws the storyboard. Same input,
// same walkthrough. The response keeps the fields sightx.html reads
// (title, logline_escaped, scene_count, total_seconds, svg,
// narration_lines) and adds the scenes and what was read from the text.
//
// Public, no auth (unchanged): the page is public and so is this preview.
//
// Provenance: extracted 2026-09-10 from legacy-monolith.js, moved into
// this standalone Worker 2026-09-12 (MICROSERVICES_PUSH.md). This route
// never touches the SIGHTX_ROOM Durable Object (a MeetingX concern that
// only shares the name; it stays on the monolith).

import { jsonResponse3 } from "../lib/json-response.js";
import { buildWalkthrough } from "../lib/walkthrough-builder.js";

const RENDER_TIMEOUT_MS = 10000;
const ACCENT = "#f0b800";

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

    const walkthrough = buildWalkthrough(description);
    try {
      const upstream = await env2.FILMLINE_VIDEO.fetch("https://filmline-video-worker/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: walkthrough.title,
          logline: walkthrough.logline,
          scenes: walkthrough.scenes,
          accent: ACCENT,
        }),
        signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data?.video?.svg) {
        return jsonResponse3({ detail: { message: "the storyboard could not be drawn", upstream: data } }, 502);
      }
      return jsonResponse3({
        title: walkthrough.title,
        logline_escaped: escapeHtmlText(walkthrough.logline),
        scene_count: walkthrough.scenes.length,
        total_seconds: data.video.total_seconds,
        svg: data.video.svg,
        narration_lines: [walkthrough.logline, ...walkthrough.scenes.map((s) => s.description)],
        scenes: walkthrough.scenes,
        walk: walkthrough.walk,
        source: "deterministic walkthrough builder in weyland-sightx-worker (no model) -> filmline-video-worker /api/render",
      });
    } catch (err) {
      console.error("[SightX walkthrough-preview] render error:", err && err.message);
      return jsonResponse3({ detail: { message: "the storyboard could not be drawn: " + (err && err.message || "render call failed") } }, 502);
    }
  });
}
