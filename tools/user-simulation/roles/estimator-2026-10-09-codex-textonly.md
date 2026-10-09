# Estimator simulation — 2026-10-09

**Status: browser run blocked; evidence contract incomplete.** This report does not count as a completed desktop/phone usability pass. Report written at 2026-10-09 05:04:37 EDT, from the date command.

Role read first: `/Users/johnmobley/mobley-kernel/roles/estimator.md`. Date-command checkpoints: 2026-10-09 04:59:24 EDT (initial checkpoint), 05:01:46 EDT (browser failures established), 05:01:58 EDT (current landing HTML retrieved), and 05:02:42 EDT (source sheet rendered). Browser configuration: headless Chromium, `--use-angle=metal --ignore-gpu-blocklist`, planned 1440×900 desktop and Playwright's iPhone 13 device. The required Playwright module is imported by [the run script](estimator-2026-10-09.mjs).

Full Chromium aborted with SIGABRT before opening a page. A diagnostic attempt with the installed Chromium headless shell produced the concrete failure `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer…: Permission denied (1100)` and exited with SIGTRAP. See [Chromium log](chromium-launch-2026-10-09.log) and [headless-shell log](headless-shell-launch-2026-10-09.log). The computer-use fallback returned `Browser is not available: iab`; selecting Safari returned `Computer Use was not approved to use Safari`. No approval request was issued and no permission was bypassed.

No page navigation or interaction succeeded, no authenticated/backend project session was created, no schedule was transmitted, no credential was typed, no account was created, and no payment was made. There were zero completed browser steps. All local writes are under `tools/user-simulation/roles/`; no commit was made.

The selected real input is the manifest's **Rockford Board of Education — Bid 26-27 Addendum One (complete)**, `f0e863d88ea688ff.pdf`, SHA-256 `f0e863d88ea688fffdb625132383d48130afb8a50ae4546fd4627281e2648c59`, **PDF ordinal 29 / zero-based index 28 / printed sheet A2.2**. Its title block and door schedule were visually checked in [the source-sheet rendering](shots-2026-10-09/source-rockford-A2.2.png). It includes doors 119.2 and 126.1.1. This is source evidence, not evidence of extraction by WeylandAI.

The observations below use the **current HTTP response**, saved as [landing HTML](landing-live-2026-10-09.html) and [extracted text](landing-live-2026-10-09.txt). They are explicitly text-only observations: visibility, layout, runtime controls, and rendering were not verified. A web-reader result was two months old and showed different copy; it was excluded from the findings.

## 1. First-screen test

**Desktop, 1440×900: not measured.** I never saw a rendered first screen, so there is no honest ten-second impression. In the retrieved landing document's `#hero h1`, the words are “Match every spec line to the real catalog page. With the citation to prove it.” The description says CutsheetX reads a door or hardware spec and links the match to its source document. My text-only expectation is catalog matching with citations; I cannot confirm how quickly the first screen communicates schedule reading or packet creation. The hero action “TRY A REAL MATCH NOW ↓” would be my initial choice from that copy. The hero includes “PRICING”; I cannot say a dollar amount was visible within the desktop viewport.

**Phone, iPhone 13: not measured separately.** The emulator never loaded the page. I cannot assert which heading, price, upload control, or action was visible within ten seconds, or whether a keyboard or overlay obscured it.

**Price found later in the document, not a first-screen finding:** the `#pricing` heading says “Your first submittal: $100, with every product for 30 days.” Its paragraph says pasting and seeing cited matches is free without an account, and payment is for the packet. The later suite card lists $2,000 per seat per month. These are stated prices, not a verified checkout or a phone/desktop first impression.

## 2. Time to first value

**Not reached; elapsed landing-to-value time and per-interaction seconds are unavailable.** No browser landing occurred. The interval from the initial date checkpoint at 04:59:24 to the failure checkpoint at 05:01:46 is 142 seconds of setup/diagnosis, not product time to value. The current HTML was obtained 12 seconds after that checkpoint; no JavaScript ran in that HTTP retrieval.

| Required step | Screen / element / words identified in current HTML | Measured outcome / seconds |
| --- | --- | --- |
| Land on desktop and form an impression | Landing `#hero h1`, catalog-matching heading | Not executed / N/A |
| Supply Rockford A2.2 | Landing `#hs-upload`, “UPLOAD YOUR SCHEDULE PDF”; target `/subx-app` | Input selected locally; control never clicked; no upload / N/A |
| Alternatively paste a schedule | Landing schedule panel, “Or paste your door hardware schedule”; `#hs-run`, “MATCH THE SCHEDULE” | No paste or match request / N/A |
| See my door list and source citations | SubX chapter, “Read a Door Schedule Page into a Door List, Then a Packet.” | No own-schedule result / N/A |
| Walk my schedule | Landing `#hs-walk`, “WALK THIS SCHEDULE IN SIGHTX” | Declared disabled in initial HTML; runtime behavior untested / N/A |
| Build a packet | SubX chapter, “OPEN YOUR WORKSPACE · BUILD THE PDF PACKAGE” | No workspace or packet reached / N/A |

