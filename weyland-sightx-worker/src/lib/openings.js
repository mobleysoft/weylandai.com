// weyland-sightx-worker/src/lib/openings.js
//
// g074: the openings SightX's sheet view shows, one per schedule row, each with its tag on the plan sheets
// when one was found. Two sources, one shape:
//   openingsFromRecord(rec)          the WeylandAI Building's placement record (data/sheets/records.js)
//   openingsFromSession(doors, plan) a SubX upload: GET /api/hardware-schedule/session/:id/doors and
//                                    /plan (readPlan from weyland-shared, run by SubX on the customer's PDF)
// -> { sheets: [{ page, sheet, title, width?, height? }], openings: [...], summary: { total, placed, unplaced } }
// Tag coordinates are PDF points in the page's viewport (x from the left, y from the top), as readPlan gives them.
// openingsCsv(openings) is the openings list an estimator takes into the bid. Pure: nothing is stored.

const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, "");
// SubX keeps a mark printed on two schedule pages apart as "001 [p.286]"; the plan prints "001" (as readPlan).
const tagKey = (m) => norm(String(m || "").replace(/\s*\[p\.?\s*\d+\]\s*$/i, ""));
const num = (v) => (v == null || v === "" || !Number.isFinite(+v) ? null : +v);
const blank = (v) => (v == null || v === "" || v === "-" ? null : String(v));

export function ftin(inches) {
  if (inches == null) return null;
  const f = Math.floor(inches / 12), i = Math.round((inches - f * 12) * 100) / 100;
  return f + "'-" + i + '"';
}
export function sizeText(w, h) { return w != null && h != null ? ftin(w) + " x " + ftin(h) : null; }

function tagOf(t) {
  return t ? { sheet: t.sheet, page: t.page, x: Math.round(t.x * 100) / 100, y: Math.round(t.y * 100) / 100, h: t.h != null ? Math.round(t.h * 100) / 100 : null,
    plan_room: blank(t.room), plan_room_name: blank(t.room_name), room_by: t.room_by || null, unsure: !!t.unsure, also_on: t.also_on || [] } : null;
}

/** The Building's placement record: each tag carries the schedule row it matched; unplaced marks have none. */
export function openingsFromRecord(rec) {
  const openings = rec.tags.map((t) => {
    const r = (t.schedule_rows || [])[0] || {};
    return {
      mark: t.mark, room: blank(t.location) || blank(t.room_name), size: blank(t.size) || sizeText(num(t.width_inches), num(t.height_inches)),
      width_inches: num(t.width_inches), height_inches: num(t.height_inches), pair: !!t.pair, hardware_group: blank(t.hardware_group), fire_rating: blank(t.fire_rating),
      door_type: blank(t.door_type), frame_type: blank(t.frame_type), material: blank(t.material),
      schedule: { page: r.page ?? (t.door_pages || [])[0] ?? null, row: null }, note: t.note || null, tag: tagOf(t),
    };
  });
  for (const u of rec.summary.unplaced || []) openings.push({ mark: u.mark, room: null, size: null, width_inches: null, height_inches: null, pair: false, hardware_group: null, fire_rating: null, door_type: null, frame_type: null, material: null, schedule: { page: u.page ?? null, row: null }, note: u.reason || null, tag: null });
  return {
    sheets: rec.sheets.map((s) => ({ page: s.page, sheet: s.sheet, title: s.title, width: s.width, height: s.height })),
    openings, summary: { total: rec.summary.marks_total, placed: rec.summary.marks_placed, unplaced: openings.filter((o) => !o.tag).map((o) => o.mark) },
  };
}

function roomFromNotes(notes) { const m = String(notes || "").match(/Room:\s*([^;]+)/i); return m ? m[1].trim() || null : null; }

/** A SubX upload: one opening per door row, in schedule order. Rows sharing a mark take that mark's tags in
 *  order (readPlan places one tag per row where the plan prints one per opening); a row left over is unplaced. */
export function openingsFromSession(doors, plan) {
  const rows = (Array.isArray(doors) ? doors : []).filter((d) => d && d.mark);
  const tags = plan && Array.isArray(plan.tags) ? plan.tags : [];
  const byKey = new Map();
  for (const t of tags) { const k = tagKey(t.mark); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(t); }
  const taken = new Map();
  const openings = rows.map((d) => {
    const k = tagKey(d.mark), list = byKey.get(k) || [], n = taken.get(k) || 0;
    const t = list[n] || null; if (t) taken.set(k, n + 1);
    const src = d.source || {};
    const w = num(d.width_inches), h = num(d.height_inches);
    return {
      mark: String(d.mark), room: roomFromNotes(d.notes), size: sizeText(w, h) || blank(d.width), width_inches: w, height_inches: h, pair: d.pair === true || d.pair === 1,
      hardware_group: blank(d.hardware_group), fire_rating: blank(d.fire_rating), door_type: blank(d.door_type), frame_type: blank(d.frame_type), material: blank(d.door_material),
      schedule: { page: src.page ?? d.page_number ?? null, row: src.table_row ?? null }, note: null, tag: tagOf(t),
    };
  });
  const sheets = (plan && Array.isArray(plan.plan_sheets) ? plan.plan_sheets : []).map((s) => ({ page: s.page, sheet: s.sheet, title: s.title || null }));
  return { sheets, openings, summary: { total: openings.length, placed: openings.filter((o) => o.tag).length, unplaced: openings.filter((o) => !o.tag).map((o) => o.mark) } };
}

const CSV_COLUMNS = [
  ["mark", (o) => o.mark], ["room", (o) => o.room], ["size", (o) => o.size], ["width_in", (o) => o.width_inches], ["height_in", (o) => o.height_inches],
  ["pair", (o) => (o.pair ? "yes" : "no")], ["hardware_group", (o) => o.hardware_group], ["fire_rating", (o) => o.fire_rating], ["door_type", (o) => o.door_type],
  ["frame_type", (o) => o.frame_type], ["schedule_page", (o) => o.schedule.page], ["schedule_row", (o) => o.schedule.row],
  ["plan_sheet", (o) => (o.tag ? o.tag.sheet : null)], ["plan_page", (o) => (o.tag ? o.tag.page : null)], ["tag_x_pt", (o) => (o.tag ? o.tag.x : null)], ["tag_y_pt", (o) => (o.tag ? o.tag.y : null)],
  ["placed", (o) => (o.tag ? "yes" : "no")],
];
const cell = (v) => { v = v == null ? "" : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export function openingsCsv(openings) {
  return [CSV_COLUMNS.map((c) => c[0]).join(","), ...openings.map((o) => CSV_COLUMNS.map((c) => cell(c[1](o))).join(","))].join("\r\n") + "\r\n";
}
