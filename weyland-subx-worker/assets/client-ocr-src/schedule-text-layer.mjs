// schedule-text-layer.mjs (2026-10-08)
//
// Reads door schedules and hardware groups from a PDF page's TEXT LAYER, the
// characters the PDF already carries with their positions, before any pixel
// is rendered or OCR'd.
//
// Why: the grid reader (schedule-grid-extraction-client.mjs) finds a schedule
// by its ruled lines and OCRs each cell. On the bid sets door subs actually
// receive that read nothing (plan/weylandai_value_report.md, measured by
// tools/accuracy/schedule_read_accuracy.mjs, 2026-10-08 04:55 "before"):
//   - Rockford A2.2: the door schedule is a hairline-ruled block in one corner
//     of a 42x30 CAD sheet - 0 of 65 doors.
//   - Rockford and Berryessa 08 71 00: hardware groups are printed as spec
//     text with no rules at all - 0 of 13 and 0 of 2 groups.
//   - Berryessa A9.2: three sheets printed sideways - 0 of 24 doors.
//   - Christina set 01: a ruled table under a watermark - 0 of 23 items.
// Every one of those pages has a complete text layer (CAD and spec writers
// export text, not pictures), so the exact characters and their positions are
// already in the file. Rows and columns are rebuilt from those positions; OCR
// stays the path for scanned pages, which have no text layer.
//
// Pure functions, no DOM and no pdf.js import: the caller passes what
// page.getTextContent() and page.getViewport() return, so Node runs the same
// code against the corpus PDFs (tools/accuracy/schedule_text_layer_accuracy.mjs
// and test/schedule-text-layer.test.mjs).
//
// What comes back is raw cell text per field. The caller (the grid client)
// turns door rows into door records with the same cleaners the OCR path uses,
// so a size or a fire rating means the same thing whichever way it was read.

// ---------------------------------------------------------------- geometry

function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Text items in reading order coordinates.
 *
 * Each pdf.js item is placed with the viewport transform (so page /Rotate is
 * applied), then turned so the page's main text direction reads left to
 * right, top to bottom: a sheet printed sideways (Berryessa A9.2) comes out
 * the same as an upright one. Items in other directions (a 45-degree
 * watermark, a vertical sheet title) are dropped; they are never cells.
 *
 * @param {{items: Array<{str: string, transform: number[], width: number}>}} textContent
 * @param {{transform: number[]}} viewport - page.getViewport({ scale: 1 })
 * @returns {{items: Array<{s: string, x0: number, x1: number, y: number, size: number}>, direction: number, dropped: number, total: number}}
 */
export function textItemsFromContent(textContent, viewport) {
  const placed = [];
  const weightByDir = new Map();
  for (const it of (textContent && textContent.items) || []) {
    if (typeof it.str !== "string" || !it.str.trim()) continue;
    const m = mul(viewport.transform, it.transform);
    const dir = Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI);
    const size = Math.hypot(m[2], m[3]);
    if (!(size > 0)) continue;
    placed.push({ it, m, dir, size });
    // Counted in pieces, not characters: one long watermark string must not
    // outweigh a page of short cells.
    weightByDir.set(dir, (weightByDir.get(dir) || 0) + 1);
  }
  let direction = 0, best = -1;
  for (const [d, w] of weightByDir) if (w > best) { best = w; direction = d; }
  const a = direction * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
  const items = [];
  for (const p of placed) {
    if (p.dir !== direction) continue;
    const x = p.m[4] * ux + p.m[5] * uy;
    const y = -p.m[4] * uy + p.m[5] * ux;
    const s = p.it.str.replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"').replace(/\s+/g, " ").trim();
    items.push({ s, x0: x, x1: x + Math.abs(p.it.width || 0), y, size: p.size });
  }
  return { items, direction, dropped: placed.length - items.length, total: placed.length };
}

/**
 * Items grouped into lines (same baseline within a third of the text height),
 * top to bottom, each line's items left to right.
 */
export function groupLines(items) {
  const sorted = [...items].sort((p, q) => p.y - q.y || p.x0 - q.x0);
  const lines = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(it.y - last.y) <= 0.35 * Math.min(it.size, last.items[0].size)) {
      last.items.push(it);
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }
  for (const l of lines) {
    l.items.sort((p, q) => p.x0 - q.x0);
    l.size = median(l.items.map((i) => i.size));
    l.text = l.items.map((i) => i.s).join(" ");
  }
  return lines;
}

