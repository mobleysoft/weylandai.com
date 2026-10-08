// weyland-sightx-worker/src/lib/schedule-model.js
//
// The SightX model (2026-10-08): the doors a corridor is built from, read
// from the customer's own door schedule. Until today SightX showed one
// hand-built corridor (8 doors authored in a raymarch shader) whatever the
// customer's job was; the pricing page sold it at $999/mo as "a sample
// corridor". Now the corridor is laid out from a schedule:
//
//   - a SubX session (the page reads /api/hardware-schedule/session/:id/doors
//     itself and calls modelFromSubx on the answer),
//   - a pasted schedule (POST /api/sightx/model {text} -> parseSchedule), or
//   - the sample, SubX's demo sheet A9.01 (SAMPLE_SHEET).
//
// Model: { project, source, doors: [Door], sets: {<set>: [Item]}, notes: [] }
//   Door: { mark, location, type, material, width_in, height_in, size_known,
//           leaves (1|2), rating, frame, panic, set, source_page }
//   Item: { type, qty, label, manufacturer, catalog, finish }
//   type: hinge | lockset | exit | closer | kick | maglock | strike | reader |
//         operator | pull | push | stop | holder | bolt | coordinator | seal |
//         threshold | silencer | other
// Nothing is invented: a door with no size in its schedule is drawn at
// 3'-0" x 7'-0" and says so (size_known false); a set with no items is drawn
// with no hardware.

export const DEFAULT_WIDTH_IN = 36;
export const DEFAULT_HEIGHT_IN = 84;
export const MAX_DOORS = 120;

const ITEM_TYPES = [
  ["exit", /\b(exit|panic|crash)\s*(device|bar|hardware)?s?\b|\bvon duprin\s*(98|99|33|35|22)|\b(98|99|33a|35a|22)-?(eo|nl|l|ta|dt)\b/i],
  ["maglock", /\bmag(netic)?\s*-?lock|\bmaglock|\bsecuritron\s*m\d|\bm62\b/i],
  ["operator", /\b(auto(matic)?|power|low[- ]energy)\s*(door\s*)?(operator|opener)s?\b|\bactuators?\b|\bpush\s*buttons?\b/i],
  ["closer", /\bclosers?\b|\blcn\s*\d{4}|\b4040xp|\b4111\b|\b1460\b|\bdc\d{4}\b/i],
  ["reader", /\b(card|badge|prox(imity)?)\s*readers?\b|\baccess\s*control\b|\bkeypads?\b/i],
  ["strike", /\belectric\s*strikes?\b|\bstrikes?\b/i],
  ["kick", /\b(kick|armou?r|mop)\s*plates?\b|\bk10\d\d\b/i],
  ["push", /\bpush\s*plates?\b/i],
  ["pull", /\b(door\s*)?pulls?\b/i],
  ["hinge", /\bhinges?\b|\bpivots?\b|\bbb\d{3,4}\b|\bcontinuous\s*geared\b/i],
  ["lockset", /\block(set)?s?\b|\blevers?\b|\bpassage\b|\bprivacy\b|\bstoreroom\b|\bclassroom\b|\bmortise\b|\bcylindrical\b|\bnd\d{2}|\bml\d{4}|\b10-line\b|\bdeadbolts?\b/i],
  ["stop", /\b(wall|floor|overhead)\s*stops?\b|\bstops?\b/i],
  ["holder", /\bholders?\b|\bhold[- ]?opens?\b/i],
  ["bolt", /\bflush\s*bolts?\b|\bbolts?\b/i],
  ["coordinator", /\bcoordinators?\b/i],
  ["seal", /\bweather\s*strip\w*|\bgasket\w*|\bseals?\b|\bsmoke\s*seal|\bpemko\s*303/i],
  ["threshold", /\bthresholds?\b/i],
  ["silencer", /\bsilencers?\b/i],
];

/** The kind of hardware an item is, from its description, model or type code. */
export function itemType(text) {
  const t = String(text || "");
  for (const [type, re] of ITEM_TYPES) if (re.test(t)) return type;
  return "other";
}

const MATERIALS = [
  ["aluminum", /\b(al|alum|aluminum|aluminium|storefront|sf)\b/i],
  ["glass", /\b(gl|glass|all[- ]glass)\b/i],
  ["wood", /\b(wd|wood|scw|solid core|pf|plastic laminate)\b/i],
  ["hollow metal", /\b(hm|hmd|hollow metal|steel|stl|metal)\b/i],
  ["frp", /\bfrp\b/i],
];
export function materialOf(text) {
  const t = String(text || "");
  for (const [m, re] of MATERIALS) if (re.test(t)) return m;
  return null;
}

