// src/routes/cps-price-candidates.js
//
// Discover/review/affirm/promote routes for the real, automated
// price-book extraction pipeline (see
// .claude/plans/glistening-whistling-fog.md). Candidates staged here by
// catalogue-price-discovery.js are never trusted directly - promote()
// is the only path that writes into product_variants, and only for
// rows a human has explicitly affirmed.

import { jsonResponse3 } from "../lib/json-response.js";
import { extractPricesFromPdfUrl, extractPricesFromPdfBuffer, extractPricesForComponent } from "../lib/catalogue-price-discovery.js";
import { importPriceVariants } from "./cps-import-prices.js";
import { parseModelString, normalizeManufacturerKey } from "../lib/cps-matching.js";

function newCatalogueId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function registerCpsPriceCandidatesRoutes(router, { authenticate, PDFDocument }) {
  router.post("/api/cps/price-candidates/discover", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const { url, manufacturer, trade } = await request2.json();
      if (!url) return jsonResponse3({ error: "url required" }, 400);
      const result = await extractPricesFromPdfUrl(url, { manufacturer, trade }, env2);
      if (result.error) return jsonResponse3(result, 502);
      return jsonResponse3(result);
    } catch (err) {
      return jsonResponse3({ error: "Failed to discover prices: " + err.message }, 500);
    }
  });

  router.post("/api/cps/price-candidates/upload", async (request, env) => {
    const { error, user } = await authenticate(request, env);
    if (error) return error;
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") return jsonResponse3({ error: "PDF file required" }, 400);
      if (file.size > 50 * 1024 * 1024) return jsonResponse3({ error: "PDF exceeds 50 MiB" }, 413);
      const result = await extractPricesFromPdfBuffer(await file.arrayBuffer(), { manufacturer: String(form.get("manufacturer") || ""), trade: "doors" }, env, "upload:" + String(file.name || "catalogue.pdf"));
      return jsonResponse3(result, result.error ? 422 : 200);
    } catch (err) { return jsonResponse3({ error: "Upload failed: " + err.message }, 400); }
  });

  router.get("/api/cps/price-candidates/:id/source", async (request, env) => {
    const { error } = await authenticate(request, env);
    if (error) return error;
    try {
      const candidate = await env.DB.prepare("SELECT * FROM catalogue_price_candidates WHERE id = ?").bind(request.params.id).first();
      if (!candidate) return jsonResponse3({ error: "candidate not found" }, 404);
      if (!candidate.temp_r2_key || !Number.isInteger(candidate.page_number) || candidate.page_number < 1) return jsonResponse3({ error: "Source page unavailable" }, 404);
      const obj = await env.UPLOADS.get(candidate.temp_r2_key);
      if (!obj) return jsonResponse3({ error: "Stored source PDF unavailable" }, 404);
      if (!PDFDocument) return jsonResponse3({ error: "PDF rendering unavailable" }, 503);
      const pdf = await PDFDocument.load(await obj.arrayBuffer());
      if (candidate.page_number > pdf.getPageCount()) return jsonResponse3({ error: "Source page outside PDF" }, 422);
      const page = await PDFDocument.create();
      page.addPage((await page.copyPages(pdf, [candidate.page_number - 1]))[0]);
      return new Response(await page.save(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=source-page.pdf", "Cache-Control": "private, no-store", "X-CPS-Source-Page": String(candidate.page_number) } });
    } catch (err) { return jsonResponse3({ error: "Source preview failed: " + err.message }, 422); }
  });

  router.post("/api/cps/price-candidates/discover-by-model", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const { manufacturer, model, trade } = await request2.json();
      if (!manufacturer || !model) return jsonResponse3({ error: "manufacturer and model required" }, 400);
      const result = await extractPricesForComponent({ manufacturer, model }, env2, { trade });
      if (result.error) return jsonResponse3(result, 502);
      return jsonResponse3(result);
    } catch (err) {
      return jsonResponse3({ error: "Failed to discover prices: " + err.message }, 500);
    }
  });

  router.get("/api/cps/price-candidates", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const url = new URL(request2.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const manufacturer = url.searchParams.get("manufacturer");
      const affirmedParam = url.searchParams.get("affirmed");
      const rejectedParam = url.searchParams.get("rejected");
      let query = "SELECT * FROM catalogue_price_candidates WHERE 1=1";
      const params = [];
      const ids = url.searchParams.get("ids");
      if (ids !== null) {
        const values = ids.split(",").filter(Boolean);
        if (!values.length || values.length > 200) return jsonResponse3({ error: "Provide 1 to 200 candidate ids" }, 400);
        query += " AND id IN (" + values.map(() => "?").join(",") + ")";
        params.push(...values);
      }
      if (manufacturer) {
        query += " AND manufacturer LIKE ?";
        params.push(`%${manufacturer}%`);
      }
      if (affirmedParam !== null) {
        query += " AND affirmed = ?";
        params.push(affirmedParam === "true" || affirmedParam === "1" ? 1 : 0);
      }
      if (rejectedParam !== null) {
        query += " AND rejected = ?";
        params.push(rejectedParam === "true" || rejectedParam === "1" ? 1 : 0);
      }
      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = await env2.DB.prepare(query).bind(...params).all();
      return jsonResponse3({ candidates: result.results || [], limit, offset });
    } catch (err) {
      return jsonResponse3({ error: "Failed to list price candidates: " + err.message }, 500);
    }
  });

  router.patch("/api/cps/price-candidates/:id/affirm", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const { id } = request2.params;
      const { affirmed, edits, reviewed_source } = await request2.json();
      if (!user.userId) return jsonResponse3({ error: "Sign in to save corrections or affirm prices" }, 403);
      if (typeof affirmed !== "boolean") return jsonResponse3({ error: "affirmed must be an explicit boolean" }, 400);
      if (affirmed && reviewed_source !== true) return jsonResponse3({ error: "Confirm human source review before affirming" }, 400);
      const allowed = new Set(["full_model_number", "finish_code", "finish_description", "list_price", "unit_price", "price_uom"]);
      if (edits && (typeof edits !== "object" || Array.isArray(edits) || Object.keys(edits).some(k => !allowed.has(k)))) return jsonResponse3({ error: "Unsupported correction fields" }, 400);
      if (edits && ["list_price", "unit_price"].some(k => edits[k] != null && (typeof edits[k] !== "number" || !Number.isFinite(edits[k]) || edits[k] < 0))) return jsonResponse3({ error: "Price must be a finite nonnegative number" }, 400);
      if (edits && ["full_model_number", "finish_code", "finish_description", "price_uom"].some(k => edits[k] != null && typeof edits[k] !== "string")) return jsonResponse3({ error: "Model, finish and unit corrections must be text" }, 400);
      const candidate = await env2.DB.prepare("SELECT * FROM catalogue_price_candidates WHERE id = ?").bind(id).first();
      if (!candidate) return jsonResponse3({ error: "candidate not found" }, 404);

      const merged = { ...candidate, ...(edits || {}) };
      if (!String(merged.full_model_number || "").trim() || merged.list_price == null || !Number.isFinite(Number(merged.list_price)) || Number(merged.list_price) < 0) return jsonResponse3({ error: "A model and valid list price are required" }, 400);
      await env2.DB.prepare(`
        UPDATE catalogue_price_candidates
        SET full_model_number = ?, finish_code = ?, finish_description = ?,
            list_price = ?, unit_price = ?, price_uom = ?,
            affirmed = ?, affirmed_by = ?, affirmed_at = ?
        WHERE id = ?
      `).bind(
        merged.full_model_number, merged.finish_code, merged.finish_description,
        merged.list_price, merged.unit_price, merged.price_uom,
        affirmed ? 1 : 0, affirmed ? user.userId : null, affirmed ? new Date().toISOString() : null,
        id
      ).run();

      await env2.DB.prepare(`
        INSERT INTO affirm_audit_log (id, entity_type, entity_id, action, user_id, user_email, entity_snapshot, created_at)
        VALUES (?, 'catalogue_price_candidate', ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), id, affirmed ? "affirm" : "unaffirm",
        user.userId, user.email, JSON.stringify(merged), new Date().toISOString()
      ).run().catch((e) => console.warn("[Affirm Audit] Log failed:", e.message));

      return jsonResponse3({ success: true, id, affirmed: !!affirmed });
    } catch (err) {
      return jsonResponse3({ error: "Failed to affirm candidate: " + err.message }, 500);
    }
  });

  router.post("/api/cps/price-candidates/reject", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const { ids, reason } = await request2.json();
      if (!Array.isArray(ids) || !ids.length) return jsonResponse3({ error: "ids array required" }, 400);
      let rejected = 0;
      for (const id of ids.slice(0, 500)) {
        await env2.DB.prepare(
          "UPDATE catalogue_price_candidates SET rejected = 1, rejected_reason = ? WHERE id = ?"
        ).bind(reason || null, id).run();
        rejected++;
      }
      return jsonResponse3({ success: true, rejected });
    } catch (err) {
      return jsonResponse3({ error: "Failed to reject candidates: " + err.message }, 500);
    }
  });

  router.post("/api/cps/price-candidates/promote", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const { ids, catalogue_id } = await request2.json();
      let query = "SELECT * FROM catalogue_price_candidates WHERE affirmed = 1 AND rejected = 0 AND promoted_at IS NULL";
      const params = [];
      if (Array.isArray(ids) && ids.length) {
        query += ` AND id IN (${ids.map(() => "?").join(",")})`;
        params.push(...ids);
      } else if (catalogue_id) {
        query += " AND catalogue_id = ?";
        params.push(catalogue_id);
      } else {
        return jsonResponse3({ error: "ids or catalogue_id required" }, 400);
      }
      const { results: rows } = await env2.DB.prepare(query).bind(...params).all();
      if (!rows.length) return jsonResponse3({ promoted: 0, productsCreated: 0, errors: [] });

      // Group by (source_url, manufacturer) - one real catalogues row per
      // real source, reusing whichever the candidates already reference.
      const groups = new Map();
      for (const row of rows) {
        const key = `${row.source_url}::${row.manufacturer || ""}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }

      const errors = [];
      let productsCreated = 0;
      let promoted = 0;

      for (const [, groupRows] of groups) {
        const first = groupRows[0];
        let resolvedCatalogueId = first.catalogue_id;
        if (!resolvedCatalogueId) {
          resolvedCatalogueId = newCatalogueId();
          const sourceHash = await sha256Hex(first.source_url);
          await env2.DB.prepare(`
            INSERT INTO catalogues
            (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count,
             manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date)
            VALUES (?, ?, ?, 0, 0, ?, ?, datetime('now'), ?, ?, ?, NULL)
          `).bind(
            resolvedCatalogueId,
            `${resolvedCatalogueId}.citation`,
            sourceHash,
            first.manufacturer || null,
            `${first.manufacturer || "Unknown"} - extracted price candidates`,
            user.userId,
            first.temp_r2_key || "",
            first.source_url
          ).run();
        }

        const variants = groupRows.map((row) => {
          const mfrKey = normalizeManufacturerKey(row.manufacturer || "");
          const parsed = parseModelString(row.full_model_number, row.manufacturer || "");
          const baseModel = parsed.baseModel || row.full_model_number;
          return {
            product_id: `prod-${mfrKey}-${baseModel.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            manufacturer_slug: mfrKey,
            base_model: baseModel,
            full_model_number: row.full_model_number,
            finish_code: row.finish_code || null,
            finish_description: row.finish_description || null,
            list_price: row.list_price,
            unit_price: row.unit_price,
            price_uom: row.price_uom || "EA",
            _candidateId: row.id,
          };
        });

        const result = await importPriceVariants(env2, variants, resolvedCatalogueId);
        productsCreated += result.productsCreated;
        errors.push(...result.errors);

        for (const row of groupRows) {
          await env2.DB.prepare(`
            UPDATE catalogue_price_candidates
            SET catalogue_id = ?, promoted_at = datetime('now')
            WHERE id = ?
          `).bind(resolvedCatalogueId, row.id).run();
        }
        promoted += result.imported + result.updated;
      }

      return jsonResponse3({ promoted, productsCreated, errors: errors.length ? errors : void 0 });
    } catch (err) {
      return jsonResponse3({ error: "Failed to promote candidates: " + err.message }, 500);
    }
  });
}
