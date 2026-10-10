# G055: reader A, C6 text-layer door schedules

## Diagnosis recorded before the code change

Diagnosis recorded before editing the reader; the accompanying `date -u` returned 2026-10-10T04:19:46Z. Baseline production `readPageFromDoc` returns zero doors on T2421-01 / 66a4b9f32d9fc75b page 3 and C2419-01 / 4af80165bc367de8 page 7.

- T2421-01: `fieldGroup` groups the finish legend left of the table with the first door-header baseline. `buildTable` then stops at another field-like baseline in the same multiline header (116, 121, 128, 134 points). The lower candidate loses `NO` and `DOOR SIZE`; upward expansion also pulls the adjacent finishes/title into the model. No populated data rows survive. `NO` itself is already recognized; dash-heavy data rows are not the primary failure.
- C2419-01: `itemsToWords` discards all non-horizontal items, including the eight rotated labels Number, Number of Panels, Type, Width, Height, Frame Type, Jamb Width, Head Height. Only Door / Panels / Frame and Comments survive. A rejected FINISH KEY candidate nevertheless marks its region consumed, suppressing later candidates. The room finish schedule must continue to be rejected.
- Visual review used Poppler crops of the original pages. T2421-01 has **33 populated rows**, not 40: 101 through 128A with suffixes, without 120 or 125. C2419-01 has exactly four rows: 104A, 104B, 116B, 123A.

## Shared-reader change

The change is confined to `assets/client-ocr-src/schedule-text-layer.mjs` and its byte-identical served `.bin` twin. The production Worker already calls this shared module.

1. After choosing the page orientation, preserve a band of rotated labels only when it has at least four labels and names a mark, width, and height. Keep their physical column positions and lower endpoints; isolated vertical drawing captions stay excluded.
2. A rejected/non-door table no longer consumes the region. Suppress a second interpretation of the same marks at the same physical row positions in overlapping table regions.
3. After the normal pass, retry unread headers using the header band's own text height, starting at an explicit mark label. Keep nearby multiline labels inside that span; do not widen into the adjacent finish legend, absorb the schedule title, or terminate at another baseline of the same header. Use the smaller data text when deciding whether closely spaced data columns are distinct.

No PDF identity, project number, sheet number, page number, or coordinate is hard-coded in the reader. Reader B and the comparison tool are unchanged. The reader adds no request-time service/API/CDN dependency.

## Regression fixtures and tests

The two fixtures under `weyland-subx-worker/test/fixtures/g055/` contain the complete page's original pdf.js text items, including the neighbouring finish tables, legends, drawing captions, and notes. The tests feed those items through production `readPageFromDoc`, including its `pageTextLines` conversion and shared table reader, without needing the private PDFs.

Assertions pin the exact 33 and four door marks; T2421 sizes, thickness, pair, GROUP 1–4 hardware values, details, and dash-heavy existing rows; and C2419 dimensions, door types, sample frame types and remarks. Exactly one door table is returned on each mixed sheet.

Final suite: **197/197 passed, zero failures** (the existing 195 plus two new tests), using Node v26.3.0. The initial shell default was Node v20.20.2, which cannot load `node:sqlite`; the final commands use the installed Node 26 executable through PATH.

## Per-set results

Counts below are **door rows**. Every targeted set had A = B = agreed = 0 in the before run.

| Set | A before | A after | B before | B after | Agreed before | Agreed after |
|---|---:|---:|---:|---:|---:|---:|
| 66a4b9f32d9fc75b | 0 | 33 | 0 | 0 | 0 | 0 |
| 4af80165bc367de8 | 0 | 4 | 0 | 0 | 0 | 0 |
| 08222a6152c7525b | 0 | 0 | 0 | 0 | 0 | 0 |
| 0da96f79112b83dc | 0 | 0 | 0 | 0 | 0 | 0 |
| 15b85ca679307cc1 | 0 | 33 | 0 | 0 | 0 | 0 |
| 32b631d235082c7c | 0 | 0 | 0 | 0 | 0 | 0 |
| 3b0cb226a793d955 | 0 | 0 | 0 | 0 | 0 | 0 |
| 400e8c6b5df592d0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 43a1f0db3f7ff345 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4908fa633a44f761 | 0 | 33 | 0 | 0 | 0 | 0 |
| 6742faed77cfde33 | 0 | 11 | 0 | 0 | 0 | 0 |
| 72bedaaba4d51d4f | 0 | 0 | 0 | 0 | 0 | 0 |
| 8900a915fe932a31 | 0 | 0 | 0 | 0 | 0 | 0 |
| 89fb03ce95eb4fc3 | 0 | 3 | 0 | 0 | 0 | 0 |
| 8c336c43fa7f9668 | 0 | 0 | 0 | 0 | 0 | 0 |
| b116a0570cbe0357 | 0 | 3 | 0 | 0 | 0 | 0 |
| e8a888bdd7523b77 | 0 | 0 | 0 | 0 | 0 | 0 |
| ff9c494916a7d8b5 | 0 | 0 | 0 | 0 | 0 | 0 |

