import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretGraphicsOps } from "./pdf-graphics-state.js";
import { tokenizeContentStream } from "./pdf-content-stream-tokenizer.js";
import { PDFDocument, StandardFonts, rgb } from "./sovereign-pdf.js";
import { buildXrefMap, resolve, readObjAt, readStream } from "./pdf-metadata.js";

function bytes(str) {
  return new TextEncoder().encode(str);
}
function runOps(str, initialCtm) {
  const { ops, error } = tokenizeContentStream(bytes(str));
  assert.equal(error, null, `tokenizer error on input: ${str}`);
  return interpretGraphicsOps(ops, initialCtm);
}

test("rectangle fill: real geometry, real color, identity CTM", () => {
  const { events, warnings } = runOps("1 0 0 rg\n10 20 100 50 re\nf\n");
  assert.deepEqual(warnings, []);
  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.type, "fill");
  assert.deepEqual(ev.color, { r: 1, g: 0, b: 0 });
  assert.equal(ev.evenOdd, false);
  assert.equal(ev.subpaths.length, 1);
  const pts = ev.subpaths[0].points;
  assert.deepEqual(pts, [[10, 20], [110, 20], [110, 70], [10, 70]]);
  assert.equal(ev.subpaths[0].closed, true, "re always produces a closed subpath");
});

test("cm transform correctly scales path construction (points transformed at construction time)", () => {
  const { events } = runOps("2 0 0 2 0 0 cm\n0 0 10 10 re\nf\n");
  const pts = events[0].subpaths[0].points;
  assert.deepEqual(pts, [[0, 0], [20, 0], [20, 20], [0, 20]]);
});

test("q/Q correctly saves and restores CTM - a cm inside q...Q doesn't leak out", () => {
  const { events } = runOps(
    "q\n5 0 0 5 0 0 cm\n0 0 1 1 re\nf\nQ\n0 0 1 1 re\nf\n"
  );
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].subpaths[0].points, [[0, 0], [5, 0], [5, 5], [0, 5]], "inside q: scaled 5x");
  assert.deepEqual(events[1].subpaths[0].points, [[0, 0], [1, 0], [1, 1], [0, 1]], "after Q: back to identity, not still scaled");
});

test("unbalanced Q (no matching q) is a real warning, not a crash", () => {
  const { events, warnings } = runOps("Q\n0 0 1 1 re\nf\n");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /stack underflow/);
  assert.equal(events.length, 1, "still processes the rest of the stream correctly after the bad Q");
});

test("stroke with real line width and RGB color", () => {
  const { events } = runOps("0 0 1 RG\n3 w\n0 0 m\n10 10 l\nS\n");
  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.type, "stroke");
  assert.deepEqual(ev.color, { r: 0, g: 0, b: 1 });
  assert.equal(ev.lineWidth, 3);
  assert.deepEqual(ev.subpaths[0].points, [[0, 0], [10, 10]]);
});

test("DeviceGray fill/stroke color operators (g/G)", () => {
  const { events } = runOps("0.5 g\n0 0 10 10 re\nf\n0.25 G\n0 0 m 5 5 l S\n");
  assert.deepEqual(events[0].color, { r: 0.5, g: 0.5, b: 0.5 });
  assert.deepEqual(events[1].color, { r: 0.25, g: 0.25, b: 0.25 });
});

test("CMYK operators (k/K) produce a real, honest warning rather than silently misrendering", () => {
  const { warnings } = runOps("0 0 0 1 k\n0 0 10 10 re\nf\n");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /CMYK/);
});

test("cubic Bezier (c) flattens to real line segments, not left as raw control points", () => {
  const { events } = runOps("0 0 m\n0 10 10 10 10 0 c\nf\n");
  const pts = events[0].subpaths[0].points;
  // 1 moveto point + 16 flattened bezier segment endpoints
  assert.equal(pts.length, 17);
  assert.deepEqual(pts[0], [0, 0], "starts at the real moveto point");
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last[0] - 10) < 1e-9 && Math.abs(last[1] - 0) < 1e-9, "curve genuinely ends at the real spec'd endpoint (10,0)");
});

