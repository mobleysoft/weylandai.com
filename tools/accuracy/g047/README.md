# g047: reader B reads the thin-ruled door schedules it read as 0 (class C1)

Goal (Mobley, 2026-10-09 22:32 EDT): reader B finds ruled door schedules it now reads as 0
(eefa018e007e581f, 7239a04e6cc8b502, 21d60f1b54e0e3df, 44111d93bd635936; 222 rows); truth tier of
those sets moves to agreed where A is right. Keep the title-band filter.

## Cause

`tools/accuracy/truth/reader_b.mjs` tableFrom: `crossed(band)` counted the fences crossing a band
from `longV` only (verticals at least 0.3 of the table's height). On these sheets the header's
column dividers are separate short rules (eefa018e p.59: verticals at x 1439…2158 run y 122–135 in
the header, the body rules start at 135, and some sit a point off the body's x), so no long rule
covered a header band. Every header band counted as a title band, no header was read, and the
table was dropped (debug print before the fix: `hdr ["","",…]` on all four).

## Fix

`crossed(band)` counts a fence when any of the table's vertical rules at it (|dx| ≤ 1.5, stroked
or a thin filled bar) covers the band. The filter is kept: a band with no rule inside it
(eefa018e's "DOOR SCHEDULE" title band, crossed only by the two outer frame rules) is still a
title band. That is checked by a test.

Also `tools/accuracy/truth_run.mjs --out <dir>`, which writes the records and the queue to a run
folder instead of tools/corpus/harvest/truth. The default is unchanged.

## Bar: reader B within 2 rows of the eye counts

| Set | page | eye | B before | B after | A | agreed before → after | tier before → after |
|---|---|---|---|---|---|---|---|
| eefa018e007e581f | 59 | 84 | 0 | 84 | 84 | 0 → 78 | oracle-checked → agreed |
| 7239a04e6cc8b502 | 63 | 75 | 0 | 75 | 75 | 0 → 71 | oracle-checked → agreed |
| 21d60f1b54e0e3df | 78 | 19 | 0 | 19 | 19 | 0 → 8 | oracle-checked → agreed |
| 21d60f1b54e0e3df | 88 | 0 (panel schedule; g051 removes it) | 0 | 39 | 0 | – | – |
| 44111d93bd635936 | 17 | 44 | 0 | 44 | 44 | 0 → 44 | oracle-checked → agreed |

The disputed rows are in the queue for review. Where A is wrong, B's reading is the right one:
- **21d60f1b, 11 rows, hardware_group:** A takes the sill detail into the hardware set ("E6/A601 8.0"); B reads "8.0".
- **7239a04e, 4 rows; eefa018e, 6 rows; height_inches:** B reads small openings (36 and 24 in, rows 100 and 200-6). A keeps no height under its 60 in floor.

## Whole harvest: no set loses agreed rows or drops a tier

How it was run:
- Both runs read all 598 harvest PDFs from R2 (weyland-fixtures harvest/<sha16>.pdf).
- Each run used `node tools/accuracy/truth_run.mjs --dir <pdfs> --only <shard> --out <run>`, in two shards per run.
- The before run used origin/main b287aee (reader B as merged). The after run used this branch.

Measured with `node tools/accuracy/truth/compare_runs.mjs <main run> <g047 run>`: **exit 0**, and
the table is [compare-main-run-vs-g047-run.md](compare-main-run-vs-g047-run.md). Changed sets:
- Seven sets gain agreed rows, all from oracle-checked to agreed:
  - the four above;
  - 681fee601a3c34b1: 0 → 26;
  - a4b7b0a81c5a6602: 0 → 14;
  - d97676451b6159b1: B now reads 4 rows; 0 agree; tier unchanged.
- **8c77fa69fc375a81 p.115:** B now reads 8 rows (P-1, RB-1, SV-1, T-3, WD-1 …). This looks like a fixture schedule, not doors. A reads 0, so these are only-B queue rows; the tier stays unread.
- No other set changes.

Against the committed truth, `compare_runs.mjs origin/main:tools/corpus/harvest/truth <g047 run>`
exits 1, with the full table in [compare-committed-truth-vs-g047-run.md](compare-committed-truth-vs-g047-run.md):
- **The two flagged sets, 3506f831094dd516 (9 → 5) and 194733de48af8797 (13 → 11), are not from this change.** The main run shows the same numbers: the committed records predate PR 115's reader A change. g050 restores them.
- **Rows marked "-"** are corpus files, not harvest PDFs, which this run did not read.
- **Sets that gain against the committed truth also include:**
  - 89236ffa156fbaf5: 0 → 29;
  - e3d0cc1bc22fd824: 0 → 22;
  - e3b0c815e132d7ab: 10 → 18;
  - 18b27b8baa47f0e1: 34 → 36.

  These come from reader A's merged g048/g049 work.

## Tests

`node --test tools/accuracy/truth/reader_b.test.mjs`: 5 of 5. Fixtures are each schedule's items
and rules cropped to its box (tools/accuracy/g047/extract-page.mjs, in tools/accuracy/g047/fixtures).
With the old `crossed` the four count tests fail (1 of 5 pass).
