// src/lib/region-conflicts.js
//
// Detects overlapping/duplicate/dangling schedule-region candidates on a
// hardware-extraction session (two drawn regions overlapping >35% with
// different types, near-duplicate regions >75% overlap superseding the
// older one, missing region geometry, and dangling cross-references to
// deleted candidates), persists the review_status/conflict_reason back
// onto schedule_region_candidates, and returns a summary.
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// lines 149337-149441). Real shared logic: called from across the whole
// hardware-schedule cluster (batch-extract, several of the candidates
// routes, and extract-affirmed) - not scoped to any single route group,
// so it's a lib/ module rather than living inside one route file, same
// reasoning as lib/pricing.js.
//
// __name(fn, "fnName") bundler bookkeeping calls stripped, same as every
// prior extraction this session - pure debug-name artifacts, not real
// behavior.

async function detectAndPersistRegionConflicts(sessionId, env2) {
  const { results } = await env2.DB.prepare(
    `SELECT id, page_number, schedule_type, bounding_box, bounding_box_percent, user_adjusted_bounding_box, cross_ref, status, created_at
       FROM schedule_region_candidates
      WHERE session_id = ? AND status NOT IN ('rejected','extracted','failed')`
  ).bind(sessionId).all();
  const list = results || [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const conflicts = {};
  const superseded = {};
  const boxOf = (c) => {
    try {
      const b = JSON.parse(c.user_adjusted_bounding_box || c.bounding_box_percent || c.bounding_box || "{}");
      if (typeof b.x_percent === "number")
        return { x: b.x_percent, y: b.y_percent, w: b.width_percent, h: b.height_percent, space: "pct" };
      if (typeof b.x === "number")
        return { x: b.x, y: b.y, w: b.width, h: b.height, space: "px" };
    } catch (e) {
    }
    return null;
  };
  const overlapFrac = (a, b) => {
    if (!a || !b)
      return 0;
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const inter = ix * iy;
    const minArea = Math.max(1e-9, Math.min(Math.abs(a.w * a.h), Math.abs(b.w * b.h)));
    return inter / minArea;
  };
  const byPage = {};
  for (const c of list)
    (byPage[c.page_number] = byPage[c.page_number] || []).push(c);
  for (const page of Object.keys(byPage)) {
    const pc = byPage[page];
    for (let i = 0; i < pc.length; i++) {
      for (let j = i + 1; j < pc.length; j++) {
        const a = pc[i], b = pc[j];
        const ba = boxOf(a), bb = boxOf(b);
        if (!ba || !bb || ba.space !== bb.space)
          continue;
        const ov = overlapFrac(ba, bb);
        if (ov > 0.35) {
          if (a.schedule_type !== b.schedule_type) {
            const reason = `Overlapping regions on page ${page} with different types (${a.schedule_type} vs ${b.schedule_type})`;
            conflicts[a.id] = conflicts[a.id] || reason;
            conflicts[b.id] = conflicts[b.id] || reason;
          } else {
            const areaA = Math.abs(ba.w * ba.h), areaB = Math.abs(bb.w * bb.h);
            const areaRatio = Math.min(areaA, areaB) / Math.max(1e-9, Math.max(areaA, areaB));
            if (ov > 0.75 && areaRatio > 0.6) {
              const older = String(a.created_at || "") <= String(b.created_at || "") ? a : b;
              if (!conflicts[older.id])
                superseded[older.id] = superseded[older.id] || `Superseded by a near-duplicate ${older.schedule_type} region (~${Math.round(ov * 100)}% overlap)`;
            }
          }
        }
      }
    }
  }
  for (const c of list) {
    if (!boxOf(c) && !conflicts[c.id])
      superseded[c.id] = superseded[c.id] || "Region geometry missing (draw did not persist) — redraw to include it";
  }
  for (const c of list) {
    if (!c.cross_ref)
      continue;
    let refs = [];
    try {
      const p = JSON.parse(c.cross_ref);
      refs = Array.isArray(p) ? p : p ? [p] : [];
    } catch (e) {
      continue;
    }
    for (const r of refs) {
      const targetId = typeof r === "string" ? r : r && (r.candidate_id || r.target || r.id);
      if (targetId && !byId.has(targetId)) {
        conflicts[c.id] = conflicts[c.id] || `Cross-reference points to a missing/removed region (${targetId})`;
      }
    }
  }
  const stmts = list.map((c) => {
    if (superseded[c.id] && !conflicts[c.id]) {
      return env2.DB.prepare(
        `UPDATE schedule_region_candidates SET status = 'rejected', rejection_reason = ?, review_status = 'ok', conflict_reason = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(superseded[c.id], c.id);
    }
    const reason = conflicts[c.id] || null;
    return env2.DB.prepare(
      `UPDATE schedule_region_candidates SET review_status = ?, conflict_reason = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(reason ? "conflict" : "ok", reason, c.id);
  });
  if (stmts.length)
    await env2.DB.batch(stmts);
  return {
    total: list.length,
    conflict_count: Object.keys(conflicts).length,
    superseded_count: Object.keys(superseded).length,
    conflicts: Object.entries(conflicts).map(([id, reason]) => ({
      candidate_id: id,
      page: byId.get(id)?.page_number,
      reason
    }))
  };
}

export { detectAndPersistRegionConflicts };
