// S0 regression checks against the real shared input, world consumer and dossier scripts.
// Node stand-ins verify the input lifecycle; browser measurements remain the four controls journeys.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const root = process.env.SIGHTX_SOURCE_ROOT ? new URL('file://' + process.env.SIGHTX_SOURCE_ROOT + '/') : new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const inputSource = read('assets/weyland-input.js'), controlsSource = read('assets/sightx-controls.js');
const page = read('weyland-sightx-worker/src/pages/sightx.html');
class Element {
  constructor() {
    this.events = {}; this.attrs = {}; this.children = []; this.style = { setProperty(k,v) { this[k]=v; } }; this.tagName = 'DIV';
    const classes = new Set();
    this.classList = { add:x=>classes.add(x), remove:x=>classes.delete(x), contains:x=>classes.has(x), toggle:(x,on)=>{ on ??= !classes.has(x); on ? classes.add(x) : classes.delete(x); } };
  }
  addEventListener(name, fn) { (this.events[name] ??= new Set()).add(fn); }
  removeEventListener(name, fn) { this.events[name]?.delete(fn); }
  emit(name, data={}) { for (const fn of this.events[name] || []) fn({type:name, target:this, cancelable:true, preventDefault(){}, stopPropagation(){}, ...data}); }
  setAttribute(k,v) { this.attrs[k]=v; }
  setPointerCapture(id) { this.captured=id; }
  appendChild(el) { this.children.push(el); }
  remove() { this.removed=true; }
  getBoundingClientRect() { return {left:18,top:600,width:140,height:140}; }
}
function browserFixture({coarse=true}={}) {
  const win=new Element(), doc=new Element(), canvas=new Element(), timers=new Map();
  let time=100, next=0, pads=[];
  doc.body=new Element(); doc.body.classList.add('sightx-demo'); doc.documentElement=new Element(); doc.activeElement=doc.body;
  doc.createElement=()=>new Element();
  win.parent=win;
  const context=vm.createContext({window:win, document:doc, localStorage:{getItem:()=>null,setItem(){}}, matchMedia:()=>({matches:coarse}),performance:{now:()=>time}, navigator:{getGamepads:()=>pads}, location:{origin:'https://weylandai.com',hostname:'weylandai.com',search:''}, URLSearchParams, console, requestAnimationFrame:fn=>{timers.set(++next,fn);return next;},cancelAnimationFrame:id=>timers.delete(id)});
  const step=(ms=16)=>{time+=ms;const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn(time));};
  return {win,doc,canvas,context,step,setPads:p=>{pads=p;}, advance:ms=>{time+=ms;}};
}
function fixture({external=false, coarse=true}={}) {
  const f=browserFixture({coarse}), {win,canvas,context,step}=f;
  vm.runInContext(inputSource,context); vm.runInContext(controlsSource,context);
  const control=win.SightXControls.mount({canvas,externalInput:external,initialPosition:[0,1,-9],groundY:()=>1});
  const walk=(n=60)=>{for(let i=0;i<n;i++){step();control.update(.016);}};
  return {...f,control,walk};
}
const touch=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function loadPageControls(f, html, {expectLocalInput=true}={}) {
  // Execute the actual page's classic scripts in parser order through controls.
  // No fixture preloads the dependency: removing/reordering its tag must fail.
  for(const [,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src=attrs.match(/\bsrc=["']([^"']+)["']/)?.[1];
    const pathname=src && new URL(src, f.context.location.origin).pathname;
    assert.doesNotMatch(attrs,/\b(?:async|defer)\b|\btype=["']module["']/);
    if(pathname==='/assets/sightx-controls.js' && expectLocalInput) {
      assert.equal(typeof f.win.WeylandInput?.neutral,'function','WeylandInput.neutral must exist before controls run');
      assert.deepEqual(JSON.parse(JSON.stringify(f.win.WeylandInput.neutral())),{move:{x:0,y:0},look:{dx:0,dy:0},buttons:{}});
    }
    vm.runInContext(src ? read(pathname.slice(1)) : body,f.context,{filename:src || 'embed-inline.js'});
    if(pathname==='/assets/sightx-controls.js') return;
  }
  assert.fail('embed page did not load controls');
}
for(const path of ['weyland-sightx-worker/src/pages/sightx.html','src/pages/sightx.html']) {
  test(path + ' loads neutral before controls and mounts a state-reporting embed',()=>{
    const f=browserFixture(); f.win.parent={}; f.context.location.search='?embed=bg';
    loadPageControls(f,read(path));
    assert.equal(f.doc.documentElement.classList.contains('sxe-bg-embed'),true);
    const control=f.win.SightXControls.mount({canvas:f.canvas});
    control.setExternalState({move:{y:1}}); control.update(.05); f.step();
    assert.ok(f.win.SightXControls.state().pos[2]>-9);
    assert.equal(f.doc.body.children.length,0,'the host owns the stick in embeds');
  });
}
test('an older embed without the input tag or externalInput option consumes its same-origin host input',()=>{
  const host=browserFixture(); vm.runInContext(inputSource,host.context);
  const f=browserFixture(); f.win.parent=host.win; f.context.location.search='?embed=bg';
  const oldPage=page.replace(/<script src="\/assets\/weyland-input\.js[^\"]*"><\/script>/,'');
  loadPageControls(f,oldPage,{expectLocalInput:false});
  assert.equal(f.win.WeylandInput,undefined);
  const control=f.win.SightXControls.mount({canvas:f.canvas});
  control.setExternalState({move:{y:1},look:{dx:260}}); control.update(.05);
  const state=f.win.SightXControls.state();
  assert.ok(state.pos[2]>-9); assert.ok(Math.abs(state.yaw)>.5);
  control.update(.05); near(f.win.SightXControls.state().yaw,state.yaw);
  control.setEnabled(false); near(Math.hypot(...control.velocity),0);
  f.step(); host.step();
  assert.equal(f.doc.body.children.length,0); assert.equal(host.doc.body.children.length,0);
});
function backdropFixture({coarse=true, idle=true, reduced=false, gl='hardware'}={}) {
  const f=browserFixture({coarse}), backdrop=new Element(), observers=[], idleCallbacks=[], timeouts=[];
  f.doc.readyState='complete';
  f.doc.getElementById=id=>id==='stage-backdrop' ? backdrop : null;
  f.doc.querySelector=selector=>selector==='#stage-backdrop iframe' ? backdrop.children[0] || null : null;
  f.win.matchMedia=query=>({matches:query.includes('reduced-motion') ? reduced : coarse});
  f.win.__weylandGLClass=()=>gl;
  if(idle) f.win.requestIdleCallback=fn=>idleCallbacks.push(fn);
  f.context.setTimeout=fn=>timeouts.push(fn);
  f.context.MutationObserver=class { constructor(fn){observers.push(fn);} observe(){} };
  const script=[...read('index.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('var injected = false;'));
  assert.ok(script); vm.runInContext(script,f.context);
  return {...f,backdrop,idleCallbacks,timeouts,sync:()=>observers.forEach(fn=>fn())};
}
test('phone mounts exactly once on the first trusted touch without waiting for idle or a timer',()=>{
  for(const idle of [true,false]) for(const type of ['pointerdown','touchstart']) {
    const f=backdropFixture({idle});
    assert.equal(f.backdrop.children.length,0);
    f.win.emit(type,{isTrusted:false}); f.win.emit('scroll',{isTrusted:true,target:new Element()});
    assert.equal(f.backdrop.children.length,0);
    f.win.emit(type,{isTrusted:true});
    assert.equal(f.backdrop.children.length,1);
    assert.equal(f.backdrop.children[0].src,'/sightx/?embed=bg');
    f.win.emit('touchstart',{isTrusted:true}); f.win.emit('pointerdown',{isTrusted:true});
    assert.equal(f.backdrop.children.length,1);
    assert.equal(f.idleCallbacks.length,0); assert.equal(f.timeouts.length,0);
  }
});
test('phone touch waits for an open overlay to close, then mounts without another gesture',()=>{
  const f=backdropFixture(); f.doc.documentElement.classList.add('wa-overlay-open');
  f.win.emit('touchstart',{isTrusted:true}); assert.equal(f.backdrop.children.length,0);
  f.doc.documentElement.classList.remove('wa-overlay-open'); f.sync();
  assert.equal(f.backdrop.children.length,1); assert.equal(f.idleCallbacks.length,0);
});
test('backdrop keeps desktop idle loading, reduced-motion opt-in and the hardware gate',()=>{
  const desktop=backdropFixture({coarse:false}); assert.equal(desktop.backdrop.children.length,0);
  assert.equal(desktop.idleCallbacks.length,1); desktop.idleCallbacks[0](); assert.equal(desktop.backdrop.children.length,1);
  const reduced=backdropFixture({reduced:true}); reduced.win.emit('touchstart',{isTrusted:true});
  assert.equal(reduced.backdrop.children.length,0); reduced.win.__weylandEnsureBackdrop(true); assert.equal(reduced.backdrop.children.length,1);
  const software=backdropFixture({gl:'software'}); software.win.emit('touchstart',{isTrusted:true});
  assert.equal(software.win.__weylandEnsureBackdrop(true),false); assert.equal(software.backdrop.children.length,0);
});
test('W and a pointer drag drive the world through the same state, with independent snapshots',()=>{
  const f=fixture(); const before=f.win.SightXControls.state();
  f.win.emit('keydown',{code:'KeyW'}); f.walk(95); f.win.emit('keyup',{code:'KeyW'});
  assert.ok(f.control.position[2]-before.pos[2]>=1);
  f.canvas.emit('pointerdown',touch(1,300,300)); f.win.emit('pointermove',touch(1,40,300)); f.control.update(.016);
  assert.ok(Math.abs(f.control.yaw)>=.5);
  const s=f.win.SightXControls.state(); s.pos[2]=100; s.yaw=100;
  assert.notEqual(f.control.position[2],100); assert.notEqual(f.control.yaw,100);
});
test('stick starts neutral, another finger looks without stealing movement, release stops',()=>{
  const f=fixture(); f.step(); const stick=f.doc.body.children.find(el=>el.className==='weyland-stick');
  assert.ok(stick); stick.emit('pointerdown',touch(1,88,670)); f.walk(10); near(f.control.position[2],-9);
  stick.emit('pointermove',touch(1,88,610));
  stick.emit('pointerdown',touch(2,130,610)); assert.equal(stick.captured,1);
  f.canvas.emit('pointerdown',touch(2,300,300)); f.win.emit('pointermove',touch(2,40,300));
  stick.emit('pointercancel',touch(2,0,0)); f.walk(95);
  assert.ok(f.control.position[2]>-8); assert.ok(Math.abs(f.control.yaw)>.5);
  stick.emit('lostpointercapture',touch(1,0,0)); f.walk(120); assert.ok(Math.hypot(...f.control.velocity)<.001);
});
test('a stationary canvas touch never walks, and pointercancel ends look',()=>{
  const f=fixture(); f.canvas.emit('pointerdown',touch(1,300,300)); f.walk(100); near(f.control.position[2],-9);
  f.canvas.emit('pointercancel',touch(1,300,300)); f.win.emit('pointermove',touch(1,40,300)); f.control.update(.016); near(f.control.yaw,0);
});
test('typing, blur, orientation, hiding and disabling clear all held input',()=>{
  for(const kind of ['field','blur','orientation','hidden','disabled']) {
    const f=fixture(); const input=f.win.WeylandInput.create({stick:false});
    f.win.emit('keydown',{code:'KeyW'}); f.win.emit('keydown',{code:'ShiftLeft'}); assert.equal(input.state().move.y,1);
    if(kind==='field'){const el=new Element();el.tagName='TEXTAREA'; f.doc.activeElement=el;f.doc.emit('focusin',{target:el});}
    if(kind==='blur') f.win.emit('blur');
    if(kind==='orientation') f.win.emit('orientationchange');
    if(kind==='hidden'){f.doc.hidden=true; f.doc.emit('visibilitychange');}
    if(kind==='disabled') input.setEnabled(false);
    const s=input.state(); assert.equal(s.move.y,0); assert.equal(s.buttons.sprint,false);
    f.doc.activeElement=f.doc.body;f.doc.hidden=false;input.setEnabled(true);assert.equal(input.state().move.y,0);
  }
});
test('alias keys release independently and diagonal movement stays in the unit disk',()=>{
  const f=fixture(), input=f.win.WeylandInput.create({stick:false});
  for(const code of ['KeyW','ArrowUp','KeyD']) f.win.emit('keydown',{code});
  near(Math.hypot(...Object.values(input.state().move)),1);
  f.win.emit('keyup',{code:'KeyW'});assert.ok(input.state().move.y>0);
  f.win.emit('keyup',{code:'ArrowUp'}); assert.equal(input.state().move.y,0);
});
test('gamepad look uses elapsed time rather than polling count and inactive buttons are neutral',()=>{
  const measure=hz=>{const f=fixture(), input=f.win.WeylandInput.create({stick:false});f.setPads([{connected:true,axes:[.5,-1,1,0],buttons:[{pressed:true}]}]);let dx=0;for(let i=0;i<hz;i++){f.advance(1000/hz);const s=input.state();dx+=s.look.dx;assert.ok(Math.hypot(s.move.x,s.move.y)<=1.000001);}input.setEnabled(false);assert.equal(input.state().buttons.up,false);return dx;};
  near(measure(30),840);near(measure(120),840);
});
test('forwarding refreshes a neutral state after frame load and sends a stop on blur',()=>{
  const f=fixture(), messages=[]; let target=null;
  const input=f.win.WeylandInput.create({stick:false,forward:()=>target});f.step();
  target={postMessage:(s,origin)=>messages.push({s,origin})};f.step();assert.equal(messages.at(-1).s.move.y,0);
  f.win.emit('keydown',{code:'KeyW'});assert.equal(messages.at(-1).s.move.y,1);
  f.win.emit('blur');assert.equal(messages.at(-1).s.move.y,0);assert.equal(messages.at(-1).origin,'https://weylandai.com');
  input.destroy();const count=messages.length;f.win.emit('keydown',{code:'KeyW'});f.step();assert.equal(messages.length,count);
});
test('frame consumes look once, expires abandoned input and clears movement on exit',()=>{
  const f=fixture({external:true});
  f.control.setExternalState({move:{x:0,y:1},look:{dx:260,dy:0}});f.control.update(.016);const yaw=f.control.yaw;
  f.control.update(.016);near(f.control.yaw,yaw);assert.ok(Math.abs(yaw)>.5);
  f.advance(500);f.walk(120);assert.ok(Math.hypot(...f.control.velocity)<.001);
  f.control.setExternalState({move:{x:Infinity,y:NaN},look:{dx:Infinity}});f.control.update(.016);assert.ok(f.control.position.every(Number.isFinite));
  f.control.setEnabled(false);f.control.setExternalState({move:{y:1}});const pos=f.control.position.slice();f.walk();assert.deepEqual(f.control.position,pos);
  f.control.setEnabled(true);f.control.setExternalState({move:{y:1}});f.control.update(.05);assert.ok(Math.hypot(...f.control.velocity)>0);
});
function dossierFixture(width,height) {
  const f=fixture({external:true});f.win.innerWidth=width;f.win.innerHeight=height;
  const elements={},messages=[],toggles=[];f.doc.documentElement.classList.add('sxe-bg-embed');
  f.doc.getElementById=id=>elements[id]??=new Element();f.win.parent={postMessage:x=>messages.push(x)};
  f.context.sightxControls={setEnabled:x=>toggles.push(x)};
  const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  vm.runInContext(scripts.find(x=>x.includes('var root = document.getElementById("sx-dossier")')),f.context);
  return {...f,elements,messages,toggles};
}
test('actual dossier script gates forwarded controls on entry, exit and intro; rejects another source',()=>{
  const f=dossierFixture(390,844);f.elements['cx-overlay'].parentNode=null;f.win.sxDossier.update(0);assert.deepEqual(f.toggles,[false]);
  const state=raised=>f.win.emit('message',{source:f.win.parent,origin:'https://weylandai.com',data:{type:'weyland:dossier-state',raised}});
  state(false);assert.equal(f.toggles.at(-1),true);state(true);assert.equal(f.toggles.at(-1),false);state(false);
  f.win.emit('message',{source:{},origin:'https://weylandai.com',data:{type:'weyland:dossier-state',raised:true}});assert.equal(f.toggles.at(-1),true);
  f.elements['cx-overlay'].parentNode={};f.elements['cx-overlay'].style.display='block';f.win.sxDossier.update(0);assert.equal(f.toggles.at(-1),false);
});
test('phone dossier leaves the top-document right stick clear in portrait and landscape',()=>{
  for(const [w,h] of [[320,568],[360,640],[375,667],[390,844],[430,932],[568,320],[844,390]]) {
    const f=dossierFixture(w,h);f.win.sxDossier.update(0);
    const g=f.messages.at(-1);assert.ok(g.corners.every(c=>c.every(Number.isFinite)));
    const right=Math.max(...g.corners.map(c=>c[0]));
    assert.ok(right<w-10-104, `${w}x${h}: folder right ${right}, stick left ${w-114}`);
  }
});
