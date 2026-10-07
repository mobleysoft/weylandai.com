// weyland-platform-worker/src/lib/embedded-checkout-client.js
//
// The browser half of embedded checkout (2026-10-07), served as
// GET /api/billing/embedded-checkout.js and used by /pricing and /news (and
// available to any weylandai.com page): payment happens in the page, in
// Stripe's own embedded form, never on a separate checkout.stripe.com page.
//
//   WeylandCheckout.open({ product_id, quantity?, return_to?, name?, container? })
//     -> opens a modal (or mounts into `container`), creates the session via
//        POST /api/billing/checkout/embedded, loads Stripe.js (js.stripe.com -
//        Stripe requires that; it cannot be self-hosted) and mounts the form.
//        On completion (no redirect) it polls
//        GET /api/billing/checkout/status/:session_id until the subscription is
//        provisioned ({status:"active"}, which also sets the weyland_session
//        cookie), then calls WeylandShell.refresh() where present.
//   WeylandCheckout.resume() -> handles ?checkout=return&session_id= after a
//        redirect-based payment method (runs automatically on load).
//   window event "weyland-checkout" {detail:{status, session_id, product_id}}:
//        open | complete | active | paid_pending | closed | error
//
// Written without template literals so it can live inside one.

export const EMBEDDED_CHECKOUT_JS = `(function () {
  "use strict";
  if (window.WeylandCheckout) return;
  var API = "/api/billing/checkout/embedded";
  var stripeJsPromise = null;
  var state = { modal: null, container: null, embedded: null, sessionId: null, productId: null, productName: null, polling: false };

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

  function money(cents, currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: String(currency || "usd").toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
    } catch (e) { return "$" + (cents / 100); }
  }

  function injectCss() {
    if (document.getElementById("wco-style")) return;
    var st = document.createElement("style");
    st.id = "wco-style";
    st.textContent = [
      "html.wco-open{overflow:hidden}",
      ".wco-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(5,8,14,.74);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}",
      ".wco-panel{position:relative;width:min(600px,100%);max-height:calc(100dvh - 24px);overflow:auto;-webkit-overflow-scrolling:touch;background:#fff;color:#0b0f17;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:18px 18px 16px;box-sizing:border-box;font:400 14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
      ".wco-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 12px}",
      ".wco-kicker{font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;color:#5b6475}",
      ".wco-title{font:700 17px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin-top:4px}",
      ".wco-close{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:10px;background:#eef1f6;color:#0b0f17;font:400 26px/1 sans-serif;cursor:pointer}",
      ".wco-close:hover{background:#e1e6ef}",
      ".wco-status{display:none;margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#f2f5fa;color:#1d2433}",
      ".wco-status.wco-good{background:#e7f6ec;color:#11532b}",
      ".wco-status.wco-bad{background:#fdecec;color:#7a1b1b}",
      ".wco-status.wco-warn{background:#fff6dd;color:#5b4300}",
      ".wco-mount{min-height:40px}",
      ".wco-foot{margin-top:12px;font-size:12px;color:#5b6475}",
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
    wrap.innerHTML = '<div class="wco-panel"><div class="wco-head"><div><div class="wco-kicker">SECURE CHECKOUT</div><div class="wco-title"></div></div><button type="button" class="wco-close" aria-label="Close checkout">&times;</button></div><div class="wco-status" aria-live="polite"></div><div class="wco-mount"></div><div class="wco-foot">Payment is handled by Stripe inside this page. Card details never touch WeylandAI servers.</div></div>';
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
    try { if (state.embedded) state.embedded.destroy(); } catch (e) {}
    state.embedded = null;
    if (state.modal) { state.modal.remove(); state.modal = null; }
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
            setStatus((state.productName || "Your seat") + " is active and you are signed in.", "good");
            refreshShell();
            emit({ status: "active", session_id: sessionId, product_id: state.productId, quantity: d.quantity });
            addDone();
            return;
          }
          if (tries < 40) { setTimeout(tick, 1500); return; }
          state.polling = false;
          setStatus("Payment received. Your account is still being set up and appears here as soon as it is ready (reference " + sessionId.slice(-8) + ").", "warn");
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
    setStatus("Payment received. Activating " + (state.productName || "your seat") + "\\u2026", "");
    emit({ status: "complete", session_id: state.sessionId, product_id: state.productId });
    pollActivation(state.sessionId);
  }

  function authHeader() {
    try { var t = localStorage.getItem("_authfor_token"); return t ? { Authorization: "Bearer " + t } : {}; } catch (e) { return {}; }
  }

  function open(opts) {
    opts = opts || {};
    if (state.modal || state.embedded) close(null);
    state.productId = opts.product_id || null;
    state.productName = opts.name || null;
    state.sessionId = null;
    state.container = opts.container || null;
    if (!state.container) state.modal = buildModal(opts.name || "WeylandAI");
    setStatus("Opening secure checkout\\u2026", "");
    var quantity = Math.max(1, parseInt(opts.quantity, 10) || 1);
    var returnTo = opts.return_to || (location.pathname + location.search + location.hash);
    var headers = authHeader();
    headers["Content-Type"] = "application/json";
    return fetch(API, { method: "POST", credentials: "same-origin", headers: headers, body: JSON.stringify({ product_id: opts.product_id, quantity: quantity, return_to: returnTo }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var d = res.d || {};
        if (!res.ok || !d.client_secret) throw new Error((d.detail && d.detail.message) || d.error || "Checkout is unavailable right now.");
        state.sessionId = d.session_id;
        if (d.product && d.product.name) {
          state.productName = d.product.name;
          var t = state.modal && state.modal.querySelector(".wco-title");
          if (t) t.textContent = d.product.name + (d.product.unit_amount ? " \\u00b7 " + money(d.product.unit_amount * quantity, d.product.currency) + " per " + (d.product.interval || "month") : "");
        }
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
      })
      .catch(function (err) {
        setStatus("Checkout did not open: " + err.message + " Email hello@weylandai.com and we will send a link.", "bad");
        emit({ status: "error", product_id: state.productId, message: err.message });
        return null;
      });
  }

  function resume() {
    var p = new URLSearchParams(location.search);
    var sid = p.get("session_id");
    if (p.get("checkout") !== "return" || !sid) return false;
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
        if (d.product_name) state.productName = d.product_name;
        if (d.status === "complete") { setStatus("Payment received. Activating\\u2026", ""); pollActivation(sid); }
        else if (d.status === "open") { setStatus("The payment was not completed, so nothing was charged. You can try again.", "bad"); addDone(); }
        else { setStatus("This checkout expired. Nothing was charged.", "bad"); addDone(); }
      })
      .catch(function () { setStatus("Could not read the checkout result. Email hello@weylandai.com with reference " + sid.slice(-8) + ".", "bad"); addDone(); });
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
