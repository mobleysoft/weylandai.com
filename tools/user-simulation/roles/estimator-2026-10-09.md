# Estimator role run, 2026-10-09 (third run, full browser)

Written Fri Oct 9 05:34:38 EDT 2026, from the date command. Browser run started 05:19:11 EDT and ended 05:33:24 EDT.
Role read first: /Users/johnmobley/mobley-kernel/roles/estimator.md. Prior text-only attempt:
estimator-2026-10-09-codex-textonly.md (read for its word list, not copied).

Setup: headless Chromium from playwright-core, launched with --use-angle=metal --ignore-gpu-blocklist, driven by
estimator-2026-10-09-run3.mjs (one process per pass, commands fed through run3-send.sh). Desktop pass 1440x900, phone
pass Playwright's iPhone 13 device (390x664 viewport, 3x). WebGL rendered on both: "WebGL 2.0 (OpenGL ES 3.0 Chromium)",
renderer "ANGLE (Apple, ANGLE Metal Renderer: Apple M4)". Step logs with seconds: estimator-2026-10-09-steps-desktop.log
and estimator-2026-10-09-steps-phone.log. Screenshots: shots-2026-10-09/ (d-* desktop, p-* phone, 52 files).
Browser steps used: 26 desktop + 7 phone = 33 of the 40 allowed. One backend session (the trial account below).

Real schedule used: Rockford Board of Education, Bid 26-27 Addendum One, sheet A2.2 (PDF ordinal 29 of
tools/corpus/door-schedules/f0e863d88ea688ff.pdf), saved here as rockford-A2.2-p29.pdf (1 page).

Rules kept: no commit; no payment; no password typed. The upload path needs an account, so I used the allowed alias
jmobleyworks+estimator1@gmail.com with the site's "EMAIL ME A SIGN-IN CODE" path and typed the one-time code the site
emailed to that alias (the "Create a free account" form demands a password, which I refused; see section 2). The account
exists now as a 14-day trial with one uploaded schedule.

## 1. First-screen test (ten seconds)

**Desktop 1440x900** (d-01-landing-2s.png, d-02-landing-10s.png). The page is a dark panel sitting inside a lighter
3D corridor that shows around its edges (ceiling tiles at the top, floor tiles at the bottom), with yellow tabs across the
top: "HuntX TakeOffX SubX CutsheetX PropX MeetingX SightX WireX" and a "✕ [close]" at the right.

- What I believed it does: matches a hardware spec line to a catalog page. The words: kicker "CUTSHEETX · CATALOG
  MATCHING WITH CITATIONS · ONE TOOL OF THE WEYLANDAI SUITE", headline "Match every spec line to the real catalog page.
  With the citation to prove it.", and the sample card "Spec line LCN 4040XP / Matched LCN 4040XP Extra Heavy Duty Door
  Closer / Confidence high · exact / Citation LCN Price Book, 152 pages". Nothing in the first screen says it reads a
  door schedule or makes a submittal; that is in the paragraph's second half ("door counts from the schedule,
  submittals") which I had to read to the end to find.
- What I thought it costs: no idea. The only price signal is the button "PRICING". No number on the first screen.
- What I would click: "TRY A REAL MATCH NOW ↓" (yellow, first button). The thing I actually wanted, "UPLOAD YOUR SCHEDULE
  PDF", is at y=807 with its top edge peeking above the black bottom bar ("Why WeylandAI Pricing News Sign in") at
  y=820, so the label reads as a half-hidden blue sliver until you scroll (d-02-landing-10s.png, bottom centre).

**Phone, iPhone 13** (p-01-landing-2s.png, p-02-landing-10s.png).

- What I believed it does: same catalog-matching claim. The screen holds only the kicker, the headline "Match every spec
  line to the real catalog page. With the citation to prove it." and the first six lines of the paragraph; the top tabs
  show only "HuntX TakeOffX" (the third, "SubX", is cut off at the right edge, then "✕ [close]").
- What I thought it costs: nothing visible; the bottom bar has "Pricing" as a small link.
- What I would click: nothing. There is no button in the first phone screen; the first button ("TRY A REAL MATCH NOW ↓")
  appears only after a scroll (p-03-scroll-1.png). I would scroll, or tap "Sign in" in the bottom bar.

## 2. Time to first value (desktop, from landing to my own schedule read with citations)

Clock started on the landing (step S2 in the desktop log). Seconds are from that log and include my own deciding time.

