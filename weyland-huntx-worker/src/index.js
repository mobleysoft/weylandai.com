// weyland-huntx-worker/src/index.js
//
// Real, independently-deployed Cloudflare Worker. Second extraction of
// the microservices push described in MICROSERVICES_PUSH.md (first was
// weyland-market-intelligence-worker, public routes with no auth/D1
// dependency). This one is the harder case: HuntX's real routes need the
// full authenticate()/requireProductAccess() chain and a live D1
// connection to the SAME weyland_db the monolith uses (see
// wrangler.toml) - not a simplification, a faithful port (see each
// forked lib file's own header for what was copied and why).
//
// Per direct instruction (2026-09-12): no bundler for new Worker code.
// This is plain native ESM - `wrangler deploy` resolves the import graph
// below directly, no `esbuild --bundle` step, no build script at all.
//
// Owns 3 routes, ported byte-for-byte from the monolith (see
// src/routes/hunt.js and src/pages/huntx.js for exact provenance):
//   GET/HEAD /huntx                 - the real marketing/product page
//                                     (route weylandai.com/huntx*, so
//                                     /huntx/, /huntx?embed=1 and any other
//                                     query-string variant land here too)
//   POST     /api/hunt/refresh      - scrape+upsert TxDOT + CA OPSC feeds
//   GET      /api/hunt/opportunities - list/search the opportunities table
//
// The monolith's own copies of all three are deliberately left in place
// and still live (src/routes/hunt.js, "huntx": serve_huntx in
// src/lib/marketing-pages.js) - this extraction does not touch or remove
// them. Real parity + cutover is achieved entirely via Cloudflare Worker
// Routes on the weylandai.com zone (added narrowly, additively, AFTER
// this Worker was deployed standalone and curl-verified against
// production - see MICROSERVICES_PUSH.md for the verification record):
// a route pattern more specific than the monolith's `weylandai.com/*`
// catch-all (e.g. `weylandai.com/api/hunt/*`, `weylandai.com/huntx`)
// takes precedence and sends matching requests here instead, regardless
// of what's still registered in the monolith's own route table.

import { trafficDrivenJob } from "./lib/job-lease.js";
import { NativeRouter } from "./lib/router.js";
import { authenticate } from "./lib/auth.js";
import { registerHuntRoutes } from "./routes/hunt.js";
import { serve_huntx } from "./pages/huntx.js";
import { ingestSources } from "./lib/ingest.js";
// Security headers on every answer (2026-10-07): the platform's set, one shared module.
import { secured } from "../../weyland-shared/security-headers.js";

const router = new NativeRouter();
registerHuntRoutes(router, { authenticate });

export default secured({
  async fetch(request, env, ctx) {
    // Traffic-driven freshness (2026-10-05): Cron Triggers on this account
    // are registered but have never fired (cron_ticks stays empty), so any
    // request may claim the D1 lease for this worker's background job and
    // run it via waitUntil. The visitor never waits; no request calls out.
    trafficDrivenJob(env, ctx, { db: env.DB, job: "huntx-ingest", cadenceSeconds: 3600, worker: "weyland-huntx-worker", run: () => ingestSources(env, "traffic").then((r) => console.log("[HuntX Ingest] traffic-driven run", JSON.stringify({ upserted: r.upserted, errors: r.errors }))) });
    const url = new URL(request.url);

    // Own health check, answered directly - not part of the extracted
    // route table, so it can't collide with any real HuntX path (all of
    // which live under /api/hunt/* or are the exact path /huntx).
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "weyland-huntx-worker" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // The real marketing/product page. Matches weyland-entry.js's
    // dispatch() normalization in the monolith (lowercase, leading and
    // trailing slashes stripped) narrowly for this one path, rather than
    // porting that whole general-purpose dispatcher for a single route.
    if ((request.method === "GET" || request.method === "HEAD")) {
      const clean = url.pathname.toLowerCase().replace(/^\/|\/$/g, "");
      if (clean === "huntx") return serve_huntx(request);
    }

    return router.handle(request, env, ctx);
  },

});
