// weyland-platform-worker/src/lib/errors.js
//
// Partial, deliberate fork of ../../../src/lib/edge-telemetry.js: only
// WORKER_VERSION, ERROR_CODES, and errorResponse() are copied verbatim -
// the three real call sites this Worker's forked routes (root.js,
// subscription.js, auth-session.js) actually need. edge-telemetry.js
// itself also holds HASCOM_EDGE/callEdge/mintInternalToken/
// logClaudeAPICall/CLAUDE_PRICING/generateId3/detectFileType - real code,
// but for a different concern (Claude-vision-bridge telemetry, document
// extraction) that no route in this platform Worker touches. Forking the
// whole file would drag in that unrelated dependency surface for no
// benefit; this narrower fork keeps this Worker's import graph honest
// about what it actually depends on. Not a rewrite - errorResponse's
// body, ERROR_CODES' full table, and the WORKER_VERSION value below are
// byte-identical to the source.
//
// jsonResponse3 comes from this Worker's own ../lib/json-response.js
// fork, same as the source file's own import.

import { jsonResponse3 } from "./json-response.js";

export var WORKER_VERSION = "2.10.0";

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
