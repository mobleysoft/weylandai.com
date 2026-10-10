// weyland-sightx-worker/src/routes/sightx-sheets.js
//
// g068: a harvested set opened on its plan sheets, from its g066 placement record
// (tools/corpus/harvest/placement/<sha16>.json, built into data/sheets by tools/accuracy/g068/build-sheets.mjs):
//   GET /api/sightx/sheets/:sha16             -> { set, sheets, tags, summary }: each placed door tag at its
//                                                PDF-point coordinates on its sheet, with the schedule row it matched
//   GET /api/sightx/sheets/:sha16/:file       -> p<page>.png, the sheet rendered at 100 dpi from the set's own PDF
// Public: the sets are public bid documents. The images are passed in (src/index.js imports them as Data
// modules) so the route and its tests load under plain node.

import { jsonResponse3 } from "../lib/json-response.js";
import { SHEET_SETS } from "../data/sheets/records.js";

export function registerSightXSheetRoutes(router, { images = {}, sets = SHEET_SETS } = {}) {
  router.get("/api/sightx/sheets/:sha16", (request) => {
    const rec = sets[String(request.params.sha16 || "").toLowerCase()];
    if (!rec) return jsonResponse3({ success: false, message: "No placement record for this set. Known: " + Object.keys(sets).join(", ") }, 404);
    return jsonResponse3({ success: true, ...rec });
  });

  router.get("/api/sightx/sheets/:sha16/:file", (request) => {
    const sha = String(request.params.sha16 || "").toLowerCase();
    const m = /^p(\d{1,4})\.png$/.exec(String(request.params.file || ""));
    const rec = sets[sha];
    const sheet = rec && m && rec.sheets.find((s) => s.page === +m[1]);
    const bytes = sheet && images[sha + "/" + sheet.page];
    if (!bytes) return jsonResponse3({ success: false, message: "No such sheet image." }, 404);
    return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
  });
}
