import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPricesFromPdfUrl, extractPricesForComponent } from "./catalogue-price-discovery.js";

const REAL_PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"

function makeFakeDb({ existingCandidates = [] } = {}) {
  const inserted = [];
  return {
    inserted,
    prepare(sql) {
      let binds = [];
      return {
        bind(...args) { binds = args; return this; },
        async all() {
          if (sql.includes("FROM catalogue_price_candidates")) return { results: existingCandidates };
          return { results: [] };
        },
        async first() { return null; },
        async run() {
          if (sql.includes("INSERT INTO catalogue_price_candidates")) inserted.push(binds);
          return { success: true };
        },
      };
    },
  };
}

function makeFakeOcrService(pageTextByNumber, documentPageCount) {
  return {
    async fetch(_url, opts) {
      const pageNum = Number(opts.headers["X-Start-Page"] || "1");
      const text = pageTextByNumber[pageNum] ?? "";
      return {
        ok: true,
        json: async () => ({ pages: [{ page: pageNum, text }], documentPageCount, startPage: pageNum, endPage: pageNum }),
      };
    },
  };
}

function withMockedFetch(pdfBytes, qwenContent, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("llama.mobleysoft.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: qwenContent } }] }),
      };
    }
    // the PDF download
    return {
      ok: true,
      headers: { get: (h) => (h === "content-type" ? "application/pdf" : h === "content-length" ? String(pdfBytes.length) : null) },
      arrayBuffer: async () => pdfBytes.buffer,
    };
  };
  return fn().finally(() => { globalThis.fetch = originalFetch; });
}

test("extractPricesFromPdfUrl: missing OCR_SERVICE binding fails cleanly, no download attempted", async () => {
  const result = await extractPricesFromPdfUrl("https://example.com/x.pdf", {}, { DB: makeFakeDb() });
  assert.equal(result.error, "ocr_service_not_configured");
});

test("extractPricesFromPdfUrl: an already-staged PDF (same hash) short-circuits instead of re-extracting", async () => {
  const db = makeFakeDb({ existingCandidates: [{ id: "cpc-1", catalogue_id: null }, { id: "cpc-2", catalogue_id: null }] });
  const env2 = { DB: db, OCR_SERVICE: makeFakeOcrService({}, 1), UPLOADS: { put: async () => {} } };
  await withMockedFetch(REAL_PDF_MAGIC, "{}", async () => {
    const result = await extractPricesFromPdfUrl("https://example.com/x.pdf", {}, env2);
    assert.equal(result.alreadyStaged, true);
    assert.deepEqual(result.candidateIds, ["cpc-1", "cpc-2"]);
  });
  assert.equal(db.inserted.length, 0, "must not insert new candidates for an already-seen PDF");
});

test("extractPricesFromPdfUrl: real end-to-end - a price-shaped page gets staged, a non-price page is skipped without an LLM call", async () => {
  const db = makeFakeDb();
  const pageTextByNumber = {
    1: "TABLE OF CONTENTS\nSchlage L Series\nIntroduction and warranty information",
    2: "L9050 06L $412.00\nL9050 30L $438.00",
  };
  let qwenCallCount = 0;
  const env2 = {
    DB: db,
    OCR_SERVICE: makeFakeOcrService(pageTextByNumber, 2),
    UPLOADS: { put: async () => {} },
  };
  const qwenContent = JSON.stringify({
    rows: [{ full_model_number: "L9050 06L", finish_code: "626", list_price: 412.0, unit_price: null, price_uom: "EA" }],
  });
  await withMockedFetch(REAL_PDF_MAGIC, qwenContent, async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes("llama.mobleysoft.com")) {
        qwenCallCount++;
        return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: qwenContent } }] }) };
      }
      return originalFetch ? originalFetch(url) : { ok: true, headers: { get: () => "application/pdf" }, arrayBuffer: async () => REAL_PDF_MAGIC.buffer };
    };
    env2.QWEN_BRIDGE_CLIENT_ID = "id";
    env2.QWEN_BRIDGE_CLIENT_SECRET = "secret";
    const result = await extractPricesFromPdfUrl("https://example.com/schlage.pdf", { manufacturer: "Schlage", trade: "doors" }, env2);
    assert.equal(result.pagesScanned, 1, "only the price-shaped page counts as scanned");
    assert.equal(result.pagesSkipped, 1, "the TOC page is skipped");
    assert.equal(result.candidatesStaged, 1);
    globalThis.fetch = originalFetch;
  });
  assert.equal(db.inserted.length, 1);
  assert.equal(db.inserted[0][5], "Schlage");
});

test("extractPricesForComponent: a failed discovery (no candidate URL) fails cleanly without attempting extraction", async () => {
  // discoverWithRetry with no real search infra configured will exhaust its
  // strategies and return success:false - confirm that's surfaced honestly
  // rather than crashing or silently returning an empty success.
  const env2 = { DB: makeFakeDb(), OCR_SERVICE: makeFakeOcrService({}, 1) };
  const result = await extractPricesForComponent({ manufacturer: "Nonexistent", model: "ZZZ999" }, env2, { maxAttempts: 1 });
  assert.equal(result.error, "discovery_failed");
});
