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
//
// IMPORTANT, found 2026-10-01 against a real Von Duprin multi-finish
// price-matrix page: the LLM path above is NOT reliable for a table where
// one row carries several finish/price pairs in a fixed column order. Two
// failure modes confirmed live: (1) a chunk missing the column-header
// context systematically attached every price to the wrong finish code
// (every number real, every mapping wrong) - fixed below by carrying
// header context into every chunk, but that surfaced (2) incomplete
// per-row fan-out (the model often emits 1 of 9 expected pairs) and the
// prompt's own few-shot example occasionally got echoed back as fabricated
// data (caught by the existing verified_in_source_text check, but still
// junk in the review queue). For this exact table shape - stable N-column
// header, N dollar amounts per row in the same order - use
// extractPriceRowsPositionally() instead: a deterministic positional zip,
// no LLM call, verified live to produce zero transposition errors across
// every row tested (vs. systematic wrong-column mapping from the LLM
// path). Reserve the LLM path above for tables that don't have this rigid
// structure (e.g. Schlage's one-price-per-row case it was validated
// against). Prefer the positional path when detectColumnHeaderCodes()
// finds >=3 codes; fall back to the LLM path otherwise.

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

// A line with 2+ dollar amounts is a real multi-finish price-matrix data
// row (one model, several finish/price pairs). Everything before the first
// such line is treated as the table's column-header/finish-code legend.
// Single-price-per-row pages (no line ever has 2+ "$") fall through with no
// split at all - behavior-preserving for that already-validated case.
const MULTI_PRICE_ROW_RE = /(\$[\d,]+(?:\.\d{2})?.*?){2,}/;

// Found 2026-10-01: a naive line-count chunker separates a multi-finish
// data row from the header line defining its column order (the header
// lives near the top of the page, the data rows can be dozens of lines
// later), so a late chunk has no way to know which price belongs to which
// finish code and falls back on generic priors instead of this specific
// document's real layout - confirmed live against a real von-duprin
// XP98/XP99 price-matrix page: every extracted price was real, but
// systematically attached to the wrong finish (a one-column shift).
// Splitting header from data and re-attaching the header to every chunk
// fixes this without changing chunkOcrTextByLines's own contract.
export function splitHeaderAndDataLines(ocrText) {
  const lines = String(ocrText || "").split("\n");
  const splitIdx = lines.findIndex((l) => MULTI_PRICE_ROW_RE.test(l));
  if (splitIdx <= 0) return { headerLines: "", dataLines: String(ocrText || "") };
  return {
    headerLines: lines.slice(0, splitIdx).join("\n").trim(),
    dataLines: lines.slice(splitIdx).join("\n"),
  };
}

// CHUNK_LINES=12 was calibrated for single-price-per-row tables (12 lines =
// 12 output row-objects, comfortably inside the completion-token budget).
// Confirmed live 2026-10-01: for a 9-column multi-finish table, 12 lines
// means up to 108 requested output objects - far more than fits in 1200
// completion tokens, so 3 of 7 real chunks truncated mid-JSON and parsed as
// nothing. Scale chunk size down by real table width (average price count
// per data line) so every chunk's expected output stays bounded regardless
// of how wide the table is. Narrow tables (avg <= 1) keep the original 12.
function pickChunkLineCount(dataLines, maxRowObjectsPerChunk = 15) {
  const priceLines = String(dataLines || "")
    .split("\n")
    .map((l) => (l.match(/\$[\d,]+(?:\.\d{2})?/g) || []).length)
    .filter((n) => n > 0);
  if (!priceLines.length) return CHUNK_LINES;
  const avgPricesPerLine = priceLines.reduce((a, b) => a + b, 0) / priceLines.length;
  if (avgPricesPerLine <= 1) return CHUNK_LINES;
  return Math.max(1, Math.floor(maxRowObjectsPerChunk / avgPricesPerLine));
}

