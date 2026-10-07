// weyland-shared/security-headers.js
//
// 2026-10-07: the security headers every WeylandAI product worker adds to its
// answers - the same set weyland-platform-worker sends since 890c684
// (its src/lib/site-policy.js; the test next to this file fails if the two
// sets drift apart). Before this, the product pages and APIs answered by their
// own workers (/find, /cutsheetx, /subx-app, /takeoffx, /huntx, /propx-app,
// /meetingx, /sightx/ and their /api/* routes) sent none, so another site could
// show them inside its own frame.
//
// Imported by each product worker (../../weyland-shared/security-headers.js);
// wrangler resolves the relative import when it deploys the worker, from its
// own directory or from GitHub Actions (the whole repository is checked out).

export const SECURITY_HEADERS = Object.freeze({
  // One day to start, as on the platform. No includeSubDomains: other hosts on
  // the zone are served elsewhere. No preload.
  "Strict-Transport-Security": "max-age=86400",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The homepage's single-page shell frames these pages from the same origin
  // (its overlay, ?embed=1); no other site may.
  "X-Frame-Options": "SAMEORIGIN",
  // MeetingX's room asks for the camera and microphone, standalone and inside
  // the homepage overlay (a same-origin frame); no other origin gets them.
  // Nothing on the site asks for location.
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()"
});

/**
 * The same response with the security headers added. A header the route set
 * itself is kept as it is. WebSocket upgrades (status 101, or a response that
 * carries a webSocket) pass through untouched.
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
 * A worker's default export with every fetch answer passed through
 * withSecurityHeaders. Other handlers (scheduled, queue, ...) are kept as they
 * are; an error the fetch handler throws still propagates.
 *
 *   export default secured({ async fetch(request, env, ctx) { ... } });
 */
export function secured(handler) {
  return {
    ...handler,
    async fetch(request, env, ctx) {
      return withSecurityHeaders(await handler.fetch(request, env, ctx));
    }
  };
}
