// Same-origin parent-owned touch integration for the existing homepage input channel.
(function(){
 if(window.parent===window)return;
 let host;try{host=window.parent;if(host.location.origin!==location.origin)return;}catch(_){return;}
 const doc=host.document;if(!doc.getElementById('weyland-look'))return;
 const key='__weylandFloatingAimR1';if(host[key])host[key].destroy();
 let active=null,lastAt=0,originalStyle=null,ring=null;const listeners=[];
 const zone=doc.createElement('div');zone.id='weyland-floating-aim-zone';zone.setAttribute('aria-label','Right thumb: touch anywhere here, then drag to aim');
 zone.style.cssText='position:fixed;right:max(0px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));width:46vw;height:min(48vh,340px);z-index:699;touch-action:none;pointer-events:none;background:transparent';doc.body.appendChild(zone);
 const allowed=()=>doc.documentElement.classList.contains('folder-lowered')&&!doc.documentElement.matches('.district-guide-open,.product-reading,.wa-overlay-open,.wco-open')&&!doc.querySelector('#upgrade-modal.is-open')&&!/^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement?.tagName||'')&&!doc.hidden;
 const on=(el,type,fn,opt)=>{el.addEventListener(type,fn,opt);listeners.push(()=>el.removeEventListener(type,fn,opt));};
 function reset(){const a=active;active=null;lastAt=0;if(a)try{if(a.el.hasPointerCapture(a.id))a.el.releasePointerCapture(a.id);}catch(_){}if(ring&&originalStyle!==null)ring.style.cssText=originalStyle;ring=null;originalStyle=null;}
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 on(doc,'pointerdown',e=>{if(e.pointerType==='mouse'||!allowed()||active)return;const el=e.target.closest?.('#weyland-floating-aim-zone,.weyland-look-stick');if(!el||e.target.closest?.('button,a,input,select,textarea,[data-action]'))return;consume(e);active={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,el};lastAt=performance.now();try{el.setPointerCapture(e.pointerId);}catch(_){}ring=doc.querySelector('.weyland-look-stick');if(ring){originalStyle=ring.style.cssText;ring.style.left=(e.clientX-ring.offsetWidth/2)+'px';ring.style.top=(e.clientY-ring.offsetHeight/2)+'px';ring.style.right='auto';ring.style.bottom='auto';} },{capture:true,passive:false});
 on(doc,'pointermove',e=>{if(!active||e.pointerId!==active.id)return;consume(e);active.dx=e.clientX-active.x;active.dy=e.clientY-active.y;},{capture:true,passive:false});
 for(const type of['pointerup','pointercancel','lostpointercapture'])on(doc,type,e=>{if(active&&e.pointerId===active.id){consume(e);reset();}},{capture:true,passive:false});
 for(const type of['blur','resize','orientationchange'])on(host,type,reset);on(doc,'visibilitychange',reset);
 const api={sample(now=performance.now()){if(!allowed()){reset();zone.style.pointerEvents='none';return{dx:0,dy:0};}zone.style.pointerEvents='auto';if(!active)return{dx:0,dy:0};const dt=Math.max(0,Math.min(.05,(now-lastAt)/1000));lastAt=now;const n=Math.hypot(active.dx,active.dy),radius=52,dead=6;if(n<=dead)return{dx:0,dy:0};const gain=Math.min(1,(n-dead)/(radius-dead));const speed=180;return{dx:active.dx/n*gain*speed*dt,dy:active.dy/n*gain*speed*dt};},reset,destroy(){reset();for(const off of listeners)off();zone.remove();if(host[key]===api)delete host[key];},get pointerId(){return active?.id??null;}};host[key]=api;
 window.__sxFloatingAim=api;on(window,'pagehide',()=>api.destroy());
})();
