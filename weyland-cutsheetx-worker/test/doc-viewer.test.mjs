// node --test weyland-cutsheetx-worker/test/
// The document viewer's contract with the homepage's single-page shell (assets/weyland-shell.js):
// inside the overlay a citation goes to WeylandShell.open("pdf", { url, title, page, token }) at the
// cited page, with the page's guest token when the link is not signed, after a note about what the
// page showed is left on the shell's app-view history entry, which resumed() reads back once the
// shell's Back reloads the page. The drawing itself is checked in a real browser
// (test/journey-live.mjs, against production).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { DOC_VIEWER_SCRIPT } from "../src/lib/doc-viewer.js";

const EPH_KEY = "weylandai_ephemeral_token_v1";
const plain = (v) => JSON.parse(JSON.stringify(v));

// The viewer script loaded in a frame whose parent is the shell (or not), with fake browser APIs.
function framed({ stored = null, parentState = { wa: "app", path: "/cutsheetx" }, withShell = true } = {}) {
  const calls = [], fetches = [];
  const store = new Map(stored ? [[EPH_KEY, stored]] : []);
  const parentHistory = { state: parentState, replaced: 0, replaceState(s) { this.state = plain(s); this.replaced++; } };
  const parent = { history: parentHistory };
  if (withShell) parent.WeylandShell = { open(view, opts) { calls.push([view, plain(opts)]); return Promise.resolve(); } };
  const window = { addEventListener() {}, parent };
  const document = { addEventListener() {} };
  vm.runInNewContext(DOC_VIEWER_SCRIPT, {
    window, document, setTimeout, URL,
    sessionStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    fetch: async (url, opts) => { fetches.push([url, opts && opts.method]); return { ok: true, status: 200, json: async () => ({ token: "minted-token" }) }; },
  });
  return { docs: window.CutsheetxDocs, calls, fetches, store, parentHistory };
}

test("the script survives the template literal intact and parses", () => {
  assert.ok(!DOC_VIEWER_SCRIPT.includes(String.fromCharCode(92)), "no backslashes");
  assert.ok(!DOC_VIEWER_SCRIPT.includes(String.fromCharCode(96)), "no backticks");
  new vm.Script(DOC_VIEWER_SCRIPT);
  assert.match(DOC_VIEWER_SCRIPT, /import\("\/assets\/pdfjs\/pdf\.min\.mjs"\)/, "self-hosted pdf.js");
});

test("in the overlay a signed citation opens in the shell's document view at the cited page, no token", async () => {
  const t = framed({ stored: "guest-token" });
  assert.equal(t.docs.inShell(), true);
  assert.equal(await t.docs.open({ url: "/api/cut-sheets/sheet/abc/pdf?cite=1767225600.sig#page=6", title: "LCN Price Book,   pp. 6-48" }), true);
  assert.deepEqual(t.calls, [["pdf", { url: "/api/cut-sheets/sheet/abc/pdf?cite=1767225600.sig#page=6", title: "LCN Price Book, pp. 6-48", page: 6 }]]);
  assert.equal(t.fetches.length, 0);
});

test("an unsigned citation carries the page's guest token; with none stored, one is minted first", async () => {
  const a = framed({ stored: "guest-token" });
  await a.docs.open({ url: "/api/cps/catalogues/c1/pages/25/render", title: "Schlage L Series Catalog, p. 25" });
  assert.deepEqual(a.calls, [["pdf", { url: "/api/cps/catalogues/c1/pages/25/render#page=1", title: "Schlage L Series Catalog, p. 25", page: 1, token: "guest-token" }]]);
  assert.equal(a.fetches.length, 0);
  const b = framed();
  await b.docs.open({ url: "/api/cps/catalogues/c1/pages/25/render" });
  assert.deepEqual(b.fetches, [["/api/auth/ephemeral", "POST"]]);
  assert.equal(b.calls[0][1].token, "minted-token");
  assert.equal(b.calls[0][1].title, "Cited document");
  assert.equal(b.store.get(EPH_KEY), "minted-token");
});

test("the page's note lands on the shell's app entry (its fields kept) and is read back after the shell's Back", async () => {
  const t = framed({ stored: "x" });
  const snap = { match: { mfr: "Schlage", model: "L9080", type: "" }, search: null, section: "match" };
  t.docs.remember("cutsheetx", () => snap);
  await t.docs.open({ url: "/api/cps/catalogues/c1/pages/25/render?cite=9.s" });
  const st = t.parentHistory.state;
  assert.equal(st.wa, "app");
  assert.equal(st.path, "/cutsheetx");
  assert.deepEqual(st.cutsheetxReturn.apps, { cutsheetx: snap });
  assert.equal(t.calls.length, 1);
  // The shell's Back reloads the app in a new frame: the same history entry, a fresh page.
  const again = framed({ parentState: st });
  assert.deepEqual(plain(again.docs.resumed("cutsheetx")), snap);
  assert.equal(again.docs.resumed("finder"), null);
});

test("no note on an entry that is not the app view; nothing resumed outside the shell", async () => {
  const t = framed({ stored: "x", parentState: { wa: "pdf", url: "/api/x" } });
  t.docs.remember("cutsheetx", () => ({ match: { model: "L9080" } }));
  await t.docs.open({ url: "/api/cps/catalogues/c1/pages/2/render?cite=1.s" });
  assert.equal(t.parentHistory.replaced, 0);
  const fresh = framed({ stored: "x" });
  assert.equal(fresh.docs.resumed("cutsheetx"), null);
  const noShell = framed({ withShell: false, parentState: { wa: "app", cutsheetxReturn: { apps: { cutsheetx: { a: 1 } } } } });
  assert.equal(noShell.docs.inShell(), false);
  assert.equal(noShell.docs.resumed("cutsheetx"), null);
});

test("only this site's own document routes are opened or downloaded", async () => {
  const t = framed({ stored: "x" });
  for (const url of ["https://example.com/x.pdf", "/find/lcn/4040XP", "javascript:alert(1)", "", null]) {
    assert.equal(await t.docs.open({ url }), false, String(url));
    assert.equal(await t.docs.download({ url }), false, String(url));
  }
  assert.equal(t.calls.length, 0);
  assert.equal(t.fetches.length, 0);
});
