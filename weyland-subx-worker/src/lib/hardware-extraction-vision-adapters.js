// src/lib/hardware-extraction-vision-adapters.js
//
// MONOLITH_HELPER_MAP.md's Cluster A, sub-step (b) of 3: the Claude-
// vision call adapters (and their circuit breaker). Extracted from
// legacy-monolith.js's `// hardware-schedule-extractor.js` esbuild
// module, the same source as sub-step (a)
// (src/lib/hardware-extraction-prompts.js), which this file imports
// from for validateClaudeRequest/getClaudeTimeout/
// arrayBufferToBase643/detectImageMediaType.
//
// CircuitBreaker/claudeCircuitBreaker moved here (not left inline as
// originally planned when sub-step (a) forward-declared them) because
// their only two real call sites in the whole monolith - callClaudeVision
// and _callClaudeVisionWithImage_apiDirect - both live in this file;
// verified via grep before moving. resolveInferenceContract (a tiny,
// pure env-var reader) moved here too even though
// MONOLITH_HELPER_MAP.md's original cataloguing pass placed it in the
// stateful pipeline (sub-step c) - it's a real shared dependency of 2
// of these adapters (callClaudeVision, _callClaudeVisionWithImage_sabp)
// and is trivially pure, so importing it back into
// legacy-monolith.js for the still-inline pipeline functions
// (queuePageExtractionJob, extractFromPageImage, etc.) that also call
// it is simpler and lower-risk than threading it through as an
// injected parameter.
//
// Real consolidation made during this extraction, not just a move:
// the original module had its own private _mintInternalToken/_callEdge/
// _HASCOM_EDGE_URL - confirmed byte-identical in logic to the already-
// extracted mintInternalToken/callEdge/HASCOM_EDGE in
// lib/edge-telemetry.js (MONOLITH_HELPER_MAP.md's Cluster F, extracted
// earlier in this phase). Rather than re-creating a third copy, this
// file imports and uses the shared versions directly; the local
// duplicates were deleted from legacy-monolith.js, and the one other
// call site that used them (queuePageExtractionJob, staying inline for
// sub-step c) was updated to use the shared import it already had.
//
// Real fix required, following the same pattern found in sub-step
// (a): _callClaudeVisionWithImage_sabp builds a `queueOnce` retry
// closure via esbuild's inline `const f = /* @__PURE__ */
// __name(async () => {...}, "f")` naming wrapper - not a top-level
// statement, so it needed the same manual unwrap as sub-step (a)'s 4
// occurrences (__name isn't a real export anywhere; the wrapper is
// redundant since `const f = async () => {}` already infers
// `f.name === "f"`).
//
// esbuild's cosmetic top-level __name(...) calls dropped, same as
// every other extraction in this effort.

import { validateClaudeRequest, getClaudeTimeout, arrayBufferToBase643, detectImageMediaType } from "./hardware-extraction-prompts.js";
import { callEdge } from "./edge-telemetry.js";
import { generateJWT } from "../auth-module.js";

