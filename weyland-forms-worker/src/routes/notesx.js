// weyland-forms-worker/src/routes/notesx.js
//
// NotesX (2026-10-08): meeting minutes from a MeetingX room's record. The
// old NotesX was a form that duplicated MeetingX's decisions and actions
// and was not linked to it. MeetingX rooms now keep their record in D1
// (meetingx_room_items: chat, decisions, actions with done state,
// transcript lines, each with who and when); NotesX reads that record and
// lays out the minutes: attendees (everyone who spoke or wrote in the
// room), decisions numbered, action items open and closed, discussion, and
// the transcript as an appendix if asked.
//   GET  /api/forms/notesx/rooms             rooms you took part in (from the record)
//   POST /api/forms/notesx/preview {room, from?, to?, ...}  -> the minutes as data (free)
//   POST /api/forms/notesx/pdf     same body -> the minutes PDF (NotesX, the suite or the $100 offer)
// Only someone who took part in the room (has an item in its record) can
// make its minutes.

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const ROOM = /^[A-Za-z0-9_-]{1,64}$/;

export function minutesFrom(items, opts = {}) {
  const from = opts.from ? Date.parse(opts.from) : null, to = opts.to ? Date.parse(opts.to) : null;
  const inRange = items.filter((i) => { const t = Date.parse(i.created_at); return (!from || t >= from) && (!to || t <= to + 86399999); });
  const attendees = [...new Set(inRange.map((i) => i.user_name).filter(Boolean))].sort();
  const pick = (k) => inRange.filter((i) => i.kind === k);
  const times = inRange.map((i) => Date.parse(i.created_at)).filter(Number.isFinite).sort((a, b) => a - b);
  return {
    title: String(opts.title || "Project meeting").slice(0, 160),
    project: String(opts.project || "").slice(0, 160),
    location: String(opts.location || "MeetingX room " + (opts.room || "")).slice(0, 160),
    started: times.length ? new Date(times[0]).toISOString() : null,
    ended: times.length ? new Date(times.at(-1)).toISOString() : null,
    attendees,
    decisions: pick("decision").map((d) => ({ text: d.text, by: d.user_name, at: d.created_at })),
    actions: pick("action").map((a) => ({ text: a.text, by: a.user_name, at: a.created_at, done: !!a.done })),
    discussion: pick("chat").map((c) => ({ text: c.text, by: c.user_name, at: c.created_at })),
    transcript: pick("transcript").map((t) => ({ text: t.text, by: t.user_name, at: t.created_at })),
    nextMeeting: String(opts.nextMeeting || "").slice(0, 160),
  };
}

const hm = (iso) => (iso ? new Date(iso).toISOString().slice(11, 16) + " UTC" : "");

export async function minutesPdf(m, { includeTranscript = false } = {}) {
  const w = await newDoc({ title: `Minutes: ${m.title}`, footer: `Minutes · ${m.title} · WeylandAI NotesX` });
  title(w, "MEETING MINUTES", { size: 17 });
  for (const [l, v] of [["Meeting:", m.title], ["Project:", m.project], ["Where:", m.location], ["Date:", m.started ? m.started.slice(0, 10) : ""], ["Time:", m.started ? `${hm(m.started)} to ${hm(m.ended)}` : ""], ["Attendees:", m.attendees.join(", ")]]) field(w, l, v);
  title(w, "Decisions", { size: 13 });
  if (m.decisions.length) table(w, [{ head: "#", width: 0.06 }, { head: "DECISION", width: 0.64 }, { head: "RECORDED BY", width: 0.18 }, { head: "TIME", width: 0.12 }], m.decisions.map((d, i) => [String(i + 1), d.text, d.by || "", hm(d.at)]), { size: 9.5 });
  else small(w, "No decisions recorded.");
  title(w, "Action items", { size: 13 });
  if (m.actions.length) table(w, [{ head: "#", width: 0.06 }, { head: "ACTION (AND OWNER)", width: 0.58 }, { head: "STATUS", width: 0.12 }, { head: "RECORDED BY", width: 0.24 }], m.actions.map((a, i) => [String(i + 1), a.text, a.done ? "Done" : "Open", a.by || ""]), { size: 9.5 });
  else small(w, "No action items recorded.");
  title(w, "Discussion", { size: 13 });
  if (m.discussion.length) for (const c of m.discussion.slice(0, 400)) para(w, `${hm(c.at)}  ${c.by || ""}: ${c.text}`, { size: 9.5, justify: false, gapAfter: 1 });
  else small(w, "No room chat in this period.");
  if (m.nextMeeting) { title(w, "Next meeting", { size: 13 }); para(w, m.nextMeeting, { size: 11 }); }
  if (includeTranscript && m.transcript.length) {
    title(w, "Appendix: transcript", { size: 13 });
    small(w, "Lines as each participant's browser transcribed their own microphone.");
    for (const t of m.transcript.slice(0, 1500)) para(w, `${hm(t.at)}  ${t.by || ""}: ${t.text}`, { size: 9, justify: false, gapAfter: 0 });
  }
  return finish(w);
}

export function registerNotesxRoutes(router, { authenticate }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to make minutes from your MeetingX rooms." }, 401) };
    return { userId: String(user.userId) };
  }
  async function roomItems(env, room, userId) {
    if (!ROOM.test(room)) return { error: jsonResponse3({ success: false, message: "Choose a MeetingX room." }, 400) };
    let items = [];
    try {
      items = (await env.DB.prepare("SELECT kind, text, user_id, user_name, done, created_at FROM meetingx_room_items WHERE room = ? ORDER BY created_at").bind(room).all()).results || [];
    } catch (_) { items = []; }
    if (!items.some((i) => String(i.user_id) === userId)) return { error: jsonResponse3({ success: false, message: "Only someone who took part in the room can make its minutes; nothing in that room's record is yours." }, 403) };
    return { items };
  }

  router.get("/api/forms/notesx/rooms", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    let rooms = [];
    try {
      rooms = (await env.DB.prepare(
        `SELECT room, COUNT(*) AS items, MIN(created_at) AS first_at, MAX(created_at) AS last_at,
                SUM(CASE WHEN kind = 'decision' THEN 1 ELSE 0 END) AS decisions, SUM(CASE WHEN kind = 'action' THEN 1 ELSE 0 END) AS actions
         FROM meetingx_room_items WHERE room IN (SELECT DISTINCT room FROM meetingx_room_items WHERE user_id = ?)
         GROUP BY room ORDER BY last_at DESC LIMIT 50`
      ).bind(a.userId).all()).results || [];
    } catch (_) { rooms = []; }
    return jsonResponse3({ success: true, rooms });
  });

  router.post("/api/forms/notesx/preview", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const body = await request.json().catch(() => ({}));
    const r = await roomItems(env, String(body.room || ""), a.userId); if (r.error) return r.error;
    return jsonResponse3({ success: true, minutes: minutesFrom(r.items, body) });
  });

  router.post("/api/forms/notesx/pdf", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const body = await request.json().catch(() => ({}));
    const r = await roomItems(env, String(body.room || ""), a.userId); if (r.error) return r.error;
    if (!(await outputAccess(env, a.userId, "notesx")).paid) return jsonResponse3(paymentRequired("The minutes PDF"), 402);
    const bytes = await minutesPdf(minutesFrom(r.items, body), { includeTranscript: !!body.includeTranscript });
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Minutes-${String(body.room).slice(0, 20)}.pdf"`, "Cache-Control": "no-store" } });
  });
}
