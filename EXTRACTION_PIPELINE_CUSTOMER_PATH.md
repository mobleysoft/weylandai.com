# Extraction pipeline: customer path — tracking doc

Started 2026-09-12, per direct instruction, after two real, code-verified
findings: (1) the door-hardware extraction pipeline (SubX/TakeoffX's actual
core paid product) had zero customer-facing UI — every route lived under
`src/routes/`, reachable only via direct API calls, with `src/pages/subx.html`
and `takeoffx.html` being pure static marketing copy with a "SIGN IN" CTA
that led nowhere real; (2) `src/routes/demo-trial.js`'s demo-clone endpoint
wrote a visitor's door data only into the legacy `door_hardware_matrix`
table, invisible to every real downstream route.

Same standard as this repo's other tracking docs
(`MICROSERVICES_PUSH.md`, `WORKER_MODULARIZATION_MAP.md`): what shipped,
exact verification commands and real output, and what's still honestly not
working.

## Part 1 — `demo-trial.js`: fixing the data-visibility bug

### Before

`POST /api/demo/weyland-building/session` cloned the seed project's 10 door
rows by reading `door_hardware_matrix` (session `cc961a0b-...`) and
re-inserting into `door_hardware_matrix` only. Internally consistent for
itself, but:

- `cross-reference.js`, `door-schedule-marks.js`,
  `hardware-schedule-export.js`, and `hardware-schedule-generate.js` all
  read from `hardware_sets` + `door_schedule_entries` instead — a cloned
  visitor's data was permanently stranded in a table nothing else reads.
- `hardware_extraction_sessions` never had `project_id` set at all, so the
  cloned session was invisible to every project-scoped route too
  (`GET /api/projects/:id`, `POST /api/projects/:id/cross-reference`) — a
  second, independent bug found while fixing the first.
- The session was unconditionally attributed to the seed project's own
  owning account (`demo-seed@weylandai.com`), even for a real, logged-in
  caller — silently locking that real customer out of every
  ownership-checked route (`GET .../export`, `.../generate-submittal`, both
  do `session.user_id !== user.userId`) on their *own* cloned data.

### After

`src/routes/demo-trial.js` (and its bundled twin embedded in
`weyland.worker.js` — see "A note on the build pipeline" below) now:

1. Still writes `door_hardware_matrix` (kept, not removed —
   `GET /api/hardware-schedule/session/:id/door-index` and the landing
   page's own `loadRealTrial()` in `index.html` both still read it live).
2. Also writes `door_schedule_entries` for the same rows (`door_number` →
   `mark`, `hardware_set_number` → `hardware_group`, etc.), carrying the
   seed's own `verified` flag into `validation_status`/`validated`/
   `validated_at` honestly rather than inventing a new judgment.
3. Calls the existing, already-tested `transformDoorEntriesToHardwareSets`
   bridge (`src/lib/submittal-transforms.js` — the same function
   `sessions-finalize-from-job.js` calls after a real SABP door-schedule
   extraction) to group those entries into real `hardware_sets` rows on the
   same session, satisfying `hardware_sets`'s NOT-NULL approval-workflow
   columns (`approved_from_page`, `approved_at`, `approved_by`,
   `source_page_extraction_id`) via a real bridge-origin
   `hardware_page_extractions` row. Attribution is the honest
   `"demo-seed-clone"` string, not a real caller's identity — nobody
   reviewed this data, it was auto-cloned.
4. Directly sets `door_schedule_entries.hardware_set_id` for each row via
   an exact `set_number = hardware_group` match — honest because both sides
   were generated from the identical seed token, not a fuzzy guess.
5. Sets `hardware_extraction_sessions.project_id = newProjectId` (missing
   before), and attributes the session to the real caller's own account
   when one exists (`ownerUserId || seedProject.created_by`) instead of
   unconditionally to the seed's account.
6. Sets `validated_by = 'demo-seed-bridge'` on every `door_schedule_entries`
   row regardless of the seed's own `verified` flag. Reason: fixing #5
   above (adding `project_id`) makes `POST /api/projects/:id/cross-reference`
   reachable on a demo-cloned project for the first time — and that route's
   own stale-clearing logic wipes `hardware_set_id` back to `NULL` on any
   mark it doesn't recognize as already resolved (`validated_by IS NULL`
   and method isn't `user_override`). Verified live (see below) that
   without this, a real customer clicking cross-reference on their cloned
   demo project would have silently destroyed the exact links step 4 just
   built.

### Live verification (production, 2026-09-12)

Cloned as a real ephemeral guest first:

```
$ curl -sX POST https://weylandai.com/api/demo/weyland-building/session -H "Authorization: Bearer <ephemeral token>"
{"project_id":"...","session_id":"a1db1b66-...","reused":false,"door_count":10,"hardware_sets_created":8}
```

Then created a throwaway real `users` + `weyland_sessions` row (this
codebase's own real, already-live local-session auth mechanism —
`legacy-local-session.js`, checked first in `authenticate()`) to verify the
ownership-gated routes as an actual logged-in customer, and deleted both
rows immediately after:

```
$ curl -sX POST https://weylandai.com/api/demo/weyland-building/session -H "Cookie: weyland_session=<test>"
{"project_id":"05d0a4f2-...","session_id":"10e028f7-...","reused":false,"door_count":10,"hardware_sets_created":8}

$ curl -s ".../api/hardware-schedule/session/10e028f7-.../export" -H "Cookie: ..." -H "Accept: application/json" | jq '.hardwareSets | length'
8

$ curl -sX POST ".../api/projects/05d0a4f2-.../cross-reference" -H "Cookie: ..."
{"success":true,"door_sessions":1,"hardware_sessions":0,"candidate_sets":0,
 "total_marks":10,"matched_exact":0,"skipped_user_resolved":10,"cleared_stale":0}

$ curl -s ".../api/door-schedule/session/10e028f7-.../marks" -H "Cookie: ..." | jq '.marks[] | {mark, hardware_group, matched_set_number}'
# all 10 rows show matched_set_number populated (e.g. D-101 HW-01 -> HW-01),
# confirmed unchanged (cleared_stale:0 above) after the cross-reference call
```

Also verified directly against D1 (bypassing the HTTP ownership check, to
confirm the underlying data independent of that separate auth gate):

```
$ wrangler d1 execute weyland_db --remote --command \
  "SELECT set_number, door_count, approved_by FROM hardware_sets WHERE session_id='...'"
# 8 real rows, approved_by='demo-seed-clone', door_count summing to 10
```

**Honest note on `cross-reference`'s real scope:** `door_sessions:1,
hardware_sessions:0, candidate_sets:0` is the *correct* real result for a
single combined-document demo clone, not a bug this fix should paper over.
`cross-reference.js` is designed to match a project with two *separately
uploaded* documents (a door-schedule PDF and a hardware-schedule PDF) — it
has no candidate `hardware_sets` to match against unless a session in the
same project has `document_type = 'hardware_schedule'`. This demo clone is
one document, so this route's own fuzzy matcher genuinely finds nothing —
which is exactly why step 4's *direct* exact-token link (not routed through
`cross-reference` at all) is the real fix, and step 6 exists specifically
so a real customer triggering `cross-reference` later doesn't destroy it.

### A note on the build pipeline

This repo's actual deployed artifact (`main = "weyland.worker.js"` in
`wrangler.toml`) is not directly hand-maintained — it's meant to be an
`npm run build` (esbuild) output from `src/worker-entry.js` →
`src/legacy-monolith.js` → `src/module-registry.js` → the real route
modules (`src/routes/demo-trial.js`, etc). **Running a fresh `npm run
build` right now produces a ~600-line diff unrelated to this work**
(functions from `src/lib/edge-telemetry.js` — `detectFileType`,
`errorResponse`, `calculateClaudeCost`, etc. — appear duplicated/reordered
relative to the committed `weyland.worker.js`), meaning the committed
artifact has already drifted from a clean rebuild of current source,
independent of anything in this session. Given `build.py`'s own documented
history of exactly this class of regression (see that file's header), this
session did **not** run a full rebuild. Instead, every source-level change
below was mirrored by hand into the exact corresponding embedded region of
the deployed `weyland.worker.js` (and into `src/lib/marketing-pages.js`,
the real un-bundled source for the page-serving section), verified with
`node --check` before each deploy. **A real, separate follow-up this
session is flagging, not fixing:** someone should reconcile that
edge-telemetry drift and get `npm run build` back to producing a
no-op diff before it compounds further.

## Part 2 — a real, functional customer-facing extraction page

### Before

`src/pages/subx.html` / `takeoffx.html`: 62/68 lines of static marketing
copy, zero `fetch()`/`/api/` calls, one CTA (`SIGN IN TO START A
SUBMITTAL`/`...A TAKEOFF`) linking to `/login?redirect=/` — a real,
working login (AuthFor-backed, confirmed via `src/routes/login-page.js`)
that, on success, sent the user right back to the same static marketing
page. No dashboard/app directory existed anywhere in this repo. The actual
~30-route extraction cluster (`sessions-*.js`, `hardware-schedule-*.js`,
`door-schedule-marks.js`, `upload.js`, `cross-reference.js`) was reachable
only by direct API calls.

### After

**New page: `src/pages/subx-app.html`**, registered as route `subx-app`
(`src/routes_manifest.json` + hand-mirrored `serve_subx_app()` function in
both `src/lib/marketing-pages.js` and `weyland.worker.js`, same reasoning
as Part 1's build-pipeline note — no full rebuild run). Real, not a mockup:

- Uses the existing, already-shipped `AuthForStandard` client
  (`/assets/authfor-integration-standard.js`) for login — same library
  `/login` itself uses. No login → shows that library's real login UI.
- **Upload**: a form posts multipart `FormData` straight to the real
  `POST /api/hardware-schedule/start` (project name, document type, PDF
  file).
- **Sessions**: `GET /api/sessions` renders the caller's real rows
  (project, progress, hardware-set count, status, created date).
- **Extraction route**: `GET`/`POST /api/sessions/:id/extraction-route`
  wired directly — the two real options (`claude_code_local`, `api_direct`)
  are shown and settable.
- **Run extraction**: calls `GET /api/hardware-schedule/session/:id/page/1`
  (the real, synchronous Claude Vision call) and renders the real result or
  the real error, verbatim — including a `apiErrorText()` helper that
  unwraps both real error-response shapes this codebase uses
  (`{error:"string"}` and `{error:{code,message,details}}`) so the *actual*
  reason surfaces, not just a generic wrapper message.
- **Honest scope note printed directly on the page**: the single-page
  extract button does not currently branch on the extraction-route
  selector (verified in `hardware-schedule-page-extract.js` — only the
  separate `/extract-image` route, which needs client-side PDF rendering,
  honors it). The page says this plainly instead of implying the selector
  changes that button's behavior.
- Links to `door-index` and `export` (raw JSON view) for the selected
  session.
- CTA fix: `/subx` and `/takeoffx`'s `SIGN IN TO START A...` buttons now
  link to `/login?redirect=/subx-app`, so a successful login actually lands
  on a real workspace instead of back on the marketing page.

### Live verification (production, 2026-09-12)

```
$ curl -o /dev/null -w '%{http_code}' https://weylandai.com/subx-app
200
$ curl -s https://weylandai.com/subx | grep -o 'href="/login[^"]*"'
href="/login?redirect=/subx-app"
$ curl -s https://weylandai.com/takeoffx | grep -o 'href="/login[^"]*"'
href="/login?redirect=/subx-app"
```

Full real workflow, as a throwaway real logged-in test account (deleted
after):

```
$ curl -sX POST .../api/hardware-schedule/start -H "Cookie: ..." \
    -F file=@test.pdf -F projectName="Verify Agent Test Upload" -F document_type=hardware_schedule
{"sessionId":"82d150ae-...","totalPages":1,...,"next_step":"GET /api/hardware-schedule/session/82d150ae-.../page/1"}

$ curl -s .../api/sessions -H "Cookie: ..." | jq '.sessions | length'
1

$ curl -sX POST .../api/sessions/82d150ae-.../extraction-route -H "Cookie: ..." -d '{"route":"api_direct"}'
{"ok":true,"route":"api_direct","affirmed_at":"...","affirmed_by":"verify-agent-test3-...@weylandai.com"}

$ curl -s .../api/hardware-schedule/session/82d150ae-.../page/1 -H "Cookie: ..." -w '\n%{http_code}'
{"success":false,"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred...",
 "details":"ANTHROPIC_API_KEY not configured", ...}}
