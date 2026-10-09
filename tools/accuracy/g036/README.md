# g036: journeys fail cleanly on an unexpected API answer

The first g028 acceptance pass crashed on an undefined response while a deploy was propagating. The journey read `(await fetch(...)).json().model` and then `api.doors`.

## What changed
- **tools/user-simulation/lib/api-answer.mjs:** `apiAnswer()` judges one API answer. It returns a named problem, with the status, content type and start of the body, for each of these:
  - a non-2xx status (a 404 is flagged as "route missing: a deploy still propagating, or the wrong worker")
  - a body that is not JSON (an HTML page is named as such)
  - JSON missing a field the journey uses
  - a failed request
  - no answer at all
- **Journey.api(page, path, name, {require, pick}) in journey-kit:** fetches the answer inside the page and records the named check. On an unexpected answer it returns null instead of throwing, so the journey skips what depends on it and moves on to the next set.
- **Journey.run():** a crash that still happens names the journey line it stopped on.
- **sightx-real-buildings:** reads its set through `J.api`. Its "the set opens" check now requires the status to name the set. When the set fails to load, the page falls back to SubX's sample sheet, and "Built 10 doors" alone used to pass.
- **Test:** `node --test tools/user-simulation/api-answer.test.mjs`, 6/6.

## Local evidence (software WebGL, worker under wrangler dev)
- **local-healthy.txt:** the journey against the local worker. 24 passed, 0 failed (21 + one "data answers" check per set).
- **local-api-404.txt:** the same journey through proxy404.mjs, which answers 404 with an HTML page on /api/sightx/sets/*, the deploy-propagation case. Each set is a named failed check ("the set opens", with the sample-sheet status shown), the run goes on to the next set, and the report is written. The exit code is 1, with no crash.
- **An earlier run,** before the status check was tightened, showed the `J.api` failure itself: `FAIL 7478006f7fd5b43c: the set's data answers [{"status":404,"content_type":"text/html","body":"<!doctype html><title>Not Found</title>","problem":"HTTP 404 (route missing: a deploy still propagating, or the wrong worker)"}]`.

Run either case: `node tools/accuracy/g036/proxy404.mjs` (upstream from UPSTREAM, default 127.0.0.1:8801, listening on 8802), then `WEYLAND_BASE_URL=http://127.0.0.1:8802 node tools/user-simulation/journeys/sightx-real-buildings.mjs`.
