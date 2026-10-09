// Legacy jobs span D1, KV and R2. Track failures; these writes are not atomic.
export function assertHardwareWrite(result) {
  if (!result || result.success === false || !Number.isFinite(result.meta?.changes) || result.meta.changes <= 0) {
    throw new Error("Hardware database write did not persist a row");
  }
  return result;
}

export async function persistHardwareExtractionJob(env, userId, file, metadata, extraction, store) {
  const jobId = crypto.randomUUID();
  const fileBufferKey = `hardware-schedules/${userId}/${jobId}`;
  const now = new Date().toISOString();
  let created = false;
  let storageStarted = false;
  try {
    assertHardwareWrite(await env.DB.prepare(`
      INSERT INTO hardware_extraction_jobs
      (id, user_id, submittal_id, project_name, filename, file_buffer_key,
       total_sets, sets_approved, sets_rejected, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'processing', ?, ?)
    `).bind(jobId, userId, metadata.submittalId, metadata.projectName, file.name,
      fileBufferKey, extraction.hardware_groups.length, now, now).run());
    created = true;
    await env.CACHE.put(fileBufferKey, file.buffer, { expirationTtl: 86400 * 7 });
    if (env.UPLOADS) await env.UPLOADS.put(fileBufferKey, file.buffer);
    storageStarted = true;
    const result = await store(extraction, env, userId, { pageNumber: extraction.page_number });
    const groups = result?.sets_inserted ?? result?.groups_inserted;
    const components = extraction.hardware_groups.reduce((n, group) => n + group.components.length, 0);
    if (groups !== extraction.hardware_groups.length || result?.components_inserted !== components) {
      throw new Error("Hardware storage returned incomplete group or component counts");
    }
    assertHardwareWrite(await env.DB.prepare(`
      UPDATE hardware_extraction_jobs SET status = 'pending_review', updated_at = ?
      WHERE id = ? AND user_id = ? AND status = 'processing'
    `).bind(new Date().toISOString(), jobId, userId).run());
    return { jobId, database: { sets_inserted: groups, components_inserted: components } };
  } catch (cause) {
    if (created) {
      try {
        assertHardwareWrite(await env.DB.prepare(`
          UPDATE hardware_extraction_jobs SET status = 'failed', updated_at = ?
          WHERE id = ? AND user_id = ? AND status = 'processing'
        `).bind(new Date().toISOString(), jobId, userId).run());
      } catch {
        console.warn("[Hardware Extract] Failed-job marker could not be persisted");
      }
    }
    const error = new Error(storageStarted
      ? "Hardware storage did not complete. Some data may be saved; review the failed job before retrying."
      : "The extraction job could not be saved. Please retry later.");
    error.name = "HardwareJobPersistenceError";
    error.code = storageStarted ? "HARDWARE_PERSISTENCE_INCOMPLETE" : "HARDWARE_JOB_SAVE_FAILED";
    error.status = 503;
    error.retryable = !storageStarted;
    error.partial = storageStarted;
    if (created) error.jobId = jobId;
    // Keep infrastructure details out of the response.
    console.error("[Hardware Extract] Persistence failed:", cause?.message);
    throw error;
  }
}
