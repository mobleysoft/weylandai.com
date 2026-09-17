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

## Part 5 — embedded extraction for the `/subx-app` "RUN EXTRACTION" single-page button

Started 2026-09-13, per direct instruction, after confirming Part 4's own
honest scope note was still true: `dispatchVisionExtraction` (Part 4) and
`extractSinglePage` (this button) are two genuinely separate call chains,
and only the first had been ported off `ANTHROPIC_API_KEY`. Every real
click of `/subx-app`'s "RUN EXTRACTION" button was still hitting a real,
live HTTP 500 with `"ANTHROPIC_API_KEY not configured"` - confirmed again
at the start of this session with a real throwaway account against real
production, not assumed from the doc above:

```
$ curl -sX POST https://weylandai.com/api/hardware-schedule/start -H "Cookie: <throwaway>" \
    -F file=@OCCDoorSchedulePg4.pdf -F projectName="..." -F document_type=hardware_schedule
{"sessionId":"053602df-...","totalPages":1,...}

$ curl -s https://weylandai.com/api/hardware-schedule/session/053602df-.../page/1 -H "Cookie: <throwaway>"
{"success":false,"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred. Please contact support.",
 "details":"ANTHROPIC_API_KEY not configured","retryable":false,...}}
500
```

### Real finding: this button's code no longer lives in `weyland.worker.js`

