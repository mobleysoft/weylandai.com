// src/lib/cps-matching.js
//
// MONOLITH_HELPER_MAP.md's Cluster B: CPS manufacturer/model matching.
// Extracted from legacy-monolith.js's own `// model-normalizer.js` and
// `// component-matcher.js` esbuild module-boundary comments
// (~lines 138027-138360) - two source files that were bundled
// contiguously and are extracted together here since component-matcher
// depends directly on model-normalizer's exports (normalizeManufacturerKey,
// parseModelString).
//
// matchComponentToCutSheet (singular, this file) is a real, different
// function from the already-extracted matchComponentToCutSheets
// (plural, src/lib/product-database.js) - same naming pattern, distinct
// implementations, not a duplicate. Kept its original name; callers
// (routes/athena-integration.js) already disambiguate via explicit
// deps naming.
//
// generateSearchVariants/generateSearchQueries are also called from
// Cluster E (the not-yet-extracted manufacturer cut-sheet discovery
// engine, still inline in legacy-monolith.js as of this extraction) -
// exported here and imported back into legacy-monolith.js so those
// call sites keep resolving unchanged until Cluster E's own extraction.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort.

var FINISH_CODES = /* @__PURE__ */ new Set([
  // Schlage/Allegion finishes
  "605",
  "606",
  "609",
  "612",
  "613",
  "619",
  "622",
  "625",
  "626",
  "629",
  "630",
  "643E",
  "643",
  "644",
  "651",
  "652",
  "689",
  "690",
  "691",
  "694",
  "695",
  // Common 2-digit variants
  "03",
  "04",
  "05",
  "09",
  "10",
  "14",
  "15",
  "26",
  "28",
  "32",
  "32D",
  // Text finishes
  "US3",
  "US4",
  "US10",
  "US10B",
  "US26",
  "US26D",
  "US28",
  "US32",
  "US32D",
  "BSP",
  "WSP",
  "SP",
  "BP",
  "BLK",
  "DK",
  "LT",
  "AB",
  "PB",
  "SN",
  "PN",
  "MB",
  "BLACK",
  "BRONZE",
  "BRASS",
  "CHROME",
  "SATIN",
  "BRIGHT",
  "DULL",
  "OIL"
]);
var SERIES_FAMILIES = {
  schlage: {
    "L": "L-Series",
    "L9": "L-Series",
    "B": "B-Series",
    "D": "D-Series",
    "A": "A-Series",
    "AL": "AL-Series",
    "AD": "AD-Series",
    "CO": "CO-Series",
    "CL": "CL-Series",
    "ND": "ND-Series",
    "NDE": "NDE-Series",
    "LE": "LE-Series",
    "M9": "M-Series",
    "H": "H-Series",
    "J": "J-Series",
    "S": "S-Series"
  },
  lcn: {
    "1000": "1000-Series",
    "1460": "1460-Series",
    "2010": "2010-Series",
    "4000": "4000-Series",
    "4010": "4010-Series",
    "4020": "4020-Series",
    "4030": "4030-Series",
    "4040": "4040XP-Series",
    "4040XP": "4040XP-Series",
    "4041": "4040XP-Series",
    "4110": "4110-Series",
    "4310": "4310-Series",
    "6400": "6400-Series",
    "7500": "7500-Series",
    "8310": "8310-Series",
    "9540": "9540-Series"
  },
  vonduprin: {
    "22": "22-Series",
    "33": "33A-Series",
    "33A": "33A-Series",
    "35": "35-Series",
    "88": "88-Series",
    "94": "94-Series",
    "98": "98-99-Series",
    "99": "98-99-Series",
    "QEL": "QEL-Series"
  },
  sargent: {
    "10": "10-Line",
    "11": "11-Line",
    "28": "28-Line",
    "6500": "6500-Series",
    "7500": "7500-Series",
    "8200": "8200-Series",
    "8800": "8800-Series",
    "8900": "8900-Series",
    "SN": "SN-Series",
    "IN": "IN-Series"
  },
  yale: {
    "85": "8500-Series",
    "8000": "8000-Series",
    "8500": "8500-Series",
    "8700": "8700-Series",
    "8800": "8800-Series",
    "8900": "8900-Series",
    "AU": "AU-Series",
    "MO": "Monroe",
    "GA": "Galileo",
    "nexTouch": "nexTouch"
  },
  hager: {
    "BB": "BB-Series",
    "2500": "2500-Series",
    "3800": "3800-Series",
    "4500": "4500-Series",
    "5200": "5200-Series"
  },
  ives: {
    "5BB": "5BB-Series",
    "FB": "FB-Series",
    "SC": "SC-Series",
    "SR": "SR-Series",
    "LG": "LG-Series"
  },
  dormakaba: {
    "8600": "8600-Series",
    "9600": "9600-Series",
    "7500": "7500-Series",
    "ED": "ED-Series"
  }
};
export function normalizeManufacturerKey(manufacturer) {
  if (!manufacturer)
    return "unknown";
  const lower = manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    "vondupr": "vonduprin",
    "vondp": "vonduprin",
    "vd": "vonduprin",
    "sch": "schlage",
    "schl": "schlage",
    "iv": "ives",
    "ive": "ives",
    // Common 3-letter code from hardware schedules
    "hag": "hager",
    "sarg": "sargent",
    "dorm": "dormakaba",
    "dorma": "dormakaba",
    "kaba": "dormakaba",
    "fal": "falcon",
    // Falcon (ASSA ABLOY) - common 3-letter code
    "falcon": "falcon"
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (lower.startsWith(alias))
      return canonical;
  }
  return lower;
}
export function parseModelString(rawModel, manufacturer) {
  if (!rawModel)
    return { original: "", segments: [], baseModel: "", series: null };
  const original = rawModel.trim().toUpperCase();
  const segments = original.split(/[\s\-_\/]+/).filter(Boolean);
  const withoutFinish = [];
  let finish = null;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (FINISH_CODES.has(seg) || FINISH_CODES.has(seg.toUpperCase())) {
      finish = finish || seg;
    } else {
      withoutFinish.unshift(seg);
    }
  }
  const baseModel = withoutFinish[0] || "";
  const mfrKey = normalizeManufacturerKey(manufacturer);
  const families = SERIES_FAMILIES[mfrKey] || {};
  let series = null;
  for (let len = baseModel.length; len >= 1; len--) {
    const prefix = baseModel.substring(0, len);
    if (families[prefix]) {
      series = families[prefix];
      break;
    }
  }
  const numericMatch = baseModel.match(/(\d{2,5})/);
  const numericCore = numericMatch ? numericMatch[1] : null;
  return {
    original,
    segments,
    segmentsWithoutFinish: withoutFinish,
    baseModel,
    finish,
    series,
    numericCore,
    manufacturerKey: mfrKey
  };
}
export function generateSearchVariants(rawModel, manufacturer) {
  const parsed = parseModelString(rawModel, manufacturer);
  const variants = /* @__PURE__ */ new Set();
  if (parsed.baseModel) {
    variants.add(parsed.baseModel);
  }
  if (parsed.baseModel && /[A-Z]$/.test(parsed.baseModel)) {
    variants.add(parsed.baseModel.slice(0, -1));
  }
  if (parsed.series) {
    variants.add(parsed.series);
    variants.add(parsed.series.replace("-", ""));
    variants.add(parsed.series.replace("-Series", ""));
  }
  if (parsed.numericCore) {
    variants.add(parsed.numericCore);
    if (parsed.manufacturerKey === "schlage" && !parsed.baseModel.startsWith("L")) {
      variants.add("L" + parsed.numericCore);
    }
  }
  if (parsed.segmentsWithoutFinish.length > 1) {
    const first2 = parsed.segmentsWithoutFinish[0];
    const second = parsed.segmentsWithoutFinish[1];
    variants.add(`${first2}-${second}`);
    variants.add(`${first2}_${second}`);
    variants.add(`${first2}${second}`);
  }
  if (parsed.segmentsWithoutFinish.length > 0) {
    variants.add(parsed.segmentsWithoutFinish.join("-"));
    variants.add(parsed.segmentsWithoutFinish.join(""));
  }
  if (parsed.manufacturerKey === "lcn") {
    if (parsed.baseModel.match(/^(\d{4})/)) {
      variants.add(parsed.baseModel.match(/^(\d{4})/)[1]);
    }
  }
  if (parsed.manufacturerKey === "ives") {
    if (parsed.baseModel.match(/^(\d*[A-Z]{2}\d*)/)) {
      variants.add(parsed.baseModel.match(/^(\d*[A-Z]{2}\d*)/)[1]);
    }
  }
  return [...variants].filter((v) => v && v.length >= 2);
}
export function generateSearchQueries(rawModel, manufacturer) {
  const parsed = parseModelString(rawModel, manufacturer);
  const queries = [];
  if (parsed.baseModel) {
    queries.push(`${manufacturer} ${parsed.baseModel} cut sheet`);
    queries.push(`${manufacturer} ${parsed.baseModel} spec sheet`);
    queries.push(`${manufacturer} ${parsed.baseModel} specifications PDF`);
  }
  if (parsed.series) {
    queries.push(`${manufacturer} ${parsed.series} cut sheet`);
    queries.push(`${manufacturer} ${parsed.series} specifications`);
  }
  if (parsed.baseModel) {
    queries.push(parsed.baseModel);
  }
  if (parsed.numericCore && parsed.numericCore !== parsed.baseModel) {
    queries.push(parsed.numericCore);
  }
  return queries;
}

