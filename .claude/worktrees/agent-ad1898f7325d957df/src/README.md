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
  signing, base64url encode/decode. **Verified via a real, saved,
  re-runnable test file** (`auth-module.test.mjs`, 16 passing cases -
  run with `node --test src/auth-module.test.mjs`): JWT round-trip,
  tampered/wrong-secret/expired rejection, malformed-input rejection,
  password-hash determinism, `authenticateRequest` against real `Request`
  objects, signed-URL round-trip (valid/tampered/expired/missing-params),
  HMAC signing determinism, base64url round-trip including unicode.
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
- `rate-limit.js` — extracted from the segment tagged `// rate-limit.js`
  (original file lines ~138387-138427). `checkRateLimit(userId,
  operation, env, limits)`: a KV-backed (`env.CACHE`) fixed-window rate
  limiter, single real call site (`POST
  /api/hardware-schedule/session/:sessionId/enrich`, 10 requests/60s).
  Renamed esbuild's collision-suffixed locals (`env2`->`env`,
  `limits2`->`limits`, `count3`->`count`) back to their real names -
  naming only, no behavior change. **Verified via a real, saved,
  re-runnable test file** (`rate-limit.test.mjs`, 8 passing cases against
  an in-memory fake KV - run with `node --test src/rate-limit.test.mjs`):
  first-request accounting, decrementing remaining, exceeding the limit,
  independent tracking per user and per operation, window-expiry reset,
  fail-open behavior when the KV binding throws, and default limits.
- `error-utilities.js` — extracted from the segment tagged
  `// error-utilities.js` (original file lines ~143917-144203).
  `ErrorCodes`, `classifyError()`, `createErrorResponse()`,
  `jsonErrorResponse()`, the `ErrorMetrics` class (KV-backed error/latency
  counters), and `performHealthCheck()` (DB/CACHE/OCR_SERVICE binding
  checks). This is the most heavily-reused cluster extracted so far -
  real call sites across PDF extraction, submittal processing, and the
  health endpoint, not a single-use utility. Renamed esbuild's
  collision-suffixed locals (`error4`->`error`, `context3`->`context`,
  `count3`->`count`, `env2`->`env`) back to their real names - naming
  only, no behavior change. **Verified via a real, saved, re-runnable
  test file** (`error-utilities.test.mjs`, 21 passing cases - run with
  `node --test src/error-utilities.test.mjs`): every `classifyError()`
  branch (circuit breaker, timeout, validation, rate limit, 5xx, auth,
  payload-too-large, DB constraint, generic DB, network, fallback),
  `createErrorResponse()`/`jsonErrorResponse()` shaping and status-code
  mapping, `ErrorMetrics` against an in-memory fake KV (including
  fail-open when CACHE is missing), and `performHealthCheck()` against
  faked DB/CACHE/OCR_SERVICE bindings (healthy, degraded-DB,
  missing-OCR-binding cases).

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
