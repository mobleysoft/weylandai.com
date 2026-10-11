// weyland-sightx-worker/src/routes/sightx-sheets.js
//
// SightX's sheet view (g068, reworked by g074): a set's plan sheets with its door tags where the plan prints
// them, one door card per opening, placed-of-total. The sheets are drawn in the visitor's browser from the PDF
// by the self-hosted pdf.js (/api/hardware-schedule/client-ocr-assets/pdf.mjs); no sheet image is served.
//   GET  /api/sightx/sheets/:sha16          -> a set we authored (the WeylandAI Building): its placement record
//                                              as { set, sheets, openings, summary }. No harvested set is here.
//   GET  /api/sightx/sheets/:sha16/set.pdf  -> that set's own PDF
//   POST /api/sightx/openings {doors, plan}  -> a SubX upload's openings: the page sends what SubX answered for
//                                              the customer's session (/doors and /plan, readPlan) and gets
//                                              { sheets, openings, summary, csv }. Stateless: nothing is stored.
// The PDFs are passed in (src/index.js imports them as Data modules) so the routes and tests load under node.

import { jsonResponse3 } from "../lib/json-response.js";
import { SHEET_SETS } from "../data/sheets/records.js";
import { openingsFromRecord, openingsFromSession, openingsCsv } from "../lib/openings.js";

const MAX_BODY = 4 * 1024 * 1024;

export function registerSightXSheetRoutes(router, { pdfs = {}, sets = SHEET_SETS } = {}) {
  router.get("/api/sightx/sheets/:sha16", (request) => {
    const rec = sets[String(request.params.sha16 || "").toLowerCase()];
    if (!rec) return jsonResponse3({ success: false, message: "No such set. The sheet view shows the WeylandAI Building (" + Object.keys(sets).join(", ") + ") and your own SubX uploads (WALK IT in SubX)." }, 404);
    const o = openingsFromRecord(rec);
    return jsonResponse3({ success: true, set: rec.set, ...o, csv: openingsCsv(o.openings) });
  });

  router.get("/api/sightx/sheets/:sha16/:file", (request) => {
    const sha = String(request.params.sha16 || "").toLowerCase();
    const bytes = request.params.file === "set.pdf" && sets[sha] ? pdfs[sha] : null;
    if (!bytes) return jsonResponse3({ success: false, message: "No such file." }, 404);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Cache-Control": "public, max-age=86400" } });
  });

  router.post("/api/sightx/openings", async (request) => {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_BODY) return jsonResponse3({ success: false, message: "Too large." }, 413);
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse3({ success: false, message: "invalid JSON body" }, 400); }
    if (!body || !Array.isArray(body.doors)) return jsonResponse3({ success: false, message: "Send the session's doors (and its plan when SubX found one)." }, 400);
    const o = openingsFromSession(body.doors, body.plan && typeof body.plan === "object" ? body.plan : null);
    return jsonResponse3({ success: true, ...o, csv: openingsCsv(o.openings) });
  });
}
