// src/lib/edge-telemetry.js
//
// MONOLITH_HELPER_MAP.md's Cluster F: internal edge/session/telemetry
// plumbing. Extracted from two esbuild module regions in
// legacy-monolith.js that turned out not to be physically contiguous -
// the `// weyland-worker.js` boundary (WORKER_VERSION through
// incrementSubmittalsUsed) is interleaved with the real `router = new
// NativeRouter()` instantiation and its CORS-preflight middleware
// (both left in place in legacy-monolith.js - they're the actual
// live router, not "helper" content), and HASCOM_EDGE/
// mintInternalToken/callEdge sit ~1300 lines further down, next to
// generateR2StreamUrl (a different, not-yet-extracted cluster).
//
// Smallest cluster in this phase but the highest fan-in of any of
// them - nearly every already-extracted route module in src/routes/
// already declares one of these as an injected dep (see
// module-registry.js's JSDoc), so this is a pure "give the existing
// deps a real home" move, not a change to any call site's shape.
//
// calculateClaudeCost2 renamed to calculateClaudeCost - confirmed via
// grep this is an orphaned esbuild collision-suffix (no surviving
// unsuffixed sibling) with a single internal caller (logClaudeAPICall,
// moved in the same file), so the rename is safe with no external
// call sites to update.
//
// Real, deliberately NOT fixed here: ERROR_CODES/errorResponse below
// is a second, parallel, unreconciled error-response convention
// alongside src/error-utilities.js's ErrorCodes/jsonErrorResponse
// (already wired into legacy-monolith.js and used by
// hardware-schedule-page-extract.js/system-status.js). Both are live
// in production today. Reconciling them is a real design decision
// (which error taxonomy wins, and updating every call site) - out of
// scope for this mechanical extraction; flagged in
// MONOLITH_HELPER_MAP.md for a real follow-up.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort.

import { jsonResponse3 } from "./json-response.js";

export var WORKER_VERSION = "2.10.0";

export function detectFileType(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70) {
    return { type: "pdf", mimeType: "application/pdf", extension: "pdf" };
  }
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    return { type: "image", mimeType: "image/png", extension: "png" };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { type: "image", mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return { type: "image", mimeType: "image/webp", extension: "webp" };
  }
  if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 56) {
    return { type: "image", mimeType: "image/gif", extension: "gif" };
  }
  return { type: "unknown", mimeType: null, extension: null };
}

export var ERROR_CODES = {
  // Authentication (4xx)
  AUTH_REQUIRED: { code: "AUTH_REQUIRED", status: 401, message: "Authentication required" },
  AUTH_EXPIRED: { code: "AUTH_EXPIRED", status: 401, message: "Authentication token expired" },
  AUTH_INVALID: { code: "AUTH_INVALID", status: 401, message: "Invalid authentication credentials" },
  FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Access denied" },
  // Validation (400)
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400, message: "Invalid input" },
  MISSING_FIELD: { code: "MISSING_FIELD", status: 400, message: "Required field missing" },
  INVALID_FORMAT: { code: "INVALID_FORMAT", status: 400, message: "Invalid format" },
  // Resources (4xx)
  NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Resource not found" },
  CONFLICT: { code: "CONFLICT", status: 409, message: "Resource conflict" },
  RATE_LIMITED: { code: "RATE_LIMITED", status: 429, message: "Too many requests" },
  // Server errors (5xx)
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500, message: "Internal server error" },
  DATABASE_ERROR: { code: "DATABASE_ERROR", status: 500, message: "Database operation failed" },
  EXTERNAL_API_ERROR: { code: "EXTERNAL_API_ERROR", status: 502, message: "External service error" },
  TIMEOUT: { code: "TIMEOUT", status: 504, message: "Request timeout" },
  // Domain-specific
  EXTRACTION_FAILED: { code: "EXTRACTION_FAILED", status: 500, message: "Hardware extraction failed" },
  UPLOAD_FAILED: { code: "UPLOAD_FAILED", status: 500, message: "File upload failed" },
  PDF_INVALID: { code: "PDF_INVALID", status: 400, message: "Invalid PDF file" }
};

