import { jsonResponse3 } from "../lib/json-response.js";
import { jsonErrorResponse, ErrorMetrics, performHealthCheck } from "../error-utilities.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, WORKER_VERSION: string }} deps
 */
export function registerSystemStatusRoutes(router, { authenticate, WORKER_VERSION }) {
  router.get("/api/health", async (request2, env2) => {
    try {
      const health = await performHealthCheck(env2);
      return jsonResponse3({
        ...health,
        service: "SubX API",
        version: WORKER_VERSION,
        environment: env2.ENVIRONMENT || "production",
        dependencies: 0,
        ocr: "pdfium_tesseract_wasm",
        deployment: "weylandai-com-worker",
        organization: "Mobley Helms Systems LP"
      }, health.status === "healthy" ? 200 : 503);
    } catch (error4) {
      console.error("[Health Check] Error:", error4);
      return jsonResponse3({
        status: "unhealthy",
        error: error4.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }, 503);
    }
  });
  router.get("/api/version", (request2, env2) => {
    return jsonResponse3({
      version: WORKER_VERSION,
      environment: env2.ENVIRONMENT || "production",
      build_date: "2026-05-18",
      service: "SubX API",
      edition: env2.WEYLAND_EDITION || "cloud"
    });
  });
  router.get("/api/metrics/errors", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const metrics = new ErrorMetrics(env2);
      const days = parseInt(new URL(request2.url).searchParams.get("days") || "7", 10);
      const stats = await metrics.getErrorStats(Math.min(days, 30));
      return jsonResponse3({
        success: true,
        period_days: days,
        error_statistics: stats,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error5) {
      console.error("[Metrics] Error retrieving stats:", error5);
      return jsonErrorResponse(error5);
    }
  });
}
