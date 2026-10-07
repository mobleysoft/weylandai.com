// weyland-cutsheetx-worker/src/lib/doc-viewer.js
//
// Documents open in place on the CutsheetX page and the finder (2026-10-07). No new tab.
//
// Both pages used to open a cited page in a new tab (window.open, then a blob): a page hop, and on
// the finder a JSON auth error for anyone who opened the link in a tab of its own. Now:
//
// * Inside the homepage's single-page shell (the page is the overlay's iframe and the parent has
//   window.WeylandShell, assets/weyland-shell.js), the document goes to the shell's own document
//   view: WeylandShell.open("pdf", { url, title, page, token }). One viewer for the whole site.
//   That view replaces the overlay's iframe, and the shell's Back reloads the app. So before handing
//   the document over, the page leaves a note on the shell's current history entry (the app view's
//   entry, only that one) saying what it was showing: remember(app, snapshot) registers it. When the
//   shell's Back reloads the page, resumed(app) reads the note and the page shows the same results.
// * Standalone (or in any other frame) the document is drawn over the page the visitor is on, the
//   way the shell draws it: self-hosted pdf.js (/assets/pdfjs/), opened at the cited page, Prev/Next,
//   zoom, Download, Close. Escape and the browser's Back close it, Forward opens it again; the page
//   keeps its state underneath.
//
// Price books run to ~19 MB: pdf.js asks for byte ranges, so only the pages looked at are read. A
// citation the matcher signed (?cite=, lib/citation-links.js) needs no token; anything else is read
// with the visitor's guest token (sessionStorage weylandai_ephemeral_token_v1, the key the homepage
// and the CutsheetX page share), minted when there is none and once more when it is refused. Without
// pdf.js the browser's own viewer is used, still inside the page.
//
// window.CutsheetxDocs: open({ url, title, page }, trigger), download({ url, title }, button), close(),
// remember(app, snapshotFn), resumed(app), inShell().
// Markup: an element with data-doc-url opens that document in place when clicked (data-doc-title
// names it); data-doc-download="<url>" saves the file. A signed link clicked with a modifier key is
// left to the browser (it opens on its own); an unsigned one always opens in place.
// (No backslashes or backticks in this template literal: they would not survive into the page.)

