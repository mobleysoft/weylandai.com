// src/routes/hardware-schedule-page-extract.js
//
// Single-page Claude Vision extraction workflow: fetch/extract a page
// (cache-first, with KV->R2 fallback for the source PDF), approve a
// page's corrected data into real hardware_sets/hardware_components
// rows, run just the extract-image step in isolation, inspect the
// resolved extraction contract for a page (which prompt/schema version
// would be used), and submit an already-rendered image straight to
// extract-result. Extracted 2026-09-10 from legacy-monolith.js
// (previously inline, lines 148844-149269).
//
// authenticate/jsonResponse3/classifyError/jsonErrorResponse/ErrorMetrics
// are real top-level imports (error-utilities.js was just wired into
// the build this session, same as rate-limit.js earlier).
//
// Five shared cluster-wide helpers stay injected dependencies,
// continuing the pattern from every prior piece: getSessionStatus,
// isPageInRange (both already established), extractFromPageImage,
// queuePageExtractionJob (both already established from the prior
// piece), plus four new to this file - approvePageExtraction,
// extractSinglePage, resolveExtractionContract, savePageExtraction2 -
// each with real call sites in routes still inline elsewhere in the
// cluster.

import { jsonResponse3 } from "../lib/json-response.js";
import { classifyError, jsonErrorResponse, ErrorMetrics } from "../error-utilities.js";
import { findPagesInBrowser, runGridPagesInBrowser } from "../lib/browser-grid-extraction.js";
import { persistBrowserGridResult } from "../lib/hardware-extraction-pipeline.js";
import { openTextLayerDoc, readPageFromDoc, pageTextItems } from "../lib/text-layer-read.js";
import { readPlan } from "../../../weyland-shared/plan-read.js";
import { autoEnrichSessionOnSave } from "../lib/hardware-extraction-single-page.js";

