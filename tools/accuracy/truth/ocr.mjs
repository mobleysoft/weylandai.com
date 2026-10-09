// tools/accuracy/truth/ocr.mjs
//
// The OCR path of the truth harness, for a page with no text layer (a scan, or a Print-to-PDF of a
// bitmap: OCC A-801). The page is rendered by poppler (pdftoppm, grayscale), its long dark runs are
// taken as the table's rules and erased, and the same tesseract-wasm build and English model the
// product ships (weyland-subx-worker/assets/client-ocr) reads the words, skew measured from word
// baselines and taken out with the product's own helpers. Then:
//   reader A gets the words as lines, through the production reader (schedule-text-layer.mjs
//            readDoorScheduleFromLines / readHardwareGroupsFromLines), as the browser OCR path does;
//   reader B gets the same words plus the rules found in the RENDERED image (the row bands and
//            column lines a person sees), not the PDF's drawing operators: a rendered-row-band read.
// Nothing here is shared with reader A beyond the OCR words themselves.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OCR_ASSETS = join(HERE, "../../../weyland-subx-worker/assets/client-ocr");
const CLIENT_SRC = join(HERE, "../../../weyland-subx-worker/assets/client-ocr-src");

let enginePromise = null;
async function engine() {
  if (!enginePromise) enginePromise = (async () => {
    // The shipped library is stored as .bin for the Worker's asset rules; Node imports it as a module copy.
    const dir = mkdtempSync(join(tmpdir(), "truth-ocr-"));
    copyFileSync(join(OCR_ASSETS, "tesseract-wasm-lib.mjs.bin"), join(dir, "lib.mjs"));
    const { createOCREngine } = await import(pathToFileURL(join(dir, "lib.mjs")).href);
    const e = await createOCREngine({ wasmBinary: readFileSync(join(OCR_ASSETS, "tesseract-core-fallback.bin")) });
    e.loadModel(readFileSync(join(OCR_ASSETS, "eng-traineddata.bin")));
    return e;
  })();
  return enginePromise;
}

function readPgm(buf) {
  let i = 0;
  const tok = () => { while (buf[i] === 0x20 || buf[i] === 0x0a || buf[i] === 0x0d || buf[i] === 0x09) i++; let s = ""; while (i < buf.length && !(buf[i] === 0x20 || buf[i] === 0x0a || buf[i] === 0x0d || buf[i] === 0x09)) s += String.fromCharCode(buf[i++]); return s; };
  if (tok() !== "P5") throw new Error("not a binary PGM");
  const w = +tok(), h = +tok(); tok(); i++;
  return { width: w, height: h, gray: buf.subarray(i, i + w * h) };
}

/** Render one page to grayscale pixels at dpi (pdftoppm). */
/** A page's size in points (pdfinfo). */
export function pageSizePt(file, pageNumber) {
  const out = execFileSync("pdfinfo", ["-f", String(pageNumber), "-l", String(pageNumber), file], { encoding: "utf8" });
  const m = out.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/) || out.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
  return m ? { w: +m[1], h: +m[2] } : { w: 612, h: 792 };
}
/** The dpi to use under the browser path's pixel budget (36 MP): a full-size sheet is read at less. */
export function dpiFor(file, pageNumber, dpi, maxPixels = 36e6) {
  const { w, h } = pageSizePt(file, pageNumber);
  return w * h * (dpi / 72) ** 2 > maxPixels ? Math.floor(72 * Math.sqrt(maxPixels / (w * h))) : dpi;
}

export function renderGray(file, pageNumber, dpi = 300) {
  const dir = mkdtempSync(join(tmpdir(), "truth-render-"));
  try {
    execFileSync("pdftoppm", ["-r", String(dpi), "-gray", "-f", String(pageNumber), "-l", String(pageNumber), file, join(dir, "p")], { stdio: "ignore" });
    const f = readdirSync(dir).find((x) => x.endsWith(".pgm"));
    if (!f) throw new Error("pdftoppm rendered nothing");
    return readPgm(readFileSync(join(dir, f)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Horizontal and vertical rules in a rendered page: runs of dark pixels at least minPt long, merged
 *  across adjacent pixel rows (a 2 px line is one rule). Points, y down, as pdf.mjs pageRules. */
export function imageRules(img, dpi, { minH = 24, minV = 9, dark = 128 } = {}) {
  const { width: W, height: H, gray } = img;
  const k = 72 / dpi, mh = Math.round(minH / k), mv = Math.round(minV / k);
  const hs = [], vs = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (gray[y * W + x] < dark) { const s = x; while (x < W && gray[y * W + x] < dark) x++; if (x - s >= mh) hs.push({ y, x0: s, x1: x }); } else x++;
    }
  }
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (gray[y * W + x] < dark) { const s = y; while (y < H && gray[y * W + x] < dark) y++; if (y - s >= mv) vs.push({ x, y0: s, y1: y }); } else y++;
    }
  }
  const mergeRuns = (runs, pos, a, b) => {
    runs.sort((p, q) => p[a] - q[a] || p[pos] - q[pos]);
    const out = [];
    for (const r of runs) {
      const m = out.find((o) => Math.abs(o[pos] - r[pos]) <= 3 && o.last >= r[pos] - 1 && Math.min(o[b], r[b]) - Math.max(o[a], r[a]) > 0.8 * Math.min(o[b] - o[a], r[b] - r[a]));
      if (m) { m[a] = Math.min(m[a], r[a]); m[b] = Math.max(m[b], r[b]); m.sum += r[pos]; m.n++; m.last = r[pos]; }
      else out.push({ ...r, sum: r[pos], n: 1, last: r[pos] });
    }
    return out.map((o) => ({ ...o, [pos]: o.sum / o.n }));
  };
  const H2 = mergeRuns(hs, "y", "x0", "x1").map((r) => ({ y: r.y * k, x0: r.x0 * k, x1: r.x1 * k }));
  const V2 = mergeRuns(vs, "x", "y0", "y1").map((r) => ({ x: r.x * k, y0: r.y0 * k, y1: r.y1 * k }));
  return { width: W * k, height: H * k, h: H2, v: V2, from: "rendered image" };
}

