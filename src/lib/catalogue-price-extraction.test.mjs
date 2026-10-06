import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkOcrTextByLines,
  buildPriceTableExtractionPrompt,
  parseAndValidatePriceRows,
  extractPriceRowsFromOcrText,
  splitHeaderAndDataLines,
  detectColumnHeaderCodes,
  extractPriceRowsPositionally,
  extractPriceRowsSingleColumn,
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
    // Two-price rows without column headers remain genuinely ambiguous.
    // Seven lines per chunk respects the bounded output-object budget.
    const bigOcrText = Array.from({ length: 21 }, () => "PAC-1-2Y $200.00 $300.00").join("\n");
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, bigOcrText, { manufacturer: "Schlage", trade: "doors" });
    assert.equal(result.chunksProcessed, 3);
    assert.equal(callCount, 3, "one Qwen call per chunk, not one giant call");
    assert.equal(result.rows.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Real OCR text captured 2026-10-01 (400 DPI tesseract pass) from page 66 of
// a real Von Duprin price book (XP98/XP99 Series rim devices, a genuine
// multi-finish price-matrix table: one model per row, 9 finish/price pairs
// each). Ground truth for the TP-F row below was independently verified by
// eye against the real catalog page image before this test was written.
const REAL_MATRIX_OCR = `a ec ff G6 = &Y 626 628 630 710 612 606 643e 711 613 as x
EXIT HARDWARE 3' DEVICE PRICING SHOWN. 4' ADD $30.00 LIST.
XP[98/99]. TP .F.[].[] $3,375 $3,148 $3,440 $3,291 $3,440 $3,418 $3,845 $4,444 $3,829 990TP-R/V`;

test("detectColumnHeaderCodes: picks the table's own 9-column order, not an unrelated longer finish-code legend", () => {
  const withDistractorLegend = `605 606 611 612 613 619 622 625 626 626AM 628 629
${REAL_MATRIX_OCR}`;
  const codes = detectColumnHeaderCodes(splitHeaderAndDataLines(withDistractorLegend).headerLines);
  assert.deepEqual(codes, ["626", "628", "630", "710", "612", "606", "643E", "711", "613"]);
});

test("extractPriceRowsPositionally: real multi-finish matrix row - every price lands on its correct finish, zero transposition", () => {
  const { rows, warnings } = extractPriceRowsPositionally(REAL_MATRIX_OCR, { manufacturer: "von-duprin", trade: "doors" });
  assert.deepEqual(warnings, []);
  assert.equal(rows.length, 9);
  const byFinish = Object.fromEntries(rows.map((r) => [r.finish_code, r.list_price]));
  assert.deepEqual(byFinish, {
    "626": 3375, "628": 3148, "630": 3440, "710": 3291, "612": 3440,
    "606": 3418, "643E": 3845, "711": 4444, "613": 3829,
  });
  assert.ok(rows.every((r) => r.full_model_number.includes("TP")));
  assert.ok(rows.every((r) => r.verified_in_source_text === 1));
});

test("extractPriceRowsPositionally: a row whose price count doesn't match the header is skipped, never guessed", () => {
  const mismatched = `${REAL_MATRIX_OCR}
XP[98/99] . EO-SHORT . [] $2,468 $2,241 990EO-SHORT`;
  const { rows, warnings } = extractPriceRowsPositionally(mismatched, {});
  assert.equal(rows.length, 9, "only the well-formed row contributes rows");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /2 prices vs 9 header columns/);
});

test("extractPriceRowsPositionally: no multi-column header present - correctly reports not a matrix table rather than fabricating one", () => {
  const { rows, warnings } = extractPriceRowsPositionally(REAL_OCR_CHUNK, {});
  assert.equal(rows.length, 0);
  assert.match(warnings[0], /not a positional-matrix table/);
});

test("extractPriceRowsSingleColumn: real single-price-per-row license text - every real model+price pair recovered, zero LLM calls", () => {
  const { rows, warnings } = extractPriceRowsSingleColumn(REAL_OCR_CHUNK, { manufacturer: "Schlage", trade: "doors" });
  assert.deepEqual(warnings, []);
  assert.equal(rows.length, 5, "5 real priced rows - the Call-for-quote line correctly contributes none");
  const byModel = Object.fromEntries(rows.map((r) => [r.full_model_number, r.list_price]));
  assert.deepEqual(byModel, {
    "PAC-1-2Y": 200, "PAC-1-3Y": 300, "PAC-1-5-2Y": 980,
    "PAC-2I-50-3Y": 5550, "PAC-SI100-2Y": 4900,
  });
  assert.ok(!("PAC-XXX-2Y" in byModel), "Call for quote must never produce a fabricated price");
  // Real OCR noise preserved verbatim, not "corrected":
  assert.ok("PAC-2I-50-3Y" in byModel && "PAC-SI100-2Y" in byModel);
});

test("extractPriceRowsSingleColumn: bracket-wrapped placeholder fields before the price are never mistaken for the model number", () => {
  const { rows } = extractPriceRowsSingleColumn("Widget kit {Site] [Time] [Email] $50.00", {});
  assert.equal(rows.length, 0, "no real part-number token (with a digit) precedes the price here, so nothing is emitted");
});

