// weyland-platform-worker/src/lib/embedded-checkout-client.js
//
// The browser half of embedded checkout (2026-10-07), served as
// GET /api/billing/embedded-checkout.js and used by the homepage, /pricing,
// /subscribe and /news: payment happens in the page, in Stripe's own embedded
// form, never on a separate checkout.stripe.com page (sessions are created with
// redirect_on_completion "never").
//
//   WeylandCheckout.open({ product_id, quantity?, return_to?, name?, container? })
//     -> opens a modal (or mounts into `container`) with a short Terms step:
//        what is being bought (price from GET /api/billing/catalog; for the $100
//        first-submittal offer "No automatic charge"), and a required checkbox
//        accepting the Terms of Service and the Privacy Policy (Argo LLC). Only
//        then it creates the session (POST /api/billing/checkout/embedded with
//        terms_accepted:true; the acceptance is stored with the purchase), loads
//        Stripe.js (js.stripe.com - Stripe requires that; it cannot be
//        self-hosted) and mounts the form. On completion it polls
//        GET /api/billing/checkout/status/:session_id until the purchase is
//        applied: "active" (granted; the session cookie comes with it when the
//        purchase made this browser's account) or "held" (the email belongs to
//        an existing account: signing in to it, here or with an emailed code,
//        adds the purchase), then calls WeylandShell.refresh() where present.
//   WeylandCheckout.resume() -> finishes ?checkout=return|success&session_id=
//        left by sessions made before 2026-10-07 (runs automatically on load).
//   window event "weyland-checkout" {detail:{status, session_id, product_id}}:
//        terms | open | complete | active | held | paid_pending | closed | error
//
// Written without template literals so it can live inside one. The Terms and
// Privacy URLs are written in by the route that serves it (embeddedCheckoutJs).

import { termsUrls } from "./legal.js";

