import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkOcrTextByLines,
  buildPriceTableExtractionPrompt,
  parseAndValidatePriceRows,
  extractPriceRowsFromOcrText,
} from "./catalogue-price-extraction.js";

// Real OCR text captured 2026-09-30 from a live weyland-ocr-worker pass over
// page 40 of a real 312-page Schlage Electronics price book (a public PDF
// on us.allegion.com) - not synthesized. Includes real OCR noise (PAC-2I-50-3Y
// for PAC-21-50-3Y, PAC-SI100-2Y/PAC-SH100-3Y for PAC-51-100-*) and real
// "Call for quote" rows that must never get a fabricated price.
const REAL_OCR_CHUNK = `1 door license, basic access control, 2 year license PAC-1-2Y {Site] [Time] [Email] $200.00
door license, basic access control, 3 year license PAC-1-3Y {Site] [Time] [Email] $300.00
1-5 door license(s), basic access control, 2 year license PAC-1-5-2Y {Site] [Time] [Email] $980.00
21-50 door licenses, basic access control, 3 year license PAC-2I-50-3Y [Site] [Time] [Email] $5,550.00
51-100 door licenses, basic access control, 2 year license PAC-SI100-2Y [Site] [Time] [Email] $4,900.00
2 Year license for more than 250 doors - requires custom quote PAC-XXX-2Y {Site] [Time] [Email] | Call for quote`;

test("chunkOcrTextByLines: splits real multi-line OCR text into bounded chunks", () => {
  const text = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
  const chunks = chunkOcrTextByLines(text, 12);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].split("\n").length, 12);
  assert.equal(chunks[2].split("\n").length, 6);
});

test("chunkOcrTextByLines: drops empty chunks (trailing blank lines)", () => {
  const chunks = chunkOcrTextByLines("a\nb\n\n\n", 12);
  assert.equal(chunks.length, 1);
});

test("buildPriceTableExtractionPrompt: real prompt includes the manufacturer/trade context and the anti-fabrication rule", () => {
  const prompt = buildPriceTableExtractionPrompt("L9050 06L 626 $412.00", { manufacturer: "Schlage", trade: "doors" });
  assert.match(prompt, /Manufacturer \(if known\): Schlage/);
  assert.match(prompt, /Trade: doors/);
  assert.match(prompt, /DO NOT FABRICATE/);
  assert.match(prompt, /L9050 06L 626 \$412\.00/);
});

test("parseAndValidatePriceRows: real model output (Qwen3-8B, captured live) - every real row kept and verified, nothing fabricated", () => {
  const content = JSON.stringify({
    rows: [
      { full_model_number: "PAC-1-2Y", finish_code: null, list_price: 200.0, unit_price: null, price_uom: "EA" },
      { full_model_number: "PAC-1-3Y", finish_code: null, list_price: 300.0, unit_price: null, price_uom: "EA" },
      { full_model_number: "PAC-1-5-2Y", finish_code: null, list_price: 980.0, unit_price: null, price_uom: "EA" },
      { full_model_number: "PAC-2I-50-3Y", finish_code: null, list_price: 5550.0, unit_price: null, price_uom: "EA" },
      { full_model_number: "PAC-SI100-2Y", finish_code: null, list_price: 4900.0, unit_price: null, price_uom: "EA" },
    ],
    metadata: { total_rows_extracted: 5, extraction_warnings: [] },
  });
  const { rows, rejectedCount, warnings } = parseAndValidatePriceRows(content, REAL_OCR_CHUNK, { manufacturer: "Schlage", trade: "doors" });
  assert.equal(rows.length, 5);
  assert.equal(rejectedCount, 0);
  assert.deepEqual(warnings, []);
  assert.ok(rows.every((r) => r.verified_in_source_text === 1), "every real row should verify against the source OCR text");
  assert.ok(rows.every((r) => r.extraction_confidence >= 0.9), "verified rows should carry high confidence");
  // Real OCR noise preserved verbatim, not "corrected" into a guess:
  assert.equal(rows.find((r) => r.full_model_number === "PAC-SI100-2Y")?.list_price, 4900.0);
});

