// weyland-cutsheetx-worker/test/journey-live.mjs
//
// Repeatable real-browser journeys for CutsheetX and the finder, run against REAL production as a
// cold guest (no account). Every check is something a visitor sees or a document they open.
//
//   A. /cutsheetx: live counts load; MATCH answers Schlage L9080 with its catalogue-page citation
//      (the same answer as the homepage paste) and LCN 4040XP with its price-book pages; both
//      citations are drawn in the page at the cited page (lib/doc-viewer.js, pdf.js), never in a new
//      tab, and Back closes the document with the results still there; DOWNLOAD PDF saves the price
//      book without a new tab; SEARCH returns pages.
//   B. The homepage's single-page shell: CutsheetX opens in the overlay at /cutsheetx?embed=1 (not
//      /pricing); a citation there opens in the shell's own document view and the shell's Back brings
//      CutsheetX back with the same match; its nav stays in the shell; the finder searches and opens
//      results in place inside the overlay, its "open" goes to the shell's document view and Back
//      returns to the product page, Back closes the overlay, the WeylandAI link closes it without
//      nesting a homepage.
//   C. Homepage paste (known catalogue lines only), hero cards and TRY A REAL MATCH: the single-line
//      form gives the paste's answer, and every citation opens in place (the shell's document view
//      draws the page) for a guest, never {"error":"Authentication required"}.
//   D. Standalone finder: search and result links in place; Back, Forward and reload work; a product
//      page's "open" draws the document in the page with a Download control, Back closes it.
//
// Side effects: each run mints guest (AuthFor ephemeral) sessions, as every visitor does. The demo
// building clone (POST /api/demo/weyland-building/session) is blocked so nothing is written for it,
// and only catalogued lines are matched so no misses are recorded.
//
// Usage: PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node weyland-cutsheetx-worker/test/journey-live.mjs
//   WEYLAND_BASE_URL overrides https://weylandai.com. Exit 0 = every check passed. Chromium runs with
//   --use-angle=metal (real GPU WebGL; software WebGL stalls the homepage's 3D backdrop).
const BASE = (process.env.WEYLAND_BASE_URL || "https://weylandai.com").replace(/\/$/, "");
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");

