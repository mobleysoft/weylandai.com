# g072: the scanned Building's two false agreements

The change from **9 to 7 agreed doors is a correction, not a loss of two correct readings**. Page 3 / A-601 prints both STAIR 2 openings, **212 and 312**, as **3'-0" x 7'-0"**. The historical agreement accepted 212 with no height and 312 with no width because both readers returned null. Improved OCR recovers those cells; reader A reads their correct dimensions and reader B still leaves them null. Retain the improved OCR and regenerate the stale record during the Mac's merged-tree measurement. No reader or agreement-scoring change is needed for this outcome.

Work started at **2026-10-10 13:36:28 UTC**, from detached `0287a332acf33692142adec35e933f3cbe05a326` (also `origin/main`), a truth-record-only successor of `93ddf7a`. All work stayed in the supplied clone; the only external input used for setup was a read-only copy of the existing npm cache. No network, other checkout, PR, deployment, or canonical truth-record write was used. The checkout attempt failed creating `.git/index.lock` with `Operation not permitted`, so delivery is a working-tree patch against pinned `origin/main`.

## Where the change landed

The first main integration point giving **48/48/7** is **`9809ebf1b42710e1b1c3c151385ea9e8624c42f1`**, 2026-10-09 **22:13:25 UTC**, merging PR #101. Its source change is **`233dd64fd137c0fd648f554a541f570a11080bd3`**, 22:11:33 UTC, “Recover scanned schedule dimensions and protect identifier rereads.” Main's immediate parent, **`a7475eb`**, gives **48/48/9**. Both boundary points and the source commit were independently rerun through all six PDF pages.

Only `weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs` changed at that boundary within the requested reader/OCR/agreement paths. The served `.bin` twin changed with it. `recognizePageWords` passes the original cell inset to `rereadDimensionCell`; that reread gains native, enlarged, interpolated and thresholded pixel variants and votes on valid parsed dimensions rather than digit strings. It accepts a value supported by at least two valid readings. The formerly empty height/width cells now yield `7-0"` and `3-0"`.

The shared A dimension parser already accepts these dropped-apostrophe spellings. B's independent `inchesOf` accepts `7'-0"` or bare `7-0`, but its hyphenated form rejects the trailing inch quote in `7-0"` (likewise `3-0"`). Thus **A's values change on the two doors; B's numeric values remain null**, even though B also receives the recovered OCR strings. The agreement scorer normalizes null on both sides to the same empty value; changing A to the correct number turns false agreement into a useful dispute. No page-finder change is involved: both versions select door candidates on two pages, read the door schedule on page 3, and read hardware on pages 4, 5 and 6.

Two cross-replays isolate OCR from later reader changes:

| Readers | OCR page | A/B/agreed | A correct fields | B correct fields |
|---|---|---:|---:|---:|
| Parent `a7475eb` | New `9809ebf` | 48/48/7 | 336/336 | 277/336 |
| Current main | Parent `a7475eb` | 48/48/9 | 330/336 | 276/336 |

## Sheet and exact row evidence

Rendered and visually inspected locally with Poppler 26.03.0:

```sh
pdftoppm -f 3 -l 3 -r 100 -singlefile -png \
  tools/bidset/out/weylandai-building-bidset-scanned.pdf tmp/g072/sheet-3
sips -r 270 tmp/g072/sheet-3.png --out tmp/g072/sheet-3-upright.png
```

The rotated scan is legible at 100 DPI. A-601 shows 48 entries. Both 212 and 312 say STAIR 2, width `3'-0"`, height `7'-0"`, door type A, door material HM, frame type 1, frame material HM, fire rating 90 MIN, hardware group 02. The exact expectations in `tools/bidset/out/truth-doors.json` independently specify 36 and 84 inches.

These are the verbatim full clustered OCR row strings; the old height/width is absent, not a literal dash or null token:

```text
Old 212: 212 STAIR 2 3'-0" 1 3/4" A HM 1 HM 90 MIN 02 7 | |
New 212: 212 STAIR 2 3'-0" 7-0" 1 3/4" A HM 1 HM 90 MIN 02 7 | |
Old 312: 312 STAIR 2 7'-0" 13/4" A HM 4. HM 90 MIN 02
New 312: 312 STAIR 2 3-0" 7'-0" 13/4" A HM 4. HM 90 MIN 02
```

