import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHome, raiseDossier, setMark, press, overlayFrame, workspaceDetail, REPORTS_DIR } from "./journey-kit.mjs";
import { doorEvidence } from "./estimator-assertions.mjs";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const SHEET = path.join(ROOT, "tools/user-simulation/roles/rockford-A2.2-p29.pdf");
export const BIDSET = path.join(ROOT, "tools/corpus/door-schedules/f0e863d88ea688ff.pdf");
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export async function evidenceFolder(J) {
  const dir = path.join(REPORTS_DIR, J.id + "-" + J.startedAt.replace(/[:.]/g, "-"));
  await mkdir(dir, { recursive: true });
  const git = args => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } };
  const fixtures = [];
  for (const file of [SHEET, BIDSET]) {
    const bytes = await readFile(file);
    fixtures.push({ path: path.relative(ROOT, file), bytes: bytes.length, sha256: sha256(bytes) });
  }
  J.note("source", { head: git(["rev-parse", "HEAD"]), branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    origin_main: git(["rev-parse", "refs/remotes/origin/main"]), changes: git(["status", "--short"]),
    scope: "Real production UI and APIs; checkout revision identifies the harness, not the deployed worker revision", fixtures });
  J.note("artifacts", path.relative(ROOT, dir));
  return dir;
}

export async function saveJson(J, dir, name, value) {
  await writeFile(path.join(dir, name), J.scrub(JSON.stringify(value, null, 2)) + "\n");
}

export function watchWorkspace(ctx) {
  const responses = [], requests = [], pending = new Set();
  ctx.on("request", r => {
    const u = new URL(r.url());
    if (r.method() !== "GET" && /\/api\//.test(u.pathname)) requests.push({ method: r.method(), host: u.host, path: u.pathname });
  });
  ctx.on("response", r => {
    const u = new URL(r.url());
    if (!/^\/api\/hardware-schedule\//.test(u.pathname) || !/json/.test(r.headers()["content-type"] || "")) return;
    const event = { path: u.pathname, method: r.request().method(), status: r.status(), at: new Date().toISOString(), data: null };
    responses.push(event);
    const p = r.json().then(data => { event.data = data; }, e => { event.error = e.message; });
    pending.add(p); p.finally(() => pending.delete(p));
  });
  return { requests, responses, settle: () => Promise.allSettled([...pending]) };
}

export async function openUpload(J, page, kind) {
  const touch = kind === "phone";
  await openHome(page, J, kind);
  await raiseDossier(page, { touch });
  const mark = await setMark(page);
  const via = await press(page, "#hs-upload", { touch });
  J.check(kind + ": homepage upload is reachable by " + (touch ? "tap" : "click"), via === "pointer", via);
  const frame = await overlayFrame(page, 25000);
  if (!frame) throw new Error("Homepage upload did not open a workspace in the overlay");
  await frame.locator("#f-file").waitFor({ state: "visible", timeout: 30000 });
  return { frame, mark };
}

export async function readSchedule(J, frame, { pdf, project, label, sourcePage, touch = false }) {
  await frame.locator("#f-project").fill(project);
  await frame.locator("#f-doctype").selectOption("door_schedule");
  await frame.locator("#f-file").setInputFiles(pdf);
  const start = Date.now();
  // Submit while discovery can still be pending: the product must await it.
  if (touch) await frame.locator("#upload-btn").tap();
  else await frame.locator("#upload-btn").click();
  await frame.waitForFunction(() => {
    const button = document.getElementById("upload-btn"), result = document.getElementById("upload-result");
    return button && !button.disabled && /read complete|read finished|could not|failed|error|sign in/i.test(result?.textContent || "");
  }, null, { timeout: 600000 });
  const status = await frame.locator("#upload-result").innerText();
  const readResult = await frame.locator("#extract-result").innerText();
  const detail = await workspaceDetail(frame);
  const doorCheck = doorEvidence(detail.rows, sourcePage);
  J.check(label + ": all 65 audited door marks, hardware groups and page/row citations", doorCheck.ok, doorCheck);
  J.check(label + ": read completes and clears its busy status", /read complete/i.test(status) && !/reading/i.test(status) &&
    !(await frame.locator("#extract-result .spin").count()) && !(await frame.locator("#extract-result .error-box").count()), { status, readResult });
  const evidence = { seconds: (Date.now() - start) / 1000, status, readResult, detail, doorCheck };
  J.note(label + "_read", evidence);
  return evidence;
}
