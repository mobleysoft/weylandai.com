# g070: Fayette and non-harvest truth coverage

Work is based on detached `837a415d8a416ce63f2d097f53dc95b98f22b5da` (`origin/main`). Start clock: 2026-10-10 12:37:45 UTC (08:37:45 EDT). All source edits are in the supplied plain clone. Branch creation failed with `Operation not permitted` creating `.git/refs/heads/codex/g070-fayette-and-non-harvest-sets.lock`; delivery is a working-tree patch, not a commit or PR. No deployment, Cloudflare operation, credential access, kernel edit, or regenerated truth-record commit was performed.

Fayette now measures **A 53, B 53, 47 agreed door rows**, from **27 / 53 / 22** on fresh main. All requested guard counts remain unchanged. The comparison now requires the non-harvest records and checks audited calibration. The stored-main comparison still reports a genuine pre-existing loss on the scanned synthetic Building; it is not waived. The visual-count limitation below also remains explicit.

The commands used Node **v26.3.0**, `/opt/homebrew/Cellar/node/26.3.0/bin/node`. The initial default Node 20 run returned B=0 because its runtime cannot execute this vendored pdf.js geometry path; that run was replaced before measurement. No production code was changed for Node 20.

## Diagnosis and shared fix

The diff `git diff e5cb98a^ e5cb98a -- weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs` isolates the cause to the table boundary change:

```diff
- /^(?:GENERAL\s+NOTES?|NOTES)\s*:/i
+ /^(?:GENERAL\s+NOTES?|NOTES?)\s*:/i
```

On Fayette page 14, `NOTE: SOME ITEMS MAY NOT BE USED ON THIS JOB.` is a caption under the type drawings **left of** the schedule. Its baseline is y=849.0 pt, between the schedule's 119C and 120A baselines. Its text begins at x=792.1 pt; the numbered marks begin around x=1507 pt. The broad header search has included the neighbouring drawings, so the note is inside its provisional x-span. The new singular-NOTE stop cuts collection short, at 45 data lines. Column inference then merges the right-hand labels into `DOOR SCHEDULE Hardware Fire Set Rating Door Type Frame Type THK. Remarks`. That cell maps to thickness, losing the hardware/fire/type evidence needed to recognize this candidate as a door table. The whole 26-numbered-row table is discarded, not merely its last three rows. Page 5 stays at 27.

Changing only that singular-NOTE addition back restores 27+26=53, isolating the cause from g058's mixed-header pass and row acceptance logic. The fix retains singular and plural note boundaries, but a note wholly left of the explicit mark header cannot terminate the table. It uses positioned header items and text-height tolerance, with no SHA, project, sheet, page or fixed-coordinate condition. The browser `.bin` twin is byte-identical to the shared source. Reader B is unchanged.

`test/g070-fayette.test.mjs` uses two complete original page-text fixtures, including all adjacent drawings, captions and title-block text. It pins all 27 page-5 marks and all 26 page-14 marks, checks representative sizes, and covers a plural-NOTES variation. The g058 tests still verify real singular-NOTE boundaries on the mixed sheets. With the exact main reader injected at its original module URL, the two page-14 tests fail and the page-5 test passes. The normal reader passes all three.

## Sheet inspection and limits of the count

Both requested pages were rendered and inspected with:

```sh
pdftoppm -f 5 -l 5 -r 60 -singlefile -png tools/corpus/plan-sets/fayette_ga_2419_addendum1_plans.pdf tmp/g070/fayette-5
pdftoppm -f 14 -l 14 -r 60 -singlefile -png tools/corpus/plan-sets/fayette_ga_2419_addendum1_plans.pdf tmp/g070/fayette-14
```

The local Poppler 26.03 render has broken font glyphs (including an invalid embedded-font warning). Page 14 has **29 populated physical lines**: two `##` placeholders, 26 numbered entries, and one `C.O.` line. The 26 numbered entries were counted on that grid and matched to the positioned text. Page 5's render shows the specifications sheet but does not expose a readable 27-row schedule block; a pdf.js canvas render and a CropBox render did not resolve this. Its text contains 27 numbered schedule entries, including 119D, and both readers extract those entries.

