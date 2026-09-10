import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCatalogueProductsRoutes } from "./catalogue-products.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ products = [], total = 0, product = null, documents = [], variants = [], existing = null, changes = 1 } = {}) {
  const handlers = {
    async first() {
      if (sql.includes("SELECT COUNT(*) as total FROM products")) return { total };
      if (sql.includes("SELECT id FROM products WHERE id")) return existing;
      if (sql.includes("FROM products p")) return product;
      return null;
    },
    async all() {
      if (sql.includes("FROM product_documents")) return { results: documents };
      if (sql.includes("FROM product_variants")) return { results: variants };
      return { results: products };
    },
    async run() {
      return { success: true, meta: { changes } };
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

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCatalogueProductsRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/catalogue/products: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/catalogue/products: real happy path with pagination fields", async () => {
  const db = makeFakeDb({ products: [{ id: "p1" }], total: 3 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products?limit=10"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 3);
  assert.equal(body.products.length, 1);
});

test("GET /api/catalogue/products/search: query too short is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/search?q=a"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/catalogue/products/search: real happy path", async () => {
  const db = makeFakeDb({ products: [{ id: "p1" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/search?q=L9000"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 1);
});

test("GET /api/catalogue/products/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ product: null }) });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/p1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/catalogue/products/:id: real happy path returns product with documents and variants", async () => {
  const db = makeFakeDb({ product: { id: "p1", base_model: "L9000" }, documents: [{ id: "d1" }], variants: [{ id: "v1" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/p1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.documents.length, 1);
  assert.equal(body.variants.length, 1);
});

test("POST /api/catalogue/products: missing manufacturer_id/base_model is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/products", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/catalogue/products: real happy path creates a product", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/catalogue/products", {
    method: "POST",
    body: JSON.stringify({ manufacturer_id: "m1", base_model: "L9000" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
});

test("PUT /api/catalogue/products/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ existing: null }) });
  const req = new Request("https://example.com/api/catalogue/products/p1", { method: "PUT", body: JSON.stringify({ base_model: "X" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PUT /api/catalogue/products/:id: no valid fields is a real 400", async () => {
  const db = makeFakeDb({ existing: { id: "p1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/products/p1", { method: "PUT", body: JSON.stringify({ not_a_field: "x" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/catalogue/products/:id: real happy path updates allowed fields", async () => {
  const db = makeFakeDb({ existing: { id: "p1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/catalogue/products/p1", { method: "PUT", body: JSON.stringify({ base_model: "L9010" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
});

test("DELETE /api/catalogue/products/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ existing: null }) });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/p1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 404);
});

test("DELETE /api/catalogue/products/:id: real happy path deletes product and its documents/variants", async () => {
  const db = makeFakeDb({ existing: { id: "p1" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/catalogue/products/p1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
});
