# g044 (board: g045): S1 shared-mark rule

Measured 2026-10-10 against the harvest PDFs read from R2 (weyland-fixtures, harvest/<sha16>.pdf; read-only S3 pair), with reader A at origin/main 12a2084. Reader A still reads 46 of T2507's 49 rows; 141B, 142A and 143A wait on g043.

## The rule (weyland-shared/plan-read.js)
**When it applies:** k schedule rows on one schedule page share a mark.
- **k tags on the sheet:** if the plan sheet shows exactly k tags with that mark (exact, or stacked number-with-letter per g041), each row gets a tag of its own.
  - Rows go in schedule order to tags in reading order (top to bottom, then left to right).
  - Each tag carries `shared_mark: {rows, tags, order: "assumed"}` and `note: "shared mark, order assumed"`.
- **Any other count:** none of those rows is placed on that sheet. `shared_marks` reports `placed: false` with the counts, and the rows stay in `marks_not_on_plan`.
- **Never** one shared position, and never an invented one.

**Unchanged:**
- A mark with one row works as before.
- So does the same door on two schedule pages ("001 [p.286]").

**Counting:** `marks_not_on_plan` now counts rows that no tag of their own covers. Before, a second row with the same mark counted as placed.

**SightX's attachPlan (weyland-sightx-worker/src/lib/schedule-model.js):**
- It used to key placed tags by mark, so the second 132A tag overwrote the first and both doors would stand at one spot.
- Shared-mark tags now queue, and each door takes the next one, carrying the note.
- A row left over gets no position.

## Tests
- **`node --test weyland-shared/plan-read.test.mjs`: 10 of 10.** Three are new:
  - k rows with k tags get their own flagged tags, in order;
  - k rows with a different tag count get none on that sheet, and the case is reported;
  - the same door on two schedule pages is not treated as a shared mark.
- **Mutation checks:** pointing every shared row at the first spot fails the first test; dropping the count check fails the second.
- **weyland-sightx-worker `npm test`: 27 of 27.** One test is new: two shared 132A doors at two positions, flagged, and a third row given no invented position. Before the empty-queue fix, that test caught a crash.
- **weyland-subx-worker `node --test`: 178 of 179.** The one failure, `test/generated-mark-scan.test.mjs`, also fails on main in this container: 0 of 1 with this change stashed.
- **estimator-assertions:** 11 of 11.

## Measurement on the real sets
`node tools/accuracy/g041/measure.mjs <pdf dir>` (measure.json updated):

| set | rows (reader A) | placed before | placed after | not on plan after |
|---|---:|---:|---:|---|
| T2507 192a16af8f31ae0c | 46 | 45 | **46** | none |
| R2502 7478006f7fd5b43c | 211 | 208 | 208 | AD101, PT101, 102 (unchanged) |
| T2504 e3d0cc1bc22fd824 | 22 | 22 | 22 | none |

`node tools/accuracy/g044/compare.mjs <pdf dir>` compares every tag position between the reader at origin/main and this branch (compare.json):

| set | tags before / after | tags gone | tags new | tags moved |
|---|---|---|---|---|
| T2507 | 45 / 46 | 0 | 1: `132A@A-100:1259,555` | 0 |
| R2502 | 208 / 208 | 0 | 0 | 0 |
| T2504 | 22 / 22 | 0 | 0 | 0 |

T2507's `shared_marks` is `[{mark: "132A", sheet: "A-100", page: 7, rows: 2, tags: 2, placed: true, note: "shared mark, order assumed"}]`. The two tags:
- **First 132A row** (schedule y 912; per the sheet's text, `132 DRILL FLOOR A 5'-6" 7'-0"`): A-100 at (1259, 555), room 132, stacked 132 with A.
- **Second 132A row** (schedule y 931; `132 DRILL FLOOR A 6'-3" 7'-0"`): A-100 at (1223, 967), room 132, stacked 132 with A.

132B keeps its own tag, with no flag.

Expected once g043's reader is on main: 49 rows, 49 placed on T2507, with R2502 and T2504 as above. Rerun `measure.mjs` to confirm.

To run compare.mjs, first write the old reader beside it: `git show origin/main:weyland-shared/plan-read.js > tools/accuracy/g044-old-plan-read.tmp.js`.

The committed SightX real-set data (`node tools/accuracy/g028/build-sets.mjs`) rebuilds byte-identical with this change.
