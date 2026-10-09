/* WeylandAI single-page shell (2026-10-06).
 *
 * One overlay hosts sign-in, the account, and the apps, so nothing on weylandai.com navigates
 * away and back. The account control is always visible and clickable (the homepage's own Sign In
 * buttons live on the 3D dossier and can be tiny or off-screen). After sign-in the page shows the
 * account, the server session cookie exists, and every homepage API call runs as that account.
 *
 * Contract other code can rely on:
 *   document.documentElement.dataset.weylandAuth = "signed-in" | "signed-out" | "no-account"
 *   document.documentElement.dataset.weylandUser = account email (when signed in)
 *   window.WeylandShell.open("signin" | "account" | "app" | "create", { path, continueTo, email })
 *   window.WeylandShell.open("pdf", { url, title, page, token })   one of our own /api/ document routes
 *   window.WeylandShell.open("pdf", { blob, title, page })         a PDF the page already holds (a Blob)
 *   window.WeylandShell.close(); window.WeylandShell.signOut()   (both resolve; no reloads). signOut()
 *     closes only the view that was open when it started, never one opened while it ran.
 *   window.WeylandShell.open("signin", { continueTo, email, mode: "code" })
 *     sign-in by password, or by a code AuthFor emails (POST authfor.com/api/v1/auth/magic-link, then
 *     /api/v1/auth/magic-link/verify). The code is the default on a browser that bought without a
 *     password (wa_signin_hint_v1). continueTo: an app path, "view:account" or "view:plans".
 *   window.WeylandShell.open("reset", { token, email })   choose a new password (AuthFor's
 *     /api/v1/password/reset-confirm), then signed in. The emailed link is /#/reset?token=...
 *   window.WeylandShell.open("plans")    choose a plan: Stripe's embedded form inside the overlay
 *   window.WeylandShell.open("account")  the account card: plan, access end date and days left,
 *     choose a plan, cancel at period end / resume, update the card (Stripe's Payment Element),
 *     invoices (each PDF drawn in the page)
 *   window.WeylandShell.state().access = { phase, kind, ends_at, days_left } or null
 *   Addresses opened at load and when followed or typed: #/reset?token=..., #/plans, #/account,
 *   #/signin (the views above; the fragment is dropped from the address at once), and #/<app path>.
 *   Events on window: "weyland-auth" {status, email}; "weyland-overlay" {open, view};
 *   "weyland-access" {phase, kind, ends_at, days_left} after every account load. <html> carries
 *   data-weyland-access = offer | offer-ending | trial | trial-ending | subscribed | ended |
 *   payment-failing | free while signed in. From day 23 of the $100 offer (8 days left) and in the
 *   last 3 days of a free trial the product prompts to choose a plan; when access has ended it says
 *   the paid tools are paused and the work is kept. Nothing is ever charged without a choice.
 *   window.WeylandShell.completeSignup(authforUpgradeResponse, { continueTo })
 *     -> Promise<state>: after the homepage's create-account dialog upgrades the guest identity at
 *        AuthFor, this signs the visitor in on the spot (AuthFor session kept like a sign-in,
 *        POST /api/auth/authfor-exchange creates the WeylandAI account + weyland_session cookie).
 *   The page provides window.__weylandOpenCreateAccount(continueTo) (its create-account dialog).
 *   Account control placement: the chip floats top right unless the page marks a slot with
 *   [data-wa-chip-slot]; then it sits in that slot (the slot's own children are hidden while it
 *   does), except while <html> carries data-wa-chip-float (the page's way of saying "the slot is
 *   out of view now": the homepage sets it while its dossier is lowered).
 *   Signed in also covers a weyland_session cookie without an AuthFor token (a purchase made
 *   without signing in signs the buyer in that way).
 *   Address of an open app: this page's own address with the app's path as its fragment, #<path>
 *   (the homepage with the Finder open is /#/find; a MeetingX room, /#/meetingx?room=ab12). A
 *   reload, a shared link or a typed address opens that app again over this page; Back closes it
 *   (or returns to the view before it) and Forward opens it again. The app's own address (/find)
 *   never goes into the address bar: it serves the standalone page, which stays as it is for
 *   visitors who arrive on it from outside.
 * Needs /assets/authfor-integration-standard.js (AuthForStandard) loaded first.
 */
