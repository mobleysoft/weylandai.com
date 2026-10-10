# G061: small and atypical door schedules (C8)

## Diagnosis recorded before code changes

Clock: 2026-10-10 07:56:40 UTC. HEAD `dcbf410`; cached and remote main `af01f296`. The only tree difference is an unrelated line in `docs/cloud-status.md`. The required first `git fetch origin && git checkout --detach origin/main` failed writing the worktree's external `FETCH_HEAD` (sandbox permission denied). No replacement Git metadata is used.

Baseline: the requested 14-set truth run completed against the unchanged readers. All nine C8 records have A/B/agreed door counts 0/0/0. Direct reads of the specified pages distinguish candidate omission from extraction failure:

| Page | Mechanism, established from original pdf.js items and 60 dpi renders |
|---|---|
| F2402, 8900, p16 | Truth `DOOR_PAGE` requires hardware wording and hides the sheet. Direct A and B each read seven numeric marks. Both reject the eighth, `OH`, because marks must contain a digit. A also splits the material cell into an extra unnamed column. The adjacent FINISH SCHEDULE has no door rows. |
| O2604, 43a1, p14 | Truth finder hides the sheet for lack of hardware wording. Both readers directly read all seven rows. A absorbs the small title into its header but correctly maps the populated fields. |
| E2332, 3b0c/e8a8, p33 | A assembles all seven data lines even at 7.1 pt. Its header becomes `IDENTIFICATION NUMBER`, which its mark vocabulary does not recognize. This is not a minimum row count or font-size rejection. B's geometric table detection also yields no table. |
| R2508, ff9c, p19 | Mixed horizontal/rotated headers: A retains rotated labels only when the rotated band itself contains mark, width and height. Here the mark and combined leaf size are horizontal, far above the rotated labels. The horizontal header cannot cross the tall blank header body to the rows. Floor headings separate two populated rows. X checkbox marks are vector strokes, absent from text items. |
| X2319, 32b6 p31 / 400e p45 | `COUNT` is absent from the quantity vocabulary; `A` and `B` fail the digit-only mark predicate. The first broad header attempt also widens into partition notes at left. Two printed type rows require COUNT expansion. The initial 4+4 assumption was corrected from both renders before pinning tests: the older revision prints 5+7. |
| T2332, 0822, p8 | `SYM.` is absent from the mark vocabulary, and comma-ended first tokens fail mark validation. Symbols wrap above/below each row's shared dimension/data baseline; treating every mark line as a row would misassign fields. The 24 ft x 22 ft overhead doors also exceed the current dimension sanity limits. Three physical rows represent 14 explicitly listed openings. |
| R2402, 8c33, p10 | The same mixed rotated-header retention and tall header gap as R2508. There are two populated rows, not a minimum-row failure. The material X selections are vector strokes, not characters; a text-only reader cannot claim to have read their selected material. |

The production finder calls `classifyLines`, which calls reader A and accepts any nonempty result; it has neither the truth finder's hardware-word requirement nor a minimum door-row count. Its 15-word page guard does not exclude any of these pages. Reader A's existing one/two-row path remains relevant.

G050 currently preserves 16 physical rows with `quantity`, `marks`, `mark_ranges`, and `source_row`; it does not expand its ranges into invented individual marks. C8 COUNT-only types and explicitly enumerated symbols will retain that shared-row provenance while exposing the requested individual openings. Existing C3 range-row output must remain intact.

## Changes

All recovery is based on header vocabulary and page geometry, without PDF hashes, set names, sheet numbers or fixed page coordinates in production code.

- The truth finder's `DOOR_PAGE` now calls `doorPageCandidate`: an explicit DOOR / DOOR & FRAME / OPENING SCHEDULE title with mark and size evidence no longer needs hardware wording. The old broad candidate path and electrical-panel exclusion remain. The production finder already delegates to the shared reader; fixing extraction makes these pages discoverable there too.
- The shared text-layer reader and served `.bin` twin recognize IDENTIFICATION NUMBER, SYM and COUNT. Short letter marks require an explicitly titled door table and populated dimensions. Explicit leaf headers preserve centred sparse cells and multiword materials; wrapped notes remain complete.
- Mixed horizontal/rotated headers retain their vertical labels and project them onto the header baseline for normal row parsing. This recovers one/two-row tables and floor sections without lowering general acceptance checks.
- COUNT types and explicit symbol lists use shared data baselines, then emit one opening per count/list entry. Each has `quantity: 1`, `shared_row: true`, `source_row`, `source_quantity`, `opening_index`, original `mark_text`, `marks` and `mark_ranges`. COUNT repetitions retain their printed type mark; no individual identifiers are invented. Existing g050 quantity/range rows remain 16 physical rows per C3 sheet. Explicit feet/inches dimensions in SYM schedules support industrial overhead doors.
- Reader B prefers more explicitly mapped header fields before smaller area when overlapping candidate tables have equal row counts. This repairs a pre-existing audited calibration loss explained below. Reader B remains independent of A.

