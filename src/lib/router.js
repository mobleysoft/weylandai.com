// src/lib/router.js
//
// NativeRouter: a small, real, hand-rolled router (not a third-party
// library) - path matching with :param and * wildcard support, ordered
// middleware, and a catch-all error handler. Extracted 2026-09-10 from
// legacy-monolith.js (previously inline, ~138000-138163, itself already
// carrying a real esbuild module-boundary comment `// native-router.js`
// per WORKER_MODULARIZATION_MAP.md §0 - proof it existed separately
// before being flattened into the bundle). Zero external dependencies
// beyond Map/RegExp/URL/Response, confirmed by inspection - this is the
// routing primitive every future separated Worker (per
// WEYLAND_SUCCESSOR_ARCHITECTURE.md) uses, not just the monolith.

export class NativeRouter {
  constructor() {
    this.routes = new Map();
    this.middlewares = [];
    this.errorHandler = null;
  }

  /**
   * Add a route to the router
   * @param {string} method - HTTP method
   * @param {string} path - Route path with optional params (:id)
   * @param {Function} handler - Request handler function
   */
  addRoute(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, {
      path,
      handler,
      regex: this.pathToRegex(path),
      params: this.extractParamNames(path),
    });
  }

  /**
   * Convert path pattern to regex
   * Supports :param and * wildcards
   */
  pathToRegex(path) {
    const pattern = path.replace(/\//g, "\\/").replace(/:(\w+)/g, "(?<$1>[^\\/]+)").replace(/\*/g, ".*");
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameter names from path
   */
  extractParamNames(path) {
    const matches = path.matchAll(/:(\w+)/g);
    return Array.from(matches, (m) => m[1]);
  }

  /** Register GET route */
  get(path, handler) {
    this.addRoute("GET", path, handler);
    return this;
  }

  /** Register POST route */
  post(path, handler) {
    this.addRoute("POST", path, handler);
    return this;
  }

  /** Register PUT route */
  put(path, handler) {
    this.addRoute("PUT", path, handler);
    return this;
  }

  /** Register DELETE route */
  delete(path, handler) {
    this.addRoute("DELETE", path, handler);
    return this;
  }

  /** Register PATCH route */
  patch(path, handler) {
    this.addRoute("PATCH", path, handler);
    return this;
  }

  /** Register OPTIONS route */
  options(path, handler) {
    this.addRoute("OPTIONS", path, handler);
    return this;
  }

  /** Register middleware or catch-all route */
  all(path, handler) {
    if (path === "*") {
      this.middlewares.push(handler);
    } else {
      ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].forEach((method) => {
        this.addRoute(method, path, handler);
      });
    }
    return this;
  }

  /** Register error handler */
  catch(handler) {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Handle incoming request
   * @param {Request} request - Cloudflare Workers Request object
   * @param {Object} env - Environment bindings
   * @param {Object} ctx - Execution context
   */
  async handle(request2, env2, ctx) {
    try {
      const url = new URL(request2.url);
      const method = request2.method;
      for (const middleware of this.middlewares) {
        const result = await middleware(request2, env2, ctx);
        if (result instanceof Response) {
          return result;
        }
      }
      const exactKey = `${method}:${url.pathname}`;
      if (this.routes.has(exactKey)) {
        const route = this.routes.get(exactKey);
        request2.params = {};
        return await route.handler(request2, env2, ctx);
      }
      for (const [key, route] of this.routes) {
        if (key.startsWith(`${method}:`)) {
          const match = url.pathname.match(route.regex);
          if (match) {
            request2.params = match.groups || {};
            if (!match.groups && route.params.length > 0) {
              request2.params = {};
              route.params.forEach((param, index) => {
                request2.params[param] = match[index + 1];
              });
            }
            return await route.handler(request2, env2, ctx);
          }
        }
      }
      return new Response(JSON.stringify({
        error: "Not found",
        path: url.pathname,
        method,
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error4) {
      if (this.errorHandler) {
        return await this.errorHandler(error4, request2, env2, ctx);
      }
      console.error("Router error:", error4);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: error4.message,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /** Convenience method to create a router instance */
  static create() {
    return new NativeRouter();
  }
}