// component-matcher.js
var MANUFACTURER_ALIASES = {
  "sch": "schlage",
  "schlage": "schlage",
  "lcn": "lcn",
  "ives": "ives",
  "vd": "vonduprin",
  "von duprin": "vonduprin",
  "vonduprin": "vonduprin",
  "ar": "adamsrite",
  "adams rite": "adamsrite",
  "adamsrite": "adamsrite",
  "pemko": "pemko",
  "rixson": "rixson",
  "rockwood": "rockwood",
  "rw": "rockwood",
  "securitron": "securitron",
  "dorma": "dorma",
  "stanley": "stanley",
  "hager": "hager",
  "corbin": "corbin",
  "russwin": "russwin",
  "sargent": "sargent",
  "falcon": "falcon",
  "kaba": "kaba",
  "best": "best",
  "medeco": "medeco"
};
export function normalizeManufacturer(manufacturer) {
  if (!manufacturer)
    return null;
  const key = manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
  return MANUFACTURER_ALIASES[key] || normalizeManufacturerKey(manufacturer);
}
export async function matchComponentToCutSheet(component, env2) {
  if (!env2?.DB) {
    console.log("[Matcher] No DB binding available");
    return null;
  }
  const mfrKey = normalizeManufacturer(component.manufacturer);
  const model = component.model || component.catalog_number || "";
  const parsed = parseModelString(model, component.manufacturer);
  console.log(`[Matcher] Matching: ${mfrKey} / ${model} (base: ${parsed.baseModel}, series: ${parsed.series})`);
  try {
    const exactMatch = await env2.DB.prepare(`
      SELECT
        pd.id, pd.product_id, pd.document_title, pd.document_url,
        pd.r2_object_key, pd.r2_bucket, pd.file_size_bytes, pd.page_count,
        pd.verified, pd.notes,
        p.base_model, p.product_series,
        m.name as manufacturer_name, m.slug as manufacturer_slug
      FROM product_documents pd
      JOIN products p ON pd.product_id = p.id
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE pd.document_type = 'cut_sheet'
        AND pd.verified = 1
        AND (m.slug = ? OR m.name LIKE ?)
        AND p.base_model = ?
      LIMIT 1
    `).bind(mfrKey, `%${component.manufacturer}%`, parsed.baseModel).first();
    if (exactMatch) {
      console.log(`[Matcher] EXACT match: ${exactMatch.document_title}`);
      return {
        ...exactMatch,
        matchType: "exact",
        confidence: 0.99,
        matchedModel: parsed.baseModel
      };
    }
  } catch (e) {
    console.log(`[Matcher] Exact match query failed: ${e.message}`);
  }
  if (parsed.series) {
    try {
      const seriesMatch = await env2.DB.prepare(`
        SELECT
          pd.id, pd.product_id, pd.document_title, pd.document_url,
          pd.r2_object_key, pd.r2_bucket, pd.file_size_bytes, pd.page_count,
          pd.verified, pd.notes,
          p.base_model, p.product_series,
          m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM product_documents pd
        JOIN products p ON pd.product_id = p.id
        JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE pd.document_type = 'cut_sheet'
          AND pd.verified = 1
          AND (m.slug = ? OR m.name LIKE ?)
          AND (
            p.product_series = ?
            OR p.product_series LIKE ?
            OR pd.document_title LIKE ?
          )
        ORDER BY
          CASE WHEN p.product_series = ? THEN 0 ELSE 1 END,
          pd.updated_at DESC
        LIMIT 1
      `).bind(
        mfrKey,
        `%${component.manufacturer}%`,
        parsed.series,
        `${parsed.series}%`,
        `%${parsed.series}%`,
        parsed.series
      ).first();
      if (seriesMatch) {
        console.log(`[Matcher] SERIES match: ${seriesMatch.document_title} for series ${parsed.series}`);
        return {
          ...seriesMatch,
          matchType: "series",
          confidence: 0.85,
          matchedSeries: parsed.series
        };
      }
    } catch (e) {
      console.log(`[Matcher] Series match query failed: ${e.message}`);
    }
  }
  if (parsed.baseModel && parsed.baseModel.length >= 2) {
    try {
      const prefix = parsed.baseModel.substring(0, Math.min(4, parsed.baseModel.length));
      const fuzzyMatch = await env2.DB.prepare(`
        SELECT
          pd.id, pd.product_id, pd.document_title, pd.document_url,
          pd.r2_object_key, pd.r2_bucket, pd.file_size_bytes, pd.page_count,
          pd.verified, pd.notes,
          p.base_model, p.product_series,
          m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM product_documents pd
        JOIN products p ON pd.product_id = p.id
        JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE pd.document_type = 'cut_sheet'
          AND pd.verified = 1
          AND (m.slug = ? OR m.name LIKE ?)
          AND (
            p.base_model LIKE ? || '%'
            OR pd.document_title LIKE '%' || ? || '%'
          )
        ORDER BY
          ABS(LENGTH(p.base_model) - LENGTH(?)) ASC,
          pd.updated_at DESC
        LIMIT 1
      `).bind(
        mfrKey,
        `%${component.manufacturer}%`,
        prefix,
        prefix,
        parsed.baseModel
      ).first();
      if (fuzzyMatch) {
        console.log(`[Matcher] FUZZY match: ${fuzzyMatch.document_title} for prefix ${prefix}`);
        return {
          ...fuzzyMatch,
          matchType: "fuzzy",
          confidence: 0.7,
          matchedPrefix: prefix
        };
      }
    } catch (e) {
      console.log(`[Matcher] Fuzzy match query failed: ${e.message}`);
    }
  }
  try {
    const mfrMatch = await env2.DB.prepare(`
      SELECT
        pd.id, pd.product_id, pd.document_title, pd.document_url,
        pd.r2_object_key, pd.r2_bucket, pd.file_size_bytes, pd.page_count,
        pd.verified, pd.notes,
        p.base_model, p.product_series,
        m.name as manufacturer_name, m.slug as manufacturer_slug
      FROM product_documents pd
      JOIN products p ON pd.product_id = p.id
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE pd.document_type = 'cut_sheet'
        AND pd.verified = 1
        AND (m.slug = ? OR m.name LIKE ?)
      ORDER BY pd.updated_at DESC
      LIMIT 1
    `).bind(mfrKey, `%${component.manufacturer}%`).first();
    if (mfrMatch) {
      console.log(`[Matcher] MANUFACTURER match: ${mfrMatch.document_title}`);
      return {
        ...mfrMatch,
        matchType: "manufacturer_only",
        confidence: 0.5,
        note: "No exact model match - using manufacturer catalog"
      };
    }
  } catch (e) {
    console.log(`[Matcher] Manufacturer match query failed: ${e.message}`);
  }
  console.log(`[Matcher] No match found for ${mfrKey} / ${model}`);
  return null;
}
export async function batchMatchSessionComponents(sessionId, env2) {
  if (!env2?.DB) {
    return { error: "No database connection", matched: 0, unmatched: 0 };
  }
  let components = [];
  try {
    const extractions = await env2.DB.prepare(`
      SELECT extracted_data FROM hardware_page_extractions
      WHERE session_id = ? AND extracted_data IS NOT NULL
    `).bind(sessionId).all();
    const seen = /* @__PURE__ */ new Set();
    for (const row of extractions.results || []) {
      try {
        const data = JSON.parse(row.extracted_data);
        for (const group3 of data.hardware_groups || []) {
          for (const comp of group3.components || []) {
            const mfr = comp.manufacturer || comp.manufacturer_code || null;
            const mdl = comp.model || comp.model_number || null;
            const cat = comp.catalog_number || null;
            const key = `${mfr}|${mdl || cat}`;
            if (!seen.has(key) && (mfr || mdl)) {
              seen.add(key);
              components.push({
                manufacturer: mfr,
                model: mdl,
                catalog_number: cat,
                component_type: comp.component_type || group3.group_type
              });
            }
          }
        }
      } catch (e) {
        console.log(`[Matcher] Failed to parse extraction data: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`[Matcher] Failed to fetch session extractions: ${e.message}`);
  }
  console.log(`[Matcher] Batch matching ${components.length} unique components for session ${sessionId}`);
  const results = {
    sessionId,
    total: components.length,
    matched: 0,
    unmatched: 0,
    matches: [],
    missingCutSheets: [],
    byMatchType: {
      exact: 0,
      series: 0,
      fuzzy: 0,
      manufacturer_only: 0
    }
  };
  for (const component of components) {
    const match = await matchComponentToCutSheet(component, env2);
    if (match) {
      results.matched++;
      results.byMatchType[match.matchType] = (results.byMatchType[match.matchType] || 0) + 1;
      results.matches.push({
        manufacturer: component.manufacturer,
        model: component.model || component.catalog_number,
        cutSheetId: match.id,
        documentTitle: match.document_title,
        documentUrl: match.document_url,
        r2Key: match.r2_object_key,
        matchType: match.matchType,
        confidence: match.confidence
      });
    } else {
      results.unmatched++;
      results.missingCutSheets.push({
        manufacturer: component.manufacturer,
        model: component.model,
        catalogNumber: component.catalog_number,
        componentType: component.component_type
      });
    }
  }
  console.log(`[Matcher] Batch complete: ${results.matched}/${results.total} matched`);
  return results;
}
export async function persistSessionMatches(sessionId, env2) {
  const matchResults = await batchMatchSessionComponents(sessionId, env2);
  for (const match of matchResults.matches || []) {
    try {
      await env2.DB.prepare(`
        INSERT INTO session_cut_sheet_matches (
          id, session_id, cut_sheet_id,
          matched_manufacturer, matched_model, match_type, confidence,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'matched', CURRENT_TIMESTAMP)
        ON CONFLICT(session_id, cut_sheet_id) DO UPDATE SET
          match_type = excluded.match_type,
          confidence = excluded.confidence,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        `scm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        match.cutSheetId,
        match.manufacturer,
        match.model,
        match.matchType,
        match.confidence
      ).run();
    } catch (e) {
      console.log(`[Matcher] Failed to persist match: ${e.message}`);
    }
  }
  console.log(`[Matcher] Persisted ${matchResults.matched} matches for session ${sessionId}`);
  return matchResults;
}