export const EMBEDDED_CHECKOUT_JS = `(function () {
  "use strict";
  if (window.WeylandCheckout) return;
  var API = "/api/billing/checkout/embedded";
  var TERMS_URL = "__WEYLAND_TERMS_URL__";
  var PRIVACY_URL = "__WEYLAND_PRIVACY_URL__";
  var OFFER = "weyland-first-submittal";
  var SUPPORT = "support@weylandai.com";
  var stripeJsPromise = null;
  var catalogPromise = null;
  var state = { modal: null, container: null, embedded: null, sessionId: null, productId: null, productName: null, polling: false, opts: null, termsDone: null };

  function loadStripeJs(src) {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripeJsPromise) return stripeJsPromise;
    stripeJsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { if (window.Stripe) resolve(window.Stripe); else reject(new Error("Stripe.js did not load.")); };
      s.onerror = function () { stripeJsPromise = null; reject(new Error("Stripe.js could not be loaded.")); };
      document.head.appendChild(s);
    });
    return stripeJsPromise;
  }

  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch("/api/billing/catalog", { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : { products: [] }; })
        .catch(function () { catalogPromise = null; return { products: [] }; });
    }
    return catalogPromise;
  }

  function money(cents, currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: String(currency || "usd").toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
    } catch (e) { return "$" + (cents / 100); }
  }

  function longDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try { return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); } catch (e) { return iso.slice(0, 10); }
  }

  function injectCss() {
    if (document.getElementById("wco-style")) return;
    var st = document.createElement("style");
    st.id = "wco-style";
    st.textContent = [
      "html.wco-open{overflow:hidden}",
      ".wco-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(5,8,14,.74);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}",
      ".wco-panel{position:relative;width:min(600px,100%);max-height:calc(100dvh - 24px);overflow:auto;-webkit-overflow-scrolling:touch;background:#000;color:#f3f6fa;border:1px solid #263148;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:18px 18px 16px;box-sizing:border-box;font:400 14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
      ".wco-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 12px}",
      ".wco-kicker{font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;color:#9aa5b8}",
      ".wco-title{font:700 17px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin-top:4px}",
      ".wco-close{flex:0 0 auto;width:44px;height:44px;border:1px solid #263148;border-radius:10px;background:#111726;color:#f3f6fa;font:400 26px/1 sans-serif;cursor:pointer}",
      ".wco-close:hover{background:#1a2236}",
      ".wco-status{display:none;margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#111726;color:#dfe5f0}",
      ".wco-status.wco-good{background:#0f2a1a;color:#8ee6ad}",
      ".wco-status.wco-bad{background:#2c1214;color:#ffb3b3}",
      ".wco-status.wco-warn{background:#2a2207;color:#ffd666}",
      ".wco-mount{min-height:40px}",
      ".wco-terms{display:flex;flex-direction:column;gap:14px}",
      ".wco-sum{border:1px solid #263148;border-radius:12px;padding:14px 16px;background:#0a0f1a}",
      ".wco-sum-price{font:800 26px/1.15 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-.01em}",
      ".wco-sum-list{margin:10px 0 0;padding-left:18px;color:#c9d2e0}",
      ".wco-sum-list li{margin:4px 0}",
      ".wco-check{display:flex;gap:10px;align-items:flex-start;cursor:pointer;color:#dfe5f0}",
      ".wco-check input{width:22px;height:22px;margin:1px 0 0;flex:0 0 auto;accent-color:#2a52ff}",
      ".wco-check a{color:#8fb0ff}",
      ".wco-continue{display:block;width:100%;min-height:48px;border:0;border-radius:10px;background:#2a52ff;color:#fff;font:700 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.06em;cursor:pointer}",
      ".wco-continue:disabled{opacity:.45;cursor:not-allowed}",
      ".wco-foot{margin-top:12px;font-size:12px;color:#9aa5b8}",
      ".wco-done{display:block;width:100%;margin-top:12px;min-height:44px;border:0;border-radius:10px;background:#2a52ff;color:#fff;font:700 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:.06em;cursor:pointer}",
      "@media (max-width:600px){.wco-backdrop{padding:0;align-items:stretch}.wco-panel{width:100%;max-height:none;height:100dvh;border-radius:0;padding:14px 12px calc(14px + env(safe-area-inset-bottom,0px))}}"
    ].join("\\n");
    document.head.appendChild(st);
  }

  function onKey(e) { if (e.key === "Escape" && state.modal && !state.polling) close("closed"); }

  function buildModal(title) {
    injectCss();
    var wrap = document.createElement("div");
    wrap.className = "wco-backdrop";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "Secure checkout");
    wrap.innerHTML = '<div class="wco-panel"><div class="wco-head"><div><div class="wco-kicker">SECURE CHECKOUT</div><div class="wco-title"></div></div><button type="button" class="wco-close" aria-label="Close checkout">&times;</button></div><div class="wco-status" aria-live="polite"></div><div class="wco-mount"></div><div class="wco-foot">Payment is handled by Stripe inside this page. Card details never touch WeylandAI servers. WeylandAI is operated by Argo LLC.</div></div>';
    wrap.querySelector(".wco-title").textContent = title || "WeylandAI";
    wrap.querySelector(".wco-close").addEventListener("click", function () { close("closed"); });
    wrap.addEventListener("click", function (e) { if (e.target === wrap && !state.polling) close("closed"); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    document.documentElement.classList.add("wco-open");
    return wrap;
  }

  function setStatus(text, kind) {
    var el = state.modal ? state.modal.querySelector(".wco-status") : null;
    if (!el) return;
    el.textContent = text || "";
    el.className = "wco-status" + (kind ? " wco-" + kind : "");
    el.style.display = text ? "block" : "none";
  }

  function setTitle(text) {
    var t = state.modal && state.modal.querySelector(".wco-title");
    if (t && text) t.textContent = text;
  }

  function mountEl() { return state.container || (state.modal && state.modal.querySelector(".wco-mount")); }

  function emit(detail) {
    try { window.dispatchEvent(new CustomEvent("weyland-checkout", { detail: detail })); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.dispatchEvent(new window.parent.CustomEvent("weyland-checkout", { detail: detail })); } catch (e) {}
  }

  function refreshShell() {
    [window, window.parent, window.top].forEach(function (w) {
      try { if (w && w.WeylandShell && typeof w.WeylandShell.refresh === "function") w.WeylandShell.refresh(); } catch (e) {}
    });
  }

  // The shell's sign-in view (top-most page that has the shell), unless that page is already signed in.
  function openSignIn(mode) {
    var wins = [window.top, window.parent, window];
    for (var i = 0; i < wins.length; i++) {
      try {
        var w = wins[i];
        if (w && w.WeylandShell && typeof w.WeylandShell.open === "function") {
          if (w.document && w.document.documentElement && w.document.documentElement.dataset.weylandAuth === "signed-in") return;
          setTimeout(function () { try { w.WeylandShell.open("signin", mode ? { mode: mode } : {}); } catch (e) {} }, 1800);
          return;
        }
      } catch (e) {}
    }
  }

  function addDone() {
    if (!state.modal || state.modal.querySelector(".wco-done")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "wco-done";
    b.textContent = "DONE";
    b.addEventListener("click", function () { close(null); });
    state.modal.querySelector(".wco-panel").appendChild(b);
  }

  function close(reason) {
    if (state.termsDone) { var done = state.termsDone; state.termsDone = null; done(false); }
    try { if (state.embedded) state.embedded.destroy(); } catch (e) {}
    state.embedded = null;
    if (state.modal) { state.modal.remove(); state.modal = null; }
    else if (state.container) { try { state.container.innerHTML = ""; } catch (e) {} }
    document.documentElement.classList.remove("wco-open");
    document.removeEventListener("keydown", onKey);
    state.polling = false;
    if (reason) emit({ status: reason, session_id: state.sessionId, product_id: state.productId });
  }

  function pollActivation(sessionId) {
    state.polling = true;
    var tries = 0;
    function tick() {
      if (!state.polling) return;
      tries += 1;
      fetch("/api/billing/checkout/status/" + encodeURIComponent(sessionId), { cache: "no-store", credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.status === "active") {
            state.polling = false;
            var what = state.productName || "Your purchase";
            var until = d.access_ends_at ? " Every WeylandAI product is open until " + longDate(d.access_ends_at) + "." : "";
            if (d.signed_in === false) {
              setStatus(what + " is on the WeylandAI account for the email you paid with." + until + " Sign in with that email to use it.", "good");
              refreshShell();
              openSignIn("code");
            } else {
              setStatus(what + " is active and you are signed in." + until, "good");
              refreshShell();
            }
            emit({ status: "active", session_id: sessionId, product_id: state.productId, quantity: d.quantity, access_ends_at: d.access_ends_at || null });
            addDone();
            return;
          }
          if (d && d.status === "held") {
            state.polling = false;
            setStatus("Payment received. The email you paid with" + (d.email_hint ? " (" + d.email_hint + ")" : "") + " already has a WeylandAI account, so the purchase waits for that account: sign in to it on this page, or with a code we email to that address, and it is added at once.", "warn");
            emit({ status: "held", session_id: sessionId, product_id: state.productId, email_hint: d.email_hint || null });
            refreshShell();
            openSignIn("code");
            addDone();
            return;
          }
          if (tries < 40) { setTimeout(tick, 1500); return; }
          state.polling = false;
          setStatus("Payment received. Your account is still being set up and appears here as soon as it is ready (reference " + sessionId.slice(-8) + "; questions: " + SUPPORT + ").", "warn");
          emit({ status: "paid_pending", session_id: sessionId, product_id: state.productId });
          addDone();
        })
        .catch(function () { if (tries < 40) setTimeout(tick, 1500); });
    }
    tick();
  }

  function onComplete() {
    try { if (state.embedded) state.embedded.destroy(); } catch (e) {}
    state.embedded = null;
    var m = mountEl();
    if (m) m.innerHTML = "";
    setStatus("Payment received. Activating " + (state.productName || "your purchase") + "\\u2026", "");
    emit({ status: "complete", session_id: state.sessionId, product_id: state.productId });
    pollActivation(state.sessionId);
  }

  function authHeader() {
    try { var t = localStorage.getItem("_authfor_token"); return t ? { Authorization: "Bearer " + t } : {}; } catch (e) { return {}; }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function link(href, text) {
    var a = el("a", null, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  // Step 1: what is bought, and the Terms. Resolves when the buyer accepts.
  function termsStep(opts, quantity) {
    return new Promise(function (resolveOnce) {
      var settled = false;
      function resolve(v) { if (settled) return; settled = true; if (state.termsDone === resolve) state.termsDone = null; resolveOnce(v); }
      state.termsDone = resolve;
      var m = mountEl();
      if (!m) { resolve(false); return; }
      m.innerHTML = "";
      var isOffer = opts.product_id === OFFER;
      var box = el("div", "wco-terms");
      var sum = el("div", "wco-sum");
      var priceLine = el("div", "wco-sum-price", "\\u2026");
      var list = el("ul", "wco-sum-list");
      var points = isOffer
        ? ["Your first submittal and 30 days of every WeylandAI product.", "One-time payment. No automatic charge: before the 30 days end we ask you to choose a plan; without one, the paid tools stop on day 30 and your account and work stay."]
        : ["Billed today and then monthly until you cancel.", "Cancel any time in your WeylandAI account; access runs to the end of the paid month."];
      points.forEach(function (p) { list.appendChild(el("li", null, p)); });
      sum.appendChild(priceLine);
      sum.appendChild(list);
      var check = el("label", "wco-check");
      var box1 = document.createElement("input");
      box1.type = "checkbox";
      box1.className = "wco-agree";
      var words = el("span");
      words.appendChild(document.createTextNode("I agree to the "));
      words.appendChild(link(TERMS_URL, "Terms of Service"));
      words.appendChild(document.createTextNode(" and the "));
      words.appendChild(link(PRIVACY_URL, "Privacy Policy"));
      words.appendChild(document.createTextNode(". WeylandAI is operated by Argo LLC."));
      check.appendChild(box1);
      check.appendChild(words);
      var go = el("button", "wco-continue", "CONTINUE TO PAYMENT");
      go.type = "button";
      go.disabled = true;
      box1.addEventListener("change", function () { go.disabled = !box1.checked; });
      go.addEventListener("click", function () {
        if (!box1.checked) return;
        go.disabled = true;
        // The step leaves the screen at once; the payment form takes its place.
        if (box.parentNode) box.parentNode.removeChild(box);
        resolve(true);
      });
      box.appendChild(sum);
      box.appendChild(check);
      box.appendChild(go);
      m.appendChild(box);
      emit({ status: "terms", product_id: opts.product_id });
      catalog().then(function (c) {
        var p = (c.products || []).filter(function (x) { return x.id === opts.product_id; })[0];
        if (!p || p.unit_amount === undefined || p.unit_amount === null) { priceLine.textContent = opts.name || "WeylandAI"; return; }
        if (p.name) { state.productName = p.name; setTitle(p.name); }
        priceLine.textContent = isOffer || p.one_time
          ? money(p.unit_amount, p.currency) + " one-time"
          : money(p.unit_amount * quantity, p.currency) + " per " + (p.interval || "month") + (quantity > 1 ? " (" + quantity + " seats)" : "");
      });
    });
  }

  function createAndMount(opts, quantity) {
    setStatus("Opening secure checkout\\u2026", "");
    var returnTo = opts.return_to || (location.pathname + location.search + location.hash);
    var headers = authHeader();
    headers["Content-Type"] = "application/json";
    return fetch(API, { method: "POST", credentials: "same-origin", headers: headers, body: JSON.stringify({ product_id: opts.product_id, quantity: quantity, return_to: returnTo, terms_accepted: true }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var d = res.d || {};
        if (!res.ok || !d.client_secret) {
          var err = new Error((d.detail && d.detail.message) || d.error || "Checkout is unavailable right now.");
          err.code = d.detail && d.detail.code;
          throw err;
        }
        state.sessionId = d.session_id;
        if (d.product && d.product.name) {
          state.productName = d.product.name;
          var price = d.product.unit_amount ? " \\u00b7 " + money(d.product.unit_amount * quantity, d.product.currency) + (d.product.one_time ? " one-time" : " per " + (d.product.interval || "month")) : "";
          setTitle(d.product.name + price);
        }
        var m = mountEl();
        if (m) m.innerHTML = "";
        return loadStripeJs(d.stripe_js).then(function (StripeFn) {
          var stripe = StripeFn(d.publishable_key);
          var create = stripe.createEmbeddedCheckoutPage || stripe.initEmbeddedCheckout;
          return create.call(stripe, { fetchClientSecret: function () { return Promise.resolve(d.client_secret); }, onComplete: onComplete });
        });
      })
      .then(function (embedded) {
        if (!state.modal && !state.container) { try { embedded.destroy(); } catch (e) {} return null; }
        state.embedded = embedded;
        setStatus("", "");
        embedded.mount(mountEl());
        emit({ status: "open", session_id: state.sessionId, product_id: state.productId });
        return { session_id: state.sessionId };
      });
  }

  function open(opts) {
    opts = opts || {};
    if (state.modal || state.embedded) close(null);
    state.opts = opts;
    state.productId = opts.product_id || null;
    state.productName = opts.name || null;
    state.sessionId = null;
    state.container = opts.container || null;
    if (!state.container) state.modal = buildModal(opts.name || "WeylandAI");
    else injectCss();
    var quantity = opts.product_id === OFFER ? 1 : Math.max(1, parseInt(opts.quantity, 10) || 1);
    // Resolves once the checkout is on screen (its Terms step); the payment form
    // follows when the buyer accepts. Closing it settles everything.
    termsStep(opts, quantity)
      .then(function (accepted) {
        if (!accepted || (!state.modal && !state.container)) return null;
        return createAndMount(opts, quantity);
      })
      .catch(function (err) {
        var m = mountEl();
        if (m) m.innerHTML = "";
        if (err && err.code === "offer_used") setStatus(err.message, "warn");
        else setStatus("Checkout did not open: " + ((err && err.message) || "unknown error") + " Try again in a minute; if it keeps failing, write to " + SUPPORT + ".", "bad");
        emit({ status: "error", product_id: state.productId, message: err && err.message, code: err && err.code });
        addDone();
        return null;
      });
    return Promise.resolve({ open: true, stage: "terms", product_id: state.productId });
  }

  // Sessions made before 2026-10-07 could come back to the page with
  // ?checkout=return|success&session_id=: finish them here.
  function resume() {
    var p = new URLSearchParams(location.search);
    var sid = p.get("session_id");
    var kind = p.get("checkout");
    if ((kind !== "return" && kind !== "success") || !sid || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sid)) return false;
    state.sessionId = sid;
    state.modal = buildModal("Checkout");
    setStatus("Checking your payment\\u2026", "");
    try {
      p.delete("checkout");
      p.delete("session_id");
      history.replaceState(history.state, "", location.pathname + (p.toString() ? "?" + p.toString() : "") + location.hash);
    } catch (e) {}
    fetch("/api/billing/checkout/session/" + encodeURIComponent(sid), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.productId = d.product_id || null;
        if (d.status === "complete") { setStatus("Payment received. Activating\\u2026", ""); pollActivation(sid); }
        else if (d.status === "open") { setStatus("The payment was not completed, so nothing was charged. You can try again.", "bad"); addDone(); }
        else { setStatus("This checkout expired. Nothing was charged.", "bad"); addDone(); }
      })
      .catch(function () { setStatus("Could not read the checkout result. Write to " + SUPPORT + " with reference " + sid.slice(-8) + ".", "bad"); addDone(); });
    return true;
  }

  window.WeylandCheckout = {
    open: open,
    close: function () { close("closed"); },
    resume: resume,
    state: function () { return { session_id: state.sessionId, product_id: state.productId, open: !!(state.modal || state.embedded), polling: state.polling }; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", resume); else resume();
})();
`;

/** The helper with this deployment's Terms and Privacy URLs written in. */
export function embeddedCheckoutJs(env = {}) {
  const legal = termsUrls(env);
  return EMBEDDED_CHECKOUT_JS
    .replace("__WEYLAND_TERMS_URL__", legal.terms_url.replace(/["\\]/g, ""))
    .replace("__WEYLAND_PRIVACY_URL__", legal.privacy_url.replace(/["\\]/g, ""));
}
