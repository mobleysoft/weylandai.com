import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { matchProductFromDb } from "../../src/lib/product-database.js";

// Execute the real matcher SQL against SQLite, using the same prepare/bind/first/all
// interface as D1. These are synthetic regression fixtures, not a catalogue snapshot.
const database = new DatabaseSync(":memory:");
database.exec(`
  CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);
  CREATE TABLE products (
    id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT,
    display_name TEXT, trade TEXT
  );
`);
const addManufacturer = database.prepare("INSERT INTO manufacturers VALUES (?, ?, ?)");
for (const row of [
  ["ngp", "National Guard Products", "NGP"],
  ["sloan", "Sloan Valve Company", "Sloan"],
  ["kohler", "Kohler", "Kohler"],
  ["lcn", "LCN", "LCN"],
  ["literal", "A_B Hardware", "A_B"],
  ["wildcard", "AXB Hardware", "AXB"],
]) addManufacturer.run(...row);

const addProduct = database.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?)");
for (const row of [
  ["doors-exact", "ngp", "K-2032", "ZZZ door product", "doors"],
  ["plumbing-exact", "kohler", "K-2032", "AAA plumbing product", "plumbing"],
  ["doors-twin", "ngp", "TWIN80", "ZZZ door twin", "doors"],
  ["plumbing-twin", "ngp", "TWIN80", "AAA plumbing twin", "plumbing"],
  ["doors-prefix", "ngp", "QQ7000A", "ZZZ longer door prefix", "doors"],
  ["plumbing-prefix", "ngp", "QQ700", "AAA shorter plumbing prefix", "plumbing"],
  ["other-exact", "kohler", "WW80", "Plumbing exact", "plumbing"],
  ["in-trade-prefix", "ngp", "WW8000A", "Door prefix", "doors"],
  ["other-only-prefix", "lcn", "OTH701", "Other-trade prefix", "plumbing"],
  ["qualified-full", "ngp", "Hardware Pack SLSS2", "Hardware pack", "doors"],
  ["wrong-token", "ngp", "Pack", "Short token", "doors"],
  ["royal-full", "sloan", "Royal 111", "Royal flushometer", "plumbing"],
  ["royal-token", "sloan", "Royal", "Short Royal token", "plumbing"],
  ["unknown-exact", "lcn", "EXACT40", "Exact fallback", "doors"],
  ["unknown-prefix", "lcn", "AQ120", "Prefix candidate", "doors"],
  ["word-prefix", "ngp", "PLATE PLUS", "Word prefix candidate", "doors"],
  ["numeric-prefix", "ngp", "800001", "Numeric prefix candidate", "doors"],
  ["numeric-exact", "ngp", "8136", "Numeric exact", "doors"],
  ["sql-wildcard-decoy", "lcn", "4040", "Wildcard decoy", "doors"],
  ["literal-underscore", "lcn", "40_0XP", "Literal underscore", "doors"],
  ["literal-percent", "lcn", "40%XP", "Literal percent", "doors"],
  ["literal-backslash", "lcn", "40\\0XP", "Literal backslash", "doors"],
  ["literal-manufacturer", "literal", "AB100", "ZZZ literal manufacturer", "doors"],
  ["manufacturer-decoy", "wildcard", "AB100", "AAA wildcard manufacturer", "doors"],
  ["tie-z", "lcn", "TIE100", "AAA tied name", "doors"],
  ["tie-a", "lcn", "TIE100", "AAA tied name", "doors"],
  ["tie-name", "lcn", "TIE100", "ZZZ later name", "doors"],
  ["prefix-tie-z", "lcn", "PX70A", "AAA tied prefix", "doors"],
  ["prefix-tie-a", "lcn", "PX70A", "ZZZ tied prefix", "doors"],
  ["prefix-tie-model", "lcn", "PX70Z", "AAA later model", "doors"],
  ["prefix-tie-length", "lcn", "PX7000", "AAA longer model", "doors"],
]) addProduct.run(...row);

const env = {
  DB: {
    prepare(sql) {
      const statement = database.prepare(sql);
      const bound = (values) => ({
        async first() { return statement.get(...values) || null; },
        async all() { return { results: statement.all(...values) }; },
      });
      return { bind: (...values) => bound(values), ...bound([]) };
    },
  },
};
after(() => database.close());

