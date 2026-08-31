(function () {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const STORAGE_KEY = 'weyland-sightx-report-v2';

  const tourStops = Object.freeze([
    Object.freeze({ position: [0, 1.72, -10.5], yaw: 0, pitch: -0.035, seconds: 1.6, title: 'Exterior context', copy: 'SightX establishes site, access, weather, and approach conditions before entry.' }),
    Object.freeze({ position: [0, 1.72, -4.2], yaw: 0, pitch: 0, seconds: 3.2, title: 'Automatic entrance', copy: 'The primary opening is linked to its hardware schedule, safety devices, and commissioning record.' }),
    Object.freeze({ position: [0, 1.72, 2.4], yaw: 0, pitch: 0, seconds: 3.5, title: 'Operational twin', copy: 'Crossing the threshold preserves spatial context instead of starting a disconnected form or checklist.' }),
    Object.freeze({ position: [0, 1.72, 6.0], yaw: -0.72, pitch: -0.02, seconds: 3.1, title: 'Materials review area', copy: 'Every visible asset can resolve to specifications, responsible trades, exceptions, and evidence.' }),
    Object.freeze({ position: [0, 1.72, 10.0], yaw: 0.72, pitch: 0.02, seconds: 3.0, title: 'Building services area', copy: 'SightX turns an exploratory walkthrough into a structured, exportable field record.' })
  ]);

  function loadFindings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-40) : [];
    } catch (_) {
      return [];
    }
  }

  function createUI() {
    const root = document.createElement('div');
    root.id = 'sightx-experience';
    root.setAttribute('aria-label', 'SightX field intelligence');
    root.innerHTML = `
      <header class="sxe-command-bar">
        <div class="sxe-identity"><span class="sxe-mark">SX</span><div><b>SIGHTX</b><small>SEMANTIC SITE TWIN / FACILITY 01</small></div></div>
        <div class="sxe-system-state"><span class="sxe-live-dot"></span><span class="sxe-quality-label">ADAPTIVE / CALIBRATING</span></div>
        <nav class="sxe-actions" aria-label="SightX utilities">
          <button type="button" data-sxe-action="tour">GUIDED TOUR <kbd>T</kbd></button>
          <button type="button" data-sxe-action="ingest">INGEST SITE <kbd>I</kbd></button>
          <button type="button" data-sxe-action="report">FIELD RECORD <span class="sxe-report-count">0</span></button>
          <button type="button" data-sxe-action="settings">OPTIONS <kbd>O</kbd></button>
        </nav>
      </header>

      <section class="sxe-mission" aria-live="polite">
        <div class="sxe-eyebrow"><span>LIVE COMMISSIONING RUN</span><b class="sxe-mission-progress">0 / 4</b></div>
        <h2 class="sxe-mission-title">Acquire the main entrance</h2>
        <p class="sxe-mission-copy">Center the automatic entrance in the reticle, then hold <kbd>E</kbd> or <kbd>SPACE</kbd> to inspect it.</p>
        <div class="sxe-progress-track"><i></i></div>
      </section>

      <section class="sxe-target-card" aria-live="polite" hidden>
        <div class="sxe-target-kicker"><span class="sxe-target-type">ASSET</span><b class="sxe-target-confidence">--%</b></div>
        <h3 class="sxe-target-name">No target</h3>
        <p class="sxe-target-summary"></p>
        <div class="sxe-target-facts"><span><small>DIMENSIONS</small><b class="sxe-target-dimensions">--</b></span><span><small>MATERIAL</small><b class="sxe-target-material">--</b></span><span><small>FIELD RISK</small><b class="sxe-target-hazard">--</b></span></div>
        <div class="sxe-target-metrics"><span><small>RANGE</small><b class="sxe-target-range">--</b></span><span><small>STATUS</small><b class="sxe-target-status">READY</b></span></div>
        <div class="sxe-scan-progress"><i></i></div>
        <div class="sxe-scan-prompt">HOLD <kbd>E</kbd> / <kbd>SPACE</kbd> TO SCAN</div>
      </section>

      <div class="sxe-tour-caption" hidden><small>GUIDED SIGHTX WALKTHROUGH</small><h3></h3><p></p><div><i></i></div></div>
      <div class="sxe-world-markers" aria-hidden="true"></div>
      <output class="sxe-toast" aria-live="assertive"></output>

      <aside class="sxe-drawer sxe-report" aria-label="SightX field record" hidden>
        <div class="sxe-drawer-head"><div><small>GENERATED IN THE FIELD</small><h2>SightX Record</h2></div><button type="button" data-sxe-close aria-label="Close field record">CLOSE</button></div>
        <div class="sxe-report-summary"><span><b class="sxe-report-total">0</b><small>FINDINGS</small></span><span><b class="sxe-report-assets">0</b><small>ASSETS</small></span><span><b class="sxe-report-status">OPEN</b><small>RUN STATUS</small></span></div>
        <div class="sxe-findings"></div>
        <div class="sxe-drawer-foot"><button type="button" data-sxe-export="copy">COPY SUMMARY</button><button type="button" data-sxe-export="json">DOWNLOAD JSON</button></div>
      </aside>

      <aside class="sxe-drawer sxe-settings" aria-label="SightX operator options" hidden>
        <div class="sxe-drawer-head"><div><small>OPERATOR PROFILE</small><h2>Controls & Display</h2></div><button type="button" data-sxe-close aria-label="Close options">CLOSE</button></div>
        <div class="sxe-settings-grid">
          <label>RENDER QUALITY<select data-sxe-setting="quality"><option value="auto">Adaptive</option><option value="high">High fidelity</option><option value="balanced">Balanced</option><option value="performance">Performance</option></select></label>
          <label>MOUSE LOOK <output data-sxe-value="mouseSensitivity"></output><input type="range" min="0.001" max="0.005" step="0.0001" data-sxe-setting="mouseSensitivity"></label>
          <label>TOUCH LOOK <output data-sxe-value="touchSensitivity"></output><input type="range" min="0.0015" max="0.008" step="0.0001" data-sxe-setting="touchSensitivity"></label>
          <label>MOVEMENT SPEED <output data-sxe-value="moveScale"></output><input type="range" min="0.65" max="1.35" step="0.05" data-sxe-setting="moveScale"></label>
        </div>
        <div class="sxe-toggle-grid">
          <label><input type="checkbox" data-sxe-setting="highContrast"> HIGH-CONTRAST HUD</label>
          <label><input type="checkbox" data-sxe-setting="reducedMotion"> REDUCED MOTION</label>
          <label><input type="checkbox" data-sxe-setting="haptics"> HAPTIC FEEDBACK</label>
          <label><input type="checkbox" data-sxe-setting="audio"> SCAN AUDIO</label>
          <label><input type="checkbox" data-sxe-setting="floatingStick"> FLOATING MOVE STICK</label>
        </div>
        <div class="sxe-bindings"><small>PRIMARY KEY BINDINGS</small><div></div></div>
        <button class="sxe-reset" type="button" data-sxe-action="reset">RESTORE CANONICAL PROFILE</button>
      </aside>`;
    document.body.appendChild(root);
    return root;
  }

  function create(options) {
    const targets = (options.targets || []).map(target => Object.freeze({
      maxRange: 18,
      radius: 0.8,
      scanSeconds: 0.85,
      status: 'SPEC LINKED',
      provenance: Object.freeze({ method: 'authored-demo', status: 'demonstration', confidence: 1, sourceRefs: [] }),
      ...target,
      position: Object.freeze(target.position.slice())
    }));
    const targetIds = new Set(targets.map(target => target.id));
    const root = createUI();
    const refs = {
      siteSubtitle: root.querySelector('.sxe-identity small'),
      quality: root.querySelector('.sxe-quality-label'),
      mission: root.querySelector('.sxe-mission'),
      missionTitle: root.querySelector('.sxe-mission-title'),
      missionCopy: root.querySelector('.sxe-mission-copy'),
      missionProgress: root.querySelector('.sxe-mission-progress'),
      missionBar: root.querySelector('.sxe-progress-track i'),
      target: root.querySelector('.sxe-target-card'),
      targetType: root.querySelector('.sxe-target-type'),
      targetConfidence: root.querySelector('.sxe-target-confidence'),
      targetName: root.querySelector('.sxe-target-name'),
      targetSummary: root.querySelector('.sxe-target-summary'),
      targetDimensions: root.querySelector('.sxe-target-dimensions'),
      targetMaterial: root.querySelector('.sxe-target-material'),
      targetHazard: root.querySelector('.sxe-target-hazard'),
      targetRange: root.querySelector('.sxe-target-range'),
      targetStatus: root.querySelector('.sxe-target-status'),
      scanBar: root.querySelector('.sxe-scan-progress i'),
      scanPrompt: root.querySelector('.sxe-scan-prompt'),
      report: root.querySelector('.sxe-report'),
      settings: root.querySelector('.sxe-settings'),
      findings: root.querySelector('.sxe-findings'),
      reportCount: root.querySelector('.sxe-report-count'),
      reportTotal: root.querySelector('.sxe-report-total'),
      reportAssets: root.querySelector('.sxe-report-assets'),
      reportStatus: root.querySelector('.sxe-report-status'),
      toast: root.querySelector('.sxe-toast'),
      tourButton: root.querySelector('[data-sxe-action="tour"]'),
      tourCaption: root.querySelector('.sxe-tour-caption'),
      worldMarkers: root.querySelector('.sxe-world-markers')
    };

    const mission = [
      { title: 'Acquire the main entrance', copy: 'Center the automatic entrance in the reticle, then hold E or SPACE to inspect it.', test: state => state.scannedIds.has('entrance') },
      { title: 'Cross the threshold', copy: 'Enter the facility while SightX carries the exterior observation into the building twin.', test: state => state.position[2] > 0.8 && Math.abs(state.position[0]) < 1.45 },
      { title: 'Inspect a controlled opening', copy: 'Aim at any interior doorway and complete a second semantic scan.', test: state => state.findings.some(item => item.tags && item.tags.includes('interior')) },
      { title: 'Review the generated field record', copy: 'Open FIELD RECORD to see how spatial observations become reusable construction data.', test: state => state.reportReviewed }
    ];

    const state = {
      controls: null,
      currentTarget: null,
      scanActive: false,
      scanProgress: 0,
      scanTargetId: null,
      scanStartedAt: 0,
      scanTimer: 0,
      completedDuringHold: false,
      findings: loadFindings(),
      scannedIds: new Set(),
      missionIndex: 0,
      reportReviewed: false,
      position: [0, 1.72, -9],
      forward: [0, 0, 1],
      siteName: 'Weyland Facility 01',
      packages: [],
      markerEntries: [],
      lastTs: 0,
      toastTimer: 0,
      autoScale: matchMedia('(hover: none) and (pointer: coarse)').matches ? 0.86 : 1.25,
      frameSeconds: 0,
      frameCount: 0,
      resizeRequested: true,
      tour: null
    };
    state.findings.forEach(item => state.scannedIds.add(item.id));

    function settings() {
      return state.controls ? state.controls.settings : {
        quality: 'auto', mouseSensitivity: 0.0022, touchSensitivity: 0.004,
        moveScale: 1, highContrast: false, reducedMotion: false,
        haptics: true, audio: true, floatingStick: true
      };
    }

    function notify(message) {
      refs.toast.textContent = message;
      refs.toast.classList.add('visible');
      clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(() => refs.toast.classList.remove('visible'), 2100);
    }

    function feedback() {
      const prefs = settings();
      if (prefs.haptics && navigator.vibrate) navigator.vibrate([25, 35, 55]);
      if (!prefs.audio) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        const gain = context.createGain();
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(420, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(920, context.currentTime + 0.16);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.24);
        oscillator.addEventListener('ended', () => context.close());
      } catch (_) {}
    }

    function getTarget(position, forward) {
      let best = null;
      let bestScore = -Infinity;
      for (const target of targets) {
        const dx = target.position[0] - position[0];
        const dy = target.position[1] - position[1];
        const dz = target.position[2] - position[2];
        const distance = Math.hypot(dx, dy, dz);
        if (distance > target.maxRange || distance < 0.2) continue;
        const dot = (dx * forward[0] + dy * forward[1] + dz * forward[2]) / distance;
        const angularRadius = Math.atan(target.radius / distance) * 1.6;
        const threshold = Math.cos(Math.max(0.045, angularRadius));
        if (dot < threshold) continue;
        const score = dot + target.radius / distance * 0.035 - distance * 0.0008;
        if (score > bestScore) {
          bestScore = score;
          best = { target, distance, confidence: clamp(Math.round(72 + (dot - threshold) / Math.max(0.001, 1 - threshold) * 27), 72, 99) };
        }
      }
      return best;
    }

    function renderTarget(candidate) {
      if (!candidate) {
        refs.target.hidden = true;
        refs.scanBar.style.width = '0%';
        return;
      }
      const target = candidate.target;
      refs.target.hidden = false;
      refs.targetType.textContent = target.type;
      refs.targetConfidence.textContent = `${candidate.confidence}% MATCH`;
      refs.targetName.textContent = target.name;
      refs.targetSummary.textContent = target.summary;
      refs.targetDimensions.textContent = target.dimensions || 'MODEL PENDING';
      refs.targetMaterial.textContent = target.material || 'UNCLASSIFIED';
      refs.targetHazard.textContent = target.hazard || 'NO EXCEPTION';
      refs.targetRange.textContent = `${candidate.distance.toFixed(1)} M`;
      refs.targetStatus.textContent = state.scannedIds.has(target.id) ? 'CAPTURED' : target.status;
      refs.scanBar.style.width = `${Math.round(state.scanProgress * 100)}%`;
      refs.scanPrompt.textContent = state.scanActive
        ? `SCANNING ${Math.round(state.scanProgress * 100)}%`
        : (state.scannedIds.has(target.id) ? 'HOLD E / SPACE TO RESCAN' : 'HOLD E / SPACE TO SCAN');
      refs.target.classList.toggle('scanning', state.scanActive);
      refs.target.classList.toggle('captured', state.scannedIds.has(target.id));
    }

    function reportPayload() {
      return {
        schema: 'weyland.sightx.field-record.v1',
        site: state.siteName,
        generatedAt: new Date().toISOString(),
        missionComplete: state.missionIndex >= mission.length,
        sitePackages: state.packages.slice(),
        findings: state.findings
      };
    }

    function persistFindings() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.findings.slice(-40))); } catch (_) {}
    }

    function renderFindings() {
      refs.findings.replaceChildren();
      if (!state.findings.length) {
        const empty = document.createElement('p');
        empty.className = 'sxe-empty';
        empty.textContent = 'No findings yet. Close this record, aim at a highlighted building system, and hold SCAN.';
        refs.findings.appendChild(empty);
      } else {
        [...state.findings].reverse().forEach(item => {
          const article = document.createElement('article');
          const head = document.createElement('div');
          const type = document.createElement('small');
          const time = document.createElement('time');
          const title = document.createElement('h3');
          const copy = document.createElement('p');
          const facts = document.createElement('dl');
          const status = document.createElement('span');
          type.textContent = item.type;
          time.textContent = new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          title.textContent = item.name;
          copy.textContent = item.summary;
          status.textContent = `${item.status} / ${item.confidence}%`;
          [['DIM', item.dimensions], ['MAT', item.material], ['RISK', item.hazard]].forEach(([label, value]) => {
            if (!value) return;
            const term = document.createElement('dt');
            const detail = document.createElement('dd');
            term.textContent = label;
            detail.textContent = value;
            facts.append(term, detail);
          });
          if (item.provenance) {
            const term = document.createElement('dt');
            const detail = document.createElement('dd');
            term.textContent = 'SRC';
            detail.textContent = `${item.provenance.method || 'unknown'} / ${item.provenance.status || 'unverified'}`;
            facts.append(term, detail);
          }
          head.append(type, time);
          article.append(head, title, copy, facts, status);
          refs.findings.appendChild(article);
        });
      }
      refs.reportCount.textContent = state.findings.length;
      refs.reportTotal.textContent = state.findings.length;
      refs.reportAssets.textContent = new Set(state.findings.map(item => item.id)).size;
      refs.reportStatus.textContent = state.missionIndex >= mission.length ? 'COMPLETE' : 'OPEN';
    }

    function completeFinding(candidate) {
      clearTimeout(state.scanTimer);
      state.scanTimer = 0;
      const target = candidate.target;
      const finding = {
        id: target.id,
        type: target.type,
        name: target.name,
        summary: target.summary,
        dimensions: target.dimensions || null,
        material: target.material || null,
        hazard: target.hazard || 'No exception observed',
        status: target.status,
        confidence: candidate.confidence,
        rangeMeters: Number(candidate.distance.toFixed(2)),
        position: target.position.slice(),
        tags: (target.tags || []).slice(),
        provenance: target.provenance ? {
          method: target.provenance.method || 'unknown',
          status: target.provenance.status || 'unverified',
          confidence: Number.isFinite(target.provenance.confidence) ? target.provenance.confidence : null,
          sourceRefs: Array.isArray(target.provenance.sourceRefs) ? target.provenance.sourceRefs.slice() : []
        } : null,
        packageId: target.packageId || null,
        capturedAt: new Date().toISOString()
      };
      state.findings.push(finding);
      state.scannedIds.add(target.id);
      state.completedDuringHold = true;
      persistFindings();
      renderFindings();
      feedback();
      notify(`${target.name.toUpperCase()} ADDED TO FIELD RECORD`);
      checkMission();
    }

    function checkMission() {
      let advanced = false;
      while (state.missionIndex < mission.length && mission[state.missionIndex].test(state)) {
        state.missionIndex += 1;
        advanced = true;
      }
      refs.missionProgress.textContent = `${state.missionIndex} / ${mission.length}`;
      refs.missionBar.style.width = `${state.missionIndex / mission.length * 100}%`;
      if (state.missionIndex >= mission.length) {
        refs.missionTitle.textContent = 'Commissioning run complete';
        refs.missionCopy.textContent = 'The scene has become a structured field record: observable, inspectable, and portable.';
        refs.mission.classList.add('complete');
        refs.reportStatus.textContent = 'COMPLETE';
        if (advanced) notify('SIGHTX COMMISSIONING RUN COMPLETE');
      } else {
        refs.missionTitle.textContent = mission[state.missionIndex].title;
        refs.missionCopy.textContent = mission[state.missionIndex].copy;
      }
    }

    function toggleDrawer(drawer, force) {
      const shouldOpen = force === undefined ? drawer.hidden : force;
      refs.report.hidden = true;
      refs.settings.hidden = true;
      if (shouldOpen) {
        drawer.hidden = false;
        if (document.pointerLockElement) document.exitPointerLock();
      }
      root.classList.toggle('drawer-open', shouldOpen);
      if (drawer === refs.report && shouldOpen) {
        state.reportReviewed = true;
        renderFindings();
        checkMission();
      }
    }

    function exportReport(kind) {
      const payload = reportPayload();
      if (kind === 'copy') {
        const lines = [`SightX Field Record / ${payload.site}`, `Generated ${payload.generatedAt}`, ''];
        payload.findings.forEach((item, index) => lines.push(`${index + 1}. ${item.name} — ${item.status} (${item.confidence}% confidence)`, item.summary));
        navigator.clipboard.writeText(lines.join('\n')).then(() => notify('FIELD SUMMARY COPIED')).catch(() => notify('COPY UNAVAILABLE'));
        return;
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sightx-field-record-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function refreshSettings() {
      if (!state.controls) return;
      const prefs = state.controls.settings;
      root.querySelectorAll('[data-sxe-setting]').forEach(input => {
        const key = input.dataset.sxeSetting;
        if (!(key in prefs)) return;
        if (input.type === 'checkbox') input.checked = Boolean(prefs[key]);
        else input.value = prefs[key];
      });
      ['mouseSensitivity', 'touchSensitivity', 'moveScale'].forEach(key => {
        const output = root.querySelector(`[data-sxe-value="${key}"]`);
        if (output) output.textContent = key === 'moveScale' ? `${prefs[key].toFixed(2)}X` : prefs[key].toFixed(4);
      });
      const bindingRoot = root.querySelector('.sxe-bindings > div');
      bindingRoot.replaceChildren();
      ['forward', 'backward', 'left', 'right', 'sprint', 'scan'].forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sxeBinding = action;
        button.innerHTML = `<span>${action.toUpperCase()}</span><kbd>${state.controls.bindingLabel(action)}</kbd>`;
        bindingRoot.appendChild(button);
      });
    }

    function beginBinding(button) {
      if (!state.controls) return;
      const action = button.dataset.sxeBinding;
      button.classList.add('listening');
      button.querySelector('kbd').textContent = 'PRESS KEY';
      const capture = event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.code !== 'Escape') state.controls.setBinding(action, event.code);
        button.classList.remove('listening');
        document.removeEventListener('keydown', capture, true);
        refreshSettings();
      };
      document.addEventListener('keydown', capture, true);
    }

    function startTour() {
      if (!state.controls) return;
      if (state.tour) {
        stopTour('GUIDED TOUR ENDED');
        return;
      }
      state.controls.setEnabled(false);
      state.controls.setPose(tourStops[0].position, tourStops[0].yaw, tourStops[0].pitch);
      state.tour = { index: 1, segment: null };
      refs.tourButton.firstChild.textContent = 'STOP TOUR ';
      refs.tourCaption.hidden = false;
      root.classList.add('touring');
      showTourCopy(tourStops[0]);
      notify('GUIDED SIGHTX WALKTHROUGH');
    }

    function showTourCopy(stop) {
      refs.tourCaption.querySelector('h3').textContent = stop.title;
      refs.tourCaption.querySelector('p').textContent = stop.copy;
      refs.tourCaption.querySelector('i').style.width = `${Math.max(8, (state.tour ? state.tour.index : 0) / tourStops.length * 100)}%`;
    }

    function stopTour(message) {
      if (!state.tour) return;
      state.tour = null;
      if (state.controls) state.controls.setEnabled(true);
      refs.tourButton.firstChild.textContent = 'GUIDED TOUR ';
      refs.tourCaption.hidden = true;
      root.classList.remove('touring');
      if (message) notify(message);
    }

    function updateTour(ts) {
      if (!state.tour || !state.controls) return;
      if (!state.tour.segment) {
        if (state.tour.index >= tourStops.length) {
          stopTour('GUIDED WALKTHROUGH COMPLETE');
          return;
        }
        const stop = tourStops[state.tour.index];
        state.tour.segment = {
          start: ts,
          fromPosition: state.controls.position.slice(),
          fromYaw: state.controls.yaw,
          fromPitch: state.controls.pitch,
          stop
        };
        showTourCopy(stop);
      }
      const segment = state.tour.segment;
      const amount = clamp((ts - segment.start) / (segment.stop.seconds * 1000), 0, 1);
      const shaped = ease(amount);
      const position = segment.fromPosition.map((value, index) => lerp(value, segment.stop.position[index], shaped));
      state.controls.setPose(position, lerp(segment.fromYaw, segment.stop.yaw, shaped), lerp(segment.fromPitch, segment.stop.pitch, shaped));
      if (amount >= 1) {
        state.tour.index += 1;
        state.tour.segment = null;
      }
    }

    root.addEventListener('click', event => {
      const action = event.target.closest('[data-sxe-action]')?.dataset.sxeAction;
      if (action === 'tour') startTour();
      if (action === 'ingest') window.dispatchEvent(new CustomEvent('sightx:toggle-ingest'));
      if (action === 'report') toggleDrawer(refs.report);
      if (action === 'settings') { refreshSettings(); toggleDrawer(refs.settings); }
      if (action === 'reset' && state.controls) { state.controls.resetSettings(); refreshSettings(); state.resizeRequested = true; }
      if (event.target.closest('[data-sxe-close]')) toggleDrawer(event.target.closest('.sxe-drawer'), false);
      const exportKind = event.target.closest('[data-sxe-export]')?.dataset.sxeExport;
      if (exportKind) exportReport(exportKind);
      const binding = event.target.closest('[data-sxe-binding]');
      if (binding) beginBinding(binding);
    });

    root.addEventListener('input', event => {
      const input = event.target.closest('[data-sxe-setting]');
      if (!input || !state.controls) return;
      const key = input.dataset.sxeSetting;
      const value = input.type === 'checkbox' ? input.checked : (input.type === 'range' ? Number(input.value) : input.value);
      state.controls.updateSettings({ [key]: value });
      if (key === 'quality') state.resizeRequested = true;
      refreshSettings();
    });

    function attachControls(controls) {
      state.controls = controls;
      controls.updateSettings({});
      refreshSettings();
      checkMission();
    }

    function armScan(candidate, now) {
      clearTimeout(state.scanTimer);
      state.scanTargetId = candidate.target.id;
      state.scanProgress = 0;
      state.scanStartedAt = now;
      state.completedDuringHold = false;
      const targetId = candidate.target.id;
      state.scanTimer = setTimeout(() => {
        if (!state.scanActive || state.completedDuringHold || state.currentTarget?.target.id !== targetId) return;
        state.scanProgress = 1;
        completeFinding(state.currentTarget);
        renderTarget(state.currentTarget);
      }, candidate.target.scanSeconds * 1000);
    }

    function setScanning(active) {
      state.scanActive = active;
      root.classList.toggle('scanning', active);
      if (active && state.currentTarget) armScan(state.currentTarget, performance.now());
      if (!active) {
        clearTimeout(state.scanTimer);
        state.scanTimer = 0;
        state.scanProgress = 0;
        state.scanTargetId = null;
        state.scanStartedAt = 0;
        state.completedDuringHold = false;
      }
    }

    function createMarker(target) {
      const marker = document.createElement('div');
      marker.className = 'sxe-world-marker';
      marker.innerHTML = '<i></i><span></span>';
      marker.querySelector('span').textContent = target.name;
      refs.worldMarkers.appendChild(marker);
      state.markerEntries.push({ target, marker });
    }

    function renderMarkers() {
      if (!state.controls || !state.markerEntries.length) return;
      const forward = state.controls.forward;
      const yaw = state.controls.yaw;
      const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const up = [
        forward[1] * right[2] - forward[2] * right[1],
        forward[2] * right[0] - forward[0] * right[2],
        forward[0] * right[1] - forward[1] * right[0]
      ];
      const aspect = Math.max(0.1, window.innerWidth / Math.max(1, window.innerHeight));
      const tanHalfFov = 0.62;
      for (const entry of state.markerEntries) {
        const vector = entry.target.position.map((value, index) => value - state.position[index]);
        const depth = vector[0] * forward[0] + vector[1] * forward[1] + vector[2] * forward[2];
        const horizontal = vector[0] * right[0] + vector[1] * right[1] + vector[2] * right[2];
        const vertical = vector[0] * up[0] + vector[1] * up[1] + vector[2] * up[2];
        const x = horizontal / Math.max(0.001, depth * tanHalfFov * aspect);
        const y = vertical / Math.max(0.001, depth * tanHalfFov);
        const visible = depth > 0.25 && Math.abs(x) < 0.94 && Math.abs(y) < 0.88;
        entry.marker.hidden = !visible;
        if (!visible) continue;
        entry.marker.style.left = `${(x * 0.5 + 0.5) * 100}%`;
        entry.marker.style.top = `${(-y * 0.5 + 0.5) * 100}%`;
        entry.marker.classList.toggle('active', state.currentTarget?.target.id === entry.target.id);
      }
    }

    function registerTargets(assets, packageMeta = {}) {
      const list = Array.isArray(assets) ? assets : [];
      const packageId = String(packageMeta.packageId || `package-${state.packages.length + 1}`);
      let located = 0;
      let unlocated = 0;
      let duplicates = 0;
      for (const asset of list) {
        const spatial = asset && asset.spatial;
        const position = spatial && Array.isArray(spatial.position) ? spatial.position.map(Number) : null;
        const isLocated = spatial && spatial.coordinateSystem === 'site-local' && spatial.units === 'm'
          && position && position.length >= 3 && position.every(Number.isFinite);
        if (!isLocated) {
          unlocated += 1;
          continue;
        }
        const assetId = String(asset.id || `asset-${located + unlocated}`);
        const id = `${packageId}:${assetId}`;
        if (targetIds.has(id)) {
          duplicates += 1;
          continue;
        }
        const provenance = asset.provenance || {};
        const target = Object.freeze({
          id,
          packageId,
          type: String(asset.type || 'IMPORTED ASSET').toUpperCase(),
          name: String(asset.name || assetId),
          summary: String(asset.summary || 'Spatial asset compiled from supplied site evidence.'),
          dimensions: typeof asset.dimensions === 'string' ? asset.dimensions : (asset.dimensions ? JSON.stringify(asset.dimensions) : 'NOT SUPPLIED'),
          material: String(asset.material || 'UNCLASSIFIED'),
          hazard: String(asset.hazard || 'FIELD VERIFICATION REQUIRED'),
          status: String(asset.status || provenance.status || 'COMPILED').toUpperCase(),
          position: Object.freeze(position.slice(0, 3)),
          radius: Math.max(0.35, Number(asset.radius) || 0.75),
          maxRange: Math.max(5, Number(asset.maxRange) || 24),
          scanSeconds: Math.max(0.4, Number(asset.scanSeconds) || 0.85),
          tags: Object.freeze(['imported', ...(Array.isArray(asset.tags) ? asset.tags : [])]),
          provenance: Object.freeze({
            method: String(provenance.method || 'site-genome-import'),
            status: String(provenance.status || 'observed'),
            confidence: Number.isFinite(provenance.confidence) ? provenance.confidence : null,
            sourceRefs: Object.freeze(Array.isArray(provenance.sourceRefs) ? provenance.sourceRefs.slice() : [])
          })
        });
        targets.push(target);
        targetIds.add(id);
        createMarker(target);
        located += 1;
      }
      const packageRecord = Object.freeze({
        packageId,
        siteName: String(packageMeta.site?.name || packageMeta.siteName || state.siteName),
        schema: String(packageMeta.schema || 'unknown'),
        located,
        unlocated,
        sourceCount: Array.isArray(packageMeta.sources) ? packageMeta.sources.length : null
      });
      state.packages.push(packageRecord);
      if (packageRecord.siteName) {
        state.siteName = packageRecord.siteName;
        refs.siteSubtitle.textContent = `SEMANTIC SITE TWIN / ${state.siteName.toUpperCase()}`;
      }
      notify(`${located} SPATIAL ASSET${located === 1 ? '' : 'S'} HYDRATED / ${unlocated} HELD AS EVIDENCE`);
      return Object.freeze({ located, unlocated, duplicates, packageId });
    }

    function setInteractionEnabled(active) {
      if (state.controls) state.controls.setEnabled(Boolean(active));
      if (!active && document.pointerLockElement) document.exitPointerLock();
    }

    function update(ts, controls) {
      if (controls && !state.controls) attachControls(controls);
      const dt = state.lastTs ? Math.min((ts - state.lastTs) / 1000, 0.1) : 0;
      state.lastTs = ts;
      if (state.controls) {
        state.position = state.controls.position.slice();
        state.forward = state.controls.forward.slice();
      }
      updateTour(ts);
      const candidate = getTarget(state.position, state.forward);
      state.currentTarget = candidate;
      if (state.scanActive && candidate) {
        if (state.scanTargetId !== candidate.target.id) {
          armScan(candidate, ts);
        }
        if (!state.completedDuringHold) {
          state.scanProgress = clamp((ts - state.scanStartedAt) / (candidate.target.scanSeconds * 1000), 0, 1);
          if (state.scanProgress >= 1) completeFinding(candidate);
        }
      } else if (state.scanActive) {
        clearTimeout(state.scanTimer);
        state.scanTimer = 0;
        state.scanProgress = 0;
        state.scanTargetId = null;
        state.scanStartedAt = 0;
      }
      renderTarget(candidate);
      renderMarkers();
      checkMission();

      if (dt > 0 && dt < 0.2) {
        state.frameSeconds += dt;
        state.frameCount += 1;
      }
      if (state.frameSeconds >= 2.5) {
        const fps = state.frameCount / state.frameSeconds;
        if (settings().quality === 'auto') {
          const before = state.autoScale;
          if (fps < 42) state.autoScale = clamp(state.autoScale - 0.14, 0.62, 1.35);
          if (fps > 57) state.autoScale = clamp(state.autoScale + 0.08, 0.62, 1.35);
          if (before !== state.autoScale) state.resizeRequested = true;
        }
        refs.quality.textContent = `${settings().quality.toUpperCase()} / ${Math.round(fps)} FPS`;
        state.frameSeconds = 0;
        state.frameCount = 0;
      }
    }

    renderFindings();
    checkMission();

    return Object.freeze({
      attachControls,
      setScanning,
      update,
      cancelTour: () => stopTour(),
      toggleSettings: () => { refreshSettings(); toggleDrawer(refs.settings); },
      toggleReport: () => toggleDrawer(refs.report),
      toggleTour: startTour,
      registerTargets,
      setInteractionEnabled,
      notify,
      get targetCount() { return targets.length; },
      get packageCount() { return state.packages.length; },
      get renderScale() {
        const mode = settings().quality;
        const dpr = window.devicePixelRatio || 1;
        if (mode === 'high') return Math.min(dpr, 1.5);
        if (mode === 'balanced') return Math.min(dpr, 1.0);
        if (mode === 'performance') return Math.min(dpr, 0.72);
        return Math.min(dpr, state.autoScale);
      },
      consumeResizeRequest() {
        const requested = state.resizeRequested;
        state.resizeRequested = false;
        return requested;
      },
      get scanAmount() { return state.scanActive ? 1 : 0; },
      get targetPosition() { return state.currentTarget ? state.currentTarget.target.position : [999, 999, 999]; }
    });
  }

  window.SightXExperience = Object.freeze({ create });
}());
