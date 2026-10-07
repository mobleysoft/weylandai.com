// weyland-subx-worker/src/lib/demo-building.js
//
// "The WeylandAI Building": SubX's demo project. Every homepage visitor gets
// a private copy of it (POST /api/demo/weyland-building/session,
// routes/demo-building.js) as a real SubX session they can open in the
// workspace, build a submittal package from, and price in PropX.
//
// The seed (2026-09-09) is one uploaded page, sheet A9.01 "DOOR & HARDWARE
// SCHEDULE" (R2 subx-uploads hardware-sessions/89d2c5d5.../bee5bc31...,
// 1 page with a text layer). Each of its 10 rows names a door, its hardware
// set, the set's HARDWARE DESCRIPTION and its MANUFACTURER / PART NO. Only
// the first four columns were ever stored (door_hardware_matrix): the seed
// had no hardware_sets and no hardware_components, and each copy grouped the
// doors into bare sets by number, so every demo hardware set listed nothing
// (journey subx-upload-to-submittal, 2026-10-07: "8 sets, 0 with products").
//
// This module holds:
//   - DEMO_SHEET: the sheet's rows exactly as its text layer prints them
//     (pdftotext -layout), and what each printed part is (PART_TYPES);
//   - sheetHardwareSets(): the 8 sets and 13 parts derived from those rows;
//   - seedHardwareStatements(): the rows that give the seed session its sets
//     and parts (run once by tools/seed-demo-building-hardware.mjs);
//   - cloneDemoBuilding(): the per-visitor copy, made in ONE D1 batch (all or
//     nothing) and carrying the seed's doors, hardware sets and parts.
//     The copy used to be ~40 single statements in a row; a visitor who left
//     the page mid-way left a copy with 5-7 of the 10 doors and no sets.

export const SEED_PROJECT_ID = "eabd5ff6-e19f-4e6b-acfc-9a250445dfa8";
export const SEED_SESSION_ID = "cc961a0b-471b-4229-9e0e-deb503e50d3a";
export const CLONE_KEY_PREFIX = "demo-clone/";
export const CLONE_TTL_SECONDS = 24 * 60 * 60; // the KV pointer; the sweep (lib/demo-clone-sweep.js) removes the rows after 24 h
export const SEED_EXTRACTION_ID = "demoseed-a901-p1";
const CLONE_APPROVER = "demo-seed-clone"; // nobody reviewed a copy: it says so (same attribution the copies always carried)
const SEED_APPROVER = "demo-seed-sheet-a901";

// Sheet A9.01, page 1, as its text layer reads (one row per door).
export const DEMO_SHEET = {
  sheet: "A9.01",
  title: "THE WEYLANDAI BUILDING — NEW CORPORATE HEADQUARTERS",
  subtitle: "4400 Bluestem Parkway, Austin, TX · Sheet A9.01 — DOOR & HARDWARE SCHEDULE",
  columns: ["DOOR NO.", "LOCATION", "DOOR TYPE", "HARDWARE SET", "HARDWARE DESCRIPTION", "MANUFACTURER / PART NO."],
  rows: [
    ["D-101", "Main Lobby Entry", "Aluminum Storefront", "HW-01", "Storefront exit device + closer", "Von Duprin 98-NL-OP · LCN 4040XP-EDA"],
    ["D-114", "Conference Rm A", "Wood, Solid Core", "HW-04", "Lever set + hinges", "Schlage ND70PD RHO 626"],
    ["D-118A", "IT / Server Room", "Hollow Metal", "HW-07", "Electrified lever + mag lock", "Schlage ND96PD EL RHO · Securitron M62"],
    ["D-122", "Stairwell 1", "Hollow Metal, Fire-Rated", "HW-02", "Fire-rated closer + panic hardware", "Von Duprin 33A-EO · LCN 4111"],
    ["D-201", "Executive Suite", "Wood, Solid Core", "HW-05", "Privacy lever", "Corbin Russwin ML2057 LWA 626"],
    ["D-207", "Break Room", "Wood, Solid Core", "HW-03", "Passage lever", "Sargent 10-Line 8205 LNL"],
    ["D-214B", "Mechanical Room", "Hollow Metal", "HW-08", "Cylindrical lock + kick plate", "Hager 3400 US32D · Rockwood K1050"],
    ["D-305", "Roof Access", "Hollow Metal, Weatherstripped", "HW-09", "Weatherstripped panic hardware", "Von Duprin 22-EO · Pemko 303AS"],
    ["D-310", "Data Closet, 3rd Fl", "Hollow Metal", "HW-07", "Electrified lever + mag lock", "Schlage ND96PD EL RHO · Securitron M62"],
    ["D-311", "Janitor Closet, 3rd Fl", "Hollow Metal", "HW-03", "Passage lever", "Sargent 10-Line 8205 LNL"],
  ],
};

