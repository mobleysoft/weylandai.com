// weyland-cutsheetx-worker/src/routes/cutsheetx-page.js
//
// The CutsheetX app page, served at every path variant a visitor or the
// single-page shell produces (2026-10-07).
//
// Why: the zone route used to be the exact pattern "weylandai.com/cutsheetx".
// An exact Cloudflare route pattern does not match the same path with a query
// string, so "/cutsheetx?embed=1" (what assets/weyland-shell.js loads in its
// overlay iframe) and the product nav's "/cutsheetx/" fell through to the
// monolith's catch-all, whose serve_cutsheetx() answers 302 -> /pricing. The
// route is now the wildcard "weylandai.com/cutsheetx*" (wrangler.toml) and this
// module answers the page paths it then receives. The router matches on the
// pathname only, so any query string (?embed=1, utm tags, ...) is served the
// same page. Any other /cutsheetx* path gets the router's ordinary 404 JSON,
// which is what the monolith answered for those paths before the wildcard.

export const CUTSHEETX_PAGE_PATHS = ["/cutsheetx", "/cutsheetx/", "/cutsheetx/index.html", "/cutsheetx.html"];

export function registerCutsheetxPageRoutes(router, html) {
  const serve = () => new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" },
  });
  for (const path of CUTSHEETX_PAGE_PATHS) router.get(path, serve);
}