(function () {
  "use strict";
  if (window.WeylandShell) return;
  var TOKEN_KEY = "_authfor_token";
  var REFRESH_KEY = "_authfor_refresh";
  var SESSION_KEY = "_authfor_session";
  var EPH_KEY = "weylandai_ephemeral_token_v1";
  var APPS = { "/subx-app": "SubX", "/subx": "SubX", "/takeoffx": "TakeOffX", "/cutsheetx": "CutsheetX", "/sightx": "SightX",
               "/propx-app": "PropX", "/meetingx": "MeetingX", "/meetx": "MeetingX", "/huntx": "HuntX", "/find": "Finder",
               "/pricing": "Plans and pricing", "/wire": "News", "/news": "News", "/terms": "Terms of Service", "/privacy": "Privacy Policy" };
  // The address an app is opened at when it differs from the link: /sightx answers 308 -> /sightx/
  // (the SightX worker's page lives at the slash path), and News (WireX) lives at /news (/wire is its
  // old name). Every other app opens at the path it was asked for.
  var CANON = { "/sightx": "/sightx/", "/wire": "/news" };
  function appKey(path) { return String(path || "").split("#")[0].split("?")[0].replace(/\/+$/, "") || "/"; }
  function canonicalApp(path) {
    var full = String(path || ""), at = full.indexOf("#");
    var p = at >= 0 ? full.slice(0, at) : full, hash = at >= 0 ? full.slice(at) : "";
    var q = p.indexOf("?");
    var key = appKey(p);
    return (CANON[key] || key) + (q >= 0 ? p.slice(q) : "") + hash;
  }
  function appName(p) { return APPS[appKey(p)] || APPS["/" + String(p || "").split("#")[0].split("?")[0].split("/")[1]] || "WeylandAI"; }
  function withEmbed(p) {
    var at = p.indexOf("#"), head = at >= 0 ? p.slice(0, at) : p, hash = at >= 0 ? p.slice(at) : "";
    return head + (head.indexOf("?") >= 0 ? "&" : "?") + "embed=1" + hash;
  }
  var root = document.documentElement;
  var S = { status: "unknown", user: null, ent: null, access: null, flash: null, overlay: null, body: null, title: null, banner: null,
            chip: null, sdk: null, view: null, seq: 0, appFrame: null, stepping: null, afterStep: [], cleanup: [], ready: null };

  var DAY = 86400000;
  var AUTHFOR = "https://authfor.com";
  var AF_CLIENT = "af_weyland_login", AF_VENTURE = "weylandai.com";
  // A browser that bought without signing in has an account with no password: its sign-in offers the
  // emailed code first, for that email ({ email, mode: "code", at }).
  var HINT_KEY = "wa_signin_hint_v1";
  // The reset token while its view is open (the address drops it at once; a reload keeps the view).
  var RESET_KEY = "wa_reset_token_v1";
  var DISMISS_KEY = "wa_access_dismissed_v1";
  // The $100 first submittal (one payment, 30 days of every product, no automatic charge).
  var OFFER_SKU = "weyland-first-submittal";
  // Plans a customer can choose in the account; prices come from GET /api/billing/catalog (Stripe).
  var PLAN_CHOICES = [
    { id: "weyland-subconp-seat", name: "SubConP suite", sub: "Every product: SubX, TakeOffX, CutsheetX, SightX, PropX, MeetingX and HuntX" },
    { id: "weyland-subx-seat", name: "SubX", sub: "Submittal packets from your door and hardware schedules" },
    { id: "weyland-takeoffx-seat", name: "TakeOffX", sub: "Door takeoffs from your schedules" },
    { id: "weyland-cutsheetx-seat", name: "CutsheetX", sub: "Catalogue matches with the page cited" },
    { id: "weyland-propx-seat", name: "PropX", sub: "Proposals priced from your schedule" },
    { id: "weyland-huntx-seat", name: "HuntX", sub: "Public bid opportunities" },
    { id: "weyland-meetingx-seat", name: "MeetingX", sub: "Project meeting rooms" },
    { id: "weyland-sightx-seat", name: "SightX", sub: "The jobsite in 3D" }
  ];
  var TIER_NAMES = { subconp: "SubConP suite", subx: "SubX", takeoffx: "TakeOffX", cutsheetx: "CutsheetX", propx: "PropX", huntx: "HuntX",
                     meetingx: "MeetingX", sightx: "SightX", starter: "Starter", free: "Free tools", wire: "WireX Pro" };
  // The payment owner's plan-management routes (plan/evidence/weylandai_contracts.md, fc:payments).
  var BILLING = {
    plan: "/api/billing/plan",
    cancel: "/api/billing/subscription/cancel",
    resume: "/api/billing/subscription/resume",
    setup: "/api/billing/payment-method/setup",
    setDefault: "/api/billing/payment-method/default",
    invoices: "/api/billing/invoices"
  };

  // ---------- the address of an open view ----------
  // An app open in the overlay is written into this page's own address as a fragment, #<app path>,
  // so a reload, a shared link or a typed address loads this same page and boot() opens the app
  // over it again. Not the app's own address (/find): that serves the standalone page, without
  // the shell. Not ?app= either: "/" with a query string is answered by the old site worker's
  // catch-all instead of the platform worker, and a fragment never reaches a server.
  // History entries the shell writes carry what Back, Forward and a reload need: wa (the view),
  // path, base (the address Close returns to), waUrl (the entry's own address), waDoc (pushed by
  // this document), waDepth (views above the base), waStep (history.length right after the push)
  // and waContig (only this document's own views between the entry and the base).
  var DOC_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function isAppHash(hash) { return /^#\//.test(hash || ""); }
  // This page's address without the open view: where closing it returns to.
  function baseAddress() {
    if (location.pathname === "/login") return "/";
    return location.pathname + location.search + (isAppHash(location.hash) ? "" : location.hash);
  }
  function addressOf(base, appPath) { return String(base || "/").split("#")[0] + "#" + appPath; }
  function dropParam(search, name) {
    var kept = String(search || "").replace(/^\?/, "").split("&").filter(function (kv) { return kv && kv.split("=")[0] !== name; });
    return kept.length ? "?" + kept.join("&") : "";
  }
  // A page an app view may show: this origin, under one of the apps' own paths (the overlay's
  // ?embed=1 dropped). Anything else (another site, an API route, the homepage) is refused.
  function appPathOf(p) {
    p = String(p || "");
    if (p.charAt(0) !== "/" || p.charAt(1) === "/" || p.charAt(1) === "\\") return null;
    var u;
    try { u = new URL(p, location.origin); } catch (e) { return null; }
    if (u.origin !== location.origin || !APPS["/" + u.pathname.split("/")[1]]) return null;
    return u.pathname + dropParam(u.search, "embed") + u.hash;
  }
  function appFromAddress() { return isAppHash(location.hash) ? appPathOf(location.hash.slice(1)) : null; }
  function copyState(st) { var o = {}; if (st && typeof st === "object") for (var k in st) o[k] = st[k]; return o; }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  function token() { return lsGet(TOKEN_KEY); }

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "onclick") n.addEventListener("click", attrs[k]);
      else if (k === "onsubmit") n.addEventListener("submit", attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: "same-origin" }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
    }).catch(function (e) { return { ok: false, status: 0, data: { error: String(e && e.message || e) } }; });
  }

  function sdk() {
    if (!S.sdk && window.AuthForStandard) {
      S.sdk = new window.AuthForStandard({ clientId: "af_weyland_login", ventureName: "weylandai.com", loginUISelector: "#wa-authfor-unused" });
    }
    return S.sdk;
  }

  function sameOriginPath(href) {
    if (!href || href.charAt(0) === "#") return null;
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return null;
      return u.pathname + u.search;
    } catch (e) { return null; }
  }
  function redirectTarget(href) {
    try {
      var u = new URL(href, location.href);
      var r = u.searchParams.get("redirect");
      return r && /^\/(?!\/)/.test(r) ? r : null;
    } catch (e) { return null; }
  }

  // ---------- styles ----------
  function injectStyles() {
    if (document.getElementById("wa-shell-css")) return;
    var css = [
      "#wa-account-chip{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;z-index:2147482000;display:inline-flex;align-items:center;gap:8px;",
      "padding:8px 14px;border-radius:999px;border:1px solid rgba(255,212,0,.65);background:rgba(10,18,32,.86);color:#f2f5fb;font:600 13px/1.2 inherit;",
      "letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 18px rgba(0,0,0,.35)}",
      "#wa-account-chip:hover,#wa-account-chip:focus-visible{border-color:#ffd400;outline:none;box-shadow:0 0 0 2px rgba(255,212,0,.35)}",
      "#wa-account-chip .wa-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#7c8aa5}",
      "#wa-account-chip .wa-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:16em}",
      "#wa-account-chip.wa-docked{position:relative;top:auto;right:auto;z-index:auto;min-width:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}",
      "[data-wa-chip-slot].wa-chip-docked>:not(#wa-account-chip){display:none!important}",
      "html[data-weyland-auth=signed-in] #wa-account-chip .wa-dot{background:#3ddc84}",
      "html[data-weyland-auth=no-account] #wa-account-chip .wa-dot{background:#ffb020}",
      "#wa-overlay{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;background:#060b16;color:#e9eef8;font-family:inherit}",
      "#wa-overlay.is-open{display:flex}",
      "#wa-overlay .wa-bar{display:flex;align-items:center;gap:12px;min-height:52px;padding:max(8px,env(safe-area-inset-top)) 14px 8px;border-bottom:1px solid rgba(255,255,255,.08)}",
      "#wa-overlay .wa-brand{font-weight:800;letter-spacing:.06em;color:#ffd400;text-transform:uppercase;font-size:13px;background:none;border:0;cursor:pointer;padding:6px 4px}",
      "#wa-overlay .wa-title{flex:1;font-weight:600;font-size:14px;color:#c9d3e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#wa-overlay .wa-close{background:none;border:1px solid rgba(255,255,255,.18);color:#e9eef8;border-radius:8px;padding:6px 12px;font:600 13px inherit;cursor:pointer}",
      "#wa-overlay .wa-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}",
      "#wa-overlay .wa-card{max-width:420px;margin:7vh auto 40px;padding:28px 24px;border:1px solid rgba(255,255,255,.1);border-left:4px solid #ffd400;border-radius:12px;background:#0d1729}",
      "#wa-overlay h2{font-size:22px;margin:0 0 6px;color:#fff}",
      "#wa-overlay p{color:#9fb0cc;font-size:14px;line-height:1.55;margin:0 0 16px}",
      "#wa-overlay label{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8b9bb7;margin:12px 0 6px}",
      "#wa-overlay input{width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #24324d;background:#070d19;color:#fff;font-size:16px}",
      "#wa-overlay input:focus{outline:none;border-color:#ffd400}",
      "#wa-overlay .wa-primary{width:100%;margin-top:18px;padding:13px;border:0;border-radius:8px;background:#ffd400;color:#0a1220;font-weight:800;letter-spacing:.04em;font-size:14px;cursor:pointer}",
      "#wa-overlay .wa-primary[disabled]{opacity:.6;cursor:progress}",
      "#wa-overlay .wa-secondary{width:100%;margin-top:10px;padding:12px;border-radius:8px;background:none;border:1px solid #2a3a58;color:#e9eef8;font-weight:600;cursor:pointer}",
      "#wa-overlay .wa-link{background:none;border:0;color:#8fb4ff;text-decoration:underline;cursor:pointer;padding:0;font:inherit}",
      "#wa-overlay .wa-error{display:none;margin-top:12px;color:#ff8a8a;font-size:13px;line-height:1.45}",
      "#wa-overlay .wa-row{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}",
      "#wa-overlay .wa-row span:first-child{color:#8b9bb7}",
      "#wa-overlay iframe{display:block;width:100%;height:100%;border:0;background:#fff}",
      "#wa-overlay .wa-pdf{min-height:100%;display:flex;flex-direction:column;background:#1b2130}",
      "#wa-overlay .wa-pdf-bar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:8px 12px;background:rgba(6,11,22,.97);border-bottom:1px solid rgba(255,255,255,.08)}",
      "#wa-overlay .wa-pdf-btn{min-width:44px;min-height:40px;background:none;border:1px solid rgba(255,255,255,.22);color:#e9eef8;border-radius:8px;padding:6px 12px;font-weight:600;font-size:13px;font-family:inherit;cursor:pointer}",
      "#wa-overlay .wa-pdf-btn[disabled]{opacity:.4;cursor:default}",
      "#wa-overlay .wa-pdf-page{min-width:8.5em;text-align:center;font-size:13px;color:#c9d3e6}",
      "#wa-overlay .wa-pdf-status{padding:14px;color:#9fb0cc;font-size:14px;line-height:1.5;text-align:center}",
      "#wa-overlay .wa-pdf-stage{flex:1;overflow-x:auto;padding:12px;text-align:center}",
      "#wa-overlay .wa-pdf-canvas{display:inline-block;vertical-align:top;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.45)}",
      "#wa-overlay iframe.wa-pdf-native{height:80vh}",
      "#wa-overlay .wa-card.wa-wide{max-width:640px}",
      "#wa-overlay .wa-note{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#111c30;color:#c9d3e6;font-size:13px;line-height:1.5}",
      "#wa-overlay .wa-note.wa-good{background:#0f2a1a;color:#8ee6ad}",
      "#wa-overlay .wa-note.wa-warn{background:#2a2207;color:#ffd666}",
      "#wa-overlay .wa-note.wa-bad{background:#2c1214;color:#ffb3b3}",
      "#wa-overlay .wa-or{display:flex;align-items:center;gap:10px;margin:16px 0 0;color:#6f7f9c;font-size:11px;letter-spacing:.1em;text-transform:uppercase}",
      "#wa-overlay .wa-or:before,#wa-overlay .wa-or:after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}",
      "#wa-overlay input.wa-code{letter-spacing:.3em;font:700 22px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center}",
      "#wa-overlay .wa-links{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 0;font-size:13px}",
      "#wa-overlay .wa-section{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}",
      "#wa-overlay .wa-section h3{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b9bb7}",
      "#wa-overlay .wa-muted{color:#8b9bb7;font-size:13px}",
      "#wa-overlay .wa-plan{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)}",
      "#wa-overlay .wa-plan strong{display:block;color:#fff;font-size:15px}",
      "#wa-overlay .wa-plan small{display:block;color:#8b9bb7;font-size:12px;line-height:1.4;margin-top:2px}",
      "#wa-overlay .wa-plan .wa-price{display:block;color:#e9eef8;font-weight:700;font-size:13px;margin-top:4px}",
      "#wa-overlay .wa-plan button{flex:none;min-height:40px;padding:8px 14px;border-radius:8px;border:1px solid #ffd400;background:none;color:#ffd400;font-weight:800;letter-spacing:.04em;cursor:pointer}",
      "#wa-overlay .wa-plan.wa-offer{border:1px solid rgba(255,212,0,.45);border-radius:10px;padding:12px;margin-bottom:6px}",
      "#wa-overlay .wa-mount{margin-top:14px;min-height:40px;border-radius:10px;overflow:hidden}",
      "#wa-overlay .wa-mount.wa-light{background:#fff;padding:6px}",
      "#wa-overlay .wa-inv{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}",
      "#wa-overlay .wa-inv button{flex:none;background:none;border:1px solid rgba(255,255,255,.22);color:#e9eef8;border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer;min-height:36px}",
      "#wa-overlay .wa-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
      "#wa-overlay .wa-actions button{flex:1 1 180px;margin-top:0;width:auto}",
      "#wa-overlay .wa-banner{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:9px 14px;background:#2a2207;color:#ffe9a6;font-size:13px;line-height:1.45;border-bottom:1px solid rgba(255,212,0,.35)}",
      "#wa-overlay .wa-banner.wa-ended{background:#2c1214;color:#ffd0d0;border-bottom-color:rgba(255,120,120,.35)}",
      "#wa-overlay .wa-banner span{flex:1 1 260px}",
      "#wa-overlay .wa-banner button,#wa-access-card .wa-go{flex:none;min-height:36px;padding:6px 12px;border-radius:8px;border:0;background:#ffd400;color:#0a1220;font-weight:800;letter-spacing:.04em;cursor:pointer;font-size:12px}",
      "#wa-access-card{position:fixed;left:12px;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:2147481000;max-width:420px;box-sizing:border-box;padding:14px 44px 14px 16px;border-radius:12px;",
      "border:1px solid rgba(255,212,0,.55);background:rgba(10,18,32,.97);color:#e9eef8;font:400 13px/1.5 inherit;box-shadow:0 10px 40px rgba(0,0,0,.45)}",
      "#wa-access-card.wa-ended{border-color:rgba(255,120,120,.6)}",
      "#wa-access-card p{margin:0 0 10px;color:#e9eef8;font-size:13px;line-height:1.5}",
      "#wa-access-card .wa-x{position:absolute;top:4px;right:4px;width:40px;height:40px;background:none;border:0;color:#9fb0cc;font-size:20px;line-height:1;cursor:pointer}",
      "html.wa-overlay-open #wa-access-card{display:none}",
      "@media (max-width:600px){#wa-access-card{left:8px;right:8px;max-width:none}}",
      "html.wa-overlay-open,html.wa-overlay-open body{overflow:hidden}",
      "html.wa-overlay-open footer,html.wa-overlay-open .site-footer{visibility:hidden}",
      "@media (prefers-reduced-motion:no-preference){#wa-overlay.is-open .wa-card{animation:wa-in .18s ease-out}}",
      "@keyframes wa-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"
    ].join("");
    document.head.appendChild(h("style", { id: "wa-shell-css", text: css }));
  }

  // ---------- account control ----------
  function renderChip() {
    if (!S.chip) {
      S.chip = h("button", { id: "wa-account-chip", type: "button", "aria-haspopup": "dialog", onclick: function () {
        open(S.status === "signed-in" || S.status === "no-account" ? "account" : "signin");
      } });
      placeChip();
      try { new MutationObserver(placeChip).observe(root, { attributes: true, attributeFilter: ["data-wa-chip-float"] }); } catch (e) {}
    }
    S.chip.textContent = "";
    S.chip.appendChild(h("span", { "class": "wa-dot", "aria-hidden": "true" }));
    var label = S.status === "signed-in" ? (S.user && S.user.email ? S.user.email.split("@")[0] : "Account")
      : S.status === "no-account" ? "Finish setup" : "Sign in";
    S.chip.appendChild(h("span", { "class": "wa-label", text: label }));
    S.chip.setAttribute("aria-label", S.status === "signed-in" ? "Account: " + (S.user && S.user.email || "") : label);
  }

  // The chip floats top right, or sits in the page's [data-wa-chip-slot] (see the header comment).
  // On the homepage that slot is in the dossier's footer bar, so the chip never covers the
  // dossier's own header controls ([close], the product tabs) on a phone.
  function placeChip() {
    if (!S.chip) return;
    var slot = root.hasAttribute("data-wa-chip-float") ? null : document.querySelector("[data-wa-chip-slot]");
    var parent = slot || document.body;
    var docked = document.querySelectorAll("[data-wa-chip-slot].wa-chip-docked");
    for (var i = 0; i < docked.length; i++) if (docked[i] !== slot) docked[i].classList.remove("wa-chip-docked");
    if (S.chip.parentNode !== parent) {
      var hadFocus = document.activeElement === S.chip;
      parent.appendChild(S.chip);
      if (hadFocus) { try { S.chip.focus({ preventScroll: true }); } catch (e) {} }
    }
    S.chip.classList.toggle("wa-docked", !!slot);
    if (slot) slot.classList.add("wa-chip-docked");
  }

  function relabelCtas() {
    var signedIn = S.status === "signed-in";
    var els = document.querySelectorAll(".js-upgrade-cta, a[href^='/login']");
    for (var i = 0; i < els.length; i++) {
      var a = els[i];
      if (a.closest("#wa-overlay")) continue;
      if (!a.hasAttribute("data-wa-label")) a.setAttribute("data-wa-label", a.textContent);
      var orig = a.getAttribute("data-wa-label");
      if (!signedIn) { if (a.textContent !== orig) a.textContent = orig; continue; }
      var t = orig.trim();
      var next = /^sign in to /i.test(t) ? t.replace(/^sign in to /i, "") : /^sign in( with authfor)?$/i.test(t) ? (t === t.toUpperCase() ? "ACCOUNT" : "Account") : orig;
      if (a.textContent !== next) a.textContent = next;
    }
  }

  // ---------- overlay ----------
  function ensureOverlay() {
    if (S.overlay) return;
    S.title = h("div", { "class": "wa-title" });
    S.body = h("div", { "class": "wa-body" });
    // The plan prompt for an app open in the overlay (see renderBanner): between the bar and the app.
    S.banner = h("div", { "class": "wa-banner", id: "wa-access-banner", role: "status", style: "display:none" });
    S.overlay = h("div", { id: "wa-overlay", role: "dialog", "aria-modal": "true", "aria-label": "WeylandAI" }, [
      h("div", { "class": "wa-bar" }, [
        h("button", { "class": "wa-brand", type: "button", text: "WeylandAI", onclick: function () { closeFromUi(); } }),
        S.title,
        h("button", { "class": "wa-close", type: "button", text: "Close", onclick: function () { closeFromUi(); } })
      ]),
      S.banner,
      S.body
    ]);
    document.body.appendChild(S.overlay);
    document.addEventListener("keydown", function (e) {
      if (!S.overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") { closeFromUi(); return; }
      if (S.view === "pdf" && S.pdf && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) {
        if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); S.pdf.go(1); }
        else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); S.pdf.go(-1); }
      }
    });
  }

  // Tell the page when the overlay opens or closes (the homepage pauses its 3D backdrop meanwhile);
  // html.wa-overlay-open carries the same state for CSS and observers.
  function announce(open) {
    try { window.dispatchEvent(new CustomEvent("weyland-overlay", { detail: { open: open, view: S.view } })); } catch (e) {}
  }

  // Whatever the previous view held that keeps working in the background (a pdf.js document, a
  // payment form, its event listener) stops here.
  function teardown() {
    if (S.pdf) { try { S.pdf.stop(); } catch (e) {} S.pdf = null; }
    S.appFrame = null;
    var fns = S.cleanup;
    S.cleanup = [];
    fns.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function show(title, node, viewName) {
    ensureOverlay();
    teardown();
    var wasOpen = S.overlay.classList.contains("is-open");
    S.view = viewName;
    S.seq += 1; // every view shown is a new one: work started for an earlier view checks this
    S.title.textContent = title;
    renderBanner();
    S.body.textContent = "";
    S.body.scrollTop = 0;
    S.body.appendChild(node);
    S.overlay.classList.add("is-open");
    root.classList.add("wa-overlay-open");
    // Focus now, never later: a delayed focus can yank the caret back into the first field while
    // someone (or a password manager, or an agent) is already filling the next one.
    var first = S.body.querySelector("input,button");
    if (first && viewName !== "app" && viewName !== "pdf" && !S.body.contains(document.activeElement)) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    if (!wasOpen) announce(true);
  }

  function hideOverlay() {
    if (!S.overlay) return;
    var wasOpen = S.overlay.classList.contains("is-open");
    teardown();
    S.overlay.classList.remove("is-open");
    root.classList.remove("wa-overlay-open");
    S.body.textContent = "";
    S.view = null;
    if (wasOpen) announce(false);
  }

  // An opened app or document gets its own history entry (Back closes it, Forward opens it again):
  // an app at #<its path> (appPath), a document at the current address. Closing puts the address
  // back to where the visitor was (query and a section #hash kept), not a bare "/".
  function record(state, appPath) {
    if (S.stepping) { S.afterStep.push(function () { record(state, appPath); }); return; }
    try {
      var cur = history.state;
      var ours = !!(cur && cur.wa && !cur.waClosed);
      if (!ours && location.pathname === "/login") history.replaceState(null, "", "/"); // Back never lands on /login
      var base = ours && cur.base ? cur.base : baseAddress();
      var url = appPath ? addressOf(base, appPath) : location.pathname + location.search + location.hash;
      state.base = base;
      state.waUrl = url;
      if (ours && cur.wa === "app" && state.wa === "app" && cur.path === state.path) {
        // The same app again (after the sign-in it asked for): this entry, not a second one.
        var same = copyState(cur);
        same.waUrl = url;
        history.replaceState(same, "", url);
        return;
      }
      var mine = ours && cur.waDoc === DOC_ID;
      state.waDoc = DOC_ID;
      state.waDepth = mine ? (cur.waDepth || 0) + 1 : 1;
      history.pushState(state, "", url);
      state.waStep = history.length;
      state.waContig = !ours || (mine && !!cur.waContig && history.length === cur.waStep + 1);
      history.replaceState(state, "", url);
    } catch (e) {}
  }

  // Closes whatever the overlay shows; the open view's entry becomes the base address in place.
  // Synchronous: a caller may change the address right after (a product page's "/#pricing" link).
  function close() {
    if (!S.overlay) return Promise.resolve();
    hideOverlay();
    var st = history.state;
    try {
      if (st && st.wa) history.replaceState(null, "", st.base || baseAddress());
      else if (location.pathname === "/login") history.replaceState(null, "", "/");
      else if (isAppHash(location.hash)) history.replaceState(st, "", baseAddress());
    } catch (e) {}
    return Promise.resolve();
  }

  // Close, the WeylandAI brand, Escape and "Back to the site": when every entry from the base up to
  // the open view was written by this page (and nothing came after it), step back to the base, so
  // Back afterwards leaves the page instead of doing nothing and Forward opens the view again.
  // Otherwise (a reload or a shared link opened the view, or the app's own pages added entries) as
  // close(). The address is the base at once either way.
  function closeFromUi() {
    if (!S.overlay) return Promise.resolve();
    var st = history.state;
    var n = st && st.wa && !st.waClosed && st.waDoc === DOC_ID && st.waContig && st.waDepth > 0 &&
      history.length === st.waStep && history.length < 50 && !S.stepping ? st.waDepth : 0;
    if (!n) return close();
    hideOverlay();
    var closed = copyState(st);
    closed.waClosed = true;
    try { history.replaceState(closed, "", st.base || baseAddress()); } catch (e) {}
    return stepBack(n);
  }

  // history.go() answers later (popstate): a view opened meanwhile records its entry after it.
  function stepBack(n) {
    return new Promise(function (resolve) {
      var timer = null;
      function done() {
        if (S.stepping !== done) return;
        S.stepping = null;
        clearTimeout(timer);
        var queued = S.afterStep;
        S.afterStep = [];
        queued.forEach(function (fn) { try { fn(); } catch (e) {} });
        resolve();
      }
      S.stepping = done;
      S.afterStep = [];
      timer = setTimeout(done, 3000);
      try { history.go(-n); } catch (e) { done(); }
    });
  }

  function open(view, opts) {
    opts = opts || {};
    if (view === "signin") return viewSignIn(opts.continueTo || null, opts.email || "", opts.mode || "");
    if (view === "account") return viewAccount();
    if (view === "plans") return viewPlans();
    if (view === "reset") return viewReset(opts.token || "", opts.email || "");
    if (view === "app") return viewApp(opts.path || "/subx-app");
    if (view === "pdf") return viewPdf(opts);
    if (view === "create") { if (S.status === "signed-in") return viewAccount(); close(); openCreateAccount(opts.continueTo || null); return Promise.resolve(); }
    return Promise.resolve();
  }

  function authforLogin(auth, em, pw) {
    return fetch("https://authfor.com/api/v1/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password: pw, client_id: auth.clientId, venture_id: auth.ventureName, redirect_url: auth.redirectUrl })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var msg = d.message || d.detail || d.error || "";
          if (r.status === 401) msg = "That email and password do not match an account.";
          throw new Error(msg || ("Sign-in failed (" + r.status + ")."));
        }
        if (d.mfa_required) { auth._mfaRequired = true; auth._mfaPending = d.mfa_token; return { mfa_required: true }; }
        return auth._processAuthResponse(d);
      });
    });
  }

  function errorBox() { return h("div", { "class": "wa-error", role: "alert" }); }
  function showError(box, msg) { box.textContent = msg; box.style.display = "block"; }

  // ---------- views ----------
  function validEmail(em) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(em || "")); }
  function noteBox(kind) { return h("div", { "class": "wa-note" + (kind ? " wa-" + kind : ""), role: "status", "aria-live": "polite", style: "display:none" }); }
  function say(box, msg, kind) {
    if (!box) return;
    box.textContent = msg || "";
    if (kind !== undefined) box.className = "wa-note" + (kind ? " wa-" + kind : "");
    box.style.display = msg ? "block" : "none";
  }

  // AuthFor's own API (sign-in codes, password reset): { ok, status, data }, never a throw.
  function authforCall(path, body) {
    return fetch(AUTHFOR + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d || {} }; }); })
      .catch(function (e) { return { ok: false, status: 0, data: { error: String((e && e.message) || e) } }; });
  }
  function authforMessage(res) {
    var d = (res && res.data) || {};
    var e = d.error;
    return String(d.message || d.detail || (e && typeof e === "object" ? e.message : e) || "");
  }
  // A sign-in answer from AuthFor (login, code, reset): kept exactly as a password sign-in keeps it.
  function keepLogin(data) {
    var auth = sdk();
    if (auth && typeof auth._processAuthResponse === "function") { auth._processAuthResponse(data); return; }
    lsSet(TOKEN_KEY, data.token);
    if (data.session_id) lsSet(SESSION_KEY, data.session_id);
    if (data.refresh_token) lsSet(REFRESH_KEY, data.refresh_token);
  }
  function signinHint() {
    try { var x = JSON.parse(lsGet(HINT_KEY) || "null"); return x && x.email ? x : null; } catch (e) { return null; }
  }
  function rememberCodeSignIn(email) {
    if (email) lsSet(HINT_KEY, JSON.stringify({ email: String(email).toLowerCase(), mode: "code", at: Date.now() }));
  }

  // Sign in with the password, or with a code AuthFor emails ("Email me a sign-in code"): the code is
  // the way in for an account that has no password (one made by a purchase) and the default on a
  // browser that bought without signing in. mode "code" opens on the code.
  function viewSignIn(continueTo, prefillEmail, mode, opts) {
    // opts.confirm: a signed-in account proves its email with a code (purchases made with that email
    // while signed out wait for it); same code flow, the email fixed.
    var confirm = !!(opts && opts.confirm && S.status === "signed-in" && S.user && S.user.email);
    if (confirm) { prefillEmail = S.user.email; mode = "code"; }
    else if (S.status === "signed-in") return continueTo ? continueAfter(continueTo) : viewAccount();
    // Signed in at AuthFor, no WeylandAI account yet: the next step is setting it up, not a password.
    if (S.status === "no-account") return viewNoAccount((S.user && S.user.email) || "", continueTo);
    var hint = signinHint();
    if (!prefillEmail && hint) prefillEmail = hint.email;
    if (!mode && hint && String(prefillEmail || "").toLowerCase() === hint.email) mode = hint.mode;
    var err = errorBox();
    var info = noteBox();
    var email = h("input", { id: "weyland-signin-email", type: "email", autocomplete: "email", required: "required", inputmode: "email" });
    if (prefillEmail) email.value = prefillEmail;
    var pass = h("input", { id: "weyland-signin-password", type: "password", autocomplete: "current-password", required: "required" });
    var mfaInput = h("input", { id: "weyland-signin-mfa", type: "text", inputmode: "numeric", autocomplete: "one-time-code" });
    var mfaWrap = h("div", { style: "display:none" }, [h("label", { "for": "weyland-signin-mfa", text: "Authenticator code" }), mfaInput]);
    var submit = h("button", { id: "weyland-signin-submit", "class": "wa-primary", type: "submit", text: "SIGN IN" });
    var pwPart = h("div", null, [h("label", { "for": "weyland-signin-password", text: "Password" }), pass, mfaWrap, submit]);
    var orLine = h("div", { "class": "wa-or", text: "or" });
    var codeBtn = h("button", { id: "weyland-signin-code-send", "class": "wa-secondary", type: "button", text: "EMAIL ME A SIGN-IN CODE" });
    var otp = h("input", { id: "weyland-signin-code", "class": "wa-code", type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "12", spellcheck: "false" });
    var otpSubmit = h("button", { id: "weyland-signin-code-submit", "class": "wa-primary", type: "submit", text: "SIGN IN WITH THE CODE" });
    var resend = h("button", { "class": "wa-link", type: "button", text: "Send a new code" });
    var otherEmail = h("button", { "class": "wa-link", type: "button", text: "Use a different email" });
    var codePart = h("div", { style: "display:none" }, [
      h("label", { "for": "weyland-signin-code", text: "Sign-in code from the email" }), otp, otpSubmit,
      h("div", { "class": "wa-links" }, [resend, otherEmail])
    ]);
    var toPassword = h("button", { id: "weyland-signin-use-password", "class": "wa-link", type: "button", text: "Use my password instead" });
    var toPasswordRow = h("div", { "class": "wa-links", style: "display:none" }, [toPassword]);
    var state = { mode: mode === "password" ? "password" : "code", pending: null, sentTo: "", mfa: false, inflight: false };

    function setMode(m) {
      state.mode = m;
      var code = m === "code";
      pwPart.style.display = code ? "none" : "block";
      orLine.style.display = code ? "none" : "flex";
      codeBtn.className = code ? "wa-primary" : "wa-secondary";
      codeBtn.style.display = code && state.pending ? "none" : "block";
      codePart.style.display = code && state.pending ? "block" : "none";
      toPasswordRow.style.display = code && !confirm ? "flex" : "none";
      otherEmail.style.display = confirm ? "none" : "";
      email.disabled = confirm || !!(code && state.pending);
    }
    function busy(btn, text) { state.inflight = true; btn.disabled = true; btn.setAttribute("data-label", btn.textContent); btn.textContent = text; }
    function idle(btn) { state.inflight = false; btn.disabled = false; if (btn.getAttribute("data-label")) btn.textContent = btn.getAttribute("data-label"); }

    function sendCode() {
      if (state.inflight) return;
      var em = email.value.trim();
      err.style.display = "none";
      if (!validEmail(em)) { showError(err, "Type your email, then choose Email me a sign-in code."); email.focus(); return; }
      busy(codeBtn, "SENDING THE CODE...");
      authforCall("/api/v1/auth/magic-link", { email: em, client_id: AF_CLIENT, venture_id: AF_VENTURE, purpose: confirm ? "verify" : "signin" }).then(function (res) {
        idle(codeBtn);
        if (!res.ok || !res.data.token || res.data.sent === false) {
          var m = authforMessage(res), wait = +res.data.retry_after || 0;
          showError(err, res.status === 429 ? "Too many codes were asked for just now. " + (wait ? "Wait " + (wait < 90 ? wait + " seconds" : Math.ceil(wait / 60) + " minutes") : "Wait a few minutes") + ", then send a new one."
            : res.status === 0 ? "The sign-in service could not be reached. Check the connection and try again."
            : res.status >= 500 || res.data.sent === false ? "The code could not be sent just now. Try again in a minute, or sign in with your password."
            : (m || "The code could not be sent (" + res.status + ")."));
          return;
        }
        state.pending = res.data.token;
        state.sentTo = em;
        otp.value = "";
        setMode("code");
        // AuthFor takes one code per address every resend_after seconds: the button waits as long.
        var gap = Math.max(0, Math.min(120, +res.data.resend_after || 30));
        resend.disabled = true;
        setTimeout(function () { resend.disabled = false; }, gap * 1000);
        say(info, "We emailed a sign-in code to " + em + ". It works for 15 minutes. If it has not arrived in a minute, check spam or send a new code.", "");
        try { otp.focus({ preventScroll: true }); } catch (e) {}
      });
    }
    function verifyCode() {
      if (state.inflight) return;
      var c = otp.value.replace(/[\s-]+/g, "");
      err.style.display = "none";
      if (!/^\d{4,10}$/.test(c)) { showError(err, "Type the code from the email (8 digits)."); otp.focus(); return; }
      busy(otpSubmit, "CHECKING THE CODE...");
      authforCall("/api/v1/auth/magic-link/verify", { token: state.pending, code: c }).then(function (res) {
        if (!res.ok || !res.data.token) {
          var m = authforMessage(res), code = String(res.data.code || "");
          var left = typeof res.data.attempts_left === "number" ? res.data.attempts_left : null;
          var wrongCode = "That code does not match the latest one sent to " + state.sentTo + "." + (left != null ? " " + left + " tr" + (left === 1 ? "y" : "ies") + " left." : "") + " Check the email, or send a new code.";
          throw new Error(code === "CODE_INVALID" ? wrongCode
            : code === "CODE_EXPIRED" || /expired|invalid sign-in request|request expired/i.test(m) ? "That code has expired or was replaced by a newer one. Send a new code."
            : res.status === 401 ? wrongCode
            : res.status === 429 ? "Too many tries. Wait a few minutes, then send a new code."
            : res.status === 0 ? "The sign-in service could not be reached. Try again."
            : (m || "The code could not be checked (" + res.status + ")."));
        }
        keepLogin(res.data);
        rememberCodeSignIn(state.sentTo);
        otpSubmit.textContent = "OPENING YOUR ACCOUNT...";
        var next = continueTo;
        if (res.data.password_removed) {
          S.flash = "Signed in with the emailed code. This email had not been confirmed before, so its old password was removed; to sign in with a password again, choose Forgot password.";
          if (!next || next === "/") next = "view:account";
        }
        return afterAuthFor(next, err, true);
      }).catch(function (e) { showError(err, (e && e.message) || "The code could not be checked."); })
        .then(function () { idle(otpSubmit); });
    }
    function passwordSignIn() {
      if (state.inflight) return; // one attempt at a time; a second submit never races the first
      err.style.display = "none";
      var em = email.value.trim(), pw = pass.value;
      if (!state.mfa && !validEmail(em)) { showError(err, "Enter the email your WeylandAI account uses."); email.focus(); return; }
      if (!state.mfa && !pw) { showError(err, "Enter your password, or choose Email me a sign-in code."); pass.focus(); return; }
      if (state.mfa && !mfaInput.value.trim()) { showError(err, "Enter the code from your authenticator app."); mfaInput.focus(); return; }
      var auth = sdk();
      if (!auth) { showError(err, "Sign-in is still loading. Try again in a second."); return; }
      state.inflight = true;
      var started = Date.now();
      var stage = "Checking your password";
      submit.disabled = true; email.disabled = true; pass.disabled = true;
      var tick = setInterval(function () {
        var secs = Math.round((Date.now() - started) / 1000);
        submit.textContent = stage.toUpperCase() + "... " + secs + "s";
        if (secs >= 25) showError(err, "This is taking longer than it should. You can wait, or close and try again.");
      }, 500);
      function done() { clearInterval(tick); state.inflight = false; submit.disabled = false; email.disabled = false; pass.disabled = false; submit.textContent = state.mfa ? "VERIFY CODE" : "SIGN IN"; }
      var p = state.mfa ? auth.verifyMFA(mfaInput.value.trim()) : authforLogin(auth, em, pw);
      Promise.resolve(p).then(function (res) {
        if (res && res.mfa_required) {
          state.mfa = true; mfaWrap.style.display = "block"; done();
          try { mfaInput.focus({ preventScroll: true }); } catch (e) {}
          return;
        }
        stage = "Opening your account";
        return afterAuthFor(continueTo, err);
      }).catch(function (e2) {
        var msg = (e2 && e2.message) || "Sign-in failed. Check the email and password.";
        showError(err, msg);
        if (/do not match/i.test(msg)) {
          // An account made by a purchase has no password: the emailed code is its way in.
          err.appendChild(document.createTextNode(" No password yet, or forgot it? "));
          err.appendChild(h("button", { "class": "wa-link", type: "button", text: "Email me a sign-in code", onclick: function () { setMode("code"); sendCode(); } }));
        }
      }).then(done);
    }

    codeBtn.addEventListener("click", function () { if (state.mode !== "code") setMode("code"); sendCode(); });
    resend.addEventListener("click", function () { state.pending = null; setMode("code"); sendCode(); });
    otherEmail.addEventListener("click", function () {
      state.pending = null; say(info, ""); err.style.display = "none"; setMode("code");
      try { email.focus(); email.select(); } catch (e) {}
    });
    toPassword.addEventListener("click", function () {
      state.pending = null; say(info, ""); err.style.display = "none"; setMode("password");
      try { pass.focus({ preventScroll: true }); } catch (e) {}
    });
    var form = h("form", { id: "weyland-signin-form", novalidate: "novalidate", onsubmit: function (e) {
      e.preventDefault();
      if (state.mode === "code") { if (state.pending) verifyCode(); else sendCode(); return; }
      passwordSignIn();
    } }, [
      h("label", { "for": "weyland-signin-email", text: "Email" }), email,
      pwPart, orLine, codeBtn, codePart, toPasswordRow, err, info
    ]);
    var card = h("div", { "class": "wa-card" }, confirm ? [
      h("h2", { text: "Confirm your email" }),
      h("p", { text: "We email a code to " + prefillEmail + ". Entering it confirms the email, and a purchase made with it is added to this account." }),
      form,
      h("button", { "class": "wa-secondary", type: "button", text: "Back to the account", onclick: function () { viewAccount(); } })
    ] : [
      h("h2", { text: "Sign in to WeylandAI" }),
      h("p", { text: "Enter your email and we will send a sign-in code. New here? The same code verifies your email so you can start a free 14-day account. No password or card needed." }),
      form,
      h("p", { style: "margin:10px 0 0" }, [h("button", { "class": "wa-link", type: "button", text: "Forgot password?", onclick: function () {
        var em = email.value.trim();
        err.style.display = "none";
        if (!em) { showError(err, "Type your email above first, then choose Forgot password."); return; }
        say(info, "Sending the reset link...", "");
        authforCall("/api/v1/password/reset-request", { email: em, client_id: AF_CLIENT, venture_id: AF_VENTURE }).then(function (res) {
          // 404 is AuthFor's "no account with that email": the page says the same as for a sent link,
          // so it never tells anyone whether an email has an account.
          if ((res.ok && res.data.sent !== false) || res.status === 404) {
            say(info, "If that email has an account, a reset link is on its way. It opens a page here on WeylandAI where you choose a new password. You can also choose Email me a sign-in code.", "good");
          } else {
            say(info, "");
            showError(err, res.status === 0 ? "The reset link could not be requested: the sign-in service could not be reached. Try again."
              : res.status === 429 ? "Too many reset emails were asked for just now. Wait a few minutes, or choose Email me a sign-in code."
              : "The reset email could not be sent just now. Try again in a minute, or choose Email me a sign-in code.");
          }
        });
      } })])
    ]);
    setMode(state.mode);
    show(confirm ? "Confirm your email" : "Sign in", card, "signin");
    if (state.mode === "code" && email.value) { try { codeBtn.focus({ preventScroll: true }); } catch (e) {} }
    return Promise.resolve();
  }

  // ---------- choose a new password: the emailed reset link opens /#/reset?token=... here ----------
  function viewReset(tok, emailHint) {
    tok = String(tok || ssGet(RESET_KEY) || "");
    if (tok) ssSet(RESET_KEY, tok);
    if (!tok) {
      show("Choose a new password", h("div", { "class": "wa-card" }, [
        h("h2", { text: "This reset link is incomplete" }),
        h("p", { text: "The link has no reset code in it. Ask for a new one: in Sign in, type your email and choose Forgot password. Or sign in with a code we email you." }),
        h("button", { "class": "wa-primary", type: "button", text: "GO TO SIGN IN", onclick: function () { viewSignIn(null, emailHint || ""); } })
      ]), "reset");
      return Promise.resolve();
    }
    var err = errorBox();
    var info = noteBox();
    var email = h("input", { id: "weyland-reset-email", type: "email", autocomplete: "username", inputmode: "email" });
    if (emailHint) email.value = emailHint;
    var pw1 = h("input", { id: "weyland-reset-password", type: "password", autocomplete: "new-password", minlength: "8", required: "required" });
    var pw2 = h("input", { id: "weyland-reset-password2", type: "password", autocomplete: "new-password", minlength: "8", required: "required" });
    var submit = h("button", { id: "weyland-reset-submit", "class": "wa-primary", type: "submit", text: "SAVE AND SIGN IN" });
    var inflight = false;
    var form = h("form", { id: "weyland-reset-form", novalidate: "novalidate", onsubmit: function (e) {
      e.preventDefault();
      if (inflight) return;
      err.style.display = "none";
      var em = email.value.trim(), a = pw1.value, b = pw2.value;
      if (em && !validEmail(em)) { showError(err, "That email does not look right."); email.focus(); return; }
      if (a.length < 8) { showError(err, "Use at least 8 characters."); pw1.focus(); return; }
      if (a !== b) { showError(err, "The two passwords are different. Type the same one twice."); pw2.focus(); return; }
      inflight = true; submit.disabled = true; submit.textContent = "SAVING...";
      authforCall("/api/v1/password/reset-confirm", { token: tok, new_password: a }).then(function (res) {
        if (!res.ok || res.data.success === false) {
          var m = authforMessage(res);
          if (res.data.code === "PASSWORD_TOO_SHORT") throw new Error("Use at least 8 characters.");
          throw new Error(res.status === 401 || res.data.code === "RESET_INVALID" ? "This reset link has expired or was already used. Ask for a new one: in Sign in, type your email and choose Forgot password."
            : res.status === 0 ? "The sign-in service could not be reached. Try again."
            : (m || "The password could not be saved (" + res.status + ")."));
        }
        ssDel(RESET_KEY);
        var who = String(res.data.email || (res.data.user && res.data.user.email) || em || "").trim();
        say(info, "Your new password is saved. Signing you in...", "good");
        submit.textContent = "SIGNING IN...";
        // Whoever was signed in on this browser before is signed out first: the link's account takes over.
        return endSession().then(function () {
          if (res.data.token) { keepLogin(res.data); return finish(); }
          if (!who) { S.flash = null; return viewSignIn(null, "").then(function () { flashSignIn("Your new password is saved. Sign in with your email and the new password."); }); }
          return authforLogin(sdk(), who, a).then(function (r2) {
            if (r2 && r2.mfa_required) return viewSignIn(null, who).then(function () { flashSignIn("Your new password is saved. Sign in with it and your authenticator code."); });
            return finish();
          });
        });
      }).catch(function (e2) { say(info, ""); showError(err, (e2 && e2.message) || "The password could not be saved."); })
        .then(function () { inflight = false; submit.disabled = false; submit.textContent = "SAVE AND SIGN IN"; });
    } }, [
      h("label", { "for": "weyland-reset-email", text: "Email" }), email,
      h("label", { "for": "weyland-reset-password", text: "New password (8 or more characters)" }), pw1,
      h("label", { "for": "weyland-reset-password2", text: "The new password again" }), pw2,
      submit, err, info
    ]);
    function finish() {
      S.flash = "Your new password is saved. You are signed in.";
      return afterAuthFor("view:account", err);
    }
    show("Choose a new password", h("div", { "class": "wa-card" }, [
      h("h2", { text: "Choose a new password" }),
      h("p", { text: "For your WeylandAI account. When it is saved you are signed in here." }),
      form
    ]), "reset");
    if (!emailHint) { try { email.focus({ preventScroll: true }); } catch (e) {} } else { try { pw1.focus({ preventScroll: true }); } catch (e) {} }
    return Promise.resolve();
  }
  // A note on the sign-in view that was just shown (after a reset that could not sign in on its own).
  function flashSignIn(msg) {
    var box = S.body && S.body.querySelector(".wa-note");
    if (box) say(box, msg, "good");
  }

  // Where a sign-in continues: an app (its path), a view ("view:account", "view:plans"), or the page.
  function continueAfter(target) {
    if (target === "view:account") return viewAccount();
    if (target === "view:plans") return viewPlans();
    if (target && target !== "/" && target.charAt(0) === "/") return viewApp(target);
    return close();
  }

  function viewNoAccount(email, continueTo) {
    var err = errorBox();
    var start = h("button", { "class": "wa-primary", type: "button", text: "START MY FREE 14-DAY TRIAL" });
    start.addEventListener("click", function () {
      start.disabled = true; err.style.display = "none";
      api("/api/auth/authfor-exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authfor_token: token() }) })
        .then(function (r) {
          if (!r.ok) throw new Error((r.data && (r.data.message || r.data.error)) || "Could not create the account.");
          return afterAuthFor(continueTo, err);
        }).catch(function (e) { showError(err, e.message); start.disabled = false; });
    });
    show("Finish setup", h("div", { "class": "wa-card" }, [
      h("h2", { text: "No WeylandAI account on this email yet" }),
      h("p", { text: "You are signed in as " + email + ". Start a free 14-day trial on it. No card needed and no automatic charge." }),
      start,
      h("button", { "class": "wa-secondary", type: "button", text: "Use a different email", onclick: function () { signOut().then(function () { viewSignIn(continueTo); }); } }),
      err
    ]), "no-account");
    return Promise.resolve();
  }

  // ---------- access: what the account can use, and until when ----------
  // SQLite datetime('now') text is UTC without a zone; ISO strings, unix seconds and ms are taken as given.
  function parseWhen(v) {
    if (v == null || v === "") return NaN;
    var s = String(v).trim();
    if (/^\d+$/.test(s)) { var n = +s; return n < 1e12 ? n * 1000 : n; }
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = s.replace(" ", "T") + "Z";
    else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00Z";
    var ms = Date.parse(s);
    return isFinite(ms) ? ms : NaN;
  }
  function niceDate(v) {
    var ms = parseWhen(v);
    if (!isFinite(ms)) return "";
    try { return new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); } catch (e) { return new Date(ms).toDateString(); }
  }
  function shortDate(v) {
    var ms = parseWhen(v);
    if (!isFinite(ms)) return "";
    try { return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return new Date(ms).toDateString(); }
  }
  function money(cents, cur) {
    if (typeof cents !== "number" || !isFinite(cents)) return "";
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: String(cur || "usd").toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
    } catch (e) { return "$" + (cents / 100); }
  }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pad2(n) { return ("0" + n).slice(-2); }
  function daysWords(d) { return d == null ? "" : d + " day" + (d === 1 ? "" : "s") + " left"; }

  // { kind, was, phase, ends_at, days_left, tier, status } from GET /api/auth/me (user, entitlements).
  // entitlements.access {kind, ends_at} (or entitlements.offer) is the platform's own answer when it
  // gives one; otherwise it is read from the plan, its status and the trial window.
  // kind: offer | trial | subscription | ended | payment-failing | none.
  // phase: offer, then offer-ending from day 23 of the 30 (8 days left); trial, then trial-ending in
  // its last 3 days; ended; subscribed; payment-failing; free.
  function accessOf(user, ent) {
    user = user || {}; ent = ent || {};
    var a = ent.access && typeof ent.access === "object" ? ent.access : null;
    var kind = a && a.kind ? String(a.kind) : "", ends = a ? (a.ends_at || a.access_ends_at || null) : null, was = a && a.was || null;
    var status = String(user.subscription_status || ent.status || "");
    var tier = String(user.subscription_tier || ent.plan || "free");
    var trial = ent.trial || {};
    if (!kind && ent.offer && typeof ent.offer === "object" && (ent.offer.active || ent.offer.ends_at || ent.offer.ended_at)) {
      kind = ent.offer.active ? "offer" : "ended"; ends = ent.offer.ends_at || ent.offer.ended_at || null; was = "offer";
    }
    if (!kind) {
      if (status === "past_due" || status === "unpaid" || ent.payment_failing) kind = "payment-failing";
      else if (trial.active) { kind = "trial"; ends = trial.ends_at || user.trial_ends_at; }
      else if (status === "active" && tier !== "free" && tier !== "starter") kind = "subscription";
      else if (trial.ended_at) { kind = "ended"; ends = trial.ended_at; was = "trial"; }
      else if (status === "trial" && user.trial_ends_at) { kind = "trial"; ends = user.trial_ends_at; }
      else kind = "none";
    }
    if (kind === "expired" || kind === "offer-ended" || kind === "trial-ended") { was = was || (kind === "offer-ended" ? "offer" : "trial"); kind = "ended"; }
    // The platform's answer for a window that ended with no plan: kind "none" plus ended {kind, at}.
    if (a && kind === "none" && a.ended && typeof a.ended === "object") { kind = "ended"; was = a.ended.kind || "trial"; ends = a.ended.at || ends; }
    if (a && kind === "subscription" && (status === "past_due" || status === "unpaid" || ent.payment_failing)) kind = "payment-failing";
    var endMs = parseWhen(ends), left = isFinite(endMs) ? endMs - Date.now() : NaN;
    if ((kind === "offer" || kind === "trial") && isFinite(left) && left <= 0) { was = kind; kind = "ended"; }
    // The prompt: the platform's prompt_for_plan, and in any case from day 23 of the offer's 30 days
    // (8 days left, John's decision of 2026-10-07) and in the last 3 days of a trial.
    var prompt = !!(a && a.prompt_for_plan);
    var phase = kind === "subscription" ? "subscribed" : kind === "ended" ? "ended" : kind === "payment-failing" ? "payment-failing"
      : kind === "offer" ? (prompt || (isFinite(left) && left <= 8 * DAY) ? "offer-ending" : "offer")
      : kind === "trial" ? (prompt || (isFinite(left) && left <= 3 * DAY) ? "trial-ending" : "trial") : "free";
    return { kind: kind, was: kind === "ended" ? (was || "trial") : null, phase: phase, ends_at: isFinite(endMs) ? new Date(endMs).toISOString() : null,
             days_left: isFinite(left) ? Math.max(0, Math.ceil(left / DAY)) : null, tier: tier, status: status,
             first: a && a.first_submittal || null, held: a && a.held_purchases || 0 };
  }
  function publicAccess(acc) {
    return acc ? { phase: acc.phase, kind: acc.kind, was: acc.was, ends_at: acc.ends_at, days_left: acc.days_left } : null;
  }
  // Plan management needs the platform's billing routes (fc:payments: GET /api/billing/plan, the
  // cancel / resume / card / invoice routes, and entitlements.access in GET /api/auth/me). Until
  // the platform reports entitlements.access, the account card shows the account and its dates only:
  // no plan prompt, no "choose a plan" (the old checkouts could still carry a trial that charges).
  function billingLive() { return !!(S.ent && S.ent.access && typeof S.ent.access === "object"); }
  function promptPhase(acc) { return !!acc && billingLive() && /^(offer-ending|trial-ending|ended|payment-failing)$/.test(acc.phase); }
  // The prompt to choose a plan, and the plain message once access has ended.
  function accessWords(acc) {
    var when = niceDate(acc.ends_at), left = acc.days_left != null ? " (" + daysWords(acc.days_left) + ")" : "";
    switch (acc.phase) {
      case "offer-ending": return "Your 30 days of every product end on " + when + left + ". Nothing is charged automatically: choose a plan to keep the paid tools. Your work stays in your account either way.";
      case "trial-ending": return "Your free trial ends on " + when + left + ". Choose a plan to keep the paid tools. Your work stays in your account either way.";
      case "ended": return (acc.was === "offer" ? "Your 30 days of every product ended" : "Your free trial ended") + (when ? " on " + when : "") + ". The paid tools are paused and your work is kept in your account. Choose a plan to pick up where you left off; pasting a schedule and seeing cited matches stay free.";
      case "payment-failing": return "Your last payment did not go through, so the paid tools are paused. Update the card to turn them back on; your work is kept.";
      default: return "";
    }
  }
  function accountWords(acc) {
    var when = niceDate(acc.ends_at);
    if (acc.phase === "offer") return "Your $100 first submittal includes every product until " + when + ". Nothing is charged after that. Before then, choose a plan here if you want to keep the paid tools.";
    if (acc.phase === "trial") return "Your free trial includes every product until " + when + ". Nothing is charged; choose a plan when you are ready.";
    if (acc.phase === "free") return "You have the free tools: paste a schedule and see cited matches. Your first submittal is $100 with 30 days of every product, and nothing is charged after that.";
    return accessWords(acc);
  }
  function planWords(acc) {
    if (acc.kind === "offer") return "First submittal: every product for 30 days";
    if (acc.kind === "trial") return "Free trial: every product";
    if (acc.kind === "ended") return "Paid tools paused (your work is kept)";
    var tier = TIER_NAMES[acc.tier] || acc.tier || "Free tools";
    if (acc.kind === "payment-failing") return tier + ": payment failing";
    if (acc.kind === "subscription") return tier + ", monthly";
    return "Free tools";
  }
  function endRow(acc) {
    if (!acc.ends_at) return null;
    var left = acc.days_left ? " (" + daysWords(acc.days_left) + ")" : "";
    if (acc.kind === "offer") return ["Access until", niceDate(acc.ends_at) + left];
    if (acc.kind === "trial") return ["Trial ends", niceDate(acc.ends_at) + left];
    if (acc.kind === "ended") return ["Ended on", niceDate(acc.ends_at)];
    return null;
  }
  function choosePlanOrCard(acc) { if (acc && acc.phase === "payment-failing") viewCard(); else viewPlans(); }

  // The page-level prompt (bottom left; on a phone, full width): from day 23 of the offer, the last 3
  // days of a trial, after access ended, or while a payment is failing. Hidden for the rest of the
  // day with its X. Never shown over the overlay (the overlay has its own strip for apps).
  function renderAccessCard() {
    var acc = S.status === "signed-in" ? S.access : null;
    var card = document.getElementById("wa-access-card");
    var key = acc ? acc.phase + ":" + new Date().toISOString().slice(0, 10) : "";
    if (!promptPhase(acc) || lsGet(DISMISS_KEY) === key || !document.body) { if (card) card.remove(); return; }
    if (!card) { card = h("div", { id: "wa-access-card", role: "status", "aria-live": "polite" }); document.body.appendChild(card); }
    card.className = acc.phase === "ended" || acc.phase === "payment-failing" ? "wa-ended" : "";
    card.setAttribute("data-phase", acc.phase);
    card.textContent = "";
    card.appendChild(h("p", { text: accessWords(acc) }));
    card.appendChild(h("button", { "class": "wa-go", type: "button", text: acc.phase === "payment-failing" ? "UPDATE THE CARD" : "CHOOSE A PLAN", onclick: function () { choosePlanOrCard(acc); } }));
    card.appendChild(h("button", { "class": "wa-x", type: "button", "aria-label": "Hide this until tomorrow", text: "×", onclick: function () { lsSet(DISMISS_KEY, key); card.remove(); } }));
  }
  // The same prompt as a strip above an app open in the overlay (always shown there).
  function renderBanner() {
    if (!S.banner) return;
    var acc = S.status === "signed-in" ? S.access : null;
    var on = S.view === "app" && promptPhase(acc);
    S.banner.style.display = on ? "flex" : "none";
    S.banner.textContent = "";
    if (!on) return;
    S.banner.className = "wa-banner" + (acc.phase === "ended" || acc.phase === "payment-failing" ? " wa-ended" : "");
    S.banner.setAttribute("data-phase", acc.phase);
    S.banner.appendChild(h("span", { text: accessWords(acc) }));
    S.banner.appendChild(h("button", { type: "button", text: acc.phase === "payment-failing" ? "UPDATE THE CARD" : "CHOOSE A PLAN", onclick: function () { choosePlanOrCard(acc); } }));
  }
  function renderAccess() {
    S.access = S.status === "signed-in" ? accessOf(S.user, S.ent) : null;
    if (S.access) root.setAttribute("data-weyland-access", S.access.phase); else root.removeAttribute("data-weyland-access");
    renderAccessCard();
    renderBanner();
    try { window.dispatchEvent(new CustomEvent("weyland-access", { detail: publicAccess(S.access) || { phase: "" } })); } catch (e) {}
  }

  // ---------- account: plan, access end date, choose a plan, cancel / resume, card, invoices ----------
  function accountApi(path, opts) {
    opts = opts || {};
    var headers = {};
    var t = token();
    if (t) headers.Authorization = "Bearer " + t; // else the weyland_session cookie (a purchase made signed out)
    var init = { method: opts.method || "GET", headers: headers };
    if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.json); }
    return api(path, init);
  }
  function apiMessage(r, lead) {
    var d = (r && r.data) || {};
    var e = d.error;
    var m = (d.detail && typeof d.detail === "object" && d.detail.message) || d.message || (e && typeof e === "object" ? e.message : e) || "";
    return lead + (m ? ": " + m : " (" + ((r && r.status) || "no answer") + ")") + ".";
  }
  var catalogPromise = null;
  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch("/api/billing/catalog", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var byId = {};
        ((d && d.products) || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
        return byId;
      });
      catalogPromise.catch(function () { catalogPromise = null; });
    }
    return catalogPromise;
  }
  var stripeJsPromise = null;
  function loadStripe(src) {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripeJsPromise) return stripeJsPromise;
    stripeJsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = /^https:\/\/js\.stripe\.com\//.test(String(src || "")) ? src : "https://js.stripe.com/v3/";
      s.async = true;
      s.onload = function () { if (window.Stripe) resolve(window.Stripe); else reject(new Error("Stripe.js did not load.")); };
      s.onerror = function () { stripeJsPromise = null; reject(new Error("Stripe.js could not be loaded.")); };
      document.head.appendChild(s);
    });
    return stripeJsPromise;
  }
  // The platform's embedded-checkout helper (GET /api/billing/embedded-checkout.js), shared with the page.
  function checkoutHelper() {
    if (window.WeylandCheckout) return Promise.resolve(window.WeylandCheckout);
    if (window.__weylandCheckoutLoading) return window.__weylandCheckoutLoading;
    window.__weylandCheckoutLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "/api/billing/embedded-checkout.js";
      s.onload = function () { if (window.WeylandCheckout) resolve(window.WeylandCheckout); else reject(new Error("the payment form did not load.")); };
      s.onerror = function () { window.__weylandCheckoutLoading = null; reject(new Error("the payment form did not load.")); };
      document.head.appendChild(s);
    });
    return window.__weylandCheckoutLoading;
  }

  function viewAccount() {
    if (S.status === "no-account") return viewNoAccount(S.user && S.user.email || "", null);
    if (S.status !== "signed-in") return viewSignIn("view:account");
    var u = S.user || {};
    var acc = S.access || accessOf(u, S.ent);
    var flash = S.flash;
    S.flash = null;
    var rows = [["Signed in as", u.email || ""], ["Plan", planWords(acc)]];
    var end = endRow(acc);
    if (end) rows.push(end);
    var first = acc.first;
    if (first && typeof first === "object") {
      var credit = first.credit || {};
      rows.push(["First submittal", ["Paid " + shortDate(first.purchased_at || first.granted_at), money(first.amount_total, first.currency),
        typeof credit.remaining === "number" ? credit.remaining + " of " + (credit.total || 1) + " packet" + ((credit.total || 1) === 1 ? "" : "s") + " left to build" : ""].filter(Boolean).join(" · ")]);
    }
    var live = billingLive();
    var words = live ? accountWords(acc) : "";
    var chooseFirst = live && /^(offer-ending|trial-ending|ended|free)$/.test(acc.phase);
    var section = h("div", { "class": "wa-section", id: "wa-plan-section" }, [h("p", { "class": "wa-muted", text: "Loading your plan and invoices..." })]);
    var kids = [
      h("h2", { text: u.name || "Your account" }),
      flash ? h("div", { "class": "wa-note wa-good", id: "wa-account-flash", role: "status", text: flash }) : null,
      h("div", { id: "wa-account-rows" }, rows.map(function (r) { return h("div", { "class": "wa-row" }, [h("span", { text: r[0] }), h("span", { text: r[1] })]); })),
      words ? h("div", { "class": "wa-note" + (acc.phase === "ended" || acc.phase === "payment-failing" ? " wa-bad" : /ending$/.test(acc.phase) ? " wa-warn" : ""), id: "wa-access-note", text: words }) : null,
      // A purchase made without signing in made this account without a password: say how to get back in.
      !token() && u.email ? h("p", { "class": "wa-muted", id: "wa-signin-tip", style: "margin:10px 0 0", text: "On another device, choose Sign in, then Email me a sign-in code, with " + u.email + "." }) : null,
      acc.held > 0 ? h("div", { "class": "wa-note wa-warn", id: "wa-held-note" }, [
        h("p", { style: "margin:0 0 4px;color:inherit", text: (acc.held === 1 ? "A purchase" : acc.held + " purchases") + " made with " + (u.email || "this email") + " while signed out " + (acc.held === 1 ? "is" : "are") + " waiting. Confirm the email with a code and " + (acc.held === 1 ? "it is" : "they are") + " added to this account." }),
        h("button", { "class": "wa-secondary", type: "button", id: "weyland-confirm-email", text: "CONFIRM MY EMAIL", onclick: function () { viewSignIn("view:account", u.email, "code", { confirm: true }); } })
      ]) : null,
      live && acc.phase === "payment-failing" ? h("button", { "class": "wa-primary", type: "button", text: "UPDATE THE CARD", onclick: function () { viewCard(); } }) : null,
      live && acc.phase !== "subscribed" && acc.phase !== "payment-failing" ? h("button", { id: "weyland-choose-plan", "class": chooseFirst ? "wa-primary" : "wa-secondary", type: "button", text: "CHOOSE A PLAN", onclick: function () { viewPlans(); } }) : null,
      live ? section : null,
      h("button", { "class": chooseFirst || (live && acc.phase === "payment-failing") ? "wa-secondary" : "wa-primary", type: "button", text: "OPEN SUBX", onclick: function () { viewApp("/subx-app"); } }),
      h("button", { "class": "wa-secondary", type: "button", text: "Back to the site", onclick: function () { closeFromUi(); } }),
      h("button", { id: "weyland-signout", "class": "wa-secondary", type: "button", text: "Sign out", onclick: function () { signOut(); } })
    ];
    show("Account", h("div", { "class": "wa-card wa-wide" }, kids), "account");
    if (!live) return Promise.resolve();
    var seq = S.seq;
    Promise.all([accountApi(BILLING.plan), accountApi(BILLING.invoices)]).then(function (res) {
      if (seq === S.seq) renderPlanSection(section, res[0], res[1]);
    });
    return Promise.resolve();
  }

  // The plan section: the monthly plan(s) with their renewal or end date and card, cancel at period
  // end or resume, update the card, and the invoices (each opens in the page's own PDF viewer).
  function renderPlanSection(section, planRes, invRes) {
    section.textContent = "";
    var d = (planRes && planRes.ok && planRes.data) || null;
    var subs = d ? (Array.isArray(d.subscriptions) ? d.subscriptions : d.subscription ? [d.subscription] : []) : [];
    var any = false;
    if (d) {
      any = true;
      section.appendChild(h("h3", { text: subs.length > 1 ? "Your plans" : "Your plan" }));
      if (subs.length) subs.forEach(function (sub) { section.appendChild(subBlock(sub, d)); });
      else section.appendChild(h("p", { "class": "wa-muted", text: "No monthly plan. Nothing renews, and nothing is charged unless you choose a plan." }));
    } else if (planRes && planRes.status !== 404) {
      any = true;
      section.appendChild(h("h3", { text: "Your plan" }));
      section.appendChild(h("p", { "class": "wa-muted", text: "Your plan details could not be loaded just now (" + (planRes.status || "no answer") + "). Close the account and open it again to retry." }));
    }
    if (invRes && (invRes.ok || invRes.status !== 404)) {
      any = true;
      section.appendChild(h("h3", { text: "Invoices", style: "margin-top:16px" }));
      var list = invRes.ok && invRes.data ? (invRes.data.invoices || invRes.data.data || []) : null;
      if (!invRes.ok) section.appendChild(h("p", { "class": "wa-muted", text: "Invoices could not be loaded just now (" + (invRes.status || "no answer") + ")." }));
      else if (!list.length) section.appendChild(h("p", { "class": "wa-muted", text: "No invoices yet." }));
      else list.slice(0, 24).forEach(function (inv) { section.appendChild(invoiceRow(inv)); });
    }
    if (!any) section.remove();
  }

  function subBlock(sub, data) {
    var box = h("div", { "class": "wa-sub", "data-subscription": sub.id || "" });
    var qty = sub.quantity || 1;
    var price = typeof sub.unit_amount === "number" ? money(sub.unit_amount * qty, sub.currency) + " a " + (sub.interval || "month") : "";
    var name = sub.name || TIER_NAMES[sub.tier] || sub.product_id || "Your plan";
    var ending = !!sub.cancel_at_period_end;
    var when = niceDate(sub.current_period_end || sub.cancel_at);
    var card = sub.card || (data && data.card) || null;
    var rows = [["Plan", name + (price ? " · " + price : "")]];
    if (when) rows.push([ending ? "Ends on" : "Renews on", when]);
    if (sub.status && !/^(active|trialing)$/.test(sub.status)) rows.push(["Status", sub.status === "past_due" ? "payment failing" : sub.status]);
    if (card && card.last4) rows.push(["Card", (card.brand ? cap(card.brand) + " " : "") + "ending " + card.last4 + (card.exp_month ? " (expires " + pad2(card.exp_month) + "/" + String(card.exp_year || "").slice(-2) + ")" : "")]);
    rows.forEach(function (r) { box.appendChild(h("div", { "class": "wa-row" }, [h("span", { text: r[0] }), h("span", { text: r[1] })])); });
    var note = noteBox();
    var actions = h("div", { "class": "wa-actions" });
    var cardBtn = h("button", { "class": "wa-secondary", type: "button", id: "weyland-update-card", text: "UPDATE THE CARD", onclick: function () { viewCard(); } });
    var cancelBtn = h("button", { "class": "wa-secondary", type: "button", id: "weyland-cancel-plan", text: "CANCEL AT PERIOD END" });
    var resumeBtn = h("button", { "class": "wa-secondary", type: "button", id: "weyland-resume-plan", text: "RESUME THE PLAN" });
    actions.appendChild(cardBtn);
    actions.appendChild(ending ? resumeBtn : cancelBtn);
    box.appendChild(actions);
    box.appendChild(note);
    if (ending) say(note, "Cancelled: " + name + " stays on until " + (when || "the end of this period") + ", then stops. Nothing more is charged. Your work stays in your account.", "warn");
    cancelBtn.addEventListener("click", function () {
      // Asked in the page (never a browser dialog), with what happens in plain words.
      actions.style.display = "none";
      var yes = h("button", { "class": "wa-primary", type: "button", id: "weyland-cancel-confirm", text: "YES, CANCEL AT PERIOD END" });
      var no = h("button", { "class": "wa-secondary", type: "button", text: "No, keep my plan" });
      var ask = h("div", { "class": "wa-note wa-warn" }, [
        h("p", { style: "margin:0 0 4px;color:inherit", text: name + " stays on until " + (when || "the end of this period") + ". After that the paid tools pause and nothing more is charged. Your work stays in your account, and you can resume any time before then." }),
        yes, no
      ]);
      box.appendChild(ask);
      no.addEventListener("click", function () { ask.remove(); actions.style.display = "flex"; });
      yes.addEventListener("click", function () {
        yes.disabled = true; yes.textContent = "CANCELLING...";
        accountApi(BILLING.cancel, { method: "POST", json: { subscription_id: sub.id } }).then(function (r) {
          if (!r.ok) throw new Error(apiMessage(r, "The plan could not be cancelled"));
          var s2 = (r.data && r.data.subscription) || {};
          S.flash = "Cancelled at period end: " + name + " stays on until " + (niceDate(s2.current_period_end) || when || "the end of this period") + ". Nothing more is charged.";
          return refreshState().then(function () { if (S.view === "account") viewAccount(); });
        }).catch(function (e) { ask.remove(); actions.style.display = "flex"; say(note, e.message, "bad"); });
      });
    });
    resumeBtn.addEventListener("click", function () {
      resumeBtn.disabled = true; resumeBtn.textContent = "RESUMING...";
      accountApi(BILLING.resume, { method: "POST", json: { subscription_id: sub.id } }).then(function (r) {
        if (!r.ok) throw new Error(apiMessage(r, "The plan could not be resumed"));
        S.flash = name + " continues" + (when ? " and renews on " + when : "") + ".";
        return refreshState().then(function () { if (S.view === "account") viewAccount(); });
      }).catch(function (e) { resumeBtn.disabled = false; resumeBtn.textContent = "RESUME THE PLAN"; say(note, e.message, "bad"); });
    });
    return box;
  }

  function invoiceRow(inv) {
    var when = shortDate(inv.created || inv.date || inv.period_end);
    var cents = typeof inv.total === "number" ? inv.total : typeof inv.amount_paid === "number" ? inv.amount_paid : inv.amount_due;
    var status = inv.status === "paid" ? "Paid" : inv.status === "open" ? "Due" : inv.status ? cap(inv.status) : "";
    var pdf = String(inv.pdf_url || inv.pdf || (inv.id ? BILLING.invoices + "/" + encodeURIComponent(inv.id) + "/pdf" : ""));
    var title = ("Invoice " + (inv.number || "")).trim() + (when ? ", " + when : "");
    return h("div", { "class": "wa-inv", "data-invoice": inv.id || "" }, [
      h("span", { text: [when, money(cents, inv.currency), status, inv.description || inv.number || ""].filter(Boolean).join(" · ") }),
      /^\/api\//.test(pdf) ? h("button", { type: "button", text: "VIEW", "aria-label": "View " + title, onclick: function () { viewPdf({ url: pdf, title: title, account: true }); } }) : null
    ]);
  }

  // Choose a plan: Stripe's embedded form, mounted inside the overlay (no page, no tab).
  function viewPlans() {
    if (S.status === "no-account") return viewNoAccount(S.user && S.user.email || "", "view:plans");
    if (S.status !== "signed-in") return viewSignIn("view:plans");
    if (!billingLive()) return viewAccount();
    var acc = S.access || accessOf(S.user, S.ent);
    var err = errorBox();
    var info = noteBox();
    var list = h("div", { id: "wa-plan-list" }, [h("p", { "class": "wa-muted", text: "Loading the plans..." })]);
    var mount = h("div", { "class": "wa-mount", id: "wa-plan-checkout", style: "display:none" });
    var when = niceDate(acc.ends_at);
    var intro = acc.kind === "offer" ? "Your first submittal includes every product until " + when + ". To keep using them after that, choose a plan."
      : acc.kind === "trial" ? "Your free trial includes every product until " + when + ". To keep using them after that, choose a plan."
      : acc.kind === "ended" ? "Your access ended" + (when ? " on " + when : "") + "; your work is kept. Choose a plan to pick up where you left off."
      : "Choose what you need.";
    show("Choose a plan", h("div", { "class": "wa-card wa-wide" }, [
      h("h2", { text: "Choose a plan" }),
      h("p", { text: intro + " A plan renews each month until you cancel it in your account; Stripe's form shows exactly what is charged today." }),
      list, info, mount, err,
      h("button", { "class": "wa-secondary", type: "button", text: "Back to the account", onclick: function () { viewAccount(); } })
    ]), "plans");
    var seq = S.seq;
    var mine = { product: null, name: "", session: null, done: false };
    function onCheckout(e) {
      var d = (e && e.detail) || {};
      if (!mine.product || (d.product_id && d.product_id !== mine.product) || (mine.session && d.session_id && d.session_id !== mine.session)) return;
      if (d.status === "terms") say(info, "First what you are buying and the Terms; accept them and the payment form opens here.", "");
      else if (d.status === "open") { mine.session = d.session_id || mine.session; say(info, "Secure checkout for " + mine.name + " is open below. Card details go to Stripe inside this page.", ""); }
      else if (d.status === "held") { mine.done = true; mount.style.display = "none"; say(info, "Payment received. The email you paid with belongs to another WeylandAI account, so the purchase waits there until that email is confirmed with a code.", "warn"); }
      else if (d.status === "error") { mine.product = null; mount.style.display = "none"; list.style.display = "block"; say(info, ""); showError(err, "The payment form did not open: " + (d.message || "it is unavailable right now.") + " Nothing was charged."); }
      else if (d.status === "complete") say(info, "Payment received. Turning " + mine.name + " on...", "");
      else if (d.status === "active") {
        mine.done = true; mount.style.display = "none";
        say(info, mine.name + " is on.", "good");
        refreshState().then(function () { if (seq === S.seq) { S.flash = mine.name + " is on. You can cancel at period end, change the card and see invoices here."; viewAccount(); } });
      } else if (d.status === "paid_pending") { mine.done = true; say(info, "Payment received. " + mine.name + " turns on within a few minutes; your account shows it as soon as it does.", "warn"); }
    }
    window.addEventListener("weyland-checkout", onCheckout);
    S.cleanup.push(function () {
      window.removeEventListener("weyland-checkout", onCheckout);
      try { if (mine.product && !mine.done && window.WeylandCheckout && window.WeylandCheckout.state().open) window.WeylandCheckout.close(); } catch (e) {}
    });
    function choose(p) {
      err.style.display = "none";
      mine.product = p.id; mine.name = p.name; mine.session = null; mine.done = false;
      say(info, "Opening the payment form for " + p.name + "...", "");
      list.style.display = "none";
      mount.textContent = "";
      mount.style.display = "block";
      checkoutHelper().then(function (W) {
        if (seq !== S.seq || mine.product !== p.id) return null;
        return W.open({ product_id: p.id, quantity: 1, name: p.name, container: mount });
      }).then(function (opened) {
        if (opened && opened.session_id) mine.session = opened.session_id;
      }).catch(function (e) {
        mine.product = null; mount.style.display = "none"; list.style.display = "block"; say(info, "");
        showError(err, "The payment form did not open: " + ((e && e.message) || e) + " Nothing was charged.");
      });
    }
    // The plans that can be bought now: the platform's own list (GET /api/billing/plan choices),
    // else the catalog's prices for the usual plans.
    Promise.all([catalog().catch(function () { return {}; }), accountApi(BILLING.plan)]).then(function (got) {
      if (seq !== S.seq) return;
      var byId = got[0] || {}, plan = got[1] && got[1].ok && got[1].data || null;
      var subs = {};
      PLAN_CHOICES.forEach(function (p) { subs[p.id] = p; });
      list.textContent = "";
      var choices = [];
      // The $100 first submittal, for an account that has not had it (the platform refuses a second: 409 offer_used).
      var offer = byId[OFFER_SKU];
      var hadOffer = !!(acc.first || (plan && plan.first_submittal) || acc.kind === "offer" || (acc.kind === "ended" && acc.was === "offer"));
      if (offer && offer.checkout_ready !== false && !hadOffer && acc.kind !== "subscription") {
        choices.push({ id: OFFER_SKU, name: "First submittal", sub: "One submittal packet plus 30 days of every product. One payment; nothing is charged after that.", price: money(offer.unit_amount, offer.currency) + " once", offer: true });
      }
      var listed = plan && Array.isArray(plan.choices) && plan.choices.length ? plan.choices : null;
      if (listed) {
        listed.forEach(function (c) {
          var id = c.product_id || c.id;
          if (!id || id === OFFER_SKU) return;
          var known = subs[id] || {};
          choices.push({ id: id, name: c.name || known.name || id, sub: known.sub || "", price: typeof c.unit_amount === "number" ? money(c.unit_amount, c.currency) + " a " + (c.interval || "month") : "" });
        });
      } else {
        PLAN_CHOICES.forEach(function (p) {
          var c = byId[p.id];
          if (c && c.checkout_ready === false) return;
          choices.push({ id: p.id, name: p.name, sub: p.sub, price: c && typeof c.unit_amount === "number" ? money(c.unit_amount, c.currency) + " a month" : "" });
        });
      }
      choices.forEach(function (p) {
        list.appendChild(h("div", { "class": "wa-plan" + (p.offer ? " wa-offer" : ""), "data-product": p.id }, [
          h("div", null, [h("strong", { text: p.name }), h("small", { text: p.sub }), p.price ? h("span", { "class": "wa-price", text: p.price }) : null]),
          h("button", { type: "button", text: "CHOOSE", "aria-label": "Choose " + p.name, onclick: function () { choose(p); } })
        ]));
      });
    });
    return Promise.resolve();
  }

  // Update the card: Stripe's Payment Element inside the overlay (a SetupIntent); the new card pays
  // the next invoices. A card that needs its bank's check shows it in Stripe's own pop-up, in the page.
  function viewCard() {
    if (S.status !== "signed-in") return viewSignIn("view:account");
    var err = errorBox();
    var mount = h("div", { "class": "wa-mount", id: "wa-card-element" }, [h("p", { "class": "wa-muted", style: "padding:10px 0", text: "Loading the card form..." })]);
    var save = h("button", { id: "weyland-card-save", "class": "wa-primary", type: "submit", text: "SAVE THE CARD", disabled: "disabled" });
    var form = h("form", { novalidate: "novalidate" }, [mount, save, h("button", { "class": "wa-secondary", type: "button", text: "Back to the account", onclick: function () { viewAccount(); } }), err]);
    show("Update the card", h("div", { "class": "wa-card wa-wide" }, [
      h("h2", { text: "Update the card" }),
      h("p", { text: "The new card pays your next invoice and the ones after it. You type it into Stripe's form inside this page; the card number never reaches WeylandAI." }),
      form
    ]), "card");
    var seq = S.seq, stripe = null, elements = null, element = null;
    S.cleanup.push(function () { if (element) { try { element.destroy(); } catch (e) {} } });
    accountApi(BILLING.setup, { method: "POST", json: {} }).then(function (r) {
      if (r.status === 409 && r.data && r.data.detail && r.data.detail.code === "no_customer") throw new Error("There is no card on file yet: a card is added when you choose a plan.");
      if (!r.ok || !r.data || !r.data.client_secret) throw new Error(apiMessage(r, "The card form could not be opened"));
      return loadStripe(r.data.stripe_js).then(function (StripeFn) {
        if (seq !== S.seq) return;
        stripe = StripeFn(r.data.publishable_key);
        elements = stripe.elements({ clientSecret: r.data.client_secret, appearance: { theme: "night", variables: { colorPrimary: "#ffd400" } } });
        element = elements.create("payment");
        mount.textContent = "";
        element.mount(mount);
        element.on("ready", function () { save.disabled = false; });
      });
    }).catch(function (e) { mount.textContent = ""; showError(err, (e && e.message) || "The card form could not be opened."); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!stripe || !elements || save.disabled) return;
      err.style.display = "none";
      save.disabled = true; save.textContent = "SAVING THE CARD...";
      stripe.confirmSetup({ elements: elements, redirect: "if_required", confirmParams: { return_url: location.origin + "/#/account" } }).then(function (res) {
        if (res.error) throw new Error(res.error.message || "The card was not accepted.");
        return cardSaved(res.setupIntent || {});
      }).catch(function (e2) { showError(err, (e2 && e2.message) || "The card could not be saved."); save.disabled = false; save.textContent = "SAVE THE CARD"; });
    });
    return Promise.resolve();
  }
  // The SetupIntent succeeded: it becomes the card future invoices charge.
  function cardSaved(si) {
    return accountApi(BILLING.setDefault, { method: "POST", json: { setup_intent_id: si.id || si.setup_intent || "" } }).then(function (r2) {
      if (!r2.ok) throw new Error(apiMessage(r2, "Stripe accepted the card, but it could not be made the card for your plan"));
      var c = (r2.data && (r2.data.card || (r2.data.payment_method && r2.data.payment_method.card))) || {};
      S.flash = "Card saved" + (c.last4 ? ": " + (c.brand ? cap(c.brand) + " " : "") + "ending " + c.last4 : "") + ". It pays your next invoice.";
      return refreshState().then(function () { return viewAccount(); });
    });
  }

  function viewApp(path, fromHistory) {
    var clean = canonicalApp(path);
    var name = appName(clean);
    var frame = h("iframe", { title: name, src: withEmbed(clean) });
    frame.addEventListener("load", function () {
      var w = null, p = "";
      try { w = frame.contentWindow; p = w.location.pathname; } catch (e) { return; }
      // An app page that needs sign-in links to /login: answer it here instead of inside the frame.
      if (p === "/login") { viewSignIn(redirectTarget(w.location.href) || clean); return; }
      watchFrame(frame);
      followFrame(frame);
    });
    show(name, frame, "app");
    S.appFrame = frame;
    if (!fromHistory) record({ wa: "app", path: clean }, clean);
    return Promise.resolve();
  }

  // The address follows the page the app shows (a Finder search, a product page, a room), so a
  // reload or a shared link comes back to that page, not only to the app's first page.
  function followFrame(frame) {
    if (S.appFrame !== frame || S.view !== "app" || S.stepping) return;
    var st = history.state;
    if (!st || st.wa !== "app") return;
    var p = null;
    try { var loc = frame.contentWindow.location; if (loc.origin === location.origin) p = appPathOf(loc.pathname + loc.search + loc.hash); } catch (e) { p = null; }
    if (!p || p === st.path) return;
    var next = copyState(st);
    next.path = p;
    next.waUrl = addressOf(st.base || baseAddress(), p);
    try { history.replaceState(next, "", next.waUrl); } catch (e) {}
  }
  // Same-document moves inside the app (pushState, replaceState, Back within it, #hash) are seen
  // as they happen; a new document in the frame calls this again from its load event.
  function watchFrame(frame) {
    var w = null;
    try { w = frame.contentWindow; if (!w || w.__waShellWatch) return; w.__waShellWatch = true; } catch (e) { return; }
    var follow = function () { followFrame(frame); };
    ["pushState", "replaceState"].forEach(function (m) {
      try {
        var orig = w.history[m];
        if (typeof orig !== "function") return;
        w.history[m] = function () { var r = orig.apply(this, arguments); follow(); return r; };
      } catch (e) {}
    });
    try { w.addEventListener("popstate", follow); w.addEventListener("hashchange", follow); } catch (e) {}
  }

  // ---------- documents: cited price-book pages and catalogue pages, in place ----------
  // Citations point at authenticated routes (/api/cut-sheets/sheet/<id>/pdf and
  // /api/cps/catalogues/<id>/pages/<n>/render). A plain new tab carries no bearer token, so guests saw
  // {"error":"Authentication required"}. Here the document is read with the visitor's own token and
  // drawn by our self-hosted pdf.js, opened at the cited page. Price books run to ~19 MB; their route
  // answers range requests, so only the pages being looked at are downloaded.
  // A PDF the page already holds (opts.blob, e.g. the PropX proposal the homepage just rendered) is
  // shown the same way, instead of a blob URL in a new tab.
  var pdfLibPromise = null;
  function loadPdfLib() {
    if (!pdfLibPromise) {
      pdfLibPromise = import("/assets/pdfjs/pdf.min.mjs").then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.min.mjs";
        return lib;
      });
      pdfLibPromise.catch(function () { pdfLibPromise = null; });
    }
    return pdfLibPromise;
  }

  function viewPdf(opts, fromHistory) {
    opts = opts || {};
    var blob = opts.blob && typeof opts.blob.arrayBuffer === "function" ? opts.blob : null;
    var url = blob ? "" : String(opts.url || "");
    var m = /#page=(\d+)/.exec(url);
    var first = Math.max(1, parseInt(opts.page || (m && m[1]) || "1", 10) || 1);
    var path = url.replace(/#.*$/, "");
    if (!blob && !/^\/api\//.test(path)) return Promise.resolve(); // our own document routes only
    var title = String(opts.title || (blob ? "Document" : "Cited document")).replace(/\s+/g, " ").trim().slice(0, 160);
    // An account document (an invoice) is read as the account: its token, else the session cookie;
    // never the guest token, which the route would take for a different identity.
    var bearer = opts.account ? token() || "" : opts.token || token() || ssGet(EPH_KEY) || "";
    var headers = bearer ? { Authorization: "Bearer " + bearer } : {};
    var status = h("div", { "class": "wa-pdf-status", role: "status", "aria-live": "polite", text: "Opening " + title + "…" });
    var prev = h("button", { type: "button", "class": "wa-pdf-btn", text: "‹ Prev", "aria-label": "Previous page" });
    var label = h("span", { "class": "wa-pdf-page" });
    var next = h("button", { type: "button", "class": "wa-pdf-btn", text: "Next ›", "aria-label": "Next page" });
    var zoomOut = h("button", { type: "button", "class": "wa-pdf-btn", text: "−", "aria-label": "Zoom out" });
    var zoomIn = h("button", { type: "button", "class": "wa-pdf-btn", text: "+", "aria-label": "Zoom in" });
    var save = h("button", { type: "button", "class": "wa-pdf-btn", text: "Download" });
    var stage = h("div", { "class": "wa-pdf-stage" });
    var barKids = [prev, label, next, zoomOut, zoomIn, save];
    if (opts.account) barKids.unshift(h("button", { type: "button", "class": "wa-pdf-btn", text: "‹ Account", "aria-label": "Back to the account", onclick: function () { viewAccount(); } }));
    var wrap = h("div", { "class": "wa-pdf", "data-wa-doc": blob ? "blob" : path }, [h("div", { "class": "wa-pdf-bar" }, barKids), status, stage]);
    var st = { doc: null, task: null, n: first, zoom: 1, alive: true };
    st.stop = function () { st.alive = false; if (st.task) { try { st.task.destroy(); } catch (e) {} } };
    st.go = function (d) { if (st.doc) draw(st.n + d); };
    show(title, wrap, "pdf");
    S.pdf = st;
    if (!fromHistory) {
      var hist = { wa: "pdf", url: url, title: title, page: first, account: !!opts.account };
      if (blob) { hist = { wa: "pdf", blob: keepBlob(blob, title), title: title, page: first }; }
      record(hist, null);
    }
    function say(t) { status.textContent = t; status.style.display = t ? "block" : "none"; }
    function nav() {
      var total = st.doc ? st.doc.numPages : 0;
      label.textContent = total ? "Page " + st.n + " of " + total : "";
      prev.disabled = !total || st.n <= 1;
      next.disabled = !total || st.n >= total;
      zoomOut.disabled = !total || st.zoom <= 1;
      zoomIn.disabled = !total || st.zoom >= 3;
    }
    function draw(n) {
      if (!st.doc || !st.alive) return;
      n = Math.min(Math.max(1, n), st.doc.numPages);
      st.n = n; nav();
      say("Drawing page " + n + "…");
      st.doc.getPage(n).then(function (page) {
        if (!st.alive || st.n !== n) return null;
        var base = page.getViewport({ scale: 1 });
        var fit = Math.max(240, Math.min((S.body.clientWidth || window.innerWidth) - 24, 1000));
        var vp = page.getViewport({ scale: (fit / base.width) * st.zoom });
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var canvas = h("canvas", { "class": "wa-pdf-canvas", role: "img", "aria-label": title + ", page " + n });
        canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = Math.floor(vp.width) + "px"; canvas.style.height = Math.floor(vp.height) + "px";
        return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise.then(function () {
          if (!st.alive || st.n !== n) return;
          stage.textContent = "";
          stage.appendChild(canvas);
          wrap.setAttribute("data-wa-page", String(n));
          say("");
          try { S.body.scrollTop = 0; } catch (e) {}
        });
      }).catch(function (e) { if (st.alive) say("Could not draw page " + n + ": " + ((e && e.message) || e)); });
    }
    function fetchDoc() { return fetch(path, { headers: headers, credentials: "same-origin" }); }
    function getBlob() {
      if (blob) return Promise.resolve(blob);
      return fetchDoc().then(function (r) { if (!r.ok) throw new Error("(" + r.status + ")"); return r.blob(); });
    }
    prev.addEventListener("click", function () { st.go(-1); });
    next.addEventListener("click", function () { st.go(1); });
    zoomIn.addEventListener("click", function () { if (st.doc && st.zoom < 3) { st.zoom += 0.5; draw(st.n); } });
    zoomOut.addEventListener("click", function () { if (st.doc && st.zoom > 1) { st.zoom -= 0.5; draw(st.n); } });
    save.addEventListener("click", function () {
      save.disabled = true; save.textContent = "Downloading…";
      getBlob().catch(function (e) { throw new Error("The download failed " + ((e && e.message) || "") + "."); })
        .then(function (b) {
          var a = h("a", { href: URL.createObjectURL(b), download: (title.replace(/[^\w.,() -]+/g, "").trim() || "document") + ".pdf" });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        })
        .catch(function (e) { say((e && e.message) || "The download failed."); })
        .then(function () { save.disabled = false; save.textContent = "Download"; });
    });
    nav();
    loadPdfLib().then(function (lib) {
      if (!st.alive) return null;
      var src = blob
        ? blob.arrayBuffer().then(function (buf) { return { data: new Uint8Array(buf) }; })
        : Promise.resolve({ url: path, httpHeaders: headers, disableAutoFetch: true, disableStream: true, rangeChunkSize: 524288 });
      return src.then(function (params) {
        if (!st.alive) return null;
        st.task = lib.getDocument(params);
        st.task.onProgress = function (p) {
          if (st.alive && !st.doc && p && p.total > 4194304) say("Reading " + title + " (" + (p.loaded / 1048576).toFixed(1) + " of " + (p.total / 1048576).toFixed(1) + " MB)…");
        };
        return st.task.promise;
      });
    }).then(function (doc) {
      if (!doc) return;
      if (!st.alive) { try { doc.destroy(); } catch (e) {} return; }
      st.doc = doc;
      draw(Math.min(first, doc.numPages));
    }).catch(function (e) {
      if (!st.alive) return null;
      var code = e && (e.status || (e.cause && e.cause.status));
      if (code && !blob) {
        // The route answered with an error: say it in words (its own message), never raw JSON.
        return fetchDoc().then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (d) {
          var msg = d && ((d.error && (d.error.message || d.error)) || d.message);
          say(code === 401 ? "This document needs a session on this page. Reload the page, then open the citation again." : "Could not open this document" + (msg ? ": " + msg : " (" + code + ")."));
        });
      }
      // pdf.js unavailable in this browser: the browser's own viewer, still inside the page.
      return getBlob().then(function (b) {
        if (!st.alive) return;
        stage.textContent = "";
        stage.appendChild(h("iframe", { title: title, "class": "wa-pdf-native", src: URL.createObjectURL(b) + "#page=" + first }));
        say("");
      }).catch(function (e2) { say("Could not open this document " + ((e2 && e2.message) || "")); });
    });
    return Promise.resolve();
  }

  // PDFs handed over as Blobs are kept (the last few) so browser Back/Forward can show them again.
  function keepBlob(blob, title) {
    S.blobs = S.blobs || {};
    S.blobSeq = (S.blobSeq || 0) + 1;
    var key = "b" + S.blobSeq;
    S.blobs[key] = { blob: blob, title: title };
    delete S.blobs["b" + (S.blobSeq - 4)];
    return key;
  }

  function openCreateAccount(continueTo) {
    // The homepage's own create-account dialog upgrades the guest identity (keeping its history)
    // and then calls completeSignup() below; it opens every time it is asked.
    if (typeof window.__weylandOpenCreateAccount !== "function") return false;
    return window.__weylandOpenCreateAccount(continueTo || null) !== false;
  }

  // Signs the visitor in right after the guest identity became a real AuthFor account
  // (POST /api/auth/ephemeral/upgrade answers like a login: token, user, session_id, refresh_token).
  // The AuthFor session is kept exactly as a sign-in keeps it; POST /api/auth/authfor-exchange creates
  // the WeylandAI account (users row, 14-day trial) and the weyland_session cookie; then this page
  // loads the account, so the chip, every homepage call and every app run as it. Rejects with a
  // sentence a person can act on.
  function completeSignup(data, opts) {
    opts = opts || {};
    if (!data || !data.token) return Promise.reject(new Error("Your account was created, but no sign-in came back with it. Sign in with your new email and password."));
    var auth = sdk();
    if (auth && typeof auth._processAuthResponse === "function") auth._processAuthResponse(data);
    else {
      lsSet(TOKEN_KEY, data.token);
      if (data.session_id) lsSet(SESSION_KEY, data.session_id);
      if (data.refresh_token) lsSet(REFRESH_KEY, data.refresh_token);
    }
    return api("/api/auth/authfor-exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authfor_token: data.token }) })
      .then(function (r) {
        if (!r.ok) throw new Error(((r.data && (r.data.message || r.data.error)) || ("The WeylandAI account could not be set up (" + r.status + ")")) + ". Sign in with your new email and password to finish.");
        return refreshState();
      })
      .then(function () {
        if (S.status !== "signed-in") throw new Error("Your account exists, but this page could not load it. Sign in with your new email and password.");
        if (opts.continueTo && opts.continueTo !== "/") continueAfter(opts.continueTo);
        return publicState();
      });
  }

  // ---------- auth state ----------
  function ensureServerSession() {
    return api("/api/auth/session/check").then(function (c) {
      if (c.ok && c.data && c.data.valid) return { ok: true, status: 200 };
      var t = token();
      if (!t) return { ok: false, status: 401 };
      return api("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) });
    });
  }

  function afterAuthFor(continueTo, errBox, provedEmail) {
    return ensureServerSession().then(function (s) {
      // A code sign-in proves the email: purchases held for it (paid with this email while signed
      // out) are added to the account now (fc:payments POST /api/billing/claims; best effort).
      if (provedEmail && s.ok) return accountApi("/api/billing/claims", { method: "POST", json: {} }).then(function () { return s; }, function () { return s; });
      return s;
    }).then(function (s) {
      if (s.status === 404) {
        return refreshState().then(function () { return viewNoAccount((S.user && S.user.email) || "", continueTo); });
      }
      if (!s.ok) { if (errBox) showError(errBox, (s.data && (s.data.message || s.data.error)) || "Signed in, but the WeylandAI session could not be created. Try again."); return; }
      return refreshState().then(function () {
        if (S.status !== "signed-in") { if (errBox) showError(errBox, "Signed in, but your account could not be loaded. Try again."); return; }
        return continueAfter(continueTo);
      });
    });
  }

  function me() { return api("/api/auth/me", { headers: token() ? { Authorization: "Bearer " + token() } : {} }); }

  function refreshState() {
    var t = token();
    if (!t) {
      // No AuthFor sign-in in this browser. A seat bought in the page without signing in signs the
      // buyer in with the weyland_session cookie alone (set when checkout provisioning finishes), so
      // the server is asked whether this browser holds a live session (a guest: valid:false, 200).
      if (S.status === "unknown") setSignedOut();
      return (S.loggingOut || Promise.resolve()).then(function () {
        return api("/api/auth/session/check");
      }).then(function (c) {
        return c.ok && c.data && c.data.valid ? me() : null;
      }).then(function (r) {
        if (token()) return S.status; // signed in through AuthFor meanwhile; that path owns the state
        if (r && r.ok && r.data && r.data.user) setSignedIn(r.data.user, r.data.entitlements);
        else if (S.status !== "signed-out") setSignedOut();
        return S.status;
      });
    }
    return me().then(function (r) {
      if (r.ok && r.data && r.data.user) { setSignedIn(r.data.user, r.data.entitlements); return S.status; }
      if (r.status === 401 && lsGet(REFRESH_KEY) && sdk() && typeof sdk()._refreshSession === "function") {
        return sdk()._refreshSession().then(function () { return me(); }).then(function (r2) {
          if (r2.ok && r2.data && r2.data.user) setSignedIn(r2.data.user, r2.data.entitlements); else setSignedOut();
          return S.status;
        }).catch(function () { setSignedOut(); return S.status; });
      }
      if (r.status === 404) {
        var claims = null;
        try { claims = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) { claims = null; }
        S.user = { email: claims && claims.email || "" };
        S.status = "no-account"; root.dataset.weylandAuth = "no-account"; renderChip(); relabelCtas();
        return S.status;
      }
      setSignedOut();
      return S.status;
    });
  }

  function setSignedIn(user, ent) {
    S.status = "signed-in";
    S.user = user;
    S.ent = ent || null;
    root.dataset.weylandAuth = "signed-in";
    root.dataset.weylandUser = (user.email || "").toLowerCase();
    var t = token();
    if (t) ssSet(EPH_KEY, t); // the homepage's own API calls now run as this account
    renderChip(); relabelCtas();
    renderAccess();
    window.dispatchEvent(new CustomEvent("weyland-auth", { detail: { status: S.status, email: user.email || "" } }));
  }

  function setSignedOut() {
    var hadAccountToken = S.status === "signed-in";
    S.status = "signed-out";
    S.user = null;
    S.ent = null;
    root.dataset.weylandAuth = "signed-out";
    delete root.dataset.weylandUser;
    if (hadAccountToken) ssDel(EPH_KEY);
    renderChip(); relabelCtas();
    renderAccess();
    window.dispatchEvent(new CustomEvent("weyland-auth", { detail: { status: S.status } }));
  }

  // Ends the AuthFor session and the server session, and shows this page signed out at once.
  function endSession() {
    var t = token();
    var sid = lsGet(SESSION_KEY);
    var authfor = t ? fetch(AUTHFOR + "/api/v1/logout", { method: "POST", headers: { "Authorization": "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid }) }).catch(function () {}) : Promise.resolve();
    [TOKEN_KEY, REFRESH_KEY, SESSION_KEY].forEach(lsDel);
    if (S.sdk) { S.sdk._token = null; S.sdk._user = null; S.sdk._refreshToken = null; S.sdk._sessionId = null; if (S.sdk._refreshTimer) clearTimeout(S.sdk._refreshTimer); }
    var local = api("/api/auth/logout", { method: "POST" });
    S.loggingOut = local; // a refresh meanwhile waits for the server session to be gone
    S.status = "signed-in"; // so setSignedOut() also drops the account token from the guest slot
    setSignedOut();
    return Promise.all([authfor, local]);
  }
  // Signs out, then closes the view that was open when sign-out began. A view opened while the
  // logout calls were still out (the sign-in view, from the account control right after SIGN OUT)
  // stays open: before 2026-10-07 it was closed under the visitor's hand.
  function signOut() {
    var seq = S.seq;
    return endSession().then(function () { if (S.seq === seq) return close(); });
  }

  // ---------- one click handler for the whole page ----------
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a,button") : null;
    if (!a || a.closest("#wa-overlay") || a.id === "wa-account-chip") return;
    var href = a.getAttribute("href") || "";
    var isCta = a.classList.contains("js-upgrade-cta");
    var toLogin = /^\/login(\?|$)/.test(href);
    var target = redirectTarget(href);
    var text = (a.getAttribute("data-wa-label") || a.textContent || "").trim();
    if ((isCta || toLogin) && S.status === "signed-in") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (target && target !== "/") viewApp(target); else viewAccount();
      return;
    }
    if (toLogin || (isCta && /\bsign\s*in\b/i.test(text))) {
      e.preventDefault(); e.stopImmediatePropagation();
      var modal = document.getElementById("upgrade-modal");
      if (modal) { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }
      viewSignIn(target);
      return;
    }
    var path = sameOriginPath(href);
    if (path && APPS[appKey(path)] && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault(); e.stopImmediatePropagation();
      viewApp(path);
    }
  }, true);

  // Back and Forward: show the view the entry names (or none).
  window.addEventListener("popstate", function (e) {
    if (S.stepping) { S.stepping(); return; } // the step back closeFromUi() asked for: closed already
    var st = e.state;
    if (st && st.wa && st.waClosed) {
      // Forward onto a view that was closed: open it again, at its own address.
      st = copyState(st);
      delete st.waClosed;
      try { history.replaceState(st, "", st.waUrl || location.href); } catch (err) {}
    }
    if (!(st && st.wa) && viewFromAddress()) { openViewFromAddress(); return; } // #/plans, #/reset?token=... followed or typed
    if (!(st && st.wa) && appFromAddress()) { openFromAddress(); return; } // #/<app> typed or followed: the browser made the entry
    showEntry(st);
  });
  // #/<app> typed into the address bar or followed from a link, when popstate did not show it.
  window.addEventListener("hashchange", function () {
    if (viewFromAddress()) { if (!S.stepping) openViewFromAddress(); return; }
    var p = appFromAddress(), st = history.state;
    if (!p || S.stepping || (S.view === "app" && st && st.wa === "app" && st.path === p)) return;
    openFromAddress();
  });

  function showEntry(st) {
    if (st && st.wa === "app" && st.path) viewApp(st.path, true);
    else if (st && st.wa === "pdf" && st.blob && S.blobs && S.blobs[st.blob]) viewPdf({ blob: S.blobs[st.blob].blob, title: st.title, page: st.page }, true);
    else if (st && st.wa === "pdf" && st.url) viewPdf({ url: st.url, title: st.title, page: st.page, account: !!st.account }, true);
    else if (S.overlay && S.overlay.classList.contains("is-open")) hideOverlay();
  }

  // Opens the app this page's address names (#/<app>): a reload, a shared link, a typed address.
  // The entry becomes the shell's own (state), so the address follows the app and Close returns to
  // the page without the fragment.
  function openFromAddress() {
    var p = appFromAddress();
    if (!p) return false;
    var st = history.state;
    var next = st && st.wa === "app" && !st.waClosed ? copyState(st) : {};
    next.wa = "app";
    next.path = p;
    next.base = next.base || baseAddress();
    next.waUrl = location.pathname + location.search + location.hash;
    try { history.replaceState(next, "", next.waUrl); } catch (e) {}
    viewApp(p, true);
    return true;
  }

  // At load: the view this entry had before a reload (a cited document keeps only its history
  // state; an app also has its address), or the app a shared link names.
  function restoreView() {
    if (location.pathname === "/login") return; // the /login view continues to its own target
    var st = history.state;
    if (st && st.wa === "pdf" && st.url && !st.waClosed) { viewPdf({ url: st.url, title: st.title, page: st.page, account: !!st.account }, true); return; }
    if (openViewFromAddress()) return;
    openFromAddress();
  }

  // Views a link or a typed address opens: #/reset?token=...&email=..., #/plans, #/account, #/signin.
  // The fragment leaves the address at once (a reset token never stays in the address bar or the
  // history; Close leaves the page as it was). The reset view opens at once; the others once this
  // page knows who is signed in.
  var VIEW_ADDR = /^#\/(reset|plans|account|signin)\/?(?:\?(.*))?$/;
  function viewFromAddress() {
    var m = VIEW_ADDR.exec(location.hash || "");
    if (!m) return null;
    var params = {};
    String(m[2] || "").split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      try { params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " ")); } catch (e) {}
    });
    return { name: m[1], params: params };
  }
  function openViewFromAddress() {
    var v = viewFromAddress();
    if (!v) return false;
    var st = history.state;
    try { history.replaceState(st && st.wa ? null : st, "", baseAddress()); } catch (e) {}
    if (v.name === "reset") { viewReset(v.params.token || "", v.params.email || ""); return true; }
    (S.ready || Promise.resolve()).then(function () {
      if (v.name === "plans") { if (S.status === "signed-in") viewPlans(); else viewSignIn("view:plans", v.params.email || ""); }
      else if (v.name === "account") {
        // Back from a card check that had to leave for the bank (Stripe's return_url).
        if (v.params.setup_intent && S.status === "signed-in") {
          if (v.params.redirect_status === "succeeded") cardSaved({ id: v.params.setup_intent }).catch(function (e) { S.flash = null; viewAccount().then(function () { var n = document.getElementById("wa-access-note"); if (n) say(n, e.message, "bad"); }); });
          else { S.flash = null; viewCard(); }
          return;
        }
        if (S.status === "signed-in" || S.status === "no-account") viewAccount(); else viewSignIn("view:account", v.params.email || "");
      }
      else viewSignIn(null, v.params.email || "", v.params.mode || "");
    });
    return true;
  }

  function publicState() {
    var st = history.state;
    return { status: S.status, email: S.user && S.user.email || null, view: S.view, path: S.view === "app" && st && st.wa === "app" ? st.path || null : null,
             access: S.status === "signed-in" ? publicAccess(S.access) : null };
  }

  // A purchase made in this page: the account is loaded again (the plan, the access end date), and
  // a purchase made without signing in (the server session alone, no password) makes the emailed
  // code this browser's sign-in for that email from now on.
  window.addEventListener("weyland-checkout", function (e) {
    var d = (e && e.detail) || {};
    if (d.status !== "active") return;
    refreshState().then(function () {
      if (S.status === "signed-in" && !token() && S.user && S.user.email) rememberCodeSignIn(S.user.email);
    });
  });
  window.WeylandShell = { open: open, close: close, signOut: signOut, refresh: refreshState, completeSignup: completeSignup, state: publicState };
  window.WeylandSignIn = window.WeylandShell;

  function boot() {
    injectStyles();
    renderChip();
    root.dataset.weylandAuth = root.dataset.weylandAuth || "signed-out";
    var ready = null;
    S.ready = new Promise(function (resolve) { ready = resolve; });
    restoreView();
    refreshState().catch(function () {}).then(function () {
      ready();
      if (S.status === "signed-in") ensureServerSession();
      if (location.pathname === "/login") {
        var target = redirectTarget(location.href);
        if (S.status === "signed-in") { history.replaceState(null, "", "/"); if (target && target !== "/") viewApp(target); }
        else viewSignIn(target);
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
