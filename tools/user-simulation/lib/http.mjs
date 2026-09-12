// lib/http.mjs
//
// Thin fetch wrapper shared by every product check. Deliberately NOT a
// generic HTTP client library - just enough to hit real weylandai.com
// (or a real venture worker directly, e.g. weyland-market-intelligence-
// worker at its own workers.dev URL is not used - the proxy routes on
// weylandai.com itself are exercised instead, since that's the real path
// a real customer/browser uses) and get back real status/body pairs for
// the checks to reason about.

export const BASE_URL = process.env.WEYLAND_BASE_URL || "https://weylandai.com";

// Real 1148KB architectural door-schedule PDF used by tonight's own
// EXTRACTION_PIPELINE_CUSTOMER_PATH.md investigation - the same exact
// fixture, reused rather than fabricating a new one, so this harness's
// extraction-quality finding is directly comparable to that doc's.
export const REAL_TEST_PDF = "/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf";
export const REAL_TEST_PDF_LARGE = "/Users/johnmobley/pdf/KAISER SUNSET.pdf";

/**
 * @param {string} path - absolute path (e.g. "/subx") or a full URL.
 * @param {object} [opts] - standard fetch() options.
 * @returns {Promise<{status:number, ok:boolean, text:string, json:object|null, headers:Headers, url:string, error:string|null}>}
 */
export async function httpFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, opts);
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* body already consumed or unreadable - text stays "" */
    }
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON - fine, plenty of real responses here are HTML */
      }
    }
    return { status: res.status, ok: res.ok, text, json, headers: res.headers, url, error: null };
  } catch (err) {
    return { status: 0, ok: false, text: "", json: null, headers: null, url, error: err.message };
  }
}

/** Builds a step-result record in the shape every check module returns. */
export function step(name, { method = "GET", path = "", status, ok, detail, evidence } = {}) {
  return {
    step: name,
    method,
    path,
    status: status ?? null,
    ok: !!ok,
    detail: detail || "",
    evidence: evidence === undefined ? null : evidence,
  };
}

/** Trims a possibly-huge evidence blob (HTML page, JSON body) to something reportable. */
export function trim(value, max = 800) {
  if (value == null) return value;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? s.slice(0, max) + `…[truncated, ${s.length} chars total]` : s;
}
