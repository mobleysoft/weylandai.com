import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Route bodies below are unmodified from the original bundle except:
 * esbuild's cosmetic `__name(...)` calls stripped (function .name is
 * already correct - see src/README.md for why other extracted modules
 * do the same). buildSubmittalValidationPrompt/validateWithClaudeVision/
 * validateSubmittalStructure had their only call sites inside
 * /api/submittal/validate below - fully orphaned, so inlined here as
 * local private helpers.
 *
 * @param {object} router
 * @param {{ authenticate: Function, logClaudeAPICall: Function }} deps
 */
export function registerSubmittalChatRoutes(router, { authenticate, logClaudeAPICall }) {
  function buildSubmittalValidationPrompt(submittal, referenceDescription) {
    return `You are validating a generated hardware submittal against a reference document.

  GENERATED SUBMITTAL:
  - Project: ${submittal.header?.project_name || "Unknown"}
  - Total Sets: ${submittal.summary?.total_sets || 0}
  - Total Components: ${submittal.summary?.total_components || 0}

  Hardware Sets:
  ${submittal.hardware_sets?.map((set) => `
  SET ${set.set_number}: ${set.description || "N/A"}
  - Function: ${set.function_type || "N/A"}
  - Keying: ${set.keying_system || "N/A"}
  - Components: ${set.components?.length || 0}
  ${set.components?.map((c) => `  * ${c.type}: ${c.quantity} x ${c.manufacturer || ""} ${c.model || "TBD"}`).join("\n")}
  `).join("\n") || "No sets"}

  ${referenceDescription ? `
  REFERENCE DESCRIPTION:
  ${referenceDescription}` : ""}

  Please evaluate:
  1. COMPLETENESS: Are all expected hardware sets and components present?
  2. ACCURACY: Do the extracted values match what you see in the reference?
  3. FORMAT: Does the submittal follow professional DSA-2 format standards?
  4. ISSUES: List any discrepancies, missing data, or errors found.

  Respond with a structured JSON assessment:
  {
    "overall_score": 0-100,
    "completeness_score": 0-100,
    "accuracy_score": 0-100,
    "format_score": 0-100,
    "issues": ["issue1", "issue2"],
    "recommendations": ["rec1", "rec2"],
    "summary": "Brief overall assessment"
  }`;
  }
  async function validateWithClaudeVision(env2, submittalData, referenceImageBase64, prompt, telemetryContext = {}) {
    const ANTHROPIC_API_KEY = env2.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return { error: "Claude API not configured" };
    }
    const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    const startTime = Date.now();
    const model = "claude-opus-4-6";
    const endpoint = "https://api.anthropic.com/v1/messages";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, "")
                }
              },
              {
                type: "text",
                text: prompt + "\n\nThe image above shows the reference submittal document to compare against."
              }
            ]
          }]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        const latencyMs2 = Date.now() - startTime;
        console.error("[Submittal Validation] Claude API error:", errorText);
        await logClaudeAPICall(env2, {
          apiType: "validation",
          endpoint,
          model,
          requestTimestamp,
          responseTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
          latencyMs: latencyMs2,
          errorMessage: `HTTP ${response.status}: ${errorText.substring(0, 500)}`,
          sessionId: telemetryContext.sessionId,
          userId: telemetryContext.userId
        });
        return { error: "Claude API request failed", details: errorText };
      }
      const result = await response.json();
      const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      const latencyMs = Date.now() - startTime;
      await logClaudeAPICall(env2, {
        apiType: "validation",
        endpoint,
        model,
        requestTimestamp,
        responseTimestamp,
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
        latencyMs,
        sessionId: telemetryContext.sessionId,
        userId: telemetryContext.userId
      });
      const content = result.content?.[0]?.text || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return { raw_response: content };
        }
      }
      return { raw_response: content };
    } catch (error4) {
      console.error("[Submittal Validation] Error:", error4);
      return { error: error4.message };
    }
  }
  function validateSubmittalStructure(submittalData) {
    const issues = [];
    const recommendations = [];
    let completenessScore = 100;
    let formatScore = 100;
    if (!submittalData.header?.project_name) {
      issues.push("Missing project name");
      completenessScore -= 10;
    }
    if (!submittalData.hardware_sets || submittalData.hardware_sets.length === 0) {
      issues.push("No hardware sets found");
      completenessScore -= 50;
    }
    for (const set of submittalData.hardware_sets || []) {
      if (!set.set_number) {
        issues.push(`Hardware set missing set number`);
        completenessScore -= 5;
      }
      if (!set.components || set.components.length === 0) {
        issues.push(`Set ${set.set_number} has no components`);
        completenessScore -= 5;
      }
      for (const comp of set.components || []) {
        if (!comp.model || comp.model === "TBD") {
          recommendations.push(`Set ${set.set_number}: Component ${comp.type} missing model number`);
        }
        if (!comp.manufacturer) {
          recommendations.push(`Set ${set.set_number}: Component ${comp.type} missing manufacturer`);
        }
      }
    }
    if (!submittalData.certifications) {
      issues.push("Missing certifications section");
      formatScore -= 10;
    }
    return {
      overall_score: Math.round((completenessScore + formatScore) / 2),
      completeness_score: Math.max(0, completenessScore),
      accuracy_score: 100,
      // Cannot assess without reference
      format_score: Math.max(0, formatScore),
      issues,
      recommendations,
      summary: issues.length === 0 ? "Submittal structure is valid and complete" : `Found ${issues.length} issue(s) requiring attention`
    };
  }

  router.post("/api/submittal/validate", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { submittal_data, reference_image_base64, reference_description } = body;
      if (!submittal_data) {
        return jsonResponse3({ error: "submittal_data is required" }, 400);
      }
      console.log(`[Submittal Validation] Validating submittal with ${submittal_data.summary?.total_sets || 0} sets`);
      const comparisonPrompt = buildSubmittalValidationPrompt(submittal_data, reference_description);
      let validationResult2;
      if (reference_image_base64) {
        validationResult2 = await validateWithClaudeVision(
          env2,
          submittal_data,
          reference_image_base64,
          comparisonPrompt
        );
      } else {
        validationResult2 = validateSubmittalStructure(submittal_data);
      }
      return jsonResponse3({
        success: true,
        validation: validationResult2
      }, 200);
    } catch (error5) {
      console.error("[Submittal Validation] Error:", error5);
      return jsonResponse3({
        error: "Failed to validate submittal",
        details: error5.message
      }, 500);
    }
  });
  router.post("/api/chat", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    const startTime = Date.now();
    const model = "claude-opus-4-6";
    const endpoint = "https://api.anthropic.com/v1/messages";
    try {
      const body = await request2.json();
      const { message, systemPrompt, context: context3 } = body;
      if (!message) {
        return jsonResponse3({ error: "message is required" }, 400);
      }
      console.log(`[Chat] User message: "${message.substring(0, 50)}..."`);
      const fullSystemPrompt = systemPrompt || `You are the Weyland Assistant, an AI helper for the Weyland Hardware Submittal Express system by Weyland. Help users understand their submittal data, suggest edits, explain compliance requirements, and answer questions about door hardware. Keep responses concise and helpful.`;
      const claudeResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env2.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: fullSystemPrompt,
          messages: [
            {
              role: "user",
              content: message
            }
          ]
        })
      });
      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        const latencyMs2 = Date.now() - startTime;
        console.error("[Chat] Claude API error:", errorText);
        await logClaudeAPICall(env2, {
          apiType: "chat",
          endpoint,
          model,
          requestTimestamp,
          responseTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
          latencyMs: latencyMs2,
          errorMessage: `HTTP ${claudeResponse.status}: ${errorText.substring(0, 500)}`,
          userId: user.userId
        });
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }
      const claudeResult = await claudeResponse.json();
      const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      const latencyMs = Date.now() - startTime;
      await logClaudeAPICall(env2, {
        apiType: "chat",
        endpoint,
        model,
        requestTimestamp,
        responseTimestamp,
        inputTokens: claudeResult.usage?.input_tokens || 0,
        outputTokens: claudeResult.usage?.output_tokens || 0,
        latencyMs,
        userId: user.userId
      });
      const responseText = claudeResult.content[0]?.text || "I apologize, I could not generate a response.";
      console.log(`[Chat] Response generated: ${responseText.substring(0, 50)}...`);
      return jsonResponse3({
        success: true,
        response: responseText,
        usage: claudeResult.usage
      }, 200);
    } catch (error5) {
      console.error("[Chat] Error:", error5);
      return jsonResponse3({
        error: "Failed to process chat message",
        details: error5.message
      }, 500);
    }
  });
}
