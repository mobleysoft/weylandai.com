// src/module-registry.js
//
// The ONLY file that should need editing to register a new extracted
// module's routes going forward. legacy-monolith.js imports exactly one
// name from here (registerExtractedModules) and calls it exactly once -
// that import + call site, established once, is not meant to be touched
// again. Adding a new module means: write the module under ./lib or
// ./routes with its own tests, add its import below, add its
// registration call inside registerExtractedModules(). Nothing in
// legacy-monolith.js itself changes.
//
// Deliberately excludes registerDocumentGeneratorRoutes: its deps
// (generateQuoteHtml, puppeteer_cloudflare_default) come from a lazy
// esbuild-vendored init block inside legacy-monolith.js that only
// resolves by the time that call site already runs today - moving it
// here risked a real execution-order break for a refactor that's about
// future extensibility, not touching working code. It stays exactly
// where it is.

import { registerProjectRoutes } from "./routes/projects.js";
import { registerDemoTrialRoutes } from "./routes/demo-trial.js";
import { registerHardwareScheduleExportRoutes } from "./routes/hardware-schedule-export.js";
import { registerAccessRequestRoutes } from "./routes/access-requests.js";
import { makeOperatorGate } from "./lib/operator-gate.js";
import { inviteViaAuthFor } from "./lib/authfor-invite.js";
import { registerSightXWalkthroughRoutes } from "./routes/sightx-walkthrough.js";
import { registerCrossReferenceRoutes } from "./routes/cross-reference.js";
import { registerVendorProfileRoutes } from "./routes/vendor-profile.js";
import { authenticate } from "./lib/auth.js";

/**
 * @param {object} router - the shared NativeRouter instance legacy-monolith.js owns.
 * @param {{ transformDoorEntriesToHardwareSets: Function, materializeDseToLineItems: Function }} deps
 *   Real dependencies still owned by legacy-monolith.js (not yet their
 *   own modules) that some of these routes need injected.
 */
export function registerExtractedModules(router, deps) {
  registerHardwareScheduleExportRoutes(router);
  registerProjectRoutes(router, {
    transformDoorEntriesToHardwareSets: deps.transformDoorEntriesToHardwareSets,
    materializeDseToLineItems: deps.materializeDseToLineItems,
  });
  registerDemoTrialRoutes(router);
  registerAccessRequestRoutes(router, {
    requireOperator: makeOperatorGate(),
    invite: inviteViaAuthFor,
    ventureCode: "weyland",
  });
  registerSightXWalkthroughRoutes(router);
  registerCrossReferenceRoutes(router, { authenticate });
  registerVendorProfileRoutes(router, { authenticate });
}
