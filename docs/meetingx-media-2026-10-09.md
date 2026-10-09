# MeetingX media acceptance and leave repair — 2026-10-09

## Actual production evidence

The untouched production page ran in two isolated Chromium contexts on Apple Metal, using a generated 440 Hz audio waveform and Chromium’s moving camera pattern. No human camera or microphone was accessed. The receipt is `meetingx-media-2026-10-09-before.json` (22:21:08–22:22:26 UTC).

- Both directions received increasing audio RTP packets with nonzero decoded audio energy, and increasing video frame counts. The remote video elements were playing, unmuted and displaying nonblack frames.
- Normal ICE used host / peer-reflexive UDP candidates. A separate diagnostic run forced `iceTransportPolicy=relay` in the test-only peer constructor; both browsers selected relay ↔ relay UDP pairs and received audio/video. This proves TURN transport, beyond the presence of configuration.
- MUTE and CAMERA OFF disabled the sender tracks and produced silent audio and black video at the other browser. UNMUTE / CAMERA ON restored media without reopening the room.
- The other member saw departure and closed its peer. The leaving browser remained CONNECTED for more than ten seconds and retained live camera/microphone tracks. The receipt therefore records 29 passed, 2 failed.
- Owned cleanup deleted 140 rows, with zero remaining users, sessions, extraction sessions or projects. Neither test room retained record items. Two throwaway AuthFor identities remain because the harness has no identity-deletion API. One unrelated demo-clone request returned429; cleanup handled all clones actually received.

## Repair

LEAVE ROOM now clears local connection state and stops camera, microphone, display and speech recognition immediately, before waiting for the WebSocket close handshake. Replaced sockets cannot change a later connection. Camera/display permissions and ICE lookups completing after leave cannot restart capture or create a late peer.

The five lifecycle regressions execute the actual inline controller with the WebSocket close callback withheld. All five fail against the pre-fix controller and pass with the repair. Full MeetingX worker test results and browser acceptance after deployment are recorded separately when available.

## Scope

This is a two-member Chromium desktop test on one Mac with real production signaling and real direct/TURN media. It does not establish six-member capacity, Safari/phone behavior, a second physical network, screen-share delivery, browser speech-transcription quality or meeting-record/export correctness. Existing room/chat/record checks cover their own separate scope. No shared Durable Object, DNS, TURN credential, AuthFor authority or live session was changed for this repair.

Reproduce with Node22 and `PLAYWRIGHT_CORE` set to the installed Playwright package: `node tools/user-simulation/meeting-media-acceptance.mjs`. The harness uses existing Cloudflare environment credentials only for its own test rows and cleanup, and deletes its generated waveform in finally. Reports exclude SDP, IP addresses, device ids and TURN credentials.