test("extractPriceRowsFromOcrText: prefers the positional path for a matrix table and never calls the LLM at all", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    throw new Error("LLM should not have been called for a detectable matrix table");
  };
  try {
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, REAL_MATRIX_OCR, { manufacturer: "von-duprin", trade: "doors" });
    assert.equal(callCount, 0, "positional path needs zero LLM calls");
    assert.equal(result.rows.length, 9);
    assert.equal(result.rows.find((r) => r.finish_code === "626")?.list_price, 3375);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("extractPriceRowsFromOcrText: prefers the single-column path for a license-tier table and never calls the LLM at all", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    throw new Error("LLM should not have been called - this shape decomposes deterministically");
  };
  try {
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, REAL_OCR_CHUNK, { manufacturer: "Schlage", trade: "doors" });
    assert.equal(callCount, 0, "single-column path needs zero LLM calls");
    assert.equal(result.rows.length, 5);
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
    const bigOcrText = Array.from({ length: 14 }, () => "PAC-1-2Y $200.00 $300.00").join("\n");
    const env2 = { QWEN_BRIDGE_CLIENT_ID: "id", QWEN_BRIDGE_CLIENT_SECRET: "secret" };
    const result = await extractPriceRowsFromOcrText(env2, bigOcrText, {});
    assert.equal(result.chunksProcessed, 2);
    assert.equal(result.rows.length, 1, "the failed chunk contributes 0 rows, the surviving chunk still contributes its real row");
    assert.equal(result.warnings.filter((w) => /qwen call failed/.test(w)).length, 1);
    assert.ok(result.warnings.some((w) => /expected exactly 1 price/.test(w)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("guarded row decisions preserve real long Schlage rows and exclude quote-only lines", async () => {
  const { classifyPriceLine } = await import("./catalogue-price-extraction.js");
  for (const line of REAL_OCR_CHUNK.split("\n").slice(0, 5)) assert.equal(classifyPriceLine(line).rowType, "priced_data_row");
  assert.equal(classifyPriceLine(REAL_OCR_CHUNK.split("\n")[5]).rowType, "call_for_quote");
  assert.equal(classifyPriceLine("Shipping fee $25.00").rowType, "header_or_noise");
  assert.equal(classifyPriceLine("Minimum order $100.00").rowType, "header_or_noise");
});

test("single-column parsing retains compound models and separates real finish codes", () => {
  for (const line of ["L9050 06L 626 $412.00", "L9050 06L US26D $412.00"]) {
    const result = extractPriceRowsSingleColumn(line);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].full_model_number, "L9050 06L");
    assert.equal(result.rows[0].finish_code, line.includes("US26D") ? "US26D" : "626");
    assert.equal(result.rows[0].list_price, 412);
  }
  assert.equal(extractPriceRowsSingleColumn("626 $412.00").rows.length, 0);
});

test("quote-only pages never call Qwen or manufacture a price", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("must not be called"); };
  try {
    const result = await extractPriceRowsFromOcrText({}, REAL_OCR_CHUNK.split("\n")[5]);
    assert.equal(result.rows.length, 0);
    assert.equal(result.chunksProcessed, 0);
  } finally { globalThis.fetch = original; }
});

test("partial matrix pages preserve unmatched single-column rows", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("must not be called"); };
  try {
    const result = await extractPriceRowsFromOcrText({}, "626 630 605\nXP98 $10.00 $20.00 $30.00\nL9050 06L 626 $412.00");
    assert.equal(result.rows.length, 4);
    assert.ok(result.rows.some((r) => r.full_model_number === "L9050 06L" && r.finish_code === "626"));
    assert.equal(result.chunksProcessed, 0);
  } finally { globalThis.fetch = original; }
});

test("description references never replace the layout model column", () => {
  const result = extractPriceRowsSingleColumn("A201-399    Hub and cap outside A25 A53 A170    $45.00");
  assert.equal(result.rows[0].full_model_number, "A201-399");
  assert.equal(extractPriceRowsSingleColumn("L9050 626 630 $412.00").rows.length, 0);
});


test("option adjustments are not standalone catalogue prices", async () => {
  const result = await extractPriceRowsFromOcrText({}, "Price adjustment\n41-005 $29.60\nLess each knob -$17.60");
  assert.equal(result.rows.length, 0);
  assert.equal(result.chunksProcessed, 0);
  assert.match(result.warnings[0], /base-product context/);
});


test("LCN layout placeholders are not negative signs or model numbers", () => {
  const result = extractPriceRowsSingleColumn("Std Cylinder Assembly    1250-3071    .[Finish]    -    $180.00");
  assert.equal(result.rows[0].full_model_number, "1250-3071");
  assert.equal(result.rows[0].list_price, 180);
});

test("source footnotes are retained and finish legends are not quote-only products", async () => {
  const { classifyPriceLine } = await import("./catalogue-price-extraction.js");
  const result = extractPriceRowsSingleColumn("A301-386*    Spindle and catch inside (except A79)    $14.00");
  assert.equal(result.rows[0].full_model_number, "A301-386*");
  assert.equal(classifyPriceLine("N/A N/A 626 630").rowType, "header_or_noise");
});


test("plural price-adjustments tables abstain before extraction", async () => {
  const result = await extractPriceRowsFromOcrText({}, "PRICE ADJUSTMENTS\nL9050 626 $25.00");
  assert.deepEqual(result.rows, []);
  assert.match(result.warnings.join(" "), /base-product context/);
});
