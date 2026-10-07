# weylandai.com user-simulation harness

A real, reusable Node.js tool that exercises weylandai.com's real
user-facing products against **real production** (`https://weylandai.com`
by default) with real requests, and writes an honest, structured report of
what actually works, what's broken, and what's simply missing.

Built 2026-09-12 per direct instruction, after a session of piecemeal
manual investigation found real, significant gaps (SubX/TakeoffX's
extraction producing 0 real doors, MarketX silently 502ing, SightX's own
copy admitting "demo"/"hardcoded") one at a time. This tool exists so that
next week's session (and every session after) can get the same honest
picture in one command instead of re-discovering it by hand.

## Run it

```bash
cd /Users/johnmobley/weylandai.com
node tools/user-simulation/run.mjs
```

Takes ~30-90 seconds (it makes real HTTP requests to production, a real
HuntX scrape against live TxDOT/CA-OPSC government feeds, and a real
D1 write+delete cycle for the throwaway test account). No flags needed for
the default, most-useful run.

Optional: point it at a different base URL (e.g. a local `wrangler dev`,
if bindings/secrets are ever set up to make that meaningful):

```bash
WEYLAND_BASE_URL=http://localhost:8787 node tools/user-simulation/run.mjs
```

### What it needs to actually run

- `wrangler` CLI logged into the same Cloudflare account as this repo's
  `weyland_db` D1 database (already the case in this repo's normal dev
  environment - `npx wrangler whoami` should show the right account).
- Network access to `weylandai.com`, `authfor.com`, and the live
  government open-data APIs HuntX calls (TxDOT, CA OPSC).
- The real test fixture PDFs already checked in outside this repo at
  `/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf` (used for the SubX/
  TakeoffX extraction-quality check). If that path ever moves, update
  `REAL_TEST_PDF` in `lib/http.mjs`.

## What it actually does (no shortcuts, no root-path-only checks)

For each product, this drives the REAL entry point a customer would use,
not just a health-check ping:

| Product | Real flow exercised |
|---|---|
| SubX / TakeoffX | Marketing pages -> `/subx-app` -> real AuthFor ephemeral trial -> demo-trial clone -> real PDF upload through BOTH real extraction pipelines (`/api/submittals/upload`'s `embedded_gofaineat` adapter, and `/api/hardware-schedule/start` -> `page/1`'s Anthropic-key-dependent path) -> checks real `doorCount` in the response, not just HTTP status. |
| PropX | Marketing page + its CTA's real destination -> probes for any app page (finds none) -> real backend call to `/api/proposals/generate` with both an invalid and a real submittal reference -> a direct read-only D1 query on `door_entries` to check whether ANY real proposal-ready data exists anywhere in the system. |
| HuntX | Live page's own inline JS -> real `/api/hunt/refresh` (a real scrape of live TxDOT + CA OPSC government open-data feeds) -> real `/api/hunt/opportunities` list, checking the real upserted count. |
| MeetingX | Live page -> confirms its own self-disclosed "multi-party transport not yet claimed" copy -> checks whether a real, already-deployed WebSocket backend (`SIGHTX_ROOM` Durable Object) exists and is reachable, and whether the page actually calls it (it doesn't). |
| CutSheetX | Confirms NO marketing/app page exists anywhere (a pure discoverability gap) -> real ephemeral-trial-authenticated calls to its real backend search/catalogue routes, to confirm the backend itself works even though nothing links to it. |
| SightX | Live page -> confirms the self-disclosed "hardcoded demo" language is still present -> drives the one real dynamic feature (`/api/sightx/walkthrough-preview`) twice with different inputs to confirm it's real generation, not a canned response. |
| PriceX/MarketX/CompX/WeatherX/ForecastX/GeoX | All 6 real proxied routes to `weyland-market-intelligence-worker`, including the 2 already-known-broken FRED-backed ones (kept in the suite specifically so a future fix - or regression - gets caught automatically). |

Every check follows through to a **real, meaningful signal** specific to
that product's actual promise (a real door count, a real generated
storyboard, a real government-data upsert count, a real D1 row count) -
never just "got a 200 back."

## Output

Each run writes to `tools/user-simulation/reports/` (gitignored - these
are point-in-time snapshots, not source):

- `report-<timestamp>.json` - full structured report (every step, every
  finding, every piece of evidence captured).
- `report-<timestamp>.md` - human-readable summary of the same run.
- `latest.json` / `latest.md` - always overwritten to point at the most
  recent run, so "what's the current state" never requires hunting for a
  filename.

Each finding in the report is tagged with a severity:

- `working` - a real flow was exercised and genuinely succeeded.
- `gap` - real backend/infra exists and partially works, but something
  concrete is missing (e.g. a real feature nothing links to).
