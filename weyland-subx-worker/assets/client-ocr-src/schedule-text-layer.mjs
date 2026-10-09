// schedule-text-layer.mjs
//
// Reads door schedules and hardware groups from a PDF's own text layer
// (2026-10-08), before any OCR is tried. A full-size CAD sheet (Rockford A2.2,
// Berryessa A9.2) carries every schedule cell as positioned text, and a spec
// section's hardware groups (Section 08 71 00) are unruled text that no grid
// detector can see. The 7 October audits read 0 rows from both; this module
// reads them from the text.
//
// Pure functions over pdf.js text items: nothing here touches the DOM at
// import time, so the same file runs in the visitor's tab, in the Browser
// Rendering runner (grid-runner.html) and in Node (test/schedule-text-layer
// .test.mjs reads the corpus PDFs with pdfjs-dist). Rendering is optional and
// injected: when the caller can render the table region, horizontal and
// vertical rules refine the rows and columns; without it the text alone
// decides (left-aligned cell starts, header cells, baselines).
//
// Shapes returned match the OCR readers in schedule-grid-extraction-client.mjs
// ({doors:[...]} and {hardware_groups:[...], door_hardware_matrix:[...]}), so
// the server persists both the same way (writeDoorScheduleEntries,
// savePageExtraction2).

import { hardwareSpecSections } from "./schedule-workspace.mjs?v=20261009g018";

// ---------------------------------------------------------------- geometry

/**
 * pdf.js text items -> words in device space (page rotation applied).
 * toDevice(itemTransform) -> [a, b, c, d, e, f] (pdfjsLib.Util.transform(viewport.transform, t)).
 * A word carries the x-range of its characters (proportional inside a
 * multi-word item), its baseline y and its height; a text item that merged two
 * neighbouring cells ("EXIST. (DK STAIN) No") still splits into words.
 */
export function itemsToWords(items, toDevice, scale = 1) {
  const words = [];
  let itemIndex = 0;
  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const str = it.str;
    if (!str.trim()) { itemIndex++; continue; }
    const m = toDevice(it.transform);
    const a = m[0], b = m[1];
    // Horizontal, left-to-right text only: vertical sheet labels and diagonal
    // watermarks ("NOT FOR BIDDING PURPOSES") never belong to a table.
    if (!(a > 0) || Math.abs(b) > 0.2 * Math.abs(a)) { itemIndex++; continue; }
    const x = m[4], y = m[5];
    const w = (it.width || 0) * scale;
    const h = (it.height || Math.hypot(a, b)) * scale;
    const n = str.length;
    const re = /\S+/g;
    let mt;
    while ((mt = re.exec(str))) {
      const s = mt.index, e = s + mt[0].length;
      words.push({ str: mt[0], x0: x + (w * s) / n, x1: x + (w * e) / n, yb: y, h, item: itemIndex, itemX0: x, itemX1: x + w });
    }
    itemIndex++;
  }
  return words;
}

/** Words -> lines by baseline. Each line: { y, h, words (by x), x0, x1, text }. */
export function clusterLines(words) {
  const sorted = words.slice().sort((p, q) => p.yb - q.yb || p.x0 - q.x0);
  const lines = [];
  for (const w of sorted) {
    const L = lines[lines.length - 1];
    if (L && Math.abs(L.y - w.yb) <= Math.max(1.2, 0.35 * Math.max(w.h, L.h))) {
      L.words.push(w);
      L.y = (L.y * (L.words.length - 1) + w.yb) / L.words.length;
      L.h = Math.max(L.h, w.h);
    } else {
      lines.push({ y: w.yb, h: w.h, words: [w] });
    }
  }
  for (const L of lines) {
    L.words.sort((p, q) => p.x0 - q.x0);
    L.x0 = L.words[0].x0;
    L.x1 = Math.max(...L.words.map((w) => w.x1));
    L.text = L.words.map((w) => w.str).join(" ");
  }
  return lines;
}

/**
 * The text lines of one pdf.js page in device space. The page's own /Rotate is
 * applied; when most of the text still runs sideways (a sheet saved turned),
 * the rotation that makes it horizontal is used and reported.
 */
