# Live Workers on weylandai.com and the commits they were deployed from (2026-10-10)

Canonical source for every weyland-* Worker and the weylandai-com-worker monolith: this repository, github.com/mobleysoft/weylandai.com, branch main. Deploys run only through .github/workflows/deploy-workers.yml (manual dispatch, one Worker per run, checkout of main at run time). The table matches each live script's modified_on (Cloudflare API) to the workflow run that produced it and that run's commit.

| Worker | directory in this repo | live modified_on (UTC) | workflow run | commit of main | routes |
|---|---|---|---|---|---|
| getventures | not in this repo (estate-wide venture.json Worker) | 2026-10-06T22:28 | no workflow run within 10 min (see note) | ?  | weylandai.com/venture.json, www.weylandai.com/venture.json |
| weyland-cutsheetx-worker | weyland-cutsheetx-worker/ | 2026-10-09T08:50 | 37907413230 at 08:50Z | 46fd308 Merge pull request #87 from mobleysoft/claude/zen-newton-vdv | weylandai.com/api/catalogue/*, weylandai.com/api/cps/*, weylandai.com/ |
| weyland-docs-worker | weyland-docs-worker/ | 2026-10-09T07:19 | 37898325807 at 07:19Z | e8293a9 Merge pull request #76 from mobleysoft/claude/zen-newton-vdv | weylandai.com/api/asbuilt-diffs/*, weylandai.com/api/drawing-index/*,  |
| weyland-forms-worker | weyland-forms-worker/ | 2026-10-09T08:01 | 37902330173 at 08:00Z | 752f412 Merge pull request #82 from mobleysoft/claude/zen-newton-vdv | weylandai.com/api/forms/*, weylandai.com/bidx*, weylandai.com/changeor |
| weyland-huntx-worker | weyland-huntx-worker/ | 2026-10-09T07:49 | 37901217253 at 07:49Z | b9d24c0 Merge pull request #80 from mobleysoft/claude/zen-newton-vdv | weylandai.com/api/hunt/*, weylandai.com/huntx* |
| weyland-market-intelligence-worker | weyland-market-intelligence-worker/ | 2026-10-09T21:51 | 37995870109 at 21:50Z | 676f102 Merge pull request #99 from mobleysoft/codex/weyland-release | weylandai.com/api/compx/*, weylandai.com/api/forecastx/*, weylandai.co |
| weyland-meetingx-worker | weyland-meetingx-worker/ | 2026-10-09T22:33 | 37999834510 at 22:33Z | 4cbc422 Merge pull request #103 from mobleysoft/codex/weyland-meetin | weylandai.com/api/sight/room/*, weylandai.com/meetingx*, weylandai.com |
| weyland-platform-worker | weyland-platform-worker/ | 2026-10-09T22:26 | 37999225680 at 22:26Z | 80ea405 Merge pull request #102 from mobleysoft/codex/weyland-readin | weylandai.com/, weylandai.com/api/auth/*, weylandai.com/api/billing/*, |
| weyland-propx-worker | weyland-propx-worker/ | 2026-10-09T08:06 | 37902843233 at 08:05Z | f71205c Merge pull request #83 from mobleysoft/claude/zen-newton-vdv | weylandai.com/api/proposals/*, weylandai.com/propx-app* |
| weyland-sightx-worker | weyland-sightx-worker/ | 2026-10-10T00:44 | 38010292432 at 00:43Z | 7ca926a Merge pull request #113 from mobleysoft/claude/g045-shared-m | weylandai.com/api/sightx/*, weylandai.com/sightx, weylandai.com/sightx |
| weyland-subx-worker | weyland-subx-worker/ | 2026-10-10T03:21 | 38020221615 at 03:20Z | 9925b0d g042 step five: truth over all 598 harvest PDFs with both re | weylandai.com/api/demo/weyland-building/session*, weylandai.com/api/ha |
| weylandai-com-worker | repo root (src/, weyland.worker.js, wrangler.toml) | 2026-10-09T23:58 | 38006949233 at 23:58Z | 7f1c175 Merge pull request #109 from mobleysoft/codex/weyland-final- | cutsheetx.weylandai.com/*, huntx.weylandai.com/*, propx.weylandai.com/ |

## Notes
- The weylandai-com-worker (monolith) binds secrets that live only in Cloudflare (AUTHFOR_PROVISION_*, QWEN_BRIDGE_*, STRIPE_*, SUBSCRIPTION_WEBHOOK_SECRET, CDP_SELFTEST_SECRET, FRED_API_KEY) and resources named in wrangler.toml (DB, UPLOADS, OUTPUTS, CACHE, DEMO_REQUESTS, OCR_SERVICE, MARKET_INTELLIGENCE, MASCOM_EDGE, SIGHTX_ROOM, VENDYAI, FILMLINE_VIDEO, BROWSER). Secret values are never in the repo; names are.
- The homepage (index.html, assets/) ships from this repository through GitHub Pages on push to main, then the MASCOM_EDGE cache; the mascom-edge Worker itself lives in the mascom repository.
- The Mac's working checkout of this repository (/Users/johnmobley/weylandai.com) is 369 commits behind main and holds another session's uncommitted work in progress (index.html, assets/weyland-shell.js, weyland-shared catalogue and product database, sightx.html, subx-workspace.js, three cutsheetx sandbox tools). None of it is live: every live Worker above was deployed by the workflow from a main commit.
- jmobleyworks/mascom-nginx and mhslp/mhslp-production are not sources for these Workers; a second copy there would only drift.
