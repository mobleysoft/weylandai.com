# G004 evidence — 2026-10-09

Baseline: [10:49 report](truth_report_2026-10-09-10-49.md). Final: [regenerated per-tier report](truth_report_2026-10-09-11-33.md) and [machine-readable evidence](truth_g004_evidence_2026-10-09.json).

This checkout contains 616 truth records, matching the supplied report (the task note said 617). All 616 remain. Reran the ten largest one-sided-row harvest PDFs plus three audited PDFs, the other Rockford corpus PDF, and the exact synthetic PDF. Reader B, agreement scoring, tier rules, and oracles were unchanged. Unrerun records are unchanged. No commits or deployment.

Queue: **4285 → 3780**, down 505 (11.8%). One-sided rows: **3675 → 1023**, down 2652 (72.2%). Many repaired set/row identities now align, exposing field disagreements that were previously reported as two separate one-sided rows; field differences therefore rise from 382 to 2693. Agreement is not a claim of independent truth.

## Queue grouped by why

| Why | Before | After |
|---|---:|---:|
| only reader A read this row | 1654 | 532 |
| field values differ | 382 | 2693 |
| only reader B read this row | 2021 | 491 |
| the set's door lists differ | 10 | 22 |
| only reader A read this set | 29 | 23 |
| only reader B read this set | 189 | 19 |

## Queue grouped by family

| Family | Before | After |
|---|---:|---:|
| missouri_oa_fmdc | 2402 | 2078 |
| delaware_bidcondocs | 1348 | 1410 |
| university_bid_pages | 253 | 16 |
| ohio_ofcc | 175 | 194 |
| Berryessa | 26 | 1 |
| Fayette County (GA) | 24 | 24 |
| california_dgs_obas | 19 | 19 |
| Rockford | 9 | 9 |
| Connor Consolidated School / Maine BGS | 8 | 8 |
| Christina | 6 | 6 |
| Noble County Highway Department | 6 | 6 |
| school_district_sites | 6 | 6 |
| Orchard View Public Schools | 3 | 3 |

The JSON also contains the family × why cross-tab and kind counts. Baseline kinds: item 3071, door 986, group 228.

## Before/after agreement per family, fixed PDF cohorts

Each row keeps exactly the same PDFs on both sides and is grouped by its **baseline tier**. Tiers are never pooled. Eight formerly unread harvest PDFs move into agreed; the regenerated report lists their current tiers.

| Baseline tier | Family | PDFs | Rows agreed before | Rows agreed after | Queue before → after |
|---|---|---:|---|---|---:|
| agreed | Rockford | 1 | 169/172 (98.3%) | 169/172 (98.3%) | 6 → 6 |
| agreed | delaware_bidcondocs | 1 | 91/224 (40.6%) | 156/156 (100.0%) | 143 → 0 |
| audited | Berryessa | 1 | 16/41 (39.0%) | 40/41 (97.6%) | 26 → 1 |
| audited | Christina | 1 | 99/104 (95.2%) | 99/104 (95.2%) | 6 → 6 |
| audited | Rockford | 1 | 173/175 (98.9%) | 173/175 (98.9%) | 3 → 3 |
| exact | bidset (synthetic) | 1 | 102/102 (100.0%) | 102/102 (100.0%) | 0 → 0 |
| unread | delaware_bidcondocs | 3 | 0/982 (0.0%) | 41/535 (7.7%) | 1052 → 1257 |
| unread | missouri_oa_fmdc | 4 | 0/1409 (0.0%) | 422/959 (44.0%) | 1479 → 1155 |
| unread | ohio_ofcc | 1 | 0/124 (0.0%) | 1/75 (1.3%) | 135 → 154 |
| unread | university_bid_pages | 1 | 0/231 (0.0%) | 108/123 (87.8%) | 252 → 15 |

## Current-tier totals before/after

These are the report's actual tier totals. The agreed-tier rate falls because eight newly readable PDFs enter that tier; use the fixed cohorts above to evaluate reader changes.

