import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PDF_MAGIC_BYTES,
  MAX_FILE_SIZE,
  DOWNLOAD_TIMEOUT,
  downloadPdf,
  calculateHash,
  checkDuplicate,
  storeInTempStorage,
  analyzePdfWithClaude,
  calculateMatchScore,
  validatePdf,
  validateCandidates,
  EXPANDED_URL_PATTERNS,
  generateSmartUrls,
  ALLEGION_CDN_BASE,
  ALLEGION_BRAND_REGISTRY,
  generateAllegionUrls,
  findBrandByAlias,
  isAllegionBrand,
  logDiscoveryTelemetry,
  checkUserAffirmedCache,
  searchCPSCatalogue,
  LOCAL_CATALOGUE_INDEX,
  searchLocalCatalogue,
  robotsCache,
  isAllowedByRobots,
  CLOUDFLARE_PROTECTED_DOMAINS,
  isCloudflareProtected,
  checkVerifiedUrls,
  calculateBackoffDelay,
  sleep,
  isPermanentError,
  shouldSwitchStrategy,
  discoverWithRetry,
  logRetryAttempt,
  retryFailedDiscoveries,
  getManufacturerDomains,
  queueForDiscovery,
  getDiscoveryConfig,
  RETRY_CONFIG,
} from "./cutsheet-discovery.js";

// --- constants ---

test("PDF_MAGIC_BYTES is the %PDF byte sequence", () => {
  assert.deepEqual(PDF_MAGIC_BYTES, [0x25, 0x50, 0x44, 0x46]);
});

test("MAX_FILE_SIZE is 50MB", () => {
  assert.equal(MAX_FILE_SIZE, 50 * 1024 * 1024);
});

test("RETRY_CONFIG has the expected strategy order and error classifications", () => {
  assert.deepEqual(RETRY_CONFIG.strategyOrder, [
    "verified_db", "smart_direct", "puppeteer", "site_search", "google_search",
  ]);
  assert.ok(RETRY_CONFIG.permanentErrors.includes("PRODUCT_NOT_FOUND"));
  assert.ok(RETRY_CONFIG.switchStrategyErrors.includes("CLOUDFLARE_BLOCKED"));
});

// --- downloadPdf ---

function fakeFetchOnce(impl) {
  const original = global.fetch;
  global.fetch = impl;
  return () => { global.fetch = original; };
}

test("downloadPdf: real happy path returns success with a validated PDF buffer", async () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    headers: { get: (k) => (k === "content-type" ? "application/pdf" : k === "content-length" ? String(pdfBytes.length) : null) },
    arrayBuffer: async () => pdfBytes.buffer,
  }));
  try {
    const result = await downloadPdf("https://example.com/a.pdf", {});
    assert.equal(result.success, true);
    assert.equal(result.contentLength, pdfBytes.length);
  } finally {
    restore();
  }
});

test("downloadPdf: real HTTP error is surfaced as DOWNLOAD_FAILED", async () => {
  const restore = fakeFetchOnce(async () => ({ ok: false, status: 404, statusText: "Not Found" }));
  try {
    const result = await downloadPdf("https://example.com/missing.pdf", {});
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "DOWNLOAD_FAILED");
  } finally {
    restore();
  }
});

test("downloadPdf: rejects a file whose magic bytes are not %PDF", async () => {
  const notPdf = new Uint8Array([0, 0, 0, 0]);
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    headers: { get: (k) => (k === "content-type" ? "application/pdf" : "4") },
    arrayBuffer: async () => notPdf.buffer,
  }));
  try {
    const result = await downloadPdf("https://example.com/a.pdf", {});
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "INVALID_PDF_MAGIC");
  } finally {
    restore();
  }
});

test("downloadPdf: rejects a non-PDF content type on a non-.pdf URL", async () => {
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    headers: { get: (k) => (k === "content-type" ? "text/html" : "0") },
  }));
  try {
    const result = await downloadPdf("https://example.com/page", {});
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "INVALID_CONTENT_TYPE");
  } finally {
    restore();
  }
});

