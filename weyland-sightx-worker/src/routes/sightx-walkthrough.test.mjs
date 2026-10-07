import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSightXWalkthroughRoutes } from "./sightx-walkthrough.js";
import { buildWalkthrough } from "../lib/walkthrough-builder.js";

// The journey's own description (tools/user-simulation/journeys/sightx-corridor.mjs).
const CORRIDOR = "Ground-floor corridor of a medical office: eight hollow-metal doors, one exit pair with panic devices.";

function makeRequest(body) {
  return new Request("https://example.com/api/sightx/walkthrough-preview", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// A stand-in for filmline-video-worker that holds callers to its real
// POST /api/render contract (filmline.cc/video-worker/index.js): title
// <= 160, logline <= 600, 1-24 scenes numbered 1..n, each description
// <= 700. Records every call so a test can see what was asked for.
function renderStub(calls, override) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    if (override) return override(url, init);
    const path = new URL(String(url)).pathname;
    if (path !== "/api/render" || init?.method !== "POST") return new Response(JSON.stringify({ detail: { message: "not found" } }), { status: 404 });
    const body = JSON.parse(init.body);
    const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
    if (!text(body.title, 160) || !text(body.logline, 600) || !Array.isArray(body.scenes) || body.scenes.length < 1 || body.scenes.length > 24
      || body.scenes.some((s, i) => s?.scene_number !== i + 1 || !text(s.description, 700))) {
      return new Response(JSON.stringify({ error: "A title, logline and 1-24 sequential scenes are required" }), { status: 422 });
    }
    return new Response(JSON.stringify({
      title: body.title, logline: body.logline, scenes: body.scenes,
      video: { format: "animated-svg-storyboard", scene_seconds: 4.5, total_seconds: body.scenes.length * 4.5, svg: "<svg data-scenes=\"" + body.scenes.length + "\"></svg>" },
    }), { status: 200 });
  };
}

function setup(override) {
  const calls = [];
  const router = new NativeRouter();
  registerSightXWalkthroughRoutes(router);
  const env = { FILMLINE_VIDEO: { fetch: renderStub(calls, override) } };
  return { router, env, calls };
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

test("the walkthrough is built here and only drawn by /api/render: no /api/generate, no model", async () => {
  const { router, env, calls } = setup();
  const res = await router.handle(makeRequest({ description: CORRIDOR }), env, {});
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/render");
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.accent, "#f0b800");
  const data = await res.json();
  assert.match(data.source, /no model/);
  assert.match(data.source, /\/api\/render/);
  assert.equal(data.title, sent.title);
  assert.equal(data.scene_count, sent.scenes.length);
  assert.equal(data.total_seconds, sent.scenes.length * 4.5);
  assert.equal(data.svg, "<svg data-scenes=\"" + sent.scenes.length + "\"></svg>");
  assert.deepEqual(data.narration_lines, [sent.logline, ...sent.scenes.map((s) => s.description)]);
  assert.deepEqual(data.scenes, sent.scenes);
});

test("the journey's corridor: the setting, nine openings, the exit pair's panic devices, nothing invented", async () => {
  const { router, env } = setup();
  const data = await (await router.handle(makeRequest({ description: CORRIDOR }), env, {})).json();
  assert.equal(data.title, "Walkthrough: Ground-Floor Corridor of a Medical Office");
  assert.match(data.logline_escaped, /stopping at 9 openings: eight hollow-metal doors and one exit pair with panic devices\./);
  assert.deepEqual(data.walk.openings.map((o) => [o.text, o.count, o.pair, o.hardware]), [
    ["eight hollow-metal doors", 8, false, []],
    ["one exit pair", 1, true, ["panic devices"]],
  ]);
  assert.equal(data.walk.opening_total, 9);
  assert.deepEqual(data.walk.spaces, ["Ground-floor corridor"]);
  const lines = data.scenes.map((s) => s.description);
  assert.match(lines[0], /^Arrive at the ground-floor corridor of a medical office\. 9 openings on this walk\.$/);
  assert.equal(lines[1], "Walk the ground-floor corridor.");
  assert.match(lines[2], /^Stop at the eight hollow-metal doors\. The description names no hardware for them/);
  assert.match(lines[3], /^Stop at the exit pair\. A pair: two leaves\. Hardware named: panic devices\.$/);
  assert.match(lines.at(-1), /^End of the walk: 9 openings across 1 space\./);
  // Only words the visitor wrote: no hardware the description does not name.
  for (const word of ["closer", "hinge", "lockset", "kick plate", "card reader"]) {
    assert.ok(!lines.join(" ").toLowerCase().includes(word), word + " was invented");
  }
});

