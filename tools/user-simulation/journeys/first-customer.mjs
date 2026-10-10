// tools/user-simulation/journeys/first-customer.mjs
//
// g052 (John, 2026-10-09 23:03 EDT): Mobley Contracting is WeylandAI's first customer, on credit.
// The same steps a stranger takes, against production, on the firm's own address
// (jmobleyworks+mobleycontracting@gmail.com, one of John's aliases, the only addresses tests mail):
//   STAGE=account  the homepage's account control: email me a sign-in code, the code from the inbox
//                  (CODE_FILE: whoever reads the inbox writes the 8 digits there), the no-account view,
//                  START MY FREE 14-DAY TRIAL, signed in, the account card. The browser's state is
//                  kept in STATE_FILE for the next stages.
//   STAGE=project  SubX in the overlay, signed in: the whole bid set (BIDSET_PDF, 92 MB) is refused
//                  with the page's own words; the schedule pages (PROJECT_PDF) are uploaded as the
//                  firm's first project (PROJECT), every row is read with its source page and row
//                  (EXPECT_ROWS), one row the reader got wrong is corrected with EDIT (CORRECT_MARK
//                  gets CORRECT_SIZE), and the submittal package is built, shown and downloaded
//                  (saved to PACKAGE_OUT when set). REUSE_PROJECT=1 opens the project already uploaded.
//   STAGE=claim    after the operator's on-account order (POST /api/billing/on-account, g052): a
//                  second code sign-in (the email proven) takes the held first submittal; the account
//                  card then shows it.
//   STAGE=record   the account card and the dossier as the customer record, read and screenshot
//                  (SHOTS_DIR).
// Nothing is cleaned up: the account, its project and its package are the customer record.
// SOFTWARE_GL=1 runs on a browser without a GPU (CHROMIUM_PATH), recorded in the report.
//
// Usage: STAGE=<stage> STATE_FILE=<path> [CODE_FILE=<path>] node tools/user-simulation/journeys/first-customer.mjs
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Journey, chromium, openHome, raiseDossier, setMark, press, pressIn, until, sleep, shellState, serverSession, openAccountCard, overlayFrame, subxWorkspace, workspaceDetail, workspaceUploadAndExtract, buildSubmittalPackage, gpuRenderer } from "../lib/journey-kit.mjs";

const STAGE = process.env.STAGE || "account";
const J = new Journey("first-customer-" + STAGE, "First customer on credit: " + STAGE);
const EMAIL = (process.env.CUSTOMER_EMAIL || "jmobleyworks+mobleycontracting@gmail.com").toLowerCase();
const STATE_FILE = process.env.STATE_FILE || "";
const CODE_FILE = process.env.CODE_FILE || "";
const MAGIC = /authfor\.com\/api\/v1\/auth\/magic-link$/;
const VERIFY = /authfor\.com\/api\/v1\/auth\/magic-link\/verify$/;

if (process.env.SOFTWARE_GL === "1") {
  J.launch = async function () {
    this.browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    const r = await gpuRenderer(this.browser);
    this.renderer = r;
    this.note("browser", "software WebGL (" + ((r && r.renderer) || "none") + "), not the Mac's GPU: timings of the 3D homepage are slower than a customer's");
    return this.browser;
  };
}
// The customer's record stays: nothing is deleted.
J.cleanup = async function () { this.cleanupResult = { kept: "the customer record (account, project, package) is kept on purpose" }; };

async function contextWithState() {
  const extra = STATE_FILE && existsSync(STATE_FILE) && STAGE !== "account" ? { storageState: STATE_FILE } : {};
  return J.context("desktop", { ...extra, acceptDownloads: true });
}
async function keepState(ctx) { if (STATE_FILE) { await ctx.storageState({ path: STATE_FILE }); J.note("state_kept", true); } }

