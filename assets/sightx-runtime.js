(() => {
  'use strict';

  const MANIFEST_SCHEMA = 'weyland.sightx.runtime-manifest.v1';
  const BRIDGE_SCHEMA = 'weyland.sightx.runtime-bridge.v1';
  const DEFAULT_MANIFEST_URL = '/sightx/runtime-manifest.json';

  function validateManifest(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') return ['manifest must be an object'];
    if (manifest.schema !== MANIFEST_SCHEMA) errors.push(`schema must be ${MANIFEST_SCHEMA}`);
    if (!manifest.scene?.id) errors.push('scene.id is required');
    if (!manifest.scene?.name) errors.push('scene.name is required');
    if (!['site-local', 'source-unmapped'].includes(manifest.scene?.coordinateSystem)) errors.push('scene.coordinateSystem is invalid');
    if (!['m', 'ft'].includes(manifest.scene?.units)) errors.push('scene.units is invalid');
    if (manifest.runtimes?.web?.status !== 'available') errors.push('browser runtime must be available');
    if (manifest.runtimes?.unreal?.transport !== 'webrtc') errors.push('Unreal transport must be webrtc');
    if (manifest.bridge?.schema !== BRIDGE_SCHEMA) errors.push(`bridge.schema must be ${BRIDGE_SCHEMA}`);
    return errors;
  }

  function safeEndpoint(value, pageUrl = globalThis.location?.href || 'https://weylandai.com/') {
    if (!value || typeof value !== 'string') return null;
    try {
      const endpoint = new URL(value, pageUrl);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
      if (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) return null;
      return endpoint;
    } catch (_) {
      return null;
    }
  }

  function runtimeFromLocation(value) {
    try {
      const requested = new URL(value || globalThis.location?.href || 'https://weylandai.com/').searchParams.get('runtime');
      return requested === 'unreal' ? 'unreal' : 'web';
    } catch (_) {
      return 'web';
    }
  }

  async function readManifest(url, fetcher = globalThis.fetch) {
    if (typeof fetcher !== 'function') throw new Error('fetch is unavailable');
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`runtime manifest returned HTTP ${response.status}`);
    return response.json();
  }

  function mountShell(document) {
    const root = document.createElement('nav');
    root.id = 'sightx-runtime';
    root.setAttribute('aria-label', 'SightX renderer');
    root.innerHTML = `
      <button type="button" data-runtime="web" aria-pressed="true">WEB</button>
      <button type="button" data-runtime="unreal" aria-pressed="false">UNREAL</button>
    `;
    const status = document.createElement('div');
    status.id = 'sightx-runtime-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.append(root, status);
    return { root, status };
  }

  async function mount(options = {}) {
    const document = options.document || globalThis.document;
    if (!document?.body) throw new Error('SightX runtime requires a document body');
    const manifest = options.manifest || await readManifest(options.manifestUrl || DEFAULT_MANIFEST_URL, options.fetcher);
    const errors = validateManifest(manifest);
    if (errors.length) throw new Error(`Invalid SightX runtime manifest: ${errors.join('; ')}`);

    document.getElementById('sightx-runtime')?.remove();
    document.getElementById('sightx-runtime-status')?.remove();
    document.getElementById('sightx-unreal-frame')?.remove();
    const ui = mountShell(document);
    const configuredUrl = options.pixelStreamingUrl || globalThis.SIGHTX_PIXEL_STREAMING_URL || manifest.runtimes.unreal.frontendUrl;
    const endpoint = safeEndpoint(configuredUrl, options.pageUrl);
    const unrealButton = ui.root.querySelector('[data-runtime="unreal"]');
    unrealButton.setAttribute('aria-disabled', endpoint ? 'false' : 'true');
    unrealButton.title = endpoint ? 'Open the GPU-rendered Unreal runtime' : 'A packaged Unreal build and Pixel Streaming endpoint are not configured';
    let active = 'web';
    let frame = null;
    let statusTimer = 0;

    function announce(message, persist = false) {
      ui.status.textContent = message;
      ui.status.classList.add('visible');
      if (statusTimer) globalThis.clearTimeout(statusTimer);
      if (!persist) statusTimer = globalThis.setTimeout(() => ui.status.classList.remove('visible'), 3500);
    }

    function updateAddress(runtime) {
      if (options.updateAddress === false || !globalThis.history?.replaceState || !globalThis.location?.href) return;
      const url = new URL(globalThis.location.href);
      if (runtime === 'unreal') url.searchParams.set('runtime', 'unreal');
      else url.searchParams.delete('runtime');
      globalThis.history.replaceState({}, '', url);
    }

    function setPressed(runtime) {
      ui.root.querySelectorAll('[data-runtime]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.runtime === runtime));
      });
    }

    function sendScene() {
      if (!frame?.contentWindow || !endpoint) return;
      frame.contentWindow.postMessage({
        schema: BRIDGE_SCHEMA,
        type: 'sightx:scene:load',
        scene: manifest.scene
      }, endpoint.origin);
    }

    function activate(runtime) {
      if (runtime === 'unreal' && !endpoint) {
        announce('UNREAL NODE NOT CONFIGURED. WEB RUNTIME REMAINS ACTIVE.', true);
        return false;
      }
      active = runtime;
      setPressed(runtime);
      updateAddress(runtime);
      document.body.classList.toggle('sx-runtime-unreal', runtime === 'unreal');
      if (runtime === 'web') {
        if (frame) frame.hidden = true;
        announce('BROWSER RUNTIME ACTIVE');
      } else {
        if (!frame) {
          frame = document.createElement('iframe');
          frame.id = 'sightx-unreal-frame';
          frame.title = `${manifest.scene.name} Unreal runtime`;
          frame.allow = 'autoplay; fullscreen; microphone; gamepad; clipboard-read; clipboard-write';
          frame.allowFullscreen = true;
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.src = endpoint.href;
          frame.addEventListener('load', sendScene);
          document.body.append(frame);
        }
        frame.hidden = false;
        announce('UNREAL PIXEL STREAMING SESSION CONNECTING', true);
      }
      globalThis.dispatchEvent?.(new CustomEvent('sightx:runtimechange', { detail: { runtime, scene: manifest.scene } }));
      return true;
    }

    ui.root.addEventListener('click', event => {
      const button = event.target.closest?.('[data-runtime]');
      if (button) activate(button.dataset.runtime);
    });

    globalThis.addEventListener?.('message', event => {
      if (!endpoint || event.origin !== endpoint.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.schema !== BRIDGE_SCHEMA) return;
      if (event.data.type === 'sightx:runtime:ready') {
        announce('UNREAL RUNTIME ACTIVE');
        sendScene();
      }
      if (event.data.type === 'sightx:field-record') {
        globalThis.dispatchEvent?.(new CustomEvent('sightx:field-record', { detail: event.data.record }));
      }
    });

    const requested = options.runtime || runtimeFromLocation(options.pageUrl);
    if (requested === 'unreal' && !activate('unreal')) {
      activate('web');
      announce('UNREAL NODE NOT CONFIGURED. WEB RUNTIME REMAINS ACTIVE.', true);
    } else {
      activate(requested);
    }

    return Object.freeze({
      activate,
      get active() { return active; },
      get endpoint() { return endpoint?.href || null; },
      manifest
    });
  }

  globalThis.SightXRuntime = Object.freeze({
    schema: MANIFEST_SCHEMA,
    bridgeSchema: BRIDGE_SCHEMA,
    mount,
    readManifest,
    runtimeFromLocation,
    safeEndpoint,
    validateManifest
  });
})();
