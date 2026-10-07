// weyland-platform-worker/src/lib/site-policy.js
//
// 2026-10-07: what every response from this worker carries, the www host's
// redirect to the apex, and the crawl files (robots.txt and the sitemap index).
//
// Measured before this change: the homepage (proxied from MASCOM_EDGE), /pricing,
// /login and the /api/* answers sent no security header at all; www.weylandai.com
// was answered by a Cloudflare Tunnel origin with its own, different copy of the
// homepage; /robots.txt was a block of comments with no rule and no sitemap;
// /sitemap.xml listed 3 pages and not the finder's ~10,500.

export const APEX_ORIGIN = "https://weylandai.com";

export const SECURITY_HEADERS = Object.freeze({
  // One day to start (raise it once it has run clean for a while). No
  // includeSubDomains: other hosts on the zone are served elsewhere. No preload.
  "Strict-Transport-Security": "max-age=86400",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The shell's overlays frame this origin's own pages only.
  "X-Frame-Options": "SAMEORIGIN",
  // The MeetingX room opens inside the homepage overlay (a same-origin frame),
  // so camera and microphone stay available to this origin and its own frames
  // and to no other origin; nothing on the site asks for location.
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()"
});

/**
 * The same response with the security headers added. A header a route already
 * set is kept as it is. WebSocket upgrades pass through untouched.
 */
export function withSecurityHeaders(response) {
  if (!response || response.status === 101 || response.webSocket) return response;
  let out;
  try {
    out = new Response(response.body, response);
  } catch {
    return response;
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  return out;
}

/**
 * www.weylandai.com/<path>?<query> -> https://weylandai.com/<path>?<query>,
 * permanent. 301 for GET/HEAD, 308 for anything else so a method and body are
 * kept. (www.weylandai.com/venture.json has its own, more specific route to
 * the getventures worker and never reaches this one.)
 */
export function wwwRedirect(request) {
  const url = new URL(request.url);
  if (url.hostname !== "www.weylandai.com") return null;
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
  return new Response(null, {
    status,
    headers: { "Location": APEX_ORIGIN + url.pathname + url.search, "Cache-Control": "public, max-age=3600" }
  });
}

// The public pages a visitor can land on from a search result. The finder's
// product pages (/find, /find/<maker>/<model>) are listed by its own sitemap,
// /find/sitemap.xml (weyland-cutsheetx-worker). Every address here answered
// 200 with its own page on 2026-10-07; /sightx/ keeps its slash because
// /sightx redirects there.
export const PUBLIC_PAGES = Object.freeze(["/", "/pricing", "/news", "/sightx/", "/huntx", "/cutsheetx"]);

// Kept out of crawling: the APIs, sign-in and checkout landing views, and the
// private workspaces (each opens a signed-in or per-visitor workspace).
// "/subx" also covers /subx-app.
export const DISALLOWED_PATHS = Object.freeze([
  "/api/", "/login", "/subscribe", "/onboarding", "/progress",
  "/subx", "/takeoffx", "/propx-app", "/meetingx", "/meetx"
]);

export const SITEMAPS = Object.freeze([APEX_ORIGIN + "/sitemap-pages.xml", APEX_ORIGIN + "/find/sitemap.xml"]);

export const ROBOTS_TXT = [
  "# WeylandAI - " + APEX_ORIGIN + "/",
  "User-agent: *",
  "Allow: /",
  ...DISALLOWED_PATHS.map((p) => "Disallow: " + p),
  "",
  "Sitemap: " + APEX_ORIGIN + "/sitemap.xml",
  "Sitemap: " + APEX_ORIGIN + "/find/sitemap.xml",
  ""
].join("\n");

// Any other host this worker answers on (its *.workers.dev address) is a
// duplicate of the site: keep it out of search entirely.
export const ROBOTS_TXT_OTHER_HOST = "User-agent: *\nDisallow: /\n";

export const SITEMAP_INDEX_XML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  SITEMAPS.map((loc) => "  <sitemap><loc>" + loc + "</loc></sitemap>").join("\n") +
  "\n</sitemapindex>\n";

export const SITEMAP_PAGES_XML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  PUBLIC_PAGES.map((p) => "  <url><loc>" + APEX_ORIGIN + p + "</loc></url>").join("\n") +
  "\n</urlset>\n";

/** /robots.txt, /sitemap.xml and /sitemap-pages.xml; null for anything else. */
export function crawlResponse(url) {
  const cache = "public, max-age=3600";
  if (url.pathname === "/robots.txt") {
    const text = url.hostname === "weylandai.com" ? ROBOTS_TXT : ROBOTS_TXT_OTHER_HOST;
    return new Response(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cache } });
  }
  if (url.pathname === "/sitemap.xml") {
    return new Response(SITEMAP_INDEX_XML, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": cache } });
  }
  if (url.pathname === "/sitemap-pages.xml") {
    return new Response(SITEMAP_PAGES_XML, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": cache } });
  }
  return null;
}
