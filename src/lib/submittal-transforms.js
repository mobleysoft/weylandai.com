// Real, first-party submittal/takeoff transforms - extracted from
// legacy-monolith.js (MONOLITH_HELPER_MAP.md section 4, item 5: "Third
// uncatalogued region"). Found during an earlier extraction pass, wired
// via registerExtractedModules()/module-registry.js into
// sessions-finalize-from-job.js - not vendored, not entangled with
// pdfjs-dist/pdf-lib, so no dependency on section 3's remaining steps.

import { generateId3 } from "./edge-telemetry.js";

// Bridges door_schedule_entries (from OCR extraction) into real
// hardware_sets rows, grouped by hardware_group. Blocks on duplicate
// door marks within a session rather than silently overwriting/merging -
// a real data-integrity guard, not an oversight.
export async function transformDoorEntriesToHardwareSets(sessionId, userId, env2) {
  console.log(`[Door→Takeoff Bridge] Starting transformation for session ${sessionId}`);
  const { results: entries } = await env2.DB.prepare(
    "SELECT mark, hardware_group, fire_rating, page_number FROM door_schedule_entries WHERE session_id = ?"
  ).bind(sessionId).all();
  if (!entries || entries.length === 0) {
    console.log("[Door→Takeoff Bridge] No door entries found, skipping");
    return { setsCreated: 0, totalMarks: 0, groups: {} };
  }
  console.log(`[Door→Takeoff Bridge] Found ${entries.length} door entries`);
  const dupes = {};
  for (const e of entries) {
    if (e.mark) {
      dupes[e.mark] = (dupes[e.mark] || 0) + 1;
    }
  }
  const dupMarks = Object.entries(dupes).filter(([_, c]) => c > 1);
  if (dupMarks.length > 0) {
    console.error("[Door→Takeoff Bridge] BLOCKED: duplicate MARKs found:", dupMarks.map(([m, c]) => m + "(" + c + ")").join(", "));
    return { setsCreated: 0, totalMarks: 0, groups: {}, blocked: true, reason: "duplicate_marks", duplicates: dupMarks };
  }
  const groups = {};
  for (const entry of entries) {
    const group3 = entry.hardware_group || "UNKNOWN";
    if (!groups[group3]) {
      groups[group3] = { marks: [], fireRating: entry.fire_rating, page: entry.page_number };
    }
    groups[group3].marks.push(entry.mark);
  }
  const groupNames = Object.keys(groups);
  console.log(`[Door→Takeoff Bridge] Grouped into ${groupNames.length} hardware groups: ${groupNames.join(", ")}`);
  const { results: existingSets } = await env2.DB.prepare(
    "SELECT set_number FROM hardware_sets WHERE session_id = ?"
  ).bind(sessionId).all();
  const existingSetNumbers = new Set((existingSets || []).map((s) => s.set_number));
  let setsCreated = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const bridgeExtractionId = "bridge_" + sessionId;
  const { results: existingBridge } = await env2.DB.prepare(
    "SELECT id FROM hardware_page_extractions WHERE id = ?"
  ).bind(bridgeExtractionId).all();
  if (!existingBridge || existingBridge.length === 0) {
    await env2.DB.prepare(`
      INSERT INTO hardware_page_extractions (
        id, session_id, page_number, extracted_data, status,
        input_tokens, output_tokens, extraction_time_ms,
        created_at, updated_at
      ) VALUES (?, ?, 1, ?, 'bridge_generated', 0, 0, 0, ?, ?)
    `).bind(
      bridgeExtractionId,
      sessionId,
      JSON.stringify({ bridge: true, source: "door_schedule_entries", groups: groupNames.length, marks: entries.length }),
      now,
      now
    ).run();
    console.log(`[Door→Takeoff Bridge] Created bridge-origin extraction record: ${bridgeExtractionId}`);
  }
  for (const [groupName, groupData] of Object.entries(groups)) {
    if (existingSetNumbers.has(groupName)) {
      await env2.DB.prepare(`
        UPDATE hardware_sets
        SET door_count = ?, updated_at = ?
        WHERE session_id = ? AND set_number = ?
      `).bind(groupData.marks.length, now, sessionId, groupName).run();
      console.log(`[Door→Takeoff Bridge] Updated existing set ${groupName}: ${groupData.marks.length} doors`);
      continue;
    }
    const setId = generateId3("set");
    await env2.DB.prepare(`
      INSERT INTO hardware_sets (
        id, session_id, user_id, submittal_id,
        set_number, set_name, door_count,
        approved_from_page, approved_at, approved_by,
        source_page_extraction_id,
        notes, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      setId,
      sessionId,
      userId,
      null,
      groupName,
      groupName,
      groupData.marks.length,
      groupData.page || 1,
      now,
      userId,
      bridgeExtractionId,
      // References the bridge-origin record — satisfies NOT NULL + FK
      "Marks: " + groupData.marks.join(", "),
      now,
      now
    ).run();
    setsCreated++;
    console.log(`[Door→Takeoff Bridge] Created set ${groupName}: ${groupData.marks.length} doors (marks: ${groupData.marks.join(", ")})`);
  }
  await env2.DB.prepare(`
    UPDATE hardware_extraction_sessions
    SET total_sets_extracted = (SELECT COUNT(*) FROM hardware_sets WHERE session_id = ?),
        updated_at = ?
    WHERE id = ?
  `).bind(sessionId, now, sessionId).run();
  console.log(`[Door→Takeoff Bridge] Complete: ${setsCreated} new sets, ${entries.length} total marks`);
  return {
    setsCreated,
    totalMarks: entries.length,
    groups: Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, { door_count: v.marks.length, marks: v.marks }])
    )
  };
}

// Same bridge concept as above, but for the flat takeoff_line_items table:
// groups door_schedule_entries by (size, type, material, rating) into
// door and frame line items. Re-runs are idempotent via the
// "[auto:dse]"-tagged delete at the top, not accumulation-on-replay.
export async function materializeDseToLineItems(sessionId, env2) {
  const dseResult = await env2.DB.prepare(`
    SELECT mark, hardware_group, width, height, door_type, door_material,
           frame_type, frame_material, fire_rating, panic, thickness
    FROM door_schedule_entries WHERE session_id = ?
  `).bind(sessionId).all();
  const entries = dseResult.results || [];
  if (entries.length === 0) {
    return { doorsCreated: 0, framesCreated: 0, totalMarks: 0 };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    "DELETE FROM takeoff_line_items WHERE session_id = ? AND notes LIKE '%[auto:dse]%'"
  ).bind(sessionId).run();
  const doorGroups = {};
  for (const e of entries) {
    const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
    const key = `${size}|${e.door_type || ""}|${e.door_material || ""}|${e.fire_rating || ""}`;
    if (!doorGroups[key]) {
      doorGroups[key] = { size, door_type: e.door_type, door_material: e.door_material, fire_rating: e.fire_rating, marks: [], count: 0 };
    }
    doorGroups[key].marks.push(e.mark);
    doorGroups[key].count++;
  }
  let doorsCreated = 0;
  let sortOrder = 1;
  for (const [, group3] of Object.entries(doorGroups)) {
    const parts = [group3.door_type, group3.door_material].filter(Boolean);
    await env2.DB.prepare(`
      INSERT INTO takeoff_line_items
      (id, session_id, category, sort_order, description, size, material, rating, quantity, uom, unit_price, notes, taxable, created_at, updated_at)
      VALUES (?, ?, 'door', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sessionId,
      sortOrder++,
      parts.length > 0 ? parts.join(" ") : "Door",
      group3.size,
      group3.door_material,
      group3.fire_rating,
      group3.count,
      `[auto:dse] Marks: ${group3.marks.join(", ")}`,
      now,
      now
    ).run();
    doorsCreated++;
  }
  const frameGroups = {};
  for (const e of entries) {
    if (!e.frame_type && !e.frame_material)
      continue;
    const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
    const key = `${size}|${e.frame_type || ""}|${e.frame_material || ""}|${e.fire_rating || ""}`;
    if (!frameGroups[key]) {
      frameGroups[key] = { size, frame_type: e.frame_type, frame_material: e.frame_material, fire_rating: e.fire_rating, marks: [], count: 0 };
    }
    frameGroups[key].marks.push(e.mark);
    frameGroups[key].count++;
  }
  let framesCreated = 0;
  sortOrder = 1;
  for (const [, group3] of Object.entries(frameGroups)) {
    const parts = [group3.frame_type, group3.frame_material].filter(Boolean);
    await env2.DB.prepare(`
      INSERT INTO takeoff_line_items
      (id, session_id, category, sort_order, description, size, material, rating, quantity, uom, unit_price, notes, taxable, created_at, updated_at)
      VALUES (?, ?, 'frame', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
    `).bind(
      crypto.randomUUID(),
      sessionId,
      sortOrder++,
      parts.length > 0 ? parts.join(" ") : "Frame",
      group3.size,
      group3.frame_material,
      group3.fire_rating,
      group3.count,
      `[auto:dse] Marks: ${group3.marks.join(", ")}`,
      now,
      now
    ).run();
    framesCreated++;
  }
  console.log(`[Auto-Materialize DSE] Session ${sessionId}: ${doorsCreated} door groups, ${framesCreated} frame groups from ${entries.length} marks`);
  return { doorsCreated, framesCreated, totalMarks: entries.length };
}

// Renders a submittal record into a print-ready HTML document (fed to
// the sovereign CDP client's Page.printToPDF via document-generators.js/
// quotes-generate.js, not called directly here).
export function generateSubmittalHTML(submittal) {
  const { header, summary, hardware_sets, certifications } = submittal;
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${header.title} - ${header.project_name}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 0.75in; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 1rem; margin-bottom: 1rem; }
    .header h1 { font-size: 16pt; margin: 0 0 0.5rem 0; }
    .header h2 { font-size: 14pt; font-weight: normal; margin: 0; }
    .summary { background: #f5f5f5; padding: 0.5rem 1rem; margin-bottom: 1rem; font-size: 10pt; }
    .hardware-set { page-break-inside: avoid; margin-bottom: 1.5rem; border: 1px solid #ccc; }
    .set-header { background: #1e3a5f; color: white; padding: 0.5rem 1rem; font-weight: bold; }
    .set-info { background: #e8f0f8; padding: 0.5rem 1rem; font-size: 10pt; }
    .components-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .components-table th { background: #f0f0f0; border: 1px solid #ccc; padding: 0.25rem 0.5rem; text-align: left; }
    .components-table td { border: 1px solid #ccc; padding: 0.25rem 0.5rem; }
    .certifications { margin-top: 2rem; page-break-inside: avoid; }
    .signature-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; margin-left: 1rem; }
    .footer { margin-top: 2rem; font-size: 9pt; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${header.title}</h1>
    <h2>${header.project_name}</h2>
    <div style="font-size: 10pt; color: #666;">Generated: ${new Date(header.generated_at).toLocaleDateString()}</div>
  </div>

  <div class="summary">
    <strong>Summary:</strong> ${summary.total_sets} Hardware Sets | ${summary.total_components} Components | ${summary.pages_extracted} Pages Processed
  </div>
`;
  for (const set of hardware_sets) {
    html += `
  <div class="hardware-set">
    <div class="set-header">${set.set_number} - ${set.description || "Hardware Set"}</div>
    <div class="set-info">
      <strong>Function:</strong> ${set.function_type || "N/A"} |
      <strong>Keying:</strong> ${set.keying_system || "N/A"}
      ${set.notes ? `<br><strong>Notes:</strong> ${set.notes}` : ""}
    </div>
    <table class="components-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Qty</th>
          <th>Mfr</th>
          <th>Model</th>
          <th>Description</th>
          <th>Finish</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const comp of set.components) {
      html += `
        <tr>
          <td>${comp.type || ""}</td>
          <td>${comp.quantity || ""}</td>
          <td>${comp.manufacturer || ""}</td>
          <td>${comp.model || "TBD"}</td>
          <td>${comp.description || ""}</td>
          <td>${comp.finish_code || ""} ${comp.finish_description || ""}</td>
        </tr>
`;
    }
    html += `
      </tbody>
    </table>
  </div>
`;
  }
  html += `
  <div class="certifications">
    <h3>Certifications</h3>
    <p><strong>${certifications.compliance_statement}</strong></p>
    <p style="margin-top: 1.5rem;">
      ${certifications.architect_approval.label}: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 100px;"></span>
    </p>
    <p>
      ${certifications.contractor_certification.label}: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 100px;"></span>
    </p>
  </div>

  <div class="footer">
    Generated by Weyland - Weyland by HelmCorp | Session: ${header.session_id}
  </div>
</body>
</html>
`;
  return html;
}
