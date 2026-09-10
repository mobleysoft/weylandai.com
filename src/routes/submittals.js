import { jsonResponse3 } from "../lib/json-response.js";
import { requireProductAccess } from "../lib/auth.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, logTelemetryEvent: Function, dispatchVisionExtraction: Function }} deps
 */
export function registerSubmittalsRoutes(router, { authenticate, logTelemetryEvent, dispatchVisionExtraction }) {
  router.post("/api/submittals/upload", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "subx");
      if (_prodErr) return _prodErr;
    }
    const uploadStartTime = Date.now();
    try {
      const formData = await request2.formData();
      const files = formData.getAll("file");
      const projectName = formData.get("projectName") || "Untitled Project";
      if (!files || files.length === 0) {
        return jsonResponse3({ error: "No file provided" }, 400);
      }
      const results = [];
      for (const file of files) {
        const fileProcessingStartTime = Date.now();
        if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
          await logTelemetryEvent(env2, {
            eventType: "upload",
            eventName: "pdf_upload_skipped",
            severity: "warning",
            message: `File skipped: ${file.name} - not a PDF`,
            context: {
              filename: file.name,
              content_type: file.type,
              reason: "invalid_file_type"
            },
            userId: user.userId
          });
          results.push({
            filename: file.name,
            status: "skipped",
            error: "Only PDF files are supported"
          });
          continue;
        }
        const submittalId = crypto.randomUUID();
        const userId = user.userId;
        const fileBufferKey = `file-buffers/${userId}/${submittalId}`;
        const fileBuffer = await file.arrayBuffer();
        const fileSizeBytes = fileBuffer.byteLength;
        await logTelemetryEvent(env2, {
          eventType: "upload",
          eventName: "pdf_upload_start",
          severity: "info",
          message: `PDF upload started: ${file.name}`,
          context: {
            submittal_id: submittalId,
            filename: file.name,
            file_size_bytes: fileSizeBytes,
            content_type: file.type,
            project_name: projectName
          },
          userId: user.userId,
          sessionId: submittalId
        });
        if (fileBuffer.byteLength <= 25 * 1024 * 1024) {
          await env2.CACHE.put(fileBufferKey, fileBuffer, {
            expirationTtl: 86400 * 7
            // 7 days
          });
        } else {
          console.log(`[Submittal Upload] Skipping KV cache \u2014 file ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds 25MB KV limit.`);
        }
        await env2.DB.prepare(
          `INSERT INTO submittals (
            id, user_id, project_name, status, progress,
            original_filename, file_buffer_key, auto_retry_enabled,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          submittalId,
          userId,
          projectName,
          "processing",
          0,
          file.name,
          fileBufferKey,
          1,
          (/* @__PURE__ */ new Date()).toISOString()
        ).run();
        if (env2.UPLOADS) {
          const fileKey = `uploads/${userId}/${submittalId}/${file.name}`;
          await env2.UPLOADS.put(fileKey, fileBuffer);
          await env2.DB.prepare(
            "UPDATE submittals SET input_file_key = ? WHERE id = ?"
          ).bind(fileKey, submittalId).run();
        }
        try {
          await env2.DB.prepare(
            "UPDATE submittals SET progress = ? WHERE id = ?"
          ).bind(10, submittalId).run();
          const dispatch = await dispatchVisionExtraction(submittalId, fileBuffer, env2);
          if (dispatch.sync === false) {
            results.push({
              filename: file.name,
              submittalId,
              status: "queued",
              async: true,
              job_id: dispatch.job_id,
              poll_url: `/api/jobs/${dispatch.job_id}`,
              finalize_url: `/api/sessions/${submittalId}/finalize-from-job/${dispatch.job_id}`
            });
            continue;
          }
          const extractionResult = dispatch;
          await env2.DB.prepare(
            "UPDATE submittals SET progress = ? WHERE id = ?"
          ).bind(50, submittalId).run();
          await env2.DB.prepare(
            "UPDATE submittals SET extracted_data = ?, status = ?, progress = 100, updated_at = ? WHERE id = ?"
          ).bind(JSON.stringify(extractionResult), "review", (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
          for (const door of extractionResult.doors || []) {
            await env2.DB.prepare(
              `INSERT INTO door_entries (
                id, submittal_id, door_number, door_type, material_code,
                width_inches, height_inches, thickness_inches, fire_rating,
                hardware_group, frame_material, remarks, extraction_confidence, created_at,
                size, glazing, door_notes_refs, glazing_notes_refs
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              crypto.randomUUID(),
              submittalId,
              door.door_number,
              door.door_type,
              door.material_code,
              door.width_inches,
              door.height_inches,
              door.thickness_inches,
              door.fire_rating,
              door.hardware_group,
              door.frame_material,
              door.remarks,
              extractionResult.extraction_confidence,
              (/* @__PURE__ */ new Date()).toISOString(),
              door.size || null,
              door.glazing || null,
              door.door_notes_refs || null,
              door.glazing_notes_refs || null
            ).run();
          }
          const processingTimeMs = Date.now() - fileProcessingStartTime;
          await logTelemetryEvent(env2, {
            eventType: "upload",
            eventName: "pdf_upload_success",
            severity: "info",
            message: `PDF upload completed: ${file.name}`,
            context: {
              submittal_id: submittalId,
              filename: file.name,
              file_size_bytes: fileSizeBytes,
              door_count: extractionResult.doors.length,
              token_usage: extractionResult.token_usage,
              extraction_confidence: extractionResult.extraction_confidence,
              processing_time_ms: processingTimeMs
            },
            userId: user.userId,
            sessionId: submittalId
          });
          results.push({
            filename: file.name,
            submittalId,
            status: "review",
            doorCount: (extractionResult.doors || []).length,
            tokenUsage: extractionResult.token_usage,
            extractionConfidence: extractionResult.extraction_confidence
          });
        } catch (processingError) {
          console.error("Processing error for", file.name, ":", processingError);
          const submittal = await env2.DB.prepare(
            "SELECT retry_count, max_retry_attempts, auto_retry_enabled FROM submittals WHERE id = ?"
          ).bind(submittalId).first();
          const retryCount = (submittal?.retry_count || 0) + 1;
          const maxRetries = submittal?.max_retry_attempts || 3;
          const autoRetryEnabled = submittal?.auto_retry_enabled || 1;
          if (autoRetryEnabled && retryCount < maxRetries) {
            console.log(`Auto-retrying ${file.name} (attempt ${retryCount}/${maxRetries})`);
            await env2.DB.prepare(
              "UPDATE submittals SET retry_count = ?, status = ?, error_message = ?, updated_at = ? WHERE id = ?"
            ).bind(retryCount, "retrying", processingError.message, (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
            await new Promise((resolve2) => setTimeout(resolve2, 2e3));
            try {
              const retryDispatch = await dispatchVisionExtraction(submittalId, fileBuffer, env2);
              if (retryDispatch.sync === false) {
                results.push({
                  filename: file.name,
                  submittalId,
                  status: "queued",
                  async: true,
                  job_id: retryDispatch.job_id,
                  poll_url: `/api/jobs/${retryDispatch.job_id}`,
                  finalize_url: `/api/sessions/${submittalId}/finalize-from-job/${retryDispatch.job_id}`
                });
                continue;
              }
              const retryResult = retryDispatch;
              await env2.DB.prepare(
                "UPDATE submittals SET extracted_data = ?, status = ?, progress = 100, updated_at = ? WHERE id = ?"
              ).bind(JSON.stringify(retryResult), "review", (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
              for (const door of retryResult.doors || []) {
                await env2.DB.prepare(
                  `INSERT INTO door_entries (
                    id, submittal_id, door_number, door_type, material_code,
                    width_inches, height_inches, thickness_inches, fire_rating,
                    hardware_group, frame_material, remarks, extraction_confidence, created_at,
                    size, glazing, door_notes_refs, glazing_notes_refs
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                  crypto.randomUUID(),
                  submittalId,
                  door.door_number,
                  door.door_type,
                  door.material_code,
                  door.width_inches,
                  door.height_inches,
                  door.thickness_inches,
                  door.fire_rating,
                  door.hardware_group,
                  door.frame_material,
                  door.remarks,
                  retryResult.extraction_confidence,
                  (/* @__PURE__ */ new Date()).toISOString(),
                  door.size || null,
                  door.glazing || null,
                  door.door_notes_refs || null,
                  door.glazing_notes_refs || null
                ).run();
              }
              results.push({
                filename: file.name,
                submittalId,
                status: "review",
                doorCount: (retryResult.doors || []).length,
                retriedSuccessfully: true,
                retryAttempt: retryCount
              });
            } catch (retryError) {
              await env2.DB.prepare(
                "UPDATE submittals SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"
              ).bind("failed", retryError.message, (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
              await logTelemetryEvent(env2, {
                eventType: "upload",
                eventName: "pdf_upload_failed",
                severity: "error",
                message: `PDF upload failed after retry: ${file.name}`,
                context: {
                  submittal_id: submittalId,
                  filename: file.name,
                  error_message: retryError.message,
                  retry_attempt: retryCount,
                  processing_time_ms: Date.now() - fileProcessingStartTime
                },
                userId: user.userId,
                sessionId: submittalId
              });
              results.push({
                filename: file.name,
                submittalId,
                status: "failed",
                error: retryError.message,
                retryAttempt: retryCount,
                canRetry: retryCount < maxRetries
              });
            }
          } else {
            await env2.DB.prepare(
              "UPDATE submittals SET status = ?, error_message = ?, retry_count = ?, updated_at = ? WHERE id = ?"
            ).bind("failed", processingError.message, retryCount, (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
            await logTelemetryEvent(env2, {
              eventType: "upload",
              eventName: "pdf_upload_failed",
              severity: "error",
              message: `PDF upload failed: ${file.name}`,
              context: {
                submittal_id: submittalId,
                filename: file.name,
                error_message: processingError.message,
                retry_count: retryCount,
                max_retries_reached: retryCount >= maxRetries,
                processing_time_ms: Date.now() - fileProcessingStartTime
              },
              userId: user.userId,
              sessionId: submittalId
            });
            results.push({
              filename: file.name,
              submittalId,
              status: "failed",
              error: processingError.message,
              canRetry: retryCount < maxRetries
            });
          }
        }
      }
      return jsonResponse3({
        totalFiles: files.length,
        results
      }, 201);
    } catch (error5) {
      console.error("Upload handler error:", error5);
      return jsonResponse3({ error: "Upload failed: " + error5.message }, 500);
    }
  });
  router.get("/api/submittals", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      // Shared by SubX's own list view and PropX's submittal picker - either
      // product's access is enough to read your own submittals list.
      const subxErr = await requireProductAccess(user, env2, "subx");
      if (subxErr) {
        const propxErr = await requireProductAccess(user, env2, "propx");
        if (propxErr) return subxErr;
      }
    }
    try {
      const submittals = await env2.DB.prepare(
        `SELECT id, project_name, status, progress, created_at, updated_at,
                original_filename, error_message, retry_count, max_retry_attempts
         FROM submittals
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`
      ).bind(user.userId).all();
      return jsonResponse3({ submittals: submittals.results });
    } catch (error5) {
      return jsonResponse3({ error: "Failed to fetch submittals: " + error5.message }, 500);
    }
  });
  router.post("/api/submittals/:id/retry", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "subx");
      if (_prodErr) return _prodErr;
    }
    try {
      const url = new URL(request2.url);
      const pathParts = url.pathname.split("/");
      const submittalId = pathParts[3];
      if (!submittalId) {
        return jsonResponse3({ error: "Submittal ID required" }, 400);
      }
      const submittal = await env2.DB.prepare(
        "SELECT * FROM submittals WHERE id = ? AND user_id = ?"
      ).bind(submittalId, user.userId).first();
      if (!submittal) {
        return jsonResponse3({ error: "Submittal not found" }, 404);
      }
      if (submittal.status !== "failed") {
        return jsonResponse3({ error: "Can only retry failed submittals" }, 400);
      }
      const retryCount = (submittal.retry_count || 0) + 1;
      const maxRetries = submittal.max_retry_attempts || 3;
      if (retryCount > maxRetries) {
        return jsonResponse3({ error: `Max retry attempts (${maxRetries}) reached` }, 400);
      }
      let fileBuffer = await env2.CACHE.get(submittal.file_buffer_key, "arrayBuffer");
      if (!fileBuffer && env2.UPLOADS) {
        console.log(`[Retry] KV expired, trying R2: ${submittal.file_buffer_key}`);
        const r2Object = await env2.UPLOADS.get(submittal.file_buffer_key);
        if (r2Object) {
          fileBuffer = await r2Object.arrayBuffer();
          console.log(`[Retry] PDF retrieved from R2`);
        }
      }
      if (!fileBuffer) {
        return jsonResponse3({ error: "File not found in storage. Please re-upload the document." }, 404);
      }
      await env2.DB.prepare(
        "UPDATE submittals SET status = ?, retry_count = ?, progress = 0, updated_at = ? WHERE id = ?"
      ).bind("retrying", retryCount, (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
      try {
        const retryDispatch = await dispatchVisionExtraction(submittalId, fileBuffer, env2);
        if (retryDispatch.sync === false) {
          return jsonResponse3({
            ok: true,
            async: true,
            status: "queued",
            job_id: retryDispatch.job_id,
            poll_url: `/api/jobs/${retryDispatch.job_id}`,
            finalize_url: `/api/sessions/${submittalId}/finalize-from-job/${retryDispatch.job_id}`
          }, 202);
        }
        const extractionResult = retryDispatch;
        await env2.DB.prepare(
          "UPDATE submittals SET extracted_data = ?, status = ?, progress = 100, error_message = NULL, updated_at = ? WHERE id = ?"
        ).bind(JSON.stringify(extractionResult), "review", (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
        for (const door of extractionResult.doors || []) {
          await env2.DB.prepare(
            `INSERT INTO door_entries (
              id, submittal_id, door_number, door_type, material_code,
              width_inches, height_inches, thickness_inches, fire_rating,
              hardware_group, frame_material, remarks, extraction_confidence, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            crypto.randomUUID(),
            submittalId,
            door.door_number,
            door.door_type,
            door.material_code,
            door.width_inches,
            door.height_inches,
            door.thickness_inches,
            door.fire_rating,
            door.hardware_group,
            door.frame_material,
            door.remarks,
            extractionResult.extraction_confidence,
            (/* @__PURE__ */ new Date()).toISOString()
          ).run();
        }
        return jsonResponse3({
          submittalId,
          status: "review",
          doorCount: (extractionResult.doors || []).length,
          retryAttempt: retryCount,
          message: "Retry successful"
        });
      } catch (retryError) {
        await env2.DB.prepare(
          "UPDATE submittals SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"
        ).bind("failed", retryError.message, (/* @__PURE__ */ new Date()).toISOString(), submittalId).run();
        return jsonResponse3({
          submittalId,
          status: "failed",
          error: retryError.message,
          retryAttempt: retryCount,
          canRetry: retryCount < maxRetries
        }, 500);
      }
    } catch (error5) {
      console.error("Retry error:", error5);
      return jsonResponse3({ error: "Retry failed: " + error5.message }, 500);
    }
  });
  router.get("/api/submittals/:id", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      // Also read by PropX's proposal builder (needs the door schedule to
      // draft line items) - same either-product rule as the list endpoint.
      const subxErr = await requireProductAccess(user, env2, "subx");
      if (subxErr) {
        const propxErr = await requireProductAccess(user, env2, "propx");
        if (propxErr) return subxErr;
      }
    }
    try {
      const url = new URL(request2.url);
      const pathParts = url.pathname.split("/");
      const submittalId = pathParts[3];
      if (!submittalId) {
        return jsonResponse3({ error: "Submittal ID required" }, 400);
      }
      const submittal = await env2.DB.prepare(
        "SELECT * FROM submittals WHERE id = ? AND user_id = ?"
      ).bind(submittalId, user.userId).first();
      if (!submittal) {
        return jsonResponse3({ error: "Submittal not found" }, 404);
      }
      const doors = await env2.DB.prepare(
        "SELECT * FROM door_entries WHERE submittal_id = ? ORDER BY door_number"
      ).bind(submittalId).all();
      const parsedDoors = doors.results.map((door) => ({
        ...door,
        door_notes_refs: door.door_notes_refs ? JSON.parse(door.door_notes_refs) : [],
        glazing_notes_refs: door.glazing_notes_refs ? JSON.parse(door.glazing_notes_refs) : []
      }));
      return jsonResponse3({
        submittal: {
          ...submittal,
          extractedData: submittal.extracted_data ? JSON.parse(submittal.extracted_data) : null,
          doors: parsedDoors
        }
      });
    } catch (error5) {
      return jsonResponse3({ error: "Failed to fetch submittal: " + error5.message }, 500);
    }
  });
}