export const DOC_VIEWER_SCRIPT = `
(function () {
  if (window.CutsheetxDocs) return;
  var EPH_KEY = "weylandai_ephemeral_token_v1";
  var RETURN_KEY = "cutsheetxReturn";
  var framed = false;
  try { framed = window.parent !== window; } catch (e) { framed = true; }

  function shell() {
    try {
      var p = window.parent;
      if (p && p !== window && p.WeylandShell && typeof p.WeylandShell.open === "function") return p.WeylandShell;
    } catch (e) {}
    return null;
  }
  function tidy(t) { return String(t || "").split(" ").filter(Boolean).join(" ").slice(0, 160); }
  function signed(url) { return /[?&]cite=/.test(String(url || "")); }
  function docPath(url) { var p = String(url || "").split("#")[0]; return p.indexOf("/api/") === 0 ? p : null; }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- the guest token ----------
  function storedToken() { try { return sessionStorage.getItem(EPH_KEY); } catch (e) { return null; } }
  var minting = null;
  function mintToken() {
    if (!minting) {
      minting = fetch("/api/auth/ephemeral", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var t = (d && (d.token || d.access_token)) || null;
          if (t) { try { sessionStorage.setItem(EPH_KEY, t); } catch (e) {} }
          return t;
        })
        .catch(function () { return null; })
        .then(function (t) { minting = null; return t; });
    }
    return minting;
  }
  function headersFor(path, fresh) {
    if (signed(path)) return Promise.resolve({});
    var t = fresh ? null : storedToken();
    return (t ? Promise.resolve(t) : mintToken()).then(function (tok) { return tok ? { Authorization: "Bearer " + tok } : {}; });
  }
  function fetchDoc(path) {
    function get(h) { return fetch(path, { headers: h, credentials: "same-origin" }); }
    return headersFor(path).then(get).then(function (r) {
      return r.status === 401 && !signed(path) ? headersFor(path, true).then(get) : r;
    });
  }
  function errorText(r) {
    return r.json().catch(function () { return null; }).then(function (d) {
      var m = d && ((d.error && (d.error.message || d.error)) || d.message);
      return typeof m === "string" && m ? m : "HTTP " + r.status;
    });
  }

  // ---------- coming back after the shell's document view ----------
  var snapshots = {};
  function remember(app, fn) { if (app && typeof fn === "function") snapshots[app] = fn; }
  function appEntry() {
    try { var h = window.parent.history; return h && h.state && h.state.wa === "app" ? h : null; } catch (e) { return null; }
  }
  function leaveReturn(trigger) {
    var h = appEntry();
    if (!h) return;
    var apps = {}, any = false;
    for (var k in snapshots) { try { var v = snapshots[k](trigger); if (v) { apps[k] = v; any = true; } } catch (e) {} }
    if (!any) return;
    try {
      var cur = h.state, next = {};
      for (var f in cur) next[f] = cur[f];
      next[RETURN_KEY] = { at: Date.now(), apps: apps };
      h.replaceState(next, "");
    } catch (e) {}
  }
  function resumed(app) {
    if (!shell()) return null;
    try { var h = appEntry(), r = h && h.state[RETURN_KEY]; return (r && r.apps && r.apps[app]) || null; } catch (e) { return null; }
  }

  // ---------- the in-page viewer ----------
  var CSS = [
    ".cxd{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;background:#060b16;color:#e9eef8;font-family:inherit}",
    ".cxd.is-open{display:flex}",
    ".cxd-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1)}",
    ".cxd-top{justify-content:space-between;padding-top:max(8px,env(safe-area-inset-top))}",
    ".cxd-title{flex:1 1 160px;min-width:0;font-weight:600;font-size:14px;color:#c9d3e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".cxd-btn{min-width:44px;min-height:40px;background:none;border:1px solid rgba(255,255,255,.22);color:#e9eef8;border-radius:8px;padding:6px 12px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;cursor:pointer}",
    ".cxd-btn[disabled]{opacity:.4;cursor:default}",
    ".cxd-page{min-width:8.5em;text-align:center;font-size:13px;color:#c9d3e6}",
    ".cxd-status{padding:14px;color:#9fb0cc;font-size:14px;line-height:1.5;text-align:center}",
    ".cxd-stage{flex:1;overflow:auto;padding:12px;text-align:center;-webkit-overflow-scrolling:touch}",
    ".cxd-stage canvas{display:inline-block;vertical-align:top;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.45)}",
    ".cxd-stage iframe{display:block;width:100%;height:80vh;border:0;background:#fff}",
    ".cxd-note{margin-left:6px;font-size:13px;color:#ff8a8a}",
    "html.cxd-open,html.cxd-open body{overflow:hidden}"
  ].join("");
  var ui = null, st = null, lib = null, inerted = [], returnFocus = null;

  function ensureStyle() {
    if (document.getElementById("cxd-css")) return;
    (document.head || document.documentElement).appendChild(el("style", { id: "cxd-css" }, CSS));
  }
  function loadLib() {
    if (!lib) {
      lib = import("/assets/pdfjs/pdf.min.mjs").then(function (m) { m.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.min.mjs"; return m; });
      lib.catch(function () { lib = null; });
    }
    return lib;
  }
  function ensureUi() {
    if (ui) return ui;
    ensureStyle();
    ui = {};
    ui.root = el("div", { "class": "cxd", role: "dialog", "aria-modal": "true", "aria-label": "Cited document" });
    ui.title = el("div", { "class": "cxd-title" });
    ui.close = el("button", { type: "button", "class": "cxd-btn cxd-close" }, "Close");
    ui.prev = el("button", { type: "button", "class": "cxd-btn", "aria-label": "Previous page" }, "‹ Prev");
    ui.label = el("span", { "class": "cxd-page" });
    ui.next = el("button", { type: "button", "class": "cxd-btn", "aria-label": "Next page" }, "Next ›");
    ui.zoomOut = el("button", { type: "button", "class": "cxd-btn", "aria-label": "Zoom out" }, "−");
    ui.zoomIn = el("button", { type: "button", "class": "cxd-btn", "aria-label": "Zoom in" }, "+");
    ui.save = el("button", { type: "button", "class": "cxd-btn cxd-save" }, "Download");
    var top = el("div", { "class": "cxd-bar cxd-top" });
    top.appendChild(ui.title); top.appendChild(ui.close);
    var bar = el("div", { "class": "cxd-bar" });
    [ui.prev, ui.label, ui.next, ui.zoomOut, ui.zoomIn, ui.save].forEach(function (n) { bar.appendChild(n); });
    ui.status = el("div", { "class": "cxd-status", role: "status", "aria-live": "polite" });
    ui.stage = el("div", { "class": "cxd-stage" });
    [top, bar, ui.status, ui.stage].forEach(function (n) { ui.root.appendChild(n); });
    document.body.appendChild(ui.root);
    ui.prev.addEventListener("click", function () { if (st && st.doc) draw(st.n - 1); });
    ui.next.addEventListener("click", function () { if (st && st.doc) draw(st.n + 1); });
    ui.zoomIn.addEventListener("click", function () { if (st && st.doc && st.zoom < 3) { st.zoom += 0.5; draw(st.n); } });
    ui.zoomOut.addEventListener("click", function () { if (st && st.doc && st.zoom > 1) { st.zoom -= 0.5; draw(st.n); } });
    ui.save.addEventListener("click", function () { if (st) download({ url: st.path, title: st.title }, ui.save); });
    ui.close.addEventListener("click", function () { close(); });
    return ui;
  }
  function say(t) { ui.status.textContent = t || ""; ui.status.style.display = t ? "block" : "none"; }
  function nav() {
    var total = st && st.doc ? st.doc.numPages : 0;
    ui.label.textContent = total ? "Page " + st.n + " of " + total : "";
    ui.prev.disabled = !total || st.n <= 1;
    ui.next.disabled = !total || st.n >= total;
    ui.zoomOut.disabled = !total || st.zoom <= 1;
    ui.zoomIn.disabled = !total || st.zoom >= 3;
  }
  function draw(n) {
    var s = st;
    if (!s || !s.doc) return;
    n = Math.min(Math.max(1, n), s.doc.numPages);
    s.n = n; nav();
    say("Drawing page " + n + "…");
    s.doc.getPage(n).then(function (page) {
      if (st !== s || s.n !== n) return null;
      var base = page.getViewport({ scale: 1 });
      var fit = Math.max(240, Math.min((ui.stage.clientWidth || window.innerWidth) - 24, 1000));
      var vp = page.getViewport({ scale: (fit / base.width) * s.zoom });
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var canvas = el("canvas", { role: "img", "aria-label": s.title + ", page " + n });
      canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = Math.floor(vp.width) + "px"; canvas.style.height = Math.floor(vp.height) + "px";
      return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise.then(function () {
        if (st !== s || s.n !== n) return;
        ui.stage.textContent = "";
        ui.stage.appendChild(canvas);
        ui.root.setAttribute("data-cxd-page", String(n));
        ui.stage.scrollTop = 0;
        say("");
      });
    }).catch(function (e) { if (st === s) say("Could not draw page " + n + ": " + ((e && e.message) || e)); });
  }
  function setInert(on) {
    if (on) {
      Array.prototype.forEach.call(document.body.children, function (c) {
        if (c !== ui.root && !c.hasAttribute("inert")) { c.setAttribute("inert", ""); inerted.push(c); }
      });
    } else {
      inerted.forEach(function (c) { c.removeAttribute("inert"); });
      inerted = [];
    }
  }
  function close() {
    var s = st;
    if (!s) return;
    st = null;
    if (s.task) { try { s.task.destroy(); } catch (e) {} }
    if (s.blobUrl) { try { URL.revokeObjectURL(s.blobUrl); } catch (e) {} }
    ui.root.classList.remove("is-open");
    ui.root.removeAttribute("data-cxd-page");
    ui.root.removeAttribute("data-cxd-doc");
    ui.stage.textContent = "";
    document.documentElement.classList.remove("cxd-open");
    setInert(false);
    if (s.pushed) { try { history.back(); } catch (e) {} }
    var f = returnFocus; returnFocus = null;
    if (f && f.focus && document.contains(f)) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  function view(d, fromHistory) {
    ensureUi();
    var path = d.path, title = d.title, first = d.first, pushed = !!fromHistory;
    if (st) {
      pushed = pushed || st.pushed;
      var old = st; st = null;
      if (old.task) { try { old.task.destroy(); } catch (e) {} }
      if (old.blobUrl) { try { URL.revokeObjectURL(old.blobUrl); } catch (e) {} }
    } else {
      returnFocus = document.activeElement;
      setInert(true);
    }
    var s = st = { doc: null, task: null, n: first, zoom: 1, path: path, title: title, pushed: pushed, retried: false, headers: {} };
    ui.title.textContent = title;
    ui.stage.textContent = "";
    ui.root.setAttribute("data-cxd-doc", path.split("?")[0]);
    ui.root.classList.add("is-open");
    document.documentElement.classList.add("cxd-open");
    if (!framed && !s.pushed) {
      try {
        var cur = history.state && typeof history.state === "object" ? history.state : {}, next = {};
        for (var k in cur) next[k] = cur[k];
        next.cxd = { url: path + "#page=" + first, title: title, page: first };
        history.pushState(next, "");
        s.pushed = true;
      } catch (e) {}
    }
    nav();
    say("Opening " + title + "…");
    try { ui.close.focus({ preventScroll: true }); } catch (e) {}
    function start(headers) {
      s.headers = headers;
      return loadLib().then(function (L) {
        if (st !== s) return null;
        s.task = L.getDocument({ url: path, httpHeaders: headers, disableAutoFetch: true, disableStream: true, rangeChunkSize: 524288 });
        s.task.onProgress = function (p) {
          if (st === s && !s.doc && p && p.total > 4194304) say("Reading " + title + " (" + (p.loaded / 1048576).toFixed(1) + " of " + (p.total / 1048576).toFixed(1) + " MB)…");
        };
        return s.task.promise;
      });
    }
    function statusOf(e) { return e && (e.status || (e.cause && e.cause.status)); }
    headersFor(path).then(start).catch(function (e) {
      // A guest token the server refused (expired): one more try with a fresh one.
      if (st === s && statusOf(e) === 401 && !signed(path) && !s.retried) {
        s.retried = true;
        if (s.task) { try { s.task.destroy(); } catch (e2) {} s.task = null; }
        return headersFor(path, true).then(start);
      }
      throw e;
    }).then(function (pdf) {
      if (!pdf) return;
      if (st !== s) { try { pdf.destroy(); } catch (e) {} return; }
      s.doc = pdf;
      draw(Math.min(first, pdf.numPages));
    }).catch(function (e) {
      if (st !== s) return null;
      if (statusOf(e)) {
        // The route answered with an error: say it in words (its own message), never raw JSON.
        return fetch(path, { headers: s.headers, credentials: "same-origin" }).then(errorText).then(function (msg) {
          if (st === s) say("Could not open this document: " + msg);
        }).catch(function () { if (st === s) say("Could not open this document."); });
      }
      // pdf.js unavailable here: the browser's own viewer, still inside the page.
      return fetchDoc(path).then(function (r) {
        if (!r.ok) return errorText(r).then(function (m) { throw new Error(m); });
        return r.blob();
      }).then(function (b) {
        if (st !== s) return;
        s.blobUrl = URL.createObjectURL(b);
        ui.stage.textContent = "";
        ui.stage.appendChild(el("iframe", { title: title, src: s.blobUrl + "#page=" + first }));
        say("");
      }).catch(function (e2) { if (st === s) say("Could not open this document: " + ((e2 && e2.message) || "it did not load.")); });
    });
  }

  // ---------- open, download ----------
  function open(opts, trigger) {
    opts = opts || {};
    var url = String(opts.url || "");
    var path = docPath(url);
    if (!path) return Promise.resolve(false);
    var m = /#page=([0-9]+)/.exec(url);
    var first = Math.max(1, parseInt(opts.page || (m && m[1]) || "1", 10) || 1);
    var title = tidy(opts.title) || "Cited document";
    var sh = shell();
    if (sh) {
      // Inside the homepage overlay: the shell's own document view, with this page's guest token.
      var tok = signed(path) ? null : storedToken();
      return (tok || signed(path) ? Promise.resolve(tok) : mintToken()).then(function (t) {
        var o = { url: path + "#page=" + first, title: title, page: first };
        if (t) o.token = t;
        leaveReturn(trigger);
        try { sh.open("pdf", o); } catch (e) { view({ path: path, title: title, first: first }, false); }
        return true;
      });
    }
    view({ path: path, title: title, first: first }, false);
    return Promise.resolve(true);
  }
  function note(btn, msg) {
    if (!btn || !btn.parentNode) return;
    var n = btn.nextElementSibling;
    if (!(n && n.classList && n.classList.contains("cxd-note"))) {
      if (!msg) return;
      ensureStyle();
      n = el("span", { "class": "cxd-note", role: "status" });
      btn.parentNode.insertBefore(n, btn.nextSibling);
    }
    n.textContent = msg || "";
  }
  function download(opts, btn) {
    var path = docPath(opts && opts.url);
    if (!path) return Promise.resolve(false);
    var label = btn ? btn.textContent : null;
    if (btn) { btn.setAttribute("aria-busy", "true"); if ("disabled" in btn) btn.disabled = true; btn.textContent = "Downloading…"; }
    note(btn, "");
    return fetchDoc(path).then(function (r) {
      if (!r.ok) return errorText(r).then(function (msg) { throw new Error("The download failed: " + msg); });
      return r.blob();
    }).then(function (b) {
      var name = String((opts && opts.title) || "document").replace(/[^A-Za-z0-9.,() _-]+/g, " ").split(" ").filter(Boolean).join(" ").slice(0, 120) || "document";
      var href = URL.createObjectURL(b);
      var a = el("a", { href: href, download: name + ".pdf" });
      a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 60000);
      return true;
    }).catch(function (e) {
      note(btn, (e && e.message) || "The download failed.");
      return false;
    }).then(function (ok) {
      if (btn) { btn.removeAttribute("aria-busy"); if ("disabled" in btn) btn.disabled = false; btn.textContent = label; }
      return ok;
    });
  }

  // ---------- wiring ----------
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    var t = e.target && e.target.closest ? e.target.closest("[data-doc-url],[data-doc-download]") : null;
    if (!t) return;
    var href = t.tagName === "A" ? t.getAttribute("href") : null;
    if (href && signed(href) && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    e.preventDefault();
    if (t.getAttribute("aria-busy") === "true") return;
    var dl = t.getAttribute("data-doc-download");
    if (dl) download({ url: dl, title: t.getAttribute("data-doc-title") }, t);
    else open({ url: t.getAttribute("data-doc-url"), title: t.getAttribute("data-doc-title") }, t);
  });
  document.addEventListener("auxclick", function (e) {
    if (e.button !== 1) return;
    var t = e.target && e.target.closest ? e.target.closest("a[data-doc-url]") : null;
    if (!t || signed(t.getAttribute("href"))) return;
    e.preventDefault();
    open({ url: t.getAttribute("data-doc-url"), title: t.getAttribute("data-doc-title") }, t);
  });
  document.addEventListener("keydown", function (e) {
    if (!st) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight" || e.key === "PageDown") { if (st.doc) { e.preventDefault(); draw(st.n + 1); } }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { if (st.doc) { e.preventDefault(); draw(st.n - 1); } }
  });
  window.addEventListener("popstate", function (e) {
    var d = !framed && e.state && e.state.cxd;
    if (d && d.url) {
      var p = docPath(d.url);
      if (p && (!st || st.path !== p)) view({ path: p, title: tidy(d.title) || "Cited document", first: Math.max(1, parseInt(d.page, 10) || 1) }, true);
      return;
    }
    if (st) { st.pushed = false; close(); }
  });

  window.CutsheetxDocs = { open: open, close: close, download: download, remember: remember, resumed: resumed, inShell: function () { return !!shell(); } };
})();
`;
