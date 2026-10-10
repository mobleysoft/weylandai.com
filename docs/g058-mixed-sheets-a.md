# G058: reader A on mixed schedule sheets

## Diagnosis recorded before changing code

Clock: 2026-10-10 04:53:21 UTC. Base HEAD and origin/main: d46b780.
Production `readPageFromDoc` returns zero doors on both complete rendered pages.

- **T2612-01, A-601, page 23:** MARK is alone on its staggered header baseline (with a remarks fragment and unrelated detail/inventory text). It never meets the four-label candidate threshold. The main SIZE/TYPE/... baseline cannot recover MARK above it: intervening sparse fragments and adjacent drawing notes stop the upward search. Ordinary upward expansion also widens into the detail notes and hardware inventory. The group-label candidate stops at another field baseline before reaching any doors. The compact fallback requires a mark on that same candidate baseline, so cannot recover this table. The DOOR SCHEDULE title itself is correctly found. SET # and KEYED are secondary column-mapping concerns, not the reason for zero rows. Hardware extraction is a separate reader: its 21 items do not consume the door reader's region.
- **X2404-01, A601, page 81 (both copies):** the NUMBER/TYPE/MATERIAL/... baseline splits at the large gap over the nested SIZE columns, leaving the leading NUMBER outside the qualifying label group. That candidate stops at the full WIDTH/HEIGHT/THICKNESS baseline below. Starting from the lower baseline instead loses the leading NUMBER; its upward expansion clips DOOR from the title, yielding `AND FRAME SCHEDULE`, which is rejected as a frame schedule. It maps the repeated rightmost DOOR NUMBER as the mark and conflates FIRE RATING with HARDWARE GROUP. The compact retry starts at that repeated number and sees no dimensions. The dimension parser already understands `3' - 0"` and `6' - 8"`; assembling their header columns is the failure.

The renders show 14 populated T2612 rows and eight X2404 rows. The adjacent T2612 hardware inventory, window schedule, glazing schedule and type drawings are not door rows.

## Shared-reader change

After the existing two passes, retry still-unread headers anchored at an explicit mark label. Collect nearby label items across the staggered baselines to establish the horizontal span; then use the existing compact table builder. Require an explicit door/opening schedule title for this extra recovery pass and reject overlaps with already-read tables. This preserves the earlier successful reads rather than replacing their column models.

The recovered header can span up to eight baselines. Standalone group captions above subcolumns do not create an extra SIZE column or merge HARDWARE into FIRE RATING. GLAZ. TYPE maps to glazing; HEAD/JAMB WIDTH/HEIGHT do not become door dimensions. SET # names the hardware column, while KEYED remains an unexported column. The first DOOR NUMBER owns the mark; the repeated number at the right does not create another row or a remark. Singular NOTE: ends a table just like NOTES:. Complete combined-size text items stay together, including the parenthesized (PAIR) prefix, which now sets the pair flag.

Only the shared source and its byte-identical served `.bin` twin change in production. No identity, project, sheet, page or coordinate is hard-coded there. Reader B, `compare_runs.mjs`, request-time dependencies and server routing are unchanged.

## Regression tests and field checks

Five tests are added under `weyland-subx-worker/test/g058-mixed-sheets-a.test.mjs`. Fixtures contain complete original pdf.js page items, including all neighbouring drawings, notes and schedules, and run through production `readPageFromDoc`.

- T2612: exactly 14 marks; 36 x 84 x 1.75 inch dimensions; the pair on 101; types CC/A/B; all hardware sets; aluminium/hollow-metal materials; frame types, glazing, rating and sample details/remarks. Exactly one door table. A separate inventory-block check returns zero doors; the full sheet still returns 21 hardware items.
- X2404: exactly eight unique marks, separate width/height/thickness columns, 36 x 80 inch sizes, 1.75/1.375 inch thicknesses, FIBERGLASS/WOOD materials, frame fields and all three hardware-function forms. Repeated marks are neither extra doors nor remarks.
- W2501: exactly 11 marks and representative dimensions/hardware values, alongside the existing g055 tests for T2421's 33 and C2419's four.
- The same X2404 bid set's page 97 (M501 mechanical schedules) returns zero doors.

`cd weyland-subx-worker && node --test`: **206/206 pass, zero failures, zero skipped** (201 existing + five new), using Node v26.3.0. Checked at 2026-10-10 04:59:28 UTC.

## Targeted before/after measurements

These are **door rows**, not hardware-item totals. The requested ten-set command ran both before and after the change against the original private downloads.

| Set | A before | A after | B before | B after | Agreed before | Agreed after |
|---|---:|---:|---:|---:|---:|---:|
| e75d52a7a714c978 | 0 | 14 | 14 | 14 | 0 | 13 |
| 6e7e2d2bf65c383b | 0 | 8 | 12 | 12 | 0 | 8 |
| 70ab5446590e40cc | 0 | 8 | 12 | 12 | 0 | 8 |
| 66a4b9f32d9fc75b | 33 | 33 | 0 | 0 | 0 | 0 |
| 4af80165bc367de8 | 4 | 4 | 0 | 0 | 0 | 0 |
| 6742faed77cfde33 | 11 | 11 | 0 | 0 | 0 | 0 |
| 192a16af8f31ae0c | 49 | 49 | 0 | 0 | 0 | 0 |
| 7478006f7fd5b43c | 211 | 211 | 211 | 211 | 210 | 210 |
| 3506f831094dd516 | 16 | 16 | 16 | 16 | 16 | 16 |
| 194733de48af8797 | 16 | 16 | 16 | 16 | 16 | 16 |

