# g078: one opening listed on two pages

Base: `0d07db79e62246b3e81463dc2919ebf147d2c8b7`. Start clock: **2026-10-11 04:34:54 UTC**. `git fetch origin` failed immediately with `cannot open '.git/FETCH_HEAD': Operation not permitted`; no remote was contacted and checkout could not follow. HEAD and the local origin/main ref both held that commit. No claim is made that the local ref was current on the server. Work stayed in the supplied clone; deliverables are exported to the requested sibling `g078/` directory. No PR, deploy, network measurement, truth/placement record commit, or access to the production checkout was performed.

The clone already contained g076 edits to `truth_run.mjs`, its new files, and older scratch work. Those are preserved and excluded from this patch. The exported patch is against the named HEAD, independently applies there, and does not require g076. Exact-base before measurements used HEAD copies at their original module URLs through a temporary Node loader; after measurements used HEAD's `truth_run.mjs` with only the g078 hunks and the g078 modules. The existing working-tree g076 harness gave the same counts.

## Evidence: what the two tables say

Source: `tools/corpus/plan-sets/fayette_ga_2419_addendum1_plans.pdf`, SHA16 `9dffef61b825368d`. The complete original pdf.js text-item fixtures are already checked in under `weyland-subx-worker/test/fixtures/g070/`. They include adjacent notes, drawings, title blocks and annotations. The new test reuses both complete pages, without replacing them with invented rows. The small g078 rule fixtures contain original pdf.js geometry intersecting each schedule's bounding box; both produce byte-identical B rows to the complete page geometry.

Page 5 is titled **SPECIFICATIONS**, and the table itself is explicitly headed **DOOR SCHEDULE**, followed by the decoded, truncated caption `- NOTE: PROVIDE FRAME INSUL`. It is a door schedule with material/finish/frame columns, not a list of 27 additional openings or a hardware-set list. Decoded headers are:

```text
DOOR NO. | DOOR SIZE | DOOR TYPE | DOOR | DOOR FINISH | FRAME
```

The page is 2592 × 1728 PDF points. Header positions run from x=2248.9 to 2561.5 at y=1076.0. The recovered grid extends to x=2843, beyond the page width, and overlaps title-block text. That explains why inspecting the rendered sheet is not sufficient to read this table and why title-block words contaminate some extracted fields. The following is a transcription from positioned pdf.js items, grouped by the mark's baseline (±4 pt) and the table text height. It is **not** the readers' already-contaminated field output:

```text
101A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
102A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
103A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
104A | 3'-0" x 7'-0" | B | INSUL. | P.T. | H.M.
104B | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
105A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
106A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
107A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
110A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
110B | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
111A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
112A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
113A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
114A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
114B | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
115A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
116A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
117A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
118A | 3'-0" x 7'-0" | C | INSUL. | P.T. | H.M.
118B | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
119A | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
119B | 3'-0" x 7'-0" | C | H.M. | P.T. | H.M.
119C | 3'-0" x 7'-0" | C | INSUL. | P.T. | H.M.
119D | 3'-0" x 7'-0" | C | INSUL. | P.T. | H.M.
120A | 4'-6" x 7'-0" | D | H.M. | P.T. | H.M.
121A | 3'-0" x 7'-0" | A | H.M. | P.T. | H.M.
122A | 3'-0" x 7'-0" | C | INSUL. | P.T. | H.M.
201A | 6'-0" x 6'-8" | E | INSUL. | P.T. | H.M.
```

The `201A` line is followed by `ACCESS DOOR TO ATTIC MECHANICAL ROOM`. It is real decoded text, but neither current reader emits it as a separate row; A instead carries some of its text into 122A. Thus the text inventory on page 5 contains **28 numbered lines**, while both readers return **27 rows**. This task fixes identity/counting after reading, not that pre-existing missing-row/parser defect.

Page 14 is sheet **A3.2**, titled **DOOR SCHEDULE**, with the following decoded headers:

```text
DOOR ID | LEAF | Nominal W x H Size | THK. | Door Type | Frame Type | Hardware Set | Fire Rating | Remarks
```

Its decoded populated row cells are below. The last six columns are blank on these rows; the two placeholders and C.O. are included here to show all printed table evidence. The original `118b` is lowercase; both readers normalize it to `118B`.

