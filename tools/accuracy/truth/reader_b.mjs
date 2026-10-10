// tools/accuracy/truth/reader_b.mjs
//
// The second schedule reader (2026-10-09; docs/direction-2026-10-08.md, "Truth at scale").
// It is built differently from the production text-layer reader
// (weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs), on purpose, so that the
// two agreeing means something:
//
//   production (reader A): text first. Lines are clustered from text positions, a header line is
//     found by its label words, columns come from where data items start (left-aligned clusters);
//     no rules are read for a door schedule on the server.
//   this reader (reader B): geometry first.
//     Door schedules: the page's ruled lines (pdf.js operator list, tools/accuracy/truth/pdf.mjs)
//     are joined into tables (connected horizontals and verticals); full-width horizontals give the
//     row bands, long verticals give the column fences, partial horizontals inside the header give
//     spanning group labels (DOOR over TYPE / MATL). Text is only dropped into the cells by its
//     centre. A page with no ruled table gives no rows: this reader never falls back to text
//     clustering for a door schedule.
//     Hardware groups (spec pages, usually unruled): column fences from the page's vertical rules
//     when it has them, else from the x-projection profile of the item lines (the white gutters
//     that run down the whole list); item lines start with a quantity; roles of the columns come
//     from their content (maker codes on the right, finish codes before them, description first).
//
// Field meanings are this file's own (its own header vocabulary and its own dimension parser);
// nothing is imported from the production reader.
//
// readDoorsB(items, rules, size) -> { tables: [{ bbox, header, fields, rows }], doors: [...] }
//   door: { mark, location, size, width_inches, height_inches, pair, door_type, frame_type,
//           material, fire_rating, hardware_group, y }
// readHardwareB(items, rules, size) -> { groups: [{ set, name, heading, doors: [], items: [...], continued }] }
//   item: { qty, uom, description, catalog, finish, manufacturer }

// ---------------------------------------------------------------- words

/** Text items split into words, each with an estimated x-extent (proportional to its characters). */
export function wordsOf(items) {
  const out = [];
  for (const it of items) {
    if (it.rot) {
      // g057 (C6): a column header turned 90 degrees ("Number", "Width", "Hardware set" printed
      // upright). One word per item, marked rot: it may name a column, never fill a body cell.
      // A -90 item reads upward from its baseline point (x, y); a +90 item downward.
      const s = clean(it.str);
      if (!s || Math.abs(Math.abs(it.rot) - 90) > 1) continue;
      const w = it.w || 0, h = it.h || 0;
      const up = it.rot < 0;
      const x0 = it.x - (up ? h : 0), x1 = x0 + h, y0 = up ? it.y - w : it.y, y1 = up ? it.y : it.y + w;
      out.push({ str: s, x0, x1, y: y1, h: Math.max(h, 1), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rot: true });
      continue;
    }
    // Control, zero-width and private-use characters (a symbol-font revision mark before a finish code) are spaces here.
    const s = it.str.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff\ue000-\uf8ff]/g, " ");
    const cw = s.length ? (it.w || 0) / s.length : 0;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(s))) {
      const x0 = it.x + m.index * cw, x1 = x0 + m[0].length * cw;
      out.push({ str: m[0], x0, x1, y: it.y, h: it.h, cx: (x0 + x1) / 2, cy: it.y - it.h * 0.35 });
    }
  }
  return out;
}

const median = (xs) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const UP = (s) => String(s == null ? "" : s).toUpperCase();
const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

/** Words in reading order joined (rows of the same baseline, then left to right). */
function joinWords(ws) {
  if (!ws.length) return "";
  const s = ws.slice().sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const rows = [];
  for (const w of s) { const r = rows[rows.length - 1]; if (r && Math.abs(w.y - r.y) <= 0.5 * Math.max(w.h, r.h)) r.ws.push(w); else rows.push({ y: w.y, h: w.h, ws: [w] }); }
  return rows.map((r) => r.ws.sort((a, b) => a.x0 - b.x0).map((w) => w.str).join(" ")).join(" ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- tables from rules

/** Connected groups of horizontal and vertical rules (each a candidate table). */
export function ruleTables(rules) {
  const W = rules.width, Hh = rules.height;
  // The sheet border and title-block frame would join every table on the sheet: leave out rules longer than 80% of the page.
  const H = rules.h.filter((s) => s.x1 - s.x0 < 0.8 * W);
  const V = rules.v.filter((s) => s.y1 - s.y0 < 0.8 * Hh);
  const n = H.length + V.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const t = 3;
  // Sort verticals by x for a window search.
  const vIdx = V.map((v, i) => i).sort((a, b) => V[a].x - V[b].x);
  const vx = vIdx.map((i) => V[i].x);
  const lower = (x) => { let lo = 0, hi = vx.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vx[m] < x) lo = m + 1; else hi = m; } return lo; };
  for (let i = 0; i < H.length; i++) {
    const h = H[i];
    for (let k = lower(h.x0 - t); k < vx.length && vx[k] <= h.x1 + t; k++) {
      const v = V[vIdx[k]];
      if (h.y >= v.y0 - t && h.y <= v.y1 + t) join(i, H.length + vIdx[k]);
    }
  }
  const comps = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); if (!comps.has(r)) comps.set(r, { h: [], v: [] }); if (i < H.length) comps.get(r).h.push(H[i]); else comps.get(r).v.push(V[i - H.length]); }
  const out = [];
  for (const c of comps.values()) {
    const ys = distinct(c.h.map((s) => s.y), 1.0), xs = distinct(c.v.map((s) => s.x), 1.0);
    if (ys.length < 4 || xs.length < 4) continue;
    const x0 = Math.min(...c.h.map((s) => s.x0), ...c.v.map((s) => s.x)), x1 = Math.max(...c.h.map((s) => s.x1), ...c.v.map((s) => s.x));
    const y0 = Math.min(...c.v.map((s) => s.y0), ...c.h.map((s) => s.y)), y1 = Math.max(...c.v.map((s) => s.y1), ...c.h.map((s) => s.y));
    out.push({ x0, x1, y0, y1, h: c.h, v: c.v });
  }
  return out;
}
function distinct(vals, tol) {
  const s = vals.slice().sort((a, b) => a - b);
  const out = [];
  for (const v of s) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
  return out;
}

