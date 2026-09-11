// Real tests for sovereign-pdf.js. No mocking of the PDF structure itself
// - these assert against the actual produced bytes. Independent
// cross-language verification (pypdf) was done manually during
// development (see MONOLITH_HELPER_MAP.md section 3, step 3) and isn't
// repeated here since this repo has no Python test runner wired in;
// what's asserted here is real structural correctness (xref completeness,
// object count, content text presence) that would have caught the real
// object-numbering bug found during that verification.

import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts, rgb } from "./sovereign-pdf.js";

function decode(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

test("save() produces a well-formed PDF 1.7 header and trailer", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  const bytes = await doc.save();
  const text = decode(bytes);
  assert.ok(text.startsWith("%PDF-1.7"));
  assert.match(text, /trailer\s*<<\s*\/Size \d+ \/Root 1 0 R\s*>>/);
  assert.match(text, /startxref\s*\d+\s*%%EOF$/);
});

test("xref table has no gaps - regression test for the real object-numbering bug found via pypdf", async () => {
  // pypdf originally reported "entry N in Xref table invalid; object not
  // found" here - caused by font object numbers starting one past their
  // real slot, leaving a gap in the object sequence. Asserts every
  // object number from 1..Size-1 has a real, parseable "N 0 obj" body.
  const doc = await PDFDocument.create();
  const font1 = await doc.embedFont(StandardFonts.Helvetica);
  const font2 = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  const text = decode(bytes);

  const sizeMatch = text.match(/\/Size (\d+)/);
  assert.ok(sizeMatch, "trailer must declare /Size");
  const size = Number(sizeMatch[1]);

  for (let n = 1; n < size; n++) {
    assert.match(
      text,
      new RegExp(`(^|\\n)${n} 0 obj\\n`),
      `object ${n} must exist in the byte stream (xref declares ${size} objects total)`
    );
  }
});

test("zero-font document still produces a valid, parseable structure", async () => {
  // Edge case that exercises the same off-by-one class of bug at its
  // boundary (fontObjNumBase with fonts.length === 0).
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const bytes = await doc.save();
  const text = decode(bytes);
  const sizeMatch = text.match(/\/Size (\d+)/);
  const size = Number(sizeMatch[1]);
  assert.equal(size, 5); // Catalog, Pages, Page, Content = 4 objects + trailer's Size counts N+1
  for (let n = 1; n < size; n++) {
    assert.match(text, new RegExp(`(^|\\n)${n} 0 obj\\n`));
  }
});

test("drawText content appears verbatim in the (uncompressed) content stream", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText("Hardware Submittal Sheet", { x: 72, y: 700, size: 14, font, color: rgb(0, 0, 0) });
  const bytes = await doc.save();
  const text = decode(bytes);
  assert.ok(text.includes("(Hardware Submittal Sheet) Tj"));
});

test("parens and backslashes in drawText are escaped per the PDF literal-string spec", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText("Door (101) \\ Set", { x: 0, y: 0, size: 10, font });
  const bytes = await doc.save();
  const text = decode(bytes);
  assert.ok(text.includes("Door \\(101\\) \\\\ Set"));
});

test("widthOfTextAtSize uses real Helvetica/Helvetica-Bold AFM metrics and differs by weight", async () => {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const wRegular = helvetica.widthOfTextAtSize("HARDWARE", 28);
  const wBold = helveticaBold.widthOfTextAtSize("HARDWARE", 28);
  assert.ok(wRegular > 0);
  assert.ok(wBold > wRegular, "bold glyphs should measure wider than regular at the same size");
});

test("multi-page documents get a correct /Kids array and /Count", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  const text = decode(bytes);
  assert.match(text, /\/Kids \[3 0 R 5 0 R 7 0 R\] \/Count 3/);
  assert.equal(doc.getPageCount(), 3);
});

test("drawRectangle with no color/borderColor defaults to a black fill (matches pdf-lib's default)", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([100, 100]);
  page.drawRectangle({ x: 0, y: 0, width: 10, height: 10 });
  const bytes = await doc.save();
  const text = decode(bytes);
  assert.ok(text.includes("0 0 0 rg\n0 0 10 10 re f"));
});
