# G020: S1 on ten harvested real sets

**Result: production path places zero doors across all ten sets. The three Mac renders are pending; Safari computer-use access was denied. This is evidence of a failed product check, not an S1 acceptance pass.**

Run: 2026-10-09T17:07:49.841Z. Code: `a09d207c5905e070ee62e87d28242f1a8680f7c1`. Ranked candidates SHA-256: `bfc07b3f3b224b6f0533a62bc86adebdfc0eb952e1c231682d5d33a72b4f1ab4`. All ten PDF SHA-256 hashes matched the candidate manifest. No production code was changed.

All page numbers below are **one-based PDF ordinals**. The candidate manifest uses zero-based indexes. “Plan sheets” means sheets selected by the unchanged S1 title-block reader, not all architectural pages identified by the harvest.

## Production path measured by truth_run

Reader A is the production schedule reader. Reader B is the independent geometry reader. A zero-row input is **not** a successful 0/0 coverage score. No A/B door rows agreed in this run.

| Rank | Set / SHA16 | Candidate schedule pages | A / B door rows | S1 selected plan sheets | Tags / A rows | Truth record |
|---|---|---|---:|---|---|---|
| 1 | _R2502-01 Final Bid Plans<br>`7478006f7fd5b43c` | 28, 32, 45, 46 | 0 / 0 | A-105 p.23, A-106 p.24, A-107 p.25, A-112 p.28 | N/A: no rows | [JSON](truth/7478006f7fd5b43c.json) |
| 2 | _R2502-01 REBID Final Bid Plans<br>`f97e99f88a931e74` | 28, 32, 44, 45 | 0 / 0 | none | N/A: no rows | [JSON](truth/f97e99f88a931e74.json) |
| 3 | _T2507-01 Final Bid Plans<br>`192a16af8f31ae0c` | 10 | 0 / 0 | A-100 p.7, A-101 p.8, A-104 p.11 | N/A: no rows | [JSON](truth/192a16af8f31ae0c.json) |
| 4 | _O2604-01 Final Bid Plans<br>`43a1f0db3f7ff345` | 14 | 0 / 0 | A111 p.6 | N/A: no rows | [JSON](truth/43a1f0db3f7ff345.json) |
| 5 | _T2504-03 - Final Plans<br>`e3d0cc1bc22fd824` | 18 | 0 / 0 | A-102 p.9, A-401 p.13 | N/A: no rows | [JSON](truth/e3d0cc1bc22fd824.json) |
| 6 | _T2502-01 - Final Plans<br>`3fd2388877347d09` | 13 | 0 / 9 | A-101 p.7, A-500 p.10 | N/A: no rows | [JSON](truth/3fd2388877347d09.json) |
| 7 | _C2419-01 Final Bid Plans<br>`4af80165bc367de8` | 7 | 0 / 0 | A101 p.5, A102 p.6, A602 p.8 | N/A: no rows | [JSON](truth/4af80165bc367de8.json) |
| 8 | _T2147-01 - Final Plans<br>`89236ffa156fbaf5` | 42, 43 | 16 / 0 | A113 p.27, A501 p.39 | 0/16 | [JSON](truth/89236ffa156fbaf5.json) |
| 9 | _T2423-01 - Final Plans<br>`977cec6301f40433` | 10 | 0 / 0 | none | N/A: no rows | [JSON](truth/977cec6301f40433.json) |
| 10 | _T2331-01 Final Bid Plans<br>`2b7024ad75f57ddf` | 16 | 0 / 0 | A-101 p.9 | N/A: no rows | [JSON](truth/2b7024ad75f57ddf.json) |

**Reproduction discrepancy:** reader A counts match the previously committed run, but reader B does not: R2502 original/rebid fall from 211/210 to 0/0, T2504 22 to 0, T2147 29 to 0, T2423 3 to 0, and T2331 4 to 0. The cause is not established. The queue reduction is not evidence of improved accuracy. [Exact old/new timestamps and runtime](baseline-comparison.json).

Truth run produced 10 records and 97 disagreement queue entries: [stdout](truth-run.txt), [this run’s queue](truth/queue.jsonl). T2147 has 16 A rows, all missing on the selected plans, and all 16 fail the size oracle. The other nine sets supply no A door rows to S1.

