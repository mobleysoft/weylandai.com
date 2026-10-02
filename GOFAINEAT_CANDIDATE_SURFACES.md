# Gofaineat cascade candidates for WeylandAI — real survey, 2026-10-01

Surveyed `/Users/johnmobley/weylandai.com/src/` directly (not inferred from
tickets) plus `/Users/johnmobley/hascom/tickets/` (Ron's real MHS work-order
system) for every place that currently depends on a network-reachable model
for open-ended generation/extraction. Applying the test from
`GOFAINEAT_CASCADE_DESIGN_PATTERN.md`: enumerable input/output space,
independently reviewable, built via the proven bootstrap-corpus -> review ->
GA-train process.

## Ranked candidates

### 1. Catalogue/price-book row extraction — most tractable, build this first

**Where:** `src/lib/catalogue-price-extraction.js`, via `qwen-bridge.js`'s
`callLocalQwen` (self-hosted Qwen3-8B, already sovereign in the
no-third-party-API sense; the open gap is purely connection-denied capability
— it still needs the bridge server reachable over network).

**Genuinely open-ended today:** yes — turns OCR'd manufacturer price-book
text into `{model, finish, price}` rows via a single LLM call per chunk.

**Real decomposition sketch (first pass, matches the pattern's shape well):**
1. **Row-type classifier** — per OCR'd line, classify `priced_data_row` /
   `header_or_noise` / `call_for_quote`. Binary-ish, enumerable, and the
   2026-09-30 pre-flight validation already describes exactly this
   distinction being made correctly by the current LLM call ("correctly
   emitted NO row at all for 'Call for quote' lines") — real evidence this
   decision is narrow enough to classify.
2. **Finish-code format classifier** — given a `priced_data_row`, classify
   which of a bounded, real, named vocabulary (BHMA 3-digit, US-letter, or
   none-present) the finish code uses. Finish codes are a fixed real-world
   standard, not open text — strong gofaineat fit.
3. **Final constrained extraction** — given (row confirmed real, known
   finish-code format), extract model/price substrings. Much smaller surface
   than today's single call doing classification + extraction together.

This is the strongest candidate: text-only input (no vision), a schema
already proven stable in production, and real documented examples of the
narrow decisions the current LLM is already making correctly — meaning a
bootstrap corpus can be built from real production logs, not synthesized.

### 2. Door-schedule/hardware-schedule table-row structuring — already flagged, still undesigned

**Where:** the pipeline documented in `GOFAINEAT_CASCADE_DESIGN_PATTERN.md`
itself (OCR text -> `{doors:[...]}` JSON). Still real, still the next open
item from that doc — not re-scoped here, just confirmed it still exists and
nothing has been built against it since.

### 3. Vision-based page extraction (`callClaudeVision`/`callClaudeWithPdf`) — honestly does NOT decompose as-is

**Where:** `src/lib/hardware-extraction-vision-dispatch.js`,
`hardware-extraction-vision-adapters.js`, `hardware-extraction-pipeline.js` —
the PRIMARY extraction route for SubX/CutSheetX submittals. Per the real
hascom ticket (`WO-2026-0611-HASCOM-001`), this runs through a real "vision
bridge" with operator-local Claude Code as the default route since
2026-06-15 (`BRIDGE-DEFAULT`), `api_direct` demoted to a fallback.

**Why this one is different and harder:** it takes a page *image* (not
pre-OCR'd text) and produces structured JSON in one model call — vision
perception and open-ended structuring are entangled in a single call. Per
the design doc's own honest caveat about OCR being "closer to a perception
task than a decision task," this pipeline inherits that same problem one
level up: there's no clean way to GA-train a classifier over raw pixels the
way the two proven pilots work over small feature vectors.

**What it actually needs instead of a cascade, as-is:** route it through a
real OCR step first (the same `tesseract-wasm` engine already proven working
outside Workers tonight, Node-validated, browser-validation pending) to
produce text, *then* apply a cascade to the resulting text — structurally
the same shape as candidates #1 and #2, not a new pattern. Don't attempt to
cascade the raw vision call directly; separate perception from decision
first.

## Real safety constraint — do not design around this

The vision-bridge pipeline has a real, deliberate human-in-the-loop gate:
per the same hascom ticket, "Constitutional affirm gate preserved (human
still clicks Affirm)" for extraction results before they become submittals.
**Any gofaineat-cascade work on these pipelines must preserve this
affirmation step for pricing- and submittal-affecting actions.** Making
extraction work offline is a connectivity improvement; it is not license to
remove the human confirmation step for high-stakes actions — that gate
exists for correctness/liability reasons independent of whether a network
call was involved. Treat "removes the Affirm click" as out of scope for any
cascade design, not an incidental side effect to accept.

## Not a cascade candidate (confirmed, noted for completeness)

**CPS catalogue ingest -> D1 FTS5 -> pricing lookup** (the real, operational
system per `WO-2026-0611-HASCOM-001`'s "Phase B CPS operational... 394
variants/12 products") is already a deterministic search/lookup system, not
open-ended generation — nothing to decompose here, it's already the kind of
narrow, auditable system the cascade pattern is trying to produce elsewhere.
