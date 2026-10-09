// Actual MeetingX media acceptance in two isolated Chromium contexts.
// Synthetic camera + generated audio only; no human devices. The normal run uses
// the public UI unchanged. A second diagnostic run forces iceTransportPolicy=relay
// on its test-only peer constructor to prove TURN separately from configuration.
// No SDP, IP addresses, device ids or TURN credentials are recorded.
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Journey, BASE, chromium, gpuRenderer, openHome, raiseDossier, signIn, pressIn, until, sleep, d1, q } from "./lib/journey-kit.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const J = new Journey("meetingx-media-acceptance", "MeetingX real bidirectional camera, microphone and TURN transport");
const local = path.join(root, ".local");
await mkdir(local, { recursive: true });
const audioPath = path.join(local, "meeting-media-" + J.suffix + ".wav");
// An eight-second sine wave. Chromium loops the capture file; no stored recording.
const samples = 48000 * 8;
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * 440 * i / 48000)), 44 + i * 2);
await writeFile(audioPath, wav, { mode: 0o600, flag: "wx" });

const args = ["--use-angle=metal", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-audio-capture=" + audioPath, "--autoplay-policy=no-user-gesture-required"];
J.launch = async () => {
  J.browser = await chromium.launch({ args });
  J.renderer = await gpuRenderer(J.browser);
  const renderer = J.renderer.renderer || "";
  J.check("browser has GPU WebGL", !!renderer && !/swiftshader/i.test(renderer), renderer);
  if (!renderer || /swiftshader/i.test(renderer)) throw new Error("real GPU WebGL required");
  return J.browser;
};
J.note("synthetic_devices", { camera: "Chromium moving test pattern", audio: "generated 440 Hz sine", human_devices: false });
J.note("launch_flags", args.map((x) => x.startsWith("--use-file-") ? "--use-file-for-fake-audio-capture=<temporary generated waveform>" : x));

async function instrument(ctx, relay) {
  await ctx.grantPermissions(["camera", "microphone"], { origin: BASE });
  await ctx.addInitScript(({ relay }) => {
    const Native = window.RTCPeerConnection;
    const probe = window.__meetingMediaProbe = { peers: [], configurations: [], streams: [] };
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => { const stream = await getUserMedia(...args); probe.streams.push(stream); return stream; };
    window.RTCPeerConnection = new Proxy(Native, {
      construct(target, argv) {
        const config = { ...(argv[0] || {}) };
        if (relay) config.iceTransportPolicy = "relay";
        const protocols = (config.iceServers || []).flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(Boolean)).map((u) => String(u).split(":")[0]);
        probe.configurations.push({ policy: config.iceTransportPolicy || "all", turn: protocols.some((p) => p === "turn" || p === "turns"), server_protocols: [...new Set(protocols)] });
        const pc = Reflect.construct(target, [config, ...argv.slice(1)]);
        probe.peers.push(pc);
        return pc;
      }
    });
  }, { relay });
}

