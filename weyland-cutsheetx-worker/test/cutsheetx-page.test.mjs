// node --test weyland-cutsheetx-worker/test/
// The /cutsheetx page answers every variant the wildcard route delivers, with any query string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NativeRouter } from "../src/lib/router.js";
import { registerCutsheetxPageRoutes } from "../src/routes/cutsheetx-page.js";

const router = new NativeRouter();
registerCutsheetxPageRoutes(router, "<!doctype html><title>CX</title>");
const get = (path) => router.handle(new Request("https://weylandai.com" + path), {}, {});

for (const path of ["/cutsheetx", "/cutsheetx/", "/cutsheetx?embed=1", "/cutsheetx/?embed=1", "/cutsheetx?ref=ph&embed=1", "/cutsheetx.html", "/cutsheetx/index.html"]) {
  test("GET " + path + " serves the CutsheetX page", async () => {
    const r = await get(path);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
    assert.equal(await r.text(), "<!doctype html><title>CX</title>");
  });
}

for (const path of ["/cutsheetx/foo", "/cutsheetxyz", "/cutsheetx-app"]) {
  test("GET " + path + " is a 404, as it was before the wildcard", async () => {
    const r = await get(path);
    assert.equal(r.status, 404);
  });
}

test("wrangler.toml routes /cutsheetx as a wildcard and keeps the other patterns", () => {
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const patterns = [...toml.matchAll(/^pattern = "([^"]+)"/gm)].map((m) => m[1]);
  assert.ok(patterns.includes("weylandai.com/cutsheetx*"));
  assert.ok(!patterns.includes("weylandai.com/cutsheetx"));
  for (const p of ["weylandai.com/api/cps/*", "weylandai.com/api/cut-sheets/*", "weylandai.com/api/catalogue/*", "weylandai.com/api/user/cutsheets*", "weylandai.com/find*"]) assert.ok(patterns.includes(p), p);
});

test("the page's embedded-nav script only acts inside the shell", () => {
  const html = readFileSync(new URL("../src/pages/cutsheetx.html", import.meta.url), "utf8");
  assert.match(html, /window\.parent !== window && window\.parent\.WeylandShell/);
  assert.match(html, /shell\.open\('app'/);
  assert.match(html, /rel="canonical" href="https:\/\/weylandai\.com\/cutsheetx"/);
});