export class CircuitBreaker {
  constructor() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED";
    this.threshold = 100;
    this.timeout = 1e4;
  }
  recordSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      console.warn(`[Circuit Breaker] OPEN - ${this.failures} consecutive failures. Pausing for ${this.timeout}ms`);
    }
  }
  async execute(fn) {
    if (this.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.timeout) {
        console.log("[Circuit Breaker] Attempting to transition to HALF_OPEN");
        this.state = "HALF_OPEN";
      } else {
        const waitTime = Math.ceil((this.timeout - timeSinceLastFailure) / 1e3);
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry in ${waitTime} seconds.`);
      }
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error4) {
      this.recordFailure();
      throw error4;
    }
  }
};


export const claudeCircuitBreaker = new CircuitBreaker();

export async function callClaudeVision(base64Pdf, prompt, env2) {
  const apiKey = env2.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error4 = new Error("ANTHROPIC_API_KEY not found in environment");
    error4.retryable = false;
    throw error4;
  }
  validateClaudeRequest(base64Pdf, prompt);
  const timeout2 = getClaudeTimeout(base64Pdf);
  console.log(`[Hardware Extractor] Using ${timeout2}ms timeout for ${(base64Pdf.length * 3 / 4 / 1024 / 1024).toFixed(2)}MB PDF`);
  const maxRetries = 3;
  const retryDelays = [5e3, 1e4, 2e4];
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Hardware Extractor] Attempt ${attempt}/${maxRetries} - Calling Claude Vision API...`);
      const _inf = resolveInferenceContract(env2);
      const result = await claudeCircuitBreaker.execute(async () => {
        const requestBody = {
          model: _inf.model,
          max_tokens: _inf.max_tokens,
          temperature: _inf.temperature,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: base64Pdf
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        };
        console.log("[Hardware Extractor] Request details:", {
          model: requestBody.model,
          max_tokens: requestBody.max_tokens,
          temperature: requestBody.temperature,
          pdf_size_mb: (base64Pdf.length * 3 / 4 / 1024 / 1024).toFixed(2),
          prompt_size: prompt.length,
          timeout_ms: timeout2,
          attempt
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout2);
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "anthropic-version": "2023-06-01",
              "x-api-key": apiKey
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            let errorText = "";
            let errorJson = null;
            try {
              errorText = await response.text();
              if (errorText) {
                try {
                  errorJson = JSON.parse(errorText);
                } catch (e) {
                }
              }
            } catch (e) {
              errorText = "Failed to read error response";
            }
            console.error("[Hardware Extractor] API error status:", response.status);
            console.error("[Hardware Extractor] API error headers:", JSON.stringify([...response.headers.entries()]));
            console.error("[Hardware Extractor] API error body:", errorJson || errorText);
            const error4 = new Error(`Claude API error: ${response.status} ${errorJson ? JSON.stringify(errorJson.error || errorJson) : errorText}`);
            error4.statusCode = response.status;
            error4.errorDetails = errorJson;
            error4.retryable = [429, 500, 502, 503, 504].includes(response.status);
            throw error4;
          }
          const data = await response.json();
          console.log(`[Hardware Extractor] API response received (${data.usage?.input_tokens || 0} input tokens, ${data.usage?.output_tokens || 0} output tokens)`);
          return data;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === "AbortError") {
            const error4 = new Error(`Request timeout after ${timeout2}ms`);
            error4.retryable = true;
            error4.timeout = true;
            throw error4;
          }
          throw fetchError;
        }
      });
      return result;
    } catch (error4) {
      lastError = error4;
      console.error(`[Hardware Extractor] Attempt ${attempt}/${maxRetries} failed:`, error4.message);
      if (error4.retryable === false) {
        console.error("[Hardware Extractor] Error is not retryable, aborting");
        throw error4;
      }
      if (attempt === maxRetries) {
        console.error("[Hardware Extractor] Max retries reached, aborting");
        break;
      }
      const delay = retryDelays[attempt - 1];
      console.log(`[Hardware Extractor] Retrying in ${delay}ms...`);
      await new Promise((resolve2) => setTimeout(resolve2, delay));
    }
  }
  const finalError = new Error(`Claude API call failed after ${maxRetries} attempts: ${lastError.message}`);
  finalError.originalError = lastError;
  finalError.attempts = maxRetries;
  throw finalError;
}
export async function callClaudeVisionWithImage(imageBuffer, prompt, env2, pageNumber, sessionId, ownerMhsId) {
  let route = env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local";
  if (sessionId && env2.DB) {
    try {
      const row = await env2.DB.prepare(
        `SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (row?.extraction_route)
        route = row.extraction_route;
    } catch (e) {
      console.log(`[callClaudeVisionWithImage] route lookup failed for session ${sessionId}, defaulting api_direct: ${e.message}`);
    }
  }
  const isLocal = env2.WEYLAND_EDITION === "local";
  if (route === "claude_code_subprocess" && !isLocal)
    route = "api_direct";
  if (route === "claude_code_local" && isLocal)
    route = "api_direct";
  console.log(`[callClaudeVisionWithImage] page=${pageNumber} session=${sessionId || "none"} route=${route}`);
  if (route === "api_direct") {
    return _callClaudeVisionWithImage_apiDirect(imageBuffer, prompt, env2, pageNumber);
  }
  if (route === "claude_code_local") {
    return _callClaudeVisionWithImage_sabp(imageBuffer, prompt, env2, pageNumber, sessionId, ownerMhsId);
  }
  if (route === "claude_code_subprocess") {
    return _callClaudeVisionWithImage_localSubprocess(imageBuffer, prompt, env2, pageNumber);
  }
  console.warn(`[callClaudeVisionWithImage] unknown route "${route}", falling back to api_direct`);
  return _callClaudeVisionWithImage_apiDirect(imageBuffer, prompt, env2, pageNumber);
}

export async function _callClaudeVisionWithImage_sabp(imageBuffer, prompt, env2, pageNumber, sessionId, ownerMhsId) {
  const startTime = Date.now();
  let ownerId = ownerMhsId || null;
  if (!ownerId) {
    const owner = await env2.DB.prepare(
      `SELECT n.mhs_id FROM hardware_extraction_sessions s JOIN nodes n ON n.id = s.user_id WHERE s.id = ?`
    ).bind(sessionId).first();
    ownerId = owner?.mhs_id || null;
  }
  if (!ownerId) {
    throw new Error(`SABP route: no mhs_id for session ${sessionId}`);
  }
  const base64 = arrayBufferToBase643(imageBuffer);
  const _imgSource = await _imageSourceForQueue(base64, env2);
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: _imgSource },
      { type: "text", text: prompt }
    ]
  }];
  const _inf = resolveInferenceContract(env2);
  const queueOnce = async () => {
    const queueRes = await callEdge("POST", "/ai/v1/jobs/queue", env2, {
      owner_id: ownerId,
      venture_code: "weyland",
      model_hint: _inf.model,
      max_tokens: _inf.max_tokens,
      temperature: _inf.temperature,
      messages,
      metadata: {
        session_id: sessionId,
        page_number: pageNumber,
        kind: "hardware_schedule_page_extract"
      }
    });
    if (queueRes.status !== 200 || !queueRes.body?.job_id) {
      throw new Error(`SABP queue failed for page ${pageNumber}: ${JSON.stringify(queueRes.body || queueRes.status)}`);
    }
    return queueRes.body.job_id;
  };
  let jobId = await queueOnce();
  console.log(`[SABP] page=${pageNumber} job queued: ${jobId}`);
  const POLL_INTERVAL_MS = 1500;
  const POLL_BUDGET_MS = 54e4;
  const deadline = startTime + POLL_BUDGET_MS;
  let _retried = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await callEdge("GET", `/ai/v1/jobs/${encodeURIComponent(jobId)}`, env2);
    if (pollRes.status !== 200) {
      throw new Error(`SABP poll failed for job ${jobId}: ${pollRes.status}`);
    }
    const job = pollRes.body;
    if (job.status === "completed") {
      const text = job.result?.content?.[0]?.text || "";
      return {
        content: [{ type: "text", text }],
        model: job.result?.model || "claude-code-local",
        usage: job.result?.usage || { input_tokens: 0, output_tokens: 0 },
        provider_path: "claude_code_local",
        latency_ms: Date.now() - startTime
      };
    }
    if (job.status === "failed" || job.status === "error") {
      if (!_retried && deadline - Date.now() > 6e4) {
        _retried = true;
        console.warn(`[SABP] job ${jobId} failed (${JSON.stringify(job.error || {}).slice(0, 200)}) \u2014 requeueing once`);
        jobId = await queueOnce();
        console.log(`[SABP] page=${pageNumber} retry job queued: ${jobId}`);
        continue;
      }
      throw new Error(`SABP job ${jobId} failed: ${JSON.stringify(job.error || job)}`);
    }
  }
  throw new Error(`SABP per-page extraction timed out after ${POLL_BUDGET_MS}ms (page ${pageNumber}, job ${jobId})`);
}

export async function _callClaudeVisionWithImage_localSubprocess(imageBuffer, prompt, env2, pageNumber) {
  const startTime = Date.now();
  const base64 = arrayBufferToBase643(imageBuffer);
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: base64 } },
      { type: "text", text: prompt }
    ]
  }];
  const sidecar = env2.LOCAL_VISION_SIDECAR_URL || "http://127.0.0.1:9999";
  const r = await fetch(`${sidecar}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model_hint: "claude-opus-4-8", max_tokens: 4096 })
  });
  if (!r.ok)
    throw new Error(`Local sidecar unreachable for page ${pageNumber}: ${r.status}`);
  const result = await r.json();
  if (!result.success) {
    throw new Error(`Local sidecar error for page ${pageNumber}: ${JSON.stringify(result.error || result)}`);
  }
  const text = result.result?.content?.[0]?.text || "";
  return {
    content: [{ type: "text", text }],
    model: "claude-code-local",
    usage: { input_tokens: 0, output_tokens: 0 },
    provider_path: "claude_code_subprocess",
    latency_ms: Date.now() - startTime
  };
}

