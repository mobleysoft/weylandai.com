# Direction for the WeylandAI cloud session

From John's local Claude Code session on his Mac, 2026-10-08, late evening. John has routed all WeylandAI build work through the cloud session (claude.ai/code, session_01SWkoV285M3KcrZj5kvhPRc). The Mac session now directs, supplies credentials and does the steps only a Mac can do. This file is the brief of record between the two; new dated sections are appended, nothing is rewritten.

## John's standing rules (from his memory of record; most are not written in this repo)

- No call to an outside API while a visitor waits. Public data is ingested first into our own store (D1, R2, KV) and served with an `as_of` date.
- No cron triggers. They never fire on this account, and John has asked that deployment stay simple. Background work rides job leases claimed by ordinary requests (the `job-lease.js` pattern in the workers). A "sweep" must ride requests too.
- No third-party CDN or font host; everything self-hosted.
- No page hop, ever. One shell, overlays, payment inside the page. Never a Stripe-hosted page (checkout.stripe.com, the billing portal); embedded sessions use `redirect_on_completion: "never"`.
- End-to-end journeys define "working": `tools/user-simulation`, three passes, with a GPU (`--use-angle=metal` on the Mac; headless software WebGL freezes the SightX backdrop).
- Never deploy the repo-root monolith (`weylandai-com-worker`). A route that still lives there moves to a specific worker first.
- No email to real firms or prospects without John's approval. Test mail goes only to `jmobleyworks+<tag>@gmail.com`.
- No Anthropic API key in WeylandAI; `gofaineat` cascades if a model is needed. No product may depend on the local Qwen bridge at request time.
- Honesty: no claim the live product cannot back. An unbuilt stub is labelled, not sold. A tool stays NOT SOLD YET until it passes the audit documents, with the numbers written down.
- The seller is Argo LLC. The offer: $100 for the first submittal with 30 days of every product; no automatic charge ever; a prompt to choose a plan from day 23; at day 30 paid outputs stop and the account and its work are kept. Free to try, pay for the output (PR #5, merged by John).
- Commit by pathspec in small verified steps. Treat every number you quote as a measurement with a source.

## Where things stand tonight (with sources)

- The first-time-user audits of 7 October are in `docs/weylandai_value_report_20261007.md` (copied from John's plan); the journey proof is in `docs/weylandai_journeys_20261007.md`. The report's 27 fixes, ranked by their effect on a $100 buyer, are still the fix list; many are now done by one session or the other.
- Reading, live: Rockford A2.2 65 of 65 doors at 100% and 103 of 110 items (two page reads failed on browser launches); Berryessa 24 doors (your test); OCC 41 of 42. Node tests on the corpus: Rockford 14 of 14 groups with 110 of 110 items, Berryessa 24 of 24 doors and 16 of 16 items, Christina 21 of 23 items without rules. Expected rows read by eye are in `tools/corpus/expected/`; the measuring script is `tools/accuracy/schedule_read_accuracy.mjs`.
- Your own notes still open on the SubX side: the width text `3'-6" x 7'-10` with the closing inch mark dropped (marks 002 and 003), `door_type` null for `002 [p.286]` and `002 [p.288]`; the Berryessa packet at 8 of 11 cited pages with three honest misses.
- The six document tools run on your deploy of `weyland-docs-worker`; SafetyX is built up. DrawX, SpecX, AsBuiltX, InspecX, SurvX and PriceX stay NOT SOLD YET until each passes the audit documents.
- Credentials (handoff page), done from the Mac on the night of 2026-10-08, values never printed: request 5, MAILGUY_KEY_WEYLAND on mailguyai-com-worker (worker.js accepts it, commit ff5bef3, deployed) and the same key as MAILGUY_API_KEY on weyland-huntx-worker, plus HUNTX_FROM = alerts@weylandai.com (weylandai.com is onboarded to Email Sending); request 3, TURN key weylandai-meetingx (uid bca9c5d96d8cca7029be4cfc246b9007) as TURN_KEY_ID and TURN_KEY_API_TOKEN on weyland-meetingx-worker; request 1, token claude-cloud-weylandai, id e42cff9334917fc67006688f6c0d58e2 (D1 Write; R2, KV, Scripts and Tail Read on the account; Zone Read and Analytics Read on weylandai.com; expires 2026-11-08; verified active), stored as the GitHub Actions secret CLOUDFLARE_READ_TOKEN on mobleysoft/weylandai.com, with the paste into the cloud environment's Network secrets left to John. Request 2 (the fine-grained GitHub token for the Pages mirror) still needs John's click-through.
- The Mac's local builder agents are stopped for good. Their open items are folded into the priorities below.
- Routes: the Mac side claims nothing on `/lienx`, `/bidx`, `/coa`, `/rfax`, `/changeordx`, `/permitx`, `/closex` or `/notesx`; `weyland-forms-worker` is yours.

## Priorities, in order, each with its finish line

1. **The estimator's path on real documents, end to end.** Rockford and Berryessa from upload to a packet: every door row, hardware sets linked to doors, the review table editable with every unsure field flagged (mark, group, rating, type, size), the width and `door_type` bugs fixed, and a page read that never depends on a browser launch when the text layer is there. Finish: `schedule_read_accuracy.mjs` at or above 95% of rows and 95% of fields on all five documents in `tools/corpus/expected/`; the packet cites a page for every item the catalogue holds and lists every miss plainly; `subx-upload-to-submittal` passes 3 of 3.
2. **The Architect and the Prime Contractor** (John's decision of 2026-10-08, `plan/decisions.md` on the Mac). We cannot get a customer's bid sets, so we author our own from one source model and grade against it. Build `tools/bidset/`: a generator for the WeylandAI Building (the building SightX walks and the homepage demonstrates), about 40 to 60 openings: a door schedule sheet at ARCH D with a real title block and the conventions of the public sets (Rockford A2.2 and Berryessa A9.2 in `tools/corpus/door-schedules`), a floor plan with door tags, the 08 71 00 hardware section with groups as printed, in vector-with-text-layer and scanned (rotated) variants, every sheet stamped "SAMPLE PROJECT - NOT A REAL BUILDING"; the truth JSON beside the PDFs, with each item marked held or not-held in our catalogue; and `grade.mjs`, which applies a GC's submittal acceptance checklist to SubX's output through the same requests the page makes. The same model feeds your schedule-driven SightX corridor and the homepage demo paste, so every demo on the site is one properly designed building. Finish: a committed grade report; SightX walks the generated building; the public sets remain the outside check so we never grade only our own homework.
3. **The six tools back on sale, on evidence.** DrawX: a sheet index that finds the real sheet numbers from title blocks on the plan sets. SpecX: CSI sections actually present in the Christina books. AsBuiltX: a diff of two 36 x 24 sheets without a memory failure. InspecX and SurvX: field words (leaking, broken, not working, out of service, fell, cracks, damaged, lifted; FIT D and X marks) with flagged lines shown with their page; before, 0 of 5 and 0 of 14. PriceX: price indexes ingested ahead of time with `as_of`, no live FRED call, no card that prints "undefined". Finish: a pass on the audit documents written into the report per tool, then `CHECKOUT_READY_PRODUCTS` and the card copy flipped for that tool only.
4. **The front's leftovers from the value report** (check what your own merges already cover): readable at first paint on desktop with no space intro; "Upload your schedule PDF" on the first screen and in the SubX chapter; the Finder linked from the homepage and SubX; a launcher for working tools in the account card and the overlay list; the case-study JSON served from weylandai.com instead of a GitHub Pages fetch while the visitor waits; the desktop mouse and keys reaching the lowered SightX world; WALK building openings from the schedule (your #9 may cover it); the HuntX homepage reading every row with working filters (your #6 to #10 may cover it). The homepage `index.html` on the Mac holds another local session's uncommitted edits, so homepage changes go only through commits on `main`; the Pages build publishes them and the Mac session purges the edge cache on request.
5. **Prove.** `node tools/user-simulation/run-journeys.mjs --passes 3` on a GPU machine, then update the journeys report with the table and the ship checklist. The Mac session runs the GPU matrix on request; in the cloud, expect the SightX backdrop to be skipped on software WebGL (fc1b9ef) rather than frozen.
6. **Later, ask first:** AuthFor hardening (separate repo, `authfor.com`: token expiry, PBKDF2, no tokens from query strings; a reset today takes about a minute to take effect because of KV consistency) and the estate-wide goals in John's `plan/fecundant_goals_20261007.md`. Both are outside this repo.

## What the Mac session does for you

Keys and secrets (the handoff page is the request channel), Keychain, GPU journey runs, real-browser checks through Lumen (request 4's LexisNexis comparison, for example), edge-cache purges, deploys that need local credentials, and anything the cloud is blocked from doing. Ask by updating the handoff page or by cross-session message; John relays when a channel is held.

## John's direction, 2026-10-09 01:50 EDT

John, on the Mac session's proposal of a done-for-you submittal intake: "This is a terrible idea. We just need to fix the failing tools! Why/where is anything falling short!?" So, in order: (1) fix every measured shortfall, tool by tool, with no new offers or flows; (2) then speed-run the gates: the Architect-and-GC generator, a fresh first-time estimator audit on Rockford written to docs/, the $100 self-serve switched on only when that audit says they would pay, then a Product Hunt date proposal. Every tool re-listed for sale carries its pass evidence on the audit documents in docs/cloud-status.md (John's rule: on sale only on evidence). John is setting a checkable /goal in the cloud session with five finish lines (readers at 95% on all five documents with no page read failing; the packet citing every held item with Select Hinges in the catalogue; all 23 journeys green over three passes; the six tools passing or honestly unsold; the estimator audit). The estate scoreboard and AuthFor hardening (fecundant goals ranks 1 and 2) go to the local Codex session through Mobley; AuthFor stops before deploying until John writes "deploy authfor hardening: yes" in plan/decisions.md.

The measured shortfalls at that moment, each with its source, are the "Journeys" and "Verified state" sections below plus the open items of docs/weylandai_value_report_20261007.md (desktop opens on the space intro; no upload prompt on the first screen; the Finder, News and the small tools unlinked from the homepage; WALK hangs only 12 product tags; CompX counts 9 to 50 percent of the dataset with win rates up to 4.5x too high; GeoX and WeatherX thin; ForecastX bills on day 1 and never returns retainage; CoA boxes pre-ticked; NotesX splits attendees at commas).

## Journeys, three passes on main after #71, 2026-10-09 06:49 to 07:40Z (Mac GPU, clean checkout of main; written 2026-10-09 03:32 EDT)

tools/user-simulation/run-journeys.mjs --passes 3 from a detached checkout of origin/main (so the cloud's updated journeys ran), SAMPLE_PDF and REAL_TEST_PDF on the OCC sheet, AUTHFOR_JOURNEY_KEY set: 23 journeys, 69 runs, 21 journeys green in every pass, 65 of 69 runs green (reports/matrix-2026-10-09T06-49-26-847Z on the Mac). Green every pass, with the fix-10 expectations now applied: first-result-no-account 29/29, signin, create-free-account, free-trial-first-use, subx-upload-to-submittal 14/14 (was 11/14), takeoffx-takeoff 12/12 (was 11/12), cutsheetx-finder-search, propx-proposal, meetingx-room, huntx-opportunities, account-view-signout, overlay-products, phone-key-journeys 19/19 (was 18/19), deep-link-login, wirex-news, forgot-password, account-plan, code-sign-in, offer-to-payment-form, reset-in-page 14/14, shell-address.

Not green:
1. sightx-corridor 14/15 in all three passes, deterministic: "the pasted schedule builds a corridor of its doors (3 doors, 2 sets)" reads "10 DOORS · 8 SETS". The corridor is built from something other than the three-door paste the journey makes (the demo building, or the account's stored schedule), or the journey's expectation no longer matches what the page shows. One of the two is wrong; the page and the journey must agree on what a pasted schedule produces.
2. pricing-to-checkout 34/35 in pass 3 only (38/38 in passes 1 and 2): "paste result BUILD THE PACKET ($100 offer): the payment form opens inside the page", detail "buy button not found". Intermittent; it reads like a race between the paste result rendering and the journey's click. Worth a wait-for-the-button in the journey or a steadier render.

Reading after the cloud's SubX deploys (07:0xZ, schedule_read_accuracy.mjs from the Mac): Rockford 65/65 doors and 110/110 items in 14/14 groups at 99.5% fields, every page in under a second (the 73 s deaths are gone); Berryessa 24/24 and 16/16. Finish line (1) of the cloud goal is met for reading on all five documents.

## SightX becomes the focus: John's direction, 2026-10-09 03:37 EDT

John: "lets finish sightx post haste" and "making it the focus of our product, everything must show its work in 3d in sightx". Why: the whole product is about one object, the building being bid; SightX is the only place that object exists whole. Showing work there makes correctness visible at a glance (an item hangs on its door with its catalogue page and the schedule row it came from; a miss is a red tag on the door), turns the GC's and architect's review into a five-minute walk with the sub in MeetingX (first-pass approval is the value), and is the demo and the forwardable artifact no spreadsheet tool has. The Architect-and-GC model already produces plan, schedule and spec from one source; SightX renders that same source, so demo, verification corpus and product become one honest building.

Rule: show the work in the building wherever the work is about the building (openings, hardware, prices, compliance, the packet, the review). Documents that are not about openings (lien waivers, RFIs, change orders, minutes, market permits, bid hunting) show their work as cited documents and link to the building where they touch it (an RFI about door 131.1 opens on that door). 3D never outruns the data: reading, matching and the packet stay correct first; SightX is how they are shown and checked, and it is where the estimator audit happens.

Finish SightX now, in this order (ahead of P2 to P6; the gate's finish lines stand):
S1. The pasted or uploaded schedule builds the building: one opening per door row (pairs as pairs), labelled with mark and set, placed by the schedule's location column into a schematic layout (rooms and corridors named from the schedule; honest label "schematic layout from the schedule"); the sample is the WeylandAI Building from the Architect-and-GC model with exact geometry. Finish: sightx-corridor green (the three-door paste gives 3 doors and 2 sets, deterministic); a Rockford paste gives 65 openings in the groups the schedule names; MAX_DOORS raised so a real set fits; no 12-tag cap anywhere.
S2. The door card: click or tap an opening and see the schedule row with its page citation, the hardware set with each item, its catalogue page thumbnail and match confidence, price when PriceX has one, compliance flags, and EDIT; the same data the packet prints. Finish: a journey opens door 131.1 on Rockford and reads its set, one cited page and a price.
S3. Honest misses in the scene: an item with no catalogue page is a red tag on its door that names what is needed; the count of misses is in the HUD. Finish: Rockford shows the GJ 90S miss on its doors and nowhere else.
S4. Input everywhere: desktop mouse and keys reach the world on /sightx/ and on the homepage backdrop; phone joystick and tap; no space intro, no jargon captions (SHADERS, SOVEREIGN, BIG BANG). Finish: the homepage WALK journey moves the camera on desktop and phone; the promises audit finds no jargon.
S5. Review in the building: MeetingX voice, video and chat inside the SightX scene (not a separate page), a stamp per door (approved / approved as noted / revise) that rolls into the submittal transmittal, SHARE WITH YOUR GC opening the same building signed in or as a guest. Finish: two browsers in one building see the same stamp within a second; the transmittal lists the stamps.
S6. Views of one model, no page hops: Walk, Plan (top-down schematic) and Schedule (the table) are three lenses on the same model inside the shell; the packet exports from it; the homepage opens on the building after a paste. Finish: switching lenses keeps the selected door; the packet's rows equal the model's openings.
S1 amendment, John 2026-10-09 04:02 EDT: "every doc set I've seen for this has a building layout to put through SightX, and it's always early in the PDF." The architectural sheets near the front (site plan, floor plans A-1xx, after the cover and index) carry the layout. SightX reads the floor plan from those sheets and ties its door tags to the schedule marks, so the building a customer walks is their building; the schematic from the schedule's location column is the fallback only when no plan sheet is found, and says so. Start from the stage-1 plan reader in tools/plan-extract (verified on three sheets in October; wall stroke pairs over-count). S1's finish line becomes: for Rockford and Berryessa the plan sheets are found by their title blocks, rooms and corridors come from the plan, every door tag on the plan is matched to a schedule mark (unmatched ones reported), and the sightx-corridor journey walks door 131.1 in the room the plan puts it in. The corpus is growing for this: Codex is downloading and triaging a dozen more public bid sets tonight (door schedules, 08 71 00 sections, floor plans, scanned variants) into tools/corpus with manifests, and the Architect-and-GC generator supplies sets with exact plan geometry.

Then P2 to P6 continue, each showing its work in the building where it is about the building.

## Priorities after the gate: John's decision, 2026-10-09 03:27 EDT ("proceed with all of the above")

Finish the gate first (the five finish lines of the cloud /goal). Then, in this order, each with its finish line; the Mac measures after each landing:

P2. From packet to first-pass-approvable submittal. The expensive failure for a sub is "Revise and Resubmit". The packet grows into the submittal an architect approves on the first pass: a hardware schedule document in the format architects expect (set by set, the openings listed, catalog numbers, finishes, makers), a transmittal, and a compliance pass against the spec section (listed manufacturers only; rated hardware on rated openings; closers and panic hardware where the code requires them; keying noted), with every deviation listed plainly. The Architect-and-GC generator is the instrument: it wrote the spec, so its grader scores approved / approved as noted / revise and resubmit on every generated set and on the three public sets. Finish: tools/bidset/grade.mjs reports the resubmit rate (target 0) on the generated sets; the deviations it finds on Rockford, Berryessa and Christina match a by-eye reading; the packet PDF carries the hardware schedule and the transmittal; evidence in docs/cloud-status.md.

P3. One path on the homepage. Drop a bid set, watch it read live (pages found, doors, sets, items, cut sheets, misses, each with its count), get the packet. The 29 products recede to "also included"; the $100 first submittal is the page. Finish: first-result-no-account reaches a first result as a cold visitor within 60 s scripted on desktop and phone; a fresh promises audit finds no claim the product cannot back; the matrix stays green.

P4. The second bid faster than the first. Company profile, preferred makers, the sub's price multipliers, and every job's record kept (schedule, sets, cut sheets, prices, submittal, proposal), so bid two takes minutes and the $2,000 plan sells itself. Finish: a journey that runs a second bid on an account with a profile reaches the packet in under 5 minutes wall clock with no profile data re-entered.

P5. Every merge proves itself. The journeys that need no GPU run in GitHub Actions after each deploy (on push to main, never a cron), with the result written to docs/cloud-status.md or the run summary; the Mac keeps the GPU set (SightX) and the secrets (AUTHFOR_JOURNEY_KEY stays on the Mac; a cloud run reports reset-in-page's key check as missing by design). Finish: the workflow exists on main and the last five merges each carry a green run.

P6. The packet sells the next one. A "Built with WeylandAI" line and a verify link on each packet (opt-out in the account view); the verify page shows the packet's provenance without exposing the customer's data; HuntX alerts find the sub's next bid. Finish: the verify link works from a fresh browser; inbound is counted by the first-party beacon only; the matrix stays green.

Unchanged: no external API while a visitor waits, no crons, no CDN, no page hops, on sale only on evidence, no email to real firms without John, commit by pathspec. The $100k figure is not a session target; the measurable funnel is subs invited, bids run, $100 paid, plans chosen, and the first customers are door subs John, Ron and Andrew invite once the estimator audit says they would pay.

## AuthFor hardened and live; sign-in journeys after it, 2026-10-09 02:37 EDT

AuthFor (every venture's login) was hardened by Codex through Mobley and deployed at 02:20 EDT on John's yes (authfor-gateway-worker 4d706522; fecundant goals rank 2): new access tokens expire after one hour and refresh through POST /api/v1/refresh; passwords are PBKDF2 and rehash at the next sign-in; tokens are accepted only as Authorization: Bearer (single-use reset and invite links excepted); accounts, reset links and revocation marks live in a Durable Object with lazy migration from KV, so a reset or password change takes effect at once. Old tokens without exp keep working until a cutover date John has not set.

Verified live from the Mac at 06:33 to 06:36Z on a throwaway alias account: the WeylandAI-branded reset mail arrived from auth@weylandai.com; POST /api/v1/password/reset-confirm with the emailed token and new_password answered success with email_verified true; the new password signed in; the old password was refused immediately; the used link answered RESET_INVALID on reuse. A reset request for an address with no account answered the same 200 sent:true and mailed a no-account note (no enumeration).

Sign-in family, three passes against production after the deploy (tools/user-simulation/reports/matrix-2026-10-09T06-27-15-828Z): signin 22/22, create-free-account 18/18, free-trial-first-use 12/12, account-view-signout 15/15, deep-link-login 17/17, forgot-password 9/9, code-sign-in 10/10, all three passes; reset-in-page 3/4 in all three passes on one check only, "the issued reset token could not be read back": the journey read the token from AuthFor's KV key reset:user:<id>, and reset links now live in the Durable Object. Test drift, not product. Fix in progress through Codex: a reveal of the issued token in reset-request's answer, only for the journey alias pattern and only with the Worker secret JOURNEY_REVEAL_KEY in header X-Authfor-Journey-Key; the journey then reads reset_token from the answer. That landed at 02:48 EDT (authfor-gateway-worker 4bf375c0; journey commit 34b847e); reset-in-page then passed 14 of 14 in three passes (matrix-2026-10-09T06-39-34-244Z, 2026-10-09 02:41 EDT). The sign-in family after the hardening is therefore 8 of 8 journeys green over three passes. The key is held only on the Mac, so a cloud run of reset-in-page reports that one check as missing-key by design.

For the cloud session: check in a real browser that the shell's SDK refresh timer renews the token before the hour is up; no journey covers the hourly boundary.

## Verified state, 2026-10-08 23:44 EDT (measured from the Mac against production, no product changes)

Reading, through the same requests the SubX page makes, against the expected rows read by eye (tools/accuracy/schedule_report_2026-10-09-03-44_after-cloud-20261008.md; live SubX worker was the cloud's version 8ff50f5e):

| document | what | expected | found | rows | fields | note |
|---|---|---|---|---|---|---|
| Rockford A2.2 | doors | 65 | 65 | 100% | 100% | |
| Rockford 08 71 00 | hardware items | 110 in 14 groups | 49 in 7 groups | 44.5% | 100% of what was read; doors linked 48 of 48 | pages 17 to 23 and 29 each answered HTTP 503 after 73 s with Cloudflare's HTML error page; the seven groups that did read were exact |
| Berryessa A9.2 | doors | 24 | 24 | 100% | 98.6% | three sheets, under a second each |
| Berryessa 08 71 00 | hardware items | 16 in 2 groups | 16 in 2 groups | 100% | 100% | |
| OCC | doors | 42 | 41 | 97.6% | 97.2% | one extra row |
| Christina set 01 | hardware items | 23 | 22 | 95.7% | 97.3% | |

Matching, live at 15:17 EDT (tools/accuracy/audit_lines_2026-10-08.md and report_2026-10-08-19-20.md, committed in 3c39062): the Rockford Group 06 CL as printed, 5 of 6 items matched and every non-item line skipped for the right reason (before: 1 of 14 lines); Ives 8200 and Ives 8302 answered from the Ives price book (before: a Sargent lock and a Zero seal labelled exact); page 18's three groups, 16 of 20 items; the paste harness over 2,250 lines, recall 99.9%, precision 100%, 0 false positives (before 99.15% and 99.95%).

## Journeys, three passes against production, 2026-10-08 23:54 to 2026-10-09 00:45 EDT (Mac GPU, no product changes)

tools/user-simulation/run-journeys.mjs --passes 3: 23 journeys, 69 runs, 18 journeys green in every pass, 54 of 69 runs green. Every failure repeats identically in all three passes, so none of this is flake. Green in every pass: signin 22/22, create-free-account 18/18, free-trial-first-use 12/12, cutsheetx-finder-search, propx-proposal 15/15, meetingx-room 12/12, huntx-opportunities 14/14, pricing-to-checkout 38/38, account-view-signout 15/15, overlay-products 47/47, deep-link-login 17/17, wirex-news 14/14, forgot-password 9/9, account-plan 29/29, code-sign-in 10/10, offer-to-payment-form 42/42, reset-in-page 14/14 (it was 1 of 3 yesterday), shell-address 37/37.

Not green, and why, in two kinds:

Test drift (expectations for a homepage change that was built locally and never shipped; not a product regression):
- first-result-no-account 27/30: "the hero is in view at first load (no lowered dossier)" on desktop, and "UPLOAD YOUR SCHEDULE PDF is on the first screen's paste box and opens SubX" on desktop and phone. These are fix 10's expectations (priority 4), added to the journey on the Mac's working tree only. The patch is saved at docs/patches/fix10-journey-expectations.patch; apply it together with the homepage change.
- sightx-corridor, one of its two failures: "the corridor loads without the space intro (no intro=1 in the SightX frame's address)" is the same fix 10 expectation.

Real, from today's merges (fix these; each is small):
1. subx-upload-to-submittal and takeoffx-takeoff: "every door row is traceable to its source page and row" reads 0 of 42 because each row's source cell now reads "EDIT" (the new row-edit control took the cell where the journey read "p.N row M"), and "the demo building's hardware sets list their products" reads 0 of 8 because the item text has "EDIT" spliced in ("1 exit device · Von Duprin · 98-NL-OP EDIT 1 closer · LCN · 4040XP-EDA EDIT"). The data is there. Keep the per-row page-and-row citation visible as its own text, put the EDIT control outside the text node (its own element with an aria-label), and point the journey at the citation cell.
2. subx-upload-to-submittal: "the SubX chapter's export button opens the workspace in the overlay, signed in": the homepage SubX chapter no longer has any button into the workspace (the journey found no CTA text at all). Other paths work (account card OPEN SUBX, /subx-app). Give the chapter one button into the workspace again, and let the journey follow whatever that button says.
3. phone-key-journeys 18/19: one HuntX control is cut off at a 390 px screen edge: the source chip "All sources (TxDOT, CA OPSC, NYC City …". Wrap or shorten it.
4. sightx-corridor: "Guided Walkthrough Preview generates a walkthrough" finds no such control on the SightX page since the schedule-driven corridor rework. Either the control comes back or the journey changes to what the page now offers; today the journey's claim and the page disagree.

What this says about priority 1: the readers meet the 95% bar on four of five documents. The one failure is not parsing but a production limit: the Rockford hardware-group pages (dense 08 71 00 spec pages, 17 to 23 and 29) die after 73 s on the server while the same pages read in about a second in the Node tests on the text layer. Reproduce with `node tools/accuracy/schedule_read_accuracy.mjs --only rockford` and `wrangler tail weyland-subx-worker`; the page read must take the text-layer path first and never wait on a browser launch or an OCR pass when the text layer exists. The honest misses that remain are catalogue gaps, in this order of value: Select Hinges (every Rockford group has an SL11/SL24 line), Zero 188SBK, the Von Duprin 99 "L" trim naming. OCC's one extra row and Christina's one missing item are small parser cases worth a look after the 503s.

## S0 — the controls work from the user's side (John, 2026-10-09 04:50 EDT; measured 08:17–08:27Z)

John, mid-session: "also last i checked wasd on desktop and the thumbstick nav on sightx did not work" and "its crucial
that sightx plays like a triple a game to support all our other games in the future." S0 goes ahead of S1. A controls
regression blocks shipping any S item. SightX's input and feel are the base every future MobCorp game inherits, so this
is built once, in a shared module, and proven by journeys, not by a page fix.

Measured on the live site with a real headless Chromium (tools/user-simulation/probes/sightx-controls-probe2..5.mjs;
GPU on; iPhone 13 emulation for the phone rows):

| Path | Input | Result |
|---|---|---|
| weylandai.com/sightx/ (app page, desktop) | W held 1.5 s, D 1 s, S 1 s | camera moved 5.46, 0.90, 3.60 units: works, no click needed |
| same | mouse drag of 260 px across the canvas | rotation delta 6.0: works |
| weylandai.com/sightx/ (phone) | one-finger drag across the canvas | rotation delta 6.29: works |
| same | WALK ▲ held 1.5 s | moved 4.64: works, but press-and-hold is banned on phones |
| same | thumbstick | none exists on this page |
| weylandai.com #sightx (homepage, desktop) | W as loaded; W after clicking the HUD badge that reads W/A/S/D MOVE · MOUSE LOOK; after clicking the chapter; after Enter; after Escape | 0 keydown events reached the world frame in every case; the frame never had focus; no postMessage carried a key |
| same | "CLICK TO FLY" | no point in the viewport has the world frame on top (chapter head, HUD and footer cover it), so there is nothing to click |
| weylandai.com (homepage, phone) | first touch, then a drag where the stick sits, then a drag in the centre | the world mounts after the first touch, but #sightx-touch-ui is display:none, .sx-stick is 0 by 0 with pointer-events none, the point is covered by #stage-backdrop; __sxTouchStats stayed at downs 0, moves 0, looks 0 |

Causes, read from the live sources:
1. Two pages, two input systems. The app page (pages/sightx-app.html, 2026-10-08) binds its own forty lines of keys
   plus hold buttons. The real controls module (assets/sightx-controls.js: window and document keydown, pointer lock,
   floating stick, gamepad hooks, SightXControls global) is loaded only by the backdrop page (pages/sightx.html).
2. The homepage world is an aria-hidden, tabIndex -1 iframe under the dossier. The host forwards the schedule and the
   dossier state by postMessage and never forwards input. Keys typed on weylandai.com stop at the top document; touches
   stop at #stage-backdrop and the chapter sections.
3. The app page loads three.js r128 from cdnjs (banned: nothing from a third-party CDN) and places the canvas below the
   hero on both form factors, so the first screen is a brochure, not the world.

Build (shared base, not a page):
- One input layer the host owns, weyland-input: keyboard, mouse look, touch stick, gamepad → one normalized state
  {move: {x, y}, look: {dx, dy}, buttons}. Worlds consume it in-page or by postMessage into a frame. The games inherit it.
- Homepage: when the SightX chapter is open, the stick is drawn in the top document (phones) and keys and the stick axis
  are forwarded to the world frame; the "lowered" dossier path keeps working ([close] lowers, Escape and Enter raise).
- App page: drop its own binding and the hold buttons; use the same layer; stick on phones, WASD plus mouse look plus
  gamepad on desktop; vendor three.js under /assets/vendor (or move the page onto the raymarch engine) so the page makes
  no third-party request; canvas first, text after.
- SightXControls.state() returns {pos, yaw, pitch} read-only so journeys can assert motion without patching three.

Measure (the matrix runs these on the Mac after every merge): four journeys in tools/user-simulation — app page desktop,
app page phone, homepage desktop, homepage phone — each asserting movement ≥ 1 unit on W (or the stick) and a turn
≥ 0.5 rad on look, plus no third-party request on either page. Feel targets, John's triple-A bar: 60 fps on an iPhone
and a MacBook, input to camera within one frame, acceleration and damping on movement, collision with floors and walls.

**S0 measured green, 2026-10-09 17:25Z (seventh measurement, probe 5 at 340bf67).** App page 9 of 9 desktop and
12 of 12 phone; homepage 11 of 11 desktop and 14 of 14 phone; evidence in docs/s0-controls-evidence-2026-10-09-final.json.
The last red check ("no third-party request" on the homepage journeys) was not ours to ship: Cloudflare Web Analytics
was auto-injecting its beacon from static.cloudflareinsights.com into every homepage response that carries a query
string. Those requests miss the exact `weylandai.com/` route and fall to the monolith's `weylandai.com/*` route, whose
response has no `cache-control: no-transform`, so the edge rewrote the HTML; the platform worker's responses carry
`no-transform` and were never touched. Setting the zone's RUM site to auto_install=false was not enough (its injection
ruleset stayed enabled); enabled=false switched it off, verified with `/?ref=producthunt` and `/?journey=x` loads. Rule
kept: nothing from a third-party host, on any path, including the ones launch traffic arrives on.

## Truth at scale for the harvested corpus (John, 2026-10-09 05:15 EDT)

John, on the sentence "a set only tests the product once someone has written the expected rows": "this sounds like a
false bottleneck we created; why? let's be ... someone." He is right. The hand-written expected rows
(tools/corpus/expected: six files, 148 rows, how_checked by eye) are the calibration core, not the gate. A harvested set
tests the product the moment it is downloaded, from three sources of truth we own:

1. The documents check themselves. A bid set is built to be cross-checked by the GC. Oracles the harness scores with no
   label: (a) every schedule mark appears as a door tag on a floor plan; (b) every hardware set named on the schedule
   exists in 08 71 00; (c) each set's own door list ("Doors: 101, 102A") names exactly the schedule's doors carrying
   that set; (d) every door type and frame type exists in the legend; (e) sizes parse and marks follow the sheet's
   pattern. A disagreement is a defect in the reading or in the document; either is worth knowing.
2. We are the someone. Two independent readers over the same page, the production text-layer reader and a second one
   built differently (a read of the rendered row band, or the OCR path), produce rows. Rows they agree on are accepted
   truth; rows they disagree on go to a third look and into the work queue. Authoring rows by hand becomes verifying
   disagreements, done by the sessions, not by John.
3. The Architect-and-GC generator (tools/bidset) produces exact truth for synthetic sets in any rendering variation.

What stays human: the six audited files; random 2% spot checks of agreed rows, to catch two readers wrong the same way;
and every EDIT a real user makes in the product, which is a field label.

Reporting: accuracy per truth tier, never pooled: exact (synthetic), agreed (two readers agree; quote the agreement
rate), oracle-checked (which oracles passed), audited (a person read it). A harvested set's triage class (complete,
pair, schedule-only, spec-only, plan-only; tools/corpus/harvest/triage.json) says which oracles apply to it.

Build (cloud): the second reader; the agreement scorer; the five oracles; a truth record per harvested PDF at
tools/corpus/harvest/truth/<sha16>.json (tier, agreement rate, oracle results, disagreements); the disagreement queue;
run over everything in tools/corpus and the harvest downloads (the Mac pushes those to the private weyland-fixtures R2
bucket under harvest/<sha16>.pdf). Measure: agreement and oracle pass rates per set and per family in the matrix report,
and the queue length falling as the reader improves.

## Matrix after PR 81, on main at 6d92a25: three passes, 08:05 to 09:02Z, 2026-10-09

22 of 23 journeys green in all three passes, including the two fixed in PR 81 (sightx-corridor and the paste
result's buy button). The one failure, identical in all three passes: cutsheetx-finder-search, 18 of 20 checks.
Failing checks, verbatim: "CutsheetX MATCH 'LCN 4040XP' returns the matched cut sheet (overlay)" and "CutsheetX
DOWNLOAD PDF delivers the cut sheet (overlay)" with the detail "no DOWNLOAD PDF control in the MATCH result". The
matched product and OPEN AT THE PAGE both work; the result lost its download control. Evidence:
plan/evidence/matrix/2026-10-09T08-05Z-results.jsonl on the Mac. Note: the run started at 08:05Z, five minutes before
the time given to the cloud; the deploys from PR 81 were live by then (every PR 81 journey is green).

Addendum 09:20Z: after PR 87 restored the DOWNLOAD PDF control, cutsheetx-finder-search ran 3 of 3 green on main
(21 of 21 checks each pass; tools/user-simulation/reports/matrix-2026-10-09T09-17-17-567Z on the Mac). With the
08:05Z run that makes the matrix 23 of 23 green on main.

## Matrix after the Estimator-defect fixes, on main at eceb04f: three passes, 16:55 to 17:40Z, 2026-10-09

28 journeys per pass (the 23 of the morning plus estimator-schedule-to-packet, the four SightX controls journeys and
shell-address). Results: plan/evidence/matrix/2026-10-09T16-55Z-after-eceb04f-results.jsonl.

| pass | journeys green | checks green | red |
|---|---|---|---|
| 1 | 25 of 28 | 515 of 518 | estimator-schedule-to-packet (crashed at launch), sightx-controls-home desktop and phone (the injected analytics beacon) |
| 2 | 27 of 28 | 517 of 518 | estimator-schedule-to-packet (crashed at launch) |
| 3 | 27 of 28 | 523 of 525 | estimator-schedule-to-packet: the disabled walk button showed at opacity .7, and the SubX app's upload button never became visible |

Every red traces to something now fixed or now understood, none to the journeys' own logic:
- The launch crash was a file-path import of playwright-core (the API lands on `default`); fixed in 340bf67 for that
  journey and in b42caec for every tool script.
- The beacon: Cloudflare Web Analytics injection, switched off at the zone (see S0 above); the two home journeys passed
  14 of 14 and 11 of 11 in the seventh S0 measurement.
- The disabled look: the front door carried a second `.button:disabled` rule at opacity .7 after the Estimator-defect
  rule at .5; the duplicate is gone (100073e).
- The SubX app's upload button: the Estimator-defect fix for the app (eceb04f) was on main and not deployed. Workers do
  not deploy on push; the Deploy worker workflow is manual dispatch. The gate is now written down (goal g029) and the
  SightX and SubX workers are being deployed from main; the journey is re-run after.

The bar for the next matrix: 28 of 28 three times on main with every worker deployed from the commit under test.

## State at 14:45 EDT, 2026-10-09 (number two)

- Front door live (6c809d8, fixes 100073e and 7026853): the first screen is the offer; phone fits one viewport; no
  third-party request on any path; first-screen journeys 45 of 45 and 24 of 24. The claim check (Gemini, independent,
  docs/claim-check-2026-10-09.md) found one overclaim, fixed: the offer no longer names PropX and HuntX as sold.
- The sample packet behind SEE A SAMPLE PACKET is SubX's own output (8d60411): 5 pages, 65 doors traced, SAMPLE on
  every page, producer WeylandAI SubX.
- Deploys: Workers never deployed on push (manual workflow). SightX and SubX were deployed from main today; the gate is
  goal g029. On the SubX deploy from 683b84a: subx-upload-to-submittal 14 of 14 three times, estimator-schedule-to-packet
  18 of 18 three times (the Section 08 71 00 prompt appears once the served reader matches the source).
- Scanned sheets (g019): the browser path reads 46 of 48 rows on the scan (0 before today), Node 48 of 48. The review of
  today's landings (Codex, docs/review-2026-10-09-landings.md) rates two findings high: the fallback render has no pixel
  budget (a large page can request gigabytes of canvas), and scan-read rows are presented unqualified (confidences
  overwritten, duplicates totaled). Fixes are goal g034; the first-screen wording is held to the measured product.
- GameGob runs Forge Survivors on the SightX input layer (gamegob.com 3a25015), 40 of 40 harness checks in real Chromium.
- Cloud session resumed at 14:15 with three bounded goals (g028 SightX on three real buildings, g032 PropX and HuntX
  audits, g033 AuthFor deferred mediums); it reports into files and PRs only.
- Correction of record: Rockford's hardware count is 110, not 114; the four extra text-layer lines are struck-through
  addendum deletions on page 22. The reader and the test were right.
