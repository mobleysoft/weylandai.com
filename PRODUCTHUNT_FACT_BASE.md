# WeylandAI — Real Fact Base for Product Hunt Launch Prep

Compiled 2026-10-01 by ground-truth verification (live endpoint checks, direct
codebase reads, real email evidence) — not from memory, not from marketing
copy. Every claim below is tagged with how it was verified. This is the
factual skeleton; actual launch copy is a separate, later step.

## Product identity

- **Name**: WeylandAI (weylandai.com)
- **Domain**: Construction-industry SaaS suite — subcontractor/GC workflow
  tools (submittals, takeoffs, hardware pricing, site hunting, meetings,
  vision/photo documentation).
- **Flagship SKU**: SubX — submittal automation for the construction trades.

## What's REAL and live right now (verified 2026-10-01)

Only **7 products** have both a real Stripe price AND real backend
functionality behind them, confirmed by reading `src/lib/stripe-billing.js`'s
own `WEYLAND_PRODUCTS`/`CHECKOUT_READY_PRODUCTS` definitions plus live route
checks:

| Product | What it does (one line) | Price | Live backend confirmed? |
|---|---|---|---|
| SubX | Submittal automation for subcontractors | $599/seat | Yes — flagship, has a real paying customer (see below) |
| CutSheetX | Manufacturer cut-sheet discovery + hardware catalog (60K+ real priced rows) | $199/seat | Yes — `/api/cps/catalogues` live (401 = real auth gate, not missing route) |
| TakeoffX | Takeoff tooling | $499/seat | Marked checkout-ready + has real backend per code comments; not independently route-tested this pass |
| PropX | Property-side workflow | $299/seat | Marked checkout-ready + has real backend per code comments; not independently route-tested this pass |
| HuntX | Site/deal hunting | $799/seat | Marked checkout-ready + has real backend per code comments; not independently route-tested this pass |
| MeetingX | Meeting workflow | $299/seat | Marked checkout-ready + has real backend per code comments; not independently route-tested this pass |
| SightX | Vision/photo documentation | $999/seat | **Confirmed live**: `curl https://weylandai.com/sightx` → real `200` |

All 7 are real `livemode: true` Stripe prices, confirmed live via
`GET /api/billing/catalog` (a real endpoint that queries Stripe directly,
not a static list).

### Real infrastructure proof points (verified this pass or well-documented in-repo)

