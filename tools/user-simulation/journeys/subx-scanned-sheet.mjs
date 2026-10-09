// g019: upload the generator's complete vector and image-only bidsets, choose schedule page 3,
// READ IT IN THIS BROWSER, save, and compare the displayed marks and source rows.
// Uses real production, the real reader module and extract-result route, and Journey cleanup.
// node tools/user-simulation/journeys/subx-scanned-sheet.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Journey, openHome, raiseDossier, signIn, overlayFrame, subxWorkspace, workspaceDetail, pressIn, waitText, until } from "../lib/journey-kit.mjs";
import { openPdf, pageItems } from "../../accuracy/truth/pdf.mjs";
import { mapResult } from "../../accuracy/truth/reader_a.mjs";
import { scoreDoorsVs } from "../../accuracy/truth/agree.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const truth = JSON.parse(readFileSync(root + "tools/bidset/out/truth-doors.json"));
const schedulePage = truth.source.pages[0];
const J = new Journey("subx-scanned-sheet", "Full-size scanned door schedule: same 48 marks as vector");
const expectedMarks = truth.doors.map(d => d.mark).sort();

await J.run(async () => {
  // Assert the fixture's promise without giving any truth to the production reader.
  const scanned = root + "tools/bidset/out/weylandai-building-bidset-scanned.pdf";
  const doc = await openPdf(readFileSync(scanned));
  const sheet = await pageItems(doc, schedulePage);
  await (doc.destroy?.() ?? doc.loadingTask?.destroy());
  J.check("the scanned fixture is a full-size image-only sheet", sheet.items.length === 0 && Math.max(sheet.width, sheet.height) === 2592, {page:schedulePage,words:sheet.items.length,width:sheet.width,height:sheet.height});
  await J.launch();
  const acct = await J.account("scan");
  const ctx = await J.context("desktop"), page = await J.page(ctx);
  const submitted = [];
  ctx.on("request", req => {
    if (req.method() === "POST" && /\/page\/\d+\/extract-result$/.test(new URL(req.url()).pathname)) {
      const body = req.postDataJSON();
      if (body?.extraction) submitted.push(body.extraction);
    }
  });
  await openHome(page, J); await raiseDossier(page);
  const st = await signIn(page, acct);
  J.check("subscriber signs in", st.auth === "signed-in", {auth:st.auth,error:st.error});
  await page.evaluate(() => window.WeylandShell.open("app", {path:"/subx-app"}));
  const frame = await overlayFrame(page, 25000);
  if (!frame) throw new Error("SubX workspace did not open");
  const workspace = await subxWorkspace(frame);
  J.check("SubX offers the browser reader", workspace.appVisible && workspace.clientExtraction, workspace);
  const marks = {};
  for (const variant of ["vector", "scanned"]) {
    const file = root + "tools/bidset/out/weylandai-building-bidset" + (variant === "scanned" ? "-scanned" : "") + ".pdf";
    const project = "user-sim g019 " + variant + " " + J.suffix;
    await frame.fill("#f-project", project);
    await frame.selectOption("#f-doctype", "door_schedule");
    await frame.setInputFiles("#f-file", file);
    await waitText(frame, "#rasterize-status", /preview|failed|error/i, 60000, /^Drawing/i);
    await pressIn(frame, "#upload-btn");
    const upload = await waitText(frame, "#upload-result", /^Uploaded|failed|error/i, 120000, /^Uploading/i);
    J.check(variant + " bidset uploads", /^Uploaded/i.test(upload || ""), upload);
    if (!/^Uploaded/i.test(upload || "")) throw new Error(variant + " upload failed");
    // Let automatic page finding/reading finish, then explicitly exercise the browser OCR button.
    const ready = await until(() => frame.evaluate(project => {
      const b = document.getElementById("client-extract-btn");
      const title = document.getElementById("sd-title")?.innerText || "";
      const result = document.getElementById("extract-result");
      return title.includes(project) && !!b && !b.disabled && !!result && !result.querySelector(".spin") && /Page \d+:|could not|nothing reads/i.test(result.innerText);
    }, project), 600000, 1000);
    if (!ready) throw new Error(variant + " automatic read did not finish");
    await frame.selectOption("#sd-page", String(schedulePage)); // #sd-page is a <select> in the shipped app, not a text input
    await frame.selectOption("#sd-type", "door_schedule");
    const before = submitted.length;
    await pressIn(frame, "#client-extract-btn");
    const status = await waitText(frame, "#extract-result", /read in this browser and saved|No .* found|failed|error|could not/i, 600000);
    J.check(variant + " sheet reads and saves through the browser path", /48 doors read in this browser and saved/.test(status || ""), status);
    await until(async () => (await workspaceDetail(frame)).rows.length === truth.doors.length, 30000, 500);
    const detail = await workspaceDetail(frame);
    marks[variant] = detail.rows.map(r => r.mark).sort();
    J.check(variant + " displays exactly the 48 expected marks", JSON.stringify(marks[variant]) === JSON.stringify(expectedMarks), {count:detail.rows.length,marks:marks[variant]});
    J.check(variant + " rows cite the schedule page and row", detail.rows.length === 48 && detail.rows.every(r => new RegExp("^p\\." + schedulePage + " row \\d+").test(r.source)), detail.rows.slice(0, 3));
    const extraction = submitted.slice(before).find(x => x.doors?.length);
    J.check(variant + " saved the expected reader route", !!extraction && (variant === "scanned" ? /^(ocr_|client_grid)/.test(extraction.metadata?.extraction_mode || "") : extraction.metadata?.extraction_mode === "text_layer"), extraction?.metadata);
    const parsed = extraction ? mapResult({schedule_type:"door_schedule",result:extraction},"door_schedule") : null;
    const score = parsed ? scoreDoorsVs(truth, parsed.doors.map(d => ({page:schedulePage,...d}))) : null;
    J.check(variant + " matches every expected field across all 48 schedule rows",
      !!score && score.expected_rows === 48 && score.rows_found === 48 && score.rows_fully_right === 48 &&
      score.fields_total === 336 && score.fields_right === 336 && score.extra_rows === 0 && score.wrong.length === 0,
      score || "No saved extraction to score");
    if (score) J.note(variant + "_field_score", score);
    if (extraction) J.note(variant + "_metadata", extraction.metadata);
  }
  J.check("scanned and vector sheets display the same marks", marks.vector?.length === 48 && JSON.stringify(marks.scanned) === JSON.stringify(marks.vector), {vector:marks.vector?.length,scanned:marks.scanned?.length});
  await ctx.close();
});
