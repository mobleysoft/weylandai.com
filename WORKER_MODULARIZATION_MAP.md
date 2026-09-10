# weyland.worker.js — Structural Map & Modularization Plan

Analysis-only. Nothing in `weyland.worker.js` was edited to produce this
document. Every line number below was verified with a real `grep`/`sed`/`awk`
pass over the checked-in file in this session — none were carried over from
prior context without re-checking.

File: 168,490 lines / 7,293,708 bytes, one flat file.

## 0. Orientation: this is a real esbuild bundle, and the boundary between
   "still has source" and "lost its source" is a single exact line

Lines 1–~137,948 are vendored `node_modules` (pdf-lib, pako/zlib, `ws`,
Cloudflare `unenv` Node polyfills, `@cloudflare/puppeteer`), each still
carrying its real esbuild module-boundary comment (`// node_modules/pdf-lib/...`).
Nothing to do there — those are real upstream packages, already candidates
for "replace with the actual npm dependency" per `src/README.md`.

From line ~137,949 to 145,119, the **application's own pre-route
infrastructure** still carries real esbuild module-boundary comments
(`// <file>.js`), meaning these files genuinely existed separately before a
bundler flattened them:

| Module (from bundle comment) | First line |
|---|---|
| `native-router.js` | 137954 |
| `cors-handler.js` | 138124 |
| `rate-limit.js` | 138263 |
| `session-retrieval-endpoints.js` | 138308 |
| `athena-integration-routes.js` | 138676, 143430 (split) |
| `component-matcher.js` | 138681, 138984 (split) |
| `model-normalizer.js` | 138686 |
| `submittal-assembler.js` | 139293 |
| `session-readiness.js` | 140214 |
| `discovery-retry.js` | 140494, 142748 (split) |
| `discovery-engine.js` | 140499, 141580 (split) |
| `pdf-validator.js` | 140505 |
| `url-patterns.js` | 140884 |
| `allegion-registry.js` | 141207 |
| `cut-sheet-intelligence.js` | 143029 |
| `error-utilities.js` | 143793 |
| `takeoff-quote-generator.js` | 144081 |
| `r2-presign.js` | 144867 |
| `d1_kv_shim.js` | 144872 |
| `data-transformer.js` | 23466 |
| `pdf-metadata.js` | 23945 |
| `pdf-renderer-cloudflare.js` | 111727 |
| `hardware-schedule-extractor.js` | 133450 |

**The last such boundary comment in the entire file is `// weyland-worker.js`
at line 145,119.** Everything from line 145,120 to 168,490 — 19,909 lines,
comprising every one of the 260 API routes, the 36-page `SovereignWeylandRoutes`
server, the cron handler, the queue consumer, and the Durable Object — has
**zero** module boundary. It was never a separate file that got bundled; it
was typed directly into the bundle, growing by hand-edits alone, with no
source anywhere else. This is the concrete, line-verified version of what the
task brief described as "lost/stale source" — the loss has an exact address:
line 145,119.

Separately, `src/auth-module.js`, `src/cors-handler.js`, `src/rate-limit.js`,
`src/error-utilities.js` already exist as real, tested, byte-faithful
extractions of four of the pre-145,119 modules (see `src/README.md` — prior
work, not done in this pass). They are **not wired into any build** yet.
Important nuance verified in this pass: `auth-module.js` only covers the
low-level JWT/base64/HMAC primitives. The actual per-request gatekeepers —
`authenticate()`, `authenticateCps()`, `requireProductAccess()`,
`requireActiveSubscription()` — all live inside the unmodularized post-145,119
blob (lines 145344–145600) and are **not yet extracted anywhere**, despite
being the single highest-fan-in dependency in the whole file (216 call sites
for `authenticate()` alone — see §2).

## 1. Route inventory

**260** routes registered via `router.get/post/put/patch/delete(...)`
(`NativeRouter`, defined at line 137954 — a small hand-rolled router, not a
third-party lib), spanning lines 146,438–165,029, plus one `router.all("*",...)`
CORS-preflight catch-all at 145,163.

Method breakdown: 115 GET, 110 POST, 17 PUT, 9 DELETE, 8 PATCH, 1 ALL.

Separately, **`SovereignWeylandRoutes`** (IIFE at line 165,426, dispatched from
the top-level `fetch()` handler at line 167,670) is a second, independent
routing table serving **36 unique page paths** (42 map entries including 3
static-JSON aliases and duplicate keys) as hand-built HTML strings. This is
the page-serving layer described in the task brief.

Full route-by-route table (path, method, line, functional-area guess) is long
(260 rows); the condensed-by-cluster version below is what the module layout
in §5 is built from. Every line number is a verified cluster boundary from
the raw `router.*` grep, cross-checked against the actual code at that line.

