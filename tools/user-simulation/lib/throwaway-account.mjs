// lib/throwaway-account.mjs
//
// Creates/deletes a real, throwaway logged-in weylandai.com account
// directly in production D1, for testing products NOT covered by the
// AuthFor ephemeral-trial allowlist (PropX, HuntX, MeetingX -
// EPHEMERAL_TRIAL_PRODUCTS in src/lib/auth.js is only subx/takeoffx/
// cutsheetx/sightx). Same real technique already used and documented
// live tonight in EXTRACTION_PIPELINE_CUSTOMER_PATH.md ("Then created a
// throwaway real users + weyland_sessions row... deleted both rows
// immediately after") - not a new invention, a repeat of an
// already-proven, already-safe pattern.
//
// subscription_tier is set to 'subconp' (the full-suite tier) so
// requireProductAccess's per-product gate short-circuits true for every
// product (src/lib/auth.js: `if (row.subscription_tier === "subconp")
// return null`) - this harness is testing product FLOWS, not the billing
// gate itself, so a full-access test account is the right fixture, same
// as the precedent test account used tonight.
//
// Every id/email is prefixed "usersim_" / "user-sim-" so a stray row left
// behind by a crashed run is trivially identifiable and safe to clean up
// by hand (`DELETE FROM users WHERE id LIKE 'usersim_%'`) - not
// interchangeable with any real customer's row.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// tools/user-simulation/lib/ -> tools/user-simulation/ -> tools/ -> repo root.
const REPO_ROOT = new URL("../../../", import.meta.url).pathname;

async function d1Exec(sql) {
  const { stdout } = await execFileP(
    "npx",
    ["wrangler", "d1", "execute", "weyland_db", "--remote", "--command", sql, "--json"],
    { cwd: REPO_ROOT, maxBuffer: 20 * 1024 * 1024 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0];
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * @param {string} label - short tag identifying which check created this
 *   account (shows up in the user's `name` column for easy auditing).
 * @returns {Promise<{userId:string, sessionId:string, email:string, cookie:string}>}
 */
export async function createThrowawayAccount(label) {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const userId = `usersim_${suffix}`;
  const sessionId = `usersim_sess_${suffix}`;
  const email = `user-sim-${suffix}@weylandai.com`;
  const name = sqlEscape(`User Simulation Harness (${label})`);

  const insertUser = `INSERT INTO users (id, email, name, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled) VALUES ('${userId}','${email}','${name}','ven_weyland','subconp','active',0,999,'subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx');`;
  const insertSession = `INSERT INTO weyland_sessions (id, user_id, email, expires_at) VALUES ('${sessionId}','${userId}','${email}', datetime('now','+3 hours'));`;

  const userResult = await d1Exec(insertUser);
  if (!userResult.success) {
    throw new Error(`Failed to insert throwaway user: ${JSON.stringify(userResult)}`);
  }
  const sessionResult = await d1Exec(insertSession);
  if (!sessionResult.success) {
    // Best-effort rollback of the user row so a failed session insert
    // doesn't strand an orphaned account.
    await d1Exec(`DELETE FROM users WHERE id='${userId}';`).catch(() => {});
    throw new Error(`Failed to insert throwaway session: ${JSON.stringify(sessionResult)}`);
  }

  return { userId, sessionId, email, cookie: `weyland_session=${sessionId}` };
}

/** Always call this in a `finally` - real production rows, must not be left behind. */
export async function deleteThrowawayAccount(account) {
  if (!account) return { deleted: false };
  const errors = [];
  try {
    await d1Exec(`DELETE FROM weyland_sessions WHERE id='${account.sessionId}';`);
  } catch (e) {
    errors.push(`session delete failed: ${e.message}`);
  }
  try {
    await d1Exec(`DELETE FROM users WHERE id='${account.userId}';`);
  } catch (e) {
    errors.push(`user delete failed: ${e.message}`);
  }
  return { deleted: errors.length === 0, errors: errors.length ? errors : undefined };
}

/** Read-only helper some checks use to verify real downstream data (e.g. door_entries rows). */
export async function d1Query(sql) {
  return d1Exec(sql);
}
