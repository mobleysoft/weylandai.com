// src/lib/sk-router.js
//
// Real SPA client-side router for weylandai.com — ported from the proven
// mechanism in SkeletonKing v2 (/Users/johnmobley/nginx/workers/venture-fleet/
// src/lib/skeletonking-v2.js), live today on filmline.cc and bloomagi.cc,
// not reinvented from scratch. Same real contract that module uses:
//
//   - A same-origin nav link carrying `data-sk-link` is intercepted on
//     click. Instead of a full page reload, the browser fetches the SAME
//     url with an `X-Skeletonking-Route: fragment` request header.
//   - The server (marketing-pages.js, for the routes that have been
//     migrated) answers that header with JSON ({title, meta, html,
//     script}) instead of a full HTML document, via extractOutletFragment
//     below, which pulls the already-rendered content back out of the
//     exact same HTML string the non-fragment path would have sent — no
//     separate "content-only" copy of any page is hand-maintained, so
//     there is no way for the two to drift apart.
//   - `script` is re-injected via a freshly created <script> element, not
//     `innerHTML` (which never executes injected <script> tags) — the
//     identical mechanic skeletonking-v2.js's shellRouterJs uses, and the
//     reason a migrated page's own interactive JS (e.g. pricing's
//     checkout-button wiring) keeps working identically whether this is
//     the first load or a client-routed swap.
//   - Real `history.pushState`/`popstate` wiring restores back/forward
//     navigation — the actual complaint this closes ("no navigation
//     back... needs to function as an SPA").
//   - If the server doesn't answer with the fragment contract (any page
//     not yet migrated), the router falls back to `window.location.href`
//     — a normal full navigation, byte-for-byte what every unmigrated
//     link already does today. This makes the rollout strictly additive:
//     adding `data-sk-link` to a nav anchor is only ever a no-op or an
//     improvement, never a regression, for any route this pass didn't
//     touch.
//
// Scope of this first real slice (2026-10-03): "/" and "/pricing" are the
// only two routes that actually answer the fragment contract today — see
// SPA_MIGRATION_PLAN.md for the full migration sequence for the rest.

export function skRouterScriptTag() {
  return `<script>
(function(){
  var outlet = document.getElementById('sk-outlet');
  if (!outlet) return;

  function runInjectedScript(src){
    if (!src) return;
    var s = document.createElement('script');
    s.textContent = src;
    outlet.appendChild(s);
  }

  async function loadRoute(path, push){
    try {
      var res = await fetch(path, { headers: { 'X-Skeletonking-Route': 'fragment' } });
      if (!res.ok || res.headers.get('X-Skeletonking-Route') !== 'fragment') { window.location.href = path; return; }
      var data = await res.json();
      outlet.innerHTML = data.html;
      document.title = data.title;
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && data.meta) metaDesc.setAttribute('content', data.meta);
      if (push) history.pushState({ path: path }, '', path);
      window.scrollTo(0, 0);
      runInjectedScript(data.script);
    } catch (e) { window.location.href = path; }
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest('[data-sk-link]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    var norm = href.replace(/\\/+$/, '') || '/';
    var here = location.pathname.replace(/\\/+$/, '') || '/';
    if (norm === here) { e.preventDefault(); return; }
    e.preventDefault();
    loadRoute(href, true);
  });
  window.addEventListener('popstate', function(){ loadRoute(location.pathname, false); });
})();
</script>`;
}

// Pulls {title, meta, html, script} back out of an already-rendered full
// HTML document string, by locating the <main id="sk-outlet">...</main>
// markers that wrap a migrated route's real content. Any inline
// <script>...</script> block inside that range is extracted into `script`
// (for re-injection, since innerHTML won't execute it) and stripped out of
// `html`. Scripts OUTSIDE the markers (the persistent shell chrome's own
// router script) are untouched, since they're outside the sliced range.
export function extractOutletFragment(fullHtml, title, meta) {
  const startMarker = '<main id="sk-outlet">';
  const endMarker = "</main>";
  const startIdx = fullHtml.indexOf(startMarker);
  const endIdx = fullHtml.lastIndexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { title, meta, html: "", script: "" };
  }
  let html = fullHtml.slice(startIdx + startMarker.length, endIdx);
  let script = "";
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (_, js) => {
    script += js + "\n";
    return "";
  });
  return { title, meta, html, script: script.trim() };
}
