// weyland-huntx-worker/src/lib/email-alerts.js
//
// HuntX email alerts (2026-10-08), sent through mailguyAI (mhslp's own mail
// gateway: POST https://mailguyai.com/api/v1/send, Bearer MAILGUY_API_KEY,
// Cloudflare Email Sending underneath). A saved search with alerts on gets one
// digest a day at most: the notices that entered the index since its last
// email, newest first, each with its agency, place, due date, value and link.
// Every email carries a one-click unsubscribe for that search. Nothing is sent
// while the owner's HuntX plan is not active, and nothing at all until the
// worker has a MAILGUY_API_KEY secret (the feature reports itself off).
//
// Run by the request-driven job lease (index.js, "huntx-email-digest"), never
// by a cron: Cron Triggers do not fire on this account.

import { searchWhere } from "../routes/hunt.js";
import { outputAccess } from "../../../weyland-shared/output-access.js";

export const DIGEST_GAP_HOURS = 20;
export const MAX_SEARCHES_PER_RUN = 40;
export const MAX_ROWS_PER_EMAIL = 25;
const SITE = "https://weylandai.com";

export const emailEnabled = (env) => !!(env && env.MAILGUY_API_KEY);

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => (Number(n) > 0 ? "$" + Math.round(Number(n)).toLocaleString("en-US") : "");

/** The digest for one saved search: { subject, html, text }. */
export function digestEmail({ name, rows, total, unsubscribeUrl, manageUrl = SITE + "/huntx" }) {
  const shown = rows.slice(0, MAX_ROWS_PER_EMAIL);
  const subject = `HuntX: ${total} new notice${total === 1 ? "" : "s"} for "${name}"`;
  const line = (o) => [o.agency, o.location, o.key_date && "due " + o.key_date, money(o.estimated_value), o.trade_fit && "fit: " + o.trade_fit].filter(Boolean).join(" · ");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:Helvetica,Arial,sans-serif;color:#151515">
<div style="max-width:640px;margin:0 auto;padding:24px">
<div style="font:700 12px/1 monospace;letter-spacing:.12em;color:#2a52ff">WEYLANDAI HUNTX</div>
<h1 style="font-size:20px;margin:10px 0 4px">${esc(total)} new notice${total === 1 ? "" : "s"} for “${esc(name)}”</h1>
<p style="color:#555;margin:0 0 16px;font-size:13px">Public bid notices that entered HuntX since your last alert for this saved search.</p>
${shown.map((o) => `<div style="background:#fff;border:1px solid #e2e2de;border-radius:8px;padding:12px 14px;margin-bottom:10px">
<a href="${esc(o.detail_url || manageUrl)}" style="color:#151515;font-weight:700;text-decoration:none;font-size:14px">${esc(o.title)}</a>
<div style="color:#666;font-size:12px;margin-top:4px">${esc(line(o))}</div></div>`).join("")}
${total > shown.length ? `<p style="font-size:13px"><a href="${esc(manageUrl)}" style="color:#2a52ff">${total - shown.length} more in HuntX</a></p>` : ""}
<p style="font-size:12px;color:#777;margin-top:20px">You get this because you turned on email alerts for the saved search “${esc(name)}” in <a href="${esc(manageUrl)}" style="color:#2a52ff">HuntX</a>. At most one email a day per search.
<a href="${esc(unsubscribeUrl)}" style="color:#777">Stop these emails</a>.</p>
</div></body></html>`;
  const text = [`${total} new notice${total === 1 ? "" : "s"} for "${name}" (WeylandAI HuntX)`, "",
    ...shown.map((o) => `- ${o.title}\n  ${line(o)}${o.detail_url ? "\n  " + o.detail_url : ""}`),
    total > shown.length ? `\n${total - shown.length} more: ${manageUrl}` : "", "",
    `Stop these emails: ${unsubscribeUrl}`].join("\n");
  return { subject, html, text };
}

export async function sendViaMailguy(env, { to, subject, html, text }, fetchImpl = fetch) {
  const res = await fetchImpl("https://mailguyai.com/api/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.MAILGUY_API_KEY },
    body: JSON.stringify({ to, subject, html, text, from: env.HUNTX_FROM || "huntx@mailguyai.com", from_name: "WeylandAI HuntX", reply_to: env.HUNTX_REPLY_TO || "support@weylandai.com" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new Error("mailguyAI " + res.status + ": " + (body.error || body.message || "send failed"));
  return body;
}

/**
 * One pass over saved searches with alerts on. Returns { checked, sent, skipped, errors }.
 * `now` and `fetchImpl` are injectable for tests.
 */
export async function runEmailDigests(env, { now = new Date(), fetchImpl = fetch } = {}) {
  const out = { checked: 0, sent: 0, skipped: 0, errors: [] };
  if (!emailEnabled(env)) return { ...out, off: "MAILGUY_API_KEY is not set" };
  const due = new Date(now.getTime() - DIGEST_GAP_HOURS * 3600000).toISOString();
  const searches = (await env.DB.prepare(
    "SELECT id, user_id, name, params, last_emailed_at, created_at, unsub_token FROM huntx_saved_searches WHERE email_alerts = 1 AND (last_emailed_at IS NULL OR last_emailed_at < ?) ORDER BY COALESCE(last_emailed_at, '') ASC LIMIT ?"
  ).bind(due, MAX_SEARCHES_PER_RUN).all()).results || [];
  const today = now.toISOString().slice(0, 10);
  for (const s of searches) {
    out.checked++;
    try {
      if (!(await outputAccess(env, s.user_id, "huntx", now.getTime())).paid) { out.skipped++; continue; }
      const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(s.user_id).first();
      if (!user || !/@/.test(user.email || "")) { out.skipped++; continue; }
      let params = {};
      try { params = JSON.parse(s.params) || {}; } catch (_) { params = {}; }
      const since = s.last_emailed_at || s.created_at;
      const { where, params: binds } = searchWhere(params, today);
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where} AND created_at > ?`).bind(...binds, since).first())?.n || 0;
      const stamp = now.toISOString();
      if (!total) { await env.DB.prepare("UPDATE huntx_saved_searches SET last_emailed_at = ? WHERE id = ?").bind(stamp, s.id).run(); out.skipped++; continue; }
      const rows = (await env.DB.prepare(`SELECT id, title, agency, location, key_date, estimated_value, detail_url, trade_fit FROM opportunities ${where} AND created_at > ? ORDER BY created_at DESC LIMIT ?`).bind(...binds, since, MAX_ROWS_PER_EMAIL).all()).results || [];
      const mail = digestEmail({ name: s.name, rows, total, unsubscribeUrl: `${SITE}/api/hunt/unsubscribe/${s.unsub_token}` });
      await sendViaMailguy(env, { to: user.email, ...mail }, fetchImpl);
      await env.DB.prepare("UPDATE huntx_saved_searches SET last_emailed_at = ? WHERE id = ?").bind(stamp, s.id).run();
      out.sent++;
    } catch (e) {
      out.errors.push(s.id + ": " + e.message);
    }
  }
  return out;
}
