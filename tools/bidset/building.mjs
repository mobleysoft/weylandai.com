// tools/bidset/building.mjs
//
// The WeylandAI Building as one source model (2026-10-09; docs/direction-2026-10-08.md, "The
// Architect and the Prime Contractor"). We cannot get a customer's bid sets, so we author our own
// from this model and grade SubX against it. Every sheet the generator draws, the truth JSON beside
// the PDFs, the grade, and the SightX corridor all come from this one file.
//
// A sample project, NOT A REAL BUILDING. The address is the demo project's (weyland-subx-worker
// src/lib/demo-building.js); the doors, groups and products are designed here, on the conventions
// of the public sets in tools/corpus/door-schedules (Rockford A2.2 + 08 71 00, Berryessa A9.2):
// door marks by room, a ruled schedule on an ARCH D sheet, hardware groups as printed in a
// spec section ("QTY EA DESCRIPTION CATALOG NUMBER FINISH MFR"), maker abbreviations as the
// industry prints them (IVE, SCH, LCN, VON, ZER, SEL, GLY).
//
// `held` says whether WeylandAI's catalogue holds a page for the item, as measured live on
// 2026-10-09 by tools/accuracy/packet_coverage.mjs (the same maker and number cited in the
// Rockford or Berryessa packet). Two items are deliberately not held: a Glynn-Johnson 90S
// overhead stop (no Glynn-Johnson book on file prints it) and a card reader furnished by others.

export const PROJECT = {
  name: "The WeylandAI Building",
  subtitle: "New Corporate Headquarters",
  address: "4400 Bluestem Parkway, Austin, TX",
  number: "WAI-2026-01",
  architect: "WeylandAI Sample Architects (fictional)",
  date: "2026-10-09",
  stamp: "SAMPLE PROJECT - NOT A REAL BUILDING",
};

