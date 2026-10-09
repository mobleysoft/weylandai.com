// tools/bidset/make.mjs
//
// Draws the WeylandAI Building's bid set from tools/bidset/building.mjs (2026-10-09):
//   out/weylandai-building-bidset.pdf          vector with a text layer:
//       p1 G-001 cover and sheet index (ARCH D, 36 x 24)
//       p2 A-101 floor plans with door tags (ARCH D)
//       p3 A-601 door schedule, ruled, with title block (ARCH D)
//       p4.. Section 08 71 00 DOOR HARDWARE, hardware groups as printed (Letter)
//   out/weylandai-building-bidset-scanned.pdf  the same pages as images (sheets 200 dpi, spec pages 150), the schedule
//       sheet turned 90 degrees and every page tilted 0.6 degrees, no text layer (a scan)
//   out/truth-doors.json, out/truth-groups.json   the truth, in tools/corpus/expected's shape
// Every sheet carries "SAMPLE PROJECT - NOT A REAL BUILDING".
//
// Usage: node tools/bidset/make.mjs [--out tools/bidset/out]
import { writeFileSync, mkdirSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { PROJECT, GROUPS, OPENINGS, feetInches, truthDoors, truthGroups } from "./building.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const outArg = process.argv.indexOf("--out");
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(here, "out"));
mkdirSync(OUT, { recursive: true });
const { PDFDocument, StandardFonts, rgb, degrees } = createRequire(join(REPO, "weyland-forms-worker/"))("pdf-lib");

const ARCH_D = [2592, 1728];
const LETTER = [612, 792];
const ink = rgb(0, 0, 0), grey = rgb(0.45, 0.45, 0.45), red = rgb(0.75, 0.1, 0.1);

const doc = await PDFDocument.create();
doc.setTitle(PROJECT.name + " - Bid Set (" + PROJECT.stamp + ")");
const F = await doc.embedFont(StandardFonts.Helvetica);
const B = await doc.embedFont(StandardFonts.HelveticaBold);
const text = (pg, s, x, y, size = 10, font = F, color = ink) => pg.drawText(String(s), { x, y, size, font, color });
const line = (pg, x1, y1, x2, y2, t = 0.8, color = ink) => pg.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color });
const box = (pg, x, y, w, h, t = 0.8) => pg.drawRectangle({ x, y, width: w, height: h, borderColor: ink, borderWidth: t });

function stamp(pg, [w, h], big) {
  const s = big ? 40 : 11;
  const tw = B.widthOfTextAtSize(PROJECT.stamp, s);
  text(pg, PROJECT.stamp, (w - tw) / 2, big ? h - 70 : h - 24, s, B, red);
}
// The title block down the right edge of a full-size sheet, as the public sets print it.
function titleBlock(pg, [w, h], sheet, title) {
  const x = w - 300;
  box(pg, 24, 24, w - 48, h - 48, 2);
  line(pg, x, 24, x, h - 24, 1.5);
  text(pg, PROJECT.architect, x + 16, h - 70, 12, B);
  text(pg, PROJECT.name.toUpperCase(), x + 16, h - 200, 18, B);
  text(pg, PROJECT.subtitle.toUpperCase(), x + 16, h - 224, 12);
  text(pg, PROJECT.address, x + 16, h - 244, 11);
  text(pg, "PROJECT NO. " + PROJECT.number, x + 16, h - 280, 11);
  text(pg, "BID SET  " + PROJECT.date, x + 16, h - 300, 11);
  line(pg, x, 260, w - 24, 260, 1.5);
  text(pg, title, x + 16, 220, 16, B);
  text(pg, "SHEET", x + 16, 120, 10, F, grey);
  text(pg, sheet, x + 16, 60, 54, B);
  text(pg, PROJECT.stamp, x + 16, 36, 9, B, red);
}

// ---- p1 G-001 cover
{
  const pg = doc.addPage(ARCH_D);
  titleBlock(pg, ARCH_D, "G-001", "COVER SHEET");
  stamp(pg, ARCH_D, true);
  text(pg, PROJECT.name.toUpperCase(), 140, 1400, 64, B);
  text(pg, PROJECT.subtitle.toUpperCase() + " - BID SET", 140, 1330, 32);
  text(pg, PROJECT.address, 140, 1280, 24);
  text(pg, "SHEET INDEX", 140, 1100, 22, B);
  [["G-001", "COVER SHEET"], ["A-101", "FLOOR PLANS - DOOR TAGS"], ["A-601", "DOOR SCHEDULE"], ["08 71 00", "DOOR HARDWARE (PROJECT MANUAL)"]].forEach(([n, t], i) => { text(pg, n, 140, 1050 - i * 34, 18, B); text(pg, t, 320, 1050 - i * 34, 18); });
}

