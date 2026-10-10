# g057: reader B on the class C6 sheets (stacked and rotated headers on mixed Missouri OA sheets)

Goal (Mobley, 2026-10-10 00:50 EDT): reader B reads the door rows reader A now reads on the C6 sheets (g055), so that T2421, C2419 and W2501 become agreed.

## Causes, both in `tools/accuracy/truth/reader_b.mjs`

- **C2419-01 A601 p.7 and W2501-01 p.8: rotated column headers.** `wordsOf` dropped every rotated text item. Headers printed upright ("Number", "Width", "Height", "Hardware set") were lost, so no column was a mark, and the table was dropped.
- **T2421-01 A-300 p.3: a shared top rule.** The header's top rule (y 104) runs across the whole sheet (x 108–2322), shared with the schedules to its left. So it was in no table found by matching rule extents. That table started at the first body row (y 138), which left the header out: the first bands read as data ("101 101A 102").

## Fixes

- **Rotated items:** `wordsOf` keeps a ±90° item as one word, marked `rot`, placed by its rotated box. A rotated word may name a column (`headerFor`), but never fills a body cell (`cellsOf` skips it).
- **Shared top rule:** `extentTables` starts a table at the nearest horizontal rule above its rows that spans the table's x-extent, within four rows (at least 40 pt).

## Results (renders in this folder: t2421-3.png, c2419-07.png, w2501-08.png)

| Sheet | Eye | A | B before | B after | Agreed before → after | Tier |
|---|---|---|---|---|---|---|
| T2421-01 A-300 p.3: 66a4b9f32d9fc75b, 15b85ca679307cc1, 4908fa633a44f761 | 33 (101 to 128A, no 120 or 125; NO. the mark column) | 33 | 0 | 33 | 0 → 33 each | oracle-checked → agreed |
| C2419-01 A601 p.7: 4af80165bc367de8 | 4 (104A, 104B, 116B, 123A) | 4 | 0 | 4 | 0 → 4 | oracle-checked → agreed |
| W2501-01 p.8: 6742faed77cfde33 | 11 (100A, 100B, 101, 102, 105, 106, 107, 109, 201, 202, 203) | 11 | 0 | 11 | 0 → 10 | oracle-checked → agreed |

On W2501, the one disputed row is 203's hardware set. Reader A reads "6 PANEL" (the word PANEL from the drawing below the table); reader B reads "6", which is what the sheet prints.

**Whole harvest:** 598 PDFs at 3f43efc. `node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth <run>` **exits 0: "no set lost agreed rows or a tier"** ([table](compare-committed-truth-vs-g057-run.md)).

Besides the five above, two more sets move to agreed:
- 89fb03ce95eb4fc3: 0 → 3;
- b116a0570cbe0357: 0 → 3.

Three unread sets get rows from reader B only. Each is a real door schedule that reader A reads as 0, which is the next reader A gap:

| Set | Reader B rows | Header |
|---|---|---|
| 0da96f79112b83dc | 5 | DOOR NO. … HARDWARE |
| 5ca1073ee12bc860 | 6 | DOOR # … GENERAL RATING |
| 72bedaaba4d51d4f | 29 | NO. … PANEL TYPE … HARDWARE SET … SECURITY CLASS (E-01 …) |

## Tests

`node --test tools/accuracy/g057/reader-b.test.mjs`: 4 of 4.
- **T2421:** 33 rows, 101 to 128A without 120 or 125, NO. as the mark column, size and hardware fields.
- **C2419:** the four marks and their sizes.
- **W2501:** the 11 marks and their hardware sets.
- **Rotated word placement.**

Removing the upward extension fails the T2421 test, and dropping rotated items fails the other three.

The g047, g050 and g051 reader B tests stay green: 10 of 10, and 14 of 14 with g057's.
