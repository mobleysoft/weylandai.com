import { serve_onboarding } from "../../pages/onboarding.js";
import { serve_progress } from "../../pages/progress.js";

export var SovereignWeylandRoutes = (function() {
  // Consolidated 2026-09-09: this was 5 duplicate var ROUTE_LABELS / function
  // renderNav pairs in this same function scope (var hoisting meant only the
  // last, smallest copy actually took effect for every page - 18 live routes
  // had no nav link anywhere on the site as a result). This single copy is
  // the union of every key that appeared in any of the 5 originals.
  var ROUTE_LABELS = {
    onboarding: "ONBOARDING",
    huntx: "HUNTX",
    takeoffx: "TAKEOFFX",
    subx: "SUBX",
    cutsheetx: "CUTSHEETX",
    propx: "PROPX",
    sightx: "SIGHTX",
    meetingx: "MEETX",
    qtext: "QTEXT",
    whyweyland: "WHY WEYLAND",
    investors: "INVESTORS",
    venturedeck: "VENTURE DECK",
    lienx: "LIENX",
    bidx: "BIDX",
    coa: "COA",
    rfax: "RFAX",
    changeordx: "CHANGEORDX",
    permitx: "PERMITX",
    closex: "CLOSEX",
    notesx: "NOTESX",
    inspecx: "INSPECX",
    safetyx: "SAFETYX",
    survx: "SURVX",
    specx: "SPECX",
    drawx: "DRAWX",
    asbuiltx: "ASBUILTX",
    leadx: "LEADX",
    careers: "CAREERS"
  };
  function renderNav(current) {
    var selfAliases = { meetingx: ["meetingx", "meetx"] };
    var exclude = selfAliases[current] || [current];
    var links = "";
    for (var key in ROUTE_LABELS) {
      if (exclude.indexOf(key) !== -1) continue;
      links += "<a href=\"/" + key + "/\">" + ROUTE_LABELS[key] + "</a>";
    }
    return links;
  }
  function serve_huntx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>HuntX | Public Construction Opportunity Discovery</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--purple:#a78bfa}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 85% 15%,rgba(102,212,255,.12),transparent 28rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}\n    .shell{position:relative;max-width:1500px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}\n    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}\n    .brand b{display:block;letter-spacing:.16em}\n    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}\n    .nav{display:flex;gap:8px;flex-wrap:wrap}\n    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}\n    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue);box-shadow:0 0 15px rgba(102,212,255,.2)}\n    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}\n    .button:disabled{opacity:.5;cursor:not-allowed}\n    .titlebar{display:flex;justify-content:space-between;align-items:end;gap:25px;margin:35px 0 25px}\n    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n    .titlebar h1{font-size:clamp(34px,4.5vw,64px);letter-spacing:-.05em;line-height:1.02;margin:12px 0}\n    .titlebar p{max-width:680px;color:var(--muted);line-height:1.6;margin:0;font-size:16px}\n    .pill{border:1px solid rgba(102,212,255,.4);color:var(--blue);border-radius:99px;padding:10px 15px;font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em;background:rgba(102,212,255,.1)}\n    .filter-bar{display:flex;gap:15px;margin-bottom:24px;flex-wrap:wrap;background:#0e1117;padding:18px 24px;border:1px solid var(--line);border-radius:16px;align-items:center}\n    .search-input{flex:1;min-width:280px;background:#161920;border:1px solid var(--line);border-radius:10px;padding:12px 18px;color:#fff;font-size:15px}\n    .search-input:focus{outline:none;border-color:var(--blue)}\n    select{background:#161920;border:1px solid var(--line);border-radius:10px;padding:12px 18px;color:#fff;font-size:14px;cursor:pointer}\n    .metrics-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}\n    .metric-card{background:rgba(18,20,25,.9);border:1px solid var(--line);border-radius:14px;padding:20px}\n    .metric-card span{color:var(--muted);font:700 10px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;display:block}\n    .metric-card strong{font-size:32px;font-weight:900;color:var(--text);margin-top:8px;display:block}\n    .table-card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,.25);overflow-x:auto}\n    table{width:100%;border-collapse:collapse;font-size:13px}\n    th{text-align:left;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.1em;padding:16px 20px;background:#0d0f14;border-bottom:2px solid var(--line)}\n    td{padding:14px 20px;border-bottom:1px solid #1f232b;vertical-align:middle}\n    tr:hover td{background:rgba(102,212,255,.04)}\n    .status-badge{font:800 9px ui-monospace,monospace;padding:5px 10px;border-radius:99px;display:inline-block;letter-spacing:.08em;background:rgba(102,212,255,.15);color:var(--blue);border:1px solid rgba(102,212,255,.35)}\n    .val-cell{font-weight:800;color:var(--blue);font-size:14px}\n    .note-card{color:var(--muted);font-size:14px;line-height:1.6}\n    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--blue);font-size:13px}\n    @media(max-width:900px){.metrics-row{grid-template-columns:repeat(2,1fr)}.titlebar{flex-direction:column;align-items:flex-start}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">HX</span><span><b>HUNTX</b><small>OPPORTUNITY DISCOVERY</small></span></a>\n      <nav class=\"nav\">" + renderNav("huntx") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div>\n        <div class=\"eyebrow\">OPPORTUNITY DISCOVERY</div>\n        <h1>HuntX</h1>\n        <p>Pulls live public construction leads directly from state open-data APIs - Texas DOT\n        construction lettings and California school-facility funding releases today, more\n        sources added over time. Every row traces back to its real public source.</p>\n      </div>\n      <a class=\"button primary\" id=\"signin-btn\" href=\"/login?redirect=/huntx\" style=\"display:none\">SIGN IN TO VIEW OPPORTUNITIES</a>\n    </div>\n\n    <div id=\"app\" style=\"display:none\">\n      <div class=\"filter-bar\">\n        <input id=\"hx-search\" class=\"search-input\" type=\"text\" placeholder=\"Search title, agency, or location...\">\n        <select id=\"hx-source\">\n          <option value=\"\">All sources</option>\n          <option value=\"txdot\">Texas DOT (highway/bridge)</option>\n          <option value=\"ca_opsc\">CA school construction funding</option>\n        </select>\n        <button id=\"hx-refresh-btn\" class=\"button primary\">REFRESH FROM SOURCES</button>\n        <span id=\"hx-status\" style=\"color:var(--muted);font-size:12px\"></span>\n      </div>\n      <div class=\"metrics-row\">\n        <div class=\"metric-card\"><span>OPPORTUNITIES LISTED</span><strong id=\"hx-count\">0</strong></div>\n        <div class=\"metric-card\"><span>LAST REFRESHED</span><strong id=\"hx-last-fetch\" style=\"font-size:16px\">Never</strong></div>\n        <div class=\"metric-card\"><span>LIVE SOURCES</span><strong style=\"font-size:16px\">2</strong></div>\n      </div>\n      <div class=\"table-card\">\n        <table>\n          <thead><tr><th>OPPORTUNITY</th><th>AGENCY</th><th>LOCATION</th><th>KEY DATE</th><th>EST. VALUE</th><th>SOURCE</th></tr></thead>\n          <tbody id=\"hx-body\"><tr><td colspan=\"6\" style=\"color:var(--muted)\">Loading...</td></tr></tbody>\n        </table>\n      </div>\n    </div>\n\n    <div class=\"card note-card\" id=\"guest-note\" style=\"background:rgba(18,20,25,.9);border:1px solid var(--line);border-radius:18px;padding:22px\">\n      HuntX is available standalone at $799/mo or as part of the SubConP suite. See\n      <code>/pricing</code> for licensing, or sign in above if you already have access.\n    </div>\n  </div>\n  <script src=\"/assets/authfor-integration-standard.js\"></script>\n  <script>\n    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });\n    function authHeaders(json) {\n      const t = auth.getToken();\n      const h = t ? { 'Authorization': 'Bearer ' + t } : {};\n      if (json) h['Content-Type'] = 'application/json';\n      return h;\n    }\n    function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }\n    const SOURCE_LABEL = { txdot: 'TXDOT', ca_opsc: 'CA OPSC' };\n    function fmtMoney(v) { return v ? '$' + Number(v).toLocaleString(undefined, {maximumFractionDigits:0}) : '—'; }\n    function fmtDate(v) { if (!v) return '—'; try { return new Date(v).toLocaleDateString(); } catch(e) { return v; } }\n\n    async function loadOpportunities() {\n      const body = document.getElementById('hx-body');\n      const q = document.getElementById('hx-search').value.trim();\n      const source = document.getElementById('hx-source').value;\n      const params = new URLSearchParams();\n      if (q) params.set('q', q);\n      if (source) params.set('source', source);\n      const res = await fetch('/api/hunt/opportunities?' + params.toString(), { headers: authHeaders() });\n      if (!res.ok) { body.innerHTML = '<tr><td colspan=\"6\" style=\"color:var(--muted)\">Failed to load.</td></tr>'; return; }\n      const data = await res.json();\n      const rows = data.opportunities || [];\n      document.getElementById('hx-count').textContent = rows.length;\n      document.getElementById('hx-last-fetch').textContent = data.lastFetchedAt ? new Date(data.lastFetchedAt).toLocaleString() : 'Never - click Refresh';\n      body.innerHTML = rows.length ? rows.map(r => `<tr>\n          <td>${r.detail_url ? `<a href=\"${esc(r.detail_url)}\" target=\"_blank\" style=\"color:var(--text);text-decoration:none\">${esc(r.title)}</a>` : esc(r.title)}</td>\n          <td>${esc(r.agency)}</td>\n          <td>${esc(r.location)}</td>\n          <td>${fmtDate(r.key_date)}</td>\n          <td class=\"val-cell\">${fmtMoney(r.estimated_value)}</td>\n          <td><span class=\"status-badge\">${SOURCE_LABEL[r.source] || esc(r.source)}</span></td>\n        </tr>`).join('') : '<tr><td colspan=\"6\" style=\"color:var(--muted)\">No opportunities yet - click REFRESH FROM SOURCES.</td></tr>';\n    }\n\n    document.getElementById('hx-refresh-btn').addEventListener('click', async () => {\n      const btn = document.getElementById('hx-refresh-btn');\n      const status = document.getElementById('hx-status');\n      btn.disabled = true;\n      status.textContent = 'Pulling from live public sources...';\n      try {\n        const res = await fetch('/api/hunt/refresh', { method: 'POST', headers: authHeaders(true) });\n        const data = await res.json();\n        if (!res.ok) { status.textContent = 'Error: ' + (data.error || 'refresh failed'); btn.disabled = false; return; }\n        status.textContent = data.upserted + ' opportunities updated.';\n        await loadOpportunities();\n      } catch (e) {\n        status.textContent = 'Error: ' + e.message;\n      }\n      btn.disabled = false;\n    });\n    document.getElementById('hx-search').addEventListener('input', () => { clearTimeout(window._hxT); window._hxT = setTimeout(loadOpportunities, 300); });\n    document.getElementById('hx-source').addEventListener('change', loadOpportunities);\n\n    (async () => {\n      try {\n        const probe = await fetch('/api/hunt/opportunities', { headers: authHeaders() });\n        if (probe.status === 401 || probe.status === 403) {\n          document.getElementById('signin-btn').style.display = 'inline-block';\n          return;\n        }\n        if (probe.status === 402) {\n          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include HuntX yet. See <code>/pricing</code> to add it.';\n          return;\n        }\n        document.getElementById('app').style.display = 'block';\n        document.getElementById('guest-note').style.display = 'none';\n        loadOpportunities();\n      } catch (e) {\n        document.getElementById('signin-btn').style.display = 'inline-block';\n      }\n    })();\n  </script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_takeoffx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>TakeoffX | Machine-Vision Vector Blueprint Quantification</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--purple:#a78bfa}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 20%,rgba(97,223,160,.12),transparent 28rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}\n    .shell{position:relative;max-width:1500px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}\n    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--green);color:var(--bg);font-weight:900}\n    .brand b{display:block;letter-spacing:.16em}\n    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}\n    .nav{display:flex;gap:8px;flex-wrap:wrap}\n    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}\n    .nav a:hover,.button:hover{border-color:var(--green);color:var(--green);box-shadow:0 0 15px rgba(97,223,160,.2)}\n    .button.primary{background:var(--green);border-color:var(--green);color:var(--bg);font-weight:900}\n    .titlebar{display:flex;justify-content:space-between;align-items:end;gap:25px;margin:35px 0 25px}\n    .eyebrow{color:var(--green);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n    .titlebar h1{font-size:clamp(34px,4.5vw,64px);letter-spacing:-.05em;line-height:1.02;margin:12px 0}\n    .titlebar p{max-width:680px;color:var(--muted);line-height:1.6;margin:0;font-size:16px}\n    .pill{border:1px solid rgba(97,223,160,.4);color:var(--green);border-radius:99px;padding:10px 15px;font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em;background:rgba(97,223,160,.1)}\n    \n    .workspace-grid{display:grid;grid-template-columns:minmax(380px,1.2fr) minmax(320px,.8fr);gap:22px;margin-top:28px}\n    .canvas-card{background:#0b0d12;border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 25px 70px rgba(0,0,0,.3);display:flex;flex-direction:column}\n    .canvas-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:18px}\n    .canvas-viewport{background:linear-gradient(145deg,#11151d,#0a0c10);border:1px solid #1f2531;border-radius:12px;min-height:480px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;flex:1}\n    \n    .blueprint-grid{position:absolute;inset:0;background-size:40px 40px;background-image:linear-gradient(to right,rgba(97,223,160,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(97,223,160,.05) 1px,transparent 1px);pointer-events:none}\n    .vector-overlay{z-index:2;width:90%;height:85%;border:2px dashed rgba(97,223,160,.35);border-radius:8px;padding:20px;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:20px}\n    .zone-box{background:rgba(97,223,160,.07);border:1px solid rgba(97,223,160,.3);border-radius:8px;padding:16px;position:relative;transition:all .2s;cursor:pointer}\n    .zone-box:hover{background:rgba(97,223,160,.16);box-shadow:0 0 20px rgba(97,223,160,.25)}\n    .zone-tag{font:800 10px ui-monospace,monospace;color:var(--green);position:absolute;top:10px;right:10px;background:#090a0d;padding:4px 8px;border-radius:4px;border:1px solid var(--green)}\n    \n    .ledger-card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between}\n    .ledger-row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid #1f232b;align-items:center}\n    .ledger-row span{color:var(--muted);font-size:14px}\n    .ledger-row strong{color:#fff;font-size:15px;font-weight:700}\n    \n    @media(max-width:1000px){.workspace-grid{grid-template-columns:1fr}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">TX</span><span><b>TAKEOFFX</b><small>MACHINE-VISION TAKEOFF</small></span></a>\n      <nav class=\"nav\">" + renderNav("takeoffx") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div>\n        <div class=\"eyebrow\">MACHINE-VISION TAKEOFF</div>\n        <h1>TakeoffX</h1>\n        <p>Reads door schedules and hardware requirements directly from uploaded project\n        drawings, with confidence scoring and a review step before anything is written to your\n        project record - built to be checked, not blindly trusted.</p>\n      </div>\n      <a class=\"button primary\" href=\"/login?redirect=/\">SIGN IN TO START A TAKEOFF</a>\n    </div>\n    <div class=\"note-card\">\n      TakeoffX is part of the SubConP suite. See <code>/pricing</code> for standalone and bundled\n      licensing, or sign in above if you already have access.\n    </div>\n  </div>\n</body>\n</html>", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_subx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>SubX | Cut-Sheet Matching &amp; Submittal Package Automation</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--purple:#a78bfa}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 20% 20%,rgba(167,139,242,.12),transparent 28rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}\n    .shell{position:relative;max-width:1500px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}\n    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--purple);color:var(--bg);font-weight:900}\n    .brand b{display:block;letter-spacing:.16em}\n    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}\n    .nav{display:flex;gap:8px;flex-wrap:wrap}\n    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}\n    .nav a:hover,.button:hover{border-color:var(--purple);color:var(--purple);box-shadow:0 0 15px rgba(167,139,242,.2)}\n    .button.primary{background:var(--purple);border-color:var(--purple);color:var(--bg);font-weight:900}\n    .titlebar{display:flex;justify-content:space-between;align-items:end;gap:25px;margin:35px 0 25px}\n    .eyebrow{color:var(--purple);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n    .titlebar h1{font-size:clamp(34px,4.5vw,64px);letter-spacing:-.05em;line-height:1.02;margin:12px 0}\n    .titlebar p{max-width:680px;color:var(--muted);line-height:1.6;margin:0;font-size:16px}\n    .pill{border:1px solid rgba(167,139,242,.4);color:var(--purple);border-radius:99px;padding:10px 15px;font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em;background:rgba(167,139,242,.1)}\n    .table-card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,.25);margin-bottom:24px}\n    table{width:100%;border-collapse:collapse;font-size:14px}\n    th{text-align:left;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.1em;padding:16px 20px;background:#0d0f14;border-bottom:2px solid var(--line)}\n    td{padding:16px 20px;border-bottom:1px solid #1f232b;vertical-align:middle}\n    tr:hover td{background:rgba(167,139,242,.04)}\n    .status-badge{font:800 9px ui-monospace,monospace;padding:5px 10px;border-radius:99px;display:inline-block;letter-spacing:.08em}\n    .status-matched{background:rgba(97,223,160,.15);color:var(--green);border:1px solid rgba(97,223,160,.35)}\n    .status-pending{background:rgba(240,184,0,.15);color:var(--gold);border:1px solid rgba(240,184,0,.35)}\n    .note-card{background:rgba(18,20,25,.9);border:1px solid var(--line);border-radius:14px;padding:22px;color:var(--muted);font-size:14px;line-height:1.6}\n    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--purple);font-size:13px}\n    @media(max-width:900px){.titlebar{flex-direction:column;align-items:flex-start}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">SX</span><span><b>SUBX</b><small>CUT-SHEET MATCHING & SUBMITTALS</small></span></a>\n      <nav class=\"nav\">" + renderNav("subx") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div>\n        <div class=\"eyebrow\">SUBMITTAL AUTOMATION</div>\n        <h1>SubX</h1>\n        <p>Extracts hardware and submittal requirements straight from project manuals and\n        specifications, matches them against a real manufacturer cut-sheet catalogue, and\n        assembles a complete submittal compliance package for review before it goes out.\n        Every match keeps its source citation attached.</p>\n      </div>\n      <a class=\"button primary\" href=\"/login?redirect=/\">SIGN IN TO START A SUBMITTAL</a>\n    </div>\n    <div class=\"note-card\">\n      SubX is part of the SubConP suite. See <code>/pricing</code> for standalone and bundled\n      licensing, or sign in above if you already have access.\n    </div>\n  </div>\n</body>\n</html>", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_propx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>PropX | WeylandAI</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 10% 5%,rgba(240,184,0,.12),transparent 27rem),linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}.shell{position:relative;max-width:1500px;margin:auto;padding:18px clamp(14px,2.5vw,34px) 40px}header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:18px}.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900}.brand b{display:block;letter-spacing:.16em}.brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}.nav{display:flex;gap:7px;flex-wrap:wrap}.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 12px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg)}.titlebar{display:flex;justify-content:space-between;align-items:end;gap:25px;margin:28px 0 18px}.eyebrow{color:var(--gold);font:800 10px/1 ui-monospace,monospace;letter-spacing:.17em}.titlebar h1{font-size:clamp(36px,5vw,72px);letter-spacing:-.055em;line-height:.93;margin:11px 0}.titlebar p{max-width:700px;color:var(--muted);line-height:1.6;margin:0}.pill{white-space:nowrap;border:1px solid rgba(97,223,160,.35);color:var(--green);border-radius:99px;padding:10px 13px;font:800 9px/1 ui-monospace,monospace;letter-spacing:.09em}.layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.65fr);gap:18px}.card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.22)}.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.card h2{font-size:17px;margin:0}.meta{color:var(--muted);font:700 9px/1 ui-monospace,monospace;letter-spacing:.08em}.proposal-head{padding:22px;border:1px solid var(--line);background:#0d0f12;border-radius:14px;margin-bottom:14px}.proposal-head h2{font-size:30px;margin:5px 0}.proposal-head p{color:var(--muted);margin:4px 0;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.fact{border-top:1px solid var(--line);padding-top:10px}.fact span{display:block;color:var(--muted);font:700 9px/1.4 ui-monospace,monospace}.fact strong{display:block;font-size:13px;margin-top:3px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:var(--muted);font:750 9px/1 ui-monospace,monospace;letter-spacing:.08em;padding:10px 8px;border-bottom:1px solid var(--line)}td{padding:11px 8px;border-bottom:1px solid #20242a;vertical-align:top}td:last-child,th:last-child{text-align:right}.source{display:block;color:var(--blue);font:700 9px/1.4 ui-monospace,monospace;margin-top:4px}.money{width:95px;background:#0b0d10;color:var(--text);border:1px solid var(--line);border-radius:7px;padding:7px;text-align:right}.total{margin-left:auto;width:min(100%,340px);padding-top:15px}.total div{display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:13px}.total .grand{border-top:1px solid var(--gold);color:var(--text);font-size:20px;font-weight:800}.warning{margin-top:14px;border-left:2px solid var(--gold);padding:10px 13px;color:var(--muted);font-size:12px;line-height:1.55;background:rgba(240,184,0,.04)}.stack{display:grid;gap:10px}.step{border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;grid-template-columns:31px 1fr;gap:10px}.step b{display:grid;place-items:center;width:30px;height:30px;background:rgba(240,184,0,.11);color:var(--gold);border-radius:8px;font:800 10px ui-monospace,monospace}.step strong{font-size:13px}.step small{display:block;color:var(--muted);margin-top:3px}.source-list{display:grid;gap:8px}.source-item{border:1px solid var(--line);border-radius:11px;padding:11px}.source-item strong{font-size:12px}.source-item span{display:block;color:var(--blue);font:700 9px/1.5 ui-monospace,monospace}.source-item p{color:var(--muted);font-size:11px;line-height:1.45;margin:5px 0 0}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.audit{margin-top:15px;padding-top:14px;border-top:1px solid var(--line);color:var(--muted);font:700 9px/1.7 ui-monospace,monospace}.loading{padding:50px;text-align:center;color:var(--muted)}@media(max-width:900px){.layout{grid-template-columns:1fr}.titlebar{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}.nav a:nth-child(-n+2){display:none}}@media print{body:before,header,.titlebar,.side,.actions,.warning{display:none!important}.shell{padding:0}.layout{display:block}.card{border:0;box-shadow:none;padding:0}.proposal-head{border:0;padding:0}body{background:#fff;color:#111}td,th{border-color:#ddd}.source,.proposal-head p,.fact span{color:#555}.money{border:0;color:#111;background:#fff}.total div{color:#333}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header><a class=\"brand\" href=\"/\"><span class=\"mark\">PX</span><span><b>PROPX</b><small>PROPOSAL INTELLIGENCE</small></span></a><nav class=\"nav\">" + renderNav("propx") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div>\n        <div class=\"eyebrow\">PROPOSAL INTELLIGENCE</div>\n        <h1>PropX</h1>\n        <p>Builds commercial bid and quote packages from live catalogue pricing and material\n        data, with automated markup and margin protection, so a proposal reflects real supplier\n        pricing instead of a stale spreadsheet.</p>\n      </div>\n      <a class=\"button primary\" href=\"/login?redirect=/\">SIGN IN TO START A PROPOSAL</a>\n    </div>\n    <div class=\"note-card\">\n      PropX is part of the SubConP suite. See <code>/pricing</code> for standalone and bundled\n      licensing, or sign in above if you already have access.\n    </div>\n  </div>\n</body>\n</html>", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_whyweyland() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>Why WeylandAI? | Sovereign Architecture & Competitive Superiority</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 30% 30%,rgba(0,242,255,.1),transparent 30rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}\n    .shell{position:relative;max-width:1400px;margin:auto;padding:20px clamp(16px,3vw,40px) 70px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}\n    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}\n    .brand b{display:block;letter-spacing:.16em}\n    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}\n    .nav{display:flex;gap:8px;flex-wrap:wrap}\n    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}\n    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue)}\n    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}\n    \n    .titlebar{text-align:center;margin:45px 0 55px}\n    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n    .titlebar h1{font-size:clamp(36px,5vw,64px);letter-spacing:-.05em;line-height:1.05;margin:14px 0}\n    .titlebar p{max-width:760px;color:var(--muted);line-height:1.6;margin:0 auto;font-size:18px}\n\n    .matrix-card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35);margin-bottom:50px}\n    table{width:100%;border-collapse:collapse;font-size:15px}\n    th{text-align:left;padding:20px 24px;background:#0e1117;border-bottom:2px solid var(--line);color:var(--muted);font:800 11px/1 ui-monospace,monospace;letter-spacing:.12em}\n    td{padding:22px 24px;border-bottom:1px solid #1e222b;vertical-align:top;line-height:1.5}\n    tr:hover td{background:rgba(255,255,255,.02)}\n    .weyland-col{background:rgba(0,242,255,.05);border-left:1px solid rgba(0,242,255,.2);border-right:1px solid rgba(0,242,255,.2);font-weight:600}\n    \n    .check-yes{color:var(--green);font-weight:900;font-size:18px;margin-right:8px}\n    .check-no{color:var(--red);font-weight:900;font-size:18px;margin-right:8px}\n    .pill-win{background:rgba(97,223,160,.15);color:var(--green);border:1px solid rgba(97,223,160,.35);padding:4px 10px;border-radius:99px;font:800 9px ui-monospace,monospace;display:inline-block;margin-top:6px}\n\n    .cta-banner{background:linear-gradient(135deg,#12161f,#0a0d14);border:2px solid var(--gold);border-radius:20px;padding:40px;text-align:center;box-shadow:0 0 50px rgba(240,184,0,.2)}\n    .cta-banner h2{font-size:36px;margin:0 0 12px;color:#fff}\n    .cta-banner p{color:var(--muted);max-width:620px;margin:0 auto 26px;font-size:16px}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">WW</span><span><b>WEYLANDAI</b><small>COMPETITIVE SUPERIORITY</small></span></a>\n      <nav class=\"nav\">" + renderNav("whyweyland") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div class=\"eyebrow\">WHY WEYLANDAI</div>\n      <h1>One project spine. Five operating engines.</h1>\n      <p>SubConP is the Subcontractor Operating Package: project discovery, submittals, takeoffs, cut sheets, and proposals operating on one shared project record instead of five disconnected tools.</p>\n    </div>\n    <div class=\"pill\">TAKEOFFX VS. TOGAL.AI ($299/MO, MANUAL COUNTING ONLY)</div>\n    <div class=\"pill\">HUNTX VS. DODGE / CONSTRUCTCONNECT ($6K&ndash;$12K/YEAR)</div>\n    <div class=\"pill\">SIGHTX VS. LUMION PRO / BIM 360 ENTERPRISE</div>\n    <p style=\"margin-top:30px\"><a class=\"button primary\" href=\"/pricing\">SEE FULL PRICING</a></p>\n  </div>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_venturedeck() {
    // The real deck this page was meant to present lives at
    // deck.weyland.onamerica.org (real, live, complete - confirmed) and
    // sends X-Frame-Options: SAMEORIGIN, so it can't be iframed from here.
    // This function's own markup was truncated mid-edit (never had a real
    // body past the nav, same truncation bug found in serve_careers) - fixed
    // by pointing straight at the real asset instead of a broken shell.
    return Response.redirect("https://deck.weyland.onamerica.org", 302);
  }
  function serve_investors() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>Investors | WeylandAI</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--purple:#a78bfa}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 80% 80%,rgba(102,212,255,.12),transparent 30rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}
    .shell{position:relative;max-width:1000px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue)}
    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}
    .titlebar{text-align:center;margin:45px 0 50px}
    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(32px,4.5vw,52px);letter-spacing:-.04em;line-height:1.08;margin:14px 0}
    .titlebar p{max-width:700px;color:var(--muted);line-height:1.6;margin:0 auto;font-size:16px}
    section{margin-top:56px}
    section h2{font-size:22px;margin:0 0 8px}
    section > p{color:var(--muted);line-height:1.65;font-size:15px;max-width:680px}
    .stack-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:22px}
    .stack-card{background:rgba(18,20,25,.92);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
    .stack-card .sc-name{font-size:16px;font-weight:800}
    .stack-card .sc-desc{color:var(--muted);font-size:13px;line-height:1.5;margin-top:6px}
    .stack-card .sc-price{margin-top:10px;font:800 13px ui-monospace,monospace;color:var(--blue)}
    .fig-row{display:flex;flex-wrap:wrap;gap:24px;margin-top:22px}
    .fig{border-left:2px solid var(--blue);padding-left:14px}
    .fig strong{display:block;font-size:26px;font-weight:900}
    .fig span{color:var(--muted);font:700 11px/1.6 ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase}
    .note{margin-top:14px;color:var(--muted);font-size:13px;line-height:1.6;border-left:2px solid var(--line);padding-left:14px}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">IX</span><span><b>WEYLANDAI</b><small>FOR INVESTORS</small></span></a>
      <nav class="nav">${renderNav("investors")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">FOR INVESTORS</div>
      <h1>Construction bids, generated automatically.</h1>
      <p>WeylandAI is a small, founder-led team building construction document automation: seven live products that take a project from RFP to submitted bid on one shared project record &mdash; HuntX finds the opportunity, SubX and TakeoffX read the drawings, CutsheetX matches real hardware, PropX drafts the proposal, SightX visualizes the result.</p>
      <p style="margin-top:24px"><a class="button primary" href="mailto:hello@weylandai.com?subject=Investor%20Inquiry">EMAIL HELLO@WEYLANDAI.COM</a></p>
    </div>

    <section>
      <h2>What's live today</h2>
      <p>Every product below has a working page, a real Stripe price, and can be bought standalone or as the $2,000/mo SubConP bundle.</p>
      <div class="stack-grid">
        <div class="stack-card"><div class="sc-name">SightX</div><div class="sc-desc">Spatial project intelligence &amp; 3D walkthrough</div><div class="sc-price">$999/mo</div></div>
        <div class="stack-card"><div class="sc-name">HuntX</div><div class="sc-desc">Live RFP &amp; permit opportunity crawler</div><div class="sc-price">$799/mo</div></div>
        <div class="stack-card"><div class="sc-name">SubX</div><div class="sc-desc">Submittal &amp; door-hardware extraction</div><div class="sc-price">$599/mo</div></div>
        <div class="stack-card"><div class="sc-name">TakeoffX</div><div class="sc-desc">Machine-vision quantity takeoff</div><div class="sc-price">$499/mo</div></div>
        <div class="stack-card"><div class="sc-name">PropX</div><div class="sc-desc">Submittal-to-proposal generator</div><div class="sc-price">$299/mo</div></div>
        <div class="stack-card"><div class="sc-name">MeetX</div><div class="sc-desc">Live avatars &amp; chat inside SightX</div><div class="sc-price">$299/mo</div></div>
        <div class="stack-card"><div class="sc-name">CutsheetX</div><div class="sc-desc">Hardware product &amp; cut-sheet matching</div><div class="sc-price">$199/mo</div></div>
      </div>
    </section>

    <section>
      <h2>The technical bet</h2>
      <p>TakeoffX's extraction runs on the customer's own Claude Code subscription through a downloadable bridge, not our API meter &mdash; no per-page inference cost on our side, and the customer's drawings never leave their machine except as the results they choose to send back. That's a real cost-structure difference from a per-seat SaaS tool billing every API call.</p>
    </section>

    <section>
      <h2>Roadmap: reuse, not reinvention</h2>
      <p>72 products are scoped across the full platform. Of those, 27 are direct extensions of a live product's existing engine &mdash; same document pipeline, one more document type &mdash; grouped into five packages: SubX Pro (8 extensions), SightX Pro (8), HuntX Pro (4), TakeoffX Pro (1), PropX Pro (1). The rest are genuinely new verticals, not yet built.</p>
      <div class="fig-row">
        <div class="fig"><strong>5</strong><span>Live core engines</span></div>
        <div class="fig"><strong>27</strong><span>Scoped near-term extensions</span></div>
        <div class="fig"><strong>72</strong><span>Full roadmap</span></div>
      </div>
    </section>

    <p class="note">Early-stage: this page intentionally doesn't cite revenue, customer counts, or a valuation &mdash; ask directly and we'll give you the real numbers, not rounded ones.</p>
  </div>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  // Generic "form -> generate -> download PDF" page. Every product in this
  // family (RFaX/ChangeOrdX/PermitX/CloseX/NotesX, and it would have fit
  // LienX/BidX/CoA too) is the same interaction shape - fields in, one
  // button, one download link out - so the page markup and wiring live here
  // once; only the field list, copy, and API path differ per product.
  function renderDocFormPage(cfg) {
    const fieldsHtml = cfg.fields.map((f) => {
      const label = `<label>${f.label}</label>`;
      if (f.type === "textarea") return `<div style="grid-column:1/-1"><label>${f.label}</label><textarea id="df-${f.id}" placeholder="${f.placeholder || ""}"></textarea></div>`;
      if (f.type === "checkbox") return `<div class="checkline"><input id="df-${f.id}" type="checkbox"><label style="margin:0" for="df-${f.id}">${f.label}</label></div>`;
      return `<div>${label}<input id="df-${f.id}" type="${f.type || "text"}" placeholder="${f.placeholder || ""}"></div>`;
    }).join("");
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>${cfg.title} | ${cfg.subtitle}</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--purple:#a78bfa;--accent:var(--${cfg.accent})}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--accent);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--accent);color:var(--accent)}
    .button.primary{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--accent);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input,textarea{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    textarea{min-height:70px;resize:vertical}
    input:focus,textarea:focus{outline:none;border-color:var(--accent)}
    .checkline{display:flex;align-items:center;gap:8px;grid-column:1/-1}
    .checkline input{width:auto}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--accent);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">${cfg.markInitials}</span><span><b>${cfg.productName}</b><small>${cfg.subtitle}</small></span></a>
      <nav class="nav">${renderNav(cfg.slug)}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">${cfg.subtitle}</div>
      <h1>${cfg.title}</h1>
      <p>${cfg.description}</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/${cfg.slug}" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">${fieldsHtml}</div>
        <button id="df-generate-btn" class="button primary" style="height:42px;margin-top:16px">${cfg.buttonLabel || "GENERATE"}</button>
        <div class="step-log" id="df-log"></div>
      </div>
      <div class="card" id="df-result" style="display:none">
        <div class="result-row">
          <span>Generated.</span>
          <a id="df-download" class="button primary" href="#" target="_blank">DOWNLOAD PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">${cfg.priceNote}</div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const FIELD_IDS = ${JSON.stringify(cfg.fields.map((f) => ({ id: f.id, type: f.type || "text" })))};
    const REQUIRED = ${JSON.stringify(cfg.required || [])};
    const log = document.getElementById('df-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('df-generate-btn').addEventListener('click', async () => {
      const btn = document.getElementById('df-generate-btn');
      log.innerHTML = '';
      document.getElementById('df-result').style.display = 'none';
      const payload = {};
      FIELD_IDS.forEach(f => {
        const el = document.getElementById('df-' + f.id);
        payload[f.id] = f.type === 'checkbox' ? el.checked : el.value.trim();
      });
      const missing = REQUIRED.filter(id => !payload[id]);
      if (missing.length) { logLine('Required: ' + missing.join(', '), 'err'); return; }
      btn.disabled = true;
      logLine('Generating...');
      try {
        const res = await fetch('${cfg.apiPath}', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'generation failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('df-download').href = data.downloadUrl;
        document.getElementById('df-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('${cfg.apiPath}', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include ${cfg.title} yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_lienx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>LienX | Lien Waiver Generator</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--red);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--red);color:var(--red)}
    .button.primary{background:var(--red);border-color:var(--red);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--red);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:620px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input,select,textarea{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    textarea{min-height:60px;resize:vertical}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--red)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--red);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">LX</span><span><b>LIENX</b><small>LIEN WAIVER GENERATOR</small></span></a>
      <nav class="nav">${renderNav("lienx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">LIEN WAIVER GENERATOR</div>
      <h1>LienX</h1>
      <p>Generates a general-form lien waiver from real project and payment details. Not a substitute for your state's exact statutory form &mdash; the generated PDF says so.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/lienx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div>
            <label>WAIVER TYPE</label>
            <select id="lx-type">
              <option value="conditional_progress">Conditional &mdash; Progress Payment</option>
              <option value="unconditional_progress">Unconditional &mdash; Progress Payment</option>
              <option value="conditional_final">Conditional &mdash; Final Payment</option>
              <option value="unconditional_final">Unconditional &mdash; Final Payment</option>
            </select>
          </div>
          <div><label>AMOUNT</label><input id="lx-amount" type="number" min="0" step="0.01" placeholder="0.00"></div>
          <div><label>THROUGH DATE</label><input id="lx-through-date" type="date"></div>
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div><label>CLAIMANT (YOU)</label><input id="lx-claimant-name" type="text" placeholder="Your company name"></div>
          <div><label>CLAIMANT ADDRESS</label><input id="lx-claimant-address" type="text"></div>
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div><label>OWNER</label><input id="lx-owner-name" type="text" placeholder="Property owner / GC"></div>
          <div><label>PROJECT NAME</label><input id="lx-project-name" type="text"></div>
        </div>
        <div style="margin-top:14px">
          <label>PROJECT ADDRESS</label>
          <input id="lx-project-address" type="text" placeholder="Job site address">
        </div>
        <div style="margin-top:14px">
          <label>EXCEPTIONS (OPTIONAL)</label>
          <textarea id="lx-exceptions" placeholder="Any disputed amounts or items excluded from this waiver"></textarea>
        </div>
        <button id="lx-generate-btn" class="button primary" style="height:42px;margin-top:16px">GENERATE WAIVER</button>
        <div class="step-log" id="lx-log"></div>
      </div>

      <div class="card" id="lx-result" style="display:none">
        <div class="result-row">
          <span>Waiver generated.</span>
          <a id="lx-download" class="button primary" href="#" target="_blank">DOWNLOAD PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      LienX is available standalone at $99/mo or as part of PropX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('lx-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('lx-generate-btn').addEventListener('click', async () => {
      const btn = document.getElementById('lx-generate-btn');
      log.innerHTML = '';
      document.getElementById('lx-result').style.display = 'none';
      const payload = {
        waiverType: document.getElementById('lx-type').value,
        amount: Number(document.getElementById('lx-amount').value) || 0,
        throughDate: document.getElementById('lx-through-date').value,
        claimantName: document.getElementById('lx-claimant-name').value.trim(),
        claimantAddress: document.getElementById('lx-claimant-address').value.trim(),
        ownerName: document.getElementById('lx-owner-name').value.trim(),
        projectName: document.getElementById('lx-project-name').value.trim(),
        projectAddress: document.getElementById('lx-project-address').value.trim(),
        exceptionsText: document.getElementById('lx-exceptions').value.trim()
      };
      if (!payload.claimantName || !payload.projectAddress) { logLine('Claimant name and project address are required.', 'err'); return; }
      btn.disabled = true;
      logLine('Generating waiver...');
      try {
        const res = await fetch('/api/lien-waivers/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'generation failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('lx-download').href = data.downloadUrl;
        document.getElementById('lx-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/lien-waivers/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include LienX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_bidx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>BidX | Bid Package Assembler</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:1000px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue)}
    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:660px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .section-label{color:var(--blue);font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;display:block}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input,select,textarea{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    textarea{min-height:60px;resize:vertical}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--blue)}
    .checkline{display:flex;align-items:center;gap:8px;margin-top:6px}
    .checkline input{width:auto}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
    th{text-align:left;color:var(--muted);font:750 9px/1 ui-monospace,monospace;letter-spacing:.08em;padding:8px 6px;border-bottom:1px solid var(--line)}
    td{padding:6px;border-bottom:1px solid #20242a}
    .li-remove{background:none;border:1px solid var(--line);color:var(--red);border-radius:6px;width:28px;height:28px;cursor:pointer}
    .totals-preview{display:flex;justify-content:flex-end;gap:22px;margin-top:14px;font-size:13px;color:var(--muted)}
    .totals-preview b{color:var(--text);font-size:15px}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--blue);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .quote-total{font-size:20px;font-weight:900;color:var(--green)}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">BX</span><span><b>BIDX</b><small>BID PACKAGE ASSEMBLER</small></span></a>
      <nav class="nav">${renderNav("bidx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">BID PACKAGE ASSEMBLER</div>
      <h1>BidX</h1>
      <p>Assembles a priced bid package &mdash; scope, bid bond, addenda acknowledgment, and terms &mdash; into a signature-ready PDF. Works with or without a SubX submittal behind it.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/bidx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <span class="section-label">PROJECT &amp; OWNER</span>
        <div class="form-grid">
          <div><label>OWNER / AWARDING AUTHORITY</label><input id="bx-owner" type="text"></div>
          <div><label>PROJECT NAME</label><input id="bx-project-name" type="text"></div>
          <div><label>BID DUE DATE</label><input id="bx-bid-due" type="date"></div>
        </div>
        <div style="margin-top:14px"><label>PROJECT ADDRESS</label><input id="bx-project-address" type="text"></div>
      </div>

      <div class="card">
        <span class="section-label">PRICED SCOPE</span>
        <table id="bx-li-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th><th></th></tr></thead>
          <tbody id="bx-li-body"></tbody>
        </table>
        <button id="bx-li-add" class="button" type="button" style="margin-top:10px">+ ADD LINE</button>
        <div class="totals-preview"><div>SUBTOTAL <b id="bx-subtotal-preview">$0.00</b></div></div>
      </div>

      <div class="card">
        <span class="section-label">BID REQUIREMENTS &amp; TERMS</span>
        <div class="form-grid">
          <div><label>TAX RATE (%)</label><input id="bx-tax-rate" type="number" value="0" min="0" step="0.01"></div>
          <div><label>BID BOND %</label><input id="bx-bond-percent" type="number" min="0" step="0.1" placeholder="e.g. 10"></div>
          <div><label>ADDENDA ACKNOWLEDGED</label><input id="bx-addenda" type="text" placeholder="e.g. Addendum 1, 2"></div>
        </div>
        <div class="checkline"><input id="bx-bond-required" type="checkbox"><label style="margin:0" for="bx-bond-required">Bid bond required by this solicitation</label></div>
        <div style="margin-top:14px"><label>EXCLUSIONS / TERMS (OPTIONAL)</label><textarea id="bx-exclusions"></textarea></div>
        <button id="bx-generate-btn" class="button primary" style="height:42px;margin-top:16px">GENERATE BID PACKAGE</button>
        <div class="step-log" id="bx-log"></div>
      </div>

      <div class="card" id="bx-result" style="display:none">
        <div class="result-row">
          <div id="bx-summary"></div>
          <a id="bx-download" class="button primary" href="#" target="_blank">DOWNLOAD PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      BidX is available standalone at $249/mo or as part of PropX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }
    const log = document.getElementById('bx-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    function addLiRow() {
      const tbody = document.getElementById('bx-li-body');
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td><input class="li-desc" type="text"></td>
        <td><input class="li-qty" type="number" min="0" value="1" style="width:64px"></td>
        <td><input class="li-price" type="number" min="0" step="0.01" value="0" style="width:90px"></td>
        <td class="li-amount">$0.00</td>
        <td><button class="li-remove" type="button">&times;</button></td>\`;
      tbody.appendChild(tr);
      tr.querySelector('.li-remove').addEventListener('click', () => { tr.remove(); recalcTotals(); });
      tr.querySelectorAll('.li-qty, .li-price').forEach(inp => inp.addEventListener('input', recalcTotals));
      recalcTotals();
    }
    function recalcTotals() {
      let subtotal = 0;
      document.querySelectorAll('#bx-li-body tr').forEach(tr => {
        const qty = Number(tr.querySelector('.li-qty').value) || 0;
        const price = Number(tr.querySelector('.li-price').value) || 0;
        const amount = qty * price;
        tr.querySelector('.li-amount').textContent = '$' + amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        subtotal += amount;
      });
      document.getElementById('bx-subtotal-preview').textContent = '$' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    }
    document.getElementById('bx-li-add').addEventListener('click', addLiRow);

    document.getElementById('bx-generate-btn').addEventListener('click', async () => {
      const btn = document.getElementById('bx-generate-btn');
      log.innerHTML = '';
      document.getElementById('bx-result').style.display = 'none';
      const lineItems = Array.from(document.querySelectorAll('#bx-li-body tr')).map(tr => ({
        description: tr.querySelector('.li-desc').value,
        quantity: Number(tr.querySelector('.li-qty').value) || 0,
        unitPrice: Number(tr.querySelector('.li-price').value) || 0
      }));
      const payload = {
        ownerName: document.getElementById('bx-owner').value.trim(),
        projectName: document.getElementById('bx-project-name').value.trim(),
        projectAddress: document.getElementById('bx-project-address').value.trim(),
        bidDueDate: document.getElementById('bx-bid-due').value,
        taxRate: (Number(document.getElementById('bx-tax-rate').value) || 0) / 100,
        bidBondRequired: document.getElementById('bx-bond-required').checked,
        bidBondPercent: Number(document.getElementById('bx-bond-percent').value) || 0,
        addendaAcknowledged: document.getElementById('bx-addenda').value.trim(),
        exclusionsText: document.getElementById('bx-exclusions').value.trim(),
        lineItems
      };
      if (!payload.projectName || !payload.projectAddress) { logLine('Project name and address are required.', 'err'); return; }
      btn.disabled = true;
      logLine('Assembling bid package...');
      try {
        const res = await fetch('/api/bid-packages/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'generation failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('bx-summary').innerHTML = \`<span class="quote-total">$\${Number(data.grandTotal||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span> total bid\`;
        document.getElementById('bx-download').href = data.downloadUrl;
        document.getElementById('bx-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/bid-packages/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include BidX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
        addLiRow();
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_coa() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>CoA | Certificate of Occupancy Application Package</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--green);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--green);color:var(--green)}
    .button.primary{background:var(--green);border-color:var(--green);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--green);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(28px,4.5vw,44px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--gold);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input,textarea{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    textarea{min-height:60px;resize:vertical}
    input:focus,textarea:focus{outline:none;border-color:var(--green)}
    .checklist{margin-top:10px;display:flex;flex-direction:column;gap:8px}
    .checkline{display:flex;align-items:center;gap:8px;font-size:13px}
    .checkline input{width:auto}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--green);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">CA</span><span><b>COA</b><small>OCCUPANCY APPLICATION PACKAGE</small></span></a>
      <nav class="nav">${renderNav("coa")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">CERTIFICATE OF OCCUPANCY APPLICATION PACKAGE</div>
      <h1>CoA</h1>
      <p>Assembles the cover letter and supporting-document checklist you submit to the Authority Having Jurisdiction to request a Certificate of Occupancy.</p>
      <p class="caveat">This generates a submission package, not the Certificate of Occupancy itself &mdash; only your local building authority can issue that.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/coa" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>AUTHORITY HAVING JURISDICTION</label><input id="ca-ahj" type="text" placeholder="e.g. City of Springfield Building Dept."></div>
          <div><label>PERMIT NUMBER</label><input id="ca-permit" type="text"></div>
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div><label>PROJECT NAME</label><input id="ca-project-name" type="text"></div>
          <div><label>PROJECT ADDRESS</label><input id="ca-project-address" type="text"></div>
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div><label>CONTACT NAME</label><input id="ca-contact-name" type="text"></div>
          <div><label>CONTACT PHONE</label><input id="ca-contact-phone" type="text"></div>
          <div><label>CONTACT EMAIL</label><input id="ca-contact-email" type="email"></div>
        </div>
        <div style="margin-top:16px">
          <label>SUPPORTING DOCUMENTATION</label>
          <div class="checklist" id="ca-checklist"></div>
        </div>
        <div style="margin-top:14px"><label>NOTES (OPTIONAL)</label><textarea id="ca-notes"></textarea></div>
        <button id="ca-generate-btn" class="button primary" style="height:42px;margin-top:16px">GENERATE APPLICATION PACKAGE</button>
        <div class="step-log" id="ca-log"></div>
      </div>

      <div class="card" id="ca-result" style="display:none">
        <div class="result-row">
          <span>Package generated.</span>
          <a id="ca-download" class="button primary" href="#" target="_blank">DOWNLOAD PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      CoA is available standalone at $99/mo or as part of PropX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const CHECKLIST_ITEMS = [
      "Final building inspection sign-off",
      "Final electrical inspection sign-off",
      "Final plumbing inspection sign-off",
      "Final mechanical/HVAC inspection sign-off",
      "Fire marshal / fire alarm system approval",
      "ADA / accessibility compliance sign-off",
      "As-built drawings (if required by permit)",
      "Utility connection confirmations (water, sewer, gas, electric)"
    ];
    const listEl = document.getElementById('ca-checklist');
    CHECKLIST_ITEMS.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'checkline';
      div.innerHTML = \`<input type="checkbox" id="ca-item-\${i}" checked><label style="margin:0" for="ca-item-\${i}">\${item}</label>\`;
      listEl.appendChild(div);
    });

    const log = document.getElementById('ca-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('ca-generate-btn').addEventListener('click', async () => {
      const btn = document.getElementById('ca-generate-btn');
      log.innerHTML = '';
      document.getElementById('ca-result').style.display = 'none';
      const checklist = CHECKLIST_ITEMS.filter((item, i) => document.getElementById('ca-item-' + i).checked);
      const payload = {
        ahjName: document.getElementById('ca-ahj').value.trim(),
        permitNumber: document.getElementById('ca-permit').value.trim(),
        projectName: document.getElementById('ca-project-name').value.trim(),
        projectAddress: document.getElementById('ca-project-address').value.trim(),
        contactName: document.getElementById('ca-contact-name').value.trim(),
        contactPhone: document.getElementById('ca-contact-phone').value.trim(),
        contactEmail: document.getElementById('ca-contact-email').value.trim(),
        notes: document.getElementById('ca-notes').value.trim(),
        checklist
      };
      if (!payload.projectName || !payload.projectAddress) { logLine('Project name and address are required.', 'err'); return; }
      btn.disabled = true;
      logLine('Assembling application package...');
      try {
        const res = await fetch('/api/coa-packages/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'generation failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('ca-download').href = data.downloadUrl;
        document.getElementById('ca-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/coa-packages/generate', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include CoA yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_rfax() {
    return renderDocFormPage({
      slug: "rfax", markInitials: "RA", productName: "RFAX", subtitle: "RFI/RFA GENERATOR",
      accent: "gold", title: "RFaX",
      description: "Generates a formatted Request for Information / Action from a project question, ready to submit to the owner or architect and track a response.",
      apiPath: "/api/rfas/generate",
      priceNote: 'RFaX is available standalone at $199/mo or as part of SubX Pro. See <code>/pricing</code> for licensing, or sign in above if you already have access.',
      required: ["subject", "question", "projectAddress"],
      fields: [
        { id: "rfaNumber", label: "RFA NUMBER" },
        { id: "dateSubmitted", label: "DATE SUBMITTED", type: "date" },
        { id: "responseNeededBy", label: "RESPONSE NEEDED BY", type: "date" },
        { id: "ownerName", label: "OWNER / RECIPIENT" },
        { id: "projectName", label: "PROJECT NAME" },
        { id: "projectAddress", label: "PROJECT ADDRESS" },
        { id: "subject", label: "SUBJECT" },
        { id: "question", label: "QUESTION / INFORMATION REQUESTED", type: "textarea" },
        { id: "distributionList", label: "DISTRIBUTION (OPTIONAL)" }
      ]
    });
  }
  function serve_changeordx() {
    return renderDocFormPage({
      slug: "changeordx", markInitials: "CO", productName: "CHANGEORDX", subtitle: "CHANGE ORDER GENERATOR",
      accent: "purple", title: "ChangeOrdX",
      description: "Turns a scope change into a formatted change order with cost and schedule impact, ready for owner/architect approval.",
      apiPath: "/api/change-orders/generate",
      priceNote: 'ChangeOrdX is available standalone at $199/mo or as part of SubX Pro. See <code>/pricing</code> for licensing, or sign in above if you already have access.',
      required: ["description", "projectAddress"],
      fields: [
        { id: "changeOrderNumber", label: "CHANGE ORDER #" },
        { id: "ownerName", label: "OWNER" },
        { id: "projectName", label: "PROJECT NAME" },
        { id: "projectAddress", label: "PROJECT ADDRESS" },
        { id: "description", label: "DESCRIPTION OF CHANGE", type: "textarea" },
        { id: "reason", label: "REASON", type: "textarea" },
        { id: "costImpact", label: "COST IMPACT ($)", type: "number" },
        { id: "scheduleImpactDays", label: "SCHEDULE IMPACT (DAYS)", type: "number" }
      ]
    });
  }
  function serve_permitx() {
    return renderDocFormPage({
      slug: "permitx", markInitials: "PX", productName: "PERMITX", subtitle: "PERMIT APPLICATION PACKAGE",
      accent: "blue", title: "PermitX",
      description: "Assembles the application package you submit to the Authority Having Jurisdiction to request a permit. Not the permit itself - only the AHJ can issue that.",
      apiPath: "/api/permit-packages/generate",
      priceNote: 'PermitX is available standalone at $149/mo or as part of SubX Pro. See <code>/pricing</code> for licensing, or sign in above if you already have access.',
      required: ["projectAddress", "scopeDescription"],
      fields: [
        { id: "permitType", label: "PERMIT TYPE" },
        { id: "ahjName", label: "AUTHORITY HAVING JURISDICTION" },
        { id: "projectName", label: "PROJECT NAME" },
        { id: "projectAddress", label: "PROJECT ADDRESS" },
        { id: "applicantName", label: "APPLICANT" },
        { id: "applicantContact", label: "APPLICANT CONTACT" },
        { id: "scopeDescription", label: "SCOPE OF WORK", type: "textarea" }
      ]
    });
  }
  function serve_closex() {
    return renderDocFormPage({
      slug: "closex", markInitials: "CX", productName: "CLOSEX", subtitle: "PROJECT CLOSEOUT PACKAGE",
      accent: "green", title: "CloseX",
      description: "Assembles the closeout package - completion status, warranty terms, and an 8-item checklist - ready to hand the owner at project end.",
      apiPath: "/api/closeout-packages/generate",
      priceNote: 'CloseX is available standalone at $199/mo or as part of SubX Pro. See <code>/pricing</code> for licensing, or sign in above if you already have access.',
      required: ["projectName", "projectAddress"],
      fields: [
        { id: "ownerName", label: "OWNER" },
        { id: "projectName", label: "PROJECT NAME" },
        { id: "projectAddress", label: "PROJECT ADDRESS" },
        { id: "completionDate", label: "COMPLETION DATE", type: "date" },
        { id: "warrantyPeriod", label: "WARRANTY PERIOD", placeholder: "e.g. 1 year from substantial completion" },
        { id: "notes", label: "NOTES (OPTIONAL)", type: "textarea" }
      ]
    });
  }
  function serve_notesx() {
    return renderDocFormPage({
      slug: "notesx", markInitials: "NX", productName: "NOTESX", subtitle: "MEETING MINUTES GENERATOR",
      accent: "red", title: "NotesX",
      description: "Turns attendees, agenda, and action items into formatted meeting minutes, ready to distribute.",
      apiPath: "/api/meeting-notes/generate",
      priceNote: 'NotesX is available standalone at $49/mo or as part of SubX Pro. See <code>/pricing</code> for licensing, or sign in above if you already have access.',
      required: ["projectName", "meetingDate"],
      fields: [
        { id: "projectName", label: "PROJECT NAME" },
        { id: "meetingDate", label: "MEETING DATE", type: "date" },
        { id: "nextMeetingDate", label: "NEXT MEETING DATE", type: "date" },
        { id: "attendees", label: "ATTENDEES (COMMA-SEPARATED)", type: "textarea" },
        { id: "agendaItems", label: "AGENDA ITEMS (ONE PER LINE)", type: "textarea" },
        { id: "actionItems", label: "ACTION ITEMS (ONE PER LINE)", type: "textarea" }
      ]
    });
  }
  function serve_inspecx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>InspecX | Inspection Report Processor</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue)}
    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--gold);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--blue)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--blue);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">IX</span><span><b>INSPECX</b><small>INSPECTION REPORT PROCESSOR</small></span></a>
      <nav class="nav">${renderNav("inspecx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">INSPECTION REPORT PROCESSOR</div>
      <h1>InspecX</h1>
      <p>Uploads an inspection report PDF, OCRs it with a real on-worker engine (PDFium + Tesseract, no external API), and flags lines matching fail/deficiency language.</p>
      <p class="caveat">Flagging is keyword-based, not an AI reading for meaning &mdash; review the source document for anything it might miss.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/inspecx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="ix-project" type="text"></div>
          <div><label>INSPECTION TYPE</label><input id="ix-type" type="text" placeholder="e.g. Fire/Life Safety"></div>
          <div><label>INSPECTOR</label><input id="ix-inspector" type="text"></div>
          <div><label>INSPECTION DATE</label><input id="ix-date" type="date"></div>
          <div style="grid-column:1/-1"><label>INSPECTION REPORT (PDF)</label><input id="ix-file" type="file" accept="application/pdf"></div>
        </div>
        <button id="ix-analyze-btn" class="button primary" style="height:42px;margin-top:16px">ANALYZE REPORT</button>
        <div class="step-log" id="ix-log"></div>
      </div>
      <div class="card" id="ix-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="ix-stats"></div>
          <a id="ix-download" class="button primary" href="#" target="_blank">DOWNLOAD SUMMARY PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      InspecX is available standalone at $199/mo or as part of SightX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('ix-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('ix-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('ix-analyze-btn');
      const fileInput = document.getElementById('ix-file');
      log.innerHTML = '';
      document.getElementById('ix-result').style.display = 'none';
      if (!fileInput.files.length) { logLine('Choose a PDF first.', 'err'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('projectName', document.getElementById('ix-project').value.trim());
      fd.append('inspectionType', document.getElementById('ix-type').value.trim());
      fd.append('inspectorName', document.getElementById('ix-inspector').value.trim());
      fd.append('inspectionDate', document.getElementById('ix-date').value);
      btn.disabled = true;
      logLine('Uploading and running OCR...');
      try {
        const res = await fetch('/api/inspections/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'analysis failed'), 'err'); btn.disabled = false; return; }
        logLine('Done - ' + data.pageCount + ' page(s) scanned.', 'ok');
        document.getElementById('ix-stats').innerHTML = '<div><b>' + data.pageCount + '</b>PAGES</div><div><b>' + data.passCount + '</b>PASS LINES</div><div><b>' + data.failCount + '</b>FLAGGED</div>';
        document.getElementById('ix-download').href = data.downloadUrl;
        document.getElementById('ix-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/inspections/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include InspecX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_safetyx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>SafetyX | Safety Report Processor</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}
    .button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--gold);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--red);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--gold)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--gold);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">SX</span><span><b>SAFETYX</b><small>SAFETY REPORT PROCESSOR</small></span></a>
      <nav class="nav">${renderNav("safetyx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">SAFETY REPORT PROCESSOR</div>
      <h1>SafetyX</h1>
      <p>Uploads a safety report or incident log PDF, OCRs it with the same on-worker engine InspecX uses (PDFium + Tesseract, no external API), and flags lines matching incident/hazard language.</p>
      <p class="caveat">Flagging is keyword-based, not an AI reading for meaning, and is not an OSHA recordability determination.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/safetyx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="sx-project" type="text"></div>
          <div><label>REPORT TYPE</label><input id="sx-type" type="text" placeholder="e.g. Weekly Site Safety Log"></div>
          <div><label>REPORTED BY</label><input id="sx-by" type="text"></div>
          <div><label>REPORT DATE</label><input id="sx-date" type="date"></div>
          <div style="grid-column:1/-1"><label>SAFETY REPORT (PDF)</label><input id="sx-file" type="file" accept="application/pdf"></div>
        </div>
        <button id="sx-analyze-btn" class="button primary" style="height:42px;margin-top:16px">ANALYZE REPORT</button>
        <div class="step-log" id="sx-log"></div>
      </div>
      <div class="card" id="sx-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="sx-stats"></div>
          <a id="sx-download" class="button primary" href="#" target="_blank">DOWNLOAD SUMMARY PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      SafetyX is available standalone at $149/mo or as part of SubX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('sx-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('sx-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('sx-analyze-btn');
      const fileInput = document.getElementById('sx-file');
      log.innerHTML = '';
      document.getElementById('sx-result').style.display = 'none';
      if (!fileInput.files.length) { logLine('Choose a PDF first.', 'err'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('projectName', document.getElementById('sx-project').value.trim());
      fd.append('reportType', document.getElementById('sx-type').value.trim());
      fd.append('reportedBy', document.getElementById('sx-by').value.trim());
      fd.append('reportDate', document.getElementById('sx-date').value);
      btn.disabled = true;
      logLine('Uploading and running OCR...');
      try {
        const res = await fetch('/api/safety-reports/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'analysis failed'), 'err'); btn.disabled = false; return; }
        logLine('Done - ' + data.pageCount + ' page(s) scanned.', 'ok');
        document.getElementById('sx-stats').innerHTML = '<div><b>' + data.pageCount + '</b>PAGES</div><div><b>' + data.clearCount + '</b>RESOLVED/COMPLIANT</div><div><b>' + data.incidentCount + '</b>FLAGGED</div>';
        document.getElementById('sx-download').href = data.downloadUrl;
        document.getElementById('sx-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/safety-reports/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include SafetyX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_survx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>SurvX | Site Survey Data Processor</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--purple:#a78bfa}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--purple);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--purple);color:var(--purple)}
    .button.primary{background:var(--purple);border-color:var(--purple);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--purple);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--red);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--purple)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--purple);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">SV</span><span><b>SURVX</b><small>SITE SURVEY DATA PROCESSOR</small></span></a>
      <nav class="nav">${renderNav("survx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">SITE SURVEY DATA PROCESSOR</div>
      <h1>SurvX</h1>
      <p>Uploads a site survey PDF, OCRs it with the same on-worker engine InspecX/SafetyX use (PDFium + Tesseract, no external API), and flags lines matching unresolved-condition language.</p>
      <p class="caveat">Flagging is keyword-based, not an AI reading for meaning - have a licensed surveyor confirm anything this list might miss or mis-flag.</p>
      <a class="button primary" id="signin-btn" href="/login?redirect=/survx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="sv-project" type="text"></div>
          <div><label>SURVEY TYPE</label><input id="sv-type" type="text" placeholder="e.g. Topographic, Boundary, ALTA"></div>
          <div><label>SURVEYOR</label><input id="sv-surveyor" type="text"></div>
          <div><label>SURVEY DATE</label><input id="sv-date" type="date"></div>
          <div style="grid-column:1/-1"><label>SURVEY DOCUMENT (PDF)</label><input id="sv-file" type="file" accept="application/pdf"></div>
        </div>
        <button id="sv-analyze-btn" class="button primary" style="height:42px;margin-top:16px">ANALYZE SURVEY</button>
        <div class="step-log" id="sv-log"></div>
      </div>
      <div class="card" id="sv-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="sv-stats"></div>
          <a id="sv-download" class="button primary" href="#" target="_blank">DOWNLOAD SUMMARY PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      SurvX is available standalone at $199/mo or as part of SightX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('sv-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('sv-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('sv-analyze-btn');
      const fileInput = document.getElementById('sv-file');
      log.innerHTML = '';
      document.getElementById('sv-result').style.display = 'none';
      if (!fileInput.files.length) { logLine('Choose a PDF first.', 'err'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('projectName', document.getElementById('sv-project').value.trim());
      fd.append('surveyType', document.getElementById('sv-type').value.trim());
      fd.append('surveyorName', document.getElementById('sv-surveyor').value.trim());
      fd.append('surveyDate', document.getElementById('sv-date').value);
      btn.disabled = true;
      logLine('Uploading and running OCR...');
      try {
        const res = await fetch('/api/survey-reports/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'analysis failed'), 'err'); btn.disabled = false; return; }
        logLine('Done - ' + data.pageCount + ' page(s) scanned.', 'ok');
        document.getElementById('sv-stats').innerHTML = '<div><b>' + data.pageCount + '</b>PAGES</div><div><b>' + data.clearCount + '</b>VERIFIED</div><div><b>' + data.flaggedCount + '</b>FLAGGED</div>';
        document.getElementById('sv-download').href = data.downloadUrl;
        document.getElementById('sv-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/survey-reports/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include SurvX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_specx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>SpecX | Spec Section Parser</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--green);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--green);color:var(--green)}
    .button.primary{background:var(--green);border-color:var(--green);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--green);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--red);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--green)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--green);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">SP</span><span><b>SPECX</b><small>SPEC SECTION PARSER</small></span></a>
      <nav class="nav">${renderNav("specx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">SPEC SECTION PARSER</div>
      <h1>SpecX</h1>
      <p>Uploads a spec document PDF, OCRs it (PDFium + Tesseract, no external API), and detects CSI MasterFormat-style section numbers (DD SS SS) to build a section index, flagging unusually short sections by word count.</p>
      <p class="caveat">This is a section index and completeness heuristic, not a code-compliance check.</p>
      <a class="button primary" id="sp-signin-btn" href="/login?redirect=/specx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="sp-project" type="text"></div>
          <div><label>SPEC DATE</label><input id="sp-date" type="date"></div>
          <div style="grid-column:1/-1"><label>SPEC DOCUMENT (PDF)</label><input id="sp-file" type="file" accept="application/pdf"></div>
        </div>
        <button id="sp-analyze-btn" class="button primary" style="height:42px;margin-top:16px">ANALYZE SPEC</button>
        <div class="step-log" id="sp-log"></div>
      </div>
      <div class="card" id="sp-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="sp-stats"></div>
          <a id="sp-download" class="button primary" href="#" target="_blank">DOWNLOAD SECTION INDEX PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      SpecX is available standalone at $149/mo or as part of SubX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('sp-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('sp-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('sp-analyze-btn');
      const fileInput = document.getElementById('sp-file');
      log.innerHTML = '';
      document.getElementById('sp-result').style.display = 'none';
      if (!fileInput.files.length) { logLine('Choose a PDF first.', 'err'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('projectName', document.getElementById('sp-project').value.trim());
      fd.append('specDate', document.getElementById('sp-date').value);
      btn.disabled = true;
      logLine('Uploading and running OCR...');
      try {
        const res = await fetch('/api/spec-sections/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'analysis failed'), 'err'); btn.disabled = false; return; }
        logLine('Done - ' + data.pageCount + ' page(s) scanned.', 'ok');
        document.getElementById('sp-stats').innerHTML = '<div><b>' + data.pageCount + '</b>PAGES</div><div><b>' + data.sectionCount + '</b>SECTIONS</div><div><b>' + data.shortCount + '</b>SHORT</div>';
        document.getElementById('sp-download').href = data.downloadUrl;
        document.getElementById('sp-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/spec-sections/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('sp-signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include SpecX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('sp-signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_drawx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>DrawX | Drawing Set Sheet Index</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--blue);color:var(--blue)}
    .button.primary{background:var(--blue);border-color:var(--blue);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--blue);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--red);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--blue)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--blue);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">DX</span><span><b>DRAWX</b><small>DRAWING SET SHEET INDEX</small></span></a>
      <nav class="nav">${renderNav("drawx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">DRAWING SET SHEET INDEX</div>
      <h1>DrawX</h1>
      <p>Uploads a drawing set PDF, OCRs title blocks and notes (PDFium + Tesseract, no external API), and detects sheet numbers (A-101, M-1.1, etc.) to build a sheet index.</p>
      <p class="caveat">This indexes sheet numbers and titles from text - it doesn't read lines, symbols, or dimensions on the drawing itself.</p>
      <a class="button primary" id="dx-signin-btn" href="/login?redirect=/drawx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="dx-project" type="text"></div>
          <div><label>DRAWING SET DATE</label><input id="dx-date" type="date"></div>
          <div style="grid-column:1/-1"><label>DRAWING SET (PDF)</label><input id="dx-file" type="file" accept="application/pdf"></div>
        </div>
        <button id="dx-analyze-btn" class="button primary" style="height:42px;margin-top:16px">BUILD SHEET INDEX</button>
        <div class="step-log" id="dx-log"></div>
      </div>
      <div class="card" id="dx-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="dx-stats"></div>
          <a id="dx-download" class="button primary" href="#" target="_blank">DOWNLOAD SHEET INDEX PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      DrawX is available standalone at $399/mo or as part of TakeoffX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('dx-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('dx-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('dx-analyze-btn');
      const fileInput = document.getElementById('dx-file');
      log.innerHTML = '';
      document.getElementById('dx-result').style.display = 'none';
      if (!fileInput.files.length) { logLine('Choose a PDF first.', 'err'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('projectName', document.getElementById('dx-project').value.trim());
      fd.append('drawingSetDate', document.getElementById('dx-date').value);
      btn.disabled = true;
      logLine('Uploading and running OCR...');
      try {
        const res = await fetch('/api/drawing-index/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'analysis failed'), 'err'); btn.disabled = false; return; }
        logLine('Done - ' + data.pageCount + ' page(s) scanned.', 'ok');
        document.getElementById('dx-stats').innerHTML = '<div><b>' + data.pageCount + '</b>PAGES</div><div><b>' + data.sheetCount + '</b>SHEETS</div>';
        document.getElementById('dx-download').href = data.downloadUrl;
        document.getElementById('dx-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/drawing-index/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('dx-signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include DrawX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('dx-signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_asbuiltx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>AsBuiltX | As-Built vs. Original Diff</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--red);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--red);color:var(--red)}
    .button.primary{background:var(--red);border-color:var(--red);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--red);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--gold);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--red)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--red);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">AB</span><span><b>ASBUILTX</b><small>AS-BUILT VS. ORIGINAL DIFF</small></span></a>
      <nav class="nav">${renderNav("asbuiltx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">AS-BUILT VS. ORIGINAL DIFF</div>
      <h1>AsBuiltX</h1>
      <p>Uploads an original drawing sheet and its as-built revision, renders both pages, and computes a real pixel-level difference heatmap between them - no external API, same PDFium engine used elsewhere.</p>
      <p class="caveat">This is raw pixel comparison, not markup/redline recognition - it flags where pixels differ, not what changed. Scan misalignment will also show up.</p>
      <a class="button primary" id="ax-signin-btn" href="/login?redirect=/asbuiltx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <div class="form-grid">
          <div><label>PROJECT NAME</label><input id="ax-project" type="text"></div>
          <div><label>SHEET LABEL</label><input id="ax-sheet" type="text" placeholder="e.g. A-101"></div>
          <div><label>PAGE NUMBER</label><input id="ax-page" type="number" value="1" min="1"></div>
          <div><label>ORIGINAL DRAWING (PDF)</label><input id="ax-original" type="file" accept="application/pdf"></div>
          <div><label>AS-BUILT / REVISED (PDF)</label><input id="ax-revised" type="file" accept="application/pdf"></div>
        </div>
        <button id="ax-analyze-btn" class="button primary" style="height:42px;margin-top:16px">COMPUTE DIFF</button>
        <div class="step-log" id="ax-log"></div>
      </div>
      <div class="card" id="ax-result" style="display:none">
        <div class="result-row">
          <span id="ax-summary"></span>
          <a id="ax-download" class="button primary" href="#" target="_blank">DOWNLOAD HEATMAP PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      AsBuiltX is available standalone at $199/mo or as part of TakeoffX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('ax-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    document.getElementById('ax-analyze-btn').addEventListener('click', async () => {
      const btn = document.getElementById('ax-analyze-btn');
      const originalInput = document.getElementById('ax-original');
      const revisedInput = document.getElementById('ax-revised');
      log.innerHTML = '';
      document.getElementById('ax-result').style.display = 'none';
      if (!originalInput.files.length || !revisedInput.files.length) { logLine('Choose both PDFs first.', 'err'); return; }
      const fd = new FormData();
      fd.append('original', originalInput.files[0]);
      fd.append('revised', revisedInput.files[0]);
      fd.append('projectName', document.getElementById('ax-project').value.trim());
      fd.append('sheetLabel', document.getElementById('ax-sheet').value.trim());
      fd.append('page', document.getElementById('ax-page').value || '1');
      btn.disabled = true;
      logLine('Rendering pages and computing diff...');
      try {
        const res = await fetch('/api/asbuilt-diffs/analyze', { method: 'POST', headers: authHeaders(false), body: fd });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'diff failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('ax-summary').textContent = data.overallDiffPercent + '% overall pixel difference';
        document.getElementById('ax-download').href = data.downloadUrl;
        document.getElementById('ax-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/asbuilt-diffs/analyze', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('ax-signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include AsBuiltX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
      } catch (e) {
        document.getElementById('ax-signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_leadx() {
    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <title>LeadX | Lead Qualification Engine</title>
  <style>
    :root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"Avenir Next","Helvetica Neue",sans-serif}
    .shell{position:relative;max-width:900px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}
    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}
    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}
    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900}
    .brand b{display:block;letter-spacing:.16em}
    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}
    .nav{display:flex;gap:8px;flex-wrap:wrap}
    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}
    .nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}
    .button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}
    .button:disabled{opacity:.5;cursor:not-allowed}
    .titlebar{margin:35px 0 25px}
    .eyebrow{color:var(--gold);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
    .titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}
    .titlebar p{max-width:640px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}
    .titlebar .caveat{margin-top:10px;color:var(--red);font-size:12.5px}
    .card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}
    .section-label{color:var(--gold);font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;display:block}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
    label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}
    input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box;font-family:inherit}
    input:focus{outline:none;border-color:var(--gold)}
    .step-log{margin-top:14px;color:var(--muted);font-size:13px}
    .step-log .ok{color:var(--green)}
    .step-log .err{color:var(--red)}
    .note-card{color:var(--muted);font-size:14px;line-height:1.6}
    .note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--gold);font-size:13px}
    .result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
    .stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px}
    .stat-row b{color:var(--text);font-size:18px;display:block}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">LX</span><span><b>LEADX</b><small>LEAD QUALIFICATION ENGINE</small></span></a>
      <nav class="nav">${renderNav("leadx")}</nav>
    </header>
    <div class="titlebar">
      <div class="eyebrow">LEAD QUALIFICATION ENGINE</div>
      <h1>LeadX</h1>
      <p>Scores the live opportunities HuntX already crawls (TXDOT + CA OPSC open data) against your saved criteria - minimum value, keywords, and locations - and generates a qualified-leads report.</p>
      <p class="caveat">Scoring is three simple, explainable rules, not an AI judgment of project quality or win probability.</p>
      <a class="button primary" id="lx-signin-btn" href="/login?redirect=/leadx" style="display:none">SIGN IN</a>
    </div>

    <div id="app" style="display:none">
      <div class="card">
        <span class="section-label">QUALIFICATION CRITERIA</span>
        <div class="form-grid">
          <div><label>MINIMUM VALUE ($)</label><input id="lx-min-value" type="number" min="0" placeholder="e.g. 500000"></div>
          <div><label>KEYWORDS (COMMA-SEPARATED)</label><input id="lx-keywords" type="text" placeholder="e.g. door, hardware, school"></div>
          <div><label>LOCATIONS (COMMA-SEPARATED)</label><input id="lx-locations" type="text" placeholder="e.g. Travis, Harris, CA"></div>
        </div>
        <button id="lx-save-btn" class="button" style="margin-top:14px">SAVE CRITERIA</button>
        <button id="lx-qualify-btn" class="button primary" style="height:42px;margin-top:14px">RUN QUALIFICATION</button>
        <div class="step-log" id="lx-log"></div>
      </div>
      <div class="card" id="lx-result" style="display:none">
        <div class="result-row">
          <div class="stat-row" id="lx-stats"></div>
          <a id="lx-download" class="button primary" href="#" target="_blank">DOWNLOAD REPORT PDF</a>
        </div>
      </div>
    </div>

    <div class="card note-card" id="guest-note">
      LeadX is available standalone at $249/mo or as part of HuntX Pro. See
      <code>/pricing</code> for licensing, or sign in above if you already have access. Requires an active HuntX seat for opportunity data.
    </div>
  </div>
  <script src="/assets/authfor-integration-standard.js"></script>
  <script>
    const auth = new AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
    function authHeaders(json) {
      const t = auth.getToken();
      const h = t ? { 'Authorization': 'Bearer ' + t } : {};
      if (json) h['Content-Type'] = 'application/json';
      return h;
    }
    const log = document.getElementById('lx-log');
    function logLine(msg, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); }

    async function loadCriteria() {
      try {
        const res = await fetch('/api/leads/criteria', { headers: authHeaders() });
        const data = await res.json();
        if (data.criteria) {
          document.getElementById('lx-min-value').value = data.criteria.min_value || '';
          document.getElementById('lx-keywords').value = data.criteria.keywords || '';
          document.getElementById('lx-locations').value = data.criteria.locations || '';
        }
      } catch (e) {}
    }

    document.getElementById('lx-save-btn').addEventListener('click', async () => {
      logLine('Saving criteria...');
      try {
        const res = await fetch('/api/leads/criteria', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({
          minValue: document.getElementById('lx-min-value').value,
          keywords: document.getElementById('lx-keywords').value.trim(),
          locations: document.getElementById('lx-locations').value.trim()
        }) });
        if (!res.ok) { logLine('Error saving criteria.', 'err'); return; }
        logLine('Criteria saved.', 'ok');
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
    });

    document.getElementById('lx-qualify-btn').addEventListener('click', async () => {
      const btn = document.getElementById('lx-qualify-btn');
      log.innerHTML = '';
      document.getElementById('lx-result').style.display = 'none';
      btn.disabled = true;
      logLine('Scoring current HuntX opportunities...');
      try {
        const res = await fetch('/api/leads/qualify', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({}) });
        const data = await res.json();
        if (!res.ok) { logLine('Error: ' + (data.error && (data.error.message || data.error) || 'qualification failed'), 'err'); btn.disabled = false; return; }
        logLine('Done.', 'ok');
        document.getElementById('lx-stats').innerHTML = '<div><b>' + data.totalScanned + '</b>SCANNED</div><div><b>' + data.qualifiedCount + '</b>QUALIFIED</div>';
        document.getElementById('lx-download').href = data.downloadUrl;
        document.getElementById('lx-result').style.display = 'block';
      } catch (e) {
        logLine('Error: ' + e.message, 'err');
      }
      btn.disabled = false;
    });

    (async () => {
      try {
        const probe = await fetch('/api/leads/criteria', { headers: authHeaders() });
        if (probe.status === 401 || probe.status === 403) {
          document.getElementById('lx-signin-btn').style.display = 'inline-block';
          return;
        }
        if (probe.status === 402) {
          document.getElementById('guest-note').innerHTML = 'You\\'re signed in, but your plan doesn\\'t include LeadX yet. See <code>/pricing</code> to add it.';
          return;
        }
        document.getElementById('app').style.display = 'block';
        document.getElementById('guest-note').style.display = 'none';
        loadCriteria();
      } catch (e) {
        document.getElementById('lx-signin-btn').style.display = 'inline-block';
      }
    })();
  </script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_careers() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>Careers | WeylandAI</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--purple:#a78bfa}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 80% 80%,rgba(167,139,242,.12),transparent 30rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,30px 30px,30px 30px}\n    .shell{position:relative;max-width:1300px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px}\n    .brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n    .mark{width:42px;height:42px;display:grid;place-items:center;background:var(--purple);color:var(--bg);font-weight:900}\n    .brand b{display:block;letter-spacing:.16em}\n    .brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}\n    .nav{display:flex;gap:8px;flex-wrap:wrap}\n    .nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}\n    .nav a:hover,.button:hover{border-color:var(--purple);color:var(--purple)}\n    .button.primary{background:var(--purple);border-color:var(--purple);color:var(--bg);font-weight:900}\n    \n    .titlebar{text-align:center;margin:45px 0 50px}\n    .eyebrow{color:var(--purple);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n    .titlebar h1{font-size:clamp(36px,5vw,62px);letter-spacing:-.05em;line-height:1.05;margin:14px 0}\n    .titlebar p{max-width:700px;color:var(--muted);line-height:1.6;margin:0 auto;font-size:17px}\n    \n    .req-grid{display:grid;gap:20px;margin-top:30px}\n    .req-card{background:rgba(18,20,25,.92);border:1px solid var(--line);border-radius:16px;padding:26px;display:flex;justify-content:space-between;align-items:center;transition:all .2s;flex-wrap:wrap;gap:20px}\n    .req-card:hover{border-color:var(--purple);transform:translateY(-2px);box-shadow:0 15px 40px rgba(0,0,0,.3)}\n    .req-meta span{font:800 10px ui-monospace,monospace;color:var(--purple);display:inline-block;margin-right:12px;text-transform:uppercase}\n    .req-title{font-size:22px;font-weight:800;color:#fff;margin:8px 0 6px}\n    .req-desc{color:var(--muted);font-size:14px;line-height:1.5;max-width:680px;margin:0}\n    .salary-box{text-align:right}\n    .salary-box strong{font-size:20px;color:var(--green);display:block;font-weight:900}\n    .salary-box small{color:var(--muted);font-size:12px;display:block;margin-top:2px}\n    \n    @media(max-width:800px){.req-card{flex-direction:column;align-items:flex-start}.salary-box{text-align:left;width:100%}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">CR</span><span><b>WEYLANDAI</b><small>THE FECUNDITY TALENT VECTOR</small></span></a>\n      <nav class=\"nav\">" + renderNav("careers") + "</nav>\n    </header>\n    <div class=\"titlebar\">\n      <div class=\"eyebrow\">JOIN THE TEAM</div>\n      <h1>We're not hiring through a job board yet.</h1>\n      <p>WeylandAI is a small, early-stage team building construction document automation — HuntX, SubX, TakeoffX, PropX, and SightX on one shared project record. If you want to work on real construction AI with a founder-led team, reach out directly with what you'd want to build and why.</p>\n      <p style=\"margin-top:24px\"><a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=Interested%20in%20WeylandAI\">EMAIL HELLO@WEYLANDAI.COM</a></p>\n    </div>\n  </div>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_sightx() {
    return new Response("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>SightX | WeylandAI Site Vision Demonstrator</title>\n  <meta name=\"description\" content=\"Explore the SightX construction-vision demonstrator: a navigable WeylandAI facility with automated openings and site intelligence overlays.\">\n  <link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f0b800'/><path d='M13 16h8l6 28h-8zm15 0h8l4 17 4-17h8l-8 28h-8z' fill='%23090a0d'/></svg>\">\n  \n  <!-- Premium Typography -->\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Outfit:wght@300;400;600&display=swap\" rel=\"stylesheet\">\n  <link rel=\"stylesheet\" href=\"/assets/sightx-controls.css?v=20260729-3\">\n  <link rel=\"stylesheet\" href=\"/assets/sightx-experience.css?v=20260729-3\">\n  <link rel=\"stylesheet\" href=\"/assets/sightx-ingest.css?v=20260729-3\">\n  <link rel=\"stylesheet\" href=\"/assets/sightx-reconstruction.css?v=20260729-1\">\n  <link rel=\"stylesheet\" href=\"/assets/sightx-runtime.css?v=20260813-1\">\n  \n  <style>\n    :root {\n      --color-primary: #f0b800;\n      --color-accent: #d9e2e8;\n      --void-glow: rgba(240, 184, 0, 0.24);\n    }\n    \n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n    \n    body {\n      font-family: 'Outfit', sans-serif;\n      background: #030305;\n      color: #f0f0f5;\n      overflow-x: hidden;\n      min-height: 100vh;\n    }\n    \n    #bg-canvas {\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100vw;\n      height: 100vh;\n      z-index: 1;\n      transition: filter 1.0s cubic-bezier(0.4, 0, 0.2, 1);\n      filter: brightness(0.45) blur(4px);\n    }\n    \n    #bg-canvas.interactive {\n      filter: brightness(1.0) blur(0px);\n      cursor: crosshair;\n    }\n\n    body.sightx-demo #bg-canvas {\n      filter: brightness(1.0) blur(0px);\n      cursor: crosshair;\n    }\n\n    body.sightx-demo #app-container {\n      display: none;\n    }\n    \n    #app-container {\n      position: relative;\n      z-index: 2;\n      display: flex;\n      flex-direction: column;\n      min-height: 100vh;\n      backdrop-filter: blur(8px);\n      transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);\n      opacity: 1;\n      transform: scale(1);\n    }\n    \n    #app-container.hidden {\n      opacity: 0;\n      pointer-events: none;\n      transform: scale(0.98);\n    }\n    \n    header {\n      padding: 25px 40px;\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n    }\n    \n    .logo {\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 24px;\n      font-weight: 700;\n      color: var(--color-primary);\n      text-shadow: 0 0 10px var(--void-glow);\n      letter-spacing: 2px;\n    }\n    \n    .logo span {\n      color: rgba(217, 226, 232, 0.58);\n      font-weight: 300;\n      letter-spacing: 1px;\n    }\n    \n    .status-badge {\n      background: rgba(240, 184, 0, 0.05);\n      border: 1px solid rgba(240, 184, 0, 0.2);\n      padding: 8px 16px;\n      border-radius: 20px;\n      font-size: 13px;\n      display: flex;\n      align-items: center;\n      gap: 8px;\n      font-family: 'Space Grotesk', sans-serif;\n    }\n    \n    .status-dot {\n      width: 8px;\n      height: 8px;\n      background: var(--color-primary);\n      border-radius: 50%;\n      box-shadow: 0 0 8px var(--color-primary);\n    }\n    \n    main {\n      flex: 1;\n      max-width: 800px;\n      margin: 0 auto;\n      width: 100%;\n      padding: 40px 20px;\n      display: flex;\n      flex-direction: column;\n      justify-content: center;\n    }\n    \n    .slideshow-container {\n      position: relative;\n      background: rgba(10, 10, 15, 0.85);\n      border: 1px solid rgba(240, 184, 0, 0.15);\n      border-radius: 20px;\n      padding: 40px;\n      box-shadow: 0 20px 40px rgba(0,0,0,0.6);\n      min-height: 380px;\n      display: flex;\n      flex-direction: column;\n    }\n    \n    .slide {\n      display: none;\n      flex-direction: column;\n      flex: 1;\n      animation: fadeIn 0.4s ease-out forwards;\n    }\n    \n    .slide.active {\n      display: flex;\n    }\n    \n    @keyframes fadeIn {\n      from { opacity: 0; transform: translateY(5px); }\n      to { opacity: 1; transform: translateY(0); }\n    }\n    \n    .category-label {\n      display: inline-block;\n      padding: 6px 12px;\n      background: rgba(240, 184, 0, 0.08);\n      border: 1px solid var(--color-primary);\n      color: var(--color-primary);\n      border-radius: 30px;\n      font-size: 11px;\n      font-weight: 600;\n      margin-bottom: 20px;\n      text-transform: uppercase;\n      letter-spacing: 1.5px;\n      align-self: flex-start;\n      font-family: 'Space Grotesk', sans-serif;\n    }\n    \n    h1 {\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 38px;\n      margin-bottom: 18px;\n      line-height: 1.1;\n      color: #fff;\n    }\n    \n    .purpose-text {\n      font-size: 16px;\n      line-height: 1.6;\n      color: #b0b0c5;\n      margin-bottom: 25px;\n    }\n    \n    .product-grid {\n      display: grid;\n      grid-template-columns: 1fr 1fr;\n      gap: 15px;\n      margin-top: 10px;\n    }\n    \n    .product-box {\n      background: rgba(255,255,255,0.01);\n      border: 1px solid rgba(255,255,255,0.04);\n      border-radius: 12px;\n      padding: 16px;\n      transition: all 0.2s;\n    }\n    \n    .product-box:hover {\n      border-color: rgba(240, 184, 0, 0.2);\n      background: rgba(240, 184, 0, 0.02);\n    }\n    \n    .product-title {\n      font-family: 'Space Grotesk', sans-serif;\n      font-weight: 700;\n      color: var(--color-primary);\n      font-size: 15px;\n      margin-bottom: 6px;\n    }\n    \n    .product-desc {\n      font-size: 12px;\n      color: #808095;\n      line-height: 1.4;\n    }\n    \n    /* Interactive Widget */\n    .widget-title {\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 18px;\n      font-weight: 700;\n      margin-bottom: 15px;\n      color: var(--color-primary);\n      display: flex;\n      align-items: center;\n      gap: 10px;\n    }\n    \n    .console-box {\n      flex: 1;\n      background: #020204;\n      border: 1px solid rgba(240,184,0,0.1);\n      border-radius: 10px;\n      padding: 15px;\n      font-family: 'Space Grotesk', monospace;\n      font-size: 13px;\n      color: var(--color-primary);\n      min-height: 180px;\n      overflow-y: auto;\n      margin-bottom: 15px;\n      box-shadow: inset 0 0 10px rgba(0,0,0,0.8);\n    }\n    \n    .console-input-row {\n      display: flex;\n      gap: 10px;\n    }\n    \n    .console-input {\n      flex: 1;\n      background: #020204;\n      border: 1px solid rgba(255,255,255,0.1);\n      border-radius: 8px;\n      padding: 10px 14px;\n      color: #fff;\n      font-family: monospace;\n      outline: none;\n      font-size: 13px;\n    }\n    \n    .console-input:focus {\n      border-color: var(--color-primary);\n    }\n    \n    .console-btn {\n      background: var(--color-primary);\n      border: none;\n      color: #000;\n      padding: 10px 20px;\n      border-radius: 8px;\n      font-weight: 700;\n      cursor: pointer;\n      font-family: 'Space Grotesk', sans-serif;\n      transition: all 0.2s;\n    }\n    \n    .console-btn:hover {\n      box-shadow: 0 0 12px var(--color-primary);\n    }\n    \n    .portal-trigger {\n      margin-top: 15px;\n      text-align: center;\n    }\n    \n    .portal-btn {\n      display: inline-block;\n      text-decoration: none;\n      color: #808095;\n      font-size: 12px;\n      padding: 8px 16px;\n      border-radius: 30px;\n      border: 1px solid rgba(255,255,255,0.1);\n      transition: all 0.2s;\n    }\n    \n    .portal-btn:hover {\n      color: #fff;\n      border-color: var(--color-accent);\n    }\n    \n    /* Product Footer Browser styling */\n    .product-footer-browser {\n      margin-top: 30px;\n      border-top: 1px solid rgba(255, 255, 255, 0.05);\n      padding-top: 20px;\n      display: flex;\n      justify-content: center;\n    }\n    \n    .product-tabs {\n      display: flex;\n      gap: 10px;\n      flex-wrap: wrap;\n      justify-content: center;\n    }\n    \n    .product-tab {\n      background: rgba(255, 255, 255, 0.02);\n      border: 1px solid rgba(255, 255, 255, 0.08);\n      color: #808095;\n      padding: 10px 20px;\n      border-radius: 8px;\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 11px;\n      font-weight: 600;\n      letter-spacing: 1px;\n      cursor: pointer;\n      transition: all 0.2s;\n    }\n    \n    .product-tab:hover {\n      border-color: var(--color-primary);\n      color: #fff;\n    }\n    \n    .product-tab.active {\n      background: var(--color-primary);\n      color: #000;\n      border-color: var(--color-primary);\n      box-shadow: 0 0 10px rgba(240, 184, 0, 0.2);\n    }\n    \n    /* Fleet browser drawer */\n    .fleet-browser-container {\n      position: relative;\n      width: 100%;\n    }\n    \n    .fleet-drawer {\n      position: fixed;\n      bottom: 0;\n      left: 0;\n      width: 100vw;\n      background: rgba(6, 6, 9, 0.97);\n      border-top: 1px solid var(--color-primary);\n      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.8);\n      z-index: 998;\n      max-height: 0;\n      overflow: hidden;\n      transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);\n      backdrop-filter: blur(15px);\n    }\n    \n    .fleet-drawer.open {\n      max-height: 280px;\n    }\n    \n    .fleet-drawer-header {\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      padding: 15px 40px;\n      border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n    }\n    \n    .fleet-drawer-title {\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 13px;\n      letter-spacing: 2px;\n      color: var(--color-accent);\n      font-weight: 700;\n      text-transform: uppercase;\n    }\n    \n    .close-drawer-btn {\n      background: none;\n      border: none;\n      color: #808095;\n      font-size: 18px;\n      cursor: pointer;\n      transition: color 0.2s;\n    }\n    \n    .close-drawer-btn:hover {\n      color: #fff;\n    }\n    \n    .fleet-links-grid {\n      display: grid;\n      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n      gap: 10px;\n      padding: 20px 40px;\n      overflow-y: auto;\n      max-height: 200px;\n    }\n    \n    .fleet-link {\n      color: #808095;\n      text-decoration: none;\n      font-size: 12px;\n      padding: 10px 14px;\n      background: rgba(255, 255, 255, 0.02);\n      border: 1px solid rgba(255, 255, 255, 0.05);\n      border-radius: 8px;\n      transition: all 0.2s;\n      font-family: 'Space Grotesk', sans-serif;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n      overflow: hidden;\n      text-align: left;\n    }\n    \n    .fleet-link:hover {\n      background: rgba(240, 184, 0, 0.08);\n      border-color: var(--color-primary);\n      color: #fff;\n      transform: translateY(-2px);\n    }\n    \n    .cat-chips {\n      display: flex;\n      flex-wrap: wrap;\n      justify-content: center;\n      gap: 6px;\n    }\n    \n    .cat-chip {\n      display: inline-block;\n      font-size: 11px;\n      padding: 6px 12px;\n      background: rgba(255,255,255,0.02);\n      border: 1px solid rgba(255,255,255,0.05);\n      color: #808095;\n      border-radius: 30px;\n      cursor: pointer;\n      transition: all 0.2s;\n      font-family: 'Space Grotesk', sans-serif;\n    }\n    \n    .cat-chip:hover, .cat-chip.active {\n      background: rgba(240, 184, 0, 0.08);\n      color: var(--color-primary);\n      border-color: var(--color-primary);\n    }\n    \n    footer {\n      border-top: 1px solid rgba(255, 255, 255, 0.05);\n      padding: 30px 40px;\n      background: rgba(5,5,8,0.9);\n      text-align: center;\n    }\n    \n    .footer-text {\n      color: #606075;\n      font-size: 12px;\n      line-height: 1.6;\n    }\n    \n    /* Play Mode HUD Hints */\n    #hint {\n      position: fixed;\n      top: 20px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: 10;\n      background: rgba(0, 0, 0, 0.85);\n      border: 1px solid rgba(255, 255, 255, 0.1);\n      padding: 8px 16px;\n      border-radius: 20px;\n      font-family: 'Space Grotesk', monospace;\n      font-size: 11px;\n      letter-spacing: 1px;\n      color: #888;\n      pointer-events: none;\n      transition: opacity 0.3s;\n    }\n    \n    /* High-tech HUD Hardware Proximity Modal */\n    .hud-modal {\n      position: fixed;\n      bottom: 40px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: 5;\n      background: linear-gradient(180deg, rgba(9, 9, 11, 0.95) 0%, rgba(3, 3, 5, 0.98) 100%);\n      border: 1px solid var(--color-primary);\n      box-shadow: 0 0 25px rgba(240, 184, 0, 0.25);\n      padding: 22px;\n      border-radius: 12px;\n      width: 90%;\n      max-width: 450px;\n      font-family: 'Space Grotesk', monospace;\n      color: #fff;\n      backdrop-filter: blur(10px);\n      animation: hud-reveal 0.3s cubic-bezier(0.19, 1, 0.22, 1);\n    }\n    \n    @keyframes hud-reveal {\n      from { transform: translate(-50%, 20px); opacity: 0; }\n      to { transform: translate(-50%, 0); opacity: 1; }\n    }\n    \n    .hud-scanner {\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 2px;\n      background: var(--color-primary);\n      box-shadow: 0 0 8px var(--color-primary);\n      animation: scan 1.5s linear infinite;\n    }\n    \n    @keyframes scan {\n      0% { top: 0%; opacity: 0; }\n      10% { opacity: 1; }\n      90% { opacity: 1; }\n      100% { top: 100%; opacity: 0; }\n    }\n    \n    .hud-header {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      border-bottom: 1px solid rgba(240, 184, 0, 0.2);\n      padding-bottom: 10px;\n      margin-bottom: 12px;\n    }\n    \n    .hud-icon {\n      font-size: 18px;\n    }\n    \n    .hud-title {\n      font-weight: 700;\n      color: var(--color-primary);\n      letter-spacing: 1px;\n      font-size: 14px;\n    }\n    \n    .hud-body {\n      font-size: 13px;\n      line-height: 1.5;\n    }\n    \n    .hud-label {\n      color: #808095;\n      margin-bottom: 5px;\n      font-size: 11px;\n      text-transform: uppercase;\n      letter-spacing: 0.5px;\n    }\n    \n    .hud-value {\n      color: #f0f0f5;\n      margin-bottom: 10px;\n    }\n    \n    .hud-sub {\n      color: var(--color-accent);\n      font-size: 11px;\n      border-top: 1px solid rgba(255, 255, 255, 0.05);\n      padding-top: 12px;\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n    }\n    \n    .hud-sub a {\n      color: var(--color-accent);\n      text-decoration: none;\n      border: 1px solid var(--color-accent);\n      padding: 3px 8px;\n      border-radius: 4px;\n      background: rgba(0, 229, 255, 0.05);\n      transition: all 0.2s;\n    }\n    \n    .hud-sub a:hover {\n      color: #fff;\n      border-color: #fff;\n      background: rgba(0, 229, 255, 0.15);\n      box-shadow: 0 0 8px var(--color-accent);\n    }\n    \n    /* Login Screen Modal Overlay */\n    #os-login-modal {\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100vw;\n      height: 100vh;\n      background: rgba(3, 3, 5, 0.95);\n      z-index: 999;\n      display: none;\n      justify-content: center;\n      align-items: center;\n      backdrop-filter: blur(15px);\n    }\n    \n    .login-box {\n      width: 100%;\n      max-width: 400px;\n      background: rgba(10, 10, 15, 0.85);\n      border: 1px solid rgba(240, 184, 0, 0.2);\n      border-radius: 20px;\n      padding: 40px;\n      box-shadow: 0 20px 40px rgba(0,0,0,0.8);\n      text-align: center;\n    }\n    \n    .login-box h2 {\n      font-family: 'Space Grotesk', sans-serif;\n      font-size: 30px;\n      margin-bottom: 10px;\n      color: var(--color-primary);\n    }\n    \n    .login-box p {\n      color: #808095;\n      font-size: 13px;\n      margin-bottom: 30px;\n    }\n    \n    .login-input {\n      width: 100%;\n      background: #020204;\n      border: 1px solid rgba(240,184,0,0.2);\n      border-radius: 10px;\n      padding: 12px 16px;\n      color: #fff;\n      font-size: 15px;\n      margin-bottom: 15px;\n      outline: none;\n      font-family: monospace;\n    }\n    \n    .login-input:focus {\n      border-color: var(--color-accent);\n    }\n    \n    .login-button {\n      width: 100%;\n      background: var(--color-primary);\n      color: #000;\n      border: none;\n      padding: 12px 20px;\n      border-radius: 10px;\n      font-size: 16px;\n      font-weight: 700;\n      cursor: pointer;\n      transition: all 0.2s;\n      font-family: 'Space Grotesk', sans-serif;\n    }\n    \n    .login-button:hover {\n      box-shadow: 0 0 15px var(--color-primary);\n    }\n    \n    .close-modal {\n      margin-top: 15px;\n      font-size: 13px;\n      color: #606075;\n      cursor: pointer;\n    }\n    \n    .close-modal:hover {\n      color: #fff;\n    }\n\n    /* Mobile media queries */\n    @media (max-width: 600px) {\n      header {\n        padding: 15px 20px;\n      }\n      .logo {\n        font-size: 20px;\n      }\n      h1 {\n        font-size: 28px;\n      }\n      .purpose-text {\n        font-size: 14px;\n        line-height: 1.5;\n      }\n      .slideshow-container {\n        padding: 20px;\n        min-height: auto;\n      }\n      .product-grid {\n        grid-template-columns: 1fr;\n      }\n      .product-tab {\n        padding: 8px 12px;\n        font-size: 10px;\n      }\n      .hud-modal {\n        bottom: 20px;\n        padding: 15px;\n      }\n      .fleet-drawer-header { padding: 15px 20px; }\n      .fleet-links-grid { padding: 15px 20px; grid-template-columns: 1fr; }\n    }\n  </style>\n</head>\n<body class=\"sightx-demo\">\n  \n  <!-- The Playable WebGL Canvas -->\n  <canvas id=\"bg-canvas\"></canvas>\n  \n  <div id=\"hint\">CLICK to capture mouse</div>\n  \n  <!-- High-tech HUD Hardware Proximity Modal -->\n  <div id=\"hardware-modal\" class=\"hud-modal\" style=\"display: none;\">\n    <div class=\"hud-scanner\"></div>\n    <div class=\"hud-header\">\n      <span class=\"hud-icon\">SX</span>\n      <span class=\"hud-title\" id=\"hud-door-name\">DOORWAY PROXIMITY SIGNAL</span>\n    </div>\n    <div class=\"hud-body\">\n      <div class=\"hud-label\">Hardware Schedule:</div>\n      <div class=\"hud-value\" id=\"hud-door-hardware\">Extracting specifications...</div>\n      <div class=\"hud-sub\">\n        <span>Verified via SubX Platform</span>\n        <a href=\"https://precisionautodoors.com\" target=\"_blank\">Precision Auto Doors</a>\n      </div>\n    </div>\n  </div>\n  \n  <div id=\"app-container\">\n    <header>\n      <div class=\"logo\">WEYLAND<span>AI</span></div>\n      <div class=\"status-badge\">\n        <div class=\"status-dot\"></div>\n        <span>Build Network Online</span>\n      </div>\n    </header>\n    \n    <main>\n      <div class=\"slideshow-container\" id=\"slideshow\">\n        \n        <!-- Slide 0: Overview -->\n        <div class=\"slide active\">\n          <div class=\"category-label\">Autonomous Construction</div>\n          <h1>Build at machine scale.</h1>\n          <p class=\"purpose-text\">WeylandAI unifies project intelligence, computer vision, autonomous equipment, and robotic trade crews in one construction operating system. We take a build from opportunity discovery through verified completion with less delay, waste, and coordination loss.</p>\n        </div>\n        \n        <!-- Slide 1: Project intelligence -->\n        <div class=\"slide\">\n          <div class=\"category-label\">Project Intelligence</div>\n          <h1>See the work before it begins.</h1>\n          <p class=\"purpose-text\">Our intelligence pipeline discovers viable projects, maps subcontractor capacity, reads plans and imagery, quantifies scope, and turns uncertainty into an executable construction plan.</p>\n          <div class=\"product-grid\">\n            <div class=\"product-box\">\n              <div class=\"product-title\">HuntX + SubX</div>\n              <div class=\"product-desc\">Opportunity discovery, qualification, capacity mapping, and subcontractor intelligence.</div>\n            </div>\n            <div class=\"product-box\">\n              <div class=\"product-title\">SightX + TakeoffX</div>\n              <div class=\"product-desc\">Site vision, dimension extraction, material quantities, hazards, and automated estimates.</div>\n            </div>\n          </div>\n        </div>\n        \n        <!-- Slide 2: Robotics -->\n        <div class=\"slide\">\n          <div class=\"category-label\">Robotic Field Systems</div>\n          <h1>Autonomous crews. Coordinated as one.</h1>\n          <p class=\"purpose-text\">WeylandAI coordinates earthwork, concrete, framing, masonry, roofing, electrical, and plumbing systems against the same live model, schedule, safety envelope, and quality record.</p>\n          <div class=\"product-grid\">\n            <div class=\"product-box\">\n              <div class=\"product-title\">Earthwork Fleet</div>\n              <div class=\"product-desc\">GPS/RTK-guided excavation, grading, trenching, telemetry, and obstacle avoidance.</div>\n            </div>\n            <div class=\"product-box\">\n              <div class=\"product-title\">Trade Crews</div>\n              <div class=\"product-desc\">Repeatable robotic installation with code, tolerance, and quality verification.</div>\n            </div>\n          </div>\n        </div>\n        \n        <!-- Slide 3: Computing -->\n        <div class=\"slide\">\n          <div class=\"category-label\">Construction Operating System</div>\n          <h1>One control plane for every site.</h1>\n          <p class=\"purpose-text\">A shared digital thread connects plans, bids, equipment, crews, progress evidence, safety findings, and client reporting. Every completed project makes the next project faster and more predictable.</p>\n        </div>\n        \n        <!-- Slide 4: Secure Console -->\n        <div class=\"slide\">\n          <div class=\"widget-card\">\n            <div class=\"widget-title\">\n              <span>&gt;_</span> Project Console\n            </div>\n            <div class=\"console-box\" id=\"console-display\">\n              System initialized.<br>\n              Category: Construction / Automation<br>\n              Status: READY<br>\n              Type 'help' to begin...<br>\n              <br>\n              &gt;\n            </div>\n            <div class=\"console-input-row\">\n              <input type=\"text\" class=\"console-input\" id=\"console-cmd\" placeholder=\"Type a command...\">\n              <button class=\"console-btn\" onclick=\"executeCommand()\">Run</button>\n            </div>\n            <div class=\"portal-trigger\">\n              <a href=\"#\" class=\"portal-btn\" onclick=\"openLoginModal()\">Access Client Workspace</a>\n            </div>\n          </div>\n        </div>\n        \n      </div>\n      \n      <!-- Product Footer Browser (SPA tabs) -->\n      <div class=\"product-footer-browser\">\n        <div class=\"product-tabs\">\n          <button class=\"product-tab active\" onclick=\"goToSlide(0)\">OVERVIEW</button>\n          <button class=\"product-tab\" onclick=\"goToSlide(1)\">INTELLIGENCE</button>\n          <button class=\"product-tab\" onclick=\"goToSlide(2)\">FIELD FLEET</button>\n          <button class=\"product-tab\" onclick=\"goToSlide(3)\">BUILD OS</button>\n          <button class=\"product-tab\" onclick=\"goToSlide(4)\">CLIENT CONSOLE</button>\n        </div>\n      </div>\n    </main>\n    \n    <footer>\n      <div class=\"footer-text\">\n        <div class=\"fleet-browser-container\">\n          <div class=\"fleet-drawer\" id=\"fleet-drawer\">\n            <div class=\"fleet-drawer-header\">\n              <div class=\"fleet-drawer-title\" id=\"fleet-drawer-title\">Explore Fleet Category</div>\n              <button class=\"close-drawer-btn\" onclick=\"closeFleetDrawer()\">✕</button>\n            </div>\n            <div class=\"fleet-links-grid\" id=\"fleet-links-grid\"></div>\n          </div>\n          \n          <div class=\"network-tray\" style=\"margin-bottom: 25px;\">\n            <div class=\"network-tray-title\">Explore the MobCorp Venture Fleet</div>\n            <div class=\"cat-chips\">\n              <span class=\"cat-chip\" onclick=\"toggleFleetCategory('AI')\">AI</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Agents')\">Agents</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Business')\">Business</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Corporate')\">Corporate</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Defense')\">Defense</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Dev Tools')\">Dev Tools</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Education')\">Education</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Finance')\">Finance</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Health')\">Health</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Media')\">Media</span> <span class=\"cat-chip\" onclick=\"toggleFleetCategory('Science')\">Science</span> \n            </div>\n          </div>\n        </div>\n        \n        <p>This venture is a canonical node of the MobCorp Autonomous Network. All rights reserved.</p>\n      </div>\n    </footer>\n  </div>\n\n  <!-- The Login Screen Modal Overlay -->\n  <div id=\"os-login-modal\">\n    <div class=\"login-box\">\n      <h2>WeylandAI Client Workspace</h2>\n      <p>Projects, sites, crews, and evidence in one operating view.</p>\n      <input type=\"email\" class=\"login-input\" id=\"modal-email\" placeholder=\"Email / Username\">\n      <input type=\"password\" class=\"login-input\" id=\"modal-pass\" placeholder=\"Authorization Code\">\n      <button class=\"login-button\" onclick=\"submitAuth()\">Sign In</button>\n      <div class=\"close-modal\" onclick=\"closeLoginModal()\">Cancel</div>\n    </div>\n  </div>\n\n  <script src=\"/assets/sightx-controls.js?v=20260729-3\"></script>\n  <script src=\"/assets/sightx-experience.js?v=20260729-3\"></script>\n  <script src=\"/assets/sightx-ingest.js?v=20260729-3\"></script>\n  <script src=\"/assets/sightx-runtime.js?v=20260813-1\"></script>\n  <script>\n    // ── Slideshow SPA Navigation ─────────────────────────────────────────────\n    let currentSlide = 0;\n    const slides = document.querySelectorAll('.slide');\n    const tabs = document.querySelectorAll('.product-tab');\n    \n    function goToSlide(index) {\n      slides[currentSlide].classList.remove('active');\n      tabs[currentSlide].classList.remove('active');\n      currentSlide = (index + slides.length) % slides.length;\n      slides[currentSlide].classList.add('active');\n      tabs[currentSlide].classList.add('active');\n      resetIdleTimer();\n    }\n\n    // Keyboard navigation for Weyland slides (when console isn't focused)\n    document.addEventListener('keydown', (e) => {\n      if (document.pointerLockElement) return;\n      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;\n      if (e.key === 'ArrowLeft') {\n        goToSlide(currentSlide - 1);\n      } else if (e.key === 'ArrowRight') {\n        goToSlide(currentSlide + 1);\n      }\n    });\n\n    // ── Console Simulator ────────────────────────────────────────────────────\n    const consoleDisplay = document.getElementById('console-display');\n    const consoleCmd = document.getElementById('console-cmd');\n    \n    consoleCmd.addEventListener('keydown', (e) => {\n      if (e.key === 'Enter') executeCommand();\n    });\n\n    function executeCommand() {\n      const cmd = consoleCmd.value.trim().toLowerCase();\n      if (!cmd) return;\n      \n      let response = '';\n      if (cmd === 'help') {\n        response = 'Available commands:\\\n' +\n                   '  status   - View current system status\\\n' +\n                   '  fleet    - Check autonomous crew status\\\n' +\n                   '  projects - List active project sites\\\n' +\n                   '  clear    - Clear console screen';\n      } else if (cmd === 'status') {\n        response = 'System: weylandai.com\\\n' +\n                   'Status: ONLINE\\\n' +\n                   'Category: Construction / Automation\\\n' +\n                   'Operational Integrity: 100% (READY)\\\n' +\n                   'Pipeline: HuntX > SubX > SightX > TakeoffX > PropX > QText';\n      } else if (cmd === 'fleet') {\n        response = 'Autonomous Crew Status:\\\n' +\n                   '  - Earthwork systems: READY\\\n' +\n                   '  - Concrete and framing systems: READY\\\n' +\n                   '  - Trade installation systems: READY\\\n' +\n                   'All telemetry channels operational.';\n      } else if (cmd === 'projects') {\n        response = 'Project Network:\\\n' +\n                   '  - Site intelligence: ACTIVE\\\n' +\n                   '  - Estimation pipeline: ACTIVE\\\n' +\n                   '  - Field coordination: ACTIVE';\n      } else if (cmd === 'clear') {\n        consoleDisplay.innerHTML = '&gt; ';\n        consoleCmd.value = '';\n        return;\n      } else {\n        response = 'Unknown command: \"' + cmd + '\". Type \"help\" for a list of commands.';\n      }\n      \n      consoleDisplay.innerHTML += cmd + '<br>' + response.replace(/\\\n/g, '<br>') + '<br><br>&gt; ';\n      consoleDisplay.scrollTop = consoleDisplay.scrollHeight;\n      consoleCmd.value = '';\n    }\n\n    function openLoginModal() {\n      document.getElementById('os-login-modal').style.display = 'flex';\n    }\n    \n    function closeLoginModal() {\n      document.getElementById('os-login-modal').style.display = 'none';\n    }\n    \n    function submitAuth() {\n      const email = document.getElementById('modal-email').value;\n      const pass = document.getElementById('modal-pass').value;\n      if (!email || !pass) {\n        alert('Credentials required.');\n        return;\n      }\n      alert('Secure Portal connection timed out. Please check your credentials and try again.');\n    }\n\n    // ── Fleet Browser Logic ──────────────────────────────────────────────────\n    const FLEET_DATA = {\"Defense\": [{\"domain\": \"abstergo.cc\", \"name\": \"abstergo_cc\"}, {\"domain\": \"areshiva.com\", \"name\": \"areshiva_com\"}, {\"domain\": \"draknir.com\", \"name\": \"draknir_com\"}, {\"domain\": \"draugr.cc\", \"name\": \"draugr_cc\"}, {\"domain\": \"malathor.com\", \"name\": \"malathor_com\"}, {\"domain\": \"valdring.com\", \"name\": \"valdring_com\"}, {\"domain\": \"valkrai.com\", \"name\": \"valkrai_com\"}, {\"domain\": \"ventraleye.com\", \"name\": \"ventraleye_com\"}, {\"domain\": \"watchforce.cc\", \"name\": \"watchforce_cc\"}], \"Finance\": [{\"domain\": \"accountdrac.com\", \"name\": \"accountdrac_com\"}, {\"domain\": \"bitdoggo.com\", \"name\": \"bitdoggo_com\"}, {\"domain\": \"bondwright.com\", \"name\": \"bondwright_com\"}, {\"domain\": \"bookeepr.cc\", \"name\": \"bookeepr_cc\"}, {\"domain\": \"cryptosmart.cc\", \"name\": \"cryptosmart_cc\"}, {\"domain\": \"encoverai.com\", \"name\": \"encoverai_com\"}, {\"domain\": \"equifiant.com\", \"name\": \"equifiant_com\"}, {\"domain\": \"fedbank.cc\", \"name\": \"fedbank_cc\"}, {\"domain\": \"fundyai.com\", \"name\": \"fundyai_com\"}, {\"domain\": \"greenhandcapital.com\", \"name\": \"greenhandcapital_com\"}, {\"domain\": \"mobcoin.cc\", \"name\": \"mobcoin_cc\"}, {\"domain\": \"quanticfork.com\", \"name\": \"quanticfork_com\"}, {\"domain\": \"selfcoin.cc\", \"name\": \"selfcoin_cc\"}, {\"domain\": \"vendyai.com\", \"name\": \"vendyai_com\"}], \"Agents\": [{\"domain\": \"agentropi.com\", \"name\": \"agentropi_com\"}, {\"domain\": \"agentzaar.com\", \"name\": \"agentzaar_com\"}, {\"domain\": \"consenta.cc\", \"name\": \"consenta_cc\"}, {\"domain\": \"entoolize.com\", \"name\": \"entoolize_com\"}, {\"domain\": \"mailguyai.com\", \"name\": \"mailguyai_com\"}, {\"domain\": \"marketingium.com\", \"name\": \"marketingium_com\"}, {\"domain\": \"rebrief.me\", \"name\": \"rebrief_me\"}, {\"domain\": \"salesfactorai.com\", \"name\": \"salesfactorai_com\"}, {\"domain\": \"taskgridai.com\", \"name\": \"taskgridai_com\"}], \"Health\": [{\"domain\": \"agewinder.com\", \"name\": \"agewinder_com\"}, {\"domain\": \"healspell.com\", \"name\": \"healspell_com\"}, {\"domain\": \"lovemaint.com\", \"name\": \"lovemaint_com\"}, {\"domain\": \"meeva.io\", \"name\": \"meeva_io\"}, {\"domain\": \"newgameplus.cc\", \"name\": \"newgameplus_cc\"}, {\"domain\": \"recovai.com\", \"name\": \"recovai_com\"}, {\"domain\": \"sanctuaryui.com\", \"name\": \"sanctuaryui_com\"}, {\"domain\": \"talkingmind.cc\", \"name\": \"talkingmind_cc\"}, {\"domain\": \"workshrinker.com\", \"name\": \"workshrinker_com\"}, {\"domain\": \"youthmend.com\", \"name\": \"youthmend_com\"}], \"AI\": [{\"domain\": \"aicossic.com\", \"name\": \"aicossic_com\"}, {\"domain\": \"americanagi.cc\", \"name\": \"americanagi_cc\"}, {\"domain\": \"americnagi.cc\", \"name\": \"americnagi_cc\"}, {\"domain\": \"bloomagi.cc\", \"name\": \"bloomagi_cc\"}, {\"domain\": \"greybeardai.com\", \"name\": \"greybeardai_com\"}, {\"domain\": \"intfer.cc\", \"name\": \"intfer_cc\"}, {\"domain\": \"legibleweights.com\", \"name\": \"legibleweights_com\"}, {\"domain\": \"legionicai.com\", \"name\": \"legionicai_com\"}, {\"domain\": \"scalarflux.com\", \"name\": \"scalarflux_com\"}, {\"domain\": \"sentiantai.com\", \"name\": \"sentiantai_com\"}, {\"domain\": \"singularityui.com\", \"name\": \"singularityui_com\"}, {\"domain\": \"transcendantai.com\", \"name\": \"transcendantai_com\"}], \"Science\": [{\"domain\": \"aiopencommerce.com\", \"name\": \"aiopencommerce_com\"}, {\"domain\": \"anattar.com\", \"name\": \"anattar_com\"}, {\"domain\": \"conseiv.com\", \"name\": \"conseiv_com\"}, {\"domain\": \"ecofixai.com\", \"name\": \"ecofixai_com\"}, {\"domain\": \"emissionhub.cc\", \"name\": \"emissionhub_cc\"}, {\"domain\": \"enablinghomes.com\", \"name\": \"enablinghomes_com\"}, {\"domain\": \"femptocom.com\", \"name\": \"femptocom_com\"}, {\"domain\": \"galadul.com\", \"name\": \"galadul_com\"}, {\"domain\": \"tenancyai.com\", \"name\": \"tenancyai_com\"}, {\"domain\": \"weylandai.com\", \"name\": \"weylandai_com\"}, {\"domain\": \"yutaniai.com\", \"name\": \"yutaniai_com\"}], \"Media\": [{\"domain\": \"alhena.cc\", \"name\": \"alhena_cc\"}, {\"domain\": \"animetrope.com\", \"name\": \"animetrope_com\"}, {\"domain\": \"audiovizai.com\", \"name\": \"audiovizai_com\"}, {\"domain\": \"book2film.cc\", \"name\": \"book2film_cc\"}, {\"domain\": \"bookclubs.cc\", \"name\": \"bookclubs_cc\"}, {\"domain\": \"danzoa.com\", \"name\": \"danzoa_com\"}, {\"domain\": \"fedtalent.cc\", \"name\": \"fedtalent_cc\"}, {\"domain\": \"filmline.cc\", \"name\": \"filmline_cc\"}, {\"domain\": \"gamegob.com\", \"name\": \"gamegob_com\"}, {\"domain\": \"glyphyai.com\", \"name\": \"glyphyai_com\"}, {\"domain\": \"kubaki.cc\", \"name\": \"kubaki_cc\"}, {\"domain\": \"literacraft.com\", \"name\": \"literacraft_com\"}, {\"domain\": \"mobleybooks.com\", \"name\": \"mobleybooks_com\"}, {\"domain\": \"paintedwhore.cc\", \"name\": \"paintedwhore_cc\"}, {\"domain\": \"pandorachat.cc\", \"name\": \"pandorachat_cc\"}], \"Dev Tools\": [{\"domain\": \"authfor.com\", \"name\": \"authfor_com\"}, {\"domain\": \"devducky.com\", \"name\": \"devducky_com\"}, {\"domain\": \"devtoolai.com\", \"name\": \"devtoolai_com\"}, {\"domain\": \"devtoolbx.com\", \"name\": \"devtoolbx_com\"}, {\"domain\": \"extraterran.com\", \"name\": \"extraterran_com\"}, {\"domain\": \"fystz.com\", \"name\": \"fystz_com\"}, {\"domain\": \"gravnova.com\", \"name\": \"gravnova_com\"}, {\"domain\": \"halside.com\", \"name\": \"halside_com\"}, {\"domain\": \"helmdir.com\", \"name\": \"helmdir_com\"}, {\"domain\": \"powerhost.cc\", \"name\": \"powerhost_cc\"}, {\"domain\": \"syncropy.com\", \"name\": \"syncropy_com\"}, {\"domain\": \"warpdrive.cc\", \"name\": \"warpdrive_cc\"}], \"Education\": [{\"domain\": \"bignice.cc\", \"name\": \"bignice_cc\"}, {\"domain\": \"brynhildai.com\", \"name\": \"brynhildai_com\"}, {\"domain\": \"gurukle.com\", \"name\": \"gurukle_com\"}, {\"domain\": \"leadersclub.cc\", \"name\": \"leadersclub_cc\"}, {\"domain\": \"ownschool.cc\", \"name\": \"ownschool_cc\"}, {\"domain\": \"reasontodate.com\", \"name\": \"reasontodate_com\"}], \"Business\": [{\"domain\": \"dofura.com\", \"name\": \"dofura_com\"}, {\"domain\": \"domainwombat.com\", \"name\": \"domainwombat_com\"}, {\"domain\": \"firmcreate.com\", \"name\": \"firmcreate_com\"}, {\"domain\": \"glcx.cc\", \"name\": \"glcx_cc\"}, {\"domain\": \"helmcorp.cc\", \"name\": \"helmcorp_cc\"}, {\"domain\": \"hildrai.com\", \"name\": \"hildrai_com\"}, {\"domain\": \"industrize.com\", \"name\": \"industrize_com\"}, {\"domain\": \"lawyik.com\", \"name\": \"lawyik_com\"}, {\"domain\": \"patentkin.com\", \"name\": \"patentkin_com\"}, {\"domain\": \"traceformer.com\", \"name\": \"traceformer_com\"}], \"Corporate\": [{\"domain\": \"golfcad.cc\", \"name\": \"golfcad_cc\"}, {\"domain\": \"golfdad.cc\", \"name\": \"golfdad_cc\"}, {\"domain\": \"golflink.cc\", \"name\": \"golflink_cc\"}, {\"domain\": \"golfmind.cc\", \"name\": \"golfmind_cc\"}, {\"domain\": \"helmscorp.cc\", \"name\": \"helmscorp_cc\"}, {\"domain\": \"instantiability.com\", \"name\": \"instantiability_com\"}, {\"domain\": \"mobcorp.cc\", \"name\": \"mobcorp_cc\"}, {\"domain\": \"mobleyhelms.com\", \"name\": \"mobleyhelms_com\"}, {\"domain\": \"mobleymetal.com\", \"name\": \"mobleymetal_com\"}, {\"domain\": \"mobleyreport.com\", \"name\": \"mobleyreport_com\"}, {\"domain\": \"mobleysoft.com\", \"name\": \"mobleysoft_com\"}, {\"domain\": \"roncorp.cc\", \"name\": \"roncorp_cc\"}, {\"domain\": \"ronhelms.cc\", \"name\": \"ronhelms_cc\"}]};\n    const fleetDrawer = document.getElementById('fleet-drawer');\n    const fleetDrawerTitle = document.getElementById('fleet-drawer-title');\n    const fleetLinksGrid = document.getElementById('fleet-links-grid');\n    let activeFleetCat = null;\n\n    function toggleFleetCategory(cat) {\n      if (activeFleetCat === cat) {\n        closeFleetDrawer();\n        return;\n      }\n      \n      activeFleetCat = cat;\n      document.querySelectorAll('.cat-chip').forEach(c => {\n        c.classList.toggle('active', c.textContent.trim() === cat);\n      });\n\n      fleetDrawerTitle.textContent = `${cat.toUpperCase()} FLEET SITES`;\n      fleetLinksGrid.innerHTML = '';\n      \n      const sites = FLEET_DATA[cat] || [];\n      sites.forEach(s => {\n        const a = document.createElement('a');\n        a.href = `https://${s.domain}/`;\n        a.target = '_blank';\n        a.className = 'fleet-link';\n        a.textContent = s.name.replace(/_/g, ' ').toUpperCase();\n        fleetLinksGrid.appendChild(a);\n      });\n      \n      fleetDrawer.classList.add('open');\n      resetIdleTimer();\n    }\n    \n    function closeFleetDrawer() {\n      if (!fleetDrawer) return;\n      fleetDrawer.classList.remove('open');\n      activeFleetCat = null;\n      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));\n    }\n\n    // Close fleet drawer on outside click\n    document.addEventListener('click', (e) => {\n      if (fleetDrawer && !fleetDrawer.contains(e.target) && !e.target.classList.contains('cat-chip')) {\n        closeFleetDrawer();\n      }\n    });\n\n    // ── Interaction & Idle Show/Hide ─────────────────────────────────────────\n    const appContainer = document.getElementById('app-container');\n    const canvas = document.getElementById('bg-canvas');\n    let idleTimer = null;\n    \n    function showUI() {\n      // If pointer is captured (playing SightX), keep UI hidden\n      if (document.pointerLockElement === canvas) return;\n      \n      appContainer.classList.remove('hidden');\n      canvas.classList.remove('interactive');\n      resetIdleTimer();\n    }\n    \n    function hideUI() {\n      appContainer.classList.add('hidden');\n      canvas.classList.add('interactive');\n      closeFleetDrawer();\n    }\n    \n    // Start showing overlay, then let it fade\n    function resetIdleTimer() {\n      clearTimeout(idleTimer);\n      idleTimer = setTimeout(hideUI, 5000); // Hide after 5 seconds idle\n    }\n    \n    // Wire up events\n    document.addEventListener('mousemove', showUI);\n    document.addEventListener('click', showUI);\n    document.addEventListener('keydown', showUI);\n    document.addEventListener('touchstart', showUI);\n    \n    // Prevent hiding while interacting with the overlay\n    appContainer.addEventListener('mousemove', (e) => { e.stopPropagation(); resetIdleTimer(); });\n    appContainer.addEventListener('click', (e) => { e.stopPropagation(); resetIdleTimer(); });\n    appContainer.addEventListener('keydown', (e) => { e.stopPropagation(); resetIdleTimer(); });\n    \n    // SightX is a dedicated, unoccluded product demonstrator.\n    if (document.body.classList.contains('sightx-demo')) {\n      hideUI();\n    } else {\n      resetIdleTimer();\n    }\n\n    // ── WebGL Setup (SightX playable background corridor) ─────────────────────\n    const gl = canvas.getContext('webgl2');\n    let sightxExperience = null;\n    \n    function resize() {\n      const scale = sightxExperience ? sightxExperience.renderScale : Math.min(window.devicePixelRatio, 1.25);\n      canvas.width = Math.floor(window.innerWidth * scale);\n      canvas.height = Math.floor(window.innerHeight * scale);\n      canvas.style.width = window.innerWidth + 'px';\n      canvas.style.height = window.innerHeight + 'px';\n      gl.viewport(0, 0, canvas.width, canvas.height);\n    }\n    window.addEventListener('resize', resize);\n    resize();\n    \n    const VS = `#version 300 es\n    in vec2 a;\n    void main(){ gl_Position = vec4(a, 0, 1); }`;\n    \n    const FS = `#version 300 es\n    precision highp float;\n    out vec4 fragColor;\n    uniform vec2  u_res;\n    uniform float u_t;\n    uniform vec3  u_cam;\n    uniform vec3  u_dir;\n    uniform float u_scan;\n    uniform vec3  u_target;\n    uniform sampler2D u_planSdf;\n    uniform sampler2D u_planSource;\n    uniform int u_planMode;\n    uniform vec4 u_planBounds;\n    uniform float u_planHeight;\n\n    float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5); }\n    float noise(vec3 p){\n      vec3 i=floor(p), f=fract(p);\n      f=f*f*(3.-2.*f);\n      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),\n                     mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),\n                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),\n                     mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);\n    }\n\n    float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }\n    float sdCyl(vec3 p, float r, float h){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.)+length(max(d,0.)); }\n    float sdSphere(vec3 p, float r){ return length(p)-r; }\n\n    vec2 put(vec2 scene, float distance, float material){\n      return distance < scene.x ? vec2(distance, material) : scene;\n    }\n\n    float sdDoorOpening(vec3 q, float w, float h){\n      return sdBox(q-vec3(0.0,h*.5,0.0),vec3(w,h*.5,0.30));\n    }\n\n    float sdDoorFrame(vec3 q, float w, float h){\n      float rail=0.065, depth=0.10;\n      float head = sdBox(q-vec3(0.0,h+rail,0.0),vec3(w+rail,rail,depth));\n      float left = sdBox(q-vec3(-w-rail,h*.5,0.0),vec3(rail,h*.5+rail,depth));\n      float right= sdBox(q-vec3( w+rail,h*.5,0.0),vec3(rail,h*.5+rail,depth));\n      return min(head,min(left,right));\n    }\n\n    float sdDoorPanels(vec3 q, float w, float h, float open){\n      float halfPanel=w*.48;\n      float travel=open*w*.72;\n      float left =sdBox(q-vec3(-w*.5-travel,h*.5,0.0),vec3(halfPanel,h*.5-.08,.026));\n      float right=sdBox(q-vec3( w*.5+travel,h*.5,0.0),vec3(halfPanel,h*.5-.08,.026));\n      return min(left,right);\n    }\n\n    float doorOpen(vec2 position){\n      return 1.0-smoothstep(0.85,2.5,length(u_cam.xz-position));\n    }\n\n    // Local door coordinates: X runs across the opening, Y is vertical, Z is\n    // perpendicular to its host wall. This keeps every panel correctly oriented.\n    vec3 sideDoorSpace(vec3 p, float wallX, float doorZ){\n      return vec3(p.z-doorZ,p.y,p.x-wallX);\n    }\n\n    float sdPlanWall(vec3 p){\n      vec2 span=max(u_planBounds.zw-u_planBounds.xy,vec2(.001));\n      vec2 uv=(p.xz-u_planBounds.xy)/span;\n      vec2 outside=max(max(-uv,uv-1.0)*span,0.0);\n      if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0)))) return length(outside)+1.0;\n      float plan=texture(u_planSdf,vec2(uv.x,1.0-uv.y)).r;\n      float vertical=abs(p.y-u_planHeight*.5)-u_planHeight*.5;\n      vec2 d=vec2(plan,vertical);\n      return min(max(d.x,d.y),0.0)+length(max(d,0.0));\n    }\n\n    vec2 map(vec3 p){\n      if(u_planMode==1){\n        vec2 planResult=vec2(p.y,8.0);\n        planResult=put(planResult,sdPlanWall(p),1.0);\n        return planResult;\n      }\n      float path = 1.0-smoothstep(2.7,3.1,abs(p.x));\n      float groundMaterial = 7.0;\n      if((abs(p.x)<7.04 && p.z>0.0 && p.z<16.0) || (path>.5 && p.z<.2)) groundMaterial=8.0;\n      vec2 res=vec2(p.y,groundMaterial);\n\n      // Finite facility shell: 14.4m wide, 16m deep, with a real exterior.\n      float outerWest=sdBox(p-vec3(-7.2,1.7,8.0),vec3(.16,1.7,8.0));\n      float outerEast=sdBox(p-vec3( 7.2,1.7,8.0),vec3(.16,1.7,8.0));\n      float rear=sdBox(p-vec3(0.0,1.7,16.0),vec3(7.2,1.7,.16));\n      float front=sdBox(p-vec3(0.0,1.7,0.0),vec3(7.2,1.7,.16));\n      front=max(front,-sdDoorOpening(p,1.30,2.45));\n      float roof=sdBox(p-vec3(0.0,3.45,8.0),vec3(7.36,.14,8.16));\n      res=put(res,outerWest,1.0); res=put(res,outerEast,1.0);\n      res=put(res,rear,1.0);      res=put(res,front,1.0);\n      res=put(res,roof,5.0);\n\n      // Corridor walls host four automatic double-sliding doors per side.\n      float westWall=sdBox(p-vec3(-2.0,1.6,8.0),vec3(.10,1.6,8.0));\n      float eastWall=sdBox(p-vec3( 2.0,1.6,8.0),vec3(.10,1.6,8.0));\n      for(int i=0;i<4;i++){\n        float z=2.0+float(i)*4.0;\n        westWall=max(westWall,-sdDoorOpening(sideDoorSpace(p,-2.0,z),.68,2.35));\n        eastWall=max(eastWall,-sdDoorOpening(sideDoorSpace(p, 2.0,z),.68,2.35));\n      }\n      res=put(res,westWall,1.0); res=put(res,eastWall,1.0);\n\n      // Four rooms in each wing, separated from one another but connected to\n      // the central circulation spine through the modeled door openings.\n      for(int i=0;i<3;i++){\n        float z=4.0+float(i)*4.0;\n        res=put(res,sdBox(p-vec3(-4.6,1.6,z),vec3(2.5,1.6,.10)),1.0);\n        res=put(res,sdBox(p-vec3( 4.6,1.6,z),vec3(2.5,1.6,.10)),1.0);\n      }\n\n      // Room program. Each controlled opening now leads to a recognizable,\n      // navigable construction workspace rather than an empty shell.\n      res=put(res,sdBox(p-vec3(-5.45,.76, 2.0),vec3(1.05,.07,.52)),12.0); // Project office desk\n      res=put(res,sdBox(p-vec3(-5.45,1.12,2.0),vec3(.42,.27,.035)),13.0); // Project display\n      res=put(res,sdBox(p-vec3(-6.55,.92,3.15),vec3(.30,.92,.58)),13.0); // Drawing storage\n\n      res=put(res,sdBox(p-vec3( 4.70,.76, 2.0),vec3(1.25,.07,.58)),12.0); // Conference table\n      res=put(res,sdBox(p-vec3( 4.70,.42, 1.18),vec3(.95,.40,.28)),2.0);\n      res=put(res,sdBox(p-vec3( 4.70,.42, 2.82),vec3(.95,.40,.28)),2.0);\n\n      res=put(res,sdBox(p-vec3(-4.55,.76, 6.0),vec3(1.05,.07,.58)),12.0); // Materials review table\n      res=put(res,sdBox(p-vec3(-6.55,1.08,6.0),vec3(.30,1.08,1.15)),13.0); // Sample rack\n      res=put(res,sdBox(p-vec3(-4.85,.96,6.0),vec3(.48,.12,.35)),14.0); // Reviewed sample\n\n      res=put(res,sdBox(p-vec3( 5.45,1.10,5.35),vec3(.48,1.10,.42)),13.0); // Telecom rack A\n      res=put(res,sdBox(p-vec3( 5.45,1.10,6.65),vec3(.48,1.10,.42)),13.0); // Telecom rack B\n\n      res=put(res,sdBox(p-vec3(-4.65,.78,10.0),vec3(1.30,.06,.72)),12.0); // Plan review table\n      res=put(res,sdBox(p-vec3(-6.92,1.68,10.0),vec3(.035,.68,1.10)),14.0); // Plan board\n\n      res=put(res,sdBox(p-vec3( 6.68,1.12,10.0),vec3(.24,1.12,1.18)),13.0); // Electrical switchgear\n      res=put(res,sdBox(p-vec3( 5.85,.18,10.0),vec3(.62,.018,1.35)),14.0); // Service clearance\n\n      res=put(res,sdBox(p-vec3(-5.25,.88,14.0),vec3(1.05,.88,.62)),13.0); // Air-handling unit\n      res=put(res,sdCyl(p-vec3(-6.45,1.55,14.0),.13,1.55),2.0); // Mechanical riser\n\n      res=put(res,sdBox(p-vec3( 5.35,.76,14.0),vec3(1.05,.07,.52)),12.0); // Facilities workstation\n      res=put(res,sdBox(p-vec3( 6.55,.92,14.9),vec3(.30,.92,.58)),13.0); // Facilities storage\n\n      // Main entrance: a centered, sensor-driven double sliding assembly.\n      float entryOpen=doorOpen(vec2(0.0,0.0));\n      res=put(res,sdDoorFrame(p,1.30,2.45),2.0);\n      res=put(res,sdDoorPanels(p,1.30,2.45,entryOpen),3.0);\n\n      float hardware=1e9;\n      for(int i=0;i<4;i++){\n        float z=2.0+float(i)*4.0;\n        vec3 westQ=sideDoorSpace(p,-2.0,z);\n        vec3 eastQ=sideDoorSpace(p, 2.0,z);\n        float westOpen=doorOpen(vec2(-2.0,z));\n        float eastOpen=doorOpen(vec2( 2.0,z));\n        res=put(res,sdDoorFrame(westQ,.68,2.35),2.0);\n        res=put(res,sdDoorPanels(westQ,.68,2.35,westOpen),3.0);\n        res=put(res,sdDoorFrame(eastQ,.68,2.35),2.0);\n        res=put(res,sdDoorPanels(eastQ,.68,2.35,eastOpen),3.0);\n        hardware=min(hardware,sdBox(westQ-vec3(.42,1.32,-.12),vec3(.08,.12,.025)));\n        hardware=min(hardware,sdBox(eastQ-vec3(.42,1.32,-.12),vec3(.08,.12,.025)));\n      }\n      res=put(res,hardware,4.0);\n\n      // Entrance canopy, structural columns, glazing, and interior luminaires.\n      res=put(res,sdBox(p-vec3(0.0,3.02,-1.8),vec3(3.0,.12,1.8)),5.0);\n      res=put(res,sdBox(p-vec3(-2.72,1.5,-2.2),vec3(.12,1.5,.12)),2.0);\n      res=put(res,sdBox(p-vec3( 2.72,1.5,-2.2),vec3(.12,1.5,.12)),2.0);\n      res=put(res,sdBox(p-vec3(-4.45,1.65,-.19),vec3(1.35,1.02,.025)),3.0);\n      res=put(res,sdBox(p-vec3( 4.45,1.65,-.19),vec3(1.35,1.02,.025)),3.0);\n      for(int i=0;i<4;i++){\n        float z=2.0+float(i)*4.0;\n        res=put(res,sdBox(p-vec3(0.0,3.25,z),vec3(.42,.07,.42)),6.0);\n        res=put(res,sdBox(p-vec3(-4.6,3.25,z),vec3(.50,.07,.36)),6.0);\n        res=put(res,sdBox(p-vec3( 4.6,3.25,z),vec3(.50,.07,.36)),6.0);\n      }\n\n      // Wider Weyland campus: low service annexes and approach lighting make\n      // the facility legible as a building in a world, not an isolated box.\n      res=put(res,sdBox(p-vec3(-14.0,2.0,10.0),vec3(4.2,2.0,5.4)),9.0);\n      res=put(res,sdBox(p-vec3( 15.0,1.7,13.0),vec3(4.8,1.7,6.0)),9.0);\n      res=put(res,sdBox(p-vec3(-14.0,4.12,10.0),vec3(4.45,.12,5.65)),5.0);\n      res=put(res,sdBox(p-vec3( 15.0,3.52,13.0),vec3(5.05,.12,6.25)),5.0);\n      float poles=min(sdCyl(p-vec3(-4.6,2.6,-7.0),.07,2.6),sdCyl(p-vec3(4.6,2.6,-7.0),.07,2.6));\n      res=put(res,poles,2.0);\n      res=put(res,sdBox(p-vec3(-4.6,5.18,-7.0),vec3(.38,.06,.16)),6.0);\n      res=put(res,sdBox(p-vec3( 4.6,5.18,-7.0),vec3(.38,.06,.16)),6.0);\n\n      // Arrival landscape and illuminated campus marker establish a deliberate\n      // public face without obstructing the central accessible approach.\n      res=put(res,sdBox(p-vec3(-5.35,.82,-3.15),vec3(1.42,.72,.09)),10.0);\n      res=put(res,sdBox(p-vec3(-5.35,.10,-3.15),vec3(1.62,.10,.30)),2.0);\n      for(int i=0;i<2;i++){\n        float x=-5.5+float(i)*11.0;\n        res=put(res,sdBox(p-vec3(x,.28,-1.85),vec3(.72,.28,.52)),2.0);\n        res=put(res,sdSphere(p-vec3(x,.78,-1.85),.58),11.0);\n      }\n      for(int i=0;i<2;i++){\n        float x=3.0+float(i)*3.0;\n        res=put(res,sdBox(p-vec3( x,2.05,-.25),vec3(.035,1.15,.08)),2.0);\n        res=put(res,sdBox(p-vec3(-x,2.05,-.25),vec3(.035,1.15,.08)),2.0);\n      }\n      return res;\n    }\n\n    vec2 march(vec3 ro, vec3 rd){\n      float t=0.001; float id=0.;\n      for(int i=0;i<112;i++){\n        vec2 h=map(ro+rd*t);\n        if(h.x<0.002) return vec2(t,h.y);\n        t+=h.x*.85;\n        if(t>72.) break;\n      }\n      return vec2(-1.,0.);\n    }\n\n    vec3 normal(vec3 p){\n      float e=.001;\n      return normalize(vec3(\n        map(p+vec3(e,0,0)).x-map(p-vec3(e,0,0)).x,\n        map(p+vec3(0,e,0)).x-map(p-vec3(0,e,0)).x,\n        map(p+vec3(0,0,e)).x-map(p-vec3(0,0,e)).x));\n    }\n\n    float ao(vec3 p, vec3 n){\n      float s=0.; float w=1.;\n      for(int i=1;i<=5;i++){\n        float d=float(i)*.08;\n        s+=w*(d-map(p+n*d).x);\n        w*=.6;\n      }\n      return clamp(1.-s*2.2,0.,1.);\n    }\n\n    vec3 sky(vec3 rd){\n      vec3 sunDir = normalize(vec3(0.55, 0.16, 0.45));\n      vec3 betaR  = vec3(5.8e-6, 9.0e-6, 1.4e-5);\n      float betaM = 6.5e-5;\n      float HR=8000., HM=1200.;\n      float elev    = max(rd.y,0.01);\n      float sunElev = max(sunDir.y,0.02);\n      vec3  tauR = betaR*HR*(1./elev+1./sunElev);\n      float tauM = betaM*HM*(1./elev+1./sunElev);\n      vec3  T    = exp(-tauR-tauM);\n      float mu   = dot(rd,sunDir);\n      float phR  = .75*(1.+mu*mu);\n      float phM  = .5*(1.-(.76*.76))/pow(1.+.76*.76-2.*.76*mu,1.5);\n      vec3 planck= vec3(1.0,0.82,0.52);\n      vec3 s     = (phR*betaR*HR/elev+phM*betaM*HM/elev)*T*planck*3.2;\n      float sunDot=max(dot(rd,sunDir),0.);\n      if(sunDot>0.9998 && sunDir.y>-0.05){\n        float limb=1.-smoothstep(.9998,.99995,sunDot);\n        s += planck*limb*90.*max(0.,sunDir.y+0.08);\n      }\n      s += vec3(1.0,0.92,0.70)*pow(max(0.,1.-abs(rd.y)),6.)*0.18;\n      return clamp(s,0.,1.);\n    }\n\n    vec3 shade(vec3 albedo, float metal, float rough,\n               vec3 N, vec3 V, vec3 L, vec3 lc, float shadow){\n      vec3 H = normalize(V+L);\n      float NdL=max(dot(N,L),0.), NdV=max(dot(N,V),0.01), NdH=max(dot(N,H),0.);\n      float a=rough*rough;\n      float D=a*a/(3.14159*pow(NdH*NdH*(a*a-1.)+1.,2.));\n      float k=(rough+1.)*(rough+1.)/8.;\n      float G=NdL/(NdL*(1.-k)+k)*NdV/(NdV*(1.-k)+k);\n      vec3 F0=mix(vec3(.04),albedo,metal);\n      vec3 F=F0+(1.-F0)*pow(1.-max(dot(H,V),0.),5.);\n      vec3 spec=D*G*F/(4.*NdV*NdL+.001);\n      vec3 diff=albedo*(1.-metal)*(1.-F)/3.14159;\n      return (diff+spec)*lc*NdL*shadow;\n    }\n\n    void main(){\n      vec2 uv = (gl_FragCoord.xy/u_res*2.-1.)*vec2(u_res.x/u_res.y,1.);\n      vec3 ro    = u_cam;\n      vec3 fwd   = normalize(u_dir);\n      vec3 right = normalize(cross(vec3(0,1,0), fwd));\n      vec3 up    = cross(fwd, right);\n      vec3 rd    = normalize(fwd + right*uv.x*0.62 + up*uv.y*0.62);\n\n      vec2 hit = march(ro, rd);\n      vec3 col;\n\n      vec3 sunDir = normalize(vec3(0.55, 0.16, 0.45));\n      vec3 sunCol = vec3(1.0, 0.78, 0.45)*4.8;\n\n      if(hit.x > 0.){\n        vec3 p = ro + rd*hit.x;\n        vec3 N = normal(p);\n        vec3 V = -rd;\n        float matID = hit.y;\n        vec3  albedo; float metal=0., rough=0.7;\n        vec3  emissive = vec3(0.0);\n\n        if(matID < 1.5){\n          albedo = vec3(0.82,0.79,0.74)+noise(p*14.)*0.025 - noise(p*40.)*0.018;\n          rough  = 0.84;\n          if(N.y > 0.8){\n            albedo = vec3(0.52,0.50,0.46)+noise(p*6.)*0.03;\n            rough  = 0.76;\n          }\n        } else if(matID < 2.5){\n          albedo = vec3(0.18,0.12,0.07)+noise(p*22.)*0.02;\n          metal  = 0.72; rough = 0.42;\n        } else if(matID < 3.5){\n          albedo = vec3(0.08,0.13,0.15)+noise(p*30.)*0.012;\n          metal  = 0.58; rough = 0.22;\n        } else if(matID < 4.5){\n          albedo = vec3(0.06,0.06,0.07);\n          metal  = 0.28; rough = 0.38;\n        } else if(matID < 5.5){\n          albedo = vec3(0.05,0.05,0.06);\n          rough  = 0.9;\n        } else if(matID < 6.5){\n          // Ceiling and campus light fixtures\n          albedo = vec3(1.0);\n          rough = 0.1;\n          emissive = vec3(1.0, 0.88, 0.65) * 4.5;\n        } else if(matID < 7.5){\n          albedo = vec3(0.13,0.18,0.075)+noise(p*3.0)*0.075;\n          rough = 0.96;\n        } else if(matID < 8.5){\n          float seam=min(abs(fract(p.x*.25)-.5),abs(fract(p.z*.25)-.5));\n          albedo = vec3(0.29,0.28,0.25)+noise(p*8.0)*0.025-step(seam,.012)*.06;\n          if(u_planMode==1){\n            vec2 span=max(u_planBounds.zw-u_planBounds.xy,vec2(.001));\n            vec2 planUv=(p.xz-u_planBounds.xy)/span;\n            if(all(greaterThanEqual(planUv,vec2(0.0)))&&all(lessThanEqual(planUv,vec2(1.0)))){\n              vec3 drawing=texture(u_planSource,vec2(planUv.x,1.0-planUv.y)).rgb;\n              float ink=1.0-dot(drawing,vec3(.299,.587,.114));\n              albedo=mix(vec3(.34,.33,.30),vec3(.13,.19,.22),smoothstep(.08,.62,ink));\n            }\n          }\n          rough = 0.88;\n        } else if(matID < 9.5){\n          albedo = vec3(0.20,0.21,0.19)+noise(p*9.0)*0.035;\n          metal = 0.18; rough = 0.72;\n        } else if(matID < 10.5){\n          albedo = vec3(0.035,0.032,0.026);\n          metal = 0.35; rough = 0.28;\n          float markerLine = smoothstep(.42,.49,abs(fract(p.y*3.6)-.5));\n          emissive = vec3(1.0,.52,.035)*markerLine*1.35;\n        } else if(matID < 11.5){\n          albedo = vec3(0.055,0.16,0.045)+noise(p*5.5)*0.07;\n          rough = 0.98;\n        } else if(matID < 12.5){\n          albedo = vec3(0.31,0.19,0.095)+noise(p*9.0)*0.035;\n          rough = 0.72;\n        } else if(matID < 13.5){\n          albedo = vec3(0.10,0.12,0.13)+noise(p*18.0)*0.018;\n          metal = 0.55; rough = 0.38;\n        } else {\n          albedo = vec3(0.82,0.80,0.72);\n          rough = 0.68;\n        }\n\n        float shadow = 1.0;\n        vec3 sp = p + N*0.015;\n        float st = 0.1;\n        for(int i=0;i<24;i++){\n          float sd = map(sp+sunDir*st).x;\n          shadow = min(shadow, 8.*sd/st);\n          st += max(sd, 0.04);\n          if(st>12.||shadow<0.01) break;\n        }\n        shadow = clamp(shadow,0.,1.);\n        float occ = ao(p,N);\n\n        vec3 lighting = shade(albedo,metal,rough,N,V,sunDir,sunCol,shadow);\n        vec3 skyL = vec3(0.40,0.28,0.14)*0.30;\n        lighting += albedo*(1.-metal)*skyL*(0.5+0.5*max(N.y,0.));\n        lighting += albedo*(1.-metal)*vec3(0.14,0.10,0.05)*max(-N.y,0.)*0.25;\n        lighting += albedo*(1.-metal)*vec3(0.08,0.06,0.04)*(0.5+0.5*N.y);\n\n        vec3 workPos[4];\n        workPos[0]=vec3( 0.,3.0, 2.5);\n        workPos[1]=vec3( 0.,3.0, 6.5);\n        workPos[2]=vec3( 0.,3.0,10.5);\n        workPos[3]=vec3( 0.,3.0,13.5);\n        vec3 warmL = vec3(1.0,0.82,0.56);\n        for(int i=0;i<4;i++){\n          vec3 lv  = workPos[i]-p;\n          float ld = length(lv);\n          vec3 ldir= lv/ld;\n          float att= 7.0/(1.+ld*ld*0.15);\n          float spot= smoothstep(.1,.8,dot(ldir,vec3(0.,-1.,0.)));\n          lighting += shade(albedo,metal,rough,N,V,ldir,warmL*att*(0.35+0.65*spot),1.);\n        }\n\n        lighting *= mix(occ,1.,0.35);\n        lighting += emissive;\n        float targetField = exp(-length(p-u_target)*0.82);\n        float scanBand = pow(max(0.,sin((p.y+p.z*.045-u_t*2.2)*15.0)),18.0);\n        float scanRim = pow(1.-abs(dot(N,V)),3.0);\n        lighting += vec3(1.0,.57,.045)*u_scan*targetField*(.22+scanBand*1.25+scanRim*.35);\n        float fog = 1.-exp(-hit.x*0.022);\n        vec3 fogCol = mix(vec3(0.30,0.23,0.14),sky(normalize(vec3(rd.x,max(rd.y,.04),rd.z))),.62);\n        if(p.z>0.0 && p.z<16.0 && abs(p.x)<7.15) fogCol=vec3(0.045,0.032,0.018);\n        col = mix(lighting, fogCol, fog);\n\n      } else {\n        col = sky(rd);\n        col = mix(col, vec3(0.35,0.28,0.18)*0.6, 0.15);\n      }\n\n      vec2 vp = gl_FragCoord.xy/u_res;\n      vec2 vig = vp*(1.-vp.yx);\n      col *= pow(vig.x*vig.y*15.,0.14);\n\n      col = col*(2.51*col+0.03)/(col*(2.43*col+0.59)+0.14);\n      col = pow(clamp(col,0.,1.), vec3(0.4545));\n      fragColor = vec4(col,1.);\n    }`;\n    \n    function compile(type, src){\n      const s = gl.createShader(type);\n      gl.shaderSource(s, src);\n      gl.compileShader(s);\n      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){\n        console.error('Shader error:', gl.getShaderInfoLog(s));\n        return null;\n      }\n      return s;\n    }\n    \n    const prog = gl.createProgram();\n    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));\n    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));\n    gl.linkProgram(prog);\n    gl.useProgram(prog);\n    \n    const buf = gl.createBuffer();\n    gl.bindBuffer(gl.ARRAY_BUFFER, buf);\n    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);\n    const aLoc = gl.getAttribLocation(prog, 'a');\n    gl.enableVertexAttribArray(aLoc);\n    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);\n    \n    const uRes = gl.getUniformLocation(prog, 'u_res');\n    const uT   = gl.getUniformLocation(prog, 'u_t');\n    const uCam = gl.getUniformLocation(prog, 'u_cam');\n    const uDir = gl.getUniformLocation(prog, 'u_dir');\n    const uScan = gl.getUniformLocation(prog, 'u_scan');\n    const uTarget = gl.getUniformLocation(prog, 'u_target');\n    const uPlanSdf = gl.getUniformLocation(prog, 'u_planSdf');\n    const uPlanSource = gl.getUniformLocation(prog, 'u_planSource');\n    const uPlanMode = gl.getUniformLocation(prog, 'u_planMode');\n    const uPlanBounds = gl.getUniformLocation(prog, 'u_planBounds');\n    const uPlanHeight = gl.getUniformLocation(prog, 'u_planHeight');\n\n    const planSdfTexture = gl.createTexture();\n    gl.activeTexture(gl.TEXTURE0);\n    gl.bindTexture(gl.TEXTURE_2D, planSdfTexture);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\n    gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,1,1,0,gl.RED,gl.FLOAT,new Float32Array([100]));\n    const planSourceTexture = gl.createTexture();\n    gl.activeTexture(gl.TEXTURE1);\n    gl.bindTexture(gl.TEXTURE_2D, planSourceTexture);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\n    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\n    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));\n    gl.uniform1i(uPlanSdf,0);\n    gl.uniform1i(uPlanSource,1);\n    let activePlanModel=null;\n    \n    // Proximity doorways in XZ plane\n    const doorways = [\n      { x: 0.0, z: 0.0, side: \"South\", name: \"Weyland Main Automatic Entrance (S1)\", hardware: \"Dual-panel sensor-driven sliding entrance, presence safety curtain, monitored access controller\" },\n      { x: -2.0, z: 2.0, side: \"West\", name: \"Project Office Automatic Opening (W1)\", hardware: \"Horton Series 2000 automatic sliding assembly, Schlage AD-Series access control, Pemko gasketing\" },\n      { x: 2.0, z: 2.0, side: \"East\", name: \"Conference Room Automatic Opening (E1)\", hardware: \"Besam SW200 automatic operator, monitored presence sensor, Rixson concealed support\" },\n      { x: -2.0, z: 6.0, side: \"West\", name: \"Materials Review Automatic Opening (W2)\", hardware: \"Automatic double-slide leaf set, wireless access lock, perimeter gasketing\" },\n      { x: 2.0, z: 6.0, side: \"East\", name: \"IT and Telecom Room Opening (E2)\", hardware: \"Fail-secure automatic operator, request-to-exit sensor, monitored latch interface\" },\n      { x: -2.0, z: 10.0, side: \"West\", name: \"Plan Review Room Automatic Opening (W3)\", hardware: \"Sensor-driven sliding assembly, monitored access control, perimeter gasketing\" },\n      { x: 2.0, z: 10.0, side: \"East\", name: \"Electrical Room Controlled Opening (E3)\", hardware: \"Automatic sliding assembly, occupancy sensing, emergency breakout leaves\" },\n      { x: -2.0, z: 14.0, side: \"West\", name: \"Mechanical Room Controlled Opening (W4)\", hardware: \"Automatic operator, dual-channel safety edge, keycard access controller\" },\n      { x: 2.0, z: 14.0, side: \"East\", name: \"Facilities Office Automatic Opening (E4)\", hardware: \"Automatic double-slide assembly, badge reader, monitored egress\" }\n    ];\n\n    const scanTargets = doorways.map((door, index) => ({\n      id: index === 0 ? 'entrance' : `opening-${door.side.toLowerCase()}-${door.z}`,\n      type: index === 0 ? 'AUTOMATIC ENTRANCE' : 'CONTROLLED OPENING',\n      name: door.name,\n      summary: door.hardware,\n      dimensions: index === 0 ? '2.60 W x 2.45 H m clear' : '1.36 W x 2.35 H m clear',\n      material: 'Aluminum / laminated safety glass',\n      hazard: index === 0 ? 'Validate presence curtain and breakout path' : 'Validate safety sensor before turnover',\n      status: index === 0 ? 'COMMISSIONING READY' : 'SPEC LINKED',\n      position: [door.x, 1.25, door.z],\n      radius: index === 0 ? 1.55 : 0.82,\n      maxRange: index === 0 ? 25 : 12,\n      tags: index === 0 ? ['exterior', 'opening'] : ['interior', 'opening']\n    }));\n    scanTargets.push(\n      { id: 'entrance-canopy', type: 'STRUCTURAL ASSEMBLY', name: 'Cantilevered Arrival Canopy', summary: 'Steel canopy, paired columns, integrated warm-white luminaires, and protected passenger loading zone.', dimensions: '6.00 W x 3.60 D m', material: 'Painted structural steel / membrane roof', hazard: 'Confirm drainage fall and column protection', status: 'MODEL COORDINATED', position: [0, 2.95, -1.8], radius: 2.6, maxRange: 20, tags: ['exterior', 'structure'] },\n      { id: 'approach-light-west', type: 'ELECTRICAL FIXTURE', name: 'West Approach Luminaire', summary: 'Site lighting pole with shielded LED head, photometric zone assignment, and underground feeder.', dimensions: '5.20 m mounting height', material: 'Powder-coated steel / LED optical head', hazard: 'Confirm footing cover and underground locate', status: 'CIRCUIT LINKED', position: [-4.6, 4.9, -7], radius: 0.75, maxRange: 16, tags: ['exterior', 'electrical'] },\n      { id: 'annex-west', type: 'FACILITY ZONE', name: 'West Service Annex', summary: 'Low-rise service annex linked to site logistics, utilities, and access-control models.', dimensions: '8.40 W x 10.80 D x 4.00 H m', material: 'Composite rainscreen / steel frame', hazard: 'Confirm delivery route and exterior drainage coordination', status: 'DIGITAL TWIN ONLINE', position: [-14, 2.0, 10], radius: 4.2, maxRange: 30, tags: ['exterior', 'facility'] },\n      { id: 'annex-east', type: 'FACILITY ZONE', name: 'East Operations Annex', summary: 'Operations annex with coordinated structure, envelope, equipment clearances, and work-package ownership.', dimensions: '9.60 W x 12.00 D x 3.40 H m', material: 'Insulated metal panel / steel frame', hazard: 'Maintain service access clearances', status: 'DIGITAL TWIN ONLINE', position: [15, 1.7, 13], radius: 4.8, maxRange: 32, tags: ['exterior', 'facility'] },\n      { id: 'corridor-light-2', type: 'ELECTRICAL FIXTURE', name: 'Corridor Luminaire L2', summary: 'Interior area light linked to reflected ceiling plan, circuit schedule, controls sequence, and commissioning test.', dimensions: '0.84 W x 0.84 D m', material: 'Aluminum housing / diffuse lens', hazard: 'Verify emergency circuit designation', status: 'CIRCUIT LINKED', position: [0, 3.15, 6], radius: 0.65, maxRange: 10, tags: ['interior', 'electrical'] }\n    );\n    sightxExperience = window.SightXExperience.create({ targets: scanTargets });\n    const sightxIngest = window.SightXSiteGenome.mount({ experience: sightxExperience });\n    resize();\n    \n    const sideDoorZ = [2, 6, 10, 14];\n    const roomFixtures = [\n      [-5.45, 2.0, 1.18, 0.67], [-6.55, 3.15, 0.42, 0.70],\n      [4.70, 2.0, 1.38, 0.74],\n      [-4.55, 6.0, 1.18, 0.72], [-6.55, 6.0, 0.42, 1.27],\n      [5.45, 5.35, 0.60, 0.54], [5.45, 6.65, 0.60, 0.54],\n      [-4.65, 10.0, 1.43, 0.85], [6.68, 10.0, 0.37, 1.31],\n      [-5.25, 14.0, 1.18, 0.75], [5.35, 14.0, 1.18, 0.67],\n      [6.55, 14.9, 0.42, 0.70]\n    ];\n\n    function nearSideOpening(z) {\n      return sideDoorZ.some(doorZ => Math.abs(z - doorZ) < 0.72);\n    }\n\n    function positionBlocked(x, z) {\n      if(activePlanModel){\n        const [minX,minZ,maxX,maxZ]=activePlanModel.bounds;\n        const u=(x-minX)/(maxX-minX), v=(z-minZ)/(maxZ-minZ);\n        if(u<0||u>1||v<0||v>1) return false;\n        const px=Math.max(0,Math.min(activePlanModel.width-1,Math.round(u*(activePlanModel.width-1))));\n        const py=Math.max(0,Math.min(activePlanModel.height-1,Math.round(v*(activePlanModel.height-1))));\n        return activePlanModel.sdf[py*activePlanModel.width+px]<0.32;\n      }\n      const ax = Math.abs(x);\n      if (Math.abs(x + 5.35) < 1.68 && Math.abs(z + 3.15) < 0.42) return true;\n      if ([ -5.5, 5.5 ].some(planterX => Math.abs(x - planterX) < 0.88 && Math.abs(z + 1.85) < 0.68)) return true;\n      if (z > -0.22 && z < 16.22 && ax > 7.0 && ax < 7.42) return true;\n      if (Math.abs(z) < 0.24 && ax < 7.3 && ax > 1.18) return true;\n      if (Math.abs(z - 16.0) < 0.26 && ax < 7.35) return true;\n      if (z > 0.0 && z < 16.0 && Math.abs(ax - 2.0) < 0.22 && !nearSideOpening(z)) return true;\n      if (ax > 2.08 && ax < 7.0 && [4, 8, 12].some(wallZ => Math.abs(z - wallZ) < 0.22)) return true;\n      if (roomFixtures.some(([fx, fz, hx, hz]) => Math.abs(x - fx) < hx && Math.abs(z - fz) < hz)) return true;\n      return false;\n    }\n\n    function checkDoorwayProximity(position, radius = 1.15) {\n      if(activePlanModel){\n        document.getElementById('hardware-modal').style.display='none';\n        return;\n      }\n      const px = position[0];\n      const pz = position[2];\n      let nearDoor = null;\n      for (const door of doorways) {\n        const dist = Math.hypot(px - door.x, pz - door.z);\n        if (dist < radius) {\n          nearDoor = door;\n          break;\n        }\n      }\n      \n      const modal = document.getElementById('hardware-modal');\n      if (nearDoor) {\n        document.getElementById('hud-door-name').textContent = nearDoor.name.toUpperCase();\n        document.getElementById('hud-door-hardware').textContent = nearDoor.hardware;\n        modal.style.display = 'block';\n        modal.dataset.doorId = nearDoor.z;\n      } else {\n        modal.style.display = 'none';\n      }\n    }\n\n    const sightxControls = window.SightXControls.mount({\n      canvas,\n      hint: document.getElementById('hint'),\n      initialPosition: [0, 1.72, -9.0],\n      initialYaw: 0,\n      initialPitch: 0,\n      collision: positionBlocked,\n      onMove: position => checkDoorwayProximity(position),\n      onScan: (active, position) => {\n        sightxExperience.setScanning(active);\n        checkDoorwayProximity(position, active ? 2.75 : 1.15);\n      },\n      onTourToggle: () => sightxExperience.toggleTour(),\n      onSettingsToggle: () => sightxExperience.toggleSettings(),\n      onReportToggle: () => sightxExperience.toggleReport(),\n      onCapture: hideUI,\n      onRelease: () => {\n        if (!document.body.classList.contains('sightx-demo')) showUI();\n      }\n    });\n    sightxExperience.attachControls(sightxControls);\n\n    window.SightXPlanRenderer=Object.freeze({\n      load(model){\n        if(!model||!model.sdf||!model.width||!model.height) throw new Error('A compiled plan SDF is required.');\n        activePlanModel=model;\n        gl.activeTexture(gl.TEXTURE0);\n        gl.bindTexture(gl.TEXTURE_2D,planSdfTexture);\n        gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);\n        gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,model.width,model.height,0,gl.RED,gl.FLOAT,model.sdf);\n        if(model.sourceImage){\n          gl.activeTexture(gl.TEXTURE1);\n          gl.bindTexture(gl.TEXTURE_2D,planSourceTexture);\n          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);\n          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,model.sourceImage);\n        }\n        document.body.classList.add('sx-reconstructed');\n        const spawn=model.spawn||[0,1.72,0];\n        sightxControls.setPose(spawn,Number(model.yaw)||0,0);\n        sightxExperience.notify(`${model.label||'PDF PLAN'} / RECONSTRUCTED LOCALLY`);\n      },\n      clear(){ activePlanModel=null; document.body.classList.remove('sx-reconstructed'); },\n      get active(){ return activePlanModel; }\n    });\n    \n    let last = 0;\n    function frame(ts){\n      const dt = Math.min((ts-last)/1000, 0.05); last = ts;\n      sightxControls.update(dt);\n      sightxExperience.update(ts, sightxControls);\n      if (sightxExperience.consumeResizeRequest()) resize();\n      const camPos = sightxControls.position;\n      const fwd = sightxControls.forward;\n      const scanTarget = sightxExperience.targetPosition;\n      gl.uniform2f(uRes, canvas.width, canvas.height);\n      gl.uniform1f(uT, ts*0.001);\n      gl.uniform3f(uCam, camPos[0], camPos[1], camPos[2]);\n      gl.uniform3f(uDir, fwd[0], fwd[1], fwd[2]);\n      gl.uniform1f(uScan, sightxExperience.scanAmount);\n      gl.uniform3f(uTarget, scanTarget[0], scanTarget[1], scanTarget[2]);\n      gl.uniform1i(uPlanMode,activePlanModel?1:0);\n      if(activePlanModel){\n        gl.uniform4f(uPlanBounds,...activePlanModel.bounds);\n        gl.uniform1f(uPlanHeight,activePlanModel.wallHeight||3.2);\n      }\n      gl.drawArrays(gl.TRIANGLES, 0, 3);\n      requestAnimationFrame(frame);\n    }\n    requestAnimationFrame(frame);\n  </script>\n  <script type=\"module\" src=\"/assets/sightx-reconstruction.js?v=20260729-1\"></script>\n  <script>\n    window.SightXRuntime.mount({\n      manifestUrl: '/sightx/runtime-manifest.json'\n    }).catch(error => console.error('[SightX runtime]', error));\n  </script>\n  <style>\n    #mx-toggle{position:fixed;bottom:24px;right:24px;z-index:9000;background:#12141988;backdrop-filter:blur(10px);border:1px solid #2c3139;color:#edf0f1;border-radius:99px;padding:12px 18px;font:750 11px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n    #mx-toggle:hover{border-color:#f0b800;color:#f0b800}\n    #mx-panel{position:fixed;bottom:24px;right:24px;z-index:9001;width:300px;max-width:calc(100vw - 48px);background:#0d0f14ee;backdrop-filter:blur(14px);border:1px solid #2c3139;border-radius:16px;box-shadow:0 25px 70px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden;font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n    #mx-panel.open{display:flex}\n    #mx-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2c3139}\n    #mx-head b{color:#edf0f1;font-size:12px;letter-spacing:.06em}\n    #mx-close{background:none;border:0;color:#9299a3;cursor:pointer;font-size:16px}\n    #mx-roster{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #2c3139}\n    .mx-avatar{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:800 10px ui-monospace,monospace;color:#090a0d}\n    #mx-messages{flex:1;max-height:220px;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;font-size:12px;color:#edf0f1}\n    .mx-msg b{color:#f0b800;margin-right:4px}\n    .mx-sys{color:#9299a3;font-style:italic}\n    #mx-input-row{display:flex;gap:6px;padding:10px 14px;border-top:1px solid #2c3139}\n    #mx-input{flex:1;background:#161920;border:1px solid #2c3139;border-radius:8px;padding:8px 10px;color:#fff;font-size:12px}\n    #mx-voice-btn{background:none;border:1px solid #2c3139;color:#9299a3;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:13px}\n    #mx-voice-btn.active{background:#61dfa0;border-color:#61dfa0;color:#090a0d}\n    #mx-gate{padding:16px;font-size:12px;color:#9299a3;line-height:1.6}\n    #mx-gate a{color:#f0b800}\n  </style>\n  <button id=\"mx-toggle\">👥 COLLABORATE</button>\n  <div id=\"mx-panel\">\n    <div id=\"mx-head\"><b>MEETINGX LIVE</b><button id=\"mx-close\">✕</button></div>\n    <div id=\"mx-roster\"></div>\n    <div id=\"mx-messages\"></div>\n    <div id=\"mx-input-row\">\n      <button id=\"mx-voice-btn\" title=\"Toggle voice\">🎤</button>\n      <input id=\"mx-input\" type=\"text\" placeholder=\"Message...\" maxlength=\"2000\">\n    </div>\n  </div>\n  <script>\n  (function(){\n    const PROJECT_ID = 'glendale-camino-real';\n    let ws = null, joined = false, myId = null, peers = {}, localStream = null;\n    const $ = (id) => document.getElementById(id);\n    function addMsg(html, cls) { const d = document.createElement('div'); d.className = 'mx-msg' + (cls ? ' ' + cls : ''); d.innerHTML = html; const box = $('mx-messages'); box.appendChild(d); box.scrollTop = box.scrollHeight; }\n    function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }\n    function renderRoster(users) { $('mx-roster').innerHTML = users.map(u => `<span class=\"mx-avatar\" style=\"background:${u.color}\" title=\"${esc(u.name)}\">${esc((u.name||'?').slice(0,1).toUpperCase())}</span>`).join(''); }\n    let roster = [];\n    function connect() {\n      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/sight/room/' + PROJECT_ID);\n      ws.onopen = () => { joined = true; };\n      ws.onclose = () => {\n        const neverJoined = !joined;\n        joined = false;\n        if (neverJoined) {\n          $('mx-panel').innerHTML = '<div id=\"mx-gate\">Sign in and add MeetingX to collaborate live in this walkthrough. See <a href=\"/pricing\">/pricing</a>.</div>';\n        }\n      };\n      ws.onerror = () => {};\n      ws.onmessage = (evt) => {\n        let msg; try { msg = JSON.parse(evt.data); } catch (e) { return; }\n        if (msg.type === 'roster') { roster = msg.users; myId = msg.you; renderRoster(roster); addMsg('Connected. ' + roster.length + ' present.', 'mx-sys'); }\n        else if (msg.type === 'join') { roster.push(msg.user); renderRoster(roster); addMsg(esc(msg.user.name) + ' joined', 'mx-sys'); if (localStream) callPeer(msg.user.userId); }\n        else if (msg.type === 'leave') { roster = roster.filter(u => u.userId !== msg.userId); renderRoster(roster); if (peers[msg.userId]) { peers[msg.userId].pc.close(); delete peers[msg.userId]; } }\n        else if (msg.type === 'chat') { addMsg('<b>' + esc(msg.user.name) + ':</b> ' + esc(msg.text)); }\n        else if (msg.type === 'signal') { handleSignal(msg); }\n      };\n    }\n    function sendSignal(to, payload) { ws.send(JSON.stringify({ type: 'signal', to, payload })); }\n    function makePeerConnection(peerId) {\n      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });\n      if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));\n      pc.onicecandidate = (e) => { if (e.candidate) sendSignal(peerId, { candidate: e.candidate }); };\n      pc.ontrack = (e) => {\n        let audio = document.getElementById('mx-audio-' + peerId);\n        if (!audio) { audio = document.createElement('audio'); audio.id = 'mx-audio-' + peerId; audio.autoplay = true; document.body.appendChild(audio); }\n        audio.srcObject = e.streams[0];\n      };\n      peers[peerId] = { pc };\n      return pc;\n    }\n    async function callPeer(peerId) {\n      const pc = makePeerConnection(peerId);\n      const offer = await pc.createOffer();\n      await pc.setLocalDescription(offer);\n      sendSignal(peerId, { sdp: offer });\n    }\n    async function handleSignal(msg) {\n      const peerId = msg.from;\n      let entry = peers[peerId];\n      const pc = entry ? entry.pc : makePeerConnection(peerId);\n      if (msg.payload.sdp) {\n        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));\n        if (msg.payload.sdp.type === 'offer') {\n          const answer = await pc.createAnswer();\n          await pc.setLocalDescription(answer);\n          sendSignal(peerId, { sdp: answer });\n        }\n      } else if (msg.payload.candidate) {\n        try { await pc.addIceCandidate(msg.payload.candidate); } catch (e) {}\n      }\n    }\n    $('mx-toggle').addEventListener('click', () => {\n      $('mx-panel').classList.toggle('open');\n      if (!ws) connect();\n    });\n    $('mx-close').addEventListener('click', () => $('mx-panel').classList.remove('open'));\n    $('mx-input').addEventListener('keydown', (e) => {\n      if (e.key === 'Enter' && ws && joined && e.target.value.trim()) {\n        ws.send(JSON.stringify({ type: 'chat', text: e.target.value.trim() }));\n        e.target.value = '';\n      }\n    });\n    $('mx-voice-btn').addEventListener('click', async () => {\n      const btn = $('mx-voice-btn');\n      if (!localStream) {\n        try {\n          localStream = await navigator.mediaDevices.getUserMedia({ audio: true });\n          btn.classList.add('active');\n          roster.filter(u => u.userId !== myId).forEach(u => callPeer(u.userId));\n        } catch (e) { addMsg('Mic access denied.', 'mx-sys'); }\n      } else {\n        localStream.getTracks().forEach(t => t.stop());\n        localStream = null;\n        Object.values(peers).forEach(p => p.pc.close());\n        peers = {};\n        btn.classList.remove('active');\n      }\n    });\n  })();\n  </script>\n\n\n  <!-- Guided Walkthrough Preview -- real, deployed 2026-09-06. SightX's own\n       spec promises \"guided site walkthroughs\"; the WebGL scene above is\n       one real hardcoded demo project (Glendale Camino Real). This panel\n       is a genuinely different, smaller, real slice of that same promise:\n       given a plain-text project description, it generates an actual\n       narrated storyboard walkthrough (script via a self-hosted LLM,\n       animated-SVG scene sequence, optional browser text-to-speech) --\n       not a 3D render, not a video file. Calls weylandai's own\n       /api/sightx/walkthrough-preview, which forwards to\n       filmline-video-worker over a real same-account Service Binding. -->\n  <div id=\"wt-preview-toggle\" style=\"position:fixed;right:20px;bottom:20px;z-index:9999;\">\n    <button id=\"wt-preview-btn\" style=\"padding:10px 16px;background:#f0b800;color:#090a0d;border:0;border-radius:6px;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.4);\">Guided Walkthrough Preview</button>\n  </div>\n  <div id=\"wt-preview-panel\" style=\"display:none;position:fixed;inset:0;z-index:10000;background:rgba(9,10,13,0.92);overflow:auto;\">\n    <div style=\"max-width:820px;margin:40px auto;background:#12151a;border:1px solid #2a2e36;border-radius:10px;padding:28px;color:#f4f1ea;font-family:'Outfit',sans-serif;\">\n      <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n        <h2 style=\"margin:0;font-family:'Space Grotesk',sans-serif;\">Guided Walkthrough Preview</h2>\n        <button id=\"wt-preview-close\" style=\"background:none;border:0;color:#8a94a6;font-size:22px;cursor:pointer;\">&times;</button>\n      </div>\n      <p style=\"color:#a9b2c0;font-size:14px;line-height:1.6;\">Describe a project (e.g. \"second-floor mechanical retrofit, three access points, one hazardous-material zone\") and generate a real narrated storyboard walkthrough -- a script plus an animated scene sequence, played back with your browser's own text-to-speech. This is not the 3D scene above; it's a smaller, real, honest slice of SightX's \"guided site walkthroughs\" promise: script + animated storyboard, not photorealistic render or an encoded video file.</p>\n      <textarea id=\"wt-preview-input\" rows=\"3\" maxlength=\"1000\" placeholder=\"Describe the project or space to walk through...\" style=\"width:100%;box-sizing:border-box;background:#0d0f13;color:#f4f1ea;border:1px solid #2a2e36;border-radius:6px;padding:10px;font-family:inherit;font-size:14px;\"></textarea>\n      <button id=\"wt-preview-generate\" style=\"margin-top:10px;padding:10px 18px;background:#f0b800;color:#090a0d;border:0;border-radius:6px;font-weight:700;cursor:pointer;\">Generate</button>\n      <span id=\"wt-preview-status\" style=\"margin-left:12px;color:#8a94a6;font-size:13px;\"></span>\n      <div id=\"wt-preview-result\" style=\"margin-top:18px;\"></div>\n    </div>\n  </div>\n  <script>\n    (function () {\n      var toggleBtn = document.getElementById('wt-preview-btn');\n      var panel = document.getElementById('wt-preview-panel');\n      var closeBtn = document.getElementById('wt-preview-close');\n      var genBtn = document.getElementById('wt-preview-generate');\n      var input = document.getElementById('wt-preview-input');\n      var status = document.getElementById('wt-preview-status');\n      var result = document.getElementById('wt-preview-result');\n      toggleBtn.addEventListener('click', function () { panel.style.display = 'block'; });\n      closeBtn.addEventListener('click', function () { panel.style.display = 'none'; });\n      genBtn.addEventListener('click', function () {\n        var description = (input.value || '').trim();\n        if (!description) { status.textContent = 'Enter a project description first.'; return; }\n        status.textContent = 'Generating (real model inference, ~10-20s)...';\n        result.innerHTML = '';\n        genBtn.disabled = true;\n        fetch('/api/sightx/walkthrough-preview', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ description: description })\n        }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })\n          .then(function (res) {\n            genBtn.disabled = false;\n            if (!res.ok) { status.textContent = 'Error: ' + (res.d && res.d.detail && res.d.detail.message || 'generation failed'); return; }\n            status.textContent = 'Done (' + res.d.total_seconds + 's reel, ' + res.d.scene_count + ' scenes).';\n            result.innerHTML = res.d.svg + '<p style=\"margin-top:12px;color:#8a94a6;font-size:13px;\">' + res.d.logline_escaped + '</p>' +\n              '<button id=\"wt-preview-narrate\" style=\"margin-top:6px;padding:8px 14px;background:#2a2e36;color:#f4f1ea;border:0;border-radius:6px;cursor:pointer;\">Narrate (browser text-to-speech)</button>';\n            document.getElementById('wt-preview-narrate').addEventListener('click', function () {\n              if (!('speechSynthesis' in window)) { alert('No speechSynthesis support in this browser.'); return; }\n              window.speechSynthesis.cancel();\n              (res.d.narration_lines || []).forEach(function (line) {\n                if (line) window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));\n              });\n            });\n          })\n          .catch(function (err) { genBtn.disabled = false; status.textContent = 'Request failed: ' + err.message; });\n      });\n    })();\n  </script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_meetingx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>MeetingX | WeylandAI</title>\n  <meta name=\"description\" content=\"MeetingX turns live construction conversations into decisions, action items, and project intelligence.\">\n  <style>\n    :root{--ink:#090a0d;--panel:#111318;--panel2:#171a20;--line:#2b3038;--paper:#eef1f2;--muted:#9299a3;--gold:#f0b800;--gold2:#ffd950;--green:#68e0a0;--red:#ff716b;--blue:#6ed8ff;--r:18px}\n    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}body{overflow-x:hidden}\n    body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 12% 8%,rgba(240,184,0,.14),transparent 24rem),radial-gradient(circle at 87% 83%,rgba(110,216,255,.08),transparent 28rem),linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:auto,auto,32px 32px,32px 32px}\n    button,input,textarea{font:inherit}.shell{position:relative;max-width:1540px;margin:auto;padding:20px clamp(14px,2.5vw,36px) 40px}\n    header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:13px;text-decoration:none;color:var(--paper)}.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--ink);font-weight:900;letter-spacing:-.08em}.brand strong{display:block;letter-spacing:.14em;font-size:14px}.brand small{display:block;color:var(--muted);font:600 9px/1.5 ui-monospace,monospace;letter-spacing:.15em}.top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.status{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:99px;padding:8px 12px;color:var(--muted);font:700 10px/1 ui-monospace,monospace;letter-spacing:.09em}.dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 14px var(--green)}.link{color:var(--paper);text-decoration:none;border:1px solid var(--line);border-radius:99px;padding:8px 12px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.08em}.link:hover{border-color:var(--gold);color:var(--gold)}\n    .intro{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(290px,.65fr);gap:18px;margin-bottom:18px}.hero,.brief,.card{background:rgba(17,19,24,.91);border:1px solid var(--line);border-radius:var(--r);box-shadow:0 24px 80px rgba(0,0,0,.25)}\n    .hero{position:relative;min-height:470px;overflow:hidden}.hero video{width:100%;height:100%;min-height:470px;object-fit:cover;background:#050609;display:block}.hero-placeholder{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:40px;background:radial-gradient(circle at 50% 43%,rgba(240,184,0,.12),transparent 22%),linear-gradient(145deg,#11151b,#07080b)}.hero-placeholder.hidden{display:none}.orb{width:110px;height:110px;border:1px solid rgba(240,184,0,.45);transform:rotate(45deg);margin:0 auto 38px;position:relative;animation:turn 16s linear infinite}.orb:before,.orb:after{content:\"\";position:absolute;inset:15px;border:1px solid rgba(240,184,0,.33)}.orb:after{inset:32px;background:var(--gold);box-shadow:0 0 50px rgba(240,184,0,.3)}@keyframes turn{to{transform:rotate(405deg)}}\n    .hero-placeholder h1{font-size:clamp(34px,5vw,72px);line-height:.95;margin:0 0 14px;letter-spacing:-.05em}.hero-placeholder h1 span{color:var(--gold)}.hero-placeholder p{max-width:620px;color:var(--muted);margin:0 auto;line-height:1.65}.live-tag{position:absolute;top:16px;left:16px;background:rgba(9,10,13,.75);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:99px;padding:9px 12px;font:800 10px/1 ui-monospace,monospace;letter-spacing:.1em}.timer{position:absolute;top:16px;right:16px;background:rgba(9,10,13,.75);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:99px;padding:9px 12px;font:700 11px/1 ui-monospace,monospace}.controls{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:8px;background:rgba(9,10,13,.78);border:1px solid var(--line);border-radius:99px;padding:7px;backdrop-filter:blur(16px)}\n    .control{border:0;border-radius:99px;background:var(--panel2);color:var(--paper);padding:11px 14px;cursor:pointer;font:750 10px/1 ui-monospace,monospace;letter-spacing:.04em;white-space:nowrap}.control:hover,.control.active{background:var(--gold);color:var(--ink)}.control.danger:hover{background:var(--red)}\n    .brief{padding:23px;display:flex;flex-direction:column}.eyebrow{color:var(--gold);font:800 10px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.brief h2{font-size:30px;line-height:1.05;letter-spacing:-.035em;margin:13px 0 9px}.brief>p{color:var(--muted);line-height:1.55;margin:0 0 20px}.flow{display:grid;gap:8px;margin:4px 0 20px}.flow-row{display:grid;grid-template-columns:32px 1fr;gap:11px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.018)}.flow-row b{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:rgba(240,184,0,.12);color:var(--gold);font:800 11px ui-monospace,monospace}.flow-row strong{font-size:13px}.flow-row small{display:block;color:var(--muted);margin-top:2px;line-height:1.35}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto}.metric{padding:12px;border:1px solid var(--line);border-radius:12px}.metric strong{display:block;color:var(--gold);font-size:22px}.metric span{color:var(--muted);font:700 9px/1.3 ui-monospace,monospace;letter-spacing:.07em}\n    .workspace{display:grid;grid-template-columns:1.2fr .8fr .8fr;gap:18px}.card{padding:20px;min-height:300px}.card-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:15px}.card h3{margin:0;font-size:17px}.badge{color:var(--muted);font:700 9px/1 ui-monospace,monospace;border:1px solid var(--line);border-radius:99px;padding:6px 8px}.transcript{height:260px;overflow:auto;padding:13px;border:1px solid var(--line);border-radius:12px;background:#0b0c0f;color:#cbd0d5;font:13px/1.65 ui-monospace,monospace;white-space:pre-wrap}.interim{color:var(--muted)}\n    .list{display:grid;gap:8px;max-height:230px;overflow:auto}.item{border:1px solid var(--line);border-radius:11px;padding:11px 12px;background:rgba(255,255,255,.018);font-size:13px;line-height:1.45}.item small{display:block;color:var(--muted);font:700 9px/1.4 ui-monospace,monospace;margin-top:5px}.empty{color:var(--muted);font-size:13px;line-height:1.6}.add{width:100%;margin-top:10px;border:1px dashed #454b54;background:transparent;color:var(--muted);border-radius:11px;padding:10px;cursor:pointer}.add:hover{border-color:var(--gold);color:var(--gold)}\n    .ask{display:flex;gap:8px;margin-top:10px}.ask input{min-width:0;flex:1;background:#0b0c0f;color:var(--paper);border:1px solid var(--line);border-radius:10px;padding:11px;outline:none}.ask input:focus{border-color:var(--gold)}.ask button{border:0;background:var(--gold);color:var(--ink);font-weight:800;border-radius:10px;padding:0 14px;cursor:pointer}.answer{min-height:145px;border-left:2px solid var(--gold);padding:3px 0 3px 13px;color:#cbd0d5;font-size:13px;line-height:1.6}.footerbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.05em}.footerbar button{border:1px solid var(--line);background:transparent;color:var(--paper);border-radius:10px;padding:9px 12px;cursor:pointer}.footerbar button:hover{border-color:var(--gold);color:var(--gold)}\n    @media(max-width:1050px){.intro{grid-template-columns:1fr}.workspace{grid-template-columns:1fr 1fr}.workspace .card:first-child{grid-column:1/-1}}\n    @media(max-width:700px){.shell{padding:12px}.brand small,.top-actions .link{display:none}.hero,.hero video{min-height:55vh}.controls{width:calc(100% - 24px);overflow-x:auto;justify-content:flex-start}.workspace{grid-template-columns:1fr}.workspace .card:first-child{grid-column:auto}.brief{padding:18px}.footerbar{align-items:flex-start;flex-direction:column}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\"><span class=\"mark\">WX</span><span><strong>MEETINGX</strong><small>WEYLAND COLLABORATION INTELLIGENCE</small></span></a>\n      <div class=\"top-actions\"><span class=\"status\"><i class=\"dot\"></i> LIVE BETA</span><a class=\"link\" href=\"/sightx/\">SIGHTX</a><a class=\"link\" href=\"/\">WEYLAND</a></div>\n    </header>\n\n    <section class=\"intro\">\n      <div class=\"hero\">\n        <video id=\"stage\" autoplay playsinline muted></video>\n        <div class=\"hero-placeholder\" id=\"placeholder\">\n          <div><div class=\"orb\"></div><h1>Meet inside the<br><span>project model.</span></h1><p>MeetingX converts live conversation into a durable project record: transcript, decisions, actions, and the Weyland product context needed to act.</p></div>\n        </div>\n        <span class=\"live-tag\" id=\"media-status\">LOCAL FACILITATION SURFACE</span>\n        <span class=\"timer\" id=\"timer\">00:00:00</span>\n        <div class=\"controls\">\n          <button class=\"control\" id=\"media-btn\">CAM + MIC</button>\n          <button class=\"control\" id=\"share-btn\">SHARE SCREEN</button>\n          <button class=\"control\" id=\"record-btn\">TRANSCRIBE</button>\n          <button class=\"control\" id=\"decision-btn\">DECISION</button>\n          <button class=\"control\" id=\"action-btn\">ACTION</button>\n        </div>\n      </div>\n\n      <aside class=\"brief\">\n        <span class=\"eyebrow\">Capital Meeting Brief</span>\n        <h2>One data spine.<br>Four revenue surfaces.</h2>\n        <p>The profitable wedge is not a list of disconnected products. It is one project intelligence flow sold at the points where construction loses the most time.</p>\n        <div class=\"flow\">\n          <div class=\"flow-row\"><b>01</b><div><strong>SubX</strong><small>Documents, specifications, submittals, and subcontractor intelligence.</small></div></div>\n          <div class=\"flow-row\"><b>02</b><div><strong>TakeoffX</strong><small>Quantities, costs, labor, and estimate-ready scope.</small></div></div>\n          <div class=\"flow-row\"><b>03</b><div><strong>PropX</strong><small>Bundles verified outputs into a reviewable proposal.</small></div></div>\n          <div class=\"flow-row\"><b>04</b><div><strong>SightX</strong><small>Makes the same project data spatial, explorable, and explainable.</small></div></div>\n        </div>\n        <div class=\"metrics\"><div class=\"metric\"><strong>$2K</strong><span>SUBCONP ACTIVE SEAT / MONTH</span></div><div class=\"metric\"><strong>$10M</strong><span>TARGET SEED ROUND</span></div></div>\n      </aside>\n    </section>\n\n    <section class=\"workspace\">\n      <article class=\"card\">\n        <div class=\"card-head\"><h3>Live Transcript</h3><span class=\"badge\" id=\"speech-status\">READY</span></div>\n        <div class=\"transcript\" id=\"transcript\">MeetingX ready. Start transcription to create a local meeting record.</div>\n      </article>\n      <article class=\"card\">\n        <div class=\"card-head\"><h3>Decisions</h3><span class=\"badge\" id=\"decision-count\">0 CAPTURED</span></div>\n        <div class=\"list\" id=\"decisions\"><p class=\"empty\">Capture the commitments that change the project or company.</p></div>\n        <button class=\"add\" data-add=\"decision\">+ Record decision</button>\n      </article>\n      <article class=\"card\">\n        <div class=\"card-head\"><h3>Actions</h3><span class=\"badge\" id=\"action-count\">0 OPEN</span></div>\n        <div class=\"list\" id=\"actions\"><p class=\"empty\">Turn conversation into an owner, outcome, and next step.</p></div>\n        <button class=\"add\" data-add=\"action\">+ Add action</button>\n      </article>\n      <article class=\"card\" style=\"grid-column:1/-1;min-height:220px\">\n        <div class=\"card-head\"><h3>Ask Weyland</h3><span class=\"badge\">MEETING CONTEXT</span></div>\n        <div class=\"answer\" id=\"answer\">Ask about the product flow, the commercial wedge, the raise, or what should be demonstrated. MeetingX answers from the verified meeting brief rather than the public web.</div>\n        <form class=\"ask\" id=\"ask-form\"><input id=\"ask-input\" autocomplete=\"off\" placeholder=\"What is the clearest way to explain SubX and TakeoffX?\"><button>ASK</button></form>\n      </article>\n    </section>\n\n    <div class=\"footerbar\"><span>MEETINGX BETA · MEDIA AND NOTES STAY IN THIS BROWSER · MULTI-PARTY TRANSPORT NOT YET CLAIMED</span><button id=\"export-btn\">EXPORT MEETING RECORD</button></div>\n  </div>\n\n  <script>\n    const state={started:Date.now(),transcript:[],decisions:[],actions:[],camera:null,display:null,recognition:null,recording:false};\n    const $=id=>document.getElementById(id);\n    const clock=()=>{const s=Math.floor((Date.now()-state.started)/1000);$('timer').textContent=[s/3600,s/60%60,s%60].map(v=>String(Math.floor(v)).padStart(2,'0')).join(':')};setInterval(clock,1000);clock();\n    function showStream(stream,label){$('stage').srcObject=stream;$('placeholder').classList.add('hidden');$('media-status').textContent=label}\n    async function startMedia(){try{if(!state.camera)state.camera=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true}});showStream(state.camera,'CAMERA + MICROPHONE READY');$('media-btn').classList.add('active')}catch(e){$('media-status').textContent='MEDIA PERMISSION REQUIRED';alert('Allow camera and microphone access to activate the MeetingX stage.') }}\n    async function shareScreen(){try{state.display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});showStream(state.display,'SCREEN SHARE ACTIVE');$('share-btn').classList.add('active');state.display.getVideoTracks()[0].addEventListener('ended',()=>{state.display=null;$('share-btn').classList.remove('active');if(state.camera)showStream(state.camera,'CAMERA + MICROPHONE READY');else{$('stage').srcObject=null;$('placeholder').classList.remove('hidden')}})}catch(e){if(e.name!=='NotAllowedError')alert('Screen sharing could not start: '+e.message)}}\n    function initSpeech(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;const r=new SR();r.continuous=true;r.interimResults=true;r.lang='en-US';r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0].transcript.trim();if(e.results[i].isFinal){state.transcript.push({at:new Date().toISOString(),text});}else interim=text}renderTranscript(interim)};r.onend=()=>{if(state.recording){try{r.start()}catch(_){}}};r.onerror=e=>{$('speech-status').textContent=e.error.toUpperCase()};return r}\n    function renderTranscript(interim=''){$('transcript').innerHTML=(state.transcript.length?state.transcript.map(x=>`<div>${escapeHtml(x.text)}</div>`).join(''):'<span class=\"interim\">Listening…</span>')+(interim?`<div class=\"interim\">${escapeHtml(interim)}</div>`:'');$('transcript').scrollTop=$('transcript').scrollHeight}\n    function toggleSpeech(){if(!state.recognition)state.recognition=initSpeech();if(!state.recognition){$('speech-status').textContent='UNSUPPORTED';alert('Live browser transcription is not available in this browser. Camera, notes, decisions, and export still work.');return}state.recording=!state.recording;if(state.recording){state.recognition.start();$('record-btn').classList.add('active');$('speech-status').textContent='LISTENING'}else{state.recognition.stop();$('record-btn').classList.remove('active');$('speech-status').textContent='PAUSED'}}\n    function escapeHtml(v){return String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]))}\n    function add(kind){const label=kind==='decision'?'Decision':'Action and owner';const value=prompt(label+':');if(!value)return;state[kind+'s'].push({text:value,at:new Date().toISOString()});renderList(kind)}\n    function renderList(kind){const values=state[kind+'s'],node=$(kind+'s');node.innerHTML=values.length?values.map((x,i)=>`<div class=\"item\">${escapeHtml(x.text)}<small>${new Date(x.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · ${kind.toUpperCase()} ${i+1}</small></div>`).join(''):`<p class=\"empty\">Nothing captured yet.</p>`;$(kind+'-count').textContent=`${values.length} ${kind==='action'?'OPEN':'CAPTURED'}`}\n    function answer(q){const s=q.toLowerCase();if(/price|cost|2k|2,000/.test(s))return 'SubConP, the Subcontractor Operating Package, is $2,000 per active operator seat per month. It includes HuntX, SubX, TakeoffX, CutsheetX, PropX, and SightX.';if(/flow|together|pipeline|product|subconp/.test(s))return 'Explain one project record across six products: HuntX finds the opportunity; SubX prepares submittals; TakeoffX quantifies drawings; CutsheetX assembles product data; PropX produces the reviewed proposal; SightX makes the same record spatial.';if(/takeoff/.test(s))return 'TakeoffX, or Takeoff Express, is the estimating wedge: quantify scope, connect current cost and labor assumptions, and move an estimator from tracing plans to reviewing a machine-produced result.';if(/subx|submittal/.test(s))return 'SubX means Submittal Express. It reduces document handling and submittal preparation from hours or days to a professional review cycle.';if(/raise|10m|capital|fund/.test(s))return 'The deck asks for $10M and frames five years of runway with 60% engineering, 30% staffing, and 10% operations. The strongest proof is the revenue-producing SubX and TakeoffX workflow, not the count of future products.';if(/demo|show|present/.test(s))return 'Show three things: the Weyland homepage for the platform thesis, SightX for spatial comprehension, and MeetingX for conversation-to-action. Describe SubConP as six products operating on one shared project record.';if(/meetingx|meetx/.test(s))return 'MeetingX is the canonical name. This beta proves local media, screen sharing, transcription, decisions, actions, export, and context-aware facilitation. Multi-party conferencing still requires a signaling and TURN layer and is not being claimed today.';return 'Anchor the answer to SubConP: less manual construction work, faster quote and approval cycles, and one project record reused across HuntX, SubX, TakeoffX, CutsheetX, PropX, and SightX.'}\n    function exportRecord(){const payload={product:'MeetingX',schema_version:1,started_at:new Date(state.started).toISOString(),exported_at:new Date().toISOString(),transcript:state.transcript,decisions:state.decisions,actions:state.actions};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`meetingx-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}\n    $('media-btn').onclick=startMedia;$('share-btn').onclick=shareScreen;$('record-btn').onclick=toggleSpeech;$('decision-btn').onclick=()=>add('decision');$('action-btn').onclick=()=>add('action');document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));$('export-btn').onclick=exportRecord;\n    $('ask-form').onsubmit=e=>{e.preventDefault();const q=$('ask-input').value.trim();if(!q)return;$('answer').textContent=answer(q);$('ask-input').value=''};\n  </script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_sightx_runtime_manifest_json() {
    return new Response("{\n  \"$schema\": \"/sightx/runtime-manifest.schema.json\",\n  \"schema\": \"weyland.sightx.runtime-manifest.v1\",\n  \"scene\": {\n    \"id\": \"weyland-facility-01\",\n    \"name\": \"Weyland Facility 01\",\n    \"coordinateSystem\": \"site-local\",\n    \"units\": \"m\",\n    \"siteGenomeUrl\": \"/sightx/projects/glendale-camino-real/catalog.json\"\n  },\n  \"runtimes\": {\n    \"web\": {\n      \"kind\": \"browser-webgl\",\n      \"status\": \"available\",\n      \"mount\": \"#bg-canvas\"\n    },\n    \"unreal\": {\n      \"kind\": \"unreal-pixel-streaming\",\n      \"status\": \"requires-endpoint\",\n      \"frontendUrl\": null,\n      \"healthUrl\": null,\n      \"transport\": \"webrtc\"\n    }\n  },\n  \"bridge\": {\n    \"schema\": \"weyland.sightx.runtime-bridge.v1\",\n    \"pageToRuntime\": [\n      \"sightx:scene:load\",\n      \"sightx:settings:update\"\n    ],\n    \"runtimeToPage\": [\n      \"sightx:runtime:ready\",\n      \"sightx:field-record\"\n    ]\n  }\n}\n", { headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_sightx_runtime_manifest_schema_json() {
    return new Response("{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"$id\": \"https://weylandai.com/sightx/runtime-manifest.schema.json\",\n  \"title\": \"SightX Runtime Manifest\",\n  \"type\": \"object\",\n  \"required\": [\"schema\", \"scene\", \"runtimes\", \"bridge\"],\n  \"properties\": {\n    \"schema\": { \"const\": \"weyland.sightx.runtime-manifest.v1\" },\n    \"scene\": {\n      \"type\": \"object\",\n      \"required\": [\"id\", \"name\", \"coordinateSystem\", \"units\"],\n      \"properties\": {\n        \"id\": { \"type\": \"string\", \"minLength\": 1 },\n        \"name\": { \"type\": \"string\", \"minLength\": 1 },\n        \"coordinateSystem\": { \"enum\": [\"site-local\", \"source-unmapped\"] },\n        \"units\": { \"enum\": [\"m\", \"ft\"] },\n        \"siteGenomeUrl\": { \"type\": [\"string\", \"null\"] }\n      },\n      \"additionalProperties\": true\n    },\n    \"runtimes\": {\n      \"type\": \"object\",\n      \"required\": [\"web\", \"unreal\"],\n      \"properties\": {\n        \"web\": {\n          \"type\": \"object\",\n          \"required\": [\"kind\", \"status\", \"mount\"]\n        },\n        \"unreal\": {\n          \"type\": \"object\",\n          \"required\": [\"kind\", \"status\", \"frontendUrl\", \"transport\"],\n          \"properties\": {\n            \"frontendUrl\": { \"type\": [\"string\", \"null\"] },\n            \"healthUrl\": { \"type\": [\"string\", \"null\"] },\n            \"transport\": { \"const\": \"webrtc\" }\n          },\n          \"additionalProperties\": true\n        }\n      },\n      \"additionalProperties\": false\n    },\n    \"bridge\": {\n      \"type\": \"object\",\n      \"required\": [\"schema\", \"pageToRuntime\", \"runtimeToPage\"]\n    }\n  },\n  \"additionalProperties\": true\n}\n", { headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_sightx_projects_glendale_camino_real_catalog_json() {
    return new Response("{\n  \"schema\": \"sightx.project-catalog.v1\",\n  \"projects\": [\n    {\n      \"id\": \"glendale-camino-real\",\n      \"name\": \"Glendale Community College - Camino Real Building Renovation\",\n      \"address\": \"1500 N. Verdugo Rd, Glendale, CA 91208\",\n      \"source\": {\n        \"file\": \"GCCFullDoorSchedule.pdf\",\n        \"url\": \"GCCFullDoorSchedule.pdf\",\n        \"sha256\": \"36d5c352b26db0ef5ba56eca4b3254e95bc782afae9e0bae7305b860b8bef0e1\",\n        \"pages\": 4,\n        \"title\": \"Architectural Sheets\"\n      },\n      \"levels\": [\n        {\n          \"id\": \"first-floor\",\n          \"label\": \"First Floor / A-201\",\n          \"page\": 1,\n          \"sheet\": \"A-201\",\n          \"crop\": [\n            0.18,\n            0.235,\n            0.57,\n            0.35\n          ],\n          \"elevationM\": 0.0,\n          \"heightM\": 3.35,\n          \"widthM\": 58.0,\n          \"sourcePreview\": \"first-floor-source.webp\",\n          \"wallMask\": \"first-floor-walls.png\",\n          \"semanticPreview\": \"first-floor-semantic.png\",\n          \"modelInputPreview\": \"first-floor-model-input.webp\",\n          \"texture\": {\n            \"width\": 768,\n            \"height\": 364\n          },\n          \"boundsM\": [\n            -29.0,\n            -13.744791666666666,\n            29.0,\n            13.744791666666666\n          ],\n          \"extraction\": {\n            \"method\": \"floorplan-unet-resnet34-cubicasa-v1\",\n            \"wallPixels\": 29632,\n            \"doorPixels\": 36727,\n            \"windowPixels\": 75740,\n            \"status\": \"machine-derived-requires-review\"\n          }\n        },\n        {\n          \"id\": \"second-floor\",\n          \"label\": \"Second Floor / A-202\",\n          \"page\": 2,\n          \"sheet\": \"A-202\",\n          \"crop\": [\n            0.19,\n            0.22,\n            0.56,\n            0.36\n          ],\n          \"elevationM\": 3.35,\n          \"heightM\": 3.35,\n          \"widthM\": 58.0,\n          \"sourcePreview\": \"second-floor-source.webp\",\n          \"wallMask\": \"second-floor-walls.png\",\n          \"semanticPreview\": \"second-floor-semantic.png\",\n          \"modelInputPreview\": \"second-floor-model-input.webp\",\n          \"texture\": {\n            \"width\": 768,\n            \"height\": 382\n          },\n          \"boundsM\": [\n            -29.0,\n            -14.424479166666666,\n            29.0,\n            14.424479166666666\n          ],\n          \"extraction\": {\n            \"method\": \"floorplan-unet-resnet34-cubicasa-v1\",\n            \"wallPixels\": 36428,\n            \"doorPixels\": 10274,\n            \"windowPixels\": 68460,\n            \"status\": \"machine-derived-requires-review\"\n          }\n        },\n        {\n          \"id\": \"attic\",\n          \"label\": \"Attic / A-203\",\n          \"page\": 3,\n          \"sheet\": \"A-203.1\",\n          \"crop\": [\n            0.215,\n            0.075,\n            0.56,\n            0.35\n          ],\n          \"elevationM\": 6.7,\n          \"heightM\": 2.75,\n          \"widthM\": 58.0,\n          \"sourcePreview\": \"attic-source.webp\",\n          \"wallMask\": \"attic-walls.png\",\n          \"semanticPreview\": \"attic-semantic.png\",\n          \"modelInputPreview\": \"attic-model-input.webp\",\n          \"texture\": {\n            \"width\": 768,\n            \"height\": 371\n          },\n          \"boundsM\": [\n            -29.0,\n            -14.009114583333334,\n            29.0,\n            14.009114583333334\n          ],\n          \"extraction\": {\n            \"method\": \"floorplan-unet-resnet34-cubicasa-v1\",\n            \"wallPixels\": 40720,\n            \"doorPixels\": 12588,\n            \"windowPixels\": 45707,\n            \"status\": \"machine-derived-requires-review\"\n          }\n        },\n        {\n          \"id\": \"roof\",\n          \"label\": \"Roof / A-203\",\n          \"page\": 3,\n          \"sheet\": \"A-203.2\",\n          \"crop\": [\n            0.285,\n            0.43,\n            0.59,\n            0.33\n          ],\n          \"elevationM\": 9.45,\n          \"heightM\": 0.35,\n          \"widthM\": 58.0,\n          \"sourcePreview\": \"roof-source.webp\",\n          \"wallMask\": \"roof-walls.png\",\n          \"semanticPreview\": \"roof-semantic.png\",\n          \"modelInputPreview\": \"roof-model-input.webp\",\n          \"texture\": {\n            \"width\": 768,\n            \"height\": 332\n          },\n          \"boundsM\": [\n            -29.0,\n            -12.536458333333334,\n            29.0,\n            12.536458333333334\n          ],\n          \"extraction\": {\n            \"method\": \"floorplan-unet-resnet34-cubicasa-v1\",\n            \"wallPixels\": 26418,\n            \"doorPixels\": 4157,\n            \"windowPixels\": 142766,\n            \"status\": \"machine-derived-requires-review\"\n          }\n        },\n        {\n          \"id\": \"basement\",\n          \"label\": \"Basement / A-203\",\n          \"page\": 3,\n          \"sheet\": \"A-203.3\",\n          \"crop\": [\n            0.055,\n            0.52,\n            0.25,\n            0.23\n          ],\n          \"elevationM\": -3.0,\n          \"heightM\": 3.0,\n          \"widthM\": 15.0,\n          \"sourcePreview\": \"basement-source.webp\",\n          \"wallMask\": \"basement-walls.png\",\n          \"semanticPreview\": \"basement-semantic.png\",\n          \"modelInputPreview\": \"basement-model-input.webp\",\n          \"texture\": {\n            \"width\": 768,\n            \"height\": 546\n          },\n          \"boundsM\": [\n            -7.5,\n            -5.33203125,\n            7.5,\n            5.33203125\n          ],\n          \"extraction\": {\n            \"method\": \"floorplan-unet-resnet34-cubicasa-v1\",\n            \"wallPixels\": 43345,\n            \"doorPixels\": 3492,\n            \"windowPixels\": 6137,\n            \"status\": \"machine-derived-requires-review\"\n          }\n        }\n      ],\n      \"context\": {\n        \"provider\": \"Google Maps\",\n        \"mapsUrl\": \"https://www.google.com/maps/search/?api=1&query=1500+N+Verdugo+Rd%2C+Glendale%2C+CA+91208\",\n        \"embedUrl\": \"https://www.google.com/maps?q=1500+N+Verdugo+Rd%2C+Glendale%2C+CA+91208&output=embed\",\n        \"status\": \"live-provider-context\"\n      }\n    }\n  ]\n}\n", { headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_qtext() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>QText | WeylandAI</title>\n  <style>\n    :root{--bg:#090a0d;--panel:#121419;--line:#2d323a;--text:#edf0f1;--muted:#9199a3;--gold:#f0b800;--blue:#67d4ff;--green:#61dfa0}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 90% 0,rgba(103,212,255,.11),transparent 27rem),radial-gradient(circle at 10% 90%,rgba(240,184,0,.08),transparent 26rem),linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:auto,auto,30px 30px,30px 30px}.shell{position:relative;max-width:1440px;margin:auto;padding:18px clamp(14px,2.5vw,34px) 40px}header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:25px}.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--blue);color:var(--bg);font-weight:900}.brand b{display:block;letter-spacing:.16em}.brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}.nav{display:flex;gap:7px;flex-wrap:wrap}.nav a{border:1px solid var(--line);border-radius:99px;padding:9px 12px;color:var(--text);text-decoration:none;font:750 10px/1 ui-monospace,monospace}.nav a:hover{border-color:var(--blue);color:var(--blue)}.hero{display:grid;grid-template-columns:1.35fr .65fr;gap:25px;align-items:end;margin:32px 0 20px}.eyebrow{color:var(--blue);font:800 10px/1 ui-monospace,monospace;letter-spacing:.17em}.hero h1{font-size:clamp(38px,6vw,78px);letter-spacing:-.06em;line-height:.92;margin:12px 0}.hero p{max-width:730px;color:var(--muted);line-height:1.65;margin:0}.statline{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stat{border:1px solid var(--line);border-radius:13px;padding:13px}.stat strong{display:block;color:var(--blue);font-size:24px}.stat span{color:var(--muted);font:700 9px/1.4 ui-monospace,monospace}.ask{display:grid;grid-template-columns:1fr auto;gap:8px;background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;padding:9px;margin-bottom:10px}.ask input{min-width:0;border:0;outline:0;background:transparent;color:var(--text);font-size:17px;padding:10px}.ask button,.button{border:0;border-radius:11px;background:var(--blue);color:var(--bg);font-weight:850;padding:0 19px;cursor:pointer}.chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}.chip{border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:8px 11px;cursor:pointer;font-size:11px}.chip:hover{border-color:var(--blue);color:var(--blue)}.layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(310px,.65fr);gap:18px}.card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.2)}.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.card h2{font-size:17px;margin:0}.badge{border:1px solid var(--line);border-radius:99px;padding:6px 9px;color:var(--muted);font:700 9px/1 ui-monospace,monospace}.answer{min-height:330px}.answer h3{font-size:26px;line-height:1.15;margin:2px 0 14px}.answer p{color:#cad0d5;line-height:1.7;font-size:14px}.citation{display:grid;grid-template-columns:68px 1fr;gap:12px;border-top:1px solid var(--line);padding:13px 0}.citation b{color:var(--blue);font:800 10px/1.5 ui-monospace,monospace}.citation strong{font-size:12px}.citation p{color:var(--muted);font-size:11px;line-height:1.5;margin:4px 0 0}.empty{display:grid;place-items:center;min-height:300px;text-align:center;color:var(--muted);line-height:1.7}.sources{display:grid;gap:8px}.source{border:1px solid var(--line);border-radius:11px;padding:11px}.source strong{font-size:12px}.source span{display:block;color:var(--blue);font:700 9px/1.5 ui-monospace,monospace}.source p{font-size:11px;line-height:1.45;color:var(--muted);margin:5px 0 0}.upload{display:block;margin-top:12px;border:1px dashed #454c56;border-radius:11px;text-align:center;padding:11px;color:var(--muted);font-size:11px;cursor:pointer}.upload:hover{border-color:var(--blue);color:var(--blue)}.upload input{display:none}.audit{margin-top:15px;padding-top:14px;border-top:1px solid var(--line);color:var(--muted);font:700 9px/1.7 ui-monospace,monospace}@media(max-width:900px){.hero,.layout{grid-template-columns:1fr}.nav a:nth-child(-n+2){display:none}}@media(max-width:560px){.ask{grid-template-columns:1fr}.ask button{min-height:44px}.statline{grid-template-columns:1fr}.hero h1{font-size:44px}}\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header><a class=\"brand\" href=\"/\"><span class=\"mark\">QT</span><span><b>QTEXT</b><small>SOURCE-GROUNDED PROJECT INTELLIGENCE</small></span></a><nav class=\"nav\"><a href=\"/propx/\">PROPX</a><a href=\"/sightx/\">SIGHTX</a><a href=\"/meetingx/\">MEETINGX</a><a href=\"/\">WEYLAND</a></nav></header>\n    <section class=\"hero\"><div><span class=\"eyebrow\">THE PROJECT CAN ANSWER BACK</span><h1>Ask the drawings.<br>Trace the answer.</h1><p>QText retrieves from the same source package that drives SubX, TakeoffX, PropX, and SightX. Every answer keeps its evidence attached.</p></div><div class=\"statline\"><div class=\"stat\"><strong id=\"source-total\">0</strong><span>INDEXED SOURCES</span></div><div class=\"stat\"><strong id=\"scope-total\">0</strong><span>TRACED SCOPE ITEMS</span></div></div></section>\n    <form class=\"ask\" id=\"ask\"><input id=\"question\" autocomplete=\"off\" placeholder=\"What automatic-door hardware is specified?\"><button>ASK PROJECT</button></form>\n    <div class=\"chips\"><button class=\"chip\">What automatic-door hardware is specified?</button><button class=\"chip\">What is included in commissioning?</button><button class=\"chip\">Which items require field verification?</button><button class=\"chip\">What does PropX include?</button></div>\n    <main class=\"layout\">\n      <section class=\"card answer\" id=\"answer\"><div class=\"empty\">Ask a project question to retrieve an answer with source locators.<br><small>This investor demo searches the Project Omega evidence package locally.</small></div></section>\n      <aside class=\"card\"><div class=\"card-head\"><h2>Source Package</h2><span class=\"badge\" id=\"index-state\">LOADING</span></div><div class=\"sources\" id=\"sources\"></div><label class=\"upload\">+ ADD A TEXT SOURCE<input id=\"file\" type=\"file\" accept=\".txt,.md,.json,text/plain,application/json\"></label><div class=\"audit\" id=\"audit\">SourceX index initializing…</div></aside>\n    </main>\n  </div>\n  <script>\n    let data=null,extra=[];const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n    const words=s=>new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(x=>x.length>2&&!['what','which','does','with','from','that','this','into','project'].includes(x)));\n    async function boot(){data=await (await fetch('/data/project-omega.json',{cache:'no-store'})).json();renderSources();$('source-total').textContent=data.sources.length;$('scope-total').textContent=data.scope.length;$('index-state').textContent='INDEX READY';$('audit').textContent=`SourceX · ${new Date().toLocaleTimeString()} · ${data.sources.length} sources hydrated · ${data.scope.length} scope relationships available`;}\n    function corpus(){return [...data.sources,...extra].map(s=>({...s,body:[s.name,s.type,s.locator,s.excerpt].join(' ')}))}\n    function search(q){const qw=words(q);return corpus().map(s=>{const sw=words(s.body),score=[...qw].reduce((n,w)=>n+(sw.has(w)?3:[...sw].some(x=>x.includes(w)||w.includes(x))?1:0),0);return {...s,score}}).sort((a,b)=>b.score-a.score).filter(x=>x.score>0).slice(0,3)}\n    function synthesize(q,hits){const s=q.toLowerCase();if(/hardware|door|automatic|operator|access/.test(s))return 'The evidence package specifies Horton Series 2000 automatic sliding entrance assemblies coordinated with sensors and controls, plus Schlage AD-Series access-control integration and Pemko perimeter gasketing.';if(/commission|training|startup/.test(s))return 'The scope includes field verification, startup, commissioning, and owner training as a lump-sum line item. Final completion remains tied to approved submittals and field conditions.';if(/field|verify|verification/.test(s))return 'Final quantities and opening conditions require field verification. The opening-protection notes also connect verification to startup, commissioning, and owner training.';if(/propx|proposal|include/.test(s))return 'PropX receives the quantified TakeoffX scope, preserves SourceX citations, applies estimator-reviewed pricing, and produces the reviewable proposal. The demo includes two automatic entrances, access-control integration, gasketing, commissioning, and training.';if(hits.length)return `The strongest matching evidence is ${hits.map(x=>x.name).join(', ')}. Review the cited excerpts below before using the answer commercially.`;return 'No grounded answer was found in the current source package. Add a text source or revise the question; QText will not invent a project answer without evidence.'}\n    function answer(q){const hits=search(q),body=synthesize(q,hits);$('answer').innerHTML=`<div class=\"card-head\"><h2>Grounded Answer</h2><span class=\"badge\">${hits.length} CITATIONS</span></div><h3>${esc(q)}</h3><p>${esc(body)}</p>${hits.map(x=>`<div class=\"citation\"><b>${esc(x.id)}</b><div><strong>${esc(x.name)} · ${esc(x.locator||'uploaded text')}</strong><p>${esc(x.excerpt)}</p></div></div>`).join('')}`;}\n    function renderSources(){$('sources').innerHTML=corpus().map(x=>`<div class=\"source\"><strong>${esc(x.name)}</strong><span>${esc(x.id)} · ${esc(x.locator||'uploaded text')}</span><p>${esc(x.excerpt).slice(0,180)}</p></div>`).join('');$('source-total').textContent=corpus().length;}\n    $('ask').onsubmit=e=>{e.preventDefault();const q=$('question').value.trim();if(q)answer(q)};document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{$('question').value=b.textContent;answer(b.textContent)});$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text();extra.push({id:`UP-${String(extra.length+1).padStart(3,'0')}`,name:f.name,type:'uploaded text',locator:'local browser session',excerpt:text.slice(0,1200)});renderSources();$('index-state').textContent='SOURCE ADDED';$('audit').textContent=`SourceX · ${new Date().toLocaleTimeString()} · ${f.name} indexed locally; no upload performed`;};boot().catch(e=>$('index-state').textContent='INDEX ERROR');\n  </script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_subscribe() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"description\" content=\"Subscribe to WeylandAI SubConP, the Subcontractor Operating Package.\">\n  <title>SubConP / WeylandAI</title>\n  <link rel=\"stylesheet\" href=\"/assets/subscribe.css?v=20260729-1\">\n</head>\n<body>\n  <div class=\"field\" aria-hidden=\"true\"></div>\n  <header>\n    <a class=\"brand\" href=\"/\"><b>W</b><span>WEYLAND<br>ARTIFICIAL INTELLIGENCE</span></a>\n    <nav><a href=\"/sightx/\">SightX</a></nav>\n    <span class=\"status\" data-auth-status style=\"margin-right: 1rem;\">CHECKING IDENTITY</span>\n    <span class=\"status\" data-service-status>CHECKING PAYMENT RAIL</span>\n  </header>\n\n  <main>\n    <section class=\"copy\">\n      <p class=\"eyebrow\">SUBCONTRACTOR OPERATING PACKAGE / 01</p>\n      <h1>Run the back office.<br><em>Keep the field moving.</em></h1>\n      <p class=\"lede\"><b>SubConP is the Subcontractor Operating Package:</b> project discovery, submittals, takeoffs, cut sheets, proposals, and spatial review operating on one shared project record.</p>\n      <ol class=\"products\" aria-label=\"Products included in SubConP\">\n        <li><b>HuntX</b><span>Opportunity discovery.</span></li>\n        <li><b>SubX</b><span>Submittal Express.</span></li>\n        <li><b>TakeoffX</b><span>Takeoff Express.</span></li>\n        <li><b>CutsheetX</b><span>Cut Sheet Express.</span></li>\n        <li><b>PropX</b><span>Proposal Express.</span></li>\n        <li><b>SightX</b><span>Spatial project intelligence.</span></li>\n      </ol>\n      <p class=\"boundary\"><b>Commercial boundary:</b> $2,000 per active operator seat, billed monthly. Implementation scope, data migration, custom integrations, and usage above the included policy are quoted separately.</p>\n    </section>\n\n    <aside class=\"checkout\" aria-labelledby=\"checkout-title\">\n      <span class=\"card-index\">SUBCONP / MONTHLY</span>\n      <h2 id=\"checkout-title\">Activate operator seats</h2>\n      <div class=\"trial-note\" style=\"color:#e7b92d;font:700 11px/1.4 var(--mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;margin-top:24px\">$0 for the first 30 days, then</div>\n      <div class=\"price\"><strong>$2,000</strong><span>USD<br>PER SEAT / MONTH</span></div>\n      <label for=\"seat-count\">Active seats</label>\n      <div class=\"seat-control\">\n        <button type=\"button\" data-seat-step=\"-1\" aria-label=\"Remove one seat\">−</button>\n        <input id=\"seat-count\" type=\"number\" min=\"1\" max=\"250\" value=\"1\" inputmode=\"numeric\">\n        <button type=\"button\" data-seat-step=\"1\" aria-label=\"Add one seat\">+</button>\n      </div>\n      <div class=\"total\"><span>Monthly subscription</span><b data-total>$2,000</b></div>\n      <button class=\"primary\" type=\"button\" data-checkout>CONTINUE TO SECURE CHECKOUT</button>\n      <p class=\"checkout-note\" data-checkout-note>Checkout is processed by VendyAI using Stripe. No card data touches this server.</p>\n      <div class=\"result\" data-result hidden></div>\n    </aside>\n  </main>\n\n  <footer><span>WEYLANDAI / SUBCONP</span><p>One project spine. Six operating tools. Human approval at every commercial boundary.</p><a href=\"mailto:hello@weylandai.com\">hello@weylandai.com</a></footer>\n  <script type=\"module\" src=\"/assets/subscribe.js?v=20260729-1\"></script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_financials() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"robots\" content=\"noindex,nofollow\">\n  <meta name=\"description\" content=\"Weyland investor diligence readiness, funding scenarios, and evidence register.\">\n  <title>Financials / Weyland AI</title>\n  <link rel=\"stylesheet\" href=\"/assets/financials.css?v=20260729-1\">\n</head>\n<body>\n  <div class=\"grid-field\" aria-hidden=\"true\"></div>\n  <header class=\"masthead\">\n    <a class=\"wordmark\" href=\"/\" aria-label=\"Weyland AI home\"><b>W</b><span>WEYLAND<br>ARTIFICIAL INTELLIGENCE</span></a>\n    <nav><a href=\"/deck/\">Deck</a><a href=\"/sightx/\">SightX</a><a href=\"#manifest\">Manifest</a></nav>\n    <span class=\"classification\">PUBLIC SUMMARY / NOINDEX</span>\n  </header>\n\n  <main>\n    <section class=\"hero\">\n      <div class=\"hero-index\">DILIGENCE CONTROL / 01</div>\n      <p class=\"eyebrow\">Financial truth before financial theater</p>\n      <h1>Show the math.<br><em>Expose the gaps.</em></h1>\n      <p class=\"lede\">A live, source-aware view of capitalization, runway, traction, market logic, and diligence readiness. Missing evidence stays visibly missing.</p>\n      <div class=\"hero-meta\">\n        <span><small>AS OF</small><b data-as-of>Loading</b></span>\n        <span><small>EVIDENCE MODEL</small><b>Observed / Claimed / Assumed / Missing</b></span>\n        <span><small>DATA POLICY</small><b>Restricted records are never published here</b></span>\n      </div>\n      <div class=\"hero-mark\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i></div>\n    </section>\n\n    <section class=\"alert-strip\" aria-label=\"Critical financial decision\">\n      <span class=\"pulse\"></span>\n      <b>OPEN DECISION</b>\n      <p>The live deck and bottoms-up model describe different rounds. Reconcile them before formal diligence.</p>\n      <a href=\"#funding\">Inspect both models</a>\n    </section>\n\n    <section class=\"section\" id=\"funding\">\n      <header class=\"section-head\">\n        <div><span>02 / CAPITAL PLAN</span><h2>Two asks.<br>One decision required.</h2></div>\n        <p>These models are displayed side by side because silently merging them would create false precision. Select either scenario to drive the runway calculator.</p>\n      </header>\n      <div class=\"scenario-grid\" data-funding-models></div>\n\n      <div class=\"runway-lab\">\n        <div class=\"runway-readout\">\n          <span class=\"kicker\">LIVE RUNWAY MODEL</span>\n          <strong data-runway-months>--</strong>\n          <p>months of runway</p>\n          <div class=\"runway-track\"><i data-runway-track></i></div>\n          <small data-runway-note>Choose a scenario or change an input.</small>\n        </div>\n        <form class=\"runway-controls\" onsubmit=\"return false\">\n          <label><span>Raise</span><input data-calc=\"raise\" type=\"number\" min=\"0\" step=\"50000\"></label>\n          <label><span>Gross monthly burn</span><input data-calc=\"burn\" type=\"number\" min=\"0\" step=\"5000\"></label>\n          <label><span>Monthly revenue offset</span><input data-calc=\"revenue\" type=\"number\" min=\"0\" step=\"5000\" value=\"0\"></label>\n          <label><span>Cash held as reserve</span><input data-calc=\"reserve\" type=\"range\" min=\"0\" max=\"40\" step=\"1\"><output data-reserve-output>0%</output></label>\n        </form>\n        <div class=\"allocation\" data-allocation></div>\n      </div>\n    </section>\n\n    <section class=\"section section-ink\" id=\"capitalization\">\n      <header class=\"section-head\">\n        <div><span>03 / OWNERSHIP</span><h2>The cap table is a gate,<br>not an appendix.</h2></div>\n        <p data-cap-summary>Loading capitalization evidence...</p>\n      </header>\n      <div class=\"cap-layout\">\n        <div class=\"empty-ledger\">\n          <div class=\"empty-symbol\">?</div>\n          <div><b>AUTHORITATIVE OWNERSHIP LEDGER NOT FOUND</b><p>Do not estimate founder or investor percentages from memory. Rebuild from signed issuance, financing, option, and debt records.</p></div>\n        </div>\n        <ol class=\"required-list\" data-cap-required></ol>\n      </div>\n      <a class=\"download-primary\" href=\"/financials/downloads/cap-table-template.csv\">Download canonical cap table template</a>\n    </section>\n\n    <section class=\"section\" id=\"traction\">\n      <header class=\"section-head\">\n        <div><span>04 / COMMERCIAL EVIDENCE</span><h2>Traction is a ledger,<br>not a collection of names.</h2></div>\n        <p>Every customer and pipeline assertion needs a date, amount, stage, owner, and primary record. The evidence state below is intentionally strict.</p>\n      </header>\n      <div class=\"metric-grid\" data-traction></div>\n    </section>\n\n    <section class=\"section twin-section\" id=\"market\">\n      <div class=\"market-panel\">\n        <header><span>05 / MARKET MODEL</span><h2>Bottom-up before broad.</h2></header>\n        <div class=\"market-number\"><strong data-sam>--</strong><span>planning-assumption firms in initial SAM</span></div>\n        <div class=\"market-number\"><strong data-acv>--</strong><span>assumed annual contract value</span></div>\n        <p class=\"warning\" data-market-warning></p>\n        <div class=\"som-path\" data-som></div>\n      </div>\n      <div class=\"moat-panel\">\n        <header><span>06 / DEFENSIBILITY</span><h2>A moat must survive a test.</h2></header>\n        <div data-moat></div>\n      </div>\n    </section>\n\n    <section class=\"section\" id=\"milestones\">\n      <header class=\"section-head\">\n        <div><span>07 / RUNWAY OUTPUT</span><h2>Capital buys milestones,<br>not time alone.</h2></div>\n        <p>The recovered hiring plan reaches seven people by month twelve. It remains a planning assumption until compensation, sequencing, and accountable owners are approved.</p>\n      </header>\n      <div class=\"hiring-band\" data-hiring></div>\n      <div class=\"milestone-list\" data-milestones></div>\n    </section>\n\n    <section class=\"section section-ink\" id=\"manifest\">\n      <header class=\"section-head\">\n        <div><span>08 / DATA ROOM</span><h2>The diligence manifest.</h2></div>\n        <p>This public surface exposes readiness and summaries only. Formation records, signatures, contracts, account data, and personally identifying information belong in an authenticated data room.</p>\n      </header>\n      <div class=\"manifest-toolbar\">\n        <div class=\"progress-ring\" data-progress-ring><strong data-progress>--</strong><span>ready or draft</span></div>\n        <div class=\"filter-set\" role=\"group\" aria-label=\"Filter diligence artifacts\">\n          <button class=\"active\" data-filter=\"all\">All</button>\n          <button data-filter=\"missing\">Missing</button>\n          <button data-filter=\"draft\">Draft</button>\n          <button data-filter=\"available\">Available</button>\n        </div>\n      </div>\n      <div class=\"manifest\" data-artifacts></div>\n      <div class=\"download-grid\" data-downloads></div>\n    </section>\n  </main>\n\n  <footer>\n    <a class=\"wordmark\" href=\"/\"><b>W</b><span>WEYLAND<br>ARTIFICIAL INTELLIGENCE</span></a>\n    <p>Investor diligence should accelerate truth, not decorate uncertainty.</p>\n    <span>FINANCIALS / EVIDENCE REGISTER</span>\n  </footer>\n\n  <script type=\"module\" src=\"/assets/financials.js?v=20260729-1\"></script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_pricing() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"description\" content=\"WeylandAI SubConP Commercial Pricing & Standalone A La Carte Component Licensing. Run the back office and keep the field moving with automated construction AI tools.\">\n  <meta name=\"theme-color\" content=\"#090a0d\">\n  <title>Pricing & Licensing | WeylandAI SubConP Suite</title>\n  <style>\n    :root {\n      --bg: #090a0d;\n      --panel: rgba(18, 20, 25, 0.85);\n      --panel-hover: rgba(24, 27, 33, 0.95);\n      --line: #2c3139;\n      --text: #edf0f1;\n      --muted: #9299a3;\n      --gold: #f0b800;\n      --green: #61dfa0;\n      --blue: #66d4ff;\n      --purple: #a78bfa;\n      --red: #ff756e;\n    }\n    * { box-sizing: border-box; }\n    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: \"Avenir Next\", \"Helvetica Neue\", sans-serif; overflow-x: hidden; }\n    \n    /* Subtle geometric grid background with glowing radial attractor */\n    body:before {\n      content: \"\";\n      position: fixed;\n      inset: 0;\n      pointer-events: none;\n      background: radial-gradient(circle at 50% 10%, rgba(240, 184, 0, 0.12), transparent 35rem),\n                  radial-gradient(circle at 85% 60%, rgba(97, 223, 160, 0.08), transparent 30rem),\n                  linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),\n                  linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);\n      background-size: auto, auto, 30px 30px, 30px 30px;\n      z-index: -1;\n    }\n\n    .shell { position: relative; max-width: 1400px; margin: auto; padding: 25px clamp(16px, 4vw, 48px) 80px; }\n    \n    /* Navigation Bar */\n    header { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 40px; flex-wrap: wrap; }\n    .brand { display: flex; align-items: center; gap: 12px; color: var(--text); text-decoration: none; }\n    .mark { width: 44px; height: 44px; display: grid; place-items: center; background: var(--gold); color: var(--bg); font-weight: 900; border-radius: 6px; box-shadow: 0 0 20px rgba(240, 184, 0, 0.3); }\n    .brand b { display: block; letter-spacing: 0.16em; font-size: 15px; }\n    .brand small { display: block; color: var(--muted); font: 700 9px/1.5 ui-monospace, monospace; letter-spacing: 0.11em; }\n    .nav { display: flex; gap: 8px; flex-wrap: wrap; }\n    .nav a, .button { border: 1px solid var(--line); border-radius: 99px; padding: 10px 16px; color: var(--text); text-decoration: none; background: transparent; font: 750 11px/1 ui-monospace, monospace; letter-spacing: 0.08em; cursor: pointer; transition: all 0.25s ease; }\n    .nav a:hover, .button:hover { border-color: var(--gold); color: var(--gold); box-shadow: 0 0 18px rgba(240, 184, 0, 0.25); transform: translateY(-1px); }\n    .nav a.active { border-color: var(--gold); color: var(--gold); background: rgba(240, 184, 0, 0.08); }\n    \n    .button.primary { background: var(--gold); border-color: var(--gold); color: var(--bg); font-weight: 900; }\n    .button.primary:hover { transform: scale(1.03); box-shadow: 0 0 30px rgba(240, 184, 0, 0.5); color: #000; }\n    .button.green { background: var(--green); border-color: var(--green); color: var(--bg); font-weight: 900; }\n    .button.green:hover { transform: scale(1.03); box-shadow: 0 0 30px rgba(97, 223, 160, 0.5); color: #000; }\n\n    /* Titlebar */\n    .titlebar { text-align: center; margin: 50px 0 50px; }\n    .eyebrow { color: var(--gold); font: 800 12px/1.2 ui-monospace, monospace; letter-spacing: 0.2em; text-transform: uppercase; }\n    .titlebar h1 { font-size: clamp(38px, 5vw, 72px); letter-spacing: -0.05em; line-height: 1.05; margin: 16px 0 18px; font-weight: 900; }\n    .titlebar p { max-width: 780px; color: var(--muted); line-height: 1.65; margin: 0 auto; font-size: 18px; }\n\n    /* Interactive Calculator Container */\n    .calc-banner {\n      background: linear-gradient(135deg, rgba(24, 27, 33, 0.9), rgba(13, 15, 19, 0.95));\n      border: 1px solid var(--line);\n      border-radius: 20px;\n      padding: 24px 32px;\n      margin-bottom: 60px;\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      gap: 20px;\n      flex-wrap: wrap;\n      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);\n      backdrop-filter: blur(12px);\n    }\n    .calc-left { flex: 1; min-width: 300px; }\n    .calc-left h3 { margin: 0 0 6px; font-size: 20px; letter-spacing: -0.02em; color: #fff; }\n    .calc-left p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }\n    .calc-right { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }\n    .calc-stat { text-align: right; }\n    .calc-stat label { display: block; font: 700 10px ui-monospace, monospace; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }\n    .calc-stat .val { font-size: 32px; font-weight: 900; color: var(--green); letter-spacing: -0.02em; }\n    .calc-stat .old-val { text-decoration: line-through; color: var(--red); font-size: 20px; margin-right: 8px; font-weight: 700; }\n    \n    /* Section Headers */\n    .section-head { text-align: center; margin: 70px 0 32px; }\n    .section-head h2 { font-size: 40px; letter-spacing: -0.04em; margin: 0 0 12px; font-weight: 900; }\n    .section-head p { color: var(--muted); max-width: 720px; margin: 0 auto; font-size: 16px; line-height: 1.6; }\n\n    /* The SubConP Suite Attractor Box */\n    .suite-box {\n      max-width: 900px;\n      margin: 0 auto 80px;\n      background: linear-gradient(145deg, rgba(26, 30, 38, 0.96), rgba(16, 18, 24, 0.98));\n      border: 2px solid var(--gold);\n      border-radius: 24px;\n      padding: 42px;\n      box-shadow: 0 0 65px rgba(240, 184, 0, 0.28);\n      position: relative;\n      overflow: hidden;\n      transition: all 0.3s ease;\n    }\n    .suite-box:hover { box-shadow: 0 0 85px rgba(240, 184, 0, 0.38); border-color: #ffca28; }\n    .badge-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }\n    .pill-gold { border: 1px solid rgba(240, 184, 0, 0.6); color: var(--gold); border-radius: 99px; padding: 8px 16px; font: 800 11px/1 ui-monospace, monospace; letter-spacing: 0.1em; background: rgba(240, 184, 0, 0.18); box-shadow: 0 0 12px rgba(240, 184, 0, 0.2); }\n    .pill-save { border: 1px solid rgba(97, 223, 160, 0.5); color: var(--green); border-radius: 99px; padding: 8px 16px; font: 800 11px/1 ui-monospace, monospace; letter-spacing: 0.08em; background: rgba(97, 223, 160, 0.12); box-shadow: 0 0 12px rgba(97, 223, 160, 0.2); }\n    \n    .price-tag { font-size: 64px; font-weight: 900; color: #fff; margin: 12px 0 6px; letter-spacing: -0.04em; display: flex; align-items: baseline; gap: 6px; }\n    .price-tag span.unit { font-size: 20px; color: var(--muted); font-weight: 600; letter-spacing: 0; }\n    .price-sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; font-style: italic; }\n    \n    .slider-box { margin: 28px 0; padding: 26px; background: rgba(10, 12, 16, 0.85); border-radius: 16px; border: 1px solid var(--line); }\n    .slider-label { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 16px; margin-bottom: 16px; color: #fff; }\n    .slider-label span.gold-text { color: var(--gold); font: 800 16px ui-monospace, monospace; }\n    input[type=range] { width: 100%; accent-color: var(--gold); cursor: pointer; height: 8px; border-radius: 4px; background: #2c3139; outline: none; transition: background 0.2s; }\n\n    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 18px; margin: 32px 0; }\n    .feature-item { display: flex; align-items: flex-start; gap: 14px; font-size: 15px; color: #d1d5db; line-height: 1.5; background: rgba(255, 255, 255, 0.02); padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.04); }\n    .chk { color: var(--green); font-weight: 900; font-size: 18px; line-height: 1; margin-top: 2px; }\n    .feature-item strong { color: #fff; margin-right: 4px; }\n    .feature-item em { color: var(--gold); font-style: normal; font-size: 13px; font-family: ui-monospace, monospace; display: block; margin-top: 2px; }\n\n    /* A La Carte Grid */\n    .alacarte-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 36px; }\n    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 30px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); position: relative; }\n    .card:hover { transform: translateY(-6px); border-color: rgba(97, 223, 160, 0.5); background: var(--panel-hover); box-shadow: 0 22px 50px rgba(97, 223, 160, 0.15); }\n    \n    .sku-cat { color: var(--blue); font: 800 11px/1 ui-monospace, monospace; letter-spacing: 0.14em; text-transform: uppercase; }\n    .card h3 { font-size: 26px; margin: 14px 0 6px; letter-spacing: -0.02em; color: #fff; font-weight: 800; }\n    .sku-price { font-size: 38px; font-weight: 900; color: var(--green); margin: 12px 0 4px; letter-spacing: -0.03em; }\n    .sku-price span { font-size: 16px; color: var(--muted); font-weight: 600; letter-spacing: 0; }\n    .sku-edge { font-size: 13px; color: var(--gold); margin-bottom: 20px; font-weight: 600; background: rgba(240, 184, 0, 0.1); padding: 6px 10px; border-radius: 6px; display: inline-block; border: 1px solid rgba(240, 184, 0, 0.2); }\n    .card p { color: var(--muted); font-size: 15px; line-height: 1.6; margin: 0 0 30px; flex-grow: 1; }\n    \n    /* Standalone vs Bundle Summary Footer Banner */\n    .summary-box { max-width: 1000px; margin: 70px auto 40px; border: 1px solid var(--line); background: rgba(18, 20, 25, 0.9); border-radius: 20px; padding: 36px; text-align: center; }\n    .summary-box h3 { font-size: 28px; margin: 0 0 12px; color: #fff; }\n    .summary-box p { color: var(--muted); font-size: 16px; line-height: 1.6; max-width: 760px; margin: 0 auto 24px; }\n\n    footer { border-top: 1px solid var(--line); margin-top: 90px; padding-top: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; font-size: 13px; color: var(--muted); }\n    footer a { color: var(--gold); text-decoration: none; font-family: ui-monospace, monospace; }\n    footer a:hover { text-decoration: underline; }\n\n    @media (max-width: 768px) {\n      .feature-grid { grid-template-columns: 1fr; }\n      .calc-banner { flex-direction: column; align-items: flex-start; }\n      .calc-right { width: 100%; justify-content: space-between; }\n      .price-tag { font-size: 48px; }\n    }\n  </style>\n</head>\n<body>\n  <div class=\"shell\">\n    <header>\n      <a class=\"brand\" href=\"/\" id=\"homeLink\"><span class=\"mark\">WY</span><span><b>WEYLAND<br>AI</b><small>COMMERCIAL PRICING</small></span></a>\n      <nav class=\"nav\">\n        <a href=\"/whyweyland/\" id=\"navWhy\">WHY WEYLAND</a>\n        <a href=\"/pricing/\" class=\"active\" id=\"navPricing\">PRICING</a>\n        <a href=\"/onboarding/\" id=\"navOnboarding\">ONBOARDING</a>\n        <a href=\"/huntx/\" id=\"navHunt\">HUNTX</a>\n        <a href=\"/takeoffx/\" id=\"navTakeoff\">TAKEOFFX</a>\n        <a href=\"/propx/\" id=\"navProp\">PROPX</a>\n        <a href=\"/meetingx/\" id=\"navMeet\">MEETINGX</a>\n        <a href=\"/sightx/\" id=\"navSight\">SIGHTX</a>\n      </nav>\n      <button class=\"button primary\" onclick=\"window.location.href='/subscribe/';\" id=\"btnHeaderDeploy\">DEPLOY SUITE ($2,000/MO)</button>\n    </header>\n\n    <section class=\"titlebar\">\n      <p class=\"eyebrow\">ONE PROJECT SPINE · SEVEN OPERATING ENGINES</p>\n      <h1>Run the back office.<br><em style=\"color:var(--gold);font-style:normal;\">Keep the field moving.</em></h1>\n      <p>Deploy standalone point solutions A La Carte to immediately resolve administrative bottlenecks, or license the complete SubConP suite to operate your entire estimating and field pipeline on a single shared project record.</p>\n    </section>\n\n    <!-- LIVE COMPARISON BANNER -->\n    <div class=\"calc-banner\">\n      <div class=\"calc-left\">\n        <h3>SubConP Enterprise Economics</h3>\n        <p>Deploying all 7 operating engines separately totals <strong>$3,693/mo</strong> per active seat. By licensing the integrated SubConP suite, your organization unlocks massive economies of scale while preserving cryptographic data provenance.</p>\n      </div>\n      <div class=\"calc-right\">\n        <div class=\"calc-stat\">\n          <label>A La Carte Sum of Parts</label>\n          <span class=\"old-val\">$3,693 / mo</span>\n        </div>\n        <div class=\"calc-stat\">\n          <label>SubConP All-Inclusive Rate</label>\n          <span class=\"val\" id=\"topVal\">$2,000 / mo</span>\n        </div>\n        <button onclick=\"document.getElementById('suiteAnchor').scrollIntoView({behavior: 'smooth'});\" class=\"button green\" id=\"btnScrollSuite\">VIEW 46% SAVINGS BUNDLE</button>\n      </div>\n    </div>\n\n    <!-- STANDALONE A LA CARTE MENU -->\n    <div class=\"section-head\" id=\"alacarteSection\">\n      <h2>Standalone Point Solutions</h2>\n      <p>Targeted AI firepower designed to pay for itself in administrative hours saved during your very first bid cycle. Each component operates independently with human review at every commercial boundary.</p>\n    </div>\n\n    <div class=\"alacarte-grid\">\n      <!-- 1. CUTSHEETX -->\n      <div class=\"card\" id=\"cardCutsheet\">\n        <div>\n          <span class=\"sku-cat\">PRODUCT DATA ENGINE</span>\n          <h3>CutsheetX</h3>\n          <div class=\"sku-price\">$199 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Pays for itself in 2 hours of engineering lookup</div>\n          <p>Instantaneous product technical specification assembly and automated distributor cut-sheet packaging. Eliminates tedious manual PDF searches across supplier catalogs.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-cutsheetx-seat', 1, 'CutsheetX ($199/mo)')\" class=\"button\" id=\"btnBuyCutsheet\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 2. SUBX -->\n      <div class=\"card\" id=\"cardSub\">\n        <div>\n          <span class=\"sku-cat\">SUBMITTAL AUTOMATION</span>\n          <h3>SubX</h3>\n          <div class=\"sku-price\">$599 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">The extraction engine PropX and CutsheetX matching build on</div>\n          <p>Submittal Express. Automatically extracts technical specification requirements directly from project manuals and assembles complete, professional submittal compliance packages.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-subx-seat', 1, 'SubX ($599/mo)')\" class=\"button\" id=\"btnBuySub\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 3. PROPX -->\n      <div class=\"card\" id=\"cardProp\">\n        <div>\n          <span class=\"sku-cat\">SUBX ADD-ON</span>\n          <h3>PropX</h3>\n          <div class=\"sku-price\">$299 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Requires SubX &middot; turns a submittal into a priced, sendable proposal</div>\n          <p>Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-propx-seat', 1, 'PropX ($299/mo)')\" class=\"button\" id=\"btnBuyProp\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 4. TAKEOFFX -->\n      <div class=\"card\" id=\"cardTakeoff\">\n        <div>\n          <span class=\"sku-cat\">MACHINE-VISION TAKEOFF</span>\n          <h3>TakeoffX</h3>\n          <div class=\"sku-price\">$499 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">vs. Togal.AI ($299/mo for manual counting only)</div>\n          <p>Takeoff Express. Sub-second machine-vision structural drawing quantification and vector blueprint takeoff engine. Moves estimators from manually tracing lines to reviewing verified results.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-takeoffx-seat', 1, 'TakeoffX ($499/mo)')\" class=\"button\" id=\"btnBuyTakeoff\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 5. MEETINGX -->\n      <div class=\"card\" id=\"cardMeet\">\n        <div>\n          <span class=\"sku-cat\">SIGHTX ADD-ON</span>\n          <h3>MeetingX</h3>\n          <div class=\"sku-price\">$299 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Requires SightX &middot; live avatars, text & voice chat inside the walkthrough</div>\n          <p>Meeting Intelligence isn't a separate app - it's real-time collaboration layered directly into the SightX 3D walkthrough. Multiple reviewers join the same scene as avatars, talk and type in context, with decisions logged where they happened.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-meetingx-seat', 1, 'MeetingX ($599/mo)')\" class=\"button\" id=\"btnBuyMeet\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 6. HUNTX -->\n      <div class=\"card\" id=\"cardHunt\">\n        <div>\n          <span class=\"sku-cat\">LEAD RECONNAISSANCE</span>\n          <h3>HuntX</h3>\n          <div class=\"sku-price\">$799 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">vs. Dodge / ConstructConnect ($6k-$12k/year)</div>\n          <p>Opportunity Discovery. Autonomous municipal permit ledger spider and commercial general contractor RFP reconnaissance engine. Uncovers high-margin bidding opportunities before the competition.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-huntx-seat', 1, 'HuntX ($799/mo)')\" class=\"button\" id=\"btnBuyHunt\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 7. SIGHTX -->\n      <div class=\"card\" id=\"cardSight\">\n        <div>\n          <span class=\"sku-cat\">3D SPATIAL SIMULATION</span>\n          <h3>SightX</h3>\n          <div class=\"sku-price\">$999 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">vs. Lumion Pro / BIM 360 Enterprise Licenses</div>\n          <p>Spatial Project Intelligence. Transforms standard 2D flat architectural blueprints, MEP schematics, and structural schedules into interactive 3D virtual job-site simulations that prevent costly rework.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-sightx-seat', 1, 'SightX ($999/mo)')\" class=\"button\" id=\"btnBuySight\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 8. MARKETX -->\n      <div class=\"card\" id=\"cardMarket\">\n        <div>\n          <span class=\"sku-cat\">MARKET INTELLIGENCE</span>\n          <h3>MarketX</h3>\n          <div class=\"sku-price\">$249 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Live construction spending, housing starts &amp; materials trend - real FRED data</div>\n          <p>Market Trend Analyzer. Live U.S. construction-market indicators sourced directly from the Federal Reserve's public FRED data, refreshed on every load - know whether the market is expanding or contracting before you commit to a bid cycle.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-marketx-seat', 1, 'MarketX ($249/mo)')\" class=\"button\" id=\"btnBuyMarket\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 9. PRICEX -->\n      <div class=\"card\" id=\"cardPrice\">\n        <div>\n          <span class=\"sku-cat\">MATERIAL PRICING</span>\n          <h3>PriceX</h3>\n          <div class=\"sku-price\">$149 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Live lumber, metals &amp; materials PPI - real FRED data, MoM/YoY change</div>\n          <p>Material Pricing Tracker. Live Producer Price Index data for lumber, metals, and the broader construction-materials basket - see material cost movement before you price a bid, not after.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-pricex-seat', 1, 'PriceX ($149/mo)')\" class=\"button\" id=\"btnBuyPrice\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 10. COMPX -->\n      <div class=\"card\" id=\"cardComp\">\n        <div>\n          <span class=\"sku-cat\">COMPETITOR INTELLIGENCE</span>\n          <h3>CompX</h3>\n          <div class=\"sku-price\">$199 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Real TXDOT bid-tabulation history - win rate &amp; total won value per vendor</div>\n          <p>See who else is bidding - and winning. Search any contractor name against real Texas DOT bid tabulation history: total bids, win rate, total won value, sourced live from data.texas.gov.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-compx-seat', 1, 'CompX ($199/mo)')\" class=\"button\" id=\"btnBuyComp\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 11. WEATHERX -->\n      <div class=\"card\" id=\"cardWeather\">\n        <div>\n          <span class=\"sku-cat\">WEATHER-DELAY CALCULATOR</span>\n          <h3>WeatherX</h3>\n          <div class=\"sku-price\">$149 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Real NWS 7-day forecast, classified by delay risk</div>\n          <p>Know which days threaten your schedule. Live National Weather Service forecast for any US jobsite, classified into high/moderate/low delay risk by precipitation odds, severe conditions, and wind speed.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-weatherx-seat', 1, 'WeatherX ($149/mo)')\" class=\"button\" id=\"btnBuyWeather\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 12. FORECASTX -->\n      <div class=\"card\" id=\"cardForecast\">\n        <div>\n          <span class=\"sku-cat\">CASH FLOW FORECASTING</span>\n          <h3>ForecastX</h3>\n          <div class=\"sku-price\">$249 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Month-by-month billing, retainage &amp; cash-receipt projection</div>\n          <p>See your cash position before you sign. Enter a contract's real terms - value, duration, retainage, payment terms - and get a full month-by-month cash flow projection, including exactly when retainage comes back.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-forecastx-seat', 1, 'ForecastX ($249/mo)')\" class=\"button\" id=\"btnBuyForecast\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n\n      <!-- 13. GEOX -->\n      <div class=\"card\" id=\"cardGeo\">\n        <div>\n          <span class=\"sku-cat\">GEOSPATIAL LOOKUP</span>\n          <h3>GeoX</h3>\n          <div class=\"sku-price\">$149 <span class=\"unit\">/ mo</span></div>\n          <div class=\"sku-edge\">Real Census county/state/tract FIPS lookup, not just a map pin</div>\n          <p>Know the jurisdiction, not just the pin. Look up any US project address against the Census Bureau's real geocoder - coordinates plus actual county, state, and census tract FIPS codes for jurisdiction-based compliance and reporting.</p>\n        </div>\n        <button onclick=\"triggerCheckout('weyland-geox-seat', 1, 'GeoX ($149/mo)')\" class=\"button\" id=\"btnBuyGeo\" style=\"width:100%;text-align:center;\">ACTIVATE STANDALONE SEAT</button>\n      </div>\n    </div>\n\n    <!-- THE SUBCONP SUITE BUNDLE -->\n    <div class=\"section-head\" id=\"suiteAnchor\" style=\"margin-top: 100px;\">\n      <p class=\"eyebrow\">THE RECOMMENDED ENTERPRISE ARCHITECTURE</p>\n      <h2>SubConP Operating Package</h2>\n      <p>Why purchase single tools when you can run your entire commercial pipeline on a single interlocked project record? Unlock all 7 operating engines and save 46% monthly.</p>\n    </div>\n\n    <div class=\"suite-box\" id=\"subconpSuiteCard\">\n      <div class=\"badge-bar\">\n        <span class=\"pill-gold\">★ RECOMMENDED ALL-INCLUSIVE SUITE</span>\n        <span class=\"pill-save\">SAVE $1,693/MO (46% OFF STANDALONE VALUE)</span>\n      </div>\n      <div class=\"price-tag\">\n        $<span id=\"suiteMonthlyTotal\">2,000</span><span class=\"unit\">USD / SEAT / MONTH</span>\n      </div>\n      <div class=\"price-sub\">Billed monthly. Includes all 7 autonomous engines operating seamlessly on one project spine.</div>\n      \n      <div class=\"slider-box\">\n        <div class=\"slider-label\">\n          <span>Active Operator Seats:</span>\n          <span class=\"gold-text\" id=\"seatCountLabel\">1 Seat ($2,000 / mo)</span>\n        </div>\n        <input type=\"range\" id=\"suiteSeats\" min=\"1\" max=\"50\" value=\"1\" oninput=\"updateSuiteCalculation(this.value)\">\n      </div>\n      \n      <div class=\"feature-grid\">\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>HuntX</strong> Opportunity discovery & permit crawler. <em>$799/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>SubX</strong> Submittal Express spec compliance packages. <em>$599/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>TakeoffX</strong> Machine-vision blueprint quantification. <em>$499/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>CutsheetX</strong> Instant technical product specification data. <em>$199/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>PropX</strong> Proposal Express commercial bid generator. <em>$299/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>SightX</strong> Interactive 3D structural simulation visualizer. <em>$999/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>MeetingX</strong> Spatial 3D meeting intelligence & action items. <em>$299/mo standalone value</em></div>\n        </div>\n        <div class=\"feature-item\">\n          <span class=\"chk\">✓</span>\n          <div><strong>Sovereign Compute</strong> Local Apple Silicon Metal inference & Cloudflare edge distribution. <em>$0.00 / Token Variable Overhead</em></div>\n        </div>\n      </div>\n      \n      <button onclick=\"triggerCheckout('weyland-subconp-suite-seat', document.getElementById('suiteSeats').value, 'SubConP All-Inclusive Suite')\" class=\"button primary\" id=\"btnActivateSuite\" style=\"width:100%;padding:20px;font-size:17px;letter-spacing:0.08em;margin-top:14px;box-shadow: 0 0 35px rgba(240, 184, 0, 0.4);\">\n        ACTIVATE SUBCONP SUITE ($<span id=\"btnSuiteTotal\">2,000</span> / MO)\n      </button>\n    </div>\n\n    <!-- COMMERCIAL BOUNDARY NOTE -->\n    <div class=\"summary-box\">\n      <h3>Sovereign Commercial Boundaries</h3>\n      <p>Human estimator approval is strictly enforced at every commercial boundary. Implementation scope, historical enterprise data migrations, custom ERP integrations, and high-density compute usage exceeding standard policy thresholds are quoted separately as modular operational enhancements.</p>\n      <p style=\"font-size:13px;color:var(--gold);margin-bottom:0;font-family:ui-monospace,monospace;\">\n        ⚡ CHECKOUT SECURELY PROCESSED VIA STRIPE. NO CARD DATA TOUCHES WEYLANDAI SERVERS.\n      </p>\n    </div>\n\n    <footer>\n      <span>WEYLAND ARTIFICIAL INTELLIGENCE / SUBCONP SUITE</span>\n      <p style=\"margin:0;\">One project spine. Seven operating engines. Zero simulated compute.</p>\n      <a href=\"mailto:hello@weylandai.com\" id=\"footerContact\">hello@weylandai.com</a>\n    </footer>\n  </div>\n\n  <script>\n    const moneyFormatter = new Intl.NumberFormat('en-US');\n    \n    function updateSuiteCalculation(val) {\n      const seats = parseInt(val, 10);\n      const total = seats * 2000;\n      document.getElementById('seatCountLabel').textContent = seats + (seats === 1 ? ' Seat ($2,000 / mo)' : ' Seats ($' + moneyFormatter.format(total) + ' / mo)');\n      document.getElementById('suiteMonthlyTotal').textContent = moneyFormatter.format(total);\n      document.getElementById('btnSuiteTotal').textContent = moneyFormatter.format(total);\n    }\n\n    async function triggerCheckout(sku, quantity, name) {\n      // /subscribe's own checkout button is hardcoded to the suite product\n      // and ignores query params, so route the suite purchase through it\n      // unchanged. All 7 components are now real, separately-priced Stripe\n      // products - call checkout/create directly for all of them. Note:\n      // buying SightX alone activates billing but the viewer itself stays\n      // a public, ungated demo (no per-customer project ingestion yet) -\n      // see /sightx and MeetingX's own gate for what SightX access actually\n      // changes today.\n      if (sku === 'weyland-subconp-suite-seat') {\n        window.location.href = '/subscribe/?checkout=init&sku=' + encodeURIComponent(sku) + '&qty=' + quantity + '&plan=' + encodeURIComponent(name);\n        return;\n      }\n      if (sku === 'weyland-cutsheetx-seat' || sku === 'weyland-takeoffx-seat' || sku === 'weyland-propx-seat' || sku === 'weyland-huntx-seat' || sku === 'weyland-subx-seat' || sku === 'weyland-meetingx-seat' || sku === 'weyland-sightx-seat' || sku === 'weyland-marketx-seat' || sku === 'weyland-pricex-seat' || sku === 'weyland-compx-seat' || sku === 'weyland-weatherx-seat' || sku === 'weyland-forecastx-seat' || sku === 'weyland-geox-seat') {\n        const btn = event && event.target;\n        if (btn) { btn.disabled = true; btn.textContent = 'REDIRECTING TO CHECKOUT...'; }\n        try {\n          const res = await fetch('/api/billing/checkout/create', {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify({ product_id: sku, quantity: quantity || 1 })\n          });\n          const data = await res.json();\n          if (!res.ok || !data.checkout_url) throw new Error((data.detail && data.detail.message) || 'Checkout unavailable');\n          window.location.href = data.checkout_url;\n        } catch (e) {\n          if (btn) { btn.disabled = false; btn.textContent = 'CONTACT TO ACTIVATE'; }\n          alert('Checkout error: ' + e.message + ' - email hello@weylandai.com instead.');\n        }\n        return;\n      }\n      window.location.href = 'mailto:hello@weylandai.com?subject=' + encodeURIComponent(name + ' standalone seat') + '&body=' + encodeURIComponent('I would like to activate ' + name + ' as a standalone seat. Instant self-checkout for this tier isn\\'t live yet - please set up billing for my account.');\n    }\n  </script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_marketx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>MarketX | Construction Market Trend Analyzer</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1100px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 32px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:640px;line-height:1.6}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:28px}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-bottom:36px}\n.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}\n.card h3{margin:0 0 10px;font-size:15px;letter-spacing:-.01em;color:#fff}\n.big{font-size:32px;font-weight:900;letter-spacing:-.02em;margin:6px 0}\n.trend{font:800 11px/1 ui-monospace,monospace;letter-spacing:.05em;padding:4px 9px;border-radius:99px;display:inline-block}\n.trend.rising{background:rgba(255,117,110,.15);color:var(--red)}\n.trend.falling{background:rgba(97,223,160,.15);color:var(--green)}\n.trend.flat{background:rgba(146,153,163,.15);color:var(--muted)}\n.meta{color:var(--muted);font-size:12px;margin-top:8px}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/pricex/\">PRICEX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">MARKET TREND ANALYZER</p>\n<h1>Where the construction market is headed.</h1>\n<p>Live U.S. construction spending, housing starts, and materials-cost trend, sourced directly from the Federal Reserve's public FRED data - not a static report, refreshed on every load.</p>\n</section>\n<div class=\"source-note\" id=\"sourceNote\">Loading live data from FRED...</div>\n<div class=\"grid\" id=\"trendGrid\"></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">MarketX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$249/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=MarketX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nfunction fmt(n){return n===null||n===undefined?'--':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)}\nfunction trendClass(t){return t==='rising'?'rising':t==='falling'?'falling':'flat'}\nfetch('/api/marketx/trends').then(r=>r.json()).then(d=>{\n  if(d.detail){document.getElementById('sourceNote').innerHTML='<span class=\"err\">'+d.detail.message+'</span>';return}\n  document.getElementById('sourceNote').textContent='SOURCE: '+d.source+' - fetched '+new Date(d.fetched_at).toLocaleString();\n  document.getElementById('trendGrid').innerHTML = d.indicators.map(i=>\n    '<div class=\"card\"><h3>'+i.label+'</h3><div class=\"big\">'+fmt(i.latest_value)+'</div>'+\n    '<span class=\"trend '+trendClass(i.trend)+'\">'+i.trend.toUpperCase()+(i.yoy_pct_change!==null?' '+(i.yoy_pct_change>0?'+':'')+i.yoy_pct_change+'% YOY':'')+'</span>'+\n    '<div class=\"meta\">As of '+i.latest_date+' &middot; MoM '+(i.mom_pct_change!==null?(i.mom_pct_change>0?'+':'')+i.mom_pct_change+'%':'n/a')+' &middot; FRED series '+i.series_id+'</div></div>'\n  ).join('');\n}).catch(e=>{document.getElementById('sourceNote').innerHTML='<span class=\"err\">Failed to load live data: '+e.message+'</span>'});\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_pricex() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>PriceX | Material Pricing Tracker</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1100px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 32px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:640px;line-height:1.6}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:28px}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-bottom:36px}\n.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}\n.card h3{margin:0 0 10px;font-size:15px;letter-spacing:-.01em;color:#fff}\n.big{font-size:32px;font-weight:900;letter-spacing:-.02em;margin:6px 0}\n.chg{font:800 11px/1 ui-monospace,monospace;letter-spacing:.05em;padding:4px 9px;border-radius:99px;display:inline-block;margin-right:6px}\n.chg.up{background:rgba(255,117,110,.15);color:var(--red)}\n.chg.down{background:rgba(97,223,160,.15);color:var(--green)}\n.chg.flat{background:rgba(146,153,163,.15);color:var(--muted)}\n.meta{color:var(--muted);font-size:12px;margin-top:8px}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/marketx/\">MARKETX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">MATERIAL PRICING TRACKER</p>\n<h1>Know material cost movement before you price a bid.</h1>\n<p>Live Producer Price Index data for lumber, metals, and the broader construction-materials basket, sourced directly from the Federal Reserve's public FRED data - refreshed on every load, not a cached report.</p>\n</section>\n<div class=\"source-note\" id=\"sourceNote\">Loading live data from FRED...</div>\n<div class=\"grid\" id=\"materialGrid\"></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">PriceX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$149/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=PriceX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nfunction fmt(n){return n===null||n===undefined?'--':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)}\nfunction chgClass(v){return v===null?'flat':v>0?'up':v<0?'down':'flat'}\nfetch('/api/pricex/materials').then(r=>r.json()).then(d=>{\n  if(d.detail){document.getElementById('sourceNote').innerHTML='<span class=\"err\">'+d.detail.message+'</span>';return}\n  document.getElementById('sourceNote').textContent='SOURCE: '+d.source+' - fetched '+new Date(d.fetched_at).toLocaleString();\n  document.getElementById('materialGrid').innerHTML = d.materials.map(m=>\n    '<div class=\"card\"><h3>'+m.label+'</h3><div class=\"big\">'+fmt(m.latest_value)+' <span style=\"font-size:14px;color:var(--muted);font-weight:600\">(1982=100)</span></div>'+\n    '<span class=\"chg '+chgClass(m.mom_pct_change)+'\">MoM '+(m.mom_pct_change!==null?(m.mom_pct_change>0?'+':'')+m.mom_pct_change+'%':'n/a')+'</span>'+\n    '<span class=\"chg '+chgClass(m.yoy_pct_change)+'\">YoY '+(m.yoy_pct_change!==null?(m.yoy_pct_change>0?'+':'')+m.yoy_pct_change+'%':'n/a')+'</span>'+\n    '<div class=\"meta\">As of '+m.latest_date+' &middot; FRED series '+m.series_id+'</div></div>'\n  ).join('');\n}).catch(e=>{document.getElementById('sourceNote').innerHTML='<span class=\"err\">Failed to load live data: '+e.message+'</span>'});\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_compx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>CompX | Competitor Bid Intelligence</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1100px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 24px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:660px;line-height:1.6}\n.search-bar{display:flex;gap:10px;margin-bottom:28px}\n.search-bar input{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 18px;color:#fff;font-size:15px}\n.search-bar input:focus{outline:none;border-color:var(--gold)}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:20px}\n.vgrid{display:flex;flex-direction:column;gap:16px}\n.vcard{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}\n.vcard h3{margin:0 0 12px;font-size:18px;color:#fff}\n.stat-row{display:flex;gap:28px;flex-wrap:wrap;margin-bottom:16px}\n.stat{}\n.stat label{display:block;font:700 10px ui-monospace,monospace;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}\n.stat .v{font-size:22px;font-weight:900}\n.stat .v.green{color:var(--green)}\nproj-list{list-style:none;margin:0;padding:0}\n.proj{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}\n.proj .won{color:var(--green);font-weight:800}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px;border-radius:14px;margin-top:28px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/marketx/\">MARKETX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">COMPETITOR BID INTELLIGENCE</p>\n<h1>See who else is bidding - and winning.</h1>\n<p>Search real Texas DOT bid-tabulation history for any contractor name: total bids, win rate, and total won value, sourced live from data.texas.gov - not a static report.</p>\n</section>\n<div class=\"search-bar\"><input id=\"cx-q\" type=\"text\" placeholder=\"Search a contractor/vendor name, e.g. Garret Shields\"><button class=\"button primary\" id=\"cx-search-btn\">SEARCH</button></div>\n<div class=\"source-note\" id=\"sourceNote\">Enter a name and search live TXDOT bid history.</div>\n<div class=\"vgrid\" id=\"vgrid\"></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">CompX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$199/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=CompX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nfunction esc(s){return String(s==null?'':s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}\nfunction money(n){return '$'+Number(n).toLocaleString(undefined,{maximumFractionDigits:0})}\nasync function runSearch(){\n  const q = document.getElementById('cx-q').value.trim();\n  if(!q) return;\n  document.getElementById('sourceNote').textContent = 'Querying live TXDOT bid history...';\n  document.getElementById('vgrid').innerHTML = '';\n  try {\n    const res = await fetch('/api/compx/vendors?q='+encodeURIComponent(q));\n    const d = await res.json();\n    if(!res.ok){document.getElementById('sourceNote').innerHTML='<span class=\"err\">'+(d.detail&&d.detail.message||'Search failed')+'</span>';return}\n    document.getElementById('sourceNote').textContent='SOURCE: '+d.source+' - '+d.vendors.length+' vendor(s) matched \"'+d.query+'\"';\n    if(!d.vendors.length){document.getElementById('vgrid').innerHTML='<div class=\"vcard\">No vendors matched. Try a shorter or different name fragment.</div>';return}\n    document.getElementById('vgrid').innerHTML = d.vendors.map(v=>\n      '<div class=\"vcard\"><h3>'+esc(v.vendor_name)+'</h3>'+\n      '<div class=\"stat-row\">'+\n      '<div class=\"stat\"><label>Total Bids</label><div class=\"v\">'+v.total_bids+'</div></div>'+\n      '<div class=\"stat\"><label>Wins</label><div class=\"v green\">'+v.wins+'</div></div>'+\n      '<div class=\"stat\"><label>Win Rate</label><div class=\"v\">'+v.win_rate_pct+'%</div></div>'+\n      '<div class=\"stat\"><label>Total Won Value</label><div class=\"v green\">'+money(v.total_win_value)+'</div></div>'+\n      '</div>'+\n      v.recent_projects.map(p=>'<div class=\"proj\"><span>'+esc(p.project_name)+' ('+esc(p.county)+' County)</span><span class=\"'+(p.won?'won':'')+'\">'+(p.won?'WON ':'')+money(p.bid_amount)+'</span></div>').join('')+\n      '</div>'\n    ).join('');\n  } catch(e) {\n    document.getElementById('sourceNote').innerHTML='<span class=\"err\">Failed to load live data: '+e.message+'</span>';\n  }\n}\ndocument.getElementById('cx-search-btn').addEventListener('click', runSearch);\ndocument.getElementById('cx-q').addEventListener('keydown', e=>{if(e.key==='Enter')runSearch()});\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_geox() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>GeoX | Project Geospatial Lookup</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1000px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 24px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:660px;line-height:1.6}\n.search-bar{display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap}\n.search-bar input{flex:1;min-width:260px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 18px;color:#fff;font-size:15px}\n.search-bar input:focus{outline:none;border-color:var(--gold)}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:20px}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:36px}\n.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}\n.card label{display:block;font:700 10px ui-monospace,monospace;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}\n.card .v{font-size:19px;font-weight:800}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/compx/\">COMPX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">PROJECT GEOSPATIAL LOOKUP</p>\n<h1>Know the jurisdiction, not just the pin.</h1>\n<p>Look up any US project address against the Census Bureau's real geocoder - coordinates plus the actual county, state, and census tract FIPS codes, useful for jurisdiction-based compliance and reporting, not just a map marker.</p>\n</section>\n<div class=\"search-bar\"><input id=\"gx-addr\" type=\"text\" placeholder=\"1600 Pennsylvania Ave NW, Washington, DC\"><button class=\"button primary\" id=\"gx-search-btn\">LOOK UP</button></div>\n<div class=\"source-note\" id=\"sourceNote\">Enter a US project address and look it up.</div>\n<div class=\"grid\" id=\"gx-grid\"></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">GeoX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$149/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=GeoX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nasync function runLookup(){\n  const address = document.getElementById('gx-addr').value.trim();\n  if(!address) return;\n  document.getElementById('sourceNote').textContent = 'Querying Census geocoder...';\n  document.getElementById('gx-grid').innerHTML = '';\n  try {\n    const res = await fetch('/api/geox/lookup?address=' + encodeURIComponent(address));\n    const d = await res.json();\n    if(!res.ok){ document.getElementById('sourceNote').innerHTML = '<span class=\"err\">' + (d.detail && d.detail.message) + '</span>'; return; }\n    document.getElementById('sourceNote').textContent = 'SOURCE: ' + d.source + ' - matched: ' + d.matched_address;\n    document.getElementById('gx-grid').innerHTML =\n      '<div class=\"card\"><label>Coordinates</label><div class=\"v\">' + d.latitude.toFixed(5) + ', ' + d.longitude.toFixed(5) + '</div></div>' +\n      '<div class=\"card\"><label>County</label><div class=\"v\">' + (d.county_name||'—') + '</div></div>' +\n      '<div class=\"card\"><label>State</label><div class=\"v\">' + (d.state_name||'—') + '</div></div>' +\n      '<div class=\"card\"><label>County FIPS</label><div class=\"v\">' + (d.county_geoid||'—') + '</div></div>' +\n      '<div class=\"card\"><label>Census Tract GEOID</label><div class=\"v\">' + (d.census_tract_geoid||'—') + '</div></div>';\n  } catch(e) {\n    document.getElementById('sourceNote').innerHTML = '<span class=\"err\">Failed: ' + e.message + '</span>';\n  }\n}\ndocument.getElementById('gx-search-btn').addEventListener('click', runLookup);\ndocument.getElementById('gx-addr').addEventListener('keydown', e=>{if(e.key==='Enter')runLookup()});\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_forecastx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>ForecastX | Project Cash Flow Forecaster</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1100px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 24px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:660px;line-height:1.6}\n.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}\n.form-grid label{display:block;font:700 10px ui-monospace,monospace;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}\n.form-grid input{width:100%;background:#0d0f14;border:1px solid var(--line);border-radius:8px;padding:10px 12px;color:#fff;font-size:14px;box-sizing:border-box}\n.form-grid input:focus{outline:none;border-color:var(--gold)}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:20px}\n.summary-row{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}\n.sumcard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 20px}\n.sumcard label{display:block;font:700 10px ui-monospace,monospace;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}\n.sumcard .v{font-size:22px;font-weight:900}\n.table-wrap{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:14px}\ntable{width:100%;border-collapse:collapse;font-size:13px}\nth{text-align:left;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;padding:12px 16px;background:#0d0f14;border-bottom:2px solid var(--line);white-space:nowrap}\ntd{padding:10px 16px;border-bottom:1px solid #1f232b;white-space:nowrap}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px;border-radius:14px;margin-top:28px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/marketx/\">MARKETX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">PROJECT CASH FLOW FORECASTER</p>\n<h1>See your cash position before you sign.</h1>\n<p>Enter a contract's real terms - value, duration, retainage, payment terms - and get a month-by-month billing and cash-receipt projection, including when retainage actually comes back.</p>\n</section>\n<div class=\"form-grid\">\n<div><label>CONTRACT VALUE ($)</label><input id=\"fx-value\" type=\"number\" placeholder=\"e.g. 500000\"></div>\n<div><label>START DATE</label><input id=\"fx-start\" type=\"date\"></div>\n<div><label>DURATION (MONTHS)</label><input id=\"fx-duration\" type=\"number\" placeholder=\"e.g. 8\"></div>\n<div><label>RETAINAGE (%)</label><input id=\"fx-retainage\" type=\"number\" value=\"10\"></div>\n<div><label>PAYMENT TERMS (DAYS)</label><input id=\"fx-terms\" type=\"number\" value=\"30\"></div>\n</div>\n<button class=\"button primary\" id=\"fx-run-btn\" style=\"margin-bottom:20px\">RUN PROJECTION</button>\n<div class=\"source-note\" id=\"sourceNote\">Enter contract terms and run the projection - pure calculation, no external data source.</div>\n<div class=\"summary-row\" id=\"summaryRow\"></div>\n<div class=\"table-wrap\"><table><thead><tr><th>MONTH</th><th>BILL DATE</th><th>BILLED</th><th>RETAINAGE HELD</th><th>NET PAYMENT</th><th>EXPECTED PAID</th><th>CUM. CASH RECEIVED</th></tr></thead><tbody id=\"fx-body\"></tbody></table></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">ForecastX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$249/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=ForecastX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nfunction money(n){return '$'+Number(n).toLocaleString(undefined,{maximumFractionDigits:0})}\ndocument.getElementById('fx-start').valueAsDate = new Date();\nasync function runProjection(){\n  const body = {\n    contract_value: parseFloat(document.getElementById('fx-value').value),\n    start_date: document.getElementById('fx-start').value,\n    duration_months: parseInt(document.getElementById('fx-duration').value, 10),\n    retainage_pct: parseFloat(document.getElementById('fx-retainage').value),\n    payment_terms_days: parseInt(document.getElementById('fx-terms').value, 10)\n  };\n  document.getElementById('sourceNote').textContent = 'Calculating...';\n  try {\n    const res = await fetch('/api/forecastx/project', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });\n    const d = await res.json();\n    if(!res.ok){document.getElementById('sourceNote').innerHTML='<span class=\"err\">'+(d.detail&&d.detail.message||'Failed')+'</span>';return}\n    document.getElementById('sourceNote').textContent = 'Monthly billing: '+money(d.projection.monthly_billing)+' | Peak retainage held: '+money(d.projection.total_retainage_held_at_peak)+' | Retainage released: '+d.projection.retainage_release_date;\n    document.getElementById('summaryRow').innerHTML =\n      '<div class=\"sumcard\"><label>Monthly Billing</label><div class=\"v\">'+money(d.projection.monthly_billing)+'</div></div>'+\n      '<div class=\"sumcard\"><label>Peak Retainage Held</label><div class=\"v\" style=\"color:var(--gold)\">'+money(d.projection.total_retainage_held_at_peak)+'</div></div>'+\n      '<div class=\"sumcard\"><label>Retainage Release Date</label><div class=\"v\" style=\"font-size:16px\">'+d.projection.retainage_release_date+'</div></div>';\n    document.getElementById('fx-body').innerHTML = d.projection.months.map(m=>\n      '<tr><td>'+m.month_index+'</td><td>'+m.bill_date+'</td><td>'+money(m.billed_amount)+'</td><td>'+money(m.retainage_held)+'</td><td>'+money(m.net_payment)+'</td><td>'+m.expected_payment_date+'</td><td style=\"color:var(--green)\">'+money(m.cumulative_cash_received)+'</td></tr>'\n    ).join('');\n  } catch(e) {\n    document.getElementById('sourceNote').innerHTML='<span class=\"err\">Failed: '+e.message+'</span>';\n  }\n}\ndocument.getElementById('fx-run-btn').addEventListener('click', runProjection);\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_weatherx() {
    return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"theme-color\" content=\"#090a0d\">\n<title>WeatherX | Weather-Delay Impact Calculator</title>\n<style>\n:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}\n.shell{max-width:1100px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:24px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}\n.mark{width:42px;height:42px;display:grid;place-items:center;background:var(--gold);color:var(--bg);font-weight:900;border-radius:6px}\n.nav{display:flex;gap:8px;flex-wrap:wrap}\n.nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}\n.nav a:hover,.button:hover{border-color:var(--gold);color:var(--gold)}\n.button.primary{background:var(--gold);border-color:var(--gold);color:var(--bg);font-weight:900}\n.titlebar{margin:40px 0 24px}\n.eyebrow{color:var(--gold);font:800 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}\n.titlebar h1{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin:12px 0}\n.titlebar p{color:var(--muted);max-width:660px;line-height:1.6}\n.search-bar{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}\n.search-bar input{flex:1;min-width:140px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 18px;color:#fff;font-size:15px}\n.search-bar input:focus{outline:none;border-color:var(--gold)}\n.presets{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}\n.preset{border:1px solid var(--line);border-radius:99px;padding:6px 12px;font:700 10px ui-monospace,monospace;color:var(--muted);cursor:pointer;background:none}\n.preset:hover{border-color:var(--gold);color:var(--gold)}\n.source-note{font:600 11px ui-monospace,monospace;color:var(--muted);margin-bottom:20px}\n.summary-row{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}\n.sumcard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 20px}\n.sumcard label{display:block;font:700 10px ui-monospace,monospace;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}\n.sumcard .v{font-size:26px;font-weight:900}\n.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}\n.pcard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}\n.pcard.high{border-color:var(--red)}\n.pcard.moderate{border-color:var(--gold)}\n.pcard h4{margin:0 0 6px;font-size:13px;color:#fff}\n.risk-tag{font:800 9px/1 ui-monospace,monospace;letter-spacing:.06em;padding:3px 7px;border-radius:99px;display:inline-block;margin-bottom:6px}\n.risk-tag.high{background:rgba(255,117,110,.18);color:var(--red)}\n.risk-tag.moderate{background:rgba(240,184,0,.18);color:var(--gold)}\n.risk-tag.low{background:rgba(97,223,160,.15);color:var(--green)}\n.pcard p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}\n.err{color:var(--red);font-size:13px}\n.card.cta{background:linear-gradient(145deg,rgba(26,30,38,.96),rgba(16,18,24,.98));border:1px solid var(--gold);text-align:center;padding:32px;border-radius:14px;margin-top:28px}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n<header>\n<a class=\"brand\" href=\"/\"><span class=\"mark\">WY</span><b>WEYLAND AI</b></a>\n<nav class=\"nav\"><a href=\"/pricing/\">PRICING</a><a href=\"/huntx/\">HUNTX</a><a href=\"/compx/\">COMPX</a></nav>\n</header>\n<section class=\"titlebar\">\n<p class=\"eyebrow\">WEATHER-DELAY IMPACT CALCULATOR</p>\n<h1>Know which days threaten your schedule.</h1>\n<p>Live 7-day forecast from the National Weather Service, classified into delay risk (precipitation odds, severe conditions, wind speed) for any US jobsite - real government forecast data, not a generic weather widget.</p>\n</section>\n<div class=\"search-bar\"><input id=\"wx-lat\" type=\"text\" placeholder=\"Latitude, e.g. 29.7604\"><input id=\"wx-lon\" type=\"text\" placeholder=\"Longitude, e.g. -95.3698\"><button class=\"button primary\" id=\"wx-search-btn\">CHECK FORECAST</button></div>\n<div class=\"presets\">\n<button class=\"preset\" data-lat=\"29.7604\" data-lon=\"-95.3698\">Houston, TX</button>\n<button class=\"preset\" data-lat=\"32.7767\" data-lon=\"-96.7970\">Dallas, TX</button>\n<button class=\"preset\" data-lat=\"30.2672\" data-lon=\"-97.7431\">Austin, TX</button>\n<button class=\"preset\" data-lat=\"34.0522\" data-lon=\"-118.2437\">Los Angeles, CA</button>\n<button class=\"preset\" data-lat=\"33.4484\" data-lon=\"-112.0740\">Phoenix, AZ</button>\n</div>\n<div class=\"source-note\" id=\"sourceNote\">Enter jobsite coordinates or pick a preset market.</div>\n<div class=\"summary-row\" id=\"summaryRow\"></div>\n<div class=\"pgrid\" id=\"pgrid\"></div>\n<div class=\"card cta\">\n<h3 style=\"margin-bottom:6px\">WeatherX Pro</h3>\n<p style=\"color:var(--muted);margin:0 0 18px\">$149/mo standalone, or included in select SubConP tiers - contact to activate.</p>\n<a class=\"button primary\" href=\"mailto:hello@weylandai.com?subject=WeatherX%20activation\">CONTACT TO ACTIVATE</a>\n</div>\n</div>\n<script>\nasync function runCheck(){\n  const lat = document.getElementById('wx-lat').value.trim();\n  const lon = document.getElementById('wx-lon').value.trim();\n  if(!lat||!lon)return;\n  document.getElementById('sourceNote').textContent = 'Fetching live NWS forecast...';\n  document.getElementById('summaryRow').innerHTML='';\n  document.getElementById('pgrid').innerHTML='';\n  try {\n    const res = await fetch('/api/weatherx/delay-risk?lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon));\n    const d = await res.json();\n    if(!res.ok){document.getElementById('sourceNote').innerHTML='<span class=\"err\">'+(d.detail&&d.detail.message||'Failed')+'</span>';return}\n    document.getElementById('sourceNote').textContent='SOURCE: '+d.source+' - NWS office '+d.office+' - fetched '+new Date(d.fetched_at).toLocaleString();\n    document.getElementById('summaryRow').innerHTML =\n      '<div class=\"sumcard\"><label>High-Risk Periods</label><div class=\"v\" style=\"color:var(--red)\">'+d.summary.high_risk_periods+'</div></div>'+\n      '<div class=\"sumcard\"><label>Moderate-Risk Periods</label><div class=\"v\" style=\"color:var(--gold)\">'+d.summary.moderate_risk_periods+'</div></div>'+\n      '<div class=\"sumcard\"><label>Total Forecast Periods</label><div class=\"v\">'+d.summary.total_periods+'</div></div>';\n    document.getElementById('pgrid').innerHTML = d.periods.map(p=>\n      '<div class=\"pcard '+p.delay_risk+'\"><h4>'+p.name+'</h4><span class=\"risk-tag '+p.delay_risk+'\">'+p.delay_risk.toUpperCase()+' RISK</span>'+\n      '<p>'+p.short_forecast+'<br>'+p.temperature+p.temperature_unit+' &middot; '+(p.precipitation_probability_pct!==null?p.precipitation_probability_pct+'% precip':'')+' &middot; wind '+p.wind_speed+'</p></div>'\n    ).join('');\n  } catch(e) {\n    document.getElementById('sourceNote').innerHTML='<span class=\"err\">Failed to load live data: '+e.message+'</span>';\n  }\n}\ndocument.getElementById('wx-search-btn').addEventListener('click', runCheck);\ndocument.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>{document.getElementById('wx-lat').value=btn.dataset.lat;document.getElementById('wx-lon').value=btn.dataset.lon;runCheck()}));\n</script>\n</body>\n</html>\n", { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
  }
  function serve_cutsheetx() {
    // CutsheetX no longer has its own page - it's a standalone card in the
    // consolidated /pricing a-la-carte grid (see the pricing page's
    // ACTIVATE STANDALONE SEAT button for weyland-cutsheetx-seat). This
    // route existed as a map entry with no function behind it, which would
    // have thrown ReferenceError on first real hit - fixed by pointing it
    // at the page that actually has it, same pattern as everything else
    // that moved into the pricing grid.
    return Response.redirect("https://weylandai.com/pricing", 302);
  }
  var map = {
    "onboarding": serve_onboarding,
    "huntx": serve_huntx,
    "marketx": serve_marketx,
    "pricex": serve_pricex,
    "compx": serve_compx,
    "weatherx": serve_weatherx,
    "forecastx": serve_forecastx,
    "geox": serve_geox,
    "takeoffx": serve_takeoffx,
    "subx": serve_subx,
    "cutsheetx": serve_cutsheetx,
    "propx": serve_propx,
    "": serve_whyweyland,
    "whyweyland": serve_whyweyland,
    "venturedeck": serve_venturedeck,
    "investors": serve_investors,
    "lienx": serve_lienx,
    "bidx": serve_bidx,
    "coa": serve_coa,
    "rfax": serve_rfax,
    "changeordx": serve_changeordx,
    "permitx": serve_permitx,
    "closex": serve_closex,
    "notesx": serve_notesx,
    "inspecx": serve_inspecx,
    "safetyx": serve_safetyx,
    "survx": serve_survx,
    "specx": serve_specx,
    "drawx": serve_drawx,
    "asbuiltx": serve_asbuiltx,
    "leadx": serve_leadx,
    "careers": serve_careers,
    "progress": serve_progress,
    "sightx": serve_sightx,
    "meetingx": serve_meetingx,
    "sightx/runtime-manifest.json": serve_sightx_runtime_manifest_json,
    "sightx/runtime-manifest.schema.json": serve_sightx_runtime_manifest_schema_json,
    "sightx/projects/glendale-camino-real/catalog.json": serve_sightx_projects_glendale_camino_real_catalog_json,
    "qtext": serve_qtext,
    "subscribe": serve_subscribe,
    "financials": serve_financials,
    "pricing": serve_pricing
  };




  return {
    dispatch: function(pathname) {
      var clean = pathname.toLowerCase().replace(/^\/|\/$/g, "");
      if (clean === "deck") clean = "venturedeck";
      if (clean === "index.html" || clean === "index") clean = "";
      if (map[clean]) return map[clean]();
      return null;
    }
  };
})();