/** 3070 -> 36 x 84; 3'-0" x 7'-0" -> 36 x 84; 36x84 -> 36 x 84; PR 3070 / 6070 -> pair. */
export function parseSize(text) {
  const t = String(text || "");
  let m = t.match(/(\d{1,2})\s*'\s*-?\s*(\d{1,2})?\s*"?\s*[x×]\s*(\d{1,2})\s*'\s*-?\s*(\d{1,2})?\s*"?/i);
  if (m) return { w: +m[1] * 12 + (+m[2] || 0), h: +m[3] * 12 + (+m[4] || 0) };
  m = t.match(/\b(\d{2,3})\s*"?\s*[x×]\s*(\d{2,3})\s*"?(?!\d)/i);
  if (m && +m[1] >= 18 && +m[1] <= 144 && +m[2] >= 60 && +m[2] <= 168) return { w: +m[1], h: +m[2] };
  m = t.match(/\b([1-9])([0-9]|1[01])([6-9])([0-9]|1[01])\b/);
  if (m) return { w: +m[1] * 12 + +m[2], h: +m[3] * 12 + +m[4] };
  return null;
}

export function ratingOf(text) {
  const t = String(text || "");
  const m = t.match(/\b(20|45|60|90|180)\s*-?\s*min(ute)?s?\b|\b(1|1\.5|1-1\/2|2|3)\s*-?\s*(hr|hour)s?\b/i);
  if (!m) return null;
  if (m[1]) return m[1] + " min";
  const h = m[3] === "1-1/2" ? "1.5" : m[3];
  return h + " hr";
}

const SET_RE = /\b(?:hw|hdw|hardware|set|group|grp)\s*(?:set\s*)?(?:no\.?\s*|#\s*)?[- :]?\s*([a-z]?\d{1,3}[a-z]?(?:\.\d+)?)\b/i;
export function setOf(text) {
  const m = String(text || "").match(SET_RE);
  return m ? m[1].toUpperCase() : null;
}

function door(partial) {
  const size = partial.size || null;
  const w = size ? size.w : DEFAULT_WIDTH_IN;
  const h = size ? size.h : DEFAULT_HEIGHT_IN;
  const leaves = partial.leaves || (w >= 60 ? 2 : 1);
  return {
    mark: String(partial.mark || "").slice(0, 24),
    location: partial.location ? String(partial.location).slice(0, 80) : null,
    type: partial.type ? String(partial.type).slice(0, 60) : null,
    material: partial.material || materialOf(partial.type) || null,
    width_in: w,
    height_in: h,
    size_known: !!size,
    leaves,
    rating: partial.rating || null,
    frame: partial.frame ? String(partial.frame).slice(0, 40) : null,
    panic: !!partial.panic,
    set: partial.set || null,
    source_page: partial.source_page ?? null,
  };
}

function splitCells(line) {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  if ((line.match(/,/g) || []).length >= 2) return line.split(",").map((c) => c.trim());
  if ((line.match(/\|/g) || []).length >= 2) return line.split("|").map((c) => c.trim()).filter((c, i, a) => !(c === "" && (i === 0 || i === a.length - 1)));
  if (/\S\s{2,}\S/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim());
  return null;
}

const HEADER_KEYS = [
  ["mark", /^(door|opening)?\s*(no\.?|number|#|mark|id)$|^door$|^opening$|^mark$/i],
  ["location", /location|room|space|from|to|description$/i],
  ["size", /^size$|door size|nominal/i],
  ["width", /^w(idth)?\.?$/i],
  ["height", /^h(eight)?\.?$|^ht\.?$/i],
  ["type", /door\s*type|^type$|^door\s*matl|material|^matl/i],
  ["frame", /frame/i],
  ["rating", /rating|label|fire|^rtg$/i],
  ["set", /hardware|hdw|hw|^set$|group/i],
  ["hardware_desc", /hardware\s*desc|description of hardware|hdw\s*desc/i],
  ["parts", /manufacturer|part\s*no|catalog|model/i],
];

function headerMap(cells) {
  const map = {};
  let hits = 0;
  cells.forEach((c, i) => {
    const t = c.trim();
    if (!t) return;
    for (const [key, re] of HEADER_KEYS) {
      if (key === "set" && /desc/i.test(t)) continue;
      if (re.test(t) && map[key] == null) { map[key] = i; hits++; break; }
    }
  });
  return hits >= 2 && map.mark != null ? map : null;
}

function itemsFromText(text) {
  // "Von Duprin 98-NL-OP · LCN 4040XP-EDA" or "closer, exit device, kick plate"
  return String(text || "").split(/\s*[·;,+]\s*|\s+\band\b\s+/i).map((s) => s.trim()).filter(Boolean).map((label) => ({
    type: itemType(label), qty: 1, label: label.slice(0, 120), manufacturer: null, catalog: null, finish: null,
  }));
}

/**
 * Read a pasted door schedule: a table copied from a spreadsheet or PDF
 * (tabs, commas, pipes or runs of spaces, with a header row), or one door
 * per line ("101 HM 3070 HW-1 90 MIN CORRIDOR"). Lines like
 * "HW-1: closer, exit device, kick plate" define a hardware set.
 */
export function parseSchedule(text, { project = "Pasted schedule" } = {}) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  const doors = [];
  const sets = {};
  const notes = [];
  let header = null;
  for (const raw of lines.slice(0, 600)) {
    const line = raw.trim();
    // Set definitions: "HW-1: closer, exit device" / "Set 2 - lever, hinges"
    const def = line.match(/^(?:hw|hdw|hardware\s*set|set|group)\s*[- #]?\s*([a-z]?\d{1,3}[a-z]?)\s*[:=–—-]\s*(.+)$/i);
    if (def && !/\b\d{4}\b/.test(def[2].slice(0, 12))) {
      const k = def[1].toUpperCase();
      sets[k] = (sets[k] || []).concat(itemsFromText(def[2]));
      continue;
    }
    const cells = splitCells(raw);
    if (cells && !header) { const h = headerMap(cells); if (h) { header = h; continue; } }
    if (cells && header) {
      const get = (k) => (header[k] != null ? (cells[header[k]] || "").trim() : "");
      const mark = get("mark");
      if (!mark || /^(door|mark|no\.?)$/i.test(mark)) continue;
      let size = parseSize(get("size"));
      if (!size && get("width") && get("height")) {
        size = parseSize(get("width") + " x " + get("height")) || parseSize(`${get("width")}x${get("height")}`);
      }
      const rowText = cells.join(" ");
      if (!size) size = parseSize(rowText);
      const setVal = get("set");
      const set = setVal ? (setOf(setVal) || setVal.toUpperCase().replace(/\s+/g, "")) : setOf(rowText);
      const typeText = get("type");
      const desc = get("hardware_desc");
      const parts = get("parts");
      if (set && (desc || parts) && !sets[set]) {
        const items = parts ? itemsFromText(parts) : itemsFromText(desc);
        if (desc && parts && items.length) items[0].label = items[0].label;
        sets[set] = items.map((it) => ({ ...it, type: it.type === "other" ? itemType(desc) : it.type }));
      }
      doors.push(door({
        mark,
        location: get("location") || null,
        type: typeText || null,
        material: materialOf(typeText) || materialOf(rowText),
        size,
        leaves: /\b(pr|pair|double)\b/i.test(rowText) ? 2 : null,
        rating: ratingOf(get("rating")) || ratingOf(rowText),
        frame: get("frame") || null,
        panic: /\b(panic|exit device)\b/i.test(rowText + " " + desc),
        set,
      }));
    } else {
      // One door per line: mark first.
      const m = line.match(/^([a-z]{0,3}[- ]?\d{1,4}[a-z]?(?:\.\d+)?)\b\s*(.*)$/i);
      if (!m || !(parseSize(line) || materialOf(m[2]) || setOf(m[2]))) continue;
      const rest = m[2];
      const size = parseSize(rest);
      const set = setOf(rest);
      const rating = ratingOf(rest);
      const material = materialOf(rest);
      const location = rest
        .replace(/\b(pr|pair)\b/gi, " ")
        .replace(SET_RE, " ")
        .replace(/\b\d{1,2}\s*'\s*-?\s*\d{0,2}\s*"?\s*[x×]\s*\d{1,2}\s*'\s*-?\s*\d{0,2}\s*"?|\b\d{4}\b|\b\d{2,3}\s*[x×]\s*\d{2,3}\b/gi, " ")
        .replace(/\b(20|45|60|90|180)\s*-?\s*min(ute)?s?\b|\b(1|1\.5|2|3)\s*-?\s*(hr|hour)s?\b/gi, " ")
        .replace(/\b(hm|hmd|wd|wood|al|alum|aluminum|stl|steel|frp|gl|glass|scw)\b/gi, " ")
        .replace(/\s+/g, " ").trim();
      doors.push(door({
        mark: m[1].replace(/\s+/g, ""),
        location: location || null,
        type: material ? material.toUpperCase() : null,
        material,
        size,
        leaves: /\b(pr|pair|double)\b/i.test(rest) ? 2 : null,
        rating,
        panic: /\b(panic|exit device)\b/i.test(rest),
        set,
      }));
    }
    if (doors.length >= MAX_DOORS) { notes.push(`Only the first ${MAX_DOORS} doors are drawn.`); break; }
  }
  const unsized = doors.filter((d) => !d.size_known).length;
  if (unsized) notes.push(`${unsized} door${unsized === 1 ? " has" : "s have"} no size in the schedule; drawn 3'-0" x 7'-0".`);
  const missingSets = [...new Set(doors.map((d) => d.set).filter((s) => s && !sets[s]))];
  if (missingSets.length) notes.push(`No hardware listed for set${missingSets.length === 1 ? "" : "s"} ${missingSets.slice(0, 8).join(", ")}${missingSets.length > 8 ? "…" : ""}; add lines like "HW-1: closer, exit device, kick plate".`);
  return { project: String(project).slice(0, 120), source: "paste", doors, sets, notes };
}

/** The model for a SubX session, from GET /api/hardware-schedule/session/:id/doors. */
export function modelFromSubx(d) {
  const sets = {};
  for (const c of d.components || []) {
    const k = String(c.set_number || "").toUpperCase();
    if (!k) continue;
    const label = [c.description, c.manufacturer, c.model].filter(Boolean).join(" · ") || c.component_type || "item";
    (sets[k] = sets[k] || []).push({
      type: itemType([c.component_type, c.description, c.model, c.catalog_number].filter(Boolean).join(" ")),
      qty: c.quantity || 1,
      label: label.slice(0, 120),
      manufacturer: c.manufacturer || null,
      catalog: c.catalog_number || c.model || null,
      finish: c.finish || null,
    });
  }
  const doors = (d.doors || []).slice(0, MAX_DOORS).map((x) => door({
    mark: x.mark,
    location: x.notes || null,
    type: x.door_type || null,
    material: materialOf(x.door_material) || materialOf(x.door_type),
    size: x.width_inches && x.height_inches ? { w: x.width_inches, h: x.height_inches } : null,
    rating: x.fire_rating ? (ratingOf(x.fire_rating) || String(x.fire_rating)) : null,
    frame: [x.frame_material, x.frame_type].filter(Boolean).join(" ") || null,
    panic: !!x.panic && !/^(no|n|0|false)$/i.test(String(x.panic)),
    set: x.hardware_group ? String(x.hardware_group).toUpperCase() : null,
    source_page: (x.source && x.source.page) ?? x.page_number ?? null,
  }));
  const notes = [];
  const unsized = doors.filter((x) => !x.size_known).length;
  if (unsized) notes.push(`${unsized} door${unsized === 1 ? " has" : "s have"} no size read from the schedule; drawn 3'-0" x 7'-0".`);
  return { project: (d.session && (d.session.project_name || d.session.filename)) || "SubX session", source: "subx", doors, sets, notes };
}

// SubX's demo sheet A9.01 (weyland-subx-worker/src/lib/demo-building.js
// DEMO_SHEET), as printed. It gives no door sizes or ratings beyond the
// door type's words.
export const SAMPLE_SHEET = {
  project: "The WeylandAI Building (sample sheet A9.01)",
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

export function sampleModel() {
  const sets = {};
  const doors = SAMPLE_SHEET.rows.map(([mark, location, type, set, desc, parts]) => {
    if (!sets[set]) {
      const descParts = desc.split(/\s*\+\s*/);
      sets[set] = parts.split(/\s*·\s*/).map((p, i) => {
        // The part number says what it is (the description's order need not
        // match the parts column's: "closer + panic hardware" / "33A-EO · 4111").
        const byPart = itemType(p);
        const type = byPart !== "other" ? byPart : itemType(descParts[i] || desc);
        const mfr = p.match(/^(Von Duprin|LCN|Schlage|Securitron|Corbin Russwin|Sargent|Hager|Rockwood|Pemko)\b/);
        return { type, qty: 1, label: p, manufacturer: mfr ? mfr[1] : null, catalog: mfr ? p.slice(mfr[1].length).trim() : p, finish: null };
      });
      // "Lever set + hinges" names hinges the parts column doesn't list.
      if (/hinges/i.test(desc) && !sets[set].some((x) => x.type === "hinge")) sets[set].push({ type: "hinge", qty: 3, label: "Hinges (no product named on the sheet)", manufacturer: null, catalog: null, finish: null });
    }
    return door({
      mark, location, type, material: materialOf(type), size: null,
      rating: /fire-rated/i.test(type) ? "fire-rated" : null,
      panic: /panic|exit device/i.test(desc), set,
    });
  });
  return {
    project: SAMPLE_SHEET.project,
    source: "sample",
    doors,
    sets,
    notes: ["Sheet A9.01 gives no door sizes: every door is drawn 3'-0\" x 7'-0\". D-122 is fire-rated on the sheet but no rating is printed."],
  };
}
