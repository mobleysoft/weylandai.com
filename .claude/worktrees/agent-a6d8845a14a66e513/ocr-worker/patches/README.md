# tesseract-wasm patch (applied directly to node_modules tonight - needs codifying)

`node_modules/tesseract-wasm/dist/lib.js` was hand-patched to make
`createOCREngine()` accept and forward an `instantiateWasm` option, since the
published API only accepts `wasmBinary` (raw bytes) - which Cloudflare
Workers cannot compile at runtime (WASM code generation from raw bytes is
disallowed by the embedder; confirmed by testing, not assumed). Workers
require WASM to be pre-compiled at deploy time via the native `.wasm` import,
then instantiated (not compiled) via the `instantiateWasm` hook.

Two changes, both in `createOCREngine`:
1. Added `instantiateWasm` to the destructured options and passed it through
   to the internal `Module(...)` factory call instead of `wasmBinary` when
   provided.
2. The factory's default URL-resolution path (`new URL(..., import.meta.url)`)
   runs unconditionally when `Module["locateFile"]` isn't set, and throws in
   the Workers environment. Pass `locateFile: () => ""` alongside
   `instantiateWasm` to skip it (same workaround @hyzyla/pdfium's own wrapper
   already uses for the identical issue).

This needs to become a real patch-package / pinned fork rather than a
hand-edit that `npm install` will silently discard. Not done tonight -
flagging so it doesn't get lost.
