// ==========================================
// SOVEREIGN WEYLANDAI ROUTING LAYER (RULE 12)
// ==========================================
const sovereignStyles = `
  :root { --bg-dark: #0a0b0e; --glass-bg: rgba(18, 20, 26, 0.75); --glass-border: rgba(255, 255, 255, 0.1); --text-main: #f3f4f6; --text-muted: #9ca3af; --accent-cyan: #00f2ff; --accent-emerald: #10b981; --accent-purple: #8b5cf6; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
  body { background: radial-gradient(circle at 15% 15%, #151a24 0%, var(--bg-dark) 65%); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
  header { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--glass-border); padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
  .brand { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em; display: flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; }
  .nav-links { display: flex; gap: 24px; align-items: center; }
  .nav-links a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: all 0.2s ease; padding: 6px 12px; border-radius: 8px; }
  .nav-links a:hover, .nav-links a.active { color: #fff; background: rgba(255, 255, 255, 0.05); text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
  .status-badge { font-size: 0.75rem; padding: 4px 10px; border-radius: 9999px; background: rgba(0, 242, 255, 0.1); color: var(--accent-cyan); border: 1px solid rgba(0, 242, 255, 0.35); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 0 12px rgba(0, 242, 255, 0.2); display: inline-block; }
  .container { max-width: 1200px; margin: 0 auto; padding: 60px 24px; flex: 1; width: 100%; }
  .hero { text-align: center; margin-bottom: 60px; }
  .hero h1 { font-size: 3.2rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 16px; background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero p { font-size: 1.25rem; color: var(--text-muted); max-width: 760px; margin: 0 auto; line-height: 1.6; }
  .card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 32px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); transition: transform 0.2s ease, border-color 0.2s ease; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
  .card:hover { transform: translateY(-3px); border-color: rgba(0, 242, 255, 0.4); box-shadow: 0 14px 40px rgba(0, 242, 255, 0.15); }
  .btn-primary { background: linear-gradient(135deg, var(--accent-cyan) 0%, #0088ff 100%); color: #000; font-weight: 700; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; transition: all 0.2s ease; box-shadow: 0 0 20px rgba(0, 242, 255, 0.4); border: none; cursor: pointer; font-size: 1rem; text-align: center; }
  .btn-primary:hover { transform: scale(1.03); box-shadow: 0 0 28px rgba(0, 242, 255, 0.7); }
  .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #fff; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block; transition: all 0.2s ease; border: 1px solid rgba(255, 255, 255, 0.15); cursor: pointer; font-size: 0.95rem; text-align: center; width: 100%; }
  .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); border-color: #fff; }
`;

function renderSovereignHeader(activeRoute) {
  return `
  <header>
    <a href="/" class="brand">
      <span>WEYLAND<span style="color: var(--accent-cyan);">AI</span></span>
      <span class="status-badge">SubConP v2.4 Live</span>
    </a>
    <nav class="nav-links">
      <a href="/whyweyland" class="${activeRoute === '/whyweyland' ? 'active' : ''}">Why Weyland</a>
      <a href="/venturedeck" class="${activeRoute === '/venturedeck' ? 'active' : ''}">Venture Deck</a>
      <a href="/onboarding" class="${activeRoute === '/onboarding' ? 'active' : ''}">Onboarding & Licensing</a>
      <a href="/careers" class="${activeRoute === '/careers' ? 'active' : ''}">Careers (41 Openings)</a>
    </nav>
  </header>`;
}

