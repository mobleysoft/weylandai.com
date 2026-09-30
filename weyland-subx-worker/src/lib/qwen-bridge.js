// src/lib/qwen-bridge.js
//
// Shared bridge to the real local Qwen3-8B (llama-server on this Mac,
// 127.0.0.1:18087) reached over its Cloudflare Tunnel (llama.mobleysoft.com)
// - the same bridge jitagi/kernel/llm_client.mjs uses locally, extended here
// with the CF-Access-Client-Id/Secret headers a Worker (not localhost) needs
// to get past the tunnel's Cloudflare Access "m2m only" gate (confirmed live
// 2026-09-12: bare fetch() from off-Mac gets Access's HTML login page / 403,
// not JSON - the service token below is what actually gets through).
//
// Extracted 2026-09-30 from hardware-extraction-vision-dispatch.js (its
// original, only caller) so a second, unrelated pipeline (catalogue
// price-table extraction) can reuse the exact same self-hosted, policy-
// compliant LLM path instead of duplicating it or reaching for a
// third-party API - never provision ANTHROPIC_API_KEY for this product,
// see feedback_weylandai_no_anthropic_key_use_gofaineat memory.

const QWEN_BRIDGE_URL = "https://llama.mobleysoft.com";

export function isQwenBridgeConfigured(env2) {
  return Boolean(env2.QWEN_BRIDGE_CLIENT_ID && env2.QWEN_BRIDGE_CLIENT_SECRET);
}

export async function callLocalQwen(env2, messages, opts = {}) {
  const { maxTokens = 4e3, temperature = 0.1 } = opts;
  const clientId = env2.QWEN_BRIDGE_CLIENT_ID;
  const clientSecret = env2.QWEN_BRIDGE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("QWEN_BRIDGE_CLIENT_ID/QWEN_BRIDGE_CLIENT_SECRET not configured on this worker - the embedded route needs the Cloudflare Access service-token credentials for llama.mobleysoft.com (Access app 'llama-server-gateway (m2m only)', service token 'jitagi-kernel-m2m')");
  }
  const base = env2.QWEN_BRIDGE_URL || QWEN_BRIDGE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45e3);
  let res;
  try {
    res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret
      },
      body: JSON.stringify({
        model: "qwen3-8b",
        messages,
        max_tokens: maxTokens,
        temperature,
        chat_template_kwargs: { enable_thinking: false }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Qwen bridge returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || data.error) {
    throw new Error(`Qwen bridge error (HTTP ${res.status}): ${data.error?.message || text.slice(0, 300)}`);
  }
  return data.choices?.[0]?.message?.content || "";
}
