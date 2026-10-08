// Text-layer schedule reading against the regression set (2026-10-08).
//
// Reads the corpus PDFs with pdfjs-dist (a dev dependency; the shipped module
// runs on the vendored pdf.js in the browser) and checks the rows against
// tools/corpus/expected/*.json, which were read by eye from rendered pages.
// The bar is the one in plan/weylandai_value_report.md: at least 95% of the
// rows, with at least 95% of their fields right.
//
// Run: node --test test/schedule-text-layer.test.mjs   (from weyland-subx-worker)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageTextLines, readDoorScheduleFromLines, readHardwareGroupsFromLines, classifyLines, readSizeCell, readDimension } from "../assets/client-ocr-src/schedule-text-layer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..");
const CORPUS = join(REPO, "tools/corpus/door-schedules");
const EXPECTED = join(REPO, "tools/corpus/expected");
const exp = (f) => JSON.parse(readFileSync(join(EXPECTED, f), "utf8"));
const norm = (s) => String(s == null ? "" : s).toUpperCase().replace(/\s+/g, " ").trim();
const normFire = (s) => norm(s).replace(/[.,;:\s]+/g, "");
const normCat = (s) => norm(s).replace(/[^A-Z0-9]+/g, "");
const normGroup = (s) => norm(s).replace(/^0+(?=\d)/, "");

async function openPdf(file) {
  const data = new Uint8Array(readFileSync(file));
  return pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
}
async function linesOf(pdf, p) {
  const page = await pdf.getPage(p);
  return pageTextLines(pdfjsLib, page);
}

function scoreDoors(expected, doors, page) {
  const E = expected.doors.filter((d) => (d.page || expected.source.pages[0]) === page);
  let found = 0, fieldsRight = 0, fieldsTotal = 0;
  const wrong = [];
  for (const e of E) {
    const f = doors.find((d) => norm(d.door_number) === norm(e.mark));
    if (!f) { wrong.push(e.mark + " not found"); continue; }
    found++;
    const checks = [
      ["hardware_group", normGroup(f.hardware_group) === normGroup(e.hardware_group)],
      ["width", f.width_inches === e.width_inches],
      ["height", f.height_inches === e.height_inches],
      ["fire", normFire(f.fire_rating) === normFire(e.fire_rating)],
      ["type", norm(f.door_type) === norm(e.door_type)],
    ];
    for (const [k, ok] of checks) { fieldsTotal++; if (ok) fieldsRight++; else wrong.push(e.mark + " " + k); }
  }
  return { expected: E.length, found, fieldsRight, fieldsTotal, wrong };
}

function scoreGroups(expected, hg, page) {
  const E = expected.groups.filter((g) => g.page === page);
  let groups = 0, items = 0, itemsFound = 0, fieldsRight = 0, fieldsTotal = 0;
  const wrong = [];
  for (const eg of E) {
    const fg = (hg ? hg.hardware_groups : []).find((g) => normGroup(g.group_number) === normGroup(eg.group) || normGroup(g.group_number).startsWith(normGroup(eg.group) + "-"));
    if (!fg) { wrong.push("group " + eg.group + " not found"); items += eg.items.length; continue; }
    groups++;
    assert.deepEqual(fg.assigned_doors, eg.doors, "doors of group " + eg.group);
    const pool = fg.components.map((c) => ({ ...c, used: false }));
    for (const e of eg.items) {
      if (e.catalog_uncertain) continue;
      items++;
      const sup = e.superseded || {};
      const f = pool.find((c) => !c.used && (normCat(c.catalog_number) === normCat(e.catalog) || (sup.catalog && normCat(c.catalog_number) === normCat(sup.catalog))) && norm(c.description).startsWith(norm(e.description).split(" ")[0]));
      if (!f) { wrong.push(eg.group + ": " + e.description + " " + e.catalog + " not found"); continue; }
      f.used = true;
      itemsFound++;
      const checks = [
        ["qty", f.quantity === e.qty || (sup.qty != null && f.quantity === sup.qty)],
        ["description", norm(f.description) === norm(e.description) || (sup.description && norm(f.description) === norm(sup.description)) || norm(f.description) === norm(e.description + " (" + sup.description + ")")],
        ["finish", norm(f.finish) === norm(e.finish) || (sup.finish && norm(f.finish) === norm(sup.finish))],
        ["mfr", norm(f.manufacturer_code) === norm(e.mfr)],
      ];
      for (const [k, ok] of checks) { fieldsTotal++; if (ok) fieldsRight++; else wrong.push(eg.group + ": " + e.description + " " + k + " = " + JSON.stringify(k === "qty" ? f.quantity : k === "description" ? f.description : k === "finish" ? f.finish : f.manufacturer_code)); }
    }
  }
  return { expectedGroups: E.length, groups, items, itemsFound, fieldsRight, fieldsTotal, wrong };
}

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

