// Self-contained fork of ../../../src/rate-limit.js, copied verbatim -
// same pattern every other lib/*.js file in this worker already follows
// for cross-worker shared code. KV-backed (env.CACHE, same binding this
// worker already uses for checkout-status polling).
//
// Second real call site added here: POST /api/auth/ephemeral and
// POST /api/auth/ephemeral/upgrade had no rate limiting at all when first
// shipped - an unauthenticated visitor could script-spam token creation
// with no cost. Keyed by IP (CF-Connecting-IP) rather than userId since
// the whole point of this route is minting an identity that doesn't
// exist yet.

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
