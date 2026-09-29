// Real, runnable verification for src/error-utilities.js - run with:
//   node --test src/error-utilities.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ErrorCodes,
  classifyError,
  createErrorResponse,
  jsonErrorResponse,
  ErrorMetrics,
  performHealthCheck,
} from "./error-utilities.js";

function makeFakeCache(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    _store: store,
  };
}

// --- classifyError ---

test("classifyError: circuit breaker message maps to CIRCUIT_BREAKER_OPEN/503, retryable", () => {
  const c = classifyError(new Error("Circuit breaker is OPEN for this service"));
  assert.equal(c.code, ErrorCodes.CIRCUIT_BREAKER_OPEN);
  assert.equal(c.statusCode, 503);
  assert.equal(c.retryable, true);
});

test("classifyError: timeout flag or message maps to CLAUDE_TIMEOUT/504", () => {
  const c1 = classifyError({ timeout: true, message: "" });
  assert.equal(c1.code, ErrorCodes.CLAUDE_TIMEOUT);
  const c2 = classifyError(new Error("request timeout exceeded"));
  assert.equal(c2.code, ErrorCodes.CLAUDE_TIMEOUT);
  assert.equal(c2.statusCode, 504);
});

test("classifyError: validationErrors or retryable:false maps to VALIDATION_ERROR/400, not retryable", () => {
  const c = classifyError({ validationErrors: ["bad field"], message: "" });
  assert.equal(c.code, ErrorCodes.VALIDATION_ERROR);
  assert.equal(c.statusCode, 400);
  assert.equal(c.retryable, false);
});

test("classifyError: statusCode 429 maps to CLAUDE_RATE_LIMIT", () => {
  const c = classifyError({ statusCode: 429, message: "" });
  assert.equal(c.code, ErrorCodes.CLAUDE_RATE_LIMIT);
  assert.equal(c.retryable, true);
});

test("classifyError: statusCode >= 500 maps to CLAUDE_API_ERROR, preserves the original status", () => {
  const c = classifyError({ statusCode: 502, message: "" });
  assert.equal(c.code, ErrorCodes.CLAUDE_API_ERROR);
  assert.equal(c.statusCode, 502);
});

test("classifyError: statusCode 401/403 maps to UNAUTHORIZED, not retryable", () => {
  const c401 = classifyError({ statusCode: 401, message: "" });
  const c403 = classifyError({ statusCode: 403, message: "" });
  assert.equal(c401.code, ErrorCodes.UNAUTHORIZED);
  assert.equal(c403.code, ErrorCodes.UNAUTHORIZED);
  assert.equal(c401.retryable, false);
});

test("classifyError: statusCode 413 maps to PDF_TOO_LARGE", () => {
  const c = classifyError({ statusCode: 413, message: "" });
  assert.equal(c.code, ErrorCodes.PDF_TOO_LARGE);
  assert.equal(c.retryable, false);
});

test("classifyError: UNIQUE/FOREIGN KEY constraint messages map to DATABASE_CONSTRAINT_ERROR/409", () => {
  const c = classifyError(new Error("UNIQUE constraint failed: users.email"));
  assert.equal(c.code, ErrorCodes.DATABASE_CONSTRAINT_ERROR);
  assert.equal(c.statusCode, 409);
});

test("classifyError: generic database/SQL message maps to DATABASE_ERROR/500, retryable", () => {
  const c = classifyError(new Error("database connection lost"));
  assert.equal(c.code, ErrorCodes.DATABASE_ERROR);
  assert.equal(c.retryable, true);
});

test("classifyError: fetch/network message maps to NETWORK_ERROR/503, retryable", () => {
  const c = classifyError(new Error("failed to fetch resource"));
  assert.equal(c.code, ErrorCodes.NETWORK_ERROR);
  assert.equal(c.retryable, true);
});

test("classifyError: unrecognized error falls back to INTERNAL_ERROR/500, not retryable", () => {
  const c = classifyError(new Error("something totally unexpected"));
  assert.equal(c.code, ErrorCodes.INTERNAL_ERROR);
  assert.equal(c.statusCode, 500);
  assert.equal(c.retryable, false);
});

