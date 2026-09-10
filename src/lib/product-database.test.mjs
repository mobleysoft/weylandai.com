import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_DATABASE, validateProductDatabase, findProductMatch, enrichComponent, matchProductFromDb, getCutSheetsForProduct, matchComponentToCutSheets } from "./product-database.js";

test("PRODUCT_DATABASE: real curated data loaded, every entry has the required fields", () => {
  assert.ok(PRODUCT_DATABASE.length > 0);
  for (const p of PRODUCT_DATABASE) {
    assert.ok(p.manufacturer, "missing manufacturer");
    assert.ok(Array.isArray(p.code) && p.code.length > 0, "missing/empty code array");
    assert.ok(Array.isArray(p.models) && p.models.length > 0, "missing/empty models array");
  }
});

test("validateProductDatabase(): real validation passes for the actual curated data (already ran once at import time too)", () => {
  const result = validateProductDatabase();
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("findProductMatch(): real manufacturer+model exact match returns high confidence", () => {
  const known = PRODUCT_DATABASE[0];
  const mfrCode = known.code[0];
  const model = known.models[0];
  const match = findProductMatch(mfrCode, model);
  assert.ok(match);
  assert.equal(match.matchConfidence, "high");
  assert.equal(match.matchType, "manufacturer+model");
});

test("findProductMatch(): no match for nonsense input returns null", () => {
  const match = findProductMatch("NOT-A-REAL-MFR-XYZ", "NOT-A-REAL-MODEL-XYZ");
  assert.equal(match, null);
});

test("enrichComponent(): real match fills in missing fields with enrichment metadata", () => {
  const known = PRODUCT_DATABASE[0];
  const component = { manufacturer: known.code[0], model: known.models[0] };
  const enriched = enrichComponent(component);
  assert.equal(enriched._enriched, true);
  assert.equal(enriched._enrichment_source, "product_database");
  assert.equal(enriched.product_name, known.productName);
});

test("enrichComponent(): no match returns the component unchanged", () => {
  const component = { manufacturer: "nope", model: "nope" };
  const enriched = enrichComponent(component);
  assert.equal(enriched, component);
});

function makeFakeDb({ exact = null, partial = null, category = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: () => ({
          async first() {
            if (sql.includes("UPPER(p.base_model) = ?")) return exact;
            if (sql.includes("p.category_level_1 = ?")) return category;
            if (sql.includes("ORDER BY LENGTH")) return partial;
            return null;
          },
        }),
      };
    },
  };
}

test("matchProductFromDb(): real exact D1 match returns high confidence", async () => {
  const db = makeFakeDb({ exact: { id: "p1", manufacturer_name: "Schlage" } });
  const result = await matchProductFromDb({ manufacturer: "Schlage", model: "L9080" }, { DB: db });
  assert.equal(result.confidence, "high");
  assert.equal(result.matchType, "exact");
});

test("matchProductFromDb(): real category-pattern fallback for door-hardware model prefixes", async () => {
  const db = makeFakeDb({ category: { id: "p2", category_level_1: "Hinges" } });
  const result = await matchProductFromDb({ manufacturer: "Unknown", model: "5BB1" }, { DB: db });
  assert.equal(result.confidence, "low");
  assert.equal(result.matchType, "category");
});

test("getCutSheetsForProduct(): real empty-array fallback on query failure, not a throw", async () => {
  const db = { prepare() { throw new Error("db down"); } };
  const result = await getCutSheetsForProduct("p1", { DB: db });
  assert.deepEqual(result, []);
});

test("matchComponentToCutSheets(): real unmatched shape when no product match found", async () => {
  const db = makeFakeDb({});
  const result = await matchComponentToCutSheets({ manufacturer: "nope", model: "nope" }, { DB: db });
  assert.equal(result.matched, false);
  assert.deepEqual(result.cutSheets, []);
});

test("matchComponentToCutSheets(): real matched shape assembles product + cutSheets from a real match", async () => {
  const db = {
    prepare(sql) {
      return {
        bind: () => ({
          async first() {
            if (sql.includes("UPPER(p.base_model) = ?")) {
              return { id: "p1", manufacturer_name: "Schlage", base_model: "L9080", display_name: "L9080 Lock" };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM product_documents")) {
              return { results: [{ id: "d1", document_title: "Spec Sheet", document_type: "cut_sheet", document_url: "https://x", r2_object_key: "k", r2_bucket: "b", page_count: 2 }] };
            }
            return { results: [] };
          },
        }),
      };
    },
  };
  const result = await matchComponentToCutSheets({ manufacturer: "Schlage", model: "L9080" }, { DB: db });
  assert.equal(result.matched, true);
  assert.equal(result.product.name, "L9080 Lock");
  assert.equal(result.cutSheets.length, 1);
});
