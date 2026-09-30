// src/lib/catalogue-price-extraction.js
//
// Extracts real {model, finish, price} rows from OCR'd text of a real
// manufacturer price-book/cut-sheet page, via the self-hosted Qwen3-8B
// bridge (qwen-bridge.js) - never a third-party LLM API.
//
// Pre-flight validated 2026-09-30 against a real 312-page Schlage
// Electronics price book (page 40, a dense multi-year-license price
// table with real OCR noise): the model correctly extracted 20+ real
// model+price pairs, faithfully transcribed real OCR errors instead of
// "fixing" them into a plausible-but-wrong model number (e.g. kept
// "PAC-SI100-2Y" verbatim rather than guessing "PAC-51-100-2Y"), and
// correctly emitted NO row at all for "Call for quote" lines rather than
// fabricating a price. The one real failure found: the local server's
// context window is a hard 4096 tokens total (prompt + completion) -
// requesting more rows than fit in the remaining budget truncates
// mid-JSON (finish_reason: "length"), not a token-count setting anyone
// can just raise past what's actually configured server-side. This is
// why extraction is chunked by line count (CHUNK_LINES below) rather
// than sent as one call per page - a dense page (this one had ~28 rows
// across two tables) doesn't fit in one call.
//
// The LLM's own claimed "source_text_excerpt" field was tested and
// dropped from the schema: it cost real completion-token budget per row
// for a value this module already re-derives for free, deterministically,
// against the real OCR text in parseAndValidatePriceRows() below - no
// reason to spend a shrinking token budget asking the model to echo text
// it already read.

import { callLocalQwen } from "./qwen-bridge.js";
import { FINISH_CODES } from "./cps-matching.js";

const CHUNK_LINES = 12;

