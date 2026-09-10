import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import {
  skip,
  findStr,
  decodeStr,
  inflate,
  unpredict,
  pv,
  pvDict,
  pvArr,
  pvName,
  pvLitStr,
  pvHex,
  pvNumRef,
  readObjAt,
  readStream,
  findStartXref,
  parseClassicXref,
  buildXrefMap,
  resolve,
  resolveRef,
  getPageCount,
  buildPageList,
  refMatch,
  getBookmarks,
  extractPdfBookmarks,
  detectTextLayer,
  WS,
  DL,
  TEXT_OPS,
} from "./pdf-metadata.js";

function bytes(str) {
  return new Uint8Array([...str].map((c) => c.charCodeAt(0)));
}

// --- real, byte-offset-correct minimal PDF builder (classic xref table) ---
// Not a fixture pulled from a real-world file - assembled here so every byte
// is understood, and offsets are computed from real string lengths rather
// than hand-counted (hand-counting invites exactly the kind of subtle
// off-by-one bug this parser has to handle robustly in the wild).
function buildMinimalPdf({ withOutline = false, textOpsRepeat = 1 } = {}) {
  const contentStream = "BT /F1 12 Tf 100 700 Td (Hello World) Tj ET\n".repeat(textOpsRepeat).trim();
  const parts = [];
  const offsets = [];
  let pos = 0;
  function push(s) {
    parts.push(s);
    pos += s.length;
  }
  push("%PDF-1.4\n");
  offsets[1] = pos;
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R" + (withOutline ? " /Outlines 5 0 R" : "") + " >>\nendobj\n");
  offsets[2] = pos;
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  offsets[3] = pos;
  push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n");
  offsets[4] = pos;
  push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  let maxObj = 4;
  if (withOutline) {
    offsets[5] = pos;
    push("5 0 obj\n<< /Type /Outlines /First 6 0 R /Last 6 0 R /Count 1 >>\nendobj\n");
    offsets[6] = pos;
    push("6 0 obj\n<< /Title (Section One) /Parent 5 0 R /Dest [3 0 R /Fit] >>\nendobj\n");
    maxObj = 6;
  }
  const xrefOffset = pos;
  const size = maxObj + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    xref += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  }
  push(xref);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  const full = parts.join("");
  return bytes(full).buffer;
}

// --- low-level tokenizer primitives ---

test("skip: real behavior skips whitespace and % comments, stops at real content", () => {
  const b = bytes("  \n\t% a comment\nX");
  const i = skip(b, 0);
  assert.equal(String.fromCharCode(b[i]), "X");
});

test("findStr: real forward and backward search over raw bytes", () => {
  const b = bytes("abc startxref def startxref ghi");
  assert.equal(findStr(b, "startxref", 0, false), 4);
  assert.equal(findStr(b, "startxref", b.length - 1, true), 18);
  assert.equal(findStr(b, "notfound", 0, false), -1);
});

test("decodeStr: real latin1 decoding of raw bytes", () => {
  assert.equal(decodeStr(bytes("hello")), "hello");
});

test("pvName: real PDF name parsing, including #xx hex-escapes", () => {
  const b = bytes("Type/Subtype#20With#20Spaces ");
  const r = pvName(b, 5);
  assert.equal(r.v, "Subtype With Spaces");
});

test("pvNumRef: a real 'N G R' triple parses as an indirect reference", () => {
  const b = bytes("12 0 R");
  const r = pvNumRef(b, 0);
  assert.deepEqual(r.v, { _ref: true, num: 12, gen: 0 });
});

test("pvNumRef: a bare number is NOT mistaken for a reference", () => {
  const b = bytes("42.5 ");
  const r = pvNumRef(b, 0);
  assert.equal(r.v, 42.5);
});

test("pvLitStr: real literal-string parsing handles escapes and nested parens", () => {
  const b = bytes("(line1\\nline2 (nested) end)");
  const r = pvLitStr(b, 1);
  const text = new TextDecoder("latin1").decode(r.v);
  assert.equal(text, "line1\nline2 (nested) end");
});

test("pvHex: real hex-string parsing, including an odd-length hex string", () => {
  const r1 = pvHex(bytes("48656C6C6F>"), 0);
  assert.equal(new TextDecoder("latin1").decode(r1.v), "Hello");
  const r2 = pvHex(bytes("ABC>"), 0); // odd length, real behavior pads with a trailing 0
  assert.equal(r2.v.length, 2);
});

test("pvArr + pvDict: real nested array/dict parsing", () => {
  const b = bytes("<< /Kids [1 0 R 2 0 R] /Count 2 >>");
  const r = pvDict(b, 3);
  assert.deepEqual(r.v.Kids, [{ _ref: true, num: 1, gen: 0 }, { _ref: true, num: 2, gen: 0 }]);
  assert.equal(r.v.Count, 2);
});

test("pv: real dispatch across true/false/null literals", () => {
  assert.equal(pv(bytes("true"), 0).v, true);
  assert.equal(pv(bytes("false"), 0).v, false);
  assert.equal(pv(bytes("null"), 0).v, null);
});

test("refMatch: real reference equality by num+gen, not object identity", () => {
  assert.equal(refMatch({ _ref: true, num: 3, gen: 0 }, { _ref: true, num: 3, gen: 0 }), true);
  assert.equal(refMatch({ _ref: true, num: 3, gen: 0 }, { _ref: true, num: 4, gen: 0 }), false);
  // real behavior: a bare && chain short-circuits to the first falsy
  // operand, not a coerced boolean - refMatch(null, x) is null, not false.
  assert.equal(refMatch(null, { _ref: true, num: 3, gen: 0 }), null);
});

