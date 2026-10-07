// node --test weyland-cutsheetx-worker/test/
// A signed-in account may always do on CutsheetX what a guest may do (the platform's reference
// rule, weyland-platform-worker/src/lib/auth.js 239a768): its plan, status and usage counter only
// matter for products a guest cannot use. Checked live by a throwaway account before and after.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { requireProductAccess } from "../src/lib/auth.js";
import { sqliteD1 } from "./d1-sqlite.mjs";

const DB = sqliteD1([
  "CREATE TABLE users (id TEXT PRIMARY KEY, subscription_status TEXT, subscription_tier TEXT, products_enabled TEXT, submittals_used INTEGER, submittals_limit INTEGER, trial_ends_at TEXT);",
  "INSERT INTO users VALUES",
  "  ('lapsed', 'canceled', 'subx', 'subx', 0, 10, NULL),",
  "  ('used-up', 'active', 'cutsheetx', 'cutsheetx', 10, 10, NULL),",
  "  ('other-plan', 'active', 'huntx', 'huntx', 0, 999, NULL),",
  "  ('ended-trial', 'trial', 'starter', '', 0, 10, '2020-01-01T00:00:00Z');",
].join("\n"));
after(() => DB.database.close());
const env = { DB };
const codeOf = async (res) => (res ? (await res.json()).error.code : null);

test("guest-level CutsheetX passes for any signed-in account with a users row", async () => {
  for (const id of ["lapsed", "used-up", "other-plan", "ended-trial"]) {
    assert.equal(await requireProductAccess({ userId: id }, env, "cutsheetx"), null, id);
  }
});

test("a product a guest cannot use still follows the plan, its status and its usage", async () => {
  assert.equal(await codeOf(await requireProductAccess({ userId: "lapsed" }, env, "meetingx")), "SUBSCRIPTION_INACTIVE");
  assert.equal(await codeOf(await requireProductAccess({ userId: "used-up" }, env, "meetingx")), "USAGE_LIMIT_REACHED");
  assert.equal(await codeOf(await requireProductAccess({ userId: "other-plan" }, env, "meetingx")), "PRODUCT_NOT_ENABLED");
});

test("an identity without a users row is not let through by the guest floor", async () => {
  const res = await requireProductAccess({ userId: "nobody" }, env, "cutsheetx");
  assert.equal(res.status, 404);
  assert.equal(await codeOf(res), "NOT_FOUND");
});
