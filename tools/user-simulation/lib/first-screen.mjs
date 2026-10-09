// Shared first-screen contract: measure the rendered viewport, not just DOM visibility.
export async function checkFirstScreen(J, page, kind) {
  const first = await page.evaluate(() => {
    const hero = document.getElementById("hero");
    const frame = document.querySelector(".envelope-frame");
    const header = document.getElementById("top-nav").getBoundingClientRect();
    const footer = document.querySelector(".wn-persistent-footer").getBoundingClientRect();
    const usableBottom = Math.min(innerHeight, footer.top, frame.getBoundingClientRect().bottom);
    const visible = (el) => el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    const fits = (el) => {
      if (!visible(el)) return false;
      const r = el.getBoundingClientRect();
      return r.top >= header.bottom - 1 && r.bottom <= usableBottom + 1 && r.left >= 0 && r.right <= innerWidth;
    };
    const actions = [...hero.querySelectorAll("a, button")].filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { id: el.id, text: el.textContent.trim(), href: el.getAttribute("href"), fits: fits(el), reachable: hit === el || el.contains(hit) };
    });
    const rail = document.querySelector("#tools .wn-blade");
    const paragraphs = [...hero.querySelectorAll("p")].filter(visible).map((p) => ({
      text: p.textContent.trim(), fits: fits(p), lines: p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)
    }));
    return {
      headline: hero.querySelector("h1").textContent.trim(), headlineFits: fits(hero.querySelector("h1")),
      kicker: hero.querySelector(".hero-kicker").textContent.trim(),
      lowered: document.documentElement.classList.contains("folder-lowered"),
      scrollTop: frame.scrollTop, width: innerWidth, height: innerHeight, actions, paragraphs,
      railBelow: !!rail && rail.getBoundingClientRect().top >= innerHeight,
      railCount: rail ? rail.querySelectorAll("a[data-target]").length : 0,
      headerProducts: document.querySelectorAll("#top-nav .wn-blade a").length,
      footerReserved: frame.getBoundingClientRect().bottom <= footer.top + 1,
      heroFits: hero.getBoundingClientRect().bottom <= usableBottom + 1,
      order: [...document.querySelectorAll("main.shell > section")].map((s) => s.id)
    };
  });
  J.note(kind + "_first_screen_text", [first.kicker, first.headline, ...first.paragraphs.map((p) => p.text), ...first.actions.map((a) => a.text)]);
  J.check(kind + ": the $100 packet offer is visible without scrolling", first.headline === "Door schedule in. Submittal packet out. $100." && first.headlineFits && first.heroFits && !first.lowered && first.scrollTop === 0, first);
  J.check(kind + ": one upload action and one sample action fit above the footer and can be clicked", first.actions.length === 2 && first.actions[0].id === "hs-upload" && first.actions[0].href === "/subx-app" && first.actions[0].text === "UPLOAD YOUR SCHEDULE PDF" && first.actions[1].id === "hero-sample" && first.actions[1].text === "SEE A SAMPLE PACKET" && first.actions.every((a) => a.fits && a.reachable) && first.footerReserved, first.actions);
  J.check(kind + ": eight product tabs live below the first screen in tools", first.railBelow && first.railCount === 8 && first.headerProducts === 0, { count: first.railCount, below: first.railBelow, header: first.headerProducts });
  J.check(kind + ": proof and pricing precede the other tools", first.order.join(",") === "hero,subx,sightx,pricing,tools,cutsheetx,builtwith,propx,huntx,takeoffx,wire,whyweyland", first.order);
  if (first.width < 900) {
    J.check(kind + ": phone paragraphs fit and take at most two lines", first.paragraphs.length === 3 && first.paragraphs.every((p) => p.fits && p.lines <= 2.05), first.paragraphs);
  }
  return first;
}