const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail).slice(0, 300) }); return !!ok; }
const redact = (u) => String(u || "").replace(/cite=[^&#]+/, "cite=...");

// CutsheetX and the finder draw a document in the page (lib/doc-viewer.js, 2026-10-07): pdf.js at the
// cited page over the page the visitor is on. It must be drawn, at the expected page, with no new tab
// and never an auth error.
async function openInPage(page, selector, label, expectLabel) {
  const tabs = page.context().pages().length;
  const link = page.locator(selector).first();
  const doc = (await link.getAttribute("data-doc-url")) || "";
  await link.scrollIntoViewIfNeeded().catch(() => {});
  const clicked = await link.click({ timeout: 20000 }).then(() => true, (e) => e.message);
  const opened = await page.waitForSelector(".cxd.is-open", { timeout: 20000 }).then(() => true, () => false);
  const drawn = opened && await page.waitForSelector(".cxd.is-open .cxd-stage canvas", { timeout: 90000 }).then(() => true, () => false);
  const pageLabel = opened ? ((await page.textContent(".cxd-page").catch(() => "")) || "") : "";
  const statusText = opened ? ((await page.textContent(".cxd-status").catch(() => "")) || "") : "";
  if (!drawn && process.env.JOURNEY_SHOTS) await page.screenshot({ path: process.env.JOURNEY_SHOTS + "/" + label.split(" ")[0] + ".png" }).catch(() => {});
  check(label, drawn && expectLabel.test(pageLabel) && page.context().pages().length === tabs && !/Authentication required/i.test(statusText),
    "doc=" + redact(doc) + " click=" + clicked + " " + pageLabel + (statusText ? " status=" + statusText : ""));
}
async function closedByBack(page) {
  await page.goBack();
  return page.waitForFunction(() => !document.querySelector(".cxd.is-open"), null, { timeout: 10000 }).then(() => true, () => false);
}
// Inside the homepage overlay the same citation goes to the shell's own document view.
async function shellDocument(home) {
  const opened = await home.waitForSelector("#wa-overlay.is-open .wa-pdf", { timeout: 20000 }).then(() => true, () => false);
  const drawn = opened && await home.waitForSelector("#wa-overlay .wa-pdf-canvas", { timeout: 90000 }).then(() => true, () => false);
  const label = opened ? ((await home.textContent("#wa-overlay .wa-pdf-page").catch(() => "")) || "") : "";
  const status = opened ? ((await home.textContent("#wa-overlay .wa-pdf-status").catch(() => "")) || "") : "";
  const title = opened ? ((await home.textContent("#wa-overlay .wa-title").catch(() => "")) || "") : "";
  return { drawn, label, status, title, detail: title + " | " + label + (status ? " | " + status : "") };
}
const citedPage = (doc) => { const m = /#page=(\d+)/.exec(doc || ""); return new RegExp("^Page " + (m ? m[1] : "1") + " of \\d+$"); };

// The homepage opens citations in place (2026-10-07, index.html 1d4efa4): the shell's document view
// draws the cited page with pdf.js. The page must be drawn, never an auth error, then the view closes.
async function openCitationInPlace(page, selector, label) {
  const link = page.locator(selector).first();
  const href = await link.getAttribute("href");
  const path = href.split("#")[0].split("?")[0];
  const respP = page.waitForResponse((r) => r.url().includes(path), { timeout: 60000 }).catch(() => null);
  const clicked = await link.click({ timeout: 20000 }).then(() => true, (e) => e.message);
  const opened = await page.waitForSelector("#wa-overlay.is-open .wa-pdf", { timeout: 20000 }).then(() => true, () => false);
  const drawn = opened && await page.waitForSelector("#wa-overlay .wa-pdf-canvas", { timeout: 90000 }).then(() => true, () => false);
  const statusText = opened ? ((await page.textContent("#wa-overlay .wa-pdf-status").catch(() => "")) || "") : "";
  const pageLabel = opened ? ((await page.textContent("#wa-overlay .wa-pdf-page").catch(() => "")) || "") : "";
  const resp = await respP;
  if (!drawn && process.env.JOURNEY_SHOTS) await page.screenshot({ path: process.env.JOURNEY_SHOTS + "/" + label.split(" ")[0] + ".png" }).catch(() => {});
  check(label, drawn && !/Authentication required|needs a session/i.test(statusText), "href=" + redact(href) + " click=" + clicked + " " + pageLabel + " response=" + (resp ? resp.status() + " " + (resp.headers()["content-type"] || "") : "n/a") + (statusText ? " status=" + statusText : ""));
  if (opened) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForFunction(() => !document.querySelector("#wa-overlay.is-open"), null, { timeout: 10000 }).catch(() => {});
  }
}

const browser = await chromium.launch({ args: ["--use-angle=metal"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  await ctx.route("**/api/demo/weyland-building/session**", (route) => route.abort());

  // ---- A. /cutsheetx standalone ----
  const cx = await ctx.newPage();
  await cx.goto(BASE + "/cutsheetx", { waitUntil: "domcontentloaded" });
  await cx.waitForFunction(() => /Trial session active/.test(document.getElementById("status-line").textContent), null, { timeout: 30000 });
  await cx.waitForFunction(() => /catalogued products from/.test(document.getElementById("cov-line").textContent), null, { timeout: 20000 }).catch(() => {});
  check("A1 /cutsheetx shows live catalogue counts", /^[\d,]+ catalogued products from [\d,]+ manufacturers/.test(await cx.textContent("#cov-line")), await cx.textContent("#cov-line"));
  async function match(mfr, model) {
    await cx.fill("#match-mfr", mfr); await cx.fill("#match-model", model);
    await cx.click("#match-btn");
    await cx.waitForFunction(() => !/Matching against/.test(document.getElementById("match-results").textContent), null, { timeout: 30000 });
    return cx.textContent("#match-results");
  }
  let t = await match("Schlage", "L9080");
  check("A2 MATCH Schlage L9080: matched, cited by Schlage L Series Catalog p. 25", /Matched product: SCHLAGE L9080/.test(t) && /Schlage L Series Catalog/.test(t) && /p\. 25/.test(t) && !/No match found/.test(t), t);
  check("A3 its citation is a signed link", /[?&]cite=/.test(await cx.getAttribute("#match-results a.link-btn", "href") || ""), redact(await cx.getAttribute("#match-results a.link-btn", "href")));
  await openInPage(cx, "#match-results a.link-btn", "A4 OPEN PAGE draws the catalogue page in the page (no new tab)", /^Page 1 of 1$/);
  check("A4b Back closes the document; the match is still shown", await closedByBack(cx) && /Matched product: SCHLAGE L9080/.test(await cx.textContent("#match-results")), cx.url());
  t = await match("", "Schlage L9080");
  check("A5 MATCH with the whole line in the model field gives the same answer", /Matched product: SCHLAGE L9080/.test(t), t.slice(0, 120));
  t = await match("LCN", "4040XP");
  check("A6 MATCH LCN 4040XP: matched with its price-book pages", /Matched product: LCN 4040XP/.test(t) && /LCN Price Book, pp\. \d+-\d+/.test(t), t.slice(0, 200));
  await openInPage(cx, "#match-results a.link-btn", "A7 OPEN AT THE PAGE draws the price book at the cited page (no new tab)", citedPage(await cx.getAttribute("#match-results a.link-btn", "data-doc-url")));
  await cx.keyboard.press("Escape");
  await cx.waitForFunction(() => !document.querySelector(".cxd.is-open"), null, { timeout: 10000 }).catch(() => {});
  const tabsA = ctx.pages().length;
  const dlP = cx.waitForEvent("download", { timeout: 180000 }).catch(() => null);
  await cx.click("#match-results [data-doc-download]");
  const dl = await dlP;
  check("A7b DOWNLOAD PDF saves the price book (no new tab)", !!dl && /\.pdf$/.test(dl.suggestedFilename()) && ctx.pages().length === tabsA, dl ? dl.suggestedFilename() : "no download");
  await cx.fill("#search-q", "closer"); await cx.click("#search-btn");
  await cx.waitForFunction(() => /result\(s\)|No matches|HTTP/.test(document.getElementById("search-results").textContent), null, { timeout: 30000 });
  t = await cx.textContent("#search-results");
  check("A8 SEARCH 'closer' returns catalogue pages", /\d+ result\(s\)/.test(t), t.slice(0, 80));
  await cx.close();

  // ---- B. the single-page shell ----
  const home = await ctx.newPage();
  await home.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await home.waitForFunction(() => !!window.WeylandShell, null, { timeout: 30000 });
  await home.evaluate(() => { window.__journeyMarker = "kept"; });
  const sameHome = () => home.evaluate(() => window.__journeyMarker === "kept").catch(() => false);
  await home.evaluate(() => window.WeylandShell.open("app", { path: "/cutsheetx" }));
  let frame = await (await home.waitForSelector("#wa-overlay iframe", { timeout: 15000 })).contentFrame();
  await frame.waitForSelector("#match-btn", { timeout: 20000 });
  check("B1 CutsheetX opens in the overlay at /cutsheetx?embed=1 (not /pricing)", /\/cutsheetx\?embed=1$/.test(frame.url()) && /CutSheetX/.test(await frame.title()), frame.url());
  await frame.waitForFunction(() => /Trial session active/.test(document.getElementById("status-line").textContent), null, { timeout: 30000 });
  await frame.fill("#match-mfr", "Schlage"); await frame.fill("#match-model", "L9080");
  await frame.click("#match-btn");
  await frame.waitForFunction(() => !/Matching against/.test(document.getElementById("match-results").textContent), null, { timeout: 30000 });
  const tabsB = ctx.pages().length;
  await frame.click("#match-results [data-doc-url]");
  let sd = await shellDocument(home);
  check("B1b in the overlay a CutsheetX citation opens in the shell's document view (no new tab)", sd.drawn && /Schlage L Series Catalog, p\. 25/.test(sd.title) && /^Page 1 of 1$/.test(sd.label) && ctx.pages().length === tabsB && await sameHome(), sd.detail);
  await home.goBack();
  frame = await (await home.waitForSelector("#wa-overlay iframe[src^='/cutsheetx']", { timeout: 15000 })).contentFrame();
  const restored = await frame.waitForFunction(() => /Matched product: SCHLAGE L9080/.test(document.getElementById("match-results").textContent), null, { timeout: 30000 }).then(() => true, () => false);
  check("B1c the shell's Back brings CutsheetX back with the same match", restored && (await frame.inputValue("#match-model")) === "L9080" && await sameHome(), frame.url());
  await frame.click("nav.nav a[href='/']");
  await home.waitForFunction(() => !document.querySelector("#wa-overlay.is-open"), null, { timeout: 10000 });
  check("B2 its HOME link closes the overlay on the same homepage", new URL(home.url()).pathname === "/" && await sameHome(), home.url());
  await home.evaluate(() => window.WeylandShell.open("app", { path: "/find" }));
  frame = await (await home.waitForSelector("#wa-overlay iframe[src^='/find']", { timeout: 15000 })).contentFrame();
  await frame.waitForSelector("input[name=q]", { timeout: 20000 });
  await frame.evaluate(() => { window.__finderMarker = "kept"; });
  const histBefore = await home.evaluate(() => history.length);
  await frame.fill("input[name=q]", "LCN 4040XP");
  await frame.press("input[name=q]", "Enter");
  await frame.waitForSelector("ul.results li a", { timeout: 20000 });
  await frame.click("ul.results li a");
  await frame.waitForFunction(() => /^\/find\/[^/]+\/[^/]+$/.test(location.pathname) && !!document.querySelector("main h2"), null, { timeout: 20000 });
  check("B3 finder in the overlay: search and result link in place", await frame.evaluate(() => window.__finderMarker === "kept"), frame.url());
  check("B4 finder in the overlay adds no history entries", (await home.evaluate(() => history.length)) === histBefore, "");
  const productPath = await frame.evaluate(() => location.pathname);
  const finderDoc = await frame.getAttribute("main .cite a[data-doc-url]", "data-doc-url").catch(() => null);
  await frame.click("main .cite a[data-doc-url]");
  sd = await shellDocument(home);
  check("B4b the finder's 'open' in the overlay opens in the shell's document view at the cited page", !!finderDoc && sd.drawn && citedPage(finderDoc).test(sd.label) && ctx.pages().length === tabsB, redact(finderDoc) + " " + sd.detail);
  await home.goBack();
  frame = await (await home.waitForSelector("#wa-overlay iframe[src^='/find']", { timeout: 15000 })).contentFrame();
  const onProduct = await frame.waitForFunction((p) => location.pathname === p && !!document.querySelector("main .cite"), productPath, { timeout: 20000 }).then(() => true, () => false);
  check("B4c the shell's Back returns to the finder's product page", onProduct && await sameHome(), frame.url());
  await home.goBack();
  await home.waitForFunction(() => !document.querySelector("#wa-overlay.is-open"), null, { timeout: 10000 });
  check("B5 browser Back closes the overlay on the same homepage", new URL(home.url()).pathname === "/" && await sameHome(), home.url());

  // ---- C. homepage paste and hero cards ----
  // Raise the dossier only if it is lowered over the 3D corridor (Enter raises it); never press
  // Enter on whatever control kept focus after the overlay closed.
  await home.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  if (await home.evaluate(() => document.documentElement.classList.contains("folder-lowered"))) await home.keyboard.press("Enter");
  await home.locator("#hs-text").scrollIntoViewIfNeeded();
  await home.fill("#hs-text", "LCN 4040XP\nVon Duprin 99\nSchlage L9080");
  await home.click("#hs-run");
  await home.waitForFunction(() => /lines matched/.test(document.getElementById("hs-results").textContent), null, { timeout: 60000 });
  const summary = ((await home.textContent("#hs-results")).match(/\d+ of \d+ lines matched/) || [""])[0];
  check("C1 paste: 3 of 3 lines matched", summary === "3 of 3 lines matched", summary);
  await openCitationInPlace(home, "#hs-results a[href*='/api/cps/catalogues/']", "C2 paste: catalogue-page citation opens in place for a guest");
  await openCitationInPlace(home, "#hs-results a[href*='/api/cut-sheets/sheet/']", "C3 paste: price-book citation opens in place for a guest");
  await home.locator("#cx-live-cards").scrollIntoViewIfNeeded();
  await home.waitForFunction(() => document.querySelectorAll("#cx-live-cards a[href*='/api/']").length >= 2, null, { timeout: 60000 });
  await openCitationInPlace(home, "#cx-live-cards a[href*='/api/cps/catalogues/']", "C4 hero card: catalogue-page citation opens in place for a guest");
  await openCitationInPlace(home, "#cx-live-cards a[href*='/api/cut-sheets/sheet/']", "C5 hero card: price-book citation opens in place for a guest");
  // TRY A REAL MATCH (the homepage's single-line form) runs POST /api/cut-sheets/match: one answer.
  await home.locator("#cx-mfr").scrollIntoViewIfNeeded();
  await home.fill("#cx-mfr", "Schlage"); await home.fill("#cx-model", "L9080");
  await home.click("#cx-match-btn");
  await home.waitForFunction(() => !/Matching against/.test(document.getElementById("cx-match-results").textContent), null, { timeout: 30000 });
  const tryText = await home.textContent("#cx-match-results");
  check("C6 TRY A REAL MATCH Schlage L9080: matched, cited by its catalogue page (same answer as the paste)", /Matched: SCHLAGE L9080/.test(tryText) && /Schlage L Series Catalog, p\. 25/.test(tryText) && !/No match found/.test(tryText), tryText.slice(0, 200));
  await openCitationInPlace(home, "#cx-match-results a[href*='/api/cps/catalogues/']", "C7 TRY A REAL MATCH citation opens in place for a guest");
  await home.close();

  // ---- D. standalone finder ----
  const fp = await ctx.newPage();
  await fp.goto(BASE + "/find", { waitUntil: "load" });
  await fp.evaluate(() => { window.__finderMarker = "kept"; });
  const sameFinder = () => fp.evaluate(() => window.__finderMarker === "kept").catch(() => false);
  check("D1 finder lead states live counts", /^[\d,]+ catalogued products from [\d,]+ manufacturers/.test(await fp.textContent("p.lead")), await fp.textContent("p.lead"));
  await fp.fill("input[name=q]", "LCN 4040XP");
  await fp.press("input[name=q]", "Enter");
  await fp.waitForSelector("ul.results li a", { timeout: 20000 });
  check("D2 search in place at /find?q=LCN+4040XP", await sameFinder() && new URL(fp.url()).searchParams.get("q") === "LCN 4040XP", fp.url());
  const href = await fp.getAttribute("ul.results li a", "href");
  await fp.click("ul.results li a");
  await fp.waitForFunction((h) => location.pathname === h && !!document.querySelector("main h2"), href, { timeout: 20000 });
  check("D3 result link opens the product page in place", await sameFinder(), fp.url());
  await fp.goBack();
  await fp.waitForSelector("ul.results li a", { timeout: 20000 });
  check("D4 Back returns to the results in place", await sameFinder() && /q=LCN/.test(fp.url()), fp.url());
  await fp.goForward();
  await fp.waitForFunction((h) => location.pathname === h && !!document.querySelector("main h2"), href, { timeout: 20000 });
  await fp.reload({ waitUntil: "load" });
  check("D5 reload serves the product page from the server", /4040XP/.test(await fp.textContent("main h1")), fp.url());
  await fp.evaluate(() => { window.__finderMarker = "kept"; });
  const productDoc = await fp.getAttribute("main .cite a[data-doc-url]", "data-doc-url").catch(() => null);
  await openInPage(fp, "main .cite a[data-doc-url]", "D6 the product page's 'open' draws the document in the page at the cited page (no new tab)", citedPage(productDoc));
  const saveControl = await fp.isVisible(".cxd .cxd-save").catch(() => false);
  check("D7 the document has a Download control; Back closes it on the same page", saveControl && await closedByBack(fp) && await sameFinder() && new URL(fp.url()).pathname === href, fp.url());
} catch (e) {
  check("journey completed", false, e.message);
} finally {
  await browser.close();
}
const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
process.exit(failed.length ? 1 : 0);
