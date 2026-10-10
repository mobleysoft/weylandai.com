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
  const pairs = readdirSync(SRC).filter((f) => f.endsWith(".mjs")).map((f) => [join(SRC, f), join(BIN, f + ".bin")]);
  assert.ok(pairs.length >= 3, "expected at least three source/.bin pairs, found " + pairs.length);
  for (const [src, bin] of pairs) {
    assert.ok(existsSync(bin), "missing served module: " + bin);
    assert.ok(readFileSync(src).equals(readFileSync(bin)), "drift: " + src.split("/").pop() + " differs from its .bin; cp the source over the .bin");
  }
});

// A file under assets/client-ocr that is neither a twin of a source module nor one of the named runtime
// assets is a mistake (2026-10-09: an agent wrote schedule-text-layer.bin, no .mjs, and the real twin went
// stale while the suite stayed green). The runtime assets are the ones the worker serves by name.
const RUNTIME_ASSETS = new Set(["eng-traineddata.bin", "grid-runner.html", "pdf-worker.mjs.bin", "pdf.mjs.bin", "pdfjs-compat.js.bin", "tesseract-core-fallback.bin", "tesseract-core.bin", "tesseract-wasm-lib.mjs.bin"]);

test("nothing stray sits under assets/client-ocr", () => {
  const twins = new Set(readdirSync(SRC).filter((f) => f.endsWith(".mjs")).map((f) => f + ".bin"));
  const stray = readdirSync(BIN).filter((f) => !f.startsWith(".") && !twins.has(f) && !RUNTIME_ASSETS.has(f));
  assert.deepEqual(stray, [], "stray file(s) under assets/client-ocr: " + stray.join(", ") + " (a twin must be named <module>.mjs.bin; a new runtime asset must be added to RUNTIME_ASSETS and to the asset map)");
});
