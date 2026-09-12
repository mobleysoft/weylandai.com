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
  getInheritedPageAttr,
  getPageResources,
  getPageMediaBox,
  getPageContentBytes,
  resolveXObject,
  NATIVE_DECODABLE_IMAGE_FILTERS,
  KNOWN_UNSUPPORTED_IMAGE_FILTERS,
  WS,
  DL,
  TEXT_OPS,
} from "./pdf-metadata.js";
import fs from "node:fs";

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

test("readObjAt: real well-formed offset (pointing exactly at the object-number digit)", () => {
  const b = bytes("9 0 obj\n<< /Foo /Bar >>\nendobj\n");
  const r = readObjAt(b, 0);
  assert.deepEqual(r.v, { Foo: "Bar" });
});

test("readObjAt: real off-by-one offset (pointing at the newline BEFORE the object number) - found 2026-09-12 via the real OCCDoorSchedulePg4.pdf cross-validation, where the file's own xref table has exactly this quirk on its Catalog object", () => {
  const b = bytes("\n9 0 obj\n<< /Foo /Bar >>\nendobj\n");
  const r = readObjAt(b, 0); // offset 0 is the leading '\n', not the '9'
  assert.deepEqual(r.v, { Foo: "Bar" }, "must still parse the real dict, not silently return the generation number (0) as a bare value");
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

// --- Added 2026-09-12 (weylandai.com/pdf-render.js sovereign-rasterizer
// task): page-content/resource/XObject helpers ---

// A real PDF exercising every gap the rasterizer needs closed that
// buildMinimalPdf() above doesn't: MediaBox/Resources INHERITED from the
// Pages node (not on the Page itself), page content split across TWO
// separate stream objects (the real pattern OCCDoorSchedulePg4.pdf uses,
// at much larger scale - 87 streams), and three XObject images covering
// the three real cases a rasterizer must distinguish: a Flate-compressed
// raw-sample image (fully decodable to raw bytes with no browser help), a
// DCTDecode (JPEG) image (bytes must stay encoded for createImageBitmap),
// and a CCITTFaxDecode image (no native browser decode - must be flagged
// unsupported, not silently mis-decoded).
function buildRasterizerFixturePdf() {
  const flateImageRaw = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]); // 2x2 RGB
  const flateImageCompressed = zlib.deflateSync(Buffer.from(flateImageRaw));
  const dctFakeBytes = Buffer.from("FAKEJPEGBYTES");
  const ccittFakeBytes = Buffer.from("FAKECCITTBYTES");

  const parts = [];
  const offsets = [];
  let pos = 0;
  function push(s) {
    const buf = typeof s === "string" ? Buffer.from(s, "latin1") : Buffer.from(s);
    parts.push(buf);
    pos += buf.length;
  }
  function beginObj(n) {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
  }

  push("%PDF-1.7\n");
  beginObj(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObj(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 200 100] /Resources 10 0 R >>\nendobj\n");
  beginObj(3);
  push("<< /Type /Page /Parent 2 0 R /Contents [4 0 R 5 0 R] >>\nendobj\n"); // no own MediaBox/Resources - inherited
  beginObj(4);
  const c4 = "1 0 0 rg\n10 10 50 30 re\nf\n";
  push(`<< /Length ${c4.length} >>\nstream\n${c4}\nendstream\nendobj\n`);
  beginObj(5);
  const c5 = "/Im1 Do\n";
  push(`<< /Length ${c5.length} >>\nstream\n${c5}\nendstream\nendobj\n`);
  beginObj(9);
  push(`<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${flateImageCompressed.length} >>\nstream\n`);
  push(flateImageCompressed);
  push("\nendstream\nendobj\n");
  beginObj(11);
  push(`<< /Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${dctFakeBytes.length} >>\nstream\n`);
  push(dctFakeBytes);
  push("\nendstream\nendobj\n");
  beginObj(12);
  push(`<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /Length ${ccittFakeBytes.length} >>\nstream\n`);
  push(ccittFakeBytes);
  push("\nendstream\nendobj\n");
  beginObj(10);
  push("<< /XObject << /Im1 9 0 R /Im2 11 0 R /Im3 12 0 R >> >>\nendobj\n");

  const maxObj = 12;
  const xrefOffset = pos;
  const size = maxObj + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    xref += (offsets[n] !== undefined ? String(offsets[n]).padStart(10, "0") : "0000000000") + " 00000 n \n";
  }
  push(xref);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.concat(parts);
}

