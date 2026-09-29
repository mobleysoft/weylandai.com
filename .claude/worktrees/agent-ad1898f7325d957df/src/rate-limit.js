// Real source module, extracted 2026-09-05 from weyland.worker.js's own
// bundled "rate-limit.js" segment (lines 138387-138427 at extraction time,
// tagged with a `// rate-limit.js` comment - proof this file used to exist
// separately before being flattened into the checked-in bundle). Content
// below is byte-faithful to that segment's real logic, with esbuild's
// internal `__name`/init_* registration calls and unused polyfill init
// calls (process/console/performance - not referenced by the function
// body) stripped as bundler bookkeeping, not behavior. Not yet wired into
// a real build - see src/README.md.
//
// Real usage today (only call site): POST
// /api/hardware-schedule/session/:sessionId/enrich, gating enrichment
// requests to 10 per 60s per user via a KV namespace binding (`env.CACHE`).

export async function checkRateLimit(userId, operation, env, limits = { requests: 10, windowSeconds: 60 }) {
  const key = `ratelimit:${operation}:${userId}`;
  const now = Date.now();
  try {
    const data = await env.CACHE.get(key, "json");
    if (data) {
      const { count, resetAt } = data;
      if (now > resetAt) {
        await env.CACHE.put(key, JSON.stringify({ count: 1, resetAt: now + limits.windowSeconds * 1e3 }), {
          expirationTtl: limits.windowSeconds
        });
        return { limited: false, remaining: limits.requests - 1 };
      }
      if (count >= limits.requests) {
        const retryAfter = Math.ceil((resetAt - now) / 1e3);
        return {
          limited: true,
          retryAfter,
          remaining: 0
        };
      }
      await env.CACHE.put(key, JSON.stringify({ count: count + 1, resetAt }), {
        expirationTtl: limits.windowSeconds
      });
      return { limited: false, remaining: limits.requests - (count + 1) };
    } else {
      await env.CACHE.put(key, JSON.stringify({ count: 1, resetAt: now + limits.windowSeconds * 1e3 }), {
        expirationTtl: limits.windowSeconds
      });
      return { limited: false, remaining: limits.requests - 1 };
    }
  } catch (error) {
    console.error("[Rate Limiting] Error:", error);
    return { limited: false, remaining: limits.requests };
  }
}
