# g028: SightX on the three best real buildings

Built 2026-10-09T18:09Z (cloud session). Input: the diagnostic matches in tools/accuracy/g020/<sha16>.json (see tools/accuracy/g020/REPORT.md); no production reader is involved here and none was changed (the schedule reader fix is g030).

## What SightX shows

/sightx/?set=<sha16> loads /api/sightx/sets/<sha16> (weyland-sightx-worker/src/routes/sightx-model.js) and lays the set out the way a SubX session is laid out on its plan (S1): one door per schedule door row, hung at its tag's coordinates on the selected plan sheets, at the size its row prints, in the room the plan gives it; each door's card quotes the schedule row it came from, with the page. A row that is not a door row (a grid number or a hardware-group digit the harvest regex picked up) is listed with that reason and drawn nowhere. The 3D never outruns the data: no door without a row.

Build: node tools/accuracy/g028/build-sets.mjs (writes weyland-sightx-worker/src/data/sets/index.js and sets-summary.json). A row is the text of the schedule line from the mark's row-start column to the next row-start column (these sheets print two schedule columns side by side; the columns are found from where the page's marks begin rows). The model is built by the production code (modelFromSubx + attachPlan); MAX_DOORS is raised from 120 to 400 so R2502's 152 door rows all fit.

| set | rows in the data | door rows (cards, drawn) | not door rows (listed, not drawn) | doors tagged on the plan | plan sheets |
|---|---:|---:|---:|---:|---|
| 7478006f7fd5b43c (R2502-01 Final Bid Plans) | 156 | 152 | 4 (1, 2, 3, 4: grid numbers) | 150 (2 untagged stand under NOT ON THE PLAN) | A-105, A-106, A-107 |
| 192a16af8f31ae0c (T2507-01 Final Bid Plans) | 41 | 40 | 1 (B2: a finish code) | 40 | A-100 |
| e3d0cc1bc22fd824 (T2504-03 Final Plans) | 19 | 18 | 1 (1: begins no schedule row) | 18 | A-102 |

The rows are the harvest's reading of the schedule, not audited truth (g020 REPORT.md lists what it misses: for example T2504 rows 117, 118, 119 and 121 are not in the input, so they are not drawn). Room names come from the plan reader (some by nearest label, marked unsure on the card).

## The journey

tools/user-simulation/journeys/sightx-real-buildings.mjs, per set: the set opens; door cards + not-a-door-row cards = rows in the data; doors drawn = door rows; doors tagged = the data's; NEXT DOOR walks to the first tagged door, whose card names it, quotes its row word for word and names its plan sheet; the camera stands within 4 m of the tag; W walks on. 21 checks.

Local runs (this container: software WebGL, so the kit's GPU gate was bypassed in a temporary copy; the worker under wrangler dev, /assets served from the checkout): three passes, 21 of 21 each: local-journey-pass1.txt, pass2, pass3. The acceptance run is the Mac's: three passes on the GPU against the deployed worker, after the deploy of weyland-sightx-worker:

    node tools/user-simulation/run-journeys.mjs --passes 3 --only sightx-real-buildings

r2502-door-101A.png: R2502 at door 101A (its row on schedule p.45, its tag on A-105 p.23).
