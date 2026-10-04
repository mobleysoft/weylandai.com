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
import { parseSpecText, recordMisses } from "../lib/cut-sheet-misses.js";
import { jsonResponse3 } from "../lib/json-response.js";

// POST /api/cut-sheets/match-batch (2026-10-04): up to this many lines per
// call; 400 above (not silently truncated like the older /batch-match).
const MATCH_BATCH_CAP = 60;
// D1 concurrency per chunk - each line costs 1-3 product queries plus one
// cut-sheet lookup; 60 fully-parallel lines was judged too bursty.
const MATCH_BATCH_CONCURRENCY = 8;

// Fire-and-forget anonymized miss recording. ctx.waitUntil keeps the D1
// upsert off the response's critical path; if ctx is missing (tests) we
// just let the promise float.
function recordMissesInBackground(ctx, env2, misses) {
  if (!misses.length) return;
  const p = recordMisses(env2, misses);
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
}

// Projects the shared matcher's full result down to the compact per-line
// shape /match-batch returns. One matching implementation
// (matchComponentToCutSheets) feeds both /match and /match-batch.
function toBatchResult(line, r) {
  const sheet = (r.cutSheets && r.cutSheets[0]) || null;
  return {
    raw: line.raw,
    manufacturer: line.manufacturer ?? null,
    model: line.model,
    matched: !!r.matched,
    confidence: r.confidence ?? null,
    matchType: r.matchType ?? null,
    product: r.product ? {
      id: r.product.id,
      name: r.product.name,
      manufacturer: r.product.manufacturer,
      model: r.product.model,
      category: r.product.category ?? null,
    } : null,
    cutSheet: sheet ? {
      id: sheet.id,
      title: sheet.title,
      pages: sheet.pages ?? null,
      pageHint: sheet.pageHint ?? null,
      pageUrl: sheet.pageUrl ?? null,
    } : null,
  };
}

export function registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess }) {
router.post("/api/cut-sheets/match", async (request2, env2, ctx) => {
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
    if (!result.matched) {
      recordMissesInBackground(ctx, env2, [{ manufacturer, model: model || catalog_number }]);
    }
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
// POST /api/cut-sheets/match-batch (2026-10-04)
// body: {lines:[{manufacturer?, model, raw?}]}  OR  {text: "<pasted lines>"}
// Returns {results:[{raw, manufacturer, model, matched, confidence,
//   matchType, product|null, cutSheet|null}], summary:{total, matched,
//   missed, ms}}. Same auth as /match (ephemeral trial OK). Unmatched
//   lines are recorded anonymously (manufacturer+model only).
router.post("/api/cut-sheets/match-batch", async (request2, env2, ctx) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  const t0 = Date.now();
  let body;
  try {
    body = await request2.json();
  } catch {
    return jsonResponse3({ error: "Body must be JSON: {lines:[...]} or {text:\"...\"}" }, 400);
  }
  let lines;
  if (Array.isArray(body?.lines)) {
    if (body.lines.length > MATCH_BATCH_CAP) {
      return jsonResponse3({ error: `Too many lines: ${body.lines.length} (max ${MATCH_BATCH_CAP})`, max: MATCH_BATCH_CAP }, 400);
    }
    lines = [];
    for (const l of body.lines) {
      if (!l || typeof l !== "object") continue;
      const model = typeof l.model === "string" ? l.model.trim() : "";
      if (!model) continue;
      const manufacturer = typeof l.manufacturer === "string" && l.manufacturer.trim() ? l.manufacturer.trim() : null;
      const raw = typeof l.raw === "string" && l.raw.trim() ? l.raw.trim() : [manufacturer, model].filter(Boolean).join(" ");
      lines.push({ raw, manufacturer, model });
    }
  } else if (typeof body?.text === "string") {
    if (body.text.length > 20000) {
      return jsonResponse3({ error: "text too long (max 20000 chars)" }, 400);
    }
    lines = parseSpecText(body.text);
    if (lines.length > MATCH_BATCH_CAP) {
      return jsonResponse3({ error: `Too many lines after parsing: ${lines.length} (max ${MATCH_BATCH_CAP})`, max: MATCH_BATCH_CAP, parsed: lines.length }, 400);
    }
  } else {
    return jsonResponse3({ error: "Provide lines:[{manufacturer?, model, raw?}] or text:string" }, 400);
  }
  if (lines.length === 0) {
    return jsonResponse3({ results: [], summary: { total: 0, matched: 0, missed: 0, ms: Date.now() - t0 } });
  }
  try {
    const results = new Array(lines.length);
    for (let i = 0; i < lines.length; i += MATCH_BATCH_CONCURRENCY) {
      const chunk = lines.slice(i, i + MATCH_BATCH_CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map((line) =>
        matchComponentToCutSheets({ manufacturer: line.manufacturer || void 0, model: line.model }, env2)
          .then((r) => toBatchResult(line, r))
      ));
      for (let j = 0; j < chunkResults.length; j++) results[i + j] = chunkResults[j];
    }
    const matched = results.filter((r) => r.matched).length;
    recordMissesInBackground(ctx, env2, results.filter((r) => !r.matched).map((r) => ({ manufacturer: r.manufacturer, model: r.model })));
    return jsonResponse3({
      results,
      summary: { total: results.length, matched, missed: results.length - matched, ms: Date.now() - t0 },
    });
  } catch (err) {
    return jsonResponse3({ error: err.message }, 500);
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
