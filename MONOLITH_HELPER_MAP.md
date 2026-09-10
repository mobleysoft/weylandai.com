# MONOLITH_HELPER_MAP.md

Phase 2b of the `legacy-monolith.js` cleanup, following on from
`WORKER_MODULARIZATION_MAP.md`'s route-extraction pass (steps 1-25,
complete except one exception noted there and closed as step 1 below).
That pass moved every *route* into `src/routes/*.js`. This phase moves
the *business logic those routes depend on* — the helper functions,
classes, and app-level dispatch code still living directly in
`legacy-monolith.js` — into its own modules, using the exact same
discipline: byte-exact extraction (never hand-transcribed), diff-
verified against source, real Node-test-runner tests (no mocks
pretending to be real behavior), full suite + build, `wrangler deploy`,
live `curl` verification against production, then a precise git commit
listing only the touched files. One piece at a time, smallest/lowest-
risk first, most-tangled/highest-consequence last.

## 0. Orientation — the file is NOT 148K lines of app code

A cataloguing pass (2026-09-10, recorded in full at
`/private/tmp/claude-501/-Users-johnmobley/027386de-1586-4bc9-92fb-cab164afbc33/scratchpad/monolith_helper_inventory.md`
if that scratchpad still exists — contents reproduced/summarized here
since scratchpads are not durable) found that of `legacy-monolith.js`'s
147,992 lines:

- **~113,000 lines (76%) are vendored library code** — `pdf-lib`,
  `pdfjs-dist`, RxJS, `ws`/browser polyfill remnants, and
  `@cloudflare/puppeteer` internals, bundled by hand into this file via
  esbuild rather than installed as real `npm` dependencies. This is
  **out of scope for this phase** — a separate, much lower-effort
  follow-up ("stop hand-bundling these, add them to `package.json`"),
  not 700+ individual functions to triage.
- **~35,000 lines (24%) are real, hand-written application code.**
  This document scopes itself to that ~35K.

Region map (verified against the checked-in file, 2026-09-10):

| Lines | What |
|---|---|
| 1–23,501 | Vendored `pdf-lib` |
| 23,502–24,752 | Real: `data-transformer.js` + `pdf-metadata.js` |
| 24,753–111,762 | Vendored `pdfjs-dist` (59% of the whole file) |
| 111,763–112,271 | Real: `pdf-renderer-cloudflare.js` |
| 112,272–130,975 | Vendored RxJS + `@cloudflare/puppeteer` internals |
| 130,976–133,485 | Vendored `ws`/browser polyfill remnants |
| 133,486–137,996 | Real: `hardware-schedule-extractor.js` (Claude-vision engine) |
| 137,997–147,992 | Real: post-route app infrastructure (clusters B-K below) |

Line numbers throughout this document will drift as extractions land —
always re-`grep`/re-read before trusting a specific line number; the
cluster *names* and *relationships* are the durable part.

## 1. Clusters (real app code only), in planned extraction order

1. **Athena routes + readiness (Clusters H+D, ~670 lines).** The one
   real exception to "route extraction is done" — `registerAthenaRoutes`
   is a live, still-inline route-registration function (evaded the flat
   `router.get(...)` grep because it's wrapped in a function taking
   `router2` as a param). Registers `/api/sessions/:sessionId/readiness`
   + 4 related endpoints. Contains a third `jsonResponse` duplicate
   (`jsonResponse2`, already-extracted equivalent is `jsonResponse3` in
   `lib/json-response.js`) — retire it on extraction. Its only real
   dependency is Cluster D (`calculateReadiness`,
   `listSessionsWithReadiness`, `READINESS_STAGES`/`_WEIGHTS`,
   `cacheReadiness`) — extract together. Do this first: it's small,
   closes the real routing gap, and exercises this phase's discipline
   on a low-risk piece before the harder clusters.
   - Status: not started.
2. **Internal plumbing (Cluster F, ~215 lines).** `WORKER_VERSION`
   (already injected elsewhere - just needs its source moved),
   `detectFileType`, `ERROR_CODES`/`errorResponse`, `generateId3`,
   `CLAUDE_PRICING`/`calculateClaudeCost2` (rename to
   `calculateClaudeCost` on extraction - orphaned esbuild suffix, no
   surviving sibling), `logClaudeAPICall`, `logTelemetryEvent`,
   `incrementSubmittalsUsed`, `HASCOM_EDGE`, `mintInternalToken`,
   `callEdge`. Tiny, highest fan-in of any cluster (nearly every
   extracted route module already declares one of these as a dep) -
   unblocks nothing risky.
   - **Consolidation flag, not just extraction**: `ERROR_CODES`/
     `errorResponse` here is a second, parallel, unreconciled
     error-response system alongside the already-extracted
     `error-utilities.js` (`ErrorCodes`/`jsonErrorResponse`/
     `ErrorMetrics`/`performHealthCheck`). Both exist and are used
     simultaneously. Worth a real decision (reconcile into one, or
     document why two conventions are intentional) when this cluster
     moves - not a silent merge.
   - Status: not started.
