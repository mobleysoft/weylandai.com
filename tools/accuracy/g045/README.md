# g045: SightX shows the shared-mark flag on T2507

Cloud session, 2026-10-10. Main at 8dc8a76, with g043 (reader A reads all 49 T2507 rows) and g044 (the S1 shared-mark rule) merged.

## T2507 in the ten-set data is now read the production way
`node tools/accuracy/g045/production-set.mjs <pdf dir> 192a16af8f31ae0c`:
- reads the PDF from R2;
- runs reader A (`schedule-text-layer.mjs`) on the schedule page, keeping each row's text as printed, cut at the finish legend beside the table;
- runs `readPlan` over every page.

It writes `192a16af8f31ae0c.production.json`: **49 rows, 49 tags, 0 not on the plan**, and `shared_marks: [{mark: "132A", sheet: "A-100", rows: 2, tags: 2, placed: true, note: "shared mark, order assumed"}]`. All 49 row texts end at their hardware-set column.

`tools/accuracy/g028/build-sets.mjs` uses a set's production file when one exists. Only T2507 has one, and the other nine sets are byte-identical in `weyland-sightx-worker/src/data/sets/index.js`. The g020 harvest marks had given T2507 40 doors (bare room numbers, no 132A).

The two 132A doors in the model:

| row (schedule p.10) | tag | model position | note |
|---|---|---|---|
| `132 DRILL FLOOR A 5'-6" 7'-0" HM EXIST HM EXIST 1` | A-100 (1259, 555) | x 0.58, z 2.29 | shared mark, order assumed |
| `132 DRILL FLOOR A 6'-3" 7'-0" HM EXIST HM EXIST 1` | A-100 (1223, 967) | x 0.25, z 6.10 | shared mark, order assumed |

## The page (weyland-sightx-worker/src/pages/sightx-app.html)
- **Door card:** a door with `plan.shared_mark` gets a SHARED MARK line: "shared mark, order assumed · row k of n with mark 132A · also:", with a link to each other row of the mark (mark, door number and row text). The link opens that door and flies to its own tag.
- **Door table (the page's list of every door, the dossier of the set):** each such door has a "shared mark, order assumed" badge and links to the other rows.
- **Test hook:** `window.__sxCounts.shared_flags` counts the flagged rows.

Screenshots (software WebGL, local worker):
- t2507-132A-row1-card.png: door 37's card
- t2507-132A-row2-card.png: door 38's card, reached through the card's link
- t2507-door-table-132.png: the table's 131B to 132B rows

## The ten-set journey (tools/user-simulation/journeys/sightx-real-buildings.mjs)
For every set whose data has shared-mark doors:
- the table flags exactly those doors with the flag text, each linking the others;
- the first one's card shows the flag and "row 1 of n" and links the other;
- following the link shows the other row's own text and "row 2 of n", with the camera within 4 m of its own tag.

On T2507 it also checks that the two 132A rows each have their own tag. That is 4 new checks; T2507 now has 12.

Local passes (software WebGL; the kit's GPU gate bypassed in a temporary copy; worker under wrangler dev): local-journey-pass1-3.txt.
- **Each pass: 83 passed, 1 failed.**
- **T2507:** 12 of 12 in every pass.
- **The one failure** is the R2502 rebid's walking pace on the software renderer (0.22 m and 0 m against 0.5 m at about 3 frames a second), already documented in tools/accuracy/g035/README.md. The bar is unchanged.

The acceptance run is the Mac's GPU passes after the weyland-sightx-worker deploy:

    node tools/user-simulation/run-journeys.mjs --passes 3 --only sightx-real-buildings

## Tests
- **weyland-sightx-worker `npm test`: 27 of 27.**
  - The g028 row check now accepts a room-and-letter mark printed as room number, then letter.
  - New T2507 assertions: 49 doors, 49 on the plan, two 132A doors flagged at two positions, and `shared_marks` as above.
- **weyland-subx-worker `node --test` on main 19b71c8 merged in: 180 of 181.** The remaining failure is `generated-mark-scan`, which depends on the page renderer (see tools/accuracy/g046/README.md); 181 of 181 on the Mac.
- **estimator-assertions:** 11 of 11. **api-answer:** 9 of 9.
