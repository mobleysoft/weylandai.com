# g066: placement records for every eligible set

Base: `origin/main` / `94d110347b28d5a854e214a86e1b34f9d91c9039`. Measured on 2026-10-10 with Node v20.20.2 in the supplied detached clone. Git metadata is read-only under the supplied sandbox; changes stay in the working tree with patches in the requested sibling `g066/` handoff directory. No PR, deployment, or repository commit was made.

## What changed

- `tools/accuracy/truth/load_set.mjs` factors PDF page loading, candidate selection, reader calls, and OCR handling out of `truth_run.mjs`. Defaults retain both readers and hardware; placement requests only reader A door rows.
- `placement_run.mjs` selects truth tiers `agreed,exact,audited,oracle-checked` with an applicable `marks_on_plan` oracle, verifies the PDF content hash, loads pages and reader A rows, and calls the existing `readPlan`. Missing files, hash mismatches, reader errors and regressions fail the run.
- `placement.mjs` builds the deterministic records, applies the SightX-ready rule and supplies shared report formatting. `placement_report.mjs` writes the full table and prints the top twenty.
- 35 initial placement records are included under `tools/corpus/harvest/placement/`; no truth records were changed. Reader A, reader B, oracle pass/fail logic, `weyland-shared/plan-read.js` and `ventures.json` are unchanged. No dependency, API or CDN was added.

## Record contract

Coordinates and dimensions are PDF viewport points, with the origin at the upper left and y increasing downward. Pages are one-based. Sheets carry `width`, `height`, printed `scales`, and all distinct numeric `points_per_foot` values as a sorted array, or `null` when no scale is announced. Rooms and tags carry the existing reader’s locally selected numeric scale, or `null`. No extra field was needed in `readPlan`; dimensions come from the shared loaded pages and tag text height already exists.

Card fields use reader A’s names and values: `size`, `width_inches`, `height_inches`, `pair`, `door_type`, `material`, `frame_type`, `hardware_group`, `fire_rating`, `location`, and any additional fields returned for the row. The current harness reader A does not expose a `remarks` field or a separate frame material; this change does not invent or reconstruct either. The actual schedule row objects linked by `readPlan` are retained as `schedule_rows`, including their schedule `page` and `y`. At the tag’s top level, `page` and `y` refer to its plan placement. When one tag covers rows from multiple schedule pages, its first row supplies the flat card and all rows remain available in `schedule_rows`.

Using the reader’s row identities preserves distinct card values for shared marks such as T2507’s two 132A openings. `room_by`, `unsure`, `shared_mark`, `note`, and `door_pages` survive when present; `matched_by` is `exact` when the plan reader supplies no special matching method, and absent `also_on` becomes `[]`. Shared-mark ordering remains explicitly assumed, as in the existing reader.

`marks_total` and `marks_placed` count schedule rows, matching the oracle rather than necessarily the number of tag objects. `set.rows_total` remains the committed truth record’s row count, which can include hardware items. Unplaced rows retain the oracle’s exact failure wording. `placed_rate` stores the unrounded ratio, or `null` for zero rows; the readiness threshold is tested before display rounding.

Every object’s keys are recursively sorted. Sheets sort by page/sheet, rooms and tags by page/y/x then number or mark, and missing marks by schedule page/mark. `also_on` and sheet scale values are sorted. Schedule-row order remains the reader’s order. Records contain no timing or generation timestamp. Timings are logged outside the records.

## Commands and totals

```sh
node tools/accuracy/placement_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads
node tools/accuracy/placement_report.mjs
node tools/accuracy/placement_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 7478006f7fd5b43c,43a1f0db3f7ff345,192a16af8f31ae0c --check
```

Processed **35/35 eligible sets**, **18 SightX-ready**, **759/949 marks placed (79.98%)**; zero errors. Eligible tiers: 23 agreed, 9 oracle-checked, 2 audited, 1 exact. The other 51 records in the chosen tiers have no applicable `marks_on_plan` oracle.

Four eligible PDFs are not in the downloads directory: `dd339f57b51538ed`, `f0e863d88ea688ff`, `9dffef61b825368d`, and `4847b09e633103f7`. They were read from the existing corpus/bidset paths in their truth records. All PDFs passed the hash check. The runner prefers `<dir>/<sha16>.pdf`, then the recorded basename in that directory, then a recorded path inside this repository.

