# weylandai.com landing page: current state vs. target

**Status:** Design document. Real audit of what's live today, why it no longer matches the product's actual capability, and the target design. No code changes yet - opened per direct instruction to reflect on live-vs-should-be before building.

## What's actually live right now (verified 2026-09-09, not assumed)

Pulled the real, current homepage response and read it directly:

- **The page's own `<meta name="description">` already claims**: *"See SubX working on a real demo project the moment you land"*. This is currently not true. What actually loads is a fixed HTML snippet with hand-written fake door/hardware rows - not a live API call, not backed by any database.
- **The demo panel explicitly disclaims itself**: *"This demo project is fixed and invented for illustration — 'The WeylandAI Building' is not a real customer or a real address on file."* Accurate as of this morning; no longer true (see below), but the page hasn't been told that.
- **Every single call-to-action on the page routes to `/login`.** The demo's own "SIGN IN TO START A REAL SUBMITTAL" button, the header's "Sign In" button - there is currently no path from the homepage into the product that doesn't require an account first. Real friction, on a page whose own meta description promises the opposite experience.
- The idle-timeout ambient SightX reveal and the gamification badge tray (shipped 2026-09-09, see `WORKER_LESSONS_LEARNED.md`) are real and live, layered on top of this same static demo.

## What changed today that the page doesn't know about yet

Both landed after the current homepage was last built, so the gap above isn't a backlog item - it's the page being stale against real, already-deployed backend capability:

1. **AuthFor ephemeral (no-signup) trial sessions are live and verified.** `authenticate()`/`requireProductAccess()` grant a real guest full access to SubX, TakeoffX, CutsheetX, and SightX with zero account - confirmed live in production (`POST /api/v1/ephemeral/create` → a real Bearer token → `200` from a real `GET /api/submittals` call). Nothing on the homepage calls this endpoint.
2. **"The WeylandAI Building" is now a real project**, not fixed HTML: `projects.id = eabd5ff6-e19f-4e6b-acfc-9a250445dfa8`, a real submittal, a real 10-door hardware matrix (0 conflicts), all verified live through the actual product APIs. The homepage's demo panel still renders its old hardcoded rows instead of this real data.

So the actual redesign isn't "build new capability" - the capability exists and is verified. It's "stop the landing page from hiding it behind a login wall and a fake dataset."

## Target design

**Model, per direct instruction**: Suno.ai's free-generation pattern. A visitor lands directly in the real product, working against real data, full functional access - the paywall sits at the *polished final output* (a downloadable, finished submittal package), not at trying the thing. Every visitor is a prospective customer and should be treated as one from the first second, not made to clear a signup wall before seeing whether the product is worth signing up for.

Concretely:

1. **On page load** (no click required): silently call `POST /api/v1/ephemeral/create` against AuthFor, store the returned token, and use it as the page's Bearer token for all API calls from then on. No visible step, no "click here to start a trial" - the trial *is* the landing experience.
2. **Load the real seeded project** (`eabd5ff6-e19f-4e6b-acfc-9a250445dfa8`) via the real `GET /api/projects/:id` and `GET /api/hardware-schedule/session/:id/door-index` calls, using the ephemeral token, and render the *actual* returned data - not the current hardcoded HTML rows. The door/hardware table becomes real, live, and (this matters) editable within the bounds `requireProductAccess`'s ephemeral allowlist already grants - a visitor can genuinely interact with SubX, not just look at a screenshot-equivalent.
3. **Update the page copy** to match reality instead of disclaiming it: replace "this demo project is fixed and invented... not a real customer" with something honest about what's now true - a real, always-available example project anyone can explore and extend, clearly labeled as a shared demo (not private data), with real upload/try-your-own-PDF capability layered on top per the existing SightX reconstruction flow.
4. **Gate the finish line, not the start line.** Real account / subscription should be required for: exporting a finished submittal package, saving changes permanently (an ephemeral session's edits shouldn't silently persist forever against the shared demo project), and anything the `EPHEMERAL_TRIAL_PRODUCTS` allowlist already excludes (see `src/lib/auth.js`). Everything else stays open.
5. **Idle-reveal and badges stay, retargeted at real engagement.** The existing ambient SightX reveal and gamification badges (First Match, Full House, Building Explorer) were built against the fake dataset's fixed door list - once the panel renders real API data, the badge-award logic (`markMatchSeen`, the door row click handlers in `index.html`) needs to key off the real door IDs returned by the API instead of the hardcoded `MATCHED_DOORS` array.

## What this explicitly does NOT include (deferred, not forgotten)

- **Multi-trade bid support** (plumbing, electrical, drywall, etc. - see `PLAN.md` item 2). The redesigned landing page still shows the door-hardware trade specifically; it should not imply multi-trade support that doesn't exist yet. No industry-toggle dropdown in this pass.
- **Per-ephemeral-session usage rate limiting.** Still a real, stated gap from the original ephemeral-auth commit - relevant here because an unthrottled, no-signup, fully-functional landing page is exactly the kind of surface abuse would target first. Should be resolved before or alongside shipping this, not after.
- **Shared-state concurrency on the demo project.** If many simultaneous visitors are all issued ephemeral sessions against the *same* seeded project and can edit it, concurrent edits need a real answer (each ephemeral session gets its own copy-on-write view? real conflicts get silently dropped? something else?) - not designed yet, a real open question before "editable" ships broadly.

## Verification standard for whoever builds this

Same bar as everything else landed today: a real ephemeral token obtained live, a real API call made with it against the real seeded project, a real screenshot or response body showing it worked - not "the code looks like it should work."
