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
      <a class="brand" href="/"><img class="logo" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MzYgMTQ1IiB3aWR0aD0iNTM2IiBoZWlnaHQ9IjE0NSI+CiAgPHRpdGxlPldleWxhbmRBSSB3b3JkbWFyayDigJQgcmVhbCB2ZWN0b3IgdHJhY2UsIHJlY29sb3JlZCBiYWRnZTwvdGl0bGU+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUzNiIgaGVpZ2h0PSIxNDUiIHJ4PSIyMCIgZmlsbD0iIzJBNTJGRiIvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI4LDI4KSI+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCw4OS4wMDAwMDApIHNjYWxlKDAuMTAwMDAwLC0wLjEwMDAwMCkiIGZpbGw9IiNGRkQ0MDAiIHN0cm9rZT0ibm9uZSI+CiAgICAgIDxwYXRoIGQ9Ik01MCA4MDEgYzAgLTMzIDQgLTQwIDI1IC00NSAxOCAtNSAyNyAtMTcgMzUgLTQ5IDEzIC00NSAxOSAtNjUgODAKLTI2MiA0NSAtMTQ4IDQ1IC0xNDUgMjYgLTE0NSAtOSAwIC0xNiAxNCAtMTggMzggLTYgNDcgLTU4IDIyNCAtNjkgMjM3IC01IDUKLTkgLTUxIC05IC0xMzMgMCAtMTM1IC0xIC0xNDIgLTIwIC0xNDIgLTE2IDAgLTIwIC03IC0yMCAtMzQgbDAgLTM0IDcyIC00CmM0MCAtMiAxMjYgLTIgMTkwIDAgbDExNyA0IDQwIDEyMiBjMjEgNjYgNDcgMTQ3IDU2IDE3OSA5IDMxIDE5IDU3IDIzIDU3IDQgMAozMiAtODAgNjMgLTE3OCBsNTcgLTE3NyAxMjggLTUgYzcxIC0zIDE1NSAtNCAxODcgLTIgbDU3IDUgMCAzMyBjMCAyNyAtNCAzNAotMjAgMzQgLTE5IDAgLTIwIDcgLTIwIDE0NyAwIDgwIC0zIDE0MyAtNyAxNDAgLTEyIC0xMyAtNzIgLTIyMiAtNzMgLTI1NCAwCi0yMyAtNSAtMzMgLTE1IC0zMyAtOCAwIC0xNSA1IC0xNSAxMiAwIDkgNDUgMTU4IDEyMSA0MDUgNyAyMSAxOSAzNSA0MCA0MiAyNQo4IDI5IDE1IDI5IDQ1IGwwIDM2IC0xNTUgMCAtMTU1IDAgMCAtNDAgYzAgLTMxIDQgLTQwIDE4IC00MCA0MyAtMSA0NCAtMTEgMTEKLTE1MSAtMTcgLTc0IC0zNSAtMTQwIC0zOCAtMTQ3IC02IC0xMSAtNzUgMTk2IC0xMTMgMzQxIGwtMTAgMzcgLTg3IDAgLTg2IDAKLTYwIC0xOTcgLTU5IC0xOTYgLTE3IDU5IGMtNjAgMjEzIC02MyAyNDYgLTI5IDI1NCAyMCA1IDI2IDEzIDI4IDQzIGwzIDM3Ci0xNTUgMCAtMTU2IDAgMCAtMzl6Ii8+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCw4OS4wMDAwMDApIHNjYWxlKDAuMTAwMDAwLC0wLjEwMDAwMCkiIGZpbGw9IiNGNUY3RkEiIHN0cm9rZT0ibm9uZSI+CiAgICAgIDxwYXRoIGQ9Ik0yMTAwIDUzNSBsMCAtMzA1IDY1IDAgNjUgMCAwIDMwNSAwIDMwNSAtNjUgMCAtNjUgMCAwIC0zMDV6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0zNjEwIDcyOSBjMCAtOTggLTIgLTEwOSAtMTUgLTk2IC0yNSAyNiAtODQgNDAgLTEzOCAzNCAtMTExIC0xNAotMTcyIC05NSAtMTcxIC0yMjcgMCAtMTE0IDQzIC0xODMgMTMzIC0yMTUgNjEgLTIxIDk5IC0xOSAxNTAgMTAgNTIgMzAgNTEgMzAKNTEgNyAwIC0xNiA3IC0xOCA1OCAtMTYgbDU3IDMgMyAzMDUgMiAzMDYgLTY1IDAgLTY1IDAgMCAtMTExeiBtLTI3IC0xOTAgYzIzCi0yNSAyNyAtMzggMjcgLTkwIDAgLTkzIC0zMiAtMTM5IC05NyAtMTM5IC0xMTEgMCAtMTQzIDIxMCAtMzkgMjU2IDQxIDE4IDc1CjEwIDEwOSAtMjd6Ii8+CiAgICAgIDxwYXRoIGQ9Ik00MTMwIDgxOCBjLTYwIC0xMzkgLTIzNyAtNTg5IC0yMzIgLTU5MSA0IC0yIDM4IC0zIDc3IC0zIDc2IDEgNzUgMAoxMDkgODkgbDE1IDM3IDEyNCAwIDEyMyAwIDI1IC02MiAyNCAtNjMgNzcgMCBjNDMgMCA3OCA0IDc4IDkgMCA0IC0zMSA4MyAtNjgKMTc1IC0zOCA5MSAtOTMgMjI2IC0xMjIgMjk5IGwtNTQgMTMyIC04MyAwIGMtNzcgMCAtODQgLTIgLTkzIC0yMnogbTEzOSAtMjU4CmMxNiAtNDEgMjcgLTc4IDI0IC04MiAtMiAtNSAtMzUgLTggLTc0IC04IC01MSAwIC02OSA0IC02OSAxMyAwIDEyIDMzIDEwMSA2MgoxNjcgMTIgMjkgOCAzNiA1NyAtOTB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik00NjAyIDUzMyBsMyAtMzA4IDczIDAgNzIgMCAwIDMwNyAwIDMwOCAtNzUgMCAtNzUgMCAyIC0zMDd6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0xMzM1IDY2NSBjLTUgLTIgLTIyIC02IC0zOCAtOSAtNDEgLTkgLTEwMyAtNzEgLTEyMyAtMTIyIC0yNiAtNjcKLTE1IC0xNzMgMjIgLTIyNyA5MCAtMTMwIDMwOCAtMTI0IDM4MiAxMCBsMjIgNDEgLTQzIDYgYy01MSA4IC03MCAyIC0xMDMgLTMwCi0yNiAtMjcgLTk3IC0zMyAtMTI2IC0xMCAtMjIgMTYgLTQ5IDY3IC00MiA3OCAzIDQgNzQgOCAxNTkgOCA5MSAwIDE1NiA0IDE2MAoxMCAzIDUgMSAzNiAtNCA2NyAtMjEgMTEwIC05NyAxNzggLTIwNCAxODEgLTI5IDAgLTU2IC0xIC02MiAtM3ogbTg5IC05NSBjMjEKLTggNTYgLTU0IDU2IC03NSAwIC0zIC00MyAtNSAtOTUgLTUgLTg1IDAgLTk1IDIgLTk1IDE4IDAgMTAgMTAgMjggMjMgMzkgMzYKMzMgNjggNDAgMTExIDIzeiIvPgogICAgICA8cGF0aCBkPSJNMjQ0NSA2NjQgYy03OCAtMTkgLTEzNSAtNzEgLTEzNSAtMTIzIDAgLTE5IDUgLTIxIDYwIC0yMSA1NCAwIDYxIDIKNjkgMjQgMTEgMjggMjkgMzYgODEgMzYgMzggMCA3MCAtMjAgNzAgLTQzIC0xIC0yOCAtMjIgLTM5IC0xMDYgLTUyIC00OSAtOAotMTA2IC0yMiAtMTI2IC0zMSAtNjYgLTI5IC04NiAtMTE1IC00MyAtMTgxIDIwIC0yOSA4OCAtNjMgMTMwIC02MyAzNiAwIDEyMgoyNSAxNDEgNDEgMTEgOSAxNCA4IDE0IC00IDAgLTEyIDE1IC0xNiA2MyAtMTkgMzQgLTIgNjIgLTQgNjMgLTMgMCAwIC0yIDc5Ci02IDE3NSAtNyAxOTYgLTEzIDIxNSAtNzggMjQ2IC0zNiAxNyAtMTU2IDI4IC0xOTcgMTh6IG0xNDIgLTI4MSBjLTExIC03MAotODkgLTEwNiAtMTQ1IC02NyAtMjUgMTcgLTI4IDQyIC05IDY3IDEyIDE3IDc0IDM0IDEzMSAzNiAyOCAxIDI4IDAgMjMgLTM2eiIvPgogICAgICA8cGF0aCBkPSJNMjk5NiA2NjAgYy0xNiAtNSAtMzkgLTE5IC01MiAtMzEgbC0yNCAtMjIgMCAyNiBjMCAyNyAtMSAyNyAtNjUgMjcKbC02NSAwIDAgLTIxMyBjMCAtMTE4IDIgLTIxNiA0IC0yMTggMiAtMiAzNCAtMyA2OSAtMSBsNjYgNCAzIDE1MCBjMyAxNDQgNAoxNTEgMjcgMTY5IDI3IDIyIDc5IDI1IDEwNyA1IDE3IC0xMyAxOSAtMzAgMjIgLTE3MCA0IC0xNzMgLTEgLTE2NCA4MyAtMTU4Cmw0OSA0IDAgMTY0IGMwIDE0NCAtMiAxNzAgLTIwIDIwMyAtMzAgNjAgLTExOSA4NiAtMjA0IDYxeiIvPgogICAgICA8cGF0aCBkPSJNMTYwMCA2NTcgYzAgLTIgMzYgLTk1IDgxIC0yMDggNDUgLTExMiA4MSAtMjE0IDgxIC0yMjYgMCAtMTMgLTcKLTM0IC0xNiAtNDggLTE0IC0yMSAtMjQgLTI1IC02MSAtMjUgbC00NSAwIDAgLTUwIDAgLTUwIDU1IDAgYzY0IDAgMTEwIDE3CjE0MiA1MSAxMiAxMyA2MiAxMzIgMTEyIDI2NCA0OSAxMzIgOTQgMjUzIDEwMCAyNjggbDExIDI4IC02NyAtMyAtNjYgLTMgLTQ4Ci0xNDAgYy0yNiAtNzcgLTUwIC0xMzMgLTUzIC0xMjUgLTMgOCAtMjUgNzEgLTQ5IDE0MCBsLTQ0IDEyNSAtNjYgMyBjLTM3IDIKLTY3IDEgLTY3IC0xeiIvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==" alt="WeylandAI"></a>
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
