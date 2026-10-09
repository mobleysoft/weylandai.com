# Cloud status: the $100 first submittal on a full-size bid set, and every tool on sale

Written by the cloud session, 2026-10-09 (UTC). Every number below comes from a harness run live against https://weylandai.com and committed beside it; each section names the command that reproduces it. Nothing here is estimated.

## Cloud goals (Mobley list)

- g032 in review (18:24Z): PropX PASS and HuntX PASS on rerunnable audits (BidX and CloseX also PASS; CloseX harness fixed for the PDF's Room field); offer sentence in index.html restored to the full list. MarketX FAIL stays open (Chicago companies CSV order; SF publishes no GC or owner). Needs: merge and the Pages deploy of index.html.

## The goal's five finish lines

| # | finish line | state | evidence |
|---|---|---|---|
| 1 | Schedule reading at 95% of rows and 95% of fields on all five documents, no page read failing | **met** | `tools/accuracy/schedule_report_2026-10-09-06-48_all-five.md` |
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
| MarketX | six metros, both CSVs | FAIL | Chicago: companies.csv 2,106 rows does not begin with the JSON ranking (400); San Francisco: 0 GCs and 0 owners ("No owner or contractor in DBI's open data"), which the bar counts as failing 'who is building it' while the card says SF publishes neither; claim or bar must change (18:10Z) |
| WeatherX | job at 1855 Lucretia Ave, San Jose | PASS | NWS 13/13 periods agree; daily log written (1 day, the job is 10 h old) |
| GeoX | 3 PropX jobs | PASS | city, county and tract equal the Census geocoder |
| ForecastX | proposal 1, 4 months, 5% retainage | PASS | 7 months equal an independent recompute to the cent |
| WireX | the paying account's wire | PASS | 99 headlines from 6 of 7 feeds, ENR 20 |

The SubConP suite is these tools together; it is sold on the evidence above.

## The Architect and the GC (the generator)

`node tools/bidset/make.mjs && node tools/bidset/grade.mjs --token-file <qa token>`

The WeylandAI Building, one source model (`tools/bidset/building.mjs`): 48 openings, 10 hardware groups, 54 items, each marked held or not held. The generator draws the cover, plans with door tags and an ARCH D door schedule with a title block, Section 08 71 00, and a scanned variant (sideways, tilted 0.6 degrees); every sheet says SAMPLE PROJECT - NOT A REAL BUILDING. Grade of the vector set (`tools/bidset/grade_report_2026-10-09-07-38.md`): **6 of 6 GC checks** - SubX found the pages itself, 48/48 openings with 192/192 fields, 54/54 items exact, 25/25 held items cited, both not-held items listed, the packet named with contents. The scanned variant: the spec pages now read by OCR (3 groups, 16 items on the first, tilt measured and taken out); the scanned full-size schedule sheet does not read yet, and the site says so.

## The $100 self-serve

The estimator audit says yes, so the $100 first submittal stays sold self-serve (`weyland-first-submittal` in CHECKOUT_READY_PRODUCTS), and the workspace now shows the offer wherever the packet is refused for payment.

## Product Hunt

Proposed: Tuesday, October 20, 2026, fallback Thursday, October 22, with six gates checked the Friday before (`docs/product-hunt-proposal-2026-10-09.md`). John accepts or moves it.

## Open, honestly

- The two journeys fixed in PR 81 wait on the Mac's rerun.
- A scanned full-size door schedule sheet does not read yet (the generator's scanned sheet reads nothing); the copy says so.
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