// Hardware groups, each item per opening (a pair's items are counted for the pair).
const I = (qty, description, catalog, finish, mfr, held = true, extra = {}) => ({ qty, uom: "EA", description, catalog, finish, mfr, held, ...extra });
export const GROUPS = [
  { group: "01", name: "MAIN ENTRY PAIR", items: [
    I(2, "CONTINUOUS HINGE", "SL11 HD", "628", "SEL"),
    I(2, "EXIT DEVICE", "99-L-F", "626", "VON"),
    I(1, "RIM CYLINDER", "20-057-ICX", "626", "SCH"),
    I(2, "SURFACE CLOSER", "4040XP EDA", "689", "LCN"),
    I(2, "KICK PLATE", "8400 10\" X 34\" B-CS", "630", "IVE"),
    I(1, "GASKETING", "188S-BK", "BK", "ZER"),
    I(2, "DOOR SWEEP", "328A", "AA", "ZER"),
  ] },
  { group: "02", name: "STAIR", items: [
    I(3, "HINGE", "5BB1HW 4.5 X 4.5", "652", "IVE"),
    I(1, "FIRE EXIT DEVICE", "99-EO-F", "626", "VON"),
    I(1, "SURFACE CLOSER", "4040XP REG", "689", "LCN"),
    I(1, "KICK PLATE", "8400 10\" X 34\" B-CS", "630", "IVE"),
    I(1, "GASKETING", "188S-BK", "BK", "ZER"),
  ] },
  { group: "03", name: "OFFICE", items: [
    I(3, "HINGE", "5BB1HW 4.5 X 4.5", "652", "IVE"),
    I(1, "ENTRANCE LOCK", "ALX53R RHO", "626", "SCH"),
    I(1, "WALL STOP", "WS406/407CCV", "630", "IVE"),
    I(3, "SILENCER", "SR64", "GRY", "IVE"),
  ] },
  { group: "04", name: "RESTROOM", items: [
    I(1, "CONTINUOUS HINGE", "SL11 HD", "628", "SEL"),
    I(1, "PRIVACY LOCK W/ INDICATOR", "ND40S RHO OS-OCC", "626", "SCH"),
    I(1, "SURFACE CLOSER", "4040XP REG", "689", "LCN"),
    I(1, "KICK PLATE", "8400 10\" X 34\" B-CS", "630", "IVE"),
    I(1, "WALL STOP", "WS406/407CCV", "630", "IVE"),
    I(3, "SILENCER", "SR64", "GRY", "IVE"),
  ] },
  { group: "05", name: "STORAGE", items: [
    I(3, "HINGE", "5BB1HW 4.5 X 4.5", "652", "IVE"),
    I(1, "STOREROOM LOCK", "ALX80R RHO", "626", "SCH"),
    I(1, "OVERHEAD STOP", "90S", "630", "GLY", false),
    I(3, "SILENCER", "SR64", "GRY", "IVE"),
  ] },
  { group: "06", name: "IT ROOM", items: [
    I(3, "HINGE", "5BB1HW 4.5 X 4.5", "652", "IVE"),
    I(1, "STOREROOM LOCK", "ALX80R RHO", "626", "SCH"),
    I(1, "ELECTRIC STRIKE", "6223 FSE 24VDC", "630", "VON"),
    I(1, "SURFACE CLOSER", "4040XP REG", "689", "LCN"),
    I(1, "CARD READER", "BY DIVISION 28", "", "B/O", false, { by_others: true }),
    I(3, "SILENCER", "SR64", "GRY", "IVE"),
  ] },
  { group: "07", name: "CORRIDOR PAIR", items: [
    I(2, "CONTINUOUS HINGE", "SL11 HD", "628", "SEL"),
    I(2, "FLUSH BOLT", "FB51P", "630", "IVE"),
    I(1, "DUST PROOF STRIKE", "DP1", "626", "IVE"),
    I(1, "STOREROOM LOCK", "ALX80R RHO", "626", "SCH"),
    I(2, "SURFACE CLOSER", "4040XP REG", "689", "LCN"),
    I(2, "KICK PLATE", "8400 10\" X 34\" B-CS", "630", "IVE"),
    I(1, "GASKETING", "188S-BK", "BK", "ZER"),
  ] },
  { group: "08", name: "BREAK ROOM", items: [
    I(3, "HINGE", "5BB1HW 4.5 X 4.5", "652", "IVE"),
    I(1, "PUSH PLATE", "8200 4\" X 16\"", "630", "IVE"),
    I(1, "PULL", "8302 10\" 4\" X 16\"", "630", "IVE"),
    I(1, "SURFACE CLOSER", "4040XP REG", "689", "LCN"),
    I(1, "WALL STOP", "WS406/407CCV", "630", "IVE"),
  ] },
  { group: "09", name: "ROOF ACCESS", items: [
    I(1, "CONTINUOUS HINGE", "SL57 HD", "628", "SEL"),
    I(1, "EXIT DEVICE", "99-EO", "626", "VON"),
    I(1, "SURFACE CLOSER", "4040XP EDA", "689", "LCN"),
    I(1, "GASKETING", "188S-BK", "BK", "ZER"),
    I(1, "DOOR SWEEP", "328A", "AA", "ZER"),
  ] },
  { group: "10", name: "VESTIBULE", items: [
    I(1, "CONTINUOUS HINGE", "SL11 HD", "628", "SEL"),
    I(1, "EXIT DEVICE", "99-L-F", "626", "VON"),
    I(1, "POWER TRANSFER", "EPT10", "689", "VON"),
    I(1, "SURFACE CLOSER", "4040SE", "689", "LCN"),
    I(1, "PULL", "8190HD 10\" O", "630", "IVE"),
  ] },
];

