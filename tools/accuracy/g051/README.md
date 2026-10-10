# g051: the page finder and the readers pass by electrical and mechanical schedules (class C5)

Goal (Mobley, 2026-10-10 00:07 EDT): the page finder and reader B skip electrical panel schedules.
- 21d60f1b54e0e3df page 88 must read 0 door rows; it read 39 rows of mark 3.
- No other set may lose agreed rows or a tier, per `tools/accuracy/truth/compare_runs.mjs` against `origin/main:tools/corpus/harvest/truth`.

## Changes

| Where | What |
|---|---|
| `tools/accuracy/truth/reader_b.mjs` | `panelHeader`: a table whose header has two or more panel words (CKT, CIRCUIT, POLES, TRIP, LOAD, KVA, AMPS, MCB, MLO, BREAKER, FEEDER, VOLTS, PHASE, NEMA, PANELBOARD, MAINS) is not a door table. `electricalPanelPage`: four or more of those words on a page, and no DOOR / OPENING / DOOR AND FRAME SCHEDULE title. |
| `tools/accuracy/truth_run.mjs` | `DOOR_PAGE` (the truth run's page finder) skips an `electricalPanelPage`. |
| `weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs` (and the served `.bin`) | Reader A, and SubX's page finder that uses it (`classifyLines` in `findSchedulePages`), treat a schedule titled FEEDER, PANEL, PANELBOARD, HOOD, MOTOR, EQUIPMENT, FIXTURE, LIGHTING, LUMINAIRE, PLUMBING, FAN, DIFFUSER, GRILLE, BREAKER, TRANSFORMER or CONDUIT as not a door schedule. These titles join STOREFRONT, WINDOW and the rest. |

## Results

**21d60f1b54e0e3df, page 88** ([rendered](21d60f1b-p88-panel-schedules-88.png): two panels by circuit):
- Reader B goes from 39 rows to **0 rows** and 0 tables.
- The page is no longer a door candidate: `door_schedule_pages` goes from [78, 88] to **[78]**.
- Page 78 (OPENING SCHEDULE) keeps 19 rows in both readers, with 8 agreed. The tier stays agreed.
- SubX's own page finder already passed page 88 by, and still does.

**Reader A on the 17 measured sets** (`tools/accuracy/g049/fields.mjs`, 26 pages): every field is identical to main.

**Whole harvest:** 598 PDFs from R2, run at c018544. `compare_runs.mjs origin/main:tools/corpus/harvest/truth <run>` exits 1 ([table](compare-committed-truth-vs-g051-run.md)). The sets that change:

| Set | Before | After | What the old rows were |
|---|---|---|---|
| 21d60f1b54e0e3df | A 19, B 58, 8 agreed, agreed | A 19, B 19, 8 agreed, agreed | the 39 panel rows go |
| 4597f173e1d67daf | A 1, B 6, 0 agreed, unread | A 0, B 0, unread | KITCHEN HOOD SCHEDULE rows ACT1 / KEH1 (g050's note) |
| **6e7e2d2bf65c383b** (X2410 rebid) | A 7, B 19, **7 agreed, agreed** | A 0, B 12, 0 agreed, **unread** | p.102 FEEDER SCHEDULE, lift-station feeders F1–F4 with conduit type "PVC" read as the door type ([rendered](x2410-p102-feeder-schedule-102.png)): both readers agreed on 7 non-door rows |
| **70ab5446590e40cc** (X2410) | the same | the same | the same sheet |
| **df76d4056a456207** (T2232 add. 2) | A 2, B 19, 0 agreed, **oracle-checked** | A 0, B 13, 0 agreed, **unread** | p.118 KITCHEN HOOD SCHEDULE rows KEH1 ([rendered](t2232-p118-kitchen-hood-schedule-118.png)); the oracle had checked those 2 non-door rows |

The three flagged sets lose agreed rows and a tier that stood on rows which are not doors. `--allow` accepts lost agreed rows but not a lower tier, so the check fails on them. That is for the Mac to accept: the reasons go to plan/decisions.md, per the tool.

What is left on those sets is a real door schedule that reader A does not read:
- X2410 page 81 is a door schedule with headers DOOR NUMBER … HARDWARE GROUP. Reader B reads 12 rows there; reader A reads 0.
- T2232 has reader B rows on other pages.

That is the next reader A gap these sets show.

## Tests

- **`node --test tools/accuracy/g051/panel.test.mjs`: 3 of 3.**
  - Page 88: B reads 0 doors.
  - The page finder flags page 88 and not page 78.
  - Panel headers are told from door headers.
  - With the header check removed, the page 88 test fails.
- **Reader B's g047 and g050 tests:** pass.
- **`weyland-subx-worker/test/real-set-schedules.test.mjs`:** 2 new tests, 15 of 15 pass.
  - The feeder and hood fixtures read 7 and 2 door rows on main.
  - They read 0 now, and `classifyLines` finds no door schedule in either.
- **SubX overall:** 194 of 195. The one failure is the renderer-bound generated-mark-scan test.
- **Estimator assertions:** 11 of 11.
