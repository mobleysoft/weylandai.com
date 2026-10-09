// g022: cold desktop + touch phone, homepage upload -> real guest PDF read.
// No seeded auth, API interception or account creation. Requires deployed g018.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Journey, shellState } from "../lib/journey-kit.mjs";
import { SHEET, evidenceFolder, saveJson, watchWorkspace, openUpload, readSchedule } from "../lib/estimator-kit.mjs";
import { csvEvidence, firstReadWrites } from "../lib/estimator-assertions.mjs";

const J = new Journey("upload-without-account-to-first-read", "Estimator: upload without an account to the first read");
await J.run(async () => {
  const dir = await evidenceFolder(J);
  await J.launch();
  for (const kind of ["desktop", "phone"]) {
    const ctx = await J.context(kind), page = await J.page(ctx), traffic = watchWorkspace(ctx);
    const started = Date.now(), touch = kind === "phone";
    try {
      const { frame, mark } = await openUpload(J, page, kind);
      const signedOut = async () => ({ shell: (await shellState(page)).auth,
        token: await frame.evaluate(() => !!localStorage.getItem("_authfor_token")),
        sessionCookie: (await ctx.cookies()).some(c => c.name === "weyland_session") });
      const before = await signedOut();
      J.check(kind + ": upload is available to a cold visitor before sign-in", before.shell !== "signed-in" && !before.token && !before.sessionCookie, before);
      await readSchedule(J, frame, { pdf: SHEET, project: "user-sim guest " + J.suffix, label: kind, sourcePage: 1, touch });
      const seconds = (Date.now() - started) / 1000;
      const after = await signedOut();
      const writes = firstReadWrites(traffic.requests);
      J.check(kind + ": first read needs no account, sign-in request or schedule upload POST", after.shell !== "signed-in" && !after.token && !after.sessionCookie && !writes.length && !J.accounts.length, { ...after, writes });
      J.note(kind + "_first_value", { seconds, account_gate_seconds: 0, scope: "production homepage navigation through completed guest read; gate assertion is separate" });
      const need = await frame.locator("#hardware-needed").innerText();
      J.check(kind + ": the door sheet requests Section 08 71 00 before a packet", /Section 08 71 00.*Door Hardware/.test(need) && /hardware group pages.*door sheet/i.test(need), need);
      J.check(kind + ": saving is offered after the first read", await frame.locator("#guest-save-btn").isVisible(), await frame.locator("#guest-save").innerText());
      await frame.locator("#doors-wrap").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(dir, kind + "-first-read.png") });

      const csvButton = frame.getByRole("button", { name: "DOWNLOAD THE DOOR LIST (CSV)", exact: true });
      const [download] = await Promise.all([page.waitForEvent("download"), touch ? csvButton.tap() : csvButton.click()]);
      const csvFile = path.join(dir, kind + "-doors.csv");
      await download.saveAs(csvFile);
      const csv = csvEvidence(await readFile(csvFile, "utf8"));
      J.check(kind + ": downloaded CSV retains all 65 marks, pair/glazing values and alternate pricing", csv.ok, csv);
      await saveJson(J, dir, kind + "-csv-check.json", csv);
      await J.checkInPlace(page, mark, kind + ": same homepage document after upload, read and CSV download");
      J.check(kind + ": the journey opens no new tabs", page.__popups.length === 0, page.__popups.length);
    } finally {
      await traffic.settle();
      await saveJson(J, dir, kind + "-traffic.json", { requests: traffic.requests, responses: traffic.responses });
      await page.screenshot({ path: path.join(dir, kind + "-last-screen.png") }).catch(() => {});
      await ctx.close();
    }
  }
});