```text
## | Single | 1'-10 1/8"×4'-0"
## | Single | 2'-6"×4'-0"
101A | Single | 3'-0"×7'-0"
102A | Single | 3'-0"×7'-0"
103A | Single | 3'-0"×7'-0"
104A | Single | 3'-0"×7'-0"
104B | Single | 3'-0"×7'-0"
105A | Single | 3'-0"×7'-0"
106A | Single | 3'-0"×7'-0"
107A | Single | 3'-0"×7'-0"
110A | Single | 3'-0"×7'-0"
110B | Single | 3'-0"×7'-0"
111A | Single | 3'-0"×7'-0"
112A | Single | 3'-0"×7'-0"
113A | Single | 3'-0"×7'-0"
114A | Single | 3'-0"×7'-0"
114B | Single | 3'-0"×7'-0"
115A | Single | 3'-0"×7'-0"
116A | Single | 3'-0"×7'-0"
117A | Single | 3'-0"×7'-0"
118A | Single | 3'-0"×7'-0"
118b | Single | 3'-0"×7'-0"
119A | Single | 3'-0"×7'-0"
119B | Single | 3'-0"×7'-0"
119C | Single | 3'-0"×7'-0"
120A | Single | 3'-0"×7'-0"
121A | Single | 3'-0"×7'-0"
122A | Single | 3'-0"×7'-0"
C.O. | C.O. | 3'-0"×7'-0"
```

All **26 numbered marks emitted from page 14 occur on page 5**, in the same order. There are no conflicting site/building/floor labels. Twenty-five of those marks have the same decoded 3′0″ × 7′0″ size on both pages. **120A differs: 4′6″ × 7′0″ on page 5, 3′0″ × 7′0″ on page 14.** Both list 116A as 3′0″ × 7′0″. Page 5 alone supplies 119D among the emitted rows, and its extra decoded 201A is not recovered. Page 14's type/material/hardware fields are blank, rather than a second set of door definitions.

The evidence supports a repeated/auxiliary version of the same door inventory. It does not establish revision chronology: project dates are placeholders. The explicit dedicated-sheet precedence rule selects page 14 for the 26 common marks, retains 119D from page 5, and preserves the displaced page-5 readings as evidence. It does not infer that an absent mark was deleted.

Both pages were freshly rendered with Poppler at 45 dpi and inspected. Page 5's specifications title and page 14's schedule title are legible, but embedded-font glyphs are broken; Poppler reports `Embedded font file may be invalid` and cannot create `CUKZUZ+CourierNewPSMT`. The rows above are decoded text evidence, not a claim of visual certification. **27 is the union of recovered numbered openings, not a certified total of every building opening.** The missed 201A, two `##` lines and C.O. remain outside the count.

## Shared rule and application

`tools/accuracy/truth/openings.mjs` applies one rule to every PDF, independently for each reader. There are no project names, hashes, fixed sheet numbers, or Fayette page coordinates in its logic.

1. Normalize the mark; only compare occurrences on different pages. Two rows on the same page can never be folded into one opening. Repeated pages match one source row per page to an opening; matching field values are preferred when same-mark rows are reordered. Multiplicity is never less than the largest count on any contributing page (g044).
2. Explicitly different site names/addresses in title blocks, building labels, floor/level labels, or row scope mean separate openings. A missing scope cannot transitively join two incompatible known scopes: every contributing row must be compatible with every other one.
3. Within a compatible scope, treat the pages as a repeated inventory when at least **two distinct marks** repeat and they cover **80% of the smaller page inventory**. Revisions may disagree on individual fields, including room names. A lone collision or weaker overlap requires identical compared door fields plus a nonempty positive width and height; otherwise retain separate unresolved occurrences. A mark alone never proves identity.
4. Choose the whole row from the highest-ranked page: a dedicated DOOR SCHEDULE sheet, then a schedule heading, then an unclassified sheet, then SPECIFICATIONS/GENERAL NOTES. The ancillary title-block label is recognized even when an overprinted sheet number prevents normal title-block parsing. At equal authority, lower PDF page number is a deterministic tie-break, not a claim about chronology. Blank authoritative fields are retained; fields are not assembled from different versions to manufacture agreement.
5. Retain all original source rows and changed field names. Page/mark/occurrence aliases align a reader's fallback source with the other reader's preferred source once, preserving field disagreements. No reader lends rows, fields or inventory decisions to the other.

The shared loader returns canonical `doorsA`/`doorsB`, raw `doorRowsA`/`doorRowsB`, and `doorResolution`. `truth_run.mjs` reports openings in `readers.*.doors`, raw rows in `readers.*.door_rows`, and records page scope, decisions, selected sources and conflicts under `door_resolution`. Agreement, calibration, and oracles consume the canonical opening rows. Candidate schedule-page reporting still includes all raw source pages.

