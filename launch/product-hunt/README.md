# WeylandAI — Product Hunt launch kit

Drafted 2026-10-04 from what is actually live on weylandai.com. Every claim below is one the site itself makes and that was verified live this session; do not add numbers that are not on the page. Leads with the wedge (CutsheetX); the suite is the follow-on.

## Name
WeylandAI

## Makers
Ron Helms (CEO, Lead Software Developer), John Mobley (CTO, Chief Architect), Andrew Miller (Business Development; Precision Auto Doors)

All three are to be added as Makers on the Product Hunt listing (the PH account owner does this in the listing editor; it cannot be done from this repo). The same three names and titles already appear on the homepage team row, in the homepage's schema.org Organization markup (founder entries), in the case-study scaffold, and here.

## Consent
Andrew Miller consented to being named as cofounder and first real user of WeylandAI (Precision Auto Doors) on weylandai.com, in this listing, and in the case study. Consent was given by phone on 2026-10-04 and confirmed by John Mobley in writing the same day. Ron Helms and John Mobley are named as themselves in their own company.

## Tagline (max 60 chars)
Match every spec line to the catalog page, with the citation
(59 chars)

Alternates:
- Cited catalog matches for door and hardware specs, no login (59)
- The subcontractor suite that opens inside a 3D field twin (57)

## Description (max 260 chars)
CutsheetX reads a door or hardware spec, finds the manufacturer's catalog variant, and hands you the match with a link to the source page. Try it with no account. Then the same project record flows through bids, takeoffs, submittals, proposals, meetings and a 3D twin.
(258 chars)

## Topics
Construction, Developer Tools, Artificial Intelligence, Productivity, SaaS

## Links
- Website: https://weylandai.com
- Try the match: https://weylandai.com/#cutsheetx
- Pricing: https://weylandai.com/#pricing
- Privacy: https://consenta.cc/policy/weylandai.com/privacy
- Terms: https://consenta.cc/policy/weylandai.com/terms

## Lead media (video)
media/weylandai_run_2026-10-04.mp4 — 69 s, 1280×720, recorded against production on 2026-10-04 after the SightX jobsite retheme: prologue, the corridor twin with the dossier in hand, raise, a six-line schedule matched live (6 of 6) and walked into the corridor walls, a real CutsheetX match (LCN 4040XP) with its citation, a real PropX proposal for Precision Auto Doors, pricing. Recorded headless (software GL), so the 3D frames are choppier than a real GPU; re-record on a Mac with screen capture before launch if time allows (script: scratchpad record_run2.mjs; same flow). Trim to the best 30-45 s for the PH lead slot if the full take feels long.

## Gallery (1270×760, captured live — see ./gallery/)
1. `05_cutsheetx_live_match.png` — lead image: CutsheetX live catalog match with source citations.
2. `02_dossier_in_hand.png` — the site as a dossier in the player's hand inside SightX, with the [tap / enter] callout.
3. `01_prologue.png` — the chrono-telemetry prologue (Simulocaniaty stage).
4. `03_dossier_raised_hero.png` — the dossier raised: the homepage.
5. `04_huntx_live.png` — HuntX pulling real public opportunities.
6. `06_pricing.png` — pricing: full synthesis at $49/mo, a la carte engines.
Alternate: `01b_prologue_precondensate.png`. Thumbnail source: `00_thumbnail_square_source.png` (crop to 240×240).

## First (maker) comment — draft for John to edit in his own voice
Hi Product Hunt — John here, founder of WeylandAI.

Start with the one thing: CutsheetX. Paste a door or hardware spec line, or paste a whole door hardware schedule, and it matches every line to the manufacturer's catalog variant with a citation that opens the real price book at the page. Misses are recorded (manufacturer and model only) and shown publicly as coverage, so you can see the catalog grow and request what's missing. No sign-up. It is on the homepage right now and it hits the real backend; when it fails you see the real error, not a canned success.

The rest of the suite picks up the same project record from there: HuntX (public bids), TakeOffX (machine-vision takeoffs), SubX (submittal extraction), PropX (margin-protected proposals, with a real PDF), MeetingX (the room), and SightX (a real-time 3D field twin).

A few deliberate choices:
- No sign-up wall. The site mints an ephemeral session through our own auth subsidiary, authfor.com. Upgrade when you want to keep your work.
- Built with a door company, by a door company. My cofounder Andrew Miller runs Precision Auto Doors, the suite's first real user; the door and hardware workflows on the page are the ones that trade actually lives in.
- The site is an artifact in SightX's world: a commercial building whose doors carry the same real hardware CutsheetX cites. It opens in first person with a dossier in your hand; raise it and it is the website; paste a schedule and walk it door by door. The 8-second opening illustrates a cosmology hypothesis I am developing, labeled as a hypothesis next to the parts that are observed.

Privacy and terms live on consenta.cc, our consent and compliance venture, with a real data-rights request path.

Ask me anything — about takeoffs, about the twin, or about why a folder.

## Launch-day checklist
- [ ] Hunter/maker accounts confirmed; launch at 12:01 AM PT.
- [ ] Gallery images uploaded in the order above, thumbnail cropped.
- [ ] First comment posted within 2 minutes of going live.
- [x] Andrew Miller OK'd being named (by phone, 2026-10-04) and is a cofounder; add him as a Maker on the listing.
- [ ] /#pricing and Stripe checkout tested the day before.
- [ ] Ephemeral demo rate limits confirmed (10/min per IP on /api/auth/ephemeral); the PropX and CutsheetX demos share that budget.
- [ ] Someone watching the platform, MeetingX and SightX worker logs for the first 2 hours.
- [ ] Deploy path 2 (GitHub Actions) has its two secrets set, in case a fix is needed from a phone.
