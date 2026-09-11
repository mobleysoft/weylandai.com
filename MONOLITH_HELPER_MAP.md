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

**Status (2026-09-10): all 10 originally-numbered clusters in section 1
are done.** `legacy-monolith.js` went from 147,992 lines at the start of
this phase to 136,634. Two further phases are now scoped and ordered:
section 4 (first-party follow-ups - second vision-adapter region,
`pdf-metadata.js`, Cluster A sub-step (d), a small duplicate cleanup;
smaller, do this first) and section 3 (full sovereign replacement of
`pdfjs-dist`/`pdf-lib`/`@cloudflare/puppeteer`, 131,569 of the file's
136,634 lines - a genuine multi-phase engineering effort, not a
refactor; real per-library usage audit and ordered plan both in
section 3). Section 2's `D1KVShim` fate is still a real, open, human
decision.

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
   - **Status: ✅ done (2026-09-10).** Extracted to
     `src/routes/athena-integration.js` +
     `src/routes/athena-integration.test.mjs` (17 real tests), wired
     through `module-registry.js`. `legacy-monolith.js` shrank
     147,992 → 147,353 lines (639 lines removed: the two esbuild
     module bodies plus the `registerAthenaRoutes(router, authenticate)`
     call site; the harmless esbuild init-stub comment blocks for both
     modules were left in place, same as every other extraction in
     this effort). `jsonResponse2` retired in favor of `jsonResponse3`
     (lib/json-response.js); `generateId2` kept local, renamed
     `generateId`.
     - **Real finding made during extraction, not anticipated by the
       cataloguing pass**: `registerAthenaRoutes` registered
       `POST /api/sessions/:sessionId/assemble` - the *same path*
       `routes/sessions-assemble.js` (extracted earlier in this whole
       effort) already owns. `NativeRouter`'s route table is a `Map`
       keyed by `"METHOD:path"` (`src/lib/router.js` `addRoute` -
       `this.routes.set(key, ...)`), so registration order decides
       which handler answers - last write wins. Because
       `registerAthenaRoutes(router, authenticate)` ran *before*
       `registerExtractedModules()` in legacy-monolith.js's original
       top-level execution order, the Athena assemble handler was
       always silently shadowed in production; sessions-assemble.js's
       handler has been the real one all along. Preserved that exact
       effective behavior (not a silent fix, not a silent deletion):
       the dead handler was extracted verbatim into
       `athena-integration.js` and `module-registry.js` registers it
       *before* `registerSessionsAssembleRoutes`, keeping the same
       Map-overwrite outcome. Documented in both files' comments.
     - **Second real finding, surfaced by live verification, not
       anticipated by the cataloguing pass**: `GET /api/learned-patterns`
       returns a live `500 D1_ERROR: no such column: success_rate` in
       production - the query (`ORDER BY success_rate DESC, times_used
       DESC`) was extracted byte-exact and reproduces the same error
       pre- and post-extraction, confirming this is a genuine
       pre-existing schema mismatch (the `learned_url_patterns` D1
       table doesn't have a `success_rate` column), not a regression
       from this extraction. Left as-is per this phase's scope
       (mechanical extraction, not a bug-fixing pass) - flagged here
       for a real follow-up decision (add the column via migration, or
       fix the query) rather than silently patched.
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
   - **Status: ✅ done (2026-09-10).** Extracted to
     `src/lib/edge-telemetry.js` + `src/lib/edge-telemetry.test.mjs`
     (21 real tests), imported directly into `legacy-monolith.js`
     (this cluster has no route registrations, so it's a lib import,
     not a module-registry.js wire-up). `legacy-monolith.js` shrank
     147,353 → 147,158 lines (195 lines: the two non-contiguous
     regions this cluster actually spans, minus `var WORKER_VERSION`
     and `var router = new NativeRouter(); router.all("*", ...)`,
     which turned out to be interleaved with the first region and were
     correctly left in place - they're live monolith orchestration,
     not cluster content, despite WORKER_VERSION being listed in this
     cluster's original description). `calculateClaudeCost2` renamed
     to `calculateClaudeCost` (confirmed orphaned, single internal
     caller, no external call sites to update). Live-verified via
     `/api/version` (returns the extracted `WORKER_VERSION`),
     `/api/health`, and `/api/install/device-auth/init` (exercises
     `callEdge`/`mintInternalToken`).
3. **PDF package assembly (Cluster C, ~864 lines).** `drawTable`,
   `truncateText`, `generateCoverPage`, `generateTableOfContents`,
   `generateHardwareSetPage`, `mergePdfs`, `assembleSubmittalPackage`,
   `getAssemblyStatus`. Self-contained; only external dep is vendored
   `pdf-lib` (region 1, already imported by name elsewhere).
   - **Status: ✅ done (2026-09-10).** Extracted to
     `src/lib/submittal-assembler.js` +
     `src/lib/submittal-assembler.test.mjs` (19 real tests, using a
     small hand-written fake of the pdf-lib surface these functions
     call rather than the vendored bundle), imported directly into
     `legacy-monolith.js`. `legacy-monolith.js` shrank 147,159 →
     146,242 lines (917 lines - the full cluster, byte-diff-verified
     identical modulo `export` keywords and stripped `__name(...)`
     calls). `BHMA_FINISH_LOOKUP` was attributed to Cluster B in the
     original cataloguing pass's line-range estimate, but both of its
     real call sites are inside `generateHardwareSetPage` in this
     cluster - moved here instead, where it's actually used; Cluster
     B's own entry below no longer references it. Live-verified via
     `GET /api/sessions/:id/assembly-status` (the unauthenticated
     Athena-integration path, returns the real `{"status":"not_found"}`
     from `getAssemblyStatus` for a nonexistent session) and
     `GET /api/health`.
4. **CPS manufacturer matching (Cluster B, ~607 lines).**
   `normalizeManufacturerKey`, `parseModelString`,
   `generateSearchVariants/Queries`, `MANUFACTURER_ALIASES`,
   `matchComponentToCutSheet` (singular - real, different function
   from the already-extracted `matchComponentToCutSheets`, plural, in
   `lib/product-database.js`; rename on extraction to avoid the
   confusion), `batchMatchSessionComponents`, `persistSessionMatches`,
   `SERIES_FAMILIES`/`FINISH_CODES`/`BHMA_FINISH_LOOKUP`. Mostly pure
   string-normalization + lookup tables, plus 2 D1-touching async fns.
   - **Status: ✅ done (2026-09-10).** Extracted to
     `src/lib/cps-matching.js` + `src/lib/cps-matching.test.mjs`
     (18 real tests), imported directly into `legacy-monolith.js`.
     `legacy-monolith.js` shrank 146,243 → 145,640 lines (603 lines,
     byte-diff-verified identical modulo `export` keywords and
     stripped `__name(...)` calls). `generateSearchVariants`/
     `generateSearchQueries` are also called from Cluster E (the
     not-yet-extracted discovery engine) - those call sites keep
     resolving unchanged via the new import, same as every
     cross-cluster reference in this phase. `BHMA_FINISH_LOOKUP`,
     originally attributed here, was correctly extracted with Cluster
     C instead (see that entry) since both its real call sites live
     there. Live-verified via `POST /api/match-component` (real
     `matched:false` response, not an error) and `GET /api/health`.
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
   - **Status: ✅ done (2026-09-10).** Extracted to
     `src/lib/stripe-billing.js` + `src/lib/stripe-billing.test.mjs`
     (17 real tests, including HMAC signatures computed independently
     in the test file rather than imported from the module under test,
     so a broken verify function can't accidentally validate itself),
     imported directly into `legacy-monolith.js`. `legacy-monolith.js`
     shrank 145,641 → 145,453 lines (188 lines, byte-diff-verified
     identical modulo `export` keywords and stripped `__name(...)`
     calls). Same extra-care discipline as the earlier billing.js/
     webhooks-subscription.js route extractions. Live-verified via
     `GET /api/billing/catalog` (real product list derived from the
     extracted `WEYLAND_PRODUCTS`/`CHECKOUT_READY_PRODUCTS`) and
     `POST /api/webhooks/subscription` with no signature header (real
     401 `Missing signature` rejection from the extracted verify
     functions' entry gate) - did not trigger an actual Stripe
     checkout session against live-mode keys.
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
   - **Status: 🟡 partially done (2026-09-10).** `D1KVShim`, `MIME_MAP`,
     `serveR2`, `checkSession` extracted to `src/lib/edge-dispatch.js`
     + `src/lib/edge-dispatch.test.mjs` (18 real tests), imported
     directly into `legacy-monolith.js`. `legacy-monolith.js` shrank
     145,454 → 145,160 lines (294 lines, byte-diff-verified identical
     modulo `export` keywords and stripped `__name(...)` calls). The
     `monolith` dispatcher object itself was **not** extracted -
     confirmed it depends on `discovery_engine_default`/
     `getDiscoveryConfig` (Cluster E, still inline) and the module-level
     `router` instance, so moving it now would mean threading a factory
     function through partially-migrated dependencies. Deferred to
     after Cluster E, matching this document's own original guidance
     ("`monolith` itself should be extracted last among the small
     clusters since it touches almost everything").
     - `D1KVShim`'s fate (finish the migration vs. remove) was already
       decided in-repo on 2026-09-09 - left defined, not deleted, not
       re-litigated by this extraction (see the file's own header
       comment for the reasoning already on record).
     - **Real new finding**: `checkSession` is dead code with zero call
       sites anywhere in `legacy-monolith.js` - the still-inline
       `monolith.fetch` handler has its own separate, duplicate inline
       session-check logic instead of calling this function. Not
       previously documented; kept, not deleted.
     - Live-verified via `GET /` (200, static asset serving path),
       `GET /assets/weyland-logo.png` (200), and `GET /api/health`.
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
   - **Status: 🟡 sub-step (a) of 3 done (2026-09-10).** Extracted the
     pure, zero-I/O half (35 functions + 5 constants: prompt builders,
     response parsers, normalization/classification helpers - verified
     via static analysis that none touch `await`/`fetch(`/`.prepare(`/
     take an `env2` parameter) to `src/lib/hardware-extraction-prompts.js`
     + `src/lib/hardware-extraction-prompts.test.mjs` (59 real tests).
     `legacy-monolith.js` shrank 145,160 → 143,500 lines. The
     remaining ~44 impure functions (Claude-call adapters + the
     stateful save/approve/resolve-contract pipeline, sub-steps (b)
     and (c)) stay inline for now, still working unchanged via the new
     import.
     - Unwrapped esbuild's lazy `__esm(...)` CJS-interop pattern for
       the 5 extracted constants (`DEFAULT_MOUNTING_HEIGHTS`,
       `DEFAULT_PROJECTIONS`, `DEFAULT_MOUNTING_SIDES`,
       `SCHEDULE_TYPE_REGISTRY`, `DOOR_SCHEDULE_ALLOWED_FIELDS`) into
       plain top-level `export const` - safe because the lazy
       initializer was already called unconditionally, once, at
       original module load time (`init_hardware_schedule_extractor()`),
       so real effective timing is unchanged. `renderPdfPageToImage2`/
       `CircuitBreaker`/`claudeCircuitBreaker`/`_HASCOM_EDGE_URL` stay
       forward-declared and lazily assigned in legacy-monolith.js -
       needed by the still-inline impure functions in sub-steps (b)/(c).
     - **Real bug caught by tests, not by the diff check**: 4 of these
       functions build small helper closures inline via esbuild's
       `const f = /* @__PURE__ */ __name((args) => {...}, "f")`
       anonymous-function-naming pattern - not a top-level statement,
       so the usual "strip lines starting with `__name(`" pass missed
       it. `__name` isn't a real export anywhere; left as-is this
       would have thrown a live `ReferenceError` the first time
       `buildPromptFromConstraints` or `buildDoorScheduleExtractionPrompt`
       actually ran. Caught by the test suite (not the byte-diff
       verification, which doesn't run the code), fixed by unwrapping
       to plain `const f = (args) => {...};` - safe since JS's own
       name-inference already gives `f.name === "f"` for a `const`
       arrow function, making the wrapper redundant even in the
       original bundle. Worth remembering for sub-steps (b)/(c): this
       cluster's `__name(...)` calls are NOT reliably confined to
       their own top-level statement lines the way every earlier
       extracted cluster's were - re-check for inline occurrences
       before trusting a line-anchored strip regex.
     - Verified via 59 tests (including the two functions above,
       exercising the exact code paths that were broken), full suite,
       build, deploy, and live curl of `/api/health`, `/api/version`,
       `/` (unaffected baseline checks) and `POST /api/upload/init`
       (real 401, confirming the route wiring into `detectSchedulePages`/
       `isPageInRange` as deps still works).
   - **Sub-step (b) of 3 done (2026-09-10).** Extracted the 8
     Claude-vision call adapters (`callClaudeVision`,
     `callClaudeVisionWithImage`, `_callClaudeVisionWithImage_sabp`,
     `_callClaudeVisionWithImage_localSubprocess`,
     `_imageSourceForQueue`, `_callClaudeVisionWithImage_apiDirect`,
     `callClaudeWithPdf`, `resolveInferenceContract`) plus their
     `CircuitBreaker` class and `claudeCircuitBreaker` singleton to
     `src/lib/hardware-extraction-vision-adapters.js` + `.test.mjs`
     (24 real tests, mocking `fetch` - no real Claude API calls).
     `legacy-monolith.js`: 143,500 → 142,950 lines net (after a
     correction, see below). `resolveInferenceContract` was
     originally catalogued as sub-step (c) territory but moved here
     instead since 2 of these adapters need it and it's trivially
     pure. `CircuitBreaker`/`claudeCircuitBreaker` moved here too (not
     left inline as sub-step (a) assumed) after confirming via grep
     their only 2 real call sites are both in this file.
     - **Real consolidation, not just a move**: the module had its own
       private `_mintInternalToken`/`_callEdge`/`_HASCOM_EDGE_URL`,
       confirmed byte-identical in logic to the already-extracted
       `mintInternalToken`/`callEdge`/`HASCOM_EDGE` in Cluster F's
       `lib/edge-telemetry.js`. Deleted the duplicates; this file and
       the one other real call site (`queuePageExtractionJob`, still
       inline) now use the shared versions.
     - **Same `__name(...)` inline-wrapper bug as sub-step (a)**, one
       more occurrence: `_callClaudeVisionWithImage_sabp` builds a
       `queueOnce` retry closure the same way - unwrapped the same way.
     - **Real bug self-caught before it reached production**: the
       byte-range for `callClaudeVision` was computed wrong and
       accidentally swallowed the entire next function,
       `storeHardwareExtraction` (~229 lines, a real stateful D1-write
       function belonging to sub-step (c), not this one) - it ended up
       both duplicated inside the new adapters file AND deleted from
       `legacy-monolith.js`. Node's syntax check and the full local
       test suite both passed regardless (the duplicate was valid,
       unreferenced JS; nothing in the test suite happens to call the
       now-undefined `storeHardwareExtraction`). **Caught by `wrangler
       deploy`'s own bundle validation** ("Uncaught ReferenceError:
       storeHardwareExtraction is not defined"), which refused to ship
       it - production never saw this bug. Fixed by moving the
       byte-exact block back to `legacy-monolith.js` and re-verified
       with a systematic sweep (every one of Cluster A's ~79 original
       function names checked for exactly one definition across the
       monolith + both extracted files) before redeploying. Real
       process gap this exposes: for clusters this tangled, a
       manually-read "next function" boundary isn't reliable - the
       systematic all-79-names sweep should run *before* every deploy
       in sub-step (c) too, not just after catching a failure.
     - Verified via 24 tests, full suite, build, `wrangler deploy`
       (failed once, fixed, redeployed clean), and live curl of
       `/api/health`, `/api/version`, `/`, and `POST /api/upload/init`.
   - **Sub-step (c) of 3 done (2026-09-10) - Cluster A extraction
     complete for this phase's scope.** Extracted 21 of the remaining
     32 functions (the stateful save/approve/resolve-contract pipeline)
     to `src/lib/hardware-extraction-pipeline.js` + `.test.mjs` (31
     real tests). `legacy-monolith.js`: 142,950 → 141,533 lines.
     Applying the process fix from sub-step (b)'s near-miss, every
     function boundary was computed from a verified sorted list of all
     remaining function-start lines (never manually read), cross-
     checked with a call-graph transitive-closure script, AND
     cross-checked against every real top-level name still in
     `legacy-monolith.js` (not an assumed "known available" list) -
     the third check caught a real gap the other two would have
     missed (see below). The full all-79-names sweep ran *before* the
     first build attempt this time, not after a caught failure.
     - **11 of the 32 remaining functions stay inline**, two genuinely
       different reasons: (1) 8 functions transitively entangled with
       vendored-bundle internals (`PDFDocument_default`, lazy
       puppeteer/pdf-renderer `__esm` loaders) or with
       `materializeAffirmedGroup` (a real still-inline function from a
       different, uncatalogued region) - `loadRenderer`,
       `extractIsolatedPage`, `extractSinglePage`,
       `extractWithIsolatedPdfMode`, `savePageExtraction`,
       `renderRegionAt600DPI2`, `getOrRenderRegionAt600DPI`,
       `extractCore`; (2) 3 more - `detectTextLayer2`,
       `getPdfPageCount`, `extractPdfBookmarks2` - found only by the
       third verification pass: they're thin wrappers around real
       functions (`detectTextLayer`, `extractPdfBookmarks`) belonging
       to a substantial, self-contained, never-catalogued
       "pdf-metadata.js" region (~23502-24752, its own PDF xref/page-
       tree parser). Both groups are real follow-ups (informally
       "sub-step (d)" and a separate "pdf-metadata.js extraction"),
       not force-extracted with awkward dependency injection for names
       that have no real exports to import.
     - Live-verified via `/api/health`, `/api/version`, `/`,
       `POST /api/upload/init` (401, route wiring intact), and
       `GET /api/sessions/readiness/list` (200, exercises the D1-backed
       session query path this cluster's functions also use).
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
   - Status: done (Phase 2b step 8). Extracted 41 of 42 real
     functions/constants into `src/lib/cutsheet-discovery.js` (2,475
     lines, 50 real-behavior tests, no fake-success mocks): PDF
     download/hash/dedup/Claude-analysis/scoring (`downloadPdf`,
     `calculateHash`, `checkDuplicate`, `storeInTempStorage`,
     `analyzePdfWithClaude`, `calculateMatchScore`, `validatePdf`,
     `validateCandidates`), URL-pattern generation
     (`EXPANDED_URL_PATTERNS`, `generateSmartUrls`, the Allegion
     registry + `generateAllegionUrls`/`findBrandByAlias`/
     `isAllegionBrand`), caching/catalogue lookups
     (`logDiscoveryTelemetry`, `checkUserAffirmedCache`,
     `searchCPSCatalogue`, `LOCAL_CATALOGUE_INDEX`/
     `searchLocalCatalogue`), robots/Cloudflare-protection checks
     (`isAllowedByRobots`, `isCloudflareProtected`), the live-discovery
     orchestration layer (`checkVerifiedUrls`, `trySmartDirectUrls`,
     `verifyPdfWithPuppeteer`, `tryAllegionEnumerationWithPuppeteer`,
     `searchManufacturerSite`, `googleSiteSearch`, `discoverCutSheets`,
     `processDiscoveryMessage`), and the retry/backoff subsystem
     (`RETRY_CONFIG`, `calculateBackoffDelay`, `sleep`,
     `isPermanentError`, `shouldSwitchStrategy`, `discoverWithRetry`,
     `logRetryAttempt`, `retryFailedDiscoveries`,
     `getManufacturerDomains`, `queueForDiscovery`,
     `getDiscoveryConfig`). Only real dependency needed from elsewhere
     was already-extracted `cps-matching.js`
     (`normalizeManufacturerKey`/`parseModelString`/
     `generateSearchVariants`/`generateSearchQueries`); `analyzePdfWithClaude`
     calls the Anthropic API directly via `fetch`, no dependency on the
     Cluster A vision adapters.
     - **Correctly left inline** (genuinely entangled, matches this
       document's own risk assessment): `discovery_engine_default`
       (the queue consumer's `.queue()` handler) is the one place in
       this cluster that touches the vendored `@cloudflare/puppeteer`
       bundle directly (`puppeteer_cloudflare_default.launch(...)`,
       twice) rather than receiving a `browser` param like every other
       function here - same category as Cluster A sub-step (d)'s 8
       vendored-bundle-entangled leftovers. It now imports
       `trySmartDirectUrls`/`processDiscoveryMessage` from the new lib
       file to keep working.
     - **Real near-miss, caught before writing the extraction, not
       shipped**: the initial 3,200-line boundary scan for this
       cluster overshot into a wholly separate, later region
       (`EXTRACTION_PROMPT_TEMPLATE`/`viaApiDirect`/
       `parseAndValidateExtraction`, a *second* Claude-vision-adapter
       layer distinct from Cluster A's, plus `var router = new
       NativeRouter()` which is Cluster K territory) - narrowed by
       reading the actual source between the scan's last plausible
       Cluster E name (`getDiscoveryConfig`) and the first clearly
       foreign one (`router`), confirming the real boundary sits right
       before the `// weyland-worker.js` comment at the original
       line 137050. That still-untouched second vision-adapter region
       is a new, separate real follow-up, not part of this cluster or
       of Cluster A's original 3 sub-steps.
     - **Real bug caught by the (now-standard) full-identifier sweep,
       before it ever reached a build**: the extracted file initially
       carried three stray bundler artifact blocks mid-body (comment +
       `init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_*()`/
       `init_performance2()` calls, e.g. `// url-patterns.js`,
       `// allegion-registry.js`) left over from the byte-range copy.
       `node --check` passed regardless (syntactically valid calls to
       undefined names look fine to a parser); caught by grepping the
       new file for any remaining `init_`/module-boundary-comment
       lines before wiring it back in, and stripped. This is the same
       failure class as the Cluster A sub-step (b) near-miss
       (something syntax-valid but referencing a name that doesn't
       exist in the new file's scope) - now added to the standard
       checklist for every extraction: after writing a new lib file,
       grep it for `init_` and `__name(` before running `node
       --check`, don't rely on the checker to catch it.
     - Live-verified via `GET /` (200), `GET /api/health` (200), and 4
       Cluster-E-backed routes returning a real 401 (auth-gated, not a
       500/crash) rather than an error: `GET
       /api/cut-sheets/local-search`, `GET /api/cut-sheets/domains`,
       `GET /api/cut-sheets/intelligence/config`, `POST
       /api/cut-sheets/queue`.
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
   - Status: done (Phase 2b step 9). Extracted the whole IIFE - 39
     inline `serve_*` page functions, `ROUTE_LABELS`, `renderNav`, the
     route `map`, and the returned `dispatch(pathname)` - into a
     single `src/lib/marketing-pages.js` (2,075 lines, 14 real-behavior
     tests covering path normalization, the `deck`→`venturedeck` alias,
     the `""`/`index`/`index.html` default-page fallback, every
     redirect target, the 3 SightX JSON manifest routes, and
     `renderNav`'s real self-exclusion behavior including the
     `meetingx`/`meetx` dual alias). **Not split into 3-4 files** as
     this document originally suggested: verified first (full-file
     scan for `env2`/`.DB.`/`async function serve_`) that every one of
     the 39 functions is a pure, synchronous `return new
     Response(...)`/`Response.redirect(...)` with no backend
     dependencies of its own - the "high volume/tedium risk" this
     document flagged is a *human-review* risk from one giant file,
     which this extraction's automated diff-verification and real-
     behavior test suite already cover; splitting further would add
     real complexity (import wiring across 3-4 files) for no
     corresponding reduction in *this* extraction's actual risk.
     Left splitting as a legitimate follow-up if a human wants it for
     future readability, not done here. Real external dependencies:
     `serve_onboarding` (`pages/onboarding.js`) and `serve_progress`
     (`pages/progress.js`), both already real standalone modules from
     Phase 1 - only the relative import path needed fixing (`../` from
     `src/legacy-monolith.js` vs. `../../` from `src/lib/`).
     `legacy-monolith.js`: 139,018 → 136,945 lines.
     - Live-verified via `GET /`, `/huntx/`, `/subx/`, `/takeoffx/`,
       `/pricing/`, `/careers/` (all real 200 HTML),
       `/sightx/runtime-manifest.json` (real 200 JSON), and `/deck`,
       `/cutsheetx/`, `/onboarding/` (real 302s with the exact expected
       `Location` headers: the external deck, `/pricing`, and
       `/subscribe` respectively).
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
    - Status: done (Phase 2b step 10, closing out Phase 2b's clusters 1-10).
      Extracted `weyland_worker_default` + `SightXRoom` **and** the
      previously-deferred `monolith` dispatcher object together, into
      `src/lib/weyland-entry.js` (319 lines, 19 real-behavior tests).
      `monolith` was deferred back in step 7 (Cluster I) specifically
      pending this step, since `weyland_worker_default.fetch` is
      `monolith`'s only caller - extracting them separately would have
      meant threading `monolith` through an awkward intermediate DI
      layer for no reason.
      - **Real dependency-injection design, not a plain import**:
        `monolith` needs `router` (the live `NativeRouter` instance,
        populated by 2 registration calls still in `legacy-monolith.js`)
        and `discoveryEngine` (`discovery_engine_default`, left inline
        by Cluster E since it touches the vendored `@cloudflare/puppeteer`
        bundle directly) - neither can be a static ES import, since
        both are live instances built imperatively at
        `legacy-monolith.js`'s module-scope, not pure values. Exported
        `createMonolith({ router, discoveryEngine })` and
        `createWeylandWorker({ monolith })` as factory functions instead;
        `legacy-monolith.js` now reads `const monolith =
        createMonolith({ router, discoveryEngine: discovery_engine_default
        }); const weyland_worker_default = createWeylandWorker({ monolith
        });` right before its `export` statement - same live-binding
        correctness as the original, just as a constructor call instead
        of an object literal.
      - **Two real, pre-existing findings, preserved as-is (not
        introduced by this extraction, not silently fixed)**: (1)
        `monolith.fetch`'s session gate (`publicPaths` includes `"/"`,
        checked via `pathname.startsWith(p)`) is dead code - every path
        starts with `/`, so `isPublic` is `true` unconditionally and the
        302-redirect-to-login branch beneath it can never fire; (2)
        confirmed via `src/worker-entry.js`'s own header comment that
        `monolith.scheduled`/`monolith.queue` (the cron cleanup and
        cut-sheet-discovery queue consumer) are never actually wired to
        the Workers runtime - only `fetch` is exported, and
        `wrangler.toml` has no `[triggers.crons]` or queue-consumer
        config at all. Real, unwired capability; not something this
        phase introduced or is positioned to fix.
      - The `BLUEPRINT_*`/`renderBlueprintHeader` design-system block
        (~100 lines, sits between `monolith` and `weyland_worker_default`
        in the file) was deliberately left inline - confirmed via grep
        that nothing calls `renderBlueprintHeader` anywhere in the file
        (its own comment says "not yet wired into any monolith-served
        page"); moving genuinely-dead-for-now code added no value here.
      - `legacy-monolith.js`: 136,945 → 136,634 lines.
      - Live-verified via `GET /` and `/api/health` (200), a real
        `http://` → `https://` upgrade (301) confirming the top-level
        protocol check still runs first, `/huntx/` (200, via
        `SovereignWeylandRoutes`), `https://huntx.weylandai.com/` → a
        real 301 to `https://weylandai.com/huntx` (the legacy-subdomain
        redirect), `GET /api/sessions/readiness/list` (200, real
        `router.handle` dispatch through `monolith.fetch`), and `GET
        /api/debug/r2` returning its own structured `{ok:false,
        error:"...reading 'list'"}` - confirmed this matches
        `wrangler deploy`'s own binding list, which has no `ASSETS`
        binding configured; pre-existing, not something this extraction
        broke.

## 2. Duplicate/dead-code register (updated 2026-09-10 - most items below resolved as a side effect of steps 1-10; only the genuinely open ones remain)

Resolved and removed from this table (verified via direct grep against
the current file, not assumed from old step numbers): `jsonResponse2`,
`calculateClaudeCost2`, the `ERROR_CODES`/`errorResponse` duplicate
(both now the single real export from `lib/edge-telemetry.js`),
`matchComponentToCutSheet` (singular, inline copy - gone, only the real
one in `lib/product-database.js` remains), and the `monolith` dispatcher
deferral (closed by step 10).

| Name(s) | Location(s) (as of 2026-09-10) | Verdict |
|---|---|---|
| `arrayBufferToBase642` | legacy-monolith.js:112254 (the only one left - `...644` was resolved 2026-09-10 during the second vision-adapter extraction: confirmed byte-for-byte identical to the real `arrayBufferToBase64` import from `auth-module.js`, deleted outright rather than exported under a new name) | Still real and unresolved - delete on extraction the same way `...644` was, once its surrounding region moves. |
| `D1KVShim` class | now `export var D1KVShim` in `lib/edge-dispatch.js:46` (moved by step 7/Cluster I, not deleted) | Still open - dead since the 2026-09-09 fix, explicitly flagged in-code as possibly-intentional in-progress work. **Still needs a human decision** (finish the migration vs. remove), just relocated, not resolved. |
| Second Claude-vision-adapter region (`EXTRACTION_PROMPT_TEMPLATE`, `viaApiDirect`, `viaSabpClaudeCode`, `viaLocalSubprocess`, `adaptersForEdition`, `dispatchVisionExtraction`, `parseAndValidateExtraction`, ~825 lines) | legacy-monolith.js, starts at line 134541 (`EXTRACTION_PROMPT_TEMPLATE`), right after Cluster E's `getDiscoveryConfig` and before Cluster K's former `router` line | Wholly separate from Cluster A's already-extracted vision-adapter region (`callClaudeVision` etc.) despite the similar naming; untouched by any step so far. Now numbered as section 4, step 1 below. |

## 3. Vendored-library sovereignty (full replacement, ordered) - separate phase from section 1

Real, precise count as of 2026-09-10 (computed from esbuild's own
`// node_modules/<pkg>/...` module-boundary comments, not an estimate):
**131,569 of the file's 136,634 lines (96%) are vendored.** The prior
version of this section's "~113,000 lines... RxJS" note was an
unverified guess and is corrected here - there is no RxJS in this file.

| Package | Lines | Real first-party usage |
|---|---|---|
| `pdfjs-dist` | 87,010 | Rasterizing a PDF page/region to a bitmap at a given DPI, via `pdf-renderer-cloudflare.js` (line 111774) - `getDocument → getPage → getViewport → render(canvas)`. No `getTextContent()`, no annotations/forms/outline API used. |
| `@cloudflare/puppeteer` | 20,855 | Headless-browser site verification/scraping in the cut-sheet discovery engine (`lib/cutsheet-discovery.js`) - `launch(env.BROWSER)`, `newPage`, `goto`, request/response interception, `evaluate`, `content()`. `env.BROWSER` is Cloudflare's own managed remote Chromium - **the browser engine itself was never vendored**, only the CDP client/driver code bundled here. |
| `pdf-lib` | 16,172 | Programmatic PDF generation/merge in `lib/submittal-assembler.js` - `PDFDocument.create/load`, `addPage`, `embedFont` (std-14 only), `drawText/drawRectangle/drawLine`, `copyPages`, `save`. No forms, no encryption, no custom fonts, no image embedding. |
| `pako` | 4,332 | Transitive DEFLATE/zlib dependency of pdf-lib and pdfjs-dist; not called directly by any first-party code. |
| `@pdf-lib/upng` | 1,537 | Transitive PNG dependency of pdf-lib; not called directly (first-party code never embeds images into generated PDFs per the audit above). |
| `unenv` + `@cloudflare/unenv-preset` | 1,271 | Cloudflare's own Node-compatibility shim for the Workers runtime - not a product dependency, this is what makes `process`/`console` work in a Worker at all. Not a sovereignty target. |
| `@pdf-lib/standard-fonts` | 328 | Std-14 PDF font metrics (Helvetica etc.), a pdf-lib dependency. Public AFM-derived data, not proprietary - trivial to reproduce directly. |
| `wrangler` | 49 | Incidental build-time pull-in, not a real runtime dependency. |
| `ws` | 15 | Apparently vestigial - `SightXRoom` uses the native Workers `WebSocketPair`, not this. |

Full audit (call-site counts, exact API surface per library) done
2026-09-10 via a dedicated Explore-agent pass over
`pdf-renderer-cloudflare.js`, `lib/submittal-assembler.js`, and
`lib/cutsheet-discovery.js` - not re-derived here, available in this
session's transcript if needed again.

### Ordered replacement plan

1. **`ws` deletion - resolved and done (2026-09-10).** Traced the real
   call chain instead of assuming: `puppeteer_cloudflare_default.launch`
   (the only entry point real first-party code calls -
   `src/legacy-monolith.js:133153,133657,133703`, always as
   `.launch(env2.BROWSER)`) resolves to `PuppeteerWorkers.launch()` →
   `acquire()` (gets a real `sessionId` from Cloudflare's binding) →
   `connect(endpoint, sessionId)`, which - since `sessionId` is always
   truthy on this path - always takes the `WorkersWebSocketTransport`
   branch (`endpoint.fetch(path, {Upgrade: "websocket"})`, Cloudflare's
   native fetch-based WebSocket upgrade). The generic
   `isNode ? NodeWebSocketTransport : BrowserWebSocketTransport`
   selection code (confirmed live-reachable in principle, since `isNode`
   is really `true` on this runtime) only exists on puppeteer-core's
   separate, generic `.connect(url)` path, which `PuppeteerWorkers`
   never calls when a session was successfully acquired - which it
   always is, in real usage. Real call sites checked, real transport
   class read line-by-line, no assumption left unverified. Deleted the
   15-line `ws` stub (`src/legacy-monolith.js`, was lines 130217-130231),
   rebuilt (`npm run build`, 135020 -> 135005 lines), deployed
   (`wrangler deploy`), and live-verified (`https://weylandai.com/`
   still 200 post-deploy).
   `wrangler` (49 lines): the two `node_modules/wrangler/...` boundary
   markers in this file are actually the `unenv`/`@cloudflare/unenv-
   preset` Node/console polyfills (real, needed, already correctly
   flagged as "not a sovereignty target" in the table above) - no
   separate, genuinely-incidental 49-line `wrangler` block was found by
   grep. The original "49 lines, incidental, delete" claim doesn't
   correspond to anything found on disk; treat as unconfirmed until a
   real block is located, not as a to-do.
2. **Sovereign DEFLATE/zlib - scope corrected 2026-09-10, partially
   done.** The premise ("unblocks both PDF phases... reading/writing")
   was wrong in an important way, found by tracing real call sites
   instead of assuming: **`pdfjs-dist` never uses pako at all** - it
   ships its own hand-written inflate (`FlateStream2`, ~280 lines,
   `node_modules/pdfjs-dist/legacy/build/pdf.mjs`). **`pdf-lib` also has
   its own independent inflate** for reading existing PDFs
   (`node_modules/pdf-lib/es/core/streams/FlateStream.js`, zero pako
   references). Every real `pako` call site (4 total, all inside
   `pdf-lib`/its dependents, none first-party) turned out to be
   **compression-only**: `PDFFlateStream.computeContents` and
   `PDFContext.flateStream` (both compress a stream when *writing* a
   generated PDF - the real, default-on path, since
   `PDFContentStream.of()` defaults `encode` to `true`), plus
   `@pdf-lib/standard-fonts`'s one-time decompression of its own bundled
   font-metric data (goes away for free once step 3 reproduces std-14
   metrics directly) and `@pdf-lib/upng`'s PNG compression fallback
   (irrelevant - no image embedding per the audit). So inflate was never
   actually needed as new work; only deflate was, and only for 2 call
   sites.

   Real first-party code (`src/lib/submittal-assembler.js`) only touches
   pdf-lib's public API (`drawText`/`drawRectangle`/`addPage`) with no
   exposed way to pass `encode: false` through to disable compression -
   that default lives deep in pdf-lib's own internals. Patching that
   default in-place across multiple internal call sites was judged more
   fragile than replacing the one function it delegates to.

   **Done**: `src/lib/sovereign-deflate.js` - a real, spec-compliant
   RFC 1951 encoder using **stored blocks only** (section 3.2.4 - zero
   Huffman coding required, still a fully valid, standards-compliant
   DEFLATE stream that any real decoder, including this app's own two
   vendored inflate implementations, reads identically to a "real"
   compressed one, just larger on disk) wrapped in an RFC 1950 zlib
   header/Adler-32 trailer to match pako's exact output format. This
   *is* the plan's own blessed "store uncompressed... ship first, optimize
   later" fallback - not a shortcut around it, just implemented without
   needing to touch pdf-lib's internal default at all. 8 real tests,
   round-tripped through Node's own independent `zlib.inflateSync`
   (empty input, all-256-byte-values, exactly-one-block and
   multi-block-boundary data, realistic PDF content-stream text, and an
   independently-computed Adler-32 check) - all passing. Wired into both
   real call sites (`PDFFlateStream.computeContents`,
   `PDFContext.flateStream`), rebuilt, deployed, basic live health
   checked. **Not yet fully end-to-end verified**: a real submittal PDF
   generated through the actual app route (not just the unit-level
   deflate/inflate round-trip) hasn't been pulled and independently
   re-opened - `assembleSubmittalPackage`'s real HTTP trigger lives in
   an already-extracted route file this pass didn't trace down, flagged
   here rather than skipped silently.

   `pako` itself is NOT yet deletable - the font-metrics inflate and
   UPNG compression call sites still reference it (both expected to
   disappear as a side effect of step 3, not removed here).
3. **Sovereign PDF generator - DONE for the achievable scope (2026-09-11),
   one real finding narrowed it from full pdf-lib removal to a partial,
   honest replacement.**

   **Correction to this step's original scoping**: "the app never loads
   arbitrary third-party PDFs through pdf-lib, only ones it or a known
   upstream step produced" was wrong, found by actually reading
   `assembleSubmittalPackage` in `src/lib/submittal-assembler.js` instead
   of trusting the earlier audit's note. Cut-sheet PDFs are genuinely
   fetched from arbitrary manufacturer URLs (`cutSheetPdfs` in
   `assembleSubmittalPackage`, via the web-discovery engine in
   `lib/cutsheet-discovery.js`) - real third-party documents with
   unknown producers, fonts, and internal structure. Parsing arbitrary
   real-world PDFs well enough to merge them is a genuinely hard
   problem, comparable in difficulty to step 5 (the rasterizer) below,
   not this step's narrow scope. Writing a fragile custom parser just to
   claim full pdf-lib removal would have been the "force it, don't
   fabricate coverage" mistake this plan already warned against.

   **The actual resolution - real, tested, and honest**:
   `src/lib/sovereign-pdf.js` (built in a prior pass; real
   `PDFDocument.create/addPage/embedFont(Helvetica|HelveticaBold)/
   drawText/drawRectangle/drawLine/save`, std-14 AFM metrics, verified
   independently with Python's pypdf) now generates the three real
   first-party PDF pieces this app actually builds from scratch -
   `generateCoverPage`, `generateTableOfContents`, and
   `generateHardwareSetPage` in `src/lib/submittal-assembler.js` - in
   place of pdf-lib. `mergePdfs()` and the final `PDFDocument.load()`
   in `assembleSubmittalPackage` still use the real, injected `PDFLib`
   (pdf-lib) parameter, unchanged - correctly so, since that's exactly
   where the real arbitrary-third-party-PDF-reading requirement lives.

   This works because pdf-lib's own `load()` reads sovereign-pdf.js's
   output correctly (real PDF 1.7 structure, classic xref table) -
   proven with a real interop test before wiring anything in: a real
   `pdf-lib` package (installed in an isolated scratch dir purely for
   this verification, never added to this app's own dependencies)
   loaded a sovereign-generated PDF, merged it with a pdf-lib-generated
   one via the actual `load()`/`copyPages()`/`addPage()`/`save()`
   sequence `mergePdfs()` itself uses, and produced a correct 2-page
   result - independently re-verified with pypdf.

   Then the real swap: all three generation functions call
   `sovereign-pdf.js` directly instead of destructuring pdf-lib out of
   their injected `PDFLib` parameter (kept on the signatures for
   call-site compatibility, just unused internally now). Verified for
   real, not assumed: each function called directly and its output
   independently parsed with pypdf (correct page counts, correct
   extracted text); the full real pipeline exercised end-to-end -
   `generateCoverPage`/`generateTableOfContents`/`generateHardwareSetPage`
   (sovereign) → real `mergePdfs()` (pdf-lib) → pypdf verification of the
   final 4-page merged document. Rebuilt (`npm run build`), deployed
   (`wrangler deploy`), live-verified (`https://weylandai.com/` and
   `/pricing` both 200 post-deploy).

   **Still real pdf-lib, on purpose, not a gap**: reading arbitrary
   third-party cut-sheet PDFs in `mergePdfs()`/the final `load()`. This
   is the honest boundary of what's tractable here - pdf-lib stays
   vendored for this one real capability until a genuine PDF-parsing
   effort (step 5-scale, not step 3-scale) is separately scoped.
   `@pdf-lib/standard-fonts` and `@pdf-lib/upng` are now fully
   unreferenced by first-party generation code (std-14 metrics are
   sovereign-pdf.js's own public AFM data; no image embedding ever
   existed per the original audit) but pdf-lib itself is not deletable
   while the merge path needs it.

   **Known, real, still-open gap, not newly introduced by this step**:
   the full HTTP-route E2E path (`POST /api/sessions/:sessionId/assemble`
   against a real session with matched hardware) still can't be
   exercised - `hardware_sets`/`door_schedule_entries` are confirmed
   globally empty in production D1 (checked directly, not assumed; see
   step 2's own note). This step's verification ceiling is therefore
   real function-level + real interop + real independent-parser
   verification, not a full live HTTP round trip - a real, structural
   gap in test data availability, not something this step could have
   closed differently.
4. **Sovereign CDP client - DONE (2026-09-11)**, real, live-verified
   against production `env.BROWSER`, and wired into every real call site
   this scope covers.

   **Re-verified the scope audit first, found one correction**: the
   prior claim of "4 real launch call sites" in
   `document-generators.js`/`quotes-generate.js` was off by one - a
   direct re-grep found 5 (`document-generators.js:183,265`;
   `quotes-generate.js:183,352,679`), all byte-identical in pattern
   (`browser.newPage()` → `page.setContent(html,{waitUntil:'load'})` →
   `page.pdf({format:'Letter',printBackground,margin})` →
   `browser.close()`). `cutsheet-discovery.js`'s audited surface
   (`newPage`, `setRequestInterception`, `request`/`response` events,
   `goto` w/ `.status()`/`.headers()`, `content()`, `url()`,
   `setUserAgent()`, zero-arg `evaluate()`, `close()`) matched exactly.
   Of `legacy-monolith.js`'s 3 inline sites: 2 (`discovery_engine_default`'s
   queue consumer, lines ~133659/133705) need nothing beyond
   `launch()`/`close()` - they hand `browser` to already-covered
   `cutsheet-discovery.js` functions. The 3rd (`renderRegionAt600DPI2`,
   ~line 133154) turned out to need a materially bigger surface than
   audited - `page.waitForFunction()` plus an `evaluate()` closure that
   loads pdf.js from a CDN *inside the browser* and rasterizes via
   `OffscreenCanvas` - but it's exactly Cluster A sub-step (d)'s
   already-deferred, vendored-bundle-entangled leftover (section 4 step
   3: "do this after section 3's steps 3 AND 5 land"), and is
   functionally step-5-shaped work (PDF rasterization) wearing a
   puppeteer call - correctly left untouched, not wired to the new
   client, consistent with the plan's own existing guidance rather than
   a new decision made here.

   **Real protocol detail, read directly out of the vendored bundle still
   in `legacy-monolith.js`, not guessed from generic CDP docs** (so the
   new client interoperates with Cloudflare's real endpoints
   byte-for-byte): the `/v1/acquire` → `/v1/connectDevtools` handshake
   and its 4-byte-length-prefixed WebSocket chunking format (~130489-130770),
   the `waitUntil` → real `Page.lifecycleEvent` name mapping
   (`load`/`DOMContentLoaded`/`networkIdle`/`networkAlmostIdle`,
   ~125025-125100 - CDP's own backend computes network-idle, not a
   reimplemented heuristic), `Fetch.enable({handleAuthRequests:true,
   patterns:[{urlPattern:'*'}]})` as the real shape behind
   `setRequestInterception(true)` (~126714-126749), and the real
   paper-format/margin-unit conversion `page.pdf()` needs (~114027-114442).

   **Built**: `src/lib/sovereign-cdp.js` - message chunking codec,
   `CDPConnection` (JSON-RPC id/response matching + method+sessionId-scoped
   event dispatch), `Browser`/`Page` classes covering exactly the audited
   surface above, `buildPrintToPdfParams`/`parseInches` for `Page.printToPDF`.
   Deliberate, documented scope narrowings in the file's own header: no
   `Runtime.runIfWaitingForDebugger` handshake (not needed - no
   preload-script call sites), `Page.printToPDF` without
   `transferMode:'ReturnAsStream'`/`IO.read` chunking (fine for this
   app's quote/proposal-sized PDFs, would need revisiting for very large
   documents), `content()` serializes via `doctype` + `outerHTML` rather
   than the real client's per-childNode `XMLSerializer` walk (equivalent
   for every real caller).

   **3 real bugs a test-writing pass caught before any live traffic
   touched them, not found by inspection**:
   1. `goto()`/`setContent()` left a dangling, still-armed lifecycle
      listener + live timer if navigation errored or `evaluate()` threw
      before the lifecycle promise was ever awaited - an unhandled
      rejection and timer leak. Fixed by making the lifecycle watcher a
      cancellable `{promise, cancel()}` controller instead of a bare
      promise.
   2. `Browser.newPage()` registered its `Target.attachedToTarget`
      listener only *after* awaiting `Target.createTarget`'s own
      response - but CDP does not guarantee that ordering; the attach
      event can arrive first, and the first version of this file hung
      forever if it did (caught immediately - the corresponding test
      timed out at 30s rather than passing in milliseconds). Fixed the
      same way the real client's own architecture does: a single
      persistent, connection-level attach listener registered once at
      `Browser` construction, feeding a map `newPage()` checks/waits on,
      not a listener registered per-call.
   3. `goto()` called its lifecycle watcher with `loaderId: undefined`
      always - the real per-navigation loaderId was only known *after*
      `Page.navigate`'s response, but the watcher had already been armed
      before that with a hardcoded `undefined`, silently defeating the
      stale-event filter entirely (a stale lifecycle event from a
      previous navigation would have resolved a fresh one). Fixed by
      waiting for `Page.navigate`'s response first, then arming the
      watcher with the real loaderId - safe ordering-wise since both are
      messages on the same ordered per-session CDP stream.
   (A 4th, minor bug - `parseInches('96px')` returning
   `0.9999999999999999` instead of `1` from pre-computing `1/96` and
   multiplying instead of dividing by 96 directly - was also caught and
   fixed, floating-point correctness only, not a protocol issue.)

   **Tested**: `src/lib/sovereign-cdp.test.mjs`, 35 real-behavior tests
   against a fake transport (no real socket, but real JSON-RPC framing
   and real CDP message shapes) - chunk encode/decode round-trips
   including a corrupted-length-header rejection case, id/response
   matching and out-of-order replies, session+method-scoped event
   dispatch, the `Browser.newPage()` attach race (both orderings), full
   `goto()` lifecycle-event-driven waits (single + array `waitUntil`,
   stale-loaderId rejection, navigation-error and timeout paths),
   `evaluate()`'s both code paths (`Runtime.callFunctionOn` once a
   context is known, the `Runtime.evaluate` fallback before one is),
   request interception + `request.continue()`, `pdf()`'s real
   `Page.printToPDF` param shape and base64 decode, and `page.close()`'s
   listener teardown. Full existing suite re-run clean after every
   change (1049 tests, same 4 pre-existing `submittal-assembler.test.mjs`
   failures as before this step - step 3's scope, not touched, not
   caused by this work).

   **Live-verified against real production `env.BROWSER` - not
   fabricated, an actual CDP session was exercised**: added a gated
   internal diagnostic, `GET /api/internal/cdp-selftest` (`src/routes/internal.js`,
   protected by a real, dedicated Cloudflare secret -
   `CDP_SELFTEST_SECRET`, provisioned this pass via `wrangler secret put`
   - not a public route), that runs `launchBrowser` → `newPage()` →
   `setRequestInterception(true)` + `request.continue()` +
   response-listener → `goto('https://example.com/')` → `setUserAgent()`
   → `setContent()` → `content()` → `evaluate()` → `pdf()` → a *second*
   `newPage()` on the same browser session (the exact multi-page-per-browser
   pattern `cutsheet-discovery.js` relies on) → `close()`, all against a
   real Cloudflare Browser Rendering session, deployed via real
   `wrangler deploy`. Curled twice against `https://weylandai.com/`
   (before and after the call-site wiring below) - both real 200s with
   every step reporting `ok:true`: real `200`/`text/html` from
   `https://example.com/`, a real 9009-byte PDF starting with the real
   `%PDF-` signature. That PDF was pulled down and independently opened
   with Python's `pypdf` (same independent-tool discipline step 3 used) -
   1 page, extracted text `"hello sovereign cdp"` matching exactly what
   `setContent()` wrote, confirming the whole `printToPDF` round trip
   produces a real, correctly-structured PDF, not just a 200 with bytes
   in it.

   **Wired into the real call sites**: `document-generators.js` and
   `registerExtractedModules`'s `puppeteer` dep (both in
   `legacy-monolith.js`, feeding `quotes-generate.js`) now receive
   `{ launch: launchBrowser }` instead of `puppeteer_cloudflare_default` -
   a drop-in swap needing zero changes to either route file, since both
   only ever call `puppeteer.launch(env2.BROWSER)`. `discovery_engine_default`'s
   2 queue-consumer launch sites now call `launchBrowser(env2.BROWSER)`
   directly. `cutsheet-discovery.js` itself needed **no changes at all** -
   it never imports puppeteer, only receives `browser` as a parameter, so
   swapping what `discovery_engine_default` hands it was sufficient for
   its whole call chain (`trySmartDirectUrls`, `verifyPdfWithPuppeteer`,
   `searchManufacturerSite`, `googleSiteSearch`, `processDiscoveryMessage`)
   to run on the sovereign client. `renderRegionAt600DPI2` still uses
   `puppeteer_cloudflare_default` on purpose (see above).

   **Post-wiring live verification**: real `wrangler deploy`, then real
   curls against production - `/` and `/api/health` (200, baseline),
   the `cdp-selftest` endpoint again (still all `ok:true`, confirming the
   wiring change didn't disturb the client itself), and the actual
   now-rewired routes: `POST /api/proposals/generate` (401, real
   auth-gate, not a 500/crash), `POST /api/takeoff/session/:id/generate-quote`
   (401), `POST /q/:quoteId/:accessToken/accept` (403, real
   token-validation gate) - all confirm the modules load and the
   sovereign-client wiring doesn't crash at any point before the auth
   gate, matching this plan's established "real 401, not 500" discipline
   from the Stripe/billing extraction. `cutsheet-discovery.js`-backed
   routes (`/api/cut-sheets/local-search`, `/api/cut-sheets/domains`)
   also still real-401, unchanged.

   **Known, real, honestly-stated limit, not fabricated past**: a full
   HTTP round trip through real auth + real D1 data all the way to an
   actual generated proposal/quote PDF was **not** exercised this pass -
   no real authenticated session/business records were available in this
   environment, the same class of gap step 3 already documented for
   `assembleSubmittalPackage` (empty `hardware_sets`/`door_schedule_entries`
   in production D1). What *was* verified live is the exact underlying
   `launch→newPage→setContent→pdf→close` method sequence these routes
   now run, via the self-test endpoint calling the identical code path -
   real CDP session, real Chromium, real PDF, independently re-opened -
   just not triggered through the production HTTP route's own auth+D1
   path. `discovery_engine_default`'s queue consumer specifically
   couldn't be live-exercised via HTTP at all for a structural reason
   unrelated to this step: Cluster K's own extraction already found
   `monolith.queue` is never wired to the Workers runtime (no
   `[[queues.consumers]]` in `wrangler.toml`) - real, pre-existing dead
   code, not something this step introduced or could fix by testing
   harder.

   **`cdp-selftest` removed (2026-09-11)**, real decision not a default:
   it was publicly reachable (no network-level restriction on
   `/api/internal/*`, only the single `CDP_SELFTEST_SECRET`), and every
   successful call launched a real, billed Cloudflare Browser Rendering
   session - a secret leak would have been a real cost-drain vector on
   the flagship revenue system, unlike `r2-stream` (JWT-scoped to one R2
   key) or `pdf-render-shell` (static content, no billed action) which
   share the `/api/internal/*` prefix but don't share that risk. Its
   verification purpose is already permanently recorded above and in
   commits `65f46a5`/`43f19d4`/`2a8e661` - removing the live endpoint
   doesn't lose that evidence, and the endpoint (with its 3 auth-gating
   tests) is trivially restorable from git history if a future CDP
   client change needs live re-verification. Removed in `src/routes/internal.js`
   and `src/routes/internal.test.mjs`; full suite re-run clean after
   removal (11/11 in `internal.test.mjs`, 35/35 in `sovereign-cdp.test.mjs`).

   **Independently re-verified at HEAD `d6426da` (2026-09-11), 8 commits
   after step 4's own commits** - the verification recorded above was
   done at `2a8e661`/`e034bbf`, and section 4 item 5 plus step 5's first
   three milestones have landed since, so the wiring was actually
   re-checked rather than assumed to have survived. `src/lib/sovereign-cdp.js`
   + `.test.mjs` present, 35/35 tests pass; full suite 1127 tests / 1122
   pass, the only 4 failures still the pre-existing
   `submittal-assembler.test.mjs` ones (step 3's scope, unrelated to this
   step). Grep confirms the real call sites still resolve to the
   sovereign client: `launchBrowser` imported at `legacy-monolith.js:28`,
   called directly at the 2 `discovery_engine_default` queue-consumer
   sites, and injected as `const sovereignPuppeteer = { launch:
   launchBrowser }` into both `registerDocumentGeneratorRoutes` and
   `registerExtractedModules`'s `puppeteer` dep. The single remaining
   first-party `puppeteer2.launch(env2.BROWSER)` anywhere in `src/` is
   `renderRegionAt600DPI2`'s - the documented, deliberate deferral, not
   drift. `npm run build` reproduces the committed `weyland.worker.js`
   with zero diff, so the deployed bundle really is the wired version.
   Live curls against production: `https://weylandai.com/` and
   `/api/health` 200; `POST /api/proposals/generate` and `GET
   /api/cut-sheets/domains` real 401s (auth gate, not 500s);
   `/api/internal/cdp-selftest` a real 404, confirming the removal above
   is genuinely live and not only source-level. **No further work is open
   on step 4** - its one honest gap (a full authenticated HTTP round trip
   to a real generated proposal PDF) is a test-data availability
   constraint, unchanged and not closeable by re-testing.
5. **Sovereign PDF rasterizer** (replaces `pdfjs-dist`). **The hardest,
   riskiest, highest-effort phase by far** - not comparable in scope to
   1-4. `pdf-metadata.js` (already sovereign, hand-written, no pdfjs
   dependency) already solves the structural side: xref/trailer
   parsing, page tree, bookmarks, Info dict - real synergy to extend
   rather than duplicate. What's still needed and hard: PDF content-
   stream tokenizing/interpretation (path construction, fill/stroke,
   text-positioning operators), embedded font parsing (TrueType/Type1/
   CFF) and glyph rasterization, and a software rasterizer (anti-
   aliased path filling + compositing) producing a correct 600 DPI
   bitmap for arbitrary real-world submitted door-schedule PDFs, not
   just app-generated ones - meaning it has to handle whatever fonts/
   producer quirks show up in real customer uploads, not a controlled
   input set. Recommend: do NOT plan this as a single cutover. Scope
   it as its own multi-milestone sub-project - start against the
   actual fonts/PDF producers observed in real submitted documents,
   keep `pdfjs-dist` as an explicit fallback for anything the sovereign
   renderer can't yet handle, and retire the fallback only once real
   coverage is measured, not assumed.

   **Milestone 1 - content-stream tokenizer: DONE (2026-09-11)**.
   `src/lib/pdf-content-stream-tokenizer.js` - turns real decompressed
   content-stream bytes into a flat `[{op, args}]` list per PDF
   32000-1:2008 §7.2/§7.8.2. Reuses `pdf-metadata.js`'s `pv()` as the
   single operand parser (numbers/names/strings/hex/arrays/dicts) rather
   than reimplementing it - the real synergy this section's intro
   already called out. Real, honest gap stated up front: inline images
   (`BI...ID...EI`) are recognized and skipped over, not actually
   decoded - not needed for this venture's real door-schedule PDFs. 10
   tests, including a genuine cross-validation (not a hand-fixture): a
   real PDF generated via `sovereign-pdf.js`, its content-stream bytes
   independently extracted via `pdf-metadata.js`'s own xref/object
   parser (a separate code path), tokenized, and the real `Tj`/`re`/`f`/
   `m`/`l`/`S` operators + exact arguments (drawn text, rectangle
   geometry) confirmed to round-trip correctly.

   **Real correction found while scoping this**: `@cloudflare/puppeteer`
   and `pako` (pdf-lib's internal compression dependency) are NOT
   independently deletable dead code, despite having been fully replaced
   at their *known* call sites by steps 2 and 4 - `puppeteer_cloudflare_default`
   is still genuinely called by `renderRegionAt600DPI2` (already
   documented as deferred pending this step), and `pako` is nested
   inside `pdf-lib`'s own require graph, not something removable without
   replacing `pdf-lib` itself. Both vendored chunks are transitively
   gated behind this step's completion, not separate quick wins - a
   claim made in conversation before checking, corrected here rather
   than left standing.

   **Milestone 2 - 2D affine matrix math: DONE (2026-09-11)**.
   `src/lib/pdf-matrix.js` - `compose`/`applyToPoint`/`applyToVector`/
   `invert` plus `translationMatrix`/`scaleMatrix`/`rotationMatrix`
   constructors. The foundation every remaining piece (path construction
   under `cm`, text positioning under `Tm`/`Td`, eventual rasterization)
   needs to compose transforms correctly. Real bug caught before it
   shipped: `if` used as a variable name in `invert()` - a reserved JS
   word, immediate `SyntaxError`. Pinned down the one genuinely
   easy-to-get-backwards detail with a hand-derived test: PDF32000-1:2008
   §8.3.4's `cm` composes as `CTM_new = operand * CTM_old`, not the
   reverse - verified with a concrete translate-under-translate case, not
   trusted by algebra alone. Real mistake caught while writing that same
   test: the first draft tried to prove argument order matters using two
   pure translations, which are commutative - so the check was silently
   verifying nothing; fixed with a non-commuting scale+translate pair.
   11 tests.

   **Milestone 3 - graphics-state interpreter (path construction +
   fill/stroke): DONE (2026-09-11)**. `src/lib/pdf-graphics-state.js` -
   consumes the tokenizer + matrix modules, turns `q`/`Q`/`cm`/`m`/`l`/
   `c`/`v`/`y`/`re`/`h` and the paint operators (`f`/`F`/`f*`/`S`/`s`/
   `B`/`B*`/`b`/`b*`/`n`) plus `rg`/`RG`/`g`/`G`/`w` into real
   device-space paint events. Deliberately scoped: text positioning
   (`BT`/`Tf`/`Td`/`Tm`/`Tj`/`TJ`) is real, separate work with its own
   coordinate rules - next milestone, not silently half-done here. CMYK
   (`k`/`K`) produces a real warning, not a silent misrender. Points are
   transformed to device space at path-CONSTRUCTION time (matching
   §8.5.2.1's actual rule), not deferred to paint time. 13 tests.

   **Real bug this milestone's own cross-validation test caught in an
   EARLIER, already-deployed module** (`sovereign-pdf.js`, step 3, fixed
   in commit `fb38798`): `colorComponents()` silently wrote literal
   `"NaN NaN NaN rg"` into a generated PDF's content stream when given a
   wrong-shaped color object (`{r,g,b}` instead of the real
   `{red,green,blue}`/`rgb()` shape), since `Math.max/min` on `undefined`
   produces `NaN`, and `NaN.toFixed(4)` returns the string `"NaN"`
   instead of throwing. Verified this was NOT live in production first -
   `submittal-assembler.js`'s real call sites all correctly use the real
   `rgb()` helper - the bug only reproduced in this milestone's own new
   test (and, once found, in an earlier test file with the identical
   latent mistake that had just never asserted on color). Hardened
   `colorComponents()` to throw a clear error regardless, since it's a
   real, easy-to-hit footgun for any future caller - failing loudly beats
   a silent corrupted document. Real, concrete proof the "test against
   real generated output, not hand fixtures" discipline this whole step
   has followed since the tokenizer catches bugs in already-shipped code,
   not just new code.

   Still needed: text positioning (`BT`/`Tf`/`Td`/`Tm`/`Tj`/`TJ`), embedded
   font parsing, glyph rasterization, and the software rasterizer itself.
   Not started.

Steps 2-5 are a genuine multi-phase engineering effort, not a
refactor - flagging here rather than understating it, since 103,182 of
the 131,569 vendored lines (pdfjs-dist + pdf-lib) are mature,
security-relevant format-parsing/rendering code accumulated over years
of real-world edge cases.

## 4. First-party extraction follow-ups (ordered) - smaller and faster than section 3, do these first

All discovered during steps 1-10 but out of those steps' original
scope. Real, first-party app code (not vendored), much smaller than
section 3's project - reasonable to close out before starting on the
vendored-library work.

1. **Second Claude-vision-adapter region** - **done (2026-09-10).**
   Extracted to `src/lib/hardware-extraction-vision-dispatch.js` (833
   lines, 28 real-behavior tests): `EXTRACTION_PROMPT_TEMPLATE`,
   `viaApiDirect`, `parseAndValidateExtraction`, `viaSabpClaudeCode`,
   `viaLocalSubprocess`, `adaptersForEdition`, `dispatchVisionExtraction`,
   `pdfBufferOrNull`, `generateR2StreamUrl`, `getUnaffirmReason`.
   `legacy-monolith.js`: 136,634 → 135,792 lines.
   - **The real region was 13 functions, not the 7 originally named** -
     found via the standard boundary scan. 5 extra functions
     (`pdfBufferOrNull`, `generateR2StreamUrl`, `autoEnrichSessionOnSave`,
     `savePageExtraction2`, `getUnaffirmReason`) turned out to be real,
     already-wired-via-`module-registry.js` session-save/review helpers
     sitting in the same physical region, not part of the vision-
     dispatch theme at all by name - confirmed via grep that
     `getUnaffirmReason`/`pdfBufferOrNull`/`generateR2StreamUrl` are
     real `deps.X` consumers in already-extracted route files
     (`hardware-schedule-enrichment.js`, `hardware-schedule-extract.js`,
     `hardware-schedule-page-affirm.js`, `hardware-schedule-generate.js`).
   - **Resolved the `arrayBufferToBase642`/`...644` dead-code register
     item for real, not just relocated it**: `arrayBufferToBase644`
     turned out to be a byte-for-byte functional duplicate of the
     already-imported `arrayBufferToBase64` from `auth-module.js` (same
     algorithm, one just inlines the helper the other calls) - its 3
     call sites were repointed to the real shared function and the
     duplicate definition deleted outright, not exported under a new
     name. (`arrayBufferToBase642`, the other still-open duplicate, is
     untouched - it lives in a different region, not this one.)
   - **Left inline, correctly**: `savePageExtraction2` and
     `autoEnrichSessionOnSave` - `savePageExtraction2` calls the
     original inline `savePageExtraction` (one of Cluster A sub-step
     (d)'s vendored-bundle-entangled leftovers), and
     `autoEnrichSessionOnSave`'s only caller is `savePageExtraction2` -
     both join the sub-step (d) follow-up group (section 4 step 3)
     rather than being force-extracted via DI for two small functions.
   - **New real discovery, not previously catalogued**: right after
     this region (legacy-monolith.js, was ~135505-135801 pre-extraction)
     sits a third, wholly separate uncatalogued region -
     `transformDoorEntriesToHardwareSets`, `materializeDseToLineItems`,
     `generateSubmittalHTML` - confirmed real and already wired via
     `module-registry.js`/`deps.X` in `sessions-finalize-from-job.js`.
     Not touched by this step (different theme entirely - door-schedule-
     to-hardware-line-item materialization, not vision dispatch). Real
     follow-up, not yet numbered into this section's ordered list.
   - Live-verified via `GET /`, `GET /api/health` (200), `GET
     /api/sessions/readiness/list` (200), and `POST
     /api/submittals/:id/retry` + `GET /api/submittals` (both real 401s,
     auth-gated correctly, not 500s) - the two routes that inject
     `dispatchVisionExtraction`/`parseAndValidateExtraction` via
     `module-registry.js`.
2. **`pdf-metadata.js` extraction** - **done (2026-09-10).** Extracted
   to `src/lib/pdf-metadata.js` (732 lines, 24 real-behavior tests): a
   hand-written PDF xref/page-tree/bookmark parser - `skip`, `findStr`,
   `decodeStr`, `inflate`, `unpredict`, `pv`/`pvDict`/`pvArr`/`pvName`/
   `pvLitStr`/`pvHex`/`pvNumRef`, `readObjAt`, `readStream`,
   `findStartXref`, `parseClassicXref`, `parseXrefStream`,
   `buildXrefMap`, `resolve`, `resolveRef`, `readFromObjStm`,
   `getPageCount`, `buildPageList`, `refMatch`, `getBookmarks`,
   `checkPageText`, `extractPdfBookmarks`, `detectTextLayer`, plus the
   `WS`/`DL`/`TEXT_OPS` constants. Real span was 770 lines
   (23994-24763), not the ~1,250 estimate. `legacy-monolith.js`:
   135,792 → 135,021 lines. Zero vendored-bundle entanglement (confirmed
   by the standard check) - genuinely sovereign, hand-written parsing
   code with no dependency on pdfjs-dist despite sitting immediately
   before its vendored region in the file.
   - Tests built a real, byte-offset-correct minimal PDF (classic xref
     table, catalog/pages/page/content-stream objects, computed offsets
     rather than hand-counted) and ran the parser end-to-end against
     it - not just unit tests of the low-level tokenizers in isolation.
   - **Real near-miss, caught by `wrangler deploy`'s bundle validation,
     not shipped**: a stray `init_pdf_metadata();` call survived at
     legacy-monolith.js:133557 (inside the still-inline
     `hardware-schedule-extractor.js` region's own `__esm` wrapper,
     part of Cluster A sub-step (d)'s vendored-entangled leftovers) -
     a leftover call to the original lazy-init function this
     extraction removed. `node --check` and the full local test suite
     both passed regardless (same failure class as the Cluster A
     sub-step (b) and Cluster E near-misses: a call to a name that no
     longer exists in scope isn't a syntax error). First deploy attempt
     failed cleanly with `Uncaught ReferenceError: init_pdf_metadata is
     not defined`; fixed by deleting the stray call (no longer needed -
     the real ES import at the top of the file now guarantees
     `detectTextLayer`/`extractPdfBookmarks` are available before any
     code runs, which is what the lazy-init call used to ensure),
     rebuilt, redeployed successfully. **Added to the standing
     checklist**: after any extraction that removes an `__esm` wrapper
     entirely (not just strips `__name()` calls from inside one), grep
     the whole file for `init_<removed-module-name>` before deploying,
     not just within the extracted region.
   - Only 2 of the 28 exports (`detectTextLayer`, `extractPdfBookmarks`)
     have real external callers - confirmed via a full-file grep
     against every export name (all other apparent matches were
     unrelated same-named methods deep inside the vendored pdf-lib/
     pako/puppeteer bundles, e.g. pdf-lib's own `PDFDocument.
     getPageCount()`). `legacy-monolith.js`'s import was trimmed to
     just those 2 names rather than importing all 28 - the other 26 are
     purely internal to this module's own call graph.
   - This extraction makes 3 already-inline wrapper functions
     (`detectTextLayer2`, `getPdfPageCount`, `extractPdfBookmarks2` -
     left in place during Cluster A sub-step (c) specifically because
     this module didn't exist yet) resolve to real imports instead of
     locally-scoped functions, with zero changes needed to the wrappers
     themselves or their `module-registry.js` wiring.
   - Live-verified via `GET /`, `GET /api/health`,
     `GET /api/sessions/readiness/list` (all 200), and the two routes
     that directly inject `extractPdfBookmarks2`/`detectTextLayer2` -
     `POST /api/hardware-schedule/start` and `POST
     /api/hardware-schedule/extract` (both real 401s, auth-gated
     correctly, not 500s).
3. **Cluster A sub-step (d)**: the 8 functions left inline during
   Cluster A because they're transitively entangled with vendored-
   bundle internals (`loadRenderer`, `extractIsolatedPage`,
   `extractSinglePage`, `extractWithIsolatedPdfMode`,
   `savePageExtraction`, `renderRegionAt600DPI2`,
   `getOrRenderRegionAt600DPI`, `extractCore`). These call directly
   into `pdf-renderer-cloudflare.js`/pdfjs-dist and `PDFDocument_default`
   (pdf-lib) - **do this after section 3's steps 3 and 5 land**, not
   before, since a clean extraction here depends on those functions'
   real dependencies having stable sovereign module paths instead of
   reaching into the vendored-bundle region being extracted out from
   under them.
4. **`arrayBufferToBase642` consolidation** - resolve the same way
   `...644` was resolved in step 1 (2026-09-10): check whether it's
   also a byte-for-byte duplicate of the real `arrayBufferToBase64`
   import before extracting it under a new name - delete outright if
   so. Sits inside a region step 3 (Cluster A sub-step (d)) already
   covers - no separate extraction needed.
5. **Third uncatalogued region - DONE (2026-09-11)**.
   `transformDoorEntriesToHardwareSets`, `materializeDseToLineItems`,
   `generateSubmittalHTML` extracted to real
   `src/lib/submittal-transforms.js`, confirmed still wired via
   `registerExtractedModules()`/`module-registry.js` into
   `sessions-finalize-from-job.js`, unchanged behavior. The boundary
   scan found 5 more real symbols the original 3-function estimate
   missed: an entire "BLUEPRINT DESIGN SYSTEM" block
   (`BLUEPRINT_BODY_CSS`/`BLUEPRINT_HEADER_CSS`/`BLUEPRINT_TOKENS_CSS`/
   `BLUEPRINT_NAV_LINKS`/`renderBlueprintHeader`) sitting immediately
   after - confirmed via full-`src/`-tree grep to have **zero**
   references anywhere, matching its own original comment ("not yet
   wired into any monolith-served page"). Extracted to
   `src/lib/blueprint-design-system.js` as a real module rather than
   deleted, since the comment framed it as deliberate future-reuse code,
   not accidental cruft. 13 new real-behavior tests (fake-D1-recording
   style for the transforms, structural HTML assertions for both
   modules). `legacy-monolith.js`: 135,015 → 134,626 lines. Also deleted
   an unrelated pre-existing stale test (`src/cors-handler.test.mjs`,
   pointed at a module deleted back in commit `087dce9`, found while
   running the full suite - confirmed via `git stash` it predates this
   change). Full suite: 1108 tests, 1103 pass (the same 4 pre-existing
   `submittal-assembler.test.mjs` failures, step 3's scope, untouched).
   Rebuilt `weyland.worker.js`, deployed, live-verified (baseline 200s,
   `POST /api/proposals/generate` and
   `/api/takeoff/session/:id/generate-quote` still real 401s not 500s).
   Commits: `3ad329d`, `5f66287`, `5edc211`, `0a9f3f6`.
