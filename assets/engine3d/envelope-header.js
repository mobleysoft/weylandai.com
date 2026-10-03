import * as THREE from './three.module.min.js';
import { tactileMaterial, tactileGeometry, createSurfaceMaps } from './tactile-materials.js';

const ROUTES = ["/", "/takeoffx/", "/subx/", "/cutsheetx/", "/huntx/", "/meetingx/", "/propx-app/"];
const NAMES = ["TakeOffX","SubX","CutsheetX","HuntX","MeetingX","PropX"];

export function mountEnvelopeHeader(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.cursor = 'default';

  const scene = new THREE.Scene();

  function makeCheckerTexture(){
    const n = 512;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = n;
    const ctx = cvs.getContext('2d');
    const squares = 16, step = n/squares;
    for(let y=0;y<squares;y++) for(let x=0;x<squares;x++){
      ctx.fillStyle = (x+y)%2===0 ? '#eceded' : '#d3d5d9';
      ctx.fillRect(x*step,y*step,step,step);
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30,30);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function folderShape(w, h, tabW, tabH, tabInset, r=.06){
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(w, 0);
    s.lineTo(w, h);
    s.lineTo(tabInset + tabW, h);
    s.lineTo(tabInset + tabW, h + tabH - r);
    s.quadraticCurveTo(tabInset + tabW, h + tabH, tabInset + tabW - r, h + tabH);
    s.lineTo(tabInset + r, h + tabH);
    s.quadraticCurveTo(tabInset, h + tabH, tabInset, h + tabH - r);
    s.lineTo(tabInset, h);
    s.lineTo(0, h);
    s.closePath();
    return s;
  }
  function folderGeometry(w, h, tabW, tabH, tabInset, depth, bevel){
    const geo = new THREE.ExtrudeGeometry(folderShape(w,h,tabW,tabH,tabInset), {
      depth: depth - 2*bevel, bevelEnabled: true, bevelSegments: 3, steps: 1,
      bevelSize: bevel, bevelThickness: bevel, curveSegments: 4
    });
    geo.translate(0, 0, -depth/2 + bevel);
    return geo;
  }
  function normalizedUV(geo){
    const g = geo.clone();
    g.computeBoundingBox();
    const bb = g.boundingBox, sx = bb.max.x-bb.min.x, sy = bb.max.y-bb.min.y;
    const p = g.attributes.position, uv = new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){
      uv[i*2] = (p.getX(i)-bb.min.x)/sx;
      uv[i*2+1] = (p.getY(i)-bb.min.y)/sy;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv,2));
    return g;
  }

  let realGrainImg = null;
  async function loadRealGrain(){
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = './assets/engine3d/real-grain.png'; });
    realGrainImg = img;
  }
  function paintGrain(ctx, x, y, w, h, strength=1){
    if (!realGrainImg) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = strength;
    for (let gy = y; gy < y+h; gy += realGrainImg.height){
      for (let gx = x; gx < x+w; gx += realGrainImg.width){
        ctx.drawImage(realGrainImg, gx, gy);
      }
    }
    ctx.restore();
  }
  function folderTexture(w, h, tabW, tabH, tabInset, bodyC1, bodyC2, tabColor, draw){
    const res = 512, totalH = h + tabH;
    const cvs = document.createElement('canvas');
    cvs.width = Math.round(res * w/totalH); cvs.height = res;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, cvs.width*0.3, cvs.height);
    grad.addColorStop(0, bodyC1); grad.addColorStop(1, bodyC2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cvs.width, cvs.height);
    const tabX = cvs.width * (tabInset/w), tabW_px = cvs.width * (tabW/w);
    const tabH_px = cvs.height * (tabH/totalH);
    ctx.fillStyle = tabColor;
    ctx.fillRect(tabX, 0, tabW_px, tabH_px);
    paintGrain(ctx, 0, 0, cvs.width, cvs.height, 1);
    if (draw) draw(ctx, tabX, 0, tabW_px, tabH_px, cvs.width, cvs.height);
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  async function loadLogoImage(){
    const svgText = await (await fetch('./assets/brand/weylandai-wordmark.svg')).text();
    const blob = new Blob([svgText], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = url; });
    return img;
  }

  scene.background = null; // transparent - page's own dark bg shows through
  const checkerBg = makeCheckerTexture();

  const FOLDER_W = 2.6, FOLDER_H = FOLDER_W/1.264, TAB_W = FOLDER_W*0.338,
        TAB_H = Math.max(FOLDER_W/1.264*0.051, 0.22), TAB_INSET = FOLDER_W*0.046;
  const FOLDER_D = 0.22, BEVEL = 0.04;
  const OVERLAP = 0.55;
  const folderGeo = folderGeometry(FOLDER_W, FOLDER_H, TAB_W, TAB_H, TAB_INSET, FOLDER_D, BEVEL);
  const BOTTOM_Y = -2.0;
  const count = NAMES.length + 1;
  const step = FOLDER_W - OVERLAP;
  const totalRowW = step*(count-1) + FOLDER_W;
  const startX = -totalRowW/2;

  const group = new THREE.Group();
  scene.add(group);
  const clickables = []; // {mesh, index}

  const ready = Promise.all([loadLogoImage(), loadRealGrain()]).then(([logoImg]) => {
    for (let i = 0; i < count; i++) {
      const isHome = i === 0;
      const tex = folderTexture(FOLDER_W, FOLDER_H, TAB_W, TAB_H, TAB_INSET,
        '#3a63ff', '#0a1142', '#ffd400',
        (ctx, tx, ty, tw, th, cw, ch) => {
          if (isHome) {
            const pad = th*0.16, logoH = th - pad*2, logoW = logoH*(logoImg.width/logoImg.height);
            ctx.drawImage(logoImg, tx + (tw-logoW)/2, ty+pad, logoW, logoH);
          } else {
            ctx.fillStyle = '#1a1300'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.font = `900 ${Math.round(th*0.34)}px ui-monospace, Menlo, monospace`;
            ctx.fillText(NAMES[i-1], tx+tw/2, ty+th*0.52);
          }
          if (i > 0) {
            const shadowW = cw * (OVERLAP / FOLDER_W) * 1.15;
            const g = ctx.createLinearGradient(0, 0, shadowW, 0);
            g.addColorStop(0, 'rgba(0,0,0,0.42)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, shadowW, ch);
          }
        });
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .82, metalness: 0 });
      const o = new THREE.Mesh(normalizedUV(folderGeo), mat);
      o.position.set(startX + i*step, BOTTOM_Y + i*(FOLDER_H*0.07), -i*0.01);
      o.castShadow = true; o.receiveShadow = true;
      group.add(o);
      clickables.push({ mesh: o, index: i });
    }
    const shadowCvs = document.createElement('canvas');
    shadowCvs.width = 512; shadowCvs.height = 256;
    const sctx = shadowCvs.getContext('2d');
    const sg = sctx.createRadialGradient(256,128,10,256,128,250);
    sg.addColorStop(0, 'rgba(0,0,0,0.35)');
    sg.addColorStop(0.7, 'rgba(0,0,0,0.12)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sg; sctx.fillRect(0,0,512,256);
    const shadowTex = new THREE.CanvasTexture(shadowCvs);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(totalRowW*1.05, FOLDER_H*0.22), shadowMat);
    shadowPlane.position.set(0, BOTTOM_Y - FOLDER_H*0.01, -0.3);
    group.add(shadowPlane);
    render();
  });

  scene.add(new THREE.HemisphereLight('#ffffff', '#7b8296', 1.0));
  const sun = new THREE.DirectionalLight('#fff6e8', 3.2);
  sun.position.set(-9, 12, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-14; sun.shadow.camera.right=14; sun.shadow.camera.top=14; sun.shadow.camera.bottom=-14;
  sun.shadow.bias=-.0005;
  scene.add(sun);

  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
  camera.position.set(0, 0, 24);

  const contentTop = BOTTOM_Y + (count-1)*(FOLDER_H*0.07) + FOLDER_H + TAB_H;
  const contentBottom = BOTTOM_Y;
  const contentHeight = contentTop - contentBottom;
  const contentWidth = totalRowW;
  const margin = 0.18;
  const viewCenterY = (contentTop + contentBottom) / 2;

  function updateCameraFrustum(){
    const w = container.clientWidth, h = container.clientHeight;
    const aspect = w / h;
    const viewWFromContent = contentWidth * (1 + margin*2);
    const viewH = Math.max(contentHeight*(1+margin*2), viewWFromContent/aspect);
    const viewW = viewH * aspect;
    camera.left = -viewW/2; camera.right = viewW/2;
    camera.top = viewH/2 + viewCenterY; camera.bottom = -viewH/2 + viewCenterY;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function render(){ renderer.render(scene, camera); }

  updateCameraFrustum();
  render();

  const ro = new ResizeObserver(() => { updateCameraFrustum(); render(); });
  ro.observe(container);

  // Real click-to-navigate: raycast against the actual folder meshes, not
  // a guessed hit-box - clicking anywhere on a folder's visible silhouette
  // navigates to its real product page, same URLs the old CSS header used.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(evt){
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickables.map(c => c.mesh));
    if (!hits.length) return null;
    const hitMesh = hits[0].object;
    return clickables.find(c => c.mesh === hitMesh);
  }
  renderer.domElement.addEventListener('click', (evt) => {
    const hit = pick(evt);
    if (hit) window.location.href = ROUTES[hit.index];
  });
  renderer.domElement.addEventListener('mousemove', (evt) => {
    const hit = pick(evt);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
  });

  window.__envelope3dDebug = { pick, clickables, routes: ROUTES };
  return ready;
}
