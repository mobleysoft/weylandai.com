// weyland-propx-worker/src/lib/proposal-sources.js
//
// What PropX can price, from data the caller really has (2026-10-07).
//
// The builder used to read only the legacy `submittals` table, which no
// current page writes (POST /api/submittals/upload has no caller), so every
// account saw "You have no submittals yet. Create one in SubX first" and
// SubX could not create one. What SubX really creates is a hardware
// extraction session (hardware_extraction_sessions + door_schedule_entries
// + hardware_sets + hardware_components); the homepage also gives every
// signed-in visitor their own copy of "The WeylandAI Building" demo
// schedule as one of those sessions. PropX now prices any of:
//
//   session   a hardware extraction session the caller owns (user_id)
//   submittal a legacy submittal the caller owns (door_entries)
//   demo      The WeylandAI Building - SubX's demo door schedule (the seed
//             session every homepage visitor's copy is cloned from); open
//             to anyone with PropX access, read-only, so a visitor with no
//             schedule of their own can still build a real proposal now
//
// Prices are never invented: a line's unit price comes from the schedule's
// own data (hardware_sets.unit_price_override, or the sum of its
// hardware_components priced by unit_price / list_price) or starts at 0 for
// the estimator to fill in.
//
// Pure functions (deriveLines, groupBy helpers) are exported for tests; the
// loaders take a D1 binding.

export const DEMO_SOURCE_ID = "weyland-building";
export const DEMO_SEED_SESSION_ID = "cc961a0b-471b-4229-9e0e-deb503e50d3a";
export const DEMO_SEED_PROJECT_ID = "eabd5ff6-e19f-4e6b-acfc-9a250445dfa8";
export const DEMO_LABEL = "The WeylandAI Building";

const clean = (v) => {
  const s = v == null ? "" : String(v).replace(/\s+/g, " ").trim();
  return s || null;
};

const ftin = (i) => Math.floor(i / 12) + "'-" + Math.round(i % 12) + '"';
function sizeOf(d) {
  // SubX's measured inches first: its text can drop a quote mark (3'-6" x 7'-10),
  // which would split identical doors into two lines.
  const wi = Number(d.width_inches), hi = Number(d.height_inches);
  if (wi > 0 && hi > 0) return ftin(wi) + " x " + ftin(hi);
  if (d.size) return clean(d.size);
  const w = clean(d.width), h = clean(d.height);
  if (w && h) return w + " x " + h;
  return w || h || null;
}

function marksText(marks) {
  const list = marks.filter(Boolean);
  if (!list.length) return null;
  const shown = list.slice(0, 12).join(", ");
  return "Openings " + shown + (list.length > 12 ? " and " + (list.length - 12) + " more" : "");
}

function compPrice(c) {
  const p = c.unit_price != null ? Number(c.unit_price) : c.list_price != null ? Number(c.list_price) : null;
  return Number.isFinite(p) ? p : null;
}

/**
 * doors: [{ mark, door_type, material, frame_material, fire_rating, size|width|height, hardware_group, location }]
 * sets:  [{ id, set_number, set_name, door_count, unit_price_override, components: [{ component_type, manufacturer, model, quantity, unit_price, list_price }] }]
 * -> line items in the shape normalizeLineItems() takes:
 *    { description, material, size, fireRating, quantity, unitPrice, notes, kind, priceSource }
 */