test("downloadPdf: rejects a file over MAX_FILE_SIZE before downloading the body", async () => {
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    headers: { get: (k) => (k === "content-type" ? "application/pdf" : String(MAX_FILE_SIZE + 1)) },
  }));
  try {
    const result = await downloadPdf("https://example.com/huge.pdf", {});
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "FILE_TOO_LARGE");
  } finally {
    restore();
  }
});

// --- calculateHash ---

test("calculateHash: real SHA-256 digest is deterministic and hex-encoded", async () => {
  const buf = new TextEncoder().encode("hello world").buffer;
  const hash = await calculateHash(buf);
  assert.equal(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
});

// --- checkDuplicate ---

function fakeDb({ discoveryRow = null, documentRow = null } = {}) {
  let call = 0;
  return {
    prepare(sql) {
      return {
        bind: () => ({
          first: async () => {
            call++;
            if (sql.includes("cut_sheet_discoveries")) return discoveryRow;
            if (sql.includes("product_documents")) return documentRow;
            return null;
          },
        }),
      };
    },
  };
}

test("checkDuplicate: real match in cut_sheet_discoveries returns type 'discovery'", async () => {
  const db = fakeDb({ discoveryRow: { id: "d1", status: "pending_review" } });
  const result = await checkDuplicate("abc123", { DB: db });
  assert.equal(result.type, "discovery");
  assert.equal(result.id, "d1");
});

test("checkDuplicate: no match in either table returns null", async () => {
  const db = fakeDb();
  const result = await checkDuplicate("abc123", { DB: db });
  assert.equal(result, null);
});

// --- storeInTempStorage ---

test("storeInTempStorage: real put call uses a hash-derived R2 key and pdf content type", async () => {
  const puts = [];
  const env2 = { UPLOADS: { put: async (key, buf, opts) => puts.push({ key, buf, opts }) } };
  const key = await storeInTempStorage(new ArrayBuffer(4), "deadbeef", env2);
  assert.equal(key, "temp/cut-sheets/deadbeef.pdf");
  assert.equal(puts.length, 1);
  assert.equal(puts[0].opts.httpMetadata.contentType, "application/pdf");
});

// --- analyzePdfWithClaude ---

test("analyzePdfWithClaude: real behavior when no ANTHROPIC_API_KEY is configured", async () => {
  const result = await analyzePdfWithClaude(new ArrayBuffer(4), {}, {});
  assert.equal(result.analyzed, false);
  assert.equal(result.reason, "API key not configured");
});

test("analyzePdfWithClaude: real happy path parses the JSON block from Claude's response", async () => {
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    json: async () => ({
      content: [{ text: '{"documentType":"cut_sheet","matchesExpectedProduct":true,"matchConfidence":0.9}' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
  }));
  try {
    const result = await analyzePdfWithClaude(new ArrayBuffer(4), { manufacturer: "Schlage" }, { ANTHROPIC_API_KEY: "sk-x" });
    assert.equal(result.analyzed, true);
    assert.equal(result.documentType, "cut_sheet");
    assert.equal(result.matchesExpectedProduct, true);
  } finally {
    restore();
  }
});

// --- calculateMatchScore ---

test("calculateMatchScore: unanalyzed metadata scores 0", () => {
  assert.equal(calculateMatchScore({ analyzed: false }, {}), 0);
});

test("calculateMatchScore: real scoring rewards manufacturer + model + category + doc-type match", () => {
  const metadata = {
    analyzed: true,
    manufacturer: "Schlage",
    modelNumbers: ["L9050"],
    productCategory: "lock",
    documentType: "cut_sheet",
  };
  const component = { manufacturer: "Schlage", model: "L9050", dhi_category: "lock" };
  const score = calculateMatchScore(metadata, component);
  assert.equal(score, 100);
});

// --- validatePdf / validateCandidates ---

test("validatePdf: real download failure short-circuits before hashing", async () => {
  const restore = fakeFetchOnce(async () => ({ ok: false, status: 500, statusText: "Error" }));
  try {
    const result = await validatePdf("https://example.com/x.pdf", {}, {});
    assert.equal(result.valid, false);
    assert.equal(result.stage, "download");
  } finally {
    restore();
  }
});

test("validateCandidates: real behavior sorts validated candidates by matchScore descending", async () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  const restore = fakeFetchOnce(async (url) => ({
    ok: true,
    headers: { get: (k) => (k === "content-type" ? "application/pdf" : "4") },
    arrayBuffer: async () => pdfBytes.buffer,
  }));
  const db = fakeDb();
  try {
    const candidates = [{ url: "https://a.com/a.pdf" }, { url: "https://b.com/b.pdf" }];
    const results = await validateCandidates(candidates, { manufacturer: "Schlage" }, { DB: db }, 2);
    assert.equal(results.length, 2);
    assert.ok(results[0].matchScore >= results[1].matchScore);
  } finally {
    restore();
  }
});

// --- Allegion brand registry ---

test("findBrandByAlias: real alias lookup resolves 'sch' to schlage", () => {
  assert.equal(findBrandByAlias("sch"), "schlage");
});

test("findBrandByAlias: unknown manufacturer returns null", () => {
  assert.equal(findBrandByAlias("totally-unknown-brand-xyz"), null);
});

test("isAllegionBrand: true for a real Allegion alias, false otherwise", () => {
  assert.equal(isAllegionBrand("von duprin"), true);
  assert.equal(isAllegionBrand("totally-unknown-brand-xyz"), false);
});

test("generateAllegionUrls: real Schlage L-series produces a direct CDN URL", () => {
  const urls = generateAllegionUrls("schlage", "L9040");
  assert.ok(Array.isArray(urls));
  assert.ok(urls.some((u) => u.url.startsWith(ALLEGION_CDN_BASE)));
});

test("generateAllegionUrls: non-Allegion manufacturer yields no candidates", () => {
  const urls = generateAllegionUrls("totally-unknown-brand-xyz", "X1");
  assert.deepEqual(urls, []);
});

test("generateSmartUrls: real output is an array of URL candidates for a known pattern manufacturer", () => {
  const urls = generateSmartUrls("schlage", "L9040", { series: "L-Series", baseModel: "L9040" });
  assert.ok(Array.isArray(urls));
});

// --- telemetry / caches ---

test("logDiscoveryTelemetry: no-op with no DB binding (does not throw)", async () => {
  await logDiscoveryTelemetry({}, { name: "x", message: "y" });
});

test("logDiscoveryTelemetry: real insert is issued against client_telemetry", async () => {
  const inserted = [];
  const db = { prepare: (sql) => ({ bind: (...args) => ({ run: async () => inserted.push({ sql, args }) }) }) };
  await logDiscoveryTelemetry({ DB: db }, { name: "test_event", severity: "info", message: "hi" });
  assert.equal(inserted.length, 1);
  assert.ok(inserted[0].sql.includes("client_telemetry"));
});

test("checkUserAffirmedCache: no userId returns found:false without touching the DB", async () => {
  const result = await checkUserAffirmedCache("Schlage", "L9040", null, { DB: {} });
  assert.equal(result.found, false);
});

test("checkUserAffirmedCache: real DB hit returns the cached r2Key at full confidence", async () => {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => ({ id: "c1", catalogue_id: "cat1", page_start: 1, page_end: 2, r2_key: "k1", affirmed_at: "now", affirmed_by: "u1" }),
      }),
    }),
  };
  const result = await checkUserAffirmedCache("Schlage", "L9040", "u1", { DB: db });
  assert.equal(result.found, true);
  assert.equal(result.confidence, 1);
  assert.equal(result.r2Key, "k1");
});