// ---- p2 A-101 floor plans: three floors side by side, rooms as boxes, a tag at each door
{
  const pg = doc.addPage(ARCH_D);
  titleBlock(pg, ARCH_D, "A-101", "FLOOR PLANS - DOOR TAGS");
  stamp(pg, ARCH_D, false);
  for (const fl of [1, 2, 3]) {
    const ox = 80 + (fl - 1) * 730, oy = 260, W = 680, Hh = 1240;
    text(pg, ["FIRST", "SECOND", "THIRD"][fl - 1] + " FLOOR PLAN", ox, oy - 50, 20, B);
    text(pg, "SCALE: 1/8\" = 1'-0\"", ox, oy - 74, 12);
    box(pg, ox, oy, W, Hh, 3);
    // corridor down the middle; rooms either side
    line(pg, ox + W / 2 - 60, oy, ox + W / 2 - 60, oy + Hh, 2);
    line(pg, ox + W / 2 + 60, oy, ox + W / 2 + 60, oy + Hh, 2);
    const doors = OPENINGS.filter((o) => o.mark.startsWith(String(fl)));
    const side = Math.ceil(doors.length / 2), step = Hh / side;
    doors.forEach((o, i) => {
      const left = i < side, k = left ? i : i - side;
      const y0 = oy + Hh - (k + 1) * step;
      const rx = left ? ox : ox + W / 2 + 60, rw = W / 2 - 60;
      box(pg, rx, y0, rw, step, 1.2);
      text(pg, o.room, rx + 16, y0 + step / 2, 11);
      // the door in the corridor wall and its tag
      const dx = left ? rx + rw : rx, dy = y0 + step / 2 - 18;
      line(pg, dx, dy, dx, dy + 36, 4, rgb(1, 1, 1));
      pg.drawEllipse({ x: dx + (left ? 34 : -34), y: dy + 18, xScale: 26, yScale: 14, borderColor: ink, borderWidth: 1 });
      const tw = F.widthOfTextAtSize(o.mark, 11);
      text(pg, o.mark, dx + (left ? 34 : -34) - tw / 2, dy + 14, 11);
    });
  }
}

// ---- p3 A-601 door schedule, ruled
const SCHED_PAGE = 3;
{
  const pg = doc.addPage(ARCH_D);
  titleBlock(pg, ARCH_D, "A-601", "DOOR SCHEDULE");
  stamp(pg, ARCH_D, false);
  const cols = [["DOOR NO.", 90], ["ROOM NAME", 230], ["WIDTH", 80], ["HEIGHT", 80], ["THK", 60], ["DOOR TYPE", 80], ["DOOR MATL", 80], ["FRAME TYPE", 80], ["FRAME MATL", 80], ["FIRE RATING", 100], ["HW GROUP", 80], ["REMARKS", 160]];
  const x0 = 80, rowH = 26, top = 1600;
  text(pg, "DOOR SCHEDULE", x0, top + 30, 24, B);
  let x = x0;
  const totalW = cols.reduce((s, c) => s + c[1], 0);
  box(pg, x0, top - rowH * (OPENINGS.length + 1), totalW, rowH * (OPENINGS.length + 1), 1.5);
  for (const [name, w] of cols) { text(pg, name, x + 6, top - 18, 11, B); x += w; line(pg, x, top, x, top - rowH * (OPENINGS.length + 1)); }
  line(pg, x0, top - rowH, x0 + totalW, top - rowH, 1.5);
  OPENINGS.forEach((o, i) => {
    const y = top - rowH * (i + 2);
    line(pg, x0, y, x0 + totalW, y, 0.5);
    const cells = [o.mark, o.room, feetInches(o.w), feetInches(o.h), "1 3/4\"", o.type, o.matl, o.frame, o.fmatl, o.fire || "-", o.group, o.pair ? "PAIR" : ""];
    let cx = x0;
    cells.forEach((c, j) => { text(pg, c, cx + 6, y + 8, 11); cx += cols[j][1]; });
  });
  // legends, as the public sets print them beside the schedule
  const lx = x0 + totalW + 60;
  text(pg, "DOOR TYPES", lx, top, 14, B);
  [["A", "FLUSH"], ["B", "HALF GLASS"], ["F", "FULL GLASS (STOREFRONT)"]].forEach(([k, v], i) => text(pg, k + " - " + v, lx, top - 26 - i * 20, 11));
  text(pg, "MATERIALS", lx, top - 110, 14, B);
  [["WD", "SOLID CORE WOOD"], ["HM", "HOLLOW METAL"], ["AL", "ALUMINUM"]].forEach(([k, v], i) => text(pg, k + " - " + v, lx, top - 136 - i * 20, 11));
  text(pg, "HARDWARE: SEE SECTION 08 71 00", lx, top - 220, 12, B);
}

