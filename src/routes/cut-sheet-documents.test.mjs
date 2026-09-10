import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetDocumentsRoutes } from "./cut-sheet-documents.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;

function makeFakeDb({ doc = null } = {}) {
  return {
    prepare() {
      return { bind: () => ({ async first() { return doc; } }) };
    },
  };
}

function setup({ db, uploads, outputs } = {}) {
  const router = new NativeRouter();
  registerCutSheetDocumentsRoutes(router, { authenticate: authOk, requireProductAccess: prodOk });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; } }, OUTPUTS: outputs || { async get() { return null; } } } };
}

test("GET /api/cut-sheets/documents/:docId: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerCutSheetDocumentsRoutes(router, { authenticate: authFail, requireProductAccess: prodOk });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/documents/d1"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/cut-sheets/documents/:docId: 404 when document not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ doc: null }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/documents/d1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cut-sheets/documents/:docId: real happy path returns the document row", async () => {
  const { router, env } = setup({ db: makeFakeDb({ doc: { id: "d1", document_title: "Spec Sheet" } }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/documents/d1"), env, {});
  const body = await res.json();
  assert.equal(body.document_title, "Spec Sheet");
});

test("GET /api/cut-sheets/download/:docId: 404 when document row not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ doc: null }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/download/d1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cut-sheets/download/:docId: 404 with unavailable:false when R2 object missing", async () => {
  const db = makeFakeDb({ doc: { id: "d1", r2_object_key: "k1", r2_bucket: "product-docs" } });
  const { router, env } = setup({ db, outputs: { async get() { return null; } } });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/download/d1"), env, {});
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.available, false);
});

test("GET /api/cut-sheets/download/:docId: real happy path streams from OUTPUTS when r2_bucket is product-docs", async () => {
  const db = makeFakeDb({ doc: { id: "d1", document_title: "Spec", r2_object_key: "k1", r2_bucket: "product-docs" } });
  const { router, env } = setup({ db, outputs: { async get() { return { body: new ReadableStream() }; } } });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/download/d1"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});

test("GET /api/cut-sheets/download/:docId: real happy path streams from UPLOADS when r2_bucket is anything else", async () => {
  const db = makeFakeDb({ doc: { id: "d1", document_title: "Spec", r2_object_key: "k1", r2_bucket: "subx-uploads" } });
  const { router, env } = setup({ db, uploads: { async get() { return { body: new ReadableStream() }; } } });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/download/d1"), env, {});
  assert.equal(res.status, 200);
});