test("searchCPSCatalogue: not configured returns found:false without a network call", async () => {
  const result = await searchCPSCatalogue("Schlage", "L9040", {});
  assert.equal(result.found, false);
});

test("searchCPSCatalogue: real exact-model match yields highest confidence", async () => {
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    json: async () => ({ mappings: [{ id: "m1", catalogue_id: "c1", model_number: "L9040" }] }),
  }));
  try {
    const result = await searchCPSCatalogue("Schlage", "L9040", { CPS_API_URL: "https://cps.example.com" });
    assert.equal(result.found, true);
    assert.equal(result.confidence, 0.97);
  } finally {
    restore();
  }
});

test("searchLocalCatalogue: real match finds the Schlage L-series local cut sheet by model", async () => {
  const match = await searchLocalCatalogue("schlage", "L9010", null, {});
  assert.ok(match);
  assert.equal(match.manufacturer, "schlage");
  assert.equal(match.matchType, "exact_model");
});

test("searchLocalCatalogue: no match for an unrecognized manufacturer returns null", async () => {
  const match = await searchLocalCatalogue("totally-unknown-brand-xyz", "ZZZ", null, {});
  assert.equal(match, null);
});

// --- robots / cloudflare protection ---

test("isAllowedByRobots: real disallow rule blocks a matching path", async () => {
  robotsCache.clear();
  const restore = fakeFetchOnce(async () => ({
    ok: true,
    text: async () => "User-agent: *\nDisallow: /private/\n",
  }));
  try {
    const allowed = await isAllowedByRobots("https://example.com/private/doc.pdf", {});
    assert.equal(allowed, false);
  } finally {
    restore();
  }
});

