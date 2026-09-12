// checks/sightx.mjs
//
// SightX already confirmed (per this session's earlier investigation) to
// contain "demo"/"hardcoded" language in its own marketing copy. This
// check verifies exactly what's real vs. stubbed by reading the actual
// live page content and driving the one real, working API it exposes
// (POST /api/sightx/walkthrough-preview - a genuine Service-Binding chain
// through filmline-video-worker to mobley-venture-fleet-a's story-
// treatment endpoint, confirmed public/no-auth by reading the route
// handler directly).

import { httpFetch, step, trim } from "../lib/http.mjs";

export const product = "SightX";
export const slug = "sightx";

export async function run({ log }) {
  const steps = [];
  const findings = [];

  const page = await httpFetch("/sightx");
  steps.push(step("live page /sightx", { path: "/sightx", status: page.status, ok: page.status === 200, detail: "200" }));

  const selfDisclosures = [
    { needle: "hardcoded demo project (Glendale Camino Real)", label: "walkthrough-preview panel copy" },
    { needle: "Site Vision Demonstrator", label: "page <title>" },
    { needle: "sightx-demo", label: "body class marking the whole page as a demonstrator" },
  ];
  for (const { needle, label } of selfDisclosures) {
    const found = page.text.includes(needle);
    steps.push(
      step(`self-disclosure check: "${needle}"`, {
        ok: found,
        detail: found ? `present (${label}) - SightX's own copy is still honest about this` : `NOT found - copy may have changed, re-verify`,
      })
    );
  }
  findings.push({
    severity: "note",
    detail:
      "SightX's marketing page still honestly labels itself a demonstrator: the main WebGL scene is " +
      "one real, fixed, hardcoded project (Glendale Camino Real) - not a generator that works on an " +
      "arbitrary customer site. This is accurate self-disclosure, not something to 'fix' by hiding it.",
  });

  // The one real, dynamic feature: walkthrough-preview. Public, no auth
  // (confirmed by reading src/routes/sightx-walkthrough.js: no
  // authenticate() call in the handler at all).
  const preview = await httpFetch("/api/sightx/walkthrough-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "A 40,000 sqft mixed-use retail and office building with a central atrium and rooftop terrace." }),
  });
  steps.push(
    step("POST /api/sightx/walkthrough-preview (public, no auth needed)", {
      method: "POST",
      path: "/api/sightx/walkthrough-preview",
      status: preview.status,
      ok: preview.status === 200,
      detail: preview.json
        ? `title="${preview.json.title}", scene_count=${preview.json.scene_count}, total_seconds=${preview.json.total_seconds}, svg_present=${!!preview.json.svg}`
        : trim(preview.text, 200),
      evidence: trim({ ...preview.json, svg: preview.json?.svg ? `[${preview.json.svg.length} chars of SVG]` : undefined }),
    })
  );
  if (preview.status === 200 && preview.json?.svg) {
    findings.push({
      severity: "working",
      detail:
        "The real, dynamic part of SightX (walkthrough-preview: user description -> filmline-video-" +
        "worker -> mobley-venture-fleet-a story treatment -> animated-SVG storyboard) genuinely works " +
        "end to end, produces a real distinct result per input, and is honestly labeled as separate " +
        "from the fixed WebGL demo scene.",
    });
  } else {
    findings.push({ severity: "broken", detail: `walkthrough-preview failed: ${trim(preview.json || preview.text, 300)}` });
  }

  // Confirm the same feature actually produces DIFFERENT output for a
  // different input (rules out a hardcoded canned response masquerading
  // as dynamic generation).
  const preview2 = await httpFetch("/api/sightx/walkthrough-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "A single-story rural fire station with two apparatus bays and a small dormitory wing." }),
  });
  const distinctOutput = preview.json?.title && preview2.json?.title && preview.json.title !== preview2.json.title;
  steps.push(
    step("second walkthrough-preview call with a different description - checks for real variation vs. a canned response", {
      status: preview2.status,
      ok: preview2.status === 200,
      detail: distinctOutput
        ? `Confirmed distinct output: "${preview.json.title}" vs "${preview2.json.title}"`
        : `Titles matched or one call failed - could indicate a canned/cached response: "${preview.json?.title}" vs "${preview2.json?.title}"`,
    })
  );
  if (preview.status === 200 && preview2.status === 200) {
    findings.push({
      severity: distinctOutput ? "working" : "gap",
      detail: distinctOutput
        ? "Two different project descriptions produced two different generated titles/results - real generation, not a cached/canned demo."
        : "Two different project descriptions did not produce clearly distinct output - worth a closer manual check for caching/genericness.",
    });
  }

  return {
    product,
    slug,
    entryPoints: {
      marketing: ["/sightx"],
      app: "/sightx (same page)",
      api: ["POST /api/sightx/walkthrough-preview"],
    },
    steps,
    findings,
  };
}
