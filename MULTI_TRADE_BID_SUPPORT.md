# Multi-trade bid support: feasibility and design

**Status (updated 2026-09-09):** Real audit + design below is done. The shared foundation is now implemented and live: a `trades` reference table, `trade` columns on `manufacturers`/`products` (backfilled to `'doors'` for all pre-existing rows), and real seeded catalogs for two additional trades — plumbing (8 manufacturers, 12 products: Kohler, Moen, Sloan, Zurn, Watts, American Standard, Bradley, A.O. Smith) and electrical (5 manufacturers, 11 products: Square D, Eaton, Leviton, Hubbell, Lutron) — all real, sourced, well-documented products, not fabricated. `matchProductFromDb()` now filters by trade. Generic `schedule_entries`/`schedule_line_item_matches` tables exist for plumbing/electrical to build extraction against, alongside (not replacing) doors' existing tables. See `migrations/20260909_multi_trade_foundation.sql` and `migrations/20260909_plumbing_electrical_catalog_seed.sql`.

**Real finding that changed this document's original plan:** the audit below assumed a new generalized catalog table would be needed. It wasn't — `products`/`manufacturers` were already structurally trade-agnostic in their columns (category_level_1/2/3, manufacturer_id, no door-specific fields); every row in them just happened to be door hardware in practice. Tagging beat rebuilding.

