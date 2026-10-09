# WeylandAI value report: what a first-time buyer gets, 7 October 2026 (evening)

Five first-time-user audits ran on the live site tonight, 7:44 to 9:04 pm EDT, in a real Chromium on a desktop and on a 390 px phone. Each arrived cold at weylandai.com and tried to get one kind of buyer's work done with real public documents:

- an **estimator** at a door and hardware subcontractor, pricing the Rockford 26-27 bid;
- a **project manager** at a general contractor, running a school renovation;
- a **field superintendent and owner's rep**, walking a job and filing field paperwork;
- the **owner of a 12-person specialty shop**, sizing up the market and the offer;
- a **promises** check of every claim on the homepage and /pricing.

Their full logs are in plan/evidence/value_audit/ (estimator.md, project-manager.md, field.md, shop-owner.md, promises.md), with 481 screenshots in plan/evidence/value_audit/shots/. From 9:12 to 9:30 pm I re-checked every finding an audit called decisive against production myself (section 1). Numbers not marked as re-checked come from the audits. The same evening's journey runs are in plan/weylandai_journeys.md (22 of 23 green). Those runs test the site's own sample sheet. These audits test real bid sets, and that is where the gap is.

**In one line:** nobody in these five audits would pay $100 today.

- **The packet cannot be built from a real bid set.** SubX read 0 rows from the Rockford and Berryessa door schedules and from the Rockford hardware groups (all re-checked tonight).
- **Where it can read a hardware set, the packet has no cut sheets:** 0 of 23 (re-checked).
- **A free account already builds the packet for $0.** Every new account starts a 14-day trial of every product (tonight's journeys and all five audits), and the packet route lets a trial account through (re-checked). The pricing card never mentions the trial, and /pricing says there is none.

What works, and is honest:

- an accurate door list and CSV from a ruled schedule page in 18 s, which saves 25-35 minutes of typing;
- cited catalogue matches for lines typed as maker and model;
- the Finder;
- the PropX sample proposal;
- the news headlines;
- a payment form in the page that is clean and says plainly what it charges.

The fixes that change the $100 decision are in section 6. The first six are in the reader, the matcher, the packet and the offer.

## 1. The decisive findings, re-checked tonight

Method:

- **Accounts.** One throwaway account in exactly the state a new free account gets: weyland-platform-worker newTrialAccount(), tier starter, trial, 14 days, every product. It existed only in the database, so no AuthFor identity was made. It was deleted afterwards (section 8).
- **Guest calls.** One guest session for the paste and HuntX calls.
- **Browser.** Chromium with the graphics card (--use-angle=metal) for the two checks that need one.
- **Times** are what production answered tonight.

| # | Finding (who called it decisive) | What I did | Result |
|---|---|---|---|
| 1 | SubX cannot find the schedule on a full-size CAD sheet (estimator, promises) | Uploaded Rockford sheet A2.2 (PDF p.29, 3024 x 2160 pt) and Berryessa A9.2 (p.284), one page each, then the server read | **Reproduced.** HTTP 422 no_schedule_table_found after 22.7 s and 6.9 s |
| 2 | SubX cannot read the hardware groups in a spec section (estimator, promises) | Rockford Section 087100, p.18 (groups 02 RR-M, 06 CL, 07 CL), uploaded as a hardware schedule | **Reproduced.** 422 no_schedule_table_found in 2.7 s |
| 3 | The packet carries no real cut sheets (estimator) | Christina ruled Hardware Set 01 (p.219): read it, then BUILD THE SUBMITTAL PDF | **Reproduced.** Read in 41.7 s. Packet: 6 pages, 0 of 23 items matched to a cut sheet. OCR noise printed as maker and model ("QV" for Ives; "EPT-10 BY SECURITY vENX ) % aq") |
| 4 | The $100 packet is free on the trial (estimator, promises, shop owner) | Built that packet as the trial account; read the homepage pricing section and /pricing | **Reproduced.** Packet built (HTTP 200) with no payment. The account's count went to 1 of 999. The homepage pricing section never uses the word "trial"; /pricing still says "No free trial on this plan". New sign-ups landing on the trial was proven tonight by the create-free-account journey (3/3) and all five audit accounts; I did not sign up through AuthFor myself |
| 5 | Hardware lines pasted as printed are misread (estimator, promises) | Pasted Hardware Group No. 06 CL, as printed, into the live matcher | **Reproduced.** "1 of 14 lines matched". "CONTINUOUS / HINGE", "ENTRANCE / LOCK" and "KICK / PLATE" were read as maker and model. "CLOSER, HOLD OPEN" was split at the comma. The maker code at the end (SEL, SCH, LCN, IVE) was ignored |
| 6 | Another maker's product labelled "high · exact" (promises; the estimator rated it high) | "Ives 8200" and "Ives 8302" | **Reproduced.** Sargent 8200 Series Mortise Lock (high, exact). ZERO 8302 (high, exact), cited "around p.36 ... search this PDF" |
| 7 | PropX cannot price your own openings (estimator) | Fetched /propx, /propx-app, the homepage, the shell and the SubX app | **Not reproduced as stated.** /propx-app is a working builder: it picks a SubX door schedule, makes one line per door type, frame and hardware set, takes your unit prices and makes a PDF. It passed the propx-proposal journey 3/3 tonight. **What is true:** /propx is a dead end ("SIGN IN TO START A PROPOSAL" goes to /login?redirect=/), and nothing on the homepage, the account card or SubX opens /propx-app. "Build PropX" is left out of the ranking; "connect it" is ranked (fix 8) |
| 8 | DrawX, SpecX and AsBuiltX fail on real documents (project manager) | DrawX: one 36 x 24 Fayette sheet. AsBuiltX: that sheet against itself. SpecX: a 33-page spec extract | **Reproduced.** HTTP 500 "Worker exceeded memory limit." (1.7 s and 1.4 s). HTTP 500 "Worker exceeded CPU time limit." (37.5 s) |
| 9 | The site sells tools that do not work (project manager, shop owner) | Read the /pricing source and /api/billing/catalog; opened /pricex in a browser | **Reproduced.** /pricing's checkout list includes DrawX ($399 a month), SpecX ($149), AsBuiltX ($199), InspecX ($199), SurvX ($199) and PriceX ($149). /pricex prints "undefined" 28 times and still promises FRED data |
| 10 | The GC, field and market tools cannot be reached (project manager, field, shop owner) | Searched the homepage source, the shell's list of app addresses and the account card | **Reproduced.** 0 links or references to any of the 20 smaller products, or to /find or /news. The shell knows 15 app addresses, none of them these. The account card's only product button is OPEN SUBX |
| 11 | SightX walks product tags, not the schedule's doors (field) | Read the homepage source served tonight | **Reproduced.** WALK sends only the matched product lines (label = model; sub = maker and category), and only the first 12. Door number and hardware set are never read |
| 12 | The world behind the lowered dossier takes no click or key on desktop (field) | Chromium at 1280 x 860 with a mouse and at 390 x 844 with touch: lowered the dossier, checked what sits under the centre, clicked, held W | **Reproduced.** Desktop: the element under the centre is BODY, and the SightX frame got 0 pointer and 0 key events. Phone: it is the frame, and it got both. The cause, in the served CSS: the fix is inside @media (hover: none) and (pointer: coarse), so mouse users never get it |
| 13 | The homepage HuntX hides the real index (shop owner) | Called /api/hunt/opportunities as the homepage does; read the homepage source; counted the index in the database | **Reproduced.** The homepage gets 100 of 978 rows (TxDOT 75, NYC 22, Illinois 3; none of the 166 CA rows). Its CA filter compares "CA OPSC" with rows labelled "CA_OPSC", so it can never match. "$142,850,000" is typed into the page. "Last Pipeline Sync" shows the visitor's own clock. 0 of the 100 rows mention a door or a school. **Not reproduced at this hour:** closed lettings on the homepage (all 100 rows are upcoming tonight). In the full index behind /huntx, 688 of 978 rows carry a listed date before today |

## 2. Every product, as a first-time buyer met it

"Re-checked" marks a number I reproduced tonight. Everything else is from the audit named in plan/evidence/value_audit/. Time saved is against doing the same job by hand, with the assumption stated.

| Product | Value it delivered | Self-explanatory? | Time saved (assumption) | Accuracy measured | Honesty problems |
|---|---|---|---|---|---|
| **First submittal, $100** (the offer and payment form) | The payment works inside the page: a Terms step naming Argo LLC, then Stripe's form at $100.00 in 4-6 s (journeys 3/3). What it buys is unclear, because the packet and "every product" are already free for 14 days | Yes for paying; no for what $100 adds over the trial | Arrival to a loaded card form: 13-16 s scripted, about 45 s for a person, 85 s if they read the Terms | The wording on pricing, the Terms step, Stripe and the Terms agrees: no automatic charge, what happens at day 30 | The pricing card never mentions the free trial (re-checked). /pricing says "No free trial on this plan" (re-checked). Stripe still shows John Mobley and MOBLEYSOFT, not Argo LLC. Argo LLC has no address or state anywhere |
| **SubX** (the $100 deliverable) | Partial. A correct door list and CSV from a ruled schedule filling a letter-size page (OCC A-801). Nothing from full-size CAD sheets or spec hardware groups (re-checked). Packets carry 0 of 23 cut sheets (re-checked) | No. The upload sits only behind Account, OPEN SUBX; the SubX tab is a demo. It reads page 1 of a bid set (a cover letter). Errors are raw (an HTTP 422 code with an internal error id; a "RUN EXTRACTION" button that does not exist). Phone layout is good | OCC: 18 s against 25-35 min to type 42 rows of 12 columns (about 40 s a row), plus 5 min checking: about 25 min saved. Rockford and Berryessa: none | OCC: 42/42 rows, 41/42 marks, 38/42 sizes (4 flagged, none wrong), 41/42 groups, 41/42 ratings, 39/42 types. Rockford: 0/65 doors, 0/13 groups. Berryessa: 0/9. Christina set: 24/24 rows, 10/24 wrong item types, about 12/24 with OCR noise | "with the cut sheets ... every line traced to its page"; "From schedule to submittal, zero rekeying"; "never guessed" is true only for sizes. "PREPARED BY" is the user's email. The first demo shows "SIZES READ 0 / 10" |
| **TakeoffX** | The same reader as SubX under another name; no takeoff from plans | No. The homepage tab is a wall-drawing demo with no upload; nothing on the homepage or the account links to /takeoffx | Same as SubX (18-40 s a page) | Same as SubX; OCC reported "18 hardware groups" where the sheet has 17 | "Quantify Openings in Milliseconds"; "Machine-vision vector blueprint reader"; "Eliminates Togal.ai ($3,600/yr)"; "< 3.0s opening detection"; shown as a separate lifecycle step |
| **CutsheetX** (homepage paste box and /cutsheetx) | Partial. Good for Allegion-brand lines typed as maker and model, with real price-book citations. Not for lines pasted as printed | The paste box is on the first screen and needs no account, but wants one "Maker Model" a line. /cutsheetx shows internal table names and test catalogues | 2-4 s for 30 lines. The 7 pinpoint citations save about 30 min (3-5 min each by hand). Retyping a spec into its format costs 10-15 min | As printed: 1 of 14 lines (re-checked); 1 of 33 item lines (promises). Retyped: 12-13 of 30 right (40-43%), 7 of 30 cite the page showing the product, 2 wrong products labelled "high · exact" (re-checked). Locks and exit devices 0 of 4 | "Match every spec line ..."; "60,000 Catalogued Variants" beside a live "10,508 products"; "Every match cites its own page" (ranges up to 172 pages, contents pages, some none); "Allegion, ASSA ABLOY, Dormakaba, and Hager" (Sargent, Corbin, Pemko: 0 variants). Citation links stop opening after 7 days |
| **Finder** (/find) | Partial; the cleanest tool on the site | Yes, on desktop and phone. Nothing on weylandai.com links to it (re-checked) | About 1 s a search; 30 searches in 3-5 min; a found cut sheet opens in 1-2 clicks | 13 of 30 right as the top result (43%), 2 wrong, 15 nothing. Spec-style strings ("4040XP EDA", "99-L-F") find nothing | Mostly honest ("Nothing catalogued matches"). A contents page is listed as a page naming the model |
| **PropX** | Small. An honest sample proposal (a fixed 6-opening bill, 1.1 s). A builder at /propx-app prices a SubX schedule from your unit prices, but has no labor, markup or alternates, and nothing on the homepage, the account card or SubX leads to it (re-checked) | The sample yes. The builder cannot be reached; /propx sends a signed-in user to sign in again | Not reached for Rockford or OCC | The sample is right ($10,931). The margin slider does not change the PDF. The same sample building is 84 openings and 12 sets here, 10 doors and 8 sets in SubX | "Price locked", "PROFIT MARGIN PROTECTED", "Supplier price quotes locked for 45 calendar days", "verified material costs", "60k-variant catalog price lock": no price lock exists; the card is static (BASE_COST typed into index.html) |
| **BidX** (/bidx) | Small: a correct one-page bid summary from numbers you type | The form is plain, but nothing on the homepage or the account links to it, and it sits under 31 product chips (INVESTORS, VENTURE DECK, CAREERS) | About 5 min of typing plus 2 s, against about 10 min from a Word template: about 5 min | Arithmetic right ($95,840). Missing: the bidder's name, address and license; alternates (Rockford has 18 alternate-priced openings); the bond in dollars; the owner's bid form | "Works with or without a SubX submittal behind it" (nothing can be imported); "signature-ready" with no bidder on the page |
| **HuntX** | Little on the homepage: 100 rows, almost all road work (re-checked). /huntx, which the homepage never links to, holds 978 rows from 4 sources and gave the night's first real door leads (3 Illinois "Replace Windows & Doors" jobs) | The search box yes; the real index is a page the homepage never links to | /huntx: about 20 s to a door lead, against 30-60 min a week across ESBD, CDB and district sites (assumption) | 75 of 75 TxDOT rows match the state's data. 688 of 978 rows in the index are past their key date and not marked closed (database, tonight). The CA filter can never match (re-checked) | "$142,850,000" typed into the page; the visitor's clock shown as "Last Pipeline Sync"; "100 opportunities in the index"; "verified and current"; "its own source docket" (TxDOT rows link to one generic page). The $799 card's email alerts, CSV/JSON export and 3 logins do not exist |
| **SightX** | Partial. The sample corridor walks well on /sightx/ with W/A/S/D and on a phone with the joystick. A paste hangs at most 12 product tags in that sample (re-checked). On the desktop homepage the world does not respond to the mouse or to W/A/S/D (re-checked) | Partly. WALK looks enabled when it is disabled; "dossier" is not an estimator's word; the paste box stops at 60 lines | 5 min 50 s to the first homepage walk (4 product tags). The sample corridor walks within 15 s on /sightx/ | 0 of 64 Rockford openings shown as openings. The whole hardware schedule matched 20 of 282 lines, 2 of them finish codes matched as Glynn-Johnson products | "Walk the building you are bidding, door by door"; /pricing's "transforms 2D flat architectural blueprints ... into interactive 3D"; "99% MATCH" badges on hand-made geometry; a "NARRATED REEL ... generated by filmline-video-worker" that is a silent SVG of a building not in the product |
| **MeetingX** | Partial. The room's roster and text chat work both ways (0.5-8 s), desktop and phone. No shared voice or video, no avatars. Actions are not shared, late joiners miss the history, and opening SightX drops you from the room | Yes for chat. Every invitee must make an account. A refused microphone gives a browser alert; actions use a browser prompt | 2 min 47 s from CONNECT to a two-way chat; a phone call does it in seconds | 3 of 3 messages delivered; 0 of 1 action shared; 0 of 1 project questions answered (the assistant gave a sales line) | "Multi-user WebRTC voice and spatial sync"; "annotate openings simultaneously"; "live avatars, text & voice chat inside the walkthrough". The customer's room shows WeylandAI's investor brief ("$10M TARGET SEED ROUND", "Ask about ... the raise") |
| **WireX / News** | Real: 36 current headlines from 6 trade publishers, each linked. The $49 tier adds 14 more headlines a feed | The 6 homepage headlines yes. the homepage never links to /news; "UNLOCK FULL WIREX" lands on a pricing section without WireX | About 10 s to useful headlines | 12 of 12 newest ENR and Construction Dive headlines match the publishers; the briefing's citations 14 of 17 right | "Everything moving in construction" and "live" overstate it; "audited" beside "not third-party audited"; internal engineering notes shown as "WEYLANDAI REPORTS" |
| **DrawX** | None. Fails on every drawing sheet (re-checked on one 36 x 24 sheet). On a letter-size sheet list it found 0 of 34 and invented 3 | The form is plain; no link from the homepage or account; signed out it shows only a price and SIGN IN | None, against about 15 min to type a 21-sheet index | 0 of 21 sheets. 0 of 34 found and 3 made up (G48, O45, TZ0), with no warning | Sold today at $399 a month by card (re-checked); "or as part of TakeoffX Pro", a plan that does not exist |
| **SpecX** | None. Fails on a 33-page extract (re-checked) and on the 438-page book | The form is plain; no link from the homepage or account | None, against 45-60 min to check a book's contents against its sections | 0 of about 67 sections. The 21 sections the contents list but the book lacks (08 71 00 Door Hardware among them) went uncaught | Sold at $149 a month (re-checked) |
| **AsBuiltX** | Partial on letter pages (right cells, but a bare grid with no drawing under it). None on 36 x 24 sheets (re-checked) | Yes; no link from the homepage or account | 2.9 s on letter pages; saves little against 5-10 min a sheet by eye | Letter pair: cells agree with a text diff. Drawing sheets: 0 of 3 tries in the audit, 0 of 1 tonight | Sold at $199 a month (re-checked) |
| **RFaX** | A formatter: a clean one-page RFI from 9 typed fields | Yes; no link from the homepage or account | About 2 min (2.5 min against 10-15 min, most of it writing the question) | 9 of 9 fields exact | "track a response": no log, no status, no sending; no sender block |
| **ChangeOrdX** | A formatter | Yes; no link from the homepage or account | About 3 min | 8 of 8 fields exact; a credit prints "$-2,500.00" | "cost and schedule impact" is the two numbers typed; no contract-sum arithmetic; no log |
| **NotesX** | A formatter for typed lists, not a meeting | Yes; no link from the homepage or account | About 5 min (5 against 20-30, most of it writing) | Agenda 10 of 10, actions 5 of 5; attendees split at commas (5 typed, 6 printed) | Fine as a formatter; no owners, due dates or carry-forward |
| **PermitX** | A cover sheet | Yes; no link from the homepage or account | About 5 min against a cover letter; none on the county's own application | 7 of 7 fields exact | "Assembles the application package" overstates it |
| **CoA** | A cover letter with a checklist | Yes; no link from the homepage or account | About 7 min (3 against 10) | Fields exact; all 8 checklist boxes start ticked | Risk: by default the letter tells the authority every sign-off is done. It told the county two were done that the user never ticked |
| **LienX** | Genuine but narrow: a conditional progress waiver with sound wording and a disclaimer | Yes; no link from the homepage or account | 3-8 min (2 against 5-10) | 6 of 6 details exact | Honest. No notary or signer block; nothing for collecting the subs' waivers |
| **CloseX** | A one-page list of 8 items | Yes; no link from the homepage or account | Little; the real closeout log (about an hour) is untouched | Covers about 8 of the 19 items the school's own 01 77 00 asks for | "closeout package" overstates it |
| **InspecX** | None. A 9-page inspection report hits the CPU limit; split pages found 0 of 5 real deficiencies | The form yes; no link from the homepage or account; results only inside a downloaded PDF | None, against 5-10 min to list the items by hand | 0 of 5; 3 lines flagged, 2 of them form boilerplate | Its word list has no "leaking", "broken" or "not working". Sold at $199 a month (re-checked) |
| **SafetyX** | Partial | Yes; no link from the homepage or account; results only in a downloaded PDF | 12 s against 2-3 min of reading; no real saving | 12 flagged, 6 useful (50%). Missed the root cause ("Fall protection was not used ...") and the outcome | Says plainly it is keyword-based |
| **SurvX** | None. A CPU-limit error on a 289-page condition survey; 0 of 14 defects in its first 20 pages | Yes; no link from the homepage or account | None, against 20-30 min to skim the survey | 0 of 14 | "site survey processing" with boundary-survey words only. Sold at $199 a month (re-checked) |
| **CompX** | Fast but wrong | Yes; free on its page; no link from the homepage or account | About 1 min against 5-10 min a letting on txdot.gov | Bid counts are 9-50% of the state's dataset (Garret Shields: 54 against 357). Win rates up to 4.5 times too high (Austin Bridge: 71.4% against 15.8%). TxDOT prime contractors only | "sourced live ... not a static report" with a 7-day cache. It calls data.texas.gov while the visitor waits. "Contact to activate" on its page, a card checkout on /pricing |
| **MarketX** | None (retired; its API answers 501) | No: a developer message sits under the headline | None | n/a | The headline still promises live FRED data; internal table names are shown; $249 on its page, $199 and NOT SOLD YET on /pricing |
| **PriceX** | None: every card prints "undefined" (re-checked) | No | None | n/a (the API now returns catalogue averages the page cannot show) | "Live lumber, metals & materials PPI - real FRED data" is false. Still sold at $149 a month (re-checked) |
| **GeoX** | Thin: right county, FIPS and tract (3 of 3); no permitting city, no school district | Yes; free on its page; no link from the homepage or account | About 15 s against 2-5 min on the free Census geocoder | 3 of 3 on what it returns | Its page says $149 a month; Stripe charges $249 (re-checked). It calls the Census geocoder while the visitor waits |
| **WeatherX** | Real but thin: the NWS forecast with risk badges; computes no impact | Latitude and longitude only; presets in TX, CA and AZ | About 3 min including a coordinate lookup; weather.gov gives the same | 14 of 14 periods identical to NWS | "Impact Calculator" computes no impact. It calls api.weather.gov while the visitor waits |
| **ForecastX** | Partial: correct arithmetic, wrong timing | Yes; free on its page | About 1 min against about 10 min in Excel | 8 of 8 rows right to the dollar. The first bill is dated day 1; retainage never reaches the cash column | "cash position" is a receipts table; its assumptions are not shown |

## 3. The best path to the $100 first submittal, and how long it takes

**Today's shortest path that ends in a packet**

1. **Arrive** at weylandai.com.
   - Desktop: a space intro, then a corridor. Press Enter or "[raise dossier]" (about 3 s if you know to). A visitor who waits is still looking at a tilted, unreadable page at 22 s.
   - Phone: readable at once.
2. **Paste product lines,** one "Maker Model" a line, into the box on the first screen, and press RUN IT LIVE. Cited matches appear in 2-4 s.
3. **Press BUILD THE PACKET · $100** under the result. Tick the Terms (Argo LLC), then CONTINUE TO PAYMENT. Stripe's form opens in the page. From arrival: 15.9 s scripted on a desktop and 12.7 s on a phone; about 45 s for a person, or 85 s if they read the Terms.
4. **Pay.** The box says "Paid", gives the end date and one button: OPEN SUBX: UPLOAD YOUR SCHEDULE. A buyer who was not signed in first signs in with an emailed 8-digit code (about 1 minute).
5. **Build the packet in SubX.**
   - Choose door or hardware schedule, and upload just the schedule page: SubX reads page 1 of whatever it is given.
   - The read takes 18-40 s.
   - BUILD THE SUBMITTAL PDF takes 2-8 s, and the packet opens in the page with DOWNLOAD PDF.

**How long:** about 4-5 minutes from arrival to a packet:

- 45 s to the card form;
- about 1 minute to pay;
- about 1 minute for the emailed code, if not signed in;
- 30 s to pick the file;
- 18-40 s to read;
- 2-8 s to build.

That holds only when the schedule is a ruled table filling a letter-size page, like the OCC sheet.

**Where it breaks**

- **The normal bid set fails.** It puts the door schedule in a corner of a full-size CAD sheet and the hardware groups in an unruled spec section. Step 5 then ends in "no_schedule_table_found" (re-checked on Rockford and Berryessa): the buyer has paid $100 and has nothing.
- **No cut sheets.** Where a ruled hardware set does read, the packet has 0 of 23 cut sheets (re-checked).
- **The packet is cheaper without paying.** "Create a free account" (no card, no email check), then Account, OPEN SUBX, upload and build: about 5-7 minutes and $0 (re-checked). Anyone who signs up before paying has no reason to pay for 14 days. Whether the trial stays is your call; it is fix 5.

**The path it should be.** This follows the promises audit's proposed order. Every step exists today except the reading in step 2.

1. The page is readable at first paint on desktop, as it already is on a phone. The corridor becomes a "walk it" button, not the welcome.
2. The first screen takes the bid PDF itself, or a hardware set pasted as printed. WeylandAI finds the door schedule and hardware pages, and within a minute shows:
   - the door list and the hardware groups;
   - each matched product with its cited page;
   - what did not match.
3. Under that result: BUILD MY PACKET · $100, the Terms step and the card form in the page (all built).
4. The packet builds in the same overlay. It has the cited cut-sheet page for each matched product, a list of what did not match, and the buyer's company on the cover. The account is made from the email given with the card (built).
5. From the same record: price it (PropX), bid it (BidX), walk it (SightX).

The target: Rockford to a packet with most of its cut sheets in under 3 minutes, with no retyping.

**Order.** The site sells the post-award packet first. A door estimator's day starts before the bid: get the bid set, find the door schedule and hardware groups, count, price, put in the bid. The submittal comes weeks after award. Keep the $100 on the packet, but have the same upload give the counts and the CSV for pricing; that is the step SubX already does best.

## 4. Lead with these; hold the rest back until they deliver

**Lead with** (they deliver today and can say so honestly):

- **SubX's door list and CSV from a schedule page.**
  - OCC: 42 of 42 rows in 18 s, each traced to its page and row. Sizes it is unsure of are flagged and kept out of the counts.
  - Say what it reads: ruled schedule tables, on the page you name.
  - It was the most useful thing the estimator took away.
- **CutsheetX matching and the Finder.**
  - Price-book citations for lines typed as maker and model; the Finder once it is linked.
  - Name the brands covered: the Allegion lines (Schlage, LCN, Von Duprin, Ives, Falcon, Zero, Steelcraft, Glynn-Johnson), plus NGP, BEA, Camden and Dyke.
- **PropX.** The sample proposal (it says plainly the prices are samples), and the /propx-app builder once SubX links to it.
- **The payment form in the page and the plain offer terms:** no automatic charge; the account and the work are kept.
- **News headlines, free.** The $49 tier adds little.
- **LienX and ForecastX as free extras.** Both are correct; say what ForecastX assumes.

**Hold back:**

- **The packet's promise.** Keep "with the cut sheets, catalogue pages and citations, every line traced to its page" off the $100 card until fixes 1-4 pass on Rockford and Berryessa. Until then, the honest card is "a door list and a packet from a ruled schedule page".
- **TakeoffX** as a product of its own: fold it into SubX's counts until it takes off from plans.
- **SightX's "walk the building you are bidding":** keep the sample corridor as a labelled preview until a door schedule builds its openings.
- **MeetingX:** sell it as room chat until shared voice and walking in together exist. Remove the investor brief now.
- **HuntX's 10 screens of road work on the homepage:** lead instead with door and school leads from the full index, once the homepage reads it.
- **DrawX, SpecX, AsBuiltX, InspecX, SafetyX and SurvX:** off sale until each works on the audit documents (tools/corpus/plan-sets, door-schedules and field-reports).
- **PriceX and MarketX:** off sale and off the plan list.
- **CompX:** until its counts match the state's dataset.
- **GeoX and WeatherX:** as free helpers inside a project, not $149-249 seats.
- **BidX, RFaX, ChangeOrdX, NotesX, PermitX, CoA and CloseX:** no standalone seats until they share one project record and keep a log. Fix CoA's pre-ticked boxes before anyone relies on it.
- **The Enterprise checkmarks** (Procore and ERP sync, local inference, zero data retention, 24/7 engineering): "on request, quoted" at most.

## 5. Every claim to remove or correct

All homepage and /pricing claims below were still on the live pages at 9:12 pm (checked against the served HTML). Where they live:

- Homepage: /Users/johnmobley/weylandai.com/index.html, which ships by git push.
- /pricing: weyland-platform-worker/src/lib/marketing-pages.js (serve_pricing).
- Product pages: listed against each claim.

**Homepage**

| Claim, as it reads | What is true | Do |
|---|---|---|
| "Match every spec line to the real catalog page. With the citation to prove it." | 1 of 14 lines of a real hardware group pasted as printed (re-checked); 40-43% after retyping as maker and model | Until fix 2 lands: "Paste products as maker and model; we match what our catalogue covers and cite the page" |
| "machine-vision takeoffs" (hero); "MACHINE-VISION VECTOR BLUEPRINT QUANTIFICATION" | No vision model; TakeOffX reads schedule tables | "schedule-based door counts" |
| TakeoffX: "Read Schedules & Quantify Openings in Milliseconds. Vector geometry, not guesswork." | Reads take 18-40 s; the wall drawing is a stored result (assets/takeoffx/fayette-p6-walls.json), not run for the visitor | "Count doors by size, rating and hardware set from your schedule page"; call the canvas a stored example |
| SubX: "Turn a Door Schedule into a Matched Submittal — Live. From schedule to submittal, zero rekeying." | 0 rows from the two full-size bid sheets and the spec hardware groups (re-checked) | Keep only once fix 1 passes; until then name what it reads |
| "A real page from 'The WeylandAI Building''s door & hardware schedule"; "extracted from a real architectural door schedule" | WeylandAI's own sample, seeded once and copied for each visitor | Call it a sample schedule |
| SubX storyboard "LIVE · YOUR TRIAL SESSION" and "This is the real assembled content, not a mockup." | The four step panels stay empty: no script fills them (promises audit; confirmed in tonight's served page) | Fill them from the door-index answer the page already fetches, or delete the panel |
| CutsheetX: "60,000 Catalogued Variants ... Every match cites its own page." | 60,039 variants is right, but the same section's live counter says 10,508 products. Citations run to 172-page ranges, contents pages, or none | One catalogue number everywhere; "Most matches cite the page" until citations land on the product page |
| "60,000 Allegion, ASSA ABLOY, Dormakaba, and Hager variants" | Sargent, Corbin Russwin and Pemko have 0 variants; dormakaba none; Hager 2 | "Allegion (Schlage, LCN, Von Duprin, Ives, Falcon, Zero, Steelcraft, Glynn-Johnson) plus NGP, BEA, Camden and Dyke" |
| "Up to 60 lines. Misses are recorded ... so coverage grows." | The misses are mis-parsed ("ea ives", "continuous hinge"), so the log measures the parser | Fix 2 first, then keep |
| HuntX: "Never Miss a State Letting or School Board Funding Release." "Every public bid opportunity, verified and current." | 4 feeds (TxDOT, CA OPSC, NYC City Record, Illinois CDB); nothing is verified; 688 of 978 rows are past their key date | "Texas DOT lettings, California school funding, NYC and Illinois notices, refreshed hourly" |
| "Every lead traces to its own source docket." | 75 of the homepage's 100 rows (all TxDOT) link to one generic TxDOT page | Link each TxDOT row to its own proposal, or drop the claim |
| "Active Public Capital $142,850,000" | Typed into index.html (line 2165) (re-checked) | Remove, or compute it from the rows shown |
| "Last Pipeline Sync" | The visitor's own clock (new Date(), index.html line 3313) (re-checked) | Show lastIngest.finished_at, which the API already returns |
| "N opportunities in the index"; "All Live Sources (TXDOT + CA OPSC)" | The index holds 978 rows from 4 sources; the homepage reads the first 100, and its CA choice can never match (re-checked) | Show the true total and all 4 sources (fix 14) |
| HuntX $799 card: "Real-time keyword & location email alerts", "Export opportunities to CSV/JSON", "3 Estimator logins included" | The HuntX worker has two routes; no alerts, export or seats exist | Remove until built |
| PropX: "Automated Margin Protection ... Price locked. Field synced." "verified material costs", "60k-variant catalog price lock", "PROFIT MARGIN PROTECTED", "Supplier price quotes locked for 45 calendar days." | No price lock exists anywhere. The card is static (BASE_COST = 58780.00 at index.html line 3698); the PropX app asks for your unit prices | Remove; describe the real builder |
| "Rollup of 84 openings, 12 hardware sets" (The WeylandAI Building) | The same building is 10 doors and 8 sets in SubX | Use the sample's real numbers |
| MeetingX: "Multi-user WebRTC voice and spatial sync directly inside the project record. Estimators and jobsite superintendents annotate openings simultaneously." | Roster and text chat only; its own footer says "NO SHARED AUDIO OR VIDEO YET" | "Project room: who is here, and chat" |
| SightX: "Walk the building you are bidding, door by door." | A hand-made sample corridor; a paste hangs up to 12 product tags in it (re-checked) | "Walk a sample corridor; your matched products hang in it" until fix 13 |
| "Guided Storyboard Preview ... NARRATED REEL ... Narrated tour generated by filmline-video-worker" | A silent SVG typed into index.html, about a lobby, executive suites and server vaults that do not exist | Remove |
| "SHADERS: GLSL PROCEDURAL RAYMARCH", "CONTROL PROFILE: TACTILE HUD PILL", "SOVEREIGN ARCHITECTURAL SUPERIORITY" | Jargon that means nothing to a subcontractor | Remove |
| Desktop intro captions: "BIG BANG: QUANTUM BOUNCE & INFLATION", "SIMULOCANIATY // HO'OLEILANA CONTRACTION", "MHS HYPOTHESIS ..." | Shown before any word about doors (weyland-sightx-worker/src/pages/sightx.html) | Open on the readable page (fix 10) |
| WireX: "One Feed for Everything Moving in Construction", "Pulled live"; "$49/MO FOR FULL SYNTHESIS · UNLOCK FULL WIREX" | 6 trade feeds stored and refreshed in the background; the button lands on a pricing section without WireX | "Construction and security trade headlines"; open WireX's own form |
| "One Project Spine. Five Operating Engines." | /pricing says seven; the homepage shows eight tabs; the plan list sells 29 | One number |
| Comparison table: "Autonomous Vector Vision — < 3.0s opening detection with bounding box review" | No opening detection exists | Remove |
| Comparison table: "Live Supplier Price Lock — Dynamic margin sliders and price lock guarantees" | No price lock | Remove |
| Comparison table: "Real-Time WebGL Field Twin ... a real building with real, buyable hardware" | Real-time WebGL and buyable parts are true; the building is a sample corridor | "a sample corridor of real, buyable hardware" |
| Comparison table: "Manual clicking and drawing polygons with mouse ($299/mo)"; "$3,000/seat offline desktop renderers (Lumion)"; "$18,000–$30,000/yr across 4 separate vendor bills"; "$15,000–$45,000/yr based on firm's gross revenue" | Togal is automatic AI takeoff at $299.99; Lumion Pro is about $1,149 a year; the other sums have no source | Remove, or cite a source for each |
| "$100 first submittal, then the $2,000 /mo flat suite" | /pricing and Stripe charge $2,000 per seat | "per seat" in both places |
| Suite: "Up to 10 concurrent team members" | No team or invite feature exists | Remove until built |
| Enterprise: "Dedicated local inference nodes (Qwen3-8B / Llama)", "Bi-directional Procore & ERP database sync", "Zero data retention & sovereign IP isolation", "24/7 Dedicated solutions engineering" | None is built. A customer cannot even delete an upload or the account | "On request, quoted" at most; build delete first |
| "Average Annual Subcontractor Savings: $37,600 — Eliminates Togal.ai ($3,600/yr), Dodge Construction ($10,000/yr), and 240+ hours of manual submittal compilation ($24,000/yr)" | A hypothetical sum, not measured. Nothing that ships replaces Togal or Dodge | Remove; publish a measured job when one exists |
| $100 card: "One submittal packet: SubX reads your door or hardware schedule and builds the PDF, with the cut sheets, catalogue pages and citations, every line traced to its page." | Not from a real bid set; 0 of 23 cut sheets (re-checked); matched documents are appended whole (a 152-page price book as one "cut sheet") | Fix 1-4, or say what it builds today |
| "Pasting a schedule and seeing the cited matches is free, with no account. Pay when you want the packet built." | A free account's 14-day trial builds packets without paying (re-checked on an account in that state) | Fix 5 |
| "SAMPLE PACKAGE, END TO END 6.6 s ... 6 / 6" | Re-run: 10.7 s; six hand-picked lines; the proposal step prices a fixed sample. The card is read from mobleysoft.github.io while the visitor waits | "Measured once on six sample lines"; serve the JSON from weylandai.com |
| "Precision Auto Doors is the suite's first real user." | True per you; no job of theirs has run through the suite yet (the page says so) | Keep; do not imply usage |

**/pricing** (weyland-platform-worker/src/lib/marketing-pages.js, serve_pricing)

| Claim, as it reads | What is true | Do |
|---|---|---|
| "ONE PROJECT SPINE · SEVEN OPERATING ENGINES" | The homepage says five; the plan list sells 29 | One number |
| "$2,000 USD / SEAT / MONTH" with "$3,693/mo per active seat" | The homepage says flat | One story |
| "No free trial on this plan: the free month comes with the $100 first submittal." | Every new account gets 14 days of every product free (journeys and audits; the packet gate re-checked); the month costs $100 | Fix 5 |
| "preserving cryptographic data provenance" | Citation links carry an access signature that expires after 7 days (weyland-cutsheetx-worker/src/lib/citation-links.js, TTL_DAYS = 7). Nothing signs the packet | Remove |
| "Targeted AI firepower designed to pay for itself in administrative hours saved during your very first bid cycle." | No job measured | Remove until a job is timed |
| "Human estimator approval is strictly enforced at every commercial boundary." | Nothing is sent anywhere automatically, but nothing stops downloading an unreviewed packet | "Nothing leaves without you" |
| CutsheetX $199: "Instantaneous product technical specification assembly and automated distributor cut-sheet packaging. Eliminates tedious manual PDF searches across supplier catalogs." | 43% right on a real list; packets append whole price books | Rewrite to what it does |
| SubX $599: "Automatically extracts technical specification requirements directly from project manuals and assembles complete, professional submittal compliance packages." | The Rockford manual's hardware groups return no_schedule_table_found (re-checked); nothing reads spec requirements | Rewrite; fixes 1-4 |
| TakeoffX $499: "vs. Togal.AI ($299/mo for manual counting only)"; "Sub-second machine-vision structural drawing quantification and vector blueprint takeoff engine" | Togal is automatic AI takeoff; TakeOffX reads schedules, not drawings, in 18-40 s | Remove |
| MeetingX $299: "live avatars, text & voice chat inside the walkthrough ... Multiple reviewers join the same scene as avatars" | Text chat and roster only, on a separate page | Rewrite |
| HuntX $799: "vs. Dodge / ConstructConnect ($6k-$12k/year)"; "Autonomous municipal permit ledger spider and commercial general contractor RFP reconnaissance engine" | No permit or GC-RFP source; the competitor prices have no source | Remove |
| SightX $999: "Transforms standard 2D flat architectural blueprints, MEP schematics, and structural schedules into interactive 3D virtual job-site simulations" | Sample corridor only; plan-to-twin is a stage-1 tool in tools/ | Remove; do not sell at $999 until a plan set builds a twin |
| PriceX $149: "Live lumber, metals & materials PPI - real FRED data, MoM/YoY change" | The page prints "undefined" (re-checked); the API serves catalogue averages | Take off sale (fix 7) |
| CompX $199: "Real TXDOT bid-tabulation history - win rate & total won value"; its page: "sourced live from data.texas.gov - not a static report" | 7-day cache; counts and win rates wrong (section 2) | Fix 20 first |
| "Sovereign Compute: Local Apple Silicon Metal inference & Cloudflare edge distribution. $0.00 / Token Variable Overhead" | No product uses local inference, and your standing rule forbids a product depending on the Qwen bridge | Remove |
| "ACTIVATE STANDALONE SEAT" on DrawX, SpecX, AsBuiltX, InspecX, SurvX and PriceX | Each opens a live subscription checkout for a tool that fails (re-checked) | Fix 7 |

**Product pages**

| Page | Claim | Do |
|---|---|---|
| /propx (monolith, src/lib/marketing-pages.js serve_propx) | "Builds commercial bid and quote packages from live catalogue pricing ... with automated markup and margin protection" and "SIGN IN TO START A PROPOSAL" going to /login?redirect=/ (re-checked) | Serve the /propx-app builder at /propx (fix 8) |
| /geox, /compx, /pricex, /weatherx, /forecastx (monolith pages) | "$149-$249/mo standalone ... contact to activate" with a mail link; GeoX's page says $149 while Stripe charges $249 (re-checked); /pricing sells each by card | One price, one way to buy |
| /marketx (monolith page) | Headline "Live U.S. construction spending ... from FRED ... refreshed on every load" over a retired product; internal table names; "0 rows in production" | Replace with one line: not available yet |
| /pricex (monolith page) | "Live Producer Price Index data ... from FRED - refreshed on every load"; every card "undefined" (re-checked) | Take down until rebuilt |
| /drawx, /safetyx, /lienx and siblings (monolith pages) | "or as part of TakeoffX Pro" (re-checked on /drawx), "SubX Pro", "PropX Pro": plans that do not exist | Remove |
| /bidx (monolith page) | "Works with or without a SubX submittal behind it"; "signature-ready" | Fix 8 |
| /permitx, /closex, /coa (monolith pages) | "Assembles the application package"; "closeout package"; CoA's 8 boxes ticked by default | "Cover sheet", "checklist"; start CoA unticked (fix 23) |
| /cutsheetx (weyland-cutsheetx-worker) | "Trial session active - full real access, no signup required"; "weyland_db", "catalogue_pages", "E2E pipeline verification" shown to customers | Remove |
| /takeoffx and /subx-app (weyland-subx-worker) | "A value it could not read with certainty is marked for you to check ... never guessed" | True for sizes only; flag every field (fix 9) or narrow the claim |
| MeetingX room (meetingx.html in the MeetingX worker, line 81) | "CAPITAL MEETING BRIEF ... $10M TARGET SEED ROUND", "Ask about ... the raise" | Remove from customer rooms (fix 15) |
| /sightx/ (weyland-sightx-worker/src/pages/sightx.html) | "99% MATCH" and "98% MATCH" on hand-made geometry; "Move down the run past the fourth opening (Z > 15)"; "docs/PDF_TO_TWIN_RULES.md" | Remove |
| /news (weyland-platform-worker) | "audited" beside "not third-party audited"; "WEYLANDAI REPORTS" engineering notes | Remove both |

## 6. Fixes, ranked by how much they change a $100 buyer's decision

Impact words:

- **Decisive:** a buyer pays or walks away on it.
- **High:** it changes trust or time to value a lot.
- **Medium** and **Low** as they say.

"Re-checked" refers to the numbered rows in section 1. The code paths are in /Users/johnmobley/weylandai.com.

1. **SubX reads the schedule where it really sits, and finds the page itself.**
   - Find each ruled table by its own extent, not as "a run of lines longer than 15% of the sheet width".
   - Never merge the sheet's border into the table, and allow several tables a sheet.
   - Use the PDF's own vector lines and text layer, or detect above 150 dpi, so thin CAD lines survive.
   - Pick pages by searching the text layer for DOOR SCHEDULE, HARDWARE GROUP and HARDWARE SET, instead of reading page 1.
   - Acceptance: Rockford p.29 (65 rows) and Berryessa pp.284, 286 and 288 (24 openings). This also fixes TakeoffX.
   - Impact: **Decisive.**
   - Owner:
     - weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs: findTableBoundsDoor (line 309), DETECT_DPI = 150 (lines 549 and 971);
     - the server runs it through src/lib/browser-grid-extraction.js from src/lib/hardware-extraction-pipeline.js (the 422 is raised at line 549);
     - page choice in src/pages/subx-app.html.
   - Re-checked: reproduced (row 1).
2. **Read hardware lines the way specs print them.**
   - The printed format is QTY, EA, DESCRIPTION, CATALOG NUMBER, FINISH, MFR. Take the catalogue number as the model and the trailing maker code (SEL, SCH, LCN, IVE, VON, ZER, GLY, NGP, PEM, HAG, SAR, COR) as the maker.
   - Skip header, door-list and wrapped lines instead of scoring them as misses.
   - Never split at a comma inside a description, and never match finish codes (613, 626, 630, 652, 689, 695) as products.
   - Acceptance: Rockford's 33 item lines, pasted as printed, reach the 13 right matches without retyping.
   - Impact: **Decisive.** It is the first result a visitor sees, right above the $100 button.
   - Owner: weyland-cutsheetx-worker/src/lib/cut-sheet-misses.js, parseSpecText (line 82), used by src/routes/cut-sheet-match.js (POST /api/cut-sheets/match-batch).
   - Re-checked: reproduced (row 5).
3. **Read the hardware groups in the spec section.**
   - From the PDF text layer, read "Hardware Group No. 06 CL", its door list and its item lines (no ruled table needed), and link each group to its doors.
   - Acceptance: Rockford 087100 pp.18-23 (13 groups) and Berryessa p.282.
   - Impact: **Decisive.** This is the hardware half of every packet.
   - Owner: weyland-subx-worker/src/lib/hardware-extraction-pipeline.js (the hardware_schedule branch) and src/routes/hardware-schedule-page-extract.js.
   - Re-checked: reproduced (row 2).
4. **Put real cut sheets in the packet.**
   - Match the items read; 0 of 23 matched tonight.
   - Attach only the cited product page or pages, never a whole price book.
   - Read the text layer instead of OCR (Christina's watermark made the noise).
   - Cover the school basics: Schlage ALX, ND and L; Von Duprin 98, 99, 9927 and QEL; Select and Ives hinges; Glynn-Johnson stops; Zero seals and thresholds. Put page images on file for the price books held only as text.
   - List unmatched items inside the packet, and embed the cited pages so nothing depends on links that expire in 7 days.
   - Impact: **Decisive.** It is the deliverable the $100 names.
   - Owner:
     - weyland-subx-worker/src/routes/subx-workspace.js: persistExactCutSheetMatches (line 82);
     - weyland-subx-worker/src/lib/product-database.js: matchProductFromDb (line 284);
     - src/lib/submittal-assembler.js: the cut-sheet loop appends each matched document whole, through mergePdfs;
     - catalogue coverage: weyland-cutsheetx-worker ingestion.
   - Re-checked: reproduced (row 3).
5. **Make the offer one story.**
   - Today:
     - every new account gets 14 days of every product and 999 packets;
     - the packet route's check lets any trial account through (and any guest, for the demo building);
     - the pricing card never mentions the trial, and /pricing says there is none.
   - Choose one:
     - (a) free accounts get paste-and-match only, and the packet needs the $100 credit. This is your 7 October offer.
     - (b) show the trial on the pricing card and say what the $100 adds.
   - Either way, the packet route checks what the buyer is entitled to. The journeys report asks you the same question (Needs John, item 5).
   - Impact: **Decisive.** Today a careful buyer never needs to pay. **Needs your decision.**
   - Owner:
     - weyland-platform-worker/src/lib/entitlements.js (TRIAL_DAYS = 14, newTrialAccount) and src/routes/auth-session.js;
     - weyland-subx-worker/src/lib/auth.js, requireActiveSubscription (lets trial accounts and guests through);
     - weyland-subx-worker/src/routes/subx-workspace.js, POST /submittal-pdf (no first-submittal check);
     - index.html #pricing;
     - weyland-platform-worker/src/lib/marketing-pages.js, serve_pricing.
   - Re-checked: reproduced (row 4).
6. **Never call another maker's product "high · exact".**
   - When a line names a maker the catalogue knows, an exact match must be that maker's. Otherwise show a miss, or a low-confidence alternative labelled as such.
   - The same goes for SubX's copy of the matcher, which feeds the packet.
   - Impact: **Decisive.** A wrong maker in a packet gets it rejected, and it is the first thing an expert notices.
   - Owner:
     - weyland-cutsheetx-worker/src/lib/product-database.js, matchProductFromDb (line 364; the exactAnyMfg fallback, lines 391-418);
     - weyland-subx-worker/src/lib/product-database.js, matchProductFromDb (line 284).
   - Re-checked: reproduced (row 6).
7. **Stop selling seats for tools that fail.**
   - Take DrawX, SpecX, AsBuiltX, InspecX, SurvX and PriceX out of the checkout list and the account's plan list until each passes on the audit documents.
   - Show NOT SOLD YET, as MarketX does.
   - Impact: **High** for the $100 buyer (trust). Decisive for anyone buying a seat: $149-$399 a month is billed today for tools that error.
   - Owner: weyland-platform-worker/src/lib/stripe-billing.js, CHECKOUT_READY_PRODUCTS (line 148), and the cards in src/lib/marketing-pages.js, serve_pricing.
   - Re-checked: reproduced (row 9).
8. **Connect the job: SubX to PropX to BidX.**
   - Add a "Price this schedule" button on a SubX schedule that opens /propx-app with it.
   - Serve the builder at /propx, which today is a dead end.
   - Add labor and markup lines, and alternates.
   - Then BidX imports the priced lines with the bidder's identity, the alternates and the bond in dollars, and can attach the SubX packet.
   - Impact: **High.** Pricing is the estimator's real morning job.
   - Owner:
     - weyland-subx-worker/src/pages/subx-app.html;
     - weyland-propx-worker: a weylandai.com/propx route, which beats the monolith's catch-all, plus the new lines;
     - BidX lives in the monolith (src/routes/document-generators.js /api/bid-packages; src/lib/marketing-pages.js serve_bidx), so it moves first (section 7).
   - Re-checked: "build PropX" not reproduced, because the builder exists (row 7). Reproduced: /propx is a dead end, and nothing on the homepage, the account card or SubX links to the builder.
9. **Let the buyer correct a row, and flag every unsure field.**
   - Allow editing mark, group, size, rating, type and items before the packet is built.
   - Flag unsure marks, groups, ratings and types. Today only sizes are flagged, so "1423", "tale)" and "2U MIN." go into the packet as fact.
   - Read the text layer before OCR.
   - Impact: **High.**
   - Owner: weyland-subx-worker/src/pages/subx-app.html (the review table), plus an update route beside src/routes/subx-workspace.js; the OCR path in assets/client-ocr-src/schedule-grid-extraction-client.mjs.
   - Re-checked: no; estimator audit.
10. **Open on the readable page, with the upload on it.**
    - On desktop, show the page at first paint; the corridor becomes a "walk it" button.
    - Put "Upload your schedule PDF" on the first screen and in the SubX chapter, not only behind Account, OPEN SUBX.
    - Impact: **High.** Desktop visitors get 10-15 s of physics captions before a word about doors, and the upload is what the $100 buys.
    - Owner: index.html (the dossier, the hero, the SubX chapter); weyland-sightx-worker/src/pages/sightx.html (the intro captions).
    - Re-checked: no; all five audits.
11. **Remove or correct every claim in section 5.**
    - Impact: **High.** Each false line a buyer catches costs the true ones.
    - Owner: index.html, weyland-platform-worker/src/lib/marketing-pages.js, and the pages named there.
    - Re-checked: all still live at 9:12 pm; the verdicts are the audits'.
12. **Let a mouse reach the world on the desktop homepage.**
    - Apply the lowered-dossier rule (body pointer-events none, its children auto) to every pointer, not only touch.
    - Forward W, A, S, D and F to the frame.
    - Carry a walked schedule into /sightx/.
    - Impact: **High.** The first thing a desktop visitor sees does not respond.
    - Owner: index.html: the CSS rule inside @media (hover: none) and (pointer: coarse), and the WALK handler.
    - Re-checked: reproduced (row 12).
13. **Build SightX's openings from the door schedule.**
    - One opening per door row, with pairs as pairs, labelled with its number and hardware set; the set's items on scan or tap.
    - Lift the 12-opening cap.
    - Draw WALK as disabled when it is, and take a whole schedule rather than 60 lines.
    - Impact: **High.** It is the "walk the building you are bidding" promise, and decisive for a field buyer.
    - Owner:
      - index.html: hsMatched.slice(0, 12) in the WALK handler, and the paste box;
      - weyland-sightx-worker/src/pages/sightx.html: u_openings[12] (line 1543);
      - weyland-cutsheetx-worker/src/routes/cut-sheet-match.js: the line cap.
    - Re-checked: reproduced (row 11).
14. **Put the real HuntX on the homepage.**
    - Read the whole index (978 rows, 4 sources) with paging, and hide closed rows by default.
    - Fix the CA filter ("CA_OPSC"), and add a trade filter (door, school).
    - Compute the tiles from the rows, show the real ingest time, and link each TxDOT row to its own proposal.
    - Remove the alerts, export and logins from the $799 card until they exist.
    - Impact: **High.** Ten screens of road work stand between the hero and the $100; decisive for a buyer looking for work.
    - Owner:
      - index.html: huntApiRow (line 3280), loadHuntOpportunities (line 3292), filterHuntRows (line 3323), the tile at line 2165;
      - weyland-huntx-worker: paging, a closed flag, per-row links in its ingest.
    - Re-checked: reproduced (row 13).
15. **Take the investor brief out of customer meeting rooms, and say what MeetingX is.**
    - Remove "CAPITAL MEETING BRIEF ... $10M TARGET SEED ROUND" and "Ask about ... the raise", and point Ask Weyland at the project.
    - Keep people in the room when they open SightX, and share actions and history.
    - Sell it as room chat until voice and walking together exist.
    - Impact: **High.** An owner's rep who invites a GC shows them our fundraising.
    - Owner: weyland-meetingx-worker/src/pages/meetingx.html (line 81).
    - Re-checked: the brief is in the source tonight; field and promises audits.
16. **Make the document readers survive real files.**
    - Read the PDF's text layer first, and OCR only pages that have none.
    - Render drawing sheets at a capped size and convert the image in place: bgraToRgbaInPlace exists (line 148), but renderAndExtractText (line 250) and /diff-pages (line 211) still make a full copy.
    - Render AsBuiltX's two pages one after the other.
    - Split long files into page jobs on a D1 job lease.
    - Fix the turn step that flips upright pages, and show flagged lines on screen with page numbers.
    - Impact: **High** for GC and field buyers (DrawX, SpecX, AsBuiltX, InspecX, SafetyX and SurvX fail on real files); low for the $100 subcontractor.
    - Owner:
      - ocr-worker/index.js (weyland-ocr-worker). It deploys on its own, so this part can ship before the move;
      - the analyze routes in src/routes/document-generators.js (monolith; section 7).
    - Re-checked: reproduced (row 8).
17. **Make the seller checkable.**
    - Put Argo LLC in Stripe's public details and card statement; today they say John Mobley and MOBLEYSOFT.
    - Give Argo LLC's state, mailing address and phone on the footer, the Terms and the checkout, and add governing law to the Terms.
    - Impact: **High.** A careful buyer cannot look up the seller.
    - Owner: the Stripe dashboard (yours); weyland-cutsheetx-worker/src/routes/legal-pages.js (Terms and Privacy); the index.html footer and checkout step.
    - Re-checked: no; journeys report (Stripe read at 8:40 pm) and the shop-owner audit.
18. **Tell project managers, supers and shop owners these tools exist, once they work.**
    - A launcher in the account card (today one button, OPEN SUBX).
    - The 20 addresses in the shell's overlay list.
    - A path for GCs on the homepage.
    - The $100 card says which products "every product" covers, and whether they survive day 30.
    - Impact: **Medium** for the $100 subcontractor; decisive for a GC buyer, who cannot find any of the 12 tools.
    - Owner: assets/weyland-shell.js (the APPS table and the account card); index.html.
    - Re-checked: reproduced (row 10).
19. **Move the 20 smaller products off the monolith.**
    - Impact: **Medium** in itself, but no fix to those 20 can ship without it (section 7).
    - Owner: src/routes/document-generators.js, src/lib/marketing-pages.js, src/routes/market-intelligence-proxy.js, and a new worker's wrangler.toml.
    - Re-checked: the routes and pages were read tonight.
20. **Make CompX count right.**
    - Match the vendor exactly.
    - Count bids per CSJ on the server, without the 1,000-item-row cap, and show the date window.
    - Ingest the data first instead of calling data.texas.gov while the visitor waits, and drop "live, not a static report".
    - Impact: **Medium.** Its win rates run up to 4.5 times too high.
    - Owner: weyland-market-intelligence-worker/src/routes/market-intelligence.js: compxVendorSearch (line 122) and the 7-day cache (line 204).
    - Re-checked: no; shop-owner audit.
21. **Link the Finder, and accept models written as specs write them.**
    - Link /find from the CutsheetX chapter, the header and SubX results.
    - Fall back from "4040XP EDA" to 4040XP and from "99-L-F" to 99.
    - Rank complete devices above part kits, and list the product's own page before contents pages.
    - Impact: **Medium.**
    - Owner: weyland-cutsheetx-worker/src/routes/find.js; index.html.
    - Re-checked: "not linked" reproduced (row 10); the rest from the estimator's audit.
22. **Fix the packet cover and the error messages.**
    - Ask for company, architect, GC and spec section before the first packet; today "PREPARED BY" is the email.
    - Replace "HTTP 422 no_schedule_table_found" and the non-existent "RUN EXTRACTION" button with plain guidance.
    - Fix the demo's "SIZES READ 0 / 10".
    - Impact: **Medium.**
    - Owner: weyland-subx-worker/src/routes/subx-workspace.js (preparedBy falls back to the email) and src/pages/subx-app.html.
    - Re-checked: no; estimator audit.
23. **Fix the project-manager forms that can mislead.**
    - CoA's 8 boxes start unticked, and the letter claims only what is ticked.
    - NotesX takes one attendee a line.
    - Give all the forms one project record and a "from" block, with RFI, change-order and meeting logs.
    - Build CloseX's list from the project's own 01 77 00.
    - Impact: **Medium.** CoA is a real risk to the user.
    - Owner: src/lib/marketing-pages.js (serve_coa line 690, serve_notesx line 946) and src/routes/document-generators.js (monolith; section 7).
    - Re-checked: no; project-manager audit.
24. **Teach the field flaggers field words.**
    - InspecX: leaking, broken, not working, out of service, loose, missing, needs to be replaced, and FIT-style D and X marks.
    - SafetyX: not used, fell, died.
    - SurvX: cracks, damaged, lifted.
    - Re-run the three field-reports documents as a regression set.
    - Impact: **Medium.**
    - Owner: src/routes/document-generators.js: INSPECTION_FAIL_TERMS (line 910), SAFETY_FLAG_TERMS (line 1016), SURVEY_FLAG_TERMS (line 1122). Monolith; section 7.
    - Re-checked: no; field audit.
25. **No third-party call while the visitor waits.**
    - Serve the case-study JSON from weylandai.com instead of mobleysoft.github.io (index.html line 3593).
    - Turn off or self-host the Cloudflare analytics beacon (a zone setting).
    - Ingest CompX, WeatherX and GeoX data ahead of time.
    - Impact: **Medium.** It is your standing rule.
    - Owner: index.html; the Cloudflare zone (yours); weyland-market-intelligence-worker.
    - Re-checked: the GitHub Pages fetch is in tonight's source; the rest from the promises audit.
26. **Smaller tool corrections.**
    - ForecastX bills at month end, holds retainage back and shows it arriving, and states its assumptions.
    - WeatherX takes a street address.
    - GeoX returns the permitting city (or "unincorporated") and the school district, at one price.
    - Impact: **Low.**
    - Owner: weyland-market-intelligence-worker/src/routes/market-intelligence.js; the pages in src/lib/marketing-pages.js (monolith).
    - Re-checked: the GeoX price mismatch, yes; the rest from the audits.
27. **Phone details.**
    - Matcher results as cards that show confidence and citation (today they hide in a sideways scroll).
    - Collapse the 28-31 chip nav on product pages, and widen BidX's scope row.
    - Keep the SIGN IN pill clear of the bottom bar, and make the terms checkbox 44 px.
    - Impact: **Low.**
    - Owner: index.html (#hs-results); src/lib/marketing-pages.js, renderNav (monolith); the checkout step.
    - Re-checked: no; audits.

## 7. The 20 smaller products live in the monolith: what moving them takes

**Where they live today.** LienX, BidX, CoA, RFaX, ChangeOrdX, PermitX, CloseX, NotesX, InspecX, SafetyX, SurvX, SpecX, DrawX, AsBuiltX, MarketX, PriceX, CompX, WeatherX, ForecastX and GeoX are all answered by the repo-root monolith. That is weylandai-com-worker: /Users/johnmobley/weylandai.com/wrangler.toml, main weyland.worker.js, built from src/legacy-monolith.js. It sits on the zone-wide catch-all route weylandai.com/* and must never be deployed, so **no fix to any of these 20 can ship where they are.** The same is true of /propx, the dead-end page in fix 8.

What they consist of:

- **Pages.** 20 functions in src/lib/marketing-pages.js, dispatched by the map at about line 2040, for example serve_bidx (line 480), serve_coa (690), serve_notesx (946), serve_drawx (1528) and serve_marketx to serve_weatherx (2005-2020). Each is a self-contained HTML string. They share renderNav, the 28-31 chip nav.
- **The 14 document tools' API.** 28 routes in src/routes/document-generators.js: 14 generate or analyze routes plus 14 downloads. The file's proposals pair is already shadowed by weyland-propx-worker's /api/proposals/*. legacy-monolith.js registers them at line 133732 and hands them two things the move must replace:
  - the Browser Rendering puppeteer client, vendored inside the monolith. package.json already lists @cloudflare/puppeteer 1.0.4, so the new worker imports the package;
  - generateQuoteHtml, which only the proposals route uses, so it is not needed.
- **What those routes need.**
  - Bindings: DB (weyland_db), UPLOADS (R2 subx-uploads; PDFs are stored under each tool's own prefix, such as drawing-indexes/USER/ID.pdf), BROWSER, and OCR_SERVICE (weyland-ocr-worker) for the six analyze routes.
  - authenticate and requireProductAccess: take them from weyland-subx-worker/src/lib/auth.js, as the monolith's src/lib/auth.js already re-exports them. Free-trial and paid accounts then get the same checks as on the product workers.
- **The six market tools.** Their logic is already in a deployable worker, weyland-market-intelligence-worker, but that worker has no public route. The monolith serves their pages and forwards six API paths to it over a service binding (src/routes/market-intelligence-proxy.js): /api/pricex/materials, /api/marketx/trends, /api/compx/vendors, /api/weatherx/delay-risk, /api/forecastx/project and /api/geox/lookup.

**The move, step by step.** Every step follows the pattern the other product workers already went through.

1. **A new worker for the 14 document tools** (for example weyland-docs-worker):
   - copy document-generators.js without the proposals pair;
   - copy the 14 page functions and renderNav;
   - import @cloudflare/puppeteer and the subx auth module;
   - bind DB, UPLOADS, BROWSER and OCR_SERVICE.
2. **Give weyland-market-intelligence-worker its own routes,** and move the 6 market page functions into it.
3. **Deploy and compare.** Deploy each to its workers.dev address first and compare its answers with the live monolith's, page by page and route by route. This is how cutsheetx was moved on 12 September.
4. **Add the routes.** Each must be more specific than weylandai.com/*, so Cloudflare sends those paths to the new worker and the monolith simply stops being reached for them, without being touched:
   - Pages: weylandai.com/lienx*, /bidx*, /coa*, /rfax*, /changeordx*, /permitx*, /closex*, /notesx*, /inspecx*, /safetyx*, /survx*, /specx*, /drawx*, /asbuiltx*, /marketx*, /pricex*, /compx*, /weatherx*, /forecastx*, /geox*.
   - API: weylandai.com/api/lien-waivers/*, /api/bid-packages/*, /api/coa-packages/*, /api/rfas/*, /api/change-orders/*, /api/permit-packages/*, /api/closeout-packages/*, /api/meeting-notes/*, /api/inspections/*, /api/safety-reports/*, /api/survey-reports/*, /api/spec-sections/*, /api/drawing-index/*, /api/asbuilt-diffs/*, /api/pricex/*, /api/marketx/*, /api/compx/*, /api/weatherx/*, /api/forecastx/*, /api/geox/*.
   - Use wildcards: an exact pattern misses the same path with ?embed=1 (the 7 October lesson).
   - List every route in each wrangler.toml, because a deploy with [[routes]] replaces that worker's whole route list.
   - /coa* also catches any later path that starts with "coa".
5. **/propx.** Add weylandai.com/propx and weylandai.com/propx/* to weyland-propx-worker and serve the builder there.
6. **Old documents keep working.** The new worker reads the same D1 tables and R2 keys, so documents and download links made before the move still open.
7. **No page hops.** Add the 20 addresses to the shell's overlay list (assets/weyland-shell.js, APPS), and give the pages the same ?embed=1 bridge the other product pages carry.
8. **Journeys.** Add one journey per tool, with the audit documents as the acceptance set.

**Size.** About 1,500 lines of route code that already has tests (src/routes/document-generators.test.mjs), 20 page strings, and two wrangler configs. The risky part is PDF rendering through the BROWSER binding with the real puppeteer package; test it on workers.dev first.

**What can ship before the move.** weyland-ocr-worker (ocr-worker/index.js) deploys on its own, and the monolith reaches it over a service binding. So fix 16's text-layer-first reading and render limits would make DrawX, SpecX, AsBuiltX, InspecX, SafetyX and SurvX stop crashing even before they move. Their word lists, forms, prices and wording cannot change until they move.

## 8. What this re-check changed in production, and how to run it again

- **Created and deleted.**
  - One throwaway account, made directly in weyland_db (usersim_ and user-sim-, so no AuthFor identity and no email).
  - Its 4 uploads, its packet, and the rows the reads made.
  - The harness purge deleted 14 rows, 5 R2 objects (4 uploads and the packet) and 4 KV copies.
  - I then deleted by hand the 24 hardware_components rows the Christina read made. The purge misses them because it matches hardware_components by hardware_set_id, while SubX fills set_id. That is a one-line fix in tools/user-simulation/lib/journey-kit.mjs, purgeTestData.
  - Re-count afterwards: no row in any session, set or user column of weyland_db points at this run's sessions, hardware set or account. 83 user-linked columns were checked.
- **Older leftovers, not mine and not touched.** Earlier runs left:
  - 495 hardware_components rows from 73 deleted sets (12 June to 17 September);
  - 57 client_telemetry rows and 5 extraction sessions under older usersim_ ids, most of them from September.

  They are test data a purge could clear once fixed.
- **Left on purpose.**
  - One guest session, which every homepage visit makes.
  - The 13 unmatched lines of the Group 06 paste, added to the shared miss counters as every visitor's paste is.
  - The DrawX, SpecX and AsBuiltX calls failed before storing anything.
- **Not done.** Nothing was paid, no payment form was opened, no email was sent, and no product code was changed.
- **Run it again.** Everything is in plan/evidence/value_audit/recheck/ (on disk, not committed). Run each script from that folder:
  - **recheck_api.mjs:** the guest checks, rows 5, 6 and 13.
  - **recheck_account.mjs:** the throwaway account, rows 1-4 and 8, with its own cleanup.
  - **recheck_browser.mjs:** rows 9 and 12.
  - **verify_*.mjs:** the leftover counts.

  Their JSON results are beside them, with the test pages cut from tools/corpus by pdfseparate. They need node, playwright-core (PLAYWRIGHT_CORE pointing at it) and the Cloudflare login wrangler already uses. Run recheck_account.mjs with an eye on its cleanup: the harness purge still misses hardware_components (above).