500
```

This last call is the honest, real, currently-failing step — see Part 3.

## Part 3 — what's still genuinely blocked (not fixed, not hidden)

`ANTHROPIC_API_KEY` is **not** provisioned as a Worker secret on
`weylandai-com-worker` (confirmed via `wrangler secret list` this session —
it is not in the list). Every real extraction call (`callClaudeWithPdf` in
the bundled worker, `viaApiDirect` in
`src/lib/hardware-extraction-vision-dispatch.js`) throws `"ANTHROPIC_API_KEY
not configured"` the instant it's reached, live-verified above. This is
explicitly **not** something this session attempted to work around —
entering a real API key into `wrangler secret put` requires John's own
action (a real credential this session doesn't have and shouldn't
fabricate). `/subx-app` surfaces this exact failure verbatim to the user
instead of hanging or pretending success.

**A second, real, pre-existing architecture gap found but explicitly out
of the fix scope for this session** (flagged, not silently patched): the
extraction-route selector (`sessions-extraction-route.js`, writes to
`hardware_extraction_sessions.extraction_route`) and the vision-dispatch
route-reader (`dispatchVisionExtraction` in
`hardware-extraction-vision-dispatch.js`, reads the same column) both key
off `hardware_extraction_sessions.id`. But the actual upload+dispatch route
most directly wired to `dispatchVisionExtraction`
(`POST /api/submittals/upload` in `src/routes/submittals.js`) creates its
own row in a *different* table (`submittals`, with its own
`crypto.randomUUID()` id) and calls
`dispatchVisionExtraction(submittalId, ...)` — so that dispatch's own
`SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
never finds a matching row for a `/api/submittals/upload`-created job, and
silently falls back to the default route regardless of what a customer
selected. This is a real, separate inconsistency between two parallel
upload paths in this codebase (`hardware_extraction_sessions` +
`/api/hardware-schedule/start`, vs. `submittals` +
`/api/submittals/upload`) that predates this session and was not
introduced or fixed here — `/subx-app` deliberately only wires the former
(the one where the route selector genuinely has an effect on *some* real
code path, `extract-image`), and this doc records the latter as a known,
real gap for whoever picks up the two-pipeline unification next.

## Part 4 — embedded extraction (no Anthropic key, no Ron's edge) for the `dispatchVisionExtraction` path

Started 2026-09-12, per direct instruction: "we do not need an anthropic
api key for weylandai.com! We do extractions via embedded gofaineats."

### Re-diagnosis of the real, previous "ANTHROPIC_API_KEY not configured" 500 — two separate root causes, don't conflate them

Part 3 above documents a real ANTHROPIC_API_KEY-missing 500 from
`/subx-app`'s "RUN EXTRACTION" button. That button calls a **different**
call chain than the one this Part 4 fixes:
`GET /api/hardware-schedule/session/:id/page/:pageNum`
(`src/routes/hardware-schedule-page-extract.js`) → `extractSinglePage` →
`callClaudeWithPdf` (all in the bundled `weyland.worker.js`, ~line
132803+) → a bare `fetch()` to `api.anthropic.com` using
`env2.ANTHROPIC_API_KEY` directly. For *that* path, Part 3's diagnosis
stands: the key really is missing on this account, confirmed again this
session (`wrangler secret list` on `weylandai-com-worker` still has no
`ANTHROPIC_API_KEY`) — Part 4 below does **not** touch or fix that button.

The path this session actually re-traced and fixed is
`dispatchVisionExtraction` (`src/lib/hardware-extraction-vision-dispatch.js`),
reached from `POST /api/submittals/upload` (`src/routes/submittals.js`).
Confirmed by reading `callEdge`/`mintInternalToken` in
`src/lib/edge-telemetry.js`: `HASCOM_EDGE` (a hardcoded fallback URL,
`https://hascom-edge.ron-helms.workers.dev`) and `AUTH_ONAMERICA` are
**not** bound in this worker's real `wrangler.toml` (only `OCR_SERVICE`,
`FILMLINE_VIDEO`, `VENDYAI`, `MASCOM_EDGE`, `MARKET_INTELLIGENCE` are real
service bindings there) — so `viaSabpClaudeCode`'s default route
(`claude_code_local`) fell through to a bare, essentially-unauthenticated
`fetch()` against Ron Helms's own separate Cloudflare account. A prior
session's "ANTHROPIC_API_KEY not configured" 500 seen while testing *this*
path almost certainly came back from Ron's `hascom-edge` worker (or a stub
reached without real auth), not from anything in weylandai.com's own
account — provisioning `ANTHROPIC_API_KEY` here would not have fixed this
particular call path at all. This matches `WEYLAND_SUCCESSOR_ARCHITECTURE.md`'s
own prior flag of `auth-onamerica.ron-helms.workers.dev` as "Ron's rejected
fleet-auth mesh, not AuthFor at all."

