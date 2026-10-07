// node --test weyland-cutsheetx-worker/test/
// Full-text search results say whether their page can be drawn (pdfAvailable), and the page render
// route answers a catalogue without a PDF in words, never with the storage key.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { registerCpsSearchRoutes, withPdfAvailability } from "../src/routes/cps-search.js";
import { registerCpsPageRenderRoutes } from "../src/routes/cps-page-render.js";
import { sqliteD1 } from "./d1-sqlite.mjs";
import { FIXTURE_SQL } from "./fixture.mjs";

const DB = sqliteD1(FIXTURE_SQL);
after(() => DB.database.close());
// In storage: the Schlage L Series PDF (cat-l), and one already rendered page of the text-only price book (cat-pb p.166).
const stored = new Set(["catalogues/schlage-l.pdf", "catalogues/cat-pb/pages/page_166.pdf"]);
const r2 = { heads: 0, lists: 0 };
const env = { DB, UPLOADS: {
  async head(k) { r2.heads++; return stored.has(k) ? { size: 1 } : null; },
  async list({ prefix }) { r2.lists++; return { objects: [...stored].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false }; },
  async get() { return null; },
} };
const authenticate = async () => ({ user: { id: "guest" } });
const router = new NativeRouter();
registerCpsSearchRoutes(router, { authenticate });
registerCpsPageRenderRoutes(router, { authenticate, PDFDocument: null });
const get = async (path) => {
  const r = await router.handle(new Request("https://weylandai.com" + path), env, { waitUntil() {} });
  return { status: r.status, body: await r.text() };
};

test("search results say which pages can be drawn", async () => {
  const { status, body } = await get("/api/cps/search?q=L9080");
  assert.equal(status, 200);
  const d = JSON.parse(body);
  const byPage = Object.fromEntries(d.results.map((r) => [r.catalogue_id + ":" + r.page_num, r.pdfAvailable]));
  assert.deepEqual(byPage, { "cat-l:25": true, "cat-l:59": true, "cat-pb:161": false });
  assert.equal(d.count, 3);
});

test("a page already rendered counts as drawable even when its catalogue PDF is missing", async () => {
  const out = await withPdfAvailability(env, [{ catalogue_id: "cat-pb", page_num: 166 }, { catalogue_id: "cat-pb", page_num: "161" }]);
  assert.deepEqual(out.map((r) => r.pdfAvailable), [true, false]);
});

test("a repeated search makes no R2 call (per-catalogue answers are remembered)", async () => {
  await withPdfAvailability(env, [{ catalogue_id: "cat-l", page_num: 25 }, { catalogue_id: "cat-pb", page_num: 161 }]);
  const before = { ...r2 };
  const out = await withPdfAvailability(env, [{ catalogue_id: "cat-l", page_num: 59 }, { catalogue_id: "cat-pb", page_num: 166 }, { catalogue_id: "cat-pb", page_num: 170 }]);
  assert.deepEqual(out.map((r) => r.pdfAvailable), [true, true, false]);
  assert.deepEqual(r2, before);
});

test("without an R2 list each page of a catalogue without its PDF is checked with a HEAD", async () => {
  const headOnly = { DB, UPLOADS: { async head(k) { return k === "catalogues/cat-x/pages/page_3.pdf" ? { size: 1 } : null; } } };
  const out = await withPdfAvailability(headOnly, [{ catalogue_id: "cat-x", page_num: 3 }, { catalogue_id: "cat-x", page_num: 4 }]);
  assert.deepEqual(out.map((r) => r.pdfAvailable), [true, false]);
});

test("without storage or on a failing query the results go out unchanged", async () => {
  const rows = [{ catalogue_id: "cat-l", page_num: 25 }];
  assert.equal(await withPdfAvailability({ DB }, rows), rows);
  const broken = { DB: { prepare() { throw new Error("D1 down"); } }, UPLOADS: env.UPLOADS };
  assert.deepEqual(await withPdfAvailability(broken, rows), rows);
});

test("rendering a page of a catalogue without a PDF answers in words, not with the storage key", async () => {
  const { status, body } = await get("/api/cps/catalogues/cat-pb/pages/161/render");
  assert.equal(status, 404);
  const d = JSON.parse(body);
  assert.equal(d.code, "CATALOGUE_PDF_NOT_ON_FILE");
  assert.match(d.error, /not on file yet/);
  assert.ok(!/schlage-pb|catalogues\/|R2|stack/i.test(body), body);
});
