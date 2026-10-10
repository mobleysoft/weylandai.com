# G059: reader A on mixed rotated schedule headers

## Diagnosis recorded before changing reader code

Clock: **2026-10-10 07:35:25 UTC**. HEAD and origin/main: `c426e03`.
The requested twelve-set baseline was measured with the production harness.

- **Scruggs, 72bedaaba4d51d4f, PDF page 7, A-501:** g055 only restores a rotated-label band if that band itself contains mark, width and height. Here NO. and COMMENTS are horizontal, so the rotated PANEL TYPE, Height/Width, Frame Type and HARDWARE SET are discarded. SECURITY CLASS is also absent from the header vocabulary. The horizontal remainder has no qualifying door header. The two schedules have different header baselines and must retain independent horizontal regions. The current shared `looksLikeMark` already accepts E-01/I-07, but also incorrectly accepts A-501; mark validation needs a shared detail-reference exclusion, not a digits-only replacement.
- **Mary Jane Thurston, 0da96f79112b83dc, PDF page 32, sheet 94:** the reverse mixture: DOOR NO., MATERIAL, GLAZING, TYPE, HARDWARE and LABEL are rotated; W/H/T and the detail labels are horizontal. The rotated-only gate never sees width/height and drops the mark. The staggered-header fallback also expects full SIZE/WIDTH/HEIGHT words, not W/H/T, and its explicit-mark check does not recognize a whole rotated DOOR NO. item. Four stacked tables require four independent reads. The revision-cloud arcs have no text and are not inspected by this full-size-sheet text reader; they are not the cause of A's zero. The cloud-crossed last showerhouse mark is **S204** in the original text layer.
- **Lansing School District, Averill Elementary, 5ca1073ee12bc860:** the harness locates PDF page **118**, sheet **A101**. Its `pdftoppm -r 60` render is a real door schedule with **six** populated rows: 001A, 001B, 206, 207, 208, 209. Horizontal DOOR # and rotated WIDTH/HEIGHT again fail the rotated-only gate. The schedule repeats DOOR # at the right; the repeated marks must not become extra rows or remarks. The title is printed `DOOR SCHEDULE1`, and FIRST FLOOR is a section label before the first door.

### Render count correction

The Scruggs render and original text layer contain **16 exterior + 13 interior = 29 rows**, not 30. The interior sequence skips **I-05**: I-01, I-02, I-03, I-04, I-06 through I-14. There is no empty I-05 row to recover. E-14 has an existing panel (`--`) but retains printed 7'-0" / 3'-0" dimensions. Tests will pin the actual printed 29 rows rather than invent I-05. The cabin render has **8 + 3 + 6 + 5 = 22** rows.

## Worktree constraint

The requested `git switch -c codex/g059-rotated-and-clouded` failed because this worktree's Git refs are in `/Users/johnmobley/weylandai.com/.git`, outside writable sandbox roots. The error was `Operation not permitted` creating the branch lock. Work continues in the requested worktree with its own Git; no substitute Git directory is used.

## Shared-reader change and tests

The production change is in `assets/client-ocr-src/schedule-text-layer.mjs` and its byte-identical served `.bin` twin. The Worker continues to call the same shared reader.

- Validate rotated labels together with nearby horizontal header labels, preserving physical column positions. The band still needs a mark, width, height and at least four labels. Existing wholly rotated g055 bands keep their previous table-building path.
- For newly recovered mixed-orientation headers, restrict the candidate to its own mark-to-last-label span. Find the title above the actual top of the tall rotated labels, including numbered titles such as `DOOR SCHEDULE1`. Keep separate stacked and side-by-side tables.
- Bound the table's trailing text by its printed mark rows, allowing wrapped cells but excluding drawing captions and specification footers. Otherwise the school page's captions inflate the data-line count, suppress its real column anchors, and merge its dimensions and hardware columns.
- Keep sparse/long remarks inside their own column rather than LABEL or SECURITY CLASS. Recognize SECURITY CLASS as a column boundary without exporting it as hardware or comments.
- The common mark predicate accepts E-01 and I-07 in both row and list parsing, and rejects sheet/detail references such as A-501 and K17/A-303.

No PDF identity, project, sheet, page or coordinate is hard-coded in the reader. Reader B and `compare_runs.mjs` are unchanged. There is no new request-time API, CDN or third-party dependency.