3. **PDF package assembly (Cluster C, ~864 lines).** `drawTable`,
   `truncateText`, `generateCoverPage`, `generateTableOfContents`,
   `generateHardwareSetPage`, `mergePdfs`, `assembleSubmittalPackage`,
   `getAssemblyStatus`. Self-contained; only external dep is vendored
   `pdf-lib` (region 1, already imported by name elsewhere).
   - Status: not started.
4. **CPS manufacturer matching (Cluster B, ~607 lines).**
   `normalizeManufacturerKey`, `parseModelString`,
   `generateSearchVariants/Queries`, `MANUFACTURER_ALIASES`,
   `matchComponentToCutSheet` (singular - real, different function
   from the already-extracted `matchComponentToCutSheets`, plural, in
   `lib/product-database.js`; rename on extraction to avoid the
   confusion), `batchMatchSessionComponents`, `persistSessionMatches`,
   `SERIES_FAMILIES`/`FINISH_CODES`/`BHMA_FINISH_LOOKUP`. Mostly pure
   string-normalization + lookup tables, plus 2 D1-touching async fns.
   - Status: not started.
5. **Stripe billing / webhook signature verification (Cluster G,
   ~180 lines) - FINANCIAL/SECURITY, extra care.**
   `WEYLAND_SUBCONP_PRICE_ID`/`PRODUCT_ID`, `WEYLAND_PRODUCTS`,
   `CHECKOUT_READY_PRODUCTS`, `stripeRequest`,
   `verifyStripeWebhookSignature`, `verifyVendyaiForwardSignature` -
   the shared request/signing primitives the already-extracted
   `billing.js`/`webhooks-subscription.js` route modules inject as
   deps. Small, but real HMAC signature checks gating real webhook
   trust boundaries and real (if modest - $5,010 all-time per memory)
   live payment code. Same live-deploy-verification discipline as the
   original billing/webhook extraction: verify against real Stripe
   test-mode signing, not just unit-test math.
   - Status: not started.
6. **R2/CORS/static-asset dispatch plumbing (Cluster I, ~320 lines).**
   `MIME_MAP`, `serveR2`, `checkSession`, the `monolith` object (the
   real `/api/*` dispatcher wrapping `router.handle(...)` with CORS +
   health-check). Contains `D1KVShim` (~240 lines, a *second* hidden
   class - assigned to a `var`, not a `class` statement, so it doesn't
   show up in a naive `class` grep) - currently dead code after a
   documented 2026-09-09 fix (it was silently breaking rate limiting
   and ~23 `env.CACHE` call sites by shimming real KV bindings on
   every request), but its own in-code comment says it may represent
   real in-progress migration work. **Ask before deleting - this is a
   human decision, not an extraction-time cleanup call.**
   - Status: not started.
7. **Claude-vision hardware/door-schedule extraction engine (Cluster
   A, ~5,336 lines total: ~4,511 at `hardware_schedule_extractor_exports`
   + ~825 for the vision-call adapters/dispatch). The big one.**
   Prompt construction, 3 Claude-vision call strategies (API-direct,
   SABP Claude Code, local subprocess), page-image/PDF extraction
   variants, the full door-schedule constraint/parsing/confidence
   pipeline. **Highest fan-in in the codebase** - nearly every
   hardware-schedule/session route depends on some piece of it;
   `storeHardwareExtraction` is even lazily dynamic-imported inside
   module-registry.js's own deps object rather than passed directly,
   a real signal this was already too entangled to move as one unit.
   **Do this in sub-steps**, not one 5,300-line module: (a) pure
   prompt-building functions first, (b) the 3 Claude-call adapters,
   (c) the stateful save/approve/resolve-contract pipeline last.
   Expect to re-verify every hardware-schedule/session route file
   after each sub-step.
   - **Dead/duplicate code to resolve here**: 3 near-identical
     `arrayBufferToBase64` variants (`...642`/`...643`/`...644`, the
     unsuffixed original no longer exists standalone) - collapse to
     one `lib/base64.js` export. `savePageExtraction2` is genuinely
     NOT a duplicate of `savePageExtraction` despite the naming - it's
     a real wrapper adding `autoEnrichSessionOnSave`; give it a real
     name (`savePageExtractionAndEnrich`) on extraction, don't just
     rename to match the esbuild artifact.
   - Status: not started.
