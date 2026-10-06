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
      overall_score: Math.round((Math.max(0, completenessScore) + Math.max(0, formatScore)) / 2),
      overall_score_scope: "structure_and_format_only",
      structural_score: Math.round((Math.max(0, completenessScore) + Math.max(0, formatScore)) / 2),
      validation_scope: "structural_only",
      completeness_score: Math.max(0, completenessScore),
      accuracy_score: null,
      accuracy_status: "not_verified",
      accuracy_note: "Accuracy has not been checked against a reference document or image.",
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
      let body;
      try { body = await request2.json(); } catch { return jsonResponse3({ error: "invalid_json" }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return jsonResponse3({ error: "Invalid validation request" }, 400);
      const { submittal_data, reference_image_base64, reference_description } = body;
      if (!submittal_data) {
        return jsonResponse3({ error: "submittal_data is required" }, 400);
      }
      console.log(`[Submittal Validation] Validating submittal with ${submittal_data.summary?.total_sets || 0} sets`);
      if (typeof submittal_data !== "object" || Array.isArray(submittal_data) || (submittal_data.hardware_sets != null && (!Array.isArray(submittal_data.hardware_sets) || submittal_data.hardware_sets.some(set => !set || typeof set !== "object" || (set.components != null && (!Array.isArray(set.components) || set.components.some(c => !c || typeof c !== "object"))))))) return jsonResponse3({ error: "Invalid submittal structure" }, 400);
      const validationResult2 = validateSubmittalStructure(submittal_data);
      validationResult2.reference_comparison = { status: reference_image_base64 || reference_description ? "unavailable" : "not_requested", verified: false, reason: "No supported reference comparison route is wired; structure and format checks do not establish accuracy." };
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
  // 2026-10-05: the assistant chat posted straight to api.anthropic.com. No
  // page calls this route; it now answers honestly instead of reaching
  // outside the conglomerate.
  router.post("/api/chat", async (request2, env2) => {
    const { error: error4 } = await authenticate(request2, env2);
    if (error4) return error4;
    let body;
    try { body = await request2.json(); } catch { return jsonResponse3({ error: "invalid_json" }, 400); }
    if (typeof body?.message !== "string" || !body.message.trim()) return jsonResponse3({ error: "message required" }, 400);
    return jsonResponse3({
      error: "assistant unavailable",
      reason: "weylandai.com makes no API call outside the MobCorp ecosystem at request time; no in-ecosystem chat route is wired yet"
    }, 503);
  });
}