- `missing` - no real UI and/or backend exists for this at all.
- `broken` - a real, exercised flow failed outright.
- `note` - an honest observation that isn't a pass/fail judgment (e.g.
  SightX's own accurate "this is a demo" self-disclosure).

Findings relevant to weylandai.com's real door-schedule extraction
pipeline also carry a `gofaineatCascade` field when applicable, pointing
at `/Users/johnmobley/gofaineats/GOFAINEAT_CASCADE_DESIGN_PATTERN.md`'s
already-existing analysis of that exact task, rather than inventing a new
assessment from scratch.

## Design notes / why it's built this way

- **Real production, not a local mock.** This repo's own build pipeline is
  documented (`EXTRACTION_PIPELINE_CUSTOMER_PATH.md`) to have drifted
  between `src/` and the deployed `weyland.worker.js` artifact - testing
  against a fresh local build would verify a codebase state that may not
  match what customers actually experience. Testing live production is
  the only way to get an honest answer to "does this work for a real user
  right now."
- **Real auth, not fabricated tokens.** Two real, already-proven
  mechanisms are reused instead of inventing a third: AuthFor's real
  ephemeral-trial endpoint (`POST https://authfor.com/api/v1/ephemeral/
  create`) for the 4 products that allow it (subx, takeoffx, cutsheetx,
  sightx - `EPHEMERAL_TRIAL_PRODUCTS` in `src/lib/auth.js`), and a real
  throwaway `users`+`weyland_sessions` D1 row (created and deleted for
  real against production, `subscription_tier='subconp'` for full access)
  for the products that don't (propx, huntx, meetingx) - the exact same
  technique already used and documented live in
  `EXTRACTION_PIPELINE_CUSTOMER_PATH.md`.
- **No headless browser.** Considered Playwright for the "does the page
  actually render, is a button dead" class of check. Decided against it
  for this pass: every product's real promise (extraction produces real
  data, a proposal generates a real PDF, a scrape upserts real rows) is
  verifiable via the same API calls the page's own JS makes, and adding a
  browser dependency is real, ongoing maintenance weight (installed
  browser binaries, flakier CI-style runs) that wasn't worth it for the
  concrete gaps this pass needed to find. This is a real, stated
  limitation (see below and in every report's own "Harness limitations"
  section) - not a claim that HTTP-level testing is sufficient forever.
  Sovereignty doctrine does NOT block adding Playwright here if a future
  pass decides it's worth it: this is testing infrastructure, never
  shipped in the product bundle, same category as this session's own use
  of `wrangler`/`node --test`.

## Adding a new product or a new check

1. Read the real route registrations (`src/routes/*.js`,
   `src/module-registry.js`) to find the real API surface - don't guess.
2. Create `checks/<slug>.mjs` exporting `product`, `slug`, and an async
   `run(ctx)` that returns `{ product, slug, entryPoints, steps, findings
   }` (see any existing check file for the exact shape).
3. Register it in `run.mjs`'s `main()` - decide whether it needs
   `ctx.ephemeralToken` or `ctx.throwawayAccount` (or neither, like
   market-intelligence).
4. Follow through to a REAL signal specific to that product's promise -
   not just an HTTP status code.

## Current known limitations of this harness itself