**Class total:** A 0 → 120, B 0 → 0, agreed 0 → 0. Seven sets move from unread to oracle-checked; eleven stay unread.

## Whole-harvest result

The full run completed all **598 downloaded PDFs** (exit 0). The final truth directory/report has **616 records**, including the remeasured four audited PDFs and retained non-harvest records. Only the seven sets listed above change door-row counts; no other set gains or loses reader A door rows, reader B door rows, or agreed door rows.

The exact requested `compare_runs.mjs` command exited **0**, printing `no set lost agreed rows or a tier`. Its output is saved in [compare-runs.md](../tools/accuracy/g055/compare-runs.md). An additional comparison of `rows_agreed` (including hardware items) also found no losses. No `--allow` exceptions were used. The queue grows from **3449 to 3569**: 120 additional one-sided door rows.

Completion/check clock readings from `date -u`: harvest confirmed complete at **2026-10-10T04:28:51Z**; comparison and after-report completed by **2026-10-10T04:29:18Z**.

Reports: [before](../tools/accuracy/truth_report_2026-10-10-04-18_g055-before.md), [after](../tools/accuracy/truth_report_2026-10-10-04-29_g055-after.md), with corresponding JSON summaries alongside them.

## Audited calibration

All four audited PDFs were rerun. Their calibration scores match the before records exactly, including OCC (still zero rows). These totals include 280 expected rows:

| Metric | Before | After |
|---|---:|---:|
| A rows found / fully right | 237 / 233 | 237 / 233 |
| A fields right / compared | 1292 / 1298 | 1292 / 1298 |
| B rows found / fully right | 235 / 233 | 235 / 233 |
| B fields right / compared | 1284 / 1288 | 1284 / 1288 |
| Agreed rows found / fully right | 232 / 231 | 232 / 231 |
| Agreed-row fields right / compared | 1271 / 1273 | 1271 / 1273 |

The separate field-agreement calibration printed by `truth_report.mjs` is unchanged: **231/232 agreed rows fully right (99.6%)**, **1158/1161 agreed fields right (99.7%)**, and four disputed fields (A right 1, B right 3, neither 0). Exact/synthetic calibration is retained from the baseline; this task does not rerun the synthetic corpus.

## Measurement commands

Run from the requested worktree, at base `e293d1a273a2dffaa8a42fe69791fae18934d42d` (`origin/main` at task start). The targeted run was performed both before and after the change; the full harvest is compared against the committed baseline as requested.

```sh
export PATH=/opt/homebrew/Cellar/node/26.3.0/bin:$PATH
(cd weyland-subx-worker && node --test)
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 66a4b9f32d9fc75b,4af80165bc367de8,08222a6152c7525b,0da96f79112b83dc,15b85ca679307cc1,32b631d235082c7c,3b0cb226a793d955,400e8c6b5df592d0,43a1f0db3f7ff345,4908fa633a44f761,6742faed77cfde33,72bedaaba4d51d4f,8900a915fe932a31,89fb03ce95eb4fc3,8c336c43fa7f9668,b116a0570cbe0357,e8a888bdd7523b77,ff9c494916a7d8b5
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth tools/corpus/harvest/truth
```

Audited records are also remeasured, including the available private OCC source:

```sh
OCC_PDF=/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf node tools/accuracy/truth_run.mjs --only 525dc0b72011077a,dd339f57b51538ed,f0e863d88ea688ff,fb3e0a8137da6cdf --out .g055-work/audited-after
node tools/accuracy/truth_report.mjs --label g055-after
```

The audited run used a separate output directory while the harvest ran; its four records and queue entries are merged into the final truth directory before generating the after report.

## Limits

Seven of the 18 sets gain reader A rows; eleven still return zero. Reader B returns zero doors on all 18, so **agreed door rows remain zero**. These are additional reader A results, not independently agreed truth or a claim that every recovered field is right.

The T2421 bare DOOR/FRAME and DOOR ELEV columns remain unmapped. C2419 door 123A retains overlapping underlying frame text and an incomplete long remark. On the additional 11-row rotated schedule (`6742faed77cfde33`, p.8), the last hardware cell includes a nearby PANEL caption (`6 PANEL` instead of `6`). Those field/region issues are not fixed here. The two three-row gains are actual door schedules beside an accessory table; the 33-row gains are copies of T2421 A-300. OCC remains zero in both baseline and rerun; there is no OCR improvement claim.

Normal branch creation was denied because this worktree's refs live in the read-only original checkout. Git metadata was instead cloned locally into `.g055-git` inside this worktree; all branch/commit/push operations use `GIT_DIR=.g055-git`. The original worktree registration remains detached. No other checkout was modified, no PR was opened, and no deployment was run.