First full run: **60.662 s** wall-clock, `2026-10-10T09:51:09.245Z` to `2026-10-10T09:52:09.907Z`. Independent full rerun: **61.236 s**; all 35 files byte-identical. Per-set wall-clock includes file read/hash, PDF loading, page extraction, reader A, `readPlan`, record writing and PDF cleanup. Total additionally includes discovery and reporting. Durations use `performance.now()` and timestamps use the system clock.

Full report: [`tools/accuracy/placement_report_2026-10-10.md`](../tools/accuracy/placement_report_2026-10-10.md). Top twenty (rate descending, then total marks descending, then sha16):

| sha16 | label | tier | marks placed/total | placed_rate | sheets with scale/sheets | rooms | SightX-ready |
|---|---|---|---:|---:|---:|---:|---|
| 192a16af8f31ae0c | missouri_oa_fmdc - _T2507-01%20Final%20Bid%20Plans.pdf | agreed | 49/49 | 100.00% | 3/3 | 151 | yes |
| 4847b09e633103f7 | The WeylandAI Building, generated by tools/bidset/make.mjs | exact | 48/48 | 100.00% | 1/1 | 0 | no |
| 15b85ca679307cc1 | missouri_oa_fmdc - _REBID%20T2421-01-%20Final%20Plans.pdf | agreed | 33/33 | 100.00% | 2/2 | 38 | yes |
| 4908fa633a44f761 | missouri_oa_fmdc - _T2421-01%20-%20Final%20Plans.pdf | agreed | 33/33 | 100.00% | 2/2 | 38 | yes |
| 681fee601a3c34b1 | missouri_oa_fmdc - _T2505-01%20Final%20Bid%20Plans.pdf | agreed | 26/26 | 100.00% | 3/3 | 127 | yes |
| dd339f57b51538ed | Berryessa Union School District — Bid B-09-2023-24 Interior Door Replacement (3 elementary schools) | audited | 24/24 | 100.00% | 3/3 | 274 | yes |
| e3d0cc1bc22fd824 | missouri_oa_fmdc - _T2504-03%20-%20Final%20Plans.pdf | agreed | 22/22 | 100.00% | 2/2 | 54 | yes |
| 3506f831094dd516 | missouri_oa_fmdc - _C2410-01%20-%20Final%20Plans.pdf | agreed | 16/16 | 100.00% | 9/9 | 663 | yes |
| 6742faed77cfde33 | missouri_oa_fmdc - W2501-01_5001_7815001008_Bid%20Documents_01-07-2026.pdf | agreed | 11/11 | 100.00% | 3/3 | 72 | yes |
| 2b7024ad75f57ddf | missouri_oa_fmdc - _T2331-01%20Final%20Bid%20Plans.pdf | agreed | 8/8 | 100.00% | 1/1 | 6 | yes |
| 6e7e2d2bf65c383b | missouri_oa_fmdc - _X2410-01%20Final%20Bid%20Plans_Rebid.pdf | agreed | 8/8 | 100.00% | 8/8 | 45 | yes |
| 70ab5446590e40cc | missouri_oa_fmdc - _X2410-01%20Final%20Bid%20Plans.pdf | agreed | 8/8 | 100.00% | 8/8 | 45 | yes |
| 8900a915fe932a31 | missouri_oa_fmdc - _F2402-01%20Final%20Bid%20Plans_0.pdf | agreed | 8/8 | 100.00% | 1/1 | 7 | yes |
| 43a1f0db3f7ff345 | missouri_oa_fmdc - _O2604-01%20Final%20Bid%20Plans.pdf | agreed | 7/7 | 100.00% | 1/1 | 1 | no |
| 8a99839626a199c6 | missouri_oa_fmdc - _R2410-01%20Final%20Bid%20Plans.pdf | agreed | 2/2 | 100.00% | 0/9 | 0 | no |
| 8c336c43fa7f9668 | missouri_oa_fmdc - R2402-01%20Bid%20Drawings%20Compiled.pdf | oracle-checked | 2/2 | 100.00% | 1/1 | 17 | yes |
| ff9c494916a7d8b5 | missouri_oa_fmdc - _R2508-01%20-%20Final%20Plans.pdf | oracle-checked | 2/2 | 100.00% | 2/2 | 9 | yes |
| 7478006f7fd5b43c | missouri_oa_fmdc - _R2502-01%20Final%20Bid%20Plans.pdf | agreed | 208/211 | 98.58% | 4/4 | 169 | yes |
| f0e863d88ea688ff | Rockford Board of Education — Bid 26-27 Addendum One (complete) | audited | 64/65 | 98.46% | 2/2 | 153 | yes |
| 7239a04e6cc8b502 | missouri_oa_fmdc - _C2512-01%20Final%20Bid%20Plans.pdf | agreed | 70/75 | 93.33% | 4/4 | 127 | yes |

