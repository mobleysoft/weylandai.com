// src/lib/pricing.js
//
// CPS catalogue pricing engine: manufacturer-code normalization
// (MFR_CODE_MAP), single-component lookup (cpsPriceLookup), batch
// tokenized fuzzy matching against product_variants (resolveCataloguePrices),
// and the D1-write enrichment pass (enrichComponentsWithPricing).
//
// Extracted 2026-09-10 from legacy-monolith.js. This is genuinely shared
// logic, not just a convenient grouping: it's called from the CPS pricing
// routes (src/routes/pricing.js) AND is a direct dependency of the
// still-unextracted takeoff/quotes cluster and CPS/cut-sheet cluster
// (WORKER_MODULARIZATION_MAP.md steps 6 and 8) - extracting it first,
// as its own module, means neither future extraction has to duplicate it
// or reach back into legacy-monolith.js for it.
//
// Non-contiguous extraction: these four pieces sat at three different
// locations in the monolith (MFR_CODE_MAP/cpsPriceLookup/
// enrichComponentsWithPricing together; resolveCataloguePrices ~2,500
// lines further down, called by the others via hoisting since it's a
// function declaration), with unrelated CPS/takeoff route handlers
// interleaved between them. Left in place: autoEnrichSessionOnSave
// (single call site, tightly coupled to the CPS session-save flow) -
// it still imports enrichComponentsWithPricing from here.
//
// __name(fn, "fnName") bundler bookkeeping calls (esbuild sets fn.name
// for stack traces) are stripped throughout - not real behavior.

const MFR_CODE_MAP = {
  "SCH": ["schlage", "allegion"],
  "SCHLAGE": ["schlage", "allegion"],
  "IVE": ["ives", "allegion"],
  "IVES": ["ives", "allegion"],
  "FAL": ["falcon", "allegion"],
  "FALCON": ["falcon", "allegion"],
  "LCN": ["lcn", "allegion"],
  "VD": ["vonduprin", "allegion"],
  "VDP": ["vonduprin", "allegion"],
  "VONDUPRIN": ["vonduprin", "allegion"],
  "VON DUPRIN": ["vonduprin", "allegion"],
  "GJ": ["glynn-johnson", "allegion"],
  "GLY": ["glynn-johnson", "allegion"],
  "SAR": ["sargent"],
  "SARGENT": ["sargent"],
  "SGT": ["sargent"],
  "ZER": ["zero"],
  "ZERO": ["zero"],
  "BEA": ["bea"],
  "CAM": ["camden"],
  "CAMDEN": ["camden"],
  "HOR": ["horton"],
  "HORTON": ["horton"],
  "NGP": ["ngp"],
  "PEM": ["pemko"],
  "PEMKO": ["pemko"],
  "TRI": ["trimco"],
  "TRIMCO": ["trimco"],
  "DKB": ["dormakaba"],
  "DORMA": ["dormakaba"],
  "HAG": ["hager"],
  "HAGER": ["hager"]
};