test("Rockford A2.2 (p.29): 65 doors from the text layer, fields right", async () => {
  const expected = exp("rockford-a2.2-door-schedule.json");
  const pdf = await openPdf(join(CORPUS, "f0e863d88ea688ff.pdf"));
  const r = await linesOf(pdf, 29);
  const ds = await readDoorScheduleFromLines(r.lines, { width: r.width, height: r.height });
  assert.ok(ds, "a door schedule is found");
  assert.equal(ds.tables[0].title, "DOOR SCHEDULE");
  const s = scoreDoors(expected, ds.doors, 29);
  assert.ok(s.found >= 0.95 * s.expected, "rows found " + s.found + "/" + s.expected + " " + s.wrong.slice(0, 5).join("; "));
  assert.ok(s.fieldsRight >= 0.95 * s.fieldsTotal, "fields " + s.fieldsRight + "/" + s.fieldsTotal + " " + s.wrong.slice(0, 8).join("; "));
  assert.equal(ds.doors.length, 65, "no extra rows");
  console.log("  rockford doors: " + s.found + "/" + s.expected + " rows, fields " + pct(s.fieldsRight, s.fieldsTotal) + "%");
});

test("Rockford 087100 (pp.17-23): 14 hardware groups, their doors and items", async () => {
  const expected = exp("rockford-087100-hardware-groups.json");
  const pdf = await openPdf(join(CORPUS, "f0e863d88ea688ff.pdf"));
  let tot = { groups: 0, expectedGroups: 0, items: 0, itemsFound: 0, fieldsRight: 0, fieldsTotal: 0, wrong: [] };
  for (const p of expected.source.pages) {
    const r = await linesOf(pdf, p);
    const hg = await readHardwareGroupsFromLines(r.lines, { width: r.width, height: r.height });
    const s = scoreGroups(expected, hg, p);
    for (const k of Object.keys(tot)) tot[k] = Array.isArray(tot[k]) ? tot[k].concat(s[k]) : tot[k] + s[k];
  }
  assert.equal(tot.groups, tot.expectedGroups, "groups " + tot.wrong.join("; "));
  assert.ok(tot.itemsFound >= 0.95 * tot.items, "items found " + tot.itemsFound + "/" + tot.items + " " + tot.wrong.slice(0, 6).join("; "));
  assert.ok(tot.fieldsRight >= 0.95 * tot.fieldsTotal, "fields " + tot.fieldsRight + "/" + tot.fieldsTotal + " " + tot.wrong.slice(0, 8).join("; "));
  console.log("  rockford groups: " + tot.groups + "/" + tot.expectedGroups + ", items " + tot.itemsFound + "/" + tot.items + ", fields " + pct(tot.fieldsRight, tot.fieldsTotal) + "%" + (tot.wrong.length ? " (" + tot.wrong.length + " wrong: " + tot.wrong.slice(0, 3).join("; ") + ")" : ""));
});

test("Berryessa A9.2 (pp.284, 286, 288): 24 doors from hairline-ruled blocks on a turned sheet", async () => {
  const expected = exp("berryessa-a9.2-door-schedules.json");
  const pdf = await openPdf(join(CORPUS, "dd339f57b51538ed.pdf"));
  let found = 0, expectedRows = 0, fieldsRight = 0, fieldsTotal = 0, wrong = [];
  for (const p of expected.source.pages) {
    const r = await linesOf(pdf, p);
    assert.equal(r.rotation, 0, "the page's own /Rotate makes the text horizontal");
    const ds = await readDoorScheduleFromLines(r.lines, { width: r.width, height: r.height });
    assert.ok(ds, "a door schedule is found on p" + p);
    const s = scoreDoors(expected, ds.doors, p);
    found += s.found; expectedRows += s.expected; fieldsRight += s.fieldsRight; fieldsTotal += s.fieldsTotal; wrong = wrong.concat(s.wrong);
  }
  assert.ok(found >= 0.95 * expectedRows, "rows " + found + "/" + expectedRows);
  assert.ok(fieldsRight >= 0.95 * fieldsTotal, "fields " + fieldsRight + "/" + fieldsTotal + " " + wrong.join("; "));
  console.log("  berryessa doors: " + found + "/" + expectedRows + " rows, fields " + pct(fieldsRight, fieldsTotal) + "%" + (wrong.length ? " (" + wrong.join("; ") + ")" : ""));
});

