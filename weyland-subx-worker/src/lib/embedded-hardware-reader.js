// Sessionless hardware-page extraction. Readers return data; this adapter
// neither persists it nor calls a language model. Incomplete pages throw
// before the legacy upload caller can save them as completed work.
import { readPageFromTextLayer } from "./text-layer-read.js";
import { runGridInBrowser } from "./browser-grid-extraction.js";
import { parseHardwareExtractionResult } from "./hardware-extraction-prompts.js";

export class EmbeddedHardwareReadError extends Error {
  constructor(code, message, status, retryable, details = {}) {
    super(message);
    this.name = "EmbeddedHardwareReadError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    Object.assign(this, details);
  }
}

const readError = (code, message, status, retryable, details) =>
  new EmbeddedHardwareReadError(code, message, status, retryable, details);

// The factory substitutes read operations in focused failure tests. The
// production instance below always uses the existing real PDF readers.
export function createEmbeddedHardwareReader({
  readText = readPageFromTextLayer,
  readBrowser = runGridInBrowser,
} = {}) {
  return async function readHardwarePage(pdfBuffer, pageNumber, totalPages, env = {}) {
    const started = Date.now();
    if (!pdfBuffer?.byteLength || !Number.isInteger(pageNumber) || !Number.isInteger(totalPages)
        || pageNumber < 1 || pageNumber > totalPages) {
      throw readError("INVALID_HARDWARE_PAGE", "Select a valid page from a readable PDF.", 400, false);
    }

    let answer;
    try {
      // Any text layer is authoritative, including a notes page with no
      // hardware groups. Only a textless page proceeds to raster OCR.
      answer = await readText(pdfBuffer, pageNumber, "hardware_schedule");
    } catch (_) {
      throw readError("HARDWARE_TEXT_READ_FAILED", "The PDF page could not be read from its text layer.", 422, false);
    }
    if (!answer) {
      if (!env.BROWSER) {
        throw readError("HARDWARE_BROWSER_UNAVAILABLE", "This page has no text layer and the browser OCR reader is unavailable.", 503, true);
      }
      try {
        // Hardware only: trying a door schedule would change this adapter's
        // public contract. No session ID, storage or OCR-worker fallback.
        answer = await readBrowser(env, pdfBuffer, pageNumber, "hardware_schedule");
      } catch (_) {
        throw readError("HARDWARE_BROWSER_READ_FAILED", "The browser OCR reader could not read this hardware page.", 503, true);
      }
    }
    if (!answer || answer.ok !== true) {
      const invalidInput = ["no_pdf_bytes", "pdf_too_large_for_browser_runner"].includes(answer?.error);
      throw readError("HARDWARE_BROWSER_READ_FAILED", "The browser OCR reader could not read this hardware page.", invalidInput ? 422 : 503, !invalidInput);
    }

    const result = answer.result || {};
    const metadata = result.metadata || {};
    if (result.partial || metadata.partial || result.done === false) {
      throw readError("PARTIAL_HARDWARE_READ", "Only part of this hardware page was read. Retry or review it before saving.", 422, true, {
        partial: true,
        groups_seen: Array.isArray(result.hardware_groups) ? result.hardware_groups.length : 0,
      });
    }
    if (answer.empty || metadata.no_table_detected || !Array.isArray(result.hardware_groups) || !result.hardware_groups.length) {
      throw readError("NO_HARDWARE_SCHEDULE", "No hardware schedule was found on the selected page.", 422, false);
    }

    let parsed;
    try {
      // Keep the established group aliases and mounting defaults. JSON
      // parsing gives that mutating validator its own copy; original cell
      // confidences, evidence and metadata are never edited in place.
      parsed = parseHardwareExtractionResult({
        content: [{ text: JSON.stringify(result) }],
        usage: { input_tokens: 0, output_tokens: 0 },
      }, { requireContent: true });
    } catch (_) {
      throw readError("INVALID_HARDWARE_RESULT", "The hardware reader returned an invalid schedule. Review the selected page before saving.", 422, false);
    }
    if (!parsed.hardware_groups.length) {
      throw readError("NO_HARDWARE_SCHEDULE", "No identified hardware groups were found on the selected page.", 422, false);
    }
    const elapsed = Date.now() - started;
    return {
      ...result,
      page_number: pageNumber,
      total_pages: totalPages,
      hardware_groups: parsed.hardware_groups,
      door_hardware_matrix: parsed.door_hardware_matrix,
      detected_nomenclature: parsed.detected_nomenclature,
      metadata: { ...metadata, page_isolated: metadata.page_isolated ?? false,
        read_source: answer.source || "browser", read_ms: answer.ms ?? elapsed },
      usage: { input_tokens: 0, output_tokens: 0 },
      extraction_time_ms: elapsed,
      total_time_ms: elapsed,
    };
  };
}

export const readEmbeddedHardwarePage = createEmbeddedHardwareReader();
