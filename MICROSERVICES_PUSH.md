# The microservices push — tracking doc

Started 2026-09-12, per direct instruction to begin real architectural
decomposition of the weylandai.com monolith: not more file-level splitting
inside one deployed Worker (that's `WORKER_MODULARIZATION_MAP.md`'s job, and
it's essentially done — see its own final entries), but genuinely separate,
independently-deployed Cloudflare Workers wired back in via Service
Bindings, per `WEYLAND_SUCCESSOR_ARCHITECTURE.md`'s design. Same pattern
already proven live by `weyland-ocr-worker`.

**Status: one real extraction shipped and verified. This is 1 of ~11
planned service boundaries (see `WEYLAND_SUCCESSOR_ARCHITECTURE.md` §
"Proposed Worker boundaries") — the monolith is not "broken apart," this is
the first slice.**

## What shipped: `weyland-market-intelligence-worker`

**Why this module, not `pricing.js`/PriceX as originally suggested going
in:** the brief's working assumption was that `src/routes/pricing.js`
("PriceX") was the safest candidate — stateless, public-data-only, no
dependency on the empty `hardware_sets`/`hardware_components` tables. That
assumption does not survive reading the actual code. `pricing.js` (`GET
/api/cps/price-check`, `POST /api/cps/enrich-session/:sessionId`, etc.)
runs real D1 queries directly against `hardware_components` JOIN
`hardware_sets` — exactly the tables the same-day completeness audit found
are globally empty in production. It is not stateless and it does depend
on the empty pipeline.

The actual PriceX/MarketX *branded* endpoints (`/api/pricex/materials`,
`/api/marketx/trends`) live in a different file entirely:
`src/routes/market-intelligence.js`, covering 6 routes total (PriceX,
MarketX, CompX, WeatherX, ForecastX, GeoX). Verified directly in the code
before picking it:
- Zero `env.DB` / D1 references anywhere in the file.
- Zero `authenticate`/`requireProductAccess` calls — genuinely public by
  design, confirmed by absence, not by a comment claiming so.
- Every data dependency is either a public external API (FRED, TXDOT open
  data, api.weather.gov, US Census geocoder) or pure in-memory math
  (ForecastX's cash-flow projection has no external dependency at all).
- Already had a real, passing 12-test suite
  (`market-intelligence.test.mjs`) from its original file-level extraction
  (`WORKER_MODULARIZATION_MAP.md` step 17, 2026-09-10).

This makes it strictly lower-risk than `pricing.js` for a first real
service-boundary cutover: no D1 coupling to reason about, no auth
dependency to replicate correctly in a new Worker, no interaction with the
known-empty hardware tables.

### What was built

- **New directory, new independently-deployed Worker:**
  `weyland-market-intelligence-worker/` — own `wrangler.toml`, own
  `package.json`, own `src/index.js` entry point + `/health` endpoint.
  Fully self-contained (no imports back into the main `src/` tree it
  doesn't own) — same independence precedent as `ocr-worker/`. Two shared
  primitives (`NativeRouter`, `jsonResponse3`) were deliberately
  **copied**, not cross-imported, because this Worker deploys on its own
  schedule and must not silently break if someone reshapes
  `src/lib/router.js` later without knowing this Worker depends on it.
  That's a real, accepted tradeoff (duplication vs. a hidden cross-deploy
  dependency), stated here rather than left implicit.
- **The actual route logic moved, not copied:**
  `src/routes/market-intelligence.js` + its test file were `git mv`'d
  (history preserved) into
  `weyland-market-intelligence-worker/src/routes/`. There is exactly one
  copy of this logic in the repo now; the monolith no longer owns it.
- **Deployed for real:**
  `https://weyland-market-intelligence-worker.johnmobley99.workers.dev`
  (Cloudflare account `f07be5f84583d0d100b05aeeae56870b`, same account as
  every other Worker in this portfolio).
- **Gateway-side wiring in the main worker
  (`weylandai-com-worker`/`weyland.worker.js`, the actually-live worker
  behind weylandai.com):**
  - Root `wrangler.toml`: new `[[services]]` block, binding
    `MARKET_INTELLIGENCE` → service `weyland-market-intelligence-worker`.
  - New `src/routes/market-intelligence-proxy.js`
    (`registerMarketIntelligenceProxyRoutes`): registers the exact same 6
    path+method pairs the old in-process handler did, each one forwarding
    the untouched `Request` object to `env2.MARKET_INTELLIGENCE.fetch(request2)`.
    Deliberately explicit per-route (not a prefix wildcard) so a future
    7th market-intelligence-shaped route added to the monolith by mistake
    404s here instead of being silently swallowed by an overbroad match.
  - `src/module-registry.js`: swapped
    `registerMarketIntelligenceRoutes(router)` for
    `registerMarketIntelligenceProxyRoutes(router)`.
  - Rebuilt `weyland.worker.js` via `npm run build` (real esbuild bundle,
    not hand-edited) — confirmed by grep that the old inline
    `stlouisfed.org`-fetching logic is now **zero** occurrences in the
    built bundle (genuinely removed, not just unreferenced), and that
    `env2.MARKET_INTELLIGENCE.fetch(request2)` is present.
  - Deployed for real: `wrangler deploy` from the repo root. Cloudflare
    confirmed the new `env.MARKET_INTELLIGENCE (weyland-market-intelligence-worker)`
    binding is live on the deployed Worker.

### Real tests run

- `weyland-market-intelligence-worker`: all 12 pre-existing route tests
  (unmodified, moved verbatim) + 3 new entry-point tests (`/health`,
  unknown-path 404, one real route exercised end-to-end through the top-
  level `fetch` handler) — **15/15 pass**.
- Main repo, new proxy module: 3 new tests in
  `src/routes/market-intelligence-proxy.test.mjs` covering (a) all 6 real
  routes forward the exact Request to the binding and return its response
  untouched, (b) an unregistered path 404s locally rather than being
  proxied, (c) the wrong HTTP method on a real path also 404s (not
  silently accepted). **3/3 pass.**
- Full existing repo test suite re-run after the move+edit:
  **1133/1137 pass.** The 4 failures are all in
  `src/lib/submittal-assembler.test.mjs`, a file this session never
  touched (`git diff --stat` against it is empty) — pre-existing failures
  from the separate, in-flight "sovereign PDF generator" work
  (`MONOLITH_HELPER_MAP.md` step 5), unrelated to this extraction.

### Real production verification (before/after, live `weylandai.com`)

Captured full response bodies from the live domain before touching
anything, then re-curled the identical requests after both deploys
(standalone worker deploy, then main-worker deploy with the binding wired
in):

| Route | Before | After | Result |
|---|---|---|---|
| `GET /api/compx/vendors?q=Acme` | 200, real TXDOT vendor data | 200, identical structure | **Verified structurally identical** |
| `GET /api/weatherx/delay-risk?lat=30.27&lon=-97.74` | 200, real NWS forecast | 200, identical structure | **Verified structurally identical** |
| `GET /api/geox/lookup?address=...` | 200, real Census match | 200, byte-identical (timestamps aside) | **Verified structurally identical** |
| `POST /api/forecastx/project` (fixed inputs) | 200, deterministic projection | 200 | **Byte-identical** (`diff` on saved response bodies, zero differences) |
| `GET /api/pricex/materials` | **502**, `"Unexpected token '<', \"<HTML><HEA\"... is not valid JSON"` | **502**, `"...api_key is not a 32 character alpha-numeric lower-case string..."` | Same status code, **different error body** — see gap below |
| `GET /api/marketx/trends` | **502**, same HTML-parse error as above | **502**, same FRED-format error as above | Same status code, **different error body** — see gap below |

**4 of 6 routes: fully verified, zero regression, real production traffic
compared before/after.**

### The one real, honestly-flagged gap: `FRED_API_KEY`

`/api/pricex/materials` and `/api/marketx/trends` were **already broken in
production before this change** — a genuine pre-existing bug, not
introduced here (confirmed by curling `https://weylandai.com` before
touching anything, see table above). The failure mode differs after the
extraction because a Cloudflare service binding invokes the target Worker
with **its own** environment bindings, not the caller's — so
`weyland-market-intelligence-worker` needs its own `FRED_API_KEY` secret,
independent of the one already set on `weylandai-com-worker`.

Investigated, not just noted: the real secret's plaintext value is not
recoverable via the Cloudflare API (secrets are write-only) and was not
found anywhere searched on disk (shell profiles, `mascom` key stores,
`.dev.vars`). Testing with a syntactically-valid but unregistered dummy
key (`wrangler secret put`, piped with `printf %s` — an earlier attempt
piped with `echo` and got a trailing newline baked into the secret,
corrected) reproduces FRED's own clean `"api_key ... is not registered"`
JSON error, **not** the HTML-parse error seen in real production. That
rules out a blanket Workers-vs-FRED network block as the production
failure's cause (a real Worker calling FRED with a bad-but-well-formed key
gets clean JSON back, every time this was tested) — the live 502's HTML
response is something specific to the *real* key or account state that
this pass could not diagnose without that key's actual value.

**Action needed from John**: run
`wrangler secret put FRED_API_KEY --name weyland-market-intelligence-worker`
with the real value (same one already on `weylandai-com-worker` — check
`wrangler secret list --name weylandai-com-worker` shows it exists, value
not retrievable via CLI) to fully close this gap. Until then, these 2
routes remain in the same broken (502) state they were already in — not
newly broken, but not proven byte-identical either. Flagged rather than
silently left for the next session to rediscover.

## Commits (this pass)

Scoped per `AGENTS.md`'s explicit-path-list rule (never a bare `git
commit`) — see actual commit hashes in `git log`, not repeated here since
this doc will go stale the moment it's re-read; check `git log --oneline
-- weyland-market-intelligence-worker/ src/routes/market-intelligence-proxy.js
src/module-registry.js wrangler.toml MICROSERVICES_PUSH.md` for the real
list.

## Next candidates for the follow-up pass (informed by this session's read, not a repeat of the original brief's list)

Ranked by what was actually learned reading the code this session, not a
restatement of `WEYLAND_SUCCESSOR_ARCHITECTURE.md`'s original ordering:

1. **`routes/document-generators.js`** (the 15 generate/download PDF route
   pairs). This is what both `WORKER_MODULARIZATION_MAP.md` §6 and
   `WEYLAND_SUCCESSOR_ARCHITECTURE.md`'s migration plan call the single
   cleanest boundary in the whole file — confirmed zero external callers,
   calls nothing product-specific elsewhere — and `gateway/wrangler.toml`
   **already has a `DOCUMENT_GENERATORS` service binding declared and
   `gateway/src/route-table.js` already has all 15 path prefixes
   pre-wired to it**, pointing at a service named
   `weyland-document-generators-worker` that **does not exist yet**
   (confirmed: no such directory on disk, `wrangler deployments list
   --name weyland-document-generators-worker` returns nothing). Someone
   already scoped this extraction and half-built the wiring; it just needs
   the actual standalone Worker built and deployed. Real complexity this
   pass's reading surfaced that the market-intelligence extraction didn't
   have to deal with: it needs `renderHtmlToPdf`/`storeDocumentPdf`
   (currently deliberately excluded from `module-registry.js` per that
   file's own header comment, because their deps come from a lazy
   esbuild-vendored init block only resolved at the exact call site inside
   `legacy-monolith.js` today), real D1 access, real R2 (`env.OUTPUTS`)
   access, and the `BROWSER` binding for Puppeteer-based PDF rendering.
   Meaningfully harder than this pass's extraction, but the highest-value
   next target precisely because the wiring is already half-done and
   waiting.
2. **`weyland-gateway-worker` itself needs to actually go live.** Per its
   own `wrangler.toml` comment it currently deploys only to its own
   `workers.dev` URL, not the real `weylandai.com` domain — meaning the
   strangler-fig front door that both this extraction and the
   already-half-wired document-generators binding assume exists is not
   actually in the live request path yet. Before or alongside the next
   module extraction, someone needs to make a real decision (with real
   DNS/Cloudflare-route consequences, the kind of decision this pass was
   told to stop and flag rather than guess at) about cutting the live
   `weylandai.com` domain over to route through `weyland-gateway-worker`
   instead of directly to `weylandai-com-worker`. Until that happens, the
   gateway's own `ORIGIN` fallback and any module bindings on it are
   unverified against real production traffic — they only prove out
   against the gateway's own `workers.dev` URL.
3. **`lib/pricing.js`'s CPS-catalogue pricing routes, once the empty
   `hardware_sets`/`hardware_components` pipeline is real.** Explicitly
   *not* picked this pass (see rationale above) because it's coupled to
   tables the completeness audit found are empty in production — extracting
   it now would mean shipping a real service around a pipeline that has
   never been exercised end-to-end. Worth revisiting once that gap (also
   flagged in the original task brief) is closed, not before.
4. **The market-intelligence extraction's own loose end**: get the real
   `FRED_API_KEY` onto `weyland-market-intelligence-worker` (see gap
   above) — small, but it's the one piece of this pass that isn't fully
   closed out.