There were no observed moments of hesitation on a live control because no live control was reached. The two schedule entry paths named above cannot be evaluated for clarity, speed, or extraction quality from their source labels alone.

## 3. The walk

**Desktop W and drag: untested. Phone movement: untested. WebGL rendering: unavailable in this run.** The browser failed before creating a page or graphics context, so I cannot distinguish WebGL support from the launch permission failure and cannot call this a SightX failure.

In the retrieved SightX section, the heading promises “SightX — Walk a sample corridor; your matched products hang in it.” The telemetry says “CONTROLS: CLICK TO FLY · ENTER RAISES THE DOSSIER”; the hint says “W/A/S/D MOVE · MOUSE LOOK · F SCAN.” The button says “LOWER THE DOSSIER AND LOOK AROUND →”. I did not press W, drag, scan, lower the page, or test touch movement. Nothing can be claimed about whether the scene moved. The text explicitly says placement on the actual floor plan is not built yet; that is a stated limitation, not an observed rendering defect.

## 4. The packet

**No, I did not reach anything I could hand to the GC.** No PDF was generated or downloaded; its contents, completeness, catalog attachments, and citation accuracy are unknown.

The `#pricing` first-submittal description promises a packet with door and hardware lists traced to page and row and cited documents for covered catalog items. The CutsheetX chapter states that Sargent, Corbin Russwin, Pemko, dormakaba, and Hager are not covered yet; the SubX chapter states that scanned full-size schedule sheets do not read yet. Those statements are useful boundaries, but neither coverage nor extraction was tested here. I would not sign an assertion that this run checked the Rockford door count, revised openings, dimensions, hardware groups, source citations, or packet accuracy. No generated packet exists in this evidence set.

## 5. Trust

From the current document's team card, I would infer a software company cofounded with a working door contractor: it names Ron Helms as CEO / lead software developer, John Mobley as CTO / chief architect, and Andrew Miller under business development / Precision Auto Doors. The footer states “WeylandAI is operated by Argo LLC.” This records who the site says is behind it; it is not independent company verification.

As an estimator, the $100 packet offer would be worth paying for if I could first check my own schedule against a cited door list, resolve flagged dimensions and hardware gaps, and inspect a packet suitable for the GC. The cause of that requirement is the pricing copy's promise of page/row traceability and the catalog chapter's stated coverage limits. What stopped this run was the browser launch/access failure; there is no evidence that payment, sign-in, or the product blocked my actual schedule. I did not test any of those flows.

## 6. Ten words or labels an estimator would not use or immediately understand

These are exact labels in the retrieved current landing document, with their intended screen/element. They are text-only language findings, not observed on-screen confusion.

| # | Exact word or label | Screen / element in the retrieved document | Estimator reading |
| --- | --- | --- | --- |
| 1 | HuntX | Navigation product link and public-bid section badge | A brand name requiring translation into bid discovery. |
| 2 | CutsheetX | Hero kicker and catalog section badge | A brand name requiring translation into hardware catalog matching. |
| 3 | SubConP Core Suite | Pricing suite-card heading | I would not know the abbreviation before reading its description. |
| 4 | 3D Twin | Lifecycle link “06 SightX: 3D Twin” | Does not say whether this is my building or a sample corridor. |
| 5 | CLICK TO FLY | SightX telemetry control label | Does not describe ordinary jobsite movement in estimator language. |
| 6 | DOSSIER | SightX telemetry “ENTER RAISES THE DOSSIER” | I would call this the page or project information. |
| 7 | Project Spine | About-section heading | A metaphor for shared project data. |
| 8 | Operating Engines | Same About-section heading | I would call these tools. |
| 9 | Enterprise Sovereign | Pricing private-deployment card heading | Does not identify what I would receive without its description. |
| 10 | Spatial Twin OS | Footer descriptor | Combines unfamiliar platform language with a 3D promise. |

## 7. One sentence

Promising prototype on the retrieved copy alone, because it describes cited schedule reading and a submittal packet, but the browser failure prevented me from verifying either.

This is a provisional impression of the copy, not a completed product classification. The required rendered desktop/phone impressions, browser screenshots, timed own-schedule result, movement tests, and packet inspection remain unverified. [The screenshot-folder note](shots-2026-10-09/README.md) explains why only a source-sheet rendering is present. The Mac session will need a browser-capable execution context to perform the actual role run.