| Line range | Approx. route count | Functional area |
|---|---|---|
| 146438–146563 | 6 | internal (R2 stream, PDF shell), health, version, metrics |
| 146563–146945 | 8 | auth: login, session, logout, AuthFor exchange, `/api/auth/me` |
| 146945–147423 | 10 | device-auth pairing flow + bridge launcher scripts (.ps1/.sh) |
| 147423–147830 | 4 | session extraction routing, hardware-schedule finalize-image |
| 147830–148056 | 2 | tenants, subscription status |
| 148056–148269 | 6 | tiny "X-suite" stub APIs: pricex, marketx, compx, weatherx, forecastx, geox |
| 148324–148387 | 1 | SightX walkthrough-preview (Service Binding to filmline-video-worker) |
| 148387–148714 | 5 | billing: catalog, checkout, subscription portal, Stripe webhook, checkout status |
| 148714–149200 | 4 | submittals upload/list/retry/get |
| 149200–150418 | ~10 | hardware-schedule: extract/start/detect-schedules/batch-extract (LLM+OCR pipeline) |
| 149341–149556 | 3 | generic multipart upload (init/part/complete) |
| 150418–150962 | 8 | hardware-schedule candidates CRUD + preview |
| 150962–151554 | 6 | hardware-schedule page approve/extract-image/extraction-contract |
| 151554–152448 | 2 | hardware-schedule export, door-index (large — 894 lines, one route) |
| 152448–152956 | 7 | cut-sheet match/batch-match, CPS enrich, pricing-options, price import |
| 153278–153705 | 9 | projects CRUD, link-sessions, backfill-bridge |
| 153705–153852 | 3 | vendor-profile |
| 153852–154898 | 7 | takeoff session/project data, line-items CRUD, materialize-from-schedule |
| 154898–156323 | 10 | quote view/share/accept, pricing resolve, generate-quote, quotes list/download |
| 156323–158001 | 30 (15 pairs) | **document-generator family** (see §3/§5 — proposals, lien-waivers, bid-packages, coa-packages, rfas, change-orders, permit-packages, closeout-packages, meeting-notes, inspections, safety-reports, survey-reports, spec-sections, drawing-index, asbuilt-diffs) |
| 157814–158003 | 5 | hunt/opportunities, leads criteria/qualify |
| 158003–158162 | 6 | quote-templates CRUD |
| 158162–159958 | 8 | hardware-schedule affirm/reject/replace/generate-submittal/generate-package/extract-affirmed |
| 159958–160062 | 3 | cut-sheet documents/download, submittal validate |
| 160062–160343 | 5 | chat, telemetry (incl. Claude API telemetry) |
| 160343–160969 | 9 | sessions list/recent/auto-generate/detail/pdf/signed-urls/door-matrix |
| 161020–161172 | 3 | session nomenclature/position, door-matrix verify, `/api/demo` |
| 161172–161787 | 1 | `GET /app.js` — an entire client-side JS bundle served inline (615 lines) |
| 161787–162318 | 15 | cut-sheet intelligence config, domains, discoveries CRUD/approve/reject |
| 162318–162744 | 9 | catalogue products/documents CRUD, bulk-import |
| 162837–163150 | 4 | session preview/assemble/status/submittal-download |
| 163150–163690 | 12 | CPS catalogues, search, search-component, drafts CRUD |
| 163690–164002 | 5 | CPS mappings CRUD + affirm-batch |
| 164002–164479 | 7 | user-cutsheets, CPS queue/extractions/render/admin-normalize |
| 164479–165029 | 7 | door-schedule marks affirm/reject/correct/resolve-hardware, cross-reference |
| 165273–165312 | — | `scheduled()` cron handler (token cleanup, discovery expiry, queue cleanup) |
| end of file | — | `queue()` consumer → delegates to `discovery_engine_default.queue()` |
| 167628–167641 | 1 | WebSocket upgrade → `SIGHTX_ROOM` Durable Object (MeetingX real-time) |

**Biggest single vertical by line count: CPS/cut-sheet-matching**
(`/api/cut-sheets/*`, `/api/cps/*`, `/api/catalogue/*`, `/api/user/cutsheets/*`,
`/api/door-schedule/*`) — roughly 152448–165029 minus the takeoff/quote/doc-gen
sub-ranges interleaved in it, on the order of 9,000–10,000 lines. Second:
hardware-schedule extraction (147423–152448, ~5,000 lines).

## 2. Shared/helper infrastructure (the real load-bearing pieces)

| Function/class | Line | Notes |
|---|---|---|
| `NativeRouter` | 137954 | hand-rolled router, not a library |
| `CorsHandler` | 138124 | already extracted to `src/cors-handler.js` (unwired) |
| rate limiter | 138263 | already extracted to `src/rate-limit.js` (unwired) |
| `authenticate(request2, env2)` | 145344 | **216 call sites** — the single highest-fan-in function in the file. Session-cookie path (D1 `weyland_sessions`) + Bearer-token path (delegates to AuthFor via `fetch("https://authfor.com/api/v1/verify")`). Not yet extracted anywhere. |
| `authenticateCps(request2, env2)` | 145453 | CPS-specific auth variant, only 4 call sites (152540, 152570, 152772, +1) |
| `requireActiveSubscription(user, env2)` | 145475 | called by `requireProductAccess` |
| `requireProductAccess(user, env2, productSlug)` | 145538 | ~40 call sites across every product vertical (`takeoffx` ×11, `cutsheetx` ×8, `subx`/`propx` ×4 each, then 1 each for the 14 doc-generator slugs) |
| `stripeRequest(env2, method, path, params)` | 148363 | Stripe REST helper, used by billing routes |
| `jsonResponse3(data, status)` | ~145170 | JSON response wrapper, used everywhere |
| `D1KVShim` class | 144872–145118 (`d1_kv_shim.js`) | D1/KV abstraction shim |
| `generateR2StreamUrl` | 146389 | R2 signed-URL helper |
| `serveR2` | 165124 | R2 object serving |
| `validateProductDatabase` / `matchProductFromDb` / `PRODUCT_DATABASE` / `MFR_CODE_MAP` | 152011, 152115, 6751, 7076 | cut-sheet/hardware product-matching data + logic |
| `renderHtmlToPdf(env2, html)` | 156504 | wraps `pdf-renderer-cloudflare.js` / pdf-lib for the doc-generator family |
| `storeDocumentPdf` | 156515 | R2 write + D1 metadata for generated docs |
| `makeDocumentDownloadRoute(table, tier, prefix)` | 156519 | **already a shared factory** — the download side of all 15 doc-generator pairs goes through this one function; only the *generate* side is hand-duplicated (see §3) |
| `registerAthenaRoutes(router2, authenticate2)` | 143445 | separate route-registration function, called once at 145121 (`registerAthenaRoutes(router, authenticate)`) — Athena integration is already structured as an injectable module, a real precedent for how new extractions should be wired |
| `getDiscoveryConfig(env2)` | 143304 | used by cron handler |

