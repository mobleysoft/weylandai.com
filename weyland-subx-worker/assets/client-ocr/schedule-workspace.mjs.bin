// Shared by the first read in the browser and the saved-session packet check.
export function hardwareSpecSections(text) {
  const sections = new Set();
  // Both CSI spellings on real sheets: 08 7100 and 08 71 00 (also 087100).
  for (const m of String(text || "").matchAll(/\b(?:SEE\s+)?(?:SPECIFICATION|SPEC(?:IFICATION)?\s+SECTION|SECTION|SPEC\.?)[\s:]*([0-9]{2})[ .-]*([0-9]{2})[ .-]*([0-9]{2})\b[^\n]{0,100}/gi)) {
    if (/HARDWARE/i.test(m[0]) || m[1] + m[2] + m[3] === "087100") sections.add(`${m[1]} ${m[2]} ${m[3]}`);
  }
  return [...sections];
}

const groupKey = v => String(v || "").toUpperCase().replace(/\s+/g, " ").replace(/^0+(?=\d)/, "").trim();
export function hardwareScheduleNeed(doors, groups) {
  const sections = [...new Set(doors.flatMap(d => d.hardware_spec_sections || []))];
  if (!sections.length) return null;
  const available = groups.filter(g => Number(g.components) > 0).map(g => groupKey(g.set_number));
  const missing = [...new Set(doors.map(d => groupKey(d.hardware_group)).filter(Boolean))]
    .filter(g => !available.some(a => a === g || a.startsWith(g + " ")));
  if (!missing.length && available.length) return null;
  const name = sections.map(s => "Section " + s + " — Door Hardware").join("; ");
  return {
    sections, missing_groups: missing,
    message: "The door sheet points to " + name + ". Upload the bid set including that section's hardware group pages and the door sheet so they can be read together before building the packet." +
      (missing.length ? " Hardware groups still needed: " + missing.join(", ") + "." : ""),
  };
}

