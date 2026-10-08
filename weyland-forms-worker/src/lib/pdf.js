// weyland-forms-worker/src/lib/pdf.js
//
// A small flow layout on pdf-lib (2026-10-08): titles, labelled fields,
// justified paragraphs, tables, signature lines and boxed notices on US
// Letter pages, breaking pages as needed. No browser: the monolith's
// document tools launched headless Chrome per PDF and hit CPU limits.
// Text is reduced to what the standard fonts can draw (WinAnsi).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE = [612, 792];
const M = 64;

// Characters outside WinAnsi become their nearest plain form.
export function safe(s) {
  return String(s ?? "")
    .replace(/[‐-–−]/g, "-").replace(/—/g, "--")
    .replace(/[   ]/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ‘’“”•…€™]/g, "?");
}

export async function newDoc({ title, footer } = {}) {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(title || "WeylandAI document"));
  doc.setProducer("WeylandAI");
  const fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = { doc, fonts, page: null, y: 0, footer: footer || "", pages: [] };
  addPage(w);
  return w;
}

function addPage(w) {
  w.page = w.doc.addPage(PAGE);
  w.pages.push(w.page);
  w.y = PAGE[1] - M;
}

function need(w, h) { if (w.y - h < M + 20) addPage(w); }

export function wrap(text, font, size, width) {
  const out = [];
  for (const para of safe(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const t = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(t, size) <= width || !line) line = t;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

function drawLine(w, text, { font, size, x = M, color = rgb(0.07, 0.07, 0.07), justifyTo = 0 }) {
  const s = safe(text);
  if (justifyTo && s.includes(" ")) {
    const words = s.split(" ");
    const wordsW = words.reduce((a, t) => a + font.widthOfTextAtSize(t, size), 0);
    const gap = (justifyTo - wordsW) / (words.length - 1);
    if (gap > 0 && gap < size * 1.2) {
      let cx = x;
      for (const t of words) { w.page.drawText(t, { x: cx, y: w.y, size, font, color }); cx += font.widthOfTextAtSize(t, size) + gap; }
      return;
    }
  }
  w.page.drawText(s, { x, y: w.y, size, font, color });
}

export function title(w, text, { size = 15, gapAfter = 16 } = {}) {
  const width = PAGE[0] - 2 * M;
  for (const line of wrap(text, w.fonts.serifBold, size, width)) {
    need(w, size + 6);
    const tw = w.fonts.serifBold.widthOfTextAtSize(line, size);
    drawLine(w, line, { font: w.fonts.serifBold, size, x: (PAGE[0] - tw) / 2 });
    w.y -= size + 6;
  }
  w.y -= gapAfter - 6;
}

export function small(w, text, { size = 8.5, color = rgb(0.4, 0.4, 0.4), center = false } = {}) {
  const width = PAGE[0] - 2 * M;
  for (const line of wrap(text, w.fonts.sans, size, width)) {
    need(w, size + 3);
    const x = center ? (PAGE[0] - w.fonts.sans.widthOfTextAtSize(line, size)) / 2 : M;
    drawLine(w, line, { font: w.fonts.sans, size, x, color });
    w.y -= size + 3;
  }
}

export function field(w, label, value, { size = 11.5 } = {}) {
  need(w, size + 10);
  const f = w.fonts.serif, fb = w.fonts.serifBold;
  drawLine(w, label, { font: fb, size });
  const lx = M + fb.widthOfTextAtSize(safe(label), size) + 6;
  const v = safe(value || "");
  const maxW = PAGE[0] - M - lx;
  const lines = wrap(v, f, size, maxW);
  lines.forEach((ln, i) => {
    if (i) { w.y -= size + 4; need(w, size + 4); }
    drawLine(w, ln, { font: f, size, x: lx });
    w.page.drawLine({ start: { x: lx, y: w.y - 2.5 }, end: { x: PAGE[0] - M, y: w.y - 2.5 }, thickness: 0.5, color: rgb(0.55, 0.55, 0.55) });
  });
  w.y -= size + 10;
}

export function para(w, text, { size = 11.5, font = null, justify = true, gapAfter = 10 } = {}) {
  const f = font || w.fonts.serif;
  const width = PAGE[0] - 2 * M;
  const lines = wrap(text, f, size, width);
  lines.forEach((ln, i) => {
    need(w, size + 4.5);
    drawLine(w, ln, { font: f, size, justifyTo: justify && i < lines.length - 1 ? width : 0 });
    w.y -= size + 4.5;
  });
  w.y -= gapAfter;
}

export function notice(w, text, { size = 15 } = {}) {
  const width = PAGE[0] - 2 * M - 20;
  const lines = wrap(text, w.fonts.serifBold, size, width);
  const h = lines.length * (size + 5) + 16;
  need(w, h + 6);
  w.page.drawRectangle({ x: M, y: w.y - h + size, width: PAGE[0] - 2 * M, height: h, borderColor: rgb(0, 0, 0), borderWidth: 1.2 });
  w.y -= 4;
  for (const ln of lines) { drawLine(w, ln, { font: w.fonts.serifBold, size, x: M + 10 }); w.y -= size + 5; }
  w.y -= 14;
}

// lines: [{ label?, caption?, value? }]
export function signature(w, lines, { size = 11 } = {}) {
  w.y -= 8;
  for (const l of lines) {
    need(w, size + 22);
    const x = PAGE[0] / 2;
    if (l.label) drawLine(w, l.label, { font: w.fonts.serif, size, x: x - w.fonts.serif.widthOfTextAtSize(safe(l.label), size) - 6 });
    if (l.value) drawLine(w, l.value, { font: w.fonts.serif, size, x });
    w.page.drawLine({ start: { x, y: w.y - 3 }, end: { x: PAGE[0] - M, y: w.y - 3 }, thickness: 0.6, color: rgb(0.2, 0.2, 0.2) });
    w.y -= size + 2;
    if (l.caption) { drawLine(w, l.caption, { font: w.fonts.sans, size: 8, x, color: rgb(0.4, 0.4, 0.4) }); w.y -= 10; }
    w.y -= 10;
  }
}

// columns: [{ head, width (fraction), align? }]; rows: arrays of strings.
export function table(w, columns, rows, { size = 9.5 } = {}) {
  const width = PAGE[0] - 2 * M;
  const xs = []; let acc = M;
  for (const c of columns) { xs.push(acc); acc += c.width * width; }
  const head = () => {
    need(w, 2 * size + 26); // the head with at least its first row
    columns.forEach((c, i) => drawLine(w, c.head, { font: w.fonts.sansBold, size: size - 0.5, x: xs[i] + 2 }));
    w.page.drawLine({ start: { x: M, y: w.y - 4 }, end: { x: M + width, y: w.y - 4 }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
    w.y -= size + 8;
  };
  head();
  for (const r of rows) {
    const cells = columns.map((c, i) => wrap(r[i] ?? "", w.fonts.sans, size, c.width * width - 6));
    const h = Math.max(...cells.map((x) => x.length)) * (size + 3) + 4;
    if (w.y - h < M + 20) { addPage(w); head(); }
    cells.forEach((lines, i) => {
      const c = columns[i];
      lines.forEach((ln, k) => {
        const tx = c.align === "right" ? xs[i] + c.width * width - 4 - w.fonts.sans.widthOfTextAtSize(ln, size) : xs[i] + 2;
        w.page.drawText(safe(ln), { x: tx, y: w.y - k * (size + 3), size, font: w.fonts.sans, color: rgb(0.1, 0.1, 0.1) });
      });
    });
    w.y -= h;
    // The rule sits in the gap: under the row's descenders, above the next row's capitals.
    const ruleY = w.y + (0.72 * size + h - 0.22 * size) / 2;
    w.page.drawLine({ start: { x: M, y: ruleY }, end: { x: M + width, y: ruleY }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
  }
  w.y -= 8;
}

export async function finish(w) {
  const n = w.pages.length;
  w.pages.forEach((p, i) => {
    const t = safe(`${w.footer}${w.footer ? "  ·  " : ""}page ${i + 1} of ${n}`);
    p.drawText(t, { x: M, y: 30, size: 7.5, font: w.fonts.sans, color: rgb(0.5, 0.5, 0.5) });
  });
  return w.doc.save();
}