test("isAllowedByRobots: caches the robots.txt fetch across repeated calls for the same host", async () => {
  robotsCache.clear();
  let fetchCount = 0;
  const restore = fakeFetchOnce(async () => {
    fetchCount++;
    return { ok: true, text: async () => "User-agent: *\nAllow: /\n" };
  });
  try {
    await isAllowedByRobots("https://cache-test.example.com/a.pdf", {});
    await isAllowedByRobots("https://cache-test.example.com/b.pdf", {});
    assert.equal(fetchCount, 1);
  } finally {
    restore();
  }
});

test("isCloudflareProtected: real match against the known protected-domain list", () => {
  assert.equal(isCloudflareProtected("https://us.allegion.com/foo"), true);
  assert.equal(isCloudflareProtected("https://example.com/foo"), false);
});

test("isCloudflareProtected: malformed URL fails closed to false", () => {
  assert.equal(isCloudflareProtected("not-a-url"), false);
});

test("checkVerifiedUrls: no DB binding returns null without querying", async () => {
  const result = await checkVerifiedUrls("Schlage", "L9040", "L-Series", {});
  assert.equal(result, null);
});

test("checkVerifiedUrls: real DB hit returns a database_verified candidate", async () => {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => ({
          document_url: "https://cdn.example.com/l9040.pdf",
          verified_at: "2026-01-01",
          product_series: "L-Series",
          base_model: "L9040",
          manufacturer_name: "Schlage",
          manufacturer_slug: "schlage",
          matched_brand: null,
        }),
      }),
    }),
  };
  const result = await checkVerifiedUrls("Schlage", "L9040", "L-Series", { DB: db });
  assert.equal(result.source, "database_verified");
  assert.equal(result.confidence, 0.99);
});

// --- retry/backoff ---

test("calculateBackoffDelay: grows with attempt number and stays within maxDelayMs", () => {
  const d0 = calculateBackoffDelay(0);
  const d3 = calculateBackoffDelay(3);
  assert.ok(d0 <= RETRY_CONFIG.maxDelayMs);
  assert.ok(d3 <= RETRY_CONFIG.maxDelayMs);
  assert.ok(d3 > d0 * 2); // exponential growth dominates jitter at this spread
});