// Joins the items of one cell: pieces that touch are one word ("8400 10" X 1"
// LDW B" + "-CS"), anything else gets a space.
function joinItems(items) {
  let out = "", prev = null;
  for (const it of items) {
    if (prev && !(prev.y === it.y && it.x0 - prev.x1 < 0.15 * it.size)) out += " ";
    out += it.s;
    prev = it;
  }
  return out.replace(/\s+/g, " ").trim();
}

// Addendum revisions print the old value in parentheses next to the new one
// ("DBZ (628)", "39D (39A)", "SURFACE CLOSER (PA CLOSER W/SPRING STOP)"). A
// parenthesised run that is its own text piece, in a cell that also has an
// unbracketed value, is the struck value and is dropped. Parentheses inside a
// piece ("224HD (PREP'D FOR EPT)") or a cell that is only "(E)" are kept.
function dropSuperseded(items) {
  const keep = [];
  let open = false, dropped = 0;
  for (const it of items) {
    if (!open && /^\(/.test(it.s)) open = true;
    if (open) {
      dropped++;
      if (/\)$/.test(it.s)) open = false;
      continue;
    }
    keep.push(it);
  }
  return keep.length && dropped ? keep : items;
}

function splitWords(it) {
  const words = [];
  const per = it.s.length ? (it.x1 - it.x0) / it.s.length : 0;
  const re = /\S+/g;
  let m;
  while ((m = re.exec(it.s))) {
    words.push({ s: m[0], x0: it.x0 + per * m.index, x1: it.x0 + per * (m.index + m[0].length), y: it.y, size: it.size });
  }
  return words;
}

// ---------------------------------------------------------------- door schedule

// A door mark as it is printed in a schedule's first column: one token with a
// digit (001, 1J.1, 126.1.1, 144A, B12, 1-101). Sizes (3'-0"), ratings with
// spaces (90 MIN.), names and outline numbers ending in a period ("1.",
// "2.3.") do not qualify.
function isMarkToken(s) {
  return s.length >= 1 && s.length <= 10 && /\d/.test(s) && /^[A-Za-z0-9][A-Za-z0-9.\-\/]*$/.test(s) && !/\.$/.test(s) && !/^\d+\/\d+$/.test(s);
}

// Columns only a door schedule has. Material, finish and type columns are in
// every kind of schedule and legend, so they do not count.
const DOOR_ONLY_FIELDS = new Set(["width", "height", "size", "thickness", "hardware_group", "fire_rating", "frame_type", "frame_material", "frame_finish", "head_detail", "jamb_detail", "sill_detail", "panic_hardware"]);

