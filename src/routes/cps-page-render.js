import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, PDFDocument: Function }} deps
 */
export function registerCpsPageRenderRoutes(router, { authenticate, PDFDocument }) {
  router.get("/api/cps/catalogues/:catalogueId/pages/:pageNum/render", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const { catalogueId, pageNum } = request2.params;
      const pageNumber = parseInt(pageNum, 10);
      if (isNaN(pageNumber) || pageNumber < 1) {
        return jsonResponse3({ error: "Invalid page number" }, 400);
      }
      const cacheKey = `catalogues/${catalogueId}/pages/page_${pageNumber}.pdf`;
      const cached = await env2.UPLOADS.get(cacheKey);
      if (cached) {
        console.log(`[CPS Render] Cache HIT: ${cacheKey}`);
        const pdfBytes = await cached.arrayBuffer();
        return new Response(pdfBytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="page_${pageNumber}.pdf"`,
            "X-CPS-Cache": "hit",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
      console.log(`[CPS Render] Cache MISS: ${cacheKey}`);
      const catalogue = await env2.DB.prepare(`
        SELECT catalogue_id, source_filename, storage_path, page_count
        FROM catalogues
        WHERE catalogue_id = ?
      `).bind(catalogueId).first();
      if (!catalogue) {
        return jsonResponse3({ error: `Catalogue not found: ${catalogueId}` }, 404);
      }
      if (pageNumber > catalogue.page_count) {
        return jsonResponse3({
          error: `Page ${pageNumber} exceeds catalogue page count (${catalogue.page_count})`
        }, 400);
      }
      const sourceKey = catalogue.storage_path || `catalogues/${catalogue.source_filename}`;
      const sourcePdf = await env2.UPLOADS.get(sourceKey);
      if (!sourcePdf) {
        return jsonResponse3({
          error: `Source PDF not found in R2: ${sourceKey}`,
          hint: "Catalogue may not be uploaded yet"
        }, 404);
      }
      console.log(`[CPS Render] Extracting page ${pageNumber} from ${sourceKey}`);
      const sourceBytes = await sourcePdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const singlePageDoc = await PDFDocument.create();
      const [extractedPage] = await singlePageDoc.copyPages(pdfDoc, [pageNumber - 1]);
      singlePageDoc.addPage(extractedPage);
      const singlePageBytes = await singlePageDoc.save();
      await env2.UPLOADS.put(cacheKey, singlePageBytes, {
        httpMetadata: {
          contentType: "application/pdf"
        },
        customMetadata: {
          catalogueId,
          pageNumber: String(pageNumber),
          sourceFilename: catalogue.source_filename,
          extractedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      console.log(`[CPS Render] Cached: ${cacheKey} (${singlePageBytes.byteLength} bytes)`);
      const extractionId = `${catalogueId}-p${pageNumber}`;
      await env2.DB.prepare(`
        INSERT OR REPLACE INTO extraction_cache
        (cache_key, catalogue_id, pages, format, dpi, output_path, file_size_bytes, created_at, last_accessed, access_count)
        VALUES (?, ?, ?, 'pdf', 72, ?, ?, datetime('now'), datetime('now'), 1)
      `).bind(
        extractionId,
        catalogueId,
        String(pageNumber),
        cacheKey,
        singlePageBytes.byteLength
      ).run();
      return new Response(singlePageBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${catalogue.source_filename.replace(".pdf", "")}_page_${pageNumber}.pdf"`,
          "X-CPS-Cache": "miss",
          "X-CPS-Source": sourceKey,
          "Cache-Control": "public, max-age=86400"
        }
      });
    } catch (err) {
      console.error(`[CPS Render] Error: ${err.message}`);
      return jsonResponse3({
        error: "Failed to render page: " + err.message,
        stack: err.stack
      }, 500);
    }
  });
}