| Door / field | Sheet | Historical A | Historical B | Current A | Current B |
|---|---|---:|---:|---:|---:|
| 212 height | 7'-0" | null | null | 84 | null |
| 312 width | 3'-0" | null | null | 36 | null |

The current OCR fixture preserves the evidence: each initial cell text is empty, the reread reason is `consensus`, and there is one candidate physical value. The recovered 212 height occupies x=493.765..570.353 pt; 312 width x=415.059..491.647 pt. These are the complete original positioned words/items, with unrounded coordinates in the fixtures, not manually transcribed reader rows.

Both before and after emit **13** `Image too small to scale!!` and **13** `Line cannot be recognized!!` warnings in the full six-page run. Their persistence does not distinguish the two outcomes; both runs still read 48 doors in each reader. The corrected cells are observable in the OCR data despite the warnings.

The old nine agreed marks were `101, 105, 114, 212, 215, 303, 307, 309, 312`. The current seven are `101, 105, 114, 215, 303, 307, 309`. Historical agreed calibration was **7 fully correct rows out of 9**, **61/63** correct fields; current agreed calibration is **7/7**, **49/49**. A improves from **42/48** fully correct rows and **330/336** correct fields to **48/48**, **336/336**. The other A corrections are 205 width, 208 height, 302 hardware group (`Q3` to `03`) and 311 width. B improves net 276 to 277 correct fields: 311 width and 302 hardware improve, while 206 height loses its apostrophe and becomes null.

These are the harness's seven scored door fields, not a claim that every printed field is correct. For example, both readers still report frame type `4.` on 312, whereas the sheet says 1; frame type is outside `DOOR_FIELDS`. That pre-existing OCR error is preserved in the fixture and is not repaired here.

## Main-history sweep

Candidates are the **35 first-parent integration points** in the four requested path trees, not every side-branch ancestor counted again. Every row below is a fresh full six-page one-set harness run, with fresh OCR (no OCR cache). A/B/agreed count doors; total agreement includes hardware items. All runs use Node **26.3.0**, the shipped Tesseract binaries/model, Poppler **26.03.0**, and the repository PDF, without `--dir`. All candidate harnesses exit 0. Every candidate's complete calibration object matches its corresponding pre-change or post-change phase; no second transition appears.

```sh
git log --first-parent --reverse --since=2026-10-09T16:51:00Z \
  --format='%H %cI %s' 93ddf7a -- \
  weyland-subx-worker/assets/client-ocr-src weyland-subx-worker/src/lib \
  weyland-shared tools/accuracy/truth
```