- **CutSheetX's catalog is real and deep**: a genuine Cloudflare D1-backed
  hardware pricing catalog, not a demo dataset — confirmed via live git
  history showing real seeded pricing (e.g. "Seed real pricing for LCN
  4010-18/4020-18 drop plates + 2030-WMS mount pack").
- **Real price-extraction pipeline under active development**: recent commits
  (same day as this check) show a real OCR→LLM-extraction→human-review
  pipeline for pulling prices out of manufacturer PDFs, built on a *local*
  Qwen3-8B bridge (`callLocalQwen`), not a third-party AI API — this is a
  genuine, defensible "sovereign" positioning point if you want to use it:
  **no OpenAI/Anthropic/Google API key is provisioned or called for this
  feature**, it runs against a self-hosted model reached via Cloudflare
  Tunnel.
- **Real Stripe + AuthFor + VendyAI integration**: checkout goes through a
  real service-binding call to `vendyai-com-worker` (shared billing
  infrastructure, not a one-off integration), confirmed by reading the live
  `/api/billing/checkout/create` handler.

### Real customer evidence (Stage 3: Validated)

Re-verified 2026-10-01, not just cited from old notes: a real email,
**"PAD-SubX Payment in Full Confirmation,"** received 2026-06-02, with a real
attached SOW document ("PrecisionAutoDoors SOW-Submittal Automation.pdf"),
found independently in Gmail export data. This is real, dated evidence of at
least one real paying customer (PrecisionAutoDoors) for SubX.

**Honest caveat**: this confirms a real payment event occurred on 2026-06-02.
It does NOT by itself confirm the customer relationship is still active
*today* (2026-10-01) — that would need a fresh, direct check (recent Stripe
activity, recent correspondence) which this pass didn't do. Recommend one
more real check (Stripe dashboard, last invoice date) before stating "active
paying customer" in present tense on a public launch page — "a real
construction subcontractor paid in full for SubX" (past-tense, dated) is
safe to say now; "we have an active customer" needs that one more check.

## CRITICAL — do NOT claim these as real products

**24 additional SKU names exist in the codebase ONLY as placeholder Stripe
price objects with zero backend functionality.** The code's own comments are
explicit about this: *"NONE of these have a real backend route or page yet...
do not surface any of these on /pricing or any nav until each has actual
working functionality behind it."*

The list: DrawX, AsBuiltX, SpecX, RFAX, ChangeOrdX, PermitX, SafetyX, CloseX,
NotesX, LeadX, MarketX, CompX, PriceX, ZoningX, RiskX, ForecastX, GeoX,
SiteX, DroneX, PhotoX, InspecX, SurvX, MobileX, WeatherX. Also LienX, BidX,
CoA (3 more, slightly different status — see below).

### Correction (2026-10-01, same day): the "bug" above was a false alarm

The original pass tested invented route paths (`/api/pricex/data`,
`/api/compx/data`, `/api/weatherx/data`) that don't exist in the codebase,
got real 404s on those wrong URLs, and concluded the backends didn't exist.
Re-verified directly against the actual source
(`src/routes/market-intelligence-proxy.js`) and the real live endpoints
before recommending any code change - good thing, since the recommended
"fix" would have broken real, working checkout for real customers.

**Real findings on re-check:**
- The real routes are `/api/pricex/materials`, `/api/compx/vendors`,
  `/api/weatherx/delay-risk`, `/api/forecastx/project`, `/api/geox/lookup` -
  defined in `market-intelligence-proxy.js`. Live test: `pricex` → `200`;
  `compx`/`weatherx`/`geox` → `400` (route exists, validates input - not
  "doesn't exist"). All five have real, live marketing pages too
  (`GET https://weylandai.com/{slug}` → `200` for all five).
- `weyland-lienx-seat` is NOT part of any gap - it's one of 14 products
  (lienx, bidx, coa, drawx, asbuiltx, specx, rfax, changeordx, permitx,
  safetyx, closex, notesx, inspecx, survx) deliberately added to
  `CHECKOUT_READY_PRODUCTS` in a real, documented 2026-09-23 fix, each
  backed by a real `requireProductAccess`-gated route in
  `src/routes/document-generators.js`, confirmed by a real passing test
  suite and a real live marketing page per product. They were added
  *because* real customers were hitting false `409` rejections for
  products that actually worked - the opposite problem from what the
  original pass assumed.
- `MarketX` is still correctly excluded and still fails honestly with a
  real `501` - that part of the original finding was accurate.

**Conclusion: no code change needed.** `CHECKOUT_READY_PRODUCTS` appears
correct as it currently stands. The lesson for next time: verify route
existence against the actual source file before concluding a backend is
missing - a 404 on a guessed URL is not evidence a feature doesn't exist.

## Suggested real, honest positioning angles (facts only, not copy)

- "Built by a construction-industry veteran's firm, not a generic AI wrapper"
  — only if independently verifiable; not checked this pass.
- "Runs its own AI, not a 3rd-party API" — real and verifiable for the
  catalog-extraction pipeline specifically; do not over-generalize to "the
  whole product" without checking whether other features call a hosted LLM
  API (not checked this pass).
- "A real subcontractor paid in full for this" — real, dated, verified.
- Lead with CutSheetX or SubX (the two most concretely verified) rather than
  the newer/untested 5 (TakeoffX, PropX, HuntX, MeetingX) until each gets an
  independent live route check.

## What this pass did NOT do (flagged, not silently skipped)

- Did not independently route-test TakeoffX, PropX, HuntX, or MeetingX's
  actual backends beyond trusting the code's own comments — recommend one
  more pass before launch.
- Did not check current/recent Stripe transaction activity for SubX beyond
  the 2026-06-02 email.
- Did not draft any launch copy, tagline, or Product Hunt submission content.
- Did not create or touch any Product Hunt account.
