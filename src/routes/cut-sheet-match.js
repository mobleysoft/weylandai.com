// src/routes/cut-sheet-match.js
//
// Real-time cut-sheet product matching for hardware components: match a
// single component against the product database (lib/product-database.js),
// batch-match up to 50 at once, or match every component in a whole
// hardware set and return its deduplicated cut-sheet list. Extracted
// 2026-09-10 from legacy-monolith.js (match/batch-match: previously
// inline, lines 147671-147743; for-set/:setId added 2026-09-10 from
// lines 147710-147769, same real dependencies, same file rather than a
// near-duplicate third module) - the first CPS/cut-sheet route file
// extracted (step 8), directly building on lib/product-database.js.
//
// authenticate/requireProductAccess are accepted as injected deps
// (matching every other extracted route module's convention) even
// though the real value passed in is always the same top-level
// lib/auth.js import - this keeps the module trivially testable with a
// fake authenticate rather than exercising the real auth flow.

import { matchComponentToCutSheets } from "../lib/product-database.js";

export function registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess }) {
router.post("/api/cut-sheets/match", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    const { manufacturer, model, catalog_number, component_type } = body;
    if (!model && !catalog_number) {
      return new Response(JSON.stringify({
        error: "Missing required field: model or catalog_number"
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const result = await matchComponentToCutSheets({
      manufacturer,
      model,
      catalog_number,
      component_type
    }, env2);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.post("/api/cut-sheets/batch-match", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  try {
    const body = await request2.json();
    const { components } = body;
    if (!Array.isArray(components) || components.length === 0) {
      return new Response(JSON.stringify({
        error: "Missing or empty components array"
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const maxBatch = 50;
    const batch = components.slice(0, maxBatch);
    const results = await Promise.all(
      batch.map((comp) => matchComponentToCutSheets(comp, env2))
    );
    const matched = results.filter((r) => r.matched);
    const unmatched = results.filter((r) => !r.matched);
    return new Response(JSON.stringify({
      total: batch.length,
      matched: matched.length,
      unmatched: unmatched.length,
      results,
      truncated: components.length > maxBatch
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.get("/api/cut-sheets/for-set/:setId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  try {
    const { setId } = request2.params;
    const components = await env2.DB.prepare(`
      SELECT id, component_type, manufacturer, model, catalog_number,
             dhi_category, sequence_order
      FROM hardware_components
      WHERE set_id = ?
      ORDER BY sequence_order
    `).bind(setId).all();
    if (!components.results || components.results.length === 0) {
      return new Response(JSON.stringify({
        error: "Hardware set not found or has no components",
        setId
      }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    const results = await Promise.all(
      components.results.map((comp) => matchComponentToCutSheets(comp, env2))
    );
    const seenSheets = /* @__PURE__ */ new Set();
    const uniqueCutSheets = [];
    for (const result of results) {
      for (const sheet of result.cutSheets) {
        if (!seenSheets.has(sheet.id)) {
          seenSheets.add(sheet.id);
          uniqueCutSheets.push({
            ...sheet,
            forComponents: [result.component.id]
          });
        } else {
          const existing = uniqueCutSheets.find((s) => s.id === sheet.id);
          if (existing)
            existing.forComponents.push(result.component.id);
        }
      }
    }
    return new Response(JSON.stringify({
      setId,
      componentCount: components.results.length,
      matchedCount: results.filter((r) => r.matched).length,
      cutSheets: uniqueCutSheets,
      componentMatches: results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
}