test("two different descriptions give two different titles and walks; the same one gives the same walk", () => {
  const a = buildWalkthrough("A 40,000 sqft mixed-use retail and office building with a central atrium and rooftop terrace.");
  const b = buildWalkthrough("A single-story rural fire station with two apparatus bays and a small dormitory wing.");
  assert.equal(a.title, "Walkthrough: 40,000 sq ft Mixed-Use Retail and Office Building");
  assert.equal(b.title, "Walkthrough: Single-Story Rural Fire Station");
  assert.deepEqual(a.walk.spaces, ["a central atrium", "rooftop terrace"]);
  assert.deepEqual(b.walk.spaces, ["two apparatus bays", "a small dormitory wing"]);
  assert.notDeepEqual(a.scenes, b.scenes);
  assert.deepEqual(buildWalkthrough(CORRIDOR), buildWalkthrough(CORRIDOR));
});

test("hardware and ratings go with the opening they belong to, in the order written", () => {
  const w = buildWalkthrough("Two-story medical office corridor with 12 hollow-metal doors, closers and lever locksets, a 90-minute stair door, and an exit pair with panic hardware.");
  assert.deepEqual(w.walk.openings.map((o) => [o.text, o.count, o.hardware, o.ratings]), [
    ["12 hollow-metal doors", 12, ["closers", "lever locksets"], []],
    ["a 90-minute stair door", 1, [], ["90-minute"]],
    ["an exit pair", 1, ["panic hardware"], []],
  ]);
  assert.equal(w.walk.opening_total, 14);
  const lines = w.scenes.map((s) => s.description);
  assert.equal(lines[1], "Walk the length of the corridor.");
  assert.match(lines[3], /^Stop at the 90-minute stair door\. The description names no hardware for it/);
});

test("door-schedule rows are openings with their hardware sets", () => {
  const w = buildWalkthrough("101 HM 3070 HW-1, 102 HM 3070 HW-2, 103 WD 3070 HW-3");
  assert.equal(w.title, "Walkthrough: Door Schedule, Doors 101 to 103");
  assert.deepEqual(w.walk.openings.map((o) => o.text), [
    "door 101 (HM 3070, hardware set HW-1)",
    "door 102 (HM 3070, hardware set HW-2)",
    "door 103 (WD 3070, hardware set HW-3)",
  ]);
  assert.equal(w.scenes[1].description, "Stop at door 101 (HM 3070, hardware set HW-1).");
});

test("a description with nothing recognisable still walks its own clauses, and asks for what is missing", () => {
  const w = buildWalkthrough("lorem ipsum dolor sit amet, consectetur adipiscing elit");
  assert.deepEqual(w.scenes.map((s) => s.description), [
    "Arrive at the lorem ipsum dolor sit amet.",
    "Next: consectetur adipiscing elit.",
    "End of the walk. Name the spaces, doors and hardware (for example \"a lobby, two stair doors with closers\") and the walk stops at each one.",
  ]);
});

test("a long description stays inside the renderer's limits: <= 16 numbered scenes, short title and logline", () => {
  const long = "Hospital east wing: " + Array.from({ length: 40 }, (_, i) => "room " + (200 + i) + " with a wood door and a privacy lockset").join(", ") + ".";
  const w = buildWalkthrough(long);
  assert.ok(w.scenes.length <= 16 && w.scenes.length >= 3);
  w.scenes.forEach((s, i) => { assert.equal(s.scene_number, i + 1); assert.ok(s.description.length <= 700); });
  assert.ok(w.title.length <= 160 && w.logline.length <= 600);
  assert.match(w.scenes.at(-2).description, /^Also on this walk: /);
});

test("the logline is escaped for the page; the narration keeps the visitor's words", async () => {
  const { router, env } = setup();
  const data = await (await router.handle(makeRequest({ description: "<b>Lobby</b> with a pair of aluminum storefront doors" }), env, {})).json();
  assert.ok(!data.logline_escaped.includes("<b>"));
  assert.match(data.logline_escaped, /&lt;b&gt;/);
  assert.match(data.narration_lines[0], /<b>/);
});

test("renderer failure (non-ok or missing svg) is a real 502", async () => {
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
