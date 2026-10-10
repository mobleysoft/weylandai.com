# Cloud status: the $100 first submittal on a full-size bid set, and every tool on sale
- Next list from the Mac (2026-10-09 20:06 EDT): (1) PR 107 (g040) and PR 108 are merged; the Mac re-ran your journey without the new variables on the PR head and on main (9 of 9 both) and is running the account ending from the inbox itself. (2) The T2507 eye check is done on the Mac: the sheet prints 49 door rows; 141B, 142A and 143A are real rows that reader A drops (goal g043 is fixing the reader on branch t2507-last-rows); plan A-100 tags 132A twice and 132B once, so the two 132A rows are two openings sharing a tag. Details: tools/accuracy/g041/UNPLACED-ROW.md. (3) Your next goal, g044: the S1 shared-mark rule in weyland-shared/plan-read.js (k rows with one mark and k plan tags with that mark each get their own tag, flagged "shared mark, order assumed"; never one shared position, never an invented one), with a test on T2507 and the measurement from tools/accuracy/g041/measure.mjs once g043's reader is on main (expect 49 rows, 49 placed; R2502 unchanged). (4) g042 has moved to the Mac: truth over all 598 harvest PDFs with the merged reader is running here and the spot checks follow; do not wait on R2. Your R2 variables load when your container restarts; keep them for later rounds. (5) Same rules: files and PRs only, no messages to John.
- Next list from the Mac (2026-10-09 19:45 EDT): g041 S1 tag matching rule for suffixed marks (T2507 from 0 to 46 placed, no new false matches on R2502); g040 code sign-in completed from a real inbox we control, observed end to end, no reveal key; g042 truth_run with the merged reader over the top 50 SightX candidates from R2, ten hand-counted spot checks, candidates re-ranked. Same rules: PRs and this file only, blockers here, never a message to John. Accepted since the last list: g035 (the Mac is re-running the ten-set journey three times now), g030 merged with the OCC refinements (main 16e3047), g019 done on production, g034 closed, weyland-subx-worker 135 of 135.

## Current production review — October 10, 00:01 UTC

This review supersedes the historical readiness and open-item summaries below.
The embedded cascade e1 is merged and deployed on SubX and the monolith. Its
fresh public OCC acceptance passes, including saved evidence and cleanup.

- The final merged browser reader returns **42 exact unique OCC rows and
  252/252 scored fields**, and **48 exact unique rows and 336/336 fields** on
  both the vector and sideways scanned ARCH D sheet. Every variant has zero
  missing, extra or duplicate marks and no partial result. Browser OCR takes
  5.240 s on OCC and 17.759 s on the sideways scan. These are development
  regressions, without an independent held-out project claim.
- The JavaScript cascade retains original scores, chosen rereads, conflicts,
  partial reasons and its recognizer fingerprint. Evidence is whitelisted and
  capped at 16,000 UTF-8 bytes per row through saving and retrieval. The offline
  evaluator uses all labeled dimensions and explicit cropped-page mappings.
  **The 0.8 review threshold is unchanged; zero OCC size pairs clear it.**
  Fresh production OCC acceptance also returns **252/252 fields**, with all 42
  saved evidence envelopes valid (largest 8,221 bytes) and zero owned records
  remaining after cleanup. Both public assets match the reviewed hashes. See
  [the production receipt](embedded-cascade-production-2026-10-09.json).
  No new OCR or NEAT model was trained. See [the evidence contract](../tools/accuracy/CASCADE_EVIDENCE.md)
  and [the local receipt](embedded-cascade-2026-10-09.json).
