// weyland-huntx-worker/src/pages/huntx.js
//
// Serves HuntX's page (src/pages/huntx.html, imported as text - see
// wrangler.toml's [[rules]] block) at /huntx, /huntx/ and any query-string
// variant (/huntx?embed=1 from the single-page shell's overlay). The page
// itself used to live here as one escaped string ported from the
// monolith's marketing-pages.js; it moved to a real .html file on
// 2026-10-07 when the route became the wildcard weylandai.com/huntx* and
// the page gained guest access, server-side search paging and an honest
// REFRESH FROM SOURCES result.
//
// Nav: see ./huntx-nav.js.

import huntxHtml from "./huntx.html";
import { fillHuntxPage } from "./huntx-nav.js";

export function serve_huntx(request) {
  var embedded = false;
  try { embedded = new URL(request.url).searchParams.get("embed") === "1"; } catch (e) { embedded = false; }
  return new Response(fillHuntxPage(huntxHtml, embedded), {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" }
  });
}