| Elapsed | Screen / element / words | What happened |
| --- | --- | --- |
| 0 s | Landing | Clock starts. |
| 1 s | Scrolled 450 px to the schedule box (d-03-scrolled-to-schedule-box.png) | Box "OR PASTE YOUR DOOR HARDWARE SCHEDULE", textarea "One spec per line, e.g. LCN 4040XP", buttons "MATCH THE SCHEDULE", "WALK THIS SCHEDULE IN SIGHTX", and top right "UPLOAD YOUR SCHEDULE PDF". |
| 11 s | Clicked "UPLOAD YOUR SCHEDULE PDF" | A full-screen overlay "SubX · Schedule in, submittal package out" opened with the gate "Sign in to work on your own schedules ... SIGN IN" (d-04-after-upload-click.png). Hesitation: the hero said "Try it below with no account" and this says sign in. |
| 34 s | Clicked "SIGN IN" | Form "Sign in to WeylandAI": EMAIL, PASSWORD, "SIGN IN", "OR", "EMAIL ME A SIGN-IN CODE", "New here? Create a free account" (d-05-signin-flow.png). Hesitation: which of three paths to take with no account. |
| 58 s | Clicked "Create a free account" | Modal "Keep going as yourself." with "Name (optional)", "Email", "Password (8 or more characters)", "CREATE FREE ACCOUNT" (d-06-create-account-form.png). Blocked by my rule against typing a password; closed it at 90 s. The SubX overlay had also closed under the modal, so I had to click the upload button again. |
| 121 s to 125 s | "UPLOAD YOUR SCHEDULE PDF" again, "SIGN IN", typed the alias in EMAIL, clicked "EMAIL ME A SIGN-IN CODE" | Form changed to "SIGN-IN CODE FROM THE EMAIL" and "We emailed a sign-in code to ... It works for 15 minutes." (d-07-after-email-code-request.png). The email arrived within one second (Gmail timestamp 09:22:00Z vs request 09:21:59Z), subject "WeylandAI sign-in code: 5206 0499". |
| 157 s | Typed the code, clicked "SIGN IN WITH THE CODE" | Screen "No WeylandAI account on this email yet ... START MY FREE 14-DAY TRIAL / Use a different email" (d-08-after-code-signin.png). Hesitation: I asked for a sign-in code and got a trial offer; nothing says whether a card is needed. It was not. |
| 178 s | Clicked "START MY FREE 14-DAY TRIAL" | Workspace: "Upload a schedule", PROJECT NAME, a select "IF NO SCHEDULE PAGE IS FOUND BY TEXT, READ PAGE 1 AS Door schedule / Hardware schedule (hardware sets)", PDF FILE "Choose File", "UPLOAD AND READ", and below it a demo row "The WeylandAI Building DEMO ... 10 doors" (d-09-after-trial-click.png). |
| 198 s | Typed a project name, chose rockford-A2.2-p29.pdf, clicked "UPLOAD AND READ" | Status lines "Uploaded rockford-A2.2-p29.pdf (1 page). Reading page 1 now." then "Found by text: a door schedule on page 1 (65 rows)." The read result was on screen by 278 s; my script waited the full 80 s because the line "Reading page 1 now." never cleared, so I cannot say the exact second it finished (d-10-after-upload-read.png, d-11-after-upload-read-full.png). |
| 278 s | Result | "Page 1: 65 doors read (read from the page's text)." Tiles "65 DOORS · 65 / 65 SIZES READ · 1 FIRE-RATED DOORS · 14 HARDWARE GROUPS", breakdowns BY DOOR TYPE / BY SIZE / BY FIRE RATING / BY HARDWARE GROUP / BY FRAME MATERIAL, and a 65-row table with a "Source" column reading "p.1 row 0" ... "p.1 row 64" (d-12-rockford-door-table.png). This is first value: my sheet, every door, each traced to a row. |

First value: between 198 s and 278 s after landing, about four and a half minutes, of which roughly two and a half
minutes were the account gate (steps at 11 s through 178 s).

Checks on the read (done with a script against the PDF text, not by eye): the CSV the site gave me
(rockford-door-list-2026-10-09.csv, 65 rows) has exactly the 65 door marks on sheet A2.2, none missing, none invented.
Door 114.1 is the one fire-rated row and it is the one the sheet marks "YES ... 90 MIN." Row 126.1.2 is flagged "(empty)"
for its hardware group, and on the sheet that row really is blank. Sizes 3'-0" x 7'-10" for 54 doors match the sheet.

Moments I was unsure what to do next, with the control:

- "WALK THIS SCHEDULE IN SIGHTX" (blue, landing schedule box) looks enabled but is disabled (the DOM says disabled; it
  is drawn in full blue like "UPLOAD YOUR SCHEDULE PDF"). I did not know why it would not do anything.
- "SIGN IN" vs "EMAIL ME A SIGN-IN CODE" vs "Create a free account": three doors, no hint that the code path makes an
  account for you.
- "READ THIS PAGE" next to "READ IT IN THIS BROWSER" in the workspace (d-10-after-upload-read.png): no explanation of
  the difference; the page had already been read, so I did not know whether to press either.