**Not yet done, real and tracked, not silently dropped:** per-trade GOFAINEAT extraction pilots (plumbing/electrical schedule pages still have no extraction pipeline at all — the seeded catalog alone doesn't extract anything from a real submitted schedule document), the UI trade selector, and `projects.project_type` still isn't read/branched on anywhere in the extraction code. Building a real extraction pilot for even one trade is its own multi-day GOFAINEAT effort (see the feasibility assessment below, unchanged) — the two catalogs above make that the next real bottleneck, not the schema.

## Problem restated

Real, direct instruction: the product should not be door-installers-only. A real construction project has bids across many trades — plumbing, electrical, drywall, painting, and more — and the platform should let a user toggle which trade's bid they're looking at, matched against that trade's own real catalog and schedule format, not just door hardware.

## What's actually coupled to doors today (verified in code, not assumed)

This section exists because "generalize the pipeline" is easy to say and easy to underestimate. Every claim below was checked directly against `src/legacy-monolith.js` and `schema.sql`, not inferred from naming alone.

1. **The product catalog is a single hardcoded array, door-hardware only.** `PRODUCT_DATABASE` (`src/legacy-monolith.js`, ~140 lines) holds exactly 101 hardcoded entries — real manufacturers (Schlage, LCN, Von Duprin, Ives, Pemko, etc.), all locks/closers/hinges/exit-devices/thresholds. `MFR_CODE_MAP` (adjacent) maps manufacturer abbreviations to canonical names, also door-hardware-only. Neither has any trade dimension — there is no `trade` field on a product entry, no separate catalog for plumbing fixtures or electrical gear. Extending this to another trade today would mean either polluting one array with unrelated product types (real correctness risk — matching logic has no trade filter to fall back on) or duplicating the whole pattern per trade with no shared structure.

2. **The extraction prompts are hardcoded to "HARDWARE SCHEDULE."** `buildIsolatedPageExtractionPrompt`, `buildDirectPdfExtractionPrompt`, and the shared `buildHardwareExtractionPrompt` all contain literal prompt text like *"You are analyzing a single page... from a HARDWARE SCHEDULE document"* and *"Extract ALL hardware groups and components."* A plumbing schedule, an electrical panel schedule, and a door schedule are real, structurally different documents (different column conventions, different real-world terminology, different what-counts-as-a-"group" logic) — this isn't a config string to swap, the actual extraction logic and its expected output shape (`hardware_groups`, `components`) are door-schedule-shaped throughout.

3. **The extraction pipeline itself depends on a live Claude Vision API call** (`callClaudeWithPdf`, `callClaudeVisionWithImage`) for every page. This is a second, separate real problem, not specific to multi-trade: it already contradicts this project's own stated direction (see `WORKER_LESSONS_LEARNED.md`'s deflationary-incubation-model finding and the explicit correction on SightX's wall-detection: GOFAINEAT-style embedded, disconnected intelligence is the house standard, not a live third-party API dependency). Generalizing this pipeline to multiple trades using the *same* Claude-Vision-dependent approach would mean building five more trades' worth of dependency on an external API this codebase has already been explicitly corrected away from once today. That correction should apply here too, not be silently ignored because this document is about "trades" and not "AI architecture."

4. **The database schema has door-specific tables and column names, not generic ones.** `door_entries`, `door_schedule_entries`, `hardware_sets`, `hardware_components`, `door_hardware_matrix`, `hardware_extraction_sessions` — real, live tables, with columns like `door_number`, `hardware_set_number` baked directly into the schema (confirmed via `schema.sql` and the real `door_hardware_matrix` SELECT used by `routes/hardware-schedule-export.js`). A plumbing bid has no "door number" — it has fixture counts, pipe runs, valve schedules. These tables cannot be reused as-is for another trade; they'd need trade-specific siblings or a real generalization of the schema itself.

5. **What's already real and reusable, not a blocker.** `projects.project_type` exists with `DEFAULT 'DOORS'` — someone already anticipated this at the data-model level, even if nothing downstream reads it yet (confirmed: no `WHERE project_type =` branching exists anywhere in the current extraction/matching code). The real per-visitor demo-trial cloning pattern (`src/routes/demo-trial.js`), the AuthFor/ephemeral auth layer, and the billing/subscription model are all trade-agnostic already — none of that needs to change.

## Technical feasibility assessment

**Feasible, with a real, honestly-scoped hard core — same shape of assessment GOFAINEAT's feasibility study gave its own hard problem.**

- Not technically exotic: this is "add a `trade` dimension to a product catalog, a schedule-extraction system, and a set of database tables that currently assume exactly one trade." Real, bounded engineering.
- The genuinely hard, unproven part: **each trade's real schedule document format and matching logic is its own domain problem**, not a parameterization of the existing one. A plumbing fixture schedule, an electrical panel schedule, and a door hardware schedule don't share a document structure — building real, working extraction for even one additional trade (say, plumbing) is comparable in scope to the *original* door-hardware pipeline's own build, not a small increment. Treat "add N trades" as "build N real extraction+matching pipelines that happen to share an outer UI shell," not "add N rows to a config table."
- Real precedent this can lean on: the demo-trial cloning pattern, the honest per-endpoint extraction discipline established today (`routes/projects.js`, `routes/hardware-schedule-export.js`), and — for the extraction step specifically — GOFAINEAT is a real, appropriate candidate methodology (evolved, embedded classifiers for structured-document extraction, matching the house direction) rather than another live-API dependency per trade.

## Proposed design

### 1. A real trade abstraction, not a bigger door-hardware system

- `projects.project_type` becomes the real switch it was clearly meant to be — actually read and branched on, not just stored.
- A new `trades` reference table (real, small: `id`, `slug` e.g. `"doors"`/`"plumbing"`/`"electrical"`, `display_name`, `status` — `active`/`planned`) replaces the implicit "doors is the only trade" assumption baked into the current schema and code.
- **Product catalog**: `PRODUCT_DATABASE`'s shape (manufacturer, code aliases, models, category, specs, fire rating, ADA, standards, price range) is a reasonable *general* shape for a construction product catalog — the fix isn't reinventing this shape per trade, it's adding a `trade` field and moving from a single hardcoded array to a real, queryable table (this was already implicitly needed even for doors alone — 101 hardcoded entries is a real scaling ceiling regardless of multi-trade).
- **Schema**: introduce trade-generic tables (`schedule_entries`, `schedule_line_items`, or similar — exact naming a real implementation decision, not made here) that the existing door-specific tables either migrate into or sit alongside as the "doors" trade's own real implementation of the general shape. Not designing the exact migration path in this document — that's real, careful work for the implementation phase, flagged here as necessary, not skipped.

### 2. Per-trade extraction, GOFAINEAT-first

Per the correction already applied to SightX: default to an evolved, embedded, disconnected classifier over a live API call wherever the task genuinely fits that shape. Document-schedule extraction (structured tabular/semi-structured real estate on a page, bounded vocabulary per trade) is a real, plausible fit — closer to GOFAINEAT's actual demonstrated use case (structured extraction from a bounded domain) than SightX's wall-detection was. Each trade's extraction becomes its own real GOFAINEAT pilot: a real synthetic-or-real corpus for that trade's schedule format, a real GA-trained classifier, real held-out verification — same rigor as the wall-detection pilot, not assumed to transfer for free.

This is explicitly NOT "port the existing Claude-Vision pipeline to 5 more trades." That would multiply this codebase's live-API dependency by 5x in the exact area it was just corrected away from.

### 3. UI: a real trade selector, not a hidden toggle

A dropdown/selector on the project view that switches which trade's bid is active — visible, discoverable, not a hidden query param. Given item 1's real finding that the underlying extraction/matching is genuinely trade-specific under the hood, the selector's honest job in the UI is to switch between real, separately-built trade modules, not to imply one universal engine handles everything.

## Rollout plan (incremental, one real trade at a time)

1. **Doors stays the reference implementation** — no regression, this is the one trade with a real, live, working pipeline today.
2. **Pick one second trade to actually build first** (not five at once) — a real decision for the project owner, informed by which trade has the most immediate customer demand. Plumbing and electrical are the two most structurally distinct from doors (worth picking one of those first specifically *because* it will surface real gaps in the generalized schema/catalog design faster than picking something door-adjacent would).
3. Build that one trade's real GOFAINEAT extraction pilot, real catalog entries, real schema pieces — verified with the same rigor as every other real deliverable this session (held-out accuracy, live production checks, not claims).
4. Only after one real second trade is live and working does "N trades" become a realistic near-term scope — not decided or promised here.

## What this document does not yet resolve

- ~~Exact schema for the generalized `schedule_entries`/`trades` tables~~ — done, see status note above.
- ~~Which second trade to build first~~ — resolved by direct instruction: plumbing and electrical, built together rather than sequenced one-at-a-time as this document originally recommended (a deliberate override of that recommendation, not an oversight).
- ~~Whether/how the existing door-hardware tables get migrated~~ — decided: they stay as-is, generic tables sit alongside.
- ~~Real per-trade product catalogs~~ — done, see status note above.
- **Still open:** the real extraction pipeline for plumbing/electrical schedule documents (GOFAINEAT pilot per trade, per the design in section 2 above) — this is the genuinely hard, unbuilt part; a seeded catalog with nothing yet extracting real schedule data against it.
- **Still open:** the UI trade selector (section 3) and wiring `projects.project_type` into actual branching logic.
