// weyland-docs-worker/src/routes/docs.js
//
// The six document tools' API, moved off the monolith (src/routes/
// document-generators.js, 2026-10-08) with the same D1 tables and R2 keys, so
// rows and download links made before the move still work:
//   InspecX  /api/inspections     -> inspection_reports, R2 inspection-reports/
//   SafetyX  /api/safety-reports  -> safety_reports,     R2 safety-reports/
//   SurvX    /api/survey-reports  -> survey_reports,     R2 survey-reports/
//   SpecX    /api/spec-sections   -> spec_sections,      R2 spec-sections/
//   DrawX    /api/drawing-index   -> drawing_indexes,    R2 drawing-indexes/
//   AsBuiltX /api/asbuilt-diffs   -> asbuilt_diffs,      R2 asbuilt-diffs/
// Per tool: GET .../access (the page's sign-in / plan probe, no more empty
// POSTs that logged a 500 on every visit), POST .../analyze, GET .../jobs/:id,
// GET .../:id/download.
//
// Page jobs. A document is read in windows through weyland-ocr-worker
// (text-layer pages are cheap; one OCR'd page per call, the Worker's safe
// budget measured 2026-10-08). The upload is kept in R2, progress in the
// doc_jobs table, and the job is advanced under a per-job D1 lease: first
// by the analyze request itself (up to INLINE_BUDGET_MS, so documents with
// a text layer finish in one request), then by ctx.waitUntil after a 202,
// then by every status poll the page makes, and by the traffic-driven sweep
// in index.js. No cron: Cron Triggers never fire on this account.

import { jsonResponse3 } from "../lib/json-response.js";
import { classifyInspection, classifySafety, classifySurvey, parseSpecSections, parseSheetIndex } from "../lib/classify.js";
import { listSummaryHtml, specIndexHtml, drawingIndexHtml, asBuiltDiffHtml } from "../lib/summaries.js";
import { readFlag } from "../lib/safety-hazards.js";

export const OCR_WINDOW_PAGES = 150;
export const OCR_PAGES_PER_CALL = 1;
export const INLINE_BUDGET_MS = 20000;
export const BACKGROUND_BUDGET_MS = 24000;
export const SWEEP_BUDGET_MS = 12000;
export const LEASE_SECONDS = 90;
export const MAX_DOCUMENT_PAGES = 1200;
export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
export const RAW_TEXT_CAP = 900000;

export const TOOLS = {
  inspecx: { api: "inspections", table: "inspection_reports", prefix: "inspection-reports", filenamePrefix: "InspectionSummary", label: "InspecX", kind: "text", fields: ["projectName", "inspectionType", "inspectorName", "inspectionDate"] },
  safetyx: { api: "safety-reports", table: "safety_reports", prefix: "safety-reports", filenamePrefix: "SafetySummary", label: "SafetyX", kind: "text", fields: ["projectName", "reportType", "reportedBy", "reportDate"] },
  survx: { api: "survey-reports", table: "survey_reports", prefix: "survey-reports", filenamePrefix: "SurveySummary", label: "SurvX", kind: "text", fields: ["projectName", "surveyType", "surveyorName", "surveyDate"] },
  specx: { api: "spec-sections", table: "spec_sections", prefix: "spec-sections", filenamePrefix: "SpecIndex", label: "SpecX", kind: "text", fields: ["projectName", "specDate"] },
  drawx: { api: "drawing-index", table: "drawing_indexes", prefix: "drawing-indexes", filenamePrefix: "DrawingIndex", label: "DrawX", kind: "text", fields: ["projectName", "drawingSetDate"] },
  asbuiltx: { api: "asbuilt-diffs", table: "asbuilt_diffs", prefix: "asbuilt-diffs", filenamePrefix: "AsBuiltDiff", label: "AsBuiltX", kind: "diff", fields: ["projectName", "sheetLabel", "page"] },
};

let puppeteerClient = null;

async function renderHtmlToPdf(env, html) {
  const browser = await puppeteerClient.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
  } finally {
    await browser.close();
  }
}

async function storePdf(env, r2Key, pdfBytes, userId, tenantId, now) {
  await env.UPLOADS.put(r2Key, pdfBytes, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { userId, tenantId, generatedAt: now } });
}

const rawText = (pages) => {
  const text = pages.map((p) => p.text || "").join("\n");
  return text.length > RAW_TEXT_CAP ? text.slice(0, RAW_TEXT_CAP) + "\n[text truncated at " + RAW_TEXT_CAP + " characters]" : text;
};

