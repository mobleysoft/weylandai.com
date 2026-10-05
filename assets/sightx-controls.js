(function () {
  'use strict';

  const profile = Object.freeze({
    id: 'weyland-sightx-standard',
    version: '3.0.0',
    // Free-flight (Descent-style) 6DOF scheme: this facility is in zero-g
    // orbit, so ground-locked FPS movement never matched the setting.
    // Mouse yaw/pitch, Q/E roll, WASD local-axis translate, Space/Ctrl
    // local-axis vertical thrust. Scan moved off E/Space (now roll/thrust)
    // onto F.
    desktop: Object.freeze({
      forward: Object.freeze(['KeyW', 'ArrowUp']),
      backward: Object.freeze(['KeyS', 'ArrowDown']),
      left: Object.freeze(['KeyA', 'ArrowLeft']),
      right: Object.freeze(['KeyD', 'ArrowRight']),
      up: Object.freeze(['Space']),
      down: Object.freeze(['ControlLeft', 'ControlRight']),
      rollLeft: Object.freeze(['KeyQ']),
      rollRight: Object.freeze(['KeyE']),
      sprint: Object.freeze(['ShiftLeft', 'ShiftRight']),
      scan: Object.freeze(['KeyF']),
      brake: Object.freeze(['KeyX']),
      tour: 'KeyT',
      settings: 'KeyO',
      report: 'KeyR',
      view: 'KeyV',
      release: 'Escape'
    }),
    // Real Newtonian zero-g thrust: these are ACCELERATIONS (m/s^2) applied
    // while a direction is held, not velocities - see update() below.
    // Active flight braking (Inertial Dampener) on KeyX provides exponential
    // deceleration to bring the astronaut to a full stop, while gentle
    // natural stabilization damping prevents uncontrollable runaway drift
    // when coasting without thrust.
    // maxSpeed models the unit's finite RCS propellant budget (a real cap
    // on accumulated delta-v, not an arbitrary speed limiter) - it only
    // clips velocity AFTER a burst adds to it, it never decays existing
    // velocity on its own.
    movement: Object.freeze({ accel: 6.0, sprintAccel: 13.0, maxSpeed: 16.0, collisionStep: 0.08, roll: 1.6 }),
    // Walking profile (used whenever the host's groundY() says we stand on a
    // floor): a person, not a spacecraft. Fast to start, fast to stop, no
    // vertical thrust, sprint is a jog. Tuned for a thumb on a phone.
    walk: Object.freeze({ accel: 22.0, sprintAccel: 34.0, maxSpeed: 2.4, sprintSpeed: 4.6, stopDamp: 0.0008 }),
    look: Object.freeze({ mouse: 0.0022, touch: 0.0040 }),
    bounds: Object.freeze({ minX: -50.0, maxX: 50.0, minY: 0.2, maxY: 30.0, minZ: -50.0, maxZ: 50.0 })
  });

  // Rodrigues' rotation formula: rotate unit vector v around unit axis a by
  // angle (radians). Used to update the flight basis incrementally every
  // frame instead of storing Euler yaw/pitch/roll, so roll is a first-class
  // rotation with no gimbal lock - the same approach a real spacecraft/
  // Descent-style controller uses.
  function rotateAroundAxis(v, a, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dot = v[0] * a[0] + v[1] * a[1] + v[2] * a[2];
    const cx = a[1] * v[2] - a[2] * v[1];
    const cy = a[2] * v[0] - a[0] * v[2];
    const cz = a[0] * v[1] - a[1] * v[0];
    return [
      v[0] * cos + cx * sin + a[0] * dot * (1 - cos),
      v[1] * cos + cy * sin + a[1] * dot * (1 - cos),
      v[2] * cos + cz * sin + a[2] * dot * (1 - cos)
    ];
  }
  function normalize3(v) {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }
  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function basisFromYawPitch(yaw, pitch) {
    const fwd = normalize3([Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]);
    let up = [0, 1, 0];
    let right = normalize3(cross3(up, fwd));
    // Guard against fwd parallel to world-up (looking straight up/down).
    if (!Number.isFinite(right[0]) || Math.hypot(right[0], right[1], right[2]) < 1e-5) {
      right = [1, 0, 0];
    }
    up = normalize3(cross3(fwd, right));
    return { fwd, up };
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const includes = (codes, code) => codes.indexOf(code) !== -1;
  const SETTINGS_KEY = 'weyland-sightx-controls-v2';
  const canonicalSettings = Object.freeze({
    mouseSensitivity: profile.look.mouse,
    touchSensitivity: profile.look.touch,
    moveScale: 1,
    quality: 'auto',
    highContrast: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    haptics: true,
    audio: true,
    floatingStick: true
  });
  const canonicalBindings = Object.freeze({
    forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD',
    sprint: 'ShiftLeft', scan: 'KeyF', brake: 'KeyX'
  });

  function loadPreferences() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        settings: { ...canonicalSettings, ...(stored.settings || {}) },
        bindings: { ...canonicalBindings, ...(stored.bindings || {}) }
      };
    } catch (_) {
      return { settings: { ...canonicalSettings }, bindings: { ...canonicalBindings } };
    }
  }

  function labelForCode(code) {
    const aliases = {
      ShiftLeft: 'L SHIFT', ShiftRight: 'R SHIFT', Space: 'SPACE',
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT'
    };
    return aliases[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
  }

  function buildTouchUI() {
    const root = document.createElement('div');
    root.id = 'sightx-touch-ui';
    root.setAttribute('aria-label', 'SightX mobile controls');
    root.innerHTML = `
      <div class="sx-scan-sweep"></div>
      <div class="sx-mobile-brand"><b>WEYLANDAI</b><span>SIGHTX / FACILITY 01</span></div>
      <div class="sx-look-zone" aria-label="Drag to look"></div>
      <div class="sx-crosshair" aria-hidden="true"></div>
      <div class="sx-move-zone" aria-label="Movement control area"><div class="sx-stick" aria-label="Movement joystick"><div class="sx-stick-knob"></div></div></div>
      <div class="sx-actions">
        <button class="sx-action sprint" type="button" aria-label="Hold to sprint">SPRINT</button>
      </div>
      <div class="sx-utility"><button class="sx-fullscreen" type="button">FULLSCREEN</button></div>
      <div class="sx-rotate-gate">
        <div class="sx-rotate-device" aria-hidden="true"></div>
        <strong>ROTATE TO LANDSCAPE</strong>
        <p>SightX uses a wide field of view with independent movement and camera controls.</p>
        <button class="sx-enter-landscape" type="button">ENTER LANDSCAPE</button>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function requestLandscape() {
    const element = document.documentElement;
    const request = element.requestFullscreen || element.webkitRequestFullscreen;
    const fullscreen = request
      ? Promise.resolve(request.call(element)).catch(() => {})
      : Promise.resolve();
    fullscreen.then(() => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    });
  }

  function mount(options) {
    const canvas = options.canvas;
    if (!canvas) throw new Error('SightX controls require a canvas.');

    const preferences = loadPreferences();
    const settings = preferences.settings;
    const bindings = preferences.bindings;
    const position = (options.initialPosition || [0, 1.72, -9]).slice();
    position[0] = clamp(position[0], profile.bounds.minX, profile.bounds.maxX);
    position[1] = clamp(position[1], profile.bounds.minY, profile.bounds.maxY);
    position[2] = clamp(position[2], profile.bounds.minZ, profile.bounds.maxZ);
    // Real Newtonian zero-g state with active flight braking & inertial dampener:
    // thrust applies acceleration, KeyX engages exponential braking, and gentle
    // natural stabilization damping prevents uncontrollable runaway drift.
    const velocity = [0, 0, 0];
    let { fwd, up } = basisFromYawPitch(options.initialYaw || 0, options.initialPitch || 0);
    let locked = false;
    let inputEnabled = true;
    let sprintHeld = false;
    let desktopScanHeld = false;
    const keys = Object.create(null);
    const stickAxis = { x: 0, y: 0 };
    const touchUI = buildTouchUI();
    const moveZone = touchUI.querySelector('.sx-move-zone');
    const stick = touchUI.querySelector('.sx-stick');
    const knob = touchUI.querySelector('.sx-stick-knob');
    const lookZone = touchUI.querySelector('.sx-look-zone');
    const sprintButton = touchUI.querySelector('.sx-action.sprint');
    // No SCAN button since 2026-10-05: scanning is automatic for anything in
    // range (sightx-experience.js autoScan). setScan stays for the F key.
    const scanButton = null;
    let stickPointer = null;
    let lookPointer = null;
    let lookX = 0;
    let lookY = 0;

    function persist() {
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings, bindings })); } catch (_) {}
    }

    function applySettings() {
      settings.mouseSensitivity = clamp(Number(settings.mouseSensitivity) || profile.look.mouse, 0.001, 0.005);
      settings.touchSensitivity = clamp(Number(settings.touchSensitivity) || profile.look.touch, 0.0015, 0.008);
      settings.moveScale = clamp(Number(settings.moveScale) || 1, 0.65, 1.35);
      if (!['auto', 'high', 'balanced', 'performance'].includes(settings.quality)) settings.quality = 'auto';
      document.body.classList.toggle('sx-high-contrast', Boolean(settings.highContrast));
      document.body.classList.toggle('sx-reduced-motion', Boolean(settings.reducedMotion));
      touchUI.classList.toggle('floating-stick', Boolean(settings.floatingStick));
      if (options.onSettingsChange) options.onSettingsChange({ ...settings });
    }

    function updateSettings(patch) {
      Object.assign(settings, patch || {});
      applySettings();
      persist();
    }

    function setBinding(action, code) {
      if (!(action in canonicalBindings) || typeof code !== 'string') return;
      bindings[action] = code;
      persist();
    }

    function resetSettings() {
      Object.assign(settings, canonicalSettings);
      Object.assign(bindings, canonicalBindings);
      applySettings();
      persist();
    }

    function actionActive(action) {
      if (bindings[action] && keys[bindings[action]]) return true;
      if (action === 'forward') return keys.ArrowUp;
      if (action === 'backward') return keys.ArrowDown;
      if (action === 'left') return keys.ArrowLeft;
      if (action === 'right') return keys.ArrowRight;
      if (action === 'sprint') return keys.ShiftRight;
      if (action === 'up') return Boolean(keys.Space);
      if (action === 'down') return Boolean(keys.ControlLeft || keys.ControlRight);
      if (action === 'rollLeft') return Boolean(keys.KeyQ);
      if (action === 'rollRight') return Boolean(keys.KeyE);
      if (action === 'scan') return Boolean(keys.KeyF);
      if (action === 'brake') return Boolean(keys.KeyX);
      return false;
    }

    function signalInput(kind) {
      if (options.onInput) options.onInput(kind);
    }

    const isDedicatedDemo = document.body.classList.contains('sightx-demo');
    const coarsePointer = matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isDedicatedDemo && coarsePointer) document.body.classList.add('sightx-playing');

    // The Last of Us Style Contextual Control Hints
    const hintEl = options.hint;
    const hintState = {
      hasLooked: false,
      hasThrust: false,
      hasBraked: false,
      hasElevated: false,
      hasScanned: false,
      lookPixels: 0,
      lastInput: performance.now(),
      idleActive: false,
      stage: 'START'
    };

    function renderTlouHint(keys, label, sub) {
      if (!hintEl) return;
      const keyList = Array.isArray(keys) ? keys : [keys];
      const keysMarkup = keyList.map(k => `<span class="tlou-key">${k}</span>`).join('');
      const subMarkup = sub ? `<span class="tlou-sub">${sub}</span>` : '';
      hintEl.innerHTML = `<span class="tlou-keys">${keysMarkup}</span><span class="tlou-label">${label}</span>${subMarkup}`;
      hintEl.classList.remove('fade-out');
      hintEl.classList.add('visible');
    }

    function hideTlouHint() {
      if (!hintEl) return;
      hintEl.classList.remove('visible');
      hintEl.classList.add('fade-out');
    }

    function setHint() {
      if (!hintEl) return;
      hintState.lastInput = performance.now();
      if (!locked) {
        renderTlouHint('CLICK', 'WALK THE JOBSITE', 'CAPTURE MOUSE');
        return;
      }
      if (!hintState.hasLooked) {
        renderTlouHint('MOUSE', 'LOOK AROUND', 'DOWN THE CORRIDOR');
      } else if (!hintState.hasThrust) {
        renderTlouHint(['W', 'S'], 'MOVE', 'FORWARD / BACK');
      } else if (!hintState.hasBraked && Math.hypot(velocity[0], velocity[1], velocity[2]) > 0.35) {
        renderTlouHint('X', 'STOP', 'HALT MOVEMENT');
      } else if (!hintState.hasElevated && typeof options.groundY !== 'function') {
        renderTlouHint(['SPACE', 'C'], 'EYE HEIGHT', 'UP / DOWN');
      } else {
        hideTlouHint();
      }
    }

    if (hintEl) {
      hintEl.addEventListener('click', () => {
        if (!locked && canvas) canvas.requestPointerLock();
      });
    }

    function activate() {
      document.body.classList.add('sightx-playing');
      if (options.onCapture) options.onCapture();
    }

    function release() {
      if (!isDedicatedDemo) document.body.classList.remove('sightx-playing');
      if (options.onRelease) options.onRelease();
    }

    canvas.addEventListener('click', () => {
      if (coarsePointer) {
        activate();
      } else if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === canvas;
      setHint();
      if (locked) activate(); else release();
    });

    function onKeyDown(event) {
      if (event._sxHandled) return;
      event._sxHandled = true;
      const activeEl = document.activeElement;
      const formFocused = Boolean(activeEl && /^(INPUT|TEXTAREA|SELECT)$/i.test(activeEl.tagName));
      if (formFocused && !locked) return;
      if (!locked && !isDedicatedDemo) return;
      if (!event.repeat && event.code === profile.desktop.tour && options.onTourToggle) options.onTourToggle();
      if (!event.repeat && event.code === profile.desktop.settings && options.onSettingsToggle) options.onSettingsToggle();
      if (!event.repeat && event.code === profile.desktop.report && options.onReportToggle) options.onReportToggle();
      if (!event.repeat && event.code === profile.desktop.view && options.onViewToggle) options.onViewToggle();
      if (!inputEnabled) return;
      keys[event.code] = true;
      if (event.code === profile.desktop.release && document.pointerLockElement) document.exitPointerLock();
      if (event.code === bindings.scan) {
        if (!desktopScanHeld) {
          desktopScanHeld = true;
          setScan(true);
        }
      }
      if ([
        ...profile.desktop.forward, ...profile.desktop.backward, ...profile.desktop.left, ...profile.desktop.right,
        ...profile.desktop.up, ...profile.desktop.down, ...profile.desktop.rollLeft, ...profile.desktop.rollRight,
        ...profile.desktop.brake,
        bindings.scan,
        bindings.brake
      ].includes(event.code)) {
        event.preventDefault();
      }
    }

    function onKeyUp(event) {
      if (event._sxHandledUp) return;
      event._sxHandledUp = true;
      keys[event.code] = false;
      if (desktopScanHeld && !actionActive('scan')) {
        desktopScanHeld = false;
        setScan(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('keyup', onKeyUp);
    // Mouse look rotates the flight basis directly around its OWN current
    // local axes (yaw around local up, pitch around local right) rather
    // than accumulating world-frame Euler angles - this is what makes roll
    // (from Q/E) persist correctly and compose with look instead of being
    // fought by a world-up-relative yaw/pitch model.
    document.addEventListener('mousemove', event => {
      if (!locked || !inputEnabled) return;
      const right = normalize3(cross3(up, fwd));
      if (event.movementX) fwd = rotateAroundAxis(fwd, up, -event.movementX * settings.mouseSensitivity);
      if (event.movementY) fwd = rotateAroundAxis(fwd, right, -event.movementY * settings.mouseSensitivity);
      fwd = normalize3(fwd);
      // up = fwd x right (same order as basisFromYawPitch). The previous
      // right x fwd flipped the up vector on every event, so successive
      // look events cancelled each other and the view could invert.
      up = normalize3(cross3(fwd, right));
      if (event.movementX || event.movementY) {
        signalInput('look');
        hintState.lastInput = performance.now();
        hintState.lookPixels += Math.abs(event.movementX) + Math.abs(event.movementY);
        if (hintState.lookPixels > 40 && !hintState.hasLooked) {
          hintState.hasLooked = true;
          setHint();
        } else if (hintState.idleActive) {
          hintState.idleActive = false;
          hideTlouHint();
        }
      }
    });

    function updateStick(clientX, clientY) {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const radius = rect.width * 0.32;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const length = Math.hypot(dx, dy);
      if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
      stickAxis.x = dx / radius;
      stickAxis.y = dy / radius;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    function resetStick() {
      stickPointer = null;
      stickAxis.x = 0;
      stickAxis.y = 0;
      stick.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
      stick.style.removeProperty('--sx-stick-left');
      stick.style.removeProperty('--sx-stick-top');
      stick.style.removeProperty('bottom');
      stick.style.removeProperty('right');
    }

    function placeFloatingStick(event) {
      if (!settings.floatingStick) return;
      // The stick floats to the finger but stays inside its own zone, wherever
      // the host put that zone (left 45% on the full page, bottom-right in the
      // homepage embed).
      const size = stick.getBoundingClientRect().width;
      const zone = moveZone.getBoundingClientRect();
      const x = clamp(event.clientX, zone.left + size * 0.55, Math.max(zone.left + size * 0.55, zone.right - size * 0.55));
      const y = clamp(event.clientY, Math.max(0, zone.top) + size * 0.55, Math.max(zone.top + size * 0.55, zone.bottom - size * 0.55));
      stick.style.setProperty('--sx-stick-left', `${x - size * 0.5}px`);
      stick.style.setProperty('--sx-stick-top', `${y - size * 0.5}px`);
      stick.style.bottom = 'auto';
      stick.style.right = 'auto';
    }

    moveZone.addEventListener('pointerdown', event => {
      if (!inputEnabled) return;
      event.preventDefault();
      stickPointer = event.pointerId;
      moveZone.setPointerCapture(event.pointerId);
      placeFloatingStick(event);
      stick.classList.add('active');
      updateStick(event.clientX, event.clientY);
      signalInput('move');
    });
    moveZone.addEventListener('pointermove', event => {
      if (event.pointerId === stickPointer) {
        updateStick(event.clientX, event.clientY);
        signalInput('move');
      }
    });
    moveZone.addEventListener('pointerup', event => { if (event.pointerId === stickPointer) resetStick(); });
    moveZone.addEventListener('pointercancel', resetStick);

    lookZone.addEventListener('pointerdown', event => {
      if (!inputEnabled) return;
      event.preventDefault();
      lookPointer = event.pointerId;
      lookX = event.clientX;
      lookY = event.clientY;
      lookZone.setPointerCapture(event.pointerId);
    });
    // Touch look in screen pixels; shared by the look zone and by hosts
    // that drive the camera from their own gestures (the weylandai.com
    // embed has no touch UI, so it forwards canvas drags here).
    function lookBy(dx, dy) {
      if (!inputEnabled || (!dx && !dy)) return;
      const right = normalize3(cross3(up, fwd));
      if (dx) fwd = rotateAroundAxis(fwd, up, -dx * settings.touchSensitivity);
      if (dy) fwd = rotateAroundAxis(fwd, right, -dy * settings.touchSensitivity);
      fwd = normalize3(fwd);
      up = normalize3(cross3(fwd, right));
      signalInput('look');
    }
    // Virtual stick for hosts: x = strafe (-1..1), y = -forward (-1..1).
    function setStick(x, y) {
      stickAxis.x = clamp(Number(x) || 0, -1, 1);
      stickAxis.y = clamp(Number(y) || 0, -1, 1);
      if (stickAxis.x || stickAxis.y) signalInput('move');
    }
    lookZone.addEventListener('pointermove', event => {
      if (event.pointerId !== lookPointer) return;
      const dx = event.clientX - lookX;
      const dy = event.clientY - lookY;
      lookX = event.clientX;
      lookY = event.clientY;
      lookBy(dx, dy);
    });
    const resetLook = event => { if (!event || event.pointerId === lookPointer) lookPointer = null; };
    lookZone.addEventListener('pointerup', resetLook);
    lookZone.addEventListener('pointercancel', resetLook);

    const setSprint = active => {
      if (active && !inputEnabled) return;
      sprintHeld = active;
      sprintButton.classList.toggle('active', active);
      if (active) signalInput('sprint');
    };
    sprintButton.addEventListener('pointerdown', event => { event.preventDefault(); sprintButton.setPointerCapture(event.pointerId); setSprint(true); });
    sprintButton.addEventListener('pointerup', () => setSprint(false));
    sprintButton.addEventListener('pointercancel', () => setSprint(false));

    const setScan = active => {
      if (active && !inputEnabled) return;
      if (scanButton) scanButton.classList.toggle('active', active);
      touchUI.classList.toggle('scanning', active);
      if (options.onScan) options.onScan(active, position);
      if (active) signalInput('scan');
    };

    touchUI.querySelector('.sx-fullscreen').addEventListener('click', requestLandscape);
    touchUI.querySelector('.sx-enter-landscape').addEventListener('click', requestLandscape);

    function update(dt) {
      if (!inputEnabled) return;

      // Roll: Q/E spin the basis around the CURRENT local forward axis -
      // independent of translation input, same as a spacecraft's roll
      // thrusters. Attitude control, not translation, so it's unaffected
      // by the momentum model below.
      let rollInput = 0;
      if (actionActive('rollLeft')) rollInput -= 1;
      if (actionActive('rollRight')) rollInput += 1;
      if (rollInput) {
        up = normalize3(rotateAroundAxis(up, fwd, rollInput * profile.movement.roll * dt));
        signalInput('look');
      }

      // Grounded = the host reports a floor under us (see groundY below):
      // use the walking profile and ignore vertical thrust.
      const grounded = typeof options.groundY === 'function' && Number.isFinite(options.groundY(position[0], position[2]));
      let forwardAmt = -stickAxis.y;
      let strafe = stickAxis.x;
      let vertical = 0;
      if (actionActive('forward')) forwardAmt += 1;
      if (actionActive('backward')) forwardAmt -= 1;
      if (actionActive('right')) strafe += 1;
      if (actionActive('left')) strafe -= 1;
      if (!grounded && actionActive('up')) vertical += 1;
      if (!grounded && actionActive('down')) vertical -= 1;
      const inputLength = Math.hypot(forwardAmt, strafe, vertical);
      if (inputLength > 1) { forwardAmt /= inputLength; strafe /= inputLength; vertical /= inputLength; }
      const thrusting = Boolean(forwardAmt || strafe || vertical);
      const braking = actionActive('brake');

      // Real Newtonian zero-g thrust: acceleration applied along current local axes
      if (thrusting) {
        signalInput('move');
        hintState.lastInput = performance.now();
        if (!hintState.hasThrust) {
          hintState.hasThrust = true;
          setHint();
        } else if (hintState.idleActive) {
          hintState.idleActive = false;
          hideTlouHint();
        }
        if (options.onThrust) options.onThrust(velocity);
        const sprinting = sprintHeld || actionActive('sprint');
        const accel = (grounded
          ? (sprinting ? profile.walk.sprintAccel : profile.walk.accel)
          : (sprinting ? profile.movement.sprintAccel : profile.movement.accel)) * settings.moveScale;
        // Thrust along the CRAFT's own current local axes (fwd/right/up),
        // not world X/Z - "forward" always means wherever you're
        // currently facing, in any orientation.
        const right = normalize3(cross3(up, fwd));
        velocity[0] += (fwd[0] * forwardAmt + right[0] * strafe + up[0] * vertical) * accel * dt;
        velocity[1] += (fwd[1] * forwardAmt + right[1] * strafe + up[1] * vertical) * accel * dt;
        velocity[2] += (fwd[2] * forwardAmt + right[2] * strafe + up[2] * vertical) * accel * dt;
        // Finite RCS propellant budget: caps accumulated drift the same
        // way a real SAFER unit's limited delta-v does.
        const builtSpeed = Math.hypot(velocity[0], velocity[1], velocity[2]);
        const speedCap = grounded ? (sprinting ? profile.walk.sprintSpeed : profile.walk.maxSpeed) : profile.movement.maxSpeed;
        if (builtSpeed > speedCap) {
          const scale = speedCap / builtSpeed;
          velocity[0] *= scale; velocity[1] *= scale; velocity[2] *= scale;
        }
      }

      // Active Flight Braking / Inertial Dampener (KeyX held)
      if (braking) {
        signalInput('move');
        hintState.lastInput = performance.now();
        if (!hintState.hasBraked) {
          hintState.hasBraked = true;
          setHint();
        } else if (hintState.idleActive) {
          hintState.idleActive = false;
          hideTlouHint();
        }
        const brakeFactor = Math.pow(0.01, dt);
        velocity[0] *= brakeFactor;
        velocity[1] *= brakeFactor;
        velocity[2] *= brakeFactor;
        if (Math.hypot(velocity[0], velocity[1], velocity[2]) < 0.02) {
          velocity[0] = 0;
          velocity[1] = 0;
          velocity[2] = 0;
        }
      } else if (!thrusting) {
        // Natural gentle stabilization damping when no thrust keys are held
        // so release doesn't feel like an uncontrollable runaway rocket.
        // On a floor a person simply stops: strong damping (settles in
        // about a quarter second) instead of the zero-g coast.
        const coastDamp = Math.pow(grounded ? profile.walk.stopDamp : 0.85, dt);
        velocity[0] *= coastDamp;
        velocity[1] *= coastDamp;
        velocity[2] *= coastDamp;
        if (Math.hypot(velocity[0], velocity[1], velocity[2]) < 0.001) {
          velocity[0] = 0;
          velocity[1] = 0;
          velocity[2] = 0;
        }

        // (The orbital HCW drift term that used to live here was removed
        // with the 2026-10-04 jobsite retheme: the twin is a building on
        // Earth now. Ground-locked walking is the next controls step.)
      }

      // Check vertical elevation state for TLOU hint
      if (vertical !== 0 && !hintState.hasElevated) {
        hintState.hasElevated = true;
        setHint();
      }

      // Idle reminder in TLOU style: if player has been idle for > 8s, show unobtrusive reminder
      const now = performance.now();
      if (locked && (now - hintState.lastInput > 8000) && !hintState.idleActive) {
        hintState.idleActive = true;
        renderTlouHint(['WASD', 'X', 'SPACE'], 'MOVE / STOP / UP', 'WALK CONTROLS');
      }

      // Strict enforcement of altitude floor: cannot dip below facility into Earth
      if (position[1] < profile.bounds.minY) {
        position[1] = profile.bounds.minY;
        if (velocity[1] < 0) velocity[1] = 0;
      }

      // Integrate position from velocity
      const speed = Math.hypot(velocity[0], velocity[1], velocity[2]);
      if (speed < 1e-5) {
        if (position[1] < profile.bounds.minY) {
          position[1] = profile.bounds.minY;
          if (options.onMove) options.onMove(position);
        }
        return;
      }

      const dx = velocity[0] * dt;
      const dy = velocity[1] * dt;
      const dz = velocity[2] * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / profile.movement.collisionStep));

      for (let i = 0; i < steps; i += 1) {
        const nextX = position[0] + dx / steps;
        const nextZ = position[2] + dz / steps;
        if (!options.collision || !options.collision(nextX, position[2])) { position[0] = nextX; } else { velocity[0] = 0; }
        if (!options.collision || !options.collision(position[0], nextZ)) { position[2] = nextZ; } else { velocity[2] = 0; }
      }
      position[1] += dy;
      const clampedX = clamp(position[0], profile.bounds.minX, profile.bounds.maxX);
      const clampedY = clamp(position[1], profile.bounds.minY, profile.bounds.maxY);
      const clampedZ = clamp(position[2], profile.bounds.minZ, profile.bounds.maxZ);
      // Hitting a world bound is an inelastic collision with the station's
      // own hull/exclusion zone - it zeroes the clamped velocity component
      // rather than leaving built-up velocity to fire the astronaut back
      // across the scene the instant input changes.
      if (clampedX !== position[0]) velocity[0] = 0;
      if (clampedY !== position[1]) velocity[1] = 0;
      if (clampedZ !== position[2]) velocity[2] = 0;
      position[0] = clampedX;
      position[1] = clampedY;
      position[2] = clampedZ;

      // Absolute floor enforcement: strictly prevents camera from dipping below facility or into Earth
      if (position[1] < profile.bounds.minY) {
        position[1] = profile.bounds.minY;
        if (velocity[1] < 0) velocity[1] = 0;
      }

      // Ground lock (jobsite twin, 2026-10-04): the host may supply
      // options.groundY(x, z) returning the eye height to stand at for
      // this XZ, or null for free flight. Inside a building a visitor
      // walks at eye height; outside the footprint the 6DOF scheme still
      // applies so the exterior can be inspected from above.
      if (typeof options.groundY === 'function') {
        const eyeY = options.groundY(position[0], position[2]);
        if (typeof eyeY === 'number' && isFinite(eyeY)) {
          position[1] = clamp(eyeY, profile.bounds.minY, profile.bounds.maxY);
          velocity[1] = 0;
        }
      }

      if (options.onMove) options.onMove(position);
    }

    function setEnabled(active) {
      inputEnabled = Boolean(active);
      if (!inputEnabled) {
        Object.keys(keys).forEach(code => { keys[code] = false; });
        sprintHeld = false;
        desktopScanHeld = false;
        resetStick();
        resetLook();
        setSprint(false);
        setScan(false);
      }
    }

    function setPose(nextPosition, nextYaw, nextPitch) {
      if (Array.isArray(nextPosition) && nextPosition.length >= 3) {
        position[0] = clamp(Number(nextPosition[0]), profile.bounds.minX, profile.bounds.maxX);
        position[1] = clamp(Number(nextPosition[1]), profile.bounds.minY, profile.bounds.maxY);
        position[2] = clamp(Number(nextPosition[2]), profile.bounds.minZ, profile.bounds.maxZ);
      }
      // Scripted teleports (tour stops, PDF-twin spawn points) specify a
      // level yaw/pitch with no roll, which is the right default for them.
      if (Number.isFinite(nextYaw) || Number.isFinite(nextPitch)) {
        const basis = basisFromYawPitch(
          Number.isFinite(nextYaw) ? nextYaw : Math.atan2(fwd[0], fwd[2]),
          Number.isFinite(nextPitch) ? nextPitch : Math.asin(clamp(fwd[1], -1, 1))
        );
        fwd = basis.fwd;
        up = basis.up;
      }
      // A scripted teleport is not a physical motion - carrying stale
      // drift velocity into the new position would otherwise have the
      // astronaut keep "coasting" from wherever they were before the
      // teleport, which reads as a bug, not real inertia.
      velocity[0] = 0; velocity[1] = 0; velocity[2] = 0;
      if (options.onMove) options.onMove(position);
    }

    window.addEventListener('blur', () => {
      Object.keys(keys).forEach(code => { keys[code] = false; });
      desktopScanHeld = false;
      setSprint(false);
      setScan(false);
      resetStick();
      resetLook();
    });

    applySettings();
    setHint();
    return Object.freeze({
      profile,
      position,
      update,
      activate,
      setEnabled,
      setPose,
      lookBy,
      setStick,
      updateSettings,
      resetSettings,
      setBinding,
      bindingLabel: action => labelForCode(bindings[action] || ''),
      get settings() { return { ...settings }; },
      get bindings() { return { ...bindings }; },
      get forward() { return fwd.slice(); },
      get up() { return up.slice(); },
      get velocity() { return velocity.slice(); },
      get right() { return normalize3(cross3(up, fwd)); },
      get yaw() { return Math.atan2(fwd[0], fwd[2]); },
      get pitch() { return Math.asin(clamp(fwd[1], -1, 1)); }
    });
  }

  window.SightXControls = Object.freeze({ profile, mount });
}());