async function mediaSnapshot(page) {
  return page.evaluate(async () => {
    const probe = window.__meetingMediaProbe || { peers: [], configurations: [] };
    const peers = [];
    for (const pc of probe.peers) {
      const row = { connection: pc.connectionState, ice: pc.iceConnectionState, signaling: pc.signalingState, inbound: [], selected: null };
      if (pc.connectionState !== "closed") {
        const stats = await pc.getStats();
        for (const s of stats.values()) {
          if (s.type === "inbound-rtp" && !s.isRemote) row.inbound.push({ kind: s.kind || s.mediaType, packets: s.packetsReceived || 0, bytes: s.bytesReceived || 0, lost: s.packetsLost || 0, framesDecoded: s.framesDecoded || 0, framesReceived: s.framesReceived || 0, audioEnergy: s.totalAudioEnergy || 0, audioDuration: s.totalSamplesDuration || 0 });
          if (s.type === "transport" && s.selectedCandidatePairId) {
            const pair = stats.get(s.selectedCandidatePairId);
            const l = pair && stats.get(pair.localCandidateId), r = pair && stats.get(pair.remoteCandidateId);
            row.selected = { state: pair && pair.state, local: l && l.candidateType, remote: r && r.candidateType, protocol: l && l.protocol, relayProtocol: l && l.relayProtocol, bytesReceived: pair && pair.bytesReceived, bytesSent: pair && pair.bytesSent };
          }
        }
      }
      peers.push(row);
    }
    const remote = Array.from(document.querySelectorAll(".tile:not(#tile-local) video")).map((v) => {
      let brightness = null;
      if (v.videoWidth && v.videoHeight) {
        const c = document.createElement("canvas"); c.width = 16; c.height = 16;
        const x = c.getContext("2d"); x.drawImage(v, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data;
        let total = 0; for (let i = 0; i < d.length; i += 4) total += d[i] + d[i + 1] + d[i + 2];
        brightness = total / (256 * 3);
      }
      return { width: v.videoWidth, height: v.videoHeight, ready: v.readyState, paused: v.paused, muted: v.muted, time: v.currentTime, brightness,
        tracks: v.srcObject ? v.srcObject.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled, state: t.readyState, muted: t.muted })) : [] };
    });
    const local = document.getElementById("stage");
    return { room: (document.getElementById("room-status") || {}).textContent, media: (document.getElementById("media-status") || {}).textContent, roster: document.querySelectorAll("#roster .item").length,
      configurations: probe.configurations, peers, remote, captured_tracks: (probe.streams || []).flatMap((s) => s.getTracks()).map((t) => ({ kind: t.kind, state: t.readyState })), local: local && local.srcObject ? local.srcObject.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled, state: t.readyState })) : [] };
  });
}
const active = (s) => s.peers.find((p) => p.connection === "connected");
const stream = (s, kind) => active(s)?.inbound.find((i) => i.kind === kind);
const flowing = (s) => stream(s, "audio")?.packets > 0 && stream(s, "audio")?.audioEnergy > 0 && stream(s, "video")?.framesDecoded > 0 && s.remote.some((v) => v.ready >= 2 && !v.paused && !v.muted && v.width > 0 && v.height > 0 && v.brightness > 5);

async function join(page, label) {
  await pressIn(page, "#room-btn");
  const ok = await until(() => page.evaluate(() => document.getElementById("room-status")?.textContent === "CONNECTED"), 20000, 250);
  J.check(label + " joins the actual production WebSocket room", !!ok, await mediaSnapshot(page));
  if (!ok) throw new Error(label + " cannot join room");
}

