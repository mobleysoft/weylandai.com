// tools/accuracy/truth/agree.mjs
//
// The agreement scorer (2026-10-09). Two readers' rows for the same PDF are aligned and compared
// field by field after normalising what printing varies (case, spacing, punctuation, maker names
// against maker codes, fire ratings in minutes or hours):
//   doors:  aligned by page + mark; fields width_inches, height_inches, door_type, material,
//           fire_rating, hardware_group, location
//   groups: aligned by set (its first token, leading zeros dropped: "06 CL" = "6", "19F STO" = "19F");
//           the set's door list compared as a set of marks; items aligned within the set by catalog
//           number, then description; fields qty, description, catalog, finish, manufacturer
// A row both readers have and agree on in every compared field is AGREED (accepted truth); a row
// they read differently, or only one of them read, is DISPUTED and goes to the queue.
// The same normalisers score a reader or the agreed rows against expected rows (calibration).

export const UP = (s) => String(s == null ? "" : s).toUpperCase().trim();
export const N = {
  mark: (s) => UP(s).replace(/\s+/g, "").replace(/[–—]/g, "-").replace(/\[P\.\d+\]$/, ""),
  text: (s) => UP(s).replace(/[’‘]/g, "'").replace(/[^A-Z0-9]+/g, " ").trim(),
  cat: (s) => UP(s).replace(/[^A-Z0-9]+/g, ""),
  num: (v) => (v == null || v === "" || Number.isNaN(+v) ? "" : String(Math.round(+v * 100) / 100)),
  set: (s) => { const t = UP(s).replace(/^(HARDWARE\s+)?(GROUP|SET|HW|HDW)\s*(NO\.?|#)?\s*/, "").split(/[\s\-–:]+/)[0] || ""; return t.replace(/^0+(?=[0-9A-Z])/, ""); },
  fire: (s) => {
    const t = UP(s).replace(/\s+/g, " ");
    if (!t || /^(-+|—|N\/?A|NONE|NR|N\.R\.|NON[- ]?RATED|NOT RATED|0)$/.test(t)) return "";
    let m = t.match(/^(\d{1,3})\s*(?:MIN(?:UTES?|S)?\.?|M)?$/);
    if (m) return String(+m[1]);
    m = t.match(/^(\d)(?:[-\s](\d)\/(\d))?\s*(?:HR|HRS|HOUR|HOURS)\.?$/) || t.match(/^()(\d)\/(\d)\s*(?:HR|HRS|HOUR|HOURS)\.?$/);
    if (m) return String(Math.round(((m[1] ? +m[1] : 0) + (m[2] ? +m[2] / +m[3] : 0)) * 60));
    return t.replace(/[^A-Z0-9]+/g, " ").trim();
  },
  mfr: (s) => { const t = UP(s).replace(/[^A-Z\/ ]+/g, " ").replace(/\s+/g, " ").trim(); return MAKERS[t] || t; },
};
// Maker names as specs print them, to the industry code.
const MAKERS = {
  IVES: "IVE", "IVES HARDWARE": "IVE", SCHLAGE: "SCH", LCN: "LCN", "VON DUPRIN": "VON", VD: "VON", VON: "VON",
  ZERO: "ZER", "ZERO INTERNATIONAL": "ZER", SELECT: "SEL", "SELECT PRODUCTS": "SEL", GLYNN: "GLY", "GLYNN JOHNSON": "GLY", "GLYNN-JOHNSON": "GLY",
  "NATIONAL GUARD": "NGP", "NATIONAL GUARD PRODUCTS": "NGP", TRIMCO: "TRM", DORMA: "DOR", "BY OTHERS": "B/O", SARGENT: "SAR", CORBIN: "COR", "CORBIN RUSSWIN": "RUS",
  PEMKO: "PEM", ROCKWOOD: "ROC", HAGER: "HAG", STANLEY: "STA", MCKINNEY: "MCK", FALCON: "FAL", "NORTON": "NOR", RIXSON: "RIX", BEST: "BES",
};

export const DOOR_FIELDS = ["width_inches", "height_inches", "door_type", "material", "fire_rating", "hardware_group", "location"];
export const ITEM_FIELDS = ["qty", "description", "catalog", "finish", "manufacturer"];
const doorNorm = { width_inches: N.num, height_inches: N.num, door_type: N.text, material: N.text, fire_rating: N.fire, hardware_group: N.text, location: N.text, quantity: N.num };
// g050: the two readers' rows also agree on QUANTITY (how many openings a range or stacked-mark row
// stands for); absent on both sides when the schedule has no such column. Expected files carry no
// quantity, so scoring against them keeps DOOR_FIELDS.
export const ROW_FIELDS = [...DOOR_FIELDS, "quantity"];
const itemNorm = { qty: N.num, description: N.text, catalog: N.cat, finish: N.text, manufacturer: N.mfr };

function compare(a, b, fields, norms) {
  const out = {};
  for (const f of fields) {
    const na = norms[f](a ? a[f] : null), nb = norms[f](b ? b[f] : null);
    out[f] = { a: a ? a[f] ?? null : null, b: b ? b[f] ?? null : null, agree: na === nb, empty: !na && !nb };
  }
  return out;
}

/** Hardware groups of a whole PDF in page order: a group continued onto the next page is joined to its start. */
export function mergeGroups(pageGroups) {
  const out = [];
  for (const { page, groups } of pageGroups) {
    for (const g of groups) {
      const prev = out[out.length - 1];
      if (prev && (g.set === "(continued)" || N.set(g.set) === N.set(prev.set))) { prev.items.push(...g.items); prev.doors.push(...g.doors.filter((d) => !prev.doors.includes(d))); prev.pages.includes(page) || prev.pages.push(page); continue; }
      out.push({ ...g, items: [...g.items], doors: [...g.doors], pages: [page] });
    }
  }
  return out;
}

export function alignDoors(A, B) {
  // A and B: [{ page, ...door }]
  const key = (d) => d.page + "|" + N.mark(d.mark);
  const bBy = new Map();
  for (const d of B) { const k = key(d); if (!bBy.has(k)) bBy.set(k, []); bBy.get(k).push(d); }
  const rows = [];
  for (const a of A) {
    const list = bBy.get(key(a));
    const b = list && list.length ? list.shift() : null;
    rows.push(rowOf("door", a.page, a.mark, a, b, ROW_FIELDS, doorNorm));
  }
  for (const list of bBy.values()) for (const b of list) rows.push(rowOf("door", b.page, b.mark, null, b, ROW_FIELDS, doorNorm));
  return rows;
}

function rowOf(kind, page, key, a, b, fields, norms) {
  const fieldsCmp = compare(a, b, fields, norms);
  const status = !a ? "only_b" : !b ? "only_a" : Object.values(fieldsCmp).every((f) => f.agree) ? "agreed" : "disputed";
  return { kind, page, key, status, fields: fieldsCmp, a, b };
}

function itemScore(x, y) {
  let s = 0;
  const cx = N.cat(x.catalog), cy = N.cat(y.catalog);
  if (cx && cx === cy) s += 3;
  else if (cx.length >= 4 && cy.length >= 4 && (cx.startsWith(cy) || cy.startsWith(cx))) s += 2;
  if (N.text(x.description) && N.text(x.description) === N.text(y.description)) s += 2;
  else if (N.text(x.description) && N.text(y.description) && N.text(x.description).split(" ")[0] === N.text(y.description).split(" ")[0]) s += 0.7;
  if (N.num(x.qty) === N.num(y.qty)) s += 0.4;
  if (N.text(x.finish) === N.text(y.finish)) s += 0.2;
  return s;
}
export function matchItems(xs, ys, min = 2) {
  const used = new Set();
  const pairs = [];
  for (const x of xs) {
    let best = -1, bs = 0;
    ys.forEach((y, j) => { if (used.has(j)) return; const s = itemScore(x, y); if (s > bs) { bs = s; best = j; } });
    if (best >= 0 && bs >= min) { used.add(best); pairs.push([x, ys[best]]); } else pairs.push([x, null]);
  }
  ys.forEach((y, j) => { if (!used.has(j)) pairs.push([null, y]); });
  return pairs;
}

export function alignGroups(GA, GB) {
  const rows = [];
  const groupRows = [];
  // A set number can be printed twice (one set per door, the same number): pair them in order.
  const bBy = new Map();
  for (const g of GB) { const k = N.set(g.set); if (!bBy.has(k)) bBy.set(k, []); bBy.get(k).push(g); }
  const used = new Set();
  for (const ga of GA) {
    const k = N.set(ga.set);
    const list = bBy.get(k) || [];
    // Prefer the B set on the same page, else the first unused one.
    const gb = list.find((g) => !used.has(g) && (g.pages || [])[0] === (ga.pages || [])[0]) || list.find((g) => !used.has(g)) || null;
    if (gb) used.add(gb);
    groupRows.push(groupRow(k, ga, gb));
    for (const [a, b] of matchItems(ga.items, gb ? gb.items : [])) rows.push(rowOf("item", (ga.pages || [])[0] ?? null, k + " / " + ((a || b).catalog || (a || b).description || "?"), a, b, ITEM_FIELDS, itemNorm));
  }
  for (const gb of GB) {
    if (used.has(gb)) continue;
    const k = N.set(gb.set);
    groupRows.push(groupRow(k, null, gb));
    for (const b of gb.items) rows.push(rowOf("item", (gb.pages || [])[0] ?? null, k + " / " + (b.catalog || b.description || "?"), null, b, ITEM_FIELDS, itemNorm));
  }
  return { rows, groupRows };
}
function groupRow(k, ga, gb) {
  const da = ga ? [...new Set(ga.doors.map(N.mark))].sort() : [], db = gb ? [...new Set(gb.doors.map(N.mark))].sort() : [];
  const doorsAgree = da.join(",") === db.join(",");
  return { kind: "group", key: k, status: !ga ? "only_b" : !gb ? "only_a" : doorsAgree ? "agreed" : "disputed", doors_a: da, doors_b: db, items_a: ga ? ga.items.length : 0, items_b: gb ? gb.items.length : 0 };
}

/** Summary of aligned rows: counts and per-field agreement over the rows both readers have. */
export function summarize(rows) {
  const s = { rows: rows.length, agreed: 0, disputed: 0, only_a: 0, only_b: 0, fields: {} };
  for (const r of rows) {
    s[r.status]++;
    if (r.a && r.b) for (const [f, v] of Object.entries(r.fields)) { if (v.empty) continue; const x = (s.fields[f] ||= { agree: 0, total: 0 }); x.total++; if (v.agree) x.agree++; }
  }
  s.agreement_rate = s.rows ? +(s.agreed / s.rows).toFixed(4) : null;
  return s;
}

/** Disagreements as queue entries. */
export function disagreements(rows, groupRows = []) {
  const out = [];
  for (const r of rows) {
    if (r.status === "agreed") continue;
    if (r.status === "only_a" || r.status === "only_b") out.push({ kind: r.kind, page: r.page, key: r.key, field: "(row)", a: r.a ? "read" : null, b: r.b ? "read" : null, why: r.status === "only_a" ? "only reader A read this row" : "only reader B read this row" });
    else for (const [f, v] of Object.entries(r.fields)) if (!v.agree) out.push({ kind: r.kind, page: r.page, key: r.key, field: f, a: v.a, b: v.b });
  }
  for (const g of groupRows) if (g.status !== "agreed") out.push({ kind: "group", page: null, key: g.key, field: g.status === "disputed" ? "doors" : "(set)", a: g.status === "only_b" ? null : g.doors_a.join(", "), b: g.status === "only_a" ? null : g.doors_b.join(", "), why: g.status === "only_a" ? "only reader A read this set" : g.status === "only_b" ? "only reader B read this set" : "the set's door lists differ" });
  return out;
}

// ---------------------------------------------------------------- calibration against expected rows

const expDoor = (e) => ({ mark: e.mark, width_inches: e.width_inches ?? null, height_inches: e.height_inches ?? null, door_type: e.door_type ?? null, material: e.door_material ?? e.material ?? null, fire_rating: e.fire_rating ?? null, hardware_group: e.hardware_group ?? null, location: e.room ?? e.location ?? null });
const expItem = (e) => ({ qty: e.qty, description: e.description, catalog: e.catalog, finish: e.finish, manufacturer: e.mfr, superseded: e.superseded || null });

/** Score door rows (any source) against an expected door file, on the expected pages. Only the fields the expected file states are scored. */
export function scoreDoorsVs(expected, rows, fields = DOOR_FIELDS) {
  const pages = expected.source.pages;
  const pool = rows.filter((r) => pages.includes(r.page)).map((r) => ({ r, used: false }));
  let found = 0, right = 0, total = 0, rowsRight = 0;
  const perField = {};
  const wrong = [];
  for (const e0 of expected.doors) {
    const e = expDoor(e0), page = e0.page ?? pages[0];
    const hit = pool.find((p) => !p.used && p.r.page === page && N.mark(p.r.mark) === N.mark(e.mark));
    if (!hit) { wrong.push({ key: e.mark, page, field: "(row)", expected: "row", read: null }); continue; }
    hit.used = true; found++;
    let allRight = true;
    for (const f of fields) {
      if (f === "location" && !("room" in e0) && !("location" in e0)) continue;
      if (f === "material" && !("door_material" in e0) && !("material" in e0)) continue;
      const ok = doorNorm[f](hit.r[f]) === doorNorm[f](e[f]);
      const x = (perField[f] ||= { right: 0, total: 0 }); x.total++; total++;
      if (ok) { x.right++; right++; } else { allRight = false; wrong.push({ key: e.mark, page, field: f, expected: e[f], read: hit.r[f] ?? null }); }
    }
    if (allRight) rowsRight++;
  }
  return { expected_rows: expected.doors.length, rows_found: found, rows_fully_right: rowsRight, fields_right: right, fields_total: total, per_field: perField, extra_rows: pool.filter((p) => !p.used).length, wrong };
}

export function scoreGroupsVs(expected, groups) {
  let itemsExp = 0, found = 0, right = 0, total = 0, rowsRight = 0, groupsFound = 0;
  const perField = {};
  const wrong = [];
  for (const g of expected.groups) {
    const k = N.set(g.group);
    const got = groups.find((x) => N.set(x.set) === k);
    const exp = g.items.filter((i) => !i.catalog_uncertain).map(expItem);
    itemsExp += exp.length;
    if (!got) { wrong.push({ key: k, field: "(set)", expected: "set", read: null }); continue; }
    groupsFound++;
    for (const [e, r] of matchItems(exp, got.items, 1.5)) {
      if (!e) continue;
      if (!r) { wrong.push({ key: k + " / " + (e.catalog || e.description), field: "(row)", expected: "row", read: null }); continue; }
      found++;
      let allRight = true;
      // An addendum's struck value (expected 'superseded', as tools/accuracy/schedule_read_accuracy.mjs scores it) counts as right too.
      const sup = e.superseded || {};
      for (const f of ITEM_FIELDS) {
        const supV = f === "manufacturer" ? sup.mfr : sup[f];
        const ok = itemNorm[f](r[f]) === itemNorm[f](e[f]) || (supV != null && itemNorm[f](r[f]) === itemNorm[f](supV));
        const x = (perField[f] ||= { right: 0, total: 0 }); x.total++; total++;
        if (ok) { x.right++; right++; } else { allRight = false; wrong.push({ key: k + " / " + (e.catalog || e.description), field: f, expected: e[f], read: r[f] ?? null }); }
      }
      if (allRight) rowsRight++;
    }
  }
  return { expected_groups: expected.groups.length, groups_found: groupsFound, expected_rows: itemsExp, rows_found: found, rows_fully_right: rowsRight, fields_right: right, fields_total: total, per_field: perField, wrong };
}

/**
 * Field-level calibration of the agreement method: over rows both readers read that match an
 * expected row, how often a field the readers AGREE on (non-empty) is right, and for the fields
 * they DISPUTE, which reader was right.
 */
export function calibrateFields(expected, rows) {
  const out = { agreed: { right: 0, total: 0 }, disputed: { total: 0, a_right: 0, b_right: 0, neither: 0 }, agreed_wrong: [] };
  const tally = (f, r, e, norm) => {
    const v = r.fields[f];
    if (!v) return;
    const ne = norm(e);
    if (v.agree) { if (v.empty && !ne) return; out.agreed.total++; if (norm(r.a[f]) === ne) out.agreed.right++; else out.agreed_wrong.push({ key: r.key, page: r.page, field: f, expected: e ?? null, agreed: r.a[f] ?? null }); }
    else { out.disputed.total++; const ar = norm(r.a[f]) === ne, br = norm(r.b[f]) === ne; if (ar) out.disputed.a_right++; if (br) out.disputed.b_right++; if (!ar && !br) out.disputed.neither++; }
  };
  if (expected.schedule_type === "door_schedule") {
    const pages = expected.source.pages;
    for (const e0 of expected.doors) {
      const e = expDoor(e0), page = e0.page ?? pages[0];
      const r = rows.find((x) => x.kind === "door" && x.a && x.b && x.page === page && N.mark(x.key) === N.mark(e.mark));
      if (!r) continue;
      for (const f of DOOR_FIELDS) {
        if (f === "location" && !("room" in e0) && !("location" in e0)) continue;
        if (f === "material" && !("door_material" in e0) && !("material" in e0)) continue;
        tally(f, r, e[f], doorNorm[f]);
      }
    }
  } else {
    for (const g of expected.groups) {
      const k = N.set(g.group);
      const cand = rows.filter((x) => x.kind === "item" && x.a && x.b && x.key.startsWith(k + " / ") && (!g.page || x.page == null || Math.abs(x.page - g.page) <= 1)).map((x) => ({ ...x.a, _r: x }));
      const exp = g.items.filter((i) => !i.catalog_uncertain).map(expItem);
      for (const [e, c] of matchItems(exp, cand, 1.5)) {
        if (!e || !c) continue;
        const sup = e.superseded || {};
        for (const f of ITEM_FIELDS) {
          const supV = f === "manufacturer" ? sup.mfr : sup[f];
          // A struck value is right too: score against whichever of the two the agreed value equals.
          const target = supV != null && itemNorm[f](c._r.a[f]) === itemNorm[f](supV) ? supV : e[f];
          tally(f, c._r, target, itemNorm[f]);
        }
      }
    }
  }
  out.agreed_wrong = out.agreed_wrong.slice(0, 20);
  return out;
}
