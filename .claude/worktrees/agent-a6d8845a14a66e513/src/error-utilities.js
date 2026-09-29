// Real source module, extracted 2026-09-06 from weyland.worker.js's own
// bundled "error-utilities.js" segment (original file lines ~143917-144203,
// tagged with a `// error-utilities.js` comment - proof this file used to
// exist separately before being flattened into the checked-in bundle).
// Content below is byte-faithful to that segment's real logic, with
// esbuild's internal `__name`/init_* registration calls and unused
// polyfill init calls (process/console/performance - not referenced by
// the function bodies) stripped as bundler bookkeeping, not behavior.
// Renamed esbuild's collision-suffixed locals (error4->error, context3->
// context, count3->count, env2->env) back to their real names - naming
// only, no behavior change. Not yet wired into a real build - see
// src/README.md.
//
// Real usage today: this is one of the most heavily reused clusters in
// the whole file - classifyError/createErrorResponse/jsonErrorResponse/
// ErrorMetrics are each called from multiple real request handlers
// (PDF extraction, submittal processing, the health endpoint), making
// this a strong genericization candidate, not just a WIP extraction.

export const ErrorCodes = {
  // Validation errors (4xx - client errors)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  PDF_TOO_LARGE: "PDF_TOO_LARGE",
  INVALID_PDF: "INVALID_PDF",
  // Claude API errors (5xx or external service errors)
  CLAUDE_API_ERROR: "CLAUDE_API_ERROR",
  CLAUDE_TIMEOUT: "CLAUDE_TIMEOUT",
  CLAUDE_RATE_LIMIT: "CLAUDE_RATE_LIMIT",
  CIRCUIT_BREAKER_OPEN: "CIRCUIT_BREAKER_OPEN",
  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",
  DATABASE_CONSTRAINT_ERROR: "DATABASE_CONSTRAINT_ERROR",
  // Internal errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  // Business logic errors
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  INVALID_STATE: "INVALID_STATE",
};

export function classifyError(error) {
  if (error.message && error.message.includes("Circuit breaker is OPEN")) {
    return {
      code: ErrorCodes.CIRCUIT_BREAKER_OPEN,
      statusCode: 503,
      retryable: true,
      userMessage: "Service temporarily unavailable. Please try again in a few moments.",
      category: "service_unavailable",
    };
  }
  if (error.timeout || error.message?.includes("timeout")) {
    return {
      code: ErrorCodes.CLAUDE_TIMEOUT,
      statusCode: 504,
      retryable: true,
      userMessage: "Request timed out. This PDF may be too complex. Please try again or contact support.",
      category: "timeout",
    };
  }
  if (error.validationErrors || error.retryable === false) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
      retryable: false,
      userMessage: "Invalid request. Please check your input and try again.",
      category: "validation",
    };
  }
  if (error.statusCode) {
    if (error.statusCode === 429) {
      return {
        code: ErrorCodes.CLAUDE_RATE_LIMIT,
        statusCode: 429,
        retryable: true,
        userMessage: "Rate limit exceeded. Please wait a moment and try again.",
        category: "rate_limit",
      };
    }
    if (error.statusCode >= 500) {
      return {
        code: ErrorCodes.CLAUDE_API_ERROR,
        statusCode: error.statusCode,
        retryable: true,
        userMessage: "External service error. Please try again.",
        category: "external_service",
      };
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        code: ErrorCodes.UNAUTHORIZED,
        statusCode: error.statusCode,
        retryable: false,
        userMessage: "Authentication failed. Please contact support.",
        category: "auth",
      };
    }
    if (error.statusCode === 413) {
      return {
        code: ErrorCodes.PDF_TOO_LARGE,
        statusCode: 413,
        retryable: false,
        userMessage: "PDF file is too large. Maximum size is 24MB.",
        category: "validation",
      };
    }
  }
  if (error.message?.includes("UNIQUE constraint") || error.message?.includes("FOREIGN KEY constraint")) {
    return {
      code: ErrorCodes.DATABASE_CONSTRAINT_ERROR,
      statusCode: 409,
      retryable: false,
      userMessage: "Data conflict. This record may already exist.",
      category: "database",
    };
  }
  if (error.message?.includes("database") || error.message?.includes("SQL")) {
    return {
      code: ErrorCodes.DATABASE_ERROR,
      statusCode: 500,
      retryable: true,
      userMessage: "Database error. Please try again.",
      category: "database",
    };
  }
  if (error.message?.includes("fetch") || error.message?.includes("network")) {
    return {
      code: ErrorCodes.NETWORK_ERROR,
      statusCode: 503,
      retryable: true,
      userMessage: "Network error. Please check your connection and try again.",
      category: "network",
    };
  }
  return {
    code: ErrorCodes.INTERNAL_ERROR,
    statusCode: 500,
    retryable: false,
    userMessage: "An unexpected error occurred. Please contact support.",
    category: "internal",
  };
}

