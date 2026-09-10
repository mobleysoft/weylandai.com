import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, callEdge: Function, HASCOM_EDGE: string }} deps
 */
export function registerMeBridgeRoutes(router, { authenticate, callEdge, HASCOM_EDGE }) {
  router.get("/api/me/bridge/status", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId || user.userId;
    if (!ownerId)
      return jsonResponse3({ error: "No MHS ID for current user" }, 400);
    const res = await callEdge("GET", `/ai/v1/bridge/status?owner_id=${encodeURIComponent(ownerId)}`, env2);
    return jsonResponse3(res.body, res.status);
  });
  router.post("/api/me/bridge/token", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId;
    if (!ownerId) {
      return jsonResponse3({
        error: "Bridge tokens require an MHS ID. Your session does not carry one.",
        hint: "Re-authenticate via auth-onamerica to refresh your fleet identity."
      }, 400);
    }
    let body = {};
    try {
      body = await request2.json();
    } catch {
    }
    const res = await callEdge("POST", "/ai/v1/bridge/token", env2, {
      owner_id: ownerId,
      owner_email: user.email,
      label: body.label || `Bridge for ${user.name || user.email}`,
      capabilities: body.capabilities || "claude-vision,text-extraction",
      reuse_existing: body.reuse_existing !== false
    });
    return jsonResponse3(res.body, res.status);
  });
  router.get("/api/me/jobs", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId;
    if (!ownerId)
      return jsonResponse3({ error: "No MHS ID for current user" }, 400);
    const jobId = new URL(request2.url).searchParams.get("job_id");
    let path = `/ai/v1/bridge/jobs?owner_id=${encodeURIComponent(ownerId)}&limit=100`;
    if (jobId)
      path += `&job_id=${encodeURIComponent(jobId)}`;
    const res = await callEdge("GET", path, env2);
    return jsonResponse3(res.body, res.status);
  });
  router.get("/api/me/bridge/launcher.ps1", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId;
    if (!ownerId)
      return jsonResponse3({ error: "MHS ID required" }, 400);
    const tokenRes = await callEdge("POST", "/ai/v1/bridge/token", env2, {
      owner_id: ownerId,
      owner_email: user.email,
      label: `Bridge for ${user.name || user.email}`,
      reuse_existing: false
    });
    if (tokenRes.status !== 200 || !tokenRes.body.token) {
      return jsonResponse3({ error: "Token issuance failed", detail: tokenRes.body }, 500);
    }
    const originUrl = new URL(request2.url).origin;
    const ps1 = `# Weyland Bridge Launcher (Windows) \u2014 auto-generated for ${user.email || ownerId}
  # MHS ID: ${ownerId} | Token expires: ${tokenRes.body.expires_at}
  # Usage:  powershell -ExecutionPolicy Bypass -File .\\weyland-bridge-launcher.ps1
  # Requires: Python 3.8+ and the 'claude' CLI on PATH (for the default provider).
  #
  # Founding principle: data sovereign; compute on your box; your Claude Code
  # subscription covers Vision calls at zero marginal per-call cost.

  $ErrorActionPreference = 'Stop'

  Write-Host ""
  Write-Host "  Welcome to your Weyland Bridge" -ForegroundColor Yellow
  Write-Host "  ------------------------------------------------------------"
  Write-Host "  Everything here runs on your machine. Your own Claude Code"
  Write-Host "  does the document analysis on your subscription - no API key,"
  Write-Host "  no per-call cost, and your documents never leave this computer"
  Write-Host "  except as the results you choose to send back to Weyland."
  Write-Host ""
  Write-Host "  Three quick steps: (1) check Python, (2) download the bridge"
  Write-Host "  (one small Python file you are welcome to read), (3) connect"
  Write-Host "  and wait for the work you start in your browser."
  Write-Host "  You are in control - press Ctrl+C anytime to stop." -ForegroundColor DarkGray
  Write-Host ""

  $env:WEYLAND_BRIDGE_TOKEN = '${tokenRes.body.token}'
  $env:WEYLAND_EDGE_URL = '${HASCOM_EDGE}'
  if (-not $env:WEYLAND_PROVIDER) { $env:WEYLAND_PROVIDER = 'claude_code' }
  # Extraction engine model (configurable add-on): defaults to Opus 4.8. Set your own
  # (e.g. 'opus', 'claude-opus-4-8') or blank to use your Claude Code CLI default.
  # Needs your subscription to grant the model.
  if (-not $env:WEYLAND_MODEL) { $env:WEYLAND_MODEL = 'claude-opus-4-8' }
  # A stray ANTHROPIC_API_KEY hijacks the claude CLI off subscription auth:
  Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue

  ## QF-2026-0707: '??' is PowerShell 7+ syntax, but the usage header says 'powershell'
  ## which is 5.1 on default Windows \u2014 every operator following the instructions hit a
  ## ParserError. 5.1-compatible form:
  $py = Get-Command python -ErrorAction SilentlyContinue
  if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
  if (-not $py) {
    Write-Host "  Almost there - Python is not installed yet." -ForegroundColor Yellow
    Write-Host "  Grab it free from https://www.python.org/downloads (tick"
    Write-Host "  'Add Python to PATH' during setup), then run this again."
    exit 127
  }

  ## QF-2026-0707: ALWAYS fetch the current engine \u2014 skip-if-exists pinned operators
  ## to whatever vintage was on disk (a June engine ran for a week unnoticed). The
  ## engine is ~27 KB; freshness beats caching. A failed download falls back to an
  ## existing local copy so an offline relaunch still works.
  Write-Host "  [1/2] Fetching the current bridge program (~27 KB)..."
  ## Review fix (2026-07-14): -f fails on HTTP errors instead of saving the error page;
  ## the content sniff refuses to install anything that isn't the Python engine \u2014
  ## a 404/challenge page must NEVER clobber a known-good engine (fleet-brick risk).
  curl.exe -sfL "${originUrl}/lib/weyland-bridge.py" -o weyland-bridge.py.new
  $engineOk = (Test-Path "weyland-bridge.py.new") -and ((Get-Item "weyland-bridge.py.new").Length -gt 1000) -and ((Get-Content "weyland-bridge.py.new" -TotalCount 2) -join ' ' -match 'weyland-bridge')
  if ($engineOk) {
    Move-Item -Force "weyland-bridge.py.new" "weyland-bridge.py"
  } else {
    Remove-Item -Force "weyland-bridge.py.new" -ErrorAction SilentlyContinue
    if (-not (Test-Path "weyland-bridge.py")) {
      Write-Host "  Could not download the bridge. Check your internet connection" -ForegroundColor Yellow
      Write-Host "  and that you can reach ${originUrl}, then run this again."
      exit 1
    }
    Write-Host "  Download failed - using the existing local copy." -ForegroundColor Yellow
  }

  Write-Host "  [2/2] All set. Connecting your bridge to Weyland..." -ForegroundColor Green
  & $py.Source -u weyland-bridge.py
  `;
    return new Response(ps1, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="weyland-bridge-launcher-${ownerId}.ps1"`,
        "Cache-Control": "no-store"
      }
    });
  });
  router.get("/api/me/bridge/launcher.sh", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const ownerId = user.mhsId;
    if (!ownerId)
      return jsonResponse3({ error: "MHS ID required" }, 400);
    const tokenRes = await callEdge("POST", "/ai/v1/bridge/token", env2, {
      owner_id: ownerId,
      owner_email: user.email,
      label: `Bridge for ${user.name || user.email}`,
      reuse_existing: false
      // For launcher, always issue fresh
    });
    if (tokenRes.status !== 200 || !tokenRes.body.token) {
      return jsonResponse3({ error: "Token issuance failed", detail: tokenRes.body }, 500);
    }
    const token = tokenRes.body.token;
    const originUrl = new URL(request2.url).origin;
    const script = `#!/usr/bin/env bash
  # Weyland Bridge Launcher \u2014 auto-generated for ${user.email || ownerId}
  # MHS ID: ${ownerId}
  # Token expires: ${tokenRes.body.expires_at}
  #
  # Usage: bash weyland-bridge-launcher.sh
  # Requires: python3 (3.8+), claude CLI on PATH (for default provider).
  #
  # Founding principle: data sovereign; compute on your box; claude_code
  # subscription covers Vision calls at zero marginal per-call cost.

  set -euo pipefail

  echo ""
  echo "  Welcome to your Weyland Bridge"
  echo "  ------------------------------------------------------------"
  echo "  Everything here runs on your machine. Your own Claude Code"
  echo "  does the document analysis on your subscription - no API key,"
  echo "  no per-call cost, and your documents never leave this computer"
  echo "  except as the results you choose to send back to Weyland."
  echo ""
  echo "  Three quick steps: (1) check Python, (2) download the bridge"
  echo "  (one small Python file you are welcome to read), (3) connect"
  echo "  and wait for the work you start in your browser."
  echo "  You are in control - press Ctrl+C anytime to stop."
  echo ""

  export WEYLAND_BRIDGE_TOKEN='${token}'
  export WEYLAND_EDGE_URL='${HASCOM_EDGE}'
  # Default to claude_code provider \u2014 the Weyland fleet standard (subscription-
  # funded Vision via your local Claude Code). Override to anthropic_api if
  # you want to pay per-call against your own Anthropic key.
  export WEYLAND_PROVIDER='\${WEYLAND_PROVIDER:-claude_code}'

  # Extraction engine model (configurable add-on): defaults to Opus 4.8. Override with
  # your own (e.g. 'opus', 'claude-opus-4-8') or blank to use the CLI default. Requires
  # your subscription to grant the model.
  export WEYLAND_MODEL='\${WEYLAND_MODEL:-claude-opus-4-8}'

  # Locate python3
  PY=''
  for cand in python3 python py; do
    if command -v "$cand" >/dev/null 2>&1; then PY="$cand"; break; fi
  done
  if [ -z "$PY" ]; then
    echo "  Almost there - Python 3 is not installed yet." >&2
    echo "  Install it free from https://www.python.org/downloads/ then run this again." >&2
    exit 127
  fi

  # Download bridge agent if not present (served from R2 via weyland origin)
  if [ ! -f "weyland-bridge.py" ]; then
    echo "  [1/2] Setting up - downloading the bridge program (~16 KB)..."
    curl -sL "${originUrl}/lib/weyland-bridge.py" -o weyland-bridge.py
    if [ ! -f "weyland-bridge.py" ]; then
      echo "  Could not download the bridge. Check your connection and that you" >&2
      echo "  can reach ${originUrl}, then run this again." >&2
      exit 1
    fi
  fi

  echo "  [2/2] All set. Connecting your bridge to Weyland..."
  exec "$PY" -u weyland-bridge.py
  `;
    return new Response(script, {
      status: 200,
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Content-Disposition": `attachment; filename="weyland-bridge-launcher-${ownerId}.sh"`,
        "Cache-Control": "no-store"
      }
    });
  });
}