| Main commit | Commit time UTC | A/B/agreed doors | Total agreed/rows | Change |
|---|---|---:|---:|---|
| `71fa2b7` | 10-09 17:58:49 | 48/48/9 | 59/98 | SubX: scanned door-schedule sheets read in production through the OCR path (goal g019) |
| `2a96ef4` | 10-09 17:59:49 | 48/48/9 | 59/98 | SubX: scanned-sheet browser check measured on the Mac: the browser path reads 46 of 48 rows on the scan (0 before), Node 48 of 48; the check's server serves every shipped OCR module |
| `8d60411` | 10-09 18:06:29 | 48/48/9 | 59/98 | Front door sample packet is the product's own output (goal g031); one word for hardware groups in the packet text |
| `7e1bd98` | 10-09 18:24:46 | 48/48/9 | 59/98 | Estimator-path journeys measured and corrected (goal g022 follow-up): marks were right, the assertions compared one-based audit rows with zero-based citations; the packet manifest counted its own missing-item disclosure as a cut sheet |
| `676f102` | 10-09 21:50:48 | 48/48/9 | 59/98 | Merge pull request #99 from mobleysoft/codex/weyland-release-20261009 |
| `9809ebf` | 10-09 22:13:25 | 48/48/7 | 57/98 | Merge pull request #101 from mobleysoft/codex/weyland-field-release-20261009 |
| `80ea405` | 10-09 22:26:05 | 48/48/7 | 57/98 | Merge pull request #102 from mobleysoft/codex/weyland-readiness-auth-20261009 |
| `6094568` | 10-09 22:45:56 | 48/48/7 | 57/98 | Merge pull request #104 from mobleysoft/codex/weyland-occ-meeting-acceptance-20261009 |
| `a07f8f4` | 10-09 22:51:58 | 48/48/7 | 57/98 | SubX OCR path: the landing review's findings F1 to F4 closed (goal g034) |
| `16e3047` | 10-09 23:32:20 | 48/48/7 | 57/98 | Schedule read on real sets (goal g030): reader A reads the door schedules of the three best harvested sets in full |
| `3f5886e` | 10-09 23:41:17 | 48/48/7 | 57/98 | Merge pull request #105 from mobleysoft/codex/weyland-final-journey-gates-20261009 |
| `565a548` | 10-09 23:49:34 | 48/48/7 | 57/98 | Merge pull request #106 from mobleysoft/claude/g041-s1-suffix-marks |
| `7f1c175` | 10-09 23:57:12 | 48/48/7 | 57/98 | Merge pull request #109 from mobleysoft/codex/weyland-final-journey-gates-20261009 |
| `0b50aaa` | 10-10 00:27:02 | 48/48/7 | 57/98 | Merge pull request #111 from mobleysoft/claude/g044-shared-mark-rule |
| `6c7db3b` | 10-10 00:29:06 | 48/48/7 | 57/98 | Merge g043: reader A reads all 49 T2507 door rows (branch t2507-last-rows, verified on the Mac) |
| `19b71c8` | 10-10 00:35:13 | 48/48/7 | 57/98 | Merge cloud PR 112 (g046): reader A reads T2502 (9 of 9) and T2423 (3 of 3) it read as 0; F2 test follows the per-read abort controller; status file keeps both lines |
| `90e8397` | 10-10 00:54:16 | 48/48/7 | 57/98 | Merge pull request #114 from mobleysoft/claude/g048-table-end-rows |
| `ce23a11` | 10-10 01:10:55 | 48/48/7 | 57/98 | Merge pull request #115 from mobleysoft/claude/g049-column-shifts |
| `b287aee` | 10-10 02:31:51 | 48/48/7 | 57/98 | truth: compare_runs.mjs, a per-set before-and-after check of truth records (rows A and B, agreed, tier) that fails when any set loses agreed rows or drops a tier |
| `3aaf4e7` | 10-10 02:40:47 | 48/48/7 | 57/98 | truth compare: no set is exempt inside the tool; accepted drops are named with --allow and recorded elsewhere |
| `3969f3f` | 10-10 02:41:49 | 48/48/7 | 57/98 | truth compare: --allow is parsed before the usage check |
| `32ea8ff` | 10-10 02:59:23 | 48/48/7 | 57/98 | Merge pull request #116 from mobleysoft/claude/g047-reader-b-thin-rules |
| `e2e8a36` | 10-10 03:20:30 | 48/48/7 | 57/98 | Merge cloud PR 117 (g050): range and stacked-mark rows with QUANTITY read by both readers; status file keeps both lines |
| `49cc79c` | 10-10 04:27:43 | 48/48/7 | 57/98 | truth: compare_runs accepts a named set's tier drop too; the reason lives in plan/decisions.md |
| `0cc3e6d` | 10-10 04:36:33 | 48/48/7 | 57/98 | Merge pull request #120 from mobleysoft/claude/g051-panel-schedules |
| `5653bd1` | 10-10 04:48:16 | 48/48/7 | 57/98 | Merge codex/g055-c6-reader-a: reader A reads door schedules with stacked and rotated headers on mixed sheets (class C6) |
| `1f7308a` | 10-10 06:32:07 | 48/48/7 | 57/98 | g057: reader B reads the C6 sheets (rotated headers, a shared top rule) |
| `c426e03` | 10-10 06:42:13 | 48/48/7 | 57/98 | Merge pull request #123 from mobleysoft/codex/g058-mixed-sheets-a |
| `851c8db` | 10-10 07:55:39 | 48/48/7 | 57/98 | Merge pull request #124 from mobleysoft/claude/g060-reader-b-t2507 |
| `2dea1f5` | 10-10 08:05:51 | 48/48/7 | 57/98 | Merge codex/g059-rotated-and-clouded: reader A on rotated-header and clouded mixed-sheet schedules |
| `372e178` | 10-10 08:08:03 | 48/48/7 | 57/98 | Merge pull request #126 from mobleysoft/claude/g063-second-project |
| `61b211c` | 10-10 08:32:51 | 48/48/7 | 57/98 | Merge codex/g061-small-schedules: reader A and the page finders on small and atypical door schedules (class C8) |
| `573d196` | 10-10 08:32:55 | 48/48/7 | 57/98 | Merge pull request #127 from mobleysoft/claude/g064-reader-b-x2404 |
| `837a415` | 10-10 12:27:53 | 48/48/7 | 57/98 | Merge pull request #128 from mobleysoft/codex/g066-placement-records |
| `93ddf7a` | 10-10 13:21:07 | 48/48/7 | 57/98 | Merge pull request #131 from mobleysoft/codex/g070-fayette-and-non-harvest-sets |

