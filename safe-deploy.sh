#!/bin/bash
# safe-deploy.sh - pre/post-deploy safety wrapper for weylandai-com-worker.
#
# Built 2026-09-24, generalizing workers/venture-fleet/safe-deploy.sh's
# proven pattern (see /Users/johnmobley/mascom/safe-deploy-lib.sh) to this
# repo. weylandai.com is its own dedicated git repo (not part of the shared
# nginx/ multi-venture tree), but the same underlying hazard applies -
# AGENTS.md incident #4b: multiple concurrent Claude Code sessions/agents can
# read/write/deploy from this SAME on-disk checkout.
#
# Why this one matters more than most: this worker's wrangler.toml is the
# conglomerate's real cross-venture service-binding hub - VENDYAI (checkout,
# per the "vendyai for selling" policy), OCR_SERVICE, MASCOM_EDGE,
# MARKET_INTELLIGENCE, FILMLINE_VIDEO are all live same-account Service
# Bindings this worker calls into, on top of its own D1/KV/R2/Durable
# Object/Browser Rendering bindings for SubX/TakeoffX/PropX/SightX/MeetingX.
# A silently dropped binding here is the largest single blast radius of any
# worker checked in this pass.
#
# Clean-tree check is intentionally SCOPED, not whole-repo, unlike most
# other wrappers in this pattern. This repo has real, persistent untracked
# scratch/doc-generation artifacts (.claude/, __pycache__/, lib/,
# ocr-worker/.local/, ocr-worker/page-range.js, perception_pipeline.py as of
# 2026-09-24) that are not part of the deployed bundle - weyland.worker.js is
# a single pre-bundled file with no local `require`/`import` of sibling
# source files (confirmed by inspection). A whole-repo check would abort on
# every single deploy attempt regardless of real dirty state, which is worse
# than not having the check at all (a check nobody can ever pass gets
# bypassed, not fixed). Scoping to the actual deploy unit keeps the check
# meaningful: it still catches the real hazard this pattern exists for (an
# uncommitted mid-edit to the worker script or its bindings getting shipped).
#
# Real bindings found by reading this repo's own wrangler.toml (not
# guessed): DB, CACHE, DEMO_REQUESTS, OCR_SERVICE, FILMLINE_VIDEO, VENDYAI,
# MASCOM_EDGE, MARKET_INTELLIGENCE, BROWSER, UPLOADS, OUTPUTS, SIGHTX_ROOM.
#
# Usage: ./safe-deploy.sh [extra wrangler deploy args]

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export PATH="/Users/johnmobley/.nvm/versions/node/v22.23.2/bin:$PATH"
source /Users/johnmobley/mascom/safe-deploy-lib.sh

REPO_ROOT="$(git rev-parse --show-toplevel)"
CONFIG="wrangler.toml"

sd_banner "weylandai-com-worker"

# 1. Branch check.
sd_require_branch "$REPO_ROOT" main

# 2. Clean-tree check - scoped to the actual deploy unit (see header note
#    above for why this repo can't use whole-tree mode).
sd_require_clean_tree "$REPO_ROOT" weyland.worker.js wrangler.toml

# 3. Positive binding assertions - every binding this worker's wrangler.toml
#    declares, since this is the conglomerate's real cross-venture hub and
#    losing any one of these breaks a real, currently-used feature.
sd_require_config_lines "$CONFIG" \
  'binding = "DB"||weyland_db D1 database (86 tables) backing SubX/TakeoffX/PropX/SightX' \
  'binding = "CACHE"||KV cache namespace' \
  'binding = "DEMO_REQUESTS"||KV namespace for demo-request capture' \
  'binding = "OCR_SERVICE"||Service Binding to weyland-ocr-worker (PDFium+tesseract), no fallback' \
  'binding = "FILMLINE_VIDEO"||Service Binding to filmline-video-worker, SightX walkthrough-preview' \
  'binding = "VENDYAI"||Service Binding to vendyai-com-worker - checkout flow per "vendyai for selling" policy' \
  'binding = "MASCOM_EDGE"||Service Binding to mascom-edge, homepage pull-through cache (has bundled-HTML fallback)' \
  'binding = "MARKET_INTELLIGENCE"||Service Binding to weyland-market-intelligence-worker, the 6 X-tool routes' \
  'binding = "BROWSER"||Browser Rendering binding for quote/proposal PDF generation' \
  'binding = "UPLOADS"||R2 bucket subx-uploads' \
  'binding = "OUTPUTS"||R2 bucket subx-outputs' \
  'name = "SIGHTX_ROOM"||Durable Object for MeetingX presence/chat/WebRTC-signaling'

echo "Pre-deploy checks passed: on main, clean tree (scoped), required bindings present."

# 4. Deploy for real.
sd_deploy "$CONFIG" "$@"

# 5. Post-deploy live verification against the real homepage - no dedicated
#    /health route exists in this worker, so this checks for the page's own
#    distinguishing title string instead, confirmed live 2026-09-24.
echo ""
echo "== post-deploy verification =="
sd_verify_response_body \
  "https://weylandai.com/" \
  "WeylandAI | SubX"

sd_banner_done "weylandai-com-worker"
