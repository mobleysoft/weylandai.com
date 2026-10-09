# g035: SightX on the remaining seven harvested sets

Built 2026-10-09T21:24Z (cloud session). Same pipeline as g028 (tools/accuracy/g028/README.md): `node tools/accuracy/g028/build-sets.mjs` now builds all ten sets of tools/accuracy/g020 into weyland-sightx-worker/src/data/sets/index.js; /sightx/?set=<sha16> opens each. One door per schedule door row, at its tag on the plan sheets the plan reader selects, each card quoting its row; a row that is not a door row is listed with its reason and drawn nowhere.

## The seven new sets

| set | rows | door rows (drawn) | not door rows | tagged on the plan | door rows not on the plan | plan sheets |
|---|---:|---:|---:|---:|---:|---|
| f97e99f88a931e74 (R2502-01 REBID) | 166 | 162 | 4 | 0 | 0 | no plan: title blocks read as 'SHEET 23 OF 147', none classed a plan; schematic corridor |
| 43a1f0db3f7ff345 (O2604-01) | 7 | 6 | 1 | 6 | 0 | A111 p.6 |
| 3fd2388877347d09 (T2502-01) | 3 | 2 | 1 | 2 | 0 | A-101 p.7 |
| 4af80165bc367de8 (C2419-01) | 2 | 2 | 0 | 2 | 0 | A102 p.6 |
| 89236ffa156fbaf5 (T2147-01) | 26 | 26 | 0 | 13 | 13 (161, 162, 163, 164, 165A, 165B, 166, 167A, 167B, 168A, 169A, 169B, 169C) | A113 p.27 |
| 977cec6301f40433 (T2423-01) | 2 | 1 | 1 | 0 | 0 | no plan: title read as 'CHECKED BY: DESIGNED BY: GW&'; schematic corridor |
| 2b7024ad75f57ddf (T2331-01) | 4 | 4 | 0 | 4 | 0 | A-101 p.9 |

Two sets have no floor plan the unchanged plan reader can select (the defects are in tools/accuracy/g020/REPORT.md, visual checks). Their doors stand in schedule order on the schematic corridor, the HUD says SCHEMATIC FROM THE SCHEDULE, the notes give the reason, and no door claims a tag: no position is invented. T2147 tags 13 of its 26 door rows on A113; the other 13 are listed as not on the plan. As in g028, the rows are the harvest's reading of each schedule, not audited truth.

## The journey

tools/user-simulation/journeys/sightx-real-buildings.mjs now covers all ten sets, 70 checks per pass. For a set with a plan, it runs the same seven checks as g028. For a schematic set it checks instead that no door claims a tag, the card names no sheet, and the HUD and notes say schematic and why.

Local runs: local-journey-pass1-3.txt, **69 of 70 each**. This container renders WebGL in software, so the kit's GPU gate was bypassed in a temporary copy. The worker ran under wrangler dev, with /assets served from the checkout.

The one failure is the same in every pass: `f97e99f88a931e74: W walks on from the door`, moved 0.22 m where the bar is 0.5 m.
- **Cause: software rendering.** The rebid's 162 doors stand on one schematic corridor and draw at 3 frames per second in software.
- **How that slows walking:** the page caps each frame's step at 0.1 s (sightx-app.html, the `dt` line), so 0.9 s of holding W simulates about 0.3 s of walking at the schematic pace of 3.5 m/s.
- **The camera does move:** it reaches 0.52 m after 1.8 s and 1.18 m after 2.7 s.
- **Plan sets are not affected:** they walk at 10 m/s and pass, even R2502 at 0.5 frames per second.
- **The other schematic set passes:** T2423, 23 frames per second.

The bar was not lowered. The acceptance run is the Mac's: three passes on the GPU against the deployed worker, after the deploy of weyland-sightx-worker:

    node tools/user-simulation/run-journeys.mjs --passes 3 --only sightx-real-buildings

r2502-rebid-schematic-door-01.png: the rebid at door 01 (schedule p.32) on the schematic corridor.
