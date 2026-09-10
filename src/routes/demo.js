import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 */
export function registerDemoRoutes(router) {
  router.post("/api/demo", async (request2, env2) => {
    try {
      const data = await request2.json();
      const requestId = crypto.randomUUID();
      await env2.DEMO_REQUESTS.put(
        requestId,
        JSON.stringify({
          ...data,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ip: request2.headers.get("CF-Connecting-IP")
        }),
        { expirationTtl: 2592e3 }
        // 30 days
      );
      return jsonResponse3({
        requestId,
        message: "Demo request received. We will contact you within 24 hours."
      }, 201);
    } catch (error4) {
      return jsonResponse3({ error: "Failed to submit demo request: " + error4.message }, 500);
    }
  });
}
