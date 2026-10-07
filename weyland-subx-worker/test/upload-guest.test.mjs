// POST /api/hardware-schedule/start from a guest session (AuthFor ephemeral,
// no users row): refused with SIGN_IN_REQUIRED before anything is stored.
// Before 2026-10-07 the file was written to KV and R2 under
// hardware-sessions/null/ and the session insert then failed with a 500.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { requireActiveSubscription } from "../src/lib/auth.js";
import { registerHardwareScheduleExtractRoutes } from "../src/routes/hardware-schedule-extract.js";
import { createExtractionSession } from "../src/lib/hardware-extraction-pipeline.js";
import { detectFileType, logTelemetryEvent } from "../src/lib/edge-telemetry.js";
import { extractPdfBookmarks2 } from "../src/lib/hardware-extraction-single-page.js";
import { detectSchedulePages } from "../src/lib/hardware-extraction-prompts.js";

test("a guest upload is refused before KV, R2 or D1 are touched", async () => {
  const writes = [];
  const env = {
    DB: { prepare() { writes.push("d1"); throw new Error("no database call expected"); } },
    CACHE: { async put(k) { writes.push("kv " + k); }, async get() { return null; } },
    UPLOADS: { async put(k) { writes.push("r2 " + k); } },
  };
  const guest = { ephemeral: true, userId: null, id: "eph_x", tenantId: "ven_weyland", tenant_id: "ven_weyland" };
  const router = new NativeRouter();
  registerHardwareScheduleExtractRoutes(router, {
    authenticate: async () => ({ user: guest }),
    requireActiveSubscription, detectFileType, extractPdfBookmarks2, detectSchedulePages, createExtractionSession, logTelemetryEvent,
  });
  const form = new FormData();
  form.set("file", new File([new TextEncoder().encode("%PDF-1.7\n%%EOF\n")], "guest.pdf", { type: "application/pdf" }));
  form.set("document_type", "door_schedule");
  const res = await router.handle(new Request("https://weylandai.com/api/hardware-schedule/start", { method: "POST", body: form }), env, {});
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.code, "SIGN_IN_REQUIRED");
  assert.deepEqual(writes, []);
});
