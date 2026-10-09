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
export function doorListCsv(doors) {
  const rows = [["Mark", "Hardware group", "Size (as read)", "Width (in)", "Height (in)", "Thickness", "Fire rating", "Door type", "Door material", "Door finish", "Frame type", "Frame material", "Frame finish", "Head", "Jamb", "Sill", "DOOR PAIR", "GLAZING", "ALTERNATE PRICING", "Notes", "Source page", "Source row"]];
  for (const d of doors) rows.push([d.mark, d.hardware_group, d.width, d.width_inches, d.height_inches, d.thickness ?? d.thickness_inches, d.fire_rating, d.door_type, d.door_material, d.door_finish, d.frame_type, d.frame_material, d.frame_finish, d.head_detail, d.jamb_detail, d.sill_detail, yesNo(d.pair), d.glazing, d.alternate_pricing, d.notes, d.source?.page ?? d.page_number, d.source?.table_row]);
  return rows.map(r => r.map(csvCell).join(",")).join("\r\n");
}

export function guestDetail(file, project, pages, readings) {
  const doors = [], hardware_sets = [], components = [];
  for (const { page, extraction: ex } of readings) {
    for (const d of ex.doors || []) doors.push({
      ...d, id: "guest-" + page + "-" + doors.length, mark: d.door_number, width: d.size,
      door_material: d.material_code, notes: d.remarks, page_number: page,
      source: { page, table_row: d.source_row ?? null },
      unsure: [!d.hardware_group && "hardware_group", (d.width_inches == null || d.height_inches == null) && "size"].filter(Boolean),
    });
    for (const g of ex.hardware_groups || []) {
      let group = hardware_sets.find(s => s.set_number === g.group_number);
      if (!group) { group = { id: "guest-group-" + hardware_sets.length, set_number: g.group_number, set_name: g.group_name, affirmed: false, components: 0 }; hardware_sets.push(group); }
      group.components += (g.components || []).length;
      for (const c of g.components || []) components.push({ ...c, id: "guest-item-" + components.length, set_number: g.group_number, model: c.model_number || c.catalog_number });
    }
  }
  const count = field => {
    const counts = new Map();
    for (const d of doors) if (d[field]) counts.set(d[field], (counts.get(d[field]) || 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count }));
  };
  return {
    session: { id: "guest", project_name: project, filename: file.name, total_pages: pages, document_type: doors.length ? "door_schedule" : "hardware_schedule", guest: true },
    doors, hardware_sets, components, package: null, hardware_schedule_needed: hardwareScheduleNeed(doors, hardware_sets),
    takeoff: { doors: doors.length, doors_with_size: doors.filter(d => d.width_inches != null && d.height_inches != null).length,
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