async function cpsPriceLookup(component, env2) {
  try {
    const [r] = await resolveCataloguePrices(env2, [component]);
    if (r && r.price != null) {
      return {
        variantId: r.variant_id,
        productId: r.product_id,
        listPrice: r.list_price != null ? r.list_price : r.price,
        unitPrice: r.price,
        priceUom: r.price_uom || null,
        // A5: unit basis rides the result
        finishCode: r.matched_finish,
        finishMatch: !!r.finish_matched,
        confidence: r.confidence,
        matchType: r.method
      };
    }
  } catch (e) {
    console.warn("[CPS Price Lookup] unified matcher error, falling back:", e.message);
  }
  const db = env2.DB;
  const mfgCode = (component.manufacturer || "").toUpperCase().trim();
  const modelRaw = (component.model || component.catalog_number || "").toUpperCase().trim();
  const finishRaw = (component.finish || "").toUpperCase().trim();
  if (!modelRaw)
    return null;
  try {
    const mfgSlugs = MFR_CODE_MAP[mfgCode] || [mfgCode.toLowerCase()];
    const modelParts = modelRaw.split(/[\s-]+/);
    const baseModel = modelParts[0] || modelRaw;
    const seriesBase = baseModel.replace(/[A-Z]$/i, "");
    for (const mfgSlug of mfgSlugs) {
      let variant = await db.prepare(`
        SELECT pv.*, p.manufacturer_id, p.base_model, p.product_series
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE m.slug = ?
          AND pv.active = 1
          AND (UPPER(pv.manufacturer_part_number) LIKE ? OR UPPER(pv.full_model_number) LIKE ?)
        ORDER BY
          CASE WHEN pv.finish_code = ? THEN 0 ELSE 1 END,
          pv.list_price DESC
        LIMIT 1
      `).bind(mfgSlug, `%${baseModel}%`, `%${baseModel}%`, finishRaw).first();
      if (variant && variant.list_price) {
        console.log(
          "[CPS Price Lookup][legacy-diagnostic] variant_model would have priced",
          JSON.stringify({
            model: modelRaw,
            mfg: mfgCode,
            variant: variant.id,
            matched: variant.full_model_number,
            price: variant.list_price
          })
        );
        return null;
      }
      if (seriesBase.length >= 3) {
        variant = await db.prepare(`
          SELECT pv.*, p.manufacturer_id, p.base_model, p.product_series
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          JOIN manufacturers m ON p.manufacturer_id = m.id
          WHERE m.slug = ?
            AND pv.active = 1
            AND (UPPER(p.base_model) LIKE ? OR UPPER(p.product_series) LIKE ?)
            AND pv.list_price IS NOT NULL
          ORDER BY
            CASE WHEN pv.finish_code = ? THEN 0 ELSE 1 END,
            pv.list_price DESC
          LIMIT 1
        `).bind(mfgSlug, `${seriesBase}%`, `%${seriesBase}%`, finishRaw).first();
        if (variant && variant.list_price) {
          console.log(
            "[CPS Price Lookup][legacy-diagnostic] series_match would have priced",
            JSON.stringify({
              model: modelRaw,
              mfg: mfgCode,
              variant: variant.id,
              matched: variant.full_model_number,
              price: variant.list_price
            })
          );
          return null;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("[CPS Price Lookup] Error:", err);
    return null;
  }
}

async function enrichComponentsWithPricing(components, env2) {
  const results = { enriched: 0, skipped: 0, matches: [] };
  let batchResolved = [];
  try {
    batchResolved = await resolveCataloguePrices(env2, components);
  } catch (e) {
    console.error("[CPS Enrich] batch resolver failed, per-component fallback:", e.message);
    batchResolved = new Array(components.length).fill(null);
  }
  for (let idx = 0; idx < components.length; idx++) {
    const comp = components[idx];
    const br = batchResolved[idx];
    const priceMatch = br && br.price != null ? {
      variantId: br.variant_id,
      productId: br.product_id,
      listPrice: br.list_price != null ? br.list_price : br.price,
      unitPrice: br.price,
      priceUom: br.price_uom || null,
      finishCode: br.matched_finish,
      finishMatch: !!br.finish_matched,
      confidence: br.confidence,
      matchType: br.method
    } : await cpsPriceLookup(comp, env2);
    if (!priceMatch) {
      results.skipped++;
      continue;
    }
    await env2.DB.prepare(`
      UPDATE hardware_components
      SET unit_price = ?,
          price_source = 'catalog',
          product_variant_id = ?,
          product_match_confidence = ?,
          updated_at = datetime('now')
      WHERE id = ? AND (unit_price IS NULL OR price_source = 'catalog')
    `).bind(
      priceMatch.unitPrice,
      priceMatch.variantId,
      priceMatch.confidence,
      comp.id
    ).run();
    results.enriched++;
    results.matches.push({
      componentId: comp.id,
      manufacturer: comp.manufacturer,
      model: comp.model,
      variantId: priceMatch.variantId,
      listPrice: priceMatch.listPrice,
      unitPrice: priceMatch.unitPrice,
      confidence: priceMatch.confidence,
      matchType: priceMatch.matchType,
      finishMatch: priceMatch.finishMatch
    });
  }
  return results;
}

async function resolveCataloguePrices(env2, components) {
  const results = new Array(components.length).fill(null);
  if (!components.length)
    return results;
  const aliasRows = (await env2.DB.prepare(
    "SELECT alias, manufacturer_id FROM manufacturer_aliases"
  ).all().catch(() => null))?.results || [];
  const aliasMap = {};
  for (const a of aliasRows)
    aliasMap[String(a.alias).toUpperCase()] = a.manufacturer_id;
  let catRes = await env2.DB.prepare(`
    SELECT pv.id AS variant_id, pv.product_id,
           pv.full_model_number, pv.finish_code, pv.finish_description,
           pv.unit_price, pv.list_price, pv.price_uom,
           pv.currency, pv.catalog_section, pv.catalog_page, pv.price_effective_date,
           p.manufacturer_id
    FROM product_variants pv LEFT JOIN products p ON pv.product_id = p.id
    WHERE pv.active = 1 AND (pv.unit_price IS NOT NULL OR pv.list_price IS NOT NULL)
  `).all().catch(() => null);
  if (!catRes) {
    catRes = await env2.DB.prepare(`
      SELECT pv.id AS variant_id, pv.product_id,
             pv.full_model_number, pv.finish_code, pv.finish_description,
             pv.unit_price, pv.list_price,
             pv.currency, pv.catalog_section, pv.catalog_page, pv.price_effective_date,
             p.manufacturer_id
      FROM product_variants pv LEFT JOIN products p ON pv.product_id = p.id
      WHERE pv.active = 1 AND (pv.unit_price IS NOT NULL OR pv.list_price IS NOT NULL)
    `).all().catch(() => null);
  }
  const catRows = catRes?.results || [];
  const tokenize2 = (s) => String(s || "").toUpperCase().replace(/(\d+(?:\.\d+)?)["”]?\s*X\s*(\d+(?:\.\d+)?)["”]?/g, "$1X$2").split(/[\s\-\/,()]+/).filter((t) => t.length > 0);
  const BARE_FINISH_ANCHOR_OK = new Set(["mfr-ngp", "mfr-zero"]);
  const dimShaped = (t) => /^\d+(?:\.\d+)?X\d+(?:\.\d+)?$/.test(t) || t.includes('"');
  const finishShaped = (t) => /^6\d{2}[A-Z]?$/.test(t) || /^US\d+[A-Z]?$/.test(t) || t === "USP" || /^SP\d+$/.test(t) || t === "NRP" || t === "BLK" || t === "NONE";
  const strongestTok = (toks) => {
    let best = null, fallback = null;
    for (const t of toks) {
      if (dimShaped(t) || t === "NONE")
        continue;
      if (!fallback || t.length > fallback.length)
        fallback = t;
      if (!finishShaped(t) && (!best || t.length > best.length))
        best = t;
    }
    return best || fallback || toks[0];
  };
  const LENGTH_UOMS = new Set(["FT", "LB", "RL", "M", "LF", "IN"]);
  const rowUom = (row) => {
    if (row.price_uom) {
      const u = String(row.price_uom).toUpperCase().trim();
      return u === "EA" ? null : u;
    }
    const m = String(row.finish_description || "").match(/\blist per ([A-Z]{1,4})\b/i) || String(row.full_model_number || "").match(/\/\s*(FT|LB|LF)\b/i);
    return m ? m[1].toUpperCase() : null;
  };
  const parseLengthFt = (s) => {
    s = String(s || "");
    let m = s.match(/(\d+(?:\.\d+)?)\s*['′](?:\s*(\d+(?:\.\d+)?)\s*["”])?/);
    if (m)
      return parseFloat(m[1]) + (m[2] ? parseFloat(m[2]) / 12 : 0);
    const inches = [...s.matchAll(/(?<![\/\d.])(\d+(?:\.\d+)?)\s*["”]/g)].map((x) => parseFloat(x[1]));
    if (inches.length)
      return Math.max(...inches) / 12;
    return null;
  };
  const entries = [];
  const byJoined = {};
  for (const row of catRows) {
    const toks = tokenize2(row.full_model_number);
    if (!toks.length)
      continue;
    const anchor = strongestTok(toks);
    const modelNorm = toks.join("");
    const finNorm = String(row.finish_code || "").toUpperCase().trim();
    if (finNorm && modelNorm === finNorm)
      continue;
    if (finishShaped(anchor) && !BARE_FINISH_ANCHOR_OK.has(row.manufacturer_id))
      continue;
    const joined = toks.join("");
    const entry = { row, toks, joined, anchor, uom: rowUom(row) };
    entries.push(entry);
    (byJoined[joined] = byJoined[joined] || []).push(entry);
  }
  const bhma = (f) => {
    const m = String(f || "").match(/\b(\d{3}[A-Z]?)\b/);
    return m ? m[1] : null;
  };
  const pureNum = (t) => /^\d+(?:\.\d+)?$/.test(t);
  const tokMatches = (catTok, compToks) => compToks.some((ct) => ct === catTok || !pureNum(catTok) && !pureNum(ct) && (catTok.length >= 2 && ct.startsWith(catTok) && ct.length - catTok.length <= 3 || ct.length >= 3 && catTok.startsWith(ct) && catTok.length - ct.length <= 3));
  const rank = (list, mfrId, finish, compTokSet) => list.slice().sort((a, b) => (b.row.manufacturer_id === mfrId ? 1 : 0) - (a.row.manufacturer_id === mfrId ? 1 : 0) || (b.row.finish_code === finish ? 1 : 0) - (a.row.finish_code === finish ? 1 : 0) || (compTokSet && compTokSet.has(b.anchor) ? 1 : 0) - (compTokSet && compTokSet.has(a.anchor) ? 1 : 0) || b.toks.length - a.toks.length || (a.row.unit_price == null ? 1 : 0) - (b.row.unit_price == null ? 1 : 0) || (a.row.list_price || 0) - (b.row.list_price || 0));
  const entriesByMfr = new Map();
  for (const e of entries) {
    if (!e.row.manufacturer_id)
      continue;
    if (!entriesByMfr.has(e.row.manufacturer_id))
      entriesByMfr.set(e.row.manufacturer_id, []);
    entriesByMfr.get(e.row.manufacturer_id).push(e);
  }
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    const compToks = tokenize2(c.model);
    if (!compToks.length)
      continue;
    const mfrId = aliasMap[String(c.manufacturer || "").toUpperCase().trim()] || null;
    if (!mfrId)
      continue;
    const scoped = entriesByMfr.get(mfrId) || [];
    if (!scoped.length)
      continue;
    const finish = bhma(c.finish);
    const compJoined = compToks.join("");
    const compTokSet = new Set(compToks);
    const compUom = String(c.uom || "EA").toUpperCase().trim() || "EA";
    const compIsLength = LENGTH_UOMS.has(compUom);
    const compLenFt = compIsLength ? null : parseLengthFt(c.model) ?? parseLengthFt(c.description);
    const uomOk = (e) => {
      if (e.uom == null)
        return true;
      const rowLen = LENGTH_UOMS.has(e.uom);
      if (!rowLen)
        return !compIsLength;
      if (compIsLength)
        return e.uom === compUom;
      return e.uom === "FT" && compLenFt != null;
    };
    let hit = null, method = null, pool3 = null;
    const exactRows = (byJoined[compJoined] || []).filter((e) => e.row.manufacturer_id === mfrId && uomOk(e));
    if (exactRows.length) {
      pool3 = exactRows;
      hit = rank(exactRows, mfrId, finish, compTokSet)[0];
      method = "catalogue_exact";
    }
    if (!hit) {
      const covered = scoped.filter((e) => uomOk(e) && e.toks.every((t) => tokMatches(t, compToks)) && // anchor (A3): the catalogue's STRONGEST token must match the
      // component's chain — option codes alone must never price a part
      tokMatches(e.anchor, compToks));
      if (covered.length) {
        pool3 = covered;
        hit = rank(covered, mfrId, finish, compTokSet)[0];
        method = "catalogue_base_model";
      }
    }
    if (!hit) {
      const compAnchor = strongestTok(compToks);
      const covered = scoped.filter((e) => uomOk(e) && compToks.every((t) => tokMatches(t, e.toks)) && tokMatches(compAnchor, e.toks));
      if (covered.length) {
        pool3 = covered;
        hit = rank(covered, mfrId, finish, compTokSet)[0];
        method = "catalogue_variant_floor";
      }
    }
    if (hit) {
      const mfrMatched = hit.row.manufacturer_id === mfrId;
      let finishMatched = !!(finish && String(hit.row.finish_code || "").toUpperCase().trim() === finish);
      let floorized = false;
      if (finish && hit.row.finish_code && !finishMatched) {
        const BASE_FINISHES = new Set(["626", "628", "652", "689", "600"]);
        const byPrice = (a, b) => (a.row.unit_price != null ? a.row.unit_price : a.row.list_price != null ? a.row.list_price : Infinity) - (b.row.unit_price != null ? b.row.unit_price : b.row.list_price != null ? b.row.list_price : Infinity);
        const sameModel = pool3.filter((e) => e.joined === hit.joined).sort(byPrice);
        const cheapest = sameModel[0];
        if (!cheapest || !BASE_FINISHES.has(String(cheapest.row.finish_code || "").toUpperCase().trim())) {
          continue;
        }
        hit = cheapest;
        floorized = true;
      }
      const CONF = {
        catalogue_exact: [0.95, 0.85],
        catalogue_base_model: [0.75, 0.65],
        catalogue_variant_floor: [0.5, 0.45]
      };
      let confidence = CONF[method][finishMatched ? 0 : 1];
      let methodOut = `${method}${finishMatched ? "_finish" : ""}${mfrMatched ? "" : "_unscoped"}`;
      if (floorized) {
        confidence = Math.min(confidence, 0.5);
        methodOut += "_finish_cross_floor";
      }
      let price = hit.row.unit_price != null ? hit.row.unit_price : hit.row.list_price;
      let priceType = hit.row.unit_price != null ? "unit_price" : "list_price";
      let perUomRate = null, computedLengthFt = null;
      if (hit.uom === "FT" && !compIsLength && compLenFt != null) {
        perUomRate = price;
        computedLengthFt = Math.round(compLenFt * 1e3) / 1e3;
        price = Math.round(perUomRate * compLenFt * 100) / 100;
        priceType = "computed_per_length";
        methodOut = "catalogue_per_length" + (floorized ? "_finish_cross_floor" : "");
        confidence = Math.min(confidence, 0.7);
      }
      results[i] = {
        price,
        price_type: priceType,
        price_uom: hit.uom != null ? hit.uom : null,
        per_uom_rate: perUomRate,
        computed_length_ft: computedLengthFt,
        currency: hit.row.currency || "USD",
        variant_id: hit.row.variant_id || null,
        product_id: hit.row.product_id || null,
        matched_model: hit.row.full_model_number,
        matched_finish: hit.row.finish_code || null,
        list_price: hit.row.list_price != null ? hit.row.list_price : null,
        method: methodOut,
        confidence,
        finish_matched: finishMatched,
        provenance: { section: hit.row.catalog_section || null, page: hit.row.catalog_page || null, effective: hit.row.price_effective_date || null }
      };
    }
  }
  return results;
}

export { MFR_CODE_MAP, cpsPriceLookup, enrichComponentsWithPricing, resolveCataloguePrices };
