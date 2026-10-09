// Server-only account creation shared by the platform checkout and access queue.
// The public client ID remains compatible during AuthFor's fixed grace period.
// A configured confidential client replaces it; a partial configuration fails closed.
export async function provisionAuthFor(env, { email, name }, { fetchImpl = fetch } = {}) {
  const id = env?.AUTHFOR_PROVISION_CLIENT_ID;
  const secret = env?.AUTHFOR_PROVISION_CLIENT_SECRET;
  if ((id !== undefined || secret !== undefined) &&
      (typeof id !== "string" || !id || id.length > 128 || typeof secret !== "string" || !secret || secret.length > 1024)) {
    return { ok: false, status: 0, code: "AUTHFOR_PROVISION_CONFIG_INCOMPLETE" };
  }
  let response;
  try {
    response = await fetchImpl("https://authfor.com/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        client_id: id || "af_weyland_subscribe", venture_id: "weylandai.com",
        ...(secret ? { client_secret: secret } : {}) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // Fetch errors can contain request data. Return a fixed error, never credentials.
    return { ok: false, status: 0, code: "AUTHFOR_UNAVAILABLE" };
  }
  const data = await response.json().catch(() => ({}));
  if (data?.code === "USER_EXISTS" || data?.error === "USER_EXISTS") {
    return { ok: false, status: response.status, code: "USER_EXISTS", alreadyMember: true };
  }
  if (response.status === 202 || data?.code === "EMAIL_CODE_REQUIRED" || data?.verification_required) {
    return { ok: false, status: response.status, code: "EMAIL_CODE_REQUIRED" };
  }
  if (!response.ok) return { ok: false, status: response.status,
    code: data?.code === "INVALID_CLIENT" ? "INVALID_CLIENT" : "AUTHFOR_REJECTED" };
  const userId = data?.user?.id || data?.user_id || data?.id;
  if (typeof userId !== "string" || !userId) return { ok: false, status: response.status, code: "AUTHFOR_IDENTITY_MISSING" };
  const session = typeof data.session_id === "string" && data.session_id && typeof data.token === "string" && data.token
    ? { session_id: data.session_id, token: data.token } : null;
  return { ok: true, status: response.status, userId, session };
}