export async function _imageSourceForQueue(imageBase64, env2) {
  const INLINE_MAX = 115e4;
  const isPng = imageBase64.startsWith("iVBOR");
  const mediaType = isPng ? "image/png" : "image/jpeg";
  if (imageBase64.length <= INLINE_MAX || !env2.UPLOADS || !env2.JWT_SECRET) {
    return { type: "base64", media_type: mediaType, data: imageBase64 };
  }
  const bin = atob(imageBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    bytes[i] = bin.charCodeAt(i);
  const key = `jobimg/${crypto.randomUUID()}.${isPng ? "png" : "jpg"}`;
  await env2.UPLOADS.put(key, bytes, { httpMetadata: { contentType: mediaType } });
  const token = await generateJWT({ key }, env2.JWT_SECRET, 24e5);
  const origin = env2.APP_URL || "https://weyland.onamerica.org";
  console.log(`[Image Sidecar] ${(bytes.length / 1024).toFixed(0)}KB -> R2 ${key} (signed URL, full fidelity)`);
  return { type: "url", url: `${origin}/api/internal/r2-stream?token=${encodeURIComponent(token)}` };
}

export async function _callClaudeVisionWithImage_apiDirect(imageBuffer, prompt, env2, pageNumber) {
  const apiKey = env2.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error4 = new Error("ANTHROPIC_API_KEY not found in environment");
    error4.retryable = false;
    throw error4;
  }
  const base64Image = arrayBufferToBase643(imageBuffer);
  const imageSizeMB = (imageBuffer.byteLength / 1024 / 1024).toFixed(2);
  const mediaType = detectImageMediaType(imageBuffer);
  console.log(`[Hardware Extractor] Sending page ${pageNumber} image to Claude Vision (${imageSizeMB}MB ${mediaType})`);
  const timeout2 = 6e5;
  const maxRetries = 3;
  const retryDelays = [5e3, 1e4, 2e4];
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Hardware Extractor] Attempt ${attempt}/${maxRetries} - Calling Claude Vision with ${mediaType} image...`);
      const _inf = resolveInferenceContract(env2);
      const result = await claudeCircuitBreaker.execute(async () => {
        const requestBody = {
          model: _inf.model,
          max_tokens: _inf.max_tokens,
          temperature: _inf.temperature,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        };
        console.log("[Hardware Extractor] Request details:", {
          model: requestBody.model,
          max_tokens: requestBody.max_tokens,
          temperature: requestBody.temperature,
          image_size_mb: imageSizeMB,
          media_type: mediaType,
          prompt_size: prompt.length,
          timeout_ms: timeout2,
          attempt,
          page_number: pageNumber
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout2);
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "anthropic-version": "2023-06-01",
              "x-api-key": apiKey
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            let errorText = "";
            let errorJson = null;
            try {
              errorText = await response.text();
              if (errorText) {
                try {
                  errorJson = JSON.parse(errorText);
                } catch (e) {
                }
              }
            } catch (e) {
              errorText = "Failed to read error response";
            }
            console.error("[Hardware Extractor] API error status:", response.status);
            console.error("[Hardware Extractor] API error body:", errorJson || errorText);
            const error4 = new Error(`Claude API error: ${response.status} ${errorJson ? JSON.stringify(errorJson.error || errorJson) : errorText}`);
            error4.statusCode = response.status;
            error4.errorDetails = errorJson;
            error4.retryable = [429, 500, 502, 503, 504].includes(response.status);
            throw error4;
          }
          const data = await response.json();
          console.log(`[Hardware Extractor] API response received (${data.usage?.input_tokens || 0} input tokens, ${data.usage?.output_tokens || 0} output tokens)`);
          return data;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === "AbortError") {
            const error4 = new Error(`Request timeout after ${timeout2}ms`);
            error4.retryable = true;
            error4.timeout = true;
            throw error4;
          }
          throw fetchError;
        }
      });
      return result;
    } catch (error4) {
      lastError = error4;
      console.error(`[Hardware Extractor] Attempt ${attempt}/${maxRetries} failed:`, error4.message);
      if (error4.retryable === false) {
        console.error("[Hardware Extractor] Error is not retryable, aborting");
        throw error4;
      }
      if (attempt === maxRetries) {
        console.error("[Hardware Extractor] Max retries reached, aborting");
        break;
      }
      const delay = retryDelays[attempt - 1];
      console.log(`[Hardware Extractor] Retrying in ${delay}ms...`);
      await new Promise((resolve2) => setTimeout(resolve2, delay));
    }
  }
  const finalError = new Error(`Claude API call failed after ${maxRetries} attempts: ${lastError.message}`);
  finalError.originalError = lastError;
  finalError.attempts = maxRetries;
  throw finalError;
}

export async function callClaudeWithPdf(base64Pdf, prompt, env2, pageNumber) {
  const apiKey = env2.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  const requestBody = {
    model: "claude-opus-4-5-20251101",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf
            }
          },
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ]
  };
  console.log(`[Hardware Extractor] Calling Claude API with PDF document...`);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Hardware Extractor] Claude API error: ${response.status} ${errorText}`);
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}

export function resolveInferenceContract(env2) {
  return {
    model: env2.WEYLAND_INFERENCE_MODEL || "claude-opus-4-8",
    max_tokens: parseInt(env2.WEYLAND_MAX_TOKENS || "16000", 10) || 16e3,
    temperature: 0
  };
}
