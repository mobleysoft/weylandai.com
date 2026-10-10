#!/usr/bin/env node
// g068: SightX sheet view over the g066 placement records.
//
//   node tools/accuracy/g068/build-sheets.mjs --pdfs <dir holding <sha16>.pdf> [sha16 ...]
//
// For each set, tools/corpus/harvest/placement/<sha16>.json gives the plan sheets (page, sheet, title, size
// in PDF points) and the door tags placed on them (x from the left, y from the top, PDF points). Each sheet
// page is rendered from the set's own harvested PDF with pdftoppm at 100 dpi, one bit per pixel (PNG), and
// written to weyland-sightx-worker/assets/sheets/<sha16>-p<page>.bin (.bin: Wrangler's Data rule, the
// subx worker's client-ocr precedent). The records go to weyland-sightx-worker/src/data/sheets/records.js
// and the image imports to images.js; /api/sightx/sheets/<sha16> and /api/sightx/sheets/<sha16>/p<page>.png
// serve them, and /sightx/?set=<sha16> opens the set on its sheets. Nothing is fetched from the publisher:
// the PDFs are the harvest's own copies.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "../../..");
const PLACEMENT = path.join(REPO, "tools/corpus/harvest/placement");
const WORKER = path.join(REPO, "weyland-sightx-worker");
const ASSETS = path.join(WORKER, "assets/sheets");
const DATA = path.join(WORKER, "src/data/sheets");
export const DPI = 100;
export const DEFAULT_SETS = ["192a16af8f31ae0c", "7478006f7fd5b43c", "15b85ca679307cc1"];

// The card's fields: what the plan reader placed and what reader A read on the schedule row. Nothing added.
const TAG_FIELDS = ["mark", "sheet", "page", "x", "y", "h", "room", "room_name", "room_by", "unsure", "matched_by", "also_on", "note", "shared_mark",
  "location", "size", "width_inches", "height_inches", "pair", "door_type", "frame_type", "material", "fire_rating", "hardware_group", "door_pages"];
const ROW_FIELDS = ["page", "mark", "location", "size", "door_type", "frame_type", "material", "fire_rating", "hardware_group"];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const round2 = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);

export function sheetRecord(rec) {
  const sha = rec.set.sha16;
  const tags = rec.tags.map((t) => ({ ...pick(t, TAG_FIELDS), x: round2(t.x), y: round2(t.y), h: round2(t.h), schedule_rows: (t.schedule_rows || []).map((r) => pick(r, ROW_FIELDS)) }));
  const sheets = rec.sheets.map((s) => {
    const placed = tags.filter((t) => t.page === s.page).length;
    const also = tags.filter((t) => t.page !== s.page && (t.also_on || []).includes(s.sheet)).map((t) => t.mark);
    return { page: s.page, sheet: s.sheet, title: s.title, width: s.width, height: s.height, scales: s.scales, points_per_foot: s.points_per_foot,
      image: "/api/sightx/sheets/" + sha + "/p" + s.page + ".png", tags_placed: placed, also_marked: also };
  });
  return { set: rec.set, sheets, tags, summary: { marks_total: rec.summary.marks_total, marks_placed: rec.summary.marks_placed, placed_rate: rec.summary.placed_rate, sheets_total: rec.summary.sheets_total, unplaced: rec.summary.unplaced || [] } };
}

function main(argv) {
  const at = argv.indexOf("--pdfs");
  if (at < 0) throw new Error("--pdfs <dir> is required (the harvested PDFs, named <sha16>.pdf)");
  const pdfs = argv[at + 1];
  const sets = argv.filter((a, i) => /^[0-9a-f]{16}$/.test(a) && i !== at + 1);
  const list = sets.length ? sets : DEFAULT_SETS;
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.mkdirSync(DATA, { recursive: true });
  const records = {}, images = [], summary = [];
  for (const sha of list) {
    const rec = JSON.parse(fs.readFileSync(path.join(PLACEMENT, sha + ".json"), "utf8"));
    const pdf = path.join(pdfs, sha + ".pdf");
    const digest = crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex");
    if (digest.slice(0, 16) !== sha) throw new Error(pdf + " is not set " + sha + " (sha256 " + digest + ")");
    const out = sheetRecord(rec);
    for (const s of out.sheets) {
      const base = path.join(ASSETS, sha + "-p" + s.page);
      execFileSync("pdftoppm", ["-f", String(s.page), "-l", String(s.page), "-r", String(DPI), "-png", "-mono", "-singlefile", pdf, base]);
      fs.renameSync(base + ".png", base + ".bin");
      const png = fs.readFileSync(base + ".bin");
      s.px_width = png.readUInt32BE(16); s.px_height = png.readUInt32BE(20);
      images.push({ key: sha + "/" + s.page, file: sha + "-p" + s.page + ".bin", bytes: png.length });
    }
    records[sha] = out;
    summary.push({ sha16: sha, label: rec.set.label, placed: out.summary.marks_placed + " of " + out.summary.marks_total, sheets: out.sheets.map((s) => s.sheet + " p." + s.page + " " + s.tags_placed + " tags, " + s.px_width + "x" + s.px_height + " px") });
  }
  fs.writeFileSync(path.join(DATA, "records.js"), "// Generated by tools/accuracy/g068/build-sheets.mjs: do not edit by hand.\n// The g066 placement records SightX opens on their plan sheets (/sightx/?set=<sha16>).\nexport const SHEET_SETS = " + JSON.stringify(records) + ";\n");
  fs.writeFileSync(path.join(DATA, "images.js"), "// Generated by tools/accuracy/g068/build-sheets.mjs: do not edit by hand.\n// Each plan sheet rendered at " + DPI + " dpi, one bit per pixel, PNG bytes (Wrangler Data modules).\n" +
    images.map((im, i) => "import i" + i + " from \"../../../assets/sheets/" + im.file + "\";").join("\n") + "\nexport const SHEET_IMAGES = {\n" + images.map((im, i) => "  " + JSON.stringify(im.key) + ": i" + i + ",").join("\n") + "\n};\n");
  fs.writeFileSync(path.join(HERE, "sheets-summary.json"), JSON.stringify({ dpi: DPI, images: images.map((im) => ({ file: im.file, bytes: im.bytes })), sets: summary }, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 1));
  console.log("images", images.length, "bytes", images.reduce((n, im) => n + im.bytes, 0));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
