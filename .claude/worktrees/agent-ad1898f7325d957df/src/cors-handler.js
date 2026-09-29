// Real source module, extracted 2026-09-05 from weyland.worker.js's own
// bundled "cors-handler.js" segment (lines 138248-138382 at extraction
// time, tagged with a `// cors-handler.js` comment - proof this file used
// to exist separately before being flattened into the checked-in bundle).
// Content below is byte-faithful to that segment's real logic, with
// esbuild's internal `__name`/init_* registration calls stripped - those
// are bundler bookkeeping, not behavior. Not yet wired into a real build
// - see src/README.md. Second extraction in this track, after
// auth-module.js.

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
