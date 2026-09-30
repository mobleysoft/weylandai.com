import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsImportPricesRoutes, importPriceVariants } from "./cps-import-prices.js";

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

test("importPriceVariants(): a real sourceCatalogueId is persisted on INSERT - the citation link the original route silently dropped", async () => {
  const db = makeFakeDb({ existingProduct: { id: "prod-1" }, existingVariant: null });
  const result = await importPriceVariants(
    { DB: db },
    [{ product_id: "prod-1", full_model_number: "L9080 06", list_price: 500 }],
    "cat-schlage-20260930"
  );
  assert.equal(result.imported, 1);
  const insertVariant = db.runs.find((r) => r.sql.includes("INSERT INTO product_variants"));
  assert.ok(insertVariant.sql.includes("source_catalogue_id"));
  assert.ok(insertVariant.binds.includes("cat-schlage-20260930"));
});

test("importPriceVariants(): a real sourceCatalogueId is persisted on UPDATE too", async () => {
  const db = makeFakeDb({ existingProduct: { id: "prod-1" }, existingVariant: { id: "var-1" } });
  await importPriceVariants(
    { DB: db },
    [{ id: "var-1", product_id: "prod-1", full_model_number: "L9080 06", list_price: 550 }],
    "cat-schlage-20260930"
  );
  const updateVariant = db.runs.find((r) => r.sql.includes("UPDATE product_variants"));
  assert.ok(updateVariant.sql.includes("source_catalogue_id"));
  assert.ok(updateVariant.binds.includes("cat-schlage-20260930"));
});

// Real production discovery 2026-09-30: product_variants.price_uom does not
// exist in the live database at all, so this fallback path fires on every
// real call - but SQLite phrases a missing column differently depending on
// SQL context: SELECT says "no such column: X", INSERT/UPDATE says "table T
// has no column named X". This fake DB simulates the REAL INSERT wording
// (the earlier fake DB above never throws at all, so it could never have
// caught this - only a DB that actually rejects the price_uom-including
// statement, the way production genuinely does, exercises the fallback).
function makeFakeDbWithMissingPriceUom({ existingProduct = { id: "prod-1" }, manufacturer = { id: "mfr-1" } } = {}) {
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
          if (sql.includes("FROM product_variants") && sql.includes("price_uom")) {
            throw new Error("no such column: pv.price_uom");
          }
          if (sql.includes("FROM product_variants")) return null;
          return null;
        },
        async run() {
          if (sql.includes("price_uom") && (sql.includes("INSERT INTO product_variants") || sql.includes("UPDATE product_variants"))) {
            throw new Error("table product_variants has no column named price_uom");
          }
          runs.push({ sql, binds: stmt.binds });
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

test("importPriceVariants(): real production schema (price_uom column genuinely missing) - INSERT falls back and still succeeds", async () => {
  const db = makeFakeDbWithMissingPriceUom();
  const result = await importPriceVariants({ DB: db }, [{ product_id: "prod-1", full_model_number: "L9080 06", list_price: 500 }]);
  assert.equal(result.imported, 1);
  assert.equal(result.errors.length, 0);
  const insertRun = db.runs.find((r) => r.sql.includes("INSERT INTO product_variants"));
  assert.ok(insertRun, "the fallback INSERT (without price_uom) must actually run, not be swallowed");
  assert.ok(!insertRun.sql.includes("price_uom"), "the fallback statement must not reference the missing column");
});

test("importPriceVariants(): real production schema (price_uom column genuinely missing) - UPDATE falls back and still succeeds", async () => {
  const db = makeFakeDbWithMissingPriceUom();
  // Force the "existing variant" path by making the price_uom-including SELECT throw (matches
  // real behavior) and the fallback SELECT return a real existing row.
  db.prepare = ((original) => (sql) => {
    if (sql.includes("SELECT id FROM product_variants") && sql.includes("price_uom")) {
      return { bind() { return this; }, async first() { throw new Error("no such column: price_uom"); } };
    }
    if (sql.includes("SELECT id FROM product_variants")) {
      return { bind() { return this; }, async first() { return { id: "var-1" }; } };
    }
    return original(sql);
  })(db.prepare.bind(db));
  const result = await importPriceVariants({ DB: db }, [{ id: "var-1", product_id: "prod-1", full_model_number: "L9080 06", list_price: 550 }]);
  assert.equal(result.updated, 1);
  const updateRun = db.runs.find((r) => r.sql.includes("UPDATE product_variants"));
  assert.ok(updateRun, "the fallback UPDATE (without price_uom) must actually run, not be swallowed");
  assert.ok(!updateRun.sql.includes("price_uom"));
});

test("importPriceVariants(): omitting sourceCatalogueId (existing manual callers) still works, binds null", async () => {
  const db = makeFakeDb({ existingProduct: { id: "prod-1" }, existingVariant: null });
  const result = await importPriceVariants({ DB: db }, [{ product_id: "prod-1", full_model_number: "L9080 06", list_price: 500 }]);
  assert.equal(result.imported, 1);
  const insertVariant = db.runs.find((r) => r.sql.includes("INSERT INTO product_variants"));
  assert.ok(insertVariant.binds.includes(null));
});