export function createErrorResponse(error, context = {}) {
  const classification = classifyError(error);
  const errorResponse = {
    success: false,
    error: {
      code: classification.code,
      message: classification.userMessage,
      details: error.message,
      retryable: classification.retryable,
      timestamp: new Date().toISOString(),
      category: classification.category,
    },
  };
  if (context.userId) errorResponse.error.userId = context.userId;
  if (context.sessionId) errorResponse.error.sessionId = context.sessionId;
  if (context.pageNumber) errorResponse.error.pageNumber = context.pageNumber;
  if (context.requestId) errorResponse.error.requestId = context.requestId;
  if (error.validationErrors) {
    errorResponse.error.validationErrors = error.validationErrors;
  }
  const logDetails = {
    ...errorResponse,
    _internal: {
      originalError: error.message,
      stack: error.stack,
      errorDetails: error.errorDetails,
      attempts: error.attempts,
    },
  };
  console.error(`[Error Handler] ${classification.code}:`, JSON.stringify(logDetails, null, 2));
  return errorResponse;
}

export function jsonErrorResponse(error, context = {}) {
  const errorResponse = createErrorResponse(error, context);
  const classification = classifyError(error);
  return new Response(JSON.stringify(errorResponse), {
    status: classification.statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

export class ErrorMetrics {
  constructor(env) {
    this.env = env;
  }

  // Uses CACHE binding (not KV) per wrangler.toml configuration
  async recordError(errorCode, context = {}) {
    try {
      const key = `error_metrics:${errorCode}:${new Date().toISOString().split("T")[0]}`;
      if (this.env.CACHE) {
        const current = await this.env.CACHE.get(key);
        const count = current ? parseInt(current, 10) + 1 : 1;
        await this.env.CACHE.put(key, count.toString(), { expirationTtl: 604800 });
      }
      console.log(`[Metrics] Error recorded: ${errorCode}`, context);
    } catch (err) {
      console.error("[Metrics] Failed to record error metric:", err.message);
    }
  }

  async recordLatency(operation, latencyMs, success = true) {
    try {
      const timestamp = new Date().toISOString();
      const key = `latency:${operation}:${timestamp.split("T")[0]}`;
      console.log(`[Metrics] ${operation} - ${latencyMs}ms - ${success ? "SUCCESS" : "FAILURE"}`);
      if (this.env.CACHE) {
        const data = { operation, latencyMs, success, timestamp };
        await this.env.CACHE.put(`${key}:${Date.now()}`, JSON.stringify(data), { expirationTtl: 604800 });
      }
    } catch (err) {
      console.error("[Metrics] Failed to record latency metric:", err.message);
    }
  }

  async getErrorStats(days = 7) {
    try {
      if (!this.env.CACHE) return null;
      const stats = {};
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        for (const code of Object.values(ErrorCodes)) {
          const key = `error_metrics:${code}:${dateStr}`;
          const count = await this.env.CACHE.get(key);
          if (count) {
            if (!stats[code]) stats[code] = {};
            stats[code][dateStr] = parseInt(count, 10);
          }
        }
      }
      return stats;
    } catch (err) {
      console.error("[Metrics] Failed to get error stats:", err.message);
      return null;
    }
  }
}

export async function performHealthCheck(env) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {},
  };
  try {
    await env.DB.prepare("SELECT 1").first();
    health.checks.database = { status: "healthy" };
  } catch (error) {
    health.checks.database = { status: "unhealthy", error: error.message };
    health.status = "degraded";
  }
  try {
    await env.CACHE.put("health_check", Date.now().toString(), { expirationTtl: 60 });
    health.checks.kv = { status: "healthy" };
  } catch (error) {
    health.checks.kv = { status: "unhealthy", error: error.message };
    health.status = "degraded";
  }
  try {
    if (!env.OCR_SERVICE) {
      throw new Error("OCR_SERVICE binding not configured");
    }
    const ocrResp = await env.OCR_SERVICE.fetch("https://weyland-ocr-worker/health");
    health.checks.ocr_service = {
      status: ocrResp.ok ? "healthy" : "degraded",
      note: ocrResp.ok ? "pure-JS OCR (PDFium + tesseract-wasm), no external API" : `HTTP ${ocrResp.status}`,
    };
    if (!ocrResp.ok) {
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.ocr_service = { status: "unhealthy", error: error.message };
    health.status = "degraded";
  }
  return health;
}
