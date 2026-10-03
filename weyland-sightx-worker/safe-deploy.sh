#!/bin/bash
# safe-deploy.sh - pre/post-deploy safety wrapper for weyland-sightx-worker.
#
# Follows mascom/safe-deploy-lib.sh conventions. Protects against
# dirty tree, non-main branch, and missing FILMLINE_VIDEO service binding.
#
# Usage: ./safe-deploy.sh [extra wrangler deploy args]

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

sd_banner "weyland-sightx-worker"

# 1. Branch check.
sd_require_branch "$REPO_ROOT" main

# 2. Clean-tree check - scoped to this worker's directory and shared sightx assets
sd_require_clean_tree "$REPO_ROOT" weyland-sightx-worker/ src/pages/sightx.html

# 3. Positive binding assertions
sd_require_config_lines "$CONFIG" \
  'binding = "FILMLINE_VIDEO"||Service Binding to filmline-video-worker, SightX walkthrough-preview'

echo "Pre-deploy checks passed: on main, clean tree (scoped), required bindings present."

# 4. Deploy for real.
sd_deploy "$CONFIG" "$@"

# 5. Post-deploy live verification against the real sightx route
echo ""
echo "== post-deploy verification =="
sd_verify_response_body \
  "https://weylandai.com/sightx" \
  "SightX | WeylandAI Site Vision Demonstrator"

sd_banner_done "weyland-sightx-worker"
