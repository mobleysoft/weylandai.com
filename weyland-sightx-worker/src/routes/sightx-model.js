// weyland-sightx-worker/src/routes/sightx-model.js
//
// The schedule a SightX corridor is built from (lib/schedule-model.js):
//   GET  /api/sightx/sample               -> the sample model (SubX demo sheet A9.01)
//   POST /api/sightx/model {text}         -> a model read from a pasted schedule
//   POST /api/sightx/model {subx: <GET /api/hardware-schedule/session/:id/doors answer>}
//                                         -> the model for a SubX session the page already read
//   POST /api/sightx/model {subx, plan: <GET /api/hardware-schedule/session/:id/plan answer>}
//                                         -> laid out on the session's floor plan (attachPlan)
// Public and stateless: nothing is stored; the page sends what it shows.

import { jsonResponse3 } from "../lib/json-response.js";
import { parseSchedule, modelFromSubx, sampleModel, attachPlan } from "../lib/schedule-model.js";
import { SETS } from "../data/sets/index.js";

const MAX_TEXT = 60000;

export function registerSightXModelRoutes(router) {
  router.get("/api/sightx/sample", () => jsonResponse3({ success: true, model: attachPlan(sampleModel(), { found: false, reason: "sheet A9.01 comes with no floor plan." }) }));

  // g028: a harvested real bid set laid out on its own plan sheets (built from the set's schedule rows
  // by tools/accuracy/g028/build-sets.mjs). Public: the sets are public bid documents.
  router.get("/api/sightx/sets/:sha16", (request) => {
    const m = SETS[String(request.params.sha16 || "").toLowerCase()];
    if (!m) return jsonResponse3({ success: false, message: "No such set. Known: " + Object.keys(SETS).join(", ") }, 404);
    return jsonResponse3({ success: true, model: m });
  });

  router.post("/api/sightx/model", async (request) => {
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse3({ success: false, message: "invalid JSON body" }, 400); }
    if (body && body.subx && typeof body.subx === "object") {
      // The session's floor plan when SubX found one (body.plan: GET /api/hardware-schedule/session/:id/plan).
      return jsonResponse3({ success: true, model: attachPlan(modelFromSubx(body.subx), body.plan && typeof body.plan === "object" ? body.plan : null) });
    }
    const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
    if (!text.trim()) return jsonResponse3({ success: false, message: "Paste a door schedule (text) or send a SubX session (subx)." }, 400);
    const model = parseSchedule(text, { project: typeof body.project === "string" && body.project.trim() ? body.project.trim() : "Pasted schedule" });
    if (!model.doors.length) {
      return jsonResponse3({ success: false, message: "No doors found. Paste one door per line (\"101 HM 3070 HW-1 Corridor\") or a table with a header row (Door, Size, Type, Rating, Hardware set).", model }, 422);
    }
    return jsonResponse3({ success: true, model: attachPlan(model, { found: false, reason: "a pasted schedule comes with no floor plan." }) });
  });
}
