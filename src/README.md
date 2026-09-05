# Module split — status and real finding

`weyland.worker.js` is not hand-authored monolithic source. It is an
**esbuild-bundled build artifact** (`__esm`, `__name`, `init_*` lazy-module
wrappers throughout) that is being checked into git and deployed directly,
as if it were the source of truth. There are **298** `init_*` module
boundaries in the file — real evidence that ~298 originally-separate
source files (a mix of real app modules and vendored Node polyfills for
the Cloudflare `unenv` preset) were bundled once, and the bundle has been
hand-edited ever since instead of being regenerated from real sources.

## What's here so far

- `auth-module.js` — extracted from the segment tagged `// auth-module.js`
  / `init_auth_module` (original file lines ~1064-1201). JWT
  generate/verify, password hashing, signed-URL generate/verify, HMAC
  signing, base64url encode/decode. **Verified correct in isolation**
  (2026-09-05): JWT round-trip, password-hash determinism, signed-URL
  round-trip, tampered-signature rejection, and `authenticateRequest`
  against a real `Request` object all pass as real Node tests (run ad
  hoc, not yet saved as a test file - unlike cors-handler.js below, this
  one should get a real `auth-module.test.mjs` in a future tick).
- `cors-handler.js` — extracted from the segment tagged
  `// cors-handler.js` (original file lines ~138248-138382). The
  `CorsHandler` class: origin allow-listing (string or regex), preflight
  OPTIONS handling, and `corsify()` to apply CORS headers to any
  Response or plain object. **Verified via a real, saved, re-runnable
  test file** (`cors-handler.test.mjs`, 13 passing cases - run with
  `node --test src/cors-handler.test.mjs`): wildcard vs. restricted vs.
  regex origin matching, preflight accept/reject, corsify wrapping both
  a Response and a plain object, credentials-header logic, exposed-header
  configuration.

**Not yet done, and deliberately not attempted yet:** wiring this back
into `weyland.worker.js` via a real esbuild step. That requires
reconstructing enough of the original bundle's module graph and esbuild
config to produce byte-for-byte (or verified behaviorally-identical)
output — a correctness claim that can't be made responsibly from one
module in isolation. Attempting it prematurely on this file (real
revenue-bearing production code) is exactly the risk this whole track
exists to avoid.

## Real path forward (not a single tick's work)

1. Extract each of the 298 `init_*` segments into its own real source
   file the same way as `auth-module.js`/`cors-handler.js` — most are boilerplate Node
   polyfills (`init_process`, `init_console`, `init_tty`, etc.) that can
   likely be replaced wholesale by their real upstream `unenv`/Cloudflare
   packages as npm dependencies instead of hand-copied, once identified.
2. Build a real `package.json` dependency graph + esbuild entry point
   that imports all the real app-logic modules (auth, billing, the
   product route handlers, etc.) explicitly.
3. Run the real build, and verify its output against the live worker with
   real live-traffic-shaped requests across every route family - not
   just a diff of the bundled text (minifier output can differ
   cosmetically while being behaviorally identical, or match textually
   while missing a real behavior change - only live-request-response
   comparison is a real correctness proof).
4. Only once verified, switch the deploy source from the hand-edited
   `weyland.worker.js` to the real build output, and stop hand-editing
   the bundle directly.

Each of steps 1-3 is itself many ticks' worth of work per real module
extracted - this file will keep growing incrementally.
