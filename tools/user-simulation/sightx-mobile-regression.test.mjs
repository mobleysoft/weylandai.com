// tools/user-simulation/sightx-mobile-regression.test.mjs
//
// The homepage's SightX joystick on a phone (folder lowered, SightX world behind it), checked
// without a browser: the real assets/sightx-controls.js and the real sx-dossier script from
// weyland-sightx-worker/src/pages/sightx.html run in a vm with element stand-ins, and the
// homepage / page CSS that places the stick and lets touches through is checked as text. The
// real-browser proof is journeys/phone-key-journeys.mjs ("the joystick is on screen and follows
// a drag from its centre").
//
// Adapted 2026-10-07 from another session's uncommitted test (2026-10-06): its hero-copy
// assertions stay with that session's uncommitted hero copy; the folder-tilt assertions are
// gone with the tilt (not part of the joystick fix); clearance is checked at more phone sizes.
//
// Usage: node --test tools/user-simulation/sightx-mobile-regression.test.mjs
//        SIGHTX_SOURCE_ROOT=<checkout> node --test ...   (check another checkout's files)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const root = process.env.SIGHTX_SOURCE_ROOT ? new URL('file://' + process.env.SIGHTX_SOURCE_ROOT + '/') : new URL('../../', import.meta.url);
const controlsSource = fs.readFileSync(new URL('assets/sightx-controls.js', root), 'utf8');
const page = fs.readFileSync(new URL('weyland-sightx-worker/src/pages/sightx.html', root), 'utf8');
const home = fs.readFileSync(new URL('index.html', root), 'utf8');
class Element {
  constructor(rect = {}) {
    this.rect = rect; this.events = {}; this.attrs = {}; this.properties = {};
    this.style = { setProperty: (k,v) => this.properties[k] = v, removeProperty: k => { delete this.properties[k]; delete this.style[k]; } };
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x,on) => { on ??= !classes.has(x); on ? classes.add(x) : classes.delete(x); } };
  }
  addEventListener(name, fn) { (this.events[name] ??= []).push(fn); }
  emit(name, data={}) { for (const fn of this.events[name] || []) fn({preventDefault(){}, ...data}); }
  setAttribute(k,v) { this.attrs[k]=v; }
  setPointerCapture(id) { this.captured=id; }
  appendChild() {}
  getBoundingClientRect() { return this.rect; }
}
// The movement zone as the embed CSS places it on a 390 x 844 phone (bottom right, offset from
// the viewport origin), so a stick placed in viewport pixels would land outside it.
function fixture(zoneRect = {left:276,top:666,right:380,bottom:826,width:104,height:160}, coarse = true) {
  const zone = new Element(zoneRect), stick = new Element(), knob = new Element();
  const nodes = {'.sx-move-zone':zone,'.sx-stick':stick,'.sx-stick-knob':knob};
  const touch = new Element(); touch.querySelector = x => nodes[x] ??= new Element();
  stick.getBoundingClientRect = () => ({left:zone.rect.left + (parseFloat(stick.properties['--sx-stick-left']) || 4),top:zone.rect.top + (parseFloat(stick.properties['--sx-stick-top']) || 30),width:96,height:96});
  const win = new Element(), doc = new Element(), canvas = new Element();
  doc.body = new Element(); doc.body.classList.add('sightx-demo'); doc.documentElement = new Element();
  doc.createElement = () => touch;
  const context = vm.createContext({window:win, document:doc, localStorage:{getItem:()=>null,setItem(){}}, matchMedia:()=>({matches:coarse}),performance, console,screen:{}});
  vm.runInContext(controlsSource,context);
  const control = win.SightXControls.mount({canvas, initialPosition:[0,1,-9],groundY:()=>1});
  return {win,doc,zone,stick,knob,touch,control,context};
}
test('floating joystick stays inside an offset movement zone, starts neutral under a thumb on the resting stick, moves and releases', () => {
  const f=fixture(), z=f.zone.rect;
  // A touch anywhere in the zone keeps the whole stick inside the zone (never thrown off screen).
  for (const [x,y] of [[z.left+1,z.top+1],[z.right-1,z.bottom-1],[z.left+1,z.bottom-1],[z.right-1,z.top+1]]) {
    f.zone.emit('pointerdown',{pointerId:9,clientX:x,clientY:y});
    const r=f.stick.getBoundingClientRect();
    assert.ok(r.left>=z.left && r.left+r.width<=z.right && r.top>=z.top && r.top+r.height<=z.bottom, JSON.stringify({x,y,r}));
    f.zone.emit('pointerup',{pointerId:9});
  }
  for(let i=0;i<60;i++) f.control.update(.05);
  // The resting stick (CSS: centred in its 104 x 160 box, 34 px off the bottom) is at
  // zone.left + 4 + 48, zone.top + 30 + 48; a thumb there starts (nearly) neutral.
  const cx=z.left+52, cy=z.top+78;
  f.zone.emit('pointerdown',{pointerId:1,clientX:cx,clientY:cy});
  const rect=f.stick.getBoundingClientRect();
  assert.ok(Math.abs(rect.left+48-cx)<=1 && rect.top+48===cy, JSON.stringify(rect));
  f.control.update(.05); const start=Math.hypot(...f.control.velocity);
  f.zone.emit('pointermove',{pointerId:1,clientX:cx,clientY:cy-40});
  f.control.update(.05); assert.ok(f.control.velocity[2]>0);
  const pushed=Math.hypot(...f.control.velocity);
  assert.ok(start < pushed*0.05, 'start ' + start + ' vs pushed ' + pushed);
  f.zone.emit('pointerup',{pointerId:1});
  for(let i=0;i<60;i++) f.control.update(.05);
  assert.ok(Math.hypot(...f.control.velocity)<.001);
  assert.equal(f.knob.style.transform,'translate(-50%, -50%)');
});
test('second finger cannot steal or cancel movement; lost capture and orientation reset it', () => {
  const f=fixture();
  f.zone.emit('pointerdown',{pointerId:1,clientX:328,clientY:744});
  f.zone.emit('pointerdown',{pointerId:2,clientX:340,clientY:700});
  assert.equal(f.zone.captured,1);
  f.zone.emit('pointercancel',{pointerId:2}); assert.ok(f.stick.classList.contains('active'));
  f.zone.emit('lostpointercapture',{pointerId:1}); assert.ok(!f.stick.classList.contains('active'));
  f.zone.emit('pointerdown',{pointerId:3,clientX:328,clientY:744});
  f.win.emit('orientationchange'); assert.ok(!f.stick.classList.contains('active'));
});
test('exit clears momentum and gates virtual and pointer input; reentry responds', () => {
  const f=fixture(); f.control.setStick(0,-1); f.control.update(.05);
  assert.ok(f.control.velocity[2]>0);
  f.control.setEnabled(false);
  assert.equal(f.touch.inert,true); assert.deepEqual(Array.from(f.control.velocity),[0,0,0]);
  const before=Array.from(f.control.position);
  f.control.setStick(0,-1); f.zone.emit('pointerdown',{pointerId:1,clientX:328,clientY:704}); f.control.update(.05);
  assert.deepEqual(Array.from(f.control.position),before);
  f.control.setEnabled(true); f.control.setStick(0,-1); f.control.update(.05);
  assert.ok(f.control.position[2]>before[2]);
});
function dossierFixture(width,height,coarse=true) {
  const f=fixture(undefined,coarse); f.win.innerWidth=width; f.win.innerHeight=height;
  const elements={}; const messages=[]; const toggles=[];
  f.doc.documentElement.classList.add('sxe-bg-embed');
  f.doc.getElementById=id=>elements[id] ??= new Element();
  f.win.parent={postMessage:x=>messages.push(x)};
  f.context.location={origin:'https://weylandai.com'};
  f.context.sightxControls={setEnabled:x=>toggles.push(x)};
  const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  vm.runInContext(scripts.find(x=>x.includes('var root = document.getElementById("sx-dossier")')),f.context);
  return {...f,messages,toggles,elements};
}
test('host entry, exit, reentry and prologue synchronize actual dossier script with controls',()=>{
  const f=dossierFixture(390,710); f.elements['cx-overlay'].parentNode=null;
  f.win.sxDossier.update(0); assert.deepEqual(f.toggles,[false]);
  const state=raised=>f.win.emit('message',{source:f.win.parent,origin:'https://weylandai.com',data:{type:'weyland:dossier-state',raised}});
  state(false); assert.equal(f.toggles.at(-1),true);
  state(true); assert.equal(f.toggles.at(-1),false);
  state(false); assert.equal(f.toggles.at(-1),true);
  f.win.emit('message',{source:{},origin:'https://weylandai.com',data:{type:'weyland:dossier-state',raised:true}});
  assert.equal(f.toggles.at(-1),true);
  f.elements['cx-overlay'].parentNode={}; f.elements['cx-overlay'].style.display='block';
  f.win.sxDossier.update(0); assert.equal(f.toggles.at(-1),false);
});
test('on touch screens the resting folder stays clear of the joystick box in portrait and landscape',()=>{
  for(const [w,h] of [[320,568],[360,640],[360,800],[375,667],[390,710],[390,844],[412,915],[430,780],[430,932],[568,320],[710,390],[844,390],[667,375]]) {
    const f=dossierFixture(w,h); f.win.sxDossier.update(0);
    const g=f.messages.at(-1); assert.ok(g.corners.every(c=>c.every(Number.isFinite)));
    const right=Math.max(...g.corners.map(c=>c[0]));
    // Right inset 10, hit zone width 104; the folder's face must not reach that zone.
    assert.ok(right < w-10-104, `${w}x${h}: dossier right ${right}`);
    // ...and most of it stays on screen.
    const left=Math.min(...g.corners.map(c=>c[0]));
    assert.ok(right-Math.max(0,left) > (right-left)*0.75, `${w}x${h}: folder ${left}..${right}`);
  }
  // Mouse screens (no joystick) keep the old pose.
  assert.deepEqual(Array.from(dossierFixture(390,844,false).win.sxDossier.geometry().C),[-0.05,-0.40,1.05]);
  assert.deepEqual(Array.from(dossierFixture(1440,900,false).win.sxDossier.geometry().C),[-0.30,-0.33,0.85]);
});
test('the homepage lets touches reach the joystick: tap-catcher cut to the folder face, body box passes touches while lowered',()=>{
  assert.match(home,/tap\.style\.clipPath = "polygon\("/);
  const touchBlock=home.match(/@media \(hover: none\) and \(pointer: coarse\) \{\s*html\.folder-lowered body \{ pointer-events: none; \}\s*:where\(html\.folder-lowered body > \*\) \{ pointer-events: auto; \}\s*\}/);
  assert.ok(touchBlock,'touch pass-through rule for the lowered folder');
  assert.match(home,/html\.folder-lowered #stage-backdrop iframe \{\s*pointer-events: auto;/);
  assert.match(page,/width: 104px; height: 160px/);
  // The resting stick the first test models: centred in its 104 x 160 box, 34 px off the bottom.
  assert.match(page,/right: 4px; top: var\(--sx-stick-top, auto\);\s*bottom: 34px; width: 96px;/);
  assert.match(page,/safe-area-inset-right/);
  assert.match(page,/max-height: 440px/);
});
