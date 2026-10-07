// weyland-platform-worker/src/lib/legal.js
//
// Who sells, and the Terms a buyer accepts (John, 2026-10-07: customers see
// Argo LLC, the only legal entity, as the seller of WeylandAI).
//
// The Terms and Privacy URLs are published by fc:ops (plan/evidence/
// weylandai_contracts.md, section fc:ops): https://weylandai.com/terms and
// /privacy once those pages are live, the consenta.cc addresses (same text)
// until then. They are plain wrangler vars (TERMS_URL, PRIVACY_URL), so a new
// address is a redeploy, not a code change. Only https URLs on weylandai.com or
// consenta.cc are accepted from the vars.

export const OPERATOR = "Argo LLC";
export const OPERATOR_LINE = "WeylandAI is operated by Argo LLC.";
export const SUPPORT_EMAIL = "support@weylandai.com";
export const HELLO_EMAIL = "hello@weylandai.com";

export const DEFAULT_TERMS_URL = "https://consenta.cc/policy/weylandai.com/terms";
export const DEFAULT_PRIVACY_URL = "https://consenta.cc/policy/weylandai.com/privacy";

const ALLOWED_HOSTS = new Set(["weylandai.com", "consenta.cc"]);

function safeLegalUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function termsUrls(env = {}) {
  return {
    terms_url: safeLegalUrl(env.TERMS_URL) || DEFAULT_TERMS_URL,
    privacy_url: safeLegalUrl(env.PRIVACY_URL) || DEFAULT_PRIVACY_URL
  };
}
