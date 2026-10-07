// tools/user-simulation/journeys/sightx-corridor.mjs
//
// Journey map id "sightx-corridor" (priority 3): a guest on desktop hangs a matched schedule in the
// SightX corridor, comes back to the dossier, lowers it from the SightX chapter, and tries the
// Guided Walkthrough Preview on the SightX page (in the overlay).
// Expected: a walkable 3D corridor with each matched product labelled where it mounts; the dossier
// comes back on Enter or tap; the walkthrough preview generates; all in place.
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
  if (sx && (await sx.locator("#wt-preview-btn").count())) {
    await pressIn(sx, "#wt-preview-btn");
    await sx.fill("#wt-preview-input", "Ground-floor corridor of a medical office: eight hollow-metal doors, one exit pair with panic devices.");
    await pressIn(sx, "#wt-preview-generate");
    const status = await waitText(sx, "#wt-preview-status", /^Done|Error|failed/i, 120000, /^Generating/i);
    J.check("Guided Walkthrough Preview generates a walkthrough", /^Done/i.test(status || ""), status);
  } else {
    J.check("Guided Walkthrough Preview generates a walkthrough", false, "no Guided Walkthrough Preview control on the SightX page");
  }
  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
