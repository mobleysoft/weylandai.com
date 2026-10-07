// node --test weyland-cutsheetx-worker/test/finder-embed.test.mjs
// The Finder inside the homepage shell's overlay keeps ?embed=1 through its in-place steps
// (2026-10-07: the search form used to drop it, so after a search the frame was at /find?q=...).
// NAV_SCRIPT runs here against a minimal stand-in for the browser; the real browser behaviour is
// checked by tools/user-simulation/journeys/cutsheetx-finder-search.mjs against production.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { NAV_SCRIPT } from "../src/routes/find.js";
import { NativeRouter } from "../src/lib/router.js";
import { registerFindRoutes } from "../src/routes/find.js";
import { sqliteD1 } from "./d1-sqlite.mjs";
import { FIXTURE_SQL } from "./fixture.mjs";

const ORIGIN = "https://weylandai.com";
const settle = () => new Promise((r) => setTimeout(r, 0));

function browser({ search, inShell }) {
  const handlers = { submit: [], click: [], popstate: [] };
  const calls = { fetched: [], pushed: [], replaced: [], closed: 0 };
  const main = { innerHTML: "", setAttribute() {}, removeAttribute() {}, querySelector() { return null; } };
  const location = { pathname: "/find", search, hash: "", origin: ORIGIN, get href() { return ORIGIN + this.pathname + this.search; } };
  const history = {
    pushState(_s, _t, url) { calls.pushed.push(url); const u = new URL(url, ORIGIN); location.pathname = u.pathname; location.search = u.search; },
    replaceState(_s, _t, url) { calls.replaced.push(String(url)); const u = new URL(url, ORIGIN); location.pathname = u.pathname; location.search = u.search; }
  };
  const window = {
    location, history, URL, URLSearchParams, AbortController,
    DOMParser: class { parseFromString() { return { title: "T", querySelector: (s) => (s === "main" ? { innerHTML: "<h1>x</h1>" } : null) }; } },
    FormData: class { constructor(f) { this.f = f; } get(k) { return this.f.values[k]; } },
    fetch(url) { calls.fetched.push(url); return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("<main><h1>x</h1></main>") }); },
    scrollTo() {},
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    document: {
      title: "",
      querySelector: (s) => (s === "main" ? main : null),
      addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); }
    }
  };
  window.window = window;
  window.parent = inShell ? { WeylandShell: { close() { calls.closed++; } } } : window;
  vm.runInNewContext(NAV_SCRIPT, window);
  const submit = (q) => {
    const form = { getAttribute: (a) => (a === "action" ? "/find" : a === "method" ? "get" : null), values: { q } };
    for (const fn of handlers.submit) fn({ target: form, preventDefault() {} });
  };
  const click = (href) => {
    const a = { target: "", getAttribute: (n) => (n === "href" ? href : null), hasAttribute: () => false };
    for (const fn of handlers.click) fn({ target: { closest: () => a }, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
  };
  return { calls, location, submit, click };
}

test("in the overlay: a search keeps embed=1 in the frame's address", async () => {
  const b = browser({ search: "?embed=1", inShell: true });
  b.submit("LCN 4040XP");
  await settle(); await settle();
  assert.deepEqual(b.calls.fetched, ["/find?q=LCN+4040XP&embed=1"]);
  assert.equal(b.calls.replaced.at(-1), "/find?q=LCN+4040XP&embed=1");
  assert.equal(b.calls.pushed.length, 0, "inside the shell the frame's history is replaced, so Back still closes the overlay");
});

test("in the overlay: a result link and an empty search keep embed=1 too", async () => {
  const b = browser({ search: "?q=LCN+4040XP&embed=1", inShell: true });
  b.click("/find/lcn/4040XP");
  await settle(); await settle();
  assert.equal(b.calls.fetched[0], "/find/lcn/4040XP?embed=1");
  assert.equal(b.location.pathname + b.location.search, "/find/lcn/4040XP?embed=1");
  b.submit("");
  await settle(); await settle();
  assert.equal(b.calls.fetched[1], "/find?embed=1");
});

test("in the shell's frame without embed=1 (an older address): it is put back", async () => {
  const b = browser({ search: "?q=x", inShell: true });
  b.submit("Von Duprin 99");
  await settle(); await settle();
  assert.equal(b.calls.fetched[0], "/find?q=Von+Duprin+99&embed=1");
});

test("standalone: no embed=1, history is pushed as before", async () => {
  const b = browser({ search: "", inShell: false });
  b.submit("LCN 4040XP");
  await settle(); await settle();
  assert.deepEqual(b.calls.fetched, ["/find?q=LCN+4040XP"]);
  assert.deepEqual(b.calls.pushed, ["/find?q=LCN+4040XP"]);
  b.click("/find/lcn/4040XP");
  await settle(); await settle();
  assert.equal(b.calls.fetched[1], "/find/lcn/4040XP");
});

test("links in the page stay clean (a link opened in a new tab is the standalone page)", async () => {
  const router = new NativeRouter();
  registerFindRoutes(router);
  const DB = sqliteD1(FIXTURE_SQL);
  const env = { DB };
  const r = await router.handle(new Request(ORIGIN + "/find?q=LCN+4040XP&embed=1"), env, { waitUntil() {} });
  const html = await r.text();
  assert.match(html, /<a href="\/find\/lcn\/4040XP">/);
  assert.doesNotMatch(html, /href="[^"]*embed=1/);
  // the embedded layout is chosen in the head, before anything is drawn
  assert.ok(html.indexOf('className+=" embedded"') > 0 && html.indexOf('className+=" embedded"') < html.indexOf("<body>"));
  assert.match(html, /\.embedded main>header\{display:none\}/);
  DB.database.close();
});