// --- createErrorResponse / jsonErrorResponse ---

test("createErrorResponse: shapes a client-safe error object, includes context fields only when present", () => {
  const res = createErrorResponse(new Error("boom"), { userId: "u1", requestId: "r1" });
  assert.equal(res.success, false);
  assert.equal(res.error.code, ErrorCodes.INTERNAL_ERROR);
  assert.equal(res.error.details, "boom");
  assert.equal(res.error.userId, "u1");
  assert.equal(res.error.requestId, "r1");
  assert.equal(res.error.sessionId, undefined);
});

test("createErrorResponse: surfaces validationErrors when present on the source error", () => {
  const res = createErrorResponse({ message: "bad input", validationErrors: ["field x required"] });
  assert.deepEqual(res.error.validationErrors, ["field x required"]);
});

test("jsonErrorResponse: returns a real Response with the classified status code and matching JSON body", async () => {
  const res = jsonErrorResponse({ statusCode: 429, message: "slow down" });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Content-Type"), "application/json");
  const body = await res.json();
  assert.equal(body.error.code, ErrorCodes.CLAUDE_RATE_LIMIT);
});

// --- ErrorMetrics ---

test("ErrorMetrics.recordError: increments a per-day counter in CACHE", async () => {
  const env = { CACHE: makeFakeCache() };
  const metrics = new ErrorMetrics(env);
  await metrics.recordError(ErrorCodes.TIMEOUT);
  await metrics.recordError(ErrorCodes.TIMEOUT);
  const today = new Date().toISOString().split("T")[0];
  const key = `error_metrics:${ErrorCodes.TIMEOUT}:${today}`;
  assert.equal(await env.CACHE.get(key), "2");
});

test("ErrorMetrics.recordError: never throws even if CACHE is missing", async () => {
  const metrics = new ErrorMetrics({});
  await assert.doesNotReject(() => metrics.recordError(ErrorCodes.TIMEOUT));
});

test("ErrorMetrics.getErrorStats: reads back today's recorded count", async () => {
  const env = { CACHE: makeFakeCache() };
  const metrics = new ErrorMetrics(env);
  await metrics.recordError(ErrorCodes.DATABASE_ERROR);
  const stats = await metrics.getErrorStats(1);
  const today = new Date().toISOString().split("T")[0];
  assert.equal(stats[ErrorCodes.DATABASE_ERROR][today], 1);
});

test("ErrorMetrics.getErrorStats: returns null when CACHE is missing, does not throw", async () => {
  const metrics = new ErrorMetrics({});
  const stats = await metrics.getErrorStats(3);
  assert.equal(stats, null);
});

// --- performHealthCheck ---

test("performHealthCheck: all bindings healthy reports overall status healthy", async () => {
  const env = {
    DB: { prepare: () => ({ first: async () => ({ 1: 1 }) }) },
    CACHE: makeFakeCache(),
    OCR_SERVICE: { fetch: async () => new Response("ok", { status: 200 }) },
  };
  const health = await performHealthCheck(env);
  assert.equal(health.status, "healthy");
  assert.equal(health.checks.database.status, "healthy");
  assert.equal(health.checks.kv.status, "healthy");
  assert.equal(health.checks.ocr_service.status, "healthy");
});

test("performHealthCheck: a failing DB binding degrades overall status without throwing", async () => {
  const env = {
    DB: { prepare: () => ({ first: async () => { throw new Error("db down"); } }) },
    CACHE: makeFakeCache(),
    OCR_SERVICE: { fetch: async () => new Response("ok", { status: 200 }) },
  };
  const health = await performHealthCheck(env);
  assert.equal(health.status, "degraded");
  assert.equal(health.checks.database.status, "unhealthy");
  assert.equal(health.checks.kv.status, "healthy");
});

test("performHealthCheck: missing OCR_SERVICE binding is reported unhealthy, not thrown", async () => {
  const env = {
    DB: { prepare: () => ({ first: async () => ({ 1: 1 }) }) },
    CACHE: makeFakeCache(),
  };
  const health = await performHealthCheck(env);
  assert.equal(health.checks.ocr_service.status, "unhealthy");
  assert.equal(health.status, "degraded");
});