// --- PNG-predictor un-filtering (used for xref streams) ---

test("unpredict: real 'up' filter (type 2) un-filtering round-trips a known pattern", () => {
  // 2 rows x 2 columns, filter type 2 ("Up": each byte += byte directly above)
  // Row 0 (first row, "above" is implicitly all zero): filter byte 2, data [10, 20]
  // Row 1: filter byte 2, data [5, 5]  ->  unfiltered: [10+5, 20+5] = [15, 25]
  const raw = new Uint8Array([2, 10, 20, 2, 5, 5]);
  const result = unpredict(raw, 2);
  assert.deepEqual(Array.from(result), [10, 20, 15, 25]);
});

// --- inflate (real DecompressionStream, not a from-scratch DEFLATE reimplementation) ---

test("inflate: real round-trip against a real zlib-raw-deflated buffer", async () => {
  const original = new TextEncoder().encode("The quick brown fox jumps over the lazy dog. ".repeat(5));
  const compressed = zlib.deflateSync(original); // real zlib (not raw) container
  const result = await inflate(compressed);
  assert.equal(new TextDecoder().decode(result), new TextDecoder().decode(original));
});

// --- real, end-to-end PDF parsing against a real, byte-correct minimal PDF ---

test("findStartXref + parseClassicXref: real byte-offset-correct xref table parses to 4 live entries", () => {
  const buf = new Uint8Array(buildMinimalPdf());
  const startOff = findStartXref(buf);
  assert.ok(startOff > 0);
  const { entries, trailer } = parseClassicXref(buf, startOff);
  assert.equal(entries.size, 4);
  assert.deepEqual(trailer.Root, { _ref: true, num: 1, gen: 0 });
});

test("buildXrefMap: real behavior resolves the full xref + trailer from a real minimal PDF", async () => {
  const buf = new Uint8Array(buildMinimalPdf());
  const result = await buildXrefMap(buf);
  assert.equal(result.xref.size, 4);
  assert.deepEqual(result.trailer.Root, { _ref: true, num: 1, gen: 0 });
});

test("resolve + resolveRef: real object resolution reads the Catalog dict out of the file", async () => {
  const buf = new Uint8Array(buildMinimalPdf());
  const { xref, trailer } = await buildXrefMap(buf);
  const catalog = await resolve(trailer.Root, buf, xref);
  assert.equal(catalog.Type, "Catalog");
  assert.deepEqual(catalog.Pages, { _ref: true, num: 2, gen: 0 });
});

test("getPageCount: real end-to-end page count from a real minimal one-page PDF", async () => {
  const buf = new Uint8Array(buildMinimalPdf());
  const { xref, trailer } = await buildXrefMap(buf);
  const count = await getPageCount(buf, xref, trailer);
  assert.equal(count, 1);
});

test("buildPageList: real page-tree walk resolves the single Page node", async () => {
  const buf = new Uint8Array(buildMinimalPdf());
  const { xref, trailer } = await buildXrefMap(buf);
  const catalog = await resolve(trailer.Root, buf, xref);
  const pages = await buildPageList(buf, xref, catalog.Pages);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0], { _ref: true, num: 3, gen: 0 });
});

test("extractPdfBookmarks: real end-to-end - no Outlines entry means null bookmarks, correct page count", async () => {
  const result = await extractPdfBookmarks(buildMinimalPdf({ withOutline: false }));
  assert.equal(result.numPages, 1);
  assert.equal(result.bookmarks, null);
});

test("extractPdfBookmarks: real end-to-end - a real Outline tree is extracted with its title", async () => {
  const result = await extractPdfBookmarks(buildMinimalPdf({ withOutline: true }));
  assert.equal(result.numPages, 1);
  assert.ok(result.bookmarks);
  assert.equal(result.bookmarks.length, 1);
  assert.equal(result.bookmarks[0].title, "Section One");
});

test("extractPdfBookmarks: real behavior fails soft (1 page, null bookmarks) on a non-PDF buffer", async () => {
  const result = await extractPdfBookmarks(new TextEncoder().encode("not a pdf at all").buffer);
  assert.equal(result.numPages, 1);
  assert.equal(result.bookmarks, null);
});

test("detectTextLayer: real behavior - a sparse content stream (3 ops) stays below the real 50-op threshold", async () => {
  const result = await detectTextLayer(buildMinimalPdf());
  assert.equal(result.textItemCount, 3);
  assert.equal(result.hasTextLayer, false);
  assert.equal(result.route, "vision-primary");
  assert.equal(result.totalPages, 1);
});

test("detectTextLayer: real behavior - a dense content stream (60 ops) crosses the real 50-op threshold", async () => {
  const result = await detectTextLayer(buildMinimalPdf({ textOpsRepeat: 20 }));
  assert.equal(result.textItemCount, 60);
  assert.equal(result.hasTextLayer, true);
  assert.equal(result.route, "text-extractable");
});

// --- exported constants ---

test("WS/DL/TEXT_OPS: real constant contents match the PDF spec's own whitespace/delimiter/text-op sets", () => {
  assert.ok(WS.has(32)); // space
  assert.ok(WS.has(10)); // \n
  assert.ok(DL.has(47)); // '/'
  assert.ok(DL.has(60)); // '<'
  assert.deepEqual(TEXT_OPS, ["BT", "Tj", "TJ", "Tf", "'", '"']);
});
