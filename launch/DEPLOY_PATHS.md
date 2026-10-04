# WeylandAI deploy paths (so launch day never depends on one machine)

Written 2026-10-04 after the primary path failed mid-session.

## Path 1 - this Mac (primary)
`source /Users/johnmobley/mascom/cf_keychain_creds.sh; unset CF_API_KEY; npx wrangler deploy`
from the worker's directory. Credentials come from Keychain via `estate/bin/secretctl.py`.
Failure signature when the Keychain copy is stale: `Authentication error [code: 10000]`
from wrangler, `9103` from the API. Fix: put the current Global API Key into Keychain
through secretctl (never paste it anywhere else), re-source, retry.

## Path 2 - GitHub Actions (new)
`.github/workflows/deploy-workers.yml`, manual dispatch, one worker per run.
One-time setup: add `CLOUDFLARE_API_TOKEN` (a scoped token, not the global key) and
`CLOUDFLARE_ACCOUNT_ID` as Actions secrets on github.com/mobleysoft/weylandai.com.
The homepage itself needs no deploy at all: `git push origin main` publishes it through
GitHub Pages and the MASCOM edge cache in about 50 seconds.

## Path 3 - any machine, interactive
`npx wrangler login` (OAuth in a browser) then the same `npx wrangler deploy`.

## What each worker owns
| Worker | Serves |
|---|---|
| weyland-platform-worker | `/` (via MASCOM edge), `/api/auth/*`, billing, subscription |
| weyland-sightx-worker | `/sightx/`, `/api/sightx/*` |
| weyland-propx-worker | `/api/proposals/*` |
| weyland-huntx-worker | `/api/hunt/*`, `/huntx` |
| weyland-cutsheetx-worker | `/api/cut-sheets/*`, `/cutsheetx` |
| weyland-subx-worker | SubX + TakeoffX routes |
| weyland-meetingx-worker | `/api/sight/room/*` (Durable Object rooms) |
| monolith `weylandai-com-worker` | everything else on `weylandai.com/*`, redirects, `/pricing` |

Always verify a deploy with `curl -s <the exact URL the site uses> | grep -c <new marker>`.
Note the trailing-slash quirk: `/sightx?query` is redirected by the monolith; `/sightx/?query`
is the dedicated worker.
