// tools/user-simulation/journeys/create-free-account.mjs
//
// Journey map id "create-free-account" (priority 1): a guest who already pasted lines creates a
// free account from the homepage.
// Expected: after CREATE FREE ACCOUNT the visitor is signed in to a WeylandAI account (the account
// control shows them; a users row on the 14-day trial), and everything they could do as a guest
// keeps working; all in place. The dossier: since 2026-10-07 (a0673ab) the dialog says what really
// happens to the pasted matches - they stay on this page and in this browser (localStorage), they
// are not copied to the account - so the test checks exactly that promise: the matches survive the
// sign-up and a reload in this browser, and the dialog does not claim "every device". A second
// browser signs in to the same account; what its dossier shows is recorded, not judged.
// The account is created through the page itself (user-sim-create-<run>@weylandai.com, password
// generated here and never printed). Rows for that email (users, weyland_sessions, nodes, ...) and
// every demo clone are deleted in finally; the AuthFor identity stays (cannot be deleted from here).
//
// Usage: node tools/user-simulation/journeys/create-free-account.mjs   (exit 0 = all passed)
import { Journey, d1, q, openHome, raiseDossier, setMark, press, until, sleep, shellState, signIn, pasteSchedule, serverSession, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("create-free-account", "Create a free account from a guest session");

// The create-account form, wherever the page puts it (homepage dialog or shell overlay): a visible
// email + password pair that is not the sign-in form. Marks the fields with data-waj-create.
async function markCreateForm(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const emails = Array.from(document.querySelectorAll("input[type=email], input[name=email], input[autocomplete=email]")).filter((el) => el.id !== "weyland-signin-email" && vis(el));
    for (const em of emails) {
      const form = em.closest("form") || em.parentElement;
      const pw = form && Array.from(form.querySelectorAll("input[type=password]")).find((x) => x.id !== "weyland-signin-password" && vis(x));
      if (!pw) continue;
      const name = Array.from(form.querySelectorAll("input[type=text], input[autocomplete=name]")).find(vis);
      const submit = Array.from(form.querySelectorAll("button, input[type=submit]")).find((b) => vis(b) && (b.type === "submit" || /create|sign up|start|continue/i.test(b.textContent || b.value || "")));
      em.dataset.wajCreate = "email"; pw.dataset.wajCreate = "password";
      if (name) name.dataset.wajCreate = "name";
      if (submit) submit.dataset.wajCreate = "submit";
      return { found: true, hasName: !!name, hasSubmit: !!submit, where: em.closest("#wa-overlay") ? "shell overlay" : em.closest("#upgrade-modal") ? "homepage dialog" : "page", submit: submit ? (submit.textContent || submit.value || "").trim() : "" };
    }
    return { found: false };
  });
}

async function openCreateForm(page) {
  await press(page, "#wa-account-chip");
  await page.waitForSelector("#wa-overlay.is-open", { timeout: 10000 }).catch(() => {});
  const link = page.locator("#wa-overlay.is-open button, #wa-overlay.is-open a").filter({ hasText: /create a free account/i }).first();
  if (!(await link.count())) return { found: false, why: "no 'Create a free account' control in the sign-in overlay" };
  await press(page, link);
  const form = await until(async () => { const f = await markCreateForm(page); return f.found ? f : null; }, 8000, 400);
  return form || { found: false, why: "pressing 'Create a free account' showed no create-account form", shell: await shellState(page) };
}

const dossierText = (page) => page.evaluate(() => ((document.getElementById("hs-dossier") || {}).innerText || "").trim());

