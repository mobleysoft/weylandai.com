import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsPageRenderRoutes } from "./cps-page-render.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ catalogue = null } = {}) {
  return {
    prepare() {
      return {
        bind: () => ({
          async first() { return catalogue; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

function makeFakePdfDoc() {
  return {
    async copyPages() { return [{ id: "page1" }]; },
    addPage() {},
    async save() { return new Uint8Array([1, 2, 3]); },
  };
}

function makeFakePDFDocument() {
  return {
    async load() { return { id: "sourceDoc" }; },
    async create() { return makeFakePdfDoc(); },
  };
}

function setup({ authenticate = authOk, db, uploads, PDFDocument } = {}) {
  const router = new NativeRouter();
  registerCpsPageRenderRoutes(router, { authenticate, PDFDocument: PDFDocument || makeFakePDFDocument() });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; }, async put() {} } } };
}

test("GET .../render: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/1/render"), env, {});
  assert.equal(res.status, 401);
});

test("GET .../render: invalid page number is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/0/render"), env, {});
  assert.equal(res.status, 400);
});

test("GET .../render: real happy path returns cached PDF from R2 without touching PDFDocument", async () => {
  const uploads = { async get() { return { async arrayBuffer() { return new ArrayBuffer(4); } }; }, async put() {} };
  const { router, env } = setup({ uploads });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/1/render"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("X-CPS-Cache"), "hit");
});

test("GET .../render: 404 when catalogue not found on cache miss", async () => {
  const { router, env } = setup({ db: makeFakeDb({ catalogue: null }) });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/1/render"), env, {});
  assert.equal(res.status, 404);
});

test("GET .../render: page number exceeding page_count is a real 400", async () => {
  const db = makeFakeDb({ catalogue: { catalogue_id: "c1", page_count: 2, source_filename: "cat.pdf" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/5/render"), env, {});
  assert.equal(res.status, 400);
});

test("GET .../render: 404 when source PDF missing from R2", async () => {
  const db = makeFakeDb({ catalogue: { catalogue_id: "c1", page_count: 5, source_filename: "cat.pdf" } });
  let callCount = 0;
  const uploads = {
    async get() {
      callCount++;
      return null;
    },
    async put() {},
  };
  const { router, env } = setup({ db, uploads });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/1/render"), env, {});
  assert.equal(res.status, 404);
  assert.equal(callCount, 2);
});

test("GET .../render: real happy path extracts and caches a single page via injected PDFDocument", async () => {
  const db = makeFakeDb({ catalogue: { catalogue_id: "c1", page_count: 5, source_filename: "cat.pdf", storage_path: null } });
  let getCalls = 0;
  let putCalledWith = null;
  const uploads = {
    async get() {
      getCalls++;
      if (getCalls === 1) return null;
      return { async arrayBuffer() { return new ArrayBuffer(10); } };
    },
    async put(key, bytes) {
      putCalledWith = { key, bytes };
    },
  };
  const { router, env } = setup({ db, uploads });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1/pages/2/render"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("X-CPS-Cache"), "miss");
  assert.ok(putCalledWith.key.includes("page_2.pdf"));
});