See the `limitations` array at the bottom of every generated report (kept
in sync with `run.mjs`'s `LIMITATIONS` constant) - reproduced here:

- No headless-browser layer: can't catch client-side JS exceptions, dead
  buttons, or CSS/rendering issues - only real HTTP status/JSON/HTML
  content.
- MeetingX's WebSocket backend can't be fully exercised (no real
  WebSocket client in this harness yet).
- PropX/HuntX marketing-page checks use raw HTML string matching, not a
  real browser - can't distinguish "visually hidden" from "genuinely
  absent."
- Only the 6 products named in this task plus the 6 market-intelligence
  routes are covered. `requireProductAccess()` call sites reveal a much
  larger real product-slug surface (asbuiltx, bidx, changeordx, closex,
  coa, drawx, inspecx, leadx, lienx, notesx, permitx, rfax, safetyx,
  specx, survx, and more) that this harness does not test at all yet.
- Throwaway D1 accounts are real writes/deletes against production -
  cleanup is verified but not bulletproof against a hard process kill
  mid-run (see `lib/throwaway-account.mjs`'s header comment for the safe
  manual cleanup query if one is ever found stranded).
- The SubX/TakeoffX extraction-quality finding is based on one real test
  PDF, not a representative sample of real customer documents.

## Journey tests in a real browser (2026-10-07)

The HTTP harness above has no browser. The journey tests do: one script per
journey in `/Users/johnmobley/plan/evidence/weylandai_journey_map_20261007.json`,
each driving real Chromium against production the way a visitor would
(desktop 1280x860, or a 390x844 touch phone), on the single-page homepage
shell (`assets/weyland-shell.js`).

```bash
cd /Users/johnmobley/weylandai.com
export PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core/index.mjs   # if not installed here
node tools/user-simulation/journeys/first-result-no-account.mjs         # exit 0 = every check passed
node tools/user-simulation/signin-journey.mjs                           # the reference sign-in journey
```

All of them, three times each, one at a time (pass 1 runs every journey, then pass 2, then
pass 3), with a summary of which journeys passed every check in every run:

```bash
node tools/user-simulation/run-journeys.mjs --passes 3          # exit 0 = every run of every journey passed
node tools/user-simulation/run-journeys.mjs --passes 1 --only subx-upload-to-submittal,deep-link-login
```

It writes `reports/matrix-<stamp>/` (one log per run, `results.jsonl` as it goes, `summary.json`).
A full three-pass run takes about 36 minutes and opens 30 live Stripe Checkout Sessions (10 per
pass, each stopped at the loaded form and left to expire).

| Script | Journey |
|---|---|
| `journeys/first-result-no-account.mjs` | cold guest, desktop + phone: hero RUN IT LIVE, paste, citations drawn in place |
| `journeys/create-free-account.mjs` | guest pastes, creates a free account in the page, signed in on the 14-day trial |
| `journeys/free-trial-first-use.mjs` | new trial account uses paste, hero, CutsheetX, PropX, HuntX, account card |
| `journeys/subx-upload-to-submittal.mjs` | subscriber uploads a door schedule PDF in SubX, rows with sources, package PDF |
| `journeys/takeoffx-takeoff.mjs` | TakeOffX in the overlay, START A TAKEOFF, counts with sources and a review step |
| `journeys/cutsheetx-finder-search.mjs` | Finder (in place), CutsheetX MATCH / SEARCH / LOCAL LOOKUP, TRY A REAL MATCH |
| `journeys/sightx-corridor.mjs` | WALK THIS SCHEDULE IN SIGHTX, LOWER / raise the dossier, walkthrough preview |
| `journeys/propx-proposal.mjs` | PropX sample proposal and PDF; the builder in the overlay prices a schedule |
| `journeys/meetingx-room.mjs` | two subscribers in one MeetingX room: link, roster, chat |
| `journeys/huntx-opportunities.mjs` | HuntX chapter (index, search, source filter), HuntX app, REFRESH FROM SOURCES |
| `journeys/pricing-to-checkout.mjs` | every buy button: Stripe's form inside the page (stops at the loaded form) |
| `journeys/account-view-signout.mjs` | account card, OPEN SUBX, sign-out in place |
| `journeys/overlay-products.mjs` | every product path in the overlay = the direct page; links, closing, reload |
| `journeys/phone-key-journeys.mjs` | the key journeys on a phone, every step by tap |
| `journeys/deep-link-login.mjs` | arriving from shared links (/subx, /subx-app, a MeetingX room, /login?redirect=) |
| `journeys/wirex-news.mjs` | WireX chapter, News in the overlay, WireX Pro upgrade (stops at the loaded form) |
| `journeys/forgot-password.mjs` | Forgot password in the sign-in overlay (the request is answered in the browser: no email) |
| `journeys/shell-address.mjs` | the address of an open view (/#/find): reload, shared link, typed #/&lt;app&gt;, Back / Forward / Close, a cited document after a reload |

Rules every journey keeps (`lib/journey-kit.mjs`):

- **Real GPU WebGL.** Chromium starts with `--use-angle=metal`; the first check
  is "browser has GPU WebGL" and a run on software WebGL (SwiftShader) stops
  there, because the homepage's 3D backdrop starves such a browser and every
  later step would flake.
- **No page hop.** A journey that should stay in place marks the document at
  the start and checks at the end that it was never replaced and never left
  weylandai.com; documents (citations, packages) must be drawn in the page.
- **Throwaway data only, deleted in finally.** Identities are
  `user-sim-<label>-<run>@weylandai.com` (password generated per run, never
  printed or written to a report). The users / weyland_sessions / nodes rows,
  the "The WeylandAI Building" demo clones the homepage creates (ids captured
  from `POST /api/demo/weyland-building/session`; clone requests still in
  flight are awaited before a browser closes), SubX uploads (D1 rows, the R2
  object, the KV copy), built submittal packages, proposals and submittals are
  deleted, and the report says what was deleted and that the AuthFor identity
  stays (it cannot be deleted from here).
- **No payment, no email.** Checkout journeys stop when Stripe's form shows the
  product and price (each press leaves one live Checkout Session to expire);
  nothing sends email to anyone.
- **Reports** go to `reports/journey-<id>-latest.json` plus a timestamped copy
  (`reports/` is not committed).

`cleanup-usersim-clones.mjs` lists (dry run) or deletes (`--delete`) demo
clones owned by `usersim_*` ids, left by runs from before the journeys
deleted their own.