Four tests under `test/g059-rotated-and-clouded.test.mjs` run complete original page-text fixtures through production `readPageFromDoc`. They pin exact marks, table titles/counts, existing rows, dimensions, types, materials, frame types, hardware, details and selected remarks. A mutated full-page fixture proves an A-501 value in the mark column is rejected; row/list predicate checks pin E-/I- marks and detail exclusions.

`cd weyland-subx-worker && node --test`: **210/210 pass**, no failures or skipped tests (206 existing plus four new). The g055/g058 fixtures still read T2421 **33**, C2419 **4**, W2501 **11**, T2612 **14**, and X2404 **8**. Node v26.3.0 was used; the installed executable is `/opt/homebrew/Cellar/node/26.3.0/bin/node`.

## Targeted measurements

These counts are **door rows**, excluding hardware inventory items. The twelve-set command was run before and after the change against the original private PDFs.

| Set | A before | A after | B before | B after | Agreed before | Agreed after |
|---|---:|---:|---:|---:|---:|---:|
| 72bedaaba4d51d4f | 0 | 29 | 29 | 29 | 0 | 29 |
| 0da96f79112b83dc | 0 | 22 | 5 | 5 | 0 | 0 |
| 5ca1073ee12bc860 | 0 | 6 | 6 | 6 | 0 | 0 |
| 66a4b9f32d9fc75b | 33 | 33 | 33 | 33 | 33 | 33 |
| 4af80165bc367de8 | 4 | 4 | 4 | 4 | 4 | 4 |
| 6742faed77cfde33 | 11 | 11 | 11 | 11 | 10 | 10 |
| e75d52a7a714c978 | 14 | 14 | 14 | 14 | 13 | 13 |
| 6e7e2d2bf65c383b | 8 | 8 | 12 | 12 | 8 | 8 |
| 192a16af8f31ae0c | 49 | 49 | 0 | 0 | 0 | 0 |
| 7478006f7fd5b43c | 211 | 211 | 211 | 211 | 210 | 210 |
| 3506f831094dd516 | 16 | 16 | 16 | 16 | 16 | 16 |
| 194733de48af8797 | 16 | 16 | 16 | 16 | 16 | 16 |

Scruggs has **29/29 fully agreed doors**. The cabin page remains at zero fully agreed rows because B's five rows omit dimensions and materials that A reads. The school page remains at zero fully agreed rows because B omits the six printed hardware groups (#02, #01, #03, #03, #03, #03). These are additional reader A results, not a claim of independently agreed truth for all recovered fields.

The existing door schema does not export SECURITY CLASS or a separate frame-glazing field. Their columns remain distinct; those values are not mislabeled as hardware or remarks. No recovery is claimed for the nonexistent Scruggs I-05 row.

## Whole-harvest comparison

The full run completed **598/598 PDFs**, no per-file errors, exit **0**. Completion was checked with the clock at **2026-10-10 07:49:14 UTC**. The exact requested harvest comparison exited **0**, without exceptions or comparison-tool edits.

During this task, the shared `origin/main` ref advanced from `c426e03` to **dcbf410e215417121b2e170f8029c377bb597588**, a truth-record refresh on c426e03. This task did not fetch, switch or update that ref. Worktree HEAD stayed c426e03. The requested `origin/main` comparison used dcbf410; its full table follows:

| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 0da96f79112b83dc | 22 | 5 | 0 | 0 | unread | oracle-checked |
| 5ca1073ee12bc860 | 6 | 6 | 0 | 0 | unread | unread |
| 72bedaaba4d51d4f | 29 | 29 | 0 | 29 | unread | agreed |
| df2c6ec2225731d7 | 3 | 0 | 0 | 0 | oracle-checked | oracle-checked |

```text
no set lost agreed rows or a tier
```

The three target sets gain **57 A doors and 29 agreed doors**. The only other A-count change is `df2c6ec2225731d7`, **4 -> 3**. Its page 10, A-300 (U2610-01), was rendered at 60 dpi: the removed `A-300` is a detail/sheet reference, not a door. The sheet has two actual door rows (101, 102); the pre-existing false `2X` row and contaminated fields remain. Thus the net harvest change is **+56 A rows**, with no lost genuine door mark, no B-count change and no lost agreed door rows. This is not a claim that the remaining three extracted rows on that additional sheet are all valid.

## Audited calibration and an existing baseline loss

All four audited PDFs were remeasured, including OCC. To distinguish a reader change from stale committed records, all four were also rerun using the **original HEAD reader A source**: a Node loader substitutes the exact `git show HEAD:weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs` content at import time, leaving every other module unchanged. The complete calibration objects for all four fresh before/after records are identical.

