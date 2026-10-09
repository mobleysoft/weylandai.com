// g022: actual UI uploads -> named missing-spec gate -> door+spec bid set ->
// matched packet, opened and downloaded. No payment: a throwaway SubConP account
// uses the harness's real auth and finally cleanup. Requires g018 and pdftotext.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Journey, openHome, raiseDossier, setMark, press, signIn, overlayFrame, buildSubmittalPackage } from "../lib/journey-kit.mjs";
import { SHEET, BIDSET, evidenceFolder, saveJson, watchWorkspace, readSchedule, sha256 } from "../lib/estimator-kit.mjs";
import { hardwareEvidence, packetEvidence, packetTextEvidence } from "../lib/estimator-assertions.mjs";

const J = new Journey("schedule-plus-spec-to-packet-with-hardware", "Estimator: door schedule and spec to a packet with hardware");
await J.run(async () => {
  const dir = await evidenceFolder(J);
  execFileSync("pdftotext", ["-v"], { stdio: "pipe" }); // fail before creating an account if absent
  await J.launch();
  const acct = await J.account("estimator-packet");
  const ctx = await J.context("desktop"), page = await J.page(ctx), traffic = watchWorkspace(ctx);
  try {
    await openHome(page, J);
    await raiseDossier(page);
    const mark = await setMark(page);
    await press(page, "#wa-account-chip");
    // g018's code-first door retains an explicit password option; no email sent.
    const passwordOption = page.locator("#weyland-signin-use-password");
    if (await passwordOption.isVisible()) await passwordOption.click();
    const auth = await signIn(page, acct);
    J.check("throwaway subscriber signs in through the homepage", auth.auth === "signed-in", { auth: auth.auth, error: auth.error });
    if (auth.auth !== "signed-in") throw new Error("Subscriber sign-in failed");
    // Close the account view with its real close control, then use the upload CTA.
    const close = page.locator("#wa-overlay.is-open .wa-close");
    if (await close.isVisible()) await close.click();
    const via = await press(page, "#hs-upload");
    J.check("the homepage upload control opens the workspace by pointer", via === "pointer", via);
    const frame = await overlayFrame(page, 25000);
    if (!frame) throw new Error("No SubX workspace in the homepage overlay");
    await frame.locator("#f-file").waitFor({ state: "visible" });

    await readSchedule(J, frame, { pdf: SHEET, project: "user-sim sheet-only " + J.suffix, label: "sheet_only", sourcePage: 1 });
    const need = await frame.locator("#hardware-needed").innerText();
    J.check("sheet-only read names the missing hardware spec and asks to read it with the door sheet", /Section 08 71 00.*Door Hardware/.test(need) && /hardware group pages.*door sheet/i.test(need), need);
    const [refused] = await Promise.all([
      page.waitForResponse(r => r.request().method() === "POST" && /\/submittal-pdf$/.test(new URL(r.url()).pathname), { timeout: 300000 }),
      frame.locator("#package-btn").click()
    ]);
    const gate = await refused.json();
    await saveJson(J, dir, "sheet-only-packet-refusal.json", { status: refused.status(), ...gate });
    J.check("building a door-only packet is refused with HARDWARE_SPEC_REQUIRED", refused.status() === 409 && gate.error === "HARDWARE_SPEC_REQUIRED" &&
      gate.hardware_schedule_needed?.sections?.includes("08 71 00"), { status: refused.status(), ...gate });
    await frame.locator("#upload-btn").waitFor({ state: "visible" });
    await frame.waitForFunction(() => !document.getElementById("upload-btn").disabled);
    await page.screenshot({ path: path.join(dir, "sheet-only-spec-required.png") });

    // The specified customer action is to upload a bid set containing both.
    // Full, checked-in Rockford: Section 08 71 00 pp17–23 and A2.2 p29.
    const project = "user-sim schedule-plus-spec " + J.suffix;
    await readSchedule(J, frame, { pdf: BIDSET, project, label: "schedule_plus_spec", sourcePage: 29 });
    await traffic.settle();
    const detail = traffic.responses.filter(r => /\/doors$/.test(r.path) && r.data?.session?.project_name === project).at(-1)?.data;
    await saveJson(J, dir, "schedule-plus-spec-detail.json", detail || null);
    const hardware = hardwareEvidence(detail);
    J.check("the same uploaded job has all 14 audited groups and 110 real hardware items", hardware.ok, hardware);
    const displayed = { groups: await frame.locator("#sets-wrap tbody tr").count(), items: await frame.locator("#sets-wrap .item-text").count(), needed: await frame.locator("#hardware-needed").innerText() };
    J.check("the workspace displays the hardware and clears its spec request", displayed.groups === 14 && displayed.items === 110 && !displayed.needed.trim(), displayed);
    J.check("the packet uses this run's saved upload, not the demo job", !!detail?.session?.id && J.uploads.has(detail.session.id) && !detail.session.is_demo, detail?.session);
    if (!detail?.session?.id) throw new Error("No saved detail response for this run's schedule-plus-spec upload");
    const company = "User Simulation Estimator " + J.suffix;
    await frame.locator("#f-company").fill(company);
    const [response, pkg] = await Promise.all([
      page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/hardware-schedule/session/" + detail.session.id + "/submittal-pdf", { timeout: 300000 }),
      buildSubmittalPackage(frame)
    ]);
    const packet = await response.json();
    await saveJson(J, dir, "packet-response.json", packet);
    const manifest = packetEvidence(packet);
    J.check("the built packet contains doors, all hardware groups/items, cut sheets and source pages", response.ok() && manifest.ok, manifest);
    J.check("the paid account opens the real PDF rendered in the workspace", !!pkg.viewer && pkg.viewer.kind === "pages drawn in the page" && !!pkg.download && !page.__popups.length, pkg);
    await page.screenshot({ path: path.join(dir, "packet-in-page.png") });
    if (!pkg.download) throw new Error("No downloadable PDF after building the packet");
    const [download] = await Promise.all([page.waitForEvent("download"), frame.locator("#package-download").click()]);
    const pdfFile = path.join(dir, "packet.pdf");
    await download.saveAs(pdfFile);
    const bytes = await readFile(pdfFile);
    J.check("DOWNLOAD PDF saves PDF bytes", bytes.subarray(0, 5).toString() === "%PDF-", { bytes: bytes.length, sha256: sha256(bytes) });
    const text = execFileSync("pdftotext", ["-layout", pdfFile, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    await writeFile(path.join(dir, "packet.txt"), text);
    const contents = packetTextEvidence(text, packet, company);
    await saveJson(J, dir, "packet-contents-check.json", contents);
    J.check("downloaded PDF has every generated hardware group sheet and real catalogue pages", contents.ok, contents);
    J.note("packet", { manifest, contents, bytes: bytes.length, sha256: sha256(bytes), viewer: pkg.viewer });
    await J.checkInPlace(page, mark, "same homepage document from sign-in through packet download");
    J.check("packet preview and download open no new tab", !page.__popups.length, page.__popups.length);
  } finally {
    await traffic.settle();
    await saveJson(J, dir, "traffic.json", { requests: traffic.requests, responses: traffic.responses });
    await page.screenshot({ path: path.join(dir, "last-screen.png") }).catch(() => {});
    await ctx.close();
  }
});