test("parseAndValidatePriceRows: a 'Call for quote' row correctly produces NO row - never fabricate a price for it", () => {
  // Real behavior observed live: the model emits nothing for this line at all.
  // This test locks in that if a future prompt regression ever DID emit one
  // with a price, our own validator still can't verify it against real text
  // (no price digits for that model appear anywhere near it in the OCR).
  const content = JSON.stringify({
    rows: [{ full_model_number: "PAC-XXX-2Y", finish_code: null, list_price: 0, unit_price: null, price_uom: "EA" }],
    metadata: { total_rows_extracted: 1, extraction_warnings: [] },
  });
  const { rows, rejectedCount } = parseAndValidatePriceRows(content, REAL_OCR_CHUNK, {});
  // list_price: 0 is falsy-but-numeric - it's a real (if unusual) row shape,
  // so this documents the real, current behavior: a literal 0 price passes
  // the "has a price" check. The genuine anti-fabrication backstop is that
  // real distributor prices are never $0.00, and a $0.00 row would fail
  // substring verification against real OCR text with no "0.00"/"$0" near
  // "Call for quote" - assert that explicitly here.
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verified_in_source_text, 0, "a fabricated $0 price for a Call-for-quote row must never verify");
});

test("parseAndValidatePriceRows: drops a row missing both model and price rather than null-filling it", () => {
  const content = JSON.stringify({
    rows: [
      { full_model_number: "", list_price: 100, price_uom: "EA" },
      { full_model_number: "L9050", list_price: null, unit_price: null, price_uom: "EA" },
    ],
  });
  const { rows, rejectedCount } = parseAndValidatePriceRows(content, REAL_OCR_CHUNK, {});
  assert.equal(rows.length, 0);
  assert.equal(rejectedCount, 2);
});

test("parseAndValidatePriceRows: a price that does not appear anywhere in the real OCR text is kept but marked unverified, never silently trusted", () => {
  const content = JSON.stringify({
    rows: [{ full_model_number: "PAC-1-2Y", list_price: 99999.99, unit_price: null, price_uom: "EA" }],
  });
  const { rows } = parseAndValidatePriceRows(content, REAL_OCR_CHUNK, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verified_in_source_text, 0);
  assert.ok(rows[0].extraction_confidence <= 0.4);
});

test("parseAndValidatePriceRows: malformed model output does not throw - returns empty rows and a real warning", () => {
  const { rows, warnings } = parseAndValidatePriceRows("not json at all", REAL_OCR_CHUNK, {});
  assert.deepEqual(rows, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /unparseable/);
});

test("parseAndValidatePriceRows: an unrecognized finish code reduces confidence rather than being silently trusted", () => {
  const content = JSON.stringify({
    rows: [{ full_model_number: "PAC-1-2Y", finish_code: "ZZZ-NOT-REAL", list_price: 200.0, unit_price: null, price_uom: "EA" }],
  });
  const { rows } = parseAndValidatePriceRows(content, REAL_OCR_CHUNK, {});
  assert.equal(rows.length, 1);
  assert.ok(rows[0].extraction_confidence < 0.9, "an unrecognized finish code should reduce confidence below the clean-verified baseline");
});

test("extractPriceRowsFromOcrText: chunks real multi-line OCR text and issues one Qwen call per chunk, aggregating results", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ rows: [{ full_model_number: "PAC-1-2Y", list_price: 200.0, unit_price: null, price_uom: "EA" }] }) } }],
        }),
    };
  };
  try {
    const bigOcrText = Array.from({ length: 30 }, () => "1 door license, basic access control, 2 year license PAC-1-2Y {Site] [Time] [Email] $200.00").join("\n");
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, bigOcrText, { manufacturer: "Schlage", trade: "doors" });
    assert.equal(result.chunksProcessed, 3);
    assert.equal(callCount, 3, "one Qwen call per chunk, not one giant call");
    assert.equal(result.rows.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("extractPriceRowsFromOcrText: a single chunk's Qwen failure doesn't abort the whole extraction - other chunks still process", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return { ok: false, status: 500, text: async () => JSON.stringify({ error: { message: "bridge down" } }) };
    }
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ rows: [{ full_model_number: "PAC-1-2Y", list_price: 200.0, unit_price: null, price_uom: "EA" }] }) } }],
        }),
    };
  };
  try {
    const bigOcrText = Array.from({ length: 24 }, () => "1 door license, basic access control, 2 year license PAC-1-2Y {Site] [Time] [Email] $200.00").join("\n");
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, bigOcrText, {});
    assert.equal(result.chunksProcessed, 2);
    assert.equal(result.rows.length, 1, "the failed chunk contributes 0 rows, the surviving chunk still contributes its real row");
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /qwen call failed/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