// ---- p4.. Section 08 71 00, hardware groups as printed
const groupPage = {};
{
  let pg = null, y = 0, pageNo = SCHED_PAGE;
  const newPage = (first) => {
    pg = doc.addPage(LETTER); pageNo++;
    stamp(pg, LETTER, false);
    text(pg, PROJECT.name + " - " + PROJECT.number, 54, 750, 9, F, grey);
    text(pg, "SECTION 08 71 00 - DOOR HARDWARE", 360, 750, 9, F, grey);
    text(pg, "08 71 00 - " + (pageNo - SCHED_PAGE), 280, 30, 9, F, grey);
    y = 720;
    if (first) {
      text(pg, "SECTION 08 71 00 - DOOR HARDWARE", 54, y, 13, B); y -= 22;
      text(pg, "PART 3 - EXECUTION", 54, y, 10, B); y -= 16;
      text(pg, "3.1 HARDWARE GROUPS", 54, y, 10, B); y -= 14;
      text(pg, "A. Provide each opening with the hardware listed in its group.", 66, y, 9); y -= 26;
    }
  };
  newPage(true);
  const C = { qty: 54, ea: 84, desc: 120, cat: 260, fin: 450, mfr: 500 };
  for (const g of GROUPS) {
    const doors = OPENINGS.filter((o) => o.group === g.group).map((o) => o.mark);
    const need = 60 + Math.ceil(doors.length / 6) * 13 + g.items.length * 13;
    if (y - need < 60) newPage(false);
    groupPage[g.group] = pageNo;
    text(pg, "Hardware Group No. " + g.group + " " + g.name, 54, y, 10, B); y -= 14;
    for (let i = 0; i < doors.length; i += 6) { doors.slice(i, i + 6).forEach((m, j) => text(pg, m, 58 + j * 70, y, 9)); y -= 13; }
    y -= 8;
    [["QTY", C.qty], ["DESCRIPTION", C.desc], ["CATALOG NUMBER", C.cat], ["FINISH", C.fin], ["MFR", C.mfr]].forEach(([s, x]) => text(pg, s, x, y, 9, B));
    y -= 13;
    for (const it of g.items) {
      text(pg, String(it.qty), C.qty, y, 9); text(pg, it.uom, C.ea, y, 9); text(pg, it.description, C.desc, y, 9);
      text(pg, it.catalog, C.cat, y, 9); text(pg, it.finish || "", C.fin, y, 9); text(pg, it.mfr, C.mfr, y, 9);
      y -= 13;
    }
    y -= 18;
  }
  text(pg, "END OF SECTION 08 71 00", 54, Math.max(y, 60), 10, B);
}

const vectorFile = join(OUT, "weylandai-building-bidset.pdf");
writeFileSync(vectorFile, await doc.save());
const pageCount = doc.getPageCount();
const rel = (f) => f.replace(REPO + "/", "");
const hwPages = [...new Set(Object.values(groupPage))].sort((a, b) => a - b);
writeFileSync(join(OUT, "truth-doors.json"), JSON.stringify(truthDoors(rel(vectorFile), SCHED_PAGE, ARCH_D), null, 2));
writeFileSync(join(OUT, "truth-groups.json"), JSON.stringify(truthGroups(rel(vectorFile), hwPages, (g) => groupPage[g]), null, 2));

// ---- the scanned variant: each page at 150 dpi (spec pages) or 100 dpi (sheets), tilted, no text
const tmp = join(OUT, ".scan");
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
const scan = await PDFDocument.create();
for (let p = 1; p <= pageCount; p++) {
  const sheet = p <= SCHED_PAGE;
  // 200 dpi for the ARCH D sheets (the low end of how drawings are scanned), 150 for the spec pages.
  execFileSync("pdftoppm", ["-r", sheet ? "200" : "150", "-f", String(p), "-l", String(p), "-gray", "-png", vectorFile, join(tmp, "p")]);
  const png = readdirSync(tmp).find((f) => f.endsWith(".png"));
  const turned = join(tmp, "t" + p + ".jpg");
  // the schedule sheet scanned sideways (90 degrees), every page a little crooked, as a scanner leaves it
  execFileSync("convert", [join(tmp, png), "-background", "white", "-rotate", p === SCHED_PAGE ? "90.6" : "0.6", "-quality", "70", turned]);
  rmSync(join(tmp, png));
  const img = await scan.embedJpg(readFileSync(turned));
  const [w, h] = p === SCHED_PAGE ? [ARCH_D[1], ARCH_D[0]] : sheet ? ARCH_D : LETTER;
  const s = Math.min(w / img.width, h / img.height);
  const page = scan.addPage([w, h]);
  page.drawImage(img, { x: (w - img.width * s) / 2, y: (h - img.height * s) / 2, width: img.width * s, height: img.height * s });
}
rmSync(tmp, { recursive: true, force: true });
const scannedFile = join(OUT, "weylandai-building-bidset-scanned.pdf");
writeFileSync(scannedFile, await scan.save());

console.log(JSON.stringify({ vector: rel(vectorFile), scanned: rel(scannedFile), pages: pageCount, schedule_page: SCHED_PAGE, hardware_pages: hwPages, openings: OPENINGS.length, groups: GROUPS.length, items: GROUPS.reduce((n, g) => n + g.items.length, 0) }));