| Tier | PDFs before → after | Agreed rows before | Agreed rows after | Queue before → after |
|---|---:|---|---|---:|
| exact | 2 → 2 | 150/150 (100.0%) | 150/150 (100.0%) | 0 → 0 |
| audited | 4 → 4 | 288/320 (90.0%) | 312/320 (97.5%) | 35 → 10 |
| agreed | 30 → 38 | 1405/1812 (77.5%) | 2042/3138 (65.1%) | 561 → 2322 |
| oracle-checked | 7 → 7 | 0/136 (0.0%) | 0/136 (0.0%) | 158 → 158 |
| unread | 573 → 565 | 0/3306 (0.0%) | 0/858 (0.0%) | 3531 → 1290 |

## Per-PDF measurements

| SHA16 | Family | Rows agreed before | Rows agreed after | Queue before → after | Tier before → after |
|---|---|---|---|---:|---|
| [ef4f9bfd055baa96](../corpus/harvest/truth/ef4f9bfd055baa96.json) | delaware_bidcondocs | 0/611 (0.0%) | 1/302 (0.3%) | 653 → 898 | unread → agreed |
| [8c77fa69fc375a81](../corpus/harvest/truth/8c77fa69fc375a81.json) | missouri_oa_fmdc | 0/512 (0.0%) | 0/298 (0.0%) | 550 → 677 | unread → unread |
| [1d0374f8106ef8ad](../corpus/harvest/truth/1d0374f8106ef8ad.json) | missouri_oa_fmdc | 0/476 (0.0%) | 2/240 (0.8%) | 508 → 474 | unread → agreed |
| [1af9e638165d85fb](../corpus/harvest/truth/1af9e638165d85fb.json) | delaware_bidcondocs | 0/295 (0.0%) | 2/195 (1.0%) | 317 → 359 | unread → agreed |
| [a248cf8b5dee4d92](../corpus/harvest/truth/a248cf8b5dee4d92.json) | university_bid_pages | 0/231 (0.0%) | 108/123 (87.8%) | 252 → 15 | unread → agreed |
| [7478006f7fd5b43c](../corpus/harvest/truth/7478006f7fd5b43c.json) | missouri_oa_fmdc | 0/211 (0.0%) | 210/211 (99.5%) | 211 → 4 | unread → agreed |
| [f97e99f88a931e74](../corpus/harvest/truth/f97e99f88a931e74.json) | missouri_oa_fmdc | 0/210 (0.0%) | 210/210 (100.0%) | 210 → 0 | unread → agreed |
| [9014786c78096b94](../corpus/harvest/truth/9014786c78096b94.json) | delaware_bidcondocs | 91/224 (40.6%) | 156/156 (100.0%) | 143 → 0 | agreed → agreed |
| [4e7e992b311a3f39](../corpus/harvest/truth/4e7e992b311a3f39.json) | ohio_ofcc | 0/124 (0.0%) | 1/75 (1.3%) | 135 → 154 | unread → agreed |
| [595613e060c69652](../corpus/harvest/truth/595613e060c69652.json) | delaware_bidcondocs | 0/76 (0.0%) | 38/38 (100.0%) | 82 → 0 | unread → agreed |
| [dd339f57b51538ed](../corpus/harvest/truth/dd339f57b51538ed.json) | Berryessa | 16/41 (39.0%) | 40/41 (97.6%) | 26 → 1 | audited → audited |
| [f0e863d88ea688ff](../corpus/harvest/truth/f0e863d88ea688ff.json) | Rockford | 173/175 (98.9%) | 173/175 (98.9%) | 3 → 3 | audited → audited |
| [525dc0b72011077a](../corpus/harvest/truth/525dc0b72011077a.json) | Christina | 99/104 (95.2%) | 99/104 (95.2%) | 6 → 6 | audited → audited |
| [a03cdcca2934ca5a](../corpus/harvest/truth/a03cdcca2934ca5a.json) | Rockford | 169/172 (98.3%) | 169/172 (98.3%) | 6 → 6 | agreed → agreed |
| [4847b09e633103f7](../corpus/harvest/truth/4847b09e633103f7.json) | bidset (synthetic) | 102/102 (100.0%) | 102/102 (100.0%) | 0 → 0 | exact → exact |

