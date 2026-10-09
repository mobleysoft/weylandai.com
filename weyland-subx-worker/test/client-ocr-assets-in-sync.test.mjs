// The browser-side readers are served from assets/client-ocr/<name>.mjs.bin, which must be a byte-for-byte
// copy of assets/client-ocr-src/<name>.mjs. Two landings in one day shipped source edits without the copy
// (2026-10-09), so this test fails the suite whenever a pair drifts. To fix: cp the source over the .bin.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "assets", "client-ocr-src");
const BIN = join(here, "..", "assets", "client-ocr");

test("every client-ocr-src module equals its served .bin twin", () => {
  const pairs = readdirSync(SRC).filter((f) => f.endsWith(".mjs")).map((f) => [join(SRC, f), join(BIN, f + ".bin")]).filter(([, b]) => existsSync(b));
  assert.ok(pairs.length >= 3, "expected at least three source/.bin pairs, found " + pairs.length);
  for (const [src, bin] of pairs) {
    assert.ok(readFileSync(src).equals(readFileSync(bin)), "drift: " + src.split("/").pop() + " differs from its .bin; cp the source over the .bin");
  }
});
