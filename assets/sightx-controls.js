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

  function mount(options) {
    const canvas = options.canvas;
    if (!canvas) throw new Error('SightX controls require a canvas.');

    const backgroundEmbed = window.parent !== window && document.documentElement.classList.contains('sxe-bg-embed');
    const externalInput = options.externalInput ?? backgroundEmbed;
    let inputLayer = window.WeylandInput;
    // The worker HTML and shared assets deploy independently. Older embeds
    // omit both the input script and externalInput; their same-origin host
    // already owns input. Borrow only its stateless helpers, never create()
    // (which would bind a second controller to the parent's document).
    if (!inputLayer && backgroundEmbed && externalInput) {
      try { inputLayer = window.parent.WeylandInput; } catch (_) {}
    }
    if (typeof inputLayer?.neutral !== 'function' || typeof inputLayer?.normalize !== 'function' || (!externalInput && typeof inputLayer?.create !== 'function')) {
      throw new Error('SightX controls require /assets/weyland-input.js before mounting.');
    }

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
    let desktopScanHeld = false;
    let ext = inputLayer.neutral(), externalAt = -Infinity;
    const input = externalInput ? null : inputLayer.create({
      lookTarget: canvas, stick: 'auto', active: () => inputEnabled,
      bindings: () => bindings
    });
    let current = inputLayer.neutral();

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

    function actionActive(action) { return current.buttons[action] === true; }

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

    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === canvas;
      setHint();
      if (locked) activate(); else release();
    });
    // The world only consumes normalized input. The homepage owns every physical input in embeds.
    function setExternalState(state) {
      if (!inputEnabled) return;
      const next = inputLayer.normalize(state);
      next.look.dx += ext.look.dx; next.look.dy += ext.look.dy;
      ext = next; externalAt = performance.now();
    }
    document.addEventListener('keydown', event => {
      const el = document.activeElement;
      if (!inputEnabled || event.repeat || (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable))) return;
      for (const [key, callback] of [['tour', 'onTourToggle'], ['settings', 'onSettingsToggle'], ['report', 'onReportToggle'], ['view', 'onViewToggle']]) {
        if (event.code === profile.desktop[key] && options[callback]) options[callback]();
      }
    });
    // Both local and forwarded look arrive in screen pixels.
    function lookBy(dx, dy) {
      if (!inputEnabled || (!dx && !dy)) return;
      const right = normalize3(cross3(up, fwd));
      const sensitivity = coarsePointer ? settings.touchSensitivity : settings.mouseSensitivity;
      if (dx) fwd = rotateAroundAxis(fwd, up, -dx * sensitivity);
      if (dy) fwd = rotateAroundAxis(fwd, right, -dy * sensitivity);
      fwd = normalize3(fwd);
      up = normalize3(cross3(fwd, right));
      signalInput('look');
      hintState.lastInput = performance.now();
      hintState.lookPixels += Math.abs(dx) + Math.abs(dy);
      if (hintState.lookPixels > 40 && !hintState.hasLooked) { hintState.hasLooked = true; setHint(); }
    }
    function setScan(active) {
      if (options.onScan) options.onScan(active, position);
      if (active) signalInput('scan');
    }

    function update(dt) {
      if (!inputEnabled) return;
      current = input ? input.state() : (performance.now() - externalAt < 400 ? ext : inputLayer.neutral());
      lookBy(current.look.dx, current.look.dy);
      ext.look = { dx: 0, dy: 0 };
      if (desktopScanHeld !== actionActive('scan')) { desktopScanHeld = actionActive('scan'); setScan(desktopScanHeld); }

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
      let forwardAmt = current.move.y;
      let strafe = current.move.x;
      let vertical = 0;
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
        const sprinting = actionActive('sprint');
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
      if (input) input.setEnabled(inputEnabled);
      if (!inputEnabled) {
        ext = inputLayer.neutral(); externalAt = -Infinity;
        velocity.fill(0); desktopScanHeld = false; setScan(false);
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
      ext = inputLayer.neutral(); externalAt = -Infinity;
      velocity.fill(0); desktopScanHeld = false; setScan(false);
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
      setExternalState,
      state: () => ({ pos: position.slice(), yaw: Math.atan2(fwd[0], fwd[2]), pitch: Math.asin(clamp(fwd[1], -1, 1)) }),
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

  // SightXControls.state(): the mounted player's { pos, yaw, pitch }, read-only (a copy), so a
  // journey can assert motion without reaching into the renderer.
  let lastMounted = null;
  function mountAndKeep(options) { lastMounted = mount(options); return lastMounted; }
  function state() { return lastMounted ? lastMounted.state() : null; }
  window.SightXControls = Object.freeze({ profile, mount: mountAndKeep, state });
}());
