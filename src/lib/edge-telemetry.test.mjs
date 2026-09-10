import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORKER_VERSION,
  detectFileType,
  ERROR_CODES,
  errorResponse,
  generateId3,
  CLAUDE_PRICING,
  calculateClaudeCost,
  logClaudeAPICall,
  logTelemetryEvent,
  incrementSubmittalsUsed,
  HASCOM_EDGE,
  mintInternalToken,
  callEdge,
} from "./edge-telemetry.js";

test("WORKER_VERSION is a real semver-shaped string", () => {
  assert.match(WORKER_VERSION, /^\d+\.\d+\.\d+$/);
});

test("detectFileType: recognizes real magic bytes for pdf/png/jpeg/webp/gif", () => {
  assert.equal(detectFileType(new Uint8Array([37, 80, 68, 70, 0, 0, 0, 0, 0, 0, 0, 0]).buffer).type, "pdf");
  assert.equal(detectFileType(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0, 0, 0, 0, 0]).buffer).type, "image");
  assert.equal(detectFileType(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0, 0, 0, 0, 0]).buffer).mimeType, "image/png");
  assert.equal(detectFileType(new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer).mimeType, "image/jpeg");
  assert.equal(
    detectFileType(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]).buffer).mimeType,
    "image/webp"
  );
  assert.equal(detectFileType(new Uint8Array([71, 73, 70, 56, 0, 0, 0, 0, 0, 0, 0, 0]).buffer).mimeType, "image/gif");
});

test("detectFileType: unknown bytes fall back cleanly", () => {
  const result = detectFileType(new Uint8Array(12).buffer);
  assert.equal(result.type, "unknown");
  assert.equal(result.mimeType, null);
});

test("errorResponse: known code maps to its real status and message", async () => {
  const res = errorResponse("NOT_FOUND");
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, "NOT_FOUND");
  assert.equal(body.error.message, "Resource not found");
  assert.equal(body.success, false);
});

test("errorResponse: unknown string code falls back to INTERNAL_ERROR", async () => {
  const res = errorResponse("NOT_A_REAL_CODE");
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
});

test("errorResponse: custom message overrides the code's default message", async () => {
  const res = errorResponse("VALIDATION_ERROR", "field xyz is bad");
  const body = await res.json();
  assert.equal(body.error.message, "field xyz is bad");
});

test("errorResponse: accepts a raw error-def object directly", async () => {
  const res = errorResponse({ code: "CUSTOM", status: 418, message: "teapot" });
  assert.equal(res.status, 418);
  const body = await res.json();
  assert.equal(body.error.code, "CUSTOM");
});

test("generateId3: produces a unique, prefixed id each call", () => {
  const a = generateId3("sess");
  const b = generateId3("sess");
  assert.match(a, /^sess_\d+_[a-z0-9]+$/);
  assert.notEqual(a, b);
});

test("calculateClaudeCost: real pricing math for a known model", () => {
  const cost = calculateClaudeCost("claude-3-5-sonnet-20241022", 1_000_000, 1_000_000);
  assert.equal(cost, 3 + 15);
});

test("calculateClaudeCost: unknown model falls back to claude-3-sonnet-20240229 pricing", () => {
  const known = calculateClaudeCost("claude-3-sonnet-20240229", 500_000, 0);
  const unknown = calculateClaudeCost("not-a-real-model", 500_000, 0);
  assert.equal(unknown, known);
  assert.equal(unknown, CLAUDE_PRICING["claude-3-sonnet-20240229"].input * 0.5);
});

function makeFakeEnv({ runCalls = [], firstResult = null } = {}) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind: (...args) => ({
            async run() { runCalls.push({ sql, args }); return {}; },
            async first() { return firstResult; },
          }),
        };
      },
    },
  };
}

