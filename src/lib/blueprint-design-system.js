// BLUEPRINT DESIGN SYSTEM (shared partial) - extracted from
// legacy-monolith.js (MONOLITH_HELPER_MAP.md section 4, item 5). Navy/
// off-white/serif design proven live on weylandai.com's homepage
// (github.com/mobleysoft/weylandai.com index.html). Not yet wired into
// any monolith-served page - additive only, safe to deploy on its own.
// Reuses the already-published /assets/weyland-logo.png rather than
// duplicating the base64 blob here.
//
// Real, deliberate, documented as intentional at the point it was
// originally written (not accidental dead code) - kept as its own real
// module rather than deleted, since the original comment explicitly
// frames it as ready for future reuse. Confirmed zero references
// anywhere in src/ at extraction time (2026-09-11) - genuinely not
// wired in yet, exactly as documented.

export const BLUEPRINT_BODY_CSS = `
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font: 16px "Baskerville Old Face", "Times New Roman", serif;
      margin: 0;
      padding: 0;
      color: #fdfdf3;
      background-color: #000711;
    }
`;
// Header-specific rules are namespaced (bp- prefix, scoped under .bp-header)
// so wiring this into an existing legacy page can never collide with that
// page's own .brand/.nav/.button/etc classes reused elsewhere in its body -
// those keep their original styling untouched, exactly as the reskin plan
// requires ("leaving each page's real body content... completely untouched").
export const BLUEPRINT_HEADER_CSS = `
    a { color: inherit; text-decoration: none; }
    .bp-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px clamp(16px, 4vw, 32px);
      border-bottom: 2px solid #fdfdf3;
    }
    .bp-header .bp-brand { display: flex; align-items: center; justify-content: center; flex: 1; padding: 6px 0; gap: 12px; }
    .bp-header .bp-logo { width: clamp(160px, 42vw, 220px); height: auto; display: block; transform: translateY(-5.2%); }
    .bp-header .bp-subtitle { display: none; font: 700 15px/1.3 ui-monospace, "SF Mono", monospace; letter-spacing: .04em; color: #9299a3; white-space: nowrap; padding-left: 12px; border-left: 1px solid #454952; }
    .bp-nav { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; gap: 2px; background: #000711; border-bottom: 2px solid #fdfdf3; padding: 10px clamp(16px, 4vw, 32px) 16px; z-index: 10; }
    .bp-nav.bp-open { display: flex; }
    .bp-nav a { padding: 12px 8px; text-decoration: none; font-size: 16px; border-bottom: 1px solid #2a2c33; }
    .bp-nav a:last-of-type { border-bottom: 0; }
    .bp-nav a.bp-cta { margin-top: 8px; border: 1px solid #fdfdf3; border-radius: 4px; text-align: center; }
    @media (min-width: 700px) {
      .bp-header { justify-content: flex-start; }
      .bp-header .bp-brand { flex: 0 0 auto; justify-content: flex-start; padding: 0; }
      .bp-header .bp-logo { width: 180px; }
      .bp-header .bp-subtitle { display: block; }
      .bp-nav { display: flex !important; position: static; flex-direction: row; align-items: center; gap: 28px; margin-left: auto; background: transparent; border: 0; padding: 0; }
      .bp-nav a { border-bottom: 0; padding: 8px 2px; font-size: 15px; }
      .bp-nav a.bp-cta { margin-top: 0; padding: 9px 16px; }
    }
    @media (max-width: 699px) {
      body { padding: 0; }
      .bp-header { padding: 10px 16px; background: #000711; position: sticky; top: 0; }
    }
`;
export const BLUEPRINT_TOKENS_CSS = BLUEPRINT_BODY_CSS + BLUEPRINT_HEADER_CSS;
export const BLUEPRINT_NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/careers", label: "Careers" },
  { href: "/venturedeck", label: "Venture Deck" },
  { href: "/subscribe", label: "Start Free Trial", cta: true }
];
export function renderBlueprintHeader() {
  const links = BLUEPRINT_NAV_LINKS.map(
    (l) => `<a href="${l.href}"${l.cta ? ' class="bp-cta"' : ""}>${l.label}</a>`
  ).join("\n      ");
  return `<header class="bp-header">
    <a class="bp-brand" id="bp-brand-link" href="/" aria-label="WeylandAI home" aria-haspopup="true" aria-expanded="false" aria-controls="bp-site-nav">
      <img class="bp-logo" src="/assets/weyland-logo.png" alt="WeylandAI">
      <span class="bp-subtitle">Autonomous Construction Systems</span>
    </a>
    <nav class="bp-nav" id="bp-site-nav" aria-label="Primary">
      ${links}
    </nav>
  </header>
  <script>
    (function () {
      var brand = document.getElementById('bp-brand-link');
      var nav = document.getElementById('bp-site-nav');
      var mq = window.matchMedia('(min-width: 700px)');
      brand.addEventListener('click', function (e) {
        if (mq.matches) return;
        e.preventDefault();
        var open = nav.classList.toggle('bp-open');
        brand.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (mq.matches) return;
        if (!nav.classList.contains('bp-open')) return;
        if (e.target === brand || brand.contains(e.target) || nav.contains(e.target)) return;
        nav.classList.remove('bp-open');
        brand.setAttribute('aria-expanded', 'false');
      });
    })();
  </script>`;
}
