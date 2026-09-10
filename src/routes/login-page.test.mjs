import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerLoginPageRoutes } from "./login-page.js";

function setup() {
  const router = new NativeRouter();
  registerLoginPageRoutes(router);
  return { router, env: {} };
}

test("GET /login: real happy path serves the sign-in HTML page", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/login"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/html;charset=utf-8");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const text = await res.text();
  assert.match(text, /Sign In \| WeylandAI/);
  assert.match(text, /AuthForStandard/);
});

test("GET /login: real happy path echoes a safe same-origin redirect param", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/login?redirect=/dashboard"), env, {});
  const text = await res.text();
  assert.match(text, /location\.assign\("\/dashboard"\)/);
});

test("GET /login: real security behavior rejects an open-redirect and falls back to /subx", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/login?redirect=https://evil.example/phish"), env, {});
  const text = await res.text();
  assert.match(text, /location\.assign\("\/subx"\)/);
  assert.doesNotMatch(text, /evil\.example/);
});

test("GET /login: real security behavior rejects a protocol-relative redirect (//evil.example)", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/login?redirect=%2F%2Fevil.example"), env, {});
  const text = await res.text();
  assert.match(text, /location\.assign\("\/subx"\)/);
});

test("GET /login: defaults to /subx when no redirect param is given", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/login"), env, {});
  const text = await res.text();
  assert.match(text, /location\.assign\("\/subx"\)/);
});
