// src/routes/cut-sheet-coverage.js
//
// Added 2026-10-04 with the match-batch work. Three routes:
//
//   POST /api/cut-sheets/request-manufacturer  (auth, ephemeral OK, KV rate-limited)
//   GET  /api/cut-sheets/coverage               (PUBLIC, no auth, cacheable 60s)
//   GET  /api/cut-sheets/sheet/:id/pdf           (auth, ephemeral OK) - streams the
//        stored price-book PDF for a product_documents row, with HTTP Range
//        support so a browser's #page= deep link can seek inside a 19MB file.
//
// Every number /coverage returns is a live COUNT from weyland_db - there
// is no fallback constant anywhere in this file. If a table is missing
// (migration not yet applied) that field comes back as null, not 0.
//
// PDF availability, as verified live on 2026-10-04: all 7,792 cut_sheet
// rows have document_url = NULL and an r2_object_key in the subx-uploads
// bucket (env.UPLOADS); the keys collapse to 8 distinct full manufacturer
// price-book PDFs (LCN, Von Duprin, Falcon, Ives, NGP, Zero, Steelcraft,
// Glynn-Johnson). This route therefore streams whole price books; the
// per-product page is only ever carried in the #page= fragment the
// matcher derives from the row's title (see lib/product-database.js
// parsePageHint) - nothing here guesses a page.

import { jsonResponse3 } from "../lib/json-response.js";
import { kvRateLimit, normalizeMissKey } from "../lib/cut-sheet-misses.js";

const COVERAGE_TTL_SECONDS = 60;
const REQUEST_NOTE_MAX = 200;
const REQUEST_MFR_MAX = 120;

async function countOrNull(db, sql, ...binds) {
  try {
    const row = await db.prepare(sql).bind(...binds).first();
    if (!row) return null;
    const v = Object.values(row)[0];
    return v == null ? 0 : Number(v);
  } catch (err) {
    console.error("[coverage] query failed:", err?.message || err, sql.slice(0, 80));
    return null;
  }
}