**One real module-level mutable-state coupling risk, verified:** `var cors`
(line ~145162) is reassigned on *every request* inside
`router.all("*", (request2, env2) => { cors = createCorsHandler(env2); ... })`,
then read by name (`cors.corsify(...)`) from handlers elsewhere in the file,
including the catch block of the top-level `fetch()` handler. This is genuine
ambient mutable state, not a function parameter — any module that needs to
call `cors.corsify()` outside the request that set it (e.g. the `scheduled()`
handler's error paths) is implicitly depending on a side effect from an
unrelated code path having run first in the same isolate. This is a real
blocker to clean separation and is flagged, not papered over, in §6.

## 3. ROUTE_LABELS / renderNav — confirmed, and it's a live bug, not just dead weight

Confirmed 5 duplicate `var ROUTE_LABELS = {...}` / `function renderNav(...)`
pairs, all inside the same function scope of the `SovereignWeylandRoutes` IIFE:

| Instance | `ROUTE_LABELS` lines | `renderNav` lines | Key count |
|---|---|---|---|
| 1 | 165427–165455 | 165456–165465 | 27 |
| 2 | 165466–165494 | 165495–165504 | 27 (byte-identical to #1) |
| 3 | 165505–165533 | 165534–165543 | 27 (byte-identical to #1/#2) |
| 4 | 165544–165556 | 165557–165566 | 11 (has `venturedeck`, drops 17 keys) |
| 5 | 165567–165578 | 165579–165588 | **10** (drops `venturedeck` too — the smallest of all 5) |

**This is not inert duplication.** All five are `var`/`function` declarations
in one function scope, so JS hoisting + sequential execution means only the
*last* assignment survives by the time any `serve_*` function runs — i.e. the
one true `ROUTE_LABELS` in effect for **every one of the 36 pages served by
SovereignWeylandRoutes** is the 10-key version at line 165,567. **Every page's
nav bar is silently missing links to `cutsheetx`, `investors`, `lienx`,
`bidx`, `coa`, `rfax`, `changeordx`, `permitx`, `closex`, `notesx`, `inspecx`,
`safetyx`, `survx`, `specx`, `drawx`, `asbuiltx`, `leadx`, and `venturedeck`**
— 18 live, dispatchable routes with no nav link anywhere on the site. This
reads as: 5 separate sessions each pasted the page-header boilerplate when
adding a new page, unaware a previous copy already existed in the same scope,
and the *last* paste (probably the earliest/smallest page added, before the
later ones existed) is the one that silently wins. Cause is hand-editing, not
`build.py` — none of these 36 pages besides the 18 listed in
`routes_manifest.json` have any `build.py`-managed source at all (see §7).

## 4. Dependency map between areas

- **Auth is the universal dependency.** `authenticate()` has 216 call sites
  across every vertical (hardware-schedule, CPS, takeoff, quotes, doc-gen,
  sessions, billing). No vertical can be extracted without first extracting
  `authenticate`/`requireProductAccess` and importing them explicitly — this
  is necessarily module #1 of the *shared* layer, even though it's not the
  first *route* module to extract (see §6).
- **`jsonResponse3`, `stripeRequest`, D1 (`env2.DB`), R2 (`env2.*` bindings)**
  are the other cross-cutting dependencies; every route touches at least
  `authenticate` + `jsonResponse3`, most touch `env2.DB` directly with inline
  SQL (no query-builder layer — D1 access is ad hoc per-route, not centralized
  beyond `D1KVShim`, which is only used by a subset of routes).
- **Genuinely low-coupling vertical: the document-generator family**
  (156323–158001). It depends only on `authenticate`, `requireProductAccess`,
  `jsonResponse3`, `renderHtmlToPdf`, `storeDocumentPdf`,
  `makeDocumentDownloadRoute`, and `env2.DB`/R2 — nothing in this range is
  called from outside it, and it calls nothing product-specific from other
  verticals. This is the cleanest extraction candidate in the file (see §6).
- **Genuinely high-coupling vertical: CPS/cut-sheet-matching.** Routes here
  reach into `PRODUCT_DATABASE`, `MFR_CODE_MAP`, `matchProductFromDb`,
  `validateProductDatabase` (module-level data + the pre-existing
  `component-matcher.js`/`model-normalizer.js`/`allegion-registry.js`
  modules from the pre-145,119 era), *and* the hardware-schedule extraction
  pipeline (candidates/affirm flow feeds into CPS enrich/mappings), *and*
  `discovery-engine.js`/`discovery-retry.js` (via the queue consumer). This
  is the most entangled vertical and should be extracted last, in pieces.
- **Page-serving (`SovereignWeylandRoutes`) vs. API routing (`router.*`)**
  are cleanly separate today — different dispatch mechanisms, no route in one
  calls into the other directly. The one coupling point is `authenticate`
  being referenced by both (the MeetingX WebSocket upgrade path at
  167,628–167,641 calls `authenticate` and `requireProductAccess` directly in
  the top-level `fetch()`, outside both routers).

## 5. Proposed module layout, and the bar it's held to

**The success criterion given for this layout is not "split into fewer,
smaller files" — it's that a future contributor (human or agent) can find
"where does X happen" from filenames alone, and change one module with real
confidence nothing else was touched.** That means: small, single-purpose,
obviously-named, explicit imports (no reaching into ambient state except
where flagged as a real blocker). A "SightX module" that's still 2,000 lines
because it silently contains three unrelated concerns fails this bar even
though it's technically "modularized." The layout below is built to that bar,
not to a line-count target.

```
src/
  lib/                              # shared, explicitly imported — no ambient state except cors (flagged)
    auth.js                         # authenticate, authenticateCps, requireActiveSubscription, requireProductAccess (145344-145600)
    auth-primitives.js              # already exists: src/auth-module.js (JWT/base64/HMAC) — just needs a rename/move for clarity
    cors.js                         # already exists: src/cors-handler.js — needs the per-request `cors` var replaced with an explicit instance passed to handlers (see §6 blocker)
    rate-limit.js                   # already exists: src/rate-limit.js
    errors.js                       # already exists: src/error-utilities.js
    json-response.js                # jsonResponse3 (~145170)
    d1-kv-shim.js                   # D1KVShim class (144872-145118)
    r2.js                           # generateR2StreamUrl (146389), serveR2 (165124), r2-presign.js content (144867)
    stripe.js                       # stripeRequest (148363) + billing-specific Stripe calls
    product-database.js             # PRODUCT_DATABASE, MFR_CODE_MAP, validateProductDatabase, matchProductFromDb (6751-7076, 152011-152115)
    pdf-render.js                   # renderHtmlToPdf (156504)
    document-store.js               # storeDocumentPdf, makeDocumentDownloadRoute (156515-156560)

  routes/
    health.js                       # 146513-146563
    auth-session.js                 # /login, /api/auth/* (146563-146903)
    device-auth-pairing.js          # 146945-147423 (device pairing flow only)
    bridge-launcher-scripts.js      # the .ps1/.sh launcher GET routes (147226-147423) — split out because they're static-script generation, not auth logic
    billing-checkout.js             # /api/billing/*, /api/subscription/* (148387-148714)
    billing-webhook.js              # /api/webhooks/subscription (148533-148690) — split from billing-checkout.js: webhook handling has a different trust boundary (Stripe signature verification) and should be independently reviewable
    market-signal-stubs.js          # pricex/marketx/compx/weatherx/forecastx/geox (148056-148269) — small, currently-stub routes; one file because they share nothing but triviality
    sightx-walkthrough.js           # 148324-148387 (already a natural single-route module per its own header comment)
    submittals.js                   # 148714-149200
    hardware-schedule-extract.js    # extract/start/detect-schedules/batch-extract (149200-150418)
    hardware-schedule-candidates.js # candidates CRUD + preview (150418-150962)
    hardware-schedule-page-review.js# page approve/extract-image/extraction-contract (150962-151554)
    hardware-schedule-export.js     # export, door-index (151554-152448)
    cut-sheet-match.js              # match/batch-match/price-check (152448-152539)
    cps-enrich.js                   # enrich-session/enrich-project/pricing-options/import-prices (152539-152956)
    projects.js                     # projects CRUD + link-sessions/backfill-bridge (153278-153705)
    vendor-profile.js               # 153705-153852
    takeoff-data.js                 # session/project data GET (153852-154348)
    takeoff-line-items.js           # line-items CRUD + materialize-from-schedule (154348-154898)
    quotes-view.js                  # /quote/:id/view, /q/:id/:token(+/accept) (154898-155635)
    quotes-generate.js              # generate-quote, quotes list/download, pricing/resolve (155635-156323)
    document-generators.js          # ALL 15 generate/download pairs, one file — genuinely one concern (156323-158001), see note below
    hunt-leads.js                   # hunt/opportunities, leads criteria/qualify (157814-158003)
    quote-templates.js              # 158003-158162
    hardware-schedule-affirm.js     # component/group affirm/replace/extract-region (158162-158863)
    hardware-schedule-submittal.js  # generate-submittal/generate-package/extract-affirmed (158863-159958) — largest single remaining file (~1,100 lines); flag for a second split pass once its internals are read closely
    cut-sheet-documents.js          # documents/:id, download/:id, submittal/validate (159958-160062)
    chat.js                         # /api/chat (160062-160142)
    telemetry.js                    # /api/telemetry/* (160142-160343) — split from chat.js: unrelated concern, just adjacent in the file
    sessions-list.js                # sessions list/recent/auto-generate (160343-160896)
    sessions-detail.js              # session detail/pages/pdf/signed-urls/door-matrix/nomenclature/position (160896-161172)
    demo.js                         # /api/demo (161150-161172)
    app-js-bundle.js                # GET /app.js (161172-161787) — this is a 615-line client bundle masquerading as an API route; treating it as its own file makes the "this isn't really an API route" fact visible instead of buried
    cut-sheet-intelligence-config.js# metrics/config/domains (161787-161923)
    cut-sheet-discovery.js          # discoveries CRUD/approve/reject/discover-cut-sheets/coverage (161923-162318)
    catalogue-products.js           # 162318-162514
    catalogue-documents.js          # 162532-162744
    catalogue-bulk-import.js        # bulk-import/local-search/local-index (162684-162837)
    session-assembly.js             # preview/assemble/status/submittal-download (162837-163150)
    cps-catalogues.js               # 163150-163309
    cps-search.js                   # search/search-component (163309-163555)
    cps-drafts.js                   # 163555-163690
    cps-mappings.js                 # 163690-164002
    user-cutsheets.js               # 164002-164222
    cps-queue-admin.js              # queue/extractions/render/admin-normalize (164222-164479)
    door-schedule-marks.js          # 164479-165010
    cross-reference.js              # 165010-165029 (single route — small enough to question whether it belongs merged into door-schedule-marks.js; left separate because the path is /api/projects/, not /api/door-schedule/)

  pages/
    nav.js                          # THE single canonical ROUTE_LABELS + renderNav — fixes §3's bug by construction (only one copy can exist)
    page-dispatcher.js              # the `map` object + dispatch() (167557-167613)
    page-<name>.js  x 18             # for the 18 pages with NO existing src/pages/*.html source (marketx, pricex, compx, weatherx, forecastx, geox, cutsheetx, lienx, bidx, coa, rfax, changeordx, permitx, closex, notesx, inspecx, safetyx, survx, specx, drawx, asbuiltx, leadx) — brings them to parity with the 18 that already have real source
    # the 18 pages already covered by src/pages/*.html + routes_manifest.json are untouched — that architecture is already correct, see §7

  worker/
    fetch-handler.js                # top-level fetch() (167616-167673+): protocol upgrade, websocket dispatch, subdomain redirect, MASCOM_EDGE delegation, router.handle(), SovereignWeylandRoutes.dispatch()
    scheduled-handler.js            # cron (165273-165312)
    queue-handler.js                # queue() consumer (delegates to discovery-engine)
    sightx-room-durable-object.js   # SIGHTX_ROOM Durable Object class (~167705+)
```

**~50 route modules + ~12 lib modules + ~20 page modules + 4 worker-entry
modules ≈ 86 files**, averaging under 250 lines each for routes (the document
generator family and `hardware-schedule-submittal.js` are the two outliers
worth a second look). This is deliberately more files than a "one per
vertical" plan would produce — that trade-off is the point: `cutsheetx`
alone would otherwise be one ~9,000-line file that fails the "obvious from
the name" bar just as badly as the current monolith does, at a smaller scale.

### Self-assessment against the bar

- **Clearly meets it:** `document-generators.js`, `sightx-walkthrough.js`,
  `cross-reference.js`, `demo.js`, `app-js-bundle.js`, `nav.js`,
  `page-dispatcher.js`, the entire `lib/` layer once `auth.js` is written —
  each has one obvious job, a name that states it, and (after `auth.js` and
  `cors.js` are fixed per below) only explicit imports.
- **Borderline, named honestly as such:** `hardware-schedule-submittal.js`
  (~1,100 lines — three sub-concerns: submittal generation, package
  generation, and "extract-affirmed" batch processing, that this pass didn't
  have time to read closely enough to split with confidence) and the CPS
  cluster generally (`cps-*.js`, `cut-sheet-*.js`, `catalogue-*.js` — 12
  files) — individually each is small and named clearly, but the *cluster*
  as a whole shares `PRODUCT_DATABASE`/`MFR_CODE_MAP`/`matchProductFromDb`
  in a way that isn't yet proven safe to treat as 12 independent files
  rather than one bounded context with 12 route entry points. Flagging this
  honestly rather than asserting independence I haven't verified.
- **Real blocker, not papered over:** `cors.js`. The current code's `var
  cors` reassigned per-request (§2) means `fetch-handler.js` and any route
  module that calls `cors.corsify()` from an error path are implicitly
  coupled through mutable module state, not an import. A clean split
  requires either (a) threading a `cors` instance through every handler
  explicitly (touches all ~260 routes' signatures), or (b) constructing a
  fresh `CorsHandler` inline wherever `corsify()` is needed instead of
  reading the shared var. Until one of those is chosen, `cors.js` cannot be
  said to have "minimal, explicit coupling" — this is called out rather than
  assumed away.
- **`auth.js` is the real precondition for everything else,** not because
  it's hard to isolate (it isn't — `authenticate`/`requireProductAccess`
  read only `env2.DB` and `fetch()` to authfor.com, no other module state),
  but because 216 call sites means every other route module's "explicit
  import" story depends on this one existing first. It's simple in itself;
  it's just upstream of everything.

## 6. Proposed extraction order (lowest blast-radius first)

Given the confirmed context that **no live paying customer depends on this
specific worker** (PAD is on Ron's separate build), the constraint here is
"don't produce something irreversible or hard to verify," not "zero
observable behavior change ever." Order:

1. **`lib/auth.js`** (`authenticate`, `authenticateCps`,
   `requireActiveSubscription`, `requireProductAccess`) — extract first
   *not* because it's isolated (it's the opposite — 216+40 call sites) but
   because every subsequent route extraction needs to import the same
   function instead of relying on it being ambient. Verify: a saved test file
   (matching the pattern already used for `auth-module.js`) that calls
   `authenticate()` against faked `Request` objects covering the session-cookie
   path, the Bearer/AuthFor path, and the missing-credentials path, asserting
   identical output to manually tracing the current inline logic. No live
   traffic needed for this step — it's pure function-in/function-out.
2. **`routes/document-generators.js`** — first *route* extraction. Lowest
   blast radius of any vertical: nothing outside 156323–158001 calls into it,
   and it calls nothing product-specific from elsewhere. Verify: for each of
   the 15 generate endpoints, POST the same representative body against the
   current bundle and the extracted version (run locally with `wrangler dev`
   against a copy of the file with just this range swapped for an import),
   diff the returned `downloadUrl`/`success` JSON and the resulting PDF byte
   length (not full byte-diff — `renderHtmlToPdf` may have nondeterministic
   timestamps embedded; compare structure, not exact bytes).
3. **`pages/nav.js` + `pages/page-dispatcher.js`** — second-lowest risk,
   highest immediate value: this is where the real bug lives (§3). Extracting
   forces a single canonical `ROUTE_LABELS`, which is a strict improvement
   (adds 18 missing nav links) verifiable by literally diffing the rendered
   nav HTML of any one page before/after — the fix is visually obvious.
4. **`routes/sightx-walkthrough.js`, `routes/cross-reference.js`,
   `routes/demo.js`** — trivially small, single-route, already
   self-documenting in the bundle's own comments. Good "practice reps" for
   the extraction process before tackling anything with real fan-in.
5. **`routes/hunt-leads.js`, `routes/quote-templates.js`,
   `routes/vendor-profile.js`, `routes/projects.js`** — small verticals,
   product-slug-gated via the now-extracted `requireProductAccess`, minimal
   cross-references to other verticals.
6. **The takeoff/quotes cluster** (`takeoff-data.js`, `takeoff-line-items.js`,
   `quotes-view.js`, `quotes-generate.js`) — moderate size, some shared
   pricing logic (`pricing/resolve`) worth extracting into `lib/` alongside
   this step rather than duplicating it into two route files.
7. **The hardware-schedule cluster** — **✅ step complete, 2026-09-10.** All
   36 routes (plus 2 real pre-existing-but-never-wired extractions found
   along the way, rate-limit.js and error-utilities.js) are now real
   modules or real imports; nothing hardware-schedule-specific remains
   inline in legacy-monolith.js except the 3 unrelated `/api/upload/*`
   routes deliberately left alone. See the individual "✅ done" notes
   below for what landed in which file and which shared helpers stayed
   as injected dependencies (there are a lot of them - this cluster's
   real fan-out into the still-unextracted CPS cluster, Stripe billing,
   and the core PDF-processing pipeline was consistently more entangled
   than the plan below implies, confirmed at every step). —
   **correction, 2026-09-10, after actually
   reading it**: this is bigger and more entangled than the estimate above.
   A full route scan (not just grepping `/api/hardware-schedule` at known
   prefixes) found **36 routes spanning ~6,400 lines** (146198-152514+ at
   the time of this note), not cleanly contiguous. The gaps between routes
   contain both real shared hardware-schedule helpers (`getSessionStatus`,
   14+ call sites across the whole cluster; `getOrRenderPage`;
   `detectAndPersistRegionConflicts`) *and* entirely unrelated interleaved
   systems (Stripe billing, HuntX opportunity fetching, economic-data
   feeds) *and* — this is the important part — a real chunk of the CPS/
   cut-sheet cluster's own core matching logic (`PRODUCT_DATABASE`,
   `validateProductDatabase`, `findProductMatch`, `matchProductFromDb`,
   `enrichComponent`, `getCutSheetsForProduct`) sitting physically inside
   what looked like step 7's territory. Steps 7 and 8 are more entangled
   than this ordering implies — treat that as real signal, not something
   to extract around. Do this cluster as several smaller, independently
   verified pieces, not one atomic pass:
   - ✅ done (2026-09-10): `lib/region-conflicts.js` (shared conflict-
     detection helper) + `routes/hardware-schedule-candidates.js` (10-route
     region-candidate review workflow: list/create/update/delete/validate/
     preview/affirm/reject/undo). `getSessionStatus`/`getOrRenderPage` left
     as injected deps (still defined in legacy-monolith.js — real fan-out
     across routes not yet extracted, so extracting them now would force
     touching the whole remaining cluster at once).
   - ✅ done (2026-09-10): `src/rate-limit.js` — a real extraction from a
     *prior* session (2026-09-05) that had never actually been wired into
     the build — finally imported for real, dropping legacy-monolith.js's
     inline vendored duplicate. Plus `routes/hardware-schedule-enrichment.js`
     (enrich/backfill/affirm-status, 3 routes). `enrichComponent` (CPS
     PRODUCT_DATABASE matching, step 8) and `storeHardwareExtraction` (an
     esbuild lazy-`__esm` reference only resolvable inside
     legacy-monolith.js's bundled scope) left as injected deps for the
     same reason as `getSessionStatus` above. `getUnaffirmReason` also
     stays injected — still used by the not-yet-extracted component/group
     affirm routes below.
   - ✅ done (2026-09-10): `routes/hardware-schedule-page-affirm.js`
     (component-affirm, group-affirm, extraction-delete "26L Delete-the-
     Loser", extract-region "26M", group-replace, affirm-all — 6 routes).
     `validateComponentForAffirm` extracted as a local helper (both real
     call sites were inside this file's own routes). Seven more shared
     cluster-wide helpers left as injected deps, same reasoning as
     `getSessionStatus`: `extractFromPageImage`, `materializeAffirmedGroup`,
     `unaffirmMaterializedGroup`, `pdfBufferOrNull`, `generateR2StreamUrl`,
     `isPageInRange`, `renderRegionAt600DPI2` — each has real call sites
     in routes still inline below.
   - ✅ done (2026-09-10): `routes/hardware-schedule-generate.js`
     (generate-submittal, generate-package, extract-affirmed — 3 routes).
     `arrayBufferToBase64` turned out to be another real auth-module.js
     export (same situation as createHmacSignature) — imported directly
     rather than injected. Six more shared helpers injected: `callEdge`,
     `generateSubmittalHTML`, `incrementSubmittalsUsed`,
     `matchComponentToCutSheets` (CPS cluster, step 8),
     `queuePageExtractionJob`, `routeExtraction` — plus reuse of
     `getSessionStatus`/`generateR2StreamUrl`/`isPageInRange`/
     `pdfBufferOrNull`/`renderRegionAt600DPI2` from the prior piece.
   - ✅ done (2026-09-10, mid-piece): wired `src/error-utilities.js` into
     the build — another real, tested (21 passing cases), never-wired-in
     extraction from a prior session, same situation as rate-limit.js.
     Its own README calls it "the most heavily-reused cluster extracted
     so far"; legacy-monolith.js's own fan-in confirmed it (13-7 real
     references per identifier). Inline vendored duplicate deleted,
     replaced with a real import of ErrorCodes/classifyError/
     createErrorResponse/jsonErrorResponse/ErrorMetrics/performHealthCheck.
   - ✅ done (2026-09-10): `routes/hardware-schedule-page-extract.js`
     (page/:pageNum GET, approve, extract-image, extraction-contract,
     extract-result — 5 routes). Real end-to-end proof the
     error-utilities.js wiring above works: this file's error path is a
     genuine classifyError -> ErrorMetrics.recordError -> jsonErrorResponse
     chain, exercised by a real test. Four more shared helpers injected:
     approvePageExtraction, extractSinglePage, resolveExtractionContract,
     savePageExtraction2 — plus reuse of getSessionStatus/isPageInRange/
     extractFromPageImage/queuePageExtractionJob from prior pieces.
   - ✅ done (2026-09-10): `routes/hardware-schedule-finalize-image.js`
     (finalize-image — 1 route). Confirmed genuinely isolated from the
     rest of the cluster by the ~1,756-line Stripe/HuntX/econ-data gap
     noted above — clean boundary on both sides. Two more helpers
     injected: `buildExtractionResultFromVision`,
     `persistDoorScheduleResponse` — plus reuse of `callEdge`/
     `materializeDseToLineItems`/`transformDoorEntriesToHardwareSets`/
     `savePageExtraction2` from prior pieces.
   - ✅ done (2026-09-10): `routes/hardware-schedule-extract.js` - the
     final piece. 9 routes (the legacy job-based extract/review/approve
     trio, start, detect-schedules, status, set-page-range,
     set-table-pages, batch-extract), non-contiguous - 3 unrelated
     `/api/upload/*` routes sit interleaved between approve/:groupNumber
     and start, deliberately left in place. `countPdfPagesRaw` moved to
     a local helper (both real call sites - start, batch-extract - were
     inside this file). By far the largest injected-dependency list of
     any piece this session, matching the "~20 unscoped PDF-pipeline
     dependencies" estimate: extractHardwareSchedule,
     getHardwareGroupForReview, updateHardwareGroup, detectFileType,
     extractPdfBookmarks2, detectSchedulePages, createExtractionSession,
     logTelemetryEvent, detectTextLayer2 - none extracted themselves,
     each with real fan-out into core PDF-processing internals or step
     8's CPS cluster territory.
8. **The CPS/cut-sheet cluster last** (real §5 count is closer to 15-17
   route files once the original proposed layout is re-read, not 12;
   ~9,000–10,000 lines), the only cluster this pass could not confidently
   assert is safe to split into fully-independent files (§5). Do this
   after the smaller extractions have established a working pattern and
   after someone has read the CPS cluster's internals closely enough to
   confirm which files can truly stand alone. **In progress, started
   2026-09-10, same pattern as step 7 - foundational lib/ layer first:**
   - ✅ done (2026-09-10): `lib/product-database.js` - `PRODUCT_DATABASE`
     (the hand-curated in-memory array; distinct from `MFR_CODE_MAP`,
     already extracted into lib/pricing.js in step 6),
     `validateProductDatabase`, `findProductMatch`, `enrichComponent`,
     `matchProductFromDb`, `getCutSheetsForProduct`,
     `matchComponentToCutSheets`. `matchComponentToCutSheets` and
     `enrichComponent` both still have real call sites in still-inline
     CPS routes - imported back in. `MFR_CODE_MAP` is NOT duplicated
     here; this file's matching approach (simple substring match against
     a small array) is genuinely distinct from lib/pricing.js's tokenized
     D1-catalogue matcher, not the same logic twice.
   - ✅ done (2026-09-10): `routes/cut-sheet-match.js` - cut-sheets/match
     + cut-sheets/batch-match (2 routes), thin wrappers around
     lib/product-database.js's matchComponentToCutSheets. No injected
     deps beyond authenticate/requireProductAccess (accepted as deps for
     testability, matching every other module's convention, even though
     both are always the same top-level lib/auth.js import in practice).
   - ✅ done (2026-09-10): `routes/cps-import-prices.js` - bulk
     product-variant price import (1 route), with a real preserved
     defensive fallback for a rolling `price_uom` column migration.
     `scrubModelTokens` inlined as a local helper (its one real call
     site was inside this route).
   - ✅ done (2026-09-10): cut-sheets/for-set/:setId added into the
     existing `routes/cut-sheet-match.js` (not a new file - same real
     deps/gate as match+batch-match). Matches every component in a
     whole hardware set, returns a deduplicated cut-sheet list.
   - ✅ done (2026-09-10): `routes/cut-sheet-documents.js` -
     cut-sheets/documents/:docId (metadata) + cut-sheets/download/:docId
     (real PDF streaming from R2, env.OUTPUTS for "product-docs" vs.
     env.UPLOADS otherwise).
   - ✅ done (2026-09-10): `routes/cps-catalogues.js` - GET
     cps/catalogues (list, paginated), GET cps/catalogues/:id (detail +
     pages + mapping_stats), POST cps/catalogues (create), POST
     cps/catalogues/:id/pages (bulk page upload, batched inserts w/
     inserted/skipped counts). 4 routes, cleanly self-contained -
     authenticate is the only dependency.
   - ✅ done (2026-09-10): `routes/cps-search.js` - GET cps/search
     (trigram-then-FTS5-expanded catalogue text search, graceful "index
     not yet available" fallback, internal X-Internal-API bypass for
     Weyland-Discovery) + POST cps/search-component (multi-field
     weighted scoring search). 2 routes, authenticate is the only
     injected dep; expandSearchQuery stayed a local nested helper.
   - ✅ done (2026-09-10): `routes/cps-drafts.js` - PUT cps/drafts
     (upsert with a 7-day TTL and ON CONFLICT update), GET
     cps/drafts/:componentId (fetch, with real expired-draft
     lazy-delete), DELETE cps/drafts/:componentId, GET cps/drafts (list
     live, non-expired drafts). 4 routes, authenticate is the only
     injected dep.
   - ✅ done (2026-09-10): `routes/cps-mappings.js` - GET mappings (list
     w/ catalogue_id+status filters and pagination), POST mappings
     (create, auto-queues low-confidence matches for affirmation), PUT
     mappings/:id/affirm (affirms an existing mapping or creates+affirms
     a new one), PUT mappings/:id/reject (rejects, logs, clears any
     related draft), POST mappings/affirm-batch (bulk-affirms up to 30
     pages for a component, clears its draft). 5 routes, authenticate is
     the only injected dep.
   - ✅ done (2026-09-10): `routes/user-cutsheets.js` - GET
     cutsheets/check (per-user component-hash cache lookup), GET
     cutsheets/:id/image (streams cached PNG/PDF from R2 w/ ownership
     check), POST cutsheets (stores a user-affirmed cutsheet from
     base64 pngData, a copied cached catalogue page PDF, or
     metadata-only), GET cutsheets (paginated list w/ trade filter).
     4 routes, authenticate the only injected dep; componentHash
     inlined locally (its only 2 real call sites were both here) and
     its orphaned original definition deleted from legacy-monolith.js.
   - Still inline: everything else - the rest of the CPS/cut-sheet route
     surface (~15 more `/api/cut-sheets/*` and `/api/cps/*` routes alone
     per the last full scan - queue/extractions/render, discoveries,
     domains/verify, intelligence metrics/config, admin normalize,
     catalogue-products/documents/bulk-import, cut-sheet-discovery,
     door-schedule-marks, session-assembly, and more per §5's original
     proposed layout - re-read that section and re-run a full route
     scan before picking individual pieces, since none of its line
     numbers are current anymore).

For every step, "verified behaviorally identical" concretely means: run the
extracted module inline via `wrangler dev` against a copy of the worker with
only that line range replaced by an import, fire the same representative
request set at both versions, and diff response status/body shape (not
necessarily exact bytes, given timestamps/UUIDs). This does not require
touching the deployed production `weyland.worker.js` at any point — the
comparison worker is a disposable local copy.

## 7. Alarming findings

1. **`cleanupExpiredTokens(env2)` is called but never defined anywhere in
   the file.** Single call site: line 165,276, inside the `scheduled()` cron
   handler (fires daily at 2 AM UTC per its own comment). Verified via
   `grep -c "cleanupExpiredTokens" weyland.worker.js` → **1** (the call
   itself). This throws a `ReferenceError` every time the cron fires; it's
   caught by the surrounding `try/catch` and only logged
   (`console.error("[Cron] Token cleanup failed:", ...)`), so it fails
   silently. Password reset tokens are, as far as this code is concerned,
   never actually cleaned up. This is not a hypothetical — it is presumably
   throwing right now, once a day, in production.
2. **The ROUTE_LABELS/renderNav duplication is a live navigation bug, not
   dead weight** (§3) — 18 real, dispatchable routes have no nav link on any
   page site-wide, because the 5th (smallest) copy of a 5x-duplicated `var`
   is the one that wins by JS hoisting rules.
3. **22–24 of the 36 `SovereignWeylandRoutes` pages have zero source of
   truth anywhere outside the bundle.** `src/routes_manifest.json` +
   `build.py` cover exactly 18 keys (verified: `python3 -c "...len(d)..."` →
   18). The `map` object inside the bundle has 42 entries (36 unique pages +
   3 static-JSON aliases + duplicate keys). The gap — `marketx`, `pricex`,
   `compx`, `weatherx`, `forecastx`, `geox`, `cutsheetx`, `lienx`, `bidx`,
   `coa`, `rfax`, `changeordx`, `permitx`, `closex`, `notesx`, `inspecx`,
   `safetyx`, `survx`, `specx`, `drawx`, `asbuiltx`, `leadx` — is not "drift
   from a source that could regenerate it," it's pages that `build.py`
   literally cannot know exist. This is a stronger version of the risk the
   task brief asked to check for: not stale-source drift, but source that
   was never captured in the first place.
4. **`var cors` reassigned per-request as ambient module state** (§2, §5) —
   works today only because Cloudflare Workers isolates are single-request-at
   -a-time-per-invocation in practice for this access pattern, but it's a
   real code smell that will actively resist clean modularization until
   addressed explicitly.
5. **Dead/unwired code found in passing:** a ~large `BLUEPRINT_BODY_CSS`
   design-system block after the `weyland_worker_default` export, explicitly
   commented `"Not yet wired into any monolith-served page - additive only"`
   — self-flagged by whoever added it, not something this pass had to
   discover independently, but confirms the pattern of speculative code
   accumulating in this file with no cleanup pass.
6. **The local-JWT auth path is self-documented as dead**: a comment at the
   `authenticate()` function (~145,378) states outright that "nothing in
   this worker signs a local JWT_SECRET token, so the block above is
   effectively dead for real traffic" — an honest in-code admission that
   part of the auth logic has no real caller. Left in place, correctly not
   removed by a docs-only pass, but worth carrying into whichever ticket
   extracts `lib/auth.js` (§6 step 1) as a candidate for deletion once
   verified.
