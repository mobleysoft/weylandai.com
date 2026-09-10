import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CircuitBreaker,
  claudeCircuitBreaker,
  callClaudeVision,
  callClaudeVisionWithImage,
  _callClaudeVisionWithImage_sabp,
  _callClaudeVisionWithImage_localSubprocess,
  _imageSourceForQueue,
  _callClaudeVisionWithImage_apiDirect,
  callClaudeWithPdf,
  resolveInferenceContract,
} from "./hardware-extraction-vision-adapters.js";

function withMockFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => { globalThis.fetch = original; });
}

test("CircuitBreaker: starts CLOSED and executes normally", async () => {
  const cb = new CircuitBreaker();
  const result = await cb.execute(async () => "ok");
  assert.equal(result, "ok");
  assert.equal(cb.state, "CLOSED");
});

test("CircuitBreaker: opens after threshold consecutive failures, rejects further calls immediately", async () => {
  const cb = new CircuitBreaker();
  cb.threshold = 2;
  cb.timeout = 100000;
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail1"); }));
  assert.equal(cb.state, "CLOSED");
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail2"); }));
  assert.equal(cb.state, "OPEN");
  await assert.rejects(() => cb.execute(async () => "should not run"), /Circuit breaker is OPEN/);
});

test("CircuitBreaker: transitions to HALF_OPEN and recovers to CLOSED after a success past the timeout", async () => {
  const cb = new CircuitBreaker();
  cb.threshold = 1;
  cb.timeout = 10;
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail"); }));
  assert.equal(cb.state, "OPEN");
  await new Promise((r) => setTimeout(r, 20));
  const result = await cb.execute(async () => "recovered");
  assert.equal(result, "recovered");
  assert.equal(cb.state, "CLOSED");
});

test("claudeCircuitBreaker: is a real shared CircuitBreaker singleton", () => {
  assert.ok(claudeCircuitBreaker instanceof CircuitBreaker);
});

test("resolveInferenceContract: real defaults when no env overrides are set", () => {
  const contract = resolveInferenceContract({});
  assert.equal(contract.model, "claude-opus-4-8");
  assert.equal(contract.max_tokens, 16000);
  assert.equal(contract.temperature, 0);
});

test("resolveInferenceContract: real env overrides applied", () => {
  const contract = resolveInferenceContract({ WEYLAND_INFERENCE_MODEL: "claude-opus-4-9", WEYLAND_MAX_TOKENS: "8000" });
  assert.equal(contract.model, "claude-opus-4-9");
  assert.equal(contract.max_tokens, 8000);
});

test("callClaudeVision: throws a real non-retryable error when ANTHROPIC_API_KEY is missing", async () => {
  await assert.rejects(() => callClaudeVision("QUJD", "a valid prompt string here", {}), (err) => {
    assert.match(err.message, /ANTHROPIC_API_KEY/);
    assert.equal(err.retryable, false);
    return true;
  });
});

test("callClaudeVision: real happy path calls the Anthropic API with the resolved inference contract", async () => {
  let seenBody;
  await withMockFetch(async (url, init) => {
    seenBody = JSON.parse(init.body);
    return { ok: true, headers: new Headers(), async json() { return { content: [{ text: "{}" }], usage: { input_tokens: 1, output_tokens: 1 } }; } };
  }, async () => {
    const result = await callClaudeVision("QUJDRA==", "a valid prompt string here", { ANTHROPIC_API_KEY: "sk-1" });
    assert.equal(seenBody.model, "claude-opus-4-8");
    assert.ok(result.content);
  });
});

