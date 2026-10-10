# g048: reader A keeps every row at a table's end and after a two-line remark (g042 class C4)

Cloud session, 2026-10-10, main 45ca3d6. Harvest PDFs read from R2. The truth is the eye count on the rendered pages in `tools/accuracy/g042/spot-checks.md` (the Mac's g042 spot checks).

## The two C4 failures, and why

### T2147 `89236ffa156fbaf5` A601 p.42: eye 16, reader A 2
Rows 129C and 160 carry two-line REMARKS, printed one line above and one below the row's baseline, 5 to 6 pt apart. The data-line loop counted those as rows, so the pitch samples were 5.5, 5.0, 18.4, 5.4 and 5.2. That gives a median of 5.4 and a stop limit of 16.6, and the 18.5 pt gap to row 161 ended the table.

**Fix:** pitch is measured from row to row. A line closer than 0.8 text heights to the one above belongs to the same row and adds no pitch sample. Tables without such lines behave exactly as before.

### C2512 `7239a04e6cc8b502` A-501 p.63: eye 75, reader A 74 ("173.3176")
The title block's sheet number "A-501", 54.6 pt tall, has its baseline (1645.7) between rows 173.3 (1638.6) and 176 (1649.4).
- The unruled line window is 0.4 × the line's tallest word.
- Once "A-501" joined row 173.3's line, the window grew from 3.2 pt to 21.8 pt and took row 176 in too.

**Fix (`clusterLines`):** the window uses the tallest word that is not an outlier, meaning at most 2.5 times the line's lower-median height.
- A first version used the median itself. It regrouped T2147 p.43's staggered header and read 0 rows there, so it was narrowed to outliers only.

### A regression this exposed: T2504 `e3d0cc1bc22fd824` A-601 p.18, eye 22
With correct line grouping, the title line became "DOOR AND FRAME SCHEDULE 1. EXISTING STOREFRONT DOOR": the 25 pt title plus a 12 pt note sharing its band.
- "STOREFRONT" then marked the table as not a door schedule, and it read 0 rows.
- It had passed before only because the note's whole line merged in. That made the title over 8 words, so no title was taken at all.

**Fix:** a title is its title-sized words (at least 0.8 times the tallest on that line).

## Result: 16 sets, every eye-counted page (rows.mjs)
`node tools/accuracy/g048/rows.mjs <pdf dir> <out.json>`, with main's reader (rows-before.json) and this branch's (rows-after.json):

| set | page | eye | before | after | marks |
|---|---|---:|---:|---:|---|
| 7239a04e6cc8b502 C2512 | 63 | 75 | 74 | **75** | ends 173.2, 173.3, 176 |
| 89236ffa156fbaf5 T2147 | 42 | 16 | 2 | **16** | 129C, 160, 161 to 169C |
| 89236ffa156fbaf5 T2147 | 43 | 13 | 13 | 13 | same |
| f97e99f88a931e74 R2502 rebid | 32 | (original p.32: 1, PT101) | 0 | **1** | PT101; the rebid now totals 211, as the original |
| every other page of the 16 sets | | | | | **same marks** |

Pages still off the eye count, unchanged by this goal:
- 3506f831094dd516 and 194733de48af8797 (class C3: a range-and-quantity row shape)
- C2419 4af80165bc367de8 (rotated headers)

## Tests
- **`weyland-subx-worker/test/real-set-schedules.test.mjs`: 5 of 5 (3 new).**
  - T2147 p.42 reads all 16 marks.
  - C2512 p.63 runs `clusterLines` on the frozen words and reads 75, ending 173.2, 173.3, 176.
  - T2504 keeps its DOOR AND FRAME SCHEDULE title and 22 rows.
  - Fixtures: whole-page lines (`tools/accuracy/g046/extract-lines.mjs`), or words before grouping for C2512 (`tools/accuracy/g048/extract-words.mjs`).
  - **Mutation checks:** removing each fix fails exactly its own test: the same-row pitch fails test 3, the outlier window fails test 4, the title-sized words fail test 5.
- **weyland-subx-worker `node --test`: 183 of 184.** The one failure is `generated-mark-scan`: A07 read as "AQ7" by this container's page renderer, as in g046. The Mac has it passing.
- **weyland-sightx-worker:** 27 of 27. **plan-read:** 10 of 10. **estimator-assertions:** 11 of 11.

The served copy `assets/client-ocr/schedule-text-layer.mjs.bin` is byte-identical to the source.