- Status line "Reading page 1 now." stayed on screen after the read finished (d-10-after-upload-read.png, top), so I
  did not know whether to wait.
- The site calls the same thing "hardware groups" (tile "14 HARDWARE GROUPS", select "hardware groups"), "HW group"
  (table column), and "hardware sets" (demo tile "HARDWARE SETS", select "Hardware schedule (hardware sets)"). The
  Rockford sheet's column is "HARDWARE" and the spec calls them "hardware sets".

Phone: I tapped "UPLOAD YOUR SCHEDULE PDF" at 123 s into the phone pass and hit the same gate "Sign in to work on your
own schedules / SIGN IN" (p-05-after-upload-tap.png). I did not repeat the sign-in on the phone.

## 3. The walk (SightX)

The corridor is the same 3D scene that frames the whole page; the page content is a "dossier" that tilts down to reveal it.

**Desktop** (d-15 through d-29). Section text promised "W/A/S/D MOVE · MOUSE LOOK · F SCAN" and "CONTROLS: CLICK TO FLY
· ENTER RAISES THE DOSSIER", with the button "LOWER THE DOSSIER AND LOOK AROUND →" (d-15-sightx-section.png).

- Clicking the corridor beside the panel lowered the dossier: the page tilted down into a slab at the bottom left and
  the corridor appeared with door labels "101 OFFICE LCN 4040XP - SCHLAGE L9080 - IVES 5BB1", "102 CONFERENCE", "103
  ELECTRICAL", ... "100 EXIT PAIR" and a tag "[tap / enter] TO RAISE DOSSIER" (d-18-walk-after-W.png).
- W moved me. With the dossier lowered, holding W for 1.5 s took me up to the brick wall (d-22-low-after-W.png shows the
  wall close up, 86% of pixels changed from the previous frame, which also includes the dossier dropping). In the later
  controlled test with the scene idle (two idle frames 1.5 s apart: 0% changed), W changed 0% (I was already against
  the wall), S changed 10.7% (backed away), A changed 6.7% (sidestep), and a mouse drag of 500 px changed 19% and
  turned the view to show "101 OFFICE", "102 CONFERENCE", "104 STORAGE", "103 ELECTRICAL" (d-29-c-after-drag.png).
  Numbers are from run3-diff.py over whole screenshots.
- "MOUSE LOOK" by locked cursor could not be tested: every click into the corridor raised a page error
  "WrongDocumentError: The root document of this element is not valid for pointer lock" (headless Chromium, logged
  three times). Drag-to-look worked without it.
- The button "LOWER THE DOSSIER AND LOOK AROUND →" misbehaves once the dossier is already down: an invisible full-width
  button (id dossier-tap, aria-label "Raise the dossier", z-index 650) sits over it, so a click on the words RAISES the
  dossier instead (d-20-after-lower-click.png shows the page back up after that click). Pressing Enter also raises it.
- F ("SCAN") was not tried; no step left in the budget for it.

**Phone** (p-06 through p-16). Tapping "LOWER THE DOSSIER AND LOOK AROUND →" lowered the dossier and showed the corridor
with door labels, a "[raise dossier]" tab at the top, and two unlabeled round controls at the bottom: a large grey disc at
the left and a smaller yellow crosshair disc at the right (p-07-dossier-lowered.png).

- How I moved: first by swiping on the scene. A swipe left changed 35% of the frame and a swipe down 64%, and I ended
  up looking at the ceiling (p-09-after-swipe-left.png, p-10-after-swipe-down.png). Swiping turns the view.
- Then with the discs: pushing the left disc up for 1.5 s changed 24% of the frame (p-15-after-left-stick.png) and
  dragging the right disc changed 23% (p-16-after-right-stick.png). The view changed each time, but because I was
  already pointed at the ceiling I cannot say from the pictures whether the left disc walked me forward or just turned
  me. Nothing on the phone screen says what the discs are.
- The page nav above the corridor is not usable while the dossier is down: the "Why WeylandAI / Pricing / News" links
  report themselves as not visible, and the "[close]" tab shrinks to 34x13 px inside the tilted slab.

## 4. The packet

I reached a built package but not a file. In the workspace under "Submittal package (PDF)" I typed "Estimator Test Co" in
"PREPARED BY (YOUR COMPANY, PRINTED ON THE COVER)" and clicked "BUILD THE SUBMITTAL PDF". Four seconds later:

> "Built: 5 pages - cover, contents, door schedule (65 doors, 2 pages), your uploaded schedule (1 page). The doors
> reference hardware groups; the items in each group (and their cut sheets) come from the hardware schedule - upload it
> here as a hardware schedule to add them."

and a yellow box: "Reading, matching and reviewing are free. The submittal package PDF comes with the $100 first
submittal (30 days of every product, no automatic charge) or a plan. GET THIS PACKAGE · $100 FIRST SUBMITTAL / SEE PLANS"
(d-13-after-build-package.png). I did not pay, so I never saw the PDF.

