// src/lib/browser-grid-extraction.js
//
// Server-side schedule extraction in a Cloudflare Browser Rendering tab
// (2026-10-07).
//
// Why: "RUN EXTRACTION" used to send the whole PDF to weyland-ocr-worker's
// /extract-schedule-grid, which renders the page with PDFium inside a 128 MB
// Worker isolate. A Letter page at 400 dpi is a 3400x4400 BGRA bitmap (60 MB)
// allocated in PDFium's WASM heap and copied once more into JS, next to the
// tesseract heap - the isolate died with "Worker exceeded memory limit"
// before reading the first row (OCCDoorSchedulePg4.pdf, 2026-10-07 05:12Z:
// weyland-ocr-worker outcome "exceededMemory" after the 150 dpi detection
// pass found the grid). Every page larger than Letter would fail the same way.
//
// What: the env.BROWSER binding (already used by renderRegionAt600DPI2 for
// region renders) opens /api/hardware-schedule/client-ocr-assets/grid-runner.html
// - a page served by this same worker - and runs the SAME pdf.js +
// tesseract-wasm module the SubX workspace runs in a visitor's tab
// (assets/client-ocr-src/schedule-grid-extraction-client.mjs). A browser tab
// has the memory a full-resolution render needs, the Worker only waits on it
// (I/O, not CPU), and the server and the visitor's tab can never disagree
// about what a schedule says because they run one implementation.
//
// The caller keeps the weyland-ocr-worker path as the fallback for when
// Browser Rendering is unavailable (launch limits, outage), and reports both
// reasons if both fail.

import puppeteer from "@cloudflare/puppeteer";
import { Buffer } from "node:buffer";

const RUNNER_PATH = "/api/hardware-schedule/client-ocr-assets/grid-runner.html";
const DEFAULT_ORIGIN = "https://weylandai.com";
// The PDF travels to the tab as base64 inside one CDP call; keep the Worker's
// own copy (bytes + base64) well inside its 128 MB.
export const MAX_BROWSER_PDF_BYTES = 30 * 1024 * 1024;

function errText(e) {
  return String((e && e.message) || e || "unknown error").slice(0, 400);
}

/**
 * Runs grid extraction for one page in a Browser Rendering tab.
 * @param {object} env - needs env.BROWSER
 * @param {ArrayBuffer} pdfBuffer - the whole PDF
 * @param {number} pageNumber - 1-based
 * @param {"door_schedule"|"hardware_schedule"} scheduleType - tried first
 * @param {{alsoTry?: string, origin?: string, runnerOptions?: object, timeoutMs?: number}} opts
 *   alsoTry: the other schedule type, tried in the same tab when the first
 *   finds no table of its kind (a door schedule uploaded as "hardware
 *   schedule", or the reverse).
 * @returns {Promise<{ok: boolean, schedule_type?: string, result?: object, error?: string, detail?: string, logs?: string[], ms?: number}>}
 */
export async function runGridInBrowser(env, pdfBuffer, pageNumber, scheduleType, opts = {}) {
  const started = Date.now();
  if (!env || !env.BROWSER) return { ok: false, error: "browser_rendering_not_configured" };
  if (!pdfBuffer || !pdfBuffer.byteLength) return { ok: false, error: "no_pdf_bytes" };
  if (pdfBuffer.byteLength > MAX_BROWSER_PDF_BYTES) {
    return { ok: false, error: "pdf_too_large_for_browser_runner", detail: `${(pdfBuffer.byteLength / 1048576).toFixed(1)} MB; the server-side reader takes PDFs up to ${MAX_BROWSER_PDF_BYTES / 1048576} MB - upload just the schedule pages` };
  }
  const origin = String(opts.origin || env.SUBX_RUNNER_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
  let browser;
  try {
    // keep_alive: one long page.evaluate (a dense sheet can take a minute in
    // the tab) must not be mistaken for an idle session.
    browser = await puppeteer.launch(env.BROWSER, { keep_alive: 600000 });
  } catch (e) {
    return { ok: false, error: "browser_launch_failed", detail: errText(e), ms: Date.now() - started };
  }
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(opts.timeoutMs || 170000);
    const resp = await page.goto(origin + RUNNER_PATH, { waitUntil: "load", timeout: 30000 });
    if (!resp || !resp.ok()) {
      return { ok: false, error: "runner_page_unavailable", detail: `GET ${RUNNER_PATH} -> ${resp ? resp.status() : "no response"}`, ms: Date.now() - started };
    }
    await page.waitForFunction("window.__gridRunnerReady === true", { timeout: 30000 });
    const b64 = Buffer.from(pdfBuffer).toString("base64");
    const types = [scheduleType].concat(opts.alsoTry && opts.alsoTry !== scheduleType ? [opts.alsoTry] : []);
    let first = null;
    const logs = [];
    for (const type of types) {
      const res = await page.evaluate(
        (data, p, t, o) => window.__runGrid({ b64: data }, p, t, o),
        b64, pageNumber, type, opts.runnerOptions || {}
      );
      if (res && Array.isArray(res.logs)) logs.push(...res.logs.map((l) => `[${type}] ${l}`));
      if (!res || !res.ok) {
        return { ok: false, error: "browser_runner_failed", detail: (res && res.error) || "runner returned nothing", logs, ms: Date.now() - started };
      }
      const r = res.result || {};
      const found = type === "door_schedule" ? (r.doors || []).length : (r.hardware_groups || []).length;
      if (!first) first = { schedule_type: type, result: r };
      if (found > 0) return { ok: true, schedule_type: type, result: r, logs, ms: Date.now() - started };
    }
    return { ok: true, schedule_type: first.schedule_type, result: first.result, empty: true, tried: types, logs, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: "browser_runner_failed", detail: errText(e), ms: Date.now() - started };
  } finally {
    try { await browser.close(); } catch (_) { /* already gone */ }
  }
}