Accordingly, **53 is the restored extracted numbered-entry count, not a certified visual ground-truth total for this PDF**. It also counts entries across two pages, not 53 unique building openings. A legible page-5 source/render still needs independent inspection. No regenerated record was promoted to audited truth. The reader still omits the two `##` placeholders and the `C.O.` line, and the latter still contaminates page-14 122A's height (null); page-5 field disagreements also remain. This task does not claim every recovered field is correct.

## Selection and comparison

`tools/accuracy/truth/inputs.mjs` resolves the records' repo-relative file paths. Historical harvest records with a basename and `source: harvest` resolve beneath the download directory; a repo `tools/corpus/...` or `tools/bidset/...` path remains non-harvest. The private OCC basename resolves from `OCC_PDF`. Missing files, unknown requested hashes and content/hash mismatches fail visibly. A per-file exception or a requested record not regenerated now gives `truth_run` a nonzero exit.

- `--only 9dffef61b825368d --out <fresh-dir>` works without `--dir`, verified on the final harness.
- `--non-harvest` runs all **18** recorded non-harvest PDFs, including the four audited sources, vector and scanned Building, and remaining corpus files. OCC requires `OCC_PDF`; missing OCC fails instead of silently retaining its old record.
- `--key-sets tools/accuracy/key_sets.json` resolves both harvest and repo PDFs. With this flag, `--dir` overrides only the harvest location. `--only` additionally narrows the key list.
- `compare_runs.mjs` compares every baseline record by default and **fails if an after record is missing**, even if named in `--allow`. It supports the same `--key-sets` list and a `--non-harvest` scope for deliberate partial runs. Missing selected keys fail too. A matched audited record also fails on missing calibration or decreasing found/fully-correct rows, correct fields, or correct agreed fields. Existing agreed-door-row and tier loss checks remain; no set is exempted and no `--allow` was used.

Five measure tests cover cross-directory resolution, missing files/OCC/keys, malformed key lists, non-harvest omission, scoped genuine losses, and audited-field loss with unchanged door counts.

## Full named key list and measured counts

The 29 harvest guards are the union of the ten g042 spot checks, seven additional g058 guards, three g059 sets, and nine g061 C8 sets. The four requested non-harvest keys bring the list to **33**. No existing named list was present in this clone; membership was reconstructed from those published repo lists, without reading or modifying the kernel recipe. The `name` and `group` fields are descriptive; `sha16` selects the PDF. The table below is the complete contents of `tools/accuracy/key_sets.json` plus measured counts. A/B/agreed count doors, excluding hardware items. C3 retains 16 physical quantity/range rows; X2319 and T2332 retain g061's count/list expansion semantics.

