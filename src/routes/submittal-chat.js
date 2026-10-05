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
  // 2026-10-05: the Claude-vision image comparison called api.anthropic.com
  // and was removed (no API call outside the conglomerate at request time).
  // A reference image now gets the structural validation plus an explicit
  // note that image comparison is not available.
  async function validateWithClaudeVision(env2, submittalData) {
    const structural = validateSubmittalStructure(submittalData);
    return Object.assign({}, structural, { image_comparison: "unavailable: no in-ecosystem vision route at request time (policy 2026-10-05)" });
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
  // 2026-10-05: the assistant chat posted straight to api.anthropic.com. No
  // page calls this route; it now answers honestly instead of reaching
  // outside the conglomerate.
  router.post("/api/chat", async (request2, env2) => {
    const { error: error4 } = await authenticate(request2, env2);
    if (error4) return error4;
    return jsonResponse3({
      error: "assistant unavailable",
      reason: "weylandai.com makes no API call outside the MobCorp ecosystem at request time; no in-ecosystem chat route is wired yet"
    }, 503);
  });
}
