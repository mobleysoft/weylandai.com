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
//
// ONE PATH FOR EVERY SPEC LINE (2026-10-07). However a line arrives - pasted
// (POST /match-batch {text}), as fields (/match-batch {lines}), or typed into
// a single-line form (POST /match: the CutsheetX page's MATCH and the
// homepage's TRY A REAL MATCH) - it becomes the same {raw, manufacturer,
// model, modelFull} line (lineFromFields reads fields with the paste parser,
// parseSpecText), is matched by the same call (matchLine) and is projected by
// the same toBatchResult, so one line gets one answer everywhere. Before this,
// /match handed its raw fields to the matcher and its callers read only
// cutSheets[]: Schlage L9080, matched through its catalogue page because no
// standalone cut sheet is filed, read "No match found" on the CutsheetX page
// and the homepage form while the paste cited Schlage L Series Catalog p. 25.
// /match now returns every key it returned before plus match-batch's per-line
// answer (raw, line, cutSheet, cataloguePage, citation).
//
// LINES AS SPECS PRINT THEM (2026-10-08). The parser (weyland-shared/spec-lines.js)
// reads QTY EA DESCRIPTION CATALOG FINISH MFR, takes the maker from the code at
// the end (SEL, SCH, LCN, IVE ...), skips the group heading, the door list, the
// column header and wrapped tails, and never splits a description at a comma.
// Skipped lines come back in `skipped` with the reason, so "1 of 14 lines
// matched" (nine of them headings, door numbers and wrapped text) reads as
// "5 of 6 lines matched, 8 skipped". A line of words with no digit and no
// maker we know is tried as a model and, when nothing is named that, listed as
// wrapped text rather than counted as a miss. Every unmatched line says why
// (reason, reasonText, need): the maker is not in the catalogue, the maker is
// but the model is not, the token is a finish code, no catalogue number on
// the line. A named maker's line is never answered with another maker's product.

import { matchComponentToCutSheets, citationFor } from "../lib/product-database.js";
import { parseSpecText, parseSpecLines, recordMisses } from "../lib/cut-sheet-misses.js";
import { getManufacturerNames } from "../lib/product-database.js";
import { jsonResponse3 } from "../lib/json-response.js";
import { signMatchResultLinks } from "../lib/citation-links.js";

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

function normName(s) {
  return String(s || "").toLowerCase().replace(/[.,]+$/, "").replace(/\s+/g, " ").trim();
}

// Fields (manufacturer + model, or catalog_number) -> the line a paste of the
// same text produces: "Schlage" + "L9080" is read exactly like the pasted line
// "Schlage L9080". The typed manufacturer joins the catalogue's names for this
// one parse, so the line splits where the visitor split it (a maker the
// catalogue does not list stays the manufacturer, as typed, and the matcher
// decides how far to trust it). A model field that repeats the manufacturer
// ("Schlage" + "Schlage L9080") is read once. If the parser still reads the
// text differently from the fields (a header-like word, a maker name longer
// than four words, a comma inside the model), the fields win: manufacturer as
// typed, the model's first token as the model, the whole model as modelFull.
export function lineFromFields(fields, knownManufacturers = []) {
  const str = (v) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/\s+/g, " ").trim() : "");
  const mfr = str(fields && fields.manufacturer).replace(/[|,;]+/g, " ").replace(/\s+/g, " ").trim();
  let modelText = str(fields && fields.model) || str(fields && fields.catalog_number);
  if (mfr && modelText.toLowerCase().startsWith(mfr.toLowerCase() + " ")) modelText = modelText.slice(mfr.length + 1).trim();
  if (!modelText) return null;
  const text = mfr ? mfr + " " + modelText : modelText;
  const names = Array.isArray(knownManufacturers) ? knownManufacturers : [];
  const parsed = parseSpecText(text, mfr ? names.concat([mfr]) : names)[0] || null;
  if (parsed && (!mfr || normName(parsed.manufacturer) === normName(mfr))) return parsed;
  const tokens = modelText.split(/[\s|,;]+/).filter(Boolean);
  const model = tokens[0];
  const modelFull = tokens.join(" ");
  return { raw: text, manufacturer: mfr || null, model, modelFull: modelFull !== model ? modelFull : undefined };
}

// The one matcher call every entry point makes for a line. Its citation URLs
// come back signed (lib/citation-links.js), so a citation opens as a plain
// link for the guest or account that asked.
export async function matchLine(line, env2) {
  const r = await matchComponentToCutSheets({ manufacturer: line.manufacturer || void 0, model: line.model, modelFull: line.modelFull || void 0, description: line.description || void 0, noModel: line.noModel || void 0 }, env2);
  return signMatchResultLinks(env2, r);
}

// Projects the shared matcher's full result down to the compact per-line
// shape /match-batch returns. One matching implementation
// (matchComponentToCutSheets, via matchLine) feeds both /match and
// /match-batch.
export function toBatchResult(line, r) {
  const sheet = (r.cutSheets && r.cutSheets[0]) || null;
  const out = {
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
    // 2026-10-05: when no cut sheet is filed, the first catalogue page that
    // mentions the model (see product-database.js getCataloguePagesForModel).
    cataloguePage: (r.cataloguePages && r.cataloguePages[0]) || null,
    // One citation whichever kind is filed: a standalone sheet first, else
    // the catalogue page that names the model. Null only when neither exists.
    citation: citationFor(r),
  };
  // 2026-10-08: what the line said (a spec line's quantity, description and finish, the maker
  // as resolved from its code) and, for a miss, why.
  if (line.modelFull && line.modelFull !== line.model) out.modelFull = line.modelFull;
  if (line.description) out.description = line.description;
  if (line.qty != null) out.qty = line.qty;
  if (line.finish) out.finish = line.finish;
  if (r.maker && r.maker.name && r.maker.typed) out.maker = r.maker.name;
  if (r.matchNote) out.matchNote = r.matchNote;
  if (!r.matched && r.reason) { out.reason = r.reason; out.reasonText = r.reasonText || null; out.need = r.need || null; }
  return out;
}

