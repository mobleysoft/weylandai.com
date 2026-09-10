import { jsonResponse3 } from "../lib/json-response.js";
import { countPdfPagesRaw } from "./hardware-schedule-extract.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, detectFileType: Function, extractPdfBookmarks2: Function, detectSchedulePages: Function, createExtractionSession: Function, logTelemetryEvent: Function }} deps
 */
export function registerUploadRoutes(router, { authenticate, detectFileType, extractPdfBookmarks2, detectSchedulePages, createExtractionSession, logTelemetryEvent }) {
  router.post("/api/upload/init", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { filename, fileSize, contentType, projectName, documentType, tenantId } = body;
      if (!filename) {
        return jsonResponse3({ error: "filename is required" }, 400);
      }
      const validDocumentTypes = ["door_schedule", "hardware_schedule", "finish_schedule", "frame_schedule"];
      if (documentType && !validDocumentTypes.includes(documentType)) {
        return jsonResponse3({ error: "Invalid document_type", valid_types: validDocumentTypes }, 400);
      }
      const uploadId = crypto.randomUUID();
      const r2Key = `hardware-sessions/${user.userId}/${uploadId}`;
      const multipartUpload = await env2.UPLOADS.createMultipartUpload(r2Key, {
        httpMetadata: { contentType: contentType || "application/pdf" },
        customMetadata: {
          filename,
          projectName: projectName || filename,
          // BF-2026-0219: Match /api/hardware-schedule/start default — hardware uploads should not misclassify
          documentType: documentType || "hardware_schedule",
          userId: user.userId,
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      console.log(`[Chunked Upload] Init: ${filename} (${fileSize || "?"} bytes) \u2192 ${r2Key}, uploadId=${multipartUpload.uploadId}`);
      return jsonResponse3({
        uploadId: multipartUpload.uploadId,
        r2Key,
        key: multipartUpload.key,
        chunkSizeBytes: 50 * 1024 * 1024,
        // Recommend 50MB chunks (under 100MB Worker limit)
        maxChunks: 100
        // R2 supports up to 10,000 parts
      });
    } catch (error5) {
      console.error("[Chunked Upload] Init error:", error5);
      return jsonResponse3({ error: "Failed to initialize upload", details: error5.message }, 500);
    }
  });
  router.put("/api/upload/part", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const r2UploadId = request2.headers.get("X-Upload-Id");
      const r2Key = request2.headers.get("X-R2-Key");
      const partNumber = parseInt(request2.headers.get("X-Part-Number"), 10);
      if (!r2UploadId || !r2Key || !partNumber) {
        return jsonResponse3({ error: "Missing required headers: X-Upload-Id, X-R2-Key, X-Part-Number" }, 400);
      }
      const multipartUpload = env2.UPLOADS.resumeMultipartUpload(r2Key, r2UploadId);
      const uploadedPart = await multipartUpload.uploadPart(partNumber, request2.body);
      console.log(`[Chunked Upload] Part ${partNumber} uploaded for ${r2Key}`);
      return jsonResponse3({
        partNumber: uploadedPart.partNumber,
        etag: uploadedPart.etag
      });
    } catch (error5) {
      console.error("[Chunked Upload] Part error:", error5);
      return jsonResponse3({ error: "Failed to upload chunk", details: error5.message }, 500);
    }
  });
  router.post("/api/upload/complete", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { uploadId, r2Key, parts, filename, projectName, documentType, tenantId, submittalId } = body;
      if (!r2Key) {
        return jsonResponse3({ error: "r2Key is required" }, 400);
      }
      if (uploadId && parts && Array.isArray(parts) && parts.length > 0) {
        console.log(`[Upload Complete] Finalizing multipart upload: ${parts.length} parts for ${r2Key}`);
        const multipartUpload = env2.UPLOADS.resumeMultipartUpload(r2Key, uploadId);
        await multipartUpload.complete(parts);
        console.log(`[Upload Complete] Multipart upload finalized: ${r2Key}`);
      }
      const validDocumentTypes = ["door_schedule", "hardware_schedule", "finish_schedule", "frame_schedule"];
      const resolvedDocumentType = documentType && validDocumentTypes.includes(documentType) ? documentType : "hardware_schedule";
      const resolvedProjectName = projectName || filename || "Hardware Schedule";
      const resolvedFilename = filename || "upload.pdf";
      const resolvedTenantId = tenantId || (request2?.user?.tenant_id || "ven_weyland");
      console.log(`[Upload Complete] Reading ${r2Key} from R2...`);
      const r2Object = await env2.UPLOADS.get(r2Key);
      if (!r2Object) {
        return jsonResponse3({
          error: "FILE_NOT_FOUND",
          message: "Uploaded file not found in R2. The presigned URL may have expired or the upload may have failed.",
          r2Key
        }, 404);
      }
      const fileBuffer = await r2Object.arrayBuffer();
      const fileSizeMB = (fileBuffer.byteLength / 1024 / 1024).toFixed(2);
      console.log(`[Upload Complete] Read ${fileSizeMB}MB from R2: ${r2Key}`);
      const fileInfo = detectFileType(fileBuffer);
      if (fileInfo.type === "unknown") {
        return jsonResponse3({
          success: false,
          error: "UNSUPPORTED_FILE_TYPE",
          message: "Uploaded file is not a recognized PDF or image format"
        }, 400);
      }
      const userId = user.userId;
      let pageCount;
      let sourceType;
      let documentOutline = null;
      if (fileInfo.type === "image") {
        pageCount = 1;
        sourceType = "image";
        console.log(`[Upload Complete] Image detected (${fileInfo.mimeType})`);
      } else {
        sourceType = "pdf";
        const pdfInfo = await extractPdfBookmarks2(fileBuffer);
        pageCount = pdfInfo.numPages;
        documentOutline = pdfInfo.bookmarks;
        if (!(pageCount > 1)) {
          const rawCount = countPdfPagesRaw(fileBuffer);
          if (rawCount > (pageCount || 0))
            pageCount = rawCount;
        }
        console.log(`[Upload Complete] PDF detected (${pageCount} pages, ${fileSizeMB}MB)`);
      }
      if (fileBuffer.byteLength <= 25 * 1024 * 1024) {
        await env2.CACHE.put(r2Key, fileBuffer, { expirationTtl: 86400 * 7 });
      } else {
        console.log(`[Upload Complete] Skipping KV cache \u2014 file ${fileSizeMB}MB exceeds 25MB KV limit. R2-only storage.`);
      }
      let detectedSchedulePages = null;
      if (documentOutline) {
        detectedSchedulePages = detectSchedulePages(documentOutline, resolvedDocumentType);
      }
      const sessionId = await createExtractionSession({
        userId,
        submittalId: submittalId || null,
        projectName: resolvedProjectName,
        filename: resolvedFilename,
        fileBufferKey: r2Key,
        totalPages: pageCount,
        sourceType,
        documentType: resolvedDocumentType,
        tenantId: resolvedTenantId,
        documentOutline,
        detectedSchedulePages
      }, env2);
      console.log(`[Upload Complete] Session ${sessionId} created: ${pageCount} pages, ${sourceType}, ${resolvedDocumentType}`);
      await logTelemetryEvent(env2, {
        eventType: "session",
        eventName: "hardware_session_created",
        severity: "info",
        message: `Hardware extraction session created via presigned upload: ${resolvedProjectName}`,
        context: {
          session_id: sessionId,
          project_name: resolvedProjectName,
          filename: resolvedFilename,
          total_pages: pageCount,
          file_size_bytes: fileBuffer.byteLength,
          source_type: sourceType,
          document_type: resolvedDocumentType,
          upload_method: "presigned_r2"
        },
        userId: user.userId,
        sessionId
      });
      return jsonResponse3({
        sessionId,
        projectName: resolvedProjectName,
        filename: resolvedFilename,
        totalPages: pageCount,
        sourceType,
        documentType: resolvedDocumentType,
        documentOutline,
        detectedSchedulePages,
        status: "active",
        uploadMethod: "presigned_r2",
        fileSizeMB: parseFloat(fileSizeMB),
        message: sourceType === "image" ? `Image session created (${resolvedDocumentType}). Ready for extraction.` : `Session created (${resolvedDocumentType}). ${pageCount} pages ready. Start extracting.`,
        next_step: `GET /api/hardware-schedule/session/${sessionId}/page/1`
      }, 201);
    } catch (error5) {
      console.error("[Upload Complete] Error:", error5);
      await logTelemetryEvent(env2, {
        eventType: "session",
        eventName: "hardware_session_failed",
        severity: "error",
        message: "Hardware extraction session creation failed (presigned upload)",
        context: { error_message: error5.message },
        userId: user.userId
      });
      return jsonResponse3({ error: "Failed to complete upload", details: error5.message }, 500);
    }
  });
}