test("sleep: real timer resolves after roughly the requested delay", async () => {
  const start = Date.now();
  await sleep(20);
  assert.ok(Date.now() - start >= 15);
});

test("isPermanentError: real classification matches known permanent error codes", () => {
  assert.equal(isPermanentError(new Error("PRODUCT_NOT_FOUND: no match")), true);
  assert.equal(isPermanentError(new Error("some other transient failure")), false);
});

test("shouldSwitchStrategy: real classification matches known switch-triggering errors", () => {
  assert.equal(shouldSwitchStrategy(new Error("CLOUDFLARE_BLOCKED by WAF")), true);
  assert.equal(shouldSwitchStrategy(new Error("unrelated failure")), false);
});

test("discoverWithRetry: real exhaustion path returns success:false after maxAttempts with a full retryLog", async () => {
  const restore = fakeFetchOnce(async () => ({ ok: false, status: 500, statusText: "err" }));
  const db = { prepare: () => ({ bind: () => ({ run: async () => {} }) }) };
  try {
    const result = await discoverWithRetry(
      { manufacturer: "totally-unknown-brand-xyz", model: "Z1" },
      { DB: db },
      { maxAttempts: 2 },
    );
    assert.equal(result.success, false);
    assert.equal(result.retryAttempts, 2);
    assert.equal(result.retryLog.length, 2);
  } finally {
    restore();
  }
});

test("logRetryAttempt: no-op with no DB binding (does not throw)", async () => {
  await logRetryAttempt({}, { manufacturer: "x", model: "y" }, { attempt: 1, strategy: "google_search" });
});

test("retryFailedDiscoveries: no DB binding returns an error result without throwing", async () => {
  const result = await retryFailedDiscoveries("s1", {});
  assert.equal(result.error, "No database connection");
  assert.equal(result.retried, 0);
});

test("retryFailedDiscoveries: real behavior with zero failed rows retries nothing", async () => {
  const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) };
  const result = await retryFailedDiscoveries("s1", { DB: db });
  assert.equal(result.totalFailed, 0);
  assert.equal(result.retried, 0);
});

// --- catalogue / queueing ---

test("getManufacturerDomains: real query returns the DB's verified domain rows", async () => {
  const db = {
    prepare: () => ({
      bind: () => ({ all: async () => ({ results: [{ domain: "schlage.com" }] }) }),
    }),
  };
  const domains = await getManufacturerDomains("Schlage", { DB: db });
  assert.deepEqual(domains, [{ domain: "schlage.com" }]);
});

test("queueForDiscovery: real happy path inserts a pending queue row and returns queued status", async () => {
  const inserted = [];
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => ({
          first: async () => null,
          run: async () => inserted.push({ sql, args }),
        }),
      };
    },
  };
  const result = await queueForDiscovery({ manufacturer: "Schlage", model: "L9040" }, "u1", { DB: db });
  assert.equal(result.status, "queued");
  assert.ok(inserted.some((i) => i.sql.includes("INSERT INTO cut_sheet_discovery_queue")));
});

test("queueForDiscovery: real behavior returns already_queued when a pending item exists for the component", async () => {
  const db = {
    prepare(sql) {
      return {
        bind: () => ({
          first: async () => {
            if (sql.includes("hardware_components")) return { id: "c1" };
            if (sql.includes("cut_sheet_discovery_queue")) return { id: "existing1" };
            return null;
          },
        }),
      };
    },
  };
  const result = await queueForDiscovery({ id: "c1", manufacturer: "Schlage", model: "L9040" }, "u1", { DB: db });
  assert.equal(result.status, "already_queued");
  assert.equal(result.id, "existing1");
});

test("getDiscoveryConfig: real query flattens key/value rows into a config object", async () => {
  const db = {
    prepare: () => ({ all: async () => ({ results: [{ key: "pending_review_expiry_days", value: "30" }] }) }),
  };
  const config = await getDiscoveryConfig({ DB: db });
  assert.deepEqual(config, { pending_review_expiry_days: "30" });
});
