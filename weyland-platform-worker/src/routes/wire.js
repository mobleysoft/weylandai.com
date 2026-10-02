// weyland-platform-worker/src/routes/wire.js
//
// WeylandAI Wire - real route, real content, real $49/mo recurring
// checkout. GET /wire serves the page; GET /api/wire/news, GET
// /api/wire/synthesis, GET /api/wire/reports serve its real data.
// Checkout creation deliberately reuses the EXISTING, already-live,
// already-tested POST /api/billing/checkout/create (routes/billing.js) -
// this file doesn't duplicate checkout-session creation, it just adds
// "weyland-wire-seat" to the shared catalog (see lib/stripe-billing.js)
// so the same real env.VENDYAI-backed path handles it.
//
// Entitlement check (GET /api/wire/verify) deliberately does NOT depend
// on the webhook/KV-cache path routes/billing.js's checkout/status uses -
// that path only populates once routes/webhooks-subscription.js is cut
// over to THIS Worker, which it deliberately isn't yet (see this
// Worker's wrangler.toml, "STAGE 3b ... deliberately not added"). Instead
// this mirrors mobley-venture-fleet-a's own real, already-live
// verifyPurchase() pattern: ask vendyai directly whether a given
// (unguessable, Stripe-generated) session id is a completed session for
// this venture_id. Same mechanism mobleyreport.com's own $4 pass already
// uses in production - not a new trust model.

import { jsonResponse3 } from "../lib/json-response.js";
import {
  WIRE_FEEDS,
  fetchWireNews,
  synthesizeHeadlinesDeterministic,
  WEYLAND_REPORTS,
  WEYLAND_WIRE_PRODUCT_ID,
  WIRE_WORDMARK_SVG,
} from "../lib/wire-tenant.js";