## Spot checks

Tables count primary tag placements; secondary sheet names remain in each tag’s `also_on`. The first five tags are shown for each plan sheet with tags, in record order. Heights below are rounded to six decimals for readability; JSON retains the original numeric precision. Room names are quoted as the reader reads them.

### 7478006f7fd5b43c

Label: `missouri_oa_fmdc - _R2502-01%20Final%20Bid%20Plans.pdf`. Placement 208/211; rooms 169; scales on 4/4 sheets.

| Page | Sheet | Width × height (pt) | Scale values (pt/ft) | Rooms | Primary tags | Tags with room |
|---:|---|---|---|---:|---:|---:|
| 23 | A-105 | 2592.24 × 1728.24 | 9 | 42 | 53 | 53 |
| 24 | A-106 | 2592.24 × 1728.24 | 9 | 60 | 77 | 77 |
| 25 | A-107 | 2592.24 × 1728.24 | 9 | 65 | 77 | 77 |
| 28 | A-112 | 2592.24 × 1728.24 | 18, 72, 108, 216 | 2 | 1 | 0 |

| Page / sheet | Mark | x | y | h | Room | Room name | room_by |
|---|---|---:|---:|---:|---|---|---|
| 23 / A-105 | 112A | 1116 | 215 | 9.510680 | 112 | VESTIBULE | schedule_location |
| 23 / A-105 | 112B | 1116 | 282 | 9.510680 | 112 | VESTIBULE | schedule_location |
| 23 / A-105 | 103B | 1338 | 391 | 9.510680 | 101B | EXIST RR | schedule_location |
| 23 / A-105 | 128B | 336 | 392 | 9.510680 | 126B | RR | schedule_location |
| 23 / A-105 | 126B | 422 | 392 | 9.510680 | 126B | RR | schedule_location |
| 24 / A-106 | 232C | 1075 | 303 | 9.510680 | 232 | LIVING ROOM | schedule_location |
| 24 / A-106 | 232B | 1037 | 317 | 9.510680 | 232B | RR | schedule_location |
| 24 / A-106 | 218B | 411 | 393 | 9.510680 | 218B | EXIST RR | schedule_location |
| 24 / A-106 | 221B | 1269 | 393 | 9.510680 | 221 | EXIST DORM | schedule_location |
| 24 / A-106 | 223B | 1334 | 393 | 9.510680 | 221B | EXIST RR | schedule_location |
| 25 / A-107 | 332C | 1030 | 302 | 9.510680 | 332C | BEDROOM | schedule_location |
| 25 / A-107 | 332D | 1114 | 302 | 9.510680 | 332D | BEDROOM | schedule_location |
| 25 / A-107 | 332B | 1037 | 318 | 9.510680 | 332B | RR | schedule_location |
| 25 / A-107 | 320B | 346 | 393 | 9.510680 | 318B | EXIST RR | schedule_location |
| 25 / A-107 | 318B | 410 | 393 | 9.510680 | 318B | EXIST RR | schedule_location |
| 28 / A-112 | AD102 | 152 | 963 | 9.510680 | null | WOMENS RESTROOM | schedule_location |

Unplaced: mark AD101 (schedule p.28) not tagged on any plan; mark PT101 (schedule p.32) not tagged on any plan; mark 102 (schedule p.45) not tagged on any plan.

### 43a1f0db3f7ff345

Label: `missouri_oa_fmdc - _O2604-01%20Final%20Bid%20Plans.pdf`. Placement 7/7; rooms 1; scales on 1/1 sheets.

| Page | Sheet | Width × height (pt) | Scale values (pt/ft) | Rooms | Primary tags | Tags with room |
|---:|---|---|---|---:|---:|---:|
| 6 | A111 | 2592 × 1728 | 9 | 1 | 7 | 0 |

