# g068: SightX sheet view over the placement records

Built 2026-10-10 (cloud session). Input: the g066 placement records on main (PR 128), tools/corpus/harvest/placement/<sha16>.json. Neither reader nor any record was changed.

## What SightX shows

/sightx/?set=<sha16> opens a set that has a placement record on its plan sheets, inside the same SightX shell, with no page hop.

**Sheets.** Each sheet is the set's own PDF page, drawn at 100 dpi and one bit per pixel. They are rendered by build-sheets.mjs from the harvest's copy; the sha256 is checked against the set id, and nothing is fetched from the publisher.

**Tags.** Every placed door tag is a ring at the record's x and y. The overlay is an SVG in PDF points over that image, so the coordinates are used as recorded.

**Door card.** Tapping or clicking a ring, or a row of the door table, opens the card. It gives:
- the mark;
- the room and how it was found;
- the sheet, page and x/y;
- the size, door type, frame, material, rating and hardware group, as reader A read the schedule row ("not read" where null);
- the schedule row's page;
- how the tag was matched;
- the shared-mark note, where there is one.

**Placed-of-total and other labels.**
- The HUD shows placed-of-total from the record's summary.
- Each sheet button shows the number of tags placed on that sheet.
- Marks the record could not place are listed in the table as NOT PLACED, with the record's reason.

**No 3D beyond the data.** The sheet view draws nothing in 3D. A 3D CORRIDOR button appears only for a set that already has a g028 model (/api/sightx/sets/<sha16>), and PLAN SHEETS comes back from it. A sheet with no placed tags says so. It names the marks that are also printed there and says their positions on that sheet are not recorded.

| set | placed of total | sheets (tags placed) | 3D model |
|---|---|---|---|
| 192a16af8f31ae0c T2507-01 Final Bid Plans | 49 of 49 | A-100 (49), A-101 (0), A-104 (0) | yes (g028) |
| 7478006f7fd5b43c R2502-01 Final Bid Plans | 208 of 211 (AD101, PT101, 102 not placed) | A-105 (53), A-106 (77), A-107 (77), A-112 (1) | yes (g028) |
| 15b85ca679307cc1 REBID T2421-01 Final Plans | 33 of 33 | A-100 (33), A-110 (0) | no |

Build:

    node tools/accuracy/g068/build-sheets.mjs --pdfs <dir with <sha16>.pdf> [sha16 ...]

This writes three things:
- weyland-sightx-worker/assets/sheets/<sha16>-p<page>.bin: PNG bytes, 9 images, 1,822,073 bytes, served as Data modules on the subx client-ocr precedent;
- src/data/sheets/records.js and images.js;
- sheets-summary.json.

Routes (src/routes/sightx-sheets.js):
- GET /api/sightx/sheets/<sha16> returns the record;
- GET /api/sightx/sheets/<sha16>/p<page>.png returns the sheet image.

g028's journey now opens its corridor with &view=3d.

## Tests and journey

- `cd weyland-sightx-worker && npm test`: 30 of 30, including src/routes/sightx-sheets.test.mjs with 3 tests:
  - per set, placed/total and the sheets, every tag inside its sheet's box with its schedule row;
  - T2507 131B's card data;
  - R2502's 3 unplaced marks;
  - the PNG served at 3600x2400, and 404s.
- tools/user-simulation/journeys/sightx-sheets.mjs has 41 checks for the three sets:
  - the set opens on its sheets;
  - the HUD shows placed-of-total;
  - one button per sheet;
  - every sheet's image loads with exactly the record's tags at the record's coordinates, adding up to the placed count;
  - a table row opens the card and brings up its sheet;
  - a real mouse click on the ring opens the card, with mark, room and schedule page;
  - NOT PLACED rows;
  - the HUD says PLAN SHEETS, and a 3D button exists only where a 3D model exists;
  - the same document throughout;
  - a phone touch tap on T2507 131B.

**Local runs, three passes, 41 of 41 each.** The outputs are local-journey-pass1.txt, pass2 and pass3. These were not run against production:
- This container has no wrangler, so the worker's own router and routes, the page and the sheet images were served by a local node server.
- WebGL is software here, so the kit's GPU gate was bypassed in a temporary copy. Its "browser has GPU WebGL" line is that copy's.

g028's sightx-real-buildings journey also ran under the same local setup, with view=3d. It passed 84 of 85. The one failure is "f97e99f88a931e74: W walks on from the door" (moved 0.28 m). That set has no placement record. Main's page fails the same check the same way (0.28 m) under software WebGL, so it is not from this change.

**The acceptance run belongs to the Mac.** Deploy weyland-sightx-worker, then on the GPU against production:

    node tools/user-simulation/run-journeys.mjs --passes 3 --only sightx-sheets

Screenshots, from the local server:
- t2507-a100-131B.png: T2507 A-100, 49 rings, 131B's card.
- r2502-a105-101A.png: R2502 A-105 with 101A.
- t2421-a100-121.png: T2421 A-100 with 121.
- phone-t2507-131B.png: the phone layout.