// "02", "2", "HW-2" and "Set 2" are one hardware set (the door schedule and
// the hardware schedule rarely write it the same way).
const setKey = (v) => String(v ?? "").trim().toUpperCase().replace(/^(HW|SET|GROUP)[-\s#]*/i, "").replace(/^0+(?=\w)/, "");

export function deriveLines(doors, sets) {
  doors = Array.isArray(doors) ? doors : [];
  sets = Array.isArray(sets) ? sets : [];
  const lines = [];

  // One line per door type + material + fire rating, quantity = openings.
  const doorGroups = new Map();
  for (const d of doors) {
    const type = clean(d.door_type) || "type not scheduled";
    const material = clean(d.material);
    const fire = clean(d.fire_rating);
    const key = [type, material || "", fire || ""].join("|").toLowerCase();
    if (!doorGroups.has(key)) doorGroups.set(key, { type, material, fire, sizes: new Map(), marks: [] });
    const g = doorGroups.get(key);
    g.marks.push(clean(d.mark));
    const sz = sizeOf(d);
    if (sz) g.sizes.set(sz, (g.sizes.get(sz) || 0) + 1);
  }
  for (const g of doorGroups.values()) {
    const sizes = Array.from(g.sizes.keys());
    lines.push({
      kind: "door",
      description: "Door - " + (/^[A-Z0-9]{1,3}$/i.test(g.type) ? "type " + g.type : g.type),
      material: g.material,
      size: sizes.length === 1 ? sizes[0] : sizes.length > 1 ? "Varies" : null,
      fireRating: g.fire,
      quantity: g.marks.length,
      unitPrice: 0,
      priceSource: "enter",
      notes: marksText(g.marks)
    });
  }

  // One line per distinct frame material, when the schedule has frames.
  const frameGroups = new Map();
  for (const d of doors) {
    const fm = clean(d.frame_material);
    if (!fm) continue;
    const key = fm.toLowerCase();
    if (!frameGroups.has(key)) frameGroups.set(key, { fm, marks: [] });
    frameGroups.get(key).marks.push(clean(d.mark));
  }
  for (const g of frameGroups.values()) {
    lines.push({ kind: "frame", description: "Frame - " + g.fm, material: g.fm, size: null, fireRating: null, quantity: g.marks.length, unitPrice: 0, priceSource: "enter", notes: marksText(g.marks) });
  }

  // One line per hardware set: quantity = openings that use it (or the set's
  // own door_count when the schedule has sets but no door rows).
  const setByNumber = new Map();
  for (const s of sets) {
    const n = clean(s.set_number);
    if (n && !setByNumber.has(setKey(n))) setByNumber.set(setKey(n), s);
  }
  const hwGroups = new Map();
  for (const d of doors) {
    const hg = clean(d.hardware_group);
    if (!hg) continue;
    const key = setKey(hg);
    if (!hwGroups.has(key)) hwGroups.set(key, { number: hg, marks: [] });
    hwGroups.get(key).marks.push(clean(d.mark));
  }
  for (const s of sets) {
    const n = clean(s.set_number);
    if (n && !hwGroups.has(setKey(n))) hwGroups.set(setKey(n), { number: n, marks: [], doorCount: Number(s.door_count) || 1 });
  }
  for (const [key, g] of hwGroups) {
    const set = setByNumber.get(key) || null;
    const comps = (set && Array.isArray(set.components)) ? set.components : [];
    let unitPrice = 0, priceSource = "enter", priced = 0;
    const unpriced = [];
    if (set && set.unit_price_override != null && Number.isFinite(Number(set.unit_price_override))) {
      unitPrice = Number(set.unit_price_override);
      priceSource = "set price on the schedule";
    } else if (comps.length) {
      let sum = 0;
      for (const c of comps) {
        const p = compPrice(c);
        if (p == null) { unpriced.push(c); continue; }
        priced++;
        sum += p * (Number(c.quantity) || 1);
      }
      if (priced) {
        unitPrice = Math.round(sum * 100) / 100;
        priceSource = priced === comps.length ? "component prices on the schedule" : priced + " of " + comps.length + " components priced on the schedule";
      }
    }
    const compText = comps.length
      ? comps.slice(0, 6).map((c) => [Number(c.quantity) > 1 ? Number(c.quantity) + "x" : null, clean(c.component_type), clean(c.manufacturer), clean(c.model)].filter(Boolean).join(" ")).join("; ") + (comps.length > 6 ? "; +" + (comps.length - 6) + " more" : "")
      : null;
    const qty = g.marks.length || g.doorCount || 1;
    // A set priced from only some of its items says so in the line itself (product audit
    // 2026-10-09: Berryessa set 2 printed $455.80 an opening from 2 of its 9 items, its $3,564
    // exit device not among them, with nothing on the PDF to say the total was short).
    const partial = priced > 0 && unpriced.length
      ? " (" + priced + " of " + comps.length + " items priced; not in this price: " + unpriced.slice(0, 4).map((c) => [clean(c.manufacturer), clean(c.model) || clean(c.component_type)].filter(Boolean).join(" ")).join(", ") + (unpriced.length > 4 ? ", +" + (unpriced.length - 4) + " more" : "") + ")"
      : "";
    lines.push({
      kind: "hardware",
      description: "Hardware set " + g.number + (set && clean(set.set_name) ? " - " + clean(set.set_name) : "") + partial,
      material: null,
      size: null,
      fireRating: null,
      quantity: qty,
      unitPrice,
      priceSource,
      notes: [marksText(g.marks), compText].filter(Boolean).join(" | ") || null
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Loaders (D1)
// ---------------------------------------------------------------------------

async function all(db, sql, ...args) {
  const r = await db.prepare(sql).bind(...args).all();
  return r.results || [];
}

async function setsWithComponents(db, sessionId) {
  const sets = await all(db, "SELECT id, set_number, set_name, door_count, unit_price_override FROM hardware_sets WHERE session_id = ? ORDER BY set_number", sessionId);
  if (!sets.length) return sets;
  const comps = await all(db,
    "SELECT c.set_id, c.component_type, c.manufacturer, c.model, c.quantity, c.unit_price, c.list_price FROM hardware_components c JOIN hardware_sets s ON s.id = c.set_id WHERE s.session_id = ? ORDER BY c.set_id, c.sequence_order",
    sessionId);
  const by = new Map(sets.map((s) => [s.id, Object.assign({}, s, { components: [] })]));
  for (const c of comps) if (by.has(c.set_id)) by.get(c.set_id).components.push(c);
  return Array.from(by.values());
}

async function sessionDoors(db, sessionId) {
  const rows = await all(db,
    "SELECT mark, door_type, door_material AS material, frame_material, fire_rating, width, height, width_inches, height_inches, hardware_group FROM door_schedule_entries WHERE session_id = ? AND COALESCE(validation_status, '') <> 'rejected' ORDER BY page_number, mark",
    sessionId);
  if (rows.length) return rows;
  // Older sessions and the demo seed keep their doors in door_hardware_matrix.
  return all(db,
    "SELECT door_number AS mark, door_type, NULL AS material, NULL AS frame_material, NULL AS fire_rating, NULL AS width, NULL AS height, hardware_set_number AS hardware_group, door_location AS location FROM door_hardware_matrix WHERE session_id = ? ORDER BY door_number",
    sessionId);
}

async function projectFor(db, projectId) {
  if (!projectId) return null;
  const p = await db.prepare("SELECT name, client_name, client_address, project_address, architect FROM projects WHERE id = ?").bind(projectId).first();
  return p || null;
}

function isDemoClone(s) {
  return String(s.file_buffer_key || "").startsWith("demo-clone/") || (s.filename === "weyland_building_schedule.pdf" && s.project_name === DEMO_LABEL);
}

/**
 * Everything the caller can price. Guests (no userId) get the demo only.
 * -> { sources: [{ kind, id, name, doors, sets, createdAt, demo, note }], hasOwn }
 */
export async function listSources(db, user) {
  const sources = [];
  const userId = user && !user.ephemeral ? user.userId : null;
  let hasOwn = false;
  if (userId) {
    const sessions = await all(db,
      "SELECT h.id, h.project_name, h.filename, h.file_buffer_key, h.created_at, " +
      "(SELECT COUNT(*) FROM door_schedule_entries d WHERE d.session_id = h.id) AS dse, " +
      "(SELECT COUNT(*) FROM door_hardware_matrix m WHERE m.session_id = h.id) AS dhm, " +
      "(SELECT COUNT(*) FROM hardware_sets s WHERE s.session_id = h.id) AS sets " +
      "FROM hardware_extraction_sessions h WHERE h.user_id = ? ORDER BY h.created_at DESC LIMIT 60",
      userId);
    let cloneShown = false;
    for (const s of sessions) {
      const doors = Math.max(Number(s.dse) || 0, Number(s.dhm) || 0);
      if (!doors && !Number(s.sets)) continue;
      const demo = isDemoClone(s);
      if (demo) { if (cloneShown) continue; cloneShown = true; }
      else hasOwn = true;
      sources.push({
        kind: "session", id: s.id, name: s.project_name || s.filename || "SubX session", doors, sets: Number(s.sets) || 0,
        createdAt: s.created_at, demo,
        note: demo ? "Your copy of SubX's demo schedule" : "Your SubX session" + (s.filename ? " · " + s.filename : "")
      });
    }
    const subs = await all(db,
      "SELECT s.id, s.project_name, s.status, s.created_at, (SELECT COUNT(*) FROM door_entries d WHERE d.submittal_id = s.id AND d.deleted_at IS NULL) AS doors FROM submittals s WHERE s.user_id = ? AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 30",
      userId);
    for (const s of subs) {
      hasOwn = true;
      sources.push({ kind: "submittal", id: s.id, name: s.project_name || "Submittal", doors: Number(s.doors) || 0, sets: 0, createdAt: s.created_at, demo: false, note: "Your submittal (" + (s.status || "draft") + ")" });
    }
  }
  if (!sources.some((x) => x.demo)) {
    const n = await db.prepare("SELECT COUNT(*) AS n FROM door_hardware_matrix WHERE session_id = ?").bind(DEMO_SEED_SESSION_ID).first();
    const sets = await db.prepare("SELECT COUNT(DISTINCT hardware_set_number) AS n FROM door_hardware_matrix WHERE session_id = ?").bind(DEMO_SEED_SESSION_ID).first();
    if (n && n.n) {
      sources.push({ kind: "demo", id: DEMO_SOURCE_ID, name: DEMO_LABEL, doors: Number(n.n) || 0, sets: Number(sets && sets.n) || 0, createdAt: null, demo: true, note: "SubX's demo door schedule (read-only sample project)" });
    }
  }
  return { sources, hasOwn };
}

/**
 * One source's schedule and derived lines, or null when the caller may not
 * read it (not theirs, or not found).
 * -> { source: {kind, id, name, demo}, project, doors, lines }
 */
export async function loadSource(db, user, kind, id) {
  const userId = user && !user.ephemeral ? user.userId : null;
  if (kind === "demo") {
    if (id !== DEMO_SOURCE_ID) return null;
    const doors = await sessionDoors(db, DEMO_SEED_SESSION_ID);
    const project = await projectFor(db, DEMO_SEED_PROJECT_ID);
    return { source: { kind, id, name: DEMO_LABEL, demo: true }, project, doors, lines: deriveLines(doors, []) };
  }
  if (kind === "session") {
    if (!userId) return null;
    const s = await db.prepare("SELECT id, project_id, project_name, filename, file_buffer_key FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?").bind(id, userId).first();
    if (!s) return null;
    const doors = await sessionDoors(db, s.id);
    const sets = await setsWithComponents(db, s.id);
    const project = await projectFor(db, s.project_id);
    return { source: { kind, id: s.id, name: s.project_name || s.filename || "SubX session", demo: isDemoClone(s) }, project, doors, lines: deriveLines(doors, sets) };
  }
  if (kind === "submittal") {
    if (!userId) return null;
    const s = await db.prepare("SELECT id, project_name, project_id FROM submittals WHERE id = ? AND user_id = ?").bind(id, userId).first();
    if (!s) return null;
    const doors = await all(db,
      "SELECT door_number AS mark, door_type, material_code AS material, frame_material, fire_rating, size, NULL AS width, NULL AS height, hardware_group FROM door_entries WHERE submittal_id = ? AND deleted_at IS NULL ORDER BY door_number",
      s.id);
    const project = await projectFor(db, s.project_id);
    return { source: { kind, id: s.id, name: s.project_name || "Submittal", demo: false }, project, doors, lines: deriveLines(doors, []) };
  }
  return null;
}
