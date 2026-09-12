// src/routes/cut-sheet-documents.js
//
// Real cut-sheet document metadata lookup and PDF download/streaming
// from R2 (product-docs bucket via env.OUTPUTS, everything else via
// env.UPLOADS). Extracted 2026-09-10 from legacy-monolith.js
// (previously inline, lines 148107-148175).

import { jsonResponse3 } from "../lib/json-response.js";

export function registerCutSheetDocumentsRoutes(router, { authenticate, requireProductAccess }) {
router.get("/api/cut-sheets/documents/:docId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  try {
    const docId = request2.params.docId;
    const doc = await env2.DB.prepare(`
      SELECT id, product_id, document_type, document_title, file_name,
             r2_object_key, r2_bucket, file_size_bytes, page_count,
             source_url, source_domain, verified, verified_by, verified_at,
             created_at, updated_at
      FROM product_documents
      WHERE id = ?
    `).bind(docId).first();
    if (!doc) {
      return jsonResponse3({ error: "Document not found" }, 404);
    }
    return jsonResponse3(doc);
  } catch (error5) {
    console.error("[Cut Sheet Document] Error:", error5);
    return jsonResponse3({ error: "Failed to retrieve document: " + error5.message }, 500);
  }
});
router.get("/api/cut-sheets/download/:docId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
    if (_prodErr) return _prodErr;
  }
  try {
    const docId = request2.params.docId;
    const doc = await env2.DB.prepare(`
      SELECT id, product_id, document_title, r2_object_key, r2_bucket
      FROM product_documents
      WHERE id = ?
    `).bind(docId).first();
    if (!doc) {
      return jsonResponse3({ error: "Document not found" }, 404);
    }
    const bucket = doc.r2_bucket === "product-docs" ? env2.OUTPUTS : env2.UPLOADS;
    const object = await bucket.get(doc.r2_object_key);
    if (!object) {
      return jsonResponse3({
        error: "Document file not found in storage",
        r2Key: doc.r2_object_key,
        available: false
      }, 404);
    }
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.document_title || "cut_sheet"}.pdf"`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (error5) {
    console.error("[Cut Sheet Download] Error:", error5);
    return jsonResponse3({
      error: "Failed to retrieve document",
      details: error5.message
    }, 500);
  }
});
}
