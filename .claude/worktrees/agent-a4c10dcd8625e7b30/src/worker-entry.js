// src/worker-entry.js
//
// Real esbuild entry point for weyland.worker.js. Building from here (see
// "build" script in package.json) makes weyland.worker.js a build artifact
// again instead of a hand-edited blob - the first step of
// WORKER_MODULARIZATION_MAP.md's Phase 2a.
//
// For this phase, only two pieces of logic have real module boundaries:
// lib/auth.js and routes/document-generators.js. Everything else that used
// to be typed directly into weyland.worker.js (156323-157764 lines minus
// what moved out) still lives in ./legacy-monolith.js, which is itself the
// thing that imports and wires in the two extracted modules (see that
// file's own header comment). This entry point's job is just to be the
// real root of the module graph: import legacy-monolith.js's exports and
// re-export them unchanged, matching weyland.worker.js's current top-level
// shape.
//
// Current top-level shape, verified at HEAD 4095d9e:
//   var weyland_worker_default = { async fetch(request2, env2, ctx) {...} };
//   ...
//   export { SightXRoom, weyland_worker_default as default };
//
// Note: unlike what an earlier pass of WORKER_MODULARIZATION_MAP.md assumed,
// weyland_worker_default does NOT itself have scheduled()/queue() methods -
// those live on a separate internal `monolith` object that
// weyland_worker_default.fetch() delegates /api/* traffic to, but which is
// never itself exported or wired to the Workers runtime's scheduled/queue
// triggers (wrangler.toml also has no cron/queue trigger config at all).
// This looks like dead/unwired capability, not something this phase
// introduced or is fixing - preserved exactly as-is; flagged in the
// extraction report for a real decision later.
export { SightXRoom, default } from "./legacy-monolith.js";