`test/g061-small-schedules.test.mjs` adds 15 tests: the nine requested PDF pages, four isolated neighbouring FINISH / ROOM FINISH blocks, the truth candidate predicate, and Berryessa geometry. Full original pdf.js page items retain surrounding schedules/details. Tests call production `readPageFromDoc`, the production classifier and truth finder; they assert physical rows, emitted openings, marks and field values.

**Source correction:** `32b631d235082c7c` p31 prints 4 A + 4 B = **8**. `400e8c6b5df592d0` p45 is a different revision and prints 5 A + 7 B = **12**, verified in its text layer and 60 dpi render. Its test intentionally expects 12. E2332's seven schedule rows include 302A, explicitly labelled “CASED OPENING, NO DOOR”; that note and absent dimensions are preserved.

**Unread fields:** MSHP checkbox selections are vector strokes absent from text items. Door/frame material stays null and is flagged in `unread_fields`; the rotated elevation/type, size, hardware and detail text is read. R2402 row 102's hardware cell has no text item and stays null. Reader B still reads zero on the seven C8 pages other than F2402/O2604, and still omits F2402's OH mark.

## Measurement base and Git limitation

The first required fetch/checkout failed because `.git` points to read-only worktree metadata under `/Users/johnmobley/weylandai.com/.git/worktrees/wt-g061`. HEAD and index remain unchanged at `dcbf410`. No alternate repository or Git metadata was created.

At clock time 2026-10-10 08:10:34 UTC, another process had advanced shared `origin/main` to **372e17896d633548c0442002def39b189fcde05d**, including g059, g060 and g063. The initial whole-harvest comparison exposed real differences from that newer main: `0da96f79112b83dc` lost a tier, T2507 lost 47 agreed rows, and `72bedaaba4d51d4f` lost 29. No losses were exempted. The writable source files were integrated with pinned main using a three-way file merge for the readers and current upstream source/tests. Final measurements below use that integrated source. This was not a Git checkout or rebase.

For a clean before/after comparison, the 14-set baseline was rerun with an ESM loader serving the exact reader/finder/adapter source from pinned main at its original module URLs. The initial unchanged-tree baseline is also retained in scratch output; its only selected-set count difference is T2507 B/agreed 0/0, before g060. Final selected and whole-harvest runs use the normal modules, without a loader.

## Selected-set measurements

A/B/agreed are **door entries**, excluding hardware inventory items. COUNT/list output entries count individual openings; the physical-row column counts printed schedule rows. Both selected runs exited 0.

| Set / SHA16 | Physical rows | Before A | Before B | Before agreed | After A | After B | After agreed |
|---|---:|---:|---:|---:|---:|---:|---:|
| F2402 `8900a915fe932a31` | 8 | 0 | 0 | 0 | 8 | 7 | 7 |
| O2604 `43a1f0db3f7ff345` | 7 | 0 | 0 | 0 | 7 | 7 | 7 |
| E2332 `3b0cb226a793d955` | 7 | 0 | 0 | 0 | 7 | 0 | 0 |
| E2332 copy `e8a888bdd7523b77` | 7 | 0 | 0 | 0 | 7 | 0 | 0 |
| R2508 `ff9c494916a7d8b5` | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| X2319 4+4 `32b631d235082c7c` | 2 | 0 | 0 | 0 | 8 | 0 | 0 |
| X2319 5+7 `400e8c6b5df592d0` | 2 | 0 | 0 | 0 | 12 | 0 | 0 |
| T2332 `08222a6152c7525b` | 3 | 0 | 0 | 0 | 14 | 0 | 0 |
| R2402 `8c336c43fa7f9668` | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| T2507 `192a16af8f31ae0c` | 49 | 49 | 49 | 47 | 49 | 49 | 47 |
| R2502 `7478006f7fd5b43c` | 211 | 211 | 211 | 210 | 211 | 211 | 210 |
| T2421 `66a4b9f32d9fc75b` | 33 | 33 | 33 | 33 | 33 | 33 | 33 |
| C3 `3506f831094dd516` | 16 | 16 | 16 | 16 | 16 | 16 | 16 |
| C3 addendum `194733de48af8797` | 16 | 16 | 16 | 16 | 16 | 16 | 16 |

## Validation

- `cd weyland-subx-worker && node --test`: **227 tests, 227 pass, zero failures/skips** (31.87 s), including g059 and all 15 g061 tests.
- Independent B suites (`truth/reader_b.test.mjs`, g050, g051, g057 and g060): **15/15 pass**.
- Earlier A fixture counts remain T2507 **49**, R2502 **211**, T2421 **33**, C2419 **4**, W2501 **11**, T2612 **14**, X2404 **8**, C3 **16 / 16**. C3 quantity totals remain 520 per sheet.
- `compare_runs.mjs` is unchanged; no `--allow` exception is used.

Commands used Node `/opt/homebrew/Cellar/node/26.3.0/bin/node` (shown as `node` below):