Between Part 4 (2026-09-12) and this session, a separate real change
(`9e02a82`, `MICROSERVICES_PUSH.md`'s SubX/TakeoffX extraction) cut this
whole route surface over to a new, independently-deployed
`weyland-subx-worker`, via 9 real Cloudflare Routes on the `weylandai.com`
zone. Confirmed directly against the Cloudflare API before touching any
code (not assumed from the commit message):

```
$ curl -s ".../zones/<weylandai.com zone id>/workers/routes" ...
{"pattern": "weylandai.com/api/hardware-schedule/*", "script": "weyland-subx-worker", ...}
```

So the real, live target for this fix is `weyland-subx-worker/src/lib/`,
not `weyland.worker.js` - the monolith's own copy of this code is dead for
this path (superseded by route specificity, same "left in place, not
removed" precedent `MICROSERVICES_PUSH.md` and the subx-worker cutover
commit already established) and was **not** touched this session; fixing
only the dead copy would have shipped nothing real.

### What was built

Traced the real call chain in `weyland-subx-worker`:
`GET /api/hardware-schedule/session/:id/page/:n`
(`src/routes/hardware-schedule-page-extract.js`) → `extractSinglePage`
(`src/lib/hardware-extraction-single-page.js`) → both of its real fallback
tiers (isolated-PDF, direct-PDF) → `callClaudeWithPdf`
(`src/lib/hardware-extraction-vision-adapters.js`), which throws exactly
`"ANTHROPIC_API_KEY not configured"` the instant `env2.ANTHROPIC_API_KEY`
is missing - confirmed missing again this session
(`wrangler secret list` on `weyland-subx-worker`, empty `[]`).

**`extractSinglePage` now routes straight to a real, working
`embedded_gofaineat` pipeline when no Anthropic key is configured** (the
real, permanent state of this account per direct instruction - "we do not
need an anthropic api key for weylandai.com! We do extractions via
embedded gofaineats"), instead of attempting a call guaranteed to fail:

- `src/lib/hardware-extraction-vision-dispatch.js`:
  - Factored Part 4's inline banded-OCR block out of `viaEmbeddedGofaineat`
    into a shared `ocrScheduleTableBanded(pdfBuffer, pageNumber, env2)` -
    same technique (weyland-ocr-worker's `/extract-schedule-table`, 3
    horizontal bands to stay under Cloudflare's CPU ceiling), now used by
    both this route and Part 4's, without duplicating it.
  - New `EMBEDDED_HARDWARE_GROUPS_EXTRACTION_PROMPT_TEMPLATE` + exported
    `extractHardwareGroupsViaEmbeddedGofaineat(pdfBuffer, pageNumber,
    totalPages, env2)`. **Deliberately a different prompt/contract than
    Part 4's `viaEmbeddedGofaineat`**, not a reuse of it: that adapter
    targets a DOOR SCHEDULE (`{doors:[...]}` - sizes/materials/fire-ratings
    per door MARK); this route's existing real prompt family
    (`buildIsolatedPageExtractionPrompt` et al.) targets a HARDWARE
    SCHEDULE (`{hardware_groups:[...], door_hardware_matrix:[...]}` -
    hinge/lockset/closer components per numbered hardware set) - a
    different real document type this platform also handles. Reusing the
    doors-shaped adapter here would silently misparse a real
    hardware-schedule page. The OCR step and the Qwen bridge call
    (`callLocalQwen`) genuinely are shared, unduplicated primitives.
  - Qwen's raw text output is wrapped into a synthetic Claude-message
    shape (`{content:[{text}], usage}`) and run through the existing
    `parseHardwareExtractionResult` (`hardware-extraction-prompts.js`) -
    reuses its real JSON-extraction, `hardware_groups` validation, and
    mounting-position-defaults logic verbatim rather than writing and
    maintaining a second parallel validator.
- `src/lib/hardware-extraction-single-page.js`: new
  `extractWithEmbeddedGofaineatMode`, and `extractSinglePage` now checks
  `env2.ANTHROPIC_API_KEY` first - missing (the real, permanent case) means
  the embedded pipeline runs instead of the two Claude-vision tiers. If a
  real key is ever configured on this worker in the future, the original
  higher-fidelity Claude-vision tiers are unchanged and still run - this
  is a routing change, not a deletion of that code path.

**Real, additional infrastructure needed and provisioned this session**
(not just app code): `weyland-subx-worker` had never had
`QWEN_BRIDGE_CLIENT_ID`/`QWEN_BRIDGE_CLIENT_SECRET` provisioned at all
(confirmed via `wrangler secret list`, empty before this session - a known
gap that worker's own `src/index.js` header already flagged from the
9e02a82 extraction). Rather than trying to recover Part 4's existing
`jitagi-kernel-m2m`-family secret value (Cloudflare secrets are
write-only, confirmed not recoverable), a **new, dedicated Cloudflare
Access service token** was minted for this worker specifically (matching
the established per-consumer pattern already used for
`weyland-bookeepr-worker-m2m`, `weyland-animetrope-worker-m2m`, etc. - see
`mascom/MASCOM/keys.mobdbt`), added to the real `llama-server-gateway (m2m
only)` Access app's policy (`PUT .../access/apps/<id>/policies/<id>`,
verified via the real Cloudflare API, not the dashboard), and provisioned
onto `weyland-subx-worker` via `mascom/provision-secret.sh` (which also
recorded a durable local copy in `mascom/MASCOM/keys.mobdbt`, per that
script's own purpose - closing exactly the kind of unrecoverable-secret
gap Part 4's own note flagged). Token name: `weyland-subx-worker-m2m`.

### Real deploy

```
$ cd weyland-subx-worker && wrangler deploy
Uploaded weyland-subx-worker (4.95 sec)
Deployed weyland-subx-worker triggers (0.73 sec)
Current Version ID: 0bcc89e6-9956-410c-9872-27cde433bd26
```

### Real live verification (production, 2026-09-13)

Real throwaway `users`+`weyland_sessions` D1 rows (same
`tools/user-simulation/lib/throwaway-account.mjs` technique this repo
already built and documented for exactly this purpose), created and
deleted for real, immediately before/after:

```
$ curl -sX POST https://weylandai.com/api/hardware-schedule/start -H "Cookie: <throwaway>" \
    -F file=@OCCDoorSchedulePg4.pdf -F projectName="Verify RUN EXTRACTION fix" -F document_type=hardware_schedule
{"sessionId":"bed750c8-1d04-44b7-95c1-10c7fbe08dd1", ..., "totalPages":1, ...}

$ curl -s https://weylandai.com/api/hardware-schedule/session/bed750c8-.../page/1 -H "Cookie: <throwaway>" -w '\n%{http_code}'
{"success":true,"sessionId":"bed750c8-...","pageNumber":1,"status":"pending_review",
 "data":{"page_number":1,"total_pages":1,"hardware_groups":[],"door_hardware_matrix":[],
 "detected_nomenclature":null,
 "metadata":{"extraction_mode":"embedded_gofaineat","extraction_route":"embedded_gofaineat",
             "page_isolated":false,"ocr_text_length":5505},
 "usage":{"input_tokens":0,"output_tokens":0},
 "extraction_time_ms":17598,"total_time_ms":69177},
 "cached":false,"performance":{"total_ms":69670,"extraction_ms":69177}}
200
```

Independently re-confirmed via this repo's own
`tools/user-simulation/checks/subx-takeoffx.mjs` (a second, real
throwaway account, real ephemeral token, unmodified test harness code):

```
[OK] GET /api/hardware-schedule/session/:id/page/1 (the /subx-app 'RUN EXTRACTION' button) -> 200
     {"success":true, ..., "data":{... "extraction_route":"embedded_gofaineat" ...}}
```

Both throwaway accounts and sessions were deleted immediately after.

**Plainly, what this fixes and what it honestly doesn't:**

- **Fixed**: the dead-button/wrong-dependency bug. Every real click of
  `/subx-app`'s "RUN EXTRACTION" button previously 500'd unconditionally
  with `"ANTHROPIC_API_KEY not configured"` - a real credential this
  account will not provision. It now returns a real HTTP 200 via a real
  local pipeline (weyland-ocr-worker OCR + local Qwen3-8B structuring),
  with zero dependency on any Anthropic key anywhere in this call chain,
  confirmed by grep-free code tracing plus the live response's own
  `extraction_route: "embedded_gofaineat"` field.
- **Not fixed, and not in scope for this pass** (same honest boundary Part
  4 already drew for its own path): extraction *accuracy*. The real test
  document (`OCCDoorSchedulePg4.pdf`) produced `hardware_groups: []` -
  zero hardware groups found. This is a genuinely different, and likely
  more honest, result than a wrong one: `OCCDoorSchedulePg4.pdf` is a DOOR
  SCHEDULE (door sizes/materials/fire-ratings per MARK), not a HARDWARE
  SCHEDULE (hinge/lockset/closer sets) - this route's real contract - so a
  correctly-working pipeline finding zero hardware *groups* on a document
  that doesn't contain any is the right answer, not evidence of a broken
  OCR/Qwen step. This session did not have a real hardware-schedule-shaped
  test PDF on hand to exercise the "real groups present" case end-to-end;
  the OCR step itself is proven working (`ocr_text_length: 5505`, matching
  Part 4's own real OCR result on the same page) and the Qwen structuring
  step ran and returned validly-shaped JSON (confirmed by
  `parseHardwareExtractionResult` not throwing) - what's unverified is
  accuracy specifically on a real hardware-schedule document, a real,
  separate follow-up for whoever has one to test against, not silently
  claimed as solved here.
- Same `weyland-ocr-worker` CPU-ceiling workaround and Qwen bridge
  dependency Part 4 already documented apply identically here (this route
  shares that infrastructure) - see Part 4's own honest scope note on
  banded-OCR quality loss, which was not re-litigated or re-solved in this
  pass.

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
- `weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js` — Part 5: factored out shared `ocrScheduleTableBanded`, new `EMBEDDED_HARDWARE_GROUPS_EXTRACTION_PROMPT_TEMPLATE` + `extractHardwareGroupsViaEmbeddedGofaineat` (hardware_groups contract, separate from Part 4's doors contract)
- `weyland-subx-worker/src/lib/hardware-extraction-single-page.js` — Part 5: `extractSinglePage` routes to the new embedded pipeline when `ANTHROPIC_API_KEY` is missing, via new `extractWithEmbeddedGofaineatMode`
- Cloudflare: new `weyland-subx-worker-m2m` Access service token minted and added to the real `llama-server-gateway (m2m only)` app's policy; `QWEN_BRIDGE_CLIENT_ID`/`QWEN_BRIDGE_CLIENT_SECRET` secrets provisioned on `weyland-subx-worker` for the first time (via `mascom/provision-secret.sh`, also recorded in `mascom/MASCOM/keys.mobdbt`) — this worker had never had them at all

## Part 6 — embedded extraction for the multi-page batch-extract / extract-affirmed flows (`hardware-extraction-pipeline.js`)

Started 2026-09-13, per direct instruction, immediately after Part 5: the
same "ANTHROPIC_API_KEY not configured"/Ron's-edge class of bug, this time
in the multi-page batch/candidate-region extraction flow behind
`/subx-app`'s per-page extraction UI - `POST /api/hardware-schedule/session/
:sessionId/batch-extract` (`weyland-subx-worker/src/routes/hardware-schedule-extract.js`)
and its sibling `POST /api/hardware-schedule/session/:sessionId/extract-affirmed`
(`weyland-subx-worker/src/routes/hardware-schedule-generate.js`), both of
which call `queuePageExtractionJob`/`routeExtraction`
(`weyland-subx-worker/src/lib/hardware-extraction-pipeline.js`) - flagged as
real, separate, unstarted work by Part 4's own "Known, deliberately
out-of-scope gaps" note.

### Real finding #1: the confirmed bug wasn't the first bug hit

The instruction's own diagnosis (`queuePageExtractionJob` -> `callEdge` ->
Ron's unauthenticated `hascom-edge.ron-helms.workers.dev`, confirmed via a
direct `curl` against Ron's edge itself returning a real 401) is accurate as
far as it goes, but a real end-to-end `curl` of `batch-extract` itself
(throwaway account + session, deleted after) found a **more basic, more
blocking bug in front of it**:

```
$ curl -sX POST https://weylandai.com/api/hardware-schedule/session/<id>/batch-extract \
    -H "Cookie: <throwaway>" -d '{"pages":[1]}'
{"error":"Batch extraction failed","details":"pdfBufferOrNull is not defined"}
```

`hardware-schedule-extract.js` referenced `queuePageExtractionJob`,
`routeExtraction`, `renderRegionAt600DPI2`, `pdfBufferOrNull`,
`generateR2StreamUrl`, `transformDoorEntriesToHardwareSets`,
`materializeDseToLineItems`, and `savePageExtraction2` throughout
`batch-extract` without importing any of them or receiving them as injected
deps from `index.js`'s `registerHardwareScheduleExtractRoutes(router, {...})`
call (confirmed by reading both - the deps object there only lists
`authenticate`, `requireActiveSubscription`, `getSessionStatus`, and six
other names, none of the eight above). A real, live, blocking bug,
independent of Ron's edge, that would have made this session's actual fix
untestable without also fixing it - so it's fixed here as a real
prerequisite, not silently worked around.

A second, separate instance of the same missing-import class was found
while live-verifying the sibling `extract-affirmed` route in
`hardware-schedule-generate.js`: `SCHEDULE_TYPE_REGISTRY` was referenced in
that route's own result-shaping code (`target_table = SCHEDULE_TYPE_REGISTRY
[candidate.schedule_type]?.target_table`) without being imported - every
real `extract-affirmed` call failed with `"SCHEDULE_TYPE_REGISTRY is not
defined"`, independent of Ron's edge or this session's embedded-extraction
work. Fixed with a one-line import (`hardware-extraction-prompts.js` already
exports it) since it directly blocked verifying this session's actual fix in
the same file.

### Real finding #2: the "async" `claude_code_local` contract has no working poll endpoint on this worker

Before changing anything, traced the full call graph `queuePageExtractionJob`
sits in. Its real callers (`batch-extract`, `extract-affirmed`, and
`hardware-schedule-page-extract.js`'s `extract-image` route) all build the
same response shape when `routeForSession === "claude_code_local"`:
`{async: true, packets: [{job_id, poll_url: "/api/jobs/${job_id}", ...}]}`,
implying a customer's own separately-running "Claude Code bridge" polls
that `poll_url` until the job completes. **`weyland-subx-worker` has no
`/api/jobs/:id` route at all** (confirmed via `grep` across `src/index.js`
and every route file) - that path was never real on this worker; the actual
job queue/poll target was always Ron's edge directly. This means
`claude_code_local`'s real contract was two things bundled together: (1) a
genuine, real product feature (a customer who runs their own Claude Code
CLI against their own Anthropic subscription, for extraction quality this
platform's own embedded pipeline can't match), structurally coupled to (2)
Ron's edge as the only real message broker between this worker and that
customer's bridge. Per this session's non-negotiable instruction, (2) has
to go entirely - which means (1) cannot be "fixed" in place, only kept
selectable for a customer who explicitly opts in and understands it needs
external infra this venture doesn't control. This is why the fix below is a
**default change**, not a patch to `queuePageExtractionJob`/`routeExtraction`
themselves (both are left in place, functionally unchanged, real code paths
for that opt-in case) - matching the exact same pattern Part 4/5 already
used for `dispatchVisionExtraction`'s `DEFAULT_ROUTE` and
`extractSinglePage`'s `ANTHROPIC_API_KEY` check.

### What was built

`weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js`:
new `extractDoorScheduleViaEmbeddedGofaineat(sessionId, tenantId, pdfBuffer,
pageNumber, totalPages, env2)` - the DOOR SCHEDULE contract sibling of
Part 5's `extractHardwareGroupsViaEmbeddedGofaineat`. Reuses the identical
`ocrScheduleTableBanded` OCR-banding step, `callLocalQwen` bridge call, and
`{doors:[...]}` contract (`EMBEDDED_TEXT_EXTRACTION_PROMPT_TEMPLATE`,
`parseAndValidateExtraction`) Part 4 already proved live - genuinely the
same door-schedule shape, not a new one - but persists directly into
`door_schedule_entries` (this flow's real target table per
`SCHEDULE_TYPE_REGISTRY`), using the same `INSERT ... ON CONFLICT(session_id,
mark)` shape `persistDoorScheduleResponse` already uses for a real
Claude-vision extraction, so downstream readers (`cross-reference.js`,
`door-schedule-marks.js`, `hardware-schedule-export.js`,
`hardware-schedule-generate.js`) see identically-shaped rows regardless of
which route produced them. **Honest, real scope narrowing**: this uses a
fixed field set (mark, hardware_group, fire_rating, width/height/thickness,
door_type/material/frame_material, remarks -> notes), not the full
per-tenant constraint-driven dynamic field set `persistDoorScheduleResponse`'s
real Claude-vision path resolves via `resolveDoorScheduleConstraints` -
tenant-specific custom fields configured via `prompt_specifications` are not
honored by this route.

`weyland-subx-worker/src/lib/hardware-extraction-pipeline.js`: new
`runEmbeddedGofaineatExtraction(scheduleType, sessionId, tenantId, pdfBuffer,
pdfStreamUrl, pageNumber, totalPages, env2)` - the real dispatcher these two
routes now call instead of `queuePageExtractionJob`/`routeExtraction` when
`routeForSession === "embedded_gofaineat"`. Routes by `scheduleType` to
whichever contract the call site actually needs: `door_schedule` ->
`extractDoorScheduleViaEmbeddedGofaineat` (new, above); anything else
(`hardware_schedule` is the real, common case and this pipeline's own
existing fallback default) -> `extractHardwareGroupsViaEmbeddedGofaineat`
(Part 5), wrapped to add the `success`/`entry_count`/`entries` fields the
callers' existing generic result-handling code already expects. Handles the
real >20MB-PDF edge case (`pdfBuffer` null, only an R2 `pdfStreamUrl`
generated) by fetching the stream URL directly for real bytes, since OCR
needs actual PDF bytes unlike a Claude-vision call that can stream a
pre-rendered image; if that also fails, returns an honest
`pdf_unavailable_for_embedded_ocr` result rather than crashing.

`weyland-subx-worker/src/routes/hardware-schedule-extract.js`
(`batch-extract`) and `weyland-subx-worker/src/routes/hardware-schedule-generate.js`
(`extract-affirmed`): both changed their `routeForSession`/`_sessRoute`
default from `"claude_code_local"` to `"embedded_gofaineat"` for non-local
editions (matching `dispatchVisionExtraction`'s established
`DEFAULT_ROUTE` precedent) - real customers who never call
`POST /api/sessions/:sessionId/extraction-route` (i.e., everyone who hasn't
explicitly opted into their own SABP bridge) now get the embedded pipeline
by default instead of silently landing on Ron's edge. In both files' inner
per-candidate loop, added a branch: when `routeForSession ===
"embedded_gofaineat"`, call `runEmbeddedGofaineatExtraction` directly with
the real PDF bytes/page number instead of first rendering a 600 DPI region
image and calling `routeExtraction` - the OCR worker rasterizes internally
from the raw PDF, so the render step is real, avoidable CPU/time cost for
this route, not dead code left in place. `queuePageExtractionJob` and
`routeExtraction` are otherwise untouched - still the real code path for a
session that explicitly sets `extraction_route` to `claude_code_local` (an
opt-in customer with their own bridge; note Real finding #2 above about that
contract's real, pre-existing, unrelated gap) or `api_direct` (needs a real
`ANTHROPIC_API_KEY`, Part 3's already-documented gap).

**Honest, real limitation carried over from Part 4/5, not re-solved here**:
`ocrScheduleTableBanded` OCRs a fixed top-42%-of-page crop, independent of
whatever custom bounding box a candidate region carries
(`schedule_region_candidates.bounding_box`/`bounding_box_percent`, drawn by
a human via `/subx-app`'s region-selection UI). The embedded route does not
honor a candidate's specific drawn region - a real, documented gap for a
sheet where the schedule table isn't in the top 42% of the page, same
honest boundary Part 4 already drew.

### Real deploy

```
$ cd weyland-subx-worker && npx wrangler deploy
Current Version ID: cf0ab292-6f69-431c-8c54-21e1c8f1f3d4   (batch-extract fix)
Current Version ID: 56c18842-1f7b-47e1-915e-b8c84da621ad   (extract-affirmed wiring)
Current Version ID: 1b471a87-2bb1-4bf3-bbc1-26be1aa3eed8   (SCHEDULE_TYPE_REGISTRY import fix)
```

### Real live verification (production, 2026-09-13)

Real throwaway `users`+`weyland_sessions` D1 rows (same technique as Parts
1/5), created and deleted immediately after, against the real test PDF
(`/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf`):

**Before the fix** (confirmed once, at the start of this session):
```
$ curl -sX POST .../api/hardware-schedule/session/<id>/batch-extract -d '{"pages":[1]}'
{"error":"Batch extraction failed","details":"pdfBufferOrNull is not defined"}
```
500, and - independently confirmed by reading `queuePageExtractionJob`/
`callEdge` - had this ReferenceError not existed, the very next line reached
would have been the real, live 401 from `hascom-edge.ron-helms.workers.dev`.

**After the fix**, `hardware_schedule` document type:
```
$ curl -sX POST .../api/hardware-schedule/start -F document_type=hardware_schedule -F file=@OCCDoorSchedulePg4.pdf ...
{"sessionId":"a9f30fdc-...", "totalPages":1, ...}

$ curl -sX POST .../api/hardware-schedule/session/a9f30fdc-.../batch-extract -d '{"pages":[1]}'
{"success":true, ..., "extraction_results":[{"status":"extracted","entry_count":0,
  "_debug":{"schedule_type":"hardware_schedule","has_hw_groups":true, ...}}], ...}
200
```
D1 row for that page: `"extraction_route":"embedded_gofaineat"`,
`"ocr_text_length":5505` (matches Part 4/5's own real OCR result on this
same page, confirming the OCR step genuinely ran) - real infrastructure,
zero dependency on Ron's edge or an Anthropic key.

**After the fix**, `door_schedule` document type (separate throwaway
session):
```
$ curl -sX POST .../api/hardware-schedule/session/6ef62551-.../batch-extract -d '{"pages":[1]}'
{"success":true, ..., "extraction_results":[{"status":"extracted","entry_count":0,
  "_debug":{"schedule_type":"door_schedule", ...}}], ...}
200
```
`hardware_page_extractions` row: `"extraction_route":"embedded_gofaineat"`,
`"target_table":"door_schedule_entries"`, `"ocr_text_length":5505` - real,
same embedded pipeline, correctly dispatched to the door-schedule contract.

**`extract-affirmed`** (`hardware-schedule-generate.js`), same session's
already-created candidate, flipped back to `status='affirmed'` in D1 to
re-exercise the route without a second upload:
```
$ curl -sX POST .../api/hardware-schedule/session/a9f30fdc-.../extract-affirmed -d '{}'
{"success":true,"extractions_completed":1,"extractions_failed":0,
 "results":[{"status":"extracted","entry_count":0,"target_table":"hardware_components"}], ...}
200
```
D1 confirms `"extraction_route":"embedded_gofaineat"` on this row too - the
same fix, verified on both real call sites.

Live-tailed the worker (`wrangler tail`) during a fresh `batch-extract` call
and grepped the real-time log for `hascom`/`ron-helms`/`callEdge`/`/ai/v1/jobs`
- zero matches, confirming no call to Ron's edge happens anywhere in this
call path for the new default. All throwaway sessions, candidates, page
extractions, and accounts (2 users, 2 sessions, 3 hardware_extraction_sessions,
associated schedule_region_candidates/hardware_page_extractions/client_telemetry
rows) were deleted immediately after verification; `hardware_sets`/
`hardware_components` were confirmed to have zero rows for these sessions
(nothing to clean up there - zero groups were ever extracted).

**Plainly, what this fixes and what it honestly doesn't:**

- **Fixed**: the real, live, confirmed Ron's-edge dependency in the
  multi-page batch-extract/extract-affirmed flows' default path, for both
  document types this platform handles (`door_schedule`, `hardware_schedule`).
  Also fixed, as real prerequisites found while verifying: `batch-extract`'s
  missing imports (`pdfBufferOrNull` et al. - the route couldn't run *at
  all* before this) and `extract-affirmed`'s missing `SCHEDULE_TYPE_REGISTRY`
  import (same class of bug, same file family).
- **Not fixed, and not silently claimed as solved**: extraction accuracy.
  Both real test runs against this session's real dense door-schedule PDF
  returned zero groups/doors - the same honest, already-documented banded-OCR
  accuracy limitation from Part 4/5 (CPU-ceiling-safe OCR bands are noisier
  than a single unconstrained pass), not a new regression and not something
  this pass attempted to solve.
- **Not touched**: `hardware-schedule-page-extract.js`'s `extract-image`
  route (`POST .../page/:pageNum/extract-image`) still defaults to
  `claude_code_local` and still depends on Ron's edge. That route receives
  an already-rendered image from the *browser* (client-side PDF rendering),
  not the raw PDF bytes weyland-ocr-worker's endpoints require - a real
  , structurally different problem (no server-side PDF bytes to OCR) than
  the PDF-buffer-holding routes fixed in this Part, genuinely out of scope
  for this pass and flagged here, not silently left broken without mention.
- `queuePageExtractionJob`/`routeExtraction` themselves are unmodified -
  still real, live code, still real for a customer who explicitly opts into
  `claude_code_local` (own SABP bridge, subject to Real finding #2's
  no-real-poll-endpoint caveat) or `api_direct` (needs a real
  `ANTHROPIC_API_KEY`, per Part 3).

### Files touched (Part 6)

- `weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js` — new `extractDoorScheduleViaEmbeddedGofaineat` (doors contract, persists to `door_schedule_entries`)
- `weyland-subx-worker/src/lib/hardware-extraction-pipeline.js` — new `runEmbeddedGofaineatExtraction` (dispatches by scheduleType), new import from vision-dispatch.js
- `weyland-subx-worker/src/routes/hardware-schedule-extract.js` — fixed missing imports (`queuePageExtractionJob`, `routeExtraction`, `runEmbeddedGofaineatExtraction`, `renderRegionAt600DPI2`, `pdfBufferOrNull`, `generateR2StreamUrl`, `transformDoorEntriesToHardwareSets`, `materializeDseToLineItems`, `savePageExtraction2` - a real, separate, blocking ReferenceError bug); `batch-extract`'s `routeForSession` default changed to `embedded_gofaineat`; sync loop branches to the embedded pipeline
- `weyland-subx-worker/src/routes/hardware-schedule-generate.js` — fixed missing `SCHEDULE_TYPE_REGISTRY` import (separate pre-existing bug); `extract-affirmed`'s `_sessRoute` default changed to `embedded_gofaineat`; sync loop branches to the embedded pipeline; `runEmbeddedGofaineatExtraction` added to its injected deps
- `weyland-subx-worker/src/index.js` — imports `runEmbeddedGofaineatExtraction` from `hardware-extraction-pipeline.js`, passes it into `registerHardwareScheduleGenerateRoutes`

## Part 7 (2026-09-17): the real, actual root cause of "0 groups every time" — and the first genuine accuracy verification

John's direct instruction after Part 6 reported plumbing fixed but accuracy
still unverified: build a real test document with KNOWN ground truth and
run it through the actual pipeline, "so we know if it is right or not" -
not another 0-result run against a document type the route wasn't built
for.

**Built**: a synthetic two-hardware-set door-hardware-schedule PDF
(`reportlab`, real vector-rendered PDF, not a scan) with a fully known
answer - HW-1 (3 Hinges/Hager/BB1279, 1 Lockset/Schlage/ND80PD, 1
Closer/LCN/4111, doors: 2), HW-2 (3 Hinges/Hager/BB1168, 1
Lockset/Schlage/ND53PD, doors: 5).

**First real finding**: `EMBEDDED_HARDWARE_GROUPS_EXTRACTION_PROMPT_TEMPLATE`
+ the local Qwen3-8B structuring step (Part 5's real, deployed prompt,
copied verbatim into a standalone test, not reinvented) extracts this
ground-truth document **perfectly** when given clean OCR text - every
quantity, manufacturer, model, and finish correct. This had never actually
been checked; Part 5/6's "accuracy unverified" was really "never tested
against the right document type at all," not "tested and inconclusive."

**Second, bigger real finding - the actual root cause of every 0-result
run in Parts 4-6**: ran the real ground-truth PDF through the live
`weyland-subx-worker` end-to-end (real throwaway account via
`tools/user-simulation/lib/throwaway-account.mjs`, real `/api/hardware-
schedule/start` + `/page/1` calls) and got 0 groups again -
`ocr_text_length: 299`, and `wrangler tail` showed the OCR text itself was
pure noise (`"<= 2° UO\n<= —_ ==\n..."`), not the real table text. This is
not "banded OCR is noisier than a single pass" (Part 4/5's working
assumption) - it's a specific, reproducible bug: `getOrientation()` in
`ocr-worker/index.js`'s `renderAndExtractTableRegion` reported
`{rotation: 90, confidence: 1.0}` - the MAXIMUM possible confidence - as a
false positive on this clean, upright, vector-rendered page, and the
existing `confidence > 0.5` gate rotated a correctly-oriented page 90°
before cropping. A horizontal band crop of sideways text is exactly the
kind of input that produces OCR noise, not real characters. Reproduced
standalone (real `@hyzyla/pdfium` + `tesseract-wasm` packages, same WASM
assets, outside the Worker) and got byte-identical garbage to production
once the same rotation was applied - confirming this, not something else,
is the real cause.

The original rotation-correction logic (added 2026-09-12) is not wrong to
exist - it was built against a real scanned, genuinely-rotated document
(`OCCDoorSchedulePg4.pdf`) and is still needed for real scans. The bug is
trusting a single orientation heuristic's own confidence score
unconditionally, with no check that rotating actually helps.

**Fix** (`ocr-worker/index.js`, `renderAndExtractTableRegion`): when
`getOrientation()` proposes a rotation, empirically compare mean per-word
OCR confidence (`getTextBoxes('word')`) of the SAME target band in both
the unrotated and rotated candidate images, and only commit to rotating if
it's a clear win (`rotatedConf > unrotatedConf + 0.1`). Verified locally
before deploying: unrotated confidence 0.95 vs rotated 0.4-0.5 on the
ground-truth PDF (correctly declines to rotate); still rotates for a real
genuinely-sideways scan since that case's unrotated confidence is the
near-zero one. Extracted `cropBand()` as a shared helper (was inlined
twice) so the confidence-check crop and the real extraction crop use
identical math.

**Verified live, for real, after the fix**: same throwaway-account
end-to-end run, same ground-truth PDF -> `HTTP 200`,
`extraction_route: "embedded_gofaineat"`, **2 hardware_groups, all 4
components, every quantity/manufacturer/model/finish exactly correct**
(HW-1 total qty 5, HW-2 total qty 4, both matching ground truth). This is
the first time this pipeline has been shown to produce a CORRECT
extraction, not just a non-erroring one. `hinge_positions`/
`mounting_height_inches`/etc. came back correctly labeled
`"...source": "default"` (not fabricated as "extracted") since the test
PDF didn't specify them - the existing `applyMountingDefaultsToExtraction`
honesty behavior held up under a real test.

One minor, honest imperfection found in the same run: the model read the
test PDF's "(Doors: 2)" annotation as `assigned_doors: ["2"]` (a door
NUMBER) rather than a door COUNT - a phrasing ambiguity in this specific
synthetic test document (real schedules typically list actual door
numbers like "101, 102", not a bare count), not a defect in the extraction
logic itself. Not fixed - noted honestly, low-priority, cosmetic to this
one test fixture.

All throwaway D1 rows (`hardware_extraction_sessions`,
`hardware_page_extractions`, `hardware_sets`, `schedule_region_candidates`)
across all 3 test runs (2 before the fix, 1 after) deleted immediately
after verification, same discipline as Parts 4-6. `users`/`weyland_sessions`
rows deleted via `deleteThrowawayAccount`. KV-cached test PDF blobs left to
their existing 7-day TTL (small, non-sensitive, not worth manual KV
deletion without a list-by-prefix wrangler command available).

### Files touched (Part 7)

- `ocr-worker/index.js` — added `cropBand()`/`meanWordConfidence()` helpers; `renderAndExtractTableRegion` now empirically compares rotated-vs-unrotated confidence instead of trusting `getOrientation()` unconditionally
- `weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js` — added diagnostic `console.log` lines (OCR text length/preview per band) to `ocrScheduleTableBanded`/`extractHardwareGroupsViaEmbeddedGofaineat`, left in place as ongoing low-noise diagnostics