/**
 * OCR one page. -> { width, height, dpi, words: [{ str, x0, x1, yb, h, conf }], items (pdf.mjs shape),
 *                    lines (production clustering), rules (from the rendered image), skew_deg, ms }
 */
/** Turn a gray image by 90, 180 or 270 degrees clockwise. */
export function rotateGray(img, deg) {
  const { width: W, height: H, gray } = img;
  if (!deg) return img;
  const out = new Uint8Array(W * H);
  const NW = deg === 180 ? W : H, NH = deg === 180 ? H : W;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let nx, ny;
    if (deg === 90) { nx = H - 1 - y; ny = x; } else if (deg === 270) { nx = y; ny = W - 1 - x; } else { nx = W - 1 - x; ny = H - 1 - y; }
    out[ny * NW + nx] = gray[y * W + x];
  }
  return { width: NW, height: NH, gray: out };
}

async function wordsOfImage(img, dpi, client) {
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i++) { rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = img.gray[i]; rgba[4 * i + 3] = 255; }
  const im = client.eraseLongRuns({ width: img.width, height: img.height, data: rgba }, Math.round(dpi * 0.4));
  const e = await engine();
  e.clearImage(); e.loadImage(im); e.setVariable("tessedit_pageseg_mode", "6");
  const k = 72 / dpi;
  const pct = (b) => (b.confidence == null ? 100 : b.confidence <= 1 ? b.confidence * 100 : b.confidence);
  return (e.getTextBoxes("word") || []).filter((b) => b && b.text && b.text.trim() && pct(b) >= 30)
    .map((b) => ({ str: b.text.trim(), x0: b.rect.left * k, x1: b.rect.right * k, yb: b.rect.bottom * k, h: Math.max(1, (b.rect.bottom - b.rect.top) * k), conf: pct(b) }));
}

export async function ocrPage(file, pageNumber, { dpi = 300, rotations = [0, 90, 270, 180] } = {}) {
  const t0 = Date.now();
  dpi = dpiFor(file, pageNumber, dpi);
  const client0 = await import(pathToFileURL(join(CLIENT_SRC, "schedule-grid-extraction-client.mjs")).href);
  // Which way up: a quick read at 150 dpi (100 dpi, the browser's, misjudged OCC's small type), scored by confident words.
  let rotation = rotations[0] || 0;
  if (rotations.length > 1) {
    const qd = Math.min(150, dpi);
    const quick = renderGray(file, pageNumber, qd);
    let best = -1;
    for (const r of rotations) {
      const ws = await wordsOfImage(rotateGray(quick, r), qd, client0);
      const score = ws.filter((w) => w.conf >= 70 && w.str.length >= 3).length;
      if (score > best) { best = score; rotation = r; }
    }
  }
  const img = rotateGray(renderGray(file, pageNumber, dpi), rotation);
  const rules = imageRules(img, dpi);
  const client = client0;
  const TL = await import(pathToFileURL(join(CLIENT_SRC, "schedule-text-layer.mjs")).href);
  // Same erase as the browser path (long rulings would otherwise read as letters), inside wordsOfImage.
  const k = 72 / dpi;
  // Every rule found in the image is whited out before OCR (the browser erases only rulings longer
  // than 0.4 in; a cell's short verticals then read as "|", "I" or "l" and split the rows).
  const clean = { width: img.width, height: img.height, gray: Uint8Array.from(img.gray) };
  const px = (v) => Math.round(v / k), pad = Math.max(2, Math.round(dpi / 150));
  for (const r of rules.h) for (let y = px(r.y) - pad; y <= px(r.y) + pad; y++) if (y >= 0 && y < img.height) clean.gray.fill(255, y * img.width + Math.max(0, px(r.x0) - pad), y * img.width + Math.min(img.width, px(r.x1) + pad));
  for (const r of rules.v) for (let y = Math.max(0, px(r.y0) - pad); y < Math.min(img.height, px(r.y1) + pad); y++) for (let x = px(r.x) - pad; x <= px(r.x) + pad; x++) if (x >= 0 && x < img.width) clean.gray[y * img.width + x] = 255;
  const raw = await wordsOfImage(clean, dpi, client);
  const deg = client.skewDegrees(raw);
  const words = client.unskew(raw, deg).map((w, i) => ({ ...w, item: i, itemX0: w.x0, itemX1: w.x1 }));
  const items = words.map((w) => ({ str: w.str, x: w.x0, y: w.yb, w: w.x1 - w.x0, h: w.h, rot: 0, conf: w.conf }));
  return { width: img.width * k, height: img.height * k, dpi, rotation, words, items, lines: TL.clusterLines(words), rules, skew_deg: deg, ms: Date.now() - t0 };
}