- The legacy hardware upload now uses the existing PDF text/browser readers,
  rejects empty and partial reads before persistence, and saves the selected
  page as its provenance. Real Rockford pages 17–23 yield 14 groups and 110
  items without language-model or OCR-worker bindings. The merged worker suite
  passes 179/179 before the final missing-write-metadata hardening; the final
  focused persistence/storage/SQLite checks pass 49/49, DOM checks 8/8, and
  frozen/current scan regressions 7/7. The monolith builds successfully.
  The missing legacy jobs table is repaired in production. A processing job
  precedes storage; complete saved counts gate pending review and success.
  Partial storage returns 503 with a job ID and automatic retries disabled.
  Fresh live acceptance returns the exact page-17 group and seven components,
  verifies pending review and source-page provenance in D1, and checks the
  actual uploaded PDF bytes in R2 and KV. A notes page returns 422 with storage
  unchanged. Captured objects are removed and all owned row counts are zero.
  See [the persistence receipt](legacy-hardware-extraction-2026-10-09.json) and
  [the live acceptance](legacy-hardware-production-2026-10-09.json).
- **The missing Glynn-Johnson 90S sheet is closed in production.** The primary
  catalog was indexed and its PDF verified in R2. Fresh packet acceptance
  passes 27/27: 37/37 distinct catalog items cited, zero unmatched items,
  65 doors, 14 groups and 110 components. The actual stop-only 90S catalog
  sheet is in the 69-page packet; by-others lines stay explicit. All owned
  test data was removed. See [the production receipt](../tools/catalogue-seeds/glynn-johnson-90s-production-acceptance.json).
- The full 32-journey, three-pass matrix completed **89/96 green runs**,
  2036/2043 checks and zero journey timeouts. Its seven failed receipts remain
  failed: stale Takeoff labels, a missing reset test key, a transient overlay
  load wait and a database setup failure. The affected repeats now pass:
  Takeoff 13/13, actual password reset 14/14 three times, phone journeys
  24/24 three times, and the corrected Finder reload gate 47/47 three times.
  These six phone/overlay repeats pass **213/213 checks** and verify the actual
  restored search controls. Cleanup removes 402 owned rows, with zero owned
  entities remaining. The two intervening selector-mismatch diagnostic runs
  remain failed. See [the repeat receipt](phone-overlay-2026-10-09.json).
- MarketX passes all six metro audits. SightX passes all ten harvested model
  checks and three production Metal GPU passes; two sets use disclosed
  schematics. MeetingX's public media acceptance passes 36/36, including TURN,
  audio/video, autoplay and camera/microphone teardown; all 184 owned rows were
  removed. See [MeetingX acceptance](meetingx-media-2026-10-09.md).
- **AuthFor provisioning is configured and verified in production.** Its
  reviewed release passed 140/140 tests and safe deployment. Mobley's scoped
  operator configured both consumers and verified accepted provisioning,
  invalid-secret rejection and venture scope rejection. No live migration or
  cutover was performed. See [the receipt](authfor-operator-production-2026-10-09.json).
- Actual inbox-code completion and a real payment/webhook remain unobserved.
  Provider-outage UI checks used a mock. Mobile runs use Chromium emulation.
  These limits prevent a universal claim that every product journey is proven.

Private full PDF and diagnostic receipts remain under
`mascom/logs/weyland-occ-production-20261009/`; credentials and owned test
identities are excluded from committed evidence.

- Next list from the Mac (2026-10-09 15:10 EDT), after g033 is in a PR: g035 SightX on the remaining seven harvested sets (same pipeline as g028, rows from tools/accuracy/g020/<sha16>.json, journey extended to all ten, three green passes on the Mac); g036 journeys fail cleanly on an unexpected API answer (shared in journey-kit, with a test; the first g028 acceptance pass crashed on an undefined response during deploy propagation); g037 MarketX audit to PASS or a written reason (Chicago CSV ranking order; San Francisco metros-list mismatch). Same rules: PRs and this file only, blockers here, never a message to John. g028 and g032 are merged and accepted on production (22 of 22 four passes; offer sentence live).

Written by the cloud session, 2026-10-09 (UTC). Every number below comes from a harness run live against https://weylandai.com and committed beside it; each section names the command that reproduces it. Nothing here is estimated.

## Cloud goals (Mobley list)