Additional boundary probes: `a7475eb` = 48/48/9, total 59/98; `233dd64` = 48/48/7, total 57/98. As a timestamp check, the last main commit at 16:51Z, `eceb04f`, predates the production OCR integration and measures 0/0/0 doors (48/48 hardware agreement). The record's generation timestamp therefore cannot identify its committed source tree. The first landed production OCR commit, `71fa2b7`, exactly reproduces the stored 9-door agreement and its door calibration, including the two null dimensions.

Because Git cannot write its index here, `tmp/g072/history-loader.mjs` serves each tracked JS/MJS module from `git show <commit>:<path>` at its original import URL. It leaves code imports, reader logic and scoring at that revision. Older harness versions lack `--out`; only their `OUT` constant is redirected to the per-commit scratch directory. Older harness versions ignore `--non-harvest` but honor `--only`, selecting the same repo PDF from their default corpus list. The loader optionally saves the unmodified `ocrPage` return value after each page. The selected PDF, shipped OCR engine/model, and Building expected rows are unchanged across these revisions. An unrelated Rockford expected file changed in the interval but is not used for this one-set measurement. Current triage/metadata files do not determine the door agreement.

The exact invocation for each candidate was:

```sh
G072_REV=<full-commit> G072_OUT=tmp/g072/history/<short-commit> \
G072_CAPTURE=tmp/g072/history/<short-commit>/ocr \
/opt/homebrew/Cellar/node/26.3.0/bin/node \
  --loader ./tmp/g072/history-loader.mjs tools/accuracy/truth_run.mjs \
  --non-harvest --only e0abc0ac15f561ef --out tmp/g072/history/<short-commit>
```

Full logs, original OCR output, records, and actual start/end times are in `tmp/g072/history/<short-commit>/`. The report delivery includes the loader and runner so these measurements can be repeated without a writable Git index.

## Five repo-set checks

Both fresh runs regenerate exactly the five requested PDFs. The after run deliberately points `--dir` at nonexistent `tmp/g072/no-harvest-downloads` while using `--non-harvest`; repo inputs still resolve correctly. No harvest or private OCC file was read.

| Set | SHA16 | Stored main A/B/agreed | Fresh main before | g072 after | Tier |
|---|---|---:|---:|---:|---|
| Fayette | `9dffef61b825368d` | 35/53/31 | 53/53/47 | 53/53/47 | agreed |
| Rockford | `f0e863d88ea688ff` | 65/65/65 | 65/65/65 | 65/65/65 | audited |
| Berryessa | `dd339f57b51538ed` | 24/24/24 | 24/24/24 | 24/24/24 | audited |
| Building vector | `4847b09e633103f7` | 48/48/48 | 48/48/48 | 48/48/48 | exact |
| Building scanned | `e0abc0ac15f561ef` | 48/48/9 | 48/48/7 | 48/48/7 | exact |

Every fresh before/after `readers`, `agreement`, `calibration`, and `tier` object is identical on all five sets. Fresh totals including hardware are respectively 47/53, 173/175, 40/41, 102/102, and 57/98. The 29 unavailable harvest guards in `tools/accuracy/key_sets.json` were not run.

