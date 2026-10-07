// tools/user-simulation/journeys/meetingx-room.mjs
//
// Journey map id "meetingx-room" (priority 2): participant A, signed in on the homepage, presses
// CONNECT TO SPATIAL ROOM, joins the room in the overlay and shares its link; participant B (another
// signed-in subscriber) opens the link and joins.
// Expected: both participants in the same live room (roster, chat), reached from the homepage
// without leaving it.
// Two throwaway SubConP accounts; their rows and demo clones are deleted in finally. The room is a
// random id (Durable Object state, nothing stored in D1).
//
// Usage: node tools/user-simulation/journeys/meetingx-room.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, signIn, overlayFrame, openApp, frameInfo } from "../lib/journey-kit.mjs";

const J = new Journey("meetingx-room", "MeetingX room");
const roster = (t) => t.evaluate(() => Array.from(document.querySelectorAll("#roster .item")).map((x) => x.innerText.replace(/\s+/g, " ").trim())).catch(() => []);

await J.run(async () => {
  await J.launch();
  const a = await J.account("meet-a");
  const b = await J.account("meet-b");

  // Participant A: homepage, signed in.
  const ctxA = await J.context("desktop");
  await ctxA.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  const pageA = await J.page(ctxA);
  await openHome(pageA, J, "a");
  await raiseDossier(pageA);
  const mark = await setMark(pageA);
  const sa = await signIn(pageA, a);
  J.check("participant A signs in on the homepage", sa.auth === "signed-in", { auth: sa.auth, error: sa.error, seconds: sa.seconds });
  await pageA.evaluate(() => window.WeylandShell && window.WeylandShell.close());

  await pageA.evaluate(() => { const s = document.getElementById("meetingx"); if (s) s.scrollIntoView({ block: "center" }); });
  await sleep(600);
  const connect = pageA.locator("#meetingx a, #meetingx button").filter({ hasText: /connect to spatial room/i }).first();
  let room = null;
  if (await connect.count()) {
    await press(pageA, connect);
    await sleep(2000);
    room = await overlayFrame(pageA, 20000);
  }
  let ri = await frameInfo(room);
  const opened = !!ri && /^\/meetingx\/?$|^\/meetx\/?$/.test(ri.path || "") && ri.ids.includes("room-btn");
  J.check("CONNECT TO SPATIAL ROOM opens MeetingX in the overlay with JOIN ROOM", opened, ri ? { path: ri.path, title: ri.title, joinRoom: ri.ids.includes("room-btn") } : { overlay: await pageA.evaluate(() => ((document.querySelector("#wa-overlay.is-open .wa-body") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 160)) });
  if (!opened) {
    await pageA.evaluate(() => window.WeylandShell.close());
    room = await openApp(pageA, "/meetingx");
    ri = await frameInfo(room);
    J.check("MeetingX opened in the overlay has JOIN ROOM", !!ri && ri.ids.includes("room-btn"), ri ? { path: ri.path, search: ri.search, joinRoom: ri.ids.includes("room-btn") } : "no frame");
  }
  if (!room || !(await room.locator("#room-btn").count())) throw new Error("no JOIN ROOM for participant A; the rest of the journey cannot run");

  await pressIn(room, "#room-btn");
  const stA = await waitText(room, "#room-status", /^CONNECTED$|FAILED|UNAVAILABLE|NOT CONNECTED/i, 20000, /CONNECTING/i);
  J.check("participant A joins the room (CONNECTED)", /^CONNECTED$/i.test(stA || ""), stA + " | " + ((await room.evaluate(() => (document.getElementById("room-chat") || {}).innerText || "").catch(() => "")) || "").slice(0, 160));

  // The shareable link.
  const code = ((await room.evaluate(() => (document.getElementById("room-code") || {}).innerText || "").catch(() => "")) || "").trim();
  let link = null;
  if (await room.locator("#copy-room-link").count()) {
    await pressIn(room, "#copy-room-link");
    await sleep(500);
    link = await pageA.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  }
  J.note("room", { code, copied: link });
  let linkOk = false;
  try { const u = new URL(link); linkOk = u.host === new URL(BASE).host && u.searchParams.get("room") === code && !!code; } catch (e) { linkOk = false; }
  J.check("COPY LINK gives a shareable link to this room on weylandai.com", linkOk, link || "nothing on the clipboard");
  const shared = linkOk ? link : BASE + "/meetingx?room=" + encodeURIComponent(code);

  // Participant B opens the shared link, signed in.
  const ctxB = await J.context("desktop");
  const pageB = await J.page(ctxB);
  await openHome(pageB, J, "b");
  await raiseDossier(pageB);
  const sb = await signIn(pageB, b);
  J.check("participant B signs in", sb.auth === "signed-in", { auth: sb.auth, error: sb.error, seconds: sb.seconds });
  await pageB.goto(shared, { waitUntil: "load" });
  await sleep(1500);
  const hasJoin = (await pageB.locator("#room-btn").count()) > 0 || !!(await overlayFrame(pageB, 3000).then((f) => f && f.locator("#room-btn").count()).catch(() => 0));
  J.check("the shared room link offers JOIN ROOM to participant B", hasJoin, { url: pageB.url().slice(0, 120), title: await pageB.title() });
  let roomB = (await pageB.locator("#room-btn").count()) ? pageB : await overlayFrame(pageB, 3000);
  if (roomB && (await roomB.locator("#room-btn").count())) {
    await pressIn(roomB, "#room-btn");
    const stB = await waitText(roomB, "#room-status", /^CONNECTED$|FAILED|UNAVAILABLE|NOT CONNECTED/i, 20000, /CONNECTING/i);
    J.check("participant B joins the same room (CONNECTED)", /^CONNECTED$/i.test(stB || ""), stB + " | " + ((await roomB.evaluate(() => (document.getElementById("room-chat") || {}).innerText || "").catch(() => "")) || "").slice(0, 160));
    const both = await until(async () => (await roster(room)).length >= 2 && (await roster(roomB)).length >= 2, 15000, 500);
    J.check("both participants see each other in the roster", !!both, { A: await roster(room), B: await roster(roomB) });
    const msg = "hello from A " + J.suffix;
    await room.fill("#room-chat-input", msg);
    await pressIn(room, "#room-chat-send");
    const got = await until(async () => ((await roomB.evaluate(() => (document.getElementById("room-chat") || {}).innerText || "").catch(() => "")) || "").includes(msg), 15000, 500);
    J.check("chat from A reaches B", !!got, got ? "delivered" : "not delivered");
  }
  await ctxB.close();
  await pageA.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(pageA, mark, "participant A stayed in place: same document, still on weylandai.com");
  await ctxA.close();
});