async function setupFixture() {
  const pdfBytes = buildRasterizerFixturePdf();
  const b = new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.length);
  const { xref, trailer } = await buildXrefMap(b);
  const catalog = await resolve(trailer.Root, b, xref);
  const pagesNode = await resolve(catalog.Pages, b, xref);
  const pageDict = await resolve(pagesNode.Kids[0], b, xref);
  return { b, xref, pageDict };
}

test("getInheritedPageAttr: real walk up the Parent chain finds Resources/MediaBox the Page itself doesn't carry", async () => {
  const { b, xref, pageDict } = await setupFixture();
  assert.equal(pageDict.Resources, undefined, "fixture's Page object genuinely has no own Resources");
  const resources = await getInheritedPageAttr(b, xref, pageDict, "Resources");
  assert.ok(resources.XObject, "found the real Resources dict from the Pages ancestor");
  const mediaBox = await getInheritedPageAttr(b, xref, pageDict, "MediaBox");
  assert.deepEqual(mediaBox, [0, 0, 200, 100]);
});

test("getPageResources / getPageMediaBox: real convenience wrappers", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const resources = await getPageResources(b, xref, pageDict);
  assert.ok(resources.XObject);
  const mediaBox = await getPageMediaBox(b, xref, pageDict);
  assert.deepEqual(mediaBox, [0, 0, 200, 100]);
});

test("getPageMediaBox: real honest US-Letter default when truly absent anywhere in the chain", async () => {
  const b = new Uint8Array(buildMinimalPdf());
  const { xref, trailer } = await buildXrefMap(b);
  const catalog = await resolve(trailer.Root, b, xref);
  const pagesNode = await resolve(catalog.Pages, b, xref);
  const pageDict = await resolve(pagesNode.Kids[0], b, xref);
  // buildMinimalPdf's page DOES set its own MediaBox - delete it to test the true-absence path
  delete pageDict.MediaBox;
  const mediaBox = await getPageMediaBox(b, xref, pageDict);
  assert.deepEqual(mediaBox, [0, 0, 612, 792]);
});

test("getPageContentBytes: real concatenation of TWO separate content-stream objects into one tokenizable byte array", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const { bytes: contentBytes, errors } = await getPageContentBytes(b, xref, pageDict);
  assert.deepEqual(errors, []);
  const text = new TextDecoder("latin1").decode(contentBytes);
  assert.ok(text.includes("1 0 0 rg"), "first stream's content present");
  assert.ok(text.includes("/Im1 Do"), "second stream's content present");
  // Real, load-bearing check: the two streams are joined with whitespace,
  // not glued - "f\n" (end of stream 4) and "/Im1" (start of stream 5)
  // must not have fused into a single bad token.
  assert.match(text, /f\n?\s\/Im1 Do/);
});

test("resolveXObject: real Flate-compressed raw-sample image decodes to actual raw RGB bytes, nativeDecodable", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const resources = await getPageResources(b, xref, pageDict);
  const img = await resolveXObject(b, xref, resources, "Im1");
  assert.equal(img.subtype, "Image");
  assert.equal(img.width, 2);
  assert.equal(img.height, 2);
  assert.equal(img.terminalFilter, null, "FlateDecode was fully consumed - no terminal codec left");
  assert.equal(img.nativeDecodable, true);
  assert.equal(img.unsupported, false);
  assert.deepEqual(Array.from(img.bytes), [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0], "real decompressed raw RGB samples, not still-compressed bytes");
});

test("resolveXObject: real DCTDecode image keeps bytes encoded for the browser's native JPEG decoder", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const resources = await getPageResources(b, xref, pageDict);
  const img = await resolveXObject(b, xref, resources, "Im2");
  assert.equal(img.terminalFilter, "DCTDecode");
  assert.equal(img.nativeDecodable, true);
  assert.equal(img.unsupported, false);
  assert.equal(new TextDecoder("latin1").decode(img.bytes), "FAKEJPEGBYTES", "DCTDecode bytes are NOT touched - real JPEG bytes for createImageBitmap");
});

