// src/lib/job-lease.js
//
// "Run at most once per cadence" lease in D1, shared by every worker that
// has a background job. Cron Triggers on this account are registered but
// have never fired (2026-10-05, see cron_ticks / Workers analytics), so a
// request that finds a job's lease expired kicks the job via ctx.waitUntil.
// Two isolates racing for the same lease: INSERT OR IGNORE then a
// conditional UPDATE, so exactly one of them sees meta.changes === 1.

export async function claimJobLease(db, job, cadenceSeconds, worker = null) {
  await db.prepare("CREATE TABLE IF NOT EXISTS job_runs (job TEXT PRIMARY KEY, ran_at TEXT NOT NULL, worker TEXT, runs INTEGER DEFAULT 0)").run();
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - cadenceSeconds * 1000).toISOString();
  const ins = await db.prepare("INSERT OR IGNORE INTO job_runs (job, ran_at, worker, runs) VALUES (?, ?, ?, 1)").bind(job, now, worker).run();
  if (ins.meta && ins.meta.changes) return true;
  const upd = await db.prepare("UPDATE job_runs SET ran_at = ?, worker = ?, runs = runs + 1 WHERE job = ? AND ran_at < ?").bind(now, worker, job, cutoff).run();
  return !!(upd.meta && upd.meta.changes);
}

/**
 * Call from fetch(): at most one D1 lease probe per minute per isolate; when
 * the lease is won, run the job in the background. Never throws.
 */
const probeAt = new Map();
export function trafficDrivenJob(env, ctx, { db, job, cadenceSeconds, worker, run }) {
  try {
    if (!db || !ctx || typeof ctx.waitUntil !== "function") return;
    const now = Date.now();
    if (now < (probeAt.get(job) || 0)) return;
    probeAt.set(job, now + 60000);
    ctx.waitUntil(
      claimJobLease(db, job, cadenceSeconds, worker)
        .then((won) => (won ? run() : null))
        .catch((e) => console.error("[job-lease] " + job + ": " + e.message))
    );
  } catch (e) {
    console.error("[job-lease] " + job + ": " + e.message);
  }
}