test("callClaudeVision: retries on a retryable 500 and eventually succeeds", async () => {
  let attempts = 0;
  await withMockFetch(async () => {
    attempts++;
    if (attempts < 2) {
      return { ok: false, status: 500, headers: new Headers(), async text() { return "server error"; } };
    }
    return { ok: true, headers: new Headers(), async json() { return { content: [{ text: "ok" }] }; } };
  }, async () => {
    // Use a fresh circuit breaker path by using isolated retry delays - real delays are 5s/10s/20s,
    // too slow for a unit test, so we only assert on the eventual success shape after patching timers.
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => originalSetTimeout(fn, ms > 1000 ? 1 : ms, ...args);
    try {
      const result = await callClaudeVision("QUJDRA==", "a valid prompt string here", { ANTHROPIC_API_KEY: "sk-1" });
      assert.equal(attempts, 2);
      assert.ok(result.content);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

test("callClaudeVision: a non-retryable status (401) throws after just one attempt", async () => {
  let attempts = 0;
  await withMockFetch(async () => {
    attempts++;
    return { ok: false, status: 401, headers: new Headers(), async text() { return JSON.stringify({ error: { message: "bad key" } }); } };
  }, async () => {
    await assert.rejects(() => callClaudeVision("QUJDRA==", "a valid prompt string here", { ANTHROPIC_API_KEY: "sk-1" }));
    // 401 isn't in the [429,500,502,503,504] retryable set, so error4.retryable is explicitly
    // false (not undefined) and the loop's `if (error4.retryable === false) throw` fires on
    // the first attempt.
    assert.equal(attempts, 1);
  });
});

test("callClaudeVisionWithImage: with no session and a non-local edition, defaults to the claude_code_local (sabp) route", async () => {
  // No sessionId means the DB route-override lookup is skipped, and the
  // default route ("claude_code_local" for non-local WEYLAND_EDITION) isn't
  // corrected to api_direct by the edition-mismatch guards - it calls the
  // sabp adapter, which needs a DB binding to resolve an owner mhs_id.
  const env = { ANTHROPIC_API_KEY: "sk-1" };
  await assert.rejects(() => callClaudeVisionWithImage(new ArrayBuffer(8), "prompt", env, 1, null, null));
});

test("callClaudeVisionWithImage: honors a real session-level extraction_route override of api_direct", async () => {
  let seenUrl;
  await withMockFetch(async (url) => {
    seenUrl = url;
    return { ok: true, headers: new Headers(), async json() { return { content: [{ text: "ok" }] }; } };
  }, async () => {
    const env = {
      ANTHROPIC_API_KEY: "sk-1",
      DB: { prepare: () => ({ bind: () => ({ async first() { return { extraction_route: "api_direct" }; } }) }) },
    };
    await callClaudeVisionWithImage(new ArrayBuffer(8), "prompt", env, 1, "s1", null);
    assert.equal(seenUrl, "https://api.anthropic.com/v1/messages");
  });
});

test("callClaudeVisionWithImage: an unknown route falls back to api_direct", async () => {
  let seenUrl;
  await withMockFetch(async (url) => {
    seenUrl = url;
    return { ok: true, headers: new Headers(), async json() { return { content: [{ text: "ok" }] }; } };
  }, async () => {
    const env = {
      ANTHROPIC_API_KEY: "sk-1",
      DB: { prepare: () => ({ bind: () => ({ async first() { return { extraction_route: "totally_unknown" }; } }) }) },
    };
    await callClaudeVisionWithImage(new ArrayBuffer(8), "prompt", env, 1, "s1", null);
    assert.equal(seenUrl, "https://api.anthropic.com/v1/messages");
  });
});

test("_imageSourceForQueue: small images are inlined as base64", async () => {
  const smallBase64 = "iVBORshort";
  const source = await _imageSourceForQueue(smallBase64, {});
  assert.equal(source.type, "base64");
  assert.equal(source.media_type, "image/png");
  assert.equal(source.data, smallBase64);
});

test("_imageSourceForQueue: large images upload to R2 and return a signed URL", async () => {
  const bigBase64 = "iVBOR" + "A".repeat(1_200_003); // total length a multiple of 4 for valid base64
  const puts = [];
  const env = {
    UPLOADS: { async put(key, bytes, opts) { puts.push({ key, opts }); } },
    JWT_SECRET: "secret",
    APP_URL: "https://weylandai.com",
  };
  const source = await _imageSourceForQueue(bigBase64, env);
  assert.equal(source.type, "url");
  assert.ok(source.url.startsWith("https://weylandai.com/api/internal/r2-stream?token="));
  assert.equal(puts.length, 1);
});

test("_callClaudeVisionWithImage_sabp: real happy path queues then polls to completion", async () => {
  const calls = [];
  await withMockFetch(async (url, init) => {
    calls.push(url);
    if (String(url).includes("/jobs/queue")) {
      return { status: 200, async text() { return JSON.stringify({ job_id: "job1" }); } };
    }
    return { status: 200, async text() {
      return JSON.stringify({ status: "completed", result: { content: [{ text: "extracted" }], model: "claude-code-local", usage: { input_tokens: 5, output_tokens: 5 } } });
    } };
  }, async () => {
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => originalSetTimeout(fn, ms > 100 ? 1 : ms, ...args);
    try {
      const env = { FLEET_API_KEY: "fk1" };
      const result = await _callClaudeVisionWithImage_sabp(new ArrayBuffer(8), "prompt", env, 1, "s1", "mhs1");
      assert.equal(result.content[0].text, "extracted");
      assert.equal(result.provider_path, "claude_code_local");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

test("_callClaudeVisionWithImage_sabp: throws when no owner mhs_id can be resolved", async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ async first() { return null; } }) }) } };
  await assert.rejects(
    () => _callClaudeVisionWithImage_sabp(new ArrayBuffer(8), "prompt", env, 1, "s1", null),
    /no mhs_id for session/
  );
});

test("_callClaudeVisionWithImage_localSubprocess: real happy path against the local sidecar", async () => {
  await withMockFetch(async (url, init) => {
    assert.ok(String(url).endsWith("/extract"));
    return { ok: true, async json() { return { success: true, result: { content: [{ text: "sidecar result" }] } }; } };
  }, async () => {
    const result = await _callClaudeVisionWithImage_localSubprocess(new ArrayBuffer(8), "prompt", {}, 1);
    assert.equal(result.content[0].text, "sidecar result");
    assert.equal(result.provider_path, "claude_code_subprocess");
  });
});

test("_callClaudeVisionWithImage_localSubprocess: throws when the sidecar is unreachable", async () => {
  await withMockFetch(async () => ({ ok: false, status: 503 }), async () => {
    await assert.rejects(
      () => _callClaudeVisionWithImage_localSubprocess(new ArrayBuffer(8), "prompt", {}, 1),
      /Local sidecar unreachable/
    );
  });
});

test("_callClaudeVisionWithImage_apiDirect: throws a real non-retryable error when the API key is missing", async () => {
  await assert.rejects(() => _callClaudeVisionWithImage_apiDirect(new ArrayBuffer(8), "prompt", {}, 1), (err) => {
    assert.equal(err.retryable, false);
    return true;
  });
});

test("_callClaudeVisionWithImage_apiDirect: real happy path sends the image as base64 with the detected media type", async () => {
  let seenBody;
  const pngBytes = new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]).buffer;
  await withMockFetch(async (url, init) => {
    seenBody = JSON.parse(init.body);
    return { ok: true, headers: new Headers(), async json() { return { content: [{ text: "ok" }] }; } };
  }, async () => {
    const result = await _callClaudeVisionWithImage_apiDirect(pngBytes, "prompt", { ANTHROPIC_API_KEY: "sk-1" }, 1);
    assert.equal(seenBody.messages[0].content[0].source.media_type, "image/png");
    assert.ok(result.content);
  });
});

test("callClaudeWithPdf: throws when the API key is missing", async () => {
  await assert.rejects(() => callClaudeWithPdf("QUJD", "prompt", {}, 1), /ANTHROPIC_API_KEY not configured/);
});

test("callClaudeWithPdf: real happy path sends the PDF document to the fixed model", async () => {
  let seenBody;
  await withMockFetch(async (url, init) => {
    seenBody = JSON.parse(init.body);
    return { ok: true, async json() { return { content: [{ text: "ok" }] }; } };
  }, async () => {
    const result = await callClaudeWithPdf("QUJDRA==", "prompt", { ANTHROPIC_API_KEY: "sk-1" }, 1);
    assert.equal(seenBody.model, "claude-opus-4-5-20251101");
    assert.equal(seenBody.messages[0].content[0].type, "document");
    assert.ok(result.content);
  });
});

test("callClaudeWithPdf: real error path surfaces the API's status text", async () => {
  await withMockFetch(async () => ({ ok: false, status: 500, statusText: "Internal Server Error", async text() { return "boom"; } }), async () => {
    await assert.rejects(() => callClaudeWithPdf("QUJDRA==", "prompt", { ANTHROPIC_API_KEY: "sk-1" }, 1), /Claude API error: 500/);
  });
});
