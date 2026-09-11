import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { deflate } from './sovereign-deflate.js';

function roundTrip(str) {
  const input = new TextEncoder().encode(str);
  const compressed = deflate(input);
  // Real, independent, battle-tested zlib implementation verifies our
  // output - not our own inflate, so this can't pass by construction.
  const decompressed = inflateSync(Buffer.from(compressed));
  return { input, compressed, decompressed: new Uint8Array(decompressed) };
}

test('deflate: empty input round-trips through real zlib inflate', () => {
  const { input, decompressed } = roundTrip('');
  assert.deepEqual(decompressed, input);
});

test('deflate: short string round-trips through real zlib inflate', () => {
  const { input, decompressed } = roundTrip('Hello, PDF world!');
  assert.deepEqual(decompressed, input);
});

test('deflate: content with all byte values round-trips', () => {
  const input = new Uint8Array(256);
  for (let i = 0; i < 256; i++) input[i] = i;
  const compressed = deflate(input);
  const decompressed = new Uint8Array(inflateSync(Buffer.from(compressed)));
  assert.deepEqual(decompressed, input);
});

test('deflate: exactly one stored block worth of data (65535 bytes) round-trips', () => {
  const input = new Uint8Array(65535).fill(0x41);
  const compressed = deflate(input);
  const decompressed = new Uint8Array(inflateSync(Buffer.from(compressed)));
  assert.deepEqual(decompressed, input);
});

test('deflate: data spanning multiple stored blocks (150000 bytes) round-trips', () => {
  const input = new Uint8Array(150000);
  for (let i = 0; i < input.length; i++) input[i] = i % 251;
  const compressed = deflate(input);
  const decompressed = new Uint8Array(inflateSync(Buffer.from(compressed)));
  assert.deepEqual(decompressed, input);
  // Real content check, not just length - catches a block-boundary bug
  // that byte-256-cycled data with a matching-length check could miss.
  assert.equal(Buffer.from(decompressed).toString('hex'), Buffer.from(input).toString('hex'));
});

test('deflate: realistic PDF content-stream text round-trips', () => {
  const pdfOps = 'BT /F1 12 Tf 100 700 Td (HARDWARE SCHEDULE) Tj ET\n0 0 1 RG 50 50 500 20 re S\n';
  const { input, decompressed } = roundTrip(pdfOps.repeat(50));
  assert.deepEqual(decompressed, input);
});

test('deflate: zlib header is well-formed (CMF/FLG checksum divisible by 31, per RFC 1950)', () => {
  const compressed = deflate(new TextEncoder().encode('check'));
  const cmf = compressed[0];
  const flg = compressed[1];
  assert.equal((cmf * 256 + flg) % 31, 0);
  assert.equal(cmf, 0x78);
});

test('deflate: adler32 trailer matches real Node crypto-independent computation', () => {
  const input = new TextEncoder().encode('adler32 check');
  const compressed = deflate(input);
  const trailer = compressed.subarray(compressed.length - 4);
  const trailerValue = (trailer[0] << 24 | trailer[1] << 16 | trailer[2] << 8 | trailer[3]) >>> 0;

  // Independent adler32 computation (not imported from the module under
  // test) to make sure the trailer isn't just self-consistent with a
  // bug shared between deflate() and its own adler32 helper.
  let a = 1, b = 0;
  for (const byte of input) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  const expected = ((b << 16) | a) >>> 0;
  assert.equal(trailerValue, expected);
});