async function verifyWireSession(env2, sessionId) {
  if (!sessionId || !env2.VENDYAI) return false;
  try {
    const res = await env2.VENDYAI.fetch(`https://vendyai-com-worker.internal/api/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "completed" && data.venture_id === "weylandai";
  } catch {
    return false;
  }
}

export function registerWireRoutes(router) {
  router.get("/api/wire/news", async (request2, env2) => {
    const sessionId = new URL(request2.url).searchParams.get("session_id");
    const isPro = sessionId ? await verifyWireSession(env2, sessionId) : false;
    const items = await fetchWireNews(isPro);
    return jsonResponse3({ sources: WIRE_FEEDS.map((f) => f.source), pro: isPro, items });
  });

  router.get("/api/wire/synthesis", async (_request2, env2) => {
    const items = await fetchWireNews(false);
    if (!items.length) {
      return jsonResponse3({ detail: { message: "no live headlines available right now - try again shortly" } }, 502);
    }
    const startedAt = Date.now();
    const parsed = synthesizeHeadlinesDeterministic(items);
    const latencyMs = Date.now() - startedAt;
    const sources = items.map((it, i) => ({ n: i + 1, source: it.source, title: it.title, link: it.link }));
    return jsonResponse3({ parsed, sources, latency_ms: latencyMs });
  });

  router.get("/api/wire/reports", async () => jsonResponse3({ items: WEYLAND_REPORTS }));

  router.get("/api/wire/verify", async (request2, env2) => {
    const sessionId = new URL(request2.url).searchParams.get("session_id");
    const active = await verifyWireSession(env2, sessionId);
    return jsonResponse3({ active });
  });

  router.get("/wire", () => new Response(WIRE_PAGE, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Weyland-Wire": "weyland-platform-worker",
      "X-Content-Type-Options": "nosniff",
    },
  }));
}

const WIRE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeylandAI Wire</title>
<meta name="description" content="Live construction-industry headlines from Engineering News-Record and Construction Dive, a deterministic Editor's Briefing that cites its own sources, and WeylandAI's own real, audited price-extraction engineering reports.">
<style>
  :root {
    --bg: #0a0e16;
    --surface: #111726;
    --ink: #f3f6fa;
    --ink-muted: #9aa5b8;
    --rule: #263148;
    --blue: #2a52ff;
    --yellow: #ffd400;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f5f7fa;
      --surface: #ffffff;
      --ink: #0a0e16;
      --ink-muted: #51586b;
      --rule: #dde3ee;
      --blue: #2a52ff;
      --yellow: #b88a00;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  a { color: var(--yellow); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px 60px; }

  header.masthead { padding: 28px 0 0; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  header.masthead .dek { font-size: 13px; color: var(--ink-muted); margin: 10px 0 0; width: 100%; }
  .rule-thick { border: none; border-top: 3px solid var(--blue); margin: 18px 0 0; }
  .dateline {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 12px; color: var(--ink-muted); padding: 8px 0 18px; letter-spacing: .02em;
    border-bottom: 1px solid var(--rule);
  }

  .lead-grid { display: grid; grid-template-columns: 1fr; gap: 20px; padding: 20px 0 8px; }
  @media (min-width: 760px) { .lead-grid { grid-template-columns: 2fr 1fr; } }

  .lead-story, .brief-box, .headline-item, .paper-item { background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 14px 16px; }
  .source-tag {
    font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--blue); font-weight: 800;
  }
  @media (prefers-color-scheme: dark) { .source-tag { color: #7d96ff; } }
  .lead-story h2 { font-size: clamp(20px, 3vw, 28px); line-height: 1.2; margin: 8px 0 8px; }
  .lead-story h2 a { text-decoration: none; color: var(--ink); }
  .lead-story h2 a:hover { text-decoration: underline; }
  .lead-story .byline { font-size: 12px; color: var(--ink-muted); }

  aside.briefing h3 {
    font-size: 11px; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 8px; color: var(--yellow);
  }
  aside.briefing p { font-size: 14px; margin: 0 0 10px; color: var(--ink); }
  aside.briefing button {
    font-size: 12px; font-weight: 700; padding: 8px 14px; border: 1px solid var(--blue); border-radius: 5px;
    background: var(--blue); color: #fff; cursor: pointer; letter-spacing: .02em;
  }
  aside.briefing button:hover { opacity: .88; }
  aside.briefing ol { font-size: 11.5px; color: var(--ink-muted); padding-left: 18px; margin: 10px 0 0; }
  aside.briefing .caveat { font-size: 11.5px; color: var(--ink-muted); font-style: italic; }

  section.wire { padding-top: 22px; }
  section.wire h2.section-head, section.papers h2.section-head {
    font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--yellow);
    border-bottom: 2px solid var(--rule); padding-bottom: 6px; margin: 0 0 14px;
  }
  .headline-list { columns: 1; column-gap: 16px; }
  @media (min-width: 700px) { .headline-list { columns: 2; } }
  @media (min-width: 1000px) { .headline-list { columns: 3; } }
  .headline-item { break-inside: avoid; margin-bottom: 14px; }
  .headline-item h3 { font-size: 15px; line-height: 1.3; margin: 6px 0 0; font-weight: 700; }
  .headline-item h3 a { text-decoration: none; color: var(--ink); }
  .headline-item h3 a:hover { text-decoration: underline; }

  section.papers { padding-top: 30px; }
  .paper-item { display: grid; grid-template-columns: auto auto 1fr; gap: 10px; align-items: baseline; margin-bottom: 10px; }
  .paper-item .num { font-size: 11px; color: var(--ink-muted); }
  .status-pill {
    font-size: 10px; letter-spacing: .06em; text-transform: uppercase; padding: 2px 7px; border-radius: 3px; font-weight: 800;
    white-space: nowrap;
  }
  .status-VALIDATED { background: #1c5e2a; color: #fff; }
  .status-FALSIFIED { background: #8a1f11; color: #fff; }
  .status-PARTIAL { background: var(--yellow); color: #15130a; }
  .paper-item .title { font-weight: 700; }
  .paper-item .excerpt { grid-column: 1 / -1; font-size: 13px; color: var(--ink-muted); margin-top: 2px; }

  .upgrade-box {
    margin-top: 26px; padding: 16px 18px; border: 1px solid var(--blue); border-radius: 8px; background: var(--surface);
    font-size: 13px; color: var(--ink-muted);
    display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
  }
  .upgrade-box strong { color: var(--ink); }
  .upgrade-box button {
    font-size: 12px; font-weight: 800; padding: 9px 16px; border-radius: 5px;
    border: none; background: var(--yellow); color: #15130a; cursor: pointer; letter-spacing: .02em;
  }

  footer.masthead-foot {
    margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--rule);
    font-size: 11.5px; color: var(--ink-muted); line-height: 1.6;
  }
  .loading { font-size: 13px; color: var(--ink-muted); }
</style>
</head>
<body>
<div class="wrap">
  <header class="masthead">
    ${WIRE_WORDMARK_SVG}
    <div style="flex:1 1 auto">
      <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted)">Construction industry wire &amp; engineering-report desk</div>
      <div class="dek">Live headlines from Engineering News-Record &amp; Construction Dive, a deterministic Editor's Briefing that cites its own sources, and WeylandAI's own real, audited price-extraction validation history.</div>
    </div>
  </header>
  <hr class="rule-thick">
  <div class="dateline">
    <span id="dateline-date"></span>
    <span>weylandai.com/wire</span>
  </div>

  <div class="lead-grid">
    <div id="lead-story-slot"><p class="loading">Loading the wire&hellip;</p></div>
    <aside class="briefing brief-box">
      <h3>Editor's Briefing</h3>
      <p>A deterministic algorithm &mdash; no AI model, no network call &mdash; matches shared keywords and named entities across the headlines at left. Every sentence cites the headline number(s) it draws from; the source list is always shown underneath so you can check each citation yourself.</p>
      <button id="synthesis-btn" type="button">Generate briefing</button>
      <div id="synthesis-result"></div>
    </aside>
  </div>

  <section class="wire" aria-label="Full wire">
    <h2 class="section-head">The Wire &mdash; ENR &amp; Construction Dive, live</h2>
    <div id="wire-list" class="headline-list"><p class="loading">Loading&hellip;</p></div>
    <p id="news-pro-status" class="loading"></p>
  </section>

  <div class="upgrade-box" id="upgrade-box" style="display:none">
    <span><strong>WeylandAI Wire Pro</strong> &mdash; $49.00/month, real recurring Stripe subscription: 20 headlines per feed instead of 6, full reports wire.</span>
    <button id="upgrade-btn" type="button">Subscribe &mdash; $49/mo</button>
  </div>

  <section class="papers" aria-label="WeylandAI engineering reports wire">
    <h2 class="section-head">WeylandAI Reports &mdash; Price-Extraction Engineering Validation</h2>
    <p class="loading" style="margin-bottom:10px">WeylandAI's own real validation history for its cut-sheet/price-book extraction pipeline, shared as-is &mdash; including failures, not just successes. Status is derived from each report's own source file.</p>
    <div id="papers-list"><p class="loading">Loading&hellip;</p></div>
  </section>

  <footer class="masthead-foot">
    <p>Headlines and links are excerpted from Engineering News-Record and Construction Dive's public RSS feeds; full articles are hosted at their original source, not reproduced here. The Editor's Briefing is a deterministic keyword/entity-overlap clustering of the headline titles above &mdash; no AI model and no network call are involved in generating it. Read the cited headlines yourself before treating it as fact. Not fact-checked journalism. WeylandAI Reports are this venture's own internal engineering-validation notes, not third-party audited financial or safety certifications.</p>
  </footer>
</div>

<script>
(function () {
  var d = new Date();
  document.getElementById('dateline-date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  function esc(s) { return String(s).replace(/[<>]/g, function (c) { return c === '<' ? '&lt;' : '&gt;'; }); }

  var storageKey = 'vendyai_session_weylandai_wire';
  var sidParam = new URLSearchParams(window.location.search).get('session_id');
  if (sidParam) { localStorage.setItem(storageKey, sidParam); }
  var sid = localStorage.getItem(storageKey) || '';

  fetch('/api/wire/news' + (sid ? '?session_id=' + encodeURIComponent(sid) : ''))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var items = data.items || [];
      var leadSlot = document.getElementById('lead-story-slot');
      var listEl = document.getElementById('wire-list');
      if (!items.length) {
        leadSlot.innerHTML = '<p class="loading">No items.</p>';
        listEl.innerHTML = '';
        return;
      }
      var lead = items[0];
      leadSlot.innerHTML =
        '<article class="lead-story">' +
        '<div class="source-tag">' + esc(lead.source) + '</div>' +
        '<h2><a href="' + esc(lead.link) + '" target="_blank" rel="noopener">' + esc(lead.title) + '</a></h2>' +
        '<div class="byline">' + esc(lead.pubDate) + '</div>' +
        '</article>';
      listEl.innerHTML = items.slice(1).map(function (it) {
        return '<div class="headline-item">' +
          '<div class="source-tag">' + esc(it.source) + '</div>' +
          '<h3><a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + '</a></h3>' +
          '</div>';
      }).join('');
      document.getElementById('news-pro-status').textContent = data.pro ? 'Pro active - 20 headlines/feed.' : '';
      if (!data.pro) { document.getElementById('upgrade-box').style.display = 'flex'; }
    })
    .catch(function (err) {
      document.getElementById('lead-story-slot').innerHTML = '<p class="loading">' + esc(err.message) + '</p>';
    });

  document.getElementById('upgrade-btn')?.addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Loading...';
    fetch('/api/billing/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: 'weyland-wire-seat', quantity: 1 })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.checkout_url) { window.location.href = data.checkout_url; }
        else { btn.textContent = (data.detail && data.detail.message) || 'Unavailable - try again later'; btn.disabled = false; }
      })
      .catch(function (err) { btn.textContent = 'Error: ' + err.message; btn.disabled = false; });
  });

  document.getElementById('synthesis-btn').addEventListener('click', function () {
    var btn = this;
    var out = document.getElementById('synthesis-result');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    out.innerHTML = '';
    fetch('/api/wire/synthesis')
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) {
          out.innerHTML = '<p class="caveat">' + esc((res.data.detail && res.data.detail.message) || 'Something went wrong.') + '</p>';
          return;
        }
        var data = res.data;
        var sourcesHtml = data.sources.map(function (s) {
          return '<li>[' + s.n + '] ' + esc(s.source) + ': ' + esc(s.title) + '</li>';
        }).join('');
        out.innerHTML = '<p>' + esc(data.parsed.synthesis) + '</p>' +
          '<p class="caveat">' + esc(data.parsed.caveat) + '</p>' +
          '<ol>' + sourcesHtml + '</ol>';
      })
      .catch(function (err) { out.innerHTML = '<p class="caveat">' + esc(err.message) + '</p>'; })
      .finally(function () { btn.disabled = false; btn.textContent = 'Generate briefing'; });
  });

  fetch('/api/wire/reports')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var items = data.items || [];
      var el = document.getElementById('papers-list');
      el.innerHTML = items.map(function (it) {
        return '<div class="paper-item">' +
          '<span class="num">No. ' + esc(it.num) + '</span>' +
          '<span class="status-pill status-' + esc(it.status) + '">' + esc(it.status) + '</span>' +
          '<span class="title">' + esc(it.title) + '</span>' +
          '<span class="excerpt">' + esc(it.excerpt) + '</span>' +
          '</div>';
      }).join('') || '<p class="loading">No items.</p>';
    })
    .catch(function (err) {
      document.getElementById('papers-list').innerHTML = '<p class="loading">' + esc(err.message) + '</p>';
    });
})();
</script>
</body>
</html>`;
