import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerCpsSearchRoutes(router, { authenticate }) {
  router.get("/api/cps/search", async (request2, env2) => {
    const isInternalCall = request2.headers.get("X-Internal-API") === "Weyland-Discovery";
    if (!isInternalCall) {
      const { error: error4, user } = await authenticate(request2, env2);
      if (error4)
        return error4;
    }
    try {
      let expandSearchQuery = function(rawQuery) {
        let cleaned = rawQuery.replace(/[-]/g, " ").replace(/[^\w\s*]/g, "").trim();
        const lSeriesMatch = cleaned.match(/^L(\d{4})$/i);
        if (lSeriesMatch) {
          const num = lSeriesMatch[1];
          return `(L${num}* OR LV${num}*)`;
        }
        const lvSeriesMatch = cleaned.match(/^LV(\d{4})$/i);
        if (lvSeriesMatch) {
          const num = lvSeriesMatch[1];
          return `(LV${num}* OR L${num}*)`;
        }
        const vdMatch = cleaned.match(/^(98|99)\s*([A-Z]{2,})$/i);
        if (vdMatch) {
          const series = vdMatch[1];
          const suffix = vdMatch[2].toUpperCase();
          return `(${series}${suffix}* OR ${series} ${suffix}*)`;
        }
        return cleaned + "*";
      };
      const url = new URL(request2.url);
      const q = url.searchParams.get("q");
      const catalogueId = url.searchParams.get("catalogue_id");
      const manufacturer = url.searchParams.get("manufacturer");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      if (!q || q.trim().length < 2) {
        return jsonResponse3({ error: "Search query must be at least 2 characters" }, 400);
      }
      const normalizedMfr = manufacturer ? manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "") : null;
      const normalizedQuery = q.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      const queryTokens = normalizedQuery.split(" ").filter((t) => t.length >= 2);
      const trigramFtsQuery = queryTokens.length === 1 ? queryTokens[0] : queryTokens.join(" OR ");
      try {
        const excerptQuery = normalizedQuery.split(" ")[0];
        let trigramQuery = `
          SELECT DISTINCT cp.catalogue_id, cp.page_num,
                 c.manufacturer, c.title as catalogue_name,
                 CASE
                   WHEN INSTR(LOWER(cp.text_content), LOWER(?)) > 0 THEN
                     substr(cp.text_content,
                            MAX(1, INSTR(LOWER(cp.text_content), LOWER(?)) - 250),
                            500)
                   ELSE substr(cp.text_content, 1, 500)
                 END as excerpt
          FROM catalogue_trigram_fts tf
          JOIN catalogue_pages cp ON tf.catalogue_id = cp.catalogue_id AND tf.page_num = cp.page_num
          JOIN catalogues c ON cp.catalogue_id = c.catalogue_id
          WHERE catalogue_trigram_fts MATCH ?
        `;
        const trigramParams = [excerptQuery, excerptQuery, trigramFtsQuery];
        if (normalizedMfr) {
          trigramQuery += ` AND LOWER(REPLACE(c.manufacturer, '-', '')) LIKE ?`;
          trigramParams.push("%" + normalizedMfr + "%");
        }
        if (catalogueId) {
          trigramQuery += " AND cp.catalogue_id = ?";
          trigramParams.push(catalogueId);
        }
        trigramQuery += " ORDER BY rank LIMIT ?";
        trigramParams.push(limit);
        const trigramResult = await env2.DB.prepare(trigramQuery).bind(...trigramParams).all();
        if (trigramResult.results?.length > 0) {
          return jsonResponse3({
            query: q,
            searchMethod: "trigram",
            results: trigramResult.results,
            count: trigramResult.results.length
          });
        }
      } catch (trigramErr) {
        if (!trigramErr.message?.includes("no such table")) {
          console.error("Trigram search error:", trigramErr.message);
        }
      }
      const searchQuery = expandSearchQuery(q);
      let query = `
        SELECT cp.catalogue_id, cp.page_num,
               c.manufacturer, c.title as catalogue_name,
               snippet(catalogue_pages_fts, 0, '<mark>', '</mark>', '...', 32) as excerpt
        FROM catalogue_pages_fts
        JOIN catalogue_pages cp ON catalogue_pages_fts.rowid = cp.rowid
        JOIN catalogues c ON cp.catalogue_id = c.catalogue_id
        WHERE catalogue_pages_fts MATCH ?
      `;
      const params = [searchQuery];
      if (normalizedMfr) {
        query += ` AND LOWER(REPLACE(c.manufacturer, '-', '')) LIKE ?`;
        params.push("%" + normalizedMfr + "%");
      }
      if (catalogueId) {
        query += " AND cp.catalogue_id = ?";
        params.push(catalogueId);
      }
      query += " ORDER BY rank LIMIT ?";
      params.push(limit);
      const result = await env2.DB.prepare(query).bind(...params).all();
      return jsonResponse3({
        query: q,
        searchMethod: "fts5_expanded",
        results: result.results || [],
        count: result.results?.length || 0
      });
    } catch (err) {
      if (err.message?.includes("no such table")) {
        const url = new URL(request2.url);
        return jsonResponse3({
          query: url.searchParams.get("q"),
          results: [],
          count: 0,
          warning: "Full-text search index not yet available"
        });
      }
      return jsonResponse3({ error: "Search failed: " + err.message }, 500);
    }
  });
  router.post("/api/cps/search-component", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { model, manufacturer, description, type, notes, limit = 20 } = body;
      if (!model || model.trim().length < 2) {
        return jsonResponse3({ error: "Model is required (min 2 chars)" }, 400);
      }
      const searchTerms = [];
      const cleanModel = model.replace(/[^\w\s]/g, " ").trim().toLowerCase();
      if (cleanModel.length >= 2) {
        searchTerms.push({ term: cleanModel, weight: 3, field: "model" });
        const noSpaceModel = cleanModel.replace(/\s+/g, "");
        if (noSpaceModel !== cleanModel) {
          searchTerms.push({ term: noSpaceModel, weight: 3, field: "model" });
        }
        const baseModelMatch = noSpaceModel.match(/^([a-z]*\d+[a-z]*)/i);
        if (baseModelMatch && baseModelMatch[1].length >= 3 && baseModelMatch[1] !== noSpaceModel) {
          const baseModel = baseModelMatch[1].toLowerCase();
          searchTerms.push({ term: baseModel, weight: 2, field: "model_base" });
          console.log("[CPS Multi-Field] Extracted base model:", baseModel, "from", noSpaceModel);
        }
      }
      if (manufacturer && manufacturer.trim().length >= 2) {
        const cleanMfr = manufacturer.replace(/[^\w\s]/g, " ").trim().toLowerCase();
        searchTerms.push({ term: cleanMfr, weight: 2, field: "manufacturer" });
      }
      if (type && type.trim().length >= 3) {
        const cleanType = type.replace(/[^\w\s]/g, " ").trim().toLowerCase();
        searchTerms.push({ term: cleanType, weight: 1, field: "type" });
      }
      if (description && description.trim().length >= 3) {
        const stopWords = /* @__PURE__ */ new Set(["the", "and", "for", "with", "door", "doors", "inch", "series"]);
        const descWords = description.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
        descWords.slice(0, 5).forEach((word) => {
          searchTerms.push({ term: word, weight: 1, field: "description" });
        });
      }
      if (notes && notes.trim().length >= 3) {
        const noteWords = notes.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
        noteWords.slice(0, 3).forEach((word) => {
          searchTerms.push({ term: word, weight: 1, field: "notes" });
        });
      }
      if (searchTerms.length === 0) {
        return jsonResponse3({ error: "No valid search terms extracted" }, 400);
      }
      console.log("[CPS Multi-Field] Search terms:", JSON.stringify(searchTerms.map((t) => `${t.field}:${t.term}(${t.weight})`)));
      const fullModelTerm = searchTerms.find((t) => t.field === "model")?.term;
      const baseModelTerm = searchTerms.find((t) => t.field === "model_base")?.term;
      let pagesResult = await env2.DB.prepare(`
        SELECT cp.catalogue_id, cp.page_num, cp.text_content,
               c.manufacturer as catalogue_manufacturer, c.title as catalogue_name
        FROM catalogue_trigram_fts tf
        JOIN catalogue_pages cp ON tf.catalogue_id = cp.catalogue_id AND tf.page_num = cp.page_num
        JOIN catalogues c ON cp.catalogue_id = c.catalogue_id
        WHERE catalogue_trigram_fts MATCH ?
        LIMIT 100
      `).bind(fullModelTerm).all();
      if (!pagesResult.results?.length && baseModelTerm) {
        console.log("[CPS Multi-Field] No results for full model, trying base:", baseModelTerm);
        pagesResult = await env2.DB.prepare(`
          SELECT cp.catalogue_id, cp.page_num, cp.text_content,
                 c.manufacturer as catalogue_manufacturer, c.title as catalogue_name
          FROM catalogue_trigram_fts tf
          JOIN catalogue_pages cp ON tf.catalogue_id = cp.catalogue_id AND tf.page_num = cp.page_num
          JOIN catalogues c ON cp.catalogue_id = c.catalogue_id
          WHERE catalogue_trigram_fts MATCH ?
          LIMIT 100
        `).bind(baseModelTerm).all();
      }
      if (!pagesResult.results?.length) {
        return jsonResponse3({
          query: { model, manufacturer, description, type, notes },
          results: [],
          count: 0,
          searchTerms: searchTerms.map((t) => ({ term: t.term, field: t.field }))
        });
      }
      const scoredPages = pagesResult.results.map((page) => {
        const textLower = page.text_content.toLowerCase();
        let score = 0;
        const matches = [];
        for (const { term, weight, field } of searchTerms) {
          if (textLower.includes(term)) {
            score += weight;
            matches.push({ term, field, weight });
          }
        }
        let modelPos = textLower.indexOf(fullModelTerm);
        if (modelPos === -1 && baseModelTerm) {
          modelPos = textLower.indexOf(baseModelTerm);
        }
        const excerptStart = Math.max(0, modelPos - 250);
        const excerpt = page.text_content.substring(excerptStart, excerptStart + 500);
        return {
          catalogue_id: page.catalogue_id,
          page_num: page.page_num,
          manufacturer: page.catalogue_manufacturer,
          catalogue_name: page.catalogue_name,
          score,
          matches,
          excerpt
        };
      });
      scoredPages.sort((a, b) => b.score - a.score || a.page_num - b.page_num);
      const topResults = scoredPages.slice(0, Math.min(limit, 20));
      return jsonResponse3({
        query: { model, manufacturer, description, type, notes },
        searchMethod: "multi_field_scoring",
        results: topResults,
        count: topResults.length,
        totalMatches: scoredPages.length,
        searchTerms: searchTerms.map((t) => ({ term: t.term, field: t.field, weight: t.weight }))
      });
    } catch (err) {
      console.error("[CPS Multi-Field] Error:", err.message);
      return jsonResponse3({ error: "Multi-field search failed: " + err.message }, 500);
    }
  });
}