```sh
cd weyland-subx-worker && node --test
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 8900a915fe932a31,43a1f0db3f7ff345,3b0cb226a793d955,e8a888bdd7523b77,ff9c494916a7d8b5,32b631d235082c7c,400e8c6b5df592d0,08222a6152c7525b,8c336c43fa7f9668,192a16af8f31ae0c,7478006f7fd5b43c,66a4b9f32d9fc75b,3506f831094dd516,194733de48af8797
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth tools/corpus/harvest/truth
OCC_PDF=/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf node tools/accuracy/truth_run.mjs --only 525dc0b72011077a,dd339f57b51538ed,f0e863d88ea688ff,fb3e0a8137da6cdf
node tools/accuracy/truth_report.mjs --label g061-after
```

Run repository-root commands from the root (the first command runs in SubX). Initial runs used the default truth output; repeat runs used `--out /tmp/g061/<run>` to preserve before/after evidence. The final full-harvest and audited records were copied into the canonical truth directory for the exact comparison/report commands, then original records were restored. Generated reports and truth records are excluded from delivery.

## Audited calibration

Before changing B (clock 2026-10-10 08:06:34 UTC), a fresh unchanged-main read reproduced Berryessa B's loss of hardware/fire fields on all 24 rows. The g057 extended-top-rule recovery exposes both a complete table and a nested left fragment. They have the same row count, and the old smallest-area tie-break chooses the fragment. Preferring the candidate with more mapped header fields restores those fields. A complete p284 geometry fixture pins this mechanism; no A fields, comparison rules or expected records are copied or changed.

All four final audited calibration objects, including private OCC at zero, exactly match the committed baseline. Totals over 280 expected rows:

| Metric | Committed baseline | Fresh main before B repair | Final |
|---|---:|---:|---:|
| A rows found / fully right | 237 / 233 | 237 / 233 | 237 / 233 |
| A fields right / compared | 1292 / 1298 | 1292 / 1298 | 1292 / 1298 |
| B rows found / fully right | 235 / 233 | 235 / 209 | 235 / 233 |
| B fields right / compared | 1284 / 1288 | 1236 / 1288 | 1284 / 1288 |
| Agreed rows found / fully right | 232 / 231 | 208 / 207 | 232 / 231 |
| Agreed fields right / compared | 1271 / 1273 | 1103 / 1105 | 1271 / 1273 |

## Whole-harvest comparison

Clock: **2026-10-10 08:19:20 UTC**. Final harvest run: **598 PDFs**, exit **0**, 3,289 disagreement queue entries. Final selected counts/agreements equal their corresponding full-harvest records. The canonical report includes 616 records (598 freshly rerun harvest, four freshly rerun audited and 14 retained non-harvest records), with 3,400 total queue entries.

The exact requested comparison against `origin/main:tools/corpus/harvest/truth` at `372e178` exited **0**, without exceptions. Its complete output table:

| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 08222a6152c7525b | 14 | 0 | 0 | 0 | unread | oracle-checked |
| 32b631d235082c7c | 8 | 0 | 0 | 0 | unread | oracle-checked |
| 3b0cb226a793d955 | 7 | 0 | 0 | 0 | unread | oracle-checked |
| 400e8c6b5df592d0 | 12 | 0 | 0 | 0 | unread | oracle-checked |
| 43a1f0db3f7ff345 | 7 | 7 | 0 | 7 | unread | agreed |
| 5679feac4b39748a | 1 | 1 | 0 | 0 | unread | unread |
| 8900a915fe932a31 | 8 | 7 | 0 | 7 | unread | agreed |
| 8c336c43fa7f9668 | 2 | 0 | 0 | 0 | unread | oracle-checked |
| e8a888bdd7523b77 | 7 | 0 | 0 | 0 | unread | oracle-checked |
| ff9c494916a7d8b5 | 2 | 0 | 0 | 0 | unread | oracle-checked |
no set lost agreed rows or a tier

The additional gain `5679feac4b39748a` is a real hardware-free schedule: M2506-01 p4, A-101, mechanical-room mark 118, 36 x 84 in, door D-1 / HM. It was checked on the text layer and a 60 dpi render. The readers disagree on fields, so it gains no agreed row or tier.

`truth_report.mjs --label g061-after` exited **0**. Audited agreement-method calibration is **231/232 fully correct agreed rows (99.6%)**, **1158/1161 correct agreed fields (99.7%)**, and four disputed fields (A right 1, B right 3, neither 0), equal to the committed baseline. The report stamps unchanged Git HEAD `dcbf410`; the actual integrated source revision and delivery restriction are documented above.


## Delivery status

Code, fixtures and this report are present in the requested worktree. Branch creation, commit and push remain blocked by the external read-only Git metadata; `codex/g061-small-schedules` was not created. A g061-only patch against pinned main is available in `/tmp/g061/g061-on-372e178.patch`; it excludes copied upstream-only files and all generated truth/report files. The Mac must apply/commit/push and remeasure the merged tree. No PR was opened and no deployment was performed.
