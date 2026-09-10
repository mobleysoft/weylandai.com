import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsImportPricesRoutes } from "./cps-import-prices.js";

const authCpsOk = async () => ({ user: { userId: "u1" } });
const authCpsFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ existingProduct = null, existingVariant = null, manufacturer = { id: "mfr-1" } } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM products WHERE id")) return existingProduct;
          if (sql.includes("FROM manufacturers")) return manufacturer;
          if (sql.includes("FROM product_variants")) return existingVariant;
          return null;
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerCpsImportPricesRoutes(router, { authenticateCps: authCpsOk });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/cps/import-prices: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerCpsImportPricesRoutes(router, { authenticateCps: authCpsFail });
  const res = await router.handle(new Request("https://example.com/api/cps/import-prices", { method: "POST", body: "{}" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("POST /api/cps/import-prices: missing/empty variants array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/import-prices", { method: "POST", body: JSON.stringify({ variants: [] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/import-prices: a variant missing product_id/full_model_number is a real per-item error, not a throw", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/import-prices", { method: "POST", body: JSON.stringify({ variants: [{}] }) });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.errors.length, 1);
  assert.equal(body.imported, 0);
});

test("POST /api/cps/import-prices: real happy path inserts a new variant, auto-creating the product", async () => {
  const db = makeFakeDb({ existingProduct: null, existingVariant: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/import-prices", {
    method: "POST",
    body: JSON.stringify({ variants: [{ product_id: "prod-schlage-l9080", manufacturer_slug: "schlage", full_model_number: "L9080 06", list_price: 500 }] }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.imported, 1);
  assert.equal(body.productsCreated, 1);
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT OR IGNORE INTO products")));
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO product_variants")));
});

test("POST /api/cps/import-prices: real update path when the variant already exists", async () => {
  const db = makeFakeDb({ existingProduct: { id: "prod-1" }, existingVariant: { id: "var-1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/import-prices", {
    method: "POST",
    body: JSON.stringify({ variants: [{ id: "var-1", product_id: "prod-1", full_model_number: "L9080 06", list_price: 550 }] }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.updated, 1);
  assert.equal(body.productsCreated, 0);
  assert.ok(db.runs.some((r) => r.sql.includes("UPDATE product_variants")));
});

test("POST /api/cps/import-prices: real scrubModelTokens normalization strips a literal 'None' token", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/import-prices", {
    method: "POST",
    body: JSON.stringify({ variants: [{ product_id: "prod-1", manufacturer_slug: "schlage", full_model_number: "L9080 None 06" }] }),
  });
  const res = await router.handle(req, env, {});
  await res.json();
  const insertVariant = db.runs.find((r) => r.sql.includes("INSERT INTO product_variants"));
  assert.equal(insertVariant.binds[2], "L9080 06");
});
