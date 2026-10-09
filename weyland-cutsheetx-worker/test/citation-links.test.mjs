// node --test weyland-cutsheetx-worker/test/*.test.mjs
// Signed citation links: the matcher hands a guest a citation that opens as a plain link (no
// Authorization header), bound to that one document, expiring; everything else is authenticated
// as before.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { signCitationUrl, citationGrant, signMatchResultLinks, isCitationPath } from "../src/lib/citation-links.js";
import { registerCpsPageRenderRoutes } from "../src/routes/cps-page-render.js";
import { registerCutSheetCoverageRoutes } from "../src/routes/cut-sheet-coverage.js";
import { registerCutSheetMatchRoutes } from "../src/routes/cut-sheet-match.js";
import { sqliteD1 } from "./d1-sqlite.mjs";
import { FIXTURE_SQL } from "./fixture.mjs";

const SECRET = "test-secret-0123456789abcdef0123456789abcdef";
const RENDER = "/api/cps/catalogues/cat-l/pages/25/render";
const SHEET = "/api/cut-sheets/sheet/d-4040xp/pdf#page=6";
const req = (path, headers = {}) => new Request("https://weylandai.com" + path, { headers });

test("signing adds a grant before the #page fragment and only to the two document routes", async () => {
  const env = { CITATION_LINK_SECRET: SECRET };
  const r = await signCitationUrl(env, RENDER);
  assert.match(r, /^\/api\/cps\/catalogues\/cat-l\/pages\/25\/render\?cite=\d{9,11}\.[A-Za-z0-9_-]{43}$/);
  const s = await signCitationUrl(env, SHEET);
  assert.match(s, /^\/api\/cut-sheets\/sheet\/d-4040xp\/pdf\?cite=\d{9,11}\.[A-Za-z0-9_-]{43}#page=6$/);
  assert.equal(await signCitationUrl(env, "/api/cut-sheets/download/d-4040xp"), "/api/cut-sheets/download/d-4040xp");
  assert.equal(await signCitationUrl(env, "https://evil.example/api/cps/catalogues/x/pages/1/render"), "https://evil.example/api/cps/catalogues/x/pages/1/render");
  assert.equal(await signCitationUrl({}, RENDER), RENDER, "no secret, no signature");
  assert.ok(isCitationPath("/api/cut-sheets/sheet/abc/pdf") && !isCitationPath("/api/cut-sheets/sheet/abc/pdf/x"));
});

test("a grant opens its own path only, and expires", async () => {
  const env = { CITATION_LINK_SECRET: SECRET };
  const now = Date.UTC(2026, 9, 7, 5, 0, 0);
  const signed = await signCitationUrl(env, RENDER, now);
  assert.equal(await citationGrant(req(signed), env, now), "valid");
  assert.equal(await citationGrant(req(signed), env, now + 5 * 86400e3), "valid", "still valid five days later");
  assert.equal(await citationGrant(req(signed), env, now + 8 * 86400e3), "expired");
  const moved = signed.replace("/pages/25/", "/pages/26/");
  assert.equal(await citationGrant(req(moved), env, now), "invalid", "grant cannot be moved to another page");
  const otherCat = signed.replace("/cat-l/", "/cat-x/");
  assert.equal(await citationGrant(req(otherCat), env, now), "invalid");
  const forgedExp = signed.replace(/cite=(\d+)/, (m0, e) => "cite=" + (Number(e) + 86400));
  assert.equal(await citationGrant(req(forgedExp), env, now), "invalid", "expiry is covered by the signature");
  assert.equal(await citationGrant(req(RENDER), env, now), "none");
  assert.equal(await citationGrant(req(signed), {}, now), "invalid", "no secret: nothing validates");
  assert.equal(await signCitationUrl(env, RENDER, now), signed, "same page, same day, same URL");
});

test("signMatchResultLinks signs cutSheets[] and cataloguePages[] in place", async () => {
  const env = { CITATION_LINK_SECRET: SECRET };
  const r = { matched: true, cutSheets: [{ id: "a", pageUrl: SHEET }], cataloguePages: [{ pageUrl: RENDER }, { pageUrl: null }] };
  await signMatchResultLinks(env, r);
  assert.match(r.cutSheets[0].pageUrl, /\?cite=.*#page=6$/);
  assert.match(r.cataloguePages[0].pageUrl, /\?cite=/);
  assert.equal(r.cataloguePages[1].pageUrl, null);
});

// ---- the document routes ----
const DB = sqliteD1(FIXTURE_SQL);
after(() => DB.database.close());
const PDF = new TextEncoder().encode("%PDF-1.4 test page");
const BIG = new Uint8Array(1000).map((_, i) => i % 251);
const bucket = {
  async get(key, opts) {
    if (key === "catalogues/cat-l/pages/page_25.pdf") return { async arrayBuffer() { return PDF.buffer; }, body: PDF, size: PDF.length };
    // The LCN price book's own text, as SubX's packet build caches it (weyland-shared/filed-page.js).
    if (key === "cut-sheet-text/manufacturer-catalogs/lcn.pdf.pages.json") return { async json() { return [{ page: 6, text: "LCN closers" }, { page: 31, text: "4040XP Series: 4040XP REG, 4040XP EDA" }]; } };
    if (key === "manufacturer-catalogs/lcn.pdf") {
      const bytes = opts && opts.range ? BIG.slice(opts.range.offset, opts.range.offset + opts.range.length) : BIG;
      return { body: bytes, size: BIG.length };
    }
    return null;
  },
  async head(key) { return key === "manufacturer-catalogs/lcn.pdf" ? { size: BIG.length } : (key === "catalogues/schlage-l.pdf" ? { size: 1 } : null); },
  async put() {},
};
const authenticate = async (request) => (request.headers.get("Authorization") === "Bearer guest"
  ? { user: { ephemeral: true, id: "eph_test" } }
  : { error: new Response(JSON.stringify({ error: "Authentication required — sign in at /" }), { status: 401, headers: { "Content-Type": "application/json" } }) });
const router = new NativeRouter();
registerCpsPageRenderRoutes(router, { authenticate, PDFDocument: null });
registerCutSheetCoverageRoutes(router, { authenticate, requireProductAccess: async () => null });
registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess: async () => null });
const env = { DB, UPLOADS: bucket, OUTPUTS: bucket, CITATION_LINK_SECRET: SECRET };
const call = (path, headers) => router.handle(req(path, headers), env, { waitUntil() {} });