| Set | SHA16 | Stored A/B/agreed | Fresh main A/B/agreed | g070 A/B/agreed |
|---|---|---:|---:|---:|
| C2410 C3 | `3506f831094dd516` | 16/16/16 | 16/16/16 | 16/16/16 |
| C2410 addendum C3 | `194733de48af8797` | 16/16/16 | 16/16/16 | 16/16/16 |
| X2207 | `eefa018e007e581f` | 84/84/78 | 84/84/78 | 84/84/78 |
| C2512 | `7239a04e6cc8b502` | 75/75/71 | 75/75/71 | 75/75/71 |
| SOC-250003 | `21d60f1b54e0e3df` | 19/19/8 | 19/19/8 | 19/19/8 |
| T2504 | `e3d0cc1bc22fd824` | 22/22/22 | 22/22/22 | 22/22/22 |
| T2147 | `89236ffa156fbaf5` | 29/29/29 | 29/29/29 | 29/29/29 |
| U2607 | `44111d93bd635936` | 44/44/44 | 44/44/44 | 44/44/44 |
| R2502 | `7478006f7fd5b43c` | 211/211/210 | 211/211/210 | 211/211/210 |
| X2530 | `18b27b8baa47f0e1` | 36/36/36 | 36/36/36 | 36/36/36 |
| T2507 | `192a16af8f31ae0c` | 49/49/47 | 49/49/47 | 49/49/47 |
| T2421 | `66a4b9f32d9fc75b` | 33/33/33 | 33/33/33 | 33/33/33 |
| C2419 | `4af80165bc367de8` | 4/4/4 | 4/4/4 | 4/4/4 |
| W2501 | `6742faed77cfde33` | 11/11/10 | 11/11/10 | 11/11/10 |
| T2612 | `e75d52a7a714c978` | 14/14/13 | 14/14/13 | 14/14/13 |
| X2404 rebid | `6e7e2d2bf65c383b` | 8/8/8 | 8/8/8 | 8/8/8 |
| X2404 | `70ab5446590e40cc` | 8/8/8 | 8/8/8 | 8/8/8 |
| O2544 Scruggs | `72bedaaba4d51d4f` | 29/29/29 | 29/29/29 | 29/29/29 |
| Mary Jane Thurston cabins | `0da96f79112b83dc` | 22/5/0 | 22/5/0 | 22/5/0 |
| Averill Elementary | `5ca1073ee12bc860` | 6/6/0 | 6/6/0 | 6/6/0 |
| F2402 | `8900a915fe932a31` | 8/7/7 | 8/7/7 | 8/7/7 |
| O2604 | `43a1f0db3f7ff345` | 7/7/7 | 7/7/7 | 7/7/7 |
| E2332 | `3b0cb226a793d955` | 7/0/0 | 7/0/0 | 7/0/0 |
| E2332 copy | `e8a888bdd7523b77` | 7/0/0 | 7/0/0 | 7/0/0 |
| R2508 | `ff9c494916a7d8b5` | 2/0/0 | 2/0/0 | 2/0/0 |
| X2319 (4+4) | `32b631d235082c7c` | 8/0/0 | 8/0/0 | 8/0/0 |
| X2319 (5+7) | `400e8c6b5df592d0` | 12/0/0 | 12/0/0 | 12/0/0 |
| T2332 | `08222a6152c7525b` | 14/0/0 | 14/0/0 | 14/0/0 |
| R2402 | `8c336c43fa7f9668` | 2/0/0 | 2/0/0 | 2/0/0 |
| Fayette | `9dffef61b825368d` | 35/53/31 | 27/53/22 | 53/53/47 |
| Rockford | `f0e863d88ea688ff` | 65/65/65 | 65/65/65 | 65/65/65 |
| Berryessa | `dd339f57b51538ed` | 24/24/24 | 24/24/24 | 24/24/24 |
| WeylandAI Building (vector) | `4847b09e633103f7` | 48/48/48 | 48/48/48 | 48/48/48 |

## Whole corpus comparison and calibration

All 598 harvest PDFs and all 18 non-harvest PDFs were freshly regenerated into scratch outputs: **616 total**, with **3,379** disagreement queue entries after combining only freshly generated records. The 33-key run independently agrees with its corresponding full-run counts. Before/after source comparisons use the exact `837a415` shared-reader source through a temporary ESM loader at its original import URL; all other reading/scoring code stays the same. The full before run also regenerates all 616 inputs. No committed record was copied into either measurement output as a substitute for regeneration.

Fresh main versus g070: **exit 0**, all 616 records covered, no exceptions. The only changes across the complete reader, agreement, calibration and tier objects are on Fayette. The fresh queue decreases from 3,404 to 3,379. Complete comparison output:

```text
| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 9dffef61b825368d | 53 | 53 | 22 | 47 | agreed | agreed |
no set lost agreed rows or a tier
```

The comparison against stored `origin/main:tools/corpus/harvest/truth` exits **1**. Its complete output:

```text
| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 9dffef61b825368d | 53 | 53 | 31 | 47 | agreed | agreed |
| e0abc0ac15f561ef | 48 | 48 | 9 | 7 | exact | exact | 🚨 REGRESSION
REGRESSION: missing coverage, audited calibration loss, or a set lost agreed rows or a tier; regenerate missing records. Name accepted drops with --allow <sha,...> and record why in plan/decisions.md.
```

The stored-main comparison has one genuine loss: `e0abc0ac15f561ef`, **scanned** WeylandAI Building, stays A=48/B=48 but falls from **9 to 7 agreed doors** (stored total agreed including hardware 59, fresh 57). This reproduces on fresh unchanged main as well as g070. The vector Building key `4847b09e633103f7` stays 48/48/48. The entire scanned calibration object is identical between the fresh before and after runs. The cause of its drift from the October 9 stored record was not diagnosed here. Thus an unqualified claim that the stored-main comparison is clean would be false; the new inclusion exposes this loss. No exception, comparison relaxation, or truth-record refresh hides it.

