#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source /Users/johnmobley/mascom/safe-deploy-lib.sh
repo="$(git rev-parse --show-toplevel)"
sd_require_branch "$repo" main
sd_require_clean_tree "$repo" weyland-sightx-worker/releases/20261016-glove-touch-r1
sd_require_config_lines wrangler.toml 'binding = "DB"||Preserved deployed DB' 'binding = "FILMLINE_VIDEO"||Preserved video service' 'database_id = "5729f77e-d7e3-4577-ab43-3c064fa90ca5"||Exact DB' 'no_bundle = true||Exact native deployed modules'
python3 guard.py --output /Users/johnmobley/Documents/Codex/2026-10-05/task-2/sightx-hotfix-r2/predeploy.json
unset CLOUDFLARE_API_TOKEN
export PATH="/opt/homebrew/bin:$PATH"
sd_deploy wrangler.toml
