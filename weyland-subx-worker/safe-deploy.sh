#!/usr/bin/env bash
# Guarded deploy for the dedicated SubX/TakeoffX Worker.
# Run from a clean main checkout after the release is reviewed and merged.
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
WRANGLER_BIN="$(command -v wrangler || true)"

sd_banner "weyland-subx-worker"
sd_require_branch "$REPO_ROOT" main
sd_require_clean_tree "$REPO_ROOT" weyland-subx-worker
if [ -z "$WRANGLER_BIN" ]; then
  sd_abort "wrangler CLI is not installed on PATH; refusing to download an unpinned deploy tool during release."
fi

# Wrangler replaces this worker's complete route list on deploy; assert every
# declared binding and route so an accidental omission cannot disable one.
sd_require_config_lines "$CONFIG" \
  'binding = "DB"||weyland_db D1 database used by SubX' \
  'binding = "CACHE"||SubX KV cache' \
  'binding = "OCR_SERVICE"||Service Binding to weyland-ocr-worker' \
  'binding = "BROWSER"||Browser Rendering for PDF review' \
  'binding = "UPLOADS"||subx-uploads R2 bucket' \
  'binding = "OUTPUTS"||subx-outputs R2 bucket' \
  'pattern = "weylandai.com/subx*"||SubX route' \
  'pattern = "weylandai.com/subx-app*"||SubX app route' \
  'pattern = "weylandai.com/takeoffx*"||TakeOffX route' \
  'pattern = "weylandai.com/api/hardware-schedule"||hardware-schedule API root' \
  'pattern = "weylandai.com/api/hardware-schedule/*"||hardware-schedule API routes' \
  'pattern = "weylandai.com/api/submittals"||submittals API root' \
  'pattern = "weylandai.com/api/submittals/*"||submittals API routes' \
  'pattern = "weylandai.com/api/takeoff"||takeoff API root' \
  'pattern = "weylandai.com/api/takeoff/*"||takeoff API routes' \
  'pattern = "weylandai.com/api/demo/weyland-building/session*"||Weyland Building demo route'

echo "Pre-deploy checks passed: on main, clean SubX worker tree, all bindings and routes present."
"$WRANGLER_BIN" deploy --config "$CONFIG" "$@"
sd_verify_response_body "https://weylandai.com/subx-app" "<title>SubX Workspace | WeylandAI</title>"
sd_banner_done "weyland-subx-worker"
