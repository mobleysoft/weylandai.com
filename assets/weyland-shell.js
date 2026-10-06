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
 *   window.WeylandShell.open("signin" | "account" | "app", { path, continueTo })
 *   window.WeylandShell.close(); window.WeylandShell.signOut()   (both resolve; no reloads)
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
  var root = document.documentElement;
  var S = { status: "unknown", user: null, overlay: null, body: null, title: null, chip: null, sdk: null, view: null, appFrame: null };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
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
      "#wa-account-chip .wa-dot{width:8px;height:8px;border-radius:50%;background:#7c8aa5}",
      "html[data-weyland-auth=signed-in] #wa-account-chip .wa-dot{background:#3ddc84}",
      "html[data-weyland-auth=no-account] #wa-account-chip .wa-dot{background:#ffb020}",
      "#wa-overlay{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;background:rgba(6,11,22,.97);color:#e9eef8;font-family:inherit}",
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
      document.body.appendChild(S.chip);
    }
    S.chip.textContent = "";
    S.chip.appendChild(h("span", { "class": "wa-dot", "aria-hidden": "true" }));
    var label = S.status === "signed-in" ? (S.user && S.user.email ? S.user.email.split("@")[0] : "Account")
      : S.status === "no-account" ? "Finish setup" : "Sign in";
    S.chip.appendChild(document.createTextNode(label));
    S.chip.setAttribute("aria-label", S.status === "signed-in" ? "Account: " + (S.user && S.user.email || "") : label);
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
        h("button", { "class": "wa-brand", type: "button", text: "WeylandAI", onclick: function () { close(); } }),
        S.title,
        h("button", { "class": "wa-close", type: "button", text: "Close", onclick: function () { close(); } })
      ]),
      S.body
    ]);
    document.body.appendChild(S.overlay);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.overlay.classList.contains("is-open")) close(); });
  }

  function show(title, node, viewName) {
    ensureOverlay();
    S.view = viewName;
    S.title.textContent = title;
    S.body.textContent = "";
    S.body.appendChild(node);
    S.overlay.classList.add("is-open");
    root.classList.add("wa-overlay-open");
    var first = S.body.querySelector("input,button");
    if (first && viewName !== "app") setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
  }

  function close() {
    if (!S.overlay) return Promise.resolve();
    S.overlay.classList.remove("is-open");
    root.classList.remove("wa-overlay-open");
    S.body.textContent = "";
    S.appFrame = null;
    S.view = null;
    if (history.state && history.state.wa) history.replaceState(null, "", "/");
    else if (location.pathname === "/login") history.replaceState(null, "", "/");
    return Promise.resolve();
  }

  function open(view, opts) {
    opts = opts || {};
    if (view === "signin") return viewSignIn(opts.continueTo || null);
    if (view === "account") return viewAccount();
    if (view === "app") return viewApp(opts.path || "/subx-app");
    return Promise.resolve();
  }

  function errorBox() { return h("div", { "class": "wa-error", role: "alert" }); }
  function showError(box, msg) { box.textContent = msg; box.style.display = "block"; }

  // ---------- views ----------
  function viewSignIn(continueTo) {
    if (S.status === "signed-in") return continueTo ? viewApp(continueTo) : viewAccount();
    var err = errorBox();
    var email = h("input", { id: "weyland-signin-email", type: "email", autocomplete: "email", required: "required", inputmode: "email" });
    var pass = h("input", { id: "weyland-signin-password", type: "password", autocomplete: "current-password", required: "required" });
    var code = h("input", { id: "weyland-signin-code", type: "text", inputmode: "numeric", autocomplete: "one-time-code" });
    var codeWrap = h("div", { style: "display:none" }, [h("label", { "for": "weyland-signin-code", text: "Authenticator code" }), code]);
    var submit = h("button", { id: "weyland-signin-submit", "class": "wa-primary", type: "submit", text: "SIGN IN" });
    var mfa = false;
    var form = h("form", { novalidate: "novalidate", onsubmit: function (e) {
      e.preventDefault();
      err.style.display = "none";
      var auth = sdk();
      if (!auth) { showError(err, "Sign-in is still loading. Try again in a second."); return; }
      submit.disabled = true;
      submit.textContent = "SIGNING IN...";
      var p = mfa ? auth.verifyMFA(code.value.trim()) : auth.login(email.value.trim(), pass.value);
      Promise.resolve(p).then(function (res) {
        if (res && res.mfa_required) {
          mfa = true; codeWrap.style.display = "block"; submit.disabled = false; submit.textContent = "VERIFY CODE";
          setTimeout(function () { code.focus(); }, 30);
          return;
        }
        return afterAuthFor(continueTo, err);
      }).catch(function (e2) {
        showError(err, (e2 && e2.message) || "Sign-in failed. Check the email and password.");
      }).then(function () { if (!mfa || S.status === "signed-in") { submit.disabled = false; submit.textContent = "SIGN IN"; } });
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
        h("button", { "class": "wa-link", type: "button", text: "Create a free account", onclick: function () { close(); openCreateAccount(); } }),
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
      h("button", { "class": "wa-secondary", type: "button", text: "Back to the site", onclick: function () { close(); } }),
      h("button", { id: "weyland-signout", "class": "wa-secondary", type: "button", text: "Sign out", onclick: function () { signOut(); } })
    ]), "account");
    return Promise.resolve();
  }

  function viewApp(path) {
    var clean = path.split("#")[0];
    var name = APPS[clean.split("?")[0]] || "WeylandAI";
    var frame = h("iframe", { title: name, src: clean + (clean.indexOf("?") >= 0 ? "&" : "?") + "embed=1" });
    frame.addEventListener("load", function () {
      // An app page that needs sign-in links to /login: answer it here instead of inside the frame.
      try {
        var p = frame.contentWindow.location.pathname;
        if (p === "/login") viewSignIn(redirectTarget(frame.contentWindow.location.href) || clean);
      } catch (e) {}
    });
    S.appFrame = frame;
    show(name, frame, "app");
    try { history.pushState({ wa: "app", path: clean }, "", clean); } catch (e) {}
    return Promise.resolve();
  }

  function openCreateAccount() {
    // The homepage's own "make this session permanent" dialog keeps the guest session's history.
    var cta = document.querySelector(".js-upgrade-cta");
    if (!cta) return;
    S.bypass = true;
    try { cta.click(); } finally { S.bypass = false; }
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
    if (!t) { setSignedOut(); return Promise.resolve(S.status); }
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
    S.status = "signed-in"; // so setSignedOut() also drops the account token from the guest slot
    setSignedOut();
    return Promise.all([authfor, local]).then(function () { return close(); });
  }

  // ---------- one click handler for the whole page ----------
  document.addEventListener("click", function (e) {
    if (S.bypass) return;
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
    if (path && APPS[path.split("?")[0]] && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault(); e.stopImmediatePropagation();
      viewApp(path);
    }
  }, true);

  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.wa === "app" && e.state.path) viewApp(e.state.path);
    else if (S.overlay && S.overlay.classList.contains("is-open")) { S.overlay.classList.remove("is-open"); root.classList.remove("wa-overlay-open"); S.body.textContent = ""; }
  });

  window.WeylandShell = { open: open, close: close, signOut: signOut, refresh: refreshState, state: function () { return { status: S.status, email: S.user && S.user.email || null, view: S.view }; } };
  window.WeylandSignIn = window.WeylandShell;

  function boot() {
    injectStyles();
    renderChip();
    root.dataset.weylandAuth = root.dataset.weylandAuth || "signed-out";
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