// What each printed part is: its words in the set's HARDWARE DESCRIPTION
// (stored as the item's specifications) and the component type SubX uses
// for it everywhere else (hardware_components.component_type / dhi_category).
// The sheet names no hinge product for HW-04 ("Lever set + hinges"), so no
// hinge item is made up for it; it prints no quantities, so each listed part
// is one per opening.
export const PART_TYPES = {
  "Von Duprin 98-NL-OP": { words: "Storefront exit device", type: "exit_device", dhi: "Exit Devices" },
  "LCN 4040XP-EDA": { words: "closer", type: "closer", dhi: "Closers and Coordinators" },
  "Von Duprin 33A-EO": { words: "panic hardware", type: "exit_device", dhi: "Exit Devices" },
  "LCN 4111": { words: "Fire-rated closer", type: "closer", dhi: "Closers and Coordinators" },
  "Sargent 10-Line 8205 LNL": { words: "Passage lever", type: "lock", dhi: "Locks and Latches" },
  "Schlage ND70PD RHO 626": { words: "Lever set", type: "lock", dhi: "Locks and Latches" },
  "Corbin Russwin ML2057 LWA 626": { words: "Privacy lever", type: "lock", dhi: "Locks and Latches" },
  "Schlage ND96PD EL RHO": { words: "Electrified lever", type: "lock", dhi: "Locks and Latches" },
  "Securitron M62": { words: "mag lock", type: "electromagnetic_lock", dhi: "Electronic Hardware" },
  "Hager 3400 US32D": { words: "Cylindrical lock", type: "lock", dhi: "Locks and Latches" },
  "Rockwood K1050": { words: "kick plate", type: "kick_plate", dhi: "Architectural Trim" },
  "Von Duprin 22-EO": { words: "panic hardware", type: "exit_device", dhi: "Exit Devices" },
  "Pemko 303AS": { words: "Weatherstripped", type: "seal", dhi: "Seals and Gasketing" },
};

// Manufacturer names as the sheet prints them (longest first, so "Corbin
// Russwin" is not read as a one-word name).
const MANUFACTURERS = ["Corbin Russwin", "Von Duprin", "Securitron", "Rockwood", "Schlage", "Sargent", "Hager", "Pemko", "LCN"];
// BHMA / US finish codes as printed at the end of a part (626, US32D).
const FINISH = /^(?:6\d\d|US\d{1,2}[A-Z]?)$/;

/** "Schlage ND70PD RHO 626" -> { manufacturer: "Schlage", model: "ND70PD RHO", finish: "626", catalog_number: "ND70PD RHO 626" } */
export function parsePart(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const mfr = MANUFACTURERS.find((m) => t === m || t.startsWith(m + " ")) || null;
  const rest = mfr ? t.slice(mfr.length).trim() : t;
  const words = rest.split(" ").filter(Boolean);
  let finish = null;
  if (words.length > 1 && FINISH.test(words[words.length - 1])) finish = words.pop();
  return { manufacturer: mfr, model: words.join(" ") || null, finish, catalog_number: rest || null };
}

