import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerTelemetryRoutes(router, { authenticate }) {
  router.post("/api/telemetry", async (request2, env2) => {
    let user = null;
    try {
      const authResult = await authenticate(request2, env2);
      if (!authResult.error) {
        user = authResult.user;
      }
    } catch (e) {
    }
    try {
      const body = await request2.json();
      const events = Array.isArray(body.events) ? body.events : [body];
      const clientIp = request2.headers.get("CF-Connecting-IP") || "unknown";
      const userAgent = request2.headers.get("User-Agent") || "unknown";
      const insertedIds = [];
      for (const event of events) {
        const id = crypto.randomUUID();
        await env2.DB.prepare(`
          INSERT INTO client_telemetry (
            id, session_id, user_id, event_type, event_name, severity,
            message, stack_trace, context, url, user_agent,
            viewport_width, viewport_height, performance_data,
            client_timestamp, ip_address, correlation_id, parent_event_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          event.session_id || null,
          user?.id || event.user_id || null,
          event.event_type || "info",
          event.event_name || "unknown",
          event.severity || "info",
          event.message || null,
          event.stack_trace || null,
          event.context ? JSON.stringify(event.context) : null,
          event.url || null,
          userAgent,
          event.viewport_width || null,
          event.viewport_height || null,
          event.performance_data ? JSON.stringify(event.performance_data) : null,
          event.client_timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          clientIp,
          event.correlation_id || null,
          event.parent_event_id || null
        ).run();
        insertedIds.push(id);
      }
      console.log(`[Telemetry] Stored ${events.length} events`);
      return jsonResponse3({ success: true, count: events.length, ids: insertedIds }, 200);
    } catch (error4) {
      console.error("[Telemetry] Error:", error4);
      return jsonResponse3({ error: "Failed to store telemetry", details: error4.message }, 500);
    }
  });
  router.get("/api/telemetry/recent", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const eventType = url.searchParams.get("type");
      const severity = url.searchParams.get("severity");
      const sessionId = url.searchParams.get("session_id");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      let query = "SELECT * FROM client_telemetry WHERE 1=1";
      const params = [];
      if (eventType) {
        query += " AND event_type = ?";
        params.push(eventType);
      }
      if (severity) {
        query += " AND severity = ?";
        params.push(severity);
      }
      if (sessionId) {
        query += " AND session_id = ?";
        params.push(sessionId);
      }
      query += " ORDER BY client_timestamp DESC LIMIT ?";
      params.push(limit);
      const result = await env2.DB.prepare(query).bind(...params).all();
      return jsonResponse3({
        success: true,
        count: result.results.length,
        events: result.results
      }, 200);
    } catch (error5) {
      console.error("[Telemetry] Query error:", error5);
      return jsonResponse3({ error: "Failed to retrieve telemetry", details: error5.message }, 500);
    }
  });
  router.get("/api/telemetry/errors", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const result = await env2.DB.prepare(`
        SELECT id, session_id, event_name, severity, message, stack_trace,
               url, client_timestamp, context
        FROM client_telemetry
        WHERE event_type = 'error'
        ORDER BY client_timestamp DESC
        LIMIT ?
      `).bind(limit).all();
      return jsonResponse3({
        success: true,
        count: result.results.length,
        errors: result.results
      }, 200);
    } catch (error5) {
      console.error("[Telemetry] Error query failed:", error5);
      return jsonResponse3({ error: "Failed to retrieve errors", details: error5.message }, 500);
    }
  });
  router.post("/api/telemetry/claude-api", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const id = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT INTO claude_api_logs (
          id, session_id, user_id, api_type, endpoint, model,
          request_timestamp, request_body, system_prompt, user_message_preview,
          response_timestamp, response_text, response_status, error_message,
          input_tokens, output_tokens, total_tokens, latency_ms,
          estimated_cost_usd, page_number, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        body.session_id || null,
        user.userId,
        body.api_type || "unknown",
        body.endpoint || "unknown",
        body.model || "unknown",
        body.request_timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        body.request_body ? JSON.stringify(body.request_body) : null,
        body.system_prompt || null,
        body.user_message_preview || null,
        body.response_timestamp || null,
        body.response_text || null,
        body.response_status || null,
        body.error_message || null,
        body.input_tokens || null,
        body.output_tokens || null,
        body.total_tokens || null,
        body.latency_ms || null,
        body.estimated_cost_usd || null,
        body.page_number || null,
        body.correlation_id || null
      ).run();
      return jsonResponse3({ success: true, id }, 200);
    } catch (error5) {
      console.error("[Telemetry] Claude API log error:", error5);
      return jsonResponse3({ error: "Failed to log Claude API call", details: error5.message }, 500);
    }
  });
  router.get("/api/telemetry/claude-api/recent", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const url = new URL(request2.url);
      const sessionId = url.searchParams.get("session_id");
      const apiType = url.searchParams.get("api_type");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      let query = "SELECT * FROM claude_api_logs WHERE 1=1";
      const params = [];
      if (sessionId) {
        query += " AND session_id = ?";
        params.push(sessionId);
      }
      if (apiType) {
        query += " AND api_type = ?";
        params.push(apiType);
      }
      query += " ORDER BY request_timestamp DESC LIMIT ?";
      params.push(limit);
      const result = await env2.DB.prepare(query).bind(...params).all();
      let totalTokens = 0;
      let totalCost = 0;
      result.results.forEach((r) => {
        totalTokens += r.total_tokens || 0;
        totalCost += r.estimated_cost_usd || 0;
      });
      return jsonResponse3({
        success: true,
        count: result.results.length,
        summary: {
          total_tokens: totalTokens,
          estimated_cost_usd: totalCost.toFixed(4)
        },
        logs: result.results
      }, 200);
    } catch (error5) {
      console.error("[Telemetry] Claude API query failed:", error5);
      return jsonResponse3({ error: "Failed to retrieve Claude API logs", details: error5.message }, 500);
    }
  });
}
