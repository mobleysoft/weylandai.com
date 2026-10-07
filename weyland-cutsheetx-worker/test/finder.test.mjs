// node --test weyland-cutsheetx-worker/test/*.test.mjs
// The finder keeps its server-rendered, indexable pages, and every page carries the in-place
// navigation script (src/routes/find.js NAV_SCRIPT). The browser behaviour itself is checked by
// test/journey-live.mjs against production.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { NativeRouter } from "../src/lib/router.js";
import { registerFindRoutes, NAV_SCRIPT } from "../src/routes/find.js";
import { sqliteD1 } from "./d1-sqlite.mjs";
import { FIXTURE_SQL } from "./fixture.mjs";

const DB = sqliteD1(FIXTURE_SQL);
after(() => DB.database.close());
const env = { DB, UPLOADS: { async head(k) { return k === "catalogues/schlage-l.pdf" ? { size: 1 } : null; } } };
const router = new NativeRouter();
registerFindRoutes(router);
const get = async (path) => {
  const r = await router.handle(new Request("https://weylandai.com" + path), env, { waitUntil() {} });
  return { status: r.status, html: await r.text() };
};
const scripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test("search results are server-rendered links to the product pages", async () => {
  const { status, html } = await get("/find?q=LCN+4040XP");
  assert.equal(status, 200);
  assert.match(html, /<form action="\/find" method="get" role="search">/);
  assert.match(html, /<a href="\/find\/lcn\/4040XP"><strong>LCN 4040XP<\/strong><\/a>/);
  assert.match(html, /<title>LCN 4040XP cut sheet \| WeylandAI finder<\/title>/);
});

test("a product page is server-rendered with its citations", async () => {
  const { status, html } = await get("/find/schlage/L9080");
  assert.equal(status, 200);
  assert.match(html, /<h1>SCHLAGE L9080<\/h1>/);
  assert.match(html, /Schlage L Series Catalog<\/strong>, p\. 25/);
});

test("the finder's lead states live counts, not hard-coded ones", async () => {
  const { html } = await get("/find");
  assert.match(html, /<p class="lead">4 catalogued products from 4 manufacturers, with page citations into 2 manufacturer price books and 3 indexed catalogue pages\. Free, no account\.<\/p>/);
  const miss = await get("/find/nope/NOPE");
  assert.equal(miss.status, 404);
  assert.match(miss.html, /is not one of the 4 catalogued products/);
});

test("every finder page carries the in-place navigation script, and it parses", async () => {
  for (const path of ["/find", "/find?q=schlage", "/find/schlage/L9080", "/find/nope/NOPE"]) {
    const { html } = await get(path);
    const s = scripts(html);
    assert.ok(s.some((x) => x.includes("history.replaceState({ finder: 1 }")), path);
    for (const x of s) new vm.Script(x);
  }
});

test("the script survives the template literal intact (no backslashes, no backticks)", () => {
  assert.ok(!NAV_SCRIPT.includes(String.fromCharCode(92)));
  assert.ok(!NAV_SCRIPT.includes(String.fromCharCode(96)));
  assert.match(NAV_SCRIPT, /window\.parent\.WeylandShell/);
});