## Diagnostic: same S1 reader supplied harvest schedule-row marks

These counts isolate the plan reader from the failed production schedule read. The input marks are the harvest regex output from the candidate schedule pages. They are **not audited truth**: some inputs are notes, finish codes or partial identifiers, and some real schedule rows are omitted. “Matches” counts S1’s deduplicated tag records, not all printed occurrences or verified door placements. “Unmatched” counts same-style token candidates; these can be grid/detail numbers.

| Rank | SHA16 | Schedule input marks | Tag-shaped matches | Missing input marks | Unmatched candidates | Rooms / corridors read | Full evidence |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | `7478006f7fd5b43c` | 156 | 154 | 2 | 45 | 169 / 11 | [JSON](7478006f7fd5b43c.json) |
| 2 | `f97e99f88a931e74` | 166 | 0 | 166 | 0 | 0 / 0 | [JSON](f97e99f88a931e74.json) |
| 3 | `192a16af8f31ae0c` | 41 | 40 | 1 | 0 | 151 / 7 | [JSON](192a16af8f31ae0c.json) |
| 4 | `43a1f0db3f7ff345` | 7 | 6 | 1 | 1 | 1 / 0 | [JSON](43a1f0db3f7ff345.json) |
| 5 | `e3d0cc1bc22fd824` | 19 | 19 | 0 | 21 | 54 / 5 | [JSON](e3d0cc1bc22fd824.json) |
| 6 | `3fd2388877347d09` | 3 | 3 | 0 | 2 | 23 / 2 | [JSON](3fd2388877347d09.json) |
| 7 | `4af80165bc367de8` | 2 | 2 | 0 | 0 | 90 / 12 | [JSON](4af80165bc367de8.json) |
| 8 | `89236ffa156fbaf5` | 26 | 13 | 13 | 0 | 17 / 0 | [JSON](89236ffa156fbaf5.json) |
| 9 | `977cec6301f40433` | 2 | 0 | 2 | 0 | 0 / 0 | [JSON](977cec6301f40433.json) |
| 10 | `2b7024ad75f57ddf` | 4 | 4 | 0 | 0 | 6 / 1 | [JSON](2b7024ad75f57ddf.json) |

Each full-evidence JSON includes source URL/hash, every detected sheet title, schedule marks with page and source lines, production rows, matched tag coordinates and room attribution, the full missing/unmatched lists, and truth counts. The headline data are also in [index.json](index.json).

## Visual checks and concrete defects

- **R2502 original, `7478006f7fd5b43c`:** visually inspected A-105 p.23 and A-601 p.45. The first four diagnostic matches (`1`, `2`, `3`, `4`) lie on the grid across the top of A-105, not at door openings. The schedule has door rows such as `128A`; its plan tag is read at `(273,408)` PDF points and assigned OFFICE 128. Missing diagnostic inputs are `01` from p.32 and `102` from p.45. Thus 154/156 is not 98.7% verified door recall.
- **R2502 rebid, `f97e99f88a931e74`:** S1 reads the A-105/A-106/A-107 titles as `SHEET 23 OF 147`, `SHEET 24 OF 147`, `SHEET 25 OF 147`; all fail plan classification. Its 166 diagnostic input marks consequently yield zero matches. The original version finds those three dorm floors.
- **T2507, `192a16af8f31ae0c`:** visually inspected A-100 p.7 and A-103 p.10. Door symbols use stacked room number and A/B mark; the schedule has separate ROOM and MARK columns and repeated room numbers for multiple doors. Harvest inputs collapse those distinctions to 40 numeric room keys; `B2` is a finish-code false input. The 40/41 result cannot measure openings. For example, repeated 113 A/B schedule rows reduce to one `113` input.
- **T2504, `e3d0cc1bc22fd824`:** visually inspected A-102 p.9 and A-601 p.18. Schedule rows run 100–121 (including framed openings with no leaf); harvest omits 117, 118, 119 and 121 and adds false `1`, yielding 19 inputs. The 19/19 result is not complete schedule coverage. S1 reports 118 and 119 as unmatched on A-401 p.13 even though their rows appear on the schedule. It selects `NEW CONSTRUCTION PLAN LEGEND` as the title and can retain tags from enlarged details (notably 101/108), so absolute layout position needs review.
- **T2423, `977cec6301f40433`:** S1 selects `CHECKED BY: DESIGNED BY: GW&` as the title on A-101/A-102/A-401 (pp.3,4,9) and finds no plans.
- **SightX truncation:** unchanged `modelFromSubx` caps doors at 120. R2502 diagnostic input has 156 marks and S1 has 154 tag records, but its generated model contains only 120 doors, 118 tagged. Thirty-six input marks are omitted by the model cap. The report does not conceal this with a reduced denominator.