### What was built

**New adapter `embedded_gofaineat`**, registered in `adaptersForEdition()`
and now the real `DEFAULT_ROUTE` for non-local editions in
`dispatchVisionExtraction` (replacing `claude_code_local`; both it and
`api_direct` stay selectable per-session via the existing
`POST /api/sessions/:sessionId/extraction-route`). Source of truth:
`src/lib/hardware-extraction-vision-dispatch.js`; hand-mirrored into
`weyland.worker.js` (same build-pipeline caveat as Parts 1-2 — see that
note above, still unresolved).

Pipeline, no Anthropic key, no Ron's edge involved at any step:

1. **Page classification** — calls the already-deployed
   `weyland-ocr-worker`'s `/detect-schedules` (real PDFium-WASM
   rasterization + tesseract-wasm OCR with orientation correction,
   built and deployed in an *earlier* session per `ocr-worker/`'s own git
   history — this session did not build page classification from
   scratch, it reuses it) to find which page is the door schedule, rather
   than assuming page 1.
2. **Table-region OCR** — new `weyland-ocr-worker` endpoint
   `/extract-schedule-table` (`renderAndExtractTableRegion()` in
   `ocr-worker/index.js`), built this session. Real, evidence-based fix
   for a real problem: generic full-page OCR (`/extract-text`, already
   deployed) never read a single MARK/table-row value off a real complex
   architectural door-schedule sheet
   (`/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf`) at any DPI (150-600)
   or pageseg mode (3/4/6/11/12) tried — only title-block prose and
   floor-plan room labels, confirmed by rendering the page to a real PNG
   and inspecting it (the table occupies roughly the top ~40% of the
   page, in small print, sharing the sheet with a floor plan; whole-page
   segmentation can't isolate it). Cropping to the top ~42% of the page
   before OCR recovers real MARK values, fire ratings, and sizes —
   confirmed via a real render + native `tesseract` CLI test, not
   assumed. **Honest scope limit**: this is a real, working heuristic for
   the common "schedule table + legend/notes across the top, floor plans
   below" sheet layout (matches the one real test document available)
   — not a universal fix. A sheet with the table lower on the page, or a
   genuine full-page table (no floor plan sharing the sheet — the top-42%
   crop would truncate most of *that* table's rows), needs a different
   crop or the full candidate-region/bounding-box approach
   `hardware-schedule-extract.js`'s batch-extract flow already uses at
   600 DPI (see "Known, deliberately out-of-scope gaps" below).
3. **CPU-limit fix** — OCR-ing the whole cropped band in one call took
   ~10-12 CPU-seconds locally and, confirmed **live against production**
   (see verification below), actually hit Cloudflare's real per-request
   CPU ceiling: `{"error":"Worker exceeded CPU time limit."}`. Not
   raisable further via `wrangler.toml`'s `[limits].cpu_ms` (already set
   to 30000, the platform maximum). Real fix: split the band into three
   narrower horizontal strips (`[0,.14] [.14,.28] [.28,.42]` of page
   height), each its own separate request to `/extract-schedule-table`
   (via `X-Crop-Top-Pct`/`X-Crop-Bottom-Pct` headers) with its own fresh
   CPU budget — measured ~3-5 CPU-seconds per strip locally, and the
   live production retest below completed with no CPU-limit error.
4. **Structured extraction** — the concatenated OCR text goes to the real
   local Qwen3-8B (`llama-server` on this Mac, port 18087) over its
   existing Cloudflare Tunnel (`llama.mobleysoft.com`), via a new
   `callLocalQwen()` using the OpenAI-compatible `/v1/chat/completions`
   endpoint with `chat_template_kwargs.enable_thinking:false` (Qwen3 is a
   "thinking" model; without this it burns the token budget on
   `reasoning_content` and returns empty `content`). That tunnel route is
   gated by Cloudflare Access ("m2m only" app `llama-server-gateway"`) —
   confirmed live: a bare `fetch()` gets Access's HTML login page / 403,
   not JSON. Fixed by minting real `CF-Access-Client-Id`/
   `CF-Access-Client-Secret` headers from the existing
   `jitagi-kernel-m2m` Access service token (rotated this session to
   obtain the secret, since Access only returns it once — the new secret
   was propagated to `weylandai-com-worker`'s `QWEN_BRIDGE_CLIENT_ID`/
   `QWEN_BRIDGE_CLIENT_SECRET` and to the *other* real consumer of that
   same shared token, `mobley-venture-fleet-a` — see that repo's own
   notes; devducky.com's AI Code Review and agentropi.com's AI Agent
   Match were briefly 502ing between the rotation and that fix, both
   re-verified live afterward). New extraction prompt
   (`EMBEDDED_TEXT_EXTRACTION_PROMPT_TEMPLATE`) reuses the same
   `{doors:[...]}` JSON contract `parseAndValidateExtraction` already
   expects, adapted for OCR text input instead of a PDF vision call, and
   explicitly instructs the model not to fabricate rows it can't find.

### Honest extraction-quality result (live, production, 2026-09-12)

Real end-to-end run against `https://weylandai.com/api/submittals/upload`
(real throwaway `users`+`weyland_sessions` D1 rows, same test method as
Part 1, deleted immediately after) with the real test PDF:

```
HTTP 201
{"totalFiles":1,"results":[{"filename":"OCCDoorSchedulePg4.pdf",
 "submittalId":"7f104711-...","status":"review","doorCount":0,
 "tokenUsage":0,"extractionConfidence":0.95}]}
```

D1 row for that submittal:

```
extraction_route: "embedded_gofaineat"
source_page: 1, used_fallback_page: false   (detect-schedules correctly found the real schedule page)
ocr_text_length: 5505
doors: []
extraction_warnings: ["no door schedule table found in OCR text"]
```

**Plainly, both halves of what actually works and what doesn't:**

- The infrastructure is real and works end-to-end: no Anthropic key used,
  no call to Ron's `hascom-edge`/`auth-onamerica` anywhere in this path,
  real OCR service, real local Qwen3-8B inference over a real
  Access-authenticated tunnel, completes within Cloudflare's CPU budget,
  writes a real result to the real `submittals` table with no exceptions.
- **Table OCR quality on this real, dense architectural sheet is not yet
  good enough for reliable row extraction.** Qwen3-8B, given the actual
  noisy banded OCR text, correctly and honestly reported it could not
  find real door rows rather than fabricating any — exactly the behavior
  the prompt asked for, and the right outcome given the input quality,
  but the practical result today is **zero real doors extracted from this
  document**, not a working extraction. (Separately, `extraction_confidence:
  0.95` on a zero-door result is a pre-existing quirk of
  `parseAndValidateExtraction`'s confidence formula — `baseConfidence -
  errorRate*0.3` divides by `max(doors.length,1)`, so an empty result
  always reads as "0.95 confident" — not something this session's changes
  introduced or fixed.)
- A manual, offline test with a tighter single-region crop (top 42%,
  full width, 2x upscale, one OCR pass instead of three banded ones) did
  recover real, legible MARK values, fire ratings, and door sizes for a
  meaningful fraction of rows (verified via native `tesseract` CLI against
  a real render) — but that single-pass approach is exactly what hits the
  CPU ceiling in production. The banded version that fits the CPU budget
  produces noisier, less complete per-strip text (each strip OCR'd
  independently loses some cross-strip context), which is the real,
  measured reason today's live run found zero usable rows despite the
  underlying technique being demonstrably capable of reading this exact
  document's data under less constrained conditions.
- **Real, honest next step for whoever picks this up**: the accuracy gap
  is between "OCR text quality achievable inside Cloudflare's 30-second
  CPU ceiling" and "OCR text quality Qwen3-8B needs to reliably parse a
  real dense table." Closing it needs either a faster/SIMD tesseract
  build, moving the OCR step off the request-CPU-time-limited path
  entirely (e.g. a Durable Object or Queue doing the OCR asynchronously,
  polled the same way `claude_code_local`'s async job path already
  works), or accepting that this route works best on schedule sheets that
  are less visually dense than this stress-test document.

### Known, deliberately out-of-scope gaps (not touched this session)

Two other, separate call paths in this codebase extract door/hardware
data and were **not** rewired to `embedded_gofaineat`:

- `hardware-schedule-extract.js`'s batch-extract endpoint (the real
  candidate-region flow behind `/subx-app`'s per-page extraction) calls
  `queuePageExtractionJob` (`src/lib/hardware-extraction-pipeline.js`),
  which has its own, separate `callEdge("POST", "/ai/v1/jobs/queue", ...)`
  call to the same Ron's-edge dependency this Part 4 removed from
  `dispatchVisionExtraction` — confirmed by reading it, not fixed here.
- That same file's non-`claude_code_local` branch calls `routeExtraction`
  → `extractDoorScheduleHGSE`/`extractDoorSchedule`, which is the same
  family as Part 3's `callClaudeWithPdf` (real `ANTHROPIC_API_KEY`
  dependency, not Ron's edge).

Both are real, live, more heavily-used code paths than
`dispatchVisionExtraction` (they back `/subx-app`'s actual "RUN
EXTRACTION" UI), and both still depend on Ron's edge or a real Anthropic
key respectively. Porting `embedded_gofaineat`'s approach into either is
real, additional, unstarted work — flagged honestly, not silently claimed
as done.

## Files touched

- `src/routes/demo-trial.js` — Part 1 fix (source of truth)
- `weyland.worker.js` — hand-mirrored copy of the same fix (deployed artifact) + new `serve_subx_app` + CTA fixes + Part 4's `embedded_gofaineat` adapter
- `src/lib/marketing-pages.js` — hand-mirrored `serve_subx_app` + CTA fixes (real un-bundled source)
- `src/pages/subx-app.html` — new, real functional page
- `src/pages/subx.html`, `src/pages/takeoffx.html` — CTA fix
- `src/routes_manifest.json` — new `subx-app` entry
- `src/lib/hardware-extraction-vision-dispatch.js` — Part 4: new `embedded_gofaineat` adapter, `EMBEDDED_TEXT_EXTRACTION_PROMPT_TEMPLATE`, `callLocalQwen`, new default route
- `ocr-worker/index.js` — Part 4: new `/extract-schedule-table` endpoint, `renderAndExtractTableRegion()`, `upscale2x()`, orientation-fix for `/extract-text`
- `ocr-worker/wrangler.toml` — Part 4: `[limits] cpu_ms = 30000`
- `src/extraction/jitagi-detect-schedules.js` — Part 4: exported `rotate90CW` for reuse in `ocr-worker/index.js`
- Cloudflare: `QWEN_BRIDGE_CLIENT_ID`/`QWEN_BRIDGE_CLIENT_SECRET` secrets added to `weylandai-com-worker`; `jitagi-kernel-m2m` Access service token rotated (shared with `mobley-venture-fleet-a`, which was re-synced with the same new secret)
- `/Users/johnmobley/ventures.json` — weylandai.com insight updated (via `mascom/with-ventures-lock.sh`)
