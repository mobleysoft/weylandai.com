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

## Files touched

- `src/routes/demo-trial.js` — Part 1 fix (source of truth)
- `weyland.worker.js` — hand-mirrored copy of the same fix (deployed artifact) + new `serve_subx_app` + CTA fixes
- `src/lib/marketing-pages.js` — hand-mirrored `serve_subx_app` + CTA fixes (real un-bundled source)
- `src/pages/subx-app.html` — new, real functional page
- `src/pages/subx.html`, `src/pages/takeoffx.html` — CTA fix
- `src/routes_manifest.json` — new `subx-app` entry
- `/Users/johnmobley/ventures.json` — weylandai.com insight updated (via `mascom/with-ventures-lock.sh`)