/** Split a MANUFACTURER / PART NO. cell into its parts ("A · B"). */
export function splitParts(cell) {
  return String(cell || "").split("·").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/**
 * The sheet's hardware sets: one per HARDWARE SET value, in set order, with
 * its doors and its parts. Throws if two doors of one set disagree about
 * the set's description or parts, or a part has no PART_TYPES entry.
 */
export function sheetHardwareSets(sheet = DEMO_SHEET) {
  const sets = new Map();
  for (const [door, location, , set, description, parts] of sheet.rows) {
    if (!sets.has(set)) sets.set(set, { set_number: set, set_name: description, parts, doors: [], locations: [] });
    const s = sets.get(set);
    if (s.set_name !== description || s.parts !== parts) throw new Error("sheet " + sheet.sheet + ": " + set + " is printed two ways (" + door + ")");
    s.doors.push(door);
    s.locations.push(location);
  }
  return [...sets.values()].sort((a, b) => a.set_number.localeCompare(b.set_number, undefined, { numeric: true })).map((s) => ({
    set_number: s.set_number,
    set_name: s.set_name,
    door_location: s.locations.join("; "),
    doors: s.doors,
    components: splitParts(s.parts).map((printed, i) => {
      const kind = PART_TYPES[printed];
      if (!kind) throw new Error("sheet " + sheet.sheet + ": no type for part '" + printed + "'");
      return { sequence_order: i + 1, printed, component_type: kind.type, dhi_category: kind.dhi, specifications: kind.words, quantity: 1, uom: "EA", ...parsePart(printed) };
    }),
  }));
}

function setNote(doors) {
  return "Marks: " + doors.join(", ") + ". From sheet A9.01 (HARDWARE DESCRIPTION, MANUFACTURER / PART NO.); the sheet prints no quantities: one of each listed part per opening.";
}

/**
 * D1 statements (sql + args) that give the seed session its hardware sets
 * and parts from the sheet, replacing any earlier run of this (ids are
 * fixed: demoseed-...). Used by tools/seed-demo-building-hardware.mjs.
 */
export function seedHardwareStatements({ now = new Date().toISOString() } = {}) {
  const sets = sheetHardwareSets();
  const out = [
    { sql: "DELETE FROM hardware_components WHERE set_id IN (SELECT id FROM hardware_sets WHERE session_id = ? AND id LIKE 'demoseed-%')", args: [SEED_SESSION_ID] },
    { sql: "DELETE FROM hardware_sets WHERE session_id = ? AND id LIKE 'demoseed-%'", args: [SEED_SESSION_ID] },
    { sql: "DELETE FROM hardware_page_extractions WHERE id = ?", args: [SEED_EXTRACTION_ID] },
    {
      sql: "INSERT INTO hardware_page_extractions (id, session_id, page_number, extracted_data, status, input_tokens, output_tokens, extraction_time_ms, created_at, updated_at) VALUES (?, ?, 1, ?, 'sheet_text_layer', 0, 0, 0, ?, ?)",
      args: [SEED_EXTRACTION_ID, SEED_SESSION_ID, JSON.stringify({ source: "sheet " + DEMO_SHEET.sheet + " text layer (pdftotext -layout)", title: DEMO_SHEET.title, subtitle: DEMO_SHEET.subtitle, columns: DEMO_SHEET.columns, rows: DEMO_SHEET.rows }), now, now],
    },
  ];
  for (const s of sets) {
    const setId = "demoseed-set-" + s.set_number;
    out.push({
      sql: "INSERT INTO hardware_sets (id, session_id, user_id, submittal_id, set_number, set_name, door_location, door_count, approved_from_page, approved_at, approved_by, source_page_extraction_id, notes, created_at, updated_at, version, affirmed) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, 0)",
      args: [setId, SEED_SESSION_ID, SEED_APPROVER, s.set_number, s.set_name, s.door_location, s.doors.length, now, SEED_APPROVER, SEED_EXTRACTION_ID, setNote(s.doors), now, now],
    });
    for (const c of s.components) {
      out.push({
        sql: "INSERT INTO hardware_components (id, set_id, hardware_set_id, component_type, dhi_category, sequence_order, manufacturer, model, catalog_number, finish, quantity, uom, specifications, approved_at, approved_by, created_at, updated_at, version, affirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
        args: ["demoseed-comp-" + s.set_number + "-" + c.sequence_order, setId, setId, c.component_type, c.dhi_category, c.sequence_order, c.manufacturer, c.model, c.catalog_number, c.finish, c.quantity, c.uom, c.specifications, now, SEED_APPROVER, now, now],
      });
    }
  }
  return out;
}

const COMPONENT_COPY_COLUMNS = ["component_type", "dhi_category", "sequence_order", "manufacturer", "model", "catalog_number", "finish", "quantity", "function_code", "specifications", "ansi_bhma_grade", "fire_rating_minutes", "ul_listing_number", "ada_compliant", "product_id", "product_variant_id", "product_match_confidence", "uom", "unit_price", "price_source", "net_price", "list_price"];

/** What a complete copy of the seed holds (doors, sets, parts). */
export async function seedShape(db) {
  const [doors, sets, comps] = await db.batch([
    db.prepare("SELECT COUNT(*) AS n FROM door_hardware_matrix WHERE session_id = ?").bind(SEED_SESSION_ID),
    db.prepare("SELECT COUNT(*) AS n FROM hardware_sets WHERE session_id = ?").bind(SEED_SESSION_ID),
    db.prepare("SELECT COUNT(*) AS n FROM hardware_components c JOIN hardware_sets s ON c.set_id = s.id WHERE s.session_id = ?").bind(SEED_SESSION_ID),
  ]);
  const n = (r) => Number(((r && r.results) || [])[0]?.n || 0);
  return { doors: n(doors), sets: n(sets), components: n(comps) };
}

/** A visitor's existing copy, counted the same way (null when it is gone). */
export async function copyShape(db, sessionId) {
  const r = await db.prepare(
    "SELECT s.id, s.user_id, (SELECT COUNT(*) FROM door_schedule_entries d WHERE d.session_id = s.id) AS doors, " +
    "(SELECT COUNT(*) FROM hardware_sets h WHERE h.session_id = s.id) AS sets, " +
    "(SELECT COUNT(*) FROM hardware_components c JOIN hardware_sets h ON c.set_id = h.id WHERE h.session_id = s.id) AS components " +
    "FROM hardware_extraction_sessions s WHERE s.id = ? AND s.file_buffer_key = ?"
  ).bind(sessionId, CLONE_KEY_PREFIX + sessionId).first();
  return r ? { doors: Number(r.doors) || 0, sets: Number(r.sets) || 0, components: Number(r.components) || 0, user_id: r.user_id } : null;
}

/** True when an existing copy holds everything the seed does. */
export function copyIsComplete(copy, seed) {
  return !!copy && copy.doors >= seed.doors && copy.doors > 0 && copy.components >= seed.components && (copy.sets >= seed.sets || seed.sets === 0) && copy.sets > 0;
}

/**
 * Make one visitor's copy of the demo building, in ONE D1 batch.
 * user: the authenticate() user (ephemeral guest or account).
 * -> { project_id, session_id, door_count, hardware_sets, hardware_components }
 */
export async function cloneDemoBuilding(env, user, { now = new Date().toISOString(), uuid = () => crypto.randomUUID() } = {}) {
  const db = env.DB;
  const [projR, doorsR, setsR, compsR, extR] = await db.batch([
    db.prepare("SELECT * FROM projects WHERE id = ?").bind(SEED_PROJECT_ID),
    db.prepare("SELECT door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified FROM door_hardware_matrix WHERE session_id = ? ORDER BY rowid").bind(SEED_SESSION_ID),
    db.prepare("SELECT id, set_number, set_name, door_location, approved_from_page, notes FROM hardware_sets WHERE session_id = ? ORDER BY set_number").bind(SEED_SESSION_ID),
    db.prepare("SELECT c.set_id, " + COMPONENT_COPY_COLUMNS.map((k) => "c." + k).join(", ") + " FROM hardware_components c JOIN hardware_sets s ON c.set_id = s.id WHERE s.session_id = ? ORDER BY s.set_number, c.sequence_order").bind(SEED_SESSION_ID),
    db.prepare("SELECT id, page_number, extracted_data, status FROM hardware_page_extractions WHERE session_id = ? ORDER BY page_number LIMIT 1").bind(SEED_SESSION_ID),
  ]);
  const rows = (r) => (r && r.results) || [];
  const seedProject = rows(projR)[0];
  if (!seedProject) {
    const e = new Error("Demo seed project not found - it may have been removed");
    e.status = 500;
    throw e;
  }
  const doors = rows(doorsR);
  const seedSets = rows(setsR);
  const seedComps = rows(compsR);
  const seedExtraction = rows(extR)[0] || null;

  const projectId = uuid();
  const sessionId = uuid();
  const ownerUserId = user && !user.ephemeral ? user.userId : null;
  const tenantId = (user && (user.tenantId || user.tenant_id)) || "ven_weyland";
  // hardware_extraction_sessions.user_id is NOT NULL: a guest's copy is
  // attributed to the seed's own owner (it is still that guest's: the KV
  // pointer is per guest); an account's copy is the account's.
  const sessionOwnerId = ownerUserId || seedProject.created_by;

  const stmts = [];
  const add = (sql, ...args) => stmts.push(db.prepare(sql).bind(...args.map((v) => (v === undefined ? null : v))));
  add("INSERT INTO projects (id, tenant_id, name, project_type, status, client_name, project_address, architect, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)",
    projectId, tenantId, seedProject.name, seedProject.project_type, seedProject.client_name, seedProject.project_address, seedProject.architect, now, now, ownerUserId);
  add("INSERT INTO hardware_extraction_sessions (id, user_id, project_id, project_name, filename, file_buffer_key, total_pages, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, 'completed', ?)",
    sessionId, sessionOwnerId, projectId, seedProject.name, "weyland_building_schedule.pdf", CLONE_KEY_PREFIX + sessionId, now);

  // Hardware sets: the seed's own sets (with their parts), and a bare set
  // for any door group the seed has no set for (as the copies always had).
  const marksByGroup = new Map();
  for (const d of doors) {
    const g = d.hardware_set_number || "UNKNOWN";
    if (!marksByGroup.has(g)) marksByGroup.set(g, []);
    marksByGroup.get(g).push(d.door_number);
  }
  const extractionId = (seedSets.length ? "democlone_" : "bridge_") + sessionId;
  add("INSERT INTO hardware_page_extractions (id, session_id, page_number, extracted_data, status, input_tokens, output_tokens, extraction_time_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)",
    extractionId, sessionId, (seedExtraction && seedExtraction.page_number) || 1,
    seedSets.length && seedExtraction ? seedExtraction.extracted_data : JSON.stringify({ bridge: true, source: "door_schedule_entries", groups: marksByGroup.size, marks: doors.length }),
    seedSets.length && seedExtraction ? seedExtraction.status : "bridge_generated", now, now);
  const setIdByNumber = new Map();
  const seedSetNew = new Map();
  for (const s of seedSets) {
    const id = "set_" + uuid();
    setIdByNumber.set(s.set_number, id);
    seedSetNew.set(s.id, id);
    add("INSERT INTO hardware_sets (id, session_id, user_id, submittal_id, set_number, set_name, door_location, door_count, approved_from_page, approved_at, approved_by, source_page_extraction_id, notes, created_at, updated_at, version, affirmed) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
      id, sessionId, CLONE_APPROVER, s.set_number, s.set_name, s.door_location, (marksByGroup.get(s.set_number) || []).length, s.approved_from_page || 1, now, CLONE_APPROVER, extractionId, s.notes, now, now);
  }
  for (const [group, marks] of marksByGroup) {
    if (setIdByNumber.has(group)) continue;
    const id = "set_" + uuid();
    setIdByNumber.set(group, id);
    add("INSERT INTO hardware_sets (id, session_id, user_id, submittal_id, set_number, set_name, door_count, approved_from_page, approved_at, approved_by, source_page_extraction_id, notes, created_at, updated_at, version, affirmed) VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, 0)",
      id, sessionId, CLONE_APPROVER, group, group, marks.length, now, CLONE_APPROVER, extractionId, "Marks: " + marks.join(", "), now, now);
  }
  let componentCount = 0;
  for (const c of seedComps) {
    const setId = seedSetNew.get(c.set_id);
    if (!setId) continue;
    componentCount++;
    // set_id is what every reader joins on; hardware_set_id carries the same
    // id so the cleanups that key on it (the sweep, the journey harness) find
    // the copy's parts too.
    add("INSERT INTO hardware_components (id, set_id, hardware_set_id, " + COMPONENT_COPY_COLUMNS.join(", ") + ", approved_at, approved_by, created_at, updated_at, version, affirmed) VALUES (?, ?, ?, " + COMPONENT_COPY_COLUMNS.map(() => "?").join(", ") + ", ?, ?, ?, ?, 1, 0)",
      "comp_" + uuid(), setId, setId, ...COMPONENT_COPY_COLUMNS.map((k) => c[k]), now, CLONE_APPROVER, now, now);
  }

  // The doors: door_hardware_matrix (the homepage's door index reads it) and
  // door_schedule_entries (the workspace, the package, takeoff and PropX read
  // it), each linked straight to its set: both sides come from the same seed
  // set number, so this is an exact link, not a guess.
  for (const d of doors) {
    add("INSERT INTO door_hardware_matrix (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      uuid(), sessionId, d.door_number, d.door_location, d.door_type, d.hardware_set_number, d.source_page, d.source_type, d.extraction_confidence, d.verified);
    const setId = d.hardware_set_number ? setIdByNumber.get(d.hardware_set_number) || null : null;
    add("INSERT INTO door_schedule_entries (id, session_id, tenant_id, page_number, mark, hardware_group, door_type, extraction_confidence, validation_status, validated, validated_by, validated_at, hardware_set_id, hardware_group_match_score, hardware_group_match_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      uuid(), sessionId, tenantId, d.source_page || 1, d.door_number, d.hardware_set_number, d.door_type, d.extraction_confidence,
      d.verified ? "validated" : "pending", d.verified ? 1 : 0, "demo-seed-bridge", d.verified ? now : null,
      setId, setId ? 1.0 : null, setId ? "demo_seed_direct" : null, now, now);
  }

  await db.batch(stmts);
  return { project_id: projectId, session_id: sessionId, door_count: doors.length, hardware_sets: setIdByNumber.size, hardware_components: componentCount };
}