`truth_report.mjs` was run with the freshly measured baseline audits and again with the final audits. Over 280 expected rows:

| Metric | Fresh HEAD before | G059 after |
|---|---:|---:|
| A rows found / fully right | 237 / 233 | 237 / 233 |
| A fields right / compared | 1292 / 1298 | 1292 / 1298 |
| B rows found / fully right | 235 / 209 | 235 / 209 |
| B fields right / compared | 1236 / 1288 | 1236 / 1288 |
| Agreed rows found / fully right | 208 / 207 | 208 / 207 |
| Agreed-row fields right / compared | 1103 / 1105 | 1103 / 1105 |

The report's agreement-method calibration is unchanged between fresh runs: **207/208** agreed rows fully right (99.5%), **1110/1113** agreed fields right (99.7%), **52** disputed fields (A right 49, B right 3, neither 0). Reader A's calibration matches the initial committed calibration as well. Final calibration was checked at **2026-10-10 07:51:21 UTC**.

However, the committed audited records are stale relative to reader B at HEAD: on **Berryessa dd339f57b51538ed**, B now omits fire ratings and hardware groups on 24 doors, while A still reads them correctly. This reproduces with the unmodified HEAD reader A, and B imports no A code. The initial stored report had 231/232 fully right agreed rows and 1158/1161 right agreed fields. The fresh report has the figures above. **The requirement to retain the stored audited calibration is therefore not met**, although g059 introduces no fresh-baseline calibration loss. Reader B was not changed to hide or fix this separate issue.

After merging the fresh audited results into the measured truth directory, the exact comparison was repeated and exited **1**. Its complete table identifies the genuine existing loss; no `--allow` exception was used:

| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |
|---|---|---|---|---|---|---|
| 0da96f79112b83dc | 22 | 5 | 0 | 0 | unread | oracle-checked |
| 5ca1073ee12bc860 | 6 | 6 | 0 | 0 | unread | unread |
| 72bedaaba4d51d4f | 29 | 29 | 0 | 29 | unread | agreed |
| dd339f57b51538ed | 24 | 24 | 24 | 0 | audited | audited | 🚨 REGRESSION
| df2c6ec2225731d7 | 3 | 0 | 0 | 0 | oracle-checked | oracle-checked |

```text
REGRESSION: at least one set lost agreed rows or a tier; name accepted drops with --allow <sha,...> and record why in plan/decisions.md.
```

The harvest-only comparison above passes; the combined refreshed harvest-plus-audits comparison does not. Both are reported to avoid presenting stale audited records as a successful fresh calibration. The final report contains 616 records and 3438 queue lines. Synthetic records were retained, not rerun.

## Reproduction commands

```sh
export PATH=/opt/homebrew/Cellar/node/26.3.0/bin:$PATH
(cd weyland-subx-worker && node --test)
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only 72bedaaba4d51d4f,0da96f79112b83dc,5ca1073ee12bc860,66a4b9f32d9fc75b,4af80165bc367de8,6742faed77cfde33,e75d52a7a714c978,6e7e2d2bf65c383b,192a16af8f31ae0c,7478006f7fd5b43c,3506f831094dd516,194733de48af8797
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads
node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth tools/corpus/harvest/truth
OCC_PDF=/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf node tools/accuracy/truth_run.mjs --only 525dc0b72011077a,dd339f57b51538ed,f0e863d88ea688ff,fb3e0a8137da6cdf --out /tmp/g059/audited-after
node tools/accuracy/truth_report.mjs --label g059-after
```

The audited output uses a separate directory while the harvest runs. Its four records and queue lines were subsequently merged for the final report and second comparison. Full logs, renders, original-reader loader, before/after records and reports are retained under `/tmp/g059/`; the original PDFs were only read. Regenerated tracked truth files were restored to HEAD after recording the results, and newly generated g059 truth reports were moved to the scratch evidence directory. No truth records or truth_report files are included in the source change.

## Delivery limitation

Source, fixtures, tests and this document are complete locally. **No branch, commit or push was possible** with the worktree's own Git: its refs and index live outside the sandbox's writable roots. No alternate Git metadata directory, other checkout, PR, deployment, Cloudflare, credentials or ventures.json was used. The requested branch remains `codex/g059-rotated-and-clouded` for the Mac to create from this HEAD, commit these source/test/doc files, and push with `git push -u origin codex/g059-rotated-and-clouded`.
