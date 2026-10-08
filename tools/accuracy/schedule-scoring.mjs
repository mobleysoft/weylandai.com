// Scoring rules shared by the schedule-reading harnesses (2026-10-08):
// schedule_read_accuracy.mjs (the live API, as the SubX workspace calls it) and
// schedule_text_layer_accuracy.mjs (the text-layer reader run in Node against
// the same PDFs). One set of rules, so the two reports mean the same thing.
//
// Doors are matched by mark within their page; items by catalog/description
// similarity within the expected group. Expected rows: tools/corpus/expected.

export const up = (s) => String(s == null ? "" : s).trim().toUpperCase();
export const normMark = (s) => up(s).replace(/\s+/g, "");
export const normGroup = (s) => up(s).replace(/[\s_]+/g, " ").replace(/^0+(?=\d)/, "").trim();
export const normFire = (s) => up(s).replace(/[.,;:\s]+/g, "").replace(/MINUTES?$|MINS?$/, "MIN");
export const normText = (s) => up(s).replace(/[^A-Z0-9]+/g, " ").trim();
export const normCat = (s) => up(s).replace(/[^A-Z0-9]+/g, "");
export const same = (a, b) => (a == null || a === "") && (b == null || b === "") ? true : a != null && b != null && String(a) === String(b);
export function editDistance(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export const DOOR_FIELDS = ["mark", "hardware_group", "width_inches", "height_inches", "fire_rating", "door_type"];
export function scoreDoors(expectedDoc, found) {
  // Berryessa repeats tag numbers on each sheet: rows are matched within their page.
  const byPage = new Map();
  for (const d of found) { const p = (d.source && d.source.page) || d.page_number; if (!byPage.has(p)) byPage.set(p, []); byPage.get(p).push({ ...d, _used: false }); }
  const perField = Object.fromEntries(DOOR_FIELDS.map((f) => [f, { right: 0, wrong: 0 }]));
  const rows = [];
  let matched = 0;
  for (const e of expectedDoc.doors) {
    const page = e.page || expectedDoc.source.pages[0];
    const pool = byPage.get(page) || [];
    let f = pool.find((x) => !x._used && normMark(x.mark) === normMark(e.mark));
    let markRight = !!f;
    if (!f) {
      const near = pool.filter((x) => !x._used && editDistance(normMark(x.mark), normMark(e.mark)) <= 1 && normMark(x.mark).length >= 2);
      if (near.length === 1) { f = near[0]; markRight = false; }
    }
    if (!f) { rows.push({ mark: e.mark, page, found: false }); continue; }
    f._used = true;
    matched++;
    const checks = {
      mark: markRight,
      hardware_group: normGroup(f.hardware_group) === normGroup(e.hardware_group),
      width_inches: same(f.width_inches, e.width_inches),
      height_inches: same(f.height_inches, e.height_inches),
      fire_rating: normFire(f.fire_rating) === normFire(e.fire_rating),
      door_type: up(f.door_type) === up(e.door_type),
    };
    for (const k of DOOR_FIELDS) perField[k][checks[k] ? "right" : "wrong"]++;
    rows.push({ mark: e.mark, page, found: true, wrong: DOOR_FIELDS.filter((k) => !checks[k]).map((k) => k + ": expected " + JSON.stringify(e[k] ?? null) + ", read " + JSON.stringify(f[k] ?? null)) });
  }
  const extra = [...byPage.values()].flat().filter((x) => !x._used).map((x) => ({ page: x.page_number, mark: x.mark }));
  const fieldsTotal = matched * DOOR_FIELDS.length;
  const fieldsRight = Object.values(perField).reduce((n, f) => n + f.right, 0);
  return {
    expected_rows: expectedDoc.doors.length, rows_found: matched, rows_found_pct: +(100 * matched / expectedDoc.doors.length).toFixed(1),
    extra_rows: extra.length, extra_sample: extra.slice(0, 10),
    field_accuracy_pct: fieldsTotal ? +(100 * fieldsRight / fieldsTotal).toFixed(1) : null, per_field: perField,
    rows,
  };
}

export const ITEM_FIELDS = ["qty", "description", "catalog", "finish", "mfr"];
const MFR_NAMES = { SEL: ["SELECT", "SEL"], SCH: ["SCHLAGE", "SCH"], LCN: ["LCN"], IVE: ["IVES", "IVE"], VON: ["VON DUPRIN", "VON"], VD: ["VON DUPRIN", "VD"], ZER: ["ZERO", "ZER"], GLY: ["GLYNN", "GLY"], NGP: ["NATIONAL GUARD", "NGP"], TRM: ["TRIMCO", "TRM"], DOR: ["DORMA", "DOR"], RCI: ["RCI"], "B/O": ["BY OTHERS", "B/O"] };
function mfrMatch(found, expected) {
  if (!expected) return !found;
  const f = up(found);
  if (!f) return false;
  const names = MFR_NAMES[expected] || [expected];
  return names.some((n) => f.includes(n)) || f === expected;
}
function itemSimilarity(e, c) {
  const cat = normCat(c.model || c.catalog_number || "");
  const ecat = normCat(e.catalog || "");
  const efirst = normCat(String(e.catalog || "").split(/[\s\/(]/)[0]);
  let s = 0;
  if (ecat && cat === ecat) s += 3;
  else if (efirst && efirst.length >= 3 && (cat.startsWith(efirst) || cat.includes(efirst))) s += 1.5;
  const desc = normText(c.component_type || c.description || "");
  if (desc && desc === normText(e.description)) s += 1;
  else if (desc && normText(e.description).includes(desc.split(" ")[0]) && desc.length > 3) s += 0.4;
  if (same(c.quantity, e.qty)) s += 0.3;
  if (up(c.finish) === up(e.finish)) s += 0.3;
  return s;
}
export function scoreGroups(expectedDoc, sets, comps, foundDoors) {
  const setsPool = sets.map((s) => ({ ...s, _used: false }));
  const perField = Object.fromEntries(ITEM_FIELDS.map((f) => [f, { right: 0, wrong: 0 }]));
  const groups = [];
  let groupsFound = 0, itemsExpected = 0, itemsFound = 0, linkRight = 0, linkExpected = 0;
  for (const g of expectedDoc.groups) {
    // A set is the expected group when its number is the group id, or starts with it followed by
    // a separator (a heading read whole: "01-CARD READER EXTERIOR ..." is group 01).
    const gid = normGroup(g.group);
    let s = setsPool.find((x) => !x._used && normGroup(x.set_number) === gid);
    if (!s) s = setsPool.find((x) => !x._used && new RegExp("^" + gid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Z0-9]|$)").test(normGroup(x.set_number)));
    if (!s) s = setsPool.find((x) => !x._used && normGroup(x.set_number).split(/[^A-Z0-9]+/)[0] === gid.split(/[^A-Z0-9]+/)[0]);
    const scored = g.items.filter((it) => !it.catalog_uncertain);
    itemsExpected += scored.length;
    if (!s) { groups.push({ group: g.group, found: false, items_expected: scored.length }); continue; }
    s._used = true;
    groupsFound++;
    const pool = comps.filter((c) => c.set_number === s.set_number).map((c) => ({ ...c, _used: false }));
    const itemRows = [];
    for (const e of scored) {
      let best = null, bestS = 0;
      for (const c of pool) { if (c._used) continue; const sim = itemSimilarity(e, c); if (sim > bestS) { bestS = sim; best = c; } }
      if (!best || bestS < 1) { itemRows.push({ item: e.description + " " + (e.catalog || ""), found: false }); continue; }
      best._used = true;
      itemsFound++;
      const sup = e.superseded || {};
      const checks = {
        qty: same(best.quantity, e.qty) || (sup.qty != null && same(best.quantity, sup.qty)),
        description: normText(best.component_type || best.description) === normText(e.description) || (sup.description && normText(best.component_type || best.description) === normText(sup.description)),
        catalog: normCat(best.model || best.catalog_number) === normCat(e.catalog) || (sup.catalog && normCat(best.model || best.catalog_number) === normCat(sup.catalog)),
        finish: up(best.finish) === up(e.finish) || (sup.finish && up(best.finish) === up(sup.finish)),
        mfr: mfrMatch(best.manufacturer, e.mfr),
      };
      for (const k of ITEM_FIELDS) perField[k][checks[k] ? "right" : "wrong"]++;
      itemRows.push({ item: e.description + " " + (e.catalog || ""), found: true, wrong: ITEM_FIELDS.filter((k) => !checks[k]).map((k) => k + ": expected " + JSON.stringify(e[k] ?? null) + ", read " + JSON.stringify(k === "qty" ? best.quantity : k === "description" ? best.component_type : k === "catalog" ? (best.model || best.catalog_number) : k === "mfr" ? best.manufacturer : best[k])) });
    }
    const extraItems = pool.filter((c) => !c._used).length;
    // Linking: the doors the door schedule gives this group vs the doors found carrying it.
    let link = null;
    if (g.doors && g.doors.length && foundDoors && foundDoors.length) {
      const have = new Set(foundDoors.filter((d) => normGroup(d.hardware_group) === normGroup(g.group) || normGroup(d.hardware_group) === normGroup(s.set_number)).map((d) => normMark(d.mark)));
      const hit = g.doors.filter((m) => have.has(normMark(m))).length;
      linkExpected += g.doors.length; linkRight += hit;
      link = { expected_doors: g.doors.length, linked: hit, set_door_count: s.door_count ?? null };
    }
    groups.push({ group: g.group, found: true, read_as: s.set_number, items_expected: scored.length, items_found: itemRows.filter((r) => r.found).length, extra_items: extraItems, link, items: itemRows });
  }
  const fieldsTotal = itemsFound * ITEM_FIELDS.length;
  const fieldsRight = Object.values(perField).reduce((n, f) => n + f.right, 0);
  return {
    expected_groups: expectedDoc.groups.length, groups_found: groupsFound, extra_groups: setsPool.filter((x) => !x._used).map((x) => x.set_number),
    expected_items: itemsExpected, items_found: itemsFound, items_found_pct: itemsExpected ? +(100 * itemsFound / itemsExpected).toFixed(1) : null,
    field_accuracy_pct: fieldsTotal ? +(100 * fieldsRight / fieldsTotal).toFixed(1) : null, per_field: perField,
    doors_linked: linkExpected ? { expected: linkExpected, linked: linkRight, pct: +(100 * linkRight / linkExpected).toFixed(1) } : null,
    groups,
  };
}
