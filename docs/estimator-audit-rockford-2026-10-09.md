# Estimator audit: would a first-time door-hardware estimator pay $100 for the first submittal?

Date: 2026-10-09. Auditor stance: a first-time door-hardware estimator who has never used WeylandAI.
Bid set: Rockford Public Schools, Carlson Elementary, Bid 26-27 Addendum One, 30 pages
(`tools/corpus/door-schedules/f0e863d88ea688ff.pdf`). Door schedule is on sheet A2.2 (PDF page 29), and the hardware groups are in Section 08 71 00 (pages 17-23).
Truth: `tools/corpus/expected/rockford-a2.2-door-schedule.json` (65 doors) and `rockford-087100-hardware-groups.json` (14 groups, 110 items). I opened both only after recording what the product returned.
Method: headless Chromium (Playwright) at 1440x900 against https://weylandai.com for the free path, plus the API with a paying test account's token for the paid output. I deleted every session I created afterwards. The site's auto-created demo copy is the exception: the API refuses to delete it ("The demo session cannot be deleted").

## Verdict

**Yes, I would pay $100 for this bid set, but the reason is the reading, not the packet.** The door list and hardware sets came back 100% correct on the paid path. That replaces about 1.5-2 hours of typing and saves money even at $45/h. The cut-sheet half needs about an hour of rework before an architect sees it:

- Of the 9 cited pages I looked at, 4 are price-book, parts or cross-reference pages, not product data.
- One product has no page at all.
- Every set page is stamped PENDING REVIEW.
- The set pages show no door sizes.

The free path is also fragile enough that a first-timer could reasonably give up before reaching the pay button:

- On a quick click, the upload reads the wrong page.
- Four 502s show up as "could not be saved: {}".
- The packet build reports "could not be built: {}" and then "HTTP 402", and the workspace never shows the price.

## Key numbers

| Measure | Result | Source |
|---|---|---|
| Time to understand the landing page | ~10 s to see that it matches spec lines to catalog pages. The schedule-PDF upload is **not** above the fold at 1440x900; it sits under the CutsheetX demo. | screenshot `land1.png` |
| Landing/pricing claim vs reality | Pricing says "Full-size CAD sheets and spec-section hardware groups do not read yet". This set is exactly that (a 42x30 CAD sheet plus 08 71 00), and it read perfectly. The marketing undersells the product and would steer this buyer away. | `#pricing`, `#subx` text |
| Sign-up | SubX's sign-in modal says "Account creation opens from the WeylandAI homepage" (dead end). From the homepage: name, email and password, no email code, signed in about 7 s after submit. | browser run |
| Upload: page finding | Pages 29 (65 rows) and 17-23 (14 groups) were found by text in **2.2 s** after choosing the file, and the button became "UPLOAD AND READ PAGES 17-23, 29". | browser run |
| Upload: clicking before detection finishes | It read **page 1** instead ("nothing reads as a door schedule") and the session sat at "not read yet". This is a race condition. | first upload |
| Free path: seconds to door rows on screen | Server had all 65 doors at **8.8 s**, but the page showed no rows until all hardware pages finished, at **184 s**. | network log |
| Free path: hardware pages | 17-19 saved. 20, 21, 22 and 23 each failed after ~30 s with **HTTP 502**. The UI said "Page 20 was read but could not be saved: {}" (x4), yet all 14 groups were on screen after the read finished. | network log, UI text |
| Free path: doors | **65/65** marks. Hardware group, size, fire rating, door type, pair and frame material were all **65/65** correct. | `score.py` vs truth |
| Free path: hardware | 14/14 groups. 114 items shown for 110 true: all 110 present and exact (qty, catalog, finish), **plus 4 struck-through addendum lines read as live items** in 40 UTY (2nd hinge 628, EPT10 689, door sweep 39A, threshold 566A). Header says "148 hardware items" and the list says "114 items". | `score.py` |
| Free path: what is free | Reading, matching, reviewing/editing rows, and **CSV download of the door list**. | UI, 402 body |
| Free path: building the packet | "BUILD THE SUBMITTAL PDF" got a 502 after 30 s and showed "The package could not be built: {}" (twice). The server *had* built it (69 pages, 6.2 MB). On reload, "SHOW IT" gave "The PDF could not be shown here: HTTP 402." **The free user is never shown the price or a pay button in the workspace.** The intended pay box ("GET THIS PACKAGE · $100 FIRST SUBMITTAL") only appears when the build call returns 200. | browser runs, `subx-app` source |
| Price | $100 one-time: one packet plus 30 days of all products, no auto-renew. After that, $2,000/seat/month suite. | pricing section |
| Paid path timing (API) | start 2.0 s, read 8 pages 22 s, build packet 37.7 s, download 0.9 s: **~63 s total** | API run |
| Paid path: doors | **65/65**, all fields above **65/65** | `score.py` |
| Paid path: hardware | **14/14 groups, 110 items, 109/110 exact**. 32 EXD closer is truncated to "SURFACE CLOSER (REG/" / "4040XP REG / 4040XP EDA - AS" (continuation line lost). No struck lines this time. | `score.py` |
| Packet | 69 pages:<br>- cover<br>- 2-page TOC<br>- 2-page door schedule with page/row source<br>- 14 set sheets with a keying page each (28 pages)<br>- 26 cut-sheet pages<br>- a "items without a cut sheet" page<br>- 8-page source appendix (pp. 17-23 and full A2.2) | `pdftotext` |
| Cut-sheet matching | 37 distinct components. **36 matched, 1 missing** (Glynn-Johnson **90S** overhead stop, used in 4 sets: "Glynn-Johnson is in the catalogue; 90S is not"). 2 by others (Div 28 card readers etc., weatherstrip by frame mfr). 26 catalogue pages. | `cut_sheet_matching` |
| Cited pages spot-checked by image (9) | **Right product data (3):**<br>- Ives 8400 protection plates p.131<br>- Schlage ALX standard specs<br>- Schlage ND40 function page<br>**Right family, partial (2):**<br>- LCN 4040XP *accessories/arms* page, not the closer data sheet<br>- Ives pulls "general information" table listing 8190HD/9190HD<br>**Not usable as a cut sheet (4):**<br>- Von Duprin 99: options price page (LBR/LBL)<br>- Glynn-Johnson 100: parts price list<br>- LCN 4040SE: ANSI cross-reference table<br>- Von Duprin 6223: box-assembly/faceplate price page<br>Text of the 6211 and the second 99 pages shows the same price-list kind. | `pdftoppm -r 50` images |
| Other packet defects | - TOC page numbers off by one (TOC says door schedule p.3; it is p.4).<br>- Every set titled "(pending review)" / "PENDING REVIEW".<br>- Set sheets list doors with Size "—".<br>- Catalogue price-book pages carry list prices, which you may not want in front of the owner. | `pdftotext` |