async function expectMatch(component, trade, id, matchType, confidence) {
  const result = await matchProductFromDb(component, env, trade);
  assert.ok(result, "expected a product match");
  assert.equal(result.product.id, id);
  assert.equal(result.matchType, matchType);
  assert.equal(result.confidence, confidence);
}

test("exact candidates prefer the requested trade, including within a manufacturer", async () => {
  await expectMatch({ model: "K-2032" }, "doors", "doors-exact", "exact", "high");
  await expectMatch({ manufacturer: "NGP", model: "TWIN80" }, "doors", "doors-twin", "exact", "high");
  await expectMatch({ manufacturer: "NGP", model: "TWIN80" }, "plumbing", "plumbing-twin", "exact", "high");
});

test("an exact named manufacturer wins before an exact other manufacturer", async () => {
  await expectMatch({ manufacturer: "Kohler", model: "K-2032" }, "doors", "plumbing-exact", "exact_other_trade", "medium");
});

test("an exact other trade wins before an in-trade prefix", async () => {
  await expectMatch({ model: "WW80" }, "doors", "other-exact", "exact_other_trade", "medium");
});

test("prefix candidates prefer the requested trade before shorter models", async () => {
  await expectMatch({ model: "QQ70" }, "doors", "doors-prefix", "partial", "low");
  await expectMatch({ manufacturer: "NGP", model: "QQ70" }, "doors", "doors-prefix", "partial", "medium");
  await expectMatch({ model: "QQ70" }, "plumbing", "plumbing-prefix", "partial", "low");
});

test("other-trade prefixes carry the trade label and retain medium or low confidence", async () => {
  await expectMatch({ model: "OTH70" }, "doors", "other-only-prefix", "partial_other_trade", "low");
  await expectMatch({ manufacturer: "LCN", model: "OTH70" }, "doors", "other-only-prefix", "partial_other_trade", "medium");
});

test("the full model and its finish-trimmed form win before a short token", async () => {
  await expectMatch({ manufacturer: "Sloan", model: "Royal", modelFull: "Royal 111" }, "doors", "royal-full", "exact_other_trade", "medium");
  await expectMatch({ manufacturer: "Sloan", model: "Royal", modelFull: "Royal 111 626" }, "doors", "royal-full", "exact_other_trade", "medium");
});

test("an unrecognized manufacturer token can be part of the exact model", async () => {
  await expectMatch({ manufacturer: "Hardware", model: "Pack", modelFull: "Pack SLSS2" }, "doors", "qualified-full", "exact", "high");
});

test("unknown manufacturers permit exact fallback at medium confidence and reject prefixes", async () => {
  await expectMatch({ manufacturer: "Unlisted Maker", model: "EXACT40" }, "doors", "unknown-exact", "exact_model_unknown_manufacturer", "medium");
  assert.equal(await matchProductFromDb({ manufacturer: "Unlisted Maker", model: "AQ12" }, env), null);
});

test("words and short bare numbers reject prefix matches; exact numbers still match", async () => {
  for (const model of ["PLATE", "800", "8000"]) {
    assert.equal(await matchProductFromDb({ model }, env), null, model);
  }
  await expectMatch({ model: "8136" }, "doors", "numeric-exact", "exact", "high");
  await expectMatch({ model: "80000" }, "doors", "numeric-prefix", "partial", "low");
});

test("LIKE treats underscore, percent and backslash in models literally", async () => {
  for (const [model, id] of [["40_0", "literal-underscore"], ["40%", "literal-percent"], ["40\\0", "literal-backslash"]]) {
    await expectMatch({ manufacturer: "LCN", model }, "doors", id, "partial", "medium");
  }
});

test("LIKE treats wildcard characters in manufacturer names literally", async () => {
  await expectMatch({ manufacturer: "A_B", model: "AB100" }, "doors", "literal-manufacturer", "exact", "high");
});

test("exact duplicate models use display name and id for deterministic ties", async () => {
  await expectMatch({ model: "TIE100" }, "doors", "tie-a", "exact", "high");
});

test("prefix duplicates use length, model and id for deterministic ties", async () => {
  await expectMatch({ model: "PX70" }, "doors", "prefix-tie-a", "partial", "low");
});

test("an empty trade includes every trade without an other-trade label", async () => {
  await expectMatch({ model: "K-2032" }, "", "plumbing-exact", "exact", "high");
});

test("catalog_number can supply the model for callers without a model field", async () => {
  await expectMatch({ catalog_number: "8136" }, "doors", "numeric-exact", "exact", "high");
});
