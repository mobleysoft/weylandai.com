# g049: reader A column shifts (g042 class C2)

Cloud session, 2026-10-10. Branched from `claude/g048-table-end-rows` (#114), because T2147 p.42 needs g048 to read its 16 rows. Harvest PDFs read from R2. The truth is the rendered pages (`tools/accuracy/g042/spot-checks.md`, plus a render of T2507 A-103 checked here).

## The four C2 cases, as the sheets print them, and how reader A now reads them

| case | before (g048 reader) | now |
|---|---|---|
| T2504 e3d0cc1bc22fd824 A-601, door 100 | fire "J4", hardware none, width null | jamb J4, fire blank, hardware 09, width 36, pair |
| T2504 door 101 | fire "J1 90 MIN.", hardware none | jamb J1, fire 90 MIN., hardware 04 |
| T2504, all 22 | 13 sized, 0 with a hardware set | 22 sized, 22 with a hardware set |
| T2147 89236ffa156fbaf5 A601/A602 | 0 of 29 sized; 129C had 160's head, jamb and hardware | 29 of 29 sized (102A 144 x 168); 129C 10/A601, 1/A501, 5; 160 1/A601, 5/A601, 2 |
| R2502 7478006f7fd5b43c A-122, PT101 | type TYP-1, height null, fire "09.08" | type HM-1(PR), 96 x 88, frame TYP-1, head 3/A-602, jamb 6/A-602, sill 8/A-602, fire blank, hardware 09.08 |
| X2530 18b27b8baa47f0e1 A-101, 100-1 and 100-2 | hardware "1 REQUIRED: FIRE RATED" | hardware 1, comments "REQUIRED: FIRE RATED LOUVER" |

## Causes and fixes (schedule-text-layer.mjs; the served .bin is byte-identical)
1. **Sparse-column rule fired on centred headers (T2504 HARDWARE SETS).** Values left-aligned under a centred label looked like "the column before stops short", so an empty column was made for the label. The split now needs the values left of the label to have a label of their own. A group label with sub-labels beneath it (SIZE over WD | HGT) never makes a column.
2. **Two labels over one column span (T2504 JAMB, RATING).** The rating column has too few values to start a column. The span now splits where the second label's values begin, when nothing under the first runs into them.
3. **"PR 3' - 0"" in a WIDTH cell (T2504).** Read as the leaf width (36), with `pair` set. The printed size keeps "PR".
4. **Field-line labels cut off by a wide gap (T2147 A602: WIDTH HEIGHT THICKNESS, 311 pt left of HEAD ...).** The field line is re-cut to the header's final extent.
5. **Offset lines (T2147 A601).** Frame, details and hardware print 6 pt above each mark's baseline. A line with no mark goes to the row whose mark line is nearer, but only when the row above already has cells of its own. A mark printed over two lines ("1A105 TO" above its data, "1A116" below, the C3 range rows) keeps its data on the first line, as before.
6. **One- or two-row tables (R2502 A-122: PT101 alone).** There are too few values to find columns by, so the bounds sit midway between the labels on the header's bottom line.
7. **Comments running past the last label (X2530 "... LOUVER").** The last column keeps words that continue it closely.
8. **Labels below the field line (T2507 A-103: WD | HGT under SIZE).** These are header, not data, and WD reads as width. Before, T2507 read 0 of 49 sizes and put "EXIST" (the frame type) in the hardware set. The render shows SET NO. empty and the notes "1".

## Regression check: every field on 16 sets (fields.mjs)
`node tools/accuracy/g049/fields.mjs <pdf dir> <out.json>`: the g042 spot-check sets and the ten SightX sets, with the g048 reader (fields-before.json) and this branch's (fields-after.json).

**Marks are identical on every page.** Rows with width and height, before → after:

| set | page | sized before → after | other field changes |
|---|---|---|---|
| T2504 | 18 | 13 → 22 | jamb, fire, hardware, pair (the case) |
| T2147 | 42 / 43 | 0 → 16 / 0 → 13 | details, hardware (the case) |
| R2502 / rebid | 32 | 0 → 1 / 0 → 1 | PT101 (the case) |
| X2530 | 18 | 18 | hardware on 100-1, 100-2 (the case) |
| T2507 | 10 | **0 → 49** | frame type EXIST; hardware blank as printed |
| C2512 | 63 | 68 | hardware "12 ⚫" → "12" (the ⚫ is the CARD READER column) |
| T2502 | 13 | 5 | frame type now read (ALUMINUM, HM/FRP), as printed |
| T2331 | 16 | 4 | OVHD-1 to 4 door type "OVHD" (its overhead table's DOOR & TYPE) |
| all others | | same | none |

Not fixed here, and unchanged:
- C2512 door 100 reads "7'-0" x 3'-0"".
- T2423's table has no title on main as well (rows unaffected).
- C3 range rows and C2419's rotated headers are separate goals.

## Tests
- **`weyland-subx-worker/test/real-set-schedules.test.mjs`: 10 of 10 (5 new).** Fixtures are whole-page lines for T2147 A602, R2502 A-122, X2530 A-101 and T2507 A-103.
- **Mutation checks: removing each fix fails at least one test.**

  | fix removed | test that fails |
  |---|---|
  | own-header rule | 6 |
  | two-label split | 6 and 9 |
  | PR width | 6 |
  | field-line re-cut | 7 |
  | offset lines | 7 |
  | tiny-table bounds | 8 |
  | last-column continuation | 9 |
  | sub-header lines | 10 |
- **weyland-subx-worker `node --test`: 188 of 189.** The remaining failure is `generated-mark-scan` (this container's renderer reads A07 as "AQ7"; see g046).
- **Others:** sightx 27/27, plan-read 10/10, estimator-assertions 11/11.
