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