// Openings: three floors. A door row as the schedule prints it.
// type: A flush, B half-glass, F full-glass (as Rockford's legend); matl WD/HM/AL; frame 1/2/3.
const D = (mark, room, w, h, type, matl, frame, fmatl, fire, group, pair = false) => ({ mark, room, w, h, type, matl, frame, fmatl, fire, group, pair });
export const OPENINGS = [
  D("100A", "MAIN ENTRY", 72, 84, "F", "AL", "3", "AL", null, "01", true),
  D("100B", "VESTIBULE", 36, 84, "F", "AL", "3", "AL", null, "10"),
  D("101", "LOBBY", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("102", "RECEPTION OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("103", "CONFERENCE", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("104", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("105", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("106", "WOMEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("107", "MEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("108", "BREAK ROOM", 36, 84, "A", "WD", "1", "HM", null, "08"),
  D("109", "STORAGE", 36, 84, "A", "HM", "1", "HM", null, "05"),
  D("110", "IT / SERVER", 36, 84, "A", "HM", "1", "HM", "60 MIN", "06"),
  D("111", "CORRIDOR", 72, 84, "B", "WD", "2", "HM", "20 MIN", "07", true),
  D("112", "STAIR 1", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("113", "STAIR 2", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("114", "JANITOR", 36, 84, "A", "HM", "1", "HM", null, "05"),
  D("200", "CORRIDOR", 72, 84, "B", "WD", "2", "HM", "20 MIN", "07", true),
  D("201", "OPEN OFFICE", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("202", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("203", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("204", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("205", "CONFERENCE", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("206", "WOMEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("207", "MEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("208", "BREAK ROOM", 36, 84, "A", "WD", "1", "HM", null, "08"),
  D("209", "STORAGE", 36, 84, "A", "HM", "1", "HM", null, "05"),
  D("210", "DATA CLOSET", 36, 84, "A", "HM", "1", "HM", "60 MIN", "06"),
  D("211", "STAIR 1", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("212", "STAIR 2", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("213", "COPY / PRINT", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("214", "JANITOR", 36, 84, "A", "HM", "1", "HM", null, "05"),
  D("215", "WELLNESS", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("300", "CORRIDOR", 72, 84, "B", "WD", "2", "HM", "20 MIN", "07", true),
  D("301", "EXECUTIVE SUITE", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("302", "EXECUTIVE OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("303", "EXECUTIVE OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("304", "BOARD ROOM", 36, 84, "B", "WD", "1", "HM", null, "03"),
  D("305", "OFFICE", 36, 84, "A", "WD", "1", "HM", null, "03"),
  D("306", "WOMEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("307", "MEN", 36, 84, "A", "WD", "1", "HM", null, "04"),
  D("308", "PANTRY", 36, 84, "A", "WD", "1", "HM", null, "08"),
  D("309", "STORAGE", 36, 84, "A", "HM", "1", "HM", null, "05"),
  D("310", "DATA CLOSET", 36, 84, "A", "HM", "1", "HM", "60 MIN", "06"),
  D("311", "STAIR 1", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("312", "STAIR 2", 36, 84, "A", "HM", "1", "HM", "90 MIN", "02"),
  D("313", "MECHANICAL", 36, 84, "A", "HM", "1", "HM", "60 MIN", "05"),
  D("314", "ROOF ACCESS", 36, 84, "A", "HM", "1", "HM", null, "09"),
  D("315", "JANITOR", 36, 84, "A", "HM", "1", "HM", null, "05"),
];

export const feetInches = (inches) => Math.floor(inches / 12) + "'-" + (inches % 12) + '"';
export const groupLabel = (g) => g.group + " " + g.name;

/** Truth in tools/corpus/expected's own shape, so schedule_read_accuracy.mjs can grade the set. */
export function truthDoors(file, page, pageSize) {
  return {
    document: PROJECT.name + " (" + PROJECT.stamp + "): sheet A-601 DOOR SCHEDULE",
    source: { file, pages: [page], page_size_pt: pageSize, text_layer: true },
    schedule_type: "door_schedule",
    how_checked: "Generated from tools/bidset/building.mjs; the sheet is drawn from the same rows.",
    door_count: OPENINGS.length,
    doors: OPENINGS.map((o, i) => ({ row: i + 1, mark: o.mark, room: o.room, door_type: o.type, door_material: o.matl, frame_type: o.frame, frame_material: o.fmatl, pair: o.pair, width: feetInches(o.w), height: feetInches(o.h), width_inches: o.w, height_inches: o.h, fire_rating: o.fire, hardware_group: o.group })),
  };
}
export function truthGroups(file, pages, pageOf) {
  return {
    document: PROJECT.name + " (" + PROJECT.stamp + "): Section 08 71 00 DOOR HARDWARE, hardware groups",
    source: { file, pages, page_size_pt: [612, 792], text_layer: true },
    schedule_type: "hardware_schedule",
    how_checked: "Generated from tools/bidset/building.mjs; the section is drawn from the same groups.",
    format: "QTY EA DESCRIPTION CATALOG NUMBER FINISH MFR",
    group_count: GROUPS.length,
    groups: GROUPS.map((g) => ({ group: g.group, name: g.name, page: pageOf(g.group), doors: OPENINGS.filter((o) => o.group === g.group).map((o) => o.mark), items: g.items.map(({ qty, uom, description, catalog, finish, mfr, held, by_others }) => ({ qty, uom, description, catalog, finish, mfr, held, ...(by_others ? { by_others } : {}) })), notes: [] })),
  };
}