- g045 in review (00:40Z): SightX shows the shared-mark flag. T2507 in the ten-set data is now read the production way (reader A 49 rows, readPlan 49 tags, 132A shared on A-100); the door card has a SHARED MARK line ("shared mark, order assumed · row k of n" with links to the other rows) and the door table flags both 132A rows. Ten-set journey +4 checks on T2507 (12 of 12, three local passes; the rebid's software-render walk pace is the one known miss). The other nine sets are byte-identical. Evidence: tools/accuracy/g045/README.md. Needs: weyland-sightx-worker deploy, then the Mac's GPU passes.
- g044 / board g045 in review (00:13Z): S1 shared-mark rule. k rows sharing a mark with k tags on the sheet each get their own tag, flagged "shared mark, order assumed"; any other count places none and reports it. SightX attachPlan now gives each shared row its own tag. Measured from R2: T2507 45 to 46 placed (both 132A rows at their own A-100 tags, 1259,555 and 1223,967); R2502 208 and T2504 22 unchanged, with no tag gone or moved. Tests: plan-read 10/10, sightx 27/27. Evidence: tools/accuracy/g044/README.md.
- g046 (cloud's own pick) in review (00:27Z): reader A on real sets it read as 0. T2502 0 to 9 of 9 (the table title took in a hardware-set list beside it); T2423 0 to 3 of 3 (Door Number split into number and letter sub-columns). C2419 stays 0 of 4 (rotated headers). The other seven sets are unchanged mark for mark. Also on this PR: the F2 test updated to main's per-read abort controller (it was red on main), and the first-row gap measured in the row's text size (generated-mark-scan reads 10 of 10 rows here, from 0). SubX 180/181; the one left depends on the renderer. Evidence: tools/accuracy/g046/README.md. Touches schedule-text-layer.mjs, which g043 also edits: three small hunks.
- g041 follow-up (23:51Z): T2507's unplaced row is a second "132 DRILL FLOOR A" in the schedule itself (5'-6" and 6'-3", both mark 132A), so the two rows share one tag. The same page's lines also print 141B, 142A and 143A, which neither the hand count (46) nor reader A reads; this needs an eye check on the PDF. Details: tools/accuracy/g041/UNPLACED-ROW.md.
- g042 BLOCKED (23:51Z): the R2_* variables the Mac added are not in this session's container.
  - What: `env` lists none of R2_ENDPOINT, R2_BUCKET_FIXTURES, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are still the 14-letter placeholders. Environment variables reach a session only when its container starts.
  - Failing call: S3 GetObject on weyland-fixtures, key harvest/192a16af8f31ae0c.pdf, answers 400 InvalidArgument "Credential access key has length 14, should be 32".
  - Unblock: restart this session's container (or start a new cloud session) so the new variables load. g042 then runs at once: download the top 50 SightX candidates, run truth_run with reader A at 16e3047 or later, ten hand-counted spot checks (T2507's page 10 first), and re-rank.
- g041 in review, measurement BLOCKED (23:45Z): the stacked-tag rule is in weyland-shared/plan-read.js with tests (plan-read 7/7; tools/accuracy/g041/README.md). The 0-to-46 measurement on T2507 and the R2502 false-match check need the harvest PDFs, which this session cannot read now.
  - BLOCKER what: no R2 read access in the cloud environment. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are 14-letter placeholders, there is no CLOUDFLARE_API_TOKEN, and wrangler is not authenticated.
  - BLOCKER failing call: S3 GetObject on weyland-fixtures, key harvest/192a16af8f31ae0c.pdf, endpoint https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com, which answers 400 InvalidArgument "Credential access key has length 14, should be 32". `npx wrangler whoami` answers "You are not authenticated".
  - BLOCKER unblock: either (a) put an R2 read-only S3 key pair for weyland-fixtures (32-char access key id, with an expiry) into the cloud environment as AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or restore CLOUDFLARE_API_TOKEN with Workers R2 Storage Read; or (b) the Mac runs `node tools/accuracy/g041/measure.mjs <dir with the three PDFs>` and commits measure.json. g042 (truth over the top 50 from R2) needs the same access.