export function buildPriceTableExtractionPrompt(ocrTextChunk, context = {}, headerContext = "") {
  const { manufacturer, trade } = context;
  const headerBlock = headerContext
    ? `COLUMN HEADER / FINISH-CODE LEGEND FOR THIS TABLE (defines which finish code each price position below corresponds to - use this to map prices to the correct finish, don't guess a conventional ordering):
"""
${String(headerContext).slice(0, 1500)}
"""

`
    : "";
  return `You are extracting a PRICE TABLE from OCR text of a manufacturer catalog/price-book page.
The OCR is imperfect - expect misread digits, merged columns, and noisy whitespace.
Manufacturer (if known): ${manufacturer || "unknown - read from text if visible"}
Trade: ${trade || "unknown"}

${headerBlock}RAW OCR TEXT:
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

// A multi-finish price-matrix table (one row, N finish/price pairs in a
// fixed left-to-right column order) doesn't need an LLM at all - it's a
// deterministic positional-zip problem: find the header line that lists the
// N finish codes in column order, then for each data row pair its N dollar
// amounts with those same N codes by position. Built 2026-10-01 after live
// testing found the LLM-per-row approach unreliable on this exact table
// shape (systematic cross-column transposition, then incomplete per-row
// fan-out after a chunking fix) - a real narrow, enumerable task gofaineat's
// own design pattern is meant for, not a generation task.
//
// Safe-by-construction: if the detected header's token count doesn't match
// a row's price count, that row is SKIPPED, never guessed - an honest gap
// (needs human review or higher-res OCR) beats a confident wrong mapping.
// Real OCR-quality note: a 200 DPI render of a real von-duprin price-matrix
// page dropped 2 of 9 header tokens entirely (unrecoverable from text alone
// - the character was never there); re-rendering at 400 DPI recovered all
// 9. Low column-token coverage here is a real signal to re-OCR at higher
// resolution, not a parser bug to work around.
const FINISH_TOKEN_RE = /\b\d{2,4}[A-Za-z%]{0,2}\b/g;
const PRICE_TOKEN_RE = /\$[\d,]+(?:\.\d{2})?/g;

function cleanFinishToken(tok) {
  return String(tok).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function detectColumnHeaderCodes(headerLines) {
  // The line that actually defines THIS table's column order sits closest
  // to the data rows, not the one with the most tokens - a manufacturer's
  // full finish-code legend (every code it offers, anywhere) typically
  // appears higher up the page and has MORE tokens than the specific
  // subset of columns this particular table actually uses. Picking by
  // max-count instead of proximity-to-data was a real bug caught live: it
  // selected von-duprin's 12-code legend over the real 9-column header,
  // producing a 12-vs-9 count mismatch that correctly (if uselessly)
  // skipped every row rather than silently mismapping them.
  const lines = String(headerLines || "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const matches = lines[i].match(FINISH_TOKEN_RE) || [];
    if (matches.length >= 3) return matches.map(cleanFinishToken);
  }
  return [];
}

export function extractPriceRowsPositionally(ocrText, context = {}) {
  const { headerLines, dataLines } = splitHeaderAndDataLines(ocrText);
  const columnCodes = detectColumnHeaderCodes(headerLines);
  const rows = [];
  const warnings = [];
  if (columnCodes.length < 3) {
    return { rows, warnings: ["no multi-column header detected - not a positional-matrix table"], columnCodes };
  }
  for (const line of String(dataLines || "").split("\n")) {
    const priceMatches = line.match(PRICE_TOKEN_RE) || [];
    if (priceMatches.length < 2) continue; // not a multi-price data row
    if (priceMatches.length !== columnCodes.length) {
      warnings.push(`row skipped - ${priceMatches.length} prices vs ${columnCodes.length} header columns (counts must match exactly, not guessed): "${line.trim().slice(0, 80)}"`);
      continue;
    }
    const fullModel = line.slice(0, line.indexOf(priceMatches[0])).trim();
    if (!fullModel) continue;
    for (let i = 0; i < columnCodes.length; i++) {
      const price = Number(priceMatches[i].replace(/[$,]/g, ""));
      rows.push({
        full_model_number: fullModel,
        finish_code: columnCodes[i],
        finish_description: null,
        list_price: price,
        unit_price: null,
        price_uom: "EA",
        manufacturer: context.manufacturer || null,
        trade: context.trade || "doors",
        // Deterministic positional zip against real OCR digits, not a model
        // guess - treated as verified by construction (the price came
        // straight out of the source text at this exact position).
        verified_in_source_text: 1,
        extraction_confidence: 0.85,
      });
    }
  }
  return { rows, warnings, columnCodes };
}

export async function extractPriceRowsFromOcrText(env2, ocrText, context = {}) {
  // Prefer the deterministic positional path whenever this page has a
  // detectable N-column finish-code header - verified live to be strictly
  // more reliable than the LLM path for that exact table shape (see the
  // file-header note above), and it costs zero LLM calls. Only fall back
  // to per-chunk LLM extraction when no such header is found (e.g. a
  // single-price-per-row table like the Schlage page this was originally
  // validated against).
  const positional = extractPriceRowsPositionally(ocrText, context);
  if (positional.columnCodes.length >= 3 && positional.rows.length > 0) {
    return { rows: positional.rows, rejectedCount: 0, warnings: positional.warnings, chunksProcessed: 0 };
  }

  const { headerLines, dataLines } = splitHeaderAndDataLines(ocrText);
  const chunks = chunkOcrTextByLines(dataLines, pickChunkLineCount(dataLines));
  const allRows = [];
  const allWarnings = [];
  let totalRejected = 0;
  for (const chunk of chunks) {
    const prompt = buildPriceTableExtractionPrompt(chunk, context, headerLines);
    let content;
    try {
      content = await callLocalQwen(env2, [{ role: "user", content: prompt }], { maxTokens: 1200, temperature: 0.1 });
    } catch (e) {
      allWarnings.push(`qwen call failed for a chunk: ${e.message}`);
      continue;
    }
    // Verify against header+chunk together - a finish code named only in the
    // header (not repeated on the data row itself) must still be able to
    // verify.
    const { rows, rejectedCount, warnings } = parseAndValidatePriceRows(content, `${headerLines}\n${chunk}`, context);
    allRows.push(...rows);
    totalRejected += rejectedCount;
    allWarnings.push(...warnings);
  }
  return { rows: allRows, rejectedCount: totalRejected, warnings: allWarnings, chunksProcessed: chunks.length };
}