What was in it (by the site's own description): cover, contents, the 65-door schedule traced to page and row, my sheet as
an appendix. What was missing: every piece of hardware. Sheet A2.2 says "SEE SPECIFICATION 08 7100 FOR DOOR HARDWARE
SETS", so the sets live in the spec section, and the site told me to upload that separately. A GC wants the hardware
submittal, not a door list.

The free "DOWNLOAD THE DOOR LIST (CSV)" worked (Rockford_26_27_Add_1_A2_2_doors.csv, saved beside this report). It is
accurate on marks, sizes, fire rating, door type, materials, frame, and notes, but it drops three columns that are on
the sheet and matter for pricing: DOOR PAIR (Yes/No), GLAZING (G1/G2), and ALTERNATE PRICING (Yes/No). The "Thickness"
column is always blank because the sheet has none.

What I would not sign my name to: anything about hardware (there is none), the pair count (6'-0" openings are pairs on
this sheet and the list does not say so), the alternates, and a PDF I have not opened.

## 5. Trust

Who I think is behind it: a small software company tied to one door contractor. The footer says "WeylandAI is operated by
Argo LLC." The page (section "COFOUNDED WITH A WORKING DOOR COMPANY", fetched from the live HTML; not in my screenshots)
names "Ron Helms CEO · Lead Software Developer", "John Mobley CTO · Chief Architect", "Andrew Miller Business Development ·
Precision Auto Doors" and says "Precision Auto Doors is the suite's first real user. Its owner is a cofounder." The
pricing copy says "on the Rockford bid set, 65 of 65 doors from sheet A2.2" (d-30-pricing.png), which is exactly what my
upload produced. That is honest and it checks out, but it is also their own demo sheet, so it proves less than a job of
mine would.

What would make me pay $100: the hardware sets from Section 08 7100 read and matched to cut sheets for this same job, with
a preview of the packet (even watermarked) before the card, so I know what the GC receives. The site says the $100 also
buys "30 days of every product: SubX, TakeOffX, CutsheetX, SightX, PropX, MeetingX and HuntX" and the plan after is
"$2,000 / seat / month"; I did not ask for six other tools and the jump to $2,000 makes me cautious.

What stopped me: the packet had no hardware in it; I could not see the PDF before paying; and the first screen talked
about catalog matching, so I was never sure the submittal was the main product until the workspace.

## 6. Ten words or labels an estimator would not use or would not understand

| # | Word or label | Screen and element |
| --- | --- | --- |
| 1 | "DOSSIER" | SightX telemetry "ENTER RAISES THE DOSSIER", button "LOWER THE DOSSIER AND LOOK AROUND →", corridor tag "[tap / enter] TO RAISE DOSSIER" (d-15, d-18). It is the web page. |
| 2 | "CLICK TO FLY" | SightX telemetry "CONTROLS: CLICK TO FLY" (d-15-sightx-section.png). You walk a corridor; nobody flies on a jobsite. |
| 3 | "F SCAN" | SightX hint pill "W/A/S/D MOVE · MOUSE LOOK · F SCAN" (d-15). Scan what, and for what. |
| 4 | "3D Twin" and "Spatial Twin OS" | Lifecycle strip "06 SightX: 3D Twin" (d-02); footer "Construction Document Automation & Spatial Twin OS" (d-33-footer.png). It is a sample corridor, not my building. |
| 5 | "Project Spine" | About heading "One Project Spine. Seven Operating Engines." (d-31-why-weyland.png). |
| 6 | "Operating Engines" | Same heading. These are tools. |
| 7 | "SubConP Core Suite" | Pricing card heading (d-30/d-32). Unreadable abbreviation. |
| 8 | "Enterprise Sovereign" | Pricing card "PRIVATE DEPLOYMENT / Enterprise Sovereign / Quoted on request; nothing below is built yet." |
| 9 | "OPPORTUNITY INGESTION" | HuntX kicker "PUBLIC BID DISCOVERY & OPPORTUNITY INGESTION" (d-03-scrolled-to-schedule-box.png). Estimators say bid notices. |
| 10 | "READ IT IN THIS BROWSER" | SubX workspace button beside "READ THIS PAGE" (d-10-after-upload-read.png). I cannot tell what either does after the page has already been read. |

Also noted, not in the ten: "hardware groups" / "HW group" / "hardware sets" used interchangeably (section 2), and the
sample card's "high · exact" confidence label, which never says what "exact" adds to "high".

## 7. One sentence

Promising prototype: it read all 65 doors on my Rockford sheet exactly and traced each one to its row in under five
minutes, but the first screen sells catalog matching, the upload is gated behind an account the hero said I would not
need, and the packet it built had no hardware in it, so I could not hand it to a GC.