## Ten-PDF source adjudication

Ranking is by baseline `(row)` queue entries, not total queue size. Every PDF below was opened from the read-only harvest directory, its disputed page text extracted, and its listed representative page rendered and inspected. Remaining source copies are unchanged. Page numbers are one-based PDF pages.

### ef4f9bfd055baa96: 611 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/ef4f9bfd055baa96.pdf)

Disputed pages / representative source check: 2–17; rendered p.2.

B is right about numbered set existence; A missed `Set #1 Classrooms…` and invented a continuation item from `301 DOOR HARDWARE SCHEDULE`. Fixed numbered headings, EA. units, Type/Description headers, wrapped Door Numbers lists, and separate finish/maker columns. Page 2 prints Hinges / BB1279 4.5” x 4.5” NRP / US26D / HAG; B incorrectly puts the finish and maker into catalog. A now preserves those separate fields rather than copying B.

### 8c77fa69fc375a81: 512 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/8c77fa69fc375a81.pdf)

Disputed pages / representative source check: 35–47; rendered p.35.

B is right about Set: 1.0 and 2.0; A called the section title Hardware Sets a set named S. Both readers attached the first half of centered multiline cells to the preceding row. Fixed A: p.35 set 1 has seven items, including a separate Gaskets, sweeps Threshold by Door/Frame Manufacturer row. Exit-device catalog is 16 70 PE8804 WEL (SFIC, Cyl. Dogging), finish US10BE, maker SA. B still misreads those fields, so this PDF remains at 0 agreed rows despite correct A repairs.

### 1d0374f8106ef8ad: 476 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/1d0374f8106ef8ad.pdf)

Disputed pages / representative source check: 349–359; rendered p.349.

Same numbered-heading and centered-cell class as the other Current River PDF. B is right about the sets; neither original reader is right about the wrapped catalogs. Kept A’s 238 extracted items, restored their set identities and cell boundaries; B still blends catalog, finish and maker.

### 1af9e638165d85fb: 295 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/1af9e638165d85fb.pdf)

Disputed pages / representative source check: 52–58; rendered p.52.

B is right about the Set: headings. A is right to retain the centered-quantity card-reader lock as a distinct item: on p.52 it follows Dust Proof Strike / 570 and has catalog ML20605 x TCRNE1 NSA SS078 M812 24AD. B merges it into the strike. Fixed A’s leading and trailing cell lines; retained A’s 153 extracted items rather than dropping to B’s 142.

### a248cf8b5dee4d92: 231 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/a248cf8b5dee4d92.pdf)

Disputed pages / representative source check: 23–29; rendered p.23; checked continuation p.24 text.

B is right about numbered headings; A is right about the 15 remaining one-sided items, including SFIC core / Key to existing facility on p.23 and Threshold / 2746x6A ( field verify width req) at the top of p.24. Retained continuation rows and the items with prose catalogs B rejects. All 108 B items now agree. Every remaining A-only catalog was checked in the page text on pp.23–29; the queue reports a continuation item under its starting set page (the threshold appears on p.24 but is keyed to set 2 beginning on p.23).

### 7478006f7fd5b43c: 211 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/7478006f7fd5b43c.pdf)

Disputed pages / representative source check: 28,32,45,46; rendered p.45.

B is right about the 211 printed door rows. Fixed A’s left-overhanging marks, side-by-side tables, nearby finish-legend contamination, numbered notes, and sparse fire-rating columns. Page 45 now has 54 + 77 doors. Door 205A has fire rating 3/4 HR, not N/A 3/4 HR. Remaining PT101 p.32 is a difficult one-row schedule: A and B still disagree on fields; no claim that either full row is correct.

### f97e99f88a931e74: 210 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/f97e99f88a931e74.pdf)

Disputed pages / representative source check: 28,44,45; rendered p.44.

Same door class as above. B is right about all 210 rows; corrected A now agrees on every compared field of all 210.

### 9014786c78096b94: 132 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/9014786c78096b94.pdf)

