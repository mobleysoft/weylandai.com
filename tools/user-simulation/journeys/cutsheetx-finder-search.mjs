// tools/user-simulation/journeys/cutsheetx-finder-search.mjs
//
// Journey map id "cutsheetx-finder-search" (priority 2): a guest searches the catalogue from the
// homepage: the Finder and the CutsheetX app inside the overlay, and the CutsheetX chapter's
// TRY A REAL MATCH.
// Expected: results with products, the matched cut sheet with its citation, and the cited PDF page
// opening; the same answer for the same model on every surface (the paste matches Schlage L9080,
// so MATCH must too); everything in place: the finder's search and result links swap the page's
// main content (no document load, 2026-10-07), documents open without a new tab.
// No account. Demo clones the page creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/cutsheetx-finder-search.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, openApp, frameInfo, documentOutcome, closeOverlay, citedPage } from "../lib/journey-kit.mjs";

const J = new Journey("cutsheetx-finder-search", "CutsheetX and Finder search");

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // Finder in the overlay: search, product page, open the cited document. Since 2026-10-07 the
  // finder answers in place (it swaps its <main>, no document load), so a mark set on the frame's
  // window must survive the search and the result link.
  const finder = await openApp(page, "/find");
  const fi = await frameInfo(finder);
  J.check("the Finder opens in the overlay", !!fi && fi.path === "/find" && !fi.jsonError, fi ? { path: fi.path, title: fi.title } : "no frame");
  if (finder) {
    const fmark = await finder.evaluate(() => (window.__wajFinderMark = "f-" + Math.random().toString(36).slice(2)));
    const finderInPlace = async () => {
      const s = await finder.evaluate(() => ({ mark: window.__wajFinderMark || null, url: location.pathname + location.search })).catch(() => ({ mark: null, url: null }));
      return { sameDocument: s.mark === fmark, url: s.url };
    };
    await finder.fill("input[name=q]", "LCN 4040XP");
    await finder.press("input[name=q]", "Enter");
    await until(() => finder.evaluate(() => /[?&]q=/.test(location.search) && !document.querySelector("main[aria-busy]") && document.querySelectorAll("main a[href^='/find/']").length > 0), 20000, 300);
    const hits = await finder.evaluate(() => Array.from(document.querySelectorAll("a[href^='/find/']")).map((a) => a.getAttribute("href"))).catch(() => []);
    J.check("Finder search 'LCN 4040XP' lists the product", hits.some((h) => /^\/find\/lcn\/4040XP$/i.test(h)), hits.slice(0, 6));
    const s1 = await finderInPlace();
    // Inside the overlay the frame keeps the ?embed=1 the shell opened it with (2026-10-07; the search
    // form used to drop it, so the frame ended up at the standalone address).
    J.check("the Finder search answers in place (same document, the address shows the query and keeps embed=1)", s1.sameDocument && /^\/find\?q=LCN(\+|%20)4040XP&embed=1$/i.test(s1.url || ""), s1);
    const link = finder.locator("a[href='/find/lcn/4040XP']").first();
    if (await link.count()) {
      await pressIn(finder, link);
      // Document links: a[data-doc] until edb2834, a[data-doc-url] (opened in place) since.
      const DOC = "a[data-doc], a[data-doc-url]";
      await until(() => finder.evaluate((sel) => /^\/find\/lcn\/4040XP$/i.test(location.pathname) && !document.querySelector("main[aria-busy]") && document.querySelectorAll(sel).length > 0, DOC), 20000, 300);
      const s2 = await finderInPlace();
      J.check("the product link opens the product page in place (same document, embed=1 kept)", s2.sameDocument && /^\/find\/lcn\/4040XP\?embed=1$/i.test(s2.url || ""), s2);
      const text = await finder.evaluate(() => (document.querySelector("main") || document.body).innerText).catch(() => "");
      J.check("the product page lists documents on file with page citations", /pp?\.\s*\d+/i.test(text) && (await finder.locator(DOC).count()) > 0, text.replace(/\s+/g, " ").slice(0, 300));
      const open = finder.locator(DOC).first();
      if (await open.count()) {
        const ref = { since: Date.now(), apiRe: /\/api\/(cut-sheets\/sheet\/[^/]+\/pdf|cps\/catalogues\/[^/]+\/pages\/\d+\/render)$/, popupsBefore: page.__popups.length, downloadsBefore: page.__downloads.length };
        await pressIn(finder, open);
        const o = await documentOutcome(J, page, ref);
        J.check("the product page's 'open' shows the cited PDF", o.ok && !o.refused && (o.newTab || o.downloads.length > 0 || o.pdf.drawn || o.inPage.viewers > 0), o);
        J.check("the product page's 'open' shows it in place (no new tab)", o.ok && !o.refused && !o.newTab && (o.pdf.drawn || o.inPage.viewers > 0), { newTab: o.newTab, pdf: o.pdf, inPage: o.inPage });
      }
    }
  }
  await page.evaluate(() => window.WeylandShell.close());

  // CutsheetX app in the overlay (fall back to the standalone page so its functions are still measured).
  const app = await openApp(page, "/cutsheetx");
  const ai = await frameInfo(app);
  const isApp = !!ai && /^\/cutsheetx\/?$/.test(ai.path || "") && ai.ids.includes("match-btn");
  J.check("CutsheetX opens in the overlay as the CutsheetX app (not pricing)", isApp, ai ? { path: ai.path, title: ai.title, jsonError: ai.jsonError } : "no frame");
  let surface = app, where = "overlay", standalone = null;
  if (!isApp) {
    await page.evaluate(() => window.WeylandShell.close());
    standalone = await J.page(ctx);
    await standalone.goto(BASE + "/cutsheetx", { waitUntil: "load" });
    surface = standalone; where = "standalone";
  }
  J.note("cutsheetx_surface", where);
  const match = async (mfr, model) => {
    await surface.fill("#match-mfr", mfr);
    await surface.fill("#match-model", model);
    await pressIn(surface, "#match-btn");
    return (await waitText(surface, "#match-results", /Matched product|No match|HTTP|failed|error/i, 30000, /^Matching against/i)) || "";
  };
  const host = where === "overlay" ? page : standalone;
  const DOC_API = /\/api\/(cut-sheets\/(download\/[^/]+|sheet\/[^/]+\/pdf)|cps\/catalogues\/[^/]+\/pages\/\d+\/render)$/;
  // A document opened from the app: drawn in place at the cited page. In the overlay the shell's
  // document view takes the app's place; closing it closes the overlay, so the app is reopened.
  const openInPlace = async (label, locator) => {
    const want = citedPage(await locator.getAttribute("data-doc-url").catch(() => null));
    const ref = { since: Date.now(), apiRe: DOC_API, popupsBefore: host.__popups.length, downloadsBefore: host.__downloads.length };
    await pressIn(surface, locator);
    const o = await documentOutcome(J, host, ref);
    J.check(label + " (" + where + ")", o.ok && !o.refused && !o.newTab && (o.pdf.drawn ? o.pdf.page === want : o.inPage.viewers > 0), { want, newTab: o.newTab, api: o.api, pdf: o.pdf, inPage: o.inPage });
    if (o.pdf.open) {
      await closeOverlay(host, "escape");
      if (where === "overlay") surface = await openApp(page, "/cutsheetx");
    }
    return o;
  };
  let m1 = await match("LCN", "4040XP");
  J.check("CutsheetX MATCH 'LCN 4040XP' returns the matched cut sheet (" + where + ")", /Matched product/i.test(m1) && /DOWNLOAD PDF/i.test(m1), m1.replace(/\s+/g, " ").slice(0, 200));
  const openAt = surface.locator("#match-results [data-doc-url]").first();
  if (await openAt.count()) {
    await openInPlace("CutsheetX OPEN AT THE PAGE draws the cited page in place (no new tab)", openAt);
    m1 = await match("LCN", "4040XP"); // the app may have been reopened
  }
  // DOWNLOAD PDF saves the file (data-doc-download since 2026-10-07; data-doc before).
  const dl = surface.locator("#match-results [data-doc-download], #match-results button[data-doc]").first();
  if (await dl.count()) {
    const ref = { since: Date.now(), apiRe: DOC_API, popupsBefore: host.__popups.length, downloadsBefore: host.__downloads.length };
    await pressIn(surface, dl);
    const o = await documentOutcome(J, host, ref);
    J.check("CutsheetX DOWNLOAD PDF delivers the cut sheet (" + where + ")", o.ok && !o.refused && (o.newTab || o.downloads.length > 0 || o.pdf.drawn || o.inPage.viewers > 0), o);
    J.check("CutsheetX DOWNLOAD PDF saves the file without a new tab (" + where + ")", o.ok && !o.refused && !o.newTab && (o.downloads.length > 0 || o.pdf.drawn), { newTab: o.newTab, downloads: o.downloads, pdf: o.pdf });
    if (o.pdf.open) {
      await closeOverlay(host, "escape");
      if (where === "overlay") surface = await openApp(page, "/cutsheetx");
    }
  } else {
    J.check("CutsheetX DOWNLOAD PDF delivers the cut sheet (" + where + ")", false, "no DOWNLOAD PDF control in the MATCH result");
  }
  await surface.fill("#search-q", "closer");
  await pressIn(surface, "#search-btn");
  const sr = (await waitText(surface, "#search-results", /result\(s\)|No match|no results|HTTP|failed|error/i, 40000, /^Searching/i)) || "";
  const count = Number((sr.match(/(\d+)\s+result\(s\)/i) || [])[1] || 0);
  J.check("CutsheetX SEARCH 'closer' returns results (" + where + ")", count > 0, sr.split("\n")[0]);
  const view = surface.locator("#search-results [data-doc-url]").first();
  if (count > 0 && (await view.count())) await openInPlace("CutsheetX SEARCH result VIEW PAGE draws the page in place (no new tab)", view);
  await surface.fill("#local-mfr", "lcn");
  await surface.fill("#local-model", "4040XP");
  await pressIn(surface, "#local-btn");
  const lr = (await waitText(surface, "#local-results", /CONFIDENCE|No local reference|HTTP|failed|error/i, 30000, /^Checking/i)) || "";
  J.check("CutsheetX LOCAL LOOKUP 'lcn 4040XP' finds the series (" + where + ")", /CONFIDENCE/i.test(lr), lr.replace(/\s+/g, " ").slice(0, 160));
  const m2 = await match("Schlage", "L9080");
  J.check("CutsheetX MATCH 'Schlage L9080' matches, as the paste does (" + where + ")", /Matched product/i.test(m2), m2.replace(/\s+/g, " ").slice(0, 200));
  if (standalone) await standalone.close();
  await page.evaluate(() => window.WeylandShell.close());

  // The homepage CutsheetX chapter: TRY A REAL MATCH.
  await page.evaluate(() => { const s = document.getElementById("cutsheetx"); if (s) s.scrollIntoView({ block: "center" }); });
  await page.fill("#cx-mfr", "Schlage");
  await page.fill("#cx-model", "L9080");
  await press(page, "#cx-match-btn");
  const cx = (await waitText(page, "#cx-match-results", /Matched|No match|include|failed|error/i, 30000, /^Matching against/i)) || "";
  J.check("the CutsheetX chapter's TRY A REAL MATCH matches 'Schlage L9080', as the paste does", /^Matched/i.test(cx), cx.split("\n")[0]);
  const cite = page.locator("#cx-match-results a[href*='/api/cps/catalogues/'], #cx-match-results a[href*='/api/cut-sheets/sheet/']").first();
  if (await cite.count()) {
    const want = citedPage(await cite.getAttribute("href"));
    const ref = { since: Date.now(), apiRe: /\/api\/(cut-sheets\/sheet\/[^/]+\/pdf|cps\/catalogues\/[^/]+\/pages\/\d+\/render)$/, popupsBefore: page.__popups.length, downloadsBefore: page.__downloads.length };
    await press(page, cite);
    const o = await documentOutcome(J, page, ref);
    J.check("the TRY A REAL MATCH citation is drawn in place at the cited page (no new tab)", o.ok && !o.refused && !o.newTab && o.pdf.drawn && o.pdf.page === want, { want, newTab: o.newTab, api: o.api, pdf: o.pdf });
    if (o.pdf.open) await closeOverlay(page, "escape");
  } else {
    J.check("the TRY A REAL MATCH citation is drawn in place at the cited page (no new tab)", false, "no citation link in the TRY A REAL MATCH result: " + cx.replace(/\s+/g, " ").slice(0, 160));
  }
  await page.fill("#cx-mfr", "LCN");
  await page.fill("#cx-model", "4040XP");
  await press(page, "#cx-match-btn");
  const cx2 = (await waitText(page, "#cx-match-results", /Matched|No match|include|failed|error/i, 30000, /^Matching against/i)) || "";
  J.check("the CutsheetX chapter's TRY A REAL MATCH matches 'LCN 4040XP'", /^Matched/i.test(cx2), cx2.split("\n")[0]);

  await J.checkInPlace(page, mark);
  await ctx.close();
});
