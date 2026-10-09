// tools/user-simulation/journeys/sightx-corridor.mjs
//
// Journey map id "sightx-corridor" (priority 3): a guest on desktop hangs a matched schedule in the
// SightX corridor, comes back to the dossier, lowers it from the SightX chapter, and tries the
// The SightX page (in the overlay): a pasted schedule built into a corridor and toured.
// Expected: a walkable 3D corridor with each matched product labelled where it mounts; the dossier
// comes back on Enter or tap; a pasted schedule builds a corridor and TOUR walks it; all in place.
// No account. Demo clones the page creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/sightx-corridor.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, pasteSchedule, openApp, frameInfo, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("sightx-corridor", "SightX corridor");
const lowered = (page) => page.evaluate(() => document.documentElement.classList.contains("folder-lowered"));

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  const mark = await setMark(page);
  await raiseDossier(page);

  const r = await pasteSchedule(page, SAMPLE_LINES);
  J.check("the schedule matches (" + SAMPLE_LINES.length + " lines)", r.matched === SAMPLE_LINES.length, r.first);
  const walk = page.locator("#hs-walk");
  const enabled = await walk.isEnabled().catch(() => false);
  J.check("WALK THIS SCHEDULE IN SIGHTX is offered once lines matched", enabled, enabled ? "enabled" : "disabled or missing");
  if (enabled) {
    await press(page, walk);
    const note = await waitText(page, "#hs-note", /SightX hung \d+ openings|not loaded/i, 45000);
    const hung = Number(((note || "").match(/hung (\d+) openings/i) || [])[1] || 0);
    J.check("SightX hangs the matched openings in the corridor walls", hung > 0 && hung === Math.min(12, r.matched || 0), note);
    J.check("the dossier lowers to show the corridor", await lowered(page), "html.folder-lowered");
    const bd = await page.evaluate(() => { const f = document.querySelector("#stage-backdrop iframe"); const b = f ? f.getBoundingClientRect() : null; return f ? { src: (f.getAttribute("src") || "").slice(0, 80), w: Math.round(b.width), h: Math.round(b.height) } : null; });
    J.check("the 3D corridor is on screen behind the dossier", !!bd && /sightx/.test(bd.src) && bd.w >= 600 && bd.h >= 400, bd || "no backdrop iframe");
    // 2026-10-08 (fix 10): the world opens on the corridor, never on the space prologue (intro=1).
    J.check("the corridor loads without the space intro (no intro=1 in the SightX frame's address)", !!bd && !/intro=/.test(bd.src), bd ? bd.src : "no backdrop iframe");
    // Click into the world and walk a step, then come back with Enter.
    await page.mouse.click(640, 430).catch(() => {});
    await page.keyboard.down("w"); await sleep(700); await page.keyboard.up("w");
    await sleep(300);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.documentElement.classList.contains("folder-lowered"), null, { timeout: 6000 }).catch(() => {});
    J.check("Enter brings the dossier back", !(await lowered(page)), "lowered=" + (await lowered(page)));
  }

  // SightX chapter: LOWER THE DOSSIER, then [raise dossier].
  await page.evaluate(() => { const s = document.getElementById("sightx"); if (s) s.scrollIntoView({ block: "center" }); });
  await sleep(600);
  const lowerBtn = page.locator("#sightx .js-lower-dossier").first();
  if (await lowerBtn.count()) {
    await press(page, lowerBtn);
    await sleep(1500);
    const bd = await page.evaluate(() => !!document.querySelector("#stage-backdrop iframe"));
    J.check("the SightX chapter's LOWER THE DOSSIER shows the jobsite twin", (await lowered(page)) && bd, { lowered: await lowered(page), backdrop: bd });
    const raise = page.locator("#envelope-raise");
    if (await raise.isVisible().catch(() => false)) await press(page, raise);
    await page.waitForFunction(() => !document.documentElement.classList.contains("folder-lowered"), null, { timeout: 6000 }).catch(() => {});
    J.check("[raise dossier] brings the dossier back", !(await lowered(page)));
  } else {
    J.check("the SightX chapter's LOWER THE DOSSIER shows the jobsite twin", false, "no LOWER THE DOSSIER control in the SightX chapter");
  }

  // The SightX page in the overlay: Guided Walkthrough Preview.
  const sx = await openApp(page, "/sightx", 40000);
  const si = await frameInfo(sx);
  J.check("the SightX page opens in the overlay", !!si && /^\/sightx\/?$/.test(si.path || "") && !si.jsonError, si ? { path: si.path, title: si.title } : "no frame");
  // 2026-10-09: /sightx is the schedule-driven app (pages/sightx-app.html); the Guided Walkthrough Preview
  // stayed on the homepage backdrop only. The journey walks what the page offers: paste a schedule,
  // BUILD THE CORRIDOR, and TOUR its doors.
  if (sx && (await sx.locator("#sx-build").count())) {
    await pressIn(sx, '.tab[data-src="paste"]');
    await sx.fill("#sx-text", "101 HM 3070 HW-1 90 MIN Corridor to Stair 1\n102 WD 3070 HW-2 Office 102\n103 PR HM 6070 HW-1 Lobby\nHW-1: closer, exit device, kick plate\nHW-2: lever lockset, 3 hinges, wall stop");
    await pressIn(sx, "#sx-build");
    // The page opens on the 10-door sample; wait for the build of the paste to finish before reading the count.
    const built = await waitText(sx, "#sx-status", /Built \d+ doors? from your pasted schedule|could not|error/i, 60000);
    J.note("sightx_build_status", built);
    const count = await waitText(sx, "#hud-count", /^3 DOORS/i, 15000) || (await sx.locator("#hud-count").innerText().catch(() => ""));
    J.check("the pasted schedule builds a corridor of its doors (3 doors, 2 sets)", /^3 DOORS · 2 SETS/i.test(count || ""), count);
    if (await sx.locator("#tour").count()) await pressIn(sx, "#tour");
    const info = await sx.evaluate(() => { const el = document.getElementById("info"); return el ? el.innerText.replace(/\s+/g, " ").trim().slice(0, 160) : ""; }).catch(() => "");
    J.check("TOUR stops at a door and names it", /10[123]/.test(info), info);
  } else {
    J.check("the pasted schedule builds a corridor of its doors (3 doors, 2 sets)", false, "no BUILD THE CORRIDOR control on the SightX page");
  }
  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