// POST /match's answer: every key it returned before (matched, product with
// its series/grade flags, cutSheets[], cataloguePages[], confidence,
// matchType, and component = the request's own fields), plus the per-line
// answer /match-batch gives for the same line (raw, line, cutSheet,
// cataloguePage, citation).
export function singleMatchResponse(line, r, requestFields) {
  const one = toBatchResult(line, r);
  return Object.assign({}, r, {
    component: requestFields,
    raw: one.raw,
    line: { manufacturer: line.manufacturer ?? null, model: line.model, modelFull: line.modelFull ?? null },
    cutSheet: one.cutSheet,
    cataloguePage: one.cataloguePage,
    citation: one.citation,
  });
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
    // The same line path as /match-batch (see the file header).
    const line = lineFromFields({ manufacturer, model, catalog_number }, await getManufacturerNames(env2));
    if (!line) {
      return jsonResponse3({ error: "Missing required field: model or catalog_number" }, 400);
    }
    const r = await matchLine(line, env2);
    if (!r.matched && line.model && !line.tentative) {
      recordMissesInBackground(ctx, env2, [{ manufacturer: (r.maker && r.maker.typed && r.maker.name) || line.manufacturer, model: line.model }]);
    }
    return jsonResponse3(singleMatchResponse(line, r, { manufacturer, model, catalog_number, component_type }));
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
  let skipped = [];
  if (Array.isArray(body?.lines)) {
    if (body.lines.length > MATCH_BATCH_CAP) {
      return jsonResponse3({ error: `Too many lines: ${body.lines.length} (max ${MATCH_BATCH_CAP})`, max: MATCH_BATCH_CAP }, 400);
    }
    lines = [];
    const names = await getManufacturerNames(env2);
    for (const l of body.lines) {
      if (!l || typeof l !== "object") continue;
      const model = typeof l.model === "string" ? l.model.trim() : "";
      if (!model) continue;
      const manufacturer = typeof l.manufacturer === "string" && l.manufacturer.trim() ? l.manufacturer.trim() : null;
      const raw = typeof l.raw === "string" && l.raw.trim() ? l.raw.trim() : [manufacturer, model].filter(Boolean).join(" ");
      const modelFull = typeof l.modelFull === "string" && l.modelFull.trim() ? l.modelFull.trim() : void 0;
      if (modelFull) {
        // A caller that split the line itself (modelFull given) is taken as sent.
        lines.push({ raw, manufacturer, model, modelFull });
        continue;
      }
      // Fields read exactly as POST /match reads them (lineFromFields).
      const line = lineFromFields({ manufacturer, model }, names);
      if (line) lines.push(Object.assign(line, { raw }));
    }
  } else if (typeof body?.text === "string") {
    if (body.text.length > 20000) {
      return jsonResponse3({ error: "text too long (max 20000 chars)" }, 400);
    }
    const parsed = parseSpecLines(body.text, await getManufacturerNames(env2));
    lines = parsed.lines;
    skipped = parsed.skipped;
    if (lines.length > MATCH_BATCH_CAP) {
      return jsonResponse3({ error: `Too many lines after parsing: ${lines.length} (max ${MATCH_BATCH_CAP})`, max: MATCH_BATCH_CAP, parsed: lines.length }, 400);
    }
  } else {
    return jsonResponse3({ error: "Provide lines:[{manufacturer?, model, raw?}] or text:string" }, 400);
  }
  if (lines.length === 0) {
    return jsonResponse3({ results: [], skipped, summary: { total: 0, matched: 0, missed: 0, skipped: skipped.length, ms: Date.now() - t0 } });
  }
  try {
    const all = new Array(lines.length);
    for (let i = 0; i < lines.length; i += MATCH_BATCH_CONCURRENCY) {
      const chunk = lines.slice(i, i + MATCH_BATCH_CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map((line) =>
        matchLine(line, env2).then((r) => toBatchResult(line, r))
      ));
      for (let j = 0; j < chunkResults.length; j++) all[i + j] = chunkResults[j];
    }
    // Words with no digit and no maker we know ("REQUIRED", "TKTX SCREWS AT HM DOORS") were
    // tried as a model; when nothing is named that they are wrapped text, not misses.
    const results = [];
    for (let i = 0; i < all.length; i++) {
      if (!all[i].matched && lines[i].tentative) skipped.push({ raw: lines[i].raw, reason: "wrapped" });
      else results.push(all[i]);
    }
    const matched = results.filter((r) => r.matched).length;
    recordMissesInBackground(ctx, env2, results.filter((r) => !r.matched && r.model).map((r) => ({ manufacturer: r.maker || r.manufacturer, model: r.model })));
    return jsonResponse3({
      results,
      skipped,
      summary: { total: results.length, matched, missed: results.length - matched, skipped: skipped.length, ms: Date.now() - t0 },
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
      batch.map((comp) => matchComponentToCutSheets(comp, env2).then((r) => signMatchResultLinks(env2, r)))
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
      components.results.map((comp) => matchComponentToCutSheets(comp, env2).then((r) => signMatchResultLinks(env2, r)))
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