All **four audited calibration objects** are identical to both the stored baseline and fresh main (Christina `525dc0b72011077a`, Berryessa, Rockford, private OCC `fb3e0a8137da6cdf`). Over 280 expected rows:

| Audited metric | Stored main | Fresh main | g070 |
|---|---:|---:|---:|
| A rows found / fully correct | 237 / 233 | 237 / 233 | 237 / 233 |
| A correct / compared fields | 1292 / 1298 | 1292 / 1298 | 1292 / 1298 |
| B rows found / fully correct | 235 / 233 | 235 / 233 | 235 / 233 |
| B correct / compared fields | 1284 / 1288 | 1284 / 1288 | 1284 / 1288 |
| Agreed rows found / fully correct | 232 / 231 | 232 / 231 | 232 / 231 |
| Agreed-row correct / compared fields | 1271 / 1273 | 1271 / 1273 | 1271 / 1273 |
| Agreement-method correct / compared fields | 1158 / 1161 | 1158 / 1161 | 1158 / 1161 |

Agreement-method calibration remains **231/232 fully correct agreed rows (99.6%)**, **1158/1161 correct agreed fields (99.7%)**, and four disputed fields (A correct 1, B correct 3, neither 0). OCC remains zero. This is in-sample audited calibration, not a field-accuracy guarantee for all corpus PDFs.

Validation: `cd weyland-subx-worker && node --test`: **235/235 pass**, zero failures or skips. Independent reader B regression suites: **18/18 pass**. The 33-key run and both 598-harvest/18-non-harvest regeneration runs complete without per-file errors. The 33-key comparison against stored main exits **0**. `git diff --check` passes, and the served reader twin matches the source. Final full-run coverage and unchanged audited calibration were checked at **2026-10-10 12:53:41 UTC**.

## Commands for the Mobley land recipe

Run these from the merged repository root in the Mac's `etc/land/weylandai.json` measure step. The kernel file is not edited here. Use Node 26 and the already-local downloads and OCC fixture. Each measurement output starts empty; the full harvest and non-harvest commands run **sequentially into the same output**, so records and queue replacements are complete. Do not seed the output with main's old records, and do not compare until both regeneration commands have succeeded.

```sh
set -eu
export PATH=/opt/homebrew/Cellar/node/26.3.0/bin:$PATH
export OCC_PDF=/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf
g070_run=$(mktemp -d "${TMPDIR:-/tmp}/g070-measure.XXXXXX")
(cd weyland-subx-worker && node --test)

# Fast named guard set, including all four newly required repo PDFs.
node tools/accuracy/truth_run.mjs --key-sets tools/accuracy/key_sets.json --out "$g070_run/keys"
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth "$g070_run/keys" --key-sets tools/accuracy/key_sets.json

# Full coverage, freshly regenerating every harvest and non-harvest record.
node tools/accuracy/truth_run.mjs --dir tools/corpus/harvest/downloads --out "$g070_run/all"
node tools/accuracy/truth_run.mjs --non-harvest --out "$g070_run/all"
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth "$g070_run/all"
```

The final command currently exits 1 for the genuine scanned-Building loss above; it must remain visible until diagnosed or explicitly accepted by the owner under the existing loss policy. The 33-key comparison passes. To inspect just non-harvest coverage, compare that same full output with `--non-harvest`. To repeat the Fayette check alone, use `node tools/accuracy/truth_run.mjs --only 9dffef61b825368d --out "$g070_run/fayette"` without `--dir`.

In this clone, harvest downloads and OCC were read from their existing Mac paths; they were not copied into or modified in the other checkout. All generated records, logs and renders stayed under this clone's `tmp/g070/`, outside the patch. Delivery in the requested sibling `g070/` contains `g070.patch` against pinned origin/main and `report.md`. New fixture/code/doc files are included as additions in that patch because the sandbox cannot stage them. The two pre-existing untracked `node_modules` links are untouched.
