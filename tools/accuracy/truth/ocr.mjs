// tools/accuracy/truth/ocr.mjs
//
// For scans, only rendering is adapted here: Poppler supplies grayscale pixels to production's
// ocrRasterPageLines. Production chooses orientation and DPI, straightens the image, finds ruled
// cells, recognizes them with the shipped Tesseract engine/model, and forms schedule-reader lines.
// Reader B receives the same words plus independently detected rules from the straightened image.
// The browser's pdf.js rendering is checked separately by tools/accuracy/scanned_sheet_browser.mjs.
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
    const { createOCREngine, supportsFastBuild } = await import(pathToFileURL(join(dir, "lib.mjs")).href);
    const e = await createOCREngine({ wasmBinary: readFileSync(join(OCR_ASSETS, supportsFastBuild() ? "tesseract-core.bin" : "tesseract-core-fallback.bin")) });
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

function toRgba(img) {
  const data = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0; i < img.gray.length; i++) { data[4 * i] = data[4 * i + 1] = data[4 * i + 2] = img.gray[i]; data[4 * i + 3] = 255; }
  return { width: img.width, height: img.height, data };
}

export async function ocrPage(file, pageNumber, { dpi = 300, rotations = [0, 90, 270, 180], maxPixels = 36e6 } = {}) {
  const t0 = Date.now();
  const client = await import(pathToFileURL(join(CLIENT_SRC, "schedule-grid-extraction-client.mjs")).href);
  const size = pageSizePt(file, pageNumber);
  let lastImage;
  const o = await client.ocrRasterPageLines({ width: size.w, height: size.h,
    render: async (use, rotation) => {
      lastImage = rotateGray(renderGray(file, pageNumber, use), rotation);
      return toRgba(lastImage);
    },
  }, await engine(), () => {}, { dpi, rotations, maxPixels });
  // Reader B gets independently detected rules from the same straightened raster, before
  // production erases anything. No rules or expected cells from reader A are fed to B.
  const straight = client.deskewImage(toRgba(lastImage), o.image_skew_deg);
  const gray = new Uint8Array(straight.width * straight.height);
  for (let i = 0; i < gray.length; i++) gray[i] = straight.data[4 * i];
  const rules = imageRules({ width: straight.width, height: straight.height, gray }, o.dpi);
  const items = o.words.map((w) => ({ str: w.str, x: w.x0, y: w.yb, w: w.x1 - w.x0, h: w.glyph_h, rot: 0, conf: w.conf }));
  return { ...o, items, rules, pipeline: "production ocrRasterPageLines (Poppler renderer)", ms: Date.now() - t0 };
}