// An architect's correction typed onto the sheet as a FreeText annotation (2026-10-09: Berryessa
// A9.2 door 002's type "B" on pp.286 and 288) is not page text, so the row read with no type. Each
// one is read as a text item laid the way most of the page's text runs, centred in its box.
async function annotationItems(page, items) {
  let anns = [];
  try { anns = (await page.getAnnotations()) || []; } catch (_) { return []; }
  const free = anns.filter((a) => a && a.subtype === "FreeText" && Array.isArray(a.rect) && ((a.contentsObj && a.contentsObj.str) || a.contents));
  if (!free.length) return [];
  const counts = new Map();
  for (const it of items) {
    if (!it || !it.str || !it.str.trim() || !it.transform) continue;
    const [a, b, c, d] = it.transform, sc = Math.hypot(a, b) || 1;
    const k = [a, b, c, d].map((v) => Math.round(v / sc)).join(",");
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const [ua, ub, uc, ud] = ([...counts.entries()].sort((p, q) => q[1] - p[1])[0] || ["1,0,0,1"])[0].split(",").map(Number);
  const out = [];
  for (const a of free) {
    const str = String((a.contentsObj && a.contentsObj.str) || a.contents).replace(/\s+/g, " ").trim();
    if (!str) continue;
    const [x0, y0, x1, y1] = a.rect;
    const across = Math.abs(ua) ? Math.abs(y1 - y0) : Math.abs(x1 - x0); // the box's size across the text
    const s = Math.max(4, Math.min(across * 0.8, 14));
    const w = s * 0.62 * str.length;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // origin = centre - (run direction * w/2 + up direction * 0.35 s)
    const ox = cx - (ua * w / 2 + uc * 0.35 * s), oy = cy - (ub * w / 2 + ud * 0.35 * s);
    out.push({ str, transform: [ua * s, ub * s, uc * s, ud * s, ox, oy], width: w, height: s, annotation: true });
  }
  return out;
}

export async function pageTextLines(pdfjsLib, page, opts = {}) {
  const content = await page.getTextContent();
  const items = (content.items || []).concat(await annotationItems(page, content.items || []));
  let best = null;
  for (const rotation of opts.rotations || [0, 90, 270, 180]) {
    const viewport = page.getViewport({ scale: 1, rotation: ((page.rotate || 0) + rotation) % 360 });
    const toDevice = (t) => pdfjsLib.Util.transform(viewport.transform, t);
    const words = itemsToWords(items, toDevice);
    const score = words.reduce((n, w) => n + w.str.length, 0);
    if (!best || score > best.score * 1.5) best = { rotation, viewport, words, score };
    if (rotation === 0 && score > 0 && items.length && score >= 0.6 * items.reduce((n, it) => n + (it.str ? it.str.length : 0), 0)) break;
  }
  const lines = clusterLines(best.words);
  return { lines, width: best.viewport.width, height: best.viewport.height, rotation: best.rotation, item_count: items.length, word_count: best.words.length };
}

// ---------------------------------------------------------------- shared text helpers

const UP = (s) => String(s == null ? "" : s).toUpperCase();
const normLabel = (s) => UP(s).replace(/[^A-Z0-9#\/]+/g, " ").replace(/\s+/g, " ").trim();
const em = (lines) => {
  const hs = lines.map((L) => L.h).filter((h) => h > 0).sort((a, b) => a - b);
  return hs.length ? hs[Math.floor(hs.length / 2)] : 10;
};
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// A door mark: a short code with a digit (053, 131, 144A, 1J.1, 126.1.2, B12).
export function looksLikeMark(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 12 || /\s/.test(t) || /^\d+\.$/.test(t)) return false;
  if (!/\d/.test(t)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9.\-\/]*$/.test(t) && !/^\d+'/.test(t) && !/"/.test(t);
}

// Door-schedule header vocabulary, tested on a column's header text.
const HEADER_LABEL_WORDS = /\b(MARK|TAG|NUMBER|NUM|NO|ID|OPENING|WIDTH|WDTH|HEIGHT|HGT|HT|SIZE|THICKNESS|THICK|THK|TYPE|MATERIAL|MATL|MAT|FINISH|FIN|FIRE|RATING|RATED|LABEL|HARDWARE|HDW|HDWR|HW|SET|GROUP|GRP|GLAZING|GLASS|GLZ|HEAD|JAMB|SILL|THRESHOLD|THRES|THRESH|STC|PANIC|NOTES?|REMARKS?|COMMENTS?|PAIR|DETAILS?|FRAME|DOOR|PANEL|LEAF|ROOM|LOCATION|ALTERNATE|ALT|PRICING|QTY|LEAVES|UNDERCUT|LOUVER|CLOSER|LOCKSET|KEYSIDE|SWING|HAND|HANDING|ELEV|ELEVATION|W|H|T)\b/;
const GROUP_LABEL_WORDS = /^(DOOR|FRAME|PANEL|SIZE|DETAILS?|FIRE|HARDWARE|ALTERNATE|OPENING|LEAF|GLAZING|RATING)$/;

function labelHits(line) {
  // Items (not words): a header line's items are labels on their own.
  const byItem = new Map();
  for (const w of line.words) { if (!byItem.has(w.item)) byItem.set(w.item, []); byItem.get(w.item).push(w.str); }
  let hits = 0, total = 0;
  for (const parts of byItem.values()) {
    total++;
    const t = normLabel(parts.join(" "));
    if (!t) continue;
    const toks = t.split(" ");
    if (toks.length <= 4 && (HEADER_LABEL_WORDS.test(t) || GROUP_LABEL_WORDS.test(t))) hits++;
  }
  return { hits, total };
}

// The words of one baseline can come from several blocks across a sheet
// (a schedule header and, far to its left, "DOOR FRAME TYPES"): a line is
// split at gaps wider than six ems, and the group with the most labels is the
// header candidate.
function gapGroups(line, h) {
  const groups = [];
  let cur = null;
  for (const w of line.words) {
    if (cur && w.x0 - cur.x1 <= 20 * h) { cur.words.push(w); cur.x1 = Math.max(cur.x1, w.x1); }
    else { cur = { x0: w.x0, x1: w.x1, words: [w] }; groups.push(cur); }
  }
  return groups;
}
function fieldGroup(line, h) {
  let best = null;
  for (const g of gapGroups(line, h || line.h)) {
    const { hits, total } = labelHits({ words: g.words });
    if (hits >= 4 && hits >= 0.5 * total && (!best || hits > best.hits)) best = { ...g, hits, total };
  }
  return best;
}
// Words joined with a space only where the print has one (a catalog number
// drawn as two text items, "B" and "-CS", stays "B-CS").
function joinWords(words, h) {
  let out = "", lastX1 = null;
  for (const w of words) {
    if (out && (lastX1 == null || w.x0 - lastX1 >= 0.12 * h)) out += " ";
    out += w.str;
    lastX1 = w.x1;
  }
  return out;
}
function isFieldLine(line, h) {
  return !!fieldGroup(line, h);
}
export const _debug = { labelHits, fieldGroup, gapGroups, buildTable: (...a) => buildTable(...a) };
function within(line, x0, x1, margin) {
  const words = line.words.filter((w) => w.x1 >= x0 - margin && w.x0 <= x1 + margin);
  return { ...line, words, text: words.map((w) => w.str).join(" "), x0: words.length ? words[0].x0 : line.x0, x1: words.length ? Math.max(...words.map((w) => w.x1)) : line.x1 };
}

function isTitleLine(line, dataH) {
  const t = normLabel(line.text);
  return line.words.length <= 8 && /\b(SCHEDULE|LEGEND|NOTES|TYPES|ELEVATIONS)\b/.test(t) && (!dataH || line.h >= 1.25 * dataH);
}

/** Field for a header-cell text (the OCR patterns' meaning, with context words). */
export function fieldForHeader(text, used) {
  const t = normLabel(text);
  if (!t) return null;
  const has = (re) => re.test(t);
  const frameCtx = has(/\bFRAME\b/) || has(/\bFR\b/);
  const doorCtx = has(/\b(DOOR|PANEL|LEAF|DR)\b/);
  const pick = (f) => (used.has(f) ? null : f);
  if (has(/\bSTC\b/)) return pick("stc_rating");
  if (has(/\bPANIC\b/)) return pick("panic_hardware");
  if (has(/\b(ALTERNATE|ALT|PRICING|PRICE)\b/)) return pick("alternate");
  if (!has(/\b(WINDOW|CATALOG|MODEL|PRODUCT|ROOM|SET|GROUP|HARDWARE|SHEET|KEY)\b/) && (has(/\b(MARK|TAG)\b/) || has(/\b(DOOR|OPENING|DR)\s*(NO|NUMBER|NUM|#|ID)\b/) || /^(NO|NUMBER|NUM|ID|OPENING|OPENING NO|#)$/.test(t))) return pick("mark");
  if (has(/\bSIZE\b/) && !has(/\b(WIDTH|HEIGHT)\b/)) return pick("size");
  if (has(/\b(WIDTH|WDTH)\b/) || /^W$/.test(t)) return pick("width");
  if (has(/\b(HEIGHT|HGT|HT)\b/) || /^H$/.test(t)) return pick("height");
  if (has(/\b(THICKNESS|THICK|THK)\b/) || /^T$/.test(t)) return pick("thickness");
  if (has(/\b(FIRE|RATING|RATED|LABEL)\b/) && !has(/\bSTC\b/)) return pick("fire_rating");
  if (has(/\b(HARDWARE|HDW|HDWR|HW|H\/W)\b/) || has(/\b(SET|GROUP|GRP)\b/)) return pick("hardware_group");
  if (has(/\b(GLAZING|GLASS|GLZ|GL)\b/)) return pick("glazing");
  if (has(/\bHEAD\b/)) return pick("head_detail");
  if (has(/\bJAMB\b/)) return pick("jamb_detail");
  if (has(/\b(SILL|THRESHOLD|THRES|THRESH)\b/)) return pick("sill_detail");
  if (has(/\b(NOTES?|REMARKS?|COMMENTS?)\b/)) return pick("notes");
  if (has(/\b(PAIR|PR)\b/) && !has(/\bPRICE\b/)) return pick("pair");
  if (has(/\bDETAILS?\b/) && !has(/\b(TYPE|MATERIAL|MATL|MAT|FINISH|FIN|SIZE|WIDTH|HEIGHT)\b/)) return pick("details");
  if (has(/\b(ROOM|LOCATION)\b/) || (has(/\bFROM\b/) && has(/\bTO\b/))) return pick("location");
  if (has(/\b(UNDERCUT|LOUVER|SWING|HAND|HANDING|ELEV|ELEVATION|LEAVES|QTY)\b/)) return null;
  const ctxPick = (doorF, frameF) => {
    if (frameCtx && !doorCtx) return pick(frameF) || pick(doorF);
    if (doorCtx && !frameCtx) return pick(doorF) || pick(frameF);
    return pick(doorF) || pick(frameF);
  };
  if (has(/\bTYPE\b/)) return ctxPick("door_type", "frame_type");
  if (has(/\b(MATERIAL|MATL|MAT)\b/)) return ctxPick("door_material", "frame_material");
  if (has(/\b(FINISH|FIN)\b/)) return ctxPick("door_finish", "frame_finish");
  return null;
}

// ---------------------------------------------------------------- door schedule

/**
 * Finds every door-schedule table on the page: header block, title, its data
 * lines (by the header's own x-extent and the row pitch), columns and rows.
 * opts.rules(region) -> { verticals: [x...], horizontals: [y...] } (optional,
 * from a render of the region in device space).
 * Returns { tables: [...], doors: [...] } or null when no header reads as one.
 */
export async function readDoorScheduleFromLines(lines, pageSize, opts = {}) {
  const tables = [];
  const used = new Map();
  const h0 = em(lines);
  for (let i = 0; i < lines.length; i++) {
    // A baseline can hold two independent schedules. Consuming the left
    // table must not consume the right table's header on that same baseline.
    for (const group of gapGroups(lines[i], h0)) {
      const fg = fieldGroup({ ...lines[i], words: group.words }, h0);
      if (!fg || (used.get(i) || []).some((r) => fg.x0 >= r.x0 - h0 && fg.x1 <= r.x1 + h0)) continue;
      const t = await buildTable(lines, i, pageSize, opts, fg);
      if (!t) continue;
      for (const k of t.lineIndexes) { if (!used.has(k)) used.set(k, []); used.get(k).push(t); }
      if (t.is_door_schedule) tables.push(t);
    }
  }
  if (!tables.length) return null;
  const doors = [];
  for (const t of tables) for (const d of t.doors) doors.push(d);
  const sections = hardwareSpecSections(lines.map(l => l.text || (l.words || []).map(w => w.text).join(" ")).join("\n"));
  for (const d of doors) d.hardware_spec_sections = sections;
  return { tables, doors };
}

async function buildTable(lines, fieldIdx, pageSize, opts, fieldCandidate = null) {
  const fieldFull = lines[fieldIdx];
  const fg = fieldCandidate || fieldGroup(fieldFull, em(lines));
  if (!fg) return null;
  // The table's own text size: the header labels' median height (a far word
  // on the same baseline must not set it).
  const h = median(fg.words.map((w) => w.h)) || em(lines);
  // The header's x-extent is the field line's own label group; other header
  // lines contribute only the words that sit over it.
  let x0 = fg.x0, x1 = fg.x1;
  const field = within(fieldFull, x0, x1, 1.5 * h);
  // Header block: the field line and up to three label lines just above it.
  const headerIdx = [fieldIdx];
  const headerLines = [field];
  for (let k = fieldIdx - 1, prevY = field.y; k >= 0 && headerIdx.length < 4; k--) {
    // A staggered ROOM/LOCATION header may be one line above the other
    // fields and just outside their x-range (Berryessa A9.2).
    const outer = lines[k].words.filter((w) => /^(ROOM|LOCATION)$/i.test(w.str) && w.x1 < x0 && x0 - w.x1 < 12 * h && prevY - lines[k].y <= 2.8 * h);
    if (outer.length) x0 = Math.min(x0, ...outer.map((w) => w.x0));
    const L = within(lines[k], x0, x1, 1.5 * h);
    if (!L.words.length) { if (prevY - lines[k].y > 2.8 * h) break; else continue; }
    if (prevY - L.y > 2.8 * h) break;
    if (isTitleLine(L, h)) break;
    const { hits, total } = labelHits(L);
    const shortWords = L.words.every((w) => w.str.length <= 14);
    if (hits >= 1 && shortWords && hits >= 0.4 * total && !L.words.some((w) => looksLikeMark(w.str) && /^\d/.test(w.str))) { headerIdx.unshift(k); headerLines.unshift(L); prevY = L.y; x0 = Math.min(x0, L.x0); x1 = Math.max(x1, L.x1); }
    else break;
  }
  // Title: the nearest short line above the block naming a schedule.
  let title = null;
  for (let k = headerIdx[0] - 1; k >= 0 && k >= headerIdx[0] - 8; k--) {
    const L = within(lines[k], x0, x1, 2 * h);
    if (lines[headerIdx[0]].y - lines[k].y > 8 * h) break;
    if (!L.words.length) continue;
    if (L.words.length <= 8 && /\bSCHEDULE\b/.test(normLabel(L.text))) { title = L.text; break; }
  }
  // Data lines below, inside the header's x-extent, until the pitch breaks or
  // another table starts.
  // Headers are often centered over left-aligned marks. Include the small
  // overhang of those values beyond the header's printed extent.
  const inset = 1.2 * h;
  const dataIdx = [];
  let lastY = field.y;
  const pitches = [];
  for (let k = fieldIdx + 1; k < lines.length; k++) {
    const L = lines[k];
    const inside = L.words.filter((w) => (w.x0 >= x0 - inset || (w.itemX0 < x0 && w.itemX1 >= x0 && w.itemX1 <= x1)) && w.x1 <= x1 + inset);
    const gap = L.y - lastY;
    const limit = pitches.length >= 3 ? 3 * median(pitches) : 3.2 * h;
    if (gap > limit) break;
    if (!inside.length) { if (gap > 1.2 * h && L.x0 > x1) continue; else continue; }
    const Li = { ...L, words: inside, text: inside.map((w) => w.str).join(" ") };
    if (/^(?:GENERAL\s+NOTES?|NOTES)\s*:/i.test(Li.text)) break;
    if (isFieldLine(Li, h) || isTitleLine(Li, h)) break;
    dataIdx.push(k);
    if (dataIdx.length > 1) pitches.push(gap);
    lastY = L.y;
  }
  if (!dataIdx.length) return null;
  const dataLines = dataIdx.map((k) => ({ ...lines[k], words: lines[k].words.filter((w) => (w.x0 >= x0 - inset || (w.itemX0 < x0 && w.itemX1 >= x0 && w.itemX1 <= x1)) && w.x1 <= x1 + inset) }));
  x0 = Math.min(x0, ...dataLines.flatMap((L) => L.words.map((w) => w.x0)));
  const rowPitch = pitches.length ? median(pitches) : 1.3 * h;

  // Columns: left-aligned cell starts in the data (text items start where a
  // cell starts), plus header cells that no data sits under; snapped to
  // vertical rules when the caller can render them.
  const starts = [];
  for (const L of dataLines) {
    const seen = new Set();
    for (const w of L.words) { if (seen.has(w.item)) continue; seen.add(w.item); starts.push(w.itemX0 >= x0 - inset ? w.itemX0 : w.x0); }
  }
  starts.sort((a, b) => a - b);
  const clusters = [];
  for (const s of starts) {
    const c = clusters[clusters.length - 1];
    if (c && s - c.max <= 0.5 * h) { c.max = s; c.n++; c.sum += s; } else clusters.push({ min: s, max: s, n: 1, sum: s });
  }
  const minCount = Math.max(2, Math.ceil(0.2 * dataLines.length));
  let anchors = clusters.filter((c) => c.n >= minCount).map((c) => c.min);
  if (!anchors.length || anchors[0] > x0 + 2 * h) anchors.unshift(x0);
  // Header cells: words overlapping in x (across the header lines) form a cell.
  const hwords = headerLines.flatMap((L) => L.words).sort((a, b) => a.x0 - b.x0);
  const cells = [];
  for (const w of hwords) {
    // The words of one text item are one cell; otherwise words a space apart.
    const c = cells.find((cc) => cc.items.has(w.item) || (cc.words.some((v) => Math.abs(v.yb - w.yb) > 0.5 * h) && w.x0 < cc.x1 + 0.2 * h && w.x1 > cc.x0 - 0.2 * h));
    if (c) { c.x0 = Math.min(c.x0, w.x0); c.x1 = Math.max(c.x1, w.x1); c.words.push(w); c.items.add(w.item); } else cells.push({ x0: w.x0, x1: w.x1, words: [w], items: new Set([w.item]) });
  }
  cells.sort((a, b) => a.x0 - b.x0);
  // A header cell with no data column starting under it names a column of
  // its own (a sparse FIRE RATING column with one YES) when the data of the
  // column before it stops short of the header: the items that start under
  // the header are its own.
  const margin = 0.6 * h;
  for (const c of cells) {
    const k = anchors.filter((a) => a <= c.x1).length - 1;
    if (k < 0) { anchors.unshift(c.x0); continue; }
    const next = anchors[k + 1] ?? Infinity;
    let beforeRight = -Infinity, underLeft = Infinity, any = false;
    for (const L of dataLines) {
      const seen = new Set();
      for (const w of L.words) {
        if (seen.has(w.item)) continue;
        seen.add(w.item);
        const ix0 = w.itemX0 >= x0 - inset ? w.itemX0 : w.x0, ix1 = w.itemX1 <= x1 + inset ? w.itemX1 : w.x1;
        if (ix0 < anchors[k] - margin || ix0 >= next) continue;
        any = true;
        if (ix0 < c.x0 - margin) beforeRight = Math.max(beforeRight, ix1);
        else if (ix0 <= c.x1 + margin) underLeft = Math.min(underLeft, ix0);
      }
    }
    if (!any) continue;
    if (beforeRight !== -Infinity && beforeRight < c.x0 - margin) {
      const start = Math.min(c.x0, underLeft);
      if (start > anchors[k] + h) anchors.push((beforeRight + start) / 2 + 0.3 * h);
    }
  }
  anchors = [...new Set(anchors.map((a) => Math.round(a * 10) / 10))].sort((a, b) => a - b);
  // Two starts closer than a column can be are one column (a centred cell's
  // longer and shorter values start a few points apart).
  anchors = anchors.filter((a, i) => i === 0 || a - anchors[i - 1] >= 1.5 * h);
  let bounds = anchors.slice(1).map((a) => a - 0.3 * h);
  let rules = null;
  if (typeof opts.rules === "function") {
    try { rules = await opts.rules({ x0: x0 - 2 * h, x1: x1 + 2 * h, y0: lines[headerIdx[0]].y - 1.4 * h, y1: dataLines[dataLines.length - 1].y + 0.8 * h }); } catch (_) { rules = null; }
  }
  if (rules && Array.isArray(rules.verticals) && rules.verticals.length >= Math.max(3, anchors.length - 2)) {
    const snapped = bounds.map((b) => { let best = null; for (const v of rules.verticals) if (v > x0 && v < x1 && (best == null || Math.abs(v - b) < Math.abs(best - b))) best = v; return best != null && Math.abs(best - b) <= 1.5 * h ? best : b; });
    bounds = [...new Set(snapped)].sort((a, b) => a - b);
  }
  const colOf = (w) => { const c = (w.x0 + w.x1) / 2; let k = 0; while (k < bounds.length && c >= bounds[k]) k++; return k; };
  const ncol = bounds.length + 1;
  // Header text per column; a header word over several columns is a group
  // label and names each of them.
  const names = new Array(ncol).fill("");
  const colStart = (k) => (k === 0 ? x0 : bounds[k - 1]), colEnd = (k) => (k === bounds.length ? x1 : bounds[k]);
  // A header cell (one text item, or words a space apart) names the column
  // most of it sits over - a centred "SIZE - W x H x T" starts left of the
  // column's left-aligned data. A cell that straddles columns ("HARDWARE
  // GLAZING" drawn as one item over two) names them word by word.
  const sortedCells = cells.slice().sort((a, b) => Math.min(...a.words.map((w) => w.yb)) - Math.min(...b.words.map((w) => w.yb)) || a.x0 - b.x0);
  for (const c of sortedCells) {
    let bestK = -1, bestOv = 0;
    for (let k = 0; k < ncol; k++) { const ov = Math.min(c.x1, colEnd(k)) - Math.max(c.x0, colStart(k)); if (ov > bestOv) { bestOv = ov; bestK = k; } }
    const words = c.words.slice().sort((a, b) => a.yb - b.yb || a.x0 - b.x0);
    if (bestK >= 0 && bestOv >= 0.7 * (c.x1 - c.x0)) {
      names[bestK] = (names[bestK] ? names[bestK] + " " : "") + words.map((w) => w.str).join(" ");
    } else {
      for (const w of words) { const k = colOf(w); names[k] = (names[k] ? names[k] + " " : "") + w.str; }
    }
  }
  const usedF = new Set();
  const fields = names.map((n) => { const f = fieldForHeader(n, usedF); if (f) usedF.add(f); return f; });
  // What the header says this is.
  const F = new Set(fields.filter(Boolean));
  const titleUp = normLabel(title || "");
  const titleSaysDoor = /\b(DOOR|OPENING)\b/.test(titleUp) && !/\b(HARDWARE|STOREFRONT|WINDOW|FINISH)\b/.test(titleUp);
  const titleSaysOther = !!title && !titleSaysDoor && /\b(STOREFRONT|WINDOW|FINISH|ROOM|HARDWARE|FRAME|LOUVER|SIGNAGE)\b/.test(titleUp);
  const headerSaysDoor = F.has("mark") && (F.has("size") || F.has("width") || F.has("height")) && (F.has("hardware_group") || F.has("fire_rating") || F.has("door_type"));
  const is_door_schedule = headerSaysDoor ? !titleSaysOther || titleSaysDoor : titleSaysDoor && F.has("mark");

  // Rows: a line with a mark starts a row (a ruled row never holds two); a
  // line with no text in the mark column continues the row above (a wrapped
  // cell); a non-mark text in the mark column is a section label.
  const markCol = fields.indexOf("mark");
  const cellsOf = (L) => { const groups = Array.from({ length: ncol }, () => []); for (const w of L.words) groups[colOf(w)].push(w); return groups.map((g) => joinWords(g, h)); };
  const rows = [];
  let section = null;
  for (const L of dataLines) {
    const cells = cellsOf(L);
    const markText = markCol >= 0 ? cells[markCol].trim() : "";
    const prev = rows[rows.length - 1];
    if (markText && looksLikeMark(markText.split(" ")[0])) {
      rows.push({ cells, section, y: L.y, lines: 1 });
    } else if (markText) {
      if (!prev || L.y - prev.y > 1.6 * rowPitch || cells.filter((c) => c).length === 1) { section = cells.filter((c) => c).join(" ").trim(); continue; }
      for (let k = 0; k < ncol; k++) if (cells[k]) prev.cells[k] = prev.cells[k] ? prev.cells[k] + " " + cells[k] : cells[k];
      prev.lines++;
    } else if (prev && L.y - prev.y <= 1.6 * rowPitch) {
      for (let k = 0; k < ncol; k++) if (cells[k]) prev.cells[k] = prev.cells[k] ? prev.cells[k] + " " + cells[k] : cells[k];
      prev.lines++;
    }
  }
  const doors = rows.map((r, i) => doorFromRow(r, fields, i, pageSize)).filter(Boolean);
  return { title, header: names, fields, bounds, anchors, x0, x1, header_y: headerLines.map((L) => Math.round(L.y)), y0: lines[headerIdx[0]].y, y1: dataLines[dataLines.length - 1].y, row_pitch: rowPitch, data_lines: dataLines.length, rows: rows.length, doors, is_door_schedule, lineIndexes: [...headerIdx, ...dataIdx], rules_used: !!rules };
}

// ---- cell readers (the same meanings as the OCR path's cleaners)

const DOOR_LIMITS = { width: [12, 192], height: [60, 240] };
function fractionValue(n, d) {
  const num = parseInt(n, 10), den = parseInt(d, 10);
  if (![2, 4, 8, 16].includes(den) || !(num > 0) || num >= den) return null;
  return num / den;
}
/** One architectural dimension as printed: 3'-0", 7'-10, 3-6, 36", 1 3/4", 1-3/4" -> inches or null. */
export function readDimension(text) {
  let t = String(text || "").replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"').replace(/\s+/g, " ").trim();
  if (!t) return null;
  t = t.replace(/''/g, '"');
  let m = t.match(/^(\d{1,2})\s*'\s*-?\s*(\d{1,2})(?:\s*-?\s*(\d)\/(\d{1,2}))?\s*"?$/);
  if (m) { const inch = parseInt(m[2], 10); const frac = m[3] ? fractionValue(m[3], m[4]) : 0; if (inch > 11 || frac == null) return null; return { inches: parseInt(m[1], 10) * 12 + inch + frac, format: "ft-in" }; }
  m = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})(?:\s*-?\s*(\d)\/(\d{1,2}))?$/);
  if (m) { const inch = parseInt(m[2], 10); const frac = m[3] ? fractionValue(m[3], m[4]) : 0; if (inch > 11 || frac == null) return null; return { inches: parseInt(m[1], 10) * 12 + inch + frac, format: "ft-in" }; }
  m = t.match(/^(\d{1,2})\s*'$/);
  if (m) return { inches: parseInt(m[1], 10) * 12, format: "ft-in" };
  m = t.match(/^(\d{1,3})(?:\s*-?\s*(\d)\/(\d{1,2}))?\s*"$/);
  if (m) { const frac = m[2] ? fractionValue(m[2], m[3]) : 0; return frac == null ? null : { inches: parseInt(m[1], 10) + frac, format: "in" }; }
  m = t.match(/^(\d)\s*-?\s*(\d)\/(\d{1,2})\s*"?$/);
  if (m) { const f = fractionValue(m[2], m[3]); return f == null ? null : { inches: parseInt(m[1], 10) + f, format: "in" }; }
  m = t.match(/^(\d)\/(\d{1,2})\s*"?$/);
  if (m) { const f = fractionValue(m[1], m[2]); return f == null ? null : { inches: f, format: "in" }; }
  return null;
}
function acceptDim(d, kind, plainInchesOk) {
  if (!d) return null;
  if (d.format === "in" && !plainInchesOk) return null;
  return d.inches >= DOOR_LIMITS[kind][0] && d.inches <= DOOR_LIMITS[kind][1] ? d.inches : null;
}
/** A combined size cell: "PR 3'-6" x 7'-10" x 1-3/4"", "3070", "36" x 84"", "3'-0" X 7'-0"". */
export function readSizeCell(text) {
  let t = String(text || "").replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"').replace(/\s+/g, " ").trim();
  const out = { pair: false, width: null, height: null, thickness: null, width_inches: null, height_inches: null, thickness_inches: null };
  if (!t) return out;
  if (/^(PR|PAIR|PRS?\.?)\b/i.test(t)) { out.pair = true; t = t.replace(/^(PR|PAIR|PRS?\.?)\b\.?\s*/i, ""); }
  else if (/\b(PR|PAIR)$/i.test(t)) { out.pair = true; t = t.replace(/\s*\b(PR|PAIR)$/i, ""); }
  t = t.replace(/\(.*?\)/g, " ").trim();
  const m4 = t.match(/^(\d)(\d)(\d)(\d)$/);
  if (m4) { out.width = m4[1] + "'-" + m4[2] + '"'; out.height = m4[3] + "'-" + m4[4] + '"'; out.width_inches = +m4[1] * 12 + +m4[2]; out.height_inches = +m4[3] * 12 + +m4[4]; return out; }
  const parts = t.split(/\s*[xX×]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const w = readDimension(parts[0]), hgt = readDimension(parts[1]);
    const plain = !!(w && hgt && w.format === "in" && hgt.format === "in");
    out.width = parts[0]; out.height = parts[1];
    out.width_inches = acceptDim(w, "width", plain);
    out.height_inches = acceptDim(hgt, "height", plain);
    if (parts[2]) { out.thickness = parts[2]; const th = readDimension(parts[2]); out.thickness_inches = th && th.inches >= 0.75 && th.inches <= 3 ? th.inches : null; }
  }
  return out;
}
function cleanText(s) { const t = String(s || "").replace(/\s+/g, " ").trim(); return t || null; }
function cleanMark(s) { const t = String(s || "").trim().split(/\s+/)[0] || ""; return looksLikeMark(t) ? t.toUpperCase() : null; }
function cleanFire(s) {
  const t = cleanText(s);
  if (!t) return null;
  return t.toUpperCase().replace(/\s+/g, " ").replace(/\bMIN(UTES?|S)?\b\.?/g, "MIN.").replace(/\s+MIN\./g, " MIN.").replace(/[,;:]+$/, "");
}
function yesNo(s) { const t = UP(cleanText(s)); if (!t) return null; if (/^(Y|YES|X|PR|PAIR|TRUE|1)$/.test(t)) return true; if (/^(N|NO|-|FALSE|0)$/.test(t)) return false; return null; }

function doorFromRow(row, fields, index, pageSize) {
  const get = (f) => { const k = fields.indexOf(f); return k >= 0 ? cleanText(row.cells[k]) : null; };
  const mark = cleanMark(get("mark"));
  if (!mark) return null;
  let size = { pair: false, width: get("width"), height: get("height"), thickness: get("thickness"), width_inches: null, height_inches: null, thickness_inches: null };
  if (fields.includes("size")) {
    const s = readSizeCell(get("size"));
    size = { ...size, ...s, width: s.width || size.width, height: s.height || size.height, thickness: s.thickness || size.thickness };
  } else {
    const w = readDimension(size.width), hgt = readDimension(size.height);
    const plain = !!(w && hgt && w.format === "in" && hgt.format === "in");
    size.width_inches = acceptDim(w, "width", plain);
    size.height_inches = acceptDim(hgt, "height", plain);
    const th = readDimension(size.thickness);
    size.thickness_inches = th && th.inches >= 0.75 && th.inches <= 3 ? th.inches : null;
  }
  const pairCol = fields.includes("pair") ? yesNo(get("pair")) : null;
  const pair = pairCol != null ? pairCol : size.pair;
  let head = get("head_detail"), jamb = get("jamb_detail"), sill = get("sill_detail");
  const details = get("details");
  if (details && !head && !jamb) {
    const m = details.match(/^H\s*([A-Z0-9.]+)\s*\/\s*J\s*([A-Z0-9.]+)/i);
    if (m) { head = "H" + m[1]; jamb = "J" + m[2]; } else head = details;
  }
  const notes = [get("notes"), get("location") ? "Room: " + get("location") : null].filter(Boolean).join("; ") || null;
  const panic = get("panic_hardware");
  const confidence = {};
  for (const f of fields) if (f) confidence[f] = 1.0;
  return {
    door_number: mark,
    hardware_group: get("hardware_group"),
    fire_rating: cleanFire(get("fire_rating")),
    size: [size.width, size.height].filter(Boolean).join(" x ") || null,
    width_inches: size.width_inches,
    height_inches: size.height_inches,
    thickness: size.thickness,
    thickness_inches: size.thickness_inches,
    door_type: get("door_type") ? UP(get("door_type")) : null,
    material_code: get("door_material"),
    door_finish: get("door_finish"),
    stc_rating: get("stc_rating"),
    frame_type: get("frame_type"),
    frame_material: get("frame_material"),
    frame_finish: get("frame_finish"),
    head_detail: head,
    jamb_detail: jamb,
    sill_detail: sill,
    panic_hardware: panic && !/^-+$/.test(panic) ? panic : null,
    glazing: get("glazing") && !/^-+$/.test(get("glazing")) ? get("glazing") : null,
    alternate_pricing: get("alternate"),
    remarks: notes,
    pair,
    section: row.section,
    source_row: index,
    source_y: Math.round(row.y),
    field_confidence: confidence,
    read_from: "text_layer",
  };
}

// ---------------------------------------------------------------- hardware groups

export const MFR_CODES = {
  SCH: "Schlage", LCN: "LCN", IVE: "Ives", VON: "Von Duprin", VD: "Von Duprin", VDP: "Von Duprin", ZER: "Zero International", ZRO: "Zero International",
  GLY: "Glynn-Johnson", GJ: "Glynn-Johnson", NGP: "National Guard Products", NAT: "National Guard Products", PEM: "Pemko", HAG: "Hager", SAR: "Sargent",
  COR: "Corbin Russwin", CR: "Corbin Russwin", SEL: "Select Hinges", TRM: "Trimco", TRI: "Trimco", DOR: "dormakaba", DKB: "dormakaba", RCI: "RCI",
  ROC: "Rockwood", RKW: "Rockwood", STA: "Stanley", STN: "Stanley", MCK: "McKinney", NOR: "Norton", RIX: "Rixson", ADA: "Adams Rite", AR: "Adams Rite",
  BES: "Best", FAL: "Falcon", YAL: "Yale", DET: "Detex", SEC: "Securitron", HES: "HES", ABH: "ABH", BUR: "Burns", DCI: "Don-Jo", DJO: "Don-Jo",
  MAR: "Markar", SDC: "SDC", "B/O": "By others", BO: "By others", OTH: "By others",
  MK: "McKinney", SA: "Sargent", RO: "Rockwood", PE: "Pemko", RU: "Corbin Russwin", NO: "Norton", MC: "Medeco", OT: "Other", BE: "Best",
};
const UOM = /^(EA\.?|EACH|SET|SETS|PR|PAIR|PRS|LF|PC|PCS|LOT)$/i;
const FINISH = /^(\d{3}[A-Z]?|US\d{1,2}[A-Z]?|\d{3}\/\d{3}|[A-Z]{1,5}|[A-Z]{2,3}\d{1,2}|[A-Z]\d{2,3}[A-Z]?|\d{3}[a-z])$/;
// Require a numbered, singular heading: "Hardware Sets" is a section title,
// not a group named S. Set: 1.0 and Set #1 Classroom are common spec formats.
const HEADING = /^(?:(?:FINISH HARDWARE|HARDWARE|HDWE?\.?|HW)\s+)?(?:GROUP|SET|HEADING)\b\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z]{0,2}\d+(?:\.\d+)?[A-Z]?(?:[\s\-:]+.*)?)$/i;

function parseHeading(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  let m = t.match(HEADING);
  if (!m) return null;
  let rest = m[1].trim().replace(/^[:.\-]\s*/, "");
  if (!rest) return null;
  // "06 CL", "19F STO", "44 UTY-IT", "01", "1.0", "01-CARD READER EXTERIOR ..."
  const idm = rest.match(/^([A-Z]{0,2}\d+(?:\.\d+)?[A-Z]?)(?:[\s\-:]+(.*))?$/i);
  if (!idm) return { group_number: rest.split(" ").slice(0, 2).join(" "), group_name: rest.split(" ").slice(2).join(" ") || null };
  let id = idm[1].toUpperCase();
  let tail = (idm[2] || "").trim();
  const toks = tail.split(/\s+/).filter(Boolean);
  if (toks.length === 1 && /^[A-Z]{1,4}(-[A-Z]{1,4})?$/i.test(toks[0])) { id += " " + toks[0].toUpperCase(); tail = ""; }
  return { group_number: id, group_name: tail || null };
}

function doorListTokens(text) {
  const t = String(text || "").replace(/^(DOOR\s*(NOS?\.?|NUMBERS?)|DOORS?\s*#?|OPENINGS?|MARKS?)\s*[:#]?\s*/i, "").replace(/\band\b/gi, ",");
  const toks = t.split(/[\s,;&]+/).filter(Boolean);
  if (!toks.length) return null;
  if (!toks.every((x) => looksLikeMark(x))) return null;
  return toks.map((x) => x.toUpperCase());
}

function isHardwareHeaderLine(L) {
  const t = normLabel(L.text);
  let n = 0;
  if (/\b(QTY|QUANTITY|QUAN)\b/.test(t)) n++;
  if (/\b(DESCRIPTION|DESC|ITEM|COMPONENT)\b/.test(t)) n++;
  if (/\bTYPE\b/.test(t) && /\bDESCRIPTION\b/.test(t)) n++;
  if (/\b(CATALOG|CATALOGUE|PRODUCT|MODEL|PART)\b/.test(t)) n++;
  if (/\b(FINISH|FIN)\b/.test(t)) n++;
  if (/\b(MFR|MFG|MAN|MANUFACTURER|MFGR|BRAND|VENDOR)\b/.test(t)) n++;
  return n >= 3 && L.words.length <= 12;
}

function itemStart(L, qtyX, h) {
  const w = L.words;
  if (!w.length) return null;
  // Spec section/page footers and numbered section titles are not quantities.
  if (/^\d{2}\s+\d{2}\s+\d{2}\b/.test(L.text) || /^\d+\s+(?:DOOR\s+)?HARDWARE\s+(?:SCHEDULE|SETS?)\b/i.test(L.text)) return null;
  if (!/^\d{1,3}$/.test(w[0].str)) return null;
  // The quantity sits in the quantity column; a wrapped line that happens to
  // start with a number ("5 RELEASE BUTTONS") does not.
  if (qtyX != null && h && w[0].x0 > qtyX + 1.5 * h) return null;
  const qty = parseInt(w[0].str, 10);
  let k = 1, uom = null;
  if (w[1] && UOM.test(w[1].str)) { uom = w[1].str.toUpperCase(); k = 2; }
  if (!w[k]) return null;
  const rest = w.slice(k);
  if (!rest.some((x) => /[A-Za-z]{2,}/.test(x.str))) return null;
  return { qty, uom, rest };
}

/**
 * Reads unruled (or ruled) hardware groups from a page's text lines.
 * Returns { hardware_groups, door_hardware_matrix, metadata } or null.
 */
export async function readHardwareGroupsFromLines(lines, pageSize, opts = {}) {
  const h = em(lines);
  const groups = [];
  let cur = null;
  let header = null; // { desc, cat, fin, mfr } x-starts from a header line
  let anchors = null; // learned column starts for the current group
  let lastContentY = null;
  const pageH = pageSize && pageSize.height ? pageSize.height : Infinity;
  const open = (heading, y) => { cur = { group_number: heading.group_number, group_name: heading.group_name, assigned_doors: [], components: [], notes: [], y, _items: [], _lines: [] }; groups.push(cur); anchors = null; lastContentY = y; };

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const text = L.text.trim();
    const heading = text.length <= 200 ? parseHeading(text) : null;
    if (heading) { open(heading, L.y); continue; }
    if (/^END OF SECTION/i.test(text)) { cur = null; continue; }
    if (!cur) {
      // Items before any heading: a group continued from the page before.
      const st = itemStart(L);
      if (st && L.words.length >= 3 && !/^\d{1,2}\.\d+/.test(text)) { open({ group_number: "(continued)", group_name: "items printed before the first heading on this page" }, L.y); cur._continued = true; }
      else continue;
    }
    if (isHardwareHeaderLine(L)) {
      header = {};
      const typeDescription = /\bTYPE\b/i.test(text) && /\bDESCRIPTION\b/i.test(text);
      for (const w of L.words) {
        const t = UP(w.str);
        if (/^(QTY|QUANTITY|QUAN)/.test(t)) header.qty = w.x0;
        else if (typeDescription && t === "TYPE") header.desc = w.x0;
        else if (/^(DESCRIPTION|DESC|ITEM|COMPONENT)/.test(t)) header[typeDescription ? "cat" : "desc"] = w.x0;
        else if (/^(CATALOG|CATALOGUE|PRODUCT|MODEL|PART)/.test(t)) header.cat = w.x0;
        else if (/^(FINISH|FIN)/.test(t)) header.fin = w.x0;
        else if (/^(MFR|MFG|MAN|MANUFACTURER|MFGR|BRAND|VENDOR)/.test(t)) header.mfr = w.x0;
      }
      cur._header = header;
      lastContentY = L.y;
      continue;
    }
    const st = itemStart(L);
    if (st) {
      cur._items.push({ line: L, start: st });
      cur._lines.push({ kind: "item", line: L });
      lastContentY = L.y;
      continue;
    }
    const doors = cur._items.length === 0 ? doorListTokens(text) : null;
    if (doors) { cur.assigned_doors.push(...doors); lastContentY = L.y; continue; }
    const dm = text.match(/^(?:DOORS?\s*#?|DOOR\s*(?:NOS?\.?|NUMBERS?)|OPENINGS?)\s*[:#]?\s*(.+)$/i);
    if (dm && doorListTokens(dm[1])) { cur.assigned_doors.push(...doorListTokens(dm[1])); lastContentY = L.y; continue; }
    // Running footers/headers far from the group's text are not its notes.
    if (lastContentY != null && L.y - lastContentY > 3 * h) { continue; }
    if (L.y > pageH * 0.94 || L.y < pageH * 0.05) continue;
    cur._lines.push({ kind: "text", line: L });
    lastContentY = L.y;
  }

  // Each group: the quantity column is where most of its quantities start;
  // a numbered wrapped line is demoted to text. Then learn the columns from
  // the item lines and assign words.
  const matrix = [];
  for (const g of groups) {
    const qxs = g._items.map((x) => x.line.words[0].x0).sort((a, b) => a - b);
    const qtyX = qxs.length ? qxs[Math.floor(qxs.length / 4)] : null;
    if (qtyX != null) {
      for (const entry of g._lines) if (entry.kind === "item" && !itemStart(entry.line, qtyX, h)) entry.kind = "text";
      g._items = g._items.filter((x) => itemStart(x.line, qtyX, h));
    }
    const hdr = g._header || header || null;
    const itemLines = g._items.map((x) => x.line);
    // Word/ASSA tables center quantities beside two-line cells. Their first
    // baseline is half a line ABOVE the quantity, not a wrap of the prior row.
    for (let i = 0; i + 1 < g._lines.length; i++) {
      const entry = g._lines[i], next = g._lines[i + 1];
      if (entry.kind === "text" && next.kind === "item" && next.line.y - entry.line.y <= 0.85 * h && entry.line.x0 > qtyX + 0.7 * h) {
        next.leading = entry.line;
        entry.kind = "leading";
      }
    }
    const descX = hdr && hdr.desc != null ? hdr.desc : Math.min(...g._items.map((x) => x.start.rest[0].x0));
    const wrapped = g._lines.filter((e, i) => e.kind === "leading" || (e.kind === "text" && e.line.x0 >= descX - 0.6 * h && !/^NOTES?\s*:/i.test(e.line.text) && i > 0 && e.line.y - g._lines[i - 1].line.y <= 1.7 * h)).map((e) => e.line);
    const col = learnHardwareColumns(itemLines, hdr, h, wrapped);
    g._anchors = col;
    let last = null;
    const rulesBands = await rulesBandsFor(opts, g, itemLines, h);
    for (const entry of g._lines) {
      const L = entry.line;
      if (entry.kind === "leading") continue;
      if (entry.kind === "item") {
        const st = itemStart(L);
        const cells = assignHardwareCells(st.rest, col, h);
        if (entry.leading) {
          const lead = assignHardwareCells(entry.leading.words, col, h);
          for (const k of ["desc", "cat", "fin", "mfr"]) if (lead[k]) cells[k] = [lead[k], cells[k]].filter(Boolean).join(" ");
        }
        const it = { quantity: st.qty, uom: st.uom || "EA", description: cells.desc, catalog: cells.cat, finish: cells.fin, mfr: cells.mfr, extra: cells.extra, y: L.y, band: rulesBands ? rulesBands.bandOf(L.y) : null };
        g.components.push(it);
        last = it;
        continue;
      }
      // Text line: a wrapped cell when it starts at or after the description
      // column (and, in a ruled table, sits in the same band); a note otherwise.
      const first = L.words[0];
      const inBand = rulesBands && last && rulesBands.bandOf(L.y) === last.band;
      const startsInColumns = first.x0 >= col.desc - 0.6 * h;
      if (last && startsInColumns && (inBand || !rulesBands || rulesBands.bandOf(L.y) == null) && (L.y - last.y) <= 1.7 * h) {
        if (rulesBands && !inBand && rulesBands.bandOf(L.y) != null) {
          // A new ruled row without a quantity (a set's "RELAY MODULE" line).
          const cells = assignHardwareCells(L.words, col, h);
          const it = { quantity: null, uom: null, description: cells.desc, catalog: cells.cat, finish: cells.fin, mfr: cells.mfr, extra: cells.extra, y: L.y, band: rulesBands.bandOf(L.y) };
          g.components.push(it); last = it; continue;
        }
        const cells = assignHardwareCells(L.words, col, h);
        for (const k of ["desc", "cat", "fin", "mfr"]) if (cells[k]) last[{ desc: "description", cat: "catalog", fin: "finish", mfr: "mfr" }[k]] = (last[{ desc: "description", cat: "catalog", fin: "finish", mfr: "mfr" }[k]] ? last[{ desc: "description", cat: "catalog", fin: "finish", mfr: "mfr" }[k]] + " " : "") + cells[k];
        last._wraps = (last._wraps || 0) + 1;
        last.y = L.y;
        continue;
      }
      g.notes.push(L.text.trim());
    }
    g.components = g.components.map((c, idx) => finishComponent(c, idx));
    for (const d of g.assigned_doors) matrix.push({ door_number: d, hardware_set_number: g.group_number, confidence: 0.98 });
    g.notes = g.notes.filter(Boolean);
    g.group_notes = g.notes.join(" ") || null;
    delete g._items; delete g._lines; delete g._header; delete g._anchors;
  }
  const real = groups.filter((g) => g.components.length || g.assigned_doors.length);
  if (!real.length) return null;
  return { hardware_groups: real.map((g) => ({ group_number: g.group_number, group_name: g.group_name, assigned_doors: g.assigned_doors, components: g.components, notes: g.group_notes, continued: !!g._continued, read_from: "text_layer" })), door_hardware_matrix: matrix, metadata: { extraction_mode: "text_layer", group_count: real.length } };
}

async function rulesBandsFor(opts, g, itemLines, h) {
  if (typeof opts.rules !== "function" || itemLines.length < 2) return null;
  const x0 = Math.min(...itemLines.map((L) => L.x0)), x1 = Math.max(...itemLines.map((L) => L.x1));
  const y0 = Math.min(...itemLines.map((L) => L.y)) - 1.5 * h, y1 = Math.max(...itemLines.map((L) => L.y)) + 3 * h;
  let r = null;
  try { r = await opts.rules({ x0: x0 - h, x1: x1 + 3 * h, y0, y1 }); } catch (_) { return null; }
  if (!r || !Array.isArray(r.horizontals) || r.horizontals.length < Math.max(3, itemLines.length * 0.5)) return null;
  const hs = r.horizontals.slice().sort((a, b) => a - b);
  return { bandOf: (y) => { if (y < hs[0] - 0.5 * h || y > hs[hs.length - 1] + 0.5 * h) return null; let k = 0; while (k < hs.length && y > hs[k]) k++; return k; } };
}

function learnHardwareColumns(itemLines, header, h, wrapped = []) {
  // Cell starts: the first word of each item line's "rest" and every word that
  // follows a gap wider than an em. Clustered across the group's lines.
  const starts = [];
  for (const L of itemLines.concat(wrapped)) {
    const st = wrapped.includes(L) ? null : itemStart(L);
    const ws = st ? st.rest : L.words;
    for (let k = 0; k < ws.length; k++) {
      const maker = (k === ws.length - 1 || (k === ws.length - 2 && /^08\d{4}$/.test(ws[k + 1].str))) && MFR_CODES[UP(ws[k].str)] && (!header || header.mfr != null || header.fin == null || (k > 0 && ws[k - 1].x0 >= header.fin - h));
      if (k === 0 || ws[k].x0 - ws[k - 1].x1 > 1.0 * h || maker) starts.push(ws[k].x0);
    }
  }
  starts.sort((a, b) => a - b);
  const clusters = [];
  for (const s of starts) { const c = clusters[clusters.length - 1]; if (c && s - c.last <= 0.8 * h) { c.last = s; c.n++; c.min = Math.min(c.min, s); } else clusters.push({ min: s, last: s, n: 1 }); }
  const strong = clusters.filter((c) => c.n >= Math.max(2, Math.ceil(0.3 * itemLines.length))).map((c) => c.min);
  const col = { desc: null, cat: null, fin: null, mfr: null, learned: strong, finishNamed: header && header.fin != null };
  if (strong.length >= 4) { col.desc = strong[0]; col.cat = strong[1]; col.fin = strong[strong.length - 2]; col.mfr = strong[strong.length - 1]; }
  else if (strong.length === 3) { col.desc = strong[0]; col.cat = strong[1]; col.fin = strong[2]; }
  else if (strong.length === 2) { col.desc = strong[0]; col.cat = strong[1]; }
  else if (strong.length === 1) { col.desc = strong[0]; }
  // A header line names columns; it only moves an anchor when the data has
  // none near it (header words are often centred over left-aligned cells).
  if (header) {
    for (const k of ["desc", "cat", "fin", "mfr"]) {
      if (header[k] == null) continue;
      if (col[k] == null) col[k] = header[k];
      else if (Math.abs(col[k] - header[k]) > 6 * h) { const near = strong.find((s) => Math.abs(s - header[k]) <= 6 * h); if (near != null) col[k] = near; }
    }
  }
  if (col.desc == null) col.desc = itemLines.length ? Math.min(...itemLines.map((L) => { const st = itemStart(L); return st ? st.rest[0].x0 : Infinity; })) : 0;
  return col;
}

function assignHardwareCells(words, col, h) {
  const out = { desc: "", cat: "", fin: "", mfr: "", extra: "" };
  const lastX = {};
  const put = (k, w) => { const s = typeof w === "string" ? w : w.str; const gapless = typeof w !== "string" && lastX[k] != null && w.x0 - lastX[k] < 0.12 * h; out[k] = out[k] ? out[k] + (gapless ? "" : " ") + s : s; if (typeof w !== "string") lastX[k] = w.x1; };
  if (col.cat == null) {
    // No columns learned: split by meaning. Description = leading words without
    // digits; the last short code is the maker, the finish sits before it.
    const ws = words.map((w) => w.str);
    let mfr = null, fin = null;
    if (ws.length > 2 && (MFR_CODES[UP(ws[ws.length - 1])] || /^[A-Z]{2,4}$/.test(ws[ws.length - 1]))) mfr = ws.pop();
    if (ws.length > 2 && FINISH.test(ws[ws.length - 1]) && /\d/.test(ws[ws.length - 1])) fin = ws.pop();
    let k = 0;
    while (k < ws.length && !/\d/.test(ws[k]) && k < 5) k++;
    out.desc = ws.slice(0, k).join(" ");
    out.cat = ws.slice(k).join(" ");
    out.fin = fin || ""; out.mfr = mfr || "";
    return out;
  }
  for (const w of words) {
    const x = w.x0 + 0.4 * h;
    if (col.mfr != null && x >= col.mfr) put("mfr", w);
    else if (col.fin != null && x >= col.fin) put("fin", w);
    else if (col.cat != null && x >= col.cat) put("cat", w);
    else put("desc", w);
  }
  // A maker code that landed in the finish column (no finish printed), or a
  // finish that landed at the end of the catalog cell.
  if (!col.finishNamed && !out.mfr && out.fin && MFR_CODES[UP(out.fin)] && !/\d/.test(out.fin)) { out.mfr = out.fin; out.fin = ""; }
  return out;
}

function finishComponent(c, idx) {
  // A trailing specification cross-reference is a separate column, not part
  // of the maker abbreviation (e.g. "MK 087100").
  const code = c.mfr ? UP(c.mfr).replace(/\s+08\d{4}$/, "").replace(/\.$/, "") : null;
  const name = code ? MFR_CODES[code] || null : null;
  const desc = cleanText(c.description);
  const cat = cleanText(c.catalog);
  // Addendum revision marks: "DBZ (628)" / "39D (39A)" print the new value and
  // the struck old one in parentheses; the current value comes first.
  const revised = (s) => { const m = String(s || "").match(/^(.+?)\s*\(([^()]+)\)\s*$/); return m && m[2].length <= 12 && /\w/.test(m[1]) && !/^(AS|PER|SEE|BY|VERIFY|TYP|TYPICAL)\b/i.test(m[2]) ? { now: m[1].trim(), was: m[2].trim() } : null; };
  const rf = revised(c.finish), rc = revised(cat);
  const catalogRevision = rc && !/\s/.test(rc.was);
  const notes = [];
  if (rf) notes.push("finish was " + rf.was);
  if (catalogRevision) notes.push("catalog was " + rc.was);
  return {
    component_type: desc || cat || "ITEM",
    description: desc,
    quantity: c.quantity == null ? null : c.quantity,
    uom: c.uom || "EA",
    manufacturer: name || (code && code.length > 4 ? code : null),
    manufacturer_code: code,
    model_number: catalogRevision ? rc.now : cat,
    catalog_number: catalogRevision ? rc.now : cat,
    finish: rf ? rf.now : cleanText(c.finish),
    notes: notes.length ? notes.join("; ") : null,
    sequence: idx + 1,
    field_confidence: { quantity: c.quantity == null ? 0.5 : 1, description: 1, catalog: cat ? 1 : 0.5, finish: 1, manufacturer: name ? 1 : code ? 0.7 : 0.5 },
    read_from: "text_layer",
  };
}

// ---------------------------------------------------------------- page classification

/** What a page's text holds: a door schedule, hardware groups, or neither. */
export async function classifyLines(lines, pageSize) {
  const out = { door_schedule: null, hardware: null };
  const ds = await readDoorScheduleFromLines(lines, pageSize);
  if (ds && ds.doors.length) out.door_schedule = { rows: ds.doors.length, title: ds.tables[0].title, tables: ds.tables.length };
  let headings = 0, items = 0;
  for (const L of lines) {
    if (L.words.length <= 14 && parseHeading(L.text)) headings++;
    else if (itemStart(L) && L.words.length >= 3 && L.words[1] && UOM.test(L.words[1].str)) items++;
  }
  if (headings || items >= 4) {
    const hg = await readHardwareGroupsFromLines(lines, pageSize);
    const groups = hg ? hg.hardware_groups.filter((g) => g.components.length) : [];
    if (groups.length) out.hardware = { groups: groups.length, items: groups.reduce((n, g) => n + g.components.length, 0), headings, continued: groups.some((g) => g.continued) };
  }
  return out;
}