Disputed pages / representative source check: 18,29–34; rendered p.29.

B is right about SET #nn headings with descriptive names; p.18’s 08 71 00 -10 footer is not an item. Fixed headings and footer rejection. Preserved the printed (Door 128B) catalog qualifier on p.30 instead of treating it as a superseded value. All 156 rows now agree.

### 4e7e992b311a3f39: 124 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/4e7e992b311a3f39.pdf)

Disputed pages / representative source check: 24–28; rendered p.24.

B is right about Set: headings; both original readers are wrong about vertically centered wrapped catalogs. Fixed A’s row ownership and column learning from wrapped lines. Page 24 first item is Continuous Hinge / CFM_SLF-HD1 x Length Required / PE. The closer retains its (Reg or P/A) qualifier. B remains wrong on most fields; kept A’s 65 extracted items.

### 595613e060c69652: 76 one-sided rows

[Read-only source PDF](/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/595613e060c69652.pdf)

Disputed pages / representative source check: 272–273; rendered p.272, checked p.273 text.

B is right about HEADING n boundaries and Type/Description columns. Fixed A to read five separate sets. On p.273 the explicitly named FINISH column contains DKB; it is not manufacturer dormakaba. All 38 items now agree.

## Additional audited check and scope

Berryessa pp.284,286,288 print ROOM to the left of TAG on a higher header baseline. A discarded that column. All 24 room values are now retained and checked against the audited JSON; calibration rises from 144/168 to 168/168 door fields. Its remaining disputed sample row on p.274 is unchanged. Rockford audited remains 173/175 and Christina 99/104. The additional Rockford corpus PDF remains 169/172, and the exact synthetic PDF remains 102/102.

Page sampling was checked: this harness enumerates every text page, then passes the same candidate page numbers to A and B. No top-ten one-sided-row class was caused by A receiving fewer candidate pages. No sampling limit was relaxed. Whole-PDF reruns cover the numbered page ranges above, including continuation rows.

The production entry point is unchanged: `src/lib/text-layer-read.js` already calls the shared `assets/client-ocr-src/schedule-text-layer.mjs`. Fixes live in that shared implementation. Matching served `.bin` assets and import cache versions were refreshed, so the server and browser paths deploy the same reader. Reader B remains unchanged.

## Reproduction and validation

Run with the Mac Node 26.3.0 executable. The default shell selected Node 20.20.2, whose vendored PDF operator extraction fails the existing Rockford 110-item test even with the original reader; that failure was reproduced on the unchanged baseline. Node 26 passes the same test. No vendor code was changed.

```sh
export PATH=/opt/homebrew/bin:$PATH
node tools/accuracy/truth_run.mjs --dir /Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads --only ef4f9bfd055baa96,8c77fa69fc375a81,1d0374f8106ef8ad,1af9e638165d85fb,a248cf8b5dee4d92,7478006f7fd5b43c,f97e99f88a931e74,9014786c78096b94,4e7e992b311a3f39,595613e060c69652
node tools/accuracy/truth_run.mjs --only 4847b09e633103f7,dd339f57b51538ed,f0e863d88ea688ff,525dc0b72011077a,a03cdcca2934ca5a
node tools/accuracy/truth_report.mjs
node --test weyland-subx-worker/test/text-layer-harvest.test.mjs weyland-subx-worker/test/text-layer-read.test.mjs weyland-subx-worker/test/schedule-text-layer.test.mjs weyland-subx-worker/test/door-cells.test.mjs
```

Validation: **28 tests passed, 0 failed**. Tests include eight captured-page regressions, exact assertions for all 24 Berryessa locations, and a one-item Rockford group with indented prose that must not become a catalog column. Existing corpus and cell-reader tests pass. `git diff --check` passes; both served module copies match source byte-for-byte.

Raw test output: [test log](truth_g004_2026-10-09_tests.txt). Selected-run output (omits untouched-file “skipped” lines): [run log](truth_g004_2026-10-09_runs.txt). No board changes were made; the Mac session owns the board, commit and deployment.
