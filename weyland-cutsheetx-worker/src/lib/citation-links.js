// weyland-cutsheetx-worker/src/lib/citation-links.js
//
// Citation links a visitor can open (2026-10-07).
//
// A match cites a page: /api/cut-sheets/sheet/<id>/pdf#page=N (a filed price
// book) or /api/cps/catalogues/<id>/pages/<n>/render (the catalogue page that
// names the model). Both document routes sit behind the guest-token gate, and
// the homepage renders citations as plain links (<a target="_blank">), which
// carry no Authorization header: a guest who clicked the citation the matcher
// had just given them got {"error":"Authentication required"}.
//
// So the matcher routes sign every citation URL they hand to an authenticated
// caller (guest or account): a grant bound to that one document path, valid
// for six to seven days (?cite=<expiry>.<HMAC-SHA256>, keyed with the Worker
// secret CITATION_LINK_SECRET). The two document routes accept a valid grant
// in place of a token and authenticate everything else exactly as before. A
// grant opens one document and nothing else, cannot be moved to another path,
// and expires. The expiry sits on a UTC day boundary, so the same page cited
// on the same day gets the same URL (the browser cache keeps working).
//
// Without the secret (a local run, a missing binding) URLs stay unsigned and
// the routes behave exactly as they did before this module.

export const CITATION_PARAM = "cite";
const DAY_SECONDS = 86400;
const TTL_DAYS = 7;
const SIGNABLE = [
  /^\/api\/cps\/catalogues\/[^/]+\/pages\/\d+\/render$/,
  /^\/api\/cut-sheets\/sheet\/[^/]+\/pdf$/,
];

export function isCitationPath(path) {
  return typeof path === "string" && SIGNABLE.some((re) => re.test(path));
}

function secretOf(env) {
  const s = env && env.CITATION_LINK_SECRET;
  return typeof s === "string" && s.length >= 32 ? s : null;
}

const keyCache = new Map();
function hmacKey(secret) {
  if (!keyCache.has(secret)) {
    keyCache.set(secret, crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));
  }
  return keyCache.get(secret);
}

function b64url(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function message(path, exp) {
  return new TextEncoder().encode("cutsheetx-citation-v1|" + path + "|" + exp);
}

function decodedPath(path) {
  try { return decodeURIComponent(path); } catch (e) { return null; }
}

/**
 * Sign a citation URL ("/api/.../render", "/api/.../pdf#page=6"); the grant goes
 * before any #fragment. Anything that is not one of the two document routes, and
 * every URL when the secret is missing, comes back unchanged.
 */
export async function signCitationUrl(env, url, nowMs = Date.now()) {
  const secret = secretOf(env);
  if (!secret || typeof url !== "string" || !url.startsWith("/")) return url;
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = beforeHash.indexOf("?");
  const path = decodedPath(queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash);
  if (!path || !isCitationPath(path)) return url;
  const exp = (Math.floor(nowMs / 1000 / DAY_SECONDS) + TTL_DAYS) * DAY_SECONDS;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), message(path, exp));
  return beforeHash + (queryAt >= 0 ? "&" : "?") + CITATION_PARAM + "=" + exp + "." + b64url(sig) + hash;
}

/** "none" | "valid" | "expired" | "invalid" for the request's ?cite= grant. */
export async function citationGrant(request, env, nowMs = Date.now()) {
  const url = new URL(request.url);
  const grant = url.searchParams.get(CITATION_PARAM);
  if (!grant) return "none";
  const secret = secretOf(env);
  const m = /^(\d{9,11})\.([A-Za-z0-9_-]{43})$/.exec(grant);
  const path = decodedPath(url.pathname);
  if (!secret || !m || !path || !isCitationPath(path)) return "invalid";
  const exp = Number(m[1]);
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(m[2]), message(path, exp));
  } catch (e) { ok = false; }
  if (!ok) return "invalid";
  return exp * 1000 < nowMs ? "expired" : "valid";
}

/**
 * Sign every citation URL in a matcher result (lib/product-database.js
 * matchComponentToCutSheets): cutSheets[].pageUrl and cataloguePages[].pageUrl.
 * Projections made from the result afterwards (toBatchResult's cutSheet,
 * cataloguePage, citation) carry the signed URLs.
 */
export async function signMatchResultLinks(env, result) {
  if (!result || !secretOf(env)) return result;
  for (const list of [result.cutSheets, result.cataloguePages]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item.pageUrl === "string") item.pageUrl = await signCitationUrl(env, item.pageUrl);
    }
  }
  // The ranked citations (routes/cut-sheet-match.js matchLine) carry their own copies of the URLs.
  if (Array.isArray(result.citations)) {
    for (const c of result.citations) {
      if (c && typeof c.url === "string") c.url = await signCitationUrl(env, c.url);
    }
  }
  return result;
}

/** The answer for a request whose grant was present but did not open the document. */
export function grantRefusal(grant) {
  return grant === "expired"
    ? { error: "This citation link has expired. Match the line again for a fresh link.", code: "CITATION_LINK_EXPIRED" }
    : { error: "This citation link is not valid for this document.", code: "CITATION_LINK_INVALID" };
}
