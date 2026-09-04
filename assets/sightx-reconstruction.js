import * as pdfjs from './pdfjs/pdf.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';

const CATALOG_URL = '/sightx/projects/glendale-camino-real/catalog.json';
const CATALOG_BASE = '/sightx/projects/glendale-camino-real/';
const INF = 1e9;

function element(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  if (text) node.textContent = text;
  return node;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${url}`));
    image.src = url;
  });
}

function chamferDistance(target, width, height) {
  const result = new Float32Array(width * height);
  for (let index = 0; index < result.length; index += 1) result[index] = target[index] ? 0 : INF;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      let value = result[index];
      if (x > 0) value = Math.min(value, result[index - 1] + 1);
      if (y > 0) value = Math.min(value, result[index - width] + 1);
      if (x > 0 && y > 0) value = Math.min(value, result[index - width - 1] + diagonal);
      if (x + 1 < width && y > 0) value = Math.min(value, result[index - width + 1] + diagonal);
      result[index] = value;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      let value = result[index];
      if (x + 1 < width) value = Math.min(value, result[index + 1] + 1);
      if (y + 1 < height) value = Math.min(value, result[index + width] + 1);
      if (x + 1 < width && y + 1 < height) value = Math.min(value, result[index + width + 1] + diagonal);
      if (x > 0 && y + 1 < height) value = Math.min(value, result[index + width - 1] + diagonal);
      result[index] = value;
    }
  }
  return result;
}

function imageMaskToSdf(maskImage, bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = maskImage.naturalWidth || maskImage.width;
  canvas.height = maskImage.naturalHeight || maskImage.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(maskImage, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const walls = new Uint8Array(canvas.width * canvas.height);
  const open = new Uint8Array(walls.length);
  let wallPixels = 0;
  for (let index = 0; index < walls.length; index += 1) {
    const offset = index * 4;
    const intensity = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
    walls[index] = intensity > 127 ? 1 : 0;
    open[index] = walls[index] ? 0 : 1;
    wallPixels += walls[index];
  }
  const outside = chamferDistance(walls, canvas.width, canvas.height);
  const inside = chamferDistance(open, canvas.width, canvas.height);
  const metersPerPixel = (bounds[2] - bounds[0]) / canvas.width;
  const sdf = new Float32Array(walls.length);
  for (let index = 0; index < sdf.length; index += 1) {
    sdf[index] = (walls[index] ? -inside[index] : outside[index]) * metersPerPixel - 0.07;
  }
  return { sdf, walls, width: canvas.width, height: canvas.height, wallPixels, metersPerPixel };
}

function chooseSpawn(compiled, bounds) {
  const centerX = Math.round(compiled.width / 2);
  const centerY = Math.round(compiled.height / 2);
  let best = null;
  let bestScore = Infinity;
  for (let y = 2; y < compiled.height - 2; y += 2) {
    for (let x = 2; x < compiled.width - 2; x += 2) {
      const distance = compiled.sdf[y * compiled.width + x];
      if (distance < 0.65 || distance > 5.5) continue;
      const score = Math.hypot(x - centerX, y - centerY) - Math.min(distance, 2) * 4;
      if (score < bestScore) { bestScore = score; best = [x, y]; }
    }
  }
  if (!best) best = [centerX, centerY];
  const x = bounds[0] + (best[0] / Math.max(1, compiled.width - 1)) * (bounds[2] - bounds[0]);
  const z = bounds[1] + (best[1] / Math.max(1, compiled.height - 1)) * (bounds[3] - bounds[1]);
  return [x, 1.72, z];
}

function dataUrlFromCanvas(canvas, type = 'image/webp', quality = 0.9) {
  return canvas.toDataURL(type, quality);
}

function localFallbackMask(sourceCanvas) {
  const width = Math.min(640, sourceCanvas.width);
  const height = Math.max(96, Math.round(sourceCanvas.height * width / sourceCanvas.width));
  const work = document.createElement('canvas');
  work.width = width;
  work.height = height;
  const context = work.getContext('2d', { willReadFrequently: true });
  context.drawImage(sourceCanvas, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const dark = new Uint8Array(width * height);
  for (let index = 0; index < dark.length; index += 1) {
    const offset = index * 4;
    dark[index] = (image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / 3 < 95 ? 1 : 0;
  }
  const mask = new Uint8Array(dark.length);
  const minimum = Math.max(12, Math.round(width / 34));
  for (let y = 0; y < height; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const active = x < width && dark[y * width + x];
      if (active && start < 0) start = x;
      if (!active && start >= 0) {
        if (x - start >= minimum) for (let px = start; px < x; px += 1) mask[y * width + px] = 1;
        start = -1;
      }
    }
  }
  for (let x = 0; x < width; x += 1) {
    let start = -1;
    for (let y = 0; y <= height; y += 1) {
      const active = y < height && dark[y * width + x];
      if (active && start < 0) start = y;
      if (!active && start >= 0) {
        if (y - start >= minimum) for (let py = start; py < y; py += 1) mask[py * width + x] = 1;
        start = -1;
      }
    }
  }
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d');
  const outputImage = outputContext.createImageData(width, height);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ? 255 : 0;
    outputImage.data.set([value, value, value, 255], index * 4);
  }
  outputContext.putImageData(outputImage, 0, 0);
  return output;
}

const trigger = element('button', { id: 'sx-plan-trigger', type: 'button', html: '<i></i><b>PDF TWIN</b><span>LOADING SOURCE</span>' });
const panel = element('section', { id: 'sx-plan-panel', hidden: '', 'aria-label': 'SightX PDF reconstruction' });
panel.innerHTML = `
  <div class="sx-plan-shell">
    <header class="sx-plan-head"><div><small>SIGHTX / SOURCE-TRACED RECONSTRUCTION</small><h2>PDF to Building</h2></div><button class="sx-plan-close" type="button">CLOSE</button></header>
    <label class="sx-plan-field"><span>PROJECT PDF</span><select data-sx-project></select></label>
    <label class="sx-plan-field"><span>LEVEL / SOURCE SHEET</span><select data-sx-level></select></label>
    <p class="sx-plan-address" data-sx-address></p>
    <div class="sx-plan-actions">
      <button class="sx-plan-button" type="button" data-sx-enter>ENTER TWIN</button>
      <button class="sx-plan-button" type="button" data-sx-context>REALITY CONTEXT</button>
      <a class="sx-plan-upload"><input type="file" accept="application/pdf,image/*" data-sx-upload><span>UPLOAD PDF</span></a>
    </div>
    <div class="sx-upload-controls" data-sx-upload-controls>
      <div class="sx-upload-row">
        <label class="sx-plan-field"><span>PAGE</span><select data-sx-upload-page></select></label>
        <label class="sx-plan-field"><span>PLAN WIDTH (METERS)</span><input type="number" min="3" max="500" step="0.5" value="30" data-sx-width></label>
      </div>
      <div class="sx-plan-actions"><button class="sx-plan-button" type="button" data-sx-rotate>ROTATE 90</button><button class="sx-plan-button" type="button" data-sx-compile>RECONSTRUCT SELECTION</button></div>
      <small>Drag over the drawing to crop away title blocks, notes, and schedules before reconstruction.</small>
    </div>
    <div class="sx-plan-proof"><button type="button" data-sx-proof="source" class="active">SOURCE PDF</button><button type="button" data-sx-proof="normalized">MODEL INPUT</button><button type="button" data-sx-proof="semantic">SEMANTIC RESULT</button></div>
    <figure class="sx-plan-image"><img data-sx-proof-image alt="Selected PDF source region"><canvas data-sx-upload-canvas hidden></canvas><i class="sx-crop-box" hidden></i></figure>
    <p class="sx-plan-status" data-sx-status>Loading the verified project catalog...</p>
    <div class="sx-plan-metrics"><span class="sx-plan-metric"><small>SOURCE</small><b data-sx-sheet>--</b></span><span class="sx-plan-metric"><small>LEVELS</small><b data-sx-levels>--</b></span><span class="sx-plan-metric"><small>METHOD</small><b data-sx-method>--</b></span></div>
    <div class="sx-plan-provenance" data-sx-provenance><b>EVIDENCE BOUNDARY</b><br>PDF geometry is machine-derived and visibly linked to its source. Google context is rendered by Google and is not claimed as Weyland-authored geometry.</div>
  </div>
  <div class="sx-context"><div class="sx-context-label">GOOGLE MAPS / LIVE SURROUNDING CONTEXT</div><div class="sx-context-empty" data-sx-context-empty>Select Reality Context to inspect the project address and surrounding campus. Photorealistic 3D fusion requires a domain-restricted Google Maps Platform key; no unrestricted key is embedded here.</div><iframe data-sx-map title="Google Maps project context" loading="lazy" allowfullscreen hidden></iframe></div>`;
document.body.append(trigger, panel);

const refs = {
  project: panel.querySelector('[data-sx-project]'),
  level: panel.querySelector('[data-sx-level]'),
  address: panel.querySelector('[data-sx-address]'),
  proofImage: panel.querySelector('[data-sx-proof-image]'),
  status: panel.querySelector('[data-sx-status]'),
  sheet: panel.querySelector('[data-sx-sheet]'),
  levels: panel.querySelector('[data-sx-levels]'),
  method: panel.querySelector('[data-sx-method]'),
  provenance: panel.querySelector('[data-sx-provenance]'),
  map: panel.querySelector('[data-sx-map]'),
  contextEmpty: panel.querySelector('[data-sx-context-empty]'),
  upload: panel.querySelector('[data-sx-upload]'),
  uploadControls: panel.querySelector('[data-sx-upload-controls]'),
  uploadPage: panel.querySelector('[data-sx-upload-page]'),
  width: panel.querySelector('[data-sx-width]'),
  uploadCanvas: panel.querySelector('[data-sx-upload-canvas]'),
  cropBox: panel.querySelector('.sx-crop-box'),
  figure: panel.querySelector('.sx-plan-image')
};

const state = {
  catalog: null,
  project: null,
  level: null,
  proof: 'source',
  upload: { file: null, pdf: null, page: 1, rotation: 0, crop: null, drawing: false, start: null }
};

function status(message, tone = '') {
  refs.status.textContent = message;
  refs.status.dataset.tone = tone;
}

function openPanel(force = true) {
  panel.hidden = !force;
  if (window.SightXPlanRenderer?.active && document.pointerLockElement) document.exitPointerLock();
}

function proofUrl(level, kind) {
  if (!level) return '';
  if (kind === 'semantic') return CATALOG_BASE + level.semanticPreview;
  if (kind === 'normalized') return CATALOG_BASE + level.modelInputPreview;
  return CATALOG_BASE + level.sourcePreview;
}

function showProof(kind) {
  state.proof = kind;
  panel.querySelectorAll('[data-sx-proof]').forEach(button => button.classList.toggle('active', button.dataset.sxProof === kind));
  if (!state.upload.file && state.level) refs.proofImage.src = proofUrl(state.level, kind);
}

async function loadCatalogLevel(levelId) {
  if (!state.project) return;
  const level = state.project.levels.find(item => item.id === levelId) || state.project.levels[0];
  state.level = level;
  state.upload.file = null;
  refs.uploadControls.classList.remove('active');
  refs.uploadCanvas.hidden = true;
  refs.proofImage.hidden = false;
  showProof(state.proof);
  refs.sheet.textContent = level.sheet;
  refs.levels.textContent = String(state.project.levels.length);
  refs.method.textContent = level.extraction.method.includes('unet') ? 'SEMANTIC AI' : 'CV FALLBACK';
  status(`Compiling ${level.label} from ${state.project.source.file}, page ${level.page}...`);
  try {
    const [maskImage, sourceImage] = await Promise.all([
      loadImage(CATALOG_BASE + level.wallMask),
      loadImage(CATALOG_BASE + level.sourcePreview)
    ]);
    const compiled = imageMaskToSdf(maskImage, level.boundsM);
    const spawn = chooseSpawn(compiled, level.boundsM);
    window.SightXPlanRenderer.load({
      ...compiled,
      bounds: level.boundsM,
      wallHeight: level.heightM,
      spawn,
      yaw: 0,
      sourceImage,
      label: `${state.project.name} / ${level.sheet}`
    });
    trigger.querySelector('span').textContent = `${level.sheet} / ${state.project.name.split(' - ')[0]}`;
    status(`${level.label} reconstructed from ${compiled.wallPixels.toLocaleString()} classified wall pixels. Review Source, Model Input, and Semantic Result before relying on dimensions.`, 'ok');
    refs.provenance.innerHTML = `<b>OBSERVED SOURCE</b><br>${state.project.source.file}, page ${level.page}, ${level.sheet}. SHA-256 ${state.project.source.sha256.slice(0, 16)}...<br><b>INFERRED</b><br>${level.extraction.method}; ${level.extraction.status}.`;
  } catch (error) {
    status(`Reconstruction failed: ${error.message}`, 'error');
  }
}

async function loadProject(projectId) {
  state.project = state.catalog.projects.find(item => item.id === projectId) || state.catalog.projects[0];
  refs.address.textContent = state.project.address;
  refs.level.replaceChildren(...state.project.levels.map(level => element('option', { value: level.id }, level.label)));
  refs.map.src = state.project.context.embedUrl;
  await loadCatalogLevel(state.project.levels[0].id);
}

function updateCropBox() {
  if (!state.upload.crop || refs.uploadCanvas.hidden) { refs.cropBox.hidden = true; return; }
  const canvasRect = refs.uploadCanvas.getBoundingClientRect();
  const figureRect = refs.figure.getBoundingClientRect();
  const crop = state.upload.crop;
  refs.cropBox.hidden = false;
  refs.cropBox.style.left = `${canvasRect.left - figureRect.left + crop.x * canvasRect.width}px`;
  refs.cropBox.style.top = `${canvasRect.top - figureRect.top + crop.y * canvasRect.height}px`;
  refs.cropBox.style.width = `${crop.w * canvasRect.width}px`;
  refs.cropBox.style.height = `${crop.h * canvasRect.height}px`;
}

async function renderUploadPage() {
  const upload = state.upload;
  if (!upload.file) return;
  status(`Rendering ${upload.file.name}, page ${upload.page} locally...`);
  const canvas = refs.uploadCanvas;
  const context = canvas.getContext('2d');
  if (upload.pdf) {
    const page = await upload.pdf.getPage(upload.page);
    const initial = page.getViewport({ scale: 1, rotation: page.rotate + upload.rotation });
    const scale = Math.min(2.2, 1400 / Math.max(initial.width, initial.height));
    const viewport = page.getViewport({ scale, rotation: page.rotate + upload.rotation });
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
  } else {
    const image = await loadImage(URL.createObjectURL(upload.file));
    const swap = Math.abs(upload.rotation % 180) === 90;
    canvas.width = swap ? image.height : image.width;
    canvas.height = swap ? image.width : image.height;
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(upload.rotation * Math.PI / 180);
    context.drawImage(image, -image.width / 2, -image.height / 2);
    context.restore();
  }
  upload.crop = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
  refs.proofImage.hidden = true;
  refs.uploadCanvas.hidden = false;
  requestAnimationFrame(updateCropBox);
  status('Drag a tight rectangle around the floor plan, excluding title blocks and notes, then reconstruct.');
}

async function selectUpload(file) {
  if (!file) return;
  state.upload = { file, pdf: null, page: 1, rotation: 0, crop: null, drawing: false, start: null };
  refs.uploadControls.classList.add('active');
  refs.uploadPage.replaceChildren();
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    state.upload.pdf = await pdfjs.getDocument({ data: bytes }).promise;
    for (let page = 1; page <= state.upload.pdf.numPages; page += 1) refs.uploadPage.append(element('option', { value: page }, `Page ${page}`));
  } else {
    refs.uploadPage.append(element('option', { value: 1 }, 'Image'));
  }
  refs.sheet.textContent = 'UPLOAD';
  refs.method.textContent = 'PENDING';
  await renderUploadPage();
}

function cropCanvas() {
  const source = refs.uploadCanvas;
  const crop = state.upload.crop || { x: 0, y: 0, w: 1, h: 1 };
  const x = Math.round(crop.x * source.width);
  const y = Math.round(crop.y * source.height);
  const width = Math.max(1, Math.round(crop.w * source.width));
  const height = Math.max(1, Math.round(crop.h * source.height));
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  result.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height);
  return result;
}

async function requestSemanticMask(source) {
  const blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
  const form = new FormData();
  form.append('file', blob, 'selected-plan.png');
  const response = await fetch('/api/sightx/reconstruct', { method: 'POST', body: form });
  if (!response.ok) throw new Error(`semantic compiler returned HTTP ${response.status}`);
  return response.json();
}

async function reconstructUpload() {
  if (!state.upload.file) return;
  const source = cropCanvas();
  const planWidth = Math.max(3, Math.min(500, Number(refs.width.value) || 30));
  const bounds = [-planWidth / 2, -(planWidth * source.height / source.width) / 2, planWidth / 2, (planWidth * source.height / source.width) / 2];
  status('Running wall, door, and window segmentation on the selected drawing...');
  let maskImage;
  let semanticUrl = '';
  let method = 'SEMANTIC AI';
  try {
    const result = await requestSemanticMask(source);
    maskImage = await loadImage(result.wallMask);
    semanticUrl = result.semanticPreview;
    refs.provenance.innerHTML = `<b>UPLOADED SOURCE</b><br>${state.upload.file.name}, page ${state.upload.page}; processed ephemerally.<br><b>INFERRED</b><br>${result.method}; ${result.status}.`;
  } catch (error) {
    const fallback = localFallbackMask(source);
    maskImage = await loadImage(dataUrlFromCanvas(fallback, 'image/png'));
    semanticUrl = dataUrlFromCanvas(fallback, 'image/png');
    method = 'CV FALLBACK';
    refs.provenance.innerHTML = `<b>FALLBACK ACTIVE</b><br>${error.message}. Geometry is a line-based hypothesis and requires manual review.`;
  }
  const compiled = imageMaskToSdf(maskImage, bounds);
  const spawn = chooseSpawn(compiled, bounds);
  window.SightXPlanRenderer.load({ ...compiled, bounds, wallHeight: 3.2, spawn, sourceImage: source, label: state.upload.file.name });
  refs.proofImage.src = semanticUrl;
  refs.proofImage.hidden = false;
  refs.uploadCanvas.hidden = true;
  refs.cropBox.hidden = true;
  refs.method.textContent = method;
  trigger.querySelector('span').textContent = `UPLOAD / ${state.upload.file.name}`;
  status(`${state.upload.file.name} reconstructed. Source dimensions are unverified until a drawing scale is confirmed.`, method === 'SEMANTIC AI' ? 'ok' : 'error');
}

trigger.addEventListener('click', () => openPanel(true));
panel.querySelector('.sx-plan-close').addEventListener('click', () => openPanel(false));
panel.querySelector('[data-sx-enter]').addEventListener('click', () => openPanel(false));
panel.querySelector('[data-sx-context]').addEventListener('click', () => {
  refs.contextEmpty.hidden = true;
  refs.map.hidden = false;
});
refs.project.addEventListener('change', () => loadProject(refs.project.value));
refs.level.addEventListener('change', () => loadCatalogLevel(refs.level.value));
refs.upload.addEventListener('change', event => selectUpload(event.target.files[0]).catch(error => status(error.message, 'error')));
refs.uploadPage.addEventListener('change', () => { state.upload.page = Number(refs.uploadPage.value); renderUploadPage().catch(error => status(error.message, 'error')); });
panel.querySelector('[data-sx-rotate]').addEventListener('click', () => { state.upload.rotation = (state.upload.rotation + 90) % 360; renderUploadPage().catch(error => status(error.message, 'error')); });
panel.querySelector('[data-sx-compile]').addEventListener('click', () => reconstructUpload().catch(error => status(error.message, 'error')));
panel.querySelectorAll('[data-sx-proof]').forEach(button => button.addEventListener('click', () => showProof(button.dataset.sxProof)));

refs.uploadCanvas.addEventListener('pointerdown', event => {
  const rect = refs.uploadCanvas.getBoundingClientRect();
  state.upload.drawing = true;
  state.upload.start = [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  state.upload.crop = { x: state.upload.start[0], y: state.upload.start[1], w: 0, h: 0 };
  refs.uploadCanvas.setPointerCapture(event.pointerId);
});
refs.uploadCanvas.addEventListener('pointermove', event => {
  if (!state.upload.drawing) return;
  const rect = refs.uploadCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  const [startX, startY] = state.upload.start;
  state.upload.crop = { x: Math.min(startX, x), y: Math.min(startY, y), w: Math.abs(x - startX), h: Math.abs(y - startY) };
  updateCropBox();
});
refs.uploadCanvas.addEventListener('pointerup', event => {
  state.upload.drawing = false;
  refs.uploadCanvas.releasePointerCapture(event.pointerId);
  if (state.upload.crop.w < 0.02 || state.upload.crop.h < 0.02) state.upload.crop = { x: 0, y: 0, w: 1, h: 1 };
  updateCropBox();
});
window.addEventListener('resize', updateCropBox);
document.addEventListener('keydown', event => {
  if (event.code === 'KeyP' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { event.preventDefault(); openPanel(panel.hidden); }
  if (event.code === 'Escape' && !panel.hidden) openPanel(false);
});

try {
  state.catalog = await fetch(CATALOG_URL, { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error(`catalog HTTP ${response.status}`);
    return response.json();
  });
  refs.project.replaceChildren(...state.catalog.projects.map(project => element('option', { value: project.id }, project.name)));
  await loadProject(state.catalog.projects[0].id);
  openPanel(true);
} catch (error) {
  status(`Project catalog unavailable: ${error.message}`, 'error');
  trigger.querySelector('span').textContent = 'SOURCE CATALOG ERROR';
}