```sh
export PATH=/opt/homebrew/Cellar/node/26.3.0/bin:$PATH
node tools/accuracy/truth_run.mjs --non-harvest \
  --only 9dffef61b825368d,f0e863d88ea688ff,dd339f57b51538ed,4847b09e633103f7,e0abc0ac15f561ef \
  --out tmp/g072/before26
node tools/accuracy/truth_run.mjs --non-harvest --dir tmp/g072/no-harvest-downloads \
  --only 9dffef61b825368d,f0e863d88ea688ff,dd339f57b51538ed,4847b09e633103f7,e0abc0ac15f561ef \
  --out tmp/g072/after26
node tools/accuracy/truth/compare_runs.mjs tmp/g072/before26 tmp/g072/after26 --non-harvest
```

Fresh comparison: **exit 0**, “no set lost agreed rows or a tier.” The stored-main comparison, scoped by a scratch five-SHA key list, still exits **1** and flags only the scanned Building's 9-to-7 decrease; Fayette improves 31 to 47. `compare_runs.mjs` was not edited, and no `--allow` was used. The unscoped stored-main `--non-harvest` comparison would also require the other non-harvest records (including private OCC); it is not a valid five-set coverage check. No old records were copied into measurement outputs to hide missing coverage.

The fresh before run additionally used the same loader without a historical revision, solely to capture current OCR; the fresh after run used the plain command above.

The first exploratory run used the default Node 20.20.2, whose vendored-pdf.js geometry path returned B=0 on vector PDFs. It is retained in `tmp/g072/before/` as an invalid-runtime diagnostic and is excluded from every reported before/after measurement.

## Tests and delivered change

- `test/g072-scanned-building.test.mjs` replays two complete frozen page-3 OCR fixtures through both real readers and agreement/calibration. It pins the old false agreement, correct recovered dimensions, the two exact departing marks, and the seven genuinely correct agreements. The fixtures preserve all positioned lines, words, items and image rules; duplicated flat words and unused page-run metadata are omitted; OCR strings, coordinates and field evidence are unchanged.
- The existing real-PDF OCR test in `test/scanned-sheet.test.mjs` now also asserts 212 height=84 and 312 width=36, so reverting the pixel reread cannot pass solely because frozen text fixtures still parse correctly.
- Negative control: substituting only the parent `a7475eb` OCR client into the current real-PDF test fails the added assertion (`null !== 84` for 212 height). The current module passes in the full suite. No source file was modified for this injection.
- `cd weyland-subx-worker && node --test`: **237 tests, 237 pass, zero failures, cancellations, skips or todos** on Node 26.3.0.
- `git diff --check`: clean. No production reader, OCR source/twin, page finder, scoring logic, comparison tool, expected truth, or canonical truth record was edited.

Initially the clone had no installed dependencies, so the first full suite had 14 module-import failures. A copied local npm cache and the existing worker package lock restored 89 packages with `npm ci --offline --ignore-scripts --no-audit --no-fund`; no download occurred. `weyland-subx-worker/node_modules` points to the temporary install inside this clone. The successful full-suite log is `tmp/g072/node-test-offline.log`; the earlier missing-package log is retained separately.

## Decision for the Mac's log and record refresh

Record this correction in the Mac's existing `plan/decisions.md` when landing:

> g072: accept the scanned Building (`e0abc0ac15f561ef`) door-agreement correction 9 to 7, introduced by `233dd64` / main merge `9809ebf`. A-601 shows 212 height 7'-0" and 312 width 3'-0". The old record accepted null/null on those fields; OCR now recovers them, A is correct, and B still leaves them null. Fully correct agreed rows remain seven. Preserve the improved OCR and regenerate the canonical record from the merged tree. Keep the disagreement queue; do not suppress or redefine the comparison.

`plan/decisions.md` is not in this clone. It was not created as a substitute for the Mac's external log, and the other checkout was not accessed. A fresh corrected record and queue are already in `tmp/g072/after26/`; they are excluded from the patch. The Mac must repeat its merged-tree measurement and record promotion, as requested. The full historical sweep and these local checks do not claim coverage of unavailable harvest PDFs or the private OCC fixture.

Final clock before artifact packaging: 2026-10-10 13:52:39 UTC.