function parseRange(header, size) {
  if (!header || !/^bytes=/.test(header)) return null;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return null;
  let start = m[1] === "" ? null : parseInt(m[1], 10);
  let end = m[2] === "" ? null : parseInt(m[2], 10);
  if (start == null && end == null) return null;
  if (start == null) { // suffix range: last N bytes
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (end == null || end >= size) {
    end = size - 1;
  }
  if (start > end || start >= size) return { invalid: true };
  return { start, end, length: end - start + 1 };
}

export function registerCutSheetCoverageRoutes(router, { authenticate, requireProductAccess }) {

router.post("/api/cut-sheets/request-manufacturer", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  const subject = user?.id || user?.userId || user?.sub || null;
  const rl = await kvRateLimit(env2, "mfr-request", subject, { limit: 10, windowSeconds: 3600 });
  if (rl.limited) {
    return jsonResponse3({ ok: false, error: "Rate limit: at most 10 manufacturer requests per hour." }, 429);
  }
  let body;
  try {
    body = await request2.json();
  } catch {
    return jsonResponse3({ ok: false, error: "Body must be JSON: {manufacturer, note?}" }, 400);
  }
  const manufacturer = typeof body?.manufacturer === "string" ? body.manufacturer.trim().replace(/\s+/g, " ") : "";
  if (!manufacturer) {
    return jsonResponse3({ ok: false, error: "manufacturer is required" }, 400);
  }
  if (manufacturer.length > REQUEST_MFR_MAX) {
    return jsonResponse3({ ok: false, error: `manufacturer must be <= ${REQUEST_MFR_MAX} chars` }, 400);
  }
  let note = null;
  if (body.note != null) {
    if (typeof body.note !== "string") return jsonResponse3({ ok: false, error: "note must be a string" }, 400);
    note = body.note.trim();
    if (note.length > REQUEST_NOTE_MAX) {
      return jsonResponse3({ ok: false, error: `note must be <= ${REQUEST_NOTE_MAX} chars` }, 400);
    }
    if (!note) note = null;
  }
  try {
    await env2.DB.prepare(`
      INSERT INTO cut_sheet_manufacturer_requests (id, manufacturer, note, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(crypto.randomUUID(), manufacturer, note).run();
    return jsonResponse3({ ok: true });
  } catch (err) {
    console.error("[request-manufacturer] insert failed:", err?.message || err);
    return jsonResponse3({ ok: false, error: "Could not record request" }, 500);
  }
});

// PUBLIC. No auth. Edge-cached (Cache API) + Cache-Control for 60s.
router.get("/api/cut-sheets/coverage", async (request2, env2, ctx) => {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(new URL(request2.url).origin + "/api/cut-sheets/coverage", { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      // Re-stamp headers on a hit: the zone's Browser Cache TTL setting
      // rewrites a cache-served response's Cache-Control to max-age=14400
      // (observed live 2026-10-04), which would make browsers hold a
      // 60-second snapshot for 4 hours. The edge TTL itself is still the
      // 60s the stored response carries.
      if (hit) {
        return new Response(hit.body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${COVERAGE_TTL_SECONDS}`,
            "Access-Control-Allow-Origin": "*",
            "X-Coverage-Cache": "hit",
          },
        });
      }
    } catch { /* cache miss path below */ }
  }
  const db = env2.DB;
  const [products, manufacturers, cutSheets, cutSheetFiles, missesTotal, missesDistinct, requests] = await Promise.all([
    countOrNull(db, "SELECT COUNT(*) AS c FROM products"),
    countOrNull(db, "SELECT COUNT(DISTINCT manufacturer_id) AS c FROM products"),
    countOrNull(db, "SELECT COUNT(*) AS c FROM product_documents WHERE document_type = 'cut_sheet' AND active = 1"),
    countOrNull(db, "SELECT COUNT(DISTINCT r2_object_key) AS c FROM product_documents WHERE document_type = 'cut_sheet' AND active = 1 AND r2_object_key IS NOT NULL"),
    countOrNull(db, "SELECT COALESCE(SUM(count), 0) AS c FROM cut_sheet_misses"),
    countOrNull(db, "SELECT COUNT(*) AS c FROM cut_sheet_misses"),
    countOrNull(db, "SELECT COUNT(*) AS c FROM cut_sheet_manufacturer_requests"),
  ]);
  let topMissed = [];
  try {
    const rows = await db.prepare(`
      SELECT manufacturer, model, count FROM cut_sheet_misses
      ORDER BY count DESC, last_seen DESC LIMIT 10
    `).all();
    topMissed = (rows.results || []).map((r) => ({ manufacturer: r.manufacturer, model: r.model, count: Number(r.count) }));
  } catch (err) {
    console.error("[coverage] top_missed failed:", err?.message || err);
  }
  const payload = {
    products,
    manufacturers,
    cutSheets,
    // Honest extra: the 7,792 cut-sheet rows resolve to this many distinct
    // stored PDF files (full price books), so nobody reads cutSheets as
    // "7,792 separate documents".
    cutSheetFiles,
    misses_total: missesTotal,
    misses_distinct: missesDistinct,
    top_missed: topMissed,
    requests,
    as_of: new Date().toISOString(),
  };
  const resp = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${COVERAGE_TTL_SECONDS}`,
      "Access-Control-Allow-Origin": "*",
    },
  });
  if (cache && ctx && typeof ctx.waitUntil === "function") {
    try { ctx.waitUntil(cache.put(cacheKey, resp.clone())); } catch { /* best effort */ }
  }
  return resp;
});

// Streams the stored PDF behind a product_documents row. Ephemeral OK.
// Range requests honoured (206) so PDF viewers can seek to #page=N
// without pulling the whole price book first.
router.get("/api/cut-sheets/sheet/:id/pdf", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  const id = request2.params.id;
  let doc;
  try {
    doc = await env2.DB.prepare(`
      SELECT id, document_title, r2_object_key, r2_bucket, mime_type
      FROM product_documents WHERE id = ?
    `).bind(id).first();
  } catch (err) {
    return jsonResponse3({ error: "Lookup failed", details: err.message }, 500);
  }
  if (!doc) return jsonResponse3({ error: "Cut sheet not found" }, 404);
  if (!doc.r2_object_key) {
    return jsonResponse3({ error: "No stored PDF for this cut sheet", id: doc.id, available: false }, 404);
  }
  const bucket = doc.r2_bucket === "product-docs" ? env2.OUTPUTS : env2.UPLOADS;
  const rangeHeader = request2.headers.get("Range");
  const baseHeaders = {
    "Content-Type": doc.mime_type || "application/pdf",
    "Content-Disposition": `inline; filename="cut-sheet-${normalizeMissKey(doc.id).replace(/[^a-z0-9-]/g, "")}.pdf"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };
  try {
    if (rangeHeader) {
      const head = await bucket.head(doc.r2_object_key);
      if (!head) return jsonResponse3({ error: "Document file not found in storage", available: false }, 404);
      const range = parseRange(rangeHeader, head.size);
      if (range && !range.invalid) {
        const part = await bucket.get(doc.r2_object_key, { range: { offset: range.start, length: range.length } });
        if (!part) return jsonResponse3({ error: "Document file not found in storage", available: false }, 404);
        return new Response(part.body, {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Length": String(range.length),
            "Content-Range": `bytes ${range.start}-${range.end}/${head.size}`,
          },
        });
      }
      if (range && range.invalid) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${head.size}` } });
      }
    }
    const object = await bucket.get(doc.r2_object_key);
    if (!object) return jsonResponse3({ error: "Document file not found in storage", available: false }, 404);
    return new Response(object.body, {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(object.size) },
    });
  } catch (err) {
    console.error("[sheet pdf] stream failed:", err?.message || err);
    return jsonResponse3({ error: "Failed to retrieve document", details: err.message }, 500);
  }
});
}
