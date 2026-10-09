// tools/user-simulation/lib/api-answer.mjs
//
// g036: a journey that reads an API answer must fail cleanly when the answer is not what it
// expects (a 404 or an HTML page from a worker still propagating a deploy, a 5xx, a body that is
// not JSON, or JSON without the fields the journey uses), instead of crashing on undefined.
// apiAnswer() judges one answer; Journey.api() (journey-kit.mjs) fetches it in the page and
// records a named check. Pure, so it is tested without a browser (api-answer.test.mjs).

/** The value at a dotted path ("model.set.rows"), or undefined. */
export function at(value, dotted) {
  let v = value;
  for (const k of String(dotted).split(".")) {
    if (v == null || typeof v !== "object") return undefined;
    v = v[k];
  }
  return v;
}

/**
 * Judge one API answer.
 * @param {{status:number, contentType?:string, text?:string|null, error?:string|null}} answer
 * @param {{require?:string[], pick?:string}} [opts] require: dotted paths that must be present
 *   (not undefined or null); pick: the dotted path to return as value (default: the whole body).
 * @returns {{ok:boolean, value:any, problem:string|null, detail:object}}
 */
export function apiAnswer(answer, { require = [], pick = null } = {}) {
  const a = answer || {};
  const status = Number(a.status) || 0;
  const ct = String(a.contentType || "").split(";")[0].trim();
  const text = a.text == null ? "" : String(a.text);
  const detail = { status, content_type: ct || null, body: text.replace(/\s+/g, " ").slice(0, 200) };
  const fail = (problem) => ({ ok: false, value: null, problem, detail: { ...detail, problem } });
  if (a.error) return fail("the request failed: " + String(a.error).slice(0, 200));
  if (status < 200 || status >= 300) return fail("HTTP " + status + (status === 404 ? " (route missing: a deploy still propagating, or the wrong worker)" : ""));
  let body;
  try { body = JSON.parse(text); } catch (e) { return fail("the body is not JSON" + (/html/i.test(ct) || /^\s*</.test(text) ? " (an HTML page)" : "")); }
  const missing = require.filter((p) => at(body, p) == null);
  if (missing.length) return fail("the answer lacks " + missing.join(", "));
  return { ok: true, value: pick ? at(body, pick) : body, problem: null, detail };
}
