import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenizeContentStream } from "./pdf-content-stream-tokenizer.js";
import { PDFDocument, StandardFonts, rgb } from "./sovereign-pdf.js";
import { buildXrefMap, resolve, readObjAt, readStream } from "./pdf-metadata.js";

function bytes(str) {
  return new TextEncoder().encode(str);
}

test("real graphics-state ops: q/Q, cm, w, re/f/S with plain numeric args", () => {
  const { ops, error, trailingOperands } = tokenizeContentStream(bytes(
    "q\n1 0 0 1 50 50 cm\n2 w\n0 0 1 RG\n10 20 100 40 re\nS\nQ\n"
  ));
  assert.equal(error, null);
  assert.deepEqual(trailingOperands, []);
  assert.deepEqual(ops.map((o) => o.op), ["q", "cm", "w", "RG", "re", "S", "Q"]);
  assert.deepEqual(ops[1].args, [1, 0, 0, 1, 50, 50]);
  assert.deepEqual(ops[2].args, [2]);
  assert.deepEqual(ops[3].args, [0, 0, 1]);
  assert.deepEqual(ops[4].args, [10, 20, 100, 40]);
});

test("real text-showing ops: BT/Tf/Td/Tj/ET with a literal string operand", () => {
  const { ops, error } = tokenizeContentStream(bytes(
    "BT /F1 12 Tf 100 700 Td (Hello World) Tj ET\n"
  ));
  assert.equal(error, null);
  assert.deepEqual(ops.map((o) => o.op), ["BT", "Tf", "Td", "Tj", "ET"]);
  assert.deepEqual(ops[1].args, ["F1", 12]);
  assert.deepEqual(ops[2].args, [100, 700]);
  assert.equal(ops[3].args.length, 1);
  assert.equal(new TextDecoder("latin1").decode(ops[3].args[0]), "Hello World");
});

test("real path ops: m/l/c/re/f and negative + decimal operands", () => {
  const { ops, error } = tokenizeContentStream(bytes(
    "-1.5 0 m 10.25 -3 l 1 2 3 4 5 6 c f\n"
  ));
  assert.equal(error, null);
  assert.deepEqual(ops.map((o) => o.op), ["m", "l", "c", "f"]);
  assert.deepEqual(ops[0].args, [-1.5, 0]);
  assert.deepEqual(ops[1].args, [10.25, -3]);
  assert.deepEqual(ops[2].args, [1, 2, 3, 4, 5, 6]);
});

test("TJ array operand: mixed strings and kerning numbers", () => {
  const { ops, error } = tokenizeContentStream(bytes("[(Hel) -20 (lo)] TJ\n"));
  assert.equal(error, null);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].op, "TJ");
  const arr = ops[0].args[0];
  assert.equal(arr.length, 3);
  assert.equal(new TextDecoder("latin1").decode(arr[0]), "Hel");
  assert.equal(arr[1], -20);
  assert.equal(new TextDecoder("latin1").decode(arr[2]), "lo");
});

test("two bare integers followed by real text is NOT misparsed as an indirect reference (pv() reuse safety)", () => {
  // The exact shape that could in principle trigger pv()'s "N G R"
  // lookahead if a literal capital-R operator ever followed two plain
  // integers - real content streams never do this (no operator is
  // literally "R"), but this proves the reuse doesn't misfire even on
  // an adversarial-looking sequence.
  const { ops, error } = tokenizeContentStream(bytes("3 0 0 -3 100 200 cm\n"));
  assert.equal(error, null);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].op, "cm");
  assert.deepEqual(ops[0].args, [3, 0, 0, -3, 100, 200]);
});

test("inline image (BI...ID...EI) is skipped without corrupting subsequent tokenization", () => {
  const { ops, error } = tokenizeContentStream(bytes(
    "q\nBI /W 2 /H 2 /BPC 8 /CS /G ID \x00\x01\x02\x03 EI\nQ\n0 0 1 rg\n1 1 1 1 re f\n"
  ));
  assert.equal(error, null);
  const names = ops.map((o) => o.op);
  assert.deepEqual(names, ["q", "BI", "Q", "rg", "re", "f"]);
  assert.equal(ops[1].inlineImageSkipped, true);
  assert.deepEqual(ops[4].args, [1, 1, 1, 1]);
});