async function runPair(accounts, relay) {
  const mode = relay ? "forced TURN" : "normal transport";
  const room = "usersim_media_" + J.suffix + (relay ? "_relay" : "_normal");
  const contexts = [], pages = [];
  try {
    for (let i = 0; i < 2; i++) {
      const ctx = await J.context("desktop"); contexts.push(ctx);
      await instrument(ctx, relay);
      const page = await J.page(ctx); pages.push(page);
      page.on("dialog", (dialog) => dialog.dismiss());
      await openHome(page, J, mode + i);
      await raiseDossier(page);
      const signed = await signIn(page, accounts[i]);
      J.check(mode + " participant " + i + " signs in through the public UI", signed.auth === "signed-in", { auth: signed.auth, error: signed.error });
      if (signed.auth !== "signed-in") throw new Error("could not sign in");
      await page.goto(BASE + "/meetingx?room=" + encodeURIComponent(room), { waitUntil: "load" });
      await join(page, mode + " participant " + i);
      await pressIn(page, "#media-btn");
      const ready = await until(() => page.evaluate(() => document.getElementById("media-status")?.textContent === "IN THE CALL"), 15000, 250);
      J.check(mode + " participant " + i + " starts synthetic camera and microphone through CAM + MIC", !!ready, await mediaSnapshot(page));
    }
    const [a, b] = pages;
    const received = await until(async () => flowing(await mediaSnapshot(a)) && flowing(await mediaSnapshot(b)), 60000, 500);
    let first = await Promise.all(pages.map(mediaSnapshot));
    J.note(relay ? "relay_initial" : "normal_initial", first);
    J.check(mode + " both browsers receive audio RTP with nonzero energy and decode/render remote video", !!received, first.map((s) => ({ peers: s.peers, remote: s.remote })));
    await sleep(3000);
    const next = await Promise.all(pages.map(mediaSnapshot));
    J.note(relay ? "relay_after_3s" : "normal_after_3s", next);
    for (let i = 0; i < 2; i++) {
      const f = first[i], n = next[i];
      const growing = flowing(n) && stream(n, "audio").packets > (stream(f, "audio")?.packets || 0) && stream(n, "audio").audioEnergy > (stream(f, "audio")?.audioEnergy || 0) && stream(n, "video").framesDecoded > (stream(f, "video")?.framesDecoded || 0) && n.remote[0]?.time > (f.remote[0]?.time || 0);
      J.check(mode + " participant " + i + " continues receiving moving video and audible samples", growing, { first: f.peers, next: n.peers });
      if (relay) J.check("participant " + i + " selected ICE pair actually uses TURN relay", active(n)?.selected?.local === "relay" && active(n)?.selected?.remote === "relay", active(n)?.selected || n.peers);
    }
    if (received && !relay) {
      // Disable the real outgoing tracks via the actual controls, then observe the other browser.
      await pressIn(a, "#mute-btn"); await pressIn(a, "#cam-btn");
      await sleep(1800);
      const mutedFirst = await mediaSnapshot(b); await sleep(3000);
      const mutedNext = await mediaSnapshot(b);
      const sender = await mediaSnapshot(a);
      J.note("normal_muted_receiver", { first: mutedFirst, next: mutedNext, sender });
      J.check("MUTE and CAMERA OFF disable both sender tracks", sender.local.length === 2 && sender.local.every((t) => !t.enabled && t.state === "live"), sender.local);
      const normalEnergy = stream(next[1], "audio").audioEnergy - stream(first[1], "audio").audioEnergy;
      const mutedEnergy = (stream(mutedNext, "audio")?.audioEnergy || 0) - (stream(mutedFirst, "audio")?.audioEnergy || 0);
      J.check("other browser receives silent audio and black video while sender is muted", mutedEnergy <= normalEnergy * 0.1 + 0.000001 && mutedNext.remote.some((v) => v.brightness != null && v.brightness < 5), { normal_energy_delta: normalEnergy, muted_energy_delta: mutedEnergy, remote: mutedNext.remote });
      await pressIn(a, "#mute-btn"); await pressIn(a, "#cam-btn");
      const resumed = await until(async () => {
        const s = await mediaSnapshot(b);
        return flowing(s) && stream(s, "audio").audioEnergy > (stream(mutedNext, "audio")?.audioEnergy || 0);
      }, 15000, 500);
      J.check("UNMUTE and CAMERA ON restore actual remote sound and video without reopening the room", !!resumed, await mediaSnapshot(b));
    }
    await pressIn(b, "#room-btn");
    const left = await until(() => a.evaluate(() => document.querySelectorAll("#roster .item").length === 1 && document.querySelectorAll(".tile:not(#tile-local)").length === 0), 15000, 250);
    J.check(mode + " leaving removes the remote participant and closes peer media", !!left, await mediaSnapshot(a));
    await pressIn(a, "#room-btn");
    const leftA = await until(() => a.evaluate(() => document.getElementById("room-status")?.textContent === "NOT CONNECTED"), 2000, 100);
    const leftState = await Promise.all(pages.map(mediaSnapshot));
    J.note(relay ? "relay_after_leave" : "normal_after_leave", leftState);
    J.check(mode + " both participants leave the owned room promptly", !!leftA && leftState.every((s) => s.room === "NOT CONNECTED"), leftState);
    J.check(mode + " leaving stops every camera/microphone track and peer connection", leftState.every((s) => s.local.length === 0 && s.captured_tracks.length === 2 && s.captured_tracks.every((t) => t.state === "ended") && s.peers.every((p) => p.connection === "closed") && s.remote.length === 0), leftState);
    await sleep(1200);
    const settled = await Promise.all(pages.map(mediaSnapshot));
    J.check(mode + " stays left without reconnecting or restarting media", settled.every((s) => s.room === "NOT CONNECTED" && s.media === "NOT IN A CALL" && s.peers.every((p) => p.connection === "closed") && s.captured_tracks.every((t) => t.state === "ended")), settled);
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => {});
    // No notes/chat were created. Check explicitly that these test-only rooms have no D1 items.
    const [r] = await d1("SELECT COUNT(*) AS n FROM meetingx_room_items WHERE room=" + q(room) + ";");
    J.check(mode + " owned room has no retained record items", r?.results?.[0]?.n === 0, { retained_items: r?.results?.[0]?.n });
  }
}

// Journey.run exits, so waveform deletion belongs to the body's own finally.
await J.run(async () => {
  try {
    await J.launch();
    const accounts = [await J.account("meet-media-a"), await J.account("meet-media-b")];
    await runPair(accounts, false);
    await runPair(accounts, true);
  } finally { await unlink(audioPath).catch(() => {}); }
});