// ---- finalisers: pages -> summary PDF + table row + JSON for the page ------
const FINALIZERS = {
  async inspecx({ env, userId, tenantId, fields, pages, pageCount, id, now }) {
    const r = classifyInspection(pages);
    const html = listSummaryHtml({ title: "Inspection Report Summary", product: "InspecX",
      fields: [["Project", fields.projectName], ["Inspection Type", fields.inspectionType], ["Inspector", fields.inspectorName], ["Inspection Date", fields.inspectionDate]],
      stats: [[pageCount, "Pages Read"], [r.passCount, "Pass/Satisfactory Lines"], [r.failCount, "Flagged Lines"]],
      flagged: r.flagged, none: "No lines matched the deficiency word list.",
      disclaimer: "Flagged items are lines matched by a word list (leaking, broken, not working, out of service, cracks, damaged, deficiency, corrective action ...), each with its page number; not an AI reading for meaning. Review the source document for anything this list might miss or mis-flag." });
    const r2Key = "inspection-reports/" + userId + "/" + id + ".pdf";
    await storePdf(env, r2Key, await renderHtmlToPdf(env, html), userId, tenantId, now);
    await env.DB.prepare("INSERT INTO inspection_reports (id, user_id, tenant_id, project_name, project_address, inspector_name, inspection_date, inspection_type, raw_text, pass_count, fail_count, flagged_items, page_count, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, userId, tenantId, fields.projectName || null, fields.inspectorName || null, fields.inspectionDate || null, fields.inspectionType || null, rawText(pages), r.passCount, r.failCount, JSON.stringify(r.flagged), pageCount, r2Key, now, now).run();
    return { success: true, inspectionId: id, pageCount, passCount: r.passCount, failCount: r.failCount, flagged: r.flagged, downloadUrl: "/api/inspections/" + id + "/download" };
  },
  async safetyx({ env, userId, tenantId, fields, pages, pageCount, id, now }) {
    const r = classifySafety(pages);
    const html = listSummaryHtml({ title: "Safety Report Summary", product: "SafetyX",
      fields: [["Project", fields.projectName], ["Report Type", fields.reportType], ["Reported By", fields.reportedBy], ["Report Date", fields.reportDate]],
      stats: [[pageCount, "Pages Read"], [r.incidentCount, "Incident/Hazard Lines"], [r.clearCount, "Resolved/Clear Lines"]],
      flagged: r.flagged.map((f) => { const x = readFlag(f); return { ...f, line: "[" + x.hazard.label + (x.outcome ? "; " + x.outcome.label : "") + "] " + f.line }; }), none: "No lines matched the incident/hazard word list.", heading: "Incident / Hazard Lines",
      disclaimer: "Flagged items are lines matched by a word list (incident, injury, hazard, fell, fall protection, not used, died, struck by ...), each with its page number; not an AI reading for meaning. Review the source document for anything this list might miss or mis-flag." });
    const r2Key = "safety-reports/" + userId + "/" + id + ".pdf";
    await storePdf(env, r2Key, await renderHtmlToPdf(env, html), userId, tenantId, now);
    await env.DB.prepare("INSERT INTO safety_reports (id, user_id, tenant_id, project_name, report_type, report_date, reported_by, raw_text, incident_count, clear_count, flagged_items, page_count, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, userId, tenantId, fields.projectName || null, fields.reportType || null, fields.reportDate || null, fields.reportedBy || null, rawText(pages), r.incidentCount, r.clearCount, JSON.stringify(r.flagged), pageCount, r2Key, now, now).run();
    return { success: true, safetyReportId: id, pageCount, incidentCount: r.incidentCount, clearCount: r.clearCount, flagged: r.flagged.map(readFlag), downloadUrl: "/api/safety-reports/" + id + "/download", logUrl: "/safetyx/log" };
  },
  async survx({ env, userId, tenantId, fields, pages, pageCount, id, now }) {
    const r = classifySurvey(pages);
    const html = listSummaryHtml({ title: "Survey Report Summary", product: "SurvX",
      fields: [["Project", fields.projectName], ["Survey Type", fields.surveyType], ["Surveyor", fields.surveyorName], ["Survey Date", fields.surveyDate]],
      stats: [[pageCount, "Pages Read"], [r.flaggedCount, "Flagged Lines"], [r.clearCount, "Verified/Clear Lines"]],
      flagged: r.flagged, none: "No lines matched the defect/discrepancy word list.",
      disclaimer: "Flagged items are lines matched by a word list (cracks, damaged, lifted, poor, severe, graffiti, discrepancy, encroachment, field verify ...), each with its page number; not an AI reading for meaning. Review the source document for anything this list might miss or mis-flag." });
    const r2Key = "survey-reports/" + userId + "/" + id + ".pdf";
    await storePdf(env, r2Key, await renderHtmlToPdf(env, html), userId, tenantId, now);
    await env.DB.prepare("INSERT INTO survey_reports (id, user_id, tenant_id, project_name, survey_type, survey_date, surveyor_name, raw_text, flagged_count, clear_count, flagged_items, page_count, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, userId, tenantId, fields.projectName || null, fields.surveyType || null, fields.surveyDate || null, fields.surveyorName || null, rawText(pages), r.flaggedCount, r.clearCount, JSON.stringify(r.flagged), pageCount, r2Key, now, now).run();
    return { success: true, surveyReportId: id, pageCount, flaggedCount: r.flaggedCount, clearCount: r.clearCount, flagged: r.flagged, downloadUrl: "/api/survey-reports/" + id + "/download" };
  },
  async specx({ env, userId, tenantId, fields, pages, pageCount, id, now }) {
    const { sections, referencedAbsent } = parseSpecSections(pages);
    const shortCount = sections.filter((s) => s.short).length;
    const html = specIndexHtml({ projectName: fields.projectName, specDate: fields.specDate, pageCount, sections, referencedAbsent });
    const r2Key = "spec-sections/" + userId + "/" + id + ".pdf";
    await storePdf(env, r2Key, await renderHtmlToPdf(env, html), userId, tenantId, now);
    await env.DB.prepare("INSERT INTO spec_sections (id, user_id, tenant_id, project_name, spec_date, raw_text, section_count, short_section_count, sections_json, page_count, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, userId, tenantId, fields.projectName || null, fields.specDate || null, rawText(pages), sections.length, shortCount, JSON.stringify(sections), pageCount, r2Key, now, now).run();
    return { success: true, specId: id, pageCount, sectionCount: sections.length, shortCount, sections, referencedAbsent, downloadUrl: "/api/spec-sections/" + id + "/download" };
  },
  async drawx({ env, userId, tenantId, fields, pages, pageCount, id, now }) {
    const r = parseSheetIndex(pages);
    const numbered = r.sheets.filter((s) => s.number);
    const html = drawingIndexHtml({ projectName: fields.projectName, drawingSetDate: fields.drawingSetDate, pageCount, sheets: r.sheets, listedNotFound: r.listedNotFound, pagesWithoutNumber: r.pagesWithoutNumber });
    const r2Key = "drawing-indexes/" + userId + "/" + id + ".pdf";
    await storePdf(env, r2Key, await renderHtmlToPdf(env, html), userId, tenantId, now);
    await env.DB.prepare("INSERT INTO drawing_indexes (id, user_id, tenant_id, project_name, drawing_set_date, raw_text, sheet_count, sheets_json, page_count, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
      .bind(id, userId, tenantId, fields.projectName || null, fields.drawingSetDate || null, rawText(pages), numbered.length, JSON.stringify(r.sheets), pageCount, r2Key, now, now).run();
    return { success: true, drawIndexId: id, pageCount, sheetCount: numbered.length, sheets: r.sheets, listedNotFound: r.listedNotFound, pagesWithoutNumber: r.pagesWithoutNumber, downloadUrl: "/api/drawing-index/" + id + "/download" };
  },
};

// ---- jobs ------------------------------------------------------------------
export async function ensureJobsTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS doc_jobs (id TEXT PRIMARY KEY, tool TEXT NOT NULL, user_id TEXT NOT NULL, tenant_id TEXT, status TEXT NOT NULL, next_page INTEGER NOT NULL DEFAULT 1, document_pages INTEGER, ocr_pages INTEGER DEFAULT 0, text_layer_pages INTEGER DEFAULT 0, fields_json TEXT, result_json TEXT, error TEXT, source_key TEXT NOT NULL, pages_key TEXT NOT NULL, lease_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
}

const iso = () => new Date().toISOString();
const getJob = (env, id) => env.DB.prepare("SELECT * FROM doc_jobs WHERE id = ?").bind(id).first();

/** Advance one job under its lease for up to budgetMs. Never throws. */
export async function advanceJob(env, id, budgetMs, who) {
  const started = Date.now();
  try {
    const claim = await env.DB.prepare("UPDATE doc_jobs SET lease_until = ?, updated_at = ? WHERE id = ? AND status = 'running' AND (lease_until IS NULL OR lease_until < ?)")
      .bind(new Date(Date.now() + LEASE_SECONDS * 1000).toISOString(), iso(), id, iso()).run();
    if (!claim.meta || !claim.meta.changes) return { claimed: false };
  } catch (e) {
    console.error("[docs job " + id + "] claim: " + e.message);
    return { claimed: false };
  }
  const job = await getJob(env, id);
  if (!job) return { claimed: false };
  try {
    const source = await env.UPLOADS.get(job.source_key);
    if (!source) throw new Error("source file missing from storage");
    const sourceBytes = await source.arrayBuffer();
    let pages = [];
    const prev = await env.UPLOADS.get(job.pages_key);
    if (prev) pages = await prev.json();
    let nextPage = job.next_page || 1;
    let documentPages = job.document_pages || null;
    let ocrPages = job.ocr_pages || 0;
    let textLayerPages = job.text_layer_pages || 0;
    let finished = false;
    while (Date.now() - started < budgetMs) {
      const res = await env.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
        method: "POST",
        headers: { "X-Start-Page": String(nextPage), "X-Total-Pages": String(OCR_WINDOW_PAGES), "X-Max-Ocr-Pages": String(OCR_PAGES_PER_CALL), "X-Max-Document-Pages": String(MAX_DOCUMENT_PAGES) },
        body: sourceBytes,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error("OCR worker HTTP " + res.status + (res.status === 503 ? " (the OCR worker hit its resource limit on this page)" : "") + ": " + text.slice(0, 200));
      }
      const data = await res.json();
      for (const p of data.pages || []) pages.push({ page: p.page, text: p.text || "", source: p.source || "ocr" });
      ocrPages += data.ocrPages || 0;
      textLayerPages += data.textLayerPages || 0;
      documentPages = data.documentPageCount || documentPages;
      if (!data.hasMore) { finished = true; break; }
      nextPage = data.nextPage;
      await env.UPLOADS.put(job.pages_key, JSON.stringify(pages), { httpMetadata: { contentType: "application/json" } });
      await env.DB.prepare("UPDATE doc_jobs SET next_page = ?, document_pages = ?, ocr_pages = ?, text_layer_pages = ?, updated_at = ?, lease_until = ? WHERE id = ?")
        .bind(nextPage, documentPages, ocrPages, textLayerPages, iso(), new Date(Date.now() + LEASE_SECONDS * 1000).toISOString(), id).run();
    }
    if (!finished) {
      await env.DB.prepare("UPDATE doc_jobs SET lease_until = NULL, updated_at = ? WHERE id = ?").bind(iso(), id).run();
      return { claimed: true, done: false, nextPage, documentPages };
    }
    const fields = JSON.parse(job.fields_json || "{}");
    const pageCount = documentPages || pages.length;
    const result = await FINALIZERS[job.tool]({ env, userId: job.user_id, tenantId: job.tenant_id || "ven_weyland", fields, pages, pageCount, id, now: iso() });
    result.ocrPages = ocrPages;
    result.textLayerPages = textLayerPages;
    result.documentPages = documentPages;
    result.jobId = id;
    result.status = "done";
    await env.DB.prepare("UPDATE doc_jobs SET status = 'done', result_json = ?, document_pages = ?, ocr_pages = ?, text_layer_pages = ?, updated_at = ?, lease_until = NULL WHERE id = ?")
      .bind(JSON.stringify(result), documentPages, ocrPages, textLayerPages, iso(), id).run();
    try { await env.UPLOADS.delete(job.pages_key); } catch (e) { /* kept, harmless */ }
    return { claimed: true, done: true };
  } catch (e) {
    console.error("[docs job " + id + " " + who + "] " + e.message);
    try {
      await env.DB.prepare("UPDATE doc_jobs SET status = 'failed', error = ?, updated_at = ?, lease_until = NULL WHERE id = ?").bind(String(e.message || e).slice(0, 500), iso(), id).run();
    } catch (e2) { console.error("[docs job " + id + "] mark failed: " + e2.message); }
    return { claimed: true, done: false, failed: true };
  }
}

/** Traffic-driven sweep: advance up to two stalled running jobs. */
export async function sweepJobs(env) {
  try {
    await ensureJobsTable(env.DB);
    const stale = new Date(Date.now() - 30000).toISOString();
    const rows = await env.DB.prepare("SELECT id FROM doc_jobs WHERE status = 'running' AND (lease_until IS NULL OR lease_until < ?) AND updated_at < ? ORDER BY updated_at LIMIT 2").bind(iso(), stale).all();
    for (const row of (rows.results || [])) await advanceJob(env, row.id, SWEEP_BUDGET_MS, "sweep");
  } catch (e) {
    console.error("[docs sweep] " + e.message);
  }
}

function jobView(job) {
  const view = { jobId: job.id, status: job.status, nextPage: job.next_page, documentPages: job.document_pages, ocrPages: job.ocr_pages || 0, textLayerPages: job.text_layer_pages || 0, statusUrl: "/api/" + TOOLS[job.tool].api + "/jobs/" + job.id };
  if (job.status === "done" && job.result_json) Object.assign(view, JSON.parse(job.result_json));
  if (job.status === "failed") view.error = job.error || "analysis failed";
  return view;
}

function respondForJob(env, ctx, job) {
  const view = jobView(job);
  if (job.status === "done") return jsonResponse3(view, 200);
  if (job.status === "failed") return jsonResponse3({ error: "OCR extraction failed", details: job.error || "unknown", jobId: job.id, status: "failed" }, 502);
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(advanceJob(env, job.id, BACKGROUND_BUDGET_MS, "background"));
  return jsonResponse3(view, 202);
}

// ---- routes -----------------------------------------------------------------
function makeDocumentDownloadRoute(authenticate, requireProductAccess, table, tier, filenamePrefix) {
  return async (request, env) => {
    const { error, user } = await authenticate(request, env);
    if (error) return error;
    const prodErr = await requireProductAccess(user, env, tier);
    if (prodErr) return prodErr;
    try {
      const row = await env.DB.prepare("SELECT r2_key FROM " + table + " WHERE id = ? AND user_id = ?").bind(request.params.id, user.userId).first();
      if (!row) return jsonResponse3({ error: filenamePrefix + " not found" }, 404);
      const object = await env.UPLOADS.get(row.r2_key);
      if (!object) return jsonResponse3({ error: filenamePrefix + " PDF not found in storage" }, 404);
      return new Response(object.body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="' + filenamePrefix + "-" + request.params.id.slice(0, 8) + '.pdf"' } });
    } catch (e) {
      console.error("[" + filenamePrefix + " Download] Error:", e);
      return jsonResponse3({ error: "Failed to download " + filenamePrefix.toLowerCase(), details: e.message }, 500);
    }
  };
}

export function registerDocsRoutes(router, { authenticate, requireProductAccess, puppeteer }) {
  puppeteerClient = puppeteer;
  for (const [slug, tool] of Object.entries(TOOLS)) {
    const base = "/api/" + tool.api;
    const guard = async (request, env) => {
      const { error, user } = await authenticate(request, env);
      if (error) return { error };
      const prodErr = await requireProductAccess(user, env, slug);
      if (prodErr) return { error: prodErr };
      return { user };
    };
    router.get(base + "/access", async (request, env) => {
      const g = await guard(request, env);
      if (g.error) return g.error;
      return jsonResponse3({ ok: true, product: slug, userId: g.user.userId });
    });
    if (tool.kind === "text") {
      router.post(base + "/analyze", async (request, env, ctx) => {
        const g = await guard(request, env);
        if (g.error) return g.error;
        const user = g.user;
        try {
          if (!(request.headers.get("Content-Type") || "").includes("multipart/form-data")) return jsonResponse3({ error: "No file provided" }, 400);
          const formData = await request.formData();
          const file = formData.get("file");
          if (!file || typeof file === "string") return jsonResponse3({ error: "No file provided" }, 400);
          const fields = {};
          for (const f of tool.fields) fields[f] = String(formData.get(f) || "").slice(0, 200);
          if (!env.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
          const bytes = await file.arrayBuffer();
          if (bytes.byteLength > MAX_UPLOAD_BYTES) return jsonResponse3({ error: "The file is larger than 60 MB" }, 413);
          const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
          const id = crypto.randomUUID();
          const now = iso();
          const sourceKey = tool.prefix + "/" + user.userId + "/" + id + ".source.pdf";
          const pagesKey = tool.prefix + "/" + user.userId + "/" + id + ".pages.json";
          await env.UPLOADS.put(sourceKey, bytes, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { userId: user.userId, tenantId, tool: slug } });
          await ensureJobsTable(env.DB);
          await env.DB.prepare("INSERT INTO doc_jobs (id, tool, user_id, tenant_id, status, next_page, fields_json, source_key, pages_key, created_at, updated_at) VALUES (?, ?, ?, ?, 'running', 1, ?, ?, ?, ?, ?)")
            .bind(id, slug, user.userId, tenantId, JSON.stringify(fields), sourceKey, pagesKey, now, now).run();
          await advanceJob(env, id, INLINE_BUDGET_MS, "inline");
          return respondForJob(env, ctx, await getJob(env, id));
        } catch (e) {
          console.error("[" + tool.label + " Analyze] Error:", e);
          return jsonResponse3({ error: "Failed to analyze " + tool.label + " document", details: e.message }, 500);
        }
      });
      router.get(base + "/jobs/:id", async (request, env, ctx) => {
        const g = await guard(request, env);
        if (g.error) return g.error;
        await ensureJobsTable(env.DB);
        const job = await getJob(env, request.params.id);
        if (!job || job.user_id !== g.user.userId || job.tool !== slug) return jsonResponse3({ error: "Job not found" }, 404);
        return respondForJob(env, ctx, job);
      });
    } else {
      router.post(base + "/analyze", async (request, env) => {
        const g = await guard(request, env);
        if (g.error) return g.error;
        const user = g.user;
        try {
          if (!(request.headers.get("Content-Type") || "").includes("multipart/form-data")) return jsonResponse3({ error: "Both original and revised files are required" }, 400);
          const formData = await request.formData();
          const originalFile = formData.get("original");
          const revisedFile = formData.get("revised");
          const projectName = String(formData.get("projectName") || "").slice(0, 200);
          const sheetLabel = String(formData.get("sheetLabel") || "").slice(0, 200);
          const page = String(formData.get("page") || "1");
          if (!originalFile || !revisedFile || typeof originalFile === "string" || typeof revisedFile === "string") return jsonResponse3({ error: "Both original and revised files are required" }, 400);
          if (!env.OCR_SERVICE) return jsonResponse3({ error: "OCR service is not configured" }, 500);
          const diffForm = new FormData();
          diffForm.append("original", originalFile);
          diffForm.append("revised", revisedFile);
          diffForm.append("page", page);
          const diffRes = await env.OCR_SERVICE.fetch("https://weyland-ocr-worker/diff-pages", { method: "POST", body: diffForm });
          if (!diffRes.ok) return jsonResponse3({ error: "Diff computation failed", details: (await diffRes.text()).slice(0, 300) }, 502);
          const diffData = await diffRes.json();
          const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
          const id = crypto.randomUUID();
          const now = iso();
          const pdfBytes = await renderHtmlToPdf(env, asBuiltDiffHtml({ projectName, sheetLabel, ...diffData }));
          const r2Key = "asbuilt-diffs/" + user.userId + "/" + id + ".pdf";
          await storePdf(env, r2Key, pdfBytes, user.userId, tenantId, now);
          await env.DB.prepare("INSERT INTO asbuilt_diffs (id, user_id, tenant_id, project_name, sheet_label, page_number, overall_diff_percent, grid_json, r2_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
            .bind(id, user.userId, tenantId, projectName || null, sheetLabel || null, Number(page) || 1, diffData.overallDiffPercent, JSON.stringify(diffData.cellDiffs), r2Key, now, now).run();
          return jsonResponse3({ success: true, diffId: id, overallDiffPercent: diffData.overallDiffPercent, gridCols: diffData.gridCols, gridRows: diffData.gridRows, cellDiffs: diffData.cellDiffs, width: diffData.width, height: diffData.height, rendered: diffData.rendered || null, downloadUrl: "/api/asbuilt-diffs/" + id + "/download" });
        } catch (e) {
          console.error("[AsBuiltX Analyze] Error:", e);
          return jsonResponse3({ error: "Failed to analyze as-built diff", details: e.message }, 500);
        }
      });
    }
    router.get(base + "/:id/download", makeDocumentDownloadRoute(authenticate, requireProductAccess, tool.table, slug, tool.filenamePrefix));
  }
}
