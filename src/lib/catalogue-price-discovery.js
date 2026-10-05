// Shim (2026-10-05): this file was a byte-identical twin of the worker copy and
// the two had to be patched in lockstep. The worker copy is the single source of
// truth; the monolith bundle (esbuild, src/worker-entry.js) pulls it from there.
export * from "../../weyland-cutsheetx-worker/src/lib/catalogue-price-discovery.js";
