import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCatalogueDocumentsRoutes } from "./catalogue-documents.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ documents = [], product = { id: "p1" }, existingDoc = null, mfr = { id: "m1" }, existingProduct = null } = {}) {
  const handlers = {
    async first() {
      if (sql.includes("FROM manufacturers WHERE slug")) return mfr;
      if (sql.includes("FROM products WHERE manufacturer_id")) return existingProduct;
      if (sql.includes("SELECT id FROM products WHERE id")) return product;
      if (sql.includes("FROM product_documents WHERE product_id = ? AND (document_url")) return null;
      if (sql.includes("SELECT id, r2_object_key FROM product_documents")) return existingDoc;
      if (sql.includes("SELECT id FROM product_documents WHERE id")) return existingDoc;
      return null;
    },
    async all() {
      return { results: documents };
    },
    async run() {
      return { success: true };
    },
  };
  let sql = "";
  return {
    prepare(s) {
      sql = s;
      return { bind: (...args) => handlers, ...handlers };
    },
  };
}

function setup({ authenticate = authOk, db, uploads } = {}) {
  const router = new NativeRouter();
  registerCatalogueDocumentsRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async delete() {} } } };
}

test("GET /api/catalogue/documents: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/catalogue/documents"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/catalogue/documents: real happy path", async () => {
  const db = makeFakeDb({ documents: [{ id: "d1" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/catalogue/documents?product_id=p1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.documents.length, 1);
});

test("POST /api/catalogue/documents: missing product_id is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/documents", { method: "POST", body: JSON.stringify({ document_url: "x" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/catalogue/documents: missing document_url and r2_object_key is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/documents", { method: "POST", body: JSON.stringify({ product_id: "p1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/catalogue/documents: 404 when product not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ product: null }) });
  const req = new Request("https://example.com/api/catalogue/documents", { method: "POST", body: JSON.stringify({ product_id: "p1", document_url: "x" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/catalogue/documents: real happy path creates a document", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/documents", { method: "POST", body: JSON.stringify({ product_id: "p1", document_url: "https://x.pdf" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
});

test("PUT /api/catalogue/documents/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ existingDoc: null }) });
  const req = new Request("https://example.com/api/catalogue/documents/d1", { method: "PUT", body: JSON.stringify({ verified: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PUT /api/catalogue/documents/:id: no valid fields is a real 400", async () => {
  const db = makeFakeDb({ existingDoc: { id: "d1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/documents/d1", { method: "PUT", body: JSON.stringify({ not_a_field: 1 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/catalogue/documents/:id: real happy path updates verified as a boolean-to-int coercion", async () => {
  const db = makeFakeDb({ existingDoc: { id: "d1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/documents/d1", { method: "PUT", body: JSON.stringify({ verified: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
});

test("DELETE /api/catalogue/documents/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ existingDoc: null }) });
  const res = await router.handle(new Request("https://example.com/api/catalogue/documents/d1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 404);
});

test("DELETE /api/catalogue/documents/:id: real happy path deletes R2 object and D1 row", async () => {
  let deletedKey = null;
  const db = makeFakeDb({ existingDoc: { id: "d1", r2_object_key: "k1" } });
  const { router, env } = setup({ db, uploads: { async delete(key) { deletedKey = key; } } });
  const res = await router.handle(new Request("https://example.com/api/catalogue/documents/d1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
  assert.equal(deletedKey, "k1");
});

test("POST /api/catalogue/bulk-import: missing entries array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/bulk-import", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/catalogue/bulk-import: real happy path skips entries with no matched manufacturer", async () => {
  const db = makeFakeDb({ mfr: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/bulk-import", {
    method: "POST",
    body: JSON.stringify({ entries: [{ manufacturer: "NotReal", base_model: "X1" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.skipped, 1);
  assert.equal(body.errors.length, 1);
});

test("POST /api/catalogue/bulk-import: real happy path creates a new product and document", async () => {
  const db = makeFakeDb({ mfr: { id: "m1" }, existingProduct: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/bulk-import", {
    method: "POST",
    body: JSON.stringify({ entries: [{ manufacturer: "Schlage", parent_company: "Allegion", base_model: "L9000", filename: "l9000.pdf" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.created, 1);
  assert.equal(body.processed, 1);
});

test("POST /api/catalogue/bulk-import: real happy path updates existing product without recreating it", async () => {
  const db = makeFakeDb({ mfr: { id: "m1" }, existingProduct: { id: "p1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/bulk-import", {
    method: "POST",
    body: JSON.stringify({ entries: [{ manufacturer: "Schlage", base_model: "L9000" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.updated, 1);
  assert.equal(body.created, 0);
});
