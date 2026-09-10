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
this phase to 136,634. This is not the end of real extractable content -
section 2's dead-code register and section 3's vendored-library
follow-up are still open, and step 8's own writeup found a wholly
separate, never-catalogued second Claude-vision-adapter region
(`EXTRACTION_PROMPT_TEMPLATE`/`viaApiDirect`/etc., ~825 lines) that no
step here has touched. Real remaining work, not yet numbered into this
section's ordered list.

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

## 2. Duplicate/dead-code register (found during cataloguing, not yet fixed)

| Name(s) | Location(s) (as of 2026-09-10) | Verdict |
|---|---|---|
| `arrayBufferToBase642`/`...643`/`...644` | ~112,243 / ~134,088 / ~143,919 | 3 esbuild-collision-renamed duplicates; collapse to one `lib/base64.js` export when Cluster A moves |
| `jsonResponse2` | ~142,457, inside still-inline `registerAthenaRoutes` | Duplicate of already-extracted `jsonResponse3`; retire when step 1 (Athena routes) lands |
| `calculateClaudeCost2` | ~143,157 | Orphaned rename, no surviving sibling; just rename to `calculateClaudeCost` when Cluster F moves |
| `ERROR_CODES`/`errorResponse` vs. `error-utilities.js`'s `ErrorCodes`/`jsonErrorResponse` | ~143,104 vs. already-extracted | Two parallel, unreconciled error-response conventions; real consolidation decision needed, not a silent merge |
| `matchComponentToCutSheet` (singular) vs. `matchComponentToCutSheets` (plural, already extracted) | ~138,358 vs. `lib/product-database.js` | Confusingly similar names, genuinely different functions; rename on extraction |
| `D1KVShim` class | ~142,834 | Dead since the 2026-09-09 fix, but explicitly flagged in-code as possibly-intentional in-progress work; **ask the human before deleting** |
| Second Claude-vision-adapter region (`EXTRACTION_PROMPT_TEMPLATE`, `viaApiDirect`, `viaSabpClaudeCode`, `viaLocalSubprocess`, `adaptersForEdition`, `dispatchVisionExtraction`, `parseAndValidateExtraction`, ~825 lines) | starts right after Cluster E, before Cluster K's `router` | Wholly separate from Cluster A's already-extracted vision-adapter region (`callClaudeVision` etc.) despite the similar naming; untouched by any sub-step so far; found only while narrowing Cluster E's true end boundary. Real follow-up, own extraction step, not yet numbered/ordered in section 1. |
| `monolith` dispatcher object (deferred in step 7/Cluster I) | ~ inline, depends on `discovery_engine_default`/`getDiscoveryConfig` | Cluster E (step 8) is now done, which was the blocker this deferral was waiting on - `monolith` is now unblocked and should be revisited before/alongside Cluster K per this document's own original guidance ("extract `monolith` last among the small clusters"). |

## 3. Vendored-library follow-up (separate, smaller effort - not this phase)

~113,000 lines of `pdf-lib`, `pdfjs-dist`, RxJS, `ws`, and
`@cloudflare/puppeteer` internals are hand-bundled into
`legacy-monolith.js` instead of being real `npm` dependencies declared
in `package.json`. Not in scope for this document's step ordering -
tracked here as a known, real, much-lower-effort follow-up for
whenever it's prioritized.