| Page / sheet | Mark | x | y | h | Room | Room name | room_by |
|---|---|---:|---:|---:|---|---|---|
| 6 / A111 | 301 | 459 | 104 | 9.599516 | null | null | null |
| 6 / A111 | 302 | 738 | 104 | 9.599516 | null | null | null |
| 6 / A111 | 201 | 459 | 1163 | 9.599516 | null | null | null |
| 6 / A111 | 202 | 598 | 1163 | 9.599516 | null | null | null |
| 6 / A111 | 203 | 738 | 1163 | 9.599516 | null | null | null |

Unplaced: none.

This set is **not SightX-ready**: all seven marks are placed and a scale exists, but none of its tags has a room. One detected room label alone does not satisfy the rule.

### 192a16af8f31ae0c

Label: `missouri_oa_fmdc - _T2507-01%20Final%20Bid%20Plans.pdf`. Placement 49/49; rooms 151; scales on 3/3 sheets.

| Page | Sheet | Width × height (pt) | Scale values (pt/ft) | Rooms | Primary tags | Tags with room |
|---:|---|---|---|---:|---:|---:|
| 7 | A-100 | 2592 × 1728 | 9, 108 | 63 | 49 | 48 |
| 8 | A-101 | 2592 × 1728 | 9 | 44 | 0 | 0 |
| 11 | A-104 | 2592 × 1728 | 18, 54, 108 | 44 | 0 | 0 |

| Page / sheet | Mark | x | y | h | Room | Room name | room_by |
|---|---|---:|---:|---:|---|---|---|
| 7 / A-100 | 131B | 1650 | 474 | 15.526015 | 131 | EXCERCISE ROOM | schedule_location |
| 7 / A-100 | 100A | 666 | 513 | 15.526015 | 100 | CAN WASH | schedule_location |
| 7 / A-100 | 101A | 709 | 544 | 15.526015 | 101 | SCULLERY | schedule_location |
| 7 / A-100 | 132A | 1259 | 555 | 15.526015 | 132 | DRILL FLOOR | schedule_location |
| 7 / A-100 | 133A | 1275 | 582 | 15.526015 | 133 | SUPPLY OFFICE | schedule_location |

Unplaced: none.

All 49 primary tags are on A-100. The two 132A rows keep their separate coordinates/card fields and the reader’s `shared mark, order assumed` warning. A-101 and A-104 still retain their detected rooms and scales.

Render any listed page on the Mac with Poppler (example commands):

```sh
pdftoppm -r 60 -f 23 -l 23 -png /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/7478006f7fd5b43c.pdf /tmp/g066-r2502
pdftoppm -r 60 -f 6 -l 6 -png /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/43a1f0db3f7ff345.pdf /tmp/g066-o2604
pdftoppm -r 60 -f 7 -l 7 -png /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/192a16af8f31ae0c.pdf /tmp/g066-t2507
```

At 60 dpi, multiply x/y in points by `60/72` to locate them on the rendered page. No rendered-sheet visual spot check was performed in this task; these are the requested coordinates for the Mac check.

## Regression and compatibility checks

`--check` reruns the selected eligible sets without writing placement records. It reads the committed baselines from `HEAD`, ignoring staged or working-tree placement changes. Any lower `marks_placed`, missing committed selected record, or processing failure makes the command exit nonzero. New records are measured and explicitly reported as having no committed baseline. The supplied base has no placement records yet: the three-set CLI check returned success with zero committed baselines, not a claim of protection against a pre-existing baseline. The test creates a temporary Git repository, commits a synthetic placement baseline, changes its working-tree copy, and verifies a placement loss fails while leaving the working file untouched. Once these initial records are committed, they become the baselines.

Before editing and after factoring, ran the required truth command with `--out` directed to separate sibling handoff directories, so no tracked truth file or queue was written:

```sh
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 7478006f7fd5b43c,43a1f0db3f7ff345 --out ../g066/baseline
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 7478006f7fd5b43c,43a1f0db3f7ff345 --out ../g066/after
```

Only the lines for `ms` and `generated_at` were removed for comparison; all remaining bytes, including key order, whitespace and numbers, match. `queue.jsonl` is byte-identical (218 lines). Normalized SHA-256:

