// Resolve schedule upload tenancy from authenticated context, never a form
// field or a request property that NativeRouter does not populate.
export function resolveHardwareScheduleTenant(user, requestedTenant) {
  const own = [user?.tenant_id, user?.tenantId];
  const memberships = Array.isArray(user?.tenants) ? user.tenants.map(t => t?.id) : [];
  const allowed = new Set([...own, ...memberships].filter(id => typeof id === "string" && id.trim()).map(id => id.trim()));
  const defaultTenant = own.find(id => typeof id === "string" && id.trim())?.trim()
    || memberships.find(id => typeof id === "string" && id.trim())?.trim();
  if (requestedTenant != null && typeof requestedTenant !== "string") {
    return { status: 400, error: "tenant_id must be a string" };
  }
  const selected = requestedTenant?.trim() || defaultTenant;
  if (!selected || !allowed.has(selected)) {
    return { status: 403, error: "Tenant access denied for this authenticated user" };
  }
  return { tenantId: selected };
}