test("logClaudeAPICall: real INSERT with a computed estimated cost", async () => {
  const runCalls = [];
  const env = makeFakeEnv({ runCalls });
  await logClaudeAPICall(env, {
    apiType: "vision", endpoint: "/extract", model: "claude-3-5-sonnet-20241022",
    inputTokens: 1000, outputTokens: 500, requestTimestamp: "t1",
  });
  assert.equal(runCalls.length, 1);
  assert.ok(runCalls[0].sql.includes("INSERT INTO claude_api_logs"));
  const estimatedCost = runCalls[0].args[13];
  assert.ok(estimatedCost > 0);
});

test("logClaudeAPICall: swallows DB errors rather than throwing", async () => {
  const env = { DB: { prepare() { throw new Error("db down"); } } };
  await assert.doesNotReject(() => logClaudeAPICall(env, { apiType: "x", model: "y", requestTimestamp: "t" }));
});

test("logTelemetryEvent: real INSERT with defaults applied", async () => {
  const runCalls = [];
  const env = makeFakeEnv({ runCalls });
  await logTelemetryEvent(env, { eventType: "click", eventName: "button_press" });
  assert.equal(runCalls.length, 1);
  assert.ok(runCalls[0].sql.includes("INSERT INTO client_telemetry"));
  assert.equal(runCalls[0].args[5], "info"); // severity default
});

test("incrementSubmittalsUsed: real UPDATE then SELECT round trip", async () => {
  const runCalls = [];
  const env = makeFakeEnv({ runCalls, firstResult: { submittals_used: 7 } });
  const result = await incrementSubmittalsUsed("u1", env);
  assert.equal(result, 7);
  assert.ok(runCalls[0].sql.includes("UPDATE users SET submittals_used"));
});

test("incrementSubmittalsUsed: returns 0 when the row lookup comes back empty", async () => {
  const env = makeFakeEnv({ firstResult: null });
  const result = await incrementSubmittalsUsed("u1", env);
  assert.equal(result, 0);
});

test("HASCOM_EDGE is a real https url", () => {
  assert.match(HASCOM_EDGE, /^https:\/\//);
});

test("mintInternalToken: falls back to the fleet key when AUTH_ONAMERICA isn't bound", async () => {
  const headers = await mintInternalToken({ FLEET_API_KEY: "fk1" });
  assert.equal(headers["X-Surface"], "internal-fallback-jwt");
  assert.equal(headers["Authorization"], "Bearer fk1");
});

test("mintInternalToken: uses the real paseto path when AUTH_ONAMERICA succeeds", async () => {
  const env = {
    AUTH_ONAMERICA: { async fetch() { return { ok: true, async json() { return { token: "tok123" }; } }; } },
    PASETO_INTERNAL_KEY_REF: "ref1",
  };
  const headers = await mintInternalToken(env);
  assert.equal(headers["X-Surface"], "internal-paseto");
  assert.equal(headers["Authorization"], "Bearer tok123");
});

test("mintInternalToken: falls back to fleet key when the paseto fetch throws", async () => {
  const env = {
    AUTH_ONAMERICA: { async fetch() { throw new Error("network down"); } },
    PASETO_INTERNAL_KEY_REF: "ref1",
    FLEET_API_KEY: "fk2",
  };
  const headers = await mintInternalToken(env);
  assert.equal(headers["X-Surface"], "internal-fallback-jwt");
});

test("callEdge: uses env.HASCOM_EDGE service binding when present", async () => {
  let seenRequest;
  const env = {
    FLEET_API_KEY: "fk1",
    HASCOM_EDGE: { async fetch(req) { seenRequest = req; return { status: 200, async text() { return JSON.stringify({ ok: true }); } }; } },
  };
  const result = await callEdge("POST", "/api/x", env, { a: 1 });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(seenRequest.url, "https://hascom-edge.internal/api/x");
});

test("callEdge: falls back to a direct fetch to HASCOM_EDGE when no service binding is bound", async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { status: 503, async text() { return "not json"; } };
  };
  try {
    const env = { FLEET_API_KEY: "fk1" };
    const result = await callEdge("GET", "/api/y", env);
    assert.equal(calledUrl, `${HASCOM_EDGE}/api/y`);
    assert.equal(result.status, 503);
    assert.equal(result.body.raw, "not json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