await J.run(async () => {
  await J.launch();
  const acct = J.identity("create");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  const guest = await pasteSchedule(page, SAMPLE_LINES.slice(0, 2));
  J.check("as a guest, the paste matches the lines (2 of 2)", guest.matched === 2 && guest.total === 2, guest.first);

  const form = await openCreateForm(page);
  J.check("'Create a free account' opens a create-account form in the page", form.found, form);
  if (!form.found) throw new Error("no create-account form; cannot continue");
  // What the dialog promises about the pasted matches.
  const promise = await page.evaluate(() => ((document.querySelector("#upgrade-modal.is-open .upgrade-sub") || {}).innerText || "").replace(/\s+/g, " ").trim());
  J.note("dialog_promise", promise);
  J.check("the dialog names the pasted matches and says they stay in this browser (no 'every device' claim)",
    /holds\s+2\s+matched lines?/i.test(promise) && /in this browser/i.test(promise) && !/every device|all (of )?your devices|on every/i.test(promise), promise || "no dialog text");
  if (form.hasName) await page.fill("[data-waj-create=name]", "User Simulation (create account)");
  await page.fill("[data-waj-create=email]", acct.email);
  await page.fill("[data-waj-create=password]", acct.password);
  const t0 = Date.now();
  if (form.hasSubmit) await press(page, "[data-waj-create=submit]");
  else await page.press("[data-waj-create=password]", "Enter");
  await page.waitForFunction((em) => document.documentElement.dataset.weylandAuth === "signed-in" && document.documentElement.dataset.weylandUser === em, acct.email, { timeout: 45000 }).catch(() => {});
  await sleep(1500);
  const st = await shellState(page);
  const dialog = await page.evaluate(() => ((document.querySelector("#upgrade-modal .upgrade-dialog") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 200));
  J.note("after_create", { seconds: Math.round((Date.now() - t0) / 100) / 10, shell: st, homepageDialog: dialog });
  J.check("after CREATE FREE ACCOUNT the visitor is signed in to the new account", st.auth === "signed-in" && st.user === acct.email, { auth: st.auth, user: st.user, view: st.view, error: st.error, dialog });
  J.check("the account control shows the new account (not 'Sign in')", !!st.chip && !/^sign in$/i.test(st.chip) && !/finish setup/i.test(st.chip), st.chip);

  const sv = await serverSession(page);
  J.check("the server knows the new account (/api/auth/me and a valid session cookie)", sv.me === 200 && sv.email === acct.email && sv.valid, sv);
  const [row] = await d1("SELECT subscription_tier, subscription_status, products_enabled, substr(trial_ends_at,1,10) AS trial_ends, CAST(julianday(trial_ends_at) - julianday('now') AS INTEGER) AS trial_days_left FROM users WHERE lower(email) = " + q(acct.email) + ";");
  const user = (row.results || [])[0] || null;
  J.note("users_row", user);
  J.check("a WeylandAI account row exists for the new email", !!user, user || "no users row");
  J.check("the new account is on the 14-day free trial with the whole suite",
    !!user && /trial/i.test(String(user.subscription_status)) && /(^|,)trial-suite(,|$)/.test(String(user.products_enabled)) && user.trial_days_left >= 12 && user.trial_days_left <= 14, user || "no users row");

  const kept = await dossierText(page);
  J.check("the pasted matches are still in the dossier after creating the account (this browser)", /holds\s+2\s+matched lines?/i.test(kept), kept);

  const again = await pasteSchedule(page, SAMPLE_LINES);
  J.check("what the guest could do keeps working: the paste still matches (3 of 3)", again.matched === 3 && again.total === 3, again.first);
  await press(page, "#hm-run");
  const hm = await until(async () => { const t = await page.evaluate(() => (document.getElementById("hm-note") || {}).innerText || ""); return /Live result|Matcher returned|failed|no match/i.test(t) && !/^Running against/i.test(t) ? t : null; }, 30000);
  J.check("what the guest could do keeps working: hero RUN IT LIVE", /Live result just now/i.test(hm || ""), hm);

  await J.checkInPlace(page, mark);

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in", null, { timeout: 20000 }).catch(() => {});
  J.check("the new account stays signed in across a reload", (await shellState(page)).auth === "signed-in");
  const afterReload = (await until(async () => { const t = await dossierText(page); return /holds\s+[1-9]\d*\s+matched line/i.test(t) ? t : null; }, 8000)) || (await dossierText(page));
  J.check("the dossier still holds the pasted matches after a reload (kept in this browser, as the dialog says)", /holds\s+[1-9]\d*\s+matched line/i.test(afterReload || ""), afterReload || "dossier empty after reload");

  // A second browser: the account itself works everywhere. The dossier is promised for this
  // browser only, so the second browser's dossier is recorded, not judged.
  const ctx2 = await J.context("desktop");
  const p2 = await J.page(ctx2);
  await openHome(p2, J, "second-browser");
  await raiseDossier(p2);
  const s2 = await signIn(p2, acct);
  J.check("the new account signs in from a second browser", s2.auth === "signed-in" && s2.user === acct.email, { auth: s2.auth, user: s2.user, view: s2.view, error: s2.error, seconds: s2.seconds });
  await p2.evaluate(() => window.WeylandShell && window.WeylandShell.close());
  await sleep(1500);
  J.note("second_browser_dossier", (await dossierText(p2)) || "(empty)");
  await ctx2.close();

  // Same browser after sign-out: the create-account form must still open.
  await page.evaluate(() => window.WeylandShell.signOut());
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-out", null, { timeout: 10000 }).catch(() => {});
  const again2 = await openCreateForm(page);
  J.check("after signing out, 'Create a free account' still opens the form in this browser", again2.found, again2);
  await ctx.close();
});
