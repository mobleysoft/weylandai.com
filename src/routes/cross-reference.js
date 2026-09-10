// src/routes/cross-reference.js
//
// POST /api/projects/:projectId/cross-reference - re-runs door-mark to
// hardware-set matching for a project (exact/pattern-tier matching
// against a configurable normalization contract), clearing stale
// matches and writing new ones in one D1 batch.
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// 156176-156334 for the helper chain + 161585-161603 for the route
// itself). WORKER_MODULARIZATION_MAP.md's own route-table entry
// undersold this one's real size (listed as a single small route) -
// resolveMatchContract()/normalizeGroupToken()/crossReferenceProjectMarks()
// are a real ~160-line self-contained chain, confirmed via grep to have
// zero call sites outside this one route (not assumed from the map).

import { jsonResponse3 } from "../lib/json-response.js";

function resolveMatchContract(env2) {
  const std = {
    pair: "door_schedule|hardware_schedule",
    // Longest-first: 'HARDWARE GROUP' must strip before 'HW', 'HW SET' before 'HW'.
    strip_prefixes: ["HARDWARE GROUP", "HARDWARE SET", "HW GROUP", "HDW SET", "HW SET", "GROUP", "HDW", "SET", "HW", "NO.", "#"],
    strip_non_alnum: true,
    strip_leading_zeros: true,
    // pure-numeric tokens only: '04' == '4' (GCC marks vs Kaiser sets, Phase 0 evidence)
    pattern_tier: true,
    // single-candidate containment only — two candidates is a human's call
    exact_score: 1,
    pattern_score: 0.8,
  };
  if (env2.WEYLAND_MATCH_CONTRACT) {
    try {
      return { ...std, ...JSON.parse(env2.WEYLAND_MATCH_CONTRACT) };
    } catch (e) {
      console.warn("[XRef] WEYLAND_MATCH_CONTRACT unparseable — fleet standard holds:", e.message);
    }
  }
  return std;
}

function normalizeGroupToken(raw, contract) {
  if (raw == null) return null;
  let s = String(raw).trim().toUpperCase();
  if (!s) return null;
  for (const p of contract.strip_prefixes) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  if (contract.strip_non_alnum) s = s.replace(/[^A-Z0-9]/g, "");
  if (contract.strip_leading_zeros && /^[0-9]+$/.test(s)) s = String(parseInt(s, 10));
  return s || null;
}

async function crossReferenceProjectMarks(projectId, env2) {
  const contract = resolveMatchContract(env2);
  const sess = await env2.DB.prepare(
    "SELECT id, document_type FROM hardware_extraction_sessions WHERE project_id = ?"
  ).bind(projectId).all();
  const doorIds = (sess.results || []).filter((s) => s.document_type === "door_schedule").map((s) => s.id);
  const hwIds = (sess.results || []).filter((s) => s.document_type === "hardware_schedule").map((s) => s.id);
  const report2 = {
    project_id: projectId,
    contract_pair: contract.pair,
    door_sessions: doorIds.length,
    hardware_sessions: hwIds.length,
    candidate_sets: 0,
    total_marks: 0,
    matched_exact: 0,
    matched_pattern: 0,
    unmatched_no_group: 0,
    unmatched_no_candidate: 0,
    unmatched_ambiguous: 0,
    skipped_user_resolved: 0,
    cleared_stale: 0,
  };
  if (doorIds.length === 0) return report2;
  let setRows = [];
  if (hwIds.length > 0) {
    const ph = hwIds.map(() => "?").join(",");
    const r = await env2.DB.prepare(
      `SELECT id, set_number FROM hardware_sets WHERE session_id IN (${ph})`
    ).bind(...hwIds).all();
    setRows = r.results || [];
  }
  report2.candidate_sets = setRows.length;
  const byNorm = new Map();
  for (const s of setRows) {
    const n = normalizeGroupToken(s.set_number, contract);
    if (!n) continue;
    if (!byNorm.has(n)) byNorm.set(n, []);
    byNorm.get(n).push(s);
  }
  const phD = doorIds.map(() => "?").join(",");
  const marksRes = await env2.DB.prepare(
    `SELECT id, hardware_group, hardware_set_id, hardware_group_match_method, validated_by
     FROM door_schedule_entries WHERE session_id IN (${phD})`
  ).bind(...doorIds).all();
  const marks = marksRes.results || [];
  report2.total_marks = marks.length;
  const now = new Date().toISOString();
  const writes = [];
  const clearStale = (m) => {
    if (m.hardware_set_id != null) {
      report2.cleared_stale++;
      writes.push(env2.DB.prepare(
        `UPDATE door_schedule_entries SET hardware_set_id = NULL, hardware_group_match_score = NULL,
          hardware_group_match_method = NULL, updated_at = ? WHERE id = ?`
      ).bind(now, m.id));
    }
  };
  for (const m of marks) {
    if (m.hardware_group_match_method === "user_override" || m.validated_by) {
      report2.skipped_user_resolved++;
      continue;
    }
    const n = normalizeGroupToken(m.hardware_group, contract);
    if (!n) {
      report2.unmatched_no_group++;
      clearStale(m);
      continue;
    }
    let hit = null, method = null, score = null;
    const exact = byNorm.get(n) || [];
    if (exact.length === 1) {
      hit = exact[0];
      method = "exact_match";
      score = contract.exact_score;
    } else if (exact.length > 1) {
      report2.unmatched_ambiguous++;
      clearStale(m);
      continue;
    } else if (contract.pattern_tier) {
      const cands = [];
      for (const [k, arr] of byNorm) {
        if (k.includes(n) || n.includes(k)) cands.push(...arr);
      }
      if (cands.length === 1) {
        hit = cands[0];
        method = "pattern_match";
        score = contract.pattern_score;
      } else if (cands.length > 1) {
        report2.unmatched_ambiguous++;
        clearStale(m);
        continue;
      }
    }
    if (!hit) {
      report2.unmatched_no_candidate++;
      clearStale(m);
      continue;
    }
    if (method === "exact_match") report2.matched_exact++;
    else report2.matched_pattern++;
    writes.push(env2.DB.prepare(
      `UPDATE door_schedule_entries SET hardware_set_id = ?, hardware_group_match_score = ?,
        hardware_group_match_method = ?, updated_at = ? WHERE id = ?`
    ).bind(hit.id, score, method, now, m.id));
  }
  if (writes.length > 0) await env2.DB.batch(writes);
  console.log(`[XRef] project ${projectId}: ${report2.matched_exact} exact + ${report2.matched_pattern} pattern of ${report2.total_marks} marks (${report2.candidate_sets} candidate sets, ${report2.skipped_user_resolved} human-held, ${report2.cleared_stale} stale cleared)`);
  return report2;
}

export function registerCrossReferenceRoutes(router, { authenticate }) {
  router.post("/api/projects/:projectId/cross-reference", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    try {
      const projectId = request2.params.projectId;
      const tenantId = user.tenantId || user.tenant_id;
      const project = await env2.DB.prepare(
        "SELECT id, name FROM projects WHERE id = ? AND tenant_id = ?"
      ).bind(projectId, tenantId).first();
      if (!project) return jsonResponse3({ error: "Project not found" }, 404);
      const report2 = await crossReferenceProjectMarks(projectId, env2);
      return jsonResponse3({ success: true, project_name: project.name, ...report2 });
    } catch (err) {
      console.error("[XRef] Error:", err);
      return jsonResponse3({ error: "Cross-reference failed: " + err.message }, 500);
    }
  });
}