function serveVentureDeck(request2) {
  const slideId = "1KFTIijXPKocGGiTWUQN8OZstdrXoKIe2";
  const embedUrl = `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=5000&rm=minimal`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>WeylandAI — Series Seed Venture Deck & Data Room</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${sovereignStyles} body { height: 100vh; overflow: hidden; } .deck-container { flex: 1; width: 100%; position: relative; background: #000; } iframe { width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0; } .metrics-bar { background: #000; padding: 8px 36px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); } .metric-val { color: var(--accent-emerald); font-weight: 700; }</style></head><body>
  ${renderSovereignHeader('/venturedeck')}
  <div class="metrics-bar">
    <div>Recognized Intercompany B2B ARR: <span class="metric-val">$1,902,000.00 USD</span> ($158.5k/mo MRR)</div>
    <div>Active Conglomerate Subsidiaries: <span class="metric-val">121 Commercial Entities</span></div>
    <div>Model Resolution: <span style="color: var(--accent-cyan);">Mobley-Coder-7B-v0 Local Bare-Metal</span></div>
  </div>
  <div class="deck-container">
    <iframe src="${embedUrl}" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
}

function serveOnboarding(request2) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>WeylandAI — Universal SubConP & A La Carte Licensing</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${sovereignStyles}
    .pricing-box { max-width: 680px; margin: 0 auto; text-align: center; border: 2px solid var(--accent-cyan); box-shadow: 0 0 35px rgba(0, 242, 255, 0.25); }
    .price-tag { font-size: 4.2rem; font-weight: 900; color: #fff; margin: 18px 0; }
    .price-tag span { font-size: 1.2rem; color: var(--text-muted); font-weight: 500; }
    .slider-container { margin: 28px 0; padding: 24px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid var(--glass-border); }
    input[type=range] { width: 100%; accent-color: var(--accent-cyan); cursor: pointer; height: 6px; border-radius: 3px; background: #374151; }
    .feature-list { text-align: left; margin: 32px 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
    .feature-list li { display: flex; align-items: center; gap: 12px; font-size: 1.05rem; color: #e5e7eb; }
    .check-icon { color: var(--accent-emerald); font-weight: 900; font-size: 1.3rem; }
    .alacarte-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 36px; }
    .alacarte-card { display: flex; flex-direction: column; justify-content: space-between; }
    .sku-price { font-size: 2rem; font-weight: 800; color: var(--accent-emerald); margin: 12px 0 6px 0; }
    .sku-old { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; }
  </style></head><body>
  ${renderSovereignHeader('/onboarding')}
  <div class="container">
    <div class="hero">
      <h1>Deploy SubConP on Your Fleet</h1>
      <p>Instantaneous commercial construction automation. Eliminate takeoff friction, automate supplier proposal assembly, and render photorealistic 3D structural schedules.</p>
    </div>
    
    <!-- THE SUBCONP BUNDLE ATTRACTOR -->
    <div class="card pricing-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="status-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border-color: var(--accent-emerald);">Recommended Bundle</span>
        <span class="status-badge">Save $1,795/mo (47% OFF A La Carte)</span>
      </div>
      <div class="price-tag">$<span id="monthlyTotal" style="font-size: 4.2rem; color: #fff; font-weight: 900;">2,000</span><span> / month</span></div>
      <div class="slider-container">
        <label style="font-weight: 700; font-size: 1.1rem; display: block; margin-bottom: 12px; color: #fff;">Active Operator Seats: <span id="seatCount" style="color: var(--accent-cyan);">1 Seat ($2,000/mo)</span></label>
        <input type="range" id="seats" min="1" max="50" value="1" oninput="updateCalculation(this.value)">
      </div>
      <ul class="feature-list">
        <li><span class="check-icon">✓</span> <strong>HuntX</strong> — Autonomous municipal RFP & lead prospect finding engine ($799/mo value)</li>
        <li><span class="check-icon">✓</span> <strong>SubX + TakeoffX = PropX</strong> — Integrated machine-vision estimation & proposals ($1,398/mo value)</li>
        <li><span class="check-icon">✓</span> <strong>SightX</strong> — Real-time interactive 3D structural & mechanical visualizer ($999/mo value)</li>
        <li><span class="check-icon">✓</span> <strong>MeetX</strong> — Intra-site collaborative spatial rendering meeting-ware ($599/mo value)</li>
        <li><span class="check-icon">✓</span> Bare-metal local inference interlocks & Cloudflare edge distribution</li>
      </ul>
      <a href="#" onclick="triggerCheckout('weyland-subconp-seat', document.getElementById('seats').value, 'SubConP Suite'); return false;" class="btn-primary" style="width: 100%; font-size: 1.2rem; margin-top: 16px;">Initialize Sovereign Checkout ($<span id="ctaTotal">2,000</span>/mo)</a>
    </div>

    <!-- A LA CARTE STANDALONE MATRIX -->
    <h2 style="font-size: 2.2rem; color: #fff; text-align: center; margin: 80px 0 16px 0;">A La Carte Component Licensing</h2>
    <p style="text-align: center; color: var(--text-muted); max-width: 650px; margin: 0 auto; font-size: 1.05rem;">Need a standalone component? Select individual operator seats below. (Note: Total sum of parts equals $3,795/mo. We strongly advise deploying the all-inclusive SubConP bundle above).</p>
    
    <div class="alacarte-grid">
      <div class="card alacarte-card">
        <div>
          <span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3);">Takeoff Engine</span>
          <h3 style="font-size: 1.4rem; color: #fff; margin-top: 12px;">TakeoffX Active Seat</h3>
          <div class="sku-price">$499 <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/ month</span></div>
          <div class="sku-old">vs. Togal.AI ($299/mo for basic counting only)</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">Sub-second vector blueprint takeoff and AI quantity quantification with automated downstream ledger bindings.</p>
        </div>
        <button onclick="triggerCheckout('weyland-takeoffx-seat', 1, 'TakeoffX')" class="btn-secondary">Initialize Standalone Checkout</button>
      </div>

      <div class="card alacarte-card">
        <div>
          <span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3);">Proposal & Submittals</span>
          <h3 style="font-size: 1.4rem; color: #fff; margin-top: 12px;">SubX + PropX + CutsheetX</h3>
          <div class="sku-price">$899 <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/ month</span></div>
          <div class="sku-old">Replaces half a human estimating coordinator ($4k/mo)</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">Instantaneous commercial proposal generator, live distributor material cost integration, and technical cut-sheet packaging.</p>
        </div>
        <button onclick="triggerCheckout('weyland-subx-propx-seat', 1, 'SubX + PropX')" class="btn-secondary">Initialize Standalone Checkout</button>
      </div>

      <div class="card alacarte-card">
        <div>
          <span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3);">Lead Acquisition</span>
          <h3 style="font-size: 1.4rem; color: #fff; margin-top: 12px;">HuntX Active Seat</h3>
          <div class="sku-price">$799 <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/ month</span></div>
          <div class="sku-old">vs. Dodge Data / ConstructConnect ($6k-$12k/yr)</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">Autonomous municipal permit ledger crawler and commercial general contractor RFP pipeline reconnaissance spider.</p>
        </div>
        <button onclick="triggerCheckout('weyland-huntx-seat', 1, 'HuntX')" class="btn-secondary">Initialize Standalone Checkout</button>
      </div>

      <div class="card alacarte-card">
        <div>
          <span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3);">3D Simulation</span>
          <h3 style="font-size: 1.4rem; color: #fff; margin-top: 12px;">SightX Active Seat</h3>
          <div class="sku-price">$999 <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/ month</span></div>
          <div class="sku-old">vs. Lumion Pro / BIM 360 Enterprise Licenses</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">Transforms standard 2D flat floor plans and MEP schedules into real-time, interactive 3D structural visual simulations.</p>
        </div>
        <button onclick="triggerCheckout('weyland-sightx-seat', 1, 'SightX')" class="btn-secondary">Initialize Standalone Checkout</button>
      </div>

      <div class="card alacarte-card">
        <div>
          <span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3);">Spatial Collaboration</span>
          <h3 style="font-size: 1.4rem; color: #fff; margin-top: 12px;">MeetX Active Seat</h3>
          <div class="sku-price">$599 <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/ month</span></div>
          <div class="sku-old">Replaces static screen sharing over generic video apps</div>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">Spatial 3D meeting environment allowing general contractors and subcontractors to collaboratively inspect renders in real time.</p>
        </div>
        <button onclick="triggerCheckout('weyland-meetx-seat', 1, 'MeetX')" class="btn-secondary">Initialize Standalone Checkout</button>
      </div>
    </div>
  </div>

  <script>
    function updateCalculation(val) {
      const total = val * 2000;
      document.getElementById('seatCount').textContent = val + (val == 1 ? ' Seat ($2,000/mo)' : ' Seats ($' + (val*2) + ',000/mo)');
      document.getElementById('monthlyTotal').textContent = total.toLocaleString('en-US');
      document.getElementById('ctaTotal').textContent = total.toLocaleString('en-US');
    }
    function triggerCheckout(sku, quantity, name) {
      const sessionUrl = '/api/checkout?sku=' + encodeURIComponent(sku) + '&qty=' + quantity;
      alert('Invoking VendyAI Control Plane for ' + name + ' (SKU: ' + sku + ', Qty: ' + quantity + ')... Routing to cryptographic and Stripe payment gate.');
      window.location.href = sessionUrl;
    }
  </script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
}