T2612's remaining door disagreement is 101: A reads its 36-inch leaf width and B reads null. All 14 A marks and the pair size were checked on the render. Hardware counts are unchanged (A 21, B 18); no hardware improvement is claimed.

The X2404 **set-level** B count of 12 comprises eight actual doors on page 81 plus C3/I1/R1/R2 on page 97. Direct page reads and the M501 render identify those four as a supply diffuser, supply register and two return grilles. B reads eight on page 81, not 12 on that page. B remains unchanged and its four false door rows remain disputed. An initial ungated recovery also read these four; requiring an explicit door title removes them, and the complete mechanical-page fixture pins the exclusion.

## Whole-harvest comparison

The full final run completed all **598 downloaded PDFs**, with 598 result lines, no per-file errors and exit **0**. Completion was checked at **2026-10-10 05:05:17 UTC**. The exact requested comparison against `origin/main:tools/corpus/harvest/truth` exited **0**, with no exceptions and no comparison-tool edits, checked at **05:05:39 UTC**. Its complete table and final line:

| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 6e7e2d2bf65c383b | 8 | 12 | 0 | 8 | unread | agreed |
| 70ab5446590e40cc | 8 | 12 | 0 | 8 | unread | agreed |
| df76d4056a456207 | 13 | 13 | 0 | 9 | unread | agreed |
| e75d52a7a714c978 | 14 | 14 | 0 | 13 | unread | agreed |

```text
no set lost agreed rows or a tier
```

Only these four records change reader counts or agreement counts: **43 additional A door rows and 38 additional agreed door rows**. B counts and hardware-item counts are unchanged throughout. An additional comparison of total `rows_agreed` (doors plus hardware) also found no loss. No genuine loss needs an exception.

The extra gain `df76d4056a456207` is T2232-01 Addendum 2, A-601, PDF page 114. Its render has 13 populated door rows: 100, 101A, 101B, 101C, 102, 103, 108, 109, 110, 111, 113A, 113B, 114. The same staggered MARK / SIZE / SET # / KEYED layout is recovered. B already reads those 13; the four pair-width disagreements remain, so nine rows agree. The gain's marks were visually checked; this is not an audit of every field on that sheet.

The report contains **616 records** after remeasuring the harvest and four audited PDFs; retained synthetic/non-harvest records were not otherwise rerun. Queue lines decrease **3511 to 3473**. Final `truth_report.mjs` calibration was checked at **2026-10-10 05:05:48 UTC** and matches the before report exactly.

## Audited-corpus calibration

All four audited PDFs were remeasured, including the private OCC source. Their complete calibration objects match the baseline exactly. OCC stays at zero. Totals over 280 expected rows:

| Metric | Before | After |
|---|---:|---:|
| A rows found / fully right | 237 / 233 | 237 / 233 |
| A fields right / compared | 1292 / 1298 | 1292 / 1298 |
| B rows found / fully right | 235 / 233 | 235 / 233 |
| B fields right / compared | 1284 / 1288 | 1284 / 1288 |
| Agreed rows found / fully right | 232 / 231 | 232 / 231 |
| Agreed-row fields right / compared | 1271 / 1273 | 1271 / 1273 |

The agreement-method calibration is unchanged: 231/232 agreed rows fully right (99.6%), 1158/1161 agreed fields right (99.7%), four disputed fields (A right 1, B right 3, neither 0). These are audited calibration results, not an accuracy claim for every recovered harvest field.

## Reproduction commands

Run in the requested worktree with the installed Node 26 executable selected:

```sh
export PATH=/opt/homebrew/Cellar/node/26.3.0/bin:$PATH
(cd weyland-subx-worker && node --test)
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only e75d52a7a714c978,6e7e2d2bf65c383b,70ab5446590e40cc,66a4b9f32d9fc75b,4af80165bc367de8,6742faed77cfde33,192a16af8f31ae0c,7478006f7fd5b43c,3506f831094dd516,194733de48af8797
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth tools/corpus/harvest/truth
OCC_PDF=/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf node tools/accuracy/truth_run.mjs --only 525dc0b72011077a,dd339f57b51538ed,f0e863d88ea688ff,fb3e0a8137da6cdf --out /tmp/g058/audited-final
node tools/accuracy/truth_report.mjs --label g058-after
```

The audited run uses a separate output directory while the harvest runs. Its four records and queue entries are merged into the report input after the harvest finishes. The before report uses `--label g058-before`. Generated records and reports are measurement outputs, excluded from delivery.

## Delivery constraint

`git switch -c codex/g058-mixed-sheets-a` failed because the worktree's own refs are in `/Users/johnmobley/weylandai.com/.git`, outside this session's writable roots (`Operation not permitted`). No separate Git metadata was created. Implementation and measurements can proceed in the requested worktree; branch, commit and push require access to that existing metadata.

The code, served twin, five tests, four page fixtures and this report are left in the requested worktree. **No branch, commit or push was completed.** Generated truth records were restored to their starting contents after measurement, and this task's generated truth reports were moved to `/tmp/g058`; none is included in the delivery changes. The pre-existing untracked g055 files and reports were left alone. No PR or deployment was made.
