// src/lib/catalogue-price-discovery.js
//
// Orchestrates the real, automated price-book/cut-sheet extraction
// pipeline: download a real PDF -> OCR each page -> pre-filter pages
// worth spending an LLM call on -> extract real {model, finish, price}
// candidates -> stage them for human review. Kept separate from the
// already-2600-line cutsheet-discovery.js, importing its proven PDF
// plumbing directly rather than re-implementing it.

import { downloadPdf, calculateHash, checkDuplicate, storeInTempStorage, discoverWithRetry } from "./cutsheet-discovery.js";
import { extractPriceRowsFromOcrText, classifyPriceLine } from "./catalogue-price-extraction.js";

// Use the extractor's own guarded row decision. One visible product price
// is sufficient; numeric/hyphen part numbers must reach the same parser.
export function looksLikePricePage(text) {
  return String(text || "").split("\n").some(line => classifyPriceLine(line).rowType === "priced_data_row");
}

async function ocrPage(pdfBuffer, pageNumber, env2) {
  const resp = await env2.OCR_SERVICE.fetch("https://weyland-ocr-worker/extract-text", {
    method: "POST",
    headers: { "X-Start-Page": String(pageNumber), "X-Total-Pages": "1" },
    body: pdfBuffer,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    return { error: "ocr_failed", detail: errText.slice(0, 500), page: pageNumber };
  }
  const result = await resp.json();
  const page = result.pages?.[0];
  return { text: page?.text || "", documentPageCount: result.documentPageCount || 1 };
}

function newCandidateId() {
  return `cpc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function extractPricesFromPdfUrl(url, { manufacturer, trade = "doors" } = {}, env2) {
  if (!env2.OCR_SERVICE) {
    return { error: "ocr_service_not_configured", detail: "OCR_SERVICE binding missing" };
  }

  const download = await downloadPdf(url, env2);
  if (!download.success) {
    return { error: download.errorCode || "download_failed", detail: download.error };
  }
  return extractPricesFromPdfBuffer(download.buffer, { manufacturer, trade }, env2, url);
}

export async function extractPricesFromPdfBuffer(buffer, { manufacturer, trade = "doors" } = {}, env2, url = "upload:catalogue.pdf") {
  if (!env2.OCR_SERVICE) return { error: "ocr_service_not_configured" };
  const bytes = new Uint8Array(buffer);
  if (bytes.length > 50 * 1024 * 1024) return { error: "FILE_TOO_LARGE", detail: "PDF must be at most 50 MiB" };
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { error: "INVALID_PDF_MAGIC", detail: "A valid PDF file is required" };
  const hash = await calculateHash(buffer);

  const existing = await env2.DB.prepare(
    "SELECT id, catalogue_id FROM catalogue_price_candidates WHERE source_pdf_hash = ? LIMIT 200"
  ).bind(hash).all().catch(() => ({ results: [] }));
  if (existing.results?.length) {
    return {
      hash,
      alreadyStaged: true,
      candidateIds: existing.results.map((r) => r.id),
      candidatesStaged: existing.results.length,
    };
  }

  await checkDuplicate(hash, env2).catch(() => null);
  const tempR2Key = await storeInTempStorage(buffer, hash, env2);

  const first = await ocrPage(buffer, 1, env2);
  const documentPageCount = first.documentPageCount || 1;

  const candidateRows = [];
  let pagesScanned = 0;
  let pagesSkipped = 0;
  const warnings = [];
  const pageNotes = [];

  for (let pageNum = 1; pageNum <= documentPageCount; pageNum++) {
    const pageResult = pageNum === 1 ? first : await ocrPage(buffer, pageNum, env2);
    if (pageResult.error) {
      warnings.push(`page ${pageNum}: ${pageResult.error} - ${pageResult.detail || ""}`);
      pagesSkipped++;
      continue;
    }
    if (!looksLikePricePage(pageResult.text)) {
      pagesSkipped++;
      pageNotes.push({ page: pageNum, reason: pageResult.text.split("\n").some(line => classifyPriceLine(line).rowType === "call_for_quote") ? "quote_only" : "no_product_price_rows" });
      continue;
    }
    pagesScanned++;
    const extraction = await extractPriceRowsFromOcrText(env2, pageResult.text, { manufacturer, trade });
    warnings.push(...extraction.warnings);
    for (const row of extraction.rows) {
      candidateRows.push({ ...row, page_number: pageNum, raw_model_text: pageResult.text.split("\n").find(line => line.includes(row.full_model_number))?.trim().slice(0, 1000) || row.full_model_number });
    }
  }

  const candidateIds = [];
  for (const row of candidateRows) {
    const id = newCandidateId();
    candidateIds.push(id);
    await env2.DB.prepare(`
      INSERT INTO catalogue_price_candidates
      (id, source_url, source_pdf_hash, temp_r2_key, page_number, manufacturer, trade,
       full_model_number, finish_code, finish_description, list_price, unit_price, price_uom,
       extraction_confidence, verified_in_source_text, extraction_warnings, raw_model_text, extraction_model, affirmed, rejected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `).bind(
      id, url, hash, tempR2Key, row.page_number, row.manufacturer, row.trade,
      row.full_model_number, row.finish_code, row.finish_description,
      row.list_price, row.unit_price, row.price_uom,
      row.extraction_confidence, row.verified_in_source_text,
      JSON.stringify(warnings), row.raw_model_text, "catalogue-price-cascade"
    ).run();
  }

  return {
    hash,
    tempR2Key,
    pagesScanned,
    pagesSkipped,
    documentPageCount,
    pageNotes,
    candidatesStaged: candidateRows.length,
    verifiedCount: candidateRows.filter((r) => r.verified_in_source_text === 1).length,
    unverifiedCount: candidateRows.filter((r) => r.verified_in_source_text !== 1).length,
    candidateIds,
    warnings,
  };
}

export async function extractPricesForComponent(component, env2, opts = {}) {
  const discovery = await discoverWithRetry(component, env2, opts);
  if (!discovery.success || !discovery.url) {
    return { error: "discovery_failed", detail: discovery.error || "no candidate URL found", discovery };
  }
  const result = await extractPricesFromPdfUrl(
    discovery.url,
    { manufacturer: component.manufacturer, trade: opts.trade || "doors" },
    env2
  );
  return { ...result, discoveredUrl: discovery.url, discoveryConfidence: discovery.confidence };
}