function serveCareers(request2) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>WeylandAI Careers — Fecundity Talent Vector (41 Openings)</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${sovereignStyles}
    .jobs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; margin-top: 40px; }
    .dept-title { font-size: 1.6rem; font-weight: 800; color: #fff; margin: 48px 0 20px 0; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    .job-title { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 10px; display: flex; justify-content: space-between; }
    .job-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; }
    .job-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .tag { background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; color: #d1d5db; border: 1px solid rgba(255,255,255,0.08); }
  </style></head><body>
  ${renderSovereignHeader('/careers')}
  <div class="container">
    <div class="hero">
      <h1>The Fecundity Talent Engine</h1>
      <p>We are expanding our institutional baseline to support 121 commercial corporations. We are executing an aggressive hiring protocol for 41 verified positions across engineering, machine vision, and construction automation.</p>
    </div>
    
    <div class="dept-title"><span>Machine Vision & Structural Inference (TakeoffX / SightX)</span><span style="font-size: 1rem; color: var(--accent-cyan);">15 Openings</span></div>
    <div class="jobs-grid">
      <div class="card">
        <div class="job-title"><span>Principal Photonic Engineer</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$240k - $320k + Equity</span></div>
        <p class="job-desc">Architect sub-millimeter computer vision models for architectural blueprint parsing and real-time quantity takeoff extraction.</p>
        <div class="job-tags"><span class="tag">Bare-Metal C++</span><span class="tag">MLX / CUDA</span><span class="tag">Computer Vision</span></div>
        <a href="#apply" onclick="alert('Application routing initialized for Principal Photonic Engineer.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
      <div class="card">
        <div class="job-title"><span>3D Spatial Render Lead (SightX)</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$220k - $290k + Equity</span></div>
        <p class="job-desc">Develop low-latency spatial mechanics turning 2D MEP and door schedules into interactive 3D simulation environments.</p>
        <div class="job-tags"><span class="tag">WebGL / WebGPU</span><span class="tag">BIM / CAD Mechanics</span><span class="tag">Rust</span></div>
        <a href="#apply" onclick="alert('Application routing initialized for 3D Spatial Render Lead.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
      <div class="card">
        <div class="job-title"><span>Autonomous CAD Ingestion Architect</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$190k - $260k + Equity</span></div>
        <p class="job-desc">Build high-throughput PDF and vector drawing extraction pipelines optimized for Apple Silicon unified memory.</p>
        <div class="job-tags"><span class="tag">Python</span><span class="tag">PDF Mechanics</span><span class="tag">Geometry Processing</span></div>
        <a href="#apply" onclick="alert('Application routing initialized for CAD Ingestion Architect.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
    </div>
    
    <div class="dept-title"><span>Commercial Revenue Synthesis & Estimation (SubX / PropX / HuntX)</span><span style="font-size: 1rem; color: var(--accent-purple);">16 Openings</span></div>
    <div class="jobs-grid">
      <div class="card">
        <div class="job-title"><span>Head of Estimating Automation</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$200k - $280k + Equity</span></div>
        <p class="job-desc">Fuse raw architectural material takeoffs with real-time distributor pricing feeds to guarantee auditable proposal accuracy.</p>
        <div class="job-tags"><span class="tag">Commercial Construction</span><span class="tag">Algorithmic Pricing</span><span class="tag">ERP Integrations</span></div>
        <a href="#apply" onclick="alert('Application routing initialized.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
      <div class="card">
        <div class="job-title"><span>Municipal Ledger Reconnaissance Engineer (HuntX)</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$180k - $250k + Equity</span></div>
        <p class="job-desc">Deploy automated web scraping and permit parsing spiders across North American municipal bid portals.</p>
        <div class="job-tags"><span class="tag">Distributed Crawling</span><span class="tag">LLM Extraction</span><span class="tag">Data Pipeline</span></div>
        <a href="#apply" onclick="alert('Application routing initialized.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
      <div class="card">
        <div class="job-title"><span>Enterprise Trade Account Director</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$160k - $320k OTE</span></div>
        <p class="job-desc">Drive adoption of the SubConP suite ($2k/mo seat model) across Tier-1 mechanical, electrical, and commercial carpentry subcontractors.</p>
        <div class="job-tags"><span class="tag">Enterprise SaaS</span><span class="tag">Construction Network</span><span class="tag">High Velocity</span></div>
        <a href="#apply" onclick="alert('Application routing initialized.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
    </div>
    
    <div class="dept-title"><span>Spatial Collaboration & Core Infrastructure (MeetX)</span><span style="font-size: 1rem; color: var(--accent-cyan);">10 Openings</span></div>
    <div class="jobs-grid">
      <div class="card">
        <div class="job-title"><span>Spatial Telemetry Systems Lead</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$210k - $290k + Equity</span></div>
        <p class="job-desc">Eliminate Zoom fatigue by optimizing intra-site 3D render meeting protocols across Cloudflare Edge networks.</p>
        <div class="job-tags"><span class="tag">WebRTC</span><span class="tag">Cloudflare Workers</span><span class="tag">Low Latency</span></div>
        <a href="#apply" onclick="alert('Application routing initialized.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
      <div class="card">
        <div class="job-title"><span>Sovereign bare-metal Security Engineer</span><span style="color: var(--accent-emerald); font-size: 0.95rem;">$200k - $270k + Equity</span></div>
        <p class="job-desc">Harden local Apple Silicon inference endpoints and zero-knowledge cryptographic commercial ledgers.</p>
        <div class="job-tags"><span class="tag">Cryptography</span><span class="tag">Zero Trust</span><span class="tag">macOS / Linux</span></div>
        <a href="#apply" onclick="alert('Application routing initialized.'); return false;" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Submit Artifacts</a>
      </div>
    </div>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
}