`placement_run.mjs` already uses that same loader. `buildPlacement` also resolves raw callers, counts openings in `marks_total`/`marks_placed`, keeps the authoritative card, and prints both original source rows in a placed tag's `schedule_rows`. Plan matching uses all contributing source pages for title-block association; it does not discard the source page which previously matched the floor plan. The plan oracle now preserves this identity metadata. Distinct unresolved openings do not silently share one tag, and within-page shared marks still require k separate tag positions.

Berryessa demonstrates the two-opening case. Its pages 284, 286 and 288 are all A9.2 DOOR SCHEDULE sheets, but their title blocks identify **Majestic Way Elementary School**, **Brooktree Elementary School**, and **Summerdale Elementary School**, with different addresses. Reused marks remain separate: **24 openings**, not 16. An initial overbroad overlap-only candidate exposed that loss; the delivered rule and tests preserve explicit site identity.

This is an explicit conservative evidence rule, not a learned site classifier. Incomplete labels and ambiguous lone collisions can leave unresolved duplicates. Equal-authority revision chronology is not inferred. The full harvest must still be measured on the Mac.

## Measurements

Node **v26.3.0**, `/opt/homebrew/Cellar/node/26.3.0/bin/node`; all inputs local. The final exact-base run was started at **2026-10-11 04:43:04 UTC**, with all four before/after truth records complete by **04:43:13 UTC** (checked against the clock at **04:43:24 UTC**). Placement run clocks are recorded in the logs. These parallel measurements are correctness measurements, not a speed benchmark.

| Set | SHA16 | Rows A/B before → after | Openings A/B before → after | Agreed doors before → after | Placed/total before → after |
|---|---|---:|---:|---:|---:|
| Fayette | `9dffef61b825368d` | 53/53 → 53/53 | 53/53* → 27/27 | 47 → 25 | 25/53 → 25/27 |
| Rockford | `f0e863d88ea688ff` | 65/65 → 65/65 | 65/65* → 65/65 | 65 → 65 | 64/65 → 64/65 |
| Berryessa | `dd339f57b51538ed` | 24/24 → 24/24 | 24/24* → 24/24 | 24 → 24 | 24/24 → 24/24 |
| WeylandAI Building (vector) | `4847b09e633103f7` | 48/48 → 48/48 | 48/48* → 48/48 | 48 → 48 | 48/48 → 48/48 |

`*` Before `readers.*.doors` called each extracted row a door. In Fayette's 53 emitted rows the actual unique-mark union was already **27**; the before harness did not compute that union. After, raw rows remain **53/53**, while counted openings become **27/27**. Before page-local agreement was **22/27 on page 5 + 25/26 on page 14 = 47/53**. After canonical agreement is **25/27**: the 25 agreeing authoritative page-14 rows, plus two disputed openings. The remaining disputes are 119D's contaminated door type (`C PROJECT DATE:` vs `PROJECT C`) and 122A's height (A null vs B 84). A's 201A miss and page-14 C.O. continuation defect are not hidden or fixed.

Fayette still places **25** openings, with **116A and 119D unplaced**. Its denominator changes **53 → 27**; rate **47.17% → 92.59%**. No new plan position is invented. The SightX-ready flag changes false → true under its existing 90%/scale/room rule. Across the four sets placement changes **161/190 → 161/164**. All available audited/synthetic calibration objects are exactly unchanged, and all tiers remain unchanged. The queue changes **11 → 6** entries.

The unchanged comparison command exits **1**:

```text
| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 9dffef61b825368d | 27 | 27 | 47 | 25 | agreed | agreed | 🚨 REGRESSION
REGRESSION: missing coverage, audited calibration loss, or a set lost agreed rows or a tier; regenerate missing records. Name accepted drops with --allow <sha,...> and record why in plan/decisions.md.
```

That flag is the intended change from duplicate agreement rows to opening agreement, not a waived comparison. No `--allow`, comparison edit, or committed-record replacement was used.

### All 29 unavailable harvest keys

The four repository keys above were measured using `--non-harvest --only ...`. Each remaining key was resolved against its stored input metadata; its harvest PDF is absent in this clone. None was downloaded, regenerated, copied from stored truth into fresh output, or represented as a successful measurement.

