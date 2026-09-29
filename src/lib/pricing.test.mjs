import { test } from "node:test";
import assert from "node:assert/strict";
import { MFR_CODE_MAP, cpsPriceLookup, enrichComponentsWithPricing, resolveCataloguePrices } from "./pricing.js";

function makeFakeDb({ aliases = [], variants = [] } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() { return null; },
        async all() {
          if (sql.includes("FROM manufacturer_aliases")) return { results: aliases };
          if (sql.includes("FROM product_variants")) return { results: variants };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

test("MFR_CODE_MAP: real manufacturer-name normalization for known brands", () => {
  assert.deepEqual(MFR_CODE_MAP["VON DUPRIN"], ["vonduprin", "allegion"]);
  assert.deepEqual(MFR_CODE_MAP["SCHLAGE"], ["schlage", "allegion"]);
});

test("resolveCataloguePrices(): no components returns an empty real array, no DB reads attempted", async () => {
  const db = makeFakeDb();
  const results = await resolveCataloguePrices({ DB: db }, []);
  assert.deepEqual(results, []);
});

test("resolveCataloguePrices(): real exact tokenized match against a catalogue row scored by manufacturer alias", async () => {
  const db = makeFakeDb({
    aliases: [{ alias: "SCHLAGE", manufacturer_id: "mfr-schlage" }],
    variants: [{
      variant_id: "v1", product_id: "p1", full_model_number: "L9080 06",
      finish_code: "626", finish_description: null, unit_price: 450, list_price: 500,
      price_uom: null, currency: "USD", catalog_section: null, catalog_page: null,
      price_effective_date: null, manufacturer_id: "mfr-schlage",
    }],
  });
  const results = await resolveCataloguePrices({ DB: db }, [
    { manufacturer: "SCHLAGE", model: "L9080 06", finish: "626" },
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].price, 450);
  assert.equal(results[0].method, "catalogue_exact_finish");
  assert.equal(results[0].finish_matched, true);
});

test("resolveCataloguePrices(): BEA components match a catalogue row that carries the real 10-series prefix the schedule dropped", async () => {
  const db = makeFakeDb({
    aliases: [{ alias: "BEA", manufacturer_id: "mfr-bea" }],
    variants: [{
      variant_id: "v-bea1", product_id: "p-bea1", full_model_number: "10BR3X",
      finish_code: null, finish_description: null, unit_price: 153.93, list_price: 153.93,
      price_uom: null, currency: "USD", catalog_section: null, catalog_page: null,
      price_effective_date: null, manufacturer_id: "mfr-bea",
    }],
  });
  const results = await resolveCataloguePrices({ DB: db }, [
    { manufacturer: "BEA", model: "BR3X" },
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].price, 153.93);
  assert.equal(results[0].matched_model, "10BR3X");
  assert.equal(results[0].method, "catalogue_exact");
});

test("resolveCataloguePrices(): a non-BEA manufacturer's bare model does NOT get the BEA prefix treatment", async () => {
  const db = makeFakeDb({
    aliases: [{ alias: "SCHLAGE", manufacturer_id: "mfr-schlage" }],
    variants: [{
      variant_id: "v-s1", product_id: "p-s1", full_model_number: "10BR3X",
      finish_code: null, finish_description: null, unit_price: 999, list_price: 999,
      price_uom: null, currency: "USD", catalog_section: null, catalog_page: null,
      price_effective_date: null, manufacturer_id: "mfr-schlage",
    }],
  });
  const results = await resolveCataloguePrices({ DB: db }, [
    { manufacturer: "SCHLAGE", model: "BR3X" },
  ]);
  assert.equal(results[0], null);
});

test("resolveCataloguePrices(): unknown manufacturer alias yields a real null (no match), not a throw", async () => {
  const db = makeFakeDb({ aliases: [], variants: [] });
  const results = await resolveCataloguePrices({ DB: db }, [{ manufacturer: "UNKNOWN BRAND", model: "X1" }]);
  assert.deepEqual(results, [null]);
});

test("cpsPriceLookup(): missing model returns null without touching the database", async () => {
  const db = makeFakeDb();
  const result = await cpsPriceLookup({ manufacturer: "SCHLAGE", model: "" }, { DB: db });
  assert.equal(result, null);
  assert.equal(db.runs.length, 0);
});

test("enrichComponentsWithPricing(): a real batch match writes unit_price/price_source/product_variant_id to D1", async () => {
  const db = makeFakeDb({
    aliases: [{ alias: "SCHLAGE", manufacturer_id: "mfr-schlage" }],
    variants: [{
      variant_id: "v1", product_id: "p1", full_model_number: "L9080 06",
      finish_code: "626", finish_description: null, unit_price: 450, list_price: 500,
      price_uom: null, currency: "USD", catalog_section: null, catalog_page: null,
      price_effective_date: null, manufacturer_id: "mfr-schlage",
    }],
  });
  const results = await enrichComponentsWithPricing(
    [{ id: "comp1", manufacturer: "SCHLAGE", model: "L9080 06", finish: "626" }],
    { DB: db }
  );
  assert.equal(results.enriched, 1);
  assert.equal(results.skipped, 0);
  const update = db.runs.find((r) => r.sql.includes("UPDATE hardware_components"));
  assert.ok(update, "expected a real UPDATE hardware_components write");
  assert.equal(update.binds[0], 450);
});

test("enrichComponentsWithPricing(): no match is a real skip, not a write", async () => {
  const db = makeFakeDb({ aliases: [], variants: [] });
  const results = await enrichComponentsWithPricing(
    [{ id: "comp1", manufacturer: "UNKNOWN", model: "ZZZ" }],
    { DB: db }
  );
  assert.equal(results.enriched, 0);
  assert.equal(results.skipped, 1);
  assert.equal(db.runs.some((r) => r.sql.includes("UPDATE hardware_components")), false);
});
