// weyland-platform-worker/src/routes/login-page.js
//
// Self-contained fork of ../../../src/routes/login-page.js, copied
// verbatim. GET /login - the real sign-in page, built on the AuthFor
// SDK (authfor.com), same-origin redirect validation preserved exactly
// (open-redirect fix kept intact).
//
// Original header follows, preserved for provenance:
//
/**
 * @param {object} router
 */
export function registerLoginPageRoutes(router) {
  router.get("/login", async (request2, env2) => {
    // Real identity provider is AuthFor (conglomerate-wide), not Ron's
    // onamerica Fleet Auth - that service is invite-only for the weyland
    // venture ("No account found... registration closed") and disconnected
    // from the users Stripe checkout actually provisions. This page uses the
    // already-shipped AuthForStandard SDK, then hands the resulting token to
    // /api/billing/checkout/status or direct API calls via Authorization
    // header (authenticate() bridges AuthFor -> local users row by email).
    //
    // Visual design (2026-09-06): rebuilt using Ron's onamerica.org color
    // scheme and simplified landing-plus-auth-card layout - John's explicit
    // call after comparing both ("use his color scheme ... slight
    // improvements"), NOT his auth backend, which stays AuthFor/Stripe as
    // above. WeylandAI's own real logo replaces the plain "Weyland" text
    // wordmark, and the copy is pulled from this page's own real product
    // description rather than Ron's door/hardware-specific persona text.
    const url = new URL(request2.url);
    const rawRedirect = url.searchParams.get("redirect") || "/subx";
    // Same-origin only - a bare query param here was an open-redirect vector
    // (location.assign() below would happily send a just-authenticated user
    // to an attacker's domain via ?redirect=https://evil.example/phish).
    const redirect = /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : "/subx";
    const html = `<!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign In | WeylandAI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">
  <style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--navy:#0a1628;--navy-mid:#0f1e35;--navy-light:#132240;--navy-surface:#1a2f50;--gold:#c9a227;--gold-light:#d4b440;--text:#dce3f0;--text-mid:#8a9bb5;--text-dim:#4d6384;--border:#1e3454;--radius:10px}
  html{font-size:16px}
  body{font-family:'Barlow',sans-serif;background:var(--navy);color:var(--text);min-height:100dvh;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2.5rem;padding:2rem 1rem}
  .brand{display:block;text-align:center;margin-bottom:1.4rem}
  .brand img{width:clamp(140px,32vw,180px);height:auto;display:inline-block}
  .landing{width:480px;max-width:90vw}
  .kicker{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 .6rem}
  .headline{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:clamp(1.8rem,4vw,2.4rem);line-height:1.1;margin:0 0 .9rem}
  .lede{color:var(--text-mid);font-size:1rem;line-height:1.5;margin-bottom:1.2rem}
  .facts{list-style:none;font-size:.85rem;color:var(--text-mid);line-height:1.9}
  .facts li::before{content:"— "}
  .auth-card{background:var(--navy-mid);border:1px solid var(--border);border-radius:12px;padding:2.2rem;width:400px;max-width:90vw;box-shadow:0 25px 80px rgba(0,0,0,0.4);border-left:4px solid var(--gold)}
  #status{text-align:center;color:var(--text-mid);font:700 11px/1.6 ui-monospace,monospace;letter-spacing:.06em;margin-bottom:1rem}
  #login-ui{min-height:40px}
  #forgot-wrap{text-align:center;margin-top:.9rem;display:none}
  #forgot-link{color:var(--text-mid);font-size:.8rem;text-decoration:underline}
  @media (max-width:900px){.landing{order:-1;text-align:center}}
  </style>
  </head>
  <body>
    <section class="landing">
      <a class="brand" href="/"><img class="logo" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MzYgMTQ1IiB3aWR0aD0iNTM2IiBoZWlnaHQ9IjE0NSI+CiAgPHRpdGxlPldleWxhbmRBSSB3b3JkbWFyayDigJQgcmVhbCB2ZWN0b3IgdHJhY2UsIHJlY29sb3JlZCBiYWRnZTwvdGl0bGU+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUzNiIgaGVpZ2h0PSIxNDUiIHJ4PSIyMCIgZmlsbD0iIzJBNTJGRiIvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI4LDI4KSI+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMi45LDUpIHNjYWxlKDEsMS4xMTkpIHRyYW5zbGF0ZSgyLjksLTUpIj4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsOS4yKSB0cmFuc2xhdGUoNTgsNjYuMykgc2NhbGUoMS4xNSkgdHJhbnNsYXRlKC01OCwtNjYuMykiPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsODkuMDAwMDAwKSBzY2FsZSgwLjEwMDAwMCwtMC4xMDAwMDApIiBmaWxsPSIjRkZENDAwIiBzdHJva2U9Im5vbmUiPgogICAgICA8cGF0aCBkPSJNNTAgODAxIGMwIC0zMyA0IC00MCAyNSAtNDUgMTggLTUgMjcgLTE3IDM1IC00OSAxMyAtNDUgMTkgLTY1IDgwCi0yNjIgNDUgLTE0OCA0NSAtMTQ1IDI2IC0xNDUgLTkgMCAtMTYgMTQgLTE4IDM4IC02IDQ3IC01OCAyMjQgLTY5IDIzNyAtNSA1Ci05IC01MSAtOSAtMTMzIDAgLTEzNSAtMSAtMTQyIC0yMCAtMTQyIC0xNiAwIC0yMCAtNyAtMjAgLTM0IGwwIC0zNCA3MiAtNApjNDAgLTIgMTI2IC0yIDE5MCAwIGwxMTcgNCA0MCAxMjIgYzIxIDY2IDQ3IDE0NyA1NiAxNzkgOSAzMSAxOSA1NyAyMyA1NyA0IDAKMzIgLTgwIDYzIC0xNzggbDU3IC0xNzcgMTI4IC01IGM3MSAtMyAxNTUgLTQgMTg3IC0yIGw1NyA1IDAgMzMgYzAgMjcgLTQgMzQKLTIwIDM0IC0xOSAwIC0yMCA3IC0yMCAxNDcgMCA4MCAtMyAxNDMgLTcgMTQwIC0xMiAtMTMgLTcyIC0yMjIgLTczIC0yNTQgMAotMjMgLTUgLTMzIC0xNSAtMzMgLTggMCAtMTUgNSAtMTUgMTIgMCA5IDQ1IDE1OCAxMjEgNDA1IDcgMjEgMTkgMzUgNDAgNDIgMjUKOCAyOSAxNSAyOSA0NSBsMCAzNiAtMTU1IDAgLTE1NSAwIDAgLTQwIGMwIC0zMSA0IC00MCAxOCAtNDAgNDMgLTEgNDQgLTExIDExCi0xNTEgLTE3IC03NCAtMzUgLTE0MCAtMzggLTE0NyAtNiAtMTEgLTc1IDE5NiAtMTEzIDM0MSBsLTEwIDM3IC04NyAwIC04NiAwCi02MCAtMTk3IC01OSAtMTk2IC0xNyA1OSBjLTYwIDIxMyAtNjMgMjQ2IC0yOSAyNTQgMjAgNSAyNiAxMyAyOCA0MyBsMyAzNwotMTU1IDAgLTE1NiAwIDAgLTM5eiIvPgogICAgPC9nPgogICAgPC9nPgogICAgPC9nPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwyLjUpIj4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuMDAwMDAwLDg5LjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSIgZmlsbD0iI0Y1RjdGQSIgc3Ryb2tlPSJub25lIj4KICAgICAgPHBhdGggZD0iTTIxMDAgNTM1IGwwIC0zMDUgNjUgMCA2NSAwIDAgMzA1IDAgMzA1IC02NSAwIC02NSAwIDAgLTMwNXoiLz4KICAgICAgPHBhdGggZD0iTTM2MTAgNzI5IGMwIC05OCAtMiAtMTA5IC0xNSAtOTYgLTI1IDI2IC04NCA0MCAtMTM4IDM0IC0xMTEgLTE0Ci0xNzIgLTk1IC0xNzEgLTIyNyAwIC0xMTQgNDMgLTE4MyAxMzMgLTIxNSA2MSAtMjEgOTkgLTE5IDE1MCAxMCA1MiAzMCA1MSAzMAo1MSA3IDAgLTE2IDcgLTE4IDU4IC0xNiBsNTcgMyAzIDMwNSAyIDMwNiAtNjUgMCAtNjUgMCAwIC0xMTF6IG0tMjcgLTE5MCBjMjMKLTI1IDI3IC0zOCAyNyAtOTAgMCAtOTMgLTMyIC0xMzkgLTk3IC0xMzkgLTExMSAwIC0xNDMgMjEwIC0zOSAyNTYgNDEgMTggNzUKMTAgMTA5IC0yN3oiLz4KICAgICAgPHBhdGggZD0iTTEzMzUgNjY1IGMtNSAtMiAtMjIgLTYgLTM4IC05IC00MSAtOSAtMTAzIC03MSAtMTIzIC0xMjIgLTI2IC02NwotMTUgLTE3MyAyMiAtMjI3IDkwIC0xMzAgMzA4IC0xMjQgMzgyIDEwIGwyMiA0MSAtNDMgNiBjLTUxIDggLTcwIDIgLTEwMyAtMzAKLTI2IC0yNyAtOTcgLTMzIC0xMjYgLTEwIC0yMiAxNiAtNDkgNjcgLTQyIDc4IDMgNCA3NCA4IDE1OSA4IDkxIDAgMTU2IDQgMTYwCjEwIDMgNSAxIDM2IC00IDY3IC0yMSAxMTAgLTk3IDE3OCAtMjA0IDE4MSAtMjkgMCAtNTYgLTEgLTYyIC0zeiBtODkgLTk1IGMyMQotOCA1NiAtNTQgNTYgLTc1IDAgLTMgLTQzIC01IC05NSAtNSAtODUgMCAtOTUgMiAtOTUgMTggMCAxMCAxMCAyOCAyMyAzOSAzNgozMyA2OCA0MCAxMTEgMjN6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yNDQ1IDY2NCBjLTc4IC0xOSAtMTM1IC03MSAtMTM1IC0xMjMgMCAtMTkgNSAtMjEgNjAgLTIxIDU0IDAgNjEgMgo2OSAyNCAxMSAyOCAyOSAzNiA4MSAzNiAzOCAwIDcwIC0yMCA3MCAtNDMgLTEgLTI4IC0yMiAtMzkgLTEwNiAtNTIgLTQ5IC04Ci0xMDYgLTIyIC0xMjYgLTMxIC02NiAtMjkgLTg2IC0xMTUgLTQzIC0xODEgMjAgLTI5IDg4IC02MyAxMzAgLTYzIDM2IDAgMTIyCjI1IDE0MSA0MSAxMSA5IDE0IDggMTQgLTQgMCAtMTIgMTUgLTE2IDYzIC0xOSAzNCAtMiA2MiAtNCA2MyAtMyAwIDAgLTIgNzkKLTYgMTc1IC03IDE5NiAtMTMgMjE1IC03OCAyNDYgLTM2IDE3IC0xNTYgMjggLTE5NyAxOHogbTE0MiAtMjgxIGMtMTEgLTcwCi04OSAtMTA2IC0xNDUgLTY3IC0yNSAxNyAtMjggNDIgLTkgNjcgMTIgMTcgNzQgMzQgMTMxIDM2IDI4IDEgMjggMCAyMyAtMzZ6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yOTk2IDY2MCBjLTE2IC01IC0zOSAtMTkgLTUyIC0zMSBsLTI0IC0yMiAwIDI2IGMwIDI3IC0xIDI3IC02NSAyNwpsLTY1IDAgMCAtMjEzIGMwIC0xMTggMiAtMjE2IDQgLTIxOCAyIC0yIDM0IC0zIDY5IC0xIGw2NiA0IDMgMTUwIGMzIDE0NCA0CjE1MSAyNyAxNjkgMjcgMjIgNzkgMjUgMTA3IDUgMTcgLTEzIDE5IC0zMCAyMiAtMTcwIDQgLTE3MyAtMSAtMTY0IDgzIC0xNTgKbDQ5IDQgMCAxNjQgYzAgMTQ0IC0yIDE3MCAtMjAgMjAzIC0zMCA2MCAtMTE5IDg2IC0yMDQgNjF6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0xNjAwIDY1NyBjMCAtMiAzNiAtOTUgODEgLTIwOCA0NSAtMTEyIDgxIC0yMTQgODEgLTIyNiAwIC0xMyAtNwotMzQgLTE2IC00OCAtMTQgLTIxIC0yNCAtMjUgLTYxIC0yNSBsLTQ1IDAgMCAtNTAgMCAtNTAgNTUgMCBjNjQgMCAxMTAgMTcKMTQyIDUxIDEyIDEzIDYyIDEzMiAxMTIgMjY0IDQ5IDEzMiA5NCAyNTMgMTAwIDI2OCBsMTEgMjggLTY3IC0zIC02NiAtMyAtNDgKLTE0MCBjLTI2IC03NyAtNTAgLTEzMyAtNTMgLTEyNSAtMyA4IC0yNSA3MSAtNDkgMTQwIGwtNDQgMTI1IC02NiAzIGMtMzcgMgotNjcgMSAtNjcgLTF6Ii8+CiAgICA8L2c+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtOS4zLDApIj4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4OS44LDUpIHNjYWxlKDEsMS4xMTU4KSB0cmFuc2xhdGUoLTM4OS44LC01KSI+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzODkuOCw1KSBzY2FsZSgxLjE1KSB0cmFuc2xhdGUoLTM4OS44LC01KSI+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCw4OS4wMDAwMDApIHNjYWxlKDAuMTAwMDAwLC0wLjEwMDAwMCkiIGZpbGw9IiNGNUY3RkEiIHN0cm9rZT0ibm9uZSI+CiAgICAgIDxwYXRoIGQ9Ik00MTMwIDgxOCBjLTYwIC0xMzkgLTIzNyAtNTg5IC0yMzIgLTU5MSA0IC0yIDM4IC0zIDc3IC0zIDc2IDEgNzUgMAoxMDkgODkgbDE1IDM3IDEyNCAwIDEyMyAwIDI1IC02MiAyNCAtNjMgNzcgMCBjNDMgMCA3OCA0IDc4IDkgMCA0IC0zMSA4MyAtNjgKMTc1IC0zOCA5MSAtOTMgMjI2IC0xMjIgMjk5IGwtNTQgMTMyIC04MyAwIGMtNzcgMCAtODQgLTIgLTkzIC0yMnogbTEzOSAtMjU4CmMxNiAtNDEgMjcgLTc4IDI0IC04MiAtMiAtNSAtMzUgLTggLTc0IC04IC01MSAwIC02OSA0IC02OSAxMyAwIDEyIDMzIDEwMSA2MgoxNjcgMTIgMjkgOCAzNiA1NyAtOTB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik00NjAyIDUzMyBsMyAtMzA4IDczIDAgNzIgMCAwIDMwNyAwIDMwOCAtNzUgMCAtNzUgMCAyIC0zMDd6Ii8+CiAgICA8L2c+CiAgICA8L2c+CiAgICA8L2c+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K" alt="WeylandAI"></a>
      <p class="kicker">Construction document automation</p>
      <h1 class="headline">Turn drawings into bids, automatically.</h1>
      <p class="lede">SubX and TakeOffX read the drawings, PropX drafts the proposal, SightX visualizes the result - seven products from $199/mo standalone, or the full SubConP suite at $2,000/mo.</p>
      <ul class="facts">
        <li>Free trial available - no card required to explore.</li>
        <li>Sign-in is handled by AuthFor, the same identity provider used across the portfolio.</li>
      </ul>
    </section>
    <div class="auth-card">
      <div id="status">CHECKING IDENTITY...</div>
      <div id="login-ui"></div>
      <div id="forgot-wrap">
        <a href="#" id="forgot-link">Forgot password?</a>
      </div>
    </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com', loginUISelector: '#login-ui' });
    window.addEventListener('authfor-success', () => {
      document.getElementById('status').textContent = 'SIGNED IN — REDIRECTING...';
      location.assign("${redirect}");
    });
    document.getElementById('forgot-link').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Email on your WeylandAI account:');
      if (!email) return;
      try {
        await fetch('https://authfor.com/api/v1/password/reset-request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } catch (err) {}
      alert('If that email has an account, a reset link is on its way.');
    });
    auth.init().then((result) => {
      if (result.authenticated) {
        location.assign("${redirect}");
      } else {
        document.getElementById('status').textContent = 'SIGN IN OR CREATE AN ACCOUNT';
        document.getElementById('forgot-wrap').style.display = 'block';
      }
    });
  </script>
  </body>
  </html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
  });
}
