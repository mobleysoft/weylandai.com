// src/lib/cors.js
//
// Real source module. CorsHandler class originally extracted 2026-09-05
// from weyland.worker.js's own bundled "cors-handler.js" segment (byte-
// verified against the monolith's inline copy 2026-09-10 - only cosmetic
// formatting differed, no logic). createCorsHandler() and
// DEFAULT_CORS_ORIGINS extracted 2026-09-10 from legacy-monolith.js
// (~145170-145200), alongside removing the shared, per-request-mutated
// `var cors` those two lived next to - every caller now constructs its
// own handler via createCorsHandler(env2), a pure function of env2, with
// zero shared mutable state. See WORKER_MODULARIZATION_MAP.md §2/§5/§6
// for why that ambient `var cors` was flagged as a real blocker to clean
// module separation.

export const DEFAULT_CORS_ORIGINS = [
  "https://weylandai.com",
  "https://subx.weylandai.com",
  "https://submittalexpress.pages.dev",
];

export class CorsHandler {
  constructor(options = {}) {
    this.origins = options.origins || ["*"];
    this.methods = options.methods || ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
    this.allowedHeaders = options.allowedHeaders || [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ];
    this.exposedHeaders = options.exposedHeaders || [];
    this.credentials = options.credentials !== void 0 ? options.credentials : true;
    this.maxAge = options.maxAge || 86400;
    this.additionalHeaders = options.headers || {};
  }

  /**
   * Check if origin is allowed
   * Supports string origins and regex patterns
   */
  isOriginAllowed(origin) {
    if (!origin)
      return true;
    if (this.origins.includes("*"))
      return true;
    for (const allowed of this.origins) {
      if (allowed instanceof RegExp) {
        if (allowed.test(origin))
          return true;
      } else if (typeof allowed === "string") {
        if (allowed === origin)
          return true;
      }
    }
    return false;
  }

  /**
   * Get CORS headers for response
   */
  getCorsHeaders(request2) {
    const origin = request2.headers.get("Origin");
    const requestMethod = request2.headers.get("Access-Control-Request-Method");
    const requestHeaders = request2.headers.get("Access-Control-Request-Headers");
    const headers = {
      "Access-Control-Allow-Origin": this.getAllowedOrigin(origin),
      "Access-Control-Allow-Methods": this.methods.join(", "),
      "Access-Control-Max-Age": String(this.maxAge),
      "Vary": "Origin",
      ...this.additionalHeaders,
    };
    if (this.credentials && origin && origin !== "*") {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
    if (requestHeaders) {
      headers["Access-Control-Allow-Headers"] = requestHeaders;
    } else {
      headers["Access-Control-Allow-Headers"] = this.allowedHeaders.join(", ");
    }
    if (this.exposedHeaders.length > 0) {
      headers["Access-Control-Expose-Headers"] = this.exposedHeaders.join(", ");
    }
    return headers;
  }

  /**
   * Get the allowed origin for response
   */
  getAllowedOrigin(origin) {
    if (!origin) {
      return "*";
    }
    if (this.origins.includes("*")) {
      return this.credentials ? origin : "*";
    }
    if (this.isOriginAllowed(origin)) {
      return origin;
    }
    const firstStringOrigin = this.origins.find((o) => typeof o === "string" && o !== "*");
    return firstStringOrigin || "*";
  }

  /**
   * Handle preflight OPTIONS request
   */
  preflight(request2) {
    if (request2.method !== "OPTIONS") {
      return null;
    }
    const origin = request2.headers.get("Origin");
    if (origin && !this.isOriginAllowed(origin)) {
      return new Response("Origin not allowed", {
        status: 403,
        statusText: "Forbidden",
      });
    }
    return new Response(null, {
      status: 204,
      statusText: "No Content",
      headers: this.getCorsHeaders(request2),
    });
  }

  /**
   * Apply CORS headers to existing response
   */
  corsify(response, request2) {
    if (!response) {
      return response;
    }
    if (!(response instanceof Response)) {
      response = new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const corsHeaders = this.getCorsHeaders(request2);
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  /**
   * Middleware function for router integration
   */
  middleware() {
    return (request2) => this.preflight(request2);
  }
}

/** Builds a CorsHandler from env2.CORS_ORIGINS, or real production defaults. */
export function createCorsHandler(env2) {
  let origins;
  if (env2?.CORS_ORIGINS) {
    if (env2.CORS_ORIGINS === "*") {
      origins = ["*"];
    } else {
      origins = env2.CORS_ORIGINS.split(",").map((o) => o.trim()).filter((o) => o.length > 0);
      origins.push(/https:\/\/[a-z0-9]+\.submittalexpress\.pages\.dev/);
    }
  } else {
    origins = [
      ...DEFAULT_CORS_ORIGINS,
      /https:\/\/[a-z0-9]+\.submittalexpress\.pages\.dev/,
      "http://localhost:8787",
      "http://localhost:3000",
      "http://127.0.0.1:8787",
    ];
  }
  return new CorsHandler({
    origins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  });
}
