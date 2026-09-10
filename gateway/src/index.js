// weyland-gateway-worker: the real front door for weylandai.com, per
// WEYLAND_SUCCESSOR_ARCHITECTURE.md. Phase 1 today is deliberately just
// a pure passthrough to the existing monolith worker (env.ORIGIN, a
// Service Binding) - zero behavior change, the safe "stand up the new
// front door first" step of a strangler-fig migration. As modules get
// peeled out of legacy-monolith.js and deployed as their own Workers
// (per WORKER_MODULARIZATION_MAP.md's extraction order), their routes
// get carved out of the fallback here one at a time - this file grows a
// real routing table piece by piece, it does not stay this simple.
//
// /gateway-health is answered directly by THIS worker, not forwarded -
// a way to verify the gateway itself is alive independent of whether
// ORIGIN (or, later, any peeled-off module worker) is healthy.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/gateway-health") {
      return new Response(JSON.stringify({ status: "ok", service: "weyland-gateway-worker", mode: "passthrough" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return env.ORIGIN.fetch(request);
  },
};