// ---------------------------------------------------------------- header vocabulary (this reader's own)

function fieldOf(label, taken) {
  const t = " " + UP(label).replace(/[^A-Z0-9#\/ ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  const has = (re) => re.test(t);
  const want = (f) => (taken.has(f) ? null : f);
  if (!t.trim()) return null;
  if (has(/ (QTY|QUANTITY|QUAN) /) && !has(/ (LEAF|LEAVES|HINGE|HINGES|PANEL|PANELS) /)) return want("quantity");
  if (has(/ (HARDWARE|HDWR|HDW|HW|H\/W) /) || has(/ (SET|GROUP|GRP) /)) return want("hardware_group");
  if (has(/ (FIRE|RATING|RATED|LABEL) /)) return want("fire_rating");
  if (has(/ (WIDTH|WD) /) && !has(/ (HEIGHT|HT) /)) return want("width");
  if (has(/ (HEIGHT|HT|HGT) /) && !has(/ (WIDTH|WD) /)) return want("height");
  if (has(/ (THICKNESS|THICK|THK) /) && !has(/ (TYPE|SIZE)/)) return want("thickness");
  if (has(/ SIZE /)) return want("size");
  if (/^ W $/.test(t)) return want("width");
  if (/^ H $/.test(t)) return want("height");
  if (has(/ (ROOM|LOCATION|SPACE) /) || (has(/ FROM /) && has(/ TO /))) return want("location");
  if (has(/ (FRAME|FR|FRM) /) && has(/ TYPE /)) return want("frame_type");
  if (has(/ (FRAME|FR|FRM) /) && has(/ (MATERIAL|MATL|MAT) /)) return want("frame_material");
  if (has(/ TYPE /) && !has(/ (FRAME|FR|FRM|GLASS|GLAZING|GL|LOUVER|HINGE) /)) return want("door_type");
  if (has(/ (MATERIAL|MATL|MAT) /) && !has(/ (FRAME|FR|FRM) /)) return want("material");
  if (has(/ (MARK|TAG) /) || (has(/ (NUMBER|NO|NUM|#|OPENING|ID) /) && !has(/ (DETAIL|SHEET|KEY|STC|NOTE) /))) return want("mark");
  return null;
}

const MARK_RE = /^[A-Z]{0,3}-?\d[A-Z0-9]{0,5}(?:[.\-][A-Z0-9]{1,4}){0,3}$/;
export function markLike(s) { const t = UP(s).replace(/\s+/g, ""); return t.length >= 1 && t.length <= 10 && /\d/.test(t) && MARK_RE.test(t); }

// ---------------------------------------------------------------- dimensions (this reader's own)

/** One printed dimension -> inches: 3'-0", 3' 0", 3'0, 3-0, 36", 1 3/4", 1-3/4", 7'-10 1/2". */
export function inchesOf(text) {
  let t = clean(text).replace(/[″”“]/g, '"').replace(/[′’‘]/g, "'").toUpperCase();
  if (!t) return null;
  const frac = (s) => { if (!s) return 0; const m = s.match(/^(\d+)\/(\d+)$/); return m && +m[2] ? +m[1] / +m[2] : 0; };
  let m = t.match(/^(\d{1,2})\s*'\s*-?\s*(\d{1,2})?(?:\s*-?\s*(\d+\/\d+))?\s*"?$/);
  if (m) return +m[1] * 12 + (m[2] ? +m[2] : 0) + frac(m[3]);
  m = t.match(/^(\d{1,2})-(\d{1,2})$/); // 3-0 = 3'-0"
  if (m && +m[2] < 12) return +m[1] * 12 + +m[2];
  m = t.match(/^(\d{1,3})(?:\s*[- ]\s*(\d+\/\d+))?\s*"$/);
  if (m) return +m[1] + frac(m[2]);
  m = t.match(/^(\d{2,3})$/); // a bare 36 or 84
  if (m) return +m[1];
  return null;
}
/** A size cell: [PR|(2)] W x H [x T]. */
export function sizeOf(text) {
  let t = clean(text).toUpperCase();
  const out = { pair: false, width_inches: null, height_inches: null };
  if (!t) return out;
  if (/^(PR\.?|PAIR|\(2\)|2\s*@|2\s*-)\s*/.test(t)) { out.pair = true; t = t.replace(/^(PR\.?|PAIR|\(2\)|2\s*@|2\s*-)\s*/, ""); }
  const parts = t.split(/\s*[X×]\s*/);
  if (parts.length >= 2) { out.width_inches = inchesOf(parts[0]); out.height_inches = inchesOf(parts[1]); }
  return out;
}

// ---------------------------------------------------------------- door schedule

/**
 * Tables whose row rules share one x-extent: on a CAD sheet a schedule's rules can touch the sheet's
 * frame or a neighbouring drawing, which joins its connected group to half the sheet; its own row
 * rules still start and end at the same two x positions.
 */
export function extentTables(rules) {
  const groups = new Map();
  for (const s of rules.h) {
    if (s.x1 - s.x0 < 60) continue;
    const k = Math.round(s.x0 / 2) + ":" + Math.round(s.x1 / 2);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  const out = [];
  for (const list of groups.values()) {
    const ys = distinct(list.map((s) => s.y), 1.0);
    if (ys.length < 4) continue;
    const gaps = ys.slice(1).map((y, i) => y - ys[i]);
    const med = median(gaps);
    // Split where the rules stop for longer than a few rows (another table with the same width).
    let run = [ys[0]];
    const runs = [];
    for (let i = 1; i < ys.length; i++) { if (ys[i] - ys[i - 1] > Math.max(4 * med, 60)) { runs.push(run); run = []; } run.push(ys[i]); }
    runs.push(run);
    const x0 = Math.min(...list.map((s) => s.x0)), x1 = Math.max(...list.map((s) => s.x1));
    for (const r of runs) {
      if (r.length < 4) continue;
      let y0 = r[0];
      const y1 = r[r.length - 1];
      // g057 (C6): the header's top rule may run on past the table (the sheet's schedules share it),
      // so it is in no group of its own: the table starts at the nearest rule above that spans it,
      // within four rows.
      const runMed = median(r.slice(1).map((y, i) => y - r[i])) || med;
      let above = null;
      for (const s of rules.h) if (s.y < y0 - 1 && s.y >= y0 - Math.max(4 * runMed, 40) && s.x0 <= x0 + 2 && s.x1 >= x1 - 2 && (!above || s.y > above)) above = s.y;
      if (above != null) y0 = above;
      const h = rules.h.filter((s) => s.y >= y0 - 1 && s.y <= y1 + 1 && s.x1 > x0 + 1 && s.x0 < x1 - 1).map((s) => ({ y: s.y, x0: Math.max(s.x0, x0), x1: Math.min(s.x1, x1) }));
      const v = rules.v.filter((s) => s.x >= x0 - 1.5 && s.x <= x1 + 1.5 && s.y1 > y0 + 1 && s.y0 < y1 - 1).map((s) => ({ x: s.x, y0: Math.max(s.y0, y0), y1: Math.min(s.y1, y1) }));
      if (distinct(v.map((s) => s.x), 3).length < 4) continue;
      out.push({ x0, x1, y0, y1, h, v, by: "extent" });
    }
  }
  return out;
}

export function readDoorsB(items, rules, size) {
  const words = wordsOf(items);
  const found = [];
  if (!rules || !rules.h || !rules.v) return { tables: [], doors: [] };
  for (const T of [...ruleTables(rules), ...extentTables(rules)]) {
    const t = tableFrom(T, words);
    if (t) found.push({ T, t });
  }
  // The same table found both ways (or nested): keep the reading with more rows.
  const area = (T) => Math.max(1, (T.x1 - T.x0) * (T.y1 - T.y0));
  const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  // A nested fragment can contain every mark but omit right-hand columns.
  // On equal row counts prefer the explicitly mapped header with more fields,
  // then area; the shared-top-rule recovery must not discard fire/hardware.
  const mappedFields = t => t.fields.filter(Boolean).length;
  found.sort((a, b) => b.t.doors.length - a.t.doors.length || mappedFields(b.t) - mappedFields(a.t) || area(a.T) - area(b.T));
  const keep = [];
  for (const f of found) if (!keep.some((k) => overlap(k.T, f.T) > 0.5 * Math.min(area(k.T), area(f.T)))) keep.push(f);
  const tables = [], doors = [];
  for (const { T, t } of keep.sort((a, b) => a.T.y0 - b.T.y0 || a.T.x0 - b.T.x0)) {
    tables.push({ bbox: [T.x0, T.y0, T.x1, T.y1].map((v) => Math.round(v)), header: t.header, fields: t.fields, rows: t.doors.length, found_by: T.by || "connected rules" });
    doors.push(...t.doors);
  }
  return { tables, doors };
}

// g051 (class C5): an electrical panel schedule is ruled like a door schedule and its headers map to
// door fields ("# of Poles" a mark, "Frame Size" a size, "Trip Rating" a rating). Its own words:
const PANEL_WORDS = ["CKT", "CIRCUIT", "POLES?", "BREAKERS?", "TRIP", "KVA", "AMPS?", "MCB", "MLO", "PANELBOARDS?", "MAINS", "FEEDERS?", "VOLTS?", "VOLTAGE", "PHASE", "NEMA", "LOAD"];
const panelWordCount = (text) => { const t = " " + UP(text).replace(/[^A-Z0-9#]+/g, " ") + " "; return PANEL_WORDS.filter((w) => new RegExp(" " + w + " ").test(t)).length; };
/** A table header that is an electrical panel's (two or more of its words), not a door schedule's. */
export function panelHeader(labels) { return panelWordCount((labels || []).join(" ")) >= 2; }
/** A page that is an electrical panel schedule sheet: four or more panel words and no door or opening
 *  schedule title on it (the page finder skips it). */
export function electricalPanelPage(text) {
  const t = UP(text).replace(/\s+/g, " ");
  return panelWordCount(t) >= 4 && !/\b(DOOR|OPENING|DOOR AND FRAME|DOOR & FRAME)\s+(HARDWARE\s+)?SCHEDULE\b/.test(t);
}

function tableFrom(T, allWords) {
  const width = T.x1 - T.x0, height = T.y1 - T.y0;
  const ws = allWords.filter((w) => w.cx >= T.x0 - 1 && w.cx <= T.x1 + 1 && w.cy >= T.y0 - 1 && w.cy <= T.y1 + 1);
  if (ws.length < 10) return null;
  // Row boundaries: horizontals across most of the table.
  // A row rule may be broken where a blank column has none: the rules at one height together must cover half the table.
  const full = [];
  for (const y of distinct(T.h.map((s) => s.y), 1.0)) {
    const segs = T.h.filter((s) => Math.abs(s.y - y) <= 1.0).sort((a, b) => a.x0 - b.x0);
    let cover = 0, end = -Infinity;
    for (const s of segs) { const a = Math.max(s.x0, end); if (s.x1 > a) cover += s.x1 - a; end = Math.max(end, s.x1); }
    if (cover >= 0.5 * width) full.push(y);
  }
  if (full.length < 3) return null;
  // Column fences: verticals long enough to run through the body (not a header-only divider).
  const longV = T.v.filter((s) => s.y1 - s.y0 >= 0.3 * height);
  let fences = distinct(longV.map((s) => s.x), 3);
  if (fences.length < 4) return null;
  const bands = [];
  for (let i = 1; i < full.length; i++) bands.push({ y0: full[i - 1], y1: full[i] });
  const colCount = fences.length - 1;
  const colOf = (x) => { for (let k = 0; k < colCount; k++) if (x >= fences[k] && x < fences[k + 1]) return k; return -1; };
  const bandWords = bands.map((b) => ws.filter((w) => w.cy > b.y0 && w.cy < b.y1));
  const cellsOf = (bi) => { const c = Array.from({ length: colCount }, () => []); for (const w of bandWords[bi]) { if (w.rot) continue; const k = colOf(w.cx); if (k >= 0) c[k].push(w); } return c; };
  // A band crossed by fewer than two inner fences is a title band. Any vertical rule at a fence counts,
  // not only the long ones: a header's dividers are often separate short rules (or thin filled bars a
  // point off the body's stroked lines), and the long body rules start below the header.
  const crossed = (b) => fences.filter((x) => T.v.some((s) => Math.abs(s.x - x) <= 1.5 && s.y0 <= b.y0 + 1 && s.y1 >= b.y1 - 1)).length;
  // Header text per column for the first k bands. A header word's own cell runs between the nearest
  // rules (long or short) crossing it on either side; a spanning label (DOOR over TYPE / MATL) has no
  // rule between its sub-columns at its height, so it names every column whose middle its cell covers.
  const cellSpan = (w) => {
    let left = T.x0, right = T.x1;
    for (const s of T.v) if (s.y0 <= w.cy && s.y1 >= w.cy) { if (s.x <= w.cx && s.x > left) left = s.x; if (s.x > w.cx && s.x < right) right = s.x; }
    return [left, right];
  };
  const headerFor = (k) => {
    const names = Array.from({ length: colCount }, () => []);
    for (let bi = 0; bi < k; bi++) {
      if (crossed(bands[bi]) < 3) continue;
      for (const w of bandWords[bi]) {
        const [l, r] = cellSpan(w);
        for (let c = 0; c < colCount; c++) { const mid = (fences[c] + fences[c + 1]) / 2; if (mid >= l && mid <= r) names[c].push(w); }
      }
    }
    return names.map((n) => joinWords(n));
  };
  // g060: a MARK column that holds only the letter beside a ROOM column with the number (T2507-01
  // A-103: ROOM 100 | NAME | MARK A) prints the mark in two cells; the opening's mark is "100A".
  const withRoomMark = (cells, fields) => {
    const mk = fields.indexOf("mark"), loc = fields.indexOf("location");
    if (mk < 0 || loc < 0) return cells;
    const letter = clean(joinWords(cells[mk])), room = clean(joinWords(cells[loc])).split(" ")[0];
    if (!/^[A-Z]{1,2}$/.test(UP(letter)) || !/^\d{1,4}$/.test(room)) return cells;
    const out = cells.slice();
    out[mk] = [{ ...cells[mk][0], str: room + UP(letter) }];
    return out;
  };
  let pick = null;
  for (let k = 1; k <= Math.min(5, bands.length - 1); k++) {
    const header = headerFor(k);
    const taken = new Set();
    const fields = header.map((h) => { const f = fieldOf(h, taken); if (f) taken.add(f); return f; });
    const mk = fields.indexOf("mark");
    if (mk < 0) continue;
    const enough = fields.filter(Boolean).length >= 3 && (taken.has("width") || taken.has("size") || taken.has("height")) && (taken.has("hardware_group") || taken.has("door_type") || taken.has("fire_rating"));
    if (!enough) continue;
    // The first body band must hold a mark (a section label band may sit between: look at the next three).
    let ok = false;
    for (let b = k; b < Math.min(bands.length, k + 3); b++) { const c = withRoomMark(cellsOf(b), fields)[mk]; const txt = joinWords(c); if (txt && markLike(txt.split(" ")[0])) { ok = true; break; } }
    if (ok) { pick = { k, header, fields }; break; }
  }
  if (process.env.TRUTH_DEBUG) console.error("table", Math.round(T.x0), Math.round(T.y0), "bands", bands.length, "fences", fences.map(Math.round).join(","), "hdr", JSON.stringify(headerFor(Math.min(3, bands.length - 1))));
  if (!pick) return null;
  if (panelHeader(pick.header)) return null;
  const { k, header, fields } = pick;
  const mk = fields.indexOf("mark");
  const get = (cells, f) => { const i = fields.indexOf(f); return i >= 0 ? clean(joinWords(cells[i])) : null; };
  const rows = [];
  for (let bi = k; bi < bands.length; bi++) {
    const cells = withRoomMark(cellsOf(bi), fields);
    const markWords = cells[mk];
    // Rows inside one band (a body ruled in columns only): each mark-like word in the mark column starts a row.
    // A row that stands for several openings (a QUANTITY column) prints a range or a stack of marks
    // in its one band ("1A101 TO / 1D102", "151A 151B / 151C"): one quantity, one row.
    const qi = fields.indexOf("quantity");
    if (qi >= 0 && /^\d{1,4}$/.test(clean(joinWords(cells[qi])))) {
      const txt = clean(joinWords(markWords));
      if (txt && markLike(txt.split(" ")[0])) { rows.push({ cells, y: bands[bi].y0 }); continue; }
    }
    const starts = markWords.filter((w) => markLike(w.str)).sort((a, b) => a.y - b.y);
    const lineStarts = [];
    for (const w of starts) if (!lineStarts.length || w.y - lineStarts[lineStarts.length - 1].y > 0.6 * w.h) lineStarts.push(w);
    if (lineStarts.length <= 1) {
      const txt = clean(joinWords(markWords));
      if (txt && markLike(txt.split(" ")[0])) rows.push({ cells, y: bands[bi].y0 });
      else if (!txt && rows.length && cells.some((c) => c.length)) { const prev = rows[rows.length - 1]; prev.cells = prev.cells.map((c, i) => c.concat(cells[i])); }
      continue;
    }
    for (let r = 0; r < lineStarts.length; r++) {
      const top = lineStarts[r].y - lineStarts[r].h * 1.1, bottom = r + 1 < lineStarts.length ? lineStarts[r + 1].y - lineStarts[r + 1].h * 1.1 : Infinity;
      rows.push({ cells: cells.map((c) => c.filter((w) => w.y > top && w.y <= bottom)), y: lineStarts[r].y });
    }
  }
  const doors = [];
  for (const r of rows) {
    const markText = clean(joinWords(r.cells[mk]));
    const mark = markText.split(" ")[0];
    if (!markLike(mark)) continue;
    let sz = { pair: false, width_inches: null, height_inches: null };
    const sizeTxt = get(r.cells, "size");
    if (sizeTxt) sz = sizeOf(sizeTxt);
    const wTxt = get(r.cells, "width"), hTxt = get(r.cells, "height");
    if (wTxt) {
      const PR = /^(\(2\)|PR\.?|PAIR)\s*/i;
      if (PR.test(wTxt)) sz.pair = true;
      sz.width_inches = sz.width_inches ?? inchesOf(wTxt.replace(PR, ""));
    }
    if (hTxt) sz.height_inches = sz.height_inches ?? inchesOf(hTxt);
    doors.push({
      mark: UP(mark),
      location: get(r.cells, "location") || null,
      size: sizeTxt || [wTxt, hTxt].filter(Boolean).join(" x ") || null,
      width_inches: sz.width_inches, height_inches: sz.height_inches, pair: !!sz.pair,
      door_type: get(r.cells, "door_type") || null,
      frame_type: get(r.cells, "frame_type") || null,
      material: get(r.cells, "material") || null,
      fire_rating: get(r.cells, "fire_rating") || null,
      hardware_group: get(r.cells, "hardware_group") || null,
      y: Math.round(r.y),
      ...(fields.includes("quantity") ? { quantity: /^\d{1,4}$/.test(get(r.cells, "quantity") || "") ? +get(r.cells, "quantity") : null } : {}),
      ...markListOf(markText),
    });
  }
  if (!doors.length) return null;
  return { header, fields, doors };
}

/** Every mark a multi-opening mark cell prints, this reader's own way: tokens that are marks, a
 *  "TO" between two making a range, and a short prefix printed apart from its number joined
 *  ("3A 112"). {} for a cell with one mark. */
function markListOf(text) {
  const toks = UP(text).replace(/[,;&]/g, " ").split(/\s+/).filter(Boolean);
  const marks = [], ranges = [];
  for (let i = 0; i < toks.length; i++) {
    let t = toks[i];
    if (/^\d[A-Z]$/.test(t) && /^\d{2,4}$/.test(toks[i + 1] || "")) { t += toks[i + 1]; i++; }
    if (t === "AND") continue;
    if (/^(TO|THRU)$/.test(t) && marks.length && i + 1 < toks.length) {
      let e = toks[i + 1]; i++;
      if (/^\d[A-Z]$/.test(e) && /^\d{2,4}$/.test(toks[i + 1] || "")) { e += toks[i + 1]; i++; }
      if (!markLike(e)) return {};
      ranges.push({ from: marks[marks.length - 1], to: e }); marks.push(e); continue;
    }
    if (!markLike(t)) return {};
    marks.push(t);
  }
  return marks.length > 1 ? { marks, mark_ranges: ranges } : {};
}

// ---------------------------------------------------------------- hardware groups

const HEADING_RE = /^(?:HARDWARE\s+(?:GROUP|SET|HEADING)|HDWE?\.?\s*(?:GROUP|SET)|HW\s*(?:GROUP|SET)|GROUP|SET|HEADING)\s*(?:NO\.?|NUMBER|#)?\s*[:.#]?\s*([A-Z]{0,2}\d{1,3}[A-Z]{0,2}(?:\.\d+)?)\b\s*[-–:.]?\s*(.*)$/i;
const DOORLIST_RE = /^(?:DOORS?|DOOR\s*(?:NOS?\.?|NUMBERS?|#)|OPENINGS?)\s*[:#.]?\s*(.*)$/i;
const UOM_RE = /^(EA|EA\.|EACH|PR|PAIR|PRS|SET|SETS|LF|L\.F\.|FT|LOT|SF)$/i;
const MAKER_RE = /^(?:[A-Z]{2,4}|B\/O|BY\s*OTHERS|N\/A|[A-Z]{2,3}\/[A-Z]{2,3})$/;
const FINISH_RE = /^(?:US\s?\d{1,2}[A-Z]?|\d{3}[A-Z]?|[A-Z]{1,3}\d{0,3}|\d{1,2}[A-Z]{1,3}|N\/A|-+)$/;

// The catalog cell: its first-line text, then words spilled from the finish cell (same line), then the wrapped lines.
function spillInto(first, cont, spill) {
  return clean([first.filter(Boolean).join(" "), spill, cont.filter(Boolean).join(" ")].join(" "));
}

function linesOf(words) {
  const s = words.slice().sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const rows = [];
  for (const w of s) { const r = rows[rows.length - 1]; if (r && Math.abs(w.y - r.y) <= 0.45 * Math.max(w.h, r.h)) { r.ws.push(w); } else rows.push({ y: w.y, h: w.h, ws: [w] }); }
  for (const r of rows) { r.ws.sort((a, b) => a.x0 - b.x0); r.text = r.ws.map((w) => w.str).join(" "); r.x0 = r.ws[0].x0; }
  return rows;
}

// A sentence, not a table line: it ends like one, or most of its words start in lower case.
function prose(L) {
  const t = L.text.trim();
  return /[.:;]$/.test(t) || L.ws.filter((w) => /^[a-z]/.test(w.str)).length >= 0.4 * L.ws.length;
}

function doorTokens(s) {
  // A section footer (08 71 00 - 8) is not a door list.
  if (/^\s*\d{2}\s+\d{2}\s+\d{2}\b/.test(s)) return null;
  const toks = String(s).split(/[\s,;]+/).map((x) => x.replace(/[()]/g, "")).filter(Boolean);
  const marks = toks.filter((x) => markLike(x));
  return marks.length && marks.length >= 0.6 * toks.length ? marks.map(UP) : null;
}

/** Words crossed through the middle of their letters by a ruled bar (an addendum's strike-through). */
export function struckWords(words, rules) {
  if (!rules || !rules.h || !rules.h.length) return new Set();
  const hs = rules.h.slice().sort((a, b) => a.y - b.y);
  const out = new Set();
  for (const w of words) {
    const top = w.y - 0.75 * w.h, bottom = w.y - 0.2 * w.h;
    let cover = 0;
    for (const b of hs) { if (b.y < top) continue; if (b.y > bottom) break; cover += Math.max(0, Math.min(w.x1, b.x1) - Math.max(w.x0, b.x0)); }
    if (cover >= 0.6 * (w.x1 - w.x0)) out.add(w);
  }
  return out;
}

export function readHardwareB(items, rules, size) {
  const all = wordsOf(items);
  const struck = struckWords(all, rules);
  const words = all.filter((w) => !struck.has(w));
  const lines = linesOf(words);
  const em = median(lines.map((l) => l.h)) || 10;
  const groups = [];
  let cur = null;
  const open = (set, name, heading, continued = false) => { cur = { set, name: clean(name) || null, heading, doors: [], items: [], continued, _rows: [] }; groups.push(cur); };
  const itemRows = [];
  // Where most item lines carry a unit (EA, PR, SET), a numbered line without one is a note, not an item.
  const cand = lines.filter((L) => /^\(?\d{1,3}\)?$/.test(L.ws[0].str) && L.ws.length >= 3);
  const unitShare = cand.length ? cand.filter((L) => UOM_RE.test(L.ws[1].str)).length / cand.length : 0;
  const needUnit = cand.length >= 3 && unitShare >= 0.6;
  for (const L of lines) {
    const text = L.text.trim();
    const hm = text.length < 120 ? text.match(HEADING_RE) : null;
    if (hm && !/^\d/.test(text)) { open(UP(hm[1]), hm[2], text); continue; }
    if (/^END OF SECTION/i.test(text)) { cur = null; continue; }
    const q = L.ws[0].str.match(/^\(?(\d{1,3})\)?$/);
    const isItem = q && L.ws.length >= 3 && (UOM_RE.test(L.ws[1].str) || (!needUnit && /^[A-Z][A-Za-z]{2,}/.test(L.ws[1].str) && !prose(L))) && !/^\d+\.\d/.test(L.ws[0].str);
    if (isItem) {
      if (!cur) open("(continued)", null, null, true);
      const row = { L, qty: +q[1], uom: UOM_RE.test(L.ws[1].str) ? UP(L.ws[1].str).replace(/\.$/, "") : null, rest: L.ws.slice(UOM_RE.test(L.ws[1].str) ? 2 : 1), cont: [] };
      cur._rows.push(row); itemRows.push(row);
      continue;
    }
    if (!cur) continue;
    const dm = text.match(DOORLIST_RE);
    if (dm && cur._rows.length === 0 && doorTokens(dm[1])) { cur.doors.push(...doorTokens(dm[1])); continue; }
    if (cur._rows.length === 0 && doorTokens(text) && L.ws.length <= 30) { cur.doors.push(...doorTokens(text)); continue; }
    // A continuation: a line close under the last item, not starting at the page's left text margin of prose.
    const last = cur._rows[cur._rows.length - 1];
    if (last) {
      const prevY = last.cont.length ? last.cont[last.cont.length - 1].y : last.L.y;
      if (L.y - prevY <= 1.8 * em && L.x0 > last.L.ws[0].x1) last.cont.push(L);
    }
  }
  // Column fences for the item text after quantity and unit: vertical rules if the page has them, else the white gutters.
  const restWords = itemRows.flatMap((r) => r.rest);
  let fences = null;
  if (restWords.length) {
    const xmin = Math.min(...restWords.map((w) => w.x0)), xmax = Math.max(...restWords.map((w) => w.x1));
    const ruleXs = rules && rules.v ? distinct(rules.v.filter((v) => v.x > xmin + 2 && v.x < xmax - 2 && itemRows.filter((r) => r.L.y >= v.y0 - 2 && r.L.y <= v.y1 + 2).length >= 1).map((v) => v.x), 1.5) : [];
    if (ruleXs.length >= 2) fences = ruleXs;
    else {
      const bins = new Array(Math.ceil(xmax - xmin) + 2).fill(0);
      for (const r of itemRows) {
        const seen = new Uint8Array(bins.length);
        for (const w of r.rest) for (let x = Math.floor(w.x0 - xmin); x <= Math.ceil(w.x1 - xmin); x++) if (x >= 0 && x < bins.length) seen[x] = 1;
        for (let x = 0; x < bins.length; x++) bins[x] += seen[x];
      }
      const n = itemRows.length;
      // A gutter may be crossed by an odd long line (a note that starts with a number): allow one in ten.
      const allow = n >= 5 ? Math.max(1, Math.floor(0.1 * n)) : 0;
      fences = [];
      let run = null;
      for (let x = 0; x < bins.length; x++) {
        if (bins[x] <= allow) { if (run == null) run = x; }
        else { if (run != null && x - run >= Math.max(4, 0.5 * em)) fences.push(xmin + (run + x) / 2); run = null; }
      }
    }
  }
  if (!fences) fences = [];
  // A column that few item rows use (a note line's stray start, a lone overhang) is not a column:
  // its fence goes and its words join the column to its right (the last one joins the left).
  for (let changed = true; changed && fences.length;) {
    changed = false;
    const counts = new Array(fences.length + 1).fill(0);
    for (const r of itemRows) { const seen = new Set(); for (const w of r.rest) { let k = 0; while (k < fences.length && w.cx >= fences[k]) k++; seen.add(k); } for (const k of seen) counts[k]++; }
    const need = Math.max(1, 0.2 * itemRows.length);
    const sparse = counts.findIndex((c) => c > 0 && c < need);
    if (sparse >= 0) { fences.splice(sparse < fences.length ? sparse : sparse - 1, 1); changed = true; }
  }
  const colOf = (w) => { let k = 0; while (k < fences.length && w.cx >= fences[k]) k++; return k; };
  const ncol = (fences ? fences.length : 0) + 1;
  // Roles by content over all item rows.
  const colTexts = Array.from({ length: ncol }, () => []);
  for (const r of itemRows) { const c = Array.from({ length: ncol }, () => []); for (const w of r.rest) c[colOf(w)].push(w); r.cols = c.map((x) => joinWords(x)); r.cols.forEach((t, i) => t && colTexts[i].push(t)); }
  const share = (i, re) => colTexts[i].length ? colTexts[i].filter((t) => re.test(t)).length / colTexts[i].length : 0;
  const used = colTexts.map((t) => t.length > 0);
  const live = colTexts.map((_, i) => i).filter((i) => used[i]);
  let mfrCol = -1, finCol = -1;
  if (live.length >= 3 && share(live[live.length - 1], MAKER_RE) >= 0.6) mfrCol = live[live.length - 1];
  const beforeMfr = mfrCol >= 0 ? live.slice(0, live.indexOf(mfrCol)) : live;
  if (beforeMfr.length >= 3 && share(beforeMfr[beforeMfr.length - 1], FINISH_RE) >= 0.6) finCol = beforeMfr[beforeMfr.length - 1];
  if (process.env.TRUTH_DEBUG) console.error("hw cols", JSON.stringify(colTexts.map((t) => t.slice(0, 6))), "mfr", mfrCol, "fin", finCol);
  const textCols = live.filter((i) => i !== mfrCol && i !== finCol);
  const descCol = textCols[0];
  const catCols = textCols.slice(1);
  for (const g of groups) {
    for (const r of g._rows) {
      const contCols = Array.from({ length: ncol }, () => []);
      // A wrapped cell is a description or a catalog number: finish and maker cells do not wrap.
      for (const L of r.cont) for (const w of L.ws) { let c = colOf(w); if (c === finCol || c === mfrCol) c = catCols.length ? catCols[catCols.length - 1] : descCol; if (c != null && c >= 0) contCols[c].push(w); }
      const add = (i) => clean([r.cols[i] || "", joinWords(contCols[i])].join(" "));
      let finish = finCol >= 0 ? clean(r.cols[finCol]) : null;
      // A finish is one code: words before it in its cell ran over from the catalog cell.
      let spill = "";
      if (finish && finish.includes(" ")) { const parts = finish.split(" "); finish = parts.pop(); spill = parts.join(" "); }
      let manufacturer = mfrCol >= 0 ? clean(r.cols[mfrCol]) : null;
      g.items.push({
        qty: r.qty, uom: r.uom,
        description: descCol != null ? add(descCol) : null,
        catalog: spillInto(catCols.map((i) => r.cols[i] || ""), catCols.map((i) => joinWords(contCols[i])), spill) || null,
        finish: finish || null, manufacturer: manufacturer || null,
      });
    }
    delete g._rows;
  }
  return { groups: groups.filter((g) => g.items.length || g.doors.length), fences: fences ? fences.map((x) => Math.round(x)) : null };
}