test("resolveXObject: real CCITTFaxDecode image is honestly flagged unsupported, bytes not fabricated into pixels", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const resources = await getPageResources(b, xref, pageDict);
  const img = await resolveXObject(b, xref, resources, "Im3");
  assert.equal(img.terminalFilter, "CCITTFaxDecode");
  assert.equal(img.nativeDecodable, false);
  assert.equal(img.unsupported, true);
});

test("resolveXObject: a real nonexistent XObject name returns null, not a crash", async () => {
  const { b, xref, pageDict } = await setupFixture();
  const resources = await getPageResources(b, xref, pageDict);
  const img = await resolveXObject(b, xref, resources, "NoSuchImage");
  assert.equal(img, null);
});

test("NATIVE_DECODABLE_IMAGE_FILTERS / KNOWN_UNSUPPORTED_IMAGE_FILTERS: real, disjoint, honest sets", () => {
  assert.ok(NATIVE_DECODABLE_IMAGE_FILTERS.has("DCTDecode"));
  assert.ok(KNOWN_UNSUPPORTED_IMAGE_FILTERS.has("CCITTFaxDecode"));
  assert.ok(KNOWN_UNSUPPORTED_IMAGE_FILTERS.has("JBIG2Decode"));
  for (const f of NATIVE_DECODABLE_IMAGE_FILTERS) assert.ok(!KNOWN_UNSUPPORTED_IMAGE_FILTERS.has(f));
});

// --- REAL cross-validation against this venture's actual real test
// document (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf, a real
// customer-shaped door-schedule submittal) - not a hand fixture. Skips
// (does not fail) if the file isn't present on this machine, since it's
// a real local file outside this repo, not a portable committed fixture.
const REAL_TEST_PDF_PATH = "/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf";
const hasRealTestPdf = fs.existsSync(REAL_TEST_PDF_PATH);

test(
  "REAL cross-validation: OCCDoorSchedulePg4.pdf is confirmed vector line-art (zero text ops) with 11 real DCTDecode image XObjects, not one full-page scan image",
  { skip: !hasRealTestPdf && "real test PDF not present on this machine" },
  async () => {
    const b = new Uint8Array(fs.readFileSync(REAL_TEST_PDF_PATH));
    const { xref, trailer } = await buildXrefMap(b);
    const numPages = await getPageCount(b, xref, trailer);
    assert.equal(numPages, 1);
    const catalog = await resolve(trailer.Root, b, xref);
    const pageList = await buildPageList(b, xref, catalog.Pages);
    assert.equal(pageList.length, 1);
    const pageDict = await resolve(pageList[0], b, xref);

    const mediaBox = await getPageMediaBox(b, xref, pageDict);
    assert.deepEqual(mediaBox, [0, 0, 612, 792]);

    const resources = await getPageResources(b, xref, pageDict);
    const xobjDict = await resolve(resources.XObject, b, xref);
    const imageNames = Object.keys(xobjDict);
    assert.equal(imageNames.length, 11, "real file has exactly 11 embedded XObject images (small logos/marks, NOT one full-page scan)");

    for (const name of imageNames) {
      const img = await resolveXObject(b, xref, resources, name);
      assert.equal(img.subtype, "Image");
      assert.equal(img.terminalFilter, "DCTDecode", `${name}: real file uses DCTDecode (baseline JPEG) - natively browser-decodable, confirmed not JBIG2/CCITT`);
      assert.equal(img.nativeDecodable, true);
      assert.equal(img.unsupported, false);
      assert.ok(img.width > 0 && img.height > 0);
    }

    const { bytes: contentBytes, errors } = await getPageContentBytes(b, xref, pageDict);
    assert.deepEqual(errors, [], "all 87 real content-stream objects decoded cleanly");
    const text = new TextDecoder("latin1").decode(contentBytes);
    // Real, load-bearing finding this task's investigation made: this
    // document has ZERO text-showing operators anywhere - it's a
    // vectorized scan (thousands of hairline stroked segments), not
    // extractable text and not a single raster page image either.
    assert.ok(!/\bBT\b/.test(text), "no BT (begin-text) operator anywhere in the real page content");
    assert.ok(!/\bTj\b/.test(text), "no Tj (show-text) operator anywhere in the real page content");
    const strokeCount = (text.match(/\sS\s/g) || []).length;
    assert.ok(strokeCount > 10000, `real file's page is dense vector line-art - expected >10000 stroke ops, saw ${strokeCount}`);
  }
);