/** The emailed-code sign-in, as code-sign-in.mjs does it; the code comes from CODE_FILE. */
async function codeSignIn(page) {
  await press(page, "#wa-account-chip");
  await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
  await page.fill("#weyland-signin-email", EMAIL);
  const sentAt = Date.now();
  const answerP = page.waitForResponse((r) => MAGIC.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await press(page, "#weyland-signin-code-send");
  const answer = await answerP;
  let body = {};
  try { body = answer ? await answer.json() : {}; } catch (e) { body = {}; }
  J.check("a sign-in code is sent to the firm's address (AuthFor: sent, WeylandAI's mail, 8 digits, 15 minutes)", !!answer && answer.status() === 200 && body.sent === true && body.brand === "weylandai" && body.code_length === 8, { status: answer && answer.status(), sent: body.sent, brand: body.brand, code_length: body.code_length });
  if (!CODE_FILE) throw new Error("CODE_FILE is required: the code is only in the email");
  writeFileSync(CODE_FILE + ".requested", new Date(sentAt).toISOString() + "\n");
  console.log("waiting for the code sent to " + EMAIL + " in " + CODE_FILE);
  const code = await until(async () => { if (!existsSync(CODE_FILE)) return null; const c = readFileSync(CODE_FILE, "utf8").replace(/\D+/g, ""); return c.length === 8 ? c : null; }, 10 * 60 * 1000, 2000);
  J.check("the emailed code was read from the firm's inbox", !!code, CODE_FILE);
  if (!code) throw new Error("no code");
  J.secrets.push(code);
  writeFileSync(CODE_FILE, "");
  await page.fill("#weyland-signin-code", code);
  const okP = page.waitForResponse((r) => VERIFY.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await press(page, "#weyland-signin-code-submit");
  const ok = await okP;
  let okb = {};
  try { okb = ok ? await ok.json() : {}; } catch (e) { okb = {}; }
  J.check("the right code signs the firm in at AuthFor (the inbox proven)", !!ok && ok.status() === 200 && !!okb.token && okb.user && okb.user.email_verified === true, { status: ok && ok.status(), email_verified: okb.user && okb.user.email_verified });
  await page.waitForFunction(() => ["signed-in", "no-account"].includes(document.documentElement.dataset.weylandAuth) || (window.WeylandShell && window.WeylandShell.state().view === "no-account"), null, { timeout: 45000 }).catch(() => {});
  return shellState(page);
}

const overlayText = (page) => page.evaluate(() => ((document.querySelector("#wa-overlay.is-open") || {}).innerText || "").replace(/\s+/g, " ").trim());

await J.run(async () => {
  await J.launch();
  const ctx = await contextWithState();
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  if (STAGE === "account") {
    const st = await codeSignIn(page);
    if (st.auth === "no-account" || st.view === "no-account") {
      const text = await overlayText(page);
      J.check("the page says the firm's address has no WeylandAI account yet and offers the free trial, no card", /No WeylandAI account on this email yet/i.test(text) && text.toLowerCase().includes(EMAIL) && /no card/i.test(text), text.slice(0, 240));
      const start = page.locator("#wa-overlay.is-open button").filter({ hasText: /START MY FREE 14-DAY TRIAL/i }).first();
      await press(page, start);
      await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in", null, { timeout: 45000 }).catch(() => {});
    } else {
      J.note("account_existed", st);
    }
    const after = await shellState(page);
    J.check("the firm is signed in to its own WeylandAI account", after.auth === "signed-in" && after.user === EMAIL, { auth: after.auth, user: after.user, error: after.error });
    const sv = await serverSession(page);
    J.check("the WeylandAI server session belongs to the firm's address", sv.valid && sv.email === EMAIL, sv);
    await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
    const card = await openAccountCard(page);
    J.note("account_card", card.overlayText);
    J.check("the account card opens for the firm", card.view === "account" && card.overlayText.toLowerCase().includes(EMAIL), card.overlayText.slice(0, 300));
    await page.evaluate(() => window.WeylandShell.close());
    await keepState(ctx);
  }

  if (STAGE === "project") {
    const st = await shellState(page);
    J.check("the firm's browser is still signed in to its account", st.auth === "signed-in" && st.user === EMAIL, { auth: st.auth, user: st.user });
    await page.evaluate(() => window.WeylandShell.open("app", { path: "/subx-app" }));
    const frame = await overlayFrame(page, 30000);
    const ws = frame ? await subxWorkspace(frame, 30000) : null;
    J.check("SubX opens in the overlay, signed in", !!ws && ws.appVisible && !ws.loginVisible, ws || "no overlay workspace");
    if (!frame) throw new Error("no SubX workspace frame");
    J.note("schedules_before", ws && ws.sessions);

    const project = process.env.PROJECT || "R2502";
    const expect = Number(process.env.EXPECT_ROWS || 0);
    // REUSE_PROJECT=1: the firm comes back to the project it uploaded (no second upload).
    const reuse = process.env.REUSE_PROJECT === "1";
    // The whole bid set as the firm has it: the page's own limit, in words.
    if (process.env.BIDSET_PDF && !reuse) {
      await frame.setInputFiles("#f-file", process.env.BIDSET_PDF);
      await sleep(1500);
      await pressIn(frame, "#upload-btn");
      await sleep(1500);
      const said = ((await frame.evaluate(() => (document.getElementById("upload-result") || {}).innerText || "")) || "").trim();
      J.check("the whole bid set (" + Math.round(Number(process.env.BIDSET_MB || 0)) + " MB) is refused in words: upload the schedule pages", /up to 30 MB/i.test(said) && /schedule pages/i.test(said), said);
    }

    if (reuse) {
      const listed = frame.locator("#sessions-list tr[data-id]").filter({ hasText: project }).first();
      J.check("the firm's project '" + project + "' is in its schedules", (await listed.count()) > 0, (await subxWorkspace(frame)).sessions);
      await pressIn(frame, listed);
    } else {
      const run = await workspaceUploadAndExtract(frame, { project, pdf: process.env.PROJECT_PDF });
      J.note("upload", { preview: run.preview, upload: run.upload, tries: run.tries });
      J.check("the schedule pages upload as the firm's project '" + project + "'", /^Uploaded/i.test(run.upload || "") && run.listed, { upload: run.upload, listed: run.listed });
    }
    // The workspace reads the pages the finder named one after another; wait for every row.
    await until(() => frame.evaluate((n) => document.querySelectorAll("#doors-wrap tbody tr").length >= n, expect), 600000, 2000);
    await sleep(2000);
    const d = await workspaceDetail(frame);
    const extract = ((await frame.evaluate(() => (document.getElementById("extract-result") || {}).innerText || "")) || "").replace(/\s+/g, " ").trim();
    J.note("read", { rows: d.rows.length, extract: extract.slice(0, 600), title: d.title, sub: d.sub, note: d.doorNote, tiles: d.tiles, steps: d.steps });
    J.check("every door row of the schedule pages is read (" + expect + " on the sheets)", d.rows.length === expect, { rows: d.rows.length, extract: extract.slice(0, 300) });
    const traced = d.rows.filter((r) => /p\.\d+ row \d+/.test(r.source));
    J.check("every row cites its source page and row", traced.length === d.rows.length && d.rows.length > 0, { rows: d.rows.length, traced: traced.length, sample: d.rows.slice(0, 3) });

    // The correction: a row the reader got wrong, fixed with EDIT, as an estimator would.
    const cm = process.env.CORRECT_MARK, cs = process.env.CORRECT_SIZE;
    if (cm && cs) {
      const row = frame.locator("#doors-wrap tbody tr").filter({ has: frame.locator("td.mark-cell", { hasText: new RegExp("^" + cm + "$") }) }).first();
      const before = await row.innerText().catch(() => "");
      await pressIn(frame, row.locator("button[data-edit]"));
      const sizeIn = frame.locator('#doors-wrap tr.editing input[name="size"]');
      await sizeIn.waitFor({ state: "visible", timeout: 10000 });
      const was = await sizeIn.inputValue();
      await sizeIn.fill(cs);
      await pressIn(frame, frame.locator("#doors-wrap tr.editing button[data-save]"));
      await until(() => frame.evaluate(() => !document.querySelector("#doors-wrap tr.editing")), 20000, 400);
      const fixedRow = () => frame.locator("#doors-wrap tbody tr").filter({ has: frame.locator("td.mark-cell", { hasText: new RegExp("^" + cm + "$") }) }).first();
      const after = (await fixedRow().innerText().catch(() => "")).replace(/\s+/g, " ");
      // What the server kept: EDIT again shows the stored size (a pair is written "PR ..."), then CANCEL.
      await pressIn(frame, fixedRow().locator("button[data-edit]"));
      await frame.locator('#doors-wrap tr.editing input[name="size"]').waitFor({ state: "visible", timeout: 10000 });
      const kept = await frame.locator('#doors-wrap tr.editing input[name="size"]').inputValue();
      await pressIn(frame, frame.locator("#doors-wrap tr.editing button[data-cancel]"));
      J.note("correction", { mark: cm, size_before: was, size_entered: cs, size_kept: kept, row_before: before.replace(/\s+/g, " ").slice(0, 200), row_after: after.slice(0, 200) });
      J.check("door " + cm + " is marked CORRECTED in the workspace", /CORRECTED/.test(after), after.slice(0, 200));
      const wantPair = /^PR\b/i.test(cs);
      J.check("the correction is kept as entered (size '" + was + "' to '" + cs + "'" + (wantPair ? ", a pair" : "") + ")", wantPair ? /^PR\b/i.test(kept) : !/^PR\b/i.test(kept), { kept });
    }

    const dlBefore = page.__downloads.length;
    const pkg = await buildSubmittalPackage(frame);
    J.note("package", pkg);
    J.check("BUILD THE SUBMITTAL PDF builds the firm's first submittal package with its door schedule", /^Built:/i.test(pkg.result) && pkg.pages > 0 && /door schedule \(\d+ doors/i.test(pkg.result), pkg.result);
    J.check("the package is shown in the page", !!pkg.viewer, pkg.viewer);
    if (pkg.download) {
      const dlP = page.waitForEvent("download", { timeout: 30000 }).catch(() => null);
      await pressIn(frame, "#package-download");
      const dl = await dlP;
      if (dl && process.env.PACKAGE_OUT) { await dl.saveAs(process.env.PACKAGE_OUT); J.note("package_saved", path.basename(process.env.PACKAGE_OUT)); }
      J.check("DOWNLOAD PDF saves the package", !!dl || page.__downloads.length > dlBefore, { file: dl && dl.suggestedFilename() });
    } else J.check("DOWNLOAD PDF saves the package", false, "no DOWNLOAD PDF link");
    J.note("schedules_after", (await subxWorkspace(frame)).sessions);
    await page.evaluate(() => window.WeylandShell.close());
    await keepState(ctx);
  }

  if (STAGE === "claim") {
    // A second emailed-code sign-in proves the address; the held first submittal comes with it.
    const st0 = await shellState(page);
    if (st0.auth === "signed-in") {
      await page.evaluate(() => window.WeylandShell.close());
      const card = await openAccountCard(page);
      const out = page.locator("#wa-overlay.is-open button").filter({ hasText: /^sign out$/i }).first();
      J.note("card_before_claim", card.overlayText);
      if (await out.count()) await press(page, out);
      await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-out", null, { timeout: 15000 }).catch(() => {});
      await sleep(800);
    }
    const claimed = page.waitForResponse((r) => /\/api\/auth\/session$/.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 60000 }).catch(() => null);
    const st = await codeSignIn(page);
    const res = await claimed;
    let rb = {};
    try { rb = res ? await res.json() : {}; } catch (e) { rb = {}; }
    J.note("claim_answer", { status: res && res.status(), claimed: rb.claimed });
    J.check("signing in with the emailed code takes the first submittal held on account", Array.isArray(rb.claimed) && rb.claimed.some((c) => c.product_id === "weyland-first-submittal"), { claimed: rb.claimed });
    J.check("signed in as the firm", st.auth === "signed-in" && st.user === EMAIL, st);
    await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
    const card = await openAccountCard(page);
    J.note("account_card", card.overlayText);
    J.check("the account card shows the first submittal and its 30 days", /first submittal/i.test(card.overlayText), card.overlayText.slice(0, 400));
    await page.evaluate(() => window.WeylandShell.close());
    await keepState(ctx);
  }

  if (STAGE === "record") {
    const st = await shellState(page);
    J.check("the firm's browser is signed in", st.auth === "signed-in" && st.user === EMAIL, st);
    const shots = process.env.SHOTS_DIR || "";
    if (shots) mkdirSync(shots, { recursive: true });
    if (shots) await page.screenshot({ path: path.join(shots, "dossier.png") });
    J.note("dossier", ((await page.evaluate(() => (document.querySelector(".envelope-frame") || document.body).innerText || "")) || "").replace(/\s+/g, " ").slice(0, 1200));
    const card = await openAccountCard(page);
    J.note("account_card", card.overlayText);
    J.check("the account card is the customer record: the firm's address", card.view === "account" && card.overlayText.toLowerCase().includes(EMAIL), card.overlayText.slice(0, 400));
    if (shots) await page.screenshot({ path: path.join(shots, "account-card.png") });
    await page.evaluate(() => window.WeylandShell.close());
    await page.evaluate(() => window.WeylandShell.open("app", { path: "/subx-app" }));
    const frame = await overlayFrame(page, 30000);
    const ws = frame ? await subxWorkspace(frame, 30000) : null;
    J.note("schedules", ws && ws.sessions);
    J.check("the firm's projects are listed in SubX", !!ws && /R2502/i.test(ws.sessions || ""), ws && ws.sessions);
    if (shots) await page.screenshot({ path: path.join(shots, "subx-projects.png") });
    await page.evaluate(() => window.WeylandShell.close());
  }

  await J.checkInPlace(page, mark);
  await ctx.close();
});