These are spot checks, not an exhaustive visual audit of every matched tag. S1 room counts repeat rooms across plan/detail sheets; nearest-label associations remain marked unsure. Wall and swing extraction is not part of this S1 renderer.

## Three Mac render candidates and handoff

Chosen by largest raw diagnostic match count, retaining each full input and the unchanged model cap. These are diagnostic candidates, not three production successes.

| Set | Reader matches / supplied marks | Model doors / tagged | Mac render |
|---|---:|---:|---|
| `7478006f7fd5b43c` | 154/156 | 120/118 | [Open local SightX](http://127.0.0.1:8020/?set=7478006f7fd5b43c) · [model JSON](7478006f7fd5b43c.model.json) |
| `192a16af8f31ae0c` | 40/41 | 41/40 | [Open local SightX](http://127.0.0.1:8020/?set=192a16af8f31ae0c) · [model JSON](192a16af8f31ae0c.model.json) |
| `e3d0cc1bc22fd824` | 19/19 | 19/19 | [Open local SightX](http://127.0.0.1:8020/?set=e3d0cc1bc22fd824) · [model JSON](e3d0cc1bc22fd824.model.json) |

Start the handoff server from this checkout:

```sh
node tools/accuracy/g020/serve.mjs
```

It binds only to 127.0.0.1:8020. The wrapper visibly labels the diagnostic inputs and known defects. The iframe serves the unchanged `weyland-sightx-worker/src/pages/sightx-app.html`; local GET fixtures provide the generated models through its existing shared-model loading path. Sizes are explicitly defaulted to 3 ft × 7 ft and no hardware was supplied. Nothing was uploaded to production, saved, shared or deployed.

HTTP checks passed for all three model routes and both WebGL/input assets; served app bytes exactly match the source page. The models contain 120/118, 41/40 and 19/19 total/tagged doors respectively. These checks do not verify WebGL rendering.

The Mac session should open each link, capture the WebGL scene and HUD, tour a tagged door, and record the visible count/sheet/room. No screenshot or successful Mac render is claimed here. Computer-use returned exactly: `Computer Use was not approved to use Safari`. Automatic approval review rejected Safari access without a further reason. Board status is left for Mobley’s number two.

## Reproduce

```sh
node tools/accuracy/truth_run.mjs --dir /private/tmp/g020-harvest --only 7478006f7fd5b43c,f97e99f88a931e74,192a16af8f31ae0c,43a1f0db3f7ff345,e3d0cc1bc22fd824,3fd2388877347d09,4af80165bc367de8,89236ffa156fbaf5,977cec6301f40433,2b7024ad75f57ddf
node tools/accuracy/g020/plan-report.mjs /private/tmp/g020-harvest
```

The local input directory contains symlinks to `/Users/johnmobley/weylandai.com/tools/corpus/harvest/downloads/<sha16>.pdf` plus source metadata. For another machine, use a directory containing the same ten hash-verified PDFs. `--only` alone searches the default corpus folders, so `--dir` is required for these harvested files. No downloads or credentials are needed.

The plan-report harness checks its production schedule row totals and applicable plan-oracle results against truth_run before writing the index. It calls the same vendored PDF reader, production schedule reader and shared `readPlan` implementation. The independent diagnostic calls the harvest’s existing `scheduleDoorMarks`, then the same `readPlan` and SightX `modelFromSubx`/`attachPlan` functions.