function serveWhyWeyland(request2) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Why WeylandAI vs. Togal.AI & Legacy Webware</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${sovereignStyles}
    .matrix { width: 100%; border-collapse: collapse; margin-top: 40px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; }
    .matrix th { background: rgba(255, 255, 255, 0.08); padding: 18px 24px; text-align: left; font-size: 1.05rem; color: #fff; border-bottom: 2px solid var(--glass-border); }
    .matrix td { padding: 18px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.98rem; vertical-align: top; line-height: 1.5; }
    .matrix tr:last-child td { border-bottom: none; }
    .matrix tr:hover td { background: rgba(0, 242, 255, 0.03); }
    .winner-cell { background: rgba(0, 242, 255, 0.06); border-left: 2px solid var(--accent-cyan) !important; font-weight: 500; }
    .loser-cell { color: #9ca3af; }
    .bad { color: #f87171; font-weight: 600; }
    .good { color: var(--accent-emerald); font-weight: 700; }
  </style></head><body>
  ${renderSovereignHeader('/whyweyland')}
  <div class="container">
    <div class="hero">
      <h1>The Closed-Loop Ouroboros vs. Disjointed Webware</h1>
      <p>Why modern commercial general contractors and Tier-1 trade subcontractors are abandoning specialized takeoff tools like Togal.AI in favor of WeylandAI's unified SubConP operating architecture.</p>
    </div>
    
    <div class="card" style="margin-bottom: 48px;">
      <h2 style="font-size: 1.8rem; color: #fff; margin-bottom: 16px;">The Togal.AI Vulnerability: "The Takeoff-Only Tollbooth"</h2>
      <p style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.6; margin-bottom: 20px;">
        At approximately <strong>$299 per user/month</strong>, Togal.AI provides automated quantity counting ("click-and-count"). However, it operates as a fragmented tollbooth: it possesses zero native pricing engines, zero automated proposal generators, zero lead acquisition tools, and zero 3D architectural visualizers. Estimators are forced to export static Excel spreadsheets and bridge them into disconnected management tools (Procore, Bluebeam, Excel). Every software boundary introduces manual typing errors, data latency, and redundant software subscription costs.
      </p>
      <div style="display: flex; gap: 16px;">
        <span class="status-badge" style="background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.3);">Fragmented Workflow</span>
        <span class="status-badge" style="background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.3);">Zero Proposal Generation</span>
        <span class="status-badge" style="background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.3);">No 3D Rendering</span>
      </div>
    </div>
    
    <h2 style="font-size: 2.2rem; color: #fff; text-align: center; margin-top: 40px;">Sovereign Architecture Comparison</h2>
    <table class="matrix">
      <thead>
        <tr>
          <th style="width: 25%;">Operational Domain</th>
          <th style="width: 35%;">Togal.AI & Legacy Tools (STACK/Bluebeam)</th>
          <th style="width: 40%; background: rgba(0, 242, 255, 0.1); border-left: 2px solid var(--accent-cyan);">WeylandAI SubConP Suite ($2,000/mo)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Prospecting & Bidding (HuntX)</strong></td>
          <td class="loser-cell"><span class="bad">None.</span> Requires passive reliance on emailed invites or expensive external bid lead subscriptions ($3k/yr+).</td>
          <td class="winner-cell"><strong>HuntX</strong> autonomously crawls municipal permit ledgers and commercial RFP portals, delivering high-probability target contracts directly into your estimator's workflow.</td>
        </tr>
        <tr>
          <td><strong>2. Drawing Takeoffs (TakeoffX)</strong></td>
          <td>Good automated AI area & linear quantification ($299/mo per user), but outputs stop at static counts and export spreadsheets.</td>
          <td class="winner-cell"><strong>TakeoffX</strong> executes sub-second vector & machine-vision quantification directly integrated into downstream supplier ledgers.</td>
        </tr>
        <tr>
          <td><strong>3. Proposal Synthesis (SubX = PropX)</strong></td>
          <td class="loser-cell"><span class="bad">None.</span> Requires copying quantities into Excel or purchasing secondary estimation tools (Quotr/Procore).</td>
          <td class="winner-cell"><span class="good">Instantaneous Synthesis.</span> <strong>SubX + TakeoffX = PropX</strong> automatically maps takeoff counts against live supplier material costs and labor rates to generate legally auditable, signed proposals in minutes.</td>
        </tr>
        <tr>
          <td><strong>4. 3D Architectural Renders (SightX)</strong></td>
          <td class="loser-cell"><span class="bad">2D Flat Plans Only.</span> Zero spatial visualization or structural interference checking.</td>
          <td class="winner-cell"><strong>SightX</strong> compiles 2D schedules into interactive, photorealistic 3D structural simulations, allowing estimators and fabricators to visually verify tolerances before construction starts.</td>
        </tr>
        <tr>
          <td><strong>5. Intra-Site Collaboration (MeetX)</strong></td>
          <td class="loser-cell">Basic chat comments or external screen sharing over Zoom / Microsoft Teams.</td>
          <td class="winner-cell"><strong>MeetX</strong> delivers real-time, spatial collaborative environments where GCs and subcontractors walk through live 3D renders together to agree on specification deltas instantly.</td>
        </tr>
      </tbody>
    </table>
    
    <div style="text-align: center; margin-top: 60px;">
      <a href="/onboarding" class="btn-primary" style="font-size: 1.2rem; padding: 16px 36px;">Deploy SubConP on Your Fleet Now</a>
    </div>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60" } });
}
// ==========================================
