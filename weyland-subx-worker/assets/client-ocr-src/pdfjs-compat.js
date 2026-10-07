/* WeylandAI pdf.js compatibility shims (2026-10-07).
 *
 * The vendored pdf.js (6.2.108, pdf.mjs.bin / pdf-worker.mjs.bin) calls
 * JavaScript built-ins only the newest browsers ship: Uint8Array#toHex /
 * fromBase64 / toBase64, Map#getOrInsertComputed, Math.sumPrecise,
 * Promise.withResolvers, URL.parse, Response#bytes,
 * ArrayBuffer#transferToFixedLength. Cloudflare Browser Rendering's Chrome
 * (the server-side schedule reader) failed on the first of them
 * ("n.toHex is not a function"), and so would any visitor's browser that is a
 * few releases old. The asset route prepends this file to both pdf.js files,
 * so the main thread and pdf.js's own worker get the same shims. Each shim is
 * installed only when the browser lacks the built-in.
 */
(function () {
  var def = function (obj, name, fn) {
    if (!obj || typeof obj[name] === "function") return;
    try { Object.defineProperty(obj, name, { value: fn, writable: true, configurable: true }); } catch (e) { /* frozen */ }
  };
  def(Uint8Array.prototype, "toHex", function () {
    var s = "";
    for (var i = 0; i < this.length; i++) { var h = this[i].toString(16); s += h.length < 2 ? "0" + h : h; }
    return s;
  });
  def(Uint8Array, "fromHex", function (str) {
    str = String(str);
    var out = new Uint8Array(str.length >> 1);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(str.substr(i * 2, 2), 16);
    return out;
  });
  def(Uint8Array.prototype, "toBase64", function (opts) {
    var bin = "";
    for (var i = 0; i < this.length; i += 0x8000) bin += String.fromCharCode.apply(null, this.subarray(i, i + 0x8000));
    var b = btoa(bin);
    if (opts && opts.alphabet === "base64url") b = b.replace(/\+/g, "-").replace(/\//g, "_");
    if (opts && opts.omitPadding) b = b.replace(/=+$/, "");
    return b;
  });
  def(Uint8Array, "fromBase64", function (str, opts) {
    str = String(str).replace(/\s+/g, "");
    if (opts && opts.alphabet === "base64url") str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var bin = atob(str);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  });
  def(Promise, "withResolvers", function () {
    var res, rej;
    var p = new this(function (a, b) { res = a; rej = b; });
    return { promise: p, resolve: res, reject: rej };
  });
  if (typeof URL !== "undefined") {
    def(URL, "parse", function (u, base) { try { return new URL(u, base); } catch (e) { return null; } });
  }
  def(Math, "sumPrecise", function (items) {
    var s = 0;
    var it = items[Symbol.iterator]();
    for (var r = it.next(); !r.done; r = it.next()) s += r.value;
    return s;
  });
  [Map.prototype, WeakMap.prototype].forEach(function (P) {
    def(P, "getOrInsert", function (k, v) { if (this.has(k)) return this.get(k); this.set(k, v); return v; });
    def(P, "getOrInsertComputed", function (k, fn) { if (this.has(k)) return this.get(k); var v = fn(k); this.set(k, v); return v; });
  });
  if (typeof Response !== "undefined") {
    def(Response.prototype, "bytes", function () { return this.arrayBuffer().then(function (b) { return new Uint8Array(b); }); });
  }
  if (typeof ArrayBuffer !== "undefined") {
    def(ArrayBuffer.prototype, "transferToFixedLength", function (len) {
      var n = len === undefined ? this.byteLength : len;
      var out = new ArrayBuffer(n);
      new Uint8Array(out).set(new Uint8Array(this, 0, Math.min(n, this.byteLength)));
      return out;
    });
  }
})();