| Harvest key | SHA16 | Measurement |
|---|---|---|
| C2410 C3 | `3506f831094dd516` | PDF absent; not run |
| C2410 addendum C3 | `194733de48af8797` | PDF absent; not run |
| X2207 | `eefa018e007e581f` | PDF absent; not run |
| C2512 | `7239a04e6cc8b502` | PDF absent; not run |
| SOC-250003 | `21d60f1b54e0e3df` | PDF absent; not run |
| T2504 | `e3d0cc1bc22fd824` | PDF absent; not run |
| T2147 | `89236ffa156fbaf5` | PDF absent; not run |
| U2607 | `44111d93bd635936` | PDF absent; not run |
| R2502 | `7478006f7fd5b43c` | PDF absent; not run |
| X2530 | `18b27b8baa47f0e1` | PDF absent; not run |
| T2507 | `192a16af8f31ae0c` | PDF absent; not run |
| T2421 | `66a4b9f32d9fc75b` | PDF absent; not run |
| C2419 | `4af80165bc367de8` | PDF absent; not run |
| W2501 | `6742faed77cfde33` | PDF absent; not run |
| T2612 | `e75d52a7a714c978` | PDF absent; not run |
| X2404 rebid | `6e7e2d2bf65c383b` | PDF absent; not run |
| X2404 | `70ab5446590e40cc` | PDF absent; not run |
| O2544 Scruggs | `72bedaaba4d51d4f` | PDF absent; not run |
| Mary Jane Thurston cabins | `0da96f79112b83dc` | PDF absent; not run |
| Averill Elementary | `5ca1073ee12bc860` | PDF absent; not run |
| F2402 | `8900a915fe932a31` | PDF absent; not run |
| O2604 | `43a1f0db3f7ff345` | PDF absent; not run |
| E2332 | `3b0cb226a793d955` | PDF absent; not run |
| E2332 copy | `e8a888bdd7523b77` | PDF absent; not run |
| R2508 | `ff9c494916a7d8b5` | PDF absent; not run |
| X2319 (4+4) | `32b631d235082c7c` | PDF absent; not run |
| X2319 (5+7) | `400e8c6b5df592d0` | PDF absent; not run |
| T2332 | `08222a6152c7525b` | PDF absent; not run |
| R2402 | `8c336c43fa7f9668` | PDF absent; not run |

## Tests and reproduction

- `node --test tools/accuracy/truth/openings.test.mjs tools/accuracy/placement.test.mjs weyland-shared/plan-read.test.mjs`: **29/29 pass**, including nine new rule tests. Both original Fayette text-item pages exercise A, B, canonical agreement and the shared A-only loader. Synthetic cases pin site/building/floor separation, repeated inventories with changed size/room, unmatched collisions, fallback-source agreement, no transitive scope bridge, authoritative placement cards, and k positions for k same-page rows.
- Six independent B suites (`truth/reader_b`, g050, g051, g057, g060, g064): **18/18 pass**.
- `node --test weyland-subx-worker/test/*.test.mjs`: **235/235 pass**. The initial attempt without installed `pdf-lib` reported 149 pass / 14 failed test files. Retrying with an existing local dependency tree under `tmp/g072/deps/node_modules` passed; no installation/network was used. The temporary worker node_modules link was removed afterward.
- `git diff --check` and a standalone patch application check against HEAD pass. The original g076 delta remains intact. No generated truth/placement JSON or scratch output is in the patch.

Run from the merged tree with fresh output directories and Node 26:

```sh
node --test tools/accuracy/truth/openings.test.mjs tools/accuracy/placement.test.mjs weyland-shared/plan-read.test.mjs
node tools/accuracy/truth_run.mjs --non-harvest \
  --only 9dffef61b825368d,f0e863d88ea688ff,dd339f57b51538ed,4847b09e633103f7 \
  --out /tmp/g078-truth
node tools/accuracy/placement_run.mjs \
  --only 9dffef61b825368d,f0e863d88ea688ff,dd339f57b51538ed,4847b09e633103f7 \
  --out /tmp/g078-placement
# Mac, with the local harvest available: all 33 keys, then the full merge measure.
node tools/accuracy/truth_run.mjs --key-sets tools/accuracy/key_sets.json --out /tmp/g078-keys
```

For this sandbox's exact-base before/after, `tmp/g078/use-base.mjs` serves saved `git show HEAD:<path>` sources at their original URLs when `G078_TREE=before`; otherwise it substitutes only standalone HEAD+g078 `truth_run.mjs`. Commands use `node --import ./tmp/g078/use-base.mjs` with the selections above. The before and after outputs live in `tmp/g078/base-before/` and `tmp/g078/base-after/`. The delivered patch carries the actual source changes and tests; these loader helpers and generated records are scratch evidence only.
