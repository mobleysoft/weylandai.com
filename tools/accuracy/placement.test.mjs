import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildPlacement, stableJSON, sightXReady, sortPlacements, placementTable, placementRegressions } from "./placement.mjs";
import { committedPlacements, runPlacement } from "./placement_run.mjs";
import { oracleMarksOnPlan } from "./truth/oracles.mjs";
import { openPdf } from "./truth/pdf.mjs";
import { loadPages, readSchedules } from "./truth/load_set.mjs";
import { pages, doors, truth } from "./fixtures/placement.mjs";

const fixture = () => buildPlacement(truth, structuredClone(pages), structuredClone(doors));
const repo = fileURLToPath(new URL("../../", import.meta.url));

test("placement shape, PDF points, exact schedule fields and oracle counts", () => {
  const r = fixture();
  assert.deepEqual(r.set, truth);
  assert.deepEqual(r.sheets, [{ page: 1, sheet: "A-101", title: "FIRST FLOOR PLAN",
    width: 3024, height: 2160, scales: ['SCALE: 1/8" = 1\'-0"'], points_per_foot: [9] }]);
  assert.deepEqual(r.rooms, [
    { number: "101", name: "OFFICE", page: 1, sheet: "A-101", x: 518, y: 510, points_per_foot: 9 },
    { number: "102", name: "LOBBY", page: 1, sheet: "A-101", x: 1215, y: 810, points_per_foot: 9 },
  ]);
  assert.deepEqual(r.tags.map((t) => [t.mark, t.x, t.y, t.h, t.room, t.room_name, t.matched_by, t.also_on]), [
    ["101A", 612, 595, 10, "101", "OFFICE", "exact", []],
    ["101B", 812, 595, 10, "101", "OFFICE", "exact", []],
    ["102A", 1312, 895, 10, "102", "LOBBY", "exact", []],
  ]);
  for (let i = 0; i < doors.length; i++) {
    assert.deepEqual(r.tags[i].schedule_rows, [doors[i]]);
    for (const [key, value] of Object.entries(doors[i])) if (!["page", "y"].includes(key)) assert.deepEqual(r.tags[i][key], value);
    assert.equal(r.tags[i].points_per_foot, 9);
  }
  assert.deepEqual(r.summary, { marks_total: 3, marks_placed: 3, placed_rate: 1,
    sheets_with_scale: 1, sheets_total: 1, rooms_total: 2, unplaced: [] });
  assert.equal(r.summary.marks_placed, oracleMarksOnPlan(doors, pages).pass);
});

test("deterministic bytes and recursively sorted keys without mutating inputs", () => {
  const before = stableJSON({ pages, doors, truth });
  const a = stableJSON(fixture()), b = stableJSON(fixture());
  assert.equal(a, b);
  assert.equal(stableJSON({ pages, doors, truth }), before);
  const reversed = Object.fromEntries(Object.entries(fixture()).reverse());
  assert.equal(stableJSON(reversed), a);
  const checkKeys = (v) => {
    if (Array.isArray(v)) v.forEach(checkKeys);
    else if (v && typeof v === "object") {
      assert.deepEqual(Object.keys(v), Object.keys(v).sort());
      Object.values(v).forEach(checkKeys);
    }
  };
  checkKeys(JSON.parse(a));
});

test("missing marks retain the oracle's reason; missing scale is null", () => {
  const ps = structuredClone(pages);
  ps[0].items = ps[0].items.filter((i) => !i.str.startsWith("SCALE:"));
  const ds = [...doors, { mark: "999A", page: 2 }], r = buildPlacement(truth, ps, ds);
  const oracle = oracleMarksOnPlan(ds, ps);
  assert.equal(r.summary.marks_total, 4);
  assert.equal(r.summary.marks_placed, 3);
  assert.equal(r.summary.placed_rate, 0.75);
  assert.deepEqual(r.summary.unplaced, [{ mark: "999A", page: 2, reason: oracle.examples[0] }]);
  assert.equal(r.summary.sheets_with_scale, 0);
  assert.equal(r.sheets[0].points_per_foot, null);
  assert.ok([...r.tags, ...r.rooms].every((x) => x.points_per_foot === null));
});

test("SightX-ready requires the exact 90% boundary, scale and a room", () => {
  const r = fixture();
  assert.equal(sightXReady(r), true);
  r.summary.placed_rate = 0.9;
  assert.equal(sightXReady(r), true);
  r.summary.placed_rate = 0.89999;
  assert.equal(sightXReady(r), false);
  r.summary.placed_rate = 1;
  r.summary.sheets_with_scale = 0;
  assert.equal(sightXReady(r), false);
  r.summary.sheets_with_scale = 1;
  r.tags.forEach((t) => { t.room = null; });
  assert.equal(sightXReady(r), false);
  assert.equal(sightXReady(buildPlacement(truth, pages, [])), false);
});