8. **Manufacturer cut-sheet web-discovery engine (Cluster E, ~2,609
   lines).** PDF validation/download/dedup, URL-pattern generation, an
   Allegion-brand-specific registry, robots.txt/Cloudflare-protection
   checks, live Puppeteer browser automation, a discovery queue
   processor, a retry/backoff subsystem. **High risk**: 5 internal
   sub-layers calling each other, plus it's the one cluster with real
   external side effects (live headless-browser binding, external
   sites - Google, manufacturer domains - meaning bot-detection/rate-
   limit risk that's hard to test offline). Treat as its own multi-
   file sub-project (`lib/discovery/*.js`), not one extraction. Do
   after Cluster A (shares D1/session primitives). Consider merging
   `MANUFACTURER_ALIASES` (Cluster B) and `ALLEGION_BRAND_REGISTRY`
   (here) into one config module - they overlap conceptually.
   - Status: not started.
9. **SovereignWeylandRoutes - hand-built marketing/product page CMS
   (Cluster J, ~2,169 lines).** A large IIFE (`{ dispatch(pathname)
   {...} }`) serving ~36 product/marketing pages
   (`/huntx/`,`/takeoffx/`,`/subx/`,`/cutsheetx/`,`/propx/`,`/sightx/`,
   `/meetingx/`,`/investors/`,`/venturedeck/`, ~18 document-family
   landing pages) as hand-built HTML. **Dispatched directly by the
   top-level `fetch` handler (Cluster K), completely outside
   `NativeRouter`/`module-registry.js`** - a second, separate routing
   system. Not logically tangled (each page fn is independent) but
   high volume/tedium risk - a documented prior bug (5 duplicate
   `ROUTE_LABELS`/`renderNav` copies from `var` hoisting silently
   leaving 18 live pages with no nav link, fixed 2026-09-09) is real
   evidence this file's structure has caused shipped bugs. Split into
   3-4 files by product family rather than one 2,000-line file; budget
   real review time given that history.
   - Status: not started.
10. **Top-level fetch handler + SightXRoom Durable Object (Cluster K,
    ~874 lines).** `weyland_worker_default` (the real `export default
    { fetch, scheduled, queue }`) and `SightXRoom` (MeetingX's
    websocket-room Durable Object). This IS the orchestrator everything
    else is dispatched from - not tangled so much as foundational.
    **Extract last**, once every helper it calls (`monolith`,
    `SovereignWeylandRoutes`, `serveR2`, `authenticate`,
    `requireProductAccess`) already has a stable module path, to avoid
    re-touching it repeatedly. Note: the WebSocket-upgrade auth check
    (`authenticate` + `requireProductAccess(..., "meetingx")`) happens
    inline here, not via the normal `NativeRouter` pipeline (CORS
    wrapping would break the upgrade handshake) - a second, parallel
    auth-enforcement path worth remembering in any future auth work.
    - Status: not started.

## 2. Duplicate/dead-code register (found during cataloguing, not yet fixed)

| Name(s) | Location(s) (as of 2026-09-10) | Verdict |
|---|---|---|
| `arrayBufferToBase642`/`...643`/`...644` | ~112,243 / ~134,088 / ~143,919 | 3 esbuild-collision-renamed duplicates; collapse to one `lib/base64.js` export when Cluster A moves |
| `jsonResponse2` | ~142,457, inside still-inline `registerAthenaRoutes` | Duplicate of already-extracted `jsonResponse3`; retire when step 1 (Athena routes) lands |
| `calculateClaudeCost2` | ~143,157 | Orphaned rename, no surviving sibling; just rename to `calculateClaudeCost` when Cluster F moves |
| `ERROR_CODES`/`errorResponse` vs. `error-utilities.js`'s `ErrorCodes`/`jsonErrorResponse` | ~143,104 vs. already-extracted | Two parallel, unreconciled error-response conventions; real consolidation decision needed, not a silent merge |
| `matchComponentToCutSheet` (singular) vs. `matchComponentToCutSheets` (plural, already extracted) | ~138,358 vs. `lib/product-database.js` | Confusingly similar names, genuinely different functions; rename on extraction |
| `D1KVShim` class | ~142,834 | Dead since the 2026-09-09 fix, but explicitly flagged in-code as possibly-intentional in-progress work; **ask the human before deleting** |

## 3. Vendored-library follow-up (separate, smaller effort - not this phase)

~113,000 lines of `pdf-lib`, `pdfjs-dist`, RxJS, `ws`, and
`@cloudflare/puppeteer` internals are hand-bundled into
`legacy-monolith.js` instead of being real `npm` dependencies declared
in `package.json`. Not in scope for this document's step ordering -
tracked here as a known, real, much-lower-effort follow-up for
whenever it's prioritized.
