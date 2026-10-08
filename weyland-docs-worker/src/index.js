// weyland-docs-worker/src/index.js
//
// weyland-docs-worker: the six card-sold document tools, off the monolith.
// The 7 October first-time-user audits found all six failing on their first
// real file (weyland-ocr-worker ran out of memory or CPU; see
// ocr-worker/extract.js), and no fix could ship because their routes and pages
// lived in weylandai-com-worker, which sits on the weylandai.com/* catch-all
// and must never be deployed. Same strangler pattern as the earlier
// extractions (HuntX, SubX, CutSheetX, PropX, MeetingX, SightX, platform):
// plain ESM, wrangler deploy from source, routes more specific than the
// catch-all, same D1 tables and R2 keys, the platform's security headers.
//
// Pages:  GET /inspecx /safetyx /survx /specx /drawx /asbuiltx (and with /)
// API:    see routes/docs.js
// Health: GET /health

import { NativeRouter } from "./lib/router.js";
import { authenticate, requireProductAccess } from "./lib/auth.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { trafficDrivenJob } from "./lib/job-lease.js";
import puppeteer from "@cloudflare/puppeteer";
import { secured } from "../../weyland-shared/security-headers.js";
import { registerDocsRoutes, sweepJobs } from "./routes/docs.js";
import { toolPageHtml, PAGE_SLUGS } from "./pages/tool-page.js";

const router = new NativeRouter();

router.get("/health", () => jsonResponse3({ ok: true, worker: "weyland-docs-worker", tools: PAGE_SLUGS }));

for (const slug of PAGE_SLUGS) {
  const serve = () => new Response(toolPageHtml(slug), { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
  router.get("/" + slug, serve);
  router.get("/" + slug + "/", serve);
}

registerDocsRoutes(router, { authenticate, requireProductAccess, puppeteer });

export default secured({
  async fetch(request, env, ctx) {
    // Stalled page jobs are advanced by ordinary traffic, never by a cron.
    trafficDrivenJob(env, ctx, { db: env.DB, job: "docs-jobs-sweep", cadenceSeconds: 60, worker: "weyland-docs-worker", run: () => sweepJobs(env) });
    return router.handle(request, env, ctx);
  },
});
