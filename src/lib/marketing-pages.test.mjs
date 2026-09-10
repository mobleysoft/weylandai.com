import { test } from "node:test";
import assert from "node:assert/strict";
import { SovereignWeylandRoutes } from "./marketing-pages.js";

async function html(resp) {
  return resp.headers.get("content-type") || "";
}

test("dispatch: real path normalization strips leading/trailing slashes and lowercases", async () => {
  const a = SovereignWeylandRoutes.dispatch("/HuntX/");
  const b = SovereignWeylandRoutes.dispatch("huntx");
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(await html(a), await html(b));
});

test("dispatch: empty path, 'index', and 'index.html' all serve the whyweyland default page", async () => {
  const empty = await SovereignWeylandRoutes.dispatch("").text();
  const index = await SovereignWeylandRoutes.dispatch("index").text();
  const indexHtml = await SovereignWeylandRoutes.dispatch("index.html").text();
  assert.equal(empty, index);
  assert.equal(index, indexHtml);
  assert.ok(empty.includes("WHY WEYLANDAI"));
});

test("dispatch: 'deck' is a real alias for venturedeck (redirects externally)", () => {
  const resp = SovereignWeylandRoutes.dispatch("deck");
  assert.equal(resp.status, 302);
  assert.equal(resp.headers.get("location"), "https://deck.weyland.onamerica.org/");
});

test("dispatch: venturedeck itself redirects to the same real external deck", () => {
  const resp = SovereignWeylandRoutes.dispatch("venturedeck");
  assert.equal(resp.status, 302);
  assert.equal(resp.headers.get("location"), "https://deck.weyland.onamerica.org/");
});

test("dispatch: cutsheetx redirects to /pricing (no standalone page)", () => {
  const resp = SovereignWeylandRoutes.dispatch("cutsheetx");
  assert.equal(resp.status, 302);
  assert.equal(resp.headers.get("location"), "https://weylandai.com/pricing");
});

test("dispatch: an unrecognized path returns null, not a crash", () => {
  assert.equal(SovereignWeylandRoutes.dispatch("totally-unknown-page-xyz"), null);
});

test("dispatch: a real sample of product pages serve 200 HTML containing their own title", async () => {
  const cases = [
    ["subx", "SubX"],
    ["takeoffx", "TakeoffX"],
    ["propx", "PropX"],
  ];
  for (const [path, titleFragment] of cases) {
    const resp = SovereignWeylandRoutes.dispatch(path);
    assert.equal(resp.status, 200, `${path} should be 200`);
    assert.ok((await html(resp)).includes("text/html"), `${path} should be html`);
    const body = await resp.text();
    assert.ok(body.includes(titleFragment), `${path} body should mention ${titleFragment}`);
  }
});

test("dispatch: the 3 SightX JSON manifest routes serve real, parseable JSON", async () => {
  const paths = [
    "sightx/runtime-manifest.json",
    "sightx/runtime-manifest.schema.json",
    "sightx/projects/glendale-camino-real/catalog.json",
  ];
  for (const path of paths) {
    const resp = SovereignWeylandRoutes.dispatch(path);
    assert.equal(resp.status, 200);
    assert.ok((await html(resp)).includes("application/json"));
    const text = await resp.text();
    const parsed = JSON.parse(text); // throws if not real JSON
    assert.ok(parsed);
  }
});

test("dispatch: real delegation to the imported serve_onboarding, which redirects to /subscribe", () => {
  const resp = SovereignWeylandRoutes.dispatch("onboarding");
  assert.equal(resp.status, 302);
  assert.equal(resp.headers.get("location"), "https://weylandai.com/subscribe");
});

test("dispatch: real delegation to the imported serve_progress, which redirects to the homepage", () => {
  const resp = SovereignWeylandRoutes.dispatch("progress");
  assert.equal(resp.status, 302);
  assert.equal(resp.headers.get("location"), "https://weylandai.com/");
});

test("dispatch: meetingx (defined inside this module, not imported) serves real HTML", async () => {
  const resp = SovereignWeylandRoutes.dispatch("meetingx");
  assert.equal(resp.status, 200);
  assert.ok((await html(resp)).includes("text/html"));
});

test("dispatch: renderNav real behavior excludes the current page's own link from its nav", async () => {
  const body = await SovereignWeylandRoutes.dispatch("huntx").text();
  // renderNav builds "/<key>/" links for every ROUTE_LABELS entry except the current page
  assert.ok(!body.includes('href="/huntx/"'));
  assert.ok(body.includes('href="/takeoffx/"'));
});

test("dispatch: renderNav's meetingx self-exclusion covers both its aliases", async () => {
  const body = await SovereignWeylandRoutes.dispatch("meetingx").text();
  assert.ok(!body.includes('href="/meetingx/"'));
  assert.ok(!body.includes('href="/meetx/"'));
});

test("dispatch: every real route in the map serves a real Response, not undefined or a thrown error", () => {
  const paths = [
    "huntx", "marketx", "pricex", "compx", "weatherx", "forecastx", "geox", "takeoffx",
    "subx", "cutsheetx", "propx", "", "whyweyland", "venturedeck", "investors", "lienx",
    "bidx", "coa", "rfax", "changeordx", "permitx", "closex", "notesx", "inspecx",
    "safetyx", "survx", "specx", "drawx", "asbuiltx", "leadx", "careers", "progress",
    "sightx", "meetingx", "sightx/runtime-manifest.json", "sightx/runtime-manifest.schema.json",
    "sightx/projects/glendale-camino-real/catalog.json", "qtext", "subscribe", "financials",
    "pricing", "onboarding",
  ];
  for (const path of paths) {
    const resp = SovereignWeylandRoutes.dispatch(path);
    assert.ok(resp instanceof Response, `${path} did not return a real Response`);
  }
});