export function errorResponse(codeOrError, customMessage = null, details = null) {
  const errorDef = typeof codeOrError === "string" ? ERROR_CODES[codeOrError] || ERROR_CODES.INTERNAL_ERROR : codeOrError;
  const response = {
    success: false,
    error: {
      code: errorDef.code,
      message: customMessage || errorDef.message
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (details && typeof ENVIRONMENT !== "undefined" && ENVIRONMENT !== "production") {
    response.error.details = details;
  }
  return jsonResponse3(response, errorDef.status);
}

export function generateId3(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export var CLAUDE_PRICING = {
  "claude-3-sonnet-20240229": { input: 3, output: 15 },
  "claude-3-5-sonnet-20240620": { input: 3, output: 15 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-5-haiku-20241022": { input: 0.25, output: 1.25 },
  "claude-3-opus-20240229": { input: 15, output: 75 },
  "claude-opus-4-6": { input: 15, output: 75 }
};

export function calculateClaudeCost(model, inputTokens, outputTokens) {
  const pricing = CLAUDE_PRICING[model] || CLAUDE_PRICING["claude-3-sonnet-20240229"];
  const inputCost = inputTokens / 1e6 * pricing.input;
  const outputCost = outputTokens / 1e6 * pricing.output;
  return inputCost + outputCost;
}

export async function logClaudeAPICall(env2, params) {
  try {
    const id = crypto.randomUUID();
    const inputTokens = params.inputTokens || 0;
    const outputTokens = params.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateClaudeCost(params.model, inputTokens, outputTokens);
    await env2.DB.prepare(`
      INSERT INTO claude_api_logs (
        id, session_id, user_id, api_type, endpoint, model,
        request_timestamp, response_timestamp, error_message,
        input_tokens, output_tokens, total_tokens, latency_ms,
        estimated_cost_usd, page_number, correlation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.sessionId || null,
      params.userId || null,
      params.apiType,
      params.endpoint,
      params.model,
      params.requestTimestamp,
      params.responseTimestamp || null,
      params.errorMessage || null,
      inputTokens,
      outputTokens,
      totalTokens,
      params.latencyMs || null,
      estimatedCost,
      params.pageNumber || null,
      params.correlationId || null
    ).run();
    console.log(`[Telemetry] Logged Claude ${params.apiType} call: ${params.model}, ${totalTokens} tokens, $${estimatedCost.toFixed(6)}`);
  } catch (error4) {
    console.error("[Telemetry] Failed to log Claude API call:", error4.message);
  }
}

export async function logTelemetryEvent(env2, params) {
  try {
    const id = crypto.randomUUID();
    await env2.DB.prepare(`
      INSERT INTO client_telemetry (
        id, user_id, session_id, event_type, event_name,
        severity, message, context, client_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.userId || null,
      params.sessionId || null,
      params.eventType,
      params.eventName,
      params.severity || "info",
      params.message || null,
      params.context ? JSON.stringify(params.context) : null,
      (/* @__PURE__ */ new Date()).toISOString()
    ).run();
  } catch (error4) {
    console.error("[Telemetry] Failed to log event:", error4.message);
  }
}

export async function incrementSubmittalsUsed(userId, env2) {
  await env2.DB.prepare(
    "UPDATE users SET submittals_used = submittals_used + 1, updated_at = ? WHERE id = ?"
  ).bind((/* @__PURE__ */ new Date()).toISOString(), userId).run();
  const row = await env2.DB.prepare(
    "SELECT submittals_used FROM users WHERE id = ?"
  ).bind(userId).first();
  return row?.submittals_used || 0;
}

export var HASCOM_EDGE = "https://hascom-edge.ron-helms.workers.dev";

export async function mintInternalToken(env2) {
  if (env2.AUTH_ONAMERICA && env2.PASETO_INTERNAL_KEY_REF) {
    try {
      const r = await env2.AUTH_ONAMERICA.fetch("https://internal/api/auth/mint-paseto", {
        method: "POST",
        body: JSON.stringify({ venture: "weyland", ttl_seconds: 60 })
      });
      if (r.ok) {
        const { token } = await r.json();
        return { "Authorization": `Bearer ${token}`, "X-Surface": "internal-paseto" };
      }
    } catch (_) {
    }
  }
  return { "Authorization": `Bearer ${env2.FLEET_API_KEY}`, "X-Fleet-Key": env2.FLEET_API_KEY || "", "X-Surface": "internal-fallback-jwt" };
}

export async function callEdge(method, path, env2, body) {
  const authHeaders = await mintInternalToken(env2);
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...authHeaders
  };
  const init = { method, headers, body: body ? JSON.stringify(body) : void 0 };
  let resp;
  if (env2.HASCOM_EDGE) {
    resp = await env2.HASCOM_EDGE.fetch(new Request(`https://hascom-edge.internal${path}`, init));
  } else {
    headers["User-Agent"] = "Mozilla/5.0 (compatible; weyland-sabp-proxy/1.0)";
    resp = await fetch(`${HASCOM_EDGE}${path}`, init);
  }
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text, http_status: resp.status };
  }
  return { status: resp.status, body: data };
}