export function chunkOcrTextByLines(ocrText, chunkLines = CHUNK_LINES) {
  const lines = String(ocrText || "").split("\n");
  const chunks = [];
  for (let i = 0; i < lines.length; i += chunkLines) {
    const chunk = lines.slice(i, i + chunkLines).join("\n").trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

export function buildPriceTableExtractionPrompt(ocrTextChunk, context = {}) {
  const { manufacturer, trade } = context;
  return `You are extracting a PRICE TABLE from OCR text of a manufacturer catalog/price-book page.
The OCR is imperfect - expect misread digits, merged columns, and noisy whitespace.
Manufacturer (if known): ${manufacturer || "unknown - read from text if visible"}
Trade: ${trade || "unknown"}

RAW OCR TEXT:
"""
${String(ocrTextChunk || "").slice(0, 3000)}
"""

Find rows that pair a MODEL/CATALOG/PART NUMBER with a PRICE. Price-book tables vary:
- Some list one model per row with a single price column.
- Some list one model per row with MULTIPLE price columns, one per FINISH CODE
  (e.g. a row "L9050 06L" with columns "626: $412.00", "630: $438.00" - emit ONE
  separate object per finish/price pair, not one row per model).
- Finish codes are commonly BHMA 3-digit numeric codes (605, 606, 611, 613, 619,
  626, 628, 630...) or US-letter equivalents (US3, US4, US10B, US26D, US32D...).
- A row with "Call for quote", "N/A", or no visible price has NO price - do not
  emit a row for it, and do not invent a number.

ABSOLUTE RULE - DO NOT FABRICATE:
- Only emit a row if BOTH the model number text AND the price digits are actually
  visible in the RAW OCR TEXT above, verbatim or near-verbatim (OCR noise like O/0
  or l/1 confusion is fine - transcribe what's actually there, do not "correct" a
  model number to what you think it should be). Do not infer a price for a model
  that has no price near it in the text, and do not invent a model for a bare price.
- If you are not confident a given row is a real model+price pair, OMIT it
  entirely. Skipping an uncertain row is correct behavior. Guessing is not.

Output ONLY a JSON object (no prose, no markdown fences):
{
  "rows": [
    {
      "full_model_number": "L9050 06L",
      "finish_code": "626",
      "finish_description": "Satin Chrome",
      "list_price": 412.00,
      "unit_price": null,
      "price_uom": "EA"
    }
  ],
  "metadata": { "total_rows_extracted": 1, "extraction_warnings": [] }
}

If you find no confident model+price pairs in this text, output:
{"rows": [], "metadata": {"total_rows_extracted": 0, "extraction_warnings": ["no confident price rows found"]}}

Output the JSON object now:`;
}

function stripFences(text) {
  return String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

// Confirms a row's price genuinely appears in the real OCR text as its own
// number, not just as a coincidental digit run inside something larger
// (e.g. a fabricated "$0.00" must NOT "verify" just because it matches the
// trailing "0.00" of an unrelated "$200.00" elsewhere in the text). Strips
// "$"/"," from the OCR text (real price-book OCR commonly reads "5,550.00"
// where the extracted number is 5550.00) and requires a digit boundary on
// both sides of the match.
function priceAppearsIn(price, ocrText) {
  if (price == null || !Number.isFinite(Number(price))) return false;
  const priceStr = Number(price).toFixed(2);
  const cleanedOcr = String(ocrText || "").replace(/[$,]/g, "");
  const escaped = priceStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<!\\d)${escaped}(?!\\d)`);
  return re.test(cleanedOcr);
}

function isKnownFinishCode(code) {
  if (!code) return false;
  const upper = String(code).toUpperCase().trim();
  return FINISH_CODES.has(upper) || FINISH_CODES.has(code);
}

export function parseAndValidatePriceRows(content, ocrTextChunk, context = {}) {
  let parsed;
  try {
    parsed = JSON.parse(stripFences(content));
  } catch (e) {
    return { rows: [], rejectedCount: 0, warnings: [`unparseable model output: ${e.message}`] };
  }
  const rawRows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const rows = [];
  let rejectedCount = 0;
  const warnings = Array.isArray(parsed?.metadata?.extraction_warnings) ? parsed.metadata.extraction_warnings.slice() : [];

  for (const r of rawRows) {
    const fullModel = typeof r?.full_model_number === "string" ? r.full_model_number.trim() : "";
    const listPrice = typeof r?.list_price === "number" ? r.list_price : null;
    const unitPrice = typeof r?.unit_price === "number" ? r.unit_price : null;
    if (!fullModel || (listPrice == null && unitPrice == null)) {
      rejectedCount++;
      continue;
    }
    const priceToVerify = unitPrice != null ? unitPrice : listPrice;
    const verified = priceAppearsIn(priceToVerify, ocrTextChunk) && ocrTextChunk.includes(fullModel.split(/\s+/)[0]);
    const finishCode = typeof r?.finish_code === "string" ? r.finish_code.trim() : null;
    let confidence = verified ? 0.9 : 0.4;
    if (finishCode && !isKnownFinishCode(finishCode)) confidence -= 0.15;
    rows.push({
      full_model_number: fullModel,
      finish_code: finishCode || "",
      finish_description: typeof r?.finish_description === "string" ? r.finish_description : null,
      list_price: listPrice,
      unit_price: unitPrice,
      price_uom: typeof r?.price_uom === "string" && r.price_uom ? r.price_uom.toUpperCase() : "EA",
      manufacturer: context.manufacturer || null,
      trade: context.trade || "doors",
      verified_in_source_text: verified ? 1 : 0,
      extraction_confidence: Math.max(0, Math.min(1, confidence)),
    });
  }
  return { rows, rejectedCount, warnings };
}

export async function extractPriceRowsFromOcrText(env2, ocrText, context = {}) {
  const chunks = chunkOcrTextByLines(ocrText);
  const allRows = [];
  const allWarnings = [];
  let totalRejected = 0;
  for (const chunk of chunks) {
    const prompt = buildPriceTableExtractionPrompt(chunk, context);
    let content;
    try {
      content = await callLocalQwen(env2, [{ role: "user", content: prompt }], { maxTokens: 1200, temperature: 0.1 });
    } catch (e) {
      allWarnings.push(`qwen call failed for a chunk: ${e.message}`);
      continue;
    }
    const { rows, rejectedCount, warnings } = parseAndValidatePriceRows(content, chunk, context);
    allRows.push(...rows);
    totalRejected += rejectedCount;
    allWarnings.push(...warnings);
  }
  return { rows: allRows, rejectedCount: totalRejected, warnings: allWarnings, chunksProcessed: chunks.length };
}