| sha16 | Before and after SHA-256 | Before ms | After ms |
|---|---|---:|---:|
| 7478006f7fd5b43c | `d0af0cb974c374c118ed295e2dc08f7953ab3b579c6a18418c6cfdfe7acc4149` | 5160 | 5545 |
| 43a1f0db3f7ff345 | `68b949ec5580fb9b48b5470bbb625dbc16b54e3fe546bfe07bf02d16c2165a60` | 1350 | 1429 |

Tests: **28 passed, 0 failed, 0 skipped**. Synthetic plan fixture covers shape, coordinates, scale/nulls, all reader A fields, missing-mark reasons, determinism, the readiness boundary, shared marks, and repeated schedule pages. The shared loader is exercised with the checked-in generated bidset. Existing plan-reader and reader-B tests also pass. Command:

```sh
TRUTH_BEFORE="$PWD/../g066/baseline" TRUTH_AFTER="$PWD/../g066/after" node --test tools/accuracy/placement.test.mjs tools/accuracy/truth/load_set.test.mjs weyland-shared/plan-read.test.mjs tools/accuracy/truth/reader_b.test.mjs
```

The two real-record equivalence tests and queue test skip with an explicit explanation if the external before/after directories are not supplied. They ran without skipping for this measurement. `git diff --check` passed.

## Existing-data discrepancies and limits

- Committed labels identify `7478006f7fd5b43c` as R2502-01, `f97e99f88a931e74` as R2502-01 REBID, and `192a16af8f31ae0c` as T2507-01. The REBID copy is agreed but its committed plan oracle is inapplicable (no floor-plan title block found), so the requested selection excludes it. No title-block heuristics were changed.
- `9dffef61b825368d` (Fayette) currently reads 27 A door rows and places 25; committed truth records 35 A rows and 25 placed. Running the original `origin/main` truth runner and the factored runner against that same PDF produces byte-identical non-timing records and queues: this discrepancy predates this change. Its placement summary is 25/27; `set.rows_total` remains committed metadata. All other 34 placement totals match their committed plan-oracle total/pass values.
- Reader A’s current card-field exposure and `readPlan`’s detection/association limits remain in effect, including uncertain nearest-room matches and shared-mark order assumptions. The readiness flag is the requested three-condition rule, not a visual audit.

## Wall-clock per set

| sha16 | seconds |
|---|---:|
| 15b85ca679307cc1 | 1.230 |
| 18b27b8baa47f0e1 | 2.489 |
| 192a16af8f31ae0c | 1.006 |
| 2b7024ad75f57ddf | 0.554 |
| 2dcaf854a34b17e8 | 1.075 |
| 32b631d235082c7c | 1.540 |
| 3506f831094dd516 | 0.276 |
| 3b0cb226a793d955 | 2.035 |
| 3fd2388877347d09 | 0.959 |
| 400e8c6b5df592d0 | 2.278 |
| 43a1f0db3f7ff345 | 1.215 |
| 4847b09e633103f7 | 0.030 |
| 4908fa633a44f761 | 2.934 |
| 4af80165bc367de8 | 0.631 |
| 6742faed77cfde33 | 1.094 |
| 681fee601a3c34b1 | 3.561 |
| 6e7e2d2bf65c383b | 2.211 |
| 70ab5446590e40cc | 2.206 |
| 7239a04e6cc8b502 | 7.401 |
| 72bedaaba4d51d4f | 0.328 |
| 7478006f7fd5b43c | 5.027 |
| 8900a915fe932a31 | 1.237 |
| 89236ffa156fbaf5 | 1.627 |
| 8a99839626a199c6 | 1.111 |
| 8c336c43fa7f9668 | 0.289 |
| 9dffef61b825368d | 1.156 |
| d97676451b6159b1 | 2.206 |
| dd339f57b51538ed | 0.822 |
| e3b0c815e132d7ab | 1.486 |
| e3d0cc1bc22fd824 | 1.881 |
| e75d52a7a714c978 | 2.779 |
| e8a888bdd7523b77 | 3.185 |
| eefa018e007e581f | 1.685 |
| f0e863d88ea688ff | 0.515 |
| ff9c494916a7d8b5 | 0.547 |
| **Total** | **60.662** |

Raw logs, per-record SHA-256 values, before/after truth outputs and the patch handoff are in the sibling `g066/` directory. Regenerated truth outputs there are evidence only and are excluded from the patches.
