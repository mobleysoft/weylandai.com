// weyland-cutsheetx-worker/src/routes/legal-pages.js
//
// WeylandAI's Terms of Service and Privacy Policy on weylandai.com itself
// (2026-10-07): GET /terms and GET /privacy (a trailing slash and ?embed=1 are
// the same page). Before, the footer and the create-account dialog sent
// visitors to consenta.cc in a new tab.
//
// One source for the text: consenta.cc's policy registry
// (consenta.cc/modules/policy-page.js, VENTURE_POLICIES["weylandai.com"]),
// where the documents were put by John's direction of 2026-10-03. This route
// reaches consenta-cc-worker through a service binding (CONSENTA, same
// account, no network hop) and answers with its page unchanged; the page's
// canonical link and its cross-links already point at weylandai.com/terms
// and /privacy. Being on this origin, the page can open inside the homepage
// shell's overlay (X-Frame-Options SAMEORIGIN, added for every answer of this
// worker) - inside a frame it hides its own home link.
//
// Why this worker: it serves the site's other public, no-account pages (the
// Finder and its sitemap). Changing the text is a consenta.cc deploy, not one
// of this worker.

export const LEGAL_DOCUMENTS = Object.freeze({
  terms: "Terms of Service",
  privacy: "Privacy Policy"
});

const SOURCE_ORIGIN = "https://consenta.cc";
const SUPPORT_EMAIL = "support@weylandai.com";

export function legalSourceUrl(type) {
  return SOURCE_ORIGIN + "/policy/weylandai.com/" + type;
}

function unavailablePage(type) {
  const title = LEGAL_DOCUMENTS[type];
  const source = legalSourceUrl(type);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | WeylandAI</title><meta name="robots" content="noindex">
<style>body{margin:0;background:#f6f4ef;color:#1c2a26;font:16px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif}main{max-width:640px;margin:0 auto;padding:2.5rem 1.25rem}a{color:#00695C}</style></head>
<body><main><h1>WeylandAI ${title}</h1>
<p>This page could not be loaded just now. The same text is at <a href="${source}" target="_blank" rel="noopener">${source}</a>.</p>
<p>Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. WeylandAI is operated by Argo LLC.</p></main></body></html>`;
}

async function fetchDocument(env, type) {
  const request = new Request(legalSourceUrl(type), { method: "GET", headers: { Accept: "text/html" } });
  if (env && env.CONSENTA && typeof env.CONSENTA.fetch === "function") return env.CONSENTA.fetch(request);
  return fetch(request);
}

export async function serveLegalDocument(request, env, type) {
  if (!LEGAL_DOCUMENTS[type]) return null;
  let upstream = null;
  try {
    upstream = await fetchDocument(env, type);
  } catch (e) {
    console.error("[legal-pages] source unreachable:", e && e.message);
  }
  const head = request.method === "HEAD";
  const ctype = upstream && upstream.ok ? String(upstream.headers.get("Content-Type") || "") : "";
  if (!upstream || !upstream.ok || ctype.indexOf("text/html") !== 0) {
    if (upstream) console.error("[legal-pages] source answered", upstream.status, ctype);
    return new Response(head ? null : unavailablePage(type), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" }
    });
  }
  const html = await upstream.text();
  return new Response(head ? null : html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }
  });
}

export function registerLegalRoutes(router) {
  for (const type of Object.keys(LEGAL_DOCUMENTS)) {
    const handler = (request, env) => serveLegalDocument(request, env, type);
    for (const path of ["/" + type, "/" + type + "/"]) {
      router.get(path, handler);
      router.addRoute("HEAD", path, handler);
    }
  }
}
