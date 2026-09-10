// src/routes/quotes-view.js
//
// Public-facing quote rendering: the authenticated internal preview
// (/quote/:quoteId/view) and the customer-facing access-token-gated
// share link (/q/:quoteId/:accessToken) that clients open from the
// share email/SMS to review and (via quotes-generate.js's accept route)
// sign a quote. Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 152368-152703).

import { jsonResponse3 } from "../lib/json-response.js";
import { generateQuoteHtml } from "../lib/quote-html.js";

export function registerQuotesViewRoutes(router, { authenticate }) {
router.get("/quote/:quoteId/view", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  try {
    const quoteId = request2.params.quoteId;
    const tenantId = user.tenantId || user.tenant_id;
    const quote = await env2.DB.prepare(
      `SELECT * FROM takeoff_quotes WHERE id = ? AND tenant_id = ?`
    ).bind(quoteId, tenantId).first();
    if (!quote) {
      return new Response("<h1>Quote not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } });
    }
    const lineItemSnapshot = quote.line_item_snapshot ? JSON.parse(quote.line_item_snapshot) : {};
    const settingsSnapshot = quote.settings_snapshot ? JSON.parse(quote.settings_snapshot) : {};
    const vendorProfile = await env2.DB.prepare(
      `SELECT company_name, company_address, company_phone, company_email, logo_url FROM vendor_profile WHERE tenant_id = ?`
    ).bind(tenantId).first() || {};
    let logoDataUri = null;
    if (vendorProfile.logo_url) {
      try {
        const logoObj = await env2.UPLOADS.get(vendorProfile.logo_url);
        if (logoObj) {
          const logoBytes = new Uint8Array(await logoObj.arrayBuffer());
          const isPng = logoBytes[0] === 137 && logoBytes[1] === 80;
          const mimeType = isPng ? "image/png" : "image/jpeg";
          const base64 = btoa(String.fromCharCode(...logoBytes));
          logoDataUri = `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {
      }
    }
    let projectData = {};
    if (quote.project_id) {
      projectData = await env2.DB.prepare(
        `SELECT * FROM projects WHERE id = ?`
      ).bind(quote.project_id).first() || {};
    }
    let templateDna = null;
    try {
      const templateRow = await env2.DB.prepare(
        `SELECT layout_dna FROM quote_templates WHERE tenant_id = ? AND is_default = 1`
      ).bind(tenantId).first();
      if (templateRow?.layout_dna) {
        templateDna = JSON.parse(templateRow.layout_dna);
      }
    } catch (e) {
    }
    const quoteData = {
      vendor: vendorProfile,
      recipient: {
        client_name: projectData.client_name || null,
        client_address: projectData.client_address || null,
        billing_name: projectData.billing_name || null,
        billing_address: projectData.billing_address || null,
        project_name: projectData.name || null,
        dsa_number: projectData.dsa_number || null
      },
      quoteNumber: quote.quote_number,
      quoteDate: quote.created_at,
      validityDays: settingsSnapshot.validity_days || 30,
      hardwareSets: lineItemSnapshot.hardwareSets || [],
      doors: lineItemSnapshot.doors || [],
      frames: lineItemSnapshot.frames || [],
      services: lineItemSnapshot.services || [],
      totals: {
        subtotal: quote.subtotal,
        taxableAmount: quote.taxable_amount,
        taxRate: quote.tax_rate,
        taxAmount: quote.tax_amount,
        grandTotal: quote.grand_total
      },
      settings: {
        show_unit_prices: settingsSnapshot.show_unit_prices !== 0,
        show_extended_prices: settingsSnapshot.show_extended_prices !== 0,
        include_addendum: settingsSnapshot.include_addendum === 1 || settingsSnapshot.include_addendum === true,
        exclusions_text: settingsSnapshot.exclusions_text || "",
        tax_jurisdiction: settingsSnapshot.tax_jurisdiction || ""
      },
      templateDna
    };
    const html = generateQuoteHtml(quoteData, logoDataUri);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (error5) {
    console.error("[Quote View] Error:", error5);
    return new Response("<h1>Error loading quote</h1>", { status: 500, headers: { "Content-Type": "text/html" } });
  }
});
router.get("/q/:quoteId/:accessToken", async (request2, env2) => {
  try {
    const { quoteId, accessToken } = request2.params;
    const quote = await env2.DB.prepare(
      `SELECT * FROM takeoff_quotes WHERE id = ? AND access_token = ?`
    ).bind(quoteId, accessToken).first();
    if (!quote) {
      return new Response("<h1>Quote not found or link expired</h1>", {
        status: 403,
        headers: { "Content-Type": "text/html" }
      });
    }
    const settingsSnapshot = quote.settings_snapshot ? JSON.parse(quote.settings_snapshot) : {};
    const validityDays = settingsSnapshot.validity_days || 30;
    const createdAt = new Date(quote.created_at);
    const expiresAt = new Date(createdAt.getTime() + validityDays * 864e5);
    const isExpired = /* @__PURE__ */ new Date() > expiresAt;
    const isAccepted = quote.status === "accepted";
    if (isExpired && quote.status !== "expired" && !isAccepted) {
      await env2.DB.prepare(
        `UPDATE takeoff_quotes SET status = 'expired' WHERE id = ?`
      ).bind(quoteId).run();
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!quote.first_viewed_at && !isExpired && !isAccepted) {
      await env2.DB.prepare(
        `UPDATE takeoff_quotes SET first_viewed_at = ?, last_viewed_at = ?, view_count = 1, status = 'viewed' WHERE id = ?`
      ).bind(now, now, quoteId).run();
    } else if (!quote.first_viewed_at) {
      await env2.DB.prepare(
        `UPDATE takeoff_quotes SET first_viewed_at = ?, last_viewed_at = ?, view_count = 1 WHERE id = ?`
      ).bind(now, now, quoteId).run();
    } else {
      await env2.DB.prepare(
        `UPDATE takeoff_quotes SET last_viewed_at = ?, view_count = view_count + 1 WHERE id = ?`
      ).bind(now, quoteId).run();
    }
    const tenantId = quote.tenant_id;
    const lineItemSnapshot = quote.line_item_snapshot ? JSON.parse(quote.line_item_snapshot) : {};
    const vendorProfile = await env2.DB.prepare(
      `SELECT company_name, company_address, company_phone, company_email, logo_url FROM vendor_profile WHERE tenant_id = ?`
    ).bind(tenantId).first() || {};
    let logoDataUri = null;
    if (vendorProfile.logo_url) {
      try {
        const logoObj = await env2.UPLOADS.get(vendorProfile.logo_url);
        if (logoObj) {
          const logoBytes = new Uint8Array(await logoObj.arrayBuffer());
          const isPng = logoBytes[0] === 137 && logoBytes[1] === 80;
          const mimeType = isPng ? "image/png" : "image/jpeg";
          const base64 = btoa(String.fromCharCode(...logoBytes));
          logoDataUri = `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {
      }
    }
    let projectData = {};
    if (quote.project_id) {
      projectData = await env2.DB.prepare(
        `SELECT * FROM projects WHERE id = ?`
      ).bind(quote.project_id).first() || {};
    }
    let templateDna = null;
    try {
      const templateRow = await env2.DB.prepare(
        `SELECT layout_dna FROM quote_templates WHERE tenant_id = ? AND is_default = 1`
      ).bind(tenantId).first();
      if (templateRow?.layout_dna) {
        templateDna = JSON.parse(templateRow.layout_dna);
      }
    } catch (e) {
    }
    let signatureDataUri = null;
    if (isAccepted && quote.signature_r2_key) {
      try {
        const sigObj = await env2.UPLOADS.get(quote.signature_r2_key);
        if (sigObj) {
          const sigBytes = new Uint8Array(await sigObj.arrayBuffer());
          const base64 = btoa(String.fromCharCode(...sigBytes));
          signatureDataUri = `data:image/png;base64,${base64}`;
        }
      } catch (e) {
      }
    }
    const quoteData = {
      vendor: vendorProfile,
      recipient: {
        client_name: projectData.client_name || null,
        client_address: projectData.client_address || null,
        billing_name: projectData.billing_name || null,
        billing_address: projectData.billing_address || null,
        project_name: projectData.name || null,
        dsa_number: projectData.dsa_number || null
      },
      quoteNumber: quote.quote_number,
      quoteDate: quote.created_at,
      validityDays,
      hardwareSets: lineItemSnapshot.hardwareSets || [],
      doors: lineItemSnapshot.doors || [],
      frames: lineItemSnapshot.frames || [],
      services: lineItemSnapshot.services || [],
      totals: {
        subtotal: quote.subtotal,
        taxableAmount: quote.taxable_amount,
        taxRate: quote.tax_rate,
        taxAmount: quote.tax_amount,
        grandTotal: quote.grand_total
      },
      settings: {
        show_unit_prices: settingsSnapshot.show_unit_prices !== 0,
        show_extended_prices: settingsSnapshot.show_extended_prices !== 0,
        include_addendum: settingsSnapshot.include_addendum === 1 || settingsSnapshot.include_addendum === true,
        exclusions_text: settingsSnapshot.exclusions_text || "",
        tax_jurisdiction: settingsSnapshot.tax_jurisdiction || ""
      },
      templateDna
    };
    let html = generateQuoteHtml(quoteData, logoDataUri);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 864e5));
    let injectedHtml = "";
    if (isAccepted) {
      injectedHtml = `<div style="margin: 2rem auto; max-width: 700px; padding: 1.5rem; border: 2px solid #10b981; border-radius: 12px; background: #f0fdf4; text-align: center;">
  <div style="display: inline-block; background: #10b981; color: white; padding: 0.5rem 2rem; border-radius: 8px; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 1rem;">ACCEPTED</div>
  ${signatureDataUri ? `<div style="margin: 1rem 0;"><img src="${signatureDataUri}" alt="Signature" style="max-width: 300px; border-bottom: 2px solid #334155;"></div>` : ""}
  <div style="color: #334155; font-size: 1rem;">Accepted by <strong>${quote.accepted_by || "Client"}</strong></div>
  <div style="color: #64748b; font-size: 0.85rem;">${quote.accepted_at ? new Date(quote.accepted_at).toLocaleString() : ""}</div>
</div>`;
    } else if (isExpired) {
      injectedHtml = `<div style="margin: 2rem auto; max-width: 700px; padding: 1.5rem; border: 2px solid #ef4444; border-radius: 12px; background: #fef2f2; text-align: center;">
  <div style="display: inline-block; background: #ef4444; color: white; padding: 0.5rem 2rem; border-radius: 8px; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">QUOTE EXPIRED</div>
  <div style="color: #64748b; font-size: 0.9rem; margin-top: 0.75rem;">This quote is no longer valid. Please contact the vendor for an updated quote.</div>
</div>`;
    } else {
      injectedHtml = `<div style="margin: 2rem auto; max-width: 700px; text-align: center;">
  <div style="color: #64748b; font-size: 0.85rem; margin-bottom: 0.75rem;">${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining to accept</div>
  <button id="openAcceptModal" style="background: #10b981; color: white; border: none; border-radius: 8px; padding: 0.75rem 2.5rem; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Accept Quote</button>
</div>
<!-- 26P Acceptance Modal -->
<div id="acceptModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:12px; padding:2rem; max-width:480px; width:90%; max-height:90vh; overflow-y:auto; box-shadow:0 25px 50px rgba(0,0,0,0.25);">
    <h2 style="margin:0 0 1rem; color:#0f172a; font-size:1.3rem;">Accept Quote #${quoteData.quoteNumber}</h2>
    <label style="display:block; margin-bottom:0.25rem; color:#334155; font-weight:600; font-size:0.9rem;">Your Name *</label>
    <input id="acceptName" type="text" placeholder="Full name" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:1rem; margin-bottom:1rem; box-sizing:border-box;" />
    <label style="display:block; margin-bottom:0.25rem; color:#334155; font-weight:600; font-size:0.9rem;">Signature *</label>
    <canvas id="sigCanvas" width="400" height="150" style="border:1px solid #cbd5e1; border-radius:6px; cursor:crosshair; touch-action:none; width:100%; background:#fafafa;"></canvas>
    <div style="margin-top:0.5rem; margin-bottom:1rem;">
      <button id="clearSig" style="background:#64748b; color:white; border:none; border-radius:4px; padding:0.3rem 1rem; cursor:pointer; font-size:0.8rem;">Clear</button>
    </div>
    <p style="color:#64748b; font-size:0.8rem; line-height:1.4; margin-bottom:1.25rem;">By signing above, I acknowledge that I have reviewed this quote and accept it as a binding agreement for the goods and services described herein.</p>
    <div id="acceptError" style="display:none; color:#ef4444; font-size:0.85rem; margin-bottom:0.75rem;"></div>
    <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
      <button id="cancelAccept" style="background:#e2e8f0; color:#334155; border:none; border-radius:6px; padding:0.5rem 1.25rem; cursor:pointer; font-size:0.9rem;">Cancel</button>
      <button id="confirmAccept" style="background:#10b981; color:white; border:none; border-radius:6px; padding:0.5rem 1.25rem; cursor:pointer; font-weight:600; font-size:0.9rem;">Confirm Acceptance</button>
    </div>
  </div>
</div>
<script>
(function() {
  var canvas = document.getElementById('sigCanvas');
  var ctx = canvas.getContext('2d');
  var drawing = false, hasSigned = false;
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a';

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  }
  function startDraw(e) { e.preventDefault(); drawing = true; hasSigned = true; var p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function draw(e) { if (!drawing) return; e.preventDefault(); var p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function stopDraw() { drawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  document.getElementById('clearSig').addEventListener('click', function() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); hasSigned = false;
  });
  document.getElementById('openAcceptModal').addEventListener('click', function() {
    document.getElementById('acceptModal').style.display = 'flex';
  });
  document.getElementById('cancelAccept').addEventListener('click', function() {
    document.getElementById('acceptModal').style.display = 'none';
  });
  document.getElementById('confirmAccept').addEventListener('click', async function() {
    var nameVal = document.getElementById('acceptName').value.trim();
    var errEl = document.getElementById('acceptError');
    errEl.style.display = 'none';
    if (!nameVal) { errEl.textContent = 'Please enter your name.'; errEl.style.display = 'block'; return; }
    if (!hasSigned) { errEl.textContent = 'Please provide your signature.'; errEl.style.display = 'block'; return; }
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
    var sigBase64 = tempCanvas.toDataURL('image/png').split(',')[1];
    this.disabled = true; this.textContent = 'Processing...';
    try {
      var resp = await fetch(window.location.pathname + '/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameVal, signature_png_base64: sigBase64 })
      });
      if (resp.ok) {
        document.getElementById('acceptModal').style.display = 'none';
        document.getElementById('openAcceptModal').parentElement.innerHTML =
          '<div style="padding:1.5rem; border:2px solid #10b981; border-radius:12px; background:#f0fdf4; text-align:center;">' +
          '<div style="color:#10b981; font-size:1.3rem; font-weight:700;">Quote Accepted</div>' +
          '<div style="color:#64748b; margin-top:0.5rem;">Thank you. The vendor has been notified.</div></div>';
      } else {
        var data = await resp.json().catch(function() { return {}; });
        if (resp.status === 409) { errEl.textContent = 'This quote has already been accepted.'; }
        else if (resp.status === 410) { errEl.textContent = 'This quote has expired and can no longer be accepted.'; }
        else { errEl.textContent = data.error || 'An error occurred. Please try again.'; }
        errEl.style.display = 'block'; this.disabled = false; this.textContent = 'Confirm Acceptance';
      }
    } catch (e) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.style.display = 'block'; this.disabled = false; this.textContent = 'Confirm Acceptance';
    }
  });
})();
<\/script>`;
    }
    html = html.replace("</body>", injectedHtml + "\n</body>");
    return new Response(html, {
      status: isExpired ? 410 : 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error4) {
    console.error("[Public Quote] Error:", error4);
    return new Response("<h1>Error loading quote</h1>", { status: 500, headers: { "Content-Type": "text/html" } });
  }
});
}
