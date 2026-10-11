#!/usr/bin/env node
// g074: run the SightX journeys from a cloud container before deploy. This container has no wrangler and
// no GPU, so this writes a patched copy of tools/user-simulation (and tools/bidset/out) under <out> in which:
//   - the kit's GPU gate accepts software WebGL (the copy's "browser has GPU WebGL" line is that copy's);
//   - every browser context overlays this checkout on production weylandai.com: /sightx*, /subx-app* and
//     /api/sightx/* are answered from this branch (the SightX worker's own router and routes, the pages as
//     the workers serve them), everything else (sign-in, SubX uploads and reads, pdf.js) is production;
//   - with QA_EMAIL_FILE and QA_PW_FILE set, J.account() signs in as that existing account instead of
//     creating one (no D1 credentials here); the journey deletes its own upload through the owner's DELETE,
//     and the kit's D1 purge is skipped. The password is never printed (the kit scrubs it from reports).
// Usage: node tools/accuracy/g074/overlay-kit.mjs <out>; then run <out>/tools/user-simulation/journeys/<id>.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("usage: overlay-kit.mjs <out dir>");
const US = path.join(OUT, "tools/user-simulation");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "tools/bidset"), { recursive: true });
fs.cpSync(path.join(REPO, "tools/user-simulation/lib"), path.join(US, "lib"), { recursive: true });
fs.cpSync(path.join(REPO, "tools/user-simulation/journeys"), path.join(US, "journeys"), { recursive: true });
fs.cpSync(path.join(REPO, "tools/bidset/out"), path.join(OUT, "tools/bidset/out"), { recursive: true });

const kitPath = path.join(US, "lib/journey-kit.mjs");
let kit = fs.readFileSync(kitPath, "utf8");
const swap = (a, b) => { if (!kit.includes(a)) throw new Error("kit changed: " + a.slice(0, 60)); kit = kit.replace(a, b); };
swap('export const LAUNCH_ARGS = ["--use-angle=metal"];', 'export const LAUNCH_ARGS = ["--enable-unsafe-swiftshader"];');
swap("const ok = !!renderer && !/swiftshader/i.test(renderer);", "const ok = !!renderer; // overlay copy (g074): software WebGL accepted");
swap("    ctx.setDefaultTimeout(30000);\n", "    ctx.setDefaultTimeout(30000);\n    await overlayBranch(ctx);\n");
swap("  async account(label, ", "  async account(label, opts) { if (process.env.QA_EMAIL_FILE) { const email = (await import(\"node:fs\")).readFileSync(process.env.QA_EMAIL_FILE, \"utf8\").trim(), password = (await import(\"node:fs\")).readFileSync(process.env.QA_PW_FILE, \"utf8\").trim(); this.secrets.push(password); this.note(\"account\", \"existing QA account (overlay run)\"); return { label, email, password, userId: null, usersRow: false }; } return this._account(label, opts); }\n  async _account(label, ");
swap("  async cleanup() {\n", "  async cleanup() {\n    if (process.env.QA_EMAIL_FILE) { this.note(\"cleanup\", \"overlay run: the journey deleted its own upload; D1 purge skipped (no D1 credentials here); the homepage demo copy is left to the demo-clone sweep\"); this.uploads.clear(); this.clones.clear(); }\n");
kit += `
// ---- g074 overlay: this checkout's SightX worker and pages over production ----
const OVERLAY_REPO = ${JSON.stringify(REPO)};
let overlayRouter = null;
async function overlayRoutes() {
  if (overlayRouter) return overlayRouter;
  const W = OVERLAY_REPO + "/weyland-sightx-worker/";
  const { NativeRouter } = await import(W + "src/lib/router.js");
  const { registerSightXModelRoutes } = await import(W + "src/routes/sightx-model.js");
  const { registerSightXSheetRoutes } = await import(W + "src/routes/sightx-sheets.js");
  const { SHEET_SETS } = await import(W + "src/data/sheets/records.js");
  const fs = await import("node:fs");
  const pdfs = Object.fromEntries(Object.keys(SHEET_SETS).map((sha) => [sha, fs.readFileSync(W + "assets/building/" + sha + ".pdf.bin")]));
  const r = new NativeRouter();
  registerSightXModelRoutes(r);
  registerSightXSheetRoutes(r, { pdfs });
  overlayRouter = { r, sightx: fs.readFileSync(W + "src/pages/sightx-app.html", "utf8"), subx: fs.readFileSync(OVERLAY_REPO + "/weyland-subx-worker/src/pages/subx-app.html", "utf8") };
  return overlayRouter;
}
async function overlayBranch(ctx) {
  const o = await overlayRoutes();
  await ctx.route(/^https:\\/\\/weylandai\\.com\\/(sightx\\/?(\\?.*)?|subx-app\\/?(\\?.*)?)$/, (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith("/sightx") && u.searchParams.get("embed") === "bg") return route.continue();
    route.fulfill({ status: 200, contentType: "text/html; charset=UTF-8", body: u.pathname.startsWith("/sightx") ? o.sightx : o.subx });
  });
  await ctx.route(/^https:\\/\\/weylandai\\.com\\/api\\/sightx\\//, async (route) => {
    const req = route.request();
    const res = await o.r.handle(new Request(req.url(), { method: req.method(), headers: req.headers(), body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postDataBuffer() }), {}, {});
    if (!res) return route.continue();
    route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
  });
}
`;
fs.writeFileSync(kitPath, kit);
console.log("overlay kit written to " + US);
