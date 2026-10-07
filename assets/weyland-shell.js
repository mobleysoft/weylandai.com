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
 *   window.WeylandShell.close(); window.WeylandShell.signOut()   (both resolve; no reloads)
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
               "/pricing": "Plans and pricing", "/wire": "News", "/news": "News" };
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
  var S = { status: "unknown", user: null, overlay: null, body: null, title: null, chip: null, sdk: null, view: null, appFrame: null, stepping: null, afterStep: [] };

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
    S.overlay = h("div", { id: "wa-overlay", role: "dialog", "aria-modal": "true", "aria-label": "WeylandAI" }, [
      h("div", { "class": "wa-bar" }, [
        h("button", { "class": "wa-brand", type: "button", text: "WeylandAI", onclick: function () { closeFromUi(); } }),
        S.title,
        h("button", { "class": "wa-close", type: "button", text: "Close", onclick: function () { closeFromUi(); } })
      ]),
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

  // Whatever the previous view held that keeps working in the background (a pdf.js document) stops here.
  function teardown() {
    if (S.pdf) { try { S.pdf.stop(); } catch (e) {} S.pdf = null; }
    S.appFrame = null;
  }

  function show(title, node, viewName) {
    ensureOverlay();
    teardown();
    var wasOpen = S.overlay.classList.contains("is-open");
    S.view = viewName;
    S.title.textContent = title;
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
    if (view === "signin") return viewSignIn(opts.continueTo || null, opts.email || "");
    if (view === "account") return viewAccount();
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
  function viewSignIn(continueTo, prefillEmail) {
    if (S.status === "signed-in") return continueTo ? viewApp(continueTo) : viewAccount();
    // Signed in at AuthFor, no WeylandAI account yet: the next step is setting it up, not a password.
    if (S.status === "no-account") return viewNoAccount((S.user && S.user.email) || "", continueTo);
    var err = errorBox();
    var email = h("input", { id: "weyland-signin-email", type: "email", autocomplete: "email", required: "required", inputmode: "email" });
    if (prefillEmail) email.value = prefillEmail;
    var pass = h("input", { id: "weyland-signin-password", type: "password", autocomplete: "current-password", required: "required" });
    var code = h("input", { id: "weyland-signin-code", type: "text", inputmode: "numeric", autocomplete: "one-time-code" });
    var codeWrap = h("div", { style: "display:none" }, [h("label", { "for": "weyland-signin-code", text: "Authenticator code" }), code]);
    var submit = h("button", { id: "weyland-signin-submit", "class": "wa-primary", type: "submit", text: "SIGN IN" });
    var mfa = false;
    var inflight = false;
    var form = h("form", { novalidate: "novalidate", onsubmit: function (e) {
      e.preventDefault();
      if (inflight) return; // one attempt at a time; a second submit never races the first
      err.style.display = "none";
      var em = email.value.trim(), pw = pass.value;
      if (!mfa && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { showError(err, "Enter the email your WeylandAI account uses."); email.focus(); return; }
      if (!mfa && !pw) { showError(err, "Enter your password."); pass.focus(); return; }
      if (mfa && !code.value.trim()) { showError(err, "Enter the code from your authenticator app."); code.focus(); return; }
      var auth = sdk();
      if (!auth) { showError(err, "Sign-in is still loading. Try again in a second."); return; }
      inflight = true;
      var started = Date.now();
      var stage = "Checking your password";
      submit.disabled = true; email.disabled = true; pass.disabled = true;
      var tick = setInterval(function () {
        var secs = Math.round((Date.now() - started) / 1000);
        submit.textContent = stage.toUpperCase() + "... " + secs + "s";
        if (secs >= 25) showError(err, "This is taking longer than it should. You can wait, or close and try again.");
      }, 500);
      function done() { clearInterval(tick); inflight = false; submit.disabled = false; email.disabled = false; pass.disabled = false; submit.textContent = mfa ? "VERIFY CODE" : "SIGN IN"; }
      var p = mfa ? auth.verifyMFA(code.value.trim()) : authforLogin(auth, em, pw);
      Promise.resolve(p).then(function (res) {
        if (res && res.mfa_required) {
          mfa = true; codeWrap.style.display = "block"; done();
          try { code.focus({ preventScroll: true }); } catch (e) {}
          return;
        }
        stage = "Opening your account";
        return afterAuthFor(continueTo, err);
      }).catch(function (e2) {
        showError(err, (e2 && e2.message) || "Sign-in failed. Check the email and password.");
      }).then(done);
    } }, [
      h("label", { "for": "weyland-signin-email", text: "Email" }), email,
      h("label", { "for": "weyland-signin-password", text: "Password" }), pass,
      codeWrap, submit, err
    ]);
    var card = h("div", { "class": "wa-card" }, [
      h("h2", { text: "Sign in to WeylandAI" }),
      h("p", { text: "One account across SubX, TakeOffX, CutsheetX, SightX, PropX, MeetingX and HuntX." }),
      form,
      h("p", { style: "margin:18px 0 0" }, [
        "New here? ",
        h("button", { "class": "wa-link", type: "button", text: "Create a free account", onclick: function () {
          if (typeof window.__weylandOpenCreateAccount !== "function") { showError(err, "Account creation opens from the WeylandAI homepage."); return; }
          close(); openCreateAccount(continueTo);
        } }),
        " ",
        h("span", { text: "or close this and paste a spec line to try it with no account." })
      ]),
      h("p", { style: "margin:10px 0 0" }, [h("button", { "class": "wa-link", type: "button", text: "Forgot password?", onclick: function () {
        if (!email.value) { showError(err, "Type your email above first, then choose Forgot password."); return; }
        fetch("https://authfor.com/api/v1/password/reset-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.value.trim() }) }).catch(function () {});
        showError(err, "If that email has an account, a reset link is on its way.");
      } })])
    ]);
    show("Sign in", card, "signin");
    return Promise.resolve();
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
      h("p", { text: "You are signed in as " + email + ". Start a free 14-day trial on it, or sign in with the email your WeylandAI account uses." }),
      start,
      h("button", { "class": "wa-secondary", type: "button", text: "Use a different email", onclick: function () { signOut().then(function () { viewSignIn(continueTo); }); } }),
      err
    ]), "no-account");
    return Promise.resolve();
  }

  function viewAccount() {
    if (S.status === "no-account") return viewNoAccount(S.user && S.user.email || "", null);
    if (S.status !== "signed-in") return viewSignIn(null);
    var u = S.user || {};
    var plan = (u.subscription_tier || "trial") + (u.subscription_status ? " (" + u.subscription_status + ")" : "");
    var rows = [["Signed in as", u.email || ""], ["Plan", plan]];
    if (u.trial_ends_at) rows.push(["Trial ends", String(u.trial_ends_at).slice(0, 10)]);
    show("Account", h("div", { "class": "wa-card" }, [
      h("h2", { text: u.name || "Your account" }),
      h("div", null, rows.map(function (r) { return h("div", { "class": "wa-row" }, [h("span", { text: r[0] }), h("span", { text: r[1] })]); })),
      h("button", { "class": "wa-primary", type: "button", text: "OPEN SUBX", onclick: function () { viewApp("/subx-app"); } }),
      h("button", { "class": "wa-secondary", type: "button", text: "Back to the site", onclick: function () { closeFromUi(); } }),
      h("button", { id: "weyland-signout", "class": "wa-secondary", type: "button", text: "Sign out", onclick: function () { signOut(); } })
    ]), "account");
    return Promise.resolve();
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
    var bearer = opts.token || token() || ssGet(EPH_KEY) || "";
    var headers = bearer ? { Authorization: "Bearer " + bearer } : {};
    var status = h("div", { "class": "wa-pdf-status", role: "status", "aria-live": "polite", text: "Opening " + title + "…" });
    var prev = h("button", { type: "button", "class": "wa-pdf-btn", text: "‹ Prev", "aria-label": "Previous page" });
    var label = h("span", { "class": "wa-pdf-page" });
    var next = h("button", { type: "button", "class": "wa-pdf-btn", text: "Next ›", "aria-label": "Next page" });
    var zoomOut = h("button", { type: "button", "class": "wa-pdf-btn", text: "−", "aria-label": "Zoom out" });
    var zoomIn = h("button", { type: "button", "class": "wa-pdf-btn", text: "+", "aria-label": "Zoom in" });
    var save = h("button", { type: "button", "class": "wa-pdf-btn", text: "Download" });
    var stage = h("div", { "class": "wa-pdf-stage" });
    var wrap = h("div", { "class": "wa-pdf", "data-wa-doc": blob ? "blob" : path }, [h("div", { "class": "wa-pdf-bar" }, [prev, label, next, zoomOut, zoomIn, save]), status, stage]);
    var st = { doc: null, task: null, n: first, zoom: 1, alive: true };
    st.stop = function () { st.alive = false; if (st.task) { try { st.task.destroy(); } catch (e) {} } };
    st.go = function (d) { if (st.doc) draw(st.n + d); };
    show(title, wrap, "pdf");
    S.pdf = st;
    if (!fromHistory) {
      var hist = { wa: "pdf", url: url, title: title, page: first };
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
        if (opts.continueTo && opts.continueTo !== "/") viewApp(opts.continueTo);
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

  function afterAuthFor(continueTo, errBox) {
    return ensureServerSession().then(function (s) {
      if (s.status === 404) {
        return refreshState().then(function () { return viewNoAccount((S.user && S.user.email) || "", continueTo); });
      }
      if (!s.ok) { if (errBox) showError(errBox, (s.data && (s.data.message || s.data.error)) || "Signed in, but the WeylandAI session could not be created. Try again."); return; }
      return refreshState().then(function () {
        if (S.status !== "signed-in") { if (errBox) showError(errBox, "Signed in, but your account could not be loaded. Try again."); return; }
        if (continueTo && continueTo !== "/") return viewApp(continueTo);
        return close();
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
        if (r && r.ok && r.data && r.data.user) setSignedIn(r.data.user);
        else if (S.status !== "signed-out") setSignedOut();
        return S.status;
      });
    }
    return me().then(function (r) {
      if (r.ok && r.data && r.data.user) { setSignedIn(r.data.user); return S.status; }
      if (r.status === 401 && lsGet(REFRESH_KEY) && sdk() && typeof sdk()._refreshSession === "function") {
        return sdk()._refreshSession().then(function () { return me(); }).then(function (r2) {
          if (r2.ok && r2.data && r2.data.user) setSignedIn(r2.data.user); else setSignedOut();
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

  function setSignedIn(user) {
    S.status = "signed-in";
    S.user = user;
    root.dataset.weylandAuth = "signed-in";
    root.dataset.weylandUser = (user.email || "").toLowerCase();
    var t = token();
    if (t) ssSet(EPH_KEY, t); // the homepage's own API calls now run as this account
    renderChip(); relabelCtas();
    window.dispatchEvent(new CustomEvent("weyland-auth", { detail: { status: S.status, email: user.email || "" } }));
  }

  function setSignedOut() {
    var hadAccountToken = S.status === "signed-in";
    S.status = "signed-out";
    S.user = null;
    root.dataset.weylandAuth = "signed-out";
    delete root.dataset.weylandUser;
    if (hadAccountToken) ssDel(EPH_KEY);
    renderChip(); relabelCtas();
    window.dispatchEvent(new CustomEvent("weyland-auth", { detail: { status: S.status } }));
  }

  function signOut() {
    var t = token();
    var sid = lsGet(SESSION_KEY);
    var authfor = t ? fetch("https://authfor.com/api/v1/logout", { method: "POST", headers: { "Authorization": "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid }) }).catch(function () {}) : Promise.resolve();
    [TOKEN_KEY, REFRESH_KEY, SESSION_KEY].forEach(lsDel);
    if (S.sdk) { S.sdk._token = null; S.sdk._user = null; S.sdk._refreshToken = null; S.sdk._sessionId = null; if (S.sdk._refreshTimer) clearTimeout(S.sdk._refreshTimer); }
    var local = api("/api/auth/logout", { method: "POST" });
    S.loggingOut = local; // a refresh meanwhile waits for the server session to be gone
    S.status = "signed-in"; // so setSignedOut() also drops the account token from the guest slot
    setSignedOut();
    return Promise.all([authfor, local]).then(function () { return close(); });
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
    if (!(st && st.wa) && appFromAddress()) { openFromAddress(); return; } // #/<app> typed or followed: the browser made the entry
    showEntry(st);
  });
  // #/<app> typed into the address bar or followed from a link, when popstate did not show it.
  window.addEventListener("hashchange", function () {
    var p = appFromAddress(), st = history.state;
    if (!p || S.stepping || (S.view === "app" && st && st.wa === "app" && st.path === p)) return;
    openFromAddress();
  });

  function showEntry(st) {
    if (st && st.wa === "app" && st.path) viewApp(st.path, true);
    else if (st && st.wa === "pdf" && st.blob && S.blobs && S.blobs[st.blob]) viewPdf({ blob: S.blobs[st.blob].blob, title: st.title, page: st.page }, true);
    else if (st && st.wa === "pdf" && st.url) viewPdf({ url: st.url, title: st.title, page: st.page }, true);
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
    if (st && st.wa === "pdf" && st.url && !st.waClosed) { viewPdf({ url: st.url, title: st.title, page: st.page }, true); return; }
    openFromAddress();
  }

  function publicState() {
    var st = history.state;
    return { status: S.status, email: S.user && S.user.email || null, view: S.view, path: S.view === "app" && st && st.wa === "app" ? st.path || null : null };
  }
  window.WeylandShell = { open: open, close: close, signOut: signOut, refresh: refreshState, completeSignup: completeSignup, state: publicState };
  window.WeylandSignIn = window.WeylandShell;

  function boot() {
    injectStyles();
    renderChip();
    root.dataset.weylandAuth = root.dataset.weylandAuth || "signed-out";
    restoreView();
    refreshState().then(function () {
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