const yesNo = v => v === true ? "Yes" : v === false ? "No" : v ?? "";
const csvCell = v => /[",\r\n]/.test(String(v ?? "")) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? "");
export const REVIEW_THRESHOLD = 0.8;
export const isOcrRow = d => /ocr|grid/.test(d.read_from || "");
const fieldName = f => ({ width: "size", height: "size", location: "notes", door_material: "door_material", alternate: "alternate_pricing" }[f] || f);
function confidenceReview(d) {
  const fields = Object.entries(d.field_confidence || {});
  // Historical scans stamped every cell 0.85. Those measurements cannot be recovered.
  const legacy = isOcrRow(d) && !d.confidence_source && fields.length && fields.every(([, v]) => v === 0.85);
  const unknown = fields.filter(([, v]) => legacy || !Number.isFinite(v)).map(([f]) => f);
  const below = fields.filter(([f, v]) => !unknown.includes(f) && v < REVIEW_THRESHOLD).map(([f]) => f);
  return { fields, below, unknown, missing: isOcrRow(d) && !fields.length };
}
export function unsureDoorFields(d, filled = {}) {
  const review = confidenceReview(d);
  const out = new Set([...review.below, ...review.unknown].map(fieldName));
  if (review.missing) ["mark", "hardware_group", "fire_rating", "size"].forEach(f => out.add(f));
  if (!/\d/.test(d.mark || "")) out.add("mark");
  if (!d.hardware_group ? filled.hardware_group : !/^[A-Z0-9][A-Z0-9 .\-\/#]{0,15}$/i.test(d.hardware_group)) out.add("hardware_group");
  if (d.fire_rating && !/^(\d{1,3}\s*(MIN\.?|MINS?\.?|MINUTES?|HRS?\.?|HOURS?)?|NR|N\/R|NONE|N\/A|-+|YES|NO|[A-Z]{1,2}|\d{1,3}\/\d{1,3}|\d{1,3}\s*(MIN\.?)?\s*[A-Z]{1,2})$/i.test(d.fire_rating)) out.add("fire_rating");
  if (!d.door_type ? filled.door_type : !/^[A-Z0-9][A-Z0-9\-\/.]{0,5}$/i.test(d.door_type)) out.add("door_type");
  if (d.width_inches == null || d.height_inches == null) out.add("size");
  if (d.thickness && d.thickness_inches == null) out.add("thickness");
  return [...out];
}
export function reviewDoorRows(doors, opts = {}) {
  const summary = { review_threshold: REVIEW_THRESHOLD, ocr_rows: 0, ocr_fields: 0,
    below_threshold_rows: 0, below_threshold_fields: 0, confidence_unknown_rows: 0, confidence_unknown_fields: 0,
    duplicate_marks: [], missing_expected_marks: [], partial: !!opts.partial };
  const occurrences = new Map();
  const pageOf = d => d.source?.page ?? d.page_number ?? null;
  const markOf = d => d.original_mark || d.mark;
  const key = (page, mark) => String(page) + ":" + String(mark).trim().toUpperCase();
  for (const d of doors) {
    const r = confidenceReview(d);
    d.machine_read = isOcrRow(d);
    d.below_threshold_fields = r.below;
    d.confidence_unknown_fields = r.unknown;
    d.unsure = d.corrected ? [] : [...new Set([...(d.unsure || []), ...unsureDoorFields(d)])];
    d.review_issues = [];
    if (isOcrRow(d)) {
      summary.ocr_rows++; summary.ocr_fields += r.fields.length;
      summary.below_threshold_rows += +!!r.below.length; summary.below_threshold_fields += r.below.length;
      summary.confidence_unknown_rows += +!!(r.unknown.length || r.missing); summary.confidence_unknown_fields += r.unknown.length;
    }
    if (d.read_audit?.partial) summary.partial = true;
    const k = key(pageOf(d), markOf(d));
    if (!occurrences.has(k)) occurrences.set(k, []);
    occurrences.get(k).push(d);
  }
  for (const group of occurrences.values()) if (group.length > 1) {
    const issue = { page: pageOf(group[0]), mark: markOf(group[0]), count: group.length };
    summary.duplicate_marks.push(issue);
    for (const d of group) {
      d.unsure = [...new Set([...d.unsure, "mark"])];
      // g063: two rows with one mark are often two openings sharing one tag (T2507-01 A-103's
      // 132A, tagged twice on plan A-100), sometimes a misprint; the note says both.
      d.review_issues.push("Duplicate mark " + issue.mark + " on page " + issue.page + " (" + issue.count + " rows): " + (issue.count === 2 ? "two openings" : issue.count + " openings") + " sharing one tag, or a misprint; verify each occurrence.");
    }
  }
  const expected = opts.expectedMarks ?? doors.flatMap(d => (d.read_audit?.expected_marks || []).map(mark => typeof mark === "object" ? mark : ({ page: pageOf(d), mark })));
  summary.expected_marks_checked = expected.length > 0;
  const seenExpected = new Set();
  for (const item of expected) {
    const mark = typeof item === "object" ? item.mark : item;
    const page = typeof item === "object" ? item.page : null;
    const k = key(page, mark);
    if (seenExpected.has(k)) continue;
    seenExpected.add(k);
    if (!doors.some(d => (page == null || pageOf(d) === page) && String(markOf(d)).toUpperCase() === String(mark).toUpperCase())) summary.missing_expected_marks.push({ page, mark });
  }
  summary.unique_marks = occurrences.size;
  summary.qualifier = summary.ocr_rows ? "Machine-read OCR: " + summary.ocr_rows + " rows / " + summary.ocr_fields + " fields; " + summary.below_threshold_rows + " rows / " + summary.below_threshold_fields + " fields below the 80% review threshold." : "";
  if (summary.confidence_unknown_rows) summary.qualifier += " Confidence unavailable for " + summary.confidence_unknown_rows + " rows / " + summary.confidence_unknown_fields + " fields; check against the sheet.";
  if (summary.partial) summary.qualifier += " Partial read: the page is incomplete.";
  if (summary.duplicate_marks.length) summary.qualifier += " Duplicate marks: " + summary.duplicate_marks.map(d => d.mark + " (page " + d.page + ", " + d.count + " rows)").join(", ") + ". Row counts include these occurrences; they are not verified door totals.";
  if (summary.missing_expected_marks.length) summary.qualifier += " Missing expected marks: " + summary.missing_expected_marks.map(d => d.mark + (d.page == null ? "" : " (page " + d.page + ")")).join(", ") + ".";
  if (summary.ocr_rows && !summary.expected_marks_checked) summary.qualifier += " Expected marks were not supplied; completeness is unverified.";
  return summary;
}

export function doorListCsv(doors, review = reviewDoorRows(doors)) {
  const rows = [["Mark", "Hardware group", "Size (as read)", "Width (in)", "Height (in)", "Thickness", "Fire rating", "Door type", "Door material", "Door finish", "Frame type", "Frame material", "Frame finish", "Head", "Jamb", "Sill", "DOOR PAIR", "GLAZING", "ALTERNATE PRICING", "Notes", "Source page", "Source row"]];
  for (const d of doors) rows.push([d.mark, d.hardware_group, d.width, d.width_inches, d.height_inches, d.thickness ?? d.thickness_inches, d.fire_rating, d.door_type, d.door_material, d.door_finish, d.frame_type, d.frame_material, d.frame_finish, d.head_detail, d.jamb_detail, d.sill_detail, yesNo(d.pair), d.glazing, d.alternate_pricing, d.notes, d.source?.page ?? d.page_number, d.source?.table_row]);
  rows[0].push("Read method", "Field confidence", "Fields below 80%", "Fields without confidence", "Review issues", "OCR rows", "OCR fields", "Rows below 80%", "Fields below 80% total", "Read qualification");
  doors.forEach((d, i) => rows[i + 1].push(d.machine_read || isOcrRow(d) ? "Machine-read OCR" : d.read_from || "unknown",
    JSON.stringify(d.field_confidence || {}), (d.below_threshold_fields || []).join("; "), (d.confidence_unknown_fields || []).join("; "),
    (d.review_issues || []).join("; "), review.ocr_rows, review.ocr_fields, review.below_threshold_rows, review.below_threshold_fields, review.qualifier));
  return rows.map(r => r.map(csvCell).join(",")).join("\r\n");
}

export function guestDetail(file, project, pages, readings, opts = {}) {
  const doors = [], hardware_sets = [], components = [];
  for (const { page, extraction: ex } of readings) {
    for (const d of ex.doors || []) doors.push({
      ...d, id: "guest-" + page + "-" + doors.length, mark: d.door_number, width: d.size,
      door_material: d.material_code, notes: d.remarks, page_number: page,
      source: { page, table_row: d.source_row ?? null },
      read_audit: { partial: !!(ex.partial || ex.metadata?.partial), expected_marks: ex.metadata?.expected_marks || [] },
      unsure: [!d.hardware_group && "hardware_group", (d.width_inches == null || d.height_inches == null) && "size"].filter(Boolean),
    });
    for (const g of ex.hardware_groups || []) {
      let group = hardware_sets.find(s => s.set_number === g.group_number);
      if (!group) { group = { id: "guest-group-" + hardware_sets.length, set_number: g.group_number, set_name: g.group_name, affirmed: false, components: 0 }; hardware_sets.push(group); }
      group.components += (g.components || []).length;
      for (const c of g.components || []) components.push({ ...c, id: "guest-item-" + components.length, set_number: g.group_number, model: c.model_number || c.catalog_number });
    }
  }
  const review = reviewDoorRows(doors, { ...opts, partial: readings.some(r => r.extraction.partial || r.extraction.metadata?.partial) });
  const count = field => {
    const counts = new Map();
    for (const d of doors) if (d[field] && !(field === "width" && d.unsure.includes("size"))) counts.set(d[field], (counts.get(d[field]) || 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count }));
  };
  return {
    session: { id: "guest", project_name: project, filename: file.name, total_pages: pages, document_type: doors.length ? "door_schedule" : "hardware_schedule", guest: true },
    doors, hardware_sets, components, package: null, hardware_schedule_needed: hardwareScheduleNeed(doors, hardware_sets),
    takeoff: { ...review, doors: doors.length, doors_with_size: doors.filter(d => d.width_inches != null && d.height_inches != null && !d.unsure.includes("size")).length,
      by_door_type: count("door_type"), by_size: count("width"), by_fire_rating: count("fire_rating"), by_hardware_group: count("hardware_group"), by_frame_material: count("frame_material"),
      hardware_sets: hardware_sets.length, hardware_components: components.reduce((n, c) => n + (c.quantity ?? 1), 0) },
  };
}

// Only an explicit save-and-sign-in keeps the file across the shell replacing
// its iframe. Scoped to this browser tab, expires after 30 minutes, deleted on save.
export async function pendingSchedule(action, value) {
  const key = sessionStorage.getItem("subx-draft-key") || crypto.randomUUID();
  if (action === "put") sessionStorage.setItem("subx-draft-key", key);
  if (action !== "put" && !sessionStorage.getItem("subx-draft-key")) return null;
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("subx-pending-schedule", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
  try {
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite"), store = tx.objectStore("drafts");
      const r = action === "put" ? store.put({ ...value, at: Date.now() }, key) : action === "delete" ? store.delete(key) : store.get(key);
      tx.oncomplete = () => resolve(r.result); tx.onerror = () => reject(tx.error);
    });
    if (action === "delete") sessionStorage.removeItem("subx-draft-key");
    if (action === "get" && result && Date.now() - result.at > 30 * 60 * 1000) { await pendingSchedule("delete"); return null; }
    return result;
  } finally { db.close(); }
}
