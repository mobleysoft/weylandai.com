import { jsonResponse3 } from "../lib/json-response.js";

/**
 * Route bodies below are unmodified from the original bundle except:
 * esbuild's cosmetic `__name(...)` call stripped (function .name is
 * already correct - see src/README.md for why other extracted modules
 * do the same).
 *
 * @param {object} router
 * @param {{ authenticate: Function, callEdge: Function, errorResponse: Function }} deps
 */
export function registerMiscUtilityRoutes(router, { authenticate, callEdge, errorResponse }) {
  router.get("/api/test/sabp-marker-xyz", async (request2, env2) => {
    return jsonResponse3({ marker: "sabp-route-active", timestamp: Date.now() }, 200);
  });
  router.get("/api/jobs/:jobId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const res = await callEdge("GET", `/ai/v1/jobs/${request2.params.jobId}`, env2);
    return jsonResponse3(res.body, res.status);
  });
  router.get("/api/user/tenants", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const tenants = Array.isArray(user.tenants) ? user.tenants : [];
      if (tenants.length === 0) {
        return jsonResponse3({
          tenants: [],
          current_tenant_id: null,
          warning: "NO_TENANT_ACCESS",
          message: "User has no tenant assignments. Contact administrator."
        });
      }
      const isDefault = (t) => t.is_default === 1 || t.is_default === true;
      const defaultTenant = tenants.find(isDefault);
      const currentTenantId = defaultTenant ? defaultTenant.id : tenants[0].id;
      return jsonResponse3({
        tenants: tenants.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          role: t.role,
          is_default: isDefault(t)
        })),
        current_tenant_id: currentTenantId
      });
    } catch (error5) {
      return errorResponse("SESSION_ERROR", "Failed to read tenants from session: " + error5.message);
    }
  });
}