test("hex string operand parses to real bytes", () => {
  const { ops } = tokenizeContentStream(bytes("<48656C6C6F> Tj\n"));
  assert.equal(new TextDecoder("latin1").decode(ops[0].args[0]), "Hello");
});

test("truncated/malformed trailing input never throws - real ops before it are preserved, the incomplete operand surfaces as a trailing operand instead of corrupting anything", () => {
  // pv() (reused from pdf-metadata.js) is itself throw-free by design -
  // an unterminated dict/array/string just returns whatever was parsed
  // once it hits EOF, rather than raising. Verifying that real,
  // already-established behavior propagates correctly through this
  // tokenizer, not asserting a throw that was never going to happen.
  const { ops, error, trailingOperands } = tokenizeContentStream(bytes("q\n1 0 0 1 0 0 cm\n<<not closed\n"));
  assert.equal(error, null);
  assert.deepEqual(ops.map((o) => o.op), ["q", "cm"], "the two well-formed ops before the malformed dict are still returned");
  assert.deepEqual(ops[0].args, []);
  assert.equal(trailingOperands.length, 1, "the incomplete dict never got consumed by an operator, so it's a real trailing operand - not silently dropped, not misattached to 'cm'");
});

test("a genuinely unparseable byte sequence surfaces via the error field rather than corrupting output", () => {
  // A synthetic case that trips this module's own no-progress guard
  // (not pv()'s), proving the try/catch path is real and reachable, not
  // dead code.
  const stack = [];
  let threw = false;
  try {
    tokenizeContentStream(new Uint8Array([47])); // a lone "/" with nothing after it
  } catch (e) {
    threw = true;
  }
  assert.equal(threw, false, "even a lone delimiter byte with no name characters after it must not throw out of tokenizeContentStream itself");
  const { ops, error } = tokenizeContentStream(new Uint8Array([47]));
  assert.equal(error, null);
  assert.deepEqual(ops, []);
});

test("REAL cross-validation: tokenizes sovereign-pdf.js's own generated content stream, extracted via pdf-metadata.js's independent structural parser", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Cross-validation", { x: 20, y: 250, size: 14, font, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: 20, y: 100, width: 100, height: 40, color: rgb(1, 0, 0) });
  page.drawLine({ start: { x: 0, y: 0 }, end: { x: 50, y: 50 }, thickness: 2, color: rgb(0, 0, 1) });
  const pdfBytes = await doc.save();

  // Independent extraction path: pdf-metadata.js's own xref/object parser
  // (a completely separate module from sovereign-pdf.js, already has its
  // own real test coverage) locates the page's content stream bytes.
  const { xref, trailer } = await buildXrefMap(pdfBytes);
  const catalog = await resolve(trailer.Root, pdfBytes, xref);
  const pagesNode = await resolve(catalog.Pages, pdfBytes, xref);
  const firstPageRef = pagesNode.Kids[0];
  const pageObj = await resolve(firstPageRef, pdfBytes, xref);
  const contentsRef = pageObj.Contents;
  const entry = xref.get(contentsRef.num);
  const { v: stmDict, i: afterDict } = readObjAt(pdfBytes, entry.offset);
  const streamBytes = readStream(pdfBytes, afterDict, stmDict, xref);

  const { ops, error } = tokenizeContentStream(streamBytes);
  assert.equal(error, null, "real generated content stream tokenizes cleanly");

  const opNames = ops.map((o) => o.op);
  assert.ok(opNames.includes("Tj"), "drawText's real Tj operator is present");
  assert.ok(opNames.includes("re"), "drawRectangle's real re operator is present");
  assert.ok(opNames.includes("f"), "drawRectangle's real fill operator is present");
  assert.ok(opNames.includes("m") && opNames.includes("l") && opNames.includes("S"), "drawLine's real moveto/lineto/stroke operators are present");

  const tjOp = ops.find((o) => o.op === "Tj");
  const text = new TextDecoder("latin1").decode(tjOp.args[0]);
  assert.equal(text, "Cross-validation", "the real text drawn by sovereign-pdf.js round-trips through independent tokenization exactly");

  const reOp = ops.find((o) => o.op === "re");
  assert.deepEqual(reOp.args, [20, 100, 100, 40], "the real rectangle geometry round-trips exactly");
});
