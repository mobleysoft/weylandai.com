/**
 * Sovereign DEFLATE encoder - zlib-wrapped, stored-blocks only (RFC 1951
 * section 3.2.4 + RFC 1950 wrapper), a drop-in replacement for
 * `pako.deflate(data)` at this app's real pako call sites.
 *
 * Scope, deliberately: this ships CORRECT, standards-compliant output
 * with zero Huffman coding - every real DEFLATE-compliant reader (this
 * app's own pdfjs-dist rasterizer, pdf-lib's own FlateStream, Adobe
 * Acrobat) decodes it identically to a "real" compressed stream, just
 * larger on disk. This is the "store uncompressed" fallback
 * MONOLITH_HELPER_MAP.md's sovereignty plan already blessed as a valid,
 * correct first step - not a shortcut around it. Real Huffman
 * compression (smaller output) can follow as a later, separate
 * enhancement without changing the format or any call site.
 *
 * Why this exists instead of patching pdf-lib's internal `encode: true`
 * default directly: real first-party code (src/lib/submittal-assembler.js)
 * only touches pdf-lib's public API (drawText/drawRectangle/addPage,
 * etc.) - the encode default lives deep in pdf-lib's own internal
 * PDFContentStream.of(), with no exposed override at the layer this app
 * calls. Patching that vendored default in multiple internal call sites
 * is more fragile than swapping the one function it delegates to.
 */

const MAX_STORED_BLOCK_SIZE = 65535;

/** RFC 1950 Adler-32 checksum. */
function adler32(data) {
  let a = 1;
  let b = 0;
  const MOD_ADLER = 65521;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * Encode `data` as a sequence of RFC 1951 stored (uncompressed) DEFLATE
 * blocks, wrapped in an RFC 1950 zlib header/trailer.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function deflate(data) {
  if (!(data instanceof Uint8Array)) {
    data = new Uint8Array(data);
  }

  const blocks = [];
  let offset = 0;
  if (data.length === 0) {
    // A single empty final stored block - still a valid deflate stream.
    blocks.push(encodeStoredBlock(new Uint8Array(0), true));
  }
  while (offset < data.length) {
    const remaining = data.length - offset;
    const chunkSize = Math.min(remaining, MAX_STORED_BLOCK_SIZE);
    const isFinal = offset + chunkSize >= data.length;
    const chunk = data.subarray(offset, offset + chunkSize);
    blocks.push(encodeStoredBlock(chunk, isFinal));
    offset += chunkSize;
  }

  const deflateBody = concatBytes(blocks);
  const checksum = adler32(data);

  // zlib header: CMF=0x78 (32K window, deflate method), FLG chosen so
  // (CMF*256 + FLG) % 31 === 0 and no preset dictionary/compression-level
  // bits asserted beyond the minimum valid combination - 0x78 0x01 is a
  // standard, widely-used "fastest/no compression" zlib header.
  const CMF = 0x78;
  const FLG = 0x01;

  const out = new Uint8Array(2 + deflateBody.length + 4);
  out[0] = CMF;
  out[1] = FLG;
  out.set(deflateBody, 2);
  // Adler-32 trailer, big-endian, per RFC 1950.
  const trailerOffset = 2 + deflateBody.length;
  out[trailerOffset] = (checksum >>> 24) & 0xff;
  out[trailerOffset + 1] = (checksum >>> 16) & 0xff;
  out[trailerOffset + 2] = (checksum >>> 8) & 0xff;
  out[trailerOffset + 3] = checksum & 0xff;

  return out;
}

/** One RFC 1951 stored block: 3-bit header (padded to a byte), LEN, NLEN, raw data. */
function encodeStoredBlock(chunk, isFinal) {
  // Block header: BFINAL (1 bit) + BTYPE=00 (2 bits) = a single byte with
  // only the BFINAL bit possibly set, since the block boundary is then
  // padded out to the next full byte per RFC 1951 3.2.4.
  const header = isFinal ? 0x01 : 0x00;
  const len = chunk.length;
  const nlen = (~len) & 0xffff;

  const out = new Uint8Array(1 + 4 + len);
  out[0] = header;
  out[1] = len & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out[3] = nlen & 0xff;
  out[4] = (nlen >>> 8) & 0xff;
  out.set(chunk, 5);
  return out;
}

function concatBytes(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
