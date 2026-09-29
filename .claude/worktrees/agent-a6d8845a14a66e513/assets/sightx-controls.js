(function () {
  'use strict';

  const profile = Object.freeze({
    id: 'weyland-sightx-standard',
    version: '2.0.0',
    desktop: Object.freeze({
      forward: Object.freeze(['KeyW', 'ArrowUp']),
      backward: Object.freeze(['KeyS', 'ArrowDown']),
      left: Object.freeze(['KeyA', 'ArrowLeft']),
      right: Object.freeze(['KeyD', 'ArrowRight']),
      sprint: Object.freeze(['ShiftLeft', 'ShiftRight']),
      scan: Object.freeze(['KeyE', 'Space']),
      tour: 'KeyT',
      settings: 'KeyO',
      report: 'KeyR',
      release: 'Escape'
    }),
    movement: Object.freeze({ walk: 4.2, sprint: 8.0, collisionStep: 0.08 }),
    look: Object.freeze({ mouse: 0.0022, touch: 0.0040, minPitch: -1.4, maxPitch: 1.4 }),
    bounds: Object.freeze({ minX: -28, maxX: 28, minZ: -30, maxZ: 42 })
  });

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
    sprint: 'ShiftLeft', scan: 'KeyE'
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
        <button class="sx-action scan" type="button" aria-label="Hold to scan">SCAN</button>
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
    let yaw = options.initialYaw || 0;
    let pitch = options.initialPitch || 0;
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
    const scanButton = touchUI.querySelector('.sx-action.scan');
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
      if (keys[bindings[action]]) return true;
      if (action === 'forward') return keys.ArrowUp;
      if (action === 'backward') return keys.ArrowDown;
      if (action === 'left') return keys.ArrowLeft;
      if (action === 'right') return keys.ArrowRight;
      if (action === 'sprint') return keys.ShiftRight;
      if (action === 'scan') return keys.Space;
      return false;
    }

    function signalInput(kind) {
      if (options.onInput) options.onInput(kind);
    }

    const isDedicatedDemo = document.body.classList.contains('sightx-demo');
    const coarsePointer = matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isDedicatedDemo && coarsePointer) document.body.classList.add('sightx-playing');

    function setHint() {
      if (!options.hint) return;
      options.hint.textContent = locked
        ? 'WASD / ARROWS - MOVE   MOUSE - LOOK   SHIFT - SPRINT   E / SPACE - SCAN   ESC - RELEASE'
        : 'CLICK TO CAPTURE MOUSE';
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

    document.addEventListener('keydown', event => {
      const formFocused = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (formFocused && !locked) return;
      if (!locked && !isDedicatedDemo) return;
      if (!event.repeat && event.code === profile.desktop.tour && options.onTourToggle) options.onTourToggle();
      if (!event.repeat && event.code === profile.desktop.settings && options.onSettingsToggle) options.onSettingsToggle();
      if (!event.repeat && event.code === profile.desktop.report && options.onReportToggle) options.onReportToggle();
      if (!inputEnabled) return;
      keys[event.code] = true;
      if (event.code === profile.desktop.release && document.pointerLockElement) document.exitPointerLock();
      if (event.code === bindings.scan || event.code === 'Space') {
        if (!desktopScanHeld) {
          desktopScanHeld = true;
          setScan(true);
        }
      }
      if ([...profile.desktop.forward, ...profile.desktop.backward, ...profile.desktop.left, ...profile.desktop.right, bindings.scan, 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });

    document.addEventListener('keyup', event => {
      keys[event.code] = false;
      if (desktopScanHeld && !actionActive('scan')) {
        desktopScanHeld = false;
        setScan(false);
      }
    });
    document.addEventListener('mousemove', event => {
      if (!locked || !inputEnabled) return;
      yaw += event.movementX * settings.mouseSensitivity;
      pitch = clamp(pitch - event.movementY * settings.mouseSensitivity, profile.look.minPitch, profile.look.maxPitch);
      if (event.movementX || event.movementY) signalInput('look');
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
    }

    function placeFloatingStick(event) {
      if (!settings.floatingStick) return;
      const size = stick.getBoundingClientRect().width;
      const x = clamp(event.clientX, size * 0.55, window.innerWidth * 0.43);
      const y = clamp(event.clientY, size * 0.55, window.innerHeight - size * 0.55);
      stick.style.setProperty('--sx-stick-left', `${x - size * 0.5}px`);
      stick.style.setProperty('--sx-stick-top', `${y - size * 0.5}px`);
      stick.style.bottom = 'auto';
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
    lookZone.addEventListener('pointermove', event => {
      if (event.pointerId !== lookPointer) return;
      const dx = event.clientX - lookX;
      const dy = event.clientY - lookY;
      lookX = event.clientX;
      lookY = event.clientY;
      yaw += dx * settings.touchSensitivity;
      pitch = clamp(pitch - dy * settings.touchSensitivity, profile.look.minPitch, profile.look.maxPitch);
      if (dx || dy) signalInput('look');
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
      scanButton.classList.toggle('active', active);
      touchUI.classList.toggle('scanning', active);
      if (options.onScan) options.onScan(active, position);
      if (active) signalInput('scan');
    };
    scanButton.addEventListener('pointerdown', event => { event.preventDefault(); scanButton.setPointerCapture(event.pointerId); setScan(true); });
    scanButton.addEventListener('pointerup', () => setScan(false));
    scanButton.addEventListener('pointercancel', () => setScan(false));

    touchUI.querySelector('.sx-fullscreen').addEventListener('click', requestLandscape);
    touchUI.querySelector('.sx-enter-landscape').addEventListener('click', requestLandscape);

    function update(dt) {
      if (!inputEnabled) return;
      let forward = -stickAxis.y;
      let strafe = stickAxis.x;
      if (actionActive('forward')) forward += 1;
      if (actionActive('backward')) forward -= 1;
      if (actionActive('right')) strafe += 1;
      if (actionActive('left')) strafe -= 1;
      const inputLength = Math.hypot(forward, strafe);
      if (inputLength > 1) { forward /= inputLength; strafe /= inputLength; }
      if (!forward && !strafe) return;
      signalInput('move');

      const sprinting = sprintHeld || actionActive('sprint');
      const speed = (sprinting ? profile.movement.sprint : profile.movement.walk) * settings.moveScale;
      const fwdX = Math.sin(yaw);
      const fwdZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const dx = (fwdX * forward + rightX * strafe) * speed * dt;
      const dz = (fwdZ * forward + rightZ * strafe) * speed * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / profile.movement.collisionStep));

      for (let i = 0; i < steps; i += 1) {
        const nextX = position[0] + dx / steps;
        const nextZ = position[2] + dz / steps;
        if (!options.collision || !options.collision(nextX, position[2])) position[0] = nextX;
        if (!options.collision || !options.collision(position[0], nextZ)) position[2] = nextZ;
      }
      position[0] = clamp(position[0], profile.bounds.minX, profile.bounds.maxX);
      position[2] = clamp(position[2], profile.bounds.minZ, profile.bounds.maxZ);
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
        position[0] = Number(nextPosition[0]);
        position[1] = Number(nextPosition[1]);
        position[2] = Number(nextPosition[2]);
      }
      if (Number.isFinite(nextYaw)) yaw = nextYaw;
      if (Number.isFinite(nextPitch)) pitch = clamp(nextPitch, profile.look.minPitch, profile.look.maxPitch);
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
      updateSettings,
      resetSettings,
      setBinding,
      bindingLabel: action => labelForCode(bindings[action] || ''),
      get settings() { return { ...settings }; },
      get bindings() { return { ...bindings }; },
      get forward() {
        return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      },
      get yaw() { return yaw; },
      get pitch() { return pitch; }
    });
  }

  window.SightXControls = Object.freeze({ profile, mount });
}());
