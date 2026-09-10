// weyland-gateway-worker: the real front door for weylandai.com, per
// WEYLAND_SUCCESSOR_ARCHITECTURE.md. Routes a real, growing set of paths
// (route-table.js) to their own separated module Workers; everything
// else falls back to env.ORIGIN, a Service Binding to the still-live
// monolith - the safe strangler-fig pattern. Peeling a module out of
// legacy-monolith.js means: deploy it standalone, add its binding below
// and to wrangler.toml, add its prefixes to route-table.js. This file
// itself does not grow per module - that was the point of route-table.js.
//
// /gateway-health is answered directly by THIS worker, not forwarded -
// a way to verify the gateway itself is alive independent of whether
// ORIGIN or any bound module worker is healthy.

import { resolveBinding } from "./route-table.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/gateway-health") {
      return new Response(JSON.stringify({ status: "ok", service: "weyland-gateway-worker", mode: "routed" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    const bindingName = resolveBinding(url.pathname);
    const target = bindingName ? env[bindingName] : env.ORIGIN;
    return target.fetch(request);
  },
};
