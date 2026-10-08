// weyland-shared/cut-sheet-pages.js
//
// One page of a catalogue PDF as its own PDF (2026-10-08), for the submittal
// packet (weyland-subx-worker/src/lib/submittal-assembler.js embeds the
// cited page of each matched product, never a whole price book) and for the
// citation render route (weyland-cutsheetx-worker/src/routes/cps-page-render.js
// serves the same bytes to a visitor).
//
// The page is copied out of the source PDF in R2 (UPLOADS) with the injected
// pdf-lib PDFDocument and cached at catalogues/<id>/pages/page_<n>.pdf, the
// key the render route has always used, so a page drawn for a citation is
// the page a packet embeds and the other way round. Nothing is fetched from
// outside R2.

import { resolveCatalogueKey } from "./catalogue-storage.js";

export function cataloguePageCacheKey(catalogueId, pageNum) {
  return "catalogues/" + catalogueId + "/pages/page_" + pageNum + ".pdf";
}

/**
 * The bytes of one page of a catalogue, or null with a reason.
 * Returns { bytes, cached, sourceKey } or { bytes: null, reason }.
 * reason: not_found | pdf_not_on_file | page_out_of_range | render_failed
 * `loaded` is an optional Map the caller keeps across pages of one build, so a
 * price book is parsed once per build when several items cite it.
 */
export async function getCataloguePagePdf(env, PDFDocument, { catalogueId, pageNum }, loaded = null) {
  const n = parseInt(pageNum, 10);
  if (!catalogueId || !Number.isFinite(n) || n < 1) return { bytes: null, reason: "page_out_of_range" };
  if (!env || !env.UPLOADS) return { bytes: null, reason: "pdf_not_on_file" };
  const cacheKey = cataloguePageCacheKey(catalogueId, n);
  try {
    const cached = await env.UPLOADS.get(cacheKey);
    if (cached) return { bytes: new Uint8Array(await cached.arrayBuffer()), cached: true, sourceKey: cacheKey };
  } catch (e) { /* fall through to the source PDF */ }
  const catalogue = await env.DB.prepare("SELECT catalogue_id, source_filename, storage_path, page_count FROM catalogues WHERE catalogue_id = ?").bind(catalogueId).first();
  if (!catalogue) return { bytes: null, reason: "not_found" };
  if (catalogue.page_count && n > catalogue.page_count) return { bytes: null, reason: "page_out_of_range" };
  const sourceKey = await resolveCatalogueKey(env, catalogue);
  if (!sourceKey) return { bytes: null, reason: "pdf_not_on_file" };
  try {
    let src = loaded && loaded.get(sourceKey);
    if (!src) {
      const obj = await env.UPLOADS.get(sourceKey);
      if (!obj) return { bytes: null, reason: "pdf_not_on_file" };
      src = await PDFDocument.load(await obj.arrayBuffer(), { ignoreEncryption: true });
      if (loaded) loaded.set(sourceKey, src);
    }
    if (n > src.getPageCount()) return { bytes: null, reason: "page_out_of_range" };
    const one = await PDFDocument.create();
    const [page] = await one.copyPages(src, [n - 1]);
    one.addPage(page);
    const bytes = await one.save();
    try {
      await env.UPLOADS.put(cacheKey, bytes, {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: { catalogueId, pageNumber: String(n), sourceFilename: catalogue.source_filename || "", extractedAt: new Date().toISOString() },
      });
    } catch (e) { /* the page is still returned */ }
    return { bytes, cached: false, sourceKey };
  } catch (e) {
    console.warn("[cut-sheet-pages] " + catalogueId + " p." + n + ": " + (e && e.message || e));
    return { bytes: null, reason: "render_failed" };
  }
}