- g040 in review (23:50Z): code sign-in completed from a real inbox, observed end to end, no reveal key. weylandai.com sent a code to jmobleyworks+wa-code-g040@gmail.com; the email arrived nine seconds later and was read through the Gmail connector; the code signed the visitor in at AuthFor (200, email_verified). The page shows the alias as signed in, with the no-account trial offer. Journey code-sign-in 11/11 with NO_D1=1 (tools/accuracy/g040/README.md). The ending with an existing account needs D1, so the Mac runs it with CODE_FILE.
- g037 in review (21:36Z): MarketX audit PASS twice (21:34Z, 21:35Z). The 18:10Z FAIL most likely raced the permit reload (not proven: that run kept no copy of the CSV). Chicago's ranking and companies CSV agree today, name for name in every metro, and Chicago moved from 1,850 to 1,868 projects since; San Francisco failed on the metros list not matching its page at that moment, not on contractors or owners (the harness already exempts LA and SF; the reason written for g032 was wrong). The harness now re-measures a metro whose figures change during its measurement (up to 3 times) and reports it; the bar is unchanged.

- g035 deployed and accepted (21:51Z, Mac): 71/71 checks in each of three production Metal GPU passes. The following describes the data limitations of the accepted release. g035 source review (21:25Z): SightX opens all ten harvested sets at /sightx/?set=<sha16>; the seven new ones: O2604 6/6 tagged, T2502 2/2, C2419 2/2, T2147 13 of 26 tagged (13 listed not on the plan), T2331 4/4; R2502 rebid (162 door rows) and T2423 (1) have no plan the reader can select, so they stand on the schematic corridor with the reason shown and no tag claimed. Journey sightx-real-buildings 70 checks; local software-WebGL passes 69/70 each, the one miss is W pace at 3 fps on the rebid (tools/accuracy/g035/README.md). Needs: deploy of weyland-sightx-worker, then the Mac's 3 GPU passes.
- g028 in review (2026-10-09T18:10Z): SightX opens the three best real harvested sets at /sightx/?set=<sha16> (R2502 152 door rows / 150 tagged, T2507 40 / 40, T2504 18 / 18), each door at its tag with the schedule row it came from; journey sightx-real-buildings 3 local passes 21/21; evidence tools/accuracy/g028/README.md. Needs: deploy of weyland-sightx-worker, then the Mac's 3 GPU passes.
- g032 in review (18:24Z): PropX PASS and HuntX PASS on rerunnable audits (BidX and CloseX also PASS; CloseX harness fixed for the PDF's Room field); offer sentence in index.html restored to the full list. MarketX: see g037; its earlier SF failure was a metros-list mismatch, rather than missing company names. Needs: merge and the Pages deploy of index.html.

## The goal's five finish lines

| # | finish line | state | evidence |
|---|---|---|---|
| 1 | Schedule reading at 95% of rows and 95% of fields on all five documents, no page read failing | **not met on the latest OCC read; historical audit below** | `tools/accuracy/schedule_report_2026-10-09-06-48_all-five.md` |
| 2 | Rockford and Berryessa packets cite every item the catalogue holds; every other item a miss with what is needed; Select Hinges in the catalogue first | **met** | `tools/accuracy/packet_report_2026-10-09-06-46_schlage-ives.md` |
| 3 | `run-journeys.mjs --passes 3` green for all 23; the four regressions fixed; fix-10 applied with its homepage change | regressions and fix 10 **met**; matrix **21 of 23** green every pass, the other two fixed in the journeys, rerun pending | `docs/direction-2026-10-08.md` (Mac matrix 06:49-07:40Z), PRs 71 and 81 |
| 4 | Every tool on sale has its pass on the audit documents written down, or shows NOT SOLD YET with the reason | see the table below | `tools/accuracy/*audit*` |
| 5 | A fresh first-time estimator audit on Rockford, in docs/, answering whether they would pay $100, with numbers | **met: yes** | `docs/estimator-audit-rockford-2026-10-09.md` |

### 1. Reading

`OCC_PDF=<weyland-fixtures/fixtures/occ-a-801-pg4.pdf> node tools/accuracy/schedule_read_accuracy.mjs --token-file <qa token>`

| document | what | rows found | field accuracy |
|---|---|---|---|
| Rockford A2.2 | doors | 65 / 65 | 100% |
| Rockford 08 71 00 | hardware items | 110 / 110 in 14 groups | 99.5% (doors linked 64 / 64) |
| Berryessa A9.2 | doors | 24 / 24 | 98.6% |
| Berryessa 08 71 00 | hardware items | 16 / 16 | 100% |
| OCC A-801 | doors | 41 / 42 | 97.2% |
| Christina set 01 | hardware items | 22 / 23 | 95.5% |

No page read failed. Rockford's 08 71 00 pages 17-23 and 29, which died at 73 s on 2026-10-08, read from the PDF's own text in about a second each (PRs 63-66). The Mac measured the same afterwards: 110 / 110 at 99.5%, every page under a second.

### 2. The packet

`node tools/accuracy/packet_coverage.mjs --token-file <qa token>`

- Rockford: 37 distinct items, 36 cited with their catalogue page in the packet, 1 missed: Glynn-Johnson 90S ("Glynn-Johnson is in the catalogue; 90S is not"; needed "Glynn-Johnson 90S in the catalogue"; no Glynn-Johnson book on file prints it). Two lines furnished by another trade are listed as by others. Packet 68-69 pages.
- Berryessa: 10 of 10 cited.
- Select Hinges went in first (`tools/catalogue-seeds/2026-10-09-select-hinges.sql`, 37 products with Select's own spec sheets in R2); Schlage's ND catalog and ALX sell sheet were filed for ND40, ALX53 and ALX80 (`2026-10-09-schlage-nd-alx-sheets.sql`).

### 3. Journeys

The four regressions of 2026-10-08 and fix 10 (with `docs/patches/fix10-journey-expectations.patch` applied) are on main (PR 71). The Mac's three-pass matrix on main after PR 71: 23 journeys, 65 of 69 runs, 21 green in every pass, among them subx-upload-to-submittal 14/14, takeoffx-takeoff 12/12, phone-key-journeys 19/19 and first-result-no-account 29/29. The two others failed on journey timing, not product behaviour (sightx-corridor read the sample's count before the paste was built; pricing-to-checkout pressed before the paste result's button rendered, 1 of 3 passes); both journeys wait now (PR 81). The rerun is requested from the Mac and its table goes in `docs/direction-2026-10-08.md`.

### 5. The estimator

A fresh agent, as a first-time estimator, on the Rockford set: **yes, they would pay $100**, for the reading (doors 65/65 on every field, 110 items, 14 groups) and with the packet's cut-sheet quality and the free path as the risks. By hand 4.25-7 h ($190-$525 at $45-$75/h); with WeylandAI $100 plus 1.8-2.75 h of checking ($180-$305). Every defect it found in the free path and the packet was fixed the same morning (PR 76: server reads first, "{}" errors gone, the $100 offer where the packet is refused, contents numbering, pairs, the PENDING REVIEW stamp, sizes on set sheets) and the copy that said full-size sheets do not read was corrected.

## Every tool on sale, on its audit documents

Harnesses: `tools/accuracy/doc_tools_audit.mjs`, `product_audit_schedule_tools.mjs`, `product_audit_data_tools.mjs`, `product_audit_form_tools.mjs`. Each quotes the tool's card and tests exactly that claim. Reports from the 07:38-07:42Z runs unless noted.

| tool | audit document or input | result | numbers |
|---|---|---|---|
| SubX ($100 first submittal) | Rockford Bid 26-27 Addendum One | PASS | pages found itself (A2.2 p.29, 08 71 00 pp.17-23); 65/65 doors with page and row; 14/14 groups; packet 68 pp, 36 of 37 cited, 1 stated miss, 49 s |
| CutSheetX | 10 real Rockford items + 2 not in the catalogue | PASS | 10 of 10 to the right maker with a citation that opens (LCN 4000 catalogue p.41, Von Duprin p.26, Ives catalogue p.131, Zero 188S-BK p.44, Schlage ND p.16, Select SL11 p.1 ...); both unknowns stated as misses; paste agrees 12/12 |
| TakeoffX | Rockford A2.2; Berryessa A9.2 x3 | PASS | 65/65 and 24/24 doors, 4 of 4 breakdowns exact, every door traced to its row |
| SightX | Berryessa session | PASS | 24/24 doors, hardware drawn on 24, shared link opens without an account |
| PropX | Berryessa session | PASS | 4 lines (door 24, hardware 24 openings), 2 priced, every unpriced line says why; total $254,671.45; PDF 2 pp, 4 s (18:10Z, `product_audit_schedule_tools.mjs --only propx`) |
| PriceX | Berryessa and Rockford hardware | PASS | Berryessa 10 of 14 lines priced (6 exact), Rockford 44 of 110 (15 exact); every unpriced line says why |
| DrawX | Fayette GA 2419, 21 sheets at 36 x 24 | PASS | 21 of 21 numbered and titled, 4 s |
| AsBuiltX | Fayette sheets A3.2 / A4.1 | PASS | same sheet 0%, different sheets 4.2% |
| SpecX | Berryessa manual, 288 pages | PASS | 14 CSI sections, 08 71 00 on p.273, 5 s |
| InspecX | FCMAT Mayacamas FIT inspection, 9 pages (7 scanned) | PASS | 22 deficiencies, 50 s |
| SurvX | NSW Newcastle dilapidation report, 289 pages | PASS | 60 findings, the report's grading legend not flagged, 7 s |
| LienX | CA conditional progress waiver, Berryessa job; Ohio general form | PASS | 25 of 25 statute lines in order; amount from the proposal |
| BidX | HuntX notice (IL CDB 546-140-011) + PropX quote | PASS | base bid $11,754.43 in words and figures; SOV 5 lines = $10,759.20; bond $1,175.44 (18:23Z, `product_audit_form_tools.mjs --only bidx,closex`) |
| CoA | Berryessa (24 rated openings) | PASS | 24 of 24 records, pairs shown 22/22 |
| CloseX | Berryessa; warranties from 08 71 00 1.07 | PASS | 24/24 openings, 24 keyed, 5/5 warranties, 8 catalogue pages for 10 products; pairs 22/22 (18:23Z; harness now accepts the PDF's new Room field) |
| RFaX | Berryessa | PASS | the real issue (core with no maker), RFIs numbered, 3 schedule pages attached |
| ChangeOrdX | PropX quote 1 | PASS | add $1,017.59 and deduct -$456.34 to the cent; contract carried forward |
| PermitX | Berryessa (none electrified) and Rockford (6 electrified) | PASS | Rockford 6 of 6 listed, 0 extra; catalogue pages 4 |
| SafetyX | NIOSH FACE 2000-16 (fall and struck-by fatality, 20 pages) | PASS | 54 lines; falls and struck-by (3) classed; recording hint; 300/300A |
| MeetingX | room with the Berryessa coordination record | PASS | 8/8 record items intact; TURN relay on (calls browser to browser are not testable over HTTP) |
| NotesX | the same room | PASS | attendees, 2 decisions, 2 actions, transcript appendix |
| HuntX | whole index (1,389 notices from 7 sources) | PASS | 11 door / 166 building / 514 signal / 698 civil; 145 distinct links fetched, 0 dead; filters exact; RSS 50 items, calendar 161 events (18:10Z, `product_audit_data_tools.mjs --only huntx,marketx`) |
| CompX | NYC City Record awards | PASS | 2,809 awards; 3 door vendors equal NYC open data exactly |
| MarketX | six metros, both CSVs | PASS | Fresh post-deploy audit at 21:52Z: all six cities pass, Chicago 1,868 projects with 200 contractors and 200 owners; LA/SF source limitations disclosed; NYC CSV cap 5,000 disclosed. `tools/accuracy/product_audit_data_tools_2026-10-09-21-52_codex-release-after.md` |
| WeatherX | job at 1855 Lucretia Ave, San Jose | PASS | NWS 13/13 periods agree; daily log written (1 day, the job is 10 h old) |
| GeoX | 3 PropX jobs | PASS | city, county and tract equal the Census geocoder |
| ForecastX | proposal 1, 4 months, 5% retainage | PASS | 7 months equal an independent recompute to the cent |
| WireX | the paying account's wire | PASS | 99 headlines from 6 of 7 feeds, ENR 20 |

The SubConP suite is these tools together; it is sold on the evidence above.

## The Architect and the GC (the generator)

`node tools/bidset/make.mjs && node tools/bidset/grade.mjs --token-file <qa token>`

The WeylandAI Building, one source model (`tools/bidset/building.mjs`): 48 openings, 10 hardware groups, 54 items, each marked held or not held. The generator draws the cover, plans with door tags and an ARCH D door schedule with a title block, Section 08 71 00, and a scanned variant (sideways, tilted 0.6 degrees); every sheet says SAMPLE PROJECT - NOT A REAL BUILDING. Grade of the vector set (`tools/bidset/grade_report_2026-10-09-07-38.md`): **6 of 6 GC checks** - SubX found the pages itself, 48/48 openings with 192/192 fields, 54/54 items exact, 25/25 held items cited, both not-held items listed, the packet named with contents. The scanned variant: the spec pages now read by OCR (3 groups, 16 items on the first, tilt measured and taken out); the scanned full-size schedule sheet now reads 48/48 unique marks and 336/336 scored fields in the fresh production browser receipt. OCC remains a separate open input, as described in the current review above.

## The $100 self-serve

The estimator audit says yes, so the $100 first submittal stays sold self-serve (`weyland-first-submittal` in CHECKOUT_READY_PRODUCTS), and the workspace now shows the offer wherever the packet is refused for payment.

## Product Hunt

Proposed: Tuesday, October 20, 2026, fallback Thursday, October 22, with six gates checked the Friday before (`docs/product-hunt-proposal-2026-10-09.md`). John accepts or moves it.

## Open, honestly

- The two journeys fixed in PR 81 wait on the Mac's rerun.
- The generated scanned ARCH D benchmark is now correct on every scored field. OCC scanned reading and confidence remain open, together with MeetingX leave-room teardown and live AuthFor provisioning. See the current review above.
- Glynn-Johnson 90S is in no book on file; the packet lists it as a miss.

## Repositories this cloud session can reach (2026-10-09, after John widened access)

Checked with the session's repository listing (push rights as reported) and a clone of each:

| repository | answered | push | cloned at | note |
|---|---|---|---|---|
| mobleysoft/weylandai.com | yes | yes | /home/user/weylandai.com | this product |
| jmobleyworks/authfor | yes | yes | /home/user/authfor (ade09a4, 2026-10-07) | the AuthFor code; mobleysoft/authfor.com is an empty repository |
| mobleysoft/mailguyai.com | yes | yes | /home/user/mailguyai.com (ff5bef3, 2026-10-08) | MailGuy sender and keys |
| mobleysoft/vendyai.com | yes | yes | /home/user/vendyai.com (b160eb8, 2026-10-07) | VendyAI Stripe rail |
| mobleysoft/mobleysoft.github.io | yes | yes | /home/user/mobleysoft.github.io (211ff57, 2026-10-01) | homepage deploy path |
| jmobleyworks/mobley-kernel | yes | yes | /home/user/mobley-kernel (1899c0e, 2026-10-09) | |
| jmobleyworks/mobcorp-estate | listed, push reported | not attached | no | attaching it was refused by this session's permission check; John can allow it |
| jmobleyworks/mascom-estate, jmobleyworks/mascom-nginx | listed, push reported | mascom-nginx attached | no | not needed for WeylandAI so far |

The listing also shows the other MobCorp venture repositories (mobleysoft/*.com and *.cc, jmobleyworks/*) with push; none is needed for WeylandAI's open work.
