import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeManufacturerKey,
  parseModelString,
  generateSearchVariants,
  generateSearchQueries,
  normalizeManufacturer,
  matchComponentToCutSheet,
  batchMatchSessionComponents,
  persistSessionMatches,
} from "./cps-matching.js";

test("normalizeManufacturerKey: resolves known abbreviations to canonical names", () => {
  assert.equal(normalizeManufacturerKey("Von Duprin"), "vonduprin");
  assert.equal(normalizeManufacturerKey("VD"), "vonduprin");
  assert.equal(normalizeManufacturerKey("Schlage"), "schlage");
  assert.equal(normalizeManufacturerKey("Sarg"), "sargent");
});

test("normalizeManufacturerKey: unrecognized names pass through lowercased/stripped", () => {
  assert.equal(normalizeManufacturerKey("Totally Unknown Co."), "totallyunknownco");
});

test("normalizeManufacturerKey: empty input maps to 'unknown'", () => {
  assert.equal(normalizeManufacturerKey(""), "unknown");
  assert.equal(normalizeManufacturerKey(null), "unknown");
});

test("normalizeManufacturer: MANUFACTURER_ALIASES takes priority, falls back to normalizeManufacturerKey", () => {
  assert.equal(normalizeManufacturer("Von Duprin"), "vonduprin");
  assert.equal(normalizeManufacturer("AR"), "adamsrite");
  assert.equal(normalizeManufacturer("Some New Brand"), "somenewbrand");
  assert.equal(normalizeManufacturer(null), null);
});

test("parseModelString: strips a trailing finish code and identifies a known series", () => {
  const parsed = parseModelString("L9080 626", "Schlage");
  assert.equal(parsed.baseModel, "L9080");
  assert.equal(parsed.finish, "626");
  assert.equal(parsed.series, "L-Series");
  assert.equal(parsed.manufacturerKey, "schlage");
});

test("parseModelString: no finish code present leaves finish null", () => {
  const parsed = parseModelString("4040XP", "LCN");
  assert.equal(parsed.finish, null);
  assert.equal(parsed.baseModel, "4040XP");
});

test("parseModelString: empty input returns the real empty-state shape", () => {
  const parsed = parseModelString("", "Schlage");
  assert.deepEqual(parsed, { original: "", segments: [], baseModel: "", series: null });
});

test("generateSearchVariants: produces the base model and schlage L-prefix variant", () => {
  const variants = generateSearchVariants("9080", "Schlage");
  assert.ok(variants.includes("9080"));
  assert.ok(variants.includes("L9080"));
});

test("generateSearchVariants: filters out variants shorter than 2 chars", () => {
  const variants = generateSearchVariants("A", "Ives");
  assert.ok(variants.every((v) => v.length >= 2));
});

test("generateSearchQueries: real query strings built from manufacturer + model + series", () => {
  const queries = generateSearchQueries("L9080 626", "Schlage");
  assert.ok(queries.includes("Schlage L9080 cut sheet"));
  assert.ok(queries.includes("Schlage L-Series cut sheet"));
});

function makeFakeDb({ exactMatch = null, seriesMatch = null, fuzzyMatch = null, mfrMatch = null, extractions = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("p.base_model = ?")) return exactMatch;
            if (sql.includes("p.product_series = ?") && sql.includes("ORDER BY")) return seriesMatch;
            if (sql.includes("LENGTH(p.base_model)")) return fuzzyMatch;
            if (sql.includes("FROM product_documents")) return mfrMatch;
            return null;
          },
          async all() {
            if (sql.includes("FROM hardware_page_extractions")) return { results: extractions };
            return { results: [] };
          },
          async run() { return {}; },
        }),
      };
    },
  };
}

test("matchComponentToCutSheet: returns null with no DB binding", async () => {
  const result = await matchComponentToCutSheet({ manufacturer: "Schlage", model: "L9080" }, {});
  assert.equal(result, null);
});

test("matchComponentToCutSheet: real exact match takes priority over series/fuzzy/manufacturer", async () => {
  const db = makeFakeDb({ exactMatch: { id: "d1", document_title: "L9080 Cut Sheet" } });
  const result = await matchComponentToCutSheet({ manufacturer: "Schlage", model: "L9080" }, { DB: db });
  assert.equal(result.matchType, "exact");
  assert.equal(result.confidence, 0.99);
});

test("matchComponentToCutSheet: falls back to series match when no exact match", async () => {
  const db = makeFakeDb({ exactMatch: null, seriesMatch: { id: "d2", document_title: "L-Series Cut Sheet" } });
  const result = await matchComponentToCutSheet({ manufacturer: "Schlage", model: "L9999" }, { DB: db });
  assert.equal(result.matchType, "series");
  assert.equal(result.confidence, 0.85);
});

test("matchComponentToCutSheet: falls back to manufacturer-only match as the last resort", async () => {
  const db = makeFakeDb({ mfrMatch: { id: "d4", document_title: "Schlage General Catalog" } });
  const result = await matchComponentToCutSheet({ manufacturer: "Schlage", model: "Z9999999" }, { DB: db });
  assert.equal(result.matchType, "manufacturer_only");
});

test("matchComponentToCutSheet: returns null when nothing matches at all", async () => {
  const db = makeFakeDb({});
  const result = await matchComponentToCutSheet({ manufacturer: "Nobody", model: "X1" }, { DB: db });
  assert.equal(result, null);
});

test("batchMatchSessionComponents: no DB binding returns a real error shape", async () => {
  const result = await batchMatchSessionComponents("s1", {});
  assert.equal(result.error, "No database connection");
});

test("batchMatchSessionComponents: real dedup + match across parsed extraction rows", async () => {
  const extractions = [{
    extracted_data: JSON.stringify({
      hardware_groups: [{
        group_type: "hinge",
        components: [
          { manufacturer: "Schlage", model: "L9080" },
          { manufacturer: "Schlage", model: "L9080" }, // duplicate, should be deduped
          { manufacturer: "Unknown Brand", model: "ZZZ" },
        ],
      }],
    }),
  }];
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("p.base_model = ?") && args[0] === "schlage") {
              return { id: "d1", document_title: "L9080 Cut Sheet" };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM hardware_page_extractions")) return { results: extractions };
            return { results: [] };
          },
          async run() { return {}; },
        }),
      };
    },
  };
  const result = await batchMatchSessionComponents("s1", { DB: db });
  assert.equal(result.total, 2); // deduped to 2 unique components
  assert.equal(result.matched, 1);
  assert.equal(result.unmatched, 1);
  assert.equal(result.byMatchType.exact, 1);
});

test("persistSessionMatches: real INSERT for each matched component", async () => {
  const runCalls = [];
  const extractions = [{
    extracted_data: JSON.stringify({
      hardware_groups: [{ components: [{ manufacturer: "Schlage", model: "L9080" }] }],
    }),
  }];
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("p.base_model = ?")) return { id: "d1", document_title: "L9080 Cut Sheet" };
            return null;
          },
          async all() {
            if (sql.includes("FROM hardware_page_extractions")) return { results: extractions };
            return { results: [] };
          },
          async run() { runCalls.push(sql); return {}; },
        }),
      };
    },
  };
  const result = await persistSessionMatches("s1", { DB: db });
  assert.equal(result.matched, 1);
  assert.ok(runCalls.some((sql) => sql.includes("INSERT INTO session_cut_sheet_matches")));
});
