// tools/user-simulation/journeys/first-result-no-account.mjs
//
// Journey map id "first-result-no-account" (priority 1): a cold, signed-out visitor gets a first
// cited result on the homepage, on desktop (1280x860) and on a phone (390x844, touch).
// Expected: "N of N lines matched" with each line's matched catalogue product, a confidence and a
// citation that opens the cited page; the hero note reads "Live result just now, N ms round trip";
// everything happens in the homepage (no page hop, no new tab for our own documents): since
// 2026-10-07 a citation is drawn by the shell's document view (pdf.js) at the cited page, and
// closing it returns to the same address.
// No account. Demo clones the page creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/first-result-no-account.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, waitText, pasteSchedule, documentOutcome, closeOverlay, citedPage, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("first-result-no-account", "First visit to a first cited result, no account");

await J.run(async () => {
  await J.launch();
  for (const kind of ["desktop", "phone"]) {
    const touch = kind === "phone";
    const ctx = await J.context(kind);
    const page = await J.page(ctx);
    const tLoad = Date.now();
    await openHome(page, J, kind);
    const mark = await setMark(page);
    const first = await page.evaluate(() => {
      const h = document.querySelector("#hero h1");
      const r = h ? h.getBoundingClientRect() : null;
      return { lowered: document.documentElement.classList.contains("folder-lowered"), heroInView: !!r && r.width > 0 && r.top >= 0 && r.top < innerHeight };
    });
    J.note(kind + "_first_view", { ...first, secondsAfterLoad: Math.round((Date.now() - tLoad) / 100) / 10 });
    if (kind === "phone") J.check("phone: the hero is in view at first load (no lowered dossier)", first.heroInView && !first.lowered, first);
    const raised = await raiseDossier(page, { touch });
    J.check(kind + ": the hero is readable after raising the dossier", raised === "raised", raised);

    // Hero: ONE REAL MATCH, RUN IT LIVE
    await press(page, "#hm-run", { touch });
    const hm = await waitText(page, "#hm-note", /Live result|Matcher returned|failed|no match/i, 30000, /^Running against/i);
    J.check(kind + ": hero RUN IT LIVE shows a live result", /Live result just now, \d+ ms round trip/i.test(hm || ""), hm);

    // Paste a schedule
    const r = await pasteSchedule(page, SAMPLE_LINES, { touch });
    const n = SAMPLE_LINES.length;
    J.check(kind + ": paste matches every line (" + n + " of " + n + ")", r.matched === n && r.total === n, r.first);
    const complete = r.rows.length === n && r.rows.every((x) => x.product.trim() && !/no match/i.test(x.product) && x.confidence.trim() && x.citation.trim() && x.citation.trim() !== "—");
    J.check(kind + ": every line shows its product, a confidence and a citation", complete, r.rows.map((x) => [x.spec, x.product, x.confidence, x.citation].join(" | ")).join(" ;; ") || r.first);
    J.check(kind + ": the paste answers within 10 s", r.seconds <= 10, r.seconds + " s");

    // Open the price-book citation, then the catalogue-page citation (the page reads each with the
    // guest token). Each must open the cited document, drawn inside the page at the cited page (the
    // shell's document view, no new tab), and closing it must bring back the same homepage address.
    const CITATIONS = [
      ["price-book", "#hs-results a[href*='/api/cut-sheets/sheet/']", /\/api\/cut-sheets\/sheet\/[^/]+\/pdf$/],
      ["catalogue-page", "#hs-results a[href*='/api/cps/catalogues/']", /\/api\/cps\/catalogues\/[^/]+\/pages\/\d+\/render$/]
    ];
    for (const [label, selector, apiRe] of CITATIONS) {
      const link = page.locator(selector).first();
      if (!(await link.count())) {
        J.check(kind + ": the " + label + " citation opens the cited document", false, "no " + label + " citation link in the result: " + r.rows.map((x) => x.citation).join(" ;; "));
        continue;
      }
      const want = citedPage(await link.getAttribute("href"));
      const addressBefore = await page.evaluate(() => location.pathname + location.search + location.hash);
      const ref = { since: Date.now(), apiRe, popupsBefore: page.__popups.length, downloadsBefore: page.__downloads.length };
      await press(page, link, { touch });
      const o = await documentOutcome(J, page, ref);
      J.check(kind + ": the " + label + " citation opens the cited document", o.ok && !o.refused && (o.newTab || o.downloads.length > 0 || o.pdf.drawn || o.inPage.viewers > 0), o);
      J.check(kind + ": the " + label + " citation is drawn in place at the cited page (no new tab)", o.ok && !o.refused && !o.newTab && o.pdf.drawn && o.pdf.page === want,
        { want, newTab: o.newTab, pdf: o.pdf });
      if (o.pdf.open) {
        const after = await closeOverlay(page, touch ? "close" : "escape", { touch });
        J.check(kind + ": closing the " + label + " document returns to the same homepage address", !after.overlayOpen && after.url === addressBefore, { ...after, before: addressBefore });
      }
    }

    await J.checkInPlace(page, mark, kind + ": stayed in place: same document, still on weylandai.com");
    await ctx.close();
  }
});
