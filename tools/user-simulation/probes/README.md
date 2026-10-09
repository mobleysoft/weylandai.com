# Probes: SightX controls, measured in a real browser

Written 2026-10-09 on the Mac after John reported "wasd on desktop and the thumbstick nav on sightx did not work".
Each probe drives the live site in headless Chromium (GPU on with --use-angle=metal on a Mac; iPhone 13 emulation
for the phone cases) and prints JSON. They are the seed for the four controls journeys asked for in S0 of
docs/direction-2026-10-08.md.

- sightx-controls-probe2.mjs: weylandai.com/sightx/ (the app page). Captures the camera by extending three.min.js in
  flight (the camera lives in a closure), then measures W, D, S, mouse look, and on the phone the WALK button and
  one-finger look.
- sightx-controls-probe3.mjs: the same page aimed at the real canvas rectangle (it sits below the hero), plus a first
  look at the homepage shell path.
- sightx-controls-probe4.mjs: the homepage. Installs keydown, message and pointer counters inside the world frame
  (/sightx/?embed=bg) and checks what element covers the joystick.
- sightx-controls-probe5.mjs: the homepage on a phone after the first touch (the world mounts on first input), the
  stick's size, visibility and coverage, a drag on it, and on desktop the W key after clicking the HUD badge, the
  chapter, Enter and Escape.

Run: PLAYWRIGHT_CORE=/path/to/playwright-core OUT_DIR=/tmp/sightx-probe node tools/user-simulation/probes/sightx-controls-probe5.mjs

Results of 2026-10-09 08:17 to 08:27Z are tabulated in docs/direction-2026-10-08.md under S0.
