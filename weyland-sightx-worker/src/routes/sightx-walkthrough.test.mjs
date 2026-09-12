import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSightXWalkthroughRoutes } from "./sightx-walkthrough.js";

function makeRequest(body) {
  return new Request("https://example.com/api/sightx/walkthrough-preview", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function setup(filmlineHandler) {
  const router = new NativeRouter();
  registerSightXWalkthroughRoutes(router);
  const env = { FILMLINE_VIDEO: filmlineHandler ? { fetch: filmlineHandler } : undefined };
  return { router, env };
}

test("missing/invalid JSON body is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/sightx/walkthrough-preview", { method: "POST" }), env, {});
  assert.equal(res.status, 400);
});

test("empty description is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(makeRequest({ description: "   " }), env, {});
  assert.equal(res.status, 400);
});

test("no FILMLINE_VIDEO binding is a real 500, not a crash", async () => {
  const router = new NativeRouter();
  registerSightXWalkthroughRoutes(router);
  const res = await router.handle(makeRequest({ description: "a real project" }), {}, {});
  assert.equal(res.status, 500);
});

test("real happy path: reshapes filmline-video-worker's response, escapes the logline", async () => {
  const { router, env } = setup(async () => new Response(JSON.stringify({
    title: "The Building",
    logline: `A <b>"grand"</b> lobby`,
    scenes: [{ description: "Scene one" }, { description: "Scene two" }],
    video: { svg: "<svg></svg>", total_seconds: 18 },
  }), { status: 200 }));
  const res = await router.handle(makeRequest({ description: "a real project" }), env, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.title, "The Building");
  assert.equal(data.logline_escaped, `A &lt;b&gt;&quot;grand&quot;&lt;/b&gt; lobby`);
  assert.equal(data.scene_count, 2);
  assert.equal(data.total_seconds, 18);
  assert.deepEqual(data.narration_lines, [`A <b>"grand"</b> lobby`, "Scene one", "Scene two"]);
});

test("upstream failure (non-ok or missing svg) is a real 502", async () => {
  const { router, env } = setup(async () => new Response(JSON.stringify({ error: "upstream broke" }), { status: 500 }));
  const res = await router.handle(makeRequest({ description: "a real project" }), env, {});
  assert.equal(res.status, 502);
});

test("a thrown network error from the binding is caught into a real 502, not an unhandled rejection", async () => {
  const { router, env } = setup(async () => { throw new Error("connection reset"); });
  const res = await router.handle(makeRequest({ description: "a real project" }), env, {});
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.match(body.detail.message, /connection reset/);
});