test("Berryessa 08 71 00 (p.282): two groups with no header line and no door list", async () => {
  const expected = exp("berryessa-087100-hardware-groups.json");
  const pdf = await openPdf(join(CORPUS, "dd339f57b51538ed.pdf"));
  const r = await linesOf(pdf, 282);
  const hg = await readHardwareGroupsFromLines(r.lines, { width: r.width, height: r.height });
  const s = scoreGroups(expected, hg, 282);
  assert.equal(s.groups, 2);
  assert.equal(s.itemsFound, s.items, s.wrong.join("; "));
  assert.ok(s.fieldsRight >= 0.95 * s.fieldsTotal, "fields " + s.fieldsRight + "/" + s.fieldsTotal + " " + s.wrong.join("; "));
  console.log("  berryessa groups: items " + s.itemsFound + "/" + s.items + ", fields " + pct(s.fieldsRight, s.fieldsTotal) + "%");
});

test("Christina set 01 (p.219): a ruled set under a watermark, from the text (no rules in Node)", async () => {
  const expected = exp("christina-chs-hardware-set-01.json");
  const pdf = await openPdf(join(CORPUS, "525dc0b72011077a.pdf"));
  const r = await linesOf(pdf, 219);
  const hg = await readHardwareGroupsFromLines(r.lines, { width: r.width, height: r.height });
  const s = scoreGroups(expected, hg, 219);
  assert.equal(s.groups, 1, s.wrong.join("; "));
  // Without horizontal rules two quantity-less rows merge into the row above:
  // the floor here is 90%; the browser path renders the rules.
  assert.ok(s.itemsFound >= 0.9 * s.items, "items " + s.itemsFound + "/" + s.items + " " + s.wrong.slice(0, 4).join("; "));
  console.log("  christina set: items " + s.itemsFound + "/" + s.items + ", fields " + pct(s.fieldsRight, s.fieldsTotal) + "%" + (s.wrong.length ? " (" + s.wrong.slice(0, 3).join("; ") + ")" : ""));
});

test("page finder: the schedule pages of the three bid sets, by text", async () => {
  const want = {
    "f0e863d88ea688ff.pdf": { door: [29], hardware: [17, 18, 19, 20, 21, 22, 23] },
    "dd339f57b51538ed.pdf": { door: [284, 286, 288], hardware: [282] },
    "525dc0b72011077a.pdf": { door: [], hardware: [219, 220, 221, 222, 223] },
  };
  for (const [file, w] of Object.entries(want)) {
    const pdf = await openPdf(join(CORPUS, file));
    const door = [], hardware = [];
    const t0 = Date.now();
    for (let p = 1; p <= pdf.numPages; p++) {
      const r = await linesOf(pdf, p);
      const c = await classifyLines(r.lines, { width: r.width, height: r.height });
      if (c.door_schedule) door.push(p);
      if (c.hardware) hardware.push(p);
    }
    for (const p of w.door) assert.ok(door.includes(p), file + " door schedule page " + p + " found (" + door.join(",") + ")");
    for (const p of w.hardware) assert.ok(hardware.includes(p), file + " hardware page " + p + " found (" + hardware.join(",") + ")");
    assert.ok(door.length <= w.door.length + 1, file + " door pages " + door.join(","));
    console.log("  " + file + ": door " + door.join(",") + " hardware " + hardware.join(",") + " in " + (Date.now() - t0) + " ms for " + pdf.numPages + " pages");
  }
});

test("size and dimension cells", () => {
  assert.deepEqual(readSizeCell("PR 3'-6\" x 7'-10\" x 1-3/4\""), { pair: true, width: "3'-6\"", height: "7'-10\"", thickness: "1-3/4\"", width_inches: 42, height_inches: 94, thickness_inches: 1.75 });
  assert.equal(readSizeCell("3'-6\" x 7'-10 x 1-3/4\"").height_inches, 94);
  assert.equal(readSizeCell("3070").width_inches, 36);
  assert.equal(readSizeCell("36\" x 84\"").height_inches, 84);
  assert.equal(readDimension("7'-11\"").inches, 95);
  assert.equal(readDimension("2'-11\"").inches, 35);
  assert.equal(readDimension("1 3/4\"").inches, 1.75);
  assert.equal(readDimension("8'-0''").inches, 96);
  assert.equal(readSizeCell("711\" x 36\"").width_inches, null, "a misread size is not a width");
});