test("duplicate marks keep their own door cards and shared-mark warning", () => {
  const ps = structuredClone(pages), ds = structuredClone(doors);
  ps[0].items.find((i) => i.str === "101B").str = "101A";
  ds[1].mark = "101A";
  ds[1].size = "6'-0\" x 7'-0\"";
  const r = buildPlacement(truth, ps, ds), tags = r.tags.filter((t) => t.mark === "101A");
  assert.equal(tags.length, 2);
  assert.deepEqual(tags.map((t) => t.size), [ds[0].size, ds[1].size]);
  assert.deepEqual(tags.map((t) => t.hardware_group), ["1", "2"]);
  assert.ok(tags.every((t) => t.note === "shared mark, order assumed"));
  assert.equal(r.summary.marks_placed, 3);
});

test("one tag can cover repeated schedule pages; summary counts rows", () => {
  const r = buildPlacement(truth, pages, [...doors, { ...doors[0], page: 3 }]);
  assert.equal(r.tags.length, 3);
  assert.equal(r.tags[0].schedule_rows.length, 2);
  assert.equal(r.summary.marks_placed, 4);
  assert.equal(r.summary.marks_total, 4);
});

test("report sorts by rate then marks descending, escaping labels", () => {
  const a = fixture(), b = fixture(), c = fixture();
  a.set.sha16 = "a"; a.summary.placed_rate = 0.5;
  b.set.sha16 = "b"; b.set.label = "one | two\nthree";
  c.set.sha16 = "c"; c.summary.marks_total = 10;
  assert.deepEqual(sortPlacements([a, b, c]).map((r) => r.set.sha16), ["c", "b", "a"]);
  assert.match(placementTable([b]), /one \\\| two three/);
});

test("regression detection includes disappeared records, but permits new sets", () => {
  const before = fixture(), after = fixture();
  after.summary.marks_placed--;
  assert.equal(placementRegressions([after], [before]).length, 1);
  assert.equal(placementRegressions([], [before]).length, 1);
  assert.deepEqual(placementRegressions([before], []), []);
  assert.deepEqual(placementRegressions([before], [before]), []);
});

test("shared loader defaults keep both readers; A-only mode returns identical door rows", async () => {
  const file = resolve(repo, "tools/bidset/out/weylandai-building-bidset.pdf");
  const pdf = await openPdf(readFileSync(file));
  try {
    const ps = await loadPages(pdf);
    assert.equal(ps.length, pdf.numPages);
    assert.ok(ps.every((p) => p.width > 0 && p.height > 0));
    const both = await readSchedules(pdf, ps, { file });
    const a = await readSchedules(pdf, ps, { file, readerB: false, hardware: false });
    assert.equal(both.doorsA.length, 48);
    assert.ok(both.hwA.some((p) => p.groups.length > 0));
    assert.ok(both.hwB.some((p) => p.groups.length > 0));
    assert.deepEqual(both.hwPages, [4, 5, 6]);
    assert.deepEqual(a.doorsA, both.doorsA);
    assert.deepEqual(a.doorPages, both.doorPages);
    assert.deepEqual(a.readerNotes, []);
    assert.deepEqual(a.doorsB, []);
    assert.deepEqual(a.hwA, []);
  } finally { await (pdf.destroy ? pdf.destroy() : pdf.loadingTask?.destroy()); }
});

test("--check compares Git HEAD, fails on loss, and does not overwrite working records", async () => {
  const temp = mkdtempSync(join(tmpdir(), "g066-check-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: temp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    git("init", "-q");
    const sha = "4847b09e633103f7", recordDir = join(temp, "tools/corpus/harvest/placement");
    const truthDir = join(temp, "tools/corpus/harvest/truth"), downloads = join(temp, "downloads");
    for (const dir of [recordDir, truthDir, downloads]) mkdirSync(dir, { recursive: true });
    copyFileSync(join(repo, "tools/corpus/harvest/truth", sha + ".json"), join(truthDir, sha + ".json"));
    copyFileSync(join(repo, "tools/bidset/out/weylandai-building-bidset.pdf"), join(downloads, sha + ".pdf"));
    const baseline = fixture(); baseline.set.sha16 = sha; baseline.set.tier = "exact";
    baseline.summary.marks_placed = 100000;
    const path = join(recordDir, sha + ".json");
    writeFileSync(path, stableJSON(baseline));
    git("add", "tools/corpus/harvest/placement");
    git("-c", "user.name=Placement Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "Synthetic baseline");
    writeFileSync(path, "working record stays untouched\n");
    assert.equal(committedPlacements(temp)[0].summary.marks_placed, 100000);
    const result = await runPlacement({ repo: temp, dir: downloads, check: true, log: () => {} });
    assert.equal(result.sets, 1);
    assert.match(result.errors.join("\n"), /marks_placed 100000 ->/);
    assert.equal(readFileSync(path, "utf8"), "working record stays untouched\n");
    // Exercise the process failure contract using the same runner the CLI calls.
    const script = `import { runPlacement } from ${JSON.stringify(new URL("./placement_run.mjs", import.meta.url).href)}; const r = await runPlacement(${JSON.stringify({ repo: temp, dir: downloads, check: true })}); process.exitCode = r.errors.length ? 1 : 0;`;
    assert.throws(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { stdio: "pipe" }), (e) => e.status === 1);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