// Column header text -> field. Checked most specific first; TYPE, MATERIAL and
// FINISH go to the door unless the header says FRAME (or the door's is taken).
function doorFieldFor(text, used) {
  const t = " " + text.toUpperCase().replace(/[^A-Z0-9#]+/g, " ") + " ";
  const has = (re) => re.test(t);
  const pick = (f) => (used.has(f) ? null : f);
  if (has(/ (CATALOG|PRODUCT|MODEL|PART|ITEM|SHEET|DWG|DRAWING|PROJECT|JOB|PHONE|SECTION|PAGE) /)) return null;
  if (has(/ (MARK|TAG|OPENING) /) || has(/ DOOR (NO|NUMBER|#) /) || has(/ (NO|NUMBER|#) /) && !has(/ (HARDWARE|HDW|SET|GROUP|ROOM|FRAME|DETAIL)/)) return pick("mark");
  if (has(/ STC /)) return pick("stc_rating");
  if (has(/ (HARDWARE|HDW|HW|GROUP) /) || has(/ SET /)) return pick("hardware_group");
  if (has(/ (FIRE|RATING|LABEL) /)) return pick("fire_rating");
  if (has(/ WIDTH /)) return pick("width");
  if (has(/ HEIGHT /)) return pick("height");
  if (has(/ (THICK|THICKNESS|THK) /)) return pick("thickness");
  if (has(/ SIZE /)) return pick("size");
  if (has(/ HEAD /)) return pick("head_detail");
  if (has(/ JAMB /)) return pick("jamb_detail");
  if (has(/ (SILL|THRES|THRESHOLD) /)) return pick("sill_detail");
  const frame = has(/ FRAME /) && !has(/ (DOOR|PANEL|LEAF) /);
  for (const [re, part] of [[/ TYPE /, "type"], [/ (MAT|MATL|MATERIAL) /, "material"], [/ (FIN|FINISH) /, "finish"]]) {
    if (!has(re)) continue;
    if (frame) return pick("frame_" + part);
    return pick("door_" + part) || pick("frame_" + part);
  }
  if (has(/ PANIC /)) return pick("panic_hardware");
  if (has(/ (GLAZ|GLAZING|GLASS) /)) return pick("glazing");
  if (has(/ PAIR /)) return pick("pair");
  if (has(/ (ROOM|LOCATION|FROM|SPACE) /)) return pick("room");
  if (has(/ (COMMENT|COMMENTS|REMARK|REMARKS|NOTE|NOTES) /)) return pick("notes");
  if (has(/ DETAILS? /)) return pick("details");
  return null;
}

// Left edges shared by several rows: [{x0, rows: Set of row indexes}].
function edgeClusters(rowLines, rowSize) {
  const lefts = [];
  rowLines.forEach((l, r) => { for (const it of l.items) lefts.push({ x: it.x0, r }); });
  lefts.sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const p of lefts) {
    const c = clusters[clusters.length - 1];
    if (c && p.x - c.last <= 0.4 * rowSize) { c.rows.add(p.r); c.last = p.x; }
    else clusters.push({ x0: p.x, last: p.x, rows: new Set([p.r]) });
  }
  return clusters;
}

// Columns of a table from where its data sits: x positions where rows start
// a cell (values in a column share their left edge). A column used by only a
// few rows (FIRE RATING on a sheet of mostly unrated doors) still counts when
// two rows use it. Two edges that never occur in the same row and overlap
// (a centred SIZE cell: "PR 3'-6" x 7'-10"..." and "3'-6" x 7'-10..." start a
// few points apart) are one column. Each column spans from its edge to the
// right its cells usually reach (the median end, so one long value does not
// stretch it under the next column's header).
//
// A header over x where no column's data sits names a column on its own (a
// FIRE RATING column with one rated door in 65): it starts halfway between
// the data to its left and the header.
function columnsFromRows(rowLines, rowSize, headerItems = []) {
  const clusters = edgeClusters(rowLines, rowSize).filter((c) => c.rows.size >= Math.min(2, rowLines.length));
  const cols = [];
  for (const c of clusters) cols.push({ x0: c.x0, x1: c.x0 + rowSize, rows: c.rows });
  const assign = () => {
    const ends = cols.map(() => []);
    for (const l of rowLines) for (const it of l.items) ends[dataColumn(cols, it, rowSize)].push(it.x1);
    cols.forEach((col, k) => {
      const e = ends[k].sort((a, b) => a - b);
      col.x1 = Math.max(col.x0 + rowSize, e.length ? e[Math.floor((e.length - 1) / 2)] : 0);
    });
  };
  assign();
  for (let i = cols.length - 1; i > 0; i--) {
    const a = cols[i - 1], b = cols[i];
    const together = [...b.rows].some((r) => a.rows.has(r));
    if (!together && a.x1 > b.x0) {
      for (const r of b.rows) a.rows.add(r);
      cols.splice(i, 1);
      assign();
    }
  }
  const fromHeader = [];
  for (const h of headerItems) {
    if (h.x0 < cols[0].x0 || cols.some((c) => Math.min(h.x1, c.x1) - Math.max(h.x0, c.x0) > 0)) continue;
    if (fromHeader.some((c) => Math.min(h.x1, c.x1) - Math.max(h.x0, c.x0) > 0)) continue;
    const left = cols.filter((c) => c.x1 <= h.x0).pop();
    fromHeader.push({ x0: left ? (left.x1 + h.x0) / 2 : h.x0, x1: h.x1, rows: new Set() });
  }
  if (fromHeader.length) {
    cols.push(...fromHeader);
    cols.sort((a, b) => a.x0 - b.x0);
    assign();
  }
  return cols;
}

// One text piece that runs across a column edge ("51 UTY-CUS -": a hardware
// set and the GLAZING dash exported as one string) is split into its words,
// and each word goes to its own column.
function splitAtColumns(it, edges, rowSize) {
  if (!edges.some((x) => x > it.x0 + 0.4 * rowSize && x < it.x1 - 0.2 * rowSize) || !/\s/.test(it.s)) return [it];
  const parts = [];
  for (const w of splitWords(it)) {
    let k = 0;
    for (let i = 0; i < edges.length; i++) if (edges[i] <= w.x0 + 0.4 * rowSize) k = i;
    const last = parts[parts.length - 1];
    if (last && last.k === k) { last.s += " " + w.s; last.x1 = w.x1; }
    else parts.push({ ...w, k });
  }
  return parts.map(({ k, ...rest }) => rest);
}

// A cell belongs to the last column whose edge is at or left of its start.
function dataColumn(cols, it, rowSize) {
  let k = 0;
  for (let i = 0; i < cols.length; i++) if (cols[i].x0 <= it.x0 + 0.4 * rowSize) k = i;
  return k;
}

// A header word belongs to the column whose span holds its centre (the
// rightmost one, when a long value in a column to the left reaches under it),
// else the nearest column (headers are often centred over the values).
function headerColumn(cols, x0, x1) {
  const cx = (x0 + x1) / 2;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < cols.length; i++) {
    const d = cx < cols[i].x0 ? cols[i].x0 - cx : cx > cols[i].x1 ? cx - cols[i].x1 : 0;
    if (d < bestD || (d === 0 && bestD === 0)) { bestD = d; best = i; }
  }
  return best;
}

// Candidate mark columns: x positions where a mark-like token starts a cell
// on several lines, split into runs wherever the line spacing jumps.
function markRuns(lines) {
  const anchors = [];
  lines.forEach((l, li) => {
    for (const it of l.items) {
      if (!isMarkToken(it.s)) continue;
      const tol = 0.3 * it.size;
      let a = anchors.find((x) => Math.abs(x.x - it.x0) <= tol);
      if (!a) { a = { x: it.x0, hits: [] }; anchors.push(a); }
      if (!a.hits.length || a.hits[a.hits.length - 1].li !== li) a.hits.push({ li, item: it });
    }
  });
  const runs = [];
  for (const a of anchors) {
    if (a.hits.length < 2) continue;
    const gaps = [];
    for (let i = 1; i < a.hits.length; i++) gaps.push(lines[a.hits[i].li].y - lines[a.hits[i - 1].li].y);
    const pitch = median(gaps);
    let cur = [a.hits[0]];
    const flush = () => { if (cur.length >= 2) runs.push({ x: a.x, hits: cur }); };
    for (let i = 1; i < a.hits.length; i++) {
      const gap = lines[a.hits[i].li].y - lines[a.hits[i - 1].li].y;
      if (gap > Math.max(3 * pitch, 4 * a.hits[i].item.size)) { flush(); cur = []; }
      cur.push(a.hits[i]);
    }
    flush();
  }
  return runs;
}

function buildDoorTable(lines, run) {
  const markItems = run.hits.map((h) => h.item);
  const rowSize = median(markItems.map((i) => i.size));
  const rowLis = run.hits.map((h) => h.li);
  // The table's width: the left edges most mark lines share, and how far
  // the cells starting there reach. A CAD sheet puts other drawings, legends
  // and the title block on some of the same baselines; those do not line up
  // row after row.
  const markLines = rowLis.map((li) => ({ items: lines[li].items.filter((it) => it.size <= 1.6 * rowSize) }));
  const need = rowLis.length < 4 ? rowLis.length : Math.max(2, Math.ceil(0.5 * rowLis.length));
  const strong = edgeClusters(markLines, rowSize).filter((c) => c.rows.size >= need);
  let tx0 = Math.min(...strong.map((c) => c.x0));
  let tx1 = -Infinity;
  for (const l of markLines) for (const it of l.items) if (it.x0 >= tx0 - 0.4 * rowSize && it.x0 <= strong[strong.length - 1].last + 0.4 * rowSize) tx1 = Math.max(tx1, it.x1);
  // A column few rows use (REMARKS on one door in three) still has its
  // header: the header row runs on, label after label, past the last column
  // most rows fill.
  const above = [];
  for (let li = rowLis[0] - 1, y = lines[rowLis[0]].y; li >= 0 && y - lines[li].y <= 3.2 * rowSize; li--) {
    above.push(...lines[li].items.filter((it) => it.size <= 1.6 * rowSize));
    y = lines[li].y;
  }
  above.sort((a, b) => a.x0 - b.x0);
  for (const it of above) if (it.x0 >= tx0 && it.x0 <= tx1 + 6 * rowSize) tx1 = Math.max(tx1, it.x1);
  for (const it of [...above].reverse()) if (it.x1 <= tx1 && it.x1 >= tx0 - 6 * rowSize) tx0 = Math.min(tx0, it.x0);
  // A line's items outside the table (a title block, a legend beside it) are
  // not cells.
  const within = (it) => it.size <= 1.6 * rowSize && it.x0 >= tx0 - 0.4 * rowSize && it.x0 <= tx1;
  const inLine = (li) => lines[li].items.filter(within);
  const rowLines = rowLis.map((li) => ({ y: lines[li].y, items: inLine(li) }));

  // Header: the lines just above the first row, while they stay close
  // together and inside the table.
  const headerLines = [];
  let title = null;
  let y = lines[rowLis[0]].y;
  for (let li = rowLis[0] - 1; li >= 0 && headerLines.length < 8; li--) {
    const its = inLine(li);
    const big = lines[li].items.filter((it) => it.size > 1.6 * rowSize && (it.x0 + it.x1) / 2 >= tx0 && (it.x0 + it.x1) / 2 <= tx1);
    if (big.length) { if (y - lines[li].y <= 4 * rowSize) title = big.map((it) => it.s).join(" "); break; }
    if (y - lines[li].y > 3.2 * rowSize) break;
    if (!its.length) continue;
    headerLines.unshift({ y: lines[li].y, items: its });
    y = lines[li].y;
  }
  const cols = columnsFromRows(rowLines, rowSize, headerLines.flatMap((hl) => hl.items));
  const markCol = dataColumn(cols, markItems[0], rowSize);
  const headerWords = cols.map(() => []);
  for (const hl of headerLines) for (const it of hl.items) for (const w of splitWords(it)) {
    headerWords[headerColumn(cols, w.x0, w.x1)].push(w);
  }
  const headerText = headerWords.map((ws) => ws.sort((p, q) => p.y - q.y || p.x0 - q.x0).map((w) => w.s).join(" "));
  const used = new Set();
  const fields = cols.map(() => null);
  // The mark column first: it is known from the data, whatever its header says.
  fields[markCol] = "mark"; used.add("mark");
  headerText.forEach((t, i) => {
    if (i === markCol || !t) return;
    const f = doorFieldFor(t, used);
    if (f) { fields[i] = f; used.add(f); }
  });

  // Rows: each mark line starts a row; lines between two mark lines (a
  // wrapped comment) belong to the row above. After the last mark line,
  // wrapped lines follow at line spacing, and the table ends at the first
  // wider gap or at text in the mark column.
  const pitch = median(rowLis.slice(1).map((li, i) => lines[li].y - lines[rowLis[i]].y)) || 2 * rowSize;
  const rows = [];
  const lastLi = rowLis[rowLis.length - 1];
  let endLi = lastLi;
  for (let li = lastLi + 1; li < lines.length; li++) {
    const its = inLine(li);
    if (!its.length) continue;
    if (lines[li].y - lines[endLi].y > Math.min(1.5 * pitch, 1.6 * rowSize)) break;
    if (its.some((it) => dataColumn(cols, it, rowSize) === markCol)) break;
    endLi = li;
  }
  for (let r = 0; r < rowLis.length; r++) {
    const from = rowLis[r], to = r + 1 < rowLis.length ? rowLis[r + 1] - 1 : endLi;
    const cells = cols.map(() => []);
    for (let li = from; li <= to; li++) {
      for (const piece of inLine(li)) {
        for (const it of splitAtColumns(piece, cols.map((c) => c.x0), rowSize)) cells[dataColumn(cols, it, rowSize)].push(it);
      }
    }
    const row = { _line: from, _y: lines[from].y };
    cells.forEach((c, i) => {
      const key = fields[i] || "col_" + i;
      const text = joinItems(dropSuperseded(c));
      if (text) row[key] = row[key] ? row[key] + " " + text : text;
    });
    row.mark = markItems[r].s;
    rows.push(row);
  }
  return {
    rows,
    fields,
    title,
    header_text: headerText,
    bbox: { x0: tx0, x1: tx1, y0: headerLines.length ? headerLines[0].y : lines[rowLis[0]].y, y1: lines[endLi].y },
    score: 0,
  };
}

// "PR 3'-6" x 7'-10" x 1-3/4"" (Berryessa prints a door's size as one cell):
// pair flag, width, height and thickness as printed.
export function splitSizeCell(text) {
  let t = String(text || "").trim();
  const pair = /^(PR|PAIR|\(2\))\b\.?\s*/i.test(t);
  if (pair) t = t.replace(/^(PR|PAIR|\(2\))\b\.?\s*/i, "");
  const parts = t.split(/\s+[xX×]\s+|\s*[×]\s*/).map((s) => s.trim()).filter(Boolean);
  return { pair, width: parts[0] || null, height: parts[1] || null, thickness: parts[2] || null };
}

/**
 * Door schedule rows from one page's text items.
 * @returns {{tables: Array<{rows: object[], fields: string[], header_text: string[]}>, rows: object[]}}
 *   rows: raw cell text keyed by field (mark, hardware_group, fire_rating,
 *   width, height, thickness, door_type, door_material, door_finish,
 *   frame_type, frame_material, frame_finish, head_detail, jamb_detail,
 *   sill_detail, room, notes, ...), plus pair when the schedule says so.
 */
export function readDoorScheduleText(items) {
  const lines = groupLines(items);
  const candidates = [];
  for (const run of markRuns(lines)) {
    const marks = run.hits.map((h) => h.item.s.toUpperCase());
    const distinct = new Set(marks).size;
    // Marks are unique within a schedule; a column of repeated short codes
    // (hardware group "2", rating "120") is not the mark column.
    if (distinct < Math.max(2, 0.8 * marks.length)) continue;
    const table = buildDoorTable(lines, run);
    const named = table.fields.filter((f) => f && f !== "mark").length;
    const doorOnly = table.fields.filter((f) => DOOR_ONLY_FIELDS.has(f)).length;
    const markText = table.header_text[table.fields.indexOf("mark")] || "";
    // The mark column's own header says so (and is not a catalog or model
    // number column on a hardware page)...
    const markHeader = doorFieldFor(markText, new Set()) === "mark";
    // ...and the table names columns only a door schedule has: one under a
    // mark header, three without one. Numbered spec paragraphs, finish
    // legends and hardware item lines fail this.
    if (named < 2 || doorOnly < (markHeader ? 1 : 3)) continue;
    const other = /\b(WINDOW|STOREFRONT|LOUVER|ROOM|FINISH|EQUIPMENT|FIXTURE|PANEL|SIGN)\b/i;
    if (other.test(markText) && !/\bDOOR|OPENING\b/i.test(markText)) continue;
    if (table.title && /SCHEDULE/i.test(table.title) && !/DOOR|OPENING|FRAME/i.test(table.title)) continue;
    table.score = distinct * (1 + named / 10) + (markHeader ? distinct : 0);
    candidates.push(table);
  }
  candidates.sort((p, q) => q.score - p.score);
  const tables = [];
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
  for (const t of candidates) if (!tables.some((u) => overlaps(u.bbox, t.bbox))) tables.push(t);
  tables.sort((p, q) => p.bbox.y0 - q.bbox.y0 || p.bbox.x0 - q.bbox.x0);
  const rows = [];
  for (const t of tables) {
    for (const r of t.rows) {
      if (r.size && !r.width && !r.height) {
        const s = splitSizeCell(r.size);
        r.width = s.width; r.height = s.height;
        if (!r.thickness && s.thickness) r.thickness = s.thickness;
        if (s.pair && !r.pair) r.pair = "PR";
      }
      rows.push(r);
    }
  }
  return { tables, rows };
}

// ---------------------------------------------------------------- hardware groups

const HEADING_RE = /^(?:(?:hardware|hdw\.?|hw)\s*(?:group|set|heading)|(?:group|set|heading))\s*(?:no\.?|number|#)?\s*[:#.]?\s*(\S.*)$/i;
const UOM_RE = /^(EA|EA\.|EACH|SET|SETS|PR|PAIR|PRS|LF|LOT)$/i;
const HW_HEADER_WORDS = /\b(QTY|QUANTITY|DESCRIPTION|CATALOG|PRODUCT|MODEL|FIN|FINISH|MFR|MFG|MAN|MANUFACTURER)\b/gi;

function parseHeading(text) {
  const m = text.match(HEADING_RE);
  if (!m) return null;
  const rest = m[1].replace(/\s+/g, " ").trim();
  if (!/\d/.test(rest.split(" ")[0])) return null;
  // "01-CARD READER EXTERIOR ..." is set 01 with a name; "02 RR-M" (Rockford)
  // is cited whole on the drawings and stays whole.
  const named = rest.match(/^([A-Za-z]?\d+[A-Za-z]?(?:\.\d+)?)\s*[-–:]\s*(\S.*\s.*)$/);
  if (named) return { group_number: named[1], group_name: named[2] };
  return { group_number: rest, group_name: null };
}

function qtyOf(line) {
  const first = line.items[0];
  if (!first) return null;
  const m = first.s.match(/^(\d{1,3})(?:\s+(EA\.?|EACH|SET|PR|PAIR|LF))?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 && n < 1000 ? { n, uom: m[2] ? m[2].toUpperCase().replace(".", "") : null } : null;
}

function isHeaderLine(line) {
  const found = new Set((line.text.match(HW_HEADER_WORDS) || []).map((w) => w.toUpperCase()));
  return found.size >= 3;
}

function doorListOf(line) {
  const t = line.text.replace(/^(doors?\s*(?:#|no\.?|numbers?)?\s*:?)\s*/i, "");
  if (t === line.text && !line.items.every((it) => isMarkToken(it.s))) return null;
  const marks = t.split(/[\s,;&]+/).map((s) => s.trim()).filter(Boolean);
  return marks.length && marks.every(isMarkToken) ? marks : null;
}

/**
 * Hardware groups (sets) from one page's text items: spec text with no rules
 * (Section 08 71 00 as Rockford and Berryessa print it) and ruled set tables
 * (Christina) alike.
 * @returns {{hardware_groups: object[], door_hardware_matrix: object[], item_lines: number}}
 */
export function readHardwareGroupsText(items) {
  const lines = groupLines(items);
  const groups = [];
  let open = null;
  const headerAt = [];
  const itemLines = [];
  lines.forEach((l, li) => {
    const h = parseHeading(l.text);
    if (h) { l.kind = "heading"; l.heading = h; return; }
    if (isHeaderLine(l)) { l.kind = "header"; headerAt.push(li); return; }
    if (qtyOf(l) && l.items.length >= 3) { l.kind = "item"; itemLines.push(l); }
  });
  if (!lines.some((l) => l.kind === "heading") || !itemLines.length) {
    return { hardware_groups: [], door_hardware_matrix: [], item_lines: itemLines.length };
  }

  // Column anchors: left edges shared by many item lines.
  const lefts = [];
  for (const l of itemLines) for (const it of l.items) lefts.push({ x: it.x0, size: it.size });
  lefts.sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const p of lefts) {
    const c = clusters[clusters.length - 1];
    if (c && p.x - c.last <= 0.4 * p.size) { c.n++; c.sum += p.x; c.last = p.x; }
    else clusters.push({ n: 1, sum: p.x, last: p.x });
  }
  const anchors = clusters.filter((c) => c.n >= Math.max(2, 0.35 * itemLines.length)).map((c) => c.sum / c.n);
  if (anchors.length < 3) return { hardware_groups: [], door_hardware_matrix: [], item_lines: itemLines.length };
  const colOf = (it) => {
    let k = 0;
    for (let i = 0; i < anchors.length; i++) if (anchors[i] <= it.x0 + 0.4 * it.size) k = i;
    return k;
  };

  // Which column is which: from a header line when there is one (a label
  // belongs to the column whose span its centre falls in), else by order.
  const role = anchors.map(() => null);
  const uomCol = anchors.findIndex((_, i) => {
    const vals = itemLines.map((l) => l.items.find((it) => colOf(it) === i)).filter(Boolean);
    return i > 0 && vals.length >= 2 && vals.filter((it) => UOM_RE.test(it.s)).length >= 0.8 * vals.length;
  });
  role[0] = "quantity";
  if (uomCol > 0) role[uomCol] = "uom";
  const headerLine = headerAt.length ? lines[headerAt[0]] : null;
  if (headerLine) {
    for (const it of headerLine.items) for (const w of splitWords(it)) {
      const u = w.s.toUpperCase();
      const f = /^(QTY|QUANTITY)$/.test(u) ? "quantity" : /^DESCRIPTION$/.test(u) ? "description"
        : /^(CATALOG|PRODUCT|MODEL)$/.test(u) ? "product_number" : /^(FIN|FINISH)$/.test(u) ? "finish"
        : /^(MFR|MFG|MAN|MANUFACTURER)$/.test(u) ? "manufacturer" : null;
      if (!f) continue;
      const cx = (w.x0 + w.x1) / 2;
      let k = 0;
      for (let i = 0; i < anchors.length; i++) if (anchors[i] <= cx) k = i;
      if (!role[k] && !role.includes(f)) role[k] = f;
    }
  }
  // Columns still unnamed take, in print order, description, catalog, finish,
  // manufacturer. With more unnamed columns than that, the extras are pieces
  // of the catalog cell (a model number printed in parts) and the last two
  // are finish and manufacturer.
  const free = role.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
  const need = ["description", "product_number", "finish", "manufacturer"].filter((f) => !role.includes(f));
  if (free.length > need.length && need.length === 4) {
    role[free[0]] = "description";
    role[free[free.length - 1]] = "manufacturer";
    role[free[free.length - 2]] = "finish";
    for (const i of free) if (!role[i]) role[i] = "product_number";
  } else {
    need.forEach((f, j) => { if (j < free.length) role[free[j]] = f; });
    for (const i of free) if (!role[i]) role[i] = role.slice(0, i).filter(Boolean).pop() || "notes";
  }

  const close = () => { if (open) groups.push(open); open = null; };
  let cur = null, lastY = null, pitch = median(itemLines.slice(1).map((l, i) => l.y - itemLines[i].y).filter((g) => g > 0)) || 14;
  let inList = false;
  for (const l of lines) {
    if (l.kind === "heading") {
      close();
      open = { group_number: l.heading.group_number, group_name: l.heading.group_name, assigned_doors: [], components: [] };
      cur = null; inList = false; lastY = l.y;
      continue;
    }
    if (!open) continue;
    if (l.kind === "header") { inList = true; lastY = l.y; continue; }
    if (l.kind === "item") {
      const q = qtyOf(l);
      const cells = {};
      for (const it of l.items) (cells[role[colOf(it)] || "notes"] = cells[role[colOf(it)] || "notes"] || []).push(it);
      cur = { cells, quantity: q.n, uom: q.uom };
      open.components.push(cur);
      inList = true; lastY = l.y;
      continue;
    }
    if (!inList) {
      // Door marks are listed under the heading, before the items; after the
      // items, a code on its own line is a footer or a note, not a door.
      const doors = open.components.length ? null : doorListOf(l);
      if (doors) { open.assigned_doors.push(...doors); lastY = l.y; }
      continue;
    }
    // A wrapped cell: close below the line above, every piece inside its own
    // column. Text that runs across columns (a note under the set, a page
    // footer) ends the item list.
    const near = lastY != null && l.y - lastY <= 1.6 * pitch;
    const fits = l.items.every((it) => {
      const k = colOf(it);
      return k + 1 >= anchors.length || it.x1 <= anchors[k + 1] + 0.6 * it.size;
    });
    if (cur && near && fits) {
      const cells = {};
      for (const it of l.items) (cells[role[colOf(it)] || "notes"] = cells[role[colOf(it)] || "notes"] || []).push(it);
      // A description wraps onto the lines right below it. Description text
      // after a line that had none is the next item, printed without a
      // quantity (Christina: "RELAY MODULE" under AUTO DOOR OPERATOR's
      // wrapped catalog line).
      if (cells.description && cur.descriptionDone) {
        cur = { cells, quantity: null, uom: null };
        open.components.push(cur);
      } else {
        for (const [f, its] of Object.entries(cells)) (cur.cells[f] = cur.cells[f] || []).push(...its);
        if (!cells.description) cur.descriptionDone = true;
      }
      lastY = l.y;
      continue;
    }
    inList = false; cur = null;
  }
  close();

  const text = (c, f) => joinItems(dropSuperseded(c.cells[f] || [])) || null;
  const hardware_groups = groups.map((g) => ({
    group_number: g.group_number,
    group_name: g.group_name,
    assigned_doors: g.assigned_doors,
    components: g.components.map((c) => ({
      component_type: text(c, "description"),
      quantity: c.quantity,
      uom: (text(c, "uom") || c.uom || "EA").toUpperCase().replace(/\.$/, ""),
      manufacturer: text(c, "manufacturer"),
      model_number: text(c, "product_number"),
      finish: text(c, "finish"),
      notes: text(c, "notes"),
    })),
  })).filter((g) => g.components.length || g.assigned_doors.length);
  const door_hardware_matrix = [];
  for (const g of hardware_groups) for (const d of g.assigned_doors) door_hardware_matrix.push({ door_number: d, hardware_set_number: g.group_number, confidence: 0.95 });
  return { hardware_groups, door_hardware_matrix, item_lines: itemLines.length, columns: anchors.map((x, i) => ({ x: Math.round(x * 10) / 10, role: role[i] })) };
}
