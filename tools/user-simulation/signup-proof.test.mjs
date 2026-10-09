import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { NativeRouter } from "../../src/lib/router.js";
import { registerAuthSessionRoutes as registerMonolith } from "../../src/routes/auth-session.js";
import { registerAuthSessionRoutes as registerPlatform } from "../../weyland-platform-worker/src/routes/auth-session.js";
import { makeEnv } from "../../weyland-platform-worker/src/routes/webhooks-subscription.fixtures.mjs";

const home = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const source = home.slice(home.indexOf("    function upgradeFail("), home.indexOf("\n\n  })();", home.indexOf("    function upgradeFail(")));
const flush = () => new Promise(resolve => setImmediate(resolve));
async function until(fn) { for (let n = 0; n < 50; n++) { if (fn()) return; await flush(); } throw new Error("Signup fixture timed out"); }
function fixture({ proofRequired = true } = {}) {
  const nodes = Object.fromEntries(["upgrade-form", "upgrade-error", "upgrade-submit", "upgrade-done", "upgrade-proof", "upgrade-code", "upgrade-resend", "upgrade-email", "upgrade-password", "upgrade-name"].map(id => [id, { value: "", hidden: true, disabled: false, textContent: "", listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, focus() {}, appendChild() {} }]));
  nodes["upgrade-email"].value = "fixture@example.test";
  nodes["upgrade-password"].value = "fixture-password";
  const calls = [], completed = [];
  let proofCount = 0;
  const ctx = vm.createContext({ document: { getElementById: id => nodes[id], createElement: () => ({ addEventListener() {} }), createTextNode: () => ({}) },
    window: { WeylandShell: { completeSignup: async data => { completed.push(data); return { email: data.user.email }; } } },
    upgradeForm: nodes["upgrade-form"], upgradeError: nodes["upgrade-error"], upgradeSubmit: nodes["upgrade-submit"], upgradeDone: nodes["upgrade-done"],
    upgradeProofBox: nodes["upgrade-proof"], upgradeCode: nodes["upgrade-code"], upgradeResend: nodes["upgrade-resend"], upgradeProof: null, upgradeContinueTo: null,
    ephemeralToken: async () => "fixture-guest", closeUpgradeModal() {}, sessionStorage: { removeItem() {} }, EPHEMERAL_TOKEN_KEY: "guest", setTimeout() {},
    fetch: async (url, init) => {
      const body = JSON.parse(init.body); calls.push({ url, body });
      let status = 200, data;
      if (url.endsWith("/magic-link")) data = { sent: true, token: "proof-" + ++proofCount };
      else if (proofRequired && !body.email_code) { status = 202; data = { code: "EMAIL_CODE_REQUIRED", verification_required: true }; }
      else if (body.email_code && body.email_code.code !== "12345678") { status = 401; data = { error: "Wrong code", code: "CODE_INVALID" }; }
      else data = { token: "fixture-access", session_id: "fixture-session", refresh_token: "fixture-refresh", user: { email: body.email } };
      return { ok: status < 400, status, json: async () => data };
    },
  });
  vm.runInContext(source, ctx);
  const submit = () => nodes["upgrade-form"].listeners.submit({ preventDefault() {} });
  return { nodes, calls, completed, ctx, submit };
}

test("homepage grace signup completes in place without an email round trip", async () => {
  const f = fixture({ proofRequired: false }); f.submit();
  await until(() => f.completed.length === 1);
  assert.equal(f.calls.length, 1); assert.equal(f.nodes["upgrade-proof"].hidden, true);
});

test("homepage 202 opens inbox proof; wrong code is retryable and correct code preserves guest token and chosen password", async () => {
  const f = fixture(); f.submit();
  await until(() => !f.nodes["upgrade-submit"].disabled);
  assert.equal(f.completed.length, 0); assert.equal(f.nodes["upgrade-proof"].hidden, false);
  assert.equal(f.calls[1].body.purpose, "verify");
  f.nodes["upgrade-code"].value = "0000 0000"; f.submit();
  await until(() => !f.nodes["upgrade-submit"].disabled);
  assert.match(f.nodes["upgrade-error"].textContent, /Wrong code/);
  assert.equal(f.completed.length, 0);
  f.nodes["upgrade-code"].value = "1234 5678"; f.submit();
  await until(() => f.completed.length === 1);
  assert.equal(f.calls.at(-1).body.token, "fixture-guest");
  assert.equal(f.calls.at(-1).body.password, "fixture-password");
  assert.deepEqual(f.calls.at(-1).body.email_code, { token: "proof-1", code: "12345678" });
});

test("resend replaces proof, and editing the email cannot forward the old inbox code", async () => {
  const f = fixture(); f.submit(); await until(() => !f.nodes["upgrade-submit"].disabled);
  f.nodes["upgrade-resend"].listeners.click(); await until(() => !f.nodes["upgrade-resend"].disabled);
  assert.equal(f.ctx.upgradeProof.token, "proof-2");
  f.nodes["upgrade-code"].value = "12345678";
  f.nodes["upgrade-email"].value = "second@example.test"; f.submit();
  await until(() => !f.nodes["upgrade-submit"].disabled);
  const request = f.calls.filter(c => c.url === "/api/auth/ephemeral/upgrade").at(-1);
  assert.equal(Object.hasOwn(request.body, "email_code"), false);
  assert.equal(f.ctx.upgradeProof.email, "second@example.test");
  assert.equal(f.ctx.upgradeProof.token, "proof-3");
});

test("both actual guest-upgrade proxies carry inbox proof and preserve the 202 status/body", async () => {
  const realFetch = globalThis.fetch;
  try {
    for (const register of [registerPlatform, registerMonolith]) {
      const router = new NativeRouter(); register(router, { authenticate() {}, errorResponse() {} });
      const env = makeEnv(), calls = [];
      globalThis.fetch = async (_, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ code: "EMAIL_CODE_REQUIRED", verification_required: true }), { status: 202 }); };
      const email_code = { token: "fixture-proof", code: "12345678" };
      const result = await router.handle(new Request("https://weylandai.com/api/auth/ephemeral/upgrade", { method: "POST", body: JSON.stringify({ token: "guest", email: "fixture@example.test", password: "fixture-password", email_code }) }), env, {});
      assert.equal(result.status, 202); assert.equal((await result.json()).code, "EMAIL_CODE_REQUIRED");
      assert.deepEqual(calls[0].email_code, email_code);
    }
  } finally { globalThis.fetch = realFetch; }
});