test("v and y curve variants correctly substitute the implicit control point", () => {
  // v: first control point = current point
  const vResult = runOps("0 0 m\n5 5 10 0 v\nf\n");
  const vPts = vResult.events[0].subpaths[0].points;
  assert.equal(vPts.length, 17);
  // y: second control point = endpoint
  const yResult = runOps("0 0 m\n5 5 10 0 y\nf\n");
  const yPts = yResult.events[0].subpaths[0].points;
  assert.equal(yPts.length, 17);
  assert.ok(Math.abs(yPts[16][0] - 10) < 1e-9 && Math.abs(yPts[16][1] - 0) < 1e-9);
});

test("B fills AND strokes the same real path with both real colors", () => {
  const { events } = runOps("1 0 0 rg\n0 0 1 RG\n2 w\n0 0 10 10 re\nB\n");
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "fill");
  assert.deepEqual(events[0].color, { r: 1, g: 0, b: 0 });
  assert.equal(events[1].type, "stroke");
  assert.deepEqual(events[1].color, { r: 0, g: 0, b: 1 });
  assert.deepEqual(events[0].subpaths, events[1].subpaths, "fill and stroke operate on the exact same real path geometry");
});

test("n (no-op paint) clears the path without emitting any event - real use case: clipping-only paths", () => {
  const { events } = runOps("0 0 10 10 re\nn\n0 0 1 1 re\nf\n");
  assert.equal(events.length, 1, "the first rectangle (before n) never gets painted");
  assert.deepEqual(events[0].subpaths[0].points, [[0, 0], [1, 0], [1, 1], [0, 1]]);
});

test("unknown/text operators (BT, Tf, Tj, etc.) are safely ignored by this milestone, not crashed on", () => {
  const { events, warnings } = runOps("BT /F1 12 Tf 0 0 Td (hi) Tj ET\n1 0 0 rg 0 0 5 5 re f\n");
  assert.equal(warnings.length, 0, "text ops don't even warn - real, deliberate scope boundary, not a silent failure");
  assert.equal(events.length, 1);
});

test("REAL cross-validation: interprets sovereign-pdf.js's own generated content stream via the real tokenizer, geometry matches exactly what was drawn", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("ignored by this milestone", { x: 5, y: 5, size: 10, font, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: 20, y: 100, width: 100, height: 40, color: rgb(1, 0, 0) });
  page.drawLine({ start: { x: 0, y: 0 }, end: { x: 50, y: 50 }, thickness: 2, color: rgb(0, 0, 1) });
  const pdfBytes = await doc.save();

  const { xref, trailer } = await buildXrefMap(pdfBytes);
  const catalog = await resolve(trailer.Root, pdfBytes, xref);
  const pagesNode = await resolve(catalog.Pages, pdfBytes, xref);
  const pageObj = await resolve(pagesNode.Kids[0], pdfBytes, xref);
  const entry = xref.get(pageObj.Contents.num);
  const { v: stmDict, i: afterDict } = readObjAt(pdfBytes, entry.offset);
  const streamBytes = readStream(pdfBytes, afterDict, stmDict, xref);

  const { ops } = tokenizeContentStream(streamBytes);
  const { events } = interpretGraphicsOps(ops);

  const fillEv = events.find((e) => e.type === "fill" && e.color.r === 1);
  assert.ok(fillEv, "the real red rectangle fill event is present");
  assert.deepEqual(fillEv.subpaths[0].points, [[20, 100], [120, 100], [120, 140], [20, 140]], "real rectangle geometry drawn by sovereign-pdf.js round-trips exactly through tokenize+interpret");

  const strokeEv = events.find((e) => e.type === "stroke");
  assert.ok(strokeEv, "the real blue line stroke event is present");
  assert.deepEqual(strokeEv.color, { r: 0, g: 0, b: 1 });
  assert.equal(strokeEv.lineWidth, 2);
  assert.deepEqual(strokeEv.subpaths[0].points, [[0, 0], [50, 50]]);
});