// The URL the runner tab fetches the session's PDF from (2026-10-08). This
// worker holds no signing secret, so the token is a hash of the session's own
// file key (a UUID only its row knows) and the hour; the current and the
// previous hour's tokens are accepted.
async function runnerToken(session, hourOffset = 0) {
  const bucket = Math.floor(Date.now() / 3600000) - hourOffset;
  const data = new TextEncoder().encode(String(session.file_buffer_key || "") + ":" + session.id + ":" + bucket);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
export async function runnerPdfUrl(session, env2) {
  const origin = String(env2.SUBX_RUNNER_ORIGIN || "https://weylandai.com").replace(/\/$/, "");
  return origin + "/api/hardware-schedule/runner-pdf/" + encodeURIComponent(session.id) + "/" + (await runnerToken(session));
}

// The session's PDF: KV first, then R2 (re-cached), as the page read does.
async function sessionPdf(session, env2) {
  let fileBuffer = await env2.CACHE.get(session.file_buffer_key, { type: "arrayBuffer" });
  if (!fileBuffer && env2.UPLOADS) {
    const r2Object = await env2.UPLOADS.get(session.file_buffer_key);
    if (r2Object) {
      fileBuffer = await r2Object.arrayBuffer();
      try { await env2.CACHE.put(session.file_buffer_key, fileBuffer, { expirationTtl: 86400 * 7 }); } catch (_) { /* too large for KV */ }
    }
  }
  return fileBuffer;
}

export function registerHardwareSchedulePageExtractRoutes(router, {
  authenticate,
  getSessionStatus,
  isPageInRange,
  extractFromPageImage,
  queuePageExtractionJob,
  approvePageExtraction,
  extractSinglePage,
  resolveExtractionContract,
  savePageExtraction2,
  writeDoorScheduleEntries,
}) {
router.get("/api/hardware-schedule/session/:sessionId/page/:pageNum", async (request2, env2, ctx) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  const metrics = new ErrorMetrics(env2);
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    if (!pageNum || pageNum < 1) {
      const validationError = new Error("Invalid page number");
      validationError.retryable = false;
      throw validationError;
    }
    // startRow paginates a dense table's per-row OCR loop across multiple
    // requests (real fix 2026-10-02 for Cloudflare's hard 30s CPU ceiling
    // on a real 39-row door schedule - see hardware-extraction-vision-
    // dispatch.js's extractGridDoors header comment). A continuation call
    // (startRow > 0) must bypass the "already extracted this page" cache
    // below - that cache predates pagination and would otherwise just
    // replay the FIRST batch's stale result instead of fetching more rows.
    // The real door rows themselves already accumulate correctly across
    // calls via door_schedule_entries' own ON CONFLICT upsert, independent
    // of this cache.
    const url = new URL(request2.url);
    const startRow = parseInt(url.searchParams.get("startRow") || "0", 10) || 0;
    // ?type=door_schedule|hardware_schedule names what this page holds
    // (2026-10-08): a bid set's door schedule and hardware groups are read
    // into one session, each page as its own kind.
    const typeParam = url.searchParams.get("type");
    const requestedType = typeParam === "door_schedule" || typeParam === "hardware_schedule" ? typeParam : null;
    console.log(`[Hardware Page] Extracting page ${pageNum} for session ${sessionId} (startRow=${startRow}, type=${requestedType || "session"})`);
    const session = await getSessionStatus(sessionId, env2);
    if (!session) {
      const notFoundError = new Error("Session not found");
      notFoundError.retryable = false;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    if (pageNum > session.total_pages) {
      const validationError = new Error(`Page ${pageNum} exceeds total pages (${session.total_pages})`);
      validationError.retryable = false;
      throw validationError;
    }
    const cached = startRow > 0 ? null : await env2.DB.prepare(`
      SELECT extracted_data, status
      FROM hardware_page_extractions
      WHERE session_id = ? AND page_number = ?
    `).bind(sessionId, pageNum).first();
    if (cached) {
      console.log(`[Hardware Page] Returning cached extraction for page ${pageNum}`);
      const latency = Date.now() - startTime;
      await metrics.recordLatency("page_extraction_cached", latency, true);
      return jsonResponse3({
        success: true,
        sessionId,
        pageNumber: pageNum,
        status: cached.status,
        data: JSON.parse(cached.extracted_data),
        cached: true
      });
    }
    console.log(`[Hardware Page] Retrieving PDF from KV: ${session.file_buffer_key}`);
    let fileBuffer = await env2.CACHE.get(session.file_buffer_key, { type: "arrayBuffer" });
    if (!fileBuffer && env2.UPLOADS) {
      console.log(`[Hardware Page] KV expired, trying R2 fallback: ${session.file_buffer_key}`);
      const r2Object = await env2.UPLOADS.get(session.file_buffer_key);
      if (r2Object) {
        fileBuffer = await r2Object.arrayBuffer();
        console.log(`[Hardware Page] PDF retrieved from R2 (${fileBuffer.byteLength} bytes)`);
        await env2.CACHE.put(session.file_buffer_key, fileBuffer, {
          expirationTtl: 86400 * 7
          // 7 days
        });
        console.log(`[Hardware Page] PDF re-cached in KV`);
      }
    }
    if (!fileBuffer) {
      console.error(`[Hardware Page] PDF not found in KV or R2: ${session.file_buffer_key}`);
      const notFoundError = new Error("PDF file not found. Please re-upload the document.");
      notFoundError.retryable = false;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    console.log(`[Hardware Page] PDF retrieved successfully (${fileBuffer.byteLength} bytes)`);
    console.log(`[Hardware Page] Starting Claude Vision extraction for page ${pageNum}`);
    const extractionStartTime = Date.now();
    const extractionResult = await extractSinglePage(fileBuffer, pageNum, env2, sessionId, startRow, { scheduleType: requestedType });
    const extractionLatency = Date.now() - extractionStartTime;
    await metrics.recordLatency("claude_extraction", extractionLatency, true);
    console.log(`[Hardware Page] Claude Vision extraction completed in ${extractionLatency}ms`);
    // Real bug fixed 2026-10-02: this route always returned HTTP success
    // regardless of extractionResult.success, so a real failure (e.g.
    // runEmbeddedGofaineatExtraction's "schedule_type_not_implemented" for
    // finish_schedule/frame_schedule) got silently wrapped as
    // status:"pending_review" with 0 results saved - looked exactly like
    // "ran fine, found nothing" instead of "didn't run at all."
    if (extractionResult.success === false) {
      return jsonResponse3({
        success: false,
        sessionId,
        pageNumber: pageNum,
        error: extractionResult.error || "extraction_failed",
        detail: extractionResult.detail || null,
      }, 422);
    }
    // A paginated door-schedule result (done===false) means more rows
    // remain - only cache the "fully extracted this page" record once the
    // last batch completes, so a later plain GET doesn't replay a partial
    // result as if it were the finished extraction.
    const isPartial = extractionResult.done === false;
    if (!isPartial) {
      await savePageExtraction2(sessionId, pageNum, extractionResult, env2, { ctx });
    }
    // extractionResult shape depends on the session's real schedule_type -
    // door_schedule yields {entries:[...], entry_count}, hardware_schedule
    // yields {hardware_groups:[...]} - log whichever is actually present
    // rather than assuming hardware_groups always exists (it doesn't for a
    // real door schedule, see hardware-extraction-single-page.js's
    // 2026-10-01 fix).
    const isDoorSchedule = extractionResult.schedule_type === "door_schedule";
    const foundCount = isDoorSchedule
      ? (extractionResult.entry_count ?? (extractionResult.entries || []).length)
      : (extractionResult.hardware_groups || []).length;
    console.log(`[Hardware Page] Extracted page ${pageNum}: ${foundCount} ${isDoorSchedule ? "doors" : "sets"} found (done=${extractionResult.done})`);
    const totalLatency = Date.now() - startTime;
    await metrics.recordLatency("page_extraction_full", totalLatency, true);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      status: isPartial ? "extracting" : "pending_review",
      data: extractionResult,
      cached: false,
      next_step: isPartial ? {
        action: "continue_extraction",
        endpoint: `/api/hardware-schedule/session/${sessionId}/page/${pageNum}?startRow=${extractionResult.next_start_row}`,
      } : null,
      performance: {
        total_ms: totalLatency,
        extraction_ms: extractionLatency
      }
    });
  } catch (error5) {
    const latency = Date.now() - startTime;
    console.error(`[Hardware Page] Error after ${latency}ms:`, error5);
    const classification = classifyError(error5);
    await metrics.recordError(classification.code, {
      sessionId: request2.params.sessionId,
      pageNumber: request2.params.pageNum,
      userId: user.userId,
      latency
    });
    return jsonErrorResponse(error5, {
      sessionId: request2.params.sessionId,
      pageNumber: request2.params.pageNum,
      userId: user.userId
    });
  }
});
// The runner tab's copy of a session's PDF (see runnerPdfUrl).
router.get("/api/hardware-schedule/runner-pdf/:sessionId/:token", async (request2, env2) => {
  const session = await env2.DB.prepare("SELECT id, file_buffer_key, filename FROM hardware_extraction_sessions WHERE id = ?").bind(request2.params.sessionId).first();
  if (!session) return jsonResponse3({ error: "not found" }, 404);
  const token = String(request2.params.token || "");
  const ok = token.length >= 40 && (token === (await runnerToken(session, 0)) || token === (await runnerToken(session, 1)));
  if (!ok) return jsonResponse3({ error: "not found" }, 404);
  const fileBuffer = await sessionPdf(session, env2);
  if (!fileBuffer) return jsonResponse3({ error: "not stored" }, 404);
  return new Response(fileBuffer, { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
});

// Where the schedules are in the uploaded PDF (2026-10-08): the text layer of
// every page, read in the Browser Rendering runner with the same module the
// workspace runs in a tab. Kept on the session (detected_schedule_pages) so a
// second call answers at once; ?refresh=1 reads again.
router.post("/api/hardware-schedule/session/:sessionId/find-pages", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  if (!user || !user.userId) return jsonResponse3({ success: false, error: "Sign in to read your schedules.", code: "SIGN_IN_REQUIRED" }, 401);
  const sessionId = request2.params.sessionId;
  const session = await env2.DB.prepare("SELECT * FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return jsonResponse3({ success: false, error: "Session not found" }, 404);
  if (session.user_id !== user.userId) return jsonResponse3({ success: false, error: "This session belongs to another account" }, 403);
  const url = new URL(request2.url);
  const refresh = url.searchParams.get("refresh") === "1";
  if (!refresh && session.detected_schedule_pages) {
    try {
      const prior = JSON.parse(session.detected_schedule_pages);
      if (prior && prior.source === "text_layer") return jsonResponse3({ success: true, sessionId, cached: true, ...prior });
    } catch (_) { /* an older bookmark-based value: read again */ }
  }
  if (String(session.file_buffer_key || "").startsWith("demo-clone/")) {
    return jsonResponse3({ success: false, error: "The demo building has no uploaded PDF to look through." }, 404);
  }
  const fileBuffer = await sessionPdf(session, env2);
  if (!fileBuffer) return jsonResponse3({ success: false, error: "The uploaded PDF is no longer stored; upload it again." }, 404);
  const fp = await findPagesInBrowser(env2, fileBuffer, { pdfUrl: await runnerPdfUrl(session, env2) });
  if (!fp.ok) {
    return jsonResponse3({ success: false, error: "The pages could not be looked through just now (" + (fp.error || "reader unavailable") + (fp.detail ? ": " + fp.detail : "") + "). Pick the schedule page yourself and press READ THIS PAGE." }, 503);
  }
  const r = fp.result || {};
  const stored = {
    source: "text_layer",
    pages: r.pages || session.total_pages,
    door_schedule_pages: r.door_schedule_pages || [],
    hardware_pages: r.hardware_pages || [],
    pages_without_text: (r.pages_without_text || []).slice(0, 400),
    details: (r.details || []).filter((d) => d.door_schedule || d.hardware).slice(0, 60),
    ms: fp.ms,
    found_at: new Date().toISOString(),
  };
  try {
    await env2.DB.prepare("UPDATE hardware_extraction_sessions SET detected_schedule_pages = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(stored), stored.found_at, sessionId).run();
  } catch (e) {
    console.warn("[find-pages] could not store the result: " + e.message);
  }
  return jsonResponse3({ success: true, sessionId, cached: false, ...stored });
});

// The floor plan (S1, 2026-10-09): the plan sheets found by their title blocks, the rooms they
// label, and every door tag tied to a schedule mark (weyland-shared/plan-read.js). Read from the
// PDF's own text in this Worker; kept in the cache against the session's door rows, so a re-read
// schedule is tagged again. Drawing-size pages only (a spec page has no plan).
const PLAN_VERSION = "plan:v1:";
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
router.get("/api/hardware-schedule/session/:sessionId/plan", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  const sessionId = request2.params.sessionId;
  const session = await env2.DB.prepare("SELECT * FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return jsonResponse3({ success: false, error: "Session not found" }, 404);
  if (!user || session.user_id !== user.userId) return jsonResponse3({ success: false, error: "This session belongs to another account" }, 403);
  if (String(session.file_buffer_key || "").startsWith("demo-clone/")) {
    return jsonResponse3({ success: true, sessionId, found: false, reason: "The demo building has no uploaded plans; SightX lays it out from the schedule." });
  }
  const rows = (await env2.DB.prepare("SELECT mark, notes, page_number FROM door_schedule_entries WHERE session_id = ? ORDER BY page_number, rowid").bind(sessionId).all()).results || [];
  const doors = rows.filter((r) => r.mark).map((r) => ({ mark: String(r.mark), location: ((String(r.notes || "").match(/Room:\s*([^;]+)/i) || [])[1] || "").trim() || null, page: r.page_number ?? null }));
  const key = PLAN_VERSION + sessionId + ":" + fnv(JSON.stringify(doors));
  const refresh = new URL(request2.url).searchParams.get("refresh") === "1";
  if (!refresh) {
    try { const hit = await env2.CACHE.get(key, "json"); if (hit) return jsonResponse3({ success: true, sessionId, cached: true, ...hit }); } catch (_) { /* read again */ }
  }
  const fileBuffer = await sessionPdf(session, env2);
  if (!fileBuffer) return jsonResponse3({ success: false, error: "The uploaded PDF is no longer stored; upload it again." }, 404);
  const t0 = Date.now();
  let doc;
  try { doc = await openTextLayerDoc(fileBuffer); } catch (e) { return jsonResponse3({ success: false, error: "The PDF did not open for its text: " + (e && e.message) }, 422); }
  const pages = [];
  let skipped = 0, stopped = null;
  try {
    for (let n = 1; n <= Math.min(doc.numPages, 600); n++) {
      if (Date.now() - t0 > 20000) { stopped = n; break; }
      const pg = await doc.getPage(n);
      const vp = pg.getViewport({ scale: 1 });
      // Letter, Legal and Tabloid portrait pages are specs and forms; plans are drawing sheets.
      if (!(vp.width > vp.height * 1.15 || vp.width > 1500)) { pages.push({ page: n, width: vp.width, height: vp.height, items: [] }); skipped++; continue; }
      pages.push(await pageTextItems(doc, n));
    }
  } finally { try { await doc.destroy(); } catch (_) { /* gone */ } }
  const plan = readPlan(pages, doors);
  const out = {
    found: plan.plan_sheets.length > 0,
    ...plan,
    sheets: plan.sheets.filter((x) => x.sheet),
    read: { pages: pages.length, drawing_pages: pages.length - skipped, ms: Date.now() - t0, stopped_at_page: stopped },
    reason: plan.plan_sheets.length ? null : "No floor plan sheet was found: no title block in the PDF names an architectural (A) sheet a plan.",
  };
  try { await env2.CACHE.put(key, JSON.stringify(out), { expirationTtl: 86400 * 14 }); } catch (_) { /* too large: answered anyway */ }
  return jsonResponse3({ success: true, sessionId, cached: false, ...out });
});

// Reads a list of pages, each as its own kind, in one runner session
// (2026-10-08): POST { pages: [{ page, type }] }, at most 20. Each page is
// persisted exactly as the single-page GET persists it.
router.post("/api/hardware-schedule/session/:sessionId/read-pages", async (request2, env2, ctx) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4) return error4;
  if (!user || !user.userId) return jsonResponse3({ success: false, error: "Sign in to read your schedules.", code: "SIGN_IN_REQUIRED" }, 401);
  const sessionId = request2.params.sessionId;
  const session = await env2.DB.prepare("SELECT * FROM hardware_extraction_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return jsonResponse3({ success: false, error: "Session not found" }, 404);
  if (session.user_id !== user.userId) return jsonResponse3({ success: false, error: "This session belongs to another account" }, 403);
  const body = await request2.json().catch(() => ({}));
  const totalPages = session.total_pages || 1;
  const pages = (Array.isArray(body.pages) ? body.pages : []).map((p) => ({ page: parseInt(p && p.page, 10), type: p && p.type === "hardware_schedule" ? "hardware_schedule" : "door_schedule" })).filter((p) => p.page >= 1 && p.page <= totalPages).slice(0, 20);
  if (!pages.length) return jsonResponse3({ success: false, error: "Say which pages to read: pages: [{ page, type }]." }, 400);
  const fileBuffer = await sessionPdf(session, env2);
  if (!fileBuffer) return jsonResponse3({ success: false, error: "The uploaded PDF is no longer stored; upload it again." }, 404);
  const started = Date.now();
  // 2026-10-09: each page from its own text first, in this Worker (lib/text-layer-read.js);
  // only the pages with no text (scans) go to the browser runner. Every page used to go to the
  // browser, and Rockford's 08 71 00 pages died there after 73 s.
  const fromText = [], forBrowser = [];
  let doc = null;
  try { doc = await openTextLayerDoc(fileBuffer); } catch (e) { console.warn("[read-pages] the PDF did not open for its text: " + (e && e.message)); }
  for (const p of pages) {
    let tl = null;
    if (doc) { try { tl = await readPageFromDoc(doc, p.page, p.type); } catch (e) { console.warn("[read-pages] text read failed p" + p.page + ": " + (e && e.message)); } }
    const words = tl && tl.result && tl.result.metadata ? tl.result.metadata.text_words || 0 : 0;
    if (tl && (!tl.empty || words >= 60 || !env2.BROWSER)) fromText.push({ ...tl, ok: true, page: p.page, requested_type: p.type });
    else forBrowser.push(p);
  }
  if (doc) { try { await doc.destroy(); } catch (_) { /* gone */ } }
  let run = { ok: true, results: [] };
  if (forBrowser.length) {
    run = await runGridPagesInBrowser(env2, fileBuffer, forBrowser, { pdfUrl: await runnerPdfUrl(session, env2) });
    if (!run.ok && !fromText.length) {
      return jsonResponse3({ success: false, error: "The pages could not be read just now (" + (run.error || "reader unavailable") + (run.detail ? ": " + run.detail : "") + "). Try READ THIS PAGE on one page, or READ IT IN THIS BROWSER." }, 503);
    }
  }
  const browserResults = run.ok ? run.results : forBrowser.map((p) => ({ page: p.page, requested_type: p.type, ok: false, error: run.error || "reader unavailable", detail: run.detail || null }));
  const ordered = [...fromText, ...browserResults].sort((a, b) => pages.findIndex((p) => p.page === a.page) - pages.findIndex((p) => p.page === b.page));
  const results = [];
  for (const r of ordered) {
    if (!r.ok) { results.push({ page: r.page, type: r.requested_type, ok: false, error: "Page " + r.page + " could not be read: " + (r.detail || r.error || "reader failed") }); continue; }
    const persisted = await persistBrowserGridResult(r, r.requested_type, sessionId, session.tenant_id || null, r.page, totalPages, env2, { explicit: true });
    if (persisted.success === false) { results.push({ page: r.page, type: r.requested_type, ok: false, error: persisted.detail || persisted.error || "nothing read", code: persisted.error || null }); continue; }
    if (persisted.schedule_type !== "door_schedule") {
      try { await savePageExtraction2(sessionId, r.page, persisted, env2, { deferEnrich: true }); } catch (e) { console.warn("[read-pages] save failed p" + r.page + ": " + e.message); }
    }
    const isDoor = persisted.schedule_type === "door_schedule";
    results.push({ page: r.page, type: persisted.schedule_type, ok: true, doors: isDoor ? (persisted.entry_count ?? (persisted.entries || []).length) : 0, groups: isDoor ? 0 : (persisted.hardware_groups || []).length, items: isDoor ? 0 : (persisted.hardware_groups || []).reduce((n, g) => n + ((g.components || []).length), 0), metadata: { extraction_mode: (persisted.metadata || {}).extraction_mode || null, rotation_applied: (persisted.metadata || {}).rotation_applied || null, read_source: r.source || "browser" }, ms: r.ms });
  }
  // The items are priced once, after the last page, in the background.
  if (results.some((r) => r.ok && r.items)) {
    const enrich = () => autoEnrichSessionOnSave(sessionId, env2).catch((e) => console.warn("[read-pages] pricing: " + e.message));
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(enrich()); else await enrich();
  }
  return jsonResponse3({ success: true, sessionId, results, ms: Date.now() - started });
});

router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/approve", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    const data = await request2.json();
    console.log(`[Hardware Approve Page] Approving page ${pageNum} for session ${sessionId}`);
    console.log(`[Hardware Approve Page] Received ${data.hardwareGroups?.length || 0} groups from frontend`);
    const corrections = data.hardwareGroups ? { hardware_groups: data.hardwareGroups } : data.corrections || null;
    const result = await approvePageExtraction(
      sessionId,
      pageNum,
      corrections,
      user.userId,
      env2
    );
    const status = await getSessionStatus(sessionId, env2);
    if (status.pages_approved === status.total_pages) {
      await env2.DB.prepare(`
        UPDATE hardware_extraction_sessions
        SET status = ?, completed_at = ?
        WHERE id = ?
      `).bind("completed", (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
      status.status = "completed";
    }
    console.log(`[Hardware Approve Page] Page ${pageNum} approved: ${result.sets_inserted} sets, ${result.components_inserted} components`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      result,
      session_status: {
        pages_approved: status.pages_approved,
        total_pages: status.total_pages,
        progress_percent: status.progress_percent,
        completed: status.status === "completed"
      },
      next_step: status.status === "completed" ? "All pages complete! Hardware schedule imported." : `Review page ${pageNum + 1}`
    });
  } catch (error5) {
    console.error("[Hardware Approve Page] Error:", error5);
    return jsonResponse3({
      error: "Failed to approve page",
      details: error5.message
    }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-image", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  const startTime = Date.now();
  try {
    const sessionId = request2.params.sessionId;
    const pageNum = parseInt(request2.params.pageNum, 10);
    const data = await request2.json();
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Hardware Extract Image] Session: ${sessionId}, Page: ${pageNum}`);
    console.log(`[Hardware Extract Image] Image size: ${(data.imageBase64?.length / 1024).toFixed(1)}KB base64`);
    console.log(`[Hardware Extract Image] Dimensions: ${data.width}x${data.height}`);
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    if (!data.imageBase64) {
      return jsonResponse3({ error: "Missing imageBase64 in request body" }, 400);
    }
    if (!data.totalPages || data.totalPages < 1) {
      return jsonResponse3({ error: "Missing or invalid totalPages in request body" }, 400);
    }
    if (isNaN(pageNum) || pageNum < 1) {
      return jsonResponse3({ error: "Invalid page number" }, 400);
    }
    const session = await env2.DB.prepare(`
      SELECT * FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    if (session.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);
    }
    if (session.extraction_page_range) {
      try {
        const rangeData = typeof session.extraction_page_range === "string" ? JSON.parse(session.extraction_page_range) : session.extraction_page_range;
        if (rangeData && !isPageInRange(pageNum, rangeData)) {
          console.log(`[27A Page Range] Skipping page ${pageNum} (outside extraction ranges)`);
          return jsonResponse3({
            status: "skipped",
            message: `Page ${pageNum} outside extraction range`,
            page_number: pageNum,
            extraction_page_range: rangeData
          });
        }
      } catch (rangeErr) {
        console.warn(`[27A Page Range] Could not parse range: ${rangeErr.message}`);
      }
    }
    let _route = env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local";
    try {
      const _rr = await env2.DB.prepare(
        `SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (_rr?.extraction_route)
        _route = _rr.extraction_route;
    } catch (e) {
    }
    if (_route === "claude_code_local") {
      const _schedType = session.document_type === "door_schedule" ? "door_schedule" : null;
      const q = await queuePageExtractionJob(data.imageBase64, env2, {
        pageNumber: pageNum,
        totalPages: data.totalPages,
        sessionId,
        tenantId: data.tenantId || session.tenant_id || null,
        ownerMhsId: user.mhsId || user.mhs_id || null,
        scheduleType: _schedType
      });
      const kuId = crypto.randomUUID();
      try {
        await env2.DB.prepare(`
          INSERT OR REPLACE INTO kdp_packets
            (id, connection_id, project_id, candidate_id, page_number, sequence, unit_type, job_id, route, owner_id, state, attempts, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude_code_local', ?, 'in_flight', 1, datetime('now'), datetime('now'))
        `).bind(
          kuId,
          sessionId,
          session.project_id || null,
          `page:${sessionId}:${pageNum}`,
          pageNum,
          pageNum,
          _schedType === "door_schedule" ? "door_mark" : "hardware_set",
          q.job_id,
          q.owner_id
        ).run();
      } catch (e) {
      }
      return jsonResponse3({
        success: true,
        async: true,
        ku_id: kuId,
        job_id: q.job_id,
        page_number: pageNum,
        provider: "claude_code_local",
        poll_url: `/api/jobs/${q.job_id}`,
        finalize_url: `/api/hardware-schedule/session/${sessionId}/page/${pageNum}/finalize-image/${q.job_id}`,
        message: "Extraction queued to your bridge. Poll job, then finalize to persist."
      });
    }
    const extractionOptions = {
      tenantId: data.tenantId || null,
      sessionId,
      // WO-2026-0616: SABP bridge jobs must route to the owner's bridge token,
      // which is minted from the authenticated identity (user.mhsId). Thread it
      // so the adapter never re-derives from a stale node row.
      ownerMhsId: user.mhsId || user.mhs_id || null
    };
    console.log(`[Hardware Extract Image] Calling extractFromPageImage...`);
    if (extractionOptions.tenantId) {
      console.log(`[Hardware Extract Image] CONSTRAINT MODE: tenantId=${extractionOptions.tenantId}`);
    }
    const extractionResult = await extractFromPageImage(
      data.imageBase64,
      pageNum,
      data.totalPages,
      env2,
      extractionOptions
    );
    console.log(`[Hardware Extract Image] Saving extraction to database...`);
    await savePageExtraction2(sessionId, pageNum, extractionResult, env2);
    const totalTime = Date.now() - startTime;
    const matrixCount = extractionResult.door_hardware_matrix?.length || 0;
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    console.log(`[Hardware Extract Image] EXTRACTION COMPLETE`);
    console.log(`[Hardware Extract Image] Groups: ${extractionResult.hardware_groups.length}`);
    console.log(`[Hardware Extract Image] Door-Matrix Entries: ${matrixCount}`);
    console.log(`[Hardware Extract Image] Total time: ${totalTime}ms`);
    console.log(`[Hardware Extract Image] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber: pageNum,
      hardware_groups: extractionResult.hardware_groups,
      metadata: {
        ...extractionResult.metadata,
        extraction_method: "frontend_canvas_capture",
        page_isolated: true
      },
      timing: {
        extraction_time_ms: extractionResult.extraction_time_ms,
        total_time_ms: totalTime
      },
      usage: extractionResult.usage,
      next_step: `Review and approve: POST /api/hardware-schedule/session/${sessionId}/page/${pageNum}/approve`
    });
  } catch (error5) {
    console.error("[Hardware Extract Image] Error:", error5);
    return jsonResponse3({
      error: "Failed to extract hardware data from image",
      details: error5.message
    }, 500);
  }
});
router.get("/api/hardware-schedule/session/:sessionId/page/:pageNum/extraction-contract", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum } = request2.params;
    const pageNumber = parseInt(pageNum, 10);
    const url = new URL(request2.url);
    const tenantId = url.searchParams.get("tenant_id") || null;
    const session = await env2.DB.prepare(
      "SELECT * FROM hardware_extraction_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session)
      return jsonResponse3({ error: "Session not found" }, 404);
    if (session.user_id !== user.userId)
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);
    const contract = await resolveExtractionContract(env2, {
      sessionId,
      pageNumber,
      totalPages: session.page_count || session.total_pages || 1,
      tenantId
    });
    const constraintsMeta = contract.constraints ? {
      spec_version: contract.constraints.spec_version,
      scope_chain: contract.constraints.scope_chain,
      field_count: contract.constraints.fields.length
    } : null;
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber,
      totalPages: contract.totalPages,
      document_type: session.document_type || "hardware_schedule",
      prompt: contract.prompt,
      constraints: constraintsMeta,
      provenance: contract.provenance,
      result_contract: {
        required: {
          hardware_groups: "array \u2014 as specified in the prompt JSON schema",
          door_hardware_matrix: "array \u2014 REQUIRED when door/MARK-to-set relationships are visible (bylines or matrix); [] otherwise"
        },
        optional: ["detected_nomenclature", "metadata"],
        submit_to: `POST /api/hardware-schedule/session/${sessionId}/page/${pageNumber}/extract-result`,
        recommended_dpi: 300
      }
    });
  } catch (err) {
    return jsonResponse3({ error: "Failed to build extraction contract", details: err.message }, 500);
  }
});
router.post("/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-result", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const { sessionId, pageNum } = request2.params;
    const pageNumber = parseInt(pageNum, 10);
    const body = await request2.json();
    const { extraction, provider } = body;
    if (!extraction || typeof extraction !== "object") {
      return jsonResponse3({ error: "extraction object required" }, 400);
    }
    if (!provider || !provider.name) {
      return jsonResponse3({ error: "provider.name required (e.g. operator-local-claude-code) \u2014 engine attribution is part of the trust substrate" }, 400);
    }
    const session = await env2.DB.prepare(
      "SELECT * FROM hardware_extraction_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session)
      return jsonResponse3({ error: "Session not found" }, 404);
    if (session.user_id !== user.userId)
      return jsonResponse3({ error: "Unauthorized access to session" }, 403);

    // door_schedule's client-side (browser pdf.js + tesseract-wasm) grid
    // extraction submits {doors:[...]} - a genuinely different real shape
    // than hardware_schedule's {hardware_groups:[...]}, same real
    // distinction EMBEDDED_HARDWARE_GROUPS_EXTRACTION_PROMPT_TEMPLATE's own
    // header comment documents for the server-side Qwen-bridge paths this
    // mirrors. Writes through writeDoorScheduleEntries - the SAME
    // door_schedule_entries upsert the server-side grid pipeline
    // (extractDoorScheduleViaEmbeddedGofaineat) already uses, not a second
    // parallel write path.
    if (Array.isArray(extraction.doors)) {
      if (extraction.doors.length === 0) {
        return jsonResponse3({
          success: false,
          error: "EMPTY_DOOR_SCHEDULE",
          details: "No door rows were extracted. Review the source page, orientation and table detection before continuing.",
          requires_review: true
        }, 422);
      }
      const rotation = extraction.metadata && extraction.metadata.rotation_applied != null ? extraction.metadata.rotation_applied : null;
      const doorsWithSource = extraction.doors.map((d) => ({ ...d, source_rotation: rotation }));
      const written = await writeDoorScheduleEntries(sessionId, session.tenant_id || null, pageNumber, doorsWithSource, extraction.extraction_confidence || 0.85, env2);
      if (!written.success) {
        return jsonResponse3({ error: "Failed to store door-schedule result", details: written.error }, 500);
      }
      console.log(`[Vision Bridge] Stored client-side door_schedule extraction: session ${sessionId} p${pageNumber}, provider ${provider.name}, ${written.entries_count} doors`);
      return jsonResponse3({
        success: true,
        sessionId,
        pageNumber,
        provider: provider.name,
        schedule_type: "door_schedule",
        doors: written.entries_count,
        next_step: `Review door index: GET /api/hardware-schedule/session/${sessionId}/door-index`
      });
    }

    if (!Array.isArray(extraction.hardware_groups)) {
      return jsonResponse3({ error: "extraction.hardware_groups or extraction.doors must be an array (see extraction-contract)" }, 400);
    }
    for (const g of extraction.hardware_groups) {
      if (!g || typeof g !== "object") {
        return jsonResponse3({ error: "each hardware_group must be an object" }, 400);
      }
      if (g.components !== void 0 && !Array.isArray(g.components)) {
        return jsonResponse3({ error: "hardware_group.components must be an array when present" }, 400);
      }
    }
    const totalPages = session.page_count || session.total_pages || 1;
    const extractionResult = {
      page_number: pageNumber,
      total_pages: totalPages,
      hardware_groups: extraction.hardware_groups,
      door_hardware_matrix: extraction.door_hardware_matrix || [],
      detected_nomenclature: extraction.detected_nomenclature || null,
      metadata: {
        ...extraction.metadata || {},
        extraction_provider: provider.name,
        extraction_model: provider.model || null,
        extraction_client: provider.client || null,
        submitted_by: user.email || user.userId,
        page_isolated: true,
        isolation_method: "operator_local_render"
      }
    };
    await savePageExtraction2(sessionId, pageNumber, extractionResult, env2);
    const componentCount = extraction.hardware_groups.reduce((s, g) => s + (g.components?.length || 0), 0);
    console.log(`[Vision Bridge] Stored operator-local extraction: session ${sessionId} p${pageNumber}, provider ${provider.name}, ${extraction.hardware_groups.length} groups / ${componentCount} components`);
    return jsonResponse3({
      success: true,
      sessionId,
      pageNumber,
      provider: provider.name,
      hardware_groups: extraction.hardware_groups.length,
      components: componentCount,
      matrix_entries: (extraction.door_hardware_matrix || []).length,
      next_step: `Review and approve: POST /api/hardware-schedule/session/${sessionId}/page/${pageNumber}/approve`
    });
  } catch (err) {
    console.error("[Vision Bridge] Error:", err);
    return jsonResponse3({ error: "Failed to store extraction result", details: err.message }, 500);
  }
});
}
