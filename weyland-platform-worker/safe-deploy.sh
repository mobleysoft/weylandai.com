#!/bin/bash
# safe-deploy.sh - pre/post-deploy safety wrapper for weyland-platform-worker.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export PATH="/Users/johnmobley/.nvm/versions/node/v22.23.2/bin:$PATH"
eval "$(/usr/bin/python3 /Users/johnmobley/estate/bin/secretctl.py export-shell 2>/dev/null)"
unset CF_API_KEY CF_ACCOUNT_ID CF_EMAIL CF_GLOBAL_KEY CLOUDFLARE_API_TOKEN
export CLOUDFLARE_API_KEY="$CLOUDFLARE_GLOBAL_API_KEY"
export CLOUDFLARE_EMAIL="$CF_PRIMARY_EMAIL"
export CLOUDFLARE_ACCOUNT_ID="$CF_PRIMARY_ACCOUNT_ID"
source /Users/johnmobley/mascom/safe-deploy-lib.sh

REPO_ROOT="$(git rev-parse --show-toplevel)"
CONFIG="wrangler.toml"

sd_banner "weyland-platform-worker"

# 1. Branch check.
sd_require_branch "$REPO_ROOT" main

# 2. Clean-tree check - scoped to the actual deploy unit.
sd_require_clean_tree "$REPO_ROOT" weyland-platform-worker/src weyland-platform-worker/wrangler.toml

# 3. Positive binding assertions
sd_require_config_lines "$CONFIG" \
  'binding = "DB"||weyland_db D1 database' \
  'binding = "CACHE"||KV cache namespace' \
  'binding = "DEMO_REQUESTS"||KV namespace for demo requests' \
  'binding = "VENDYAI"||Service Binding to vendyai-com-worker' \
  'binding = "MASCOM_EDGE"||Service Binding to mascom-edge'

echo "Pre-deploy checks passed: on main, clean tree (scoped), required bindings present."

# 4. Deploy for real.
sd_deploy "$CONFIG" "$@"

# 5. Post-deploy live verification against the real homepage
echo ""
echo "== post-deploy verification =="
sd_verify_response_body \
  "https://weylandai.com/" \
  "Autonomous Subcontractor Operating System"

sd_banner_done "weyland-platform-worker"