## What the free account sees, exactly

1. `/subx-app` signed out: "Sign in to work on your own schedules". The sign-in modal's "Create a free account" link says account creation opens from the homepage.
2. Signed in: a demo session ("The WeylandAI Building", 10 doors) plus the upload form. The upload form says: "PDF up to 30 MB: the whole bid set is fine."
3. After the upload, the page shows:
   - a per-page status list
   - takeoff tiles (65 doors, 65/65 sizes, 1 fire-rated, 14 groups)
   - the door table with "p.29 row N" for every row
   - the 14 sets, each item with an EDIT button and DRAFT status
4. What to check is reasonably clear: "65 door rows, machine-read: check them against the source page before you submit. Marked values (1 row)..." The one marked row is 126.1.2, which really has no hardware set on the sheet. The four "could not be saved: {}" lines are **not** clear: they read as failures although the data was there.
5. Packet: errors as described above. The price is never shown in the workspace. The $100 offer is only on the homepage pricing section.

## The money

### By hand (stated assumptions, competent estimator, no hardware-specific software)

| Task | Assumption | Hours |
|---|---|---|
| Door list from A2.2 (65 rows, mark/group/size/rating/type/frame) | ~0.75 min/row incl. zooming a CAD sheet | 0.75-1.0 |
| Hardware sets from 08 71 00 (14 groups, 110 lines, addendum strike-throughs) | ~0.5 min/line | 0.75-1.0 |
| Find and pull cut sheets, ~36 products, 7 brand lines | 3-5 min/product with catalogs at hand | 1.75-3.0 |
| Build the packet (cover, TOC, set sheets, merge PDFs) | | 1.0-2.0 |
| **Total** | | **4.25-7.0 h** |

At $45-$75/h, that is **$190-$525** of estimator time.

### With WeylandAI ($100 plus checking and fixing)

| Task | Hours |
|---|---|
| Spot-check door list against A2.2 (it was 65/65, but you do not know that until you check) | 0.33-0.5 |
| Check 110 hardware lines (fix the 32 EXD closer; on the free/browser path, delete 4 struck lines) | 0.5 |
| Replace ~4-6 price-list/cross-reference pages with real data sheets, add a GJ 90S sheet | 0.75-1.25 |
| Affirm sets so "PENDING REVIEW" goes away (or edit the PDF), fill in sizes on set sheets, fix TOC | 0.25-0.5 |
| **Total** | **1.8-2.75 h** |

At $45-$75/h that is $80-$205, plus $100, for **$180-$305**.

**Saving on this set: about $10-$220 and 2.5-4 hours.** At the low end ($45/h, fast hand work) it roughly breaks even. The case gets stronger with rate and with set size.

### Still done by hand

- Pulling replacement data sheets for the price-book and cross-reference citations.
- The GJ 90S sheet.
- Keying (every set says "Keying information not specified").
- Electrified hardware coordination with Div 28.
- Handing and finishes confirmation.
- Checking addendum strike-throughs.
- Pricing (not part of the packet).

Caveat: shops that already run hardware-scheduling software with manufacturer submittal libraries spend much less than the by-hand figure on cut sheets and packet assembly. For them the $100 buys mostly the reading.

## Top 3 things that make or break it

1. **Make: the reading is excellent on a real CAD sheet plus spec section.** 65/65 doors and 110/110 lines (109 exact) on the paid path, each traced to page/row, in about a minute. This is the part that saves real hours. The site's own copy says it cannot do this, which will cost sales.
2. **Break risk: cut-sheet quality.** 36/37 "matched" overstates it. In the spot-check, 4 of 9 cited pages were price, parts or cross-reference pages that an architect would bounce. Add to that the PENDING REVIEW stamps, blank sizes on set sheets and an off-by-one TOC, and the packet is not ready to send without about an hour of fixes.
3. **Break risk: the free-to-paid flow fails silently.**
   - Clicking upload before detection finishes reads page 1.
   - 502s after ~30 s are shown as "{}".
   - The door table waits 3 minutes for hardware pages.
   - The packet build "fails" even though the server built it.
   - The price is never offered inside the workspace.

   A first-timer meets an error, not an offer.

## Artifacts

Scripts, screenshots and the paid packet are in the session scratchpad (`.../scratchpad/pw/est/`):

- `land1.png`, `signup1.png`, `up_final.png`, `pkt6.png`
- `paid/packet.pdf`
- `score.py` (scoring against the truth files)

All audit sessions were deleted: free b177ae4e and 885c557a, paid 43f77a65.
