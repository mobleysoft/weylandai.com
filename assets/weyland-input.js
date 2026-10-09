// assets/weyland-input.js
//
// WeylandInput: the one input layer a host page owns (S0, John 2026-10-09: "its crucial that sightx
// plays like a triple a game to support all our other games in the future"). Keyboard, mouse look,
// a touch stick and a gamepad become one normalized state:
//
//   { move: { x, y },        x right, y forward, each -1..1 (keys, stick, left gamepad stick)
//     look: { dx, dy },      pixels of look since the last read (mouse, drag, right gamepad stick)
//     buttons: { up, down, sprint, brake, scan } }
//
// A world in the same page reads it every frame (layer.state()); a world in a frame gets it by
// postMessage ({ type: "weyland:input-state", ... }, same origin) every frame the state is live.
// Every game inherits this file; nothing here knows about doors.
//
//   var layer = WeylandInput.create({
//     lookTarget: canvas,            // drag here (or click to capture the mouse) to look
//     forward: function () { return frame.contentWindow; },   // optional: post the state into a frame
//     active: function () { return true; },                   // optional: false = the page owns the keys
//     stick: "auto",                 // "auto" (touch screens), true or false
//     pointerLock: false,            // true: a click captures the mouse (Escape releases)
//   });
(function () {
  "use strict";
  if (window.WeylandInput) return;

  var KEYMAP = {
    KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r",
    Space: "up", ControlLeft: "down", ControlRight: "down", KeyC: "down",
    ShiftLeft: "sprint", ShiftRight: "sprint", KeyX: "brake", KeyF: "scan",
  };
  var coarse = function () { try { return matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (e) { return false; } };
  var isField = function (t) { return !!(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)); };

  function create(opts) {
    opts = opts || {};
    var held = {}, look = { dx: 0, dy: 0 }, stick = { x: 0, y: 0 }, pad = { x: 0, y: 0, up: false, down: false, sprint: false, brake: false };
    var enabled = true, stickEl = null, knob = null, stickId = null, stickOrigin = null, drag = null, raf = 0, lastSent = "", destroyed = false;
    var active = function () { return enabled && (!opts.active || opts.active()); };
    var R = 52; // stick radius, px

    // ---- keyboard
    function onKey(e) {
      var k = KEYMAP[e.code];
      if (!k || !active() || isField(e.target)) return;
      if (e.type === "keydown") held[k] = true; else delete held[k];
      if (e.cancelable) e.preventDefault();
      send();
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    function clearAll() { held = {}; stick.x = stick.y = 0; drag = null; if (knob) knob.style.transform = ""; }
    window.addEventListener("blur", clearAll);

    // ---- mouse and finger look on the look target (a drag; or the captured mouse)
    var target = opts.lookTarget || null;
    function locked() { return !!(target && document.pointerLockElement === target); }
    if (target) {
      target.addEventListener("pointerdown", function (e) {
        if (!active()) return;
        if (e.pointerType === "mouse" && opts.pointerLock && !locked() && target.requestPointerLock) { try { target.requestPointerLock(); } catch (err) {} }
        if (stickId === e.pointerId) return;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      });
      window.addEventListener("pointermove", function (e) {
        if (locked() && e.pointerType === "mouse") { look.dx += e.movementX || 0; look.dy += e.movementY || 0; return; }
        if (!drag || e.pointerId !== drag.id) return;
        look.dx += e.clientX - drag.x; look.dy += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      });
      ["pointerup", "pointercancel"].forEach(function (t) { window.addEventListener(t, function (e) { if (drag && e.pointerId === drag.id) drag = null; }); });
    }

    // ---- the touch stick, drawn in this document (bottom left; a thumb's reach)
    function drawStick(on) {
      if (on && !stickEl) {
        stickEl = document.createElement("div");
        stickEl.className = "weyland-stick";
        stickEl.setAttribute("aria-hidden", "true");
        stickEl.style.cssText = "position:" + (opts.stickParent ? "absolute" : "fixed") + ";left:max(18px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));width:" + (2 * R + 36) + "px;height:" + (2 * R + 36) + "px;border-radius:50%;background:rgba(10,12,16,.28);border:2px solid rgba(255,255,255,.35);z-index:2147483000;touch-action:none;pointer-events:auto;";
        knob = document.createElement("div");
        knob.style.cssText = "position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.75);box-shadow:0 2px 10px rgba(0,0,0,.4);pointer-events:none;";
        stickEl.appendChild(knob);
        stickEl.addEventListener("pointerdown", function (e) {
          e.preventDefault(); e.stopPropagation();
          stickId = e.pointerId; var r = stickEl.getBoundingClientRect(); stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          try { stickEl.setPointerCapture(e.pointerId); } catch (err) {}
          moveStick(e);
        });
        stickEl.addEventListener("pointermove", function (e) { if (e.pointerId === stickId) { e.preventDefault(); moveStick(e); } });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { stickEl.addEventListener(t, function (e) { if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ""; } }); });
        (opts.stickParent || document.body).appendChild(stickEl);
      }
      if (stickEl) stickEl.style.display = on ? "block" : "none";
      if (!on) { stickId = null; stick.x = stick.y = 0; if (knob) knob.style.transform = ""; }
    }
    function moveStick(e) {
      var dx = e.clientX - stickOrigin.x, dy = e.clientY - stickOrigin.y, d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      var x = dx / R, y = -dy / R, m = Math.hypot(x, y);
      if (m < 0.12) { x = 0; y = 0; } // dead zone
      stick.x = x; stick.y = y;
    }

    // ---- gamepad: left stick moves, right stick looks, A up, B down, L3 sprint, X brake
    function pollPad() {
      pad.x = pad.y = 0; pad.up = pad.down = pad.sprint = pad.brake = false;
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; pads && i < pads.length; i++) {
        var g = pads[i]; if (!g || !g.connected) continue;
        var dz = function (v) { return Math.abs(v) < 0.15 ? 0 : v; };
        pad.x += dz(g.axes[0] || 0); pad.y += -dz(g.axes[1] || 0);
        look.dx += dz(g.axes[2] || 0) * 14; look.dy += dz(g.axes[3] || 0) * 14;
        var b = function (n) { return !!(g.buttons[n] && g.buttons[n].pressed); };
        pad.up = pad.up || b(0); pad.down = pad.down || b(1); pad.sprint = pad.sprint || b(10); pad.brake = pad.brake || b(2);
      }
    }

    function state() {
      pollPadOnce();
      var x = (held.r ? 1 : 0) - (held.l ? 1 : 0) + stick.x + pad.x;
      var y = (held.f ? 1 : 0) - (held.b ? 1 : 0) + stick.y + pad.y;
      var m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      var s = { move: { x: x, y: y }, look: { dx: look.dx, dy: look.dy },
        buttons: { up: !!(held.up || pad.up), down: !!(held.down || pad.down), sprint: !!(held.sprint || pad.sprint), brake: !!(held.brake || pad.brake), scan: !!held.scan } };
      look.dx = 0; look.dy = 0;
      if (!active()) { s.move.x = s.move.y = 0; s.look.dx = s.look.dy = 0; }
      return s;
    }
    var padFrame = -1;
    function pollPadOnce() { var f = Math.floor(performance.now() / 8); if (f !== padFrame) { padFrame = f; pollPad(); } }

    // ---- forwarding into a frame, every frame the state is live (and once more when it goes still)
    function tick() {
      if (destroyed) return;
      raf = requestAnimationFrame(tick);
      if (stickEl !== null || opts.stick === true || (opts.stick !== false && coarse())) drawStick(active() && (opts.stick === true || (opts.stick !== false && coarse())));
      send();
    }
    function send() {
      if (!opts.forward) return;
      var w = null; try { w = opts.forward(); } catch (e) { w = null; }
      if (!w) return;
      var s = state();
      var live = s.move.x || s.move.y || s.look.dx || s.look.dy || s.buttons.up || s.buttons.down || s.buttons.brake || s.buttons.sprint || s.buttons.scan;
      var key = live ? "live" : JSON.stringify(s.move) + JSON.stringify(s.buttons);
      if (!live && key === lastSent) return;
      lastSent = key;
      try { w.postMessage({ type: "weyland:input-state", move: s.move, look: s.look, buttons: s.buttons }, location.origin); } catch (e) {}
    }
    if (opts.forward || opts.stick !== false) raf = requestAnimationFrame(tick);
    // Forwarding must not depend on this page's frame rate (a heavy world in the frame starves it):
    // post on every change and every 30 ms while the state is live.
    var beat = opts.forward ? setInterval(function () { if (!destroyed) send(); }, 30) : 0;

    return {
      state: state,
      setEnabled: function (on) { enabled = !!on; if (!enabled) clearAll(); },
      // A key the host already handled (say, the W that lowered the dossier) counts as held.
      key: function (code, down) { var k = KEYMAP[code]; if (!k) return; if (down) held[k] = true; else delete held[k]; },
      clear: clearAll,
      get stickVisible() { return !!(stickEl && stickEl.style.display !== "none"); },
      destroy: function () { destroyed = true; cancelAnimationFrame(raf); clearInterval(beat); window.removeEventListener("keydown", onKey, true); window.removeEventListener("keyup", onKey, true); if (stickEl) stickEl.remove(); },
    };
  }

  window.WeylandInput = Object.freeze({ create: create, KEYMAP: KEYMAP });
}());
