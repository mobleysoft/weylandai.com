import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Execute the actual shipped inline controller. Network close is deliberately
// held open; the regression was waiting for that callback to leave the room.
const html = readFileSync(new URL("meetingx.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("const state={started:"));
function fixture({ userMedia, displayMedia, ice } = {}) {
  const nodes = new Map(), events = new Map(), storage = new Map(), sockets = [], pcs = [];
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { textContent: "", innerHTML: "", hidden: false, dataset: {}, srcObject: null,
      classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, scrollIntoView() {}, appendChild() {}, querySelector: () => node(id + "-child"), remove() { nodes.delete(id); } });
    return nodes.get(id);
  };
  class Socket {
    constructor() { sockets.push(this); this.readyState = 1; this.sent = []; }
    close(code, reason) { this.closeArgs = [code, reason]; this.readyState = 2; }
    send(value) { this.sent.push(value); }
  }
  class Peer {
    constructor() { pcs.push(this); this.connectionState = "new"; }
    close() { this.connectionState = "closed"; }
    getTransceivers() { return []; }
    addTransceiver() {}
    async createOffer() { return {}; }
    async setLocalDescription(value) { this.localDescription = value; }
  }
  class Speech {
    constructor() { this.starts = 0; this.stops = 0; }
    start() { this.starts++; }
    stop() { this.stops++; this.onend?.(); }
  }
  const context = vm.createContext({
    document: { getElementById: node, querySelectorAll: () => [], body: { setAttribute() {} } },
    window: { RTCPeerConnection: Peer, SpeechRecognition: Speech, addEventListener: (k, fn) => events.set(k, fn), WeylandPage: { ready: Promise.resolve() } },
    navigator: { mediaDevices: { getUserMedia: userMedia, getDisplayMedia: displayMedia } },
    location: { search: "?room=usersim_lifecycle", protocol: "https:", host: "weylandai.com", origin: "https://weylandai.com" },
    history: { replaceState() {} }, sessionStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) },
    WebSocket: Socket, RTCPeerConnection: Peer, URLSearchParams, Date, setInterval() {}, setTimeout() {},
    fetch: async (url) => url.endsWith("/ice") && ice ? ice() : { ok: false, json: async () => ({}) },
    alert: () => { throw new Error("unexpected alert"); }
  });
  vm.runInContext(script, context);
  const run = (s) => vm.runInContext(s, context);
  const join = () => { run("connect({name:'Test'})"); sockets.at(-1).onopen(); return sockets.at(-1); };
  return { context, run, join, nodes, node, sockets, pcs, storage, events };
}
function stream(kinds) {
  const tracks = kinds.map((kind) => ({ kind, enabled: true, readyState: "live", stop() { this.readyState = "ended"; }, addEventListener() {} }));
  return { getTracks: () => tracks, getAudioTracks: () => tracks.filter((t) => t.kind === "audio"), getVideoTracks: () => tracks.filter((t) => t.kind === "video") };
}
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

test("leave immediately clears room, closes every peer and stops camera, mic, screen and transcription without waiting for socket close", () => {
  const f = fixture(); const socket = f.join();
  const camera = stream(["audio", "video"]), screen = stream(["audio", "video"]);
  f.context.camera = camera; f.context.screen = screen;
  f.run("state.camera=camera;state.display=screen;state.recognition=initSpeech();state.recording=true;globalThis.speech=state.recognition;peers.set('other',{pc:new RTCPeerConnection()});roomRoster=[{userId:'test',name:'Test'}];roomYouId='test'");
  f.storage.set("meetingx.joinAfterSignIn", JSON.stringify({ room: "usersim_lifecycle", at: Date.now() }));
  f.node("room-btn").onclick();
  assert.equal(f.node("room-status").textContent, "NOT CONNECTED");
  assert.equal(f.node("room-btn").textContent, "JOIN ROOM");
  assert.equal(f.run("connected"), false); assert.equal(f.run("roomSocket"), null); assert.equal(f.run("peers.size"), 0);
  assert.equal(f.pcs[0].connectionState, "closed");
  assert.ok([...camera.getTracks(), ...screen.getTracks()].every((t) => t.readyState === "ended"));
  assert.equal(f.run("state.camera"), null); assert.equal(f.run("state.display"), null);
  assert.equal(f.context.speech.stops, 1); assert.equal(f.context.speech.starts, 0);
  assert.equal(f.node("stage").srcObject, null); assert.equal(f.node("tile-local").hidden, true);
  assert.equal(f.node("media-status").textContent, "NOT IN A CALL");
  assert.equal(f.storage.has("meetingx.joinAfterSignIn"), false);
  assert.deepEqual(socket.closeArgs, [1000, "user left"]);
  f.events.get("weyland-auth")({ detail: { status: "signed-in" } });
  socket.onopen(); socket.onmessage({ data: JSON.stringify({ type: "roster", users: [{ userId: "old", name: "Old" }], you: "old" }) });
  assert.equal(f.sockets.length, 1); assert.equal(f.run("connected"), false); assert.equal(f.run("roomRoster.length"), 0);
});

test("delayed old socket callbacks cannot disconnect a deliberate fresh join", () => {
  const f = fixture(); const old = f.join(); f.run("leaveRoom()"); const current = f.join();
  old.onclose({ code: 1000 }); old.onopen();
  old.onmessage({ data: JSON.stringify({ type: "roster", users: [{ userId: "old", name: "Old" }], you: "old" }) });
  assert.equal(f.run("roomSocket"), current); assert.equal(f.run("connected"), true);
  assert.equal(f.node("room-status").textContent, "CONNECTED"); assert.equal(f.run("roomRoster.length"), 0);
});

test("camera permission completing after leave stops its new tracks and never reopens the local stage", async () => {
  const permission = deferred(), camera = stream(["audio", "video"]);
  const f = fixture({ userMedia: () => permission.promise }); f.join();
  const started = f.run("startMedia()"); f.run("leaveRoom()"); permission.resolve(camera); await started;
  assert.ok(camera.getTracks().every((t) => t.readyState === "ended"));
  assert.equal(f.run("state.camera"), null); assert.equal(f.node("stage").srcObject, null);
  assert.equal(f.node("media-status").textContent, "NOT IN A CALL");
});

test("screen selection completing after leave stops the display tracks", async () => {
  const permission = deferred(), screen = stream(["video"]);
  const f = fixture({ displayMedia: () => permission.promise }); f.join();
  const started = f.run("shareScreen()"); f.run("leaveRoom()"); permission.resolve(screen); await started;
  assert.equal(screen.getTracks()[0].readyState, "ended"); assert.equal(f.run("state.display"), null);
  assert.equal(f.node("stage").srcObject, null);
});

test("ICE lookup completing after leave cannot create a late peer", async () => {
  const response = deferred();
  const f = fixture({ ice: () => response.promise }); f.join();
  const started = f.run("callPeer({userId:'other',name:'Other'})"); f.run("leaveRoom()");
  response.resolve({ ok: true, json: async () => ({ iceServers: [] }) }); await started;
  assert.equal(f.pcs.length, 0); assert.equal(f.run("peers.size"), 0); assert.equal(f.run("connected"), false);
});