test("a signed catalogue-page link opens with no token; unsigned still needs one", async () => {
  const signed = await signCitationUrl(env, RENDER);
  const open = await call(signed);
  assert.equal(open.status, 200);
  assert.equal(open.headers.get("content-type"), "application/pdf");
  const bare = await call(RENDER);
  assert.equal(bare.status, 401);
  assert.match((await bare.json()).error, /Authentication required/);
  const withToken = await call(RENDER, { Authorization: "Bearer guest" });
  assert.equal(withToken.status, 200, "the guest token still works on its own");
  const tampered = await call(signed.replace("/pages/25/", "/pages/24/"));
  assert.equal(tampered.status, 401);
  assert.equal((await tampered.json()).code, "CITATION_LINK_INVALID");
});

test("a signed price-book link opens with no token, Range included", async () => {
  const signed = (await signCitationUrl(env, SHEET)).split("#")[0];
  const full = await call(signed);
  assert.equal(full.status, 200);
  const part = await call(signed, { Range: "bytes=10-19" });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 10-19/1000");
  assert.equal((await call("/api/cut-sheets/sheet/d-4040xp/pdf")).status, 401);
});

test("the single-line match hands out signed citations that open as plain links", async () => {
  const m = await router.handle(new Request("https://weylandai.com/api/cut-sheets/match", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer guest" }, body: JSON.stringify({ manufacturer: "Schlage", model: "L9080" }) }), env, { waitUntil() {} });
  const data = await m.json();
  assert.equal(data.citation.kind, "catalogue_page");
  assert.match(data.citation.url, /\?cite=/);
  assert.equal(data.citation.url, data.cataloguePages[0].pageUrl);
  const open = await call(data.citation.url);
  assert.equal(open.status, 200);
  const lcn = await (await router.handle(new Request("https://weylandai.com/api/cut-sheets/match-batch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer guest" }, body: JSON.stringify({ text: "LCN 4040XP" }) }), env, { waitUntil() {} })).json();
  // The page of the filed book that names 4040XP, not the row's "pp.6-48" (2026-10-09).
  assert.match(lcn.results[0].citation.url, /^\/api\/cut-sheets\/sheet\/d-4040xp\/pdf\?cite=.+#page=31$/);
  assert.equal(lcn.results[0].citation.page, "31");
  assert.equal((await call(lcn.results[0].citation.url.split("#")[0])).status, 200);
});
